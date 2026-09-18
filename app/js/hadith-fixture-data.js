// Hadith H2 -- the SYNTHETIC pilot corpus.
//
// ===========================================================================
// NOTHING IN THIS FILE IS A HADITH. Not one line of it is narration,
// translation, chain or commentary. Every string is a development placeholder.
// ===========================================================================
//
// Zero editions are rights-cleared (docs/governance/hadith-source-manifest-
// 2026-09-18.json, `textImportAuthorisedForAnySource: false`), so the pilot
// runs on fixtures. Two rules make that safe rather than merely stated:
//
//   1. THE ARABIC ITSELF SAYS IT IS NOT A HADITH. Every occurrence's source
//      text opens with `هذا نص تجريبي وليس حديثاً` -- "this is a test text and
//      is not a hadith". A fragment copied out of here, screenshotted, or
//      scraped by something else still carries its own denial in the language
//      a reader of the source text would read. A `synthetic: true` flag a
//      renderer might forget to show would not survive that journey.
//   2. EVERY ID SITS IN THE SYNTHETIC NAMESPACE, which is TWO prefixes and
//      not one. The hierarchy and the taxonomy -- collection, edition, book,
//      chapter and TOPIC ids -- carry `synthetic-`; the two row-level id
//      families carry their documented short forms, `syn-occ-` for an
//      occurrence and `syn-map-` for a topic mapping. So a fixture id cannot
//      collide with a real collection, edition or topic id: a fixture can
//      never be mistaken for an approved edition by any lookup, and a real
//      import can never silently overwrite one.
//
//      This comment previously claimed every id was prefixed `synthetic-`,
//      which was not true of the data it describes -- occurrences and
//      mappings never were, and the TOPIC id was `topic-salah`, carrying no
//      synthetic marker at all. That one mattered: a future reviewed Salah
//      topic would plausibly be minted under exactly that id, and three
//      `reviewStatus: "unreviewed"` synthetic mappings would then share a
//      topic id with real ones. Renamed to `synthetic-topic-salah`.
//      The namespace is ENFORCED now rather than described -- see the three
//      GATE checks in tools/i18n-verify/hadith-corpus.mjs, which sweep every
//      id family, refuse a plausible real id, and refuse a half-done rename.
//
// The shape follows docs/governance/hadith-reference-and-import-schema-v1.md.
// Deliberate properties of the data, each demonstrating something the Master
// Plan requires and none of them accidental:
//
//   - TWO collections, so the Salah topic index is genuinely CROSS-COLLECTION.
//   - Collection Beta has NO chapter level, because the plan requires
//     supporting an edition whose hierarchy has none.
//   - syn-occ-0006 REPEATS syn-occ-0005's text as its own separate occurrence,
//     because repeats are distinct source occurrences and are never merged.
//   - syn-occ-0008 has NO Bangla translation, so the language fallback label
//     has a real case to render rather than a hypothetical one.

export const FIXTURE_CONTRACT = "hadith-synthetic-fixture:v1";
export const IS_SYNTHETIC = true;
export const TAXONOMY_REVISION = "salah-taxonomy:v1";

/** Shown on every Hadith screen, in all three languages. Never conditional, never dismissible. */
export const SYNTHETIC_NOTICE = Object.freeze({
  ar: "بيانات تجريبية اصطناعية — ليست أحاديث نبوية.",
  en: "Synthetic development data — these are not real narrations.",
  bn: "কৃত্রিম ডেভেলপমেন্ট ডেটা — এগুলি প্রকৃত হাদিস নয়।",
});

const NOT_A_HADITH_AR = "هذا نص تجريبي وليس حديثاً";

/** A synthetic source text that denies being a hadith in its own first clause. */
function synthArabic(n) {
  return `${NOT_A_HADITH_AR} — نص العينة رقم ${n}، لأغراض التطوير فقط.`;
}
function synthEnglish(n) {
  return `This is a test text and is not a hadith — synthetic sample no. ${n}, for development only.`;
}
function synthBangla(n) {
  return `এটি একটি পরীক্ষামূলক পাঠ, প্রকৃত হাদিস নয় — কৃত্রিম নমুনা নং ${n}, শুধুমাত্র ডেভেলপমেন্টের জন্য।`;
}
const SYNTH_ISNAD_AR = `${NOT_A_HADITH_AR} — سلسلة إسناد اصطناعية للاختبار.`;

export const COLLECTIONS = Object.freeze([
  {
    collectionId: "synthetic-alpha", synthetic: true,
    name: { ar: "مجموعة العينة ألف", en: "Sample Collection Alpha", bn: "নমুনা সংকলন আলফা" },
    compiler: { ar: "مؤلف اصطناعي", en: "Synthetic compiler", bn: "কৃত্রিম সংকলক" },
    provenance: "Invented for development. Corresponds to no real collection.",
  },
  {
    collectionId: "synthetic-beta", synthetic: true,
    name: { ar: "مجموعة العينة باء", en: "Sample Collection Beta", bn: "নমুনা সংকলন বিটা" },
    compiler: { ar: "مؤلف اصطناعي", en: "Synthetic compiler", bn: "কৃত্রিম সংকলক" },
    provenance: "Invented for development. Corresponds to no real collection.",
  },
]);

export const EDITIONS = Object.freeze([
  {
    editionId: "synthetic-alpha-ar-v1", collectionId: "synthetic-alpha", synthetic: true,
    sourceId: null, language: "ar", revision: "v1", contentHash: null,
    rightsStatus: "blocked", numberingScheme: "synthetic-sequential",
    hasChapterLevel: true,
    bibliographic: "Synthetic edition. No publisher, no printing, no real text.",
  },
  {
    editionId: "synthetic-beta-ar-v1", collectionId: "synthetic-beta", synthetic: true,
    sourceId: null, language: "ar", revision: "v1", contentHash: null,
    rightsStatus: "blocked", numberingScheme: "synthetic-sequential",
    hasChapterLevel: false, // deliberately: an edition with no chapter level
    bibliographic: "Synthetic edition. No publisher, no printing, no real text.",
  },
]);

/** Books and chapters share one record type (schema §1, `BookChapter`); a chapter names its book as `parentId`. */
export const BOOK_CHAPTERS = Object.freeze([
  { bookChapterId: "synthetic-alpha-b1", editionId: "synthetic-alpha-ar-v1", parentId: null, sourceOrder: 1,
    sourceNativeId: "1", rawHeading: "كتاب البداية",
    title: { ar: "كتاب البداية", en: "Book of the Beginning", bn: "সূচনার অধ্যায়" }, synthetic: true },
  { bookChapterId: "synthetic-alpha-b1-c1", editionId: "synthetic-alpha-ar-v1", parentId: "synthetic-alpha-b1", sourceOrder: 1,
    sourceNativeId: "1.1", rawHeading: "باب النية",
    title: { ar: "باب النية", en: "Chapter on Intention", bn: "নিয়ত অধ্যায়" }, synthetic: true },
  { bookChapterId: "synthetic-alpha-b1-c2", editionId: "synthetic-alpha-ar-v1", parentId: "synthetic-alpha-b1", sourceOrder: 2,
    sourceNativeId: "1.2", rawHeading: "باب مواقيت الصلاة",
    title: { ar: "باب مواقيت الصلاة", en: "Chapter on the Times of Prayer", bn: "নামাজের সময় অধ্যায়" }, synthetic: true },
  { bookChapterId: "synthetic-alpha-b2", editionId: "synthetic-alpha-ar-v1", parentId: null, sourceOrder: 2,
    sourceNativeId: "2", rawHeading: "كتاب الصلاة",
    title: { ar: "كتاب الصلاة", en: "Book of Prayer", bn: "নামাজের অধ্যায়" }, synthetic: true },
  { bookChapterId: "synthetic-alpha-b2-c1", editionId: "synthetic-alpha-ar-v1", parentId: "synthetic-alpha-b2", sourceOrder: 1,
    sourceNativeId: "2.1", rawHeading: "باب الوضوء قبل الصلاة",
    title: { ar: "باب الوضوء قبل الصلاة", en: "Chapter on Ablution before Prayer", bn: "নামাজের পূর্বে ওজু অধ্যায়" }, synthetic: true },
  // Collection Beta: books only, no chapter level at all.
  { bookChapterId: "synthetic-beta-b1", editionId: "synthetic-beta-ar-v1", parentId: null, sourceOrder: 1,
    sourceNativeId: "1", rawHeading: "كتاب العبادات",
    title: { ar: "كتاب العبادات", en: "Book of Acts of Worship", bn: "ইবাদতের অধ্যায়" }, synthetic: true },
]);

/**
 * A narration OCCURRENCE. `occurrenceId` is opaque and internal (schema §2.4);
 * no `hadith:` unit key is built anywhere in H2, because that key's semantics
 * are behind a closed gate.
 *
 * `text.bn === null` is a real, deliberate gap -- see syn-occ-0008.
 */
export const OCCURRENCES = Object.freeze([
  mk(1, "synthetic-alpha-ar-v1", "synthetic-alpha-b1-c1", 1),
  mk(2, "synthetic-alpha-ar-v1", "synthetic-alpha-b1-c1", 2),
  mk(3, "synthetic-alpha-ar-v1", "synthetic-alpha-b1-c2", 3),
  mk(4, "synthetic-alpha-ar-v1", "synthetic-alpha-b1-c2", 4),
  mk(5, "synthetic-alpha-ar-v1", "synthetic-alpha-b2-c1", 5),
  // A REPEAT: same text as 5, its own occurrence. Never merged (schema §1).
  { ...mk(6, "synthetic-alpha-ar-v1", "synthetic-alpha-b2-c1", 6), repeatOfOccurrenceId: "syn-occ-0005",
    text: textFor(5), searchText: searchTextFor(5) },
  mk(7, "synthetic-beta-ar-v1", "synthetic-beta-b1", 1),
  // NO Bangla translation: the language fallback label needs a real case.
  { ...mk(8, "synthetic-beta-ar-v1", "synthetic-beta-b1", 2),
    text: { ...textFor(8), bn: null },
    translationAttribution: { ...attributionFor(8), bn: null } },
]);

function pad(n) { return String(n).padStart(4, "0"); }
function textFor(n) {
  return { ar: synthArabic(n), en: synthEnglish(n), bn: synthBangla(n) };
}
function searchTextFor(n) {
  // Normalised search text is stored APART from the source text (schema §1).
  const t = textFor(n);
  return { ar: t.ar.replace(/[ًٌٍَُِّْـ]/g, ""), en: t.en.toLowerCase(), bn: t.bn };
}
function attributionFor(n) {
  return {
    en: { translator: "Synthetic fixture", edition: "n/a", rightsStatus: "blocked" },
    bn: { translator: "Synthetic fixture", edition: "n/a", rightsStatus: "blocked" },
  };
}
function mk(n, editionId, bookChapterId, sourceOrder) {
  return {
    occurrenceId: `syn-occ-${pad(n)}`, synthetic: true,
    editionId, bookChapterId, sourceOrder,
    isnad: { ar: SYNTH_ISNAD_AR, en: "Synthetic chain — not a real chain of narrators.", bn: "কৃত্রিম সনদ — প্রকৃত বর্ণনাকারীর ধারা নয়।" },
    text: textFor(n),
    searchText: searchTextFor(n),
    translationAttribution: attributionFor(n),
    narratorLabel: { ar: "راوٍ اصطناعي", en: "Synthetic narrator", bn: "কৃত্রিম বর্ণনাকারী" },
    grade: null, // A grade is an attributed claim; a fixture has no grader.
    sourceUrl: null,
    auditStatus: "synthetic-unreviewed",
    repeatOfOccurrenceId: null,
  };
}

/**
 * ExternalReference -- the displayed number a reader recognises, kept OFF
 * identity (schema §2). Many schemes per occurrence are allowed; these are
 * synthetic schemes naming synthetic editions.
 */
export const EXTERNAL_REFERENCES = Object.freeze(
  OCCURRENCES.map((o, i) => ({
    externalReferenceId: `syn-ref-${pad(i + 1)}`,
    occurrenceId: o.occurrenceId,
    scheme: "synthetic-sequential",
    displayedNumber: String(i + 1),
    locator: `${o.editionId}#${o.sourceOrder}`,
    synthetic: true,
  })),
);

export const TOPICS = Object.freeze([
  {
    topicId: "synthetic-topic-salah", synthetic: true,
    label: { ar: "الصلاة", en: "Ṣalāh", bn: "নামাজ" },
    synonyms: { en: ["prayer", "salat", "salah"], bn: ["নামাজ", "সালাত"], ar: ["صلاة", "الصلاة"] },
    taxonomyRevision: TAXONOMY_REVISION,
  },
]);

/**
 * A topic mapping is an ADDITIONAL INDEX, never a rewritten source book
 * (schema §4). It points at a chapter OR a single occurrence, carries its own
 * rationale and review status, and records the taxonomy revision it was made
 * under -- so a count taken before a re-filing is distinguishable from one
 * taken after.
 *
 * Note `reviewStatus: "unreviewed"` throughout: a synthetic mapping has had no
 * scholarly review, and saying so is the point.
 */
export const TOPIC_MAPPINGS = Object.freeze([
  { topicMappingId: "syn-map-0001", topicId: "synthetic-topic-salah", targetType: "bookChapter", targetId: "synthetic-alpha-b1-c2",
    rationale: "Chapter heading names the times of prayer.", reviewStatus: "unreviewed", reviewer: null, taxonomyRevision: TAXONOMY_REVISION, synthetic: true },
  { topicMappingId: "syn-map-0002", topicId: "synthetic-topic-salah", targetType: "bookChapter", targetId: "synthetic-alpha-b2",
    rationale: "Whole book is about prayer.", reviewStatus: "unreviewed", reviewer: null, taxonomyRevision: TAXONOMY_REVISION, synthetic: true },
  { topicMappingId: "syn-map-0003", topicId: "synthetic-topic-salah", targetType: "occurrence", targetId: "syn-occ-0007",
    rationale: "Single occurrence in a collection with no chapter level.", reviewStatus: "unreviewed", reviewer: null, taxonomyRevision: TAXONOMY_REVISION, synthetic: true },
]);
