// S9 (Siyagah folder plan, 4 Oct 2026, decision 66): Mapping My Journey -- menus by right-click and
// long-press, drag a Note onto a folder, new folder-menu items, recursive collapse, tag search,
// unlimited nesting, and the two S8 leftovers (date only; ▾ on the title's line on a phone).
// Mouse input is real (page.mouse); touch input is real CDP touch (Input.dispatchTouchEvent).
// Writes are proved through the stub's own logs. Run from the repository root with `node serve.js` running.
//   --mutate-drop-replaces    a dropped Note is MOVED (replaces its filing) instead of added
//   --mutate-longpress-short  the long-press fires at once, so a short tap opens the menu
//   --mutate-depth-back       the old depth limit of 8 is put back
//   --mutate-no-recursive     closing a folder leaves its sub-folders open
//   --mutate-no-tagsearch     the tree search ignores tags
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate-"))?.slice(9) ?? null;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0); F("fBg", "BetaGrand", "fBk", 0); F("fG", "Gamma", null, 2);
  for (var i = 1; i <= 11; i++) F("fd" + i, "Deep" + i, i === 1 ? null : "fd" + (i - 1), i === 1 ? 3 : 0);
  N("n1", "Note One", "<p>One.</p>", 1); N("n2", "Note Two", "<p>Two.</p>", 2);
  P("p1", "n1", "fA", 0); P("p1b", "n1", "fB", 0); P("p2", "n2", "fA", 1);
  DATA.noteTags.push(Object.assign({ _id: "t1__tg1", tagId: "tg1", name: "Prayerful", color: null, status: "active" }, own));
  DATA.noteTagLinks.push(Object.assign({ _id: "t1__tl1", linkId: "tl1", tagId: "tg1", noteId: "n2", status: "active" }, own));
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const noSideways = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const status = (pg) => pg.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const dataOf = (pg, col) => pg.evaluate((c) => JSON.parse(JSON.stringify(window.__DATA[c] || [])), col);
async function resetWrites(pg) { await pg.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(pg) {
  return pg.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind, data: w.data }));
    return [...tx, ...other];
  });
}
async function waitTree(pg) {
  await pg.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 5 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function toTree(pg) { if (await pg.isVisible("[data-pane-back]")) await pg.click("[data-pane-back]"); if (await pg.isVisible("#folderNotes [data-list-back]")) await pg.click("#folderNotes [data-list-back]"); }
async function tapFolder(pg, id) { await toTree(pg); await pg.click(`.folder-row[data-folder-id="${id}"] [data-folder-name]`); await pg.waitForSelector("#folderNotes [data-fn-title]", { state: "visible" }); }
const rowSel = (id) => `.folder-row[data-folder-id="${id}"]`;
const menuOpen = (pg, id) => pg.evaluate((s) => !!document.querySelector(`${s} [data-bar-palette].open`), rowSel(id));
const actionsShown = (pg, id) => pg.evaluate((n) => { const e = document.querySelector(`#folderNotes [data-note-id="${n}"] [data-note-actions]`); return !!e && getComputedStyle(e).display !== "none"; }, id);
let mainPage; // the top-level page (a tray's iframe has no keyboard of its own)
const closeMenus = () => mainPage.keyboard.press("Escape");

let cdp;
// Touch emulation is on only DURING a gesture: left on, the page reads "(pointer: coarse)" and (correctly) stops
// offering the mouse's native drag, which the drag-by-mouse checks below need.
async function touch(type, x, y) {
  if (type === "touchStart") await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await touchRaw(type, x, y);
  if (type === "touchEnd") await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
}
async function touchRaw(type, x, y) { await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }] }); }
let curP; // the document being driven (the page, or the tray's iframe) -- boundingBox() is in top-level viewport coordinates either way
async function centre(_pg, sel) { const loc = curP.locator(sel).first(); await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); return { x: b.x + Math.min(b.width / 2, 60), y: b.y + b.height / 2 }; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function tap(pg, sel) { const c = await centre(pg, sel); await touch("touchStart", c.x, c.y); await wait(80); await touch("touchEnd"); await wait(150); return c; }
async function longPress(pg, sel, hold = 700) { const c = await centre(pg, sel); await touch("touchStart", c.x, c.y); await wait(hold); await touch("touchEnd"); await wait(150); return c; }
async function swipe(pg, sel) { const c = await centre(pg, sel); await touch("touchStart", c.x, c.y); await wait(60); await touch("touchMove", c.x, c.y + 30); await wait(600); await touch("touchEnd"); await wait(150); }

async function run(lang, width, embedFrame = false) {
  const tag = `${lang} ${width}px${embedFrame ? " tray" : ""}`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    await ctx.route("**/*", async (route) => {
      const url = route.request().url();
      const isPage = /journey-map\.html/.test(url), isContract = /journey-map-contract\.js/.test(url);
      if (!isPage && !isContract) return route.fallback();
      const res = await route.fetch();
      let body = await res.text();
      if (isPage && MUTATE === "drop-replaces") body = body.replace("() => copyNoteToFolder(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId, ownerUid: auth.currentUser.uid, noteId, toFolderId,", "() => moveNote(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId, ownerUid: auth.currentUser.uid, noteId, fromFolderId: [...activeFilingFolderIds(note)][0], toFolderId,");
      if (isPage && MUTATE === "longpress-short") body = body.replace("const LONG_PRESS_MS = 500;", "const LONG_PRESS_MS = 0;");
      if (isPage && MUTATE === "no-recursive") body = body.replace("closeBelow(node);", "");
      if (isPage && MUTATE === "no-tagsearch") body = body.replace("|| tagNoteIds.has(n.noteId)", "");
      if (isContract && MUTATE === "depth-back") body = body.replace("MAX_FOLDER_DEPTH = 1000", "MAX_FOLDER_DEPTH = 8");
      await route.fulfill({ response: res, body });
    });
  }
  const all = ["fA", "fB", "fBk", "fBg", "fG", ...Array.from({ length: 11 }, (_, i) => `fd${i + 1}`)];
  await ctx.addInitScript((ids) => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(ids)); } catch {} }, all);
  let page, P, errors = [];
  if (embedFrame) {
    ({ page, errors } = await openPage(ctx, "/app/quranrevival.html"));
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 });
    P = await (await page.$("#journeyTray iframe")).contentFrame();
  } else {
    ({ page, errors } = await openPage(ctx, "/app/journey-map.html#folders"));
    P = page;
  }
  cdp = await ctx.newCDPSession(page);
  mainPage = page; curP = P;
  await waitTree(P);
  const wide = (await P.evaluate(() => document.documentElement.clientWidth)) >= 1200;

  // ---- 1. Right-click and long-press open the right menu; a tap and a scroll do not ----------------
  await resetWrites(P);
  await P.click(`${rowSel("fA")} [data-folder-name]`, { button: "right" });
  check(`${tag}: right-click on a folder row opens ITS ⋯ menu`, await menuOpen(P, "fA"));
  await closeMenus(P);
  await toTree(P);
  await tap(page, `${rowSel("fG")} [data-folder-name]`);
  check(`${tag}: a short tap on a folder row does NOT open a menu`, !(await menuOpen(P, "fG")));
  await toTree(P);
  await swipe(page, `${rowSel("fG")} [data-folder-name]`);
  check(`${tag}: a press that moves more than 8px (a scroll) does NOT open a menu`, !(await menuOpen(P, "fG")));
  await toTree(P);
  await longPress(page, `${rowSel("fG")} [data-folder-name]`);
  check(`${tag}: a ~500ms long-press on a folder row opens its ⋯ menu`, await menuOpen(P, "fG"));
  check(`${tag}: ...and no folder was chosen by it (it was not also a tap)`, wide || !(await P.isVisible("#folderNotes [data-fn-title]")));
  const items = await P.$$eval(`${rowSel("fG")} [data-bar-palette].open button`, (b) => b.map((x) => ({ k: Object.keys(x.dataset).join(","), h: x.getBoundingClientRect().height })));
  const keys = items.map((i) => i.k).join(" ");
  check(`${tag}: the folder menu has Add subfolder, Add note here, Turn into a section (and no Move to top level on a top-level folder)`,
    /folderAddsub/.test(keys) && /folderAddnote/.test(keys) && /folderMakesection/.test(keys) && !/folderTop/.test(keys), keys);
  check(`${tag}: the menu's buttons are at least 40px tall`, items.every((i) => i.h >= 39.5), JSON.stringify(items.map((i) => Math.round(i.h))));
  await closeMenus(P);
  await P.click(`${rowSel("fBk")} [data-folder-name]`, { button: "right" });
  check(`${tag}: a nested folder's menu offers Move to top level`, await P.$(`${rowSel("fBk")} [data-folder-top]`) !== null);
  await closeMenus(P);

  // ---- 2. Note card menus -----------------------------------------------------------------------------
  await tapFolder(P, "fA");
  check(`${tag}: (positive control) the card's actions start hidden`, !(await actionsShown(P, "n2")));
  await P.click('#folderNotes [data-note-id="n2"] .note-card-meta', { button: "right" });
  check(`${tag}: right-click on a Note card opens its actions (the ▾ menu)`, await actionsShown(P, "n2"));
  await P.click('#folderNotes [data-note-id="n2"] [data-note-toggle]');
  check(`${tag}: ▾ still works (closes it again)`, !(await actionsShown(P, "n2")));
  await tap(page, '#folderNotes [data-note-id="n2"] .note-card-meta');
  await wait(700);
  check(`${tag}: a short tap on a card does not open its menu (it opens the Note)`, !(await actionsShown(P, "n2")) || await P.isVisible("#notePane"));
  await tapFolder(P, "fA");
  await swipe(page, '#folderNotes [data-note-id="n2"] .note-card-meta');
  check(`${tag}: a scroll on a card does not open its menu`, !(await actionsShown(P, "n2")));
  await tapFolder(P, "fA");
  await longPress(page, '#folderNotes [data-note-id="n2"] .note-card-meta');
  check(`${tag}: a long-press on a Note card opens its actions`, await actionsShown(P, "n2"));
  check(`${tag}: ...and the Note pane was not opened by it`, !(await P.isVisible("#notePane")) || wide);
  await tapFolder(P, "fA");
  await P.click('#folderNotes [data-note-id="n2"] [data-note-toggle]'); // leave it as found
  if (await actionsShown(P, "n2")) await P.click('#folderNotes [data-note-id="n2"] [data-note-toggle]');

  // ---- 3. The two S8 leftovers -----------------------------------------------------------------------
  const meta = (await P.textContent('#folderNotes [data-note-id="n2"] .note-card-meta')).trim();
  check(`${tag}: the card date is the date only`, lang === "bn" ? (hasBn(meta) && !/[0-9]|AM|PM|am|pm|:/.test(meta)) : /^\d{1,2} [A-Z][a-z]{2} 2026$/.test(meta), JSON.stringify(meta));
  if (width <= 640 || embedFrame) {
    const g = await P.evaluate(() => { const h = document.querySelector('#folderNotes [data-note-id="n2"] .note-card-head'); const r = (s) => h.querySelector(s).getBoundingClientRect(); return { title: r(".note-card-title"), more: r(".note-more-btn"), meta: r(".note-card-meta") }; });
    check(`${tag}: the ▾ stays on the title's line, the date sits below`, Math.abs(g.more.top - g.title.top) < 12 && (width > 640 || g.meta.top >= g.title.bottom - 2), JSON.stringify(g));
  }
  check(`${tag}: no sideways scroll`, await noSideways(P));

  // ---- 4. Recursive collapse -----------------------------------------------------------------------------
  await toTree(P);
  const rowShown = (id) => P.evaluate((s) => !!document.querySelector(s), rowSel(id));
  check(`${tag}: (positive control) Beta, BetaKid and BetaGrand all show`, (await rowShown("fB")) && (await rowShown("fBk")) && (await rowShown("fBg")));
  await P.click(`${rowSel("fB")} [data-folder-toggle]`);
  check(`${tag}: closing Beta hides its sub-folders`, !(await rowShown("fBk")) && !(await rowShown("fBg")));
  await P.click(`${rowSel("fB")} [data-folder-toggle]`);
  check(`${tag}: opening Beta shows only the NEXT level (BetaKid yes, BetaGrand still closed)`, (await rowShown("fBk")) && !(await rowShown("fBg")));
  // restore for later steps
  await P.click(`${rowSel("fBk")} [data-folder-toggle]`);

  // ---- 5. Menu items do what they say ------------------------------------------------------------------------
  await resetWrites(P);
  await P.click(`${rowSel("fG")} .folder-menu-btn`);
  await P.click(`${rowSel("fG")} [data-folder-addsub]`);
  await P.waitForSelector("[data-subfolder-input]");
  await P.fill("[data-subfolder-input]", "Gamma Child");
  await P.press("[data-subfolder-input]", "Enter");
  await wait(900);
  let w = await writes(P);
  check(`${tag}: Add subfolder asks for a name inline, then creates a folder under Gamma`, w.some((x) => x.col === "noteFolders" && x.data?.name === "Gamma Child" && x.data?.parentFolderId === "fG"), JSON.stringify(w.map((x) => x.col)));
  await resetWrites(P);
  await P.click(`${rowSel("fBg")} .folder-menu-btn`);
  await P.click(`${rowSel("fBg")} [data-folder-top]`);
  await wait(900);
  w = await writes(P);
  check(`${tag}: Move to top level re-parents the folder to nothing (moveFolder)`, w.some((x) => x.col === "noteFolders" && x.id?.includes("fBg") && x.data && "parentFolderId" in x.data && x.data.parentFolderId === null), JSON.stringify(w));
  check(`${tag}: ...and it says so in words`, (await status(P)).length > 0 && (lang === "bn" ? hasBn(await status(P)) : /top-level/.test(await status(P))), await status(P));
  await resetWrites(P);
  await P.click(`${rowSel("fG")} .folder-menu-btn`);
  await P.click(`${rowSel("fG")} [data-folder-makesection]`);
  await wait(1100);
  w = await writes(P);
  check(`${tag}: Turn into a section creates a section named after the folder and files the folder in it`,
    w.some((x) => x.col === "noteSections" && x.data?.name === "Gamma") && w.some((x) => x.col === "noteFolders" && x.id?.includes("fG") && x.data?.sectionId), JSON.stringify(w.map((x) => `${x.col}:${x.data?.name ?? ""}`)));
  check(`${tag}: no folder or Note was deleted by any of it`, !w.some((x) => x.op === "delete" || x.op === "deleteDoc"));

  // ---- 6. Tag search ---------------------------------------------------------------------------------------------
  await P.fill("#folderSearchInput", "prayerf");
  await wait(300);
  check(`${tag}: typing a tag's name in the search shows the Note carrying that tag`, (await P.$('[data-search-note-id="n2"]')) !== null && (await P.$('[data-search-note-id="n1"]')) === null);
  await P.fill("#folderSearchInput", "");
  await wait(300);

  // ---- 7. Nesting: 12 deep can be made and shown ----------------------------------------------------------------
  await resetWrites(P);
  await P.click(`${rowSel("fd11")} .folder-menu-btn`);
  await P.click(`${rowSel("fd11")} [data-folder-addsub]`);
  await P.fill("[data-subfolder-input]", "Twelve");
  await P.press("[data-subfolder-input]", "Enter");
  await wait(900);
  w = await writes(P);
  check(`${tag}: a folder nested 12 deep is created (no depth refusal)`, w.some((x) => x.col === "noteFolders" && x.data?.name === "Twelve" && x.data?.parentFolderId === "fd11"), `${JSON.stringify(w.map((x) => x.col))} ${await status(P)}`);
  const d = await P.evaluate(() => { const items = [...document.querySelectorAll(".folder-tree-item")]; return Math.max(...items.map((i) => Number(i.dataset.depth || 0))); });
  check(`${tag}: ...and it is shown, at depth 12 (data-depth 11)`, d >= 11, `deepest ${d}`);
  check(`${tag}: no sideways scroll with the deep tree`, await noSideways(P));

  // ---- 8. Drag a Note onto a folder (needs the tree and the list side by side: 1200px and up) ---------------------
  if (wide) {
    await tapFolder(P, "fA");
    await resetWrites(P);
    const card = '#folderNotes [data-note-id="n1"]';
    // The tree may have moved on after the steps above; pick a plain target.
    await page.dragAndDrop(card, `${rowSel("fBg")}`, { sourcePosition: { x: 40, y: 10 } }).catch(() => {});
    await wait(1000);
    w = await writes(P);
    const placements = (await dataOf(P, "notePlacements")).filter((p) => p.noteId === "n1" && p.status === "active");
    check(`${tag}: dropping Note One on BetaGrand adds a placement there`, w.some((x) => x.col === "notePlacements" && x.data?.noteId === "n1" && x.data?.folderId === "fBg"), JSON.stringify(w.map((x) => `${x.col}:${x.data?.folderId}`)));
    check(`${tag}: ...and it STAYS in its other folders (Alpha and Beta placements untouched)`, ["fA", "fB", "fBg"].every((f) => placements.some((p) => p.folderId === f)) && !w.some((x) => x.col === "notePlacements" && x.data?.status === "retired"), JSON.stringify(placements.map((p) => p.folderId)));
    await resetWrites(P);
    await page.dragAndDrop(card, rowSel("fA"), { sourcePosition: { x: 40, y: 10 } }).catch(() => {});
    await wait(700);
    w = await writes(P);
    check(`${tag}: dropping it on a folder that already holds it is refused, in words, with no write`, !w.some((x) => x.col === "notePlacements") && (lang === "bn" ? hasBn(await status(P)) : /already in/.test(await status(P))), await status(P));
    // by touch: long-press, then drag
    await tapFolder(P, "fA");
    await resetWrites(P);
    const from = await centre(page, '#folderNotes [data-note-id="n2"] .note-card-meta');
    const to = await centre(page, `${rowSel("fd2")} [data-folder-name]`);
    await touch("touchStart", from.x, from.y); await wait(700);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", from.x + (to.x - from.x) * i / 6, from.y + (to.y - from.y) * i / 6); await wait(40); }
    await touch("touchEnd"); await wait(1000);
    w = await writes(P);
    check(`${tag}: a Note dragged by touch (long-press, then drag) onto a folder is filed there too`, w.some((x) => x.col === "notePlacements" && x.data?.noteId === "n2" && x.data?.folderId === "fd2"), JSON.stringify(w.map((x) => `${x.col}:${x.data?.folderId}`)));
  } else if (!embedFrame) {
    // Folders are draggable by touch where the tree is on screen: long-press Deep1, drag it inside Alpha.
    await toTree(P);
    await resetWrites(P);
    await centre(page, `${rowSel("fA")} [data-folder-name]`);
    const from = await centre(page, `${rowSel("fB")} [data-folder-name]`);
    const to = await centre(page, `${rowSel("fA")} [data-folder-name]`);
    await touch("touchStart", from.x, from.y); await wait(700);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", from.x + (to.x - from.x) * i / 6, from.y + (to.y - from.y) * i / 6); await wait(40); }
    await touch("touchEnd"); await wait(1000);
    w = await writes(P);
    check(`${tag}: a folder can be dragged by touch (long-press, then drag) onto another`, w.some((x) => x.col === "noteFolders" && x.id?.includes("fB") && !x.id?.includes("fBk") && x.data?.parentFolderId === "fA"), JSON.stringify(w.map((x) => `${x.col}:${x.id}`)));
  }

  // ---- 9. Tidy ---------------------------------------------------------------------------------------------------------
  const tooSmall = await P.evaluate(() => [...document.querySelectorAll(".folder-subfolder-form button, .folder-menu-btn, .note-more-btn")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 39.5 || r.width < 39.5); }).length);
  check(`${tag}: the ⋯ and ▾ buttons stay at least 40px`, tooSmall === 0, String(tooSmall));
  check(`${tag}: no sideways scroll at the end`, await noSideways(P));
  const real = errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/i.test(e));
  check(`${tag}: no page errors`, real.length === 0, real.join(" | "));
  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) await run(lang, width);
  await run(lang, 1440, true);
}
await browser.close();
console.log(`\njourney-s9-browser${MUTATE ? ` (mutation ${MUTATE})` : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
