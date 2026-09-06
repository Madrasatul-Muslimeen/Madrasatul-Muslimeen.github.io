// F-015 — Tenant/role switcher + View as (Phase 1, Identity & access)
//
// Tracks which tenant, role and roster person a signed-in user is
// currently acting as, for people who belong to more than one tenant or
// hold more than one role.
//
// Fix round (25 Aug 2026): moved from sessionStorage to localStorage, on
// the owner's own explicit ask -- Tenant/View as/Person selections must
// "take effect everywhere and remain constant" until manually changed,
// which a per-tab store can never do (a new tab, or the same tab
// reopened, used to start over). This file's own header used to justify
// sessionStorage by pointing at Stage 8's handover lock (F-016,
// study-lock.js) -- checked directly before making this change: the lock
// is a SEPARATE, independently sessionStorage-backed key
// ("qr.studyLock"), engaged only by the explicit "hand this device to a
// child" action on people.html, never by ordinary tenant/role/person
// selection. The two have never shared code or state; only the comment
// implied a dependency. Moving this file to localStorage does not touch
// study-lock.js at all, so D10's own handover-lock behaviour (still
// tab-scoped, still only for an explicit "start studying" action) is
// unaffected.
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

/** { tenantId, personId, roles, viewAsRole, selectedPersonId } or null if nothing is active yet. */
export function getActiveContext() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveContext(context) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Private browsing / storage blocked -- same tolerant shape prefs.js
    // already uses for its own localStorage writes. The choice simply
    // doesn't stick for this load; nothing else depends on it succeeding.
  }
}

export function clearActiveContext() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // see setActiveContext()
  }
}

/**
 * Fix round (25 Aug 2026) -- which roster person (student/child) a picker
 * should show selected, persisted the same way tenant/role already are.
 * Distinct from `context.personId` (the SIGNED-IN user's own person record
 * in this tenant, used for "myPersonId" checks) -- this is whichever
 * roster entry was last chosen in a Person/Student picker, which used to
 * live only in each page's own in-memory variable and reset to the first
 * roster row on every navigation or reload. Falls back to null (caller's
 * own default, usually the first visible roster row) when nothing is
 * stored yet, or when the active context itself hasn't been set up.
 */
export function getSelectedPersonId() {
  return getActiveContext()?.selectedPersonId ?? null;
}

/** Stores the choice above. A no-op if no active context exists yet (nothing to attach it to). */
export function setSelectedPersonId(personId) {
  const ctx = getActiveContext();
  if (!ctx) return;
  setActiveContext({ ...ctx, selectedPersonId: personId ?? null });
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
