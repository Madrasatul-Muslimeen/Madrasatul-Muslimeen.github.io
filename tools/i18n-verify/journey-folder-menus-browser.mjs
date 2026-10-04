// Siyagah port round 3 (Owner decisions 41, 42.1, M4-M6): Mapping My Journey's
// Folders view gains Copy to… / Move to… / Delete (to Trash) and a Trash view
// with Restore. Every action is driven through the REAL menu items; no service
// function is called from here (handover §5.4).
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

// Folders: Alpha{n1,n2}, Beta{} with BetaKid{}, Gamma{}, Delta{n3,n4}, Empty{}.
// The stub never applies a write on its own, so this suite opts in to batches.
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + "</p>", currentRevisionId: "rev-" + id, status: "active", updatedAt: ts() }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0); F("fG", "Gamma", null, 2); F("fD", "Delta", null, 3); F("fE", "Empty", null, 4);
  N("n1", "Note One"); N("n2", "Note Two"); N("n3", "Note Three"); N("n4", "Note Four");
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fD", 0); P("p4", "n4", "fD", 1);
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");

async function resetWrites(page) {
  await page.evaluate(() => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); });
}
async function writes(page) {
  return page.evaluate(() => {
    const tx = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]").map((w) => ({ col: w.col, id: w.id, op: w.op || "update", data: w.data }));
    const other = (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: w.kind, data: w.data }));
    return [...tx, ...other];
  });
}
const status = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
async function settle(page, ms = 700) { await page.waitForTimeout(ms); }
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 5 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
// UPDATED IN PLACE (S8, 4 Oct 2026): Notes are no longer leaves of the tree -- they are listed in panel 2
// (#folderNotes) for the CHOSEN folder, and below 1200px the panels show one at a time. So these helpers
// choose a folder with a real tap and step back to the tree with the list's own back control.
async function backToTree(page) {
  if (await page.isVisible("#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForSelector("#listPane", { state: "visible" }); }
}
async function openFolder(page, folderId) {
  await backToTree(page);
  await page.click(`.folder-row[data-folder-id="${folderId}"] [data-folder-name]`);
  await page.waitForSelector(`#folderNotes [data-fn-title]`, { state: "visible" });
}
async function folderMenuClick(page, folderId, item) {
  await backToTree(page);
  await page.click(`.folder-row[data-folder-id="${folderId}"] .folder-menu-btn`);
  await page.click(`.folder-row[data-folder-id="${folderId}"] [data-folder-${item}]`);
}
async function noteMenuClick(page, noteId, folderId, item) {
  await openFolder(page, folderId);
  const sel = `#folderNotes [data-note-leaf][data-note-id="${noteId}"][data-in-folder="${folderId}"]`;
  await page.click(`${sel} [data-note-toggle]`);
  await page.click(`${sel} [data-note-${item}]`);
}
async function pick(page, key) { await page.click(`#folderPicker [data-pick="${key}"]`); await settle(page); }
/** Every folder's Notes, read by really choosing each folder in turn. */
async function leaves(page) {
  await backToTree(page);
  const ids = await page.$$eval("[data-folder-tree] .folder-row[data-folder-id]", (rs) => rs.map((r) => r.dataset.folderId).filter(Boolean));
  const out = {};
  for (const id of ids) {
    await openFolder(page, id);
    const notes = await page.$$eval("#folderNotes [data-note-leaf]", (ls) => ls.map((l) => l.dataset.noteId).sort());
    if (notes.length) out[id] = notes;
  }
  await backToTree(page);
  return out;
}
const rowNames = (page) => page.$$eval("[data-folder-tree] .folder-row[data-folder-id]", (rs) => rs.map((r) => ({ id: r.dataset.folderId, name: r.querySelector("[data-folder-name]")?.textContent.replace(/^\(\d[\d.]*\)\s*/, "") })));
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const lang of ["en", "bn"]) {
  for (const width of [390, 1280]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem("qr.journeyMapExpanded")) localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fBk", "fG", "fD", "fE"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await waitTree(page);
    // UPDATED IN PLACE (S8): the tree holds folders only; the Notes are in panel 2 once a folder is chosen.
    check(`${tag}: the tree shows its folders, and no Notes`, (await rowNames(page)).filter((r) => r.id).length === 6 && (await page.$$("[data-folder-tree] [data-note-leaf]")).length === 0);
    await openFolder(page, "fA");
    check(`${tag}: choosing a folder lists its Notes in panel 2`, (await page.$$("#folderNotes [data-note-leaf]")).length === 2);
    check(`${tag}: the old Remove item is gone and Delete is in every folder menu`,
      (await page.$$("[data-folder-remove]")).length === 0 && (await page.$$("[data-folder-delete]")).length === 6 && (await page.$$("[data-folder-copy]")).length === 6);

    // ---- Copy a note -------------------------------------------------------------
    await resetWrites(page);
    await noteMenuClick(page, "n1", "fA", "copy");
    await page.waitForSelector("#folderPicker");
    const topmost = await page.evaluate(() => {
      const d = document.querySelector("#folderPicker .folder-picker"), r = d.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { inside: !!hit && !!hit.closest("#folderPicker"), full: r.width >= innerWidth - 1 && r.height >= innerHeight - 1, w: r.width, h: r.height };
    });
    check(`${tag}: the picker is the topmost element at its own centre`, topmost.inside, JSON.stringify(topmost));
    check(`${tag}: the picker is ${width < 600 ? "full-screen on a phone" : "a centred window, not full-screen"}`, width < 600 ? topmost.full : !topmost.full, JSON.stringify(topmost));
    check(`${tag}: the picker has no sideways scroll`, await noSideways(page));
    // Added by the Architect in review (1 Oct 2026): the search box inherited the
    // toolbar's `flex: 1 1 12rem` and stood ~190-245px TALL in the picker column.
    const searchH = await page.evaluate(() => document.querySelector("#folderPicker [data-picker-search]").getBoundingClientRect().height);
    check(`${tag}: the picker's search box is one line tall, not stretched`, searchH >= 30 && searchH <= 60, `height ${searchH}`);
    const pickerText = await page.textContent("#folderPicker");
    check(`${tag}: the picker shows the derived numbers and a Cancel`, /\(0?1\)/.test(pickerText) && (await page.$("#folderPicker [data-picker-cancel]")) !== null);
    await page.fill("#folderPicker [data-picker-search]", "gam");
    check(`${tag}: picker search narrows the list`, (await page.$$("#folderPicker [data-pick]")).length === 1);
    await page.fill("#folderPicker [data-picker-search]", "");
    await page.click('#folderPicker [data-pick="fA"]', { force: true }); // aria-disabled, but a real finger can tap it
    check(`${tag}: a folder that already holds the note is refused in words and the picker stays open`,
      (await page.isVisible("#folderPicker [data-picker-msg]")) && (await page.textContent("#folderPicker [data-picker-msg]")).length > 5 && (await page.$("#folderPicker")) !== null);
    await pick(page, "fG");
    const m1 = await leaves(page), w1 = await writes(page);
    check(`${tag}: copy note — it shows in BOTH folders`, JSON.stringify(m1.fA) === '["n1","n2"]' && JSON.stringify(m1.fG) === '["n1"]', JSON.stringify(m1));
    check(`${tag}: copy note — the write log shows a placement created and NO note written`,
      w1.some((w) => w.col === "notePlacements" && w.op !== "update") && !w1.some((w) => w.col === "notes"), JSON.stringify(w1.map((w) => `${w.col}:${w.op}`)));
    check(`${tag}: copy note — a confirmation line is shown${lang === "bn" ? " in Bangla" : ""}`, lang === "bn" ? hasBn(await status(page)) : /copied/i.test(await status(page)), await status(page));

    // ---- Move a note -------------------------------------------------------------
    await resetWrites(page);
    await noteMenuClick(page, "n2", "fA", "move");
    await page.waitForSelector("#folderPicker");
    await pick(page, "fG");
    const m2 = await leaves(page), w2 = await writes(page);
    check(`${tag}: move note — it is in the new folder and gone from the old one`,
      JSON.stringify(m2.fG) === '["n1","n2"]' && JSON.stringify(m2.fA) === '["n1"]', JSON.stringify(m2));
    check(`${tag}: move note — no new note was written`, !w2.some((w) => w.col === "notes") && w2.length > 0);

    // ---- Copy a folder -----------------------------------------------------------
    await resetWrites(page);
    await folderMenuClick(page, "fA", "copy");
    await page.waitForSelector("#folderPicker");
    const picks = await page.$$eval("#folderPicker [data-pick]", (b) => b.map((x) => ({ k: x.dataset.pick, refused: x.getAttribute("aria-disabled") === "true" })));
    check(`${tag}: the folder picker offers Top level and refuses the folder itself`, picks.some((p) => p.k === "top") && picks.find((p) => p.k === "fA")?.refused === true, JSON.stringify(picks));
    check(`${tag}: the folder picker does not offer the system folders`, !picks.some((p) => p.k.startsWith("role:")));
    await pick(page, "top");
    const names3 = (await rowNames(page)).filter((r) => r.name === "Alpha");
    const w3 = await writes(page);
    const copyId = names3.map((r) => r.id).find((id) => id !== "fA");
    check(`${tag}: copy folder — a second "Alpha" tree appears`, names3.length === 2 && !!copyId, JSON.stringify(names3));
    check(`${tag}: copy folder — folders created, its note LINKED (a placement for n1), no note written`,
      w3.some((w) => w.col === "noteFolders" && w.op !== "update") && w3.some((w) => w.col === "notePlacements" && w.data?.noteId === "n1") && !w3.some((w) => w.col === "notes"),
      JSON.stringify(w3.map((w) => `${w.col}:${w.op}`)));
    check(`${tag}: copy folder — the confirmation says the notes are linked`, lang === "bn" ? hasBn(await status(page)) : /linked, not duplicated/.test(await status(page)), await status(page));
    // (S8: the copy holds no sub-folder, so it has no ▶ -- its Note is read from panel 2 by leaves().)
    const m3 = await leaves(page);
    check(`${tag}: copy folder — the new folder shows the SAME note (n1), not a copy of it`, JSON.stringify(m3[copyId]) === '["n1"]' && JSON.stringify(m3.fA) === '["n1"]', JSON.stringify(m3));

    // ---- Delete a folder holding notes: refused, no write at all ------------------
    await resetWrites(page);
    await folderMenuClick(page, "fD", "delete");
    await settle(page);
    const msg5 = await status(page), w5 = await writes(page);
    check(`${tag}: delete a folder holding notes — refused in words with the count`, msg5.includes("2") && (lang === "bn" ? hasBn(msg5) : /still holds 2 notes/.test(msg5)), msg5);
    check(`${tag}: delete a folder holding notes — no write at all, and it is still in the tree`,
      w5.length === 0 && (await rowNames(page)).some((r) => r.id === "fD"), JSON.stringify(w5));

    // ---- Delete an empty folder -> Trash -> Restore --------------------------------
    await resetWrites(page);
    await folderMenuClick(page, "fE", "delete");
    await settle(page);
    check(`${tag}: delete an empty folder — it leaves the tree`, !(await rowNames(page)).some((r) => r.id === "fE"));
    check(`${tag}: delete an empty folder — the write is a retire (status), never an erase`,
      (await writes(page)).some((w) => w.col === "noteFolders" && w.id === "t1__fE" && w.data?.status === "retired") && !(await writes(page)).some((w) => w.op === "delete"));
    await backToTree(page);
    await page.click(".page-menu-wrap .folder-menu-btn");
    await page.click("#openTrashBtn");
    await page.waitForSelector("[data-trash-folder-id]", { timeout: 8000 });
    const trashText = await page.textContent("#viewTrash");
    check(`${tag}: Trash lists the folder with its old place`, (await page.$('[data-trash-folder-id="fE"]')) !== null && trashText.includes("Empty") && (lang === "bn" ? hasBn(trashText) : /Was in/.test(trashText)), trashText.slice(0, 200));
    // Added by the Architect in review: no dangling separator when a row has no readable date.
    check(`${tag}: a Trash row never ends in a dangling " · "`, await page.evaluate(() => [...document.querySelectorAll("#viewTrash .trash-row-text .note")].every((e) => !/·\s*$/.test(e.textContent))));
    check(`${tag}: Trash has no erase and no Empty Trash`, !/erase|empty trash|delete forever|permanent/i.test(await page.evaluate(() => [...document.querySelectorAll("#viewTrash button")].map((b) => b.textContent).join("|"))));
    check(`${tag}: Trash has no sideways scroll`, await noSideways(page));
    await page.click('[data-trash-folder-id="fE"] [data-trash-restore]');
    await page.waitForSelector("#trashEmpty", { timeout: 8000 });
    check(`${tag}: restoring empties Trash, and an empty Trash says so in words`, (await page.textContent("#trashEmpty")).length > 5 && (lang === "en" ? /empty/i.test(await page.textContent("#trashEmpty")) : hasBn(await page.textContent("#trashEmpty"))));
    await page.click("#trashBackBtn");
    await settle(page, 400);
    check(`${tag}: Back returns to Folders and the restored folder is in the tree`, (await rowNames(page)).some((r) => r.id === "fE"));

    // ---- Move a folder; then into its own child is refused -------------------------
    await resetWrites(page);
    await folderMenuClick(page, "fE", "move");
    await page.waitForSelector("#folderPicker");
    await pick(page, "fB");
    const depthOf = (id) => page.evaluate((x) => Number(document.querySelector(`.folder-row[data-folder-id="${x}"]`)?.closest("li")?.dataset.depth ?? -1), id);
    check(`${tag}: move folder — "Empty" now sits inside Beta`, (await depthOf("fE")) === 1 && (await writes(page)).some((w) => w.col === "noteFolders" && w.id === "t1__fE" && JSON.stringify(w.data).includes("parentFolderId")));
    await resetWrites(page);
    await folderMenuClick(page, "fB", "move");
    await page.waitForSelector("#folderPicker");
    await page.click('#folderPicker [data-pick="fBk"]', { force: true });
    const refusal = await page.textContent("#folderPicker [data-picker-msg]");
    check(`${tag}: moving a folder into its own child is refused in words, the picker stays open and nothing is written`,
      (await page.isVisible("#folderPicker [data-picker-msg]")) && refusal.length > 10 && (lang === "bn" ? hasBn(refusal) : /own folders|inside itself/.test(refusal)) && (await writes(page)).length === 0, refusal);
    await page.click("#folderPicker [data-picker-cancel]");
    check(`${tag}: Cancel closes the picker`, (await page.$("#folderPicker")) === null);
    check(`${tag}: no sideways scroll at the end`, await noSideways(page));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|Failed to load resource|\[folder refusal\]/.test(e)).length === 0, errors.join(" | "));
    await ctx.close();

    // ---- Inside the pop-up tray's embed mode --------------------------------------
    const ctx2 = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await ctx2.addInitScript(() => { try { if (!localStorage.getItem("qr.journeyMapExpanded")) localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page: ep } = await openPage(ctx2, "/app/journey-map.html?embed=1#folders");
    await waitTree(ep);
    await folderMenuClick(ep, "fG", "copy");
    await ep.waitForSelector("#folderPicker");
    const embedTop = await ep.evaluate(() => {
      const r = document.querySelector("#folderPicker .folder-picker").getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && !!hit.closest("#folderPicker");
    });
    check(`${tag} (embed): the picker is topmost at its own centre and the page does not scroll sideways`, embedTop && (await noSideways(ep)));
    await ctx2.close();
  }
}
await browser.close();
console.log(`\njourney-folder-menus-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
