// ADR-007 — on-demand Quran word root/lemma occurrence indexes.
// Nothing is fetched until a caller explicitly asks for one identity layer.
import { quranWordOccurrenceId } from "./quran-word-identity.js";

const INDEX_FILES = Object.freeze({ root: "roots-index.json", lemma: "lemmas-index.json" });
const LEMMA_POS_FILE = "lemma-pos-index.json";
const cache = new Map();

export function unpackWordIndexRef(ref) {
  if (!Number.isSafeInteger(ref)) throw new TypeError("Invalid packed Quran word reference.");
  const result = { surah: Math.floor(ref / 1_000_000), ayah: Math.floor((ref % 1_000_000) / 1_000), position: ref % 1_000 };
  quranWordOccurrenceId(result.surah, result.ayah, result.position);
  return result;
}

export async function loadWordIdentityIndex(layer, { fetchImpl = fetch, baseUrl = "../tools/quran-data-pull/output/" } = {}) {
  const file = INDEX_FILES[layer];
  if (!file) throw new TypeError(`Unsupported Quran word index layer: ${layer}.`);
  const key = `${baseUrl}${file}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const response = await fetchImpl(key);
    if (!response.ok) throw new Error(`Could not load Quran ${layer} index (${response.status}).`);
    const data = await response.json();
    if (data.identityContract !== "quran-word-occurrence:v1") throw new Error(`Unsupported Quran ${layer} index identity contract.`);
    if (data.encoding !== "surah*1000000+ayah*1000+position" || !data.values || typeof data.values !== "object" || Array.isArray(data.values)) {
      throw new Error(`Invalid Quran ${layer} index format.`);
    }
    return data;
  })().catch((error) => { cache.delete(key); throw error; }));
  return cache.get(key);
}

export async function occurrenceRefsFor(layer, value, options) {
  if (!value) return [];
  const index = await loadWordIdentityIndex(layer, options);
  return (index.values?.[value] ?? []).map(unpackWordIndexRef);
}

/**
 * v08.21 -- occurrence -> lemma, built ONCE from the lemma index already
 * loaded on demand. Nothing new is fetched: the Basic tab has fetched both
 * indexes since Phase 2. Keyed by baseUrl so a test harness pointing
 * somewhere else gets its own map.
 */
const lemmaByOccurrence = new Map();
async function lemmaOccurrenceMap(options) {
  const key = options?.baseUrl ?? "default";
  if (!lemmaByOccurrence.has(key)) lemmaByOccurrence.set(key, (async () => {
    const index = await loadWordIdentityIndex("lemma", options);
    const map = new Map();
    for (const [lemma, refs] of Object.entries(index.values ?? {})) {
      for (const ref of refs) map.set(ref, lemma);
    }
    return map;
  })().catch((error) => { lemmaByOccurrence.delete(key); throw error; }));
  return lemmaByOccurrence.get(key);
}

/**
 * v08.22 -- lemma -> its attested grammatical categories, newest of the three
 * packaged indexes and fetched on the same on-demand boundary as the other
 * two (nothing here joins any startup path -- I9).
 *
 * The file is built by `tools/quran-data-pull/build-word-identity-indexes.mjs`
 * straight from `morphology.pos`; see that file for the head rule and the
 * measurements behind it. Each value is `[[category, count], ...]`, ordered
 * count-descending, so `[0][0]` is the form's dominant category and a length
 * greater than one means the source really does attest more than one.
 */
const lemmaPosIndex = new Map();
async function loadLemmaPosIndex({ fetchImpl = fetch, baseUrl = "../tools/quran-data-pull/output/" } = {}) {
  const key = `${baseUrl}${LEMMA_POS_FILE}`;
  if (!lemmaPosIndex.has(key)) lemmaPosIndex.set(key, (async () => {
    const response = await fetchImpl(key);
    if (!response.ok) throw new Error(`Could not load Quran lemma part-of-speech index (${response.status}).`);
    const data = await response.json();
    if (data.identityContract !== "quran-word-occurrence:v1") throw new Error("Unsupported Quran lemma part-of-speech index identity contract.");
    if (data.source !== "morphology.pos" || !data.values || typeof data.values !== "object" || Array.isArray(data.values)) {
      throw new Error("Invalid Quran lemma part-of-speech index format.");
    }
    return data;
  })().catch((error) => { lemmaPosIndex.delete(key); throw error; }));
  return lemmaPosIndex.get(key);
}

/**
 * v08.21 -- the derived word forms of one root, and nothing inferred.
 *
 * A "form" here is a LEMMA that shares this root. That relationship is read
 * straight out of the two packaged indexes, never guessed: measured across
 * the whole packaged corpus, every one of the 49,971 root-bearing
 * occurrences maps to a lemma, and no lemma spans two roots -- so the
 * grouping is exact and every count below is a real count.
 *
 * `unclassified` is the number of this root's occurrences the lemma index
 * does not name. It is reported rather than hidden, so a caller can say so
 * instead of printing a total that does not add up.
 *
 * Order is count descending, then the lemma itself -- deterministic, so
 * Basic Arabic and Arabic in Depth list the same forms in the same order.
 *
 * v08.22 -- each form now also carries the grammatical category the source
 * actually supplies: `pos` (the dominant one), `posCounts` (every attested
 * category with its own count) and `posAmbiguous` (true when there is more
 * than one). v08.21 returned none of this, on the reading that `pos`
 * classifies a written token rather than a dictionary form -- true of the raw
 * string, but its HEAD segment is the word's own category, and taking the head
 * leaves 4,416 of 4,832 lemmas with exactly one. So the category is real and
 * is shown; the 416 that genuinely carry more are marked rather than
 * flattened. A form the index does not name gets `pos: ""` -- never a guess.
 *
 * Forms are grouped by LEMMA and stay grouped by lemma: two distinct written
 * forms that share a category are two rows, never merged.
 */
export async function rootFormsFor(root, options) {
  if (!root) return { root: "", totalOccurrences: 0, formCount: 0, unclassified: 0, forms: [] };
  const index = await loadWordIdentityIndex("root", options);
  const refs = index.values?.[root] ?? [];
  const [byOccurrence, posIndex] = await Promise.all([
    lemmaOccurrenceMap(options),
    loadLemmaPosIndex(options).catch(() => null),
  ]);
  const groups = new Map();
  let unclassified = 0;
  for (const ref of refs) {
    const lemma = byOccurrence.get(ref);
    if (!lemma) { unclassified += 1; continue; }
    if (!groups.has(lemma)) groups.set(lemma, []);
    groups.get(lemma).push(ref);
  }
  const forms = [...groups.entries()]
    .map(([lemma, packed]) => {
      const counts = Array.isArray(posIndex?.values?.[lemma]) ? posIndex.values[lemma] : [];
      return {
        lemma,
        count: packed.length,
        refs: packed.slice().sort((a, b) => a - b),
        pos: counts[0]?.[0] ?? "",
        posCounts: counts,
        posAmbiguous: counts.length > 1,
      };
    })
    .sort((a, b) => b.count - a.count || (a.lemma < b.lemma ? -1 : a.lemma > b.lemma ? 1 : 0));
  return Object.freeze({ root, totalOccurrences: refs.length, formCount: forms.length, unclassified, forms });
}

export function clearWordIdentityIndexCache() { cache.clear(); lemmaByOccurrence.clear(); lemmaPosIndex.clear(); }
