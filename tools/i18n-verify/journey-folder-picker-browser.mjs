// S10 (Siyagah folder plan, 4 Oct 2026, decision 66): Mapping My Journey -- ONE folder picker with tick boxes,
// used wherever a Note is filed. Real input (mouse, keyboard); writes proved through the stub's own logs.
// Run from the repository root with `node serve.js` running.
//   --mutate-untick-deletes   an untick DELETES the placement document instead of retiring it
//   --mutate-edit-writes-early  while editing, a tick is written at once instead of staged until Done
//   --mutate-no-last-guard    the last-folder guard is removed
//   --mutate-no-trash         "Move to Trash" does nothing
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = process.argv.find((a) => a.startsWith("--mutate-"))?.slice(9) ?? null;
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const LONG = "A very long folder name that keeps going and going so that it has to wrap onto several lines instead of being cut off at the edge of the picker";
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
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fC", "Gamma", null, 2); F("fL", ${JSON.stringify(LONG)}, null, 3); F("fK", "Kid", "fB", 0); F("fE", "Empty", null, 4);
  N("n1", "Note One", "<p>One.</p>", 1); N("n2", "Note Two", "<p>Two.</p>", 2); N("n3", "Note Three", "<p>Three.</p>", 3);
  P("p1", "n1", "fA", 0); P("p1b", "n1", "fB", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fC", 0);
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const noSideways = (pg) => pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const status = (pg) => pg.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
async function resetWrites(pg) { await pg.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); }); }
async function writes(pg) {
  return pg.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind, data: w.data }));
    return [...tx, ...other];
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const placementWrites = (w) => w.filter((x) => x.col === "notePlacements");
async function waitTree(pg) {
  await pg.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 5 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function toTree(pg) { if (await pg.isVisible("[data-pane-back]")) await pg.click("[data-pane-back]"); if (await pg.isVisible("#folderNotes [data-list-back]")) await pg.click("#folderNotes [data-list-back]"); }
async function openNote(pg, folderId, noteId) {
  await toTree(pg);
  await pg.click(`.folder-row[data-folder-id="${folderId}"] [data-folder-name]`);
  await pg.waitForSelector("#folderNotes [data-fn-title]", { state: "visible" });
  await pg.click(`#folderNotes [data-note-id="${noteId}"] [data-note-open]`);
  await pg.waitForSelector("[data-pane-title]", { state: "visible" });
}
async function openPaneMenu(pg) {
  await pg.click("[data-pane-menu-btn]:visible");
  await pg.waitForSelector("[data-pane-menu] [data-pane-copy]", { state: "visible" });
}
const settle = async (pg, ms = 500) => { await wait(ms); };
const tickBox = (key) => `#folderPicker [data-fp-tick="${key}"]`;
const pickerOpen = (pg) => pg.isVisible("#folderPicker .folder-picker");
const closePicker = async (pg) => { if (await pickerOpen(pg)) await pg.click("#folderPicker [data-picker-cancel]"); await wait(100); };
const ticked = (pg, key) => pg.$eval(tickBox(key), (e) => e.checked);
const msgText = (pg) => pg.evaluate(() => { const e = document.querySelector("#folderPicker [data-picker-msg]"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });

async function run(lang, width, embedFrame = false) {
  const tag = `${lang} ${width}px${embedFrame ? " tray" : ""}`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
  if (MUTATE) {
    await ctx.route("**/*", async (route) => {
      const url = route.request().url();
      if (!/journey-map\.html/.test(url)) return route.fallback();
      const res = await route.fetch();
      let body = await res.text();
      let before = body;
      if (MUTATE === "untick-deletes") body = body.replace("() => retireNotePlacement(db, { tenantId: activeTenantId, placementId: placement.placementId, actorUid: auth.currentUser.uid }),", "() => deleteDoc(doc(db, TENANT.NOTE_PLACEMENTS, activeTenantId + \"__\" + placement.placementId)),");
      if (MUTATE === "edit-writes-early") body = body.replace("if (staged) {\n            const key = box.dataset.fpTick;", "if (false) {\n            const key = box.dataset.fpTick;");
      if (MUTATE === "no-last-guard") body = body.split("if (mine.length <= 1) { showPageStatus(LAST_FOLDER_SENTENCE()); return false; }").join("").split("if (!on && notesAndPlacementsLoaded && mine.length <= 1) say(LAST_FOLDER_SENTENCE());\n            else ok").join("if (false) say(LAST_FOLDER_SENTENCE());\n            else ok").split("if (!on && staged.size <= 1) { box.checked = true; say(LAST_FOLDER_SENTENCE()); return; }").join("");
      if (MUTATE === "no-trash") body = body.replace("() => trashFolder(db, { tenantId: activeTenantId, ownerPersonId: selectedPersonId, ownerUid: auth.currentUser.uid, folderId: n.folderId, actorUid: auth.currentUser.uid }),", "async () => {},");
      if (body === before) console.log(`  (mutation ${MUTATE} did not apply)`);
      await route.fulfill({ response: res, body });
    });
  }
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fB"])); } catch {} });
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
  await waitTree(P);
  const vw = await P.evaluate(() => document.documentElement.clientWidth);
  const wide = vw >= 1200;
  const en = lang === "en";

  // ---- 1. A tick files at once; an untick retires that one filing -------------------------------------------------
  await openNote(P, "fA", "n1");
  await openPaneMenu(P);
  const itemText = await P.$eval("[data-pane-menu] [data-pane-copy]", (e) => e.textContent.trim());
  check(`${tag}: the ⋯ menu's filing item says Folders…`, en ? itemText === "Folders…" : hasBn(itemText), itemText);
  await P.click("[data-pane-menu] [data-pane-copy]");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  const cls = await P.$eval("#folderPicker", (e) => e.className);
  check(`${tag}: ${wide ? "a popover beside the Note (1200px and up)" : "a sheet from the bottom"}`, wide ? /fp-pop/.test(cls) : /fp-sheet/.test(cls), cls);
  const box = await P.$eval("#folderPicker .folder-picker", (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; });
  check(`${tag}: the picker sits inside the screen`, box.l >= -1 && box.r <= box.w + 1 && box.t >= -1 && box.b <= box.h + 1, JSON.stringify(box));
  if (!wide) check(`${tag}: the sheet sits at the bottom edge`, Math.abs(box.b - box.h) <= 2, JSON.stringify(box));
  check(`${tag}: Alpha and Beta are ticked (n1's filings), Gamma is not`, (await ticked(P, "fA")) && (await ticked(P, "fB")) && !(await ticked(P, "fC")));
  const small = await P.$$eval("#folderPicker .fp-tickwrap, #folderPicker .fp-tools button, #folderPicker [data-picker-cancel]", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && (r.height < 39.5 || r.width < 39.5); }).map((e) => `${e.className || e.tagName}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  check(`${tag}: every tick box and button is at least 40px`, small.length === 0, small.join(" "));
  const rowsSmall = await P.$$eval("#folderPicker .folder-picker-row", (els) => els.filter((e) => e.getBoundingClientRect().height < 39.5).length);
  check(`${tag}: every row is at least 40px tall`, rowsSmall === 0, String(rowsSmall));
  await resetWrites(P);
  await P.click(tickBox("fC")); await settle(P);
  let w = placementWrites(await writes(P));
  check(`${tag}: ticking Gamma files the Note there AT ONCE (a new placement)`, w.some((x) => x.op !== "update" && x.op !== "delete" && /fC/.test(JSON.stringify(x.data)) && /n1/.test(JSON.stringify(x.data))), JSON.stringify(w));
  check(`${tag}: ...and Gamma stays ticked`, await ticked(P, "fC"));
  check(`${tag}: ...and the filing is said in words${en ? "" : " in Bangla"}`, en ? /filed in/i.test(await status(P)) : hasBn(await status(P)), await status(P));
  await resetWrites(P);
  await P.click(tickBox("fB")); await settle(P);
  w = placementWrites(await writes(P));
  check(`${tag}: unticking Beta RETIRES that one filing (status retired)`, w.some((x) => x.op === "tx-update" && x.data?.status === "retired"), JSON.stringify(w));
  check(`${tag}: ...and nothing is deleted`, !w.some((x) => x.op === "delete"), JSON.stringify(w));
  check(`${tag}: ...and Beta is now unticked, Alpha and Gamma still ticked`, !(await ticked(P, "fB")) && (await ticked(P, "fA")) && (await ticked(P, "fC")));

  // ---- 2. The last folder is refused, in words ------------------------------------------------------------------
  await P.click(tickBox("fC")); await settle(P);
  await resetWrites(P);
  await P.click(tickBox("fA")); await settle(P);
  w = placementWrites(await writes(P));
  check(`${tag}: unticking the LAST folder writes nothing`, w.length === 0, JSON.stringify(w));
  check(`${tag}: ...it stays ticked and says why${en ? "" : " in Bangla"}`, (await ticked(P, "fA")) && (en ? /at least one folder/.test(await msgText(P) + await status(P)) : hasBn(await msgText(P) || await status(P))), `${await msgText(P)} | ${await status(P)}`);

  // ---- 3. Search, New folder in the highlighted folder, rename, Move to Trash ----------------------------------------
  await P.fill("#folderPicker [data-picker-search]", "Note Two"); await wait(200);
  const hit = await P.$eval("#folderPicker [data-fp-notehit]", (e) => e.textContent).catch(() => "");
  check(`${tag}: searching for a Note finds it and shows the folders it is in`, /Note Two/.test(hit) && /Alpha/.test(hit), hit);
  await P.fill("#folderPicker [data-picker-search]", "gamm"); await wait(200);
  check(`${tag}: searching narrows the folders`, (await P.$$("#folderPicker [data-fp-tick]")).length === 1);
  await P.fill("#folderPicker [data-picker-search]", ""); await wait(200);
  await P.click(`#folderPicker [data-pick="fE"] .folder-row-name`);
  check(`${tag}: tapping a folder's NAME highlights it without filing the Note`, !(await ticked(P, "fE")) && await P.$eval('#folderPicker [data-pick="fE"]', (e) => e.classList.contains("fp-hl-row")));
  await resetWrites(P);
  await P.click("#folderPicker [data-fp-newfolder]");
  await P.fill("#folderPicker [data-fp-input]", "Inner");
  await P.click("#folderPicker [data-fp-go]"); await settle(P);
  w = await writes(P);
  check(`${tag}: ＋ New folder makes the folder INSIDE the highlighted one (Empty)`, w.some((x) => x.col === "noteFolders" && x.data?.name === "Inner" && x.data?.parentFolderId === "fE"), JSON.stringify(w.map((x) => `${x.col}:${x.op}:${x.data?.name}:${x.data?.parentFolderId}`)));
  await resetWrites(P);
  await P.click(`#folderPicker [data-pick="fE"] .folder-row-name`);
  await P.click("#folderPicker [data-fp-rename]");
  await P.fill("#folderPicker [data-fp-input]", "Emptied");
  await P.click("#folderPicker [data-fp-go]"); await settle(P);
  w = await writes(P);
  check(`${tag}: Rename writes the new name`, w.some((x) => x.col === "noteFolders" && x.data?.name === "Emptied"), JSON.stringify(w.map((x) => `${x.col}:${x.op}:${x.data?.name}`)));
  // A folder with no Notes goes to Trash through trashFolder (a status change; never an erase).
  await P.click(`#folderPicker [data-pick="fK"] .folder-row-name`);
  await resetWrites(P);
  await P.click("#folderPicker [data-fp-trash]"); await settle(P);
  w = await writes(P);
  check(`${tag}: Move to Trash (trashFolder) retires the folder and erases nothing`, w.some((x) => x.col === "noteFolders" && /fK/.test(x.id || "") && x.data?.status === "retired") && !w.some((x) => x.op === "delete"), JSON.stringify(w.map((x) => `${x.col}:${x.op}:${x.id}:${x.data?.status}`)));
  check(`${tag}: the button is called Move to Trash${en ? "" : " (in Bangla)"}`, await P.$eval("#folderPicker [data-fp-trash]", (e) => e.textContent.trim()).then((s) => (en ? /Move to Trash/.test(s) : hasBn(s))));
  // A long folder name wraps.
  const longBox = await P.$eval('#folderPicker [data-pick="fL"] .folder-row-name', (e) => ({ h: e.getBoundingClientRect().height, sw: e.scrollWidth, cw: e.clientWidth }));
  check(`${tag}: a long folder name WRAPS (several lines, never cut)`, longBox.h >= 30 && longBox.sw <= longBox.cw + 1, JSON.stringify(longBox));
  check(`${tag}: no sideways overflow with the picker open`, await noSideways(page) && await P.evaluate(() => { const p = document.querySelector("#folderPicker .folder-picker"); return p.scrollWidth <= p.clientWidth + 1; }));
  await closePicker(P);

  // ---- 4. Edit mode: ticks are staged and written only on Done; Cancel writes nothing --------------------------------
  await openNote(P, "fA", "n2");
  await P.locator("[data-pane-edit-toggle]:visible").first().click().catch(async () => { await openPaneMenu(P); await P.click("[data-pane-menu] [data-pane-edit-toggle]"); });
  await P.waitForSelector("[data-edit-title]", { state: "visible" });
  await openPaneMenu(P);
  await P.click("[data-pane-menu] [data-pane-copy]");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  await resetWrites(P);
  await P.click(tickBox("fC")); await settle(P);
  w = placementWrites(await writes(P));
  check(`${tag}: while editing, a tick is NOT written yet`, w.length === 0, JSON.stringify(w));
  await P.click("#folderPicker [data-picker-cancel]"); await settle(P);
  check(`${tag}: Cancel in the picker leaves the filings as they were (no writes)`, placementWrites(await writes(P)).length === 0);
  await openPaneMenu(P);
  await P.click("[data-pane-menu] [data-pane-copy]");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  check(`${tag}: ...and a re-opened picker shows Gamma unticked again`, !(await ticked(P, "fC")));
  await P.click(tickBox("fC"));
  await P.click("#folderPicker [data-picker-ok]"); await settle(P);
  check(`${tag}: "Use these folders" still writes nothing`, placementWrites(await writes(P)).length === 0);
  await P.locator("[data-pane-edit-toggle]:visible").first().click().catch(async () => { await openPaneMenu(P); await P.click("[data-pane-menu] [data-pane-edit-toggle]"); });
  await settle(P, 900);
  w = placementWrites(await writes(P));
  check(`${tag}: pressing Done writes the staged filing`, w.some((x) => x.op !== "update" && /fC/.test(JSON.stringify(x.data)) && /n2/.test(JSON.stringify(x.data))), JSON.stringify(w));

  // ---- 5. Each old entry point opens the picker -----------------------------------------------------------------
  await openNote(P, "fA", "n1");
  await openPaneMenu(P);
  await P.click("[data-pane-menu] [data-pane-move]");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  check(`${tag}: Move to… (the pane's ⋯) opens the picker`, await pickerOpen(P) && (await P.$$("#folderPicker [data-fp-tick]")).length === 0 && (await P.$("#folderPicker [data-fp-newfolder]")) !== null);
  await closePicker(P);
  await toTree(P);
  await P.click(`.folder-row[data-folder-id="fA"] [data-folder-name]`);
  await P.waitForSelector("#folderNotes [data-fn-title]", { state: "visible" });
  await P.click(`#folderNotes [data-note-id="n1"] [data-note-more], #folderNotes [data-note-id="n1"] .note-more-btn`).catch(() => {});
  const cardCopy = `#folderNotes [data-note-id="n1"] [data-note-copy]`;
  if (!(await P.isVisible(cardCopy))) await P.click(`#folderNotes [data-note-id="n1"] .note-more-btn`).catch(() => {});
  await P.click(cardCopy);
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  check(`${tag}: the Note card's ▾ → Folders… opens the picker with ticks`, (await P.$$("#folderPicker [data-fp-tick]")).length >= 5);
  await closePicker(P);
  await P.click(`#folderNotes [data-note-id="n1"] [data-note-move]`);
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  check(`${tag}: the Note card's ▾ → Move to… opens the picker`, await pickerOpen(P));
  await closePicker(P);
  await P.click("#folderNotes [data-folder-file-note]");
  await P.waitForSelector("#folderPicker .folder-picker", { state: "visible" });
  const noteRows = await P.$$eval("#folderPicker [data-fp-tick]", (b) => b.length);
  check(`${tag}: + File a Note here… opens the picker, listing the Notes`, noteRows === 3, String(noteRows));
  await resetWrites(P);
  await P.click('#folderPicker [data-fp-tick="n3"]'); await settle(P);
  w = placementWrites(await writes(P));
  check(`${tag}: ticking a Note there files it in this folder at once`, w.some((x) => x.op !== "update" && /n3/.test(JSON.stringify(x.data)) && /fA/.test(JSON.stringify(x.data))), JSON.stringify(w));
  await closePicker(P);

  check(`${tag}: no sideways scroll at the end`, await noSideways(page));
  const real = errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/i.test(e));
  check(`${tag}: no page errors`, real.length === 0, real.join(" | "));
  await ctx.close();
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) await run(lang, width);
  await run(lang, 1440, true);
}
await browser.close();
console.log(`\njourney-folder-picker-browser${MUTATE ? ` (mutation ${MUTATE})` : ""}: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
