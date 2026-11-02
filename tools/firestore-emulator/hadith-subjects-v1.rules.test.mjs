// PCF MSA J106 round 2 -- the CANDIDATE hadithSubjects Rules, executed
// against the Firestore emulator. Isolated: this never loads firestore.rules
// and never touches a production endpoint or project id.
//
// Every denial is paired with an ALLOW that differs in exactly ONE fact (the
// actor, the tenant, the field, or the operation), so a ruleset that refused
// everything for the wrong reason cannot pass this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-hadith-subjects-v1";
const HOST = "127.0.0.1";
const PORT = 8087;
const here = path.dirname(fileURLToPath(import.meta.url));
const EXTRACT = "tests/firestore/hadith-subjects-v1.proposed.rules";
const RULES_FILE = process.env.RULES_FILE || EXTRACT;
const againstDeployment = RULES_FILE !== EXTRACT;
// MUTANT_FILE (absolute path) runs this suite against a deliberately broken
// copy of the extract: every mutation in hadith-subjects-v1.mutate.sh must
// turn this suite red.
const candidate = process.env.MUTANT_FILE
  ? fs.readFileSync(process.env.MUTANT_FILE, "utf8")
  : fs.readFileSync(path.resolve(here, "../..", RULES_FILE), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (againstDeployment) {
  // Against the assembled file: it must carry the whole live ruleset too.
  for (const required of ["hadithSubjects", "asmaCollections", "tenantInvites"]) {
    assert.ok(matchBlocks.includes(required), `the deployment candidate is missing match /${required}/`);
  }
  const production = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8").split("\n");
  const missing = production.filter((line) => line.trim() && !candidate.includes(line));
  assert.deepEqual(missing, [], `the deployment candidate DROPS ${missing.length} production line(s)`);
} else {
  assert.deepEqual(matchBlocks, ["hadithSubjects"], `the candidate must govern exactly hadithSubjects, saw: ${matchBlocks.join(",")}`);
  assert.ok(!/match \/tenantInvites\//.test(candidate), "the candidate must not be a copy of the deployed production rules");
}

const T = "t1";
const T2 = "t2";
const entry = (n) => ({
  versionUri: "0256Bukhari.Sahih.Sunnah-Ara1", n, std: `Bukhari ${n}`, book: "Book of Faith",
  chapter: "Chapter", title: "Title", addedAt: "2026-10-31T00:00:00.000Z", addedBy: "pO", status: "active",
});
const subjectsDoc = (tenantId, over = {}) => ({
  tenantId, schemaVersion: 1, createdBy: "uid-owner", createdAt: new Date("2026-10-31T00:00:00.000Z"),
  updatedAt: new Date("2026-10-31T00:00:00.000Z"), subjects: { akhlaq: [entry(1)], ghayb: [], stories: [] }, ...over,
});

test("candidate hadithSubjects Rules: isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    // Start from an EMPTY emulator every run. The emulator keeps data between runs in one session, so without this
    // hadithSubjects/t1 already existed from the previous run, every "create" below was really judged by the UPDATE
    // rule, and the create mutations went unproven -- a denial made by a different rule (found by the mutate script).
    await env.clearFirestore();
    // Positive control: the document under test is really absent, so the setDoc calls below are creates.
    await env.withSecurityRulesDisabled(async (ctx) => {
      assert.equal((await getDoc(doc(ctx.firestore(), "hadithSubjects", T))).exists(), false, "hadithSubjects/t1 must not exist before the create cases");
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const member = (uid, personId, roles, tenantId = T) =>
        setDoc(doc(db, "tenantMemberUids", `${tenantId}__${uid}`), { tenantId, uid, personId, roles });
      await member("uid-owner", "pO", ["owner"]);
      await member("uid-prime", "pP", ["prime"]);
      await member("uid-teacher", "pT", ["teacher"]);
      await member("uid-student", "pS", ["student"]);
      await member("uid-guardian", "pG", ["guardian"]);
      // A prime of ANOTHER madrasah only.
      await member("uid-other", "pX", ["prime"], T2);
      await setDoc(doc(db, "userIndex", "uid-admin"), { platformAdmin: true });
      await setDoc(doc(db, "hadithSubjects", T2), subjectsDoc(T2, { createdBy: "uid-other" }));
    });

    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher");
    const student = db("uid-student"), guardian = db("uid-guardian"), other = db("uid-other");
    const stranger = db("uid-nobody"), admin = db("uid-admin");
    const anon = env.unauthenticatedContext().firestore();

    // --- 1. Create: owner/prime only, tenantId must be the doc id ---------
    // Each carries its OWN uid as createdBy, so only the role test can refuse it (not the createdBy == myUid() test).
    await assertFails(setDoc(doc(teacher, "hadithSubjects", T), subjectsDoc(T, { createdBy: "uid-teacher" })));
    await assertFails(setDoc(doc(student, "hadithSubjects", T), subjectsDoc(T, { createdBy: "uid-student" })));
    await assertFails(setDoc(doc(other, "hadithSubjects", T), subjectsDoc(T, { createdBy: "uid-other" })));   // prime, but of t2
    // PAIRED: the owner's create with the WRONG tenantId field is refused...
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T2)));
    // ...a wrong schemaVersion is refused...
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T, { schemaVersion: 2 })));
    // ...createdBy must be the signed-in uid (I17): another uid, or none, is refused...
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T, { createdBy: "uid-prime" })));
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), (({ createdBy, ...rest }) => rest)(subjectsDoc(T))));
    // ...createdAt must be a timestamp, not a string...
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T, { createdAt: "2026-10-31T00:00:00.000Z" })));
    // ...a missing subjects map is refused...
    await assertFails(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T, { subjects: "akhlaq" })));
    // ...and the same create, right in every fact, succeeds.
    await assertSucceeds(setDoc(doc(owner, "hadithSubjects", T), subjectsDoc(T)));

    // --- 2. Read: any member of THIS madrasah ----------------------------
    for (const reader of [owner, prime, teacher, student, guardian, admin]) {
      await assertSucceeds(getDoc(doc(reader, "hadithSubjects", T)));
    }
    // PAIRED DENIALS: a member of another madrasah, a signed-in stranger, nobody.
    await assertFails(getDoc(doc(other, "hadithSubjects", T)));
    await assertSucceeds(getDoc(doc(other, "hadithSubjects", T2)));   // the same actor, own tenant
    await assertFails(getDoc(doc(stranger, "hadithSubjects", T)));
    await assertFails(getDoc(doc(anon, "hadithSubjects", T)));

    // --- 3. Update: owner/prime add and retire entries -------------------
    await assertSucceeds(updateDoc(doc(prime, "hadithSubjects", T), { "subjects.ghayb": [entry(2)], updatedAt: "x" }));
    await assertSucceeds(updateDoc(doc(owner, "hadithSubjects", T), { "subjects.akhlaq": [{ ...entry(1), status: "retired" }], updatedAt: "y" }));
    // PAIRED DENIALS: the same update by a teacher, a student, a guardian, another tenant's prime.
    for (const writer of [teacher, student, guardian, other]) {
      await assertFails(updateDoc(doc(writer, "hadithSubjects", T), { "subjects.ghayb": [entry(3)], updatedAt: "z" }));
    }

    // --- 4. Identity is write-once (the tightening over asmaCollections) --
    await assertFails(updateDoc(doc(owner, "hadithSubjects", T), { tenantId: T2 }));
    await assertFails(updateDoc(doc(owner, "hadithSubjects", T), { createdBy: "uid-prime" }));
    await assertFails(updateDoc(doc(owner, "hadithSubjects", T), { createdAt: "2020-01-01" }));
    await assertFails(updateDoc(doc(owner, "hadithSubjects", T), { subjects: null }));
    await assertFails(updateDoc(doc(owner, "hadithSubjects", T), { schemaVersion: 2 }));
    // PAIRED ALLOW for the schemaVersion pin: the same actor writing schemaVersion UNCHANGED (1) succeeds.
    await assertSucceeds(updateDoc(doc(owner, "hadithSubjects", T), { schemaVersion: 1 }));
    // PAIRED ALLOW: the same actor changing only updatedAt still works.
    await assertSucceeds(updateDoc(doc(owner, "hadithSubjects", T), { updatedAt: "w" }));

    // --- 5. I4/D6: nothing deletes ---------------------------------------
    // Paired on the ACTOR: the owner and prime were allowed to write this
    // document above; only the operation differs.
    await assertFails(deleteDoc(doc(owner, "hadithSubjects", T)));
    await assertFails(deleteDoc(doc(prime, "hadithSubjects", T)));
    await assertFails(deleteDoc(doc(admin, "hadithSubjects", T)));
    await assertSucceeds(getDoc(doc(owner, "hadithSubjects", T)));
  } finally {
    await env.cleanup();
  }
});
