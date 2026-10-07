// Owner decision 43 (1 Oct 2026), a screenshot of Explore → Asma ul Husna:
//   "Name column should move after 'Group'. Then, the Name poster should appear
//    in the space marked on selection of individual name."
// Expected values written BY HAND. Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const SHOT_DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

for (const lang of ["en", "bn"]) {
  for (const width of [390, 768, 1300]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
    await page.click("#tabExploreBtn");
    await page.waitForTimeout(700);
    await page.click("#explorePaletteAsmaBtn");
    await page.waitForFunction(() => document.querySelectorAll("select[data-asmax-class-select]").length >= 2 && document.querySelectorAll("#asmaXSingleSelect option").length > 1, null, { timeout: 8000 }).catch(() => {});
    const tag = `[${lang} ${width}]`;

    // 1. The bar: Group, then Names, then every other classification, then ⋯.
    const order = await page.evaluate(() => [...document.getElementById("asmaXLevelBar").children]
      .filter((el) => el.tagName === "SELECT" || el.matches('[data-bar-palette-wrap="asmax"]'))
      .map((el) => el.dataset.asmaxClassSelect || (el.id === "asmaXSingleSelect" ? "NAMES" : "MORE")));
    check(`${tag} the bar reads Group, Names, then the other classifications, then ⋯`,
      order[0] === "group" && order[1] === "NAMES" && order.at(-1) === "MORE" && order.includes("dual") && order.indexOf("dual") > 1, JSON.stringify(order));
    const rowTops = await page.evaluate(() => {
      const g = document.querySelector('select[data-asmax-class-select="group"]').getBoundingClientRect(), n = document.getElementById("asmaXSingleSelect").getBoundingClientRect();
      return { sameRow: Math.abs(g.top - n.top) < 4, nAfterG: n.left >= g.right - 1 };
    });
    check(`${tag} on screen, Names sits right after Group on the same row`, rowTops.sameRow && rowTops.nAfterG, JSON.stringify(rowTops));

    // 2. Choose Name #1 from the Names picker: its poster fills the wheel's space.
    await page.selectOption("#asmaXSingleSelect", "1");
    await page.waitForFunction(() => !!document.getElementById("asmaXPosterPanel"), null, { timeout: 6000 }).catch(() => {});
    const p = await page.evaluate(() => {
      const panel = document.getElementById("asmaXPosterPanel"), wheel = document.getElementById("asmaXWheelContainer");
      if (!panel) return null;
      const r = panel.getBoundingClientRect(), w = wheel.getBoundingClientRect();
      return { inWheelSpace: wheel.contains(panel), w: Math.round(r.width), h: Math.round(r.height), shown: r.width > 0 && r.height > 0,
        // Updated in place 7 Oct 2026: the true-copy poster (decision 85) marks its Arabic [data-poster-arabic].
        ar: (panel.querySelector("[data-poster-arabic]") ?? panel.querySelector(".poster-ar"))?.textContent.trim(),
        inside: r.left >= w.left - 1 && r.right <= w.right + 1,
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth, hint: document.getElementById("asmaXHint")?.textContent.trim() };
    });
    // Updated in place 7 Oct 2026 (decision 85): the poster writes the archive poster's Arabic, الرَّحْمٰنُ.
    check(`${tag} choosing Ar-Rahman shows its poster in the wheel's space, Arabic "الرَّحْمٰنُ"`, !!p && p.inWheelSpace && p.shown && /الرَّحْم/.test(p.ar ?? ""), JSON.stringify(p));
    check(`${tag} the poster fits its space (no wider than it), no sideways scroll`, !!p && p.inside && p.w <= 320 && p.over <= 0, JSON.stringify(p));
    check(`${tag} the hint says to tap the poster`, p?.hint === (lang === "bn" ? "পোস্টারটি বড় করে দেখতে ট্যাপ করুন।" : "Tap the poster to see it full size."), p?.hint);
    if (width === 1300 && lang === "en" || width === 390 && lang === "bn") await page.screenshot({ path: `${SHOT_DIR}/asma-explore-poster-${lang}-${width}.png` });
    await page.click("#asmaXPosterPanel").catch(() => {});
    await page.waitForTimeout(300);
    // Updated in place 7 Oct 2026 (decision 85): the full-size poster is .ahp-standalone.
    const open = await page.evaluate(() => !!document.querySelector("#asmaXPosterOverlay.open .ahp-standalone"));
    check(`${tag} tapping the poster opens it full size`, open);
    await ctx.close();
  }
}
console.log(`\n==== Asma Explore: Name after Group, poster in the wheel space (decision 43): ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
