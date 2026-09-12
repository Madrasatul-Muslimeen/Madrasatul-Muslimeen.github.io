// Isolated candidate only; never loads firestore.rules or a production endpoint.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-activity-v1";
const HOST = "127.0.0.1";
const PORT = 8085;
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = fs.readFileSync(path.resolve(here, "../../tests/firestore/activity-v1.proposed.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(process.env.FIRESTORE_EMULATOR_HOST ?? `${HOST}:${PORT}`, `${HOST}:${PORT}`);

const tenantId = "t1", personId = "p1", weekKey = "2026-09-07";
const id = `${tenantId}__${personId}__${weekKey}`;
const entry = { contractVersion: "activity-entry:v1", date: "2026-09-12", subjectId: "quran", unitKey: "ayah:2:255", unitType: "ayah", trackableId: "recitation", action: "practised", viaProgramId: null, viaSessionId: null };
const key = ["activity-entry:v1", tenantId, personId, weekKey, entry.date, entry.subjectId, entry.unitKey, entry.trackableId, entry.action, "", ""].join("|");
const value = { ...entry, eventKey: key };
const envelope = { schemaVersion: 1, createdBy: "self", createdAt: new Date("2026-09-07"), updatedAt: new Date("2026-09-12") };
const week = { tenantId, personId, weekKey, entries: [], v1Events: { [key]: value }, lastEventKey: key, ...envelope };

 test("candidate enforces Option B isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", personId), { tenantId, authUid: "self" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId, authUid: "other" });
      await setDoc(doc(db, "tenantPeople", "p1__x"), { tenantId, authUid: "self" });
    });
    const self = env.authenticatedContext("self").firestore();
    const other = env.authenticatedContext("other").firestore();
    const anon = env.unauthenticatedContext().firestore();
    const ref = doc(self, "activity", id);
    await assertFails(getDoc(doc(anon, "activity", id)));
    await assertFails(setDoc(doc(anon, "activity", id), week));
    await assertFails(setDoc(doc(other, "activity", id), week));
    await assertFails(setDoc(doc(self, "activity", "t1__p1__2026-09-08"), week));
    await assertFails(setDoc(doc(self, "activity", "t2__p1__2026-09-07"),
      { ...week, tenantId: "t2", v1Events: { [key.replace("|t1|", "|t2|")]: { ...value, eventKey: key.replace("|t1|", "|t2|") } }, lastEventKey: key.replace("|t1|", "|t2|") }));
    const ambiguousKey = key.replace("|p1|", "|p1__x|");
    await assertFails(setDoc(doc(self, "activity", "t1__p1__x__2026-09-07"),
      { ...week, personId: "p1__x", v1Events: { [ambiguousKey]: { ...value, eventKey: ambiguousKey } }, lastEventKey: ambiguousKey }));
    await assertFails(setDoc(ref, { ...week, entries: [entry], v1Events: {} }));
    await assertFails(setDoc(ref, { ...week, masteryEffect: "approved" }));
    await assertFails(setDoc(ref, { ...week, createdBy: "other" }));
    await assertFails(setDoc(ref, { ...week, v1Events: { forged: value }, lastEventKey: "forged" }));
    const studyKey = '["study-approach-contract:v1","t1","p1","reading.completed"]';
    const studyValue = { eventKey: studyKey, contractVersion: "study-approach-contract:v1",
      date: "2026-09-12", unitKey: "ayah:2:255", subjectId: "quran", trackableId: "approach_01", action: "practised" };
    await assertFails(setDoc(ref, { ...week, v1Events: { [studyKey]: studyValue }, lastEventKey: studyKey }));
    await assertSucceeds(setDoc(ref, week));
    await assertSucceeds(getDoc(ref));
    await assertFails(getDoc(doc(other, "activity", id)));
    await assertFails(deleteDoc(ref));
    const key2 = key.replace("|practised|", "|selfCheck|");
    const value2 = { ...value, eventKey: key2, action: "selfCheck" };
    await assertFails(updateDoc(ref, { entries: [entry] }));
    await assertFails(updateDoc(ref, { v1Events: { [key]: { ...value, action: "claimed" }, [key2]: value2 }, lastEventKey: key2 }));
    await assertFails(updateDoc(ref, { v1Events: { [key]: value, forged: value2 }, lastEventKey: "forged" }));
    await assertSucceeds(updateDoc(ref, { v1Events: { [key]: value, [key2]: value2 }, lastEventKey: key2 }));
    await assertFails(updateDoc(ref, { v1Events: { [key2]: value2 }, lastEventKey: key2 }));
    const persisted = await assertSucceeds(getDoc(ref));
    assert.deepEqual(persisted.data().entries, []);
    assert.equal(Object.keys(persisted.data().v1Events).length, 2);
    const oldId = "t1__p1__2026-09-14";
    const oldRef = doc(self, "activity", oldId);
    const duplicate = { date: "2026-09-15", action: "claimed", unitKey: "ayah:2:255" };
    const oldWeek = { tenantId, personId, weekKey: "2026-09-14", entries: [duplicate, duplicate], ...envelope };
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "activity", oldId), oldWeek));
    const oldKey = ["activity-entry:v1", tenantId, personId, "2026-09-14", "2026-09-15", "quran", "ayah:2:255", "recitation", "practised", "", ""].join("|");
    const oldValue = { ...value, date: "2026-09-15", eventKey: oldKey };
    await assertFails(updateDoc(oldRef, { entries: [duplicate, { ...duplicate, action: "practised" }], v1Events: { [oldKey]: oldValue }, lastEventKey: oldKey }));
    await assertSucceeds(updateDoc(oldRef, { v1Events: { [oldKey]: oldValue }, lastEventKey: oldKey }));
    assert.deepEqual((await assertSucceeds(getDoc(oldRef))).data().entries, [duplicate, duplicate]);
    const fullId = "t1__p1__2026-09-21";
    const fullRef = doc(self, "activity", fullId);
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "activity", fullId),
      { ...oldWeek, weekKey: "2026-09-21", entries: Array(500).fill(duplicate) }));
    const fullKey = oldKey.replace("2026-09-14", "2026-09-21").replace("2026-09-15", "2026-09-22");
    await assertFails(updateDoc(fullRef, { v1Events: { [fullKey]: { ...oldValue, eventKey: fullKey, date: "2026-09-22" } }, lastEventKey: fullKey }));
  } finally {
    await env.cleanup();
  }
});
