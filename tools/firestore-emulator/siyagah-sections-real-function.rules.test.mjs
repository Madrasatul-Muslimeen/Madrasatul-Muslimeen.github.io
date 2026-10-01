// Siyagah round 7a (issue #458) -- the REAL section and folder-look writers in
// app/js/note-foundation.js and app/js/journey-map-service.js, run against the
// REAL emulator on the round 7 Rules DEPLOYMENT CANDIDATE. The rules-only suite
// (siyagah-round7.rules.test.mjs) proves the Rules; rules-authorisation-
// executable.mjs proves field sets statically; only this proves the actual
// payloads the app sends are accepted. Loader copied from
// journey-map-real-function.rules.test.mjs, unchanged.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-siyagah-sections-real-function";
const HOST = "127.0.0.1";
const PORT = 8107;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

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
  const pattern = new RegExp(`from "${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"); // global: note-foundation.js imports ./envelope.js on two lines (#434)
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

const { createNoteFolder, noteFoundationDocId } = await import(noteFoundationDataUrl);
let journeyMapServiceSource = fs.readFileSync(path.join(root, "app/js/journey-map-service.js"), "utf8");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./note-foundation.js", noteFoundationDataUrl, "journey-map-service.js");
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-contract.js", realFileUrl("journey-map-contract.js"), "journey-map-service.js");
// Issue #282 -- journey-map-service.js's own sharded loaders import the
// (pure, no imports of its own) id-range splitter directly.
journeyMapServiceSource = rewriteSpecifier(journeyMapServiceSource, "./journey-map-shard.js", realFileUrl("journey-map-shard.js"), "journey-map-service.js");

const {
  moveFolder, loadAllOwnerSections, setFolderLook, setFolderSection, createSection,
  renameSection, reorderSection, setSectionLook, trashSection, restoreSection,
} = await import(toDataUrl(journeyMapServiceSource));
assert.equal(noteFoundationDocId("tenant", "x"), "tenant__x", "the loader is broken");
for (const [name, fn] of Object.entries({ moveFolder, loadAllOwnerSections, setFolderLook, setFolderSection, createSection, renameSection, reorderSection, setSectionLook, trashSection, restoreSection })) {
  assert.equal(typeof fn, "function", `journey-map-service.js is missing ${name} -- the loader is broken`);
}

const T = "t1";
const nk = (t, id) => `${t}__${id}`;

test("real section and folder-look writers against the round 7 candidate Rules", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const admin = async (c, id) => { let d; await env.withSecurityRulesDisabled(async (ctx) => { d = (await getDoc(doc(ctx.firestore(), c, nk(T, id)))).data(); }); return d; };
    const me = { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p1" };
    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => { let err = null; try { await p; } catch (e) { err = e; } assert.ok(err, `${id} ${name}: expected a refusal`); n++; console.log(`  PASS  ${id}  ${name}`); };
    const fact = (id, name, cond, detail = "") => { assert.ok(cond, `${id} ${name} ${detail}`); n++; console.log(`  PASS  ${id}  ${name}`); };

    const A = await createNoteFolder(p1, { ...me, ownerUid: "uid-p1", name: "Aqidah" });
    const B = await createNoteFolder(p1, { ...me, ownerUid: "uid-p1", name: "Fiqh" });
    const X = await createNoteFolder(p1, { ...me, ownerUid: "uid-p1", name: "Taharah", parentFolderId: B });

    let S;
    await ok("RF-01", "createSection writes a section the Rules accept", (async () => { S = await createSection(p1, { ...me, ownerUid: "uid-p1", name: "Work", order: 1 }); })());
    fact("RF-01b", "...and it is stored active", (await admin("noteSections", S)).status === "active");
    await ok("RF-02", "renameSection", renameSection(p1, { ...me, sectionId: S, name: "Study" }));
    await ok("RF-03", "reorderSection", reorderSection(p1, { ...me, sectionId: S, order: 4 }));
    await ok("RF-04", "setSectionLook (colour + bold)", setSectionLook(p1, { ...me, sectionId: S, color: "#2E86C1", bold: true }));
    await ok("RF-05", "setFolderLook (colour + bold)", setFolderLook(p1, { ...me, folderId: A, color: "#C0392B", bold: true }));
    fact("RF-05b", "...stored", (await admin("noteFolders", A)).color === "#C0392B" && (await admin("noteFolders", A)).bold === true);
    await ok("RF-06", "setFolderLook back to None", setFolderLook(p1, { ...me, folderId: A, color: null, bold: false }));
    await ok("RF-07", "setFolderSection files a root folder", setFolderSection(p1, { ...me, folderId: A, sectionId: S }));
    await ok("RF-07b", "...and a second root folder", setFolderSection(p1, { ...me, folderId: B, sectionId: S }));
    await no("RF-08", "setFolderSection on a nested folder is refused", setFolderSection(p1, { ...me, folderId: X, sectionId: S }));
    await ok("RF-09", "moveFolder nests a sectioned root folder (sectionId cleared in the same write)", moveFolder(p1, { ...me, folderId: A, parentFolderId: B }));
    fact("RF-09b", "...its sectionId is now null", ((await admin("noteFolders", A)).sectionId ?? null) === null);
    await ok("RF-10", "moveFolder lifts a nested folder to the top", moveFolder(p1, { ...me, folderId: X, parentFolderId: null }));
    fact("RF-10b", "...into the section its root came from", (await admin("noteFolders", X)).sectionId === S);
    const rows = (await loadAllOwnerSections(p1, { tenantId: T, ownerPersonId: "p1", status: "active" })).rows;
    fact("RF-11", "loadAllOwnerSections reads them back", rows.length === 1 && rows[0].sectionId === S, JSON.stringify(rows));
    await ok("RF-12", "trashSection retires the section and releases its folders atomically", trashSection(p1, { ...me, sectionId: S }));
    fact("RF-12b", "...section retired", (await admin("noteSections", S)).status === "retired");
    fact("RF-12c", "...its folders are back in the unnamed block", ((await admin("noteFolders", B)).sectionId ?? null) === null && ((await admin("noteFolders", X)).sectionId ?? null) === null);
    await ok("RF-13", "restoreSection", restoreSection(p1, { ...me, sectionId: S }));
    await no("RF-14", "another person cannot file my folder", setFolderSection(p2, { tenantId: T, ownerPersonId: "p1", actorUid: "uid-p2", folderId: B, sectionId: S }));

    console.log(`\n==== Siyagah sections real-function: ${n} cases, all as expected ====`);
    assert.ok(n >= 20, `implausibly few cases: ${n}`);
  } finally { await env.cleanup(); }
});
