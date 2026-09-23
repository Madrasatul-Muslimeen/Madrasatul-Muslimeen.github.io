// Issue #188 -- the Mushaf page view's own w.loc word position
// (mushaf/mushaf-madani-v2.json) and the app's own word-by-word position
// (quranWordOccurrenceId() / renderWordByWordPanel(), sourced from
// tools/quran-data-pull/output/surahs/*.json) are two INDEPENDENT numbering
// schemes over the same text, from two different upstream sources. The issue
// that assigned this round said outright: "If they diverge even once, a tap
// would silently open the wrong word's card -- check this for real, against
// the app's own word data, not by assuming both come from the same upstream
// source." This is that check, over EVERY ayah in the Quran, not a sample.
//
// It found exactly three divergences (2:181, 8:6, 13:37 -- all the same
// cause: the corpus word-by-word data joins "بَعْدَ مَا" into one word entry
// with an internal space, the Mushaf print layout counts it as two
// positions) and app/js/hifz-renderer.js's own AYAH_WORD_MERGES table
// corrects exactly those three. This check re-derives the divergence set
// from the live data on every run and fails if the app's table and the data
// ever disagree -- a future QUL or corpus data refresh is exactly the kind
// of silent change that would otherwise reopen this defect unnoticed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const { AYAH_WORD_MERGES, resolveWordOccurrencePosition } = await import(path.join(root, "app/js/hifz-renderer.js"));

const mushafData = JSON.parse(fs.readFileSync(path.join(root, "mushaf/mushaf-madani-v2.json"), "utf8"));

// Same per-ayah "highest w.loc position = the ayah-end marker, not a real
// word" convention hifz-renderer.js itself uses, re-derived independently
// from the raw data rather than imported, so this check cannot be fooled by
// a defect in that same logic.
const mushafPositionsByAyah = {}; // "surah:ayah" -> every w.loc position seen, unsorted
for (const pageNum of Object.keys(mushafData)) {
  for (const line of mushafData[pageNum]) {
    if (line.type !== "ayah" || !line.words) continue;
    for (const w of line.words) {
      const [s, a, posStr] = w.loc.split(":");
      const key = `${s}:${a}`;
      if (!mushafPositionsByAyah[key]) mushafPositionsByAyah[key] = [];
      mushafPositionsByAyah[key].push(Number(posStr));
    }
  }
}
const mushafRealWordCount = {}; // "surah:ayah" -> word count, marker excluded
for (const [key, positions] of Object.entries(mushafPositionsByAyah)) {
  mushafRealWordCount[key] = Math.max(...positions) - 1; // drop the marker (the highest position)
}

let pass = 0;

const surahFiles = fs.readdirSync(path.join(root, "tools/quran-data-pull/output/surahs")).sort();
assert.equal(surahFiles.length, 114, `expected all 114 surah files, found ${surahFiles.length}`);
pass++;
console.log(`  PASS  found all 114 surah word-data files`);

let totalAyahs = 0;
const found = {}; // "surah:ayah" -> { appCount, mushafCount }
for (const file of surahFiles) {
  const surah = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/surahs", file), "utf8"));
  for (const a of surah.ayahs) {
    totalAyahs++;
    const key = `${surah.surahNumber}:${a.ayah}`;
    const mushafCount = mushafRealWordCount[key];
    assert.ok(Number.isFinite(mushafCount), `${key}: no Mushaf page-layout data at all (app has ${a.words.length} words)`);
    if (mushafCount !== a.words.length) found[key] = { appCount: a.words.length, mushafCount };
  }
}
assert.equal(totalAyahs, 6236, `expected all 6,236 ayahs, walked ${totalAyahs}`);
pass++;
console.log(`  PASS  walked all 6,236 ayahs across all 114 surahs`);

const diverging = Object.keys(found);
assert.deepEqual(
  diverging.sort(),
  Object.keys(AYAH_WORD_MERGES).sort(),
  `the set of ayahs where the Mushaf's own word count and the app's own word count disagree no longer matches AYAH_WORD_MERGES in app/js/hifz-renderer.js -- found: ${JSON.stringify(found)}`
);
pass++;
console.log(`  PASS  exactly the ${diverging.length} known-divergent ayahs found, matching AYAH_WORD_MERGES`);

// Each merge must close the EXACT gap: app is short by exactly one word
// against the Mushaf's own (marker-excluded) count, since AYAH_WORD_MERGES
// only ever collapses ONE pair of Mushaf positions into one occurrence.
for (const key of diverging) {
  const { appCount, mushafCount } = found[key];
  assert.equal(mushafCount, appCount + 1, `${key}: expected exactly one merged pair (mushaf = app + 1), got app=${appCount} mushaf=${mushafCount}`);
}
pass++;
console.log(`  PASS  every divergence is exactly one merged word pair`);

// mergeAt must fall strictly inside the ayah's own real word range, or the
// resolveWordOccurrencePosition() arithmetic in hifz-renderer.js silently
// produces a position that doesn't exist in the app's own word list.
for (const [key, mergeAt] of Object.entries(AYAH_WORD_MERGES)) {
  const appCount = found[key]?.appCount;
  assert.ok(Number.isFinite(appCount), `${key}: declared in AYAH_WORD_MERGES but is not actually a divergent ayah`);
  assert.ok(mergeAt >= 1 && mergeAt < appCount, `${key}: mergeAt=${mergeAt} is out of range for its ${appCount} real words`);
}
pass++;
console.log(`  PASS  every mergeAt falls inside its own ayah's real word range`);

// The function itself, not just the table: walk every REAL Mushaf position of
// each divergent ayah (marker excluded) through resolveWordOccurrencePosition
// and confirm the resulting app-side positions are exactly 1..appCount, with
// the merged pair both resolving to the SAME occurrence (mergeAt) and every
// later position shifted back by exactly one -- not merely that a table entry
// exists, but that the arithmetic it drives lands on every real word once.
for (const [key, mergeAt] of Object.entries(AYAH_WORD_MERGES)) {
  const appCount = found[key].appCount;
  const realPositions = mushafPositionsByAyah[key]
    .filter((p) => p < Math.max(...mushafPositionsByAyah[key])) // marker excluded
    .sort((a, b) => a - b);
  const resolved = realPositions.map((p) => resolveWordOccurrencePosition(key, p));
  assert.equal(resolved.length, appCount + 1, `${key}: expected ${appCount + 1} real Mushaf positions (one merged pair), got ${resolved.length}`);
  const expectedMultiset = [...Array(appCount).keys()].map((i) => i + 1).concat([mergeAt]).sort((a, b) => a - b);
  assert.deepEqual(resolved.slice().sort((a, b) => a - b), expectedMultiset,
    `${key}: resolveWordOccurrencePosition() did not land on every app word exactly once (plus one duplicate at mergeAt=${mergeAt}) -- got ${JSON.stringify(resolved)}`);
}
pass++;
console.log(`  PASS  resolveWordOccurrencePosition() maps every real Mushaf position of each divergent ayah onto exactly its ${Object.keys(AYAH_WORD_MERGES).length} ayahs' own real word positions, once each (plus the merged duplicate)`);

console.log(`\n==== Mushaf word-occurrence position parity: ${pass} passed, 0 failed ====`);
