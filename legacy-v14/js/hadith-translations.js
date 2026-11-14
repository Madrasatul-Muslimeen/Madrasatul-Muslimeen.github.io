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

/**
 * PCF MSA J97 (the Owner, 31 Oct 2026, answer A): in Bukhārī's Bangla (ben-bukhari) about 1,130 texts begin with
 * their CHAPTER heading (Arabic, often a Qur'an verse in Bangla) and only then the hadith, "৬৩০৬. শাদ্দাদ …".
 * Returns { heading, text }: the heading before the hadith's own number, and the hadith from its number on.
 * The number is the hadith's standard number in Bangla digits; failing that (a few texts carry the edition's
 * own number, e.g. 200 → ১৮৩), a 2–4 digit number with ". " that is not a publisher's reference ("প্রকাশনীঃ ১৬০২.").
 * Any other book or language, or no such number after the start: { heading: null, text } unchanged.
 * The data file is never changed; this only decides how the fold shows it.
 */
export function splitChapterHeading(edition, standardNumber, text) {
  const s = String(text ?? "");
  if (edition !== "ben-bukhari") return { heading: null, text: s };
  const bnDigits = String(Math.trunc(Number(standardNumber))).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
  const own = new RegExp(`(^|\\s)${bnDigits}\\s*[.।]`).exec(s); // 434 has no space after its full stop
  let at = own ? own.index + own[1].length : -1;
  if (at < 0) {
    const other = /(^|\s)[০-৯]{2,4}\.\s/g;
    for (let m; (m = other.exec(s));) {
      const i = m.index + m[1].length;
      if (/ঃ\s*$/.test(s.slice(Math.max(0, i - 3), i))) continue; // "আধুনিক প্রকাশনীঃ ১৬০২." is a reference, not the start
      at = i; break;
    }
  }
  if (at <= 0) return { heading: null, text: s };
  const heading = s.slice(0, at).trim();
  return heading ? { heading, text: s.slice(at).trim() } : { heading: null, text: s };
}
