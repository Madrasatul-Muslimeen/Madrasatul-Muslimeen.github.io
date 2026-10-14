// Audit 15 Oct 2026 (Architect): in Bangla the Qur'an must still be drawn in the Qur'an face.
// shell.css's html[lang="bn"] button rule (0,1,2) outranked button.ayah-word-clickable { font: inherit } (0,1,1), so every
// clickable Qur'an word in the Read view used a Bangla system font; and the Āyah card's word chips set no Qur'an face at all.
// Measured on the rendered page (computed font-family), en/bn x 390 / 1440.
// Mutations: --mutate=word (drop the read-view fix) and --mutate=chip (drop the chip fix) must each fail.
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const CUTS = {
  word: ["  html[lang] button.ayah-word-clickable { font: inherit; }\n", ""],
  chip: ['  .ayah-wbw-chip [lang="ar"] { font-family: var(--quran-font); font-size: 1.2rem; line-height: 1.6; }\n', ""],
};
const setSelect = (page, id, v) => page.evaluate(([i, val]) => { const s = document.getElementById(i); s.value = String(val); s.dispatchEvent(new Event("change", { bubbles: true })); }, [id, v]);
const browser = await chromium.launch();
for (const lang of ["en", "bn"]) {
  for (const width of [390, 1440]) {
    const tag = `${lang} ${width}px`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [from, to] = CUTS[MUTATE];
      const body = fs.readFileSync("app/quranrevival.html", "utf8");
      if (!body.includes(from)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: body.split(from).join(to) }));
    }
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    try {
      const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
      if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
      await page.click("#tabReadBtn"); await page.waitForTimeout(500);
      await setSelect(page, "surahSelect", 2); await page.waitForTimeout(1200);
      await setSelect(page, "unitTypeSelect", "ayah"); await page.waitForTimeout(500);
      await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s) { s.value = "255"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
      await page.waitForSelector("button.ayah-word-clickable", { timeout: 10000 });
      const docLang = await page.evaluate(() => document.documentElement.lang);
      check(`${tag}: POSITIVE CONTROL -- the page really is in ${lang}`, lang === "bn" ? docLang === "bn" : docLang !== "bn", docLang);
      const wf = await page.$eval("button.ayah-word-clickable", (b) => getComputedStyle(b).fontFamily);
      check(`${tag}: a clickable Qur'an word in the Read view uses the Qur'an face`, /QR Scheherazade/.test(wf), wf);
      await page.click("[data-ayah-num-badge]");
      await page.waitForSelector(".ayah-wbw-chip [lang='ar']", { timeout: 10000 });
      const cf = await page.$eval(".ayah-wbw-chip [lang='ar']", (e) => getComputedStyle(e).fontFamily);
      check(`${tag}: the Āyah card's word chips use the Qur'an face`, /QR Scheherazade/.test(cf), cf);
    } catch (err) {
      check(`${tag}: the flow ran to the end`, false, String(err && err.message || err).split("\n")[0]);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n==== Qur'an face in English and Bangla: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
