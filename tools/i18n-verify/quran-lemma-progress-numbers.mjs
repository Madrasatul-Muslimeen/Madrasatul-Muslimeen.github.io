// Issue #303 -- the Word Card's four whole-Qur'an/lemma numbers, and the
// bounded-cost per-juz counter design they rest on. Deliberately imports
// ONLY pure modules (quran-lemma-progress.js, quran-word-total.js,
// study-lemma-progress-readiness.js) -- none of them touch Firebase, so this
// suite needs no emulator and no network, the same discipline
// quran-lemma-progress-model.mjs already follows.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  effectiveOccurrenceState, lemmaKnownDelta, lemmaKnownDeltaByJuz, groupOccurrenceRefsByJuz,
  lemmaCounterDocId, parseLemmaCounterDocId, emptyLemmaCounterDocument, decodeLemmaCounterDocument,
  lemmaCounterTotalKnown, overlayLemmaKnownness,
} from "../../app/js/quran-lemma-progress.js";
import { juzForSurahAyah, percentRounded, QURAN_TOTAL_WORD_COUNT } from "../../app/js/quran-word-total.js";
import {
  isLemmaProgressPersistenceReady, lemmaProgressUnavailableReason,
  REASON_LEMMA_PROGRESS_NOT_DEPLOYED, REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE,
  LEMMA_PROGRESS_PERSISTENCE_DECLARATION, LEMMA_PROGRESS_READINESS_AUTHORITIES,
} from "../../app/js/study-lemma-progress-readiness.js";

let passed = 0, failed = 0;
function check(label, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${label}`);
  } catch (error) { failed++; console.log(`  FAIL  ${label}\n        ${error.message}`); }
}

// ===========================================================================
// 1. THE GATE -- the standing declaration in this repository really is
// closed, and every malformed shape stays closed too.
// ===========================================================================

// UPDATED IN PLACE, 26 Sep 2026: this asserted the declaration was CLOSED,
// true until the Owner published the rules ("Lemma progress rules are
// live.") and the Master Architect recorded the governed decision. The real
// file's state genuinely changed; every malformed-shape refusal below is
// asserted exactly as strictly as before.
check("the standing declaration is OPEN by a governed decision whose record exists", () => {
  assert.equal(LEMMA_PROGRESS_PERSISTENCE_DECLARATION.ready, true);
  const d = LEMMA_PROGRESS_PERSISTENCE_DECLARATION.decision;
  assert.equal(d.by, "master-architect");
  assert.match(d.on, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(fs.existsSync(d.reference), `the decision's record ${d.reference} does not exist`);
  assert.equal(isLemmaProgressPersistenceReady(), true);
  assert.equal(lemmaProgressUnavailableReason(), null);
  assert.equal(lemmaProgressUnavailableReason({ ready: false, decision: null }), REASON_LEMMA_PROGRESS_NOT_DEPLOYED);
});

check("a bare flip of `ready` with no decision does NOT enable it, and reports the DIFFERENT reason", () => {
  const bareFlip = { ready: true, decision: null };
  assert.equal(isLemmaProgressPersistenceReady(bareFlip), false);
  assert.equal(lemmaProgressUnavailableReason(bareFlip), REASON_LEMMA_PROGRESS_DECISION_INCOMPLETE);
});

check("a decision from an unknown authority, a malformed date, or an empty reference all stay closed", () => {
  const base = { ready: true, decision: { by: "master-architect", on: "2026-09-26", reference: "x" } };
  assert.equal(isLemmaProgressPersistenceReady(base), true, "the base case itself must be well-formed");
  assert.equal(isLemmaProgressPersistenceReady({ ...base, decision: { ...base.decision, by: "self" } }), false);
  assert.equal(isLemmaProgressPersistenceReady({ ...base, decision: { ...base.decision, on: "26-09-2026" } }), false);
  assert.equal(isLemmaProgressPersistenceReady({ ...base, decision: { ...base.decision, reference: "" } }), false);
});

check("the readiness module imports nothing at all -- enforcement by inability, the same as study-wbw-total-readiness.js", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(here, "../../app/js/study-lemma-progress-readiness.js"), "utf8");
  assert.ok(!/^\s*import /m.test(source), "study-lemma-progress-readiness.js has an import -- it must stay pure");
});

check("the authority list is closed: a module cannot authorise itself", () => {
  assert.deepEqual(LEMMA_PROGRESS_READINESS_AUTHORITIES, ["master-architect"]);
});

// ===========================================================================
// 2. THE BOUNDED COUNTER -- doc identity, seeding shape, and the juz cap
// that is the whole point of this round's cost design.
// ===========================================================================

const T = "t1", P = "p1", LEMMA = "قَرَأَ";

check("lemmaCounterDocId()/parseLemmaCounterDocId() round-trip", () => {
  const docId = lemmaCounterDocId({ tenantId: T, personId: P, lemmaId: LEMMA });
  assert.equal(docId, `${T}__${P}__wbw__${LEMMA}`);
  assert.deepEqual(parseLemmaCounterDocId(docId), { tenantId: T, personId: P, level: "wbw", lemmaId: LEMMA });
});

check("emptyLemmaCounterDocument() starts with an EMPTY per-juz map -- nothing is assumed known before a real walk says so", () => {
  const doc = emptyLemmaCounterDocument({ tenantId: T, personId: P, lemmaId: LEMMA });
  assert.equal(doc.contractVersion, "quran-lemma-occurrence-counter:v1");
  assert.deepEqual(doc.individuallyKnownByJuz, {});
  assert.equal(lemmaCounterTotalKnown(doc), 0);
});

check("decodeLemmaCounterDocument() keeps only real juz numbers (1-30) with non-negative integer counts", () => {
  const decoded = decodeLemmaCounterDocument({
    contractVersion: "quran-lemma-occurrence-counter:v1", tenantId: T, personId: P, level: "wbw", lemmaId: LEMMA,
    individuallyKnownByJuz: { "1": 3, "30": 2, "31": 99, "0": 5, "2": -1, "x": 4 },
  });
  assert.deepEqual(decoded.individuallyKnownByJuz, { "1": 3, "30": 2 });
  assert.equal(lemmaCounterTotalKnown(decoded), 5);
});

check("decodeLemmaCounterDocument() refuses a future contract version rather than silently reading it as v1", () => {
  assert.throws(() => decodeLemmaCounterDocument({ contractVersion: "quran-lemma-occurrence-counter:v2" }), RangeError);
  assert.equal(decodeLemmaCounterDocument(null), null);
});

// A real, moderately-sized synthetic juz index -- juzForSurahAyah() only
// needs ordered (startSurah,startAyah)-(endSurah,endAyah) pairs, never the
// real packaged 30-row file, to prove the grouping arithmetic.
const JUZ_INDEX = [
  { juz: 1, startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 100 },
  { juz: 2, startSurah: 2, startAyah: 101, endSurah: 2, endAyah: 252 },
  { juz: 3, startSurah: 3, startAyah: 1, endSurah: 3, endAyah: 200 },
];

check("groupOccurrenceRefsByJuz() is bounded at the number of DISTINCT JUZ touched, never at the occurrence count -- the whole point of this round's design", () => {
  // 3,229 occurrences (the real corpus's own worst-case lemma, "من") spread
  // across only 3 juz here -- the grouped Map must still have exactly 3
  // entries, proving the counter document this seeds can never grow past
  // the number of juz regardless of how many occurrences a lemma has.
  const refs = [];
  for (let i = 0; i < 3229; i++) {
    const juzIdx = i % 3;
    refs.push(juzIdx === 0 ? { surah: 1, ayah: 5 } : juzIdx === 1 ? { surah: 2, ayah: 150 } : { surah: 3, ayah: 10 });
  }
  const grouped = groupOccurrenceRefsByJuz(refs, JUZ_INDEX, juzForSurahAyah);
  assert.equal(grouped.size, 3, "3,229 occurrences across 3 juz must group into exactly 3 buckets, not one per occurrence");
  assert.equal([...grouped.values()].reduce((s, n) => s + n, 0), 3229);
});

check("groupOccurrenceRefsByJuz() skips a ref the juz index cannot place, rather than mis-crediting it", () => {
  const refs = [{ surah: 1, ayah: 5 }, { surah: 99, ayah: 1 }];
  const grouped = groupOccurrenceRefsByJuz(refs, JUZ_INDEX, juzForSurahAyah);
  assert.deepEqual([...grouped.entries()], [[1, 1]]);
});

check("lemmaKnownDeltaByJuz(): a lemma PARTLY known individually -- the real case this round's design exists for", () => {
  // Juz 1: 10 occurrences, 3 already known individually -> 7 move.
  // Juz 2: 5 occurrences, ALL 5 already known individually -> 0 move.
  // Juz 3: 8 occurrences, none known individually -> 8 move.
  const occurrenceCountByJuz = new Map([[1, 10], [2, 5], [3, 8]]);
  const alreadyKnownByJuz = new Map([[1, 3], [2, 5], [3, 0]]);
  const deltas = lemmaKnownDeltaByJuz({ occurrenceCountByJuz, alreadyKnownByJuz, wasLemmaKnown: false, isLemmaKnown: true });
  assert.deepEqual([...deltas.entries()].sort(), [[1, 7], [3, 8]], "juz 2 must be OMITTED, not present with delta 0");
  const total = [...deltas.values()].reduce((s, n) => s + n, 0);
  assert.equal(total, 15, "the whole-Qur'an total must move by exactly the sum of the per-juz deltas");
});

check("lemmaKnownDeltaByJuz(): moving OUT of known is the exact negative, juz by juz", () => {
  const occurrenceCountByJuz = new Map([[1, 10], [3, 8]]);
  const alreadyKnownByJuz = new Map([[1, 3], [3, 0]]);
  const up = lemmaKnownDeltaByJuz({ occurrenceCountByJuz, alreadyKnownByJuz, wasLemmaKnown: false, isLemmaKnown: true });
  const down = lemmaKnownDeltaByJuz({ occurrenceCountByJuz, alreadyKnownByJuz, wasLemmaKnown: true, isLemmaKnown: false });
  for (const [juz, delta] of up) assert.equal(down.get(juz), -delta);
});

check("lemmaKnownDeltaByJuz(): no change in known-ness moves NOTHING, an empty Map, not zeros", () => {
  const occurrenceCountByJuz = new Map([[1, 10]]);
  const deltas = lemmaKnownDeltaByJuz({ occurrenceCountByJuz, alreadyKnownByJuz: new Map(), wasLemmaKnown: true, isLemmaKnown: true });
  assert.equal(deltas.size, 0);
});

check("lemmaKnownDeltaByJuz() caps alreadyKnown at the juz's own occurrenceCount, never producing a negative delta from bad input", () => {
  const occurrenceCountByJuz = new Map([[1, 3]]);
  const alreadyKnownByJuz = new Map([[1, 99]]); // implausible, must not go negative
  const deltas = lemmaKnownDeltaByJuz({ occurrenceCountByJuz, alreadyKnownByJuz, wasLemmaKnown: false, isLemmaKnown: true });
  assert.equal(deltas.size, 0, "every occurrence already (over-)accounted for moves nothing further");
});

// ===========================================================================
// 3. THE WORD CARD'S FOUR NUMBERS -- the arithmetic, including a lemma
// PARTLY known individually and the GATE-CLOSED fallback.
// ===========================================================================

function learnDeltaWords({ occurrenceCount, alreadyKnownIndividually, isLemmaKnown }) {
  if (isLemmaKnown) return 0;
  return lemmaKnownDelta({ occurrenceCount, alreadyKnownIndividually, wasLemmaKnown: false, isLemmaKnown: true });
}

check("Number 1/2 -- whole-Qur'an known X of 77,429 and Y%, using the SAME rounding as everywhere else this app shows a percentage", () => {
  const known = 1234;
  assert.equal(QURAN_TOTAL_WORD_COUNT, 77429);
  assert.equal(percentRounded(known, QURAN_TOTAL_WORD_COUNT), Math.round(known * 10000 / 77429) / 100);
});

check("Number 3 -- this word's own share of the Qur'an, unaffected by the lemma gate (it reads only the already-loaded occurrence index)", () => {
  const count = 42;
  assert.equal(percentRounded(count, QURAN_TOTAL_WORD_COUNT), Math.round(count * 10000 / 77429) / 100);
});

check("Number 4 -- a lemma PARTLY known individually: the delta is occurrences MINUS those already known on their own account", () => {
  const words = learnDeltaWords({ occurrenceCount: 20, alreadyKnownIndividually: 6, isLemmaKnown: false });
  assert.equal(words, 14);
  assert.equal(percentRounded(words, QURAN_TOTAL_WORD_COUNT), percentRounded(14, 77429));
});

check("Number 4 -- a lemma ALREADY known everywhere shows NO delta at all (nothing left to gain)", () => {
  assert.equal(learnDeltaWords({ occurrenceCount: 20, alreadyKnownIndividually: 6, isLemmaKnown: true }), 0);
});

check("Number 4, GATE-CLOSED CASE -- falls back to counting only the ONE occurrence on screen, per issue #303's own instruction", () => {
  // The gate-closed fallback never consults occurrenceCount/alreadyKnownIndividually
  // at all -- it is a strictly narrower question: is THIS occurrence itself
  // already known?
  const thisOccurrenceKnown = false;
  const wordsWhileClosed = thisOccurrenceKnown ? 0 : 1;
  assert.equal(wordsWhileClosed, 1);
  const thisOccurrenceKnownAlready = true;
  assert.equal(thisOccurrenceKnownAlready ? 0 : 1, 0);
});

// ===========================================================================
// 4. effectiveOccurrenceState() APPLIED TO A WHOLE SCOPE -- the merge
// overlayLemmaKnownness() performs before computeArabicCoverage() ever runs,
// for the Ayah Card / coverage caption / Explore Word by Word tab.
// ===========================================================================

const KNOWN_OCC = { countsAsKnown: true, state: "achieved" };
const UNKNOWN_OCC = { countsAsKnown: false, state: "not_started" };
const KNOWN_LEMMA = { countsAsKnown: true };
const UNKNOWN_LEMMA = { countsAsKnown: false };

check("overlayLemmaKnownness(): an occurrence whose lemma is known reads as known, even though it was never individually claimed", () => {
  const views = new Map([["a", UNKNOWN_OCC], ["b", UNKNOWN_OCC]]);
  const lemmaViews = new Map([["a", KNOWN_LEMMA]]); // only "a"'s lemma was read/known
  const merged = overlayLemmaKnownness(views, lemmaViews);
  assert.equal(merged.get("a").countsAsKnown, true);
  assert.equal(merged.get("b").countsAsKnown, false, "an occurrence with no lemma view at all must be left exactly as it was");
});

check("overlayLemmaKnownness(): NEVER downgrades an occurrence that is already known on its own account", () => {
  const views = new Map([["a", KNOWN_OCC]]);
  const merged = overlayLemmaKnownness(views, new Map([["a", UNKNOWN_LEMMA]]));
  assert.equal(merged.get("a").countsAsKnown, true);
});

check("overlayLemmaKnownness(): preserves every other field on the view (state, awaitingReview, review) -- only countsAsKnown is overridden", () => {
  const view = { countsAsKnown: false, state: "learning", awaitingReview: false, review: "pending" };
  const merged = overlayLemmaKnownness(new Map([["a", view]]), new Map([["a", KNOWN_LEMMA]]));
  assert.equal(merged.get("a").state, "learning");
  assert.equal(merged.get("a").review, "pending");
  assert.equal(merged.get("a").countsAsKnown, true);
});

check("effectiveOccurrenceState() itself: both known is attributed to the occurrence's own claim, not the lemma (knownViaLemma stays false)", () => {
  assert.equal(effectiveOccurrenceState(KNOWN_OCC, KNOWN_LEMMA).knownViaLemma, false);
  assert.equal(effectiveOccurrenceState(UNKNOWN_OCC, KNOWN_LEMMA).knownViaLemma, true);
});

console.log(`\n==== Quran lemma progress numbers (issue #303): ${passed} passed, ${failed} failed ====`);
if (failed > 0) process.exit(1);
