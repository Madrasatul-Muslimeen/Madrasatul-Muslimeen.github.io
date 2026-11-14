// REWRITTEN IN PLACE, 14 Nov 2026 (v15.00, the Owner: ONE bar above the wheel). This suite was written for the Owner's 3 Oct 2026 tablet
// layout (581-720px): the wheel takes the screen's width and Wheel/Legend/Unit, Read, Choose a Unit and Know Your Status stood in its four corners.
// Those corner buttons are retired -- the bar above the wheel holds them all (wheel-bar-browser.mjs measures the bar). What still holds, and what
// this suite now proves, English and Bangla:
//   at 600x960 and 700x1000 (tablet band): the wheel still takes the screen's width (at least 533px / 580px across, the sizes it had before
//   the corners), one resize grip under it, no corner wrappers are built, the bar's five buttons are on screen and its panels open on screen
//   (Know Your Status, Choose a Unit), no sideways scroll, the wheel ends above the dock.
//   at 390 (phone) and 800 (two columns): not a tablet -- no tablet class, all eight grips.
//   600 -> 390 in one page: the tablet class and edge offsets are cleared.
//   --mutate-off    never matches the tablet band: the "wheel takes the width" checks must fail.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function open(lang, w, h) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: h } });
  if (process.argv.includes("--mutate-off")) {
    await ctx.route("**/app/quranrevival.html", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace('matchMedia("(min-width: 581px) and (max-width: 720px)")', 'matchMedia("(min-width: 99999px)")') });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelectorAll("#wheelContainer .wheel-seg").length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}

const measure = () => {
  const r = (el) => { const q = el.getBoundingClientRect(); return { l: Math.round(q.left), r: Math.round(q.right), t: Math.round(q.top), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; };
  return {
    tablet: document.body.classList.contains("tablet-wheel"), wheel: Math.round(document.querySelector("#wheelResizeWrap svg").getBoundingClientRect().width),
    corners: document.querySelectorAll(".tablet-corner").length, handles: [...document.querySelectorAll(".wheel-resize-handle")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.wheelResize),
    btns: ["wbRead", "wbApproach", "wbUnit", "wbStatus", "wbLegend"].map((id) => ({ id, ...r(document.getElementById(id)) })),
    vw: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, wrapB: Math.round(document.getElementById("wheelResizeWrap").getBoundingClientRect().bottom), dock: Math.round(document.getElementById("dock").getBoundingClientRect().top),
    vars: document.getElementById("wheelResizeWrap").getAttribute("style") || "",
  };
};

for (const lang of ["en", "bn"]) {
  for (const [w, h, minWheel, was] of [[600, 960, 530, 533], [700, 1000, 570, 580]] /* v15.00: the bar shares the first screen, so Bangla at 700 is 575 where it was 580+ */) {
    const L = `[${lang} ${w}x${h}]`;
    const { ctx, page } = await open(lang, w, h);
    const m = await page.evaluate(measure);
    check(`${L} a tablet: the wheel takes the screen's width`, m.tablet, JSON.stringify({ tablet: m.tablet }));
    check(`${L} the wheel is at least ${minWheel}px across (it was ${was} before the corner buttons)`, m.wheel >= minWheel, String(m.wheel));
    check(`${L} no corner wrappers are built (the bar holds the buttons now)`, m.corners === 0, String(m.corners));
    check(`${L} one resize grip, under the wheel`, JSON.stringify(m.handles) === '["s"]', JSON.stringify(m.handles));
    check(`${L} the bar's five buttons are on screen, 40px+ tall`, m.btns.every((b) => b.w > 0 && b.h >= 40 && b.l >= 0 && b.r <= m.vw), JSON.stringify(m.btns));
    check(`${L} no sideways scroll`, !m.overflow);
    check(`${L} the wheel ends above the dock`, m.wrapB <= m.dock + 1, `${m.wrapB} vs dock ${m.dock}`);
    for (const [id, panel] of [["wbStatus", "wbPanelStatus"], ["wbUnit", "wbPanelUnit"]]) {
      await page.evaluate((i) => document.getElementById(i).click(), id);
      await page.waitForTimeout(400);
      const p = await page.evaluate((pid) => { const q = document.getElementById(pid).getBoundingClientRect(); return { shown: q.width > 0 && q.height > 0, l: q.left, r: q.right, vw: innerWidth }; }, panel);
      check(`${L} ${id} opens its panel on screen`, p.shown && p.l >= 0 && p.r <= p.vw, JSON.stringify(p));
      await page.evaluate((i) => document.getElementById(i).click(), id);
    }
    if (w === 600) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
      const back = await page.evaluate(measure);
      check(`${L} at 390 in the same page, the tablet class is cleared and the corner arrows are back`, !back.tablet && back.handles.length > 1, JSON.stringify({ t: back.tablet, h: back.handles }));
      check(`${L} and the edge offsets are cleared`, !/--tw-/.test(back.vars), back.vars);
    }
    await ctx.close();
  }
  for (const [w, h] of [[390, 844], [800, 1000]]) {
    const L = `[${lang} ${w}x${h}]`;
    const { ctx, page } = await open(lang, w, h);
    const m = await page.evaluate(measure);
    check(`${L} not a tablet: no tablet class, no corner wrappers, all eight grips`, !m.tablet && m.corners === 0 && m.handles.length === 8, JSON.stringify({ t: m.tablet, c: m.corners, h: m.handles }));
    await ctx.close();
  }
}
await browser.close();
console.log(`\ntablet-wheel-browser: ${pass} passed, ${fail} failed${process.argv.includes("--mutate-off") ? " [mutation off]" : ""}`);
process.exit(fail ? 1 : 0);
