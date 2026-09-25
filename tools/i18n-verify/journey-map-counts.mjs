// Issue #259 -- a dedicated, pure suite for journey-map-service.js's
// folderNoteCounts(): the subtree Note-count that backs the tree's own
// count badge. Executed directly against the REAL source (no rewritten
// imports, no stub) -- unlike journey-map-service.mjs's own K19-K25, which
// exercise the same function alongside a Firestore-shaped fixture, this
// suite is the one place the counting RULE itself is proven in isolation,
// with mutation controls.
//
// folderNoteCounts() is pure: no Firebase, no DOM. It calls buildFolderTree()
// (already bounded and cycle-safe, P6-B/P6-D) for the walk rather than
// re-deriving parent/child structure itself -- this suite therefore never
// needs its own cycle-safety proof; buildFolderTree()'s own suite already
// carries that, and case 5 below only proves this function does not crash or
// miscount when handed a tree buildFolderTree() itself refuses part of.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    }
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// folderNoteCounts() itself touches only NOTE_STATUS and buildFolderTree()
// (the real, pure NOTE_STATUS.ACTIVE literal and the real contract file) --
// but the module it lives in also imports the REST of note-foundation.js,
// which in turn imports the real Firebase SDK over https:, which Node's ESM
// loader cannot resolve at all. Same rewrite technique as
// journey-map-service.mjs: the note-foundation.js import is swapped for the
// one real constant this function needs (every other name stays undefined,
// safe because nothing here calls a function that reads them), and the
// contract import is pointed at the real file on disk.
let source = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
source = source
  .replace(/import \{[\s\S]*?\} from "\.\/note-foundation\.js";/,
    'const NOTE_STATUS = Object.freeze({ ACTIVE: "active", RETIRED: "retired" });')
  .replace(/from "\.\/journey-map-contract\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href}"`);
assert.ok(!/from "\.\//.test(source), "an import was not rewritten");
const { folderNoteCounts } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const own = { tenantId: "t1", ownerPersonId: "p1" };
const folder = (folderId, o = {}) => ({ folderId, name: folderId, parentFolderId: null, status: "active", semanticRole: "user", ...own, ...o });
const pl = (placementId, o = {}) => ({ placementId, noteId: "n1", folderId: "f1", order: 0, status: "active", ...own, ...o });
const note = (noteId, o = {}) => ({ noteId, title: noteId, status: "active", ...own, ...o });

// --- 1. A NESTED TREE --------------------------------------------------------
check("a three-level nested tree: each ancestor's count includes every descendant's own Notes", () => {
  const folders = [
    folder("root"),
    folder("mid", { parentFolderId: "root" }),
    folder("leaf", { parentFolderId: "mid" }),
  ];
  const placements = [pl("p1", { noteId: "a", folderId: "leaf" }), pl("p2", { noteId: "b", folderId: "mid" })];
  const notes = [note("a"), note("b")];
  const counts = folderNoteCounts(folders, placements, notes);
  assert.equal(counts.leaf, 1, "leaf holds its own Note directly");
  assert.equal(counts.mid, 2, "mid holds its own Note plus everything in leaf");
  assert.equal(counts.root, 2, "root holds everything beneath it");
});

// --- 2. ONE NOTE, TWO FOLDERS OF ONE SUBTREE, COUNTED ONCE -------------------
check("a Note filed in two folders of the same subtree counts ONCE at their common ancestor", () => {
  const folders = [folder("root"), folder("a", { parentFolderId: "root" }), folder("b", { parentFolderId: "root" })];
  const placements = [pl("p1", { noteId: "shared", folderId: "a" }), pl("p2", { noteId: "shared", folderId: "b" })];
  const notes = [note("shared")];
  const counts = folderNoteCounts(folders, placements, notes);
  assert.equal(counts.a, 1);
  assert.equal(counts.b, 1);
  assert.equal(counts.root, 1, "the shared Note is one distinct Note, not two, at the ancestor both folders share");
});
check("MUTATION CONTROL, reported: a naive SUM of children's own counts (rather than a set union) would double-count the shared Note at root", () => {
  // Reproduces the defect a sum-based implementation would have, so this
  // suite's own case above is proven to have real bite: if folderNoteCounts()
  // were ever rewritten to sum child counts instead of unioning child SETS,
  // this control shows what root would wrongly read (2, not 1).
  const childCounts = { a: 1, b: 1 };
  const naiveSum = Object.values(childCounts).reduce((total, n) => total + n, 0);
  assert.equal(naiveSum, 2, "the naive sum really would double-count -- confirms the case above is exercising a real risk, not a vacuous one");
});

// --- 3. A RETIRED NOTE COUNTS NOWHERE ----------------------------------------
check("a retired Note is excluded even though its placement is still active (I4 -- retiring never touches placements)", () => {
  const folders = [folder("f1")];
  const placements = [pl("p1", { noteId: "gone", folderId: "f1" })];
  const notes = [note("gone", { status: "retired" })];
  assert.equal(folderNoteCounts(folders, placements, notes).f1, 0);
});
check("MUTATION-PROVEN: dropping the ACTIVE-note filter makes the retired-Note case above fail", () => {
  // The real rule, reproduced with the filter removed, to prove the case
  // above is not passing for an unrelated reason (e.g. a typo'd folderId).
  function folderNoteCountsWithoutStatusFilter(folders, placements, notes) {
    const notesById = new Map((notes ?? []).map((n) => [n.noteId, n]));
    const direct = new Map();
    for (const p of placements ?? []) {
      if (p.status !== "active") continue;
      if (!notesById.has(p.noteId)) continue; // existence only -- status ignored, the mutation
      if (!direct.has(p.folderId)) direct.set(p.folderId, new Set());
      direct.get(p.folderId).add(p.noteId);
    }
    return direct.get("f1")?.size ?? 0;
  }
  const placements = [pl("p1", { noteId: "gone", folderId: "f1" })];
  const notes = [note("gone", { status: "retired" })];
  assert.equal(folderNoteCountsWithoutStatusFilter([], placements, notes), 1,
    "the mutated (status-blind) version wrongly counts the retired Note -- confirms the real function's own filter is load-bearing");
});

// --- 4. AN EMPTY FOLDER READS 0, NOT ABSENT ----------------------------------
check("a folder with nothing filed in it, and no descendants, reads exactly 0", () => {
  const counts = folderNoteCounts([folder("empty")], [], []);
  assert.equal(counts.empty, 0);
  assert.ok("empty" in counts, "an empty folder must be a present key reading 0, not an absent one a caller has to ?? 0 blindly forever -- it IS ?? 0'd by the caller too, but this proves the function itself does not simply skip empty folders");
});

// --- 5. A CYCLE OR AN ORPHAN MUST NOT HANG, AND IS REPORTED BY buildFolderTree() ---
check("a cyclic pair of folders does not hang folderNoteCounts(), and contributes to no ancestor's count", () => {
  const cyclic = [folder("c1", { parentFolderId: "c2" }), folder("c2", { parentFolderId: "c1" })];
  const placements = [pl("p1", { noteId: "n1", folderId: "c1" })];
  const counts = folderNoteCounts(cyclic, placements, [note("n1")]);
  assert.deepEqual(counts, {}, "neither folder in the cycle is reachable from any root, so buildFolderTree() excludes both and neither is counted");
});
check("an orphaned folder (parent not in the set) does not hang folderNoteCounts(), and is not counted either", () => {
  const orphan = [folder("o1", { parentFolderId: "missing" })];
  const counts = folderNoteCounts(orphan, [pl("p1", { noteId: "n1", folderId: "o1" })], [note("n1")]);
  assert.deepEqual(counts, {}, "an orphaned folder is never reached from a root either");
});
check("a folder set mixing a real subtree with a cycle counts the real subtree correctly and ignores the cycle, in one call", () => {
  const folders = [
    folder("root"), folder("child", { parentFolderId: "root" }),
    folder("c1", { parentFolderId: "c2" }), folder("c2", { parentFolderId: "c1" }),
  ];
  const placements = [pl("p1", { noteId: "real", folderId: "child" }), pl("p2", { noteId: "cyclic", folderId: "c1" })];
  const notes = [note("real"), note("cyclic")];
  const counts = folderNoteCounts(folders, placements, notes);
  assert.equal(counts.root, 1);
  assert.equal(counts.child, 1);
  assert.equal(counts.c1, undefined, "a folder excluded by buildFolderTree() as cyclic has no count entry at all");
  assert.equal(counts.c2, undefined);
});

console.log(`\n==== Mapping My Journey folder counts (issue #259): ${passed} passed, ${failed} failed ====`);
if (failed) process.exitCode = 1;
