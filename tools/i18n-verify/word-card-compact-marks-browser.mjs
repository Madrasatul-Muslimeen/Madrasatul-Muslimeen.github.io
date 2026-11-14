// The Owner, 15 Nov 2026 (the Word Card's marking area on a phone: "make all titles look similar, elegant, tiny but noticeable; make the Arabic Learn next word 20%
// smaller; move the 'how hard' line below Bangla Marking; can you try to fit the 6 Mark the Word chips in one row?"). Proves, at 320 / 360 / 390 (English and Bangla)
// and 1280:
//   * the four titles (Word Progress, Mark the Word, the Bangla marking, Learn the Next Word) share ONE look and are tiny (<= 12px);
//   * below 560px the six chips stand in ONE row, equal width, none cut and none broken mid-word, 44px+ tall;
//   * the "How hard was it, in this sūrah" line sits after the Bangla marking and before Learn the Next Word, no longer inside Mark the Word;
//   * the Arabic in Learn the Next Word is 56% of the Word Card's other small Arabic (the 13 Nov 30% less, then 20% smaller again).
//   --mutate=chips3   a phone's chips go back to three to a row   -> the "one row" check FAILS by name
//   --mutate=howup    the "how hard" line goes back inside Mark the Word -> the order check FAILS by name
//   --mutate=titles   the shared title look is removed             -> the "one look" check FAILS by name
//   --mutate=bigar    the Learn next Arabic goes back to 70%        -> the Arabic check FAILS by name
// Run from the repository root with serve.js up:  node tools/i18n-verify/word-card-compact-marks-browser.mjs [--mutate=NAME] [--lang=en|bn]
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate");
const PAGE = "app/quranrevival.html";
const MUT = {
  chips3: ["grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr)); gap: 0.25rem; }", "grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.25rem; }"],
  howup: ['effort: marksStore.mineEffort[unitKey] ?? null, lang, heading, busy: marksBusy.has(unitKey), note: wordEffortNote.unitKey === unitKey ? wordEffortNote.text : "", detailsHtml: "" });', 'effort: marksStore.mineEffort[unitKey] ?? null, lang, heading, busy: marksBusy.has(unitKey), note: wordEffortNote.unitKey === unitKey ? wordEffortNote.text : "", detailsHtml: wordEffortDetailsFor(surah) });'],
  titles: [".quran-word-card .word-progress-heading-phone, .quran-word-card .we-row > .we-label, .quran-word-card .bnk-row > .we-label, .quran-word-card .word-card-learnnext-title {", ".quran-word-card .never-matches-xyz {"],
  bigar: [".quran-word-card .word-card-learnnext .word-card-learnnext-ar { font-size: calc(var(--wc-small-ar) * 0.56); }", ".quran-word-card .word-card-learnnext .word-card-learnnext-ar { font-size: calc(var(--wc-small-ar) * 0.7); }"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const CASES = [[320, "en"], [360, "en"], [390, "en"], [390, "bn"], [1280, "en"]].filter(([, l]) => !arg("lang") || l === arg("lang"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const [width, lang] of CASES) {
    const tag = `[${lang} ${width}]`;
    const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: 900 } });
    await ctx.route("**/archive.org/**", (r) => r.abort());
    if (MUTATE) {
      const [a, b] = MUT[MUTATE], src = fs.readFileSync(PAGE, "utf8");
      if (src.split(a).length !== 2) throw new Error(`mutation ${MUTATE}: anchor found ${src.split(a).length - 1} times, not 1`);
      await ctx.route("**/app/quranrevival.html*", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: src.replace(a, b) }));
    }
    const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
    try {
      await page.waitForTimeout(600);
      if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
      await page.click("#tabVocabularyBtn");
      await page.waitForFunction(() => document.querySelectorAll("#learnNextSheet .ln-row").length > 0, null, { timeout: 15000 }).catch(() => {});
      await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-row="1"]')?.click());
      await page.waitForFunction(() => !!document.querySelector("#quranWordCardMount .word-card-markrow") && !!document.querySelector("#quranWordCardMount [data-word-effort-details]"), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => {
        const root = document.querySelector("#quranWordCardMount .quran-word-card"); if (!root) return null;
        const st = (el) => { if (!el) return null; const c = getComputedStyle(el); return { fs: parseFloat(c.fontSize), ls: c.letterSpacing, tt: c.textTransform, fw: c.fontWeight, color: c.color }; };
        const titles = { progress: st(root.querySelector(".word-progress-heading-phone")), mark: st(root.querySelector(".we-row:not(.bnk-row) > .we-label")), bangla: st(root.querySelector(".bnk-row > .we-label")), next: st(root.querySelector(".word-card-learnnext-title")) };
        const chips = [...root.querySelectorAll("[data-word-mark]")].map((b) => { const q = b.getBoundingClientRect(); return { t: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height), cut: b.scrollWidth > b.clientWidth + 1 }; });
        const kids = [...root.querySelectorAll(".word-progress-rec > *")].map((e) => e.matches(".word-card-markrow") ? "marks" : e.matches(".bnk-row") ? "bangla" : e.matches("[data-word-effort-details]") ? "how" : e.matches(".word-card-learnnext") ? "next" : "");
        const how = root.querySelector("[data-word-effort-details]");
        const ar = root.querySelector(".word-card-learnnext-ar");
        const probe = document.createElement("span"); probe.className = "word-card-family-who"; probe.innerHTML = '<span lang="ar">ك</span>'; root.appendChild(probe);
        const smallFs = parseFloat(getComputedStyle(probe.querySelector("[lang=ar]")).fontSize); probe.remove();
        const broken = [...root.querySelectorAll("[data-word-mark] .we-name")].filter((n) => n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).lineHeight || "0") * 2.6).length;
        return { titles, chips, kids, howInsideMarks: !!how?.closest(".we-row"), arFs: ar ? parseFloat(getComputedStyle(ar).fontSize) : 0, smallFs, broken, rootFs: parseFloat(getComputedStyle(document.documentElement).fontSize) };
      });
      if (!m) { check(`${tag} the Word Card is open`, false); continue; }
      const T = Object.values(m.titles);
      check(`${tag} all four titles found`, T.every(Boolean), JSON.stringify(m.titles));
      check(`${tag} MUTATION TARGET (titles): the four titles share one look and are tiny (<= 12px, capitals, spaced)`, T.every(Boolean) && T.every((x) => x.fs === T[0].fs && x.ls === T[0].ls && x.tt === T[0].tt && x.fw === T[0].fw) && T[0].fs <= 12 && T[0].tt === "uppercase", JSON.stringify(m.titles));
      const tops = new Set(m.chips.map((c) => c.t)), widths = m.chips.map((c) => c.w);
      if (width < 560) {
        check(`${tag} MUTATION TARGET (chips3): the six chips stand in ONE row, equal width`, m.chips.length === 6 && tops.size === 1 && Math.max(...widths) - Math.min(...widths) <= 2, JSON.stringify(m.chips));
        check(`${tag} none cut, none broken mid-word, 44px+ tall`, m.chips.every((c) => !c.cut && c.h >= 44) && m.broken === 0, JSON.stringify(m.chips));
      }
      const order = m.kids.filter(Boolean).join(">");
      check(`${tag} MUTATION TARGET (howup): order is marks > Bangla marking > how hard > Learn the Next Word, and "how hard" is not inside Mark the Word`, order === "marks>bangla>how>next" && !m.howInsideMarks, `${order} inside:${m.howInsideMarks}`);
      check(`${tag} MUTATION TARGET (bigar): the Learn next Arabic is 56% of the card's other small Arabic (${m.arFs}px of ${m.smallFs}px)`, m.smallFs > 0 && Math.abs(m.arFs / m.smallFs - 0.56) < 0.02, `${m.arFs} / ${m.smallFs}`);
      check(`${tag} no page errors`, errors.filter((e) => !/ERR_CERT|archive\.org|net::|api\.quran/.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
console.log(`\n==== Word Card compact marking${MUTATE ? ` [mutation ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
