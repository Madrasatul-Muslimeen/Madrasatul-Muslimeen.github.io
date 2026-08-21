// Role names, in the reader's own language (full app translation, phase 4).
//
// Found by opening a rendered page, not by the coverage report: the tenant
// picker on all 13 signed-in pages prints "Madrasatul Muslimeen (owner,
// prime)" and the nav's "Previewing as" notice prints a bare role id. Both
// stayed English right through phases 1-3, because the identifier reaches
// t() through a variable and no extractor pattern could see it.
//
// WHY ITS OWN FILE. Roles belong to session-context.js, but that module
// imports the Firestore SDK, and nav.js needs these labels while being --
// by its own stated contract (I2) -- a pure renderer that never touches
// Firebase. A three-line module with one dependency keeps both true.
//
// The identifiers themselves are never touched: they are what
// firestore.rules checks and what tenantMemberUids stores. Named *_LABELS
// so tools/i18n-coverage.mjs counts the wording -- see its own note on the
// label-map convention.

import { t } from "./i18n.js";

const ROLE_LABELS = Object.freeze({
  owner: "Owner",
  prime: "Prime",
  teacher: "Teacher",
  guardian: "Guardian",
  student: "Student",
  platformAdmin: "Platform admin",
});

/** One role id as text. An unknown id falls through unchanged rather than rendering blank. */
export function roleLabel(role) {
  const label = ROLE_LABELS[role];
  return label ? t(label) : (role ?? "");
}

/** A membership's whole role list, ready to print: "Owner, Prime". */
export function roleListLabel(roles) {
  return (roles ?? []).map(roleLabel).join(", ");
}

// Lifecycle status, shared by every archivable thing in the app. I4 is why
// the list looks like this: nothing is ever deleted, so a status is how a
// thing leaves active use -- archived, ended, revoked or consumed.
const ENTITY_STATUS_LABELS = Object.freeze({
  active: "Active",
  archived: "Archived",
  ended: "Ended",
  // modules.js seeds a module as "planned" and flips it to "active" when
  // that module's real UI ships -- so the Catalogue's Modules table shows
  // this one on any module not yet built.
  planned: "Planned",
  pending: "Pending",
  consumed: "Accepted",
  revoked: "Revoked",
  draft: "Draft",
});

export function entityStatusLabel(status) {
  const label = ENTITY_STATUS_LABELS[status];
  return label ? t(label) : (status ?? "");
}

// Confirmation state (I6: frozen when marked, never recalculated). Moved
// here in phase 6 from records.js, which owns the WRITING of it but not
// the wording -- asma-renderer.js needs to print it and is, by the same
// contract nav.js holds (I2), a pure renderer that must never gain a
// Firebase dependency. records.js re-exports this rather than keeping a
// second copy, the same way course-offers.js does for the role labels.
const CONFIRM_STATE_LABELS = Object.freeze({
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  returned: "Returned",
});

export function confirmStateLabel(confirmState) {
  const label = CONFIRM_STATE_LABELS[confirmState];
  return label ? t(label) : (confirmState ?? "");
}

// ---------------------------------------------------------------------------
// Shell round 25 — grammar labels for the root & derivatives panel.
//
// The owner, reading the panel with the app in Bangla: "what about these
// derivates? in Bangla means everything should be Bangla." Right — the panel
// printed "Preposition + Relative Pronoun" in English on an otherwise Bangla
// screen.
//
// Measured before building: the pulled data carries 359 DISTINCT part-of-speech
// strings, which looks unmanageable until you notice they are compositions of
// just 46 atoms joined by " + ". So this translates the atoms and rejoins them,
// rather than trying to hold 359 phrases.
//
// A second thing the measurement showed, and it is worth fixing for BOTH
// languages: a dozen of those atoms are raw Quranic Arabic Corpus codes — RES,
// PRO, PREV, EXL, INT, EXH, SUR, AVR, EQ, COM, IMPV — which tell an English
// reader exactly as little as they tell a Bangla one. They are expanded to
// real words here, so English gains from this round too.
// ---------------------------------------------------------------------------

/** The 46 atoms every part-of-speech string in the pulled data is built from.
 *  A value that is its own key is a term that is already a word; the rest are
 *  corpus codes expanded into one. Anything unknown falls through unchanged —
 *  the data has one such glitch entry, and printing it beats inventing a
 *  meaning for it. */
const POS_LABELS = {
  "Noun": "Noun",
  "Pronoun": "Pronoun",
  "Verb": "Verb",
  "Preposition": "Preposition",
  "Conjunction": "Conjunction",
  "Determiner": "Determiner",
  "Proper Noun": "Proper Noun",
  "Relative Pronoun": "Relative Pronoun",
  "Resumption Particle": "Resumption Particle",
  "Negative Particle": "Negative Particle",
  "Accusative Particle": "Accusative Particle",
  "Adjective": "Adjective",
  "Emphatic Particle": "Emphatic Particle",
  "Time Adverb": "Time Adverb",
  "Conditional": "Conditional",
  "Demonstrative Pronoun": "Demonstrative Pronoun",
  "Interrogative Particle": "Interrogative Particle",
  "Subordinating Conj.": "Subordinating Conjunction",
  "Location Adverb": "Location Adverb",
  "Particle of Certainty": "Particle of Certainty",
  "Vocative Particle": "Vocative Particle",
  "Result Particle": "Result Particle",
  "Purpose/Jussive Particle": "Purpose Particle",
  "Circumstantial": "Circumstantial",
  "Supplemental": "Supplemental",
  "Future Particle": "Future Particle",
  "Retraction Particle": "Retraction Particle",
  "Exceptive Particle": "Exceptive Particle",
  "Inceptive Particle": "Inceptive Particle",
  "Causative Particle": "Causative Particle",
  "Amendment Particle": "Amendment Particle",
  "Answer Particle": "Answer Particle",
  "Quranic Initials": "Quranic Initials",
  "Imperative Verb": "Imperative Verb",
  // Raw corpus codes, expanded.
  "RES": "Restriction Particle",
  "PRO": "Prohibition Particle",
  "PREV": "Preventive Particle",
  "IMPV": "Imperative Verb",
  "EXL": "Explanation Particle",
  "INT": "Interpretation Particle",
  "EXH": "Exhortation Particle",
  "SUR": "Surprise Particle",
  "AVR": "Aversion Particle",
  "EQ": "Equalization Particle",
  "COM": "Comitative Particle",
};

/** "Preposition + Relative Pronoun" in the reader's own language. Split on the
 *  joiner, translate each atom, rejoin — which is what keeps 46 entries able to
 *  express all 359 combinations the data actually contains. */
export function posLabel(pos) {
  if (!pos) return "";
  return String(pos)
    .split("+")
    .map((part) => {
      const atom = part.trim();
      const english = POS_LABELS[atom];
      return english ? t(english) : atom; // unknown atoms print as they are
    })
    .join(" + ");
}
