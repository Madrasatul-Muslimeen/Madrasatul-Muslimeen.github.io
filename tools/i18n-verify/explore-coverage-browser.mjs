// The Owner, 7 Oct 2026 (a screenshot of Explore → An-Naazi'aat: "something is keep loading for sometime now. Fix.").
// Explore's "N of M Arabic words known" line waited for the words known through a dictionary word, read one word at a
// time (436 reads for An-Naazi'aat in the stub, ~700 with its approvals and roots), so on a phone it said
// "Loading progress…" for a long time. Now the Surah's own figure shows at once with "still counting…", and completes
// when those reads answer. Here they are HELD (window.__stubHold) to prove what the reader sees meanwhile.
// Run from the repository root with serve.js on :8080. Expected texts are written by hand.
//   --mutate=no-early    the early paint is removed   -> the "while still counting" checks fail
//   --mutate=paint-stale a late answer paints anyway  -> the "left the Surah" check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
let body = null;
if (MUTATE) {
  body = fs.readFileSync("app/quranrevival.html", "utf8");
  const swap = (a, b) => { const n = body.split(a).length - 1; if (!n) throw new Error(`mutation anchor missing: ${a.slice(0, 70)}`); console.log(`(mutation ${MUTATE}: ${n} replaced)`); body = body.split(a).join(b); };
  if (MUTATE === "no-early") swap("if (stillHere()) paintCoverage(el, compute(), truncated, true);", "");
  else if (MUTATE === "paint-stale") swap("      if (!stillHere()) return;\n      paintCoverage(el, figure, truncated, false);", "      paintCoverage(el, figure, truncated, false);");
  else throw new Error(`unknown mutation ${MUTATE}`);
}
const W = {
  en: { loading: "Loading progress…", known: /^0 of 179 Arabic words known/, counting: "still counting the words known elsewhere in the Qur'an…" },
  bn: { loading: "অগ্রগতি লোড হচ্ছে…", known: /১৭৯/, counting: "কুরআনের অন্য জায়গায় জানা শব্দগুলো এখনও গোনা হচ্ছে…" },
};
const HOLD = ["quranLemmaProgress", "quranLemmaApprovals"];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (body) await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }));
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.click("#tabExploreBtn");
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"]', { timeout: 20000 });
  const line = () => page.evaluate(() => { const e = document.getElementById("exploreArabicCoverage"); return { hidden: !!e?.hidden, text: (e?.textContent ?? "").trim(), counting: !!e?.querySelector("[data-eac-counting]") }; });

  // 1. Hold every per-word read, open An-Naazi'aat.
  await page.evaluate((h) => { window.__stubHold = h; window.__stubHeld = []; }, HOLD);
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="79"]', { force: true });
  await page.waitForFunction(() => (window.__stubHeld || []).length > 0, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const held = await page.evaluate(() => (window.__stubHeld || []).length);
  const early = await line();
  check(`${tag}: the per-word reads really are still waiting (${held} held)`, held > 50, String(held));
  check(`${tag}: while they wait, the line shows the Surah's figure, not "${W[lang].loading}"`, !early.hidden && W[lang].known.test(early.text) && !early.text.includes(W[lang].loading), JSON.stringify(early));
  check(`${tag}: ...and says it is still counting, in ${lang}`, early.counting && early.text.includes(W[lang].counting), JSON.stringify(early));

  // 2. Release them: the figure completes and the "still counting" note goes.
  await page.evaluate(() => window.__stubRelease());
  await page.waitForFunction(() => !document.querySelector("#exploreArabicCoverage [data-eac-counting]"), null, { timeout: 15000 }).catch(() => {});
  const done = await line();
  check(`${tag}: when they answer, the figure is complete and the note is gone`, W[lang].known.test(done.text) && !done.counting && !done.text.includes(W[lang].loading), JSON.stringify(done));

  // 3. Hold again, open the Surah, then leave for the Whole Qur'an before the reads answer: the late answer must not paint.
  await page.evaluate(() => document.querySelector('#exploreBreadcrumb [data-level="quran"]').click());
  await page.waitForSelector('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"]', { timeout: 20000 });
  await page.evaluate((h) => { window.__stubHold = h; window.__stubHeld = []; }, HOLD);
  await page.click('#exploreWheelContainer .wheel-ring-seg[data-ring-kind="surah"][data-key="80"]', { force: true });
  await page.waitForFunction(() => (window.__stubHeld || []).length > 0, null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#exploreBreadcrumb [data-level="quran"]').click());
  await page.waitForTimeout(500);
  const before = await line();
  await page.evaluate(() => window.__stubRelease());
  await page.waitForTimeout(1200);
  const after = await line();
  check(`${tag}: a late answer for a Surah the reader has left does not paint over the Whole Qur'an line`, after.text === before.text && !/ ১৭৯|of 1[0-9]{2} Arabic/.test(after.text) && !after.counting, JSON.stringify({ before, after }));

  check(`${tag}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check(`${tag}: no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Explore "words known" line never waits on every word: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
