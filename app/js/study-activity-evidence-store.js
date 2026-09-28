// MAP Phase 4 (P4-C/P4-E) — the ONLY writer, and now the reader, of ADR-008
// Study Activity evidence.
//
//   activity/{tenantId}__{personId}__{weekKey}/evidence/{eventId}
//
// UNINVOKED. Nothing in the app calls this yet, and wiring a Study surface to
// it is a separate, separately audited task. A boundary suite asserts that.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT DO
//
// It never touches `activity/{...}` itself. The weekly document, its
// `entries[]` array and `logActivity()` are untouched by construction: a
// Firestore subcollection is independent of its parent, which does not even
// have to exist. That is not tidiness — `records.js` `bulkConfirmWeek()`
// builds its confirm set entirely from `entries[]`, so evidence appearing
// there would let merely reading an ayah enlarge the set of pending Mastery
// claims one supervisor click confirms. Keeping evidence out of that array is
// the whole reason for this shape (P4-B §1.3).
//
// It never imports or names `records`, `claimStatus`, `confirmEntry`,
// `achieved` or `mastered`. Activity is not Mastery (ADR-003).
//
// THE COLLECTION PATH IS SLASH-JOINED ON PURPOSE. `doc(db, path, id)` accepts
// a multi-segment collection path, so `activity/<week>/evidence` + eventId is
// a valid document reference in exactly three arguments. That means
// envelope.js needs no change to stamp the I17 envelope here, and the test
// harness's own `doc()` needs no change either — a subcollection costs this
// codebase nothing new.

import { collection, doc, getDoc, getDocs, limit, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";
import { studyEvidenceId, evidenceParentKey, buildStudyEvidenceDocument } from "./study-activity-evidence-id.js";

/** The subcollection holding one person's evidence for one week. */
export function evidenceCollectionPath(tenantId, personId, weekKey) {
  return `${TENANT.ACTIVITY}/${evidenceParentKey(tenantId, personId, weekKey)}/evidence`;
}

/**
 * Persists one ADR-008 event as its own immutable document, and returns
 * `{ eventId, written }` — `written: false` meaning the event was already
 * recorded and nothing needed doing.
 *
 * RETRY IS A SUCCESSFUL NO-OP, AND THAT IS NOT THE SAME AS SWALLOWING ERRORS.
 *
 * The identity is the document id, so a retry addresses a document that
 * already exists. The candidate Rules permit `create` only, so such a write
 * comes back as `permission-denied` — and so does a genuine authorisation
 * failure. Treating every `permission-denied` as "already recorded" would hide
 * real failures from the user, which I15 forbids outright.
 *
 * So this CREATES first, and only on a denial reads before deciding (it
 * cannot read first: the deployed rules deny a read of a document that does
 * not exist yet -- see the fix note in the function):
 *
 *   - created                          -> `written: true`
 *   - write denied, document there     -> already recorded, or two writers
 *                                         raced; the event IS recorded, so
 *                                         `written: false`
 *   - write denied, not there / the
 *     read itself refused               -> a REAL failure. The original error
 *                                         is rethrown, so it reaches the user
 *                                         (I15)
 *
 * The read happens only on the rare denied path, and buys the only thing
 * that distinguishes "already done" from "not allowed".
 */
export async function writeStudyActivityEvidence(db, {
  eventType, tenantId, personId, weekKey, dateIso, unitKey, trackableId, noteId, uid,
} = {}) {
  if (!uid) throw new TypeError("Study evidence actor uid is required.");

  const eventId = studyEvidenceId({ eventType, trackableId, unitKey, noteId, dateIso });
  const data = buildStudyEvidenceDocument({
    eventType, tenantId, personId, weekKey, dateIso, unitKey, trackableId, noteId,
  });
  const collectionPath = evidenceCollectionPath(tenantId, personId, weekKey);

  // Architect review, 28 Sep 2026 -- LIVE DEFECT FIXED: this used to READ
  // FIRST. The deployed read rule is `canRecordFor(resource.data.tenantId,
  // resource.data.personId)`, and on a document that does not exist
  // `resource` is null -- an evaluation error that DENIES the read. So the
  // very first step of every new event threw permission-denied, and no
  // evidence row was ever written in production (proven on the emulator
  // against the live firestore.rules; the v08.56 Notes lesson, a third time).
  // Now: CREATE first. Only when the create is refused, look again -- a
  // document that exists is readable (resource is not null), so a retry or a
  // raced writer still reads back as `written: false`; a missing one makes
  // that read fail too, and the ORIGINAL error is rethrown (I15).
  try {
    await createDocument(db, collectionPath, eventId, data, uid);
    return { eventId, written: true };
  } catch (err) {
    let already = false;
    try { already = (await getDoc(doc(db, collectionPath, eventId))).exists(); } catch { already = false; }
    if (already) return { eventId, written: false };
    throw err;
  }
}

/** The most evidence rows one read will return. A cap, not an expected cost. */
export const MAX_EVIDENCE_PER_READ = 200;

/**
 * MAP Phase 4 (P4-E) — one person's ADR-008 evidence for one week, as
 * `{ rows, truncated }`.
 *
 * WHY THIS EXISTS. The candidate Rules have authorised a read since P4-C,
 * exactly mirroring the parent weekly document's own deployed rule
 * (`isPlatformAdmin()` or `canRecordFor(tenantId, personId)`), and the
 * emulator suite proves it: "the person themselves may read their evidence",
 * and neither another learner nor an anonymous caller may. Nothing in `app/js`
 * ever read a row. The same write-only asymmetry P5-E closed for `noteSources`
 * and P6-C for `notePlacements`, found in the Phase 4 collection.
 *
 * NO FILTER AND NO ORDER, AND BOTH ARE DELIBERATE. The PATH is the whole scope
 * — `activity/{tenantId}__{personId}__{weekKey}/evidence` already names the
 * tenant, the person and the week — so re-filtering on the fields inside would
 * re-ask a question the path has answered. And no `orderBy` means **no
 * composite index**: this is the one MAP read that needs nothing added to the
 * index candidates, and `tools/i18n-verify/firestore-index-requirements.mjs`
 * is what holds that true.
 *
 * Truncation is reported by asking for one more than the cap — the P5-E
 * pattern — because a bound hit silently would lose events the person really
 * recorded, and a reader must be able to say so.
 *
 * IT RETURNS EVIDENCE ROWS AND NOTHING ELSE. It computes no totals, credits no
 * Approach and names no claim state. Activity is not Mastery (ADR-003), and the
 * moment this returned anything shaped like a claim it would be a second,
 * unauthorised route into the thing `bulkConfirmWeek()` decides.
 */
export async function listStudyActivityEvidence(db, {
  tenantId, personId, weekKey, maximum = MAX_EVIDENCE_PER_READ,
} = {}) {
  const collectionPath = evidenceCollectionPath(tenantId, personId, weekKey);
  const snapshot = await getDocs(query(collection(db, collectionPath), limit(maximum + 1)));
  const all = snapshot.docs.map((item) => ({ eventId: item.id, ...item.data() }));
  return { rows: all.slice(0, maximum), truncated: all.length > maximum };
}
