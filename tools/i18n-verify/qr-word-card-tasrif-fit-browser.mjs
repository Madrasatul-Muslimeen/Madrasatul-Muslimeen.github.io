// QR Lead audit 6, 31 Oct 2026 (Word card, PCF User Manual 9a6dqv8): Taṣrīf's case table with larger text. Measured on main
// v13.01 with this suite's probe: under 26rem the table sizes its columns to their contents, and with larger text on a phone
// it needed about 15rem, so it ran past the card (474px in 316 at 360x740 200%, 443 in 276 at 320x640 200%, 359 in 357 at
// 390x844 150%, Bangla 433 in 316): the whole card slid sideways and its top bar was cut ("s āyah ⋯"). Under 18rem each row's
// name now takes a line above its three cells, which share the card's width. At ordinary text nothing moves (PLAIN).
//   node tools/i18n-verify/qr-word-card-tasrif-fit-browser.mjs [--mutate=NAME] [--main]   (serve.js on :8080, repo root)
//   no-stack   the 18rem rule is gone             -> "the table stays inside the card" FAILS at 150/200% on phones
//   no-grid    the rows keep their table cells     -> "the three cases share the card's width" FAILS at 150/200%
//   wide       the rule starts at 26rem            -> "nothing moves at ordinary text" FAILS at 320/360/390 100%
import { execSync } from "node:child_process";
import { chromium, newContext, openPage } from "./harness.mjs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const ON_MAIN = process.argv.includes("--main");
// [from, to, copies]: every copy is replaced, and the count must be exactly as written.
const MUT = {
  "no-stack": ["@container wordcard (max-width: 18rem) {", "@container wordcard (max-width: 1px) {", 1],
  "no-grid": ["    .word-card-ntable tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; margin-bottom: 3px; }\n", "", 1],
  "wide": ["@container wordcard (max-width: 18rem) {", "@container wordcard (max-width: 26rem) {", 1],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
// Recorded from unfixed main v13.01 at 100%: the table's width and its first row's cell widths.
const PLAIN = { "320x640 en": [276, "50,73,73,65,50"], "360x740 en": [316, "50,85,85,80,50"], "360x740 bn": [316, "51,78,78,94,51"],
  "390x844 en": [346, "50,94,94,93,50"], "768x1024 en": [724, "177,177,177,177,177"], "740x360 bn": [696, "170,170,170,170,170"] };
const MAIN = ON_MAIN ? execSync("git show origin/main:app/quranrevival.html", { maxBuffer: 1 << 26 }).toString() : "";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

for (const [w, h, lang] of [[320, 640, "en"], [360, 740, "en"], [360, 740, "bn"], [390, 844, "en"], [768, 1024, "en"], [740, 360, "bn"]]) for (const size of ["100%", "150%", "200%"]) {
  const tag = `${w}x${h} ${lang} ${size}`, key = `${w}x${h} ${lang}`;
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width: w, height: h } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE || ON_MAIN) await ctx.route("**/app/quranrevival.html*", async (r) => {
    const res = await r.fetch(); let body = ON_MAIN ? MAIN : await res.text();
    if (MUTATE) { const [from, to, n] = MUT[MUTATE]; const c = body.split(from).length - 1; if (c !== n) throw new Error(`mutation ${MUTATE}: anchor found ${c} times, not ${n}`); body = body.split(from).join(to); }
    r.fulfill({ response: res, body });
  });
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForFunction(() => document.querySelector("#wheelContainer svg"), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .mm-splash-overlay').forEach((e) => e.remove()));
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m.checked) { m.checked = false; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, size); await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector("#readView [data-word-occurrence]")?.click());
  await page.waitForFunction(() => document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]'), null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]')?.click());
  await page.waitForFunction(() => document.querySelector(".word-card-ntable"), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const R = (e) => e.getBoundingClientRect(), t = document.querySelector(".word-card-ntable");
    if (!t) return null;
    const box = t.parentElement, b = R(box), r = R(t);
    // Every element the card scrolls sideways shows up as a scroller whose content is wider than it is.
    const slid = [...document.querySelectorAll("#quranWordCardMount *")].filter((e) => e.scrollLeft > 0 || (e.scrollWidth > e.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(e).overflowX))).length;
    const cells = [...t.querySelectorAll("tbody tr:first-child td")].map((e) => Math.round(R(e).width));
    const top = document.querySelector('#quranWordCardMount [data-word-card-level="tasrif"]'), tr = R(top);
    return { tW: Math.round(r.width), cols: [...t.querySelectorAll("tr:first-child th")].map((e) => Math.round(R(e).width)).join(","),
      inside: r.left >= b.left - 1 && r.right <= b.right + 1, cellsMin: Math.min(...cells), boxW: Math.round(b.width), slid,
      tabOn: tr.left >= -1 && tr.right <= innerWidth + 1, n: t.querySelectorAll("[data-noun-cell]").length };
  });
  check(`${tag}: POSITIVE CONTROL Taṣrīf's case table is shown, with its nine boxes`, !!m && m.n >= 9, JSON.stringify(m));
  if (m) {
    check(`${tag}: the table stays inside the card`, m.inside, `table ${m.tW}px in ${m.boxW}px`);
    check(`${tag}: the card does not slide sideways, and its level tabs stay on the screen`, m.slid === 0 && m.tabOn, JSON.stringify(m));
    if (size !== "100%" && w < 600) check(`${tag}: the three cases share the card's width (each at least a quarter of it)`, m.cellsMin >= m.boxW / 4, `${m.cellsMin}px of ${m.boxW}px`);
    if (size === "100%") check(`${tag}: nothing moves at ordinary text`, m.tW === PLAIN[key][0] && m.cols === PLAIN[key][1], `${m.tW} ${m.cols} vs ${PLAIN[key]}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
