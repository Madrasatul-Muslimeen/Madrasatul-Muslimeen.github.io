// F-012 — Owner adds people (Phase 1, Identity & access)
//
// Unlike Stage 3's tenant bootstrap, this doesn't need a two-step commit:
// the caller (owner/prime/platformAdmin) already has a real, previously
// committed tenantMemberUids row, so canAdminIdentity() in the security
// rules can see it immediately -- no same-batch visibility problem.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { commitEnvelopeBatch } from "./envelope.js";
import { generatePersonId } from "./identity.js";
import { toLangObject } from "./lang.js";

const PERSON_ID_ATTEMPTS = 5;

// Fix round (25 Aug 2026) -- editing an existing person. Roles offered here
// deliberately match Add-person's own checkbox list exactly ("owner" is
// never offered by either form -- D14's own careful, one-time, non-
// self-serve treatment of that role is untouched by this round).
const EDITABLE_ROLES = ["teacher", "student", "guardian", "prime"];
// Every role a person could hold, editable or not (mirrors records.js's own
// private MEMBERSHIP_ROLES) -- used for DISPLAYING a person's full role
// list, where owner/self matter too, not just for what Edit can change.
const ALL_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];

/**
 * Fix round (25 Aug 2026) -- a real, pre-existing defect found while
 * building the edit feature below: tenantPeople documents have never
 * carried a `roles` field (only `memberships` and the tenantMemberUids
 * mirror do), so people.html's own roster table has been calling
 * roleListLabel(person.roles) against `undefined` since the page was
 * built -- the Roles column has always rendered empty. Fixed here rather
 * than left alongside it, since the Edit form needs each person's real
 * current roles anyway to know which checkboxes to show ticked.
 *
 * One get() per possible role per person (deterministic ids, no
 * where(...) list query against memberships -- see updatePersonInTenant's
 * own comment for why), all fired together. Returns Map(personId ->
 * string[] of that person's currently ACTIVE roles).
 */
export async function getRosterRoles(db, tenantId, personIds) {
  const perPerson = await Promise.all(
    personIds.map((personId) =>
      Promise.all(ALL_ROLES.map((role) => getDoc(doc(db, TENANT.MEMBERSHIPS, `${tenantId}__${personId}__${role}`))))
    )
  );
  const map = new Map();
  personIds.forEach((personId, i) => {
    map.set(
      personId,
      ALL_ROLES.filter((_, j) => perPerson[i][j].exists() && perPerson[i][j].data().status !== "archived")
    );
  });
  return map;
}

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

/**
 * Fix round (25 Aug 2026) -- edits an existing person's own details (name,
 * whether they're a managed child, who manages them) and reconciles their
 * roles against `roles` (the full set they should hold afterwards).
 *
 * D6/I4: nothing is ever deleted here. A role that's unchecked has its
 * membership row set to status "archived", the same shape every other
 * archive/restore action in this codebase already uses -- it is never
 * removed. Re-checking a previously-unchecked role later reactivates that
 * SAME document (the membership id is deterministic:
 * `${tenantId}__${personId}__${role}`), never creates a duplicate.
 *
 * Reads each of the four editable roles' own membership doc directly --
 * one get() per possible role, the same deterministic-id pattern
 * records.js's own getPersonRoles() uses -- rather than a
 * where(personId==) list query. See that function's own comment for why a
 * list query against memberships is deliberately avoided.
 */
export async function updatePersonInTenant(db, { tenantId, uid, personId, name, isMinor, managedByPersonId, roles }) {
  const existing = await Promise.all(
    EDITABLE_ROLES.map((role) => getDoc(doc(db, TENANT.MEMBERSHIPS, `${tenantId}__${personId}__${role}`)))
  );

  const creates = [];
  const updates = [
    {
      collectionName: TENANT.TENANT_PEOPLE,
      docId: personId,
      data: {
        name: toLangObject(name, "en"),
        isMinor,
        managedByPersonId: isMinor ? (managedByPersonId ?? null) : null,
      },
    },
  ];

  EDITABLE_ROLES.forEach((role, i) => {
    const snap = existing[i];
    const wanted = roles.includes(role);
    if (!snap.exists()) {
      if (wanted) {
        creates.push({
          collectionName: TENANT.MEMBERSHIPS,
          docId: `${tenantId}__${personId}__${role}`,
          data: { tenantId, personId, role, guardianOf: [], status: "active", meta: {} },
        });
      }
      return;
    }
    const isActive = snap.data().status !== "archived";
    if (wanted !== isActive) {
      updates.push({
        collectionName: TENANT.MEMBERSHIPS,
        docId: `${tenantId}__${personId}__${role}`,
        data: { status: wanted ? "active" : "archived" },
      });
    }
  });

  await commitEnvelopeBatch(db, { creates, updates }, uid);
}

/**
 * Archive or restore a person. D6/I4: "delete" is never a hard delete
 * anywhere in this codebase -- this flips tenantPeople.status the same way
 * catalogue.html's own subjects/Approaches/ladders already do, and every
 * roster/person-picker that reads status now hides an archived person by
 * default (fix round, 25 Aug 2026). Their own roles/memberships are left
 * exactly as they were -- restoring un-archives the person, not each role
 * independently, so nothing about who they used to be is lost (I4).
 */
export async function setPersonStatus(db, { tenantId, personId, status, uid }) {
  await commitEnvelopeBatch(
    db,
    { updates: [{ collectionName: TENANT.TENANT_PEOPLE, docId: personId, data: { status } }] },
    uid
  );
}
