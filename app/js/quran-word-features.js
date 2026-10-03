// Word card rebuild, round 1 (decision 59) -- on-demand Corpus features.
//
// Nothing is fetched until a caller asks (I9). One small file per surah
// (tools/quran-data-pull/output/word-features/surah_NNN.json, built by
// build-word-features.mjs) carries each word's part ids, Form, tense,
// person, mood, voice and participle/verbal-noun mark; one file
// (output/lemma-forms.json) carries every Dictionary word's derived-form
// group for Basic's cards. Both are cached after the first load, the same
// shape quran-word-segments.js uses.

const cache = new Map();
const BASE = "../tools/quran-data-pull/output/";

function load(key, fetchImpl, check) {
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetchImpl(key);
    if (!response.ok) throw new Error(`Could not load ${key} (${response.status}).`);
    const data = await response.json();
    check(data);
    return data;
  })().catch((error) => { cache.delete(key); throw error; }));
  return cache.get(key);
}

export async function loadWordFeaturesForSurah(surahNumber, { fetchImpl = fetch, baseUrl = BASE } = {}) {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new TypeError(`Invalid surah number: ${surahNumber}.`);
  }
  const key = `${baseUrl}word-features/surah_${String(surahNumber).padStart(3, "0")}.json`;
  return load(key, fetchImpl, (data) => {
    if (data.surahNumber !== surahNumber || !data.words || typeof data.words !== "object" || Array.isArray(data.words)) {
      throw new Error(`Invalid Quran word features format for surah ${surahNumber}.`);
    }
  });
}

/** One word's features, or null when the word did not align with the Corpus
 *  (an expected outcome, never guessed). */
export async function wordFeaturesFor(surahNumber, ayahNumber, position, options) {
  const data = await loadWordFeaturesForSurah(surahNumber, options);
  return data.words?.[`${ayahNumber}:${position}`] ?? null;
}

export async function loadLemmaForms({ fetchImpl = fetch, baseUrl = BASE } = {}) {
  return load(`${baseUrl}lemma-forms.json`, fetchImpl, (data) => {
    if (data.contract !== "lemma-forms:v1" || !data.values || typeof data.values !== "object") {
      throw new Error("Invalid lemma forms format.");
    }
  });
}

/** [group, form, src] for one Dictionary word, or null. */
export async function lemmaFormFor(lemma, options) {
  const data = await loadLemmaForms(options);
  return data.values[lemma] ?? null;
}

/** Round 5 -- every Dictionary verb's root, Form, Form I vowels and counted
 *  forms, for the Depth tab's Verb Conjugation section. Fetched only when a
 *  verb's Depth tab is opened (I9), then cached. */
export async function loadVerbForms({ fetchImpl = fetch, baseUrl = BASE } = {}) {
  return load(`${baseUrl}verb-forms.json`, fetchImpl, (data) => {
    if (data.contract !== "verb-forms:v1" || !data.values || typeof data.values !== "object") {
      throw new Error("Invalid verb forms format.");
    }
  });
}

/** { r, f, pv?, sv?, n } for one Dictionary verb, or null. */
export async function verbFormFor(lemma, options) {
  const data = await loadVerbForms(options);
  return data.values[lemma] ?? null;
}
