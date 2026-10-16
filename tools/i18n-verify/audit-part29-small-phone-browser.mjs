// Audit part 29 (PCF MSA J29): menus part-way down every MSA page, pop-up folder windows, the Note window's ⋯ menu,
// Favourites / Archived rows, and the shared bookmark dialog on a short phone.
//   bmdialog   the shared bookmark dialog on 320x568: every field and both buttons reachable and pressable
//   folderwin  a pop-up folder window (note-window.js) with a 40-character folder name and 90-character note titles
//   notewin    the Note window's own ⋯ menu with a 90-character title
//   flags      the Favourites and Archived lists (Siyagah flags gate opened) with 90-character titles
//   menus      13 MSA pages scrolled to half their height: every nav menu inside the screen and clear of the Zab corner
//   zabwide    the Zab corner at 768px and wider is clear of the nav row and inside the screen
// Mutations (each must fail the suite):
//   --mutate=bmscroll   the bookmark dialog no longer scrolls inside itself (fixed in this round)
//   --mutate=bmbtn40    the bookmark dialog's Save / Cancel are 36px again (fixed in this round)
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part29-small-phone-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
  // Anchors updated in the Architect's merge review (17 Oct): v11.21 (#916) already carried these two fixes in its own form, which the merge kept.
  bmscroll: ["app/js/bookmark-popover.js", "**/js/bookmark-popover.js*", "width: min(24rem, 100%); max-height: 100%; overflow-y: auto;", "width: min(24rem, 100%);", "/app/"],
  nwtitle: ["app/css/note-window.css", "**/css/note-window.css*", ".note-win.sheet .nw-title { white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; line-height: 1.2; }", "", "/app/"],
  nwmenu: ["app/css/note-window.css", "**/css/note-window.css*", "  .note-win .bar-palette.pane-menu { bottom: var(--nw-switch, 0px);", "  .note-win .bar-palette.pane-menu-off { bottom: var(--nw-switch, 0px);", "/app/"],
  bmbtn40: ["app/js/bookmark-popover.js", "**/js/bookmark-popover.js*", "padding: 0.35rem 0.8rem; min-height: 40px; min-width: 40px;", "padding: 0.35rem 0.8rem; min-height: 36px;", "/app/"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const T_EN = "A very long note title of about ninety characters that a real reader would certainly type one day ok";
const T_BN = "জ্ঞান অন্বেষণের মূলনীতি এবং শিক্ষক ও সহপাঠীদের প্রতি আদবের বিস্তারিত আলোচনা ও তার প্রয়োগ";
const F40 = "Folder with a name of about forty chars";

const NOTES_SEED = `(function(){window.__stubApplyBatches=true;window.__stubRecordTxData=true;window.__DATA=DATA;
var own={tenantId:"t1",ownerPersonId:"p1",ownerUid:"test-uid",schemaVersion:1};
function ts(d){return{toDate:function(){return new Date(d||"2026-09-01T10:00:00Z")},toMillis:function(){return new Date(d||"2026-09-01T10:00:00Z").getTime()}}}
DATA.noteFolders=[];DATA.notes=[];DATA.notePlacements=[];DATA.noteRevisions=[];DATA.noteSections=[];DATA.noteTags=[];DATA.noteTagLinks=[];DATA.noteSources=[];DATA.noteLinks=[];
DATA.noteFolders.push(Object.assign({_id:"t1__fA",folderId:"fA",name:${JSON.stringify(F40)},parentFolderId:null,semanticRole:"user",order:0,status:"active",updatedAt:ts()},own));
DATA.noteFolders.push(Object.assign({_id:"t1__fAk",folderId:"fAk",name:${JSON.stringify(F40 + " two")},parentFolderId:"fA",semanticRole:"user",order:0,status:"active",updatedAt:ts()},own));
function N(id,title,day,extra){DATA.notes.push(Object.assign({_id:"t1__"+id,noteId:id,title:title,bodyHtml:"<p>Body "+id+"</p>",currentRevisionId:"rev-"+id,status:"active",createdAt:ts("2026-08-0"+day+"T09:00:00Z"),updatedAt:ts("2026-09-0"+day+"T10:00:00Z")},own,extra||{}))}
function P(id,note,folder,o){DATA.notePlacements.push(Object.assign({_id:"t1__"+id,placementId:id,noteId:note,folderId:folder,order:o,status:"active"},own))}
N("n1",${JSON.stringify(T_EN)},1,{favourite:true});N("n2",${JSON.stringify(T_BN)},2,{favourite:true});N("n3",${JSON.stringify("Archived " + T_EN)},3,{archived:true});N("n4","Plain note",4);
P("p1","n1","fA",0);P("p2","n2","fA",1);P("p3","n3","fA",2);P("p4","n4","fAk",0);})();`;

const READY_FLAGS = `
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-04", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isSiyagahFlagsReady() { return true; }
export function siyagahFlagsUnavailableReason() { return null; }
`;

const READY_ZAB = `
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);
export const ZAB_DECLARATION = Object.freeze({ ready: true, decision: Object.freeze({ by: "master-architect", on: "2026-10-14", reference: "test-seam" }), gate: "E1", note: "test seam" });
export function isZabReady() { return true; }
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";
export function zabUnavailableReason() { return null; }
`;
async function open(lang, width, height, pagePath, seed, flags) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height }, extraSeedJs: seed });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.route("**/js/zab-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_ZAB }));
  if (flags) await ctx.route("**/js/siyagah-flags-readiness.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: READY_FLAGS }));
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay, .mm-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, height, pagePath, seed, fn, flags = false) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}x${height} ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, pagePath, seed, flags), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 90000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const small = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} select, ${r} input:not([type=checkbox]):not([type=radio]):not([type=hidden]), ${r} a[href], ${r} [role=button]`)].filter((e) => {
  const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.visibility === "hidden" || s.display === "none") return false;
  if (e.tagName === "A" && getComputedStyle(e).display === "inline" && !e.querySelector("button")) return false;
  return b.height < 39.5;
}).map((e) => `${e.id || e.getAttribute("data-flag-list-open") || e.className || e.tagName}`.toString().slice(0, 34) + ":" + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height)), root);
const cut = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} *`)].filter((e) => {
  const s = getComputedStyle(e);
  const clips = s.overflow !== "visible" || s.overflowX !== "visible" || s.textOverflow === "ellipsis";
  if (!e.getBoundingClientRect().width || !clips || s.display === "none" || !e.textContent.trim() || e.scrollWidth <= e.clientWidth + 1) return false;
  if (["BODY", "HTML", "TEXTAREA", "INPUT"].includes(e.tagName) || e.closest("[contenteditable], .note-editor, .nw-details")) return false; // the Details row folds on purpose: its Details button opens it whole
  return !((e.getAttribute("title") || e.getAttribute("aria-label") || "").length >= e.textContent.trim().length - 2);
}).map((e) => (e.className || e.tagName).toString().slice(0, 30) + ":" + e.scrollWidth + ">" + e.clientWidth).slice(0, 6), root);
// The centre of every pressable thing under `root` must hit that thing (or a child of it), not something painted over it.
const covered = (page, root) => ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} a[href], ${r} select, ${r} input`)].filter((e) => {
  let b = e.getBoundingClientRect(); const s = getComputedStyle(e);
  if (!b.width || !b.height || s.display === "none" || s.visibility === "hidden" || e.closest("[hidden]")) return false;
  e.scrollIntoView({ block: "nearest" }); b = e.getBoundingClientRect(); // a menu may scroll inside itself: judge the control once it is scrolled to
  if (b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) return false;
  const cx = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1), cy = Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1);
  const hit = document.elementFromPoint(cx, cy);
  return !hit || !(e === hit || e.contains(hit) || hit.contains(e) || hit.closest("label") === e.closest("label") && !!hit.closest("label"));
}).map((e) => { const b = e.getBoundingClientRect(); const h = document.elementFromPoint(Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1), Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1)); return (e.id || e.className || e.tagName).toString().slice(0, 30) + "@" + Math.round(b.top) + "-" + Math.round(b.bottom) + " hit " + (h ? (h.className || h.tagName).toString().slice(0, 30) : "nothing"); }).slice(0, 6), root);
const inside = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, ok: b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1 }; }, sel);
const WIDTHS = [320, 360].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1. The shared bookmark dialog on 320x568 (and 360x568)
  await flow("bmdialog", lang, width, 568, "/app/bookmarks.html", "", async (t, page, errors) => {
    const folders = [1, 2, 3, 4].map((i) => ({ id: "f" + i, name: `${F40} ${i}`, parentId: i > 1 ? "f" + (i - 1) : null }));
    const people = [1, 2, 3, 4].map((i) => ({ id: "p" + i, name: "Muhammad Abdur Rahman ibn Abdullah " + i }));
    await page.evaluate(async (o) => { const m = await import("./js/bookmark-popover.js"); window.__r = undefined; m.openBookmarkNamePopover(o).then((r) => { window.__r = r; }); await new Promise((r) => setTimeout(r, 250)); },
      { defaultName: "Al-Baqarah verse 255, the Throne Verse, read after each prayer", folders, people, roster: people, selectedPersonId: "p1", units: [{ id: "range", label: "Āyāt", kind: "range", surah: 2, ayahCount: 286, from: 255, to: 257, surahName: "Al-Baqarah" }, { id: "ayah", label: "This āyah", defaultName: "a" }, { id: "page", label: "This page", defaultName: "b" }] });
    check(`${t}: POSITIVE CONTROL the dialog is open with its fields`, await ev(page, () => !!document.querySelector(".bm-popover [data-bm-pop-save]") && !!document.querySelector(".bm-popover input")));
    await page.click('[data-bm-pop-unit="range"]'); await settle(page, 300);
    const pop = await inside(page, ".bm-popover");
    check(`${t}: the dialog is inside the 568px-tall screen`, pop && pop.ok, JSON.stringify(pop));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    const sm = await small(page, ".bm-popover");
    check(`${t}: every field and button is 40px or more`, sm.length === 0, sm.join(" "));
    // Every control can be scrolled to inside the dialog, and pressed (the centre hits it).
    const reach = await ev(page, () => { const pop = document.querySelector(".bm-popover"); const out = []; for (const e of pop.querySelectorAll("input, select, button")) { if (e.type === "checkbox") continue; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(); if (!b.width) continue; const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); const pb = pop.getBoundingClientRect(); if (!(hit && (e === hit || e.contains(hit) || hit.contains(e))) || b.top < 0 || b.bottom > innerHeight + 1 || b.top < pb.top - 1 || b.bottom > pb.bottom + 1) out.push((e.dataset && Object.keys(e.dataset)[0]) || e.tagName); } return out; });
    check(`${t}: every field and both buttons can be scrolled to and pressed`, reach.length === 0, reach.join(" "));
    await page.evaluate(() => document.querySelector("[data-bm-pop-save]").scrollIntoView({ block: "center" }));
    await page.click("[data-bm-pop-save]"); await settle(page, 300);
    const res = await ev(page, () => window.__r);
    check(`${t}: Save pressed after scrolling to it returns the result`, !!res && !!res.name, JSON.stringify(res));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 2. Pop-up folder window + 3. the Note window's ⋯ menu
  await flow("folderwin", lang, width, 740, "/app/journey-map.html", NOTES_SEED, async (t, page, errors) => {
    await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
    await page.click('.folder-row[data-folder-id="fA"] .folder-menu-btn'); await settle(page, 300);
    const item = await page.$('.folder-row[data-folder-id="fA"] [data-folder-window]');
    check(`${t}: POSITIVE CONTROL the folder menu offers Open in its own window`, !!item && await item.isVisible());
    if (!item) return;
    await item.click();
    await page.waitForSelector('.folder-win[data-folder-id="fA"]', { timeout: 5000 }); await settle(page, 500);
    const w = ".folder-win[data-folder-id=fA]";
    const box = await inside(page, w);
    check(`${t}: the folder window is inside the screen`, box && box.ok, JSON.stringify(box));
    check(`${t}: the folder window lists the notes with the long titles`, (await ev(page, (s) => document.querySelector(s).innerText, w)).includes(bn ? "জ্ঞান" : "A very long note title"));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    const sm = await small(page, w);
    check(`${t}: every control in the folder window is 40px or more`, sm.length === 0, sm.join(" "));
    check(`${t}: no title in the folder window is cut`, (await cut(page, w)).length === 0, JSON.stringify(await cut(page, w)));
    check(`${t}: nothing in the folder window is covered`, (await covered(page, w)).length === 0, JSON.stringify(await covered(page, w)));
    // open the 90-character note in a Note window and its ⋯ menu
    const open1 = await page.$(`${w} [data-fw-list] [data-fw-note], ${w} [data-fw-list] [data-note-open], ${w} [data-fw-list] button[data-note-id]`);
    if (!open1) { check(`${t}: POSITIVE CONTROL a note row in the folder window opens a Note window`, false, "no note row selector matched"); return; }
    await open1.click(); await page.waitForSelector(".note-win [data-pane-menu-btn], .note-win [data-win-menu]", { timeout: 6000 }).catch(() => {}); await settle(page, 600);
    const nw = await ev(page, () => !!document.querySelector(".note-win"));
    check(`${t}: POSITIVE CONTROL a Note window is open`, nw);
    if (!nw) return;
    const nwBox = await inside(page, ".note-win:last-of-type, .note-win");
    check(`${t}: the Note window is inside the screen`, nwBox && nwBox.ok, JSON.stringify(nwBox));
    const nsm = await small(page, ".note-win");
    check(`${t}: every control in the Note window is 40px or more`, nsm.length === 0, nsm.join(" "));
    check(`${t}: the Note window's title is not cut`, (await cut(page, ".note-win")).length === 0, JSON.stringify(await cut(page, ".note-win")));
    const menuBtn = await page.$(".note-win [data-pane-menu-btn]");
    check(`${t}: POSITIVE CONTROL the Note window has a ⋯ menu button`, !!menuBtn);
    if (menuBtn) {
      await menuBtn.click(); await settle(page, 400);
      const mb = await inside(page, ".note-win [data-pane-menu]");
      check(`${t}: the Note window's ⋯ menu is inside the screen`, mb && mb.ok, JSON.stringify(mb));
      const msm = await small(page, ".note-win [data-pane-menu]");
      check(`${t}: every item in the ⋯ menu is 40px or more`, msm.length === 0, msm.join(" "));
      check(`${t}: nothing in the ⋯ menu is covered`, (await covered(page, ".note-win [data-pane-menu]")).length === 0, JSON.stringify(await covered(page, ".note-win [data-pane-menu]")) + " " + JSON.stringify(await ev(page, () => { const m = document.querySelector(".note-win [data-pane-menu]"), r = m.getBoundingClientRect(), s = document.querySelector(".nw-switch")?.getBoundingClientRect(); return { menu: [r.top, r.bottom], sw: s && [s.top, s.bottom], v: document.documentElement.style.getPropertyValue("--nw-switch"), bottom: getComputedStyle(m).bottom, vh: innerHeight }; })));
      check(`${t}: no sideways scroll with the menu open`, (await wide(page)) <= 0, String(await wide(page)));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 4. Favourites and Archived
  await flow("flags", lang, width, 740, "/app/journey-map.html#folders", NOTES_SEED, async (t, page, errors) => {
    await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
    for (const [btn, kind, want] of [["#openFavouritesBtn", "favourite", 2], ["#openArchivedBtn", "archived", 1]]) {
      await page.click('[data-bar-palette-toggle="pageMenu"]'); await settle(page, 300);
      await page.click(btn); await page.waitForSelector(`#siyagahDialog [data-flag-list="${kind}"]`, { timeout: 8000 }); await settle(page, 400);
      const rows = await ev(page, () => document.querySelectorAll("#siyagahDialog [data-flag-list-open]").length);
      check(`${t}: POSITIVE CONTROL the ${kind} list holds ${want} long-titled row(s)`, rows === want, String(rows));
      const box = await inside(page, "#siyagahDialog");
      check(`${t}: ${kind}: the dialog is inside the screen`, box && box.ok, JSON.stringify(box));
      check(`${t}: ${kind}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
      check(`${t}: ${kind}: no row title is cut`, (await cut(page, "#siyagahDialog")).length === 0, JSON.stringify(await cut(page, "#siyagahDialog")));
      const sm = await small(page, "#siyagahDialog");
      check(`${t}: ${kind}: every control is 40px or more`, sm.length === 0, sm.join(" "));
      check(`${t}: ${kind}: nothing is covered`, (await covered(page, "#siyagahDialog")).length === 0, JSON.stringify(await covered(page, "#siyagahDialog")));
      await page.click("#siyagahDialog [data-dialog-cancel]"); await page.waitForFunction(() => !document.getElementById("siyagahDialog"));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  }, true);
}

// 5. Every nav menu on every MSA page, with the page scrolled to half its height.
const PAGES = ["notes", "journey-map", "bookmarks", "records", "monitor", "hadith-collections", "hadith-study", "deen-study", "arabic-study", "people", "classes", "homework", "catalogue"];
for (const lang of LANGS) for (const width of WIDTHS) for (const pg of PAGES) {
  await flow(`menus-${pg}`, lang, width, 640, `/app/${pg}.html`, NOTES_SEED, async (t, page, errors) => {
    await ev(page, () => { const d = document.createElement("div"); d.style.height = "2400px"; d.id = "__tall"; document.body.appendChild(d); window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) / 2)); });
    await settle(page, 400);
    const cats = await ev(page, () => [...document.querySelectorAll(".nav-cat > summary")].map((s, i) => i));
    check(`${t}: POSITIVE CONTROL the page has nav menus`, cats.length >= (pg === "hadith-collections" ? 1 : 3), String(cats.length));
    for (const i of cats) {
      await ev(page, (n) => { document.querySelectorAll(".nav-cat[open]").forEach((d) => { d.open = false; }); const sm = document.querySelectorAll(".nav-cat > summary")[n]; sm.click(); window.scrollBy(0, sm.getBoundingClientRect().top - innerHeight / 2); }, i);
      await settle(page, 250);
      const m = await ev(page, () => {
        const d = document.querySelector(".nav-cat[open]"); if (!d) return null;
        const l = d.querySelector(".nav-cat-links"); const b = l.getBoundingClientRect();
        const items = [...l.querySelectorAll("a, button")].filter((e) => e.getBoundingClientRect().width);
        const scrollable = l.scrollHeight > l.clientHeight + 1 && ["auto", "scroll"].includes(getComputedStyle(l).overflowY);
        // each link reachable: either visible in the box or the box scrolls
        const zab = document.getElementById("zabCorner"); const zb = zab && getComputedStyle(zab).display !== "none" ? zab.getBoundingClientRect() : null;
        const overlapsZab = zb && b.left < zb.right && b.right > zb.left && b.top < zb.bottom && b.bottom > zb.top;
        const centre = document.elementFromPoint(Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1), Math.min(Math.max(b.top + Math.min(b.height, 40) / 2, 1), innerHeight - 1));
        return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, scrollable, n: items.length, overlapsZab: !!overlapsZab, topHit: !!centre && l.contains(centre), name: d.querySelector("summary").textContent.trim() };
      });
      if (!m) { check(`${t}: menu ${i} opens`, false, "no open menu"); continue; }
      const tag = `${t} [${m.name}]`;
      check(`${tag}: the menu is inside the screen sideways`, m.l >= -1 && m.r <= m.vw + 1, JSON.stringify(m));
      check(`${tag}: the menu starts on screen (opened with its button mid-screen)`, m.t >= -1 && m.t < m.vh, JSON.stringify(m));
      check(`${tag}: the menu is painted on top (its first item is what a finger hits)`, m.topHit, JSON.stringify(m));
      const cv = await covered(page, ".nav-cat[open] .nav-cat-links");
      check(`${tag}: no menu item is covered (Zab corner, bars) once scrolled to`, cv.length === 0, JSON.stringify(cv));
      check(`${tag}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    }
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// 6. The Zab corner at 768 and wider.
if (!WONLY) for (const width of [768, 1024, 1440]) for (const pg of ["notes", "records", "journey-map", "hadith-study"]) {
  await flow(`zabwide-${pg}`, "en", width, 900, `/app/${pg}.html`, NOTES_SEED, async (t, page, errors) => {
    await ev(page, () => { const d = document.createElement("div"); d.style.height = "2400px"; document.body.appendChild(d); window.scrollTo(0, 800); });
    await settle(page, 300);
    // From 768px the corner gives way to the Zab bar along the bottom edge.
    const z = await inside(page, "#zabBar");
    check(`${t}: POSITIVE CONTROL the Zab bar is on screen along the bottom`, !!z && z.ok && z.b >= z.vh - 1 && z.r - z.l >= z.vw - 1, JSON.stringify(z));
    check(`${t}: no sideways scroll`, (await wide(page)) <= 0, String(await wide(page)));
    const cvBar = await covered(page, "#zabBar");
    check(`${t}: every Zab bar control is what a finger hits at its centre`, cvBar.length === 0, JSON.stringify(cvBar));
    const sm = await small(page, "#zabBar");
    check(`${t}: every Zab bar control is 40px or more`, sm.length === 0, sm.join(" "));
    // Nothing else fixed sits over the bar.
    const over = await ev(page, () => { const bar = document.getElementById("zabBar"); if (!bar) return ["no bar"]; const zb = bar.getBoundingClientRect(); return [...document.body.querySelectorAll("*")].filter((x) => !bar.contains(x) && !x.contains(bar) && ["fixed", "sticky"].includes(getComputedStyle(x).position)).filter((x) => { const s = getComputedStyle(x); const b = x.getBoundingClientRect(); return b.width && b.height && s.visibility !== "hidden" && s.display !== "none" && !x.closest("[hidden]") && parseFloat(s.opacity) > 0 && b.left < zb.right && b.right > zb.left && b.top < zb.bottom - 1 && b.bottom > zb.top + 1; }).map((x) => (x.id || x.className || x.tagName).toString().slice(0, 30)).slice(0, 4); });
    check(`${t}: no other fixed bar or button sits over the Zab bar`, over.length === 0, over.join(" "));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n==== audit-part29${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
