// 8 Nov 2026 (the Owner, PCF MSA J104 tick 10 A): a Hadith dua's poster carries HadeethEnc's translation of the hadith,
// labelled "translation of the hadith". Run from the repository root, serve.js on :8080.
//   --mutate=nonote   the label is dropped -> the label check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { nonote: ["js/dua-poster.js", "const trText = (sheet, k) => (sheet.trNote ?", "const trText = (sheet, k) => (false ?"] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const lang of ["en", "bn"]) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: 1280, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [f, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${f}*`, async (r) => { const src = fs.readFileSync(`app/${f}`, "utf8"); if (!src.includes(a)) throw new Error("anchor"); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); }); }
  const { page: P } = await openPage(ctx, "/app/dua-study.html?g=rasul&open=8");
  await P.waitForSelector("[data-dua-menu-toggle]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForTimeout(2500);
  await P.click('[data-dua-menu="poster"]');
  await P.waitForSelector(`.dua-a4-${lang}`, { timeout: 8000 }).catch(() => {});
  const txt = await P.$eval(`.dua-a4-${lang}`, (e) => e.textContent).catch(() => "");
  check(`[${lang}] the poster shows the hadith's translation`, txt.length > 40, JSON.stringify(txt.slice(0, 80)));
  const label = lang === "bn" ? "হাদীসের অনুবাদ" : "translation of the hadith";
  check(`[${lang}] it is labelled "${label}"`, txt.includes(label), JSON.stringify(txt.slice(-60)));
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
