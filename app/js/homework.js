// F-097..F-106 — Homework & feedback (Phase 9)
//
// assignments/{tenantId}__{assignmentId}
//   createdByPersonId, assignedToPersonIds[], contextId (class or
//   course-offer id -- null for admin/guardian-created assignments, REQUIRED
//   for a teacher-created one as of the follow-up round below;
//   firestore.rules' isAssignmentCreator()/isActiveTeacherInContext() are
//   what actually enforce that, not this file), extraReadersPersonIds[]
//   (follow-up round -- every active teacher of the declared contextId plus
//   every guardian of an assignedToPersonIds entry, computed ONCE at
//   creation by the caller, not this file -- see firestore.rules' own long
//   comment on the assignments match block for why this is denormalized
//   rather than computed at read time: a get()-dependent READ rule is
//   exactly the shape Firestore's list-query provability check tends to
//   reject, and this collection is never read via a single getDoc(), always
//   a query), moduleId, subjectId, unitKeys[], dueDate, instructions{lang},
//   maxScore, status active|archived
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
import { t } from "./i18n.js";
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
  createdByPersonId, assignedToPersonIds, contextId, extraReadersPersonIds, moduleId, subjectId, unitKeys,
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
      // Follow-up round (Homework teacher-scoping): a real class/course-offer
      // id from now on when the creator is a teacher -- firestore.rules'
      // isAssignmentCreator() requires it for the teacher branch
      // (isActiveTeacherInContext()). Admin/guardian creators may still pass
      // null, same as every assignment before this round.
      contextId: contextId ?? null,
      // Follow-up round: who besides the assigned students and admin may
      // read this -- computed by the caller (homework.html), not here. See
      // firestore.rules' assignments match block for why this is
      // denormalized at creation rather than checked at read time.
      extraReadersPersonIds: extraReadersPersonIds ?? [],
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

/** Every assignment in a tenant -- provable read-safe (canAdminIdentity is tenant-wide, independent of any one document's fields) only for an admin actor as of the follow-up round (teacher/guardian both lost their own blanket-tenant-wide read branch -- see firestore.rules' assignments match block). A non-admin actor must use listAssignmentsForPerson()/listAssignmentsForReader() instead. Currently unused by any screen -- kept for a future admin-wide overview. */
export async function listAssignmentsForTenant(db, tenantId) {
  const q = query(collection(db, TENANT.ASSIGNMENTS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
}

/**
 * Every assignment naming this specific person -- the query's own
 * array-contains filter is what makes this read-safe for a self/student
 * actor (matches the read rule's "myPersonIdIn in assignedToPersonIds"
 * branch) and for an admin actor (their own read branch doesn't depend on
 * assignedToPersonIds at all). A teacher or guardian viewing SOMEONE ELSE's
 * assignments (not themselves) must use listAssignmentsForReader() instead
 * -- their read access runs through extraReadersPersonIds, a different
 * field this query doesn't filter on.
 */
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

/**
 * Follow-up round (Homework teacher-scoping + guardian-scoping): every
 * assignment this specific person (a teacher or guardian, never the
 * assigned student themself -- that's listAssignmentsForPerson() above) may
 * read via extraReadersPersonIds -- the array createAssignment() denormalizes
 * at creation time (every active teacher of the declared contextId, plus
 * every guardian of an assignedToPersonIds entry). The query's own
 * array-contains filter on THIS SAME FIELD is what makes it read-safe --
 * structurally identical to listAssignmentsForPerson()'s own
 * assignedToPersonIds filter, just on the other array. Callers wanting only
 * the assignments relevant to one particular student should filter the
 * result client-side by `a.assignedToPersonIds.includes(studentPersonId)`
 * -- this function itself returns everything the reader can see, since
 * Firestore has no way to additionally constrain by a field (assignedToPersonIds)
 * this query doesn't itself filter on without hitting the same
 * list-provability problem this whole redesign exists to avoid.
 */
export async function listAssignmentsForReader(db, tenantId, readerPersonId) {
  const q = query(
    collection(db, TENANT.ASSIGNMENTS),
    where("tenantId", "==", tenantId),
    where("extraReadersPersonIds", "array-contains", readerPersonId)
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

// ---------------------------------------------------------------------------
// Reading a submission state out loud (full app translation, phase 4).
//
// homework.html printed `status.replace("_", " ")` straight into the card's
// pill -- readable-ish in English, three English words in an otherwise
// Bangla card. Same split used everywhere else in this codebase: the stored
// identifier stays canonical, and this is the one place it becomes text.
// ---------------------------------------------------------------------------

const SUBMISSION_STATUS_LABELS = Object.freeze({
  not_submitted: "Not submitted",
  submitted: "Submitted",
  marked: "Marked",
});

export function submissionStatusLabel(status) {
  const label = SUBMISSION_STATUS_LABELS[status];
  return label ? t(label) : (status ?? "");
}
