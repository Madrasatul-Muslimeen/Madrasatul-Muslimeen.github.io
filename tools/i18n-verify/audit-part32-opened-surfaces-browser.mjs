// Audit part 32 (PCF MSA J29): the windows, menus and dialogs that only exist once opened, and the Dua ✓ Check at tablet width.
//   control   the detector finds seeded defects (English aria-label, empty button, literal entity)
//   notes     notes.html: Note window, three windows + switcher, window ⋯ menu, Bookmark menu, bookmark dialog
//   journey   journey-map.html: folder ⋯ menu, page ⋯ menu, Favourites / Archived dialogs, Trash, folder picker, Zab panel
//   bookmarks bookmarks.html: Bookmark menu and the bookmark dialog
//   dua       hadith-collections.html Dua tab at 768x1024, 820x1180, 1024x768: complete a ✓ Check, progress, 40px, Zab corner, Back
// For each surface: it really opened (positive control), the scan() of part 31 is clean (Bangla attributes, names, entities), Escape closes it and
// focus returns to the control that opened it, and a modal one keeps Tab inside.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part32-opened-surfaces-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
// name: [file, route glob, anchor (exactly once), replacement, page path it applies to]. Filled in with the fixes.
const MUTATIONS = {
  // each one puts a fix back to the old behaviour: it must fail the suite where the defect shows
  winfocus: ["app/js/note-window.js", "**/js/note-window.js*", "    if (held) returnFocus(v);\n", "\n", "/app/notes.html"],
  trap: ["app/js/modal-focus.js", "**/js/modal-focus.js*", 'if (e.key !== "Tab" || !root.isConnected) return;', "return;", "/app/"],
  restore: ["app/js/modal-focus.js", "**/js/modal-focus.js*", "if (back) back.focus({ preventScroll: true });", "", "/app/"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// Runs in the page: part 31's scan(), copied unchanged.
function scan(bn) {
  const out = { attrs: [], unnamed: [], entities: [] };
  const desc = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 48);
  const latin = (s) => /[A-Za-z]{3,}/.test(s.replace(/Mapping My Journey|https?:\/\/\S*|e\.g\.|MMSA|\((?:Ctrl|Alt|Shift)\+[A-Za-z+]+\)/g, "")); // part 31's, plus keyboard-shortcut hints like (Ctrl+Shift+X): a key's name is not translated
  const ent = /&(?:[a-z]+|#\d+);/i;
  for (const e of document.querySelectorAll("*")) {
    if (e.closest("script, style, [data-i18n-skip], [contenteditable=true], .note-editor")) continue;
    for (const a of ["aria-label", "title", "alt", "placeholder", "aria-description"]) {
      const v = e.getAttribute(a); if (v == null) continue;
      if (ent.test(v)) out.entities.push(`${desc(e)}[${a}]=${v}`);
      if (bn && v.trim() && latin(v)) out.attrs.push(`${desc(e)}[${a}]=${v.slice(0, 40)}`);
    }
    if (!["TEXTAREA", "SCRIPT", "STYLE"].includes(e.tagName)) {
      for (const n of e.childNodes) if (n.nodeType === 3 && ent.test(n.nodeValue)) out.entities.push(`${desc(e)} text=${n.nodeValue.trim().slice(0, 40)}`);
    }
    if (e.matches("button, a[href], [role=button], select, input:not([type=hidden]), textarea, summary")) {
      if (e.closest("[hidden]") || getComputedStyle(e).display === "none") continue;
      let name = (e.getAttribute("aria-label") || "").trim() || (e.getAttribute("title") || "").trim();
      const lb = e.getAttribute("aria-labelledby");
      if (!name && lb) name = lb.split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || "").join("").trim();
      if (!name && e.labels && e.labels.length) name = [...e.labels].map((l) => l.textContent).join("").trim();
      if (!name && e.closest("label")) name = e.closest("label").textContent.trim();
      if (!name && e.tagName === "INPUT" && ["button", "submit", "reset"].includes(e.type)) name = (e.value || "").trim();
      if (!name && e.getAttribute("placeholder")) name = e.getAttribute("placeholder").trim();
      if (!name) { const tx = (e.textContent || "").replace(/\s+/g, " ").trim(); if (/[\p{L}\p{N}]/u.test(tx)) name = tx; }
      if (!name && e.querySelector("img[alt]:not([alt=''])")) name = "img";
      if (!name) out.unnamed.push(desc(e));
    }
  }
  out.attrs = [...new Set(out.attrs)]; out.unnamed = [...new Set(out.unnamed)]; out.entities = [...new Set(out.entities)];
  return out;
}
const SCAN_SRC = scan.toString();
const runScan = (page, bn) => page.evaluate(`(${SCAN_SRC})(${bn})`);

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
})();`;
// What a person typed stays as typed, so the Bangla run seeds Bangla titles; an English title there would be a false finding.
const BN_NAMES = [["First note", "প্রথম নোট"], ["Second note", "দ্বিতীয় নোট"], ["Third note", "তৃতীয় নোট"], ["Fourth note", "চতুর্থ নোট"], ["Folder ", "ফোল্ডার "], ["Bookmark folder", "বুকমার্ক ফোল্ডার"], ["A bookmark", "একটি বুকমার্ক"], ["Another", "আরেকটি"]];
const seedFor = (bn) => (bn ? BN_NAMES.reduce((s, [a, b]) => s.split(`"${a}`).join(`"${b}`), SEED) : SEED);
const DUA_SEED =`DATA.ayahCollections = [{ _id: TENANT_ID, tenantId: TENANT_ID, collections: [] }];`;

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
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const WIDTHS = [320, 390, 820, 1280, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const visible = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);

/**
 * One opened surface. s = { name, opener (selector of the control to press), root (selector that must be visible once open),
 * closeKey (default Escape), modal (Tab must stay inside root) }.
 * Positive control: the root is visible and holds at least one control. Then scan, Escape, root gone, focus back on the opener.
 */
async function surface(t, page, bn, s) {
  const tt = `${t}: ${s.name}`;
  const o = await page.$(s.opener);
  if (!o) { check(`${tt}: POSITIVE CONTROL the opener ${s.opener} exists`, false, "not found"); return false; }
  await ev(page, (sel) => { document.querySelectorAll("[data-a32-opener]").forEach((e) => e.removeAttribute("data-a32-opener")); document.querySelector(sel).setAttribute("data-a32-opener", "1"); }, s.opener);
  await o.scrollIntoViewIfNeeded().catch(() => {});
  await o.click();
  await settle(page, s.wait ?? 450);
  const nCtl = await ev(page, (r) => [...document.querySelectorAll(`${r} button, ${r} a[href], ${r} input, ${r} select, ${r} summary`)].filter((e) => e.getBoundingClientRect().width > 0).length, s.root);
  const shown = await visible(page, s.root);
  check(`${tt}: POSITIVE CONTROL it opened and has controls`, shown && nCtl >= 1, `visible=${shown} controls=${nCtl}`);
  if (!(shown && nCtl >= 1)) return false;
  const r = await runScan(page, bn);
  if (bn) check(`${tt}: no English aria-label / title / alt / placeholder`, r.attrs.length === 0, r.attrs.slice(0, 8).join(" | "));
  check(`${tt}: every button, link and field has a name`, r.unnamed.length === 0, r.unnamed.slice(0, 8).join(" | "));
  check(`${tt}: no literal entity`, r.entities.length === 0, r.entities.slice(0, 8).join(" | "));
  if (s.modal) {
    // Tab as many times as there are controls plus a few: focus must never leave the dialog.
    let left = null;
    for (let i = 0; i < Math.min(nCtl + 3, 40) && !left; i++) {
      await page.keyboard.press("Tab");
      left = await ev(page, (r) => { const a = document.activeElement; return a && a !== document.body && !a.closest(r) ? (a.tagName + "#" + a.id + "." + String(a.className).slice(0, 30)) : null; }, s.root);
    }
    check(`${tt}: Tab does not leave the dialog`, !left, String(left));
  }
  if (s.noClose) return true;
  if (s.focusInside) await ev(page, (sel) => document.querySelector(sel)?.focus(), s.focusInside);
  await page.keyboard.press(s.closeKey || "Escape");
  await settle(page, 350);
  const stillShown = await visible(page, s.root);
  check(`${tt}: Escape closes it`, !stillShown, "still visible");
  if (s.returnTo) await ev(page, (sel) => { document.querySelectorAll("[data-a32-opener]").forEach((e) => e.removeAttribute("data-a32-opener")); document.querySelector(sel)?.setAttribute("data-a32-opener", "1"); }, s.returnTo);
  const back = await ev(page, () => { const a = document.activeElement, o = document.querySelector("[data-a32-opener]"); return { ok: !!a && !!o && (a === o || o.contains(a)), now: a ? a.tagName + "#" + a.id + "." + String(a.className).slice(0, 30) : null }; });
  check(`${tt}: focus returns to the control that opened it`, back.ok, `focus is on ${back.now}`);
  return true;
}

await flow("control", "bn", 390, 800, "/app/about.html", "", async (t, page) => {
  await ev(page, () => { const d = document.createElement("div"); d.innerHTML = '<button id="sb1" aria-label="Show details">x</button><button id="sb2"></button><a href="#" id="sb3">x</a><a href="#" id="sb4">a</a>'; d.querySelector("#sb3").setAttribute("title", "Open &rarr; now"); d.querySelector("#sb4").appendChild(document.createTextNode(" &mdash;")); document.body.appendChild(d); });
  const r = await runScan(page, true);
  check(`${t}: POSITIVE CONTROL finds a seeded English aria-label`, r.attrs.some((a) => a.includes("sb1")), JSON.stringify(r.attrs.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL finds a seeded empty button`, r.unnamed.some((a) => a.includes("sb2")), JSON.stringify(r.unnamed.slice(0, 3)));
  check(`${t}: POSITIVE CONTROL finds a seeded literal entity`, r.entities.length >= 2, JSON.stringify(r.entities.slice(0, 3)));
  // The Escape/focus probe really can fail: a plain page with no dialog "closes" nothing, so the focus check must see a wrong focus.
  await ev(page, () => { const b = document.createElement("button"); b.id = "sb5"; b.textContent = "opener"; b.setAttribute("data-a32-opener", "1"); document.body.appendChild(b); document.body.focus(); });
  const back = await ev(page, () => document.activeElement === document.getElementById("sb5"));
  check(`${t}: POSITIVE CONTROL the focus probe sees focus that is NOT on the opener`, back === false);
});

const NOTES_URL = "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test";
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  const H = width < 600 ? 844 : 800;

  await flow("notes", lang, width, H, NOTES_URL, seedFor(bn), async (t, page, errors) => {
    await page.waitForSelector(".note-card[data-note-id]", { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the notes page lists the seeded notes`, (await ev(page, () => document.querySelectorAll(".note-card[data-note-id]").length)) >= 3);
    const card = (l) => `.note-card[data-note-id="${l.slice(1).repeat(32)}"] [data-note-window]`;
    // A Note window: opens, scan, Escape closes, focus back on the card's button
    await surface(t, page, bn, { name: "Note window", opener: card("n1"), root: ".note-win", wait: 600 });
    // Window ⋯ menu
    await ev(page, (sel) => document.querySelector(sel).click(), card("n1")); await settle(page, 600);
    await surface(t, page, bn, { name: "window ⋯ menu", opener: ".note-win [data-pane-menu-btn]", root: ".note-win [data-pane-menu].open" });
    // Three cascaded windows and the switcher (persistent, so scanned rather than opened)
    for (const l of ["n3", "n4"]) { await ev(page, (sel) => document.querySelector(sel)?.click(), card(l)); await settle(page, 500); }
    const nw = await ev(page, () => document.querySelectorAll(".note-win").length);
    check(`${t}: POSITIVE CONTROL three windows are open`, nw === 3, String(nw));
    const sw = await ev(page, () => document.querySelectorAll("[data-win-switch]").length);
    check(`${t}: POSITIVE CONTROL the window switcher lists three windows`, sw === 3, String(sw));
    const r = await runScan(page, bn);
    if (bn) check(`${t}: three windows + switcher: no English aria-label / title / alt / placeholder`, r.attrs.length === 0, r.attrs.slice(0, 8).join(" | "));
    check(`${t}: three windows + switcher: every control has a name`, r.unnamed.length === 0, r.unnamed.slice(0, 8).join(" | "));
    check(`${t}: three windows + switcher: no literal entity`, r.entities.length === 0, r.entities.slice(0, 8).join(" | "));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  for (const pg of ["notes", "bookmarks"]) {
    await flow(`bmmenu-${pg}`, lang, width, H, pg === "notes" ? NOTES_URL : "/app/bookmarks.html", seedFor(bn), async (t, page, errors) => {
      await page.waitForSelector(".nav-cat-bookmark > summary", { timeout: 15000 });
      await surface(t, page, bn, { name: "Bookmark menu", opener: ".nav-cat-bookmark > summary", root: ".nav-cat-bookmark[open] .nav-cat-links", wait: 600 });
      await ev(page, () => { const b = document.createElement("button"); b.id = "a32dlg"; b.textContent = "open dialog"; document.body.appendChild(b); b.focus(); });
      await ev(page, async () => { const m = await import("./js/bookmark-popover.js"); m.openBookmarkNamePopover({ defaultName: "Al-Baqarah 255", folders: [{ id: "f1", name: "Folder one", parentId: null }], people: [], roster: [], selectedPersonId: "p1", units: [{ id: "ayah", label: "This āyah", defaultName: "a" }] }); await new Promise((r) => setTimeout(r, 250)); });
      check(`${t}: POSITIVE CONTROL the bookmark dialog is open`, await visible(page, ".bm-popover [data-bm-pop-save]"));
      const r = await runScan(page, bn);
      if (bn) check(`${t}: bookmark dialog: no English aria-label / title / alt / placeholder`, r.attrs.length === 0, r.attrs.slice(0, 8).join(" | "));
      check(`${t}: bookmark dialog: every control has a name`, r.unnamed.length === 0, r.unnamed.slice(0, 8).join(" | "));
      check(`${t}: bookmark dialog: no literal entity`, r.entities.length === 0, r.entities.slice(0, 8).join(" | "));
      let left = null;
      for (let i = 0; i < 25 && !left; i++) { await page.keyboard.press("Tab"); left = await ev(page, () => { const a = document.activeElement; return a && a !== document.body && !a.closest(".bm-popover") ? a.tagName + "#" + a.id : null; }); }
      check(`${t}: bookmark dialog: Tab does not leave it`, !left, String(left));
      await page.keyboard.press("Escape"); await settle(page, 300);
      check(`${t}: bookmark dialog: Escape closes it`, !(await visible(page, ".bm-popover")));
      const fb = await ev(page, () => { const a = document.activeElement; return a ? a.tagName + "#" + a.id : null; });
      check(`${t}: bookmark dialog: focus returns to the control that was focused before it opened`, fb === "BUTTON#a32dlg", fb);
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    });
  }

  await flow("journey", lang, width, H, "/app/journey-map.html", seedFor(bn), async (t, page, errors) => {
    await page.waitForSelector(".folder-row[data-folder-id=fA]", { timeout: 15000 });
    check(`${t}: POSITIVE CONTROL the tree shows the first folder`, true);
    await surface(t, page, bn, { name: "folder ⋯ menu", opener: '.folder-row[data-folder-id="fA"] .folder-menu-btn', root: '.folder-row[data-folder-id="fA"] .bar-palette.open' });
    await surface(t, page, bn, { name: "page ⋯ menu", opener: ".page-menu-wrap [data-bar-palette-toggle]", root: ".page-menu-wrap .bar-palette.open" });
    for (const [nm, id] of [["Favourites", "openFavouritesBtn"], ["Archived", "openArchivedBtn"]]) {
      await ev(page, () => document.querySelector(".page-menu-wrap [data-bar-palette-toggle]")?.click()); await settle(page, 300);
      await ev(page, (i) => document.getElementById(i).click(), id); await settle(page, 500);
      const ok = await visible(page, ".modal-overlay, [role=dialog]");
      check(`${t}: POSITIVE CONTROL the ${nm} dialog opened`, ok);
      const r = await runScan(page, bn);
      if (bn) check(`${t}: ${nm}: no English aria-label / title / alt / placeholder`, r.attrs.length === 0, r.attrs.slice(0, 8).join(" | "));
      check(`${t}: ${nm}: every control has a name`, r.unnamed.length === 0, r.unnamed.slice(0, 8).join(" | "));
      check(`${t}: ${nm}: no literal entity`, r.entities.length === 0, r.entities.slice(0, 8).join(" | "));
      await page.keyboard.press("Escape"); await settle(page, 300);
      check(`${t}: ${nm}: Escape closes it`, !(await visible(page, "[role=dialog]")));
    }
    await ev(page, () => document.querySelector(".page-menu-wrap [data-bar-palette-toggle]")?.click()); await settle(page, 300);
    await ev(page, () => document.getElementById("openTrashBtn").click()); await settle(page, 700);
    check(`${t}: POSITIVE CONTROL Trash opened`, await visible(page, "#viewTrash #trashBackBtn"));
    const r = await runScan(page, bn);
    if (bn) check(`${t}: Trash: no English aria-label / title / alt / placeholder`, r.attrs.length === 0, r.attrs.slice(0, 8).join(" | "));
    check(`${t}: Trash: every control has a name`, r.unnamed.length === 0, r.unnamed.slice(0, 8).join(" | "));
    check(`${t}: Trash: no literal entity`, r.entities.length === 0, r.entities.slice(0, 8).join(" | "));
    await ev(page, () => document.getElementById("trashBackBtn").click()); await settle(page, 300);
    // Folder picker ("Move to…" in a folder's ⋯ menu)
    await ev(page, () => document.querySelector('.folder-row[data-folder-id="fA"] .folder-menu-btn').click()); await settle(page, 300);
    await surface(t, page, bn, { name: "folder picker (Move to…)", opener: '.folder-row[data-folder-id="fA"] [data-folder-move]', root: "#folderPicker .folder-picker", modal: true, returnTo: '.folder-row[data-folder-id="fA"] .folder-menu-btn' });
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  await flow("zab", lang, width, H, "/app/journey-map.html", seedFor(bn), async (t, page, errors) => {
    await page.waitForSelector("#zabBar, #zabCorner", { timeout: 10000 }).catch(() => {});
    const opener = (await visible(page, "#zabBar [data-zab-open]")) ? "#zabBar [data-zab-open]" : "#zabCorner";
    await surface(t, page, bn, { name: "Zab panel", opener, root: "#zabPanel:not([hidden])", wait: 800 });
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

// Part B: the Dua ✓ Check at tablet width
const TABLETS = [[768, 1024], [820, 1180], [1024, 768]].filter(([w]) => !WONLY || w === WONLY);
for (const lang of LANGS) for (const [width, height] of TABLETS) {
  await flow("dua", lang, width, height, "/app/hadith-collections.html", DUA_SEED, async (t, page, errors) => {
    const CARD = '[data-dua-card="2"]';
    await page.click('[data-hadith-tab="dua"]');
    await page.waitForSelector(`${CARD} [data-dua-check-status]`, { timeout: 20000 });
    await settle(page, 400);
    check(`${t}: POSITIVE CONTROL Dua 2 has a ✓ Check button`, await visible(page, `${CARD} [data-dua-check-open]`));
    const lay = (root) => ev(page, (r) => {
      const zab = document.getElementById("zabCorner"); const zb = zab && getComputedStyle(zab).display !== "none" ? zab.getBoundingClientRect() : null;
      const small = [], under = [];
      for (const b of document.querySelectorAll(`${r} button`)) {
        const x = b.getBoundingClientRect(); if (!x.width || !x.height) continue;
        if (x.height < 39.5) small.push((b.textContent || "").trim().slice(0, 18) + ":" + Math.round(x.height));
        if (zb && x.left < zb.right && x.right > zb.left && x.top < zb.bottom && x.bottom > zb.top) under.push((b.textContent || "").trim().slice(0, 18));
      }
      return { small, under, over: document.documentElement.scrollWidth - innerWidth, zab: !!zb };
    }, root);
    let l = await lay(CARD);
    check(`${t}: the card's controls are 40px or more and clear of the Zab corner`, l.small.length === 0 && l.under.length === 0, JSON.stringify(l));
    await page.click(`${CARD} [data-dua-check-open]`);
    await page.waitForSelector('[data-dua-check-panel="2"] [data-dua-check-member]', { timeout: 20000 });
    check(`${t}: POSITIVE CONTROL the check panel opened with its narrations`, (await ev(page, () => document.querySelectorAll("[data-dua-check-member]").length)) > 3);
    l = await lay("[data-dua-check-panel]");
    check(`${t}: step 1: panel controls 40px or more, clear of the Zab corner, no sideways scroll`, l.small.length === 0 && l.under.length === 0 && l.over <= 0, JSON.stringify(l));
    await page.click("[data-dua-check-rest-same]");
    await page.click('[data-dua-check-step="2"]');
    await page.click("[data-dua-check-rest-ok]");
    l = await lay("[data-dua-check-panel]");
    check(`${t}: step 2: panel controls 40px or more, clear of the Zab corner, no sideways scroll`, l.small.length === 0 && l.under.length === 0 && l.over <= 0, JSON.stringify(l));
    await page.click('[data-dua-check-step="3"]');
    check(`${t}: everything decided: the button says Save my check`, (await ev(page, () => document.querySelector("[data-dua-check-save]")?.dataset.duaCheckSave)) === "done");
    l = await lay("[data-dua-check-panel]");
    check(`${t}: step 3: panel controls 40px or more, clear of the Zab corner, no sideways scroll`, l.small.length === 0 && l.under.length === 0 && l.over <= 0, JSON.stringify(l));
    const chipBefore = await ev(page, (c) => document.querySelector(`${c} [data-dua-check-status]`)?.dataset.duaCheckStatus, CARD);
    await ev(page, () => { window.__stubWriteData = []; });
    await page.click("[data-dua-check-save]");
    await page.waitForSelector(`${CARD} [data-dua-check-status="done"]`, { timeout: 10000 }).catch(() => {});
    const chipAfter = await ev(page, (c) => document.querySelector(`${c} [data-dua-check-status]`)?.dataset.duaCheckStatus, CARD);
    check(`${t}: the card's progress changed on screen (${chipBefore} -> ${chipAfter})`, chipBefore === "none" && chipAfter === "done", `${chipBefore} -> ${chipAfter}`);
    const w = await ev(page, () => (window.__stubWriteData || []).filter((x) => x.col === "ayahCollections"));
    const keys = w.length === 1 ? Object.keys(w[0].data).filter((k) => k !== "updatedAt") : null;
    check(`${t}: one write, under the existing key duaChecks.2`, w.length === 1 && JSON.stringify(keys) === '["duaChecks.2"]', JSON.stringify(w.map((x) => Object.keys(x.data))));
    const atEnd = await ev(page, (c) => { const e = document.querySelector(c); const b = e.getBoundingClientRect(); return { panel: !!document.querySelector("[data-dua-check-panel]"), inView: b.bottom > 0 && b.top < innerHeight, focus: document.activeElement?.dataset?.duaCard }; }, CARD);
    check(`${t}: after saving the panel closes and the same card is in view and focused`, !atEnd.panel && atEnd.inView && atEnd.focus === "2", JSON.stringify(atEnd));
    // Way back: reopen, scroll away, press ← Back
    await page.click(`${CARD} [data-dua-check-open]`);
    await page.waitForSelector("[data-dua-check-back]", { timeout: 15000 });
    await ev(page, () => { document.querySelector("[data-dua-check-panel]").scrollIntoView({ block: "end" }); window.scrollBy(0, 3000); });
    await settle(page, 300);
    const bk = await page.$("[data-dua-check-back]");
    if (bk) { await bk.scrollIntoViewIfNeeded(); await bk.click(); }
    await settle(page, 400);
    // Updated in place (Dua Lead, 1 Nov 2026): since audit part 141 H4 (95311bb, agreed between the Hadith and Dua
    // Leads) ← Back puts focus back on the ✓ Check button that opened the panel -- inside this same card -- and only on
    // the card itself when that button is not on screen. The old check required the card element and failed on the
    // better behaviour. It still fails when focus lands anywhere outside card 2 (another card, the body, the gone panel).
    const back = await ev(page, (c) => { const e = document.querySelector(c), b = e.getBoundingClientRect(), a = document.activeElement; return { panel: !!document.querySelector("[data-dua-check-panel]"), inView: b.bottom > 0 && b.top < innerHeight, focus: a === e ? "card" : a?.dataset?.duaCheckOpen && e.contains(a) ? "opener:" + a.dataset.duaCheckOpen : (a?.tagName || "none") }; }, CARD);
    check(`${t}: ← Back returns to the same card, in view`, !!bk && !back.panel && back.inView && (back.focus === "card" || back.focus === "opener:2"), JSON.stringify(back));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}

await browser.close();
console.log(`\n==== audit-part32${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
