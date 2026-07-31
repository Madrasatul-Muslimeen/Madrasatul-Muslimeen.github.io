// F-015 — Tenant/role switcher + View as (Phase 1, Identity & access)
//
// Tracks which tenant and role a signed-in user is currently acting as,
// for people who belong to more than one tenant or hold more than one
// role. Backed by sessionStorage (not localStorage) so it clears itself
// when a browser tab closes -- this matters for Stage 8's handover lock,
// which relies on the same tab-scoped lifetime.
//
// "View as" is a pure client-side render-mode flag: it changes what the
// UI SHOWS, never what Firestore allows. The signed-in user's real,
// rules-granted permissions never change -- View as only ever narrows what
// a screen displays, on top of permissions the viewer already, genuinely
// has (owner/prime/platformAdmin previewing as teacher/student).

import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { langText } from "./lang.js";

const STORAGE_KEY = "qr.sessionContext";

/** { tenantId, personId, roles, viewAsRole } or null if nothing is active yet. */
export function getActiveContext() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveContext(context) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
}

export function clearActiveContext() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Every tenant this login belongs to, with the roles held in each and that tenant's display name. */
export async function getMyMemberships(db, uid) {
  const q = query(collection(db, TENANT.TENANT_MEMBER_UIDS), where("uid", "==", uid));
  const snap = await getDocs(q);
  const memberships = snap.docs.map((d) => d.data()); // { tenantId, uid, personId, roles }

  return Promise.all(
    memberships.map(async (m) => {
      const tenantSnap = await getDoc(doc(db, TENANT.TENANTS, m.tenantId));
      return {
        tenantId: m.tenantId,
        personId: m.personId,
        roles: m.roles,
        tenantName: tenantSnap.exists() ? langText(tenantSnap.data().name, "en", m.tenantId) : m.tenantId,
      };
    })
  );
}

/**
 * Roles that are allowed to preview the app as a lower-privileged role
 * within their own tenant (owner "configure everything", prime "confirm
 * anyone" -- both administer the tenant; platformAdmin spans every
 * tenant). Matches the owner-confirmed scope from planning.
 */
const CAN_VIEW_AS = new Set(["owner", "prime", "platformAdmin"]);

export function canUseViewAs(roles) {
  return roles.some((r) => CAN_VIEW_AS.has(r));
}

/**
 * Picks a sensible starting context: whatever's already stored in this
 * tab's session if it's still valid, otherwise the user's userIndex
 * default tenant if they belong to it, otherwise their first membership.
 * Returns null if the user belongs to no tenant at all.
 */
export async function initializeActiveContext(db, uid, defaultTenantId) {
  const memberships = await getMyMemberships(db, uid);
  if (memberships.length === 0) return null;

  const existing = getActiveContext();
  const stillValid = existing && memberships.some((m) => m.tenantId === existing.tenantId);
  if (stillValid) return existing;

  const preferred = memberships.find((m) => m.tenantId === defaultTenantId) ?? memberships[0];
  const context = {
    tenantId: preferred.tenantId,
    personId: preferred.personId,
    roles: preferred.roles,
    viewAsRole: null,
  };
  setActiveContext(context);
  return context;
}
