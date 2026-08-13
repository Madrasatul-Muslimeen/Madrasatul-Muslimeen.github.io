// Phase 13 round 1 — Asma ul Husna renderer.
//
// I2: pure renderer, HTML in/out, never touches Firebase -- same contract
// topic-renderer.js/ayah-renderer.js/way-modal.js already hold. A flat grid
// over asma-data.js's 99 fixed entries, not a browsable tree (there's
// nothing to browse into -- see catalogue-data.js's own note on why
// asma_ul_husna is a single anchor subject, not 99 subject nodes).

import { STATUS_COLORS } from "./mastery-wheel.js";
import { statusLabel } from "./unit-keys.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** statusByNumber: Map(number -> statusId|null). */
export function renderAsmaGrid(names, statusByNumber = new Map()) {
  const cards = names.map((n) => {
    const statusId = statusByNumber.get(n.number) ?? null;
    const chip = statusId
      ? `<span class="asma-status-chip" style="background:${STATUS_COLORS[statusId] ?? STATUS_COLORS.not_started}">${statusLabel(statusId)}</span>`
      : `<span class="asma-status-chip asma-status-unclaimed">Not started</span>`;
    return `<button type="button" class="asma-card" data-number="${n.number}">
      <span class="asma-card-number">${n.number}</span>
      <span class="asma-card-arabic">${escapeHtml(n.arabic)}</span>
      <span class="asma-card-translit">${escapeHtml(n.transliteration)}</span>
      <span class="asma-card-meaning">${escapeHtml(n.meaning.en)}</span>
      ${chip}
    </button>`;
  });
  return `<div class="asma-grid">${cards.join("")}</div>`;
}

export function renderAsmaDetail(name, entry) {
  const statusLine = entry
    ? `Status: <strong>${entry.claimedStatus.replace(/_/g, " ")}</strong> &middot; ${entry.confirmState}`
    : "Not started yet.";
  return `<div class="asma-detail">
    <div class="asma-detail-number">${name.number} of 99</div>
    <div class="asma-detail-arabic">${escapeHtml(name.arabic)}</div>
    <h2>${escapeHtml(name.transliteration)}</h2>
    <p class="asma-detail-meaning">${escapeHtml(name.meaning.en)}</p>
    <p>${statusLine}</p>
    <button type="button" id="trackAsmaBtn">Track my progress</button>
  </div>`;
}

/** Screensaver slide -- a poster (asma-posters.js entry) if given, otherwise a text-only fallback built from asma-data.js. Either way, purely decorative -- no claim/confirm affordance here. */
export function renderAsmaScreensaverSlide(poster, fallbackName) {
  if (poster) {
    return `<div class="asma-screensaver-slide">
      <img src="${escapeHtml(poster.url)}" alt="${escapeHtml(poster.label)}" class="asma-screensaver-img" />
      <div class="asma-screensaver-caption">${escapeHtml(poster.label)}</div>
    </div>`;
  }
  return `<div class="asma-screensaver-slide asma-screensaver-textonly">
    <div class="asma-screensaver-arabic">${escapeHtml(fallbackName?.arabic ?? "")}</div>
    <div class="asma-screensaver-caption">${escapeHtml(fallbackName?.transliteration ?? "")} — ${escapeHtml(fallbackName?.meaning?.en ?? "")}</div>
  </div>`;
}
