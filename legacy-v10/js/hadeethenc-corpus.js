// The real HadeethEnc corpus (issue #309, part 2 of #306) -- lazy-loaded
// exactly as tools/hadith-data-pull/hadeethenc-package.mjs packaged it.
//
// THE TERMS BIND: "No modification, addition, or deletion of the content.
// Clearly referring to the publisher and the source (HadeethEnc.com)."
// Nothing here trims, re-punctuates or edits a stored string. rehydrateHadith()
// only puts back a field the packager stored once (mirrors that script's own
// rehydrate() -- reimplemented here, not imported, because tools/ is a
// build-time tree and this module ships to a browser).
//
// I9: nothing is fetched at import time. loadHadeethEncCategories() is
// called once per language, the first time a caller actually needs it;
// loadHadeethEncShard() once per shard file, the first time a category or
// hadith actually needs it. Both cache by URL, so a second call anywhere in
// the app is free.
//
// THE STRUCTURE LANGUAGE IS ARABIC, BY MEASUREMENT NOT ASSUMPTION. Every
// English category id is a subset of Arabic's; every Bangla id is a subset
// of English's (checked 26 Sep 2026 against the real pulled corpus: 0 en
// ids outside ar, 0 bn ids outside en, 0 bn ids outside ar). The three
// pulls share the SAME 7 roots. So the category TREE a reader browses is
// always Arabic's own -- the fullest one that exists -- and only a node's
// TITLE and its hadith TEXT fall back per the reader's own language,
// contentLang -> en -> ar, the way hadith-corpus.js's resolveText() already
// falls back for the synthetic pilot (never fabricated, always labelled).

export const HADEETHENC_LANGS = Object.freeze(["ar", "en", "bn"]);
export const HADEETHENC_SOURCE_ID = "hadeethenc";
export const HADEETHENC_STRUCTURE_LANG = "ar";
const DEFAULT_BASE_URL = "../tools/hadith-data-pull/output/hadeethenc/";

const categoriesCache = new Map();
const shardCache = new Map();

function cached(cache, key, loader) {
  if (!cache.has(key)) {
    cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

/** categories.json for one language. Throws rather than returning a partial shape a caller could misread as "no categories". */
export async function loadHadeethEncCategories(lang, { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  if (!HADEETHENC_LANGS.includes(lang)) throw new TypeError(`loadHadeethEncCategories: "${lang}" was not pulled.`);
  return cached(categoriesCache, `${baseUrl}${lang}/categories.json`, async () => {
    const res = await fetchImpl(`${baseUrl}${lang}/categories.json`);
    if (!res.ok) throw new Error(`Could not load HadeethEnc categories for "${lang}" (${res.status}).`);
    const data = await res.json();
    if (data.language !== lang || !data.categories || !data.roots || !data.categoryHadithIds || !data.hadithFile) {
      throw new Error(`Invalid HadeethEnc categories.json shape for "${lang}".`);
    }
    return data;
  });
}

/** One shard file (a `{lang}/cat-N.json`-shaped path, read straight off that language's own hadithFile map). */
export async function loadHadeethEncShard(lang, file, { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  return cached(shardCache, `${baseUrl}${file}`, async () => {
    const res = await fetchImpl(`${baseUrl}${file}`);
    if (!res.ok) throw new Error(`Could not load HadeethEnc shard "${file}" (${res.status}).`);
    const data = await res.json();
    if (!Array.isArray(data.hadiths)) throw new Error(`Invalid HadeethEnc shard shape at "${file}".`);
    return data;
  });
}

// ---------------------------------------------------------------------------
// Category tree -- always read against the Arabic (structure) categories.
// ---------------------------------------------------------------------------

export function categoryById(categoriesData, id) {
  const idStr = String(id);
  return categoriesData.categories.find((c) => String(c.id) === idStr) ?? null;
}

export function childCategories(categoriesData, parentId) {
  const idStr = String(parentId);
  return categoriesData.categories.filter((c) => String(c.parent_id ?? "") === idStr);
}

/**
 * The hadith ids that belong directly to this category -- not to any of its
 * sub-categories. `categoryHadithIds[id]` already includes everything under
 * every descendant (the packager's own note), so a category with children
 * would otherwise list every one of its descendants' hadiths a second time
 * at every ancestor level.
 */
export function directHadithIds(structureCats, catId) {
  const own = structureCats.categoryHadithIds[String(catId)] ?? [];
  const children = childCategories(structureCats, catId);
  if (!children.length) return own;
  const coveredByChild = new Set();
  for (const child of children) {
    for (const id of structureCats.categoryHadithIds[String(child.id)] ?? []) coveredByChild.add(id);
  }
  return own.filter((id) => !coveredByChild.has(id));
}

/**
 * A category's title in the reader's own language, falling back to English
 * then Arabic when that language's own pull has no entry for this id at
 * all (a category with no translated content in that language is simply
 * absent from its own categories.json -- measured, not assumed). Returns
 * null only for an id that is not in ANY of the three pulls, which given
 * Arabic is the structural superset means the id itself does not exist.
 */
export function resolveCategoryTitle(catsByLang, catId, contentLang) {
  const order = [...new Set([contentLang, "en", "ar"])];
  for (const lang of order) {
    const cats = catsByLang[lang];
    if (!cats) continue;
    const node = categoryById(cats, catId);
    if (node && node.title) {
      return { title: node.title, lang, isFallback: lang !== contentLang, count: node.hadeeths_count ?? null };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Hadith records -- the Arabic matn is `hadeeth` in the ar pull, `hadeeth_ar`
// in every translated one (mirrors tools/hadith-data-pull/hadeethenc-pull.mjs
// arabicText(), re-declared here for the same reason rehydrateHadith() is).
// ---------------------------------------------------------------------------

export function hadithArabicText(record, lang) {
  return lang === "ar" ? (record?.hadeeth ?? null) : (record?.hadeeth_ar ?? null);
}

function arBaseField(key) {
  return key.endsWith("_ar") ? key.slice(0, -3) : null;
}

/** Mirrors tools/hadith-data-pull/hadeethenc-package.mjs's own rehydrate(). Pure. */
export function rehydrateHadith(record, omitted, arRecord) {
  if (!omitted?.length) return record;
  const full = { ...record };
  for (const k of omitted) full[k] = arRecord ? arRecord[arBaseField(k)] : null;
  return full;
}

/**
 * Every id's own record, resolved contentLang -> en -> ar (never fabricated,
 * always labelled `isFallback`), fetching only the DISTINCT shard files the
 * requested ids actually need -- one id's shard is very often another id's
 * too, since categoryHadithIds clusters them together.
 *
 * Throws if an id is not in ANY of the three pulls -- ar is the corpus's own
 * source language and structurally covers every id any language's own tree
 * can ever produce, so that would be a genuine data defect, not a fallback.
 */
export async function loadHadithRecords(ids, contentLang, opts = {}) {
  const idStrs = [...new Set(ids.map(String))];
  const order = [...new Set([contentLang, "en", "ar"])];

  const catsByLang = {};
  for (const lang of order) catsByLang[lang] = await loadHadeethEncCategories(lang, opts).catch(() => null);

  const plan = new Map(); // id -> { lang, file }
  for (const id of idStrs) {
    for (const lang of order) {
      const file = catsByLang[lang]?.hadithFile?.[id];
      if (file) { plan.set(id, { lang, file }); break; }
    }
  }
  const missing = idStrs.filter((id) => !plan.has(id));
  if (missing.length) {
    throw new Error(`HadeethEnc: hadith id(s) not found in any pulled language: ${missing.slice(0, 5).join(", ")}`);
  }

  const shardKeys = new Set([...plan.values()].map((p) => `${p.lang}\u0000${p.file}`));
  const shards = new Map();
  await Promise.all([...shardKeys].map(async (key) => {
    const [lang, file] = key.split("\u0000");
    shards.set(key, await loadHadeethEncShard(lang, file, opts));
  }));

  // Batch the Arabic rehydration shards too, rather than one fetch per id.
  const arFileForId = new Map();
  for (const id of idStrs) {
    const { lang, file } = plan.get(id);
    if (lang === "ar") continue;
    const omitted = shards.get(`${lang}\u0000${file}`).arabicFromArRecord?.[id];
    if (omitted?.length) {
      const arFile = catsByLang.ar?.hadithFile?.[id];
      if (!arFile) throw new Error(`HadeethEnc ${id}: Arabic fields were omitted but no Arabic record exists.`);
      arFileForId.set(id, arFile);
    }
  }
  const arShardFiles = new Set(arFileForId.values());
  const arShards = new Map();
  await Promise.all([...arShardFiles].map(async (file) => arShards.set(file, await loadHadeethEncShard("ar", file, opts))));

  const out = new Map();
  for (const id of idStrs) {
    const { lang, file } = plan.get(id);
    const shard = shards.get(`${lang}\u0000${file}`);
    let record = shard.hadiths.find((h) => String(h.id) === id);
    if (!record) throw new Error(`HadeethEnc ${id}: not found in its own planned shard "${file}".`);
    const arFile = arFileForId.get(id);
    if (arFile) {
      const arShard = arShards.get(arFile);
      const arRecord = arShard?.hadiths.find((h) => String(h.id) === id) ?? null;
      record = rehydrateHadith(record, shard.arabicFromArRecord[id], arRecord);
    }
    out.set(id, { record, lang, isFallback: lang !== contentLang, requestedLang: contentLang });
  }
  return out;
}

export async function loadHadithRecord(id, contentLang, opts) {
  const map = await loadHadithRecords([id], contentLang, opts);
  return map.get(String(id));
}

/** The reader-facing "Source: HadeethEnc.com" link, in whichever language the record actually rendered in. */
export function hadeethEncSourceUrl(lang, id) {
  return `https://hadeethenc.com/${lang}/browse/hadith/${id}`;
}
