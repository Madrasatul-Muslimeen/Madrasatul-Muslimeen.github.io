// Audit part 106 (PCF MSA J29): the shared topic page's breadcrumb must show a subject NAME, never a raw id (I11).
// Six pages run app/js/topic-study.js. For each, in Bangla and English at 390 and 1440:
//   missing  the module's root subject is absent from the catalogue (crumb falls back) -> must read as a name, not "hadith"/"deen_study"
//   named    the root carries a real-length language-keyed name -> the crumb shows a name, in Bangla on a Bangla page
// Mutation: --mutate=rawid puts the raw id back as the fallback (the "missing" checks must fail).
// Run from the repository root with serve.js on :8080:  node tools/i18n-verify/audit-part106-topic-crumb-browser.mjs [--mutate=rawid]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ""}`); }
}
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const TS = "app/js/topic-study.js";
const ORIG = fs.readFileSync(TS, "utf8");
if (MUTATE === "rawid") {
  const m = ORIG.replace("rootLabel = root ? langText(root.name, getAppLang(), idAsName) : idAsName;", "rootLabel = root ? langText(root.name, getAppLang(), moduleId) : moduleId;");
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(TS, m);
}
const PAGES = [
  ["deen", "deen_study", "deen-study.html", "Deen Study", "দ্বীন অধ্যয়ন"],
  ["arabic", "arabic_language", "arabic-study.html", "Arabic Language", "আরবি ভাষা"],
  ["general", "general_study", "general-study.html", "General Study", "সাধারণ অধ্যয়ন"],
  ["naturelife", "nature_life", "naturelife-study.html", "Nature Life", "প্রকৃতি ও জীবন"],
  ["lifeskill", "life_skill", "life-skill.html", "Life Skill", "জীবন দক্ষতা"],
  ["hadith", "hadith", "hadith-study.html", "Hadith", "হাদীস"],
];
const seed = (mod, root, named, en, bn) => `
(function () {
  const id = (s) => TENANT_ID + "__" + s;
  DATA.subjects = DATA.subjects.filter((s) => !(s.moduleIds || []).includes("${mod}") && s.subjectId !== "${root}");
  if (${named}) DATA.subjects.push({ _id: id("${root}"), tenantId: TENANT_ID, subjectId: "${root}", parentId: null, name: lang(${JSON.stringify(en + " and the Etiquette of Seeking Knowledge")}, ${JSON.stringify(bn + " এবং জ্ঞান অন্বেষণের আদব")}), moduleIds: ["${mod}"], ancestorIds: [], status: "active", order: 1 });
})();`;
const browser = await chromium.launch();
try {
  for (const [mod, root, file, en, bn] of PAGES) {
    for (const lang of ["bn", "en"]) for (const width of [390, 1440]) for (const named of [false, true]) {
      const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 }, extraSeedJs: seed(mod, root, named, en, bn) });
      const { page } = await openPage(ctx, "/app/" + file);
      await page.waitForSelector(".topic-crumb-current", { timeout: 8000 }).catch(() => {});
      const crumb = await page.evaluate(() => document.querySelector("#breadcrumbContainer .topic-crumb-current")?.textContent?.trim() ?? null);
      const tag = `${file} ${lang} ${width} ${named ? "named" : "missing"}`;
      check(`${tag}: crumb is present`, !!crumb, String(crumb));
      check(`${tag}: crumb is not a raw id`, !!crumb && crumb !== root && crumb !== mod && !/^[a-z]+(_[a-z]+)*$/.test(crumb), JSON.stringify(crumb));
      if (lang === "bn") check(`${tag}: crumb is in Bangla`, !!crumb && /[ঀ-৿]/.test(crumb), JSON.stringify(crumb));
      await ctx.close();
    }
  }
} finally {
  if (MUTATE) fs.writeFileSync(TS, ORIG);
  await browser.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
