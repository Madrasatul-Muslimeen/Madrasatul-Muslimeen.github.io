// Phase 5 — Explore navigator's Quran-wheel needs to know where each of the
// 30 Juz begins/ends (surah + ayah), to jump the study screen there on
// click. Rather than hand-type that boundary table from memory, this scans
// the already-pulled per-surah JSON (each ayah already carries its real
// `juz` number, straight from the source data pull.js already ran) and
// derives it — so it's verified against real data, not a remembered list.
//
// Phase 5 round 14 — startPage/endPage added (purely additive; the four
// original fields are unchanged), for the Juz-wheel -> Juz's own pages
// drill-down level. Deliberately NOT computed as "which pages have this
// juz's number" — checked directly against the real pulled data first
// (page 62 carries both Juz 3's last ayah, 3:92, and Juz 4's first, 3:93 —
// a page CAN straddle a Juz boundary here, contradicting the old app's own
// "a page never straddles a Juz boundary" comment, which was written
// against whatever edition its live alquran.cloud calls returned, not this
// pulled data). So this matches what the old app's code actually DOES
// rather than what its comment assumes: a Juz's own boundary ayahs' page
// numbers bound its page range directly (index.html's own
// ensureJuzPageRange), which means a straddling page like 62 correctly
// shows up in both Juz 3's and Juz 4's page range -- not an error to guard
// against, just how the two boundaries actually line up.
//
// Run after pull.js (or after any re-pull): node build-juz-index.js
// Output: output/juz-index.json — 30 rows, {juz, startSurah, startAyah,
// startPage, endSurah, endAyah, endPage}. Consumed by
// app/js/quran-data.js's getJuzIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "juz-index.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const first = new Map(); // juz -> {surah, ayah, page}
const last = new Map();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  const surah = data.surahNumber ?? Number(file.match(/\d+/)[0]);
  for (const a of data.ayahs) {
    if (!first.has(a.juz)) first.set(a.juz, { surah, ayah: a.ayah, page: a.page });
    last.set(a.juz, { surah, ayah: a.ayah, page: a.page });
  }
}

const out = [];
for (let juz = 1; juz <= 30; juz++) {
  if (!first.has(juz)) throw new Error(`Juz ${juz} never appears in any pulled surah — data pull is incomplete.`);
  const f = first.get(juz);
  const l = last.get(juz);
  out.push({
    juz,
    startSurah: f.surah,
    startAyah: f.ayah,
    startPage: f.page,
    endSurah: l.surah,
    endAyah: l.ayah,
    endPage: l.page,
  });
}

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} juz entries to ${outPath}`);
