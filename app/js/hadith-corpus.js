// Hadith H2 -- the pure read model over the pilot corpus.
//
// No Firestore, no network, no DOM. It is given records and returns derived
// views, so every rule below is testable without a browser.
//
// TWO RULES THIS MODULE EXISTS TO ENFORCE:
//
//   1. A LANGUAGE IS NEVER FABRICATED. When a translation is absent,
//      resolveText() falls back to the source language and SAYS SO, carrying
//      `isFallback` and the language it fell back from. It never returns
//      another language's text dressed as the one that was asked for, and it
//      never returns an empty string that a renderer would quietly print as a
//      blank line.
//   2. A REPEAT IS ITS OWN OCCURRENCE. Nothing here de-duplicates by text.
//      Two occurrences with identical text are two rows, counted twice in the
//      source view, because that is what the source says.

import {
  COLLECTIONS, EDITIONS, BOOK_CHAPTERS, OCCURRENCES, EXTERNAL_REFERENCES,
  TOPICS, TOPIC_MAPPINGS, TAXONOMY_REVISION,
} from "./hadith-fixture-data.js";

export const SOURCE_LANGUAGE = "ar";
export const CONTENT_LANGUAGES = Object.freeze(["ar", "en", "bn"]);

const byId = (rows, key) => new Map(rows.map((r) => [r[key], r]));
const EDITION_BY_ID = byId(EDITIONS, "editionId");
const CHAPTER_BY_ID = byId(BOOK_CHAPTERS, "bookChapterId");
const OCCURRENCE_BY_ID = byId(OCCURRENCES, "occurrenceId");

const ordered = (rows) => [...rows].sort((a, b) => a.sourceOrder - b.sourceOrder);

/**
 * Ordering for a list that may SPAN editions -- search results, a topic index.
 *
 * `sourceOrder` is scoped to its own parent, so two editions both start at 1
 * and sorting a mixed list by it alone interleaves them: collection Beta's
 * first narration lands between collection Alpha's first and second. Found by
 * a test rather than by reading, which is why it is a named comparator now and
 * not an inline `sort`.
 */
const EDITION_POSITION = new Map(EDITIONS.map((e, i) => [e.editionId, i]));
function compareBySourcePosition(a, b) {
  const ed = (EDITION_POSITION.get(a.editionId) ?? 0) - (EDITION_POSITION.get(b.editionId) ?? 0);
  return ed !== 0 ? ed : a.sourceOrder - b.sourceOrder;
}
const orderedAcrossEditions = (rows) => [...rows].sort(compareBySourcePosition);

// ---------------------------------------------------------------------------
// The source view -- collection -> book -> chapter (if the edition has one)
// -> occurrence, in the edition's own order, always.
// ---------------------------------------------------------------------------

export function listCollections() {
  return COLLECTIONS.map((c) => ({
    ...c,
    editions: EDITIONS.filter((e) => e.collectionId === c.collectionId),
  }));
}

export function editionOf(editionId) {
  return EDITION_BY_ID.get(editionId) ?? null;
}

/** Top-level books of an edition, in source order. */
export function booksOf(editionId) {
  return ordered(BOOK_CHAPTERS.filter((b) => b.editionId === editionId && b.parentId === null));
}

/** Chapters of a book, in source order. Empty for an edition with no chapter level -- which is a legitimate shape, not a gap. */
export function chaptersOf(bookChapterId) {
  return ordered(BOOK_CHAPTERS.filter((c) => c.parentId === bookChapterId));
}

/** True when this edition has no chapter level at all, so a browser should step book -> occurrence. */
export function editionHasChapterLevel(editionId) {
  return editionOf(editionId)?.hasChapterLevel === true;
}

/** Occurrences filed directly under this book or chapter, in source order. */
export function occurrencesIn(bookChapterId) {
  return ordered(OCCURRENCES.filter((o) => o.bookChapterId === bookChapterId));
}

export function occurrenceById(occurrenceId) {
  return OCCURRENCE_BY_ID.get(occurrenceId) ?? null;
}

export function chapterById(bookChapterId) {
  return CHAPTER_BY_ID.get(bookChapterId) ?? null;
}

/** The full source path of an occurrence, for a breadcrumb or a citation. */
export function sourcePathOf(occurrenceId) {
  const occ = occurrenceById(occurrenceId);
  if (!occ) return null;
  const edition = editionOf(occ.editionId);
  const collection = COLLECTIONS.find((c) => c.collectionId === edition?.collectionId) ?? null;
  const node = chapterById(occ.bookChapterId) ?? null;
  const parent = node?.parentId ? chapterById(node.parentId) : null;
  // parent is the book when `node` is a chapter; when the edition has no
  // chapter level, `node` IS the book and there is no parent.
  return {
    collection, edition,
    book: parent ?? node,
    chapter: parent ? node : null,
    occurrence: occ,
  };
}

export function externalReferencesFor(occurrenceId) {
  return EXTERNAL_REFERENCES.filter((r) => r.occurrenceId === occurrenceId);
}

// ---------------------------------------------------------------------------
// Language resolution -- never fabricate, always label
// ---------------------------------------------------------------------------

/**
 * The text of an occurrence in the requested language.
 *
 * Returns `{ lang, text, isFallback, requestedLang, attribution }`.
 * `isFallback` true means the requested language is genuinely unavailable and
 * the SOURCE language is being shown instead, which the UI must say out loud.
 * Returns null text only when even the source is missing, which is a data
 * defect rather than a fallback, and is reported as `missing: true`.
 */
export function resolveText(occurrence, requestedLang) {
  if (!occurrence) return null;
  const wanted = CONTENT_LANGUAGES.includes(requestedLang) ? requestedLang : SOURCE_LANGUAGE;
  const direct = occurrence.text?.[wanted] ?? null;
  if (direct) {
    return {
      lang: wanted, text: direct, isFallback: false, requestedLang: wanted, missing: false,
      attribution: wanted === SOURCE_LANGUAGE ? null : (occurrence.translationAttribution?.[wanted] ?? null),
    };
  }
  const source = occurrence.text?.[SOURCE_LANGUAGE] ?? null;
  return {
    lang: SOURCE_LANGUAGE, text: source, isFallback: true, requestedLang: wanted,
    missing: source === null, attribution: null,
  };
}

/** Which content languages this occurrence genuinely has. Used to render an honest availability row. */
export function availableLanguages(occurrence) {
  return CONTENT_LANGUAGES.filter((l) => !!occurrence?.text?.[l]);
}

// ---------------------------------------------------------------------------
// Search -- over all three content languages, original AND normalised forms
// kept distinct (schema §5)
// ---------------------------------------------------------------------------

/** Arabic diacritics and tatweel, stripped for matching only. The stored source text is never altered. */
function normaliseArabic(s) {
  return s.replace(/[ً-ْـ]/g, "");
}

function haystack(occurrence, lang) {
  const original = occurrence.text?.[lang] ?? "";
  const normalised = occurrence.searchText?.[lang] ?? "";
  const extra = lang === SOURCE_LANGUAGE ? normaliseArabic(original) : original.toLowerCase();
  return `${original}\n${normalised}\n${extra}`;
}

/** The source headings above an occurrence -- its chapter's, and its book's. */
function headingHaystack(occurrence, lang) {
  const path = sourcePathOf(occurrence.occurrenceId);
  return [path?.chapter?.title?.[lang], path?.book?.title?.[lang]].filter(Boolean).join("\n");
}

function matchesIn(hay, needle, needleAr, lang) {
  if (!hay) return false;
  if (hay.toLowerCase().includes(needle)) return true;
  return lang === SOURCE_LANGUAGE && normaliseArabic(hay).includes(needleAr);
}

/**
 * Every occurrence matching `query`, in any of `langs`.
 *
 * WHERE a result matched is reported, not just that it did: `matchedLangs` is
 * the narration text, `matchedHeadingLangs` the source heading above it. A
 * reader searching "prayer" and landing on a narration whose own text never
 * says "prayer" deserves to be told it matched the chapter heading -- and a
 * corpus search that silently conflated the two would make a heading look
 * like narration content.
 *
 * Order is source order, never relevance: a corpus browser that reorders the
 * source is lying about the source.
 */
export function searchCorpus(query, { langs = CONTENT_LANGUAGES, limit = 50, includeHeadings = true } = {}) {
  const q = (query ?? "").trim();
  if (!q) return { query: q, results: [], truncated: false };
  const needle = q.toLowerCase();
  const needleAr = normaliseArabic(q);

  const hits = [];
  for (const occ of orderedAcrossEditions(OCCURRENCES)) {
    const inText = langs.filter((lang) => matchesIn(haystack(occ, lang), needle, needleAr, lang));
    const inHeading = includeHeadings
      ? langs.filter((lang) => matchesIn(headingHaystack(occ, lang), needle, needleAr, lang))
      : [];
    if (inText.length || inHeading.length) {
      hits.push({ occurrence: occ, matchedLangs: inText, matchedHeadingLangs: inHeading });
    }
  }
  // Ask for one more than the cap, so truncation is reported rather than guessed.
  return { query: q, results: hits.slice(0, limit), truncated: hits.length > limit };
}

// ---------------------------------------------------------------------------
// The topic view -- an ADDITIONAL index, never a rewritten book
// ---------------------------------------------------------------------------

export function listTopics() { return TOPICS; }

/**
 * Everything a topic points at, grouped by collection so the cross-collection
 * nature is visible rather than flattened away.
 *
 * Each entry keeps its own source heading beside the topic (plan §3.1), names
 * whether it came from a chapter mapping or a single-occurrence mapping, and
 * carries the mapping's `reviewStatus` -- an unreviewed mapping must never
 * present as a reviewed one.
 *
 * `taxonomyRevision` is returned with the result, because topic membership can
 * change and a count is only meaningful beside the revision it was taken under.
 */
export function topicIndex(topicId) {
  const topic = TOPICS.find((t) => t.topicId === topicId) ?? null;
  if (!topic) return null;
  const mappings = TOPIC_MAPPINGS.filter((m) => m.topicId === topicId);

  const groups = new Map();
  const seenOccurrenceIds = new Set();
  let duplicateMappings = 0;

  for (const m of mappings) {
    const targets = m.targetType === "occurrence"
      ? [occurrenceById(m.targetId)].filter(Boolean)
      : occurrencesUnder(m.targetId);

    for (const occ of targets) {
      // One occurrence reachable by two mappings is counted ONCE for
      // "distinct occurrences" and reported separately -- the plan requires
      // distinct and total counts to be explicit, not implied.
      if (seenOccurrenceIds.has(occ.occurrenceId)) { duplicateMappings++; continue; }
      seenOccurrenceIds.add(occ.occurrenceId);

      const path = sourcePathOf(occ.occurrenceId);
      const key = path.collection.collectionId;
      if (!groups.has(key)) groups.set(key, { collection: path.collection, entries: [] });
      groups.get(key).entries.push({
        occurrence: occ, path,
        sourceHeading: path.chapter?.title ?? path.book?.title ?? null,
        viaMappingId: m.topicMappingId,
        viaTargetType: m.targetType,
        reviewStatus: m.reviewStatus,
        rationale: m.rationale,
      });
    }
  }

  const collections = [...groups.values()];
  for (const g of collections) g.entries.sort((a, b) => a.occurrence.sourceOrder - b.occurrence.sourceOrder);

  return {
    topic,
    taxonomyRevision: TAXONOMY_REVISION,
    collections,
    distinctOccurrences: seenOccurrenceIds.size,
    mappingCount: mappings.length,
    occurrencesReachedByMoreThanOneMapping: duplicateMappings,
    allMappingsReviewed: mappings.every((m) => m.reviewStatus === "reviewed"),
  };
}

/** Every occurrence under a book or chapter, descending one level only -- the hierarchy here is at most book -> chapter -> occurrence. */
function occurrencesUnder(bookChapterId) {
  const direct = occurrencesIn(bookChapterId);
  const children = chaptersOf(bookChapterId);
  const nested = children.flatMap((c) => occurrencesIn(c.bookChapterId));
  return ordered([...direct, ...nested]);
}

export { occurrencesUnder, compareBySourcePosition };

/**
 * EXPLORE AGGREGATION -- demo only, over synthetic fixtures.
 *
 * H2-B. This counts the source hierarchy and the topic taxonomy and NOTHING
 * else. It deliberately reports no progress, no completion and no claim:
 *
 *   - Track is a plain Map cleared by a reload (hadith-browser.js), so any
 *     figure derived from it would be a number invented by the last few
 *     clicks. Inferring completion from a temporary control is exactly the
 *     misleading claim the instruction forbids, so `tracked` is reported as
 *     UNAVAILABLE rather than as zero. I7's own principle: a thing that is
 *     not applicable is excluded, never counted as nought.
 *   - Nothing here reads `records`, `activity`, a `chunkKey` or a
 *     `trackableId`, and no Approach is named. A Hadith Approach registry
 *     does not exist yet; see the H2-B registry PROPOSAL.
 *
 * DISTINCT OCCURRENCES ARE NOT THE MAPPING COUNT, and the two are reported
 * separately everywhere because they answer different questions. A topic may
 * be mapped at chapter level AND at occurrence level, so one narration can be
 * reached by more than one mapping; adding the mappings up would double-count
 * it, and reporting only the distinct total would hide how much curation the
 * index rests on. A repeat narration is its OWN occurrence (it has its own id
 * and its own place in the source order), so it counts once per occurrence,
 * never merged by text.
 */
export function exploreAggregate() {
  const collections = listCollections().map((c) => {
    const editions = EDITIONS.filter((e) => e.collectionId === c.collectionId).map((ed) => {
      const books = booksOf(ed.editionId);
      const occurrencesInEdition = OCCURRENCES.filter((o) => o.editionId === ed.editionId);
      return {
        editionId: ed.editionId,
        hasChapterLevel: editionHasChapterLevel(ed.editionId),
        books: books.length,
        chapters: books.reduce((n, b) => n + chaptersOf(b.bookChapterId).length, 0),
        occurrences: occurrencesInEdition.length,
        // A repeat is a distinct occurrence. Reported separately so the
        // source's own shape stays visible rather than being tidied away.
        repeats: occurrencesInEdition.filter((o) => o.repeatOfOccurrenceId).length,
      };
    });
    return {
      collectionId: c.collectionId,
      editions,
      occurrences: editions.reduce((n, e) => n + e.occurrences, 0),
    };
  });

  const topics = listTopics().map((t) => {
    const idx = topicIndex(t.topicId);
    const listed = idx ? idx.collections.reduce((n, g) => n + g.entries.length, 0) : 0;
    return {
      topicId: t.topicId,
      taxonomyRevision: t.taxonomyRevision,
      // The two totals, never collapsed into one.
      distinctOccurrences: idx ? idx.distinctOccurrences : 0,
      mappingCount: idx ? idx.mappingCount : 0,
      // How many rows the index actually LISTS, and how many of those are the
      // same narration reached twice. Measured, not inferred: the first draft
      // of this computed "overlap" as mappingCount - distinctOccurrences,
      // which is meaningless here and was the wrong way round. A mapping may
      // target a whole book or chapter, so THREE mappings reach FIVE
      // narrations -- mappings are usually FEWER than narrations, not more.
      // Genuine double-reach (a chapter mapped, and a narration inside it
      // mapped as well) is possible and is what this measures; in the current
      // fixture it is zero, and saying so is better than implying otherwise.
      listedEntries: listed,
      duplicateReaches: listed - (idx ? idx.distinctOccurrences : 0),
      allMappingsReviewed: idx ? idx.allMappingsReviewed : false,
      spansCollections: idx ? idx.collections.length : 0,
    };
  });

  return {
    synthetic: true,
    taxonomyRevision: TAXONOMY_REVISION,
    collections,
    totals: {
      collections: collections.length,
      editions: collections.reduce((n, c) => n + c.editions.length, 0),
      occurrences: collections.reduce((n, c) => n + c.occurrences, 0),
      repeats: collections.reduce((n, c) => n + c.editions.reduce((m, e) => m + e.repeats, 0), 0),
      topics: topics.length,
    },
    topics,
    // Not zero, and not a number at all: there is no durable progress to read.
    progress: { available: false, reason: "no-durable-hadith-progress" },
  };
}

/**
 * TRANSLATION COVERAGE -- per edition and overall, how many occurrences carry
 * an English or a Bangla version alongside the Arabic source.
 *
 * This reads only `availableLanguages()`, the same per-occurrence fact the
 * reader's own language-fallback label already depends on (schema §1: a
 * language is never fabricated). It counts the FIXTURE's own coverage, not
 * any claim, tracked state or progress -- there is no Approach, no
 * `trackableId` and nothing durable in reach here, the same boundary
 * `exploreAggregate()` holds.
 */
export function translationCoverage() {
  const perEdition = EDITIONS.map((ed) => {
    const occurrences = OCCURRENCES.filter((o) => o.editionId === ed.editionId);
    const withLang = (lang) => occurrences.filter((o) => availableLanguages(o).includes(lang)).length;
    return {
      editionId: ed.editionId,
      collectionId: ed.collectionId,
      occurrences: occurrences.length,
      withEnglish: withLang("en"),
      withBangla: withLang("bn"),
    };
  });
  return {
    perEdition,
    totals: {
      occurrences: perEdition.reduce((n, e) => n + e.occurrences, 0),
      withEnglish: perEdition.reduce((n, e) => n + e.withEnglish, 0),
      withBangla: perEdition.reduce((n, e) => n + e.withBangla, 0),
    },
  };
}
