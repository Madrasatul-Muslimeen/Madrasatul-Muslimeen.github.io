// Issue #265 -- WORDPRESS IMPORT (mappingmyjourney.com) PERSISTENCE READINESS
//
// WHY THIS FILE EXISTS.
//
// This round adds optional fields to two ALREADY-DEPLOYED collections --
// `notes` gains `originalCreatedAt`, `originalModifiedAt`, `importSource`;
// `noteFolders` gains `importSource` -- so an imported Note/folder can carry
// its real WordPress dates and provenance. Deploying that Rules amendment is
// an Owner Control Gate, exactly like every other Firestore change in this
// project (CLAUDE.md's own standing rule): this round proposes a Rules
// CANDIDATE (docs/governance/2026-09-25-wordpress-import-rules-candidate.rules)
// and builds against it, and does not deploy it.
//
// This module is the gate that stops the Import page ever attempting a
// write against those undeployed fields, copying app/js/study-wbw-total-
// readiness.js's shape EXACTLY, because that module already solved this
// exact problem for a different collection and the same two rules apply
// unchanged:
//
// (1) IT DEFAULTS TO FALSE. Not "false unless something looks right" --
//     false, as a literal, with the burden of proof entirely on enablement.
//
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. The repository's
//     copy of the rules is a FILE; readiness is a fact about a LIVE Firebase
//     project. So this module reads no file, fetches nothing, and imports
//     nothing at all. The inability is the enforcement: a module that
//     imports nothing cannot consult the rules text even by accident.
//
// ENABLEMENT IS A GOVERNED DECISION, NOT AN EDIT. Flipping `ready` to true
// on its own does NOTHING: isWordpressImportPersistenceReady() requires a
// well-formed `decision` alongside it -- an authority from a closed set, a
// real date, and a reference to a record that says the deployment was
// performed and proven.
//
// THE PREVIEW WORKS WITHOUT THIS GATE (issue #265's own explicit
// requirement) -- parsing a chosen .xml file and showing folder/Note/
// reference counts touches no Firestore write at all, so
// app/import-notes.html never consults this module before rendering a
// preview. Only the Import BUTTON -- the thing that actually writes
// `originalCreatedAt`/`originalModifiedAt`/`importSource` -- is gated.
//
// This module is PURE and imports nothing. Do not give it an import.
//
// Issue #271 -- app/js/evernote-import-service.js REUSES this exact gate,
// unrenamed, rather than forking a second one. Both importers write the
// identical three optional fields (originalCreatedAt/originalModifiedAt/
// importSource) on the identical two collections (notes/noteFolders), under
// the identical Rules candidate named above -- it is the same governed
// dependency, so it gets the same governed answer. A second gate for the
// same underlying fact would just be two places that could disagree.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const WORDPRESS_IMPORT_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * NOT YET ENABLED. The Rules candidate has not been published by the Owner,
 * and no deployment record exists to reference -- `ready: false` as a
 * literal, `decision: null`. The Architect flips this once the Owner
 * confirms the publish, under the same ceremony `study-wbw-total-
 * readiness.js` and `study-evidence-readiness.js` both already use.
 */
export const WORDPRESS_IMPORT_PERSISTENCE_DECLARATION = Object.freeze({
  ready: false,
  decision: null,
  gate: "E1",
  note:
    "The Rules candidate at docs/governance/2026-09-25-wordpress-import-rules-" +
    "candidate.rules widens `notes` and `noteFolders` with optional import " +
    "fields, but has not been published to study-monitoring. Until it is, " +
    "the Import page's preview works (it writes nothing); the Import button " +
    "stays disabled and says why.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is the WordPress-import writer ready to write `originalCreatedAt`/
 * `originalModifiedAt`/`importSource`?
 *
 * Returns true ONLY for an explicit governed decision. Every other shape --
 * a missing declaration, `ready` left false, `ready` flipped true with no
 * decision, a decision from an unknown authority, a malformed date, an empty
 * reference -- returns false. There is no path through this function that
 * says "probably".
 */
export function isWordpressImportPersistenceReady(declaration = WORDPRESS_IMPORT_PERSISTENCE_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!WORDPRESS_IMPORT_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/**
 * Why the import is unavailable, as a STABLE KEY rather than a sentence.
 *
 * A key, not prose, because the caller is the only thing that knows which
 * language the reader is in -- I11. Returns null when the writer IS ready,
 * so a caller cannot accidentally print an unavailability reason for a
 * working feature.
 */
export const REASON_WORDPRESS_IMPORT_NOT_DEPLOYED = "wordpress-import-rules-not-deployed";
export const REASON_WORDPRESS_IMPORT_DECISION_INCOMPLETE = "wordpress-import-readiness-decision-incomplete";

export function wordpressImportUnavailableReason(declaration = WORDPRESS_IMPORT_PERSISTENCE_DECLARATION) {
  if (isWordpressImportPersistenceReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_WORDPRESS_IMPORT_DECISION_INCOMPLETE;
  return REASON_WORDPRESS_IMPORT_NOT_DEPLOYED;
}
