// Audit part 126 (PCF MSA J29, issue #1300): REAL-LENGTH data on the shared tools. Part 92 measured Bangla fit with short
// fixture names; here Bookmarks, Records, Notes, Mapping My Journey and Monitor are opened at 360, 390, 768 and 1280, in
// English and Bangla, with long people / folder / bookmark / note names (seeded HERE through extraSeedJs, never in app data):
//   overflow  the page scrolls sideways, or a visible element ends past the screen / past a clipping ancestor
//   cut       text cut with text-overflow:ellipsis (or a clipped box) where the full text is nowhere else (no title, no wrap)
//   small     a visible button / link / select / input under 40px tall (reported; counted only with --strict-small)
//   select    a <select> whose chosen option is cut (probe carries the select's computed font, padding, border, box-sizing; w > 0)
//   overlap   two visible interactive neighbours whose boxes intersect
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/shared-tools-long-names-browser.mjs
//   --page=<file>  one page   --list  print every finding   --verbose  print passes   --shots  save 360px bn screenshots
//   --mutate=<name> puts the old CSS back; the matching check must FAIL (see MUTATIONS)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("page"), MUTATE = arg("mutate"), LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots");
const OUT = "tools/i18n-verify/out/long-names";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = ["bookmarks.html", "records.html", "notes.html", "journey-map.html", "monitor.html"];
const WIDTHS = [[360, 740], [390, 844], [768, 1024], [1280, 900]];

// Real-length values, built in the page so the language can pick the Bangla side.
const LONG_SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var bn = (window.localStorage && localStorage.getItem("appLang") === "bn") || /appLang=bn/.test(document.cookie);
  DATA.tenants[0].name = "Madrasatul Muslimeen (Owner, Prime)";
  DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Fatima Zahra আব্দুর রহমান Al-Hashimi", "ফাতিমা জাহরা আব্দুর রহমান আল-হাশিমী"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
  var folders = [], saved = [];
  for (var i = 0; i < 12; i++) folders.push({ id: "bf" + i, name: "Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah " + (i + 1), parentId: i > 0 && i % 3 === 0 ? "bf" + (i - 1) : null, personTagId: null, removed: false, createdAt: "2026-01-01T00:00:00.000Z" });
  for (var j = 0; j < 40; j++) saved.push({ id: "b" + j, programId: "none", moduleId: "quranrevival", subjectId: "quran", name: "Ayat al-Kursi with tajweed practice (morning) — repetition set " + (j + 1) + " of forty", position: "ayah:2:" + (255 - (j % 5)), folderId: j % 4 === 0 ? "bf" + (j % 12) : null, removed: false, settings: { unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir", tajweedOn: true, wbwOn: false, rootsOn: false, mushafOn: false }, createdAt: "2026-01-01T00:00:00.000Z" });
  DATA.bookmarks[0].folders = folders; DATA.bookmarks[0].saved = saved;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  var parent = null;
  for (var d = 0; d < 4; d++) { DATA.noteFolders.push(Object.assign({ _id: "t1__nf" + d, folderId: "nf" + d, name: "Level " + (d + 1) + " — Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah", parentFolderId: parent, semanticRole: "user", order: d, status: "active", updatedAt: ts() }, own)); parent = "nf" + d; }
  for (var k = 0; k < 30; k++) {
    DATA.notes.push(Object.assign({ _id: "t1__nn" + k, noteId: "nn" + k, title: "Reflections on the Throne Verse and what it teaches about trust in Allah, part " + (k + 1), bodyHtml: "<p>Body " + k + "</p>", currentRevisionId: "rev-nn" + k, status: "active", createdAt: ts(), updatedAt: ts() }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__ns" + k, sourceLinkId: "ns" + k, noteId: "nn" + k, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdBy: "test-uid" }, own));
    DATA.notePlacements.push(Object.assign({ _id: "t1__np" + k, placementId: "np" + k, noteId: "nn" + k, folderId: "nf" + (k % 4), order: k, status: "active" }, own));
  }
})();`;

const MEASURE = () => {
  const W = document.documentElement.clientWidth;
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
  const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
  const res = { overflow: [], cut: [], small: [], select: [], overlap: [] };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(el.tagName) && vis(el));

  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) res.overflow.push({ key: "overflow|page", msg: `page scrolls sideways: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}` });
  const offenders = new Set();
  for (const el of all) {
    if (getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().left >= W) continue;
    const r = el.getBoundingClientRect();
    let bad = "", boundary = false;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === "hidden" || ox === "clip") { const ar = a.getBoundingClientRect(); if (r.right > ar.right + 1 && ar.width > 0) bad = `ends at ${Math.round(r.right)} past ${path(a)} (clips at ${Math.round(ar.right)})`; boundary = true; break; }
      if (ox === "auto" || ox === "scroll") { boundary = true; break; }
    }
    if (!bad && !boundary && r.right > W + 1) bad = `ends at ${Math.round(r.right)} past the ${W}px screen`;
    if (bad) { offenders.add(el); el.__ovMsg = bad; }
  }
  for (const el of offenders) {
    let p = el.parentElement, nested = false; while (p) { if (offenders.has(p)) { nested = true; break; } p = p.parentElement; }
    if (!nested) res.overflow.push({ key: "overflow|" + path(el), msg: `${path(el)} "${txt(el)}" ${el.__ovMsg}` });
  }

  // cut: ellipsis / clipped, with no title and no aria-label carrying the full text
  for (const el of all) {
    if (el.tagName === "SELECT") continue;
    const cs = getComputedStyle(el), w = el.clientWidth;
    if (w <= 0) continue;
    const ellipsis = cs.textOverflow === "ellipsis";
    const clipping = cs.overflowX === "hidden" || cs.overflowX === "clip";
    if (!(ellipsis || clipping) || el.scrollWidth <= w + 1) continue;
    if (!txt(el)) continue;
    const full = (el.getAttribute("title") || el.closest("[title]")?.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (full && (full.includes(t.slice(0, 30)) || t.includes(full.slice(0, 30)))) continue; // the full text is available in a title
    res.cut.push({ key: "cut|" + path(el), msg: `${path(el)} "${txt(el)}" needs ${el.scrollWidth}px, has ${w}px, no title` });
  }

  // small controls
  for (const el of all) {
    if (!el.matches("button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button], summary")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "inline") continue;
    const r = el.getBoundingClientRect();
    if (r.height < 40 && (txt(el) || el.tagName !== "A")) res.small.push({ key: "small|" + path(el), msg: `${path(el)} "${txt(el)}" is ${Math.round(r.height)}px tall` });
  }

  // selects: is the chosen option cut?
  for (const el of all) {
    if (el.tagName !== "SELECT") continue;
    const cs = getComputedStyle(el), opt = el.options[el.selectedIndex];
    if (!opt) continue;
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};padding:0;border:0;box-sizing:content-box`;
    probe.textContent = opt.textContent;
    document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().width;
    probe.remove();
    const inner = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) - 20; // 20px: the arrow
    const w = el.getBoundingClientRect().width;
    if (w > 0 && need > inner + 1 && !(el.title && el.title.includes(opt.textContent.trim().slice(0, 20)))) res.select.push({ key: "select|" + path(el), msg: `${path(el)} chosen "${opt.textContent.trim().slice(0, 40)}" needs ${Math.round(need)}px, has ${Math.round(inner)}px` });
  }

  // overlap between interactive neighbours (siblings only, to skip legitimate nesting)
  const ctl = all.filter((e) => e.matches("button, a[href], select, input:not([type=hidden]), summary") && getComputedStyle(e).position !== "fixed");
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
    const a = ctl[i], b = ctl[j];
    if (a.contains(b) || b.contains(a) || a.parentElement !== b.parentElement) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) res.overlap.push({ key: "overlap|" + path(a) + "|" + path(b), msg: `${path(a)} "${txt(a)}" overlaps ${path(b)} "${txt(b)}" by ${Math.round(ox)}x${Math.round(oy)}` });
  }
  return res;
};

// Each mutation puts a fix's old behaviour back; the named kind must then fail.
const MUTATIONS = {
  overflow: () => { const s = document.createElement("span"); s.textContent = "Tafsir notes from Shaykh's Ramadan halaqah 2026 ".repeat(5); s.style.cssText = "display:inline-block;white-space:nowrap"; (document.querySelector("main") || document.body).appendChild(s); },
  cut: () => { const s = document.createElement("div"); s.textContent = "Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah, a name that is far too long for one line"; s.style.cssText = "width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"; document.body.appendChild(s); },
  notitle: () => document.querySelectorAll("select[data-bm-move], select[data-folder-move]").forEach((s) => s.removeAttribute("title")), // the bookmarks fix put back as it was
  select: () => { const s = document.createElement("select"); s.style.cssText = "width:70px"; s.innerHTML = "<option>Madrasatul Muslimeen (Owner, Prime)</option>"; document.body.appendChild(s); },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];

async function measure(path, w, h, lang, { seed = LONG_SEED } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: seed });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const url = path === "notes.html" ? "notes.html?unit=ayah:2:255&label=Ayat%20al-Kursi%20with%20tajweed%20practice%20(morning)&navBack=1" : path + "?navBack=1";
  const { page: P } = await openPage(ctx, "/app/" + url);
  await P.waitForTimeout(1200);
  if (path === "journey-map.html") { // open every nested folder so the 4-deep long names are on screen
    for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(250); }
  }
  if (MUTATE) { await P.evaluate(MUTATIONS[MUTATE]); await P.waitForTimeout(100); }
  const long = await P.evaluate(() => document.body.innerText.length);
  if (SHOTS && lang === "bn" && w === 360) await P.screenshot({ path: `${OUT}/${path.replace(/\.html$/, "")}-360-bn.png`, fullPage: true });
  const m = await P.evaluate(MEASURE);
  await ctx.close();
  return { m, long };
}

const KINDS = ["overflow", "cut", "select", "overlap"]; // counted; "small" is reported
for (const path of PAGES) {
  if (ONLY && path !== ONLY) continue;
  console.log(`\n== ${path} ==`);
  for (const [w, h] of WIDTHS) for (const lang of ["en", "bn"]) {
    const { m, long } = await measure(path, w, h, lang);
    check(`${path} / ${w} / ${lang}: page rendered text (positive control)`, long > 40);
    for (const kind of KINDS) check(`${path} / ${w} / ${lang}: ${kind} (${m[kind].length})`, m[kind].length === 0, "\n      " + m[kind].slice(0, 6).map((f) => f.msg).join("\n      "));
    console.log(`  info  ${path} ${w} ${lang}: small controls under 40px = ${m.small.length}`);
    if (LIST) for (const kind of [...KINDS, "small"]) for (const f of m[kind]) console.log(`    [${w} ${lang} ${kind}] ${f.msg}`);
    rows.push({ path, w, lang, counts: Object.fromEntries([...KINDS, "small"].map((k) => [k, m[k].length])), findings: m });
  }
}

// Positive control: the fixture's SHORT names fit, so the checks are able to pass on the same pages.
if (!MUTATE && !ONLY) {
  const { m } = await measure("bookmarks.html", 360, 740, "en", { seed: "" });
  check("positive control: short fixture names on bookmarks.html at 360 have no overflow", m.overflow.length === 0, m.overflow.map((f) => f.msg).join("; "));
  check("positive control: short fixture names have no cut text", m.cut.length === 0, m.cut.map((f) => f.msg).join("; "));
}
if (!MUTATE && !ONLY) fs.writeFileSync(`${OUT}/rows.json`, JSON.stringify(rows, null, 1));
console.log("\n=== counts (overflow/cut/select/overlap, small) ===");
for (const r of rows) console.log(`${r.path.padEnd(18)} ${String(r.w).padStart(4)} ${r.lang}  ${KINDS.map((k) => r.counts[k]).join("/")}  small ${r.counts.small}`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
