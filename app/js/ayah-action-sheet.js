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

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
 * action (Bookmark/Asma/QCR/Play/Copy/Share) is unaffected here -- those
 * already follow whichever permission model they had before this sheet
 * existed, unchanged by this round.
 */
export function renderAyahActionSheetHtml({
  unitKey, ref = "", hasNote = false, isBookmarked = false, isSelf = true,
} = {}) {
  const noteWhy = t("Only your own record can create or file a Note.");
  // Reuses ayah-note-renderer.js's own .qm-item/.qm-divider CSS (already
  // shared by the Read/Note view quick menus) rather than inventing new
  // item styling -- true I2 reuse, not just of the actions but the look.
  const noteItem = `
        <button type="button" class="qm-item ayah-sheet-item${isSelf ? "" : " is-disabled"}" aria-disabled="${isSelf ? "false" : "true"}" data-ayah-sheet-note>📝 ${escapeHtml(t("Note & more…"))}</button>
        ${isSelf ? "" : `<p class="ayah-sheet-hint">${escapeHtml(noteWhy)}</p>`}`;
  const fileFolderItem = `
        <button type="button" class="qm-item ayah-sheet-item${isSelf ? "" : " is-disabled"}" aria-disabled="${isSelf ? "false" : "true"}" data-ayah-sheet-file-folder>🗂 ${escapeHtml(t("File in folder(s)…"))}</button>
        <p class="ayah-sheet-hint">${escapeHtml(isSelf ? t("Files your Note on this āyah (creates one if you have none).") : noteWhy)}</p>`;
  return `
    <div class="ayah-sheet" data-ayah-sheet data-unit-key="${escapeHtml(unitKey)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(ref || t("This āyah"))}">
      <div class="ayah-sheet-handle" aria-hidden="true"></div>
      <div class="ayah-sheet-header">
        <span class="ayah-sheet-ref">${escapeHtml(ref)}</span>
        <button type="button" class="ayah-sheet-close" data-ayah-sheet-close aria-label="${escapeHtml(t("Close"))}">×</button>
      </div>
      <div class="ayah-sheet-body">
        <button type="button" class="qm-item" data-ayah-sheet-bookmark>${isBookmarked ? "★" : "🔖"} ${escapeHtml(isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah"))}</button>
        ${noteItem}
        <button type="button" class="qm-item" data-ayah-sheet-asma>✦ ${escapeHtml(t("Asma ul Husna Name(s)…"))}</button>
        <button type="button" class="qm-item" data-ayah-sheet-qcr>📚 ${escapeHtml(t("QCR collection(s)…"))}</button>
        ${fileFolderItem}
        <div class="qm-divider"></div>
        <button type="button" class="qm-item" data-ayah-sheet-play>▶ ${escapeHtml(t("Play this āyah"))}</button>
        <button type="button" class="qm-item" data-ayah-sheet-copy>📋 ${escapeHtml(t("Copy"))}</button>
        <button type="button" class="qm-item" data-ayah-sheet-share>📤 ${escapeHtml(t("Share"))}</button>
      </div>
    </div>`;
}

/**
 * `callbacks`: onBookmark(unitKey), onNote(unitKey), onAsma(unitKey),
 * onQcr(unitKey), onFileInFolder(unitKey), onPlay(unitKey), onCopy(unitKey),
 * onShare(unitKey), onClose(). Every action callback fires onClose() FIRST
 * -- several of them (Bookmark, Note, Asma, QCR, File in folder) trigger a
 * re-render of whatever's underneath the sheet, and closing first means
 * that re-render never has to fight this file for a DOM node it is about
 * to remove. A dimmed (`aria-disabled="true"`) item never fires its
 * callback -- the explanation beside it is the whole of what it does.
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
}
