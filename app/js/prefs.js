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
// STORAGE: localStorage, per browser (owner's call — "localStorage now,
// Firestore sync layered on later"). This costs NOTHING on the startup
// path, which matters: a Firestore-backed preference would add a network
// read before first paint, and the load-speed contract (Architecture
// Part 8) says nothing joins the startup path without being flagged first
// (I9). It also needs no new collection and no firestore.rules change.
// Precedent: js/splash.js already keeps its own preferences exactly this
// way. The trade the owner accepted is that the choice does not follow the
// account across devices — set it on the phone and the tablet still shows
// English until it is set there too.
//
// The Firestore sync is meant to be layered on later WITHOUT redoing this
// work, so the shape below is deliberate: every caller goes through
// getAppLang() and never touches localStorage itself, and the cached value
// is updated through one setter that notifies subscribers. A later round
// adds a second source behind that same getter (read the stored doc after
// sign-in, call setAppLang() if it differs) and no call site changes.
//
// I2: a shared helper, not a module — never touches Firebase, no imports.

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
