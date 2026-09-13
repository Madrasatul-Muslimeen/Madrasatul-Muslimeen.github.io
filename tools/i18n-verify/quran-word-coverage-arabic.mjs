// MAP Phase 3 -- Arabic coverage over real stored states.
// The existing quran-word-coverage.mjs still guards the narrow Word Card
// projection; this suite covers the wider figure Explore and the wheel read.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { quranWordOccurrenceId as id } from "../../app/js/quran-word-identity.js";
import {
  computeArabicCoverage, occurrenceIdsForAyah, occurrenceIdsForSurah, occurrenceIdsForUnit, WBW_COVERAGE_STATES,
} from "../../app/js/quran-word-coverage.js";
import { resolveWordProgress } from "../../app/js/quran-word-progress.js";

let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); passed++; console.log(`  PASS  ${label}`); }
  catch (error) { failed++; console.log(`  FAIL  ${label}\n        ${error.message}`); }
}

const surah1 = JSON.parse(readFileSync(new URL("../quran-data-pull/output/surahs/surah_001.json", import.meta.url), "utf8"));
const surah2 = JSON.parse(readFileSync(new URL("../quran-data-pull/output/surahs/surah_002.json", import.meta.url), "utf8"));

const NOW = "2026-09-13T10:00:00.000Z";
const claim = (state) => ({ state, at: NOW, byPersonId: "p1" });
const decision = (review, note = null) => ({ review, at: NOW, byPersonId: "t9", note, forState: "achieved", forClaimAt: NOW, history: [], historyTruncated: 0 });
const view = (learner, supervisor, confirmationRequired) =>
  ({ ...resolveWordProgress({ learner, supervisor, confirmationRequired }), loaded: true });

// --- 1. Scope building -----------------------------------------------------
check("an ayah's scope is every word in it", () =>
  assert.equal(occurrenceIdsForAyah(surah1, 1).length, surah1.ayahs[0].words.length));
check("a surah's scope is every word in it, measured against the dataset", () =>
  assert.equal(occurrenceIdsForSurah(surah2).length, 6116));
check("a ruku' unit resolves through the app's own global-to-relative conversion", () => {
  const ids = occurrenceIdsForUnit(surah2, "ruku:2:1");
  // Al-Baqarah's own first ruku' is ayahs 1-7. The raw dataset field starts
  // at 2 here, so a direct comparison would have scored the WRONG ruku'.
  assert.equal(ids[0], id(2, 1, 1));
  assert.equal(ids.at(-1), id(2, 7, surah2.ayahs[6].words.at(-1).position));
});
check("a range unit covers exactly its ayahs", () => {
  const ids = occurrenceIdsForUnit(surah1, "range:1:2-3");
  assert.equal(ids.length, surah1.ayahs[1].words.length + surah1.ayahs[2].words.length);
});
check("a whole-surah unit covers the surah", () =>
  assert.equal(occurrenceIdsForUnit(surah1, "surah:1").length, occurrenceIdsForSurah(surah1).length));
check("a unit naming a DIFFERENT surah returns null rather than the loaded one", () =>
  assert.equal(occurrenceIdsForUnit(surah1, "ayah:2:1"), null));
check("cross-surah units return null rather than a partial scope", () => {
  for (const key of ["juz:1", "hizb:1", "page:1", "rub:1", "manzil:1"]) {
    assert.equal(occurrenceIdsForUnit(surah2, key), null, key);
  }
});
check("a malformed unit key is refused or declined, never guessed", () => {
  assert.equal(occurrenceIdsForUnit(surah1, "nonsense"), null);
  assert.throws(() => occurrenceIdsForUnit(surah1, 42), /Study Unit key is required/);
});

// --- 2. The denominator ----------------------------------------------------
const scope = occurrenceIdsForAyah(surah1, 1);            // 4 words
check("the denominator is the SCOPE, not the number of records that exist", () => {
  const one = new Map([[scope[0], view(claim("achieved"), null, false)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: one });
  assert.equal(c.total, 4, "four words in the scope");
  assert.equal(c.known, 1);
  assert.equal(c.percent, 25, "one approved word out of one RECORD would have read 100%");
});
check("an empty scope is an explicit zero, never a division by zero", () => {
  const c = computeArabicCoverage({ scopeOccurrenceIds: [], views: {} });
  assert.equal(c.total, 0);
  assert.equal(c.percent, 0);
});
check("a duplicated scope counts once", () =>
  assert.equal(computeArabicCoverage({ scopeOccurrenceIds: [...scope, ...scope], views: {} }).total, 4));
check("a scope is required -- a coverage figure with no stated denominator cannot be built", () =>
  assert.throws(() => computeArabicCoverage({ views: {} }), /scope of occurrence identifiers is required/));
check("an invalid occurrence id in the scope is refused", () =>
  assert.throws(() => computeArabicCoverage({ scopeOccurrenceIds: ["wbw.engaged"], views: {} }), /invalid shape/));
check("a v2 identity in the scope is refused rather than counted as v1", () =>
  assert.throws(() => computeArabicCoverage({ scopeOccurrenceIds: ["quran-word-occurrence:v2:1:1:1"], views: {} }), /Unsupported/));

// --- 3. Unknown is not zero ------------------------------------------------
check("a word with no view at all is unknown, not not_started", () => {
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: {} });
  assert.equal(c.unknown, 4);
  assert.equal(c.notStarted, 0);
  assert.equal(c.complete, false, "a caller must not print this as final");
});
check("a word whose lane was not READ is unknown even if a view object exists", () => {
  const views = new Map([[scope[0], { ...view(claim("achieved"), null, false), loaded: false }]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views });
  assert.equal(c.unknown, 4);
  assert.equal(c.known, 0, "an unread word must never be counted as known");
});
check("a fully read scope is complete", () => {
  const views = new Map(scope.map((occ) => [occ, view(null, null, false)]));
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views });
  assert.equal(c.complete, true);
  assert.equal(c.notStarted, 4);
  assert.equal(c.unknown, 0);
});

// --- 4. LOCK: Activity != Mastery, expressed as arithmetic -----------------
check("a claim awaiting a teacher does NOT count towards coverage", () => {
  const views = new Map([[scope[0], view(claim("achieved"), null, true)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: fill(views) });
  assert.equal(c.known, 0);
  assert.equal(c.awaitingReview, 1);
  assert.equal(c.percent, 0, "a claim is not knowledge where confirmation is required");
});
check("the same claim DOES count where no confirmation is required", () => {
  const views = new Map([[scope[0], view(claim("achieved"), null, false)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: fill(views) });
  assert.equal(c.known, 1);
  assert.equal(c.percent, 25);
});
check("a confirmed claim counts", () => {
  const views = new Map([[scope[0], view(claim("achieved"), decision("confirmed"), true)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: fill(views) });
  assert.equal(c.known, 1);
});
check("a returned claim is counted as returned and not as known", () => {
  const views = new Map([[scope[0], view(claim("achieved"), decision("returned", "look again"), true)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: fill(views) });
  assert.equal(c.returned, 1);
  assert.equal(c.known, 0);
});
check("learning is its own count, distinct from not started", () => {
  const views = new Map([[scope[0], view(claim("learning"), null, true)], [scope[1], view(claim("not_started"), null, true)]]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: fill(views) });
  assert.equal(c.learning, 1);
  assert.equal(c.notStarted, 3);
});
check("every word lands in exactly one bucket, and they sum to the total", () => {
  const views = new Map([
    [scope[0], view(claim("achieved"), decision("confirmed"), true)],
    [scope[1], view(claim("achieved"), null, true)],
    [scope[2], view(claim("learning"), null, true)],
  ]);
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views });
  const sum = WBW_COVERAGE_STATES.reduce((n, key) => n + c[key], 0);
  assert.equal(sum, c.total, JSON.stringify(c));
  assert.equal(c.unknown, 1, "the fourth word was never read");
});

// --- 5. Rounding and shape -------------------------------------------------
check("percent is rounded the same way the Word Card projection rounds", () => {
  const three = occurrenceIdsForAyah(surah1, 1).slice(0, 3);
  const views = new Map([[three[0], view(claim("achieved"), null, false)], [three[1], view(null, null, false)], [three[2], view(null, null, false)]]);
  assert.equal(computeArabicCoverage({ scopeOccurrenceIds: three, views }).percent, 33.33);
});
check("the figure names both contracts it depends on", () => {
  const c = computeArabicCoverage({ scopeOccurrenceIds: scope, views: {} });
  assert.equal(c.contractVersion, "quran-word-progress:v1");
  assert.equal(c.identityContract, "quran-word-occurrence:v1");
});
check("a label rides along so a screen can say WHAT was covered", () =>
  assert.equal(computeArabicCoverage({ scopeOccurrenceIds: scope, views: {}, label: "ayah:1:1" }).label, "ayah:1:1"));
check("the result is frozen, so a caller cannot edit a coverage figure", () =>
  assert.ok(Object.isFrozen(computeArabicCoverage({ scopeOccurrenceIds: scope, views: {} }))));
check("the existing narrow Word Card projection is untouched", () => {
  const src = readFileSync(new URL("../../app/js/quran-word-coverage.js", import.meta.url), "utf8");
  assert.ok(/export function computeWbwCoverage\(occurrenceIds, approvedIds\)/.test(src));
});

// --- 6. A real, whole-surah shape ------------------------------------------
check("a real surah scope computes without building 6,116 view objects by hand", () => {
  const ids = occurrenceIdsForSurah(surah2);
  const views = new Map(ids.slice(0, 1000).map((occ) => [occ, view(claim("achieved"), decision("confirmed"), true)]));
  const c = computeArabicCoverage({ scopeOccurrenceIds: ids, views, label: "surah:2" });
  assert.equal(c.total, 6116);
  assert.equal(c.known, 1000);
  assert.equal(c.unknown, 5116);
  assert.equal(c.complete, false);
  assert.equal(c.percent, 16.35);
});

function fill(views) {
  // Words the test did not name are still READ -- so they count as
  // not_started rather than unknown, which is what isolates the bucket
  // each check above is actually about.
  const out = new Map(views);
  for (const occ of scope) if (!out.has(occ)) out.set(occ, view(null, null, true));
  return out;
}

console.log(`\n==== Arabic coverage: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
