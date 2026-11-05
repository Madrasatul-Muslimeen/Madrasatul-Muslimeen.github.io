// Decisions 101 and 103 (12 Oct 2026) -- the DEPLOYMENT CANDIDATE that adds a fourth word level, `intermediate`,
// executed against the Firestore emulator. Isolated: a demo- project id, 127.0.0.1, and the candidate text itself
// (the file the Owner would paste into the Console), never production.
//
// Every denial is paired with an allow differing in exactly ONE fact (the level, or the person). Run against the
// LIVE Rules with MUTANT=1 RULES_FILE=firestore.rules: the intermediate allows must then FAIL.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-intermediate-level";
const HOST = "127.0.0.1";
const PORT = 8108;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RULES_FILE = process.env.RULES_FILE || "docs/governance/2026-10-12-intermediate-level-DEPLOYMENT-candidate.rules";
const candidate = fs.readFileSync(path.resolve(root, RULES_FILE), "utf8");
const live = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.equal(HOST, "127.0.0.1");

// One top-level `match /<name>/{key} { ... }` block, braces balanced (the line-anchored form, so a comment that
// names the collection is never mistaken for the block).
function ruleBlock(text, name) {
  const m = new RegExp(`^[ \\t]*match /${name}/`, "m").exec(text);
  assert.ok(m, `no ${name} block found`);
  const start = m.index + m[0].indexOf("match");
  const open = text.lastIndexOf("{", text.indexOf("\n", start));
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name} block`);
}
// Every line of `older`, in order, in `newer`; returns the lines that are not.
function linesMissingInOrder(older, newer) {
  const n = newer.split("\n");
  let j = 0; const missing = [];
  for (const line of older.split("\n")) {
    let k = j; while (k < n.length && n[k] !== line) k++;
    if (k < n.length) j = k + 1; else missing.push(line);
  }
  return missing;
}

// The candidate is the live file OF ITS DAY with exactly three lines widened (and a two-line comment): every other
// line of firestore.rules at 1566cef1 (the commit that wrote the candidate) is still there, in order.
//
// UPDATED IN PLACE 5 Nov 2026. This compared the candidate with TODAY's firestore.rules, in three accepted states
// (before publication; published, the same file; published and then extended). It failed in a fourth, legitimate
// state: the Owner published this widening, then the Tasrif level (d612879a, PCF J39) widened the SAME three lines
// again to ['wbw', 'basic', 'intermediate', 'tasrif', 'depth'], so a candidate line is no longer in the live file
// at all. Testing history against the present. Now: (1) the "three lines widened" comparison is pinned to the
// candidate's own base, which does not move; (2) today's firestore.rules, with ONLY Tasrif's later widening of
// those three lines undone, still carries every line of this candidate in order -- so the published intermediate
// level cannot be dropped or drift silently, and the only accepted change on top of it is Tasrif's.
// A MUTANT run (MUTANT=1) skips this file-level comparison, as before.
const CANDIDATE_BASE_REF = "1566cef1";
if (!process.env.MUTANT) {
  const OLD = "          && request.resource.data.get('level', '') in ['wbw', 'basic', 'depth']";
  const NEW = "          && request.resource.data.get('level', '') in ['wbw', 'basic', 'intermediate', 'depth']";
  const TASRIF = "          && request.resource.data.get('level', '') in ['wbw', 'basic', 'intermediate', 'tasrif', 'depth']";
  const baseLive = execSync(`git show ${CANDIDATE_BASE_REF}:firestore.rules`, { cwd: root, encoding: "utf8" });
  const missing = linesMissingInOrder(baseLive, candidate);
  assert.deepEqual(missing, [OLD, OLD, OLD], `base Rules lines missing from the candidate: ${JSON.stringify(missing)}`);
  assert.equal(candidate.split("\n").length - baseLive.split("\n").length, 2, "only a two-line comment is added");
  assert.equal(candidate.split("\n").filter((l) => l === NEW).length, 3, "the candidate widens exactly three lines");
  const liveLines = live.split("\n");
  assert.equal(liveLines.filter((l) => l === TASRIF).length, 3, "today's firestore.rules does not carry the Tasrif widening of the three lines");
  const dropped = linesMissingInOrder(candidate, liveLines.map((l) => (l === TASRIF ? NEW : l)).join("\n"));
  assert.deepEqual(dropped, [], `published candidate lines missing from today's firestore.rules: ${JSON.stringify(dropped)}`);
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

test("decisions 101/103 candidate: the Intermediate level", async () => {
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

    // 1. The lemma-wide claim at Intermediate (keyed by the root): allowed; an unknown level one fact apart refused.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "intermediate", ROOT)), learner("p2", "intermediate", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaProgress", ID("p2", "intermediat", ROOT)), learner("p2", "intermediat", ROOT)));
    // ...the three existing levels still pass, unchanged.
    for (const lv of ["wbw", "basic", "depth"]) await assertSucceeds(setDoc(doc(p2, "quranLemmaProgress", ID("p2", lv, "x")), learner("p2", lv, "x")));
    // ...the person binding holds at the new level.
    await assertSucceeds(setDoc(doc(p1, "quranLemmaProgress", ID("p2", "intermediate", "قول")), learner("p2", "intermediate", "قول", { byPersonId: "p1" })));
    await assertFails(setDoc(doc(p3, "quranLemmaProgress", ID("p2", "intermediate", "علم")), learner("p2", "intermediate", "علم", { byPersonId: "p3" })));
    await assertSucceeds(setDoc(doc(p3, "quranLemmaProgress", ID("p3", "intermediate", "علم")), learner("p3", "intermediate", "علم")));

    // 2. Supervisor lane: a teacher of p2 may, the child may not.
    await assertSucceeds(setDoc(doc(t9, "quranLemmaApprovals", ID("p2", "intermediate", ROOT)), supervisor("p2", "intermediate", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaApprovals", ID("p2", "intermediate", "قول")), supervisor("p2", "intermediate", "قول")));

    // 3. A claim's level never changes; its state may; nothing is deleted.
    await assertSucceeds(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "intermediate", ROOT)), { state: "learning", at: "y", byPersonId: "p2" }));
    await assertFails(updateDoc(doc(p2, "quranLemmaProgress", ID("p2", "intermediate", ROOT)), { level: "depth" }));
    await assertFails(deleteDoc(doc(p2, "quranLemmaProgress", ID("p2", "intermediate", ROOT))));

    // 4. The occurrence counter at Intermediate.
    await assertSucceeds(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "intermediate", ROOT)), counter("p2", "intermediate", ROOT)));
    await assertFails(setDoc(doc(p2, "quranLemmaOccurrenceCounters", ID("p2", "intermediat", ROOT)), counter("p2", "intermediat", ROOT)));
    await assertFails(setDoc(doc(p3, "quranLemmaOccurrenceCounters", ID("p2", "intermediate", "قول")), counter("p2", "intermediate", "قول")));

    // 5. The per-āyah word lane (the Word card's own place) at Intermediate.
    await assertSucceeds(setDoc(doc(p2, "quranWordProgress", `${T}__p2__intermediate__14_22`), wordLane("p2", "intermediate", 14, 22)));
    await assertFails(setDoc(doc(p2, "quranWordProgress", `${T}__p2__intermediat__14_22`), wordLane("p2", "intermediat", 14, 22)));
    await assertFails(setDoc(doc(p3, "quranWordProgress", `${T}__p2__intermediate__14_23`), wordLane("p2", "intermediate", 14, 23)));

    // 6. Reading follows the person.
    await assertSucceeds(getDoc(doc(p1, "quranLemmaProgress", ID("p2", "intermediate", ROOT))));
    await assertFails(getDoc(doc(p3, "quranLemmaProgress", ID("p2", "intermediate", ROOT))));

    // 7. Its running total needs no change (the live quranWordTotals rule already accepts it).
    await assertSucceeds(setDoc(doc(p2, "quranWordTotals", `${T}__p2__intermediate`), total("p2", { level: "intermediate" })));
    await assertSucceeds(updateDoc(doc(p2, "quranWordTotals", `${T}__p2__intermediate`), { known: 3, byJuz: { "13": 3 }, updatedAt: new Date() }));
  } finally {
    await env.cleanup();
  }
});
