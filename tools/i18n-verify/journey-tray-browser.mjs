// Mapping My Journey opens as a pop-up folder tray (Siyagah port round 2,
// Owner decisions 41, 42.7). Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
const same = (a, b, tol = 2) => ["x", "y", "w", "h"].every((k) => Math.abs(a[k] - b[k]) <= tol);
async function dragBy(page, from, dx, dy) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 }); await page.mouse.up();
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const width of [320, 390, 820, 1280]) {
    const tag = `${lang} ${width}px`;
    const phone = width < 600;
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => { window.__marker = "kept"; });
    const url0 = page.url();
    await page.click("#tabJourneyBtn");
    await page.waitForSelector("#journeyTray:not([hidden])");
    const frameEl = await page.$("#journeyTray iframe");
    const frame = await frameEl.contentFrame();
    await frame.waitForSelector("#viewToggle .view-toggle-btn", { state: "visible", timeout: 15000 });
    check(`${tag}: the real dock button opens the tray`, true);
    check(`${tag}: the URL did not change and the page did not reload`,
      page.url() === url0 && (await page.evaluate(() => window.__marker)) === "kept", page.url());
    const title = await page.textContent("#journeyTray .jt-title");
    check(`${tag}: the title bar reads "Mapping My Journey" in the page language`,
      lang === "en" ? title === "Mapping My Journey" : title === "আমার যাত্রার মানচিত্র", title);
    const tabs = await frame.$$eval("#viewToggle .view-toggle-btn", (b) => b.map((x) => x.dataset.view));
    check(`${tag}: Folders | Timeline | Path are the tabs`, tabs.join() === "folders,timeline,path", tabs.join());
    await frame.click('.view-toggle-btn[data-view="timeline"]');
    await frame.waitForFunction(() => getComputedStyle(document.getElementById("viewTimeline")).display !== "none");
    await frame.click('.view-toggle-btn[data-view="path"]');
    await frame.waitForFunction(() => getComputedStyle(document.getElementById("viewPath")).display !== "none");
    check(`${tag}: switching tabs works inside the tray`, true);
    const embed = await frame.evaluate(() => ({
      h1: getComputedStyle(document.querySelector("h1")).display, nav: getComputedStyle(document.getElementById("topNav")).display,
      back: getComputedStyle(document.getElementById("backLink")).display,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    check(`${tag}: embed mode hides the page header, nav and Back`, embed.h1 === "none" && embed.nav === "none" && embed.back === "none", JSON.stringify(embed));
    check(`${tag}: no horizontal scroll inside the tray`, !embed.overflow);

    const t0 = await box(page, "#journeyTray");
    const close = await page.evaluate(() => {
      const b = document.querySelector(".jt-close"), r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { w: r.width, h: r.height, top: hit === b };
    });
    check(`${tag}: ✕ is at least 40px and the topmost element at its centre`, close.w >= 40 && close.h >= 40 && close.top, JSON.stringify(close));

    if (phone) {
      check(`${tag}: the tray fills the screen`, same(t0, { x: 0, y: 0, w: width, h: 800 }), JSON.stringify(t0));
      const handles = await page.$$eval(".jt-h", (h) => h.map((x) => getComputedStyle(x).display));
      check(`${tag}: no resize handles on a phone`, handles.every((d) => d === "none"));
      const bar = await box(page, ".jt-bar");
      await dragBy(page, { x: bar.x + 60, y: bar.y + 20 }, 50, 50);
      check(`${tag}: the title bar does not drag on a phone`, same(await box(page, "#journeyTray"), t0));
    } else {
      // Drag the title bar
      const bar = await box(page, ".jt-bar");
      await dragBy(page, { x: bar.x + 60, y: bar.y + 20 }, 40, 30);
      const t1 = await box(page, "#journeyTray");
      check(`${tag}: dragging the title bar moves the window`, Math.abs(t1.x - t0.x - 40) <= 2 && Math.abs(t1.y - t0.y - 30) <= 2 && t1.w === t0.w && t1.h === t0.h, JSON.stringify([t0, t1]));
      // Put it back so every handle is on screen for the resize checks.
      await dragBy(page, { x: bar.x + 100, y: bar.y + 50 }, -40, -30);
      // Each handle changes only the right edges
      const expect = {
        e: (a, b) => b.w - a.w === 40 && b.x === a.x && b.y === a.y && b.h === a.h,
        s: (a, b) => b.h - a.h === 30 && b.x === a.x && b.y === a.y && b.w === a.w,
        se: (a, b) => b.w - a.w === 40 && b.h - a.h === 30 && b.x === a.x && b.y === a.y,
        w: (a, b) => a.w - b.w === 40 && b.x - a.x === 40 && b.y === a.y && b.h === a.h,
        n: (a, b) => a.h - b.h === 30 && b.y - a.y === 30 && b.x === a.x && b.w === a.w,
        nw: (a, b) => a.w - b.w === 40 && b.x - a.x === 40 && a.h - b.h === 30 && b.y - a.y === 30,
        ne: (a, b) => b.w - a.w === 40 && a.h - b.h === 30 && b.y - a.y === 30 && b.x === a.x,
        sw: (a, b) => a.w - b.w === 40 && b.x - a.x === 40 && b.h - a.h === 20 && b.y === a.y,
      };
      const dxy = { e: [40, 0], s: [0, 30], se: [40, 30], w: [40, 0], n: [0, 30], nw: [40, 30], ne: [40, -30].map((v, i) => (i ? 30 : v)), sw: [40, 20] };
      // ne: east grows by +40, north shrinks by moving DOWN 30 (dy +30)
      dxy.ne = [40, 30];
      // handles: drag from the middle of each handle so the grab area is a real hit
      for (const h of Object.keys(expect)) {
        const before = await box(page, "#journeyTray");
        const hb = await box(page, `.jt-h[data-h="${h}"]`);
        check(`${tag}: handle ${h} is at least 12px to grab`, Math.min(hb.w, hb.h) >= 12 || (h.length === 2 && Math.min(hb.w, hb.h) >= 12), JSON.stringify(hb));
        const cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
        // the point must really hit the handle
        const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.dataset?.h || "", [cx, cy]);
        check(`${tag}: handle ${h} is what is under the pointer at its centre`, hit === h, hit);
        await dragBy(page, { x: cx, y: cy }, dxy[h][0], dxy[h][1]);
        const after = await box(page, "#journeyTray");
        check(`${tag}: dragging handle ${h} changes the right edges and nothing else`, expect[h](before, after), JSON.stringify([before, after]));
      }
      // Minimum size
      let hb = await box(page, '.jt-h[data-h="se"]');
      await dragBy(page, { x: hb.x + 6, y: hb.y + 6 }, -2000, -2000);
      const small = await box(page, "#journeyTray");
      check(`${tag}: the window cannot shrink below about 320×360`, small.w >= 320 && small.h >= 360, JSON.stringify(small));
      // Title bar cannot leave the screen
      const bar2 = await box(page, ".jt-bar");
      await dragBy(page, { x: bar2.x + 60, y: bar2.y + 20 }, 5000, 5000);
      const off = await box(page, "#journeyTray");
      check(`${tag}: the title bar cannot be dragged off screen`, off.y + 44 <= 800 && off.x < width && off.y >= 0, JSON.stringify(off));
      const bar3 = await box(page, ".jt-bar");
      await dragBy(page, { x: bar3.x + 60, y: bar3.y + 20 }, -5000, -5000);
      const off2 = await box(page, "#journeyTray");
      check(`${tag}: ... nor off the top or left`, off2.y >= 0 && off2.x >= 0, JSON.stringify(off2));
      // Remembered
      const before = await box(page, "#journeyTray");
      await page.click(".jt-close");
      check(`${tag}: ✕ closes it`, await page.evaluate(() => document.getElementById("journeyTray").hidden));
      await page.click("#tabJourneyBtn");
      await page.waitForSelector("#journeyTray:not([hidden])");
      check(`${tag}: reopened, it is in the same place and size`, same(before, await box(page, "#journeyTray")), JSON.stringify(before));
      const stored = await page.evaluate(() => localStorage.getItem("mmsa-journey-tray"));
      check(`${tag}: position is kept in localStorage (mmsa-journey-tray)`, !!stored && !!JSON.parse(stored).w, stored);
    }
    await page.keyboard.press("Escape");
    check(`${tag}: Esc closes it`, await page.evaluate(() => document.getElementById("journeyTray").hidden));
    check(`${tag}: underneath, no reload and no navigation`, page.url() === url0 && (await page.evaluate(() => window.__marker)) === "kept");
    await ctx.close();
  }
}

// The plain link keeps working when the tray module is absent.
{
  const ctx = await newContext(browser, { viewport: { width: 820, height: 800 } });
  await ctx.route("**/js/journey-tray.js", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.click("#tabJourneyBtn");
  await page.waitForURL(/journey-map\.html#folders/, { timeout: 10000 }).catch(() => {});
  check("tray module absent: the dock button still opens the full page", /journey-map\.html#folders/.test(page.url()), page.url());
  await ctx.close();
}
// Opened directly as a full page (new tab): header and nav are present.
{
  const ctx = await newContext(browser, { viewport: { width: 820, height: 800 } });
  const { page } = await openPage(ctx, "/app/journey-map.html#folders");
  const d = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector("h1")).display, tray: !!document.getElementById("journeyTray") }));
  check("full page: header shows and no tray exists", d.h1 !== "none" && !d.tray, JSON.stringify(d));
  await ctx.close();
}
// A nav link opens the tray.
{
  const ctx = await newContext(browser, { viewport: { width: 1280, height: 800 } });
  const { page } = await openPage(ctx, "/app/notes.html");
  const url0 = page.url();
  const n = await page.evaluate(() => { const a = [...document.querySelectorAll('a[href$="journey-map.html"]')][0]; return !!a; });
  if (n) {
    await page.evaluate(() => { document.querySelector('a[href$="journey-map.html"]').click(); });
    await page.waitForSelector("#journeyTray:not([hidden])", { timeout: 5000 }).catch(() => {});
    check("nav link opens the tray without navigating", page.url() === url0 && await page.evaluate(() => !document.getElementById("journeyTray")?.hidden), page.url());
  } else check("nav link to Mapping My Journey exists on notes.html", false);
  await ctx.close();
}

await browser.close();
console.log(`\n==== Journey tray: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
