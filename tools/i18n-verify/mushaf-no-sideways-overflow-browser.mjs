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
  // The Read view CLIPS rather than scrolls: body.read-sideways and #readScroll
  // both carry overflow-x: hidden, so a too-wide Mushaf is CUT, and
  // scrollWidth can never show it (a 36px-too-wide container measured over=0).
  // So measure containment directly. The whole-surah view lays pages side by
  // side in #pageViewContainer's own scroller, so words on other pages are
  // legitimately off screen: the page being read is the one centred in view.
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; };
  const within = (inner, outer) => inner.l >= outer.l - 0.5 && inner.r <= outer.r + 0.5;
  const rs = document.getElementById("readScroll"), pvc = document.getElementById("pageViewContainer");
  const pages = [...document.querySelectorAll("#pageViewContainer .hifz-page")];
  const pv = pvc ? box(pvc) : null, mid = pv ? (pv.l + pv.r) / 2 : 0;
  const current = pages.map((pg) => ({ pg, b: box(pg) })).sort((x, y) =>
    Math.abs((x.b.l + x.b.r) / 2 - mid) - Math.abs((y.b.l + y.b.r) / 2 - mid))[0];
  // Every word's GLYPH (its box minus the invisible tap-area padding) inside
  // its own page, on every page.
  const wordsOut = [];
  for (const pg of pages) {
    const pb = box(pg);
    for (const w of pg.querySelectorAll(".hifz-word")) {
      const r = w.getBoundingClientRect(); if (!r.width) continue;
      const cs = getComputedStyle(w);
      const g = { l: r.left + parseFloat(cs.paddingLeft), r: r.right - parseFloat(cs.paddingRight) };
      if (!within(g, pb)) wordsOut.push(`${w.getAttribute("data-word-occurrence") || w.textContent} ${g.l.toFixed(1)}-${g.r.toFixed(1)} page ${pb.l.toFixed(1)}-${pb.r.toFixed(1)}`);
    }
  }
  return {
    areaInside: !!(rs && pv && within(pv, box(rs))),
    pageInside: !!(current && pv && within(current.b, pv)),
    boxes: { readScroll: rs && box(rs), pageView: pv, page: current && current.b },
    wordsChecked: pages.reduce((n, pg) => n + pg.querySelectorAll(".hifz-word").length, 0),
    wordsOut: wordsOut.slice(0, 5), wordsOutCount: wordsOut.length,
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
      check(`[s${SURAH} ${lang} ${width}] ${label}: the Mushaf area sits inside the visible reading area`, m.areaInside, JSON.stringify(m.boxes));
      check(`[s${SURAH} ${lang} ${width}] ${label}: the page being read sits inside the Mushaf area`, m.pageInside, JSON.stringify(m.boxes));
      check(`[s${SURAH} ${lang} ${width}] ${label}: every word's glyph sits inside its own page (${m.wordsChecked} words)`, m.wordsChecked > 0 && m.wordsOutCount === 0, `${m.wordsOutCount} out: ${JSON.stringify(m.wordsOut)}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
