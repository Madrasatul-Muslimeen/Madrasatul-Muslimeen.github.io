// F-067 — Resources (Phase 6, Deen Study & topic renderer)
//
// resources/{tenantId}__{resourceId}   type link|text, url, body, addedByPersonId
// Architecture Layer 1 -- reserved in collections.js since Phase 0, first
// written to in Phase 6 (subjects.resourceIds[], a topic's own content).
// Phase 11 adds the other half the Architecture doc always named: a real
// wire to curriculumUnits (curriculum.js) and, below, a tenant-wide browse
// so resources can be authored ahead of time and attached wherever needed,
// not only at the moment a subject/unit is first created.

import { collection, doc, getDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

/** type: "link" | "text" -- url set for link, body set for text, the other stays null. */
export async function createResource(db, tenantId, { type, url, body }, addedByPersonId, uid) {
  const resourceId = doc(collection(db, TENANT.RESOURCES)).id;
  await createDocument(db, TENANT.RESOURCES, `${tenantId}__${resourceId}`, {
    tenantId,
    type,
    url: url ?? null,
    body: body ?? null,
    addedByPersonId,
    status: "active",
  }, uid);
  return resourceId;
}

export async function getResource(db, tenantId, resourceId) {
  const snap = await getDoc(doc(db, TENANT.RESOURCES, `${tenantId}__${resourceId}`));
  return snap.exists() ? { id: resourceId, ...snap.data() } : null;
}

/**
 * No tenant-wide list query (same list-safety limitation records.js's
 * getPersonRoles() already documents) -- callers already have the small
 * resourceIds[] array straight off the subject doc, so this is just N
 * deterministic get()s.
 */
export async function getResourcesByIds(db, tenantId, resourceIds) {
  const snaps = await Promise.all(
    (resourceIds ?? []).map((id) => getDoc(doc(db, TENANT.RESOURCES, `${tenantId}__${id}`)))
  );
  return snaps.filter((s) => s.exists()).map((s) => ({ id: s.id.replace(`${tenantId}__`, ""), ...s.data() }));
}

/**
 * Phase 11 -- every resource in the tenant, for a real browse/create screen.
 * The earlier "no tenant-wide list query" note above was never a rules
 * restriction (resources' read rule is the same anyMemberOf(tenantId) shape
 * ladders/domains/courseOffers already list against fine) -- it just wasn't
 * needed yet when this file only ever fetched resources a subject already
 * named. curriculum.html needs a real list to attach existing resources to
 * a unit instead of only creating new ones.
 */
export async function listResources(db, tenantId) {
  const q = query(collection(db, TENANT.RESOURCES), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
}

/** I4/D6: archive, never delete. */
export async function setResourceStatus(db, tenantId, resourceId, status) {
  return updateDocument(db, TENANT.RESOURCES, `${tenantId}__${resourceId}`, { status });
}
