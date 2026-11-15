// The Owner's colour combination "Soft Meadow" (16 Nov 2026) for the five Word Card level tabs, in order:
// WbW Tea Green #D0F0C0, Root Sea Foam #A8D5CE, Family Thistle #D8BFD8, Taṣrīf Moccasin #FFE4B5, Depth Silver #C0C0C0.
// Run from the repository root with serve.js on :8080 (QR_BASE).  Mutations (--mutate=NAME) must each FAIL:
//   swap   Family and Taṣrīf swap colours      -> "each tab wears its level's colour" fails
//   greyed the colours are removed             -> the same check fails
//   nobar  the open tab loses its colour bar   -> "the open tab shows its colour as a bar" fails
//   dim    tab text turned pale                -> the 4.5:1 contrast check fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const F = "app/quranrevival.html";
const MUT = {
  swap: [F, "--wc-lvl-basic: #D8BFD8; --wc-lvl-tasrif: #FFE4B5;", "--wc-lvl-basic: #FFE4B5; --wc-lvl-tasrif: #D8BFD8;"],
  greyed: [F, '[data-word-card-level]:not([aria-selected="true"]) { background: var(--wc-lvl); color: #1b2a41; }', '[data-word-card-level]:not([aria-selected="true"]) { color: #1b2a41; }'],
  nobar: [F, "box-shadow: inset 0 -5px 0 var(--wc-lvl); }", "}"],
  dim: [F, "background: var(--wc-lvl); color: #1b2a41; }", "background: var(--wc-lvl); color: #e8e8e8; }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const LEVELS = ["wbw", "intermediate", "basic", "tasrif", "depth"];
const WANT = ["rgb(208, 240, 192)", "rgb(168, 213, 206)", "rgb(216, 191, 216)", "rgb(255, 228, 181)", "rgb(192, 192, 192)"];
const lum = (c) => { const v = c.match(/\d+/g).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const width of [320, 390, 768, 1280]) {
  const tag = `[${width}]`;
  console.log(`\n=== Word Card level colours ${tag} ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: "text/html", body: src.replace(a, b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "14"; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = "22"; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":14:22:1"]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":14:22:8"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const read = () => page.evaluate(() => [...document.querySelectorAll('#quranWordCardMount [role="tab"]')].map((t) => { const cs = getComputedStyle(t); return { level: t.dataset.wordCardLevel, sel: t.getAttribute("aria-selected") === "true", bg: cs.backgroundColor, fg: cs.color, shadow: cs.boxShadow }; }));
  const t0 = await read();
  check(`${tag} five tabs found in order`, JSON.stringify(t0.map((t) => t.level)) === JSON.stringify(LEVELS), JSON.stringify(t0));
  const open0 = t0.findIndex((t) => t.sel);
  const others = t0.map((t, i) => [t, i]).filter(([t]) => !t.sel);
  check(`${tag} each tab wears its level's colour while not open`, others.length === 4 && others.every(([t, i]) => t.bg === WANT[i]), JSON.stringify(others.map(([t]) => t.bg)));
  check(`${tag} tab text keeps 4.5:1 on its colour`, others.every(([t]) => ratio(t.fg, t.bg) >= 4.5), JSON.stringify(others.map(([t]) => [t.fg, t.bg, +ratio(t.fg, t.bg).toFixed(2)])));
  // open every tab in turn: the open one shows its own colour as a bar, and the rest keep theirs
  let allBars = true, restKept = true, why = "";
  for (let i = 0; i < 5; i++) {
    await page.evaluate((l) => document.querySelector(`#quranWordCardMount [data-word-card-level="${l}"]`)?.click(), LEVELS[i]);
    await page.waitForTimeout(500);
    const t = await read();
    if (!(t[i].sel && t[i].shadow.includes(WANT[i]))) { allBars = false; why += ` open ${LEVELS[i]}: ${t[i].shadow}`; }
    if (!t.every((x, j) => j === i || x.bg === WANT[j])) { restKept = false; why += ` rest ${LEVELS[i]}`; }
  }
  check(`${tag} the open tab shows its colour as a bar`, allBars, why);
  check(`${tag} the other four keep their colours when another tab opens`, restKept, why);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
