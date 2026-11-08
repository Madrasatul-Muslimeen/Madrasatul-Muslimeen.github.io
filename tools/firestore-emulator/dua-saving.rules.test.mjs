// PCF MSA J104 (Dua) -- the CANDIDATE Dua-saving Rules (docs/proposals/dua-saving.candidate.rules: duaPlans D10,
// duaEdits D03/D05, duaShares D15), executed against the Firestore emulator. Isolated: never loads firestore.rules as the
// ruleset, never touches a production project id.
//
// The ruleset under test = the candidate's own three match blocks (read from the candidate file, so it cannot drift from a
// copy) + the DEPLOYED helper functions lifted by name out of firestore.rules (so a helper changing there changes what is
// tested here). Every denial is paired with an allow differing in ONE fact.
//   npx firebase emulators:exec --only firestore --project demo-mmsa-dua-saving --config dua-saving.firebase.json "node --test dua-saving.rules.test.mjs"
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails as aF, assertSucceeds as aS } from "@firebase/rules-unit-testing";
const where = () => new Error().stack.split("\n").find((l) => l.includes("dua-saving.rules.test.mjs") && !/at (assertFails|assertSucceeds|where)/.test(l))?.trim();
const assertFails = async (p) => { const w = where(); try { return await aF(p); } catch (e) { e.message = `EXPECTED DENY but allowed @ ${w}: ${e.message}`; throw e; } };
const assertSucceeds = async (p) => { const w = where(); try { return await aS(p); } catch (e) { e.message = `EXPECTED ALLOW but denied @ ${w}: ${e.message}`; throw e; } };
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where as qWhere } from "firebase/firestore";

const PROJECT = "demo-mmsa-dua-saving";
const HOST = "127.0.0.1";
const PORT = 8092;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

const production = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const candidate = process.env.MUTANT_FILE
  ? fs.readFileSync(process.env.MUTANT_FILE, "utf8")
  : fs.readFileSync(path.join(root, "docs/proposals/dua-saving.candidate.rules"), "utf8");

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
assert.deepEqual(matchBlocks, ["duaPlans", "duaEdits", "duaShares"], `the candidate must govern exactly the three Dua collections, saw: ${matchBlocks.join(",")}`);

const T = "t1", T2 = "t2";
const ts = new Date("2026-11-08T00:00:00.000Z");
const I17 = (uid) => ({ schemaVersion: 1, createdAt: ts, updatedAt: ts, createdBy: uid });
const plan = (tenantId, personId, uid, over = {}) => ({ tenantId, personId, marks: { 12: "today", 40: "urgent" }, important: ["12"], ...I17(uid), ...over });
const edit = (tenantId, duaKey, uid, over = {}) => ({
  tenantId, duaKey, title: { en: "On waking", bn: "ঘুম থেকে উঠে" }, placements: [{ group: "occasions", part: "1", order: 2 }], hidden: false,
  ...(duaKey.startsWith("new-") ? { added: { ar: "اللَّهُمَّ", source: "Hisn al-Muslim 1" } } : {}), ...I17(uid), ...over,
});
const share = (tenantId, uid, over = {}) => ({ tenantId, duaKey: "12", where: "whatsapp", whoFor: "family", occasion: "Jumu'ah", sharedAt: ts, ...I17(uid), ...over });
const id = (a, b) => `${a}__${b}`;

test("candidate Dua-saving Rules: isolated allow/deny cases", async () => {
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
      await setDoc(doc(db, "teacherStudentLinks", `${T}__pCT__pS`), { active: true });
    });
    const wipe = async () => env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const c of ["duaPlans", "duaEdits", "duaShares"]) {
        for (const d of (await getDocs(collection(db, c))).docs) await deleteDoc(d.ref);
      }
    });
    const put = (c, k, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), c, k), data));
    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher"), coteacher = db("uid-coteacher");
    const student = db("uid-student"), student2 = db("uid-student2"), guardian = db("uid-guardian");
    const other = db("uid-other"), otherprime = db("uid-otherprime"), stranger = db("uid-nobody"), admin = db("uid-admin");
    const anon = env.unauthenticatedContext().firestore();
    const P = (c, k) => doc(c, "duaPlans", k), E = (c, k) => doc(c, "duaEdits", k), S = (c, k) => doc(c, "duaShares", k);
    await env.withSecurityRulesDisabled(async (ctx) => {   // positive control: the collections start empty, so setDoc is a CREATE
      for (const c of ["duaPlans", "duaEdits", "duaShares"]) assert.equal((await getDocs(collection(ctx.firestore(), c))).size, 0);
    });

    // ===== duaPlans (D10) ==============================================================================================
    // --- create: the person, their guardian, a co-enrolled teacher, owner/prime/admin; nobody else
    await assertFails(setDoc(P(student2, id(T, "pS")), plan(T, "pS", "uid-student2")));     // another student
    await assertFails(setDoc(P(teacher, id(T, "pS")), plan(T, "pS", "uid-teacher")));       // a teacher NOT co-enrolled
    await assertFails(setDoc(P(guardian, id(T, "pS")), plan(T, "pS", "uid-guardian")));     // guardian of someone else
    await assertFails(setDoc(P(otherprime, id(T, "pS")), plan(T, "pS", "uid-otherprime"))); // prime of another madrasah
    await assertFails(setDoc(P(stranger, id(T, "pS")), plan(T, "pS", "uid-nobody")));
    await assertFails(setDoc(P(anon, id(T, "pS")), plan(T, "pS", "uid-student")));
    for (const [c, k, pid, uid] of [[student, id(T, "pS"), "pS", "uid-student"], [coteacher, id(T, "pS"), "pS", "uid-coteacher"],
      [guardian, id(T, "pC"), "pC", "uid-guardian"], [owner, id(T, "pS"), "pS", "uid-owner"], [prime, id(T, "pS"), "pS", "uid-prime"], [admin, id(T, "pS"), "pS", "uid-admin"]]) {
      await assertSucceeds(setDoc(P(c, k), plan(T, pid, uid)));
      await wipe();
    }
    // THE ISOLATING CASE: pX for THEMSELVES under another tenant's path (canRecordFor passes; only personInTenant refuses)
    await assertFails(setDoc(P(other, id(T, "pX")), plan(T, "pX", "uid-other")));
    await assertSucceeds(setDoc(P(other, id(T2, "pX")), plan(T2, "pX", "uid-other")));
    await wipe();
    // --- shape: each fact differs from an accepted create by the student
    const pb = () => plan(T, "pS", "uid-student");
    const pk = id(T, "pS");
    await assertFails(setDoc(P(student, pk), { ...pb(), extra: 1 }));                       // hasOnly
    await assertFails(setDoc(P(student, pk), (({ important, ...r }) => r)(pb())));          // hasAll (important)
    await assertFails(setDoc(P(student, pk), (({ marks, ...r }) => r)(pb())));              // hasAll (marks)
    await assertFails(setDoc(P(student, pk), { ...pb(), createdBy: "uid-owner" }));         // createdBy == myUid
    await assertFails(setDoc(P(student, pk), { ...pb(), marks: ["today"] }));               // marks is map
    await assertFails(setDoc(P(student, pk), { ...pb(), important: { 12: true } }));        // important is list
    await assertFails(setDoc(P(student, pk), { ...pb(), schemaVersion: "1" }));
    await assertFails(setDoc(P(student, pk), { ...pb(), createdAt: "2026-11-08" }));
    await assertFails(setDoc(P(student, pk), { ...pb(), updatedAt: "2026-11-08" }));
    await assertFails(setDoc(P(student, id(T, "pS2")), pb()));                              // doc id != tenantId__personId
    await assertFails(setDoc(P(admin, id("", "pS")), plan("", "pS", "uid-admin")));         // empty tenantId (admin passes every role test)
    // isolating: pE's own row says tenantId "", so personInTenant("", "pE") and canRecordFor (admin) both pass; only tenantId.size() > 0 refuses
    await assertFails(setDoc(P(admin, id("", "pE")), plan("", "pE", "uid-admin")));
    await assertFails(setDoc(P(admin, id(T, "")), plan(T, "", "uid-admin")));               // empty personId
    const bigMap = Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [String(i), "next"]));
    const bigList = Array.from({ length: 5001 }, (_, i) => String(i));
    await assertFails(setDoc(P(student, pk), { ...pb(), marks: bigMap }));                  // > 5000 marks
    await assertFails(setDoc(P(student, pk), { ...pb(), important: bigList }));             // > 5000 important
    await assertSucceeds(setDoc(P(student, pk), { ...pb(), marks: Object.fromEntries(Object.entries(bigMap).slice(0, 5000)), important: bigList.slice(0, 5000) }));
    await wipe();
    await assertSucceeds(setDoc(P(admin, pk), plan(T, "pS", "uid-admin")));                 // pairs the empty-tenant/person denials
    await wipe();
    await assertSucceeds(setDoc(P(student, pk), { ...pb(), marks: {}, important: [] }));    // empty is fine
    await wipe();
    // --- read
    await put("duaPlans", pk, pb());
    for (const c of [student, coteacher, owner, prime, admin]) await assertSucceeds(getDoc(P(c, pk)));
    for (const c of [student2, teacher, guardian, otherprime, other, stranger, anon]) await assertFails(getDoc(P(c, pk)));
    await assertSucceeds(getDoc(P(stranger, id(T, "pS2"))));                                 // the probe: a MISSING doc, signed in
    await assertFails(getDoc(P(anon, id(T, "pS2"))));                                        // ...not when signed out
    await assertFails(getDocs(query(collection(student, "duaPlans"), qWhere("tenantId", "==", T))));   // no list
    // ...not even a list filtered to exactly the reader's own plan (the shape an `allow list` would let through)
    await assertFails(getDocs(query(collection(student, "duaPlans"), qWhere("tenantId", "==", T), qWhere("personId", "==", "pS"))));
    await assertSucceeds(getDoc(P(student, pk)));                                            // paired: the same reader, by id
    await put("duaPlans", id(T, "pX"), plan(T, "pX", "uid-other"));                          // isolating case for READ
    await assertFails(getDoc(P(other, id(T, "pX"))));
    await put("duaPlans", id(T2, "pX"), plan(T2, "pX", "uid-other"));
    await assertSucceeds(getDoc(P(other, id(T2, "pX"))));
    // --- update
    await assertSucceeds(updateDoc(P(student, pk), { marks: { 12: "memorised" }, updatedAt: ts }));
    await assertSucceeds(updateDoc(P(coteacher, pk), { marks: { 12: "revising" }, updatedAt: ts }));
    for (const c of [student2, teacher, guardian, otherprime, stranger]) await assertFails(updateDoc(P(c, pk), { marks: {}, updatedAt: ts }));
    await assertFails(updateDoc(P(student, pk), { createdBy: "uid-owner" }));                // write-once
    await assertSucceeds(updateDoc(P(student, pk), { createdBy: "uid-student" }));
    await assertFails(updateDoc(P(student, pk), { personId: "pS2" }));                       // pinned
    await assertFails(updateDoc(P(student, pk), { tenantId: T2 }));                          // pinned
    await assertFails(updateDoc(P(student, pk), { marks: bigMap }));
    await assertFails(updateDoc(P(student, pk), { extra: 1 }));
    // a hand-seeded doc with an empty createdBy cannot be updated (isolates createdBy.size() > 0 on update)
    await put("duaPlans", pk, { ...pb(), createdBy: "" });
    await assertFails(updateDoc(P(student, pk), { marks: {}, updatedAt: ts }));
    await put("duaPlans", pk, pb());
    await assertSucceeds(updateDoc(P(student, pk), { marks: {}, updatedAt: ts }));
    // --- delete: never, by anyone who may write it
    for (const c of [student, coteacher, owner, admin]) await assertFails(deleteDoc(P(c, pk)));
    await wipe();

    // ===== duaEdits (D03, D05) =========================================================================================
    const ek = id(T, "12"), nk = id(T, "new-abc123");
    // --- create: owner / prime / admin only
    for (const [c, uid] of [[teacher, "uid-teacher"], [student, "uid-student"], [guardian, "uid-guardian"], [otherprime, "uid-otherprime"], [stranger, "uid-nobody"]]) {
      await assertFails(setDoc(E(c, ek), edit(T, "12", uid)));
    }
    await assertFails(setDoc(E(anon, ek), edit(T, "12", "uid-owner")));
    for (const [c, uid] of [[owner, "uid-owner"], [prime, "uid-prime"], [admin, "uid-admin"]]) {
      await assertSucceeds(setDoc(E(c, ek), edit(T, "12", uid)));
      await wipe();
    }
    await assertSucceeds(setDoc(E(owner, nk), edit(T, "new-abc123", "uid-owner")));          // ADD a dua (D03)
    await wipe();
    // --- shape
    const eb = () => edit(T, "12", "uid-owner");
    await assertFails(setDoc(E(owner, ek), { ...eb(), extra: 1 }));                          // hasOnly
    await assertFails(setDoc(E(owner, ek), (({ hidden, ...r }) => r)(eb())));                // hasAll (hidden)
    await assertFails(setDoc(E(owner, ek), (({ placements, ...r }) => r)(eb())));            // hasAll (placements)
    await assertFails(setDoc(E(owner, ek), (({ title, ...r }) => r)(eb())));                 // hasAll (title)
    await assertFails(setDoc(E(owner, ek), { ...eb(), createdBy: "uid-prime" }));
    await assertFails(setDoc(E(owner, ek), { ...eb(), hidden: "no" }));                      // hidden is bool
    await assertFails(setDoc(E(owner, ek), { ...eb(), placements: "occasions" }));           // placements is list
    await assertFails(setDoc(E(owner, ek), { ...eb(), placements: Array.from({ length: 51 }, (_, i) => ({ group: "g", order: i })) }));
    await assertSucceeds(setDoc(E(owner, ek), { ...eb(), placements: Array.from({ length: 50 }, (_, i) => ({ group: "g", order: i })) }));
    await wipe();
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: "On waking" }));                // title is map
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: { en: "x", ar: "y" } }));       // only en / bn
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: { en: "x".repeat(301) } }));    // en ≤ 300
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: { bn: "x".repeat(301) } }));    // bn ≤ 300
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: { en: 5 } }));
    await assertFails(setDoc(E(owner, ek), { ...eb(), title: { bn: 5 } }));
    await assertSucceeds(setDoc(E(owner, ek), { ...eb(), title: { en: "x".repeat(300), bn: "y".repeat(300) } }));
    await wipe();
    await assertSucceeds(setDoc(E(owner, ek), { ...eb(), title: {} }));                      // no title yet
    await wipe();
    await assertFails(setDoc(E(owner, id(T, "abc")), edit(T, "abc", "uid-owner")));          // duaKey: a number or new-<id>
    await assertFails(setDoc(E(owner, id(T, "new-ab")), edit(T, "new-ab", "uid-owner")));    // new- id too short
    await assertFails(setDoc(E(owner, id(T, "1234567")), edit(T, "1234567", "uid-owner")));  // number too long
    await assertFails(setDoc(E(owner, id(T, "13")), eb()));                                  // doc id != tenantId__duaKey
    await assertFails(setDoc(E(owner, ek), { ...eb(), added: { ar: "x" } }));                // `added` on an EXISTING dua
    await assertFails(setDoc(E(owner, nk), (({ added, ...r }) => r)(edit(T, "new-abc123", "uid-owner"))));   // a new dua WITHOUT `added`
    await assertFails(setDoc(E(owner, nk), { ...edit(T, "new-abc123", "uid-owner"), added: "text" }));      // added is map
    await assertFails(setDoc(E(owner, nk), { ...edit(T, "new-abc123", "uid-owner"), added: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`f${i}`, 1])) }));
    await assertSucceeds(setDoc(E(owner, nk), { ...edit(T, "new-abc123", "uid-owner"), added: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`f${i}`, 1])) }));
    await wipe();
    await assertFails(setDoc(E(admin, id("", "12")), edit("", "12", "uid-admin")));          // empty tenantId
    await assertFails(setDoc(E(owner, id(T2, "12")), edit(T2, "12", "uid-owner")));          // owner of t1 writing t2
    await assertFails(setDoc(E(owner, ek), { ...eb(), schemaVersion: "1" }));
    await assertFails(setDoc(E(owner, ek), { ...eb(), createdAt: "x" }));
    await assertFails(setDoc(E(owner, ek), { ...eb(), updatedAt: "x" }));
    // --- read: every member of the madrasah, by id or by a tenantId list
    await put("duaEdits", ek, eb());
    for (const c of [owner, prime, teacher, student, guardian]) await assertSucceeds(getDoc(E(c, ek)));
    for (const c of [other, otherprime, stranger, anon]) await assertFails(getDoc(E(c, ek)));
    await assertSucceeds(getDoc(E(stranger, id(T, "99"))));                                   // probe on a missing doc
    await assertFails(getDoc(E(anon, id(T, "99"))));
    await assertSucceeds(getDocs(query(collection(student, "duaEdits"), qWhere("tenantId", "==", T))));
    await assertFails(getDocs(query(collection(other, "duaEdits"), qWhere("tenantId", "==", T))));      // another madrasah's member
    await assertFails(getDocs(collection(student, "duaEdits")));                              // an unfiltered list
    // --- update: hide, rename, move (owner/prime); pinned keys
    await assertSucceeds(updateDoc(E(owner, ek), { hidden: true, updatedAt: ts }));          // "delete" = hide (I4)
    await assertSucceeds(updateDoc(E(prime, ek), { hidden: false, title: { en: "Waking up" }, updatedAt: ts }));   // bring back, rename
    for (const c of [teacher, student, otherprime, stranger]) await assertFails(updateDoc(E(c, ek), { hidden: true, updatedAt: ts }));
    await assertFails(updateDoc(E(owner, ek), { duaKey: "13" }));
    await assertFails(updateDoc(E(owner, ek), { tenantId: T2 }));
    await assertFails(updateDoc(E(owner, ek), { createdBy: "uid-prime" }));
    await assertSucceeds(updateDoc(E(owner, ek), { createdBy: "uid-owner" }));
    await assertFails(updateDoc(E(owner, ek), { extra: 1 }));
    await put("duaEdits", ek, { ...eb(), createdBy: "" });
    await assertFails(updateDoc(E(owner, ek), { hidden: true, updatedAt: ts }));
    await put("duaEdits", ek, eb());
    await assertSucceeds(updateDoc(E(owner, ek), { hidden: true, updatedAt: ts }));
    for (const c of [owner, prime, admin]) await assertFails(deleteDoc(E(c, ek)));
    await wipe();

    // ===== duaShares (D15) =============================================================================================
    const sh = (c) => collection(c, "duaShares");
    for (const [c, uid] of [[teacher, "uid-teacher"], [student, "uid-student"], [guardian, "uid-guardian"], [otherprime, "uid-otherprime"], [stranger, "uid-nobody"]]) {
      await assertFails(setDoc(S(c, "s1"), share(T, uid)));
    }
    await assertFails(setDoc(S(anon, "s1"), share(T, "uid-owner")));
    for (const [c, uid] of [[owner, "uid-owner"], [prime, "uid-prime"], [admin, "uid-admin"]]) await assertSucceeds(addDoc(sh(c), share(T, uid)));
    const sb = () => share(T, "uid-owner");
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), extra: 1 }));
    await assertFails(setDoc(S(owner, "s2"), (({ occasion, ...r }) => r)(sb())));
    await assertFails(setDoc(S(owner, "s2"), (({ sharedAt, ...r }) => r)(sb())));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), createdBy: "uid-prime" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), where: "telegram" }));               // where: closed list
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), whoFor: "everyone" }));              // whoFor: closed list
    for (const w of ["whatsapp", "facebook", "email", "print", "masjidBoard", "other"]) await assertSucceeds(setDoc(S(owner, `w-${w}`), { ...sb(), where: w }));
    for (const w of ["family", "students", "teachers", "masjidCommunity", "public", "other"]) await assertSucceeds(setDoc(S(owner, `f-${w}`), { ...sb(), whoFor: w }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), occasion: "x".repeat(301) }));
    await assertSucceeds(setDoc(S(owner, "s3"), { ...sb(), occasion: "x".repeat(300) }));
    await assertSucceeds(setDoc(S(owner, "s4"), { ...sb(), occasion: "" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), occasion: 5 }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), sharedAt: "2026-11-08" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), duaKey: "abc" }));
    await assertSucceeds(setDoc(S(owner, "s5"), { ...sb(), duaKey: "new-abc123" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), tenantId: T2 }));                    // owner of t1 recording in t2
    await assertFails(setDoc(S(admin, "s2"), share("", "uid-admin")));                       // empty tenantId
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), schemaVersion: "1" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), createdAt: "x" }));
    await assertFails(setDoc(S(owner, "s2"), { ...sb(), updatedAt: "x" }));
    // --- read: owner / prime only
    await put("duaShares", "seed", sb());
    for (const c of [owner, prime, admin]) await assertSucceeds(getDoc(S(c, "seed")));
    for (const c of [teacher, student, guardian, otherprime, stranger, anon]) await assertFails(getDoc(S(c, "seed")));
    await assertSucceeds(getDocs(query(sh(prime), qWhere("tenantId", "==", T))));
    await assertFails(getDocs(query(sh(teacher), qWhere("tenantId", "==", T))));
    await assertFails(getDocs(query(sh(otherprime), qWhere("tenantId", "==", T))));
    await assertFails(getDocs(sh(owner)));                                                    // unfiltered list
    // --- never updated, never deleted, even by those who created it
    await assertFails(updateDoc(S(owner, "seed"), { occasion: "Eid", updatedAt: ts }));
    for (const c of [owner, prime, admin]) await assertFails(deleteDoc(S(c, "seed")));
    await wipe();
  } finally {
    await env.cleanup();
  }
});
