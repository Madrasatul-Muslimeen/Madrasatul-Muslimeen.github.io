// The Owner, 15 Nov 2026 (PCF MSA J139 ask 3): on the Tafsīr tab of Study Next, each era's heading ("Authors who died in century 4 AH" …) is an ON/OFF
// switch in the Word Card's section-switch style. Off hides that era's books; all on at first; the reader's choice is kept on this device;
// switching it on again shows the books (the way back). Checked on the Hadith card's Study Next (the same read-next-ui.js the Āyah card uses).
//   node tools/i18n-verify/tafsir-era-switch-browser.mjs [--mutate=nosw|nokeep|ignoresaved|nohide]
//   --mutate=nosw         the switch is not drawn                       -> "wears the 40x24 ON/OFF switch" FAILS
//   --mutate=nokeep       the choice is never saved                     -> "kept on this device" FAILS
//   --mutate=ignoresaved  a saved OFF is ignored on the next open       -> "kept on this device" FAILS
//   --mutate=nohide       OFF still shows the books                     -> "OFF hides that era's books" FAILS
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/js/read-next-ui.js";
const MUT = {
  nosw: ['.read-next-era > summary.read-next-sub::after { content: "";', '.read-next-era > summary.read-next-sub::after { content: none;'],
  nokeep: ["function saveEraSwitch(key, on) {\n  try {", "function saveEraSwitch(key, on) {\n  return; try {"],
  ignoresaved: ["group.open = !eraOff.has(eraKey);", "group.open = true;"],
  nohide: ["    group.appendChild(item);\n  }\n  }\n}", "    panel.appendChild(item);\n  }\n  }\n}"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const BOOK = "0256Bukhari.Sahih.JK000110-ara1", N = 3351;
const URL_ = `/app/hadith-collections.html?openiti=${BOOK}&passage=${N}&back=1`;
const BOX = `[data-openiti-passage="${N}"] .read-next`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const open = async (ctx) => {
  const { page } = await openPage(ctx, URL_);
  await page.waitForSelector(`${BOX} [data-read-next-tab="tafsir"]`, { timeout: 20000 });
  await page.click(`${BOX} [data-read-next-tab="tafsir"]`);
  await page.waitForFunction((sel) => !!document.querySelector(sel)?.dataset.readNextLoaded, `${BOX} [data-read-next-panel="tafsir"]`, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(500);
  return page;
};
const state = (page) => page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-era]`)].map((g) => {
  const s = g.querySelector("summary"), r = s.getBoundingClientRect(), a = getComputedStyle(s, "::after"), books = [...g.querySelectorAll("[data-read-next-tafsir]")];
  const shown = books.filter((b) => b.checkVisibility() && b.getBoundingClientRect().height > 0).length; // a closed <details> skips its content: checkVisibility() is false for it
  return { era: g.dataset.readNextEra, open: g.open, books: books.length, shown, h: Math.round(r.height), sw: [a.width, a.height], swDrawn: a.content !== "none" && a.content !== "normal", over: document.documentElement.scrollWidth - innerWidth, inside: r.right <= innerWidth + 1 };
}), BOX);
for (const [lang, w, h] of [["en", 390, 844], ["en", 360, 740], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${w}]`;
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [a, b] = MUT[MUTATE];
    await ctx.route(`**/${F}*`, async (r) => { const src = fs.readFileSync(F, "utf8"); if (src.split(a).length !== 2) throw new Error(`mutation anchor missing/duplicated: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/javascript", body: src.replace(a, b) }); });
  }
  let page = await open(ctx);
  let st = await state(page);
  check(`${tag} POSITIVE CONTROL: the Tafsīr tab lists the eras (${st.length}) with books`, st.length >= 2 && st.every((g) => g.books > 0));
  check(`${tag} all eras are ON at first and their books show`, st.every((g) => g.open && g.shown === g.books), JSON.stringify(st.map((g) => [g.era, g.open, g.shown, g.books])));
  check(`${tag} each century heading wears the 40x24 ON/OFF switch and is a 44px target inside the screen`, st.every((g) => g.swDrawn && g.sw[0] === "40px" && g.sw[1] === "24px" && g.h >= 44 && g.inside && g.over <= 0), JSON.stringify(st[0]));
  const first = st[0].era;
  await page.evaluate(([box, e]) => document.querySelector(`${box} [data-read-next-era="${e}"] > summary`).click(), [BOX, first]);
  await page.waitForTimeout(300);
  st = await state(page);
  const off = st.find((g) => g.era === first), others = st.filter((g) => g.era !== first);
  check(`${tag} OFF hides that era's books, and only that era's`, !off.open && off.shown === 0 && others.every((g) => g.shown === g.books && g.shown > 0), JSON.stringify(st.map((g) => [g.era, g.open, g.shown])));
  if (w === 390 && lang === "en") {
    page = await (async () => { await page.close(); return open(ctx); })(); // the same device, the page opened again
    st = await state(page);
    check(`${tag} the choice is kept on this device (that era is still OFF after opening again, the others ON)`, st.find((g) => g.era === first)?.open === false && st.filter((g) => g.era !== first).every((g) => g.open), JSON.stringify(st.map((g) => [g.era, g.open])));
    await page.evaluate(([box, e]) => document.querySelector(`${box} [data-read-next-era="${e}"] > summary`).click(), [BOX, first]);
    await page.waitForTimeout(300);
    st = await state(page);
    check(`${tag} ON again shows the books again (the way back)`, st.find((g) => g.era === first).open && st.find((g) => g.era === first).shown === st.find((g) => g.era === first).books);
  }
  if (lang === "bn") check(`${tag} the headings read in Bangla`, await page.evaluate((box) => [...document.querySelectorAll(`${box} [data-read-next-era] > summary`)].every((s) => !/[A-Za-z]{4}/.test(s.textContent)), BOX));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Tafsīr era switches${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
