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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { commitEnvelopeBatch } from "./envelope.js";
import { generatePersonId } from "./identity.js";
import { toLangObject } from "./lang.js";

const PERSON_ID_ATTEMPTS = 5;

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

/**
 * Resolves an invite link's opaque token back to the real, still-pending
 * invite. Returns null if the token doesn't exist, the invite it points to
 * is gone, or it's already been consumed -- callers should treat null as
 * "this link doesn't work anymore," not a technical error.
 */
export async function resolveInviteToken(db, token) {
  const tokenSnap = await getDoc(doc(db, TENANT.INVITE_TOKENS, token));
  if (!tokenSnap.exists()) return null;
  const { tenantId, email } = tokenSnap.data();

  const inviteSnap = await getDoc(doc(db, TENANT.TENANT_INVITES, `${tenantId}__${email}`));
  if (!inviteSnap.exists() || inviteSnap.data().status !== "pending") return null;

  const tenantSnap = await getDoc(doc(db, TENANT.TENANTS, tenantId));
  return {
    tenantId,
    email,
    role: inviteSnap.data().role,
    tenantName: tenantSnap.exists() ? tenantSnap.data().name : null,
  };
}

/**
 * Accepts an invite: creates the invitee's own tenantPeople record (step
 * one), then, once that's confirmed, their membership row, their
 * tenantMemberUids entry, and marks the invite consumed (step two) -- same
 * two-commit reasoning as identity.js's createTenantWithOwner, since the
 * membership/tenantMemberUids rules need to read the just-created person
 * record back with get().
 *
 * uid and its email MUST match the invite being accepted -- callers should
 * check auth.currentUser.email against the resolved invite's email BEFORE
 * calling this, so a mismatch gets a clear message instead of a bare
 * permission error.
 *
 * Returns { tenantId, personId, role }.
 */
export async function acceptInvite(db, { token, uid, name }) {
  const resolved = await resolveInviteToken(db, token);
  if (!resolved) {
    throw new Error("This invite link is no longer valid -- it may have already been used.");
  }
  const { tenantId, email, role } = resolved;

  let personId;
  let lastError;
  for (let attempt = 0; attempt < PERSON_ID_ATTEMPTS; attempt++) {
    const candidate = generatePersonId();
    try {
      await commitEnvelopeBatch(
        db,
        {
          creates: [
            {
              collectionName: TENANT.TENANT_PEOPLE,
              docId: candidate,
              data: {
                tenantId,
                name: toLangObject(name, "en"),
                emoji: null,
                color: null,
                authUid: uid,
                isMinor: false,
                managedByPersonId: null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
                status: "active",
                legacy: { teacherId: null, ownerUid: null },
              },
            },
          ],
        },
        uid
      );
      personId = candidate;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!personId) throw lastError;

  await commitEnvelopeBatch(
    db,
    {
      creates: [
        {
          collectionName: TENANT.MEMBERSHIPS,
          docId: `${tenantId}__${personId}__${role}`,
          data: { tenantId, personId, role, guardianOf: [], status: "active", meta: {} },
        },
        {
          collectionName: TENANT.TENANT_MEMBER_UIDS,
          docId: `${tenantId}__${uid}`,
          data: { tenantId, uid, personId, roles: [role] },
        },
      ],
      updates: [
        {
          collectionName: TENANT.TENANT_INVITES,
          docId: `${tenantId}__${email}`,
          data: { status: "consumed", consumedAt: serverTimestamp(), consumedByUid: uid },
        },
      ],
    },
    uid
  );

  return { tenantId, personId, role };
}
