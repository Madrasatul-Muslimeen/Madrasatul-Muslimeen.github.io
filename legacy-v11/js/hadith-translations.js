// English and Bangla translations of the eight numbered books (decision 89), read from
// tools/hadith-data-pull/output/translations/ (hadith-translations-pull.mjs). Keyed by the STANDARD number the
// concordance gives each library passage. One chunk of 500 numbers is fetched when a reader opens a translation
// (I9: nothing at startup), and kept for the session.

/** The books with translations (the pull's BOOKS); a check binds this list to summary.json. */
export const TRANSLATED_BOOKS = new Set([
  "0256Bukhari.Sahih.JK000110-ara1", "0261Muslim.Sahih.Shamela0001727-ara1", "0275AbuDawudSijistani.Sunan.JK000142-ara1",
  "0279Tirmidhi.Sunan.JK000140-ara1", "0303Nasai.SunanSughra.JK000130-ara1", "0273IbnMaja.Sunan.JK000141-ara1",
  "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1", "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1",
]);

const DEFAULT_BASE_URL = "../tools/hadith-data-pull/output/translations/";
const cache = new Map();
function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

/** The pull's summary: which books and languages exist, their translators and chunk lists. */
export function loadTranslationSummary({ fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  return cached(`${baseUrl}summary.json`, async () => {
    const res = await fetchImpl(`${baseUrl}summary.json`);
    if (!res.ok) throw new Error(`Could not load the translations list (${res.status}).`);
    return res.json();
  });
}

/**
 * The translation of one standard number in one book, or null when there is none.
 * Returns { text, translator, edition, source, sourceUrl }.
 */
export async function loadHadithTranslation(versionUri, standardNumber, lang, opts = {}) {
  const { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = opts;
  const n = Math.trunc(Number(standardNumber));
  if (!(n > 0)) return null;
  const summary = await loadTranslationSummary(opts);
  const book = (summary.books ?? []).find((b) => b.versionUri === versionUri);
  const info = book?.langs?.[lang];
  if (!info) return null;
  const k = Math.floor(n / (summary.chunk ?? 500));
  if (!info.chunks.includes(k)) return null;
  const chunk = await cached(`${baseUrl}${book.edition}/${lang}/${k}.json`, async () => {
    const res = await fetchImpl(`${baseUrl}${book.edition}/${lang}/${k}.json`);
    if (!res.ok) throw new Error(`Could not load the translation (${res.status}).`);
    return res.json();
  });
  const text = chunk[n];
  return text ? { text, translator: info.translator, edition: info.edition, source: summary.source, sourceUrl: summary.sourceUrl } : null;
}
