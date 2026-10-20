// PCF MSA J48 round 2 (the Owner's tick 3A, 20 Oct 2026) -- the DEPLOYMENT CANDIDATE that adds quranVocabReview, the
// Vocabulary module's review schedule kept in the account, executed against the Firestore emulator. Isolated: a demo-
// project id, 127.0.0.1, and the candidate text itself (the file the Owner would paste into the Console), never
// production.
//
// Every denial is paired with an allow differing in exactly ONE fact. Run against the LIVE Rules with
// MUTANT=1 RULES_FILE=firestore.rules: the allows must then FAIL (the collection does not exist there).
// Proven 20 Oct 2026 by removing each check of the block in turn (MUTANT=1 RULES_FILE=<a copy without it>); every
// removal failed at the assertion that check guards: the key binding (line "another key"), contractVersion, hasOnly
// on create, the I17 envelope, create's canRecordFor, `words is map` on create, update's canRecordFor, update's
// affectedKeys, `words is map` on update, a delete allowed, and reading by anyone signed in.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-mmsa-vocab-review";
const HOST = "127.0.0.1";
const PORT = 8110;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-20-vocab-review-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// The candidate is the live file with ONE block added, and nothing else changed: take that block out and the live
// file is what is left, byte for byte. Before publication; or after it (the files are then the same); or published
// and the live file since extended by another published rule (the block is then in the live file too).
if (!process.env.MUTANT) {
  const START = "\n    // ---------------------------------------------------------------------\n    // PCF MSA J48 round 2";
  const END = "never by the document going.\n    }\n";
  const i = candidate.indexOf(START), j = candidate.indexOf(END, i);
  assert.ok(i > 0 && j > i, "the candidate carries the quranVocabReview block");
  const block = candidate.slice(i, j + END.length);
  assert.equal(block.split("\n").length - 1, 31, "the block is 31 lines");
  assert.ok(block.includes("match /quranVocabReview/{reviewKey}"), "the block is the quranVocabReview rule");
  const published = live.includes(block);
  if (!published) assert.equal(candidate.slice(0, i) + candidate.slice(j + END.length), live, "take the block out and the candidate IS today's live Rules");
}

const T = "t1";
const KEY = (personId) => `${T}__${personId}`;
const ENVELOPE = () => ({ schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date() });
const review = (personId, o = {}) => ({ contractVersion: "quran-vocab-review:v1", tenantId: T, personId,
  words: { "وَعَدَ": { b: 1, due: "2026-10-21", r: "right", at: "2026-10-20T01:00:00.000Z", n: 1 } }, ...ENVELOPE(), ...o });

test("J48 round 2 candidate: quranVocabReview", async () => {
  const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate } });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2", managedByPersonId: "p1" });
      await setDoc(doc(db, "tenantPeople", "p3"), { tenantId: T, authUid: "uid-p3" });
      await setDoc(doc(db, "tenantPeople", "t9"), { tenantId: T, authUid: "uid-t9" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { tenantId: T, uid: "uid-p1", personId: "p1", roles: ["guardian"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { tenantId: T, uid: "uid-p2", personId: "p2", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p3`), { tenantId: T, uid: "uid-p3", personId: "p3", roles: ["student"] });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-t9`), { tenantId: T, uid: "uid-t9", personId: "t9", roles: ["teacher"] });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__t9__p2`), { tenantId: T, active: true });
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();  // guardian of p2
    const p2 = env.authenticatedContext("uid-p2").firestore();  // the child
    const p3 = env.authenticatedContext("uid-p3").firestore();  // unrelated
    const t9 = env.authenticatedContext("uid-t9").firestore();  // teaches p2
    const anon = env.unauthenticatedContext().firestore();

    // 0. Reading a schedule that does not exist yet (the client reads before it creates): allowed when signed in.
    await assertSucceeds(getDoc(doc(p2, "quranVocabReview", KEY("p2"))));
    await assertFails(getDoc(doc(anon, "quranVocabReview", KEY("p2"))));

    // 1. Create: the student's own, under its own key. The same data under another key is refused (the key binds
    //    the document to its tenant and person).
    await assertFails(setDoc(doc(p2, "quranVocabReview", `${T}__p9`), review("p2")));
    await assertSucceeds(setDoc(doc(p2, "quranVocabReview", KEY("p2")), review("p2")));

    // 2. Who: an unrelated student may not create someone else's; may create their own. A guardian and a teacher of
    //    the student may (canRecordFor, the same people as every word mark).
    await assertFails(setDoc(doc(p3, "quranVocabReview", KEY("p1")), review("p1")));
    await assertSucceeds(setDoc(doc(p3, "quranVocabReview", KEY("p3")), review("p3")));
    await env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(ctx.firestore(), "quranVocabReview", KEY("p2"))); });
    await assertSucceeds(setDoc(doc(p1, "quranVocabReview", KEY("p2")), review("p2")));
    await env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(ctx.firestore(), "quranVocabReview", KEY("p2"))); });
    await assertSucceeds(setDoc(doc(t9, "quranVocabReview", KEY("p2")), review("p2")));

    // 3. What: each refusal one fact away from an allowed create (p3's own key, freshly cleared each time).
    const fresh = async () => env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(ctx.firestore(), "quranVocabReview", KEY("p3"))); });
    await fresh(); await assertFails(setDoc(doc(p3, "quranVocabReview", KEY("p3")), review("p3", { contractVersion: "quran-vocab-review:v2" })));
    await fresh(); await assertFails(setDoc(doc(p3, "quranVocabReview", KEY("p3")), review("p3", { words: "x" })));
    await fresh(); await assertFails(setDoc(doc(p3, "quranVocabReview", KEY("p3")), review("p3", { known: true })));
    await fresh(); const noBy = review("p3"); delete noBy.createdBy; await assertFails(setDoc(doc(p3, "quranVocabReview", KEY("p3")), noBy));
    await fresh(); await assertSucceeds(setDoc(doc(p3, "quranVocabReview", KEY("p3")), review("p3")));

    // 4. Update: only `words` and `updatedAt` move; who it belongs to never changes; an outsider never writes.
    const ref = doc(p2, "quranVocabReview", KEY("p2"));
    await assertSucceeds(updateDoc(ref, { words: { "وَعَدَ": { b: 2, due: "2026-10-23", r: "right", at: "x", n: 2 } }, updatedAt: new Date() }));
    await assertFails(updateDoc(ref, { personId: "p3" }));
    await assertFails(updateDoc(ref, { tenantId: "t2" }));
    await assertFails(updateDoc(ref, { known: true }));
    await assertFails(updateDoc(ref, { words: 5 }));
    await assertFails(updateDoc(doc(p3, "quranVocabReview", KEY("p2")), { words: {}, updatedAt: new Date() }));
    await assertSucceeds(updateDoc(doc(p1, "quranVocabReview", KEY("p2")), { words: {}, updatedAt: new Date() }));

    // 5. Nothing is deleted, not even by the student.
    await assertFails(deleteDoc(ref));

    // 6. Reading follows the person.
    await assertSucceeds(getDoc(doc(p1, "quranVocabReview", KEY("p2"))));
    await assertSucceeds(getDoc(doc(t9, "quranVocabReview", KEY("p2"))));
    await assertFails(getDoc(doc(p3, "quranVocabReview", KEY("p2"))));
  } finally {
    await env.cleanup();
  }
});
