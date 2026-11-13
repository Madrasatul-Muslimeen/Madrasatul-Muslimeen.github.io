// PCF MSA J104 line 25 (Dua groups) -- the CANDIDATE Rules (docs/proposals/dua-groups.candidate.rules: duaGroups, one
// document per group tree, ownerKey "admin" or a personId), executed against the Firestore emulator. Isolated: never loads
// firestore.rules as the ruleset, never touches a production project id.
//
// The ruleset under test = the candidate's own match block (read from the candidate file, so it cannot drift from a copy)
// + the DEPLOYED helper functions lifted by name out of firestore.rules (so a helper changing there changes what is tested
// here). FULL_RULES_FILE=docs/proposals/dua-groups.DEPLOYMENT-candidate.rules runs the same cases against the whole file
// the Owner pastes. Every denial is paired with an allow differing in ONE fact.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-dua-groups --config dua-groups.firebase.json "node --test dua-groups.rules.test.mjs"
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails as aF, assertSucceeds as aS } from "@firebase/rules-unit-testing";
const where = () => new Error().stack.split("\n").find((l) => l.includes("dua-groups.rules.test.mjs") && !/at (assertFails|assertSucceeds|where)/.test(l))?.trim();
const assertFails = async (p) => { const w = where(); try { return await aF(p); } catch (e) { e.message = `EXPECTED DENY but allowed @ ${w}: ${e.message}`; throw e; } };
const assertSucceeds = async (p) => { const w = where(); try { return await aS(p); } catch (e) { e.message = `EXPECTED ALLOW but denied @ ${w}: ${e.message}`; throw e; } };
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where as qWhere } from "firebase/firestore";

const PROJECT = "demo-mmsa-dua-groups";
const HOST = "127.0.0.1";
const PORT = 8097;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const production = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = process.env.MUTANT_FILE
  ? fs.readFileSync(process.env.MUTANT_FILE, "utf8")
  : fs.readFileSync(path.join(root, "docs/proposals/dua-groups.candidate.rules"), "utf8");

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
const rules = process.env.FULL_RULES_FILE
  ? fs.readFileSync(path.resolve(root, process.env.FULL_RULES_FILE), "utf8")
  : candidate.replace(head, head + "\n" + HELPERS.join("\n") + "\n");
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
assert.deepEqual(matchBlocks, ["duaGroups"], `the candidate must govern exactly duaGroups, saw: ${matchBlocks.join(",")}`);
if (process.env.FULL_RULES_FILE) {
  // the deployment file is today's live file with ONLY the duaGroups block added at the end
  const full = fs.readFileSync(path.resolve(root, process.env.FULL_RULES_FILE), "utf8");
  const i = production.lastIndexOf("  }\n}");
  assert.ok(full.startsWith(production.slice(0, i).trimEnd()), "the deployment file's head is not the live firestore.rules unchanged");
  const block = candidate.slice(candidate.indexOf("    // ====="), candidate.lastIndexOf("  }\n}"));
  assert.ok(full.includes(block), "the deployment file does not carry the candidate's duaGroups block byte for byte");
}

const T = "t1", T2 = "t2";
const ts = new Date("2026-11-13T00:00:00.000Z");
const I17 = (uid) => ({ schemaVersion: 1, createdAt: ts, updatedAt: ts, createdBy: uid });
const NODES = [   // the Dua Lead's nested shape (app/js/dua-group-tree.js): three levels
  { id: "g-aaaaaaaa", name: { en: "Morning", bn: "সকাল" }, kids: [
    { id: "g-bbbbbbbb", name: { en: "After Fajr" }, kids: [
      { id: "g-cccccccc", name: { en: "On waking" }, kids: [] }] }] },
  { id: "g-dddddddd", name: { en: "Travel" }, kids: [] },
];
const withoutLevel3 = [{ ...NODES[0], kids: [{ ...NODES[0].kids[0], kids: [] }] }, NODES[1]];   // a real delete of "On waking"
const grp = (tenantId, ownerKey, uid, over = {}) => ({ tenantId, ownerKey, nodes: NODES, ...I17(uid), ...over });
const id = (a, b) => `${a}__${b}`;
const LONG64 = "p" + "x".repeat(63), LONG65 = "p" + "x".repeat(64);

test("candidate Dua groups Rules: isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
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
      await member("uid-other", "pX", ["student"], T2);
      await member("uid-otherprime", "pQ", ["prime"], T2);
      await setDoc(doc(db, "userIndex", "uid-admin"), { platformAdmin: true });
      const person = (personId, tenantId, over = {}) => setDoc(doc(db, "tenantPeople", personId), { tenantId, ...over });
      await person("pS", T, { authUid: "uid-student" });
      await person("pS2", T, { authUid: "uid-student2" });
      await person("pC", T, { managedByPersonId: "pG" });
      await person("pX", T2, { authUid: "uid-other" });
      await person("pE", "", {});                               // a person row with an EMPTY tenantId (isolates tenantId.size() > 0)
      await person(LONG64, T, {});                              // a 64-character person id (isolates ownerKey.size() <= 64)
      await person(LONG65, T, {});
      await person("admin", T, { authUid: "uid-student" });     // a hand-made person row CALLED "admin" (isolates the admin branch)
      await setDoc(doc(db, "teacherStudentLinks", `${T}__pCT__pS`), { active: true });
    });
    const wipe = async () => env.withSecurityRulesDisabled(async (ctx) => {
      for (const d of (await getDocs(collection(ctx.firestore(), "duaGroups"))).docs) await deleteDoc(d.ref);
    });
    const put = (k, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "duaGroups", k), data));
    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher"), coteacher = db("uid-coteacher");
    const student = db("uid-student"), student2 = db("uid-student2"), guardian = db("uid-guardian");
    const other = db("uid-other"), otherprime = db("uid-otherprime"), stranger = db("uid-nobody"), admin = db("uid-admin");
    const anon = env.unauthenticatedContext().firestore();
    const G = (c, k) => doc(c, "duaGroups", k);
    await env.withSecurityRulesDisabled(async (ctx) => {   // positive control: the collection starts empty, so setDoc is a CREATE
      assert.equal((await getDocs(collection(ctx.firestore(), "duaGroups"))).size, 0);
    });

    // ===== the madrasah's own groups: duaGroups/t1__admin ==============================================================
    const ak = id(T, "admin");
    // --- create: owner / prime / platform admin; no other member, nobody from another madrasah
    for (const [c, uid] of [[teacher, "uid-teacher"], [student, "uid-student"], [guardian, "uid-guardian"], [otherprime, "uid-otherprime"], [stranger, "uid-nobody"]]) {
      await assertFails(setDoc(G(c, ak), grp(T, "admin", uid)));
    }
    await assertFails(setDoc(G(anon, ak), grp(T, "admin", "uid-owner")));
    for (const [c, uid] of [[owner, "uid-owner"], [prime, "uid-prime"], [admin, "uid-admin"]]) {
      await assertSucceeds(setDoc(G(c, ak), grp(T, "admin", uid)));
      await wipe();
    }
    // isolating: the SAME owner in another madrasah's admin doc; paired with that madrasah's own prime
    await assertFails(setDoc(G(owner, id(T2, "admin")), grp(T2, "admin", "uid-owner")));
    await assertSucceeds(setDoc(G(otherprime, id(T2, "admin")), grp(T2, "admin", "uid-otherprime")));
    await wipe();
    // isolating: a person row CALLED "admin" whose authUid is the student -- were "admin" read as a person, the student
    // would pass canRecordFor (isSelfPerson) and personInTenant. The admin branch refuses: the student is not owner/prime.
    await assertFails(setDoc(G(student, ak), grp(T, "admin", "uid-student")));
    await assertSucceeds(setDoc(G(student, id(T, "pS")), grp(T, "pS", "uid-student")));   // paired: their own doc
    await wipe();
    // --- read: every member of the madrasah, by id
    await put(ak, grp(T, "admin", "uid-owner"));
    for (const c of [owner, prime, teacher, coteacher, student, guardian]) await assertSucceeds(getDoc(G(c, ak)));
    await assertFails(getDoc(G(admin, ak)));   // a platform admin who is not a member does not READ it -- the same as duaEdits today
    for (const c of [other, otherprime, stranger, anon]) await assertFails(getDoc(G(c, ak)));     // another madrasah's member, nobody
    await put(id(T2, "admin"), grp(T2, "admin", "uid-otherprime"));
    await assertSucceeds(getDoc(G(other, id(T2, "admin"))));                                     // paired: the same reader, own madrasah
    await assertFails(getDocs(query(collection(student, "duaGroups"), qWhere("tenantId", "==", T))));            // no list
    await assertFails(getDocs(query(collection(student, "duaGroups"), qWhere("tenantId", "==", T), qWhere("ownerKey", "==", "admin"))));
    // --- update: owner / prime; REAL DELETE of a group = nodes without it (and the group inside it)
    await assertSucceeds(updateDoc(G(owner, ak), { nodes: [NODES[1]], updatedAt: ts }));
    await assertSucceeds(updateDoc(G(prime, ak), { nodes: [{ ...NODES[1], name: { en: "Journeys" } }], updatedAt: ts }));   // rename
    for (const c of [teacher, student, guardian, otherprime, stranger]) await assertFails(updateDoc(G(c, ak), { nodes: [], updatedAt: ts }));
    await assertFails(updateDoc(G(owner, ak), { ownerKey: "pS" }));                              // pinned
    await assertFails(updateDoc(G(owner, ak), { tenantId: T2 }));                                // pinned
    await assertFails(updateDoc(G(owner, ak), { createdBy: "uid-prime" }));                      // write-once
    await assertSucceeds(updateDoc(G(owner, ak), { createdBy: "uid-owner" }));
    for (const c of [owner, prime, admin]) await assertFails(deleteDoc(G(c, ak)));               // the DOCUMENT is never deleted (D6)
    await wipe();

    // ===== a person's own groups: duaGroups/t1__pS ======================================================================
    const pk = id(T, "pS");
    // --- create: the person, their guardian, a co-enrolled teacher, owner/prime/admin; nobody else
    await assertFails(setDoc(G(student2, pk), grp(T, "pS", "uid-student2")));     // ANOTHER PERSON of the same madrasah
    await assertFails(setDoc(G(teacher, pk), grp(T, "pS", "uid-teacher")));       // a teacher NOT co-enrolled
    await assertFails(setDoc(G(guardian, pk), grp(T, "pS", "uid-guardian")));     // guardian of someone else
    await assertFails(setDoc(G(otherprime, pk), grp(T, "pS", "uid-otherprime"))); // prime of another madrasah
    await assertFails(setDoc(G(stranger, pk), grp(T, "pS", "uid-nobody")));
    await assertFails(setDoc(G(anon, pk), grp(T, "pS", "uid-student")));
    for (const [c, k, pid, uid] of [[student, pk, "pS", "uid-student"], [coteacher, pk, "pS", "uid-coteacher"],
      [guardian, id(T, "pC"), "pC", "uid-guardian"], [owner, pk, "pS", "uid-owner"], [prime, pk, "pS", "uid-prime"], [admin, pk, "pS", "uid-admin"],
      [student2, id(T, "pS2"), "pS2", "uid-student2"]]) {
      await assertSucceeds(setDoc(G(c, k), grp(T, pid, uid)));
      await wipe();
    }
    // THE ISOLATING CASE: pX for THEMSELVES under another tenant's path (canRecordFor passes; only personInTenant refuses)
    await assertFails(setDoc(G(other, id(T, "pX")), grp(T, "pX", "uid-other")));
    await assertSucceeds(setDoc(G(other, id(T2, "pX")), grp(T2, "pX", "uid-other")));
    await wipe();
    // a person who does not exist: the owner passes canRecordFor, only personInTenant refuses
    await assertFails(setDoc(G(owner, id(T, "pNobody")), grp(T, "pNobody", "uid-owner")));
    await assertSucceeds(setDoc(G(owner, pk), grp(T, "pS", "uid-owner")));
    await wipe();
    // --- shape: each fact differs from an accepted create by the student
    const gb = () => grp(T, "pS", "uid-student");
    await assertFails(setDoc(G(student, pk), { ...gb(), extra: 1 }));                       // hasOnly
    await assertFails(setDoc(G(student, pk), (({ nodes, ...r }) => r)(gb())));              // hasAll (nodes)
    await assertFails(setDoc(G(student, pk), { ...gb(), createdBy: "uid-owner" }));         // createdBy == myUid
    await assertFails(setDoc(G(student, pk), { ...gb(), nodes: { a: 1 } }));                // nodes is list
    await assertFails(setDoc(G(student, pk), { ...gb(), schemaVersion: "1" }));
    await assertFails(setDoc(G(student, pk), { ...gb(), createdAt: "2026-11-13" }));
    await assertFails(setDoc(G(student, pk), { ...gb(), updatedAt: "2026-11-13" }));
    await assertFails(setDoc(G(student, id(T, "pS2")), gb()));                              // doc id != tenantId__ownerKey
    const many = (n) => Array.from({ length: n }, (_, i) => ({ id: `g-${String(i).padStart(8, "0")}`, name: { en: `G${i}` }, kids: [] }));
    await assertFails(setDoc(G(student, pk), { ...gb(), nodes: many(201) }));               // > 200 top-level groups
    await assertSucceeds(setDoc(G(student, pk), { ...gb(), nodes: many(200) }));
    await wipe();
    await assertSucceeds(setDoc(G(student, pk), { ...gb(), nodes: [] }));                   // no groups yet is fine
    await wipe();
    // isolating: pE's own row says tenantId "", so personInTenant("", "pE") and canRecordFor (admin) both pass; only tenantId.size() > 0 refuses
    await assertFails(setDoc(G(admin, id("", "pE")), grp("", "pE", "uid-admin")));
    await assertSucceeds(setDoc(G(admin, pk), grp(T, "pS", "uid-admin")));
    await wipe();
    // ownerKey at most 64 characters: both rows exist in t1, admin passes every role test; only the length differs
    await assertFails(setDoc(G(admin, id(T, LONG65)), grp(T, LONG65, "uid-admin")));
    await assertSucceeds(setDoc(G(admin, id(T, LONG64)), grp(T, LONG64, "uid-admin")));
    await wipe();
    await assertFails(setDoc(G(admin, id(T, "")), grp(T, "", "uid-admin")));                // empty ownerKey
    // --- read: exactly canRecordFor for a person of this madrasah
    await put(pk, gb());
    for (const c of [student, coteacher, owner, prime, admin]) await assertSucceeds(getDoc(G(c, pk)));
    for (const c of [student2, teacher, guardian, otherprime, other, stranger, anon]) await assertFails(getDoc(G(c, pk)));
    await assertSucceeds(getDoc(G(stranger, id(T, "pS2"))));                                 // the probe: a MISSING doc, signed in
    await assertFails(getDoc(G(anon, id(T, "pS2"))));                                        // ...not when signed out
    // no list, not even one filtered to exactly the reader's own tree
    await assertFails(getDocs(query(collection(student, "duaGroups"), qWhere("tenantId", "==", T), qWhere("ownerKey", "==", "pS"))));
    await assertSucceeds(getDoc(G(student, pk)));                                            // paired: the same reader, by id
    await put(id(T, "pX"), grp(T, "pX", "uid-other"));                                       // isolating case for READ
    await assertFails(getDoc(G(other, id(T, "pX"))));
    await put(id(T2, "pX"), grp(T2, "pX", "uid-other"));
    await assertSucceeds(getDoc(G(other, id(T2, "pX"))));
    // --- update
    await assertSucceeds(updateDoc(G(student, pk), { nodes: withoutLevel3, updatedAt: ts }));   // real delete of the level-3 group
    await assertSucceeds(updateDoc(G(coteacher, pk), { nodes: NODES, updatedAt: ts }));
    for (const c of [student2, teacher, guardian, otherprime, stranger]) await assertFails(updateDoc(G(c, pk), { nodes: [], updatedAt: ts }));
    await assertFails(updateDoc(G(student, pk), { createdBy: "uid-owner" }));                // write-once
    await assertSucceeds(updateDoc(G(student, pk), { createdBy: "uid-student" }));
    await assertFails(updateDoc(G(student, pk), { ownerKey: "pS2" }));                       // pinned
    await assertFails(updateDoc(G(student, pk), { tenantId: T2 }));                          // pinned
    await assertFails(updateDoc(G(student, pk), { nodes: many(201) }));
    await assertFails(updateDoc(G(student, pk), { extra: 1 }));
    // a hand-seeded doc with an empty createdBy cannot be updated (isolates createdBy.size() > 0 on update)
    await put(pk, { ...gb(), createdBy: "" });
    await assertFails(updateDoc(G(student, pk), { nodes: [], updatedAt: ts }));
    await put(pk, gb());
    await assertSucceeds(updateDoc(G(student, pk), { nodes: [], updatedAt: ts }));
    // --- delete: never, by anyone who may write it
    for (const c of [student, coteacher, owner, admin]) await assertFails(deleteDoc(G(c, pk)));
    await wipe();
  } finally {
    await env.cleanup();
  }
});
