// Audit part 60 (PCF MSA J29): the rest of Notes by the User Manual, driven as flows. Part 59 did the folder ⋯ menu, Move / Copy and tags.
//   windows   pop-up Note windows in Mapping My Journey: Pop out, two windows, the switcher / tab strip, Close all, the way back;
//             a refused save in a window says so (I15) and keeps what was typed
//   notespage the My Notes page (notes.html): + New Note about this unit, Save (I17 fields), a refused Save keeps what was typed,
//             Open in window, history, the way back (back=1)
// Mutations (--mutate=<name>) restore a plausible defect and must each fail the suite.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part60-notes-pages-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--mutate=<name>]
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
const MUTATIONS = {
  // notes.html showed the stored machine word ("content-update") in the history list
  historyreason: ["app/notes.html", "**/app/notes.html*", "${escapeHtml(reasonLabel)}</div>`;", "${escapeHtml(r.revisionReason)}</div>`;", "/app/notes.html"],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const hx = (id) => id.slice(1).repeat(32); // "n2" -> a real-shaped 32-hex id (Journaling evidence needs one)
// Mapping My Journey: Alpha{n1,n2,n3}
const SEED = (owner) => `
(function () {
  window.__stubApplyBatches = true; window.__stubRecordTxData = true; window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "${owner}", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  function ts() { return { toDate: function () { return new Date("2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date("2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = []; DATA.noteSections = []; DATA.noteTags = []; DATA.noteTagLinks = []; DATA.noteSources = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(l, title) { var id = l.slice(1).repeat(32); DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: "<p>" + title + " body</p>", currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: ts(), updatedAt: ts() }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: ts(), updatedAt: ts() }, own)); }
  function P(id, l, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: l.slice(1).repeat(32), folderId: folder, order: order, status: "active" }, own)); }
  F("fA", "Alpha", null, 0);
  N("n1", "Note One"); N("n2", "Note Two"); N("n3", "Note Three");
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2);
})();`;
const STUDENT = `DATA.tenantMemberUids[0].personId = "p2"; DATA.tenantMemberUids[0].roles = ["student"];`;
const seedFor = (who) => (who === "student" ? STUDENT + SEED("p2") : SEED("p1"));
const FAIL_ON = () => { window.__stubFailWrites = true; window.__stubFailTx = true; window.__stubFailBatch = true; };
const FAIL_OFF = () => { window.__stubFailWrites = false; window.__stubFailTx = false; window.__stubFailBatch = false; };

async function open(lang, width, pagePath, { seed = "" } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: seed || null });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  if (MUTATE && MUTATIONS[MUTATE][4] === pagePath.split("#")[0].split("?")[0]) {
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
const count = (page, sel) => ev(page, (s) => document.querySelectorAll(s).length, sel);
const vis = (page, sel) => ev(page, (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const rectOf = (page, sel) => ev(page, (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const smallTargets = (page, sel) => ev(page, (s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 39.5 && getComputedStyle(e).display !== "none"; }).map((e) => `${e.tagName}.${String(e.className).slice(0, 24)}:${Math.round(e.getBoundingClientRect().height)}`), sel);
const I17 = (d) => !!d && d.schemaVersion != null && d.createdAt != null && d.updatedAt != null && !!d.createdBy;
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const said = async (page) => (await banner(page)) + (await status(page));

const WIDTHS = [320, 390, 820, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
const W = (id) => `.note-win[data-note-id="${hx(id)}"]`;

for (const lang of LANGS) {
  const bn = lang === "bn";
  for (const width of WIDTHS) for (const who of ["owner", "student"]) {
    const sheet = width < 640;
    // ============================ pop-up Note windows ============================
    await flow(`windows-${who}`, lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
      await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
      const chooseAlpha = async () => {
        if (await vis(page, "#folderNotes [data-list-back]")) await page.click("#folderNotes [data-list-back]");
        await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
        await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
      };
      const leaf = (id) => `#folderNotes [data-note-leaf][data-note-id="${hx(id)}"][data-in-folder="fA"]`;
      await chooseAlpha();
      check(`${t}: POSITIVE CONTROL Alpha lists three Notes and no window is open`, (await count(page, "#folderNotes [data-note-leaf]")) === 3 && (await count(page, ".note-win")) === 0);
      // Pop out from the open Note
      await page.click(`${leaf("n1")} [data-note-open]`);
      await page.waitForSelector("#notePane:not([hidden])");
      await page.click("[data-pane-menu-btn]");
      await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
      await page.click("[data-pane-menu] [data-pane-popout]");
      await page.waitForSelector(W("n1"));
      check(`${t}: ⧉ Pop out opens one window with the Note and closes the pane`, (await count(page, ".note-win")) === 1 && !(await vis(page, "#notePane")) && (await page.textContent(`${W("n1")} .nw-title`)) === "Note One");
      const box = await rectOf(page, W("n1"));
      check(`${t}: the window sits inside the screen`, box.x >= -1 && box.y >= -1 && box.x + box.w <= width + 1, JSON.stringify(box));
      if (sheet) check(`${t}: on a phone the window fills the screen width`, box.w >= width - 2, JSON.stringify(box));
      const closeBox = await rectOf(page, `${W("n1")} [data-win-close]`);
      check(`${t}: ✕ on the window is finger-sized`, closeBox.w >= 40 && closeBox.h >= 40, JSON.stringify(closeBox));
      check(`${t}: no sideways page scroll with a window open`, await noSideways(page));
      if (!sheet) {
        // move: drag the title bar
        const before = await rectOf(page, W("n1"));
        const bar = await rectOf(page, `${W("n1")} .nw-title`);
        await page.mouse.move(bar.x + 20, bar.y + bar.h / 2);
        await page.mouse.down();
        await page.mouse.move(bar.x + 20 - 60, bar.y + bar.h / 2 + 40, { steps: 6 });
        await page.mouse.up();
        const after = await rectOf(page, W("n1"));
        check(`${t}: dragging the title bar moves the window`, Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20, `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
        check(`${t}: ...and it stays inside the screen`, after.x >= -1 && after.y >= -1 && after.x + after.w <= width + 1, JSON.stringify(after));
      }
      // the way back: ✕ closes the window and the list is where it was
      await page.click(`${W("n1")} [data-win-close]`);
      await page.waitForFunction(() => !document.querySelector(".note-win"));
      check(`${t}: ✕ closes the window and leaves Alpha's list in place (the way back)`, (await count(page, "#folderNotes [data-note-leaf]")) === 3 && (await vis(page, "#folderNotes")));
      // two windows: the switcher (phone) or the tab strip (wide), Close all
      if (sheet) { await page.setViewportSize({ width: 820, height: 900 }); await settle(page, 500); await chooseAlpha(); }
      await ev(page, (vw) => localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: vw - 420, y: 80, w: 360, h: 600 })), sheet ? 820 : width);
      for (const id of ["n2", "n3"]) {
        if (!(await count(page, leaf(id)))) await chooseAlpha();
        if (process.argv.includes("--dbg")) console.log("DBG", id, await ev(page, () => [...document.querySelectorAll("#folderNotes [data-note-leaf]")].map((l) => l.dataset.noteId.slice(0, 2) + ":" + l.dataset.inFolder + ":" + l.className + ":" + (l.querySelector("[data-note-toggle]") ? 1 : 0)).join(" ")));
        // the first window is parked over the right of the list at this width, so the row's buttons are pressed through the DOM
        await ev(page, (s) => { document.querySelector(`${s} [data-note-toggle]`).click(); document.querySelector(`${s} [data-note-window]`).click(); }, leaf(id));
        await page.waitForSelector(W(id));
      }
      if (sheet) await page.setViewportSize({ width, height: 844 });
      await settle(page, 400);
      check(`${t}: two windows are open`, (await count(page, ".note-win")) === 2);
      check(`${t}: ${sheet ? "the bottom switcher" : "the tab strip"} appears with two windows`, (await vis(page, "#noteWinSwitch")) && (await count(page, "#noteWinSwitch [data-win-switch]")) === 2);
      check(`${t}: the switcher's buttons are finger-sized`, (await smallTargets(page, "#noteWinSwitch button")).length === 0, (await smallTargets(page, "#noteWinSwitch button")).join(" | "));
      const closeAllLabel = await page.textContent("#noteWinSwitch [data-win-closeall]");
      if (bn) check(`${t}: ✕ Close all is in Bangla`, hasBn(closeAllLabel), closeAllLabel);
      else check(`${t}: ✕ Close all carries the count`, /Close all \(2\)/.test(closeAllLabel), closeAllLabel);
      check(`${t}: no sideways page scroll with two windows`, await noSideways(page));
      const topBefore = await ev(page, () => document.querySelector("#noteWinSwitch .nw-switch-btn.active").dataset.winSwitch);
      await page.click("#noteWinSwitch .nw-switch-btn:not(.active)");
      await settle(page, 300);
      const topAfter = await ev(page, () => document.querySelector("#noteWinSwitch .nw-switch-btn.active").dataset.winSwitch);
      check(`${t}: tapping the other tab brings that window to the front`, topBefore !== topAfter);
      await page.click("#noteWinSwitch [data-win-closeall]");
      await page.waitForFunction(() => !document.querySelector(".note-win"));
      check(`${t}: ✕ Close all closes both and removes the switcher`, (await count(page, ".note-win")) === 0 && !(await vis(page, "#noteWinSwitch")));
      check(`${t}: ...and the Notes list is still there (the way back)`, (await count(page, "#folderNotes [data-note-leaf]")) === 3);
      check(`${t}: opening and closing windows wrote nothing`, (await writes(page)).length === 0, JSON.stringify((await writes(page)).map((x) => x.col)));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: seedFor(who) });

    // ============================ editing inside a window: a revision, and a refused save ============================
    await flow(`winedit-${who}`, lang, width, "/app/journey-map.html#folders", async (t, page, ctx, errors) => {
      await page.waitForFunction(() => document.querySelectorAll("[data-folder-tree] .folder-row[data-folder-id]").length >= 1 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
      await page.click('.folder-row[data-folder-id="fA"] [data-folder-name]');
      await page.waitForSelector("#folderNotes [data-note-leaf]", { state: "visible" });
      await page.click(`#folderNotes [data-note-leaf][data-note-id="${hx("n1")}"] [data-note-open]`);
      await page.waitForSelector("#notePane:not([hidden])");
      await page.click("[data-pane-menu-btn]");
      await page.click("[data-pane-menu] [data-pane-popout]");
      await page.waitForSelector(W("n1"));
      const editToggle = async () => {
        const direct = `${W("n1")} [data-pane-bar] > [data-pane-edit-toggle]`;
        if (await vis(page, direct)) await page.click(direct);
        else { await page.click(`${W("n1")} [data-pane-menu-btn]`); await page.click(`${W("n1")} [data-pane-menu] [data-pane-edit-toggle]`); }
      };
      const typeIn = async (text) => { await page.click(`${W("n1")} [data-edit-body]`); await page.keyboard.press("Control+End"); await page.keyboard.type(text); };
      const revs = () => ev(page, (id) => window.__DATA.noteRevisions.filter((r) => r.noteId === id).length, hx("n1"));
      await editToggle();
      await page.waitForSelector(`${W("n1")} [data-edit-body]`, { state: "visible" });
      check(`${t}: POSITIVE CONTROL ✏️ Edit opens the editor inside the window`, await vis(page, `${W("n1")} [data-edit-body]`));
      await resetWrites(page);
      await typeIn(" KEPT");
      await editToggle(); // ✓ Done
      await settle(page, 1200);
      let w = await writes(page);
      const rev = w.find((x) => x.col === "noteRevisions" && x.op === "set");
      check(`${t}: ✓ Done writes one revision with the typed text and the I17 fields`, !!rev && /KEPT/.test(rev.data.bodyHtml || "") && I17(rev.data), JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      check(`${t}: the window shows the typed text after Done`, /KEPT/.test(await page.textContent(`${W("n1")} [data-pane-body]`)));
      // refused: the window says so (I15) and the text is kept on the device
      await ev(page, FAIL_ON);
      await resetWrites(page);
      await editToggle();
      await page.waitForSelector(`${W("n1")} [data-edit-body]`, { state: "visible" });
      await typeIn(" LOST?");
      await editToggle();
      await settle(page, 1200);
      const msg = (await said(page)) + (await ev(page, () => [...document.querySelectorAll("[data-edit-status]")].map((e) => e.textContent).join("")));
      check(`${t}: a refused save says "Not saved yet" on screen (I15)`, msg.length > 5, msg);
      if (bn) check(`${t}: ...in Bangla`, hasBn(msg), msg);
      check(`${t}: a refused save stores no revision`, (await writes(page)).filter((x) => x.col === "noteRevisions" && x.op === "set").length === 0);
      const draft = await ev(page, (id) => localStorage.getItem("qr.journeyNoteDraft." + id), hx("n1"));
      check(`${t}: ...and what was typed is kept on this device`, !!draft && /LOST\?/.test(draft), String(draft).slice(0, 80));
      await ev(page, FAIL_OFF);
      check(`${t}: no sideways page scroll`, await noSideways(page));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: seedFor(who) });

    // ============================ the My Notes page (notes.html) ============================
    await flow(`notespage-${who}`, lang, width, "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test&back=1", async (t, page, ctx, errors) => {
      const card = (id) => `.note-card[data-note-id="${hx(id)}"]`;
      await page.waitForSelector(card("n1"), { timeout: 15000 });
      const base = await count(page, ".note-card"); // the stub adds one Note of its own on this unit to the three seeded
      check(`${t}: POSITIVE CONTROL the page lists the seeded Notes`, base >= 3 && (await count(page, card("n1") + "," + card("n2") + "," + card("n3"))) === 3, String(base));
      check(`${t}: the page names the unit`, /Test/.test(await page.textContent("#unitBanner")));
      if (bn) check(`${t}: the unit line is in Bangla`, hasBn(await page.textContent("#unitBanner")));
      check(`${t}: back=1 shows ← Back (the way back)`, await vis(page, "#notesBackBtn"));
      check(`${t}: ← Back is finger-sized`, (await smallTargets(page, "#notesBackBtn")).length === 0, (await smallTargets(page, "#notesBackBtn")).join(" | "));
      check(`${t}: no sideways page scroll`, await noSideways(page));
      check(`${t}: the card buttons are finger-sized`, (await smallTargets(page, ".note-card .note-actions button")).length === 0, (await smallTargets(page, ".note-card .note-actions button")).slice(0, 3).join(" | "));
      // new Note about this unit
      check(`${t}: + New Note about this unit is offered`, await vis(page, "#newNoteBtn"));
      await page.click("#newNoteBtn");
      await page.waitForSelector("#newNoteForm", { state: "visible" });
      await page.fill("#newTitleInput", "Fresh title");
      await page.click("#newBodyEditor");
      await page.keyboard.type("Fresh body text");
      await ev(page, FAIL_ON);
      await resetWrites(page);
      await page.click("#newSaveBtn");
      await settle(page, 900);
      check(`${t}: a refused Save says so on screen (I15)`, (await said(page)).length > 5, await said(page));
      check(`${t}: a refused Save stores nothing`, (await writes(page)).filter((x) => x.op === "set").length === 0, JSON.stringify((await writes(page)).map((x) => x.col + ":" + x.op)));
      check(`${t}: a refused Save keeps the form, the title and the body`, (await vis(page, "#newNoteForm")) && (await page.inputValue("#newTitleInput")) === "Fresh title" && /Fresh body text/.test(await page.textContent("#newBodyEditor")));
      await ev(page, FAIL_OFF);
      await resetWrites(page);
      await page.click("#newSaveBtn");
      await settle(page, 1200);
      const w = await writes(page);
      const note = w.find((x) => x.col === "notes" && x.op === "set"), rev = w.find((x) => x.col === "noteRevisions" && x.op === "set"), src = w.find((x) => x.col === "noteSources" && x.op === "set");
      check(`${t}: Save stores a Note, its first revision and its source link`, !!note && !!rev && !!src, JSON.stringify(w.map((x) => x.col + ":" + x.op)));
      check(`${t}: ...each carrying the I17 fields`, !!note && !!rev && !!src && I17(note.data) && I17(rev.data) && I17(src.data), JSON.stringify([note && Object.keys(note.data), rev && Object.keys(rev.data), src && Object.keys(src.data)]));
      check(`${t}: ...the source link names this unit`, !!src && src.data.sourceKey === "ayah:2:255", JSON.stringify(src && src.data.sourceKey));
      check(`${t}: the new Note is in the list and the form is closed`, (await count(page, ".note-card")) === base + 1 && !(await vis(page, "#newNoteForm")), `${await count(page, ".note-card")} cards; ${await said(page)}`);
      // edit: Save revision refused keeps what was typed
      await page.click(`${card("n2")} [data-note-edit]`);
      await page.waitForSelector(`${card("n2")} [data-edit-body]`);
      await page.click(`${card("n2")} [data-edit-body]`);
      await page.keyboard.press("Control+End");
      await page.keyboard.type(" EDITED");
      await ev(page, FAIL_ON);
      await resetWrites(page);
      await page.click(`${card("n2")} [data-edit-save]`);
      await settle(page, 900);
      check(`${t}: a refused Save revision says so on screen (I15)`, (await said(page)).length > 5, await said(page));
      check(`${t}: ...keeps the edit form and the typed text`, /EDITED/.test(await page.textContent(`${card("n2")} [data-edit-body]`)));
      check(`${t}: ...and stores no revision`, (await writes(page)).filter((x) => x.col === "noteRevisions" && x.op === "set").length === 0);
      await ev(page, FAIL_OFF);
      await resetWrites(page);
      await page.click(`${card("n2")} [data-edit-save]`);
      await settle(page, 1200);
      const rv = (await writes(page)).find((x) => x.col === "noteRevisions" && x.op === "set");
      check(`${t}: Save revision stores one revision with the I17 fields`, !!rv && /EDITED/.test(rv.data.bodyHtml || "") && I17(rv.data), JSON.stringify((await writes(page)).map((x) => x.col + ":" + x.op)));
      // history
      await page.click(`${card("n2")} [data-note-history-toggle]`);
      await page.waitForFunction((s) => document.querySelector(s + " [data-note-history]").textContent.trim().length > 0 && !/Loading|…/.test(document.querySelector(s + " [data-note-history]").textContent), card("n2"), { timeout: 8000 }).catch(() => null);
      const hist = await page.textContent(`${card("n2")} [data-note-history]`);
      check(`${t}: Show history opens a revision list`, hist.trim().length > 3);
      check(`${t}: ...each row names its reason in words, not as a stored code`, !/content-update|created\b|restored\b|retired\b/.test(hist) && (bn ? hasBn(hist) : /Edited|Created/.test(hist)), hist.slice(0, 120));
      // open in window, then the way back
      await page.click(`${card("n3")} [data-note-window]`);
      await page.waitForSelector(W("n3"));
      check(`${t}: ⧉ Open in window opens the Note`, (await count(page, ".note-win")) === 1);
      await page.click(`${W("n3")} [data-win-close]`);
      await page.waitForFunction(() => !document.querySelector(".note-win"));
      check(`${t}: ✕ closes the window and the page's list is still there (the way back)`, (await count(page, ".note-card")) === base + 1);
      if (bn) {
        const eng = await ev(page, () => { const bad = []; const wk = document.createTreeWalker(document.getElementById("app"), NodeFilter.SHOW_TEXT); for (let n; (n = wk.nextNode());) { const p = n.parentElement; if (!p || /SCRIPT|STYLE|OPTION|TEXTAREA/.test(p.tagName) || !p.getClientRects().length || p.closest("[data-note-body], [data-note-title], #personSelect, #tenantSelect, #unitBanner strong, #newNoteForm [contenteditable]")) continue; const s = n.textContent.trim(); if (/[A-Za-z]{4,}/.test(s) && !/[ঀ-৿]/.test(s)) bad.push(s.slice(0, 40)); } return bad; });
        check(`${t}: no English left on the page`, eng.length === 0, eng.slice(0, 5).join(" | "));
      }
      check(`${t}: no sideways page scroll at the end`, await noSideways(page));
      check(`${t}: no page errors`, noErr(errors).length === 0, noErr(errors).slice(0, 2).join(" | "));
    }, { seed: seedFor(who) });
  }
}
await browser.close();
console.log(`\naudit-part60-notes-pages-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
