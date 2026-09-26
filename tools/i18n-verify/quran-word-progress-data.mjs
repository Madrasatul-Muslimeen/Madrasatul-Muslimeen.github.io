// MAP Phase 3 -- the word-progress data layer, executed against an in-memory
// Firestore. No network, no emulator, no database.
//
// The point of this suite is COST and BOUNDARY, not just correctness: every
// read and every write is counted, so "one ayah costs two reads" and "a surah
// costs two queries" are measured facts rather than claims in a comment.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || process.cwd());
let source = fs.readFileSync(path.join(root, "app/js/quran-word-progress-data.js"), "utf8");
source = source
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
    "const { doc, getDoc, collection, query, where, getDocs } = globalThis.__wpFirestore;")
  .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__wpCollections;")
  .replace(/import \{ createDocument, updateDocument \} from "\.\/envelope\.js";/, "const { createDocument, updateDocument } = globalThis.__wpEnvelope;")
  // Issue #320 -- the Basic/Depth gate. This suite is about the data
  // layer's OWN behaviour under the gate open/closed, not about the real
  // declaration's shape (that lives in its own governed-decision predicate,
  // exercised the same way study-lemma-progress-readiness.js's malformed-
  // shape checks are), so it is swapped for a plain flag this suite controls
  // directly -- the same technique used below for reset()'s own globals.
  .replace(/import \{ isWordLevelsPersistenceReady \} from "\.\/study-word-levels-readiness\.js";/,
    "const isWordLevelsPersistenceReady = () => globalThis.__wpWordLevelsGateOpen === true;")
  .replace(/from "\.\/quran-word-progress\.js"/, `from "${pathToFileURL(path.join(root, "app/js/quran-word-progress.js")).href}"`);
globalThis.__wpWordLevelsGateOpen = false;

const TENANT = Object.freeze({ QURAN_WORD_PROGRESS: "quranWordProgress", QURAN_WORD_APPROVALS: "quranWordApprovals" });

// --- the in-memory database, which really stores what is written -----------
const store = new Map();          // "collection/docId" -> data
const counters = { gets: 0, queries: 0, creates: 0, updates: 0 };
function reset() { store.clear(); for (const k of Object.keys(counters)) counters[k] = 0; }
function setDeep(target, dotted, value) {
  const parts = dotted.split(".");
  let node = target;
  for (const part of parts.slice(0, -1)) { node[part] = node[part] ?? {}; node = node[part]; }
  node[parts.at(-1)] = value;
}

globalThis.__wpCollections = { TENANT };
globalThis.__wpFirestore = {
  doc: (_db, collectionName, docId) => ({ collectionName, docId }),
  getDoc: async (ref) => {
    counters.gets++;
    const value = store.get(`${ref.collectionName}/${ref.docId}`);
    return { exists: () => value !== undefined, data: () => value, id: ref.docId };
  },
  collection: (_db, name) => ({ name }),
  where: (field, op, value) => ({ field, op, value }),
  query: (source_, ...clauses) => ({ source: source_, clauses }),
  getDocs: async (q) => {
    counters.queries++;
    const docs = [];
    for (const [key, data] of store) {
      const [collectionName, docId] = [key.slice(0, key.indexOf("/")), key.slice(key.indexOf("/") + 1)];
      if (collectionName !== q.source.name) continue;
      if (!q.clauses.every((c) => data[c.field] === c.value)) continue;
      docs.push({ id: docId, data: () => data });
    }
    return { docs };
  },
};
globalThis.__wpEnvelope = {
  createDocument: async (_db, collectionName, docId, data, uid) => {
    counters.creates++;
    if (!uid) throw new Error("createDocument refused: no uid supplied for createdBy.");
    store.set(`${collectionName}/${docId}`, { ...data, schemaVersion: 1, createdBy: uid, createdAt: "S", updatedAt: "S" });
  },
  updateDocument: async (_db, collectionName, docId, data) => {
    counters.updates++;
    const existing = store.get(`${collectionName}/${docId}`);
    if (!existing) throw new Error(`updateDocument on a missing document: ${collectionName}/${docId}`);
    for (const [key, value] of Object.entries(data)) setDeep(existing, key, value);
    existing.updatedAt = "S";
  },
};

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const data = await import(moduleUrl);
const model = await import(pathToFileURL(path.join(root, "app/js/quran-word-progress.js")).href);

let passed = 0, failed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log(`  PASS  ${label}`); }
  catch (error) { failed++; console.log(`  FAIL  ${label}\n        ${error.message}`); }
}

const DB = {};
const SELF = { tenantId: "t1", personId: "p1", actorPersonId: "p1", actorUid: "uid-p1", isSupervisor: false };
const TEACHER = { tenantId: "t1", personId: "p1", actorPersonId: "t9", actorUid: "uid-t9", isSupervisor: true };
const OCC = (s, a, p) => `quran-word-occurrence:v1:${s}:${a}:${p}`;
function fresh() { reset(); data.clearWordProgressCache(); }

// --- 1. Collections and document addressing --------------------------------
await check("the two lanes are two different collections", () =>
  assert.notEqual(TENANT.QURAN_WORD_PROGRESS, TENANT.QURAN_WORD_APPROVALS));
await check("neither lane is the records collection", () => {
  const src = fs.readFileSync(path.join(root, "app/js/quran-word-progress-data.js"), "utf8");
  assert.ok(!/TENANT\.RECORDS|TENANT\.ACTIVITY/.test(src), "word progress must never write to records or activity");
});

// --- 2. A first claim ------------------------------------------------------
fresh();
await check("a first claim creates exactly one document in the learner lane", async () => {
  const out = await data.setWordState(DB, { ...SELF, occurrenceId: OCC(2, 282, 5), state: "learning", nowIso: "2026-09-13T10:00:00.000Z" });
  assert.equal(out.changed, true);
  assert.equal(counters.creates, 1);
  assert.equal(counters.updates, 0);
  assert.ok(store.has("quranWordProgress/t1__p1__wbw__2_282"), [...store.keys()].join(","));
  assert.equal(store.size, 1, "the supervisor lane must not be created by a claim");
});
await check("the created document is self-describing and query-shaped", () => {
  const d = store.get("quranWordProgress/t1__p1__wbw__2_282");
  assert.equal(d.contractVersion, "quran-word-progress:v1");
  assert.equal(d.identityContract, "quran-word-occurrence:v1");
  assert.equal(d.lane, "learner");
  assert.deepEqual([d.tenantId, d.personId, d.level, d.surah, d.ayah], ["t1", "p1", "wbw", 2, 282]);
});
await check("I17: the envelope stamped it", () => {
  const d = store.get("quranWordProgress/t1__p1__wbw__2_282");
  assert.equal(d.schemaVersion, 1);
  assert.equal(d.createdBy, "uid-p1");
  assert.ok(d.createdAt && d.updatedAt);
});
await check("a second word in the same ayah updates, never re-creates", async () => {
  const before = counters.creates;
  await data.setWordState(DB, { ...SELF, occurrenceId: OCC(2, 282, 6), state: "learning", nowIso: "2026-09-13T10:01:00.000Z" });
  assert.equal(counters.creates, before, "the lane already exists");
  assert.equal(Object.keys(store.get("quranWordProgress/t1__p1__wbw__2_282").entries).length, 2);
});
await check("re-claiming the same state writes nothing at all", async () => {
  const before = { ...counters };
  const out = await data.setWordState(DB, { ...SELF, occurrenceId: OCC(2, 282, 6), state: "learning", nowIso: "2026-09-13T10:02:00.000Z" });
  assert.equal(out.changed, false);
  assert.equal(out.writes, 0);
  assert.equal(counters.creates, before.creates);
  assert.equal(counters.updates, before.updates);
});

// --- 3. Read cost ----------------------------------------------------------
fresh();
await check("one ayah costs exactly two document reads, one per lane", async () => {
  const out = await data.primeAyahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2, ayah: 282 });
  assert.equal(out.fetched, 2);
  assert.equal(counters.gets, 2);
  assert.equal(counters.queries, 0);
});
await check("the same ayah again costs nothing", async () => {
  const before = counters.gets;
  const out = await data.primeAyahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2, ayah: 282 });
  assert.equal(out.cached, true);
  assert.equal(counters.gets, before);
});
await check("a surah costs two QUERIES, not two reads per ayah", async () => {
  fresh();
  for (const ayah of [1, 2, 3, 40, 255]) {
    await data.setWordState(DB, { ...SELF, occurrenceId: OCC(2, ayah, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" });
  }
  const gets = counters.gets, queries = counters.queries;
  data.clearWordProgressCache();
  const out = await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2 });
  assert.equal(counters.queries - queries, 2, "one query per lane");
  assert.equal(counters.gets - gets, 0, "no per-ayah gets");
  assert.equal(out.fetched, 5, "sparse: only the five touched ayahs come back, not 286");
});
await check("the surah query filters on the two fields canRecordFor proves", () => {
  const src = fs.readFileSync(path.join(root, "app/js/quran-word-progress-data.js"), "utf8");
  assert.ok(/where\("tenantId", "==", tenantId\)/.test(src));
  assert.ok(/where\("personId", "==", personId\)/.test(src));
});
await check("a cached surah is not re-read", async () => {
  const before = counters.queries;
  await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2 });
  assert.equal(counters.queries, before);
});
await check("force re-reads it", async () => {
  const before = counters.queries;
  await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2, force: true });
  assert.equal(counters.queries, before + 2);
});
await check("another person's progress is never served from this person's cache", async () => {
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p2", occurrenceId: OCC(2, 1, 1) });
  assert.equal(view.loaded, false, "p2 has not been read; the answer is unknown, not not_started");
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(2, 1, 1) }).loaded, true);
});
await check("a different tenant is a different cache too (I13)", () =>
  assert.equal(data.wordProgressFor({ tenantId: "t2", personId: "p1", occurrenceId: OCC(2, 1, 1) }).loaded, false));

// --- 4. Unknown is not zero ------------------------------------------------
fresh();
await check("an un-primed word reports loaded:false rather than not_started", () => {
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1) });
  assert.equal(view.loaded, false);
  assert.equal(view.countsAsKnown, false);
});
await check("a primed but untouched word IS loaded and IS not_started", async () => {
  await data.primeAyahProgress(DB, { tenantId: "t1", personId: "p1", surah: 1, ayah: 1 });
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1) });
  assert.equal(view.loaded, true);
  assert.equal(view.state, "not_started");
});

// --- 5. Authority ----------------------------------------------------------
fresh();
await check("a stranger cannot record for someone else, and nothing is written", async () => {
  await assert.rejects(
    data.setWordState(DB, { tenantId: "t1", personId: "p1", actorPersonId: "x9", actorUid: "uid-x9", isSupervisor: false, occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" }),
    /not able to record/);
  assert.equal(store.size, 0);
  assert.equal(counters.gets, 0, "authority is checked BEFORE any read");
});
await check("a supervisor may record for a managed student, recorded as their hand", async () => {
  await data.setWordState(DB, { ...TEACHER, occurrenceId: OCC(1, 1, 1), state: "achieved", confirmationRequired: true, nowIso: "2026-09-13T10:00:00.000Z" });
  const d = store.get("quranWordProgress/t1__p1__wbw__1_1");
  assert.equal(d.entries["1"].by, "t9", "the supervisor's own personId is on the claim");
  assert.equal(d.personId, "p1", "but the progress belongs to the student");
});
await check("a learner cannot approve their own claim, and nothing is written", async () => {
  const before = store.size;
  await assert.rejects(
    data.decideWordApproval(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), review: "confirmed", confirmationRequired: true, nowIso: "2026-09-13T10:05:00.000Z" }),
    /not able to approve/);
  assert.equal(store.size, before);
});
await check("a supervisor cannot approve where confirmation is not required", async () =>
  assert.rejects(
    data.decideWordApproval(DB, { ...TEACHER, occurrenceId: OCC(1, 1, 1), review: "confirmed", confirmationRequired: false, nowIso: "2026-09-13T10:05:00.000Z" }),
    /not able to approve/));

// --- 6. Approval writes the OTHER lane -------------------------------------
await check("an approval writes the supervisor lane only", async () => {
  const learnerBefore = JSON.stringify(store.get("quranWordProgress/t1__p1__wbw__1_1"));
  const out = await data.decideWordApproval(DB, { ...TEACHER, occurrenceId: OCC(1, 1, 1), review: "confirmed", confirmationRequired: true, nowIso: "2026-09-13T10:05:00.000Z" });
  assert.equal(out.writes, 1);
  assert.ok(store.has("quranWordApprovals/t1__p1__wbw__1_1"));
  assert.equal(JSON.stringify(store.get("quranWordProgress/t1__p1__wbw__1_1")), learnerBefore, "the learner's own lane is untouched by a decision");
});
await check("the approved word now counts as known", () => {
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1), confirmationRequired: true });
  assert.equal(view.countsAsKnown, true);
  assert.equal(view.reviewedByPersonId, "t9");
});
await check("the cache was patched from what was written, not re-read", () => {
  // The stub would answer stale data on a re-read; if the view above is right
  // without an extra get, the module patched its own cache.
  assert.equal(counters.gets <= 6, true, `gets=${counters.gets}`);
});
// UPDATED: this check was written against the shape whose defect it found.
// A claim used to write "pending" over the stored decision to re-open the
// review -- editing a frozen confirmation and destroying it in history. The
// decision is now pinned to the claim instant it was given for, so a new
// claim stops counting by itself. The review still re-opens for the reader;
// it just costs one write instead of two and rewrites nothing.
await check("a fresh claim gets its own look, costs ONE write, and edits no decision (I6)", async () => {
  const before = counters.updates;
  await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "learning", confirmationRequired: true, nowIso: "2026-09-13T11:00:00.000Z" });
  const out = await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "achieved", confirmationRequired: true, nowIso: "2026-09-13T11:01:00.000Z" });
  assert.equal(out.writes, 1, "the learner lane only");
  assert.equal(counters.updates, before + 2);
  const sup = store.get("quranWordApprovals/t1__p1__wbw__1_1").entries["1"];
  assert.equal(sup.r, "c", "the decision itself is NOT rewritten");
  assert.equal(sup.by, "t9", "who decided is frozen");
  assert.equal(sup.at, "2026-09-13T10:05:00.000Z", "when they decided is frozen");
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1), confirmationRequired: true });
  assert.equal(view.review, "pending", "but the reader sees the new claim awaiting its own look");
  assert.equal(view.countsAsKnown, false);
});
await check("every ordinary claim costs exactly one write", async () => {
  const out = await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 2), state: "learning", confirmationRequired: true, nowIso: "2026-09-13T11:02:00.000Z" });
  assert.equal(out.writes, 1);
});

// --- 7. Returned work ------------------------------------------------------
await check("a returned claim carries its reason and does not count", async () => {
  await data.decideWordApproval(DB, { ...TEACHER, occurrenceId: OCC(1, 1, 1), review: "returned", note: "look at the vowel", confirmationRequired: true, nowIso: "2026-09-13T12:00:00.000Z" });
  assert.equal(store.get("quranWordApprovals/t1__p1__wbw__1_1").entries["1"].fc, "2026-09-13T11:01:00.000Z", "pinned to the claim it decided");
  const view = data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1), confirmationRequired: true });
  assert.equal(view.countsAsKnown, false);
  assert.equal(view.returnNote, "look at the vowel");
});
await check("the superseded confirmation is kept in the stored document (I4)", () => {
  const sup = store.get("quranWordApprovals/t1__p1__wbw__1_1").entries["1"];
  assert.equal(sup.h.length, 1);
  assert.equal(sup.h[0].r, "c");
});

// --- 8. Issue #320's own gate, and bad input --------------------------------
// UPDATED, issue #320: the state model now IMPLEMENTS basic/depth (the Owner
// settled their claim unit as the same word occurrence WbW uses), so the
// refusal below moved from the state model to this module's OWN, separate
// deployment gate -- REFUSED while it is closed, ACCEPTED once it is open.
// wbw is unaffected either way: it has been deployed since MAP Phase 3.
fresh();
await check("Basic Arabic progress is refused while its gate is closed, and nothing is written", async () => {
  globalThis.__wpWordLevelsGateOpen = false;
  await assert.rejects(
    data.setWordState(DB, { ...SELF, level: "basic", occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" }),
    /not yet available/);
  assert.equal(store.size, 0);
  assert.equal(counters.gets, 0, "the gate refuses before any read");
});
await check("Arabic in Depth progress is refused while its gate is closed, and nothing is written", async () => {
  await assert.rejects(
    data.setWordState(DB, { ...SELF, level: "depth", occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" }),
    /not yet available/);
  assert.equal(store.size, 0);
});
await check("wbw is completely unaffected by the basic/depth gate", async () => {
  const out = await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 2), state: "learning", nowIso: "2026-09-13T10:00:00.000Z" });
  assert.equal(out.changed, true);
});
await check("Basic Arabic progress is ACCEPTED once its gate is open", async () => {
  fresh();
  globalThis.__wpWordLevelsGateOpen = true;
  const out = await data.setWordState(DB, { ...SELF, level: "basic", occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" });
  assert.deepEqual(out, { changed: true, writes: 1, laneId: "t1__p1__basic__1_1", position: 1 });
  assert.ok(store.has("quranWordProgress/t1__p1__basic__1_1"));
});
await check("Arabic in Depth progress is ACCEPTED once its gate is open, and independent of Basic's own lane", async () => {
  const out = await data.setWordState(DB, { ...SELF, level: "depth", occurrenceId: OCC(1, 1, 1), state: "learning", nowIso: "2026-09-13T10:00:01.000Z" });
  assert.deepEqual(out, { changed: true, writes: 1, laneId: "t1__p1__depth__1_1", position: 1 });
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", level: "basic", occurrenceId: OCC(1, 1, 1) }).state, "achieved",
    "the basic claim just made is untouched by the depth claim on the same word");
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", level: "depth", occurrenceId: OCC(1, 1, 1) }).state, "learning");
});
await check("a wbw claim on the same word stays independent of both basic and depth (all three levels never collide)", async () => {
  await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:02.000Z" });
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", occurrenceId: OCC(1, 1, 1) }).state, "achieved");
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", level: "basic", occurrenceId: OCC(1, 1, 1) }).state, "achieved");
  assert.equal(data.wordProgressFor({ tenantId: "t1", personId: "p1", level: "depth", occurrenceId: OCC(1, 1, 1) }).state, "learning");
});
await check("an unknown level is refused whatever the gate reads", async () => {
  globalThis.__wpWordLevelsGateOpen = false;
  await assert.rejects(data.setWordState(DB, { ...SELF, level: "grammar", occurrenceId: OCC(1, 1, 1), state: "achieved" }), /Unknown Arabic level/);
  globalThis.__wpWordLevelsGateOpen = true;
  await assert.rejects(data.setWordState(DB, { ...SELF, level: "grammar", occurrenceId: OCC(1, 1, 1), state: "achieved" }), /Unknown Arabic level/);
});
globalThis.__wpWordLevelsGateOpen = false;
fresh();
await check("a v2 occurrence id is refused before any write", async () => {
  await assert.rejects(data.setWordState(DB, { ...SELF, occurrenceId: "quran-word-occurrence:v2:1:1:1", state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" }), /Unsupported/);
  assert.equal(store.size, 0);
});
await check("an unknown state is refused before any write", async () => {
  await assert.rejects(data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "mastered", nowIso: "2026-09-13T10:00:00.000Z" }), /Unknown WbW word state/);
  assert.equal(store.size, 0);
});
await check("a stored document from a future contract is refused, not read as v1", async () => {
  fresh();
  store.set("quranWordProgress/t1__p1__wbw__1_1", { contractVersion: "quran-word-progress:v2", entries: { 1: { s: "a" } } });
  await assert.rejects(data.primeAyahProgress(DB, { tenantId: "t1", personId: "p1", surah: 1, ayah: 1 }), /Unsupported word progress contract/);
});
await check("a lane already holding the longest ayah refuses a 129th word", async () => {
  fresh();
  const entries = {};
  for (let p = 1; p <= model.MAX_WORDS_PER_AYAH; p++) entries[p] = { s: "l", at: "2026-09-13T10:00:00.000Z", by: "p1" };
  store.set("quranWordProgress/t1__p1__wbw__2_282", { contractVersion: "quran-word-progress:v1", lane: "learner", tenantId: "t1", personId: "p1", level: "wbw", surah: 2, ayah: 282, entries });
  await assert.rejects(
    data.setWordState(DB, { ...SELF, occurrenceId: OCC(2, 282, 129), state: "learning", nowIso: "2026-09-13T10:00:00.000Z" }),
    /position must be an integer from 1 to 128/);
});

// --- 9. The read cap -------------------------------------------------------
fresh();
await check("a surah read beyond the cap reports truncated rather than silently short", async () => {
  for (let ayah = 1; ayah <= model.MAX_WORDS_PER_AYAH; ayah++) {
    store.set(`quranWordProgress/t1__p1__wbw__2_${ayah}`, { contractVersion: "quran-word-progress:v1", lane: "learner", tenantId: "t1", personId: "p1", level: "wbw", surah: 2, ayah, entries: { 1: { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } });
  }
  const ok = await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2 });
  assert.equal(ok.truncated, false, "128 lanes is inside the cap");
  data.clearWordProgressCache();
  for (let ayah = 129; ayah <= data.MAX_LANES_PER_SURAH_READ + 5; ayah++) {
    store.set(`quranWordProgress/t1__p1__wbw__2_${ayah}`, { contractVersion: "quran-word-progress:v1", lane: "learner", tenantId: "t1", personId: "p1", level: "wbw", surah: 2, ayah, entries: { 1: { s: "a", at: "2026-09-13T10:00:00.000Z", by: "p1" } } });
  }
  const over = await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2 });
  assert.equal(over.truncated, true);
});
await check("a truncated surah read is NOT remembered as a complete one", async () => {
  const before = counters.queries;
  await data.getSurahProgress(DB, { tenantId: "t1", personId: "p1", surah: 2 });
  assert.equal(counters.queries, before + 2, "a short read must be retried, never cached as whole");
});

// --- 10. Nothing is ever deleted -------------------------------------------
await check("I4/D6: the module contains no delete call", () => {
  const src = fs.readFileSync(path.join(root, "app/js/quran-word-progress-data.js"), "utf8");
  assert.ok(!/deleteDoc|deleteField|\.delete\(/.test(src));
});
await check("clearing a word stores not_started rather than removing the entry", async () => {
  fresh();
  await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "achieved", nowIso: "2026-09-13T10:00:00.000Z" });
  await data.setWordState(DB, { ...SELF, occurrenceId: OCC(1, 1, 1), state: "not_started", nowIso: "2026-09-13T10:01:00.000Z" });
  const d = store.get("quranWordProgress/t1__p1__wbw__1_1");
  assert.ok("1" in d.entries, "the entry survives");
  assert.equal(d.entries["1"].s, "n");
});

console.log(`\n==== Word progress data layer: ${passed} passed, ${failed} failed ====`);
process.exit(failed ? 1 : 0);
