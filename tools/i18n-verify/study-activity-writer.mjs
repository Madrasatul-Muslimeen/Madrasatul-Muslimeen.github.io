// Firebase-free execution of the new adapter against a serialized transaction stub.
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectStudyActivityEvidence } from "../../app/js/study-activity-evidence.js";
import { planStudyActivityAppend, planKeyedStudyActivityAppend, planGeneralActivityAppend, projectMixedWeekEntries } from "../../app/js/study-activity-week.js";

let source = fs.readFileSync(new URL("../../app/js/activity.js", import.meta.url), "utf8");
source = source.replace(/^import .*?;\n/gm, "");
source = `const {doc,getDoc,TENANT,parseUnitKey,runEnvelopeTransaction,planStudyActivityAppend,planKeyedStudyActivityAppend,planGeneralActivityAppend,projectMixedWeekEntries} = globalThis.__activityStub;\n${source}`;
source = source.replace(/export \{ activityActionLabel \} from "\.\/labels\.js";/, "");

const docs = new Map();
const writes = [];
let queue = Promise.resolve();
globalThis.__activityStub = {
  TENANT: { ACTIVITY: "activity" }, planStudyActivityAppend, planKeyedStudyActivityAppend, planGeneralActivityAppend, projectMixedWeekEntries,
  doc: (_db, collection, id) => `${collection}/${id}`,
  getDoc: async (path) => ({ id: path.split("/").at(-1), exists: () => docs.has(path), data: () => docs.get(path) }),
  parseUnitKey: (key) => ({ unitType: key.split(":", 1)[0] }),
  runEnvelopeTransaction: (_db, uid, callback) => {
    const execute = async () => {
      const pending = [];
      const api = {
        get: async (collection, id) => {
          const value = docs.get(`${collection}/${id}`);
          return { exists: () => value !== undefined, data: () => value };
        },
        create: (collection, id, data) => pending.push({ kind: "create", collection, id, data, uid }),
        update: (collection, id, data) => pending.push({ kind: "update", collection, id, data, uid }),
      };
      const result = await callback(api);
      for (const write of pending) { const path = `${write.collection}/${write.id}`; docs.set(path, write.kind === "update" ? { ...docs.get(path), ...write.data } : write.data); writes.push(write); }
      return result;
    };
    const result = queue.then(execute); queue = result.then(() => {}, () => {}); return result;
  },
};
const { logStudyActivityEvidence, logKeyedStudyActivityEvidence, logActivity, getWeekActivity, getWeekActivityRaw } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const base = { eventType: "reading.completed", tenantId: "t1", personId: "p1", unitKey: "ayah:2:255", dateIso: "2026-09-12", mode: "plain" };
const evidence = projectStudyActivityEvidence(base);
const options = { uid: "actor", weekStartsOn: 1 };
const results = await Promise.all(Array.from({ length: 3 }, () => logStudyActivityEvidence({}, evidence, options)));
assert.deepEqual(results.map((r) => r.appended), [true, false, false]);
assert.equal(writes.length, 1);
assert.equal(writes[0].id, "t1__p1__2026-09-07");
const second = projectStudyActivityEvidence({ ...base, dateIso: "2026-09-13" });
assert.equal((await logStudyActivityEvidence({}, second, options)).appended, true);
assert.equal(writes[1].kind, "update");
assert.equal(writes[1].data.entries.length, 0);
assert.equal(Object.keys(writes[1].data.v1Events).length, 2);
await assert.rejects(logStudyActivityEvidence({}, evidence, { ...options, uid: "" }), /uid/);
assert.equal(writes.length, 2);
docs.clear(); writes.length = 0;
const keyed = await Promise.all(Array.from({ length: 3 }, () => logKeyedStudyActivityEvidence({}, evidence, options)));
assert.deepEqual(keyed.map((r) => r.appended), [true, false, false]);
assert.equal(writes.length, 1);
assert.deepEqual(writes[0].data.entries, []);
assert.equal(writes[0].data.v1Events[evidence.eventKey].eventKey, evidence.eventKey);
assert.equal((await logKeyedStudyActivityEvidence({}, second, options)).appended, true);
assert.equal(writes[1].kind, "update");
assert.equal(Object.keys(writes[1].data.v1Events).length, 2);
docs.clear(); writes.length = 0;
const general = { tenantId: "t1", personId: "p1", date: new Date("2026-09-12T12:00:00Z"), weekStartsOn: 1,
  subjectId: "quran", unitKey: "ayah:2:255", trackableId: "recitation", action: "practised", uid: "actor" };
await Promise.all(Array.from({ length: 3 }, () => logActivity({}, general)));
assert.equal(writes.length, 1);
assert.deepEqual(writes[0].data.entries, []);
await logActivity({}, { ...general, action: "selfCheck", viaProgramId: "program1" });
assert.equal(writes.length, 2);
assert.equal(writes[1].data.entries, undefined, "historical array must never be updated");
const week = await getWeekActivity({}, "t1", "p1", "2026-09-07");
assert.equal(week.entries.length, 2);
assert.equal(week.entries[1].viaProgramId, "program1");
assert.equal((await getWeekActivityRaw({}, "t1", "p1", "2026-09-07")).entries.length, 0);
await assert.rejects(logActivity({}, { ...general, uid: "" }), /uid/);
delete globalThis.__activityStub;
console.log("==== Study weekly Activity adapter: serialized retry, append and rejection passed ====");
