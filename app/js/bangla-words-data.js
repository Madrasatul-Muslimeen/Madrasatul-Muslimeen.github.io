// PCF MSA J143 (the Owner ticked B, 16 Nov 2026) -- the saving layer for the Bangla (own-language) word lists.
//
// Two documents, both candidate Rules (docs/proposals/bangla-words.candidate.rules; NOT published, so the page reaches this module only
// behind bangla-words-readiness.js, which is OFF):
//   banglaWords/{tenantId}__{personId}   one reader's OWN list. Read and written by exactly canRecordFor() (the person, their guardian, a
//                                        co-enrolled teacher, an owner/prime); the person must belong to the tenant.
//   banglaWords/{tenantId}__madrasah     the ADMIN's list, the same for everyone. Every member reads; owner, prime and teacher write.
// A document holds `words` (lemma ids, at most 5000) and `kinds` (lemma -> kinds, no more entries than `words`) plus tenantId, scope and the
// four envelope fields (I17, stamped by envelope.js). Reads are by document id only (no list, no index). Nothing here deletes (I4, D6): removing a
// word writes a shorter list. Nothing runs at start-up (I9): the page asks when a Word Card / Learn next / the Monitor's Vocabulary table first needs it.
//
// Every write goes through envelope.js inside safeWrite() (I15: a failed save reaches the reader and the function returns `{ ok: false, entry }`).
// `ctx = { tenantId, personId, uid }`; `scope` is "madrasah" or a personId. The client validates the words and kinds (Rules cannot see inside a
// list or map): the pure helpers in bangla-words.js already clean them, and a payload over the cap is refused here, before anything is written.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { safeWrite } from "./errors.js";

/** Every field this module can ever put on a banglaWords document, beyond the four envelope fields (the candidate Rules must allow all of them). */
export const BANGLA_LIST_WRITES = Object.freeze(["tenantId", "scope", "words", "kinds"]);
export const BANGLA_SCOPE_MADRASAH = "madrasah";
const MAX_WORDS = 5000;

export const banglaListId = (tenantId, scope) => `${tenantId}__${scope}`;
const validPart = (s) => typeof s === "string" && s.length > 0 && !s.includes("__") && !s.includes("/");

function requireCtx(ctx) {
  if (!ctx || !ctx.tenantId || !ctx.uid) throw new Error("bangla-words-data: ctx must carry tenantId and uid.");
}

/** One list: `{ exists: false }` or `{ exists: true, words, kinds }`. ONE read (a missing document may be read by any signed-in user: the Rules' probe). */
export async function loadBanglaList(db, ctx, scope) {
  requireCtx(ctx);
  if (!validPart(scope)) throw new Error("bangla-words-data: scope must be 'madrasah' or a person's id.");
  const snap = await getDoc(doc(db, TENANT.BANGLA_WORDS, banglaListId(ctx.tenantId, scope)));
  if (!snap.exists()) return { exists: false };
  const d = snap.data() ?? {};
  return { exists: true, words: Array.isArray(d.words) ? [...d.words] : [], kinds: d.kinds && typeof d.kinds === "object" ? { ...d.kinds } : {} };
}

/**
 * Saves one list ({ words, kinds }). Creates the document the first time (tenantId, scope, words, kinds + the envelope) and afterwards updates
 * words and kinds only; never deletes. Returns `{ ok: true }`, `{ ok: false, refused }` (nothing read or written) or `{ ok: false, entry }` (the failure
 * was already reported to the reader, I15).
 */
export async function saveBanglaList(db, ctx, scope, { words, kinds } = {}) {
  requireCtx(ctx);
  if (!validPart(scope)) return { ok: false, refused: "bad-scope" };
  if (!Array.isArray(words) || words.some((w) => typeof w !== "string" || !w)) return { ok: false, refused: "bad-words" };
  if (words.length > MAX_WORDS) return { ok: false, refused: "too-many-words" };
  const k = kinds && typeof kinds === "object" && !Array.isArray(kinds) ? kinds : {};
  if (Object.keys(k).length > words.length) return { ok: false, refused: "bad-kinds" };
  const id = banglaListId(ctx.tenantId, scope);
  return safeWrite(async () => {
    const snap = await getDoc(doc(db, TENANT.BANGLA_WORDS, id));
    if (snap.exists()) await updateDocument(db, TENANT.BANGLA_WORDS, id, { words, kinds: k });
    else await createDocument(db, TENANT.BANGLA_WORDS, id, { tenantId: ctx.tenantId, scope, words, kinds: k }, ctx.uid);
  }, { collection: TENANT.BANGLA_WORDS, docId: id, action: "save bangla list" }).then((r) => (r.ok === false ? r : { ok: true }));
}
