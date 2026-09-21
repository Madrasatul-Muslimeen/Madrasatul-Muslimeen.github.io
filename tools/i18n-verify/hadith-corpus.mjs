// Hadith H2 -- the corpus read model, and the GATES it must not cross.
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  listCollections, booksOf, chaptersOf, occurrencesIn, editionHasChapterLevel,
  occurrenceById, chapterById, sourcePathOf, externalReferencesFor, resolveText, availableLanguages,
  searchCorpus, listTopics, topicIndex, exploreAggregate, translationCoverage, topicCoverage,
  CONTENT_LANGUAGES, SOURCE_LANGUAGE,
} from "../../app/js/hadith-corpus.js";
import {
  OCCURRENCES, SYNTHETIC_NOTICE, TAXONOMY_REVISION,
  COLLECTIONS, EDITIONS, BOOK_CHAPTERS, TOPICS, TOPIC_MAPPINGS,
} from "../../app/js/hadith-fixture-data.js";

const root = path.resolve(process.argv[2] || process.cwd());
const appJs = path.join(root, "app", "js");
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

const HADITH_MODULES = ["hadith-fixture-data.js", "hadith-corpus.js", "hadith-commentary.js", "hadith-browser.js"];
/** Source with comments stripped -- a module's own doc comment names the things it must never do, in order to say so. */
function codeOf(name) {
  return fs.readFileSync(path.join(appJs, name), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !/^\s*(?:\/\/|\*)/.test(l)).join("\n");
}

check("POSITIVE CONTROL -- the fixture really loaded", () => {
  assert.equal(OCCURRENCES.length, 8);
  assert.equal(listCollections().length, 2);
  assert.ok(codeOf("hadith-corpus.js").length > 2000, "codeOf() returned almost nothing; the comment stripper is broken");
});

// ---------------------------------------------------------------------------
// THE CLOSED GATES, enforced mechanically
// ---------------------------------------------------------------------------

check("GATE -- no Hadith module builds a `hadith:` permanent unit key", () => {
  // The H2 instruction holds `buildUnitKey.hadith` semantics closed. A key
  // built anywhere here could reach a durable write, so none is built at all.
  const offenders = [];
  for (const m of HADITH_MODULES) {
    const code = codeOf(m);
    if (/buildUnitKey/.test(code)) offenders.push(`${m} references buildUnitKey`);
    if (/["'`]hadith:/.test(code)) offenders.push(`${m} contains a hadith: key literal`);
  }
  assert.deepEqual(offenders, [], offenders.join(" | "));
});

check("GATE -- no Hadith module can reach Firestore or a write path", () => {
  const forbidden = ["firebasejs", "firebase-init", "firestore", "runTransaction", "setDoc", "updateDoc",
    "addDoc", "writeBatch", "arrayUnion", "records.js", "activity.js", "note-foundation.js", "claimStatus"];
  const offenders = [];
  for (const m of HADITH_MODULES) {
    const code = codeOf(m);
    for (const f of forbidden) if (code.includes(f)) offenders.push(`${m} -> ${f}`);
  }
  assert.deepEqual(offenders, [], `a Hadith module reaches a persistence path: ${offenders.join(" | ")}`);
});

check("GATE -- every fixture record is marked synthetic, and every id is prefixed", () => {
  for (const o of OCCURRENCES) {
    assert.equal(o.synthetic, true, `${o.occurrenceId} is not marked synthetic`);
    assert.ok(o.occurrenceId.startsWith("syn-"), `${o.occurrenceId} is not prefixed`);
    assert.ok(o.editionId.startsWith("synthetic-"), `${o.editionId} is not prefixed`);
  }
  for (const c of listCollections()) assert.ok(c.collectionId.startsWith("synthetic-"), c.collectionId);
});

// The synthetic namespace, stated ONCE and read by the three checks below.
// Two prefixes are in use, not one: the hierarchy and taxonomy ids carry
// `synthetic-`, while the two row-level id families carry their documented
// `syn-` forms. This table IS the rule -- a fixture id family that is not
// named here fails the sweep rather than passing unnoticed.
const SYNTHETIC_ID_PREFIXES = Object.freeze({
  collectionId: "synthetic-",
  editionId: "synthetic-",
  bookId: "synthetic-",
  chapterId: "synthetic-",
  topicId: "synthetic-",
  occurrenceId: "syn-occ-",
  topicMappingId: "syn-map-",
});

// Every id the fixture actually carries, gathered by walking the exports
// rather than by listing values -- so a new row or a new collection joins
// the sweep automatically instead of being silently exempt.
function everyFixtureId() {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && Object.hasOwn(SYNTHETIC_ID_PREFIXES, k)) found.push([k, v]);
      else if (v && typeof v === "object") walk(v);
    }
  };
  walk([COLLECTIONS, EDITIONS, BOOK_CHAPTERS, OCCURRENCES, TOPICS, TOPIC_MAPPINGS]);
  return found;
}

check("GATE -- EVERY fixture id carries a permitted synthetic prefix, id family by id family", () => {
  const ids = everyFixtureId();
  // Positive control: a sweep that gathered nothing would pass every case
  // below vacuously, which is exactly how this class of guard rots.
  assert.ok(ids.length >= 20, `the id sweep found only ${ids.length} ids -- it is not reading the fixture`);
  const families = new Set(ids.map(([k]) => k));
  for (const f of ["topicId", "topicMappingId", "occurrenceId", "editionId", "collectionId"]) {
    assert.ok(families.has(f), `the sweep never saw a ${f} -- it cannot be asserting anything about it`);
  }
  const offenders = ids
    .filter(([k, v]) => !v.startsWith(SYNTHETIC_ID_PREFIXES[k]))
    .map(([k, v]) => `${k}="${v}" (needs "${SYNTHETIC_ID_PREFIXES[k]}")`);
  assert.deepEqual(offenders, [], `fixture ids outside the synthetic namespace: ${offenders.join(" | ")}`);
});

check("GATE -- the synthetic namespace cannot collide with a future REAL id", () => {
  // The whole point of a prefix is that a real import can never mint an id
  // this fixture already holds. These are ids a real reviewed taxonomy or a
  // real edition import would plausibly produce -- none may exist here.
  // `topic-salah` is in this list because the fixture really did hold it.
  const PLAUSIBLE_REAL_IDS = [
    "topic-salah", "topic-zakah", "topic-sawm", "salah",
    "bukhari", "muslim", "bukhari-1422h", "muslim-1955h",
    "map-0001", "occ-0001", "b1", "b1-c2",
  ];
  const held = new Set(everyFixtureId().map(([, v]) => v));
  const collisions = PLAUSIBLE_REAL_IDS.filter((r) => held.has(r));
  assert.deepEqual(collisions, [], `a fixture id is also a plausible real id: ${collisions.join(", ")}`);

  // And the rule that makes that true in general: strip the synthetic prefix
  // off any fixture id and the bare form must NOT itself be a fixture id, or
  // the two namespaces overlap.
  const bare = everyFixtureId()
    .map(([k, v]) => v.slice(SYNTHETIC_ID_PREFIXES[k].length))
    .filter((b) => held.has(b));
  assert.deepEqual(bare, [], `synthetic and bare namespaces overlap: ${bare.join(", ")}`);
});

check("GATE -- every topic mapping points at a topic that exists, by id", () => {
  // A half-finished rename leaves a mapping naming a topic nothing defines.
  // The index would then be empty and still look structurally fine.
  const topicIds = new Set(TOPICS.map((t) => t.topicId));
  assert.ok(topicIds.size > 0, "no topics at all -- nothing to point at");
  assert.ok(TOPIC_MAPPINGS.length > 0, "no mappings at all -- this check would pass vacuously");
  const dangling = TOPIC_MAPPINGS
    .filter((m) => !topicIds.has(m.topicId))
    .map((m) => `${m.topicMappingId} -> ${m.topicId}`);
  assert.deepEqual(dangling, [], `mapping names a topic that does not exist: ${dangling.join(" | ")}`);
  // ...and the index really resolves for every topic, not just structurally.
  for (const t of TOPICS) {
    const idx = topicIndex(t.topicId);
    assert.ok(idx, `topicIndex("${t.topicId}") returned null -- the id does not resolve`);
    assert.ok(idx.distinctOccurrences > 0, `topicIndex("${t.topicId}") resolved to nothing`);
  }
});

check("GATE -- the Arabic source text itself denies being a hadith", () => {
  // A `synthetic: true` flag a renderer forgets to show does not survive a
  // copy-paste or a screenshot. The text does.
  for (const o of OCCURRENCES) {
    assert.ok(o.text.ar.includes("ليس حديثاً") || o.text.ar.includes("وليس حديثاً"),
      `${o.occurrenceId}'s Arabic does not deny being a hadith: ${o.text.ar}`);
  }
  assert.ok(SYNTHETIC_NOTICE.ar.includes("ليست أحاديث"));
  assert.ok(/not real narrations/i.test(SYNTHETIC_NOTICE.en));
  assert.ok(SYNTHETIC_NOTICE.bn.includes("প্রকৃত হাদিস নয়"));
});

check("GATE -- no fixture carries a grade, a real narrator or a source URL", () => {
  for (const o of OCCURRENCES) {
    assert.equal(o.grade, null, `${o.occurrenceId} carries a grade; a fixture has no grader to attribute it to`);
    assert.equal(o.sourceUrl, null, `${o.occurrenceId} points at a source`);
    assert.equal(o.auditStatus, "synthetic-unreviewed");
  }
});

// ---------------------------------------------------------------------------
// The source view
// ---------------------------------------------------------------------------

check("source order is preserved, never re-sorted", () => {
  const occ = occurrencesIn("synthetic-alpha-b1-c1").map((o) => o.occurrenceId);
  assert.deepEqual(occ, ["syn-occ-0001", "syn-occ-0002"]);
  assert.deepEqual(booksOf("synthetic-alpha-ar-v1").map((b) => b.sourceOrder), [1, 2]);
  assert.deepEqual(chaptersOf("synthetic-alpha-b1").map((c) => c.sourceOrder), [1, 2]);
});

check("an edition with no chapter level is a shape, not a gap", () => {
  assert.equal(editionHasChapterLevel("synthetic-beta-ar-v1"), false);
  assert.equal(editionHasChapterLevel("synthetic-alpha-ar-v1"), true);
  assert.deepEqual(chaptersOf("synthetic-beta-b1"), []);
  assert.equal(occurrencesIn("synthetic-beta-b1").length, 2, "its occurrences hang off the book directly");
});

check("a REPEAT is its own occurrence and is never merged by text", () => {
  const a = occurrenceById("syn-occ-0005"), b = occurrenceById("syn-occ-0006");
  assert.equal(a.text.ar, b.text.ar, "the fixture's point is that the text is identical");
  assert.notEqual(a.occurrenceId, b.occurrenceId);
  assert.equal(b.repeatOfOccurrenceId, "syn-occ-0005");
  assert.equal(occurrencesIn("synthetic-alpha-b2-c1").length, 2, "both are listed; de-duplication would hide the source");
});

check("the displayed number is a REFERENCE, never the identity", () => {
  const refs = externalReferencesFor("syn-occ-0001");
  assert.equal(refs.length, 1);
  assert.equal(refs[0].scheme, "synthetic-sequential");
  assert.ok(!refs[0].occurrenceId.includes(refs[0].displayedNumber) || refs[0].occurrenceId.startsWith("syn-occ-"),
    "identity must not be derived from the displayed number");
});

check("the source path names collection, edition, book and chapter", () => {
  const p = sourcePathOf("syn-occ-0005");
  assert.equal(p.collection.collectionId, "synthetic-alpha");
  assert.equal(p.book.bookChapterId, "synthetic-alpha-b2");
  assert.equal(p.chapter.bookChapterId, "synthetic-alpha-b2-c1");
  // In an edition with no chapter level, `book` is the node and chapter is null.
  const q = sourcePathOf("syn-occ-0007");
  assert.equal(q.book.bookChapterId, "synthetic-beta-b1");
  assert.equal(q.chapter, null);
});

// ---------------------------------------------------------------------------
// Language -- never fabricate
// ---------------------------------------------------------------------------

check("a missing translation falls back to the SOURCE and says so", () => {
  const occ = occurrenceById("syn-occ-0008");
  assert.equal(occ.text.bn, null, "the fixture's own gap");
  const r = resolveText(occ, "bn");
  assert.equal(r.isFallback, true);
  assert.equal(r.lang, SOURCE_LANGUAGE);
  assert.equal(r.requestedLang, "bn");
  assert.equal(r.missing, false);
  assert.equal(r.text, occ.text.ar, "it returns the SOURCE, never another translation dressed as Bangla");
  assert.equal(r.attribution, null);
});

check("a present translation is never marked as a fallback, and is attributed", () => {
  const r = resolveText(occurrenceById("syn-occ-0001"), "bn");
  assert.equal(r.isFallback, false);
  assert.equal(r.lang, "bn");
  assert.ok(r.attribution?.translator, "a translation must name who made it");
});

check("availableLanguages tells the truth about the gap", () => {
  assert.deepEqual(availableLanguages(occurrenceById("syn-occ-0008")), ["ar", "en"]);
  assert.deepEqual(availableLanguages(occurrenceById("syn-occ-0001")), CONTENT_LANGUAGES);
});

check("an unknown requested language falls back to the source rather than throwing", () => {
  const r = resolveText(occurrenceById("syn-occ-0001"), "fr");
  assert.equal(r.lang, SOURCE_LANGUAGE);
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

check("search works in all three languages", () => {
  assert.equal(searchCorpus("prayer").results.length, 4);
  assert.equal(searchCorpus("صلاة").results.length, 4);
  assert.equal(searchCorpus("নামাজ").results.length, 4);
});

check("search says WHERE it matched -- text or source heading", () => {
  const byHeading = searchCorpus("prayer").results[0];
  assert.deepEqual(byHeading.matchedLangs, [], "no occurrence text says 'prayer'");
  assert.ok(byHeading.matchedHeadingLangs.includes("en"));
  const byText = searchCorpus("نص العينة").results[0];
  assert.ok(byText.matchedLangs.includes("ar"));
});

check("search returns SOURCE order across editions, never relevance order", () => {
  // sourceOrder is scoped to its own parent, so a cross-edition list must be
  // ordered by (edition, sourceOrder). Sorting by sourceOrder alone interleaved
  // the two collections -- this check is what found that.
  const hits = searchCorpus("نص العينة").results.map((h) => h.occurrence);
  const editions = hits.map((o) => o.editionId);
  const firstBeta = editions.indexOf("synthetic-beta-ar-v1");
  assert.ok(firstBeta > 0, "both editions must appear");
  assert.ok(editions.slice(0, firstBeta).every((e) => e === "synthetic-alpha-ar-v1"),
    `the editions interleave: ${editions.join(",")}`);
  assert.ok(editions.slice(firstBeta).every((e) => e === "synthetic-beta-ar-v1"),
    `the editions interleave: ${editions.join(",")}`);
  for (const group of [hits.slice(0, firstBeta), hits.slice(firstBeta)]) {
    const orders = group.map((o) => o.sourceOrder);
    assert.deepEqual([...orders].sort((a, b) => a - b), orders, `out of source order: ${orders.join(",")}`);
  }
});

check("an empty query returns nothing rather than everything", () => {
  assert.deepEqual(searchCorpus("   ").results, []);
});

check("truncation is reported by asking for one more than the cap", () => {
  const r = searchCorpus("نص العينة", { limit: 3 });
  assert.equal(r.results.length, 3);
  assert.equal(r.truncated, true);
});

// ---------------------------------------------------------------------------
// The topic view
// ---------------------------------------------------------------------------

check("the topic index spans collections and keeps the source heading", () => {
  const idx = topicIndex("synthetic-topic-salah");
  assert.equal(idx.collections.length, 2, "Salah must reach BOTH collections");
  for (const g of idx.collections) for (const e of g.entries) {
    assert.ok(e.sourceHeading, "the source heading must stay visible beside the mapped topic");
  }
});

check("distinct occurrences and mapping count are reported SEPARATELY", () => {
  const idx = topicIndex("synthetic-topic-salah");
  assert.equal(idx.mappingCount, 3);
  assert.equal(idx.distinctOccurrences, 5);
  const seen = idx.collections.flatMap((g) => g.entries.map((e) => e.occurrence.occurrenceId));
  assert.equal(new Set(seen).size, seen.length, "an occurrence was listed twice");
});

check("the taxonomy revision travels with the result", () => {
  assert.equal(topicIndex("synthetic-topic-salah").taxonomyRevision, TAXONOMY_REVISION);
});

check("unreviewed mappings are reported as unreviewed", () => {
  const idx = topicIndex("synthetic-topic-salah");
  assert.equal(idx.allMappingsReviewed, false);
  for (const g of idx.collections) for (const e of g.entries) {
    assert.equal(e.reviewStatus, "unreviewed", "a synthetic mapping must never present as reviewed");
  }
});

check("the topic index does not rewrite any book", () => {
  // Reading the topic view must leave the source view byte-identical.
  const before = occurrencesIn("synthetic-alpha-b2-c1").map((o) => o.occurrenceId);
  topicIndex("synthetic-topic-salah");
  assert.deepEqual(occurrencesIn("synthetic-alpha-b2-c1").map((o) => o.occurrenceId), before);
});

check("an unknown topic returns null rather than an empty index that looks real", () => {
  assert.equal(topicIndex("topic-nope"), null);
});

check("EXPLORE -- the aggregate counts the SOURCE, and never counts progress", () => {
  const a = exploreAggregate();
  assert.equal(a.synthetic, true, "an aggregate over synthetic fixtures must say so");
  assert.equal(a.totals.collections, 2);
  assert.equal(a.totals.editions, 2);
  assert.equal(a.totals.occurrences, OCCURRENCES.length, "the total must be the real occurrence count");
  // Progress is UNAVAILABLE, not zero. A zero would read as "nothing studied".
  assert.equal(a.progress.available, false);
  assert.equal(typeof a.progress.count, "undefined", "no progress number may be produced at all");
});

check("EXPLORE -- distinct narrations and topic mappings are reported SEPARATELY", () => {
  const a = exploreAggregate();
  const salah = a.topics.find((x) => x.topicId === "synthetic-topic-salah");
  assert.ok(salah, "the synthetic topic is missing from the aggregate");
  // The fixture is built so these genuinely differ -- one narration is reached
  // by a chapter mapping AND by an occurrence mapping. If they were ever equal
  // the distinction this check exists for would be untestable.
  assert.notEqual(salah.distinctOccurrences, salah.mappingCount,
    "the fixture must keep these two figures different, or the overlap cannot be demonstrated");
  assert.equal(salah.distinctOccurrences, topicIndex("synthetic-topic-salah").distinctOccurrences);
  assert.equal(salah.mappingCount, topicIndex("synthetic-topic-salah").mappingCount);
  // MEASURED, not inferred. The first draft of this aggregate computed
  // "overlap" as mappingCount - distinctOccurrences and had the relationship
  // backwards: a mapping may target a whole book, so THREE mappings reach FIVE
  // narrations. Mappings are normally FEWER than narrations here.
  assert.ok(salah.mappingCount < salah.distinctOccurrences,
    "a book/chapter mapping reaches many narrations, so mappings should be fewer than narrations in this fixture");
  // Double-reach is what "distinct" actually guards against, and it is
  // measured off the listed rows rather than guessed from the two totals.
  assert.equal(salah.duplicateReaches, salah.listedEntries - salah.distinctOccurrences);
  assert.equal(salah.listedEntries, salah.distinctOccurrences,
    "no narration in this fixture is reached twice -- if that ever changes, the Explore wording must change with it");
  assert.equal(salah.taxonomyRevision, TAXONOMY_REVISION, "the revision must travel with the count");
  assert.equal(salah.allMappingsReviewed, false, "synthetic mappings must never aggregate as reviewed");
});

check("EXPLORE -- a repeat is counted as its own narration, never merged", () => {
  const a = exploreAggregate();
  assert.equal(a.totals.repeats, OCCURRENCES.filter((o) => o.repeatOfOccurrenceId).length);
  assert.ok(a.totals.repeats > 0, "the fixture must contain a repeat or this proves nothing");
  // The repeat is INSIDE the occurrence total, not additional to it.
  const summed = a.collections.reduce((n, c) => n + c.occurrences, 0);
  assert.equal(summed, a.totals.occurrences);
});

/**
 * A named export's own body, bounded at the NEXT top-level `export`, never to
 * end of file. `exploreAggregate`'s own guard once sliced to EOF, which was
 * silently correct only because it happened to be the last export in the
 * file -- adding `translationCoverage` after it pulled that function's own
 * doc comment (which names `trackableId` on purpose, to say it is absent)
 * into the slice, and the guard failed a check it had no business seeing.
 * Positive control: this must find a body that is shorter than the whole
 * remaining file whenever a later export exists.
 */
function exportedFunctionBody(code, name) {
  const start = code.indexOf(`export function ${name}`);
  assert.ok(start >= 0, `export function ${name} not found`);
  const next = code.indexOf("\nexport function", start + 1);
  return next === -1 ? code.slice(start) : code.slice(start, next);
}

check("EXPLORE -- the aggregate reaches no progress store of any kind", () => {
  // codeOf() strips comments -- both this function's own doc comment and the
  // NEXT export's leading doc comment name several of these words on purpose,
  // to say they are absent, and a raw-text slice would trip on either one.
  const full = codeOf("hadith-corpus.js");
  const body = exportedFunctionBody(full, "exploreAggregate");
  assert.ok(body.length < full.length, "the slice reached end of file -- it is not bounded to this function");
  for (const forbidden of ["records", "activity", "chunkKey", "trackableId", "approach_", "claimStatus", "demoTrack"]) {
    assert.ok(!body.includes(forbidden), `exploreAggregate reaches ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------
// Translation coverage -- MEASURED against the fixture, not guessed
// ---------------------------------------------------------------------------

check("COVERAGE -- English is present on every occurrence in this fixture, and the totals prove it", () => {
  const cov = translationCoverage();
  assert.equal(cov.totals.occurrences, OCCURRENCES.length);
  // The fixture's own gap (syn-occ-0008) is Bangla-only, per hadith-fixture-data.js's
  // own comment -- if that ever stops being the only gap, this figure must move
  // with it rather than staying a stale literal.
  const missingBangla = OCCURRENCES.filter((o) => !availableLanguages(o).includes("bn")).length;
  const missingEnglish = OCCURRENCES.filter((o) => !availableLanguages(o).includes("en")).length;
  assert.equal(cov.totals.withEnglish, OCCURRENCES.length - missingEnglish);
  assert.equal(cov.totals.withBangla, OCCURRENCES.length - missingBangla);
  assert.equal(missingBangla, 1, "the fixture's own documented gap (syn-occ-0008) must be exactly one occurrence");
});

check("COVERAGE -- per-edition figures sum to the totals, and every edition is present", () => {
  const cov = translationCoverage();
  assert.equal(cov.perEdition.length, EDITIONS.length);
  assert.equal(cov.perEdition.reduce((n, e) => n + e.occurrences, 0), cov.totals.occurrences);
  assert.equal(cov.perEdition.reduce((n, e) => n + e.withEnglish, 0), cov.totals.withEnglish);
  assert.equal(cov.perEdition.reduce((n, e) => n + e.withBangla, 0), cov.totals.withBangla);
  const beta = cov.perEdition.find((e) => e.editionId === "synthetic-beta-ar-v1");
  assert.ok(beta, "synthetic-beta-ar-v1 is missing from the coverage");
  assert.equal(beta.occurrences, 2);
  assert.equal(beta.withEnglish, 2, "both of Beta's occurrences have English");
  assert.equal(beta.withBangla, 1, "syn-occ-0008's own documented gap must show up on ITS edition, not just overall");
});

check("COVERAGE -- a Bangla gap can never be reported as covered", () => {
  const cov = translationCoverage();
  const beta = cov.perEdition.find((e) => e.editionId === "synthetic-beta-ar-v1");
  assert.ok(beta.withBangla < beta.occurrences, "the fixture's own gap must show up as less than full coverage");
});

check("COVERAGE -- reaches no persistence, claim or progress path", () => {
  const src = fs.readFileSync(path.join(appJs, "hadith-corpus.js"), "utf8");
  // Reads the CODE only (codeOf strips comments) -- the function's own doc
  // comment names several of these words on purpose, to say they are absent.
  const body = exportedFunctionBody(codeOf("hadith-corpus.js"), "translationCoverage");
  for (const forbidden of ["records", "activity", "chunkKey", "trackableId", "approach_", "claimStatus", "demoTrack"]) {
    assert.ok(!body.includes(forbidden), `translationCoverage reaches ${forbidden}`);
  }
});

check("COVERAGE -- the Explore renderer reads it, never re-derives it from scratch", () => {
  const src = codeOf("hadith-browser.js");
  assert.ok(/translationCoverage/.test(src), "hadith-browser.js does not call translationCoverage() at all");
  assert.ok(/import\s*\{[^}]*\btranslationCoverage\b[^}]*\}\s*from\s*["']\.\/hadith-corpus\.js["']/.test(src),
    "translationCoverage must be IMPORTED from hadith-corpus.js, not redefined locally");
});

// ---------------------------------------------------------------------------
// Integration merge (issue #114, 20 Sep 2026): translationCoverage() (PR #103)
// and topicCoverage() (PR #118) were built independently and each named its
// own per-edition dataset attribute `hadithCoverageEdition` -- a real
// collision, since both attach it to a row keyed by the SAME editionId for
// a DIFFERENT fact. A selector on the shared name would match two
// differently-shaped elements per edition once both features render. Split
// into `hadithTranslationCoverageEdition` and `hadithTopicCoverageEdition`
// at merge; this guards the split rather than assuming it stuck.
// ---------------------------------------------------------------------------

check("INTEGRATION -- translation- and topic-coverage per-edition rows no longer share one dataset attribute", () => {
  const src = codeOf("hadith-browser.js");
  assert.ok(/hadithTranslationCoverageEdition/.test(src),
    "renderTranslationCoverage() must set its own, unambiguous per-edition attribute");
  assert.ok(/hadithTopicCoverageEdition/.test(src),
    "renderTopicCoverage() must set its own, unambiguous per-edition attribute");
  assert.ok(!/dataset\.hadithCoverageEdition\b/.test(src),
    "the old shared attribute name must not still be assigned anywhere -- it is ambiguous between the two features");
});

check("INTEGRATION -- both coverage sections render in Explore, neither shadowing the other", () => {
  const src = codeOf("hadith-browser.js");
  assert.ok(/renderTranslationCoverage\(body\)/.test(src), "renderExplore must still call renderTranslationCoverage(body)");
  assert.ok(/renderTopicCoverage\(body\)/.test(src), "renderExplore must still call renderTopicCoverage(body)");
});

// ---------------------------------------------------------------------------
// Topic coverage -- corpus-wide "reached by ANY topic", not a per-topic count
// ---------------------------------------------------------------------------

check("TOPIC COVERAGE -- a covered occurrence is exactly one topicIndex() also lists", () => {
  const cov = topicCoverage();
  const listedByAnyTopic = new Set();
  for (const t of TOPICS) {
    const idx = topicIndex(t.topicId);
    for (const g of idx.collections) for (const e of g.entries) listedByAnyTopic.add(e.occurrence.occurrenceId);
  }
  assert.equal(cov.totals.covered, listedByAnyTopic.size,
    "topicCoverage() must resolve coverage through topicIndex() itself, never re-derive it");
});

check("TOPIC COVERAGE -- covered and uncovered partition the whole corpus, corpus-wide and per edition", () => {
  const cov = topicCoverage();
  assert.equal(cov.totals.occurrences, OCCURRENCES.length);
  assert.equal(cov.totals.covered + cov.totals.uncovered, cov.totals.occurrences,
    "covered + uncovered must equal every occurrence -- no narration may be double-counted or dropped");
  assert.ok(cov.totals.covered > 0, "the fixture has real mappings; a zero here would mean coverage was not computed");
  assert.ok(cov.totals.uncovered > 0, "the fixture is built with unmapped occurrences (syn-occ-0001/0002/0008); a zero here means the fixture changed or the computation is wrong");
  let summedOccurrences = 0, summedCovered = 0, summedUncovered = 0;
  for (const ed of cov.editions) {
    assert.equal(ed.covered + ed.uncovered, ed.occurrences, `${ed.editionId}: covered + uncovered must equal its own occurrence count`);
    summedOccurrences += ed.occurrences; summedCovered += ed.covered; summedUncovered += ed.uncovered;
  }
  assert.equal(summedOccurrences, cov.totals.occurrences, "per-edition occurrence counts must sum to the corpus total");
  assert.equal(summedCovered, cov.totals.covered, "per-edition covered counts must sum to the corpus total");
  assert.equal(summedUncovered, cov.totals.uncovered, "per-edition uncovered counts must sum to the corpus total");
});

check("TOPIC COVERAGE -- a chapter-level mapping's coverage matches what occurrencesUnder() resolves, measured against the fixture's own numbers", () => {
  // syn-map-0001 (chapter alpha-b1-c2 -> 3,4), syn-map-0002 (book alpha-b2 ->
  // its chapter alpha-b2-c1 -> 5,6) and syn-map-0003 (occurrence syn-occ-0007)
  // together cover exactly {3,4,5,6,7} -- MEASURED off the fixture, not
  // assumed, so a future fixture edit that changes this is caught here.
  const cov = topicCoverage();
  const alpha = cov.editions.find((e) => e.editionId === "synthetic-alpha-ar-v1");
  const beta = cov.editions.find((e) => e.editionId === "synthetic-beta-ar-v1");
  assert.ok(alpha && beta, "both fixture editions must be present in the coverage report");
  assert.equal(alpha.occurrences, 6, "alpha carries occurrences 1-6");
  assert.equal(alpha.covered, 4, "alpha's mapped occurrences are 3, 4, 5, 6");
  assert.equal(alpha.uncovered, 2, "syn-occ-0001 and syn-occ-0002 are reached by no mapping");
  assert.equal(beta.occurrences, 2, "beta carries occurrences 7-8");
  assert.equal(beta.covered, 1, "only syn-occ-0007 is mapped, via syn-map-0003");
  assert.equal(beta.uncovered, 1, "syn-occ-0008 (the no-Bangla fixture) is reached by no topic mapping");
});

check("TOPIC COVERAGE -- the taxonomy revision travels with the result, same as topicIndex()", () => {
  assert.equal(topicCoverage().taxonomyRevision, TAXONOMY_REVISION);
});

check("TOPIC COVERAGE -- an unreviewed mapping still makes its target covered, and that is stated, not silently dropped", () => {
  // topicIndex()'s allMappingsReviewed is false throughout this fixture (every
  // synthetic mapping is unreviewed). topicCoverage() must still count what
  // the index actually resolves today -- review status is a separate, already
  // -reported fact (allMappingsReviewed per topic), not a filter here.
  const idx = topicIndex("synthetic-topic-salah");
  assert.equal(idx.allMappingsReviewed, false, "the fixture's own premise for this check");
  const cov = topicCoverage();
  assert.ok(cov.totals.covered > 0, "coverage must not silently exclude unreviewed mappings' targets");
});

check("TOPIC COVERAGE -- reaches no progress store, no Approach and no permanent unit key, same discipline as exploreAggregate", () => {
  const src = fs.readFileSync(path.join(appJs, "hadith-corpus.js"), "utf8");
  const start = src.indexOf("export function topicCoverage");
  assert.ok(start !== -1, "topicCoverage is not exported where expected");
  const nextExport = src.indexOf("\nexport ", start + 1);
  const body = src.slice(start, nextExport === -1 ? undefined : nextExport);
  assert.ok(body.length > 200, "the slice is implausibly small -- it is not really bounding topicCoverage()'s body");
  for (const forbidden of ["records", "activity", "chunkKey", "trackableId", "approach_", "claimStatus", "demoTrack", "buildUnitKey", "hadith:"]) {
    assert.ok(!body.includes(forbidden), `topicCoverage reaches ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------
// TOPIC NAVIGATION -- listTopics() must offer more than one topic to be worth
// navigating between, and each must independently resolve. This is the fixture
// half of the Topics-tab navigation gap; the browser half is proven by the
// focused Playwright script referenced in this round's dated report.
// ---------------------------------------------------------------------------

check("NAVIGATION -- listTopics() offers more than one topic, or there is nothing to navigate", () => {
  assert.ok(listTopics().length >= 2,
    "a topic PICKER proves nothing with exactly one topic -- add a second synthetic topic to the fixture");
});

check("NAVIGATION -- every topic listTopics() offers resolves independently through topicIndex()", () => {
  for (const tp of listTopics()) {
    const idx = topicIndex(tp.topicId);
    assert.ok(idx, `topicIndex("${tp.topicId}") returned null -- listTopics() offers an id that does not resolve`);
    assert.equal(idx.topic.topicId, tp.topicId);
  }
});

check("NAVIGATION -- the two topics are genuinely distinct in what they reach, not a copy-paste pair", () => {
  const salah = topicIndex("synthetic-topic-salah");
  const wudu = topicIndex("synthetic-topic-wudu");
  assert.ok(wudu, "the new synthetic-topic-wudu fixture topic must resolve");
  assert.notEqual(salah.distinctOccurrences, wudu.distinctOccurrences,
    "if the two topics reach the same count, a picker showing only totals could not prove it switched topics");
  // Every occurrence syn-map-0004 reaches belongs to the SAME book/chapter as
  // syn-map-0002's target (`synthetic-alpha-b2`), which topicIndex() would
  // still list correctly even from a shared ancestor -- the assertion that
  // matters is that the NEW topic's own mapping id is the one that put it there.
  const wuduMapping = TOPIC_MAPPINGS.find((m) => m.topicId === "synthetic-topic-wudu");
  assert.equal(wuduMapping.topicMappingId, "syn-map-0004");
  assert.ok(wudu.collections.every((g) => g.entries.every((e) => e.viaMappingId === "syn-map-0004")),
    "every row the new topic lists must be reached through its OWN mapping, not inherited from Salah's");
});

check("NAVIGATION -- the second topic's own mapping id and topic id both carry the enforced synthetic prefix", () => {
  const m = TOPIC_MAPPINGS.find((x) => x.topicId === "synthetic-topic-wudu");
  assert.ok(m.topicMappingId.startsWith("syn-map-"));
  assert.ok(m.topicId.startsWith("synthetic-"));
  assert.equal(m.reviewStatus, "unreviewed", "a synthetic mapping must never present as scholar-reviewed");
});

// ---------------------------------------------------------------------------
// SOURCE NAVIGATION -- issue #114 Gate A/B: a narration reached through the
// Topics index, a Search hit, or a repeat badge can be opened in its REAL
// book/chapter (the Books path), via `sourcePathOf()` -- never a new lookup,
// never a permanent unit key, never a write. The Books <-> Topics split
// stays intact: this is a bridge FROM an index TO its source, not a rewrite
// of either. Full behavioural (scroll + highlight) proof is a browser
// concern -- see this round's dated report for the focused Playwright
// evidence; these checks pin the wiring shape statically.
// ---------------------------------------------------------------------------

function sliceFunction(src, signature) {
  const start = src.indexOf(signature);
  assert.ok(start >= 0, `${signature} not found`);
  const next = src.indexOf("\nfunction ", start + 1);
  const nextExport = src.indexOf("\nexport function", start + 1);
  const ends = [next, nextExport].filter((n) => n !== -1);
  const end = ends.length ? Math.min(...ends) : undefined;
  return end === undefined ? src.slice(start) : src.slice(start, end);
}

check("SOURCE NAV -- jumpToSource() resolves through sourcePathOf() only, reaches no persistence or unit key", () => {
  const src = codeOf("hadith-browser.js");
  const body = sliceFunction(src, "function jumpToSource(");
  assert.ok(body.length > 50 && body.length < src.length, "the slice is not plausibly bounded to jumpToSource()");
  assert.ok(/sourcePathOf\(/.test(body), "jumpToSource must resolve the destination through sourcePathOf()");
  for (const forbidden of ["buildUnitKey", "hadith:", "firestore", "setDoc", "records.js", "activity.js", "demoTrack", "trackableId"]) {
    assert.ok(!body.includes(forbidden), `jumpToSource reaches ${forbidden}`);
  }
});

check("SOURCE NAV -- the Collections (Books) tab never renders a self-referential 'View in source' link", () => {
  const src = codeOf("hadith-browser.js");
  // renderOccurrenceList is the Collections tab's own list renderer; its
  // occurrenceCard() call must take the DEFAULT (showSourceLink: false).
  const renderOccList = sliceFunction(src, "function renderOccurrenceList(");
  assert.ok(/occurrenceCard\(o, state, render\)\s*\)/.test(renderOccList),
    "renderOccurrenceList must call occurrenceCard with no fourth argument -- the source view already shows the occurrence in context");
});

check("SOURCE NAV -- Topic and Search views both request the source link on the occurrences they list", () => {
  const src = codeOf("hadith-browser.js");
  const renderTopic = sliceFunction(src, "function renderTopic(");
  const renderSearch = sliceFunction(src, "function renderSearch(");
  assert.ok(/occurrenceCard\([^)]*\{\s*showSourceLink:\s*true\s*\}\)/.test(renderTopic),
    "renderTopic must render its occurrences with { showSourceLink: true }");
  assert.ok(/occurrenceCard\([^)]*\{\s*showSourceLink:\s*true\s*\}\)/.test(renderSearch),
    "renderSearch must render its occurrences with { showSourceLink: true }");
});

check("SOURCE NAV -- the repeat badge is wired to jump to the ORIGINAL occurrence, not the repeat itself", () => {
  const src = codeOf("hadith-browser.js");
  assert.ok(/jumpToSource\(state, render, occurrence\.repeatOfOccurrenceId\)/.test(src),
    "the repeat badge must navigate to occurrence.repeatOfOccurrenceId, the original, not the repeat's own id");
});

check("SOURCE NAV -- 'View in source' navigates to the occurrence's OWN id, not a hardcoded or unrelated one", () => {
  const src = codeOf("hadith-browser.js");
  const cardBody = sliceFunction(src, "export function occurrenceCard(");
  assert.ok(/dataset\.hadithViewSource\s*=\s*occurrence\.occurrenceId/.test(cardBody),
    "the View-in-source control must be keyed to this card's own occurrence");
  assert.ok(/jumpToSource\(state, render, occurrence\.occurrenceId\)/.test(cardBody),
    "the View-in-source control must navigate to this card's own occurrence, not a different one");
});

check("SOURCE NAV -- one new English literal only ('View in source'), and it is a real t() call", () => {
  const src = codeOf("hadith-browser.js");
  assert.ok(/t\(\s*"View in source"\s*\)/.test(src), "the new control's label must go through t(), like every other Hadith string");
});

// ---------------------------------------------------------------------------
// BOOK BREADCRUMB -- issue #114 continuation (comment `5759520213`): a real,
// reproduced defect in the Books reader itself, found by walking the actual
// rendered page rather than by reading source. `breadcrumb()` used to derive
// a book's own title from `sourcePathOf(occurrencesIn(state.bookId)[0]
// ?.occurrenceId)` -- which is EMPTY for any book that has a chapter level,
// because every occurrence there sits under a CHAPTER, never the book id
// itself (`synthetic-alpha-b1`/`-b2` both have zero direct occurrences; only
// their chapters do). So at the chapter-list level the breadcrumb silently
// fell through to the raw internal book id (e.g. "synthetic-alpha-b1")
// instead of its translated title -- reproduced live in both English and
// Bangla. `chapterById()` was already exported for exactly this (a
// bookChapter's own record, no occurrence detour) but had never been wired
// into the one place that needed it.
// ---------------------------------------------------------------------------

check("BREADCRUMB -- chapterById() resolves a BOOK's own title directly, with no occurrence involved", () => {
  const b1 = chapterById("synthetic-alpha-b1");
  const b2 = chapterById("synthetic-alpha-b2");
  assert.ok(b1 && b1.title?.en === "Book of the Beginning", "chapterById('synthetic-alpha-b1') must name the book itself");
  assert.ok(b2 && b2.title?.en === "Book of Prayer", "chapterById('synthetic-alpha-b2') must name the book itself");
});

check("BREADCRUMB -- both alpha books genuinely have ZERO occurrences attached to the book id itself (the precondition the bug depended on)", () => {
  assert.equal(occurrencesIn("synthetic-alpha-b1").length, 0,
    "if this ever becomes nonzero, the old sourcePathOf(occurrencesIn(...)) approach would have masked the defect again -- re-check the fix still applies");
  assert.equal(occurrencesIn("synthetic-alpha-b2").length, 0);
});

check("BREADCRUMB -- breadcrumb() reads the book/chapter title via chapterById(), not via an occurrence's sourcePathOf()", () => {
  const src = codeOf("hadith-browser.js");
  const body = sliceFunction(src, "function breadcrumb(");
  assert.ok(/chapterById\(state\.bookId\)/.test(body), "breadcrumb() must resolve the book label with chapterById(state.bookId)");
  assert.ok(/chapterById\(state\.chapterId\)/.test(body), "breadcrumb() must resolve the chapter label with chapterById(state.chapterId)");
  assert.ok(!/occurrencesIn\(/.test(body), "breadcrumb() must not derive a label indirectly through an occurrence again -- that is what silently broke it for a book with no direct occurrences");
});

check("BREADCRUMB -- an edition with NO chapter level (synthetic-beta) is unaffected either way", () => {
  // synthetic-beta-b1 DOES hold occurrences directly (it has no chapter
  // level, so its occurrences attach straight to the book) -- the old code
  // path was never broken here, and the new one must not break it either.
  assert.ok(occurrencesIn("synthetic-beta-b1").length > 0, "synthetic-beta-b1 must still hold its occurrences directly");
  const b = chapterById("synthetic-beta-b1");
  assert.ok(b && b.title?.en === "Book of Acts of Worship", "chapterById() must resolve this book too");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
