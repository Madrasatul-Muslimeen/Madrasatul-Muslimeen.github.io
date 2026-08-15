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
import { getAppLang } from "./prefs.js";

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
  let snap;
  try {
    const q = query(collection(db, TENANT.TENANT_MEMBER_UIDS), where("uid", "==", uid));
    snap = await getDocs(q);
  } catch (err) {
    err.stepName = "query tenantMemberUids by uid";
    throw err;
  }
  const memberships = snap.docs.map((d) => d.data()); // { tenantId, uid, personId, roles }

  return Promise.all(
    memberships.map(async (m) => {
      let tenantSnap;
      try {
        tenantSnap = await getDoc(doc(db, TENANT.TENANTS, m.tenantId));
      } catch (err) {
        err.stepName = `read tenants/${m.tenantId}`;
        throw err;
      }
      return {
        tenantId: m.tenantId,
        personId: m.personId,
        roles: m.roles,
        tenantName: tenantSnap.exists() ? langText(tenantSnap.data().name, getAppLang(), m.tenantId) : m.tenantId,
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
 * Round 11 (8 Aug 2026) — "View as" wired up for real (previously stored a
 * preference nothing ever read). Collapses to JUST the previewed role when
 * one is active, per the file header's own rule: "View as only ever narrows
 * what a screen displays, on top of permissions the viewer already,
 * genuinely has" — never a union with the real roles. Falls back to the
 * real roles unchanged when no preview is active, so normal (non-preview)
 * behaviour for every role, real or not, is untouched by this round.
 */
export function effectiveRoles(realRoles, viewAsRole) {
  return viewAsRole ? [viewAsRole] : realRoles;
}

/**
 * Which roster entries someone holding `effRoles` (already collapsed via
 * effectiveRoles() above) should see, scoped to their own personId --
 * Architecture s6's role table: student "cannot see others", guardian
 * "for their own children only". owner/prime see everyone here, no
 * scoping needed. teacher LOOKS unscoped in this function ("return roster
 * unchanged"), but as of Phase 10 that's fine: the `roster` this function
 * receives was already fetched via a Firestore query against
 * tenantPeople, and firestore.rules' own per-student teacher scoping
 * (isCoEnrolledTeacherOf(), replacing the old blanket isTeacherIn(tenantId)
 * read) means Firestore itself silently drops any tenantPeople doc a
 * teacher isn't actually enrolled to teach from that query's results
 * before this function ever sees them -- the real scoping already
 * happened server-side, so passing the (already-filtered) list through
 * unchanged is correct, not a gap. Homework/assignments is the one
 * surface still tenant-wide for teachers (see isAssignmentCreator's own
 * comment in firestore.rules for why).
 */
export function scopedRoster(roster, effRoles, myPersonId) {
  if (effRoles.includes("owner") || effRoles.includes("prime") || effRoles.includes("teacher")) return roster;
  if (effRoles.includes("guardian")) return roster.filter((p) => p.id === myPersonId || p.managedByPersonId === myPersonId);
  return roster.filter((p) => p.id === myPersonId); // student / self
}

/**
 * Picks a starting context out of memberships ALREADY loaded -- no reads of
 * its own. Split out of initializeActiveContext() by the load-speed round so
 * the same choice can be made without paying for a second membership load.
 */
function pickContext(memberships, defaultTenantId) {
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

/**
 * Picks a sensible starting context: whatever's already stored in this
 * tab's session if it's still valid, otherwise the user's userIndex
 * default tenant if they belong to it, otherwise their first membership.
 * Returns null if the user belongs to no tenant at all.
 *
 * Kept exported and unchanged in behaviour. Every page's own bootstrap now
 * calls bootstrapContext() below instead -- see its comment for why.
 */
export async function initializeActiveContext(db, uid, defaultTenantId) {
  return pickContext(await getMyMemberships(db, uid), defaultTenantId);
}

/**
 * LOAD SPEED (Aug 2026) -- the same work as initializeActiveContext(), but it
 * also HANDS BACK the memberships it loaded.
 *
 * Every page used to do this:
 *
 *   const context = await initializeActiveContext(...);   // loads memberships
 *   myMemberships = await getMyMemberships(db, uid);      // loads them AGAIN
 *
 * -- two identical trips to Firestore on every page load of every page, one
 * after the other, because initializeActiveContext() threw away the list it
 * had just fetched. Measured at 2 of the 14 sequential round trips a module
 * page made before showing anything. Nothing about WHAT is fetched changes;
 * the second fetch is simply no longer made.
 */
export async function bootstrapContext(db, uid, defaultTenantId) {
  const memberships = await getMyMemberships(db, uid);
  return { context: pickContext(memberships, defaultTenantId), memberships };
}
