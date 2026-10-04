// Siyagah round 14 (issue #566, decision 66) -- NOTE FLAGS AND LINKS READINESS
//
// WHY THIS FILE EXISTS. Round 14 adds four optional booleans (`pinned`,
// `favourite`, `archived`, `finalised`) to the ALREADY-DEPLOYED `notes`
// collection and a NEW `noteLinks` collection. Deploying those Rules is an
// Owner Control Gate (CLAUDE.md); the candidate is
// docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules and is
// NOT published. So every control built against it shows but writes nothing
// until this gate reads true.
//
// This copies siyagah-sections-readiness.js's shape EXACTLY:
//
// (1) IT DEFAULTS TO FALSE -- as a literal, with the burden of proof entirely
//     on enablement.
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. A rules FILE is not a
//     fact about the LIVE project. This module reads no file, fetches nothing
//     and imports nothing at all; the inability is the enforcement.
// (3) FLIPPING `ready` ALONE DOES NOTHING: isSiyagahFlagsReady() also needs
//     a well-formed `decision` (a closed authority, a real date, a reference).
//
// ENABLEMENT IS THE ARCHITECT'S, AFTER THE OWNER PUBLISHES. A builder round
// never flips it. This module is PURE and imports nothing. Do not give it an
// import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const SIYAGAH_FLAGS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * NOT READY. The round 14 Rules candidate is unpublished.
 */
export const SIYAGAH_FLAGS_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "Pin, Favourite, Archive, Finalise (flags on notes) and links between Notes " +
    "(noteLinks) wait for the round 14 Rules to be published.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Are the Note flag and link writers ready? True ONLY for an explicit
 * governed decision; every other shape returns false. Never "probably".
 */
export function isSiyagahFlagsReady(declaration = SIYAGAH_FLAGS_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!SIYAGAH_FLAGS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why the controls are unavailable, as a STABLE KEY (the caller knows the language -- I11). Null when ready. */
export const REASON_SIYAGAH_FLAGS_NOT_DEPLOYED = "siyagah-flags-rules-not-deployed";
export const REASON_SIYAGAH_FLAGS_DECISION_INCOMPLETE = "siyagah-flags-readiness-decision-incomplete";

export function siyagahFlagsUnavailableReason(declaration = SIYAGAH_FLAGS_DECLARATION) {
  if (isSiyagahFlagsReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_SIYAGAH_FLAGS_DECISION_INCOMPLETE;
  return REASON_SIYAGAH_FLAGS_NOT_DEPLOYED;
}
