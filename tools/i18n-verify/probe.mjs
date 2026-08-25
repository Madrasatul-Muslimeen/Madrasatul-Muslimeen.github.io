// Ad-hoc probe: dump what a page ACTUALLY renders, so a phase is judged by
// reading a real screen rather than by trusting tools/i18n-coverage.mjs --
// which has overstated progress in every phase so far.
//
//   node tools/i18n-verify/probe.mjs /app/records.html [en|bn]
import { chromium, newContext, openPage } from "./harness.mjs";

const path = process.argv[2] || "/app/records.html";
const lang = process.argv[3] || "bn";
const EXE = process.env.CHROMIUM_PATH || undefined;

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await newContext(browser, { banner: true, appLang: lang === "bn" ? "bn" : null, viewport: { width: 900, height: 1200 } });
const { page, errors } = await openPage(ctx, path);
await page.evaluate(() => {
  document.querySelectorAll("details").forEach((d) => (d.open = true));
  document.querySelectorAll("fieldset, #app").forEach((d) => (d.style.display = ""));
});
await page.waitForTimeout(600);

const out = await page.evaluate(() => ({
  title: document.title,
  text: document.body.innerText,
  options: [...document.querySelectorAll("select")].map((s) => `${s.id}: ${[...s.options].map((o) => o.textContent.trim()).join(" | ")}`),
  placeholders: [...document.querySelectorAll("[placeholder]")].map((e) => `${e.id || e.className}: ${e.placeholder}`),
}));
console.log(`===== ${path} (${lang}) =====`);
console.log("TITLE:", out.title);
console.log(out.text);
console.log("--- selects ---");
out.options.forEach((o) => console.log(" ", o));
console.log("--- placeholders ---");
out.placeholders.forEach((o) => console.log(" ", o));
if (errors.length) console.log("--- errors ---\n", errors.join("\n"));

await browser.close();
