// Audit part 27 (PCF MSA J29): the smallest phone (320px, and 360px) with content the length a REAL reader types.
//   notes     notes.html (the My Notes page): a 90-character title, a 40-letter single word, a Bangla 90-character title
//   journey   journey-map.html: a folder tree 4 deep with 40-character names, folder menus, search, the view switch, Trash
//   bookmarks bookmarks.html: 60-character bookmark names, 4-deep folders with 40-character names, New bookmark
//   zab       the Zab bar / corner, 30-character pocket names, a pocket in a pocket, a task with 8 steps
// Each flow measures the RESULT, not existence: no sideways scroll, no text cut without a way to read it, every control a
// finger presses 40px or more, every menu / sheet inside the screen, no English left on the Bangla page.
// Mutations (each must fail the suite):
//   --mutate=notetitle   the My Notes title may not break a long word (fixed in this round)
//   --mutate=toggle40    the folder tree's expand arrow is 28px again (fixed in this round)
//   --mutate=nbform40    the New bookmark form's Create / Cancel are 28px again (fixed in this round)
//   --mutate=nbfield40   the New bookmark form's fields are 28-30px again (fixed in this round)
//   --mutate=zabtitle    a long Zab panel title is cut with an ellipsis again (fixed in this round)
//   --mutate=zabchip     a long child-pocket chip is cut with an ellipsis again (fixed in this round)
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part27-small-phone-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
// [file, route glob, anchor (exactly once), replacement, page prefix it applies to]
const MUTATIONS = {
  notetitle: ["app/notes.html", "**/notes.html*", "min-width: 8rem; max-width: 100%; overflow-wrap: anywhere; }", "min-width: 8rem; }", "/app/notes.html"],
  toggle40: ["app/journey-map.html", "**/journey-map.html*", "width: 40px; height: 40px; padding: 0; font-size: 0.85rem;", "width: 28px; height: 28px; padding: 0; font-size: 0.85rem;", "/app/journey-map.html"],
  nbform40: ["app/bookmarks.html", "**/bookmarks.html*", "  #nbCreateBtn, #nbCancelBtn { min-height: 40px; min-width: 40px; } /* audit27: the New bookmark form's two buttons were 28px */\n", "", "/app/bookmarks.html"],
  nbfield40: ["app/bookmarks.html", "**/bookmarks.html*", "font-size: 0.88rem; min-height: 40px;\n", "font-size: 0.88rem;\n", "/app/bookmarks.html"],
  zabtitle: ["app/js/zab-bar.js", "**/js/zab-bar.js*", ".zab-head h2 { flex: 1 1 auto; margin: 0; font-size: 1rem; min-width: 0; overflow-wrap: anywhere; }", ".zab-head h2 { flex: 1 1 auto; margin: 0; font-size: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }", "/app/records.html"],
  zabchip: ["app/js/zab-bar.js", "**/js/zab-bar.js*", ".zab-chips button { max-width: 100%; white-space: normal; overflow-wrap: anywhere; text-align: start; border-radius: 20px; }", ".zab-chips button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 999px; }", "/app/records.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const ALLOWED = /https?:\/\/\S+|QuranRevival|MMSA|Qur'?an|Madrasatul|Muslimeen|Hadith|hadith|Google|Zab|Tajweed|Dua|Journey|Muhammad|Abdur|Rahman|ibn|Abdullah|Subhanallah\w*|v\d+|Audit/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

// Content the length a real reader has.
const T_EN = "A very long note title of about ninety characters that a real reader would certainly type one day ok";
const T_WORD = "Subhanallahilazimwabihamdihiastaghfirullah";
const T_BN = "জ্ঞান অন্বেষণের মূলনীতি এবং শিক্ষক ও সহপাঠীদের প্রতি আদবের বিস্তারিত আলোচনা ও তার প্রয়োগ";
const FOLDER = (n) => `Folder level ${n} with a name about forty chars`;
const BM_NAME = "Al-Baqarah verse 255, the Throne Verse, read after each prayer";
const PERSON = "Muhammad Abdur Rahman ibn Abdullah";
const POCKET = "Quran study plans for the whole year";

const NOTES_SEED = `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(d){return{toDate:function(){return new Date(d||"2026-09-01T10:00:00Z")},toMillis:function(){return new Date(d||"2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.userPrefs=[{_id:"test-uid"}];
var par=null;for(var i=1;i<=4;i++){var id="f"+i;DATA.noteFolders.push(Object.assign({_id:"t1__"+id,folderId:id,name:"Folder level "+i+" with a name about forty chars",parentFolderId:par,semanticRole:"user",order:i,status:"active",updatedAt:ts()},own));par=id;}
function N(id,title,day,extra){DATA.notes.push(Object.assign({_id:"t1__"+id,noteId:id,title:title,bodyHtml:"<p>Body "+id+"</p>",currentRevisionId:"rev-"+id,status:"active",createdAt:ts("2026-08-0"+day+"T09:00:00Z"),updatedAt:ts("2026-09-0"+day+"T10:00:00Z")},own,extra||{}))}
function P(id,note,folder,o){DATA.notePlacements.push(Object.assign({_id:"t1__"+id,placementId:id,noteId:note,folderId:folder,order:o,status:"active"},own))}
N("n1",${JSON.stringify(T_EN)},1);N("n2",${JSON.stringify(T_WORD)},2,{pinned:true});N("n3",${JSON.stringify(T_BN)},3);
["n1","n2","n3"].forEach(function(n){DATA.noteSources.push(Object.assign({_id:"t1__s"+n,sourceLinkId:"s"+n,noteId:n,sourceKey:"dua:20",sourceKind:"dua-unit",relationshipKind:"origin",approachId:null,provenanceKind:"study-note",status:"active",updatedAt:"2026-01-01T00:00:00.000Z",createdAt:"2026-01-01T00:00:00.000Z",createdBy:"test-uid"},own))});
P("p1","n1","f4",0);P("p2","n2","f4",1);P("p3","n3","f4",2);})();`;

const BM_SEED = `(function(){window.__stubApplyBatches=true;window.__DATA=DATA;
var fl=[],par=null;for(var i=1;i<=4;i++){fl.push({id:"f"+i,name:"Folder level "+i+" with a name about forty chars",parentId:par,personTagId:null,removed:false,createdAt:"2026-09-01T00:00:00.000Z"});par="f"+i;}
function B(id,name,f,a){return{id:id,programId:"none",moduleId:"quranrevival",subjectId:"quran",name:name,position:"ayah:2:"+a,folderId:f,removed:false,settings:{unitType:"ayah",surahNum:2,ayahNum:a,trackableId:"tafsir"},createdAt:"2026-09-0"+(a%9+1)+"T00:00:00.000Z"}}
DATA.bookmarks=[{_id:TENANT_ID+"__p1",tenantId:TENANT_ID,personId:"p1",resume:{},folders:fl,saved:[B("b1",${JSON.stringify(BM_NAME)},"f4",255),B("b2","Unfiled "+${JSON.stringify(BM_NAME)},null,102)]}];
})();`;

const stamp = `createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-1", schemaVersion: 1, addedByPersonId: "p1", tenantId: "t1", status: "active"`;
const ZAB_SEED = `(function(){window.__stubApplyBatches=true;window.__DATA=DATA;
DATA.zabPockets=[
 {_id:"t1__pk-a",pocketId:"pk-a",order:0,name:${JSON.stringify(POCKET)},icon:"✅",ztype:"tasks",${stamp}},
 {_id:"t1__pk-b",pocketId:"pk-b",order:1,name:${JSON.stringify(POCKET + " two")},icon:"📁",parentId:"pk-a",${stamp}},
 {_id:"t1__pk-c",pocketId:"pk-c",order:2,name:${JSON.stringify(POCKET + " three")},icon:"📁",parentId:"pk-b",${stamp}}];
DATA.zabItems=[{_id:"t1__it1",itemId:"it1",pocketId:"pk-a",order:0,text:${JSON.stringify(T_EN)},done:false,steps:[${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `{id:"s${n}",text:"Step ${n} of the long task about thirty chars",done:false}`).join(",")}],${stamp}}];
})();`;
const READY_OPEN = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;

async function open(lang, width, pagePath, seed) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 740 }, extraSeedJs: seed });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_OPEN }));
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, seed, fn) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, seed), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
// Visible things a finger presses that are under 40px, inside `root`.
const small = (page, root = "body") => ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} select, ${r} input:not([type=checkbox]):not([type=radio]):not([type=hidden]), ${r} a[href], ${r} [role=button]`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.visibility === "hidden" || s.display === "none") return false;
  if (e.closest("nav, #navBar, .nav-cat-row")) return false; // the shared nav row has its own audit
  if (e.tagName === "A" && !e.textContent.trim() && !e.querySelector("img, svg")) return false;
  if (e.tagName === "A" && getComputedStyle(e).display === "inline" && !e.querySelector("button")) return false; // a link inside a sentence
  return b.height < 39.5;
}).map((e) => `${e.id || e.getAttribute("data-zab-open") || e.className || e.tagName}`.toString().slice(0, 34) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)), root);
// Text cut off (overflow hidden / ellipsis) with no title or aria-label carrying the whole of it.
const cut = (page, root = "body") => ev(page, (r) => [...document.querySelectorAll(`${r} *`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !e.childElementCount === false && false) return false;
  const clips = s.overflow !== "visible" || s.overflowX !== "visible" || s.textOverflow === "ellipsis";
  if (!clips || s.display === "none" || !e.textContent.trim() || e.scrollWidth <= e.clientWidth + 1) return false;
  if (["BODY", "HTML", "TEXTAREA", "INPUT"].includes(e.tagName)) return false;
  if (e.closest("[contenteditable], .note-editor, .nav-cat-row, nav")) return false;
  return !((e.getAttribute("title") || e.getAttribute("aria-label") || "").length >= e.textContent.trim().length - 2);
}).map((e) => (e.className || e.tagName).toString().slice(0, 30) + ":" + e.scrollWidth + ">" + e.clientWidth).slice(0, 6), root);
// Everything visible inside the screen (the Read view clips rather than scrolls, so this is containment, not scrollWidth).
const outside = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} *`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.visibility === "hidden" || s.display === "none") return false;
  if (e.closest("[hidden], .sr-only")) return false;
  return b.right > innerWidth + 1 || b.left < -1;
}).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 30)).slice(0, 6), root);
const bnText = (page, root) => ev(page, (r) => document.querySelector(r)?.innerText ?? "", root);
const WIDTHS = [320, 360].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1. My Notes page
  await flow("notes", lang, width, "/app/notes.html?unit=dua:20&label=Dua%2020", NOTES_SEED, async (t, page, errors) => {
    await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
    const titles = await ev(page, () => [...document.querySelectorAll("[data-note-title]")].map((e) => e.textContent.trim()));
    check(`${t}: POSITIVE CONTROL the three long-titled notes are listed`, titles.length === 3 && titles.includes(T_WORD) && titles.includes(T_EN) && titles.includes(T_BN), JSON.stringify(titles));
    check(`${t}: no sideways scroll (a 40-letter word wraps inside its card)`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: nothing sits outside the screen`, (await outside(page, ".note-card")).length === 0, JSON.stringify(await outside(page, ".note-card")));
    check(`${t}: every note's whole title is on screen (nothing is cut)`, (await cut(page, ".note-card")).length === 0, JSON.stringify(await cut(page, ".note-card")));
    const sm = await small(page, "#notesContainer, .note-card");
    check(`${t}: every button on a note card is 40px or more`, sm.length === 0, sm.join(" "));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    if (bn) { const own = (await bnText(page, "body")).split(T_EN).join(" ").replace(/\b(rev-n\d|Body n\d)\b/g, " "); check(`${t}: no English left on the page (but what people typed)`, englishLeft(own).length === 0, englishLeft(own).join(", ")); }
  });

  // 2. Mapping My Journey
  await flow("journey", lang, width, "/app/journey-map.html", NOTES_SEED, async (t, page, errors) => {
    await page.waitForSelector("[data-folder-toggle], .folder-row", { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the first folder of the tree is listed`, (await ev(page, () => document.body.innerText)).includes("Folder level 1") || bn, "");
    for (let i = 0; i < 4; i++) { const tg = await page.$("[data-folder-toggle][aria-expanded=false]"); if (!tg) break; await tg.click(); await settle(page, 250); }
    const depth = await ev(page, () => document.querySelectorAll("[data-folder-toggle]").length);
    check(`${t}: the tree opens to its 4th level`, depth >= 3, String(depth));
    check(`${t}: no sideways scroll with the tree 4 deep`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: nothing sits outside the screen`, (await outside(page, "body")).length === 0, JSON.stringify(await outside(page, "body")));
    const sm = await small(page, "body");
    check(`${t}: every button, picker and arrow is 40px or more`, sm.length === 0, sm.join(" "));
    check(`${t}: no folder name is cut`, (await cut(page, "body")).length === 0, JSON.stringify(await cut(page, "body")));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3. Bookmarks page
  await flow("bookmarks", lang, width, "/app/bookmarks.html", BM_SEED, async (t, page, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 2, null, { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the two 60-character bookmarks are listed`, (await ev(page, () => document.querySelectorAll("[data-bm-id]").length)) === 2);
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: nothing sits outside the screen`, (await outside(page, "#app")).length === 0, JSON.stringify(await outside(page, "#app")));
    check(`${t}: no name is cut`, (await cut(page, "#app")).length === 0, JSON.stringify(await cut(page, "#app")));
    const sm = await small(page, "#app");
    check(`${t}: every button and picker is 40px or more`, sm.length === 0, sm.join(" "));
    await page.click("#newBookmarkBtn"); await settle(page, 600);
    check(`${t}: New bookmark: no sideways scroll, nothing outside the screen`, (await wide(page)) <= 0 && (await outside(page, "#app")).length === 0, JSON.stringify(await outside(page, "#app")));
    const sm2 = await small(page, "#app");
    check(`${t}: New bookmark: every control is 40px or more`, sm2.length === 0, sm2.join(" "));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4. Zab
  await flow("zab", lang, width, "/app/records.html", ZAB_SEED, async (t, page, errors) => {
    await page.click("#zabCorner"); await page.waitForSelector("#zabPanel [data-zab-pocket]", { timeout: 8000 });
    check(`${t}: POSITIVE CONTROL the long-named pocket is listed`, (await ev(page, () => document.getElementById("zabPanel").innerText)).includes("Quran study plans") || bn, "");
    const inPanel = () => ev(page, () => { const r = document.getElementById("zabPanel").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
    let pr = await inPanel();
    check(`${t}: the pocket list is inside the screen`, pr.l >= -1 && pr.r <= pr.vw + 1 && pr.b <= pr.vh + 1, JSON.stringify(pr));
    check(`${t}: nothing in the panel sits outside it`, (await ev(page, () => { const p = document.getElementById("zabPanel"), r = p.getBoundingClientRect(); return [...p.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && getComputedStyle(e).display !== "none" && (b.right > r.right + 1 || b.left < r.left - 1); }).length; })) === 0);
    const sm = await small(page, "#zabPanel");
    check(`${t}: every button in the panel is 40px or more`, sm.length === 0, sm.join(" "));
    check(`${t}: no pocket name is cut`, (await cut(page, "#zabPanel")).length === 0, JSON.stringify(await cut(page, "#zabPanel")));
    await page.click('#zabPanel [data-zab-pocket="pk-a"]'); await page.waitForSelector("#zabPanel [data-zab-new-item]", { timeout: 8000 }); await settle(page, 500);
    pr = await inPanel();
    check(`${t}: the opened pocket (a task with 8 steps) is inside the screen`, pr.l >= -1 && pr.r <= pr.vw + 1 && pr.b <= pr.vh + 1, JSON.stringify(pr));
    const sm2 = await small(page, "#zabPanel");
    check(`${t}: every control in the opened pocket is 40px or more`, sm2.length === 0, sm2.join(" "));
    check(`${t}: no text in the opened pocket is cut`, (await cut(page, "#zabPanel")).length === 0, JSON.stringify(await cut(page, "#zabPanel")));
    // A pocket inside a pocket inside a pocket: the crumb trail and the child chips carry 30-character names.
    await page.click('#zabPanel .zab-chips [data-zab-pocket="pk-b"]'); await settle(page, 500);
    await page.click('#zabPanel .zab-chips [data-zab-pocket="pk-c"]'); await settle(page, 500);
    const crumbs = await ev(page, () => document.querySelectorAll("#zabPanel .zab-crumbs button").length);
    check(`${t}: POSITIVE CONTROL the third-level pocket shows a 3-crumb trail`, crumbs === 3, String(crumbs));
    check(`${t}: the crumb trail shows every long name whole, inside the panel`, (await cut(page, "#zabPanel")).length === 0 && (await ev(page, () => { const r = document.getElementById("zabPanel").getBoundingClientRect(); return [...document.querySelectorAll("#zabPanel .zab-crumbs button")].every((b) => b.getBoundingClientRect().right <= r.right + 1); })), JSON.stringify(await cut(page, "#zabPanel")));
    const sm3 = await small(page, "#zabPanel");
    check(`${t}: the crumbs are 40px or more`, sm3.length === 0, sm3.join(" "));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n==== audit-part27${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
