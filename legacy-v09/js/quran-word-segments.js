// Issue #263 -- on-demand Word-Card segment-colouring data.
//
// Nothing is fetched until a caller explicitly asks for a surah's segments
// (I9): `tools/quran-data-pull/build-word-segments.mjs` packages one small
// file per surah, and this module loads + caches it the first time a Word
// Card for that surah is opened -- the same on-demand-per-surah shape
// `quran-word-index.js` already uses for the root/lemma occurrence indexes.

const cache = new Map();

export async function loadWordSegmentsForSurah(surahNumber, { fetchImpl = fetch, baseUrl = "../tools/quran-data-pull/output/word-segments/" } = {}) {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new TypeError(`Invalid surah number: ${surahNumber}.`);
  }
  const file = `surah_${String(surahNumber).padStart(3, "0")}.json`;
  const key = `${baseUrl}${file}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetchImpl(key);
    if (!response.ok) throw new Error(`Could not load Quran word segments for surah ${surahNumber} (${response.status}).`);
    const data = await response.json();
    if (data.surahNumber !== surahNumber || !data.words || typeof data.words !== "object" || Array.isArray(data.words)) {
      throw new Error(`Invalid Quran word segments format for surah ${surahNumber}.`);
    }
    return data;
  })().catch((error) => { cache.delete(key); throw error; }));
  return cache.get(key);
}

/** The segments for one word, or `null` when this word could not be aligned
 *  (a real, expected outcome -- see the build script's own "never guess"
 *  rule -- not an error). */
export async function wordSegmentsFor(surahNumber, ayahNumber, position, options) {
  const data = await loadWordSegmentsForSurah(surahNumber, options);
  return data.words?.[`${ayahNumber}:${position}`] ?? null;
}
