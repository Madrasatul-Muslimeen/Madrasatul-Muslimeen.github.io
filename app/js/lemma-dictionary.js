// The Word card's Dictionary box data (lemma-dictionary-en.json, ~412 KB).
// Loaded on FIRST USE only -- when an Arabic in Depth tab first opens -- and
// then cached in memory (I9 / the load-speed contract: never at startup, never
// on the landing page). Read-only: no Firestore.
const DICTIONARY_URL = "/tools/quran-data-pull/output/lemma-dictionary-en.json";
let promise = null;

export function loadLemmaDictionary() {
  if (!promise) {
    promise = fetch(DICTIONARY_URL).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the dictionary (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => { promise = null; throw err; });
  }
  return promise;
}
