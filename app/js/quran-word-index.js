// ADR-007 — on-demand Quran word root/lemma occurrence indexes.
// Nothing is fetched until a caller explicitly asks for one identity layer.
import { quranWordOccurrenceId } from "./quran-word-identity.js";

const INDEX_FILES = Object.freeze({ root: "roots-index.json", lemma: "lemmas-index.json" });
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

export function clearWordIdentityIndexCache() { cache.clear(); }
