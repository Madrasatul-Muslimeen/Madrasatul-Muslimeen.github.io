// F-097..F-106 — Homework & feedback (Phase 9)
//
// assignments/{tenantId}__{assignmentId}
//   createdByPersonId, assignedToPersonIds[], contextId (always null for now
//   -- classes don't exist until Phase 10, and nothing in a later phase is a
//   prerequisite for an earlier one), moduleId, subjectId, unitKeys[],
//   dueDate, instructions{lang}, maxScore, status active|archived
//
// submissions/{assignmentId}__{personId}  (assignmentId already carries the
//   tenantId prefix, so this id is globally unique without its own separate
//   one -- matches the Architecture doc's own literal id format)
//   status not_submitted|submitted|marked, submittedAt, submittedNote,
//   score, maxScoreAtMark (frozen alongside score, I6-style -- a later edit
//   to the assignment's own maxScore never reinterprets an old mark),
//   comment, markedByPersonId, markedAt
//
// teachingNotes/{tenantId}__{noteId}  -- PRIVATE to the author (Architecture
//   s7). authorUid rides alongside authorPersonId purely so the security
//   rule can check ownership in one field read (same shape
//   tenantPeople.authUid already uses for isSelfPerson) -- never shown in
//   any UI.
//
// One submission doc is created per assignedToPersonId in the SAME batch as
// the assignment (not lazily on first write) -- every assignment always has
// a known, fixed roster of who it's for, so there's no "does this exist
// yet" ambiguity the way records/activity's first-claim case has.

import { collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument, commitEnvelopeBatch } from "./envelope.js";

// Same reasoning as catalogue.js's SEED_CHUNK_SIZE: a batch's total
// get()/exists() calls spent evaluating security rules is capped at 20:
// each submission doc's create rule (canRecordFor) and the assignment doc's
// own (isAssignmentCreator) each cost a handful of get()s, so this stays
// well under the cap even for a several-child household in one create.
const BATCH_CHUNK_SIZE = 5;

function assignmentDocId(tenantId, assignmentId) {
  return `${tenantId}__${assignmentId}`;
}
function submissionDocId(fullAssignmentId, personId) {
  return `${fullAssignmentId}__${personId}`;
}

async function commitInChunks(db, creates, uid) {
  for (let i = 0; i < creates.length; i += BATCH_CHUNK_SIZE) {
    await commitEnvelopeBatch(db, { creates: creates.slice(i, i + BATCH_CHUNK_SIZE) }, uid);
  }
}

// ---------------------------------------------------------------------------
// Assignments + their submission stubs.
// ---------------------------------------------------------------------------

/**
 * Creates an assignment and one not_submitted submission stub per assigned
 * person, in one batch (chunked). instructions is plain text, wrapped into
 * an { en: ... } language-keyed object here (I11) -- callers pass a string,
 * not a pre-built lang object, matching createTopicSubject's own pattern.
 */
export async function createAssignment(db, tenantId, {
  createdByPersonId, assignedToPersonIds, moduleId, subjectId, unitKeys,
  dueDate, instructions, maxScore,
}, uid) {
  if (!assignedToPersonIds?.length) {
    throw new Error("createAssignment: at least one assignedToPersonIds is required.");
  }
  const assignmentId = doc(collection(db, TENANT.ASSIGNMENTS)).id;
  const fullId = assignmentDocId(tenantId, assignmentId);

  const creates = [{
    collectionName: TENANT.ASSIGNMENTS,
    docId: fullId,
    data: {
      tenantId,
      createdByPersonId,
      assignedToPersonIds,
      contextId: null,
      moduleId: moduleId ?? null,
      subjectId: subjectId ?? null,
      unitKeys: unitKeys ?? [],
      dueDate: dueDate ?? null,
      instructions: instructions ? { en: instructions } : null,
      maxScore: maxScore ?? null,
      status: "active",
    },
  }];

  for (const personId of assignedToPersonIds) {
    creates.push({
      collectionName: TENANT.SUBMISSIONS,
      docId: submissionDocId(fullId, personId),
      data: {
        tenantId,
        assignmentId: fullId,
        personId,
        status: "not_submitted",
        submittedAt: null,
        submittedNote: null,
        score: null,
        maxScoreAtMark: null,
        comment: null,
        markedByPersonId: null,
        markedAt: null,
      },
    });
  }

  await commitInChunks(db, creates, uid);
  return assignmentId;
}

/** Every assignment in a tenant -- provable read-safe (canAdminIdentity/isTeacherIn/isGuardianIn are all tenant-wide, independent of any one assignedToPersonIds entry) only for admin/teacher/guardian actors; a self/student actor must use listAssignmentsForPerson() instead. */
export async function listAssignmentsForTenant(db, tenantId) {
  const q = query(collection(db, TENANT.ASSIGNMENTS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
}

/** Every assignment naming this specific person -- the query's own array-contains filter is what makes this read-safe for a self/student actor (matches the read rule's "myPersonIdIn in assignedToPersonIds" branch). */
export async function listAssignmentsForPerson(db, tenantId, personId) {
  const q = query(
    collection(db, TENANT.ASSIGNMENTS),
    where("tenantId", "==", tenantId),
    where("assignedToPersonIds", "array-contains", personId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
}

/** I4/D6: archive, never delete. */
export async function setAssignmentStatus(db, tenantId, assignmentId, status) {
  return updateDocument(db, TENANT.ASSIGNMENTS, assignmentDocId(tenantId, assignmentId), { status });
}

// ---------------------------------------------------------------------------
// Submissions.
// ---------------------------------------------------------------------------

export async function getSubmission(db, fullAssignmentId, personId) {
  const snap = await getDoc(doc(db, TENANT.SUBMISSIONS, submissionDocId(fullAssignmentId, personId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Every submission for one assignment -- read-safe for admin/teacher (canRecordFor's tenant-wide branches don't depend on personId), the actor a marking screen actually needs. A guardian/self wanting just their own child's row should use getSubmission() instead. */
export async function listSubmissionsForAssignment(db, tenantId, fullAssignmentId) {
  const q = query(
    collection(db, TENANT.SUBMISSIONS),
    where("tenantId", "==", tenantId),
    where("assignmentId", "==", fullAssignmentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Student/self action -- no file attachment (Phase 15+ territory), just a timestamp and an optional note. */
export async function markSubmitted(db, fullAssignmentId, personId, note) {
  return updateDocument(db, TENANT.SUBMISSIONS, submissionDocId(fullAssignmentId, personId), {
    status: "submitted",
    submittedAt: new Date().toISOString(),
    submittedNote: note?.trim() || null,
  });
}

/**
 * Teacher/guardian/admin action -- "confirm-with-comment" (Architecture s9).
 * maxScoreAtMark freezes the assignment's maxScore as it stood at marking
 * time (I6-style: editing the assignment's own maxScore later never
 * reinterprets an already-issued mark's percentage).
 */
export async function scoreSubmission(db, fullAssignmentId, personId, { score, comment, maxScoreAtMark, markedByPersonId }) {
  return updateDocument(db, TENANT.SUBMISSIONS, submissionDocId(fullAssignmentId, personId), {
    status: "marked",
    score: score ?? null,
    comment: comment?.trim() || null,
    maxScoreAtMark: maxScoreAtMark ?? null,
    markedByPersonId,
    markedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Teaching notes -- private to the author, never shared (Architecture s7).
// ---------------------------------------------------------------------------

export async function createTeachingNote(db, tenantId, { authorPersonId, aboutPersonId, body }, uid, authUid) {
  const noteId = doc(collection(db, TENANT.TEACHING_NOTES)).id;
  await createDocument(db, TENANT.TEACHING_NOTES, `${tenantId}__${noteId}`, {
    tenantId,
    authorPersonId,
    authorUid: authUid,
    aboutPersonId,
    body: body.trim(),
    status: "active",
  }, uid);
  return noteId;
}

/** Every note this signed-in login has authored in this tenant -- authorUid is the rule-provable field, so it's the query filter, not authorPersonId. */
export async function listMyTeachingNotes(db, tenantId, authUid) {
  const q = query(
    collection(db, TENANT.TEACHING_NOTES),
    where("tenantId", "==", tenantId),
    where("authorUid", "==", authUid)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
}

export async function setTeachingNoteStatus(db, tenantId, noteId, status) {
  return updateDocument(db, TENANT.TEACHING_NOTES, `${tenantId}__${noteId}`, { status });
}
