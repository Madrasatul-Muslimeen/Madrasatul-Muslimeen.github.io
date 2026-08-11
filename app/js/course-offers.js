// F-073..F-084 (deferred slice) — Course offers + enrolments (Phase 7 round 2)
//
// courseOffers/{tenantId}__{offerId}     name, moduleIds[], subjectIds[], routine{}, status
// enrollments/{tenantId}__{contextId}__{personId}
//   contextType class|courseOffer, contextId, roleInClass, subjectIds[],
//   status active|ended, startedAt, endedAt
//
// Deferred by the owner during Phase 7 round 1 (Stage B1 -- built for
// external-student/Tuition-Provider use, which D13 ranked below the
// owner's/family's own use at the time). Built now that the owner has
// confirmed external-student use is actually on the horizon.
//
// contextType is always "courseOffer" here -- "class" (Phase 10, Stage B2)
// doesn't exist yet, and nothing in a later phase is a prerequisite for an
// earlier one, so enrolments work standalone against a course offer today.
//
// Round 2 scope, flagged explicitly rather than half-built: this file gives
// course offers and enrolments a real, working data layer + admin UI. It
// does NOT yet wire bookmarks.resume's programId or activity's
// viaProgramId to a real enrolled offer while studying -- that touches
// every already-shipped study renderer (topic-study.js, routine-study.js,
// quranrevival.html, hifz-renderer.js...) and is a deliberately separate
// follow-up round, not attempted in the same sitting as the data layer
// itself. programId stays the literal string "none" on bookmark entries
// until that round.

import { collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

// ---------------------------------------------------------------------------
// Course offers -- admin-authored (canAdminCatalogue), same shape as
// ladders/domains/resources.
// ---------------------------------------------------------------------------

export async function createCourseOffer(db, tenantId, { name, moduleIds, subjectIds, routine }, uid) {
  const offerId = doc(collection(db, TENANT.COURSE_OFFERS)).id;
  await createDocument(db, TENANT.COURSE_OFFERS, `${tenantId}__${offerId}`, {
    tenantId,
    name: { en: name },
    moduleIds: moduleIds ?? [],
    subjectIds: subjectIds ?? [],
    // The shared schedule multiple people follow together -- deliberately
    // minimal (a description of WHEN this offer runs, not real dated
    // session instances; that's Operations/Phase 14, reserved, not built).
    routine: {
      daysOfWeek: routine?.daysOfWeek ?? [],
      startDate: routine?.startDate ?? null,
      endDate: routine?.endDate ?? null,
      notes: routine?.notes ?? null,
    },
    status: "active",
  }, uid);
  return offerId;
}

export async function listCourseOffers(db, tenantId) {
  const q = query(collection(db, TENANT.COURSE_OFFERS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
}

/** I4/D6: archive, never delete. */
export async function setCourseOfferStatus(db, tenantId, offerId, status) {
  return updateDocument(db, TENANT.COURSE_OFFERS, `${tenantId}__${offerId}`, { status });
}

// ---------------------------------------------------------------------------
// Enrolments -- contextType is always "courseOffer" this round (no classes
// yet). contextId is the course offer's own OWN id segment (not
// tenant-prefixed on its own -- the doc id below prefixes tenantId once,
// matching every other compound-key collection in this codebase).
// ---------------------------------------------------------------------------

function enrollmentDocId(tenantId, contextId, personId) {
  return `${tenantId}__${contextId}__${personId}`;
}

/** roleInClass: "student" | "teacher" (the Architecture doc's own field name -- kept as-is even though "class" doesn't apply to a course-offer context yet, since Phase 10's classes will reuse this exact same field/collection). */
export async function enrolPerson(db, tenantId, { contextId, personId, roleInClass, subjectIds }, uid) {
  await createDocument(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId), {
    tenantId,
    contextType: "courseOffer",
    contextId,
    personId,
    roleInClass: roleInClass ?? "student",
    subjectIds: subjectIds ?? [],
    status: "active",
    startedAt: new Date().toISOString(),
    endedAt: null,
  }, uid);
}

/** I4/D6: end the enrolment, never delete it -- the history of who was ever enrolled stays. */
export async function endEnrollment(db, tenantId, contextId, personId) {
  return updateDocument(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId), {
    status: "ended",
    endedAt: new Date().toISOString(),
  });
}

export async function getEnrollment(db, tenantId, contextId, personId) {
  const snap = await getDoc(doc(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Every enrolment for one course offer -- read-safe for admin (canAdminIdentity's tenant-wide branch doesn't depend on personId) and for a teacher enrolled in this same offer (isEnrolledAsTeacherIn, also independent of the OTHER rows' personId). A guardian/self wanting just their own child's row should use getEnrollment() instead, same shape as submissions. */
export async function listEnrollmentsForOffer(db, tenantId, contextId) {
  const q = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId),
    where("contextId", "==", contextId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Every enrolment naming this specific person -- the query's own personId-derived doc structure means array-contains isn't needed here (unlike assignments); a where(personId==) filter is exactly what the read rule's self/guardian branches depend on. */
export async function listEnrollmentsForPerson(db, tenantId, personId) {
  const q = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId),
    where("personId", "==", personId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
