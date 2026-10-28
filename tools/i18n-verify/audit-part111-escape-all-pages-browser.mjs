// Audit part 111 (PCF MSA J29, SECURITY): names must reach EVERY shared page as text, never as markup.
// The payload is seeded as the name of person p2, the first three subjects, every class and the tenant, through extraSeedJs.
// For every page of the part-108 sweep (PAGES, read from shared-pages-failed-write-audit-browser.mjs) plus curriculum.html,
// health-study.html and ldog-study.html, in en and bn at 390 and 1440: window.__xss is never set, no <img src="x"> and no
// <b>bold</b> element exists. On failure each offending element's closest [id] and its parent's outerHTML are printed.
// Mutation: --mutate removes one escape on curriculum.html (the Person picker on Grades); curriculum.html must fail.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part111-escape-all-pages-browser.mjs [--mutate] [--page=a.html,b.html]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const arg = (k) => (process.argv.find((a) => a === "--" + k || a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = process.argv.includes("--mutate"), ONLY = arg("page");

const CUR = "app/curriculum.html";
const CUR_ORIG = fs.readFileSync(CUR, "utf8");
if (MUTATE) {
  const from = "<option value=\"${p.id}\">${escapeHtml(langText(p.name, getAppLang(), p.id))}</option>`).join(\"\");\n      gradeFromDateInput";
  const m = CUR_ORIG.replace(from, from.replace("escapeHtml(langText(p.name, getAppLang(), p.id))", "langText(p.name, getAppLang(), p.id)"));
  if (m === CUR_ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(CUR, m);
}

// pages and seeds, read from the failed-write audit rather than retyped (same trick as part 108)
const src = fs.readFileSync("tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs", "utf8");
const i = src.indexOf("const PAGES = ["), j = src.indexOf("const FLOW = arg(", i);
if (i < 0 || j < 0) throw new Error("cannot read PAGES");
const { PAGES, REAL_SEED, SEEDS } = new Function(src.slice(i, j) + "\nreturn { PAGES, REAL_SEED, SEEDS };")();
const pages = PAGES.map(([name, path]) => [name, path]);
for (const extra of ["curriculum.html", "health-study.html", "ldog-study.html"]) {
  if (!pages.some(([, p]) => p.split("?")[0] === extra) && fs.existsSync("app/" + extra)) pages.push([extra, extra]);
}

const PAYLOAD = '<img src=x onerror="window.__xss=(window.__xss||0)+1"><b>bold</b>';
const SEED = `
  const P = ${JSON.stringify(PAYLOAD)};
  const nm = { en: P, bn: P };
  const p2 = DATA.tenantPeople.find((p) => /p2$/.test(p._id || p.personId || p.id || "")) || DATA.tenantPeople[1];
  if (p2) p2.name = nm;
  for (const s of DATA.subjects.slice(0, 3)) s.name = nm;
  for (const c of DATA.classes) c.name = nm;
  DATA.tenants[0].name = nm;
  // The Architect, at release: p1 too (People's "managed by" cell names p2's manager, p1) and every Approach and section name
  // (the Mastery Wheel's segment titles and its Approach list on the Landing page).
  const p1 = DATA.tenantPeople.find((p) => /p1$/.test(p._id || p.personId || p.id || ""));
  if (p1) p1.name = nm;
  for (const tr of DATA.trackables) { tr.name = nm; if (tr.groupName) tr.groupName = nm; }
`;

// Known open, by name: none. hadith-collections.html (open in the Builder's run) was fixed by the Architect at release.
const KNOWN_OPEN = new Set([]);
let fails = 0, runs = 0, knownOpenHits = 0;
const hits = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const [name, path] of pages) {
    const file = path.split("?")[0];
    if (ONLY && !ONLY.split(",").some((p) => file === p)) continue;
    for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
      const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: 900 }, extraSeedJs: REAL_SEED + (SEEDS[file] || "") + SEED });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      let page;
      const sep = path.includes("?") ? "&" : "?";
      try { ({ page } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"))); } catch (e) { console.log(`?? ${file} ${lang} ${w}: ${String(e).slice(0, 80)}`); await ctx.close(); continue; }
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => {
        const bad = [...document.querySelectorAll('img[src="x"], b')].filter((e) => e.tagName === "IMG" || e.textContent === "bold");
        return {
          xss: window.__xss ?? null,
          bad: bad.map((e) => ({ id: e.closest("[id]")?.id || "(no id)", parent: (e.parentElement?.outerHTML || "").slice(0, 200) })),
        };
      });
      runs++;
      const good = r.xss === null && r.bad.length === 0;
      if (!good) {
        if (KNOWN_OPEN.has(file)) knownOpenHits++; else fails++;
        hits[file] = (hits[file] || 0) + 1;
        console.log(`${KNOWN_OPEN.has(file) ? "KNOWN-OPEN" : "FAIL"}  ${file} ${lang} ${w}: __xss=${r.xss}, ${r.bad.length} offending element(s)`);
        for (const b of r.bad.slice(0, 5)) console.log(`        closest [id]=${b.id}  parent: ${b.parent}`);
      } else console.log(`PASS  ${file} ${lang} ${w}`);
      await ctx.close();
    }
  }
} finally {
  if (MUTATE) fs.writeFileSync(CUR, CUR_ORIG);
  await browser.close();
}
for (const f of KNOWN_OPEN) if (!ONLY && !hits[f]) { fails++; console.log(`FAIL  ${f} no longer injects: remove it from KNOWN_OPEN`); }
console.log(`\n==== Audit part 111: ${runs} runs, ${fails} failed, ${knownOpenHits} known-open ====`);
if (MUTATE) {
  const caught = (hits["curriculum.html"] || 0) > 0;
  console.log(`MUTATION curriculum: ${caught ? "caught (the check CAN fail)" : "NOT caught"}`);
  process.exit(caught ? 1 : 2);
}
process.exit(fails ? 1 : 0);
