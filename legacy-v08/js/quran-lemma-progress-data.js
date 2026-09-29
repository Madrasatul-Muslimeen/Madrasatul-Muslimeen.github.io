// MAP -- persistence for lemma-level word progress (issue #301, re-issue of
// #296; wired in and bounded-cost in issue #303).
//
// This module owns reads and writes; quran-lemma-progress.js owns what a
// lemma's state means. Every transition below is computed THERE and only
// stored here, mirroring the split app/js/quran-word-progress-data.js
// already makes for occurrence progress.
//
// GATED, and the gate (app/js/study-lemma-progress-readiness.js) is
// consulted FIRST in every exported function that touches Firestore -- never
// "attempt and swallow the error", the same discipline quran-word-total-
// data.js already applies to quranWordTotals. While the gate is closed, no
// lemma collection (quranLemmaProgress, quranLemmaApprovals,
// quranLemmaOccurrenceCounters) is ever read or written.
//
// I4/D6: nothing here deletes. Un-claiming a lemma writes not_started, which
// is a state, not an absence.
//
// ---------------------------------------------------------------------------
// THE COST PROBLEM, SOLVED (issue #303 s4).
//
// countIndividuallyKnownOccurrences() below is honest, not cheap: for a
// lemma spanning D distinct ayahs it reads 2*D documents (one per lane, per
// ayah) -- up to 4,366 for the single most frequent lemma. Calling that on
// every claim/confirm would make "Mark this word known everywhere" the
// single most expensive tap in the app. It is NOT called on every
// claim/confirm.
//
// Instead, a small, bounded counter (quranLemmaOccurrenceCounters, one
// document per (tenant, person, level, lemma)) tracks, PER JUZ, how many of
// this lemma's occurrences already count as known on their own account --
// bounded at 30 entries (there are only 30 juz) regardless of how many
// thousands of occurrences the lemma has. getLemmaOccurrenceCounts() below
// reads that document (1 read); if it does not exist yet, it seeds it with
// the one honest full walk (documented cost above), ONCE, and persists the
// result so no future claim/confirm on this (person, lemma) ever re-walks
// it. bumpLemmaOccurrenceCounter() then keeps it current cheaply (1 read, 0
// or 1 write) from ORDINARY occurrence-level taps, and is a silent no-op
// when the counter has not been seeded yet -- the next lemma-level action
// seeds it correctly from the truth at that moment, so nothing is ever
// double-counted or lost, only deferred.
//
// READ COST PER ACTION, STATED PLAINLY (see the PR description for the
// worked totals):
//   - lemma claim/confirm, counter already seeded: 2 (lemma lane cache miss,
//     first time this session) + 1 (counter doc) + 1 (quranWordTotals doc)
//     = 4 document reads. Within the ≤5 target.
//   - lemma claim/confirm, counter NOT yet seeded (first time ever for this
//     person+lemma): additionally one seeding pass, paid once. Architect
//     review: for a lemma in at most SEED_PER_AYAH_MAX (50) ayahs that is 2
//     reads per ayah (<= 100); for a commoner lemma it is ONE equality query
//     per lane over the person's own lane documents -- as many reads as
//     āyāt the learner has recorded progress on, whatever the lemma's
//     frequency (it was up to 4,366 for "من").
//   - an ordinary single-occurrence tap, gate open, countsAsKnown transitions:
//     +1 read (the counter doc, to decide whether it exists) and 0 or 1
//     write -- never the full walk.
// ---------------------------------------------------------------------------

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { isLemmaProgressPersistenceReady } from "./study-lemma-progress-readiness.js";
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
  lemmaCounterDocId,
  emptyLemmaCounterDocument,
  decodeLemmaCounterDocument,
  lemmaCounterTotalKnown,
  groupOccurrenceRefsByJuz,
} from "./quran-lemma-progress.js";
import { juzForSurahAyah } from "./quran-word-total.js";

const LANE_COLLECTION = Object.freeze({
  learner: TENANT.QURAN_LEMMA_PROGRESS,
  supervisor: TENANT.QURAN_LEMMA_APPROVALS,
});

const OCCURRENCE_LANE_COLLECTION = Object.freeze({
  learner: TENANT.QURAN_WORD_PROGRESS,
  supervisor: TENANT.QURAN_WORD_APPROVALS,
});

const COUNTER_COLLECTION = TENANT.QURAN_LEMMA_OCCURRENCE_COUNTERS;

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
 * Load both lanes for one lemma. Returns nothing -- the caller then reads
 * synchronously through lemmaProgressFor(), the same split
 * primeAyahProgress()/wordProgressFor() already makes for occurrence
 * progress. A no-op, silently, while the gate is closed (I9's own
 * discipline: nothing here reads Firestore until the gate is open).
 */
export async function primeLemmaProgress(db, { tenantId, personId, level = "wbw", lemmaId } = {}) {
  if (!isLemmaProgressPersistenceReady()) return { fetched: 0, cached: false };
  requireImplementedLevel(level);
  const docId = lemmaProgressDocId({ tenantId, personId, level, lemmaId });
  const store = cacheFor({ tenantId, personId, level });
  if (store.has(lemmaId)) return { fetched: 0, cached: true };
  const [learner, supervisor] = await Promise.all([
    fetchLemmaLane(db, "learner", docId),
    fetchLemmaLane(db, "supervisor", docId),
  ]);
  store.set(lemmaId, { learner, supervisor });
  return { fetched: 2, cached: false };
}

/**
 * The resolved view of one lemma for one person, read SYNCHRONOUSLY out of
 * the cache primeLemmaProgress() fills -- a renderer never has to be async.
 * `loaded: false` while the gate is closed or the lemma has not been primed
 * yet, so a caller can tell "not known" from "not read" (the same distinction
 * wordProgressFor() draws for occurrence progress).
 */
export function lemmaProgressFor({ tenantId, personId, level = "wbw", lemmaId, confirmationRequired = false } = {}) {
  const store = cacheFor({ tenantId, personId, level });
  const loaded = store.has(lemmaId);
  const { learner, supervisor } = loaded ? store.get(lemmaId) : {};
  return Object.freeze({ ...resolveLemmaProgress({ learner, supervisor, confirmationRequired }), loaded, lemmaId });
}

/**
 * Convenience wrapper: prime then read. Kept for callers (and the pure-model
 * test's own neighbours) that do not need the sync/async split -- exactly
 * the shape claimLemmaWordState()/decideLemmaWordApproval() below already
 * use internally.
 */
export async function getLemmaProgress(db, { tenantId, personId, level = "wbw", lemmaId, confirmationRequired = false } = {}) {
  if (!isLemmaProgressPersistenceReady()) return null;
  await primeLemmaProgress(db, { tenantId, personId, level, lemmaId });
  const docId = lemmaProgressDocId({ tenantId, personId, level, lemmaId });
  return Object.freeze({ ...lemmaProgressFor({ tenantId, personId, level, lemmaId, confirmationRequired }), docId });
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
  if (!isLemmaProgressPersistenceReady()) {
    throw new Error("Marking a word known everywhere is not enabled yet.");
  }
  const authority = lemmaProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayClaim) {
    throw new Error("You are not able to record this Dictionary Word's progress for this person.");
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
  if (!isLemmaProgressPersistenceReady()) {
    throw new Error("Approving a word known everywhere is not enabled yet.");
  }
  const authority = lemmaProgressAuthority({ actorPersonId, subjectPersonId: personId, isSupervisor, confirmationRequired });
  if (!authority.mayDecide) {
    throw new Error("You are not able to approve this Dictionary Word's progress for this person.");
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
  tenantId, personId, level = "wbw", lemmaId, confirmationRequired = false, fetchImpl, juzIndex,
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

  // Issue #303 -- while this one honest full walk is already reading every
  // ayah's own lanes, it also learns each ayah's juz (a Map lookup Explore's
  // own juz index already supports, zero extra reads) -- so seeding the
  // bounded counter costs nothing beyond the walk this function already had
  // to make, rather than a second pass over the same data later.
  // Architect review (#303): the per-ayah walk costs 2 reads per distinct
  // ayah -- 4,366 for "من", and the most common words are exactly the ones a
  // learner marks first. Above SEED_PER_AYAH_MAX ayahs, read the PERSON'S OWN
  // lane documents instead (one equality query per lane): the cost is then
  // how much this learner has studied, not how common the word is.
  const laneEntries = ayahGroups.length > SEED_PER_AYAH_MAX
    ? await personLaneEntries(db, { tenantId, personId, level })
    : null;
  const perAyah = await Promise.all(ayahGroups.map(async ({ surah, ayah, positions }) => {
    const laneId = wordProgressLaneId({ tenantId, personId, level, surah, ayah });
    let learnerEntries, supervisorEntries;
    if (laneEntries) {
      learnerEntries = laneEntries.learner.get(laneId) ?? {};
      supervisorEntries = laneEntries.supervisor.get(laneId) ?? {};
    } else {
      const [learnerSnap, supervisorSnap] = await Promise.all([
        getDoc(doc(db, OCCURRENCE_LANE_COLLECTION.learner, laneId)),
        getDoc(doc(db, OCCURRENCE_LANE_COLLECTION.supervisor, laneId)),
      ]);
      learnerEntries = learnerSnap.exists() ? (learnerSnap.data().entries ?? {}) : {};
      supervisorEntries = supervisorSnap.exists() ? (supervisorSnap.data().entries ?? {}) : {};
    }
    let known = 0;
    for (const position of positions) {
      const key = wordProgressEntryKey(position);
      const learnerEntry = decodeOccurrenceLearnerEntry(learnerEntries[key]);
      const supervisorEntry = decodeOccurrenceSupervisorEntry(supervisorEntries[key]);
      if (resolveOccurrenceProgress({ learner: learnerEntry, supervisor: supervisorEntry, confirmationRequired }).countsAsKnown) known += 1;
    }
    const juz = juzIndex ? juzForSurahAyah(juzIndex, surah, ayah) : null;
    return { known, juz };
  }));

  const alreadyKnownByJuz = new Map();
  if (juzIndex) {
    for (const { known, juz } of perAyah) {
      if (juz == null || !known) continue;
      alreadyKnownByJuz.set(juz, (alreadyKnownByJuz.get(juz) ?? 0) + known);
    }
  }

  return {
    occurrenceCount: refs.length,
    alreadyKnownIndividually: perAyah.reduce((sum, { known }) => sum + known, 0),
    alreadyKnownByJuz,
    ayahsRead: ayahGroups.length,
    documentsRead: laneEntries ? laneEntries.documentsRead : ayahGroups.length * 2,
  };
}

/** Above this many distinct ayahs, seeding reads the person's own lane
    documents rather than two documents per ayah (100 reads at most below it). */
export const SEED_PER_AYAH_MAX = 50;

/** Every occurrence-progress lane document this person has at this level,
    both lanes, keyed by lane id -> its `entries`. Equality-only queries on
    the self-describing fields every lane document carries (tenantId,
    personId, level -- written on create, never changed), which the deployed
    `allow read: if canRecordFor(resource.data.tenantId, resource.data.personId)`
    authorises as a list; no composite index is needed for equality filters. */
async function personLaneEntries(db, { tenantId, personId, level }) {
  const read = async (lane) => {
    const snap = await getDocs(query(
      collection(db, OCCURRENCE_LANE_COLLECTION[lane]),
      where("tenantId", "==", tenantId),
      where("personId", "==", personId),
      where("level", "==", level),
    ));
    return { map: new Map(snap.docs.map((d) => [d.id, d.data().entries ?? {}])), count: snap.docs.length };
  };
  const [learner, supervisor] = await Promise.all([read("learner"), read("supervisor")]);
  return { learner: learner.map, supervisor: supervisor.map, documentsRead: learner.count + supervisor.count };
}

// ---------------------------------------------------------------------------
// The bounded counter itself (issue #303). See this file's own header for
// the design and the read-cost accounting.
// ---------------------------------------------------------------------------

async function fetchLemmaCounterDoc(db, docId) {
  const snap = await getDoc(doc(db, COUNTER_COLLECTION, docId));
  return snap.exists() ? decodeLemmaCounterDocument(snap.data()) : null;
}

/**
 * Read (or, the first time ever for this person+lemma, SEED) this lemma's
 * per-juz individually-known counter. `refs` are this lemma's own occurrence
 * refs (already unpacked {surah,ayah,position} -- the Word Card already has
 * these from its own lemma-occurrence hydrate, so this never re-fetches the
 * lemma index itself); `juzIndex` is the app's own already-loaded juz index.
 *
 * Returns `null` while the gate is closed -- the caller (the Word Card's "if
 * you learn this word" line) is expected to fall back to counting only the
 * one occurrence on screen, per issue #303's own explicit instruction.
 */
export async function getLemmaOccurrenceCounts(db, {
  tenantId, personId, level = "wbw", lemmaId, refs, juzIndex, confirmationRequired = false, actorUid, fetchImpl,
  persist = true,
} = {}) {
  if (!isLemmaProgressPersistenceReady()) return null;
  requireImplementedLevel(level);
  const docId = lemmaCounterDocId({ tenantId, personId, level, lemmaId });
  const existing = await fetchLemmaCounterDoc(db, docId);
  const occurrenceCountByJuz = groupOccurrenceRefsByJuz(refs ?? [], juzIndex, juzForSurahAyah);
  if (existing) {
    return { occurrenceCountByJuz, alreadyKnownByJuz: new Map(Object.entries(existing.individuallyKnownByJuz).map(([j, n]) => [Number(j), n])), seededJustNow: false };
  }
  // Not seeded yet -- the one honest full walk, disclosed in this file's own
  // header, paid ONCE for this (person, lemma) and never again.
  const walked = await countIndividuallyKnownOccurrences(db, { tenantId, personId, level, lemmaId, confirmationRequired, fetchImpl, juzIndex });
  // Architect review, 26 Sep 2026: merely VIEWING a Word Card must never
  // write. The counter is a cache, and a viewer who may read this person but
  // not record for them would see a permission error for opening a card.
  // The view path passes persist:false and gets the walked answer unsaved;
  // the first lemma-level claim/confirm (a recorder, by definition) seeds it.
  if (!persist) return { occurrenceCountByJuz, alreadyKnownByJuz: walked.alreadyKnownByJuz, seededJustNow: false };
  const seed = emptyLemmaCounterDocument({ tenantId, personId, level, lemmaId });
  for (const [juz, count] of walked.alreadyKnownByJuz) seed.individuallyKnownByJuz[String(juz)] = count;
  await createDocument(db, COUNTER_COLLECTION, docId, seed, actorUid);
  return { occurrenceCountByJuz, alreadyKnownByJuz: walked.alreadyKnownByJuz, seededJustNow: true };
}

/**
 * Cheap maintenance from an ORDINARY occurrence-level tap: move one lemma's
 * one-juz bucket by ±1. A silent no-op, by design, when the counter has not
 * been seeded yet for this (person, lemma) -- the next lemma-level
 * claim/confirm seeds it correctly from the truth at that moment, so this
 * never re-walks the corpus just because one word was tapped. Also a no-op
 * while the gate is closed (I9) or when delta is 0.
 */
export async function bumpLemmaOccurrenceCounter(db, { tenantId, personId, level = "wbw", lemmaId, juz, delta } = {}) {
  if (!isLemmaProgressPersistenceReady()) return { attempted: false, changed: false };
  if (!delta || juz == null) return { attempted: false, changed: false };
  requireImplementedLevel(level);
  const docId = lemmaCounterDocId({ tenantId, personId, level, lemmaId });
  const existing = await fetchLemmaCounterDoc(db, docId);
  if (!existing) return { attempted: true, changed: false, reason: "not-seeded" };
  const current = Number(existing.individuallyKnownByJuz[String(juz)] ?? 0);
  const next = Math.max(0, current + delta);
  await updateDocument(db, COUNTER_COLLECTION, docId, { [`individuallyKnownByJuz.${juz}`]: next });
  return { attempted: true, changed: true };
}
