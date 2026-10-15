// QR Stage 1 (PCF J30, Owner decision 15 Oct 2026): General Study, Nature-Life, Life Skill and Health are HIDDEN from
// every entry point (one list: app/js/hidden-modules.js) but each page still opens at its own address.
// Measured on the rendered pages at 390 / 820 / 1440, English and Bangla: the Modules menu, the Continue strip
// (a recent study is seeded in Health and General so their cards WOULD show), the landing page and About.
// Positive controls: the other six modules still appear in the menu / strip, and the four pages still open.
// Mutations: --mutate=<name> restores one defect and must make this suite FAIL.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, newContext, openPage } from "./harness.mjs";
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUTATIONS = {
  // the four are back in the Modules menu
  menu: ["app/js/nav.js", "**/js/nav.js*", "    .filter((l) => !isHiddenFromQr(l.moduleId))\n", ""],
  // the Health / General cards are back on the Continue strip
  continue: ["app/js/continue-strip.js", "**/js/continue-strip.js*", '      if (isHiddenFromQr(e.moduleId)) return ""; // QR Stage 1, PCF J30\n', ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);

const HIDDEN = [
  { file: "general-study.html", en: "General Study", mod: "general" },
  { file: "naturelife-study.html", en: "Nature-Life", mod: "naturelife" },
  { file: "life-skill.html", en: "Life Skill", mod: "lifeskill" },
  { file: "health-study.html", en: "Health", mod: "health" },
];
const KEPT = ["quranrevival.html", "deen-study.html", "arabic-study.html", "hadith-study.html", "ldog-study.html", "asma-study.html"];
const SEED = `
Object.assign(DATA.bookmarks[0].resume, {
  "health::none::seed_h": { updatedAt: "2026-10-15T05:00:00.000Z" },
  "general::none::seed_g": { updatedAt: "2026-10-15T04:00:00.000Z" },
  "lifeskill::none::seed_l": { updatedAt: "2026-10-15T03:00:00.000Z" },
  "naturelife::none::seed_n": { updatedAt: "2026-10-15T02:00:00.000Z" },
  "arabic::none::seed_a": { updatedAt: "2026-10-15T01:00:00.000Z" },
});
`;
const browser = await chromium.launch();

async function open(lang, width, p) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width, height: 900 }, extraSeedJs: SEED });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, glob, from, to] = MUTATIONS[MUTATE];
    const body = fs.readFileSync(path.join(ROOT, file), "utf8");
    const n = body.split(from).length - 1;
    if (n !== 1) throw new Error(`mutation anchor for ${MUTATE} found ${n} times`);
    await ctx.route(glob, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: body.split(from).join(to) }));
  }
  const { page } = await openPage(ctx, p);
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const hrefs = (page) => page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href").split("?")[0]));
async function flow(name, fn) {
  try { await fn(); } catch (e) { check(`${name}: flow completed`, false, String(e).slice(0, 200)); }
}

for (const lang of ["en", "bn"]) {
  for (const width of [390, 820, 1440]) {
    const tag = `${lang} ${width}`;
    await flow(`${tag} menu`, async () => {
      for (const pg of ["/app/quranrevival.html", "/app/about.html"]) {
        const { ctx, page } = await open(lang, width, pg);
        const h = await hrefs(page);
        check(`${tag} ${pg}: positive control, the other modules are in the menu`, KEPT.every((k) => h.includes(k)), `missing: ${KEPT.filter((k) => !h.includes(k))}`);
        for (const x of HIDDEN) check(`${tag} ${pg}: no link to ${x.file}`, !h.includes(x.file));
        if (pg.includes("quran")) {
          const txt = await page.evaluate(() => document.body.innerText);
          if (lang === "en") for (const x of HIDDEN) check(`${tag} landing: "${x.en}" not printed`, !txt.includes(x.en));
        }
        await ctx.close();
      }
    });
    await flow(`${tag} continue`, async () => {
      const { ctx, page } = await open(lang, width, "/app/deen-study.html");
      await page.waitForSelector(".continue-strip", { timeout: 8000 });
      const chips = await page.evaluate(() => [...document.querySelectorAll(".continue-chip")].map((a) => a.getAttribute("href").split("?")[0]));
      check(`${tag} strip: positive control, the Arabic card shows`, chips.includes("arabic-study.html"), JSON.stringify(chips));
      for (const x of HIDDEN) check(`${tag} strip: no card for ${x.file}`, !chips.includes(x.file), JSON.stringify(chips));
      await ctx.close();
    });
  }
}
// each hidden page still opens at its own address and renders its own heading
for (const lang of ["en", "bn"]) {
  for (const x of HIDDEN) {
    await flow(`${lang} ${x.file}`, async () => {
      const { ctx, page } = await open(lang, 390, `/app/${x.file}`);
      const h1 = await page.evaluate(() => { const e = document.querySelector("h1"); return e && e.getClientRects().length ? e.textContent.trim() : ""; });
      check(`${lang} ${x.file} opens and shows its heading`, lang === "en" ? h1 === x.en : h1.length > 0 && h1 !== x.en, `h1="${h1}"`);
      await ctx.close();
    });
  }
}
await browser.close();
console.log(`\n==== QR Stage 1 hidden modules${MUTATE ? ` [mutate=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
