// Siyagah port round 7a (issue #458) -- SECTIONS AND FOLDER COLOUR/BOLD READINESS
//
// WHY THIS FILE EXISTS. Round 7 adds `color`, `bold` and `sectionId` to the
// ALREADY-DEPLOYED `noteFolders` collection and a NEW `noteSections`
// collection. Deploying those Rules is an Owner Control Gate (CLAUDE.md), and
// the candidate is docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-
// candidate.rules -- NOT published. So every control built against it shows
// but writes nothing until this gate reads true.
//
// This copies app/js/study-wordpress-import-readiness.js's shape EXACTLY:
//
// (1) IT DEFAULTS TO FALSE -- as a literal, with the burden of proof entirely
//     on enablement.
// (2) IT NEVER INFERS READINESS FROM `firestore.rules`. A rules FILE is not a
//     fact about the LIVE project. This module reads no file, fetches nothing
//     and imports nothing at all; the inability is the enforcement.
// (3) FLIPPING `ready` ALONE DOES NOTHING: isSiyagahSectionsReady() also needs
//     a well-formed `decision` (a closed authority, a real date, a reference).
//
// ENABLEMENT IS THE ARCHITECT'S, AFTER THE OWNER PUBLISHES. A builder round
// never flips it. This module is PURE and imports nothing. Do not give it an
// import.

/** Who may declare deployment readiness. Closed: a module cannot authorise itself. */
export const SIYAGAH_SECTIONS_READINESS_AUTHORITIES = Object.freeze(["master-architect"]);

/**
 * THE DECLARATION. This is the single place the answer lives.
 *
 * ENABLED 2026-10-01. The Owner published
 * docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules to
 * study-monitoring and confirmed it ("Round 7 rules are live."); firestore.rules
 * was synced to that exact file in the same change. The record is the
 * reference below.
 */
export const SIYAGAH_SECTIONS_DECLARATION = Object.freeze({
  ready: true,
  decision: Object.freeze({
    by: "master-architect",
    on: "2026-10-01",
    reference: "docs/reports/2026-10-01-siyagah-round7-enabled.md",
  }),
  gate: "E1",
  note:
    "Sections (noteSections), a folder's colour, bold and section, and Tags " +
    "(noteTags, noteTagLinks) are authorised by the published round 7 Rules.",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Is the sections / folder-look writer ready? True ONLY for an explicit
 * governed decision; every other shape returns false. Never "probably".
 */
export function isSiyagahSectionsReady(declaration = SIYAGAH_SECTIONS_DECLARATION) {
  if (!declaration || typeof declaration !== "object") return false;
  if (declaration.ready !== true) return false;
  const d = declaration.decision;
  if (!d || typeof d !== "object") return false;
  if (!SIYAGAH_SECTIONS_READINESS_AUTHORITIES.includes(d.by)) return false;
  if (typeof d.on !== "string" || !ISO_DATE.test(d.on)) return false;
  if (typeof d.reference !== "string" || d.reference.trim() === "") return false;
  return true;
}

/** Why the controls are unavailable, as a STABLE KEY (the caller knows the language -- I11). Null when ready. */
export const REASON_SIYAGAH_SECTIONS_NOT_DEPLOYED = "siyagah-sections-rules-not-deployed";
export const REASON_SIYAGAH_SECTIONS_DECISION_INCOMPLETE = "siyagah-sections-readiness-decision-incomplete";

export function siyagahSectionsUnavailableReason(declaration = SIYAGAH_SECTIONS_DECLARATION) {
  if (isSiyagahSectionsReady(declaration)) return null;
  if (declaration && declaration.ready === true) return REASON_SIYAGAH_SECTIONS_DECISION_INCOMPLETE;
  return REASON_SIYAGAH_SECTIONS_NOT_DEPLOYED;
}
