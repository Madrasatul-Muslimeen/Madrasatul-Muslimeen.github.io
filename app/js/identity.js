// F-010 — Identity module (Phase 1, Identity & access)
//
// Builds the small set of documents a brand-new tenant needs to exist at
// all: the tenant itself, its owner's person record, the owner's
// membership row(s), and the rules-support mirror (tenantMemberUids) that
// lets security rules recognize the owner. All landed in one atomic batch
// via envelope.js's commitEnvelopeBatch (F-009) — either the whole tenant
// comes into existence, or none of it does.

import {
  doc,
  collection,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { commitEnvelopeBatch, createDocument, updateDocument } from "./envelope.js";
import { toLangObject } from "./lang.js";

const PERSON_ID_ATTEMPTS = 5;

/** A random 7-digit personId (D3 — new people only; legacy IDs are untouched and never generated here). */
export function generatePersonId() {
  const min = 1000000;
  const max = 9999999;
  return String(min + Math.floor(Math.random() * (max - min + 1)));
}

/** Defensive-only: confirms a candidate id can never collide in shape with any of the four legacy personId formats (all start with a letter; this is always purely numeric). */
export function personIdLooksLegacy(id) {
  return (
    /^p[1-4]$/.test(id) ||
    /^p\d{13}$/.test(id) ||
    /^person_[A-Za-z0-9]{8}$/.test(id) ||
    id === "person_admin1"
  );
}

async function findUnusedPersonId(db) {
  for (let attempt = 0; attempt < PERSON_ID_ATTEMPTS; attempt++) {
    const candidate = generatePersonId();
    const snap = await getDoc(doc(db, TENANT.TENANT_PEOPLE, candidate));
    if (!snap.exists()) return candidate;
  }
  throw new Error(`Could not find an unused personId after ${PERSON_ID_ATTEMPTS} attempts.`);
}

/**
 * Creates a brand-new tenant with its creator as owner. For an
 * 'individual' tenant, the creator is also granted the 'self' role
 * (they're both the account owner and the one studying) — family and
 * tuition_provider tenants grant owner only, since the owner there isn't
 * necessarily a learner.
 *
 * Returns { tenantId, personId }.
 */
export async function createTenantWithOwner(db, { tenantType, name, uid, weekStartsOn, maxInvites, legacyTeacherId }) {
  const tenantId = doc(collection(db, TENANT.TENANTS)).id;
  const personId = await findUnusedPersonId(db);
  const roles = tenantType === "individual" ? ["owner", "self"] : ["owner"];

  const creates = [
    {
      collectionName: TENANT.TENANTS,
      docId: tenantId,
      data: {
        tenantType,
        name: toLangObject(name, "en"),
        createdByUid: uid,
        maxInvites,
        weekStartsOn,
        legacyTeacherId: legacyTeacherId ?? null,
      },
    },
    {
      collectionName: TENANT.TENANT_PEOPLE,
      docId: personId,
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
    ...roles.map((role) => ({
      collectionName: TENANT.MEMBERSHIPS,
      docId: `${tenantId}__${personId}__${role}`,
      data: { tenantId, personId, role, guardianOf: [], status: "active", meta: {} },
    })),
    {
      collectionName: TENANT.TENANT_MEMBER_UIDS,
      docId: `${tenantId}__${uid}`,
      data: { tenantId, uid, personId, roles },
    },
  ];

  await commitEnvelopeBatch(db, { creates }, uid);
  return { tenantId, personId };
}

/**
 * Best-effort read-modify-write of userIndex/{uid}. userIndex is "derived
 * and rebuildable" (Architecture, Layer 0) -- it exists only to speed up
 * startup, so a failure here is not fatal to onboarding; a later self-check
 * or rebuild pass can repair it.
 *
 * Never accepts or forwards platformAdmin (I10) -- only tenantIds and
 * defaultTenantId are ever written by this function, no matter what a
 * caller's patch object contains.
 */
export async function upsertUserIndex(db, uid, { addTenantId, makeDefault } = {}) {
  const ref = doc(db, TENANT.USER_INDEX, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await createDocument(
      db,
      TENANT.USER_INDEX,
      uid,
      {
        tenantIds: addTenantId ? [addTenantId] : [],
        defaultTenantId: makeDefault ? addTenantId ?? null : null,
        platformAdmin: false,
      },
      uid
    );
    return;
  }

  const existing = snap.data();
  const tenantIds = Array.isArray(existing.tenantIds) ? existing.tenantIds : [];
  const nextTenantIds =
    addTenantId && !tenantIds.includes(addTenantId) ? [...tenantIds, addTenantId] : tenantIds;
  const nextDefault = existing.defaultTenantId ?? (makeDefault ? addTenantId ?? null : null);

  await updateDocument(db, TENANT.USER_INDEX, uid, {
    tenantIds: nextTenantIds,
    defaultTenantId: nextDefault,
  });
}
