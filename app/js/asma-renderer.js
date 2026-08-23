// Phase 13 round 1 — Asma ul Husna renderer.
//
// I2: pure renderer, HTML in/out, never touches Firebase -- same contract
// topic-renderer.js/ayah-renderer.js/way-modal.js already hold. A flat grid
// over asma-data.js's 99 fixed entries, not a browsable tree (there's
// nothing to browse into -- see catalogue-data.js's own note on why
// asma_ul_husna is a single anchor subject, not 99 subject nodes).

// Full app translation, phase 6 (14 Aug 2026). Three things this file used
// to read straight off `.en` -- the meaning on a card, the meaning on the
// detail panel, and the meaning in the screensaver's text-only slide -- now
// go through langText(), which is what makes the 99 Bangla meanings in
// bn.js actually reach the screen. The NAME itself goes through asmaName(),
// because a Latin transliteration is unreadable to a Bangla-only reader and
// was simply dead space on a card that only has three lines.

import { STATUS_COLORS } from "./mastery-wheel.js";
import { statusLabel } from "./unit-keys.js";
import { t, num, asmaName } from "./i18n.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";
import { confirmStateLabel } from "./labels.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** statusByNumber: Map(number -> statusId|null). */
export function renderAsmaGrid(names, statusByNumber = new Map()) {
  const cards = names.map((n) => {
    const statusId = statusByNumber.get(n.number) ?? null;
    const chip = statusId
      ? `<span class="asma-status-chip" style="background:${STATUS_COLORS[statusId] ?? STATUS_COLORS.not_started}">${statusLabel(statusId)}</span>`
      : `<span class="asma-status-chip asma-status-unclaimed">${statusLabel("not_started")}</span>`;
    // data-number stays the bare number -- openNameDetail() reads it back
    // with Number(). Only the DRAWN number goes through num().
    return `<button type="button" class="asma-card" data-number="${n.number}">
      <span class="asma-card-number">${num(n.number)}</span>
      <span class="asma-card-arabic">${escapeHtml(n.arabic)}</span>
      <span class="asma-card-translit">${escapeHtml(asmaName(n.number, n.transliteration))}</span>
      <span class="asma-card-meaning">${escapeHtml(langText(n.meaning, getAppLang()))}</span>
      ${chip}
    </button>`;
  });
  return `<div class="asma-grid">${cards.join("")}</div>`;
}

export function renderAsmaDetail(name, entry, { isBookmarked = false } = {}) {
  // Was a raw claimedStatus with its underscores swapped for spaces, and a
  // raw confirmState id -- both meaningless in either language. They go
  // through the shared label helpers now, and the whole line is ONE
  // translatable sentence rather than an English word concatenated onto
  // two values, because the order reverses in Bangla.
  const statusLine = entry
    ? t("Status: {status} · {confirm}", {
        status: `<strong>${escapeHtml(statusLabel(entry.claimedStatus))}</strong>`,
        confirm: escapeHtml(confirmStateLabel(entry.confirmState)),
      })
    : t("Not started yet.");
  return `<div class="asma-detail">
    <div class="asma-detail-number">${t("{n} of {total}", { n: num(name.number), total: num(99) })}</div>
    <div class="asma-detail-arabic">${escapeHtml(name.arabic)}</div>
    <h2>${escapeHtml(asmaName(name.number, name.transliteration))} <button type="button" id="bookmarkAsmaBtn" class="topic-bookmark-btn${isBookmarked ? " active" : ""}" title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this")}">${isBookmarked ? "★" : "☆"}</button></h2>
    <p class="asma-detail-meaning">${escapeHtml(langText(name.meaning, getAppLang()))}</p>
    <p>${statusLine}</p>
    <button type="button" id="trackAsmaBtn">${t("Track my progress")}</button>
  </div>`;
}

/** Screensaver slide -- a poster (asma-posters.js entry) if given, otherwise a text-only fallback built from asma-data.js. Either way, purely decorative -- no claim/confirm affordance here. */
export function renderAsmaScreensaverSlide(poster, fallbackName) {
  if (poster) {
    // The poster's own label is the catalogue key -- its transliteration
    // convention differs from asma-data.js's, so these are translated as
    // their own set of captions rather than matched to a Name by number.
    // The alt text is translated too: a screen reader in Bangla should not
    // read out a Latin transliteration.
    const caption = t(poster.label);
    return `<div class="asma-screensaver-slide">
      <img src="${escapeHtml(poster.url)}" alt="${escapeHtml(caption)}" class="asma-screensaver-img" />
      <div class="asma-screensaver-caption">${escapeHtml(caption)}</div>
    </div>`;
  }
  const fallbackLabel = fallbackName
    ? asmaName(fallbackName.number, fallbackName.transliteration)
    : "";
  return `<div class="asma-screensaver-slide asma-screensaver-textonly">
    <div class="asma-screensaver-arabic">${escapeHtml(fallbackName?.arabic ?? "")}</div>
    <div class="asma-screensaver-caption">${escapeHtml(fallbackLabel)} — ${escapeHtml(langText(fallbackName?.meaning, getAppLang()))}</div>
  </div>`;
}
