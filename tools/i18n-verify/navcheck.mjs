import { chromium, newContext, openPage } from "./harness.mjs";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let bad = 0;
let baselined = 0;

// FIXED in v08.26, so this baseline is now EMPTY rather than deleted -- the
// mechanism stays, because the next pre-existing finding should be tolerated
// by name here rather than by making the exit code meaningless again.
//
// What it held: English "Operation" and "Bookmark" cut at 320px (73px of
// label in a 65px cell), carried for as long as this suite has run. Counting
// it made `bad` permanently 1, so the suite could never report that
// something NEW had broken; baselining it by name is what gave the exit code
// meaning back (18 Sep 2026). v08.26 then measured it properly and found the
// row was never short of space -- `.nav-cat`'s `flex: 1 1 0` was splitting it
// into four EQUAL cells, so Home held 17px it did not need while Bookmark was
// cut by 10. A content-based flex-basis below 340px fixes it with nothing
// shrunk. See app/css/shell.css.
const KNOWN_TRUNCATIONS = {};
const seenBaseline = new Set();
for (const lang of ["en", "bn"]) {
  console.log(`\n#### app language: ${lang} ####`);
  // 340 is in this list because v08.26 found it truncating too (73>70) and
  // nothing had ever measured it: the list jumped 320 -> 360 straight over
  // the widest width the defect still reached.
  for (const w of [320, 340, 360, 390, 412, 768]) {
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
    const allowed = KNOWN_TRUNCATIONS[`${lang}:${w}`] ?? [];
    const label = (t) => t.replace(/ \(\d+>\d+\)$/, "");
    const unexpected = r.truncated.filter((t) => !allowed.includes(label(t)));
    for (const t of r.truncated) if (allowed.includes(label(t))) { seenBaseline.add(`${lang}:${w}:${label(t)}`); baselined++; }
    const ok = r.lines === 1 && unexpected.length === 0 && !r.overflow && r.dockVisible;
    if (!ok) bad++;
    console.log(`  ${w}px: ${r.count} buttons on ${r.lines} line | truncated: ${r.truncated.length ? JSON.stringify(r.truncated) : "none"} | overflow ${r.overflow} | approach rows ${r.rows} | dock visible ${r.dockVisible}`);
    await page.close(); await ctx.close();
  }
}
await browser.close();
const expectedBaseline = Object.entries(KNOWN_TRUNCATIONS)
  .flatMap(([key, labels]) => labels.map((l) => `${key}:${l}`));
const gone = expectedBaseline.filter((k) => !seenBaseline.has(k));
if (baselined) console.log(`\n  (${baselined} known pre-existing truncation(s) tolerated: ${expectedBaseline.join(", ")})`);
if (gone.length) console.log(`  !! a BASELINED truncation no longer occurs: ${gone.join(", ")} -- if that is a fix, drop it from KNOWN_TRUNCATIONS`);
console.log(`\n==== ${bad === 0 ? "NAV FITS IN BOTH LANGUAGES AT EVERY WIDTH (apart from the known baseline)" : bad + " PROBLEM(S)"} ====`);
process.exit(bad === 0 ? 0 : 1);
