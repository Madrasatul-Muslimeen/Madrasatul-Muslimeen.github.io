// STAGE-5-TASK-20 — Firebase-free execution tests for the uninvoked permanent
// Note data layer. Imports are replaced in memory; no network or database is
// contacted.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
source = source
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    "const { collection, getDocs, limit, orderBy, query, where } = globalThis.__nfFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/,
    "const { TENANT } = globalThis.__nfCollections;")
  .replace(/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/,
    "const { createDocument, runEnvelopeTransaction } = globalThis.__nfEnvelope;");

const TENANT = Object.freeze({
  NOTES: "notes", NOTE_SOURCES: "noteSources", NOTE_FOLDERS: "noteFolders",
  NOTE_PLACEMENTS: "notePlacements", NOTE_REVISIONS: "noteRevisions",
});
const writes = [];
const documents = new Map();
const snapshot = (value) => ({ exists: () => value !== undefined, data: () => value });

globalThis.__nfCollections = { TENANT };
globalThis.__nfFirestore = {
  collection: (_db, name) => ({ name }),
  where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
  limit: (value) => ({ limit: value }), query: (...parts) => ({ parts }),
  getDocs: async () => ({ docs: [] }),
};
globalThis.__nfEnvelope = {
  createDocument: async (_db, collectionName, docId, data, uid) => writes.push({ kind: "create", collectionName, docId, data, uid }),
  runEnvelopeTransaction: async (_db, uid, callback) => callback({
    get: async (collectionName, docId) => snapshot(documents.get(`${collectionName}/${docId}`)),
    create: (collectionName, docId, data) => writes.push({ kind: "create", collectionName, docId, data, uid }),
    update: (collectionName, docId, data) => writes.push({ kind: "update", collectionName, docId, data, uid }),
  }),
};

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const foundation = await import(moduleUrl);

assert.equal(foundation.noteFoundationDocId("tenant", "note"), "tenant__note");
assert.throws(() => foundation.noteFoundationDocId("bad/tenant", "note"), /path-safe/);

const created = await foundation.createPermanentNote({}, {
  tenantId: "tenant", ownerPersonId: "person", ownerUid: "owner-uid",
  noteId: "note-1", revisionId: "rev-1", title: "Title", bodyHtml: "<p>Body</p>",
  actorUid: "owner-uid",
  source: { sourceLinkId: "source-1", sourceKind: "quran", sourceKey: "ayah:1:1", relationshipKind: "origin", provenanceKind: "created-in-study" },
});
assert.deepEqual(created, { noteId: "note-1", revisionId: "rev-1", noteDocId: "tenant__note-1", revisionDocId: "tenant__rev-1" });
assert.deepEqual(writes.map(({ collectionName }) => collectionName), ["noteRevisions", "notes", "noteSources"]);
assert.equal(writes[0].data.previousRevisionId, null);
assert.equal(writes[1].data.currentRevisionId, "rev-1");
assert.equal(writes[2].data.sourceKey, "ayah:1:1");

documents.set("notes/tenant__note-1", {
  noteId: "note-1", tenantId: "tenant", ownerPersonId: "person", ownerUid: "owner-uid",
  status: "active", currentRevisionId: "rev-1",
});
writes.length = 0;
const revisionId = await foundation.updatePermanentNoteContent({}, {
  tenantId: "tenant", noteId: "note-1", expectedRevisionId: "rev-1", revisionId: "rev-2",
  title: "Changed", bodyHtml: "<p>Changed</p>", actorUid: "owner-uid",
});
assert.equal(revisionId, "rev-2");
assert.deepEqual(writes.map(({ collectionName, kind }) => `${kind}:${collectionName}`), ["create:noteRevisions", "update:notes"]);
assert.equal(writes[0].data.previousRevisionId, "rev-1");
assert.equal(writes[1].data.currentRevisionId, "rev-2");

await assert.rejects(() => foundation.updatePermanentNoteContent({}, {
  tenantId: "tenant", noteId: "note-1", expectedRevisionId: "stale", revisionId: "rev-3",
  title: "No", bodyHtml: "No", actorUid: "owner-uid",
}), /Stale Note revision/);

delete globalThis.__nfCollections;
delete globalThis.__nfFirestore;
delete globalThis.__nfEnvelope;
console.log("==== Note Foundation data layer: 15 assertions passed ====");
