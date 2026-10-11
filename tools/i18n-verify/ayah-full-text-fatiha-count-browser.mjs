// Owner, 11 Oct 2026 (screenshot: the Āyah card's 📖 Full text showed the Bismillah with ١ / 1 / ১ badges).
// The full-text pop-up follows the reader's Al-Fātiḥah count (decision 55) as the Read view does: the
// Bismillah unnumbered, ٱلْحَمْدُ numbered 1, and stored 1:7 shown as its two halves 6 and 7.
// With the setting OFF, the stored count is shown (Bismillah = 1). Expected values are written by hand.
// Run from the repository root, with serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const setSelect = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);

const badges = (page) => page.evaluate(() => {
  const box = document.querySelector("#ayahNoteViewPopup:not([hidden]) .ayah-nv-box");
  if (!box) return null;
  return {
    ref: box.querySelector(".ayah-nv-ref")?.textContent.trim(),
    nums: [...box.querySelectorAll(".ayah-num-badge")].map((b) => b.textContent.trim()),
    en: box.querySelector(".ayah-translation:not(.ayah-translation-bn)")?.textContent.trim(),
    wbw: box.querySelectorAll(".wbw-word").length,
  };
});
const step = async (page, dir) => {
  const before = await page.evaluate(() => document.querySelector("#ayahNoteViewPopup .ayah-nv-ref")?.textContent ?? "");
  await page.click(`#ayahNoteViewPopup [data-ayah-nv-step]${dir < 0 ? ":first-child" : ":not(:first-child)"}`);
  await page.waitForFunction((r) => (document.querySelector("#ayahNoteViewPopup .ayah-nv-ref")?.textContent ?? "") !== r && document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec").length >= 3, before, { timeout: 8000 }).catch(() => {});
};

for (const on of [true, false]) for (const width of [390, 1280]) {
  const tag = `[count ${on ? "on" : "off"} ${width}]`;
  console.log(`\n=== Full text pop-up, Al-Fātiḥah ${tag} ===`);
  const ctx = await newContext(browser, { appLang: "en", banner: false, viewport: { width, height: width >= 768 ? 1000 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate((o) => { const t = document.getElementById("fatihaCountToggle"); if (t.checked !== o) { t.checked = o; t.dispatchEvent(new Event("change", { bubbles: true })); } }, on);
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((el) => el.remove()));
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await setSelect(page, "surahSelect", 1);
  await page.waitForFunction(() => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:1:"]'), null, { timeout: 10000 }).catch(() => {});
  await setSelect(page, "ayahSelect", 2);
  await page.waitForFunction(() => document.querySelector('[data-ayah-num-badge="1:2"]'), null, { timeout: 8000 }).catch(() => {});
  // Open the Āyah card on stored 1:2 (its number badge), then its 📖 Full text.
  await page.evaluate(() => document.querySelector('[data-ayah-num-badge="1:2"]')?.click());
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => !!document.querySelector("[data-ayah-sheet-noteview]"));
  check(`${tag} the Āyah card opened on stored 1:2`, opened);
  await page.click("[data-ayah-sheet-noteview]");
  await page.waitForFunction(() => document.querySelectorAll("#ayahNoteViewPopup .ayah-nv-sec").length >= 3, null, { timeout: 8000 }).catch(() => {});
  const a2 = await badges(page);
  check(`${tag} ٱلْحَمْدُ is numbered ${on ? "1" : "2"} in all three blocks`, !!a2 && JSON.stringify(a2.nums) === JSON.stringify(on ? ["١", "1", "১"] : ["٢", "2", "২"]), JSON.stringify(a2));

  await step(page, -1);
  const b = await badges(page);
  if (on) check(`${tag} the Bismillah carries NO number badge, and is titled Bismillah`, !!b && b.nums.length === 0 && /^Bismillah$/.test(b.ref), JSON.stringify(b));
  else check(`${tag} with the count off the Bismillah is stored 1:1 and numbered 1`, !!b && JSON.stringify(b.nums) === JSON.stringify(["١", "1", "১"]), JSON.stringify(b));

  // Forward to the end of the surah: on = halves 6 then 7 (4 and 5 words); off = stored 1:7 whole (9 words).
  for (let i = 0; i < 6; i++) await step(page, 1);
  const s6 = await badges(page);
  if (on) {
    check(`${tag} the sixth step shows displayed 6: four words, the first half of the translation`, !!s6 && JSON.stringify(s6.nums) === JSON.stringify(["٦", "6", "৬"]) && s6.wbw === 4 && s6.en === "The path of those upon whom You have bestowed favor,", JSON.stringify(s6));
    await step(page, 1);
    const s7 = await badges(page);
    check(`${tag} the next is displayed 7: five words, starting at غَيْرِ, the second half`, !!s7 && JSON.stringify(s7.nums) === JSON.stringify(["٧", "7", "৭"]) && s7.wbw === 5 && s7.en === "not of those who have evoked [Your] anger or of those who are astray.", JSON.stringify(s7));
  } else {
    check(`${tag} the sixth step is stored 1:7, whole: nine words`, !!s6 && JSON.stringify(s6.nums) === JSON.stringify(["٧", "7", "৭"]) && s6.wbw === 9, JSON.stringify(s6));
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
