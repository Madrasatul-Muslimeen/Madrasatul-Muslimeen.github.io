// Issue #301 -- the pure lemma-progress state model. Asserts the same locks
// quran-word-progress-model.mjs already proves for occurrence progress
// (Activity != Mastery, I6 freezing, a deferred level is refused, not
// silently stored), PLUS the two things unique to this round: the Owner's
// rule made arithmetic (effectiveOccurrenceState/lemmaKnownDelta) and the
// claim that a real lemma id is always a safe Firestore document-id segment
// -- re-derived here from the real packaged corpus rather than trusted from
// a comment.
//
// Deliberately imports ONLY the pure module (quran-lemma-progress.js), never
// quran-lemma-progress-data.js -- that module's top-level gstatic import
// would attempt a real network fetch the moment this file is imported,
// exactly the reason quran-word-progress-model.mjs never imports
// quran-word-progress-data.js either.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  LEMMA_PROGRESS_CONTRACT, LEMMA_PROGRESS_LANES,
  ARABIC_LEVELS, IMPLEMENTED_ARABIC_LEVELS, requireImplementedLevel,
  WBW_WORD_STATES, WBW_REVIEW_STATES,
  safeLemmaId, lemmaProgressDocId, parseLemmaProgressDocId,
  emptyLemmaLearnerEntry, decodeLemmaLearnerEntry, emptyLemmaSupervisorEntry, decodeLemmaSupervisorEntry,
  decodeLemmaLaneEntry, lemmaEntryFields, buildLemmaLaneDocument, decodeLemmaLaneDocument,
  claimLemmaState, decideLemmaApproval, resolveLemmaProgress, lemmaProgressAuthority,
  effectiveOccurrenceState, lemmaKnownDelta,
} from "../../app/js/quran-lemma-progress.js";

const root = path.resolve(process.argv[2] || process.cwd());

let passed = 0, failed = 0;
function check(label, fn) {
  // A synchronous runner counts an `async` body as a pass -- the assertion
  // throws inside an uncaught promise and the case prints PASS. Refuse it,
  // the same standing guard every other suite in this directory carries.
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${label}`);
  } catch (error) { failed++; console.log(`  FAIL  ${label}\n        ${error.message}`); }
}

const NOW = "2026-09-26T10:00:00.000Z";
const LATER = "2026-09-26T11:00:00.000Z";

// ===========================================================================
// 1. Contract and vocabulary -- SHARED with occurrence progress by
// construction, not by two lists staying in sync.
// ===========================================================================

check("the lemma contract is named and versioned, distinctly from the occurrence contract", () => {
  assert.equal(LEMMA_PROGRESS_CONTRACT, "quran-lemma-progress:v1");
});
check("the two lanes are named exactly as occurrence progress names them", () => {
  assert.deepEqual(LEMMA_PROGRESS_LANES, ["learner", "supervisor"]);
});
check("WbW word states and review states are the SAME arrays occurrence progress exports -- reused, not re-typed", () => {
  assert.deepEqual(WBW_WORD_STATES, ["not_started", "learning", "achieved"]);
  assert.deepEqual(WBW_REVIEW_STATES, ["pending", "confirmed", "returned"]);
});
check("Arabic levels stay independent: only wbw is implemented", () => {
  assert.deepEqual(ARABIC_LEVELS, ["wbw", "basic", "depth"]);
  assert.deepEqual(IMPLEMENTED_ARABIC_LEVELS, ["wbw"]);
});
check("Basic Arabic and Arabic in Depth lemma progress are REFUSED, not silently stored as wbw", () => {
  assert.throws(() => requireImplementedLevel("basic"), /deferred/);
  assert.throws(() => requireImplementedLevel("depth"), /deferred/);
});

// ===========================================================================
// 2. Lemma id safety, RE-DERIVED from the real packaged corpus, not trusted
// from app/js/quran-lemma-progress.js's own header comment.
// ===========================================================================

const lemmasIndex = JSON.parse(fs.readFileSync(path.join(root, "tools/quran-data-pull/output/lemmas-index.json"), "utf8"));
const lemmaKeys = Object.keys(lemmasIndex.values);

check("POSITIVE CONTROL: the real packaged corpus really has thousands of lemma keys", () => {
  assert.ok(lemmaKeys.length > 1000, `only ${lemmaKeys.length} lemma keys found -- the fixture path is wrong`);
});

check("every real packaged lemma id is a safe Firestore document-id segment, checked directly rather than trusted", () => {
  let longest = "";
  for (const key of lemmaKeys) {
    assert.doesNotThrow(() => safeLemmaId(key), `a real lemma id was refused: ${JSON.stringify(key)}`);
    assert.ok(!key.includes("/"), `a real lemma id contains a path separator: ${key}`);
    assert.ok(!key.includes("__"), `a real lemma id contains the id-segment separator: ${key}`);
    assert.notEqual(key, ".");
    assert.notEqual(key, "..");
    if (key.length > longest.length) longest = key;
  }
  // Re-derives the header comment's own "15 characters" claim rather than
  // quoting it -- a future corpus rebuild that lengthened a lemma would fail
  // this line before it could silently exceed safeLemmaId()'s 400-char cap.
  assert.equal(longest.length, 15, `the longest real lemma id measured ${longest.length} characters (${JSON.stringify(longest)}), not 15 -- update the comments that quote this figure`);
});

check("safeLemmaId() refuses what it must: empty, a path separator, the id-segment separator, and bare dots", () => {
  assert.throws(() => safeLemmaId(""), TypeError);
  assert.throws(() => safeLemmaId("a/b"), TypeError);
  assert.throws(() => safeLemmaId("a__b"), TypeError);
  assert.throws(() => safeLemmaId("."), TypeError);
  assert.throws(() => safeLemmaId(".."), TypeError);
  assert.throws(() => safeLemmaId("x".repeat(401)), RangeError);
  assert.doesNotThrow(() => safeLemmaId("x".repeat(400)));
});

check("lemmaProgressDocId()/parseLemmaProgressDocId() round-trip on real packaged lemma ids, including ones carrying every special character the corpus uses", () => {
  // Picked BY the special character they carry, at runtime, rather than
  // transcribed by hand -- a hand-copied Arabic string travelling through a
  // terminal can silently pick up a different Unicode normalization and stop
  // matching the very key it was copied from.
  const bySpecialChar = (ch) => lemmaKeys.find((k) => k.includes(ch));
  const samples = [lemmaKeys[0], lemmaKeys.at(-1), ...[".", ",", "@", "2", "["].map(bySpecialChar)];
  assert.ok(samples.every(Boolean), `could not find a real sample for every special character: ${JSON.stringify(samples)}`);
  for (const lemmaId of samples) {
    const docId = lemmaProgressDocId({ tenantId: "t1", personId: "p1", level: "wbw", lemmaId });
    const parsed = parseLemmaProgressDocId(docId);
    assert.deepEqual(parsed, { tenantId: "t1", personId: "p1", level: "wbw", lemmaId });
  }
});

check("lemmaProgressDocId() refuses a tenantId/personId carrying the id-segment separator or a slash", () => {
  assert.throws(() => lemmaProgressDocId({ tenantId: "t__1", personId: "p1", lemmaId: "قَالَ" }), TypeError);
  assert.throws(() => lemmaProgressDocId({ tenantId: "t1", personId: "p/1", lemmaId: "قَالَ" }), TypeError);
});

check("parseLemmaProgressDocId() rejects a malformed id rather than guessing", () => {
  assert.throws(() => parseLemmaProgressDocId("not-a-valid-id"), TypeError);
  assert.throws(() => parseLemmaProgressDocId(42), TypeError);
});

// ===========================================================================
// 3. Entries and transitions -- reused directly from occurrence progress,
// proven to work unchanged against a lemma's own (non-ayah-bundled) shape.
// ===========================================================================

check("emptyLemmaLearnerEntry()/decodeLemmaLearnerEntry() default to not_started", () => {
  assert.deepEqual(emptyLemmaLearnerEntry(), { state: "not_started", at: null, byPersonId: null });
  assert.deepEqual(decodeLemmaLearnerEntry(null), emptyLemmaLearnerEntry());
  assert.deepEqual(decodeLemmaLearnerEntry({ state: "bogus" }), emptyLemmaLearnerEntry());
  assert.deepEqual(decodeLemmaLearnerEntry({ state: "achieved", at: NOW, byPersonId: "p1" }),
    { state: "achieved", at: NOW, byPersonId: "p1" });
});

check("emptyLemmaSupervisorEntry()/decodeLemmaSupervisorEntry() default to pending, with a bounded empty history", () => {
  const empty = emptyLemmaSupervisorEntry();
  assert.equal(empty.review, "pending");
  assert.deepEqual(empty.history, []);
  assert.equal(empty.historyTruncated, 0);
  assert.deepEqual(decodeLemmaSupervisorEntry(undefined), empty);
});

check("decodeLemmaLaneEntry() dispatches on the lane name and refuses an unknown one", () => {
  assert.deepEqual(decodeLemmaLaneEntry("learner", null), emptyLemmaLearnerEntry());
  assert.deepEqual(decodeLemmaLaneEntry("supervisor", null), emptyLemmaSupervisorEntry());
  assert.throws(() => decodeLemmaLaneEntry("bogus", null), TypeError);
});

check("lemmaEntryFields()/buildLemmaLaneDocument() round-trip through decodeLemmaLaneEntry()", () => {
  const docId = lemmaProgressDocId({ tenantId: "t1", personId: "p1", lemmaId: "قَالَ" });
  const entry = { state: "achieved", at: NOW, byPersonId: "p1" };
  const built = buildLemmaLaneDocument({ docId, lane: "learner", entry });
  assert.equal(built.contractVersion, LEMMA_PROGRESS_CONTRACT);
  assert.equal(built.lane, "learner");
  assert.equal(built.tenantId, "t1");
  assert.equal(built.personId, "p1");
  assert.equal(built.level, "wbw");
  assert.equal(built.lemmaId, "قَالَ");
  assert.deepEqual(decodeLemmaLaneEntry("learner", built), entry);
  assert.deepEqual(lemmaEntryFields("learner", entry), { state: "achieved", at: NOW, byPersonId: "p1" });
});

check("decodeLemmaLaneDocument() refuses a future contract version rather than silently reading it as v1", () => {
  assert.equal(decodeLemmaLaneDocument(null), null);
  assert.throws(() => decodeLemmaLaneDocument({ contractVersion: "quran-lemma-progress:v2", lane: "learner" }), RangeError);
});

check("claimLemmaState() is a no-op (writes nothing) on a re-claim of the SAME state", () => {
  const result = claimLemmaState({
    currentLearner: { state: "achieved", at: NOW, byPersonId: "p1" },
    currentSupervisor: null, state: "achieved", actorPersonId: "p1", atIso: LATER,
  });
  assert.equal(result.changed, false);
});

check("I6: a supervisor's decision is pinned to the exact claim instant it was given for -- a later re-claim stops matching it, and nothing is rewritten", () => {
  let learner = { state: "not_started", at: null, byPersonId: null };
  let supervisor = null;

  const claim1 = claimLemmaState({ currentLearner: learner, currentSupervisor: supervisor, state: "achieved", actorPersonId: "p1", atIso: NOW, confirmationRequired: true });
  assert.equal(claim1.changed, true);
  learner = claim1.learner;

  const decided = decideLemmaApproval({ currentLearner: learner, currentSupervisor: supervisor, review: "confirmed", byPersonId: "t1", atIso: LATER });
  supervisor = decided.supervisor;
  assert.equal(resolveLemmaProgress({ learner, supervisor, confirmationRequired: true }).countsAsKnown, true);

  // A fresh claim instant -- the decision above was given for `NOW`, not this.
  const claim2 = claimLemmaState({ currentLearner: learner, currentSupervisor: supervisor, state: "learning", actorPersonId: "p1", atIso: "2026-09-26T12:00:00.000Z", confirmationRequired: true });
  learner = claim2.learner;
  const claim3 = claimLemmaState({ currentLearner: learner, currentSupervisor: supervisor, state: "achieved", actorPersonId: "p1", atIso: "2026-09-26T13:00:00.000Z", confirmationRequired: true });
  learner = claim3.learner;

  const resolved = resolveLemmaProgress({ learner, supervisor, confirmationRequired: true });
  assert.equal(resolved.review, "pending", "the old decision must stop applying to a genuinely new claim instant");
  assert.equal(resolved.countsAsKnown, false, "a re-claim must not silently inherit the earlier confirmation");
  // Nothing was rewritten -- the ORIGINAL decision is still exactly what it was.
  assert.equal(supervisor.forClaimAt, NOW);
  assert.equal(supervisor.review, "confirmed");
});

check("resolveLemmaProgress() stamps the LEMMA contract, not the occurrence one it borrows its arithmetic from", () => {
  const resolved = resolveLemmaProgress({ learner: emptyLemmaLearnerEntry(), supervisor: null, confirmationRequired: false });
  assert.equal(resolved.contractVersion, LEMMA_PROGRESS_CONTRACT);
});

check("lemmaProgressAuthority(): nobody signs off their own claim, and a bare learner cannot decide", () => {
  const self = lemmaProgressAuthority({ actorPersonId: "p1", subjectPersonId: "p1", isSupervisor: false, confirmationRequired: true });
  assert.equal(self.mayClaim, true);
  assert.equal(self.mayDecide, false);
  const supervisor = lemmaProgressAuthority({ actorPersonId: "t1", subjectPersonId: "p1", isSupervisor: true, confirmationRequired: true });
  assert.equal(supervisor.mayClaim, true);
  assert.equal(supervisor.mayDecide, true);
});

// ===========================================================================
// 4. THE OWNER'S RULE, made arithmetic: effectiveOccurrenceState().
// ===========================================================================

const KNOWN = { state: "achieved", countsAsKnown: true };
const UNKNOWN = { state: "not_started", countsAsKnown: false };

check("effectiveOccurrenceState(): an occurrence individually known counts as known, regardless of its lemma", () => {
  const view = effectiveOccurrenceState(KNOWN, UNKNOWN);
  assert.equal(view.countsAsKnown, true);
  assert.equal(view.knownViaLemma, false, "the occurrence is known on its own account, not via the lemma");
});

check("effectiveOccurrenceState(): an occurrence NOT individually known counts as known when its lemma is known -- the Owner's rule", () => {
  const view = effectiveOccurrenceState(UNKNOWN, KNOWN);
  assert.equal(view.countsAsKnown, true);
  assert.equal(view.knownViaLemma, true);
});

check("effectiveOccurrenceState(): neither known means not known", () => {
  const view = effectiveOccurrenceState(UNKNOWN, UNKNOWN);
  assert.equal(view.countsAsKnown, false);
  assert.equal(view.knownViaLemma, false);
});

check("effectiveOccurrenceState(): both known is known, attributed to the occurrence's own claim, not the lemma", () => {
  const view = effectiveOccurrenceState(KNOWN, KNOWN);
  assert.equal(view.countsAsKnown, true);
  assert.equal(view.knownViaLemma, false);
});

check("effectiveOccurrenceState(): a missing view on either side defaults to not-known rather than throwing", () => {
  assert.equal(effectiveOccurrenceState(null, null).countsAsKnown, false);
  assert.equal(effectiveOccurrenceState(undefined, KNOWN).countsAsKnown, true);
  assert.equal(effectiveOccurrenceState(KNOWN, undefined).countsAsKnown, true);
});

check("effectiveOccurrenceState() never rewrites either input -- it is a read-time projection (I4/I6)", () => {
  const occ = { ...UNKNOWN };
  const lem = { ...KNOWN };
  const before = JSON.stringify([occ, lem]);
  effectiveOccurrenceState(occ, lem);
  assert.equal(JSON.stringify([occ, lem]), before);
});

// ===========================================================================
// 5. THE OWNER'S RULE, priced: lemmaKnownDelta(), including a lemma whose
// occurrences are PARTLY known individually -- grounded in a real lemma from
// the packaged corpus, not a synthetic round number.
// ===========================================================================

// A real, moderately-frequent lemma -- picked BY its occurrence count at
// runtime (never hand-transcribed, the same trap the sample above avoids),
// so this check cannot go stale silently if the corpus is ever rebuilt.
const GROUNDED_LEMMA = lemmaKeys.find((k) => lemmasIndex.values[k].length >= 10 && lemmasIndex.values[k].length <= 100);
check("POSITIVE CONTROL: the grounded lemma really exists in the packaged corpus with a real, moderate occurrence count", () => {
  assert.ok(GROUNDED_LEMMA, "could not find a real lemma with 10-100 occurrences -- pick a different range");
  assert.ok(lemmasIndex.values[GROUNDED_LEMMA].length >= 3, "the grounded lemma needs at least 3 real occurrences to make a meaningful partial-known example");
});

check("lemmaKnownDelta(): moving a lemma to known adds exactly its occurrences MINUS those already known individually", () => {
  const occurrenceCount = lemmasIndex.values[GROUNDED_LEMMA].length;
  const alreadyKnownIndividually = 2; // a realistic partial case: two of this lemma's occurrences were already separately claimed and confirmed
  assert.ok(alreadyKnownIndividually < occurrenceCount, "the grounded lemma does not have enough occurrences for this example");
  const delta = lemmaKnownDelta({ occurrenceCount, alreadyKnownIndividually, wasLemmaKnown: false, isLemmaKnown: true });
  assert.equal(delta, occurrenceCount - alreadyKnownIndividually);
});

check("lemmaKnownDelta(): moving a lemma OUT of known is the exact negative of moving it in", () => {
  const occurrenceCount = 12, alreadyKnownIndividually = 4;
  const up = lemmaKnownDelta({ occurrenceCount, alreadyKnownIndividually, wasLemmaKnown: false, isLemmaKnown: true });
  const down = lemmaKnownDelta({ occurrenceCount, alreadyKnownIndividually, wasLemmaKnown: true, isLemmaKnown: false });
  assert.equal(down, -up);
});

check("lemmaKnownDelta(): no change in known-ness moves nothing, even with a nonzero alreadyKnownIndividually", () => {
  assert.equal(lemmaKnownDelta({ occurrenceCount: 50, alreadyKnownIndividually: 30, wasLemmaKnown: true, isLemmaKnown: true }), 0);
  assert.equal(lemmaKnownDelta({ occurrenceCount: 50, alreadyKnownIndividually: 30, wasLemmaKnown: false, isLemmaKnown: false }), 0);
});

check("lemmaKnownDelta(): every occurrence already known individually means the lemma moving adds nothing further", () => {
  assert.equal(lemmaKnownDelta({ occurrenceCount: 7, alreadyKnownIndividually: 7, wasLemmaKnown: false, isLemmaKnown: true }), 0);
});

check("lemmaKnownDelta() refuses malformed input rather than returning a wrong number", () => {
  assert.throws(() => lemmaKnownDelta({ occurrenceCount: -1, alreadyKnownIndividually: 0, wasLemmaKnown: false, isLemmaKnown: true }), TypeError);
  assert.throws(() => lemmaKnownDelta({ occurrenceCount: 3.5, alreadyKnownIndividually: 0, wasLemmaKnown: false, isLemmaKnown: true }), TypeError);
  assert.throws(() => lemmaKnownDelta({ occurrenceCount: 5, alreadyKnownIndividually: 6, wasLemmaKnown: false, isLemmaKnown: true }), RangeError);
  assert.throws(() => lemmaKnownDelta({ occurrenceCount: 5, alreadyKnownIndividually: -1, wasLemmaKnown: false, isLemmaKnown: true }), RangeError);
  assert.throws(() => lemmaKnownDelta({ occurrenceCount: 5, alreadyKnownIndividually: 2, wasLemmaKnown: "no", isLemmaKnown: true }), TypeError);
});

// ===========================================================================
// 6. THE WORST CASE, RE-DERIVED INDEPENDENTLY from the real packaged corpus
// -- the number app/js/quran-lemma-progress-data.js's own
// countIndividuallyKnownOccurrences() comment quotes, proven here rather
// than trusted.
// ===========================================================================

check("the real packaged corpus's total occurrence/lemma counts match its own declared entryCount/occurrences fields", () => {
  assert.equal(lemmaKeys.length, lemmasIndex.entryCount);
  const totalOccurrences = lemmaKeys.reduce((sum, k) => sum + lemmasIndex.values[k].length, 0);
  assert.equal(totalOccurrences, lemmasIndex.occurrences);
});

check("the most frequent lemma's own occurrence count and DISTINCT-AYAH count are re-derived independently, not hand-typed", () => {
  let mostFrequentLemma = null, mostOccurrences = -1;
  for (const key of lemmaKeys) {
    if (lemmasIndex.values[key].length > mostOccurrences) { mostOccurrences = lemmasIndex.values[key].length; mostFrequentLemma = key; }
  }
  const ayahs = new Set();
  for (const ref of lemmasIndex.values[mostFrequentLemma]) {
    // encoding: surah*1000000 + ayah*1000 + position (declared in the file itself)
    assert.equal(lemmasIndex.encoding, "surah*1000000+ayah*1000+position");
    const surah = Math.floor(ref / 1_000_000);
    const ayah = Math.floor((ref % 1_000_000) / 1_000);
    ayahs.add(`${surah}_${ayah}`);
  }
  // These are FACTS about the real corpus, re-derived above -- not assumed.
  // If the corpus is ever rebuilt and these numbers move, this failure is the
  // signal to update every comment quoting them (this file's own header,
  // quran-lemma-progress.js's header, quran-lemma-progress-data.js's own
  // countIndividuallyKnownOccurrences() comment, and the two Rules candidate
  // files' headers).
  assert.equal(mostOccurrences, 3229, `the most frequent lemma's occurrence count is now ${mostOccurrences}, not 3229 -- update every comment quoting the old figure`);
  assert.equal(ayahs.size, 2183, `the most frequent lemma now spans ${ayahs.size} distinct ayahs, not 2183 -- update every comment quoting the old figure`);
  // The worst-case read cost this round's data layer documents: two lane
  // reads per distinct ayah.
  assert.equal(ayahs.size * 2, 4366);
});

console.log(`\n==== Quran lemma progress model (issue #301): ${passed} passed, ${failed} failed ====`);
if (failed > 0) process.exit(1);
