// F-047 — The Way modal: Track / Guide / Breakdown / Coverage tabs, per
// Approach (Architecture s5 + "existing features that must survive").
//
// I2: pure renderer. Track's claim button and Coverage's ayah clicks are
// exposed as callbacks the caller wires to records.js/mastery-wheel.js --
// this file never imports records.js itself.

import { langText } from "./lang.js";
import { summarizeStatuses, STATUSES, statusLabel } from "./unit-keys.js";
import { t, num } from "./i18n.js";
import { STATUS_COLORS } from "./mastery-wheel.js";
// Multi-student round -- renderAssignDropdown()/checkedAssignees() moved to
// their own file so bookmark-popover.js (a Claim-free, Firebase-free popover
// component) could reuse them too, without pulling in this file's own
// mastery-wheel.js/unit-keys.js weight. Re-exported here unchanged, so every
// existing Claim call site (quranrevival.html, topic-study.js,
// routine-study.js, asma-study.js) needed no changes at all.
export { renderAssignDropdown, checkedAssignees } from "./assign-picker.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Guide tab -- three fields per approach (Architecture s5): What / How / Measure. Measure already carries a generic fallback baked in at catalogue-seed time (Phase 2), so this never has to invent one. */
export function renderGuideTab(trackable, lang = "en") {
  const guide = trackable.guide ?? {};
  return `<div class="way-guide">
    <h4>${t("What")}</h4><p>${escapeHtml(langText(guide.what, lang))}</p>
    <h4>${t("How")}</h4><p>${escapeHtml(langText(guide.how, lang))}</p>
    <h4>${t("How to measure your progress")}</h4><p>${escapeHtml(langText(guide.measure, lang))}</p>
  </div>`;
}

/**
 * Wires the trigger's live label + the Claim button's "Claim for N" text as
 * checkboxes are ticked. A no-op when renderAssignDropdown() returned ""
 * (single-person roster) -- claimBtn then behaves exactly as it always has.
 * Opening/closing the popover itself is handled by the one delegated
 * document listener below, not here, so this never double-registers on a
 * re-render (same reasoning nav.js's own outside-click-closes uses).
 */
export function wireAssignDropdown(rootEl, claimBtn) {
  const list = rootEl.querySelector("[data-assign-list]");
  if (!list) return;
  const label = rootEl.querySelector("[data-assign-trigger-label]");
  const baseLabel = claimBtn.textContent;
  function update() {
    const checked = [...list.querySelectorAll("input:checked")];
    const n = checked.length;
    if (label) label.textContent = n === 1 ? (checked[0].dataset.name ?? "1") : num(n);
    claimBtn.textContent = n <= 1 ? baseLabel : t("Claim for {n}", { n: num(n) });
    claimBtn.disabled = n === 0;
  }
  list.addEventListener("change", update);
  update();
}

/**
 * One result line for a Claim that may have gone to several people at once.
 * outcomes: [{ name, ok, needsConfirmation, message }]. A single-assignee
 * claim (the ordinary case, unchanged since Phase 4) reads exactly as it
 * always has; several assignees get one line naming who got confirmed vs
 * pending, and a second naming anyone the write actually failed for (I15 --
 * a partial failure must still reach the reader, not just the successes).
 */
export function buildClaimResultMessage(outcomes) {
  if (outcomes.length === 1) {
    const o = outcomes[0];
    return o.ok ? t(o.needsConfirmation ? "Claimed — waiting for confirmation." : "Claimed and confirmed.") : o.message;
  }
  const ok = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const okLine = ok.length
    ? t("Claimed for {names}.", { names: ok.map((o) => `${o.name} (${t(o.needsConfirmation ? "pending" : "confirmed")})`).join(", ") })
    : "";
  const failLine = failed.length ? t("Couldn't claim for {names}.", { names: failed.map((o) => o.name).join(", ") }) : "";
  return [okLine, failLine].filter(Boolean).join(" ");
}

/** Track tab -- current claimed/confirmed status for one unit + a status picker the caller wires to records.js claimStatus(). */
export function renderTrackTab(entry, currentStatusId) {
  const options = STATUSES
    .map((s) => `<option value="${s.id}" ${s.id === currentStatusId ? "selected" : ""}>${statusLabel(s.id)}</option>`)
    .join("");
  const confirmLine = entry
    ? `<p class="way-track-state">${t("Confirmed:")} <strong>${entry.confirmedStatus ? statusLabel(entry.confirmedStatus) : "—"}</strong> &middot; <span class="pill pill-${entry.confirmState}">${t(entry.confirmState)}</span></p>`
    : `<p class="way-track-state">${t("Not claimed yet.")}</p>`;
  return `<div class="way-track">
    ${confirmLine}
    <label>${t("Claim a status")}
      <select class="way-status-select">${options}</select>
    </label>
    <button type="button" class="way-claim-btn">${t("Claim")}</button>
    <div class="way-claim-result"></div>
  </div>`;
}

/** Breakdown tab -- I7: Not Applicable excluded from totals via summarizeStatuses, never counted as zero. */
export function renderBreakdownTab(statusIds) {
  const summary = summarizeStatuses(statusIds);
  if (summary.countedTotal === 0) {
    return `<div class="way-breakdown"><p>${t("Nothing claimed yet for this Approach here.")}</p></div>`;
  }
  const counts = {};
  for (const s of statusIds) counts[s] = (counts[s] ?? 0) + 1;
  const rows = STATUSES.filter((s) => s.onRamp)
    .map((s) => {
      const count = counts[s.id] ?? 0;
      const pct = summary.countedTotal ? Math.round((count / summary.countedTotal) * 100) : 0;
      return `<div class="breakdown-row">
        <span class="breakdown-label">${statusLabel(s.id)}</span>
        <div class="breakdown-bar-track"><div class="breakdown-bar" style="width:${pct}%; background:${STATUS_COLORS[s.id]}"></div></div>
        <span class="breakdown-count">${num(count)}</span>
      </div>`;
    })
    .join("");
  return `<div class="way-breakdown">
    ${rows}
    <p class="breakdown-note">${summary.countedTotal} counted${summary.excludedNotApplicable ? ` &middot; ${summary.excludedNotApplicable} Not Applicable (excluded)` : ""}</p>
  </div>`;
}

/** Coverage tab -- which ayahs of the current surah this Approach has touched at all vs left untouched. */
export function renderCoverageTab(ayahStatuses) {
  const chips = ayahStatuses
    .map(
      (e) => `<span class="coverage-chip" style="background:${STATUS_COLORS[e.statusId] ?? STATUS_COLORS.not_started}" title="Ayah ${e.ayah} — ${e.statusId.replace(/_/g, " ")}">${e.ayah}</span>`
    )
    .join("");
  const touched = ayahStatuses.filter((e) => e.statusId && e.statusId !== "not_started").length;
  return `<div class="way-coverage">
    <p>${touched} of ${ayahStatuses.length} ayahs touched in this surah for this Approach.</p>
    <div class="coverage-grid">${chips}</div>
  </div>`;
}

/** Streak tab -- Phase 7, routine renderer. streakCount comes from activity.js's computeStreak (a pure count, this file stays Firebase-free); the Log button itself is wired by the caller, same I2 split as Track's claim button. */
export function renderStreakTab(streakCount, loggedToday) {
  const streakLine = streakCount > 0
    ? `<p class="way-streak-count">🔥 ${streakCount} day${streakCount === 1 ? "" : "s"} in a row</p>`
    : `<p class="way-streak-count">No streak yet — log it to start one.</p>`;
  const todayLine = loggedToday
    ? `<p class="way-streak-today">Logged today ✓</p>`
    : `<p class="way-streak-today">Not logged today yet.</p>`;
  return `<div class="way-streak">
    ${streakLine}
    ${todayLine}
    <button type="button" class="way-log-btn" ${loggedToday ? "disabled" : ""}>${loggedToday ? "Logged today" : "Log today"}</button>
    <div class="way-log-result"></div>
  </div>`;
}

const DEFAULT_TABS = ["Track", "Guide", "Breakdown", "Coverage"];

/**
 * Modal shell -- renders each tab body (already-built HTML strings) with a
 * tab bar; caller supplies the bodies keyed by tab name. `tabs` defaults to
 * the full Quran four; Phase 6's topic renderer passes a shorter list
 * (Track/Guide/Breakdown only -- "which topics in this subject have been
 * touched" isn't a built concept yet, so there's no Coverage tab to show).
 */
export function renderWayModalShell(title, tabBodies, tabs = DEFAULT_TABS, assignDropdownHtml = "") {
  const buttons = tabs.map((t, i) => `<button type="button" class="way-tab-btn ${i === 0 ? "active" : ""}" data-tab="${t}">${t}</button>`).join("");
  const panels = tabs.map((t, i) => `<div class="way-tab-panel ${i === 0 ? "active" : ""}" data-tab="${t}">${tabBodies[t] ?? ""}</div>`).join("");
  return `<div class="way-modal">
    <div class="way-modal-header">
      <div class="way-header-row"><h3>${escapeHtml(title)}</h3>${assignDropdownHtml}</div>
      <button type="button" class="way-close-btn" aria-label="Close">&times;</button>
    </div>
    <div class="way-tab-bar">${buttons}</div>
    <div class="way-tab-panels">${panels}</div>
  </div>`;
}

/** Wires tab-switching and the close button on a modal already inserted into the DOM. Claim button / ayah-chip clicks are wired separately by the caller (I2 — this file doesn't know about records.js). */
export function attachWayModalHandlers(modalEl, { onClose } = {}) {
  modalEl.querySelectorAll(".way-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modalEl.querySelectorAll(".way-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      modalEl.querySelectorAll(".way-tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === btn.dataset.tab));
    });
  });
  const closeBtn = modalEl.querySelector(".way-close-btn");
  if (closeBtn && onClose) closeBtn.addEventListener("click", onClose);
}

/**
 * Embedded variant of the modal shell -- same tab bar/tab bodies, no header,
 * no close button, no overlay. Housed inline inside the Ayah Note screen
 * (round after F-047's own Note view), after Notes: reading is study, this
 * card is assessment, and it stays wherever it is opened from until the
 * reader leaves that screen -- there is nothing here to close.
 *
 * Note view enhancement round -- the header used to be one plain string,
 * "{Approach name} — {Ayah ref}" (`title`). The owner asked to change the
 * Approach from inside this card itself, so `title` is now just the plain
 * Ayah reference (`refLabel`, still escaped, still text) and a new,
 * optional `approachSelectHtml` slot -- a real, caller-built `<select>`
 * (this file stays I2-pure: quranrevival.html owns the list of Approaches
 * and builds this markup, this file only places it) -- sits beside it.
 * `.way-embed-header` is `flex-wrap` (see the CSS), so the select and the
 * ref share one line on a wide screen and wrap to their own line on a
 * phone/tablet with no separate breakpoint needed.
 */
export function renderWayEmbed(refLabel, tabBodies, tabs = DEFAULT_TABS, assignDropdownHtml = "", approachSelectHtml = "") {
  const buttons = tabs.map((tb, i) => `<button type="button" class="way-tab-btn ${i === 0 ? "active" : ""}" data-tab="${tb}">${tb}</button>`).join("");
  const panels = tabs.map((tb, i) => `<div class="way-tab-panel ${i === 0 ? "active" : ""}" data-tab="${tb}">${tabBodies[tb] ?? ""}</div>`).join("");
  return `<div class="way-embed">
    <div class="way-embed-header">
      ${approachSelectHtml}
      <span class="way-embed-ref">${escapeHtml(refLabel)}</span>
      ${assignDropdownHtml}
    </div>
    <div class="way-tab-bar">${buttons}</div>
    <div class="way-tab-panels">${panels}</div>
  </div>`;
}

/** Tab-switching only -- an embedded card has no close button to wire. */
export function attachWayEmbedHandlers(embedEl) {
  embedEl.querySelectorAll(".way-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      embedEl.querySelectorAll(".way-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      embedEl.querySelectorAll(".way-tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === btn.dataset.tab));
    });
  });
}

/**
 * One delegated listener, registered once at module load -- mirrors nav.js's
 * own outside-click-closes pattern (shell round 29) so opening/closing the
 * "Assign to" popover never stacks a fresh document listener on every
 * re-render of a Track card (a claim rebuilds the whole card each time).
 */
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-assign-trigger]");
    if (trigger) {
      e.stopPropagation();
      const popover = trigger.parentElement.querySelector("[data-assign-popover]");
      if (popover) {
        const open = popover.classList.toggle("open");
        trigger.setAttribute("aria-expanded", String(open));
      }
      return;
    }
    document.querySelectorAll(".assign-popover.open").forEach((pop) => {
      if (!pop.contains(e.target)) {
        pop.classList.remove("open");
        pop.parentElement.querySelector("[data-assign-trigger]")?.setAttribute("aria-expanded", "false");
      }
    });
  });
}
