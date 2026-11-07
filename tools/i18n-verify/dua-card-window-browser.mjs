// D23 (the Owner, 4 Nov 2026): on a computer the Dua Card's ⤢ opens it as a movable, resizable window.
//   node tools/i18n-verify/dua-card-window-browser.mjs [--mutate=bar|zab|min|off]     (server on :8080)
//   --mutate=bar  the window's bar may leave the screen (limits.bar = 0): the "bar stays on screen" check must FAIL.
//   --mutate=zab  the bar may sink under the app's bottom (Zab) bar: the "bar can still be pressed" check must FAIL.
//   --mutate=min  no minimum size: the "minimum size" check must FAIL.
//   --mutate=off  the window never opens (the sheet is used everywhere): the 1280 checks must FAIL.
import { chromium, newContext, openPage } from "./harness.mjs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
const EDITS = {
  bar: (s) => s.replace("return 46 + zabHeight();", "return 0;"),
  zab: (s) => s.replace("return 46 + zabHeight();", "return 46;"),
  min: (s) => s.replace("{ minW: 360, minH: 260,", "{ minW: 0, minH: 0,"),
  off: (s) => s.replace("window.innerWidth >= DUA_WINDOW_MIN_WIDTH", "false"),
};
const browser = await chromium.launch();
for (const [lang, width] of [["en", 1280], ["bn", 1280], ["en", 768], ["en", 390]]) {
  const tag = `${lang} ${width}px`;
  const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
  if (MUTATE) {
    const src = (await (await fetch("http://localhost:8080/app/js/dua-card-window.js")).text());
    await ctx.route(/\/app\/js\/dua-card-window\.js(\?.*)?$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: EDITS[MUTATE](src) }));
  }
  try {
    const { page } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
    page.setDefaultTimeout(12000);
    await page.waitForSelector("[data-dua-topbar]", { timeout: 25000 });
    const rect = () => page.$eval("[data-dua-window]", (a) => { const r = a.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
    const H = await page.evaluate(() => window.innerHeight); console.log(`  (viewport ${width}×${H})`);
    await page.click("[data-dua-popout]");
    if (width < 900) {
      await page.waitForSelector(".dua-card-popped");
      check(`[${tag}] under 900px the card keeps its sheet: no floating window`, (await page.$("[data-dua-window]")) === null);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".dua-card-popped"));
      check(`[${tag}] Escape puts the sheet away`, true);
    } else {
      await page.waitForSelector("[data-dua-window]");
      const r0 = await rect();
      check(`[${tag}] ⤢ opens a window inside the screen (${r0.w}×${r0.h} at ${r0.x},${r0.y})`, r0.x >= 0 && r0.y >= 0 && r0.x + r0.w <= width && r0.y + r0.h <= H && r0.w >= 360);
      check(`[${tag}] it has a drag bar and all eight handles, and the card's own top bar inside`, await page.evaluate(() => !!document.querySelector("[data-dua-window] [data-dua-win-bar]") && document.querySelectorAll("[data-dua-window] [data-dua-win-handle]").length === 8 && !!document.querySelector("[data-dua-window] [data-dua-topbar]")));
      const bar = await page.$eval("[data-dua-win-bar]", (b) => { const q = b.getBoundingClientRect(); return { x: q.left + 60, y: q.top + 20 }; });
      await page.mouse.move(bar.x, bar.y); await page.mouse.down(); await page.mouse.move(bar.x + 120, bar.y + 80, { steps: 6 }); await page.mouse.up();
      const r1 = await rect();
      check(`[${tag}] dragging the bar moves the window by the drag (${r1.x - r0.x},${r1.y - r0.y})`, Math.abs(r1.x - r0.x - 120) <= 2 && Math.abs(r1.y - r0.y - 80) <= 2 && r1.w === r0.w);
      // Far off the bottom-right: the bar must stay on the screen.
      const b2 = await page.$eval("[data-dua-win-bar]", (b) => { const q = b.getBoundingClientRect(); return { x: q.left + 60, y: q.top + 20 }; });
      await page.mouse.move(b2.x, b2.y); await page.mouse.down(); await page.mouse.move(b2.x + 3000, b2.y + 3000, { steps: 6 }); await page.mouse.up();
      const barBox = await page.$eval("[data-dua-win-bar]", (b) => { const q = b.getBoundingClientRect(); return { top: q.top, bottom: q.bottom, left: q.left, right: q.right }; });
      check(`[${tag}] the bar stays on screen when dragged far away (bar ${Math.round(barBox.top)}–${Math.round(barBox.bottom)}, left ${Math.round(barBox.left)})`, barBox.bottom <= H && barBox.top >= 0 && barBox.left >= 0 && barBox.left < width - 20, JSON.stringify(barBox));
      check(`[${tag}] the bar can still be pressed there (nothing, not even the app's bottom bar, covers it)`, await page.$eval("[data-dua-win-bar]", (b) => { const q = b.getBoundingClientRect(); const e = document.elementFromPoint(q.left + 30, q.top + q.height / 2); return !!e && b.contains(e); }));
      // Put it back at home by dragging the bar to the top-left, then resize from the north-west corner far inwards.
      const b3 = await page.$eval("[data-dua-win-bar]", (b) => { const q = b.getBoundingClientRect(); return { x: q.left + 60, y: q.top + 20 }; });
      await page.mouse.move(b3.x, b3.y); await page.mouse.down(); await page.mouse.move(b3.x - 3000, b3.y - 3000, { steps: 6 }); await page.mouse.up();
      const r2 = await rect();
      const nw = await page.$eval('[data-dua-win-handle="nw"]', (h) => { const q = h.getBoundingClientRect(); return { x: q.left + 6, y: q.top + 6 }; });
      await page.mouse.move(nw.x, nw.y); await page.mouse.down(); await page.mouse.move(nw.x + 2000, nw.y + 2000, { steps: 8 }); await page.mouse.up();
      const r3 = await rect();
      check(`[${tag}] resizing shrinks the window and stops exactly at the minimum size (${r2.w}×${r2.h} → ${r3.w}×${r3.h})`, r3.w < r2.w && r3.h < r2.h && r3.w === 360 && r3.h === 260, JSON.stringify({ r2, r3 }));
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dua.cardWindow.v1") || "null"));
      check(`[${tag}] its place and size are remembered`, !!saved && Math.abs(saved.w - r3.w) <= 1 && Math.abs(saved.h - r3.h) <= 1, JSON.stringify(saved));
      await page.click("[data-dua-win-close]");
      await page.waitForFunction(() => !document.querySelector("[data-dua-window]"));
      check(`[${tag}] ✕ puts the card back in the page, whole (top bar and progress still there)`, await page.evaluate(() => !!document.querySelector("[data-dua-card] [data-dua-topbar]") && !!document.querySelector("[data-dua-card] [data-dua-progress]")));
      await page.click("[data-dua-popout]");
      await page.waitForSelector("[data-dua-window]");
      const r4 = await rect();
      check(`[${tag}] opened again, it comes back where it was left`, Math.abs(r4.x - r3.x) <= 1 && Math.abs(r4.y - r3.y) <= 1 && Math.abs(r4.w - r3.w) <= 1);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("[data-dua-window]"));
      check(`[${tag}] Escape closes the window`, true);
    }
  } catch (e) { fail++; console.log(`  FAIL  the walk at ${tag} stopped -- ${String(e.message).split("\n")[0]}`); }
  await ctx.close();
}
await browser.close();
console.log(`\n==== Dua card window${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
