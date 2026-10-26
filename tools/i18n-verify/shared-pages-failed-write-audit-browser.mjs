// Audit part 96 (PCF MSA J29): a refused save reaches the reader on every shared page (invariant I15).
//
// For each of the 23 shared pages, at 1440x900 and 390x844 (English; Bangla on the BN_PAGES), the suite
//   1. finds every control that SAVES: with all three refusal flags armed (__stubFailWrites / __stubFailBatch / __stubFailTx)
//      it presses each visible enabled button (filling the fields first, accepting prompt()/confirm()), and counts a control as a
//      SAVE when the page read a refusal flag, i.e. it attempted a write. The flags are installed as GETTERS that count reads,
//      because a refused batch / transaction is not recorded in window.__fsLog by the stub;
//   2. checks, within 3 s, that a visible message says the change was NOT saved, in the page's language, and stays >= 2 s;
//      MISSING = no such message (the console.error trace is captured and reported); MISLEADING = the page shows success, or the
//      typed value appears as a new item, although the write was refused;
//   3. checks the page is usable afterwards: the control is enabled again and nothing says "Saving...".
//
// The shared top menu (Home / Modules / Operation / Bookmark and what opens from them) is the same code on every page, so it is
// audited ONCE, on classes.html (MENU_PAGE); on every other page its controls are listed as skipped "MENU (audited on classes.html)".
//
// What counts as a refusal message (see refusedText): any NEWLY visible text, or the text of a role=alert/status element, a dialog
// or an element whose `hidden` was just cleared, that says the change was not saved -- "couldn't / could not / can't / cannot /
// failed / not saved / wasn't saved / didn't save / refused / denied" together with save / change / write, or the error code
// `permission-denied`; in Bangla the strings of app/js/i18n/bn.js ("সংরক্ষণ করা যায়নি", "সংরক্ষণ হয়নি", "সংরক্ষিত হয়নি" ...).
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs
//   --page=<file[,file]>   these pages only      --cap=<n>  controls per page (default 25)   --list  print every control   --verbose
//   --bn=all        Bangla on every page, --bn=none no Bangla
//   --mutate=silent  on --mutate-page (default about.html) the refusal message is replaced by console.error only: that page must
//                    count MISSING for every save it has (and the suite must fail)
// Findings are always printed; the suite exits 1 when any save is MISSING / MISLEADING / STUCK, so the audit's own result is
// the failure list. The positive controls (bookmarks.html Rename; the 🗑 in the shared Bookmark menu on classes.html) and the
// --mutate=silent run are the proof the sweep can both pass and fail.
import { chromium, newContext, openPage } from "./harness.mjs";

const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), CAP = +arg("cap") || 25, BN = arg("bn");
const MUTATE_PAGE = arg("mutate-page") || "about.html";
const LIST = process.argv.includes("--list"), VERBOSE = process.argv.includes("--verbose");
const MENU_PAGE = "classes.html", MENU_CAP = 40;
// Part 98: --from=<n> skips the first n controls (so a page too long for one call can be run in slices), --vp=<w> runs one width,
// --depth=<n> follows a control that opens more controls n levels deep (default 1), --nomenu skips the shared-menu pass.
const FROM = +arg("from") || 0, VP = +arg("vp") || 0, DEPTH = +arg("depth") || 1;
const NOMENU = process.argv.includes("--nomenu");

// Copied from shared-pages-keyboard-audit-browser.mjs (not edited there).
const PAGES = [
  ["Classes", "classes.html"], ["Course offers", "course-offers.html"], ["Curriculum", "curriculum.html"],
  ["Backup", "backup.html"], ["Import notes", "import-notes.html"], ["Dawah", "dawah.html"],
  ["Onboarding", "onboarding.html"], ["Accept invite", "accept-invite.html?token=not-a-real-link"],
  ["Monitor", "monitor.html"], ["Homework", "homework.html"], ["People", "people.html"], ["Records", "records.html"],
  ["Catalogue", "catalogue.html"], ["About", "about.html"], ["Bookmarks", "bookmarks.html"],
  ["Hadith collections", "hadith-collections.html"],
  ["Landing", "index.html"], ["Notes", "notes.html?unit=ayah:2:255&label=Al-Baqarah%202:255"], ["Journey map", "journey-map.html"], ["Deen study", "deen-study.html"],
  ["Arabic study", "arabic-study.html"], ["Self-check", "admin-self-check.html"], ["Taglines", "taglines.html"],
];
const REAL_SEED = `
DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মাদ আবদুর রহমান ইবনে আবদুল্লাহ আল-হাশিমী");
DATA.trackables[0].name = lang("Reading (with Tajweed)");
DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
DATA.bookmarks[0].saved[0].name = "Ayat al-Kursi and the last two āyāt of Al-Baqarah";
`;
// Part 98 seeds, so the saves on Notes / Journey map / Dawah are reachable: two Notes on 2:255 (one origin, one reference) with
// their revisions and source links, and Dawah pages (a draft and a shared one of the signed-in person p1, one waiting for approval).
const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [
  { _id: "t1__n255", noteId: "n255", ...own, title: "Started on 2:255", bodyHtml: "<p>Ayat al-Kursi, a first note.</p>", status: "active", visibility: "private", currentRevisionId: "n255-r1" },
  { _id: "t1__n7", noteId: "n7", ...own, title: "A second note", bodyHtml: "<p>Another body.</p>", status: "active", visibility: "private", currentRevisionId: "n7-r1" },
];
const SOURCES = NOTES.map((n, i) => ({ _id: "t1__s" + n.noteId, sourceLinkId: "s" + n.noteId, ...own, noteId: n.noteId, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: i ? "reference" : "origin", approachId: null, provenanceKind: "study-note", status: "active" }));
const REVS = NOTES.map((n) => ({ _id: "t1__" + n.noteId + "-r1", revisionId: n.noteId + "-r1", noteId: n.noteId, previousRevisionId: null, title: n.title, bodyHtml: n.bodyHtml, revisionReason: "content-update", actorUid: "test-uid", ...own }));
const NOTES_SEED = `window.__DATA = DATA;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];
DATA.noteSources = [...(DATA.noteSources ?? []), ...${JSON.stringify(SOURCES)}];
DATA.noteRevisions = [...(DATA.noteRevisions ?? []), ...${JSON.stringify(REVS)}];
DATA.userPrefs = [{ _id: "test-uid" }];`;
const dp = (id, author, status) => ({ _id: "t1__" + id, pageId: id, tenantId: "t1", schemaVersion: 1, authorPersonId: author, sourceNoteId: "n255", sourceRevisionId: "n255-r1", title: "Page " + id, bodyHtml: "<p>Body of " + id + "</p>", sourceUnitKey: null, status, approvedByPersonId: null, approvedAt: null, returnedNote: null });
const DAWAH_SEED = `DATA.dawahPages = ${JSON.stringify([dp("pDraft", "p1", "draft"), dp("pShared", "p1", "shared"), dp("pWait", "p2", "awaiting-approval")])};`;
// Part 99: two user folders, the first note filed in the first, and one tag, so file-into / move / tag have something to act on.
const FLOW_SEED = `DATA.noteFolders = ${JSON.stringify(["A", "B", "C"].map((x, i) => ({ _id: "t1__f" + x, folderId: "f" + x, ...own, name: "Audit folder " + x, parentFolderId: null, semanticRole: "user", order: i, status: "active" })))};
DATA.notePlacements = ${JSON.stringify(["A", "B"].map((x, i) => ({ _id: "t1__pl" + x, placementId: "pl" + x, ...own, noteId: "n255", folderId: "f" + x, order: 0, status: "active" })))};
DATA.noteTags = ${JSON.stringify([{ _id: "t1__tg1", tagId: "tg1", ...own, name: "Audit tag", status: "active" }])};`;
const SEEDS = { "notes.html": NOTES_SEED, "journey-map.html": NOTES_SEED, "dawah.html": NOTES_SEED + DAWAH_SEED };
// Part 99: --flow=<name> opens one place directly instead of sweeping. Each flow is a page plus clicks that reach the state; the
// controls pressed are those that appear with the LAST click (so the ⋯ menu, or the Folders-and-tags dialog), followed DEPTH levels.
//   pane-menu    journey-map.html: Timeline > the seeded note > the pane's ⋯ menu (Mark, Organise, Change, Settings ...)
//   pane-attach  journey-map.html: Timeline > the seeded note > 📎 Folders and tags (file into / tick folders and tags / New folder)
//   pane-edit    journey-map.html: Timeline > the seeded note > ✏️ Edit (the editor's own saves)
//   notes-menu   notes.html?unit=ayah:2:255: the whole page, controls beyond the part 98 cap (use --cap=100 --from=...)
const FLOWS = {
  "pane-menu": { path: "journey-map.html", steps: ["[data-view=timeline]", "[data-note-open]", "[data-pane-menu-btn]"] },
  "pane-attach": { path: "journey-map.html", steps: ["[data-view=timeline]", "[data-note-open]", "[data-pane-attach]"] },
  // the dialog's Rename / Move to Trash act on the HIGHLIGHTED folder, so one is highlighted first (a tap on its name)
  "pane-attach-hl": { path: "journey-map.html", base: 2, steps: ["[data-view=timeline]", "[data-note-open]", "[data-pane-attach]", "[data-pick=fC] .folder-row-name"] }, // fC is empty, so Move to Trash really writes (A and B hold the note: that is refused without a write)
  "pane-edit": { path: "journey-map.html", steps: ["[data-view=timeline]", "[data-note-open]", "[data-pane-edit-toggle]"] },
};
const FLOW = arg("flow");
if (FLOW && !FLOWS[FLOW]) { console.log("unknown --flow=" + FLOW + "; known: " + Object.keys(FLOWS).join(", ")); process.exit(2); }
if (FLOW) for (const k of ["notes.html", "journey-map.html"]) SEEDS[k] += "\n" + FLOW_SEED;
// One small valid WordPress export, chosen in the file picker before the page's controls are listed.
const WXR = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/"><channel>
<wp:category><wp:term_id>5</wp:term_id><wp:category_nicename>audit-cat</wp:category_nicename><wp:category_parent></wp:category_parent><wp:cat_name><![CDATA[Audit WP Folder]]></wp:cat_name></wp:category>
<item><title><![CDATA[Audit WP one]]></title><link>https://example.com/one</link><content:encoded><![CDATA[<p>Hello from WordPress</p>]]></content:encoded><wp:post_id>101</wp:post_id><wp:post_date>2026-01-01 10:00:00</wp:post_date><wp:post_date_gmt>2026-01-01 10:00:00</wp:post_date_gmt><wp:post_modified>2026-01-02 10:00:00</wp:post_modified><wp:post_modified_gmt>2026-01-02 10:00:00</wp:post_modified_gmt><wp:status>publish</wp:status><wp:post_type>post</wp:post_type><category domain="category" nicename="audit-cat"><![CDATA[Audit WP Folder]]></category></item>
</channel></rss>`;
// The refusal flags are getters that count each read, and answer true only once the suite has armed them.
const FLAGS = `
window.__armed = false; window.__refHits = 0; window.__flow = ${!!FLOW};
for (const f of ["__stubFailWrites", "__stubFailBatch", "__stubFailTx"]) Object.defineProperty(window, f, { configurable: true, get() { if (!window.__armed) return false; window.__refHits++; return true; } });
`;
const VIEWPORTS = [[1440, 900], [390, 844]];
const BN_PAGES = new Set(["bookmarks.html", "people.html", "classes.html"]); // the 3 pages with the most save controls
const MARK = "Audit Test 4821";
const SKIP = /sign.?out|log.?out|সাইন আউট|লগ আউট|সাইন-আউট/i;
// English: a failure word together with save/saved/change/write, in either order, or the error code.
const REFUSED_EN = /permission-denied|(couldn.?t|could not|can.?t|cannot|failed|not been|not|wasn.?t|was not|didn.?t|refused|denied|unable)\b[^.:]{0,40}\b(save|saved|change|changed|write|written|added|created|updated|deleted|removed|renamed|recorded|sent|imported|uploaded)\b|\b(save|change|write)\b[^.:]{0,20}\b(failed|refused|denied)\b|not allowed|nothing was/i;
// Bangla: the strings of app/js/i18n/bn.js that say a save did not happen (সংরক্ষণ করা যায়নি, সংরক্ষণ হয়নি, সংরক্ষিত হয়নি, ...).
const REFUSED_BN = /permission-denied|সংরক্ষণ (করা )?(যায়নি|হয়নি)|সংরক্ষিত (হয়নি|নেই)|(যোগ|তৈরি|মুছে ফেলা|পরিবর্তন|পাঠানো|আপলোড|হালনাগাদ) (করা )?(যায়নি|হয়নি)|ব্যর্থ|অনুমতি/;
const SUCCESS = /\b(saved|success\w*|added|created|updated|renamed|deleted|removed|done|imported|sent)\b|সংরক্ষিত|সফল|যোগ করা হয়েছে|হালনাগাদ/i;
const quiet = (e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e);

// ---- in-page helpers ----
const INSTALL = () => {
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const label = (el) => ((el.getAttribute("aria-label") || el.textContent || (el.type === "checkbox" && el.closest("label")?.textContent) || el.value || el.name || "") + "").replace(/\s+/g, " ").trim().slice(0, 40);
  // Part 99 (--flow): the tick boxes of the file-into / tag dialogs are controls too
  const SEL = "button, [role=button], input[type=submit], input[type=button], summary" + (window.__flow ? ", input[type=checkbox]" : "");
  // the shared top menu: the same code on every page (nav.js / bookmark-nav.js / account-card.js)
  const MENU = ".nav-cat, .nav-cat-links, .nav-cat-group, .nav-link, .nav-setting, .nav-account-btn, .nav-bm-sheet-head, #navBookmarkList, .nav-preview-notice, [class*=nav-bm], [class*=account-card], #navAppLangSelect, [id^=zab], [class*=zab-], #mmSaver, #mmSaverSettings, [class*=bm-pop], [class*=bm-back]";
  // (a body / wrapper class such as "nav-bm-open" must not turn the whole page into "menu": an ancestor that holds <main> / #app is not the menu)
  const inMenu = (el) => { const m = el.closest(MENU); return !!m && m !== document.body && m !== document.documentElement && !m.querySelector("#app, main, #appRoot"); };
  const keyOf = (el) => `${el.tagName.toLowerCase()}#${el.id || ""}|${label(el)}|${el.getAttribute("data-action") || ""}${inMenu(el) ? "|MENU" : ""}`;
  const list = () => { const seen = {}; return [...document.querySelectorAll(SEL)].filter((el) => vis(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true").map((el) => { const k = keyOf(el); seen[k] = (seen[k] || 0) + 1; return { key: k, nth: seen[k], label: label(el) }; }); };
  const pick = (key, nth) => { let n = 0; for (const el of document.querySelectorAll(SEL)) { if (vis(el) && keyOf(el) === key && ++n === nth) return el; } return null; };
  const fill = () => {
    document.querySelectorAll("details").forEach((d) => { d.open = true; });
    const set = (el, v) => { const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    // Part 98: rich-text editors (the Notes body) are contenteditable, not inputs
    for (const el of document.querySelectorAll("[contenteditable=true], [contenteditable='']")) {
      if (!vis(el) || (el.textContent || "").trim()) continue;
      el.textContent = "Audit Test 4821"; el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (!vis(el) || el.disabled || el.readOnly) continue;
      if (el.closest("nav, header, [class*=nav-], [id*=nav]") || /lang|tenant|preview|viewas/i.test(el.id + " " + el.name)) continue; // shell pickers reload the page
      if (window.__flow && el.matches("[data-picker-search], .folder-search-input")) continue; // Part 99: a filled search box hides the very folders / tick boxes under test
      if (/import-notes/.test(location.pathname) && el.tagName === "SELECT") continue; // Part 98: Import is enabled only for "yourself" in the Person picker; leave it on yourself
      if (el.tagName === "SELECT") { const o = [...el.options].find((x) => x.value && !x.disabled && x.index !== el.selectedIndex) || [...el.options].find((x) => x.value && !x.disabled); if (o && (!el.value || el.selectedIndex <= 0)) { el.value = o.value; el.dispatchEvent(new Event("change", { bubbles: true })); } continue; }
      const t = (el.type || "text").toLowerCase();
      if (["checkbox", "radio", "file", "hidden", "button", "submit", "range", "color"].includes(t)) { if (t === "checkbox" && el.required && !el.checked) el.click(); if (t === "radio" && !document.querySelector(`input[type=radio][name="${el.name}"]:checked`)) el.click(); continue; }
      if (el.value && t !== "text" && t !== "search") continue;
      if (t === "email") set(el, "audit.test@example.org");
      else if (t === "number") set(el, el.min ? el.min : "3");
      else if (t === "date") set(el, "2026-10-20");
      else if (t === "time") set(el, "09:30");
      else if (t === "url") set(el, "https://example.org/audit");
      else if (t === "tel") set(el, "0412345678");
      else if (t === "password") set(el, "AuditTest-4821x");
      else if (!el.value || /^\d*$/.test(el.value)) set(el, "Audit Test 4821");
    }
  };
  // visible text lines, for before/after diffs; plus the text of every visible alert / status / dialog / error element, which is
  // read separately so a message in a clipped, scrolled or aria-live region is still seen.
  const lines = () => {
    const out = (document.body.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    for (const el of document.querySelectorAll("[role=alert], [role=status], [aria-live], dialog[open], [role=dialog], [class*=error], [class*=toast], [data-bm-nav-error], [data-error]")) {
      if (!vis(el)) continue;
      for (const s of (el.textContent || "").split("\n")) { const t = s.replace(/\s+/g, " ").trim(); if (t) out.push(t); }
    }
    return out;
  };
  window.__aud = { vis, list, pick, fill, lines };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = []; // { page, w, lang, control, status, detail }
const skipped = [];
const pageSeconds = new Map();

async function openFresh(path, w, h, lang) {
  const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED + (SEEDS[path.split("?")[0]] || "") + FLAGS });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  await ctx.addInitScript(INSTALL); // every navigation, so a page that reloads itself keeps the helpers
  const sep = path.includes("?") ? "&" : "?";
  const { page, errors } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"));
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? MARK : undefined).catch(() => {}));
  await page.waitForTimeout(1000);
  await page.evaluate(INSTALL);
  if (path.startsWith("import-notes.html")) {
    await page.setInputFiles("#fileInput", { name: "Audit.xml", mimeType: "application/xml", buffer: Buffer.from(WXR) });
    await page.waitForFunction(() => getComputedStyle(document.getElementById("previewSection")).display !== "none" && document.getElementById("importBtn").getAttribute("aria-disabled") === "false", null, { timeout: 15000 }).catch(() => {});
    if (VERBOSE) console.log("   import-notes state:", await page.evaluate(() => ({ prev: getComputedStyle(document.getElementById("previewSection")).display, aria: document.getElementById("importBtn").getAttribute("aria-disabled"), gate: document.getElementById("gateNotice")?.textContent, parsing: document.getElementById("parsingMsg")?.textContent })));
    await page.waitForTimeout(300);
  }
  if (MUTATE === "silent" && path.startsWith(MUTATE_PAGE)) {
    // The page's refusal message is replaced by console.error only: any new text that says "not saved" is stripped as it appears.
    await page.evaluate(([en, bn]) => {
      const re = new RegExp(en, "i"), rb = new RegExp(bn);
      const strip = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const hit = []; while (w.nextNode()) { const t = w.currentNode; if (re.test(t.nodeValue) || rb.test(t.nodeValue) || /\bsaved|success|সংরক্ষিত/i.test(t.nodeValue)) hit.push(t); } for (const t of hit) { console.error("[mutated] " + t.nodeValue.trim().slice(0, 80)); t.nodeValue = ""; } };
      new MutationObserver(strip).observe(document.body, { childList: true, subtree: true, characterData: true });
    }, [REFUSED_EN.source, REFUSED_BN.source]);
  }
  return { ctx, page, errors };
}

// Part 99: click the flow's steps (all, or all but the last) to reach the state whose controls are audited.
async function flowSteps(page, mode) { // "all" | "butlast" | "last"
  const all = FLOWS[FLOW].steps;
  const base = FLOWS[FLOW].base ?? all.length - 1; // the controls pressed are those that appear after step number `base`
  const steps = mode === "butlast" ? all.slice(0, base) : mode === "last" ? all.slice(base) : all;
  for (const s of steps) {
    await page.waitForSelector(s, { state: "visible", timeout: 8000 });
    await page.evaluate((sel) => { const el = [...document.querySelectorAll(sel)].find(window.__aud.vis); el.click(); }, s);
    await page.waitForTimeout(700);
  }
}

// Press one control (after pressing the `via` menu controls that reach it) and judge what happens.
async function probe(path, w, h, lang, via, ctl) {
  const { ctx, page, errors } = await openFresh(path, w, h, lang);
  if (FLOW) await flowSteps(page, "all");
  const out = { attempted: false, nav: false, newControls: [] };
  const settle = async () => { for (let i = 0; i < 6; i++) { try { await page.evaluate(() => window.__aud.fill()); return; } catch (e) { await page.waitForLoadState("load").catch(() => {}); await page.waitForTimeout(700); } } };
  try {
    const press = async (c) => {
      await page.evaluate(() => window.__aud.fill());
      const ok = await page.evaluate(([k, n]) => { const el = window.__aud.pick(k, n); if (!el) return false; el.scrollIntoView({ block: "center" }); return true; }, [c.key, c.nth]);
      if (!ok) return false;
      const handle = await page.evaluateHandle(([k, n]) => window.__aud.pick(k, n), [c.key, c.nth]);
      await handle.asElement().click({ timeout: 2500, noWaitAfter: true }).catch(async () => { await page.evaluate(([k, n]) => window.__aud.pick(k, n)?.click(), [c.key, c.nth]); });
      return true;
    };
    for (const c of via) { if (!(await press(c))) { out.gone = true; return out; } await page.waitForTimeout(250); }
    await settle();
    const before = await page.evaluate(() => ({ lines: window.__aud.lines(), keys: window.__aud.list().map((c) => c.key) }));
    const url0 = page.url();
    const nErr0 = errors.length;
    await page.evaluate(() => { window.__refHits = 0; window.__armed = true; });
    if (!(await press(ctl))) { out.gone = true; return out; }
    // poll 3 s for a message
    const t0 = Date.now(); let first = null, last = null, msg = "", success = "";
    const seenB = new Set(before.lines);
    while (Date.now() - t0 < 3200) {
      await page.waitForTimeout(120);
      if (page.url() !== url0) { out.nav = true; break; }
      const now = await page.evaluate(() => window.__aud.lines()).catch(() => null);
      if (!now) { out.nav = true; break; }
      const fresh = now.filter((l) => !seenB.has(l));
      const hit = fresh.find((l) => REFUSED_EN.test(l) || REFUSED_BN.test(l));
      if (hit) { if (first === null) { first = Date.now(); msg = hit; } last = Date.now(); }
      else if (first !== null && now.includes(msg)) last = Date.now();
      if (!hit && !success) success = fresh.find((l) => SUCCESS.test(l)) || "";
      if (first !== null && Date.now() - first > 2300) break;
    }
    out.hits = await page.evaluate(() => window.__refHits).catch(() => 0);
    out.attempted = out.hits > 0;
    out.msg = msg; out.visibleMs = first === null ? 0 : (last - first);
    out.success = success; out.consoleErr = errors.slice(nErr0).filter(quiet).slice(0, 2);
    if (out.nav) return out;
    const after = await page.evaluate(([k, n, mark]) => {
      const el = window.__aud.pick(k, n), L = window.__aud.lines();
      return { present: !!el, savingText: L.some((l) => /saving|সংরক্ষণ করা হচ্ছে/i.test(l) && l.length < 60), markerInPage: L.some((l) => l.includes(mark)), keys: window.__aud.list().map((c) => c.key), lines: L };
    }, [ctl.key, ctl.nth, MARK]).catch(() => null);
    if (after) {
      out.stuck = after.savingText || (!after.present && !out.nav && before.keys.includes(ctl.key) && after.keys.length === 0);
      out.markerAdded = after.markerInPage && !before.lines.some((l) => l.includes(MARK));
      out.newControls = after.keys.filter((k) => !before.keys.includes(k));
      out.lang = { bnOk: REFUSED_BN.test(msg) && /[ঀ-৿]/.test(msg), enOk: !/[ঀ-৿]/.test(msg) };
    }
  } finally { await ctx.close(); }
  return out;
}

function judge(o, lang) {
  if (o.nav) return { status: "NAV", detail: "navigates away" };
  if (!o.attempted) return { status: "NOSAVE" };
  const langOk = lang === "bn" ? o.lang?.bnOk : o.lang?.enOk;
  if (o.stuck) return { status: "STUCK", detail: `still says Saving / control gone; ${o.msg ? "message: " + o.msg : "no message"}` };
  if (!o.msg) {
    if (o.success || o.markerAdded) return { status: "MISLEADING", detail: o.success ? `shows "${o.success.slice(0, 60)}"` : "typed value left in the page as if saved" };
    return { status: "MISSING", detail: `no visible message; console: ${o.consoleErr.join(" | ").slice(0, 100) || "(nothing)"}` };
  }
  if (o.visibleMs < 2000) return { status: "MISSING", detail: `message "${o.msg.slice(0, 50)}" visible only ${o.visibleMs} ms` };
  if (!langOk) return { status: "MISSING", detail: `message "${o.msg.slice(0, 50)}" not in the page language (${lang})` };
  if (o.markerAdded) return { status: "MISLEADING", detail: `message shown but the typed value stays in the page as saved` };
  return { status: "OK", detail: o.msg.slice(0, 60) };
}

const isMenu = (c) => c.key.endsWith("|MENU");
for (const [name, path] of PAGES) {
  if (FLOW ? !path.startsWith(FLOWS[FLOW].path) : (ONLY && !ONLY.split(",").some((p) => path.startsWith(p)))) continue;
  const tPage = Date.now();
  for (const [w, h] of VIEWPORTS) {
    if (VP && w !== VP) continue;
    for (const lang of ["en", "bn"]) {
      if (lang === "bn" && !(BN === "all" || (BN !== "none" && BN_PAGES.has(path.split("?")[0])))) continue;
      const tag = `${name} / ${w} / ${lang}`;
      const onMenuPage = path.startsWith(MENU_PAGE);
      console.log(`== ${tag}`);
      // enumerate
      const { ctx, page } = await openFresh(path, w, h, lang);
      let baseKeys = null;
      if (FLOW) { await flowSteps(page, "butlast"); baseKeys = new Set((await page.evaluate(() => window.__aud.list())).map((c) => c.key)); await flowSteps(page, "last").catch(() => {}); }
      await page.evaluate(() => window.__aud.fill());
      await page.waitForTimeout(200);
      let top = await page.evaluate(() => window.__aud.list());
      if (FLOW) { top = top.filter((c) => !baseKeys.has(c.key) && !isMenu(c)); console.log(`   flow ${FLOW}: ${top.length} controls: ${top.map((c) => c.label).join(" | ")}`); }
      await ctx.close();
      // The page's own controls come first (cap CAP); the menu's are pressed after them, on the menu page at 1440 / en only (cap MENU_CAP).
      const auditMenu = !NOMENU && onMenuPage && lang === "en" && w === 1440;
      const queue = [], menuQueue = [];
      for (const c of top) {
        if (SKIP.test(c.label)) skipped.push(`${tag}: ${c.label} (sign-out)`);
        else if (isMenu(c)) { if (auditMenu) menuQueue.push({ via: [], c }); else skipped.push(`MENU (audited on ${MENU_PAGE}): ${c.label}`); }
        else queue.push({ via: [], c });
      }
      const done = new Set(); let n = 0, nMenu = 0;
      const cap = w < 800 ? Math.min(CAP, 10) : CAP; // the phone width repeats the same code paths: fewer controls, to fit the time
      while ((queue.length && n < cap) || (menuQueue.length && nMenu < MENU_CAP)) {
        const fromMenu = !(queue.length && n < cap);
        const q = fromMenu ? menuQueue : queue;
        if (fromMenu) nMenu++; else n++;
        const { via, c } = q.shift();
        if (!via.length && !fromMenu && n <= FROM) continue; // slice: --from=<n> skips the first n top-level controls
        const id = via.map((v) => v.key).join(">") + ">" + c.key + "#" + c.nth;
        if (done.has(id)) continue; done.add(id);
        let o;
        try { o = await probe(path, w, h, lang, via, c); } catch (e) { o = { error: String(e).slice(0, 80) + " @" + ((e.stack || "").match(/mjs:(\d+)/) || [])[1] }; }
        if (o.error || o.gone) { if (VERBOSE) console.log(`   ?  ${c.label}: ${o.error || "control gone after the menu step"}`); continue; }
        const j = judge(o, lang);
        if (j.status === "NAV") skipped.push(`${tag}: ${c.label} (navigates away)`);
        if (j.status !== "NOSAVE" && j.status !== "NAV") results.push({ page: name, path, w, lang, control: c.label || c.key, menu: isMenu(c), ...j });
        if (LIST || VERBOSE || !["NOSAVE", "NAV", "OK"].includes(j.status)) console.log(`   ${j.status.padEnd(10)} ${c.label || c.key}${j.detail ? "  — " + j.detail : ""}`);
        if (!o.attempted && !o.nav && o.newControls.length && via.length < DEPTH) for (const k of o.newControls.slice(0, 12)) {
          const nc = { key: k, nth: 1, label: k.split("|")[1] || k };
          if (isMenu(nc) && !auditMenu) continue;
          if (isMenu(nc)) menuQueue.unshift({ via: [...via, c], c: nc }); else queue.push({ via: [...via, c], c: nc });
        }
      }
      if (queue.length) console.log(`   (cap ${cap} reached; ${queue.length} controls not pressed)`);
      if (menuQueue.length) console.log(`   (menu cap ${MENU_CAP} reached; ${menuQueue.length} menu controls not pressed)`);
    }
  }
  const secs = Math.round((Date.now() - tPage) / 1000);
  pageSeconds.set(name, secs);
  console.log(`-- ${name}: ${secs} s`);
}
await browser.close();

// ---- report ----
const byPage = new Map();
for (const r of results) { const m = byPage.get(r.page) || { saves: 0, OK: 0, MISSING: 0, MISLEADING: 0, STUCK: 0 }; m.saves++; m[r.status]++; byPage.set(r.page, m); }
console.log("\npage | saves | OK | MISSING | MISLEADING | STUCK | seconds");
const tot = { saves: 0, OK: 0, MISSING: 0, MISLEADING: 0, STUCK: 0 };
for (const [p, s] of pageSeconds) { const m = byPage.get(p) || { saves: 0, OK: 0, MISSING: 0, MISLEADING: 0, STUCK: 0 }; console.log(`${p} | ${m.saves} | ${m.OK} | ${m.MISSING} | ${m.MISLEADING} | ${m.STUCK} | ${s}`); for (const k of Object.keys(tot)) tot[k] += m[k]; }
console.log(`TOTAL | ${tot.saves} | ${tot.OK} | ${tot.MISSING} | ${tot.MISLEADING} | ${tot.STUCK} | ${[...pageSeconds.values()].reduce((a, b) => a + b, 0)}`);
console.log("\nfailures:"); for (const r of results.filter((r) => r.status !== "OK")) console.log(`  ${r.page} / ${r.w} / ${r.lang} / ${r.control}: ${r.status} — ${r.detail}`);
console.log("\nskipped (navigate away / sign-out / shared menu):"); for (const s of [...new Set(skipped)]) console.log("  " + s);

const bad = results.filter((r) => r.status !== "OK").length;
if (MUTATE === "silent") {
  const m = results.filter((r) => r.path.startsWith(MUTATE_PAGE));
  const missing = m.filter((r) => r.status === "MISSING" || r.status === "MISLEADING").length;
  console.log(`\nMUTATION silent on ${MUTATE_PAGE}: ${m.length} saves, ${missing} counted MISSING/MISLEADING -> ${m.length > 0 && missing === m.length ? "caught (the sweep CAN fail)" : "NOT caught"}`);
  process.exit(m.length > 0 && missing === m.length ? 1 : 2);
}
const pc = results.filter((r) => r.path.startsWith("bookmarks.html") && /rename/i.test(r.control) && r.lang === "en");
console.log(`\nPOSITIVE CONTROL bookmarks.html Rename: ${pc.length} found, ${pc.filter((r) => r.status === "OK").length} OK -> ${pc.length && pc.every((r) => r.status === "OK") ? "OK" : "NOT OK or not run"}`);
const pm = results.filter((r) => r.menu && /remove bookmark/i.test(r.control) && r.lang === "en");
console.log(`POSITIVE CONTROL shared menu Remove bookmark (🗑): ${pm.length} found, ${pm.filter((r) => r.status === "OK").length} OK -> ${pm.length && pm.every((r) => r.status === "OK") ? "OK" : "NOT OK or not run"}`);
console.log(`\n==== Shared pages failed-write audit: ${tot.OK} OK, ${bad} not OK of ${tot.saves} saves ====`);
process.exit(bad ? 1 : 0);
