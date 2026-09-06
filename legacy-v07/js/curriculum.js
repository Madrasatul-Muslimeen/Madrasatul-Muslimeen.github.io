// F-117..F-130 (slice) — Curriculum units + plan (Phase 11, Stage C)
//
// curriculumUnits/{tenantId}__{unitId}
//   subjectIds[]   cross-subject: one unit, several subjects, counted once
//   levelId, name{lang}, order, resourceIds[]
//
// curriculumPlan/{tenantId}__{planId}   contextId (class or person)
//   contextType, contextId, curriculumUnitId, term, week, order
//   CONTENT (curriculumUnits) and SCHEDULE (curriculumPlan) stay separate
//   (I8) -- a unit can be re-planned into a different term/week without
//   touching the unit itself, and the same unit can appear in more than one
//   context's plan.
//
// contextType is "class" | "person" -- I1 only binds Layer 2/3, but the
// same reasoning applies here by choice: a Family/Individual tenant has no
// classes, so a person-level plan is the only way they ever get curriculum
// scheduling at all. 4 terms x 10 weeks per the Architecture doc -- plain
// integers (term 1-4, week 1-10), not tied to any real calendar date yet
// (calendarTerms is Operations/Phase 14, reserved, not built -- I8 already
// keeps this safe to add later without touching curriculumPlan's own rows).

import { collection, doc, arrayUnion, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

// ---------------------------------------------------------------------------
// Curriculum units -- admin-authored (canAdminCatalogue), same shape as
// ladders/classes/courseOffers/resources.
// ---------------------------------------------------------------------------

export async function createCurriculumUnit(db, tenantId, { subjectIds, name, order, levelId }, uid) {
  const unitId = doc(collection(db, TENANT.CURRICULUM_UNITS)).id;
  await createDocument(db, TENANT.CURRICULUM_UNITS, `${tenantId}__${unitId}`, {
    tenantId,
    subjectIds: subjectIds ?? [],
    levelId: levelId ?? null,
    name: { en: name },
    order: order ?? 0,
    resourceIds: [],
    status: "active",
  }, uid);
  return unitId;
}

export async function listCurriculumUnits(db, tenantId) {
  const q = query(collection(db, TENANT.CURRICULUM_UNITS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** I4/D6: archive, never delete. */
export async function setCurriculumUnitStatus(db, tenantId, unitId, status) {
  return updateDocument(db, TENANT.CURRICULUM_UNITS, `${tenantId}__${unitId}`, { status });
}

/** Attaches an existing resource (already in the resources collection) to a unit -- a reference, not a copy, so archiving the resource later is the single source of truth (no per-unit duplicate to fall out of sync). */
export async function attachResourceIdToCurriculumUnit(db, tenantId, unitId, resourceId) {
  return updateDocument(db, TENANT.CURRICULUM_UNITS, `${tenantId}__${unitId}`, {
    resourceIds: arrayUnion(resourceId),
  });
}

// ---------------------------------------------------------------------------
// Curriculum plan -- schedules a unit into one context's term/week grid.
// contextId is a class's or person's own id (not tenant-prefixed on its
// own), same shape as enrollments' contextId.
// ---------------------------------------------------------------------------

export async function createCurriculumPlanEntry(db, tenantId, { contextType, contextId, curriculumUnitId, term, week, order }, uid) {
  const planId = doc(collection(db, TENANT.CURRICULUM_PLAN)).id;
  await createDocument(db, TENANT.CURRICULUM_PLAN, `${tenantId}__${planId}`, {
    tenantId,
    contextType,
    contextId,
    curriculumUnitId,
    term,
    week,
    order: order ?? 0,
    status: "active",
  }, uid);
  return planId;
}

export async function listCurriculumPlanForContext(db, tenantId, contextType, contextId) {
  const q = query(
    collection(db, TENANT.CURRICULUM_PLAN),
    where("tenantId", "==", tenantId),
    where("contextType", "==", contextType),
    where("contextId", "==", contextId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }))
    .sort((a, b) => (a.term - b.term) || (a.week - b.week) || ((a.order ?? 0) - (b.order ?? 0)));
}

/** I4/D6: archive, never delete -- a unit taken off a plan stays visible in that context's history rather than vanishing. */
export async function setCurriculumPlanEntryStatus(db, tenantId, planId, status) {
  return updateDocument(db, TENANT.CURRICULUM_PLAN, `${tenantId}__${planId}`, { status });
}

/** Re-plans an entry into a different term/week/order -- the schedule moving, never the content (I8: curriculumUnits itself is untouched by this). */
export async function moveCurriculumPlanEntry(db, tenantId, planId, { term, week, order }) {
  return updateDocument(db, TENANT.CURRICULUM_PLAN, `${tenantId}__${planId}`, { term, week, order });
}
