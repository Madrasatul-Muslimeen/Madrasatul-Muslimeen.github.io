// Issue #206 -- WBW WHOLE-QURAN/JUZ RUNNING-COUNTER PERSISTENCE READINESS
//
// WHY THIS FILE EXISTS.
//
// This round adds a new, additive Firestore collection (quranWordTotals) so
// the Explore wheel's gold ring and its Word-by-Word toggle can show a real
// running known/total figure instead of computing it live. Deploying that
// collection's Rules is an Owner Control Gate, exactly like every other
// Firestore change in this project (CLAUDE.md's own standing rule) -- this
// round proposes a Rules CANDIDATE and builds against it, and does not
// deploy it.
//
// This module is the gate that stops the app ever attempting to read or
// write that undeployed collection, copying app/js/study-evidence-
// readiness.js's shape EXACTLY, because that module already solved this
// exact problem for a different collection (MAP Phase 4 Activity evidence)
// and the same two rules apply unchanged:
//
// (1) IT DEFAULTS TO FALSE. Not "false unless something looks right" --
//     false, as a literal, with the burden of proof entirely on enablement.
//
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. The repository's
//     copy of the rules is a FILE; readiness is a fact about a LIVE Firebase
//     project. So this module reads no file, fetches nothing, and imports
//     nothing at all. The inability is the enforcement: a module that
//     imports nothing cannot consult the rules text even by accident. A
//     boundary check asserts that absence.
//
// ENABLEMENT IS A GOVERNED DECISION, NOT AN EDIT. Flipping `ready` to true
// on its own does NOTHING: isWbwTotalPersistenceReady() requires a
// well-formed `decision` alongside it -- an authority from a closed set, a
// real date, and a reference to a record that says the deployment was
// performed and proven. A hurried one-word edit therefore cannot enable the
// feature.
//
// Both the counter WRITE (quran-word-total-data.js's recordWordTotalDelta())
// and the counter READ (getWordTotals()) consult this gate FIRST and return
// without ever calling Firestore while it is false -- not "attempt and
// swallow the error". That is the exact defect class v08.31 fixed for
// Activity evidence (a control whose only possible outcome was an error);
// this collection has no UI control that can invite a press at all while
// this gate is closed, because the ring/toggle/caption simply do not render.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const WBW_TOTAL_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * ENABLED, 2026-09-24, under an explicit governed decision -- see
 * docs/reports/2026-09-24-wbw-total-counter-enabled.md. Both preconditions
 * are recorded: the Owner published quranWordTotals' Rules in the Firebase
 * Console on 2026-09-24 (ledger deployment.wbwTotalRulesDeployed = DONE),
 * and the Owner then instructed, in their own words, "Yes, switch it on",
 * so they can see and try it. That instruction REPLACES the earlier plan
 * of waiting for a "it works" confirmation first -- the feature cannot be
 * tried while it is invisible, which the Owner found by looking for it.
 * It can be switched off again by restoring ready:false/decision:null.
 */
export const WBW_TOTAL_PERSISTENCE_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-09-24",
    reference: "docs/reports/2026-09-24-wbw-total-counter-enabled.md",
  }),
  gate: "E1",
  note:
    "quranWordTotals Rules are deployed to study-monitoring (Owner-published " +
    "and confirmed 2026-09-24), and the Owner instructed the counter be " +
    "switched on the same day so they can try it.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is the whole-Qur'an/Juz counter ready to be written to and read from?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isWbwTotalPersistenceReady(declaration = WBW_TOTAL_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!WBW_TOTAL_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why the counter is unavailable, as a STABLE KEY rather than a sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when the counter IS ready,
 * so a caller cannot accidentally print an unavailability reason for a
 * working feature.
 */
export const REASON_WBW_TOTAL_NOT_DEPLOYED = "wbw-total-rules-not-deployed";
export const REASON_WBW_TOTAL_DECISION_INCOMPLETE = "wbw-total-readiness-decision-incomplete";

export function wbwTotalUnavailableReason(declaration = WBW_TOTAL_PERSISTENCE_DECLARATION) {
  if (isWbwTotalPersistenceReady(declaration)) return null;
  // `ready` asserted without a valid governed decision is a DIFFERENT fault
  // from the standing not-deployed state, and saying so is what stops a
  // half-made enablement being read as "still waiting on E1".
  if (declaration && declaration.ready === true) return REASON_WBW_TOTAL_DECISION_INCOMPLETE;
  return REASON_WBW_TOTAL_NOT_DEPLOYED;
}
