// v08.60 -- with "Page by page" reading on (body.read-sideways), the last line
// of a long āyah must be scrollable fully into view. `#readScroll` hides its
// own overflow in this mode, and `#studyScreen`'s `height: 100%` (content-box,
// plus 1rem padding, a border and a 0.5rem margin) made it 42px taller than
// its container, so the bottom ~10px of the final line could never be reached.
// PR #37 (Aug 2026) had reported the severe form of this trap; this is what was
// left of it. Measured on 2:282, the longest āyah.
//
// Run from the repository root with `node serve.js` running.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const vp of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    for (const fullscreenSteps of [0, 2]) {
      const ctx = await newContext(browser, { viewport: vp, appLang: lang });
      await ctx.addInitScript(() => { try { localStorage.setItem("mm_reading_sideways", "1"); } catch {} });
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForFunction(() => document.getElementById("ayahSelect")?.querySelector('option[value="282"]'), null, { timeout: 10000 });
      await page.evaluate(() => { const s = document.getElementById("ayahSelect"); s.value = "282"; s.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(500);
      const reachable = await page.evaluate(() => document.getElementById("tabReadBtn").getBoundingClientRect().width > 0);
      if (!reachable) await page.click("#tabStudyBtn");
      await page.click("#tabReadBtn");
      await page.waitForTimeout(500);
      for (let i = 0; i < fullscreenSteps; i++) { await page.click("#hideChromeBtn"); await page.waitForTimeout(300); }
      const m = await page.evaluate(async () => {
        const p = document.getElementById("ayahPanels"), rs = document.getElementById("readScroll");
        const sideways = document.body.classList.contains("read-sideways");
        p.scrollTop = p.scrollHeight;
        await new Promise((r) => setTimeout(r, 300));
        const els = [...p.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim() && e.getBoundingClientRect().height > 0);
        const lastBottom = Math.max(...els.map((e) => e.getBoundingClientRect().bottom));
        const visibleBottom = Math.min(rs.getBoundingClientRect().bottom, innerHeight);
        return { sideways, hiddenPx: Math.round(lastBottom - visibleBottom), textCount: els.length };
      });
      const label = `${lang} ${vp.width}x${vp.height} full-screen step ${fullscreenSteps}`;
      check(`${label}: "Page by page" is really on (positive control)`, m.sideways && m.textCount > 0, JSON.stringify(m));
      check(`${label}: the last line of 2:282 scrolls fully into view`, m.hiddenPx <= 0, `last line still ${m.hiddenPx}px below the visible edge`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`==== Page-by-page last line reachable (v08.60): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
