// PCF MSA J61 part 2b (the Owner, 21 Oct 2026: "Arabic bigger in Tasrif? Yes. And to other places where it was that
// small."): the rest of the Word card's small Arabic is 90% of the big word at the top of the card (2rem, 1.55rem at
// 520px, 1.3rem at 340px), as Taṣrīf is (parts 1 and 2a): the WbW facts line, the part names, Learn next, Family's
// "who", every Arabic word in Depth (Morphology, iʿrāb, the book entries) and the Arabic words inside the Form sentence.
// And a sweep: no Arabic text anywhere on the five levels is under 70% of the big word (the one-letter section icons
// excepted). Real data, at 1:5:2 نَعْبُدُ. Run from the repository root with serve.js on :8080 (or QR_BASE=...).
// Every mutation (--mutate=NAME) must make the suite exit 1:
//   notoken   the card's --wc-small-ar token is gone                 -> the 90% checks fail
//   nosize    the size rule is gone (the old 45-65% sizes)            -> the 90% checks and the sweep fail
//   noar      the Depth words (.word-card-ar) keep their old 1.12rem   -> the Depth checks and the sweep fail
//   nowrap    the Form sentence's Arabic is not wrapped               -> the Form sentence check and the sweep fail
//   textchg   the wrapping changes the sentence's text                -> "the sentence's text is unchanged" fails
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const HTML = "app/quranrevival.html", DJS = "app/js/word-card-depth.js";
const MUT = {
  notoken: [HTML, "  .quran-word-card { --wc-small-ar: calc(var(--wc-head-ar) * 0.9); }\n", ""],
  nosize: [HTML, "  .quran-word-card .word-card-ar, .word-card-ar-chip b { font-size: var(--wc-small-ar); }", "  .zz-none { font-size: 1px; }"],
  noar: [HTML, "  .quran-word-card .word-card-ar, .word-card-ar-chip b { font-size: var(--wc-small-ar); }", "  .word-card-ar-chip b { font-size: var(--wc-small-ar); }"],
  nowrap: [DJS, "${escWithAr(f[lang] ?? f.en)}", "${esc(f[lang] ?? f.en)}"],
  textchg: [DJS, "esc(text).replace(AR_RUN, (run) => AR(run));", "esc(text).replace(AR_RUN, (run) => AR(run + \" \"));"],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const { FORM_NAMES } = await import("../../app/js/word-grammar-tables.js");

const TARGETS = {
  facts: ".word-card-fact b.word-card-fact-ar, .word-card-fact .word-card-fact-sub",
  partNames: ".word-card-part-arname",
  learnNext: ".word-card-learnnext-ar",
  familyWho: ".word-card-family-who [lang='ar']",
  depthWords: ".word-card-morph .word-card-ar, .word-card-irab .word-card-ar, .word-card-book-h .word-card-ar",
  irab: ".word-card-irab bdi[lang='ar']",
  bookText: ".word-card-book-t",
  formSentence: "[data-word-card-form-sentence] .word-card-ar",
};
const measure = (page, targets) => page.evaluate((targets) => {
  const m = document.querySelector("#quranWordCardMount");
  const card = m.querySelector(".quran-word-card").getBoundingClientRect();
  const head = parseFloat(getComputedStyle(m.querySelector(".word-card-arabic")).fontSize);
  const shown = (s) => [...m.querySelectorAll(s)].filter((x) => x.getBoundingClientRect().width > 0);
  const sz = {};
  for (const [k, s] of Object.entries(targets)) sz[k] = [...new Set(shown(s).map((x) => parseFloat(getComputedStyle(x).fontSize)))];
  // the sweep: every element whose OWN text holds Arabic letters, except the one-letter section icons
  const small = shown("*").filter((el) => !el.classList.contains("word-card-acc-ico") && [...el.childNodes].some((n) => n.nodeType === 3 && /[؀-ۿ]/.test(n.textContent)))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < head * 0.7 - 0.05)
    .map((el) => `${el.className || el.tagName}:${Math.round(parseFloat(getComputedStyle(el).fontSize))}px "${el.textContent.trim().slice(0, 16)}"`);
  const sentence = m.querySelector("[data-word-card-form-sentence]")?.textContent ?? null;
  const outOfCard = shown(".quran-word-card *").filter((x) => { const r = x.getBoundingClientRect(); return r.left < card.left - 0.5 || r.right > card.right + 0.5; }).map((x) => x.className).slice(0, 3);
  return { head, sz, small, sentence, outOfCard, over: document.documentElement.scrollWidth - innerWidth };
}, targets);
const near = (arr, v) => arr.length > 0 && arr.every((x) => Math.abs(x - v) < 0.2);

const LEVEL_TARGETS = { wbw: ["facts", "partNames", "learnNext"], basic: ["familyWho"], depth: ["depthWords", "irab", "bookText", "formSentence"] };
const runs = [["en", 1280], ["en", 768], ["en", 390], ["en", 320], ["bn", 1280], ["bn", 390]];
for (const [lang, width] of runs) {
  const tag = `${lang}/${width}`;
  console.log(`\n=== Word card small Arabic [${tag}] ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height: width >= 768 ? 900 : 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    const src = fs.readFileSync(file, "utf8");
    if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
    const type = file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8";
    await ctx.route(`**/${file}*`, (r) => r.fulfill({ status: 200, contentType: type, body: src.split(a).join(b) }));
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(500);
  await page.evaluate(() => { const ss = document.getElementById("surahSelect"); ss.value = "1"; ss.dispatchEvent(new Event("change", { bubbles: true })); setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = "5"; as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); });
  await page.waitForFunction(() => !!document.querySelector('[data-word-occurrence$=":1:5:2"]'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('[data-word-occurrence$=":1:5:2"]')?.click());
  await page.waitForFunction(() => document.querySelector("#quranWordCardMount .quran-word-card"), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  const wantHead = width <= 340 ? 20.8 : width <= 520 ? 24.8 : 32;
  const want = wantHead * 0.9;
  for (const lvl of ["wbw", "intermediate", "basic", "tasrif", "depth"]) {
    await page.click(`#quranWordCardMount [data-word-card-level="${lvl}"]`).catch(() => {});
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll("#quranWordCardMount details").forEach((d) => (d.open = true)));
    await page.waitForTimeout(400);
    const want_ = Object.fromEntries((LEVEL_TARGETS[lvl] || []).map((k) => [k, TARGETS[k]]));
    const s = await measure(page, want_);
    const t = `${tag} ${lvl}:`;
    check(`${t} the big word at the top is ${wantHead}px`, Math.abs(s.head - wantHead) < 0.2, String(s.head));
    for (const k of LEVEL_TARGETS[lvl] || []) check(`${t} ${k} Arabic is 90% of it (${want.toFixed(2)}px)`, near(s.sz[k], want), JSON.stringify(s.sz[k]));
    check(`${t} no Arabic text on this level is under 70% of the big word`, s.small.length === 0, s.small.slice(0, 4).join(" | "));
    check(`${t} nothing leaves the card, no sideways scroll`, s.outOfCard.length === 0 && s.over <= 0, JSON.stringify({ c: s.outOfCard, o: s.over }));
    if (lvl === "depth") {
      const f = FORM_NAMES[1];
      check(`${t} the Form sentence's text is unchanged by the wrapping`, s.sentence === (f[lang] ?? f.en), JSON.stringify(s.sentence));
    }
    if (process.argv.includes("--shot")) await page.screenshot({ path: `${process.env.SHOT_DIR}/j61c-${lang}-${width}-${lvl}.png` });
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}
await browser.close();
console.log(`\n==== Word card small Arabic (J61 part 2b)${MUTATE ? ` [MUTATION ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
