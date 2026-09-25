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
    "const { NOTE_STATUS, getNotesByIds, listNoteFoldersForOwner, listNoteFoldersForOwnerPage, listNotePlacementsForFolder, listNotePlacementsForNote, listNotesForOwnerPage, listNotePlacementsForOwnerPage, moveNotePlacement, renameNoteFolder, reorderNoteFolder, reparentNoteFolder, retireNoteFolder, reorderNotePlacement } = globalThis.__jmFoundation;")
  .replace(/from "\.\/journey-map-contract\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href}"`);
assert.ok(!/from "\.\//.test(source), "an import was not rewritten");

const calls = { folderQuery: [], noteQuery: [], folders: [], notes: [], move: [],
                rename: [], reorder: [], reparent: [], retire: [], reorderFiling: [],
                notesPage: [], placementsPage: [], foldersPage: [] };
let placementRows = [], folderRows = [], noteRows = [];
// Issue #259 -- separate, larger backing arrays for the two PAGED readers,
// so K19+ below can seed "more than one page" without disturbing the
// folderContents()/noteFilings() fixtures above, which assume an unpaged
// single-shot read. Issue #267 adds the same for folders --
// listNoteFoldersForOwnerPage() is a THIRD, independent paged reader.
let notesPageRows = [], placementsPageRows = [], foldersPageRows = [];
function pageOf(all, { pageSize, after }) {
  const startIdx = after ? all.findIndex((r) => r.id === after.id) + 1 : 0;
  const slice = all.slice(startIdx, startIdx + pageSize);
  const next = slice.length < pageSize ? null : slice[slice.length - 1];
  return { rows: slice, next };
}

globalThis.__jmFoundation = {
  NOTE_STATUS: Object.freeze({ ACTIVE: "active", RETIRED: "retired" }),
  listNotePlacementsForFolder: async (_db, a) => { calls.folderQuery.push(a); return placementRows.slice(0, a.maximum); },
  listNotePlacementsForNote:   async (_db, a) => { calls.noteQuery.push(a);   return placementRows.slice(0, a.maximum); },
  listNoteFoldersForOwner:     async (_db, a) => { calls.folders.push(a);     return folderRows; },
  listNoteFoldersForOwnerPage: async (_db, a) => { calls.foldersPage.push(a); return pageOf(foldersPageRows, a); },
  getNotesByIds:               async (_db, t, ids) => { calls.notes.push({ t, ids }); return noteRows.filter((n) => ids.includes(n.noteId)); },
  listNotesForOwnerPage:       async (_db, a) => { calls.notesPage.push(a); return pageOf(notesPageRows, a); },
  listNotePlacementsForOwnerPage: async (_db, a) => { calls.placementsPage.push(a); return pageOf(placementsPageRows, a); },
  moveNotePlacement:           async (_db, a) => { calls.move.push(a); return "new-placement"; },
  // P6-D -- the folder editing side. Recorded, not simulated: these wrappers
  // are meant to be thin, and what is asserted is that they FORWARD faithfully
  // and add no policy of their own.
  renameNoteFolder:            async (_db, a) => { calls.rename.push(a); },
  reorderNoteFolder:           async (_db, a) => { calls.reorder.push(a); },
  // The sentinel is how a REJECTION is exercised: the source rewrite
  // destructures this object at module load, so swapping a member afterwards
  // would not reach the module under test -- the stub has to be able to throw
  // on its own.
  reparentNoteFolder:          async (_db, a) => {
    calls.reparent.push(a);
    if (a.folderId === "refuse-me") throw new Error("Folder parent refused: cycle");
  },
  retireNoteFolder:            async (_db, a) => { calls.retire.push(a); },
  reorderNotePlacement:        async (_db, a) => { calls.reorderFiling.push(a); },
};
function reset() {
  for (const k of Object.keys(calls)) calls[k].length = 0;
  placementRows = []; folderRows = []; noteRows = [];
  notesPageRows = []; placementsPageRows = []; foldersPageRows = [];
}

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { MAX_PLACEMENTS_PER_READ, folderContents, moveNoteToFolder, noteFilings, ownerFolderTree,
        ownerFolderTreePaged, moveFolder, renameFolder, reorderFolder, retireFolder, reorderFiling,
        loadAllOwnerNotes, loadAllOwnerPlacements, folderNoteCounts, folderMoveRefusal } = mod;

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

// --- P6-D: the folder editing side ----------------------------------------
await check("K14 the four folder editors exist and forward faithfully, adding no policy", async () => {
  reset();
  await renameFolder(db, { ...own, folderId: "f1", name: "New name", actorUid: "u" });
  await reorderFolder(db, { ...own, folderId: "f1", order: 3, actorUid: "u" });
  await moveFolder(db, { ...own, folderId: "f1", parentFolderId: "f2", actorUid: "u" });
  await retireFolder(db, { ...own, folderId: "f1", actorUid: "u" });
  assert.deepEqual(calls.rename[0], { ...own, folderId: "f1", name: "New name", actorUid: "u" });
  assert.deepEqual(calls.reorder[0], { ...own, folderId: "f1", order: 3, actorUid: "u" });
  assert.deepEqual(calls.reparent[0], { ...own, folderId: "f1", parentFolderId: "f2", actorUid: "u" });
  assert.deepEqual(calls.retire[0], { ...own, folderId: "f1", actorUid: "u" });
});

await check("K15 a wrapper NEVER swallows the refusal underneath it -- I15", async () => {
  reset();
  await assert.rejects(() => moveFolder(db, { ...own, folderId: "refuse-me", parentFolderId: "b", actorUid: "u" }),
    /Folder parent refused: cycle/,
    "a cycle refusal must reach the caller as an error, not a console line");
  assert.equal(calls.reparent.length, 1, "the call really was made -- the rejection is not a short-circuit");
});

await check("K16 the editors cannot be used to set a frozen field, because they do not carry one", async () => {
  reset();
  // A caller passing semanticRole/tenant-moving arguments must not see them
  // reach the data layer: the wrappers name their parameters, so an extra one
  // is dropped at the boundary rather than forwarded into a write.
  await renameFolder(db, { ...own, folderId: "f1", name: "N", actorUid: "u",
    semanticRole: "journey-map", ownerPersonId2: "someone", folderId2: "other" });
  const keys = Object.keys(calls.rename[0]).sort();
  assert.deepEqual(keys, ["actorUid", "folderId", "name", "ownerPersonId", "tenantId"],
    "a wrapper forwarded a field the accepted Rules freeze");
});

await check("K17 this module still cannot name a Study Unit, on the WRITE side either", async () => {
  const src = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
    .filter((line) => !line.trim().startsWith("//")).join("\n");
  for (const forbidden of ["study-note-binding", "study-note-service", "unit-keys", "buildUnitKey", "sourceKey"]) {
    assert.ok(!code.includes(forbidden), `ADR-010 §2: the service reached for ${forbidden}`);
  }
});

// --- P6-E: a Note's position WITHIN a folder ------------------------------
await check("K18 a filing can be reordered inside its folder, carrying no folderId", async () => {
  reset();
  await reorderFiling(db, { ...own, placementId: "pl-1", order: 4, actorUid: "u" });
  assert.deepEqual(calls.reorderFiling[0], { ...own, placementId: "pl-1", order: 4, actorUid: "u" });
  // A folderId here would be a MOVE that rewrote its own record instead of
  // retiring and creating -- exactly what ADR-010 §5 and I4 forbid, and what
  // moveNoteToFolder() exists to do properly.
  assert.ok(!Object.keys(calls.reorderFiling[0]).includes("folderId"));
  assert.equal(calls.move.length, 0, "a reorder is not a move");
});

// --- issue #259: loadAllOwnerNotes / loadAllOwnerPlacements / folderNoteCounts / folderMoveRefusal ---
await check("K19 loadAllOwnerNotes() loops pages until exhausted and reports untruncated", async () => {
  reset();
  notesPageRows = Array.from({ length: 250 }, (_, i) => ({ id: `n${i}`, noteId: `n${i}` }));
  const { rows, truncated } = await loadAllOwnerNotes(db, { ...own, pageSize: 100 });
  assert.equal(rows.length, 250, "expected all 250 rows across 3 pages");
  assert.equal(truncated, false);
  assert.equal(calls.notesPage.length, 3, "expected exactly 3 page reads (100 + 100 + 50)");
  assert.equal(calls.notesPage[0].after, null);
  assert.equal(calls.notesPage[1].after.id, "n99");
  assert.equal(calls.notesPage[2].after.id, "n199");
});
await check("K20 loadAllOwnerPlacements() is the same loop over the placement page reader", async () => {
  reset();
  placementsPageRows = Array.from({ length: 150 }, (_, i) => ({ id: `p${i}` }));
  const { rows, truncated } = await loadAllOwnerPlacements(db, { ...own, pageSize: 100 });
  assert.equal(rows.length, 150);
  assert.equal(truncated, false);
  assert.equal(calls.placementsPage.length, 2);
});
await check("K21 the safety cap is real: a cursor that never actually advances is stopped after 50 pages and reported truncated, not hung", async () => {
  reset();
  // Every row shares the SAME id, so pageOf()'s own cursor lookup
  // (findIndex(id === after.id)) resolves to the FIRST occurrence every
  // time -- the next page is identical to the last, a reader that never
  // terminates through next: null, exactly the shape a real bug in a paged
  // reader could produce. loadAllOwnerNotes() must not hang against it.
  notesPageRows = Array.from({ length: 200 }, () => ({ id: "dup" }));
  const { truncated } = await loadAllOwnerNotes(db, { ...own, pageSize: 100 });
  assert.equal(truncated, true);
  assert.equal(calls.notesPage.length, 50, "expected exactly the 50-page safety cap, not one more");
});
await check("K22 folderNoteCounts() counts a Note filed in two folders of one subtree ONCE for their common ancestor", () => {
  const folders = [folder("root"), folder("a", { parentFolderId: "root" }), folder("b", { parentFolderId: "root" })];
  const placements = [pl("p1", { noteId: "shared", folderId: "a" }), pl("p2", { noteId: "shared", folderId: "b" })];
  const notes = [note("shared")];
  const counts = folderNoteCounts(folders, placements, notes);
  assert.equal(counts.a, 1); assert.equal(counts.b, 1);
  assert.equal(counts.root, 1, "the shared Note must count ONCE at the common ancestor, not twice");
});
await check("K23 folderNoteCounts() excludes a retired Note and reports 0 for an empty folder", () => {
  const folders = [folder("f1")];
  const placements = [pl("p1", { noteId: "gone", folderId: "f1" })];
  const notes = [note("gone", { status: "retired" })];
  assert.equal(folderNoteCounts(folders, placements, notes).f1, 0);
  assert.equal(folderNoteCounts([folder("empty")], [], []).empty, 0);
});
await check("K24 folderNoteCounts() does not hang on a cycle or an orphan in the input -- buildFolderTree() reports them, this function just does not count through them", () => {
  const cyclic = [folder("c1", { parentFolderId: "c2" }), folder("c2", { parentFolderId: "c1" })];
  const orphan = [folder("o1", { parentFolderId: "missing" })];
  const counts = folderNoteCounts([...cyclic, ...orphan], [pl("p1", { noteId: "n1", folderId: "c1" })], [note("n1")]);
  assert.deepEqual(counts, {}, "neither a cyclic nor an orphaned folder is reachable from any root, so neither is counted");
});
await check("K25 folderMoveRefusal() forwards to the contract's folderTreeRefusal() -- a self-parent is refused, a real move is not", () => {
  // folderTreeRefusal() reads `folders` as a Map (or plain id-keyed object),
  // never an array -- see its own header comment.
  const folders = new Map([["a", folder("a")], ["b", folder("b")]]);
  assert.equal(folderMoveRefusal({ folders, ...own, folderId: "a", parentFolderId: "a" }), "self-parent");
  assert.equal(folderMoveRefusal({ folders, ...own, folderId: "a", parentFolderId: "b" }), null);
});

// --- issue #267: ownerFolderTreePaged() ------------------------------------
// listNoteFoldersForOwner()/ownerFolderTree() are capped at the deployed
// Rules' 100-folder ceiling with no truncation notice at all (the same class
// of gap issue #259 already fixed for Notes and placements). The Owner's own
// imported site has roughly 1,464 folders (issue #265) -- well past it.
await check("K26 ownerFolderTreePaged() loops pages until exhausted, reports untruncated, and still walks the tree safely", async () => {
  reset();
  foldersPageRows = Array.from({ length: 250 }, (_, i) => ({ id: `f${i}`, folderId: `f${i}`, name: `f${i}`, parentFolderId: null, status: "active", semanticRole: "user", ...own }));
  const { roots, truncated } = await ownerFolderTreePaged(db, own);
  assert.equal(roots.length, 250, "expected all 250 folders across 3 pages");
  assert.equal(truncated, false);
  assert.equal(calls.foldersPage.length, 3, "expected exactly 3 page reads (100 + 100 + 50)");
  assert.equal(calls.foldersPage[0].after, null);
  assert.equal(calls.foldersPage[1].after.id, "f99");
});
await check("K27 ownerFolderTreePaged() reports truncated once the 50-page safety cap is hit, same as loadAllOwnerNotes()", async () => {
  reset();
  foldersPageRows = Array.from({ length: 200 }, () => ({ id: "dup", folderId: "dup", name: "dup", parentFolderId: null, status: "active", semanticRole: "user", ...own }));
  const { truncated } = await ownerFolderTreePaged(db, own);
  assert.equal(truncated, true);
  assert.equal(calls.foldersPage.length, 50);
});
await check("K28 ownerFolderTree() itself is UNCHANGED -- still a single-shot read, still capped, still the function issue #247's own fixture guards", async () => {
  reset();
  foldersPageRows = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, folderId: `p${i}`, name: `p${i}`, parentFolderId: null, status: "active", semanticRole: "user", ...own }));
  folderRows = [folder("a")];
  const { roots } = await ownerFolderTree(db, own);
  assert.deepEqual(roots.map((r) => r.folderId), ["a"], "ownerFolderTree() must still read the single-shot listNoteFoldersForOwner(), not the paged reader");
  assert.equal(calls.foldersPage.length, 0, "ownerFolderTree() must never touch the paged reader");
});

console.log(`\n${passed} passed`);
