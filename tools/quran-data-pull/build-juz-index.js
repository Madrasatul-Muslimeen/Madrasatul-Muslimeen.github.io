// Phase 5 — Explore navigator's Quran-wheel needs to know where each of the
// 30 Juz begins/ends (surah + ayah), to jump the study screen there on
// click. Rather than hand-type that boundary table from memory, this scans
// the already-pulled per-surah JSON (each ayah already carries its real
// `juz` number, straight from the source data pull.js already ran) and
// derives it — so it's verified against real data, not a remembered list.
//
// Run after pull.js (or after any re-pull): node build-juz-index.js
// Output: output/juz-index.json — 30 rows, {juz, startSurah, startAyah,
// endSurah, endAyah}. Consumed by app/js/quran-data.js's getJuzIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "juz-index.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const first = new Map(); // juz -> {surah, ayah}
const last = new Map();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  const surah = data.surahNumber ?? Number(file.match(/\d+/)[0]);
  for (const a of data.ayahs) {
    if (!first.has(a.juz)) first.set(a.juz, { surah, ayah: a.ayah });
    last.set(a.juz, { surah, ayah: a.ayah });
  }
}

const out = [];
for (let juz = 1; juz <= 30; juz++) {
  if (!first.has(juz)) throw new Error(`Juz ${juz} never appears in any pulled surah — data pull is incomplete.`);
  out.push({
    juz,
    startSurah: first.get(juz).surah,
    startAyah: first.get(juz).ayah,
    endSurah: last.get(juz).surah,
    endAyah: last.get(juz).ayah,
  });
}

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} juz entries to ${outPath}`);
