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
  // Sunan an-Nasa'i comes as TWO scan files (vol. 1-5 and vol. 6). Its printed numbers differ from the standard numbers the reader cites, so
  // the map (tools/hadith-data-pull/book-pages-nasai.py) is aligned by content and says which file holds which STANDARD number (`parts[i].from/to`).
  "0303Nasai.SunanSughra.JK000130-ara1": {
    key: "nasai",
    archiveId: "AllInOne-Hadiths-EngArabicDarusalam_201407",
    title: { en: "Sunan an-Nasa'i", bn: "সুনানে নাসাঈ" },
    parts: [
      { slug: "All%20in%20One-Sunan%20Nasai-Eng-Vol%201-5", pdf: "All in One-Sunan Nasai-Eng-Vol 1-5.pdf", pdfBytes: 101597327 },
      { slug: "All%20in%20One-Sunan%20Nasai-Eng-Vol%206", pdf: "All in One-Sunan Nasai-Eng-Vol 6.pdf", pdfBytes: 15957364 },
    ],
  },
  // Books with NO usable scan: the printed page as typed text on Shamela (the Owner, 10-11 Nov 2026: "Shamela is the fallback").
  // These are keyed by the book's OWN hadith number (the one in our Arabic text), not a concordance standard number.
  "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1": {
    key: "muwatta", kind: "shamela", shamelaId: "28107",
    title: { en: "Muwatta Malik", bn: "মুয়াত্তা মালিক" },
    edition: { en: "ed. al-A'zami", bn: "আল-আ'যামী সম্পাদিত" },
  },
  "0256Bukhari.AdabMufrad.JK000011-ara1": {
    key: "adabmufrad", kind: "shamela", shamelaId: "12991",
    title: { en: "al-Adab al-Mufrad", bn: "আল-আদাবুল মুফরাদ" },
    edition: { en: "ed. Abd al-Baqi", bn: "মুহাম্মাদ ফুআদ আবদুল বাকী সম্পাদিত" },
  },
  // Musnad Ahmad: Shamela's typed text of ed. al-Arna'ut carries the edition's own hadith number, which our text carries too, so the map is keyed by that number.
  "0241IbnHanbal.Musnad.Shamela0025794-ara1": {
    key: "ahmad", kind: "shamela", shamelaId: "25794",
    title: { en: "Musnad Ahmad", bn: "মুসনাদে আহমাদ" },
    edition: { en: "ed. al-Arna'ut, al-Risala", bn: "শু'আইব আল-আরনাউত সম্পাদিত, আর-রিসালা" },
  },
  // Forty Nawawi (the Owner ticked hd1111n G, 11 Nov 2026): our copy carries no hadith numbers, so each passage was found in the typed pages by its
  // opening words and the map is keyed by OUR record order `n` (tools/hadith-data-pull/shamela-pages-text.py).
  "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1": {
    key: "nawawi40", kind: "shamela", keyBy: "n", shamelaId: "12836",
    title: { en: "al-Nawawi's Forty Hadith", bn: "আন-নাওয়াবীর চল্লিশ হাদীস" },
    edition: { en: "Dar al-Minhaj, 1st ed. 1430 AH", bn: "দারুল মিনহাজ, ১ম সংস্করণ, ১৪৩০ হিজরী" },
  },
  // Riyad al-Salihin: the book's own number prints per chapter (and our header has typos), so its map is keyed by OUR record order `n`
  // (keyBy: "n"); the card passes h.n and the pane names the book without a hadith number.
  "0676Nawawi.RiyadSalihin.Shamela0012014-ara1": {
    key: "riyad", kind: "shamela", keyBy: "n", shamelaId: "12014",
    title: { en: "Riyad al-Salihin", bn: "রিয়াযুস সালিহীন" },
    edition: { en: "ed. al-Arna'ut, al-Risala", bn: "শু'আইব আল-আরনাউত সম্পাদিত, আর-রিসালা" },
  },  // Sunan al-Darimi: our text and Shamela's print number their hadith differently after the first few, so the map is keyed by OUR record order `n`.
  "0255CabdAllahDarimi.Sunan.JK000842-ara1": {
    key: "darimi", kind: "shamela", keyBy: "n", shamelaId: "21795",
    title: { en: "Sunan al-Darimi", bn: "সুনানুদ দারিমী" },
    edition: { en: "ed. Husayn Asad", bn: "হুসাইন আসাদ সম্পাদিত" },
  },
};

export const BOOK_PAGE_CREDIT_URL = "https://archive.org/details/AllInOne-Hadiths-EngArabicDarusalam_201407";
const DEFAULT_BASE_URL = "../tools/hadith-data-pull/output/book-pages/";
const cache = new Map();
function cached(key, loader) {
  if (!cache.has(key)) cache.set(key, loader().catch((err) => { cache.delete(key); throw err; }));
  return cache.get(key);
}

/** A Shamela (typed printed text) book rather than an archive.org scan. */
export const isShamelaBook = (versionUri) => BOOK_PAGE_BOOKS[versionUri]?.kind === "shamela";
export const shamelaUrl = (book, index) => `https://shamela.ws/book/${book.shamelaId}/${Math.trunc(Number(index))}`;
export const SHAMELA_URL = "https://shamela.ws/";

/** A book whose page map is keyed by our record order `n` (not by a hadith number). */
export const isKeyedByN = (versionUri) => BOOK_PAGE_BOOKS[versionUri]?.keyBy === "n";

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
  if (book.kind === "shamela") {
    const idx = map?.i?.[n - 1];
    if (!map || n > map.numbers || !Number.isInteger(idx) || idx < 1) return null;
    const url = shamelaUrl(book, idx);
    return { book, kind: "shamela", leaf: null, index: idx, volume: map.v?.[n - 1] || null, page: map.g?.[n - 1] || null, approximate: false, embedUrl: url, openUrl: url };
  }
  if (!map || n > map.numbers || !Number.isInteger(map.p?.[n - 1])) return null;
  const leaf = map.p[n - 1];
  // A book in several scan files: the map says which file holds this STANDARD number; the pane then links to that file (and its PDF).
  let scan = book;
  if (book.parts) {
    const i = (map.parts || []).findIndex((pt) => n >= pt.from && n <= pt.to);
    const pt = i >= 0 ? book.parts[i] : null;
    if (!pt) return null;
    scan = { ...book, slug: pt.slug, pdf: pt.pdf, pdfBytes: pt.pdfBytes };
  }
  // `a` is sorted: binary search
  let lo = 0, hi = (map.a?.length ?? 0) - 1, approximate = false;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (map.a[mid] === n) { approximate = true; break; } if (map.a[mid] < n) lo = mid + 1; else hi = mid - 1; }
  return { book: scan, leaf, approximate, ...bookPageUrls(scan, leaf) };
}
