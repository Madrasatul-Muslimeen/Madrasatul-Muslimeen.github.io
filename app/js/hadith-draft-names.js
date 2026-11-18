// Draft English names for the chapters of the Hadith Books (the Owner, 18 Nov 2026: "You draft the chapter names, make it editable by me. For all books").
// One small file per book (chapter id -> English), written by the Lead from the Arabic titles and marked "draft, to be checked" wherever it shows.
// It is only a fallback: a name the madrasah typed (hadithNames) always wins, and the names editor starts from the draft so the Owner corrects it
// and saves it as their own. Read only when a book's chapter list is first drawn (I9: nothing at startup). Bukhari's books keep the MyIndex English.
const BASE_URL = "../tools/hadith-data-pull/output/chapter-names-en/";
const cache = new Map();   // versionUri -> Promise<{id: english}>
const loaded = new Map();  // versionUri -> {id: english}   (sync read once loaded)

/** The books that have a draft file (Bukhari's Sahih has MyIndex English instead). Bound to the files by a check. */
export const DRAFT_NAME_BOOKS = new Set([
  "0179MalikIbnAnas.Muwatta.Shamela0028107-ara1",
  "0241IbnHanbal.Musnad.Shamela0025794-ara1",
  "0255CabdAllahDarimi.Sunan.JK000842-ara1",
  "0256Bukhari.AdabMufrad.JK000011-ara1",
  "0261Muslim.Sahih.Shamela0001727-ara1",
  "0273IbnMaja.Sunan.JK000141-ara1",
  "0275AbuDawudSijistani.Sunan.JK000142-ara1",
  "0279Tirmidhi.Sunan.JK000140-ara1",
  "0303Nasai.CamalYawmWaLayla.JK000735-ara1",
  "0303Nasai.SunanSughra.JK000130-ara1",
  "0364IbnSunniDinawari.CamalYawmWaLayl.JK000943-ara1",
  "0676Nawawi.Adhkar.JK001249-ara1",
  "0676Nawawi.ArbacunaNawawiyya.Shamela0012836-ara1",
  "0676Nawawi.RiyadSalihin.Shamela0012014-ara1",
]);

export const hasDraftNames = (versionUri) => DRAFT_NAME_BOOKS.has(versionUri);

export function loadDraftNames(versionUri, { fetchImpl = fetch, baseUrl = BASE_URL } = {}) {
  if (!hasDraftNames(versionUri)) return Promise.resolve({});
  if (!cache.has(versionUri)) {
    cache.set(versionUri, fetchImpl(`${baseUrl}${versionUri}.json`).then((res) => {
      if (!res.ok) throw new Error(`Could not load the draft names (${res.status}).`);
      return res.json();
    }).then((data) => { loaded.set(versionUri, data && typeof data === "object" ? data : {}); return loaded.get(versionUri); })
      .catch((err) => { cache.delete(versionUri); throw err; }));
  }
  return cache.get(versionUri);
}

/** The draft English name of a chapter once its book's file has been read, else null. */
export const draftNameOf = (versionUri, chapterId) => loaded.get(versionUri)?.[chapterId] || null;
