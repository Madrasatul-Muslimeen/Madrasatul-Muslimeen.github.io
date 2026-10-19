// J23 (the Owner, 12 Oct 2026, phone screenshots of the Word card):
//   1. "somehow the word meaning at the word box doesn't appear. FIX" -- the WbW STEM box printed no English meaning
//      for 14:29:2 يَصْلَوْنَهَا and 14:26:3 خَبِيثَةٍ, and a WRONG one for 14:28:12 ٱلْبَوَارِ ("bar (place where
//      alcoholic beverages are sold)"; the word means destruction).
//      Cause (measured): the English stem meaning is lemma-dictionary-en.json's entry for the dictionary word. يَصْلَى
//      matched Wiktionary only at "low" confidence and خَبِيثَة not at all, so neither has an entry; بَوَار's
//      Wiktionary page is "verbal noun of بَارَ", and match_wikt.py resolved that pointer by spelling, preferring a NOUN,
//      so the loan-word بَار "bar" won. Fixed at source (build_app_dictionary.py: a verbal noun / participle must
//      resolve to a verb's meaning or is left out -- 11 entries changed) and in the card (a stem whose dictionary word
//      has no entry prints the word's own word-by-word meaning, as the Bangla page always has).
//   2. "Enable undo / change the marking of a word ... This word doesn't let change the status." On a place that shows
//      Achieved through ANOTHER mark, a press saved this place's own state and the card went on showing Achieved with
//      nothing to say why. Now the card says what was saved and why it still shows Achieved; and ٱلْبَوَارِ's line
//      "marked Achieved at another place of this word" (false: it was known through its ROOT) is printed only when the
//      word's own dictionary-word mark is what makes it known. Changing the other mark from here is an Owner choice
//      (see the PR / report), not built.
//   3. The Āyah card's Record Your Progress: a marked āyah can be changed and undone (reproduced: it already could;
//      kept here as a guard).
// Expected values are written by hand. 390 and 1280, en and bn. Run from the repository root with serve.js running.
//   --mutate=no-fallback  the stem box prints nothing when the dictionary has no entry  -> the 14:29:2 / 14:26:3 checks fail
//   --mutate=old-dict     the dictionary file as it was on main                          -> the ٱلْبَوَارِ and sweep checks fail
//   --mutate=via-word     every inherited Achieved is called "another place of this word" -> the root-spread check fails
//   --mutate=no-held      the card never says what a press saved                        -> the "Saved here as" checks fail
//   --mutate=stuck-ayah   the Āyah card's pressed button never moves off Achieved        -> the Āyah card checks fail
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

let pass = 0, fail = 0;
const check = (n, ok, d = "") => {
  if (ok && typeof ok.then === "function") throw new Error(`check "${n}" was handed a promise; await it first`);
  return ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
};
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  "no-fallback": ["js/quran-word-card.js", 'else if (context.dictionary) { meaning = word.translation?.en || null; meaningFrom = meaning ? "wbw" : ""; }', ""],
  "via-word": ["quranrevival.html", 'knownElsewhereVia = viaWord ? "word" : "level";', 'knownElsewhereVia = "word";'],
  "no-held": ["quranrevival.html", "heldOwnState: saving ? null : ownHeld,", "heldOwnState: null,"],
  "stuck-ayah": ["js/ayah-action-sheet.js", 'aria-pressed="${!disabled && id === currentStatusId}"', 'aria-pressed="${!disabled && id === (currentStatusId === "not_started" ? "not_started" : "achieved")}"'],
};
if (MUTATE && MUTATE !== "old-dict" && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const DICT_PATH = "tools/quran-data-pull/output/lemma-dictionary-en.json";
const dictText = MUTATE === "old-dict" ? execFileSync("git", ["show", `origin/main:${DICT_PATH}`], { encoding: "utf8" }) : fs.readFileSync(DICT_PATH, "utf8");

// ---- the data file: a verbal noun or participle never carries a non-verb meaning --------------------------------
{
  const dict = JSON.parse(dictText).entries;
  const coverage = JSON.parse(fs.readFileSync("tools/dictionary-pull/coverage-wiktionary.json", "utf8")).matches;
  const verbTargeted = coverage.filter((m) => m.formOfOnly && /^(verbal noun|active participle|passive participle) of /.test(m.gloss || "") && dict[m.lemma]);
  const bad = verbTargeted.filter((m) => !/^to /i.test(dict[m.lemma].m) && !/^(verbal noun|active participle|passive participle) of /.test(dict[m.lemma].m) && m.lemma !== "عَلَانِيَة");
  check("sweep: every verbal noun / participle in the dictionary means a verb (\"to ...\"), none a homograph noun", bad.length === 0, JSON.stringify(bad.slice(0, 4).map((m) => [m.lemma, dict[m.lemma].m.slice(0, 40)])));
  check("sweep: positive control -- there really are verb-targeted entries to check (>80)", verbTargeted.length > 80, String(verbTargeted.length));
  check("data: بَوَار has no \"bar\" meaning", !/\bbar\b/.test(dict["بَوَار"]?.m ?? ""), JSON.stringify(dict["بَوَار"]));
  check("data: كُفُور means to disbelieve, not \"cover, case\"", /^to disbelieve/.test(dict["كُفُور"]?.m ?? ""), JSON.stringify(dict["كُفُور"]));
  check("data: كَفَرَ is unchanged (positive control)", dict["كَفَرَ"]?.m === "to disbelieve (in), to close oneself off to", JSON.stringify(dict["كَفَرَ"]));
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

async function newPage(lang, width) {
  const ctx = await newContext(browser, { appLang: lang, banner: false, viewport: { width, height: width > 600 ? 900 : 844 }, extraSeedJs: "window.__stubApplyBatches = true;" });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE === "old-dict") await ctx.route(`**/${DICT_PATH}*`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: dictText }));
  else if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/app/${file}*`, async (r) => {
      const src = fs.readFileSync(`app/${file}`, "utf8");
      if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`);
      await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", body: src.split(a).join(b) });
    });
  }
  const { page, errors } = await openPage(ctx, "/app/quranrevival.html");
  await page.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
  if (!(await page.evaluate(() => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await page.click("#tabStudyBtn"); await page.waitForTimeout(150); }
  await page.click("#tabReadBtn"); await page.waitForTimeout(400);
  await page.evaluate(() => { const t = document.getElementById("wbwShowToggle"); if (t && !t.checked) { t.checked = true; t.dispatchEvent(new Event("change", { bubbles: true })); } });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
async function toAyah(page, surah, ayah) {
  const moved = await page.evaluate((s) => { const e = document.getElementById("surahSelect"); if (e.value === String(s)) return false; e.value = String(s); e.dispatchEvent(new Event("change", { bubbles: true })); return true; }, surah);
  if (moved) await page.waitForFunction((s) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${s}:"]`), surah, { timeout: 15000 });
  await page.evaluate((a) => { const e = document.getElementById("ayahSelect"); if (e.value !== String(a)) { e.value = String(a); e.dispatchEvent(new Event("change", { bubbles: true })); } }, ayah);
  await page.waitForFunction(([s, a]) => document.querySelector(`#readView [data-word-occurrence="quran-word-occurrence:v1:${s}:${a}:1"]`), [surah, ayah], { timeout: 8000 });
}
async function openWord(page, surah, ayah, pos) {
  await toAyah(page, surah, ayah);
  const id = `quran-word-occurrence:v1:${surah}:${ayah}:${pos}`;
  await page.evaluate((i) => document.querySelector(`#readView [data-word-occurrence="${i}"]`)?.click(), id);
  await page.waitForSelector(`.quran-word-card[data-occurrence-id="${id}"]`, { timeout: 8000 });
  await page.waitForFunction(() => { const b = document.querySelector("#quranWordCardMount [data-word-progress]"); return !!b && !/Loading|লোড হচ্ছে/.test(b.querySelector(".word-progress-state")?.textContent ?? ""); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
}
// The stem box's meaning, once the English dictionary has loaded (the English page fetches it for WbW).
const stem = (page) => page.evaluate(() => {
  const p = [...document.querySelectorAll("#quranWordCardMount [data-word-card-part]")].find((e) => e.dataset.wordCardPart.startsWith("stem-"));
  const m = p?.querySelector(".word-card-part-meaning");
  return p ? { meaning: m?.textContent ?? "", from: m?.dataset.wordCardPartMeaningFrom ?? "", visible: !!m && m.getBoundingClientRect().height > 0 } : null;
});
const waitDict = (page, lang) => lang === "bn" ? Promise.resolve() : page.waitForResponse((r) => r.url().includes("lemma-dictionary-en.json"), { timeout: 8000 }).catch(() => {});
const card = (page) => page.evaluate(() => {
  const b = document.querySelector("#quranWordCardMount [data-word-progress]");
  return b && {
    pressed: [...b.querySelectorAll("[data-word-progress-state]")].filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.dataset.wordProgressState),
    elsewhere: !!b.querySelector("[data-word-progress-known-elsewhere]"),
    held: b.querySelector("[data-word-progress-held]")?.dataset.wordProgressHeld ?? null,
    heldText: b.querySelector("[data-word-progress-held]")?.textContent ?? "",
    throughLevel: document.querySelector("#quranWordCardMount [data-known-through-level]")?.dataset.knownThroughLevel ?? null,
  };
});
// J23 choice B (14 Oct 2026): a lowering press on a place known through another mark now asks first; this suite is
// about the held line, which is what Cancel leaves, so it answers Cancel (the Change it path is
// word-card-change-other-mark-browser).
const press = async (page, st) => { await page.click(`#quranWordCardMount [data-word-progress-state="${st}"]`); await page.waitForTimeout(500); const cancel = await page.$('#quranWordCardMount [data-word-progress-ask="cancel"]'); if (cancel) await cancel.click(); await page.waitForFunction(() => !document.querySelector("#quranWordCardMount [data-word-progress-saving]"), null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(600); };
const fitsCard = (page) => page.evaluate(() => [...document.querySelectorAll("#quranWordCardMount .word-card-part-meaning, #quranWordCardMount [data-word-progress-held]")].every((e) => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 0.5 && r.left >= -0.5; }));

const WBW = {
  en: { "14:29:2": "(in) it they will burn", "14:26:3": "evil", "14:28:12": "(of) destruction" },
  bn: { "14:29:2": "তাতে তারা প্রবেশ করবে", "14:26:3": "নোংরা (অসার)", "14:28:12": "ধ্বংসের" },
};
const STATE = { en: { learning: "Learning", not_started: "Not started" }, bn: { learning: "শিখছি", not_started: "শুরু হয়নি" } };

for (const lang of ["en", "bn"]) for (const width of [390, 1280]) {
  const T = `[${lang} ${width}]`;
  console.log(`\n=== ${T} 1. the stem box's meaning ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    const dictLoaded = waitDict(page, lang);
    await openWord(page, 14, 29, 2);
    await dictLoaded; await page.waitForTimeout(400);
    let s = await stem(page);
    check(`${T} 14:29:2 يَصْلَوْنَهَا: the STEM box has a meaning, the word's own ("${WBW[lang]["14:29:2"]}")`, s?.meaning === WBW[lang]["14:29:2"] && s.visible, JSON.stringify(s));
    if (lang === "en") check(`${T} ...marked as the word-by-word meaning (no dictionary entry)`, s?.from === "wbw", JSON.stringify(s));
    check(`${T} ...and every part meaning sits inside the screen`, await fitsCard(page));
    await openWord(page, 14, 26, 3);
    s = await stem(page);
    check(`${T} 14:26:3 خَبِيثَةٍ: the STEM box has a meaning ("${WBW[lang]["14:26:3"]}")`, s?.meaning === WBW[lang]["14:26:3"], JSON.stringify(s));
    await openWord(page, 14, 28, 12);
    s = await stem(page);
    check(`${T} 14:28:12 ٱلْبَوَارِ: the STEM box says destruction ("${WBW[lang]["14:28:12"]}"), never "bar"`, s?.meaning === WBW[lang]["14:28:12"] && !/\bbar\b/.test(s.meaning), JSON.stringify(s));
    await openWord(page, 6, 1, 12);
    s = await stem(page);
    if (lang === "en") check(`${T} 6:1:12 كَفَرُوٓا: the dictionary meaning still leads where there is one (positive control)`, s?.meaning === "to disbelieve (in), to close oneself off to" && s.from === "", JSON.stringify(s));
    else check(`${T} 6:1:12 كَفَرُوٓا: the Bangla stem meaning is the word's own (positive control)`, (s?.meaning ?? "").length > 0, JSON.stringify(s));
    check(`${T} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log(`\n=== ${T} 2. a place known through another mark ===`);
  {
    const { ctx, page, errors } = await newPage(lang, width);
    // (a) the same dictionary word, حَيَوٰة: Achieved at 14:3:3, then opened at 14:27:8.
    await openWord(page, 14, 3, 3);
    await press(page, "achieved");
    await openWord(page, 14, 27, 8);
    let c = await card(page);
    check(`${T} 14:27:8 shows Achieved, "marked at another place of this word" (control: the mark is the word's own, at 14:3:3)`, c?.pressed.join() === "achieved" && c.elsewhere && !c.held, JSON.stringify(c));
    await press(page, "learning");
    c = await card(page);
    check(`${T} pressing Learning there says what was saved and why it still shows Achieved`, c?.held === "learning" && c.heldText.includes(STATE[lang].learning), JSON.stringify(c));
    await press(page, "not_started");
    c = await card(page);
    check(`${T} ...and pressing Not started says so too`, c?.held === "not_started" && c.heldText.includes(STATE[lang].not_started), JSON.stringify(c));
    check(`${T} ...the line sits inside the screen`, await fitsCard(page));
    await openWord(page, 14, 3, 3);
    c = await card(page);
    check(`${T} 14:3:3 itself is Achieved by its own mark, with no inherited lines`, c?.pressed.join() === "achieved" && !c.elsewhere && !c.held, JSON.stringify(c));

    // (b) ٱلْبَوَارِ known through its ROOT (an Intermediate Achieved), as in the Owner's screenshot.
    await openWord(page, 14, 28, 12);
    await page.click('#quranWordCardMount [data-word-card-level="intermediate"]');
    await page.waitForSelector('#quranWordCardMount [data-word-card-panel="intermediate"] [data-word-progress-state="achieved"]:not([disabled])', { timeout: 8000 }).catch(() => {});
    await press(page, "achieved");
    await page.click('#quranWordCardMount [data-word-card-level="wbw"]');
    await page.waitForSelector('#quranWordCardMount [data-word-card-panel="wbw"]', { timeout: 8000 });
    await page.waitForTimeout(900);
    c = await card(page);
    // Updated in place 19 Oct 2026 (five-levels change, J38/J39): a Root mark is a study mark on the ROOT and NEVER makes
    // a word known, so the owner's old screenshot state (WbW "Achieved, through its root") can no longer arise. The
    // check follows the new rule: after an Achieved on the Root tab, WbW is NOT Achieved and names no level. The
    // "does NOT say marked at another place" check below it still holds, and now also guards that nothing leaks.
    check(`${T} ٱلْبَوَارِ after a ROOT Achieved: WbW is NOT Achieved and names no level (a Root mark never makes a word known)`, !!c && !c.pressed.includes("achieved") && c.throughLevel === null, JSON.stringify(c));
    check(`${T} ...and does NOT say "marked Achieved at another place of this word" (it was another word's mark)`, c && !c.elsewhere, JSON.stringify(c));
    check(`${T} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }

  console.log(`\n=== ${T} 3. the Āyah card: a marked āyah can be changed and undone ===`);
  {
    const { ctx, page: P, errors } = await newPage(lang, width);
    await toAyah(P, 14, 28);
    const open = async () => { await P.evaluate(() => document.querySelector('[data-ayah-num-badge="14:28"]')?.click()); await P.waitForFunction(() => document.querySelector("[data-ayah-sheet] .ayah-sheet-ref"), null, { timeout: 8000 }); await P.waitForTimeout(500); };
    await open();
    const approach = await P.evaluate(() => { const s = document.querySelector("[data-ayah-sheet] [data-approach-stage-select]"); const v = [...(s?.options ?? [])].map((o) => o.value).find((x) => x); if (s && v) { s.value = v; s.dispatchEvent(new Event("change", { bubbles: true })); } return v; });
    await P.waitForTimeout(500);
    const pressedA = () => P.evaluate(() => [...document.querySelectorAll("[data-ayah-sheet] [data-approach-stage-btn]")].filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.approachStageBtn).join());
    const steps = ["achieved", "learning", "not_started", "mastered", "practising"];
    for (const st of steps) {
      const n = await P.evaluate(() => (window.__stubWriteData || []).length);
      await P.click(`[data-ayah-sheet] [data-approach-stage-btn="${st}"]`); await P.waitForTimeout(900);
      const wrote = await P.evaluate(([k, a]) => (window.__stubWriteData || []).slice(k).filter((x) => x.col === "records").map((x) => (x.data?.[`entries.ayah:14:28::${a}`] ?? x.data?.entries?.[`ayah:14:28::${a}`])?.claimedStatus ?? null), [n, approach]);
      check(`${T} Āyah card 14:28 (${approach}): ${st} is pressed and recorded`, (await pressedA()) === st && wrote.includes(st), JSON.stringify({ pressed: await pressedA(), wrote }));
    }
    await P.keyboard.press("Escape"); await P.waitForTimeout(300);
    await open();
    await P.evaluate((a) => { const s = document.querySelector("[data-ayah-sheet] [data-approach-stage-select]"); if (s && s.value !== a) { s.value = a; s.dispatchEvent(new Event("change", { bubbles: true })); } }, approach);
    await P.waitForTimeout(500);
    check(`${T} ...reopened, the card shows the last choice (Practising), not the first Achieved`, (await pressedA()) === "practising", await pressedA());
    check(`${T} no page errors`, errors.filter((e) => !/ERR_CERT|net::|archive\.org|api\.quran|Failed to load resource/i.test(e)).length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n==== J23 Word card meaning and marking${MUTATE ? ` (mutation ${MUTATE})` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
