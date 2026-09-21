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
// Data source: the same 604-page layout + word-glyph JSON (mushaf-madani-v2.json,
// sourced from QUL — qul.tarteel.ai) and per-page QCF V2 font files already
// hosted, live, no auth needed, in the madrasatul-muslimeen.github.io repo —
// the same site the beta build itself is mirrored to. Nothing new to host,
// nothing to sign up for.
//
// Fetched lazily, once per session — never bundled, per the load-speed
// contract (Architecture s8: "Screensaver, About, resources: on first use").

import { t } from "./i18n.js";

const MUSHAF_JSON_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/mushaf-madani-v2.json";
const MUSHAF_FONT_BASE = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/fonts/";
const SURAH_HEADER_FONT_URL = "https://raw.githubusercontent.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/main/mushaf/QCF_SurahHeader_COLOR-Regular.woff2";

// One ligature character per surah (1-114) — QUL's own "Surah header font"
// documentation table — each renders the full ornamental print banner
// (border + surah name) in the 'surah-header' COLOR font. Same list
// index.html already uses in production.
const SURAH_HEADER_GLYPHS = ["ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];

let mushafDataPromise = null;
let mushafData = null;
let ayahPageIndex = null; // "surah:ayah" -> sorted array of page numbers

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
  Object.keys(mushafData).forEach((pageNum) => {
    mushafData[pageNum].forEach((line) => {
      if (line.type !== "ayah" || !line.words) return;
      line.words.forEach((w) => {
        const loc = w.loc.split(":"); // "surah:ayah:word"
        const key = `${loc[0]}:${loc[1]}`;
        if (!ayahPageIndex[key]) ayahPageIndex[key] = new Set();
        ayahPageIndex[key].add(Number(pageNum));
      });
    });
  });
  Object.keys(ayahPageIndex).forEach((k) => {
    ayahPageIndex[k] = Array.from(ayahPageIndex[k]).sort((a, b) => a - b);
  });
}

/** Real Mushaf page numbers spanned by a list of "surah:ayah" keys (a small number of ayahs split across a page boundary contribute more than one page). Call after ensureMushafData() resolves. */
export function getMushafPagesForKeys(ayahKeys) {
  const pageSet = new Set();
  ayahKeys.forEach((key) => (ayahPageIndex[key] || []).forEach((p) => pageSet.add(p)));
  return Array.from(pageSet).sort((a, b) => a - b);
}

const fontPromises = new Map();
let headerFontPromise = null;
// One observer per rendered page, disconnected when the pages are replaced --
// otherwise every re-render would leave its own watcher running for ever.
let pageObservers = [];

function ensurePageFont(pageNum) {
  if (fontPromises.has(pageNum)) return fontPromises.get(pageNum);
  const family = `hifz-p${pageNum}`;
  const url = `${MUSHAF_FONT_BASE}p${pageNum}.woff2`;
  let promise;
  if (typeof FontFace === "function" && document.fonts) {
    const face = new FontFace(family, `url('${url}')`);
    promise = face.load().then((loaded) => {
      document.fonts.add(loaded);
      return true;
    }).catch((err) => {
      console.warn(`Hifz font load failed for page ${pageNum}:`, err);
      return false;
    });
  } else {
    // Older-browser fallback without the FontFace API: inject @font-face
    // directly. Can't confirm load completion here, so line-justification
    // (which needs accurate glyph widths) is skipped for this browser.
    const styleEl = document.createElement("style");
    styleEl.textContent = `@font-face{font-family:'${family}';src:url('${url}') format('woff2');font-display:swap;}`;
    document.head.appendChild(styleEl);
    promise = Promise.resolve(false);
  }
  fontPromises.set(pageNum, promise);
  return promise;
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
  const loc = w.loc.split(":");
  const ayahKey = `${loc[0]}:${loc[1]}`;
  if (highlightSet && !highlightSet.has(ayahKey)) span.classList.add("dim");
  span.textContent = w.g;
  if (!wordRegistry.has(ayahKey)) wordRegistry.set(ayahKey, []);
  wordRegistry.get(ayahKey).push(span);
  return span;
}

async function renderPage(pageNum, highlightSet, container, surahArabicName, myGeneration) {
  const fontReady = await ensurePageFont(pageNum);
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
  pageEl.style.fontFamily = `'hifz-p${pageNum}'`;
  const numEl = document.createElement("div");
  numEl.className = "hifz-page-num";
  numEl.textContent = `Page ${pageNum}`;
  pageEl.appendChild(numEl);
  if (!pageData) {
    const err = document.createElement("div");
    err.className = "hifz-line-error";
    err.textContent = t("Couldn't load this page's data.");
    pageEl.appendChild(err);
    container.appendChild(pageEl);
    return;
  }
  pageData.forEach((line) => {
    const lineEl = document.createElement("div");
    lineEl.className = `hifz-line${line.centered ? " centered" : ""}`;
    if (line.type === "surah_name") {
      lineEl.classList.add("hifz-surah-header");
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
  if (fontReady) {
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
 */
export async function renderMushafPages(container, pages, highlightSet, surahArabicName) {
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
    await renderPage(p, highlightSet, container, surahArabicName, myGeneration);
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
