// PCF MSA J106 S3 part 2 -- the CANDIDATE hadithNames Rules, executed against the Firestore emulator. Isolated: this never
// loads firestore.rules and never touches a production endpoint or project id.
//
// Every denial is paired with an ALLOW that differs in exactly ONE fact (the actor, the tenant, the field, the size or the
// operation), so a ruleset that refused everything for the wrong reason cannot pass this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-hadith-names-v1";
const HOST = "127.0.0.1";
const PORT = 8088;
const here = path.dirname(fileURLToPath(import.meta.url));
const EXTRACT = "tests/firestore/hadith-names-v1.proposed.rules";
// MUTANT_FILE (absolute path) runs this suite against a deliberately broken copy of the extract: every mutation in
// hadith-names-v1.mutate.sh must turn this suite red.
const candidate = process.env.MUTANT_FILE
  ? fs.readFileSync(process.env.MUTANT_FILE, "utf8")
  : fs.readFileSync(path.resolve(here, "../..", EXTRACT), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
assert.deepEqual(matchBlocks, ["hadithNames"], `the candidate must govern exactly hadithNames, saw: ${matchBlocks.join(",")}`);
const T = "t1";
const T2 = "t2";
const nameEntry = (bn, over = {}) => ({ bn, status: "active", updatedAt: "2026-11-14T00:00:00.000Z", updatedBy: "pO", ...over });
const namesDoc = (tenantId, over = {}) => ({
  tenantId, schemaVersion: 1, createdBy: "uid-owner", createdAt: new Date("2026-11-14T00:00:00.000Z"),
  updatedAt: new Date("2026-11-14T00:00:00.000Z"), names: { "0256Bukhari_Sahih_JK000110-ara1": nameEntry("সহীহ বুখারী") }, ...over,
});
const many = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, nameEntry("ক")]));

test("candidate hadithNames Rules: isolated allow/deny cases", async () => {
  assert.ok(candidate.includes("match /hadithNames/"), "the extract has the hadithNames block");
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.clearFirestore();
    // Positive control: the document under test is really absent, so the setDoc calls below are creates.
    await env.withSecurityRulesDisabled(async (ctx) => {
      assert.equal((await getDoc(doc(ctx.firestore(), "hadithNames", T))).exists(), false, "hadithNames/t1 must not exist before the create cases");
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
      await member("uid-other", "pX", ["prime"], T2);   // a prime of ANOTHER madrasah only
      await setDoc(doc(db, "userIndex", "uid-admin"), { platformAdmin: true });
      await setDoc(doc(db, "hadithNames", T2), namesDoc(T2, { createdBy: "uid-other" }));
    });
    const db = (uid) => env.authenticatedContext(uid).firestore();
    const owner = db("uid-owner"), prime = db("uid-prime"), teacher = db("uid-teacher");
    const student = db("uid-student"), guardian = db("uid-guardian"), other = db("uid-other");
    const stranger = db("uid-nobody"), admin = db("uid-admin");
    const anon = env.unauthenticatedContext().firestore();

    // --- 1. Create: owner/prime only; the identity and the shape are checked --------------------------------
    await assertFails(setDoc(doc(teacher, "hadithNames", T), namesDoc(T, { createdBy: "uid-teacher" })));
    await assertFails(setDoc(doc(student, "hadithNames", T), namesDoc(T, { createdBy: "uid-student" })));
    await assertFails(setDoc(doc(other, "hadithNames", T), namesDoc(T, { createdBy: "uid-other" })));   // prime, but of t2
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T2)));                                 // wrong tenantId field
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { schemaVersion: 2 })));
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { createdBy: "uid-prime" })));      // createdBy must be me
    await assertFails(setDoc(doc(owner, "hadithNames", T), (({ createdBy, ...rest }) => rest)(namesDoc(T))));
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { createdAt: "2026-11-14T00:00:00.000Z" })));   // not a timestamp
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { names: "x" })));                  // names is not a map
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { stray: 1 })));                    // a field the shape does not have
    await assertFails(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { names: many(3001) })));           // over the cap
    await assertSucceeds(setDoc(doc(owner, "hadithNames", T), namesDoc(T, { names: many(3000) })));         // PAIRED: exactly the cap is allowed
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(`hadithNames/${T}`).delete(); });
    await assertSucceeds(setDoc(doc(prime, "hadithNames", T), namesDoc(T, { createdBy: "uid-prime" })));  // a prime creates it just as well
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(`hadithNames/${T}`).delete(); });
    await assertSucceeds(setDoc(doc(owner, "hadithNames", T), namesDoc(T)));                              // the same create, right in every fact

    // --- 2. Read: any member of THIS madrasah ----------------------------------------------------------------
    for (const reader of [owner, prime, teacher, student, guardian, admin]) await assertSucceeds(getDoc(doc(reader, "hadithNames", T)));
    await assertFails(getDoc(doc(other, "hadithNames", T)));
    await assertSucceeds(getDoc(doc(other, "hadithNames", T2)));   // the same actor, own tenant
    await assertFails(getDoc(doc(stranger, "hadithNames", T)));
    await assertFails(getDoc(doc(anon, "hadithNames", T)));

    // --- 3. Update: owner/prime change `names` (one name, dotted) ------------------------------------------
    await assertSucceeds(updateDoc(doc(prime, "hadithNames", T), { "names.s_book2": nameEntry("কিতাবুল ঈমান"), updatedAt: "a" }));
    await assertSucceeds(updateDoc(doc(owner, "hadithNames", T), { "names.s_book2": nameEntry("কিতাবুল ঈমান", { status: "retired" }), updatedAt: "b" }));
    for (const writer of [teacher, student, guardian, other]) {
      await assertFails(updateDoc(doc(writer, "hadithNames", T), { "names.s_book3": nameEntry("x"), updatedAt: "c" }));   // PAIRED with the two above: only the actor differs
    }

    // --- 4. Identity is write-once, and no stray field can be added -----------------------------------------
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { tenantId: T2 }));
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { createdBy: "uid-prime" }));
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { createdAt: "2020-01-01" }));
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { schemaVersion: 2 }));
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { names: null }));
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { names: "not a map" }));   // a string has a size() too: only `is map` refuses it
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { stray: "x" }));                              // the tightening over hadithSubjects
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { "names.s_book4": nameEntry("y"), stray: "x" }));   // a good edit carrying a stray field
    await assertFails(updateDoc(doc(owner, "hadithNames", T), { names: many(3001) }));                      // over the cap
    await assertSucceeds(updateDoc(doc(owner, "hadithNames", T), { names: many(3000) }));                   // PAIRED: exactly the cap
    await assertSucceeds(updateDoc(doc(owner, "hadithNames", T), { schemaVersion: 1 }));                    // PAIRED: an unchanged pin is no change
    await assertSucceeds(updateDoc(doc(owner, "hadithNames", T), { updatedAt: "w" }));                      // PAIRED: only updatedAt

    // --- 5. I4/D6: nothing deletes ---------------------------------------------------------------------------
    await assertFails(deleteDoc(doc(owner, "hadithNames", T)));
    await assertFails(deleteDoc(doc(prime, "hadithNames", T)));
    await assertFails(deleteDoc(doc(admin, "hadithNames", T)));
    await assertSucceeds(getDoc(doc(owner, "hadithNames", T)));
  } finally {
    await env.cleanup();
  }
});
