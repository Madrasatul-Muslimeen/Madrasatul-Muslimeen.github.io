// F-047 data layer — Quran text/tajweed/translations/word-by-word/morphology.
//
// Architecture s5: "Quran content is served as static files, one per surah,
// cached permanently by the browser — never as Firestore reads. Load one
// surah when it is opened. Never load the Quran." This file is the only
// place that reads those static files; nothing here ever touches Firestore.
//
// Packaged by tools/quran-data-pull/pull.js from alquran.cloud + quran.com +
// the Quranic Arabic Corpus mirror (see that script's header comment for
// exact sources). One JSON file per surah, plus a small surah-index.json for
// names/ayah counts without loading full surah content.
//
// BASE_URL currently points at the local dev server's copy of the pulled
// data (see serve.js — it serves the whole project root, so the pull
// script's output is reachable as-is). Swap this one constant to the real
// archive.org URL once the owner has uploaded the packaged files there —
// nothing else in this file (or any caller) needs to change.
const BASE_URL = "/tools/quran-data-pull/output";

const surahCache = new Map(); // surahNumber -> Promise<surah data>
let surahIndexPromise = null;
let juzIndexPromise = null;
let pageIndexPromise = null;

function surahFileUrl(surahNumber) {
  const padded = String(surahNumber).padStart(3, "0");
  return `${BASE_URL}/surahs/surah_${padded}.json`;
}

/** One surah's full data (all ayahs, text/tajweed/translations/words). Fetched once, cached in memory for the rest of the session — the browser's own HTTP cache makes repeat page loads free too. */
export async function getSurah(surahNumber) {
  if (!surahCache.has(surahNumber)) {
    surahCache.set(
      surahNumber,
      fetch(surahFileUrl(surahNumber)).then((res) => {
        if (!res.ok) throw new Error(`Couldn't load surah ${surahNumber} (HTTP ${res.status}).`);
        return res.json();
      }).catch((err) => {
        surahCache.delete(surahNumber); // don't cache a failed load — let the next call retry
        throw err;
      })
    );
  }
  return surahCache.get(surahNumber);
}

/** One ayah's data out of its surah. */
export async function getAyah(surahNumber, ayahNumber) {
  const surah = await getSurah(surahNumber);
  const ayah = surah.ayahs.find((a) => a.ayah === ayahNumber);
  if (!ayah) throw new Error(`Surah ${surahNumber} has no ayah ${ayahNumber}.`);
  return ayah;
}

/** A contiguous run of ayahs within one surah (for range/surah playback and display). */
export async function getAyahRange(surahNumber, fromAyah, toAyah) {
  const surah = await getSurah(surahNumber);
  return surah.ayahs.filter((a) => a.ayah >= fromAyah && a.ayah <= toAyah);
}

/** Lightweight list of all 114 surahs' names/ayah counts, for pickers — never the full text. */
export async function getSurahIndex() {
  if (!surahIndexPromise) {
    surahIndexPromise = fetch(`${BASE_URL}/surah-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the surah index (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      surahIndexPromise = null;
      throw err;
    });
  }
  return surahIndexPromise;
}

/**
 * Phase 5 — Explore navigator's Quran-wheel. 30 entries, {juz, startSurah,
 * startAyah, endSurah, endAyah} — where each Juz begins and ends. Computed
 * once (not hand-typed) from the real pulled per-ayah `juz` field across all
 * 114 surah files, so it's verified against actual data rather than a
 * remembered boundary table — see tools/quran-data-pull/output/juz-index.json.
 * Tiny (30 rows); loaded once, cached like the surah index above.
 */
export async function getJuzIndex() {
  if (!juzIndexPromise) {
    juzIndexPromise = fetch(`${BASE_URL}/juz-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the juz index (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      juzIndexPromise = null;
      throw err;
    });
  }
  return juzIndexPromise;
}

/**
 * Phase 5 round 14 — Explore navigator's Juz-wheel drill-down level (which
 * page starts where, to jump to that page's Surah-wheel on click). 604
 * entries, {page, startSurah, startAyah, endSurah, endAyah}, computed from
 * the real pulled per-ayah `page` field the same way getJuzIndex() is —
 * see tools/quran-data-pull/output/page-index.json. Deliberately doesn't
 * carry a "which Juz" tag; a page can straddle a Juz boundary (verified
 * against the real data — see build-page-index.js's own header), so "which
 * pages belong to Juz J" is computed from Juz J's own startPage/endPage
 * instead, not by filtering this index.
 */
export async function getPageIndex() {
  if (!pageIndexPromise) {
    pageIndexPromise = fetch(`${BASE_URL}/page-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the page index (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      pageIndexPromise = null;
      throw err;
    });
  }
  return pageIndexPromise;
}
