// Shell round 13 (13 Aug 2026) — one global Language preference, read by
// every module. LAYOUT-BACKLOG.md item 1.
//
// Before this, `currentLang` lived in app/quranrevival.html and NOWHERE
// else: every other page and module passed the literal "en" into
// langText(), so Bangla worked in the Quran module alone and nothing else
// in the app could show it at all, no matter what the tenant had stored.
// This module is the shared reader those pages were missing.
//
// TWO PREFERENCES, not one — the owner's own call, asked before building.
// `currentLang` used to do two different jobs at once:
//
//   1. Which language user-visible NAMES appear in (people, subjects,
//      Approaches, topics, ladders, tenant banner). That is the I11
//      concern and it is genuinely global — it must apply to every module
//      identically. That is APP LANGUAGE, and it lives under Home →
//      Settings now.
//   2. Whether the Bangla ayah TRANSLATION appears next to the English one
//      in the Quran reading panels. That is a Quran *reading* choice, not
//      an app-language one, so it lives in that module's own Reading view
//      card. That is QURAN TRANSLATION LANGUAGE.
//
// STORAGE: localStorage is the FIRST source, and js/lang-sync.js layers the
// account on top of it (v07.37 — the owner asked for the choice to follow
// them between devices: "setting again is just annoying").
//
// localStorage still comes first, and that is not a leftover — it is what
// keeps the load-speed contract intact. The language has to be known
// BEFORE first paint, or a Bangla reader watches an English page appear
// and then change under them. A network read cannot happen before first
// paint (Architecture Part 8; I9), and localStorage is synchronous, so:
//
//   1. localStorage decides what paints. Instant, no network, no flash.
//   2. After sign-in resolves, the account's stored language is compared
//      against it -- read off the userIndex document every signed-in page
//      ALREADY fetches, so this costs ZERO extra reads and needs no new
//      collection. If they disagree, adoptAppLang() below takes the
//      account's value and the page reloads once. From then on this device
//      agrees and nothing reloads again.
//   3. Changing the language writes both, so the last change made on any
//      device is what every other device picks up next time it loads.
//
// The cost of that shape, worth knowing: on a device that has NEVER opened
// the app, the first paint is in English even for a Bangla reader, until
// the account read comes back and the page reloads. One reload, once per
// device. The alternative -- blocking first paint on a network read -- is
// exactly what the load-speed contract forbids.
//
// I2: this file still never touches Firebase and imports nothing. That is
// load-bearing, not habit: pure renderers (asma-renderer.js, and nav.js
// via APP_LANGS) import getAppLang() from here, and they must never gain a
// Firebase dependency. The Firestore half lives in js/lang-sync.js, which
// hands this module a plain string.

const APP_LANG_KEY = "mm_app_lang";
const QURAN_TRANSLATION_LANG_KEY = "mm_quran_translation_lang";

/** The languages the app itself offers. Shared with js/nav.js so the
 *  Settings control and this module can never drift apart on what "bn"
 *  is called. English first — it is the fallback everywhere (see
 *  langText()) and the only language every name is guaranteed to have. */
export const APP_LANGS = [
  { id: "en", label: "English" },
  { id: "bn", label: "বাংলা (Bangla)" },
];

const APP_LANG_IDS = APP_LANGS.map((l) => l.id);

function readStored(key, allowed, fallback) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // Private browsing / storage disabled. Fall through to the default —
    // the app must never fail to render because a preference is unreadable.
    return fallback;
  }
  return allowed.includes(raw) ? raw : fallback;
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Storage unavailable: the in-memory value below still applies for
    // this page, it simply will not survive a reload. Same tolerated
    // failure mode splash.js already accepts.
    return false;
  }
}

// Read once at module load rather than on every langText() call — these
// getters are called inside render loops (per person, per subject, per
// Approach), and localStorage reads are synchronous.
let cachedAppLang = readStored(APP_LANG_KEY, APP_LANG_IDS, "en");
let cachedQuranTranslationLang = readStored(QURAN_TRANSLATION_LANG_KEY, APP_LANG_IDS, "en");

const appLangListeners = new Set();

/** The app-wide language for user-visible NAMES. Pass this into langText()
 *  instead of a hardcoded "en". Never returns anything but a supported id. */
export function getAppLang() {
  return cachedAppLang;
}

/** Change the app-wide language and tell every subscriber. Unknown values
 *  are ignored rather than stored, so a stale link or a hand-edited
 *  localStorage entry can never wedge the UI into a language with no data. */
export function setAppLang(lang) {
  if (!APP_LANG_IDS.includes(lang) || lang === cachedAppLang) return cachedAppLang;
  cachedAppLang = lang;
  writeStored(APP_LANG_KEY, lang);
  for (const fn of appLangListeners) {
    try {
      fn(cachedAppLang);
    } catch (err) {
      // One page's re-render throwing must not stop the others being told.
      console.warn("app language listener failed", err);
    }
  }
  return cachedAppLang;
}

/**
 * Take the language stored on the ACCOUNT, if it differs from this
 * device's. Returns true when the caller should reload the page.
 *
 * Deliberately does NOT notify listeners: this runs mid-way through a
 * page's own bootstrap, after translateStatic() has already swapped the
 * static markup, so re-rendering only the dynamic half would leave the
 * page half in each language. A reload is the honest fix and is what the
 * caller does with the `true`.
 *
 * Returns false, changing nothing, when localStorage cannot be written --
 * private browsing, storage disabled. Otherwise the next load would read
 * the old value, adopt again, and reload again, forever. Better that the
 * sync quietly does not apply on such a browser than that the app spins.
 *
 * Takes a plain string, never a Firestore snapshot, so this file stays
 * Firebase-free (see the header).
 */
export function adoptAppLang(lang) {
  if (!APP_LANG_IDS.includes(lang) || lang === cachedAppLang) return false;
  if (!writeStored(APP_LANG_KEY, lang)) return false;
  cachedAppLang = lang;
  return true;
}

/** Subscribe to app-language changes. Returns an unsubscribe function.
 *  Most pages do not need this — they pass reloadOnAppLangChange as the
 *  mount handler instead and simply reload. quranrevival.html re-renders
 *  in place because it already had exactly that code for its own picker. */
export function onAppLangChange(fn) {
  appLangListeners.add(fn);
  return () => appLangListeners.delete(fn);
}

// Another tab changing the preference updates this tab's cached value, so
// its NEXT render picks the new language up. Deliberately does NOT notify
// listeners: a background tab reloading itself (or re-rendering) under
// someone who is mid-way through typing into a form on it is a worse
// surprise than that tab showing the old language until it is next used.
try {
  window.addEventListener("storage", (e) => {
    if (e.key === APP_LANG_KEY) cachedAppLang = readStored(APP_LANG_KEY, APP_LANG_IDS, "en");
    if (e.key === QURAN_TRANSLATION_LANG_KEY) {
      cachedQuranTranslationLang = readStored(QURAN_TRANSLATION_LANG_KEY, APP_LANG_IDS, "en");
    }
    // Same treatment for round 18's set, so two open tabs cannot disagree
    // about which translations are on.
    if (e.key === QURAN_TRANSLATION_SET_KEY) cachedQuranTranslationSet = readTranslationSet();
  });
} catch {
  /* no window (shouldn't happen in this app) — the cached values still work */
}

/** Quran reading only: "en" shows the English ayah translation alone,
 *  "bn" shows Bangla ALONGSIDE English (additive, never replacing — the
 *  F-060 design note in ayah-renderer.js). Separate from getAppLang() on
 *  the owner's own call; see the header comment. */
export function getQuranTranslationLang() {
  return cachedQuranTranslationLang;
}

export function setQuranTranslationLang(lang) {
  if (!APP_LANG_IDS.includes(lang) || lang === cachedQuranTranslationLang) return cachedQuranTranslationLang;
  cachedQuranTranslationLang = lang;
  writeStored(QURAN_TRANSLATION_LANG_KEY, lang);
  return cachedQuranTranslationLang;
}

// ---------------------------------------------------------------------------
// Shell round 18 — which ayah translations are shown, as a SET.
//
// The pair above can only say "English" or "English + Bangla", because it was
// built when the choice was one <select>. The owner asked for the translations
// to be tickable independently, which needs three more answers than that one
// can give: Bangla on its own, and neither (Arabic alone).
//
// Additive, and deliberately so: the old getter/setter still exist, still
// mean what they meant, and still read and write their own key — anything
// calling them (the Bangla-reciter rule, any later module) keeps working. The
// set is stored under its own key and, on a device that has never seen it,
// starts from whatever the old preference already said. Nothing to migrate.
// ---------------------------------------------------------------------------
const QURAN_TRANSLATION_SET_KEY = "mm_quran_translation_set";

function readTranslationSet() {
  try {
    const raw = localStorage.getItem(QURAN_TRANSLATION_SET_KEY);
    if (raw === null) return cachedQuranTranslationLang === "bn" ? ["en", "bn"] : ["en"];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["en"];
    // Filtered against the known ids, so a hand-edited or stale entry can
    // never put an unsupported language into a render loop.
    return parsed.filter((l) => APP_LANG_IDS.includes(l));
  } catch {
    return ["en"];
  }
}

let cachedQuranTranslationSet = readTranslationSet();

/** Which ayah translations to show, in display order — [] means Arabic alone. */
export function getQuranTranslationLangs() {
  return cachedQuranTranslationSet.slice();
}

/** Replaces the set. Unknown ids are dropped rather than stored. Keeps the
 *  older single-value preference in step, so whichever one a caller reads
 *  they get the same answer: it is "bn" whenever Bangla is among them. */
export function setQuranTranslationLangs(langs) {
  // Order is the CALLER's, not this file's: which translation appears above
  // which is a real preference the owner has already asked about, and keeping
  // the given order means that round is a UI job rather than a data one.
  const clean = (Array.isArray(langs) ? langs : []).filter((id, i, a) => APP_LANG_IDS.includes(id) && a.indexOf(id) === i);
  cachedQuranTranslationSet = clean;
  writeStored(QURAN_TRANSLATION_SET_KEY, JSON.stringify(clean));
  setQuranTranslationLang(clean.includes("bn") ? "bn" : "en");
  return getQuranTranslationLangs();
}

/** The default reaction to the language changing: reload, so every name on
 *  the page comes back in the new language. Blunt on purpose — this app is
 *  multi-page, so a reload is the same thing that happens on any
 *  navigation, and it is the only way to be certain a page with a dozen
 *  independent render functions is fully re-rendered. Pages that can
 *  re-render in place cheaply pass their own handler instead. */
export function reloadOnAppLangChange() {
  location.reload();
}

/**
 * Wire the Language control that js/nav.js renders inside Home → Settings.
 * Call this right after `navHomeExtra.innerHTML = renderHomeExtras(roles)`,
 * passing that same container.
 *
 * nav.js stays a PURE renderer (roles in, HTML out — I2, shell round 3): it
 * emits the <select> markup and nothing else, never reads a preference and
 * never attaches a handler. Setting the current value and wiring the change
 * is this function's job, which is why it is here and not there.
 *
 * Safe to call repeatedly — renderHomeExtras() replaces the container's
 * innerHTML each time, so the previous <select> (and its listener) is
 * discarded with it rather than accumulating.
 */
export function mountAppLangControl(container, onChange = reloadOnAppLangChange) {
  if (!container) return null;
  const select = container.querySelector("#navAppLangSelect");
  if (!select) return null;
  select.value = getAppLang();
  select.addEventListener("change", () => {
    const previous = getAppLang();
    const next = setAppLang(select.value);
    // Guard against the listener firing for a no-op (or a rejected value):
    // reloading the page when nothing actually changed is pure annoyance.
    if (next !== previous) onChange(next);
    else select.value = next;
  });
  return select;
}

// ---------------------------------------------------------------------------
// Shell round 21 — what Full screen actually hides.
//
// Round 17 shipped Full screen as one boolean: it hid the app's own three
// strips (title/tagline/banner, nav, dock) and left the reading screen's own
// two bars alone. The owner's answer when asked whether those two should go
// as well was neither yes nor no: "enable the options to hide everything,
// show banner, show top and bottom menu, show only top menu, only bottom
// menu, show the next buttons, play button, enable all choices to show
// individually or together."
//
// So this is a SET, exactly like the translations above, and for the same
// reason — a single flag cannot say "keep the bottom menu but hide the top
// one". Five things can be hidden; each is independent.
//
// localStorage, no new startup read, no collection, no firestore.rules
// change — the same shape round 18's translation set took. The default is
// all five, which is the owner's own original ask ("the entire mobile
// screen edge to edge") and what round 17's single flag would have meant.
// ---------------------------------------------------------------------------
const FULLSCREEN_HIDES_KEY = "mm_reading_fullscreen_hides";

/** The five strips Full screen can take away, in the order they appear down
 *  the screen. `banner` covers the app title, the tagline strip and the
 *  tenant's own banner — they are one visual block, and the owner named them
 *  as one ("show banner"). */
export const FULLSCREEN_HIDEABLE = ["banner", "topnav", "readbar", "transport", "dock"];

function readFullScreenHides() {
  try {
    const raw = localStorage.getItem(FULLSCREEN_HIDES_KEY);
    if (raw === null) return FULLSCREEN_HIDEABLE.slice();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FULLSCREEN_HIDEABLE.slice();
    // Filtered against the known ids so a hand-edited or stale entry can
    // never put an unknown class name onto <body>.
    return parsed.filter((id) => FULLSCREEN_HIDEABLE.includes(id));
  } catch {
    return FULLSCREEN_HIDEABLE.slice();
  }
}

let cachedFullScreenHides = readFullScreenHides();

/** Which strips Full screen hides. An empty set is legal and means Full
 *  screen changes nothing — the reading screen says so rather than leaving a
 *  gesture that silently does nothing. */
export function getFullScreenHides() {
  return cachedFullScreenHides.slice();
}

export function setFullScreenHides(ids) {
  const clean = (Array.isArray(ids) ? ids : []).filter((id, i, a) => FULLSCREEN_HIDEABLE.includes(id) && a.indexOf(id) === i);
  cachedFullScreenHides = clean;
  writeStored(FULLSCREEN_HIDES_KEY, JSON.stringify(clean));
  return getFullScreenHides();
}

// ---------------------------------------------------------------------------
// Shell round 28 — the reading moves SIDEWAYS, page by page.
//
// The owner's own instruction ("let the page move from left to right") and
// their answer when asked what should move: the whole reading, not only the
// Mushaf. So a Mushaf page, an ayah of a Range or a whole surah's ayah each
// become a page you move across rather than a strip you scroll down.
//
// Default ON, because that is what was asked; the tick in Reading view is the
// way back for anyone who prefers scrolling. localStorage, the same additive
// shape rounds 18/21/23 used: no new startup read, no collection, no
// firestore.rules change (I9 untouched).
// ---------------------------------------------------------------------------
const SIDEWAYS_READING_KEY = "mm_reading_sideways";

function readSidewaysReading() {
  try {
    const raw = localStorage.getItem(SIDEWAYS_READING_KEY);
    if (raw === null) return true; // never set: the owner's own default
    return raw === "1";
  } catch {
    return true;
  }
}

let cachedSidewaysReading = readSidewaysReading();

/** True when the reading is paged sideways rather than scrolled down. */
export function getSidewaysReading() {
  return cachedSidewaysReading;
}

export function setSidewaysReading(on) {
  cachedSidewaysReading = !!on;
  writeStored(SIDEWAYS_READING_KEY, cachedSidewaysReading ? "1" : "0");
  return cachedSidewaysReading;
}

// ---------------------------------------------------------------------------
// Shell round 23 — which Arabic typeface the Qur'an is set in.
//
// `.ayah-arabic` asked for `'Traditional Arabic', 'Amiri', serif` and NEITHER
// was bundled, so the answer was "whatever this phone happens to have" — which
// is exactly why the owner's Arabic looked different from the app they
// compared it against. Three faces are bundled now (all OFL, all subset to the
// text we actually ship — see tools/fonts/build-fonts.mjs), and the old
// behaviour is kept as an explicit choice rather than removed (I4): someone
// who prefers their own device's face can still have it.
//
// localStorage, like every other reading preference since round 18: no new
// startup read, no collection, no firestore.rules change.
// ---------------------------------------------------------------------------
const QURAN_FONT_KEY = "mm_quran_font";

/** id -> the CSS font-family it resolves to. `device` deliberately keeps the
 *  pre-round-23 stack, so choosing it is genuinely "how it was before". */
export const QURAN_FONTS = [
  { id: "scheherazade", stack: "'QR Scheherazade', serif" },
  { id: "notonaskh", stack: "'QR Noto Naskh', serif" },
  { id: "amiriquran", stack: "'QR Amiri Quran', serif" },
  { id: "device", stack: "'Traditional Arabic', 'Amiri', serif" },
];
const QURAN_FONT_IDS = QURAN_FONTS.map((f) => f.id);
const DEFAULT_QURAN_FONT = "scheherazade";

let cachedQuranFont = readStored(QURAN_FONT_KEY, QURAN_FONT_IDS, DEFAULT_QURAN_FONT);

export function getQuranFont() {
  return cachedQuranFont;
}

/** The CSS value to put on the Arabic. Always resolves to something real, so
 *  a hand-edited or stale stored value can never leave the Qur'an unstyled. */
export function quranFontStack(id = cachedQuranFont) {
  return (QURAN_FONTS.find((f) => f.id === id) ?? QURAN_FONTS[0]).stack;
}

export function setQuranFont(id) {
  if (!QURAN_FONT_IDS.includes(id)) return cachedQuranFont;
  cachedQuranFont = id;
  writeStored(QURAN_FONT_KEY, id);
  return cachedQuranFont;
}

// ---------------------------------------------------------------------------
// Fixes round 2 (24 Aug 2026) — how the nav bar's own Bookmark dropdown opens.
//
// The owner's own ask, restated after the first attempt read it as per-folder
// collapsing: "enable the OPTION for [the] Bookmark menu opening the bookmark
// list as expanded/collapsed" — a setting that decides whether every group in
// that dropdown is already open when it appears (nothing to click through
// when you only have a few bookmarks) or starts shut (so a long list stays
// scannable). Not a per-folder toggle, which is what shipped in v07.67 and is
// kept alongside it: the option decides the STARTING state, tapping a group
// still opens or shuts that one.
//
// GROUP BY is the second half of the same round: bookmarks can now be tagged
// with a person (a student, a family member), so the dropdown can group by
// that instead of by folder.
//
// Both are localStorage, the same additive shape every reading preference
// since round 18 has used: no new startup read, no collection, no
// firestore.rules change (I9 untouched). Deliberately NOT synced to the
// account the way the app language is (v07.37) — these are small per-device
// display conveniences, not something worth a write on every change.
// ---------------------------------------------------------------------------
const BOOKMARK_MENU_EXPANDED_KEY = "mm_bookmark_menu_expanded";
const BOOKMARK_MENU_GROUP_BY_KEY = "mm_bookmark_menu_group_by";

// The |groupby suffix is i18n.js's own context mechanism (see fallbackOf()):
// English falls back to "Folder"/"Person"/"Module" unchanged, while Bangla
// can say "by folder"/"by person"/"by module" here without changing the
// popover's own "Folder" FIELD label, which is a different phrase in the
// same app.
//
// Bookmark-issues round adds "module" -- everything from one module,
// wherever it's filed, ignoring the folder tree entirely (bookmarks.js's
// own groupBookmarksByModule()).
export const BOOKMARK_GROUP_BYS = [
  { id: "folder", label: "Folder|groupby" },
  { id: "person", label: "Person|groupby" },
  { id: "module", label: "Module|groupby" },
];
const BOOKMARK_GROUP_BY_IDS = BOOKMARK_GROUP_BYS.map((g) => g.id);

function readBookmarkMenuExpanded() {
  try {
    const raw = localStorage.getItem(BOOKMARK_MENU_EXPANDED_KEY);
    if (raw === null) return false; // never set: today's behaviour, groups start shut
    return raw === "1";
  } catch {
    return false;
  }
}

let cachedBookmarkMenuExpanded = readBookmarkMenuExpanded();

/** True when every group in the Bookmark dropdown should already be open when it appears. */
export function getBookmarkMenuExpanded() {
  return cachedBookmarkMenuExpanded;
}

export function setBookmarkMenuExpanded(on) {
  cachedBookmarkMenuExpanded = !!on;
  writeStored(BOOKMARK_MENU_EXPANDED_KEY, cachedBookmarkMenuExpanded ? "1" : "0");
  return cachedBookmarkMenuExpanded;
}

let cachedBookmarkGroupBy = readStored(BOOKMARK_MENU_GROUP_BY_KEY, BOOKMARK_GROUP_BY_IDS, "folder");

/** "folder" (the default, and what v07.66 built), "person" (bookmark-issues round's own person tag), or "module". */
export function getBookmarkMenuGroupBy() {
  return cachedBookmarkGroupBy;
}

export function setBookmarkMenuGroupBy(id) {
  if (!BOOKMARK_GROUP_BY_IDS.includes(id)) return cachedBookmarkGroupBy;
  cachedBookmarkGroupBy = id;
  writeStored(BOOKMARK_MENU_GROUP_BY_KEY, id);
  return cachedBookmarkGroupBy;
}
