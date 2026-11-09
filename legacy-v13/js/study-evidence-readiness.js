// MAP Phase 4 -- STUDY EVIDENCE PERSISTENCE READINESS (v08.31)
//
// WHY THIS FILE EXISTS.
//
// v08.30 wired D1 Reading, D2 Listening and D4 Word-by-Word to ADR-008's
// Activity evidence subcollection and shipped the ✓ control to `main`. The
// implementation fails CLOSED -- `firestore.rules` contains the word
// "evidence" zero times, so the subcollection has no rule, every write is
// denied, the store rethrows and safeWrite() surfaces the error to the reader
// (I15). That is correct behaviour and it is NOT weakened here.
//
// But `main` is what GitHub Pages serves, so failing closed at the DATABASE
// means the Owner's own live app shows a control that cannot succeed and says
// so only by producing an error when pressed. A control must not invite an
// action that cannot succeed. This module is the gate that stops it doing so,
// and the writer's rethrow stays underneath it as defence in depth.
//
// TWO RULES GOVERN THIS FILE, AND THEY ARE THE WHOLE DESIGN.
//
// (1) IT DEFAULTS TO FALSE. Not "false unless something looks right" -- false,
//     as a literal, with the burden of proof entirely on enablement.
//
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. The repository's copy
//     of the rules is a FILE; readiness is a fact about a LIVE Firebase
//     project. A repository file that mentions `evidence` would prove only
//     that somebody wrote it down -- deployment is E1, an external act
//     performed through the Firebase Console against `study-monitoring`, and
//     nothing in this checkout can observe it. So this module reads no file,
//     fetches nothing, and imports nothing at all. The inability is the
//     enforcement: a module that imports nothing cannot consult the rules
//     text even by accident. A boundary check asserts that absence.
//
// ENABLEMENT IS A GOVERNED DECISION, NOT AN EDIT.
//
// Flipping `ready` to true on its own does NOTHING: isStudyEvidencePersistenceReady()
// requires a well-formed `decision` alongside it -- an authority from a closed
// set, a real date, and a reference to a record that says the deployment was
// performed and proven. A hurried one-word edit therefore cannot enable the
// feature, and `tools/i18n-verify/programme-ledger.mjs` guard G cross-checks
// this declaration against the programme ledger's own recorded deployment
// state, so enabling it here while the ledger still records the Rules as
// NOT_DONE fails a check by name.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * ENABLED, 2026-09-22, under an explicit governed deployment-readiness
 * decision -- see docs/reports/2026-09-22-map-phase4-evidence-persistence-enabled.md.
 * `deployment.firebaseRulesDeployed.state` records YES (the Owner published
 * the Phase 3-6 Rules candidate directly in the Firebase Console the same
 * day), and Phase 3 word-by-word progress was independently verified to
 * save and reload on the Owner's own real phone before this was flipped.
 *
 * This was NOT a bare edit: isStudyEvidencePersistenceReady() requires the
 * `decision` shape below (a closed-set authority, a real date, an existing
 * reference), and tools/i18n-verify/programme-ledger.mjs guard G
 * cross-checks this literal against the ledger's own recorded deployment
 * state -- both re-run clean against this exact change.
 */
export const EVIDENCE_PERSISTENCE_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-09-22",
    reference: "docs/reports/2026-09-22-map-phase4-evidence-persistence-enabled.md",
  }),
  gate: "E1",
  note:
    "ADR-008 Activity evidence Rules are deployed to study-monitoring, " +
    "confirmed by the Owner in the Firebase Console, and Phase 3 word " +
    "progress was proven to save and reload on a real phone the same day.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is the evidence subcollection ready to be written to?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isStudyEvidencePersistenceReady(declaration = EVIDENCE_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why persistence is unavailable, as a STABLE KEY rather than a sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when persistence IS ready,
 * so a caller cannot accidentally print an unavailability reason for a
 * working feature.
 */
export const REASON_NOT_DEPLOYED = "evidence-rules-not-deployed";
export const REASON_DECISION_INCOMPLETE = "evidence-readiness-decision-incomplete";

export function studyEvidenceUnavailableReason(declaration = EVIDENCE_PERSISTENCE_DECLARATION) {
  if (isStudyEvidencePersistenceReady(declaration)) return null;
  // `ready` asserted without a valid governed decision is a DIFFERENT fault
  // from the standing not-deployed state, and saying so is what stops a
  // half-made enablement being read as "still waiting on E1".
  if (declaration && declaration.ready === true) return REASON_DECISION_INCOMPLETE;
  return REASON_NOT_DEPLOYED;
}
