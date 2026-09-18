// Hadith H2 -- the corpus read model, and the GATES it must not cross.
//
// Run from the REPOSITORY ROOT.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  listCollections, booksOf, chaptersOf, occurrencesIn, editionHasChapterLevel,
  occurrenceById, sourcePathOf, externalReferencesFor, resolveText, availableLanguages,
  searchCorpus, topicIndex, CONTENT_LANGUAGES, SOURCE_LANGUAGE,
} from "../../app/js/hadith-corpus.js";
import { OCCURRENCES, SYNTHETIC_NOTICE, TAXONOMY_REVISION } from "../../app/js/hadith-fixture-data.js";

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
  const idx = topicIndex("topic-salah");
  assert.equal(idx.collections.length, 2, "Salah must reach BOTH collections");
  for (const g of idx.collections) for (const e of g.entries) {
    assert.ok(e.sourceHeading, "the source heading must stay visible beside the mapped topic");
  }
});

check("distinct occurrences and mapping count are reported SEPARATELY", () => {
  const idx = topicIndex("topic-salah");
  assert.equal(idx.mappingCount, 3);
  assert.equal(idx.distinctOccurrences, 5);
  const seen = idx.collections.flatMap((g) => g.entries.map((e) => e.occurrence.occurrenceId));
  assert.equal(new Set(seen).size, seen.length, "an occurrence was listed twice");
});

check("the taxonomy revision travels with the result", () => {
  assert.equal(topicIndex("topic-salah").taxonomyRevision, TAXONOMY_REVISION);
});

check("unreviewed mappings are reported as unreviewed", () => {
  const idx = topicIndex("topic-salah");
  assert.equal(idx.allMappingsReviewed, false);
  for (const g of idx.collections) for (const e of g.entries) {
    assert.equal(e.reviewStatus, "unreviewed", "a synthetic mapping must never present as reviewed");
  }
});

check("the topic index does not rewrite any book", () => {
  // Reading the topic view must leave the source view byte-identical.
  const before = occurrencesIn("synthetic-alpha-b2-c1").map((o) => o.occurrenceId);
  topicIndex("topic-salah");
  assert.deepEqual(occurrencesIn("synthetic-alpha-b2-c1").map((o) => o.occurrenceId), before);
});

check("an unknown topic returns null rather than an empty index that looks real", () => {
  assert.equal(topicIndex("topic-nope"), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
