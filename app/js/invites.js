// F-013 — Invites (Phase 1, Identity & access)
//
// Creates an invite plus a matching opaque link token, so the link sent to
// the invitee never carries their raw email address (see collections.js's
// note on inviteTokens). Quota is enforced here, client-side, as a soft
// check -- Firestore security rules cannot count documents, so this is a
// courtesy check, not a hard security boundary (see the Phase 1 plan).

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { commitEnvelopeBatch } from "./envelope.js";

/**
 * Creates a pending invite for tenantId/email/role, plus its link token.
 * Returns { token }. Throws an Error with .code = 'quota-exceeded' (caught
 * and shown in plain language by errors.js's safeWrite) if the tenant's
 * maxInvites limit has already been reached.
 */
export async function createInvite(db, { tenantId, email, role, uid }) {
  const emailLower = email.trim().toLowerCase();

  const tenantSnap = await getDoc(doc(db, TENANT.TENANTS, tenantId));
  const maxInvites = tenantSnap.exists() ? tenantSnap.data().maxInvites : 0;

  const countSnap = await getCountFromServer(
    query(collection(db, TENANT.TENANT_INVITES), where("tenantId", "==", tenantId))
  );
  if (countSnap.data().count >= maxInvites) {
    const err = new Error(`Invite quota reached (${maxInvites} allowed for this account).`);
    err.code = "quota-exceeded";
    throw err;
  }

  const token = crypto.randomUUID();

  const creates = [
    {
      collectionName: TENANT.TENANT_INVITES,
      docId: `${tenantId}__${emailLower}`,
      data: { tenantId, email: emailLower, role, status: "pending", consumedAt: null, consumedByUid: null },
    },
    {
      collectionName: TENANT.INVITE_TOKENS,
      docId: token,
      data: { tenantId, email: emailLower },
    },
  ];
  await commitEnvelopeBatch(db, { creates }, uid);

  return { token };
}

/** Every invite for a tenant. No orderBy -- order is not guaranteed. */
export async function listInvitesForTenant(db, tenantId) {
  const q = query(collection(db, TENANT.TENANT_INVITES), where("tenantId", "==", tenantId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
