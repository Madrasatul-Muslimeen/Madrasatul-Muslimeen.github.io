// Audit part 107 (PCF MSA J29): the routine pages' (Health, LDOG) breadcrumb must show a NAME, never a raw id (I11).
// For each page, in Bangla and English at 390 and 1440:
//   missing  the root subject is absent from the catalogue -> crumb must be the module's real name ("Health" / "Learn Deen On-the-Go"), not "health"/"ldog"/"Ldog"
//   named    the root carries a real-length language-keyed name -> the crumb shows that name
// Mutation: --mutate=rawid puts the old raw-id fallback back (the "missing" checks must fail).
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/audit-part107-routine-crumb-browser.mjs [--mutate=rawid]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const RS = "app/js/routine-study.js";
const ORIG = fs.readFileSync(RS, "utf8");
if (MUTATE === "rawid") {
  const m = ORIG.replace("rootLabel = root ? langText(root.name, getAppLang(), idAsName) : idAsName;", "rootLabel = root ? langText(root.name, getAppLang(), moduleId) : moduleId;");
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(RS, m);
}
const PAGES = [
  ["health", "health-study.html", "Health", "স্বাস্থ্য"],
  ["ldog", "ldog-study.html", "Learn Deen On-the-Go", "চলার পথে দ্বীন শিক্ষা"],
];
const NAMED_EN = " and the Etiquette of Seeking Knowledge", NAMED_BN = " এবং জ্ঞান অন্বেষণের আদব";
const seed = (mod, named, en, bn) => `
(function () {
  const id = (s) => TENANT_ID + "__" + s;
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes("${mod}") && s.subjectId !== "${mod}");
  if (${named}) DATA.subjects.push({ _id: id("${mod}"), tenantId: TENANT_ID, subjectId: "${mod}", parentId: null, name: lang(${JSON.stringify(en + NAMED_EN)}, ${JSON.stringify(bn + NAMED_BN)}), moduleIds: ["${mod}"], ancestorIds: [], status: "active", order: 1 });
})();`;
const browser = await chromium.launch();
try {
  for (const [mod, file, en, bn] of PAGES) {
    for (const lang of ["bn", "en"]) for (const width of [390, 1440]) for (const named of [false, true]) {
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 }, extraSeedJs: seed(mod, named, en, bn) });
      const { page } = await openPage(ctx, "/app/" + file);
      await page.waitForSelector(".topic-crumb-current", { timeout: 8000 }).catch(() => {});
      const crumb = await page.evaluate(() => document.querySelector("#breadcrumbContainer .topic-crumb-current")?.textContent?.trim() ?? null);
      const tag = `${file} ${lang} ${width} ${named ? "named" : "missing"}`;
      check(`${tag}: crumb is present`, !!crumb, String(crumb));
      const cap = mod.charAt(0).toUpperCase() + mod.slice(1);
      check(`${tag}: crumb is not the raw id`, !!crumb && crumb !== mod, JSON.stringify(crumb));
      check(`${tag}: crumb is not the capitalised id ("Ldog") unless that is the real name`, !!crumb && (crumb !== cap || en === cap), JSON.stringify(crumb));
      const want = (lang === "bn" ? bn : en) + (named ? (lang === "bn" ? NAMED_BN : NAMED_EN) : "");
      check(`${tag}: crumb is the expected name`, crumb === want, `${JSON.stringify(crumb)} want ${JSON.stringify(want)}`);
      await ctx.close();
    }
  }
} finally {
  if (MUTATE) fs.writeFileSync(RS, ORIG);
  await browser.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
