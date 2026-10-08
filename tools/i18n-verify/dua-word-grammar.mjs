// Round 5b of "Dua words that work like Qur'an words" (decision 91, issue 662): the grammar files written by
// tools/hadith-data-pull/dua-word-grammar.py. Run from the repository root:  node tools/i18n-verify/dua-word-grammar.mjs
// Checks: every grammar file's fingerprints match its words file; only UNLINKED words appear; the coverage count;
// values written BY HAND from the analysis (a lemma/root pair per word below, independent of the script).
// With NO grammar files the suite FAILS by design ("the data was not generated"), never passes vacuously.
import fs from "node:fs";
import path from "node:path";
import { duaWords, duaWordTokens, duaWordsFingerprint, duaGrammarPosLabel } from "../../app/js/dua-words.js";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const DUA = "tools/hadith-data-pull/output/dua";
const files = fs.readdirSync(DUA).filter((f) => /^grammar-\d+\.json$/.test(f));
const wordFiles = fs.readdirSync(DUA).filter((f) => /^words-\d+\.json$/.test(f));
check("grammar files were generated (python3 tools/hadith-data-pull/dua-word-grammar.py)", files.length > 0 && files.length === wordFiles.length, `${files.length} grammar files, ${wordFiles.length} words files`);

check("the files are real analyses, not the empty placeholders (tool is not \"not generated\")", files.length > 0 && files.every((f) => !/^not generated/.test(JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8")).tool)), "placeholders present");

// The pure part-of-speech labels (plain words, never raw tags).
check("duaGrammarPosLabel: noun -> Noun, noun_prop -> Noun, verb -> Verb, part_neg -> Particle, prep -> Preposition",
  duaGrammarPosLabel("noun") === "Noun" && duaGrammarPosLabel("noun_prop") === "Noun" && duaGrammarPosLabel("verb") === "Verb" && duaGrammarPosLabel("part_neg") === "Particle" && duaGrammarPosLabel("prep") === "Preposition");
check("duaGrammarPosLabel: an unknown or missing tag is \"Word\", never the raw tag", duaGrammarPosLabel("xyz") === "Word" && duaGrammarPosLabel(undefined) === "Word");

let analysed = 0, unlinked = 0, badFp = 0, linkedLeak = 0, badShape = 0;
const byWord = new Map(); // dua word text -> [[lemma, root, pos, vowelled], ...]
for (const f of files) {
  const page = Number(f.match(/\d+/)[0]);
  const g = JSON.parse(fs.readFileSync(path.join(DUA, f), "utf8"));
  const w = JSON.parse(fs.readFileSync(path.join(DUA, `words-${page}.json`), "utf8"));
  const cards = JSON.parse(fs.readFileSync(path.join(DUA, `cards-${page}.json`), "utf8")).cards;
  for (const c of cards) {
    const r = duaWords(c.text); const links = w.duas[c.dua];
    if (links) unlinked += links.w.filter((x) => x < 0).length;
    const mine = g.duas[c.dua];
    if (!mine) continue;
    if (!r || !links || mine.f !== links.f || mine.f !== duaWordsFingerprint(r.words)) { badFp++; continue; }
    const toks = duaWordTokens(r.words);
    for (const [i, row] of Object.entries(mine.g)) {
      analysed++;
      if (links.w[i] !== -1) linkedLeak++;
      if (!Array.isArray(row) || row.length !== 4 || row.some((x) => typeof x !== "string") || !row[0]) badShape++;
      const list = byWord.get(toks[i]) ?? []; list.push(row); byWord.set(toks[i], list);
    }
  }
}
check("every grammar entry's fingerprint matches its words file and the words as the app reads them", files.length > 0 && badFp === 0, `${badFp} mismatched`);
check("only UNLINKED words appear (w[i] === -1)", analysed > 0 && linkedLeak === 0, `${linkedLeak} linked words appear`);
check("every entry is [lemma, root, pos, vowelled], all strings, with a lemma", analysed > 0 && badShape === 0, `${badShape} malformed`);
console.log(`  coverage: ${analysed} of ${unlinked} unlinked dua words have a grammar suggestion (${unlinked ? (100 * analysed / unlinked).toFixed(1) : 0}%)`);
check("coverage: at least half of the unlinked words are analysed (3,280 of 3,980, 82.4%, on 8 Oct 2026)", unlinked > 0 && analysed / unlinked >= 0.5, `${analysed}/${unlinked}`);

// Written by hand, from the Arabic itself (not from the script): the root of each word, the letters under the affixes.
// Updated in place by the Architect (8 Oct 2026), after running the script: CAMeL's calima-msa-r13 has no analysis for
// لبيك, وألجأت or منجا -- it answers "backoff" (NO_ANALYSIS) or a nonsense spelling variant ("the GATT", "Bey") -- and the
// script now gives such a word NO suggestion rather than a wrong one. So those three are checked for that, and two
// more roots the script must find are added (one of them through the weak-letter fill, ف.#.ض -> فوض).
const HAND = [["وفوضت", "فوض"], ["ورغبة", "رغب"], ["القبر", "قبر"], ["السفر", "سفر"]];
// A hollow verb's root is not read off its alif (قال is ق.و.ل, not قال): it is left out instead.
check("no root is read off a hollow verb's alif (no «قال»/«عاذ» roots)", ![...byWord].some(([, v]) => v.some((r) => ["قال", "عاذ", "فات", "جار"].includes(r[1]))));
const rowsOf = (word) => [...byWord].filter(([k]) => k.replace(/[ً-ْٰ]/g, "") === word).flatMap(([, v]) => v);
for (const [word, root] of HAND) {
  const rows = rowsOf(word);
  const roots = new Set(rows.map((r) => r[1].replace(/[ً-ْ]/g, "")));
  check(`by hand: ${word} has root ${root}`, rows.length > 0 && roots.has(root), rows.length ? JSON.stringify([...roots]) : "word not analysed (or not unlinked)");
}
for (const word of ["لبيك", "وألجأت", "منجا"]) check(`by hand: ${word} gets NO suggestion (the tool has no real analysis for it; nothing is guessed)`, rowsOf(word).length === 0, JSON.stringify(rowsOf(word)));
check("a root, where given, is three or four Arabic letters (the weak letter filled, never \"#\")", [...byWord].every(([, v]) => v.every((r) => r[1] === "" || /^[\u0621-\u064A]{3,4}$/u.test(r[1]))));
console.log(`\n==== Dua word grammar data: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
