// F-107..F-116 (slice) — Classes (Phase 10, Stage B2)
//
// classes/{tenantId}__{classId}   name, gloss, subjectIds[], levelId?, status
//
// Roster management (enrol/end a student or teacher) reuses
// course-offers.js's enrolPerson()/endEnrollment() with contextType:
// "class" rather than duplicating that logic -- enrollments is a single
// shared collection per the Architecture doc's own schema, and Phase 7
// round 2 already built the generic half of it. See course-offers.js's own
// header comment for why enrolPerson/endEnrollment now also maintain
// teacherStudentLinks (the rules-support mirror that gives a class teacher
// real, scoped record/confirm authority over just their own roster,
// replacing the old blanket tenant-wide teacher access).

import { collection, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

export async function createClass(db, tenantId, { name, gloss, subjectIds, levelId }, uid) {
  const classId = doc(collection(db, TENANT.CLASSES)).id;
  await createDocument(db, TENANT.CLASSES, `${tenantId}__${classId}`, {
    tenantId,
    name: { en: name },
    gloss: { en: gloss ?? "" },
    subjectIds: subjectIds ?? [],
    levelId: levelId ?? null,
    status: "active",
  }, uid);
  return classId;
}

export async function listClasses(db, tenantId) {
  const q = query(collection(db, TENANT.CLASSES), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
}

/** I4/D6: archive, never delete. */
export async function setClassStatus(db, tenantId, classId, status) {
  return updateDocument(db, TENANT.CLASSES, `${tenantId}__${classId}`, { status });
}
