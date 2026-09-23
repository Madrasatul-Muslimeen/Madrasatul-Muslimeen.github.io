// Issue #206 -- Word-by-Word whole-Qur'an/Juz running counter.
//
// Pure module: no Firebase, DOM, or mutable application state. The data
// layer (quran-word-total-data.js) owns persistence; this file owns the
// document SHAPE and the arithmetic, so both can be tested without a
// database -- the same pure/impure split quran-word-progress.js and
// quran-word-progress-data.js already use.
//
// SINGLE SOURCE OF TRUTH for the Qur'an's total word count. Do not
// hardcode 77429 a second time anywhere else: import QURAN_TOTAL_WORD_COUNT
// from here. Measured, not assumed --
// tools/i18n-verify/quran-word-identity-contract.mjs's own "all packaged
// occurrences have unique v1 identities" check walks every pulled surah
// file and asserts this exact number against the real corpus; this
// constant is the same number, quoted from that measurement rather than
// re-measured a second way. tools/quran-data-pull/output/manifest.json's
// own "totalWords" field agrees.
export const QURAN_TOTAL_WORD_COUNT = 77429;

export const QURAN_WORD_TOTAL_CONTRACT = "quran-word-total:v1";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeIdSegment(value, label) {
  if (!isNonEmptyString(value)) throw new TypeError(`${label} is required.`);
  if (value.includes("__") || value.includes("/")) {
    throw new TypeError(`${label} must not contain a path or key separator.`);
  }
  return value;
}

/** One document per person, mirroring activity's own `{tenantId}__{personId}__{weekKey}` shape minus the week -- this counter has no week axis. */
export function wordTotalDocId({ tenantId, personId } = {}) {
  return `${safeIdSegment(tenantId, "tenantId")}__${safeIdSegment(personId, "personId")}`;
}

/**
 * `juzWordTotals` is the packaged, DERIVED list (tools/quran-data-pull/
 * build-juz-word-totals.js's output) -- never estimated here. Validates
 * exactly 30 rows, juz 1..30 each present once, and that the 30 totals
 * really do sum to the one whole-Qur'an constant above, so a corrupted or
 * partial packaged file is refused rather than silently seeding a
 * self-contradictory document.
 */
export function validateJuzWordTotals(juzWordTotals) {
  if (!Array.isArray(juzWordTotals) || juzWordTotals.length !== 30) {
    throw new TypeError("juzWordTotals must be an array of exactly 30 entries.");
  }
  const seen = new Set();
  let sum = 0;
  for (const row of juzWordTotals) {
    const juz = row?.juz;
    const totalWords = row?.totalWords;
    if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new TypeError(`Invalid juz number: ${juz}.`);
    if (seen.has(juz)) throw new TypeError(`Duplicate juz ${juz} in juzWordTotals.`);
    seen.add(juz);
    if (!Number.isInteger(totalWords) || totalWords < 1) throw new TypeError(`Invalid word total for juz ${juz}: ${totalWords}.`);
    sum += totalWords;
  }
  if (seen.size !== 30) throw new TypeError("juzWordTotals must name every juz from 1 to 30.");
  if (sum !== QURAN_TOTAL_WORD_COUNT) {
    throw new RangeError(`juzWordTotals sums to ${sum}, not the real total of ${QURAN_TOTAL_WORD_COUNT}.`);
  }
  return juzWordTotals.slice().sort((a, b) => a.juz - b.juz);
}

/** `{ "1": {known:0, total:2522}, ..., "30": {known:0, total:N} }` -- string keys because Firestore map keys are always strings. */
export function buildJuzTotalsMap(juzWordTotals) {
  const valid = validateJuzWordTotals(juzWordTotals);
  const map = {};
  for (const { juz, totalWords } of valid) map[String(juz)] = { known: 0, total: totalWords };
  return map;
}

/** The full seeded document a person's first-ever counted word creates. */
export function emptyWordTotalsDocument({ tenantId, personId, juzWordTotals } = {}) {
  return {
    contractVersion: QURAN_WORD_TOTAL_CONTRACT,
    tenantId: safeIdSegment(tenantId, "tenantId"),
    personId: safeIdSegment(personId, "personId"),
    total: QURAN_TOTAL_WORD_COUNT,
    known: 0,
    byJuz: buildJuzTotalsMap(juzWordTotals),
  };
}

/**
 * The whole point of this module, arithmetically: -1, 0 or +1, from two
 * `countsAsKnown` booleans (quran-word-progress.js's resolveWordProgress()
 * own field -- the SAME definition computeArabicCoverage() uses, so this
 * counter can never disagree with the per-Surah caption about what "known"
 * means). Any write that does not change countsAsKnown must move the
 * counter by exactly zero, i.e. must not be recorded at all.
 */
export function knownDelta(beforeCountsAsKnown, afterCountsAsKnown) {
  return (afterCountsAsKnown ? 1 : 0) - (beforeCountsAsKnown ? 1 : 0);
}

/**
 * juz for a given surah:ayah, derived from the already-fetched juz-index
 * (app/js/quran-data.js's getJuzIndex() -- {juz, startSurah, startAyah,
 * endSurah, endAyah}, 30 rows in Qur'an order). Comparison is lexicographic
 * on (surah, ayah), which is valid because juz boundaries never run
 * backwards across surahs. Returns null rather than guessing when no juz
 * matches (a malformed or incomplete index), so a caller can refuse to
 * write instead of mis-crediting a word to the wrong juz.
 */
export function juzForSurahAyah(juzIndex, surah, ayah) {
  if (!Array.isArray(juzIndex)) throw new TypeError("juzIndex must be an array.");
  const before = (s1, a1, s2, a2) => s1 < s2 || (s1 === s2 && a1 <= a2);
  for (const row of juzIndex) {
    if (before(row.startSurah, row.startAyah, surah, ayah) && before(surah, ayah, row.endSurah, row.endAyah)) {
      return row.juz;
    }
  }
  return null;
}

/** For the wheel toggle: 0..1 ratio of a scope's known/total, 0 when total is 0 (never NaN/Infinity). */
export function wordTotalRatio(known, total) {
  if (!Number.isFinite(known) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(1, known / total));
}

/** Same rounding as quran-word-coverage.js's computeArabicCoverage() -- one rule for every percentage this app shows. */
export function percentRounded(count, total) {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((count * 10000) / total) / 100;
}
