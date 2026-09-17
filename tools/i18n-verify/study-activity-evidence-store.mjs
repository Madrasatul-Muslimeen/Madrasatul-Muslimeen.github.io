// MAP Phase 4 (P4-C) -- the evidence writer, executed against an in-memory
// Firestore that really stores what is written. No network, no emulator.
//
// This tests the REAL app/js/study-activity-evidence-store.js source, with its
// CDN import rewritten to an injected global -- the same technique
// quran-word-progress-data.mjs already uses, so the file under test is the
// file that ships, not a copy of it.
//
// The point of this suite is BEHAVIOUR AT THE BOUNDARY, and specifically the
// one thing that is easy to get dangerously wrong: a retry must be a silent
// success while a genuine failure must still reach the user (I15). Those two
// arrive from Firestore as the SAME permission-denied error, so every case
// below pins which of the two the writer decided it was.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/study-activity-evidence-store.js"), "utf8");
source = source
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    "const { collection, doc, getDoc, getDocs, limit, query } = globalThis.__seFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__seCollections;")
  .replace(/import \{ createDocument \} from "\.\/envelope\.js";/, "const { createDocument } = globalThis.__seEnvelope;")
  .replace(/from "\.\/study-activity-evidence-id\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/study-activity-evidence-id.js")).href}"`);

// --- an in-memory Firestore that really stores, and really counts ----------
const store = new Map();               // "collectionPath/docId" -> data
const counters = { gets: 0, creates: 0, queries: 0 };
let lastQuery = null;
let denyCreate = null;                 // set to an Error to simulate a Rules denial
let createSideEffect = null;           // simulate a racing writer landing first

globalThis.__seCollections = { TENANT: Object.freeze({ ACTIVITY: "activity" }) };
globalThis.__seFirestore = {
  doc: (_db, collectionPath, docId) => ({ key: `${collectionPath}/${docId}`, collectionPath, docId }),
  getDoc: async (ref) => {
    counters.gets++;
    const row = store.get(ref.key);
    return { id: ref.docId, exists: () => row !== undefined, data: () => row };
  },
};
// P4-E -- the read side. `collection`/`query`/`limit` are recorded so the
// suite can assert the SHAPE of the query as well as its result: no filter and
// no orderBy is what keeps this the one MAP read needing no composite index.
globalThis.__seFirestore.collection = (_db, collectionPath) => ({ collectionPath });
globalThis.__seFirestore.limit = (n) => ({ limit: n });
globalThis.__seFirestore.query = (...parts) => {
  counters.queries++;
  lastQuery = parts;
  return { parts };
};
globalThis.__seFirestore.getDocs = async (q) => {
  const { collectionPath } = q.parts[0];
  const cap = q.parts.find((part) => part && part.limit !== undefined)?.limit ?? Infinity;
  const rows = [...store.entries()]
    .filter(([key]) => key.startsWith(`${collectionPath}/`))
    .slice(0, cap)
    .map(([key, data]) => ({ id: key.slice(collectionPath.length + 1), data: () => data }));
  return { docs: rows };
};
globalThis.__seEnvelope = {
  createDocument: async (_db, collectionPath, docId, data, uid) => {
    counters.creates++;
    if (createSideEffect) { createSideEffect(); createSideEffect = null; }
    if (denyCreate) throw denyCreate;
    store.set(`${collectionPath}/${docId}`, { ...data, schemaVersion: 1, createdBy: uid });
  },
};
function reset() {
  store.clear();
  for (const key of Object.keys(counters)) counters[key] = 0;
  lastQuery = null; denyCreate = null; createSideEffect = null;
}

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { writeStudyActivityEvidence, evidenceCollectionPath, listStudyActivityEvidence, MAX_EVIDENCE_PER_READ } = mod;

let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`  PASS  ${name}`); }

const NOTE_A = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const NOTE_B = "0f9e8d7c6b5a49382716f5e4d3c2b1a0";
const db = {};
const ev = (over = {}) => ({
  eventType: "reading.completed", tenantId: "t1", personId: "p1", weekKey: "2026-09-13",
  dateIso: "2026-09-14", unitKey: "ayah:2:255", trackableId: "approach_01", uid: "uid-p1", ...over,
});

// --- the path ---------------------------------------------------------------
await check("evidence lives under the EXISTING weekly activity document", async () => {
  assert.equal(evidenceCollectionPath("t1", "p1", "2026-09-13"), "activity/t1__p1__2026-09-13/evidence");
});
await check("the writer never addresses the weekly document itself", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  for (const key of store.keys()) {
    assert.ok(key.includes("/evidence/"), `wrote outside the evidence subcollection: ${key}`);
    assert.notEqual(key, "activity/t1__p1__2026-09-13");
  }
});

// --- what is actually stored -----------------------------------------------
await check("one event stores one document, with Activity semantics", async () => {
  reset();
  const { eventId, written } = await writeStudyActivityEvidence(db, ev());
  assert.equal(written, true);
  assert.equal(store.size, 1);
  const stored = store.get(`activity/t1__p1__2026-09-13/evidence/${eventId}`);
  assert.equal(stored.action, "practised");
  assert.equal(stored.masteryEffect, "none");
  assert.equal(stored.trackableId, "approach_01");
  assert.equal(stored.createdBy, "uid-p1");
});
await check("no status-shaped field is ever stored", async () => {
  reset();
  const { eventId } = await writeStudyActivityEvidence(db, ev());
  const stored = store.get(`activity/t1__p1__2026-09-13/evidence/${eventId}`);
  for (const f of ["claimedStatus", "confirmedStatus", "confirmState", "status", "occurrenceId"]) {
    assert.ok(!(f in stored), f);
  }
});

// --- RETRY IS A SUCCESSFUL NO-OP -------------------------------------------
await check("a retry writes nothing and reports written:false", async () => {
  reset();
  const first = await writeStudyActivityEvidence(db, ev());
  const second = await writeStudyActivityEvidence(db, ev());
  assert.equal(first.written, true);
  assert.equal(second.written, false);
  assert.equal(second.eventId, first.eventId);
  assert.equal(store.size, 1);
  assert.equal(counters.creates, 1, "the second attempt must not even try to write");
});
await check("ten retries still leave exactly one document", async () => {
  reset();
  for (let i = 0; i < 10; i++) await writeStudyActivityEvidence(db, ev());
  assert.equal(store.size, 1);
  assert.equal(counters.creates, 1);
});

// --- A RACE IS ALSO A NO-OP, NOT AN ERROR ----------------------------------
await check("a racing writer landing first is a no-op, not a failure", async () => {
  reset();
  // Both readers saw "absent"; the other writer lands, then ours is denied.
  createSideEffect = () => store.set(
    "activity/t1__p1__2026-09-13/evidence/reading.completed__approach_01__ayah:2:255__none__2026-09-14",
    { action: "practised" });
  denyCreate = Object.assign(new Error("permission-denied"), { code: "permission-denied" });
  const result = await writeStudyActivityEvidence(db, ev());
  assert.equal(result.written, false);
  assert.equal(store.size, 1);
});

// --- A GENUINE FAILURE STILL REACHES THE USER (I15) ------------------------
await check("a real denial is rethrown, never swallowed", async () => {
  reset();
  denyCreate = Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
  await assert.rejects(() => writeStudyActivityEvidence(db, ev()), /insufficient permissions/);
  assert.equal(store.size, 0);
});
await check("a network failure is rethrown too", async () => {
  reset();
  denyCreate = Object.assign(new Error("unavailable"), { code: "unavailable" });
  await assert.rejects(() => writeStudyActivityEvidence(db, ev()), /unavailable/);
});

// --- MASTER ARCHITECT CORRECTION 1: two Notes are two events ---------------
await check("MA-1/3 two different Notes on one unit each store their own evidence", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-created", trackableId: "approach_10", noteId: NOTE_A }));
  await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-created", trackableId: "approach_10", noteId: NOTE_B }));
  assert.equal(store.size, 2, "the second Note must not be lost as a duplicate");
});
await check("MA-2/4 the same Note retried stores once", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-revised", trackableId: "approach_10", noteId: NOTE_A }));
  await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-revised", trackableId: "approach_10", noteId: NOTE_A }));
  assert.equal(store.size, 1);
});
await check("a Note's creation evidence is stable across weeks", async () => {
  reset();
  const a = await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-created", trackableId: "approach_10", noteId: NOTE_A }));
  const b = await writeStudyActivityEvidence(db, ev({ eventType: "journal.note-created", trackableId: "approach_10", noteId: NOTE_A, dateIso: "2026-09-14" }));
  assert.equal(a.eventId, b.eventId);
  assert.equal(store.size, 1);
});

// --- MASTER ARCHITECT CORRECTION 2: WbW is ayah/day ------------------------
await check("MA-W a hundred words in one ayah on one day store ONE document", async () => {
  reset();
  for (let i = 0; i < 100; i++) {
    await writeStudyActivityEvidence(db, ev({ eventType: "wbw.engaged", trackableId: "approach_04" }));
  }
  assert.equal(store.size, 1, "occurrence-level duplication must not multiply Activity evidence");
  assert.equal(counters.creates, 1);
});
await check("MA-W a different ayah, and a different day, are separate evidence", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev({ eventType: "wbw.engaged", trackableId: "approach_04" }));
  await writeStudyActivityEvidence(db, ev({ eventType: "wbw.engaged", trackableId: "approach_04", unitKey: "ayah:2:256" }));
  await writeStudyActivityEvidence(db, ev({ eventType: "wbw.engaged", trackableId: "approach_04", dateIso: "2026-09-15" }));
  assert.equal(store.size, 3);
});

// --- refusals ---------------------------------------------------------------
await check("an actor uid is required", async () => {
  reset();
  await assert.rejects(() => writeStudyActivityEvidence(db, ev({ uid: undefined })), /uid is required/);
  assert.equal(counters.gets, 0, "nothing should be read before the caller is known");
});
await check("a status event cannot be persisted as Study evidence", async () => {
  reset();
  for (const eventType of ["status.claimed", "status.confirmed"]) {
    await assert.rejects(() => writeStudyActivityEvidence(db, ev({ eventType })), /Unknown Study event/);
  }
  assert.equal(store.size, 0);
});
await check("a refused unit type never reaches the database", async () => {
  reset();
  await assert.rejects(() => writeStudyActivityEvidence(db, ev({ unitKey: "juz:3" })), /Study Unit key/);
  assert.equal(counters.gets, 0);
  assert.equal(counters.creates, 0);
});
await check("a mismatched event/Approach pair never reaches the database", async () => {
  reset();
  await assert.rejects(() => writeStudyActivityEvidence(db, ev({ trackableId: "approach_10" })), /may not credit/);
  assert.equal(counters.creates, 0);
});

// --- cost -------------------------------------------------------------------
await check("a first write costs one read and one create; a retry costs one read", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  assert.deepEqual(counters, { gets: 1, creates: 1, queries: 0 });
  await writeStudyActivityEvidence(db, ev());
  assert.deepEqual(counters, { gets: 2, creates: 1, queries: 0 },
    "writing must never query the subcollection -- the identity IS the id");
});

// --- P4-E: the read side ----------------------------------------------------
// The candidate Rules have authorised a read since P4-C, mirroring the parent
// weekly document's own deployed rule, and the emulator suite proves it. No
// code in app/js ever read a row -- the write-only asymmetry P5-E closed for
// noteSources and P6-C for notePlacements, found in the Phase 4 collection.
await check("P4-E reads back exactly the events that were written, with their ids", async () => {
  reset();
  const a = await writeStudyActivityEvidence(db, ev());
  const b = await writeStudyActivityEvidence(db, ev({ unitKey: "ayah:2:256" }));
  const { rows, truncated } = await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13" });
  assert.equal(truncated, false);
  assert.deepEqual(rows.map((r) => r.eventId).sort(), [a.eventId, b.eventId].sort());
  assert.deepEqual(rows.map((r) => r.unitKey).sort(), ["ayah:2:255", "ayah:2:256"]);
});

await check("P4-E reads ONE week, never another person's or another week's", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  await writeStudyActivityEvidence(db, ev({ personId: "p2", uid: "uid-p2" }));
  await writeStudyActivityEvidence(db, ev({ weekKey: "2026-09-06" }));
  const mine = await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13" });
  assert.equal(mine.rows.length, 1, "the PATH is the whole scope -- one tenant, one person, one week");
  assert.equal(mine.rows[0].personId, "p1");
});

await check("P4-E's query has NO filter and NO orderBy -- the one MAP read needing no index", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13" });
  assert.equal(counters.queries, 1);
  assert.equal(lastQuery[0].collectionPath, "activity/t1__p1__2026-09-13/evidence");
  // Anything beyond the collection and the bound would be a where() or an
  // orderBy(), and an orderBy here would need a composite index that no
  // candidate declares. See firestore-index-requirements.mjs.
  assert.equal(lastQuery.length, 2, `the query carries ${lastQuery.length} parts; only the collection and a limit are allowed`);
  assert.equal(lastQuery[1].limit, MAX_EVIDENCE_PER_READ + 1,
    "the cap is asked for PLUS ONE, which is how truncation is detected rather than guessed");
});

await check("P4-E reports truncation instead of silently losing events", async () => {
  reset();
  for (let i = 1; i <= 4; i++) await writeStudyActivityEvidence(db, ev({ unitKey: `ayah:2:${i}` }));
  const capped = await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13", maximum: 2 });
  assert.equal(capped.rows.length, 2);
  assert.equal(capped.truncated, true, "a bound hit silently would lose events the person really recorded");
  const whole = await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13", maximum: 4 });
  assert.equal(whole.truncated, false, "exactly at the cap is NOT truncated");
});

await check("P4-E returns evidence and nothing shaped like a claim (ADR-003)", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  const out = JSON.stringify(await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13" }));
  for (const forbidden of ["claimStatus", "achieved", "mastered", "confirmed", "entries", "chunkKey"]) {
    assert.ok(!out.includes(forbidden), `the reader returned something named ${forbidden} -- Activity is not Mastery`);
  }
});

await check("P4-E never addresses the weekly document itself", async () => {
  reset();
  await writeStudyActivityEvidence(db, ev());
  await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p1", weekKey: "2026-09-13" });
  assert.ok(lastQuery[0].collectionPath.endsWith("/evidence"),
    "a query against activity/ itself would put evidence back in reach of bulkConfirmWeek()");
});

await check("P4-E on an empty week is an empty read, not a crash", async () => {
  reset();
  const out = await listStudyActivityEvidence(db, { tenantId: "t1", personId: "p9", weekKey: "2026-01-01" });
  assert.deepEqual(out, { rows: [], truncated: false });
});

console.log(`\n==== Study Activity evidence store: ${passed} passed, 0 failed ====`);
