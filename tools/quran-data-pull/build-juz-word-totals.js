// Issue #206 -- Word-by-Word whole-Qur'an/Juz running counter needs a real
// per-Juz word DENOMINATOR, and it did not exist anywhere in this repository
// before this file. Rather than estimate or hand-type 30 numbers, this scans
// the already-pulled per-surah JSON exactly the way build-juz-index.js does:
// each ayah already carries its real `juz` number and its real `words[]`
// array, both straight from the source data pull.js already ran, so the 30
// totals are DERIVED, not guessed.
//
// Run after pull.js (or after any re-pull): node build-juz-word-totals.js
// Output: output/juz-word-totals.json -- 30 rows, {juz, totalWords}, plus a
// top-level quranTotalWords for a cheap cross-check. Consumed by
// app/js/quran-data.js's getJuzWordTotalsIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "juz-word-totals.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const totals = new Map(); // juz -> word count
let quranTotalWords = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  for (const a of data.ayahs) {
    const wordCount = Array.isArray(a.words) ? a.words.length : 0;
    totals.set(a.juz, (totals.get(a.juz) ?? 0) + wordCount);
    quranTotalWords += wordCount;
  }
}

const rows = [];
for (let juz = 1; juz <= 30; juz++) {
  if (!totals.has(juz)) throw new Error(`Juz ${juz} never appears in any pulled surah -- data pull is incomplete.`);
  rows.push({ juz, totalWords: totals.get(juz) });
}

const summed = rows.reduce((sum, r) => sum + r.totalWords, 0);
if (summed !== quranTotalWords) {
  throw new Error(`Per-Juz totals (${summed}) do not sum to the traversed whole-Qur'an total (${quranTotalWords}) -- refusing to write a self-contradictory file.`);
}

writeFileSync(outPath, JSON.stringify({ quranTotalWords, byJuz: rows }, null, 2));
console.log(`Wrote 30 juz word totals (summing to ${quranTotalWords}) to ${outPath}`);
