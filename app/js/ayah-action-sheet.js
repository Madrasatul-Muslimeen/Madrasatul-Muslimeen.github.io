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

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function actionItemHtml({ attr, icon, label, disabled = false, hint = "" }) {
  return `
        <button type="button" class="qm-item ayah-sheet-item${disabled ? " is-disabled" : ""}" aria-disabled="${disabled ? "true" : "false"}" ${attr}>${icon} ${escapeHtml(label)}</button>
        ${hint ? `<p class="ayah-sheet-hint">${escapeHtml(hint)}</p>` : ""}`;
}

/**
 * "Take an Approach" (issue #295) -- `approachOptionsHtml` is whatever
 * <option>/<optgroup> markup the caller's own buildTrackableOptionsHtml()
 * already builds for the canonical Approach picker (this tenant's active
 * Approaches, section order, reader's language) -- I2 reuse, not a second
 * source of truth for what Approaches exist. Choosing a real option fires
 * once; the caller resets the select back to its own placeholder afterwards
 * (see attachAyahActionSheetHandlers below) so the same pull-down can be
 * used again without looking like it is still set to whatever was last
 * picked. Never gated on isSelf -- claiming an Approach follows the
 * broader canRecordFor() rule (a teacher/guardian may claim for whoever is
 * currently selected on the page, D10), and the caller only ever opens this
 * sheet for a person already legitimate to record for.
 */
function takeApproachItemHtml(approachOptionsHtml) {
  return `
        <div class="ayah-sheet-item ayah-sheet-select-item">
          <label class="ayah-sheet-select-label" for="ayahSheetApproachSelect">🎯 ${escapeHtml(t("Take an Approach"))}</label>
          <select class="ayah-sheet-approach-select" id="ayahSheetApproachSelect" data-ayah-sheet-approach-select aria-label="${escapeHtml(t("Take an Approach"))}">
            <option value="" selected disabled hidden>${escapeHtml(t("Choose an Approach…"))}</option>
            ${approachOptionsHtml}
          </select>
        </div>`;
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
function actionDefs({ isBookmarked, isSelf, noteWhy, approachOptionsHtml, hasPosterNote }) {
  return [
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-bookmark", icon: isBookmarked ? "★" : "🔖", label: isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah") }) },
    { render: () => actionItemHtml({ attr: "data-ayah-sheet-note", icon: "📝", label: t("Note & more…"), disabled: !isSelf, hint: isSelf ? "" : noteWhy }) },
    { render: () => takeApproachItemHtml(approachOptionsHtml) },
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
function approachStatusRowHtml(approachStatuses) {
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
export function renderAyahActionSheetHtml({
  unitKey, ref = "", hasNote = false, isBookmarked = false, isSelf = true,
  approachOptionsHtml = "", hasPosterNote = null,
  approachStatuses = [], wordStatus = null, hifzStatus = null,
} = {}) {
  void hasNote; // kept for callers that already pass it (icon/wording decisions belong to isBookmarked/isSelf above, not this flag)
  const noteWhy = t("Only your own record can create or file a Note.");
  const actionsHtml = actionDefs({ isBookmarked, isSelf, noteWhy, approachOptionsHtml, hasPosterNote })
    .map((def) => (def.divider ? `<div class="qm-divider"></div>` : def.render()))
    .join("");
  return `
    <div class="ayah-sheet" data-ayah-sheet data-unit-key="${escapeHtml(unitKey)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(ref || t("This āyah"))}">
      <div class="ayah-sheet-handle" aria-hidden="true"></div>
      <div class="ayah-sheet-header">
        <span class="ayah-sheet-ref">${escapeHtml(ref)}</span>
        <button type="button" class="ayah-sheet-close" data-ayah-sheet-close aria-label="${escapeHtml(t("Close"))}">×</button>
      </div>
      <div class="ayah-sheet-body">${actionsHtml}</div>
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
        <div class="ayah-status-block ayah-status-info" data-ayah-sheet-info>
          <h4 class="ayah-status-heading">${escapeHtml(t("Related āyāt"))}</h4>
          <p class="ayah-sheet-info-placeholder">${escapeHtml(t("Related and connected āyāt — coming next"))}</p>
        </div>
      </div>
    </div>`;
}

/**
 * `callbacks`: onBookmark(unitKey), onNote(unitKey), onAsma(unitKey),
 * onQcr(unitKey), onFileInFolder(unitKey), onPlay(unitKey), onCopy(unitKey),
 * onShare(unitKey), onTakeApproach(unitKey, approachId), onPoster(unitKey),
 * onSeeOnWheel(unitKey), onWordTap(occurrenceId), onClose(). Every action
 * callback fires onClose() FIRST -- several of them (Bookmark, Note, Asma,
 * QCR, File in folder, Take an Approach, Make a poster, See on the wheel,
 * a word tap) trigger a re-render of whatever's underneath the sheet, and
 * closing first means that re-render never has to fight this file for a
 * DOM node it is about to remove. A dimmed (`aria-disabled="true"`) item
 * never fires its callback -- the explanation beside it is the whole of
 * what it does.
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
  sheet.querySelector("[data-ayah-sheet-bookmark]")?.addEventListener("click", () => fire(callbacks.onBookmark));
  fireUnlessDisabled(sheet.querySelector("[data-ayah-sheet-note]"), callbacks.onNote);
  sheet.querySelector("[data-ayah-sheet-asma]")?.addEventListener("click", () => fire(callbacks.onAsma));
  sheet.querySelector("[data-ayah-sheet-qcr]")?.addEventListener("click", () => fire(callbacks.onQcr));
  fireUnlessDisabled(sheet.querySelector("[data-ayah-sheet-file-folder]"), callbacks.onFileInFolder);
  sheet.querySelector("[data-ayah-sheet-play]")?.addEventListener("click", () => fire(callbacks.onPlay));
  sheet.querySelector("[data-ayah-sheet-copy]")?.addEventListener("click", () => fire(callbacks.onCopy));
  sheet.querySelector("[data-ayah-sheet-share]")?.addEventListener("click", () => fire(callbacks.onShare));
  // "Take an Approach" -- a pull-down, not a button, so it needs the value
  // that was just chosen, not merely a click. Reset to the placeholder
  // afterwards (a real browser <select> only -- the pure-node boundary
  // suite's own DOM stand-in does not model assignment) so the same control
  // reads as "choose one" again rather than stuck on the last pick.
  const approachSelect = sheet.querySelector("[data-ayah-sheet-approach-select]");
  approachSelect?.addEventListener("change", () => {
    const approachId = approachSelect.value;
    if (!approachId) return;
    callbacks.onClose?.();
    callbacks.onTakeApproach?.(unitKey, approachId);
    if (approachSelect.isConnected) approachSelect.value = "";
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
