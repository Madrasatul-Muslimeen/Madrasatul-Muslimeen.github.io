// Issue #206 -- persistence for the whole-Qur'an/Juz running word counter.
//
// This module owns reads and writes; quran-word-total.js owns the document
// shape and the arithmetic. Same pure/impure split as quran-word-progress.js
// / quran-word-progress-data.js.
//
// GATED, and the gate is consulted FIRST in every exported function here --
// never "attempt and swallow the error". While app/js/study-wbw-total-
// readiness.js says the collection is not ready, neither function below
// calls Firestore at all. That is what keeps an ordinary word tap from ever
// throwing over an undeployed collection (the exact defect class v08.31
// fixed for Activity evidence).
//
// LOAD-SPEED CONTRACT (Architecture Part 8): nothing here runs at startup.
// getWordTotals() is called only when Explore's Juz/whole-Qur'an level is
// actually opened; recordWordTotalDelta() is called only from the same
// word-tap action that already writes the real per-occurrence state.
//
// ATOMICITY, STATED PLAINLY RATHER THAN OVERCLAIMED. `known` and each
// `byJuz.<n>.known` are updated with Firestore's `increment()` transform,
// which IS safe against concurrent writes to this counter document (lost
// updates cannot happen: increment() is applied server-side as a delta, not
// as a read-modify-write from the client). What this module does NOT do is
// join that increment into the SAME Firestore transaction as the real
// per-occurrence write in quran-word-progress-data.js -- that write path is
// already accepted, deployed-shaped and mutation-tested (MAP Phase 3), and
// rewriting its internals to share a transaction boundary with a brand-new,
// still-undeployed collection was judged a disproportionate risk for this
// round. The call site (quranrevival.html) invokes this immediately after
// the real write succeeds, the same "separate, gated, idempotent-by-design
// follow-on write" shape this codebase already accepted for MAP Phase 4's
// wbw.engaged Activity evidence. The one real gap this leaves, disclosed
// rather than hidden: if the process is interrupted between the real write
// committing and this call running, the counter can drift from the raw
// per-occurrence data until the next independent recount. A future round
// wanting a single cross-collection transaction has the tool already
// available (app/js/envelope.js's runEnvelopeTransaction) -- not used here.
//
// I4/D6: nothing here deletes. There is no "unlearn" operation; a word
// leaving "known" status moves the counter down by exactly the same
// mechanism that moved it up, never by removing a document.

import {
  doc,
  getDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { isWbwTotalPersistenceReady } from "./study-wbw-total-readiness.js";
import { emptyWordTotalsDocument, wordTotalDocId } from "./quran-word-total.js";

// Per (tenant, person), like quran-word-progress-data.js's own cache -- so
// switching student in a roster dropdown (D10) cannot show the previous
// child's counter.
const cache = new Map();

export function clearWordTotalCache() {
  cache.clear();
}

/**
 * The reader's own whole-Qur'an + per-Juz counter document, or `null` while
 * the gate is closed or nothing has ever been recorded for this person. A
 * caller must treat `null` as "nothing to show yet", never as zero -- the
 * distinction the rest of this codebase already draws between "unknown" and
 * "zero" (quran-word-coverage.js's own stated rule).
 */
export async function getWordTotals(db, { tenantId, personId } = {}) {
  if (!isWbwTotalPersistenceReady()) return null;
  const key = `${tenantId}|${personId}`;
  if (cache.has(key)) return cache.get(key);
  const snap = await getDoc(doc(db, TENANT.QURAN_WORD_TOTALS, wordTotalDocId({ tenantId, personId })));
  const data = snap.exists() ? snap.data() : null;
  cache.set(key, data);
  return data;
}

/**
 * Move the counter by `delta` (-1, 0 or +1 -- quran-word-total.js's own
 * knownDelta()) for one juz. A delta of 0 is a deliberate no-op: the caller
 * is expected to compute delta from a real countsAsKnown transition and
 * never call this "just in case" on every write.
 *
 * `juzWordTotals` is only consulted the FIRST time this person's counter
 * document is created -- an existing document already carries its own
 * seeded `byJuz` map and is updated in place.
 */
export async function recordWordTotalDelta(db, { tenantId, personId, juz, delta, actorUid, juzWordTotals } = {}) {
  if (!isWbwTotalPersistenceReady()) return { attempted: false, changed: false };
  if (!delta) return { attempted: false, changed: false };
  if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new TypeError("juz must be an integer from 1 to 30.");

  const docId = wordTotalDocId({ tenantId, personId });
  const ref = doc(db, TENANT.QURAN_WORD_TOTALS, docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const seed = emptyWordTotalsDocument({ tenantId, personId, juzWordTotals });
    const juzKey = String(juz);
    seed.known = Math.max(0, delta);
    seed.byJuz[juzKey] = { ...seed.byJuz[juzKey], known: Math.max(0, delta) };
    await createDocument(db, TENANT.QURAN_WORD_TOTALS, docId, seed, actorUid);
  } else {
    await updateDocument(db, TENANT.QURAN_WORD_TOTALS, docId, {
      known: increment(delta),
      [`byJuz.${juz}.known`]: increment(delta),
    });
  }
  // The harness's Firebase stub never mutates its own data, and neither does
  // a real read-after-write without a round trip -- so the cache is simply
  // dropped rather than patched, the same "never show a stale figure"
  // discipline quran-word-progress-data.js applies by patching instead
  // (patching isn't safe here: increment() applies server-side, so this
  // process does not know the resulting total without a fresh read).
  cache.delete(`${tenantId}|${personId}`);
  return { attempted: true, changed: true };
}

/**
 * Issue #303 -- move the counter for SEVERAL juz at once, in ONE document
 * update, for the "Mark this word known everywhere" action: a lemma's
 * occurrences can span up to 30 juz, and recomputing/moving each one with
 * its own separate write would be up to 30 writes for a single tap. Instead
 * every affected juz's `byJuz.<n>.known` field, plus the whole-Qur'an
 * `known` field, are named in ONE updateDocument() call -- Firestore bills
 * and applies that as one write no matter how many fields it touches.
 *
 * `deltaByJuz` is a Map(juz -> delta), typically
 * quran-lemma-progress.js's own lemmaKnownDeltaByJuz() output. A juz whose
 * delta is 0 must already be absent from the Map (the caller's job); this
 * function does not filter zeros itself, since increment(0) is a wasted
 * field write, not a correctness bug, but callers should not rely on it.
 */
export async function recordWordTotalDeltaAcrossJuz(db, { tenantId, personId, deltaByJuz, actorUid, juzWordTotals } = {}) {
  if (!isWbwTotalPersistenceReady()) return { attempted: false, changed: false };
  if (!(deltaByJuz instanceof Map) || deltaByJuz.size === 0) return { attempted: false, changed: false };
  const totalDelta = [...deltaByJuz.values()].reduce((sum, d) => sum + d, 0);
  if (!totalDelta) return { attempted: false, changed: false };

  const docId = wordTotalDocId({ tenantId, personId });
  const ref = doc(db, TENANT.QURAN_WORD_TOTALS, docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const seed = emptyWordTotalsDocument({ tenantId, personId, juzWordTotals });
    seed.known = Math.max(0, totalDelta);
    for (const [juz, delta] of deltaByJuz) {
      const juzKey = String(juz);
      const seeded = Math.max(0, delta);
      seed.byJuz[juzKey] = { ...seed.byJuz[juzKey], known: seeded };
    }
    await createDocument(db, TENANT.QURAN_WORD_TOTALS, docId, seed, actorUid);
    cache.set(`${tenantId}|${personId}`, seed);
  } else {
    const update = { known: increment(totalDelta) };
    for (const [juz, delta] of deltaByJuz) update[`byJuz.${juz}.known`] = increment(delta);
    await updateDocument(db, TENANT.QURAN_WORD_TOTALS, docId, update);
    // Architect review (#303): patch the copy just read by the same deltas
    // the write applied, rather than dropping it and re-reading -- one read
    // fewer, and the Word Card shows the new total at once (the standing
    // lesson: patch the in-memory copy after a successful write).
    const base = snap.data();
    const byJuz = { ...(base.byJuz ?? {}) };
    for (const [juz, delta] of deltaByJuz) {
      const key = String(juz);
      byJuz[key] = { ...(byJuz[key] ?? {}), known: Number(byJuz[key]?.known ?? 0) + delta };
    }
    cache.set(`${tenantId}|${personId}`, { ...base, known: Number(base.known ?? 0) + totalDelta, byJuz });
  }
  return { attempted: true, changed: true };
}
