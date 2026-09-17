// MAP Phase 6 (P6-B) -- the CANDIDATE Mapping My Journey Rules, executed
// against the Firestore emulator. Isolated: never loads firestore.rules, never
// touches a production endpoint or project id.
//
// Every denial is paired with an allow differing in exactly ONE fact, and every
// denial asserts that its DECIDING evaluation was a clean `false` -- never an
// expression-budget refusal, which is what sank the Phase 4 Activity candidate.
//
// What this suite is really for: proving that ADR-010's distinctions are
// enforced BY THE SERVER and not merely by a client that chooses to behave.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
         collection, query, where, orderBy, limit } from "firebase/firestore";

const PROJECT = "demo-quranrevival-journey-map-v1";
const HOST = "127.0.0.1";
const PORT = 8093;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
// RULES_FILE lets this suite run against the ASSEMBLED DEPLOYMENT CANDIDATE
// -- the text that would actually be pasted into the Console -- rather than the
// isolated extract. See the Phase 5 suite for why that distinction matters.
const EXTRACT = "docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules";
const RULES_FILE = process.env.RULES_FILE || EXTRACT;
const againstDeployment = RULES_FILE !== EXTRACT;
const candidate = fs.readFileSync(path.join(root, RULES_FILE), "utf8");
const phase5 = fs.readFileSync(
  path.join(root, "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules"), "utf8");

assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");

// This candidate governs exactly the Phase 6 domain. notes/noteRevisions/
// noteSources stay with Phase 5, whose file is queued for deployment.
const blocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (againstDeployment) {
  for (const required of ["noteFolders", "notePlacements", "notes", "tenantInvites"]) {
    assert.ok(blocks.includes(required), `the deployment candidate is missing match /${required}/`);
  }
} else {
  assert.deepEqual(blocks.sort(), ["noteFolders", "notePlacements"],
    `the candidate must govern exactly the Phase 6 domain, saw: ${blocks}`);
}

// The shared helper block must not FORK. Two copies of a security model that
// drift apart is how one collection quietly gets a weaker rule than its sibling.
function helperBlock(text) {
  const from = text.indexOf("function signedIn()");
  const to = text.indexOf("}", text.indexOf("d().ownerUid is string")) + 1;
  return text.slice(from, to);
}
if (!againstDeployment) {
  assert.equal(helperBlock(candidate), helperBlock(phase5),
    "the Phase 6 helper block has drifted from the Phase 5 one");
}

const T = "t1", T2 = "t2";
const NOTE = "note0000000000000000000000000001";
const nk = (tenant, id) => `${tenant}__${id}`;
const env0 = { schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1" };

const folderDoc = (o = {}) => ({
  folderId: "fold0000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  name: "Tafsir", parentFolderId: null, semanticRole: "user", order: 0, status: "active", ...env0, ...o });
const placementDoc = (o = {}) => ({
  placementId: "plac0000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  noteId: NOTE, folderId: "fold0000000000000000000000000001", order: 0, status: "active", ...env0, ...o });
const noteDoc = (o = {}) => ({
  noteId: NOTE, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", visibility: "private",
  title: "T", bodyHtml: "<p>B</p>", status: "active", currentRevisionId: "rev1", ...env0, ...o });

test("candidate Mapping My Journey Rules: ADR-010 enforced at the server", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantPeople", "kid"), { tenantId: T, authUid: null, managedByPersonId: "g1" });
      await setDoc(doc(db, "tenantPeople", "g1"), { tenantId: T, authUid: "uid-g1" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-g1`), { roles: ["guardian"], personId: "g1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-tch`), { roles: ["teacher"], personId: "tch" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-adm`), { roles: ["owner"], personId: "adm" });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-pX`), { roles: ["self"], personId: "pX" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tch__p1`), { active: true });
      await setDoc(doc(db, "userIndex", "uid-plat"), { platformAdmin: true });

      await setDoc(doc(db, "notes", nk(T, NOTE)), noteDoc());
      await setDoc(doc(db, "notes", nk(T, "retirednote00000000000000000001")), noteDoc({
        noteId: "retirednote00000000000000000001", status: "retired" }));
      await setDoc(doc(db, "notes", nk(T, "p2note00000000000000000000000001")), noteDoc({
        noteId: "p2note00000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));

      // Folders seeded past the rules, so a rule under test is the only thing
      // deciding the case in front of it.
      await setDoc(doc(db, "noteFolders", nk(T, "fold0000000000000000000000000001")), folderDoc());
      await setDoc(doc(db, "noteFolders", nk(T, "retiredfolder00000000000000001")), folderDoc({
        folderId: "retiredfolder00000000000000001", status: "retired" }));
      await setDoc(doc(db, "noteFolders", nk(T, "sysmap00000000000000000000000001")), folderDoc({
        folderId: "sysmap00000000000000000000000001", semanticRole: "journey-map", name: "My Journey" }));
      await setDoc(doc(db, "noteFolders", nk(T, "p2folder0000000000000000000001")), folderDoc({
        folderId: "p2folder0000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" }));
      await setDoc(doc(db, "noteFolders", nk(T, "kidfolder000000000000000000001")), folderDoc({
        folderId: "kidfolder000000000000000000001", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-kid" }));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const g1 = env.authenticatedContext("uid-g1").firestore();
    const tch = env.authenticatedContext("uid-tch").firestore();
    const adm = env.authenticatedContext("uid-adm").firestore();
    const pX = env.authenticatedContext("uid-pX").firestore();
    const anon = env.unauthenticatedContext().firestore();

    let n = 0;
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${id}  ${name}`); };
    const no = async (id, name, p) => {
      let err = null;
      try { await p; } catch (e) { err = e; }
      assert.ok(err, `${id} ${name}: expected a denial, but the write succeeded`);
      const msg = String(err.message ?? err);
      assert.ok(!/maximum of 1000 expressions/.test(msg),
        `${id} ${name}: denied by EXPRESSION BUDGET, not by the security logic`);
      const entries = msg.match(/evaluation error at L\d+:\d+|false for '\w+'/g) ?? [];
      assert.ok(entries.length === 0 || /^false for '\w+'/.test(entries.at(-1)),
        `${id} ${name}: the deciding evaluation was not a clean false -- ${entries.at(-1)}`);
      n++; console.log(`  PASS  ${id}  ${name}`);
    };
    const F = (id) => doc(p1, "noteFolders", nk(T, id));
    const newFolder = (id, o = {}) => setDoc(doc(p1, "noteFolders", nk(T, id)), folderDoc({ folderId: id, ...o }));

    // --- authentication and ownership --------------------------------------
    await no("F-AUTH-01", "unauthenticated cannot create a folder",
      setDoc(doc(anon, "noteFolders", nk(T, "anon0000000000000000000000000001")), folderDoc({ folderId: "anon0000000000000000000000000001" })));
    await ok("F-OWN-01", "owner creates their own top-level folder", newFolder("mine0000000000000000000000000001"));
    await no("F-OWN-02", "another person cannot create a folder for me",
      setDoc(doc(p2, "noteFolders", nk(T, "steal000000000000000000000000001")), folderDoc({ folderId: "steal000000000000000000000000001" })));
    await no("F-OWN-03", "a GUARDIAN cannot create a folder for their managed child",
      setDoc(doc(g1, "noteFolders", nk(T, "gkid0000000000000000000000000001")),
        folderDoc({ folderId: "gkid0000000000000000000000000001", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-g1" })));
    await no("F-OWN-04", "a TEACHER cannot create a folder for a linked student",
      setDoc(doc(tch, "noteFolders", nk(T, "tfold000000000000000000000000001")), folderDoc({ folderId: "tfold000000000000000000000000001", createdBy: "uid-tch" })));
    await no("F-OWN-05", "an OWNER-role administrator cannot create a folder for someone else",
      setDoc(doc(adm, "noteFolders", nk(T, "afold000000000000000000000000001")), folderDoc({ folderId: "afold000000000000000000000000001", createdBy: "uid-adm" })));
    await no("F-OWN-06", "a person in ANOTHER tenant cannot write into this tenant's path",
      setDoc(doc(pX, "noteFolders", nk(T, "xfold000000000000000000000000001")),
        folderDoc({ folderId: "xfold000000000000000000000000001", ownerPersonId: "pX", ownerUid: "uid-pX", createdBy: "uid-pX" })));

    // --- shape and key binding ---------------------------------------------
    await no("F-KEY-01", "the document key must be tenantId__folderId",
      setDoc(doc(p1, "noteFolders", nk(T, "wrongkey00000000000000000000001")), folderDoc({ folderId: "otherid000000000000000000000001" })));
    await no("F-SHAPE-01", "an unknown field is refused",
      setDoc(doc(p1, "noteFolders", nk(T, "extra000000000000000000000000001")), folderDoc({ folderId: "extra000000000000000000000000001", colour: "red" })));
    await no("F-SHAPE-02", "a folder needs a name",
      setDoc(doc(p1, "noteFolders", nk(T, "noname00000000000000000000000001")), folderDoc({ folderId: "noname00000000000000000000000001", name: "" })));
    await no("F-SHAPE-03", "a folder cannot be created already retired",
      setDoc(doc(p1, "noteFolders", nk(T, "born0000000000000000000000000001")), folderDoc({ folderId: "born0000000000000000000000000001", status: "retired" })));

    // --- ADR-010 §3: the semantic role vocabulary is CLOSED at the server ---
    await ok("F-ROLE-01", "a reflection-archive folder may be created", newFolder("arch0000000000000000000000000001", { semanticRole: "reflection-archive", name: "Reflections" }));
    await no("F-ROLE-02", "a role outside the vocabulary is refused", newFolder("badrole0000000000000000000000001", { semanticRole: "archive" }));
    await no("F-ROLE-03", "a system folder cannot have a parent",
      newFolder("sysparent00000000000000000000001", { semanticRole: "journey-map", parentFolderId: "fold0000000000000000000000000001" }));
    await no("F-ROLE-04", "nothing may be filed UNDER a system folder",
      newFolder("underSys000000000000000000000001", { parentFolderId: "sysmap00000000000000000000000001" }));
    await no("F-ROLE-05", "a folder may not change what KIND of folder it is",
      updateDoc(F("fold0000000000000000000000000001"), { semanticRole: "journey-map", updatedAt: new Date() }));

    // --- ADR-010 §4: the one hop Rules CAN enforce -------------------------
    await ok("F-TREE-01", "a folder may be nested under my own active folder",
      newFolder("child000000000000000000000000001", { parentFolderId: "fold0000000000000000000000000001" }));
    await no("F-TREE-02", "a folder may not be its own parent",
      newFolder("self0000000000000000000000000001", { parentFolderId: "self0000000000000000000000000001" }));
    await no("F-TREE-03", "the parent must exist",
      newFolder("ghost000000000000000000000000001", { parentFolderId: "nosuchfolder00000000000000000001" }));
    await no("F-TREE-04", "the parent must be MINE",
      newFolder("borrow00000000000000000000000001", { parentFolderId: "p2folder0000000000000000000001" }));
    await no("F-TREE-05", "the parent must be ACTIVE",
      newFolder("undead00000000000000000000000001", { parentFolderId: "retiredfolder00000000000000001" }));

    // --- retire, never destroy ---------------------------------------------
    await ok("F-LIFE-01", "a folder may be renamed and retired", updateDoc(F("mine0000000000000000000000000001"), { name: "Renamed", status: "retired", updatedAt: new Date() }));
    await no("F-LIFE-02", "a folder may never be deleted", deleteDoc(F("fold0000000000000000000000000001")));
    await no("F-LIFE-03", "a folder may not change owner", updateDoc(F("fold0000000000000000000000000001"), { ownerPersonId: "p2", updatedAt: new Date() }));

    // --- reads --------------------------------------------------------------
    await ok("F-READ-01", "owner reads their own folder", getDoc(F("fold0000000000000000000000000001")));
    await ok("F-READ-02", "a guardian reads a managed child's folder", getDoc(doc(g1, "noteFolders", nk(T, "kidfolder000000000000000000001"))));
    await ok("F-READ-03", "a teacher reads an actively linked student's folder", getDoc(doc(tch, "noteFolders", nk(T, "fold0000000000000000000000000001"))));
    await no("F-READ-04", "another person cannot read my folder", getDoc(doc(p2, "noteFolders", nk(T, "fold0000000000000000000000000001"))));
    await ok("F-QUERY-01", "a scoped, bounded folder list is allowed", getDocs(query(collection(p1, "noteFolders"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("status", "==", "active"), limit(50))));
    await no("F-QUERY-02", "an unscoped folder list is refused", getDocs(query(collection(p1, "noteFolders"), limit(50))));
    await no("F-QUERY-03", "an unbounded folder list is refused even when scoped", getDocs(query(collection(p1, "noteFolders"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"))));

    // --- placements: ADR-010 §2, enforced STRUCTURALLY ----------------------
    const newPlacement = (id, o = {}) => setDoc(doc(p1, "notePlacements", nk(T, id)), placementDoc({ placementId: id, ...o }));
    await ok("P-OWN-01", "owner places their own Note in their own folder", newPlacement("plac0000000000000000000000000001"));
    for (const field of ["sourceKey", "sourceKind", "relationshipKind", "provenanceKind"]) {
      await no(`P-ORIGIN-${field}`, `a placement may not carry the Origin field ${field}`,
        newPlacement(`org${field.slice(0, 5)}00000000000000000000000`.slice(0, 32), { [field]: "x" }));
    }
    await no("P-END-01", "the Note must exist", newPlacement("pnonote000000000000000000000001", { noteId: "nosuchnote0000000000000000000001" }));
    await no("P-END-02", "the Note must be MINE", newPlacement("pothernote00000000000000000001", { noteId: "p2note00000000000000000000000001" }));
    await no("P-END-03", "the Note must be ACTIVE", newPlacement("pretired00000000000000000000001", { noteId: "retirednote00000000000000000001" }));
    await no("P-END-04", "the folder must exist", newPlacement("pnofolder0000000000000000000001", { folderId: "nosuchfolder00000000000000000001" }));
    await no("P-END-05", "the folder must be MINE", newPlacement("pothfolder000000000000000000001", { folderId: "p2folder0000000000000000000001" }));
    await no("P-END-06", "the folder must be ACTIVE", newPlacement("pretfolder000000000000000000001", { folderId: "retiredfolder00000000000000001" }));
    await no("P-OWN-02", "another person cannot place a Note for me",
      setDoc(doc(p2, "notePlacements", nk(T, "psteal0000000000000000000000001")), placementDoc({ placementId: "psteal0000000000000000000000001" })));

    // --- ADR-010 §5: a move is retire-and-create, never a repoint -----------
    const PL = doc(p1, "notePlacements", nk(T, "plac0000000000000000000000000001"));
    await no("P-MOVE-01", "a placement may NOT be repointed at another folder",
      updateDoc(PL, { folderId: "child000000000000000000000000001", updatedAt: new Date() }));
    await no("P-MOVE-02", "a placement may NOT be repointed at another Note",
      updateDoc(PL, { noteId: "p2note00000000000000000000000001", updatedAt: new Date() }));
    await ok("P-MOVE-03", "a placement may be RETIRED, which is half of a move",
      updateDoc(PL, { status: "retired", updatedAt: new Date() }));
    await ok("P-MOVE-04", "and the other half is a NEW placement in the new folder",
      newPlacement("plac0000000000000000000000000002", { folderId: "child000000000000000000000000001" }));
    await no("P-LIFE-01", "a placement may never be deleted", deleteDoc(PL));

    // --- P6-C: the move as ONE atomic write -------------------------------
    // moveNotePlacement() retires and creates inside a single transaction.
    // Rules evaluate every write in a batch INDEPENDENTLY, so "both halves are
    // individually allowed" is what has to be true -- and it is not obvious,
    // because the retire is an update whose identity fields are frozen.
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "notePlacements", nk(T, "atomic00000000000000000000000001")),
        placementDoc({ placementId: "atomic00000000000000000000000001" }));
    });
    const atomicMove = (fromId, toFolderId, newId) => {
      const b = writeBatch(p1);
      b.update(doc(p1, "notePlacements", nk(T, fromId)), { status: "retired", updatedAt: new Date() });
      b.set(doc(p1, "notePlacements", nk(T, newId)),
        placementDoc({ placementId: newId, folderId: toFolderId }));
      return b.commit();
    };
    await ok("P-ATOMIC-01", "retire-and-create commits as ONE batch",
      atomicMove("atomic00000000000000000000000001", "child000000000000000000000000001", "atomic00000000000000000000000002"));
    await no("P-ATOMIC-02", "a batch that REPOINTS instead of retiring is still refused", (() => {
      const b = writeBatch(p1);
      b.update(doc(p1, "notePlacements", nk(T, "atomic00000000000000000000000002")),
        { folderId: "fold0000000000000000000000000001", updatedAt: new Date() });
      return b.commit();
    })());
    await no("P-ATOMIC-03", "a batch cannot place into a folder that is not mine", (() => {
      const b = writeBatch(p1);
      b.update(doc(p1, "notePlacements", nk(T, "atomic00000000000000000000000002")), { status: "retired", updatedAt: new Date() });
      b.set(doc(p1, "notePlacements", nk(T, "atomic00000000000000000000000003")),
        placementDoc({ placementId: "atomic00000000000000000000000003", folderId: "p2folder0000000000000000000001" }));
      return b.commit();
    })());

    // --- placement reads ----------------------------------------------------
    await ok("P-READ-01", "a teacher reads an actively linked student's placement", getDoc(doc(tch, "notePlacements", nk(T, "plac0000000000000000000000000001"))));
    await no("P-READ-02", "another person cannot read my placement", getDoc(doc(p2, "notePlacements", nk(T, "plac0000000000000000000000000001"))));

    console.log(`\n==== Phase 6 Mapping My Journey candidate Rules: ${n} assertions, all as specified ====`);
  } finally {
    await env.cleanup();
  }
});
