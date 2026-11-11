// The ORIGINAL PRINTED PAGE of a hadith (the Owner, 10-11 Nov 2026: "the original/real PDF page gives the user ultimate
// confidence of no error of a text"). For every book we have a scan of, a small page map (built by
// tools/hadith-data-pull/book-pages-build.py from the scan's own text layer) says which page of the scan a standard
// hadith number is on. We only LINK to the scan on archive.org (never copy it) and say whose it is.
//
// I9: nothing is fetched at startup; the page map of a book (~40 KB) is read the first time a reader asks for a page.

/**
 * The books with a mapped scan, keyed by the library edition id the Hadith pages already use. A check binds this list
 * to tools/hadith-data-pull/sources/book-pages.json (a hand-typed id is a silent-drift hazard).
 */
export const BOOK_PAGE_BOOKS = {
  "0256Bukhari.Sahih.JK000110-ara1": {
    key: "bukhari",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    slug: "All%20in%20One-Sahih%20Al%20Bukhari-Eng-Arabic",
    title: { en: "Sahih al-Bukhari", bn: "সহীহ বুখারী" },
    pdf: "All in One-Sahih Al Bukhari-Eng-Arabic.pdf", pdfBytes: 81839111,
  },
  "0279Tirmidhi.Sunan.JK000140-ara1": {
    key: "tirmidhi",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    slug: "All%20in%20One-Jami%20At-Tirmidhi-Eng",
    title: { en: "Jami' at-Tirmidhi", bn: "জামে' আত-তিরমিযী" },
    pdf: "All in One-Jami At-Tirmidhi-Eng.pdf", pdfBytes: 65882011,
  },
  "0275AbuDawudSijistani.Sunan.JK000142-ara1": {
    key: "abudawud",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    slug: "All%20in%20One-Sunan%20Abu%20Dawud-Eng",
    title: { en: "Sunan Abi Dawud", bn: "সুনানে আবু দাউদ" },
    pdf: "All in One-Sunan Abu Dawud-Eng.pdf", pdfBytes: 52954531,
  },
  "0273IbnMaja.Sunan.JK000141-ara1": {
    key: "ibnmajah",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    slug: "All%20in%20One-Sunan-Ibn%20Majah-Eng",
    title: { en: "Sunan Ibn Majah", bn: "সুনানে ইবনে মাজাহ" },
    pdf: "All in One-Sunan-Ibn Majah-Eng.pdf", pdfBytes: 98028024,
  },
  "0261Muslim.Sahih.Shamela0001727-ara1": {
    key: "muslim",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    slug: "All%20in%20One-Sahih%20Muslim-Eng-Arabic-Darusalam",
    title: { en: "Sahih Muslim", bn: "সহীহ মুসলিম" },
    pdf: "All in One-Sahih Muslim-Eng-Arabic-Darusalam.pdf", pdfBytes: 153338585,
  },
};

export const BOOK_PAGE_CREDIT_URL = "https://archive.org/details/AllInOne-Hadiths-EngArabicDarusalam_201407";
const DEFAULT_BASE_URL = "../tools/hadith-data-pull/output/book-pages/";
const cache = new Map();
function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

export const hasBookPages = (versionUri) => Object.prototype.hasOwnProperty.call(BOOK_PAGE_BOOKS, versionUri);

/**
 * "Download this book" (the Owner, 11 Nov 2026): the whole scan as a PDF the reader keeps on their device. A plain link: the browser
 * cannot read these files from our page (CORS), but it can open or save them. `mirrorUrl` is for the copy to be hosted in the
 * BwN Library (Owner, 11 Nov): when a book row has one, that link is preferred and archive.org stays the fallback.
 */
export function bookDownload(book) {
  const size = Math.max(1, Math.round((book.pdfBytes || 0) / 1e6));
  return { url: book.mirrorUrl || `https://archive.org/download/${book.archiveId}/${encodeURIComponent(book.pdf)}`, megabytes: size };
}

/** archive.org's reader addresses a page of one file in the item by its 0-based leaf: .../<file>/page/n<leaf>/mode/1up */
export function bookPageUrls(book, leaf) {
  const n = Math.max(0, Math.trunc(Number(leaf) || 0));
  return {
    embedUrl: `https://archive.org/embed/${book.archiveId}/${book.slug}#page/n${n}/mode/1up`,
    openUrl: `https://archive.org/details/${book.archiveId}/${book.slug}/page/n${n}/mode/1up`,
  };
}

/**
 * Where one hadith (by its STANDARD number) is in the scan: { book, leaf, approximate, embedUrl, openUrl }, or null when
 * the book has no scan or the number is not in the map. `approximate` means the number was not found directly on a page,
 * so `leaf` is where the previous hadith starts (this one is on that page or just after it).
 */
export async function loadBookPage(versionUri, standardNumber, { fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  const book = BOOK_PAGE_BOOKS[versionUri];
  const n = Math.trunc(Number(standardNumber));
  if (!book || !(n > 0)) return null;
  const map = await cached(`${baseUrl}${book.key}`, async () => {
    const res = await fetchImpl(`${baseUrl}${book.key}.json`);
    if (!res.ok) throw new Error(`Could not load the book page list (${res.status}).`);
    return res.json();
  });
  if (!map || n > map.numbers || !Number.isInteger(map.p?.[n - 1])) return null;
  const leaf = map.p[n - 1];
  // `a` is sorted: binary search
  let lo = 0, hi = (map.a?.length ?? 0) - 1, approximate = false;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (map.a[mid] === n) { approximate = true; break; } if (map.a[mid] < n) lo = mid + 1; else hi = mid - 1; }
  return { book, leaf, approximate, ...bookPageUrls(book, leaf) };
}
