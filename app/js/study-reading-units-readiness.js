// Issue #349 -- MARK AS READ FOR RUKU' AND PAGE: PERSISTENCE READINESS.
//
// WHY THIS FILE EXISTS.
//
// The Owner's decision (docs/governance/2026-09-27-owner-decisions.md, row 20):
// "'Mark as read' for Ruku', Page, Hizb and Juz? -- Ruku' and Page: yes. Hizb
// and Juz: later. Recording Activity for Ruku' and Page amends ADR-008 and
// needs a Rules change the Owner publishes; until then those buttons explain
// why they are off." ADR-008 Amendment 3 (docs/governance/adr/ADR-008-study-
// approach-event-contract-v1.md) widens reading.completed's accepted unit
// types to ruku and page -- both the pure identity module
// (app/js/study-activity-evidence-id.js) and the Rules DEPLOYMENT candidate
// (docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules)
// now recognise them. Publishing that candidate is an Owner Control Gate,
// exactly like every other Firestore change in this project (CLAUDE.md's own
// standing rule) -- this round proposes the candidate and builds against it,
// and does not deploy it.
//
// This module is a SECOND, NARROWER gate on top of the general evidence-
// persistence gate (study-evidence-readiness.js, open since 22 Sep 2026): a
// Ruku'/Page completion needs BOTH gates open, because the general gate only
// proves the base `activity/.../evidence` subcollection has a rule at all --
// it says nothing about whether THIS particular amendment has been published.
// Ayah/range/surah completions are unaffected by this module; they always
// were only ever gated by the general one.
//
// Copies app/js/study-evidence-readiness.js's shape EXACTLY, because that
// module already solved this exact problem for the same collection and the
// same two rules apply unchanged:
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
// its own does NOTHING: isReadingUnitsPersistenceReady() requires a
// well-formed `decision` alongside it -- an authority from a closed set, a
// real date, and a reference to a record that says the deployment was
// performed and proven.
//
// While this gate is closed:
//
//   - the Unit Card's "Mark as read" for a Ruku' or a Page stays
//     `aria-disabled`, explaining why in words, exactly as it did before this
//     issue -- the reader never sees a control that can only error;
//   - recordStudyEvidence() (study-event-wiring.js) refuses a Ruku'/Page
//     write BEFORE the store is reached, as defence in depth alongside the UI
//     gate, the same "one chokepoint" shape v08.31 built for the general gate;
//   - ayah/range/surah "Mark as read" and every other Study surface are
//     entirely unaffected -- this gate is consulted for ruku/page only.
//
// This module is PURE and imports nothing. Do not give it an import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const READING_UNITS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * ENABLED 29 Sep 2026. The Owner published
 * docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules
 * ("Ruku/Page rule published") and firestore.rules is synced to it. Governed
 * decision recorded in docs/reports/2026-09-29-reading-ruku-page-enabled.md.
 */
export const READING_UNITS_PERSISTENCE_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-09-29",
    reference: "docs/reports/2026-09-29-reading-ruku-page-enabled.md",
  }),
  gate: "E1",
  note:
    "Mark as read for Ruku' and Page (issue #349, ADR-008 Amendment 3) is " +
    "enabled: the Owner published " +
    "docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules " +
    "on 29 Sep 2026 and firestore.rules is synced to it.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is a Ruku'/Page "mark as read" completion ready to be persisted?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isReadingUnitsPersistenceReady(declaration = READING_UNITS_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!READING_UNITS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why Ruku'/Page persistence is unavailable, as a STABLE KEY rather than a
 * sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when persistence IS ready,
 * so a caller cannot accidentally print an unavailability reason for a
 * working feature.
 */
export const REASON_READING_UNITS_NOT_DEPLOYED = "reading-units-rules-not-deployed";
export const REASON_READING_UNITS_DECISION_INCOMPLETE = "reading-units-readiness-decision-incomplete";

export function readingUnitsUnavailableReason(declaration = READING_UNITS_PERSISTENCE_DECLARATION) {
  if (isReadingUnitsPersistenceReady(declaration)) return null;
  // `ready` asserted without a valid governed decision is a DIFFERENT fault
  // from the standing not-deployed state, and saying so is what stops a
  // half-made enablement being read as "still waiting on the Owner".
  if (declaration && declaration.ready === true) return REASON_READING_UNITS_DECISION_INCOMPLETE;
  return REASON_READING_UNITS_NOT_DEPLOYED;
}
