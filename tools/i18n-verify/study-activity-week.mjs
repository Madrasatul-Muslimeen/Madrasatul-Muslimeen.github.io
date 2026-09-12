import assert from "node:assert/strict";
import { projectStudyActivityEvidence } from "../../app/js/study-activity-evidence.js";
import { planStudyActivityAppend, studyActivityWeekKey, MAX_STUDY_WEEK_ENTRIES } from "../../app/js/study-activity-week.js";

let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`  PASS  ${name}`); };
const evidence = projectStudyActivityEvidence({ eventType: "reading.completed", tenantId: "t1", personId: "p1", unitKey: "ayah:2:255", dateIso: "2026-09-12", mode: "plain" });
const first = planStudyActivityAppend(null, evidence, 1);
check("week starts on tenant Monday in UTC", () => assert.equal(studyActivityWeekKey("2026-09-12", 1), "2026-09-07"));
check("first entry stores retry key without mastery", () => { assert.equal(first.entries.length, 1); assert.equal(first.entries[0].eventKey, evidence.eventKey); assert.equal(first.entries[0].action, "practised"); assert.equal(first.entries[0].masteryEffect, undefined); });
check("retry leaves existing entries unchanged", () => {
  const existing = { tenantId: "t1", personId: "p1", weekKey: first.weekKey, entries: [{ legacy: true }, ...first.entries] };
  assert.equal(planStudyActivityAppend(existing, evidence, 1).appended, false);
  const next = projectStudyActivityEvidence({ ...evidence, dateIso: "2026-09-13", eventType: "reading.completed", mode: "plain" });
  const result = planStudyActivityAppend(existing, next, 1);
  assert.equal(result.entries[0], existing.entries[0]); assert.equal(result.entries[1], existing.entries[1]); assert.equal(result.entries.length, 3);
});
check("tenant and week mismatch reject", () => {
  for (const patch of [{ tenantId: "other" }, { weekKey: "2026-09-14" }]) {
    assert.throws(() => planStudyActivityAppend({ tenantId: "t1", personId: "p1", weekKey: first.weekKey, entries: [], ...patch }, evidence, 1), /scope/);
  }
});
check("forged event key and Approach reject", () => {
  assert.throws(() => planStudyActivityAppend(null, { ...evidence, eventKey: "fake" }, 1), /contract/);
  assert.throws(() => planStudyActivityAppend(null, { ...evidence, trackableId: "approach_03" }, 1), /contract/);
});
check("invalid dates and week starts reject", () => {
  assert.throws(() => studyActivityWeekKey("2026-02-30", 1), /date/);
  assert.throws(() => studyActivityWeekKey("2026-09-12", 7), /week start/);
});
check("weekly cap rejects a new entry, permits a retry", () => {
  const entries = Array.from({ length: MAX_STUDY_WEEK_ENTRIES }, (_, i) => ({ eventKey: `legacy:${i}` }));
  const existing = { tenantId: "t1", personId: "p1", weekKey: first.weekKey, entries };
  assert.throws(() => planStudyActivityAppend(existing, evidence, 1), /limit/);
  assert.equal(planStudyActivityAppend({ ...existing, entries: [...entries.slice(1), first.entries[0]] }, evidence, 1).appended, false);
});
check("Listening requires qualifying playback on revalidation", () => {
  const listening = projectStudyActivityEvidence({ ...evidence, eventType: "listening.completed", mode: "arabic-only", playedSeconds: 80, selectedUnitSeconds: 100 });
  assert.ok(planStudyActivityAppend(null, listening, 1).appended);
  assert.throws(() => planStudyActivityAppend(null, { ...listening, playedSeconds: 1 }, 1), /contract/);
});
console.log(`\n==== Study weekly Activity planning: ${passed} passed, 0 failed ====`);
