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

// --- retirePermanentNote() must commit a real revision, not only a status --
// The Phase 5 Rules candidate's committedRevisionMatches() re-checks
// currentRevisionId on every update, retire included: the named revision
// must exist and must chain from the revision the Note is leaving behind. A
// status-only write leaves currentRevisionId pointing at the SAME revision,
// which can never chain from itself, so retiring would be denied the moment
// these Rules deploy. `documents.get("notes/tenant__note-1")` here is still
// the row set before updatePermanentNoteContent() above (the stub never
// writes its own `update` calls back into `documents`), so it is still
// pinned at currentRevisionId "rev-1" -- the fixture this case targets.
writes.length = 0;
const retiredRevisionId = await foundation.retirePermanentNote({}, {
  tenantId: "tenant", noteId: "note-1", expectedRevisionId: "rev-1", actorUid: "owner-uid",
});
assert.deepEqual(writes.map(({ collectionName, kind }) => `${kind}:${collectionName}`), ["create:noteRevisions", "update:notes"]);
assert.equal(writes[0].data.previousRevisionId, "rev-1", "the retirement revision must chain from the revision being left behind");
assert.equal(writes[0].data.revisionReason, "retired");
assert.equal(writes[0].data.noteId, "note-1");
assert.equal(writes[0].data.tenantId, "tenant");
assert.equal(writes[0].data.ownerPersonId, "person");
assert.equal(writes[1].data.status, "retired");
assert.equal(writes[1].data.currentRevisionId, retiredRevisionId, "the Note must point at the NEW revision, never the one it retired from");
assert.notEqual(retiredRevisionId, "rev-1", "retiring must mint a fresh revision id, never reuse the old one");

await assert.rejects(() => foundation.retirePermanentNote({}, {
  tenantId: "tenant", noteId: "note-1", expectedRevisionId: "stale", actorUid: "owner-uid",
}), /Stale Note revision/);

await assert.rejects(() => foundation.retirePermanentNote({}, {
  tenantId: "tenant", noteId: "missing-note", expectedRevisionId: "rev-1", actorUid: "owner-uid",
}), /Note does not exist/);

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

// --- P6-D: the folder UPDATE side, which did not exist --------------------
//
// `noteFolders` was create-only here while the accepted Phase 6 Rules
// candidate already said in its own comment: "A folder may be renamed,
// reordered, re-parented or retired." Each case below is a thing the accepted
// decision permitted and no code could perform.
const FOLDER = (o = {}) => ({ folderId: "f-me", tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", name: "Mine", parentFolderId: null, semanticRole: "user",
  order: 0, status: "active", ...o });
const putFolder = (row) => documents.set(`noteFolders/tenant__${row.folderId}`, row);

// rename ------------------------------------------------------------------
writes.length = 0; queryRows = []; documents.clear(); putFolder(FOLDER());
await foundation.renameNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  folderId: "f-me", name: "Renamed", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.deepEqual(writes[0].data, { name: "Renamed" },
  "a rename must send the NAME and nothing else -- tenant, owner, id and role are write-once");

// I11 -- a folder name is user-visible, so a blank one is refused, not stored.
writes.length = 0;
await assert.rejects(() => foundation.renameNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", name: "   ", actorUid: "owner-uid" }), /name/);
assert.equal(writes.length, 0);

// Cross-owner and cross-tenant are refused by reading the document, not by
// trusting the caller's own arguments.
writes.length = 0; documents.clear(); putFolder(FOLDER({ ownerPersonId: "someone-else" }));
await assert.rejects(() => foundation.renameNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", name: "Theirs", actorUid: "owner-uid" }),
  /Cross-owner or cross-tenant/);
assert.equal(writes.length, 0);

documents.clear(); putFolder(FOLDER({ status: "retired" }));
await assert.rejects(() => foundation.renameNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", name: "Zombie", actorUid: "owner-uid" }),
  /retired folder cannot be renamed/);

// reorder -----------------------------------------------------------------
writes.length = 0; documents.clear(); putFolder(FOLDER());
await foundation.reorderNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  folderId: "f-me", order: 7, actorUid: "owner-uid" });
assert.deepEqual(writes[0].data, { order: 7 }, "a reorder sends only the order");
await assert.rejects(() => foundation.reorderNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", order: 1.5, actorUid: "owner-uid" }), /integer/);

// re-parent ---------------------------------------------------------------
// The operation Firestore Rules CANNOT secure: they enforce one hop and can
// never walk an ancestor chain, so these refusals are the only thing standing
// between a person and a corrupt tree of their own.
writes.length = 0; documents.clear();
queryRows = [FOLDER(), FOLDER({ folderId: "f-new-parent" })];
for (const row of queryRows) putFolder(row);
await foundation.reparentNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  folderId: "f-me", parentFolderId: "f-new-parent", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.deepEqual(writes[0].data, { parentFolderId: "f-new-parent" },
  "a re-parent sends only the parent -- never folderId, owner or semanticRole");

// ...and null is how a folder is lifted back to the top.
writes.length = 0; documents.clear();
queryRows = [FOLDER({ parentFolderId: "f-new-parent" }), FOLDER({ folderId: "f-new-parent" })];
for (const row of queryRows) putFolder(row);
await foundation.reparentNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  folderId: "f-me", parentFolderId: null, actorUid: "owner-uid" });
assert.deepEqual(writes[0].data, { parentFolderId: null });

writes.length = 0; documents.clear();
queryRows = [FOLDER()]; putFolder(queryRows[0]);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", parentFolderId: "f-me", actorUid: "owner-uid" }),
  /self-parent/);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", parentFolderId: "ghost", actorUid: "owner-uid" }),
  /parent-missing/);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", parentFolderId: null, actorUid: "owner-uid" }),
  /must change parent/);
assert.equal(writes.length, 0, "nothing was written for any refused re-parent");

// A cycle of length two: `a` and `b`, and moving `a` under `b`.
writes.length = 0; documents.clear();
queryRows = [FOLDER({ folderId: "a" }), FOLDER({ folderId: "b", parentFolderId: "a" })];
for (const row of queryRows) putFolder(row);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "a", parentFolderId: "b", actorUid: "owner-uid" }),
  /Folder parent refused: cycle/);
assert.equal(writes.length, 0);

// A system folder is neither nested nor nestable -- and the refusal comes from
// the CONTRACT, so this file holds no second copy of ADR-010 §3.
writes.length = 0; documents.clear();
queryRows = [FOLDER({ folderId: "sys", semanticRole: "reflection-archive" }), FOLDER({ folderId: "host" })];
for (const row of queryRows) putFolder(row);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "sys", parentFolderId: "host", actorUid: "owner-uid" }),
  /a system folder cannot have a parent/);
assert.equal(writes.length, 0);

// A re-parent carries its whole subtree, so the depth bound counts what it
// carries -- the defect P6-D found in folderTreeRefusal().
writes.length = 0; documents.clear();
queryRows = [];
for (let i = 1; i <= 6; i++) queryRows.push(FOLDER({ folderId: `r${i}`, parentFolderId: i === 1 ? null : `r${i - 1}` }));
queryRows.push(FOLDER({ folderId: "p" }), FOLDER({ folderId: "pc", parentFolderId: "p" }),
               FOLDER({ folderId: "pcc", parentFolderId: "pc" }));
for (const row of queryRows) putFolder(row);
await assert.rejects(() => foundation.reparentNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "p", parentFolderId: "r6", actorUid: "owner-uid" }),
  /Folder parent refused: too-deep/);
assert.equal(writes.length, 0);

// retire ------------------------------------------------------------------
// REFUSED while it still has active children, and that is DERIVED from the
// accepted Rules: parentOneHopOk() requires an ACTIVE parent, so retiring one
// denies every update to its children -- including the re-parent that would
// rescue them.
writes.length = 0; documents.clear();
queryRows = [FOLDER(), FOLDER({ folderId: "kid", parentFolderId: "f-me" })];
for (const row of queryRows) putFolder(row);
await assert.rejects(() => foundation.retireNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", actorUid: "owner-uid" }),
  /still holds active folders: kid/);
assert.equal(writes.length, 0, "a folder with children is not retired, and its subtree is not stranded");

writes.length = 0; documents.clear();
queryRows = [FOLDER()]; putFolder(queryRows[0]);
await foundation.retireNoteFolder({}, { tenantId: "tenant", ownerPersonId: "person",
  folderId: "f-me", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.deepEqual(writes[0].data, { status: "retired" },
  "retire sets the status and NOTHING else -- I4, and its placements are deliberately untouched");

writes.length = 0; documents.clear();
queryRows = [FOLDER({ status: "retired" })]; putFolder(queryRows[0]);
await assert.rejects(() => foundation.retireNoteFolder({}, { tenantId: "tenant",
  ownerPersonId: "person", folderId: "f-me", actorUid: "owner-uid" }), /already retired/);
assert.equal(writes.length, 0);

// --- P5-F: retireNoteSource(), which nothing could do --------------------
// The accepted Phase 5 Rules already said "A link may be retired, never
// repointed and never deleted" and its emulator suite proved the server allows
// it (REL-05). listNoteSourcesForUnit() already defaults to active-only, so
// the READ side was built for a writer that did not exist.
const SRC = (o = {}) => ({ sourceLinkId: "src-1", tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", sourceKey: "ayah:2:255", sourceKind: "quran-unit",
  relationshipKind: "origin", provenanceKind: "study-note", status: "active", ...o });
const putSource = (row) => documents.set(`noteSources/tenant__${row.sourceLinkId}`, row);

writes.length = 0; documents.clear(); putSource(SRC());
await foundation.retireNoteSource({}, { tenantId: "tenant", ownerPersonId: "person",
  sourceLinkId: "src-1", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.deepEqual(writes[0].data, { status: "retired" },
  "a retire sends ONLY the status -- a repoint of sourceKey is what ADR-009's vocabulary exists to prevent");
assert.equal(writes[0].collectionName, "noteSources");

writes.length = 0; documents.clear(); putSource(SRC({ ownerPersonId: "someone-else" }));
await assert.rejects(() => foundation.retireNoteSource({}, { tenantId: "tenant",
  ownerPersonId: "person", sourceLinkId: "src-1", actorUid: "owner-uid" }),
  /Cross-owner or cross-tenant source link refused/);
assert.equal(writes.length, 0);

documents.clear(); putSource(SRC({ status: "retired" }));
await assert.rejects(() => foundation.retireNoteSource({}, { tenantId: "tenant",
  ownerPersonId: "person", sourceLinkId: "src-1", actorUid: "owner-uid" }), /already retired/);

documents.clear();
await assert.rejects(() => foundation.retireNoteSource({}, { tenantId: "tenant",
  ownerPersonId: "person", sourceLinkId: "ghost", actorUid: "owner-uid" }), /does not exist/);

// It never touches the NOTE: a Note is not defined by what it is about
// (ADR-004), and cascading would give Origin the power to remove a Note.
writes.length = 0; documents.clear(); putSource(SRC());
documents.set("notes/tenant__note-1", { noteId: "note-1", tenantId: "tenant",
  ownerPersonId: "person", status: "active" });
await foundation.retireNoteSource({}, { tenantId: "tenant", ownerPersonId: "person",
  sourceLinkId: "src-1", actorUid: "owner-uid" });
assert.equal(writes.filter((w) => w.collectionName === "notes").length, 0,
  "retiring a link must not cascade into the Note");

// --- P5-G: createNoteSource(), binding an EXISTING Note to a further unit -
// createPermanentNote() could only ever write one noteSources link, at birth.
// Nothing let an already-created Note gain a SECOND active link -- whether
// it never had one, or its only link was later retired.
const NOTE = (o = {}) => ({ noteId: "note-1", tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", status: "active", currentRevisionId: "rev-1", ...o });
const putNote = (row) => documents.set(`notes/tenant__${row.noteId}`, row);
const SOURCE_ARGS = (o = {}) => ({ tenantId: "tenant", ownerPersonId: "person", ownerUid: "owner-uid",
  noteId: "note-1", sourceLinkId: "src-2", actorUid: "owner-uid",
  source: { sourceKind: "quran-unit", sourceKey: "juz:5", relationshipKind: "reference", provenanceKind: "study-note" },
  ...o });

writes.length = 0; documents.clear(); putNote(NOTE());
const boundId = await foundation.createNoteSource({}, SOURCE_ARGS());
assert.equal(boundId, "src-2");
assert.deepEqual(writes.map(({ kind, collectionName }) => `${kind}:${collectionName}`), ["create:noteSources"]);
assert.deepEqual(writes[0].data, {
  sourceLinkId: "src-2", tenantId: "tenant", ownerPersonId: "person", ownerUid: "owner-uid", noteId: "note-1",
  sourceKind: "quran-unit", sourceKey: "juz:5", relationshipKind: "reference", approachId: null,
  provenanceKind: "study-note", status: "active",
}, "the additional binding carries the exact birth-time noteSources shape");
assert.equal(writes.filter((w) => w.collectionName === "notes").length, 0,
  "the Note document is never written by this call -- identity stays immutable");

// Duplicate sourceLinkId is refused, the same way createPermanentNote()
// refuses a duplicate Note id.
writes.length = 0; documents.clear(); putNote(NOTE()); putSource(SRC({ sourceLinkId: "src-2" }));
await assert.rejects(() => foundation.createNoteSource({}, SOURCE_ARGS()), /Source link ID already exists/);
assert.equal(writes.length, 0);

// Two ACTIVE links naming the SAME sourceKey are NOT refused -- nothing in the
// accepted Rules, ADR-009 or listNoteSourcesForUnit()'s own read contract
// forbids a Note being bound twice to one unit.
writes.length = 0; documents.clear(); putNote(NOTE()); putSource(SRC({ sourceLinkId: "src-1", sourceKey: "juz:5" }));
const secondId = await foundation.createNoteSource({}, SOURCE_ARGS({
  sourceLinkId: "src-3",
  source: { sourceKind: "quran-unit", sourceKey: "juz:5", relationshipKind: "origin", provenanceKind: "study-note" },
}));
assert.equal(secondId, "src-3");
assert.equal(writes.length, 1, "a second active link to the same unit is written, not refused");

// A missing Note is refused before any write.
writes.length = 0; documents.clear();
await assert.rejects(() => foundation.createNoteSource({}, SOURCE_ARGS()), /Note does not exist/);
assert.equal(writes.length, 0);

// Cross-owner and cross-tenant are refused by reading the Note document, not
// by trusting the caller's own arguments -- same shape as retireNoteSource().
writes.length = 0; documents.clear(); putNote(NOTE({ ownerPersonId: "someone-else" }));
await assert.rejects(() => foundation.createNoteSource({}, SOURCE_ARGS()),
  /Cross-owner or cross-tenant source binding refused/);
assert.equal(writes.length, 0);

// A retired Note refuses a new binding -- stricter than the Rules candidate,
// which does not itself check status on create (REL-01 checks existence and
// ownership only).
writes.length = 0; documents.clear(); putNote(NOTE({ status: "retired" }));
await assert.rejects(() => foundation.createNoteSource({}, SOURCE_ARGS()),
  /A retired Note cannot gain a new source binding/);
assert.equal(writes.length, 0);

// Composes cleanly with retireNoteSource(): create a new link, then retire
// exactly that link -- independent of the Note and of any other link.
writes.length = 0; documents.clear(); putNote(NOTE());
await foundation.createNoteSource({}, SOURCE_ARGS());
putSource(SRC({ sourceLinkId: "src-2", sourceKey: "juz:5", relationshipKind: "reference" }));
writes.length = 0;
await foundation.retireNoteSource({}, { tenantId: "tenant", ownerPersonId: "person",
  sourceLinkId: "src-2", actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind, collectionName }) => `${kind}:${collectionName}`), ["update:noteSources"]);
assert.deepEqual(writes[0].data, { status: "retired" });

// --- P6-E: reorderNotePlacement(), the only field left unreachable --------
// placementIdentityUnchanged() freezes placementId, noteId and folderId, so
// `order` and `status` are all an update may touch. retireNotePlacement()
// covered status; the Phase 6 composite index exists for `order` and nothing
// could set it.
const PLC = (o = {}) => ({ placementId: "pl-r", tenantId: "tenant", ownerPersonId: "person",
  ownerUid: "owner-uid", noteId: "note-1", folderId: "f-1", order: 0, status: "active", ...o });
const putPlacement = (row) => documents.set(`notePlacements/tenant__${row.placementId}`, row);

writes.length = 0; documents.clear(); putPlacement(PLC());
await foundation.reorderNotePlacement({}, { tenantId: "tenant", ownerPersonId: "person",
  placementId: "pl-r", order: 4, actorUid: "owner-uid" });
assert.deepEqual(writes.map(({ kind }) => kind), ["update"]);
assert.deepEqual(writes[0].data, { order: 4 },
  "a reorder sends ONLY the order -- never folderId, which would be a move that destroyed its own record (I4)");

writes.length = 0;
await assert.rejects(() => foundation.reorderNotePlacement({}, { tenantId: "tenant",
  ownerPersonId: "person", placementId: "pl-r", order: 1.5, actorUid: "owner-uid" }), /integer/);
assert.equal(writes.length, 0);

documents.clear(); putPlacement(PLC({ ownerPersonId: "someone-else" }));
await assert.rejects(() => foundation.reorderNotePlacement({}, { tenantId: "tenant",
  ownerPersonId: "person", placementId: "pl-r", order: 1, actorUid: "owner-uid" }),
  /Cross-owner or cross-tenant placement refused/);

documents.clear(); putPlacement(PLC({ status: "retired" }));
await assert.rejects(() => foundation.reorderNotePlacement({}, { tenantId: "tenant",
  ownerPersonId: "person", placementId: "pl-r", order: 1, actorUid: "owner-uid" }),
  /retired placement cannot be reordered/);

// NOTHING here is a delete, on any path (I4/D6).
assert.equal(writes.filter((w) => w.kind === "delete").length, 0);

delete globalThis.__nfCollections;
delete globalThis.__nfFirestore;
delete globalThis.__nfEnvelope;
console.log("==== Note Foundation data layer: 47 + 30 P6-D + 18 P5-F/P6-E + 11 retire-revision + 16 P5-G assertions passed ====");
