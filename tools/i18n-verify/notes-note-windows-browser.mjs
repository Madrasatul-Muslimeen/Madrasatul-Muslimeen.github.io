// Siyagah port round 6b (Owner decisions 42.4, M3): the SAME Single and Multi
// Note windows on the Notes page (app/notes.html). Real controls and real mouse
// drags (handover §5.4); the stub's DATA shows what was written. Playwright's
// clock stands in for the real 1 s / 30 s waits. The Notes page must write
// every revision through reviseStudyNote() so Journaling evidence is recorded:
// the proof is DATA -- a window's revision leaves a Journaling Activity
// document beside the noteRevisions row (a direct updatePermanentNoteContent
// would leave only the revision), and the page says so in words.
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const TS = "2026-09-01T10:00:00.000Z";
const SEED = `
(function () {
  window.__stubApplyBatches = true;
  window.__DATA = DATA;
  var own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdBy: "test-uid" };
  DATA.notes = []; DATA.noteSources = []; DATA.noteRevisions = [];
  // Journaling evidence is only composed for a 32-hex permanent Note id (note-journal-evidence.js), so the fixture uses real-shaped ids.
  function N(logical, title, body) {
    var id = logical.slice(1).repeat(32);
    DATA.notes.push(Object.assign({ _id: "t1__" + id, noteId: id, title: title, bodyHtml: body, currentRevisionId: "rev-" + id, status: "active", visibility: "private", createdAt: "${TS}", updatedAt: "${TS}" }, own));
    DATA.noteSources.push(Object.assign({ _id: "t1__s-" + id, sourceLinkId: "s-" + id, noteId: id, sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active", createdAt: "${TS}", updatedAt: "${TS}" }, own));
  }
  N("n1", "Note One", "<p>First body.</p><h1>A</h1><p>x</p><h2>B</h2><p>y</p><h2>C</h2><p>z</p>");
  N("n2", "Note Two", "<p>Second body.</p>");
  N("n3", "Note Three", "<p>Third body.</p>");
})();`;

const browser = await chromium.launch();
const hasBn = (s) => /[ঀ-৿]/.test(s || "");
const HEIGHT = 900;
const URL = "/app/notes.html?unit=" + encodeURIComponent("ayah:2:255") + "&label=Test";

const hx = (id) => id.slice(1).repeat(32); // "n2" -> the fixture's real-shaped id
const W = (id) => `.note-win[data-note-id="${hx(id)}"]`;
const card = (id) => `.note-card[data-note-id="${hx(id)}"]`;
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0 && r.height > 0; }, sel);
const rectOf = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
const count = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const revs = (page, id) => page.evaluate((i) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).length, hx(id));
/** Every Journaling/Activity document in the stub: anything that is not a Note Foundation collection. */
const evidenceDocs = (page) => page.evaluate(() => (window.__fsLog || []).filter((r) => r.kind === "setDoc" && /\/evidence$/.test(r.col || "") && String(r.id).startsWith("journal.note-revised")).length);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
const waitRevs = (page, id, n) => until(page, ([i, c]) => window.__DATA.noteRevisions.filter((r) => r.noteId === i).length === c, [hx(id), n]).catch(() => null);
const topmostAtCentre = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return false;
  const r = e.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return !!hit && (e === hit || e.contains(hit));
}, sel);
const windowAt = (page, x, y) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest(".note-win")?.dataset.noteId ?? null, [x, y]);
async function openInWindow(page, id) { await page.click(`${card(id)} [data-note-window]`); await page.waitForSelector(W(id)); }
async function winEditToggle(page, id) {
  const direct = `${W(id)} [data-pane-bar] > [data-pane-edit-toggle]`;
  if (await vis(page, direct)) await page.click(direct);
  else { await page.click(`${W(id)} [data-pane-menu-btn]`); await page.click(`${W(id)} [data-pane-menu] [data-pane-edit-toggle]`); }
}
async function typeIn(page, id, text) { await page.click(`${W(id)} [data-edit-body]`); await page.keyboard.press("Control+End"); await page.keyboard.type(text); }
async function closeAllWindows(page) {
  while ((await count(page, ".note-win")) > 0) {
    const n = await count(page, ".note-win");
    await page.evaluate(() => document.querySelector(".note-win [data-win-close]").click());
    await page.waitForFunction((c) => document.querySelectorAll(".note-win").length < c, n);
  }
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1280]) {
    const tag = `${lang} ${width}px`;
    const sheet = width < 640;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: HEIGHT }, extraSeedJs: SEED });
    const { page, errors } = await openPage(ctx, URL);
    await page.waitForSelector(card("n1"), { timeout: 15000 });
    await page.clock.install();

    // ---- 1. Open in window -------------------------------------------------------
    const winBtn = await page.textContent(`${card("n1")} [data-note-window]`);
    check(`${tag}: each Note row has ⧉ Open in window, with its word`, lang === "bn" ? hasBn(winBtn) && winBtn.includes("⧉") : winBtn.trim() === "⧉ Open in window", winBtn);
    await openInWindow(page, "n1");
    check(`${tag}: ⧉ Open in window opens the Note`, (await count(page, ".note-win")) === 1 && (await page.textContent(`${W("n1")} .nw-title`)) === "Note One");
    check(`${tag}: the window holds the Note's body`, (await page.textContent(`${W("n1")} [data-pane-body]`)).includes("First body."));
    const closeBox = await rectOf(page, `${W("n1")} [data-win-close]`);
    check(`${tag}: ✕ is 44px`, closeBox.w >= 44 && closeBox.h >= 44, JSON.stringify(closeBox));
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    check(`${tag}: the window's ⋯ menu is topmost at its own centre`, await topmostAtCentre(page, `${W("n1")} [data-pane-menu]`));
    const menuText = await page.textContent(`${W("n1")} [data-pane-menu]`);
    check(`${tag}: ⋯ offers Delete (Notes page's own item), and no folder items`, /Delete|মুছ|ডিলিট|🗑/.test(menuText) && !(await count(page, `${W("n1")} [data-pane-copy], ${W("n1")} [data-pane-move]`)), menuText);
    await page.click(`${W("n1")} [data-pane-menu-btn]`);
    check(`${tag}: no sideways scroll with a window open`, await noSideways(page));
    await page.click(`${W("n1")} [data-win-close]`);
    check(`${tag}: ✕ closes the window`, (await count(page, ".note-win")) === 0);

    // ---- 2. Several windows ------------------------------------------------------
    if (sheet) await page.setViewportSize({ width: 820, height: HEIGHT });
    await page.evaluate((vw) => localStorage.setItem("mmsa-notes-note-window", JSON.stringify({ x: vw - 420, y: 80, w: 360, h: 600 })), sheet ? 820 : width);
    await openInWindow(page, "n2");
    await page.click(`${card("n3")} [data-note-title]`, { modifiers: ["Control"] });
    await page.waitForSelector(W("n3"));
    check(`${tag}: a second Note opens a second window (⧉ button and Ctrl-click on the title)`, (await count(page, ".note-win")) === 2);
    if (sheet) await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(150);
    if (!sheet) {
      const r2 = await rectOf(page, W("n2")), r3 = await rectOf(page, W("n3"));
      check(`${tag}: the second window opens offset from the first`, Math.abs(r3.x - r2.x) > 10 && Math.abs(r3.y - r2.y) > 10, JSON.stringify([r2, r3]));
      const px = Math.max(r2.x, r3.x) + 60, py = Math.max(r2.y, r3.y) + 120;
      check(`${tag}: the newest window is in front where they overlap`, (await windowAt(page, px, py)) === hx("n3"));
      await page.mouse.click(px, py - 20 > r3.y ? r2.y + 20 : py); // title bar region of the back window
      await openInWindow(page, "n2");
      check(`${tag}: opening an already-open Note opens no second window`, (await count(page, ".note-win")) === 2);
      check(`${tag}: ...it focuses the existing one (now in front)`, (await windowAt(page, Math.max(r2.x, r3.x) + 60, Math.max(r2.y, r3.y) + 120)) === hx("n2"));
      check(`${tag}: each window has eight resize handles`, (await count(page, `${W("n2")} .nw-h`)) === 8);
    } else {
      check(`${tag}: a window is a SHEET -- fills the width, from the left edge`, await page.evaluate(() => { const r = document.querySelector(".note-win:not(.sheet-hidden)").getBoundingClientRect(); return r.x === 0 && Math.abs(r.width - window.innerWidth) <= 1; }));
      check(`${tag}: with two open, the bottom switcher lists both, 40px targets`, (await count(page, "#noteWinSwitch [data-win-switch]")) === 2 && (await rectOf(page, "#noteWinSwitch [data-win-switch]")).h >= 40);
      check(`${tag}: the switcher's name is in the reader's language`, lang === "bn" ? hasBn(await page.getAttribute("#noteWinSwitch", "aria-label")) : true);
      await page.evaluate((s) => document.querySelector(s).click(), `${card("n2")} [data-note-window]`); // a sheet covers the list, so the click is dispatched
      check(`${tag}: opening an already-open Note opens no second window`, (await count(page, ".note-win")) === 2);
      await page.evaluate(() => document.querySelector("#noteWinSwitch [data-win-switch]").click());
      await page.evaluate(() => document.querySelector(".note-win:not(.sheet-hidden) [data-win-close]").click());
      await page.evaluate(() => document.querySelector(".note-win:not(.sheet-hidden) [data-win-close]")?.click());
      await page.waitForTimeout(100);
    }
    await closeAllWindows(page);

    // ---- 3. Never two editors: a Note open inline is focused, not opened twice ------
    await page.click(`${card("n3")} [data-note-edit]`);
    await page.waitForSelector(`${card("n3")} [data-edit-body]`);
    await page.click(`${card("n3")} [data-note-window]`);
    check(`${tag}: a Note being edited inline opens no window (never two editors)`, (await count(page, ".note-win")) === 0);
    check(`${tag}: ...the inline editor is what gets focus`, await page.evaluate(() => document.activeElement?.matches("[data-edit-body]") ?? false));
    await page.click(`${card("n3")} [data-edit-cancel]`);
    await openInWindow(page, "n3");
    await page.evaluate((s) => document.querySelector(s).click(), `${card("n3")} [data-note-edit]`); // a sheet covers the list, so the click is dispatched
    check(`${tag}: a Note open in a window opens no inline editor (Edit focuses the window)`, (await count(page, `${card("n3")} [data-edit-body]`)) === 0 && (await count(page, ".note-win")) === 1);
    await closeAllWindows(page);

    // ---- 4. Editing in a window writes THROUGH reviseStudyNote ---------------------------
    await openInWindow(page, "n2");
    await winEditToggle(page, "n2");
    await page.waitForSelector(`${W("n2")} [data-edit-body]`);
    check(`${tag}: ✏️ Edit works inside a window`, await vis(page, `${W("n2")} [data-edit-title]`));
    const ev0 = await evidenceDocs(page), r0 = await revs(page, "n2");
    await typeIn(page, "n2", " ONE");
    await page.clock.runFor(1500);
    check(`${tag}: typing keeps a local draft...`, await page.evaluate((k) => !!localStorage.getItem(k), `qr.journeyNoteDraft.${hx("n2")}`));
    check(`${tag}: ...and no revision yet`, (await revs(page, "n2")) === r0);
    await page.clock.runFor(31000);
    await waitRevs(page, "n2", r0 + 1);
    check(`${tag}: after ~30 s idle exactly ONE revision is written from the window`, (await revs(page, "n2")) === r0 + 1);
    await page.waitForTimeout(200);
    const status = await page.textContent("#pageStatusMsg");
    check(`${tag}: ...and the Journaling evidence write reviseStudyNote makes is recorded beside it`, (await evidenceDocs(page)) === ev0 + 1, `evidence docs ${ev0} -> ${await evidenceDocs(page)}`);
    check(`${tag}: ...and the page says so in words`, lang === "bn" ? hasBn(status) : /Journaling/.test(status), status);
    await winEditToggle(page, "n2");
    await page.waitForTimeout(100);
    check(`${tag}: Done with nothing changed writes nothing`, (await revs(page, "n2")) === r0 + 1);
    // ✕ mid-edit flushes ONE revision (a second one is allowed the same day: evidence is deduplicated by the store)
    await winEditToggle(page, "n2");
    await page.waitForSelector(`${W("n2")} [data-edit-body]`);
    await typeIn(page, "n2", " TWO");
    await page.click(`${W("n2")} [data-win-close]`);
    await waitRevs(page, "n2", r0 + 2);
    check(`${tag}: ✕ on a window mid-edit flushes ONE revision`, (await revs(page, "n2")) === r0 + 2);
    check(`${tag}: ...and the Notes list shows the new text after a reload of the list`, (await page.textContent(`${card("n2")} [data-note-body]`)).includes("ONE TWO"));

    // ---- 5. Pop out from the inline form writes the pending change first -------------------------
    await page.click(`${card("n1")} [data-note-edit]`);
    await page.waitForSelector(`${card("n1")} [data-edit-body]`);
    const popLabel = await page.textContent(`${card("n1")} [data-edit-popout]`);
    check(`${tag}: the inline form has ⧉ Pop out, with its word`, lang === "bn" ? hasBn(popLabel) && popLabel.includes("⧉") : popLabel.trim() === "⧉ Pop out", popLabel);
    const p0 = await revs(page, "n1");
    await page.click(`${card("n1")} [data-edit-body]`);
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" POP");
    await page.click(`${card("n1")} [data-edit-popout]`);
    await page.waitForSelector(W("n1"));
    await waitRevs(page, "n1", p0 + 1);
    check(`${tag}: Pop out mid-edit writes the pending change first (one revision)`, (await revs(page, "n1")) === p0 + 1);
    check(`${tag}: ...and the window shows the Note with the new text`, (await page.textContent(`${W("n1")} [data-pane-body]`)).includes("POP"));
    check(`${tag}: ...and the inline form is gone`, (await count(page, `${card("n1")} [data-edit-body]`)) === 0);
    await closeAllWindows(page);
    // nothing typed: Pop out writes nothing
    await page.click(`${card("n1")} [data-note-edit]`);
    await page.waitForSelector(`${card("n1")} [data-edit-popout]`);
    await page.click(`${card("n1")} [data-edit-popout]`);
    await page.waitForSelector(W("n1"));
    await page.waitForTimeout(200);
    check(`${tag}: Pop out with nothing typed writes nothing`, (await revs(page, "n1")) === p0 + 1);

    // ---- 6. Shape by width -----------------------------------------------------------------------
    if (!sheet) {
      await closeAllWindows(page);
      await page.evaluate(() => localStorage.removeItem("mmsa-notes-note-window"));
      await openInWindow(page, "n3");
      const b = await rectOf(page, `${W("n3")} .nw-bar`);
      await page.mouse.move(b.x + 60, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x + 140, b.y + 90, { steps: 6 }); await page.mouse.up();
      const a = await rectOf(page, `${W("n3")} .nw-bar`);
      check(`${tag}: dragging the title bar moves the window by the drag distance`, Math.abs(a.x - b.x - 80) <= 3 && Math.abs(a.y - b.y - 70) <= 3, JSON.stringify([b, a]));
      const w0 = await rectOf(page, W("n3"));
      await page.mouse.move(w0.x + w0.w - 3, w0.y + w0.h - 3); await page.mouse.down(); await page.mouse.move(w0.x + w0.w - 63, w0.y + w0.h - 53, { steps: 6 }); await page.mouse.up();
      const w1 = await rectOf(page, W("n3"));
      check(`${tag}: a corner handle resizes (here 60 narrower, 50 shorter)`, Math.abs(w0.w - w1.w - 60) <= 3 && Math.abs(w0.h - w1.h - 50) <= 3, JSON.stringify([w0, w1]));
      const a2 = await rectOf(page, `${W("n3")} .nw-bar`);
      await page.mouse.move(a2.x + 60, a2.y + 20); await page.mouse.down(); await page.mouse.move(a2.x + 60, -400, { steps: 6 }); await page.mouse.up();
      check(`${tag}: the title bar can never be dragged off screen`, (await rectOf(page, `${W("n3")} .nw-bar`)).y >= 0);
      const key = await page.evaluate(() => localStorage.getItem("mmsa-notes-note-window"));
      check(`${tag}: geometry is kept per device in localStorage, under the Notes page's own key`, !!key && !localStorage_has_journey_key(await page.evaluate(() => localStorage.getItem("mmsa-journey-note-window"))), key);
      const saved = JSON.parse(key);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForSelector(card("n3"));
      await openInWindow(page, "n3");
      const r = await rectOf(page, W("n3"));
      check(`${tag}: after a reload the next window opens at the remembered geometry`, Math.abs(r.w - saved.w) <= 2 && Math.abs(r.h - saved.h) <= 2, JSON.stringify([r, saved]));
    } else {
      const r = await rectOf(page, ".note-win");
      check(`${tag}: a window is a SHEET with no drag handles`, r.x === 0 && (await count(page, ".note-win .nw-h")) === 8 && !(await vis(page, ".note-win .nw-h")));
    }
    check(`${tag}: no sideways scroll at the end`, await noSideways(page));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}
function localStorage_has_journey_key(v) { return !!v; }

await browser.close();
console.log(`\nnotes-note-windows-browser: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
