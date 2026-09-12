import assert from "node:assert/strict";
import { projectStudyActivityEvidence } from "../../app/js/study-activity-evidence.js";

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS  ${name}`); }
const common = { tenantId: "t1", personId: "p1", unitKey: "ayah:2:255", dateIso: "2026-09-12" };
check("explicit Reading projects Activity only", () => {
  const row = projectStudyActivityEvidence({ ...common, eventType: "reading.completed", mode: "plain" });
  assert.equal(row.action, "practised"); assert.equal(row.trackableId, "approach_01"); assert.equal(row.masteryEffect, "none");
});
check("Reading with meaning has a distinct Approach and retry key", () => {
  const a = projectStudyActivityEvidence({ ...common, eventType: "reading.completed", mode: "plain" });
  const b = projectStudyActivityEvidence({ ...common, eventType: "reading.completed", mode: "with-meaning" });
  assert.equal(b.trackableId, "approach_03"); assert.notEqual(a.eventKey, b.eventKey);
});
check("Listening under threshold produces no evidence", () => assert.equal(projectStudyActivityEvidence({ ...common, eventType: "listening.completed", mode: "arabic-only", playedSeconds: 79, selectedUnitSeconds: 100 }), null));
check("Listening at threshold produces evidence without mastery", () => {
  const row = projectStudyActivityEvidence({ ...common, eventType: "listening.completed", mode: "with-meaning", playedSeconds: 80, selectedUnitSeconds: 100 });
  assert.equal(row.trackableId, "approach_08"); assert.equal(row.masteryEffect, "none");
});
check("new Note maps to Journaling Activity", () => assert.equal(projectStudyActivityEvidence({ ...common, eventType: "journal.note-created", noteId: "n1" }).trackableId, "approach_10"));
check("WbW engagement maps to Approach 04 Activity, not approval", () => {
  const row = projectStudyActivityEvidence({ ...common, eventType: "wbw.engaged", occurrenceId: "quran-word-occurrence:v1:2:255:1" });
  assert.equal(row.trackableId, "approach_04"); assert.equal(row.masteryEffect, "none");
});
check("WbW evidence rejects malformed or mismatched occurrence identity", () => {
  assert.throws(() => projectStudyActivityEvidence({ ...common, eventType: "wbw.engaged", occurrenceId: "word:2:255:1" }), /invalid shape/);
  assert.throws(() => projectStudyActivityEvidence({ ...common, eventType: "wbw.engaged", occurrenceId: "quran-word-occurrence:v1:2:254:1" }), /selected ayah/);
});
check("unapproved/open interactions and status claims do not use this adapter", () => {
  assert.equal(projectStudyActivityEvidence({ ...common, eventType: "reading.opened" }), null);
  assert.equal(projectStudyActivityEvidence({ ...common, eventType: "status.claimed" }), null);
});
check("missing permanent Study Unit key fails closed", () => assert.throws(() => projectStudyActivityEvidence({ ...common, unitKey: "", eventType: "reading.completed", mode: "plain" }), /Study Unit/));
console.log(`\n==== Study Activity evidence projection: ${passed} passed, 0 failed ====`);
