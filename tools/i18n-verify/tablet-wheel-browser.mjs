// Owner, 3 Oct 2026 (tablet photos with the corners marked): "let the wheel
// fit to the entire screen well n then, you place those buttons in the gaps".
// Rendered, English and Bangla:
//   at 600x960 and 700x1000 (tablet): the wheel is at least 575px / 660px
//   across (it was 533 / 580); Wheel/Legend/Unit stacked top left, Read top
//   right, Choose a Unit bottom left, Know Your Status bottom right, every one
//   clear of the wheel's ring, each label on one line; one resize grip; a
//   drawer opens over the wheel and stays on screen; Choose a Unit's list
//   opens on screen; no sideways scroll; the wheel ends above the dock.
//   at 390 (phone) and 800 (two columns): nothing moved.
//   600 -> 390 in one page: every button goes back to its own row.
//   "Place them on edges" (Owner, 3 Oct 2026): each corner button stands at
//   most 8px from its side of the SCREEN, and still does when the wheel's box
//   is pushed 40px in from both sides (as on the Owner's tablet).
//   --mutate-off    never matches the tablet band: the tablet checks must fail.
//   --mutate-edges  corners follow the wheel's box, not the screen: the
//                   pushed-in checks must fail.
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
  if (process.argv.includes("--mutate-edges")) {
    await ctx.route("**/app/quranrevival.html", async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replaceAll("var(--tw-l, 0px)", "0px").replaceAll("var(--tw-r, 0px)", "0px");
      await route.fulfill({ response: res, body });
    });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  return { ctx, page };
}

const measure = () => {
  const svg = document.querySelector("#wheelResizeWrap svg"); const s = svg.getBoundingClientRect();
  const cx = s.left + s.width / 2, cy = s.top + s.height / 2;
  let ring = 0;
  for (let x = Math.max(0, s.left); x < cx; x++) { const el = document.elementFromPoint(x, cy); if (el && svg.contains(el) && el.tagName === "path") { ring = cx - x; break; } }
  const box = (el) => { const r = el.getBoundingClientRect(); const nx = Math.max(r.left, Math.min(cx, r.right)), ny = Math.max(r.top, Math.min(cy, r.bottom)); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), h: Math.round(r.height), gap: Math.round(Math.hypot(nx - cx, ny - cy) - ring), lines: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight || "20")) }; };
  const wrap = document.getElementById("wheelResizeWrap").getBoundingClientRect();
  const drawers = [...document.querySelectorAll("[data-wheel-drawer]")].map(box);
  const handles = [...document.querySelectorAll("#wheelResizeWrap [data-wheel-resize]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.dataset.wheelResize);
  const dock = document.getElementById("dock")?.getBoundingClientRect().top ?? innerHeight;
  return {
    wheel: Math.round(s.width), ring: Math.round(ring), wrap: { l: Math.round(wrap.left), t: Math.round(wrap.top), r: Math.round(wrap.right), b: Math.round(wrap.bottom) },
    read: box(document.getElementById("readContentsBtn")), unit: box(document.getElementById("wheelUnitBtn")), kys: box(document.getElementById("myStatusWideBtn")), drawers, handles,
    homes: { read: document.getElementById("readContentsBtn").parentElement.id, kys: document.getElementById("myStatusWideBtn").parentElement.id, drawer: document.querySelector("[data-wheel-drawer]").parentElement.id },
    overflow: document.documentElement.scrollWidth > innerWidth + 1, dock: Math.round(dock), vw: innerWidth,
  };
};

for (const lang of ["en", "bn"]) {
  for (const [w, h, minWheel, was] of [[600, 960, 575, 533], [700, 1000, 650, 580]]) {
    const L = `[${lang} ${w}]`;
    console.log(`\n=== tablet ${L} ===`);
    const { ctx, page } = await open(lang, w, h);
    const m = await page.evaluate(measure);
    check(`${L} the wheel is at least ${minWheel}px across (it was ${was})`, m.wheel >= minWheel, String(m.wheel));
    const near = 24, edge = 8;
    check(`${L} Read sits in the top-right corner, on the screen's edge`, m.read.r >= m.vw - edge && m.read.t - m.wrap.t <= near, JSON.stringify(m.read));
    check(`${L} Choose a Unit sits in the bottom-left corner, on the screen's edge`, m.unit.l <= edge && m.wrap.b - m.unit.b <= near + 4, JSON.stringify(m.unit));
    check(`${L} Know Your Status sits in the bottom-right corner, on the screen's edge`, m.kys.r >= m.vw - edge && m.wrap.b - m.kys.b <= near, JSON.stringify(m.kys));
    check(`${L} Wheel / Legend / Unit are stacked in the top-left corner, on the screen's edge`, m.drawers.every((d) => d.l <= edge) && m.drawers[0].t - m.wrap.t <= near && m.drawers[1].t > m.drawers[0].b - 1 && m.drawers[2].t > m.drawers[1].b - 1, JSON.stringify(m.drawers));
    const all = [m.read, m.unit, m.kys, ...m.drawers];
    check(`${L} every button is clear of the wheel's ring`, m.ring > 0 && all.every((b) => b.gap > 0), JSON.stringify(all.map((b) => b.gap)) + " ring " + m.ring);
    check(`${L} Choose a Unit and Know Your Status each fit one line (36-40px tall)`, m.unit.h <= 40 && m.kys.h <= 40, `${m.unit.h} ${m.kys.h}`);
    check(`${L} one resize grip, under the wheel`, JSON.stringify(m.handles) === '["s"]', JSON.stringify(m.handles));
    check(`${L} no sideways scroll`, !m.overflow);
    check(`${L} the wheel and its corner buttons end above the dock`, m.wrap.b <= m.dock + 1, `${m.wrap.b} vs dock ${m.dock}`);
    // A drawer opens over the wheel, on screen.
    await page.click('[data-wheel-drawer="wheel"]');
    await page.waitForTimeout(300);
    const panel = await page.evaluate(() => { const p = document.querySelector('[data-wheel-drawer-panel="wheel"]'); const r = p.getBoundingClientRect(); const btn = document.querySelector('[data-wheel-drawer="wheel"]').getBoundingClientRect(); return { shown: !p.hidden && r.height > 0, l: Math.round(r.left), r: Math.round(r.right), below: r.top >= btn.bottom - 1, vw: innerWidth }; });
    check(`${L} the Wheel drawer opens under its button, on screen`, panel.shown && panel.below && panel.l >= 0 && panel.r <= panel.vw, JSON.stringify(panel));
    await page.click('[data-wheel-drawer="wheel"]');
    // Choose a Unit's list opens on screen.
    await page.click("#wheelUnitBtn");
    await page.waitForTimeout(300);
    const pal = await page.evaluate(() => { const p = document.querySelector("[data-bar-palette-wrap='wheelUnit'] .wheel-unit-palette"); if (!p) return null; const r = p.getBoundingClientRect(); return { shown: r.height > 0, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight }; });
    check(`${L} Choose a Unit's list opens on screen`, !!pal && pal.shown && pal.l >= 0 && pal.r <= pal.vw && pal.t >= 0 && pal.b <= pal.vh, JSON.stringify(pal));
    if (w === 600) await page.screenshot({ path: `/tmp/tablet-wheel-${lang}-${w}.png` });
    // The wheel's box pushed 40px in from both sides: the buttons stay on the
    // screen's edges, still clear of the ring.
    await page.keyboard.press("Escape");
    await page.evaluate(() => { const s = document.getElementById("wheelSection"); s.style.paddingLeft = "40px"; s.style.paddingRight = "40px"; s.style.boxSizing = "border-box"; dispatchEvent(new Event("resize")); });
    await page.waitForTimeout(400);
    const p = await page.evaluate(measure);
    check(`${L} pushed in: the wheel's box really is 40px+ in from each side`, p.wrap.l >= 40 && p.vw - p.wrap.r >= 40, JSON.stringify(p.wrap));
    check(`${L} pushed in: Read and Know Your Status still on the right edge`, p.read.r >= p.vw - edge && p.kys.r >= p.vw - edge, `${p.read.r} ${p.kys.r} of ${p.vw}`);
    check(`${L} pushed in: Choose a Unit and the drawer stack still on the left edge`, p.unit.l <= edge && p.drawers.every((d) => d.l <= edge), JSON.stringify([p.unit.l, ...p.drawers.map((d) => d.l)]));
    check(`${L} pushed in: every button clear of the ring, no sideways scroll`, p.ring > 0 && [p.read, p.unit, p.kys, ...p.drawers].every((b) => b.gap > 0) && !p.overflow, JSON.stringify([p.read, p.unit, p.kys, ...p.drawers].map((b) => b.gap)));
    if (w === 600) await page.screenshot({ path: `/tmp/tablet-wheel-${lang}-${w}-pushed.png` });
    await page.evaluate(() => { const s = document.getElementById("wheelSection"); s.style.paddingLeft = s.style.paddingRight = s.style.boxSizing = ""; dispatchEvent(new Event("resize")); });
    await page.waitForTimeout(300);
    if (w === 600) {
      // Leaving the band puts every button back in its own row.
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(600);
      const back = await page.evaluate(measure);
      const stillTablet = await page.evaluate(() => document.body.classList.contains("tablet-wheel"));
      check(`${L} at 390 in the same page, every button is back in its row`, back.homes.read === "wheelIntroSettled" && back.homes.kys === "wheelIntroSettled" && back.homes.drawer === "wheelDrawerRow" && !stillTablet, JSON.stringify({ ...back.homes, stillTablet }));
      check(`${L} and the corner arrows are back`, back.handles.length > 1, JSON.stringify(back.handles));
      const vars = await page.evaluate(() => document.getElementById("wheelResizeWrap").style.cssText);
      check(`${L} and the edge offsets are cleared`, !/--tw-/.test(vars), vars);
    }
    await ctx.close();
  }
  for (const [w, h] of [[390, 844], [800, 1280]]) {
    const L = `[${lang} ${w}]`;
    const { ctx, page } = await open(lang, w, h);
    const m = await page.evaluate(measure);
    const cls = await page.evaluate(() => document.body.classList.contains("tablet-wheel"));
    check(`${L} not a tablet: nothing moved`, !cls && m.homes.read === "wheelIntroSettled" && m.homes.kys === "wheelIntroSettled" && m.homes.drawer === "wheelDrawerRow" && m.handles.length > 1, JSON.stringify({ cls, homes: m.homes, handles: m.handles }));
    await ctx.close();
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
