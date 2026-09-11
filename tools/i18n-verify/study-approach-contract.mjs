import assert from "node:assert/strict";
import {
  eventMayGrantMastery,
  qualifiesListeningCompletion,
  studyEventApproachId,
  studyEventDedupeKey,
  studyEventPolicy,
} from "../../app/js/study-approach-contract.js";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }

check("Reading maps to Activity only", () => { assert.equal(studyEventPolicy("reading.completed").action, "practised"); assert.equal(eventMayGrantMastery("reading.completed"), false); });
check("Reading resolves plain and with-meaning catalogue variants", () => { assert.equal(studyEventApproachId("reading.completed", "plain"), "approach_01"); assert.equal(studyEventApproachId("reading.completed", "with-meaning"), "approach_03"); });
check("Listening resolves Arabic-only and with-meaning variants", () => { assert.equal(studyEventApproachId("listening.completed", "arabic-only"), "approach_07"); assert.equal(studyEventApproachId("listening.completed", "with-meaning"), "approach_08"); assert.equal(eventMayGrantMastery("listening.completed"), false); });
check("Journaling create and revision map to the Journaling Approach", () => { assert.equal(studyEventPolicy("journal.note-created").approachId, "approach_10"); assert.equal(studyEventPolicy("journal.note-revised").approachId, "approach_10"); });
check("WbW maps to approach 04 and remains dedicated state", () => { assert.equal(studyEventApproachId("wbw.engaged"), "approach_04"); assert.equal(studyEventPolicy("wbw.engaged").mastery, "dedicated-wbw-state-only"); });
check("80 percent completes Listening", () => { assert.equal(qualifiesListeningCompletion({ playedSeconds: 79.9, selectedUnitSeconds: 100 }), false); assert.equal(qualifiesListeningCompletion({ playedSeconds: 80, selectedUnitSeconds: 100 }), true); });
check("invalid Listening durations do not complete", () => assert.equal(qualifiesListeningCompletion({ playedSeconds: 5, selectedUnitSeconds: 0 }), false));
check("unit-day retry keys are deterministic", () => {
  const input = { eventType: "reading.completed", personId: "p1", unitKey: "ayah:2:255", dateIso: "2026-09-11T12:00:00Z" };
  assert.equal(studyEventDedupeKey(input), studyEventDedupeKey(input));
});
check("Note creation deduplicates for the lifetime of that creation event", () => {
  const a = studyEventDedupeKey({ eventType: "journal.note-created", personId: "p1", noteId: "n1", dateIso: "2026-09-11" });
  const b = studyEventDedupeKey({ eventType: "journal.note-created", personId: "p1", noteId: "n1", dateIso: "2026-09-12" });
  assert.equal(a, b);
});
check("only explicit claim and confirmation may change mastery state", () => { assert.equal(eventMayGrantMastery("status.claimed"), true); assert.equal(eventMayGrantMastery("status.confirmed"), true); });
check("unknown events have no policy and cannot grant mastery", () => { assert.equal(studyEventPolicy("reading.opened"), null); assert.equal(eventMayGrantMastery("reading.opened"), false); });
console.log(`\n==== Study-to-Approach contract v1: ${passed} passed, 0 failed ====`);
