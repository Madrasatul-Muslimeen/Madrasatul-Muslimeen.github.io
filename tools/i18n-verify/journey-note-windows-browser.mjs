// Siyagah port round 6a (Owner decisions 42.4, M3): Note pop-up windows in
// Mapping My Journey -- Single (the pane's ⋯ -> Pop out) and Multi (a row's ▾ ->
// Open in window, Ctrl/⌘-click on a title). Real controls and real mouse drags
// (handover §5.4); the stub's DATA shows what was written. Playwright's clock
// stands in for the real 1 s / 30 s waits.
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
const HEIGHT = 900;

const W = (id) => `.note-win[data-note-id="${id}"]`;
const leafTitle = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-open]`;
const leafToggle = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-toggle]`;
const leafWindowBtn = (id) => `[data-note-leaf][data-note-id="${id}"][data-in-folder="fA"] [data-note-window]`;
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const rectOf = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const revs = (page, id) => page.evaluate((i) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).map((r) => ({ prev: r.previousRevisionId, title: r.title, body: r.bodyHtml })), id);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
// Never throws: a revision that does not arrive is a FAILED check, not a crashed suite.
const waitRevs = (page, id, n) => until(page, ([i, c]) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).length === c, [id, n]).catch(() => null);
/** True when the element's own centre is painted by the element (or something inside it): topmost, not covered. */
const topmostAtCentre = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return false;
  const r = e.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return !!hit && (e === hit || e.contains(hit));
}, sel);
/** The window whose box is painted at a point (by its Note id). */
const windowAt = (page, x, y) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest(".note-win")?.dataset.noteId ?? null, [x, y]);

async function popOutFromPane(page) {
  await page.click("[data-pane-menu-btn]");
  await page.waitForSelector("[data-pane-menu] [data-pane-popout]", { state: "visible" });
  await page.click("[data-pane-menu] [data-pane-popout]");
}
async function openPaneNote(page, id) {
  await page.click(leafTitle(id));
  await page.waitForSelector("#notePane:not([hidden])");
}
/** Multi: the row's ▾ -> ⧉ Open in window. */
async function openInWindow(page, id) {
  await page.click(leafToggle(id));
  await page.click(leafWindowBtn(id));
  await page.waitForSelector(W(id));
}
async function closeAllWindows(page) {
  while ((await count(page, ".note-win")) > 0) {
    const n = await count(page, ".note-win");
    await page.evaluate(() => document.querySelector(".note-win:not(.sheet-hidden) [data-win-close], .note-win [data-win-close]").click());
    await page.waitForFunction((c) => document.querySelectorAll(".note-win").length < c, n);
  }
}
async function winEditToggle(page, id) {
  const direct = `${W(id)} [data-pane-bar] > [data-pane-edit-toggle]`;
  if (await vis(page, direct)) await page.click(direct);
  else { await page.click(`${W(id)} [data-pane-menu-btn]`); await page.click(`${W(id)} [data-pane-menu] [data-pane-edit-toggle]`); }
}
async function typeIn(page, id, text) { await page.click(`${W(id)} [data-edit-body]`); await page.keyboard.press("Control+End"); await page.keyboard.type(text); }

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    const tag = `${lang} ${width}px`;
    const sheet = width < 640;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: SEED });
    await ctx.addInitScript(() => { try { localStorage.setItem("qr.journeyMapExpanded", JSON.stringify(["fA"])); } catch {} });
    const { page, errors } = await openPage(ctx, "/app/journey-map.html#folders");
    await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 4 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
    await page.clock.install();

    // ---- 1. Single: Pop out ---------------------------------------------------------
    await openPaneNote(page, "n1");
    await page.click("[data-pane-menu-btn]");
    const popLabel = await page.textContent("[data-pane-menu] [data-pane-popout]");
    check(`${tag}: the pane's ⋯ menu has ⧉ Pop out, with its word`, lang === "bn" ? hasBn(popLabel) && popLabel.includes("⧉") : popLabel.trim() === "⧉ Pop out", popLabel);
    await page.click("[data-pane-menu] [data-pane-popout]");
    await page.waitForSelector(W("n1"));
    check(`${tag}: Pop out closes the pane`, !(await vis(page, "#notePane")));
    check(`${tag}: ...and opens exactly one window with the same Note`, (await count(page, ".note-win")) === 1 && (await page.textContent(`${W("n1")} .nw-title`)) === LONG_TITLE);
    check(`${tag}: the window holds the Note's body, with folding headings`, (await page.textContent(`${W("n1")} [data-pane-body]`)).includes("Intro line.") && (await count(page, `${W("n1")} .note-sec`)) >= 3);
    const closeBox = await rectOf(page, `${W("n1")} [data-win-close]`);
    check(`${tag}: ✕ is 44px`, closeBox.w >= 44 && closeBox.h >= 44, JSON.stringify(closeBox));
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    check(`${tag}: the window's ⋯ menu is topmost at its own centre`, await topmostAtCentre(page, `${W("n1")} [data-pane-menu]`));
    const copyBox = await rectOf(page, `${W("n1")} [data-pane-copy]`);
    await page.mouse.click(copyBox.x + copyBox.w / 2, copyBox.y + copyBox.h / 2);
    await page.waitForSelector(".folder-picker", { timeout: 5000 }).catch(() => null);
    check(`${tag}: a real tap on Copy to… inside the window opens the destination picker`, await vis(page, ".folder-picker"));
    check(`${tag}: ...and the picker is above the window`, await topmostAtCentre(page, ".folder-picker"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".folder-picker"), null, { timeout: 5000 }).catch(() => null);
    if (await count(page, ".folder-picker")) await page.evaluate(() => document.querySelector(".folder-picker-overlay")?.click());
    const detailsLabel = await page.textContent(`${W("n1")} [data-win-details]`);
    check(`${tag}: the Details line is closed to one line by default`, await page.evaluate((s) => { const d = document.querySelector(`${s} .nw-details`); return !d.classList.contains("open") && d.getBoundingClientRect().height <= 30; }, W("n1")));
    check(`${tag}: Details has its word${lang === "bn" ? " in Bangla" : ""}`, lang === "bn" ? hasBn(detailsLabel) : detailsLabel.includes("Details"), detailsLabel);
    await page.click(`${W("n1")} [data-win-details]`);
    check(`${tag}: Details opens the folders and the last-changed date`, (await page.textContent(`${W("n1")} .nw-details`)).includes("Alpha") && (await count(page, `${W("n1")} [data-pane-chip]`)) === 1);
    check(`${tag}: no sideways scroll with a window open`, await noSideways(page));
    await page.click(`${W("n1")} [data-win-close]`);
    check(`${tag}: ✕ closes the window`, (await count(page, ".note-win")) === 0);

    // ---- 2. Multi: several windows, offset, front-on-click --------------------------
    if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT }); // a sheet covers the list, so open them wide, then narrow
    // Park the windows to the right (the device's remembered geometry) so the list's titles stay reachable by a real click.
    await page.evaluate((vw) => localStorage.setItem("mmsa-journey-note-window", JSON.stringify({ x: vw - 420, y: 80, w: 360, h: 600 })), sheet ? 820 : width);
    await openInWindow(page, "n2");
    await page.click(leafTitle("n3"), { modifiers: ["Control"] });
    await page.waitForSelector(W("n3"));
    check(`${tag}: a row's ▾ -> Open in window, and Ctrl-click on a title, open two windows`, (await count(page, ".note-win")) === 2);
    check(`${tag}: ...and no pane was opened by either`, !(await vis(page, "#notePane")));
    const rowBtn = await page.textContent(leafWindowBtn("n2")).catch(() => "");
    check(`${tag}: the row's ▾ button carries ⧉ and its word`, lang === "bn" ? hasBn(rowBtn) && rowBtn.includes("⧉") : rowBtn.trim() === "⧉ Open in window", rowBtn);
    if (sheet) await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(150);
    if (!sheet) {
      const r2 = await rectOf(page, W("n2")), r3 = await rectOf(page, W("n3"));
      check(`${tag}: the second window opens offset from the first`, Math.abs(r3.x - r2.x) > 10 && Math.abs(r3.y - r2.y) > 10, JSON.stringify([r2, r3]));
      const px = Math.max(r2.x, r3.x) + 60, py = Math.max(r2.y, r3.y) + 120;
      check(`${tag}: the newest window is in front where they overlap`, (await windowAt(page, px, py)) === "n3");
      await page.mouse.click(r2.x + 20, r2.y + 8); // the visible strip of the back window's title bar
      check(`${tag}: clicking the back window brings it to the front (topmost where they overlap)`, (await windowAt(page, px, py)) === "n2");
      const handles = await page.evaluate(() => [...document.querySelectorAll(`.note-win .nw-h`)].filter((h) => getComputedStyle(h).display !== "none").length);
      check(`${tag}: each window has eight resize handles`, handles === 16, String(handles));
    } else {
      const r3 = await rectOf(page, W("n3"));
      check(`${tag}: a window is a SHEET -- fills the width, from the left edge`, Math.abs(r3.w - (await page.evaluate(() => document.documentElement.clientWidth))) <= 1 && r3.x === 0, JSON.stringify(r3));
      check(`${tag}: a sheet has no drag handles`, (await page.evaluate(() => [...document.querySelectorAll(".note-win .nw-h")].filter((h) => getComputedStyle(h).display !== "none").length)) === 0);
      const before = await rectOf(page, `${W("n3")}`);
      const bar = await rectOf(page, `${W("n3")} .nw-bar`);
      await page.mouse.move(bar.x + 60, bar.y + 20); await page.mouse.down(); await page.mouse.move(bar.x + 160, bar.y + 120, { steps: 5 }); await page.mouse.up();
      const after = await rectOf(page, W("n3"));
      check(`${tag}: dragging a sheet's title bar moves nothing`, before.x === after.x && before.y === after.y);
      check(`${tag}: with two open, the bottom switcher lists both`, (await page.evaluate(() => [...document.querySelectorAll("#noteWinSwitch [data-win-switch]")].map((b) => b.textContent))).join("|") === "Note Two|Note Three");
      const sw = await page.evaluate(() => [...document.querySelectorAll("#noteWinSwitch [data-win-switch]")].map((b) => b.getBoundingClientRect().height));
      check(`${tag}: switcher targets are 40px`, sw.every((h) => h >= 40), JSON.stringify(sw));
      check(`${tag}: the switcher is topmost at its centre`, await topmostAtCentre(page, "#noteWinSwitch [data-win-switch]"));
      const swLabel = await page.getAttribute("#noteWinSwitch", "aria-label");
      check(`${tag}: the switcher's name is in the reader's language`, lang === "bn" ? hasBn(swLabel) : swLabel === "Open notes", swLabel);
      const box = await rectOf(page, '#noteWinSwitch [data-win-switch="' + (await page.evaluate(() => document.querySelectorAll("#noteWinSwitch [data-win-switch]")[0].dataset.winSwitch)) + '"]');
      await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
      check(`${tag}: tapping the first switcher entry shows Note Two`, await page.evaluate(() => { const w = document.querySelector('.note-win[data-note-id="n2"]'); return !w.classList.contains("sheet-hidden") && document.querySelector('.note-win[data-note-id="n3"]').classList.contains("sheet-hidden"); }));
      check(`${tag}: a sheet leaves room for the switcher`, await page.evaluate(() => document.querySelector('.note-win[data-note-id="n2"]').getBoundingClientRect().bottom <= document.getElementById("noteWinSwitch").getBoundingClientRect().top + 1));
    }

    // ---- 3. A Note is never live in two views ---------------------------------------
    const winsBefore = await count(page, ".note-win");
    await page.evaluate(() => document.querySelector('[data-note-leaf][data-note-id="n2"] [data-note-window]').click()); // the row may sit under a window: click the real button without a hit-test
    await page.waitForTimeout(100);
    check(`${tag}: opening an already-open Note opens no second window`, (await count(page, ".note-win")) === winsBefore && (await count(page, W("n2"))) === 1);
    check(`${tag}: ...it focuses the existing one (now in front)`, await page.evaluate(() => { const ws = [...document.querySelectorAll(".note-win")].filter((w) => !w.classList.contains("sheet-hidden")); return ws.reduce((a, b) => (Number(b.style.zIndex) > Number(a.style.zIndex) ? b : a)).dataset.noteId === "n2"; }));
    await page.evaluate(() => document.querySelector('[data-note-leaf][data-note-id="n3"] [data-note-open]').click());
    await page.waitForTimeout(100);
    check(`${tag}: clicking the title of a Note that is in a window opens no pane for it`, !(await vis(page, "#notePane")) && (await count(page, W("n3"))) === 1);
    await closeAllWindows(page);

    // ---- 4. Editing in a window: the SAME autosave ----------------------------------
    await openInWindow(page, "n4").catch(async () => {});
    if (!(await count(page, W("n4")))) { if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT }); await openInWindow(page, "n4"); if (sheet) await page.setViewportSize({ width, height: HEIGHT }); }
    await winEditToggle(page, "n4");
    await page.waitForSelector(`${W("n4")} [data-edit-body]`);
    check(`${tag}: ✏️ Edit works inside a window (title field + contenteditable body)`, await page.evaluate((s) => document.querySelector(`${s} [data-edit-title]`).offsetParent !== null && document.querySelector(`${s} [data-edit-body]`).isContentEditable, W("n4")));
    check(`${tag}: the formatting row is in the window while editing`, await vis(page, `${W("n4")} [data-edit-toolbar]`));
    await typeIn(page, "n4", " WINEDIT");
    await page.clock.runFor(1100);
    check(`${tag}: typing in a window keeps a local draft...`, !!(await page.evaluate(() => localStorage.getItem("qr.journeyNoteDraft.n4"))));
    check(`${tag}: ...and no revision yet`, (await revs(page, "n4")).length === 0);
    await page.clock.runFor(31000);
    await waitRevs(page, "n4", 1);
    const r4 = await revs(page, "n4");
    check(`${tag}: after ~30 s idle exactly ONE revision is written from the window`, r4.length === 1 && r4[0].prev === "rev-n4" && r4[0].body.includes("WINEDIT"), JSON.stringify(r4).slice(0, 200));
    await winEditToggle(page, "n4");
    await page.waitForFunction((s) => !document.querySelector(`${s} [data-edit-body]`), W("n4"));
    check(`${tag}: Done with nothing changed writes nothing`, (await revs(page, "n4")).length === 1);
    await winEditToggle(page, "n4");
    await page.waitForSelector(`${W("n4")} [data-edit-body]`);
    await typeIn(page, "n4", " CLOSEFLUSH");
    await page.click(`${W("n4")} [data-win-close]`);
    await waitRevs(page, "n4", 2);
    const r4b = await revs(page, "n4");
    check(`${tag}: ✕ on a window mid-edit flushes ONE revision`, r4b.length === 2 && r4b[1].body.includes("CLOSEFLUSH"), JSON.stringify(r4b).slice(0, 200));
    await closeAllWindows(page);

    // ---- 5. Popping out a Note mid-edit writes its pending change FIRST --------------
    if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT });
    await openPaneNote(page, "n3");
    if (sheet) await page.setViewportSize({ width, height: HEIGHT });
    const paneDirect = "[data-pane-bar] > [data-pane-edit-toggle]";
    if (await vis(page, paneDirect)) await page.click(paneDirect);
    else { await page.click("[data-pane-menu-btn]"); await page.click("[data-pane-menu] [data-pane-edit-toggle]"); }
    await page.waitForSelector("#notePane [data-edit-body]");
    await page.click("#notePane [data-edit-body]"); await page.keyboard.press("Control+End"); await page.keyboard.type(" POPMID");
    await popOutFromPane(page);
    await page.waitForSelector(W("n3"));
    await waitRevs(page, "n3", 1);
    const r3 = await revs(page, "n3");
    check(`${tag}: popping out mid-edit writes exactly one revision first`, r3.length === 1 && r3[0].body.includes("POPMID"), JSON.stringify(r3).slice(0, 200));
    check(`${tag}: ...and the window shows the Note with the new text`, (await page.textContent(`${W("n3")} [data-pane-body]`)).includes("POPMID"));
    check(`${tag}: ...and the pane is closed`, !(await vis(page, "#notePane")));
    await closeAllWindows(page);

    // ---- 6. Drag, resize, keep on screen, remember (640px and up) -------------------
    if (!sheet) {
      await page.evaluate(() => localStorage.removeItem("mmsa-journey-note-window"));
      await openPaneNote(page, "n1");
      await popOutFromPane(page);
      await page.waitForSelector(W("n1"));
      const r0 = await rectOf(page, W("n1"));
      const bar = await rectOf(page, `${W("n1")} .nw-bar`);
      await page.mouse.move(bar.x + 120, bar.y + 20); await page.mouse.down(); await page.mouse.move(bar.x + 120 - 50, bar.y + 20 + 40, { steps: 6 }); await page.mouse.up();
      const r1 = await rectOf(page, W("n1"));
      check(`${tag}: dragging the title bar moves the window by the drag distance`, Math.abs(r1.x - (r0.x - 50)) <= 1 && Math.abs(r1.y - (r0.y + 40)) <= 1 && r1.w === r0.w, JSON.stringify([r0, r1]));
      const se = { x: r1.x + r1.w - 4, y: r1.y + r1.h - 4 };
      await page.mouse.move(se.x, se.y); await page.mouse.down(); await page.mouse.move(se.x - 60, se.y - 50, { steps: 6 }); await page.mouse.up();
      const r2 = await rectOf(page, W("n1"));
      check(`${tag}: a corner handle resizes (here 60 narrower, 50 shorter)`, Math.abs(r2.w - (r1.w - 60)) <= 1 && Math.abs(r2.h - (r1.h - 50)) <= 1 && r2.x === r1.x && r2.y === r1.y, JSON.stringify([r1, r2]));
      const nw = { x: r2.x + 3, y: r2.y + 3 };
      await page.mouse.move(nw.x, nw.y); await page.mouse.down(); await page.mouse.move(nw.x + 600, nw.y + 600, { steps: 6 }); await page.mouse.up();
      const r2b = await rectOf(page, W("n1"));
      check(`${tag}: a window never shrinks below 320 x 360`, r2b.w >= 319.5 && r2b.h >= 359.5, JSON.stringify(r2b));
      const bar2 = await rectOf(page, `${W("n1")} .nw-bar`);
      await page.mouse.move(bar2.x + 80, bar2.y + 20); await page.mouse.down(); await page.mouse.move(-400, HEIGHT + 600, { steps: 8 }); await page.mouse.up();
      const r3 = await rectOf(page, W("n1"));
      check(`${tag}: the title bar can never be dragged off screen`, r3.x >= 0 && r3.x + r3.w <= width + 1 && r3.y <= HEIGHT - 44 && r3.y >= 0, JSON.stringify(r3));
      await page.mouse.move(r3.x + 80, r3.y + 20); await page.mouse.down(); await page.mouse.move(r3.x + 130, r3.y - 80, { steps: 5 }); await page.mouse.up();
      const saved = await rectOf(page, W("n1"));
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mmsa-journey-note-window")));
      check(`${tag}: geometry is kept per device in localStorage`, !!stored && Math.abs(stored.x - saved.x) <= 1 && Math.abs(stored.w - saved.w) <= 1);
      check(`${tag}: ...and nothing about it is sent to Firestore`, await page.evaluate(() => !(window.__fsLog || []).some((l) => JSON.stringify(l).includes("nw-") || JSON.stringify(l).includes("note-window"))));
      await page.reload();
      await page.waitForFunction(() => document.querySelectorAll("[data-note-leaf]").length >= 4 && !document.querySelector("[data-folder-count-loading]"), null, { timeout: 15000 });
      await openPaneNote(page, "n1");
      await popOutFromPane(page);
      await page.waitForSelector(W("n1"));
      const restored = await rectOf(page, W("n1"));
      check(`${tag}: after a reload the next window opens at the remembered geometry`, Math.abs(restored.x - saved.x) <= 1 && Math.abs(restored.y - saved.y) <= 1 && Math.abs(restored.w - saved.w) <= 1 && Math.abs(restored.h - saved.h) <= 1, JSON.stringify([saved, restored]));
      await closeAllWindows(page);
    }

    check(`${tag}: no sideways scroll at the end`, await noSideways(page));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | ").slice(0, 300));
    await ctx.close();
  }
}

await browser.close();
console.log(`\njourney-note-windows-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
