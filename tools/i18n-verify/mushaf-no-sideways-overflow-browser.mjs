// Issue #393 -- the Mushaf (page) view must not scroll sideways. It measured
// ~3px at 768px. Walks every element and names any whose right edge passes
// the viewport, at nine widths in both languages. It serves the REAL Mushaf
// layout and page fonts from this repository (mushaf/), because an overflow
// depends on real glyph widths and a fallback font cannot reproduce them.
// Surah 2 opens on the dense full pages; surah 14 on a mid-Mushaf page.
// Run from the repository root. PROBE=1 prints every measurement.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";
const REAL = fs.readFileSync("mushaf/mushaf-madani-v2.json");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const PROBE = process.env.PROBE === "1";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";
async function enterReadView(page) {
  const reachable = await page.evaluate(() => {
    const b = document.getElementById("tabReadBtn");
    return !!b && b.getBoundingClientRect().width > 0;
  });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
}

async function openMushafOnSurah(page, surahNum) {
  await page.evaluate((s) => {
    const sel = document.getElementById("surahSelect");
    sel.value = String(s); sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, surahNum);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const sel = document.getElementById("unitTypeSelect");
    sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const m = document.getElementById("mushafToggle");
    if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForFunction(() => !!document.querySelector("#pageViewContainer .hifz-page"), null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
}

const measure = (page) => page.evaluate(() => {
  const cw = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > cw + 0.5) offenders.push(`${el.tagName}#${el.id}.${String(el.className).slice(0, 40)} right=${r.right.toFixed(1)}`);
  }
  return {
    over: document.documentElement.scrollWidth - cw,
    hasPage: !!document.querySelector("#pageViewContainer .hifz-page"),
    fontsLoaded: [...document.fonts].filter((f) => /^hifz-p\d+$/.test(f.family) && f.status === "loaded").length,
    offenders: offenders.slice(0, 8),
  };
});

for (const SURAH of [2, 14]) for (const width of [320, 360, 390, 412, 600, 768, 834, 1024, 1280]) {
  for (const lang of ["en", "bn"]) {
    const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width >= 768 ? 1024 : 800 } });
    await ctx.route(MUSHAF_JSON_URL, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: REAL }));
    await ctx.route(`${MUSHAF_FONT_BASE}**`, (route) => { const f = route.request().url().split("/").pop(); route.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/fonts/" + f) }); });
    await ctx.route(SURAH_HEADER_FONT_URL, (route) => route.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync("mushaf/QCF_SurahHeader_COLOR-Regular.woff2") }));
    const { page } = await openPage(ctx, "/app/quranrevival.html");
    await enterReadView(page);
    await openMushafOnSurah(page, SURAH);
    const states = [["whole surah", async () => {}],
      ["page unit", async () => {
        await page.evaluate(() => { const s = document.getElementById("unitTypeSelect"); s.value = "page"; s.dispatchEvent(new Event("change", { bubbles: true })); });
        await page.waitForTimeout(800);
      }],
      ["full screen", async () => {
        await page.evaluate(() => document.getElementById("hideChromeBtn")?.click());
        await page.waitForTimeout(500);
      }]];
    for (const [label, go] of states) {
      await go();
      const m = await measure(page);
      if (PROBE || m.over > 0) console.log(SURAH, width, lang, label, JSON.stringify(m));
      check(`[s${SURAH} ${lang} ${width}] ${label}: a Mushaf page is really rendered (positive control)`, m.hasPage, JSON.stringify(m));
      check(`[s${SURAH} ${lang} ${width}] ${label}: the real Mushaf page fonts loaded (positive control)`, m.fontsLoaded > 0, JSON.stringify(m));
      check(`[s${SURAH} ${lang} ${width}] ${label}: no sideways overflow`, m.over <= 0, JSON.stringify(m));
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
