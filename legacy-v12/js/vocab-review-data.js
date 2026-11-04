// PCF MSA J48 round 2 -- the review schedule kept in the account (the Owner's tick 3A; Rules published 20 Oct 2026).
// quranVocabReview/{tenantId}__{personId}: ONE document per student, one read loads it all (load-speed contract), no
// query, no index. Read only when the Vocabulary sheet or Learn next opens, never at startup (I9).
// The Rules (firestore.rules, "PCF MSA J48 round 2") allow:
//   create -- contractVersion "quran-vocab-review:v1", tenantId, personId, words (a map) + the I17 envelope, and the
//             document id must be `${tenantId}__${personId}`;
//   update -- `words` and `updatedAt` only; never a delete (I4/D6).
// So an update here writes `words` and nothing else (updateDocument adds `updatedAt`).
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";

export const VOCAB_REVIEW_CONTRACT = "quran-vocab-review:v1";

export function vocabReviewDocId(tenantId, personId) {
  return `${tenantId}__${personId}`;
}

/** { exists, words }. A schedule not yet made reads as empty. */
export async function loadVocabReview(db, { tenantId, personId }) {
  const snap = await getDoc(doc(db, TENANT.QURAN_VOCAB_REVIEW, vocabReviewDocId(tenantId, personId)));
  const words = snap.exists() ? snap.data()?.words : null;
  return { exists: snap.exists(), words: words && typeof words === "object" ? { ...words } : {} };
}

/**
 * Merge `changes` ({ [lemma]: entry }) into the student's schedule and save it. The schedule is read again first, so
 * an entry another device wrote meanwhile is kept (only the words of this round are replaced). Returns the saved map.
 */
export async function saveVocabReview(db, { tenantId, personId, changes, uid }) {
  if (!changes || !Object.keys(changes).length) return null;
  const id = vocabReviewDocId(tenantId, personId);
  const current = await loadVocabReview(db, { tenantId, personId });
  const words = { ...current.words, ...changes };
  if (current.exists) {
    await updateDocument(db, TENANT.QURAN_VOCAB_REVIEW, id, { words });
  } else {
    await createDocument(db, TENANT.QURAN_VOCAB_REVIEW, id, { contractVersion: VOCAB_REVIEW_CONTRACT, tenantId, personId, words }, uid);
  }
  return words;
}
