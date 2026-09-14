// MAP Phase 4 (P4-B) -- the CANDIDATE Study Activity evidence Rules, executed
// against the Firestore emulator. Isolated: never loads firestore.rules, never
// touches a production endpoint or project id.
//
// The REJECTED Phase 4 candidate failed because 9 of its 13 logged denials were
// refusals by Firestore's 1000-expression budget rather than by the security
// logic -- denials that sat inside assertFails, looked correct, and proved
// nothing. Every denial below is therefore paired with an ALLOW that differs in
// exactly ONE fact, so a ruleset that refused everything for the wrong reason
// cannot pass this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const PROJECT = "demo-quranrevival-activity-evidence-v1";
const HOST = "127.0.0.1";
const PORT = 8087;
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = fs.readFileSync(
  path.resolve(here, "../../docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules"), "utf8");
assert.match(PROJECT, /^demo-/);
assert.notEqual(PROJECT, "study-monitoring");

// Must be an ISOLATED extract, not the deployed file with a block bolted on.
const matchBlocks = [...candidate.matchAll(/match \/(\w+)\//g)].map((m) => m[1]).filter((n) => n !== "databases");
assert.deepEqual([...new Set(matchBlocks)].sort(), ["activity"],
  `the candidate must govern exactly the activity evidence subcollection, saw: ${matchBlocks.join(",")}`);
assert.ok(!/Version: 2026-07-30|S8-class fix|match \/tenantInvites\//.test(candidate),
  "the candidate must not be a copy of the deployed production rules");

const T = "t1";
const WEEK = "2026-09-13";
const wk = (tenant = T, person = "p1", week = WEEK) => `${tenant}__${person}__${week}`;

/** A well-formed reading event; `over` mutates exactly one fact per case. */
const evidence = (over = {}) => ({
  contractVersion: "study-approach-contract:v1",
  eventType: "reading.completed",
  tenantId: T, personId: "p1", weekKey: WEEK,
  dateIso: "2026-09-14", subjectId: "quran",
  unitKey: "ayah:2:255", unitType: "ayah",
  trackableId: "approach_01", action: "practised",
  dedupeScope: "2026-09-14", masteryEffect: "none",
  schemaVersion: 1, createdBy: "uid-p1", createdAt: new Date(), updatedAt: new Date(),
  ...over,
});
const idOf = (e) => `${e.eventType}__${e.trackableId}__${e.unitKey}__${e.dedupeScope}`;
const ref = (db, e, key = wk()) => doc(db, "activity", key, "evidence", idOf(e));

test("candidate Activity-evidence Rules: isolated allow/deny cases", async () => {
  const env = await initializeTestEnvironment({
    projectId: PROJECT, firestore: { host: HOST, port: PORT, rules: candidate },
  });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "tenantPeople", "p1"), { tenantId: T, authUid: "uid-p1" });
      await setDoc(doc(db, "tenantPeople", "p2"), { tenantId: T, authUid: "uid-p2", managedByPersonId: "p1" });
      await setDoc(doc(db, "tenantPeople", "pX"), { tenantId: "t2", authUid: "uid-pX" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p1`), { roles: ["self"], personId: "p1" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-p2`), { roles: ["self"], personId: "p2" });
      await setDoc(doc(db, "tenantMemberUids", `${T}__uid-t`), { roles: ["teacher"], personId: "pt" });
      await setDoc(doc(db, "teacherStudentLinks", `${T}__pt__p2`), { active: true });
    });

    const p1 = env.authenticatedContext("uid-p1").firestore();
    const p2 = env.authenticatedContext("uid-p2").firestore();
    const teacher = env.authenticatedContext("uid-t").firestore();
    const anon = env.unauthenticatedContext().firestore();
    let n = 0;
    const ok = async (name, p) => { await assertSucceeds(p); n++; console.log(`  PASS  ${name}`); };
    const no = async (name, p) => { await assertFails(p); n++; console.log(`  PASS  ${name}`); };

    // --- the baseline ALLOW every denial below is measured against --------
    const base = evidence();
    await ok("self writes a well-formed reading event", setDoc(ref(p1, base), base));

    // --- deduplication is enforced by the DATABASE ------------------------
    await no("an exact retry cannot create the same event twice",
      setDoc(ref(p1, base), base));
    await no("a retry cannot overwrite accepted evidence via update",
      updateDoc(ref(p1, base), { dateIso: "2026-09-15" }));
    await no("accepted evidence can never be deleted",
      deleteDoc(ref(p1, base)));
    await ok("a DIFFERENT day is a different event and is allowed", (() => {
      const e = evidence({ dateIso: "2026-09-15", dedupeScope: "2026-09-15" });
      return setDoc(ref(p1, e), e);
    })());
    await ok("a DIFFERENT unit is a different event and is allowed", (() => {
      const e = evidence({ unitKey: "ayah:2:256" });
      return setDoc(ref(p1, e), e);
    })());

    // --- identity enforcement --------------------------------------------
    await no("an id that does not derive from the fields is refused", (() => {
      const e = evidence({ unitKey: "ayah:2:1" });
      return setDoc(doc(p1, "activity", wk(), "evidence", "anything-i-like"), e);
    })());
    await no("an id describing a different unit than the body is refused", (() => {
      const e = evidence({ unitKey: "ayah:2:2" });
      return setDoc(doc(p1, "activity", wk(), "evidence", idOf(evidence({ unitKey: "ayah:2:3" }))), e);
    })());
    await no("a unitKey carrying the '__' separator cannot forge an identity", (() => {
      const e = evidence({ unitKey: "ayah:2:9__x", unitType: "ayah" });
      return setDoc(ref(p1, e), e);
    })());

    // --- ACTIVITY != MASTERY ---------------------------------------------
    await no("a claimed action is refused", (() => {
      const e = evidence({ action: "claimed", unitKey: "ayah:2:10" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a mastery effect other than none is refused", (() => {
      const e = evidence({ masteryEffect: "achieved", unitKey: "ayah:2:11" });
      return setDoc(ref(p1, e), e);
    })());
    await no("status.claimed is not expressible as Activity evidence", (() => {
      const e = evidence({ eventType: "status.claimed", unitKey: "ayah:2:12" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a smuggled claimedStatus field is refused", (() => {
      const e = { ...evidence({ unitKey: "ayah:2:13" }), claimedStatus: "mastered" };
      return setDoc(ref(p1, e), e);
    })());

    // --- the contract's own mapping --------------------------------------
    await no("a reading event may not credit the Journaling Approach", (() => {
      const e = evidence({ trackableId: "approach_10", unitKey: "ayah:2:14" });
      return setDoc(ref(p1, e), e);
    })());
    await no("an Approach outside the mapped six is refused", (() => {
      const e = evidence({ trackableId: "approach_02", unitKey: "ayah:2:15" });
      return setDoc(ref(p1, e), e);
    })());
    await ok("listening with meaning may credit approach_08", (() => {
      const e = evidence({ eventType: "listening.completed", trackableId: "approach_08", unitKey: "ayah:2:16" });
      return setDoc(ref(p1, e), e);
    })());
    await ok("a new Note dedupes once, not per day", (() => {
      const e = evidence({ eventType: "journal.note-created", trackableId: "approach_10",
                           unitKey: "ayah:2:17", dedupeScope: "once" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a new-Note event dedupded by day instead of once is refused", (() => {
      const e = evidence({ eventType: "journal.note-created", trackableId: "approach_10",
                           unitKey: "ayah:2:18", dedupeScope: "2026-09-14" });
      return setDoc(ref(p1, e), e);
    })());

    // --- permanent unit identity (I5) ------------------------------------
    await no("a juz unit key is refused", (() => {
      const e = evidence({ unitKey: "juz:3", unitType: "juz" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a topic unit key is refused", (() => {
      const e = evidence({ unitKey: "topic:t42", unitType: "topic" });
      return setDoc(ref(p1, e), e);
    })());
    await ok("a range unit key is accepted", (() => {
      const e = evidence({ unitKey: "range:2:254-256", unitType: "range" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a unitType disagreeing with its key is refused", (() => {
      const e = evidence({ unitKey: "surah:2", unitType: "ayah" });
      return setDoc(ref(p1, e), e);
    })());

    // --- path/body scope binding -----------------------------------------
    await no("a body naming a different person than the path is refused", (() => {
      const e = evidence({ personId: "p2", unitKey: "ayah:2:20" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a body naming a different week than the path is refused", (() => {
      const e = evidence({ weekKey: "2026-09-06", unitKey: "ayah:2:21" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a body naming a different tenant than the path is refused", (() => {
      const e = evidence({ tenantId: "t2", unitKey: "ayah:2:22" });
      return setDoc(ref(p1, e), e);
    })());
    await no("a person from another tenant cannot be written under this tenant", (() => {
      const e = evidence({ personId: "pX", unitKey: "ayah:2:23" });
      return setDoc(doc(p1, "activity", wk(T, "pX"), "evidence", idOf(e)), e);
    })());
    await no("a malformed parent week key is refused", (() => {
      const e = evidence({ unitKey: "ayah:2:24" });
      return setDoc(doc(p1, "activity", "not-a-week-key", "evidence", idOf(e)), e);
    })());

    // --- who may write ----------------------------------------------------
    await no("an anonymous caller cannot write evidence", (() => {
      const e = evidence({ unitKey: "ayah:2:25" });
      return setDoc(ref(anon, e), e);
    })());
    await no("another learner cannot write evidence for p1", (() => {
      const e = evidence({ unitKey: "ayah:2:26" });
      return setDoc(ref(p2, e), e);
    })());
    await ok("a co-enrolled teacher may record for their own student", (() => {
      const e = evidence({ personId: "p2", createdBy: "uid-t", unitKey: "ayah:2:27" });
      return setDoc(doc(teacher, "activity", wk(T, "p2"), "evidence", idOf(e)), e);
    })());
    await no("that teacher may NOT record for a student they do not teach", (() => {
      const e = evidence({ personId: "p1", createdBy: "uid-t", unitKey: "ayah:2:28" });
      return setDoc(doc(teacher, "activity", wk(T, "p1"), "evidence", idOf(e)), e);
    })());
    await no("createdBy must be the caller's own uid", (() => {
      const e = evidence({ createdBy: "uid-someone-else", unitKey: "ayah:2:29" });
      return setDoc(ref(p1, e), e);
    })());

    // --- reads -------------------------------------------------------------
    await ok("the person themselves may read their evidence",
      getDoc(ref(p1, base)));
    await no("another learner may not read p1's evidence",
      getDoc(ref(p2, base)));
    await no("an anonymous caller may not read evidence",
      getDoc(ref(anon, base)));

    // --- COST: the rule must not get more expensive as evidence accumulates
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (let i = 100; i < 260; i++) {
        const e = evidence({ unitKey: `ayah:2:${i}` });
        await setDoc(doc(db, "activity", wk(), "evidence", idOf(e)), e);
      }
    });
    await ok("write 161 is no more expensive than write 1 (no map is walked)", (() => {
      const e = evidence({ unitKey: "ayah:2:280" });
      return setDoc(ref(p1, e), e);
    })());

    console.log(`\n==== Phase 4 Activity evidence candidate Rules: ${n} assertions, all as specified ====`);
  } finally {
    await env.cleanup();
  }
});
