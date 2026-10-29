// Audit part 131 (PCF MSA J29, issue #1318): the 23 shared pages with the phone's text made LARGER. Every earlier check ran at the
// default 16px. Here each page is opened once per width (360, 390, 768) and language (en, bn) with REAL-LENGTH data (the part-126
// seed: a ~35-character Bangla person name, long folder / bookmark / note names), measured at 100%, then
// document.documentElement.style.fontSize is set to 150% and measured, then 200% and measured. The page list is the 23 pages of
// shared-pages-bangla-layout-audit-browser.mjs (audit part 92), which tools/i18n-verify/shared-pages-keyboard-audit-browser.mjs
// first listed; the seed is shared-tools-long-names-browser.mjs's (audit part 126); the reach method is floating-overlays-reach-browser.mjs's.
// Per page / width / language / size it records:
//   cut       text cut by an ellipsis or a clipping box where the full text is nowhere else (no title)
//   overlap   two visible, non-nested, non-fixed interactive controls whose boxes intersect
//   offscreen a control whose right edge is past the screen (or left edge before it) with no scrolling/clipping ancestor, so it cannot be reached
//   sideways  the page itself scrolls sideways (reported: it is reachable, but it is a layout defect on a phone)
//   small     a visible button / link / select / input under 36px tall
//   reach     a control that elementFromPoint never returns at any scroll stop (the floating <- X pill or the toolbox covers it); pill shown via ?navBack=1
//   fixedpx   text elements whose computed font-size did NOT grow with the root (fixed px: they will not grow on a phone either)
// DEFECTS ARE PRINTED AS "INFO" LINES AND ARE NOT FAILURES. The CHECKS are (1) a positive control per kind, proven at 100% on injected
// elements that are correct by construction, and (2) CHECKED_KINDS, the kinds that were measured at zero on every page at 150% and must stay so.
// Run from the repository root with node serve.js on 8080:  node tools/i18n-verify/large-text-shared-pages-browser.mjs
//   --pages=a.html,b.html   a subset   --no-reach  skip the reach pass   --list  print every finding   --verbose  print passes
//   --shots  save 200% screenshots (360, bn) to tools/i18n-verify/out/large-text/   --sizes=100,150  only some sizes
//   --mutate=<name>  puts a defect in; the matching check must FAIL (cut, overlap, offscreen; the small and fixedpx kinds are INFO only, proven by their positive controls)
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; if (process.argv.includes("--verbose")) console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = arg("mutate"), LIST = process.argv.includes("--list"), SHOTS = process.argv.includes("--shots"), NO_REACH = process.argv.includes("--no-reach");
const OUT = "tools/i18n-verify/out/large-text";
fs.mkdirSync(OUT, { recursive: true });

const ALL_PAGES = [
  "classes.html", "course-offers.html", "curriculum.html", "backup.html", "import-notes.html", "dawah.html", "onboarding.html",
  "accept-invite.html?token=not-a-real-link", "monitor.html", "homework.html", "people.html", "records.html", "catalogue.html",
  "about.html", "bookmarks.html", "hadith-collections.html", "index.html", "notes.html", "journey-map.html", "deen-study.html",
  "arabic-study.html", "admin-self-check.html", "taglines.html",
];
const PAGES = arg("pages") ? arg("pages").split(",") : ALL_PAGES;
const WIDTHS = [[360, 740], [390, 844], [768, 1024]];
const SIZES = (arg("sizes") || "100,150,200").split(",").map(Number);
const KINDS = ["cut", "overlap", "offscreen", "sideways", "small", "fixedpx"];
// Kinds measured at ZERO on every one of the 23 pages at 150% (all widths, both languages): these must stay zero. Filled in from the run.
// Per kind, the pages measured at ZERO at 150% across all 3 widths x 2 languages (measured 30 Oct 2026, report audit-part131). The rest print INFO.
const CHECKED_KINDS = {
  cut: ["course-offers", "backup", "import-notes", "dawah", "onboarding", "accept-invite", "monitor", "records", "catalogue", "about", "hadith-collections", "notes", "journey-map", "admin-self-check"],
  overlap: ["classes", "import-notes", "dawah", "onboarding", "accept-invite", "monitor", "catalogue", "about", "records", "deen-study", "arabic-study", "admin-self-check"],
  offscreen: ["classes", "course-offers", "backup", "import-notes", "dawah", "onboarding", "accept-invite", "monitor", "homework", "people", "catalogue", "about", "bookmarks", "notes", "journey-map", "deen-study", "arabic-study", "admin-self-check", "taglines"],
  sideways: ["classes", "course-offers", "backup", "import-notes", "dawah", "accept-invite", "monitor", "homework", "people", "catalogue", "bookmarks", "notes", "journey-map", "deen-study", "arabic-study", "admin-self-check", "taglines"],
};

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  DATA.tenants[0].name = lang("Madrasatul Muslimeen (Owner, Prime)", "মাদরাসাতুল মুসলিমীন (মালিক, প্রাইম)");
  DATA.tenantPeople[0].name = lang("Muhammad Abdur-Rahman ibn Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople[1].name = lang("Maryam bint Abdullah Al-Hashimi", "মুহাম্মদ আব্দুল্লাহ আল-মামুন চৌধুরী");
  DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: lang("Fatima Zahra আব্দুর রহমান Al-Hashimi", "ফাতিমা জাহরা আব্দুর রহমান আল-হাশিমী"), managedByPersonId: "p1", isMinor: true, roles: ["student"] });
  if (DATA.trackables && DATA.trackables[0]) DATA.trackables[0].name = lang("Reading (with Tajweed)");
  if (DATA.classes && DATA.classes[0]) DATA.classes[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
  if (DATA.courseOffers && DATA.courseOffers[0]) DATA.courseOffers[0].name = lang("Weekend Qur'an Memorisation and Tajweed Circle (Year 7–9)");
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

// Runs in the page. `baseline` is the list of font sizes (by element index) at 100%, or null on the first pass.
const MEASURE = ({ baseline, baselineRoot, minH }) => {
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
  const txt = (el) => (el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const res = { cut: [], overlap: [], offscreen: [], sideways: [], small: [], fixedpx: [], fontSizes: [] };
  const all = [...document.body.querySelectorAll("*")].filter((el) => !/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEMPLATE|NOSCRIPT)$/i.test(el.tagName) && vis(el));
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) res.sideways.push({ key: "sideways|page", msg: `page scrolls sideways: scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}` });

  // cut
  for (const el of all) {
    if (el.tagName === "SELECT") continue;
    const cs = getComputedStyle(el), w = el.clientWidth;
    if (w <= 0) continue;
    const ellipsis = cs.textOverflow === "ellipsis", clipping = cs.overflowX === "hidden" || cs.overflowX === "clip";
    if (!(ellipsis || clipping) || el.scrollWidth <= w + 1) continue;
    if (!txt(el)) continue;
    const full = (el.getAttribute("title") || el.closest("[title]")?.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (full && (full.includes(t.slice(0, 30)) || t.includes(full.slice(0, 30)))) continue;
    res.cut.push({ key: "cut|" + path(el), msg: `${path(el)} "${txt(el)}" needs ${el.scrollWidth}px, has ${w}px, no title` });
  }
  // a select whose chosen option is cut counts as cut too
  for (const el of all) {
    if (el.tagName !== "SELECT") continue;
    const cs = getComputedStyle(el), opt = el.options[el.selectedIndex];
    if (!opt) continue;
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};padding:0;border:0;box-sizing:content-box`;
    probe.textContent = opt.textContent; document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().width; probe.remove();
    const w = el.getBoundingClientRect().width;
    const inner = w - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth) - 20;
    if (w > 0 && need > inner + 1 && !(el.title && el.title.includes(opt.textContent.trim().slice(0, 20)))) res.cut.push({ key: "cut|" + path(el), msg: `select ${path(el)} chosen "${opt.textContent.trim().slice(0, 30)}" needs ${Math.round(need)}px, has ${Math.round(inner)}px` });
  }

  // offscreen: past the screen with no scrolling/clipping ancestor (a clipping ancestor with the control past its edge also hides it)
  const sel = "button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary";
  const ctlAll = all.filter((e) => e.matches(sel));
  for (const el of ctlAll) {
    if (getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    let hidden = "", scroller = false;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === "auto" || ox === "scroll") { scroller = true; break; }
      if (ox === "hidden" || ox === "clip") { const ar = a.getBoundingClientRect(); if (ar.width > 0 && (r.right > ar.right + 1 || r.left < ar.left - 1)) hidden = `ends ${Math.round(r.right)} / starts ${Math.round(r.left)} outside clipping ${path(a)} (${Math.round(ar.left)}..${Math.round(ar.right)})`; scroller = true; break; }
    }
    if (!hidden && !scroller && (r.right > W + 1 || r.left < -1)) hidden = `spans ${Math.round(r.left)}..${Math.round(r.right)} on a ${W}px screen`;
    if (hidden && !res.sideways.length) res.offscreen.push({ key: "offscreen|" + path(el), msg: `${path(el)} "${txt(el)}" ${hidden}, page does not scroll sideways` });
    else if (hidden) res.offscreen.push({ key: "offscreen-reachable|" + path(el), msg: `(reachable only by sideways page scroll) ${path(el)} "${txt(el)}" ${hidden}` });
  }

  // small
  for (const el of ctlAll) {
    const cs = getComputedStyle(el);
    if (cs.display === "inline" || getComputedStyle(el).position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.height < minH && (txt(el) || el.tagName !== "A")) res.small.push({ key: "small|" + path(el), msg: `${path(el)} "${txt(el)}" is ${Math.round(r.height)}px tall` });
  }

  // overlap: any two non-nested, non-fixed controls whose boxes intersect
  const ctl = ctlAll.filter((e) => getComputedStyle(e).position !== "fixed");
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) {
    const a = ctl[i], b = ctl[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) res.overlap.push({ key: "overlap|" + path(a) + "|" + path(b), msg: `${path(a)} "${txt(a)}" overlaps ${path(b)} "${txt(b)}" by ${Math.round(ox)}x${Math.round(oy)}` });
  }

  // fixed px: elements with their own text node whose font-size is the same at this root size as at 100%
  const withText = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  res.fontSizes = withText.map((el) => parseFloat(getComputedStyle(el).fontSize));
  if (baseline && baseline.length === res.fontSizes.length) {
    const rootNow = parseFloat(getComputedStyle(doc).fontSize), rootBase = baselineRoot;
    const want = rootNow / rootBase;
    let stuck = 0;
    const samples = [];
    withText.forEach((el, i) => {
      const was = baseline[i];
      if (res.fontSizes[i] < was * (1 + (want - 1) * 0.5)) { stuck++; if (samples.length < 4) samples.push(`${path(el)} "${txt(el)}" ${was}px -> ${res.fontSizes[i]}px`); }
    });
    if (stuck) res.fixedpx.push({ key: "fixedpx|total", msg: `${stuck} of ${withText.length} text elements did not grow (e.g. ${samples.join("; ")})`, stuck, total: withText.length });
  }
  res.textCount = withText.length;
  res.rootSize = parseFloat(getComputedStyle(doc).fontSize);
  return res;
};

// Reach pass: for every visible control, some scroll stop must have elementFromPoint return it. Run with the pill (?navBack=1).
const REACH = async () => {
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
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "")) + ` "${(el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
  const pill = document.querySelector("[data-bm-back]");
  const controls = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), textarea, [role=button], summary")].filter((el) => vis(el) && getComputedStyle(el).position !== "fixed");
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const stops = [];
  for (let y = 0; y < maxY(); y += Math.max(100, Math.floor(innerHeight / 2))) stops.push(y);
  stops.push(maxY());
  const state = new Map(controls.map((el) => [el, false]));
  for (const y of stops) {
    scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const el of controls) {
      let r = el.getBoundingClientRect();
      if (r.left + r.width / 2 > innerWidth || r.left + r.width / 2 < 0) {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const ox = getComputedStyle(a).overflowX;
          if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) { a.scrollLeft += r.left + r.width / 2 - innerWidth / 2; break; }
        }
        r = el.getBoundingClientRect();
      }
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy);
      if (hit && (hit === el || el.contains(hit))) state.set(el, true);
    }
  }
  scrollTo(0, 0);
  return { pillShown: !!(pill && vis(pill)), n: controls.length, unreachable: [...state].filter(([, ok]) => !ok).map(([el]) => name(el)) };
};

// Positive controls: injected elements that are correct (defective) by construction, measured at 100%.
const INJECT = () => {
  const host = document.createElement("div");
  host.id = "__inject"; host.style.cssText = "position:relative;width:100%";
  const mk = (tag, text, css) => { const e = document.createElement(tag); e.textContent = text; e.style.cssText = css; host.appendChild(e); return e; };
  mk("button", "Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah, far too long for this box", "display:block;width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap");
  const a = mk("button", "overlap A", "position:absolute;left:10px;top:60px;width:100px;height:44px");
  const b = mk("button", "overlap B", "position:absolute;left:50px;top:70px;width:100px;height:44px");
  mk("button", "tiny", "display:block;height:20px;margin-top:120px");
  mk("button", "far right", "position:absolute;left:" + (document.documentElement.clientWidth + 200) + "px;top:0;width:80px;height:44px");
  mk("p", "fixed px text", "font-size:13px;margin:0");
  mk("p", "rem text", "font-size:1rem;margin:0");
  void a; void b;
  document.body.appendChild(host);
  document.documentElement.style.overflowX = "hidden"; // so the far-right button is NOT reachable by a sideways page scroll
};

const MUTATIONS = {
  cut: () => { const s = document.createElement("button"); s.textContent = "A name that is far too long to fit one line in this narrow box at any size at all"; s.style.cssText = "width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"; document.body.appendChild(s); },
  overlap: () => { for (const [l, t] of [[10, 0], [40, 10]]) { const s = document.createElement("button"); s.textContent = "ov"; s.style.cssText = `position:absolute;left:${l}px;top:${t}px;width:90px;height:44px`; document.body.appendChild(s); } },
  offscreen: () => { const s = document.createElement("button"); s.textContent = "off"; s.style.cssText = "position:absolute;left:" + (document.documentElement.clientWidth + 300) + "px;top:0;width:80px;height:44px"; document.body.appendChild(s); document.documentElement.style.overflowX = "hidden"; },
  small: () => { const s = document.createElement("button"); s.textContent = "tiny"; s.style.cssText = "display:block;height:18px"; document.body.appendChild(s); },
  fixedpx: () => { document.body.insertAdjacentHTML("beforeend", "<style>body *{font-size:11px!important}</style>"); },
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`unknown --mutate=${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
const reachRows = [];
const urlFor = (pg, pill) => "/app/" + pg + (pill ? (pg.includes("?") ? "&" : "?") + "navBack=1" : "") ;
const setRoot = (P, pct) => P.evaluate((p) => { document.documentElement.style.fontSize = p + "%"; }, pct);

// ---- positive controls at 100% (the measurement must be able to see each defect) ----
{
  const ctx = await newContext(browser, { banner: false, viewport: { width: 360, height: 740 } });
  const { page: P } = await openPage(ctx, "/app/about.html");
  await P.waitForTimeout(800);
  const clean = await P.evaluate(MEASURE, { baseline: null, minH: 36 });
  await P.evaluate(INJECT);
  await P.waitForTimeout(100);
  const base = await P.evaluate(MEASURE, { baseline: null, minH: 36 });
  const bl = base.fontSizes;
  await setRoot(P, 150);
  await P.waitForTimeout(150);
  const big = await P.evaluate(MEASURE, { baseline: bl, baselineRoot: base.rootSize, minH: 36 });
  const newOf = (kind, tag) => base[kind].filter((f) => f.msg.includes(tag)).length;
  check("positive control (100%): an injected over-long ellipsis button measures as CUT", newOf("cut", "far too long") + base.cut.filter((f) => f.msg.includes("Tafsir")).length >= 1, JSON.stringify(base.cut.slice(0, 3)));
  check("positive control (100%): two injected overlapping buttons measure as OVERLAP", base.overlap.some((f) => f.msg.includes("overlap A") && f.msg.includes("overlap B")), JSON.stringify(base.overlap.slice(0, 3)));
  check("positive control (100%): an injected 20px button measures as SMALL", base.small.some((f) => f.msg.includes("tiny")), JSON.stringify(base.small.slice(0, 3)));
  check("positive control (100%): an injected button past the right edge measures as OFFSCREEN", base.offscreen.some((f) => f.msg.includes("far right")), JSON.stringify(base.offscreen.slice(0, 3)));
  check("positive control (100%): the same page WITHOUT the injection has none of those", clean.cut.length + clean.overlap.length + clean.offscreen.length === 0 && !clean.small.some((f) => f.msg.includes("tiny")), JSON.stringify([clean.cut, clean.overlap, clean.offscreen]));
  check("positive control (150%): the root font-size really became 24px", big.rootSize === 24, `root ${big.rootSize}`);
  check("positive control (150%): an injected fixed-px text element is reported as NOT growing", big.fixedpx.length === 1 && /fixed px text/.test(big.fixedpx[0].msg), JSON.stringify(big.fixedpx));
  check("positive control (150%): an injected rem text element is NOT in the not-growing list", !big.fixedpx.some((f) => /rem text/.test(f.msg)), JSON.stringify(big.fixedpx));
  await ctx.close();
}

// ---- the sweep ----
for (const pg of PAGES) {
  console.log(`\n== ${pg} ==`);
  for (const [w, h] of WIDTHS) for (const lang of ["en", "bn"]) {
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const url = pg === "notes.html" ? "/app/notes.html?unit=ayah:2:255&label=Ayat%20al-Kursi%20with%20tajweed%20practice%20(morning)" : urlFor(pg, false);
    const { page: P } = await openPage(ctx, url);
    await P.waitForTimeout(1000);
    if (pg === "journey-map.html") for (let i = 0; i < 6; i++) { await P.evaluate(() => document.querySelectorAll("[data-folder-toggle][aria-expanded=false]").forEach((b) => b.click())); await P.waitForTimeout(200); }
    if (MUTATE) { await P.evaluate(MUTATIONS[MUTATE]); await P.waitForTimeout(100); }
    const textLen = await P.evaluate(() => document.body.innerText.length);
    check(`${pg} / ${w} / ${lang}: page rendered text (positive control)`, textLen > 20, `innerText length ${textLen}`);
    let baseline = null, baselineRoot = 16;
    const bySize = {};
    for (const pct of SIZES) {
      await setRoot(P, pct);
      await P.waitForTimeout(250);
      const m = await P.evaluate(MEASURE, { baseline, baselineRoot, minH: 36 });
      if (pct === 100) { baseline = m.fontSizes; baselineRoot = m.rootSize; }
      bySize[pct] = m;
      if (SHOTS && lang === "bn" && w === 360 && pct === 200) await P.screenshot({ path: `${OUT}/${pg.replace(/[.?=].*$/, "")}-360-bn-200.png`, fullPage: true });
      const counts = Object.fromEntries(KINDS.map((k) => [k, m[k].length]));
      rows.push({ pg, w, lang, pct, counts, findings: Object.fromEntries(KINDS.map((k) => [k, m[k].map((f) => f.msg)])) });
      if (LIST) console.log(`  info  ${pg} ${w} ${lang} ${pct}%: ${KINDS.map((k) => k + " " + counts[k]).join(", ")}`);
      for (const k of KINDS) { const base100 = new Set((bySize[100]?.[k] || []).map((f) => f.key)); for (const f of m[k]) if ((pct === 100 ? LIST : !base100.has(f.key)) && !(k === "fixedpx" && f.stuck === 1 && /zab/i.test(f.msg) && !LIST)) console.log(`    INFO [${pg} ${w} ${lang} ${pct}% ${k}${pct !== 100 ? " NEW" : ""}] ${f.msg.slice(0, 230)}`); }
      if (pct === 150) for (const k of Object.keys(CHECKED_KINDS)) if (CHECKED_KINDS[k].includes(pg.replace(/\.html.*$/, ""))) check(`${pg} / ${w} / ${lang} / 150%: no ${k}`, m[k].length === 0, "\n      " + m[k].slice(0, 5).map((f) => f.msg).join("\n      "));
    }
    await ctx.close();

    if (!NO_REACH && !MUTATE) for (const pct of SIZES.filter((s) => s > 100)) {
      const c2 = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h }, extraSeedJs: SEED });
      await c2.route("**/archive.org/**", (r) => r.abort());
      const { page: Q } = await openPage(c2, pg === "notes.html" ? "/app/notes.html?unit=ayah:2:255&navBack=1" : urlFor(pg, true));
      await Q.waitForTimeout(800);
      await setRoot(Q, pct);
      await Q.waitForTimeout(250);
      const r = await Q.evaluate(REACH);
      reachRows.push({ pg, w, lang, pct, ...r });
      if (r.unreachable.length) console.log(`  info  ${pg} ${w} ${lang} ${pct}% REACH: ${r.unreachable.length} control(s) never reachable with the pill${r.pillShown ? "" : " (pill not shown)"}: ${r.unreachable.slice(0, 5).join(" | ")}`);
      await c2.close();
    }
  }
}
if (!MUTATE) { fs.writeFileSync(`${OUT}/rows${arg("tag") ? "-" + arg("tag") : ""}.json`, JSON.stringify({ rows, reachRows }, null, 1)); }

console.log("\n=== summary: pages x (findings at 100 / 150 / 200), per kind, summed over widths and languages ===");
for (const pg of PAGES) {
  const parts = KINDS.map((k) => k + " " + SIZES.map((s) => rows.filter((r) => r.pg === pg && r.pct === s).reduce((n, r) => n + r.counts[k], 0)).join("/"));
  console.log(`${pg.padEnd(40)} ${parts.join("  ")}`);
}
console.log(`\nINFO: reach pass found ${reachRows.filter((r) => r.unreachable.length).length} page/width/language/size combinations with a never-reachable control (of ${reachRows.length}).`);
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
await browser.close();
process.exit(fail ? 1 : 0);
