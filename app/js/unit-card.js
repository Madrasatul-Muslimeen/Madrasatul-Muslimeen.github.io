// Issue #348 -- the Unit Card: acting on and tracking a Ruku', Page, Hizb,
// Juz, Surah or Range from the Read view, the Owner's own question ("we can
// act on an Ayah. But how about other units?") answered with decisions 18
// and 19 (docs/governance/2026-09-27-owner-decisions.md).
//
// I2: pure renderer, HTML in/out plus callback hooks -- exactly the shape
// ayah-action-sheet.js and page-approach-card.js already use, and this file
// reuses both of theirs rather than inventing a second claim mechanism or a
// second "strip of squares": renderApproachStagePickerHtml/
// wireApproachStagePicker (the four-stage picker) and approachStatusRowHtml
// (the 30-dot Approach strip) come straight from ayah-action-sheet.js;
// renderUnitLadderHtml/wireUnitLadder come from unit-ladder.js, the same
// ladder the Ayah Card itself now carries at its own top.
//
// Mounts into the SAME overlay/mount the Ayah Card and the "This page" card
// already share (ayahActionSheetOverlayEl/ayahActionSheetMountEl in
// quranrevival.html) -- one shared ".ayah-sheet" shell, three renderers,
// mutually exclusive by construction.
//
// This file never computes a ladder, a status count or an "Inside" list
// itself -- quranrevival.html already holds the surah/ayah/juz/hizb/ruku/
// page boundary data and the in-memory records chunk, so it builds every
// one of those as plain data and hands it in here, the same split
// approachStatusesForAyah()/currentUnitInfo() already keep from the render
// functions that consume them.

import { t, num } from "./i18n.js";
import {
  renderApproachStagePickerHtml, wireApproachStagePicker,
  approachStatusRowHtml, actionItemHtml,
} from "./ayah-action-sheet.js";
import { renderUnitLadderHtml, wireUnitLadder } from "./unit-ladder.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * One tappable "Inside" chip -- a Ruku's āyāt, a Surah's Ruku's, a Juz/Hizb's
 * Surah pieces. Coloured by the chosen Approach's own status on that piece
 * (the caller passes the same STATUS_COLORS value the wheel/Ayah Card
 * already use), never a second colour scheme.
 */
function insideChipHtml(item) {
  return `<button type="button" class="unit-card-inside-chip" style="background:${item.color}" data-unit-card-inside="${escapeHtml(item.unitKey ?? "")}" data-unit-card-jump="${escapeHtml(item.jump ?? "")}">${escapeHtml(item.label)}</button>`;
}

function insideSectionHtml(title, items) {
  if (!items?.length) return "";
  return `
        <div class="unit-card-inside" data-unit-card-inside-block>
          <h4 class="ayah-status-heading">${escapeHtml(title)}</h4>
          <div class="unit-card-inside-row">${items.map(insideChipHtml).join("")}</div>
        </div>`;
}

/**
 * `markAsRead`: `{ enabled, reason }` -- enabled=true for Surah/Range
 * (ADR-008's own EVIDENCE_UNIT_TYPES), false with a words-said reason for
 * Ruku'/Page ("coming") and Hizb/Juz ("later"), per the issue's own wording.
 * `aria-disabled`, never the native `disabled` attribute -- this app's own
 * standing rule (CLAUDE.md): a truly disabled control cannot explain why.
 */
function markAsReadItemHtml(markAsRead) {
  const { enabled = false, reason = "" } = markAsRead ?? {};
  return actionItemHtml({
    attr: `data-unit-card-mark-read aria-disabled="${enabled ? "false" : "true"}"`,
    icon: "✓",
    label: t("Mark as read"),
    disabled: !enabled,
    hint: enabled ? "" : reason,
  });
}

function bookmarkItemHtml(isBookmarked) {
  return actionItemHtml({
    attr: "data-unit-card-bookmark",
    icon: isBookmarked ? "★" : "🔖",
    label: isBookmarked ? t("Remove bookmark") : t("Bookmark this unit"),
  });
}

function noteItemHtml() {
  return actionItemHtml({ attr: "data-unit-card-note", icon: "📝", label: t("Note on this unit") });
}

function playItemHtml() {
  return actionItemHtml({ attr: "data-unit-card-play", icon: "▶", label: t("Play this unit") });
}

/**
 * `countsForEachAyahYes`: `true`/`false`/`null` (no Approach chosen yet) --
 * read straight from approach-coverage.js's own countsForEachAyah(), said in
 * the reader's own words directly under the stage buttons (spec: "one line
 * says whether this Approach's rule is Yes ... or No").
 */
function countsForEachAyahLineHtml(countsForEachAyahYes) {
  if (countsForEachAyahYes == null) return "";
  const text = countsForEachAyahYes
    ? t("This Approach's claims count for each āyah inside.")
    : t("This Approach's claims count for this unit as a whole.");
  return `<p class="unit-card-counts-line">${escapeHtml(text)}</p>`;
}

/**
 * `achievedLine`/`wbwLine`: already-composed strings ("Āyāt Achieved or
 * Mastered: 4 of 7", "Known 12 of 20 words", or an explanatory sentence when
 * the figure can't be shown here) -- built by the caller from
 * effectiveStatus()/the loaded surah's own word data, never recomputed here.
 */
export function renderUnitCardHtml({
  unitType, unitKey, unitLabel = "", ref = "",
  ladderHtml = "",
  approachOptionsHtml = "", selectedApproachId = null, selectedApproachStatusId = "not_started",
  countsForEachAyahYes = null,
  isBookmarked = false, bookmarkAvailable = true,
  markAsRead = { enabled: false, reason: "" },
  approachStatuses = [],
  achievedLine = "", wbwLine = "",
  insideTitle = "", insideItems = [],
} = {}) {
  const actionsHtml = [
    noteItemHtml(),
    bookmarkAvailable ? bookmarkItemHtml(isBookmarked) : "",
    playItemHtml(),
    markAsReadItemHtml(markAsRead),
  ].join("");
  return `
    <div class="ayah-sheet unit-card" data-unit-card data-unit-type="${escapeHtml(unitType)}" data-unit-key="${escapeHtml(unitKey)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(unitLabel || ref)}">
      <div class="ayah-sheet-handle" aria-hidden="true"></div>
      ${ladderHtml}
      <div class="ayah-sheet-header">
        <span class="ayah-sheet-ref">${escapeHtml(unitLabel)}${ref ? ` · ${escapeHtml(ref)}` : ""}</span>
        <button type="button" class="ayah-sheet-close" data-unit-card-close aria-label="${escapeHtml(t("Close"))}">×</button>
      </div>
      <div class="ayah-sheet-body">
        ${renderApproachStagePickerHtml({ approachOptionsHtml, selectedApproachId, selectedApproachStatusId, selectId: "unitCardApproachSelect" })}
        ${countsForEachAyahLineHtml(countsForEachAyahYes)}
        ${actionsHtml}
      </div>
      <div class="ayah-sheet-status" data-unit-card-status>
        <h3 class="ayah-sheet-section-title">${escapeHtml(t("Status of this unit"))}</h3>
        <div class="ayah-status-block">
          <h4 class="ayah-status-heading">${escapeHtml(t("Approach"))}</h4>
          ${approachStatusRowHtml(approachStatuses)}
        </div>
        ${achievedLine ? `<div class="ayah-status-block"><p class="unit-card-count-line">${escapeHtml(achievedLine)}</p></div>` : ""}
        <div class="ayah-status-block">
          <h4 class="ayah-status-heading">${escapeHtml(t("Word by Word"))}</h4>
          <p class="unit-card-count-line">${escapeHtml(wbwLine)}</p>
        </div>
      </div>
      ${insideSectionHtml(insideTitle, insideItems)}
    </div>`;
}

/**
 * `callbacks`: onClose(), onRung(unitKey) (ladder), onApproachPicked(approachId),
 * onStageChoice(approachId, statusId), onNote(unitKey), onBookmark(unitKey),
 * onPlay(unitKey), onMarkAsRead(unitKey), onInsideJump(item).
 * Same fire-closes-first shape as attachAyahActionSheetHandlers() for every
 * action except the stage picker and the ladder, which redraw the card in
 * place instead of closing it (issue #325's own precedent).
 */
export function attachUnitCardHandlers(container, callbacks = {}) {
  const card = container.querySelector("[data-unit-card]");
  if (!card) return;
  const unitKey = card.dataset.unitKey;
  const fire = (fn) => { callbacks.onClose?.(); fn?.(unitKey); };
  const fireUnlessDisabled = (btn, fn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-disabled") === "true") return;
      fire(fn);
    });
  };
  card.querySelector("[data-unit-card-close]")?.addEventListener("click", () => callbacks.onClose?.());
  wireUnitLadder(card, (rungUnitKey) => callbacks.onRung?.(rungUnitKey));
  wireApproachStagePicker(card, {
    onApproachPicked: (approachId) => callbacks.onApproachPicked?.(approachId),
    onStageChoice: (approachId, statusId) => callbacks.onStageChoice?.(approachId, statusId),
  });
  card.querySelector("[data-unit-card-note]")?.addEventListener("click", () => fire(callbacks.onNote));
  card.querySelector("[data-unit-card-bookmark]")?.addEventListener("click", () => fire(callbacks.onBookmark));
  card.querySelector("[data-unit-card-play]")?.addEventListener("click", () => fire(callbacks.onPlay));
  fireUnlessDisabled(card.querySelector("[data-unit-card-mark-read]"), callbacks.onMarkAsRead);
  card.querySelectorAll("[data-unit-card-inside-block] .unit-card-inside-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      callbacks.onClose?.();
      callbacks.onInsideJump?.({ unitKey: chip.dataset.unitCardInside || null, jump: chip.dataset.unitCardJump || null });
    });
  });
}
