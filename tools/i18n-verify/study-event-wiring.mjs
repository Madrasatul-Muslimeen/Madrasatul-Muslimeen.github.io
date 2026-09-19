// MAP Phase 4 (P4-D) -- the pure Study-event decisions, tested without a
// database and without a browser: is this interaction a completion, and which
// Approach does it credit.
//
// Tests the REAL app/js/study-event-wiring.js, with its app imports rewritten
// to injected globals -- the technique quran-word-progress-data.mjs
// established, so the file under test is the file that ships.
//
// REPAIRED 2026-09-19. This suite had been DEAD since v08.31's 65ef3c5. That
// commit added a third import to study-event-wiring.js --
// ./study-evidence-readiness.js -- and this file rewrote only two, so the
// remaining relative specifier reached a `data:` module that cannot resolve
// one: `ERR_INVALID_URL`, thrown at module load, before a single check ran.
// The suite exited 1 with a stack trace and no FAIL line, which is exactly the
// shape this repository's own lesson warns about -- a grep for failures sees
// nothing, and a check that has never run has earned nothing.
//
// The third rewrite is below, and so is the LEFTOVER ASSERTION that would have
// caught it on the day. study-note-service.mjs has carried that assertion all
// along, which is why the same edit did not kill that suite silently.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/study-event-wiring.js"), "utf8");
source = source
  .replace(/import \{ weekKeyFor \} from "\.\/activity\.js";/, "const { weekKeyFor } = globalThis.__sewActivity;")
  .replace(/import \{ writeStudyActivityEvidence \} from "\.\/study-activity-evidence-store\.js";/,
           "const { writeStudyActivityEvidence } = globalThis.__sewStore;")
  .replace(/import \{[^}]*\} from "\.\/study-evidence-readiness\.js";/,
           "const { isStudyEvidencePersistenceReady, studyEvidenceUnavailableReason } = globalThis.__sewReadiness;");

// AN UNREWRITTEN IMPORT IS A DEAD SUITE, NOT A FAILING ONE. A relative
// specifier inside a `data:` module throws ERR_INVALID_URL at load, so every
// check below would simply never run while the file still looked present.
// Fail here instead, by name, the moment a new import appears.
for (const leftover of [/from "\.\//, /gstatic\.com/]) {
  assert.ok(!leftover.test(source), `an import was not rewritten: ${leftover} -- add it above, or this suite runs nothing`);
}

// The real weekKeyFor, copied from activity.js so the week maths under test is
// the app's own and not an approximation.
globalThis.__sewActivity = {
  weekKeyFor(date, weekStartsOn) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const diff = (d.getUTCDay() - weekStartsOn + 7) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  },
};
const writes = [];
globalThis.__sewStore = {
  writeStudyActivityEvidence: async (_db, args) => { writes.push(args); return { eventId: "x", written: true }; },
};
// The readiness answer is INJECTED while the gate's logic stays real. The
// shipped declaration is `ready: false` and cannot be argued out of it, so with
// it in place every write path here would be unreachable and this suite would
// test the gate instead of the contract. What the shipped declaration actually
// says is pinned at its source by study-activity-evidence-boundary.mjs ("the
// readiness declaration DEFAULTS TO FALSE, as a literal").
let persistenceReady = true;
globalThis.__sewReadiness = {
  isStudyEvidencePersistenceReady: () => persistenceReady,
  studyEvidenceUnavailableReason: () => (persistenceReady ? null : "evidence-rules-not-deployed"),
};
const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { readingApproachId, readingCompletionArgs, recordStudyEvidence, unitTypeRecordsEvidence, utcDay,
        LISTENING_COMPLETION_RATIO, createListeningSession, listeningApproachId, listeningCompletionArgs,
        wbwEngagementArgs } = mod;

let passed = 0;
async function check(name, fn) {
  const r = fn();
  if (r && typeof r.then === "function") await r;
  passed++; console.log(`  PASS  ${name}`);
}
const base = { tenantId: "t1", personId: "p1", unitKey: "ayah:2:255", unitType: "ayah",
               at: new Date("2026-09-14T09:00:00Z"), weekStartsOn: 0 };

// --- P4-D1: the Approach a Reading completion credits ---------------------
await check("no translation on screen credits Reading (with Tajweed)", () => {
  assert.equal(readingApproachId([]), "approach_01");
  assert.equal(readingApproachId(null), "approach_01");
  assert.equal(readingApproachId(undefined), "approach_01");
});
await check("a translation on screen credits Reading (with Meaning)", () => {
  assert.equal(readingApproachId(["en"]), "approach_03");
  assert.equal(readingApproachId(["bn"]), "approach_03");
  assert.equal(readingApproachId(["en", "bn"]), "approach_03");
});
await check("the two modes produce DIFFERENT evidence, not one merged event", () => {
  const plain = readingCompletionArgs({ ...base, translationLangs: [] });
  const meaning = readingCompletionArgs({ ...base, translationLangs: ["en"] });
  assert.equal(plain.trackableId, "approach_01");
  assert.equal(meaning.trackableId, "approach_03");
  assert.notEqual(plain.trackableId, meaning.trackableId);
});

// --- the evidence itself ---------------------------------------------------
await check("a Reading completion is Activity, on the selected unit, for today", () => {
  const a = readingCompletionArgs({ ...base, translationLangs: [] });
  assert.equal(a.eventType, "reading.completed");
  assert.equal(a.unitKey, "ayah:2:255");
  assert.equal(a.dateIso, "2026-09-14");
  assert.equal(a.weekKey, "2026-09-13");
  assert.equal(a.tenantId, "t1");
  assert.equal(a.personId, "p1");
});
await check("evidence carries no status, claim or mastery field", () => {
  const a = readingCompletionArgs({ ...base, translationLangs: [] });
  for (const f of ["action", "claimedStatus", "confirmedStatus", "confirmState", "statusId", "masteryEffect", "occurrenceId"]) {
    assert.ok(!(f in a), `${f} must not be decided here`);
  }
});
await check("the same unit, day and mode always yields identical arguments", () => {
  const a = readingCompletionArgs({ ...base, translationLangs: ["en"] });
  const b = readingCompletionArgs({ ...base, at: new Date("2026-09-14T23:59:00Z"), translationLangs: ["en"] });
  assert.deepEqual(a, b, "two readings on the same UTC day must be one event");
});
await check("a different UTC day is different evidence", () => {
  const a = readingCompletionArgs({ ...base, translationLangs: [] });
  const b = readingCompletionArgs({ ...base, at: new Date("2026-09-15T09:00:00Z"), translationLangs: [] });
  assert.notEqual(a.dateIso, b.dateIso);
});
await check("the UTC day boundary is UTC, not local", () => {
  assert.equal(utcDay(new Date("2026-09-14T23:59:59Z")), "2026-09-14");
  assert.equal(utcDay(new Date("2026-09-15T00:00:01Z")), "2026-09-15");
});
await check("range and surah units record evidence too", () => {
  for (const [unitKey, unitType] of [["range:2:254-256", "range"], ["surah:2", "surah"]]) {
    const a = readingCompletionArgs({ ...base, unitKey, unitType, translationLangs: [] });
    assert.ok(a, `${unitType} should record evidence`);
    assert.equal(a.unitKey, unitKey);
  }
});

// --- units v1 has no evidence shape for -----------------------------------
await check("juz, ruku, hizb and page record NOTHING, quietly", () => {
  for (const [unitKey, unitType] of [["juz:3", "juz"], ["ruku:2:1", "ruku"], ["hizb:4", "hizb"], ["page:madani:5", "page"]]) {
    assert.equal(readingCompletionArgs({ ...base, unitKey, unitType, translationLangs: [] }), null, unitType);
    assert.equal(unitTypeRecordsEvidence(unitType), false, unitType);
  }
});
await check("recording nothing writes nothing and reports it", async () => {
  writes.length = 0;
  const result = await recordStudyEvidence({}, null, { uid: "uid-p1" });
  assert.equal(result, null);
  assert.equal(writes.length, 0);
});

// --- writing ---------------------------------------------------------------
await check("an eligible completion reaches the store exactly once", async () => {
  writes.length = 0;
  const args = readingCompletionArgs({ ...base, translationLangs: [] });
  await recordStudyEvidence({}, args, { uid: "uid-p1" });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].eventType, "reading.completed");
  assert.equal(writes[0].uid, "uid-p1");
});
await check("A SHUT GATE STOPS THE WRITE HERE -- nothing is composed and nothing is sent", async () => {
  // v08.31's chokepoint, exercised at its own module rather than inferred from
  // the structure of the source. This case could not run at all between
  // 65ef3c5 and this repair: the suite threw at module load, so the gate the
  // tranche was built for had no behavioural test anywhere.
  writes.length = 0;
  persistenceReady = false;
  try {
    const args = readingCompletionArgs({ ...base, translationLangs: [] });
    assert.ok(args, "the fixture stopped producing eligible arguments -- this case would pass vacuously");
    const result = await recordStudyEvidence({}, args, { uid: "uid-p1" });
    assert.equal(writes.length, 0, "THE STORE WAS REACHED THROUGH A SHUT GATE");
    assert.equal(result.blocked, true, "a refusal is not reported as a refusal");
    assert.equal(result.written, false);
    assert.equal(result.reason, "evidence-rules-not-deployed", "the reason key does not reach the caller");
  } finally { persistenceReady = true; }
});
await check("a refusal and an already-recorded no-op are TELLABLE APART", async () => {
  // Both carry `written: false`. If that were all either carried, a gated press
  // would report itself as a duplicate -- the exact lie v08.31 exists to remove.
  writes.length = 0;
  const args = readingCompletionArgs({ ...base, translationLangs: [] });
  globalThis.__sewStore = {
    writeStudyActivityEvidence: async (_db, a) => { writes.push(a); return { eventId: "x", written: false }; },
  };
  const duplicate = await import(`data:text/javascript,${encodeURIComponent(source + "\n// duplicate-store variant\n")}`);
  const retried = await duplicate.recordStudyEvidence({}, args, { uid: "u" });
  assert.equal(writes.length, 1, "a retry must still reach the store -- the database is what deduplicates");
  assert.equal(retried.written, false);
  assert.ok(!retried.blocked, "an already-recorded event is being reported as a refusal");
  persistenceReady = false;
  const blocked = await duplicate.recordStudyEvidence({}, args, { uid: "u" });
  persistenceReady = true;
  assert.equal(writes.length, 1, "a refused write reached the store");
  assert.equal(blocked.blocked, true);
  assert.notDeepEqual({ w: blocked.written, b: blocked.blocked }, { w: retried.written, b: retried.blocked });
  globalThis.__sewStore = {
    writeStudyActivityEvidence: async (_db, a) => { writes.push(a); return { eventId: "x", written: true }; },
  };
});
await check("this module never swallows a failure -- I15 stays the caller's job", async () => {
  // The module destructures globalThis.__sewStore ONCE at evaluation, so
  // swapping the function afterwards does not reach an already-imported copy --
  // and a data: URL is cached by specifier, so re-importing the same text
  // returns that same copy. The first version of this check did both and
  // failed itself. Install the throwing store first, then import a variant
  // whose text differs, so a genuinely fresh module evaluates against it.
  globalThis.__sewStore = {
    writeStudyActivityEvidence: async () => { throw new Error("Missing or insufficient permissions."); },
  };
  const fresh = await import(`data:text/javascript,${encodeURIComponent(source + "\n// throwing-store variant\n")}`);
  await assert.rejects(
    () => fresh.recordStudyEvidence({}, readingCompletionArgs({ ...base, translationLangs: [] }), { uid: "u" }),
    /insufficient permissions/);
});

// --- P4-D2: Listening ------------------------------------------------------
const session = (over = {}) => createListeningSession({ ayahsInUnit: 10, startedByUser: true, ...over });
/** Plays ayahs 1..n in order and ends naturally. */
const playThrough = (s, upTo) => { for (let a = 1; a <= upTo; a++) s.ayahStarted(a); s.ended(); };

await check("ADR-008's threshold is 80% and is named once", () => {
  assert.equal(LISTENING_COMPLETION_RATIO, 0.8);
});
await check("listening without a translation credits Arabic-only", () => {
  assert.equal(listeningApproachId([]), "approach_07");
  assert.equal(listeningApproachId(["bn"]), "approach_08");
});
await check("hearing the whole unit qualifies", () => {
  const s = session(); playThrough(s, 10);
  assert.equal(s.ayahsHeard(), 10);
  assert.equal(s.completionRatio(), 1);
  assert.equal(s.qualifies(), true);
});
await check("exactly 80% qualifies; just under does not", () => {
  const at80 = session(); playThrough(at80, 8);
  assert.equal(at80.completionRatio(), 0.8);
  assert.equal(at80.qualifies(), true);
  const under = session(); playThrough(under, 7);
  assert.equal(under.completionRatio(), 0.7);
  assert.equal(under.qualifies(), false);
});
await check("PRELOAD cannot complete listening -- no person started it", () => {
  const s = session({ startedByUser: false }); playThrough(s, 10);
  assert.equal(s.ayahsHeard(), 0);
  assert.equal(s.qualifies(), false);
});
await check("BUFFERING adds no coverage -- it does not advance the āyah", () => {
  const s = session();
  s.ayahStarted(1); s.ayahStarted(1); s.ayahStarted(1); // re-reported, still āyah 1
  assert.equal(s.ayahsHeard(), 0);
  assert.equal(s.qualifies(), false);
});
await check("LOOPING cannot inflate coverage -- heard āyahs are a set", () => {
  const s = session();
  for (let rep = 0; rep < 20; rep++) { s.ayahStarted(1); s.ayahStarted(2); s.ayahStarted(1); }
  assert.ok(s.ayahsHeard() <= 2, `a loop over two āyahs credited ${s.ayahsHeard()}`);
  assert.equal(s.qualifies(), false);
});
await check("SEEKING FORWARD credits only the āyah left behind, never the skipped ones", () => {
  const s = session();
  s.ayahStarted(1); s.ayahStarted(9); s.ended();
  assert.equal(s.ayahsHeard(), 2, "only āyah 1 and āyah 9 -- 2..8 were skipped");
  assert.equal(s.qualifies(), false);
});
await check("SEEKING BACKWARD credits nothing for the jump", () => {
  const s = session();
  s.ayahStarted(5); s.ayahStarted(2);
  assert.equal(s.ayahsHeard(), 0);
});
await check("FAILED playback can never qualify, however much was heard first", () => {
  const s = session();
  for (let a = 1; a <= 10; a++) s.ayahStarted(a);
  s.failed(); s.ended();
  assert.equal(s.qualifies(), false, "a failed playback must not complete Listening");
});
await check("stopping by hand is not failing -- what was heard still counts", () => {
  const s = session(); for (let a = 1; a <= 9; a++) s.ayahStarted(a); s.stopped();
  assert.equal(s.qualifies(), true);
});
await check("nothing after the session ends can add coverage", () => {
  const s = session(); playThrough(s, 8);
  const before = s.ayahsHeard();
  s.ayahStarted(9); s.ayahStarted(10); s.ended();
  assert.equal(s.ayahsHeard(), before);
});
await check("a unit with no āyahs never qualifies", () => {
  const s = createListeningSession({ ayahsInUnit: 0, startedByUser: true });
  s.ended();
  assert.equal(s.qualifies(), false);
});
await check("a single-āyah unit qualifies only when that āyah is heard", () => {
  const none = createListeningSession({ ayahsInUnit: 1, startedByUser: true });
  assert.equal(none.qualifies(), false);
  const one = createListeningSession({ ayahsInUnit: 1, startedByUser: true });
  one.ayahStarted(1); one.ended();
  assert.equal(one.qualifies(), true);
});
await check("a qualifying session produces Listening evidence on the unit", () => {
  const s = session(); playThrough(s, 10);
  const a = listeningCompletionArgs({ ...base, translationLangs: [], session: s });
  assert.equal(a.eventType, "listening.completed");
  assert.equal(a.trackableId, "approach_07");
  assert.equal(a.unitKey, "ayah:2:255");
  assert.equal(a.dateIso, "2026-09-14");
});
await check("a non-qualifying session produces NO evidence", () => {
  const s = session(); playThrough(s, 3);
  assert.equal(listeningCompletionArgs({ ...base, translationLangs: [], session: s }), null);
});
await check("listening on a juz records nothing, like reading", () => {
  const s = session(); playThrough(s, 10);
  assert.equal(listeningCompletionArgs({ ...base, unitKey: "juz:3", unitType: "juz", translationLangs: [], session: s }), null);
});
await check("listening and reading on the same unit/day are DIFFERENT events", () => {
  const s = session(); playThrough(s, 10);
  const listen = listeningCompletionArgs({ ...base, translationLangs: [], session: s });
  const read = readingCompletionArgs({ ...base, translationLangs: [] });
  assert.notEqual(listen.eventType, read.eventType);
  assert.notEqual(listen.trackableId, read.trackableId);
});

// --- P4-D4: WbW, at āyah + day grain ---------------------------------------
const wbw = (over = {}) => wbwEngagementArgs({ tenantId: "t1", personId: "p1", surah: 2, ayah: 255,
                                               at: new Date("2026-09-14T09:00:00Z"), weekStartsOn: 0, ...over });

await check("MA-W 100 words in one āyah on one day are ONE identical event", () => {
  const first = wbw();
  for (let i = 0; i < 100; i++) assert.deepEqual(wbw(), first, `tap ${i} produced different evidence`);
});
await check("MA-W the occurrence never enters the arguments at all", () => {
  const a = wbw();
  assert.ok(!("occurrenceId" in a), "occurrenceId must not be in Activity evidence");
  assert.ok(!("position" in a), "a word position must not be in Activity evidence");
  assert.equal(Object.keys(a).sort().join(","), "dateIso,eventType,personId,tenantId,trackableId,unitKey,weekKey");
});
await check("MA-W the unit is the ĀYAH, built as a permanent unit key", () => {
  assert.equal(wbw().unitKey, "ayah:2:255");
  assert.equal(wbw({ surah: 114, ayah: 6 }).unitKey, "ayah:114:6");
});
await check("MA-W a different āyah, and a different day, are different evidence", () => {
  assert.notEqual(wbw().unitKey, wbw({ ayah: 256 }).unitKey);
  assert.notEqual(wbw().dateIso, wbw({ at: new Date("2026-09-15T09:00:00Z") }).dateIso);
});
await check("WbW always credits Reading — Word-by-Word Meaning", () => {
  assert.equal(wbw().trackableId, "approach_04");
  assert.equal(wbw().eventType, "wbw.engaged");
});
await check("an impossible surah or āyah records nothing", () => {
  for (const bad of [{ surah: 0 }, { surah: 115 }, { ayah: 0 }, { surah: null }, { ayah: "3" }]) {
    assert.equal(wbw(bad), null, JSON.stringify(bad));
  }
});
await check("WbW evidence carries no mastery or approval field", () => {
  const a = wbw();
  for (const f of ["state", "review", "achieved", "mastered", "claimedStatus", "confirmState"]) {
    assert.ok(!(f in a), f);
  }
});
await check("WbW and Reading on the same āyah/day are DIFFERENT events", () => {
  const w = wbw();
  const r = readingCompletionArgs({ ...base, translationLangs: [] });
  assert.notEqual(w.eventType, r.eventType);
  assert.notEqual(w.trackableId, r.trackableId);
  assert.equal(w.unitKey, r.unitKey, "same āyah, different event");
});

console.log(`\n==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): ${passed} passed, 0 failed ====`);
