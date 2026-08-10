// F-047 — The Way modal: Track / Guide / Breakdown / Coverage tabs, per
// Approach (Architecture s5 + "existing features that must survive").
//
// I2: pure renderer. Track's claim button and Coverage's ayah clicks are
// exposed as callbacks the caller wires to records.js/mastery-wheel.js --
// this file never imports records.js itself.

import { langText } from "./lang.js";
import { summarizeStatuses, STATUSES } from "./unit-keys.js";
import { STATUS_COLORS } from "./mastery-wheel.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Guide tab -- three fields per approach (Architecture s5): What / How / Measure. Measure already carries a generic fallback baked in at catalogue-seed time (Phase 2), so this never has to invent one. */
export function renderGuideTab(trackable, lang = "en") {
  const guide = trackable.guide ?? {};
  return `<div class="way-guide">
    <h4>What</h4><p>${escapeHtml(langText(guide.what, lang))}</p>
    <h4>How</h4><p>${escapeHtml(langText(guide.how, lang))}</p>
    <h4>How to measure your progress</h4><p>${escapeHtml(langText(guide.measure, lang))}</p>
  </div>`;
}

/** Track tab -- current claimed/confirmed status for one unit + a status picker the caller wires to records.js claimStatus(). */
export function renderTrackTab(entry, currentStatusId) {
  const options = STATUSES
    .map((s) => `<option value="${s.id}" ${s.id === currentStatusId ? "selected" : ""}>${s.label}</option>`)
    .join("");
  const confirmLine = entry
    ? `<p class="way-track-state">Confirmed: <strong>${entry.confirmedStatus ? STATUSES.find((s) => s.id === entry.confirmedStatus)?.label : "—"}</strong> &middot; <span class="pill pill-${entry.confirmState}">${entry.confirmState}</span></p>`
    : `<p class="way-track-state">Not claimed yet.</p>`;
  return `<div class="way-track">
    ${confirmLine}
    <label>Claim a status
      <select class="way-status-select">${options}</select>
    </label>
    <button type="button" class="way-claim-btn">Claim</button>
    <div class="way-claim-result"></div>
  </div>`;
}

/** Breakdown tab -- I7: Not Applicable excluded from totals via summarizeStatuses, never counted as zero. */
export function renderBreakdownTab(statusIds) {
  const summary = summarizeStatuses(statusIds);
  if (summary.countedTotal === 0) {
    return `<div class="way-breakdown"><p>Nothing claimed yet for this Approach here.</p></div>`;
  }
  const counts = {};
  for (const s of statusIds) counts[s] = (counts[s] ?? 0) + 1;
  const rows = STATUSES.filter((s) => s.onRamp)
    .map((s) => {
      const count = counts[s.id] ?? 0;
      const pct = summary.countedTotal ? Math.round((count / summary.countedTotal) * 100) : 0;
      return `<div class="breakdown-row">
        <span class="breakdown-label">${s.label}</span>
        <div class="breakdown-bar-track"><div class="breakdown-bar" style="width:${pct}%; background:${STATUS_COLORS[s.id]}"></div></div>
        <span class="breakdown-count">${count}</span>
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
export function renderWayModalShell(title, tabBodies, tabs = DEFAULT_TABS) {
  const buttons = tabs.map((t, i) => `<button type="button" class="way-tab-btn ${i === 0 ? "active" : ""}" data-tab="${t}">${t}</button>`).join("");
  const panels = tabs.map((t, i) => `<div class="way-tab-panel ${i === 0 ? "active" : ""}" data-tab="${t}">${tabBodies[t] ?? ""}</div>`).join("");
  return `<div class="way-modal">
    <div class="way-modal-header"><h3>${escapeHtml(title)}</h3><button type="button" class="way-close-btn" aria-label="Close">&times;</button></div>
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
