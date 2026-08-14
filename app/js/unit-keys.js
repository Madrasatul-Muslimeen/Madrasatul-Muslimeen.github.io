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

import { t, num } from "./i18n.js";

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

// ---------------------------------------------------------------------------
// Reading a unit key out loud (full app translation, phase 4)
// ---------------------------------------------------------------------------
// Records and Monitor both print raw unit keys -- "ayah:1:1", "topic:t42" --
// straight into a table. In English that is terse but decipherable; to a
// Bangla-only reader it is a column of Latin gibberish, which is exactly the
// test this translation work is measured against.
//
// The KEY ITSELF never changes: it is the stored, canonical value (I5), and
// a CSV export still carries it verbatim. Same split as STATUSES, whose
// English `label` stays the stored value while statusLabel() is what a
// person reads.

const UNIT_TYPE_LABELS = Object.freeze({
  ayah: "Ayah", range: "Range", surah: "Surah", page: "Page", ruku: "Ruku",
  juz: "Juz", hizb: "Hizb", rub: "Rub", manzil: "Manzil", hadith: "Hadith",
  topic: "Topic", name: "Name",
});

/** A unit type's display name, in the reader's own language. Falls back to the raw id, so an unrecognised type can never render blank. */
export function unitTypeLabel(unitType) {
  const label = UNIT_TYPE_LABELS[unitType];
  return label ? t(label) : unitType;
}

/**
 * A whole unit key as readable text: "ayah:1:1" -> "Ayah 1:1" / "আয়াত ১:১".
 *
 * num() is applied to the REFERENCE ONLY, and only when it is genuinely
 * numeric -- a topic id ("topic:topic_0042") is an identifier, and turning
 * its digits into Bengali would make it unrecognisable next to the same id
 * shown anywhere else.
 */
export function unitKeyLabel(unitKey) {
  if (!unitKey) return "";
  const { unitType, parts } = parseUnitKey(unitKey);
  const ref = parts.join(":");
  if (!ref) return unitTypeLabel(unitType);
  return `${unitTypeLabel(unitType)} ${/^[0-9:\-]+$/.test(ref) ? num(ref) : ref}`;
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

/**
 * The display name of a status, in the reader's own language (full app
 * translation, phase 1). STATUSES above keeps its English `label` as the
 * stored, canonical value -- it is the translation key, and it is what a
 * CSV export or a saved record should carry -- so this is the one place a
 * status becomes text a person reads. Every screen that shows a status
 * should call this rather than reading `.label` directly.
 *
 * Translating at CALL time, not at module load: the language can change
 * while a page is open (Home -> Settings), and a frozen constant built at
 * import time would be stuck in whatever language the page started in.
 */
export function statusLabel(statusId) {
  const found = STATUSES.find((s) => s.id === statusId);
  return found ? t(found.label) : statusId;
}

/** id -> translated label, the shape the wheel legend and sidebar want. */
export function statusLabelsById() {
  return Object.fromEntries(STATUSES.map((s) => [s.id, t(s.label)]));
}

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
