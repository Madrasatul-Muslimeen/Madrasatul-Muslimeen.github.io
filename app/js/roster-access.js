// The tenant roster (tenantPeople) for whoever is signed in -- one helper for every page.
//
// Why this exists (the Owner's report, 12 Oct 2026, "Urgent"): a STUDENT account saw
// `failed at "load context data": permission-denied` on every page. Every page read the roster with the
// one query `tenantPeople where tenantId == T`. Firestore Rules are NOT filters: a query is refused whole
// unless the Rules can prove every document it could return is readable, and only owner/prime
// (canAdminIdentity) and a platform admin can be proven from `tenantId` alone. So a student, a guardian
// and a teacher were each refused outright -- proven in tools/firestore-emulator/roster-access.rules.test.mjs.
// (The Phase 10 comment in firestore.rules saying such a query "comes back pre-filtered" was wrong.)
//
// What this does:
//   1. The tenant-wide query first. For owner/prime it succeeds, so their load is exactly as before
//      (same one read, no extra round trip -- load-speed contract).
//   2. Only on permission-denied, the reads the Rules CAN prove for anyone else:
//      - their own record: `tenantId == T && authUid == me`;
//      - as a teacher, their own teacherStudentLinks, then each actively linked student by id.
//      - as a guardian, `tenantId == T && managedByPersonId == me`. Today's Rules refuse it (isGuardianOf is a
//        per-document get, which no query can prove), so a guardian sees only their own record until the Owner
//        publishes docs/governance/2026-10-12-guardian-roster-candidate.rules (an Owner Control Gate).
//
// Returns a snapshot-shaped object, `{ docs: [{ id, data() }] }`, so every caller's existing
// `snap.docs.map((d) => ({ id: d.id, ...d.data() }))` keeps working unchanged.

import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "./firebase-init.js";
import { TENANT } from "./collections.js";

const isDenied = (err) => err?.code === "permission-denied" || /permission/i.test(err?.message ?? "");

export async function getTenantRosterSnap(db, tenantId) {
  const people = collection(db, TENANT.TENANT_PEOPLE);
  try {
    return await getDocs(query(people, where("tenantId", "==", tenantId)));
  } catch (err) {
    if (!isDenied(err)) throw err;
  }
  const uid = auth.currentUser?.uid;
  if (!uid) return { docs: [] };
  const own = await getDocs(query(people, where("tenantId", "==", tenantId), where("authUid", "==", uid)));
  const byId = new Map(own.docs.map((d) => [d.id, d]));
  for (const me of own.docs) {
    // A guardian's children. Refused by today's Rules (isGuardianOf is a per-document get); allowed once the Owner
    // publishes the candidate rule that lets a guardian read a person whose managedByPersonId is their own.
    try {
      const kids = await getDocs(query(people, where("tenantId", "==", tenantId), where("managedByPersonId", "==", me.id)));
      for (const k of kids.docs) if (!byId.has(k.id)) byId.set(k.id, k);
    } catch (err) {
      if (!isDenied(err)) throw err;
    }
    let links;
    try {
      links = await getDocs(query(collection(db, TENANT.TEACHER_STUDENT_LINKS),
        where("tenantId", "==", tenantId), where("teacherPersonId", "==", me.id)));
    } catch (err) {
      if (!isDenied(err)) throw err;
      continue;
    }
    const studentIds = links.docs.map((l) => l.data()).filter((l) => l.active === true && l.studentPersonId)
      .map((l) => l.studentPersonId).filter((id) => !byId.has(id));
    const students = await Promise.all(studentIds.map((id) =>
      getDoc(doc(db, TENANT.TENANT_PEOPLE, id)).catch((err) => { if (isDenied(err)) return null; throw err; })));
    for (const s of students) if (s?.exists()) byId.set(s.id, s);
  }
  return { docs: [...byId.values()] };
}
