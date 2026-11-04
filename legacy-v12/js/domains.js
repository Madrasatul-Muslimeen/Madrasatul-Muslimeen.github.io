// F-034 — Domain tags (Phase 3, Tracking core)
//
// D12: domains/{tenantId}__{domainId} backs records.entries.domainIds[] --
// a field the Architecture doc names but never defines a collection for.
// Same shape as ladders/levels in catalogue.js: tenant-authored, no
// platform-seeded content, freeform (the legacy app: "Domains are optional
// & user-defined -- start empty"). Kept as its own small file rather than
// folded into catalogue.js because domains are a Layer 2 (tracking) concept
// attached to record entries, not a Layer 1 catalogue node.

import { collection, query, where, getDocs, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

export async function createDomain(db, tenantId, name, uid) {
  const domainId = doc(collection(db, TENANT.DOMAINS)).id;
  await createDocument(db, TENANT.DOMAINS, `${tenantId}__${domainId}`, {
    tenantId,
    name: { en: name },
    status: "active",
  }, uid);
  return domainId;
}

export async function listDomains(db, tenantId) {
  const q = query(collection(db, TENANT.DOMAINS), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id.replace(`${tenantId}__`, ""), ...d.data() }));
}

/** I4/D6: archive, never delete. */
export async function setDomainStatus(db, tenantId, domainId, status) {
  return updateDocument(db, TENANT.DOMAINS, `${tenantId}__${domainId}`, { status });
}
