// Shell round 18 — the Study Unit picker gained Hizb, which the app has
// listed in unit-keys.js's UNIT_TYPES since Phase 5 but never had a boundary
// table for. Built exactly the way build-juz-index.js and build-page-index.js
// are: scan the already-pulled per-ayah field rather than hand-typing
// boundaries, so it cannot drift from the text the app actually shows.
//
// The pulled field is `hizbQuarter`, 1..240 — the QUARTER, not the hizb. A
// hizb is four quarters, so hizb = ceil(hizbQuarter / 4), giving 60 hizbs,
// two per juz. Checked against the real data rather than assumed: the file
// refuses to write if the quarters do not run 1..240 without gaps, or if the
// hizbs do not come out at exactly 60.
//
// NO RE-PULL IS NEEDED for this — every surah file on disk already carries
// hizbQuarter. That is why Hizb could be added in the same round as the
// Page/Juz pickers instead of waiting on a data round.
//
// Run after pull.js (or after any re-pull): node build-hizb-index.js
// Output: output/hizb-index.json — 60 rows, {hizb, startSurah, startAyah,
// endSurah, endAyah, juz}. Same shape as juz-index.json so the app's own
// ayahCoverage()/unit-picker code treats all three identically.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const surahsDir = join(here, "output", "surahs");
const outPath = join(here, "output", "hizb-index.json");

const files = readdirSync(surahsDir)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const first = new Map(); // hizb -> {surah, ayah, juz}
const last = new Map();
const quarters = new Set();

for (const file of files) {
  const data = JSON.parse(readFileSync(join(surahsDir, file), "utf8"));
  const surah = data.surahNumber ?? Number(file.match(/\d+/)[0]);
  for (const a of data.ayahs) {
    if (typeof a.hizbQuarter !== "number") {
      throw new Error(`Surah ${surah} ayah ${a.ayah} has no hizbQuarter — this index cannot be built from the current pull.`);
    }
    quarters.add(a.hizbQuarter);
    const hizb = Math.ceil(a.hizbQuarter / 4);
    if (!first.has(hizb)) first.set(hizb, { surah, ayah: a.ayah, juz: a.juz });
    last.set(hizb, { surah, ayah: a.ayah });
  }
}

for (let q = 1; q <= 240; q++) {
  if (!quarters.has(q)) throw new Error(`hizbQuarter ${q} never appears in the pulled data — the pull is incomplete.`);
}
if (quarters.size !== 240) throw new Error(`Expected 240 hizb quarters, found ${quarters.size}.`);
if (first.size !== 60) throw new Error(`Expected 60 hizbs, found ${first.size}.`);

const out = [];
for (let hizb = 1; hizb <= 60; hizb++) {
  out.push({
    hizb,
    startSurah: first.get(hizb).surah,
    startAyah: first.get(hizb).ayah,
    endSurah: last.get(hizb).surah,
    endAyah: last.get(hizb).ayah,
    juz: first.get(hizb).juz,
  });
}

writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} hizb entries to ${outPath}`);
