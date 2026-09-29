// MAP Phase 3 — pure WbW coverage projection, not a generic Approach claim.
// Callers provide a bounded set of v1 occurrence IDs and explicit approved IDs.
// No reading, listening, or opening event implies approval.

import { parseQuranWordOccurrenceId, quranWordOccurrenceId } from "./quran-word-identity.js";
import { WORD_PROGRESS_CONTRACT } from "./quran-word-progress.js";
import { rukuIndexInSurah } from "./unit-keys.js";

/** Bounded selection from one already-loaded Surah; no corpus/index fetch. */
export function occurrenceIdsForAyahRange(chapter, fromAyah, toAyah) {
  if (!Number.isInteger(chapter?.surahNumber) || !Array.isArray(chapter.ayahs) ||
      !Number.isInteger(fromAyah) || !Number.isInteger(toAyah) ||
      fromAyah < 1 || toAyah < fromAyah || toAyah > chapter.ayahs.length) {
    throw new TypeError("A valid, bounded Surah ayah range is required.");
  }
  const ids = [];
  for (const ayah of chapter.ayahs) {
    if (ayah.ayah < fromAyah || ayah.ayah > toAyah) continue;
    for (const word of ayah.words ?? []) ids.push(quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position));
  }
  return ids;
}

export function computeWbwCoverage(occurrenceIds, approvedIds) {
  if (!Array.isArray(occurrenceIds) || !Array.isArray(approvedIds)) {
    throw new TypeError("Occurrence and approved identifiers must be arrays.");
  }
  const scope = new Set();
  for (const id of occurrenceIds) {
    parseQuranWordOccurrenceId(id);
    scope.add(id);
  }
  const approved = new Set();
  for (const id of approvedIds) {
    parseQuranWordOccurrenceId(id);
    if (scope.has(id)) approved.add(id);
  }
  return Object.freeze({
    identityContract: "quran-word-occurrence:v1",
    total: scope.size,
    approved: approved.size,
    remaining: scope.size - approved.size,
    percent: scope.size ? Math.round(approved.size * 10000 / scope.size) / 100 : 0,
  });
}

// ---------------------------------------------------------------------------
// MAP Phase 3 -- Arabic coverage over real stored states.
//
// computeWbwCoverage() above answers the narrow question "of these words, how
// many are approved?" and stays exactly as it was, because the Word Card and
// its 10 checks read it. What Explore and the wheel need is wider: a scope's
// coverage broken down by every state a word can be in, with an explicitly
// stated denominator and an explicit UNKNOWN count.
//
// Three rules, all of them the storage paper's own:
//
// 1. The denominator is the number of words in the SCOPE -- taken from the
//    packaged dataset, never from how many progress records happen to exist.
//    Counting only touched words would make one approved word out of one
//    touched word read as 100%.
//
// 2. A word whose lane has not been read is `unknown`, not `not_started`. It
//    is excluded from `percent`'s numerator AND named in its own count, so a
//    partial read can never quietly look like a poor result. Where anything is
//    unknown, `complete` is false and a caller is expected to say so rather
//    than print the figure as final.
//
// 3. `known` is the only thing `percent` counts, and it comes from
//    resolveWordProgress()'s `countsAsKnown` -- so where confirmation is
//    required, a claim awaiting a teacher does NOT count. That is
//    "Activity != Mastery" as arithmetic.
//
// I7 has no part here: `not_applicable` is deliberately not a word state, so
// there is nothing to exclude from the denominator. Said out loud because the
// absence of an I7 clause in a coverage function is otherwise indistinguishable
// from having forgotten it.
// ---------------------------------------------------------------------------

export const WBW_COVERAGE_STATES = Object.freeze(["known", "awaitingReview", "returned", "learning", "notStarted", "unknown"]);

/**
 * `views` are resolveWordProgress() results (as quran-word-progress-data.js's
 * wordProgressFor/ayahProgressFor return them), keyed by occurrence id.
 * `scopeOccurrenceIds` is the denominator, and it is required: a coverage
 * figure without a stated scope is the defect this signature prevents.
 */
export function computeArabicCoverage({ scopeOccurrenceIds, views, label = null } = {}) {
  if (!Array.isArray(scopeOccurrenceIds)) throw new TypeError("A scope of occurrence identifiers is required.");
  const scope = new Set();
  for (const id of scopeOccurrenceIds) {
    parseQuranWordOccurrenceId(id);
    scope.add(id);
  }
  const counts = { known: 0, awaitingReview: 0, returned: 0, learning: 0, notStarted: 0, unknown: 0 };
  const lookup = views instanceof Map ? views : new Map(Object.entries(views ?? {}));
  for (const id of scope) {
    const view = lookup.get(id);
    if (!view || view.loaded === false) { counts.unknown++; continue; }
    if (view.countsAsKnown) { counts.known++; continue; }
    if (view.awaitingReview) { counts.awaitingReview++; continue; }
    if (view.review === "returned") { counts.returned++; continue; }
    if (view.state === "learning") { counts.learning++; continue; }
    counts.notStarted++;
  }
  const total = scope.size;
  return Object.freeze({
    contractVersion: WORD_PROGRESS_CONTRACT,
    identityContract: "quran-word-occurrence:v1",
    label,
    total,
    ...counts,
    // Rounded the same way computeWbwCoverage does, so two figures on one
    // screen can never disagree about the same numbers.
    percent: total ? Math.round(counts.known * 10000 / total) / 100 : 0,
    // A caller printing a percentage from an incomplete read is the failure
    // this flag exists to prevent.
    complete: counts.unknown === 0,
  });
}

/** Every occurrence id in one loaded ayah -- the scope a Word Card row covers. */
export function occurrenceIdsForAyah(chapter, ayahNumber) {
  return occurrenceIdsForAyahRange(chapter, ayahNumber, ayahNumber);
}

/** Every occurrence id in one loaded surah -- the scope Explore asks about. */
export function occurrenceIdsForSurah(chapter) {
  if (!Array.isArray(chapter?.ayahs) || !chapter.ayahs.length) {
    throw new TypeError("A loaded Surah is required.");
  }
  return occurrenceIdsForAyahRange(chapter, 1, chapter.ayahs.length);
}

/**
 * The scope for one Study Unit, so a coverage figure always describes the unit
 * the reader actually has selected.
 *
 * Deliberately bounded to units whose words all live in the ONE surah already
 * loaded: ayah, range, surah and ruku'. Juz, hizb and page span surahs, so
 * their scope cannot be built without fetching more of the Qur'an than the
 * screen has -- those return null, and a caller shows "not available at this
 * granularity" rather than a figure computed from part of the unit. Silently
 * covering only the loaded part would understate every juz.
 */
export function occurrenceIdsForUnit(chapter, unitKey) {
  if (typeof unitKey !== "string") throw new TypeError("A Study Unit key is required.");
  let match = /^ayah:(\d+):(\d+)$/.exec(unitKey);
  if (match) return Number(match[1]) === chapter.surahNumber ? occurrenceIdsForAyahRange(chapter, Number(match[2]), Number(match[2])) : null;
  match = /^range:(\d+):(\d+)-(\d+)$/.exec(unitKey);
  if (match) return Number(match[1]) === chapter.surahNumber ? occurrenceIdsForAyahRange(chapter, Number(match[2]), Number(match[3])) : null;
  match = /^surah:(\d+)$/.exec(unitKey);
  if (match) return Number(match[1]) === chapter.surahNumber ? occurrenceIdsForSurah(chapter) : null;
  match = /^ruku:(\d+):(\d+)$/.exec(unitKey);
  if (match) {
    if (Number(match[1]) !== chapter.surahNumber) return null;
    // The dataset's own `ruku` is a GLOBAL index across the whole Qur'an,
    // while a ruku' unit key carries the per-surah one. Converting with the
    // app's own rukuIndexInSurah() rather than comparing the raw field is the
    // difference between Surah 2's first ruku' and Surah 2's second: the raw
    // values there start at 2, so a direct comparison would silently score
    // every ruku' against its neighbour.
    const wanted = Number(match[2]);
    const ayahs = chapter.ayahs.filter((a) => rukuIndexInSurah(chapter.ayahs, Number(a.ruku)) === wanted);
    if (!ayahs.length) return null;
    return occurrenceIdsForAyahRange(chapter, ayahs[0].ayah, ayahs.at(-1).ayah);
  }
  // juz / hizb / rub / manzil / page: cross-surah, deliberately not guessed.
  return null;
}
