// F-047, F-049, F-050, F-060 — the `ayah` renderer (Architecture s5: shared
// by every Approach that studies Quran text; Layout A panels are switched on
// per trackable.panels[], never hardcoded per Approach).
//
// I2: this is a renderer, not a module — it takes data and options in, HTML
// out. It never calls records.js/activity.js itself; the page wiring it up
// does that.

import { t, num } from "./i18n.js";
import { posLabel } from "./labels.js";

/** Escapes then re-expands only the exact tajweed tags quran.com emits — never trusts raw HTML beyond that whitelist. */
export function tajweedRawToSafeHtml(raw) {
  if (!raw) return "";
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;tajweed class=([a-zA-Z_]+)&gt;/g, '<span class="tajweed-$1">')
    .replace(/&lt;\/tajweed&gt;/g, "</span>")
    .replace(/&lt;span class=end&gt;/g, '<span class="tajweed-end">')
    .replace(/&lt;\/span&gt;/g, "</span>");
}

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Panel: the Arabic script itself, plain or tajweed-colour-coded (F-049 toggle). */
export function renderArabicPanel(ayah, { tajweedOn } = {}) {
  const body = tajweedOn && ayah.tajweedText
    ? tajweedRawToSafeHtml(ayah.tajweedText)
    : `${escapeHtml(ayah.uthmaniText)} <span class="ayah-num">﴿${ayah.ayah}﴾</span>`;
  return `<div class="ayah-arabic" dir="rtl" lang="ar">${body}</div>`;
}

/** Panel: translation text, in whichever language(s) are asked for (F-060 — Bangla, alongside English). */
export function renderTranslationPanel(ayah, langs = ["en"]) {
  return langs
    .map((lang) => {
      const text = ayah.translations?.[lang];
      if (!text) return "";
      const cls = lang === "bn" ? "ayah-translation ayah-translation-bn" : "ayah-translation";
      return `<div class="${cls}" ${lang === "bn" ? 'lang="bn"' : ""}>${escapeHtml(text)}</div>`;
    })
    .join("");
}

/**
 * Panel: word-by-word (F-050) — per-word Arabic, transliteration and gloss.
 * "Two panels, not one" (Architecture, carried features): this renders ONLY
 * the word-by-word strip; renderRootDerivativePanel below is the second,
 * separate panel over the same word list.
 */
export function renderWordByWordPanel(ayah, { langs = ["en"] } = {}) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No word-by-word data for this ayah.")}</div>`;
  const chips = ayah.words
    .map((w) => {
      const glosses = langs
        .map((lang) => {
          const text = w.translation?.[lang];
          if (!text) return "";
          const cls = lang === "bn" ? "wbw-gloss wbw-gloss-bn" : "wbw-gloss";
          return `<div class="${cls}" ${lang === "bn" ? 'lang="bn"' : ""}>${escapeHtml(text)}</div>`;
        })
        .join("");
      // Shell round 24 -- the transliteration is a LATIN-script pronunciation
      // aid, so it belongs with the English side and follows the same choice.
      // The owner's report: every control said Bangla, yet the chips still
      // printed `tabaraka`. "বাংলা only" has to mean only Bangla, and a Latin
      // line is unreadable to exactly the person this app's Bangla is for.
      // (A Bangla-script transliteration would be a different thing entirely
      // -- the pulled data has no such field, only the Latin one.)
      const translit = langs.includes("en")
        ? `<div class="wbw-translit">${escapeHtml(w.transliteration)}</div>`
        : "";
      return `<div class="wbw-word" data-position="${w.position}">
        <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
        ${translit}
        ${glosses}
      </div>`;
    })
    .join("");
  return `<div class="wbw-strip">${chips}</div>`;
}

/**
 * Panel: root & derivatives — the second of the two word-by-word panels.
 * Shows each word's root/lemma/part of speech and how many times that root
 * occurs across the whole Quran (rootCount, pre-computed at data-pull time
 * from the Quranic Arabic Corpus so this never needs to load the corpus
 * client-side). Per-word occurrence lists across surahs aren't loaded here
 * (would mean loading more than the one open surah) — see roots-index.json
 * (a bounded, separate static file) for that lookup once built.
 */
export function renderRootDerivativePanel(ayah) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`;
  const rows = ayah.words
    .filter((w) => w.morphology)
    .map(
      (w) => `<div class="root-row" data-position="${w.position}">
        <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
        <div class="root-pos">${escapeHtml(posLabel(w.morphology.pos))}</div>
        ${w.morphology.root ? `<div class="root-root" dir="rtl" lang="ar">${escapeHtml(w.morphology.root)}<span class="root-count">${num(w.morphology.rootCount)}×</span></div>` : ""}
        ${w.morphology.lemma ? `<div class="root-lemma" dir="rtl" lang="ar">${escapeHtml(w.morphology.lemma)}</div>` : ""}
      </div>`
    )
    .join("");
  return `<div class="root-deriv-strip">${rows || `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`}</div>`;
}

/**
 * Assembles whichever panels a trackable's panels[] (Layout A) actually
 * calls for, in a fixed, predictable order -- "adding approach 31 is a row
 * of data, not a build" only holds if this switch never grows per-Approach
 * special cases.
 */
const PANEL_ORDER = ["text", "tajweed", "wordByWord", "notes", "reflection", "writing", "checklist"];
const PANEL_RENDERERS = {
  text: (ayah, opts) => renderArabicPanel(ayah, opts) + renderTranslationPanel(ayah, opts.langs),
  tajweed: () => "", // tajweed is a toggle on the text panel (opts.tajweedOn), not a separate panel
  // wbwLangs, if given, overrides langs for this panel only -- lets the
  // caller offer an explicit word-by-word language choice independent of
  // the ayah translation panel's language (owner request, 5 Aug 2026).
  wordByWord: (ayah, opts) => renderWordByWordPanel(ayah, { langs: opts.wbwLangs ?? opts.langs }) + renderRootDerivativePanel(ayah),
  notes: () => `<textarea class="panel-notes" placeholder="${t("Notes")}"></textarea>`,
  reflection: () => `<textarea class="panel-reflection" placeholder="${t("Reflection")}"></textarea>`,
  writing: () => `<div class="panel-writing"><textarea placeholder="${t("Write it out here")}"></textarea></div>`,
  checklist: () => `<label class="panel-checklist"><input type="checkbox" /> Done</label>`,
  // audio/loop/timer are transport controls wired up by audio-player.js, not
  // static HTML blocks -- the caller mounts them separately, keyed off the
  // same panels[] list.
};

export function renderLayoutA(ayah, panels, opts = {}) {
  return PANEL_ORDER.filter((p) => panels.includes(p))
    .map((p) => PANEL_RENDERERS[p]?.(ayah, opts) ?? "")
    .filter(Boolean)
    .join("\n");
}
