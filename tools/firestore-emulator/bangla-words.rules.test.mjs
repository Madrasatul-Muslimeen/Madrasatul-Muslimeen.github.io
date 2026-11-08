// PCF MSA J119 -- the CANDIDATE banglaWords Rules (docs/proposals/bangla-words.candidate.rules), executed against the
// Firestore emulator. Isolated: never loads firestore.rules as the ruleset, never touches a production project id.
//
// The ruleset under test = the candidate's own `match /banglaWords/` block (read from the candidate file, so it cannot
// drift from a copy) + the DEPLOYED helper functions lifted by name out of firestore.rules (so a helper changing there
// changes what is tested here). Every denial is paired with an allow differing in ONE fact.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails as aF, assertSucceeds as aS } from "@firebase/rules-unit-testing";
// name the failing assertion by its line in this file
const where = () => new Error().stack.split("\n").find((l) => l.includes("bangla-words.rules.test.mjs") && !/at (assertFails|assertSucceeds|where)/.test(l))?.trim();
const assertFails = async (p) => { const w = where(); try { return await aF(p); } catch (e) { e.message = `EXPECTED DENY but allowed @ ${w}: ${e.message}`; throw e; } };
const assertSucceeds = async (p) => { const w = where(); try { return await aS(p); } catch (e) { e.message = `EXPECTED ALLOW but denied @ ${w}: ${e.message}`; throw e; } };
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-mmsa-bangla-words";
const HOST = "127.0.0.1";
const PORT = 8091;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const production = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = process.env.MUTANT_FILE
  ? fs.readFileSync(process.env.MUTANT_FILE, "utf8")
  : fs.readFileSync(path.join(root, "docs/proposals/bangla-words.candidate.rules"), "utf8");

// Lift one top-level (4-space) helper out of the deployed rules, brace-matched. Throws by name if it is not found.
function lift(sigRe) {
  const m = new RegExp(`^    function ${sigRe}[^\\n]*`, "m").exec(production);
  assert.ok(m, `helper not found in firestore.rules: ${sigRe}`);
  let i = production.indexOf("{", m.index), depth = 0, j = i;
  for (; j < production.length; j++) {
    if (production[j] === "{") depth++;
    else if (production[j] === "}" && --depth === 0) break;
  }
  return production.slice(m.index, j + 1);
}
const HELPERS = [
  "signedIn\\(", "myUid\\(", "tenantMemberRef\\(", "tenantMemberHeld\\(", "tenantMemberDoc\\(", "myRolesIn\\(", "hasRoleIn\\(",
  "myPersonIdIn\\(", "tenantPersonRef\\(", "isPlatformAdmin\\(", "isOwnerIn\\(", "isPrimeIn\\(", "isTeacherIn\\(",
  "isGuardianIn\\(", "canAdminIdentity\\(", "isGuardianOf\\(", "teacherStudentLinkRef\\(", "isCoEnrolledTeacherOf\\(",
  "isSelfPerson\\(", "canRecordFor\\(", "personInTenant\\(tenantId, personId\\)", "d\\(\\) \\{",
].map(lift);
assert.equal(HELPERS.length, 22);
const head = "service cloud.firestore {\n  match /databases/{database}/documents {";
assert.ok(candidate.includes(head), "the candidate no longer opens with the expected service/match header");
const rules = candidate.replace(head, head + "\n" + HELPERS.join("\n") + "\n");
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (process.env.DUMP_RULES) fs.writeFileSync(process.env.DUMP_RULES, rules);
assert.deepEqual(matchBlocks, ["banglaWords"], `the candidate must govern exactly banglaWords, saw: ${matchBlocks.join(",")}`);

const T = "t1", T2 = "t2";
const ts = new Date("2026-11-08T00:00:00.000Z");
const list = (tenantId, scope, over = {}) => ({
  tenantId, scope, words: ["w1", "w2"], schemaVersion: 1, createdAt: ts, updatedAt: ts, createdBy: "uid-owner", ...over,
});
const id = (tenantId, scope) => `${tenantId}__${scope}`;

test("candidate banglaWords Rules: isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  try {
    await env.clearFirestore();
    const seed = async () => env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const member = (uid, personId, roles, tenantId = T) =>
        setDoc(doc(db, "tenantMemberUids", `${tenantId}__${uid}`), { tenantId, uid, personId, roles });
      await member("uid-owner", "pO", ["owner"]);
      await member("uid-prime", "pP", ["prime"]);
      await member("uid-teacher", "pT", ["teacher"]);
      await member("uid-coteacher", "pCT", ["teacher"]);
      await member("uid-student", "pS", ["student"]);
      await member("uid-student2", "pS2", ["student"]);
      await member("uid-guardian", "pG", ["guardian"]);
      await member("uid-other", "pX", ["student"], T2);        // a member of ANOTHER madrasah only
      await member("uid-otherprime", "pQ", ["prime"], T2);
      await setDoc(doc(db, "userIndex", "uid-admin"), { platformAdmin: true });
      const person = (personId, tenantId, over = {}) => setDoc(doc(db, "tenantPeople", personId), { tenantId, ...over });
      await person("pS", T, { authUid: "uid-student" });
      await person("pS2", T, { authUid: "uid-student2" });
      await person("pC", T, { managedByPersonId: "pG" });      // the guardian's child
      await person("pX", T2, { authUid: "uid-other" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__pCT__pS`), { active: true });   // the co-enrolled teacher of pS
    });
    await seed();
    const wipe = async () => env.withSecurityRulesDisabled(async (ctx) => {
      for (const k of [id(T, "madrasah"), id(T, "pS"), id(T, "pC"), id(T, "pX"), id(T2, "pX"), id(T, "other"), id("", "madrasah")]) {
        await deleteDoc(doc(ctx.firestore(), "banglaWords", k));
      }
    });
    const put = (k, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "banglaWords", k), data));
    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher"), coteacher = db("uid-coteacher");
    const student = db("uid-student"), student2 = db("uid-student2"), guardian = db("uid-guardian");
    const other = db("uid-other"), otherprime = db("uid-otherprime"), stranger = db("uid-nobody"), admin = db("uid-admin");
    const anon = env.unauthenticatedContext().firestore();
    const ref = (c, k) => doc(c, "banglaWords", k);
    // positive control: the documents under test are really absent, so every setDoc below is a CREATE
    await env.withSecurityRulesDisabled(async (ctx) => {
      assert.equal((await getDoc(doc(ctx.firestore(), "banglaWords", id(T, "madrasah")))).exists(), false);
    });

    // --- 1. MADRASAH list, create: owner / prime / teacher / platform admin ----------------------------------------
    const mk = (uid) => list(T, "madrasah", { createdBy: uid });   // each carries its OWN uid so only the role can refuse it
    for (const [c, uid] of [[student, "uid-student"], [guardian, "uid-guardian"], [other, "uid-other"], [otherprime, "uid-otherprime"], [stranger, "uid-nobody"]]) {
      await assertFails(setDoc(ref(c, id(T, "madrasah")), mk(uid)));
    }
    await assertFails(setDoc(ref(anon, id(T, "madrasah")), mk("uid-owner")));
    for (const [c, uid] of [[owner, "uid-owner"], [prime, "uid-prime"], [teacher, "uid-teacher"], [admin, "uid-admin"]]) {
      await assertSucceeds(setDoc(ref(c, id(T, "madrasah")), mk(uid)));
      await wipe();
    }

    // --- 2. shape, each fact differing from an accepted create (the owner is the actor throughout) -----------------
    const base = () => list(T, "madrasah");
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), extra: 1 }));                                   // hasOnly
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), (({ words, ...r }) => r)(base())));                          // hasAll
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), createdBy: "uid-prime" }));// createdBy == myUid
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), createdBy: "" }));
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), schemaVersion: "1" }));
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), createdAt: "2026-11-08" }));
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), updatedAt: "2026-11-08" }));
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), words: "abc" }));                               // is list
    await assertFails(setDoc(ref(owner, id(T, "other")), base()));                                                       // doc id != tenantId__scope
    await assertFails(setDoc(ref(owner, id(T2, "madrasah")), { ...base(), tenantId: T2 }));                              // owner of t1 writing t2
    await assertFails(setDoc(ref(admin, id("", "madrasah")), { ...base(), tenantId: "" , createdBy: "uid-admin" }));     // empty tenantId (admin passes every role test)
    const big = Array.from({ length: 5001 }, (_, i) => `w${i}`);
    await assertFails(setDoc(ref(owner, id(T, "madrasah")), { ...base(), words: big }));                                 // > 5000
    await assertSucceeds(setDoc(ref(owner, id(T, "madrasah")), { ...base(), words: big.slice(0, 5000) }));               // exactly 5000
    await wipe();
    await assertSucceeds(setDoc(ref(admin, id(T, "madrasah")), { ...base(), createdBy: "uid-admin" }));                  // pairs the empty-tenant denial
    await wipe();
    await assertSucceeds(setDoc(ref(owner, id(T, "madrasah")), { ...base(), words: [] }));
    await wipe();

    // --- 3. MADRASAH list, read ---------------------------------------------------------------------------------------
    await put(id(T, "madrasah"), list(T, "madrasah"));
    for (const c of [owner, prime, teacher, student, guardian]) await assertSucceeds(getDoc(ref(c, id(T, "madrasah"))));
    await assertFails(getDoc(ref(other, id(T, "madrasah"))));        // a member, but of another madrasah
    await assertFails(getDoc(ref(otherprime, id(T, "madrasah"))));
    await assertFails(getDoc(ref(stranger, id(T, "madrasah"))));
    await assertFails(getDoc(ref(anon, id(T, "madrasah"))));
    await assertSucceeds(getDoc(ref(other, id(T2, "madrasah"))));     // the read-before-create probe: a missing doc may be read by any signed-in user
    await assertSucceeds(getDoc(ref(stranger, id(T2, "madrasah"))));
    await assertFails(getDoc(ref(anon, id(T2, "madrasah"))));         // ...but not by nobody

    // --- 4. MADRASAH list, update -------------------------------------------------------------------------------------
    for (const c of [owner, prime, teacher]) await assertSucceeds(updateDoc(ref(c, id(T, "madrasah")), { words: ["w1"], updatedAt: ts }));
    for (const c of [student, guardian, other, otherprime, stranger]) await assertFails(updateDoc(ref(c, id(T, "madrasah")), { words: ["w1"], updatedAt: ts }));
    await assertFails(updateDoc(ref(owner, id(T, "madrasah")), { words: big }));                                          // over the cap
    await assertSucceeds(updateDoc(ref(owner, id(T, "madrasah")), { words: big.slice(0, 5000) }));
    await assertFails(updateDoc(ref(owner, id(T, "madrasah")), { createdBy: "uid-prime" }));                              // createdBy is write-once
    await assertSucceeds(updateDoc(ref(owner, id(T, "madrasah")), { createdBy: "uid-owner" }));                           // ...the same value is fine
    await assertFails(updateDoc(ref(owner, id(T, "madrasah")), { extra: 1 }));
    await assertFails(updateDoc(ref(owner, id(T, "madrasah")), { updatedAt: "x" }));

    // --- 5. PERSON list: the reader's own, and only the people canRecordFor() allows ---------------------------------
    const mine = (personId, uid, tenantId = T) => list(tenantId, personId, { createdBy: uid });
    await assertFails(setDoc(ref(student2, id(T, "pS")), mine("pS", "uid-student2")));                                    // another reader's list
    await assertFails(setDoc(ref(teacher, id(T, "pS")), mine("pS", "uid-teacher")));                                      // a teacher NOT co-enrolled
    await assertFails(setDoc(ref(guardian, id(T, "pS")), mine("pS", "uid-guardian")));                                    // guardian of someone else
    await assertFails(setDoc(ref(stranger, id(T, "pS")), mine("pS", "uid-nobody")));
    await assertFails(setDoc(ref(anon, id(T, "pS")), mine("pS", "uid-student")));
    await assertSucceeds(setDoc(ref(student, id(T, "pS")), mine("pS", "uid-student")));                                   // the reader's own
    await wipe();
    await assertSucceeds(setDoc(ref(coteacher, id(T, "pS")), mine("pS", "uid-coteacher")));                               // ...a co-enrolled teacher
    await wipe();
    await assertSucceeds(setDoc(ref(guardian, id(T, "pC")), mine("pC", "uid-guardian")));                                 // ...the guardian of the child
    await wipe();
    await assertSucceeds(setDoc(ref(owner, id(T, "pS")), mine("pS", "uid-owner")));                                       // ...an administrator
    await wipe();
    // THE ISOLATING CASE: pX writes for THEMSELVES but under ANOTHER tenant's path. isSelfPerson(pX) is true,
    // so canRecordFor() passes; only personInTenant() stands in the way.
    await assertFails(setDoc(ref(other, id(T, "pX")), mine("pX", "uid-other", T)));
    await assertSucceeds(setDoc(ref(other, id(T2, "pX")), mine("pX", "uid-other", T2)));                                  // the same actor, own tenant
    await wipe();
    // same isolating case for READ: a seeded t1__pX document, read by pX
    await put(id(T, "pX"), mine("pX", "uid-other", T));
    await assertFails(getDoc(ref(other, id(T, "pX"))));
    await put(id(T2, "pX"), mine("pX", "uid-other", T2));
    await assertSucceeds(getDoc(ref(other, id(T2, "pX"))));
    await wipe();

    // person list, read and update
    await put(id(T, "pS"), mine("pS", "uid-student"));
    await assertSucceeds(getDoc(ref(student, id(T, "pS"))));
    await assertSucceeds(getDoc(ref(owner, id(T, "pS"))));
    await assertSucceeds(getDoc(ref(coteacher, id(T, "pS"))));
    await assertFails(getDoc(ref(student2, id(T, "pS"))));            // another reader
    await assertFails(getDoc(ref(teacher, id(T, "pS"))));             // a teacher not co-enrolled
    await assertFails(getDoc(ref(guardian, id(T, "pS"))));
    await assertFails(getDoc(ref(otherprime, id(T, "pS"))));          // another madrasah's prime
    await assertFails(getDoc(ref(anon, id(T, "pS"))));
    await assertSucceeds(updateDoc(ref(student, id(T, "pS")), { words: ["w9"], updatedAt: ts }));
    await assertFails(updateDoc(ref(student2, id(T, "pS")), { words: ["w9"], updatedAt: ts }));
    await assertFails(updateDoc(ref(teacher, id(T, "pS")), { words: ["w9"], updatedAt: ts }));
    await assertFails(updateDoc(ref(student, id(T, "pS")), { words: big }));
    await assertFails(updateDoc(ref(student, id(T, "pS")), { createdBy: "uid-owner" }));
    await wipe();

    // a legacy/hand-seeded document with an EMPTY createdBy cannot be updated through the shape check (isolates `createdBy.size() > 0`:
    // on create, createdBy == myUid() already refuses it, and on update createdBy is pinned to the stored value)
    await put(id(T, "madrasah"), list(T, "madrasah", { createdBy: "" }));
    await assertFails(updateDoc(ref(owner, id(T, "madrasah")), { words: ["w1"], updatedAt: ts }));
    await put(id(T, "madrasah"), list(T, "madrasah"));
    await assertSucceeds(updateDoc(ref(owner, id(T, "madrasah")), { words: ["w1"], updatedAt: ts }));   // paired: a normal one
    await wipe();

    // --- 6. I4/D6: nothing deletes. Paired on the ACTOR: each could write the document above. -----------------------
    await put(id(T, "madrasah"), list(T, "madrasah"));
    await put(id(T, "pS"), mine("pS", "uid-student"));
    for (const [c, k] of [[owner, id(T, "madrasah")], [prime, id(T, "madrasah")], [teacher, id(T, "madrasah")], [admin, id(T, "madrasah")], [student, id(T, "pS")], [owner, id(T, "pS")]]) {
      await assertFails(deleteDoc(ref(c, k)));
    }
    await assertSucceeds(getDoc(ref(owner, id(T, "madrasah"))));
    await wipe();
  } finally {
    await env.cleanup();
  }
});
