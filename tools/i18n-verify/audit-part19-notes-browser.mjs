// Audit part 19 (PCF J29, manual audit): the User Manual's "Notes and Mapping My Journey" features, first half, each one WORKING.
// Measured on the rendered pages at 390 / 820 / 1440 (and 320 for anything that opens a window, sheet or menu), English and Bangla.
// The RESULT is asserted, not the element: the stored write (window.__stubWriteData / sessionStorage __stubWrites), the switched view,
// the returned-to place.
//   readpane  1 Notes pane in the Read view (📝, ← Back, Open in MMJ)   2 Track this āyah (tab; Back to Notes on …)
//   views     3 Mapping My Journey tab (tray), Home menu, Folders | Timeline | Path
//   folders   4 Folder ⋯ menu: Add subfolder, Rename, Move up/down, Colour and bold, Turn into a section, Delete -> Trash (I4/D6)
//   edit      5 Writing a Note: Edit, toolbar, Done saves; a failed save says "Not saved yet — will try again" (I15)
//   notemenu  6 The Note's ⋯ menu (opens, closes on × and on a tap outside)   7 Reading tools in a Note (fold into ⋯ when narrow)
//   tags      8 Tags on Notes (create + tick = writes; tapping a tag lists its Notes)
// Each flow has a POSITIVE CONTROL and a timeout that fails by name. Mutations: --mutate=<name> restores a defect.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part19-notes-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage, clickReadTool, BASE } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const PROBE = process.env.PROBE === "1" || process.argv.includes("--probe");
const ONLY = arg("only");
const WONLY = Number(arg("width")) || 0;
const LONLY = arg("lang");
// No defect was found in this audit, so these are PROOFS THAT THE CHECKS CAN FAIL: each restores a plausible defect in the feature it
// guards. [file, route glob, anchor (must occur exactly once), replacement, the page it applies to (a prefix of the opened path)].
const MUTATIONS = {
  // Delete on a folder does nothing (no retire to Trash).
  "nodelete": ["app/journey-map.html", "**/journey-map.html*", "    async function deleteFolder(node) {\n", "    async function deleteFolder(node) {\n      return;\n", "/app/journey-map.html"],
  // The FIX of this audit is taken out: the last row's menu again ends the page under the bottom Zab bar (shows at 820 and 1440px).
  "nozabclear": ["app/journey-map.html", "**/journey-map.html*", "body:has(#zabBar) .folder-row-menu.open { padding-bottom: 56px; }", "body:has(#zabBar) .folder-row-menu.open { padding-bottom: 0; }", "/app/journey-map.html"],
  // Rename stores nothing.
  "norename": ["app/journey-map.html", "**/journey-map.html*", "row.querySelector(\"[data-folder-rename]\")?.addEventListener(\"click\", (e) => {\n          e.stopPropagation(); closeAllBarPalettes(null);\n          beginInlineRename(node);", "row.querySelector(\"[data-folder-rename]\")?.addEventListener(\"click\", (e) => {\n          e.stopPropagation(); closeAllBarPalettes(null);", "/app/journey-map.html"],
  // The Read view's Notes pane ← Back does nothing.
  "noback": ["app/js/read-note-pane.js", "**/js/read-note-pane.js*", "  back.addEventListener(\"click\", closeReadNotePane);\n", "\n", "/app/quranrevival.html"],
  // The Track tab's way back is lost.
  "notrackback": ["app/quranrevival.html", "**/quranrevival.html*", "      setAppReturn(t(\"Back to Notes on {unit}\", { unit: u.label }), \"\", async () => {", "      (() => {})(t(\"Back to Notes on {unit}\", { unit: u.label }), \"\", async () => {", "/app/quranrevival.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const ALLOWED = /Alpha|Beta|Note One|Note Two|Note Three|Prayer|Audit|QuranRevival|QCR|MMSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|Google|CSV|JSON|ID|AM|PM|Mapping My Journey|Bismillah|compulsion|religion|Started|Mentions|Intro line|First|Second|Third|body|Folders|Timeline|Path/g;
const englishLeft = (text) => (String(text).replace(ALLOWED, " ").match(/[A-Za-z]{3,}/g) || []);

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fE", "Empty", null, 2);
  N("n1", "Note One", "<p>First body.</p><h1>Heading one</h1><p>Intro line.</p>", 1); N("n2", "Note Two", "<p>Second body.</p>", 2); N("n3", "Note Three", "<p>Third body.</p>", 3);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fB", 0);
  var tsS = "2026-01-01T00:00:00.000Z", o2 = Object.assign({ createdAt: tsS, createdBy: "test-uid" }, own);
  DATA.notes.push(Object.assign({ _id: "t1__n256", noteId: "n256", title: "Started on 2:256", bodyHtml: "<p>No compulsion in religion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1", updatedAt: tsS }, o2));
  DATA.noteSources.push(Object.assign({ _id: "t1__s256", sourceLinkId: "s256", noteId: "n256", sourceKey: "ayah:2:256", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", updatedAt: tsS }, o2));
})();`;

async function open(lang, width, pagePath, { seed = SEED } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fE"])); } catch {} });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE && pagePath.startsWith(MUTATIONS[MUTATE][4])) {
    let [file, glob, from, to] = MUTATIONS[MUTATE];
    let body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page, errors };
}
async function flow(name, lang, width, pagePath, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const tag = `${lang} ${width}px ${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, pagePath, opts), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout opening")), 40000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 100000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 500) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource|\[folder refusal\]/i.test(e));
const writes = (page) => ev(page, () => {
  const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
  const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: (w.kind || "").replace(/^tx-/, ""), data: w.data }));
  return [...tx, ...other];
});
const resetWrites = (page) => ev(page, () => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); });
const dataOf = (page, col) => ev(page, (c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
const wide = (page) => ev(page, () => document.documentElement.scrollWidth - innerWidth);
const vis = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const rect = (page, sel) => ev(page, (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; }, sel);
const inside = (r) => !!r && r.l >= -1 && r.r <= r.vw + 1 && r.t >= -1 && r.b <= r.vh + 1;
const pageStatus = (page) => ev(page, () => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
// Every visible control a finger presses (in the given scope) is at least 40px tall.
const shortOnes = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).display !== "none" && r.height < 39.5; }).map((e) => `${e.tagName}${e.className ? "." + String(e.className).split(" ")[0] : ""}:${Math.round(e.getBoundingClientRect().height)}`), sel);
const waitTree = (page) => page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 3 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
async function backToTree(page) { if (await page.isVisible("#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForSelector("#listPane", { state: "visible" }); } }
async function openFolder(page, id) {
  await backToTree(page);
  await page.click(`.folder-row[data-folder-id="${id}"] [data-folder-name]`);
  await page.waitForFunction((f) => { const l = document.getElementById("folderNotes"); return getComputedStyle(l).display !== "none" && !!l.querySelector(`[data-in-folder="${f}"]`); }, id, { timeout: 8000 }).catch(() => {});
}
async function openLeaf(page, noteId, folderId) {
  await openFolder(page, folderId);
  await page.click(`#folderNotes [data-note-leaf][data-note-id="${noteId}"][data-in-folder="${folderId}"] [data-note-open]`);
  await page.waitForSelector("#notePane:not([hidden])");
}
const menuBtn = (id) => `.folder-row[data-folder-id="${id}"] .folder-menu-btn`;
async function openFolderMenu(page, id) { await backToTree(page); await page.click(menuBtn(id)); await page.waitForSelector(`.folder-row[data-folder-id="${id}"] [data-folder-rename]`, { state: "visible" }); }
async function openPaneMenu(page) { await page.click("[data-pane-menu-btn]"); await page.waitForSelector("[data-pane-menu]", { state: "visible" }); }

const WIDTHS = [320, 390, 820, 1440].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 3: Mapping My Journey: views Folders | Timeline | Path; the pop-up tray from the Quran Study tab; the Home menu.
  await flow("views", lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
    await waitTree(page);
    const active = () => ev(page, () => [...document.querySelectorAll("#viewToggle .view-toggle-btn")].map((b) => `${b.dataset.view}:${b.classList.contains("active") || b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-selected") === "true"}`).join());
    check(`${t}: POSITIVE CONTROL Folders is the view on screen, with its tree`, (await vis(page, "[data-folder-tree]")) && (await active()).includes("folders:true"), await active());
    const tg = await rect(page, "#viewToggle");
    check(`${t}: the Folders | Timeline | Path switch sits inside the screen and each button is 40px or more`, inside(tg) && (await shortOnes(page, "#viewToggle .view-toggle-btn")).length === 0, JSON.stringify([tg, await shortOnes(page, "#viewToggle .view-toggle-btn")]));
    await page.click('#viewToggle [data-view="timeline"]'); await settle(page, 400);
    check(`${t}: Timeline switches the view (hash and active button follow, the tree goes)`, (await active()).includes("timeline:true") && !(await vis(page, "[data-folder-tree]")), await active());
    await page.click('#viewToggle [data-view="path"]'); await settle(page, 400);
    check(`${t}: Path switches the view`, (await active()).includes("path:true"), await active());
    await page.click('#viewToggle [data-view="folders"]'); await settle(page, 400);
    check(`${t}: Folders brings the tree back`, (await active()).includes("folders:true") && (await vis(page, "[data-folder-tree]")));
    if (bn) check(`${t}: the switch is in Bangla`, BN.test(await page.textContent("#viewToggle")), await page.textContent("#viewToggle"));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });

  // 3: the tray (pop-up window) from the tab at the bottom of Quran Study.
  await flow("tray", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    const tab = await rect(page, "#tabJourneyBtn");
    check(`${t}: POSITIVE CONTROL the Mapping My Journey tab is on screen at the bottom of Quran Study`, !!tab && tab.w > 0 && tab.b <= tab.vh + 1, JSON.stringify(tab));
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden]) iframe", { timeout: 8000 });
    const tr = await rect(page, "#journeyTray .jt-panel, #journeyTray > *");
    const box = await rect(page, "#journeyTray iframe");
    check(`${t}: the tab opens Mapping My Journey as a pop-up window inside the screen`, inside(box) && (await wide(page)) <= 0, JSON.stringify({ box, tr }));
    const f = page.frames().find((x) => /journey-map\.html/.test(x.url()));
    check(`${t}: ...and the window shows the journey page (embedded)`, !!f && /embed=1/.test(f.url()), page.frames().map((x) => x.url()).join(" "));
    const close = await rect(page, "#journeyTray .jt-close");
    check(`${t}: the window's close button is finger-sized and on screen`, !!close && close.w >= 39.5 && close.h >= 39.5 && inside(close), JSON.stringify(close));
    await page.click("#journeyTray .jt-close"); await settle(page, 300);
    check(`${t}: closing the window comes back to Quran Study`, await ev(page, () => document.getElementById("journeyTray").hidden));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
for (const lang of LANGS) for (const width of WIDTHS.filter((w) => w !== 320)) {
  // 3: Home ▾ → Mapping My Journey opens the full page.
  await flow("homemenu", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    const href = await ev(page, () => { const a = [...document.querySelectorAll('a[href*="journey-map.html"]')][0]; return a ? a.getAttribute("href") : null; });
    check(`${t}: Home ▾ carries a Mapping My Journey link to the full page`, !!href && /journey-map\.html/.test(href), String(href));
    if (href) {
      const r = await page.request.get(new URL(href, `${BASE}/app/`).toString());
      check(`${t}: ...and that page is served`, r.ok(), String(r.status()));
    }
  });
}
const ITEMS = ["addnote", "addsub", "rename", "up", "down", "copy", "move", "look", "section", "makesection", "window", "delete"];
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 4: Folders: the ⋯ menu, each write; Delete retires to Trash and never removes a document.
  await flow("folders", lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
    await waitTree(page);
    await openFolderMenu(page, "fB");
    const have = await ev(page, () => [...document.querySelectorAll('.folder-row[data-folder-id="fB"] .folder-menu [data-folder-addnote], .folder-row[data-folder-id="fB"] [data-folder-addnote]')].length);
    const present = await ev(page, (items) => items.filter((i) => document.querySelector(`.folder-row[data-folder-id="fB"] [data-folder-${i}]`)), ITEMS);
    check(`${t}: POSITIVE CONTROL the folder ⋯ menu opens with the manual's items (${present.length} of ${ITEMS.length})`, have > 0 && ["addnote", "addsub", "rename", "up", "down", "copy", "move", "look", "section", "window", "delete"].every((i) => present.includes(i)), JSON.stringify(present));
    const mr = await rect(page, `.folder-row[data-folder-id="fB"] .folder-row-menu`);
    check(`${t}: the menu opens inside the screen`, !!mr && mr.l >= -1 && mr.r <= mr.vw + 1, JSON.stringify(mr));
    const short = await shortOnes(page, `.folder-row[data-folder-id="fB"] .folder-row-menu button`);
    check(`${t}: every menu item is at least 40px tall`, short.length === 0, JSON.stringify(short));
    // Add subfolder
    await resetWrites(page);
    await page.click(`.folder-row[data-folder-id="fB"] [data-folder-addsub]`);
    await page.waitForSelector("[data-subfolder-input]", { state: "visible" });
    await page.fill("[data-subfolder-input]", "Audit Kid");
    await page.press("[data-subfolder-input]", "Enter");
    await settle(page, 700);
    let w = await writes(page);
    const kid = w.find((x) => x.col === "noteFolders" && x.data?.name === "Audit Kid");
    check(`${t}: Add subfolder writes a noteFolders document named "Audit Kid" under Beta`, !!kid && kid.data.parentFolderId === "fB" && kid.data.status === "active", JSON.stringify(w.map((x) => [x.col, x.op, x.data?.name])));
    // Rename (inline)
    await resetWrites(page);
    await openFolderMenu(page, "fE");
    await page.click(`.folder-row[data-folder-id="fE"] [data-folder-rename]`);
    await page.waitForSelector("[data-folder-rename-input]", { state: "visible" });
    await page.fill("[data-folder-rename-input]", "Renamed Audit");
    await page.press("[data-folder-rename-input]", "Enter");
    await settle(page, 700);
    w = await writes(page);
    check(`${t}: Rename writes the new name on that folder only`, w.some((x) => x.col === "noteFolders" && x.id === "t1__fE" && x.data?.name === "Renamed Audit") && w.filter((x) => x.col === "noteFolders").every((x) => x.id === "t1__fE"), JSON.stringify(w.map((x) => [x.col, x.id, x.data?.name])));
    // Move down (order)
    await resetWrites(page);
    await openFolderMenu(page, "fA");
    await page.click(`.folder-row[data-folder-id="fA"] [data-folder-down]`);
    await settle(page, 700);
    w = await writes(page);
    const ords = w.filter((x) => x.col === "noteFolders" && x.data && "order" in x.data);
    check(`${t}: Move down swaps the order of Alpha and Beta (two order writes)`, ords.length >= 2 && ords.some((x) => x.id === "t1__fA") && ords.some((x) => x.id === "t1__fB"), JSON.stringify(ords.map((x) => [x.id, x.data.order])));
    // 🎨 Colour and bold: the dialog opens inside the screen
    await openFolderMenu(page, "fA");
    await page.click(`.folder-row[data-folder-id="fA"] [data-folder-look]`);
    await page.waitForSelector("#siyagahDialog", { state: "visible", timeout: 5000 }).catch(() => {});
    const dlg = await rect(page, "#siyagahDialog");
    check(`${t}: 🎨 Colour and bold opens a dialog inside the screen with a Bold box`, inside(dlg) && (await vis(page, "#siyagahDialog [data-look-bold]")), JSON.stringify(dlg));
    await resetWrites(page);
    await page.check("#siyagahDialog [data-look-bold]");
    await page.click("#siyagahDialog [data-look-apply]");
    await settle(page, 700);
    w = await writes(page);
    check(`${t}: Apply writes the look on Alpha (bold)`, w.some((x) => x.id === "t1__fA" && JSON.stringify(x.data).includes("bold")), JSON.stringify(w.map((x) => [x.col, x.id, x.data])).slice(0, 300));
    // Delete an empty folder: a retire, never an erase (I4/D6)
    await resetWrites(page);
    await openFolderMenu(page, "fE");
    // REACHABLE: scrolled as far as it goes, the last row's Delete is the topmost thing at its own centre (not under the bottom Zab bar).
    const reach = await ev(page, () => { const x = document.querySelector('.folder-row[data-folder-id="fE"] [data-folder-delete]'); window.scrollTo(0, document.documentElement.scrollHeight); const q = x.getBoundingClientRect(); const h = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { same: h === x || x.contains(h), bottom: Math.round(q.bottom), vh: innerHeight, bar: !!document.getElementById("zabBar") && getComputedStyle(document.getElementById("zabBar")).display !== "none" }; });
    check(`${t}: the last folder's menu can be scrolled clear of the bottom bar, so Delete can be pressed`, reach.same && reach.bottom <= reach.vh, JSON.stringify(reach));
    await page.click(`.folder-row[data-folder-id="fE"] [data-folder-delete]`);
    await settle(page, 800);
    w = await writes(page);
    const rows = await dataOf(page, "noteFolders");
    check(`${t}: Delete retires the folder (status "retired") and erases nothing`, w.some((x) => x.col === "noteFolders" && x.id === "t1__fE" && x.data?.status === "retired") && !w.some((x) => /delete/.test(x.op)) && rows.some((r) => r.folderId === "fE"), JSON.stringify(w.map((x) => [x.col, x.id, x.op, x.data?.status])));
    check(`${t}: ...and it leaves the tree`, !(await vis(page, `.folder-row[data-folder-id="fE"]`)));
    check(`${t}: no sideways scroll, no page errors`, (await wide(page)) <= 0 && noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
async function toggleEdit(page) {
  if (await vis(page, "[data-pane-bar] > [data-pane-edit-toggle]")) await page.click("[data-pane-bar] > [data-pane-edit-toggle]");
  else { await openPaneMenu(page); await page.click("[data-pane-menu] [data-pane-edit-toggle]"); }
}
const revs = (page, id) => ev(page, (i) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).map((r) => ({ prev: r.previousRevisionId, body: r.bodyHtml, title: r.title })), id);
const editStatus = (page) => ev(page, () => { const e = document.querySelector("[data-edit-status]"); return e && !e.hidden ? e.textContent : ""; });
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 5, 6, 7: write and edit a Note; the Note's ⋯ menu; the reading tools.
  await flow("edit", lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
    await waitTree(page);
    await openLeaf(page, "n1", "fA");
    check(`${t}: POSITIVE CONTROL the Note opens in the pane with its text`, (await page.textContent("[data-pane-body]")).includes("First body"));
    // 6: the ⋯ menu
    await openPaneMenu(page);
    const mr = await rect(page, "[data-pane-menu]");
    check(`${t}: the Note's ⋯ menu opens inside the screen${width < 600 ? " (from the bottom on a phone)" : ""}`, inside(mr) && (width >= 600 || mr.b >= mr.vh - 80), JSON.stringify(mr));
    const short = await shortOnes(page, "[data-pane-menu] button");
    check(`${t}: its items are at least 40px tall`, short.length === 0, JSON.stringify(short));
    // Below 600px the menu is a bottom sheet with a × and a dimmed backdrop; from 600px it is a popover closed by a tap outside.
    const xr = await rect(page, "[data-pane-menu] .pane-menu-x");
    if (width < 600) {
      check(`${t}: the sheet has a × (finger-sized, inside the screen) that closes it`, !!xr && xr.w >= 39.5 && xr.h >= 39.5 && inside(xr), JSON.stringify(xr));
      if (xr) { await page.click("[data-pane-menu] .pane-menu-x"); await settle(page, 300); }
      check(`${t}: × closes the menu`, !(await vis(page, "[data-pane-menu]")));
      await openPaneMenu(page);
    }
    const bd = await rect(page, "[data-pane-menu-backdrop]");
    check(`${t}: ${width < 600 ? "a dimmed backdrop covers the page behind the sheet" : "the popover has no backdrop (a tap on the page closes it)"}`, width < 600 ? !!bd && bd.w >= bd.vw - 1 : !bd);
    if (bd) await page.mouse.click(Math.min(bd.vw - 3, bd.l + 3), Math.max(3, bd.t + 3));
    else {
      // The popover sits over the middle of the title at 820 and 1440px, so tap the title where the menu does not cover it.
      const pt = await ev(page, () => { const e = document.querySelector("[data-pane-title]"), m = document.querySelector("[data-pane-menu]"); const r = e.getBoundingClientRect(); for (let x = r.left + 4; x < r.right; x += 12) { const at = document.elementFromPoint(x, r.top + r.height / 2); if (at && !m.contains(at)) return { x, y: r.top + r.height / 2 }; } return null; });
      check(`${t}: POSITIVE CONTROL part of the title is outside the popover, to tap`, !!pt, JSON.stringify(pt));
      if (pt) await page.mouse.click(pt.x, pt.y);
    }
    await settle(page, 300);
    check(`${t}: a tap outside closes the menu`, !(await vis(page, "[data-pane-menu]")), JSON.stringify(bd));
    // 5: Edit, type, Done saves
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    check(`${t}: ✏️ Edit opens a title field and an editable body`, await ev(page, () => document.querySelector("[data-edit-title]").offsetParent !== null && document.querySelector("[data-edit-body]").isContentEditable));
    const tb = await ev(page, () => { const t = document.querySelector("[data-edit-toolbar]"); return t ? { sw: t.scrollWidth, cw: t.clientWidth, btns: [...t.querySelectorAll(".tb-btn, .tb-tab")].filter((b) => b.offsetParent).length, min: Math.min(...[...t.querySelectorAll(".tb-btn, .tb-tab")].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect().height)) } : null; });
    check(`${t}: the toolbar is on screen with finger-sized buttons`, !!tb && tb.btns > 3 && tb.min >= 39.5, JSON.stringify(tb));
    await resetWrites(page);
    await page.click("[data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(" AUDITED");
    await toggleEdit(page);
    await page.waitForFunction(() => !document.querySelector("[data-edit-body]"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 600);
    const r = await revs(page, "n1"), w = await writes(page);
    check(`${t}: ✓ Done saves ONE revision chained from the old one, with the new text`, r.length === 1 && r[0].prev === "rev-n1" && r[0].body.includes("AUDITED"), JSON.stringify(r));
    check(`${t}: ...and the Note row points at it (a notes write, no erase)`, w.some((x) => x.col === "notes" && x.id === "t1__n1") && !w.some((x) => /delete/.test(x.op)), JSON.stringify(w.map((x) => [x.col, x.id, x.op])));
    check(`${t}: the pane shows the new text`, (await page.textContent("[data-pane-body]")).includes("AUDITED"));
    // 5: a failed save says so in words (I15)
    await ev(page, () => { window.__DATA.notes.find((n) => n.noteId === "n1").status = "retired"; });
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    await page.click("[data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(" OFFLINE");
    await toggleEdit(page);
    await page.waitForFunction(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" && e.textContent.length > 5; }, null, { timeout: 8000 }).catch(() => {});
    const st = await pageStatus(page);
    const draft = await ev(page, () => localStorage.getItem("qr.journeyNoteDraft.n1") || "");
    check(`${t}: a failed save says "Not saved yet — will try again" (${bn ? "Bangla" : "English"}) and keeps the text on this device`, (bn ? BN.test(st) && st.length > 8 : st === "Not saved yet — will try again") && draft.includes("OFFLINE"), `${st} | ${draft.slice(0, 80)}`);
    await ev(page, () => { window.__DATA.notes.find((n) => n.noteId === "n1").status = "active"; });
    // 7: reading tools in a Note (back in read mode if the failed Done left the editor open)
    if (await page.$("[data-edit-body]")) await toggleEdit(page);
    await settle(page, 500);
    const bar = await ev(page, () => { const b = document.querySelector("[data-pane-bar]"), br = b.getBoundingClientRect(); const kids = [...b.children].filter((c) => c.offsetParent !== null && c.getBoundingClientRect().width > 0); return { sw: b.scrollWidth, cw: b.clientWidth, folded: b.classList.contains("folded"), cut: kids.some((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1; }), n: kids.length }; });
    check(`${t}: the Note's bar holds its tools on one line with nothing cut${bar.folded ? " (folded into ⋯)" : ""}`, bar.sw <= bar.cw + 1 && !bar.cut && bar.n >= 2, JSON.stringify(bar));
    if (width <= 390) check(`${t}: on a narrow bar the tools fold into ⋯`, bar.folded, JSON.stringify(bar));
    // The one error expected here is the failed save the test caused on purpose (the app logs it AND says it on screen, I15).
    const other = noErr(errors).filter((e) => !/\[note autosave\]|Retired Note cannot be edited/.test(e));
    check(`${t}: no sideways scroll, no page errors besides the deliberate failed save`, (await wide(page)) <= 0 && other.length === 0, other.slice(0, 2).join(" | "));
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 8: Tags on Notes: ⋯ → 🏷 Tags… creates and ticks tags (the writes); tapping a tag in the Tags list shows its Notes.
  await flow("tags", lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
    await waitTree(page);
    await openLeaf(page, "n1", "fA");
    await resetWrites(page);
    await openPaneMenu(page);
    await page.waitForSelector("[data-pane-menu] [data-pane-tags]", { state: "visible" });
    await page.click("[data-pane-menu] [data-pane-tags]");
    await page.waitForSelector(".tag-picker", { state: "visible" });
    const pr = await rect(page, ".tag-picker");
    check(`${t}: POSITIVE CONTROL ⋯ → 🏷 Tags… opens the picker inside the screen`, inside(pr), JSON.stringify(pr));
    const short = await shortOnes(page, ".tag-picker button, .tag-picker input[type=text], .tag-pick-row");
    check(`${t}: the picker's controls are at least 40px tall`, short.length === 0, JSON.stringify(short));
    await page.fill("[data-tag-new-name]", "Prayer");
    await page.click("[data-tag-new]");
    await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1, null, { timeout: 8000 }).catch(() => {});
    const tags = await dataOf(page, "noteTags"), links = await dataOf(page, "noteTagLinks");
    const w = await writes(page);
    check(`${t}: creating "Prayer" writes ONE noteTags document and ONE active link to Note One`, tags.length === 1 && tags[0].name === "Prayer" && links.length === 1 && links[0].noteId === "n1" && links[0].tagId === tags[0].tagId && links[0].status === "active", JSON.stringify({ tags: tags.length, links: links.map((l) => [l.noteId, l.status]) }));
    check(`${t}: ...and wrote no Note and no revision`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions") && w.some((x) => x.col === "noteTags") && w.some((x) => x.col === "noteTagLinks"), JSON.stringify(w.map((x) => x.col)));
    await resetWrites(page);
    await page.uncheck(".tag-pick-row input");
    await page.waitForFunction(() => !document.querySelector(".tag-pick-row input:checked"), null, { timeout: 8000 }).catch(() => {});
    const l2 = await dataOf(page, "noteTagLinks");
    check(`${t}: unticking retires the link (status retired, the document stays)`, l2.length === 1 && l2[0].status === "retired" && !(await writes(page)).some((x) => /delete/.test(x.op)), JSON.stringify(l2.map((l) => l.status)));
    await page.check(".tag-pick-row input");
    await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1, null, { timeout: 8000 }).catch(() => {});
    await page.click("[data-tag-close]");
    await page.waitForFunction(() => !document.querySelector(".tag-picker"), null, { timeout: 5000 }).catch(() => {});
    const chips = await ev(page, () => [...document.querySelectorAll("#notePane [data-tag-chip]")].map((e) => e.textContent.trim()));
    check(`${t}: the Note shows its tag chip`, chips.join().includes("Prayer"), JSON.stringify(chips));
    // The Tags list in the tray: tap the tag, see its Notes.
    await page.click("[data-pane-back]").catch(() => {});
    await backToTree(page);
    await page.waitForSelector("[data-tags-block] [data-tag-item]", { timeout: 8000 });
    await page.click("[data-tag-item] [data-tag-open]");
    await page.waitForSelector("[data-tag-notes] [data-tag-note]", { timeout: 8000 });
    const listed = await ev(page, () => [...document.querySelectorAll("[data-tag-note]")].map((e) => e.dataset.tagNote));
    check(`${t}: tapping the tag in the Tags list shows its Notes (Note One)`, listed.join() === "n1", JSON.stringify(listed));
    const tr = await rect(page, "[data-tag-item]");
    check(`${t}: the Tags list is inside the screen with no sideways scroll`, inside(tr) && (await wide(page)) <= 0, JSON.stringify(tr));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
for (const lang of LANGS) for (const width of WIDTHS) {
  const bn = lang === "bn";
  // 1 and 2: the Notes pane in the Read view, and its Track this āyah tab.
  await flow("readpane", lang, width, "/app/quranrevival.html", async (t, page, ctx, errors) => {
    if (!(await ev(page, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await settle(page, 150); }
    await page.click("#tabReadBtn"); await settle(page, 400);
    await ev(page, () => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
    await ev(page, () => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
    await settle(page, 900);
    await ev(page, () => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
    const before = await ev(page, () => ({ ayah: document.getElementById("ayahSelect").value, top: document.getElementById("readScroll")?.scrollTop ?? 0 }));
    check(`${t}: POSITIVE CONTROL the Read view is on 2:256 with the 📝 control reachable`, before.ayah === "256" && (await ev(page, () => !!document.getElementById("readNotesBtn"))));
    await clickReadTool(page, "#readNotesBtn");
    await page.waitForFunction(() => document.querySelector("#readNotePane:not([hidden]) iframe"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 700);
    const pane = await rect(page, "#readNotePane");
    check(`${t}: 📝 opens the Notes pane inside the screen, no sideways scroll`, inside(pane) && (await wide(page)) <= 0, JSON.stringify(pane));
    const back = await rect(page, "#readNotePane [data-rnp-back]");
    const hit = await ev(page, () => { const b = document.querySelector("#readNotePane [data-rnp-back]").getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e && !!e.closest("#readNotePane"); });
    check(`${t}: ← Back is finger-sized, on screen and not covered by anything`, !!back && back.h >= 39.5 && inside(back) && hit, JSON.stringify(back));
    const title = await ev(page, () => document.querySelector("#readNotePane .rnp-title")?.textContent ?? "");
    check(`${t}: the pane is titled for the āyah (${bn ? "Bangla" : "English"})`, bn ? BN.test(title) && /২৫৬/.test(title) : title === "Notes on 2:256", title);
    const fr = page.frames().find((x) => /journey-map\.html\?embed=1&unit=ayah%3A2%3A256/.test(x.url()));
    check(`${t}: the pane lists the Notes on 2:256 (the seeded Note started there)`, !!fr && await fr.waitForSelector('[data-unit-body] [data-note-id="n256"]', { timeout: 15000 }).then(() => true).catch(() => false));
    // ↗ Open in Mapping My Journey opens the full tray
    await page.click("#readNotePane [data-rnp-journey]");
    await page.waitForFunction(() => document.querySelector("#journeyTray:not([hidden]) iframe"), null, { timeout: 8000 }).catch(() => {});
    const trayShown = await ev(page, () => !!document.querySelector("#journeyTray:not([hidden]) iframe"));
    check(`${t}: ↗ Open in Mapping My Journey opens the tray`, trayShown);
    if (trayShown) { await page.click("#journeyTray .jt-close"); await settle(page, 300); }
    // ← Back closes the pane to the same place
    await page.click("#readNotePane [data-rnp-back]"); await settle(page, 500);
    const after = await ev(page, () => ({ hidden: document.getElementById("readNotePane").hidden, ayah: document.getElementById("ayahSelect").value, top: document.getElementById("readScroll")?.scrollTop ?? 0 }));
    check(`${t}: ← Back closes the pane to the same āyah and the same place`, after.hidden && after.ayah === before.ayah && Math.abs(after.top - before.top) <= 2, JSON.stringify({ before, after }));
    // 2: Track this āyah
    await clickReadTool(page, "#readNotesBtn"); await settle(page, 500);
    // Updated in place (audit part 42): since PCF MSA J71 a computer's wide Notes window (1440px) hides its own tab row
    // (`.rnp-tabs-in-frame .rnp-tabs { display: none }`, read-note-pane.js syncHostedTabs) and the page inside the frame
    // carries the Notes | Track tabs on its tools row (`[data-jm-host-tab]`). So click the tab that is really on screen.
    const outerTab = await rect(page, '#readNotePane [data-rnp-tab="track"]');
    if (outerTab && outerTab.w > 0) await page.click('#readNotePane [data-rnp-tab="track"]');
    else {
      const jf = page.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url()));
      await jf.click('[data-jm-host-tab="track"]', { timeout: 8000 });
    }
    await settle(page, 300);
    const tr = await ev(page, () => ({ btns: [...document.querySelectorAll("#readNotePane [data-rnp-track]")].map((b) => b.dataset.rnpTrack), hs: [...document.querySelectorAll("#readNotePane [data-rnp-track]")].map((b) => Math.round(b.getBoundingClientRect().height)), sel: document.querySelector('#readNotePane [data-rnp-tab="track"]').getAttribute("aria-selected") }));
    check(`${t}: the Track tab offers Take an Approach, Record Your Progress, Know Your Status (each 40px or more)`, tr.sel === "true" && tr.btns.join() === "take,record,status" && tr.hs.every((h) => h >= 40), JSON.stringify(tr));
    await page.click('#readNotePane [data-rnp-track="record"]');
    await page.waitForFunction(() => document.getElementById("ayahActionSheetOverlay")?.classList.contains("open"), null, { timeout: 8000 }).catch(() => {});
    await settle(page, 400);
    const rec = await ev(page, () => ({ ref: document.querySelector("[data-ayah-sheet] .ayah-sheet-ref")?.textContent ?? "", pill: document.querySelector("#ayahCardBackPill:not([hidden]) [data-ayah-card-back]")?.textContent ?? "" }));
    check(`${t}: Record Your Progress opens the Āyah card for 2:256 and leaves a "Back to Notes on …" way back`, /2:256|২:২৫৬/.test(rec.ref) && /Back to Notes on|নোটে ফিরে যান/.test(rec.pill), JSON.stringify(rec));
    const sheet = await rect(page, "[data-ayah-sheet]");
    check(`${t}: the Āyah card sits inside the screen`, inside(sheet), JSON.stringify(sheet));
    await ev(page, () => document.querySelector("#ayahCardBackPill [data-ayah-card-back]")?.click());
    await settle(page, 600);
    const backT = await ev(page, () => ({ shown: !document.getElementById("readNotePane").hidden, sel: document.querySelector('#readNotePane [data-rnp-tab="track"]')?.getAttribute("aria-selected") }));
    check(`${t}: "Back to Notes on …" returns to the pane on its Track tab`, backT.shown && backT.sel === "true", JSON.stringify(backT));
    check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
  });
}
await browser.close();
console.log(`\naudit-part19-notes-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
