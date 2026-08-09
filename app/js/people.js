// F-012 — Owner adds people (Phase 1, Identity & access)
//
// Unlike Stage 3's tenant bootstrap, this doesn't need a two-step commit:
// the caller (owner/prime/platformAdmin) already has a real, previously
// committed tenantMemberUids row, so canAdminIdentity() in the security
// rules can see it immediately -- no same-batch visibility problem.

import { TENANT } from "./collections.js";
import { commitEnvelopeBatch } from "./envelope.js";
import { generatePersonId } from "./identity.js";
import { toLangObject } from "./lang.js";

const PERSON_ID_ATTEMPTS = 5;

/**
 * Adds a person directly to a tenant (not via invite). authUid is always
 * null here -- this person has no login of their own yet. If they later
 * accept an invite (F-014), that's what links a real Google account to
 * this same personId. roles is a non-empty array of role strings.
 *
 * Returns { personId }.
 */
export async function addPersonToTenant(db, { tenantId, uid, name, isMinor, managedByPersonId, roles, timezone }) {
  let lastError;
  for (let attempt = 0; attempt < PERSON_ID_ATTEMPTS; attempt++) {
    const personId = generatePersonId();
    try {
      const creates = [
        {
          collectionName: TENANT.TENANT_PEOPLE,
          docId: personId,
          data: {
            tenantId,
            name: toLangObject(name, "en"),
            emoji: null,
            color: null,
            authUid: null,
            isMinor,
            managedByPersonId: managedByPersonId ?? null,
            timezone: timezone ?? null,
            status: "active",
            legacy: { teacherId: null, ownerUid: null },
          },
        },
        ...roles.map((role) => ({
          collectionName: TENANT.MEMBERSHIPS,
          docId: `${tenantId}__${personId}__${role}`,
          data: { tenantId, personId, role, guardianOf: [], status: "active", meta: {} },
        })),
      ];
      await commitEnvelopeBatch(db, { creates }, uid);
      return { personId };
    } catch (err) {
      // Same collision-retry reasoning as identity.js's createTenantWithOwner.
      lastError = err;
    }
  }
  throw lastError;
}
