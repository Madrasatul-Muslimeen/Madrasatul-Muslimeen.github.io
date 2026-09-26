// Issue #320 -- BASIC ARABIC / ARABIC IN DEPTH WORD PROGRESS PERSISTENCE
// READINESS.
//
// WHY THIS FILE EXISTS.
//
// The Owner's decision (docs/governance/2026-09-26-owner-decisions.md, row 4):
// "Claiming for basic n Depth is per word. (Because It's in WbW)" -- the claim
// unit for Basic Arabic and Arabic in Depth is the same word OCCURRENCE WbW
// already uses. That settles the state model (app/js/quran-word-progress.js
// now implements all three levels) and the data layer (app/js/quran-word-
// progress-data.js stores basic/depth exactly as it stores wbw). Deploying
// the Rules candidate that admits the two levels
// (docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules) is an
// Owner Control Gate, exactly like every other Firestore change in this
// project (CLAUDE.md's own standing rule) -- this round proposes the
// candidate and builds against it, and does not deploy it.
//
// This module is the gate that stops the app ever attempting to read or write
// EITHER new level's own documents in quranWordProgress/quranWordApprovals,
// copying app/js/study-lemma-progress-readiness.js's shape EXACTLY, because
// that module already solved this exact problem for a different collection
// and the same two rules apply unchanged:
//
// (1) IT DEFAULTS TO FALSE. Not "false unless something looks right" --
//     false, as a literal, with the burden of proof entirely on enablement.
//
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. The repository's copy
//     of the rules is a FILE; readiness is a fact about a LIVE Firebase
//     project. So this module reads no file, fetches nothing, and imports
//     nothing at all. The inability is the enforcement: a module that imports
//     nothing cannot consult the rules text even by accident.
//
// ENABLEMENT IS A GOVERNED DECISION, NOT AN EDIT. Flipping `ready` to true on
// its own does NOTHING: isWordLevelsPersistenceReady() requires a well-formed
// `decision` alongside it -- an authority from a closed set, a real date, and
// a reference to a record that says the deployment was performed and proven.
//
// WHY WBW ITSELF IS NOT GATED HERE. `wbw` has been deployed and operational
// since MAP Phase 3 (13 Sep 2026) -- this gate exists only for the two NEW
// levels this issue adds. app/js/quran-word-progress-data.js consults this
// gate ONLY for `basic`/`depth`; a `wbw` claim or read is entirely unaffected
// by this module, exactly as it was before this issue.
//
// While this gate is closed:
//
//   - neither quranWordProgress nor quranWordApprovals is EVER read or
//     written at level `basic` or `depth`;
//   - the Word Card's Basic and Arabic in Depth tabs show no claim/confirm
//     controls at all -- the same "a control that would only ever error is
//     not offered" discipline v08.31 established for Activity evidence;
//   - the WbW tab, and everything else in the app, is unaffected.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const WORD_LEVELS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * NOT YET ENABLED. `ready: false` until the Owner publishes
 * docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules to
 * study-monitoring and the Master Architect records a governed decision here,
 * the same two-step shape every other Firestore change in this project uses.
 */
export const WORD_LEVELS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "Basic Arabic / Arabic in Depth word-occurrence progress (issue #320) is " +
    "built and gated. The Rules candidate that admits the two levels is at " +
    "docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules and has " +
    "not been published. wbw progress is unaffected by this gate.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is Basic Arabic / Arabic in Depth word-occurrence progress ready to be
 * written to and read from?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isWordLevelsPersistenceReady(declaration = WORD_LEVELS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!WORD_LEVELS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why Basic Arabic / Arabic in Depth progress is unavailable, as a STABLE KEY
 * rather than a sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when it IS ready, so a
 * caller cannot accidentally print an unavailability reason for a working
 * feature.
 */
export const REASON_WORD_LEVELS_NOT_DEPLOYED = "word-levels-rules-not-deployed";
export const REASON_WORD_LEVELS_DECISION_INCOMPLETE = "word-levels-readiness-decision-incomplete";

export function wordLevelsUnavailableReason(declaration = WORD_LEVELS_PERSISTENCE_DECLARATION) {
  if (isWordLevelsPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_WORD_LEVELS_DECISION_INCOMPLETE;
  return REASON_WORD_LEVELS_NOT_DEPLOYED;
}
