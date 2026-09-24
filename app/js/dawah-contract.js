// MAP v4 Phase 7 (P7-A) — ADR-011 Dawah printable pages, as PURE policy.
//
// No Firebase, no DOM, no mutable state, no I/O, and — same enforcement-by-
// inability pattern as journey-map-contract.js — NO IMPORTS AT ALL. This
// module decides what a Dawah page's lifecycle MEANS; `dawah-data.js` is the
// only thing that persists it, and `dawahPages` stays unruled and unactivated
// until a separately authorised task deploys its Rules.
//
// ADR-005 (accepted, pre-existing): a Dawah piece is DERIVED OUTPUT and must
// never overwrite its source Note. This module holds no concept of a Note's
// own identity or content at all — it knows only a page's own status — which
// is what makes "this module cannot rewrite a Note" true by inability rather
// than by care.
//
// THE OWNER'S FOUR DECISIONS THIS MODULE MAKES ENFORCEABLE (24 Sep 2026):
//   1. Visibility is tenant-only — enforced in dawah-data.js and the Rules
//      candidate, not here; this module has no concept of "who can see".
//   2. A Dawah piece is a printable page made from a Note — enforced by
//      dawah-data.js taking a frozen copy from a pinned Note revision.
//   3. A child's piece needs a guardian's or teacher's approval; an adult's
//      does not — `dawahNeedsApproval()` and `isValidDawahApprover()` below.
//   4. ADR-005 — see above.

/** The closed status vocabulary. Every Dawah page is in exactly one of these. */
export const DAWAH_STATUS = Object.freeze({
  DRAFT: "draft",
  AWAITING_APPROVAL: "awaiting-approval",
  SHARED: "shared",
  RETIRED: "retired",
});

export const DAWAH_PAGE_STATUSES = Object.freeze(Object.values(DAWAH_STATUS));

/** The closed set of actions a caller may request. */
export const DAWAH_ACTIONS = Object.freeze(["submit", "approve", "return", "share", "retire"]);

// Every NAMED move except retire. `retire` is expressed separately below as
// "any non-retired status -> retired" (I4: archive, never delete) rather than
// one entry per status here, so a future status added to DAWAH_STATUS
// inherits retirability automatically instead of needing its own line.
const NAMED_TRANSITIONS = Object.freeze({
  // A child's own action: ask for approval before this piece may be shared.
  submit: Object.freeze({ from: DAWAH_STATUS.DRAFT, to: DAWAH_STATUS.AWAITING_APPROVAL }),
  // The approver's action: this piece may now be seen tenant-wide.
  approve: Object.freeze({ from: DAWAH_STATUS.AWAITING_APPROVAL, to: DAWAH_STATUS.SHARED }),
  // The approver's action: not yet — back to draft, with a reason.
  return: Object.freeze({ from: DAWAH_STATUS.AWAITING_APPROVAL, to: DAWAH_STATUS.DRAFT }),
  // An adult's own action, ONLY reachable when approval is not needed
  // (dawah-data.js checks canShareDirectly() before calling this transition —
  // this module has no concept of "who the author is", so it cannot check
  // that itself; it only names the move as one that exists).
  share: Object.freeze({ from: DAWAH_STATUS.DRAFT, to: DAWAH_STATUS.SHARED }),
});

/**
 * The status a Dawah page moves to for `action` from `fromStatus`, or `null`
 * when that move is not allowed from there. Never throws on a disallowed
 * move — a refusal here is an ordinary, expected outcome (a double-submit, a
 * page already shared), not a programming error — so the caller decides how
 * to report it, exactly as `folderTreeRefusal()` returns a reason rather than
 * throwing one.
 */
export function dawahTransition(action, fromStatus) {
  if (!DAWAH_PAGE_STATUSES.includes(fromStatus)) return null;
  if (action === "retire") {
    // I4: nothing is ever deleted, so retiring an already-retired page is
    // refused as a no-op rather than silently succeeding twice.
    return fromStatus === DAWAH_STATUS.RETIRED ? null : DAWAH_STATUS.RETIRED;
  }
  const rule = NAMED_TRANSITIONS[action];
  if (!rule) return null;
  return rule.from === fromStatus ? rule.to : null;
}

/**
 * ADR-011 §3 — the needs-approval rule. `authorIsMinor` is a fact the caller
 * reads off `tenantPeople.isMinor` (this module imports nothing and cannot
 * read it itself); this function only says what that fact MEANS.
 */
export function dawahNeedsApproval({ authorIsMinor } = {}) {
  if (typeof authorIsMinor !== "boolean") {
    throw new TypeError("dawah-contract: authorIsMinor must be a boolean.");
  }
  return authorIsMinor === true;
}

/** The adult path's own gate: share() may be called directly only when approval is not needed. */
export function canShareDirectly({ authorIsMinor } = {}) {
  return !dawahNeedsApproval({ authorIsMinor });
}

/**
 * ADR-011 §3 — the approver rule. `approverPersonId` may approve or return a
 * page authored by `authorPersonId` when they are the minor's own
 * `managedByPersonId` guardian, a co-enrolled teacher, or hold owner/prime in
 * the tenant. A CHILD CAN NEVER APPROVE THEIR OWN PAGE — checked first,
 * unconditionally, so no later clause (a child who happens to also hold a
 * role) can reopen it.
 *
 * Every fact this function needs is supplied by the caller as a plain
 * boolean or id — this module cannot read `tenantPeople`, `memberships` or
 * `teacherStudentLinks` itself; it only judges the facts it is handed,
 * exactly as `folderTreeRefusal()` judges a supplied folder map.
 */
export function isValidDawahApprover({
  authorPersonId,
  approverPersonId,
  managingGuardianPersonId = null,
  isCoEnrolledTeacher = false,
  isOwnerOrPrime = false,
} = {}) {
  for (const [name, value] of [["authorPersonId", authorPersonId], ["approverPersonId", approverPersonId]]) {
    if (typeof value !== "string" || !value.trim()) {
      throw new TypeError(`dawah-contract: ${name} must be a non-empty string.`);
    }
  }
  if (approverPersonId === authorPersonId) return false;
  if (managingGuardianPersonId != null && approverPersonId === managingGuardianPersonId) return true;
  if (isCoEnrolledTeacher === true) return true;
  if (isOwnerOrPrime === true) return true;
  return false;
}
