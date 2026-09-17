// MAP Phase 5 (P5-A) -- the CANDIDATE Note Foundation Rules, executed against
// the Firestore emulator. Isolated: never loads firestore.rules, never touches
// a production endpoint or project id.
//
// Every case is tagged with its id from the ACCEPTED security matrix
// (tests/firestore/note-foundation.security-matrix.json) so the ruleset can be
// read against the design it was approved from, case by case.
//
// Every denial is paired with an allow differing in exactly ONE fact, and every
// denial asserts that its DECIDING evaluation was a clean `false` -- never an
// expression-budget refusal, which is what sank the Phase 4 Activity candidate.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
         collection, query, where, orderBy, limit } from "firebase/firestore";

const PROJECT = "demo-quranrevival-note-foundation-v1";
const HOST = "127.0.0.1";
const PORT = 8091;
const here = path.dirname(fileURLToPath(import.meta.url));
// RULES_FILE lets this same suite run against the ASSEMBLED DEPLOYMENT
// CANDIDATE -- the text that would actually be pasted into the Console --
// instead of the isolated extract. Without that, every assertion here proves
// something about a file nobody will ever deploy.
const EXTRACT = "docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules";
const RULES_FILE = process.env.RULES_FILE || EXTRACT;
const againstDeployment = RULES_FILE !== EXTRACT;
const candidate = fs.readFileSync(path.resolve(here, "../..", RULES_FILE), "utf8");
const matrix = JSON.parse(fs.readFileSync(path.resolve(here, "../../tests/firestore/note-foundation.security-matrix.json"), "utf8"));

// SAFE-01: never a production project or a non-emulator host.
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");

// The candidate must be an ISOLATED extract governing exactly the Phase 5
// domain -- noteFolders/notePlacements are Phase 6 and must stay unruled.
const blocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (againstDeployment) {
  // The deployment candidate is production PLUS the phases, so the integrity
  // guards are the opposite ones: it must carry the whole live ruleset, and it
  // must add to firestore.rules rather than replace it.
  for (const required of ["notes", "noteRevisions", "noteSources", "tenantInvites"]) {
    assert.ok(blocks.includes(required), `the deployment candidate is missing match /${required}/`);
  }
  const production = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8").split("\n");
  const missing = production.filter((line) => line.trim() && !candidate.includes(line));
  assert.deepEqual(missing, [], `the deployment candidate DROPS ${missing.length} production line(s) -- it would remove live rules`);
} else {
  assert.deepEqual(blocks.sort(), ["noteRevisions", "noteSources", "notes"],
    `the candidate must govern exactly the Phase 5 domain, saw: ${blocks}`);
  assert.ok(!/S8-class fix|match \/tenantInvites\//.test(candidate),
    "the candidate must not be a copy of the deployed production rules");
}

const T = "t1", T2 = "t2";
const NOTE = "note0000000000000000000000000001";
const REV1 = "rev00000000000000000000000000001";
const REV2 = "rev00000000000000000000000000002";
const nk = (tenant, noteId) => `${tenant}__${noteId}`;

const noteDoc = (o = {}) => ({
  noteId: NOTE, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1", visibility: "private",
  title: "T", bodyHtml: "<p>B</p>", status: "active", currentRevisionId: REV1,
  schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1", ...o });
const revDoc = (o = {}) => ({
  revisionId: REV1, noteId: NOTE, tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  previousRevisionId: null, title: "T", bodyHtml: "<p>B</p>", revisionReason: "created",
  actorUid: "uid-p1", schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1", ...o });
const srcDoc = (o = {}) => ({
  sourceLinkId: "src0000000000000000000000000001", noteId: NOTE, tenantId: T, ownerPersonId: "p1",
  ownerUid: "uid-p1", sourceKind: "quran-unit", sourceKey: "ayah:2:255", relationshipKind: "origin",
  approachId: null, provenanceKind: "study-note", status: "active",
  schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1", ...o });

/** A Note and its initial revision, committed together -- the real client path. */
function createNoteAtomically(db, { note = noteDoc(), rev = revDoc() } = {}) {
  const b = writeBatch(db);
  b.set(doc(db, "noteRevisions", nk(rev.tenantId, rev.revisionId)), rev);
  b.set(doc(db, "notes", nk(note.tenantId, note.noteId)), note);
  return b.commit();
}

test("candidate Note Foundation Rules: the accepted security matrix", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2" });
      await setDoc(doc(db, "tenantPeople", "kid"), { tenantId: T, authUid: null, managedByPersonId: "g1" });
      await setDoc(doc(db, "tenantPeople", "kid2"), { tenantId: T, authUid: null, managedByPersonId: "g9" });
      await setDoc(doc(db, "tenantPeople", "g1"), { tenantId: T, authUid: "uid-g1" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-g1`), { roles: ["guardian"], personId: "g1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-tch`), { roles: ["teacher"], personId: "tch" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-adm`), { roles: ["owner"], personId: "adm" });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-adm2`), { roles: ["owner"], personId: "adm2" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tch__p1`), { active: true });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tch__p2`), { active: false });
      await setDoc(doc(db, "userIndex", "uid-plat"), { platformAdmin: true });
      // A managed child's Note, seeded past the rules so guardian reads have a target.
      await setDoc(doc(db, "notes", nk(T, "kidnote0000000000000000000000001")),
        noteDoc({ noteId: "kidnote0000000000000000000000001", ownerPersonId: "kid", ownerUid: null }));
      await setDoc(doc(db, "notes", nk(T, "kid2note000000000000000000000001")),
        noteDoc({ noteId: "kid2note000000000000000000000001", ownerPersonId: "kid2", ownerUid: null }));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const g1 = env.authenticatedContext("uid-g1").firestore();
    const tch = env.authenticatedContext("uid-tch").firestore();
    const adm = env.authenticatedContext("uid-adm").firestore();
    const adm2 = env.authenticatedContext("uid-adm2").firestore();
    const plat = env.authenticatedContext("uid-plat").firestore();
    const anon = env.unauthenticatedContext().firestore();

    let n = 0;
    const seen = new Set(["SAFE-01"]); // asserted at module load: demo project, 127.0.0.1 only
    const ok = async (id, name, p) => { await assertSucceeds(p); n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`); };
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
      n++; seen.add(id); console.log(`  PASS  ${id}  ${name}`);
    };

    // --- authentication ----------------------------------------------------
    await no("AUTH-01", "unauthenticated read", getDoc(doc(anon, "notes", nk(T, "kidnote0000000000000000000000001"))));
    await no("AUTH-02", "unauthenticated write", createNoteAtomically(anon));

    // --- self --------------------------------------------------------------
    await ok("SELF-02", "owner creates a Note with its initial revision", createNoteAtomically(p1));
    await ok("TXN-01", "the Note and its first revision committed together", Promise.resolve());
    await ok("SELF-01", "owner reads their own Note", getDoc(doc(p1, "notes", nk(T, NOTE))));
    await no("SELF-04", "another person cannot read it", getDoc(doc(p2, "notes", nk(T, NOTE))));
    await ok("SELF-03", "owner makes an atomic content revision", (() => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, REV2)), revDoc({ revisionId: REV2, previousRevisionId: REV1, title: "T2", revisionReason: "content-update" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { title: "T2", currentRevisionId: REV2, updatedAt: new Date() });
      return b.commit();
    })());
    await no("SELF-05", "a cross-tenant owner cannot write into this tenant", createNoteAtomically(
      env.authenticatedContext("uid-pX").firestore(),
      { note: noteDoc({ noteId: "x0000000000000000000000000000001", ownerPersonId: "pX" }),
        rev: revDoc({ revisionId: "xr000000000000000000000000000001", noteId: "x0000000000000000000000000000001", ownerPersonId: "pX" }) }));

    // --- atomicity ---------------------------------------------------------
    await no("TXN-02", "a Note pointing at a revision nobody wrote is refused", setDoc(
      doc(p1, "notes", nk(T, "ghost000000000000000000000000001")),
      noteDoc({ noteId: "ghost000000000000000000000000001", currentRevisionId: "missing00000000000000000000000001" })));
    await no("TXN-03", "a stale expected revision is refused", (() => {
      const b = writeBatch(p1);
      // chains from REV1, but the Note has already moved on to REV2
      b.set(doc(p1, "noteRevisions", nk(T, "rev00000000000000000000000000003")),
        revDoc({ revisionId: "rev00000000000000000000000000003", previousRevisionId: REV1, revisionReason: "content-update" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { currentRevisionId: "rev00000000000000000000000000003", updatedAt: new Date() });
      return b.commit();
    })());

    // --- immutability ------------------------------------------------------
    await no("IMM-01", "identity cannot be repointed at another person", updateDoc(doc(p1, "notes", nk(T, NOTE)), { ownerPersonId: "p2" }));
    await no("IMM-01b", "identity cannot be repointed at another tenant", updateDoc(doc(p1, "notes", nk(T, NOTE)), { tenantId: T2 }));
    await no("IMM-02", "a revision can never be updated", updateDoc(doc(p1, "noteRevisions", nk(T, REV1)), { title: "tampered" }));
    await no("IMM-02b", "a revision can never be deleted", deleteDoc(doc(p1, "noteRevisions", nk(T, REV1))));
    await no("IMM-03", "a Note can never be deleted by a client", deleteDoc(doc(p1, "notes", nk(T, NOTE))));
    await ok("IMM-03b", "retiring writes a status instead", (() => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "rev00000000000000000000000000009")),
        revDoc({ revisionId: "rev00000000000000000000000000009", previousRevisionId: REV2, revisionReason: "retired" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { status: "retired", currentRevisionId: "rev00000000000000000000000000009", updatedAt: new Date() });
      return b.commit();
    })());

    // --- isolating cases for checks the first mutation run left untested ----
    // A denial that some OTHER check would have produced anyway proves nothing
    // about the check you think you are testing. Each of these is a write that
    // passes every rule except the one named.
    await ok("ISO-00", "a valid revision commit on my own Note (the paired allow)", (() => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "rev0000000000000000000000000iso1")),
        revDoc({ revisionId: "rev0000000000000000000000000iso1", previousRevisionId: "rev00000000000000000000000000009", revisionReason: "content-update" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { title: "iso", currentRevisionId: "rev0000000000000000000000000iso1", updatedAt: new Date() });
      return b.commit();
    })());
    await no("ISO-01", "…the SAME commit, but repointing the owner, is refused (noteIdentityUnchanged)", (() => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "rev0000000000000000000000000iso2")),
        revDoc({ revisionId: "rev0000000000000000000000000iso2", previousRevisionId: "rev0000000000000000000000000iso1", revisionReason: "content-update" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { ownerPersonId: "p2", currentRevisionId: "rev0000000000000000000000000iso2", updatedAt: new Date() });
      return b.commit();
    })());
    await no("ISO-02", "…and changing visibility is refused too (noteIdentityUnchanged)", (() => {
      const b = writeBatch(p1);
      b.set(doc(p1, "noteRevisions", nk(T, "rev0000000000000000000000000iso3")),
        revDoc({ revisionId: "rev0000000000000000000000000iso3", previousRevisionId: "rev0000000000000000000000000iso1", revisionReason: "content-update" }));
      b.update(doc(p1, "notes", nk(T, NOTE)), { visibility: "shared", currentRevisionId: "rev0000000000000000000000000iso3", updatedAt: new Date() });
      return b.commit();
    })());
    await no("ISO-03", "a perfectly-formed Note authored FOR someone else is refused (isNoteOwner)", createNoteAtomically(p1, {
      note: noteDoc({ noteId: "iso00000000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2",
                      currentRevisionId: "isor0000000000000000000000000001" }),
      rev: revDoc({ revisionId: "isor0000000000000000000000000001", noteId: "iso00000000000000000000000000001",
                    ownerPersonId: "p2", ownerUid: "uid-p2" }) }));
    await no("ISO-04", "a Note naming a person from ANOTHER tenant is refused (personInTenant)", createNoteAtomically(
      env.authenticatedContext("uid-pX").firestore(), {
        note: noteDoc({ noteId: "iso00000000000000000000000000002", ownerPersonId: "pX", ownerUid: "uid-pX",
                        currentRevisionId: "isor0000000000000000000000000002", createdBy: "uid-pX" }),
        rev: revDoc({ revisionId: "isor0000000000000000000000000002", noteId: "iso00000000000000000000000000002",
                      ownerPersonId: "pX", ownerUid: "uid-pX", actorUid: "uid-pX", createdBy: "uid-pX" }) }));

    // Two more isolating cases. ISO-01 and ISO-03 above were still denied by
    // committedRevisionMatches rather than by the check they name -- proven by
    // mutation, where neutralising the update-path owner check and
    // noteIdentityUnchanged left the suite green. These seed a structurally
    // PERFECT next revision past the rules, so the only thing left to refuse
    // the note update is the one rule under test.
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // A valid next revision for p1's Note, chaining from where it now is.
      await setDoc(doc(db, "noteRevisions", nk(T, "rev0000000000000000000000000iso7")),
        revDoc({ revisionId: "rev0000000000000000000000000iso7", previousRevisionId: "rev0000000000000000000000000iso1", revisionReason: "content-update" }));
      // The same, but declaring p2 as owner -- so a note update that ALSO
      // repoints ownerPersonId to p2 stays internally consistent and only
      // noteIdentityUnchanged() can refuse it.
      await setDoc(doc(db, "noteRevisions", nk(T, "rev0000000000000000000000000iso8")),
        revDoc({ revisionId: "rev0000000000000000000000000iso8", previousRevisionId: "rev0000000000000000000000000iso1",
                 ownerPersonId: "p2", ownerUid: "uid-p2", revisionReason: "content-update" }));
    });
    await no("ISO-05", "repointing the owner in an otherwise PERFECT commit is refused (noteIdentityUnchanged)",
      updateDoc(doc(p1, "notes", nk(T, NOTE)), {
        ownerPersonId: "p2", ownerUid: "uid-p2",
        currentRevisionId: "rev0000000000000000000000000iso8", updatedAt: new Date() }));
    await no("ISO-06", "a TEACHER advancing a perfectly valid revision pointer is refused (isNoteOwner on update)",
      updateDoc(doc(tch, "notes", nk(T, NOTE)), {
        title: "by teacher", currentRevisionId: "rev0000000000000000000000000iso7", updatedAt: new Date() }));
    await ok("ISO-07", "…and the OWNER doing exactly the same update is allowed (the paired allow)",
      updateDoc(doc(p1, "notes", nk(T, NOTE)), {
        title: "by owner", currentRevisionId: "rev0000000000000000000000000iso7", updatedAt: new Date() }));

    // --- guardian ----------------------------------------------------------
    await ok("GUARD-01", "guardian reads a linked managed child's Note", getDoc(doc(g1, "notes", nk(T, "kidnote0000000000000000000000001"))));
    await no("GUARD-02", "guardian cannot read an unrelated child's Note", getDoc(doc(g1, "notes", nk(T, "kid2note000000000000000000000001"))));
    await no("GUARD-04", "guardian cannot edit a managed child's content", updateDoc(doc(g1, "notes", nk(T, "kidnote0000000000000000000000001")), { title: "by guardian" }));
    await no("GUARD-08", "guardian cannot create a source link on the child's Note", setDoc(
      doc(g1, "noteSources", nk(T, "gsrc000000000000000000000000001")),
      srcDoc({ sourceLinkId: "gsrc000000000000000000000000001", noteId: "kidnote0000000000000000000000001", ownerPersonId: "kid", ownerUid: null, createdBy: "uid-g1" })));

    // --- teacher -----------------------------------------------------------
    await ok("TEACH-01", "teacher reads an actively linked student's Note", getDoc(doc(tch, "notes", nk(T, NOTE))));
    await no("TEACH-03", "an inactive link cannot read", getDoc(doc(tch, "notes", nk(T, "kidnote0000000000000000000000001"))));
    await no("TEACH-04", "a teacher can never write a Note", updateDoc(doc(tch, "notes", nk(T, NOTE)), { title: "by teacher" }));

    // --- administrator -----------------------------------------------------
    await ok("ADMIN-01", "tenant administrator reads inside their tenant", getDoc(doc(adm, "notes", nk(T, NOTE))));
    await no("ADMIN-02", "an administrator of ANOTHER tenant cannot read", getDoc(doc(adm2, "notes", nk(T, NOTE))));
    await no("ADMIN-03", "an administrator can never write a Note", updateDoc(doc(adm, "notes", nk(T, NOTE)), { title: "by admin" }));
    await no("ADMIN-04", "a platform administrator gets no cross-tenant reach here", getDoc(doc(plat, "notes", nk(T, NOTE))));

    // --- relationships (Phase 5 scope: sources only) ------------------------
    await ok("REL-00", "owner attaches a source link to their own Note", setDoc(doc(p1, "noteSources", nk(T, "src0000000000000000000000000001")), srcDoc()));
    await no("REL-01", "a source link cannot be attached to someone else's Note", setDoc(
      doc(p2, "noteSources", nk(T, "src0000000000000000000000000002")),
      srcDoc({ sourceLinkId: "src0000000000000000000000000002", ownerPersonId: "p2", ownerUid: "uid-p2", createdBy: "uid-p2" })));
    await ok("REL-05", "a source link may be retired", updateDoc(doc(p1, "noteSources", nk(T, "src0000000000000000000000000001")), { status: "retired", updatedAt: new Date() }));
    await no("REL-06", "a source link may not be repointed", updateDoc(doc(p1, "noteSources", nk(T, "src0000000000000000000000000001")), { sourceKey: "ayah:2:1" }));
    await no("REL-07", "a source link may not be deleted", deleteDoc(doc(p1, "noteSources", nk(T, "src0000000000000000000000000001"))));

    // --- shape -------------------------------------------------------------
    await no("SHAPE-01", "an unexpected field is refused", createNoteAtomically(p1, {
      note: { ...noteDoc({ noteId: "s0000000000000000000000000000001", currentRevisionId: "sr000000000000000000000000000001" }), secret: "x" },
      rev: revDoc({ revisionId: "sr000000000000000000000000000001", noteId: "s0000000000000000000000000000001" }) }));
    await no("SHAPE-02", "a Note that is not private is refused", createNoteAtomically(p1, {
      note: noteDoc({ noteId: "s0000000000000000000000000000002", currentRevisionId: "sr000000000000000000000000000002", visibility: "shared" }),
      rev: revDoc({ revisionId: "sr000000000000000000000000000002", noteId: "s0000000000000000000000000000002" }) }));
    await no("SHAPE-03", "a document id that disagrees with its fields is refused", setDoc(
      doc(p1, "notes", "wrongkey"), noteDoc({ noteId: "s0000000000000000000000000000003" })));
    await no("SHAPE-04", "createdBy must be the caller", createNoteAtomically(p1, {
      note: noteDoc({ noteId: "s0000000000000000000000000000004", currentRevisionId: "sr000000000000000000000000000004", createdBy: "uid-p2" }),
      rev: revDoc({ revisionId: "sr000000000000000000000000000004", noteId: "s0000000000000000000000000000004" }) }));

    // --- Phase 6 collections must stay closed ------------------------------
    await no("P6-01", "noteFolders is unruled and therefore denied", setDoc(doc(p1, "noteFolders", nk(T, "f1")), { tenantId: T, ownerPersonId: "p1" }));
    await no("P6-02", "notePlacements is unruled and therefore denied", setDoc(doc(p1, "notePlacements", nk(T, "pl1")), { tenantId: T, ownerPersonId: "p1" }));

    // --- the cases the first run left unexercised --------------------------
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // A child whose guardian link has been removed, and an unlinked student.
      await setDoc(doc(db, "tenantPeople", "exkid"), { tenantId: T, authUid: null, managedByPersonId: null });
      await setDoc(doc(db, "notes", nk(T, "exkidnote00000000000000000000001")),
        noteDoc({ noteId: "exkidnote00000000000000000000001", ownerPersonId: "exkid", ownerUid: null }));
      await setDoc(doc(db, "tenantPeople", "unl"), { tenantId: T, authUid: "uid-unl" });
      await setDoc(doc(db, "notes", nk(T, "unlnote0000000000000000000000001")),
        noteDoc({ noteId: "unlnote0000000000000000000000001", ownerPersonId: "unl", ownerUid: "uid-unl" }));
    });
    await no("GUARD-03", "a FORMER linked child cannot be read", getDoc(doc(g1, "notes", nk(T, "exkidnote00000000000000000000001"))));
    await no("TEACH-02", "an unlinked student cannot be read", getDoc(doc(tch, "notes", nk(T, "unlnote0000000000000000000000001"))));

    // --- queries -----------------------------------------------------------
    await ok("QUERY-01", "a scoped, bounded list of my own Notes is allowed", getDocs(query(
      collection(p1, "notes"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("status", "==", "active"),
      limit(50))));
    await no("QUERY-02", "an UNSCOPED list over the collection is refused", getDocs(query(
      collection(p1, "notes"), limit(50))));
    await no("QUERY-03", "an UNBOUNDED list is refused even when scoped", getDocs(query(
      collection(p1, "notes"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"))));
    await no("ADMIN-04b", "a platform administrator cannot list across tenants", getDocs(query(
      collection(plat, "notes"), limit(50))));

    // --- P5-E: the READ side of ADR-009 ------------------------------------
    // These are the EXACT query shapes note-foundation.js runs, orderBy and
    // all, so what is proven here is the real read path rather than a
    // simplified stand-in. Fresh ACTIVE source links are seeded first, because
    // a list over a set that matches NOTHING succeeds trivially and would
    // prove nothing at all -- REL-05 retired the only link p1 had.
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const id of ["p5esrc00000000000000000000000001", "p5esrc00000000000000000000000002"]) {
        await setDoc(doc(db, "noteSources", nk(T, id)), srcDoc({ sourceLinkId: id }));
      }
      await setDoc(doc(db, "noteSources", nk(T, "p5eunl0000000000000000000000001")),
        srcDoc({ sourceLinkId: "p5eunl0000000000000000000000001", noteId: "unlnote0000000000000000000000001",
                 ownerPersonId: "unl", ownerUid: "uid-unl", createdBy: "uid-unl" }));
    });

    const unitSources = (db, personId) => query(collection(db, "noteSources"),
      where("tenantId", "==", T), where("ownerPersonId", "==", personId),
      where("sourceKey", "==", "ayah:2:255"), where("status", "==", "active"),
      orderBy("createdAt", "desc"), limit(31));

    await ok("QUERY-04", "owner lists their own source links for one Study Unit", getDocs(unitSources(p1, "p1")));
    await no("QUERY-05", "an UNSCOPED list over noteSources is refused", getDocs(query(
      collection(p1, "noteSources"), limit(50))));
    await no("QUERY-06", "an UNBOUNDED list of source links is refused even when scoped", getDocs(query(
      collection(p1, "noteSources"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"))));
    await ok("QUERY-07", "a teacher lists an actively linked student's source links", getDocs(unitSources(tch, "p1")));
    await no("QUERY-08", "a teacher cannot list an UNLINKED student's source links", getDocs(unitSources(tch, "unl")));
    await no("QUERY-09", "another person cannot list my source links", getDocs(unitSources(p2, "p1")));
    await ok("QUERY-10", "owner lists one Note's revision history", getDocs(query(
      collection(p1, "noteRevisions"),
      where("tenantId", "==", T), where("ownerPersonId", "==", "p1"), where("noteId", "==", NOTE),
      orderBy("createdAt", "desc"), limit(100))));

    // --- REG-01: the legacy note surface is untouched ----------------------
    // The SAME claim, asserted from opposite directions, and the difference is
    // the whole reason the deployment candidate had to be built and run.
    //
    // Against the EXTRACT, ayahNotes is unruled, so a write to it must be
    // DENIED -- that is what proves the extract has not accidentally grown a
    // rule for the legacy surface.
    //
    // Against the DEPLOYMENT CANDIDATE, production's own ayahNotes rule is
    // present, so the owner's write must SUCCEED exactly as it does today --
    // that is what proves the Note Foundation has not disturbed the live
    // surface holding real Owner data. Asserting the denial here would have
    // been asserting that deployment BREAKS the quick note.
    const legacyWrite = () => setDoc(doc(p1, "ayahNotes", `${T}__p1`), { tenantId: T, personId: "p1", notes: {} });
    if (againstDeployment) {
      await ok("REG-01", "the legacy ayahNotes surface still works exactly as production does", legacyWrite());
    } else {
      await no("REG-01", "this candidate governs no legacy ayahNotes rule", legacyWrite());
    }

    console.log(`\n  matrix cases exercised: ${[...seen].filter((id) => matrix.cases.some((c) => c.id === id)).length} of ${matrix.cases.length}`);
    console.log(`\n==== Phase 5 Note Foundation candidate Rules: ${n} assertions, all as specified ====`);
  } finally {
    await env.cleanup();
  }
});
