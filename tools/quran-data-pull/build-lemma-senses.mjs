// Decision 103 (12 Oct 2026) -- "Intermediate is for different meanings of the same root and of the same word".
// The Word card's Intermediate tab shows a word's DIFFERENT MEANINGS as the Qur'an's own word-by-word translation
// renders it: every occurrence of each dictionary word (lemma), grouped by the MAIN English word of its translation
// ("promises you", "You promised us" and "has promised" are one sense, "promis"; "you threaten us" another,
// "threaten"). Derived, never written by hand; nothing here is a scholar's judgement, and the card says so.
//
// Output tools/quran-data-pull/output/lemma-senses.json:
//   { contract, source, rule, lemmaCount, values: { lemma: [[label, count, [ref, ref, ref]], ...] } }
// Only lemmas with TWO OR MORE senses are written (a lemma with one sense has nothing to show); senses are in
// count order; refs are surah*1000000+ayah*1000+position (the lemmas-index encoding), at most 3 per sense.
// Run from the repository root: node tools/quran-data-pull/build-lemma-senses.mjs
import fs from "node:fs";

const OUT = "tools/quran-data-pull/output";
import { senseKey } from "../../app/js/lemma-senses.js";
const cleanLabel = (t) => String(t || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();

if (process.argv[1]?.endsWith("build-lemma-senses.mjs")) {
  const byLemma = new Map();
  for (let s = 1; s <= 114; s++) {
    const data = JSON.parse(fs.readFileSync(`${OUT}/surahs/surah_${String(s).padStart(3, "0")}.json`, "utf8"));
    for (const a of data.ayahs) for (const w of a.words) {
      const lemma = w.morphology?.lemma; if (!lemma) continue;
      const key = senseKey(w.translation?.en); if (!key) continue;
      if (!byLemma.has(lemma)) byLemma.set(lemma, new Map());
      const senses = byLemma.get(lemma);
      if (!senses.has(key)) senses.set(key, { count: 0, labels: new Map(), refs: [] });
      const e = senses.get(key); e.count++;
      const label = cleanLabel(w.translation.en).toLowerCase();
      e.labels.set(label, (e.labels.get(label) ?? 0) + 1);
      if (e.refs.length < 3) e.refs.push(s * 1000000 + a.ayah * 1000 + w.position);
    }
  }
  const values = {};
  for (const [lemma, senses] of byLemma) {
    if (senses.size < 2) continue;
    values[lemma] = [...senses.values()].sort((x, y) => y.count - x.count).map((e) => {
      const label = [...e.labels.entries()].sort((x, y) => y[1] - x[1] || x[0].length - y[0].length)[0][0];
      return [label, e.count, e.refs];
    });
  }
  const out = { contract: "lemma-senses:v1", source: "tools/quran-data-pull/output/surahs (word-by-word English translation)",
    rule: "Each dictionary word's occurrences grouped by the main English word of their word-by-word translation. Only words with two or more such groups.",
    lemmaCount: Object.keys(values).length, values };
  fs.writeFileSync(`${OUT}/lemma-senses.json`, JSON.stringify(out));
  console.log(`${out.lemmaCount} lemmas with 2+ senses; ${fs.statSync(`${OUT}/lemma-senses.json`).size} bytes`);
}
