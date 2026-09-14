// MAP Phase 6 (P6-A) -- ADR-010 Mapping My Journey foundation. Pure: no
// database, no browser, no emulator.
//
// Each locked distinction this contract exists to enforce has its own section,
// because the point of ADR-010 is not that the functions work -- it is that a
// distinction the architecture locks can FAIL A CHECK rather than merely be
// described in prose.
import assert from "node:assert/strict";
import {
  FOLDER_SEMANTIC_ROLES, MAX_FOLDER_DEPTH, SYSTEM_FOLDER_ROLES,
  folderTreeRefusal, isSystemFolderRole, journeyFolder, notePlacement, placementMove,
} from "../../app/js/journey-map-contract.js";

let passed = 0;
function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") throw new TypeError("check() is synchronous.");
  passed++; console.log(`  PASS  ${name}`);
}

const own = { tenantId: "t1", ownerPersonId: "p1" };
const folder = (o = {}) => ({ tenantId: "t1", ownerPersonId: "p1", status: "active",
  semanticRole: "user", parentFolderId: null, ...o });

// --- "Reflection Archive != Personal Journey Map" ---------------------------
check("J1 semanticRole is a closed set of exactly three", () => {
  assert.deepEqual([...FOLDER_SEMANTIC_ROLES], ["journey-map", "reflection-archive", "user"]);
  for (const role of FOLDER_SEMANTIC_ROLES) {
    assert.equal(journeyFolder({ ...own, name: "N", semanticRole: role }).semanticRole, role);
  }
  for (const bad of ["archive", "map", "System", "", null, 1]) {
    assert.throws(() => journeyFolder({ ...own, name: "N", semanticRole: bad }), /semanticRole/, String(bad));
  }
});
check("J2 the Archive and the Map are DISTINCT system roles, and 'user' is not one", () => {
  assert.deepEqual([...SYSTEM_FOLDER_ROLES], ["journey-map", "reflection-archive"]);
  assert.notEqual(SYSTEM_FOLDER_ROLES[0], SYSTEM_FOLDER_ROLES[1], "the locked distinction, in the data");
  assert.ok(isSystemFolderRole("journey-map") && isSystemFolderRole("reflection-archive"));
  assert.ok(!isSystemFolderRole("user"));
});
check("J3 a system folder cannot be nested, in either direction", () => {
  for (const role of SYSTEM_FOLDER_ROLES) {
    assert.throws(() => journeyFolder({ ...own, name: "N", semanticRole: role, parentFolderId: "f1" }),
      /cannot have a parent/, role);
  }
  // ...and nothing may be filed UNDER one either, or a drag could make the
  // Archive a part of the Map.
  for (const role of SYSTEM_FOLDER_ROLES) {
    assert.equal(folderTreeRefusal({ folders: { sys: folder({ semanticRole: role }) },
      ...own, folderId: "new", parentFolderId: "sys" }), "parent-is-system", role);
  }
});

// --- "Note Origin != Note Destination" --------------------------------------
check("J4 a placement may not carry ANY Origin field", () => {
  const base = { ...own, noteId: "n1", folderId: "f1" };
  assert.deepEqual(Object.keys(notePlacement(base)).sort(),
    ["folderId", "noteId", "order", "ownerPersonId", "tenantId"]);
  for (const field of ["sourceKey", "sourceKind", "relationshipKind", "provenanceKind"]) {
    assert.throws(() => notePlacement({ ...base, [field]: "x" }), /may not carry Origin fields/, field);
  }
});
check("J5 an Origin field is REFUSED, not silently dropped", () => {
  // Dropping it would look identical from the outside and would let a caller
  // believe it had filed something it had not.
  let thrown = null;
  try { notePlacement({ ...own, noteId: "n1", folderId: "f1", sourceKey: "ayah:2:255" }); }
  catch (err) { thrown = err; }
  assert.ok(thrown, "an Origin field must fail loudly");
  assert.match(thrown.message, /sourceKey/);
});

// --- "MMJ != a separate Notebook subsystem" ---------------------------------
check("J6 a placement holds a Note REFERENCE and no Note content", () => {
  const p = notePlacement({ ...own, noteId: "n1", folderId: "f1" });
  for (const forbidden of ["title", "bodyHtml", "revisionId", "currentRevisionId", "html"]) {
    assert.ok(!(forbidden in p), `${forbidden} would be a second copy of the Note`);
  }
});

// --- a tree is a tree (ADR-010 §4) ------------------------------------------
check("J7 a folder may not be its own parent", () => {
  assert.equal(folderTreeRefusal({ folders: {}, ...own, folderId: "a", parentFolderId: "a" }), "self-parent");
});
check("J8 a longer cycle is refused too", () => {
  const folders = { a: folder({ parentFolderId: "b" }), b: folder({ parentFolderId: "a" }) };
  assert.equal(folderTreeRefusal({ folders, ...own, folderId: "c", parentFolderId: "a" }), "cycle");
});
check("J9 a missing, foreign, or retired parent is refused, each by its own reason", () => {
  assert.equal(folderTreeRefusal({ folders: {}, ...own, folderId: "a", parentFolderId: "gone" }), "parent-missing");
  assert.equal(folderTreeRefusal({ folders: { p: folder({ ownerPersonId: "p2" }) },
    ...own, folderId: "a", parentFolderId: "p" }), "parent-not-mine");
  assert.equal(folderTreeRefusal({ folders: { p: folder({ tenantId: "t2" }) },
    ...own, folderId: "a", parentFolderId: "p" }), "parent-not-mine");
  assert.equal(folderTreeRefusal({ folders: { p: folder({ status: "retired" }) },
    ...own, folderId: "a", parentFolderId: "p" }), "parent-not-active");
});
check("J10 a refusal is a REASON, never a bare boolean -- every one has to become a sentence", () => {
  const reason = folderTreeRefusal({ folders: {}, ...own, folderId: "a", parentFolderId: "gone" });
  assert.equal(typeof reason, "string");
  assert.notEqual(reason, "");
});
check(`J11 depth is bounded at ${MAX_FOLDER_DEPTH}, counted from the root`, () => {
  // A chain root <- f1 <- f2 ... The new folder plus its parent is depth 2.
  const chain = (n) => {
    const folders = { f0: folder({ parentFolderId: null }) };
    for (let i = 1; i < n; i++) folders[`f${i}`] = folder({ parentFolderId: `f${i - 1}` });
    return folders;
  };
  const deepest = MAX_FOLDER_DEPTH - 1; // existing chain the new folder may join
  assert.equal(folderTreeRefusal({ folders: chain(deepest), ...own,
    folderId: "new", parentFolderId: `f${deepest - 1}` }), null, "the deepest legal chain is allowed");
  assert.equal(folderTreeRefusal({ folders: chain(deepest + 1), ...own,
    folderId: "new", parentFolderId: `f${deepest}` }), "too-deep", "one deeper is refused");
});
check("J12 a broken ancestor chain is refused rather than walked off the end", () => {
  const folders = { a: folder({ parentFolderId: "vanished" }) };
  assert.equal(folderTreeRefusal({ folders, ...own, folderId: "new", parentFolderId: "a" }), "ancestor-missing");
});
check("J13 a top-level folder is allowed, and null/undefined both mean top-level", () => {
  assert.equal(folderTreeRefusal({ folders: {}, ...own, folderId: "a", parentFolderId: null }), null);
  assert.equal(folderTreeRefusal({ folders: {}, ...own, folderId: "a" }), null);
});
check("J14 a Map works as well as a plain object", () => {
  const folders = new Map([["p", folder()]]);
  assert.equal(folderTreeRefusal({ folders, ...own, folderId: "a", parentFolderId: "p" }), null);
});

// --- a move is two facts (ADR-010 §5, I4) -----------------------------------
check("J15 a move RETIRES one placement and CREATES another", () => {
  const move = placementMove({
    from: { placementId: "pl1", folderId: "f1" },
    to: { ...own, noteId: "n1", folderId: "f2" },
  });
  assert.deepEqual(move.retire, { placementId: "pl1", status: "retired" });
  assert.equal(move.create.folderId, "f2");
  assert.equal(move.create.noteId, "n1");
});
check("J16 nothing in this module can rewrite a placement's folderId", () => {
  // The record that a Note was once filed elsewhere is history (I4). A move
  // that edits folderId in place destroys it, so no such shape exists here.
  const move = placementMove({ from: { placementId: "pl1", folderId: "f1" },
    to: { ...own, noteId: "n1", folderId: "f2" } });
  assert.ok(!("folderId" in move.retire), "the retirement must not carry a new folder");
  assert.ok(!("update" in move), "there is no in-place update shape");
});
check("J17 a move that does not change folder is refused", () => {
  assert.throws(() => placementMove({ from: { placementId: "pl1", folderId: "f1" },
    to: { ...own, noteId: "n1", folderId: "f1" } }), /must change folder/);
});
check("J18 a move needs the placement it is leaving", () => {
  for (const from of [undefined, null, {}, { placementId: "" }]) {
    assert.throws(() => placementMove({ from, to: { ...own, noteId: "n1", folderId: "f2" } }),
      /the placement it is leaving/);
  }
});

// --- ownership and shape ----------------------------------------------------
check("J19 a folder and a placement both require a real tenant and owner", () => {
  for (const bad of [{ tenantId: "", ownerPersonId: "p1" }, { tenantId: "t/1", ownerPersonId: "p1" },
                     { tenantId: "t1", ownerPersonId: "" }, { tenantId: "t1" }]) {
    assert.throws(() => journeyFolder({ ...bad, name: "N" }), /path-safe/);
    assert.throws(() => notePlacement({ ...bad, noteId: "n1", folderId: "f1" }), /path-safe/);
  }
});
check("J20 a folder needs a name, and both payloads are frozen", () => {
  for (const bad of ["", "   ", null, 7]) {
    assert.throws(() => journeyFolder({ ...own, name: bad }), /needs a name/, String(bad));
  }
  const f = journeyFolder({ ...own, name: "N" });
  assert.throws(() => { "use strict"; f.semanticRole = "journey-map"; }, TypeError);
  const p = notePlacement({ ...own, noteId: "n1", folderId: "f1" });
  assert.throws(() => { "use strict"; p.folderId = "other"; }, TypeError);
});

console.log(`\n${passed} passed`);
