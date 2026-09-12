import assert from "node:assert/strict";
import { keyedStudyEventId, prototypeKeyedWeek, prototypeRawKeyedWeek, rawStudyEventFieldKey, MAX_V1_EVENTS_PER_WEEK } from "./activity-keyed-week-prototype.mjs";

const evidence = { eventKey: '["v1","t1","p1","reading.completed","approach_01","ayah:2:255","2026-09-12"]', contractVersion: "study-approach-contract:v1", masteryEffect: "none", action: "practised", date: "2026-09-12", unitKey: "ayah:2:255", trackableId: "approach_01" };
const legacy = [{ marker: "same" }, { marker: "same" }];
const original = { tenantId: "t1", personId: "p1", weekKey: "2026-09-07", entries: legacy };
const first = prototypeKeyedWeek(original, evidence);
assert.equal(first.appended, true);
assert.equal(first.document.entries, legacy);
assert.deepEqual(first.document.entries, [{ marker: "same" }, { marker: "same" }]);
assert.match(first.id, /^[a-f0-9]{64}$/);
assert.deepEqual(prototypeKeyedWeek(first.document, evidence), { appended: false, id: first.id, document: first.document });
const second = prototypeKeyedWeek(first.document, { ...evidence, eventKey: evidence.eventKey + ":next" });
assert.equal(Object.keys(second.document.v1Events).length, 2);
assert.equal(keyedStudyEventId(evidence.eventKey), first.id);
assert.notEqual(keyedStudyEventId(evidence.eventKey + ":next"), first.id);
assert.throws(() => prototypeKeyedWeek({ ...original, v1Events: { [first.id]: { eventKey: "different" } } }, evidence), /collision/);
assert.throws(() => prototypeKeyedWeek({ ...original, v1Events: Object.fromEntries(Array.from({ length: MAX_V1_EVENTS_PER_WEEK }, (_, i) => [String(i), {}])) }, evidence), /limit/);
assert.throws(() => prototypeKeyedWeek({ ...original, entries: [{ body: "x".repeat(750_000) }] }, evidence), /byte budget/);
assert.throws(() => keyedStudyEventId("x".repeat(1025)), /Bounded/);
// Counterexample: Rules list.hasAll checks membership, not multiplicity or order.
const oldRows = ["A", "A"];
const substitutedRows = ["A", "B", "C"];
assert.equal(substitutedRows.length, oldRows.length + 1);
assert.equal(oldRows.every((row) => substitutedRows.includes(row)), true);
assert.notDeepEqual(substitutedRows.slice(0, oldRows.length), oldRows);
// A forged map key can hold the same raw key; Rules cannot hash to reject it.
const forged = { ...original, v1Events: { ["f".repeat(64)]: { eventKey: evidence.eventKey } } };
assert.equal(prototypeKeyedWeek(forged, evidence).appended, true);
const rawEvidence = { ...evidence, eventKey: evidence.eventKey.replace('"v1"', '"study-approach-contract:v1"') };
const rawFirst = prototypeRawKeyedWeek(original, rawEvidence);
assert.equal(rawFirst.id, rawEvidence.eventKey);
assert.equal(rawFirst.document.v1Events[rawEvidence.eventKey].eventKey, rawEvidence.eventKey);
assert.equal(prototypeRawKeyedWeek(rawFirst.document, rawEvidence).appended, false);
assert.throws(() => rawStudyEventFieldKey('["study-approach-contract:v1",' + "𝄞".repeat(400) + ']'), /Bounded/);
console.log("==== Offline keyed Activity week prototype: legacy duplicate retention, retry, bound, mismatch passed ====");
