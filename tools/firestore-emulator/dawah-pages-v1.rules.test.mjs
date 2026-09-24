// MAP v4 Phase 7 (P7-A) -- the CANDIDATE Dawah pages Rules, executed against
// the Firestore emulator. Isolated: never loads firestore.rules, never
// touches a production endpoint or project id.
//
// Every denial is paired with an allow differing in exactly ONE fact, and
// every denial asserts that its DECIDING evaluation was a clean `false` --
// never an expression-budget refusal, the same class of failure that sank
// the Phase 4 Activity candidate and that every Foundation suite since has
// guarded against.
//
// What this suite is really for: proving that ADR-011's four Owner
// decisions are enforced BY THE SERVER, not merely by a client that chooses
// to behave.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, where, limit,
} from "firebase/firestore";

const PROJECT = "demo-quranrevival-dawah-pages-v1";
const HOST = "127.0.0.1";
const PORT = 8092;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const CANDIDATE_PATH = "docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules";
const candidate = fs.readFileSync(path.join(root, CANDIDATE_PATH), "utf8");

assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
assert.equal(HOST, "127.0.0.1");

// This candidate governs exactly the Phase 7 domain -- notes/noteRevisions/
// noteSources stay with Phase 5, and this file must never grow a second
// collection's rules by accident.
const blocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
assert.deepEqual(blocks, ["dawahPages"], `the candidate must govern exactly dawahPages, saw: ${blocks}`);

const T = "t1", T2 = "t2";
const env0 = { schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: "uid-p1" };
const nk = (tenant, id) => `${tenant}__${id}`;

const noteDoc = (o = {}) => ({
  noteId: "note0000000000000000000000000001", tenantId: T, ownerPersonId: "p1", ownerUid: "uid-p1",
  visibility: "private", title: "Adult title", bodyHtml: "<p>Adult body</p>",
  status: "active", currentRevisionId: "rev00000000000000000000000000001", ...env0, ...o,
});
const revisionDoc = (o = {}) => ({
  revisionId: "rev00000000000000000000000000001", noteId: "note0000000000000000000000000001",
  tenantId: T, ownerPersonId: "p1", previousRevisionId: null,
  title: "Adult title", bodyHtml: "<p>Adult body</p>", revisionReason: "created", actorUid: "uid-p1", ...env0, ...o,
});
const pageDoc = (o = {}) => ({
  pageId: "page0000000000000000000000000001", tenantId: T, authorPersonId: "p1",
  sourceNoteId: "note0000000000000000000000000001", sourceRevisionId: "rev00000000000000000000000000001",
  title: "Adult title", bodyHtml: "<p>Adult body</p>", sourceUnitKey: "ayah:2:255",
  status: "draft", approvedByPersonId: null, approvedAt: null, returnedNote: null, ...env0, ...o,
});

test("candidate Dawah Pages Rules: ADR-011 enforced at the server", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();

      // --- people --------------------------------------------------------
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "kid"), { tenantId: T, authUid: "uid-kid", isMinor: true, managedByPersonId: "g1" });
      await setDoc(doc(db, "tenantPeople", "g1"), { tenantId: T, authUid: "uid-g1", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "g2"), { tenantId: T, authUid: "uid-g2", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "tch"), { tenantId: T, authUid: "uid-tch", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "adm"), { tenantId: T, authUid: "uid-adm", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "prime1"), { tenantId: T, authUid: "uid-prime1", isMinor: false, managedByPersonId: null });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: T2, authUid: "uid-pX", isMinor: false, managedByPersonId: null });

      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-kid`), { roles: ["student"], personId: "kid" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-g1`), { roles: ["guardian"], personId: "g1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-g2`), { roles: ["guardian"], personId: "g2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-tch`), { roles: ["teacher"], personId: "tch" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-adm`), { roles: ["owner"], personId: "adm" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-prime1`), { roles: ["prime"], personId: "prime1" });
      await setDoc(doc(db, "tenantMemberUids", `${T2}__uid-pX`), { roles: ["self"], personId: "pX" });

      await setDoc(doc(db, "teacherStudentLinks", `${T}__tch__kid`), { active: true });

      // --- source Notes ----------------------------------------------------
      await setDoc(doc(db, "notes", nk(T, "note0000000000000000000000000001")), noteDoc());
      await setDoc(doc(db, "noteRevisions", nk(T, "rev00000000000000000000000000001")), revisionDoc());

      await setDoc(doc(db, "notes", nk(T, "notekid00000000000000000000001")), noteDoc({
        noteId: "notekid00000000000000000000001", ownerPersonId: "kid", ownerUid: "uid-kid",
        title: "Kid title", bodyHtml: "<p>Kid body</p>", currentRevisionId: "revkid0000000000000000000001", createdBy: "uid-kid",
      }));
      await setDoc(doc(db, "noteRevisions", nk(T, "revkid0000000000000000000001")), revisionDoc({
        revisionId: "revkid0000000000000000000001", noteId: "notekid00000000000000000000001",
        ownerPersonId: "kid", title: "Kid title", bodyHtml: "<p>Kid body</p>", actorUid: "uid-kid", createdBy: "uid-kid",
      }));

      await setDoc(doc(db, "notes", nk(T, "notep2000000000000000000000001")), noteDoc({
        noteId: "notep2000000000000000000000001", ownerPersonId: "p2", ownerUid: "uid-p2",
        title: "P2 title", bodyHtml: "<p>P2 body</p>", currentRevisionId: "revp2a000000000000000000001", createdBy: "uid-p2",
      }));
      await setDoc(doc(db, "noteRevisions", nk(T, "revp2a000000000000000000001")), revisionDoc({
        revisionId: "revp2a000000000000000000001", noteId: "notep2000000000000000000000001",
        ownerPersonId: "p2", title: "P2 title", bodyHtml: "<p>P2 body</p>", actorUid: "uid-p2", createdBy: "uid-p2",
      }));

      // --- Dawah pages seeded PAST the rules, so a rule under test is the
      // only thing deciding the case in front of it -------------------------
      const seed = (id, o = {}) => setDoc(doc(db, "dawahPages", nk(T, id)), pageDoc({ pageId: id, ...o }));
      await seed("p1draft0000000000000000000001");
      await seed("p1shared00000000000000000001", { status: "shared" });
      await seed("p1retired0000000000000000001", { status: "retired" });
      await seed("p2draft0000000000000000000001", {
        authorPersonId: "p2", sourceNoteId: "notep2000000000000000000000001", sourceRevisionId: "revp2a000000000000000000001",
        title: "P2 title", bodyHtml: "<p>P2 body</p>", createdBy: "uid-p2",
      });
      const kidBase = {
        authorPersonId: "kid", sourceNoteId: "notekid00000000000000000000001", sourceRevisionId: "revkid0000000000000000000001",
        title: "Kid title", bodyHtml: "<p>Kid body</p>", createdBy: "uid-kid",
      };
      await seed("kiddraft000000000000000000001", { ...kidBase });
      await seed("kiddraft200000000000000000001", { ...kidBase });
      await seed("kidshared00000000000000000001", { ...kidBase, status: "shared", approvedByPersonId: "g1", approvedAt: new Date() });
      await seed("kidawaitA00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitB00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitC00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitD00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitE00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitF00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitG00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitH00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitI00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitJ00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      // Approver-relationship coverage (24 Sep 2026): each clause of
      // isDawahApprover() gets a denial paired with an allow differing in one
      // fact -- an UNRELATED guardian, an UNLINKED teacher, and an owner
      // approving their OWN page were never exercised before.
      await seed("kidawaitK00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitL00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      await seed("kidawaitM00000000000000000001", { ...kidBase, status: "awaiting-approval" });
      const p2Base = {
        authorPersonId: "p2", sourceNoteId: "notep2000000000000000000000001", sourceRevisionId: "revp2a000000000000000000001",
        title: "P2 title", bodyHtml: "<p>P2 body</p>", createdBy: "uid-p2",
      };
      await seed("p2awaitA0000000000000000000001", { ...p2Base, status: "awaiting-approval" });
      await seed("p2awaitB0000000000000000000001", { ...p2Base, status: "awaiting-approval" });
      await seed("admawaitA000000000000000000001", {
        authorPersonId: "adm", sourceNoteId: "noteadm0000000000000000000001", sourceRevisionId: "revadm000000000000000000001",
        title: "Adm title", bodyHtml: "<p>Adm body</p>", createdBy: "uid-adm", status: "awaiting-approval",
      });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const kid = env.authenticatedContext("uid-kid").firestore();
    const g1 = env.authenticatedContext("uid-g1").firestore();
    const g2 = env.authenticatedContext("uid-g2").firestore();
    const tch = env.authenticatedContext("uid-tch").firestore();
    const adm = env.authenticatedContext("uid-adm").firestore();
    const prime1 = env.authenticatedContext("uid-prime1").firestore();
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
    const P = (id) => doc(p1, "dawahPages", nk(T, id));
    const newPage = (as, id, o = {}) => setDoc(doc(as, "dawahPages", nk(T, id)), pageDoc({ pageId: id, ...o }));

    // --- authentication and authorship -------------------------------------
    await no("D-AUTH-01", "unauthenticated cannot create a page",
      newPage(anon, "anon0000000000000000000000001"));
    await ok("D-OWN-01", "the author creates their own draft page from their own Note",
      newPage(p1, "newown00000000000000000000001"));
    await no("D-OWN-02", "another person cannot author a page for someone else",
      newPage(p2, "steal000000000000000000000001", {
        authorPersonId: "p1", sourceNoteId: "note0000000000000000000000000001", sourceRevisionId: "rev00000000000000000000000000001",
        title: "Adult title", bodyHtml: "<p>Adult body</p>", createdBy: "uid-p2",
      }));
    await no("D-OWN-03", "a GUARDIAN cannot create a page for their managed child",
      newPage(g1, "gkid0000000000000000000000001", {
        authorPersonId: "kid", sourceNoteId: "notekid00000000000000000000001", sourceRevisionId: "revkid0000000000000000000001",
        title: "Kid title", bodyHtml: "<p>Kid body</p>", createdBy: "uid-g1",
      }));
    await no("D-OWN-04", "a TEACHER cannot create a page for a linked student",
      newPage(tch, "tkid0000000000000000000000001", {
        authorPersonId: "kid", sourceNoteId: "notekid00000000000000000000001", sourceRevisionId: "revkid0000000000000000000001",
        title: "Kid title", bodyHtml: "<p>Kid body</p>", createdBy: "uid-tch",
      }));
    await no("D-OWN-05", "an OWNER cannot create a page for someone else",
      newPage(adm, "aown0000000000000000000000001", {
        authorPersonId: "p1", sourceNoteId: "note0000000000000000000000000001", sourceRevisionId: "rev00000000000000000000000000001",
        title: "Adult title", bodyHtml: "<p>Adult body</p>", createdBy: "uid-adm",
      }));
    await no("D-OWN-06", "a person in ANOTHER tenant cannot write into this tenant's path",
      setDoc(doc(pX, "dawahPages", nk(T, "xown0000000000000000000000001")), pageDoc({
        pageId: "xown0000000000000000000000001", authorPersonId: "pX", createdBy: "uid-pX",
      })));

    // --- source / shape ------------------------------------------------------
    await no("D-SRC-01", "the source Note must exist",
      newPage(p1, "srcgone00000000000000000001", { sourceNoteId: "nosuchnote0000000000000000000001" }));
    await no("D-SRC-02", "the source Note must be MINE",
      newPage(p1, "srcother0000000000000000001", {
        sourceNoteId: "notep2000000000000000000000001", sourceRevisionId: "revp2a000000000000000000001",
        title: "P2 title", bodyHtml: "<p>P2 body</p>",
      }));
    await no("D-SRC-03", "the source revision must exist",
      newPage(p1, "revgone00000000000000000001", { sourceRevisionId: "nosuchrev00000000000000000001" }));
    await no("D-SRC-04", "the source revision must belong to the named Note",
      newPage(p1, "revmismatch0000000000000001", { sourceRevisionId: "revp2a000000000000000000001" }));
    await no("D-SRC-05", "the frozen title/bodyHtml must equal the pinned revision's own content",
      newPage(p1, "frozenmismatch00000000000001", { title: "Something else entirely" }));
    await no("D-KEY-01", "the document key must be tenantId__pageId",
      setDoc(doc(p1, "dawahPages", nk(T, "wrongkey00000000000000000001")), pageDoc({ pageId: "otherid0000000000000000000001" })));
    await no("D-SHAPE-01", "an unknown field is refused",
      newPage(p1, "extra0000000000000000000000001", { colour: "gold" }));
    await no("D-SHAPE-02", "a page cannot be created already shared",
      newPage(p1, "bornshared00000000000000000001", { status: "shared" }));
    await no("D-SHAPE-03", "a page cannot be created already carrying an approval",
      newPage(p1, "bornapproved0000000000000001", { approvedByPersonId: "g1" }));

    // --- SUBMIT: draft -> awaiting-approval ---------------------------------
    await ok("D-SUBMIT-01", "the author submits their own draft for approval",
      updateDoc(doc(kid, "dawahPages", nk(T, "kiddraft000000000000000000001")), { status: "awaiting-approval", updatedAt: new Date() }));
    await no("D-SUBMIT-02", "another person cannot submit someone else's page",
      updateDoc(doc(p2, "dawahPages", nk(T, "p1draft0000000000000000000001")), { status: "awaiting-approval", updatedAt: new Date() }));
    await no("D-SUBMIT-03", "a page not in draft cannot be submitted",
      updateDoc(doc(p1, "dawahPages", nk(T, "p1shared00000000000000000001")), { status: "awaiting-approval", updatedAt: new Date() }));

    // --- SHARE (adult, direct): draft -> shared -----------------------------
    await ok("D-SHARE-01", "an adult shares their own draft directly",
      updateDoc(P("p1draft0000000000000000000001"), { status: "shared", updatedAt: new Date() }));
    await no("D-SHARE-02", "a MINOR cannot share their own draft directly, skipping approval",
      updateDoc(doc(kid, "dawahPages", nk(T, "kiddraft200000000000000000001")), { status: "shared", updatedAt: new Date() }));
    await no("D-SHARE-03", "another person cannot share someone else's page",
      updateDoc(doc(p2, "dawahPages", nk(T, "newown00000000000000000000001")), { status: "shared", updatedAt: new Date() }));

    // --- READS ----------------------------------------------------------------
    await ok("D-READ-01", "the author reads their own draft", getDoc(doc(p2, "dawahPages", nk(T, "p2draft0000000000000000000001"))));
    await ok("D-READ-02", "a guardian reads their managed child's draft", getDoc(doc(g1, "dawahPages", nk(T, "kidawaitB00000000000000000001"))));
    await ok("D-READ-03", "a co-enrolled teacher reads a linked student's awaiting page", getDoc(doc(tch, "dawahPages", nk(T, "kidawaitC00000000000000000001"))));
    await ok("D-READ-04", "an owner reads any page in the tenant", getDoc(doc(adm, "dawahPages", nk(T, "p2draft0000000000000000000001"))));
    await ok("D-READ-04b", "a prime reads any page in the tenant", getDoc(doc(prime1, "dawahPages", nk(T, "p2draft0000000000000000000001"))));
    await no("D-READ-05", "another unrelated person cannot read a draft page", getDoc(doc(p2, "dawahPages", nk(T, "kiddraft000000000000000000001"))));
    await ok("D-READ-06", "any tenant member can read a SHARED page", getDoc(doc(p2, "dawahPages", nk(T, "kidshared00000000000000000001"))));
    await no("D-READ-07", "a person outside the tenant cannot read even a SHARED page", getDoc(doc(pX, "dawahPages", nk(T, "kidshared00000000000000000001"))));
    await ok("D-READ-08", "an UNRELATED guardian may still browse a pending awaiting-approval page", getDoc(doc(g2, "dawahPages", nk(T, "kidawaitD00000000000000000001"))));
    await ok("D-READ-09", "a get() on a nonexistent page does not error", getDoc(doc(p1, "dawahPages", nk(T, "nosuchpage000000000000000001"))));

    // --- APPROVE: awaiting-approval -> shared -------------------------------
    await ok("D-APPROVE-01", "the managing guardian approves an awaiting page",
      updateDoc(doc(g1, "dawahPages", nk(T, "kidawaitA00000000000000000001")),
        { status: "shared", approvedByPersonId: "g1", approvedAt: new Date(), updatedAt: new Date() }));
    await ok("D-APPROVE-02", "a co-enrolled teacher approves an awaiting page",
      updateDoc(doc(tch, "dawahPages", nk(T, "kidawaitB00000000000000000001")),
        { status: "shared", approvedByPersonId: "tch", approvedAt: new Date(), updatedAt: new Date() }));
    await ok("D-APPROVE-03", "an owner approves an awaiting page",
      updateDoc(doc(adm, "dawahPages", nk(T, "kidawaitC00000000000000000001")),
        { status: "shared", approvedByPersonId: "adm", approvedAt: new Date(), updatedAt: new Date() }));
    await no("D-APPROVE-04", "a child can NEVER approve their own page",
      updateDoc(doc(kid, "dawahPages", nk(T, "kidawaitD00000000000000000001")),
        { status: "shared", approvedByPersonId: "kid", approvedAt: new Date(), updatedAt: new Date() }));
    await no("D-APPROVE-05", "an unrelated person cannot approve a page",
      updateDoc(doc(p2, "dawahPages", nk(T, "kidawaitE00000000000000000001")),
        { status: "shared", approvedByPersonId: "p2", approvedAt: new Date(), updatedAt: new Date() }));
    await no("D-APPROVE-06", "an approver may not name someone else as the approver",
      updateDoc(doc(g1, "dawahPages", nk(T, "kidawaitH00000000000000000001")),
        { status: "shared", approvedByPersonId: "adm", approvedAt: new Date(), updatedAt: new Date() }));
    await no("D-APPROVE-07", "an approve write may not also change the frozen content",
      updateDoc(doc(g1, "dawahPages", nk(T, "kidawaitI00000000000000000001")),
        { status: "shared", approvedByPersonId: "g1", approvedAt: new Date(), title: "Rewritten", updatedAt: new Date() }));

    // --- APPROVE: each approver relationship, allow paired with deny -------
    const approveAs = (as, who, id) => updateDoc(doc(as, "dawahPages", nk(T, id)),
      { status: "shared", approvedByPersonId: who, approvedAt: new Date(), updatedAt: new Date() });
    await ok("D-APPROVE-08", "the MANAGING guardian approves their child's page",
      approveAs(g1, "g1", "kidawaitK00000000000000000001"));
    await no("D-APPROVE-09", "an UNRELATED guardian cannot approve someone else's child's page",
      approveAs(g2, "g2", "kidawaitL00000000000000000001"));
    await ok("D-APPROVE-10", "a LINKED teacher approves their student's page",
      approveAs(tch, "tch", "kidawaitM00000000000000000001"));
    await no("D-APPROVE-11", "an UNLINKED teacher cannot approve a page by someone they do not teach",
      approveAs(tch, "tch", "p2awaitA0000000000000000000001"));
    await ok("D-APPROVE-12", "an owner approves another person's page",
      approveAs(adm, "adm", "p2awaitB0000000000000000000001"));
    await no("D-APPROVE-13", "an owner can NEVER approve their OWN page",
      approveAs(adm, "adm", "admawaitA000000000000000000001"));

    // --- RETURN: awaiting-approval -> draft ---------------------------------
    await ok("D-RETURN-01", "the guardian returns a page to draft with a reason",
      updateDoc(doc(g1, "dawahPages", nk(T, "kidawaitF00000000000000000001")),
        { status: "draft", returnedNote: "Please add a citation.", updatedAt: new Date() }));
    await no("D-RETURN-02", "a return needs a non-empty reason",
      updateDoc(doc(g1, "dawahPages", nk(T, "kidawaitG00000000000000000001")),
        { status: "draft", returnedNote: "", updatedAt: new Date() }));
    await no("D-RETURN-03", "an unrelated person cannot return a page",
      updateDoc(doc(p2, "dawahPages", nk(T, "kidawaitJ00000000000000000001")),
        { status: "draft", returnedNote: "No thanks.", updatedAt: new Date() }));

    // --- RETIRE: any non-retired -> retired (I4) ----------------------------
    await ok("D-RETIRE-01", "the author retires their own shared page",
      updateDoc(doc(p1, "dawahPages", nk(T, "p1shared00000000000000000001")), { status: "retired", updatedAt: new Date() }));
    await no("D-RETIRE-02", "retiring an already-retired page is refused",
      updateDoc(doc(p1, "dawahPages", nk(T, "p1retired0000000000000000001")), { status: "retired", updatedAt: new Date() }));
    await no("D-RETIRE-03", "another person cannot retire someone else's page",
      updateDoc(doc(p2, "dawahPages", nk(T, "kidshared00000000000000000001")), { status: "retired", updatedAt: new Date() }));

    // --- ADR-005: the frozen copy and the pin are write-once ---------------
    const IM = () => doc(p1, "dawahPages", nk(T, "newown00000000000000000000001"));
    await no("D-IMMUT-01", "sourceNoteId cannot change on update",
      updateDoc(IM(), { sourceNoteId: "notekid00000000000000000000001", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-02", "sourceRevisionId cannot change on update",
      updateDoc(IM(), { sourceRevisionId: "revkid0000000000000000000001", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-03", "title cannot change on update",
      updateDoc(IM(), { title: "Rewritten title", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-04", "bodyHtml cannot change on update",
      updateDoc(IM(), { bodyHtml: "<p>Rewritten</p>", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-05", "sourceUnitKey cannot change on update",
      updateDoc(IM(), { sourceUnitKey: "ayah:3:1", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-06", "authorPersonId cannot change on update",
      updateDoc(IM(), { authorPersonId: "p2", status: "shared", updatedAt: new Date() }));
    await no("D-IMMUT-07", "tenantId cannot change on update",
      updateDoc(IM(), { tenantId: T2, status: "shared", updatedAt: new Date() }));

    // --- query bounds --------------------------------------------------------
    await ok("D-QUERY-01", "a scoped, bounded shared-pages query is allowed", getDocs(query(collection(p2, "dawahPages"),
      where("tenantId", "==", T), where("status", "==", "shared"), limit(50))));
    await no("D-QUERY-06", "a person OUTSIDE the tenant may not list its shared pages", getDocs(query(collection(pX, "dawahPages"),
      where("tenantId", "==", T), where("status", "==", "shared"), limit(50))));
    // The exact query listDawahPagesAwaitingMyApproval() (app/js/dawah-data.js)
    // issues: tenantId + status, bounded at its default maximum of 100.
    const awaitingBrowse = (as) => getDocs(query(collection(as, "dawahPages"),
      where("tenantId", "==", T), where("status", "==", "awaiting-approval"), limit(100)));
    await ok("D-QUERY-04", "a guardian may run the awaiting-approval browse query", awaitingBrowse(g1));
    await no("D-QUERY-05", "a plain self-only member may NOT run the awaiting-approval browse query", awaitingBrowse(p2));
    await no("D-QUERY-02", "an unscoped list is refused", getDocs(query(collection(p1, "dawahPages"), limit(50))));
    await no("D-QUERY-03", "an unbounded list is refused even when scoped", getDocs(query(collection(p1, "dawahPages"),
      where("tenantId", "==", T), where("status", "==", "shared"))));

    // --- delete ---------------------------------------------------------------
    await no("D-DEL-01", "a Dawah page may never be deleted", deleteDoc(doc(p1, "dawahPages", nk(T, "newown00000000000000000000001"))));

    console.log(`\n==== Phase 7 Dawah Pages candidate Rules: ${n} assertions, all as specified ====`);
  } finally {
    await env.cleanup();
  }
});
