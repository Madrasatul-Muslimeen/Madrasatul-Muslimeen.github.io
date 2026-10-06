// Note pane Part C3 (decisions 72, 80; issue #616) -- tab groups, templates, quick phrases, heading styles and folds,
// kept in userPrefs/{uid}.mmsaNotes so they are the same on every device. Real clicks and typing, en + bn, 390 / 820 / 1440.
// "Device 2" is a fresh browser context whose stub data is what device 1 wrote; "device 3" is seeded with hostile values.
// MUTATE=merge-off | palette-open | folds-in-note | startup-read | phrases-uncapped | template-unsanitised  runs a deliberately broken build.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv[2] || process.env.MUTATE || "";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const PREFS_ID = "test-uid";
const BODY = "<h1>Alpha</h1><p>One text.</p><h2>Beta</h2><p>Two text.</p>";
const seedJs = (prefsDoc, legacy) => `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  DATA.userPrefs = [${JSON.stringify(prefsDoc)}];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Alpha", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2026-09-01T10:00:00Z") }, own));
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "r-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: "fA", order: order, status: "active" }, own)); }
  N("n1", "Note One", ${JSON.stringify(BODY)}, 1); N("n2", "Note Two", "<h1>Gamma</h1><p>Three text.</p>", 2);
  P("p1", "n1", 0); P("p2", "n2", 1);
  DATA.noteRevisions.push(Object.assign({ _id: "t1__r-n1", revisionId: "r-n1", noteId: "n1", previousRevisionId: null, title: "Note One", bodyHtml: ${JSON.stringify(BODY)}, revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2026-09-01T01:00:00Z") }, own));
  ${legacy ? `try { localStorage.setItem("qr.journeyNoteCollapsed.n2", "[0]"); } catch (e) {}` : ""}
})();`;

const HOSTILE = (() => {
  const folds = {}; for (let i = 0; i < 401; i++) folds[`hn${String(i).padStart(3, "0")}`] = [0]; folds["bad/id"] = [0];
  return {
    _id: PREFS_ID, themeColors: { keep: "me" },
    mmsaNotes: {
      tabs: [{ noteId: "n1", name: "<b>x</b>".repeat(20), colour: "#123456" }, { noteId: "../evil", name: "no", colour: "" }],
      templates: Array.from({ length: 60 }, (_, i) => ({ id: `t${i}`, title: "T", bodyHtml: i === 0 ? "<p>ok</p><script>alert(1)</script>" : "<p>x</p>" })),
      phrases: ["p".repeat(500), ...Array.from({ length: 150 }, (_, i) => `phrase ${i}`)],
      headingStyles: { h1: { border: "red;background:url(x)", bg: "#abcdef" }, h2: { border: "#b3261e", bg: "" } },
      folds,
    },
  };
})();

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const HEIGHT = 900;
const W = (id) => `.note-win[data-note-id="${id}"]`;
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const leafToggle = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `#folderNotes [data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
const writes = (page) => page.evaluate(() => (window.__stubWriteData || []).slice());
const prefWrites = async (page) => (await writes(page)).filter((w) => w.col === "userPrefs");
const userPrefReads = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => r.col === "userPrefs" && /get/i.test(r.kind)).length);
const cache = (page) => page.evaluate((id) => JSON.parse(localStorage.getItem(`mmsa.noteSettings.${id}`) || "null"), PREFS_ID);

async function openWindowFor(page, id, sheet, width) {
  if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT });
  await page.evaluate((s) => document.querySelector(s).click(), leafToggle(id));
  await page.evaluate((s) => document.querySelector(s).click(), leafWindowBtn(id));
  await page.waitForSelector(W(id));
  if (sheet) await page.setViewportSize({ width, height: HEIGHT });
  await page.waitForTimeout(200);
}
async function openPageWith(ctx) {
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
  await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 2, null, { timeout: 15000 });
  return { page, errors };
}
async function routeMutations(ctx) {
  if (!MUTATE) return;
  await ctx.route("**/*", async (route) => {
    const url = route.request().url();
    const edits = [];
    if (/note-user-settings-fs\.js/.test(url) && MUTATE === "merge-off") edits.push(["{ merge: true }", "{}"]);
    if (/note-user-settings\.js/.test(url)) {
      if (MUTATE === "palette-open") edits.push(["return PALETTE_HEX.has(c) ? c : \"\";", "return /^#[0-9a-f]{3,6}$/.test(c) || /^[a-z;:#()0-9 ,.-]+$/.test(c) ? c : \"\";"]);
      if (MUTATE === "phrases-uncapped") edits.push(["if (out.length >= LIMITS.phrases) break;", ""]);
      if (MUTATE === "template-unsanitised") edits.push(["body = sanitize(typeof", "body = ((a) => a)(typeof"]);
    }
    if (/note-window\.js/.test(url)) {
      if (MUTATE === "folds-in-note") edits.push(["store.setFold(noteId, [...set]).catch(", "(host.revise({ note: getNote(noteId), expectedRevisionId: getNote(noteId).currentRevisionId, title: getNote(noteId).title, bodyHtml: getNote(noteId).bodyHtml }), store.setFold(noteId, [...set])).catch("]);
      if (MUTATE === "startup-read") edits.push(["const S = () => host.settings?.() ?? null;", "const S = () => host.settings?.() ?? null; const __iv = setInterval(() => { if (S()) { clearInterval(__iv); S().open(); } }, 100);"]);
    }
    if (!edits.length) return route.fallback();
    const res = await route.fetch();
    let body = await res.text();
    for (const [a, b] of edits) { if (!body.includes(a)) console.log(`  (mutation ${MUTATE} did not apply: ${a.slice(0, 40)})`); body = body.replace(a, b); }
    await route.fulfill({ response: res, body });
  });
}
async function openTools(page, id) {
  await page.click(`${W(id)} [data-pane-menu-btn]`);
  await page.click(`${W(id)} [data-pane-mytools]`);
  await page.waitForSelector('[data-note-dialog="mytools"]');
}
const section = (page, k) => page.click(`[data-note-dialog="mytools"] [data-mt-sec="${k}"]`);
const dlgOverflow = (page) => page.evaluate(() => { const c = document.querySelector('[data-note-dialog="mytools"] .tag-picker-card'); return !c || c.scrollWidth <= c.clientWidth + 1; });
const closeDlg = (page) => page.click('[data-note-dialog="mytools"] [data-dlg-close]');

for (const lang of (process.argv[3] || "en,bn").split(",")) { // argv: [mutation|none] [langs] [widths]
  for (const width of (process.argv[4] || "390,820,1440").split(",").map(Number)) {
    const tag = `${lang} ${width}px`;
    const sheet = width < 640;
    // ================= DEVICE 1 =================
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: seedJs({ _id: PREFS_ID, themeColors: { keep: "me" } }, true) });
    await routeMutations(ctx);
    const { page, errors } = await openPageWith(ctx);
    await page.waitForTimeout(MUTATE === "startup-read" ? 900 : 300);
    check(`${tag}: nothing reads userPrefs at startup, before any Note is opened`, (await userPrefReads(page)) === 0, `${await userPrefReads(page)} reads`);
    await openWindowFor(page, "n2", sheet, width);
    await until(page, () => (window.__fsLog || []).some((r) => r.col === "userPrefs"));
    check(`${tag}: opening the first Note reads userPrefs/${PREFS_ID} exactly once`, (await userPrefReads(page)) === 1, `${await userPrefReads(page)}`);
    await openWindowFor(page, "n1", sheet, width); // n1 ends in front; n2 stays open behind it
    check(`${tag}: opening a second Note does not read it again`, (await userPrefReads(page)) === 1);
    await until(page, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs"));
    let pw = await prefWrites(page);
    check(`${tag}: the old local fold is copied up once, under mmsaNotes.folds, with merge`, pw.length === 1 && pw[0].id === PREFS_ID && pw[0].merge === true && JSON.stringify(pw[0].data) === JSON.stringify({ mmsaNotes: { folds: { n2: [0] } } }), JSON.stringify(pw));
    check(`${tag}: the old local value still exists`, await page.evaluate(() => localStorage.getItem("qr.journeyNoteCollapsed.n2") === "[0]"));
    check(`${tag}: the copied-up fold shows as folded in n2`, await page.evaluate(() => document.querySelector('.note-win[data-note-id="n2"] .note-sec')?.classList.contains("collapsed") === true));
    // close n2 to keep one window
    await page.evaluate(() => document.querySelector('.note-win[data-note-id="n2"] [data-pane-close], .note-win[data-note-id="n2"] [data-win-close]')?.click());

    // ---- phrases (37) ----
    await openTools(page, "n1");
    check(`${tag}: the tools dialog is translated`, lang === "bn" ? hasBn(await page.textContent('[data-note-dialog="mytools"] [data-mt-sec="tabs"]')) : (await page.textContent('[data-note-dialog="mytools"] [data-mt-sec="tabs"]')) === "Tabs");
    await section(page, "phrases");
    await page.fill("[data-mt-phrasenew]", "Bismillah, Alhamdulillah");
    await page.press("[data-mt-phrasenew]", "Enter");
    await page.waitForSelector('[data-mt-phrasetext="0"]');
    await page.fill("[data-mt-phrasenew]", "Second phrase");
    await page.press("[data-mt-phrasenew]", "Enter");
    await page.waitForSelector('[data-mt-phrasetext="1"]');
    await page.fill('[data-mt-phrasetext="1"]', "Second phrase, edited");
    await page.press('[data-mt-phrasetext="1"]', "Tab");
    await until(page, () => (window.__stubWriteData || []).filter((w) => w.col === "userPrefs" && w.data.mmsaNotes.phrases && w.data.mmsaNotes.phrases[1] === "Second phrase, edited").length >= 1);
    check(`${tag}: phrases dialog: no sideways overflow`, (await dlgOverflow(page)) && (await noSideways(page)));
    check(`${tag}: phrase buttons are 40px or taller`, await page.evaluate(() => [...document.querySelectorAll('[data-note-dialog="mytools"] button, [data-note-dialog="mytools"] input')].filter((b) => b.offsetParent).every((b) => b.getBoundingClientRect().height >= 40)));
    await page.fill("[data-mt-phrasenew]", "Third");
    await page.press("[data-mt-phrasenew]", "Enter");
    await page.waitForSelector('[data-mt-phrasetext="2"]');
    await page.click('[data-mt-phrasedel="2"]');
    await until(page, () => !document.querySelector('[data-mt-phrasetext="2"]'));

    // ---- heading styles (40) ----
    await section(page, "headings");
    await page.click('[data-mt-border="1"][data-mt-hex="#b3261e"]');
    await page.click('[data-mt-bg="1"][data-mt-hex="#fff59d"]');
    await until(page, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs" && w.data.mmsaNotes.headingStyles && w.data.mmsaNotes.headingStyles.h1 && w.data.mmsaNotes.headingStyles.h1.bg === "#fff59d"));
    check(`${tag}: headings dialog: chips are 40px, no sideways overflow`, (await dlgOverflow(page)) && (await noSideways(page)) && (await page.evaluate(() => [...document.querySelectorAll("[data-mt-hex]")].every((b) => b.getBoundingClientRect().width >= 40 && b.getBoundingClientRect().height >= 40))));
    check(`${tag}: the H1 in the Note now wears the chosen border and background`, await page.evaluate((w) => { const h = document.querySelector(`${w} h1.note-sec-h`); const c = getComputedStyle(h); return c.borderTopColor === "rgb(179, 38, 30)" && c.backgroundColor === "rgb(255, 245, 157)"; }, W("n1")));
    check(`${tag}: the style is not saved into the Note's text`, await page.evaluate(() => !/b3261e|fff59d/i.test(window.__DATA.notes.find((n) => n.noteId === "n1").bodyHtml)));
    await page.click('[data-mt-border="1"][data-mt-hex=""]'); // none again, then set it back to prove clearing works
    await page.click('[data-mt-border="1"][data-mt-hex="#b3261e"]');

    // ---- tab groups (34) ----
    await section(page, "tabs");
    await page.click("[data-mt-tabadd]");
    await page.waitForSelector('[data-mt-tabname="0"]');
    await page.fill('[data-mt-tabname="0"]', "Reading list");
    await page.press('[data-mt-tabname="0"]', "Tab");
    await page.waitForSelector('[data-mt-tabcolour="0"]');
    await page.selectOption('[data-mt-tabcolour="0"]', "#1b6e3c");
    await until(page, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs" && w.data.mmsaNotes.tabs && w.data.mmsaNotes.tabs[0] && w.data.mmsaNotes.tabs[0].colour === "#1b6e3c" && w.data.mmsaNotes.tabs[0].name === "Reading list"));
    check(`${tag}: tabs dialog: no sideways overflow; ＋ Add Tab is disabled for a Note already added`, (await dlgOverflow(page)) && (await page.evaluate(() => document.querySelector("[data-mt-tabadd]").disabled)));

    // ---- templates (36) ----
    await section(page, "templates");
    await page.click("[data-mt-tplsave]");
    await page.waitForSelector('[data-mt-tplname="0"]');
    await page.fill('[data-mt-tplname="0"]', "Lesson plan");
    await page.press('[data-mt-tplname="0"]', "Tab");
    await until(page, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs" && w.data.mmsaNotes.templates && w.data.mmsaNotes.templates[0] && w.data.mmsaNotes.templates[0].title === "Lesson plan"));
    check(`${tag}: a template holds the Note's text`, await page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "userPrefs" && w.data.mmsaNotes.templates).pop().data.mmsaNotes.templates[0].bodyHtml.includes("One text.")));
    await page.click('[data-mt-tplask="0"]');
    await page.waitForSelector("[data-mt-yes]");
    await page.click("[data-mt-tplcancel]");
    check(`${tag}: removing a template asks first, and Keep it keeps it`, (await page.locator('[data-mt-tplname="0"]').count()) === 1);
    check(`${tag}: templates dialog: no sideways overflow`, (await dlgOverflow(page)) && (await noSideways(page)));
    await closeDlg(page);

    // ---- folds (45) ----
    const notesBefore = await page.evaluate(() => [window.__DATA.notes.length, window.__DATA.noteRevisions.length]);
    await page.click(`${W("n1")} [data-sec-toggle="0"]`);
    await until(page, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs" && w.data.mmsaNotes.folds && JSON.stringify(w.data.mmsaNotes.folds.n1) === "[0]"));
    const all1 = await writes(page);
    check(`${tag}: folding a section writes only mmsaNotes.folds.n1`, all1.some((w) => w.col === "userPrefs" && JSON.stringify(w.data) === JSON.stringify({ mmsaNotes: { folds: { n1: [0] } } })));
    check(`${tag}: folds and heading styles change no Note (no notes / noteRevisions write, same revision count)`, !all1.some((w) => /^note/.test(w.col || "")) && (await page.evaluate(() => [window.__DATA.notes.length, window.__DATA.noteRevisions.length])).join() === notesBefore.join());

    // ---- what was written, all of it ----
    pw = await prefWrites(page);
    check(`${tag}: every write is to userPrefs/${PREFS_ID}, a merge, under mmsaNotes alone`, pw.length >= 8 && pw.every((w) => w.id === PREFS_ID && w.kind === "set" && w.merge === true && Object.keys(w.data).join() === "mmsaNotes"), JSON.stringify(pw.filter((w) => !(w.id === PREFS_ID && w.merge === true && Object.keys(w.data).join() === "mmsaNotes")).slice(0, 2)));
    check(`${tag}: themeColors is never written, and is still in the document`, !JSON.stringify(pw).includes("themeColors") && (await page.evaluate(() => window.__DATA.userPrefs[0].themeColors.keep === "me")));
    check(`${tag}: no write outside userPrefs from the settings (only that collection)`, (await writes(page)).every((w) => w.col === "userPrefs"));
    const prefsDoc = await page.evaluate(() => JSON.parse(JSON.stringify(window.__DATA.userPrefs[0])));
    check(`${tag}: no page errors on device 1`, errors.filter((e) => !/ERR_CERT|net::/.test(String(e))).length === 0, JSON.stringify(errors.slice(0, 2)));
    await ctx.close();

    // ================= DEVICE 2: same account, a fresh browser =================
    const ctx2 = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: seedJs(prefsDoc, false) });
    await routeMutations(ctx2);
    const p2 = await openPageWith(ctx2);
    const page2 = p2.page;
    await openWindowFor(page2, "n1", sheet, width);
    await until(page2, () => document.querySelector('.note-win[data-note-id="n1"] .note-sec.collapsed') && getComputedStyle(document.querySelector('.note-win[data-note-id="n1"] h1.note-sec-h')).borderTopColor === "rgb(179, 38, 30)");
    check(`${tag}: device 2 sees the folded section`, await page2.evaluate(() => document.querySelector('.note-win[data-note-id="n1"] .note-sec').classList.contains("collapsed")));
    check(`${tag}: device 2 sees the heading style`, await page2.evaluate(() => getComputedStyle(document.querySelector('.note-win[data-note-id="n1"] h1.note-sec-h')).backgroundColor === "rgb(255, 245, 157)"));
    check(`${tag}: device 2 wrote nothing just by opening a Note`, (await writes(page2)).length === 0, JSON.stringify(await writes(page2)));
    await openTools(page2, "n1");
    await section(page2, "tabs");
    check(`${tag}: device 2 sees the tab, its name and its colour`, await page2.evaluate(() => document.querySelector('[data-mt-tabname="0"]').value === "Reading list" && document.querySelector('[data-mt-tabcolour="0"]').value === "#1b6e3c"));
    await section(page2, "templates");
    check(`${tag}: device 2 sees the template`, await page2.evaluate(() => document.querySelector('[data-mt-tplname="0"]').value === "Lesson plan"));
    await section(page2, "phrases");
    check(`${tag}: device 2 sees both phrases, edited text included`, await page2.evaluate(() => document.querySelector('[data-mt-phrasetext="0"]').value === "Bismillah, Alhamdulillah" && document.querySelector('[data-mt-phrasetext="1"]').value === "Second phrase, edited" && !document.querySelector('[data-mt-phrasetext="2"]')));
    await closeDlg(page2);
    // quick phrase: one tap inserts it at the cursor
    await page2.click(`${W("n1")} [data-pane-menu-btn]`);
    await page2.click(`${W("n1")} [data-pane-edit-toggle]`);
    await page2.waitForSelector(`${W("n1")} .pane-edit-body`);
    await page2.click(`${W("n1")} .pane-edit-body p`);
    if (!(await page2.isVisible(`${W("n1")} [data-edit-toolbar] [data-cmd="phrases"]`))) await page2.click(`${W("n1")} [data-edit-toolbar] [data-tb-tab="3"]`);
    await page2.click(`${W("n1")} [data-edit-toolbar] [data-cmd="phrases"]`);
    await page2.click(`${W("n1")} [data-phrase-insert="0"]`);
    check(`${tag}: one tap on a phrase puts it into the Note being edited`, await page2.evaluate(() => document.querySelector('.note-win[data-note-id="n1"] .pane-edit-body').textContent.includes("Bismillah, Alhamdulillah")));
    check(`${tag}: the phrase panel has no sideways overflow`, await noSideways(page2));
    await page2.click(`${W("n1")} [data-pane-menu-btn]`);
    await page2.click(`${W("n1")} [data-pane-edit-toggle]`); // Done: saves the typed phrase as the Note's own new version
    await page2.waitForTimeout(500);
    // new from template
    const nBefore = await page2.evaluate(() => window.__DATA.notes.length);
    if (await page2.isVisible(`${W("n1")} [data-pane-new]`)) {
      await page2.click(`${W("n1")} [data-pane-new]`);
      await page2.waitForSelector('[data-note-dialog="newtpl"] [data-nt-tpl="0"]');
      check(`${tag}: ✚ offers a blank Note, the template and a way to manage templates`, (await page2.locator('[data-note-dialog="newtpl"] [data-nt-blank], [data-note-dialog="newtpl"] [data-nt-tpl], [data-note-dialog="newtpl"] [data-nt-manage]').count()) === 3);
      await page2.click('[data-note-dialog="newtpl"] [data-nt-tpl="0"]');
      await until(page2, (n) => window.__DATA.notes.length > n, nBefore);
      check(`${tag}: New from template makes a new Note carrying the template's text`, await page2.evaluate(() => { const n = window.__DATA.notes[window.__DATA.notes.length - 1]; return n.noteId !== "n1" && n.bodyHtml.includes("One text.") && n.title === "Lesson plan"; }));
    } else check(`${tag}: ✚ is on the Note bar`, false);
    check(`${tag}: nothing in a template or phrase removed a Note`, await page2.evaluate(() => window.__DATA.notes.some((n) => n.noteId === "n1") && window.__DATA.notes.some((n) => n.noteId === "n2")));
    await ctx2.close();

    // ================= DEVICE 3: hostile values already in the account =================
    const ctx3 = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: seedJs(HOSTILE, false) });
    await routeMutations(ctx3);
    const p3 = await openPageWith(ctx3);
    const page3 = p3.page;
    await openWindowFor(page3, "n1", sheet, width);
    await until(page3, (id) => !!localStorage.getItem(`mmsa.noteSettings.${id}`) && JSON.parse(localStorage.getItem(`mmsa.noteSettings.${id}`)).templates.length > 0, PREFS_ID);
    const c3 = await cache(page3);
    check(`${tag}: hostile — a <script> in a template is cleaned`, c3.templates.length > 0 && !/<script|alert\(1\)/i.test(JSON.stringify(c3.templates)), JSON.stringify(c3.templates[0]));
    check(`${tag}: hostile — a colour outside the palette does not survive`, !JSON.stringify(c3).includes("123456") && !JSON.stringify(c3).includes("abcdef") && !JSON.stringify(c3.headingStyles).includes("url(") && c3.headingStyles.h2?.border === "#b3261e", JSON.stringify([c3.headingStyles, c3.tabs]));
    check(`${tag}: hostile — the heading style CSS holds palette colours only`, await page3.evaluate(() => { const css = document.querySelector("[data-mmsa-heading-styles]")?.textContent ?? ""; return css.includes("#b3261e") && !/url|abcdef|;background/i.test(css); }));
    check(`${tag}: hostile — a long phrase is cut to 200 and the 150 extra are capped at 100`, c3.phrases.length === 100 && c3.phrases.every((p) => p.length <= 200) && c3.phrases[0].length === 200, `${c3.phrases.length}`);
    check(`${tag}: hostile — a bad Note id is refused (tab and fold)`, !c3.tabs.some((x) => x.noteId.includes("..")) && !("bad/id" in c3.folds) && c3.tabs.length === 1 && !/[<>]/.test(c3.tabs[0].name));
    check(`${tag}: hostile — 60 templates are held to 50`, c3.templates.length === 50, `${c3.templates.length}`);
    check(`${tag}: hostile — 401 folds are held to 300, the newest kept`, Object.keys(c3.folds).length === 300 && "hn400" in c3.folds && !("hn000" in c3.folds), `${Object.keys(c3.folds).length}`);
    check(`${tag}: hostile — a new fold writes only its own Note's entry (and clears the oldest)`, await (async () => {
      await page3.click(`${W("n1")} [data-sec-toggle="0"]`);
      await until(page3, () => (window.__stubWriteData || []).some((w) => w.col === "userPrefs"));
      const w = (await prefWrites(page3))[0];
      const f = w.data.mmsaNotes.folds;
      return w.merge === true && Object.keys(w.data).join() === "mmsaNotes" && JSON.stringify(f.n1) === "[0]" && Object.keys(f).length === 2 && Object.values(f).some((x) => x && x.__deleteField);
    })());
    check(`${tag}: no sideways overflow on device 3`, await noSideways(page3));
    await ctx3.close();
  }
}

await browser.close();
console.log(`journey-across-devices-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
