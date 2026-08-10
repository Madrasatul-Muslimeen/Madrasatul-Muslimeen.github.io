// F-067 — Resources (Phase 6, Deen Study & topic renderer)
//
// resources/{tenantId}__{resourceId}   type link|text, url, body, addedByPersonId
// Architecture Layer 1 -- reserved in collections.js since Phase 0, unused
// until now. The Architecture doc only wires a resource to content via
// curriculumUnits (Phase 11) -- not built yet, and not needed to make a
// topic's own content real. subjects.resourceIds[] is a small additive
// field on the topic node itself instead, same "named field with no
// collection behind it yet" shape as D9/D12's own additions.

import { collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";

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
