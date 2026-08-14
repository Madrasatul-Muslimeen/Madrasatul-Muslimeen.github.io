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
//
// Follow-up round (11 Aug 2026, same day as Phase 13 round 1): the
// bookmarks.resume/activity.viaProgramId wiring flagged above as a
// deliberately separate round. Scoped to topic-study.js (Deen Study,
// Arabic, Hadith, General Study, Nature-Life, Life Skill) and
// routine-study.js (Health, LDOG) this round -- programIdForPersonSubject()
// below is the one shared lookup both controllers call. QuranRevival
// (quranrevival.html/hifz-renderer.js/ayah-renderer.js) and Asma ul Husna
// (asma-study.js) are NOT wired yet -- their subjectId semantics don't map
// the same way onto a course offer's subjectIds[] (Quran's own subject
// tree is a single "quran" leaf, not per-Approach; Asma's chunk subject is
// one anchor node, not per-Name) -- real follow-up, flagged rather than
// guessed at.
//
// Phase 10 addition: enrolPerson()/endEnrollment() below now also back
// classes.js's roster management (classes.js imports these functions
// directly rather than duplicating them -- contextType is the only thing
// that varies between a course offer and a class, and both share the same
// enrollments collection per the Architecture doc's own schema). The same
// two functions now also maintain teacherStudentLinks, the D9-style rules
// mirror that lets firestore.rules answer "does this teacher actually
// teach this specific student" in O(1) -- see the comment above
// recomputeTeacherStudentLink() below. This means Phase 7 round 2's
// course-offer teachers gain real, enforced scoped access (not just
// roster read) the moment this round's rules deploy, same as class
// teachers -- not a separate mechanism per contextType.

import { collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { t } from "./i18n.js";
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
// Enrolments -- contextType is "courseOffer" or "class" (Phase 10). contextId
// is the course offer's/class's own OWN id segment (not tenant-prefixed on
// its own -- the doc id below prefixes tenantId once, matching every other
// compound-key collection in this codebase).
// ---------------------------------------------------------------------------

function enrollmentDocId(tenantId, contextId, personId) {
  return `${tenantId}__${contextId}__${personId}`;
}

/** roleInClass: "student" | "teacher" (the Architecture doc's own field name). contextType defaults to "courseOffer" so every pre-Phase-10 caller keeps working unchanged; classes.js passes "class" explicitly. */
export async function enrolPerson(db, tenantId, { contextId, contextType, personId, roleInClass, subjectIds }, uid) {
  const role = roleInClass ?? "student";
  await createDocument(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId), {
    tenantId,
    contextType: contextType ?? "courseOffer",
    contextId,
    personId,
    roleInClass: role,
    subjectIds: subjectIds ?? [],
    status: "active",
    startedAt: new Date().toISOString(),
    endedAt: null,
  }, uid);
  await syncTeacherStudentLinksForContext(db, tenantId, contextId, personId, role, uid);
}

/** I4/D6: end the enrolment, never delete it -- the history of who was ever enrolled stays. uid is needed now (Phase 10) to stamp any teacherStudentLinks rows this ending recomputes. */
export async function endEnrollment(db, tenantId, contextId, personId, uid) {
  const existing = await getEnrollment(db, tenantId, contextId, personId);
  await updateDocument(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId), {
    status: "ended",
    endedAt: new Date().toISOString(),
  });
  if (existing) await syncTeacherStudentLinksForContext(db, tenantId, contextId, personId, existing.roleInClass, uid);
}

export async function getEnrollment(db, tenantId, contextId, personId) {
  const snap = await getDoc(doc(db, TENANT.ENROLLMENTS, enrollmentDocId(tenantId, contextId, personId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Every enrolment for one course offer or class -- read-safe for any tenant member (Phase 10: enrollments' read rule widened to anyMemberOf() so a guardian/self enrolling their own child can still see the REST of that context's roster, which teacherStudentLinks syncing below depends on -- see the enrollments match block's own comment in firestore.rules for why the narrower per-row rule this used to rely on couldn't support that). A guardian/self wanting just their own child's row can still use getEnrollment() instead, same shape as submissions. */
export async function listEnrollmentsForOffer(db, tenantId, contextId) {
  const q = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId),
    where("contextId", "==", contextId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Every enrolment naming this specific person -- the query's own personId-derived doc structure means array-contains isn't needed here (unlike assignments). Read-safe for any tenant member per the Phase 10 anyMemberOf() widening noted on listEnrollmentsForOffer() above. */
export async function listEnrollmentsForPerson(db, tenantId, personId) {
  const q = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId),
    where("personId", "==", personId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Follow-up round (Homework teacher-scoping): every class/course-offer
 * contextId this person is an ACTIVE TEACHER in -- either contextType,
 * unlike programSubjectMapFromEnrollments() below which is courseOffer-only
 * (a class is a real teaching assignment too, homework isn't limited to
 * course offers). Used both to build homework.html's context picker for a
 * teacher and to constrain the read query for their own assignments list --
 * mirrors firestore.rules' own isActiveTeacherInContext() so the client
 * query and the rule agree on what "actively teaching this context" means.
 */
export function activeTeacherContextIdsFromEnrollments(enrollments) {
  return enrollments
    .filter((e) => e.roleInClass === "teacher" && e.status === "active")
    .map((e) => e.contextId);
}

/**
 * Follow-up round (subject-level teacher scoping -- the SUBJECT half of
 * CLAUDE.md's own long-parked "second open access-control question," the
 * STUDENT half having been closed in Phase 10). `canRecordFor()` in
 * firestore.rules grants a co-enrolled teacher record/confirm authority
 * over EVERY subject for a student, not just the ones they're actually
 * assigned to teach -- the same "Firestore rules can't safely inspect one
 * key of an arbitrarily-keyed map" limitation this codebase already
 * accepts for subjects/trackables/records entries (see CLAUDE.md's own
 * note on this). Closing it FOR REAL needs client-side filtering in the
 * study screens -- this is that filter, not a new security rule. It
 * narrows what the HONEST client shows/offers; it is not, and cannot
 * cheaply be, a hard server-side boundary the way `isCoEnrolledTeacherOf()`
 * (the student half) is.
 *
 * Reads subjects off the CONTEXT (classes.js's `createClass()` /
 * course-offers.js's `createCourseOffer()` own `subjectIds[]`), not the
 * per-enrolment `subjectIds[]` `enrolPerson()` also accepts -- checked
 * against every real enrol call site (classes.html/course-offers.html) and
 * found that field is ALWAYS written `[]`; no screen has ever populated it.
 * Scoping against a field that's always empty would lock every teacher out
 * of everything, the opposite of "narrower, not broken" -- so this uses the
 * field that's actually populated when an admin bothers to name subjects
 * for a class/offer.
 *
 * `contexts`: every class + course offer in the tenant (merged), each
 * `{id, subjectIds}` -- callers already fetch these for other reasons
 * (`listClasses()`/`listCourseOffers()`).
 *
 * Returns every subjectId the teacher is assigned to teach this student,
 * across every context where BOTH are actively enrolled (teacher as
 * teacher, student as student) -- the union of each such context's own
 * `subjectIds[]`. Returns `null` (not `[]`) if that union comes out empty
 * -- an admin who never named specific subjects for a shared class/offer
 * almost certainly meant "no restriction," not "assigned to nothing";
 * treating an empty result as "show nothing" would be a real regression
 * for the common case, not a safety improvement.
 */
export function allowedSubjectIdsForTeacherStudent(teacherEnrollments, studentEnrollments, contexts) {
  const contextSubjectIds = new Map(contexts.map((c) => [c.id, c.subjectIds ?? []]));
  const teacherContextIds = new Set(
    teacherEnrollments
      .filter((e) => e.roleInClass === "teacher" && e.status === "active")
      .map((e) => e.contextId)
  );
  const studentContextIds = new Set(
    studentEnrollments
      .filter((e) => e.roleInClass === "student" && e.status === "active")
      .map((e) => e.contextId)
  );
  const allowed = new Set();
  for (const contextId of teacherContextIds) {
    if (studentContextIds.has(contextId)) {
      (contextSubjectIds.get(contextId) ?? []).forEach((id) => allowed.add(id));
    }
  }
  return allowed.size > 0 ? [...allowed] : null;
}

/**
 * Follow-up round: Map(subjectId -> courseOffer contextId) for one person --
 * every subject covered by an active course-offer enrolment of theirs. Only
 * contextType "courseOffer" counts as a "program" (bookmarks.js's own
 * NO_PROGRAM comment: programId means courseOffers specifically, not
 * classes -- a class is a different concept in this app's own vocabulary).
 * If more than one active course offer covers the same subject for the same
 * person, the first one found wins -- a real but rare edge case, not solved
 * here.
 */
export function programSubjectMapFromEnrollments(enrollments) {
  const map = new Map();
  for (const e of enrollments) {
    if (e.contextType !== "courseOffer" || e.status !== "active") continue;
    for (const subjectId of e.subjectIds ?? []) {
      if (!map.has(subjectId)) map.set(subjectId, e.contextId);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// teacherStudentLinks -- Phase 10, D9-style rules-support mirror.
//
// Security rules can only exists()/get() a FIXED document path -- never run
// a query -- so there is no cheap way for firestore.rules to answer "is
// there SOME class or course offer where teacher T and student S are both
// actively enrolled" directly against the enrollments collection (that
// would mean scanning every contextId). This collection denormalizes
// exactly that yes/no answer, keyed by the pair, so the rule becomes one
// exists()+get() -- see isCoEnrolledTeacherOf() in firestore.rules. It is
// recomputed by the client on every enrolPerson()/endEnrollment() call
// above and is never shown in any screen (same as tenantMemberUids /
// inviteTokens, D9).
//
// This is what lets canRecordFor() replace blanket isTeacherIn(tenantId)
// access with real per-student scoping without breaking D10's "no
// friction" logging workflow: the check is still a flat boolean on the
// student being acted on, not a live query at write time.
// ---------------------------------------------------------------------------

function teacherStudentLinkDocId(tenantId, teacherPersonId, studentPersonId) {
  return `${tenantId}__${teacherPersonId}__${studentPersonId}`;
}

/** Re-derives ONE pair's link from live, tenant-wide enrolment state (every context, not just the one that just changed) -- so a pair still sharing a DIFFERENT active context after one enrolment ends is correctly left active. */
async function recomputeTeacherStudentLink(db, tenantId, teacherPersonId, studentPersonId, uid) {
  const teacherCtxQ = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId), where("personId", "==", teacherPersonId),
    where("roleInClass", "==", "teacher"), where("status", "==", "active")
  );
  const studentCtxQ = query(
    collection(db, TENANT.ENROLLMENTS),
    where("tenantId", "==", tenantId), where("personId", "==", studentPersonId),
    where("roleInClass", "==", "student"), where("status", "==", "active")
  );
  const [teacherSnap, studentSnap] = await Promise.all([getDocs(teacherCtxQ), getDocs(studentCtxQ)]);
  const teacherContexts = new Set(teacherSnap.docs.map((d) => d.data().contextId));
  const active = studentSnap.docs.some((d) => teacherContexts.has(d.data().contextId));

  const docId = teacherStudentLinkDocId(tenantId, teacherPersonId, studentPersonId);
  const existing = await getDoc(doc(db, TENANT.TEACHER_STUDENT_LINKS, docId));
  const payload = { tenantId, teacherPersonId, studentPersonId, active };
  if (existing.exists()) await updateDocument(db, TENANT.TEACHER_STUDENT_LINKS, docId, payload);
  else await createDocument(db, TENANT.TEACHER_STUDENT_LINKS, docId, payload, uid);
}

/** Recomputes every teacher<->student link touched by one person's enrolment change in one context. Only needs the roster of THIS context (see recomputeTeacherStudentLink's own comment for why touching just the changed context is still globally correct). */
async function syncTeacherStudentLinksForContext(db, tenantId, contextId, changedPersonId, changedRole, uid) {
  const roster = await listEnrollmentsForOffer(db, tenantId, contextId); // generic by contextId despite the name
  const active = roster.filter((e) => e.status === "active");
  const counterpartRole = changedRole === "teacher" ? "student" : "teacher";
  const counterparts = active.filter((e) => e.roleInClass === counterpartRole).map((e) => e.personId);

  await Promise.all(counterparts.map((otherId) => {
    const [teacherPersonId, studentPersonId] = changedRole === "teacher" ? [changedPersonId, otherId] : [otherId, changedPersonId];
    return recomputeTeacherStudentLink(db, tenantId, teacherPersonId, studentPersonId, uid);
  }));
}

// ---------------------------------------------------------------------------
// Reading an offer/class status and an enrolment role out loud
// (full app translation, phase 4).
//
// Both are stored identifiers -- "active"/"ended"/"archived" and
// "student"/"teacher" -- printed raw into course-offers.html's cards, so a
// Bangla reader saw English words inside an otherwise Bangla card. Same
// split as everywhere else: the identifier stays the canonical stored value
// (and still drives the pill's CSS class), this is where it becomes text.
// Shared with classes.html, which shows exactly the same two things.
// ---------------------------------------------------------------------------

// Phase 5 folded the status wording into js/labels.js, where every other
// archivable thing in the app now reads it from -- kept exported here under
// its original name so this module's own callers are unchanged.
export { entityStatusLabel as contextStatusLabel } from "./labels.js";

// An enrolment's roleInClass is "student" or "teacher" -- the same two words
// js/labels.js already names for app roles, so it reads them from there
// rather than keeping a second map that could drift.
export { roleLabel as roleInClassLabel } from "./labels.js";
