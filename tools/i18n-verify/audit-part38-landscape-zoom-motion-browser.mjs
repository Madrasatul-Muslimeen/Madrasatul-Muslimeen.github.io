// Audit part 38 (PCF MSA J29): phone landscape (844x390), 200% zoom reflow (640x450 @ dsf 2) and reduced motion on the MSA pages.
//   control    every detector flags a seeded fault (wide box -> sideways scroll, clipped nowrap label -> clipped text, 1s transition -> slow motion)
//   landscape  no sideways scroll, no control covered, fixed/sticky bars leave >= 50% of 390px
//   zoom       no sideways scroll, no text clipped by overflow + nowrap, controls reachable
//   motion     reducedMotion: reduce -> no transition/animation over 200ms, no smooth scrolling (CSS or script)
//   sheets     (part 39) opened windows, sheets, dialogs and menus at 844x390 and 640x450: inside the viewport or scrolling inside itself,
//              Close/Save/primary reachable inside the sheet's own scroll box, nothing cut sideways, page behind not scrolling sideways
// Mutations (each restores one pre-fix rule and must fail the suite) are listed in MUTATIONS.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part38-landscape-zoom-motion-browser.mjs [--only=<page>] [--lang=en|bn] [--mode=landscape|zoom|motion|sheets] [--mutate=<name>] [--shots=<dir>]
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
const MUTATE = arg("mutate"), ONLY = arg("only"), LONLY = arg("lang"), MONLY = arg("mode"), SHOTS = arg("shots");
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]
const MUTATIONS = {
  // recordstable was dropped in review (v11.36): at 640px the records table is 608px wide on unmodified main, in en and bn,
  // so the reported 642px overflow did not reproduce and the mutation could not fail the suite; records.html is unchanged.
  cataloguescroll: ["app/catalogue.html", "**/catalogue.html*", 'behavior: reduceMotion ? "auto" : "smooth"', 'behavior: "smooth"', "/app/catalogue.html"],
  // part 39
  winshort: ["app/js/note-window.js", "**/js/note-window.js*", "const short = window.innerHeight < 560;", "const short = false;", "/app/notes.html"],
  winlimits: ["app/js/note-window.js", "**/js/note-window.js*", "get minH() { return Math.min(360, Math.max(200, window.innerHeight - 52)); }", "minH: 360", "/app/notes.html"],
  foldermenu: ["app/journey-map.html", "**/journey-map.html*", "@media (max-height: 520px) { .folder-row-menu.open { max-height: calc(100vh - 7rem); overflow-y: auto; overscroll-behavior: contain; } }", "", "/app/journey-map.html"],
  catalogueflash: ["app/catalogue.html", "**/catalogue.html*", "@media (prefers-reduced-motion: reduce) { .subj-row-flash { animation: none; background: #fff3cd; } }", "", "/app/catalogue.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// index.html is a redirect stub into quranrevival.html (Quran Study, QR's home): not measured here, its findings go to QR.
const PAGES = ["notes", "journey-map", "bookmarks", "records", "hadith-collections", "hadith-study", "about"];
const MODES = {
  landscape: { viewport: { width: 844, height: 390 } },
  zoom: { viewport: { width: 640, height: 450 } }, // a 1280x900 screen at 200%: layout sees 640x450 CSS px (deviceScaleFactor only sharpens pixels)
  motion: { viewport: { width: 1280, height: 800 } },
  sheetsL: { viewport: { width: 844, height: 390 } },
  sheetsZ: { viewport: { width: 640, height: 450 } },
};

// ---- detectors (run in the page) ----
function sideways() { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth, over: d.scrollWidth > d.clientWidth + 1 }; }
function clippedText() {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "OPTION", "SELECT", "TEXTAREA", "INPUT"].includes(el.tagName)) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    if (!(cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis")) continue;
    if (el.clientWidth && el.scrollWidth > el.clientWidth + 1) {
      out.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), s: el.textContent.trim().slice(0, 30), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  return out;
}
function covered() {
  const out = [];
  for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button]")) {
    if (el.disabled) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const r0 = el.getBoundingClientRect();
    if (r0.width < 2 || r0.height < 2) continue;
    const probe = () => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { off: true };
      let clipped = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.overflowX !== "visible" || s.overflowY !== "visible") { const b = n.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) { clipped = true; break; } }
      }
      const top = document.elementFromPoint(x, y);
      return { ok: !clipped && top && (el === top || el.contains(top) || top.contains(el) || (el.labels && [...el.labels].some((l) => l.contains(top)))), clipped, top };
    };
    let pr = probe();
    if (pr.off) continue; // below the fold is reached by scrolling, not covered
    if (!pr.ok) { // a fixed bar over content at the first scroll position is normal: scroll the control to the middle and ask again
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      pr = probe();
      if (pr.off) continue;
    }
    const { ok, clipped, top } = pr;
    if (!ok) out.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), s: (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 24), by: top ? top.tagName.toLowerCase() + (top.id ? "#" + top.id : "") : "none", clipped });
  }
  return out;
}
function fixedBars() {
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.5 || r.height < 4) continue;
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    rows.push({ d: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) });
  }
  const spans = rows.map((r) => [Math.max(0, r.top), Math.min(innerHeight, r.bottom)]).sort((a, b) => a[0] - b[0]);
  let used = 0, end = -1;
  for (const [a, b] of spans) { if (b <= end) continue; used += b - Math.max(a, end); end = b; }
  return { rows, used, free: innerHeight - used, vh: innerHeight };
}
function slowMotion() {
  const sec = (v) => Math.max(0, ...String(v).split(",").map((x) => { x = x.trim(); return x.endsWith("ms") ? parseFloat(x) / 1000 : parseFloat(x) || 0; }));
  const out = [];
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const td = sec(cs.transitionDuration) + sec(cs.transitionDelay), ad = sec(cs.animationDuration);
    if (cs.transitionProperty !== "none" && td > 0.2) out.push({ d: name(el), kind: "transition", s: td });
    if (cs.animationName !== "none" && ad > 0.2) out.push({ d: name(el), kind: "animation", s: ad });
    if (cs.scrollBehavior === "smooth") out.push({ d: name(el), kind: "scroll-behavior", s: 1 });
  }
  return out;
}
// Part 39: an opened sheet, measured inside the sheet's own scroll box, never by the page's scroll position.
function sheetCheck(spec) {
  const root = document.querySelector(spec.root);
  // checkVisibility: the content of a closed <details> keeps a box but is not shown
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && (!e.checkVisibility || e.checkVisibility({ checkVisibilityCSS: true, contentVisibilityAuto: true })); };
  if (!root || !vis(root)) return { found: false };
  const nm = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : "");
  // A surface fixed to the screen cannot be reached by scrolling the page; one in the page's flow (a drop-down) can, but it must still fit the screen height.
  let fixed = false;
  for (let n = root; n && n !== document.documentElement; n = n.parentElement) if (getComputedStyle(n).position === "fixed") { fixed = true; break; }
  const rr = root.getBoundingClientRect();
  const problems = [];
  // A floating Note window must also keep clear of the Zab bar that sits over the foot of the screen.
  const zb = document.getElementById("zabBar"), zbr = zb && getComputedStyle(zb).display !== "none" ? zb.getBoundingClientRect() : null;
  const floor = zbr && zbr.height > 0 && root.closest(".note-win:not(.sheet)") ? zbr.top : innerHeight;
  // spec.inline: a panel that is part of the page itself (the Dua ✓ Check), reached by scrolling the page, so only its buttons and sideways fit are judged
  if (!spec.inline && (fixed ? (rr.top < -1 || rr.bottom > floor + 1) : rr.height > innerHeight + 1)) problems.push(`sheet leaves the viewport vertically (${Math.round(rr.top)}..${Math.round(rr.bottom)} of ${innerHeight}, ${fixed ? "fixed" : "in flow"})`);
  if (rr.left < -1 || rr.right > innerWidth + 1) problems.push(`sheet leaves the viewport sideways (${Math.round(rr.left)}..${Math.round(rr.right)} of ${innerWidth})`);
  const scrollsX = (n) => { const o = getComputedStyle(n).overflowX; return o === "auto" || o === "scroll"; };
  const cut = [];
  for (const el of root.querySelectorAll("*")) {
    if (!vis(el) || ["SCRIPT", "STYLE", "OPTION"].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.right <= rr.right + 1 && r.left >= rr.left - 1) continue;
    let inScroller = false;
    for (let n = el.parentElement; n && n !== root.parentElement; n = n.parentElement) if (scrollsX(n)) { inScroller = true; break; }
    if (!inScroller) cut.push(`${nm(el)} ${Math.round(r.left)}..${Math.round(r.right)} vs sheet ${Math.round(rr.left)}..${Math.round(rr.right)}`);
  }
  if (cut.length) problems.push(`cut sideways: ${cut.slice(0, 3).join("; ")}`);
  let list = [];
  for (const b of spec.buttons || []) {
    if (b === "*") list.push(...[...root.querySelectorAll("button, a[href], summary")].filter(vis));
    else { const e = root.querySelector(b) || document.querySelector(b); if (!e) problems.push(`button ${b} is absent`); else list.push(e); }
  }
  list = [...new Set(list)];
  const bad = [];
  for (const el of list) {
    // scroll only inside the sheet's own scroll boxes, innermost first; the page's scroll position is never used
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) {
        const nb = n.getBoundingClientRect(), eb = el.getBoundingClientRect();
        n.scrollTop += (eb.top + eb.height / 2) - (nb.top + nb.height / 2);
      }
      const ox = getComputedStyle(n).overflowX;
      if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth) {
        const nb = n.getBoundingClientRect(), eb = el.getBoundingClientRect();
        n.scrollLeft += (eb.left + eb.width / 2) - (nb.left + nb.width / 2);
      }
      if (n === root) break;
    }
    if (!fixed) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    let why = null;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) why = "off the viewport";
    for (let n = el.parentElement; !why && n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") { const b = n.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) why = `clipped by ${nm(n)}`; }
    }
    if (!why) { const top = document.elementFromPoint(x, y); if (!(top && (el === top || el.contains(top) || top.contains(el)))) why = `covered by ${top ? nm(top) : "nothing"}`; }
    if (why) bad.push(`${nm(el)} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 18)}" ${why} at ${Math.round(x)},${Math.round(y)} size ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  if (bad.length) problems.push(`unreachable: ${bad.slice(0, 4).join("; ")}`);
  return { found: true, n: list.length, problems, h: Math.round(rr.height), vh: innerHeight };
}
const SRC = { sideways, clippedText, covered, fixedBars, slowMotion, sheetCheck };
const run = (page, fn, a) => page.evaluate(`(${SRC[fn].toString()})(${JSON.stringify(a ?? null)})`);

// ---- part 39 seed (from part 32): notes, folders and bookmarks, and the Zab bar declared ready ----
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
N("n1","First note",1,{favourite:true});N("n2","Second note",2,{archived:true});N("n3","Third note",3);N("n4","Fourth note",4);
P("p1","n1","fA",0);P("p2","n2","fA",1);P("p3","n3","fB",0);P("p4","n4","fB",1);
function F(id,name,parentId){return{id:id,name:name,parentId:parentId||null,personTagId:null,removed:false,createdAt:"2026-09-01T00:00:00.000Z"}}
function BM(id,name,folder,ayah){return{id:id,programId:"none",moduleId:"quranrevival",subjectId:"quran",name:name,position:"ayah:2:"+ayah,folderId:folder,removed:false,settings:{unitType:"ayah",surahNum:2,ayahNum:ayah,trackableId:"tafsir"},createdAt:"2026-09-01T00:00:00.000Z"}}
DATA.bookmarks=[{_id:TENANT_ID+"__p1",tenantId:TENANT_ID,personId:"p1",resume:{},folders:[F("bA","Bookmark folder")],saved:[BM("b1","A bookmark","bA",255),BM("b2","Another",null,248)]}];
DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];
})();`;
const BN_NAMES = [["First note", "প্রথম নোট"], ["Second note", "দ্বিতীয় নোট"], ["Third note", "তৃতীয় নোট"], ["Fourth note", "চতুর্থ নোট"], ["Folder ", "ফোল্ডার "], ["Bookmark folder", "বুকমার্ক ফোল্ডার"], ["A bookmark", "একটি বুকমার্ক"], ["Another", "আরেকটি"]];
const seedFor = (bn) => (bn ? BN_NAMES.reduce((s, [a, b]) => s.split(`"${a}`).join(`"${b}`), SEED) : SEED);

async function open(lang, mode, pagePath, motionReduce, seed) {
  const m = MODES[mode];
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: m.viewport, ...(seed ? { extraSeedJs: seed } : {}) });
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (seed) await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_ZAB }));
  if (MUTATE && pagePath.includes(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, pagePath);
  if (motionReduce) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}
async function flow(tag, lang, mode, pagePath, motionReduce, fn, seed) {
  let ctx;
  try {
    const o = await Promise.race([open(lang, mode, pagePath, motionReduce, seed),new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(o.page), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const fmt = (a) => a.slice(0, 6).map((x) => JSON.stringify(x)).join(" ");
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

// ---- positive controls: each detector must flag a seeded fault ----
if (!ONLY) {
  const ctx = await newContext(browser, { banner: false, viewport: { width: 640, height: 450 } });
  const { page } = await openPage(ctx, "/app/about.html");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const w = document.createElement("div"); w.id = "p38wide"; w.style.cssText = "width:2000px;height:10px"; document.body.appendChild(w);
    const c = document.createElement("div"); c.id = "p38clip"; c.textContent = "A seeded label that is far too long for its box"; c.style.cssText = "width:60px;overflow:hidden;white-space:nowrap"; document.body.appendChild(c);
    const t = document.createElement("div"); t.id = "p38slow"; t.style.cssText = "transition:opacity 1s"; document.body.appendChild(t);
    const b = document.createElement("button"); b.id = "p38btn"; b.textContent = "seeded"; b.style.cssText = "position:fixed;left:10px;top:10px;z-index:1"; document.body.appendChild(b);
    const cover = document.createElement("div"); cover.id = "p38cover"; cover.style.cssText = "position:fixed;left:0;top:0;width:200px;height:100px;z-index:99999"; document.body.appendChild(cover);
    const bar = document.createElement("div"); bar.id = "p38bar"; bar.style.cssText = "position:fixed;left:0;right:0;top:0;height:300px;z-index:1;pointer-events:none"; document.body.appendChild(bar);
  });
  check("control: a seeded 2000px box is flagged as sideways scroll", (await run(page, "sideways")).over);
  check("control: a seeded clipped nowrap label is flagged", (await run(page, "clippedText")).some((x) => x.d === "div#p38clip"));
  check("control: a seeded 1s transition is flagged", (await run(page, "slowMotion")).some((x) => x.d === "div#p38slow" && x.kind === "transition"));
  check("control: a seeded button under an overlay is flagged as covered", (await run(page, "covered")).some((x) => x.d === "button#p38btn"));
  check("control: a seeded 300px fixed bar leaves under 50% of 450px", (await run(page, "fixedBars")).free < 225);
  await page.evaluate(() => { document.getElementById("p38wide").remove(); });
  check("control: with the wide box removed, sideways scroll clears", !(await run(page, "sideways")).over);
  // part 39: a sheet taller than the viewport with no inner scroll must be flagged; the same sheet with max-height + overflow-y:auto must pass
  await page.evaluate(() => {
    const s = document.createElement("div"); s.id = "p39sheet"; s.style.cssText = "position:fixed;left:20px;top:20px;width:300px;height:700px;background:#fff;z-index:99998;overflow:visible";
    s.innerHTML = '<div style="height:640px">body</div><button id="p39save" style="position:absolute;bottom:0">Save</button>'; document.body.appendChild(s);
  });
  const tall = await run(page, "sheetCheck", { root: "#p39sheet", buttons: ["#p39save"] });
  check("control: a seeded sheet taller than the viewport with no inner scroll is flagged (box leaves the viewport)", tall.found && tall.problems.some((x) => /leaves the viewport vertically/.test(x)), JSON.stringify(tall));
  check("control: ... and its Save button is flagged unreachable", tall.problems.some((x) => /unreachable/.test(x)), JSON.stringify(tall));
  await page.evaluate(() => { const s = document.getElementById("p39sheet"); s.style.cssText = "position:fixed;left:20px;top:20px;width:300px;max-height:calc(100vh - 40px);overflow-y:auto;background:#fff;z-index:99998"; s.innerHTML = '<div style="height:640px">body</div><button id="p39save">Save</button>'; });
  const okSheet = await run(page, "sheetCheck", { root: "#p39sheet", buttons: ["#p39save"] });
  check("control: with max-height and overflow-y:auto the same sheet passes, Save reached inside its own scroll box", okSheet.found && okSheet.problems.length === 0, JSON.stringify(okSheet));
  await page.evaluate(() => { document.getElementById("p39sheet").style.cssText = "position:fixed;left:20px;top:20px;width:300px;max-height:calc(100vh - 40px);overflow:hidden;background:#fff;z-index:99998"; document.getElementById("p39sheet").innerHTML = '<div style="width:900px;height:20px">wide</div>'; });
  const wide = await run(page, "sheetCheck", { root: "#p39sheet", buttons: [] });
  check("control: a seeded child wider than the sheet is flagged as cut sideways", wide.problems.some((x) => /cut sideways/.test(x)), JSON.stringify(wide));
  await ctx.close();
}

for (const lang of LANGS) for (const pg of PAGES) {
  if (ONLY && !ONLY.split(",").some((o) => pg.includes(o))) continue;
  const p = `/app/${pg}.html`;
  if (!MONLY || MONLY === "landscape") {
    const tag = `${lang} landscape 844x390 ${pg}`;
    await flow(tag, lang, "landscape", p, false, async (page) => {
      const s = await run(page, "sideways");
      check(`${tag}: no sideways scroll`, !s.over, `scrollWidth ${s.sw} > ${s.cw}`);
      const cv = await run(page, "covered");
      check(`${tag}: no control cut off or covered`, cv.length === 0, fmt(cv));
      const fb = await run(page, "fixedBars");
      check(`${tag}: fixed/sticky bars leave >= 50% of the height`, fb.free >= fb.vh / 2, `${fb.used}px used of ${fb.vh}: ${fmt(fb.rows)}`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${lang}-landscape-${pg}.png`) });
    });
  }
  if (!MONLY || MONLY === "zoom") {
    const tag = `${lang} zoom 640x450 ${pg}`;
    await flow(tag, lang, "zoom", p, false, async (page) => {
      const s = await run(page, "sideways");
      check(`${tag}: no sideways scroll`, !s.over, `scrollWidth ${s.sw} > ${s.cw}`);
      const ct = await run(page, "clippedText");
      check(`${tag}: no text clipped by overflow + nowrap`, ct.length === 0, fmt(ct));
      const cv = await run(page, "covered");
      check(`${tag}: no control cut off or covered`, cv.length === 0, fmt(cv));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${lang}-zoom-${pg}.png`) });
    });
  }
  if (!MONLY || MONLY === "motion") {
    const tag = `${lang} reduced-motion ${pg}`;
    await flow(tag, lang, "motion", p, true, async (page) => {
      const sm = await run(page, "slowMotion");
      check(`${tag}: nothing runs over 200ms or scrolls smoothly`, sm.length === 0, fmt(sm));
    });
  }
}

// ---- part 39: opened windows, sheets, dialogs and menus ----
const NOTES_URL = "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test";
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const ev = (page, f, a) => page.evaluate(f, a);
if (!MONLY || MONLY === "sheets") {
  for (const lang of LANGS) for (const vp of ["sheetsL", "sheetsZ"]) {
    const bn = lang === "bn";
    const vpTag = vp === "sheetsL" ? "844x390" : "640x450";
    // One opened surface: it really opened (control), then fit / reach / sideways / page-behind are measured.
    const measure = async (t, page, name, spec) => {
      const tt = `${t} ${name}`;
      const r = await run(page, "sheetCheck", spec);
      check(`${tt}: POSITIVE CONTROL it opened`, r.found, `${spec.root} not visible`);
      if (!r.found) return;
      check(`${tt}: inside the viewport, Close/Save/primary reachable in its own scroll box, nothing cut sideways`, r.problems.length === 0, r.problems.join(" | "));
      const s = await run(page, "sideways");
      check(`${tt}: the page behind does not scroll sideways`, !s.over, `scrollWidth ${s.sw} > ${s.cw}`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${lang}-${vpTag}-${name.replace(/[^a-z0-9]+/gi, "-")}.png`) });
    };
    const want = (n) => !ONLY || ONLY.split(",").some((o) => n.includes(o));
    const card = (l) => `.note-card[data-note-id="${l.slice(1).repeat(32)}"] [data-note-window]`;

    if (want("notes")) await flow(`${lang} ${vpTag} notes`, lang, vp, NOTES_URL, false, async (page) => {
      const t = `${lang} ${vpTag}`;
      await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
      await ev(page, (s) => document.querySelector(s).click(), card("n1")); await settle(page, 700);
      await measure(t, page, "Note window", { root: ".note-win", buttons: ["[data-win-close]"] });
      await ev(page, () => document.querySelector(".note-win [data-pane-menu-btn]")?.click()); await settle(page);
      await measure(t, page, "Note window ⋯ sheet", { root: ".note-win [data-pane-menu].open", buttons: ["*"] });
      await ev(page, () => document.querySelector(".note-win [data-pane-menu-btn]")?.click()); await settle(page, 200);
      for (const l of ["n3", "n4"]) { await ev(page, (s) => document.querySelector(s)?.click(), card(l)); await settle(page, 500); }
      await measure(t, page, "window switcher", { root: ".nw-switch", buttons: ["*"] });
    }, seedFor(bn));

    if (want("dua")) await flow(`${lang} ${vpTag} dua`, lang, vp, "/app/hadith-collections.html", false, async (page) => {
      const t = `${lang} ${vpTag}`;
      await page.click('[data-hadith-tab="dua"]');
      await page.waitForSelector('[data-dua-card="2"] [data-dua-check-open]', { timeout: 20000 });
      await settle(page, 400);
      await page.click('[data-dua-card="2"] [data-dua-check-open]');
      await page.waitForSelector('[data-dua-check-panel="2"] [data-dua-check-member]', { timeout: 20000 });
      await measure(t, page, "Dua check panel (step 1)", { root: "[data-dua-check-panel]", inline: true, buttons: ["*"] });
      await page.click("[data-dua-check-rest-same]");
      await page.click('[data-dua-check-step="2"]'); await page.click("[data-dua-check-rest-ok]");
      await measure(t, page, "Dua check panel (step 2)", { root: "[data-dua-check-panel]", inline: true, buttons: ["*"] });
      await page.click('[data-dua-check-step="3"]');
      await measure(t, page, "Dua check panel (step 3, Save)", { root: "[data-dua-check-panel]", inline: true, buttons: ["[data-dua-check-save]", "*"] });
    }, seedFor(bn));

    if (want("navmenus")) for (const pg of ["notes", "bookmarks", "hadith-collections", "hadith-study"]) await flow(`${lang} ${vpTag} navmenus-${pg}`, lang, vp, pg === "notes" ? NOTES_URL : `/app/${pg}.html`, false, async (page) => {
      const t = `${lang} ${vpTag} ${pg}`;
      await page.waitForSelector(".nav-cat > summary", { timeout: 15000 });
      const n = await ev(page, () => document.querySelectorAll(".nav-cat > summary").length);
      check(`${t}: POSITIVE CONTROL the nav has drop-downs`, n >= 1, String(n));
      for (let i = 0; i < n; i++) {
        await ev(page, (k) => { document.querySelectorAll(".nav-cat[open]").forEach((d) => d.removeAttribute("open")); document.querySelectorAll(".nav-cat > summary")[k].click(); }, i); await settle(page, 400);
        const nm = await ev(page, (k) => (document.querySelectorAll(".nav-cat > summary")[k].textContent || "").trim().slice(0, 14), i);
        await measure(t, page, `nav menu ${i + 1} (${nm})`, { root: ".nav-cat[open] .nav-cat-links", buttons: ["*"] });
      }
    }, seedFor(bn));

    if (want("bmdialog")) await flow(`${lang} ${vpTag} bmdialog`, lang, vp, "/app/bookmarks.html", false, async (page) => {
      const t = `${lang} ${vpTag}`;
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 15000 });
      const roster = [{ personId: "p1", displayName: "Person One" }, { personId: "p2", displayName: "Person Two" }, { personId: "p3", displayName: "Person Three" }];
      await ev(page, async (ro) => { const m = await import("./js/bookmark-popover.js"); m.openBookmarkNamePopover({ defaultName: "Al-Baqarah 255", folders: [{ id: "f1", name: "Folder one", parentId: null }, { id: "f2", name: "Folder two", parentId: null, depth: 1 }], people: [], roster: ro, selectedPersonId: "p1", units: [{ id: "ayah", label: "This āyah", defaultName: "a" }, { id: "range", label: "A range", defaultName: "r", from: 1, to: 5, ayahCount: 286 }, { id: "surah", label: "Whole surah", defaultName: "s" }] }); await new Promise((r) => setTimeout(r, 300)); }, roster);
      await measure(t, page, "Bookmark dialog (add)", { root: ".bm-popover", buttons: ["[data-bm-pop-save]", "[data-bm-pop-cancel]"] });
      await ev(page, () => { const s = document.querySelector("[data-bm-pop-folder]"); if (s) { const o = [...s.options].find((x) => /new/i.test(x.value) || /new|নতুন/i.test(x.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); } } }); await settle(page, 300);
      await measure(t, page, "Bookmark dialog (new folder row open)", { root: ".bm-popover", buttons: ["[data-bm-pop-save]", "[data-bm-pop-cancel]"] });
    }, seedFor(bn));

    if (want("journey")) await flow(`${lang} ${vpTag} journey`, lang, vp, "/app/journey-map.html", false, async (page) => {
      const t = `${lang} ${vpTag}`;
      await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
      await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"] .folder-menu-btn').click()); await settle(page);
      await measure(t, page, "folder ⋯ menu", { root: '.folder-row[data-folder-id="fA"] .bar-palette.open', buttons: ["*"] });
      await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"] [data-folder-move]')?.click()); await settle(page, 500);
      await measure(t, page, "folder picker", { root: "#folderPicker .folder-picker", buttons: ["*"] });
      await page.keyboard.press("Escape"); await settle(page, 300);
      await ev(page, () => document.querySelector(".page-menu-wrap [data-bar-palette-toggle]")?.click()); await settle(page);
      await measure(t, page, "page ⋯ menu", { root: ".page-menu-wrap .bar-palette.open", buttons: ["*"] });
      for (const [nm, id] of [["Favourites dialog", "openFavouritesBtn"], ["Archived dialog", "openArchivedBtn"]]) {
        await ev(page, (i) => document.getElementById(i).click(), id); await settle(page, 500);
        await measure(t, page, nm, { root: "#siyagahDialog .folder-picker", buttons: ["*"] });
        await page.keyboard.press("Escape"); await settle(page, 300);
        await ev(page, () => document.querySelector(".page-menu-wrap [data-bar-palette-toggle]")?.click()); await settle(page, 300);
      }
      await ev(page, () => document.getElementById("openTrashBtn").click()); await settle(page, 700);
      await measure(t, page, "Trash view", { root: "#viewTrash", buttons: ["#trashBackBtn"] });
    }, seedFor(bn));

    if (want("zab")) await flow(`${lang} ${vpTag} zab`, lang, vp, "/app/journey-map.html", false, async (page) => {
      const t = `${lang} ${vpTag}`;
      await page.waitForSelector("#zabBar, #zabCorner", { timeout: 10000 }).catch(() => {});
      const opener = (await ev(page, () => { const e = document.querySelector("#zabBar [data-zab-open]"); return !!e && e.getBoundingClientRect().width > 0; })) ? "#zabBar [data-zab-open]" : "#zabCorner";
      await ev(page, (s) => document.querySelector(s).click(), opener); await settle(page, 900);
      await measure(t, page, "Zab panel (list)", { root: "#zabPanel:not([hidden])", buttons: ["[data-zab-close]", "*"] });
      const added = await ev(page, () => { const i = document.querySelector("#zabPanel input[type=text]"); if (!i) return false; i.value = "Pocket one"; i.dispatchEvent(new Event("input", { bubbles: true })); const b = document.querySelector("#zabPanel [data-zab-add-pocket]"); if (!b) return false; b.click(); return true; });
      await settle(page, 700);
      check(`${t}: POSITIVE CONTROL a pocket was added`, added && (await ev(page, () => !!document.querySelector("#zabPanel [data-zab-pocket], #zabPanel [data-zab-node], #zabPanel [data-zab-pedit]"))), String(added));
      await measure(t, page, "Zab panel (with a pocket)", { root: "#zabPanel:not([hidden])", buttons: ["[data-zab-close]", "*"] });
      await ev(page, () => document.querySelector("#zabPanel [data-zab-pocket]")?.click()); await settle(page, 700);
      await measure(t, page, "Zab panel (pocket open)", { root: "#zabPanel:not([hidden])", buttons: ["[data-zab-close]", "*"] });
      await ev(page, () => document.querySelector("#zabPanel [data-zab-nav=list]")?.click()); await settle(page, 400);
      await ev(page, () => document.querySelector("#zabPanel [data-zab-nav=trash]")?.click()); await settle(page, 700);
      await measure(t, page, "Zab panel (trash)", { root: "#zabPanel:not([hidden])", buttons: ["[data-zab-close]", "*"] });
    }, seedFor(bn));
  }
}

// Script-driven smooth scrolling: every in-scope script must honour reduced motion.
if (!ONLY && (!MONLY || MONLY === "motion")) {
  const files = [...fs.readdirSync(path.join(ROOT, "app/js")).filter((f) => f.endsWith(".js") && !/^(_prev|hifz-|asma|ldog|qcr|quran|word-|screensaver)/.test(f)).map((f) => `app/js/${f}`),
    ...["bookmarks", "records", "notes", "journey-map", "hadith-collections", "hadith-study", "about", "index"].map((f) => `app/${f}.html`)];
  files.push("app/catalogue.html");
  const read = (f) => { const rel = MUTATE && MUTATIONS[MUTATE][0] === f ? MUTATIONS[MUTATE] : null; const b = fs.readFileSync(path.join(ROOT, f), "utf8"); return rel ? b.split(rel[2]).join(rel[3]) : b; };
  const hits = files.filter((f) => /behavior\s*:\s*["']smooth["']/.test(read(f)));
  check("motion: no in-scope script asks for smooth scrolling unconditionally", hits.length === 0, hits.join(", "));
  const cat = read("app/catalogue.html");
  check("motion: the catalogue row highlight does not fade under reduced motion", /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.subj-row-flash\s*\{\s*animation:\s*none/.test(cat));
  check("motion: the catalogue jump asks for instant scrolling under reduced motion", /reduceMotion \? "auto" : "smooth"/.test(cat));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
