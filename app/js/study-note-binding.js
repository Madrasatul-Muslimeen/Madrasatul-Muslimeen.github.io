// MAP Phase 5 (P5-C) — ADR-009 Study↔Note source binding, as PURE policy.
//
// No Firebase, no DOM, no mutable state, no I/O. Deliberately uninvoked: a
// boundary suite asserts that nothing under app/ imports it.
//
// WHAT THIS IS FOR
//
// `note-foundation.js` already writes a `noteSources` document with four
// descriptive fields — sourceKind, sourceKey, relationshipKind, provenanceKind
// — and nothing ever decided what they may contain. The repository already
// carries the drift that produces: two fixtures written months apart spell the
// same two facts four different ways (ADR-009 §Context). This module is the
// single place those four fields are decided, so a third spelling cannot be
// minted by the first surface that needs one.
//
// ACTIVITY IS NOT MASTERY (ADR-003). Nothing here names records, claimStatus,
// confirmEntry, achieved or mastered. `approachId` is carried as a descriptive
// label and is never read to decide status.

import { parseUnitKey } from "./unit-keys.js";

/** ADR-009 §3 — why a Note is attached to a unit. Closed set. */
export const RELATIONSHIP_KINDS = Object.freeze(["origin", "reference"]);

/** ADR-009 §4 — where the Note's text came from. Closed set. */
export const PROVENANCE_KINDS = Object.freeze(["study-note", "promoted-ayah-note"]);

// ADR-009 §2 — the namespace each unit type's key lives in. The Quran's nine
// unit types share ONE kind on purpose: the unit type is already the key's own
// leading segment, so storing it a second time would create two places for one
// truth, and one of them would eventually be stale.
const SOURCE_KIND_BY_UNIT_TYPE = Object.freeze({
  ayah: "quran-unit",
  range: "quran-unit",
  surah: "quran-unit",
  ruku: "quran-unit",
  juz: "quran-unit",
  hizb: "quran-unit",
  rub: "quran-unit",
  manzil: "quran-unit",
  page: "quran-unit",
  hadith: "hadith-unit",
  topic: "topic-unit",
  name: "name-unit",
});

/** The exact shapes `buildUnitKey` produces (I5). A key that does not match one of these is not a permanent unit key and is refused rather than stored. */
const UNIT_KEY_SHAPES = Object.freeze({
  ayah: /^ayah:\d{1,3}:\d{1,3}$/,
  range: /^range:\d{1,3}:\d{1,3}-\d{1,3}$/,
  surah: /^surah:\d{1,3}$/,
  ruku: /^ruku:\d{1,3}:\d{1,3}$/,
  juz: /^juz:\d{1,2}$/,
  hizb: /^hizb:\d{1,2}$/,
  rub: /^rub:\d{1,3}$/,
  manzil: /^manzil:\d$/,
  page: /^page:[A-Za-z0-9_-]+:\d{1,3}$/,
  hadith: /^hadith:[A-Za-z0-9_-]+:\d{1,6}$/,
  topic: /^topic:[A-Za-z0-9_-]+$/,
  name: /^name:\d{1,2}$/,
});

const APPROACH_ID = /^approach_\d{2}$/;

/**
 * The unit type of a permanent Study Unit key, or `null` when the string is
 * not one. Deliberately stricter than `parseUnitKey`, which happily splits any
 * string on its first colon: a source link stores a permanent key or nothing.
 */
export function bindableUnitType(unitKey) {
  if (typeof unitKey !== "string") return null;
  const { unitType } = parseUnitKey(unitKey);
  const shape = UNIT_KEY_SHAPES[unitType];
  return shape && shape.test(unitKey) ? unitType : null;
}

/** ADR-009 §2 — derived, never supplied. */
export function sourceKindForUnitKey(unitKey) {
  const unitType = bindableUnitType(unitKey);
  return unitType ? SOURCE_KIND_BY_UNIT_TYPE[unitType] : null;
}

/**
 * The `source` payload `createPermanentNote()` takes, built from a permanent
 * Study Unit key.
 *
 * THROWS rather than returning null, and that difference is deliberate:
 * `journalEvidenceArgs()` returns null because "this commit records no
 * Activity" is a perfectly ordinary outcome, whereas a Note being bound to a
 * unit that is not a unit is a caller defect with no correct silent handling.
 *
 * `sourceKind` is absent from the arguments on purpose (ADR-009 §2) — a field
 * nobody types is a field nobody can spell two ways.
 */
export function studyNoteSource({
  unitKey, relationshipKind = "origin", provenanceKind = "study-note", approachId = null, sourceLinkId,
} = {}) {
  const sourceKind = sourceKindForUnitKey(unitKey);
  if (!sourceKind) {
    throw new TypeError(`studyNoteSource: ${JSON.stringify(unitKey)} is not a permanent Study Unit key.`);
  }
  if (!RELATIONSHIP_KINDS.includes(relationshipKind)) {
    throw new TypeError(`studyNoteSource: relationshipKind must be one of ${RELATIONSHIP_KINDS.join(", ")}.`);
  }
  if (!PROVENANCE_KINDS.includes(provenanceKind)) {
    throw new TypeError(`studyNoteSource: provenanceKind must be one of ${PROVENANCE_KINDS.join(", ")}.`);
  }
  if (approachId !== null && !(typeof approachId === "string" && APPROACH_ID.test(approachId))) {
    throw new TypeError("studyNoteSource: approachId must be an approach_NN id or null.");
  }

  const source = { sourceKind, sourceKey: unitKey, relationshipKind, provenanceKind, approachId };
  if (sourceLinkId !== undefined) source.sourceLinkId = sourceLinkId;
  return Object.freeze(source);
}
