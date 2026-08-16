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
