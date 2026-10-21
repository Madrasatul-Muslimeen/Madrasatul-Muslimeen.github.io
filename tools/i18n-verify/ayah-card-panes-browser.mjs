// PCF MSA J70 (the Owner, 22 Oct 2026): the Āyah card as a window on a computer -- "two equal panes, both can be resizeable
// to full card"; "the full Text ... on the left half"; "the full text also to take the entire card size (squeezing the right
// half to a bar above it)"; "Tidy the 2nd topbar"; "the button groups as the 3rd bar"; "the left side blocks to the right
// half above the 'related Ayat'"; "'Related Ayat' as Pull-down (when it is more than 2)"; then "the full text with
// translations and WbW expand/collapse". Phones keep today's card. Real data at 2:255 (11 related āyāt). Run from the
// repository root, serve.js on :8080 (or QR_BASE=...). Every mutation (--mutate=NAME) must make the suite exit 1:
//   unequal     the panes do not start equal                         -> "two equal halves" fails
//   nodrag      the splitter does nothing                            -> the drag checks fail
//   nosqueeze   a drag to the edge never squeezes a pane             -> the "fills the card" checks fail
//   nobar       in full-text mode the right half vanishes (no bar)   -> the "bar above" check fails
//   notext      the left pane is empty                               -> the full-text checks fail
//   noorder     the right half keeps the old order                   -> the order check fails
//   nopull      Related āyāt is never a pull-down                    -> the pull-down checks fail
//   nofold      the full text's sections are not remembered          -> the remembered-sections check fails
//   bar2        bar 2 wraps onto two lines again                     -> the bar-2 check fails
//   phone       the panes show on a phone                            -> the phone checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const W = "app/js/ayah-card-window.js", S = "app/js/ayah-action-sheet.js";
const MUT = {
  unequal: [W, '  return { f: 0.5, mode: "split" };', '  return { f: 0.3, mode: "split" };'],
  nodrag: [W, '    const move = (ev) => {\n      const f', '    const move = (ev) => { return;\n      const f'],
  nosqueeze: [W, 'f >= 1 - SQUEEZE ? { f: panes.f, mode: "text" } : f <= SQUEEZE ? { f: panes.f, mode: "info" } : { f, mode: "split" }', '{ f: Math.min(Math.max(f, SQUEEZE), 1 - SQUEEZE), mode: "split" }'],
  nobar: [W, '[data-pane-mode="text"] .ayah-sheet-pane-info > :not(.ayah-sheet-squeezed) { display: none; }', '[data-pane-mode="text"] .ayah-sheet-pane-info { display: none !important; }'],
  notext: [S, '<div class="ayah-sheet-ft" data-ayah-sheet-ft>${fullTextPaneHtml(fullText)}</div>', '<div class="ayah-sheet-ft" data-ayah-sheet-ft></div>'],
  noorder: [W, '.ayah-sheet-pane-info > .ayah-sheet-body { order: 1; }', '.ayah-sheet-pane-info > .ayah-sheet-body { order: 9; }'],
  nopull: [S, "  return n > 2\n", "  return n > 99\n"],
  nofold: [W, "    try { localStorage.setItem(FT_KEY, JSON.stringify(ftOpen)); } catch { /* not remembered */ }", "    void 0;"],
  bar2: [W, ".ayah-sheet[data-ayah-win] .ayah-sheet-header { flex-wrap: nowrap;", ".ayah-sheet[data-ayah-win] .ayah-sheet-header { flex-wrap: wrap;"],
  phone: [W, "const WINDOW_FROM = 900;", "const WINDOW_FROM = 0;"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const near = (a, b, t = 2) => Math.abs(a - b) <= t;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function open(lang, look, width, height) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.addInitScript((lk) => { try { localStorage.setItem("mm_card_look", lk); } catch { /* */ } }, look);
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) }));
  }
  const { page: P } = await openPage(ctx, "/app/quranrevival.html");
  const errors = [];
  P.on("pageerror", (e) => errors.push(e.message));
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge^="2:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="2:255"]'), null, { timeout: 8000 }); await P.waitForTimeout(500);
  return { ctx, P, errors };
}
const openCard = async (P) => {
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await P.evaluate(() => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 });
  await P.waitForFunction(() => document.querySelector("[data-ayah-related-more], [data-ayah-sheet-related] .ayah-related-item"), null, { timeout: 8000 }).catch(() => {});
  await P.waitForTimeout(500);
};
const state = (P) => P.evaluate(() => {
  const s = document.querySelector("[data-ayah-sheet]"), r = (sel) => { const e = s.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom, shown: b.width > 0 && b.height > 0 && getComputedStyle(e).display !== "none" }; };
  const box = s.querySelector("[data-ayah-sheet-panes]");
  return { mode: box?.dataset.paneMode ?? null, text: r("[data-ayah-sheet-text]"), info: r("[data-ayah-sheet-paneinfo]"), split: r("[data-ayah-sheet-splitter]"), panes: r("[data-ayah-sheet-panes]"),
    barInfo: r('[data-squeezed-for="info"]'), barText: r('[data-squeezed-for="text"]'), status: r("[data-ayah-sheet-status]"), body: r(".ayah-sheet-body"), infoSec: r("[data-ayah-sheet-info]"), tiles: r("[data-ayah-sheet-actions]"), header: r(".ayah-sheet-header"),
    popup: [...document.querySelectorAll("[data-note-view-popup], #ayahNoteViewPopup, .ayah-note-view-popup")].some((e) => e.getBoundingClientRect().width > 0) };
});
async function dragSplitTo(P, frac) {
  const g = await P.evaluate(() => { const sp = document.querySelector("[data-ayah-sheet-splitter]").getBoundingClientRect(), pb = document.querySelector("[data-ayah-sheet-panes]").getBoundingClientRect(); return { x: sp.left + sp.width / 2, y: sp.top + 80, l: pb.left, w: pb.width }; });
  await P.mouse.move(g.x, g.y); await P.mouse.down(); await P.mouse.move(g.l + g.w * frac, g.y, { steps: 10 }); await P.mouse.up(); await P.waitForTimeout(250);
}

for (const [lang, look, width, height] of [["en", "night", 1280, 900], ["bn", "light", 1600, 1000]]) {
  const tag = `[${lang} ${look} ${width}]`;
  console.log(`\n=== Āyah card panes ${tag} ===`);
  const { ctx, P, errors } = await open(lang, look, width, height);
  await openCard(P);
  let s = await state(P);
  // 1. two equal halves, the full text on the left
  check(`${tag} two equal halves side by side: the full text left, the rest right, a handle between`, s.mode === "split" && s.text?.shown && s.info?.shown && near(s.text.w, s.info.w, 3) && s.info.x > s.text.r - 1 && near(s.text.y, s.info.y, 2) && s.split?.shown, JSON.stringify({ mode: s.mode, t: s.text, i: s.info }));
  const ft = await P.evaluate(() => { const f = document.querySelector("[data-ayah-sheet-ft]"); return { ar: f?.querySelector(".ayah-ft-ar")?.textContent.trim().slice(0, 12) ?? "", tr: f?.querySelectorAll('details[data-ayah-ft-sec="tr"] .ayah-ft-tr p').length ?? 0, wbw: f?.querySelectorAll('details[data-ayah-ft-sec="wbw"] .ayah-ft-w').length ?? 0, trOpen: f?.querySelector('details[data-ayah-ft-sec="tr"]')?.open, wbwOpen: f?.querySelector('details[data-ayah-ft-sec="wbw"]')?.open }; });
  check(`${tag} the left half is the full text: the Arabic, then Translations (English, Bangla) open, Word by word (50 words) closed`, ft.ar.startsWith("ٱلل") && ft.tr === 2 && ft.wbw === 50 && ft.trOpen === true && ft.wbwOpen === false, JSON.stringify(ft));
  // 2. bars: bar 2 on one line, bar 3 the buttons in one row, both above the panes
  const bars = await P.evaluate(() => { const h = document.querySelector("[data-ayah-sheet] .ayah-sheet-header"), mid = (e) => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; }; const parts = [h.querySelector(".ayah-sheet-ref"), h.querySelector("[data-ayah-sheet-step='1']"), h.querySelector("[data-ayah-sheet-noteview]"), h.querySelector("[data-ayah-sheet-close]")]; const ms = parts.map(mid); const tiles = [...document.querySelectorAll("[data-ayah-sheet] .ayah-sheet-act")].map((t) => Math.round(t.getBoundingClientRect().top)); return { spread: Math.max(...ms) - Math.min(...ms), rows: new Set(tiles).size, n: tiles.length }; });
  check(`${tag} bar 2 is one line: the reference, ‹ ›, 📖 Full text and ✕ side by side`, bars.spread < 8, JSON.stringify(bars));
  check(`${tag} bar 3 is the ${bars.n} buttons in one row, above the two halves`, bars.rows === 1 && bars.n >= 9 && s.tiles.b <= s.panes.y + 1 && s.header.b <= s.tiles.y + 1, JSON.stringify({ bars, tiles: s.tiles, panes: s.panes }));
  // 3. the right half's order: Approach + Progress, then Status, then Info (Related āyāt)
  check(`${tag} the right half: Take an Approach and Progress first, then Status of this āyah, then Info`, s.body?.y < s.status?.y && s.status?.y < s.infoSec?.y, JSON.stringify({ b: s.body?.y, s: s.status?.y, i: s.infoSec?.y }));
  // 4. Related āyāt: more than 2 -> a pull-down, closed
  const rel = await P.evaluate(() => { const d = document.querySelector("[data-ayah-sheet-related] details[data-ayah-related-more]"); return { pull: !!d, open: d?.open ?? null, items: document.querySelectorAll("[data-ayah-sheet-related] .ayah-related-item").length, summary: d?.querySelector("summary")?.textContent.trim() ?? "" }; });
  check(`${tag} Related āyāt (${rel.items}) is a closed pull-down that says how many`, rel.pull && rel.open === false && rel.items > 2 && /11|১১/.test(rel.summary), JSON.stringify(rel));
  // 5. the splitter: drag, then near an edge
  await dragSplitTo(P, 0.65);
  s = await state(P);
  check(`${tag} dragging the handle to 65% makes the full text wider than the rest`, s.mode === "split" && s.text.w > s.info.w * 1.5, JSON.stringify({ m: s.mode, t: s.text.w, i: s.info.w }));
  await dragSplitTo(P, 0.97);
  s = await state(P);
  check(`${tag} dragged to the right edge: the full text fills the card, the rest is a slim bar above it`, s.mode === "text" && s.barInfo?.shown && s.barInfo.h < 60 && s.barInfo.b <= s.text.y + 1 && near(s.text.w, s.panes.w, 4), JSON.stringify({ m: s.mode, bar: s.barInfo, t: s.text, p: s.panes }));
  await P.click('[data-ayah-sheet] [data-squeezed-for="info"]'); await P.waitForTimeout(250);
  s = await state(P);
  check(`${tag} the bar's "Show both halves" brings the two halves back`, s.mode === "split" && s.text.shown && s.info.shown && s.info.x > s.text.r - 1, s.mode);
  await dragSplitTo(P, 0.03);
  s = await state(P);
  check(`${tag} dragged to the left edge: the rest fills the card, the full text is a slim bar above it`, s.mode === "info" && s.barText?.shown && s.barText.h < 60 && s.barText.b <= s.info.y + 1 && near(s.info.w, s.panes.w, 4), JSON.stringify({ m: s.mode, bar: s.barText }));
  await P.click('[data-ayah-sheet] [data-squeezed-for="text"]'); await P.waitForTimeout(250);
  // 6. ⤢ and 📖 Full text: the full text across the card (📖 no longer opens the separate Note view on a computer)
  await P.click("[data-ayah-sheet] [data-ayah-sheet-textfull]"); await P.waitForTimeout(250);
  s = await state(P);
  check(`${tag} ⤢ puts the full text across the whole card (the rest a bar above)`, s.mode === "text" && s.barInfo?.shown, s.mode);
  await P.click("[data-ayah-sheet] [data-ayah-sheet-noteview]"); await P.waitForTimeout(250);
  s = await state(P);
  check(`${tag} 📖 Full text in bar 2 switches back to both halves, and opens no separate window`, s.mode === "split" && !s.popup && !!(await P.$("[data-ayah-sheet]")), JSON.stringify({ m: s.mode, popup: s.popup }));
  await P.click("[data-ayah-sheet] [data-ayah-sheet-noteview]"); await P.waitForTimeout(250);
  check(`${tag} ...and again, the full text across the card`, (await state(P)).mode === "text");
  // 7. sections open/closed, remembered; panes remembered
  await P.evaluate(() => { const d = document.querySelector('details[data-ayah-ft-sec="wbw"]'); d.open = true; const t = document.querySelector('details[data-ayah-ft-sec="tr"]'); t.open = false; });
  await P.waitForTimeout(300);
  await P.click("[data-ayah-sheet] [data-ayah-sheet-close]"); await P.waitForTimeout(300);
  await P.reload({ waitUntil: "networkidle" }); await P.waitForTimeout(400);
  await P.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await P.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await P.click("#tabStudyBtn"); await P.waitForTimeout(150); }
  await P.click("#tabReadBtn"); await P.waitForTimeout(400);
  await P.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge^="2:"]'), null, { timeout: 15000 });
  await P.evaluate(() => { const el = document.getElementById("ayahSelect"); el.value = "255"; el.dispatchEvent(new Event("change", { bubbles: true })); });
  await P.waitForFunction(() => document.querySelector('[data-ayah-num-badge="2:255"]'), null, { timeout: 8000 }); await P.waitForTimeout(400);
  await openCard(P);
  const after = await P.evaluate(() => ({ mode: document.querySelector("[data-ayah-sheet-panes]")?.dataset.paneMode, tr: document.querySelector('details[data-ayah-ft-sec="tr"]')?.open, wbw: document.querySelector('details[data-ayah-ft-sec="wbw"]')?.open }));
  check(`${tag} after a reload: the full text still across the card, Translations closed, Word by word open (as left)`, after.mode === "text" && after.tr === false && after.wbw === true, JSON.stringify(after));
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// 8. a phone: today's card -- no text pane, no handle, Status before Take an Approach
for (const lang of ["en", "bn"]) {
  const tag = `[${lang} phone 390]`;
  const { ctx, P, errors } = await open(lang, "night", 390, 844);
  await openCard(P);
  const s = await state(P);
  check(`${tag} the phone card is as before: no full-text pane, no handle, no bars, Status above Take an Approach`, !s.text?.shown && !s.split?.shown && !s.barInfo?.shown && s.status.y < s.body.y && near(s.status.x, s.body.x, 30), JSON.stringify({ t: s.text, sp: s.split, st: s.status?.y, b: s.body?.y }));
  check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// 9. the renderer itself: 2 related āyāt stay a plain list (no pull-down); 3 become one
const { renderAyahActionSheetHtml } = await import("../../app/js/ayah-action-sheet.js");
const item = (i) => ({ surah: 1, ayah: i, ref: `1:${i}`, reason: "r" });
const two = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", ref: "x", related: { lists: [item(1)], shared: [item(2)] } });
const three = renderAyahActionSheetHtml({ unitKey: "ayah:1:1", ref: "x", related: { lists: [item(1), item(2)], shared: [item(3)] } });
check("2 related āyāt: a plain list, no pull-down; 3: a pull-down holding all 3", !/data-ayah-related-more/.test(two) && (two.match(/ayah-related-item/g) || []).length === 2 && /data-ayah-related-more/.test(three) && (three.match(/class="ayah-related-item"/g) || []).length === 3);

await browser.close();
console.log(`\n==== Āyah card panes (J70)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
