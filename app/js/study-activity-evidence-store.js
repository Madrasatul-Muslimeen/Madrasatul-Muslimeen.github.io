// MAP Phase 4 (P4-C) — the ONLY writer of ADR-008 Study Activity evidence.
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

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
 * So this reads first, and on a denial reads AGAIN before deciding:
 *
 *   - document already there          -> no write attempted, `written: false`
 *   - write denied, document now there -> two writers raced; the event IS
 *                                         recorded, so `written: false`
 *   - write denied, still not there    -> a REAL failure. Rethrown, so it
 *                                         reaches the user (I15)
 *
 * The extra read costs one document lookup per event and buys the only thing
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

  const existing = await getDoc(doc(db, collectionPath, eventId));
  if (existing.exists()) return { eventId, written: false };

  try {
    await createDocument(db, collectionPath, eventId, data, uid);
    return { eventId, written: true };
  } catch (err) {
    const raced = await getDoc(doc(db, collectionPath, eventId));
    if (raced.exists()) return { eventId, written: false };
    throw err;
  }
}
