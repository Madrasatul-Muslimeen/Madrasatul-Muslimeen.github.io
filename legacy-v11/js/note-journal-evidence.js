// MAP Phase 5 (P5-B) — the bridge that resolves the deferred P4-D3 Journaling
// dependency: ADR-008 Journaling Activity, keyed on PERMANENT Note identity.
//
// Pure: no Firebase, no DOM, no mutable state. Deliberately uninvoked.
//
// WHY THIS EXISTS, and why it could not exist in Phase 4.
//
// ADR-008 as amended requires `noteId` to participate in the deterministic
// identity of a Journaling event, and requires two Notes on the same unit to
// remain independently representable. The live per-āyah note surface
// (`ayah-notes.js`) stores ONE note per (person, unitKey), keyed by unitKey,
// with no id of any kind — it cannot hold two notes on one unit at all, so
// there was nothing for the amendment to key on. That is why P4-D3 was
// deferred here rather than bodged: synthesising a noteId from the unitKey
// would have left the amendment's words in place while emptying them of
// meaning.
//
// The Note Foundation supplies the real thing: `noteId` is a permanent entity
// id minted once by `newNoteEntityId()` and never reused, and every committed
// change appends a `revisionId` that chains from the previous one. So:
//
//   journal.note-created  — one event for the life of that Note, keyed on the
//                           Note's own id, dedupeScope 'once'.
//   journal.note-revised  — at most one per Note per UTC day, keyed on the
//                           Note's id and the day.
//
// COMMITTED CHANGES ONLY. This module is handed the result of a committed
// Note write — a noteId and the revisionId that write produced. A draft, an
// open editor, a cancelled edit and a failed autosave never produce a
// revisionId, so none of them can reach here. That is ADR-008's "Draft typing,
// opening, cancelling and autosave attempts that do not commit a revision do
// not count", enforced by what the function requires rather than by a flag.
//
// ACTIVITY ONLY. Nothing here names records, claimStatus, confirmEntry,
// achieved or mastered, and nothing here writes anything at all — it returns
// arguments for the accepted evidence writer and stops.

/** ADR-008 maps both Journaling events to Journaling. */
export const JOURNAL_APPROACH_ID = "approach_10";

/** The Note Foundation's own id shape: 32 hex characters, from crypto.randomUUID() with the dashes removed. */
const ENTITY_ID = /^[0-9a-f]{32}$/;

/** The unit types ADR-008's evidence contract accepts (I5). A Note anchored to a juz or a page records no Journaling Activity in v1 — the same refusal Reading makes, for the same reason. */
const EVIDENCE_UNIT_SHAPES = Object.freeze({
  ayah: /^ayah:\d{1,3}:\d{1,3}$/,
  range: /^range:\d{1,3}:\d{1,3}-\d{1,3}$/,
  surah: /^surah:\d{1,3}$/,
});

export function journalUnitType(unitKey) {
  if (typeof unitKey !== "string") return null;
  for (const [unitType, shape] of Object.entries(EVIDENCE_UNIT_SHAPES)) {
    if (shape.test(unitKey)) return unitType;
  }
  return null;
}

export function isPermanentNoteId(value) {
  return typeof value === "string" && ENTITY_ID.test(value);
}

function utcDay(date) {
  return new Date(date.getTime()).toISOString().slice(0, 10);
}

/**
 * Evidence arguments for a committed Note write, or `null` when this commit
 * records no Journaling Activity.
 *
 * `commit` is what the Note Foundation actually returns:
 *   createPermanentNote()        -> { noteId, revisionId }              → created
 *   updatePermanentNoteContent() -> revisionId, with previousRevisionId → revised
 *
 * WHICH EVENT IS DECIDED BY THE REVISION CHAIN, not by a caller's flag. A
 * Note's first revision has `previousRevisionId: null`; every later one names
 * the revision it chains from. So "is this the Note being created, or changed"
 * is read from the data the write itself produced, and a caller cannot get it
 * wrong or claim a creation twice.
 *
 * A retirement records nothing: retiring a Note is not journaling.
 */
export function journalEvidenceArgs({
  tenantId, personId, unitKey, commit, at = new Date(), weekStartsOn = 0, weekKeyFor,
} = {}) {
  if (typeof weekKeyFor !== "function") {
    throw new TypeError("weekKeyFor is required — the week must come from the app's own tenant-aware helper.");
  }
  if (!tenantId || !personId) return null;
  if (!journalUnitType(unitKey)) return null;
  if (!commit || !isPermanentNoteId(commit.noteId) || !isPermanentNoteId(commit.revisionId)) return null;
  if (commit.revisionReason === "retired") return null;

  const created = commit.previousRevisionId == null;
  // The day a Note was CREATED is the day its creation evidence belongs to, and
  // the week that day falls in is where the document lives. Both are taken from
  // the commit's own instant, so a retry resolves to the same place for ever —
  // which is what makes `dedupeScope: 'once'` mean once, and not once per week.
  const dateIso = utcDay(at);

  return {
    eventType: created ? "journal.note-created" : "journal.note-revised",
    tenantId,
    personId,
    weekKey: weekKeyFor(at, weekStartsOn),
    dateIso,
    unitKey,
    trackableId: JOURNAL_APPROACH_ID,
    noteId: commit.noteId,
  };
}
