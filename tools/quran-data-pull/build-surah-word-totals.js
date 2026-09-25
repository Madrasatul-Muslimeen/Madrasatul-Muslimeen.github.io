// Issue #261 -- Word by Word's own Explore tab needs a real per-SURAH word
// DENOMINATOR at its Juz level (one wedge per surah/part-surah inside a Juz),
// and it did not exist anywhere in this repository before this file. Same
// discipline as build-juz-word-totals.js, deliberately not merged into it:
// that script's output (juz-word-totals.json) is already consumed by
// app/js/quran-data.js's getJuzWordTotalsIndex() and this round must not
// touch the write path or reshape a file another reader already depends on.
//
// Run after pull.js (or after any re-pull): node build-surah-word-totals.js
// Output: output/surah-word-totals.json -- 114 rows, {surah, totalWords},
// plus a top-level quranTotalWords cross-check. Consumed by
// app/js/quran-data.js's getSurahWordTotalsIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "surah-word-totals.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const rows = [];
let quranTotalWords = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  let surahTotal = 0;
  for (const a of data.ayahs) surahTotal += Array.isArray(a.words) ? a.words.length : 0;
  rows.push({ surah: data.surahNumber, totalWords: surahTotal });
  quranTotalWords += surahTotal;
}

if (rows.length !== 114) throw new Error(`Expected 114 surahs, found ${rows.length} -- data pull is incomplete.`);
rows.sort((a, b) => a.surah - b.surah);

const summed = rows.reduce((sum, r) => sum + r.totalWords, 0);
if (summed !== quranTotalWords) {
  throw new Error(`Per-surah totals (${summed}) do not sum to the traversed whole-Qur'an total (${quranTotalWords}) -- refusing to write a self-contradictory file.`);
}

writeFileSync(outPath, JSON.stringify({ quranTotalWords, bySurah: rows }, null, 2));
console.log(`Wrote 114 surah word totals (summing to ${quranTotalWords}) to ${outPath}`);
