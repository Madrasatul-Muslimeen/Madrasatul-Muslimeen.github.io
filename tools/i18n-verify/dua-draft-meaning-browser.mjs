// 8 Nov 2026 (the Owner, PCF MSA J104 tick 10 B): a Hisn al-Muslim dua HadeethEnc does not cover shows a short DRAFT meaning,
// marked "draft, to be checked"; one with no draft says so. Run from the repository root, serve.js on :8080.
//   --mutate=nodraft   the meaning is not filled -> the meaning check fails
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); } };
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { nodraft: ["js/dua-study.js", "const m = all[e.h];", "const m = null;"] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function show(lang, open) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: 1280, height: 900 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) { const [f, a, b] = MUT[MUTATE]; await ctx.route(`**/app/${f}*`, async (r) => { const src = fs.readFileSync(`app/${f}`, "utf8"); if (!src.includes(a)) throw new Error("anchor"); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); }); }
  const { page: P } = await openPage(ctx, `/app/dua-study.html?g=occasions&part=wake&open=${open}`);
  await P.waitForSelector("[data-dua-hisn]", { timeout: 25000 });
  await P.click("[data-dua-menu-toggle]");
  await P.waitForTimeout(1200);
  const txt = await P.$eval(".dua-hisn-meaning", (e) => e.textContent);
  await ctx.close();
  return txt;
}
for (const lang of ["en", "bn"]) {
  const a = await show(lang, 1);
  check(`[${lang}] Hisn 1:1 shows its draft meaning`, a.length > 30 && !/No meaning|অর্থ এখনো/.test(a), JSON.stringify(a));
  check(`[${lang}] it is marked draft, to be checked`, a.includes(lang === "bn" ? "খসড়া, যাচাই করা হবে" : "draft, to be checked"), JSON.stringify(a));
}
const none = await show("en", 3);
check("a dua with no draft says no meaning is in the app yet", /No meaning of this dua is in the app yet/.test(none), JSON.stringify(none));
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
