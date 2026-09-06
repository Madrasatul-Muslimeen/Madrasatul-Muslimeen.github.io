// Phase 5 round 14 — Explore navigator's Juz-wheel needs to know which
// surah/ayah each of the 604 Madani mushaf pages *starts* at, so clicking a
// page can jump to the right Surah-wheel. Same discipline as
// build-juz-index.js: scan the already-pulled per-ayah `page` field
// (confirmed present, standard 604-page Madani numbering) rather than
// hand-typing a boundary table.
//
// Deliberately does NOT tag each page with "its" Juz — checked against the
// real pulled data first, and some pages straddle a Juz boundary (page 62
// carries both 3:92, Juz 3's last ayah, and 3:93, Juz 4's first). A page
// can legitimately belong to two Juz at once, so "which pages does Juz J
// show" is computed the other way around, directly from Juz J's own
// boundary ayahs' page numbers (see build-juz-index.js's startPage/endPage,
// added this same round) — not by filtering this file's rows.
//
// Run after pull.js (or after any re-pull): node build-page-index.js
// Output: output/page-index.json — 604 rows, {page, startSurah, startAyah,
// endSurah, endAyah}. Consumed by app/js/quran-data.js's getPageIndex().

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "page-index.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const first = new Map(); // page -> {surah, ayah}
const last = new Map();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  const surah = data.surahNumber ?? Number(file.match(/\d+/)[0]);
  for (const a of data.ayahs) {
    if (!first.has(a.page)) first.set(a.page, { surah, ayah: a.ayah });
    last.set(a.page, { surah, ayah: a.ayah });
  }
}

const maxPage = Math.max(...first.keys());
const out = [];
for (let page = 1; page <= maxPage; page++) {
  if (!first.has(page)) throw new Error(`Page ${page} never appears in any pulled surah — data pull is incomplete.`);
  out.push({
    page,
    startSurah: first.get(page).surah,
    startAyah: first.get(page).ayah,
    endSurah: last.get(page).surah,
    endAyah: last.get(page).ayah,
  });
}

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} page entries to ${outPath}`);
