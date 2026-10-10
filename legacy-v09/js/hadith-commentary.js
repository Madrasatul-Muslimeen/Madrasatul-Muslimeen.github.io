// Hadith H2 -- Classical Explanations / شروح الحديث.
//
// OUTBOUND LINKS ONLY. No commentary text is stored, cached, fetched or
// rendered by this module, and none may be while rights remain `link-only`.
//
// ===========================================================================
// THE RULE THAT SHAPES THIS WHOLE MODULE
// ===========================================================================
// The two verified register entries are matched to REAL narrations -- Bukhari
// 1 and Muslim 1907a -- by an EXTERNAL REFERENCE, a scheme plus a displayed
// number. They are NOT matched to any occurrence in this repository, because
// no edition is approved and therefore no real occurrence exists here.
//
// So `commentaryForOccurrence()` returns nothing for a synthetic occurrence,
// permanently and by construction. Attaching Ibn Hajar's commentary to
// `syn-occ-0003` would produce a screen asserting that a scholar commented on
// a narration this project invented last week. The H2 instruction forbids it
// in terms -- "do not attach these links to arbitrary synthetic narration
// records as if they were the verified reports" -- and the cheapest way to
// obey a rule permanently is to build something that cannot break it.
//
// The register entries therefore live on their OWN surface, labelled as
// verified external references, beside the synthetic corpus rather than
// inside it.

export const COMMENTARY_CONTRACT = "hadith-commentary:v1";

export const PANEL_TITLE = Object.freeze({
  en: "Classical Explanations",
  ar: "شروح الحديث",
  bn: "ধ্রুপদী ব্যাখ্যা",
});

/**
 * Mirrors docs/governance/hadith-commentary-manifest-2026-09-18.json.
 * `tools/i18n-verify/hadith-commentary-binding.mjs` asserts the two stay
 * identical field by field, so the manifest remains the source of truth and
 * this copy cannot drift from it unnoticed.
 */
export const VERIFIED_REGISTER_ENTRIES = Object.freeze([
  Object.freeze({
    commentary_match_id: "HCM-0001",
    collection_id: "bukhari",
    narration_occurrence_id: null,
    source_reference_scheme: "sunnah.com",
    source_reference: "bukhari:1",
    source_reference_display: "Ṣaḥīḥ al-Bukhārī 1 — Book of Revelation",
    commentary_work_id: "fath-al-bari",
    commentary_work_title_ar: "فتح الباري",
    commentary_work_title_en: "Fatḥ al-Bārī",
    author_id: "ibn-hajar-al-asqalani",
    author_display: "Ibn Ḥajar al-ʿAsqalānī",
    digital_edition_id: null,
    commentary_location: "Book of Revelation, opening narration",
    source_url: "https://www.islamweb.net/ar/library/content/52/1/%D8%A8%D8%A7%D8%A8-%D8%A8%D8%AF%D8%A1-%D8%A7%D9%84%D9%88%D8%AD%D9%8A",
    language: "ar",
    match_type: "direct",
    rights_status: "link-only",
    review_status: "link verified; passage boundaries and edition pagination NOT reviewed",
  }),
  Object.freeze({
    commentary_match_id: "HCM-0002",
    collection_id: "muslim",
    narration_occurrence_id: null,
    source_reference_scheme: "sunnah.com",
    source_reference: "muslim:1907a",
    source_reference_display: "Ṣaḥīḥ Muslim 1907a — Book of Government",
    commentary_work_id: "al-minhaj-sharh-sahih-muslim",
    commentary_work_title_ar: "المنهاج شرح صحيح مسلم",
    commentary_work_title_en: "al-Minhāj Sharḥ Ṣaḥīḥ Muslim",
    author_id: "al-nawawi",
    author_display: "Al-Nawawī",
    digital_edition_id: null,
    commentary_location: "Book of Government, chapter on intentions",
    source_url: "https://www.islamweb.net/ar/library/content/53/5758/",
    language: "ar",
    match_type: "direct",
    rights_status: "link-only",
    review_status: "link verified; WHICH 1907 sub-narrations the commentary discusses is NOT established",
  }),
]);

export function verifiedRegisterEntries() {
  return VERIFIED_REGISTER_ENTRIES;
}

/**
 * Commentary attached to an occurrence in THIS repository.
 *
 * Always empty, with the reason attached, because every occurrence here is
 * synthetic and every register entry is bound to an external reference rather
 * than to an occurrence id. It is a function rather than a constant so the
 * calling screen asks the real question and gets the real answer, and so the
 * day an approved edition arrives there is one place to change.
 */
export function commentaryForOccurrence(occurrenceId) {
  const bound = VERIFIED_REGISTER_ENTRIES.filter((e) => e.narration_occurrence_id === occurrenceId);
  return {
    entries: bound,
    reason: bound.length === 0
      ? "no-approved-edition: every register entry is bound to an external reference, not to an occurrence in this repository"
      : null,
  };
}

/**
 * What a renderer is permitted to draw for one entry.
 *
 * `mayShowText` is false for anything short of `embed-cleared`, so the panel
 * renders an attributed citation and an outbound link, and no commentary text.
 */
export function renderPermission(entry) {
  const cleared = entry?.rights_status === "embed-cleared";
  return Object.freeze({
    mayShowCitation: true,
    mayLinkOut: entry?.rights_status === "link-only" || cleared,
    mayShowText: cleared,
    reason: cleared ? null : `rights_status is "${entry?.rights_status}" — citation and link only`,
  });
}

/** Prohibitions carried in code beside the data they govern, so a renderer can print them and a check can read them. */
export const NEVER_DO = Object.freeze([
  "Present an AI summary as the scholar's own words.",
  "Auto-translate a scholar's legal conclusion as if it were their exact wording.",
  "Label a commentary as the Hadith's own text.",
  "Attach a verified commentary match to a synthetic narration.",
]);
