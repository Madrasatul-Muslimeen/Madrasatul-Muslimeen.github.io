// PCF J03, Builder round K2 -- the Keys to Understanding Rules CANDIDATE (ayahKeyMarks) on the Firestore emulator.
// Isolated: a demo- project id, 127.0.0.1, and the candidate text itself, never production.
//
// Every denial is paired with an allow differing in ONE fact. Then each check in the candidate is MUTATED, one at a
// time (EVERY occurrence replaced, the count printed), and the matrix must go red for each mutation.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-mmsa-ayah-keys";
const HOST = "127.0.0.1";
const PORT = 8109;
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const candidate = fs.readFileSync(path.join(root, process.env.RULES_FILE || "docs/governance/2026-10-15-ayah-keys-candidate.rules"), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

// The candidate is the live file plus the ayahKeyMarks block: every live line is still there, in order.
test("the candidate is firestore.rules plus the ayahKeyMarks block and nothing else", () => {
  const cand = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < cand.length && cand[k] !== line) k++;
    if (k < cand.length) j = k + 1; else missing.push(line);
  }
  assert.deepEqual(missing, [], "live Rules lines missing from the candidate");
  assert.ok(/match \/ayahKeyMarks\//.test(candidate));
  assert.ok(!/match \/ayahKeyMarks/.test(live), "the live Rules already carry ayahKeyMarks: this candidate is superseded");
});

const T = "t1";
const ENV = (uid, o = {}) => ({ schemaVersion: 1, createdAt: new Date(), updatedAt: new Date(), createdBy: uid, ...o });
const mark = (scope, surah, uid, o = {}) => ({ tenantId: T, scope, surah, entries: { [`ayah:${surah}:1`]: ["hard"] }, ...ENV(uid), ...o });
const without = (obj, ...keys) => { const c = { ...obj }; for (const k of keys) delete c[k]; return c; };

/** Runs the whole matrix against `rules`; returns the names of the cases that did NOT behave. */
async function matrix(rules) {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules } });
  const bad = [];
  const expect = async (name, kind, promise) => {
    try { await (kind === "ok" ? assertSucceeds(promise) : assertFails(promise)); } catch { bad.push(name); }
  };
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const member = (uid, personId, roles, tenant = T) => setDoc(doc(db, "tenantMemberUids", `${tenant}__${uid}`), { tenantId: tenant, uid, personId, roles });
      await member("uid-o1", "o1", ["owner"]);
      await member("uid-tc1", "tc1", ["teacher"]);        // co-enrolled with s1 only
      await member("uid-tc2", "tc2", ["teacher"]);        // co-enrolled with nobody
      await member("uid-s1", "s1", ["student"]);
      await member("uid-s2", "s2", ["student"]);
      await member("uid-g1", "g1", ["guardian"]);          // guardian of s1 only
      await member("uid-x1", "x1", ["owner"], "t2");       // another tenant's owner
      const person = (id, tenant, extra = {}) => setDoc(doc(db, "tenantPeople", id), { personId: id, tenantId: tenant, ...extra });
      await person("o1", T, { authUid: "uid-o1" });
      await person("tc1", T, { authUid: "uid-tc1" });
      await person("tc2", T, { authUid: "uid-tc2" });
      await person("s1", T, { authUid: "uid-s1", managedByPersonId: "g1" });
      await person("s2", T, { authUid: "uid-s2" });
      await person("g1", T, { authUid: "uid-g1" });
      await person("x1", "t2", { authUid: "uid-x1" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__tc1__s1`), { tenantId: T, teacherPersonId: "tc1", studentPersonId: "s1", active: true });
      await setDoc(doc(db, "ayahKeyMarks", `${T}__madrasah__1`), mark("madrasah", 1, "uid-o1"));
      await setDoc(doc(db, "ayahKeyMarks", `${T}__s1__1`), mark("s1", 1, "uid-s1"));
      await setDoc(doc(db, "ayahKeyMarks", `${T}__s2__1`), mark("s2", 1, "uid-s2"));
    });
    const as = (uid) => env.authenticatedContext(uid).firestore();
    const o1 = as("uid-o1"), tc1 = as("uid-tc1"), tc2 = as("uid-tc2"), s1 = as("uid-s1"), s2 = as("uid-s2"), g1 = as("uid-g1"), x1 = as("uid-x1");
    const anon = env.unauthenticatedContext().firestore();
    const K = (db, id) => doc(db, "ayahKeyMarks", id);
    const M = (surah) => `${T}__madrasah__${surah}`;
    const P = (personId, surah) => `${T}__${personId}__${surah}`;

    // --- the madrasah document: who writes (differ in ONE fact: the role)
    await expect("teacher creates the madrasah document", "ok", setDoc(K(tc1, M(2)), mark("madrasah", 2, "uid-tc1")));
    await expect("owner creates the madrasah document", "ok", setDoc(K(o1, M(3)), mark("madrasah", 3, "uid-o1")));
    await expect("STUDENT creates the madrasah document", "no", setDoc(K(s1, M(4)), mark("madrasah", 4, "uid-s1")));
    await expect("GUARDIAN creates the madrasah document", "no", setDoc(K(g1, M(4)), mark("madrasah", 4, "uid-g1")));
    await expect("OTHER-TENANT owner creates this tenant's madrasah document", "no", setDoc(K(x1, M(4)), mark("madrasah", 4, "uid-x1")));
    await expect("anonymous creates the madrasah document", "no", setDoc(K(anon, M(4)), mark("madrasah", 4, "uid-o1")));
    await expect("teacher updates the madrasah document", "ok", updateDoc(K(tc2, M(1)), { "entries.ayah:1:2": ["gharib"], updatedAt: new Date() }));
    await expect("STUDENT updates the madrasah document", "no", updateDoc(K(s1, M(1)), { "entries.ayah:1:2": ["gharib"], updatedAt: new Date() }));

    // --- the madrasah document: who reads
    await expect("member (student) reads the madrasah document", "ok", getDoc(K(s2, M(1))));
    await expect("OTHER-TENANT person reads the madrasah document", "no", getDoc(K(x1, M(1))));
    await expect("anonymous reads the madrasah document", "no", getDoc(K(anon, M(1))));

    // --- a person's own document: the person, vs someone else (differ in ONE fact: whose it is)
    await expect("a student creates their OWN document", "ok", setDoc(K(s1, P("s1", 2)), mark("s1", 2, "uid-s1")));
    await expect("a student creates SOMEONE ELSE's document", "no", setDoc(K(s2, P("s1", 3)), mark("s1", 3, "uid-s2")));
    await expect("a student creates their own document (s2)", "ok", setDoc(K(s2, P("s2", 2)), mark("s2", 2, "uid-s2")));
    await expect("an UNRELATED teacher writes a student's document", "no", setDoc(K(tc2, P("s1", 4)), mark("s1", 4, "uid-tc2")));
    await expect("the CO-ENROLLED teacher writes the student's document", "ok", setDoc(K(tc1, P("s1", 4)), mark("s1", 4, "uid-tc1")));
    await expect("the guardian writes their child's document", "ok", setDoc(K(g1, P("s1", 5)), mark("s1", 5, "uid-g1")));
    await expect("the guardian writes ANOTHER child's document", "no", setDoc(K(g1, P("s2", 5)), mark("s2", 5, "uid-g1")));
    await expect("the owner writes a student's document (canRecordFor)", "ok", setDoc(K(o1, P("s2", 6)), mark("s2", 6, "uid-o1")));
    await expect("OTHER-TENANT owner writes a student's document", "no", setDoc(K(x1, P("s2", 7)), mark("s2", 7, "uid-x1")));
    await expect("anonymous writes a student's document", "no", setDoc(K(anon, P("s2", 7)), mark("s2", 7, "uid-s2")));
    // the person must really belong to the tenant: same writer (the owner), one fact differs (where the person lives)
    await expect("owner writes a document for a person OF this tenant", "ok", setDoc(K(o1, P("g1", 8)), mark("g1", 8, "uid-o1")));
    await expect("owner writes a document for a person of ANOTHER tenant", "no", setDoc(K(o1, P("x1", 8)), mark("x1", 8, "uid-o1")));

    // --- a person's own document: who reads
    await expect("the person reads their own document", "ok", getDoc(K(s1, P("s1", 1))));
    await expect("another student reads it", "no", getDoc(K(s2, P("s1", 1))));
    await expect("the guardian reads their child's document", "ok", getDoc(K(g1, P("s1", 1))));
    await expect("the guardian reads ANOTHER child's document", "no", getDoc(K(g1, P("s2", 1))));
    await expect("the co-enrolled teacher reads the student's document", "ok", getDoc(K(tc1, P("s1", 1))));
    await expect("an unrelated teacher reads it", "no", getDoc(K(tc2, P("s1", 1))));
    await expect("other-tenant owner reads it", "no", getDoc(K(x1, P("s1", 1))));
    await expect("anonymous reads it", "no", getDoc(K(anon, P("s1", 1))));

    // --- a wrong key: scope or surah that does not match the document id
    await expect("right key", "ok", setDoc(K(s1, P("s1", 9)), mark("s1", 9, "uid-s1")));
    await expect("key says s1 but scope field says s2", "no", setDoc(K(s2, P("s1", 10)), mark("s2", 10, "uid-s2")));
    await expect("key says surah 11 but surah field says 12", "no", setDoc(K(s1, P("s1", 11)), mark("s1", 12, "uid-s1")));
    await expect("key names another tenant", "no", setDoc(K(s1, `t9__s1__13`), mark("s1", 13, "uid-s1")));
    await expect("madrasah key with a person's scope field", "no", setDoc(K(tc1, M(14)), mark("s1", 14, "uid-tc1")));
    await expect("surah 114", "ok", setDoc(K(s1, P("s1", 114)), mark("s1", 114, "uid-s1")));
    await expect("surah 115", "no", setDoc(K(s1, P("s1", 115)), mark("s1", 115, "uid-s1")));
    await expect("surah 0", "no", setDoc(K(s1, P("s1", 0)), mark("s1", 0, "uid-s1")));
    await expect("surah a string", "no", setDoc(K(s1, P("s1", 15)), mark("s1", "15", "uid-s1")));

    // --- shape: unknown field, missing field, entries not a map, envelope
    await expect("well-formed create", "ok", setDoc(K(s1, P("s1", 16)), mark("s1", 16, "uid-s1")));
    await expect("an UNKNOWN field", "no", setDoc(K(s1, P("s1", 17)), mark("s1", 17, "uid-s1", { surprise: 1 })));
    await expect("missing entries", "no", setDoc(K(s1, P("s1", 18)), without(mark("s1", 18, "uid-s1"), "entries")));
    await expect("missing tenantId", "no", setDoc(K(s1, P("s1", 19)), without(mark("s1", 19, "uid-s1"), "tenantId")));
    await expect("missing schemaVersion", "no", setDoc(K(s1, P("s1", 20)), without(mark("s1", 20, "uid-s1"), "schemaVersion")));
    await expect("entries a map with an empty list", "ok", setDoc(K(s1, P("s1", 21)), mark("s1", 21, "uid-s1", { entries: { "ayah:21:1": [] } })));
    await expect("entries a list", "no", setDoc(K(s1, P("s1", 22)), mark("s1", 22, "uid-s1", { entries: ["hard"] })));
    await expect("createdAt not a timestamp", "no", setDoc(K(s1, P("s1", 23)), mark("s1", 23, "uid-s1", { createdAt: "yesterday" })));
    await expect("schemaVersion not a number", "no", setDoc(K(s1, P("s1", 24)), mark("s1", 24, "uid-s1", { schemaVersion: "1" })));
    await expect("createdBy is the writer's uid", "ok", setDoc(K(s1, P("s1", 25)), mark("s1", 25, "uid-s1")));
    await expect("createdBy names SOMEONE ELSE", "no", setDoc(K(s1, P("s1", 26)), mark("s1", 26, "uid-s2")));

    // --- update: identity frozen, entries and updatedAt move
    await expect("the person updates their entries", "ok", updateDoc(K(s1, P("s1", 1)), { "entries.ayah:1:2": ["gharib", "hadith"], updatedAt: new Date() }));
    await expect("remove a key: a SHORTER list is stored", "ok", updateDoc(K(s1, P("s1", 1)), { "entries.ayah:1:2": ["hadith"], updatedAt: new Date() }));
    await expect("remove the last key: an EMPTY list is stored", "ok", updateDoc(K(s1, P("s1", 1)), { "entries.ayah:1:2": [], updatedAt: new Date() }));
    await expect("update changes scope", "no", updateDoc(K(s1, P("s1", 1)), { scope: "s2", updatedAt: new Date() }));
    await expect("update changes surah", "no", updateDoc(K(s1, P("s1", 1)), { surah: 2, updatedAt: new Date() }));
    await expect("update changes tenantId", "no", updateDoc(K(s1, P("s1", 1)), { tenantId: "t2", updatedAt: new Date() }));
    await expect("update changes createdBy", "no", updateDoc(K(s1, P("s1", 1)), { createdBy: "uid-s2", updatedAt: new Date() }));
    await expect("update adds an UNKNOWN field", "no", updateDoc(K(s1, P("s1", 1)), { surprise: 1, updatedAt: new Date() }));
    await expect("update makes entries a list", "no", updateDoc(K(s1, P("s1", 1)), { entries: ["x"], updatedAt: new Date() }));
    await expect("another student updates it", "no", updateDoc(K(s2, P("s1", 1)), { "entries.ayah:1:2": ["hard"], updatedAt: new Date() }));
    await expect("the guardian updates their child's document", "ok", updateDoc(K(g1, P("s1", 1)), { "entries.ayah:1:3": ["hard"], updatedAt: new Date() }));
    await expect("update of a document that does not exist is not a create", "no", updateDoc(K(s1, P("s1", 50)), { "entries.ayah:50:1": ["hard"], updatedAt: new Date() }));

    // --- delete: never (each paired with an update on the same document that IS allowed)
    await expect("the person deletes their own document", "no", deleteDoc(K(s1, P("s1", 1))));
    await expect("a teacher deletes the madrasah document", "no", deleteDoc(K(tc1, M(1))));
    await expect("the owner deletes a document", "no", deleteDoc(K(o1, P("s2", 1))));
    await expect("same person document, an update", "ok", updateDoc(K(s2, P("s2", 1)), { "entries.ayah:1:9": ["hard"], updatedAt: new Date() }));
    await expect("same madrasah document, an update", "ok", updateDoc(K(o1, M(1)), { "entries.ayah:1:9": ["hard"], updatedAt: new Date() }));

    // --- the read-before-create probe (a nonexistent document leaks nothing)
    await expect("signed-in read of a missing document", "ok", getDoc(K(x1, P("s1", 99))));
    await expect("anonymous read of a missing document", "no", getDoc(K(anon, P("s1", 99))));
  } finally {
    await env.cleanup();
  }
  return bad;
}

// Each mutation removes or inverts ONE check of the candidate. EVERY occurrence is replaced (a partial mutation proves nothing).
const MUTATIONS = [
  ["madrasah writes open to any member", /\? \(canAdminIdentity\(tenantId\) \|\| isTeacherIn\(tenantId\)\)/g, "? (signedIn() && myRolesIn(tenantId).size() > 0)"],
  ["madrasah writes closed to teachers", /\? \(canAdminIdentity\(tenantId\) \|\| isTeacherIn\(tenantId\)\)/g, "? (canAdminIdentity(tenantId))"],
  ["madrasah reads open to any signed-in person", /\? \(signedIn\(\) && myRolesIn\(tenantId\)\.size\(\) > 0\)/g, "? signedIn()"],
  ["person writes need no canRecordFor", /: \(personInTenant\(tenantId, scope\) && canRecordFor\(tenantId, scope\)\);\n      \}\n      \/\/ Who may read/g, ": personInTenant(tenantId, scope);\n      }\n      // Who may read"],
  ["person writes need no personInTenant", /: \(personInTenant\(tenantId, scope\) && canRecordFor\(tenantId, scope\)\);\n      \}\n      \/\/ Who may read/g, ": canRecordFor(tenantId, scope);\n      }\n      // Who may read"],
  ["person reads need no canRecordFor", /: \(personInTenant\(tenantId, scope\) && canRecordFor\(tenantId, scope\)\);\n      \}\n\n      \/\/ The read-before-create/g, ": personInTenant(tenantId, scope);\n      }\n\n      // The read-before-create"],
  ["person reads need no personInTenant", /: \(personInTenant\(tenantId, scope\) && canRecordFor\(tenantId, scope\)\);\n      \}\n\n      \/\/ The read-before-create/g, ": canRecordFor(tenantId, scope);\n      }\n\n      // The read-before-create"],
  ["the scope word is not special (a person scope can be 'madrasah')", /return scope == 'madrasah'/g, "return false"],
  ["key not bound to tenantId__scope__surah", /&& markKey == d\(\)\.tenantId \+ '__' \+ d\(\)\.scope \+ '__' \+ string\(d\(\)\.surah\)\n/g, "\n"],
  ["unknown fields allowed (hasOnly dropped)", /d\(\)\.keys\(\)\.hasOnly\(\[[^\]]*\]\)\n\s+&& d\(\)\.keys\(\)\.hasAll/g, "true\n            && d().keys().hasAll"],
  ["required fields unchecked (hasAll dropped)", /&& d\(\)\.keys\(\)\.hasAll\(\[[^\]]*\]\)\n/g, "\n"],
  ["surah range unchecked", /&& d\(\)\.surah is int && d\(\)\.surah >= 1 && d\(\)\.surah <= 114\n/g, "\n"],
  ["entries type unchecked", /&& d\(\)\.entries is map\n/g, "\n"],
  ["envelope unchecked", /&& d\(\)\.schemaVersion is number\n\s+&& d\(\)\.createdAt is timestamp[^\n]*\n\s+&& d\(\)\.createdBy is string && d\(\)\.createdBy\.size\(\) > 0;/g, ";"],
  ["createdBy not bound to the writer", /&& d\(\)\.createdBy == myUid\(\);/g, ";"],
  ["delete allowed", /allow delete: if false;/g, "allow delete: if signedIn();"],
  ["scope not frozen on update", /&& d\(\)\.scope == resource\.data\.scope\n/g, "\n"],
  ["surah not frozen on update", /&& d\(\)\.surah == resource\.data\.surah\n/g, "\n"],
  ["tenantId not frozen on update, AND the key binding dropped (the key check alone also pins the tenant, so they go together)", /&& (?:d\(\)\.tenantId == resource\.data\.tenantId|markKey == d\(\)\.tenantId \+ '__' \+ d\(\)\.scope \+ '__' \+ string\(d\(\)\.surah\))\n/g, "\n"],
  ["createdBy not frozen on update", /&& d\(\)\.createdBy == resource\.data\.createdBy;/g, ";"],
  ["list open to any signed-in person", /allow list: if ayahKeysMayRead\(resource\.data\.tenantId, resource\.data\.scope\);/g, "allow list: if signedIn();"],
  ["read open to any signed-in person", /allow get: if ayahKeysMayRead\(resource\.data\.tenantId, resource\.data\.scope\);/g, "allow get: if signedIn();"],
  ["nonexistent-document read closed to everyone", /allow get: if signedIn\(\) && !exists\([^;]*\);/g, "allow get: if false;"],
];

test("the candidate behaves exactly as the matrix says", async () => {
  const bad = await matrix(candidate);
  assert.deepEqual(bad, [], `cases that did not behave: ${bad.join(" | ")}`);
});

for (const [name, re, replacement] of MUTATIONS) {
  test(`MUTATION: ${name} -> the matrix goes red`, async () => {
    const start = candidate.indexOf("KEYS TO UNDERSTANDING (PCF J03");
    assert.ok(start > 0);
    const head = candidate.slice(0, start), block = candidate.slice(start);
    const count = (block.match(re) || []).length;
    console.log(`    [${name}] occurrences replaced: ${count}`);
    assert.ok(count >= 1, "the mutation matched nothing -- it proves nothing");
    const bad = await matrix(head + block.replace(re, replacement));
    assert.ok(bad.length >= 1, "the matrix stayed green under this mutation: that check is untested");
  });
}
