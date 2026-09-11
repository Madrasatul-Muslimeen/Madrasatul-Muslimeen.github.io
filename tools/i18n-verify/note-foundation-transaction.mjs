// STAGE-5-TASK-19 — local execution test for the envelope-owned transaction
// facade. The Firebase CDN import is replaced in-memory with a deterministic
// stub; no Firebase or Firestore connection is made.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
source = source.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
  "const { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } = globalThis.__noteFoundationFirestoreStub;"
);

const writes = [];
const stamp = Object.freeze({ __serverTimestamp: true });
globalThis.__noteFoundationFirestoreStub = {
  doc: (_db, collectionName, docId) => ({ collectionName, docId }),
  setDoc: async () => {},
  updateDoc: async () => {},
  writeBatch: () => ({ set() {}, update() {}, async commit() {} }),
  serverTimestamp: () => stamp,
  runTransaction: async (_db, callback) => callback({
    get: async (ref) => ({ exists: () => true, ref, data: () => ({ currentRevisionId: "rev-0" }) }),
    set: (ref, data) => writes.push({ kind: "create", ref, data }),
    update: (ref, data) => writes.push({ kind: "update", ref, data }),
  }),
};

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { runEnvelopeTransaction } = await import(moduleUrl);

const result = await runEnvelopeTransaction({}, "guardian-uid", async (transaction) => {
  const existing = await transaction.get("notes", "tenant__note");
  assert.equal(existing.data().currentRevisionId, "rev-0");
  transaction.create("noteRevisions", "tenant__rev-1", { noteId: "note" });
  transaction.update("notes", "tenant__note", { currentRevisionId: "rev-1" });
  return "committed";
});

assert.equal(result, "committed");
assert.equal(writes.length, 2);
assert.deepEqual(writes[0].ref, { collectionName: "noteRevisions", docId: "tenant__rev-1" });
assert.equal(writes[0].data.schemaVersion, 1);
assert.equal(writes[0].data.createdBy, "guardian-uid");
assert.equal(writes[0].data.createdAt, stamp);
assert.equal(writes[0].data.updatedAt, stamp);
assert.deepEqual(writes[1].ref, { collectionName: "notes", docId: "tenant__note" });
assert.equal(writes[1].data.currentRevisionId, "rev-1");
assert.equal(writes[1].data.updatedAt, stamp);
assert.ok(!Object.hasOwn(writes[1].data, "createdAt"));

await assert.rejects(() => runEnvelopeTransaction({}, "", () => {}), /no uid supplied/);
await assert.rejects(() => runEnvelopeTransaction({}, "uid", null), /callback must be a function/);

delete globalThis.__noteFoundationFirestoreStub;
console.log("==== envelope transaction facade: 16 assertions passed ====");
