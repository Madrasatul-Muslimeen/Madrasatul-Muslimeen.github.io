// PCF MSA J65 (the Owner, 21 Oct 2026, a screenshot of the Study poster for 22:4: "Enable the poster with Arabic, Eng
// and Bangla options single and multiple to choose from over the words. Try to keep half of the page for Ayah and half
// for words"): the study poster's "Āyah on top" row (Arabic · English · Bangla, any one, several or none), the āyah
// over the word boxes in two equal halves, the āyah's share stepping down only when the words would fall below half
// size, the same in the saved picture, and "This āyah 22:4" (it read "4:4").
// Real data (22:4, 2:255, 36:1–12). Run from the repository root with `node serve.js` running (QR_BASE for another port).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   notop     the poster ignores the chosen lines                  -> "the āyah is over the words" checks
//   nosplit   the words' half is not a fixed half                  -> "two equal halves"
//   noshare   the āyah's share never steps down                    -> "Āyat al-Kursī: the words keep at least half size"
//   nomsg     the warning does not name the āyah on top            -> "Yā-Sīn 1–12 with the āyah on top says what to do"
//   toggle    a pressed line cannot be turned off                  -> "tapping turns a line off again"
//   pictop    the picture ignores the āyah on top                  -> "the picture makes the same choice"
//   label     "This āyah" shows the āyah twice again               -> "the Āyāt choice says This āyah 22:4"
//   bnleak    the row's Bangla name is missing                     -> "Bangla: the row and the summary in Bangla"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  notop: ["app/js/ayah-poster.js", "  const topHtml = tl.length ? `", "  const topHtml = false ? `"],
  nosplit: ["app/ayah-poster.html", "  .ap-kid[data-ap-top] .ap-kid-ayahs { flex: 1 1 0; overflow: hidden; }\n", ""],
  noshare: ["app/js/ayah-poster.js", "export const TOP_SHARES = Object.freeze([0.5, 0.45, 0.4, 0.35, 0.3]);", "export const TOP_SHARES = Object.freeze([0.5]);"],
  nomsg: ["app/ayah-poster.html", "state.kind === \"study\" && state.top.length ? t(", "false ? t("],
  toggle: ["app/ayah-poster.html", "state.top.includes(k) ? state.top.filter((x) => x !== k) : [...state.top, k]", "[...state.top, k]"],
  pictop: ["app/js/ayah-poster-image.js", "  if (kind === \"study\" && topLines(top).length) return paintStudySplit(", "  if (false) return paintStudySplit("],
  label: ["app/ayah-poster.html", "`${t(\"This āyah\")} ${num(state.surah)}:${num(state.ayah)}`", "`${t(\"This āyah\")} ${num(state.ayah)}:${num(state.ayah)}`"],
  bnleak: ["app/js/i18n/bn.js", "  \"Āyah on top\": \"উপরে আয়াত\",\n", ""],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${n}" was given a promise`);
  ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const surah = (n) => JSON.parse(fs.readFileSync(`tools/quran-data-pull/output/surahs/surah_${String(n).padStart(3, "0")}.json`, "utf8"));
const ayah = (s, a) => surah(s).ayahs.find((x) => x.ayah === a);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
async function context(opts = {}) {
  const ctx = await newContext(browser, { banner: false, ...opts });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }));
  }
  return ctx;
}
async function poster(ctx, q) {
  const { page, errors } = await openPage(ctx, `/app/ayah-poster.html?${q}`);
  await page.waitForFunction(() => document.body.dataset.apReady, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);
  return { page, errors };
}
async function openMenu(page) { if ((await page.getAttribute("#apSum", "aria-expanded")) !== "true") await page.click("#apSum"); await page.waitForTimeout(150); }
/** What the poster shows: its top block's lines, the two parts' heights and spill, their --k, and the status line. */
const state = (page) => page.evaluate(() => {
  const p = document.querySelector("#apSheet .ap-poster"), top = p.querySelector(".ap-kid-top"), w = p.querySelector(".ap-kid-ayahs");
  const name = p.querySelector(".ap-kid-head .ap-name"), sheetW = document.getElementById("apSheet").clientWidth;
  return {
    attr: p.getAttribute("data-ap-top"), lines: top ? [...top.children].map((c) => c.className) : [],
    ar: top?.querySelector(".ap-top-ar")?.textContent ?? "", en: top?.querySelector(".ap-top-en")?.textContent ?? "", bn: top?.querySelector(".ap-top-bn")?.textContent ?? "",
    topH: top?.clientHeight ?? 0, wordsH: w.clientHeight, topSpill: top ? top.scrollHeight - top.clientHeight : 0, wordsSpill: w.scrollHeight - w.clientHeight, posterSpill: p.scrollHeight - p.clientHeight,
    kTop: Number(top?.style.getPropertyValue("--k") || 0), kWords: Number(w.style.getPropertyValue("--k") || 0),
    nameRatio: parseFloat(getComputedStyle(name).fontSize) / sheetW, // 7cqw at full size
    status: document.getElementById("apStatus").textContent, warn: document.getElementById("apStatus").classList.contains("ap-warn"),
    url: location.search, sum: document.getElementById("apSumText").textContent,
  };
});
const realErrors = (errs) => errs.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e));

const a224 = ayah(22, 4);
{
  console.log("\n=== 22:4, the āyah over the words (1280) ===");
  const ctx = await context({ viewport: { width: 1280, height: 1000 } });
  let { page, errors } = await poster(ctx, "surah=22&ayah=4&kind=study");
  let s = await state(page);
  check("opened with no choice in the address, the āyah's Arabic is over the words, and the address says top=ar", s.attr === "ar" && s.lines.join() === "ap-ar ap-top-ar" && /[?&]top=ar(&|$)/.test(s.url), JSON.stringify({ a: s.attr, l: s.lines, u: s.url }));
  check("the Arabic over the words is the whole āyah, every word, closed by its number ﴿٤﴾", a224.words.every((w) => s.ar.includes(w.arabic)) && s.ar.trim().endsWith("﴿٤﴾"), s.ar);
  ({ page, errors } = await poster(ctx, "surah=22&ayah=4&kind=study&top=ar,en,bn"));
  s = await state(page);
  check("Arabic + English + Bangla: all three, in that order, with a rule after the Arabic", s.lines.join() === "ap-ar ap-top-ar,ap-top-rule,ap-top-en,ap-top-bn", JSON.stringify(s.lines));
  check("the English and Bangla lines are the āyah's own translations", s.en === a224.translations.en && s.bn === a224.translations.bn, JSON.stringify({ en: s.en.slice(0, 40), bn: s.bn.slice(0, 40) }));
  check("two equal halves: the āyah's part and the words' part are the same height (±1px)", s.topH > 100 && Math.abs(s.topH - s.wordsH) <= 1, JSON.stringify({ t: s.topH, w: s.wordsH }));
  check("nothing is cut: neither half nor the poster spills, and no warning", s.topSpill <= 1 && s.wordsSpill <= 1 && s.posterSpill <= 1 && s.status === "", JSON.stringify(s));
  check("the heading keeps its full size (the sūrah name is 7% of the sheet), the words at least half size", Math.abs(s.nameRatio - 0.07) < 0.002 && s.kWords >= 0.5, JSON.stringify({ n: s.nameRatio, k: s.kWords }));
  check("the summary line says it: Āyah: Arabic+English+Bangla", s.sum.includes("Āyah: Arabic+English+Bangla"), s.sum);
  await openMenu(page);
  const opt = await page.evaluate(() => document.querySelector("#apRange option[value=ayah]")?.textContent);
  check(`the Āyāt choice says "This āyah 22:4" (it said 4:4): ${opt}`, opt === "This āyah 22:4", opt);
  // tapping: English off, Arabic off, Bangla off -> the old layout; then Bangla alone back on
  await page.click("[data-ap-top=en]"); await page.waitForTimeout(250);
  s = await state(page);
  check("tapping English turns that line off again (Arabic and Bangla stay), and the address follows", s.lines.join() === "ap-ar ap-top-ar,ap-top-rule,ap-top-bn" && /top=ar%2Cbn|top=ar,bn/.test(s.url), JSON.stringify({ l: s.lines, u: s.url }));
  await page.click("[data-ap-top=ar]"); await page.waitForTimeout(250);
  await page.click("[data-ap-top=bn]"); await page.waitForTimeout(250);
  s = await state(page);
  const pressed = await page.evaluate(() => [...document.querySelectorAll("button[data-ap-top]")].map((b) => b.getAttribute("aria-pressed")).join());
  check("all three off: no āyah over the words, the words have the whole page again, top=0, no button pressed", s.attr === null && s.lines.length === 0 && /top=0/.test(s.url) && pressed === "false,false,false" && !s.sum.includes("Āyah:"), JSON.stringify({ a: s.attr, u: s.url, p: pressed }));
  await page.click("[data-ap-top=bn]"); await page.waitForTimeout(250);
  s = await state(page);
  check("Bangla alone: just the Bangla translation over the words, no rule, still two halves", s.lines.join() === "ap-top-bn" && Math.abs(s.topH - s.wordsH) <= 1, JSON.stringify({ l: s.lines, t: s.topH, w: s.wordsH }));
  await page.click("[data-ap-kind=dawah]"); await page.waitForTimeout(250);
  const dawahRow = await page.evaluate(() => { const b = document.querySelector("button[data-ap-top]"); return !!b && b.getBoundingClientRect().height > 0; });
  check("the Dawah poster has no Āyah on top row (it is the āyah already)", !dawahRow);
  check("no page errors", realErrors(errors).length === 0, realErrors(errors).slice(0, 2).join(" | "));
  await ctx.close();
}

{
  console.log("\n=== a long āyah and a long range (1280) ===");
  const ctx = await context({ viewport: { width: 1280, height: 1000 } });
  const { page } = await poster(ctx, "surah=2&ayah=255&kind=study&top=ar,bn");
  const s = await state(page);
  check("Āyat al-Kursī with Arabic + Bangla on top: the āyah gives up some of its half so the words keep at least half size, nothing cut", s.topH < s.wordsH && s.kWords >= 0.5 && s.topSpill <= 1 && s.wordsSpill <= 1 && s.status === "", JSON.stringify({ t: s.topH, w: s.wordsH, k: s.kWords, st: s.status }));
  const { page: ys } = await poster(ctx, "surah=36&ayah=1&from=1&to=12&kind=study&top=ar");
  const y = await state(ys);
  check("Yā-Sīn 1–12 with the āyah on top says what to do, in words, never cuts silently", y.warn && /turn Āyah on top off/.test(y.status), JSON.stringify({ w: y.warn, s: y.status }));
  // the picture (ayah-poster-image.js) makes the same choice as the page: the same share, and scales within 0.06
  const pic = async (pg, q) => pg.evaluate(async (q) => {
    const { paintPoster } = await import("./js/ayah-poster-image.js");
    const { posterModel } = await import("./js/ayah-poster.js");
    const { getSurah } = await import("./js/quran-data.js");
    const s = await getSurah(q.s), c = document.createElement("canvas");
    return paintPoster(c, posterModel(s, q.a, q.a), { kind: "study", lang: "both", translit: "latin", top: q.top, paper: "a4", text: {} });
  }, q);
  const kursi = await pic(page, { s: 2, a: 255, top: ["ar", "bn"] });
  const pageShare = s.topH / (s.topH + s.wordsH);
  check(`the picture makes the same choice for Āyat al-Kursī: share ${kursi.share} (page ${pageShare.toFixed(2)}), words ${kursi.k?.toFixed(2)} (page ${s.kWords.toFixed(2)})`, Math.abs(kursi.share - pageShare) < 0.03 && Math.abs(kursi.k - s.kWords) < 0.06 && kursi.fits, JSON.stringify(kursi));
  const { page: p4 } = await poster(ctx, "surah=22&ayah=4&kind=study&top=ar,en,bn");
  const s4 = await state(p4), k4 = await pic(p4, { s: 22, a: 4, top: ["ar", "en", "bn"] });
  check(`the picture for 22:4 is half and half too, at the page's scales (āyah ${k4.kTop?.toFixed(2)} vs ${s4.kTop.toFixed(2)}, words ${k4.k?.toFixed(2)} vs ${s4.kWords.toFixed(2)})`, k4.share === 0.5 && Math.abs(k4.kTop - s4.kTop) < 0.06 && Math.abs(k4.k - s4.kWords) < 0.06 && k4.fits, JSON.stringify(k4));
  await ctx.close();
}

for (const width of [390, 320]) {
  console.log(`\n=== the menu row on a phone (${width}) ===`);
  const ctx = await context({ viewport: { width, height: 844 } });
  const { page } = await poster(ctx, "surah=22&ayah=4&kind=study&top=ar,en");
  await openMenu(page);
  const r = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button[data-ap-top]")], rect = b.map((x) => x.getBoundingClientRect());
    return { n: b.length, rows: new Set(rect.map((x) => Math.round(x.top))).size, small: rect.filter((x) => x.height < 44).length, spill: b.filter((x) => x.scrollWidth > x.clientWidth + 1).map((x) => x.textContent), side: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${width}: the Āyah on top row is three buttons on one line, each 44px+, none cut, no sideways scroll`, r.n === 3 && r.rows === 1 && r.small === 0 && r.spill.length === 0 && r.side <= 0, JSON.stringify(r));
  const s = await state(page);
  check(`${width}: on a phone the poster is still two equal halves, nothing cut`, Math.abs(s.topH - s.wordsH) <= 1 && s.topSpill <= 1 && s.wordsSpill <= 1 && s.status === "", JSON.stringify({ t: s.topH, w: s.wordsH, st: s.status }));
  await ctx.close();
}

{
  console.log("\n=== Bangla (390) ===");
  const ctx = await context({ viewport: { width: 390, height: 844 }, appLang: "bn" });
  const { page } = await poster(ctx, "surah=22&ayah=4&kind=study&top=ar,en");
  await openMenu(page);
  const r = await page.evaluate(() => ({ row: document.querySelector("button[data-ap-top]")?.closest(".ap-grp")?.querySelector(".ap-lab")?.textContent, sum: document.getElementById("apSumText").textContent }));
  check(`Bangla: the row and the summary in Bangla ("${r.row}"; "${r.sum}")`, r.row === "উপরে আয়াত" && r.sum.includes("আয়াত: আরবি+ইংরেজি") && !/Āyah/.test(r.row + r.sum), JSON.stringify(r));
  await ctx.close();
}

console.log(`\n==== Āyah poster, the āyah on top (J65)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
