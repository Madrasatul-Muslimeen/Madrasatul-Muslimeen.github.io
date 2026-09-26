// MAP Phase 3 -- persistence for the Arabic word-progress state model.
//
// This module owns reads and writes; quran-word-progress.js owns what a state
// means. Every transition below is computed THERE and only stored here, so the
// locks it enforces cannot be bypassed by writing straight to Firestore from a
// page.
//
// LOAD-SPEED CONTRACT (Architecture Part 8). Nothing here runs at startup or
// on the landing path. A lane is read the first time a reader actually opens
// a word or asks for a coverage figure, and cached per person afterwards --
// the same on-first-use treatment the reciter timing map, the search index and
// the boundary tables already get. `primeAyahProgress` and `getSurahProgress`
// are the only entry points that fetch, and both are called from a user
// action. There is no listener and no background refresh.
//
// READ COST, measured against the packaged dataset rather than estimated:
// - one ayah   = 2 document reads (one per lane), or 0 once cached.
// - one surah  = 2 QUERIES, not 2xN gets. The query filters on tenantId and
//   personId -- exactly the two fields canRecordFor()'s rule checks, the
//   list-safety proof this codebase already established for records -- plus
//   surah, which only narrows. Because lanes are sparse, a person who has
//   touched twelve ayahs of Al-Baqarah gets twelve documents back, not 286.
// - the hard ceiling is 286 lanes per surah (Al-Baqarah), against 6,116 if
//   progress were stored one document per word.
//
// I4/D6: nothing here deletes. Clearing a word writes `not_started`, which is
// a state, not an absence.

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { isWordLevelsPersistenceReady } from "./study-word-levels-readiness.js";
import {
  WORD_PROGRESS_CONTRACT,
  MAX_WORDS_PER_AYAH,
  wordProgressLaneId,
  parseWordProgressLaneId,
  laneIdForOccurrence,
  wordProgressEntryKey,
  wordProgressAuthority,
  claimLearnerState,
  decideApproval,
  resolveWordProgress,
  decodeLearnerEntry,
  decodeSupervisorEntry,
  laneFieldUpdate,
  requireImplementedLevel,
  emptyWordProgressEntry,
} from "./quran-word-progress.js";

const LANE_COLLECTION = Object.freeze({
  learner: TENANT.QURAN_WORD_PROGRESS,
  supervisor: TENANT.QURAN_WORD_APPROVALS,
});

// Issue #320 -- `wbw` has been deployed and operational since MAP Phase 3;
// `basic` and `depth` are new and stay behind their own Owner Control Gate
// until the Rules candidate that admits them is published (see
// study-word-levels-readiness.js's own header). Every entry point below calls
// this FIRST -- before any cache lookup or Firestore call -- so a closed gate
// refuses the call outright rather than reaching the database and being
// denied there.
const LEVELS_ALWAYS_READY = Object.freeze(["wbw"]);

function requireLevelPersistenceReady(level) {
  requireImplementedLevel(level);
  if (!LEVELS_ALWAYS_READY.includes(level) && !isWordLevelsPersistenceReady()) {
    throw new RangeError(`Arabic level "${level}" is not yet available: its Firestore Rules have not been deployed.`);
  }
  return level;
}

/**
 * A surah-scoped read is capped so a coverage call can never turn into an
 * unbounded scan if the data is ever wider than this contract allows. The cap
 * is the real ceiling plus headroom, and exceeding it is reported rather than
 * silently truncated -- a truncated denominator would understate coverage,
 * which is exactly the "unknown is not zero" failure the storage paper names.
 */
export const MAX_LANES_PER_SURAH_READ = 300;

// ---------------------------------------------------------------------------
// Cache. Per (tenant, person, level, surah) so switching student in a
// roster dropdown -- the D10 workflow -- cannot show the previous child's
// progress, and so a language or unit change costs no re-read.
// ---------------------------------------------------------------------------

const cache = new Map();

function surahCacheKey({ tenantId, personId, level, surah }) {
  return `${tenantId}|${personId}|${level}|${surah}`;
}

function cacheFor(scope) {
  const key = surahCacheKey(scope);
  if (!cache.has(key)) cache.set(key, { learner: new Map(), supervisor: new Map(), wholeSurahLoaded: false });
  return cache.get(key);
}

/** Drop everything cached. Called on sign-out and when a person is switched. */
export function clearWordProgressCache() { cache.clear(); }

// ---------------------------------------------------------------------------
// Reading.
// ---------------------------------------------------------------------------

function decodeLane(lane, raw) {
  if (raw?.contractVersion && raw.contractVersion !== WORD_PROGRESS_CONTRACT) {
    throw new RangeError(`Unsupported word progress contract: ${raw.contractVersion}.`);
  }
  const decode = lane === "supervisor" ? decodeSupervisorEntry : decodeLearnerEntry;
  const out = new Map();
  for (const [key, value] of Object.entries(raw?.entries ?? {})) {
    if (!/^\d+$/.test(key)) continue;
    out.set(key, decode(value));
  }
  return out;
}

async function fetchLane(db, lane, laneId) {
  const snap = await getDoc(doc(db, LANE_COLLECTION[lane], laneId));
  return decodeLane(lane, snap.exists() ? snap.data() : null);
}

/**
 * Load both lanes for one ayah. Returns nothing -- the caller then reads
 * synchronously through wordProgressFor(), so a renderer never has to be async.
 */
export async function primeAyahProgress(db, { tenantId, personId, level = "wbw", surah, ayah } = {}) {
  requireLevelPersistenceReady(level);
  const scope = { tenantId, personId, level, surah };
  const store = cacheFor(scope);
  if (store.wholeSurahLoaded) return { fetched: 0, cached: true };
  const laneId = wordProgressLaneId({ tenantId, personId, level, surah, ayah });
  if (store.learner.has(ayah)) return { fetched: 0, cached: true };
  const [learner, supervisor] = await Promise.all([
    fetchLane(db, "learner", laneId),
    fetchLane(db, "supervisor", laneId),
  ]);
  store.learner.set(ayah, learner);
  store.supervisor.set(ayah, supervisor);
  return { fetched: 2, cached: false };
}

/**
 * Load every lane this person has for one surah, in two queries.
 *
 * `truncated` is returned rather than thrown so a reader still sees the
 * progress that WAS loaded; the caller is expected to report the figure as
 * incomplete rather than print a percentage computed from a short read.
 */
export async function getSurahProgress(db, { tenantId, personId, level = "wbw", surah, force = false } = {}) {
  requireLevelPersistenceReady(level);
  const scope = { tenantId, personId, level, surah };
  const store = cacheFor(scope);
  if (store.wholeSurahLoaded && !force) return { fetched: 0, cached: true, truncated: false };

  const laneQuery = (lane) => query(
    collection(db, LANE_COLLECTION[lane]),
    // tenantId and personId are the two fields canRecordFor() itself checks,
    // so this list is provable from its own filters. level and surah only
    // narrow it further.
    where("tenantId", "==", tenantId),
    where("personId", "==", personId),
    where("level", "==", level),
    where("surah", "==", surah),
  );
  const [learnerSnap, supervisorSnap] = await Promise.all([getDocs(laneQuery("learner")), getDocs(laneQuery("supervisor"))]);

  let truncated = false;
  for (const [lane, snap] of [["learner", learnerSnap], ["supervisor", supervisorSnap]]) {
    if (snap.docs.length > MAX_LANES_PER_SURAH_READ) truncated = true;
    for (const d of snap.docs.slice(0, MAX_LANES_PER_SURAH_READ)) {
      let ayah;
      try { ({ ayah } = parseWordProgressLaneId(d.id)); } catch { continue; }
      store[lane].set(ayah, decodeLane(lane, d.data()));
    }
  }
  // A surah read is only recorded as complete when it really was: a truncated
  // one must not stop a later, narrower ayah read from happening.
  if (!truncated) store.wholeSurahLoaded = true;
  return { fetched: learnerSnap.docs.length + supervisorSnap.docs.length, cached: false, truncated };
}

function entriesFor(store, lane, ayah) {
  return store[lane].get(ayah) ?? new Map();
}

/**
 * The resolved view of one word, read synchronously out of the cache. An
 * un-primed ayah answers `loaded: false` rather than `not_started`, so a
 * screen can never print "you have not learned this" about data it has not
 * actually read -- the storage paper's "a mismatch is unknown, not zero".
 */
export function wordProgressFor({ tenantId, personId, level = "wbw", occurrenceId, confirmationRequired = false } = {}) {
  const { laneId, position } = laneIdForOccurrence({ tenantId, personId, level, occurrenceId });
  const { surah, ayah } = parseWordProgressLaneId(laneId);
  const store = cacheFor({ tenantId, personId, level, surah });
  const loaded = store.wholeSurahLoaded || store.learner.has(ayah);
  const key = wordProgressEntryKey(position);
  const view = resolveWordProgress({
    learner: entriesFor(store, "learner", ayah).get(key),
    supervisor: entriesFor(store, "supervisor", ayah).get(key),
    confirmationRequired,
  });
  return Object.freeze({ ...view, loaded, surah, ayah, position, occurrenceId });
}

/** Every resolved word state for one ayah, for a renderer that wants the row at once. */
export function ayahProgressFor({ tenantId, personId, level = "wbw", surah, ayah, positions, confirmationRequired = false } = {}) {
  const store = cacheFor({ tenantId, personId, level, surah });
  const loaded = store.wholeSurahLoaded || store.learner.has(ayah);
  const learner = entriesFor(store, "learner", ayah);
  const supervisor = entriesFor(store, "supervisor", ayah);
  const list = Array.isArray(positions) ? positions : [...learner.keys()].map(Number).sort((a, b) => a - b);
  return list.map((position) => {
    const key = wordProgressEntryKey(position);
    return Object.freeze({
      ...resolveWordProgress({ learner: learner.get(key), supervisor: supervisor.get(key), confirmationRequired }),
      loaded, surah, ayah, position,
    });
  });
}

// ---------------------------------------------------------------------------
// Writing.
//
// Both writers refuse before touching Firestore when the actor may not do it.
// That refusal is NOT the security boundary -- the candidate Rules are -- but
// it is what turns a would-be permission error into a sentence a person can
// read (I15), and it keeps a UI bug from producing a write that only the
// server rejects.
// ---------------------------------------------------------------------------

function laneDocumentFields({ laneId, lane }) {
  const { tenantId, personId, level, surah, ayah } = parseWordProgressLaneId(laneId);
  // These six are what make the document self-describing and the surah query
  // above provable: they are written on create and never changed afterwards.
  return { contractVersion: WORD_PROGRESS_CONTRACT, identityContract: "quran-word-occurrence:v1", lane, tenantId, personId, level, surah, ayah };
}

async function writeLaneEntry(db, { lane, laneId, position, entry, actorUid }) {
  const collectionName = LANE_COLLECTION[lane];
  const snap = await getDoc(doc(db, collectionName, laneId));
  const update = laneFieldUpdate({ lane, position, entry });
  if (snap.exists()) {
    const count = Object.keys(snap.data().entries ?? {}).length;
    if (count >= MAX_WORDS_PER_AYAH && !(String(position) in (snap.data().entries ?? {}))) {
      throw new RangeError(`This ayah lane already holds ${MAX_WORDS_PER_AYAH} words, the longest ayah in the dataset.`);
    }
    await updateDocument(db, collectionName, laneId, update);
  } else {
    const key = wordProgressEntryKey(position);
    await createDocument(db, collectionName, laneId, { ...laneDocumentFields({ laneId, lane }), entries: { [key]: update[`entries.${key}`] } }, actorUid);
  }
}

/**
 * A learner sets one word's state -- or a supervisor sets it FOR a managed
 * student, which is the same act by a different hand and is recorded as such
 * in the entry's own byPersonId.
 */
export async function setWordState(db, {
  tenantId, personId, level = "wbw", occurrenceId, state,
  actorPersonId, actorUid, isSupervisor = false, confirmationRequired = false, nowIso,
} = {}) {
  const authority = wordProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayClaim) {
    throw new Error("You are not able to record Arabic word progress for this person.");
  }
  const { laneId, position } = laneIdForOccurrence({ tenantId, personId, level, occurrenceId });
  const { surah, ayah } = parseWordProgressLaneId(laneId);
  await primeAyahProgress(db, { tenantId, personId, level, surah, ayah });
  const store = cacheFor({ tenantId, personId, level, surah });
  const key = wordProgressEntryKey(position);
  const currentLearner = entriesFor(store, "learner", ayah).get(key) ?? emptyWordProgressEntry();
  const currentSupervisor = entriesFor(store, "supervisor", ayah).get(key) ?? decodeSupervisorEntry(null);

  const next = claimLearnerState({
    currentLearner, currentSupervisor, state, actorPersonId,
    atIso: nowIso ?? new Date().toISOString(), confirmationRequired,
  });
  if (!next.changed) return { changed: false, writes: 0 };

  await writeLaneEntry(db, { lane: "learner", laneId, position, entry: next.learner, actorUid });
  let writes = 1;
  // The supervisor lane is touched only when the review genuinely re-opened;
  // most claims write exactly one document.
  if (next.supervisor !== currentSupervisor) {
    await writeLaneEntry(db, { lane: "supervisor", laneId, position, entry: next.supervisor, actorUid });
    writes = 2;
  }
  // The harness's Firebase stub never mutates its own data, and neither does a
  // real read-after-write without a round trip -- so the cache is patched from
  // the value that was actually written. That is also the better production
  // behaviour: no re-read, and the screen cannot show a stale state.
  entriesFor(store, "learner", ayah).set(key, next.learner);
  store.learner.set(ayah, entriesFor(store, "learner", ayah));
  entriesFor(store, "supervisor", ayah).set(key, next.supervisor);
  store.supervisor.set(ayah, entriesFor(store, "supervisor", ayah));
  return { changed: true, writes, laneId, position };
}

/** A supervisor confirms or returns the claim that is on the table. Never self. */
export async function decideWordApproval(db, {
  tenantId, personId, level = "wbw", occurrenceId, review, note = null,
  actorPersonId, actorUid, isSupervisor = false, confirmationRequired = true, nowIso,
} = {}) {
  const authority = wordProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayDecide) {
    throw new Error("You are not able to approve Arabic word progress for this person.");
  }
  const { laneId, position } = laneIdForOccurrence({ tenantId, personId, level, occurrenceId });
  const { surah, ayah } = parseWordProgressLaneId(laneId);
  await primeAyahProgress(db, { tenantId, personId, level, surah, ayah });
  const store = cacheFor({ tenantId, personId, level, surah });
  const key = wordProgressEntryKey(position);

  const next = decideApproval({
    currentLearner: entriesFor(store, "learner", ayah).get(key) ?? emptyWordProgressEntry(),
    currentSupervisor: entriesFor(store, "supervisor", ayah).get(key) ?? decodeSupervisorEntry(null),
    review, byPersonId: actorPersonId, atIso: nowIso ?? new Date().toISOString(), note,
  });
  await writeLaneEntry(db, { lane: "supervisor", laneId, position, entry: next.supervisor, actorUid });
  entriesFor(store, "supervisor", ayah).set(key, next.supervisor);
  store.supervisor.set(ayah, entriesFor(store, "supervisor", ayah));
  return { changed: true, writes: 1, laneId, position };
}
