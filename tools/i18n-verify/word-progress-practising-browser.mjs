// Decision 59 / issue #520 -- Practising as the fourth Word card stage on all
// three levels, stored as code "p", NOT known; and every pressed stage button
// wearing its stage's colour. en and bn at 320/390/1280. Expected values are
// written by hand (STATUS_COLORS in mastery-wheel.js), never read from code.
// Run from the repository root with `node serve.js` running.
//   --mutate-known  makes resolveWordProgress() count Practising as known (route
//                   rewrite); the totals / known-count / Mark words checks must fail.
//   --shots         screenshots of the progress row to /tmp/practising-*.png
//   --lang=en|bn, --width=N  narrow a run.
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const only = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const MUTATE = process.argv.includes("--mutate-known");
const SHOTS = process.argv.includes("--shots");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

const LABELS = {
  en: ["Not started", "Learning", "Practising", "Achieved"],
  bn: ["শুরু হয়নি", "শিখছি", "অনুশীলন করছি", "অর্জিত হয়েছে"],
};
const ORDER = ["not_started", "learning", "practising", "achieved"];
// Hand-written from STATUS_COLORS, as the browser prints them.
const BG = { not_started: "rgb(51, 63, 92)", learning: "rgb(138, 106, 53)", practising: "rgb(201, 162, 75)", achieved: "rgb(91, 132, 196)" };
const BN_DIGITS = /[০-৯]/g;
const western = (s) => String(s).replace(BN_DIGITS, (d) => String(d.charCodeAt(0) - 0x09E6));

function lum([r, g, b]) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
const rgbOf = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

const SEED = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__wbw__1_7", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 7, entries: { "6": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } },
];
DATA.quranWordApprovals = [];
DATA.quranWordTotals = [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", level: "wbw", known: 100, total: 77429, byJuz: {} }];
`;

async function openWord(page, position) {
  await page.evaluate(() => document.querySelector("[data-word-card-close]")?.click());
  await page.waitForTimeout(250);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(600);
  // 1:7:6 -- its lemma occurs once in the whole Qur'an, so a press moves the "You know" total by exactly one.
  // UPDATED IN PLACE (#665): since issue #606 (decisions 76-77) the Fatiha count is on, and internal 1:7 shows as TWO
  // displayed Ayat -- option "7" is half a (words 1-4), option "8" is half b (words 5-9). Word 6 lives in "8".
  await page.evaluate(() => { const s = document.getElementById("ayahSelect"); if (s && s.value !== "8") { s.value = "8"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction((p) => !!document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`), position, { timeout: 8000 }).catch(() => {});
  await page.evaluate((p) => { document.querySelector(`[data-word-occurrence$=":1:7:${p}"]`)?.click(); }, position);
  await page.waitForFunction(() => { const b = document.querySelector("#quranWordCardMount [data-word-progress]"); return !!b && !!b.querySelector("[data-word-progress-state]"); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
}
const readRow = (page) => page.evaluate(() => {
  const b = document.querySelector("#quranWordCardMount [data-word-progress]");
  if (!b) return null;
  const buttons = [...b.querySelectorAll("[data-word-progress-state]")].map((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { state: el.dataset.wordProgressState, text: el.textContent.trim(), pressed: el.getAttribute("aria-pressed") === "true", top: Math.round(r.top), h: Math.round(r.height), bg: cs.backgroundColor, fg: cs.color, cut: el.scrollWidth > el.clientWidth + 1 };
  });
  return {
    buttons, review: !!b.querySelector("[data-word-progress-review]"),
    coverage: b.querySelector(".word-progress-coverage")?.textContent ?? "",
    wbwKnown: b.querySelector('[data-whole-quran-level="wbw"] .word-progress-whole-quran-num')?.textContent ?? "",
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
const lastWrite = (page, level) => page.evaluate((l) => (window.__stubWriteData || []).filter((w) => w.col === "quranWordProgress" && (w.id || "").includes(`__${l}__`)).at(-1), level);
const press = async (page, state) => { await page.click(`#quranWordCardMount [data-word-progress-state="${state}"]`); await page.waitForTimeout(450); };
const neat = (tops) => { const u = [...new Set(tops)]; return tops.length === 4 && (u.length === 1 || (u.length === 2 && tops.filter((t) => t === u[0]).length === 2)); };

for (const lang of ["en", "bn"].filter((l) => !only("lang") || only("lang") === l)) {
  for (const width of [320, 390, 1280].filter((w) => !only("width") || Number(only("width")) === w)) {
    for (const look of ["night", "light"]) {
      const L = `${lang}/${width}/${look}`;
      console.log(`\n=== ${L} ===`);
      const ctx = await newContext(browser, { appLang: lang, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: SEED });
      await ctx.addInitScript((l) => { try { localStorage.setItem("mm_card_look", l); } catch {} }, look);
      if (MUTATE) {
        await ctx.route("**/js/quran-word-progress.js", async (route) => {
          const res = await route.fetch();
          const body = (await res.text()).replace('const claimed = l.state === "achieved";', 'const claimed = l.state === "achieved" || l.state === "practising";');
          await route.fulfill({ response: res, body });
        });
      }
      const { page } = await openPage(ctx, "/app/quranrevival.html");
      await page.waitForTimeout(600);
      await openWord(page, 6);

      for (const level of ["wbw", "basic", "depth"]) {
        const T = `[${L} ${level}]`;
        if (level !== "wbw") {
          await page.click(`#quranWordCardMount [data-word-card-level="${level}"]`);
          await page.waitForTimeout(500);
        }
        let row = await readRow(page);
        check(`${T} four buttons in order, right labels`, !!row && JSON.stringify(row.buttons.map((b) => b.state)) === JSON.stringify(ORDER) && JSON.stringify(row.buttons.map((b) => b.text)) === JSON.stringify(LABELS[lang]), JSON.stringify(row?.buttons.map((b) => [b.state, b.text])));
        if (!row) continue;
        check(`${T} one row or a tidy 2 x 2, each >=40px, no label cut, no sideways scroll`, neat(row.buttons.map((b) => b.top)) && row.buttons.every((b) => b.h >= 40 && !b.cut) && row.overflowX <= 0, JSON.stringify({ tops: row.buttons.map((b) => b.top), h: row.buttons.map((b) => b.h), cut: row.buttons.map((b) => b.cut), ox: row.overflowX }));
        if (SHOTS && look === "night") await page.screenshot({ path: `/tmp/practising-${lang}-${width}-${level}.png` });

        // Colours: press each stage, expect its own background; text >= 4.5:1.
        for (const state of ["learning", "practising", "achieved"]) {
          await press(page, state);
          row = await readRow(page);
          const b = row.buttons.find((x) => x.state === state);
          const others = row.buttons.filter((x) => x.pressed).map((x) => x.state);
          check(`${T} pressing ${state}: only it is pressed, in ${BG[state]}`, b.pressed && others.length === 1 && b.bg === BG[state], JSON.stringify(b));
          check(`${T} ${state} text on its colour is >= 4.5:1`, ratio(rgbOf(b.fg), rgbOf(b.bg)) >= 4.5, `${b.fg} on ${b.bg} = ${ratio(rgbOf(b.fg), rgbOf(b.bg)).toFixed(2)}`);
          if (state === "practising") {
            const w = await lastWrite(page, level);
            const idOk = new RegExp(`__p1__${level}__1_7$`).test(w?.id ?? "");
            const ent = w?.data?.["entries.6"] ?? w?.data?.entries?.["6"];
            check(`${T} Practising wrote state p on the same document and fields as Learning`, idOk && ent?.s === "p" && ent?.by === "p1", JSON.stringify(w));
            check(`${T} Practising shows no review / approval line`, !row.review);
          }
        }
        await press(page, "not_started");
        row = await readRow(page);
        const ns = row.buttons.find((x) => x.state === "not_started");
        check(`${T} pressing Not started: its dark colour, text >= 4.5:1`, ns.pressed && ns.bg === BG.not_started && ratio(rgbOf(ns.fg), rgbOf(ns.bg)) >= 4.5, JSON.stringify(ns));
        const un = row.buttons.find((x) => x.state === "learning");
        check(`${T} an unpressed button keeps the plain look (not a stage colour)`, !un.pressed && un.bg !== BG.learning, un.bg);
      }

      // Totals, WbW only (the whole-Qur'an total is WbW's): Achieved -> Practising goes DOWN by one.
      await page.click('#quranWordCardMount [data-word-card-level="wbw"]');
      await page.waitForTimeout(400);
      // The stub never applies a running-counter increment to its own data (a known harness trait), so the total is
      // proved by the increments the page WROTE to quranWordTotals, summed.
      const netKnown = (from) => page.evaluate((n) => (window.__stubWriteData || []).filter((w) => w.col === "quranWordTotals").slice(n).reduce((t, w) => t + (w.data?.known?.__increment ?? 0), 0), from);
      const totalsWrites = () => page.evaluate(() => (window.__stubWriteData || []).filter((w) => w.col === "quranWordTotals").length);
      let n0 = await totalsWrites();
      await press(page, "achieved");
      const up = await netKnown(n0);
      const a = await readRow(page);
      n0 = await totalsWrites();
      await press(page, "practising");
      const down = await netKnown(n0);
      const p = await readRow(page);
      const cov = (r) => (western(r.coverage).match(/\d+/g) || []).map(Number);
      check(`[${L}] "You know (WbW)": Not started -> Achieved adds one, Achieved -> Practising takes exactly one away`, up === 1 && down === -1, `up ${up}, down ${down}`);
      check(`[${L}] the āyah's known count goes down by one (1 -> 0), total unchanged`, cov(a).length === 2 && cov(p).length === 2 && cov(a).includes(1) && cov(p).includes(0) && Math.max(...cov(a)) === Math.max(...cov(p)) && Math.max(...cov(a)) > 1, `${a.coverage} -> ${p.coverage}`);
      await ctx.close();
    }
  }
}

// Mark words: a Practising word is amber (unknown), never green (known).
if (!only("lang") || only("lang") === "en") {
  console.log("\n=== Mark words, en/390 ===");
  const s1 = JSON.parse(fs.readFileSync("tools/quran-data-pull/output/surahs/surah_001.json", "utf8"));
  const occ = (a, p) => `quran-word-occurrence:v1:1:${a}:${p}`;
  const w = (a, p, g) => ({ g, loc: `1:${a}:${p}` });
  const MUSHAF = { "1": [{ type: "ayah", words: [w(1, 1, "ٱسْمِ"), w(1, 2, "ٱللَّهِ"), w(1, 3, "ٱلرَّحْمَٰنِ"), w(1, 4, "ٱلرَّحِيمِ"), w(1, 5, "Ⓜ")] }] };
  void s1;
  const seed = `
DATA.quranWordProgress = [
  { _id: TENANT_ID + "__p1__wbw__1_1", contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1", lane: "learner",
    tenantId: TENANT_ID, personId: "p1", level: "wbw", surah: 1, ayah: 1, entries: { "1": { s: "p", at: "2026-09-13T10:00:00.000Z", by: "p1" }, "4": { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } },
];
DATA.quranWordApprovals = [];`;
  const ctx = await newContext(browser, { viewport: { width: 390, height: 844 }, extraSeedJs: seed });
  if (MUTATE) {
    await ctx.route("**/js/quran-word-progress.js", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()).replace('const claimed = l.state === "achieved";', 'const claimed = l.state === "achieved" || l.state === "practising";') });
    });
  }
  await ctx.route("https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MUSHAF) }));
  await ctx.route("https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/**", (r) => r.abort("failed"));
  await ctx.route("https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2", (r) => r.abort("failed"));
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await page.waitForTimeout(600);
  const reachable = await page.evaluate(() => { const b = document.getElementById("tabReadBtn"); return !!b && b.getBoundingClientRect().width > 0; });
  if (!reachable) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => { const sel = document.getElementById("unitTypeSelect"); sel.value = "surah"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const m = document.getElementById("mushafToggle"); if (m && !m.checked) { m.checked = true; m.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForFunction(() => !!document.querySelector(".hifz-word[data-word-occurrence]"), null, { timeout: 12000 }).catch(() => {});
  const marks = (cls) => page.evaluate((c) => [...document.querySelectorAll(`.hifz-word.${c}`)].map((e) => e.dataset.wordOccurrence).sort(), cls);
  await page.evaluate(() => document.querySelector('[data-mark-words-mode="unknown"]').click());
  await page.waitForTimeout(1500);
  const unknown = await marks("is-unknown-word"), known = await marks("is-known-word");
  check("[marks] Unknown mode: the Practising word 1:1:1 is amber", unknown.includes(occ(1, 1)), JSON.stringify(unknown));
  check("[marks] the Practising word is never green; only the Achieved 1:1:4 is known", !known.includes(occ(1, 1)) && known.length <= 1 && !unknown.includes(occ(1, 4)), JSON.stringify({ known, unknown }));
  await ctx.close();
}

await browser.close();
console.log(`\n==== Practising word stage (browser): ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
