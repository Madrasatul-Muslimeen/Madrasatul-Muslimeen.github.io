// MSA · QR J126 -- the study titles in the Word Card's status box (WbW:, Root:, Family:, Taṣrīf:, Depth:) are bright: each is
// its own .word-progress-level-title, bold, a colour distinct from the sentence text, and readable (contrast >= 4.5:1) on the
// box in BOTH card looks. Run from the repo root, serve.js on :8080.  [--mutate=plain]  (titles lose their class -> FAIL)
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
const MUTATE = process.argv.includes("--mutate=plain");
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const look of ["night", "light"]) for (const lang of ["en", "bn"]) for (const width of [320, 390, 1280]) {
  const tag = `[${look} ${lang} ${width}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) await ctx.route("**/app/js/quran-word-card.js*", (r) => { const s = fs.readFileSync("app/js/quran-word-card.js", "utf8").split('class="word-progress-level-title"').join('class="x"'); r.fulfill({ status: 200, contentType: "text/javascript", body: s }); });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate((l) => document.documentElement.setAttribute("data-card-look", l), look);
  await page.waitForTimeout(500);
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="1"]')?.click());
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector(".word-progress-whole-quran"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const rows = [...document.querySelectorAll(".word-progress-whole-quran")]; const box = document.querySelector(".word-progress-whole-quran-box");
    const titles = rows.map((r) => r.querySelector(".word-progress-level-title")); const bg = box ? getComputedStyle(box).backgroundColor : "rgb(0,0,0)";
    return { rows: rows.length, withTitle: titles.filter(Boolean).length, bold: titles.every((t) => t && Number(getComputedStyle(t).fontWeight) >= 700),
      differs: titles.every((t, i) => t && getComputedStyle(t).color !== getComputedStyle(rows[i]).color),
      minContrast: Math.min(...titles.filter(Boolean).map((t) => ratio(getComputedStyle(t).color, bg))), names: titles.map((t) => t?.textContent) };
  });
  check(`${tag} five study titles, each its own span`, m.rows >= 5 && m.withTitle === m.rows, JSON.stringify(m));
  check(`${tag} bold and a different colour from the sentence`, m.bold && m.differs, JSON.stringify(m));
  check(`${tag} contrast >= 4.5 on the box`, m.minContrast >= 4.5, String(m.minContrast));
  if (width === 390 && lang === "en") { await page.evaluate(() => document.querySelector(".word-progress-whole-quran")?.scrollIntoView({ block: "center" })); await page.screenshot({ path: `/tmp/j126-${look}.png` }); }
  await page.close(); await ctx.close();
}
await browser.close();
console.log(`\n==== J126 level titles${MUTATE ? " [mutated: plain]" : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
