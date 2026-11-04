// QR Lead (4 Nov 2026, the Architect's ask): the Hadith Word Card (#1453) opens QR's Word card with
// ?word=S:A:W&back=1&from=hadith-<id>. The way back in the card reads "Back to the hadith" (bn: হাদিসে ফিরুন); from=dua-<n> still
// reads "Back to Dua <n>"; a plain back=1 still reads "Back". Run from the repository root, serve.js on :8080.
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error("promise"); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const CASES = [
  ["en", "from=hadith-bukhari-3199", "Back to the hadith"], ["bn", "from=hadith-bukhari-3199", "হাদিসে ফিরুন"],
  ["en", "from=dua-12", "Back to Dua 12"], ["en", "", "Back"],
];
for (const [lang, from, want] of CASES) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: 390, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => history.pushState({}, "", location.href)); // history.length > 1, as when arriving from another page
  await page.goto(`${new URL(page.url()).origin}/app/quranrevival.html?word=36:38:3&back=1${from ? "&" + from : ""}`);
  await page.waitForSelector("[data-word-card-app-back]", { timeout: 20000 }).catch(() => {});
  const txt = await page.evaluate(() => document.querySelector("[data-word-card-app-back]")?.title ?? null);
  check(`${lang} ${from || "(plain)"}: the way back reads "${want}"`, txt === want, String(txt));
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
