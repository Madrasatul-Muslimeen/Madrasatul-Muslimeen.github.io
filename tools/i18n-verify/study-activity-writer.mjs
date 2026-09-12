// Firebase-free execution of the new adapter against a serialized transaction stub.
import assert from "node:assert/strict";
import fs from "node:fs";
import { projectStudyActivityEvidence } from "../../app/js/study-activity-evidence.js";
import { planStudyActivityAppend } from "../../app/js/study-activity-week.js";

let source = fs.readFileSync(new URL("../../app/js/activity.js", import.meta.url), "utf8");
source = source.replace(/^import .*?;\n/gm, "");
source = `const {doc,getDoc,arrayUnion,TENANT,createDocument,updateDocument,parseUnitKey,runEnvelopeTransaction,planStudyActivityAppend} = globalThis.__activityStub;\n${source}`;
source = source.replace(/export \{ activityActionLabel \} from "\.\/labels\.js";/, "");

const docs = new Map();
const writes = [];
let queue = Promise.resolve();
globalThis.__activityStub = {
  TENANT: { ACTIVITY: "activity" }, planStudyActivityAppend,
  doc: () => { throw Error("Unexpected legacy read"); }, getDoc: () => { throw Error("Unexpected legacy read"); },
  arrayUnion: () => { throw Error("Unexpected legacy write"); }, createDocument: () => { throw Error("Unexpected legacy write"); },
  updateDocument: () => { throw Error("Unexpected legacy write"); }, parseUnitKey: () => { throw Error("Unexpected legacy parse"); },
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
      for (const write of pending) { docs.set(`${write.collection}/${write.id}`, write.data); writes.push(write); }
      return result;
    };
    const result = queue.then(execute); queue = result.then(() => {}, () => {}); return result;
  },
};
const { logStudyActivityEvidence } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
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
assert.equal(writes[1].data.entries.length, 2);
assert.equal(writes[1].data.entries[0].eventKey, evidence.eventKey);
await assert.rejects(logStudyActivityEvidence({}, evidence, { ...options, uid: "" }), /uid/);
assert.equal(writes.length, 2);
delete globalThis.__activityStub;
console.log("==== Study weekly Activity adapter: serialized retry, append and rejection passed ====");
