// Audit part 97 (PCF MSA J29): do the 23 shared pages work at TABLET widths?  Parts 91-96 covered speed, Bangla, phone tables,
// keyboard, the way back and refused saves; nothing had measured a tablet.  Each page is opened signed in as the owner, with
// real-length names seeded, at 768x1024 and 820x1180 (portrait) and 1024x768 (landscape).  Per page and width it records:
//   sideways  the page scrolls sideways (documentElement.scrollWidth > innerWidth); names the element that sticks out
//   clipped   a visible button / link / select / input whose box leaves the viewport, or is cut by an overflow:hidden|clip
//             ancestor (containment is checked, not scrollWidth).  Inside a scroller (overflow-x auto|scroll) it is reachable.
//   cut       white-space:nowrap + text-overflow:ellipsis whose scrollWidth > clientWidth
//   overlap   elementFromPoint at a control's centre is neither the control nor inside it
//   small     a control under 32px on either side (FAILS); 32-39px is listed as "small, not failing" (40px is the target)
//   width     the main column's share of the viewport (report only; under 60% at 1024 landscape earns a line)
// The shared top menu (Home / Modules / Operation / Bookmark) is opened ONCE, on classes.html, at each width, and each open panel
// is measured the same way.  Both languages run on all 23 pages at 768, 820, 1024 and 1180 (part 118); --lang=bn / --lang=en / --no-bn pick one.
//
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-pages-tablet-audit-browser.mjs
//   --page=<name|file|N|N-M>   a page, or a 1-based range of the 23 (default all)      --lang=bn   Bangla at 768, top 3 pages
//   --list   print every finding      --verbose   print passes
//   --mutate=wide   inject a 1200px wide element into the first page measured; the suite must FAIL
// Positive control: the shared menu's own category buttons must be found (count > 0) on every page, or the page did not boot.
// Screenshots go to tools/i18n-verify/out/tablet/ (git-ignored); per-row JSON to out/tablet/rows.json on a full run.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
let LANG = "en";
const LANGS = arg("lang") === "bn" ? ["bn"] : arg("lang") === "en" || process.argv.includes("--no-bn") ? ["en"] : ["en", "bn"];
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list");

// Same order as shared-pages-failed-write-audit-browser.mjs / the Bangla layout audit (copied, not edited there).
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
const VIEWPORTS = [[768, 1024], [820, 1180], [1024, 768], [1180, 820]];
const OUT = "tools/i18n-verify/out/tablet";
fs.mkdirSync(OUT, { recursive: true });

// --page= : a 1-based range "1-12", a single number, or a name / file prefix.
function selectPages() {
  if (!ONLY) return PAGES.map((p, i) => [...p, i + 1]);
  const m = /^(\d+)(?:-(\d+))?$/.exec(ONLY);
  if (m) { const a = +m[1], b = +(m[2] || m[1]); return PAGES.map((p, i) => [...p, i + 1]).filter(([, , n]) => n >= a && n <= b); }
  return PAGES.map((p, i) => [...p, i + 1]).filter(([n, f]) => n.toLowerCase() === ONLY.toLowerCase() || f.startsWith(ONLY));
}

// Runs in the page.  `rootSel` scopes the controls (the menu's open panel); null measures the whole page.
const MEASURE = (rootSel) => {
  const W = window.innerWidth, H = window.innerHeight;
  const root = rootSel ? document.querySelector(rootSel) : document.body;
  const vis = (el) => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hidden || e.inert) return false;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      const d = e.parentElement?.closest("details");
      if (d && !d.open && e.parentElement === d && e.tagName !== "SUMMARY") return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const path = (el) => {
    const out = [];
    for (let e = el; e && e !== document.body && out.length < 4; e = e.parentElement)
      out.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/)[0] : "")));
    return out.join(">");
  };
  const txt = (el) => (el.getAttribute("aria-label") || el.value || el.textContent || el.getAttribute("title") || "").toString().replace(/\s+/g, " ").trim().slice(0, 40);
  const res = { sideways: [], clipped: [], cut: [], overlap: [], small: [], smallOk: [], width: null, controls: 0, menuButtons: 0 };
  res.menuButtons = document.querySelectorAll(".nav-cat > summary").length;
  res.headings = document.querySelectorAll("h1, h2").length;

  const doc = document.documentElement;
  if (!rootSel && doc.scrollWidth > window.innerWidth) {
    // name the element that sticks out: the visible element whose right edge is furthest past the viewport, outside any scroller
    let worst = null, wr = W;
    for (const el of document.body.querySelectorAll("*")) {
      if (/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(el.tagName) || !vis(el)) continue;
      if (getComputedStyle(el).position === "fixed") continue;
      let inScroller = false;
      for (let a = el.parentElement; a && a !== doc; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") { inScroller = true; break; } }
      if (inScroller) continue;
      const r = el.getBoundingClientRect();
      if (r.right > wr) { wr = r.right; worst = el; }
    }
    res.sideways.push({ key: "sideways|page", msg: `page scrolls sideways: scrollWidth ${doc.scrollWidth} > ${W}` + (worst ? `; ${path(worst)} ends at ${Math.round(wr)}` : "; no single element found (a clipped or fixed one)") });
  }

  const sel = "button, a[href], select, input:not([type=hidden]), textarea, summary, [role=button], [tabindex]:not([tabindex='-1'])";
  const controls = [...root.querySelectorAll(sel)].filter((el) => !el.disabled && vis(el));
  res.controls = controls.length;

  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const where = `${path(el)} "${txt(el)}"`;
    // clipped: out of the viewport, or cut by a clipping ancestor; inside a sideways scroller it is reachable
    let bad = "", fixed = false, fixedRoot = null;
    for (let a = el; a && a !== doc; a = a.parentElement) if (getComputedStyle(a).position === "fixed") { fixed = true; fixedRoot = a; break; }
    let boundary = false;
    for (let a = el.parentElement; a && a !== doc; a = a.parentElement) {
      // A fixed control is placed against the viewport, so an overflow:hidden ancestor ABOVE the fixed element does not clip it.
      // (Landing's Zab button was reported "cut by <body>" until this stop; looked at in the 1024 screenshot: the button is whole.)
      if (fixedRoot && a === fixedRoot.parentElement) break;
      const cs = getComputedStyle(a);
      const hx = cs.overflowX === "hidden" || cs.overflowX === "clip", hy = cs.overflowY === "hidden" || cs.overflowY === "clip";
      if (hx || hy) {
        const ar = a.getBoundingClientRect();
        if (ar.width > 0 && ar.height > 0) {
          if (hx && (r.right > ar.right + 1 || r.left < ar.left - 1)) { bad = `cut by ${path(a)} (box ${Math.round(ar.left)}..${Math.round(ar.right)}, control ${Math.round(r.left)}..${Math.round(r.right)})`; break; }
          if (hy && (r.bottom > ar.bottom + 1 || r.top < ar.top - 1) && cs.overflowY === "clip") { bad = `cut vertically by ${path(a)}`; break; }
        }
      }
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") { boundary = true; break; }
    }
    if (!bad && !boundary && (r.right > W + 1 || r.left < -1)) bad = `box ${Math.round(r.left)}..${Math.round(r.right)} leaves the ${W}px viewport`;
    if (!bad && fixed && (r.bottom > H + 1 || r.top < -1)) bad = `fixed control box ${Math.round(r.top)}..${Math.round(r.bottom)} leaves the ${H}px viewport`;
    if (bad) res.clipped.push({ key: "clipped|" + path(el), msg: `${where} ${bad}` });

    // small targets (a link running inside a sentence is text, not a tile)
    const cs = getComputedStyle(el);
    const isInlineLink = el.tagName === "A" && cs.display === "inline";
    if (!isInlineLink && !(el.tagName === "INPUT" && /^(checkbox|radio)$/.test(el.type))) {
      const m = Math.min(r.width, r.height);
      if (m < 32) res.small.push({ key: "small|" + path(el), msg: `${where} is ${Math.round(r.width)}x${Math.round(r.height)}px` });
      else if (m < 40) res.smallOk.push({ key: "smallOk|" + path(el), msg: `${where} is ${Math.round(r.width)}x${Math.round(r.height)}px` });
    }
  }

  // cut labels
  for (const el of root.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|SVG|PATH|OPTION)$/i.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== "ellipsis" || cs.whiteSpace !== "nowrap" || !vis(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) res.cut.push({ key: "cut|" + path(el), msg: `${path(el)} "${txt(el)}" needs ${el.scrollWidth}px, has ${el.clientWidth}px` });
  }

  // wasted width: the widest visible main column
  if (!rootSel) {
    const cands = [document.querySelector("main"), ...document.body.children].filter((e) => e && !/^(SCRIPT|STYLE|NAV|HEADER|TEMPLATE|NOSCRIPT)$/i.test(e.tagName) && vis(e) && getComputedStyle(e).position !== "fixed");
    const w = Math.max(0, ...cands.map((e) => e.getBoundingClientRect().width));
    res.width = Math.round((w / W) * 100);
  }

  // overlap: what is on top at the control's centre?  Bring it into view first.
  const seen = new Set();
  for (const el of controls.slice(0, 160)) {
    const p = path(el); if (seen.has(p + txt(el))) continue; seen.add(p + txt(el));
    // In a page, bring it into view (centre, then top: fixed bars sit at the edges) and flag it only if NOTHING reaches it.
    // In the menu panel nothing is scrolled (the menu is not sticky), so a control off screen is skipped.
    // Not tested: a control that takes no pointer (the current page's own link), the open menu category's own summary (the
    // Bookmark sheet covers the bar by design and carries a Close), and one below the fold of its own vertical scroller.
    if (getComputedStyle(el).pointerEvents === "none" || (rootSel && el.tagName === "SUMMARY")) continue;
    const covered = () => {
      const r = el.getBoundingClientRect();
      for (let a = el.parentElement; a && a !== doc; a = a.parentElement) {
        const oy = getComputedStyle(a).overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "hidden") { const ar = a.getBoundingClientRect(); if (r.bottom > ar.bottom + 1 || r.top < ar.top - 1) return null; }
      }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) return null; // off screen: reported as clipped, not here
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === el || el.contains(top) || (el.tagName === "LABEL" && top.control === el)) return "";
      return `${path(top)} at (${Math.round(cx)},${Math.round(cy)})`;
    };
    let c = covered();
    if (!rootSel && c !== "") {
      for (const block of ["center", "start"]) { el.scrollIntoView({ block, inline: "nearest" }); c = covered(); if (c === "") break; }
    }
    if (c) res.overlap.push({ key: "overlap|" + p, msg: `${p} "${txt(el)}" is covered by ${c}` });
  }
  window.scrollTo(0, 0);
  return res;
};

const MUTATIONS = {
  wide: () => { const d = document.createElement("div"); d.textContent = "wide"; d.style.cssText = "width:1200px;height:20px;background:red"; document.body.appendChild(d); },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
const slug = (path) => path.replace(/\?.*$/, "").replace(/\.html$/, "");

async function openAt(path, w, h) {
  const ctx = await newContext(browser, { appLang: LANG === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: REAL_SEED + (path.startsWith("journey-map") ? NOTE_SEED : "") });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const sep = path.includes("?") ? "&" : "?";
  const { page: P } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"));
  await P.waitForTimeout(1000);
  await P.waitForSelector("#zabBar button", { timeout: 4000 }).catch(() => {}); // the Zab bar joins late; measure with it in place
  await P.waitForTimeout(200);
  return { ctx, P };
}

// Self-check is an admin tool page: heading, two buttons and the Zab bar; no shared top menu by design (seen in its 768 screenshot).
const NO_MENU = new Set(["onboarding.html", "accept-invite.html", "admin-self-check.html"]);

// Opened states (round 2): what a reader sees after the first paint.  Each returns a label when the state was reached (the wait is
// for a STATE, never a number of milliseconds), or throws.  The state is then measured like the page.
const NOTE_SEED = `(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d); }, toMillis: function () { return new Date(d).getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteLinks = [];
  DATA.noteFolders.push(Object.assign({ _id: "t1__fA", folderId: "fA", name: "Reflections on Surah Al-Baqarah and the Verse of the Throne", parentFolderId: null, semanticRole: "user", order: 0, status: "active", updatedAt: ts("2024-09-01T10:00:00Z") }, own));
  DATA.notes.push(Object.assign({ _id: "t1__n1", noteId: "n1", title: "What Ayat al-Kursi teaches about the greatness of Allah", bodyHtml: "<p>Hello</p>", currentRevisionId: "r1", status: "active", createdAt: ts("2024-09-03T16:45:00Z"), updatedAt: ts("2024-09-03T16:45:00Z") }, own));
  DATA.noteRevisions.push(Object.assign({ _id: "t1__r1", revisionId: "r1", noteId: "n1", previousRevisionId: null, title: "Note One", bodyHtml: "<p>Hello</p>", revisionReason: "content-update", actorUid: "test-uid", createdAt: new Date("2024-09-03T16:45:00Z") }, own));
  DATA.notePlacements.push(Object.assign({ _id: "t1__p1", placementId: "p1", noteId: "n1", folderId: "fA", order: 0, status: "active" }, own));
})();`;
const STATES = {
  "index.html": [["study menu open", async (P) => {
    await P.click("#tabStudyBtn");
    await P.waitForFunction(() => { const m = document.getElementById("studyPillarMenu"); return m && !m.hidden && m.getBoundingClientRect().height > 0; }, null, { timeout: 8000 });
  }]],
  "journey-map.html": [["a note open in the note pane", async (P) => {
    await P.waitForSelector('.folder-row[data-folder-id="fA"] [data-folder-name]', { state: "visible", timeout: 20000 });
    await P.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await P.waitForSelector("#folderNotes [data-note-id='n1'] [data-note-open]", { state: "visible", timeout: 15000 });
    await P.click("#folderNotes [data-note-id='n1'] [data-note-open]");
    await P.waitForSelector("#notePane [data-pane-title]", { state: "visible", timeout: 15000 });
  }], ["the note's ⋯ menu open", async (P) => {
    await P.click("#notePane [data-pane-menu-btn]");
    await P.waitForSelector("#notePane [data-pane-menu].open", { state: "visible", timeout: 8000 });
  }]],
  "notes.html": [["new-note editor open", async (P) => {
    await P.click("#newNoteBtn");
    await P.waitForFunction(() => document.querySelector("#newNoteBtn")?.style.display === "none" && document.querySelectorAll("textarea, [contenteditable=true]").length > 0, null, { timeout: 8000 });
  }]],
};
// FOUND BY THIS AUDIT, NOT YET FIXED (printed, not failed; an entry that stops occurring is reported so the fix is seen).
// Distinct from an accepted finding: nobody has accepted it. The smallest fix is in docs/reports/2026-10-26-audit-part97-tablet.md.
const KNOWN = [
  // The Zab-button finding on onboarding/accept-invite (round 1) was fixed in v12.72: zab-bar.js resets its own buttons' margin.
  // Round 2 (pages 13-23): small targets under 32px.  Details and the smallest fixes: docs/reports/2026-10-26-audit-part97-tablet.md.
  // The two Landing entries are QR's wheel buttons: drawn 28px / 24px on purpose, each with an invisible 40px tap area
  // (quranrevival.html:854 `.wheel-cta-btn::before`, :1485 `.list-collapse-btn::after`), so they are not faults; the probe measures the drawn box.
  ["index.html", "small|div.wheel-col>div#wheelStageWrap>div#wheelHubPickers>button#wheelCtaBtn"],
  ["index.html", "small|div#wheelPopupView>div#wheelSection>div#wheelListSplitter>button#wheelListCollapseBtn"], // 1024 and 1180, both languages
];
const knownSeen = new Set();
const isKnownFor = (path) => (f, kind = f.key.split("|")[0]) => { const i = KNOWN.findIndex(([p, k]) => path.startsWith(p) && f.key === k); if (i >= 0) knownSeen.add(i); return i >= 0; };

const KINDS = ["sideways", "clipped", "cut", "overlap", "small"];
const pages = selectPages();
if (!pages.length) throw new Error(`--page=${ONLY} matches no page`);

const toRun = pages;
let mutated = false;
for (LANG of LANGS) for (const [name, path, num] of toRun) {
  const tag = LANG === "bn" ? " (bn)" : "";
  console.log(`\n== ${num}. ${name} (${path})${tag} ==`);
  for (const [w, h] of VIEWPORTS) {
    const t0 = Date.now();
    const { ctx, P } = await openAt(path, w, h);
    if (MUTATE && !mutated) { await P.evaluate(MUTATIONS[MUTATE]); await P.waitForTimeout(150); mutated = true; }
    const m = await P.evaluate(MEASURE, null);
    if (!MUTATE) await P.screenshot({ path: `${OUT}/${slug(path)}-${w}x${h}${LANG === "bn" ? "-bn" : ""}.png`, fullPage: false });
    // Onboarding and Accept invite are sign-in-flow pages with no shared top menu by design (they show a heading and a plain
    // "Open the app" link); there the positive control is that the page's own heading rendered and the menu is truly absent.
    if (NO_MENU.has(path.replace(/\?.*$/, ""))) check(`${name} / ${w}: page booted, no shared menu by design (positive control, heading ${m.headings}, menu ${m.menuButtons})`, m.headings > 0 && m.menuButtons === 0);
    else check(`${name} / ${w}: shared menu found (positive control, ${m.menuButtons})`, m.menuButtons > 0);
    if (LANG === "bn") { const bnN = await P.evaluate(() => (document.body.innerText.match(/[ঀ-৿]/g) || []).length); check(`${name} / ${w} (bn): body really contains Bengali script (positive control, ${bnN})`, bnN > 0); }
    check(`${name}${tag} / ${w}: page has controls (positive control, ${m.controls})`, m.controls > 0);
    // v12.72: a broken zab-bar.js (a backtick in its CSS template) stopped the bar mounting and every check above stayed green.
    // So the shared Zab bar is a positive control of its own: its button, the corner 🧰 or a page's own dock must be on screen.
    const zab = await P.evaluate(() => [...document.querySelectorAll("#zabBar button, #zabCorner, .zab-dock-btn")].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }));
    check(`${name} / ${w}: the Zab bar mounted (positive control)`, zab);
    const row = { tag, page: name, path, width: w, viewport: `${w}x${h}`, controls: m.controls, widthShare: m.width, counts: {}, smallOk: m.smallOk.length, findings: {} };
    for (const kind of KINDS) {
      const isKnown = (f) => { const i = KNOWN.findIndex(([p, k]) => path.startsWith(p) && f.key === k); if (i >= 0) knownSeen.add(i); return i >= 0; };
      for (const f of m[kind].filter(isKnown)) console.log(`  KNOWN  ${name} / ${w}: ${f.msg}`);
      const fresh = m[kind].filter((f) => !isKnown(f));
      row.counts[kind] = m[kind].length;
      row.findings[kind] = m[kind].map((f) => f.msg);
      check(`${name}${tag} / ${w}: ${kind} (${m[kind].length}, known ${m[kind].length - fresh.length})`, fresh.length === 0, "\n      " + fresh.slice(0, 8).map((f) => f.msg).join("\n      "));
      if (LIST) for (const f of m[kind]) console.log(`    [${w} ${kind}] ${f.msg}`);
    }
    row.findings.smallOk = m.smallOk.map((f) => f.msg);
    if (LIST) for (const f of m.smallOk) console.log(`    [${w} small, not failing] ${f.msg}`);
    if (w === 1024 && m.width !== null && m.width < 60) console.log(`  NOTE  ${name} / 1024: main column uses ${m.width}% of the viewport`);
    row.seconds = +((Date.now() - t0) / 1000).toFixed(1);

    // Opened states: what the reader sees after the first paint (study menu, a note in the pane, the new-note editor).
    if (!MUTATE) for (const [label, open] of STATES[path.replace(/\?.*$/, "")] || []) {
      let reached = true, why = "";
      try { await open(P); await P.waitForTimeout(300); } catch (e) { reached = false; why = String(e.message || e).split("\n")[0]; }
      check(`${name} / ${w}: state "${label}" reached (positive control)`, reached, why);
      if (!reached) continue;
      const sm = await P.evaluate(MEASURE, null);
      // A dropdown covers what is beneath it by design (the Study menu over the Legend / Unit drawer buttons, seen in its screenshot);
      // those are printed, not counted.  Anything else covered still counts.
      sm.overlap = sm.overlap.filter((f) => { const by = /covered by .*#studyPillarMenu/.test(f.msg); if (by) console.log(`  BY DESIGN  ${name} / ${w} [${label}]: ${f.msg}`); return !by; });
      await P.screenshot({ path: `${OUT}/${slug(path)}-${label.replace(/[^a-z0-9]+/gi, "-")}-${w}x${h}${LANG === "bn" ? "-bn" : ""}.png`, fullPage: false });
      row.states = row.states || {};
      row.states[label] = { controls: sm.controls, counts: {}, smallOk: sm.smallOk.length };
      for (const kind of KINDS) {
        row.states[label].counts[kind] = sm[kind].length;
        const isKnownS = isKnownFor(path), freshS = sm[kind].filter((f) => !isKnownS(f));
        for (const f of sm[kind].filter(isKnownS)) console.log(`  KNOWN  ${name} / ${w} [${label}]: ${f.msg}`);
        check(`${name} / ${w} [${label}]: ${kind} (${sm[kind].length}, known ${sm[kind].length - freshS.length})`, freshS.length === 0, "\n      " + freshS.slice(0, 8).map((f) => f.msg).join("\n      "));
        if (LIST) for (const f of sm[kind]) console.log(`    [${w} ${label} ${kind}] ${f.msg}`);
      }
      if (LIST) for (const f of sm.smallOk) console.log(`    [${w} ${label} small, not failing] ${f.msg}`);
      console.log(`  STATE  ${name} / ${w} [${label}]: controls ${sm.controls}, ${KINDS.map((k) => sm[k].length).join("/")} [${sm.smallOk.length}]`);
    }

    // The shared top menu: once, on classes.html, at each width.
    if (path === "classes.html" && !MUTATE) {
      const menu = { cats: 0, findings: {} };
      const n = await P.evaluate(() => document.querySelectorAll("details.nav-cat").length);
      menu.cats = n;
      check(`menu / ${w}: categories found (positive control, ${n})`, n > 0);
      for (let i = 0; i < n; i++) {
        await P.evaluate((i) => { document.querySelectorAll("details.nav-cat").forEach((d, j) => { d.open = j === i; }); }, i);
        await P.waitForTimeout(150);
        const label = await P.evaluate((i) => document.querySelectorAll("details.nav-cat")[i].querySelector("summary").textContent.trim(), i);
        const mm = await P.evaluate((i) => { document.querySelectorAll("details.nav-cat")[i].setAttribute("data-tablet-menu", "1"); return true; }, i);
        const mr = await P.evaluate(MEASURE, "details.nav-cat[data-tablet-menu]");
        await P.evaluate(() => document.querySelectorAll("details.nav-cat[data-tablet-menu]").forEach((d) => d.removeAttribute("data-tablet-menu")));
        if (i === 0 || label) await P.screenshot({ path: `${OUT}/menu-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${w}x${h}${LANG === "bn" ? "-bn" : ""}.png` });
        check(`menu "${label}" / ${w}: opens with controls (${mr.controls})`, mm && mr.controls > 0);
        for (const kind of ["clipped", "cut", "overlap", "small"]) {
          menu.findings[`${label}|${kind}`] = mr[kind].map((f) => f.msg);
          check(`menu "${label}" / ${w}: ${kind} (${mr[kind].length})`, mr[kind].length === 0, "\n      " + mr[kind].slice(0, 8).map((f) => f.msg).join("\n      "));
          if (LIST) for (const f of mr[kind]) console.log(`    [menu ${label} ${w} ${kind}] ${f.msg}`);
        }
      }
      row.menu = menu;
    }
    await ctx.close();
    rows.push(row);
  }
}
if (!MUTATE && !ONLY) fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
console.log("\n=== per page and width: sideways/clipped/cut/overlap/small (small 32-39 in brackets), controls, main column %, seconds ===");
for (const r of rows) console.log(`${(r.page + r.tag).padEnd(24)} ${String(r.width).padStart(4)}  ${r.counts.sideways}/${r.counts.clipped}/${r.counts.cut}/${r.counts.overlap}/${r.counts.small} [${r.smallOk}]  controls ${r.controls}  col ${r.widthShare}%  ${r.seconds}s`);
for (const [i, [p, k, only]] of KNOWN.entries()) if (!MUTATE && !knownSeen.has(i) && (!only || LANGS.includes(only)) && toRun.some(([, path]) => path.startsWith(p))) console.log(`  NOTE  known finding no longer occurs (fixed? remove the entry): ${p} ${k}`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}${LANGS.length === 1 && LANGS[0] === "bn" ? " (Bangla)" : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
