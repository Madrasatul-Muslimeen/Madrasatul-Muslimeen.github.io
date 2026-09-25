// MAP Phase 6 -- proves the REAL app/js/note-foundation.js and
// app/js/journey-map-service.js write/read functions against the REAL
// emulator running the REAL DEPLOYED Rules, in one suite.
//
// Issue #242's suite, note-foundation-real-function.rules.test.mjs, was the
// first to run the REAL app/js/note-foundation.js functions against the REAL
// Rules engine, and on its first run it found a live defect: creating a Note
// had been refused in production since v08.47 (fixed in v08.56). Mapping My
// Journey (app/journey-map.html) writes folders and placements through the
// same data layer via app/js/journey-map-service.js and has never had that
// proof -- every existing Phase 6 suite either calls the real functions
// against a fake Firestore (no Rules evaluator) or hand-authors the write
// with setDoc/writeBatch against the candidate Rules (no real function).
// This file is additive and changes no application behaviour; it needs no
// version number.
//
// Isolated: never loads a production endpoint or project id (SAFE-01,
// asserted below). Unlike note-foundation-real-function.rules.test.mjs
// (which still defaults to the Phase 5 candidate extract), this suite
// defaults to firestore.rules itself -- the noteFolders/notePlacements
// Rules have been deployed and live since 22 Sep 2026, so "the real Rules"
// and "the deployed Rules" are the same file for this collection pair.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { stableImportId } from "../../app/js/notes-import-shared.js";

const PROJECT = "demo-quranrevival-journey-map-real-function";
const HOST = "127.0.0.1";
// Never 8089, 8092 or 8093 -- already used by note-foundation-real-function,
// word-progress-v1 and journey-map-v1 respectively. 8090 is free (checked
// against every other *.firebase.json in this directory).
const PORT = 8090;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "firestore.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");

// SAFE-01: never a production project or a non-emulator host.
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");

// ---------------------------------------------------------------------------
// Load the REAL app/js/envelope.js, app/js/note-foundation.js and
// app/js/journey-map-service.js as `data:` URL modules -- the identical
// loader technique note-foundation-real-function.rules.test.mjs already
// uses, extended one module further. The difference from that suite's own
// technique is only WHERE the Firestore import points: to the real
// `firebase/firestore` package this workspace already depends on, never to
// an in-memory fake. Every specifier a loaded module carries is rewritten to
// something absolute before it is imported, and every rewrite is asserted to
// have actually happened, so a missed import fails loudly instead of killing
// the suite silently:
//   - the gstatic Firestore import -> the real `firebase/firestore` package.
//   - "./envelope.js" (inside note-foundation.js) -> the data: URL built for
//     envelope.js below.
//   - "./collections.js" and "./journey-map-contract.js" (inside
//     note-foundation.js) -> resolved with pathToFileURL() to the real
//     files. Both are pure (no imports of their own, confirmed by reading
//     them), so neither needs rewriting itself.
//   - "./note-foundation.js" (inside journey-map-service.js) -> the SAME
//     data: URL built for note-foundation.js below, so both the direct
//     import used by this suite and journey-map-service.js's own import
//     resolve to ONE module instance rather than two independently-loaded
//     copies.
//   - "./journey-map-contract.js" (inside journey-map-service.js) -> the
//     same pathToFileURL() resolution as above.
// ---------------------------------------------------------------------------
const GSTATIC_FIRESTORE_IMPORT =
  /import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/;
const firestorePackageUrl = import.meta.resolve("firebase/firestore");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const realFileUrl = (relativeToAppJs) => pathToFileURL(path.join(root, "app/js", relativeToAppJs)).href;

function rewriteGstaticImport(source, importLine, label) {
  assert.match(source, GSTATIC_FIRESTORE_IMPORT,
    `${label}: its gstatic Firestore import moved or was rewritten upstream -- update this loader`);
  return source.replace(GSTATIC_FIRESTORE_IMPORT, importLine);
}

function rewriteSpecifier(source, specifier, replacementUrl, label) {
  const pattern = new RegExp(`from "${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
  assert.match(source, pattern, `${label}: its "${specifier}" specifier moved -- update this loader`);
  return source.replace(pattern, `from "${replacementUrl}"`);
}

let envelopeSource = fs.readFileSync(path.join(root, "app/js/envelope.js"), "utf8");
envelopeSource = rewriteGstaticImport(envelopeSource,
  `import { doc, setDoc, updateDoc, writeBatch, runTransaction, serverTimestamp } from "${firestorePackageUrl}";`,
  "envelope.js");
const envelopeDataUrl = toDataUrl(envelopeSource);

let noteFoundationSource = fs.readFileSync(path.join(root, "app/js/note-foundation.js"), "utf8");
noteFoundationSource = rewriteGstaticImport(noteFoundationSource,
  // Issue #282 -- documentId() joined this import list (the sharded parallel
  // loader's own document-ID range bound, idRangeClauses()); the real
  // `firebase/firestore` package exports it under the same name.
  `import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, startAfter, where } from "${firestorePackageUrl}";`,
  "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./collections.js", realFileUrl("collections.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "note-foundation.js");
noteFoundationSource = rewriteSpecifier(noteFoundationSource, "./envelope.js", envelopeDataUrl, "note-foundation.js");
const noteFoundationDataUrl = toDataUrl(noteFoundationSource);

const {
  createPermanentNote,
  createNoteFolder,
  createNotePlacement,
  retireNotePlacement,
  listNoteFoldersForOwner,
  listNotePlacementsForFolder,
  listNotePlacementsForNote,
  listNotesForOwnerPage,
  listNotePlacementsForOwnerPage,
  noteFoundationDocId,
} = await import(noteFoundationDataUrl);

let journeyMapServiceSource = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./note-foundation.js", noteFoundationDataUrl, "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "journey-map-service.js");
// Issue #282 -- journey-map-service.js's own sharded loaders import the
// (pure, no imports of its own) id-range splitter directly.
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-shard.js", realFileUrl("journey-map-shard.js"), "journey-map-service.js");

const {
  folderContents,
  noteFilings,
  ownerFolderTree,
  moveNoteToFolder,
  renameFolder,
  reorderFolder,
  moveFolder,
  retireFolder,
  reorderFiling,
  loadAllOwnerNotes,
  loadAllOwnerPlacements,
  loadAllOwnerFoldersSharded,
  loadAllOwnerNotesSharded,
  loadAllOwnerPlacementsSharded,
  ownerFolderTreePagedSharded,
} = await import(toDataUrl(journeyMapServiceSource));

// Two cheap positive controls: the loaders really did load the real modules,
// not an accidental no-op. noteFoundationDocId() is pure and needs no
// Firestore; the journey-map-service exports are asserted to be real
// functions (every one of them is async and needs a live db to prove
// anything more, which the cases below do).
assert.equal(noteFoundationDocId("tenant", "note"), "tenant__note",
  "the loaded note-foundation.js module does not behave like the real one -- the loader is broken");
for (const [name, fn] of Object.entries({
  folderContents, noteFilings, ownerFolderTree, moveNoteToFolder,
  renameFolder, reorderFolder, moveFolder, retireFolder, reorderFiling,
  loadAllOwnerNotes, loadAllOwnerPlacements,
  loadAllOwnerFoldersSharded, loadAllOwnerNotesSharded, loadAllOwnerPlacementsSharded, ownerFolderTreePagedSharded,
})) {
  assert.equal(typeof fn, "function", `the loaded journey-map-service.js module is missing ${name} -- the loader is broken`);
}

const T = "t1", T2 = "t2";
const nk = (tenantId, entityId) => `${tenantId}__${entityId}`;

test("real journey-map-service.js / note-foundation.js functions against the real deployed Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-pX`), { roles: ["self"], personId: "pX" });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const pX = env.authenticatedContext("uid-pX").firestore();

    let n = 0;
    const seen = new Set(["SAFE-01"]);
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => {
      let err = null;
      try { await p; } catch (e) { err = e; }
      assert.ok(err, `${id} ${name}: expected a denial, but the call succeeded`);
      const msg = String(err.message ?? err);
      assert.ok(!/maximum of 1000 expressions/.test(msg),
        `${id} ${name}: denied by EXPRESSION BUDGET, not by the security logic`);
      const entries = msg.match(/evaluation error at L\d+:\d+|false for '\w+'/g) ?? [];
      assert.ok(entries.length === 0 || /^false for '\w+'/.test(entries.at(-1)),
        `${id} ${name}: the deciding evaluation was not a clean false -- ${entries.at(-1)}`);
      n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`);
    };

    // KNOWN_LIVE_DEFECT -- names any case below that is genuinely refused by
    // the real deployed Rules where this suite expected it to succeed. Empty
    // means every case ran as expected. If this is non-empty, do NOT change
    // app/js/** or any .rules file -- report it; the Architect fixes app code
    // (see #242's own precedent, the Notes-could-never-save defect).
    const KNOWN_LIVE_DEFECT = [];

    // --- Folders -------------------------------------------------------------

    // FOLDER-CREATE-ROOT-REAL: a root user folder, the way journey-map.html's
    // own "+ New folder" affordance creates one.
    const rootFolderId = "folder-root-0001";
    const createRootPromise = createNoteFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      name: "Tafsir Journal", folderId: rootFolderId, actorUid: "uid-p1",
    });
    await ok("FOLDER-CREATE-ROOT-REAL", "createNoteFolder() creates a root user folder for the owner", createRootPromise);
    assert.equal(await createRootPromise, rootFolderId);
    const rootSnap = await getDoc(doc(p1, "noteFolders", nk(T, rootFolderId)));
    assert.ok(rootSnap.exists(), "the created root folder did not persist");
    assert.equal(rootSnap.data().name, "Tafsir Journal");
    assert.equal(rootSnap.data().parentFolderId, null);
    assert.equal(rootSnap.data().semanticRole, "user");

    // FOLDER-CREATE-CHILD-REAL: a folder naming a real parent.
    const childFolderId = "folder-child-0001";
    const createChildPromise = createNoteFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      name: "Surah Al-Baqarah", parentFolderId: rootFolderId, folderId: childFolderId, actorUid: "uid-p1",
    });
    await ok("FOLDER-CREATE-CHILD-REAL", "createNoteFolder() creates a folder naming a real parent", createChildPromise);
    const childSnap = await getDoc(doc(p1, "noteFolders", nk(T, childFolderId)));
    assert.equal(childSnap.data().parentFolderId, rootFolderId);

    // FOLDER-CREATE-SYSTEM-*-REAL: the two system folders, created exactly
    // the way app/journey-map.html's own ensureRealFolder() does -- on first
    // genuine need (filing a Note into one), never pre-seeded.
    const journeyMapFolderId = "folder-sys-journey-map";
    await ok("FOLDER-CREATE-SYSTEM-JOURNEY-MAP-REAL", "createNoteFolder() creates the journey-map system folder", createNoteFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      name: "Personal Journey Map", semanticRole: "journey-map",
      order: 0, folderId: journeyMapFolderId, actorUid: "uid-p1",
    }));

    const reflectionArchiveFolderId = "folder-sys-reflection-archive";
    await ok("FOLDER-CREATE-SYSTEM-REFLECTION-ARCHIVE-REAL", "createNoteFolder() creates the reflection-archive system folder", createNoteFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      name: "Reflection Archive", semanticRole: "reflection-archive",
      order: 1, folderId: reflectionArchiveFolderId, actorUid: "uid-p1",
    }));
    const sysSnap = await getDoc(doc(p1, "noteFolders", nk(T, reflectionArchiveFolderId)));
    assert.equal(sysSnap.data().semanticRole, "reflection-archive");
    assert.equal(sysSnap.data().parentFolderId, null);

    // FOLDER-RENAME-REAL
    const renamePromise = renameFolder(p1, { tenantId: T, ownerPersonId: "p1", folderId: rootFolderId, name: "Tafsir Journal (renamed)", actorUid: "uid-p1" });
    await ok("FOLDER-RENAME-REAL", "renameFolder() renames the owner's own folder", renamePromise);
    const renamedSnap = await getDoc(doc(p1, "noteFolders", nk(T, rootFolderId)));
    assert.equal(renamedSnap.data().name, "Tafsir Journal (renamed)");

    // FOLDER-REORDER-REAL
    const reorderFolderPromise = reorderFolder(p1, { tenantId: T, ownerPersonId: "p1", folderId: childFolderId, order: 7, actorUid: "uid-p1" });
    await ok("FOLDER-REORDER-REAL", "reorderFolder() changes the owner's own folder order", reorderFolderPromise);
    const reorderedSnap = await getDoc(doc(p1, "noteFolders", nk(T, childFolderId)));
    assert.equal(reorderedSnap.data().order, 7);

    // FOLDER-MOVE-REAL: re-parent the child folder onto a second root.
    const secondRootFolderId = "folder-root-0002";
    await ok("FOLDER-CREATE-SECOND-ROOT-REAL", "a second root folder to move the child under", createNoteFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      name: "Second Root", folderId: secondRootFolderId, actorUid: "uid-p1",
    }));
    const movePromise = moveFolder(p1, { tenantId: T, ownerPersonId: "p1", folderId: childFolderId, parentFolderId: secondRootFolderId, actorUid: "uid-p1" });
    await ok("FOLDER-MOVE-REAL", "moveFolder() re-parents the owner's own folder", movePromise);
    const movedSnap = await getDoc(doc(p1, "noteFolders", nk(T, childFolderId)));
    assert.equal(movedSnap.data().parentFolderId, secondRootFolderId);

    // FOLDER-RETIRE-REAL: retire the (childless) moved folder.
    // retireNoteFolder() refuses a folder that still has active children, so
    // this retires the leaf rather than the folder that now holds it.
    const retireFolderPromise = retireFolder(p1, { tenantId: T, ownerPersonId: "p1", folderId: childFolderId, actorUid: "uid-p1" });
    await ok("FOLDER-RETIRE-REAL", "retireFolder() retires the owner's own (childless) folder", retireFolderPromise);
    const retiredFolderSnap = await getDoc(doc(p1, "noteFolders", nk(T, childFolderId)));
    assert.equal(retiredFolderSnap.data().status, "retired");

    // --- Notes and placements -------------------------------------------------

    // NOTE-CREATE-REAL: a Note to file below.
    const noteId = "note-0001";
    await ok("NOTE-CREATE-REAL", "createPermanentNote() creates the Note filed below", createPermanentNote(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      title: "A reflection", bodyHtml: "<p>Filed into Mapping My Journey</p>",
      noteId, revisionId: "revision-0001", actorUid: "uid-p1",
    }));

    // PLACEMENT-CREATE-REAL: file the Note into the second root folder.
    const placementId = "placement-0001";
    const createPlacementPromise = createNotePlacement(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      noteId, folderId: secondRootFolderId, order: 0, placementId, actorUid: "uid-p1",
    });
    await ok("PLACEMENT-CREATE-REAL", "createNotePlacement() files the Note into a folder", createPlacementPromise);
    const placementSnap = await getDoc(doc(p1, "notePlacements", nk(T, placementId)));
    assert.equal(placementSnap.data().folderId, secondRootFolderId);
    assert.equal(placementSnap.data().noteId, noteId);

    // PLACEMENT-REORDER-REAL
    const reorderPlacementPromise = reorderFiling(p1, { tenantId: T, ownerPersonId: "p1", placementId, order: 3, actorUid: "uid-p1" });
    await ok("PLACEMENT-REORDER-REAL", "reorderFiling() changes the placement's position within its folder", reorderPlacementPromise);
    const reorderedPlacementSnap = await getDoc(doc(p1, "notePlacements", nk(T, placementId)));
    assert.equal(reorderedPlacementSnap.data().order, 3);

    // PLACEMENT-MOVE-REAL: ADR-010 §5's retire-and-create, via
    // journey-map-service.js's own moveNoteToFolder() wrapper (which itself
    // calls note-foundation.js's moveNotePlacement()).
    const movePlacementPromise = moveNoteToFolder(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      noteId, fromPlacementId: placementId, toFolderId: rootFolderId, order: 0, actorUid: "uid-p1",
    });
    await ok("PLACEMENT-MOVE-REAL", "moveNoteToFolder() moves the Note to another folder as retire-and-create", movePlacementPromise);
    const newPlacementId = await movePlacementPromise;
    assert.notEqual(newPlacementId, placementId, "a move must mint a fresh placement id, never reuse the one it retired");
    const oldPlacementSnap = await getDoc(doc(p1, "notePlacements", nk(T, placementId)));
    assert.equal(oldPlacementSnap.data().status, "retired");
    const newPlacementSnap = await getDoc(doc(p1, "notePlacements", nk(T, newPlacementId)));
    assert.equal(newPlacementSnap.data().status, "active");
    assert.equal(newPlacementSnap.data().folderId, rootFolderId);

    // PLACEMENT-RETIRE-REAL: note-foundation.js's own retireNotePlacement(),
    // called directly -- journey-map-service.js carries no wrapper for it and
    // app/journey-map.html never calls it (a move is the only way that page
    // removes a Note from a folder), but it is a real exported function this
    // proof must still cover.
    const retirePlacementPromise = retireNotePlacement(p1, { tenantId: T, placementId: newPlacementId, actorUid: "uid-p1" });
    await ok("PLACEMENT-RETIRE-REAL", "retireNotePlacement() retires a placement outright", retirePlacementPromise);
    const retiredPlacementSnap = await getDoc(doc(p1, "notePlacements", nk(T, newPlacementId)));
    assert.equal(retiredPlacementSnap.data().status, "retired");

    // --- Reads -----------------------------------------------------------------
    // A second Note/placement so every read below has something live to
    // return, independent of everything retired above.
    const secondNoteId = "note-0002";
    await ok("NOTE-CREATE-2-REAL", "a second Note to exercise the reads below", createPermanentNote(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      title: "A second reflection", bodyHtml: "<p>Also filed</p>",
      noteId: secondNoteId, revisionId: "revision-0002", actorUid: "uid-p1",
    }));
    const livePlacementId = "placement-0002";
    await ok("PLACEMENT-CREATE-2-REAL", "a live placement for the reads below", createNotePlacement(p1, {
      tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
      noteId: secondNoteId, folderId: rootFolderId, order: 0, placementId: livePlacementId, actorUid: "uid-p1",
    }));

    // READ-LIST-FOLDERS-REAL
    const listFoldersPromise = listNoteFoldersForOwner(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("READ-LIST-FOLDERS-REAL", "listNoteFoldersForOwner() returns the owner's own active folders", listFoldersPromise);
    const folders = await listFoldersPromise;
    const folderIds = folders.map((f) => f.folderId);
    assert.ok(folderIds.includes(rootFolderId));
    assert.ok(folderIds.includes(secondRootFolderId));
    assert.ok(folderIds.includes(journeyMapFolderId));
    assert.ok(!folderIds.includes(childFolderId), "a retired folder must not appear in the active list");

    // READ-LIST-PLACEMENTS-FOR-FOLDER-REAL
    const listPlacementsForFolderPromise = listNotePlacementsForFolder(p1, { tenantId: T, ownerPersonId: "p1", folderId: rootFolderId });
    await ok("READ-LIST-PLACEMENTS-FOR-FOLDER-REAL", "listNotePlacementsForFolder() returns what is really filed in the folder", listPlacementsForFolderPromise);
    const placementsInRoot = await listPlacementsForFolderPromise;
    assert.ok(placementsInRoot.some((row) => row.placementId === livePlacementId));
    assert.ok(!placementsInRoot.some((row) => row.placementId === newPlacementId),
      "a retired placement must not appear in the active list");

    // READ-LIST-PLACEMENTS-FOR-NOTE-REAL
    const listPlacementsForNotePromise = listNotePlacementsForNote(p1, { tenantId: T, ownerPersonId: "p1", noteId: secondNoteId });
    await ok("READ-LIST-PLACEMENTS-FOR-NOTE-REAL", "listNotePlacementsForNote() returns every folder holding the Note", listPlacementsForNotePromise);
    const placementsForSecondNote = await listPlacementsForNotePromise;
    assert.equal(placementsForSecondNote.length, 1);
    assert.equal(placementsForSecondNote[0].folderId, rootFolderId);

    // READ-FOLDER-CONTENTS-REAL
    const folderContentsPromise = folderContents(p1, { tenantId: T, ownerPersonId: "p1", folderId: rootFolderId });
    await ok("READ-FOLDER-CONTENTS-REAL", "folderContents() resolves the Note behind the placement", folderContentsPromise);
    const contents = await folderContentsPromise;
    assert.ok(contents.rows.some((row) => row.note?.noteId === secondNoteId));

    // READ-NOTE-FILINGS-REAL
    const noteFilingsPromise = noteFilings(p1, { tenantId: T, ownerPersonId: "p1", noteId: secondNoteId });
    await ok("READ-NOTE-FILINGS-REAL", "noteFilings() resolves the folder behind the placement", noteFilingsPromise);
    const filings = await noteFilingsPromise;
    assert.ok(filings.rows.some((row) => row.folder?.folderId === rootFolderId));

    // READ-OWNER-FOLDER-TREE-REAL
    const folderTreePromise = ownerFolderTree(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("READ-OWNER-FOLDER-TREE-REAL", "ownerFolderTree() walks the owner's own folders safely", folderTreePromise);
    const tree = await folderTreePromise;
    const rootIds = tree.roots.map((f) => f.folderId);
    assert.ok(rootIds.includes(rootFolderId));
    assert.ok(rootIds.includes(secondRootFolderId));
    assert.equal(tree.cyclic.length, 0);

    // --- Denials ---------------------------------------------------------------

    // ISO-FOLDER-REAL: pX belongs to T2. Naming T here is refused by the
    // Rules' own personInTenant() check inside isNoteOwner() --
    // createNoteFolder()'s own JS-level validation (journeyFolder()) checks
    // shape only, never tenant membership, and no parent is named here so no
    // pre-read happens either -- so this denial can only come from the Rules
    // layer's own create rule.
    await no("ISO-FOLDER-REAL", "a cross-tenant createNoteFolder() is refused", createNoteFolder(pX, {
      tenantId: T, ownerPersonId: "pX", ownerUid: "uid-pX",
      name: "Should be refused", folderId: "folder-should-not-exist", actorUid: "uid-pX",
    }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "noteFolders", nk(T, "folder-should-not-exist")));
      assert.ok(!snap.exists(), "a refused cross-tenant folder create must not have written anything");
    });

    // ISO-PLACEMENT-REAL: createNotePlacement() pre-reads the named Note and
    // Folder INSIDE its own transaction before ever attempting the write, and
    // pX has no read authority at all over p1's Note or folder
    // (canReadNoteOf() requires self/guardian/co-enrolled-teacher/owner/
    // prime) -- so the pre-read itself is refused, before the create rule is
    // ever reached. A real, end-to-end refusal through the real function.
    await no("ISO-PLACEMENT-REAL", "a cross-tenant createNotePlacement() is refused", createNotePlacement(pX, {
      tenantId: T, ownerPersonId: "pX", ownerUid: "uid-pX",
      noteId: secondNoteId, folderId: rootFolderId, placementId: "placement-should-not-exist", actorUid: "uid-pX",
    }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "notePlacements", nk(T, "placement-should-not-exist")));
      assert.ok(!snap.exists(), "a refused cross-tenant placement create must not have written anything");
    });

    // PEER-RENAME-REAL: p2 is a real person in T, but is not p1 and is
    // nobody's guardian, co-enrolled teacher, owner or prime. renameFolder()
    // pre-reads the named folder inside its own transaction; canReadNoteOf(T,
    // "p1") is false for p2, so that pre-read is refused before the update
    // rule is ever reached.
    await no("PEER-RENAME-REAL", "a co-tenant peer cannot rename p1's folder", renameFolder(p2, {
      tenantId: T, ownerPersonId: "p1", folderId: rootFolderId, name: "Hijacked", actorUid: "uid-p2",
    }));
    const unrenamedSnap = await getDoc(doc(p1, "noteFolders", nk(T, rootFolderId)));
    assert.equal(unrenamedSnap.data().name, "Tafsir Journal (renamed)", "a refused rename must leave the folder exactly where it was");

    // PEER-MOVE-REAL: reparentNoteFolder() must first LIST the owner's own
    // folder set to judge the tree -- canReadNoteOf(T, "p1") is false for p2,
    // so the list itself is refused before any write is attempted.
    await no("PEER-MOVE-REAL", "a co-tenant peer cannot move p1's folder", moveFolder(p2, {
      tenantId: T, ownerPersonId: "p1", folderId: secondRootFolderId, parentFolderId: rootFolderId, actorUid: "uid-p2",
    }));
    const unmovedSnap = await getDoc(doc(p1, "noteFolders", nk(T, secondRootFolderId)));
    assert.equal(unmovedSnap.data().parentFolderId, null, "a refused move must leave the folder exactly where it was");

    // --- Issue #259: paging -----------------------------------------------
    // Two real limits existed before this round: listNotesForOwner() capped
    // at 100 (an owner with more Notes never saw the rest, in any view), and
    // each folder showed at most 99 filed Notes. The fix is paging, never a
    // bigger limit() -- the deployed Rules' listIsBounded() refuses any list
    // request above 100 regardless. These seed straight past the app's own
    // writers (setDoc with security rules disabled) purely to get 250 real
    // documents in place fast; the WRITE path for a Note/placement is
    // already proven above, through the real functions, against the real
    // Rules -- what is new here is the READ side's paging loop.
    const PAGED_NOTE_COUNT = 250;
    const PAGED_PLACEMENT_COUNT = 250;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const base = Date.now();
      const writes = [];
      for (let i = 0; i < PAGED_NOTE_COUNT; i += 1) {
        writes.push(setDoc(doc(db, "notes", nk(T, `paged-note-${i}`)), {
          noteId: `paged-note-${i}`, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
          visibility: "private", title: `Paged ${i}`, bodyHtml: "", status: "active",
          currentRevisionId: "rev", updatedAt: new Date(base + i * 1000),
        }));
      }
      for (let i = 0; i < PAGED_PLACEMENT_COUNT; i += 1) {
        writes.push(setDoc(doc(db, "notePlacements", nk(T, `paged-placement-${i}`)), {
          placementId: `paged-placement-${i}`, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
          noteId: "paged-note-0", folderId: rootFolderId, order: i, status: "active",
        }));
      }
      await Promise.all(writes);
    });

    // PAGED-NOTES-ALL-REAL: loadAllOwnerNotes() loops until every one of the
    // 250 seeded Notes has come back, three pages of <=100 (the deployed
    // cap), never one big request.
    const pagedNotesPromise = loadAllOwnerNotes(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("PAGED-NOTES-ALL-REAL", "loadAllOwnerNotes() returns all 250 seeded Notes across pages, against the real deployed Rules", pagedNotesPromise);
    const pagedNotes = await pagedNotesPromise;
    assert.equal(pagedNotes.truncated, false);
    assert.equal(pagedNotes.rows.filter((r) => r.noteId.startsWith("paged-note-")).length, PAGED_NOTE_COUNT,
      "expected every one of the 250 seeded Notes back, not a subset capped at 100");

    // PAGED-PLACEMENTS-ALL-REAL: the placement-side twin -- equality-only,
    // no orderBy, so no new composite index, and still every one of the 250
    // comes back.
    const pagedPlacementsPromise = loadAllOwnerPlacements(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("PAGED-PLACEMENTS-ALL-REAL", "loadAllOwnerPlacements() returns all 250 seeded placements across pages, against the real deployed Rules", pagedPlacementsPromise);
    const pagedPlacements = await pagedPlacementsPromise;
    assert.equal(pagedPlacements.truncated, false);
    assert.equal(pagedPlacements.rows.filter((r) => r.placementId.startsWith("paged-placement-")).length, PAGED_PLACEMENT_COUNT,
      "expected every one of the 250 seeded placements back, not a subset capped at 100");

    // --- Issue #282 (speed, part 5): the SHARDED parallel loaders ----------
    // The same proof shape as PAGED-NOTES-ALL-REAL/PAGED-PLACEMENTS-ALL-REAL
    // above, extended to journey-map-service.js's own sharded loaders and to
    // FOLDERS too (never proven end-to-end before this round). Seeded with
    // REAL import-shaped ids (stableImportId(), the same function the
    // WordPress/Evernote importers call in production) rather than the
    // "paged-note-N" plain ids above, specifically so this run exercises the
    // real leading-character clustering journey-map-shard.js exists to
    // split -- a synthetic evenly-spread id would prove far less.
    const SHARD_PROOF_COUNT = 300;
    const shardProofNoteIds = Array.from({ length: SHARD_PROOF_COUNT },
      (_, i) => stableImportId("wordpress-import", "note", String(i)));
    const shardProofFolderIds = Array.from({ length: SHARD_PROOF_COUNT },
      (_, i) => stableImportId("wordpress-import", "folder", String(i)));
    const shardProofPlacementIds = shardProofNoteIds.map((noteId, i) =>
      stableImportId("wordpress-import", "placement", `${noteId}|${shardProofFolderIds[i]}`));
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const writes = [];
      for (let i = 0; i < SHARD_PROOF_COUNT; i += 1) {
        writes.push(setDoc(doc(db, "noteFolders", nk(T, shardProofFolderIds[i])), {
          folderId: shardProofFolderIds[i], tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
          name: `Shard folder ${i}`, parentFolderId: null, semanticRole: "user", order: i, status: "active",
        }));
        writes.push(setDoc(doc(db, "notes", nk(T, shardProofNoteIds[i])), {
          noteId: shardProofNoteIds[i], tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
          visibility: "private", title: `Shard note ${i}`, bodyHtml: "", status: "active", currentRevisionId: "rev",
        }));
        writes.push(setDoc(doc(db, "notePlacements", nk(T, shardProofPlacementIds[i])), {
          placementId: shardProofPlacementIds[i], tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
          noteId: shardProofNoteIds[i], folderId: shardProofFolderIds[i], order: i, status: "active",
        }));
      }
      await Promise.all(writes);
    });

    // SHARD-FOLDERS-ALL-REAL
    const shardFoldersPromise = loadAllOwnerFoldersSharded(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("SHARD-FOLDERS-ALL-REAL", "loadAllOwnerFoldersSharded() returns every seeded import-shaped folder, across several parallel shards, against the real deployed Rules", shardFoldersPromise);
    const shardFolders = await shardFoldersPromise;
    assert.equal(shardFolders.truncated, false);
    // Architect review: earlier cases in this same run created hand-made
    // (non-imported) rows too, and the sharded loader rightly returns those as
    // well. So check the seeded imported set exactly, no id twice, and nothing lost.
    assert.equal(new Set(shardFolders.rows.map((r) => r.folderId)).size, shardFolders.rows.length, "a row came back from two shards");
    assert.deepEqual(shardFolders.rows.map((r) => r.folderId).filter((id) => id.startsWith("imp")).sort(), [...shardProofFolderIds].sort(),
      "expected exactly the 300 seeded folders back, once each -- no shard boundary may miss or duplicate one");

    // SHARD-NOTES-ALL-REAL
    const shardNotesPromise = loadAllOwnerNotesSharded(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("SHARD-NOTES-ALL-REAL", "loadAllOwnerNotesSharded() returns every seeded import-shaped Note, across several parallel shards, against the real deployed Rules", shardNotesPromise);
    const shardNotes = await shardNotesPromise;
    assert.equal(shardNotes.truncated, false);
    // Architect review: earlier cases in this same run created hand-made
    // (non-imported) rows too, and the sharded loader rightly returns those as
    // well. So check the seeded imported set exactly, no id twice, and nothing lost.
    assert.equal(new Set(shardNotes.rows.map((r) => r.noteId)).size, shardNotes.rows.length, "a row came back from two shards");
    assert.deepEqual(shardNotes.rows.map((r) => r.noteId).filter((id) => id.startsWith("imp")).sort(), [...shardProofNoteIds].sort());

    // SHARD-PLACEMENTS-ALL-REAL
    const shardPlacementsPromise = loadAllOwnerPlacementsSharded(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("SHARD-PLACEMENTS-ALL-REAL", "loadAllOwnerPlacementsSharded() returns every seeded import-shaped placement, across several parallel shards, against the real deployed Rules", shardPlacementsPromise);
    const shardPlacements = await shardPlacementsPromise;
    assert.equal(shardPlacements.truncated, false);
    // Architect review: earlier cases in this same run created hand-made
    // (non-imported) rows too, and the sharded loader rightly returns those as
    // well. So check the seeded imported set exactly, no id twice, and nothing lost.
    assert.equal(new Set(shardPlacements.rows.map((r) => r.placementId)).size, shardPlacements.rows.length, "a row came back from two shards");
    assert.deepEqual(shardPlacements.rows.map((r) => r.placementId).filter((id) => id.startsWith("imp")).sort(), [...shardProofPlacementIds].sort());

    // SHARD-FOLDER-TREE-REAL: the tree built from the sharded folder read
    // still walks safely (every seeded folder is a root, none cyclic).
    const shardTreePromise = ownerFolderTreePagedSharded(p1, { tenantId: T, ownerPersonId: "p1" });
    await ok("SHARD-FOLDER-TREE-REAL", "ownerFolderTreePagedSharded() walks the sharded folder read safely", shardTreePromise);
    const shardTree = await shardTreePromise;
    // A SUBSET check, deliberately, rather than an exact root count: this
    // suite already creates several of its own root folders earlier (the two
    // system folders, rootFolderId, secondRootFolderId), and asserting a
    // hand-counted exact total would silently go stale the moment an earlier
    // case in this same file adds or retires one. What matters here is that
    // every one of THIS block's 300 seeded folders reads back as a root,
    // undropped and undupped by the shard split.
    const shardTreeRootIds = shardTree.roots.map((f) => f.folderId);
    assert.deepEqual([...shardProofFolderIds].sort().filter((id) => !shardTreeRootIds.includes(id)), [],
      "a seeded shard-proof folder is missing from the walked tree's roots");
    assert.equal(shardTree.cyclic.length, 0);

    // ISO-SHARD-REAL: pX (tenant T2) has no read authority over p1's data at
    // all -- each sharded loader's OWN underlying page reader must be
    // refused by the real Rules for every shard, not just the first.
    await no("ISO-SHARD-NOTES-REAL", "a cross-tenant loadAllOwnerNotesSharded() is refused", loadAllOwnerNotesSharded(pX, {
      tenantId: T, ownerPersonId: "p1",
    }));

    // ISO-PAGED-PLACEMENTS-REAL: pX (tenant T2) has no read authority over
    // p1's placements at all -- the single-page reader itself must be
    // refused by the real Rules, the same isolation shape as
    // ISO-FOLDER-REAL/ISO-PLACEMENT-REAL above.
    await no("ISO-PAGED-PLACEMENTS-REAL", "a cross-tenant listNotePlacementsForOwnerPage() is refused", listNotePlacementsForOwnerPage(pX, {
      tenantId: T, ownerPersonId: "p1", pageSize: 10,
    }));

    // PAGE-SIZE-CAP-REAL: pageSize above the deployed listIsBounded() cap
    // must throw BEFORE any request reaches the database -- proven here by
    // asking for a page against a person pX has no authority to read at
    // all; if the throw happened after a request were made, this would come
    // back as a Rules denial (a rejected promise for the WRONG reason)
    // rather than the synchronous RangeError note-foundation.js itself
    // raises.
    let capError = null;
    try {
      await listNotePlacementsForOwnerPage(pX, { tenantId: T, ownerPersonId: "p1", pageSize: 101 });
    } catch (e) { capError = e; }
    assert.ok(capError instanceof RangeError, "pageSize: 101 must throw a RangeError, not reach the database at all");
    n++; seen.add("PAGE-SIZE-CAP-REAL"); console.log("  PASS  PAGE-SIZE-CAP-REAL  pageSize above 100 throws before any request is made");

    if (KNOWN_LIVE_DEFECT.length > 0) {
      console.log(`\n!!!! KNOWN_LIVE_DEFECT: ${KNOWN_LIVE_DEFECT.join("; ")}`);
    }
    console.log(`\n==== journey-map-real-function: ${n} assertions through the REAL functions against the REAL deployed Rules ====`);
  } finally {
    await env.cleanup();
  }
});
