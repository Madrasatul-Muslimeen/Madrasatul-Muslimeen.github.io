// QR Lead audit 3, 31 Oct 2026 (Text size A±, PCF User Manual o5a3205): the Read view's A± sliders hang 13.5rem wide under
// their button, and below 900px that button lives in the ⋯ panel, which is position: fixed, so whatever fell past the screen
// could never be scrolled to. Measured on main v12.138 with this suite's probe: at 360x740 200% the sliders were 472px wide
// and began 121px below the screen (all six controls off it); 390x844 200% the same; 360x740 150% Reset off the bottom; on a
// phone turned sideways (740x360) five of six off even at ordinary text, all six at 150/200%; 768x1024 200% Reset under the
// Zab bar; 1280x800 200% Reset under the tabs. And the ⋯ panel itself (fixed, while read-tall lets the page scroll) ran
// off the screen: 360x740 200% 707px tall from 602px; sideways at 200% it opened below the screen. placeReadTools() holds it.
// fitReadTextSize() now holds them on screen, above the tabs and the Zab bar,
// on the side of A± with more room, scrolling inside themselves when that is still short. Where they fitted, nothing moves.
//   node tools/i18n-verify/qr-text-size-reach-browser.mjs [--mutate=NAME]   (serve.js on :8080, from the repo root)
//   no-fit    the fit is never run                -> "every control can be reached" / "inside the screen" FAIL
//   no-floor  the tabs and Zab bar are ignored    -> "every control can be reached" FAILS at 768/1280 200%
//   no-width  the width is not held to the screen -> "inside the screen sideways" FAILS at 360/390 200%
//   always    the fit runs where it already fitted -> "nothing moves where it fitted" FAILS at 100%
//   no-panel  the ⋯ panel is never held on screen -> "every tool in the ⋯ panel can be reached" FAILS at 200% and sideways
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-fit": ['    readTextSizeSlot?.addEventListener("click", () => requestAnimationFrame(fitReadTextSize));\n', ""],
  "no-floor": ['for (const id of ["dock", "zabBar"]) {', "for (const id of []) {"],
  "no-width": ["const width = Math.min(p.width, window.innerWidth - 16),", "const width = p.width,"],
  "always": ["if (!readToolsMenu.style.overflowY && p.left >= 8 && p.right <= window.innerWidth - 8 && p.top >= 8 && p.bottom <= floor) return;", ""],
  "no-panel": ["      if (need <= below) return;\n", "      return;\n"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const SHOT_DIR = process.env.SHOT_DIR || "";
// Where the sliders sat at ordinary text on main v12.138 (left, top), written by hand: these must not move.
const PLAIN = { "360x740": [19, 360], "390x844": [19, 360], "768x1024": [381, 320], "1280x800": [697, 221] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function boot(lang, w, h, size) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [from, to] = MUT[MUTATE];
    await ctx.route("**/app/quranrevival.html*", async (r) => {
      const res = await r.fetch(); const body = await res.text();
      if (body.split(from).length !== 2) throw new Error(`mutation ${MUTATE}: anchor not found exactly once`);
      r.fulfill({ response: res, body: body.replace(from, to) });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(900);
  return { ctx, page };
}
// Opens A± the way a finger does (⋯ first where it lives in the panel) and measures its sliders.
async function openAndMeasure(page) {
  const inMenu = await page.evaluate(() => !document.querySelector("#readTextSizeSlot [data-text-size-toggle]").getClientRects().length);
  let panel = null;
  if (inMenu) {
    await page.locator("#readToolsBtn").click(); await page.waitForTimeout(250);
    panel = await page.evaluate(() => {
      const R = (e) => e.getBoundingClientRect(), m = document.getElementById("readToolsMenu"), scrolls = /auto|scroll/.test(getComputedStyle(m).overflowY);
      const hit = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false; const at = document.elementFromPoint(x, y); return !!at && e.contains(at); };
      const tiles = [...m.querySelectorAll("button")].filter((e) => e.getClientRects().length && R(e).width > 0 && !e.closest(".text-size-popover"));
      const unreachable = tiles.filter((e) => { if (hit(e)) return false; if (!scrolls) return true; e.scrollIntoView({ block: "nearest" }); return !hit(e); })
        .map((e) => (e.getAttribute("aria-label") || e.id || e.textContent).trim().slice(0, 14));
      m.scrollTop = 0; const p = R(m);
      return { n: tiles.length, unreachable, top: Math.round(p.top), bottom: Math.round(p.bottom), moved: !!m.style.overflowY };
    });
  }
  const tg = page.locator("#readTextSizeSlot [data-text-size-toggle]");
  await tg.scrollIntoViewIfNeeded(); await tg.click(); await page.waitForTimeout(250);
  return page.evaluate((panel) => {
    const R = (e) => e.getBoundingClientRect(), pop = document.querySelector("#readTextSizeSlot .text-size-popover"), p = R(pop);
    const toggle = document.querySelector("#readTextSizeSlot [data-text-size-toggle]"), tr = R(toggle);
    const popScrolls = /auto|scroll/.test(getComputedStyle(pop).overflowY);
    const ctrls = [...pop.querySelectorAll("input, button")];
    const hit = (e) => { const r = R(e), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return false; const at = document.elementFromPoint(x, y); return !!at && e.contains(at); };
    const unreachable = ctrls.filter((e) => { if (hit(e)) return false; if (!popScrolls) return true; e.scrollIntoView({ block: "nearest" }); return !hit(e); })
      .map((e) => (e.dataset.textSizeSlider || e.textContent || e.tagName).trim().slice(0, 12));
    pop.scrollTop = 0;
    const at = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2);
    return { open: pop.classList.contains("open"), n: ctrls.length, unreachable, left: Math.round(p.left), right: Math.round(p.right), top: Math.round(p.top),
      bottom: Math.round(p.bottom), width: Math.round(p.width), moved: !!pop.style.position, toggleFree: !!at && toggle.contains(at),
      panel, sliderW: Math.round(Math.min(...[...pop.querySelectorAll('input[type="range"]')].map((e) => R(e).width))) };
  }, panel);
}

for (const [w, h, lang] of [[360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [414, 896, "bn"], [768, 1024, "en"], [768, 1024, "bn"], [1280, 800, "en"], [1280, 800, "bn"], [740, 360, "en"], [740, 360, "bn"], [844, 390, "en"]]) {
  for (const size of ["100%", "150%", "200%"]) {
    const { ctx, page } = await boot(lang, w, h, size);
    const m = await openAndMeasure(page), tag = `${lang} ${w}x${h} ${size}`, d = JSON.stringify(m);
    if (m.panel) {
      check(`${tag}: every tool in the ⋯ panel can be reached`, m.panel.n >= 3 && m.panel.unreachable.length === 0, JSON.stringify(m.panel));
      if (size === "100%" && PLAIN[`${w}x${h}`]) check(`${tag}: the ⋯ panel is where it was`, !m.panel.moved, JSON.stringify(m.panel));
    }
    check(`${tag}: A± opens its sliders`, m.open && m.n >= 6, d);
    check(`${tag}: the sliders lie inside the screen sideways`, m.left >= 0 && m.right <= w, d);
    check(`${tag}: every control can be reached`, m.unreachable.length === 0, d);
    check(`${tag}: A± is not covered, so a second tap can close them`, m.toggleFree, d);
    check(`${tag}: each slider is wide enough to drag (>= 40px)`, m.sliderW >= 40, d);
    const plain = PLAIN[`${w}x${h}`];
    // The places were measured in English; in Bangla the rows differ, so there it is only "not moved".
    if (size === "100%" && plain) check(`${tag}: nothing moves where it fitted`, !m.moved && (lang !== "en" || (Math.abs(m.left - plain[0]) <= 2 && Math.abs(m.top - plain[1]) <= 2)), d);
    if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/ts-${lang}-${w}x${h}-${size.replace("%", "")}.png` });
    if (size === "200%" && w === 360 && lang === "en") {
      await page.locator("#readTextSizeSlot [data-text-size-toggle]").click(); await page.waitForTimeout(200);
      check(`${tag}: a second tap on A± closes the sliders`, await page.evaluate(() => !document.querySelector("#readTextSizeSlot .text-size-popover").classList.contains("open")));
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
