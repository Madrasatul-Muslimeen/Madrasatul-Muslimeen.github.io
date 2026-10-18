// Zab round Z2 (PCF J25, issue #823) -- ZAB READINESS
//
// WHY THIS FILE EXISTS. The Zab bar (zab-bar.js) reads and writes the
// `zabPockets` and `zabItems` collections. The Rules that allow that are a
// CANDIDATE only (docs/governance/2026-10-14-zab-candidate.rules) and are NOT
// published; publishing is the Owner's gate. A dead bar on every page would be
// clutter, so while this gate is shut NOTHING of Zab appears on any page and
// nothing reads or writes Firestore.
//
// This copies siyagah-flags-readiness.js's shape EXACTLY:
//
// (1) IT DEFAULTS TO FALSE -- as a literal, with the burden of proof entirely
//     on enablement.
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. A rules FILE is not a
//     fact about the LIVE project. This module reads no file, fetches nothing
//     and imports nothing at all; the inability is the enforcement.
// (3) FLIPPING `ready` ALONE DOES NOTHING: isZabReady() also needs a
//     well-formed `decision` (a closed authority, a real date, a reference).
//
// ENABLEMENT IS THE ARCHITECT'S, AFTER THE OWNER PUBLISHES. A builder round
// never flips it. This module is PURE and imports nothing. Do not give it an
// import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const ZAB_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * ENABLED 2026-10-15. The Owner published
 * docs/governance/2026-10-14-zab-candidate.rules to study-monitoring (PCF J25:
 * "Published") and confirmed in the MMSA chat: "Yes, switch Zab on".
 * firestore.rules was synced to that exact file in the same change. The record
 * is the reference below.
 */
export const ZAB_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-10-15",
    reference: "docs/reports/2026-10-15-zab-enabled.md",
  }),
  gate: "E1",
  note:
    "The Zab bar and pockets (zabPockets, zabItems) are authorised by the published Zab Rules.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is Zab ready to appear and to read and write? True ONLY for an explicit
 * governed decision; every other shape returns false. Never "probably".
 */
export function isZabReady(declaration = ZAB_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!ZAB_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why Zab is unavailable, as a STABLE KEY (the caller knows the language -- I11). Null when ready. */
export const REASON_ZAB_NOT_DEPLOYED = "zab-rules-not-deployed";
export const REASON_ZAB_DECISION_INCOMPLETE = "zab-readiness-decision-incomplete";

export function zabUnavailableReason(declaration = ZAB_DECLARATION) {
  if (isZabReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_ZAB_DECISION_INCOMPLETE;
  return REASON_ZAB_NOT_DEPLOYED;
}
