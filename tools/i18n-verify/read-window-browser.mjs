// The Ayah window (the Owner, 5 Oct 2026; demo docs/reference/2026-10-05-ayah-window-demo.html):
// on a PC the Read view can float as a window -- 🗗 in the read bar, a title bar to
// move it, eight handles and a gold corner to resize it, ⛶ / double-click to fill
// the screen, ⧉ smaller, ⊡ back in the page, ✕ close. Always inside the screen.
// Opt-in and remembered per device; never a window below 900px.
// en and bn; 1280 (and 900 / 1024 for the read bar's room), 390.
// Expected values are written by hand. Run from the repository root with `node serve.js` running.
//   --mutate=clamp   the window may leave the screen          -> "inside the screen" checks fail
//   --mutate=optin   the window is on before 🗗 is pressed    -> "unchanged until 🗗" fails
//   --mutate=phone   a phone gets the window too              -> the 390 checks fail
//   --mutate=surface the window takes the dark card surface    -> the Night contrast check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ONLY = (process.argv.find((a) => a.startsWith("--lang=")) || "").slice(7);
async function routeMutation(ctx) {
  if (!MUTATE) return;
  if (MUTATE === "surface") {
    const html = fs.readFileSync("app/quranrevival.html", "utf8");
    const from = "background: #fff; border: 1px solid #cfc6b2;";
    if (!html.includes(from)) throw new Error("mutation anchor missing");
    await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html.replace(from, "background: var(--card-bg); color: var(--card-text); border: 1px solid #cfc6b2;") }));
    return;
  }
  const swaps = {
    clamp: ["export function clampInside(r) {", "export function clampInside(r) { return r;"],
    optin: ["let on = stored.on === true;", "let on = stored.on !== false;"],
    phone: ["const WINDOW_FROM = 900;", "const WINDOW_FROM = 0;"],
  }[MUTATE];
  if (!swaps) throw new Error(`unknown mutation ${MUTATE}`);
  const src = fs.readFileSync("app/js/read-window.js", "utf8");
  if (!src.includes(swaps[0])) throw new Error("mutation anchor missing");
  await ctx.route("**/js/read-window.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.replace(swaps[0], swaps[1]) }));
}
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, shown: getComputedStyle(e).display !== "none" && r.width > 0, pos: getComputedStyle(e).position }; }, sel);
const windowed = (page) => page.evaluate(() => document.body.classList.contains("read-windowed"));
async function openRead(page) {
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForFunction(() => !document.getElementById("readView").hidden, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}
const inside = (r, vw, vh) => r && r.l >= 0 && r.t >= 0 && r.r <= vw + 0.5 && r.b <= vh + 0.5;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const lang of ["en", "bn"].filter((l) => !ONLY || l === ONLY)) {
  // ---------------- PC ----------------
  {
    const tag = `${lang}/1280`;
    console.log(`\n=== ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: 1280, height: 860 } });
    await routeMutation(ctx);
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(600);
    await openRead(page);
    const docked = await rect(page, "#readView");
    check(`${tag}: the Read view is unchanged until 🗗 is pressed`, !(await windowed(page)) && docked.pos !== "fixed", JSON.stringify(docked));
    const pop = await rect(page, "#readWindowBtn");
    check(`${tag}: 🗗 is in the read bar`, pop?.shown && pop.w >= 35 && pop.h >= 35, JSON.stringify(pop));
    if (lang === "bn") check(`${tag}: 🗗's name is in Bangla`, /[ঀ-৿]/.test(await page.getAttribute("#readWindowBtn", "aria-label") ?? ""), await page.getAttribute("#readWindowBtn", "aria-label"));
    await page.click("#readWindowBtn");
    await page.waitForTimeout(200);
    let r = await rect(page, "#readView");
    check(`${tag}: 🗗 makes it a window, smaller than the screen and inside it`, (await windowed(page)) && r.pos === "fixed" && r.w < 1280 && r.h < 860 && inside(r, 1280, 860), JSON.stringify(r));
    // A PALETTE BELONGS TO A SURFACE: the window must keep the reading's own light surface in both looks.
    for (const look of ["night", "light"]) {
      await page.evaluate((lk) => document.documentElement.setAttribute("data-card-look", lk), look);
      const c = await page.evaluate(() => {
        const lum = (rgb) => { const m = rgb.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
        const bgOf = (el) => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(b)) return b; el = el.parentElement; } return "rgb(255, 255, 255)"; };
        const els = [...document.querySelectorAll("#readScroll p, #readScroll span, #readScroll div")].filter((e) => e.childElementCount === 0 && e.textContent.trim().length > 3 && e.getBoundingClientRect().width > 0);
        let worst = 99, what = "";
        for (const e of els.slice(0, 120)) { const a = lum(getComputedStyle(e).color), b = lum(bgOf(e)); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (r < worst) { worst = r; what = e.textContent.trim().slice(0, 30); } }
        return { worst, what, n: els.length };
      });
      check(`${tag} ${look}: every text in the window's reading is readable (contrast 3:1 or more)`, c.n > 0 && c.worst >= 3, JSON.stringify(c));
    }
    const bar = await rect(page, "#readWinBar");
    check(`${tag}: the window has its title bar, naming the reading`, bar?.shown && Math.abs(bar.t - r.t) < 3 && (await page.textContent("#readWinTitle")).trim().length > 0, `${JSON.stringify(bar)} "${await page.textContent("#readWinTitle")}"`);
    const small = await page.evaluate(() => [...document.querySelectorAll("#readWinBar button")].map((b) => b.getBoundingClientRect()).filter((x) => x.width < 39.5 || x.height < 39.5).length);
    check(`${tag}: the title bar's buttons are 40px`, small === 0);
    check(`${tag}: the read bar and the reading are inside the window`, await page.evaluate(() => { const v = document.getElementById("readView").getBoundingClientRect(); return ["readBar", "readScroll"].every((id) => { const x = document.getElementById(id).getBoundingClientRect(); return x.width > 0 && x.left >= v.left - 1 && x.right <= v.right + 1 && x.top >= v.top - 1 && x.bottom <= v.bottom + 1; }); }));
    // move
    let r0 = r;
    await page.mouse.move(r0.l + 120, r0.t + 22); await page.mouse.down(); await page.mouse.move(r0.l + 20, r0.t + 72, { steps: 6 }); await page.mouse.up();
    r = await rect(page, "#readView");
    check(`${tag}: dragging the title bar moves the window`, Math.abs(r.l - (r0.l - 100)) < 3 && Math.abs(r.t - (r0.t + 50)) < 3, `${JSON.stringify(r0)} -> ${JSON.stringify(r)}`);
    // resize from the gold corner
    r0 = r;
    const se = await rect(page, '#readView .read-win-h[data-h="se"]');
    check(`${tag}: the gold corner is there, 30px`, se?.shown && se.w >= 29 && Math.abs(se.r - r0.r) < 2 && Math.abs(se.b - r0.b) < 2, JSON.stringify(se));
    await page.mouse.move(se.l + 15, se.t + 15); await page.mouse.down(); await page.mouse.move(se.l + 95, se.t + 55, { steps: 6 }); await page.mouse.up();
    r = await rect(page, "#readView");
    check(`${tag}: the corner resizes it`, Math.abs(r.w - (r0.w + 80)) < 3 && Math.abs(r.h - (r0.h + 40)) < 3, `${JSON.stringify(r0)} -> ${JSON.stringify(r)}`);
    // never off the screen
    r0 = r;
    await page.mouse.move(r0.l + 120, r0.t + 22); await page.mouse.down(); await page.mouse.move(r0.l + 2000, r0.t + 2000, { steps: 4 }); await page.mouse.up();
    r = await rect(page, "#readView");
    check(`${tag}: dragged far away, it stays inside the screen`, inside(r, 1280, 860), JSON.stringify(r));
    // controls inside still work
    const a0 = await page.evaluate(() => document.getElementById("ayahSelect").value);
    await page.click("#nextUnitBtn", { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(400);
    const a1 = await page.evaluate(() => document.getElementById("ayahSelect").value);
    check(`${tag}: the read bar's own buttons still work in the window (⏭ next)`, Number(a1) === Number(a0) + 1 && await windowed(page), `${a0} -> ${a1}`);
    // ⛶ and double-click
    await page.click("#readWinFullBtn");
    r = await rect(page, "#readView");
    check(`${tag}: ⛶ fills the screen`, Math.abs(r.l) < 1 && Math.abs(r.t) < 1 && Math.abs(r.w - 1280) < 1 && Math.abs(r.h - 860) < 1 && await page.getAttribute("#readWinFullBtn", "aria-pressed") === "true", JSON.stringify(r));
    check(`${tag}: …with no resize handles while full`, !(await rect(page, '#readView .read-win-h[data-h="se"]'))?.shown);
    await page.click("#readWinFullBtn");
    const back = await rect(page, "#readView");
    check(`${tag}: ⛶ again gives the window back`, back.w < 1280 && inside(back, 1280, 860));
    await page.dblclick("#readWinTitle");
    r = await rect(page, "#readView");
    check(`${tag}: double-clicking the title fills the screen too`, Math.abs(r.w - 1280) < 1);
    await page.click("#readWinSmallerBtn");
    r = await rect(page, "#readView");
    check(`${tag}: ⧉ makes it smaller, centred`, r.w <= 761 && r.w >= 480 && Math.abs((r.l + r.r) / 2 - 640) < 2 && inside(r, 1280, 860), JSON.stringify(r));
    // the browser window gets smaller
    await page.setViewportSize({ width: 1000, height: 640 });
    await page.waitForTimeout(250);
    r = await rect(page, "#readView");
    check(`${tag}: when the browser shrinks, the window stays inside`, inside(r, 1000, 640), JSON.stringify(r));
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.waitForTimeout(250);
    check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // ✕ closes the Read view; opening Read again remembers the window
    await page.click("#readWinCloseBtn");
    await page.waitForTimeout(250);
    check(`${tag}: ✕ closes the Read view`, await page.evaluate(() => document.getElementById("readView").hidden) && !(await windowed(page)));
    await openRead(page);
    check(`${tag}: opening Read again, it is still a window (remembered)`, await windowed(page));
    await page.reload(); await page.waitForTimeout(800); await openRead(page);
    check(`${tag}: …also after a reload`, await windowed(page));
    // ⊡ puts it back in the page, and that is remembered
    await page.click("#readWinDockBtn");
    await page.waitForTimeout(200);
    r = await rect(page, "#readView");
    check(`${tag}: ⊡ puts it back in the page exactly as before`, !(await windowed(page)) && r.pos !== "fixed" && Math.abs(r.w - docked.w) < 1 && Math.abs(r.h - docked.h) < 1 && Math.abs(r.t - docked.t) < 1, `${JSON.stringify(docked)} vs ${JSON.stringify(r)}`);
    check(`${tag}: …with no geometry left on it`, await page.evaluate(() => ["left", "top", "width", "height"].every((p) => !document.getElementById("readView").style.getPropertyValue(p))));
    await page.reload(); await page.waitForTimeout(800); await openRead(page);
    check(`${tag}: …and stays in the page after a reload`, !(await windowed(page)));
    check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
  // ---------------- the read bar still fits, with 🗗 added ----------------
  for (const width of [900, 1024, 1280]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 800 } });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openRead(page);
    const m = await page.evaluate(() => { const b = document.getElementById("readBar"); const btn = document.getElementById("readWindowBtn").getBoundingClientRect(); const br = b.getBoundingClientRect(); return { over: b.scrollWidth - b.clientWidth, inBar: btn.left >= br.left - 1 && btn.right <= br.right + 1 && btn.width > 0 }; });
    check(`${lang}/${width}: the read bar does not overflow, and 🗗 sits inside it`, m.over <= 1 && m.inBar, JSON.stringify(m));
    await ctx.close();
  }
  // ---------------- phone ----------------
  {
    const tag = `${lang}/390`;
    console.log(`\n=== ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang, viewport: { width: 390, height: 844 } });
    await routeMutation(ctx);
    await ctx.addInitScript(() => { try { localStorage.setItem("mmsa-read-window", JSON.stringify({ on: true, rect: { x: 10, y: 10, w: 600, h: 500 } })); } catch {} });
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.waitForTimeout(600);
    await openRead(page);
    check(`${tag}: no 🗗 on a phone`, !(await rect(page, "#readWindowBtn"))?.shown);
    const r = await rect(page, "#readView");
    check(`${tag}: never a window on a phone, even with the PC's choice stored`, !(await windowed(page)) && r.pos !== "fixed" && !(await rect(page, "#readWinBar"))?.shown, JSON.stringify(r));
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
