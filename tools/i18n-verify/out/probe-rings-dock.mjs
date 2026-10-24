import { chromium, newContext, openPage } from "../harness.mjs";
const claim = (tid, st, unitType = "ayah") => `{ unitType: "${unitType}", subjectId: "quran", trackableId: "${tid}", claimedStatus: "${st}", confirmedStatus: null, confirmState: "pending" }`;
const SEED = `
for (const id of ["recite", "tajweed"]) DATA.trackables.find((t) => t._id === TENANT_ID + "__" + id).countsForEachAyah = true;
DATA.trackables.find((t) => t._id === TENANT_ID + "__memorise").countsForEachAyah = false;
DATA.records.push(
  { _id: TENANT_ID + "__p1__surah_2", tenantId: TENANT_ID, personId: "p1", entries: {
    "ayah:2:254::recite": ${claim("recite", "achieved")},
    "surah:2::memorise": ${claim("memorise", "learning", "surah")},
  } }
);
`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const [w, h] of [[768, 1024], [1100, 800]]) {
  const ctx = await newContext(browser, { viewport: { width: w, height: h }, extraSeedJs: SEED });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForSelector("#wheelContainer svg", { timeout: 20000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  for (const wait of [0, 1500]) {
    await page.waitForTimeout(wait);
    const r = await page.evaluate(() => {
      const q = (s) => {
        const e = document.querySelector(s);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right)];
      };
      const b = document.querySelector('[data-wheel-drawer="unit"]').getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { btn: q('[data-wheel-drawer="unit"]'), dock: q("#dock"), hit: hit && (hit.id || hit.className || hit.tagName), scrollY: scrollY };
    });
    console.log(w, h, wait, JSON.stringify(r));
  }
  await ctx.close();
}
await browser.close();
