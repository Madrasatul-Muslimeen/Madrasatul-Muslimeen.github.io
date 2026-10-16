// Audit part 28 (PCF MSA J29): the rest of the smallest-phone (320px, and 360px) pass, with content the length a REAL reader types.
//   nwin      pop-up Note windows from notes.html: long title, bottom tab strip with 3 windows, the phone switcher
//   jmenus    journey-map.html: a folder's ⋯ menu with a 40-character name, search with a long query, Favourites / Archived / Trash
//   bmmenu    the Bookmark menu in the nav with 60-character names, and the shared bookmark dialog
//   person    bookmarks.html?person=…&back=1 with a 35-character person's name and ← Back
//   zabnote   Zab → Note (into Mapping My Journey) from a 30-character pocket, with ← Back
//   clear     menus and sheets opened part-way down a page stay inside the screen
// Each flow measures the RESULT, not existence: no sideways scroll, no text cut without a way to read it, every control a
// finger presses 40px or more, every menu / sheet inside the screen, no English left on the Bangla page.
// Mutations (each must fail the suite) are listed in MUTATIONS below.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part28-small-phone-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  nav40: ["app/css/shell.css", "**/css/shell.css*", ".nav-bm-folder-head .nav-bm-handle, .nav-bm-folder-head .nav-bm-rename, .nav-bm-folder-head .nav-bm-del { width: 40px; height: 40px; }\n", "", "/app/bookmarks.html"],
  popfield40: ["app/js/bookmark-popover.js", "**/js/bookmark-popover.js*", "      min-height: 40px; /* audit28: a finger-sized field (they were 29-31px) */\n", "", "/app/bookmarks.html"],
  popbtn40: ["app/js/bookmark-popover.js", "**/js/bookmark-popover.js*", "padding: 0.35rem 0.8rem; min-height: 40px;", "padding: 0.35rem 0.8rem; min-height: 36px;", "/app/bookmarks.html"],
  nwtitle: ["app/css/note-window.css", "**/css/note-window.css*", ".note-win.sheet .nw-title { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; line-height: 1.2; }\n", "", "/app/notes.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();
const ALLOWED = /https?:\/\/\S+|QuranRevival|MMSA|Qur'?an|Madrasatul|Muslimeen|Hadith|hadith|Google|Zab|Tajweed|Dua|Journey|Muhammad|Abdur|Rahman|ibn|Abdullah|Subhanallah\w*|v\d+|Audit/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

// Content the length a real reader has.
const T_EN = "A very long note title of about ninety characters that a real reader would certainly type one day ok";
const T_WORD = "Subhanallahilazimwabihamdihiastaghfirullah";
const T_BN = "জ্ঞান অন্বেষণের মূলনীতি এবং শিক্ষক ও সহপাঠীদের প্রতি আদবের বিস্তারিত আলোচনা ও তার প্রয়োগ";
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
DATA.tenantPeople.push({ _id: "p3", tenantId: TENANT_ID, personId: "p3", name: ${JSON.stringify(PERSON)}, managedByPersonId: "p1", isMinor: true, roles: ["student"] });
var fl=[],par=null;for(var i=1;i<=4;i++){fl.push({id:"f"+i,name:"Folder level "+i+" with a name about forty chars",parentId:par,personTagId:null,removed:false,createdAt:"2026-09-01T00:00:00.000Z"});par="f"+i;}
function B(id,name,f,a){return{id:id,programId:"none",moduleId:"quranrevival",subjectId:"quran",name:name,position:"ayah:2:"+a,folderId:f,removed:false,settings:{unitType:"ayah",surahNum:2,ayahNum:a,trackableId:"tafsir"},createdAt:"2026-09-0"+(a%9+1)+"T00:00:00.000Z"}}
DATA.bookmarks=[{_id:TENANT_ID+"__p1",tenantId:TENANT_ID,personId:"p1",resume:{},folders:fl,saved:[B("b1",${JSON.stringify(BM_NAME)},"f4",255),B("b2","Unfiled "+${JSON.stringify(BM_NAME)},null,102),B("b3","Third "+${JSON.stringify(BM_NAME)},"f1",50)]},
 {_id:TENANT_ID+"__p3",tenantId:TENANT_ID,personId:"p3",resume:{},folders:[],saved:[B("c1","Child: "+${JSON.stringify(BM_NAME)},null,7)]}];
})();`;
// Notes seed plus a favourite and an archived Note, a Note in Trash and a folder in Trash, all with real-length names.
const J_SEED = NOTES_SEED.replace(/\}\)\(\);$/, "") + `
N("n4",${JSON.stringify("Favourite: " + T_EN)},4,{favourite:true});N("n5",${JSON.stringify("Archived: " + T_EN)},5,{archived:true});N("n6",${JSON.stringify("In the Trash: " + T_EN)},6,{status:"retired"});
P("p4","n4","f4",3);P("p5","n5","f4",4);P("p6","n6","f4",5);
DATA.noteFolders.push(Object.assign({_id:"t1__f9",folderId:"f9",name:"A retired folder with a name about forty chars",parentFolderId:"f1",semanticRole:"user",order:9,status:"retired",updatedAt:ts()},own));
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
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : file.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
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
  if (!b.width) return false;
  const clips = s.overflow !== "visible" || s.overflowX !== "visible" || s.textOverflow === "ellipsis";
  if (!clips || s.display === "none" || !e.textContent.trim() || e.scrollWidth <= e.clientWidth + 1) return false;
  if (["BODY", "HTML", "TEXTAREA", "INPUT"].includes(e.tagName)) return false;
  if (e.closest("[contenteditable], .note-editor, .nav-cat-row, nav")) return false;
  if (e.matches(".nw-details .note-pane-meta")) return false; // a closed Details line opens in full with its own Details button
  return !((e.getAttribute("title") || e.getAttribute("aria-label") || "").length >= e.textContent.trim().length - 2);
}).map((e) => (e.className || e.tagName).toString().slice(0, 30) + ":" + e.scrollWidth + ">" + e.clientWidth).slice(0, 6), root);
// Everything visible inside the screen.
const outside = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} *`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.visibility === "hidden" || s.display === "none") return false;
  if (e.closest("[hidden], .sr-only, .nw-tabs, .nw-switch")) return false; // the tab strip scrolls sideways inside itself by design (checked as its own box)
  return b.right > innerWidth + 1 || b.left < -1 || b.bottom > innerHeight + 1;
}).map((e) => (e.id || e.className || e.tagName).toString().slice(0, 30)).slice(0, 6), root);
const bnText = (page, root) => ev(page, (r) => document.querySelector(r)?.innerText ?? "", root);
const WIDTHS = [320, 360].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const PROBE = process.argv.includes("--probe");
const probe = (t, what, v) => { if (PROBE) console.log(`  probe ${t}: ${what} = ${JSON.stringify(v)}`); };

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1. Pop-up Note windows
  await flow("nwin", lang, width, "/app/notes.html?unit=dua:20&label=Dua%2020", NOTES_SEED, async (t, page, errors) => {
    await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
    for (const id of ["n1", "n2", "n3"]) {
      await page.evaluate((i) => document.querySelector(`.note-card[data-note-id="${i}"] [data-note-window]`).click(), id);
      await page.waitForSelector(`.note-win[data-note-id="${id}"]`, { timeout: 8000 }); await settle(page, 300);
    }
    check(`${t}: POSITIVE CONTROL three windows are open`, (await ev(page, () => document.querySelectorAll(".note-win").length)) === 3);
    probe(t, "win", await ev(page, () => [...document.querySelectorAll(".note-win")].map((w) => { const r = w.getBoundingClientRect(); return [w.className, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; })));
    probe(t, "switch", await ev(page, () => { const s = document.getElementById("noteWinSwitch"); if (!s) return null; const r = s.getBoundingClientRect(); return [s.className, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom), s.innerText.slice(0, 80)]; }));
    check(`${t}: no sideways scroll with 3 windows open`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: nothing in the open window or the tab strip sits outside the screen`, (await outside(page, ".note-win:not(.sheet-hidden)")).length === 0 && (await outside(page, "#noteWinSwitch")).length === 0, JSON.stringify([await outside(page, ".note-win:not(.sheet-hidden)"), await outside(page, "#noteWinSwitch")]));
    const sm = [...(await small(page, ".note-win:not(.sheet-hidden)")), ...(await small(page, "#noteWinSwitch"))];
    check(`${t}: every control in the window and the tab strip is 40px or more`, sm.length === 0, sm.join(" "));
    const ct = [...(await cut(page, ".note-win:not(.sheet-hidden)")), ...(await cut(page, "#noteWinSwitch"))];
    check(`${t}: no title is cut without a way to read it`, ct.length === 0, JSON.stringify(ct));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2. Mapping My Journey: folder ⋯ menu, search, Favourites / Archived / Trash
  await flow("jmenus", lang, width, "/app/journey-map.html", J_SEED, async (t, page, errors) => {
    await page.waitForSelector("[data-folder-toggle], .folder-row", { timeout: 15000 });
    for (let i = 0; i < 4; i++) { const tg = await page.$("[data-folder-toggle][aria-expanded=false]"); if (!tg) break; await tg.click(); await settle(page, 250); }
    // Search: a long query that matches the long Note titles, and a 40-letter word.
    await page.fill("#folderSearchInput", "A very long note title of about ninety characters that a real reader"); await settle(page, 600);
    const hits = await ev(page, () => document.body.innerText.includes("A very long note title of about ninety"));
    check(`${t}: Search: POSITIVE CONTROL a long query finds the long-titled Notes`, hits);
    check(`${t}: Search: no sideways scroll, nothing outside the screen`, (await wide(page)) <= 0 && (await ev(page, () => [...document.querySelectorAll("#viewFolders *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1); }).length)) === 0);
    const sms = await small(page, "#viewFolders");
    check(`${t}: Search: every control and result is 40px or more`, sms.length === 0, sms.join(" "));
    const cts = await cut(page, "#viewFolders");
    check(`${t}: Search: no result is cut without a way to read it`, cts.length === 0, JSON.stringify(cts));
    await page.fill("#folderSearchInput", ""); await settle(page, 500);
    const menus = await ev(page, () => [...document.querySelectorAll(".folder-menu-btn[data-bar-palette-toggle]")].map((b) => b.dataset.barPaletteToggle));
    check(`${t}: POSITIVE CONTROL the tree has folder ⋯ menus`, menus.filter((m) => m.startsWith("folderMenu-")).length >= 4, JSON.stringify(menus));
    // An open menu hangs off its row and the PAGE scrolls it into reach: scroll it to the middle, then it must sit inside the screen and
    // every item's centre must hit the item itself (nothing -- nav row, bottom bar, Zab bar -- covers it).
    const contained = async (what) => {
      await ev(page, () => { const p = [...document.querySelectorAll(".bar-palette.open")].pop(); if (p) p.scrollIntoView({ block: "center" }); });
      await settle(page, 200);
      const r = await ev(page, () => [...document.querySelectorAll(".bar-palette.open")].map((p) => { const b = p.getBoundingClientRect(); const items = [...p.querySelectorAll("button, a")].filter((e) => e.getBoundingClientRect().height > 0); const covered = items.filter((e) => { const q = e.getBoundingClientRect(); const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(h && (e === h || e.contains(h))); }).length; return { id: p.id || p.className, l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, sw: p.scrollWidth - p.clientWidth, items: items.length, covered }; }));
      probe(t, what, r);
      check(`${t}: ${what}: a menu is open (positive control)`, r.length >= 1 && r[0].items >= 2, JSON.stringify(r));
      check(`${t}: ${what}: scrolled into reach, the menu is inside the screen, no sideways scroll of its own, nothing covers an item`, r.length >= 1 && r.every((x) => x.l >= -1 && x.r <= x.vw + 1 && x.t >= -1 && x.b <= x.vh + 1 && x.sw <= 1 && x.covered === 0), JSON.stringify(r));
      return r;
    };
    // The deepest folder's ⋯ (a 40-character name, 4 deep).
    const deep = menus.filter((m) => m.startsWith("folderMenu-")).pop();
    await page.evaluate((m) => document.querySelector(`[data-bar-palette-toggle="${m}"]`).scrollIntoView({ block: "center" }), deep);
    await page.click(`[data-bar-palette-toggle="${deep}"]`); await settle(page, 400);
    await contained("deep folder ⋯ menu");
    const smf = await small(page, ".bar-palette");
    check(`${t}: deep folder ⋯ menu: every item is 40px or more`, smf.length === 0, smf.join(" "));
    const ctf = await cut(page, ".bar-palette");
    check(`${t}: deep folder ⋯ menu: no item is cut`, ctf.length === 0, JSON.stringify(ctf));
    check(`${t}: deep folder ⋯ menu: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    await page.keyboard.press("Escape"); await settle(page, 200);
    await page.evaluate(() => document.querySelectorAll("[data-bar-palette-toggle][aria-expanded=true]").forEach((b) => b.click())); await settle(page, 200);
    // The page ⋯ menu and the three views behind it.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 400);
    await contained("page ⋯ menu");
    const smp = await small(page, ".bar-palette");
    check(`${t}: page ⋯ menu: every item is 40px or more`, smp.length === 0, smp.join(" "));
    await page.click("#openFavouritesBtn"); await settle(page, 600);
    probe(t, "fav dialog", await ev(page, () => document.body.innerText.slice(-300)));
    const dlg = ".siyagah-dialog, [role=dialog]";
    check(`${t}: Favourites: a dialog is open (positive control)`, (await ev(page, (s) => [...document.querySelectorAll(s)].some((d) => d.getBoundingClientRect().width > 0), dlg)));
    check(`${t}: Favourites: no sideways scroll, nothing outside the screen`, (await wide(page)) <= 0 && (await outside(page, dlg)).length === 0, JSON.stringify(await outside(page, dlg)));
    const smd = await small(page, dlg);
    check(`${t}: Favourites: every control is 40px or more`, smd.length === 0, smd.join(" "));
    const ctd = await cut(page, dlg);
    check(`${t}: Favourites: no title is cut without a way to read it`, ctd.length === 0, JSON.stringify(ctd));
    await page.keyboard.press("Escape"); await settle(page, 300);
    await page.evaluate(() => { document.querySelectorAll(".siyagah-overlay, [data-dialog-overlay]").forEach((e) => e.remove()); });
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 300);
    await page.click("#openArchivedBtn"); await settle(page, 600);
    check(`${t}: Archived: no sideways scroll, nothing outside the screen`, (await wide(page)) <= 0 && (await outside(page, dlg)).length === 0, JSON.stringify(await outside(page, dlg)));
    const sma = await small(page, dlg);
    check(`${t}: Archived: every control is 40px or more`, sma.length === 0, sma.join(" "));
    const cta = await cut(page, dlg);
    check(`${t}: Archived: no title is cut without a way to read it`, cta.length === 0, JSON.stringify(cta));
    await page.keyboard.press("Escape"); await settle(page, 300);
    await page.evaluate(() => { document.querySelectorAll(".siyagah-overlay, [data-dialog-overlay]").forEach((e) => e.remove()); });
    await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 300);
    await page.click("#openTrashBtn"); await page.waitForSelector("#viewTrash [data-trash-list], #trashEmpty", { timeout: 8000 }); await settle(page, 500);
    check(`${t}: Trash: POSITIVE CONTROL the Note and the folder in Trash are listed`, (await ev(page, () => document.querySelectorAll("#viewTrash .trash-row").length)) >= 2, String(await ev(page, () => document.getElementById("viewTrash").innerText.slice(0, 120))));
    check(`${t}: Trash: no sideways scroll, nothing outside the screen`, (await wide(page)) <= 0 && (await outside(page, "#viewTrash")).length === 0, JSON.stringify(await outside(page, "#viewTrash")));
    const smt = await small(page, "#viewTrash");
    check(`${t}: Trash: every Restore and Back is 40px or more`, smt.length === 0, smt.join(" "));
    const ctt = await cut(page, "#viewTrash");
    check(`${t}: Trash: no name is cut without a way to read it`, ctt.length === 0, JSON.stringify(ctt));
    if (bn) { const own = (await bnText(page, "#viewTrash")).split(T_EN).join(" ").replace(/A retired folder with a name about forty chars|In the Trash:|Folder level \d with a name about forty chars/g, " "); check(`${t}: Trash: no English left (but what people typed)`, englishLeft(own).length === 0, englishLeft(own).join(", ")); }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3. The Bookmark menu in the nav, and the shared bookmark dialog
  await flow("bmmenu", lang, width, "/app/bookmarks.html", BM_SEED, async (t, page, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 2, null, { timeout: 15000 });
    await page.evaluate(() => document.querySelector(".nav-cat-bookmark > summary").click()); await settle(page, 800);
    const rows = await ev(page, () => document.querySelectorAll(".nav-cat-bookmark .nav-bm-row").length);
    check(`${t}: Bookmark menu: POSITIVE CONTROL the 60-character bookmarks are listed`, rows >= 2, String(rows));
    probe(t, "menu box", await ev(page, () => { const r = document.querySelector(".nav-cat-bookmark .nav-cat-links").getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, innerWidth, innerHeight]; }));
    const menuOut = await ev(page, () => [...document.querySelectorAll(".nav-cat-bookmark .nav-cat-links, .nav-cat-bookmark .nav-cat-links *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && getComputedStyle(e).display !== "none" && (b.right > innerWidth + 1 || b.left < -1); }).map((e) => (e.className || e.tagName).toString().slice(0, 30)).slice(0, 6));
    check(`${t}: Bookmark menu: nothing sits sideways outside the screen, no sideways scroll`, menuOut.length === 0 && (await wide(page)) <= 0, JSON.stringify(menuOut));
    const smm = await ev(page, () => [...document.querySelectorAll(".nav-cat-bookmark .nav-cat-links button, .nav-cat-bookmark .nav-cat-links a, .nav-cat-bookmark .nav-cat-links select")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height < 39.5 && getComputedStyle(e).display !== "inline"; }).map((e) => (e.className || e.tagName).toString().slice(0, 28) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)));
    check(`${t}: Bookmark menu: every row, folder button and picker is 40px or more`, smm.length === 0, smm.join(" "));
    const ctm = await cut(page, ".nav-cat-bookmark .nav-cat-links");
    check(`${t}: Bookmark menu: no name is cut without a way to read it`, ctm.length === 0, JSON.stringify(ctm));
    // Part-way down the page, the menu must still be reachable: scrolled into reach, no item is covered by a bar.
    const cov = await ev(page, () => { const l = document.querySelector(".nav-cat-bookmark .nav-cat-links"); l.scrollIntoView({ block: "center" }); return [...l.querySelectorAll(".nav-bm-link, summary, button")].filter((e) => { const q = e.getBoundingClientRect(); if (!q.width || !q.height || q.bottom > innerHeight || q.top < 0) return false; const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return !(h && (e === h || e.contains(h) || h.contains(e))); }).length; });
    check(`${t}: Bookmark menu: part-way down the page nothing covers an item that is on screen`, cov === 0, String(cov));
    if (bn) { const own = (await bnText(page, ".nav-cat-bookmark .nav-cat-links")).split(BM_NAME).join(" "); check(`${t}: Bookmark menu: no English left (but what people typed)`, englishLeft(own.replace(/Unfiled|Third|Folder level \d with a name about forty chars/g, " ")).length === 0, englishLeft(own).join(", ")); }
    await page.evaluate(() => { document.querySelector(".nav-cat-bookmark").open = false; window.scrollTo(0, 0); });
    // The shared bookmark dialog, with a roster of long names, 4-deep folders and a Range.
    await page.evaluate(async ({ BM_NAME, PERSON }) => {
      const m = await import("/app/js/bookmark-popover.js");
      const folders = [1, 2, 3, 4].map((i) => ({ id: "f" + i, name: "Folder level " + i + " with a name about forty chars", depth: i - 1 }));
      const people = [{ id: "p1", name: PERSON }, { id: "p3", name: PERSON + " the second" }];
      const roster = [{ id: "p1", name: PERSON, isSelf: true }, { id: "p3", name: PERSON + " the second", isSelf: false }, { id: "p4", name: PERSON + " the third", isSelf: false }];
      const units = [{ id: "range", kind: "range", label: "Range of āyahs, a long unit label", from: 255, to: 257, ayahCount: 286, defaultName: BM_NAME }, { id: "ayah", kind: "ayah", label: "This āyah", defaultName: BM_NAME }];
      window.__popDone = m.openBookmarkNamePopover({ defaultName: BM_NAME, folders, people, defaultPersonTagId: null, roster, selectedPersonId: "p1", units });
    }, { BM_NAME, PERSON });
    await page.waitForSelector(".bm-popover", { timeout: 8000 }); await settle(page, 500);
    const pop = ".bm-popover";
    const pb = await ev(page, () => { const r = document.querySelector(".bm-popover").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight }; });
    check(`${t}: Bookmark dialog: POSITIVE CONTROL it shows the Assign to rows and the Range fields`, (await ev(page, () => document.querySelectorAll(".bm-pop-assignee-row").length === 3 && !!document.querySelector("[data-bm-pop-range]:not([hidden])"))));
    check(`${t}: Bookmark dialog: inside the screen (top and bottom reachable), no sideways scroll`, pb.l >= -1 && pb.r <= pb.vw + 1 && pb.t >= -1 && pb.b <= pb.vh + 1 && (await wide(page)) <= 0, JSON.stringify(pb));
    const smb = await small(page, pop);
    check(`${t}: Bookmark dialog: every control is 40px or more`, smb.length === 0, smb.join(" "));
    const ctb = await cut(page, pop);
    check(`${t}: Bookmark dialog: no label or name is cut without a way to read it`, ctb.length === 0, JSON.stringify(ctb));
    const inner = await ev(page, () => [...document.querySelectorAll(".bm-popover *")].filter((e) => { const b = e.getBoundingClientRect(), p = document.querySelector(".bm-popover").getBoundingClientRect(); return b.width > 0 && (b.right > p.right + 1 || b.left < p.left - 1) && !e.closest(".bm-pop-assignees, select"); }).map((e) => (e.className || e.tagName).toString().slice(0, 28)).slice(0, 5));
    check(`${t}: Bookmark dialog: nothing pokes out of the dialog's own box`, inner.length === 0, JSON.stringify(inner));
    if (bn) check(`${t}: Bookmark dialog: no English left in the dialog's own words`, englishLeft((await bnText(page, pop)).split(BM_NAME).join(" ").split(PERSON).join(" ").replace(/Folder level \d with a name about forty chars|Range of āyahs, a long unit label|This āyah|the second|the third|āyahs?/g, " ")).length === 0, englishLeft(await bnText(page, pop)).join(", "));
    await page.keyboard.press("Escape"); await settle(page, 200);
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4. A person's bookmarks
  await flow("person", lang, width, "/app/bookmarks.html?person=p3&back=1", BM_SEED, async (t, page, errors) => {
    await page.waitForFunction(() => document.querySelectorAll("[data-bm-id]").length >= 1, null, { timeout: 15000 });
    const body = await bnText(page, "body");
    check(`${t}: POSITIVE CONTROL the child's bookmark and the 35-character name are on the page`, body.includes("Child: Al-Baqarah") && body.includes(PERSON), body.slice(0, 120));
    const back = await ev(page, () => { const b = document.getElementById("bmBackBtn"); const r = b.getBoundingClientRect(); return { shown: !b.hidden && r.width > 0, h: r.height, w: r.width }; });
    check(`${t}: ← Back is shown and 40px or more`, back.shown && back.h >= 39.5, JSON.stringify(back));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    check(`${t}: nothing sits outside the screen sideways`, (await ev(page, () => [...document.querySelectorAll("#app *, #bmBackBtn")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && getComputedStyle(e).display !== "none" && (b.right > innerWidth + 1 || b.left < -1); }).length)) === 0);
    const sm = await small(page, "#app");
    check(`${t}: every button and picker is 40px or more`, sm.length === 0, sm.join(" "));
    const ct = await cut(page, "#app");
    check(`${t}: the person's name and the bookmark names are not cut`, ct.length === 0, JSON.stringify(ct));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n==== audit-part28${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
