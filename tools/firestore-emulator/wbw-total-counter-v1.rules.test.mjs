// Issue #206 -- the whole-Qur'an/Juz running word-percentage counter
// (quranWordTotals), executed against the Firestore emulator against the
// ASSEMBLED DEPLOYMENT CANDIDATE -- the text that would actually be pasted
// into the Console -- not the isolated 23 Sep extract. Same reasoning as
// word-progress-v1.rules.test.mjs and deployment-candidate.rules.test.mjs:
// an extract calling helpers it does not itself contain proves only that a
// file parses, never that the REAL, currently-deployed helpers (hasRoleIn,
// myPersonIdIn, isCoEnrolledTeacherOf, isSelfPerson, canRecordFor) still
// produce the intended allow/deny shape once this collection sits beside
// them. Every denial below is paired with an ALLOW differing in exactly one
// fact, per this project's own standing mutation-testing lesson.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-wbw-total-v1";
const HOST = "127.0.0.1";
const PORT = 8098;
const here = path.dirname(fileURLToPath(import.meta.url));
// RULES_FILE lets this same suite run against the isolated 23 Sep extract
// instead, for comparison -- but the ASSEMBLED file is what a real deploy
// means, so it is the default, not an opt-in.
const DEPLOYMENT = "docs/governance/2026-09-24-wbw-total-counter-DEPLOYMENT-candidate.rules";
const RULES_FILE = process.env.RULES_FILE || DEPLOYMENT;
const candidate = fs.readFileSync(path.resolve(here, "../..", RULES_FILE), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

// The deployment candidate must be production PLUS the new block, never a
// smaller file that only knows about quranWordTotals -- the same integrity
// guard word-progress-v1.rules.test.mjs and deployment-candidate.rules.test.mjs
// already run for their own assembled files.
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (RULES_FILE === DEPLOYMENT) {
  for (const required of ["quranWordTotals", "quranWordProgress", "quranWordApprovals", "tenantInvites", "notes"]) {
    assert.ok(matchBlocks.includes(required), `the deployment candidate is missing match /${required}/`);
  }
  const production = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8").split("\n");
  const missing = production.filter((line) => line.trim() && !candidate.includes(line));
  assert.deepEqual(missing, [], `the deployment candidate DROPS ${missing.length} production line(s) -- it would remove live rules`);
} else {
  assert.deepEqual(matchBlocks, ["quranWordTotals"],
    `the isolated extract must govern exactly one collection, saw: ${matchBlocks.join(",")}`);
}

const T = "t1";
const totalsKey = (personId, tenant = T) => `${tenant}__${personId}`;
const totalsDoc = (personId, over = {}) => ({
  contractVersion: "quran-word-total:v1",
  tenantId: T, personId,
  total: 77429,
  known: 0,
  byJuz: { "1": { known: 0, total: 2603 } },
  schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date(),
  ...over,
});

test("wbw-total-counter candidate Rules: isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // p1: an adult with their own login, no guardian -> self.
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      // p2: a managed child of p1.
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2", managedByPersonId: "p1" });
      // p3: another family's child, nobody here guards or teaches them.
      await setDoc(doc(db, "tenantPeople", "p3"), { tenantId: T, authUid: "uid-p3" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { tenantId: T, uid: "uid-p1", personId: "p1", roles: ["guardian"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { tenantId: T, uid: "uid-p2", personId: "p2", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p3`), { tenantId: T, uid: "uid-p3", personId: "p3", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-t9`), { tenantId: T, uid: "uid-t9", personId: "t9", roles: ["teacher"] });
      await setDoc(doc(db, "tenantPeople", "t9"), { tenantId: T, authUid: "uid-t9" });
      // t9 actively teaches p2 only; the link to p3 exists but is inactive.
      await setDoc(doc(db, "teacherStudentLinks", `${T}__t9__p2`), { tenantId: T, active: true });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__t9__p3`), { tenantId: T, active: false });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore(); // guardian of p2, self of p1
    const p2 = env.authenticatedContext("uid-p2").firestore(); // the child
    const p3 = env.authenticatedContext("uid-p3").firestore(); // unrelated
    const t9 = env.authenticatedContext("uid-t9").firestore(); // teaches p2 only
    const anon = env.unauthenticatedContext().firestore();
    let n = 0;
    const ok = async (name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${name}`); };
    const no = async (name, p) => { await assertFails(p); n++; console.log(`  PASS  ${name}`); };

    // --- who may create -----------------------------------------------------
    await ok("self may create their own totals document", (() => {
      const e = totalsDoc("p1");
      return setDoc(doc(p1, "quranWordTotals", totalsKey("p1")), e);
    })());
    await ok("a guardian may create their managed child's totals document", (() => {
      const e = totalsDoc("p2");
      return setDoc(doc(p1, "quranWordTotals", totalsKey("p2")), e);
    })());
    await ok("an active co-enrolled teacher may update their student's totals document", (() => {
      // p2's document already exists (the guardian create above); t9 actively
      // teaches p2 (the seeded teacherStudentLinks doc), so t9 may update it.
      return updateDoc(doc(t9, "quranWordTotals", totalsKey("p2")), { known: 2 });
    })());
    await no("t9 may NOT create p3's totals document (t9's link to p3 is inactive)", (() => {
      const e = totalsDoc("p3");
      return setDoc(doc(t9, "quranWordTotals", totalsKey("p3")), e);
    })());
    await no("a stranger may not create another person's totals document", (() => {
      const e = totalsDoc("p1");
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p1")), e);
    })());
    await no("an anonymous caller may not create a totals document", (() => {
      const e = totalsDoc("p3");
      return setDoc(doc(anon, "quranWordTotals", totalsKey("p3")), e);
    })());

    // --- the create shape must be real, never a client-invented total ------
    await no("total must be exactly 77429 -- a smaller value is refused", (() => {
      const e = totalsDoc("p3", { total: 100 });
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());
    await no("total must be exactly 77429 -- a larger value is refused", (() => {
      const e = totalsDoc("p3", { total: 999999 });
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());
    await no("the contractVersion must be the real one", (() => {
      const e = totalsDoc("p3", { contractVersion: "quran-word-total:v2" });
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());
    await no("known must be a non-negative integer", (() => {
      const e = totalsDoc("p3", { known: -1 });
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());
    await no("byJuz must be a map", (() => {
      const e = totalsDoc("p3", { byJuz: "not-a-map" });
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());
    // PAIRED ALLOW: the same actor, the correct shape, succeeds.
    await ok("...but the correctly-shaped create for the same person succeeds", (() => {
      const e = totalsDoc("p3");
      return setDoc(doc(p3, "quranWordTotals", totalsKey("p3", T)), e);
    })());

    // --- updates: only known/byJuz/updatedAt may move -----------------------
    await ok("self may move `known` on their own document", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { known: 5, updatedAt: new Date() });
    })());
    await ok("self may move a per-juz entry inside `byJuz`", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { "byJuz.1.known": 10 });
    })());
    await no("total can NEVER be changed by update, even to another plausible-looking value", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { total: 77430, known: 6 });
    })());
    await no("tenantId cannot be repointed by update", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { tenantId: "t2" });
    })());
    await no("personId cannot be repointed by update", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { personId: "p9" });
    })());
    await no("an update may not smuggle in a field outside the allowed set", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { known: 7, contractVersion: "quran-word-total:v9" });
    })());
    // PAIRED ALLOW: the same actor, only the allowed fields, still works.
    await ok("...but moving only the allowed fields still works", (() => {
      return updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { known: 8, updatedAt: new Date() });
    })());
    await no("a stranger cannot update another person's totals document", (() => {
      return updateDoc(doc(p3, "quranWordTotals", totalsKey("p1")), { known: 999 });
    })());

    // --- reads ---------------------------------------------------------------
    await ok("self may read their own totals document", getDoc(doc(p1, "quranWordTotals", totalsKey("p1"))));
    await ok("a guardian may read their managed child's totals document", getDoc(doc(p1, "quranWordTotals", totalsKey("p2"))));
    await no("a stranger may not read another person's totals document", getDoc(doc(p3, "quranWordTotals", totalsKey("p1"))));
    await no("an anonymous caller may not read a totals document", getDoc(doc(anon, "quranWordTotals", totalsKey("p1"))));
    await ok("a signed-in caller may read a NONEXISTENT doc (create-vs-update decision, S8-class)",
      getDoc(doc(p3, "quranWordTotals", totalsKey("p9999"))));

    // --- I4/D6: nothing deletes ------------------------------------------
    await no("self may not delete their own totals document", deleteDoc(doc(p1, "quranWordTotals", totalsKey("p1"))));
    await ok("the document is still there and writable afterward", updateDoc(doc(p1, "quranWordTotals", totalsKey("p1")), { known: 9 }));

    console.log(`\n==== wbw-total-counter candidate Rules (${RULES_FILE === DEPLOYMENT ? "assembled deployment file" : "isolated extract"}): ${n} assertions, all as specified ====`);
  } finally {
    await env.cleanup();
  }
});
