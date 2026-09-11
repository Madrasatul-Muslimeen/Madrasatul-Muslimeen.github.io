// MAP Phase 2 — persistent Quran Word Card, pure state + renderer slice.
// DOM event wiring and data fetching belong to the page/controller task.

import { quranWordOccurrenceId, wordIdentityLayers } from "./quran-word-identity.js";

export const WORD_CARD_LEVELS = Object.freeze(["wbw", "basic", "depth"]);

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function levelPanel(level, word, layers, context) {
  if (level === "wbw") {
    return `<div role="tabpanel" data-word-card-panel="wbw">
      <p class="word-card-meaning word-card-meaning-en" lang="en">${escapeHtml(word.translation?.en || "Meaning unavailable")}</p>
      <p class="word-card-meaning word-card-meaning-bn" lang="bn">${escapeHtml(word.translation?.bn || "অর্থ পাওয়া যায়নি")}</p>
      ${word.transliteration ? `<p class="word-card-transliteration">${escapeHtml(word.transliteration)}</p>` : ""}
    </div>`;
  }
  if (level === "basic") {
    return `<div role="tabpanel" data-word-card-panel="basic">
      <dl><dt>Lemma</dt><dd>${escapeHtml(layers.lemma || "Unknown")}</dd><dt>Root</dt><dd>${escapeHtml(layers.root || "Unknown")}</dd><dt>Part of speech</dt><dd>${escapeHtml(word.morphology?.pos || "Unknown")}</dd></dl>
      <p>${layers.root ? `${Number(context.rootOccurrenceCount || 0)} root-linked occurrences` : "Root unavailable in the approved dataset"}</p>
    </div>`;
  }
  const dictionaryLink = context.dictionaryUrl
    ? `<a href="${escapeHtml(context.dictionaryUrl)}" target="_blank" rel="noopener noreferrer">Open dictionary source</a>`
    : `<span>Dictionary source unavailable</span>`;
  return `<div role="tabpanel" data-word-card-panel="depth">
    <p>${escapeHtml(context.semanticRange || "Semantic range not yet supplied")}</p>${dictionaryLink}
  </div>`;
}

/** Renders one card without fetching, writing, or inferring missing linguistic data. */
export function renderQuranWordCard({ state, chapter, ayah, word, context = {}, labels = {} } = {}) {
  if (!state?.open || !word) return "";
  const occurrenceId = quranWordOccurrenceId(chapter.surahNumber, ayah.ayah, word.position);
  if (occurrenceId !== state.occurrenceId) throw new Error("Word Card data does not match its persistent occurrence identity.");
  const layers = wordIdentityLayers({ surah: chapter.surahNumber, ayah: ayah.ayah, position: word.position, arabic: word.arabic, morphology: word.morphology });
  const text = { previous: "Previous word", next: "Next word", close: "Close word card", wbw: "WbW", basic: "Basic Arabic", depth: "Arabic in Depth", ...labels };
  return `<section class="quran-word-card" role="region" aria-label="Quran word card" data-occurrence-id="${escapeHtml(occurrenceId)}">
    <header><button type="button" data-word-card-move="previous" aria-label="${escapeHtml(text.previous)}"${context.hasPrevious ? "" : " disabled"}>‹</button>
      <div><div class="word-card-arabic" dir="rtl" lang="ar">${escapeHtml(layers.surfaceToken)}</div><div class="word-card-reference">${chapter.surahNumber}:${ayah.ayah}:${word.position}</div></div>
      <button type="button" data-word-card-move="next" aria-label="${escapeHtml(text.next)}"${context.hasNext ? "" : " disabled"}>›</button>
      <button type="button" data-word-card-close aria-label="${escapeHtml(text.close)}">×</button></header>
    <div role="tablist" aria-label="Arabic learning level">${tabButton("wbw", state.level === "wbw", text.wbw)}${tabButton("basic", state.level === "basic", text.basic)}${tabButton("depth", state.level === "depth", text.depth)}</div>
    ${levelPanel(state.level, word, layers, context)}
  </section>`;
}

