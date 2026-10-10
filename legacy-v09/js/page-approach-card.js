// Issue #325 -- "This page" card: opened from the Mushaf top-bar reference
// (#mushafPageRef), claims the Owner's own decision 3 unit -- the printed
// page AS ONE UNIT (buildUnitKey.page) -- and never any āyah on it (decision
// 4: "Keep Ayah has It's separate approach because we want to encourage for
// Ayah study"; docs/governance/2026-09-27-owner-decisions.md).
//
// I2: pure renderer, HTML in/out plus callback hooks, exactly like
// ayah-action-sheet.js. Deliberately reuses THAT file's own Approach +
// four-stage picker (renderApproachStagePickerHtml/wireApproachStagePicker)
// rather than building a second one -- one claim mechanism, two entry
// points, never two ways to claim an Approach that could drift apart.
//
// Deliberately NOT a modal shell of its own: quranrevival.html mounts this
// into the SAME overlay/mount element the Ayah Card uses
// (ayahActionSheetOverlayEl/ayahActionSheetMountEl), so ".ayah-sheet"'s own
// CSS -- the phone bottom-sheet/900px popover split -- applies unchanged,
// and the two cards are mutually exclusive by construction (one mount, one
// thing in it at a time).

import { t } from "./i18n.js";
import { renderApproachStagePickerHtml, wireApproachStagePicker } from "./ayah-action-sheet.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * `pageLabel` -- "Page {page}" already resolved by the caller (translated,
 * reader's own digits). `ref` -- the surah/āyāt text the top-bar reference
 * itself already shows (hifz-renderer.js's mushafPageAyahGroups() +
 * quranrevival.html's own formatMushafPageRef(), e.g.
 * "Aal-i-Imraan · 53–57") -- shown so the reader can see what they are
 * about to claim without leaving the card.
 */
export function renderPageApproachCardHtml({
  pageLabel = "", ref = "",
  approachOptionsHtml = "", selectedApproachId = null, selectedApproachStatusId = "not_started", approachSummary = null, canConfirm = false,
} = {}) {
  return `
    <div class="ayah-sheet page-approach-card" data-page-approach-card role="dialog" aria-modal="true" aria-label="${escapeHtml(pageLabel)}">
      <div class="ayah-sheet-handle" aria-hidden="true"></div>
      <div class="ayah-sheet-header">
        <span class="ayah-sheet-ref">${escapeHtml(pageLabel)}${ref ? ` · ${escapeHtml(ref)}` : ""}</span>
        <button type="button" class="ayah-sheet-close" data-page-approach-close aria-label="${escapeHtml(t("Close"))}">×</button>
      </div>
      <div class="ayah-sheet-body">
        ${renderApproachStagePickerHtml({ approachOptionsHtml, selectedApproachId, selectedApproachStatusId, selectId: "pageApproachSelect", approachSummary, canConfirm })}
      </div>
    </div>`;
}

/** `callbacks`: onClose(), onApproachPicked(approachId), onStageChoice(approachId, statusId) -- the caller's onStageChoice is the only thing that writes, exactly the same split as attachAyahActionSheetHandlers(). */
export function attachPageApproachCardHandlers(container, callbacks = {}) {
  const card = container.querySelector("[data-page-approach-card]");
  if (!card) return;
  card.querySelector("[data-page-approach-close]")?.addEventListener("click", () => callbacks.onClose?.());
  wireApproachStagePicker(card, {
    onApproachPicked: callbacks.onApproachPicked,
    onStageChoice: callbacks.onStageChoice,
  });
}
