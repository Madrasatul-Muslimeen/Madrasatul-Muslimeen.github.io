// STAGE-5-TASK-20 — Firebase-free execution tests for the uninvoked permanent
// Note data layer. Imports are replaced in memory; no network or database is
// contacted.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
source = source
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    "const { collection, doc, getDoc, getDocs, limit, orderBy, query, where } = globalThis.__nfFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/,
    "const { TENANT } = globalThis.__nfCollections;")
  .replace(/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/,
    "const { createDocument, runEnvelopeTransaction } = globalThis.__nfEnvelope;")
  // P6-B: the data layer now validates a folder's parent against ADR-010. That
  // module is PURE, so it is resolved to its real file rather than stubbed --
  // a data: URL cannot resolve a relative specifier, which is what broke this
  // suite the moment the import was added.
  .replace(/from "\.\/journey-map-contract\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href}"`);

const TENANT = Object.freeze({
  NOTES: "notes", NOTE_SOURCES: "noteSources", NOTE_FOLDERS: "noteFolders",
  NOTE_PLACEMENTS: "notePlacements", NOTE_REVISIONS: "noteRevisions",
});
const writes = [];
const documents = new Map();
let queryRows = [];
const snapshot = (value) => ({ exists: () => value !== undefined, data: () => value });

globalThis.__nfCollections = { TENANT };
globalThis.__nfFirestore = {
  collection: (_db, name) => ({ name }),
  where: (...args) => ({ where: args }), orderBy: (...args) => ({ orderBy: args }),
  limit: (value) => ({ limit: value }), query: (...parts) => ({ parts }),
  // P6-B: the folder tree check reads the person's own folders, so this stub
  // must be able to RETURN some. It stays empty for every pre-existing case.
  getDocs: async () => ({ docs: queryRows.map((row) => ({ id: row.id ?? row.folderId, data: () => row })) }),
  doc: (_db, name, id) => ({ name, id }),
  getDoc: async (ref) => snapshot(documents.get(`${ref.name}/${ref.id}`)),
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
  source: { sourceLinkId: "source-1", sourceKind: "quran-unit", sourceKey: "ayah:1:1", relationshipKind: "origin", provenanceKind: "study-note" },
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

// --- P6-B: createNoteFolder() validates its parent (ADR-010) ---------------
// This function used to validate parentFolderId not at all. Each case below is
// a thing it would previously have written to the database without a murmur.
const folderRow = (o = {}) => ({ folderId: "f-parent", tenantId: "tenant",
  ownerPersonId: "person", status: "active", semanticRole: "user", parentFolderId: null, ...o });

writes.length = 0; queryRows = [];
await foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Top level", folderId: "f-1", actorUid: "owner-uid" });
assert.equal(writes.length, 1, "a top-level folder needs no read and is written");
assert.equal(writes[0].collectionName, "noteFolders");

writes.length = 0; queryRows = [folderRow()];
await foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Child", folderId: "f-2", parentFolderId: "f-parent", actorUid: "owner-uid" });
assert.equal(writes.length, 1, "a child of my own active folder is written");

writes.length = 0; queryRows = [];
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Orphan", folderId: "f-3", parentFolderId: "gone", actorUid: "owner-uid" }),
  /Folder parent refused: parent-missing/);
assert.equal(writes.length, 0, "nothing was written for a refused parent");

queryRows = [folderRow({ folderId: "a", parentFolderId: "b" }), folderRow({ folderId: "b", parentFolderId: "a" })];
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Cyclic", folderId: "c", parentFolderId: "a", actorUid: "owner-uid" }),
  /Folder parent refused: cycle/);

queryRows = [folderRow({ status: "retired" })];
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Undead", folderId: "f-4", parentFolderId: "f-parent", actorUid: "owner-uid" }),
  /Folder parent refused: parent-not-active/);

queryRows = [folderRow({ semanticRole: "journey-map" })];
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Under the Map", folderId: "f-5", parentFolderId: "f-parent", actorUid: "owner-uid" }),
  /Folder parent refused: parent-is-system/);

// ADR-010's field rules are checked BEFORE any read, so a malformed folder
// never costs a query.
writes.length = 0; queryRows = [folderRow()];
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Bad role", semanticRole: "archive", folderId: "f-6", actorUid: "owner-uid" }),
  /semanticRole must be one of/);
await assert.rejects(() => foundation.createNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Nested system", semanticRole: "journey-map",
  parentFolderId: "f-parent", folderId: "f-7", actorUid: "owner-uid" }),
  /a system folder cannot have a parent/);
assert.equal(writes.length, 0);

// --- P6-C: moveNotePlacement() is ONE atomic retire-and-create -------------
const placementRow = (o = {}) => ({ placementId: "pl-1", tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", folderId: "f-from", order: 0, status: "active", ...o });
const folderRow2 = (o = {}) => ({ folderId: "f-to", tenantId: "tenant", ownerPersonId: "person",
  status: "active", semanticRole: "user", parentFolderId: null, ...o });

writes.length = 0;
documents.set("notePlacements/tenant__pl-1", placementRow());
documents.set("noteFolders/tenant__f-to", folderRow2());
const movedId = await foundation.moveNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", fromPlacementId: "pl-1", toFolderId: "f-to",
  placementId: "pl-2", actorUid: "owner-uid" });
assert.equal(movedId, "pl-2");
assert.deepEqual(writes.map(({ kind, collectionName }) => `${kind}:${collectionName}`),
  ["update:notePlacements", "create:notePlacements"], "a move is retire THEN create, in one transaction");
assert.equal(writes[0].data.status, "retired");
assert.ok(!("folderId" in writes[0].data), "the retirement must not carry the new folder (I4)");
assert.equal(writes[1].data.folderId, "f-to");
assert.equal(writes[1].data.noteId, "note-1");

// Every refusal below must leave NOTHING written -- a half-done move is worse
// than a refused one, because the Note ends up in two folders or in neither.
for (const [label, args, pattern] of [
  ["a missing placement", { fromPlacementId: "gone" }, /Placement to move does not exist/],
  ["a placement holding a different Note", { noteId: "other" }, /does not hold that Note/],
  ["a move that does not change folder", { toFolderId: "f-from" }, /must change folder/],
  ["a missing target folder", { toFolderId: "nowhere" }, /Target folder does not exist/],
]) {
  writes.length = 0;
  await assert.rejects(() => foundation.moveNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
    ownerUid: "owner-uid", noteId: "note-1", fromPlacementId: "pl-1", toFolderId: "f-to",
    placementId: "pl-x", actorUid: "owner-uid", ...args }), pattern, label);
  assert.equal(writes.length, 0, `${label}: nothing may be written`);
}

documents.set("noteFolders/tenant__f-retired", folderRow2({ folderId: "f-retired", status: "retired" }));
writes.length = 0;
await assert.rejects(() => foundation.moveNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", fromPlacementId: "pl-1", toFolderId: "f-retired",
  placementId: "pl-y", actorUid: "owner-uid" }), /must be active/);
assert.equal(writes.length, 0);

documents.set("noteFolders/tenant__f-theirs", folderRow2({ folderId: "f-theirs", ownerPersonId: "someone-else" }));
writes.length = 0;
await assert.rejects(() => foundation.moveNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", fromPlacementId: "pl-1", toFolderId: "f-theirs",
  placementId: "pl-z", actorUid: "owner-uid" }), /Cross-owner or cross-tenant/);
assert.equal(writes.length, 0);

documents.set("notePlacements/tenant__pl-retired", placementRow({ placementId: "pl-retired", status: "retired" }));
writes.length = 0;
await assert.rejects(() => foundation.moveNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", fromPlacementId: "pl-retired", toFolderId: "f-to",
  placementId: "pl-w", actorUid: "owner-uid" }), /retired placement cannot be moved/);
assert.equal(writes.length, 0);

// retireNotePlacement() is the other half, on its own
writes.length = 0;
await foundation.retireNotePlacement({}, { tenantId: "tenant", placementId: "pl-1", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.equal(writes[0].data.status, "retired");
await assert.rejects(() => foundation.retireNotePlacement({}, { tenantId: "tenant",
  placementId: "pl-retired", actorUid: "owner-uid" }), /already retired/);

delete globalThis.__nfCollections;
delete globalThis.__nfFirestore;
delete globalThis.__nfEnvelope;
console.log("==== Note Foundation data layer: 47 assertions passed ====");
