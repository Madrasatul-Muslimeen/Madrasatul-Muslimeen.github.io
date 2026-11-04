// Keys to Understanding, Round 1 -- the āyah–hadith index, read side.
// tools/hadith-data-pull/ayah-hadith-index.mjs found, once, which hadith in our books quote which āyah and kept it as
// data: one file per surah (ayah-hadith/<surah>.json) and one file per book the other way round
// (ayah-hadith/by-book/<book>.json). Nothing here is fetched at import time or at startup (I9): the Āyah card asks for
// its surah's file when it opens, the Hadith library asks for a book's file when a passage is opened.
// Finding is not grading: a hit says "this hadith quotes this āyah", never whether the hadith is sound.
import { loadOpenitiBookIndex, loadOpenitiChapter } from "./openiti-corpus.js";

const BASE_URL = "../tools/hadith-data-pull/output/ayah-hadith/";
export const AYAH_HADITH_LIMIT = 12;
const surahCache = new Map();
const bookCache = new Map();

function cached(cache, key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

/** Every hit for one āyah: [{ book, n, number, standard, openitiId, test, quote }] (empty when none). */
export async function loadAyahHadithHits(surah, ayah, { fetchImpl = fetch, baseUrl = BASE_URL } = {}) {
  const file = await cached(surahCache, `${baseUrl}${surah}`, async () => {
    const res = await fetchImpl(`${baseUrl}${surah}.json`);
    if (!res.ok) throw new Error(`Could not load the hadith index for surah ${surah} (${res.status}).`);
    return res.json();
  });
  return file[String(ayah)] ?? [];
}

/** The āyāt one passage quotes: [[surah, ayah, test], ...] (empty when none). `n` is the passage's position in its book. */
export async function loadHadithAyat(versionUri, n, { fetchImpl = fetch, baseUrl = BASE_URL } = {}) {
  const file = await cached(bookCache, `${baseUrl}${versionUri}`, async () => {
    const res = await fetchImpl(`${baseUrl}by-book/${versionUri}.json`);
    if (!res.ok) throw new Error(`Could not load the āyah index for "${versionUri}" (${res.status}).`);
    return res.json();
  });
  return file[String(n)] ?? [];
}

/** The first line of a hit's Arabic and its book's names, for the card. Never throws: a passage that cannot be read
 *  still lists by book and number. */
export async function describeHit(hit, deps = {}) {
  try {
    const index = await (deps.loadIndex ?? loadOpenitiBookIndex)(hit.book);
    const chapter = index.chapters.find((c) => (c.hadithPositions ?? []).includes(hit.n));
    const ch = chapter ? await (deps.loadChapter ?? loadOpenitiChapter)(hit.book, chapter) : null;
    const text = ch?.hadiths.find((h) => h.n === hit.n)?.text ?? "";
    return { ...hit, titleAr: index.titleAr, titleEn: index.titleEn, firstLine: firstLine(text) };
  } catch {
    return { ...hit, titleAr: "", titleEn: "", firstLine: "" };
  }
}

export function firstLine(text, max = 140) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max).replace(/\s\S*$/, "")}…`;
}

/** Hits to show on the card: the ones that quote the āyah by label first (the book itself marks them), then by words;
 *  capped, with the count left over so nothing is hidden silently. */
export function pickHits(hits, limit = AYAH_HADITH_LIMIT) {
  const sorted = [...hits].sort((a, b) => (a.test === b.test ? 0 : a.test === "label" ? -1 : 1));
  return { shown: sorted.slice(0, limit), more: Math.max(0, sorted.length - limit) };
}

/** The Hadith library link for a hit, with the way back (decision 86: back=1). */
export function hadithHitHref(hit, base = "./hadith-collections.html") {
  return `${base}?openiti=${encodeURIComponent(hit.book)}&passage=${hit.n}&back=1&backTo=ayah`;
}
