// Multi-student round -- "Assign to" started life inside way-modal.js as a
// Claim-only control (v07.77), but the SAME question -- "several family
// members/students at once, or just whoever's selected" -- now also applies
// to bookmarking (v07.79's own follow-up round). Rather than a second copy
// living in bookmark-popover.js, the two generic pieces (the roster checkbox
// list itself, and reading which boxes are ticked) moved here; way-modal.js
// re-exports both unchanged, so every existing Claim call site (quranrevival.html,
// topic-study.js, routine-study.js, asma-study.js) needed zero changes.
//
// I2: pure UI-building logic. No DOM events wired here beyond what the
// caller's own markup already carries via data attributes -- opening/closing
// the popover and updating a trigger's own label stay the caller's job
// (way-modal.js's wireAssignDropdown() is Claim-specific in its own label
// text, so it stayed there rather than moving here with the rest).

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * "Assign to" dropdown -- lets one action (a Claim, a bookmark) be recorded
 * for several family members/students at once instead of only whoever the
 * Person picker currently points at. Pure (I2): the caller supplies the
 * roster (already scoped by scopedRoster()/assignableRoster(), the same
 * "who can I record for" rule the Person picker itself already uses) and
 * which id starts ticked -- this file never decides who's allowed to see
 * whom. Returns "" when there's nothing to add to (a lone student sees only
 * themselves), the same "don't offer a control with one option" rule
 * Listening settings/the Translator picker already follow elsewhere.
 */
export function renderAssignDropdown(roster, selectedPersonId) {
  if (!roster || roster.length < 2) return "";
  const rows = roster
    .map((p) => {
      const checked = p.id === selectedPersonId ? "checked" : "";
      const tag = p.isSelf ? `<span class="who-tag">${t("you")}</span>` : "";
      return `<label class="assign-row"><input type="checkbox" value="${p.id}" data-name="${escapeHtml(p.name)}" ${checked}><span class="who-name">${escapeHtml(p.name)}</span>${tag}</label>`;
    })
    .join("");
  return `<div class="assign-trigger-wrap">
    <button type="button" class="assign-trigger" data-assign-trigger aria-haspopup="true" aria-expanded="false">
      <span aria-hidden="true">&#128101;</span><span data-assign-trigger-label>1</span><span class="caret" aria-hidden="true">&#9662;</span>
    </button>
    <div class="assign-popover" data-assign-popover>
      <p class="assign-popover-label">${t("Assign to")}</p>
      <p class="assign-hint">${t("Everyone you can already record for.")}</p>
      <div class="assign-list" data-assign-list>${rows}</div>
    </div>
  </div>`;
}

/**
 * Reads which people are ticked in an "Assign to" dropdown inside rootEl.
 * Falls back to a single { id: fallbackPersonId } when there's no dropdown
 * at all (single-person roster) or nothing's ticked, so every caller can
 * loop over this unconditionally instead of branching on whether the
 * dropdown was even rendered.
 */
export function checkedAssignees(rootEl, fallbackPersonId) {
  const list = rootEl.querySelector("[data-assign-list]");
  if (!list) return [{ id: fallbackPersonId, name: "" }];
  const boxes = [...list.querySelectorAll("input:checked")];
  return boxes.length
    ? boxes.map((c) => ({ id: c.value, name: c.dataset.name ?? c.value }))
    : [{ id: fallbackPersonId, name: "" }];
}
