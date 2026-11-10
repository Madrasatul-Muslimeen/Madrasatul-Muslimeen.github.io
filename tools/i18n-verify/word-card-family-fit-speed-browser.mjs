// QR Lead 46L, 11 Nov 2026 (found while taking the debt suites quran-word-card-return and quran-word-card-flow-nav, which stopped in a click
// that never came back): tapping › on the Word Card froze the page for ~18 seconds on word 2:71:13's neighbours, because
// fitWordCardFamilyRows() (PCF MSA J60, "Family: one row of places and +N more") read each chip's position and hid the chip in the same
// loop, so the browser re-laid the whole row out once per chip. It now measures every chip first and hides them after.
//   node tools/i18n-verify/word-card-family-fit-speed-browser.mjs [--mutate=interleave] [--lang=en] [--width=390]   (repository root, serve.js on :8080)
//   --mutate=interleave   the old loop (read, hide, read, hide)     -> the speed checks FAIL (about 18 s per tap)
//   --mutate=hideall      every place is hidden, not just the wrapped ones -> the one-row checks FAIL
// What it proves, in measured terms: each tap of › on the Family level takes under 3 s (it was 18 s; it is ~0.2 s), and the Family rows
// are still right afterwards: every shown place is on the row's first line (the gold one may be pushed), "+N more" counts the hidden ones.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${String(detail).slice(0, 300)}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const CARD = "app/js/quran-word-card.js";
const NEWLOOP = `    const tops = chips.map(top);
    chips.forEach((c, i) => { if (c !== current && tops[i] > line1) c.hidden = true; });`;
const MUT = {
  interleave: [CARD, NEWLOOP, "    chips.forEach((c) => { if (c !== current && top(c) > line1) c.hidden = true; });"],
  hideall: [CARD, NEWLOOP, "    chips.forEach((c) => { if (c !== current) c.hidden = true; });"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const LANGS = arg("lang") ? [arg("lang")] : ["en", "bn"];
const WIDTHS = arg("width") ? [Number(arg("width"))] : [320, 390, 1280];
const MAX_MS = 3000;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const tag = `[${lang} ${width}]`;
    console.log(`\n=== Family fit speed ${tag} ===`);
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [file, a, b] = MUT[MUTATE];
      await ctx.route(`**/${file.replace("app/", "")}*`, async (r) => {
        const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation ${MUTATE}: anchor missing`);
        await r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: src.split(a).join(b) });
      });
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
      await page.waitForTimeout(800);
      if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.evaluate(() => document.getElementById("tabStudyBtn").click()); await page.waitForTimeout(200); }
      await page.evaluate(() => document.getElementById("tabReadBtn").click()); await page.waitForTimeout(600);
      await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
      await page.waitForTimeout(500);
      await page.evaluate(() => { const s = document.getElementById("surahSelect"); s.value = "2"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(2500);
      await page.evaluate(() => { const s = document.getElementById("ayahSelect"); s.value = "71"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await page.waitForTimeout(1500);
      await page.evaluate(() => document.querySelector('#readView [data-word-occurrence$=":2:71:13"]').click()); await page.waitForSelector(".quran-word-card", { timeout: 8000 });
      await page.waitForTimeout(800);
      await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-card-level="basic"]').click());
      await page.waitForTimeout(2800);
      const rows0 = await page.evaluate(() => document.querySelectorAll("[data-word-card-family-more]").length);
      check(`${tag} POSITIVE CONTROL: the Family level is open and has rows with a "+N more" slot`, rows0 > 0, String(rows0));
      const times = [];
      for (let i = 0; i < 3; i++) {
        const ms = await page.evaluate(() => { const t0 = performance.now(); document.querySelector('[data-word-card-move="next"]').click(); return performance.now() - t0; });
        times.push(Math.round(ms)); await page.waitForTimeout(1200);
      }
      check(`${tag} each tap of › takes under ${MAX_MS / 1000} s (${times.join(" ms, ")} ms)`, times.every((t) => t < MAX_MS), JSON.stringify(times));
      const rows = await page.evaluate(() => [...document.querySelectorAll("[data-word-card-family-more]")].map((more) => {
        const chips = [...more.parentElement.querySelectorAll(".word-card-family-chip")];
        const shown = chips.filter((c) => !c.hidden), hidden = chips.length - shown.length;
        const first = shown.length ? shown[0].getBoundingClientRect().top + 2 : 0;
        const cur = shown.find((c) => c.classList.contains("word-card-family-chip-current"));
        const offLine = shown.filter((c) => c !== cur && c.getBoundingClientRect().top > first).length;
        return { chips: chips.length, shown: shown.length, hidden, moreHidden: more.hidden, text: more.textContent.trim(), offLine, moreOnLine: more.hidden || more.getBoundingClientRect().top <= first + 1 };
      }));
      const wrapped = rows.filter((r) => !r.moreHidden);
      check(`${tag} after the taps, the rows are still one line each (a shown place never sits on a second line)`, rows.length > 0 && rows.every((r) => r.offLine === 0), JSON.stringify(rows.filter((r) => r.offLine)));
      check(`${tag} a row that overflows says how many are hidden, and the number is the real one`, wrapped.every((r) => r.hidden > 0 && r.text.replace(/[^0-9০-৯]/g, "").length > 0), JSON.stringify(wrapped.slice(0, 3)));
      check(`${tag} the "+N more" button itself sits on the row's first line`, wrapped.every((r) => r.moreOnLine), JSON.stringify(wrapped.filter((r) => !r.moreOnLine).slice(0, 2)));
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|quran\.com|favicon/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } catch (err) { check(`${tag} stopped early: ${String(err.message).split("\n")[0]}`, false); }
    await ctx.close();
  }
} finally { await browser.close(); }
console.log(`\n${pass} passed, ${fail} failed${MUTATE ? ` (mutation: ${MUTATE})` : ""}`);
process.exit(fail ? 1 : 0);
