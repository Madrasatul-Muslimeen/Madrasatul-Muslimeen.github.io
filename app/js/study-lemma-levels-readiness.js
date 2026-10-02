// Decision 58 (2 Oct 2026, issue #490) -- BASIC / DEPTH LEMMA-WIDE CLAIM
// READINESS.
//
// Basic Achieved counts every word of the same root with the same meaning;
// Depth Achieved counts every word of the same root. Each is ONE lemma-wide
// claim document at its own level in quranLemmaProgress / quranLemmaApprovals /
// quranLemmaOccurrenceCounters, plus a per-level running total in
// quranWordTotals. The DEPLOYED Rules refuse a lemma document whose `level` is
// not 'wbw'; the Rules change is prepared in
// docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules and is
// published by the OWNER (an Owner Control Gate, E1).
//
// This module is the gate that stops the app ever attempting to read or write
// a basic/depth lemma document, or a per-level totals document, before then.
// It copies app/js/study-word-levels-readiness.js's shape EXACTLY:
//
// (1) IT DEFAULTS TO FALSE -- a literal, with the burden of proof on enablement.
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`: it reads no file,
//     fetches nothing and imports nothing, so it cannot consult the rules text
//     even by accident.
//
// Flipping `ready` to true alone does NOTHING: isLemmaLevelsPersistenceReady()
// also needs a well-formed `decision` (a closed-set authority, a real date and
// a reference to a record saying the deployment was performed and proven).
//
// While this gate is closed the app behaves exactly as v09.42: WbW Achieved
// counts the same word only, no basic/depth lemma or totals document is read
// or written, and the Word card shows its single "You know" line.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const LEMMA_LEVELS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/** THE DECLARATION. The single place the answer lives. NOT READY: the Owner has not yet published the Rules. */
export const LEMMA_LEVELS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "Basic / Depth lemma-wide claims and per-level totals (decision 58, issue #490) " +
    "are built but switched off until the Owner publishes " +
    "docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True ONLY for an explicit governed decision; every other shape is false. */
export function isLemmaLevelsPersistenceReady(declaration = LEMMA_LEVELS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!LEMMA_LEVELS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why Basic/Depth lemma-wide claims are unavailable, as a STABLE KEY (I11). Null when ready. */
export const REASON_LEMMA_LEVELS_NOT_DEPLOYED = "lemma-levels-rules-not-deployed";
export const REASON_LEMMA_LEVELS_DECISION_INCOMPLETE = "lemma-levels-readiness-decision-incomplete";

export function lemmaLevelsUnavailableReason(declaration = LEMMA_LEVELS_PERSISTENCE_DECLARATION) {
  if (isLemmaLevelsPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_LEMMA_LEVELS_DECISION_INCOMPLETE;
  return REASON_LEMMA_LEVELS_NOT_DEPLOYED;
}
