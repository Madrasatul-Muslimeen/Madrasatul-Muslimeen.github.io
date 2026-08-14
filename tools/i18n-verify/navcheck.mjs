import { chromium, newContext, openPage } from "./harness.mjs";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let bad = 0;
for (const lang of ["en", "bn"]) {
  console.log(`\n#### app language: ${lang} ####`);
  for (const w of [320, 360, 390, 412, 768]) {
    const ctx = await newContext(browser, { banner: true, appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: 844 } });
    await ctx.route("**/gtaf_bangla_timestamps.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    const r = await page.evaluate(() => {
      const cats = [...document.querySelectorAll(".nav-cat > summary")];
      const tops = new Set(cats.map((c) => Math.round(c.getBoundingClientRect().top)));
      return {
        lines: tops.size,
        count: cats.length,
        truncated: cats.filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => `${c.textContent.trim()} (${c.scrollWidth}>${c.clientWidth})`),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        rows: [...document.querySelectorAll("#wheelSidebarContainer .way-row")].filter((el) => {
          const d = document.getElementById("dock").getBoundingClientRect();
          const rr = el.getBoundingClientRect();
          return rr.height > 4 && rr.bottom <= d.top + 0.5 && rr.top >= 0;
        }).length,
        dockVisible: document.getElementById("dock").getBoundingClientRect().bottom <= window.innerHeight + 0.5,
      };
    });
    const ok = r.lines === 1 && r.truncated.length === 0 && !r.overflow && r.dockVisible;
    if (!ok) bad++;
    console.log(`  ${w}px: ${r.count} buttons on ${r.lines} line | truncated: ${r.truncated.length ? JSON.stringify(r.truncated) : "none"} | overflow ${r.overflow} | approach rows ${r.rows} | dock visible ${r.dockVisible}`);
    await page.close(); await ctx.close();
  }
}
await browser.close();
console.log(`\n==== ${bad === 0 ? "NAV FITS IN BOTH LANGUAGES AT EVERY WIDTH" : bad + " PROBLEM(S)"} ====`);
process.exit(bad === 0 ? 0 : 1);
