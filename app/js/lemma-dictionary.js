// The Word card's Dictionary box data (lemma-dictionary-en.json, ~412 KB).
// Loaded on FIRST USE only -- when an Arabic in Depth tab first opens -- and
// then cached in memory (I9 / the load-speed contract: never at startup, never
// on the landing page). Read-only: no Firestore.
const DICTIONARY_URL = "/tools/quran-data-pull/output/lemma-dictionary-en.json";
let promise = null;

// The packaged lemma and the data file can order the same diacritics
// differently (shadda/fatha in the lemma of Allah: U+0651 U+064E in the Qur'an
// data, U+064E U+0651 in the fixed key), so an exact key lookup MISSES the
// fixed entry and lands on an ordinary one. Keys are therefore matched in
// Unicode NFC (which puts the marks in one canonical order), and a FIXED
// entry always wins a collision.
const indexes = new WeakMap();
function indexFor(dict) {
  let index = indexes.get(dict);
  if (!index) {
    index = new Map();
    for (const [key, entry] of Object.entries(dict?.entries ?? {})) {
      const k = key.normalize("NFC");
      if (!index.has(k) || (entry.c === "fixed" && index.get(k).c !== "fixed")) index.set(k, entry);
    }
    indexes.set(dict, index);
  }
  return index;
}

/** The `{ m, c, u? }` entry for a lemma as `word.morphology.lemma` holds it, or null. */
export function lemmaDictionaryEntry(dict, lemma) {
  if (!dict || !lemma) return null;
  return indexFor(dict).get(String(lemma).normalize("NFC")) ?? null;
}

// Decision 62 (#539) -- the Bangla dictionary (AQS Quraniyo Obhidhan), same
// first-use rule: fetched only when a Bangla reader opens Depth, never in English.
// entries[lemma] = { m: [meaning, ...], p: [PDF page of each], t }.
const BN_DICTIONARY_URL = "/tools/quran-data-pull/output/lemma-dictionary-bn.json";
let bnPromise = null;

export function loadBanglaLemmaDictionary() {
  if (!bnPromise) {
    bnPromise = fetch(BN_DICTIONARY_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the Bangla dictionary (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { bnPromise = null; throw err; });
  }
  return bnPromise;
}

export function loadLemmaDictionary() {
  if (!promise) {
    promise = fetch(DICTIONARY_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the dictionary (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}
