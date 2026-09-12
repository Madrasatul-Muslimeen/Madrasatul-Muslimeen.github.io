import assert from "node:assert/strict";
import { quranWordOccurrenceId as id } from "../../app/js/quran-word-identity.js";
import { computeWbwCoverage, occurrenceIdsForAyahRange } from "../../app/js/quran-word-coverage.js";
import { readFileSync } from "node:fs";

let passed = 0;
function check(label, fn) { fn(); passed++; console.log(`  PASS  ${label}`); }
const a = id(1, 1, 1), b = id(1, 1, 2), c = id(1, 1, 3), outside = id(2, 1, 1);
check("zero scope has explicit zero denominator", () => assert.deepEqual(computeWbwCoverage([], []), { identityContract: "quran-word-occurrence:v1", total: 0, approved: 0, remaining: 0, percent: 0 }));
check("partial coverage is bounded and precise", () => assert.deepEqual(computeWbwCoverage([a, b, c], [a]), { identityContract: "quran-word-occurrence:v1", total: 3, approved: 1, remaining: 2, percent: 33.33 }));
check("duplicate scope and approvals count once", () => assert.equal(computeWbwCoverage([a, a, b], [a, a]).percent, 50));
check("approved occurrences outside selected scope do not inflate coverage", () => assert.equal(computeWbwCoverage([a, b], [a, outside]).approved, 1));
check("complete coverage is exactly 100 percent", () => assert.equal(computeWbwCoverage([a, b], [a, b]).percent, 100));
check("unknown identity versions are rejected", () => assert.throws(() => computeWbwCoverage([a], ["quran-word-occurrence:v2:1:1:1"]), /Unsupported/));
check("raw actions cannot be used in place of approved occurrence IDs", () => assert.throws(() => computeWbwCoverage([a], ["wbw.engaged"]), /invalid shape/));
const chapter = JSON.parse(readFileSync(new URL("../quran-data-pull/output/surahs/surah_001.json", import.meta.url), "utf8"));
check("range scope uses already-loaded Surah word positions", () => assert.deepEqual(occurrenceIdsForAyahRange(chapter, 1, 1), [a, b, c, id(1, 1, 4)]));
check("multi-ayah scope is bounded to selected ayahs", () => {
  const ids = occurrenceIdsForAyahRange(chapter, 1, 2);
  assert.equal(ids.length, chapter.ayahs[0].words.length + chapter.ayahs[1].words.length);
  assert.equal(ids.at(-1), id(1, 2, chapter.ayahs[1].words.at(-1).position));
});
check("invalid or out-of-range bounds fail closed", () => assert.throws(() => occurrenceIdsForAyahRange(chapter, 5, 8), /bounded/));
console.log(`\n==== Pure WbW coverage: ${passed} passed, 0 failed ====`);
