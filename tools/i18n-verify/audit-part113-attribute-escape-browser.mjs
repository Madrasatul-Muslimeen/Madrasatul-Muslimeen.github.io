// Audit part 113 (PCF MSA J29, SECURITY): names must reach every quoted ATTRIBUTE (value, title, aria-label, data-*, label) as text.
// Parts 110-112 planted <img onerror> in names; that cannot leave a quoted attribute. This payload can:
//   x" data-pwn="1" autofocus onfocus="window.__xss=(window.__xss||0)+1" y="
// It is seeded (extraSeedJs) as the name of p1 and p2, the first three subjects, every class, the tenant, every trackable name and
// groupName, every domain, ladder, level, curriculum unit and course offer, and a bookmark's name. For every page of the part-108 sweep
// (PAGES) plus curriculum.html, health-study.html, ldog-study.html, in en and bn at 390 and 1440: window.__xss is unset, no element
// carries a data-pwn attribute, no element has an onfocus attribute mentioning __xss, and no page script failed to load (POSITIVE CONTROL).
// Edit forms drawn on demand are opened too: People -> Edit on p2, Catalogue -> edit a subject.
// Mutation: --mutate removes one fix (people.html's Person picker/edit value escape; named in MUTATION below); that page must fail.
// Run from the repository root with serve.js on :8080:
//   node tools/i18n-verify/audit-part113-attribute-escape-browser.mjs [--mutate] [--page=a.html,b.html]
import fs from "node:fs";
import { chromium, newContext, openPage } from "./harness.mjs";

const arg = (k) => (process.argv.find((a) => a === "--" + k || a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const MUTATE = process.argv.includes("--mutate"), ONLY = arg("page");

// MUTATION is filled in once a fix exists: { file, from, to, page } where `to` removes the fix.
const MUTATION = {
  file: "app/quranrevival.html",
  from: '.replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#39;");\n    }\n\n    let qcrCollectionsTenantId',
  to: '.replace(/>/g, "&gt;");\n    }\n\n    let qcrCollectionsTenantId',
  page: "index.html",
};
let ORIG = null;
if (MUTATE) {
  if (!MUTATION) throw new Error("no mutation defined");
  ORIG = fs.readFileSync(MUTATION.file, "utf8");
  const m = ORIG.replace(MUTATION.from, MUTATION.to);
  if (m === ORIG) throw new Error("mutation did not apply");
  fs.writeFileSync(MUTATION.file, m);
}

const src = fs.readFileSync("tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs", "utf8");
const i = src.indexOf("const PAGES = ["), j = src.indexOf("const FLOW = arg(", i);
if (i < 0 || j < 0) throw new Error("cannot read PAGES");
const { PAGES, REAL_SEED, SEEDS } = new Function(src.slice(i, j) + "\nreturn { PAGES, REAL_SEED, SEEDS };")();
const pages = PAGES.map(([name, path]) => [name, path]);
for (const extra of ["curriculum.html", "health-study.html", "ldog-study.html"]) {
  if (!pages.some(([, p]) => p.split("?")[0] === extra) && fs.existsSync("app/" + extra)) pages.push([extra, extra]);
}

const PAYLOAD = 'x" data-pwn="1" autofocus onfocus="window.__xss=(window.__xss||0)+1" y="';
const SEED = `
  const P = ${JSON.stringify(PAYLOAD)};
  const nm = { en: P, bn: P };
  const byId = (re) => DATA.tenantPeople.find((p) => re.test(p._id || p.personId || p.id || ""));
  const p1 = byId(/p1$/), p2 = byId(/p2$/) || DATA.tenantPeople[1];
  if (p1) p1.name = nm;
  if (p2) p2.name = nm;
  for (const s of DATA.subjects.slice(0, 3)) s.name = nm;
  for (const c of DATA.classes) c.name = nm;
  DATA.tenants[0].name = nm;
  for (const tr of DATA.trackables) { tr.name = nm; if (tr.groupName) tr.groupName = nm; }
  for (const k of ["domains", "ladders", "levels", "curriculumUnits", "courseOffers"]) for (const d of (DATA[k] || [])) d.name = nm;
  for (const b of (DATA.bookmarks || [])) for (const s of (b.saved || [])) s.name = P;
`;

// everything that proves the payload broke out of an attribute
const SCAN = () => {
  const bad = [...document.querySelectorAll("*")].filter((e) => e.hasAttribute("data-pwn") || (e.getAttribute("onfocus") || "").includes("__xss"));
  return {
    xss: window.__xss ?? null,
    bad: bad.map((e) => ({ tag: e.tagName.toLowerCase(), id: e.closest("[id]")?.id || "(no id)", html: e.outerHTML.slice(0, 200) })),
  };
};

let fails = 0, runs = 0;
const hits = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

async function judge(tag, page, errors) {
  await page.waitForTimeout(300);
  const r = await page.evaluate(SCAN);
  runs++;
  const pageErrors = errors.filter((m) => /SyntaxError|ReferenceError|is not defined|does not provide an export/.test(m)).map((m) => m.slice(0, 120));
  if (pageErrors.length) console.log(`        script error: ${pageErrors[0]}`);
  const good = r.xss === null && r.bad.length === 0 && pageErrors.length === 0;
  if (!good) {
    fails++;
    const f = tag.split(" ")[0];
    hits[f] = (hits[f] || 0) + 1;
    console.log(`FAIL  ${tag}: __xss=${r.xss}, ${r.bad.length} offending element(s)`);
    for (const b of r.bad.slice(0, 5)) console.log(`        <${b.tag}> closest [id]=${b.id}  ${b.html}`);
  } else console.log(`PASS  ${tag}`);
}

try {
  for (const [name, path] of pages) {
    const file = path.split("?")[0];
    if (ONLY && !ONLY.split(",").some((p) => file === p)) continue;
    for (const lang of ["en", "bn"]) for (const w of [390, 1440]) {
      const ctx = await newContext(browser, { appLang: lang, accountLang: lang, banner: false, viewport: { width: w, height: 900 }, extraSeedJs: REAL_SEED + (SEEDS[file] || "") + SEED });
      await ctx.route("**/archive.org/**", (r) => r.abort());
      let errors = [], page;
      const sep = path.includes("?") ? "&" : "?";
      try { ({ page, errors } = await openPage(ctx, "/app/" + path + sep + (path.startsWith("hadith-collections") ? "back=1" : "navBack=1"))); } catch (e) { console.log(`?? ${file} ${lang} ${w}: ${String(e).slice(0, 80)}`); await ctx.close(); continue; }
      await page.waitForTimeout(1500);
      await judge(`${file} ${lang} ${w}`, page, errors);

      // forms drawn only on demand
      const forms = { "people.html": ["button[data-edit], [data-act=edit], button:has-text('Edit'), button:has-text('সম্পাদনা')"], "catalogue.html": ["button[data-edit], [data-act=edit], button:has-text('Edit'), button:has-text('সম্পাদনা')"] }[file];
      for (const sel of forms || []) {
        const btns = page.locator(sel);
        const n = Math.min(await btns.count(), 4);
        for (let k = 0; k < n; k++) {
          try { await btns.nth(k).click({ timeout: 2000 }); } catch { continue; }
          await judge(`${file} ${lang} ${w} (after Edit #${k + 1})`, page, errors);
        }
        if (!n) console.log(`        note: no Edit control found on ${file} ${lang} ${w}`);
      }
      await ctx.close();
    }
  }
} finally {
  if (MUTATE && ORIG) fs.writeFileSync(MUTATION.file, ORIG);
  await browser.close();
}
console.log(`\n==== Audit part 113: ${runs} runs, ${fails} failed ====`);
if (MUTATE) {
  const caught = (hits[MUTATION.page] || 0) > 0;
  console.log(`MUTATION ${MUTATION.page}: ${caught ? "caught (the check CAN fail)" : "NOT caught"}`);
  process.exit(caught ? 1 : 2);
}
process.exit(fails ? 1 : 0);
