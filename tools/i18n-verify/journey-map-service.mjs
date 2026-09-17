// MAP Phase 6 (P6-C) -- reading Mapping My Journey, executed against in-memory
// stand-ins for the Note Foundation. No network, no emulator, no browser.
//
// This tests the REAL app/js/journey-map-service.js source with its database
// imports rewritten to injected globals, so the file under test is the file
// that would ship. The pure contract is resolved to its real file rather than
// stubbed -- a data: URL cannot resolve a relative specifier.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
source = source
  .replace(/import \{[\s\S]*?\} from "\.\/note-foundation\.js";/,
    "const { NOTE_STATUS, getNotesByIds, listNoteFoldersForOwner, listNotePlacementsForFolder, listNotePlacementsForNote, moveNotePlacement } = globalThis.__jmFoundation;")
  .replace(/from "\.\/journey-map-contract\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href}"`);
assert.ok(!/from "\.\//.test(source), "an import was not rewritten");

const calls = { folderQuery: [], noteQuery: [], folders: [], notes: [], move: [] };
let placementRows = [], folderRows = [], noteRows = [];

globalThis.__jmFoundation = {
  NOTE_STATUS: Object.freeze({ ACTIVE: "active", RETIRED: "retired" }),
  listNotePlacementsForFolder: async (_db, a) => { calls.folderQuery.push(a); return placementRows.slice(0, a.maximum); },
  listNotePlacementsForNote:   async (_db, a) => { calls.noteQuery.push(a);   return placementRows.slice(0, a.maximum); },
  listNoteFoldersForOwner:     async (_db, a) => { calls.folders.push(a);     return folderRows; },
  getNotesByIds:               async (_db, t, ids) => { calls.notes.push({ t, ids }); return noteRows.filter((n) => ids.includes(n.noteId)); },
  moveNotePlacement:           async (_db, a) => { calls.move.push(a); return "new-placement"; },
};
function reset() {
  for (const k of Object.keys(calls)) calls[k].length = 0;
  placementRows = []; folderRows = []; noteRows = [];
}

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { MAX_PLACEMENTS_PER_READ, folderContents, moveNoteToFolder, noteFilings, ownerFolderTree } = mod;

let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`  PASS  ${name}`); }

const db = {};
const own = { tenantId: "t1", ownerPersonId: "p1" };
const pl = (placementId, o = {}) => ({ placementId, noteId: "n1", folderId: "f1", order: 0, status: "active", ...own, ...o });
const note = (noteId, o = {}) => ({ noteId, title: "T", status: "active", ...own, ...o });
const folder = (folderId, o = {}) => ({ folderId, name: folderId, parentFolderId: null, status: "active", semanticRole: "user", ...own, ...o });

// --- folderContents ---------------------------------------------------------
await check("K1 the query is scoped and asks for one more than the cap", async () => {
  reset(); placementRows = [pl("p1")]; noteRows = [note("n1")];
  await folderContents(db, { ...own, folderId: "f1" });
  const q = calls.folderQuery[0];
  assert.equal(q.tenantId, "t1"); assert.equal(q.ownerPersonId, "p1"); assert.equal(q.folderId, "f1");
  assert.equal(q.maximum, MAX_PLACEMENTS_PER_READ + 1);
});
await check("K2 a RETIRED Note is excluded even though its placement is still active", async () => {
  // Retiring a Note never touches its placements (I4 keeps them), so an active
  // placement pointing at a retired Note is the NORMAL post-retirement state.
  reset(); placementRows = [pl("p1", { noteId: "n1" }), pl("p2", { noteId: "n2" })];
  noteRows = [note("n1", { status: "retired" }), note("n2")];
  const { rows } = await folderContents(db, { ...own, folderId: "f1" });
  assert.deepEqual(rows.map((r) => r.note.noteId), ["n2"]);
});
await check("K3 a placement naming a Note that no longer exists is dropped, not thrown", async () => {
  reset(); placementRows = [pl("p1", { noteId: "gone" }), pl("p2", { noteId: "n2" })]; noteRows = [note("n2")];
  const { rows } = await folderContents(db, { ...own, folderId: "f1" });
  assert.deepEqual(rows.map((r) => r.note.noteId), ["n2"]);
});
await check("K4 truncation is reported, and a page that exactly fills the cap is not", async () => {
  reset();
  placementRows = Array.from({ length: MAX_PLACEMENTS_PER_READ + 1 }, (_, i) => pl(`p${i}`, { noteId: `n${i}` }));
  noteRows = placementRows.map((p) => note(p.noteId));
  assert.equal((await folderContents(db, { ...own, folderId: "f1" })).truncated, true);
  placementRows = placementRows.slice(0, MAX_PLACEMENTS_PER_READ);
  assert.equal((await folderContents(db, { ...own, folderId: "f1" })).truncated, false);
});
await check("K5 duplicate Notes in one folder cost ONE document read", async () => {
  reset(); placementRows = [pl("p1", { noteId: "n1" }), pl("p2", { noteId: "n1" })]; noteRows = [note("n1")];
  await folderContents(db, { ...own, folderId: "f1" });
  assert.deepEqual(calls.notes[0].ids, ["n1"]);
});
await check("K6 the author's own order is preserved, not re-sorted", async () => {
  reset();
  placementRows = [pl("p1", { noteId: "b", order: 0 }), pl("p2", { noteId: "a", order: 1 })];
  noteRows = [note("a"), note("b")];
  const { rows } = await folderContents(db, { ...own, folderId: "f1" });
  assert.deepEqual(rows.map((r) => r.note.noteId), ["b", "a"], "the database order is the author's order");
});

// --- noteFilings ------------------------------------------------------------
await check("K7 every folder holding one Note comes back (many-to-many, ADR-010 §5)", async () => {
  reset();
  placementRows = [pl("p1", { folderId: "fb" }), pl("p2", { folderId: "fa" })];
  folderRows = [folder("fa", { name: "Alpha" }), folder("fb", { name: "Beta" })];
  const { rows } = await noteFilings(db, { ...own, noteId: "n1" });
  assert.deepEqual(rows.map((r) => r.folder.folderId), ["fa", "fb"], "sorted by name, client-side");
});
await check("K8 a placement naming a folder that is gone is dropped, not thrown", async () => {
  reset(); placementRows = [pl("p1", { folderId: "gone" })]; folderRows = [];
  const { rows } = await noteFilings(db, { ...own, noteId: "n1" });
  assert.deepEqual(rows, []);
});

// --- ownerFolderTree --------------------------------------------------------
await check("K9 the tree comes back already walked safely, cycles reported", async () => {
  reset(); folderRows = [folder("a"), folder("b", { parentFolderId: "a" }),
                         folder("c", { parentFolderId: "d" }), folder("d", { parentFolderId: "c" })];
  const { roots, cyclic } = await ownerFolderTree(db, own);
  assert.deepEqual(roots.map((r) => r.folderId), ["a"]);
  assert.deepEqual(cyclic.map((r) => r.folderId).sort(), ["c", "d"]);
});

// --- moveNoteToFolder -------------------------------------------------------
await check("K10 a move validates through the contract BEFORE any write", async () => {
  reset();
  await assert.rejects(() => moveNoteToFolder(db, { ...own, noteId: "n1", fromPlacementId: "p1", toFolderId: "" }),
    /needs a folderId/);
  assert.equal(calls.move.length, 0, "nothing reached the database");
});
await check("K11 a move refuses to smuggle an Origin field (ADR-010 §2)", async () => {
  reset();
  await assert.rejects(() => moveNoteToFolder(db, { ...own, noteId: "n1", fromPlacementId: "p1",
    toFolderId: "f2", sourceKey: "ayah:2:255" }), /may not carry Origin fields/);
  assert.equal(calls.move.length, 0);
});
await check("K12 a valid move passes both ends through to the atomic writer", async () => {
  reset();
  const id = await moveNoteToFolder(db, { ...own, noteId: "n1", fromPlacementId: "p1", toFolderId: "f2", actorUid: "uid-p1" });
  assert.equal(id, "new-placement");
  assert.equal(calls.move[0].fromPlacementId, "p1");
  assert.equal(calls.move[0].toFolderId, "f2");
});
await check("K13 nothing this module returns can name a Study Unit or a status claim", async () => {
  reset(); placementRows = [pl("p1")]; noteRows = [note("n1")];
  const out = JSON.stringify(await folderContents(db, { ...own, folderId: "f1" }));
  for (const forbidden of ["sourceKey", "unitKey", "claimStatus", "achieved", "mastered", "trackableId"]) {
    assert.ok(!out.includes(forbidden), forbidden);
  }
});

console.log(`\n${passed} passed`);
