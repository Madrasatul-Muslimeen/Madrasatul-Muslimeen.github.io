// F-033 — Unit keys + progress statuses (Phase 3, Tracking core)
//
// I5: units are keyed by permanent ID, never by name. A unit key is a
// namespaced, permanent string ("ayah:2:255", "juz:3", "hadith:bukhari:5678")
// -- renaming a topic never erases the record attached to it, because the
// key never contains the name.
//
// unitType is stored alongside the key (Architecture, s5) on every place a
// unit key is recorded, so "show all page-based progress" is one query/filter
// without re-parsing every key string.

export const UNIT_TYPES = Object.freeze([
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub", "manzil",
  "hadith", "topic", "name",
]);

export const buildUnitKey = Object.freeze({
  ayah: (surah, ayah) => `ayah:${surah}:${ayah}`,
  range: (surah, from, to) => `range:${surah}:${from}-${to}`,
  surah: (surah) => `surah:${surah}`,
  page: (edition, pageNum) => `page:${edition}:${pageNum}`,
  ruku: (surah, ruku) => `ruku:${surah}:${ruku}`,
  juz: (juz) => `juz:${juz}`,
  hizb: (hizb) => `hizb:${hizb}`,
  rub: (rub) => `rub:${rub}`,
  manzil: (manzil) => `manzil:${manzil}`,
  hadith: (collectionName, number) => `hadith:${collectionName}:${number}`,
  topic: (topicId) => `topic:${topicId}`,
  name: (number) => `name:${number}`, // Asma ul Husna
});

/** Splits a unit key into { unitType, parts } — parts is everything after the first namespace segment, still colon-joined for types that carry more than one field (e.g. "2:255-257"). */
export function parseUnitKey(unitKey) {
  const i = unitKey.indexOf(":");
  if (i === -1) return { unitType: unitKey, parts: [] };
  const unitType = unitKey.slice(0, i);
  const parts = unitKey.slice(i + 1).split(":");
  return { unitType, parts };
}

/**
 * Phase 5 — Study Unit picker. The pulled Quran data's `ruku` field (see
 * tools/quran-data-pull) is a GLOBAL sequential index across the whole
 * Quran (Surah 1 = ruku 1, Surah 2 starts at ruku 2, ...), but
 * buildUnitKey.ruku expects a per-surah-relative index ("the Nth ruku of
 * THIS surah") — matching the legacy app's rukuSummary["surah_rukuIndex"]
 * shape (PHASE-5-STATUS.md migration map). This converts one to the other:
 * pass the surah's own ayahs array (each already carrying .ruku) and the
 * ayah's global ruku value.
 */
export function rukuIndexInSurah(surahAyahs, globalRuku) {
  const firstRuku = surahAyahs[0]?.ruku;
  return firstRuku == null ? globalRuku : globalRuku - firstRuku + 1;
}

/** The surah number for unit types that carry one as their first part (ayah/range/surah/ruku) — null for types that don't (juz/hizb/rub/manzil/page/hadith/topic/name), since those are Quran-wide or non-Quran and have no single surah. */
export function surahOf(unitKey) {
  const { unitType, parts } = parseUnitKey(unitKey);
  if (["ayah", "range", "surah", "ruku"].includes(unitType)) {
    const n = Number(parts[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Progress statuses (Architecture s5). Six on the ramp; Not Applicable sits
// off it entirely (I7 -- excluded from totals, never counted as zero).
// ---------------------------------------------------------------------------

export const STATUSES = Object.freeze([
  { id: "not_applicable", label: "Not Applicable", onRamp: false },
  { id: "not_started", label: "Not started", onRamp: true },
  { id: "learning", label: "Learning", onRamp: true },
  { id: "practising", label: "Practising", onRamp: true },
  { id: "achieved", label: "Achieved", onRamp: true },
  { id: "mastered", label: "Mastered", onRamp: true },
]);

export const STATUS_IDS = Object.freeze(STATUSES.map((s) => s.id));

export function isValidStatus(statusId) {
  return STATUS_IDS.includes(statusId);
}

/**
 * I7: Not Applicable is excluded from totals, not counted as zero. Give this
 * a list of status ids (e.g. every claimedStatus in a chunk) and it returns
 * { countedTotal, achievedOrBetter, ratio } — "not_applicable" entries never
 * appear in countedTotal's denominator.
 */
export function summarizeStatuses(statusIds) {
  const counted = statusIds.filter((s) => s !== "not_applicable");
  const achievedOrBetter = counted.filter((s) => s === "achieved" || s === "mastered").length;
  return {
    countedTotal: counted.length,
    excludedNotApplicable: statusIds.length - counted.length,
    achievedOrBetter,
    ratio: counted.length === 0 ? null : achievedOrBetter / counted.length,
  };
}
