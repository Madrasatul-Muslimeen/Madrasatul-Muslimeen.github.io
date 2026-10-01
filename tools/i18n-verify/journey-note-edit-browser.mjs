// Siyagah port round 5 (Owner decision 42.3): edit a Note in the pane, with
// autosave -- a local draft every ~1 s, a revision after ~30 s idle and on every
// way out. Every action goes through the REAL controls (handover §5.4); the
// stub's own DATA (exposed as window.__DATA by the seed) shows what was written.
// Playwright's clock stands in for the real 1 s / 30 s waits.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const LONG_TITLE = "A deliberately long Note title that a real tenant might really write down";
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1 };
  function ts(d) { return { toDate: function () { return new Date(d || "2026-09-01T10:00:00Z"); }, toMillis: function () { return new Date(d || "2026-09-01T10:00:00Z").getTime(); } }; }
  DATA.noteFolders = []; DATA.notes = []; DATA.notePlacements = []; DATA.noteRevisions = [];
  function F(id, name, parent, order) { DATA.noteFolders.push(Object.assign({ _id: "t1__" + id, folderId: id, name: name, parentFolderId: parent, semanticRole: "user", order: order, status: "active", updatedAt: ts() }, own)); }
  function N(id, title, body, day) { DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", createdAt: ts("2026-08-0" + day + "T09:00:00Z"), updatedAt: ts("2026-09-0" + day + "T10:00:00Z") }, own)); }
  function P(id, note, folder, order) { DATA.notePlacements.push(Object.assign({ _id: "t1__" + id, placementId: id, noteId: note, folderId: folder, order: order, status: "active" }, own)); }
  function filler(n) { var s = ""; for (var i = 0; i < n; i++) s += "<p>Paragraph " + i + " of filler text so the body is a real length.</p>"; return s; }
  var four = "<p>Intro line.</p><h1>First heading</h1>" + filler(2) + "<h2>Second heading</h2>" + filler(2) + "<h2>Third heading</h2>" + filler(2) + "<h3>Fourth heading</h3>" + filler(2);
  F("fA", "Alpha", null, 0);
  N("n1", ${JSON.stringify(LONG_TITLE)}, four, 1); N("n2", "Note Two", "<p>Second note body.</p>", 2); N("n3", "Note Three", "<p>Third body.</p>", 3); N("n4", "Note Four", "<p>Fourth body.</p>", 4);
  P("p1", "n1", "fA", 0); P("p2", "n2", "fA", 1); P("p3", "n3", "fA", 2); P("p4", "n4", "fA", 3);
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const STALE_EN = "This Note changed on another device. Your text is kept on this device — copy it before reloading.";

const revs = (page, id) => page.evaluate((i) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).map((r) => ({ id: r.revisionId, prev: r.previousRevisionId, title: r.title, body: r.bodyHtml })), id);
const draftOf = (page, id) => page.evaluate((i) => localStorage.getItem(`qr.journeyNoteDraft.${i}`), id);
const noteRow = (page, id) => page.evaluate((i) => { const n = window.__DATA.notes.find((x) => x.noteId === i); return { title: n.title, rev: n.currentRevisionId, body: n.bodyHtml }; }, id);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
// Never throws: a revision that does not arrive is a FAILED check (the count assertion that follows), not a crashed suite.
const waitRevs = (page, id, n) => until(page, ([i, c]) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).length === c, [id, n]).catch(() => null);
const editStatus = (page) => page.evaluate(() => { const e = document.querySelector("[data-edit-status]"); return e && !e.hidden ? e.textContent : ""; });
const pageStatus = (page) => page.evaluate(() => { const e = document.getElementById("pageStatusMsg"); return e && getComputedStyle(e).display !== "none" ? e.textContent : ""; });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const leafTitle = (noteId) => `[data-note-leaf][data-note-id="${noteId}"][data-in-folder="fA"] [data-note-open]`;
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const barH = (page) => page.evaluate(() => ({ h: document.querySelector("[data-pane-bar]").getBoundingClientRect().height, menuH: document.querySelector("[data-pane-menu-btn]").getBoundingClientRect().height, sw: document.querySelector("[data-pane-bar]").scrollWidth, cw: document.querySelector("[data-pane-bar]").clientWidth }));

async function openMenu(page) { await page.click("[data-pane-menu-btn]"); await page.waitForSelector("[data-pane-menu]", { state: "visible" }); }
async function toggleEdit(page) {
  if (await vis(page, "[data-pane-bar] > [data-pane-edit-toggle]")) await page.click("[data-pane-bar] > [data-pane-edit-toggle]");
  else { await openMenu(page); await page.click("[data-pane-menu] [data-pane-edit-toggle]"); }
}
async function openNote(page, id) {
  await page.click(leafTitle(id));
  await page.waitForSelector("#notePane:not([hidden])");
}
async function startEditing(page, id) { await openNote(page, id); await toggleEdit(page); await page.waitForSelector("[data-edit-body]"); }
async function typeAtEnd(page, text) { await page.click("[data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(text); }
async function tool(page, cmd) {
  if (await vis(page, `[data-edit-toolbar] > [data-cmd="${cmd}"]`)) await page.click(`[data-edit-toolbar] > [data-cmd="${cmd}"]`);
  else { await page.click('[data-bar-palette-toggle="editTools"]'); await page.click(`[data-bar-palette="editTools"] [data-cmd="${cmd}"]`); }
}
async function hide(page) { await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); }); }
async function show(page) { await page.evaluate(() => { delete document.visibilityState; }); }
async function toListTier(page, wide) { if (!wide && (await vis(page, "#notePane"))) { await page.click("[data-pane-back]"); } }

for (const lang of ["en", "bn"]) {
  for (const width of [390, 1280]) {
    const tag = `${lang} ${width}px`;
    const wide = width >= 1200;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 4 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.clock.install();

    // ---- 1. Edit opens the editor -------------------------------------------------
    await openNote(page, "n1");
    check(`${tag}: ✏️ Edit is on the header row`, await vis(page, "[data-pane-bar] > [data-pane-edit-toggle]") || await vis(page, "[data-pane-menu-btn]"));
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    check(`${tag}: Edit opens a title field and a contenteditable body`, await page.evaluate(() => document.querySelector("[data-edit-title]").offsetParent !== null && document.querySelector("[data-edit-body]").isContentEditable));
    check(`${tag}: the title field holds the full 60+ character title`, (await page.inputValue("[data-edit-title]")) === LONG_TITLE);
    check(`${tag}: the editor has NO fold arrows and NO .note-sec wrappers`, await page.evaluate(() => !document.querySelector("#notePane .note-sec, #notePane .note-sec-toggle, #notePane .note-sec-arrow")));
    check(`${tag}: the body shows the stored headings as plain H1-H4`, await page.evaluate(() => ["h1", "h2", "h3"].every((h) => document.querySelector(`[data-edit-body] ${h}`))));
    const hb = await barH(page);
    check(`${tag}: the header row stays ONE line while editing`, hb.h <= hb.menuH + 2 && hb.sw <= hb.cw + 1, JSON.stringify(hb));
    const tbh = await page.evaluate(() => { const t = document.querySelector("[data-edit-toolbar]"); return { h: t.getBoundingClientRect().height, sw: t.scrollWidth, cw: t.clientWidth, btn: Math.min(...[...t.querySelectorAll(".tb-btn")].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect().height)) }; });
    check(`${tag}: the toolbar is ONE row of 40px buttons`, tbh.h <= 48 && tbh.btn >= 40 && tbh.sw <= tbh.cw + 1, JSON.stringify(tbh));
    check(`${tag}: no sideways scroll in edit mode`, await noSideways(page));

    // ---- 2. Typing: a local draft within ~1 s, NO revision yet ----------------------
    await typeAtEnd(page, " EDITED");
    await page.clock.runFor(1100);
    const d1 = JSON.parse((await draftOf(page, "n1")) || "null");
    check(`${tag}: typing writes a local draft within ~1 s`, !!d1 && d1.bodyHtml.includes("EDITED") && d1.baseRevisionId === "rev-n1", JSON.stringify(d1));
    check(`${tag}: ...and NO revision yet`, (await revs(page, "n1")).length === 0);
    const st1 = await editStatus(page);
    check(`${tag}: the status line says it is saved on this device, in words`, lang === "bn" ? hasBn(st1) : st1 === "Saved on this device", st1);
    await page.clock.runFor(20000);
    check(`${tag}: still no revision at 21 s`, (await revs(page, "n1")).length === 0);

    // ---- 3. After 30 s idle: exactly ONE revision, chained -------------------------
    await page.clock.runFor(10000);
    await waitRevs(page, "n1", 1);
    await page.clock.runFor(31000);
    const r1 = await revs(page, "n1");
    check(`${tag}: after ~30 s idle exactly ONE revision is written, chained from the old one`, r1.length === 1 && r1[0].prev === "rev-n1" && r1[0].title === LONG_TITLE && r1[0].body.includes("EDITED"), JSON.stringify(r1).slice(0, 300));
    check(`${tag}: the local draft is cleared after the revision`, (await draftOf(page, "n1")) === null);
    const st2 = await editStatus(page);
    check(`${tag}: the status line says Saved`, lang === "bn" ? hasBn(st2) : st2 === "Saved", st2);

    // ---- 4. Done with nothing changed writes nothing; the pane shows the new text ---
    await toggleEdit(page);
    await page.waitForFunction(() => !document.querySelector("[data-edit-body]"));
    check(`${tag}: Done with no further change writes nothing`, (await revs(page, "n1")).length === 1);
    check(`${tag}: the pane shows the new text without a reload`, (await page.textContent("[data-pane-body]")).includes("EDITED") && !!(await page.$(".note-sec")));

    // ---- 5. Every way out flushes one revision; none writes when unchanged ------------
    let count = 1;
    async function ensureN1() {
      const shown = (await vis(page, "#notePane")) && (await page.textContent("[data-pane-title]")) === LONG_TITLE;
      if (shown) return;
      await toListTier(page, wide);
      await openNote(page, "n1");
    }
    async function pathCase(name, trigger, { stays = false } = {}) {
      await ensureN1();
      if (!(await page.$("[data-edit-body]"))) await toggleEdit(page);
      await page.waitForSelector("[data-edit-body]");
      // unchanged first
      await trigger();
      await page.waitForTimeout(100);
      await page.clock.runFor(200);
      check(`${tag}: ${name} with NOTHING changed writes no revision`, (await revs(page, "n1")).length === count);
      await ensureN1();
      if (!(await page.$("[data-edit-body]"))) await toggleEdit(page);
      await page.waitForSelector("[data-edit-body]");
      await typeAtEnd(page, " " + name.replace(/\W/g, "").slice(0, 6));
      await trigger();
      count++;
      await waitRevs(page, "n1", count);
      const rs = await revs(page, "n1");
      check(`${tag}: ${name} flushes the pending change as ONE revision, chained from the one before`, rs.length === count && rs[count - 1].prev === rs[count - 2].id, JSON.stringify(rs.map((r) => r.prev)));
    }
    await pathCase("Done", () => toggleEdit(page));
    if (!wide) await pathCase("Back", () => page.click("[data-pane-back]"));
    await pathCase("next note", async () => {
      if ((await vis(page, "[data-pane-bar] > [data-pane-next]"))) await page.click("[data-pane-bar] > [data-pane-next]");
      else { await openMenu(page); await page.click("[data-pane-menu] [data-pane-next]"); }
    });
    await pathCase("a folder chip", () => page.click("[data-pane-chip]"));
    await pathCase("visibility hidden", async () => { await hide(page); }, { stays: true });
    await show(page);
    await pathCase("pagehide", async () => { await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))); }, { stays: true });
    // chain check: every revision's previous is the one before it
    const all = await revs(page, "n1");
    const rowNow = await noteRow(page, "n1");
    check(`${tag}: revisions form one chain from rev-n1 and the Note points at the last`, all.every((r, i) => i === 0 ? r.prev === "rev-n1" : r.prev !== "rev-n1") && rowNow.body === all[all.length - 1].body);

    // ---- 6. Toolbar, with the real buttons ------------------------------------------
    if (await page.$("[data-edit-body]")) await toggleEdit(page); // Done on n1 (nothing changed)
    await toListTier(page, wide);
    await openNote(page, "n2");
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    await page.click("[data-edit-body]");
    await page.keyboard.press("Control+A");
    await tool(page, "bold");
    check(`${tag}: Bold wraps the selection`, await page.evaluate(() => !!document.querySelector("[data-edit-body] b, [data-edit-body] strong")));
    await tool(page, "h2");
    check(`${tag}: Heading 2 makes an H2`, await page.evaluate(() => !!document.querySelector("[data-edit-body] h2")));
    await tool(page, "ul");
    check(`${tag}: Bulleted list makes a list`, await page.evaluate(() => !!document.querySelector("[data-edit-body] ul")));
    await tool(page, "undo");
    check(`${tag}: Undo takes the last step back`, await page.evaluate(() => !document.querySelector("[data-edit-body] ul")));
    check(`${tag}: the toolbar stays one row after use`, await page.evaluate(() => { const t = document.querySelector("[data-edit-toolbar]"); return t.getBoundingClientRect().height <= 48 && t.scrollWidth <= t.clientWidth + 1; }));

    // ---- 7. The saved HTML is sanitised and carries no editor chrome --------------
    await page.evaluate(() => {
      const b = document.querySelector("[data-edit-body]");
      b.innerHTML = '<p>ok</p><img src="x" onerror="window.__pwned=1"><script>window.__pwned=2<\/script><p onclick="x()">click</p>';
      b.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.clock.runFor(31000);
    await waitRevs(page, "n2", 1);
    const r2 = (await revs(page, "n2"))[0];
    check(`${tag}: the saved HTML has no script or handlers`, !/<script|onerror|onclick/i.test(r2.body) && r2.body.includes("ok"), r2.body);
    check(`${tag}: the saved HTML has no editor chrome`, !/note-sec|contenteditable|data-edit|pane-edit/i.test(r2.body), r2.body);
    check(`${tag}: the saved title is the stored title (unchanged)`, r2.title === "Note Two");
    await toggleEdit(page);

    // ---- 8. A stale revision: nothing written, draft kept, said in words --------------
    await toListTier(page, wide);
    await openNote(page, "n3");
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    await typeAtEnd(page, " MINE");
    await page.evaluate(() => { window.__DATA.notes.find((n) => n.noteId === "n3").currentRevisionId = "rev-elsewhere"; });
    await page.clock.runFor(31000);
    await page.waitForFunction(() => document.querySelector("[data-edit-status]").classList.contains("problem"), null, { timeout: 8000 });
    check(`${tag}: a stale revision writes NOTHING`, (await revs(page, "n3")).length === 0);
    const dStale = JSON.parse((await draftOf(page, "n3")) || "null");
    check(`${tag}: ...keeps the local draft`, !!dStale && dStale.bodyHtml.includes("MINE"));
    const stTxt = await editStatus(page), pg = await pageStatus(page);
    check(`${tag}: ...and says so in words (pane and page status)`, lang === "bn" ? hasBn(stTxt) && hasBn(pg) : stTxt === STALE_EN && pg === STALE_EN, `${stTxt} | ${pg}`);
    await page.clock.runFor(60000);
    check(`${tag}: it does not keep retrying a conflict`, (await revs(page, "n3")).length === 0);

    // ---- 9. Leaving the conflict offers the kept text back (Restore / Discard) -------
    await toggleEdit(page); // Done
    await page.waitForFunction(() => !document.querySelector("[data-edit-body]"));
    await page.waitForSelector("[data-draft-restore]", { timeout: 8000 });
    check(`${tag}: the kept text is offered back: Restore my unsaved text / Discard it`, await vis(page, "[data-draft-restore]") && await vis(page, "[data-draft-discard]"));
    const offerTxt = await page.textContent("[data-draft-offer]");
    check(`${tag}: the offer is in the reader's language`, lang === "bn" ? hasBn(offerTxt) : /Restore my unsaved text/.test(offerTxt) && /Discard it/.test(offerTxt), offerTxt);
    await page.click("[data-draft-restore]");
    await page.waitForSelector("[data-edit-body]");
    check(`${tag}: Restore puts the unsaved text back in the editor`, (await page.textContent("[data-edit-body]")).includes("MINE"));
    await toggleEdit(page); // Done: now chained from rev-elsewhere, so it is written
    await waitRevs(page, "n3", 1);
    check(`${tag}: after Restore + Done the text is written as a revision chained from the OTHER change`, (await revs(page, "n3"))[0].prev === "rev-elsewhere");

    // ---- 10. A newer local draft on opening: Discard clears it -----------------------
    await toListTier(page, wide);
    await page.evaluate(() => localStorage.setItem("qr.journeyNoteDraft.n4", JSON.stringify({ title: "Note Four", bodyHtml: "<p>Drafted text</p>", baseRevisionId: "rev-n4", at: Date.now() })));
    await openNote(page, "n4");
    check(`${tag}: opening a Note with a newer local draft offers Restore / Discard`, await vis(page, "[data-draft-restore]") && await vis(page, "[data-draft-discard]"));
    await page.click("[data-draft-discard]");
    check(`${tag}: Discard clears the draft and the offer (no browser confirm)`, (await draftOf(page, "n4")) === null && !(await vis(page, "[data-draft-offer]")) && (await page.textContent("[data-pane-body]")).includes("Fourth body"));
    check(`${tag}: Discard wrote no revision`, (await revs(page, "n4")).length === 0);

    // ---- 11. Any other failure: draft kept, "Not saved yet", retried -------------------
    await page.evaluate(() => { window.__DATA.notes.find((n) => n.noteId === "n4").status = "retired"; });
    await toggleEdit(page);
    await page.waitForSelector("[data-edit-body]");
    await typeAtEnd(page, " OFFLINE");
    await page.clock.runFor(31000);
    await page.waitForFunction(() => /./.test(document.querySelector("[data-edit-status]").textContent) && document.querySelector("[data-edit-status]").classList.contains("problem"), null, { timeout: 8000 });
    const stFail = await editStatus(page);
    check(`${tag}: a failed write says "Not saved yet — will try again" and keeps the draft`, (lang === "bn" ? hasBn(stFail) : stFail === "Not saved yet — will try again") && (await draftOf(page, "n4"))?.includes("OFFLINE") && (await revs(page, "n4")).length === 0, stFail);
    await page.evaluate(() => { window.__DATA.notes.find((n) => n.noteId === "n4").status = "active"; });
    await page.clock.runFor(11000);
    await waitRevs(page, "n4", 1);
    check(`${tag}: ...and is retried on its own, then written`, (await revs(page, "n4"))[0].body.includes("OFFLINE") && (await draftOf(page, "n4")) === null);

    check(`${tag}: no sideways scroll at the end`, await noSideways(page));
    const real = errors.filter((e) => !/ERR_CERT|Not saved|note autosave|Retired Note|Failed to load resource/i.test(e));
    check(`${tag}: no page errors`, real.length === 0, real.slice(0, 3).join(" | "));
    await ctx.close();
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
// Added by the Architect in review (1 Oct 2026): while editing a LONG Note, the
// header row (with Done) and the formatting toolbar stay on screen. Measured
// before the fix: typing at the end left the toolbar 48-67px and Done 200-245px
// above the top of the screen at every width.
for (const [lang, width] of [["bn", 390], ["en", 1280]]) {
  const LONG_SEED = SEED.split("filler(2)").join("filler(14)");
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 760 }, extraSeedJs: LONG_SEED });
  await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 4 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
  await startEditing(page, "n1");
  await typeAtEnd(page, " end");
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= -1 && r.bottom <= innerHeight + 1; };
    const done = document.querySelector("[data-pane-bar] > [data-pane-edit-toggle]:not([hidden])") || document.querySelector("[data-pane-menu-btn]");
    const scrolled = (document.scrollingElement.scrollTop || 0) + (document.getElementById("notePane").scrollTop || 0);
    return { toolbar: inView(document.querySelector("[data-edit-toolbar]")), done: !!done && inView(done), scrolled };
  });
  check(`${lang} ${width}px: typing at the end of a long Note keeps the formatting toolbar and the header (Done / ⋯) on screen`, m.scrolled > 200 && m.toolbar && m.done, JSON.stringify(m));
  await ctx.close();
}

await browser.close();
process.exit(fail ? 1 : 0);
