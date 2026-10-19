// PCF MSA J39 (19 Oct 2026) -- the DEPLOYMENT CANDIDATE that adds a fifth word level, `tasrif` (the Word card's
// Tasrif tab), executed against the Firestore emulator. Isolated: a demo- project id, 127.0.0.1, and the candidate
// text itself (the file the Owner would paste into the Console), never production.
//
// Every denial is paired with an allow differing in exactly ONE fact (the level, or the person). Run against the
// LIVE Rules with MUTANT=1 RULES_FILE=firestore.rules: the tasrif allows must then FAIL.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-tasrif-level";
const HOST = "127.0.0.1";
const PORT = 8109;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-19-tasrif-level-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// The candidate is the live file with exactly three lines widened (and a two-line comment): every other live line
// is still there, in order. Either state passes -- before publication, or after it (the files are the same), or
// published and the live file since extended by another published rule.
if (!process.env.MUTANT) {
  const OLD = "          && request.resource.data.get('level', '') in ['wbw', 'basic', 'intermediate', 'depth']";
  const candLines = candidate.split("\n");
  let j = 0; const missing = [];
  for (const line of live.split("\n")) {
    let k = j; while (k < candLines.length && candLines[k] !== line) k++;
    if (k < candLines.length) j = k + 1; else missing.push(line);
  }
  const published = live.trimEnd() === candidate.trimEnd();
  const liveLines = live.split("\n");
  let m = 0; const droppedFromLive = [];
  for (const line of candLines) {
    let k = m; while (k < liveLines.length && liveLines[k] !== line) k++;
    if (k < liveLines.length) m = k + 1; else droppedFromLive.push(line);
  }
  const publishedThenExtended = !published && droppedFromLive.length === 0;
  if (!publishedThenExtended) {
    assert.deepEqual(missing, published ? [] : [OLD, OLD, OLD], `live Rules lines missing from the candidate: ${JSON.stringify(missing)}`);
    assert.equal(candLines.length - liveLines.length, published ? 0 : 2, "only a two-line comment is added");
  }
}

const T = "t1";
const ID = (personId, level, key) => `${T}__${personId}__${level}__${key}`;
const ENVELOPE = () => ({ schemaVersion: 1, createdBy: "uid", createdAt: new Date(), updatedAt: new Date() });
const learner = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-progress:v1", lane: "learner",
  tenantId: T, personId, level, lemmaId, state: "achieved", at: "2026-10-12T10:00:00.000Z", byPersonId: personId, ...ENVELOPE(), ...o });
const supervisor = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-progress:v1", lane: "supervisor",
  tenantId: T, personId, level, lemmaId, review: "pending", at: null, byPersonId: null, note: null, forState: null, forClaimAt: null,
  history: [], historyTruncated: 0, ...ENVELOPE(), ...o });
const counter = (personId, level, lemmaId, o = {}) => ({ contractVersion: "quran-lemma-occurrence-counter:v1",
  tenantId: T, personId, level, lemmaId, individuallyKnownByJuz: {}, ...ENVELOPE(), ...o });
const wordLane = (personId, level, surah, ayah) => ({ contractVersion: "quran-word-progress:v1", identityContract: "quran-word-occurrence:v1",
  lane: "learner", tenantId: T, personId, level, surah, ayah, entries: { "8": { s: "a", at: "2026-10-12T10:00:00.000Z", by: personId } }, ...ENVELOPE() });
const total = (personId, o = {}) => ({ contractVersion: "quran-word-total:v1", tenantId: T, personId, total: 77429, known: 0, byJuz: {}, ...ENVELOPE(), ...o });

const ROOT = "وعد";

test("J39 candidate: the Tasrif level", async () => {
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

    // 1. The lemma-wide claim at Tasrif (keyed by the root): allowed; an unknown level one fact apart refused.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "tasrif", ROOT)), learner("p2", "tasrif", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "tasri", ROOT)), learner("p2", "tasri", ROOT)));
    // ...the four existing levels still pass, unchanged.
    for (const lv of ["wbw", "basic", "intermediate", "depth"]) await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", lv, "x")), learner("p2", lv, "x")));
    // ...the person binding holds at the new level.
    await assertSucceeds(setDoc(doc(p1, "quranLemmaProgress", ID("p2", "tasrif", "قول")), learner("p2", "tasrif", "قول", { byPersonId: "p1" })));
    await assertFails(setDoc(doc(p3, "quranLemmaProgress", ID("p2", "tasrif", "علم")), learner("p2", "tasrif", "علم", { byPersonId: "p3" })));
    await assertSucceeds(setDoc(doc(p3, "quranLemmaProgress", ID("p3", "tasrif", "علم")), learner("p3", "tasrif", "علم")));

    // 2. Supervisor lane: a teacher of p2 may, the child may not.
    await assertSucceeds(setDoc(doc(t9, "quranLemmaApprovals", ID("p2", "tasrif", ROOT)), supervisor("p2", "tasrif", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaApprovals", ID("p2", "tasrif", "قول")), supervisor("p2", "tasrif", "قول")));

    // 3. A claim's level never changes; its state may; nothing is deleted.
    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "tasrif", ROOT)), { state: "learning", at: "y", byPersonId: "p2" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "tasrif", ROOT)), { level: "depth" }));
    await assertFails(deleteDoc(doc(p2, "quranLemmaProgress", ID("p2", "tasrif", ROOT))));

    // 4. The occurrence counter at Intermediate.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "tasrif", ROOT)), counter("p2", "tasrif", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "intermediat", ROOT)), counter("p2", "intermediat", ROOT)));
    await assertFails(setDoc(doc(p3, "quranLemmaOccurrenceCounters", ID("p2", "tasrif", "قول")), counter("p2", "tasrif", "قول")));

    // 5. The per-āyah word lane (the Word card's own place) at Intermediate.
    await assertSucceeds(setDoc(doc(p2, "quranWordProgress", `${T}__p2__tasrif__14_22`), wordLane("p2", "tasrif", 14, 22)));
    await assertFails(setDoc(doc(p2, "quranWordProgress", `${T}__p2__intermediat__14_22`), wordLane("p2", "intermediat", 14, 22)));
    await assertFails(setDoc(doc(p3, "quranWordProgress", `${T}__p2__tasrif__14_23`), wordLane("p2", "tasrif", 14, 23)));

    // 6. Reading follows the person.
    await assertSucceeds(getDoc(doc(p1, "quranLemmaProgress", ID("p2", "tasrif", ROOT))));
    await assertFails(getDoc(doc(p3, "quranLemmaProgress", ID("p2", "tasrif", ROOT))));

    // 7. Its running total needs no change (the live quranWordTotals rule already accepts it).
    await assertSucceeds(setDoc(doc(p2, "quranWordTotals", `${T}__p2__tasrif`), total("p2", { level: "tasrif" })));
    await assertSucceeds(updateDoc(doc(p2, "quranWordTotals", `${T}__p2__tasrif`), { known: 3, byJuz: { "13": 3 }, updatedAt: new Date() }));
  } finally {
    await env.cleanup();
  }
});
