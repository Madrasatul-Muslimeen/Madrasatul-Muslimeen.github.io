// Audit part 59 (PCF MSA J29): the rest of Notes and Mapping My Journey by the User Manual, driven as flows.
//   folders   the folder ⋯ menu: new folder, new section, add subfolder, rename, move up/down, retire (a mark, never a delete, I4);
//             a create carries the I17 fields; a refused write says so (I15) and keeps what was typed
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part59-notes-tools-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
// [file, route glob, anchor (must occur exactly once), replacement, the page the mutation applies to]
const MUTATIONS = {};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

// Folders: Alpha{n1,n2}, Beta{} with BetaKid{}, Gamma{}. Writes are applied so the page can be driven on.
const SEED = `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date("2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body</p>", currentRevisionId: "rev-" + id, status: "active", createdAt: ts(), updatedAt: ts() }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0); F("fB", "Beta", null, 1); F("fBk", "BetaKid", "fB", 0); F("fG", "Gamma", null, 2);
  N("n1", "Note One"); N("n2", "Note Two");
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1);
})();`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;
const FAIL_ON = () => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; };
const FAIL_OFF = () => { window.__stubFailWrites = false; window.__stubFailTx = false; window.__stubFailBatch = false; };

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA", "fB", "fBk", "fG"])); } catch {} });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath.split("#")[0]) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: body.split(from).join(to) }));
  }
  const { page, errors } = await openPage(ctx, pagePath);
  await page.waitForTimeout(1200);
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
    await Promise.race([fn(tag, o.page, o.ctx, o.errors), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout flow")), 150000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}
const ev = (page, f, a) => page.evaluate(f, a);
const settle = (page, ms = 600) => page.waitForTimeout(ms);
const noErr = (errors) => errors.filter((e) => !/\[write failure\]|\[folder refusal\]|denied by the test|ERR_CERT|ERR_TUNNEL|net::|archive\.org|api\.quran|quran\.foundation|fonts\.g|Failed to load resource/i.test(e));
const resetWrites = (page) => ev(page, () => { window.__stubWriteData = []; sessionStorage.setItem("__stubWrites", "[]"); });
const writes = (page) => ev(page, () => (window.__stubWriteData || []).map((w) => ({ col: w.col, id: w.id, op: String(w.kind).replace(/^tx-/, ""), data: w.data })));
const status = (page) => ev(page, () => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const banner = (page) => ev(page, () => { const b = document.getElementById("qr-write-failure-banner"); return b && getComputedStyle(b).display !== "none" && b.getClientRects().length ? b.textContent : ""; });
const noSideways = (page) => ev(page, () => document.documentElement.scrollWidth <= innerWidth + 1);
const smallTargets = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 39.5 && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}.${String(e.className).slice(0, 24)}:${Math.round(e.getBoundingClientRect().height)}`), sel);
const I17 = (d) => !!d && d.schemaVersion != null && d.createdAt != null && d.updatedAt != null && !!d.createdBy;
async function waitTree(page) {
  await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 3 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
}
async function backToTree(page) {
  if (await page.isVisible("#folderNotes [data-list-back]")) { await page.click("#folderNotes [data-list-back]"); await page.waitForSelector("#listPane", { state: "visible" }); }
}
async function folderMenu(page, id, item) {
  await backToTree(page);
  await page.click(`.folder-row[data-folder-id="${id}"] .folder-menu-btn`);
  await page.click(`.folder-row[data-folder-id="${id}"] [data-folder-${item}]`);
}
const rowNames = (page) => ev(page, () => [...document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]")].map((r) => ({ id: r.dataset.folderId, name: (r.querySelector("[data-folder-name]") || {}).textContent.replace(/^\(\d[\d.]*\)\s*/, "") })));

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);

for (const lang of LANGS) {
  const bn = lang === "bn";
  for (const width of WIDTHS) for (const who of ["owner", "student"]) {
    // ============================ folders ============================
    await flow(`folders-${who}`, lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
      await waitTree(page);
      const names0 = await rowNames(page);
      check(`${t}: POSITIVE CONTROL the tree shows the seeded folders`, ["Alpha", "Beta", "Gamma"].every((n) => names0.some((r) => r.name === n)), JSON.stringify(names0));
      check(`${t}: no sideways page scroll`, await noSideways(page));
      await page.click('.folder-row[data-folder-id="fA"] .folder-menu-btn');
      const items = await ev(page, () => [...document.querySelectorAll('.folder-row[data-folder-id="fA"] .folder-row-menu button')].map((b) => Object.keys(b.dataset).filter((k) => k.startsWith("folder")).join("")));
      for (const k of ["folderAddnote", "folderAddsub", "folderRename", "folderUp", "folderDown", "folderCopy", "folderMove", "folderLook", "folderSection", "folderWindow", "folderDelete"]) {
        check(`${t}: the folder ⋯ menu offers ${k}`, items.includes(k), items.join(","));
      }
      const small = await smallTargets(page, '.folder-row[data-folder-id="fA"] .folder-row-menu button');
      check(`${t}: every folder-menu item is 40px or more`, small.length === 0, small.join(" | "));
      check(`${t}: the open menu does not scroll the page sideways`, await noSideways(page));
      await page.keyboard.press("Escape");
      await backToTree(page);

      // new folder from the footer form: stored with the I17 fields; a refused write is told (I15)
      await resetWrites(page);
      await page.fill("#newFolderName", "Delta");
      await page.click("#newFolderForm button[type=submit]");
      await settle(page);
      let w = await writes(page);
      const created = w.find((x) => x.col === "noteFolders" && x.op === "set");
      check(`${t}: + New folder stores one folder named Delta`, !!created && created.data.name === "Delta" && created.data.status === "active", JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      check(`${t}: the new folder carries the I17 fields`, !!created && I17(created.data), JSON.stringify(created && Object.keys(created.data)));
      check(`${t}: the new folder is in the tree`, (await rowNames(page)).some((r) => r.name === "Delta"));
      await resetWrites(page);
      await ev(page, FAIL_ON);
      await page.fill("#newFolderName", "Refused");
      await page.click("#newFolderForm button[type=submit]");
      await settle(page, 900);
      const said = (await banner(page)) + (await status(page));
      check(`${t}: a refused new folder says so on screen (I15)`, said.length > 5, said);
      check(`${t}: a refused new folder is not in the tree and nothing was stored`, !(await rowNames(page)).some((r) => r.name === "Refused") && (await writes(page)).filter((x) => x.op === "set").length === 0);
      check(`${t}: a refused new folder keeps what was typed`, (await ev(page, () => document.getElementById("newFolderName").value)) === "Refused");
      await ev(page, FAIL_OFF);
      await ev(page, () => { document.getElementById("newFolderName").value = ""; });

      // new section
      await resetWrites(page);
      await page.fill("#newFolderName", "Reflections");
      await page.click("#newSectionBtn");
      await settle(page, 900);
      w = await writes(page);
      const sec = w.find((x) => x.col === "noteSections");
      const gated = (await status(page)).length > 0 && !sec;
      check(`${t}: + New section stores a section with the I17 fields, or says in words that it is not open yet`, (!!sec && I17(sec.data) && sec.data.name === "Reflections") || gated, JSON.stringify(w.map((x) => x.col)) + (await status(page)));

      // add subfolder
      await resetWrites(page);
      await folderMenu(page, "fG", "addsub");
      await page.waitForSelector("[data-subfolder-input]", { state: "visible" });
      await page.fill("[data-subfolder-input]", "GammaKid");
      await page.press("[data-subfolder-input]", "Enter");
      await settle(page, 900);
      w = await writes(page);
      const kid = w.find((x) => x.col === "noteFolders" && x.op === "set");
      check(`${t}: Add subfolder stores GammaKid under Gamma with the I17 fields`, !!kid && kid.data.name === "GammaKid" && kid.data.parentFolderId === "fG" && I17(kid.data), JSON.stringify(kid && kid.data));

      // rename (inline, Enter saves)
      await resetWrites(page);
      await folderMenu(page, "fB", "rename");
      await page.waitForSelector("[data-folder-rename-input]", { state: "visible" });
      await page.fill("[data-folder-rename-input]", "Beta2");
      await page.press("[data-folder-rename-input]", "Enter");
      await settle(page, 900);
      w = await writes(page);
      check(`${t}: Rename updates the name (a field change, no new document)`, w.some((x) => x.col === "noteFolders" && x.id === "t1__fB" && x.data.name === "Beta2") && !w.some((x) => x.op === "set"), JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      check(`${t}: the renamed folder shows in the tree`, (await rowNames(page)).some((r) => r.id === "fB" && r.name === "Beta2"));
      await ev(page, FAIL_ON);
      await folderMenu(page, "fB", "rename");
      await page.waitForSelector("[data-folder-rename-input]", { state: "visible" });
      await page.fill("[data-folder-rename-input]", "Nope");
      await page.press("[data-folder-rename-input]", "Enter");
      await settle(page, 900);
      check(`${t}: a refused rename says so on screen (I15)`, ((await banner(page)) + (await status(page))).length > 5, (await banner(page)) + (await status(page)));
      check(`${t}: a refused rename leaves the old name`, (await rowNames(page)).some((r) => r.id === "fB" && r.name === "Beta2"));
      await ev(page, FAIL_OFF);

      // reorder: Gamma up swaps with Beta2
      await resetWrites(page);
      const ids3 = async () => (await rowNames(page)).filter((r) => ["fA", "fB", "fG"].includes(r.id)).map((r) => r.id).join();
      const before = await ids3();
      await folderMenu(page, "fG", "up");
      await settle(page, 900);
      const after = await ids3();
      check(`${t}: Move up puts Gamma before Beta2`, before !== after && after.indexOf("fG") < after.indexOf("fB"), `${before} -> ${after}`);
      check(`${t}: reordering is order changes only (no delete, no create)`, (await writes(page)).every((x) => x.op !== "delete" && x.op !== "set"), JSON.stringify((await writes(page)).map((x) => x.op)));

      // retire: a mark, never a delete (I4)
      await resetWrites(page);
      await folderMenu(page, "fG", "delete");
      await settle(page, 900);
      w = await writes(page);
      check(`${t}: Delete is a retire mark (status), never an erase (I4)`, w.some((x) => x.col === "noteFolders" && x.id === "t1__fG" && x.data.status === "retired") && !w.some((x) => x.op === "delete"), JSON.stringify(w.map((x) => x.col + ":" + x.op)) + (await status(page)));
      check(`${t}: the retired folder leaves the tree`, !(await rowNames(page)).some((r) => r.id === "fG"));
      check(`${t}: no sideways page scroll at the end`, await noSideways(page));
      if (bn) {
        const eng = await ev(page, () => { const bad = []; const wk = document.createTreeWalker(document.querySelector("#listPane") || document.body, NodeFilter.SHOW_TEXT); for (let n; (n = wk.nextNode());) { const p = n.parentElement; if (!p || /SCRIPT|STYLE|OPTION|TEXTAREA/.test(p.tagName) || !p.getClientRects().length) continue; const s = n.textContent.trim(); if (/[A-Za-z]{4,}/.test(s) && !/[ঀ-৿]/.test(s) && !/^(\([\d.]+\) )?(Alpha|Beta2?|BetaKid|Gamma|GammaKid|Delta|Note (One|Two)|Reflections|Refused|Nope)$/.test(s)) bad.push(s.slice(0, 40)); } return bad; });
        check(`${t}: no English left in the folder panel`, eng.length === 0, eng.slice(0, 5).join(" | "));
      }
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: who === "student" ? STUDENT + SEED.split('ownerPersonId: "p1"').join('ownerPersonId: "p2"') : SEED });
    // ============================ Move / Copy a Note ============================
    await flow(`movecopy-${who}`, lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
      await waitTree(page);
      const idsIn = async (id) => {
        await backToTree(page);
        await page.click(`.folder-row[data-folder-id="${id}"] [data-folder-name]`);
        await page.waitForSelector("#folderNotes", { state: "visible" });
        await settle(page, 300);
        return page.$$eval("#folderNotes [data-note-leaf]", (ls) => ls.map((l) => l.dataset.noteId).sort());
      };
      const noteMenu = async (noteId, folderId, item) => {
        await idsIn(folderId);
        const sel = `#folderNotes [data-note-leaf][data-note-id="${noteId}"][data-in-folder="${folderId}"]`;
        if ((await page.getAttribute(`${sel} [data-note-toggle]`, "aria-expanded")) !== "true") await page.click(`${sel} [data-note-toggle]`);
        await page.click(`${sel} [data-note-${item}]`);
        await page.waitForSelector("#folderPicker");
      };
      check(`${t}: POSITIVE CONTROL Alpha holds Note One and Note Two`, JSON.stringify(await idsIn("fA")) === '["n1","n2"]');
      // Copy n1 into Gamma: a placement is added, no Note is written; refused -> told, nothing filed
      await ev(page, FAIL_ON);
      await noteMenu("n1", "fA", "copy");
      await page.click('#folderPicker [data-fp-tick="fG"]');
      await settle(page, 900);
      await page.click("#folderPicker [data-picker-cancel]").catch(() => {});
      check(`${t}: a refused Copy says so on screen (I15)`, ((await banner(page)) + (await status(page))).length > 5, (await banner(page)) + (await status(page)));
      await ev(page, FAIL_OFF);
      check(`${t}: a refused Copy files nothing in Gamma`, (await idsIn("fG")).length === 0);
      await resetWrites(page);
      await noteMenu("n1", "fA", "copy");
      await page.click('#folderPicker [data-fp-tick="fG"]');
      await settle(page, 900);
      await page.click("#folderPicker [data-picker-cancel]").catch(() => {});
      let w = await writes(page);
      const pl = w.find((x) => x.col === "notePlacements" && x.op === "set");
      check(`${t}: Copy adds a placement with the I17 fields and writes no Note`, !!pl && pl.data.noteId === "n1" && pl.data.folderId === "fG" && I17(pl.data) && !w.some((x) => x.col === "notes"), JSON.stringify(w.map((x) => x.col + ":" + x.op)) + JSON.stringify(pl && Object.keys(pl.data)));
      check(`${t}: the Note is now in Alpha AND Gamma`, JSON.stringify(await idsIn("fA")) === '["n1","n2"]' && JSON.stringify(await idsIn("fG")) === '["n1"]');
      // Move n2 to Beta: gone from Alpha, in Beta; no Note written; no delete
      await resetWrites(page);
      await noteMenu("n2", "fA", "move");
      await page.click('#folderPicker [data-pick="fB"]');
      await settle(page, 900);
      w = await writes(page);
      check(`${t}: Move writes no Note and erases nothing (I4)`, w.length > 0 && !w.some((x) => x.col === "notes" || x.op === "delete"), JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      check(`${t}: the Note left Alpha and is in Beta`, JSON.stringify(await idsIn("fA")) === '["n1"]' && JSON.stringify(await idsIn("fB")) === '["n2"]');
      // Move refused: stays where it was
      await ev(page, FAIL_ON);
      await noteMenu("n2", "fB", "move");
      await page.click('#folderPicker [data-pick="fG"]');
      await settle(page, 900);
      check(`${t}: a refused Move says so on screen (I15)`, ((await banner(page)) + (await status(page))).length > 5, (await banner(page)) + (await status(page)));
      await ev(page, FAIL_OFF);
      check(`${t}: a refused Move leaves the Note in Beta`, JSON.stringify(await idsIn("fB")) === '["n2"]');
      check(`${t}: no sideways page scroll`, await noSideways(page));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: who === "student" ? STUDENT + SEED.split('ownerPersonId: "p1"').join('ownerPersonId: "p2"') : SEED });

    // ============================ Tags ============================
    await flow(`tags-${who}`, lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
      await waitTree(page);
      await backToTree(page);
      await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
      await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
      await page.click('#folderNotes [data-note-leaf][data-note-id="n1"] [data-note-open]');
      await page.waitForSelector("#notePane:not([hidden])");
      const openPicker = async () => {
        await page.click("[data-pane-menu-btn]");
        await page.waitForSelector("[data-pane-menu] [data-pane-tags]", { state: "visible" });
        await page.click("[data-pane-menu] [data-pane-tags]");
        await page.waitForSelector(".tag-picker");
      };
      const closePicker = async () => { await page.click("[data-tag-close]"); await page.waitForFunction(() => !document.querySelector(".tag-picker")); };
      await openPicker();
      check(`${t}: the picker's controls are finger-sized`, (await smallTargets(page, ".tag-picker button, .tag-picker input[type=text], .tag-pick-row")).length === 0, (await smallTargets(page, ".tag-picker button, .tag-picker input[type=text], .tag-pick-row")).join(" | "));
      // refused create: told, nothing stored, the name stays typed
      await ev(page, FAIL_ON);
      await page.fill("[data-tag-new-name]", "Prayer");
      await page.click("[data-tag-new]");
      await settle(page, 900);
      const shownMsg = await ev(page, () => { const m = document.querySelector("[data-tag-msg]"); return m && !m.hidden ? m.textContent : ""; });
      check(`${t}: a refused new tag says so on screen (I15)`, (shownMsg + (await banner(page)) + (await status(page))).length > 5, shownMsg);
      check(`${t}: a refused new tag keeps what was typed and stores nothing`, (await ev(page, () => document.querySelector("[data-tag-new-name]").value)) === "Prayer" && (await ev(page, () => (window.__DATA.noteTags || []).length)) === 0);
      await ev(page, FAIL_OFF);
      await resetWrites(page);
      await page.click("[data-tag-new]");
      await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
      let w = await writes(page);
      const tg = w.find((x) => x.col === "noteTags" && x.op === "set"), lk = w.find((x) => x.col === "noteTagLinks" && x.op === "set");
      check(`${t}: a new tag and its link both carry the I17 fields`, !!tg && !!lk && I17(tg.data) && I17(lk.data), JSON.stringify([tg && Object.keys(tg.data), lk && Object.keys(lk.data)]));
      check(`${t}: tagging writes no Note and no revision`, w.every((x) => x.col !== "notes" && x.col !== "noteRevisions"));
      await closePicker();
      check(`${t}: the Note shows the tag as a chip`, (await ev(page, () => [...document.querySelectorAll("#notePane [data-tag-chip]")].map((e) => e.textContent.trim()).join("|"))).includes("Prayer"));
      // remove: a retire mark
      await resetWrites(page);
      await openPicker();
      await page.uncheck(".tag-pick-row input");
      await page.waitForFunction(() => !document.querySelector(".tag-pick-row input:checked"));
      w = await writes(page);
      check(`${t}: removing a tag retires the link (a mark), never deletes it (I4)`, w.some((x) => x.col === "noteTagLinks" && x.data.status === "retired") && !w.some((x) => x.op === "delete"), JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      await page.check(".tag-pick-row input");
      await page.waitForFunction(() => document.querySelectorAll(".tag-pick-row input:checked").length === 1);
      await closePicker();
      // filter by the tag from the Tags list
      await ev(page, () => { const b = document.querySelector("#notePane [data-pane-back]"); if (b) b.click(); });
      await backToTree(page);
      await page.waitForSelector("[data-tags-block] [data-tag-item]");
      check(`${t}: the Tags list shows the tag with 1 Note`, (await page.textContent("[data-tag-item] [data-tag-count]")).trim() === "1");
      await page.click("[data-tag-item] [data-tag-open]");
      await page.waitForSelector("[data-tag-notes] [data-tag-note]");
      const listed = await page.$$eval("[data-tag-note]", (els) => els.map((e) => e.dataset.tagNote).sort());
      check(`${t}: tapping the tag lists exactly its Note`, JSON.stringify(listed) === '["n1"]', JSON.stringify(listed));
      check(`${t}: no sideways page scroll`, await noSideways(page));
      if (bn) check(`${t}: the Tags list is in Bangla`, /[ঀ-৿]/.test(await page.textContent("[data-tags-block] .tags-title")));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: who === "student" ? STUDENT + SEED.split('ownerPersonId: "p1"').join('ownerPersonId: "p2"') : SEED });
  }
}
await browser.close();
console.log(`\naudit-part59-notes-tools-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
