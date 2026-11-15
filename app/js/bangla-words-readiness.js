// PCF MSA J143 (the Owner ticked B on 16 Nov 2026) -- BANGLA WORD LISTS IN THE READER'S ACCOUNT: READINESS.
//
// The Owner chose to store the own-language word list (Bangla, Urdu ...) per student in Firestore, so the Monitor and every device of that
// student see the same list. That needs the banglaWords Rules (docs/proposals/bangla-words.candidate.rules), which are NOT published: an Owner
// Control Gate on E1, assembled and published by the Architect and the Owner. firestore.rules is not touched here.
//
// This module is the gate that keeps the app on the DEVICE copy (localStorage, as today) and never lets it read or write a banglaWords
// document, until then. Same shape as study-tasrif-level-readiness.js:
//   (1) IT DEFAULTS TO FALSE, a literal, with the burden of proof on enablement.
//   (2) IT NEVER INFERS READINESS FROM `firestore.rules`: it reads no file, fetches nothing and imports nothing.
// Flipping `ready` to true alone does NOTHING: isBanglaWordsPersistenceReady() also needs a well-formed `decision` (a closed-set authority,
// a real date and a reference to a record saying the deployment was performed and proven).
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const BANGLA_WORDS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/** THE DECLARATION. The single place the answer lives. NOT READY: the banglaWords Rules are not published. */
export const BANGLA_WORDS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "banglaWords saving is OFF: docs/proposals/bangla-words.candidate.rules is a candidate, not published. " +
    "To open it, the Architect sets ready: true with a decision { by: 'master-architect', on: 'YYYY-MM-DD', reference: '<the record that says the " +
    "Rules were published and proven>' } in the same commit that records the deployment.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True ONLY for an explicit governed decision; every other shape is false. */
export function isBanglaWordsPersistenceReady(declaration = BANGLA_WORDS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!BANGLA_WORDS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why saving is unavailable, as a STABLE KEY (I11). Null when ready. */
export const REASON_BANGLA_WORDS_NOT_DEPLOYED = "bangla-words-rules-not-deployed";
export const REASON_BANGLA_WORDS_DECISION_INCOMPLETE = "bangla-words-readiness-decision-incomplete";
export function banglaWordsUnavailableReason(declaration = BANGLA_WORDS_PERSISTENCE_DECLARATION) {
  if (isBanglaWordsPersistenceReady(declaration)) return null;
  return declaration && declaration.ready === true ? REASON_BANGLA_WORDS_DECISION_INCOMPLETE : REASON_BANGLA_WORDS_NOT_DEPLOYED;
}
