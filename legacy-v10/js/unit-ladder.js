// Issue #348 -- the ladder shared by the Ayah Card and the new Unit Card:
// Āyah → Ruku' → Page → Hizb → Juz → Surah. One small component (I2), built
// once and reused by both renderAyahActionSheetHtml() (ayah-action-sheet.js)
// and renderUnitCardHtml() (unit-card.js) so the rungs always look and
// behave identically wherever the ladder appears.
//
// Pure renderer: this file never reads a unit key's own containing units --
// the caller (quranrevival.html, which already holds the surah/ayah/juz/
// hizb/ruku/page boundary data) builds the `rungs` array. Tapping the āyah
// rung is the one case this file does not special-case: the caller's own
// onRung callback decides that a "ayah:..." unitKey means "open the Ayah
// Card instead of the Unit Card" -- this component only reports which rung
// was pressed.

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * `rungs`: [{ unitType, unitKey, label, active }], in ladder order
 * (Āyah → Ruku' → Page → Hizb → Juz → Surah). A unit type this āyah has no
 * containing instance of (e.g. no Hifz Approach set up is not a reason to
 * omit a rung -- every unit type always has a ruku/page/hizb/juz/surah) is
 * never omitted; the caller passes exactly six rungs whenever the card
 * opened from an āyah, or fewer when it opened directly on a wider unit
 * that has no āyah of its own to rest the ladder on (a Range has no single
 * containing Ruku'/Page/Hizb/Juz, so its own caller passes just the rungs
 * that make sense, per the issue's own scope).
 *
 * The row scrolls sideways inside itself (CSS: overflow-x auto, one line)
 * rather than wrapping, so it never costs the card a second line on a
 * narrow phone -- the same choice this app's own Approach-select row makes.
 */
export function renderUnitLadderHtml(rungs = []) {
  if (!rungs.length) return "";
  const items = rungs
    .map((r) => `<button type="button" class="unit-ladder-rung${r.active ? " is-active" : ""}" data-unit-ladder-rung="${escapeHtml(r.unitKey)}" aria-current="${r.active ? "true" : "false"}">${escapeHtml(r.label)}</button>`)
    .join("");
  return `<div class="unit-ladder" role="group" aria-label="${escapeHtml(t("Jump to a containing unit"))}">${items}</div>`;
}

/** `onRung(unitKey)` -- fired for whichever rung was tapped, including the
    currently-active one (re-tapping the unit you're already on is harmless
    and simpler than disabling it, which would also remove its own 40px tap
    target from the row for no real benefit). */
export function wireUnitLadder(rootEl, onRung) {
  const ladder = rootEl.querySelector(".unit-ladder");
  if (!ladder) return;
  ladder.querySelectorAll("[data-unit-ladder-rung]").forEach((btn) => {
    btn.addEventListener("click", () => onRung?.(btn.dataset.unitLadderRung));
  });
}
