// Issue #303 -- LEMMA-LEVEL WORD PROGRESS PERSISTENCE READINESS.
//
// WHY THIS FILE EXISTS.
//
// Issue #301 built two new, additive Firestore collections (quranLemmaProgress,
// quranLemmaApprovals) plus, this round, a third (quranLemmaOccurrenceCounters --
// see quran-lemma-progress-data.js's own header for why). Deploying that Rules
// candidate (docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules,
// regenerated this round to add the counter collection) is an Owner Control
// Gate, exactly like every other Firestore change in this project (CLAUDE.md's
// own standing rule) -- this round proposes the candidate and builds against
// it, and does not deploy it.
//
// This module is the gate that stops the app ever attempting to read or write
// any of the three lemma collections, copying app/js/study-wbw-total-
// readiness.js's shape EXACTLY, because that module already solved this exact
// problem for a different collection and the same two rules apply unchanged:
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
// its own does NOTHING: isLemmaProgressPersistenceReady() requires a
// well-formed `decision` alongside it -- an authority from a closed set, a
// real date, and a reference to a record that says the deployment was
// performed and proven.
//
// Every exported function in quran-lemma-progress-data.js consults this gate
// FIRST and returns before ever calling Firestore while it is false -- not
// "attempt and swallow the error". While the gate is closed:
//
//   - no lemma collection is EVER read or written;
//   - the Word Card works exactly as it does today, PLUS the whole-Qur'an
//     numbers this round adds (those read only the already-deployed
//     quranWordTotals collection, gated separately by
//     study-wbw-total-readiness.js, and the already-loaded lemma occurrence
//     index -- neither needs this gate open);
//   - the "if you learn this word" delta counts only the one occurrence on
//     screen, and says so, rather than guessing at the rest of the lemma;
//   - "Mark this word known everywhere" is not shown at all, the same
//     "control that would only ever error is not offered" discipline
//     v08.31 established for Activity evidence.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const LEMMA_PROGRESS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * NOT YET ENABLED. `ready: false` as a literal -- the burden of proof is on
 * enablement, not on this file.
 */
export const LEMMA_PROGRESS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "The lemma-level word progress Rules (quranLemmaProgress, " +
    "quranLemmaApprovals, quranLemmaOccurrenceCounters) are a CANDIDATE only " +
    "-- docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules. " +
    "Not published to study-monitoring. No lemma collection is read or " +
    "written while this reads false.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is lemma-level word progress ready to be written to and read from?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isLemmaProgressPersistenceReady(declaration = LEMMA_PROGRESS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!LEMMA_PROGRESS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why lemma progress is unavailable, as a STABLE KEY rather than a sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when it IS ready, so a
 * caller cannot accidentally print an unavailability reason for a working
 * feature.
 */
export const REASON_LEMMA_PROGRESS_NOT_DEPLOYED = "lemma-progress-rules-not-deployed";
export const REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE = "lemma-progress-readiness-decision-incomplete";

export function lemmaProgressUnavailableReason(declaration = LEMMA_PROGRESS_PERSISTENCE_DECLARATION) {
  if (isLemmaProgressPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE;
  return REASON_LEMMA_PROGRESS_NOT_DEPLOYED;
}
