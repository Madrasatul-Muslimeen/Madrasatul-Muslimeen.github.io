// MAP v4 Phase 7 (P7-B, issue #250) -- DAWAH PAGES PERSISTENCE READINESS.
//
// WHY THIS FILE EXISTS.
//
// ADR-011 (P7-A) built dawah-contract.js and dawah-data.js against a Rules
// CANDIDATE (docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules)
// that has passed 65 emulator assertions and is NOT deployed. Deploying
// Firestore Rules is an Owner Control Gate, exactly like every other
// Firestore change in this project (CLAUDE.md's own standing rule). This
// module is the gate that stops the new Dawah screens (app/dawah.html,
// app/notes.html's "Make a printable page" entry point) ever attempting to
// read or write the undeployed dawahPages collection -- copying app/js/
// study-evidence-readiness.js's shape EXACTLY, because that module already
// solved this exact problem for a different collection (MAP Phase 4 Activity
// evidence) and the same two rules apply unchanged:
//
// (1) IT DEFAULTS TO FALSE. Not "false unless something looks right" --
//     false, as a literal, with the burden of proof entirely on enablement.
//
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. The repository's
//     copy of the rules is a FILE; readiness is a fact about a LIVE Firebase
//     project. So this module reads no file, fetches nothing, and imports
//     nothing at all. The inability is the enforcement: a module that
//     imports nothing cannot consult the rules text even by accident. A
//     boundary check (tools/i18n-verify/dawah-boundary.mjs) asserts that
//     absence.
//
// ENABLEMENT IS A GOVERNED DECISION, NOT AN EDIT. Flipping `ready` to true
// on its own does NOTHING: isDawahReady() requires a well-formed `decision`
// alongside it -- an authority from a closed set, a real date, and a
// reference to a record that says the deployment was performed and proven.
// A hurried one-word edit therefore cannot enable the feature.
//
// Every read and write on the new Dawah screens consults this gate FIRST and
// returns without ever calling Firestore while it is false -- not "attempt
// and swallow the error". A reader must never see a permission error from
// this feature: every action button is `aria-disabled="true"` (never
// `disabled` -- it must still be focusable and able to explain itself), and
// pressing one shows, in the reader's own language, why nothing happened.
//
// THE ARCHITECT FLIPS THIS GATE AFTER THE OWNER PUBLISHES THE RULES. A round
// building the screens does not.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const DAWAH_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * NOT YET ENABLED. The Rules candidate has passed its own emulator suite but
 * has not been published to the live `study-monitoring` Firebase project --
 * see docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules's
 * own "STATUS: CANDIDATE. NOT DEPLOYED." header. Flip this only once the
 * Owner has published it AND a governed decision naming an authority, a real
 * date and a reference to a record that proves it can be written here --
 * the same two-step shape v08.34/v08.42's own enablement rounds used.
 */
export const DAWAH_READINESS_DECLARATION = Object.freeze({
  // ENABLED 24 Sep 2026 by governed decision: the Owner published the Dawah
  // Rules ("Dawah rules are live") and firestore.rules is synced to them.
  // Switch off again by restoring ready:false / decision:null.
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-09-24",
    reference: "docs/reports/2026-09-24-dawah-pages-enabled.md",
  }),
  gate: "E1",
  note:
    "dawahPages' Rules candidate (docs/governance/" +
    "phase7-dawah-pages-rules-candidate-2026-09-24.rules) has passed 65 " +
    "emulator assertions and is NOT deployed. Every dawahPages read and " +
    "write is denied in production until the Owner publishes it and a " +
    "governed decision records that here.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Are the Dawah screens ready to read from and write to Firestore?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isDawahReady(declaration = DAWAH_READINESS_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!DAWAH_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why the Dawah screens are unavailable, as a STABLE KEY rather than a
 * sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when the gate IS open, so a
 * caller cannot accidentally print an unavailability reason for a working
 * feature.
 */
export const REASON_DAWAH_NOT_DEPLOYED = "dawah-rules-not-deployed";
export const REASON_DAWAH_DECISION_INCOMPLETE = "dawah-readiness-decision-incomplete";

export function dawahUnavailableReason(declaration = DAWAH_READINESS_DECLARATION) {
  if (isDawahReady(declaration)) return null;
  // `ready` asserted without a valid governed decision is a DIFFERENT fault
  // from the standing not-deployed state, and saying so is what stops a
  // half-made enablement being read as "still waiting for the Rules".
  if (declaration && declaration.ready === true) return REASON_DAWAH_DECISION_INCOMPLETE;
  return REASON_DAWAH_NOT_DEPLOYED;
}
