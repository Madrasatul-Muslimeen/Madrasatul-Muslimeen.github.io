// MAP -- persistence for lemma-level word progress (issue #301, re-issue of
// #296).
//
// This module owns reads and writes; quran-lemma-progress.js owns what a
// lemma's state means. Every transition below is computed THERE and only
// stored here, mirroring the split app/js/quran-word-progress-data.js
// already makes for occurrence progress.
//
// UNINVOKED THIS ROUND. Nothing under app/ imports this file (see
// quran-lemma-progress-boundary.mjs, with a positive control) -- the UI
// wiring and the Word Card numbers come in the next round, so nothing here
// runs at startup, on the landing path, or anywhere else yet (I9 is moot
// while the module is unreachable, and stays honoured once it is wired: no
// function here is called except in direct response to a person's own
// action).
//
// I4/D6: nothing here deletes. Un-claiming a lemma writes not_started, which
// is a state, not an absence.

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import {
  wordProgressLaneId,
  wordProgressEntryKey,
  decodeLearnerEntry as decodeOccurrenceLearnerEntry,
  decodeSupervisorEntry as decodeOccurrenceSupervisorEntry,
  resolveWordProgress as resolveOccurrenceProgress,
  requireImplementedLevel,
} from "./quran-word-progress.js";
import { loadWordIdentityIndex, unpackWordIndexRef } from "./quran-word-index.js";
import {
  LEMMA_PROGRESS_LANES,
  lemmaProgressDocId,
  parseLemmaProgressDocId,
  resolveLemmaProgress,
  claimLemmaState,
  decideLemmaApproval,
  lemmaProgressAuthority,
  emptyLemmaLearnerEntry,
  emptyLemmaSupervisorEntry,
  decodeLemmaLaneEntry,
  lemmaEntryFields,
} from "./quran-lemma-progress.js";

const LANE_COLLECTION = Object.freeze({
  learner: TENANT.QURAN_LEMMA_PROGRESS,
  supervisor: TENANT.QURAN_LEMMA_APPROVALS,
});

const OCCURRENCE_LANE_COLLECTION = Object.freeze({
  learner: TENANT.QURAN_WORD_PROGRESS,
  supervisor: TENANT.QURAN_WORD_APPROVALS,
});

// ---------------------------------------------------------------------------
// Cache. Per (tenant, person, level) -> Map(lemmaId -> {learner, supervisor}),
// the same D10-safe shape quran-word-progress-data.js already uses, so
// switching the selected student in a roster dropdown cannot show the
// previous child's progress.
// ---------------------------------------------------------------------------

const cache = new Map();

function scopeCacheKey({ tenantId, personId, level }) {
  return `${tenantId}|${personId}|${level}`;
}

function cacheFor(scope) {
  const key = scopeCacheKey(scope);
  if (!cache.has(key)) cache.set(key, new Map());
  return cache.get(key);
}

/** Drop everything cached. Called on sign-out and when a person is switched. */
export function clearLemmaProgressCache() { cache.clear(); }

// ---------------------------------------------------------------------------
// Reading.
// ---------------------------------------------------------------------------

async function fetchLemmaLane(db, lane, docId) {
  const snap = await getDoc(doc(db, LANE_COLLECTION[lane], docId));
  return decodeLemmaLaneEntry(lane, snap.exists() ? snap.data() : null);
}

/**
 * The resolved view of one lemma for one person, read (and cached) per
 * (tenant, person, level, lemma). Two document reads the first time a lemma
 * is asked about; nothing thereafter until clearLemmaProgressCache() runs.
 */
export async function getLemmaProgress(db, { tenantId, personId, level = "wbw", lemmaId, confirmationRequired = false } = {}) {
  requireImplementedLevel(level);
  const docId = lemmaProgressDocId({ tenantId, personId, level, lemmaId });
  const store = cacheFor({ tenantId, personId, level });
  if (!store.has(lemmaId)) {
    const [learner, supervisor] = await Promise.all([
      fetchLemmaLane(db, "learner", docId),
      fetchLemmaLane(db, "supervisor", docId),
    ]);
    store.set(lemmaId, { learner, supervisor });
  }
  const { learner, supervisor } = store.get(lemmaId);
  return Object.freeze({ ...resolveLemmaProgress({ learner, supervisor, confirmationRequired }), lemmaId, docId });
}

// ---------------------------------------------------------------------------
// Writing. Both writers refuse before touching Firestore when the actor may
// not do it -- not the security boundary (the candidate Rules are), but what
// turns a would-be permission error into a sentence a person can read (I15).
// ---------------------------------------------------------------------------

async function writeLemmaLane(db, { lane, docId, entry, actorUid }) {
  const collectionName = LANE_COLLECTION[lane];
  const snap = await getDoc(doc(db, collectionName, docId));
  const fields = lemmaEntryFields(lane, entry);
  if (snap.exists()) {
    await updateDocument(db, collectionName, docId, fields);
  } else {
    const parsed = parseLemmaProgressDocId(docId);
    await createDocument(db, collectionName, docId, {
      contractVersion: "quran-lemma-progress:v1",
      lane,
      tenantId: parsed.tenantId,
      personId: parsed.personId,
      level: parsed.level,
      lemmaId: parsed.lemmaId,
      ...fields,
    }, actorUid);
  }
}

/**
 * A learner sets one lemma's state -- or a supervisor sets it FOR a managed
 * student, recorded as such in the entry's own byPersonId. Mirrors
 * setWordState() in quran-word-progress-data.js exactly, minus the
 * per-position bundling occurrence progress needs and this does not.
 */
export async function claimLemmaWordState(db, {
  tenantId, personId, level = "wbw", lemmaId, state,
  actorPersonId, actorUid, isSupervisor = false, confirmationRequired = false, nowIso,
} = {}) {
  const authority = lemmaProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayClaim) {
    throw new Error("You are not able to record this lemma's progress for this person.");
  }
  const docId = lemmaProgressDocId({ tenantId, personId, level, lemmaId });
  const store = cacheFor({ tenantId, personId, level });
  if (!store.has(lemmaId)) {
    const [learner, supervisor] = await Promise.all([
      fetchLemmaLane(db, "learner", docId),
      fetchLemmaLane(db, "supervisor", docId),
    ]);
    store.set(lemmaId, { learner, supervisor });
  }
  const current = store.get(lemmaId);
  const currentLearner = current.learner ?? emptyLemmaLearnerEntry();
  const currentSupervisor = current.supervisor ?? emptyLemmaSupervisorEntry();

  const next = claimLemmaState({
    currentLearner, currentSupervisor, state, actorPersonId,
    atIso: nowIso ?? new Date().toISOString(), confirmationRequired,
  });
  if (!next.changed) return { changed: false, writes: 0 };

  await writeLemmaLane(db, { lane: "learner", docId, entry: next.learner, actorUid });
  let writes = 1;
  // The supervisor lane is touched only when the review genuinely re-opened;
  // most claims write exactly one document.
  if (next.supervisor !== currentSupervisor) {
    await writeLemmaLane(db, { lane: "supervisor", docId, entry: next.supervisor, actorUid });
    writes = 2;
  }
  // Same reasoning as quran-word-progress-data.js: the harness's Firebase
  // stub never mutates its own data, and a real read-after-write without a
  // round trip would not either -- so the cache is patched from the value
  // that was actually written, which is also the better production
  // behaviour (no re-read, no stale screen).
  store.set(lemmaId, { learner: next.learner, supervisor: next.supervisor });
  return { changed: true, writes, docId };
}

/** A supervisor confirms or returns the claim on the table. Never self. */
export async function decideLemmaWordApproval(db, {
  tenantId, personId, level = "wbw", lemmaId, review, note = null,
  actorPersonId, actorUid, isSupervisor = false, confirmationRequired = true, nowIso,
} = {}) {
  const authority = lemmaProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayDecide) {
    throw new Error("You are not able to approve this lemma's progress for this person.");
  }
  const docId = lemmaProgressDocId({ tenantId, personId, level, lemmaId });
  const store = cacheFor({ tenantId, personId, level });
  if (!store.has(lemmaId)) {
    const [learner, supervisor] = await Promise.all([
      fetchLemmaLane(db, "learner", docId),
      fetchLemmaLane(db, "supervisor", docId),
    ]);
    store.set(lemmaId, { learner, supervisor });
  }
  const current = store.get(lemmaId);

  const next = decideLemmaApproval({
    currentLearner: current.learner ?? emptyLemmaLearnerEntry(),
    currentSupervisor: current.supervisor ?? emptyLemmaSupervisorEntry(),
    review, byPersonId: actorPersonId, atIso: nowIso ?? new Date().toISOString(), note,
  });
  await writeLemmaLane(db, { lane: "supervisor", docId, entry: next.supervisor, actorUid });
  store.set(lemmaId, { learner: current.learner ?? emptyLemmaLearnerEntry(), supervisor: next.supervisor });
  return { changed: true, writes: 1, docId };
}

// ---------------------------------------------------------------------------
// The Owner's rule, priced. How the data layer gets the second number
// lemmaKnownDelta() needs -- how many of a lemma's OWN occurrences already
// count as known on their own account, so moving the lemma does not
// double-count them.
// ---------------------------------------------------------------------------

/**
 * Bounded by the number of DISTINCT AYAHS the lemma occurs in -- never the
 * whole corpus, and never the lemma's raw occurrence count (several
 * occurrences of the same lemma commonly share one ayah, e.g. a repeated
 * connective word). This is still, honestly, unbounded in the small: read
 * against the real packaged lemmas-index.json, most lemmas need a handful of
 * ayah reads, but the WORST CASE, for the single most frequent lemma ("من",
 * 3,229 occurrences across 2,183 distinct ayahs, re-derived independently in
 * quran-lemma-progress-model.mjs rather than trusted from this comment), is
 * up to 2,183 * 2 = 4,366 document reads -- two lanes per ayah -- for that
 * ONE lemma, once, at the moment it is first decided known or unknown. That
 * cost never recurs for an ordinary single-occurrence claim, which touches
 * exactly the two documents claimLemmaWordState()/decideLemmaWordApproval()
 * above already write. No smaller bound is available while the running
 * whole-Qur'an total (quranWordTotals, issue #206) must stay exactly right
 * rather than merely fast: undercounting here would silently inflate
 * lemmaKnownDelta()'s result, which is worse than being slow. Wiring this
 * into a live confirm action, and whether a cheaper design is needed first,
 * is for the next round -- this round's job is only to prove the number is
 * computable and to state its true cost.
 */
export async function countIndividuallyKnownOccurrences(db, {
  tenantId, personId, level = "wbw", lemmaId, confirmationRequired = false, fetchImpl,
} = {}) {
  requireImplementedLevel(level);
  const index = await loadWordIdentityIndex("lemma", fetchImpl ? { fetchImpl } : undefined);
  const refs = index.values?.[lemmaId] ?? [];

  const byAyah = new Map();
  for (const ref of refs) {
    const { surah, ayah, position } = unpackWordIndexRef(ref);
    const key = `${surah}_${ayah}`;
    if (!byAyah.has(key)) byAyah.set(key, { surah, ayah, positions: [] });
    byAyah.get(key).positions.push(position);
  }
  const ayahGroups = [...byAyah.values()];

  const perAyahKnownCounts = await Promise.all(ayahGroups.map(async ({ surah, ayah, positions }) => {
    const laneId = wordProgressLaneId({ tenantId, personId, level, surah, ayah });
    const [learnerSnap, supervisorSnap] = await Promise.all([
      getDoc(doc(db, OCCURRENCE_LANE_COLLECTION.learner, laneId)),
      getDoc(doc(db, OCCURRENCE_LANE_COLLECTION.supervisor, laneId)),
    ]);
    const learnerEntries = learnerSnap.exists() ? (learnerSnap.data().entries ?? {}) : {};
    const supervisorEntries = supervisorSnap.exists() ? (supervisorSnap.data().entries ?? {}) : {};
    let known = 0;
    for (const position of positions) {
      const key = wordProgressEntryKey(position);
      const learnerEntry = decodeOccurrenceLearnerEntry(learnerEntries[key]);
      const supervisorEntry = decodeOccurrenceSupervisorEntry(supervisorEntries[key]);
      if (resolveOccurrenceProgress({ learner: learnerEntry, supervisor: supervisorEntry, confirmationRequired }).countsAsKnown) known += 1;
    }
    return known;
  }));

  return {
    occurrenceCount: refs.length,
    alreadyKnownIndividually: perAyahKnownCounts.reduce((sum, n) => sum + n, 0),
    ayahsRead: ayahGroups.length,
  };
}
