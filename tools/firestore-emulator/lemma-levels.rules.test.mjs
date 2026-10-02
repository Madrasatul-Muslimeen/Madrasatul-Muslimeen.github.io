// Decision 58 (2 Oct 2026) -- the DEPLOYMENT CANDIDATE that lets Basic and
// Depth have their own lemma-wide claims and counters, executed against the
// Firestore emulator. Isolated: a demo- project id, 127.0.0.1, and the
// candidate text itself (the file the Owner would paste into the Console),
// never production.
//
// Every denial is paired with an allow differing in exactly ONE fact (the
// level, the person, or the field), so a rule refusing everything for the
// wrong reason cannot pass. Run mutants with MUTANT=1 RULES_FILE=<file>.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-lemma-levels";
const HOST = "127.0.0.1";
const PORT = 8107;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// The candidate is the live file with exactly two lines widened (and a
// comment): every other live line is still there, in order. Either state
// passes -- before publication (exactly the two `== 'wbw'` lines missing) or
// after it (the files are the same). A MUTANT run skips this file check.
if (!process.env.MUTANT) {
  const WIDENED = "          && request.resource.data.get('level', '') == 'wbw'";
  const COMMENT = "    // A created lane must say what it is, and only `wbw` may be written --";
  const candLines = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < candLines.length && candLines[k] !== line) k++;
    if (k < candLines.length) j = k + 1; else missing.push(line);
  }
  const published = live.trimEnd() === candidate.trimEnd();
  assert.deepEqual(missing, published ? [] : [COMMENT, WIDENED, WIDENED], `live Rules lines missing from the candidate: ${JSON.stringify(missing)}`);
}

const T = "t1";
const ID = (personId, level, lemmaId) => `${T}__${personId}__${level}__${lemmaId}`;
const ENVELOPE = () => ({ schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date() });
const learner = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-progress:v1", lane: "learner",
  tenantId: T, personId, level, lemmaId, state: "achieved", at: "2026-10-02T10:00:00.000Z", byPersonId: personId, ...ENVELOPE(), ...o });
const supervisor = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-progress:v1", lane: "supervisor",
  tenantId: T, personId, level, lemmaId, review: "pending", at: null, byPersonId: null, note: null, forState: null, forClaimAt: null,
  history: [], historyTruncated: 0, ...ENVELOPE(), ...o });
const counter = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-occurrence-counter:v1",
  tenantId: T, personId, level, lemmaId, individuallyKnownByJuz: {}, ...ENVELOPE(), ...o });
const total = (personId, o = {}) => ({ contractVersion: "quran-word-total:v1", tenantId: T, personId, total: 77429, known: 0, byJuz: {}, ...ENVELOPE(), ...o });

// Real keys: a meaning-group id, a root, and a lemma.
const GROUP = "رحم:2", ROOT = "رحم", LEMMA = "رَّحْمَٰن";

test("decision 58 candidate: Basic and Depth lemma-wide claims and counters", async () => {
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
      await setDoc(doc(db, "quranLemmaProgress", ID("p2", "basic", GROUP)), learner("p2", "basic", GROUP));
      await setDoc(doc(db, "quranLemmaOccurrenceCounters", ID("p2", "depth", ROOT)), counter("p2", "depth", ROOT));
    });
    const p1 = env.authenticatedContext("uid-p1").firestore();  // guardian of p2
    const p2 = env.authenticatedContext("uid-p2").firestore();  // the child
    const p3 = env.authenticatedContext("uid-p3").firestore();  // unrelated
    const t9 = env.authenticatedContext("uid-t9").firestore();  // teaches p2

    // 1. Learner lanes: each new level allowed, an unknown level refused (one fact apart).
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "wbw", LEMMA)), learner("p2", "wbw", LEMMA)));
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "basic", "رحم:1")), learner("p2", "basic", "رحم:1")));
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "depth", ROOT)), learner("p2", "depth", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "deep", ROOT)), learner("p2", "deep", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "x1", ROOT)), learner("p2", "", ROOT)));
    // ...and the person binding still holds at the new levels.
    await assertSucceeds(setDoc(doc(p1, "quranLemmaProgress", ID("p2", "depth", "علم")), learner("p2", "depth", "علم", { byPersonId: "p1" })));
    await assertFails(setDoc(doc(p3, "quranLemmaProgress", ID("p2", "depth", "قول")), learner("p2", "depth", "قول", { byPersonId: "p3" })));
    await assertSucceeds(setDoc(doc(p3, "quranLemmaProgress", ID("p3", "depth", "قول")), learner("p3", "depth", "قول")));

    // 2. Supervisor lanes at the new levels: a teacher of p2 may, the child may not.
    await assertSucceeds(setDoc(doc(t9, "quranLemmaApprovals", ID("p2", "basic", GROUP)), supervisor("p2", "basic", GROUP)));
    await assertFails(setDoc(doc(p2, "quranLemmaApprovals", ID("p2", "depth", ROOT)), supervisor("p2", "depth", ROOT)));
    await assertSucceeds(setDoc(doc(t9, "quranLemmaApprovals", ID("p2", "depth", ROOT)), supervisor("p2", "depth", ROOT)));
    await assertFails(setDoc(doc(t9, "quranLemmaApprovals", ID("p2", "deep", "كتب")), supervisor("p2", "deep", "كتب")));

    // 3. The level of an existing claim never changes; its state may.
    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "basic", GROUP)), { state: "learning", at: "y", byPersonId: "p2" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "basic", GROUP)), { level: "depth" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "basic", GROUP)), { lemmaId: "رحم:1" }));
    await assertFails(deleteDoc(doc(p2, "quranLemmaProgress", ID("p2", "basic", GROUP))));

    // 4. Counters at the new levels.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "basic", GROUP)), counter("p2", "basic", GROUP)));
    await assertFails(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "deep", GROUP)), counter("p2", "deep", GROUP)));
    await assertFails(updateDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "depth", ROOT)), { level: "basic" }));
    await assertFails(setDoc(doc(p3, "quranLemmaOccurrenceCounters", ID("p2", "depth", "علم")), counter("p2", "depth", "علم")));
    await assertSucceeds(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "depth", "علم")), counter("p2", "depth", "علم")));

    // 5. Reading at the new levels follows the person, as WbW does.
    await assertSucceeds(getDoc(doc(p1, "quranLemmaProgress", ID("p2", "basic", GROUP))));
    await assertFails(getDoc(doc(p3, "quranLemmaProgress", ID("p2", "basic", GROUP))));

    // 6. Per-level running totals need NO change: a level document passes the
    //    live quranWordTotals rule as it stands, and its level cannot change.
    await assertSucceeds(setDoc(doc(p2, "quranWordTotals", `${T}__p2__basic`), total("p2", { level: "basic" })));
    await assertSucceeds(setDoc(doc(p2, "quranWordTotals", `${T}__p2__depth`), total("p2", { level: "depth" })));
    await assertSucceeds(updateDoc(doc(p2, "quranWordTotals", `${T}__p2__basic`), { known: 12, byJuz: { "1": 12 }, updatedAt: new Date() }));
    await assertFails(updateDoc(doc(p2, "quranWordTotals", `${T}__p2__basic`), { level: "depth" }));
    await assertFails(setDoc(doc(p3, "quranWordTotals", `${T}__p2__depth2`), total("p2", { level: "depth" })));
  } finally {
    await env.cleanup();
  }
});
