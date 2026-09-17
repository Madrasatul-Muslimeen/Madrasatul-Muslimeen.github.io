// MAP Phase 3 -- the pure word-progress state model.
// Asserts the LOCKS, not just the happy path: Activity != Mastery, a word
// state is not an Approach claim, levels stay independent, I6 freezing, and
// the measured document bound the storage choice rests on.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  WORD_PROGRESS_CONTRACT, WBW_WORD_STATES, WBW_REVIEW_STATES, ARABIC_LEVELS, IMPLEMENTED_ARABIC_LEVELS,
  MAX_WORDS_PER_AYAH, MAX_RETAINED_DECISIONS,
  wordProgressLaneId, parseWordProgressLaneId, wordProgressEntryKey, occurrenceIdForLaneEntry, laneIdForOccurrence,
  wordProgressAuthority, emptyWordProgressEntry, decodeLearnerEntry, decodeSupervisorEntry,
  claimLearnerState, decideApproval, resolveWordProgress,
  buildLaneDocument, laneFieldUpdate, decodeLaneDocument, requireImplementedLevel,
} from "../../app/js/quran-word-progress.js";

let passed = 0, failed = 0;
function check(label, fn) {
  // A SYNCHRONOUS RUNNER COUNTS AN `async` BODY AS A PASS -- the assertion
  // throws inside an uncaught promise and the case prints PASS. Refuse it.
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${label}`);
  }
  catch (error) { failed++; console.log(`  FAIL  ${label}\n        ${error.message}`); }
}

const NOW = "2026-09-13T10:00:00.000Z";
const LATER = "2026-09-13T11:00:00.000Z";
const LANE = { tenantId: "t1", personId: "p1", level: "wbw", surah: 2, ayah: 282 };

// --- 1. Contract and vocabulary -------------------------------------------
check("the contract is named and versioned", () => assert.equal(WORD_PROGRESS_CONTRACT, "quran-word-progress:v1"));
check("a word's ramp is three rungs, not the Study Unit's six", () =>
  assert.deepEqual(WBW_WORD_STATES, ["not_started", "learning", "achieved"]));
check("not_applicable is deliberately not a word state", () =>
  assert.ok(!WBW_WORD_STATES.includes("not_applicable")));
check("review states mirror records.js confirmState", () =>
  assert.deepEqual(WBW_REVIEW_STATES, ["pending", "confirmed", "returned"]));

// --- 2. LOCK: Arabic levels stay independent, Basic/Depth stay deferred ----
check("all three Arabic levels are named", () => assert.deepEqual(ARABIC_LEVELS, ["wbw", "basic", "depth"]));
check("only WbW is implemented", () => assert.deepEqual(IMPLEMENTED_ARABIC_LEVELS, ["wbw"]));
check("Basic Arabic progress is REFUSED, not silently stored as WbW", () =>
  assert.throws(() => requireImplementedLevel("basic"), /deferred/));
check("Arabic in Depth progress is REFUSED too", () =>
  assert.throws(() => requireImplementedLevel("depth"), /deferred/));
check("an unknown level is rejected before the deferral check", () =>
  assert.throws(() => requireImplementedLevel("grammar"), /Unknown Arabic level/));
check("a lane id carries its level, so a later level cannot collide with v1", () =>
  assert.equal(wordProgressLaneId(LANE), "t1__p1__wbw__2_282"));

// --- 3. LOCK: Activity != Mastery -----------------------------------------
// The `async` here was the exact defect the runner's own guard now refuses:
// this body's assertion threw into an uncaught promise and the case printed
// PASS. It has never actually run until now (17 Sep 2026). It passes on its
// merits -- verified by mutation -- but it was believed for nothing.
check("the module exposes NO event-to-state projection", () => {
  const source = readFileSync(new URL("../../app/js/quran-word-progress.js", import.meta.url), "utf8");
  assert.ok(!/export function project|eventType|wbw\.engaged/.test(source),
    "a state must never be derivable from a study event in this module");
});
check("a claim requires an explicit named state, never an event", () =>
  assert.throws(() => claimLearnerState({ state: "wbw.engaged", actorPersonId: "p1", atIso: NOW }), /Unknown WbW word state/));

// --- 4. LOCK: a word state is not an Approach claim record ----------------
check("the module never references the records collection or a trackableId", () => {
  const source = readFileSync(new URL("../../app/js/quran-word-progress.js", import.meta.url), "utf8");
  assert.ok(!/trackableId|chunkKey|claimStatus\(/.test(source));
});

// --- 5. Lane identity ------------------------------------------------------
check("a lane id round-trips exactly", () => assert.deepEqual(parseWordProgressLaneId("t1__p1__wbw__2_282"), LANE));
check("a person id containing the separator is refused, not silently re-pointed", () =>
  assert.throws(() => wordProgressLaneId({ ...LANE, personId: "p1__evil" }), /separator/));
check("a slash in a tenant id is refused", () =>
  assert.throws(() => wordProgressLaneId({ ...LANE, tenantId: "a/b" }), /separator/));
check("legacy person id shapes are accepted unchanged (I16)", () => {
  assert.equal(parseWordProgressLaneId(wordProgressLaneId({ ...LANE, personId: "person_admin1" })).personId, "person_admin1");
  assert.equal(parseWordProgressLaneId(wordProgressLaneId({ ...LANE, personId: "p1757000000000" })).personId, "p1757000000000");
  assert.equal(parseWordProgressLaneId(wordProgressLaneId({ ...LANE, personId: "person_ab12cd34" })).personId, "person_ab12cd34");
});
check("an out-of-range surah is refused by ADR-007's own bounds", () =>
  assert.throws(() => wordProgressLaneId({ ...LANE, surah: 115 }), /surah/));
check("a lane entry maps back to its permanent ADR-007 occurrence id", () =>
  assert.equal(occurrenceIdForLaneEntry("t1__p1__wbw__2_282", 7), "quran-word-occurrence:v1:2:282:7"));
check("an occurrence id maps to its lane and position", () =>
  assert.deepEqual(laneIdForOccurrence({ tenantId: "t1", personId: "p1", occurrenceId: "quran-word-occurrence:v1:2:282:7" }),
    { laneId: "t1__p1__wbw__2_282", position: 7 }));
check("a v2 occurrence id is refused rather than read as v1", () =>
  assert.throws(() => laneIdForOccurrence({ tenantId: "t1", personId: "p1", occurrenceId: "quran-word-occurrence:v2:2:282:7" }), /Unsupported/));
check("position 0 and position 129 are both refused", () => {
  assert.throws(() => wordProgressEntryKey(0), /position/);
  assert.throws(() => wordProgressEntryKey(MAX_WORDS_PER_AYAH + 1), /position/);
});

// --- 6. Authority ----------------------------------------------------------
const self = wordProgressAuthority({ actorPersonId: "p1", subjectPersonId: "p1", isSupervisor: false, confirmationRequired: false });
const selfNeedingReview = wordProgressAuthority({ actorPersonId: "p1", subjectPersonId: "p1", isSupervisor: false, confirmationRequired: true });
const teacher = wordProgressAuthority({ actorPersonId: "t9", subjectPersonId: "p1", isSupervisor: true, confirmationRequired: true });
const stranger = wordProgressAuthority({ actorPersonId: "x9", subjectPersonId: "p1", isSupervisor: false, confirmationRequired: true });
check("a learner may claim their own word", () => assert.ok(self.mayClaim));
check("a learner may never sign off their own claim", () => assert.ok(!selfNeedingReview.mayDecide));
check("a supervisor may claim for a managed student", () => assert.ok(teacher.mayClaim));
check("a supervisor may decide where confirmation is required", () => assert.ok(teacher.mayDecide));
check("a supervisor is offered no decision where none is required", () =>
  assert.ok(!wordProgressAuthority({ actorPersonId: "t9", subjectPersonId: "p1", isSupervisor: true, confirmationRequired: false }).mayDecide));
check("someone who is neither may do nothing", () => assert.ok(!stranger.mayClaim && !stranger.mayDecide));
check("a person claiming supervisor status over themself is still only self", () => {
  const a = wordProgressAuthority({ actorPersonId: "p1", subjectPersonId: "p1", isSupervisor: true, confirmationRequired: true });
  assert.ok(a.isSelf && !a.isSupervisor && !a.mayDecide);
});

// --- 7. Transitions --------------------------------------------------------
check("an unseen word is not_started with no claimant", () =>
  assert.deepEqual(emptyWordProgressEntry(), { state: "not_started", at: null, byPersonId: null }));
const firstClaim = claimLearnerState({ state: "learning", actorPersonId: "p1", atIso: NOW, confirmationRequired: true });
check("a first claim records who and when", () =>
  assert.deepEqual(firstClaim.learner, { state: "learning", at: NOW, byPersonId: "p1" }));
check("re-claiming the same state writes nothing", () => {
  const again = claimLearnerState({ currentLearner: firstClaim.learner, state: "learning", actorPersonId: "p1", atIso: LATER, confirmationRequired: true });
  assert.equal(again.changed, false);
  assert.equal(again.learner.at, NOW, "the original timestamp must survive a no-op");
});
check("a non-UTC or malformed instant is refused", () => {
  assert.throws(() => claimLearnerState({ state: "learning", actorPersonId: "p1", atIso: "2026-09-13" }), /UTC ISO instant/);
  assert.throws(() => claimLearnerState({ state: "learning", actorPersonId: "p1", atIso: "2026-13-45T00:00:00Z" }), /UTC ISO instant/);
});
check("a supervisor cannot decide a word that was never claimed", () =>
  assert.throws(() => decideApproval({ currentLearner: emptyWordProgressEntry(), review: "confirmed", byPersonId: "t9", atIso: NOW }), /no claim to decide/));
check("a decision must be confirmed or returned, never an arbitrary word", () =>
  assert.throws(() => decideApproval({ currentLearner: { state: "achieved" }, review: "approved", byPersonId: "t9", atIso: NOW }), /confirmed.*returned/));

const achieved = claimLearnerState({ currentLearner: firstClaim.learner, state: "achieved", actorPersonId: "p1", atIso: LATER, confirmationRequired: true });
const confirmed = decideApproval({ currentLearner: achieved.learner, currentSupervisor: achieved.supervisor, review: "confirmed", byPersonId: "t9", atIso: LATER });
check("a confirmation records who decided and WHICH claim it was for", () => {
  assert.equal(confirmed.supervisor.review, "confirmed");
  assert.equal(confirmed.supervisor.byPersonId, "t9");
  assert.equal(confirmed.supervisor.forState, "achieved");
  assert.equal(confirmed.supervisor.forClaimAt, achieved.learner.at, "and WHEN that claim was made");
});
check("a decision pinned to a different claim instant cannot bless this one", () => {
  const stale = { ...confirmed.supervisor, forClaimAt: "2020-01-01T00:00:00.000Z" };
  assert.equal(resolveWordProgress({ learner: confirmed.learner, supervisor: stale, confirmationRequired: true }).countsAsKnown, false);
});

// --- 8. I6 -- frozen confirmation ------------------------------------------
// UPDATED after the data-layer suite caught a real defect in the shape these
// two checks were written against. The old model re-opened a review by
// writing "pending" over the stored decision -- which really did edit a frozen
// confirmation, and then pushed that phantom "pending" into history in place
// of the confirmation a supervisor had actually given. Freezing is structural
// now: a claim never touches the supervisor lane at all, and a decision is
// pinned to the claim instant it was given for. So these assert the RESOLVED
// result a reader sees, which is what they were always really about.
check("a later claim gets its own look, and the decision given is not edited", () => {
  const withdrawn = claimLearnerState({ currentLearner: confirmed.learner, currentSupervisor: confirmed.supervisor, state: "learning", actorPersonId: "p1", atIso: LATER, confirmationRequired: true });
  assert.equal(withdrawn.supervisor, confirmed.supervisor, "the supervisor lane is not touched by a claim");
  const reclaimed = claimLearnerState({ currentLearner: withdrawn.learner, currentSupervisor: withdrawn.supervisor, state: "achieved", actorPersonId: "p1", atIso: "2026-09-14T09:00:00.000Z", confirmationRequired: true });
  const view = resolveWordProgress({ learner: reclaimed.learner, supervisor: reclaimed.supervisor, confirmationRequired: true });
  assert.equal(view.review, "pending", "a NEW achieved claim must get its own look");
  assert.equal(view.countsAsKnown, false, "and must not be blessed by the old approval");
  assert.equal(reclaimed.supervisor.at, confirmed.supervisor.at, "the decision's own timestamp is frozen");
  assert.equal(reclaimed.supervisor.byPersonId, "t9", "who decided is frozen");
  assert.equal(reclaimed.supervisor.review, "confirmed", "and the decision itself is NOT rewritten");
});
check("a claim costs no supervisor write even when confirmation is required", () => {
  const r = claimLearnerState({ currentLearner: { state: "learning", at: NOW, byPersonId: "p1" }, currentSupervisor: confirmed.supervisor, state: "achieved", actorPersonId: "p1", atIso: LATER, confirmationRequired: true });
  assert.equal(r.supervisor, confirmed.supervisor);
});
check("a superseded decision is kept, not destroyed (I4)", () => {
  const returned = decideApproval({ currentLearner: confirmed.learner, currentSupervisor: confirmed.supervisor, review: "returned", byPersonId: "t9", atIso: "2026-09-15T09:00:00.000Z", note: "check the vowel" });
  assert.equal(returned.supervisor.history[0].forClaimAt, confirmed.supervisor.forClaimAt, "the superseded decision keeps the claim it was given for");
  assert.equal(returned.supervisor.review, "returned");
  assert.equal(returned.supervisor.history.length, 1);
  assert.equal(returned.supervisor.history[0].review, "confirmed");
  assert.equal(returned.supervisor.history[0].byPersonId, "t9");
});
check("history is bounded and says how much it dropped", () => {
  let s = { currentLearner: { state: "achieved", at: NOW, byPersonId: "p1" }, currentSupervisor: decodeSupervisorEntry(null) };
  for (let i = 0; i < MAX_RETAINED_DECISIONS + 3; i++) {
    const out = decideApproval({ ...s, review: i % 2 ? "returned" : "confirmed", byPersonId: "t9", atIso: `2026-09-${String(13 + i).padStart(2, "0")}T09:00:00.000Z` });
    s = { currentLearner: out.learner, currentSupervisor: out.supervisor };
  }
  assert.equal(s.currentSupervisor.history.length, MAX_RETAINED_DECISIONS);
  assert.equal(s.currentSupervisor.historyTruncated, 2, "what fell off is counted, never silently claimed complete");
});
check("an empty supervisor entry does not push a phantom decision into history", () => {
  const out = decideApproval({ currentLearner: { state: "achieved", at: NOW, byPersonId: "p1" }, currentSupervisor: decodeSupervisorEntry(null), review: "confirmed", byPersonId: "t9", atIso: NOW });
  assert.equal(out.supervisor.history.length, 0);
});

// --- 9. The resolved view: what coverage is allowed to count ---------------
check("an unclaimed word counts as nothing and awaits nothing", () => {
  const v = resolveWordProgress({ confirmationRequired: true });
  assert.equal(v.state, "not_started");
  assert.equal(v.countsAsKnown, false);
  assert.equal(v.awaitingReview, false);
});
check("LOCK: a claim alone is not knowledge where confirmation is required", () => {
  const v = resolveWordProgress({ learner: achieved.learner, supervisor: achieved.supervisor, confirmationRequired: true });
  assert.equal(v.countsAsKnown, false);
  assert.equal(v.awaitingReview, true);
  assert.equal(v.review, "pending");
});
check("a claim IS knowledge where no confirmation is required", () => {
  const v = resolveWordProgress({ learner: achieved.learner, confirmationRequired: false });
  assert.equal(v.countsAsKnown, true);
  assert.equal(v.review, "not_required");
});
check("a confirmed claim counts, and names its reviewer", () => {
  const v = resolveWordProgress({ learner: confirmed.learner, supervisor: confirmed.supervisor, confirmationRequired: true });
  assert.equal(v.countsAsKnown, true);
  assert.equal(v.reviewedByPersonId, "t9");
});
check("a returned claim does NOT count, and carries its reason back", () => {
  const returned = decideApproval({ currentLearner: confirmed.learner, currentSupervisor: confirmed.supervisor, review: "returned", byPersonId: "t9", atIso: LATER, note: "check the vowel" });
  const v = resolveWordProgress({ learner: returned.learner, supervisor: returned.supervisor, confirmationRequired: true });
  assert.equal(v.countsAsKnown, false);
  assert.equal(v.returnNote, "check the vowel");
});
check("an old approval cannot silently bless a claim it was not given for", () => {
  // forState says the approval was for "achieved"; the learner has since
  // stepped back to "learning". Nothing may count.
  const v = resolveWordProgress({ learner: { state: "learning", at: LATER, byPersonId: "p1" }, supervisor: confirmed.supervisor, confirmationRequired: true });
  assert.equal(v.countsAsKnown, false);
  assert.equal(v.review, "none");
});

// --- 10. Storage shape and the measured bound ------------------------------
check("a lane document carries both contract versions and its own coordinates", () => {
  const d = buildLaneDocument({ laneId: "t1__p1__wbw__2_282", lane: "learner", entries: { 1: achieved.learner } });
  assert.equal(d.contractVersion, WORD_PROGRESS_CONTRACT);
  assert.equal(d.identityContract, "quran-word-occurrence:v1");
  assert.equal(d.tenantId, "t1");
  assert.equal(d.personId, "p1");
  assert.equal(d.surah, 2);
  assert.equal(d.ayah, 282);
});
check("one changed word produces one field update, not a whole document", () => {
  const u = laneFieldUpdate({ lane: "learner", position: 7, entry: achieved.learner });
  assert.deepEqual(Object.keys(u), ["entries.7"]);
  assert.equal(u["entries.7"].s, "a");
});
check("a lane document refuses more entries than the longest ayah has words", () => {
  const tooMany = Object.fromEntries(Array.from({ length: MAX_WORDS_PER_AYAH + 1 }, (_, i) => [i + 1, emptyWordProgressEntry()]));
  assert.throws(() => buildLaneDocument({ laneId: "t1__p1__wbw__2_282", lane: "learner", entries: tooMany }), /at most 128/);
});
check("a future contract version is refused rather than read as v1", () =>
  assert.throws(() => decodeLaneDocument({ contractVersion: "quran-word-progress:v2", entries: {} }), /Unsupported/));
check("a malformed stored entry decodes to not_started, never to a claim", () => {
  assert.equal(decodeLearnerEntry({ s: "?" }).state, "not_started");
  assert.equal(decodeLearnerEntry(null).state, "not_started");
  assert.equal(decodeSupervisorEntry({ r: "?" }).review, "pending");
});
check("a non-numeric entry key is dropped rather than decoded", () =>
  assert.deepEqual(Object.keys(decodeLaneDocument({ lane: "learner", entries: { 3: { s: "a" }, "__proto__x": { s: "a" } } }).entries), ["3"]));
check("an encoded document round-trips through decode", () => {
  const built = buildLaneDocument({ laneId: "t1__p1__wbw__2_282", lane: "supervisor", entries: { 4: confirmed.supervisor } });
  const back = decodeLaneDocument(built);
  assert.equal(back.entries["4"].review, "confirmed");
  assert.equal(back.entries["4"].byPersonId, "t9");
  assert.equal(back.entries["4"].forState, "achieved");
});

// MEASURED, not asserted from a guess: the worst real ayah, fully populated,
// in both lanes, with realistic 28-character identifiers.
const worst = (() => {
  const longId = "tenant_0123456789abcdef", longPerson = "person_0123456789ab";
  const learnerEntries = {}, supervisorEntries = {};
  const history = Array.from({ length: MAX_RETAINED_DECISIONS }, (_, i) => ({ review: "returned", at: NOW, byPersonId: longPerson, note: "please look at this word again", forState: "achieved" }));
  for (let p = 1; p <= MAX_WORDS_PER_AYAH; p++) {
    learnerEntries[p] = { state: "achieved", at: NOW, byPersonId: longPerson };
    supervisorEntries[p] = { review: "confirmed", at: NOW, byPersonId: longPerson, note: null, forState: "achieved", history, historyTruncated: 0 };
  }
  const laneId = `${longId}__${longPerson}__wbw__2_282`;
  return {
    learner: JSON.stringify(buildLaneDocument({ laneId, lane: "learner", entries: learnerEntries })).length,
    supervisor: JSON.stringify(buildLaneDocument({ laneId, lane: "supervisor", entries: supervisorEntries })).length,
  };
})();
console.log(`\n  MEASURED  worst-case lane documents (2:282, 128 words, full history):`);
console.log(`            learner lane    ${worst.learner.toLocaleString()} JSON bytes`);
console.log(`            supervisor lane ${worst.supervisor.toLocaleString()} JSON bytes`);
console.log(`            NOT a Firestore encoded size and NOT a Rules proof -- a JSON proxy only.`);
check("the worst-case learner lane stays far inside a 1 MiB document", () => assert.ok(worst.learner < 100_000, `${worst.learner} bytes`));
check("the worst-case supervisor lane, history included, stays inside a 1 MiB document", () => assert.ok(worst.supervisor < 1_000_000, `${worst.supervisor} bytes`));

console.log(`\n==== Word progress state model: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
