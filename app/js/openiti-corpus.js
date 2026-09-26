// The real OpenITI corpus (issue #316, part 2 of #314) -- lazy-loaded
// exactly as tools/hadith-data-pull/openiti-split.mjs wrote it: book ->
// chapter -> passage, one folder per book under
// tools/hadith-data-pull/output/openiti-release/split/<versionUri>/.
//
// I9. Nothing here is fetched at import time. Opening the OpenITI source
// (renderOpenitiSource() in hadith-browser.js) is what triggers
// loadAllOpenitiBookIndexes() -- every book's OWN index.json, in parallel,
// once, cached from then on. There is no smaller summary file that already
// carries titleAr/titleEn/passageCount/hadithCount for all 11 books (the
// pull's own manifest.json has titles but no counts, and this round may not
// touch tools/hadith-data-pull/ to add one) -- so the book list's own counts
// need every index.json loaded, but NEVER any chapter's shard: shard files
// (the actual hadith/passage TEXT) load only once a chapter is opened, via
// loadOpenitiChapter(), and only that chapter's own shard file(s).
//
// THE TERMS BIND: CC BY-NC-SA 4.0 (docs/governance/2026-09-26-owner-decisions.md
// row 8) -- attribution is required on every hadith/passage view; nothing
// here trims, re-punctuates or edits a stored string.

export const OPENITI_SOURCE_ID = "openiti-release";
export const OPENITI_LICENCE = "CC BY-NC-SA 4.0";
export const OPENITI_DOI = "10.5281/zenodo.3082463";
export const OPENITI_CREDIT_URL = `https://doi.org/${OPENITI_DOI}`;

const DEFAULT_BASE_URL = "../tools/hadith-data-pull/output/openiti-release/";

const manifestCache = new Map();
const indexCache = new Map();
const shardCache = new Map();

function cached(cache, key, loader) {
  if (!cache.has(key)) {
    cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

/** The pull's own manifest -- titles/authors for all 11 books, in a fixed (chronological, by author's death year) order. No counts; see the header comment above for why those come from each book's own index.json instead. */
export async function loadOpenitiManifest({ fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  return cached(manifestCache, `${baseUrl}manifest.json`, async () => {
    const res = await fetchImpl(`${baseUrl}manifest.json`);
    if (!res.ok) throw new Error(`Could not load the OpenITI manifest (${res.status}).`);
    const data = await res.json();
    if (!Array.isArray(data.files)) throw new Error("Invalid OpenITI manifest.json shape.");
    return data;
  });
}

/** One book's own index.json -- title, counts, licence/DOI and its chapters (title, number range, shard file names). No shard/passage text. */
export async function loadOpenitiBookIndex(versionUri, { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  return cached(indexCache, `${baseUrl}split/${versionUri}/index.json`, async () => {
    const res = await fetchImpl(`${baseUrl}split/${versionUri}/index.json`);
    if (!res.ok) throw new Error(`Could not load "${versionUri}" (${res.status}).`);
    const data = await res.json();
    if (!Array.isArray(data.chapters)) throw new Error(`Invalid OpenITI index.json shape for "${versionUri}".`);
    return data;
  });
}

/** Every book's own index, loaded once each, in parallel, in the manifest's own order -- see the header comment for why the book list needs all 11. Returns [[versionUri, index], ...]. */
export async function loadAllOpenitiBookIndexes(opts) {
  const manifest = await loadOpenitiManifest(opts);
  const entries = await Promise.all(
    manifest.files.map(async (f) => [f.version_uri, await loadOpenitiBookIndex(f.version_uri, opts)])
  );
  return entries;
}

/** One chapter shard file -- `{ paths, hadiths }`, per openiti-split.mjs's own shape. */
export async function loadOpenitiChapterShard(versionUri, file, { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  return cached(shardCache, `${baseUrl}split/${versionUri}/${file}`, async () => {
    const res = await fetchImpl(`${baseUrl}split/${versionUri}/${file}`);
    if (!res.ok) throw new Error(`Could not load a chapter of "${versionUri}" (${res.status}).`);
    const data = await res.json();
    if (!Array.isArray(data.hadiths) || !Array.isArray(data.paths)) throw new Error(`Invalid OpenITI chapter shard shape at "${file}".`);
    return data;
  });
}

/**
 * A chapter's own passages, in order -- every shard file it names (a chapter
 * over SHARD_SIZE=200 passages splits into several, per openiti-split.mjs),
 * loaded and concatenated with each shard's own `p` path index offset so a
 * caller can treat the whole chapter as one `{ paths, hadiths }` pair. Only
 * THIS chapter's own shard file(s) are fetched -- never another chapter's,
 * never another book's.
 */
export async function loadOpenitiChapter(versionUri, chapter, opts) {
  const shards = await Promise.all(chapter.shardFiles.map((file) => loadOpenitiChapterShard(versionUri, file, opts)));
  const paths = [];
  const hadiths = [];
  for (const shard of shards) {
    const offset = paths.length;
    paths.push(...shard.paths);
    for (const h of shard.hadiths) hadiths.push({ ...h, p: h.p + offset });
  }
  return { paths, hadiths };
}

/**
 * The chapter whose own [firstNumber, lastNumber] range contains `number` --
 * ranges are per-chapter, monotonic and non-overlapping across a whole book
 * (checked against all 11 books' real output), so a single linear scan is
 * enough. Returns null for a number outside the book's own numbering, or for
 * a sequential-by-paragraph book with no traditional numbers to look up by
 * (see openiti-split.mjs's own NUMBERING_STYLE).
 */
export function chapterForHadithNumber(bookIndex, number) {
  const n = Number(number);
  if (!Number.isFinite(n)) return null;
  return bookIndex.chapters.find((c) => c.firstNumber != null && n >= c.firstNumber && n <= c.lastNumber) ?? null;
}

/** `openiti:<versionUri>:<n>` -- the permanent position, per openiti-split.mjs's own id scheme. */
export function openitiPassageId(versionUri, n) {
  return `openiti:${versionUri}:${n}`;
}
