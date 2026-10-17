// Audit part 34 (PCF MSA J29): keyboard leftovers from part 33, and WCAG 1.4.12 text spacing on MSA pages.
//   control   each detector finds a seeded defect (a box that cuts its text, a pane that traps Tab, a backwards Tab stop, an invisible focus)
//   pane      journey-map.html: open a note in the Notes pane (#notePane); Tab leaves it within its own stops + 5
//   bmmenu    the opened Bookmark menu: every stop shows a visible focus (3:1), Escape closes it and returns focus to its button
//   order     Tab never goes backwards within one visual row: nav row, the page ⋯ menu, a Records row
//   spacing   the WCAG 1.4.12 stylesheet injected on every MSA page, plus the opened nav, ⋯ menu, Zab corner, Note window, bookmark dialog:
//             no cut text, no overlapping controls, controls 40px tall, no sideways scroll
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part34-keyboard-spacing-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]
const MUTATIONS = {
  // each puts a fix back to the old behaviour and must fail the suite where the defect shows
  arlang: ["app/js/hadith-browser.js", "**/js/hadith-browser.js", '  arNotice.setAttribute("lang", "ar");', "", "/hadith-"],
  optlang: ["app/js/hadith-browser.js", "**/js/hadith-browser.js", "    o.lang = l;", "", "/hadith-"],
  fileh: ["app/import-notes.html", "**/import-notes.html", "#fileInput { margin: 0.6rem 0; min-height: 40px; max-width: 100%;", "#fileInput { margin: 0.6rem 0;", "/import-notes"],
  filew: ["app/import-notes.html", "**/import-notes.html", "min-height: 40px; max-width: 100%;", "min-height: 40px;", "/import-notes"],
  metaw: ["app/notes.html", "**/notes.html*", "color: #888; overflow-wrap: anywhere; }", "color: #888; }", "/notes.html"],
  chipw: ["app/hadith-study.html", "**/hadith-study.html", "  .topic-row-name, .topic-gloss { min-width: 0; overflow-wrap: anywhere; }", "", "/hadith-study"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const SPACING_CSS = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } [lang|=ar], [dir=rtl], [lang|=ar] *, [dir=rtl] * { letter-spacing: normal !important; } p { margin-bottom: 2em !important; }";

const READY_ZAB = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
const SEED = `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(d){return{toDate:function(){return new Date(d||"2026-09-01T10:00:00Z")},toMillis:function(){return new Date(d||"2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
["fA","fB"].forEach(function(id,i){DATA.noteFolders.push(Object.assign({_id:"t1__"+id,folderId:id,name:"Folder "+(i+1),parentFolderId:null,semanticRole:"user",order:i,status:"active",updatedAt:ts()},own))});
function hx(l){return l.slice(1).repeat(32)}
function N(l,title,day,extra){var id=hx(l);DATA.notes.push(Object.assign({_id:"t1__"+id,noteId:id,title:title,bodyHtml:"<p>Body "+l+"</p>",currentRevisionId:"rev-"+id,status:"active",visibility:"private",createdAt:ts("2026-08-0"+day+"T09:00:00Z"),updatedAt:ts("2026-09-0"+day+"T10:00:00Z")},own,extra||{}));
DATA.noteSources.push(Object.assign({_id:"t1__s-"+id,sourceLinkId:"s-"+id,noteId:id,sourceKey:"ayah:2:255",sourceKind:"quran-unit",relationshipKind:"origin",approachId:null,provenanceKind:"study-note",status:"active",createdAt:ts(),updatedAt:ts()},own))}
function P(id,l,folder,o){DATA.notePlacements.push(Object.assign({_id:"t1__"+id,placementId:id,noteId:hx(l),folderId:folder,order:o,status:"active"},own))}
N("n1","First note",1,{favourite:true});N("n2","Second note",2);N("n3","Third note",3);N("n4","Fourth note",4);
P("p1","n1","fA",0);P("p2","n2","fA",1);P("p3","n3","fB",0);P("p4","n4","fB",1);
function F(id,name,parentId){return{id:id,name:name,parentId:parentId||null,personTagId:null,removed:false,createdAt:"2026-09-01T00:00:00.000Z"}}
function BM(id,name,folder,ayah){return{id:id,programId:"none",moduleId:"quranrevival",subjectId:"quran",name:name,position:"ayah:2:"+ayah,folderId:folder,removed:false,settings:{unitType:"ayah",surahNum:2,ayahNum:ayah,trackableId:"tafsir"},createdAt:"2026-09-01T00:00:00.000Z"}}
DATA.bookmarks=[{_id:TENANT_ID+"__p1",tenantId:TENANT_ID,personId:"p1",resume:{},folders:[F("bA","Bookmark folder")],saved:[BM("b1","A bookmark","bA",255),BM("b2","Another",null,248)]}];
DATA.ayahCollections=[{_id:TENANT_ID,tenantId:TENANT_ID,collections:[]}];
})();`;
const BN_NAMES = [["First note", "প্রথম নোট"], ["Second note", "দ্বিতীয় নোট"], ["Third note", "তৃতীয় নোট"], ["Fourth note", "চতুর্থ নোট"], ["Folder ", "ফোল্ডার "], ["Bookmark folder", "বুকমার্ক ফোল্ডার"], ["A bookmark", "একটি বুকমার্ক"], ["Another", "আরেকটি"]];
const seedFor = (bn) => (bn ? BN_NAMES.reduce((s, [a, b]) => s.split(`"${a}`).join(`"${b}`), SEED) : SEED);

async function open(lang, width, height, pagePath, seed) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: seed });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_ZAB }));
  if (MUTATE && pagePath.includes(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, height, pagePath, seed, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 350) => page.waitForTimeout(ms);
const WIDTHS = [320, 390, 820, 1280, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// ---------------------------------------------------------------- detectors (all run in the page; passed as source)
// Tab stops: record where each Tab lands. Returns [{sel, rect, inside, vis}] until focus leaves `rootSel` or `max` presses.
async function tabWalk(page, rootSel, max) {
  const stops = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const s = await ev(page, (r) => {
      const a = document.activeElement; if (!a || a === document.body) return { body: true };
      const b = a.getBoundingClientRect();
      return { sel: a.tagName.toLowerCase() + (a.id ? "#" + a.id : "") + (typeof a.className === "string" && a.className ? "." + a.className.trim().split(/\s+/)[0] : ""), top: b.top, left: b.left, bottom: b.bottom, right: b.right, inside: r ? !!a.closest(r) : true };
    }, rootSel);
    stops.push(s);
    if (rootSel && !s.inside && !s.body) break;
  }
  return stops;
}
// A pane traps Tab when, after pressing Tab (own controls + 5) times starting inside it, focus never reaches a control outside it.
function leftPane(stops) { return stops.some((s) => s.inside === false); }
// A backwards stop: within one visual row (tops within `tol` px of each other) a later stop is further left (or right in rtl).
function backwards(stops, rtl) {
  const bad = [];
  for (let i = 1; i < stops.length; i++) {
    const p = stops[i - 1], c = stops[i]; if (p.body || c.body) continue;
    const sameRow = Math.abs((p.top + p.bottom) / 2 - (c.top + c.bottom) / 2) < Math.min(p.bottom - p.top, c.bottom - c.top) / 2;
    if (sameRow && (rtl ? c.left > p.left + 1 : c.left < p.left - 1)) bad.push(`${p.sel}@${Math.round(p.left)} -> ${c.sel}@${Math.round(c.left)}`);
  }
  return bad;
}
// Visible focus of the focused element: outline, or box-shadow, with 3:1 against the nearest opaque background.
function focusRing() {
  const a = document.activeElement; if (!a || a === document.body) return null;
  const cs = getComputedStyle(a);
  const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (x, y) => { const l1 = lum(x), l2 = lum(y); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (let e = a.parentElement; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) { bg = c; break; } }
  let ring = null;
  if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ring = parse(cs.outlineColor);
  else if (cs.boxShadow && cs.boxShadow !== "none") { const m = /rgba?\([^)]+\)/.exec(cs.boxShadow); if (m) ring = parse(m[0]); }
  if (!ring) return { sel: a.tagName + "#" + a.id + "." + String(a.className).slice(0, 24), ratio: 0 };
  return { sel: a.tagName + "#" + a.id + "." + String(a.className).slice(0, 24), ratio: ratio(ring, bg) };
}
// Spacing scan: cut text, overlapping controls, short controls, sideways scroll.
function spacingScan() {
  const out = { cut: [], overlap: [], short: [], over: 0 };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 48);
  // a closed <details> keeps laid-out boxes for everything but its summary, yet none of it is on screen
  const closedDetails = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.tagName === "SUMMARY" && e.parentElement === d)) return true; } return false; };
  const shown = (e) => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !closedDetails(e); };
  for (const e of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "SVG", "PATH", "OPTION"].includes(e.tagName.toUpperCase()) || !shown(e)) continue;
    const c = getComputedStyle(e);
    if (!(e.textContent || "").trim() || [...e.childNodes].every((n) => n.nodeType !== 3 || !n.nodeValue.trim())) continue; // only elements with their own text
    const clipsX = /hidden|clip/.test(c.overflowX) || c.textOverflow === "ellipsis", clipsY = /hidden|clip/.test(c.overflowY);
    if (clipsX && e.scrollWidth > e.clientWidth + 1 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) out.cut.push(`${desc(e)} w ${e.scrollWidth}>${e.clientWidth}`);
    else if (clipsY && c.display !== "inline" && e.scrollHeight > e.clientHeight + 1 && !e.matches("textarea, [contenteditable]") && c.overflowY !== "auto" && c.overflowY !== "scroll") out.cut.push(`${desc(e)} h ${e.scrollHeight}>${e.clientHeight}`);
  }
  const ctl = [...document.querySelectorAll("button, a[href], summary, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=button]")].filter((e) => shown(e) && !e.closest("[inert]"));
  for (const e of ctl) {
    const b = e.getBoundingClientRect();
    if (b.height < 39.5 && !e.closest("nav a") && !e.matches("a[href]:not(.btn)") ) out.short.push(`${desc(e)}:${Math.round(b.height)}`);
  }
  // a fixed-position control (the Zab corner) floats over whatever scrolls beneath it by design: not a collision of two page controls
  const floats = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).position === "fixed") return true; return false; };
  const flow = ctl.filter((e) => !floats(e));
  for (let i = 0; i < flow.length; i++) for (let j = i + 1; j < flow.length; j++) {
    const a = flow[i], d = flow[j]; if (a.contains(d) || d.contains(a)) continue;
    const x = a.getBoundingClientRect(), y = d.getBoundingClientRect();
    const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
    if (w > 2 && h > 2) out.overlap.push(`${desc(a)} x ${desc(d)}`);
  }
  out.over = document.documentElement.scrollWidth - innerWidth;
  // name what pokes past the right edge, so a sideways-scroll failure says where it comes from
  out.wide = out.over > 0 ? [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 0.5; }).sort((x, y) => y.getBoundingClientRect().right - x.getBoundingClientRect().right).slice(0, 4).map((e) => `${desc(e)} right ${Math.round(e.getBoundingClientRect().right)}`) : [];
  // a text run can poke out of a box that itself fits (a nowrap word in a narrow cell): name its parent too
  if (out.over > 0 && !out.wide.length) { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode()) && out.wide.length < 4;) { const rg = document.createRange(); rg.selectNodeContents(n); const rr = rg.getBoundingClientRect(); if (rr.width > 0 && rr.right > innerWidth + 0.5) out.wide.push(`text "${n.nodeValue.trim().slice(0, 24)}" in ${desc(n.parentElement)} right ${Math.round(rr.right)}`); } }
  out.cut = [...new Set(out.cut)]; out.short = [...new Set(out.short)]; out.overlap = [...new Set(out.overlap)];
  return out;
}
const SPACING_SRC = spacingScan.toString();
const runSpacing = (page) => page.evaluate(`(${SPACING_SRC})()`);
const FOCUS_SRC = focusRing.toString();
const runFocus = (page) => page.evaluate(`(${FOCUS_SRC})()`);

// ---------------------------------------------------------------- positive controls
await flow("control", "en", 390, 800, "/app/about.html", "", async (t, page) => {
  // 1. a fixed-height box that cuts its text must be reported by spacingScan; a roomy one must not
  await ev(page, () => { const d = document.createElement("div"); d.innerHTML = '<div id="cutbox" style="height:20px;width:80px;overflow:hidden">A long label that is certainly cut off by a fixed height box here</div><div id="okbox" style="min-height:20px;width:80px">fine</div><div id="ell" style="width:50px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">a long ellipsised label</div>'; document.body.appendChild(d); });
  const r = await runSpacing(page);
  check(`${t}: POSITIVE CONTROL spacingScan finds a fixed-height box that cuts its text`, r.cut.some((c) => c.includes("#cutbox")), JSON.stringify(r.cut.slice(0, 4)));
  check(`${t}: POSITIVE CONTROL spacingScan finds an ellipsised label`, r.cut.some((c) => c.includes("#ell")), JSON.stringify(r.cut.slice(0, 4)));
  check(`${t}: POSITIVE CONTROL spacingScan does not flag a box that has room`, !r.cut.some((c) => c.includes("#okbox")));
  // 2. two overlapping controls and a short control
  await ev(page, () => { const d = document.createElement("div"); d.innerHTML = '<div style="position:relative;height:60px"><button id="ob1" style="position:absolute;left:0;top:0;width:100px;height:44px">one</button><button id="ob2" style="position:absolute;left:50px;top:0;width:100px;height:44px">two</button><button id="sh1" style="position:absolute;left:200px;top:0;height:20px">s</button></div>'; document.body.appendChild(d); });
  const o = await runSpacing(page);
  check(`${t}: POSITIVE CONTROL spacingScan finds two overlapping controls`, o.overlap.some((x) => x.includes("#ob1") || x.includes("#ob2")), JSON.stringify(o.overlap.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL spacingScan finds a control under 40px tall`, o.short.some((x) => x.includes("#sh1")), JSON.stringify(o.short.slice(0, 3)));
  // 3. a pane that traps Tab, and one that does not
  await ev(page, () => {
    document.body.innerHTML = '<button id="before">before</button><div id="trap"><button id="t1">a</button><button id="t2">b</button></div><button id="after">after</button>';
    document.getElementById("trap").addEventListener("keydown", (e) => { if (e.key !== "Tab") return; e.preventDefault(); const bs = [...document.querySelectorAll("#trap button")]; const i = bs.indexOf(document.activeElement); bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus(); });
    document.getElementById("t1").focus();
  });
  const trapped = await tabWalk(page, "#trap", 2 + 5);
  check(`${t}: POSITIVE CONTROL a pane that traps Tab is reported as trapped`, !leftPane(trapped), JSON.stringify(trapped.map((s) => s.sel)));
  await ev(page, () => { const t2 = document.getElementById("trap"); const c = t2.cloneNode(true); t2.replaceWith(c); document.getElementById("t1").focus(); });
  const free = await tabWalk(page, "#trap", 2 + 5);
  check(`${t}: POSITIVE CONTROL a pane that does not trap Tab is reported as free`, leftPane(free), JSON.stringify(free.map((s) => s.sel)));
  // 4. a backwards stop: tabindex puts the left button after the right one
  await ev(page, () => { document.body.innerHTML = '<div style="display:flex;gap:10px;flex-direction:row-reverse"><button id="L">first in DOM, drawn on the right</button><button id="R">second in DOM, drawn on the left</button></div>'; document.activeElement.blur(); });
  const back = (await tabWalk(page, null, 3)).filter((s) => !s.body);
  check(`${t}: POSITIVE CONTROL a backwards Tab stop within one row is found`, backwards(back, false).length >= 1, JSON.stringify(back.map((s) => s.sel)));
  await ev(page, () => { document.body.innerHTML = '<div style="display:flex;gap:10px"><button id="L">L</button><button id="R">R</button></div>'; });
  const fwd = await tabWalk(page, null, 2);
  check(`${t}: POSITIVE CONTROL an in-order row reports no backwards stop`, backwards(fwd, false).length === 0);
  // 5. focus ring: an element with outline:none has ratio 0; a default one is visible
  await ev(page, () => { document.body.innerHTML = '<button id="nf" style="outline:none;box-shadow:none">x</button><button id="yf" style="outline:3px solid #000">y</button>'; document.getElementById("nf").focus(); });
  const nf = await runFocus(page);
  await ev(page, () => document.getElementById("yf").focus());
  const yf = await runFocus(page);
  check(`${t}: POSITIVE CONTROL focusRing sees no ring on outline:none and a ring on outline:3px`, nf.ratio === 0 && yf.ratio >= 3, JSON.stringify([nf, yf]));
});

// ---------------------------------------------------------------- Part A
const MSA_NOTES = "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test";
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  const H = width < 600 ? 844 : 800;

  // A1. the Notes pane is not a Tab trap
  await flow("pane", lang, width, H, "/app/journey-map.html", seedFor(bn), async (t, page) => {
    await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
    await page.waitForFunction(() => document.querySelectorAll("#folderNotes [data-note-leaf]").length >= 2, null, { timeout: 15000 });
    await page.click("#folderNotes [data-note-leaf] [data-note-open]");
    await page.waitForSelector("#notePane:not([hidden])", { timeout: 10000 }).catch(() => {});
    await settle(page, 700);
    const own = await ev(page, () => [...document.querySelectorAll("#notePane button, #notePane a[href], #notePane input, #notePane select, #notePane textarea, #notePane [tabindex]:not([tabindex='-1']), #notePane [contenteditable=true]")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !e.closest("[hidden]") && getComputedStyle(e).visibility !== "hidden" && !e.disabled; }).length);
    check(`${t}: POSITIVE CONTROL the Notes pane opened and has controls`, own >= 1, String(own));
    await ev(page, () => { const f = document.querySelector("#notePane button:not([disabled])"); if (f) f.focus(); });
    const stops = await tabWalk(page, "#notePane", own + 5);
    check(`${t}: Tab leaves the Notes pane within its ${own} stops + 5`, leftPane(stops), `${stops.length} presses, never left: ${stops.slice(0, 6).map((s) => s.sel).join(" > ")}`);
  });

  // A2. the opened Bookmark menu
  for (const pg of ["notes", "bookmarks"]) {
    await flow(`bmmenu-${pg}`, lang, width, H, pg === "notes" ? MSA_NOTES : "/app/bookmarks.html", seedFor(bn), async (t, page) => {
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 15000 });
      await ev(page, () => { document.querySelector(".nav-cat-bookmark > summary").setAttribute("data-a34-opener", "1"); });
      await page.click(".nav-cat-bookmark > summary");
      await settle(page, 500);
      const links = await ev(page, () => [...document.querySelectorAll(".nav-cat-bookmark[open] .nav-cat-links a, .nav-cat-bookmark[open] .nav-cat-links button")].filter((e) => e.getBoundingClientRect().width > 0).length);
      check(`${t}: POSITIVE CONTROL the Bookmark menu opened and has stops`, links >= 1, String(links));
      const bad = [];
      await ev(page, () => document.querySelector(".nav-cat-bookmark > summary").focus());
      for (let i = 0; i < links + 1; i++) {
        await page.keyboard.press("Tab");
        const inside = await ev(page, () => !!document.activeElement.closest(".nav-cat-bookmark[open] .nav-cat-links"));
        if (!inside) break;
        const f = await runFocus(page);
        if (!f || f.ratio < 3) bad.push(`${f && f.sel}:${f && f.ratio.toFixed(1)}`);
      }
      check(`${t}: every Bookmark menu stop shows a visible focus (3:1)`, bad.length === 0, bad.slice(0, 5).join(" | "));
      await ev(page, () => document.querySelector(".nav-cat-bookmark > summary").focus());
      await page.keyboard.press("Escape"); await settle(page, 300);
      const closed = await ev(page, () => !document.querySelector(".nav-cat-bookmark").open);
      const onBtn = await ev(page, () => document.activeElement === document.querySelector("[data-a34-opener]"));
      check(`${t}: Escape closes the Bookmark menu`, closed);
      check(`${t}: Escape returns focus to the button that opened it`, onBtn, await ev(page, () => document.activeElement.tagName + "#" + document.activeElement.id));
    });
  }

  // A3. row order
  for (const [pg, path, rows] of [["nav", MSA_NOTES, "nav .nav-cat > summary, nav .nav-cat > a"], ["pagemenu", "/app/journey-map.html", ".page-menu-wrap .bar-palette.open button"], ["records", "/app/records.html", "tbody tr:first-child a, tbody tr:first-child button"]]) {
    await flow(`order-${pg}`, lang, width, H, path, seedFor(bn), async (t, page) => {
      await settle(page, 600);
      if (pg === "pagemenu") { await page.waitForSelector(".page-menu-wrap [data-bar-palette-toggle]", { timeout: 15000 }); await ev(page, () => document.querySelector(".page-menu-wrap [data-bar-palette-toggle]").click()); await settle(page, 400); }
      const n = await ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().width > 0).length, rows);
      if (n < 2 && pg === "records") { console.log(`  NOTE  ${t}: the fixture has no Records row with two controls; Records row order NOT reached here`); return; }
      check(`${t}: POSITIVE CONTROL the ${pg} row has stops`, n >= 2, String(n));
      if (n < 2) return;
      await ev(page, () => { document.body.setAttribute("tabindex", "-1"); document.body.focus(); });
      const stops = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        const s = await ev(page, (sel) => { const a = document.activeElement; if (!a || a === document.body) return null; const b = a.getBoundingClientRect(); return { sel: a.tagName.toLowerCase() + (a.id ? "#" + a.id : "") + (typeof a.className === "string" && a.className ? "." + a.className.trim().split(/\s+/)[0] : ""), top: b.top, bottom: b.bottom, left: b.left, right: b.right, inRows: a.matches(sel) }; }, rows);
        if (s) stops.push(s);
      }
      const rtl = await ev(page, () => getComputedStyle(document.body).direction === "rtl");
      const bad = backwards(stops.filter((s) => s.inRows), rtl);
      check(`${t}: Tab goes start to end within the ${pg} row`, bad.length === 0, bad.slice(0, 4).join(" | "));
    });
  }
}

// ---------------------------------------------------------------- Part B
const PAGES = ["notes", "journey-map", "bookmarks", "records", "monitor", "hadith-collections", "hadith-study", "deen-study", "arabic-study", "people", "classes", "homework", "catalogue", "dawah", "import-notes", "about"];
const SPACING_WIDTHS = WIDTHS;
for (const lang of LANGS) for (const width of SPACING_WIDTHS) {
  const bn = lang === "bn";
  const H = width < 600 ? 844 : 800;
  for (const pg of PAGES) {
    const url = pg === "notes" ? MSA_NOTES : `/app/${pg}.html`;
    await flow(`spacing-${pg}`, lang, width, H, url, seedFor(bn), async (t, page) => {
      await settle(page, 600);
      await page.addStyleTag({ content: SPACING_CSS });
      await settle(page, 300);
      const arabicUnmarked = await ev(page, () => [...document.querySelectorAll("body *")].filter((e) => { if (["SCRIPT", "STYLE"].includes(e.tagName)) return false; const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(""); if (!/[؀-ۿ]{3,}/.test(own)) return false; return !(e.closest("[lang|=ar], [dir=rtl]")); }).map((e) => e.tagName + "." + String(e.className).slice(0, 20) + "#" + e.id + "=" + e.textContent.trim().slice(0, 20) + "<" + (e.parentElement && e.parentElement.id) + ">").slice(0, 5));
      check(`${t}: Arabic text is marked lang=ar or dir=rtl`, arabicUnmarked.length === 0, arabicUnmarked.join(" | "));
      const r = await runSpacing(page);
      check(`${t}: spacing: no text is cut`, r.cut.length === 0, r.cut.slice(0, 6).join(" | "));
      check(`${t}: spacing: no two controls overlap`, r.overlap.length === 0, r.overlap.slice(0, 6).join(" | "));
      check(`${t}: spacing: every control is 40px tall`, r.short.length === 0, r.short.slice(0, 6).join(" | "));
      // the nav row clips rather than scrolls, so a label that grows past the screen is CUT and no scroll width shows it:
      // measure containment (each nav label inside the screen, and nothing cut inside it)
      const navOut = await ev(page, () => [...document.querySelectorAll("nav .nav-cat > summary, nav .nav-cat > a")].filter((e) => e.getBoundingClientRect().width > 0).filter((e) => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5 || e.scrollWidth > e.clientWidth + 1; }).map((e) => `${e.textContent.trim().slice(0, 14)} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)} sw${e.scrollWidth}/${e.clientWidth}`));
      const navN = await ev(page, () => [...document.querySelectorAll("nav .nav-cat > summary, nav .nav-cat > a")].filter((e) => e.getBoundingClientRect().width > 0).length);
      if (pg === "hadith-collections") check(`${t}: this page has no nav row (a standalone page)`, navN === 0, String(navN));
      else check(`${t}: POSITIVE CONTROL the nav row has labels`, navN >= 3, String(navN));
      check(`${t}: spacing: every nav label sits inside the screen, uncut`, navOut.length === 0, navOut.slice(0, 4).join(" | "));
      check(`${t}: spacing: no sideways scroll`, r.over <= 0, `${r.over}px: ${r.wide.join(" | ")}`);
    });
  }
}

await browser.close();
console.log(`\n==== audit-part34${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
