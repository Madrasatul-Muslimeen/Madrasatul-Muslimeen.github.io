// PCF MSA J67 (the Owner, 21 Oct 2026): "Enable the current Ayah card to be expanded / resizeable / moveable ... then
// organise the features / buttons according to it." On a PC (>= 900px) the Āyah card is a window: moved by its header,
// resized from 4 corners and 4 sides, kept inside the screen, remembered per device (`mmsa-ayah-window`); contents sit in
// two columns once the card is 560px wide. Below 900px the card is exactly what it was.
// Real data (22:3), 1280x900 and 1600x1000, English and Bangla, Night and Light looks; 390 and 768 for "unchanged".
// Run from the repository root, serve.js on :8080.
//   --mutate=nomove       the header drag does nothing                      -> move checks fail
//   --mutate=btndrag      a press on a header button moves the card too      -> "button does not move" fails
//   --mutate=onehandle    every handle resizes like the east one            -> per-handle edge checks fail
//   --mutate=nomin        no minimum size                                   -> minimum checks fail
//   --mutate=noclamp      the card may leave the screen                     -> inside-the-screen checks fail
//   --mutate=nosave       the rect is not remembered                        -> reload check fails
//   --mutate=phonewindow  the window applies below 900px                    -> 390 / 768 unchanged checks fail
//   --mutate=onecol       the card never goes to two columns                -> two-column check fails
//   --mutate=colour       the windowed card is painted a different colour   -> colour checks fail
//   --mutate=cutlabels    tile labels are forced to one cut-off line        -> "no label cut" fails
//   --mutate=noclose      the frame stays when the card closes              -> frame-follows-card check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MJS = "js/ayah-card-window.js";
const MUT = {
  nomove: [MJS, 'startDrag(e, "move", ctx);\n  });', "void 0;\n  });"],
  btndrag: [MJS, 'e.target.closest("button, select, a, input, label")', "false"],
  onehandle: [MJS, "startDrag(e, h, ctx)", 'startDrag(e, "e", ctx)'],
  nomin: [MJS, "const LIMITS = { minW: 320, minH: 360, bar: 44 };", "const LIMITS = { minW: 1, minH: 1, bar: 44 };"],
  noclamp: [MJS, "return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };\n}", "return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };\n}"],
  nosave: [MJS, "function save(r) { try {", "function save(r) { return; try {"],
  phonewindow: [MJS, "const WINDOW_FROM = 900;", "const WINDOW_FROM = 0;"],
  onecol: [MJS, "const WIDE_FROM = 560;", "const WIDE_FROM = 99999;"],
  colour: [MJS, ".ayah-sheet.ayah-win-set { box-sizing: border-box;", ".ayah-sheet.ayah-win-set { background: #123456; color: #fed; box-sizing: border-box;"],
  cutlabels: [MJS, ".ayah-win-frame { position: fixed;", ".ayah-sheet-act-label { white-space: nowrap; overflow: hidden; width: 20px; display: block; } .ayah-win-frame { position: fixed;"],
  noclose: [MJS, "const act = active();\n    if (!act) {", "const act = active() || (frame.classList.contains('on') && !sheet);\n    if (!act) {"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
const R = (o) => o && `${Math.round(o.x)},${Math.round(o.y)} ${Math.round(o.w)}x${Math.round(o.h)}`;

async function makePage(lang, look, width, height) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height } });
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  return ctx;
}
async function toRead(P) {
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); if (s.value !== "22") { s.value = "22"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await P.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:22:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "3"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="22:3"]'), null, { timeout: 8000 });
  await P.waitForTimeout(500);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
}
async function openCard(P) {
  await P.evaluate(() => document.querySelector('[data-ayah-num-badge="22:3"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForTimeout(500);
}
const sheetRect = (P) => P.evaluate(() => { const b = document.querySelector("[data-ayah-sheet]")?.getBoundingClientRect(); return b && { x: b.left, y: b.top, w: b.width, h: b.height }; });
const centre = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
async function drag(P, from, dx, dy) {
  await P.mouse.move(from.x, from.y); await P.mouse.down();
  await P.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 }); await P.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  await P.mouse.up(); await P.waitForTimeout(120);
}
const COLOURS = (P) => P.evaluate(() => {
  const sheet = document.querySelector("[data-ayah-sheet]"), cs = (e, p) => getComputedStyle(e)[p];
  const probe = document.createElement("div"); document.body.appendChild(probe);
  probe.style.background = "var(--card-bg)"; probe.style.color = "var(--card-heading)";
  const tok = { bg: cs(probe, "backgroundColor"), heading: cs(probe, "color") }; probe.remove();
  const stage = sheet.querySelector("[data-approach-stage-btn]");
  return { bg: cs(sheet, "backgroundColor"), ref: cs(sheet.querySelector(".ayah-sheet-ref"), "color"), stage: stage && [cs(stage, "backgroundColor"), cs(stage, "color")].join("|"), tok };
});

for (const look of ["night", "light"]) for (const lang of ["en", "bn"]) {
  // ---- phone and tablet: the sheet is exactly what it was ----
  for (const [w, h] of [[390, 844], [768, 1024]]) {
    const tag = `[${lang} ${look} ${w}]`;
    const ctx = await makePage(lang, look, w, h);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await toRead(P); await openCard(P);
    const s = await P.evaluate(() => { const e = document.querySelector("[data-ayah-sheet]"), c = getComputedStyle(e), b = e.getBoundingClientRect(), f = document.querySelector("[data-ayah-win-frame]");
      return { pos: c.position, x: b.left, y: b.top, w: b.width, h: b.height, inline: e.getAttribute("style"), wide: e.hasAttribute("data-wide"), set: e.classList.contains("ayah-win-set"), frame: f ? getComputedStyle(f).display : "none", vh: innerHeight, vw: innerWidth }; });
    check(`${tag} the card is the full-screen sheet, as before (fixed, 0,0, ${w}x${h})`, s.pos === "fixed" && near(s.x, 0, 1) && near(s.y, 0, 1) && near(s.w, s.vw, 1) && near(s.h, s.vh, 1), JSON.stringify(s));
    check(`${tag} no window state: no inline geometry, no two-column flag, no frame`, !s.inline && !s.wide && !s.set && s.frame === "none", JSON.stringify(s));
    const noMove = await (async () => { const c = await centre(P, ".ayah-sheet-ref"); await drag(P, c, -80, 40); return sheetRect(P); })();
    check(`${tag} dragging the header does not move the sheet`, near(noMove.x, 0, 1) && near(noMove.y, 0, 1), R(noMove));
    await ctx.close();
  }

  // ---- PC: the window ----
  for (const [w, h] of [[1280, 900], [1600, 1000]]) {
    const tag = `[${lang} ${look} ${w}]`;
    const ctx = await makePage(lang, look, w, h);
    const { page: P, errors } = await openPage(ctx, "/app/quranrevival.html");
    await toRead(P); await openCard(P);

    // first open = today's place and size (right side, 22rem + padding, top 4.5rem)
    const r0 = await sheetRect(P);
    check(`${tag} first open: today's place -- right side, top 4.5rem, about 22rem wide`, near(r0.x + r0.w, w - 22.4, 2) && near(r0.y, 72, 2) && r0.w > 340 && r0.w < 400, R(r0));
    const frame0 = await P.evaluate(() => { const f = document.querySelector("[data-ayah-win-frame]"), b = f.getBoundingClientRect(); return { on: getComputedStyle(f).display !== "none", n: f.querySelectorAll(".ayah-win-h").length, x: b.left, y: b.top, w: b.width, h: b.height }; });
    check(`${tag} the frame carries 8 handles and sits on the card`, frame0.on && frame0.n === 8 && near(frame0.x, r0.x) && near(frame0.w, r0.w) && near(frame0.h, r0.h), JSON.stringify(frame0));

    // colours equal the card tokens (and, below, the phone sheet's: same element, same paint)
    const c0 = await COLOURS(P);
    check(`${tag} background is the card background, header text the card heading colour (before any move)`, c0.bg === c0.tok.bg && c0.ref === c0.tok.heading, JSON.stringify(c0));

    // move by the header
    const hdr = await centre(P, "[data-ayah-sheet] .ayah-sheet-ref");
    await drag(P, hdr, -450, -20);
    const r1 = await sheetRect(P);
    check(`${tag} dragging the header moves the card by the drag distance (-450, -20)`, near(r1.x, r0.x - 450) && near(r1.y, r0.y - 20) && near(r1.w, r0.w) && near(r1.h, r0.h, 3), `${R(r0)} -> ${R(r1)}`);
    const btn = await centre(P, "[data-ayah-sheet] [data-ayah-sheet-noteview]");
    await drag(P, btn, -60, 40); // released inside the card: a release on the dim backdrop would close it
    const r1b = await sheetRect(P);
    check(`${tag} a drag that starts on a header button does not move the card`, near(r1b.x, r1.x) && near(r1b.y, r1.y), `${R(r1)} -> ${R(r1b)}`);
    const c1 = await COLOURS(P);
    check(`${tag} colours unchanged after the card became a window (bg, header text, stage button)`, c1.bg === c0.bg && c1.ref === c0.ref && c1.stage === c0.stage && c1.bg === c1.tok.bg, JSON.stringify([c0, c1]));

    // each handle moves its own edge(s) only
    const STEPS = [["e", 20, 0], ["w", -20, 0], ["n", 0, 40], ["s", 0, -40], ["ne", 15, -15], ["nw", -15, -15], ["se", 15, 15], ["sw", -15, 15]];
    for (const [hd, dx, dy] of STEPS) {
      const b = await sheetRect(P);
      const pos = await centre(P, `.ayah-win-frame .ayah-win-h[data-h="${hd}"]`);
      await drag(P, pos, dx, dy);
      const a = await sheetRect(P);
      const ex = { x: b.x, y: b.y, w: b.w, h: b.h };
      if (hd.includes("e")) ex.w = b.w + dx;
      if (hd.includes("w")) { ex.x = b.x + dx; ex.w = b.w - dx; }
      if (hd.includes("s")) ex.h = b.h + dy;
      if (hd.includes("n")) { ex.y = b.y + dy; ex.h = b.h - dy; }
      check(`${tag} handle ${hd} (${dx},${dy}) changes only its own edge(s)`, near(a.x, ex.x) && near(a.y, ex.y) && near(a.w, ex.w) && near(a.h, ex.h, 3), `${R(b)} -> ${R(a)} expected ${R(ex)}`);
    }

    // two columns from 560px of card width, one column below
    const cols = () => P.evaluate(() => { const s = document.querySelector("[data-ayah-sheet]"), a = s.querySelector("[data-ayah-sheet-actions]"), b = s.querySelector(".ayah-sheet-body"), ab = a.getBoundingClientRect(), bb = b.getBoundingClientRect(); return { w: s.getBoundingClientRect().width, wide: s.hasAttribute("data-wide"), bx: bb.left, ax: ab.left, aw: ab.width, by: bb.top, ay: ab.top }; });
    let cs = await cols();
    check(`${tag} narrow (${Math.round(cs.w)}px): one column -- the right part sits under the left`, cs.w < 560 && !cs.wide && near(cs.ax, cs.bx, 2) && cs.by > cs.ay, JSON.stringify(cs));
    const east = await centre(P, '.ayah-win-frame .ayah-win-h[data-h="e"]');
    await drag(P, east, 640 - cs.w + 10, 0);
    cs = await cols();
    check(`${tag} wide (${Math.round(cs.w)}px): two columns -- Take an Approach column beside the tiles and status`, cs.w >= 560 && cs.wide && cs.bx > cs.ax + cs.aw * 0.9 && near(cs.by, cs.ay, 12), JSON.stringify(cs));
    const fit = await P.evaluate(() => {
      const s = document.querySelector("[data-ayah-sheet]"), tiles = [...s.querySelectorAll(".ayah-sheet-act")], bad = [];
      for (const t of tiles) { const l = t.querySelector(".ayah-sheet-act-label"), b = t.getBoundingClientRect();
        if (b.width <= 0 || b.height < 40) bad.push(`tile ${t.dataset.ayahSheetPoster !== undefined ? "poster" : l?.textContent} ${b.width}x${b.height}`);
        if (l && (l.scrollWidth > l.clientWidth + 1 || l.getBoundingClientRect().width > b.width + 1)) bad.push(`label cut: ${l.textContent}`); }
      const sel = s.querySelector("[data-approach-stage-select]"), sb = sel?.getBoundingClientRect();
      if (!sel || sb.width <= 0 || sb.right > s.getBoundingClientRect().right + 1) bad.push("select cut or outside");
      const widths = new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().width)));
      return { n: tiles.length, bad, widths: [...widths], sideways: s.scrollWidth - s.clientWidth };
    });
    check(`${tag} wide: ${fit.n} action tiles, 40px+ targets, no label cut, select whole`, fit.n >= 9 && fit.bad.length === 0, JSON.stringify(fit));
    check(`${tag} wide: the tiles are one tidy size and the card has no sideways scroll`, fit.widths.length === 1 && fit.sideways <= 1, JSON.stringify(fit));
    const rowsTidy = await P.evaluate(() => { const t = [...document.querySelectorAll("[data-ayah-sheet] .ayah-sheet-act")].map((e) => e.getBoundingClientRect()), row = document.querySelector("[data-ayah-sheet] .ayah-sheet-actrow").getBoundingClientRect(); const tops = [...new Set(t.map((b) => Math.round(b.top)))]; return tops.map((tp) => { const r = t.filter((b) => Math.round(b.top) === tp); return { n: r.length, fill: Math.abs(Math.max(...r.map((b) => b.right)) - row.right) < 2 }; }); });
    check(`${tag} wide: every row of tiles fills the row's width (no ragged wrap)`, rowsTidy.every((r) => r.fill), JSON.stringify(rowsTidy));

    // minimum size
    const wh = await centre(P, '.ayah-win-frame .ayah-win-h[data-h="w"]');
    await drag(P, wh, 900, 0);
    const nh = await centre(P, '.ayah-win-frame .ayah-win-h[data-h="n"]');
    await drag(P, nh, 0, 1500);
    const rm = await sheetRect(P);
    check(`${tag} the minimum size holds (320 x 360)`, near(rm.w, 320, 1) && near(rm.h, 360, 1), R(rm));
    cs = await cols();
    check(`${tag} back to one column at minimum width`, !cs.wide && near(cs.ax, cs.bx, 2), JSON.stringify(cs));

    // stays inside the screen
    const hd2 = await centre(P, "[data-ayah-sheet] .ayah-sheet-ref");
    await drag(P, hd2, 3000, 3000);
    const rs = await sheetRect(P);
    check(`${tag} dragged far past the corner: the card stays inside the screen`, rs.x >= 0 && rs.y >= 0 && rs.x + rs.w <= w + 0.5 && rs.y + rs.h <= h + 0.5, R(rs));
    await P.setViewportSize({ width: 1000, height: 600 }); await P.waitForTimeout(300);
    const rv = await sheetRect(P);
    check(`${tag} the browser window made smaller (1000x600): the card is still inside`, rv.x >= 0 && rv.y >= 0 && rv.x + rv.w <= 1000.5 && rv.y + rv.h <= 600.5, R(rv));
    await P.setViewportSize({ width: w, height: h }); await P.waitForTimeout(300);

    // remembered after a reload
    const saved = await P.evaluate(() => { try { return JSON.parse(localStorage.getItem("mmsa-ayah-window")); } catch { return null; } });
    const rBefore = await sheetRect(P);
    check(`${tag} the rect is stored under mmsa-ayah-window`, !!saved && [saved.x, saved.y, saved.w, saved.h].every(Number.isFinite), JSON.stringify(saved));
    await P.reload({ waitUntil: "networkidle" }); await P.waitForTimeout(400);
    await toRead(P); await openCard(P);
    const rAfter = await sheetRect(P);
    check(`${tag} after a reload the card opens where it was left`, !!saved && near(rAfter.x, saved.x, 2) && near(rAfter.y, saved.y, 2) && near(rAfter.w, saved.w, 2) && near(rAfter.h, saved.h, 3), `${R(saved)} vs ${R(rAfter)}`);

    // the frame follows the card (closing hides it)
    await P.click("[data-ayah-sheet] [data-ayah-sheet-close]"); await P.waitForTimeout(300);
    const fr = await P.evaluate(() => getComputedStyle(document.querySelector("[data-ayah-win-frame]")).display);
    check(`${tag} closing the card (✕) hides the handles`, fr === "none", fr);

    // every tile and the stage buttons still do their job (Night look only, to keep the run short)
    if (look === "night" && w === 1280) {
      await openCard(P);
      await P.evaluate(() => { const s = document.querySelector("[data-approach-stage-select]"); s.value = [...s.options].find((o) => o.value)?.value ?? ""; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await P.waitForTimeout(300);
      const before = await P.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "records").length);
      await P.evaluate(() => document.querySelector('[data-approach-stage-btn="practising"]')?.click());
      await P.waitForTimeout(400);
      const after = await P.evaluate(() => (window.__stubWriteData || []).filter((x) => x.col === "records").length);
      check(`${tag} a stage button still writes the record, and the card stays open`, after > before && !!(await sheetRect(P)), `${before} -> ${after}`);
      for (const [name, sel] of [["Note", "[data-ayah-sheet-note]"], ["Poster", "[data-ayah-sheet-poster]"], ["QCR", "[data-ayah-sheet-qcr]"], ["Play", "[data-ayah-sheet-play]"], ["Copy", "[data-ayah-sheet-copy]"]]) {
        if (!(await sheetRect(P))) await openCard(P);
        const present = await P.evaluate((s) => !!document.querySelector(`[data-ayah-sheet] ${s}`), sel);
        await P.evaluate((s) => document.querySelector(`[data-ayah-sheet] ${s}`)?.click(), sel);
        await P.waitForTimeout(500);
        const gone = !(await sheetRect(P));
        const fd = await P.evaluate(() => { const f = document.querySelector("[data-ayah-win-frame]"); return f ? getComputedStyle(f).display : "none"; });
        check(`${tag} the ${name} tile acts as before (card closes, handles go with it)`, present && gone && fd === "none", `present=${present} gone=${gone} frame=${fd}`);
        if (name === "Note") check(`${tag} Note opens the note pane`, await P.evaluate(() => !document.getElementById("readNotePane")?.hidden));
        if (!/quranrevival\.html/.test(P.url())) { await P.goBack({ waitUntil: "networkidle" }); await P.waitForTimeout(500); await toRead(P); }
        else await P.keyboard.press("Escape");
      }
    }
    const real = errors.filter((e) => !/ERR_CERT|archive\.org|net::|Failed to load resource/.test(e));
    check(`${tag} no page errors`, real.length === 0, JSON.stringify(real.slice(0, 2)));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== Āyah card as a window (PCF MSA J67)${MUTATE ? ` [mutate=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
