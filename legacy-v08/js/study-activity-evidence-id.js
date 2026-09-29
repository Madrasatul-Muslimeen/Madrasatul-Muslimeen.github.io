// MAP Phase 4 (P4-C) — the persisted identity of one ADR-008 Study Activity
// evidence event. Pure: no Firebase, no DOM, no locale, no mutable state.
//
// Accepted architecture (P4-B, accepted 14 Sep 2026 with two amendments):
//
//   activity/{tenantId}__{personId}__{weekKey}/evidence/{eventId}
//   eventId = eventType__trackableId__unitKey__noteSlot__dedupeScope
//
// WHY THE ID CARRIES THE IDENTITY. Firestore refuses a `create` on a document
// that already exists, so a retry of the same event is rejected by the
// DATABASE rather than by a rule, a transaction or a client check. That is the
// whole point of the shape: deduplication is not something this module has to
// get right, it is something it cannot get wrong.
//
// WHY A DELIMITER-JOINED STRING. Firestore Rules can concatenate strings and
// compare the result to the {eventId} path wildcard, so the rules RE-DERIVE
// this id from the document's own fields and refuse any id that disagrees.
// Rules cannot compute SHA-256 and cannot reproduce JSON.stringify's quoting,
// so an identity in either of those forms could only ever be taken on trust
// from the client. The earlier Phase 4 candidate used JSON.stringify; this
// does not.
//
// SEPARATOR SAFETY, verified rather than assumed. The separator is '__'.
// Every component is constrained so that none can contain '_':
//   eventType    — one of five literals
//   trackableId  — one of six literals; each contains exactly one '_', which
//                  is why it is matched against the literal SET rather than a
//                  pattern, so its own underscore can never be read as part of
//                  a separator
//   unitKey      — digits, colons and one hyphen (ayah/range/surah only)
//   noteSlot     — 32 hex characters, or the literal 'none'
//   dedupeScope  — an ISO day, or the literal 'once'
// So two different component tuples can never produce the same id.

export const STUDY_ACTIVITY_EVIDENCE_CONTRACT = "study-approach-contract:v1";

/** The five ADR-008 automatic events, each pinned to the Approach(es) the contract gives it. `status.claimed`/`status.confirmed` are absent on purpose: they are the explicit Mastery workflow and are not expressible as Activity evidence. */
const EVENT_APPROACHES = Object.freeze({
  "reading.completed": Object.freeze(["approach_01", "approach_03"]),
  "listening.completed": Object.freeze(["approach_07", "approach_08"]),
  "journal.note-created": Object.freeze(["approach_10"]),
  "journal.note-revised": Object.freeze(["approach_10"]),
  "wbw.engaged": Object.freeze(["approach_04"]),
});

const JOURNAL_EVENTS = Object.freeze(["journal.note-created", "journal.note-revised"]);

/** The literal filling the Note slot when an event has no Note. Cannot collide with a real noteId, which is always 32 hex characters. */
export const NO_NOTE = "none";

const UNIT_KEY_SHAPES = Object.freeze({
  ayah: /^ayah:\d{1,3}:\d{1,3}$/,
  range: /^range:\d{1,3}:\d{1,3}-\d{1,3}$/,
  surah: /^surah:\d{1,3}$/,
});

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const NOTE_ID = /^[0-9a-f]{32}$/;

function requireIsoDay(value, label) {
  if (typeof value !== "string" || !ISO_DAY.test(value)) throw new TypeError(`${label} must be a UTC ISO day.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} is not a real calendar date.`);
  }
  return value;
}

/** The unit type a key declares, or null if the key is not one this contract accepts. `juz`, `ruku`, `page`, `hizb`, `topic`, `hadith` and `name` all return null — refused, not silently stored (I5). */
export function evidenceUnitType(unitKey) {
  if (typeof unitKey !== "string") return null;
  for (const [unitType, shape] of Object.entries(UNIT_KEY_SHAPES)) {
    if (shape.test(unitKey)) return unitType;
  }
  return null;
}

export function isJournalEvent(eventType) {
  return JOURNAL_EVENTS.includes(eventType);
}

/**
 * ADR-008's deduplication boundary for one event, as the value that goes in
 * the id's last slot.
 *
 * `journal.note-created` is `'once'` and NOT the day: the contract dedupes it
 * for the life of the Note. That is also why the caller must pass the Note's
 * OWN creation date as dateIso rather than "now" — the week is part of the
 * document's path, so a retry a week later would otherwise land in a different
 * week and create a second document for an event that must exist once.
 */
export function evidenceDedupeScope(eventType, dateIso) {
  if (!(eventType in EVENT_APPROACHES)) throw new TypeError(`Unknown Study event: ${eventType}.`);
  return eventType === "journal.note-created" ? "once" : requireIsoDay(dateIso, "dateIso");
}

/** The Approach this event may credit, given the Study mode where the contract offers two. Never resolves to an Approach outside ADR-008's six. */
export function evidenceApproachId(eventType, trackableId) {
  const allowed = EVENT_APPROACHES[eventType];
  if (!allowed) throw new TypeError(`Unknown Study event: ${eventType}.`);
  if (!allowed.includes(trackableId)) {
    throw new TypeError(`${eventType} may not credit ${trackableId}.`);
  }
  return trackableId;
}

/** The deterministic document id. Same inputs, same id, for ever — which is what makes a retry a database-level no-op. */
export function studyEvidenceId({ eventType, trackableId, unitKey, noteId, dateIso } = {}) {
  evidenceApproachId(eventType, trackableId);
  const unitType = evidenceUnitType(unitKey);
  if (!unitType) throw new TypeError("Activity evidence requires an ayah, range or surah Study Unit key.");
  const journal = isJournalEvent(eventType);
  if (journal) {
    if (typeof noteId !== "string" || !NOTE_ID.test(noteId)) {
      throw new TypeError(`${eventType} requires the Note's own permanent id.`);
    }
  } else if (noteId != null) {
    throw new TypeError(`${eventType} must not carry a noteId.`);
  }
  const noteSlot = journal ? noteId : NO_NOTE;
  const dedupeScope = evidenceDedupeScope(eventType, dateIso);
  return `${eventType}__${trackableId}__${unitKey}__${noteSlot}__${dedupeScope}`;
}

/** The parent weekly document id — the EXISTING `activity` id, unchanged. This module never writes that document; it only needs its name to address the subcollection beneath it. */
export function evidenceParentKey(tenantId, personId, weekKey) {
  if (!tenantId || !personId) throw new TypeError("tenantId and personId are required.");
  requireIsoDay(weekKey, "weekKey");
  return `${tenantId}__${personId}__${weekKey}`;
}

/**
 * The complete evidence document, minus the I17 envelope that envelope.js
 * stamps. Frozen, so a caller cannot mutate what it is about to persist.
 *
 * `occurrenceId` is DELIBERATELY ABSENT for `wbw.engaged`, per the Master
 * Architect amendment of 14 Sep 2026: the grain is ayah + day, so whichever
 * word happened to be tapped first would arbitrarily win the slot while the
 * rest went unrepresented — the appearance of occurrence-level precision this
 * document does not have. The authoritative occurrence-level state is
 * `quranWordProgress`, which is unchanged. No reader of Activity needs it:
 * Monitor counts per student, subject and unit; backup prints entries; and
 * `bulkConfirmWeek()` cannot see this collection at all.
 */
export function buildStudyEvidenceDocument({
  eventType, tenantId, personId, weekKey, dateIso, unitKey, trackableId, noteId,
} = {}) {
  const unitType = evidenceUnitType(unitKey);
  if (!unitType) throw new TypeError("Activity evidence requires an ayah, range or surah Study Unit key.");
  evidenceApproachId(eventType, trackableId);
  requireIsoDay(dateIso, "dateIso");
  requireIsoDay(weekKey, "weekKey");
  if (!tenantId || !personId) throw new TypeError("tenantId and personId are required.");

  const doc = {
    contractVersion: STUDY_ACTIVITY_EVIDENCE_CONTRACT,
    eventType,
    tenantId,
    personId,
    weekKey,
    dateIso,
    subjectId: "quran",
    unitKey,
    unitType,
    trackableId,
    action: "practised",
    dedupeScope: evidenceDedupeScope(eventType, dateIso),
    masteryEffect: "none",
  };
  if (isJournalEvent(eventType)) {
    if (typeof noteId !== "string" || !NOTE_ID.test(noteId)) {
      throw new TypeError(`${eventType} requires the Note's own permanent id.`);
    }
    doc.noteId = noteId;
  } else if (noteId != null) {
    throw new TypeError(`${eventType} must not carry a noteId.`);
  }
  return Object.freeze(doc);
}
