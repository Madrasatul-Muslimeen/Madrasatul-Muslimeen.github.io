import assert from "node:assert/strict";
import { planGeneralActivityAppend, projectMixedWeekEntries } from "../../app/js/study-activity-week.js";
const scope = { tenantId: "tenant1", personId: "person1", weekKey: "2026-09-07" };
const entry = { date: "2026-09-12", subjectId: "quran", unitKey: "ayah:2:255", unitType: "ayah", trackableId: "recitation", action: "practised", viaProgramId: null, viaSessionId: null };
const first = planGeneralActivityAppend(null, { ...scope, entry });
assert.equal(first.entries.length, 0);
assert.equal(projectMixedWeekEntries(first).length, 1);
assert.equal(planGeneralActivityAppend({ ...scope, ...first }, { ...scope, entry }).appended, false);
const second = planGeneralActivityAppend({ ...scope, ...first }, { ...scope, entry: { ...entry, viaSessionId: "class1", action: "selfCheck" } });
assert.equal(projectMixedWeekEntries(second)[1].viaSessionId, "class1");
assert.equal(Object.keys(second.v1Events).length, 2);
const legacy = { ...scope, entries: [entry, entry] };
assert.equal(planGeneralActivityAppend(legacy, { ...scope, entry }).appended, false);
assert.deepEqual(planGeneralActivityAppend(legacy, { ...scope, entry: { ...entry, action: "claimed" } }).entries, legacy.entries);
for (const bad of [{ viaProgramId: {} }, { unitType: "ruku" }, { date: "2026-09-19" }, { action: "invented" }, { trackableId: "x".repeat(300) }]) {
  assert.throws(() => planGeneralActivityAppend(null, { ...scope, entry: { ...entry, ...bad } }));
}
assert.throws(() => planGeneralActivityAppend({ ...scope, entries: Array(500).fill(entry) }, { ...scope, entry: { ...entry, action: "claimed" } }), RangeError);
assert.throws(() => planGeneralActivityAppend({ ...scope, entries: [] }, { ...scope, personId: "other", entry }), /scope mismatch/);
console.log("==== General Activity week: mixed reads, retry, immutable legacy, context and bounds passed ====");
