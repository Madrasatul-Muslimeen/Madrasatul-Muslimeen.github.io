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
let hizbIndexPromise = null;
let rukuIndexPromise = null;

function surahFileUrl(surahNumber) {
  const padded = String(surahNumber).padStart(3, "0");
  return `${BASE_URL}/surahs/surah_${padded}.json`;
}

// ---- The English translation the reader chose (the Owner, 20 Nov 2026) --------------------------------------------------------------
// "saheeh" (default): the English the surah files carry. "bewley": The Noble Qur'an by Abdalhaqq and Aisha Bewley, in the layout the translators
// publish (tools/quran-data-pull/pull-bewley.mjs adds one hizb a month to output/bewley/), for the āyāt that are there; every other āyah keeps Saheeh.
// A Bewley āyah gets `rhythm: { lines: [{ i, t }], gap }` (the book's lines, indent steps and stanza break), and `translations.en` becomes its lines
// joined, so every reader of `translations.en` (notes, sharing, search of this surah) gets Bewley's words; `translations.enSaheeh` keeps the original.
const ENGLISH_KEY = "qr.englishTranslator";
const bewleySurahs = new Map(); // surah -> Promise<{ ayahs } | null>
let bewleyIndexPromise = null;
let chosenEnglish = null; // the choice kept in memory too: where storage is blocked or full it still holds for this visit (Codex P2 on #1814)
export function getEnglishTranslator() {
  if (chosenEnglish) return chosenEnglish;
  try { return localStorage.getItem(ENGLISH_KEY) === "bewley" ? "bewley" : "saheeh"; } catch { return "saheeh"; }
}
// A missing file (404) is a real answer and is remembered; a failed request (offline, a 5xx) is NOT, so the next try asks again (Codex P2 on #1814).
function bewleyJson(url, forget) {
  return fetch(url).then((r) => { if (r.status === 404) return null; if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).catch(() => { forget(); return null; });
}
function bewleyIndex() {
  bewleyIndexPromise ??= bewleyJson(`${BASE_URL}/bewley/index.json`, () => { bewleyIndexPromise = null; });
  return bewleyIndexPromise;
}
async function bewleyFor(surahNumber) {
  const idx = await bewleyIndex();
  if (!idx?.surahs?.[surahNumber]) return null; // no verse of this sūrah published yet: nothing is fetched
  if (!bewleySurahs.has(surahNumber)) {
    const padded = String(surahNumber).padStart(3, "0");
    bewleySurahs.set(surahNumber, bewleyJson(`${BASE_URL}/bewley/surah_${padded}.json`, () => bewleySurahs.delete(surahNumber)));
  }
  return bewleySurahs.get(surahNumber);
}
/** Put the chosen English on one loaded surah (idempotent, and the way back to Saheeh is the same call). */
async function applyEnglish(surah) {
  // The reader may change the choice while Bewley's files are on their way: ask again after each wait, and use the choice that is in force NOW (Codex P2 on #1814).
  let choice, want;
  do { choice = getEnglishTranslator(); want = choice === "bewley" ? await bewleyFor(surah.surahNumber) : null; } while (getEnglishTranslator() !== choice);
  for (const a of surah.ayahs ?? []) {
    const t = (a.translations ??= {});
    if (t.enSaheeh === undefined) t.enSaheeh = t.en ?? "";
    const b = want?.ayahs?.[a.ayah];
    if (b?.lines?.length) { a.rhythm = { lines: b.lines, gap: !!b.gap }; t.en = b.lines.map((l) => l.t).join(" "); }
    else { delete a.rhythm; t.en = t.enSaheeh; }
  }
  return surah;
}
/** The reader's choice, then every surah already loaded is redrawn with it. */
export async function setEnglishTranslator(choice) {
  chosenEnglish = choice === "bewley" ? "bewley" : "saheeh";
  try { localStorage.setItem(ENGLISH_KEY, choice === "bewley" ? "bewley" : "saheeh"); } catch { /* the choice lasts for this visit only */ }
  await Promise.all([...surahCache.values()].map((p) => p.then(applyEnglish).catch(() => null)));
}
/** Which āyāt of a sūrah have Bewley, for the page's own note ("n of N published"). */
export async function getBewleyCoverage() { return bewleyIndex(); }

/** One surah's full data (all ayahs, text/tajweed/translations/words). Fetched once, cached in memory for the rest of the session. */
export async function getSurah(surahNumber) {
  if (!surahCache.has(surahNumber)) {
    surahCache.set(
      surahNumber,
      fetch(surahFileUrl(surahNumber)).then((res) => {
        if (!res.ok) throw new Error(`Couldn't load surah ${surahNumber} (HTTP ${res.status}).`);
        return res.json();
      }).then(applyEnglish).catch((err) => {
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

const searchIndexPromises = new Map(); // lang -> Promise<{lang, count, refs, texts}>

/**
 * Shell round 14 — one language's whole-Qur'an search index, 6,236 ayahs of
 * plain text plus a packed surah/ayah reference per row. Built by
 * tools/quran-data-pull/build-search-index.js; see that script's header for
 * why there are three files rather than one.
 *
 * NEVER on the startup path. This is fetched the first time someone presses
 * Search, and only for the language they typed in — the load-speed contract's
 * "screensaver, About, resources: on first use" row. ~272-363KB over the wire
 * (GitHub Pages gzips it), then cached by the browser like every other file
 * here. The search logic itself lives in js/quran-search.js; this stays the
 * only place that reads these static files.
 */
export async function getSearchIndex(lang) {
  if (!searchIndexPromises.has(lang)) {
    searchIndexPromises.set(
      lang,
      fetch(`${BASE_URL}/search-${lang}.json`).then((res) => {
        if (!res.ok) throw new Error(`Couldn't load the ${lang} search index (HTTP ${res.status}).`);
        return res.json();
      }).catch((err) => {
        searchIndexPromises.delete(lang); // don't cache a failed load — let the next search retry
        throw err;
      })
    );
  }
  return searchIndexPromises.get(lang);
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
/**
 * Shell round 18 — the Study Unit picker's Hizb option. 60 entries,
 * {hizb, startSurah, startAyah, endSurah, endAyah, juz}, same shape as the
 * juz index above and built the same way: from the real pulled per-ayah
 * `hizbQuarter` field (a hizb is four quarters), never a hand-typed table —
 * see tools/quran-data-pull/build-hizb-index.js. Loaded on first use, like
 * the two above: nothing here is on the startup path (I9).
 */
export async function getHizbIndex() {
  if (!hizbIndexPromise) {
    hizbIndexPromise = fetch(`${BASE_URL}/hizb-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the hizb index (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      hizbIndexPromise = null;
      throw err;
    });
  }
  return hizbIndexPromise;
}

/**
 * Issue #341 -- "My Status"'s "By unit" Ruku' row. 556 entries, {ruku, surah,
 * fromAyah, toAyah} -- `ruku` is the GLOBAL sequential number the real pulled
 * per-ayah `ruku` field carries (Surah 1 = ruku 1, Surah 2 starts at ruku 2,
 * ...), not the per-surah-relative one buildUnitKey.ruku expects (see
 * unit-keys.js's own rukuIndexInSurah()/localRukuIndexFromTable()). Computed
 * once from the real data by tools/quran-data-pull/build-ruku-index.js,
 * never hand-typed -- same discipline, and same shape, as getJuzIndex()/
 * getPageIndex()/getHizbIndex() above. Tiny (556 rows); loaded on first use,
 * never on the startup path (I9) -- only when My Status is actually opened.
 */
export async function getRukuIndex() {
  if (!rukuIndexPromise) {
    rukuIndexPromise = fetch(`${BASE_URL}/ruku-index.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the ruku index (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      rukuIndexPromise = null;
      throw err;
    });
  }
  return rukuIndexPromise;
}

let juzWordTotalsPromise = null;

/**
 * Issue #206 -- the whole-Qur'an/Juz running counter's DENOMINATOR: 30 real
 * per-Juz word counts, `{ quranTotalWords, byJuz: [{juz, totalWords}, ...] }`,
 * computed once from the real pulled per-ayah `words[]` arrays by
 * tools/quran-data-pull/build-juz-word-totals.js -- never estimated or
 * hand-typed. Tiny (30 rows); loaded on first use like the three indexes
 * above, never on the startup path (I9) -- only when Explore's Juz or
 * whole-Qur'an level is actually opened.
 */
export async function getJuzWordTotalsIndex() {
  if (!juzWordTotalsPromise) {
    juzWordTotalsPromise = fetch(`${BASE_URL}/juz-word-totals.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the juz word totals (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      juzWordTotalsPromise = null;
      throw err;
    });
  }
  return juzWordTotalsPromise;
}

let surahWordTotalsPromise = null;

/**
 * Issue #261 -- Word by Word's own Explore tab, Juz level: one wedge per
 * surah/part-surah inside the open Juz, each labelled with that surah's OWN
 * word total -- `{ quranTotalWords, bySurah: [{surah, totalWords}, ...] }`,
 * computed once from the real pulled per-ayah `words[]` arrays by
 * tools/quran-data-pull/build-surah-word-totals.js -- never estimated or
 * hand-typed, same discipline as getJuzWordTotalsIndex() above. Tiny (114
 * rows); loaded on first use, never on the startup path (I9) -- only when
 * Explore's Word by Word tab is actually opened.
 */
export async function getSurahWordTotalsIndex() {
  if (!surahWordTotalsPromise) {
    surahWordTotalsPromise = fetch(`${BASE_URL}/surah-word-totals.json`).then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the surah word totals (HTTP ${res.status}).`);
      return res.json();
    }).catch((err) => {
      surahWordTotalsPromise = null;
      throw err;
    });
  }
  return surahWordTotalsPromise;
}
