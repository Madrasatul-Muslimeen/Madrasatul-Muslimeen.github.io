// PCF MSA J38 + J39 (19 Oct 2026) -- TAṢRĪF LEVEL READINESS.
//
// Taṣrīf is the fourth Word card tab and writes its own level, `tasrif`, one
// study mark on the root. The DEPLOYED Rules accept
// `level in ['wbw', 'basic', 'intermediate', 'depth']` in three places, so a
// `tasrif` write would be refused in production. The Architect prepares the
// Rules change (docs/governance/2026-10-19-tasrif-level-DEPLOYMENT-candidate.rules)
// and the OWNER publishes it (an Owner Control Gate, E1).
//
// This module is the gate that keeps Taṣrīf's progress block CLOSED, and keeps
// the app from ever reading or writing a `tasrif` document, until then. It has
// the same shape as study-lemma-levels-readiness.js:
//
// (1) IT DEFAULTS TO FALSE -- a literal, with the burden of proof on enablement.
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`: it reads no file,
//     fetches nothing and imports nothing.
//
// Flipping `ready` to true alone does NOTHING: isTasrifLevelPersistenceReady()
// also needs a well-formed `decision` (a closed-set authority, a real date and
// a reference to a record saying the deployment was performed and proven).
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const TASRIF_LEVEL_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/** THE DECLARATION. The single place the answer lives. NOT READY: the Rules
    change has not been published. */
export const TASRIF_LEVEL_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "Taṣrīf marks (level 'tasrif') wait for the Owner to publish " +
    "docs/governance/2026-10-19-tasrif-level-DEPLOYMENT-candidate.rules. " +
    "Until then the Taṣrīf progress block is closed and nothing is written for 'tasrif'.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True ONLY for an explicit governed decision; every other shape is false. */
export function isTasrifLevelPersistenceReady(declaration = TASRIF_LEVEL_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!TASRIF_LEVEL_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why Taṣrīf marks are unavailable, as a STABLE KEY (I11). Null when ready. */
export const REASON_TASRIF_LEVEL_NOT_DEPLOYED = "tasrif-level-rules-not-deployed";
export const REASON_TASRIF_LEVEL_DECISION_INCOMPLETE = "tasrif-level-readiness-decision-incomplete";

export function tasrifLevelUnavailableReason(declaration = TASRIF_LEVEL_PERSISTENCE_DECLARATION) {
  if (isTasrifLevelPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_TASRIF_LEVEL_DECISION_INCOMPLETE;
  return REASON_TASRIF_LEVEL_NOT_DEPLOYED;
}
