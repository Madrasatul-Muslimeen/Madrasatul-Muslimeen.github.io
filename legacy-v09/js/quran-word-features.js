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

/** Round 6 -- every exact written form of every word, with its places, for the
 *  card's Search. Fetched only when the reader presses Search (I9) -- never at
 *  startup, never when the card or its 🔍 row merely opens -- then cached. */
export async function loadWordFormsIndex({ fetchImpl = fetch, baseUrl = BASE } = {}) {
  return load(`${baseUrl}word-forms-index.json`, fetchImpl, (data) => {
    if (data.contract !== "word-forms-index:v1" || !Array.isArray(data.forms)) {
      throw new Error("Invalid word forms index format.");
    }
  });
}

/** Decision 61 -- the three "Needs a source" lines. Each file is fetched only
 *  when its own Depth section is opened (I9), then cached. */
export async function loadWordSyntaxManifest({ fetchImpl = fetch, baseUrl = BASE } = {}) {
  return load(`${baseUrl}word-syntax/manifest.json`, fetchImpl, (data) => {
    if (data.contract !== "word-syntax:v1" || !data.relations || !data.phrases) throw new Error("Invalid word syntax manifest.");
  });
}

/** One surah's treebank graphs. `data` is null when the Corpus has no file
 *  for that surah (surahs 10-58 and most of 9): that is not an error, and no
 *  request is made for it. */
export async function loadWordSyntaxForSurah(surahNumber, { fetchImpl = fetch, baseUrl = BASE } = {}) {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) throw new TypeError(`Invalid surah number: ${surahNumber}.`);
  const manifest = await loadWordSyntaxManifest({ fetchImpl, baseUrl });
  const covered = Array.isArray(manifest.perSurah) && manifest.perSurah.some((s) => s.surah === surahNumber);
  if (!covered) return { manifest, data: null };
  const key = `${baseUrl}word-syntax/surah_${String(surahNumber).padStart(3, "0")}.json`;
  const data = await load(key, fetchImpl, (d) => {
    if (d.surahNumber !== surahNumber || !Array.isArray(d.graphs) || !d.words) throw new Error(`Invalid word syntax format for surah ${surahNumber}.`);
  });
  return { manifest, data };
}

export async function loadFuruqIndex({ fetchImpl = fetch, baseUrl = BASE } = {}) {
  return load(`${baseUrl}furuq-index.json`, fetchImpl, (data) => {
    if (data.contract !== "furuq-index:v1" || !Array.isArray(data.entries) || !data.lemmas) throw new Error("Invalid al-Furuq index format.");
  });
}

/** al-Mufradat: a root's file is its first letter's 1-based position in the
 *  manifest's `letters`. Resolves { manifest, book }; book is null when the
 *  letter has no file. */
export async function loadMufradatForRoot(root, { fetchImpl = fetch, baseUrl = BASE } = {}) {
  const manifest = await load(`${baseUrl}mufradat/manifest.json`, fetchImpl, (d) => {
    if (d.contract !== "mufradat:v1" || typeof d.letters !== "string") throw new Error("Invalid al-Mufradat manifest.");
  });
  const first = [...String(root ?? "").replace(/\s/g, "")][0];
  const n = first ? manifest.letters.indexOf(first) + 1 : 0;
  if (!n) return { manifest, book: null };
  const book = await load(`${baseUrl}mufradat/${n}.json`, fetchImpl, (d) => {
    if (d.book !== n || !d.entries || typeof d.entries !== "object") throw new Error(`Invalid al-Mufradat file ${n}.`);
  });
  return { manifest, book };
}

/** { r, f, pv?, sv?, n } for one Dictionary verb, or null. */
export async function verbFormFor(lemma, options) {
  const data = await loadVerbForms(options);
  return data.values[lemma] ?? null;
}
