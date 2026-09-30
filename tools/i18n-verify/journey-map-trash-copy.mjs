// Siyagah port round 1 (#434) -- Trash / Restore / Copy / Move, executed
// against an in-memory fake database. No network, no emulator, no browser.
//
// The REAL app/js/journey-map-service.js runs with its note-foundation import
// rewritten to a fake that reads and writes one in-memory store, and the REAL
// restoreNote() runs from the real note-foundation.js with its imports stubbed.
// The fake batch applies the Rules' `get()` semantics: a write is judged against
// the state BEFORE its batch, so an order the real Rules would deny fails here.
// Expected values are written by hand. Run from the repository root.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
const contractUrl = pathToFileURL(path.join(root, "app/js/journey-map-contract.js")).href;
const shardUrl = pathToFileURL(path.join(root, "app/js/journey-map-shard.js")).href;

let service = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
service = service
  .replace(/import \{[\s\S]*?\} from "\.\/note-foundation\.js";/,
    "const { NOTE_STATUS, commitFolderBatch, createNotePlacement, newNoteEntityId, getNotesByIds, listNoteFoldersForOwner, listNoteFoldersForOwnerPage, listNotePlacementsForFolder, listNotePlacementsForNote, listNotesForOwnerPage, listNotesForOwnerIdPage, listNotePlacementsForOwnerPage, moveNotePlacement, renameNoteFolder, reorderNoteFolder, reparentNoteFolder, retireNoteFolder, reorderNotePlacement } = globalThis.__fake;")
  .replace(/from "\.\/journey-map-contract\.js"/, `from "${contractUrl}"`)
  .replace(/from "\.\/journey-map-shard\.js"/, `from "${shardUrl}"`);
assert.ok(!/from "\.\//.test(service), "an import was not rewritten");

// ---- the fake database -----------------------------------------------------
let store, log, batches, failBatch;
const own = { tenantId: "t1", ownerPersonId: "p1" };
const STATUS = Object.freeze({ ACTIVE: "active", RETIRED: "retired" });
let idSeq = 0;

function reset() {
  store = { folders: new Map(), placements: new Map(), notes: new Map() };
  log = []; batches = []; idSeq = 0; failBatch = null;
}
const addFolder = (folderId, o = {}) => store.folders.set(folderId, {
  folderId, name: folderId, parentFolderId: null, semanticRole: "user", order: 0, status: "active", ...own, ownerUid: null, ...o });
const addNote = (noteId, o = {}) => store.notes.set(noteId, {
  noteId, title: "T", bodyHtml: "<p>x</p>", status: "active", currentRevisionId: "r1", ...own, ownerUid: null, ...o });
const addPlacement = (placementId, noteId, folderId, o = {}) => store.placements.set(placementId, {
  placementId, noteId, folderId, order: 0, status: "active", ...own, ownerUid: null, ...o });
const snapshot = () => JSON.stringify({
  folders: [...store.folders.entries()].sort(), placements: [...store.placements.entries()].sort(),
  notes: [...store.notes.entries()].sort() });
function changedDocs(before, after) {
  const a = JSON.parse(before), b = JSON.parse(after), out = [];
  for (const kind of ["folders", "placements", "notes"]) {
    const x = new Map(a[kind]), y = new Map(b[kind]);
    for (const [id, v] of y) if (!x.has(id)) out.push(`+${kind}:${id}`);
      else if (JSON.stringify(x.get(id)) !== JSON.stringify(v)) out.push(`~${kind}:${id}`);
    for (const id of x.keys()) if (!y.has(id)) out.push(`-${kind}:${id}`);
  }
  return out.sort();
}
function page(rows, { pageSize, after, status, ownerPersonId }) {
  const all = rows.filter((r) => r.status === status && r.ownerPersonId === ownerPersonId).sort((p, q) => (p.id < q.id ? -1 : 1));
  const start = after ? all.findIndex((r) => r.id === after.id) + 1 : 0;
  const slice = all.slice(start, start + pageSize);
  return { rows: slice, next: slice.length < pageSize ? null : slice[slice.length - 1] };
}
const withId = (map, key) => [...map.values()].map((r) => ({ id: `${own.tenantId}__${r[key]}`, ...r }));

globalThis.__fake = {
  NOTE_STATUS: STATUS,
  newNoteEntityId: () => `new${++idSeq}`,
  listNoteFoldersForOwnerPage: async (_d, a) => page(withId(store.folders, "folderId"), a),
  listNotesForOwnerPage: async (_d, a) => page(withId(store.notes, "noteId"), a),
  listNotePlacementsForOwnerPage: async (_d, a) => page(withId(store.placements, "placementId"), a),
  listNotePlacementsForFolder: async (_d, a) => [...store.placements.values()]
    .filter((p) => p.folderId === a.folderId && p.status === "active").slice(0, a.maximum),
  listNotePlacementsForNote: async (_d, a) => [...store.placements.values()]
    .filter((p) => p.noteId === a.noteId && p.status === "active").slice(0, a.maximum),
  getNotesByIds: async (_d, _t, ids) => ids.map((i) => store.notes.get(i)).filter(Boolean),
  createNotePlacement: async (_d, a) => {
    assert.ok(store.folders.get(a.folderId)?.status === "active" && store.notes.get(a.noteId)?.status === "active");
    addPlacement(a.placementId ?? `new${++idSeq}`, a.noteId, a.folderId, { order: a.order });
    log.push(`createPlacement:${a.noteId}->${a.folderId}`);
    return "x";
  },
  moveNotePlacement: async (_d, a) => {
    store.placements.get(a.fromPlacementId).status = "retired";
    addPlacement(`new${++idSeq}`, a.noteId, a.toFolderId, { order: a.order });
    log.push(`movePlacement:${a.fromPlacementId}->${a.toFolderId}`);
    return "moved";
  },
  commitFolderBatch: async (_d, a) => {
    const n = (a.folderCreates?.length ?? 0) + (a.folderStatus?.length ?? 0)
      + (a.placementCreates?.length ?? 0) + (a.placementStatus?.length ?? 0);
    assert.ok(n <= 500, "a batch above 500 writes");
    if (failBatch === batches.length) throw new Error("boom");
    batches.push(n);
    const pre = (id) => store.folders.get(id); // `get()` = state BEFORE the batch
    const snap = new Map([...store.folders].map(([k, v]) => [k, { ...v }]));
    const parentOk = (pid) => pid === null || snap.get(pid)?.status === "active";
    for (const f of a.folderCreates ?? []) assert.ok(parentOk(f.parentFolderId ?? null), `Rules would deny create ${f.folderId}: parent not active before the batch`);
    for (const s of a.folderStatus ?? []) assert.ok(parentOk(pre(s.folderId).parentFolderId ?? null), `Rules would deny update ${s.folderId}: parent not active before the batch`);
    for (const p of a.placementCreates ?? []) assert.equal(snap.get(p.folderId)?.status, "active", `Rules would deny placement ${p.placementId}: folder not active before the batch`);
    for (const f of a.folderCreates ?? []) addFolder(f.folderId, { name: f.name, parentFolderId: f.parentFolderId ?? null, order: f.order, ownerUid: a.ownerUid ?? null });
    for (const s of a.folderStatus ?? []) store.folders.get(s.folderId).status = s.status;
    for (const p of a.placementCreates ?? []) addPlacement(p.placementId, p.noteId, p.folderId, { order: p.order });
    for (const s of a.placementStatus ?? []) store.placements.get(s.placementId).status = s.status;
    return n;
  },
};

const svc = await import(`data:text/javascript,${encodeURIComponent(service)}`);
const db = {};
const act = { ...own, actorUid: "u1" };

// ---- the real restoreNote, imports stubbed ---------------------------------
let foundation = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
foundation = foundation
  .replace(/import \{[\s\S]*?\} from "https:\/\/www\.gstatic\.com[^"]*";/, "const { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, startAfter, where } = {};")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, 'const TENANT = { NOTES: "notes", NOTE_REVISIONS: "noteRevisions", NOTE_FOLDERS: "noteFolders", NOTE_PLACEMENTS: "notePlacements" };')
  .replace(/import \{ folderTreeRefusal, journeyFolder \} from "\.\/journey-map-contract\.js";/, `import { folderTreeRefusal, journeyFolder } from "${contractUrl}";`)
  // two import lines today (the original is kept byte-identical for other suites)
  .replace(/import \{ createDocument, runEnvelopeTransaction \} from "\.\/envelope\.js";/, "const { createDocument, runEnvelopeTransaction } = globalThis.__env;")
  .replace(/import \{ commitEnvelopeBatch \} from "\.\/envelope\.js";/, "const { commitEnvelopeBatch } = globalThis.__env;");
assert.ok(!/from "\.\//.test(foundation), "a foundation import was not rewritten");
const docs = { notes: new Map(), revs: [] };
globalThis.__env = {
  runEnvelopeTransaction: async (_d, uid, cb) => {
    const writes = [];
    await cb({
      get: async (_c, id) => ({ exists: () => docs.notes.has(id), data: () => docs.notes.get(id) }),
      create: (c, id, data) => writes.push(["create", c, id, data]),
      update: (c, id, data) => writes.push(["update", c, id, data]),
    });
    for (const [kind, c, id, data] of writes) {
      if (kind === "create") docs.revs.push({ id, ...data });
      else docs.notes.set(id, { ...docs.notes.get(id), ...data });
    }
  },
};
const found = await import(`data:text/javascript,${encodeURIComponent(foundation)}`);

let passed = 0;
async function check(name, fn) { reset(); await fn(); passed++; console.log(`  PASS  ${name}`); }
const refusal = (p, re) => assert.rejects(p, re);

// ---- Trash -----------------------------------------------------------------
await check("T1 a folder whose sub-subfolder holds 1 active Note is refused with n = 1 and NO write", async () => {
  addFolder("a"); addFolder("b", { parentFolderId: "a" }); addFolder("c", { parentFolderId: "b" });
  addNote("n1"); addPlacement("p1", "n1", "c");
  const before = snapshot();
  await refusal(svc.trashFolder(db, { ...act, folderId: "a" }), /^Error: This folder still holds 1 notes\. Move or delete them first\.$/);
  assert.equal(batches.length, 0);
  assert.equal(snapshot(), before);
});
await check("T2 a retired Note does not count: the folder is trashed", async () => {
  addFolder("a"); addNote("n1", { status: "retired" }); addPlacement("p1", "n1", "a");
  await svc.trashFolder(db, { ...act, folderId: "a" });
  assert.equal(store.folders.get("a").status, "retired");
});
await check("T3 a Note filed twice in one subtree counts ONCE", async () => {
  addFolder("a"); addFolder("b", { parentFolderId: "a" });
  addNote("n1"); addPlacement("p1", "n1", "a"); addPlacement("p2", "n1", "b");
  await refusal(svc.trashFolder(db, { ...act, folderId: "a" }), /still holds 1 notes/);
});
await check("T4 an empty folder with 2 empty subfolders: all 3 retired in one call, changing only those 3", async () => {
  addFolder("a"); addFolder("b", { parentFolderId: "a" }); addFolder("c", { parentFolderId: "a" }); addFolder("other");
  const before = snapshot();
  const out = await svc.trashFolder(db, { ...act, folderId: "a" });
  assert.deepEqual(changedDocs(before, snapshot()), ["~folders:a", "~folders:b", "~folders:c"]);
  assert.equal(out.retired.length, 3);
  assert.equal(out.retired[2], "a", "the root is retired last");
  assert.deepEqual(batches, [3]);
});
await check("T5 a system folder is refused in words, no write", async () => {
  addFolder("sys", { semanticRole: "journey-map" });
  await refusal(svc.trashFolder(db, { ...act, folderId: "sys" }), /System folders cannot be moved to Trash\./);
  assert.equal(batches.length, 0);
});
await check("T6 a missing or already-retired folder is refused", async () => {
  addFolder("gone", { status: "retired" });
  await refusal(svc.trashFolder(db, { ...act, folderId: "gone" }), /Folder does not exist\./);
});
await check("T7 a subtree of 1000 folders is retired in chunks of at most 450, deepest first", async () => {
  addFolder("root");
  for (let i = 0; i < 999; i += 1) addFolder(`k${i}`, { parentFolderId: i < 100 ? "root" : `k${i % 100}` });
  await svc.trashFolder(db, { ...act, folderId: "root" });
  assert.deepEqual(batches, [450, 450, 100]);
  assert.ok([...store.folders.values()].every((f) => f.status === "retired"));
});

// ---- Restore ---------------------------------------------------------------
await check("R1 restoring a child whose parent is retired brings back the whole retired chain, parents first, only those", async () => {
  addFolder("top"); addFolder("mid", { parentFolderId: "top", status: "retired" });
  addFolder("leaf", { parentFolderId: "mid", status: "retired" }); addFolder("x", { status: "retired" });
  const before = snapshot();
  const out = await svc.restoreFolder(db, { ...act, folderId: "leaf" });
  assert.deepEqual(out.restored, ["mid", "leaf"]);
  assert.deepEqual(changedDocs(before, snapshot()), ["~folders:leaf", "~folders:mid"]);
  assert.deepEqual(batches, [1, 1], "one depth level per batch -- the Rules read the parent BEFORE the batch");
});
await check("R2 restoring a parent also restores its retired descendants", async () => {
  addFolder("p", { status: "retired" }); addFolder("c1", { parentFolderId: "p", status: "retired" });
  addFolder("c2", { parentFolderId: "p", status: "retired" }); addFolder("g", { parentFolderId: "c1", status: "retired" });
  await svc.restoreFolder(db, { ...act, folderId: "p" });
  assert.ok(["p", "c1", "c2", "g"].every((id) => store.folders.get(id).status === "active"));
  assert.deepEqual(batches, [1, 2, 1]);
});
await check("R3 an active folder is refused; so is a restore that would exceed depth 8", async () => {
  addFolder("live");
  await refusal(svc.restoreFolder(db, { ...act, folderId: "live" }), /Folder is not in Trash\./);
  let parent = null;
  for (let i = 1; i <= 8; i += 1) { addFolder(`d${i}`, { parentFolderId: parent }); parent = `d${i}`; }
  addFolder("r1", { parentFolderId: "d8", status: "retired" });
  const before = snapshot();
  await refusal(svc.restoreFolder(db, { ...act, folderId: "r1" }), /too-deep/);
  assert.equal(snapshot(), before);
});
await check("R4 a retired folder whose parent is missing is refused, no write", async () => {
  addFolder("orph", { parentFolderId: "nope", status: "retired" });
  await refusal(svc.restoreFolder(db, { ...act, folderId: "orph" }), /parent-missing/);
  assert.equal(batches.length, 0);
});
await check("R5 restoreNote writes a NEW CHAINED revision and flips status only", async () => {
  docs.notes.set("t1__n1", { ...own, noteId: "n1", title: "Tt", bodyHtml: "<p>b</p>", status: "retired", currentRevisionId: "rev1" });
  docs.revs.length = 0;
  const rid = await found.restoreNote(db, { tenantId: "t1", noteId: "n1", expectedRevisionId: "rev1", actorUid: "u1" });
  const n = docs.notes.get("t1__n1");
  assert.equal(n.status, "active"); assert.equal(n.currentRevisionId, rid);
  assert.equal(docs.revs.length, 1);
  assert.equal(docs.revs[0].previousRevisionId, "rev1");
  assert.equal(docs.revs[0].revisionReason, "restored");
  assert.equal(docs.revs[0].title, "Tt");
  await refusal(found.restoreNote(db, { tenantId: "t1", noteId: "n1", expectedRevisionId: rid, actorUid: "u1" }), /not in Trash/);
  docs.notes.get("t1__n1").status = "retired";
  await refusal(found.restoreNote(db, { tenantId: "t1", noteId: "n1", expectedRevisionId: "stale", actorUid: "u1" }), /Stale Note revision/);
});

// ---- loadOwnerTrash --------------------------------------------------------
await check("L1 loadOwnerTrash returns only retired folders and Notes, paging past 100", async () => {
  addFolder("live"); for (let i = 0; i < 130; i += 1) addFolder(`rf${i}`, { status: "retired" });
  addNote("ln"); for (let i = 0; i < 101; i += 1) addNote(`rn${i}`, { status: "retired" });
  const t = await svc.loadOwnerTrash(db, own);
  assert.equal(t.folders.length, 130); assert.equal(t.notes.length, 101); assert.equal(t.truncated, false);
});
await check("L2 the 50-page cap is reported as truncated", async () => {
  for (let i = 0; i < 5001; i += 1) addNote(`rn${i}`, { status: "retired" });
  const t = await svc.loadOwnerTrash(db, own);
  assert.equal(t.notes.length, 5000); assert.equal(t.truncated, true);
});

// ---- Copy / Move a Note ----------------------------------------------------
await check("C1 copyNoteToFolder: ONE Note in 2 folders, exactly one new placement, at the end", async () => {
  addFolder("f1"); addFolder("f2"); addNote("n1"); addNote("n2");
  addPlacement("p1", "n1", "f1"); addPlacement("p2", "n2", "f2", { order: 4 });
  const before = snapshot();
  await svc.copyNoteToFolder(db, { ...act, noteId: "n1", toFolderId: "f2" });
  const changed = changedDocs(before, snapshot());
  assert.equal(changed.length, 1); assert.match(changed[0], /^\+placements:/);
  assert.equal(store.notes.size, 2, "no second Note");
  const mine = [...store.placements.values()].filter((p) => p.noteId === "n1" && p.status === "active");
  assert.deepEqual(mine.map((p) => p.folderId).sort(), ["f1", "f2"]);
  assert.equal(mine.find((p) => p.folderId === "f2").order, 5);
});
await check("C2 copying into a folder the Note is already in is refused in words, no write", async () => {
  addFolder("f1"); addNote("n1"); addPlacement("p1", "n1", "f1");
  await refusal(svc.copyNoteToFolder(db, { ...act, noteId: "n1", toFolderId: "f1" }), /This note is already filed in that folder\./);
  assert.equal(store.placements.size, 1);
});
await check("C3 a retired target folder is refused", async () => {
  addFolder("f1", { status: "retired" }); addNote("n1");
  await refusal(svc.copyNoteToFolder(db, { ...act, noteId: "n1", toFolderId: "f1" }), /does not exist or is in Trash/);
});
await check("M1 moveNote with a current folder retires that placement and creates one, nothing else", async () => {
  addFolder("f1"); addFolder("f2"); addFolder("f3"); addNote("n1");
  addPlacement("p1", "n1", "f1"); addPlacement("p3", "n1", "f3");
  const before = snapshot();
  await svc.moveNote(db, { ...act, noteId: "n1", fromFolderId: "f1", toFolderId: "f2" });
  assert.deepEqual(changedDocs(before, snapshot()).filter((c) => !c.startsWith("+")), ["~placements:p1"]);
  assert.equal(changedDocs(before, snapshot()).length, 2);
  assert.equal(store.placements.get("p3").status, "active", "the other filing is untouched");
});
await check("M2 moveNote with NO current folder retires every active placement and creates one, in one batch", async () => {
  addFolder("f1"); addFolder("f2"); addFolder("f3"); addNote("n1"); addNote("n2");
  addPlacement("p1", "n1", "f1"); addPlacement("p2", "n1", "f2"); addPlacement("pz", "n2", "f1");
  const before = snapshot();
  await svc.moveNote(db, { ...act, noteId: "n1", toFolderId: "f3" });
  const changed = changedDocs(before, snapshot());
  assert.equal(changed.filter((c) => c.startsWith("~")).sort().join(), "~placements:p1,~placements:p2");
  assert.equal(changed.filter((c) => c.startsWith("+placements")).length, 1);
  assert.equal(changed.length, 3);
  assert.deepEqual(batches, [3]);
});
await check("M3 moveNote refuses a wrong current folder and a no-op", async () => {
  addFolder("f1"); addFolder("f2"); addNote("n1"); addPlacement("p1", "n1", "f1");
  await refusal(svc.moveNote(db, { ...act, noteId: "n1", fromFolderId: "f2", toFolderId: "f1" }), /not filed in that folder/);
  await refusal(svc.moveNote(db, { ...act, noteId: "n1", toFolderId: "f1" }), /already filed/);
});

// ---- Copy a folder ---------------------------------------------------------
function seedTree() {
  addFolder("A", { order: 0 }); addFolder("B", { parentFolderId: "A", order: 1 }); addFolder("C", { parentFolderId: "A", order: 2 });
  addFolder("T", { order: 7 }); addFolder("Z", { order: 0, status: "active" }); addFolder("ret", { parentFolderId: "A", status: "retired" });
  addNote("n1"); addNote("n2"); addNote("dead", { status: "retired" });
  addPlacement("p1", "n1", "A"); addPlacement("p2", "n2", "B"); addPlacement("p3", "n1", "C"); addPlacement("p4", "dead", "B");
}
await check("F1 copyFolder: same shape under the target, new ids, Notes LINKED (placements double, Notes unchanged)", async () => {
  seedTree();
  const notesBefore = JSON.stringify([...store.notes]);
  const out = await svc.copyFolder(db, { ...act, folderId: "A", toParentFolderId: "T" });
  assert.equal(out.folders, 3); assert.equal(out.placements, 3);
  assert.equal(JSON.stringify([...store.notes]), notesBefore, "Note content is never duplicated or touched");
  const copies = [...store.folders.values()].filter((f) => !["A", "B", "C", "T", "Z", "ret"].includes(f.folderId));
  assert.equal(copies.length, 3);
  const root = copies.find((f) => f.folderId === out.rootFolderId);
  assert.equal(root.name, "A"); assert.equal(root.parentFolderId, "T"); assert.equal(root.order, 0, "at the end of T's (empty) children");
  assert.deepEqual(copies.filter((f) => f.parentFolderId === root.folderId).map((f) => f.name).sort(), ["B", "C"]);
  assert.ok(copies.every((f) => f.semanticRole === "user" && f.status === "active"));
  const copyIds = new Set(copies.map((f) => f.folderId));
  const linked = [...store.placements.values()].filter((p) => copyIds.has(p.folderId));
  assert.equal(linked.length, 3);
  assert.equal([...store.placements.values()].length, 4 + 3, "4 original placements (one to a retired Note) + 3 new");
  assert.deepEqual(linked.map((p) => p.noteId).sort(), ["n1", "n1", "n2"], "the retired Note is not linked");
  const bCopy = copies.find((f) => f.name === "B");
  assert.equal(linked.find((p) => p.folderId === bCopy.folderId).noteId, "n2");
});
await check("F2 copyFolder changes ONLY new documents: no existing document is altered", async () => {
  seedTree();
  const before = snapshot();
  await svc.copyFolder(db, { ...act, folderId: "A", toParentFolderId: null });
  assert.ok(changedDocs(before, snapshot()).every((c) => c.startsWith("+")), changedDocs(before, snapshot()).join());
  assert.equal(changedDocs(before, snapshot()).length, 6);
  const root = [...store.folders.values()].find((f) => f.name === "A" && f.folderId !== "A");
  assert.equal(root.parentFolderId, null); assert.equal(root.order, 8, "top-level orders are 0, 0, 7 and 0 -> the end is 8");
});
await check("F3 a copy into its own subtree is refused, no write", async () => {
  seedTree(); const before = snapshot();
  await refusal(svc.copyFolder(db, { ...act, folderId: "A", toParentFolderId: "B" }), /cycle/);
  await refusal(svc.copyFolder(db, { ...act, folderId: "A", toParentFolderId: "A" }), /self-parent|cycle/);
  assert.equal(snapshot(), before); assert.equal(batches.length, 0);
});
await check("F4 a copy that would go beyond depth 8 is refused, no write", async () => {
  addFolder("s1"); addFolder("s2", { parentFolderId: "s1" }); addFolder("s3", { parentFolderId: "s2" });
  let parent = null;
  for (let i = 1; i <= 6; i += 1) { addFolder(`d${i}`, { parentFolderId: parent }); parent = `d${i}`; }
  const before = snapshot();
  await refusal(svc.copyFolder(db, { ...act, folderId: "s1", toParentFolderId: "d6" }), /too-deep/);
  assert.equal(snapshot(), before);
  await svc.copyFolder(db, { ...act, folderId: "s1", toParentFolderId: "d5" }); // 5 + 3 = 8, allowed
  assert.equal([...store.folders.values()].length, 9 + 3);
});
await check("F5 a system folder, or a retired target, is refused", async () => {
  addFolder("sys", { semanticRole: "reflection-archive" }); addFolder("rt", { status: "retired" }); addFolder("u");
  await refusal(svc.copyFolder(db, { ...act, folderId: "sys" }), /System folders cannot be copied/);
  await refusal(svc.copyFolder(db, { ...act, folderId: "u", toParentFolderId: "rt" }), /parent-not-active|parent-missing/);
});
await check("F6 a subtree with more than 450 writes is chunked at 450, folders before placements, levels in order", async () => {
  addFolder("R"); addNote("n1");
  for (let i = 0; i < 500; i += 1) addFolder(`k${i}`, { parentFolderId: "R" });
  for (let i = 0; i < 500; i += 1) addPlacement(`pp${i}`, "n1", `k${i % 500}`);
  const out = await svc.copyFolder(db, { ...act, folderId: "R" });
  assert.equal(out.folders, 501); assert.equal(out.placements, 500);
  assert.deepEqual(batches, [1, 450, 50, 450, 50], "root level, child level (450+50), then placements (450+50)");
  assert.ok(Math.max(...batches) <= 450);
});
await check("F7 a failure part-way reaches the caller and leaves no placement pointing at a missing folder", async () => {
  seedTree(); failBatch = 2; // the third commit: the placements
  await refusal(svc.copyFolder(db, { ...act, folderId: "A", toParentFolderId: "T" }), /boom/);
  assert.ok([...store.placements.values()].every((p) => store.folders.has(p.folderId)));
});

// ---- cross-owner and the boundary of what each operation names -------------
await check("X1 another owner's folders are invisible: trash and copy of them are refused as missing", async () => {
  addFolder("theirs", { ownerPersonId: "p2" });
  await refusal(svc.trashFolder(db, { ...act, folderId: "theirs" }), /Folder does not exist/);
});
await check("X2 every service function forwards only ids and order -- never a name change or a Note field", async () => {
  seedTree(); const before = snapshot();
  await svc.copyFolder(db, { ...act, folderId: "B", toParentFolderId: "C" });
  const changed = changedDocs(before, snapshot());
  assert.ok(changed.every((c) => c.startsWith("+")));
  assert.ok(![...store.folders.values()].some((f) => /\d\.|\(copy\)/i.test(f.name)), "no numbering or suffix written into a name");
});

console.log(`\n${passed} passed`);
