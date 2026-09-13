// MAP Phase 3 -- the CANDIDATE word-progress Rules, executed against the
// Firestore emulator. Isolated: this never loads firestore.rules and never
// touches a production endpoint or project id.
//
// The Phase 4 Activity candidate was REJECTED because 9 of its 13 logged
// denials turned out to be refusals by Firestore's 1000-expression budget
// rather than by the security logic -- denials that sat inside assertFails
// and so looked correct while proving nothing, and that would later refuse
// legitimate writes as a document grew. Every denial below is therefore
// paired with a matching ALLOW that differs in exactly one fact, so a rule
// that refused everything for the wrong reason cannot pass this suite. And
// because no rule here walks a map, the cost of a write does not grow with
// the number of words a person has learned -- which is checked explicitly,
// by writing a lane with 128 entries and then writing one more.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-word-progress-v1";
const HOST = "127.0.0.1";
const PORT = 8086;
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = fs.readFileSync(path.resolve(here, "../../tests/firestore/word-progress-v1.proposed.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
// The candidate must be an ISOLATED extract, not the deployed file with two
// blocks bolted on -- otherwise a green run here would read as evidence about
// rules this suite never examined. Checked by what it CONTAINS, not by whether
// the words "firestore.rules" appear: the candidate's own comments name the
// deployed file on purpose, and the first version of this guard matched that
// prose and failed itself.
// `databases` is the structural wrapper every ruleset opens with, not a
// collection, so it is excluded rather than the pattern being loosened.
const matchBlocks = [...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]).filter((n) => n !== "databases");
assert.deepEqual([...new Set(matchBlocks)].sort(), ["quranWordApprovals", "quranWordProgress"],
  `the candidate must govern exactly the two Phase 3 collections, saw: ${matchBlocks.join(",")}`);
assert.ok(!/Version: 2026-07-30|S8-class fix|match \/tenantInvites\//.test(candidate),
  "the candidate must not be a copy of the deployed production rules");

const T = "t1";
const LEARNER = (personId, surah, ayah) => `${T}__${personId}__wbw__${surah}_${ayah}`;
const laneDoc = (lane, personId, surah = 1, ayah = 1, entries = { "1": { s: "l", at: "2026-09-13T10:00:00.000Z", by: personId } }) => ({
  contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1",
  lane, tenantId: T, personId, level: "wbw", surah, ayah, entries,
  schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date(),
});

test("candidate word-progress Rules: isolated allow/deny cases", async () => {
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
      // t9 actively teaches p2 only.
      await setDoc(doc(db, "teacherStudentLinks", `${T}__t9__p2`), { tenantId: T, active: true });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__t9__p3`), { tenantId: T, active: false });
      await setDoc(doc(db, "quranWordProgress", LEARNER("p2", 2, 5)), laneDoc("learner", "p2", 2, 5));
      await setDoc(doc(db, "quranWordApprovals", LEARNER("p2", 2, 5)), laneDoc("supervisor", "p2", 2, 5));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();   // guardian of p2
    const p2 = env.authenticatedContext("uid-p2").firestore();   // the child
    const p3 = env.authenticatedContext("uid-p3").firestore();   // unrelated child
    const t9 = env.authenticatedContext("uid-t9").firestore();   // teaches p2
    const anon = env.unauthenticatedContext().firestore();

    // --- 1. The learner lane ---------------------------------------------
    await assertFails(getDoc(doc(anon, "quranWordProgress", LEARNER("p2", 2, 5))));
    await assertSucceeds(getDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5))));
    await assertSucceeds(getDoc(doc(p1, "quranWordProgress", LEARNER("p2", 2, 5))));
    await assertSucceeds(getDoc(doc(t9, "quranWordProgress", LEARNER("p2", 2, 5))));
    // PAIRED DENIAL: an unrelated child of the same tenant cannot read it.
    await assertFails(getDoc(doc(p3, "quranWordProgress", LEARNER("p2", 2, 5))));

    await assertSucceeds(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { "entries.2": { s: "a", at: "x", by: "p2" } }));
    await assertSucceeds(updateDoc(doc(t9, "quranWordProgress", LEARNER("p2", 2, 5)), { "entries.3": { s: "l", at: "x", by: "t9" } }));
    await assertFails(updateDoc(doc(p3, "quranWordProgress", LEARNER("p2", 2, 5)), { "entries.4": { s: "a", at: "x", by: "p3" } }));

    // --- 2. THE SPLIT: only a supervisor writes approvals -----------------
    // This pair is the whole point of the two-collection design. Same actor,
    // same document id, same shape -- only the collection differs.
    await assertSucceeds(updateDoc(doc(t9, "quranWordApprovals", LEARNER("p2", 2, 5)), { "entries.1": { r: "c", by: "t9", at: "x" } }));
    await assertFails(updateDoc(doc(p2, "quranWordApprovals", LEARNER("p2", 2, 5)), { "entries.1": { r: "c", by: "p2", at: "x" } }));
    // ...and the child can still READ the decision about their own work.
    await assertSucceeds(getDoc(doc(p2, "quranWordApprovals", LEARNER("p2", 2, 5))));
    // The guardian may decide; an unrelated member may not.
    await assertSucceeds(updateDoc(doc(p1, "quranWordApprovals", LEARNER("p2", 2, 5)), { "entries.1": { r: "r", by: "p1", at: "x" } }));
    await assertFails(updateDoc(doc(p3, "quranWordApprovals", LEARNER("p2", 2, 5)), { "entries.1": { r: "c", by: "p3", at: "x" } }));

    // An adult acting for THEMSELF may claim but never self-approve.
    await assertSucceeds(setDoc(doc(p1, "quranWordProgress", LEARNER("p1", 3, 1)), laneDoc("learner", "p1", 3, 1)));
    await assertFails(setDoc(doc(p1, "quranWordApprovals", LEARNER("p1", 3, 1)), laneDoc("supervisor", "p1", 3, 1)));

    // --- 3. A teacher is scoped to the students they actually teach ------
    await assertSucceeds(setDoc(doc(t9, "quranWordProgress", LEARNER("p2", 4, 1)), laneDoc("learner", "p2", 4, 1)));
    // PAIRED DENIAL: p3's link exists but is active:false.
    await assertFails(setDoc(doc(t9, "quranWordProgress", LEARNER("p3", 4, 1)), laneDoc("learner", "p3", 4, 1)));
    await assertFails(setDoc(doc(t9, "quranWordApprovals", LEARNER("p3", 4, 1)), laneDoc("supervisor", "p3", 4, 1)));

    // --- 4. Identity is write-once ---------------------------------------
    await assertFails(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { personId: "p3" }));
    await assertFails(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { tenantId: "t2" }));
    await assertFails(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { surah: 9 }));
    await assertFails(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { lane: "supervisor" }));
    // PAIRED ALLOW: the same actor changing only a word's state still works.
    await assertSucceeds(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { "entries.9": { s: "a", at: "x", by: "p2" } }));

    // --- 5. The deferred levels are refused at the DATABASE ---------------
    await assertFails(setDoc(doc(p2, "quranWordProgress", `${T}__p2__basic__5_1`), { ...laneDoc("learner", "p2", 5, 1), level: "basic" }));
    await assertFails(setDoc(doc(p2, "quranWordProgress", `${T}__p2__depth__5_1`), { ...laneDoc("learner", "p2", 5, 1), level: "depth" }));
    // PAIRED ALLOW: wbw at the same coordinates is fine.
    await assertSucceeds(setDoc(doc(p2, "quranWordProgress", LEARNER("p2", 5, 1)), laneDoc("learner", "p2", 5, 1)));

    // A create must declare both contracts and real coordinates.
    await assertFails(setDoc(doc(p2, "quranWordProgress", LEARNER("p2", 6, 1)), { ...laneDoc("learner", "p2", 6, 1), contractVersion: "quran-word-progress:v2" }));
    await assertFails(setDoc(doc(p2, "quranWordProgress", LEARNER("p2", 7, 1)), { ...laneDoc("learner", "p2", 7, 1), surah: 999 }));
    // A learner cannot create a document that CLAIMS to be the other lane.
    await assertFails(setDoc(doc(p2, "quranWordProgress", LEARNER("p2", 8, 1)), laneDoc("supervisor", "p2", 8, 1)));

    // --- 6. I4/D6: nothing deletes ----------------------------------------
    // A delete has no legitimate counterpart to pair against -- nobody may
    // ever do it -- so the pairing is made on the ACTOR instead: each of
    // these three is refused a delete on a document they have ALREADY been
    // allowed to write above. The operation is the only thing that changed,
    // so a ruleset that refused them for some other reason would have
    // refused those writes too.
    await assertFails(deleteDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5))));
    await assertSucceeds(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 5)), { "entries.11": { s: "l", at: "x", by: "p2" } }));
    await assertFails(deleteDoc(doc(t9, "quranWordApprovals", LEARNER("p2", 2, 5))));
    await assertSucceeds(updateDoc(doc(t9, "quranWordApprovals", LEARNER("p2", 2, 5)), { "entries.11": { r: "c", by: "t9", at: "x" } }));
    await assertFails(deleteDoc(doc(p1, "quranWordProgress", LEARNER("p1", 3, 1))));
    await assertSucceeds(updateDoc(doc(p1, "quranWordProgress", LEARNER("p1", 3, 1)), { "entries.2": { s: "a", at: "x", by: "p1" } }));

    // --- 7. THE EXPRESSION-BUDGET TEST, which is why this suite exists ----
    // The Phase 4 candidate's denials were contaminated by the 1000-expression
    // limit, so a FULL document had to be refused for a reason nobody chose.
    // Fill a lane to the longest ayah in the dataset (128 words) and then
    // write one more word: if the cost of a write grew with the document,
    // this would fail, and it is an assertSucceeds precisely so that
    // exhaustion shows up as a FAILURE rather than as a tidy green denial.
    const big = {};
    for (let p = 1; p <= 128; p++) big[String(p)] = { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p2" };
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "quranWordProgress", LEARNER("p2", 2, 282)), laneDoc("learner", "p2", 2, 282, big));
      await setDoc(doc(ctx.firestore(), "quranWordApprovals", LEARNER("p2", 2, 282)), laneDoc("supervisor", "p2", 2, 282, big));
    });
    await assertSucceeds(updateDoc(doc(p2, "quranWordProgress", LEARNER("p2", 2, 282)), { "entries.64": { s: "l", at: "x", by: "p2" } }));
    await assertSucceeds(updateDoc(doc(t9, "quranWordApprovals", LEARNER("p2", 2, 282)), { "entries.64": { r: "c", by: "t9", at: "x" } }));
    // And a full document is still refused for the RIGHT reason.
    await assertFails(updateDoc(doc(p3, "quranWordProgress", LEARNER("p2", 2, 282)), { "entries.64": { s: "l", at: "x", by: "p3" } }));
  } finally {
    await env.cleanup();
  }
});
