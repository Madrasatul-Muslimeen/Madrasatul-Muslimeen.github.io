// Issue #341 -- "My Status"'s "By unit" Ruku' row needs a boundary table for
// Ruku', which did not exist anywhere in this repository before this file
// (unlike Juz/Page/Hizb, each of which already has one -- see
// build-juz-index.js/build-page-index.js/build-hizb-index.js, all built the
// same way this one is). The pulled per-ayah `ruku` field is a GLOBAL
// sequential index across the whole Qur'an (Surah 1 starts at ruku 1, Surah 2
// starts at ruku 2, ...), not a per-surah-relative one -- unit-keys.js's own
// rukuIndexInSurah() is what converts one to the other, for a caller that
// already has a surah's full ayahs array. This index needs none of that: it
// scans the already-pulled per-surah JSON exactly the way the other three
// index builders do, and writes the GLOBAL ruku number straight through.
//
// Run after pull.js (or after any re-pull): node build-ruku-index.js
// Output: output/ruku-index.json -- 556 rows, {ruku, surah, fromAyah,
// toAyah}, in ascending global-ruku order. Consumed by app/js/quran-data.js's
// getRukuIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "ruku-index.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const surahByRuku = new Map(); // ruku -> surah -- what "a ruku never crosses a surah" is checked against
const first = new Map(); // ruku -> ayah
const last = new Map(); // ruku -> ayah

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  const surah = data.surahNumber ?? Number(file.match(/\d+/)[0]);
  for (const a of data.ayahs) {
    if (typeof a.ruku !== "number") {
      throw new Error(`Surah ${surah} ayah ${a.ayah} has no ruku -- this index cannot be built from the current pull.`);
    }
    const ruku = a.ruku;
    const priorSurah = surahByRuku.get(ruku);
    if (priorSurah !== undefined && priorSurah !== surah) {
      throw new Error(`Ruku' ${ruku} appears in both surah ${priorSurah} and surah ${surah} -- a Ruku' must never cross a surah.`);
    }
    surahByRuku.set(ruku, surah);
    if (!first.has(ruku)) first.set(ruku, a.ayah);
    last.set(ruku, a.ayah);
  }
}

for (let r = 1; r <= 556; r++) {
  if (!surahByRuku.has(r)) throw new Error(`Ruku' ${r} never appears in any pulled surah -- the pull is incomplete.`);
}
if (surahByRuku.size !== 556) throw new Error(`Expected 556 Ruku's, found ${surahByRuku.size}.`);

const rows = [];
for (let ruku = 1; ruku <= 556; ruku++) {
  rows.push({ ruku, surah: surahByRuku.get(ruku), fromAyah: first.get(ruku), toAyah: last.get(ruku) });
}

writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} ruku entries to ${outPath}`);
