// PCF MSA J48 round 1 -- Vocabulary (Learn, Practise x4, Step test, Word card button), real data.
// Run from the repository root with `node serve.js` running:  node tools/i18n-verify/vocabulary-browser.mjs [--mutate=NAME]
// Every check is proven by its own mutation (--mutate=NAME must make the named check FAIL, exit 1):
//   PURE (app/js/vocabulary.js is changed in memory and re-imported):
//     rangebug   a step deck ignores "only the new"        -> "Only the new 15 of First 25 is ranks 11–25"
//     dupmean    wrong options may repeat a meaning         -> "no duplicate meaning"
//     demote     a right answer on Practising goes back     -> "never demotes"
//     lowpass    80% passes                                 -> "90% passes, 89% does not"
//   BROWSER (page source changed in flight):
//     noring     the āyah question rings the wrong word    -> "ringed word is the word's own first place"
//     nowrite    a round writes nothing                     -> "right while Not started writes ONE learning doc"
//     writewrong a wrong answer is written too              -> "a wrong answer writes nothing"
//     noask      the passed test never asks                 -> "pass asks"
//     lowtest    the test passes at 30% (an 80% test then passes) -> "fail (<90%) writes nothing"
//     nobackcard the one-word round closes the card         -> "Back returns to the same card"
//     nocardsync Back does not redraw the card             -> "the SAME Word card shows Achieved after a passed step test"
//     bnleak     one Bangla string is missing               -> "Bangla has no English"
//     palegreen  the J47 green is washed out                -> "known = J47 green"
//     lowpurple  the purple control is not its token        -> "purple control EQUALS its token"
//     caret      Learn next prints the raw key (J53)          -> "Learn next words 51–100 show no Latin mark"
//     vocaret    the Vocabulary Learn list prints the raw key -> "the Vocabulary Learn list of 51–100 shows no Latin mark"
//     word3      (pure) the one-word round is 3 questions (J56) -> "J56: buildWordRound gives 10 questions"
//     sameplace  (pure) every āyah question at one place      -> "J56: its three āyah questions are at three different places"
//     wordall    (pure) the word moves only at 10 of 10       -> "J56: 9 of 10 moves the word up"
//     optcaret   (pure) an Arabic option prints the raw key  -> "J53: a Pick-the-Arabic option shows the word as a reader sees it"
import { chromium, newContext, openPage } from "./harness.mjs";
import fs from "fs";

const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const OUT = "tools/quran-data-pull/output/";
const VOC = "app/js/vocabulary.js";
const PURE_MUT = {
  rangebug: ["return rows.filter((r) => r.r >= range.from && r.r <= range.to);", "return rows.filter((r) => r.r >= 1 && r.r <= range.to);"],
  dupmean: ["if (taken.has(key(cand)) || taken.has(norm(meaningOf(cand, lang)))) continue;", "if (cand.r === row.r) continue;"],
  demote: ["return null;\n}\n\n/** [{ rank, lemma, state }]", "return \"learning\";\n}\n\n/** [{ rank, lemma, state }]"],
  lowpass: ["export const PASS_RATIO = 0.9;", "export const PASS_RATIO = 0.8;"],
  word3: ["export const WORD_ROUND_SIZE = 10;", "export const WORD_ROUND_SIZE = 3;"],
  sameplace: ["      if (k === \"ayah\" && spread.length) q.place = spread[i % spread.length];", "      if (k === \"ayah\" && spread.length) q.place = spread[0];"],
  wordall: ["if (!answers.length || right / answers.length < PASS_RATIO) return [];", "if (!answers.length || right < answers.length) return [];"],
  optcaret: ['text: on === "arabic" ? lemmaText(r.l) :', 'text: on === "arabic" ? r.l :'],
};
const MUT = {
  noring: ["app/quranrevival.html", "w.position === pl.position ? \" vo-ring\" : \"\"", "w.position === pl.position + 1 ? \" vo-ring\" : \"\""],
  nowrite: ["app/quranrevival.html", "await runLemmaProgressAction({ kind: \"state\", state: it.state }, \"wbw\", null, { lemmaId: it.lemma, refs });", "/* no write */"],
  writewrong: ["app/js/vocabulary.js", "return tally(answers).rightRanks.map(", "return tally(answers).rightRanks.concat(tally(answers).wrongRanks).map("],
  noask: ["app/quranrevival.html", "askMark: passed && achievedWrites", "askMark: false && achievedWrites"],
  lowtest: ["app/js/vocabulary.js", "export const PASS_RATIO = 0.9;", "export const PASS_RATIO = 0.3;"],
  nobackcard: ["app/quranrevival.html", "if (act === \"close\") { const wasWord", "if (act === \"close\") { document.getElementById(\"quranWordCardMount\").innerHTML = \"\"; const wasWord"],
  bnleak: ["app/js/i18n/bn.js", "\"Pick the Arabic\": \"আরবি বাছুন\",", ""],
  nocardsync: ["app/quranrevival.html", "if (quranWordCardState.occurrenceId) { await hydrateWordCardLemmaExtras(); renderPersistentWordCard(); }", ""],
  caret: ["app/quranrevival.html", '<span class="ln-ar" lang="ar" dir="rtl">${escapeHtml(lemmaText(r.l))}</span>', '<span class="ln-ar" lang="ar" dir="rtl">${escapeHtml(r.l)}</span>'],
  vocaret: ["app/quranrevival.html", '<span class="vo-lw-ar" lang="ar" dir="rtl">${escapeHtml(lemmaText(r.l))}</span>', '<span class="vo-lw-ar" lang="ar" dir="rtl">${escapeHtml(r.l)}</span>'],
  palegreen: ["app/quranrevival.html", ".vo-lw.vo-known { background: #d7efdf;", ".vo-lw.vo-known { background: #eef7f0;"],
  lowpurple: ["app/quranrevival.html", ".ln-vbtn { flex: 1 1 6rem; min-height: 44px; padding: 0 0.7rem; border-radius: 0.5rem; border: 1px solid #4b2a85; background: #4b2a85;", ".ln-vbtn { flex: 1 1 6rem; min-height: 44px; padding: 0 0.7rem; border-radius: 0.5rem; border: 1px solid #4b2a85; background: #5b3a95;"],
};
if (MUTATE && !MUT[MUTATE] && !PURE_MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${d}`));
const nfc = (s) => String(s).normalize("NFC");
const rows = JSON.parse(fs.readFileSync(OUT + "learn-next.json", "utf8")).rows;

// ---------------------------------------------------------------- PURE
console.log("\n=== pure: app/js/vocabulary.js ===");
let V;
{
  let src = fs.readFileSync(VOC, "utf8");
  if (PURE_MUT[MUTATE]) {
    const [a, b] = PURE_MUT[MUTATE];
    if (!src.includes(a)) throw new Error(`pure mutation anchor missing: ${MUTATE}`);
    src = src.split(a).join(b);
  }
  src = src.replace('from "./learn-next.js"', `from "${process.cwd()}/app/js/learn-next.js"`).replace('from "./lemma-text.js"', `from "${process.cwd()}/app/js/lemma-text.js"`);
  fs.writeFileSync("/tmp/vocabulary-under-test.mjs", src);
  V = await import("/tmp/vocabulary-under-test.mjs?" + Date.now());
}
{
  const ranks = (d) => d.map((r) => r.r);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  check("First 10 is exactly ranks 1–10", eq(ranks(V.deckRows(rows, 10)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  check("Only the new 15 of First 25 is ranks 11–25", eq(ranks(V.deckRows(rows, 25, true)), Array.from({ length: 15 }, (_, i) => i + 11)));
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let okOptions = true, okDup = true, okStep = true, why = "";
  for (const [step, onlyNew] of [[10, false], [25, false], [25, true], [50, true], [100, false]]) {
    const deck = V.deckRows(rows, step, onlyNew), pool = V.optionPool(rows, deck);
    for (const lang of ["en", "bn"]) for (const kind of ["meaning", "arabic", "ayah"]) for (const row of deck) {
      const q = V.makeQuestion(row, kind, pool, lang, rng);
      if (!q || q.options.length !== 4 || q.options.filter((o) => o.correct).length !== 1 || q.options.find((o) => o.correct).rank !== row.r) { okOptions = false; why = `${step} ${kind} ${row.r}`; continue; }
      const texts = q.options.map((o) => nfc(V.meaningOf(rows[o.rank - 1], lang)).trim().toLowerCase());
      if (new Set(texts).size !== 4) { okDup = false; why = `${step} ${kind} ${row.r} ${texts}`; }
      const poolRanks = new Set(pool.map((r) => r.r));
      if (!q.options.every((o) => poolRanks.has(o.rank))) okStep = false;
    }
  }
  check("each question has 4 options with the right one among them", okOptions, why);
  check("no duplicate meaning among the 4 options (EN and BN, all three kinds)", okDup, why);
  check("every option comes from the step (or, for a small step, the next ones) — never invented", okStep);
  const small = V.deckRows(rows, 10), pool10 = V.optionPool(rows, small);
  check("a step with fewer than 8 words borrows from the next step; a 10-word step stays inside itself", pool10.length === 10 && V.optionPool(rows, small.slice(0, 3)).length > 3);
  check("a round is up to 10 words, one question each, from the deck", (() => { const r = V.buildRound(rows, V.deckRows(rows, 100), "meaning", { rng }); return r.length === 10 && new Set(r.map((q) => q.rank)).size === 10 && r.every((q) => q.rank <= 100); })());
  check("the step test has every word of the step once, kinds 2–4 only", (() => { const t = V.buildTest(rows, V.deckRows(rows, 25), { rng }); return t.length === 25 && new Set(t.map((q) => q.rank)).size === 25 && t.every((q) => ["meaning", "arabic", "ayah"].includes(q.kind)); })());
  check("Not started → Learning, Learning → Practising", V.stateAfterRight("not_started") === "learning" && V.stateAfterRight("learning") === "practising");
  check("practice never demotes and never touches Practising/Achieved (null = no write)", V.stateAfterRight("practising") === null && V.stateAfterRight("achieved") === null);
  const ans = (rights) => rights.map((r, i) => ({ rank: i + 1, right: r }));
  check("90% passes, 89% does not", V.testPassed(ans([...Array(9).fill(true), false])) === true && V.testPassed(ans([...Array(8).fill(true), false, false])) === false && V.testPassed(ans([...Array(89).fill(true), ...Array(11).fill(false)])) === false);
  check("a wrong answer plans no write", V.practiceWrites(rows, ans([false, false]), () => "not_started").length === 0);
  check("achievedWrites skips a word already Achieved", V.achievedWrites(V.deckRows(rows, 10), (l) => (l === rows[0].l ? "achieved" : "not_started")).length === 9);
  { // J56: the one-word round
    const places = Array.from({ length: 30 }, (_, i) => ({ surah: 2, ayah: i + 1, position: 1 }));
    const wr = V.buildWordRound(rows, rows[0], { rng, places });
    const k = (x) => wr.filter((q) => q.kind === x).length;
    const ay = wr.filter((q) => q.kind === "ayah").map((q) => `${q.place?.surah}:${q.place?.ayah}`);
    check("J56: buildWordRound gives 10 questions (1 flashcard, 3 of each choice kind), all about the word", wr.length === 10 && k("flashcard") === 1 && k("meaning") === 3 && k("arabic") === 3 && k("ayah") === 3 && wr.every((q) => q.rank === rows[0].r), JSON.stringify(wr.map((q) => q.kind)));
    check("J56: its three āyah questions are at three different places", new Set(ay).size === 3 && !ay.includes("undefined:undefined"), JSON.stringify(ay));
    const ans = (n) => Array.from({ length: 10 }, (_, i) => ({ rank: rows[0].r, right: i < n }));
    check("J56: 9 of 10 moves the word up (Not started → Learning); 8 of 10 writes nothing", V.wordRoundWrites(rows[0], ans(9), () => "not_started")[0]?.state === "learning" && V.wordRoundWrites(rows[0], ans(8), () => "not_started").length === 0);
  }
  check("J53: a Pick-the-Arabic option shows the word as a reader sees it (no \"^\"), its key unchanged", (() => { const d = V.deckRows(rows, 100); const all = d.flatMap((r) => V.pickOptions(r, V.optionPool(rows, d), "arabic", "en", rng) ?? []); return all.length > 300 && all.every((o) => !/[\^#@\[]/.test(o.text)) && all.some((o) => o.lemma.includes("^")); })());
}
if (PURE_MUT[MUTATE]) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

// ---------------------------------------------------------------- BROWSER
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const writes = (page, n = 0) => page.evaluate((n) => (window.__stubWriteData || []).slice(n).filter((w) => w.col === "quranLemmaProgress").map((w) => ({ id: w.id, state: w.data?.state ?? w.data?.learner?.state ?? JSON.stringify(w.data) })), n);
const wcount = (page) => page.evaluate(() => (window.__stubWriteData || []).length);
const sleep = (page, ms) => page.waitForTimeout(ms);
const { lemmaText } = await import(`${process.cwd()}/app/js/lemma-text.js`);
const rowOfAr = (s) => rows.find((r) => nfc(lemmaText(r.l)) === nfc(s) || nfc(r.l) === nfc(s)); // J53: the screen shows lemmaText(key)
const meanOf = (r, lang) => (lang === "bn" ? r.b : r.e);
const vo = (page, sel) => page.evaluate((s) => document.querySelector("#vocabSheet " + s)?.click(), sel);
const voText = (page, sel) => page.evaluate((s) => document.querySelector("#vocabSheet " + s)?.textContent?.trim() ?? null, sel);
async function openVocab(page) {
  if (!(await page.evaluate(() => (document.getElementById("tabVocabularyBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabVocabularyBtn");
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
}
/** Answer the open question. right=true picks the correct option; false picks a wrong one. */
async function answerChoice(page, lang, right) {
  const info = await page.evaluate(() => {
    const card = document.querySelector("#vocabSheet .vo-card");
    return { kind: card?.dataset.voKind, ar: card?.querySelector(".vo-ar")?.textContent ?? null, mean: card?.querySelector(".vo-mean")?.textContent ?? null, ring: card?.querySelector(".vo-ring")?.textContent ?? null, occ: card?.querySelector(".vo-ring")?.dataset.voTarget ?? null /* Architect review: read off the RINGED word itself (it read any [data-vo-target], so a ring on the wrong word passed: mutation noring went uncaught) */, opts: [...document.querySelectorAll("#vocabSheet [data-vo=pick]")].map((b) => b.textContent.trim()) };
  });
  let row = null;
  if (info.kind === "meaning") row = rowOfAr(info.ar);
  else if (info.kind === "arabic") row = rows.find((r) => meanOf(r, lang) === info.mean);
  else if (info.kind === "ayah") {
    if (!info.occ) throw new Error("no ringed word carries its place (data-vo-target): " + JSON.stringify(info));
    const t = info.occ.split(":").map(Number);
    row = rows.find((r) => r.o === t[0] * 1000000 + t[1] * 1000 + t[2]);
    // J56: a one-word round rings OTHER places of the word too -- find the word by the lemma at that place.
    if (!row) { const su = JSON.parse(fs.readFileSync(`${OUT}surahs/surah_${String(t[0]).padStart(3, "0")}.json`, "utf8")); const lem = su.ayahs.find((x) => x.ayah === t[1])?.words.find((w) => w.position === t[2])?.morphology?.lemma; row = rows.find((r) => r.l === lem); }
  }
  const want = info.kind === "arabic" ? lemmaText(row.l) : meanOf(row, lang);
  const idx = info.opts.findIndex((o) => nfc(o) === nfc(want));
  const pick = right ? idx : info.opts.findIndex((_, i) => i !== idx);
  await page.evaluate((i) => document.querySelectorAll("#vocabSheet [data-vo=pick]")[i].click(), pick);
  await sleep(page, 250);
  return { info, row, idx };
}
async function nextQ(page) { await vo(page, "[data-vo=next]"); await sleep(page, 300); }

for (const [lang, width, height] of [["en", 390, 844], ["en", 320, 640], ["en", 768, 900], ["en", 1280, 900], ["bn", 390, 844]]) {
  const tag = `[${lang} ${width}]`;
  console.log(`\n=== Vocabulary ${tag} ===`);
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  await openVocab(page);
  check(`${tag} the Study menu's Vocabulary item opens the Learn next sheet`, await page.evaluate(() => { const s = document.getElementById("learnNextSheet"); return !!s && !s.hidden; }));
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]').click());
  await sleep(page, 250);
  check(`${tag} the open step has Learn, Practise and Step test buttons, 44px+`, await page.evaluate(() => { const b = [...document.querySelectorAll("#learnNextSheet .ln-vbtn")]; return b.length === 3 && b.every((x) => x.getBoundingClientRect().height >= 44); }));

  if (width === 390) {
    // ---- colour: rendered colour EQUALS its token
    const col = await page.evaluate(() => { const b = document.querySelector("#learnNextSheet .ln-vbtn"); const c = getComputedStyle(b); return [c.backgroundColor, c.color]; });
    check(`${tag} purple control EQUALS its token (rgb(75, 42, 133) on white)`, col[0] === "rgb(75, 42, 133)" && col[1] === "rgb(255, 255, 255)", col.join(" / "));

    // ---- Practise: Pick the meaning, First 10, answer 3 right and 1 wrong
    await vo2(page, "#learnNextSheet", "[data-ln-vocab=practise]");
    await page.waitForSelector("#vocabSheet [data-vo=start]", { timeout: 8000 }).catch(() => {});
    await vo(page, "[data-kind=meaning]");
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
    const deckRanks = new Set();
    const w0 = await wcount(page);
    // answer all 10 in the round: the first right, the second wrong, the rest right
    const asked = [];
    let optsOk = true;
    for (let i = 0; i < 10; i++) {
      const right = i !== 1;
      const { info, row } = await answerChoice(page, lang, right);
      asked.push({ rank: row.r, right });
      deckRanks.add(row.r);
      if (info.opts.length !== 4 || new Set(info.opts.map((o) => nfc(o).toLowerCase())).size !== 4) optsOk = false;
      if (i === 0) check(`${tag} NEGATIVE CONTROL part 1: nothing is written while the round runs (writes happen once, at the end)`, (await writes(page, w0)).length === 0, JSON.stringify(await writes(page, w0)));
      await nextQ(page);
    }
    check(`${tag} First 10 Practise asks exactly ranks 1–10 (each once)`, deckRanks.size === 10 && [...deckRanks].every((r) => r >= 1 && r <= 10), [...deckRanks].join());
    check(`${tag} every question showed 4 different options`, optsOk);
    await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
    await sleep(page, 800);
    const w1 = await writes(page, w0);
    const rightRanks = asked.filter((a) => a.right).map((a) => a.rank), wrongRank = asked.find((a) => !a.right).rank;
    const wroteIds = w1.map((w) => w.id);
    const idOf = (rank) => `t1__p1__wbw__${rows[rank - 1].l}`;
    check(`${tag} right while Not started writes ONE learning doc per word (9 words, 9 docs)`, w1.length === 9 && rightRanks.every((rk) => wroteIds.some((id) => nfc(id) === nfc(idOf(rk)))), JSON.stringify(w1.slice(0, 3)));
    check(`${tag} POSITIVE CONTROL: the writes carry state learning`, w1.length > 0 && w1.every((w) => /learning/.test(w.state)), JSON.stringify(w1.slice(0, 2)));
    check(`${tag} a wrong answer writes nothing (the wrong word has no doc)`, !wroteIds.some((id) => nfc(id) === nfc(idOf(wrongRank))), `wrong rank ${wrongRank}`);
    const scoreTxt = ((await voText(page, "[data-vo-score]")) ?? "").replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));
    check(`${tag} the score screen reads "Score: 9 of 10"`, /9/.test(scoreTxt) && /10/.test(scoreTxt), scoreTxt);
    // Another round → right again while Learning writes practising for the learning words
    const w2 = await wcount(page);
    await vo(page, "[data-vo=again]");
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 10; i++) { await answerChoice(page, lang, true); await nextQ(page); }
    await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
    await sleep(page, 800);
    const w3 = await writes(page, w2);
    check(`${tag} right again while Learning writes practising (a later round; the one not-started word becomes learning)`, w3.length === 10 && w3.filter((w) => /practising/.test(w.state)).length === 9 && w3.filter((w) => /learning/.test(w.state)).length === 1, JSON.stringify(w3.map((w) => w.state)));
    // Third round: practising words are never written again
    const w4 = await wcount(page);
    await vo(page, "[data-vo=again]");
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 10; i++) { await answerChoice(page, lang, true); await nextQ(page); }
    await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
    await sleep(page, 800);
    const w5 = await writes(page, w4);
    check(`${tag} never demotes: a third round writes no state lower than practising (only the 1 learning word moves up)`, w5.every((w) => /practising/.test(w.state)) && w5.length <= 1, JSON.stringify(w5.map((w) => w.state)));

    // ---- In its āyah: the ringed word is the word's own first place
    await vo(page, "[data-vo=menu]");
    await vo(page, "[data-kind=ayah]");
    await page.waitForSelector("#vocabSheet .vo-ring", { timeout: 10000 }).catch(() => {});
    const a1 = await answerChoice(page, lang, true);
    check(`${tag} In its āyah: the ringed word is the word's own first place (occurrence ${a1.row?.o})`, !!a1.info.ring && a1.info.occ === `${Math.floor(a1.row.o / 1000000)}:${Math.floor((a1.row.o % 1000000) / 1000)}:${a1.row.o % 1000}`, JSON.stringify(a1.info));
    // ---- Flashcard
    await vo(page, "[data-vo=close]"); // leave the round
    await sleep(page, 200);
    // ---- Step test: fail first at 8 of 10 (80%, just under the line), nothing written.
    // Architect review: this answered ALL wrong, so a pass mark lowered to 30% still failed it (mutation lowtest uncaught).
    await vo2(page, "#learnNextSheet", "[data-ln-vocab=test]");
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 10000 }).catch(() => {});
    const wf = await wcount(page);
    for (let i = 0; i < 10; i++) { await answerChoice(page, lang, i < 8); await sleep(page, 150); }
    await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
    check(`${tag} Step test fail (<90%) writes nothing and says which words go back`, (await writes(page, wf)).length === 0 && !!(await page.evaluate(() => document.querySelector("#vocabSheet .vo-back-words span"))), JSON.stringify(await writes(page, wf)));
    check(`${tag} a failed test does not ask to mark Achieved`, !(await page.evaluate(() => document.querySelector('#vocabSheet [data-vo=markyes]'))));
    // ---- pass
    await vo(page, "[data-vo=again]");
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 10000 }).catch(() => {});
    const wp = await wcount(page);
    for (let i = 0; i < 10; i++) { await answerChoice(page, lang, true); await sleep(page, 150); }
    await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
    check(`${tag} Step test pass asks "Mark these N words Achieved?" and has written nothing yet`, !!(await page.evaluate(() => document.querySelector("#vocabSheet [data-vo=markyes]"))) && (await writes(page, wp)).length === 0, JSON.stringify(await writes(page, wp)));
    await vo(page, "[data-vo=markyes]");
    await sleep(page, 2500);
    const wa = await writes(page, wp);
    check(`${tag} Yes writes achieved for each of the 10 words`, wa.length === 10 && wa.every((w) => /achieved/.test(w.state)), JSON.stringify(wa.map((w) => w.state)));
    await vo(page, "[data-vo=menu]"); await vo(page, "[data-vo=close]");
    await sleep(page, 400);
    const greens = await page.evaluate(() => document.querySelectorAll("#learnNextSheet .ln-row.ln-known").length);
    const bg = await page.evaluate(() => { const k = document.querySelector("#learnNextSheet .ln-row.ln-known"); return k ? [getComputedStyle(k).backgroundColor, getComputedStyle(k).borderInlineStartColor] : null; });
    check(`${tag} Learn next shows the 10 in the J47 green (known = #d7efdf with a #2e7d55 edge)`, greens >= 10 && bg && bg[0] === "rgb(215, 239, 223)" && bg[1] === "rgb(46, 125, 85)", JSON.stringify({ greens, bg }));
    // J53 (the Owner's screenshot, 20 Oct 2026: "Fix the sign", شَا^ءَ and أُولَٰ^ئِك circled): a lemma is a KEY spelt
    // with the corpus's Latin marks; every word the reader SEES goes through lemmaText (^ -> U+0653 maddah above).
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="100"]')?.click());
    await sleep(page, 300);
    await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-new="1"]')?.click());
    await sleep(page, 300);
    const marks = await page.evaluate(() => { const ar = [...document.querySelectorAll("#learnNextSheet .ln-ar")].map((e) => e.textContent); return { n: ar.length, latin: ar.filter((t) => /[\^#@\[]/.test(t)), r51: ar[0] }; });
    check(`${tag} Learn next words 51–100 show no Latin mark (no "^"): word 51 reads ${marks.r51}`, marks.n >= 40 && marks.latin.length === 0 && marks.r51 === lemmaText(rows[50].l) && rows[50].l.includes("^"), JSON.stringify(marks));
    await vo2(page, "#learnNextSheet", "[data-ln-vocab=learn]");
    await page.waitForSelector("#vocabSheet .vo-lw-ar", { timeout: 8000 }).catch(() => {});
    const vmarks = await page.evaluate(() => [...document.querySelectorAll("#vocabSheet .vo-lw-ar")].map((e) => e.textContent).filter((t) => /[\^#@\[]/.test(t)));
    check(`${tag} the Vocabulary Learn list of 51–100 shows no Latin mark`, vmarks.length === 0, JSON.stringify(vmarks));
    await vo(page, "[data-vo=menu]"); await vo(page, "[data-vo=close]"); await sleep(page, 300);
  }

  // ---- fit at every width: the sheet, the menu, a question
  await page.evaluate(() => { const s = document.getElementById("learnNextSheet"); if (s?.hidden) document.querySelector("#tabVocabularyBtn")?.click(); });
  await openVocab(page).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="25"]')?.click());
  await sleep(page, 250);
  const fits = [];
  fits.push(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await vo2(page, "#learnNextSheet", "[data-ln-vocab=practise]");
  await page.waitForSelector("#vocabSheet [data-vo=start]", { timeout: 8000 }).catch(() => {});
  fits.push(await page.evaluate(() => { const b = document.querySelector("#vocabSheet .vo-body"); return Math.max(document.documentElement.scrollWidth - innerWidth, b.scrollWidth - b.clientWidth); }));
  for (const kind of ["ayah", "arabic"]) {
    await vo(page, "[data-vo=menu]"); await vo(page, `[data-kind=${kind}]`);
    await page.waitForSelector("#vocabSheet .vo-card", { timeout: 10000 }).catch(() => {});
    await sleep(page, 400);
    fits.push(await page.evaluate(() => { const b = document.querySelector("#vocabSheet .vo-body"); const small = [...document.querySelectorAll("#vocabSheet button")].filter((x) => x.getBoundingClientRect().height < 44).length; return Math.max(document.documentElement.scrollWidth - innerWidth, b.scrollWidth - b.clientWidth) + small * 1000; }));
  }
  check(`${tag} no sideways scroll, every button 44px+, in the menu, the āyah question and the Arabic question`, fits.every((x) => x <= 0), fits.join());
  if (lang === "bn") {
    await vo(page, "[data-vo=menu]");
    const chrome = await page.evaluate(() => [...document.querySelectorAll("#vocabSheet .vo-title, #vocabSheet .vo-kind, #vocabSheet .vo-test, #vocabSheet .vo-learn, #vocabSheet .vo-note, #learnNextSheet .ln-vbtn")].map((e) => e.textContent).join(" | "));
    check(`${tag} Bangla has no English in the module's own words`, !/[A-Za-z]/.test(chrome.replace(/৷/g, "")), chrome);
  }
  await ctx.close();
}

// ---------------------------------------------------------------- the Word card
{
  const tag = "[en 390 word card]";
  console.log(`\n=== Vocabulary ${tag} ===`);
  const ctx = await newContext(browser, { banner: false, viewport: { width: 390, height: 844 } });
  await ctx.route("**/archive.org/**", (r) => r.abort());
  if (MUTATE && MUT[MUTATE]) {
    const [file, a, b] = MUT[MUTATE];
    await ctx.route(`**/${file}*`, async (r) => { const src = fs.readFileSync(file, "utf8"); if (!src.includes(a)) throw new Error(`mutation anchor missing: ${MUTATE}`); await r.fulfill({ status: 200, contentType: file.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8", body: src.split(a).join(b) }); });
  }
  const { page } = await openPage(ctx, "/app/quranrevival.html");
  await sleep(page, 600);
  if (!(await page.evaluate(() => (document.getElementById("tabReadBtn")?.getBoundingClientRect().width ?? 0) > 0))) { await page.click("#tabStudyBtn"); await sleep(page, 150); }
  await page.click("#tabReadBtn"); await sleep(page, 500);
  const r1 = rows[0], s = Math.floor(r1.o / 1000000), a = Math.floor((r1.o % 1000000) / 1000), p = r1.o % 1000;
  await page.evaluate(([s, a]) => { const ss = document.getElementById("surahSelect"); if (ss.value !== String(s)) { ss.value = String(s); ss.dispatchEvent(new Event("change", { bubbles: true })); } setTimeout(() => { const as = document.getElementById("ayahSelect"); as.value = String(a); as.dispatchEvent(new Event("change", { bubbles: true })); }, 600); }, [s, a]);
  await page.waitForFunction(([s, a]) => !!document.querySelector(`[data-word-occurrence$=":${s}:${a}:1"]`), [s, a], { timeout: 8000 }).catch(() => {});
  await sleep(page, 900);
  await page.evaluate(([s, a, p]) => document.querySelector(`[data-word-occurrence$=":${s}:${a}:${p}"]`)?.click(), [s, a, p]);
  await page.waitForSelector("#quranWordCardMount .quran-word-card", { timeout: 8000 }).catch(() => {});
  await sleep(page, 1200);
  const btn = await page.evaluate(() => { const b = document.querySelector("#quranWordCardMount .word-card-practise"); if (!b) return null; const c = getComputedStyle(b); const probe = document.createElement("span"); b.closest(".quran-word-card").appendChild(probe); probe.style.color = "var(--wc-purple-ink)"; probe.style.backgroundColor = "var(--wc-purple-bg)"; const want = [getComputedStyle(probe).color, getComputedStyle(probe).backgroundColor]; probe.remove(); return { h: b.getBoundingClientRect().height, ok: c.color === want[0] && c.backgroundColor === want[1], got: [c.color, c.backgroundColor], want }; });
  check(`${tag} the WbW level has a purple "Practise this word" button, 44px+, painted in the card's purple token (equal, not merely readable)`, !!btn && btn.h >= 44 && btn.ok, JSON.stringify(btn));
  const level0 = await page.evaluate(() => document.querySelector("#quranWordCardMount [data-word-card-panel]")?.dataset.wordCardPanel);
  await page.evaluate(() => document.querySelector("#quranWordCardMount .word-card-practise")?.click());
  await page.waitForSelector("#vocabSheet .vo-card", { timeout: 15000 }).catch(() => {});
  // UPDATED IN PLACE for PCF MSA J56 (the Owner, 20 Oct 2026: "Only 3 questions! Can you make it to 10?"): ten
  // questions -- a flashcard, then Pick the meaning / Pick the Arabic / In its āyah three times, each āyah question at a
  // DIFFERENT place of the word.
  const qs = [], words = [], ayahAt = [];
  for (let i = 0; i < 10; i++) {
    const kind = await page.evaluate(() => document.querySelector("#vocabSheet .vo-card")?.dataset.voKind ?? null);
    const n = await voText(page, ".vo-prog");
    if (kind === "flashcard") {
      words.push(await voText(page, ".vo-card .vo-ar"));
      await vo(page, "[data-vo=reveal]"); await sleep(page, 150);
      await vo(page, "[data-vo=flash][data-right='1']"); await sleep(page, 300);
      qs.push(`flashcard@${n}`);
      continue;
    }
    if (!kind) break;
    const r = await answerChoice(page, "en", true);
    qs.push(r.info.kind); words.push(r.row?.l ?? null);
    if (r.info.kind === "ayah") ayahAt.push(r.info.occ);
    await nextQ(page);
  }
  const count = (k) => qs.filter((q) => q.startsWith(k)).length;
  check(`${tag} J56: "Practise this word" asks TEN questions: 1 flashcard, 3 Pick the meaning, 3 Pick the Arabic, 3 In its āyah`, qs.length === 10 && count("flashcard") === 1 && count("meaning") === 3 && count("arabic") === 3 && count("ayah") === 3 && /1 of 10/.test(qs[0]), qs.join());
  check(`${tag} J56: every question is about word 1 (${rows[0].l})`, words.length === 10 && words.every((w) => w === null || nfc(w) === nfc(rows[0].l) || nfc(w) === nfc(lemmaText(rows[0].l))), JSON.stringify(words));
  const placeOk = ayahAt.every((occ) => { const [ss, aa, pp] = String(occ).split(":").map(Number); const su = JSON.parse(fs.readFileSync(`${OUT}surahs/surah_${String(ss).padStart(3, "0")}.json`, "utf8")); return su.ayahs.find((x) => x.ayah === aa)?.words.find((w) => w.position === pp)?.morphology?.lemma === rows[0].l; });
  check(`${tag} J56: the three āyah questions ring three DIFFERENT places, each a real place of the word (${ayahAt.join(" · ")})`, ayahAt.length === 3 && new Set(ayahAt).size === 3 && placeOk, JSON.stringify(ayahAt));
  await page.waitForSelector("#vocabSheet [data-vo-score]", { timeout: 8000 }).catch(() => {});
  await sleep(page, 800);
  check(`${tag} the score screen says 10 of 10`, /\b10\b.*\b10\b/.test(await voText(page, "[data-vo-score]") ?? ""), await voText(page, "[data-vo-score]"));
  await vo(page, "[data-vo=close]");
  await sleep(page, 400);
  const back = await page.evaluate(() => ({ hidden: document.getElementById("vocabSheet").hidden, card: !!document.querySelector("#quranWordCardMount .quran-word-card"), level: document.querySelector("#quranWordCardMount [data-word-card-panel]")?.dataset.wordCardPanel, occ: document.querySelector("#quranWordCardMount .quran-word-card")?.innerText.includes("مِن") }));
  check(`${tag} Back returns to the same card and level (${level0})`, back.hidden && back.card && back.level === level0, JSON.stringify(back));
  // Architect review (the brief: "then the Word card for one of them shows Achieved"). The card's state buttons are
  // PER PLACE and only Achieved crosses places (knownElsewhere), so the path that must agree is: the card open -> its
  // Learn next line -> First 10 -> Step test passed -> "Yes, mark them" -> back to the SAME card, which now shows Achieved
  // without a reload (it showed the old mark: the card was never redrawn when the sheet closed).
  const before = await page.evaluate(() => document.querySelector('#quranWordCardMount [data-word-progress-state][aria-pressed="true"]')?.dataset.wordProgressState ?? null);
  // Updated in place 23 Oct 2026 (PCF MSA J82 part 1): the purple line opens the next word's card now; the list is opened
  // from the Vocabulary tab (the same openLearnNextSheet()).
  await page.evaluate(() => document.getElementById("tabVocabularyBtn")?.click());
  await page.waitForFunction(() => { const s = document.getElementById("learnNextSheet"); return s && !s.hidden && s.querySelectorAll(".ln-row").length > 0; }, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('#learnNextSheet [data-ln-tile="10"]')?.click());
  await sleep(page, 250);
  await vo2(page, "#learnNextSheet", "[data-ln-vocab=test]");
  await page.waitForSelector("#vocabSheet .vo-card", { timeout: 10000 }).catch(() => {});
  for (let i = 0; i < 10; i++) { await answerChoice(page, "en", true); await sleep(page, 150); }
  await page.waitForSelector("#vocabSheet [data-vo=markyes]", { timeout: 8000 }).catch(() => {});
  await vo(page, "[data-vo=markyes]");
  await page.waitForSelector("#vocabSheet .vo-moved", { timeout: 15000 }).catch(() => {});
  await vo(page, "[data-vo=menu]"); await sleep(page, 200); await vo(page, "[data-vo=close]"); await sleep(page, 1200);
  await page.evaluate(() => document.querySelector("#learnNextSheet [data-ln-back]")?.click()); await sleep(page, 400);
  const after = await page.evaluate(() => ({ occ: document.querySelector("#quranWordCardMount .quran-word-card") ? !!document.querySelector("#quranWordCardMount [data-word-progress-state]") : false, state: document.querySelector('#quranWordCardMount [data-word-progress-state][aria-pressed="true"]')?.dataset.wordProgressState ?? null }));
  check(`${tag} the SAME Word card shows Achieved after a passed step test from its Learn next line, without a reload (was ${before})`, before !== "achieved" && after.occ && after.state === "achieved", JSON.stringify(after));
  await ctx.close();
}

async function vo2(page, root, sel) { await page.evaluate(([r, s]) => document.querySelector(r + " " + s)?.click(), [root, sel]); await sleep(page, 400); }

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
