// MAP Phase 5 (P5-C) — the bridge from a Note the reader actually committed to
// (a) a permanent Note bound to the Study Unit it is about, and (b) the ADR-008
// Journaling Activity evidence that commit earns.
//
// UNINVOKED. Nothing in the app calls this yet: the Note Foundation
// collections have no deployed Rule, so every write here would be denied in
// production, and I15 requires that denial to reach the reader rather than be
// swallowed. Wiring an editor to it is a separate, separately audited task.
// A boundary suite asserts the uninvoked state by reading every file under app/.
//
// THREE THINGS THIS MODULE DELIBERATELY CANNOT DO
//
// 1. It cannot touch the live per-āyah quick note. `ayahNotes` holds real
//    Owner data today; ADR-009 §5 promotes rather than migrates, and the
//    promotion takes the HTML as an ARGUMENT. This module therefore holds no
//    reference to `ayah-notes.js` at all, which is what makes "promotion
//    cannot damage the quick note" provable by reading the imports.
//
// 2. It cannot grant status. Nothing here names records, claimStatus,
//    confirmEntry, achieved or mastered (ADR-003).
//
// 3. It cannot write Activity evidence as a side effect of saving a Note.
//    Every function returns the evidence ARGUMENTS and stops; recording them
//    is a separate call the surface makes, so a failed evidence write is
//    surfaced by the caller (I15) instead of being buried inside a save that
//    already succeeded. This is the same split P4-D uses.

import { weekKeyFor } from "./activity.js";
import {
  NOTE_STATUS,
  createPermanentNote,
  getNotesByIds,
  listNoteSourcesForUnit,
  retirePermanentNote,
  updatePermanentNoteContent,
} from "./note-foundation.js";
import { journalEvidenceArgs } from "./note-journal-evidence.js";
import { bindableUnitType, studyNoteSource } from "./study-note-binding.js";
import { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";

/** ADR-009 §4 — a Note composed in a Study/Note surface. */
export const PROVENANCE_STUDY_NOTE = "study-note";
/** ADR-009 §4 — a Note carried forward from the live per-āyah quick note, which is left exactly where it is. */
export const PROVENANCE_PROMOTED_QUICK_NOTE = "promoted-ayah-note";

function evidenceFor({ tenantId, personId, unitKey, commit, at, weekStartsOn }) {
  return journalEvidenceArgs({ tenantId, personId, unitKey, commit, at, weekStartsOn, weekKeyFor });
}

/**
 * Creates a permanent Note about one Study Unit and returns
 * `{ commit, evidence }`.
 *
 * `evidence` is the `journal.note-created` arguments, or `null` when this unit
 * records no Journaling Activity — a Note about a juz or a topic is a perfectly
 * good Note that earns none (ADR-009 §6). The caller decides whether to record
 * it; see `recordJournalEvidence`.
 */
export async function createStudyNote(db, {
  tenantId, ownerPersonId, ownerUid = null, unitKey,
  title = "", bodyHtml = "",
  relationshipKind = "origin",
  provenanceKind = PROVENANCE_STUDY_NOTE,
  approachId = null,
  actorUid,
  at = new Date(),
  weekStartsOn = 0,
} = {}) {
  const source = studyNoteSource({ unitKey, relationshipKind, provenanceKind, approachId });

  const created = await createPermanentNote(db, {
    tenantId, ownerPersonId, ownerUid, title, bodyHtml, source, actorUid,
  });

  // `previousRevisionId: null` is what makes this a creation to
  // journalEvidenceArgs — the event is decided by the revision chain, never by
  // a flag this function could set wrongly.
  const commit = { noteId: created.noteId, revisionId: created.revisionId, previousRevisionId: null, revisionReason: "created" };
  return { commit, note: created, evidence: evidenceFor({ tenantId, personId: ownerPersonId, unitKey, commit, at, weekStartsOn }) };
}

/**
 * ADR-009 §5 — carries an existing quick note's HTML forward into a permanent
 * Note, leaving `ayahNotes` untouched.
 *
 * The HTML is an ARGUMENT, not something this module reads: the quick note is
 * neither re-read, re-written, nor cleared here, and there is no code path from
 * this function to `ayah-notes.js`.
 */
export async function promoteQuickNoteToStudyNote(db, { bodyHtml, ...rest } = {}) {
  if (typeof bodyHtml !== "string" || bodyHtml.trim() === "") {
    throw new TypeError("promoteQuickNoteToStudyNote: the quick note's own HTML must be supplied.");
  }
  return createStudyNote(db, { ...rest, bodyHtml, provenanceKind: PROVENANCE_PROMOTED_QUICK_NOTE });
}

/**
 * Commits a revision of an existing permanent Note and returns
 * `{ commit, evidence }`, the evidence being `journal.note-revised` — at most
 * one per Note per UTC day, which the deterministic event id enforces at the
 * database rather than here.
 */
export async function reviseStudyNote(db, {
  tenantId, personId, noteId, unitKey, expectedRevisionId,
  title, bodyHtml, revisionReason = "content-update", actorUid,
  at = new Date(), weekStartsOn = 0,
} = {}) {
  const revisionId = await updatePermanentNoteContent(db, {
    tenantId, noteId, expectedRevisionId, title, bodyHtml, revisionReason, actorUid,
  });

  const commit = { noteId, revisionId, previousRevisionId: expectedRevisionId, revisionReason };
  return { commit, evidence: evidenceFor({ tenantId, personId, unitKey, commit, at, weekStartsOn }) };
}

/**
 * Retires a Note. **Records no Journaling Activity, ever** — retiring a Note is
 * not journaling, and no revision is committed for it to be keyed on. The
 * `null` evidence is returned explicitly rather than omitted so a caller cannot
 * read the absence of a field as "not yet computed".
 */
export async function retireStudyNote(db, { tenantId, noteId, expectedRevisionId, actorUid } = {}) {
  await retirePermanentNote(db, { tenantId, noteId, expectedRevisionId, actorUid });
  return { commit: null, evidence: null };
}

/**
 * Records one set of Journaling evidence arguments, or does nothing at all when
 * handed `null`.
 *
 * NOT wrapped in safeWrite, deliberately and for the same reason P4-D's own
 * bridge is not: a denial must reach the reader (I15), and it is the calling
 * surface that knows where to put the message.
 */
export async function recordJournalEvidence(db, evidence, uid) {
  if (!evidence) return { eventId: null, written: false, skipped: true };
  const outcome = await writeStudyActivityEvidence(db, { ...evidence, uid });
  return { ...outcome, skipped: false };
}

// ---------------------------------------------------------------------------
// The read side of ADR-009
// ---------------------------------------------------------------------------

/**
 * The most Notes one read will return for a single Study Unit.
 *
 * A cap, not an expected cost: the usual number of Notes a person has written
 * on one āyah is one or two. It exists so that a pathological unit cannot turn
 * opening a Study screen into an unbounded read.
 */
export const MAX_NOTES_PER_UNIT = 30;

/**
 * Every active Note this person has bound to one permanent Study Unit key,
 * newest first, as `{ rows, truncated }` where each row is
 * `{ source, note }`.
 *
 * TWO NOTES ON ONE UNIT BOTH COME BACK. That is the read-side half of ADR-008's
 * own amendment — permanent Note identity exists precisely so that a second
 * Note on the same āyah is a second Note and not a collision — and it is what
 * the old quick-note surface, keyed by unit alone, can never express.
 *
 * A RETIRED NOTE IS EXCLUDED, and the filter is on the NOTE's status rather
 * than the link's, deliberately. `retirePermanentNote()` updates the Note and
 * does not touch its source links (I4 — the link is not destroyed either), so
 * an active link pointing at a retired Note is the NORMAL state after a
 * retirement, not a corruption. Filtering on the link would show retired Notes
 * to the reader for ever.
 *
 * `truncated` is returned rather than swallowed so a surface can say "showing
 * the 30 most recent" instead of quietly losing the rest.
 */
export async function notesForStudyUnit(db, {
  tenantId, ownerPersonId, unitKey, maximum = MAX_NOTES_PER_UNIT,
} = {}) {
  if (!bindableUnitType(unitKey)) {
    throw new TypeError(`notesForStudyUnit: ${JSON.stringify(unitKey)} is not a permanent Study Unit key.`);
  }

  // One more than the cap, so "there are more" is a fact read off the data
  // rather than a guess made when the page happens to come back exactly full.
  const sources = await listNoteSourcesForUnit(db, {
    tenantId, ownerPersonId, sourceKey: unitKey, maximum: maximum + 1,
  });
  const truncated = sources.length > maximum;
  const kept = sources.slice(0, maximum);

  const notes = await getNotesByIds(db, tenantId, [...new Set(kept.map((s) => s.noteId))]);
  const byId = new Map(notes.map((note) => [note.noteId, note]));

  const rows = kept
    .map((source) => ({ source, note: byId.get(source.noteId) ?? null }))
    .filter((row) => row.note !== null && row.note.status === NOTE_STATUS.ACTIVE);

  return { rows, truncated };
}
