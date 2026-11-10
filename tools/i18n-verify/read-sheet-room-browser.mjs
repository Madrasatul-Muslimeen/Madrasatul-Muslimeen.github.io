// MSA · QR (the Architect 94L/95L, 10 Nov 2026) -- the Read view's ⋮ sheet, two defects found on main v14.08:
//  (1) with the Study Unit on Whole Sūrah, the FIRST āyah's ⋮ sheet opened upward into room that is not there: at 390px its tiles were behind
//      #readScroll, at 1280px behind the Read bar, so a finger could not press "Bookmark whole unit". Checked here by ELEMENTFROMPOINT at the centre
//      of every tile (is the element itself, or inside it, what a finger would hit?), at 390 and 1280, in English and Bangla.
//  (2) the Study group's āyah picker cut "Bismillah" to "Bismilla": its width must hold its longest option, measured with its own computed font.
// Also kept honest: the Read bar's own ⋮ (the Study-only sheet) stays fully reachable. Run from the repo root, node serve.js on :8080.
//   node tools/i18n-verify/read-sheet-room-browser.mjs [--mutate=NAME]
//   nofit      the in-reading-area sheet goes back to opening beside the ⋮ (the old placement)  -> (1) FAILS
//   nowidth    the picker's width is the old 4.5rem again                                       -> (2) FAILS
//   nobandtop  the sheet ignores the Read bar (ceiling is the window's top)                     -> (1) FAILS at 1280 and 390
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${String(d).slice(0, 260)}`));
const PAGE = "app/quranrevival.html";
const MUT = {
  nofit: [PAGE, 'if (wrap.closest("#readScroll")) {', "if (false) {"],
  nowidth: [PAGE, "        fitPlaceWidth(m);\n", "\n"],
  nobandtop: [PAGE, "if (d.bottom > ceil && d.bottom <= b.top + 1) ceil = d.bottom + 4;", ""],
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
if (MUTATE && !MUT[MUTATE]) throw new Error("unknown mutation " + MUTATE);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function open(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE]; const text = fs.readFileSync(file, "utf8");
    if (!text.includes(a)) throw new Error("mutation anchor missing: " + MUTATE);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: text.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/" + PAGE);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  return { ctx, page };
}
const set = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = val; s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
/** Every visible control of the open sheet, hit-tested at its centre; plus where the sheet sits against the Read bar and the screen. */
const reach = (page) => page.evaluate(() => {
  const sheet = [...document.querySelectorAll(".quick-menu.qm-sheet.open")].find((s) => s.getBoundingClientRect().width > 0);
  if (!sheet) return { none: true };
  const controls = [...sheet.querySelectorAll("button, select, a")].filter((e) => e.getBoundingClientRect().width > 0 && !e.hidden);
  const bad = [], seen = [];
  for (const e of controls) {
    const b = e.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const label = e.getAttribute("data-qm-unit-bookmark") !== null ? "unit-bookmark" : (e.textContent.trim().slice(0, 16) || e.id);
    seen.push(label);
    if (!(t && (t === e || e.contains(t)))) bad.push(`${label} -> ${t ? (t.id ? "#" + t.id : t.tagName + "." + String(t.className).slice(0, 24)) : "null"}`);
  }
  const bar = document.getElementById("readBar"), sb = sheet.getBoundingClientRect(), bb = bar?.getBoundingClientRect();
  return { n: controls.length, bad, seen, sheetTop: Math.round(sb.top), sheetBottom: Math.round(sb.bottom), barBottom: bb ? Math.round(bb.bottom) : 0, vh: innerHeight, hasUnit: seen.includes("unit-bookmark") };
});

for (const [lang, w, h] of [["en", 390, 844], ["en", 1280, 800], ["bn", 390, 844]]) {
  const tag = `[${lang} ${w}]`;
  console.log(`\n=== read sheet room ${tag} ===`);
  const { ctx, page } = await open(lang, w, h);
  // (1) Whole Sūrah 2, the first āyah's ⋮ (the one inside the reading area)
  await set(page, "surahSelect", "2"); await page.waitForTimeout(1500);
  await set(page, "unitTypeSelect", "surah"); await page.waitForTimeout(800);
  await page.locator("#readScroll .ayah-quick-btn:visible").first().click(); await page.waitForTimeout(450);
  const r = await reach(page);
  check(`${tag} (1) the first āyah's ⋮ sheet opens, with its "Bookmark whole unit" tile`, !r.none && r.hasUnit, JSON.stringify(r).slice(0, 200));
  check(`${tag} (1) EVERY control of the sheet is what a finger hits at its centre (elementFromPoint)`, !r.none && r.n >= 10 && r.bad.length === 0, JSON.stringify(r.bad));
  check(`${tag} (1) the sheet sits below the Read bar and inside the screen`, !r.none && r.sheetTop >= r.barBottom - 1 && r.sheetBottom <= r.vh, JSON.stringify({ top: r.sheetTop, bar: r.barBottom, bottom: r.sheetBottom, vh: r.vh }));
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  // the same ⋮ after scrolling the flow a little: still reachable
  await page.evaluate(() => { const s = document.getElementById("readScroll"); s.scrollTop = 140; }); await page.waitForTimeout(300);
  const btn = page.locator("#readScroll .ayah-quick-btn:visible").first();
  await btn.click().catch(() => {}); await page.waitForTimeout(450);
  const r2 = await reach(page);
  check(`${tag} (1) after scrolling the flow, an āyah's ⋮ sheet is still fully reachable`, !r2.none && r2.n >= 10 && r2.bad.length === 0, JSON.stringify(r2.bad ?? r2));
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  // the Read bar's own ⋮ (Study-only sheet) -- a guard that this round did not move it
  await page.evaluate(() => { const s = document.getElementById("readScroll"); s.scrollTop = 0; });
  await set(page, "unitTypeSelect", "ayah"); await set(page, "surahSelect", "1"); await page.waitForTimeout(1200);
  await page.locator("#readBar .ayah-quick-btn:visible, #readQuickMenuSlot .ayah-quick-btn:visible").first().click().catch(() => {}); await page.waitForTimeout(450);
  const r3 = await reach(page);
  check(`${tag} the Read bar's own ⋮ sheet stays fully reachable`, !r3.none && r3.n >= 3 && r3.bad.length === 0, JSON.stringify(r3.bad ?? r3));
  // (2) the Study group's āyah picker holds its longest option
  const pick = await page.evaluate(() => {
    const sel = [...document.querySelectorAll(".quick-menu.qm-sheet.open select[data-qm-place='readAyahSelect']")].find((s) => s.getBoundingClientRect().width > 0);
    if (!sel) return { none: true };
    const cs = getComputedStyle(sel); const c = document.createElement("canvas").getContext("2d"); c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const longest = Math.max(...[...sel.options].map((o) => c.measureText(o.textContent).width));
    const chrome = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) + 20; // the arrow takes at least 20px
    return { width: sel.getBoundingClientRect().width, need: longest + chrome, longestText: [...sel.options].map((o) => o.textContent).sort((a, b) => b.length - a.length)[0] };
  });
  check(`${tag} (2) the āyah picker is wide enough for its longest option ("${pick.longestText}")`, !pick.none && pick.width >= pick.need - 0.5, JSON.stringify(pick));
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== read sheet room${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
