// Issue #286 -- "This āyah" action sheet: two ways in (tap the Mushaf
// page's own ayah-end marker, or the Word Card's "This āyah ⋯" button),
// one shared component out. I2: pure renderer, HTML in/out plus callback
// hooks, exactly like ayah-note-renderer.js's own renderQuickMenu.
//
// Every action reuses a function quranrevival.html already has --
// toggleAyahBookmark, openNoteView, openAsmaXAttachPopover, the QCR
// membership drawer, quickPlayAyah, buildAyahText/copyToClipboard/
// shareText -- this file never talks to Firebase, records or the Note
// Foundation itself. This module only decides WHAT the sheet offers and
// wires a click to a callback; the caller decides what each callback does.
//
// "File in folder(s)…" is the one new action (spec item 3); its own picker
// lives in ayah-folder-filing-renderer.js, and the create/retire calls it
// leads to are the existing Note Foundation / Mapping My Journey functions
// -- nothing here knows about Firestore.
//
// Presented as a bottom sheet at phone widths and a popover beside the
// āyah on a wide screen; the CSS in quranrevival.html decides which, this
// file only marks up the content once, the same split every other overlay
// in that page already uses (the Asma attach popover, the QCR drawer).
//
// Issue #295 -- "Ayah Card (part 1)": this "This āyah" sheet IS the Ayah
// Card's Actions part (A). This round grows it with two more actions (Take
// an Approach, Make a poster) and a whole new Status part (B) -- Approach
// colours, Word by Word, Hifz -- plus an empty, translated stub for the
// Info part (C), which waits on an Owner decision (a later round). Every
// new action still fires through the same fire()/fireUnlessDisabled() shape
// below; nothing about the two existing entry points changes.

import { t, num } from "./i18n.js";
import { statusLabel } from "./unit-keys.js";
import { wireUnitLadder } from "./unit-ladder.js";
import { STATUS_COLORS } from "./mastery-wheel.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function actionItemHtml({ attr, icon, label, disabled = false, hint = "" }) {
  return `
        <button type="button" class="qm-item ayah-sheet-item${disabled ? " is-disabled" : ""}" aria-disabled="${disabled ? "true" : "false"}" ${attr}>${icon} ${escapeHtml(label)}</button>
        ${hint ? `<p class="ayah-sheet-hint">${escapeHtml(hint)}</p>` : ""}`;
}

// Issue #325 -- all four stages, not a one-shot "choosing claims Learning".
// The Owner's own decision (docs/governance/2026-09-27-owner-decisions.md,
// #5: "Keep all 4 stage"). Mastered sits off this row on purpose -- it is
// never a status a person CLAIMS, only one confirmEntry() (the data layer's
// own confirm step, elsewhere entirely) can reach, same as the wheel's own
// ramp treats it.
export const APPROACH_STAGE_IDS = Object.freeze(["not_started", "learning", "practising", "achieved"]);

// Owner, 1 Oct 2026 (a photo of the Read view's Track panel): "Record has N/A
// tab missing. Fix. Also 'Mastered' should appear for the user, the note about
// Mastered availability criteria should only appear to a student account."
// So Not Applicable always shows (I7: it is excluded from totals, never
// counted as zero), and Mastered shows to anyone whose own claim is not
// waiting on a teacher -- owner, prime, teacher, guardian, or a self-learner
// with no student role. A student sees the four stages, N/A and the
// "confirmed by a teacher" note instead. claimStatus() already accepts all
// six statuses and decides confirmation itself, so this is markup only.
export function approachStageIdsFor(canConfirm) {
  return canConfirm
    ? [...APPROACH_STAGE_IDS, "mastered", "not_applicable"]
    : [...APPROACH_STAGE_IDS, "not_applicable"];
}

// Owner, 2 Oct 2026 (a photo of Record Your Progress with Learning pressed in
// gold): "Make the color of selected progress as the color of legend in
// wheel." The pressed button takes its stage's colour from STATUS_COLORS --
// the same table the wheel and its legend paint from, so the two cannot drift
// -- with the text colour that reads on it (measured: white on Not started
// 10.5:1, Learning 5.0:1, N/A; dark on Practising 7.4:1, Achieved 4.7:1,
// Mastered 6.4:1). N/A uses the legend's own stripe.
const STAGE_TEXT_DARK = new Set(["practising", "achieved", "mastered"]);
const NA_STRIPE = "repeating-linear-gradient(45deg,#1b2338 0 3px,rgba(201,162,75,0.55) 3px 4px)";
export function stageColourStyle(id) {
  const bg = id === "not_applicable" ? NA_STRIPE : STATUS_COLORS[id];
  if (!bg) return "";
  const edge = id === "not_applicable" ? "#C9A24B" : STATUS_COLORS[id];
  return `--stage-bg:${bg};--stage-edge:${edge};--stage-fg:${STAGE_TEXT_DARK.has(id) ? "#111827" : "#ffffff"}`;
}

function approachStageButtonsHtml(currentStatusId, disabled = false, canConfirm = false) {
  const buttons = approachStageIdsFor(canConfirm)
    .map((id) => `<button type="button" class="approach-stage-btn" data-approach-stage-btn="${id}" aria-pressed="${!disabled && id === currentStatusId}" style="${stageColourStyle(id)}"${disabled ? " disabled" : ""}>${escapeHtml(statusLabel(id))}</button>`)
    .join("");
  return `<div class="approach-stage-row" role="group" aria-label="${escapeHtml(t("Status"))}">${buttons}</div>`;
}

/** Marks the one <option> whose value is `selectedId` as selected, without asking the caller's buildTrackableOptionsHtml() to know anything about this file's own selection state (I2 -- one source of truth for what Approaches exist, this file only marks which one is picked). A value that isn't present (an archived Approach, a stale id) is left unmarked rather than thrown on. */
function withSelectedOption(optionsHtml, selectedId) {
  if (!selectedId) return optionsHtml;
  const marker = `<option value="${selectedId}">`;
  const idx = optionsHtml.indexOf(marker);
  if (idx === -1) return optionsHtml;
  return optionsHtml.slice(0, idx) + `<option value="${selectedId}" selected>` + optionsHtml.slice(idx + marker.length);
}

/**
 * "Take an Approach" (issue #295), grown into the full four-stage picker
 * (issue #325) -- `approachOptionsHtml` is whatever <option>/<optgroup>
 * markup the caller's own buildTrackableOptionsHtml() already builds for the
 * canonical Approach picker (this tenant's active Approaches, section order,
 * reader's language) -- I2 reuse, not a second source of truth for what
 * Approaches exist. Choosing an Approach no longer claims anything by
 * itself (the old one-shot "choosing claims Learning" -- spec: "Replace the
 * old one-shot Learning behaviour"); it only reveals the four stage buttons
 * below it, one of them already pressed for whatever this unit's current
 * claim is. Pressing a stage button is the only thing that writes. Never
 * gated on isSelf -- claiming an Approach follows the broader
 * canRecordFor() rule (a teacher/guardian may claim for whoever is
 * currently selected on the page, D10), and the caller only ever opens this
 * card for a person already legitimate to record for.
 *
 * Exported (and `selectId` made overridable) so the Mushaf "This page" card
 * (issue #325 point 2, page-approach-card.js) can reuse the identical
 * picker+stage-row markup and wiring for its OWN, separate unit key --
 * one claim mechanism, two entry points, never a second one invented for
 * the page card.
 */
export function renderApproachStagePickerHtml({
  approachOptionsHtml = "", selectedApproachId = null, selectedApproachStatusId = "not_started",
  selectId = "ayahSheetApproachSelect", approachSummary = null, canConfirm = false,
} = {}) {
  // Issue #370 (Global Approach Card): "Mastered is confirmed by a teacher"
  // under the four stages -- the fifth stage is never a button here.
  // Owner, 30 Sep 2026 (decision 39, a photo of the Page card with the gap
  // above the stage buttons marked): "As approach has the title. Give the
  // title to record as well above the progress Tabs: (Icon) 'Record Your
  // Progress'. Make it look elegant. Keep proper space." Same face as the
  // 🎯 Take an Approach title above it, with its own breathing room.
  // Owner, 1 Oct 2026 (a photo of the Ayah Card with the place under the
  // pull-down marked): "'Record Your Progress' (earlier known as Track) is
  // missing in Ayah Card, should be here." It was rendered only AFTER an
  // Approach was chosen, so a card opened with none chosen had no Record step
  // at all. The title and the four stages now always show; with no Approach
  // chosen the stages are disabled and a line says what to do first. Nothing
  // is written until an Approach is chosen and a stage is pressed (the click
  // handler below still refuses an empty select).
  const recordTitleHtml = `<p class="ayah-sheet-select-label gac-record-title" data-gac-record-title>✅ ${escapeHtml(t("Record Your Progress"))}</p>`;
  const stageRowHtml = selectedApproachId
    ? recordTitleHtml
      + approachStageButtonsHtml(selectedApproachStatusId, false, canConfirm)
      + (canConfirm ? "" : `<p class="gac-mastered-note">${escapeHtml(t("Mastered is confirmed by a teacher."))}</p>`)
    : recordTitleHtml
      + approachStageButtonsHtml(null, true, canConfirm) + `<p class="gac-mastered-note" data-gac-record-needs-approach>${escapeHtml(t("Choose an Approach above first, then tap your stage."))}</p>`;
  // Issue #370 -- the chosen Approach named in full with its section, above
  // the pull-down (which a phone cuts on a long name).
  const summaryHtml = approachSummary
    ? `<p class="gac-approach-summary" data-gac-approach-summary><span class="gac-approach-name">${escapeHtml(approachSummary.name)}</span>${approachSummary.section ? `<span class="gac-approach-section">${escapeHtml(approachSummary.section)}</span>` : ""}</p>`
    : "";
  return `
        <div class="ayah-sheet-item ayah-sheet-select-item">
          <label class="ayah-sheet-select-label" for="${selectId}">🎯 ${escapeHtml(t("Take an Approach"))}</label>
          ${summaryHtml}
          <select class="ayah-sheet-approach-select" id="${selectId}" data-approach-stage-select aria-label="${escapeHtml(t("Take an Approach"))}">
            <option value="" ${selectedApproachId ? "" : "selected"} disabled hidden>${escapeHtml(t("Choose an Approach…"))}</option>
            ${withSelectedOption(approachOptionsHtml, selectedApproachId)}
          </select>
          ${stageRowHtml}
        </div>`;
}

/**
 * Wires the Approach select (a change picks which Approach's stage row shows
 * -- never a write) and the four stage buttons (a click IS the write) on
 * whatever root element contains a renderApproachStagePickerHtml() block.
 * Shared verbatim by the Ayah Card sheet below and page-approach-card.js's
 * own attach function -- I2, one wiring, two callers.
 */
export function wireApproachStagePicker(rootEl, { onApproachPicked, onStageChoice } = {}) {
  const select = rootEl.querySelector("[data-approach-stage-select]");
  if (!select) return;
  select.addEventListener("change", () => {
    const approachId = select.value;
    if (!approachId) return;
    onApproachPicked?.(approachId);
  });
  // Deliberately data-approach-stage-BTN, not just "-stage": the pure-node
  // boundary suite's own DOM stand-in finds elements by a substring regex
  // over the raw HTML, not a real attribute-selector engine, so
  // "data-approach-stage" would also match inside
  // "data-approach-stage-select"'s own attribute name. A real browser's
  // querySelectorAll would not have this problem, but naming the two
  // attributes so neither is a prefix of the other costs nothing here.
  rootEl.querySelectorAll("[data-approach-stage-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const approachId = select.value;
      if (!approachId) return;
      onStageChoice?.(approachId, btn.dataset.approachStageBtn);
    });
  });
}

/**
 * "Make a poster" (issue #295) -- opens notes.html's own existing "Make a
 * printable page" (Dawah) flow for this āyah's Note (the caller decides how
 * -- this file never navigates or writes). `hasPosterNote` is `null` for a
 * moment after the sheet first opens (the caller reads it, on first use,
 * the same shape as the Word-by-Word status below) -- shown as enabled and
 * silent while unresolved rather than guessed either way: guessing "no
 * Note" would flash a wrong hint, and guessing "has a Note" could send the
 * reader to a page with nothing on it.
 */
function makePosterItemHtml(hasPosterNote) {
  const noNoteYet = hasPosterNote === false;
  return `
        <button type="button" class="qm-item ayah-sheet-item" data-ayah-sheet-poster>🖨 ${escapeHtml(t("Make a poster"))}</button>
        ${noNoteYet ? `<p class="ayah-sheet-hint">${escapeHtml(t("You don't have a Note on this āyah yet."))} <button type="button" class="ayah-sheet-hint-btn" data-ayah-sheet-note>${escapeHtml(t("Take Note"))}</button></p>` : ""}`;
}

/** Every action in part A, in the sheet's own display order -- ONE array,
    so a future action is one more entry here rather than a new template
    block (issue #295's own instruction). A plain item renders through
    actionItemHtml(); "Take an Approach"/"Make a poster" carry their own
    shape (a pull-down; a conditional hint) and render through their own
    small functions above, but still take exactly one slot in this list. */
function actionDefs({ isBookmarked, isSelf, noteWhy, approachOptionsHtml, selectedApproachId, selectedApproachStatusId, hasPosterNote, approachSummary, canConfirm }) {
  return [
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-bookmark", icon: isBookmarked ? "★" : "🔖", label: isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-note", icon: "📝", label: t("Note & more…"), disabled: !isSelf, hint: isSelf ? "" : noteWhy }) },
    { render: () => renderApproachStagePickerHtml({ approachOptionsHtml, selectedApproachId, selectedApproachStatusId, approachSummary, canConfirm }) },
    { render: () => makePosterItemHtml(hasPosterNote) },
    { divider: true },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-asma", icon: "✦", label: t("Asma ul Husna Name(s)…") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-qcr", icon: "📚", label: t("QCR collection(s)…") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-file-folder", icon: "🗂", label: t("File in folder(s)…"), disabled: !isSelf, hint: isSelf ? t("Files your Note on this āyah (creates one if you have none).") : noteWhy }) },
    { divider: true },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-play", icon: "▶", label: t("Play this āyah") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-copy", icon: "📋", label: t("Copy") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-share", icon: "📤", label: t("Share") }) },
  ];
}

/**
 * Status part B.1, "Approach" (issue #295) -- one small dot per Approach,
 * coloured exactly as the wheel would colour it (the caller passes the
 * same STATUS_COLORS values, read from the surah chunk already in memory
 * -- no new read). Decorative (aria-hidden): a screen reader gets the same
 * information from the visually-hidden summary line instead of 30
 * individually-announced dots.
 */
export function approachStatusRowHtml(approachStatuses) {
  if (!approachStatuses?.length) return `<p class="ayah-status-empty">${escapeHtml(t("No Approaches yet."))}</p>`;
  const dots = approachStatuses
    .map((a) => `<span class="ayah-approach-dot" style="background:${a.color}" title="${escapeHtml(`${a.name} — ${a.label}`)}" aria-hidden="true"></span>`)
    .join("");
  const summary = approachStatuses.map((a) => `${a.name}: ${a.label}`).join(", ");
  return `<div class="ayah-approach-row">${dots}</div><span class="sr-only">${escapeHtml(summary)}</span>`;
}

/**
 * Status part B.2, "Word by Word" (issue #295) -- `wordStatus` is
 * `{ known, total, words: [{ position, arabic, known, occurrenceId }] }` or
 * `null` while it hasn't loaded yet (same read-on-first-use shape as the
 * Word Card's own coverage figure -- see quranrevival.html's own
 * ensureAyahSheetWordStatusLoaded()). Each word is a real button carrying
 * `data-word-occurrence`, the identical attribute arabicWordButtonHtml()
 * stamps in the normal flowing Read view, so the caller's own delegated
 * click handler (attachAyahActionSheetHandlers below) can open the Word
 * Card from it without this file knowing anything about that mechanism.
 */
function wordByWordStatusHtml(wordStatus) {
  if (!wordStatus) return `<p class="ayah-status-empty">${escapeHtml(t("Loading…"))}</p>`;
  if (!wordStatus.words.length) return `<p class="ayah-status-empty">${escapeHtml(t("No word-by-word data for this ayah."))}</p>`;
  const countLine = t("Known {known} of {total} words", { known: num(wordStatus.known), total: num(wordStatus.total) });
  const chips = wordStatus.words
    .map((w) => `<button type="button" class="ayah-wbw-chip${w.known ? " is-known" : ""}" data-word-occurrence="${escapeHtml(w.occurrenceId)}" aria-label="${escapeHtml(w.arabic)}${w.known ? ` — ${escapeHtml(t("known"))}` : ""}"><span dir="rtl" lang="ar">${escapeHtml(w.arabic)}</span></button>`)
    .join("");
  return `<p class="ayah-wbw-count">${escapeHtml(countLine)}</p><div class="ayah-wbw-row">${chips}</div>`;
}

/**
 * Status part B.3, "Hifz" (issue #295) -- this āyah's status on Approach 2,
 * "Hifz / Memorising" (`approach_02`, a permanent id per I5, stable even if
 * a tenant renamed the Approach). `null` means the tenant has no such
 * Approach at all (e.g. it was removed) -- said in words, never guessed.
 */
function hifzStatusHtml(hifzStatus) {
  if (!hifzStatus) return `<p class="ayah-status-empty">${escapeHtml(t("No Hifz Approach set up yet."))}</p>`;
  return `<span class="ayah-hifz-chip" style="background:${hifzStatus.color}">${escapeHtml(hifzStatus.label)}</span>`;
}

/**
 * Section C, "Related āyāt" (ayah-related.js decides what is related; the
 * caller labels each item in the reader's language). `related`:
 *   null                         -> still loading
 *   { error: true }              -> said in words, never a blank
 *   { lists: [...], shared: [...] } -- each item { surah, ayah, ref, reason }
 * Every item is a real button jumping to that āyah.
 */
function relatedItemHtml(item) {
  return `<button type="button" class="ayah-related-item" data-ayah-related-jump="${Number(item.surah)}:${Number(item.ayah)}">
            <span class="ayah-related-ref">${escapeHtml(item.ref)}</span>
            <span class="ayah-related-why">${escapeHtml(item.reason)}</span>
          </button>`;
}
function relatedInfoHtml(related) {
  if (related == null) return `<p class="ayah-status-empty">${escapeHtml(t("Finding related āyāt…"))}</p>`;
  if (related.error) return `<p class="ayah-status-empty">${escapeHtml(t("Couldn't load related āyāt just now."))}</p>`;
  const lists = related.lists ?? [];
  const shared = related.shared ?? [];
  if (!lists.length && !shared.length) return `<p class="ayah-status-empty">${escapeHtml(t("No related āyāt found."))}</p>`;
  const part = (title, items) => items.length
    ? `<p class="ayah-related-sub">${escapeHtml(title)}</p><div class="ayah-related-list">${items.map(relatedItemHtml).join("")}</div>`
    : "";
  return part(t("In the same QCR collection or Asma Name"), lists) + part(t("Share this āyah's rarer words"), shared);
}

/**
 * Section C part 2, "Connected āyāt" (issue #318) -- ayah-related.js's own
 * connectedThroughNotes() decides which āyāt and why; this only labels the
 * studied marker in the reader's language and marks up each row. `studied`
 * is `true` / `false` / `null` ("not checked" -- see that function's own
 * comment for why a surah's records may genuinely be unknown here).
 */
function connectedStudiedLabel(studied) {
  if (studied === true) return t("Studied");
  if (studied === false) return t("Not studied yet");
  return t("Not checked");
}
function connectedStudiedClass(studied) {
  if (studied === true) return "is-studied";
  if (studied === false) return "is-not-studied";
  return "is-unchecked";
}
function connectedItemHtml(item) {
  return `<button type="button" class="ayah-related-item ayah-connected-item" data-ayah-related-jump="${Number(item.surah)}:${Number(item.ayah)}">
            <span class="ayah-related-ref">${escapeHtml(item.ref)}</span>
            <span class="ayah-related-why">${escapeHtml(item.reason)}</span>
            <span class="ayah-connected-studied ${connectedStudiedClass(item.studied)}">${escapeHtml(connectedStudiedLabel(item.studied))}</span>
          </button>`;
}
/**
 * `connected`:
 *   null                 -> still loading
 *   { error: true }      -> said in words, never a blank
 *   { restricted: true } -> viewing someone else's own Notes and the
 *                           deployed Rules do not let this reader see them
 *                           (spec item 4) -- said in words, not silently
 *                           hidden and not silently guessed empty.
 *   { items: [...] }     -- each item { surah, ayah, ref, reason, studied }
 */
function connectedInfoHtml(connected) {
  if (connected == null) return `<p class="ayah-status-empty">${escapeHtml(t("Finding connected āyāt…"))}</p>`;
  if (connected.error) return `<p class="ayah-status-empty">${escapeHtml(t("Couldn't load connected āyāt just now."))}</p>`;
  if (connected.restricted) return `<p class="ayah-status-empty">${escapeHtml(t("Connections are shown for your own Notes."))}</p>`;
  const items = connected.items ?? [];
  if (!items.length) return `<p class="ayah-status-empty">${escapeHtml(t("No connected āyāt found."))}</p>`;
  return `<div class="ayah-related-list">${items.map(connectedItemHtml).join("")}</div>`;
}

/**
 * `isSelf` -- the same isSelfSelected() rule notes.html/journey-map.html
 * already use for their own write actions (isNoteOwner() in
 * firestore.rules is deliberately stricter than canRecordFor(): a Note is
 * a person's own private writing, never a record kept about them). When
 * false, "Note & more…" and "File in folder(s)…" stay on screen, dimmed,
 * with the reason printed right beside them (spec item 4: "shown ... with
 * an explanation ... not hidden" -- the standing lesson in CLAUDE.md is
 * `aria-disabled`, never the native `disabled` attribute, because a truly
 * disabled control cannot be focused or explain itself). Every other
 * action (Bookmark/Asma/QCR/Play/Copy/Share/Take an Approach/Make a
 * poster) is unaffected by isSelf -- see each one's own comment above.
 */
// Owner, 2 Oct 2026 (a phone photo of the Āyah card): "Take this to the
// top". Status of this āyah comes first, straight under the header, then the
// actions (Play, Copy, Share, ...), then Info.
export function renderAyahActionSheetHtml({
  unitKey, ref = "", hasNote = false, isBookmarked = false, isSelf = true,
  approachOptionsHtml = "", selectedApproachId = null, selectedApproachStatusId = "not_started", hasPosterNote = null, approachSummary = null, canConfirm = false,
  approachStatuses = [], wordStatus = null, hifzStatus = null, related = null,
  connected = null, ladderHtml = "",
} = {}) {
  void hasNote; // kept for callers that already pass it (icon/wording decisions belong to isBookmarked/isSelf above, not this flag)
  const noteWhy = t("Only your own record can create or file a Note.");
  const actionsHtml = actionDefs({ isBookmarked, isSelf, noteWhy, approachOptionsHtml, selectedApproachId, selectedApproachStatusId, hasPosterNote, approachSummary, canConfirm })
    .map((def) => (def.divider ? `<div class="qm-divider"></div>` : def.render()))
    .join("");
  return `
    <div class="ayah-sheet" data-ayah-sheet data-unit-key="${escapeHtml(unitKey)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(ref || t("This āyah"))}">
      <div class="ayah-sheet-handle" aria-hidden="true"></div>
      ${ladderHtml}
      <div class="ayah-sheet-header">
        <span class="ayah-sheet-ref">${escapeHtml(ref)}</span>
        <button type="button" class="ayah-sheet-close" data-ayah-sheet-close aria-label="${escapeHtml(t("Close"))}">×</button>
      </div>
      <div class="ayah-sheet-status" data-ayah-sheet-status>
        <h3 class="ayah-sheet-section-title">${escapeHtml(t("Status of this āyah"))}</h3>
        <div class="ayah-status-block">
          <h4 class="ayah-status-heading">${escapeHtml(t("Approach"))}</h4>
          ${approachStatusRowHtml(approachStatuses)}
          <button type="button" class="qm-item ayah-sheet-wheel-btn" data-ayah-sheet-see-wheel>${escapeHtml(t("See on the wheel"))}</button>
        </div>
        <div class="ayah-status-block">
          <h4 class="ayah-status-heading">${escapeHtml(t("Word by Word"))}</h4>
          ${wordByWordStatusHtml(wordStatus)}
        </div>
        <div class="ayah-status-block">
          <h4 class="ayah-status-heading">${escapeHtml(t("Hifz"))}</h4>
          ${hifzStatusHtml(hifzStatus)}
        </div>
      </div>
      <div class="ayah-sheet-body">${actionsHtml}</div>
      <div class="ayah-sheet-status ayah-sheet-info" data-ayah-sheet-info>
        <h3 class="ayah-sheet-section-title">${escapeHtml(t("Info"))}</h3>
        <div class="ayah-status-block" data-ayah-sheet-related>
          <h4 class="ayah-status-heading">${escapeHtml(t("Related āyāt"))}</h4>
          ${relatedInfoHtml(related)}
        </div>
        <div class="ayah-status-block" data-ayah-sheet-connected>
          <h4 class="ayah-status-heading">${escapeHtml(t("Connected āyāt"))}</h4>
          ${connectedInfoHtml(connected)}
        </div>
      </div>
    </div>`;
}

/**
 * `callbacks`: onBookmark(unitKey), onNote(unitKey), onAsma(unitKey),
 * onQcr(unitKey), onFileInFolder(unitKey), onPlay(unitKey), onCopy(unitKey),
 * onShare(unitKey), onApproachPicked(unitKey, approachId),
 * onStageChoice(unitKey, approachId, statusId), onPoster(unitKey),
 * onSeeOnWheel(unitKey), onWordTap(occurrenceId), onRelatedJump(surah, ayah),
 * onRung(unitKey) (issue #348 -- the ladder), onClose(). Every action
 * callback fires onClose() FIRST -- several of them (Bookmark, Note, Asma,
 * QCR, File in folder, Make a poster, See on the wheel, a word tap) trigger
 * a re-render of whatever's underneath the sheet, and closing first means
 * that re-render never has to fight this file for a DOM node it is about to
 * remove. A dimmed (`aria-disabled="true"`) item never fires its callback --
 * the explanation beside it is the whole of what it does.
 *
 * Issue #325 -- onApproachPicked/onStageChoice are the two exceptions: they
 * do NOT close the sheet (the whole point is trying more than one stage
 * without reopening the card), so they are wired straight to
 * wireApproachStagePicker() below rather than through fire().
 */
export function attachAyahActionSheetHandlers(container, callbacks = {}) {
  const sheet = container.querySelector("[data-ayah-sheet]");
  if (!sheet) return;
  const unitKey = sheet.dataset.unitKey;
  const fire = (fn) => { callbacks.onClose?.(); fn?.(unitKey); };
  const fireUnlessDisabled = (btn, fn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-disabled") === "true") return;
      fire(fn);
    });
  };
  sheet.querySelector("[data-ayah-sheet-close]")?.addEventListener("click", () => callbacks.onClose?.());
  // Issue #348 -- the ladder at the card's own top (present only when the
  // caller passed a ladderHtml; wireUnitLadder() itself is a no-op when
  // there is no ".unit-ladder" in the markup). Does not close the sheet --
  // the āyah rung's own callback decides whether tapping it should (the
  // caller treats it as a no-op, since this IS the Ayah Card already).
  wireUnitLadder(sheet, (rungUnitKey) => callbacks.onRung?.(rungUnitKey));
  sheet.querySelectorAll("[data-ayah-related-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [s, a] = btn.dataset.ayahRelatedJump.split(":").map(Number);
      callbacks.onClose?.();
      callbacks.onRelatedJump?.(s, a);
    });
  });
  sheet.querySelector("[data-ayah-sheet-bookmark]")?.addEventListener("click", () => fire(callbacks.onBookmark));
  fireUnlessDisabled(sheet.querySelector("[data-ayah-sheet-note]"), callbacks.onNote);
  sheet.querySelector("[data-ayah-sheet-asma]")?.addEventListener("click", () => fire(callbacks.onAsma));
  sheet.querySelector("[data-ayah-sheet-qcr]")?.addEventListener("click", () => fire(callbacks.onQcr));
  fireUnlessDisabled(sheet.querySelector("[data-ayah-sheet-file-folder]"), callbacks.onFileInFolder);
  sheet.querySelector("[data-ayah-sheet-play]")?.addEventListener("click", () => fire(callbacks.onPlay));
  sheet.querySelector("[data-ayah-sheet-copy]")?.addEventListener("click", () => fire(callbacks.onCopy));
  sheet.querySelector("[data-ayah-sheet-share]")?.addEventListener("click", () => fire(callbacks.onShare));
  // Issue #325 -- "Take an Approach" grown into the full four-stage picker.
  // Neither the select nor a stage button closes the sheet (see this
  // function's own doc comment above) -- the caller re-renders the sheet in
  // place after a stage write lands, so the just-pressed button shows as
  // pressed without the card ever disappearing.
  wireApproachStagePicker(sheet, {
    onApproachPicked: (approachId) => callbacks.onApproachPicked?.(unitKey, approachId),
    onStageChoice: (approachId, statusId) => callbacks.onStageChoice?.(unitKey, approachId, statusId),
  });
  sheet.querySelector("[data-ayah-sheet-poster]")?.addEventListener("click", () => fire(callbacks.onPoster));
  // The poster hint's own "Take Note" button shares data-ayah-sheet-note
  // with the main "Note & more…" item on purpose (I2 -- one callback, two
  // doors in). fireUnlessDisabled() above already wired the FIRST element
  // that attribute matches; querySelectorAll here reaches every remaining
  // one (there is at most one more: the poster hint's own button, and only
  // when it is on screen at all).
  sheet.querySelectorAll("[data-ayah-sheet-note]").forEach((btn, i) => { if (i > 0) fireUnlessDisabled(btn, callbacks.onNote); });
  sheet.querySelector("[data-ayah-sheet-see-wheel]")?.addEventListener("click", () => fire(callbacks.onSeeOnWheel));
  // Word-by-Word chips -- one delegated listener rather than one per word
  // (an āyah can carry dozens), the same shape the shared readView/noteView
  // click handler already uses for data-word-occurrence elsewhere.
  sheet.querySelector("[data-ayah-sheet-status]")?.addEventListener("click", (e) => {
    const chip = e.target?.closest?.("[data-word-occurrence]");
    if (!chip) return;
    callbacks.onClose?.();
    callbacks.onWordTap?.(chip.dataset.wordOccurrence);
  });
}
