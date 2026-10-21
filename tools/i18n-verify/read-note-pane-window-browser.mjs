// PCF MSA J68 part 4 (the Owner, 21 Oct 2026: "Enable Note view to be moveable/ resizeable from anyside, any corner"):
// from 1100px (where the pane is already the right-hand column) the Read view's Notes pane (#readNotePane) is a window -- moved by its bar, resized from all 8 handles
// (app/js/float-window.js), a 360x320 minimum, always inside the screen, remembered in localStorage "mmsa-read-note-window".
// Below 1100px (390, 768, 1024) it is exactly the full-screen pane it was. Checked at 1280x900 and 1600x1000, en and bn.
// Run from the repository root, serve.js on :8080.
//   --mutate=nomove     the bar no longer moves the window                          -> the bar-drag checks fail
//   --mutate=buttondrag a drag that starts on a bar button moves the window too     -> "a drag on a button" fails
//   --mutate=nohandles  the eight handles do nothing                                -> the handle checks fail
//   --mutate=nomin      the minimum size is 50x50                                   -> the minimum-size checks fail
//   --mutate=offscreen  the rect is not kept inside the screen                      -> the inside-the-screen checks fail
//   --mutate=nosave     the rect is never remembered                                -> the "survives a reload" check fails
//   --mutate=framegrab  the frame keeps the pointer during a drag                   -> the "frame does not swallow" check fails
//   --mutate=alwayswin  the window also applies below 1100px                        -> the 390 / 768 / 1024 checks fail
import { chromium, newContext, openPage, clickReadTool } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "js/read-note-pane.js";
const MUT = {
  nomove: [F, 'bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", winCtx); });', ""],
  buttondrag: [F, 'if (!e.target.closest("button")) startDrag(e, "move", winCtx);', 'startDrag(e, "move", winCtx);'],
  nohandles: [F, "d.addEventListener(\"pointerdown\", (e) => startDrag(e, h, winCtx));", ""],
  nomin: [F, "minW: 360, minH: 320", "minW: 50, minH: 50"],
  offscreen: [F, "function clampWin(r) {", "function clampWin(r) { return r;"],
  nosave: [F, "onEnd: saveRect,", "onEnd: () => {},"],
  framegrab: [F, "body.rnp-dragging #readNotePane .rnp-frame { pointer-events: none; }", ""],
  alwayswin: [F, "WINDOW_FROM = SIDE_FROM", "WINDOW_FROM = 300"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const TS = "2026-01-01T00:00:00.000Z";
const own = { tenantId: "t1", ownerPersonId: "p1", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTES = [{ _id: "t1__n256", noteId: "n256", ...own, title: "Started on 2:256", bodyHtml: "<p>No compulsion.</p>", status: "active", visibility: "private", currentRevisionId: "n256-r1" }];
const SEED = `
window.__stubApplyBatches = true; window.__stubRecordTxData = true;
DATA.notes = [...(DATA.notes ?? []), ...${JSON.stringify(NOTES)}];`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function makeCtx(lang, width, height, rect = null) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  // J72: a remembered place is the shared home rect now (n72a A), so it is seeded there too
  if (rect) await ctx.addInitScript((r) => { try { if (!localStorage.getItem("mmsa-read-note-window")) { localStorage.setItem("mmsa-read-note-window", JSON.stringify(r)); localStorage.setItem("mmsa-home-window-v1", JSON.stringify({ ...r, user: true })); } } catch { /* */ } }, rect);
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => { const src = fs.readFileSync(`app/${file}`, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }); });
  }
  return ctx;
}
async function openPane(ctx) {
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  const ev = (f, a) => P.evaluate(f, a);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await ev(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await ev(() => { const s = document.getElementById("surahSelect"); if (s.value !== "2") { s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:"]'), null, { timeout: 15000 });
  await ev(() => { const el = document.getElementById("ayahSelect"); el.value = "256"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForTimeout(900);
  await ev(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await clickReadTool(P, "#readNotesBtn");
  await P.waitForFunction(() => document.querySelector("#readNotePane:not([hidden]) iframe"), null, { timeout: 8000 });
  await P.waitForTimeout(300);
  return P;
}
const rectOf = (P) => P.evaluate(() => { const r = document.getElementById("readNotePane").getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
const center = (P, sel) => P.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
async function dragTo(P, from, to, up = true) {
  await P.mouse.move(from.x, from.y); await P.mouse.down(); await P.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await P.mouse.move(to.x, to.y, { steps: 4 });
  if (up) await P.mouse.up();
}
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const sameRect = (a, b) => near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && near(a.h, b.h);
const TITLE = ".rnp-title";

for (const lang of ["en", "bn"]) for (const [vw, vh] of [[1280, 900], [1600, 1000]]) {
  const tag = `[${lang} ${vw}]`;
  // ---- 1. The window: default place, move, buttons, minimum, inside the screen, across the frame ----
  let ctx = await makeCtx(lang, vw, vh);
  let P = await openPane(ctx);
  const d0 = await rectOf(P);
  // UPDATED IN PLACE for PCF MSA J72 (the Owner: "Enable this size globally for all pop-ups"): the first open is the
  // home window's size and place (the landing window's), no longer the right-hand column.
  const hr = await P.evaluate(() => JSON.parse(localStorage.getItem("mmsa-home-window-v1") || "null"));
  check(`${tag} first open = the home window's size and place ${JSON.stringify(hr)}`, !!hr && near(d0.x, hr.x) && near(d0.y, hr.y) && near(d0.w, hr.w) && near(d0.h, hr.h), JSON.stringify(d0));
  check(`${tag} ...the 8 handles are there`, (await P.evaluate(() => document.querySelectorAll("#readNotePane .rnp-win-h:not([hidden])").length)) === 8);
  // shrink the height first so the window has room to move down
  const sH = await center(P, '.rnp-win-h[data-h="s"]');
  await dragTo(P, sH, { x: sH.x, y: sH.y - 300 });
  // J72: and narrower from its right edge, so the home-sized window has room to move right
  const eW = await center(P, '.rnp-win-h[data-h="e"]');
  await dragTo(P, eW, { x: eW.x - 400, y: eW.y });
  const d1 = await rectOf(P);
  const tp = await center(P, TITLE);
  await dragTo(P, tp, { x: tp.x + 250, y: tp.y + 120 });
  const d2 = await rectOf(P);
  check(`${tag} dragging the bar moves the window by the drag distance (+250, +120)`, near(d2.x, d1.x + 250) && near(d2.y, d1.y + 120) && d2.w === d1.w && d2.h === d1.h, JSON.stringify({ d1, d2 }));
  const jb = await center(P, "[data-rnp-journey]");
  await dragTo(P, jb, { x: jb.x - 100, y: jb.y + 50 });
  const d3 = await rectOf(P);
  check(`${tag} a drag starting on a bar button does not move the window`, sameRect(d2, d3), JSON.stringify({ d2, d3 }));
  // across the iframe
  const t2 = await center(P, TITLE), fc = await center(P, ".rnp-frame");
  await P.mouse.move(t2.x, t2.y); await P.mouse.down(); await P.mouse.move(fc.x, fc.y, { steps: 6 });
  const mid = await P.evaluate(() => ({ pe: getComputedStyle(document.querySelector("#readNotePane .rnp-frame")).pointerEvents }));
  const end = { x: t2.x + 40, y: t2.y + 60 };
  await P.mouse.move(end.x, end.y, { steps: 6 }); await P.mouse.up();
  const d4 = await rectOf(P);
  const after = await P.evaluate(() => getComputedStyle(document.querySelector("#readNotePane .rnp-frame")).pointerEvents);
  check(`${tag} during a drag the frame does not swallow the pointer, and gets it back after`, mid.pe === "none" && after !== "none", JSON.stringify({ mid, after }));
  check(`${tag} a drag that crosses the frame still moves the window to the end point`, near(d4.x, d3.x + 40) && near(d4.y, d3.y + 60), JSON.stringify({ d3, d4 }));
  // minimum size
  const eH = await center(P, '.rnp-win-h[data-h="e"]');
  await dragTo(P, eH, { x: eH.x - 3000, y: eH.y });
  const sH2 = await center(P, '.rnp-win-h[data-h="s"]');
  await dragTo(P, sH2, { x: sH2.x, y: sH2.y - 3000 });
  const d5 = await rectOf(P);
  check(`${tag} the minimum size holds (360 wide, 320 high)`, d5.w === 360 && d5.h === 320, JSON.stringify(d5));
  // never off screen
  const tp2 = await center(P, TITLE);
  await dragTo(P, tp2, { x: tp2.x + 5000, y: tp2.y + 5000 });
  const d6 = await rectOf(P);
  check(`${tag} never off screen: dragged far right/down, it stays inside`, d6.x >= 0 && d6.y >= 0 && d6.x + d6.w <= vw && d6.y + d6.h <= vh, JSON.stringify(d6));
  const tp3 = await center(P, TITLE);
  await dragTo(P, tp3, { x: tp3.x - 5000, y: tp3.y - 5000 });
  const d7 = await rectOf(P);
  check(`${tag} ...and dragged far left/up it stops at the corner`, d7.x === 0 && d7.y === 0, JSON.stringify(d7));
  // move to bottom-right, then a smaller browser window
  const tp4 = await center(P, TITLE);
  await dragTo(P, tp4, { x: tp4.x + 5000, y: tp4.y + 5000 });
  const saved = await rectOf(P); // the place the reader chose (a shrunken browser window only clamps it for now)
  await P.setViewportSize({ width: 1000, height: 600 }); await P.waitForTimeout(300);
  const d8 = await rectOf(P);
  check(`${tag} after the browser window shrinks it is still inside the screen`, d8.x >= 0 && d8.y >= 0 && d8.x + d8.w <= 1000 && d8.y + d8.h <= 600, JSON.stringify(d8));
  await P.setViewportSize({ width: vw, height: vh }); await P.waitForTimeout(300);
  // reload: same rect remembered
  const P2 = await openPane(ctx);
  const d9 = await rectOf(P2);
  check(`${tag} the rect survives a reload`, sameRect(saved, d9), JSON.stringify({ saved, d9 }));
  // Notes tab still makes a Note, ← Back still closes
  const Fr = await (async () => { for (let i = 0; i < 80; i++) { const f = P2.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url())); if (f) return f; await P2.waitForTimeout(100); } return null; })();
  let made = false;
  if (Fr) {
    await Fr.waitForFunction(() => document.querySelector("[data-unit-new]") && !document.querySelector("[data-unit-new]").hasAttribute("aria-disabled"), null, { timeout: 15000 }).catch(() => {});
    await Fr.click("[data-unit-new]");
    made = await Fr.waitForFunction(() => !document.getElementById("notePane").hidden, null, { timeout: 8000 }).then(() => true).catch(() => false);
  }
  check(`${tag} the Notes tab still makes a Note (the frame's [data-unit-new])`, made);
  await P2.click("#readNotePane [data-rnp-back]"); await P2.waitForTimeout(300);
  check(`${tag} ← Back still closes the pane`, await P2.evaluate(() => document.getElementById("readNotePane").hidden));
  await ctx.close();

  // ---- 2. The eight handles, each changing only its own edge(s) (a window set in the middle of the screen) ----
  const start = { x: 300, y: 120, w: 600, h: 500 };
  ctx = await makeCtx(lang, vw, vh, start);
  P = await openPane(ctx);
  const s0 = await rectOf(P);
  check(`${tag} a remembered rect is used (${JSON.stringify(start)})`, sameRect(s0, start), JSON.stringify(s0));
  const DX = 30, DY = 20;
  for (const h of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const before = await rectOf(P);
    const c = await center(P, `.rnp-win-h[data-h="${h}"]`);
    await dragTo(P, c, { x: c.x + DX, y: c.y + DY });
    const a = await rectOf(P);
    const exp = { ...before };
    if (h.includes("e")) exp.w += DX;
    if (h.includes("w")) { exp.x += DX; exp.w -= DX; }
    if (h.includes("s")) exp.h += DY;
    if (h.includes("n")) { exp.y += DY; exp.h -= DY; }
    check(`${tag} handle ${h.padEnd(2)} changes only its own edge(s)`, sameRect(a, exp), JSON.stringify({ before, a, exp }));
    // put it back for the next handle
    const back = await center(P, `.rnp-win-h[data-h="${h}"]`);
    await dragTo(P, back, { x: back.x - DX, y: back.y - DY }); // the reverse drag restores the start
  }
  await ctx.close();
}

// ---- 3. Below 1100px nothing changes (Architect review: WINDOW_FROM = SIDE_FROM; 1024 is a tablet held sideways) ----
for (const lang of ["en", "bn"]) for (const [vw, vh] of [[390, 844], [768, 1000], [1024, 768]]) {
  const tag = `[${lang} ${vw}]`;
  const ctx = await makeCtx(lang, vw, vh, { x: 100, y: 100, w: 400, h: 400 });
  const P = await openPane(ctx);
  const st = await P.evaluate(() => {
    const p = document.getElementById("readNotePane"), r = p.getBoundingClientRect();
    return { cls: p.className, x: r.left, y: r.top, w: r.width, h: r.height, inline: p.style.left + p.style.width, handle: getComputedStyle(p.querySelector(".rnp-win-h")).display, bar: getComputedStyle(p.querySelector(".rnp-bar")).cursor };
  });
  check(`${tag} the pane is exactly the full-screen pane as before (no window, no handles)`, /rnp-phone/.test(st.cls) && !/rnp-win/.test(st.cls) && st.x === 0 && st.y === 0 && st.w === vw && st.h === vh && st.inline === "" && st.handle === "none" && st.bar !== "move", JSON.stringify(st));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Read Notes pane as a window (J68 part 4): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
