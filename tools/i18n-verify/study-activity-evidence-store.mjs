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
    "const { doc, getDoc } = globalThis.__seFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__seCollections;")
  .replace(/import \{ createDocument \} from "\.\/envelope\.js";/, "const { createDocument } = globalThis.__seEnvelope;")
  .replace(/from "\.\/study-activity-evidence-id\.js"/,
    `from "${pathToFileURL(path.join(root, "app/js/study-activity-evidence-id.js")).href}"`);

// --- an in-memory Firestore that really stores, and really counts ----------
const store = new Map();               // "collectionPath/docId" -> data
const counters = { gets: 0, creates: 0 };
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
globalThis.__seEnvelope = {
  createDocument: async (_db, collectionPath, docId, data, uid) => {
    counters.creates++;
    if (createSideEffect) { createSideEffect(); createSideEffect = null; }
    if (denyCreate) throw denyCreate;
    store.set(`${collectionPath}/${docId}`, { ...data, schemaVersion: 1, createdBy: uid });
  },
};
function reset() { store.clear(); counters.gets = 0; counters.creates = 0; denyCreate = null; createSideEffect = null; }

const mod = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const { writeStudyActivityEvidence, evidenceCollectionPath } = mod;

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
  assert.deepEqual(counters, { gets: 1, creates: 1 });
  await writeStudyActivityEvidence(db, ev());
  assert.deepEqual(counters, { gets: 2, creates: 1 });
});

console.log(`\n==== Study Activity evidence store: ${passed} passed, 0 failed ====`);
