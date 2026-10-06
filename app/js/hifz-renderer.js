// Phase 5 (round 7) — Hifz Mushaf page renderer: a true page-for-page replica
// of the 604-page Madani Mushaf (QCF V2 glyph fonts, line-justified), for the
// Study Unit picker's Whole Surah / Range page-view toggle.
//
// I2: this is a renderer, not a module — it takes a page number / ayah keys
// in and DOM out. It never calls records.js/activity.js itself.
//
// Rewritten fresh against this build's own data shapes — index.html is
// reference only, never imported. Logic (page-layout JSON shape, per-page
// glyph font loading, line-justification-by-horizontal-scale, the ayah->page
// reverse index) is carried over verbatim from index.html's own proven
// renderHifzView, because it already works correctly there.
//
// Data source: the 604-page layout + word-glyph JSON (mushaf-madani-v2.json,
// sourced from QUL — qul.tarteel.ai) is still hosted, live, no auth needed,
// in the madrasatul-muslimeen.github.io repo. The per-page glyph fonts
// themselves are NOT (issue #332, Part A) — the files that used to be
// committed at mushaf/fonts/ turned out to be byte-identical to Quran
// Foundation's own official CDN copies (checked for pages 1, 255 and 604;
// see docs/reports/2026-09-27-tajweed-font-permission.md), so the plain
// (QCF V2) page fonts are now loaded from that CDN at runtime instead —
// the same "load from the CDN, don't copy the files" treatment the Tajweed
// (QPC V4 COLRv1) font below needs anyway, so both fonts follow one rule.
// mushaf/fonts/ itself is NOT deleted — legacy-v07/ still loads it (I4).
//
// Fetched lazily, once per session — never bundled, per the load-speed
// contract (Architecture s8: "Screensaver, About, resources: on first use").

import { t, num } from "./i18n.js";
import { buildUnitKey } from "./unit-keys.js";
import { FATIHA_SPLIT_AFTER_WORD } from "./fatiha-count.js";

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
// Issue #332 Part A -- was raw.githubusercontent.com/.../mushaf/fonts/ (the
// files this repo committed under mushaf/fonts/, kept for legacy-v07/ only).
// Quran Foundation's own documented CDN serves the identical bytes; see the
// permission report cited above for the byte-identity check. Loaded from the
// CDN, per the issue's own instruction -- not re-bundled into this repo.
// Since issue #335, app/sw.js keeps a page's own font here for offline use
// once it has actually been opened, in its own cache separate from the app
// files, refreshed at least weekly -- see that worker's own comment for why;
// nothing here changed to make that possible, it is purely a network-layer
// concern of the worker's.
const MUSHAF_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/";
// Issue #332 Part B -- the Tajweed-colours per-page toggle. Same per-page
// glyph codes as the plain font above (only the font-family changes); loaded
// only once a reader actually turns the toggle on (I9). Kept offline by
// app/sw.js under the same issue #335 treatment as the plain font above --
// never copied into this repository itself (the permission report's own
// binding rule 1).
const TAJWEED_FONT_BASE = "https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// One ligature character per surah (1-114) — QUL's own "Surah header font"
// documentation table — each renders the full ornamental print banner
// (border + surah name) in the 'surah-header' COLOR font. Same list
// index.html already uses in production.
const SURAH_HEADER_GLYPHS = ["ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];

let mushafDataPromise = null;
let mushafData = null;
let ayahPageIndex = null; // "surah:ayah" -> sorted array of page numbers
// "surah:ayah" -> highest w.loc position seen for that ayah. The Mushaf's own
// per-page layout data always carries one MORE position than the ayah has
// real words -- the print's own ayah-end-number glyph, occupying the final
// position -- so this is what tells renderWord() (below) which span is that
// marker rather than a real, tappable word. Built once alongside
// ayahPageIndex from the same single pass over mushafData.
let ayahMaxWordPosition = null;

/** Fetches the 604-page layout JSON once, caches it for the rest of the session. */
export function ensureMushafData() {
  if (mushafData) return Promise.resolve(mushafData);
  if (mushafDataPromise) return mushafDataPromise;
  mushafDataPromise = fetch(MUSHAF_JSON_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Couldn't load the Mushaf page data (HTTP ${res.status}).`);
      return res.json();
    })
    .then((data) => {
      mushafData = data;
      buildAyahPageIndex();
      return data;
    })
    .catch((err) => {
      mushafDataPromise = null; // allow retry on next attempt rather than sticking on a dead promise
      throw err;
    });
  return mushafDataPromise;
}

function buildAyahPageIndex() {
  ayahPageIndex = {};
  ayahMaxWordPosition = {};
  Object.keys(mushafData).forEach((pageNum) => {
    mushafData[pageNum].forEach((line) => {
      if (line.type !== "ayah" || !line.words) return;
      line.words.forEach((w) => {
        const loc = w.loc.split(":"); // "surah:ayah:word"
        const key = `${loc[0]}:${loc[1]}`;
        const pos = Number(loc[2]);
        if (!ayahPageIndex[key]) ayahPageIndex[key] = new Set();
        ayahPageIndex[key].add(Number(pageNum));
        if (!ayahMaxWordPosition[key] || pos > ayahMaxWordPosition[key]) ayahMaxWordPosition[key] = pos;
      });
    });
  });
  Object.keys(ayahPageIndex).forEach((k) => {
    ayahPageIndex[k] = Array.from(ayahPageIndex[k]).sort((a, b) => a - b);
  });
}

// Issue #188 -- tap a Mushaf-page word to open its Word Card.
//
// This file's own w.loc position and the app's own word-by-word position
// (quranWordOccurrenceId() / renderWordByWordPanel() in ayah-renderer.js,
// sourced from tools/quran-data-pull/output/surahs/*.json) are NOT always
// the same number for the same word -- checked for real, across all 6,236
// ayahs, by comparing this file's own per-ayah word-glyph count (excluding
// the trailing ayah-end marker above) against the app's own word count.
// Exactly three ayahs diverge, all for the identical reason: the app's
// word-by-word corpus joins "بَعْدَ مَا" ("after that") into ONE word entry
// carrying an internal space, while this Mushaf page-layout data (QUL)
// prints it as two separate positions. mergeAt is the app-side word
// position of "بَعْدَ مَا" in each; the mushaf position right after it is the
// second half of that SAME word and must open the SAME occurrence, not the
// next one -- every position after the pair is then shifted back by one.
// tools/i18n-verify/mushaf-word-occurrence-parity.mjs re-derives this from
// the live data on every run and fails if a fourth ayah ever diverges.
// Exported so tools/i18n-verify/mushaf-word-occurrence-parity.mjs checks the
// SAME table production uses, rather than a copy that could silently drift.
export const AYAH_WORD_MERGES = { "2:181": 3, "8:6": 4, "13:37": 8 };

// Exported for the same reason as AYAH_WORD_MERGES above -- so the parity
// check exercises the real function rather than a re-implementation of it.
export function resolveWordOccurrencePosition(ayahKey, mushafPosition) {
  const mergeAt = AYAH_WORD_MERGES[ayahKey];
  if (!mergeAt) return mushafPosition;
  if (mushafPosition <= mergeAt) return mushafPosition;
  if (mushafPosition === mergeAt + 1) return mergeAt; // second half of the joined word -- same occurrence
  return mushafPosition - 1;
}

/** Real Mushaf page numbers spanned by a list of "surah:ayah" keys (a small number of ayahs split across a page boundary contribute more than one page). Call after ensureMushafData() resolves. */
export function getMushafPagesForKeys(ayahKeys) {
  const pageSet = new Set();
  ayahKeys.forEach((key) => (ayahPageIndex[key] || []).forEach((p) => pageSet.add(p)));
  return Array.from(pageSet).sort((a, b) => a - b);
}

/**
 * Issue #322 -- which surah(s) a real Mushaf page belongs to, and the āyah
 * range shown for each, in reading order (top to bottom of the page). A page
 * that opens mid-surah and closes on the next carries two groups; one is the
 * ordinary case. Walks the SAME per-page layout `renderPage()` already draws
 * (no separate index, no extra fetch) -- call after ensureMushafData()
 * resolves. Returns `[]` for an unknown page number.
 */
export function mushafPageAyahGroups(pageNum) {
  const pageData = mushafData?.[String(pageNum)];
  if (!pageData) return [];
  const groups = [];
  let current = null;
  for (const line of pageData) {
    if (line.type !== "ayah" || !line.words) continue;
    for (const w of line.words) {
      const [surahStr, ayahStr] = w.loc.split(":");
      const surah = Number(surahStr), ayah = Number(ayahStr);
      if (!current || current.surah !== surah) {
        current = { surah, firstAyah: ayah, lastAyah: ayah };
        groups.push(current);
      } else {
        if (ayah < current.firstAyah) current.firstAyah = ayah;
        if (ayah > current.lastAyah) current.lastAyah = ayah;
      }
    }
  }
  return groups;
}

// Issue #421 -- the Writing sheet (writing-sheet.js) draws the SAME printed
// pages onto canvases. It reuses this file's layout data and font loaders
// rather than copying them; these four exports are read-only windows onto what
// is already here, and none of them fetches anything until it is called.
/** One page's printed lines exactly as the JSON has them, or null. Call after ensureMushafData() resolves. */
export function getMushafPageLines(pageNum) {
  return mushafData?.[String(pageNum)] ?? null;
}

/** The position of an ayah's own end-marker glyph (its highest w.loc position), or 0. */
export function getAyahEndMarkerPosition(ayahKey) {
  return (ayahMaxWordPosition && ayahMaxWordPosition[ayahKey]) || 0;
}

/** Loads a page's QCF V2 font and resolves { family, ok }. */
export async function loadMushafPageFont(pageNum) {
  const r = await ensurePageFont(pageNum);
  return { family: `hifz-p${pageNum}`, ok: !!r.ok };
}

/** The one ligature character that draws surah `n`'s print banner in the 'surah-header' font ('' if unknown). */
export function surahHeaderGlyph(n) {
  return SURAH_HEADER_GLYPHS[Number(n) - 1] || "";
}

/** Loads the surah-banner glyph font and resolves whether it is usable (family 'surah-header'). */
export function loadSurahHeaderFont() {
  return ensureHeaderFont();
}

const fontPromises = new Map();
// Issue #332 Part B -- the Tajweed font, cached separately by page number.
// Never populated unless the toggle is actually turned on (I9): nothing here
// requests a page number that ensurePageTajweedFont() was never called for.
const tajweedFontPromises = new Map();
let headerFontPromise = null;
// One observer per rendered page, disconnected when the pages are replaced --
// otherwise every re-render would leave its own watcher running for ever.
let pageObservers = [];

// Both loaders return `{ ok, unconfirmed }` rather than a bare boolean:
// `ok` is a CONFIRMED load (the family is safe to justify against and to
// show without comment); `unconfirmed` is the older-browser FontFace-less
// path, which cannot confirm one way or the other, and must never be shown
// as a failure it never actually observed (I15 -- a message must be true).
function loadGlyphFont(pageNum, family, url, cacheMap) {
  if (cacheMap.has(pageNum)) return cacheMap.get(pageNum);
  let promise;
  if (typeof FontFace === "function" && document.fonts) {
    const face = new FontFace(family, `url('${url}')`);
    promise = face.load().then((loaded) => {
      document.fonts.add(loaded);
      return { ok: true };
    }).catch((err) => {
      console.warn(`Hifz font load failed for '${family}':`, err);
      return { ok: false };
    });
  } else {
    // Older-browser fallback without the FontFace API: inject @font-face
    // directly. Can't confirm load completion here, so line-justification
    // (which needs accurate glyph widths) is skipped for this browser, and
    // no failure message is shown -- there is no observed failure, only an
    // unconfirmed one.
    const styleEl = document.createElement("style");
    styleEl.textContent = `@font-face{font-family:'${family}';src:url('${url}') format('woff2');font-display:swap;}`;
    document.head.appendChild(styleEl);
    promise = Promise.resolve({ ok: false, unconfirmed: true });
  }
  cacheMap.set(pageNum, promise);
  return promise;
}

function ensurePageFont(pageNum) {
  return loadGlyphFont(pageNum, `hifz-p${pageNum}`, `${MUSHAF_FONT_BASE}p${pageNum}.woff2`, fontPromises);
}

function ensurePageTajweedFont(pageNum) {
  return loadGlyphFont(pageNum, `hifz-tajweed-p${pageNum}`, `${TAJWEED_FONT_BASE}p${pageNum}.woff2`, tajweedFontPromises);
}

// Issue #332 Part B -- whether this browser can actually RENDER a COLRv1
// colour font, not merely whether one loads. `font-tech()` is the CSS Fonts
// Module Level 4 feature query built for exactly this (progressive
// enhancement on font technology support): it needs no network fetch at all,
// so it is cheap, synchronous after the first call, and gives a real answer
// for the browser's own rendering engine rather than for one specific font
// file. Cached after the first read (the answer cannot change mid-session).
// Older Safari/iPhone (the case the issue names) do not implement
// `font-tech()` at all, which resolves to `false` here -- the same
// conservative "hide it" outcome as a browser that understands the query and
// genuinely lacks COLRv1, which is the safe direction to be wrong in.
let colrV1Supported = null;
export function mushafTajweedSupported() {
  if (colrV1Supported === null) {
    try {
      colrV1Supported = typeof CSS !== "undefined" && typeof CSS.supports === "function"
        && CSS.supports("font-tech(color-COLRv1)");
    } catch {
      colrV1Supported = false;
    }
  }
  return colrV1Supported;
}

/** Decides which family a page actually draws in, trying the Tajweed font
 *  first when asked for and falling back to plain on any failure -- the
 *  reader keeps a readable Mushaf rather than losing the page outright.
 *  `message` names which I15 notice (if any) renderPage() should show:
 *  "tajweed-fallback" (Tajweed failed, plain is fine) or "plain-failed" (the
 *  page genuinely can't be drawn). */
async function resolvePageFont(pageNum, tajweedOn) {
  const plainFamily = `hifz-p${pageNum}`;
  if (tajweedOn && mushafTajweedSupported()) {
    const tajweedFamily = `hifz-tajweed-p${pageNum}`;
    const tajweedResult = await ensurePageTajweedFont(pageNum);
    if (tajweedResult.ok) return { family: tajweedFamily, ready: true, message: null };
    const plainResult = await ensurePageFont(pageNum);
    const plainFailed = !plainResult.ok && !plainResult.unconfirmed;
    return { family: plainFamily, ready: plainResult.ok, message: plainFailed ? "plain-failed" : "tajweed-fallback" };
  }
  const plainResult = await ensurePageFont(pageNum);
  const plainFailed = !plainResult.ok && !plainResult.unconfirmed;
  return { family: plainFamily, ready: plainResult.ok, message: plainFailed ? "plain-failed" : null };
}

function ensureHeaderFont() {
  if (headerFontPromise) return headerFontPromise;
  if (typeof FontFace === "function" && document.fonts) {
    const face = new FontFace("surah-header", `url('${SURAH_HEADER_FONT_URL}')`);
    headerFontPromise = face.load().then((loaded) => {
      document.fonts.add(loaded);
      return true;
    }).catch((err) => {
      console.warn("Surah header font load failed:", err);
      return false;
    });
  } else {
    const styleEl = document.createElement("style");
    styleEl.textContent = `@font-face{font-family:'surah-header';src:url('${SURAH_HEADER_FONT_URL}') format('woff2');font-display:swap;}`;
    document.head.appendChild(styleEl);
    headerFontPromise = Promise.resolve(false);
  }
  return headerFontPromise;
}

// Glyph fonts don't self-justify — each line is measured at its natural
// (shrink-to-fit) width, then horizontally scaled to exactly span the page,
// anchored to the right edge (where Arabic lines start reading from).
// Clamped defensively in case a measurement comes back unreasonable.
function justifyPageLines(pageEl) {
  const cs = getComputedStyle(pageEl);
  const paddingLeft = parseFloat(cs.paddingLeft) || 0;
  const paddingRight = parseFloat(cs.paddingRight) || 0;
  const targetWidth = pageEl.clientWidth - paddingLeft - paddingRight;
  if (!targetWidth) return;
  pageEl.querySelectorAll(".hifz-line:not(.centered)").forEach((lineEl) => {
    lineEl.style.transform = "";
    // Round 28 -- the line's own INTRINSIC width, not the width its box was
    // allowed to be. `.hifz-line` carries `max-width: 100%`, so offsetWidth
    // alone can never exceed the target: a line whose glyphs are genuinely
    // too wide measured as exactly right, scaled by 1.0, and went on
    // overflowing its page by a few pixels with nothing able to notice.
    const natural = Math.max(lineEl.offsetWidth, lineEl.scrollWidth);
    if (!natural) return;
    let scale = targetWidth / natural;
    scale = Math.max(0.8, Math.min(1.5, scale));
    lineEl.style.transformOrigin = "right center";
    lineEl.style.transform = `scaleX(${scale.toFixed(4)})`;
  });
}

/**
 * Round 28 -- re-justify when the page's width becomes known or changes.
 *
 * justifyPageLines() needs a laid-out element: `pageEl.clientWidth` is 0 while
 * the page is inside a hidden container, and it gives up rather than dividing
 * by nothing. That is exactly what happens in this app -- Mushaf is ticked in
 * the Study options panel, which sits over a stage that may still be showing
 * the wheel -- so the page was rendered, never justified, and then revealed:
 * lines at their natural width instead of spanning the page. Nothing re-ran
 * it, because nothing was watching. A ResizeObserver is, and it earns its keep
 * twice: it also fixes rotating the phone, which had the same silent problem.
 *
 * No feedback loop: justification only sets transforms on the LINES, and a
 * transform changes no layout, so observing the page cannot re-trigger itself.
 */
function watchPageWidth(pageEl) {
  if (typeof ResizeObserver !== "function") return;
  let lastWidth = 0;
  const ro = new ResizeObserver(() => {
    const w = pageEl.clientWidth;
    if (!w || w === lastWidth) return;
    lastWidth = w;
    justifyPageLines(pageEl);
  });
  ro.observe(pageEl);
  pageObservers.push(ro);
}

// Live registry of rendered word spans, keyed by "surah:ayah", so
// setActiveAyah() below can highlight/unhighlight during audio playback
// without re-fetching or re-rendering anything.
let wordRegistry = new Map();
let activeAyahKey = null;

// Issue #113 -- renderMushafPages() has always been re-entrant-UNSAFE: its
// own caller (renderFlowView()'s Mushaf branch, fired by renderStudyScreen(),
// itself synchronous and NOT awaited by its own callers) can genuinely be
// invoked a second time before a first call's per-page font loads finish.
// This is a real, PRE-EXISTING characteristic of the surrounding app, not
// introduced here: `navigateToAyah()`'s own surah-change branch calls
// loadSurah(), whose own tail renders once at the just-reset āyah 1, and
// then calls renderStudyScreen() a SECOND time itself, at the real
// destination āyah -- and a Whole-Surah/Range unit's page bounds do not
// depend on which āyah is "current", so both renders can ask for the SAME
// page set. Found by this round's own revert-and-confirm step, not assumed:
// a synthetic fixture proved a stale first call's still-in-flight
// `renderPage()` continues past a second call's own container.innerHTML=""
// reset and appendChild()s into it anyway, doubling every page and leaving
// `wordRegistry` holding whichever span happened to register last -- which
// is exactly the kind of state THIS round's own await-before-scroll fix
// then reads, so a stale render corrupting it defeats that fix regardless of
// how faithfully the caller awaits. A monotonic generation token is the
// established fix for "a superseded async caller must stop mutating shared
// state" -- this codebase already uses exactly this shape for the Word
// Card's own request counter, `quranWordCardRequest`, in the page that
// imports this module -- checked after every await inside renderPage(),
// before either wordRegistry or the container is touched, so a superseded
// call becomes an inert no-op rather than a race.
let renderGeneration = 0;

function renderWord(w, highlightSet) {
  const span = document.createElement("span");
  span.className = "hifz-word";
  if (w.fatihaSplitMarker) {
    // Issue #482 -- the inserted ⑥ after 1:7:4. It opens the same Āyah card
    // as the end of 1:7 (data-ayah-marker stays the internal "1:7").
    span.textContent = w.g;
    span.classList.add("hifz-ayah-marker");
    span.dataset.ayahMarker = "1:7";
    span.dataset.ayahSplitPoint = "1";
    span.dataset.ayahSplitHalf = "a"; // issue #606 -- the end of DISPLAYED Ayah 6 (the real 1:7 end marker is 7)
    if (highlightSet && !highlightSet.has("1:7")) span.classList.add("dim");
    if (!wordRegistry.has("1:7")) wordRegistry.set("1:7", []);
    wordRegistry.get("1:7").push(span);
    return span;
  }
  const loc = w.loc.split(":");
  const [surahStr, ayahStr, posStr] = loc;
  const ayahKey = `${surahStr}:${ayahStr}`;
  if (highlightSet && !highlightSet.has(ayahKey)) span.classList.add("dim");
  span.textContent = w.g;
  // I2: this is a DOM attribute only -- the click listener and openWordCard()
  // call stay in quranrevival.html's own shared ["readView", "noteView"]
  // handler (the same one the Word-by-Word strip already uses), and this
  // file imports nothing new to produce it. Skip the ayah's own trailing
  // end-marker position (not a real word) and correct for the three known
  // divergent ayahs (see AYAH_WORD_MERGES above) so a tap never opens the
  // wrong word.
  const mushafPosition = Number(posStr);
  const maxPosition = ayahMaxWordPosition && ayahMaxWordPosition[ayahKey];
  if (maxPosition && mushafPosition < maxPosition) {
    const wordPosition = resolveWordOccurrencePosition(ayahKey, mushafPosition);
    span.dataset.wordOccurrence = `quran-word-occurrence:v1:${surahStr}:${ayahStr}:${wordPosition}`;
  } else if (maxPosition && mushafPosition === maxPosition) {
    // Issue #286 -- this IS the ayah-end marker (the round print number),
    // the one span the block above deliberately never gives a
    // data-word-occurrence to. Tapping it opens the "This āyah" action
    // sheet rather than the Word Card -- same I2 split as above: a DOM
    // attribute only, the click listener stays in quranrevival.html.
    span.classList.add("hifz-ayah-marker");
    span.dataset.ayahMarker = ayahKey;
  }
  if (!wordRegistry.has(ayahKey)) wordRegistry.set(ayahKey, []);
  wordRegistry.get(ayahKey).push(span);
  return span;
}

/**
 * Issue #332 Part B -- the row carrying "Page N" and the per-page Tajweed
 * toggle (Owner decision 1: beside the label, not a new bar). Every page
 * gets its own toggle, all of them reflecting and moving the SAME one
 * preference (prefs.js's mm_mushaf_tajweed_font) -- `onToggleTajweed`
 * hands the new value up to whichever page re-renders the whole Mushaf
 * view (I2: this file owns no persistence of its own; quranrevival.html
 * does, exactly like every other reading preference here).
 */
function buildPageHeader(pageNum, tajweedOn, onToggleTajweed) {
  const headerEl = document.createElement("div");
  headerEl.className = "hifz-page-header";
  const numEl = document.createElement("div");
  numEl.className = "hifz-page-num";
  // 30 Sep 2026 -- was the literal `Page ${pageNum}`, so a Bangla reader saw
  // "Page 562"; the string and its Bangla were already in bn.js.
  numEl.textContent = t("Page {page}", { page: num(pageNum) });
  headerEl.appendChild(numEl);

  const supported = mushafTajweedSupported();
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "hifz-tajweed-toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!tajweedOn;
  const textSpan = document.createElement("span");
  if (supported) {
    textSpan.textContent = t("Tajweed colours");
    checkbox.addEventListener("change", () => {
      if (typeof onToggleTajweed === "function") onToggleTajweed(checkbox.checked);
    });
  } else {
    // Owner decision 9 / the issue's own spec: hide OR disable, but always
    // say why in words -- CLAUDE.md's own standing lesson prefers a control
    // that explains itself over one that is simply gone.
    checkbox.disabled = true;
    toggleLabel.classList.add("is-disabled");
    textSpan.textContent = t("Tajweed colours (not supported on this browser)");
  }
  toggleLabel.appendChild(checkbox);
  toggleLabel.appendChild(textSpan);
  headerEl.appendChild(toggleLabel);
  return headerEl;
}

/**
 * Issue #482 -- Al-Fātiḥah's DISPLAY count on Mushaf page 1 (setting on).
 * Only the glyph of each āyah-end marker is reassigned and one marker is
 * inserted; every stored loc / occurrence id / data-ayah-marker stays the
 * internal one. The printed markers are the page font's own ①..⑦ glyphs, so:
 *   internal 1:1 marker  -> hidden (the Bismillah is unnumbered)
 *   internal 1:2..1:6    -> the glyph of the marker one lower (①..⑤)
 *   after word 1:7:4     -> NEW marker with the glyph of ⑥ (internal 1:6's own)
 *   internal 1:7 end     -> unchanged (⑦)
 * Returns the line list to draw (a copy; the loaded page data is untouched).
 */
export function fatihaPageLines(lines) {
  const maxPos = (a) => ayahMaxWordPosition && ayahMaxWordPosition["1:" + a];
  const markerGlyph = {};
  for (const line of lines) {
    for (const w of line.words || []) {
      const [s, a, p] = w.loc.split(":");
      if (s === "1" && Number(p) === maxPos(a)) markerGlyph[Number(a)] = w.g;
    }
  }
  if (!markerGlyph[1] || !markerGlyph[6]) return lines; // not the page we expect -- draw it as stored
  return lines.map((line) => {
    if (!line.words) return line;
    const words = [];
    for (const w of line.words) {
      const [s, a, p] = w.loc.split(":");
      const ayah = Number(a);
      const isMarker = s === "1" && Number(p) === maxPos(a);
      if (isMarker && ayah === 1) continue; // Bismillah: no number
      if (isMarker && ayah >= 2 && ayah <= 6) words.push({ ...w, g: markerGlyph[ayah - 1] });
      else words.push(w);
      // Architect review: the split point is read from fatiha-count.js, the
      // one place it is decided, so the page and the Read view cannot drift.
      if (s === "1" && ayah === 7 && Number(p) === FATIHA_SPLIT_AFTER_WORD) {
        words.push({ loc: `1:7:${FATIHA_SPLIT_AFTER_WORD}`, g: markerGlyph[6], fatihaSplitMarker: true });
      }
    }
    return { ...line, words };
  });
}

async function renderPage(pageNum, highlightSet, container, surahArabicName, myGeneration, tajweedOn, onToggleTajweed, fatihaCount = false) {
  const fontInfo = await resolvePageFont(pageNum, tajweedOn);
  // Issue #113 -- a newer renderMushafPages() call started while this page's
  // own font load was in flight. Stop before touching wordRegistry OR the
  // container: both are shared with whichever call superseded this one, and
  // appending here would silently duplicate a page that call already drew.
  if (myGeneration !== renderGeneration) return;
  const pageData = mushafData[String(pageNum)];
  const needsHeaderFont = pageData && pageData.some((l) => l.type === "surah_name");
  const headerFontReady = needsHeaderFont ? await ensureHeaderFont() : false;
  if (myGeneration !== renderGeneration) return; // same reasoning, the second possible await point
  const pageEl = document.createElement("div");
  pageEl.className = "hifz-page";
  // Issue #322 -- the top-bar page reference reads this back to know which
  // real Mushaf page is currently in view (see mushafPageAyahGroups() below).
  pageEl.dataset.mushafPage = String(pageNum);
  pageEl.style.fontFamily = `'${fontInfo.family}'`;
  pageEl.appendChild(buildPageHeader(pageNum, tajweedOn, onToggleTajweed));
  if (fontInfo.message === "tajweed-fallback") {
    const msg = document.createElement("div");
    msg.className = "hifz-line-error";
    msg.textContent = t("Tajweed colours couldn't load for this page — showing the plain page.");
    pageEl.appendChild(msg);
  } else if (fontInfo.message === "plain-failed") {
    const msg = document.createElement("div");
    msg.className = "hifz-line-error";
    msg.textContent = t("Couldn't display this page's letters (its font didn't load).");
    pageEl.appendChild(msg);
  }
  // Shown whenever the reader's own choice is Tajweed and this browser can
  // draw it -- true regardless of whether THIS one page's own font happened
  // to load, because the plain page it fell back to is also a Quran
  // Foundation font since Part A.
  // 28 Sep 2026, Owner: the Quran Foundation credit lives on the About page
  // only (their terms ask for "a reasonably accessible place"); the line
  // that used to sit under every Tajweed page is gone.
  if (!pageData) {
    const err = document.createElement("div");
    err.className = "hifz-line-error";
    err.textContent = t("Couldn't load this page's data.");
    pageEl.appendChild(err);
    container.appendChild(pageEl);
    return;
  }
  const drawLines = fatihaCount && pageNum === 1 ? fatihaPageLines(pageData) : pageData;
  drawLines.forEach((line) => {
    // Issue #348 -- the surah banner is a real <button> now (spec: "The
    // Mushaf's surah banner becomes tappable"), not a plain <div>, so it
    // opens the Unit Card for the whole surah on tap the same way every
    // other real control on this page does. `hifz-line`/`hifz-surah-header`
    // keep every existing style (button-reset rules in quranrevival.html's
    // own CSS strip the default border/background/font so nothing about the
    // ornamental glyph's own layout changes).
    const lineEl = document.createElement(line.type === "surah_name" ? "button" : "div");
    if (line.type === "surah_name") lineEl.type = "button";
    lineEl.className = `hifz-line${line.centered ? " centered" : ""}`;
    if (line.type === "surah_name") {
      lineEl.classList.add("hifz-surah-header");
      lineEl.dataset.unitMarker = buildUnitKey.surah(Number(line.surah));
      const name = (typeof surahArabicName === "function" ? surahArabicName(Number(line.surah)) : null) || `سورة ${line.surah}`;
      lineEl.setAttribute("aria-label", name);
      if (headerFontReady) {
        lineEl.classList.add("glyph-loaded");
        lineEl.style.fontFamily = "'surah-header'";
        lineEl.textContent = SURAH_HEADER_GLYPHS[Number(line.surah) - 1] || name;
      } else {
        lineEl.textContent = name; // real print glyph didn't load -- plain name, still correct and readable
      }
    } else if (line.type === "basmallah") {
      // The dedicated Basmala glyph font isn't wired up here yet (separate
      // QUL resource from the per-page QCF V2 fonts) -- plain Unicode
      // fallback, correct and readable, just not pixel-matched. Same
      // known gap index.html itself still has.
      lineEl.classList.add("hifz-basmallah");
      lineEl.style.fontFamily = "'Amiri','Traditional Arabic',serif";
      lineEl.textContent = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
    } else {
      (line.words || []).forEach((w) => lineEl.appendChild(renderWord(w, highlightSet)));
    }
    pageEl.appendChild(lineEl);
  });
  container.appendChild(pageEl);
  // Only justify once the real glyph font is confirmed loaded -- measuring
  // against a fallback font's metrics would produce the wrong scale.
  if (fontInfo.ready) {
    justifyPageLines(pageEl);
    watchPageWidth(pageEl); // ...and again whenever the page's width becomes known or changes
  }
}

/**
 * Renders every page in `pages` into `container` (cleared first), dimming
 * any word whose ayah key isn't in `highlightSet` (Range: the selected ayahs
 * stay full-strength, the rest of the page dims; Whole Surah: pass every
 * ayah key in the surah, which only ever dims a neighbouring surah's
 * ayahs sharing a boundary page). `surahArabicName(surahNumber)` is an
 * optional lookup for the surah-header fallback label.
 *
 * `opts.tajweedOn` (issue #332 Part B) is the reader's own current
 * preference, read by the caller from prefs.js; `opts.onToggleTajweed(next)`
 * is called when any one page's own toggle is flipped, so the caller can
 * persist the new value and re-render -- this file owns no persistence of
 * its own (I2).
 */
export async function renderMushafPages(container, pages, highlightSet, surahArabicName, opts = {}) {
  const { tajweedOn = false, onToggleTajweed = null, fatihaCount = false } = opts;
  const myGeneration = ++renderGeneration;
  container.innerHTML = "";
  pageObservers.forEach((ro) => ro.disconnect());
  pageObservers = [];
  wordRegistry = new Map();
  activeAyahKey = null;
  if (!pages.length) {
    container.innerHTML = `<p style="color:#888;">${t("Couldn't find a Mushaf page for this selection.")}</p>`;
    return;
  }
  for (const p of pages) {
    // Issue #113 -- do not even START the next page once a newer call has
    // taken over; the per-page check inside renderPage() alone would still
    // be correct, but stopping here too avoids wasted font-load work for a
    // page whose result nobody will ever see.
    if (myGeneration !== renderGeneration) return;
    await renderPage(p, highlightSet, container, surahArabicName, myGeneration, tajweedOn, onToggleTajweed, fatihaCount);
  }
}

/** Highlights whichever ayah is currently sounding during audio/drill playback -- a cheap class toggle on already-rendered spans, never a re-render (renderMushafPages is comparatively expensive: font loads + justification, and would visibly jank if run on every ayah-change tick). No-op if that ayah isn't part of the currently-rendered page(s) (e.g. a drill playing past the edge of a Range). */
export function setActiveAyah(ayahKey) {
  if (activeAyahKey === ayahKey) return;
  if (activeAyahKey && wordRegistry.has(activeAyahKey)) {
    wordRegistry.get(activeAyahKey).forEach((span) => span.classList.remove("playing"));
  }
  activeAyahKey = ayahKey;
  if (!ayahKey || !wordRegistry.has(ayahKey)) return;
  const spans = wordRegistry.get(ayahKey);
  spans.forEach((span) => span.classList.add("playing"));
  // Round 28 -- and BRING IT INTO VIEW. A Mushaf page is taller than a phone,
  // so marking the ayah was only half an answer: the owner asked for the
  // display to follow the recitation. `block: "nearest"` scrolls only when the
  // ayah has actually gone off screen, so a reader whose ayah is already
  // visible is never jolted. offsetParent is the cheap "is this on screen at
  // all" test -- scrolling a hidden panel would silently move the reader's
  // place for when they come back to it.
  //
  // Issue #113 -- `inline: "nearest"` never actually scrolls
  // #pageViewContainer at all: it is `scroll-snap-type: x mandatory` +
  // `direction: rtl`, the exact interaction PR #139's own synthetic-fixture
  // testing measured for this same container's word-card targeting
  // (scrollToAyahIfRendered(), just above -- `inline: "start"`, not
  // "nearest"). Same container, same CSS, so the same fix applies here:
  // `block` stays "nearest" (ordinary vertical scroll, unaffected), only
  // `inline` changes. `behavior: "smooth"` is unchanged -- this is a scroll
  // TARGET fix, not a playback-timing change.
  const first = spans[0];
  if (first && first.offsetParent !== null) {
    first.scrollIntoView({ block: "nearest", inline: "start", behavior: "smooth" });
  }
}

/**
 * Issue #113 -- the word-card arrival's own targeting primitive, and
 * deliberately NOT setActiveAyah() above. That function's "playing" class
 * means "this is what the recitation is sounding right now" (round 28's own
 * comment); reusing it for an ordinary navigation with nothing playing would
 * paint the destination gold for no reason -- the same mistake
 * renderFlowView()'s own "Fix round" comment already records fixing once
 * (markPlayingAyah() made conditional on isPlaying()/isPaused()). Reports
 * whether it actually found something to scroll to -- false when the ayah's
 * spans are not part of whatever is currently rendered (a stale destination,
 * or a page nobody's own render reached), so a caller never claims a landing
 * that did not happen.
 *
 * `inline: "start"`, matching `scrollFlowToCurrentAyah()`'s own non-Mushaf
 * sibling branch EXACTLY -- and NOT `inline: "nearest"` (setActiveAyah()'s
 * own choice, above), which this round's own synthetic-fixture testing found
 * never actually scrolls #pageViewContainer at all. MEASURED, not assumed: a
 * direct `element.scrollIntoView({ inline: "nearest" })` against a real
 * off-screen page in this exact container left `scrollLeft` unchanged (0 ->
 * 0) in a real browser, while `{ inline: "start" }` on the identical element
 * moved it correctly; a plain `container.scrollLeft = <any value>` assignment
 * was ALSO silently ignored, so this is a genuine `scroll-snap-type: x
 * mandatory` + `direction: rtl` interaction, not a mistake in how a value was
 * computed. **This means `setActiveAyah()`'s own "nearest" call, used for the
 * real audio-follow-recitation feature, is a plausible PRE-EXISTING, LIVE
 * defect for the same container whenever the sounding āyah is on a page not
 * already on screen** -- flagged here, NOT fixed: it is a different feature
 * (audio playback, not word-card navigation), untouched by this task's own
 * scope, and deserves its own reproduction rather than a drive-by change
 * riding on this one's own finding. See this round's own report.
 */
export function scrollToAyahIfRendered(ayahKey) {
  if (!ayahKey || !wordRegistry.has(ayahKey)) return false;
  const spans = wordRegistry.get(ayahKey);
  const first = spans[0];
  if (!first || first.offsetParent === null) return false;
  first.scrollIntoView({ inline: "start", behavior: "instant" });
  return true;
}
