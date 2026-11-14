// Issue #348, Owner decision 19 -- "End of Ruku' 3. How did it go?" after the
// last āyah of a Ruku'/Page/Hizb/Juz/Surah/Range Study Unit. I2: pure
// renderer, HTML in/out plus callback hooks, same shape as every other
// overlay component in this app. Never appears for a single-āyah unit and
// never blocks reading -- both are the caller's job to decide before it
// ever calls renderEndOfUnitPromptHtml() at all (see quranrevival.html's own
// maybeShowEndOfUnitPrompt()).

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const STAGE_IDS = Object.freeze(["learning", "practising", "achieved"]);
const STAGE_LABELS = Object.freeze({
  learning: "Learning",
  practising: "Practising",
  achieved: "Achieved",
});

/**
 * `unitLabel` -- the unit's own display label ("Ruku' 3"), already resolved
 * by the caller. `saved` -- true once a stage press has landed, so the strip
 * can say "Saved" in words (spec: 'it saves ... and says "Saved" in words')
 * instead of just changing a button's own pressed state.
 */
export function renderEndOfUnitPromptHtml({ unitLabel = "", approachName = "", saved = false } = {}) {
  const buttons = STAGE_IDS
    .map((id) => `<button type="button" class="end-of-unit-btn" data-end-of-unit-stage="${id}">${escapeHtml(t(STAGE_LABELS[id]))}</button>`)
    .join("");
  return `
    <div class="end-of-unit-prompt" data-end-of-unit-prompt role="group" aria-label="${escapeHtml(t("End of {unit}. How did it go?", { unit: unitLabel }))}">
      <span class="end-of-unit-text">${escapeHtml(t("End of {unit}. How did it go?", { unit: unitLabel }))}</span>
      ${approachName ? `<span class="end-of-unit-approach" data-end-of-unit-approach>${escapeHtml(t("Approach: {name}", { name: approachName }))}</span>` : ""}
      <div class="end-of-unit-btns">${buttons}</div>
      <span class="end-of-unit-saved" role="status" aria-live="polite">${saved ? escapeHtml(t("Saved")) : ""}</span>
      <button type="button" class="end-of-unit-close" data-end-of-unit-close aria-label="${escapeHtml(t("Close"))}">×</button>
    </div>`;
}

/** `callbacks`: onStageChoice(statusId), onClose(). */
export function attachEndOfUnitPromptHandlers(container, callbacks = {}) {
  const strip = container.querySelector("[data-end-of-unit-prompt]");
  if (!strip) return;
  strip.querySelectorAll("[data-end-of-unit-stage]").forEach((btn) => {
    btn.addEventListener("click", () => callbacks.onStageChoice?.(btn.dataset.endOfUnitStage));
  });
  strip.querySelector("[data-end-of-unit-close]")?.addEventListener("click", () => callbacks.onClose?.());
}
