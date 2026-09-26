// Issue #301 -- the CANDIDATE lemma-progress Rules, executed against the
// Firestore emulator. Isolated: this never loads firestore.rules and never
// touches a production endpoint or project id.
//
// Same discipline as word-progress-v1.rules.test.mjs, for the identical
// reason: the Phase 4 Activity candidate was REJECTED because most of its
// logged denials turned out to be refusals by Firestore's 1000-expression
// budget rather than by the security logic. Every denial below is therefore
// paired with a matching ALLOW that differs in exactly one fact, so a rule
// that refused everything for the wrong reason cannot pass this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-lemma-progress-v1";
const HOST = "127.0.0.1";
const PORT = 8101;
const here = path.dirname(fileURLToPath(import.meta.url));
// RULES_FILE lets this same suite run against the ASSEMBLED DEPLOYMENT
// CANDIDATE -- the text that would actually be pasted into the Console --
// instead of the isolated extract. Same pattern as word-progress-v1.rules.
// test.mjs, note-foundation-v1.rules.test.mjs and journey-map-v1.rules.test.mjs.
const EXTRACT = "docs/governance/2026-09-26-lemma-progress-rules-candidate.rules";
const RULES_FILE = process.env.RULES_FILE || EXTRACT;
const againstDeployment = RULES_FILE !== EXTRACT;
const candidate = fs.readFileSync(path.resolve(here, "../..", RULES_FILE), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");
// The candidate must be an ISOLATED extract, not the deployed file with the
// new block bolted on -- otherwise a green run here would read as evidence
// about rules this suite never examined.
const matchBlocks = [...new Set([...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]))].filter((n) => n !== "databases");
if (againstDeployment) {
  // The deployment candidate is production PLUS this issue's two
  // collections, so the integrity guards are the opposite ones: it must
  // carry the whole live ruleset, and it must add to firestore.rules rather
  // than replace it.
  for (const required of ["quranLemmaProgress", "quranLemmaApprovals", "quranWordProgress", "tenantInvites"]) {
    assert.ok(matchBlocks.includes(required), `the deployment candidate is missing match /${required}/`);
  }
  const production = fs.readFileSync(path.resolve(here, "../../firestore.rules"), "utf8").split("\n");
  const missing = production.filter((line) => line.trim() && !candidate.includes(line));
  assert.deepEqual(missing, [], `the deployment candidate DROPS ${missing.length} production line(s) -- it would remove live rules`);
} else {
  assert.deepEqual(matchBlocks.sort(), ["quranLemmaApprovals", "quranLemmaProgress"],
    `the candidate must govern exactly the two issue #301 collections, saw: ${matchBlocks.join(",")}`);
  assert.ok(!/match \/tenantInvites\//.test(candidate),
    "the candidate must not be a copy of the deployed production rules");
}

const T = "t1";
const LEMMA = (personId, lemmaId) => `${T}__${personId}__wbw__${lemmaId}`;
const ENVELOPE = { schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date() };
const learnerDoc = (personId, lemmaId = "لَمَّا", overrides = {}) => ({
  contractVersion: "quran-lemma-progress:v1", lane: "learner",
  tenantId: T, personId, level: "wbw", lemmaId,
  state: "learning", at: "2026-09-26T10:00:00.000Z", byPersonId: personId,
  ...ENVELOPE, ...overrides,
});
const supervisorDoc = (personId, lemmaId = "لَمَّا", overrides = {}) => ({
  contractVersion: "quran-lemma-progress:v1", lane: "supervisor",
  tenantId: T, personId, level: "wbw", lemmaId,
  review: "pending", at: null, byPersonId: null, note: null, forState: null, forClaimAt: null,
  history: [], historyTruncated: 0,
  ...ENVELOPE, ...overrides,
});

test("candidate lemma-progress Rules: isolated allow/deny cases, mutation-paired", async () => {
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
      await setDoc(doc(db, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), learnerDoc("p2"));
      await setDoc(doc(db, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), supervisorDoc("p2"));
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();   // guardian of p2
    const p2 = env.authenticatedContext("uid-p2").firestore();   // the child
    const p3 = env.authenticatedContext("uid-p3").firestore();   // unrelated child
    const t9 = env.authenticatedContext("uid-t9").firestore();   // teaches p2
    const anon = env.unauthenticatedContext().firestore();

    // --- 1. The learner lane ---------------------------------------------
    await assertFails(getDoc(doc(anon, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));
    await assertSucceeds(getDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));
    await assertSucceeds(getDoc(doc(p1, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));
    await assertSucceeds(getDoc(doc(t9, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));
    // PAIRED DENIAL: an unrelated child of the same tenant cannot read it.
    await assertFails(getDoc(doc(p3, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));

    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { state: "achieved", at: "x", byPersonId: "p2" }));
    await assertSucceeds(updateDoc(doc(t9, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { state: "learning", at: "y", byPersonId: "t9" }));
    await assertFails(updateDoc(doc(p3, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { state: "achieved", at: "z", byPersonId: "p3" }));

    // --- 2. THE SPLIT: only a supervisor writes approvals -----------------
    // Same actor, same document id, same shape -- only the collection
    // differs. This pairing is the whole point of the two-collection design.
    await assertSucceeds(updateDoc(doc(t9, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), { review: "confirmed", byPersonId: "t9", at: "x" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), { review: "confirmed", byPersonId: "p2", at: "x" }));
    // ...and the child can still READ the decision about their own work.
    await assertSucceeds(getDoc(doc(p2, "quranLemmaApprovals", LEMMA("p2", "لَمَّا"))));
    // The guardian may decide; an unrelated member may not.
    await assertSucceeds(updateDoc(doc(p1, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), { review: "returned", byPersonId: "p1", at: "x" }));
    await assertFails(updateDoc(doc(p3, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), { review: "confirmed", byPersonId: "p3", at: "x" }));

    // An adult acting for THEMSELF may claim but never self-approve.
    await assertSucceeds(setDoc(doc(p1, "quranLemmaProgress", LEMMA("p1", "كَتَبَ")), learnerDoc("p1", "كَتَبَ")));
    await assertFails(setDoc(doc(p1, "quranLemmaApprovals", LEMMA("p1", "كَتَبَ")), supervisorDoc("p1", "كَتَبَ")));

    // --- 3. A teacher is scoped to the students they actually teach ------
    await assertSucceeds(setDoc(doc(t9, "quranLemmaProgress", LEMMA("p2", "قَالَ")), learnerDoc("p2", "قَالَ")));
    // PAIRED DENIAL: p3's link exists but is active:false.
    await assertFails(setDoc(doc(t9, "quranLemmaProgress", LEMMA("p3", "قَالَ")), learnerDoc("p3", "قَالَ")));
    await assertFails(setDoc(doc(t9, "quranLemmaApprovals", LEMMA("p3", "قَالَ")), supervisorDoc("p3", "قَالَ")));

    // --- 4. Identity is write-once -----------------------------------------
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { personId: "p3" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { tenantId: "t2" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { lemmaId: "قَالَ" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { lane: "supervisor" }));
    // PAIRED ALLOW: the same actor changing only the lemma's own state still works.
    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { state: "achieved", at: "w", byPersonId: "p2" }));

    // --- 5. THE DEFERRED LEVELS are refused at the DATABASE ----------------
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", `${T}__p2__basic__قَالَ`), { ...learnerDoc("p2", "قَالَ"), level: "basic" }));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", `${T}__p2__depth__قَالَ`), { ...learnerDoc("p2", "قَالَ"), level: "depth" }));
    // PAIRED ALLOW: wbw at the same lemma is fine.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "قَالَ2")), learnerDoc("p2", "قَالَ2")));

    // A create must declare the real contract and a real lemma id.
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "قَالَ3")), { ...learnerDoc("p2", "قَالَ3"), contractVersion: "quran-lemma-progress:v2" }));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "قَالَ4")), { ...learnerDoc("p2", "قَالَ4"), lemmaId: "" }));
    // A learner cannot create a document that CLAIMS to be the other lane.
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "قَالَ5")), supervisorDoc("p2", "قَالَ5")));

    // --- 6. I4/D6: nothing deletes ------------------------------------------
    // A delete has no legitimate counterpart to pair against -- nobody may
    // ever do it -- so the pairing is on the ACTOR instead: each of these is
    // refused a delete on a document they were ALREADY allowed to write above.
    await assertFails(deleteDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا"))));
    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", LEMMA("p2", "لَمَّا")), { state: "learning", at: "v", byPersonId: "p2" }));
    await assertFails(deleteDoc(doc(t9, "quranLemmaApprovals", LEMMA("p2", "لَمَّا"))));
    await assertSucceeds(updateDoc(doc(t9, "quranLemmaApprovals", LEMMA("p2", "لَمَّا")), { review: "confirmed", byPersonId: "t9", at: "u" }));
    await assertFails(deleteDoc(doc(p1, "quranLemmaProgress", LEMMA("p1", "كَتَبَ"))));
    await assertSucceeds(updateDoc(doc(p1, "quranLemmaProgress", LEMMA("p1", "كَتَبَ")), { state: "achieved", at: "t", byPersonId: "p1" }));
  } finally {
    await env.cleanup();
  }
});
