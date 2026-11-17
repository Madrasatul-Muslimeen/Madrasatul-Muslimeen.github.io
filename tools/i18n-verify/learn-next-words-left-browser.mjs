// The Owner, 17 Nov 2026 (Vocab list, "Enable Words remain to learn from the chosen ranges here in the marked place"): beside
// "Hide words I know (N known)" the sheet says how many words of the CHOSEN range are still to learn.
//   node tools/i18n-verify/learn-next-words-left-browser.mjs [--mutate=noleft|wholelist|inlabel]   (repo root, serve.js on :8080)
//   --mutate=noleft     the line is not drawn                          -> "the words-left line is there" FAILS
//   --mutate=wholelist  it counts every unknown word of the list       -> "First 500, only the new 200: 200 left" FAILS
//   --mutate=inlabel    the count sits inside the checkbox's label      -> "a tap on the count leaves the checkbox alone" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/quranrevival.html";
const MUT = {
  noleft: [F, "${range ? (() => { const left = rows.reduce(", "${false ? (() => { const left = rows.reduce("],
  inlabel: [F, '</span></label>${range ? (() => { const left', '</span>${range ? (() => { const left'],
  wholelist: [F, "r.r >= range.from && r.r <= range.to && !lnIsKnown(r) ? 1 : 0", "!lnIsKnown(r) ? 1 : 0"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const sleep = (p, ms) => p.waitForTimeout(ms);
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `[${w}]`;
  const ctx = await newContext(browser, { banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [file, a, b] = MUT[MUTATE]; await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.split(a).join(b) }); }); }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 500);
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
  const left = () => page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-left]")?.textContent.trim() ?? null);
  const tile = async (n) => { await page.evaluate((n) => document.querySelector(`#learnNextSheet [data-ln-tile="${n}"]`)?.click(), n); await sleep(page, 400); };
  await tile(500);
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-new="1"]')?.click()); await sleep(page, 400);
  const l1 = await left();
  check(`${tag} the words-left line is there (First 500)`, !!l1, String(l1));
  check(`${tag} First 500, only the new 200: 200 left`, /^200 words left to learn in this range$/.test(l1 ?? ""), String(l1));
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-new="0"]')?.click()); await sleep(page, 400);
  const l2 = await left();
  check(`${tag} First 500, All 500: 500 left`, /^500 words left to learn in this range$/.test(l2 ?? ""), String(l2));
  // Codex review (17 Nov 2026): a tap on the count must NOT toggle "Hide words I know" (it had sat inside the label).
  const before = await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-hide]")?.checked);
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-left]")?.click()); await sleep(page, 400);
  const afterTap = await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-hide]")?.checked);
  check(`${tag} a tap on the count leaves the checkbox alone (positive control: the box exists)`, before !== undefined && afterTap === before, JSON.stringify([before, afterTap]));
  await page.evaluate(() => document.querySelector("#learnNextSheet .ln-hide")?.click()); await sleep(page, 400);
  const afterLabel = await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-hide]")?.checked);
  check(`${tag} (positive control) a tap on the label itself DOES toggle it`, afterLabel === !before, JSON.stringify([before, afterLabel]));
  const hide = await page.evaluate(() => document.querySelector("#learnNextSheet .ln-hide span")?.textContent.trim() ?? document.querySelector(".ln-hide span")?.textContent.trim() ?? "");
  check(`${tag} the "Hide words I know" line is still there beside it`, /^Hide words I know \(\d[\d,]* known\)$/.test(hide) || hide === "", hide);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
