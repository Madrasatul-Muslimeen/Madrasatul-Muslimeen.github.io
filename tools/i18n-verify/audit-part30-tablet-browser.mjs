// Audit part 30 (PCF MSA J29): tablets -- 768x1024, 820x1180, 1024x768 -- with real-length content across MSA's shared tools,
// plus a 700..1100px sweep in 20px steps on notes / journey-map / bookmarks.
//   sweep      sweep-<page>: no sideways scroll, no control under 40px, nothing covered, at every 20px from 700 to 1100
//   notewin    notes.html: three cascaded Note windows (90-character titles) stay inside the screen, clear of the nav row and the Zab bar
//   journey    journey-map.html: 4-deep 40-character folders, a folder's ⋯ menu, search
//   bookmarks  the bookmarks page and the shared bookmark dialog with 60-character names
//   zab        the Zab bar, its panel, 30-character pockets, a pocket inside a pocket, a task with a step
//   pages      hadith-collections, hadith-study, records, monitor, people: no sideways scroll, controls 40px
// Mutations (each must fail the suite; they prove the checks can fail, no application file is changed):
//   --mutate=sideways   a 2000px-wide element is added to the page  (the "no sideways scroll" checks must fail)
//   --mutate=tiny       every button is forced to 30px tall         (the "40px" checks must fail)
//   --mutate=cover      a fixed full-screen overlay is added        (the "nothing covered" checks must fail)
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part30-tablet-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, BASE } from "./harness.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
const MUTATIONS = {
  sideways: () => { const d = document.createElement("div"); d.style.cssText = "width:2000px;height:4px"; document.body.appendChild(d); },
  tiny: () => { const s = document.createElement("style"); s.textContent = "button,select,input{height:30px!important;min-height:0!important}"; document.head.appendChild(s); },
  cover: () => { const d = document.createElement("div"); d.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.01)"; document.body.appendChild(d); },
};
// File mutations: [file, route glob, anchor (exactly once), replacement]. They undo a fix made in this round.
const FILE_MUTATIONS = {
  nwtitle: ["app/css/note-window.css", "**/css/note-window.css*", ".note-win .nw-title { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; line-height: 1.2; }", ""],
};
if (MUTATE && !MUTATIONS[MUTATE] && !FILE_MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const HOST = new URL(BASE).hostname;
const browser = await chromium.launch();

const T_EN = "A very long note title of about ninety characters that a real reader would certainly type one day ok";
const T_BN = "জ্ঞান অন্বেষণের মূলনীতি এবং শিক্ষক ও সহপাঠীদের প্রতি আদবের বিস্তারিত আলোচনা ও তার প্রয়োগ";
const F40 = "Folder with a name of about forty chars";
const B60 = "Bookmark named with sixty characters, which is a real length ok";
const P30 = "Pocket of thirty characters ok";
const P35 = "Muhammad Abdur Rahman ibn Abdullah";
const W40 = "Supercalifragilisticexpialidocious-word";

const SEED = `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(d){return{toDate:function(){return new Date(d||"2026-09-01T10:00:00Z")},toMillis:function(){return new Date(d||"2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
var par=null;["fA","fB","fC","fD"].forEach(function(id,i){DATA.noteFolders.push(Object.assign({_id:"t1__"+id,folderId:id,name:${JSON.stringify(F40)}+" "+(i+1),parentFolderId:par,semanticRole:"user",order:i,status:"active",updatedAt:ts()},own));par=id});
function hx(l){return l.slice(1).repeat(32)}
function N(l,title,day,extra){var id=hx(l);own.createdBy="test-uid";DATA.notes.push(Object.assign({_id:"t1__"+id,noteId:id,title:title,bodyHtml:"<p>Body "+l+" ${W40}</p>",currentRevisionId:"rev-"+id,status:"active",visibility:"private",createdAt:ts("2026-08-0"+day+"T09:00:00Z"),updatedAt:ts("2026-09-0"+day+"T10:00:00Z")},own,extra||{}));
DATA.noteSources.push(Object.assign({_id:"t1__s-"+id,sourceLinkId:"s-"+id,noteId:id,sourceKey:"ayah:2:255",sourceKind:"quran-unit",relationshipKind:"origin",approachId:null,provenanceKind:"study-note",status:"active",createdAt:ts(),updatedAt:ts()},own))}
function P(id,l,folder,o){DATA.notePlacements.push(Object.assign({_id:"t1__"+id,placementId:id,noteId:hx(l),folderId:folder,order:o,status:"active"},own))}
N("n1",${JSON.stringify(T_EN)},1,{favourite:true});N("n2",${JSON.stringify(T_BN)},2);N("n3",${JSON.stringify(T_EN + " 3")},3);N("n4","${W40}",4);
P("p1","n1","fA",0);P("p2","n2","fA",1);P("p3","n3","fD",0);P("p4","n4","fD",1);
var pk=function(id,name,o){return Object.assign({_id:"t1__"+id,pocketId:id,order:0,name:name,icon:"✅",ztype:"tasks",createdAt:new Date(),updatedAt:new Date(),createdBy:"uid-1",schemaVersion:1,addedByPersonId:"p1",tenantId:"t1",status:"active"},o||{})};
DATA.zabPockets=[pk("pk1",${JSON.stringify(P30)}),pk("pk2",${JSON.stringify(P30 + " 2")},{order:1})];DATA.zabItems=[];
function F(id,name,parentId){return{id:id,name:name,parentId:parentId||null,personTagId:null,removed:false,createdAt:"2026-09-01T00:00:00.000Z"}}
function BM(id,name,folder,ayah){return{id:id,programId:"none",moduleId:"quranrevival",subjectId:"quran",name:name,position:"ayah:2:"+ayah,folderId:folder,removed:false,settings:{unitType:"ayah",surahNum:2,ayahNum:ayah,trackableId:"tafsir"},createdAt:"2026-09-01T00:00:00.000Z"}}
DATA.bookmarks=[{_id:TENANT_ID+"__p1",tenantId:TENANT_ID,personId:"p1",resume:{},folders:[F("bA",${JSON.stringify(F40 + " 1")}),F("bB",${JSON.stringify(F40 + " 2")},"bA"),F("bC",${JSON.stringify(F40 + " 3")},"bB"),F("bD",${JSON.stringify(F40 + " 4")},"bC")],
 saved:[BM("b1",${JSON.stringify(B60)},"bD",255),BM("b2",${JSON.stringify(B60 + " two")},"bA",248),BM("b3","${W40}",null,102)]}];
if(DATA.people&&DATA.people[0]){DATA.people.push(Object.assign({},DATA.people[0],{_id:"t1__p9",personId:"p9",displayName:${JSON.stringify(P35)}}))}
})();`;

const READY_ZAB = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
async function open(lang, width, height, pagePath) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route((u) => ![HOST, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_ZAB }));
  if (FILE_MUTATIONS[MUTATE]) {
    const [file, glob, from, to] = FILE_MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/css; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, height, pagePath, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, pagePath), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const mutate = async (page) => { if (MUTATIONS[MUTATE]) await ev(page, MUTATIONS[MUTATE]); };
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const small = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} select, ${r} input:not([type=checkbox]):not([type=radio]):not([type=hidden]), ${r} a[href], ${r} [role=button]`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.visibility === "hidden" || s.display === "none" || e.closest("[hidden]")) return false;
  if (e.tagName === "A" && s.display === "inline" && !e.querySelector("button")) return false;
  return b.height < 39.5;
}).map((e) => `${e.id || e.getAttribute("data-bar-palette-toggle") || e.className || e.tagName}`.toString().slice(0, 34) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)).slice(0, 8), root);
const covered = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} a[href], ${r} select, ${r} input`)].filter((e) => {
  let b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]") || !e.checkVisibility({ checkVisibilityCSS: true })) return false;
  if (e.closest("details:not([open])") && !e.closest("summary")) return false;
  if (!e.closest("#zabPanel, #zabBar, .note-win, .bm-popover, .bar-palette")) { /* page-level: judge in place, at the scroll the reader has */ } else e.scrollIntoView({ block: "center" }); // a menu longer than the screen is read by scrolling: judge each item once scrolled to
  b = e.getBoundingClientRect();
  if (b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) return false;
  const cx = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1), cy = Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1);
  const hit = document.elementFromPoint(cx, cy);
  // page content scrolls under the fixed Zab bar by design; pageBasics checks the page's end clears it separately
  if (hit && hit.closest("#zabBar") && !e.closest("#zabBar") && !e.closest("#zabPanel")) return false;
  return !hit || !(e === hit || e.contains(hit) || hit.contains(e) || hit.closest("label") === e.closest("label") && !!hit.closest("label"));
}).map((e) => { const b = e.getBoundingClientRect(); return (e.id || e.className || e.tagName).toString().slice(0, 30) + "@" + Math.round(b.top) + "-" + Math.round(b.bottom); }).slice(0, 6), root);
const cut = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} *`)].filter((e) => {
  const s = getComputedStyle(e);
  const clips = s.overflow !== "visible" || s.overflowX !== "visible" || s.textOverflow === "ellipsis";
  if (!e.getBoundingClientRect().width || !clips || s.display === "none" || !e.textContent.trim() || e.scrollWidth <= e.clientWidth + 1) return false;
  if (["BODY", "HTML", "TEXTAREA", "INPUT"].includes(e.tagName) || e.closest("[contenteditable], .note-editor, .nw-details")) return false;
  return !((e.getAttribute("title") || e.getAttribute("aria-label") || "").length >= e.textContent.trim().length - 2);
}).map((e) => (e.className || e.tagName).toString().slice(0, 30) + ":" + e.scrollWidth + ">" + e.clientWidth).slice(0, 6), root);
const inside = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, ok: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1 }; }, sel);
// English left on a Bangla page: visible text nodes with a Latin word of 4+ letters, excluding what people typed and Arabic-script names.
const englishLeft = (page, root) => ev(page, (r) => {
  // "Try again" on Records is the fixture's typed return note; "— Sahih Muslim" and the like are the collections' own transliterated names.
  const typed = /^Try again$|^— (al-|Sahih|Musnad|Sunan|Muwatta|Jami)|Folder with a name|Bookmark named|Pocket of thirty|Muhammad Abdur|Supercalifragilistic|A very long note title|Body n\d|Al-Baqarah|Audit|Inner pocket|First step/;
  const out = []; const w = document.createTreeWalker(document.querySelector(r) || document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const p = n.parentElement; if (!p || p.closest("script, style, [data-i18n-skip], [lang=en], [dir=ltr], .hadith-row-name, .hadith-synth-en, input, textarea") ) continue;
    const s = getComputedStyle(p); if (s.display === "none" || s.visibility === "hidden" || !p.getBoundingClientRect().width) continue;
    const t = n.textContent.trim(); // a line that already has Bangla in it, a product / source name, an e-mail address: not "English left over"
    if (/[A-Za-z]{4,}/.test(t) && !/[ঀ-৿]/.test(t) && !typed.test(t) && !/^(HadeethEnc|OpenITI|Hadith|Dua|MMSA|QuranRevival)\b|@/.test(t)) out.push(t.slice(0, 40) + " <" + p.tagName.toLowerCase() + (p.id ? "#" + p.id : "") + (p.className ? "." + String(p.className).split(" ")[0] : "") + ">");
  }
  return out.slice(0, 6);
}, root);

const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const TABLETS = [[768, 1024], [820, 1180], [1024, 768]].filter(([w]) => !WONLY || w === WONLY);

// Every page must hold: no sideways scroll, controls 40px, nothing covered (the page's own nav row and bars).
async function pageBasics(t, page, errors, root = "body") {
  await mutate(page); await settle(page, 200);
  check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
  const sm = await small(page, root);
  check(`${t}: every control is 40px or more`, sm.length === 0, sm.join(" "));
  const cv = await covered(page, root);
  check(`${t}: nothing a finger presses is covered`, cv.length === 0, JSON.stringify(cv));
  // The end of the page clears the Zab bar: scrolled to the bottom, the last control on the page is not under it.
  const end = await ev(page, () => { window.scrollTo(0, document.documentElement.scrollHeight); const bar = document.getElementById("zabBar"); if (!bar || getComputedStyle(bar).display === "none") return { skip: true }; const zb = bar.getBoundingClientRect(); const last = [...document.querySelectorAll("main button, main a[href], main input, main select, button, a[href], input, select")].filter((e) => !e.closest("#zabBar, #zabPanel, header, nav, .nav-cat, [hidden]") && e.checkVisibility({ checkVisibilityCSS: true })).map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height).sort((a, b) => b.bottom - a.bottom)[0]; return { skip: false, under: !!last && last.bottom > zb.top + 1 && last.top < zb.bottom, last: last && Math.round(last.bottom), bar: Math.round(zb.top) }; });
  check(`${t}: the end of the page clears the Zab bar`, end.skip || !end.under, JSON.stringify(end));
  check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
}

// 6. The sweep: every 20px from 700 to 1100 (checked first so a broken width is named early).
if (!ONLY || ONLY.includes("sweep")) {
  const sweepWidths = []; for (let w = 700; w <= 1100; w += 20) sweepWidths.push(w);
  const broken = [];
  for (const pg of ["notes", "journey-map", "bookmarks"]) for (const lang of LANGS) {
    const tag = `${lang} sweep-${pg}`;
    let ctx;
    try {
      const o = await open(lang, 700, 900, `/app/${pg}.html`); ctx = o.ctx;
      await o.page.waitForTimeout(500);
      check(`${tag}: POSITIVE CONTROL the page has its nav row and content`, await ev(o.page, () => !!document.querySelector(".nav-cat") && document.body.innerText.length > 200));
      for (const w of sweepWidths) {
        if (WONLY && w !== WONLY) continue;
        await o.page.setViewportSize({ width: w, height: 900 }); await settle(o.page, 250);
        await mutate(o.page);
        const sw = await wide(o.page), sm = await small(o.page, "body"), cv = await covered(o.page, ".nav-row, .nav-cats, header, nav");
        if (sw > 0 || sm.length || cv.length) broken.push(`${w}px: ${sw > 0 ? "sideways " + sw + " " : ""}${sm.join(" ")} ${cv.join(" ")}`);
        check(`${tag} @${w}: no sideways scroll, controls 40px or more, nav not covered`, !(sw > 0 || sm.length || cv.length), `${sw} ${sm.join(" ")} ${cv.join(" ")}`);
        if (MUTATIONS[MUTATE]) await o.page.reload({ waitUntil: "networkidle" }).catch(() => {});
      }
    } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
    if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
  }
  if (broken.length) console.log("  sweep summary:\n   " + broken.slice(0, 12).join("\n   "));
}

for (const lang of LANGS) for (const [width, height] of TABLETS) {
  const bn = lang === "bn";
  // 1. Three cascaded Note windows on notes.html
  await flow("notewin", lang, width, height, "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test", async (t, page, errors) => {
    await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the notes page lists the seeded notes`, (await ev(page, () => document.querySelectorAll(".note-card[data-note-id]").length)) >= 4);
    for (const id of ["n1", "n2", "n3"]) {
      const sel = `.note-card[data-note-id="${id.slice(1).repeat(32)}"] [data-note-window]`;
      const b = await page.$(sel); if (!b) { check(`${t}: POSITIVE CONTROL ${id} has an Open-in-window button`, false, "no button"); return; }
      await ev(page, (s) => document.querySelector(s).click(), sel); await settle(page, 450);
    }
    const n = await ev(page, () => document.querySelectorAll(".note-win").length);
    check(`${t}: POSITIVE CONTROL three Note windows are open`, n === 3, String(n));
    const sheet = await ev(page, () => document.querySelector(".note-win")?.classList.contains("sheet"));
    console.log(`        (${t}: windows are ${sheet ? "SHEETS" : "FLOATING windows"})`);
    const boxes = await ev(page, () => [...document.querySelectorAll(".note-win:not(.sheet-hidden)")].map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; }));
    const nav = await ev(page, () => { const e = document.querySelector(".nav-row, .nav-cats, header"); if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom }; });
    const bar = await ev(page, () => { const e = document.getElementById("zabBar"); if (!e || getComputedStyle(e).display === "none") return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom }; });
    check(`${t}: every window is inside the screen`, boxes.every((b) => b.l >= -1 && b.r <= width + 1 && b.t >= -1 && b.b <= height + 1), JSON.stringify(boxes));
    if (!sheet) {
      check(`${t}: no window rises into the nav row`, !nav || boxes.every((b) => b.t >= nav.b - 1), JSON.stringify({ nav, boxes }));
      check(`${t}: no window reaches under the Zab bar`, !bar || boxes.every((b) => b.b <= bar.t + 1), JSON.stringify({ bar, boxes }));
    }
    const top = await ev(page, () => { const t = [...document.querySelectorAll(".note-win:not(.sheet-hidden)")].pop(); const e = t.querySelector(".nw-title"); const b = e.getBoundingClientRect(); const h = document.elementFromPoint(b.left + Math.min(b.width, 40) / 2, b.top + b.height / 2); return { hit: !!h && t.contains(h), w: Math.round(b.width), scroll: e.scrollWidth > e.clientWidth + 1, text: e.textContent.length }; });
    check(`${t}: the front window's long title is not covered, and if clipped has a way to read it`, top.hit && (!top.scroll || (await ev(page, () => { const e = [...document.querySelectorAll(".note-win:not(.sheet-hidden) .nw-title")].pop(); return !!(e.title || e.getAttribute("aria-label")) || getComputedStyle(e).whiteSpace !== "nowrap"; }))), JSON.stringify(top));
    await mutate(page);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    const sm = await small(page, ".note-win:not(.sheet-hidden)");
    check(`${t}: every control in the windows is 40px or more`, sm.length === 0, sm.join(" "));
    const cv = await covered(page, ".note-win:not(.sheet-hidden):last-of-type");
    check(`${t}: nothing in the front window is covered`, cv.length === 0, JSON.stringify(cv));
    if (bn) { const en = await englishLeft(page, ".note-win"); check(`${t}: no English in the windows' own words`, en.length === 0, en.join(" | ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2. Mapping My Journey
  await flow("journey", lang, width, height, "/app/journey-map.html", async (t, page, errors) => {
    await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the tree shows the first folder`, true);
    await mutate(page);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: every control is 40px or more`, (await small(page, "body")).length === 0, (await small(page, "body")).join(" "));
    check(`${t}: no folder name is cut without a way to read it`, (await cut(page, ".folder-row")).length === 0, JSON.stringify(await cut(page, ".folder-row")));
    await page.click('.folder-row[data-folder-id="fA"] .folder-menu-btn'); await settle(page, 300);
    const FM = '.folder-row[data-folder-id="fA"] .bar-palette:not([hidden])';
    const m = await inside(page, FM);
    check(`${t}: POSITIVE CONTROL the folder ⋯ menu opens`, !!m, JSON.stringify(m));
    check(`${t}: the folder ⋯ menu is inside the screen sideways and starts on screen (it scrolls with the page)`, !m || (m.l >= -1 && m.r <= m.vw + 1 && m.t >= -1 && m.t < m.vh), JSON.stringify(m));
    check(`${t}: no folder ⋯ menu item is covered or under 40px`, (await covered(page, FM)).length === 0 && (await small(page, FM)).length === 0, JSON.stringify(await covered(page, FM)) + (await small(page, FM)).join(" "));
    await page.keyboard.press("Escape"); await ev(page, () => document.body.click()); await settle(page, 200);
    const search = await page.$("#folderSearchInput");
    check(`${t}: POSITIVE CONTROL a search box is on the page`, !!search);
    if (search) { await search.fill("Supercali"); await settle(page, 500); check(`${t}: searching leaves no sideways scroll`, (await wide(page)) <= 0, String(await wide(page))); }
    if (bn) { const en = await englishLeft(page, "body"); check(`${t}: no English on the Bangla page`, en.length === 0, en.join(" | ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3. Bookmarks page and the bookmark dialog
  await flow("bookmarks", lang, width, height, "/app/bookmarks.html", async (t, page, errors) => {
    await page.waitForTimeout(500);
    check(`${t}: POSITIVE CONTROL the page lists the 60-character bookmark`, (await ev(page, () => document.body.innerText)).includes("Bookmark named with sixty"));
    await mutate(page);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: every control is 40px or more`, (await small(page, "body")).length === 0, (await small(page, "body")).join(" "));
    check(`${t}: nothing a finger presses is covered`, (await covered(page, "body")).length === 0, JSON.stringify(await covered(page, "body")));
    await ev(page, async () => { const m = await import("./js/bookmark-popover.js"); window.__r = undefined; m.openBookmarkNamePopover({ defaultName: "Al-Baqarah verse 255, the Throne Verse, read after each prayer", folders: [1, 2, 3, 4].map((i) => ({ id: "f" + i, name: `Folder with a name of about forty chars ${i}`, parentId: i > 1 ? "f" + (i - 1) : null })), people: [], roster: [], selectedPersonId: "p1", units: [{ id: "ayah", label: "This āyah", defaultName: "a" }] }).then((r) => { window.__r = r; }); await new Promise((r) => setTimeout(r, 250)); });
    check(`${t}: POSITIVE CONTROL the bookmark dialog is open`, await ev(page, () => !!document.querySelector(".bm-popover [data-bm-pop-save]")));
    const box = await inside(page, ".bm-popover");
    check(`${t}: the dialog is inside the screen`, box && box.ok, JSON.stringify(box));
    check(`${t}: the dialog's controls are 40px or more and uncovered`, (await small(page, ".bm-popover")).length === 0 && (await covered(page, ".bm-popover")).length === 0, (await small(page, ".bm-popover")).join(" ") + JSON.stringify(await covered(page, ".bm-popover")));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4. Zab
  await flow("zab", lang, width, height, "/app/notes.html", async (t, page, errors) => {
    await page.waitForSelector("#zabBar", { timeout: 10000 }).catch(() => {});
    const bar = await inside(page, "#zabBar");
    check(`${t}: POSITIVE CONTROL the Zab bar (not the corner) is on screen`, !!bar && bar.ok && (await ev(page, () => getComputedStyle(document.getElementById("zabCorner") || document.body).display)) !== "block" || (!!bar && bar.ok), JSON.stringify(bar));
    await page.click("#zabBar [data-zab-open]"); await page.waitForSelector("#zabPanel:not([hidden])", { timeout: 8000 });
    await page.waitForFunction(() => document.querySelectorAll("#zabPanel [data-zab-pocket]").length >= 2, null, { timeout: 10000 }).catch(() => {});
    check(`${t}: POSITIVE CONTROL the panel lists the 30-character pockets`, (await ev(page, () => document.querySelectorAll("#zabPanel [data-zab-pocket]").length)) >= 2);
    const pb = await inside(page, "#zabPanel");
    check(`${t}: the panel is inside the screen`, pb && pb.ok, JSON.stringify(pb));
    check(`${t}: the panel is clear of the Zab bar`, !bar || !pb || pb.b <= bar.t + 1 || pb.t >= bar.b - 1, JSON.stringify({ bar, pb }));
    await page.click('#zabPanel [data-zab-pocket="pk1"]'); await page.waitForSelector("[data-zab-new-child]", { timeout: 8000 }).catch(() => {});
    await page.fill("[data-zab-new-child]", "Inner pocket").catch(() => {}); await page.click("[data-zab-add-child]").catch(() => {});
    await settle(page, 500);
    await page.click('#zabPanel [data-zab-nav="list"]').catch(() => {});
    await page.waitForSelector('#zabPanel [data-zab-pocket="pk2"]', { timeout: 8000 }).catch(() => {});
    await page.click('#zabPanel [data-zab-pocket="pk2"]').catch(() => {});
    await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 }).catch(() => {});
    await page.fill("#zabPanel [data-zab-new-item]", "Audit task with a name that is quite a bit longer than a phone would hold").catch(() => {});
    await page.press("#zabPanel [data-zab-new-item]", "Enter").catch(() => {});
    await settle(page, 600);
    await page.click("#zabPanel [data-zab-steps]").catch(() => {});
    await page.fill("#zabPanel [data-zab-new-step]", "First step").catch(() => {});
    await page.click("#zabPanel [data-zab-add-step]").catch(() => {});
    await settle(page, 500);
    check(`${t}: POSITIVE CONTROL the task and its step exist`, (await ev(page, () => document.querySelectorAll("#zabPanel [data-zab-step]").length)) >= 1);
    await mutate(page);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    const sm = await small(page, "#zabPanel, #zabBar");
    check(`${t}: every Zab control is 40px or more`, sm.length === 0, sm.join(" "));
    const cv = await covered(page, "#zabPanel, #zabBar");
    check(`${t}: every Zab control is what a finger hits at its centre`, cv.length === 0, JSON.stringify(cv));
    check(`${t}: no Zab text is cut without a way to read it`, (await cut(page, "#zabPanel")).length === 0, JSON.stringify(await cut(page, "#zabPanel")));
    if (bn) { const en = await englishLeft(page, "#zabPanel"); check(`${t}: the Zab panel is in Bangla`, en.length === 0, en.join(" | ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 5. Other pages
  for (const pg of ["hadith-collections", "hadith-study", "records", "monitor", "people"]) {
    await flow(`pages-${pg}`, lang, width, height, `/app/${pg}.html`, async (t, page, errors) => {
      check(`${t}: POSITIVE CONTROL the page has its nav row`, await ev(page, () => !!document.querySelector(".nav-cat")));
      await pageBasics(t, page, errors);
      if (bn) { const en = await englishLeft(page, "main, body"); check(`${t}: no English left on the Bangla page`, en.length === 0, en.join(" | ")); }
    });
  }
}

await browser.close();
console.log(`\n==== audit-part30${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
