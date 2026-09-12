// MAP Phase 2 — persistent Quran Word Card, pure state + renderer slice.
// DOM event wiring and data fetching belong to the page/controller task.

import { quranWordOccurrenceId, wordIdentityLayers } from "./quran-word-identity.js";

export const WORD_CARD_LEVELS = Object.freeze(["wbw", "basic", "depth"]);

/**
 * Every user-visible string the card can print (I11). A caller passes its
 * reader's own language for each; these English values are only the fallback.
 * {count} and {error} are substituted, so a translation may place them
 * wherever that language needs them.
 */
export const WORD_CARD_DEFAULT_LABELS = Object.freeze({
  cardRegion: "Quran word card",
  tablist: "Arabic learning level",
  previous: "Previous word",
  next: "Next word",
  close: "Close word card",
  wbw: "WbW",
  basic: "Basic Arabic",
  depth: "Arabic in Depth",
  meaningUnavailableEn: "Meaning unavailable",
  meaningUnavailableBn: "অর্থ পাওয়া যায়নি",
  lemma: "Lemma",
  root: "Root",
  partOfSpeech: "Part of speech",
  unknown: "Unknown",
  rootOccurrences: "{count} root-linked occurrences",
  lemmaOccurrences: "{count} lemma-linked occurrences",
  rootUnavailable: "Root unavailable in the approved dataset",
  lemmaUnavailable: "Lemma unavailable in the approved dataset",
  loadingOccurrences: "Loading occurrences…",
  occurrencesUnavailable: "Occurrence list unavailable: {error}",
  semanticRangeMissing: "Semantic range not yet supplied",
  openDictionary: "Open dictionary source",
  dictionaryUnavailable: "Dictionary source unavailable",
});

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeDictionaryUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

function validLevel(level) {
  if (!WORD_CARD_LEVELS.includes(level)) throw new TypeError(`Unknown word-card level: ${level}.`);
  return level;
}

export function createWordCardState(level = "wbw") {
  return Object.freeze({ open: false, occurrenceId: null, level: validLevel(level) });
}

export function openWordCard(state, occurrenceId) {
  if (!occurrenceId) throw new TypeError("occurrenceId is required.");
  return Object.freeze({ ...state, open: true, occurrenceId });
}

export function closeWordCard(state) {
  return Object.freeze({ ...state, open: false });
}

export function selectWordCardLevel(state, level) {
  return Object.freeze({ ...state, level: validLevel(level) });
}

export function moveWordCard(state, orderedOccurrenceIds, direction) {
  if (!Array.isArray(orderedOccurrenceIds) || !orderedOccurrenceIds.length) return state;
  const at = orderedOccurrenceIds.indexOf(state.occurrenceId);
  if (at < 0) return state;
  const delta = direction === "previous" ? -1 : direction === "next" ? 1 : 0;
  if (!delta) throw new TypeError('direction must be "previous" or "next".');
  const target = orderedOccurrenceIds[at + delta];
  return target ? Object.freeze({ ...state, occurrenceId: target, open: true }) : state;
}

function tabButton(level, selected, label) {
  return `<button type="button" role="tab" data-word-card-level="${level}" aria-selected="${selected}" tabindex="${selected ? "0" : "-1"}">${escapeHtml(label)}</button>`;
}

function levelPanel(level, word, layers, context, text, formatNumber) {
  if (level === "wbw") {
    // Deliberately bilingual: WbW shows the English and Bangla gloss together
    // whatever the reader's language, so each fallback stays in its own
    // language rather than following the interface setting.
    return `<div role="tabpanel" data-word-card-panel="wbw">
      <p class="word-card-meaning word-card-meaning-en" lang="en">${escapeHtml(word.translation?.en || text.meaningUnavailableEn)}</p>
      <p class="word-card-meaning word-card-meaning-bn" lang="bn">${escapeHtml(word.translation?.bn || text.meaningUnavailableBn)}</p>
      ${word.transliteration ? `<p class="word-card-transliteration">${escapeHtml(word.transliteration)}</p>` : ""}
    </div>`;
  }
  if (level === "basic") {
    const refs = (items) => (items?.length ? `<ol class="word-card-occurrences">${items.slice(0, 20).map((r) => `<li>${r.surah}:${r.ayah}:${r.position}</li>`).join("")}</ol>` : "");
    const count = (template, n) => escapeHtml(String(template).replace("{count}", formatNumber(n)));
    return `<div role="tabpanel" data-word-card-panel="basic">
      <dl><dt>${escapeHtml(text.lemma)}</dt><dd>${escapeHtml(layers.lemma || text.unknown)}</dd><dt>${escapeHtml(text.root)}</dt><dd>${escapeHtml(layers.root || text.unknown)}</dd><dt>${escapeHtml(text.partOfSpeech)}</dt><dd>${escapeHtml(word.morphology?.pos || text.unknown)}</dd></dl>
      <p>${layers.root ? count(text.rootOccurrences, Number(context.rootOccurrenceCount ?? word.morphology?.rootCount ?? 0)) : escapeHtml(text.rootUnavailable)}</p>${refs(context.rootOccurrences)}
      <p>${layers.lemma ? count(text.lemmaOccurrences, Number(context.lemmaOccurrenceCount ?? context.lemmaOccurrences?.length ?? 0)) : escapeHtml(text.lemmaUnavailable)}</p>${refs(context.lemmaOccurrences)}
      ${context.occurrencesLoading ? `<p>${escapeHtml(text.loadingOccurrences)}</p>` : ""}
      ${context.occurrencesError ? `<p role="status">${escapeHtml(String(text.occurrencesUnavailable).replace("{error}", context.occurrencesError))}</p>` : ""}
    </div>`;
  }
  const dictionaryUrl = safeDictionaryUrl(context.dictionaryUrl);
  const dictionaryLink = dictionaryUrl
    ? `<a href="${escapeHtml(dictionaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text.openDictionary)}</a>`
    : `<span>${escapeHtml(text.dictionaryUnavailable)}</span>`;
  return `<div role="tabpanel" data-word-card-panel="depth">
    <p>${escapeHtml(context.semanticRange || text.semanticRangeMissing)}</p>${dictionaryLink}
  </div>`;
}

/**
 * Renders one card without fetching, writing, or inferring missing linguistic
 * data.
 *
 * `formatNumber` renders a COUNT in the reader's own digits -- Bengali digits
 * on a Bangla page, following this app's existing rule. It is deliberately not
 * applied to the surah:ayah:position references below, which are identifiers
 * and stay in plain digits, nor to anything else.
 */
export function renderQuranWordCard({ state, chapter, ayah, word, context = {}, labels = {}, formatNumber = String } = {}) {
  if (!state?.open || !word) return "";
  const occurrenceId = quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position);
  if (occurrenceId !== state.occurrenceId) throw new Error("Word Card data does not match its persistent occurrence identity.");
  const layers = wordIdentityLayers({ surah: chapter.surahNumber, ayah: ayah.ayah, position: word.position, arabic: word.arabic, morphology: word.morphology });
  // I11: every user-visible string here is overridable, so the page can hand
  // the card its reader's own language. The English values are the fallback
  // for a caller that supplies nothing, never the only thing a reader can get.
  const text = { ...WORD_CARD_DEFAULT_LABELS, ...labels };
  return `<section class="quran-word-card" role="region" aria-label="${escapeHtml(text.cardRegion)}" data-occurrence-id="${escapeHtml(occurrenceId)}">
    <header><button type="button" data-word-card-move="previous" aria-label="${escapeHtml(text.previous)}"${context.hasPrevious ? "" : " disabled"}>‹</button>
      <div><div class="word-card-arabic" dir="rtl" lang="ar">${escapeHtml(layers.surfaceToken)}</div><div class="word-card-reference">${chapter.surahNumber}:${ayah.ayah}:${word.position}</div></div>
      <button type="button" data-word-card-move="next" aria-label="${escapeHtml(text.next)}"${context.hasNext ? "" : " disabled"}>›</button>
      <button type="button" data-word-card-close aria-label="${escapeHtml(text.close)}">×</button></header>
    <div role="tablist" aria-label="${escapeHtml(text.tablist)}">${tabButton("wbw", state.level === "wbw", text.wbw)}${tabButton("basic", state.level === "basic", text.basic)}${tabButton("depth", state.level === "depth", text.depth)}</div>
    ${levelPanel(state.level, word, layers, context, text, formatNumber)}
  </section>`;
}
