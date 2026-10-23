// MSA-QR-LEAD change request (23 Oct 2026): on quranrevival.html a language switch is made IN PLACE (Home ▾ → Language
// calls applyAppLangChange, no reload), and the Zab bar's "🧰 জ়াব" stayed Bangla on an English page. zab-bar.js now
// repaints on onAppLangChange (prefs.js). This proves it both ways, bn → en and en → bn, at a phone and a computer width.
//   node tools/i18n-verify/zab-lang-switch-browser.mjs [--mutate=no-relabel]     (serve.js on :8080, or QR_BASE)
//   no-relabel   zab-bar.js no longer listens for the switch -> the "after" checks FAIL
import fs from "node:fs";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = { "no-relabel": ["    onAppLangChange(relabel);\n", ""] };
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const browser = await chromium.launch();
const BN = /[ঀ-৿]/;
const barText = (p) => p.evaluate(() => document.querySelector("#zabBar > [data-zab-open]")?.textContent.trim() ?? null);

for (const width of [390, 1280]) for (const from of ["bn", "en"]) {
  const to = from === "bn" ? "en" : "bn", tag = `[${width} ${from}→${to}]`;
  const ctx = await newContext(browser, { appLang: from === "bn" ? "bn" : null, viewport: { width, height: 844 } });
  await ctx.route((u) => !["localhost", "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE], src = fs.readFileSync("app/js/zab-bar.js", "utf8");
    if (src.split(a).length !== 2) throw new Error(`mutation anchor ${MUTATE} not found exactly once`);
    await ctx.route("**/js/zab-bar.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.replace(a, b) }));
  }
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}/app/quranrevival.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("#zabBar > [data-zab-open]"), null, { timeout: 20000 }).catch(() => {});
  const before = await barText(page);
  check(`${tag} POSITIVE CONTROL the Zab bar is there, in ${from}`, !!before && (from === "bn" ? BN.test(before) : /Zab/.test(before) && !BN.test(before)), String(before));
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => { const d = document.querySelector("details.nav-cat-home"); if (d) d.open = true; });
  await page.waitForFunction(() => document.getElementById("navAppLangSelect"), null, { timeout: 15000 }).catch(() => {});
  let navigated = false; page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigated = true; });
  await page.selectOption("#navAppLangSelect", to).catch((e) => check(`${tag} the Language picker takes ${to}`, false, String(e)));
  await page.waitForTimeout(1500);
  check(`${tag} POSITIVE CONTROL the switch is made in place (no reload), as on QR`, !navigated);
  const after = await barText(page);
  check(`${tag} the Zab bar now reads in ${to}`, !!after && (to === "bn" ? BN.test(after) : /Zab/.test(after) && !BN.test(after)), `${before} -> ${after}`);
  const labels = await page.evaluate(() => [document.getElementById("zabBar")?.getAttribute("aria-label"), document.getElementById("zabPanel")?.getAttribute("aria-label"), document.getElementById("zabCorner")?.getAttribute("aria-label")]);
  check(`${tag} its spoken names follow (bar, panel, corner)`, labels.every((l) => !!l && (to === "bn" ? BN.test(l) : !BN.test(l))), JSON.stringify(labels));
  check(`${tag} no page error`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Zab bar follows an in-place language switch${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
