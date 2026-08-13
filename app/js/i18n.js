// Full app translation — the machinery (Phase 1 of 6, 13 Aug 2026).
//
// v07.30 gave the app a global language preference, but it only ever
// changed TENANT-AUTHORED NAMES (people, subjects, Approaches) — the data
// that is language-keyed per I11. The app's own words stayed English, so
// Bangla meant Bangla names inside an English frame.
//
// The owner's requirement, in their words: "A person only reads Bangla,
// nothing in English. He must find things in Bangla otherwise he won't use
// the app." So every menu, button, heading and choice has to turn over too.
// This file is what makes that possible.
//
// ---------------------------------------------------------------------
// THE KEY IS THE ENGLISH TEXT ITSELF
// ---------------------------------------------------------------------
// t("Sign out") looks up "Sign out" in the Bangla catalogue. There are no
// invented key names like "nav.signOut". Three reasons this shape was
// chosen deliberately:
//
//   1. A MISSING TRANSLATION CAN NEVER SHOW AS A BROKEN KEY. If a string
//      has no Bangla yet, t() returns the English, which is readable. The
//      usual i18n failure — a screen showing "nav.signOut" — is impossible
//      by construction. With ~940 strings to translate across six phases,
//      the app is guaranteed to be half-translated for a while, so the
//      half-translated state has to look acceptable, not broken.
//   2. The code stays readable to someone who cannot read code. `t("Sign
//      out")` still says what it does; `t("nav.signOut")` does not.
//   3. Static markup needs no editing at all — see translateStatic().
//
// The cost: one English word needing two different Bangla words in two
// places. Handle those with a context suffix — t("Track|verb") — and put
// "Track|verb" in the catalogue. translateStatic() understands the suffix
// too (data-i18n-ctx). Rare enough that it has not been needed yet.
//
// I2: no Firebase, no DOM ownership beyond the one explicit call.

import { getAppLang } from "./prefs.js";
import { BN } from "./i18n/bn.js";
import { SURAH_NAMES_BN } from "./i18n/surah-names-bn.js";

const CATALOGUES = { bn: BN };

/** Split "Track|verb" into its lookup key and the plain English fallback. */
function fallbackOf(key) {
  const bar = key.indexOf("|");
  return bar === -1 ? key : key.slice(0, bar);
}

/**
 * Translate one string. Returns the English unchanged when the app is in
 * English, when the language has no catalogue, or when this particular
 * string has not been translated yet.
 *
 * vars fills {name}-style placeholders AFTER translation, so a translator
 * can move them around inside the sentence — Bangla word order is not
 * English word order, and a sentence that cannot be reordered cannot be
 * translated properly.
 *   t("Signed in as {email}", { email: "..." })
 */
export function t(key, vars) {
  const lang = getAppLang();
  const table = CATALOGUES[lang];
  let out = (table && table[key]) || fallbackOf(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

/** True when the current language has a catalogue at all. Lets a caller
 *  skip work that only matters in a translated UI. */
export function isTranslated() {
  return Boolean(CATALOGUES[getAppLang()]);
}

// ---------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------
// Owner's call, 13 Aug 2026: Bengali numerals when the app is in Bangla —
// ayah ২৫৫, dates and scores in Bengali digits too. Applied through num()
// at the point a number is rendered, never by rewriting the DOM, so an id,
// a version string or a URL can never be mangled into Bengali digits.

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Format a number (or a string containing digits) for the current
 *  language. English is returned untouched. */
export function num(value) {
  if (value == null) return "";
  const s = String(value);
  if (getAppLang() !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/**
 * The other direction: read Bengali digits back as ordinary numbers.
 *
 * Needed because a Bangla-only reader typing into the "Go to" box on a
 * Bangla keyboard will type ২:২৫৫, not 2:255 -- and a box that silently
 * refuses what its own interface taught them to type is exactly the kind of
 * dead end that makes someone stop using an app. Always safe to call: a
 * string with no Bengali digits comes back unchanged.
 */
export function parseNum(value) {
  if (value == null) return "";
  return String(value).replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
}

// ---------------------------------------------------------------------
// Surah names
// ---------------------------------------------------------------------

/**
 * A surah's name in the reader's language. Falls back to the English name
 * the Quran data already carries, so an unlisted number can never render
 * blank.
 *
 * Deliberately NOT prefixed with the number -- callers format that
 * themselves, because the picker wants "২. আল-বাকারা" while a heading wants
 * the bare name.
 */
export function surahName(surahNumber, englishName) {
  if (getAppLang() === "bn") return SURAH_NAMES_BN[surahNumber] ?? englishName ?? "";
  return englishName ?? "";
}

// ---------------------------------------------------------------------
// Static markup
// ---------------------------------------------------------------------

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);
// Arabic and Bangla both have their own blocks; a node already in a
// non-Latin script is content, not chrome, and must never be touched.
const HAS_LATIN_WORD = /[A-Za-z]{2,}/;
const NON_LATIN_SCRIPT = /[؀-ۿঀ-৿]/;

const TRANSLATABLE_ATTRS = ["placeholder", "title", "aria-label", "alt"];

/**
 * Translate the English already sitting in the page's own markup, in
 * place. This is what makes the round affordable: ~500 headings, labels,
 * buttons and table headers across 19 pages get translated WITHOUT editing
 * a single line of their HTML, because the English text is the key.
 *
 * Call it once, as early in a page's script as possible — the markup it
 * translates is present before any script runs (the v07.08 anti-flash
 * shape), so translating it early means a Bangla reader never sees an
 * English frame appear and then change under them.
 *
 * What it deliberately does NOT do:
 *   - Anything inside [data-i18n-skip]. Put that on a container whose text
 *     is tenant-authored or scripture, never on chrome.
 *   - Anything JS renders LATER. Dynamic output is translated by its own
 *     t() calls at render time; a load-time DOM walk cannot see it, and
 *     re-walking after every render would be both slow and unsafe.
 *   - Any node that already contains Arabic or Bangla.
 */
// The English a node started with, remembered the first time it is
// translated. Without this, translateStatic() would be a ONE-WAY door: once
// a heading held Bangla, there would be nothing left to look up to get the
// English back, so switching the language back to English in place could
// never work. Keyed weakly, so nothing is retained once a node is gone.
const ORIGINAL_TEXT = new WeakMap();
const ORIGINAL_ATTRS = new WeakMap();
let documentTitleOriginal = "";

export function translateStatic(root = document.body) {
  if (!root) return 0;
  let changed = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-i18n-skip]")) return NodeFilter.FILTER_REJECT;
      // A node already carrying its remembered English is eligible again —
      // that is how switching the language a second time works.
      const text = ORIGINAL_TEXT.get(node) ?? node.nodeValue;
      if (!HAS_LATIN_WORD.test(text) || NON_LATIN_SCRIPT.test(text)) {
        return ORIGINAL_TEXT.has(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const jobs = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) jobs.push(n);
  for (const node of jobs) {
    // Always translate FROM the remembered English, never from whatever is
    // on screen now — otherwise a second language change would be trying to
    // look up Bangla in a Bangla catalogue.
    const raw = ORIGINAL_TEXT.get(node) ?? node.nodeValue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const ctx = node.parentElement?.getAttribute("data-i18n-ctx");
    const translated = t(ctx ? `${trimmed}|${ctx}` : trimmed);
    // Preserve the original surrounding whitespace exactly — markup is
    // indented, and collapsing that would change how the page lays out.
    const next = translated === trimmed ? raw : raw.replace(trimmed, translated);
    if (next === node.nodeValue) continue;
    if (!ORIGINAL_TEXT.has(node)) ORIGINAL_TEXT.set(node, raw);
    node.nodeValue = next;
    changed++;
  }

  for (const attr of TRANSLATABLE_ATTRS) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      if (el.closest("[data-i18n-skip]")) continue;
      const remembered = ORIGINAL_ATTRS.get(el)?.[attr];
      const value = (remembered ?? el.getAttribute(attr)).trim();
      if (!HAS_LATIN_WORD.test(value) || NON_LATIN_SCRIPT.test(value)) continue;
      const translated = t(value);
      if (translated === el.getAttribute(attr)) continue;
      if (!ORIGINAL_ATTRS.has(el)) ORIGINAL_ATTRS.set(el, {});
      if (ORIGINAL_ATTRS.get(el)[attr] === undefined) ORIGINAL_ATTRS.get(el)[attr] = value;
      el.setAttribute(attr, translated);
      changed++;
    }
  }

  if (!documentTitleOriginal) documentTitleOriginal = document.title;
  const title = documentTitleOriginal?.trim();
  if (title && HAS_LATIN_WORD.test(title)) document.title = t(title);

  // Lets CSS pick a Bengali-capable font stack for the whole document, and
  // tells the browser (and any screen reader) what language it is reading.
  document.documentElement.lang = getAppLang();
  return changed;
}
