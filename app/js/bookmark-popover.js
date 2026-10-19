// Fixes round (23 Aug 2026), item 1 -- a real folder-picker popover, in
// place of the plain `prompt()` every bookmark-creation call site
// (quranrevival.html's toggleAyahBookmark, topic-study.js's
// toggleTopicBookmark, routine-study.js's toggleRoutineBookmark,
// asma-study.js's toggleAsmaBookmark) used since v07.66. The owner's own
// ask: naming a new bookmark should also offer the existing folder list (to
// file it straight into one) and a way to create a new folder in the same
// step, rather than always landing in Unfiled and needing a second trip to
// bookmarks.html to move it.
//
// I2: pure renderer/UI component. It never imports bookmarks.js or any
// Firebase module -- a caller (a page controller, which already talks to
// Firestore) hands it a flat, already-computed folder list and gets back a
// plain choice object; it does no reading or writing of its own. This is
// the same reasoning way-modal.js's own header comment states for itself.
//
// Fixes round 2 adds the person tag to the same step (the owner: "enable a
// bookmark to be saved tagging with a person (students/family members)") --
// same rule as the folder list: the caller hands over an already-resolved
// list of people and gets an id back, this file never looks one up.
//
// Multi-student round (v07.79's own follow-up) adds an "Assign to" roster
// checklist -- the same control way-modal.js's Track card already offers for
// a Claim (now shared via assign-picker.js) -- so one save can create the
// SAME bookmark in several people's own documents at once, not only whoever
// is currently selected. Shown only when the caller's roster has 2+ people
// (a lone student sees no new control at all, same "don't offer a control
// with one option" rule renderAssignDropdown() itself follows).
//
// personTagId and an EXISTING named folder both stop making sense the
// moment more than one assignee is ticked: personTagId means "who this ONE
// copy is for", and a folder id is only meaningful inside the ONE document
// it was listed from -- neither transfers across several people's own
// separate documents. So ticking a second assignee hides the "For" row and
// narrows Folder down to Unfiled/"+ New folder…" (a newly-typed folder name
// is still created fresh in EACH assignee's own document, by name). Ticking
// back down to one restores both, unchanged from before this round.
//
// Resolves with:
//   null  -- cancelled, no write to make
//   { name, folderId, folderName, newFolderName, personTagId, assigneeIds, unitId }
// where folderId is an existing folder (or null for Unfiled, or when several
// assignees are ticked), newFolderName is set only when a brand-new folder
// was typed, personTagId is the tagged person (or null, forced null when
// several assignees are ticked), and assigneeIds is the ticked roster ids --
// always at least one entry (defaults to [selectedPersonId] when no roster
// was offered at all).
//
// The Owner, 12 Oct 2026 -- two fixes from real use:
//   * "I tried to add bookmark for children but couldn't add". With ONE person
//     ticked, the For picker now follows the tick (until the reader picks For
//     by hand): it used to stay on the selected person, so a bookmark saved
//     into a child's own document was tagged "For" the Owner. An existing
//     folder stays offered for one child: the caller files it by its NAME in
//     the child's document (bookmark-assign.js), and `folderName` is handed
//     back for that. showBookmarkSavedNotice() below is how the caller says
//     who it was saved for -- the save used to close the dialog in silence.
//   * "Can you add quick unit choice because this only restrict to whole
//     Surah." An optional `units` list ([{id, label, defaultName}], the first
//     is the default) draws a compact "Bookmark" choice -- the current unit,
//     This āyah, This page. Picking one changes the default Name unless the
//     reader has typed their own, and `unitId` says which was picked. Only the
//     Quran Read view passes `units`; every other caller gets no new control.
//
// The Owner, 16 Oct 2026 (PCA J76, for QR J03 "Bookmark a range of āyāt") -- a
// unit may be a RANGE: { id, label, kind: "range", surah, ayahCount, from, to,
// surahName? }. Picking it shows two āyah fields (From, To), each 1..ayahCount,
// From not after To; Save refuses an invalid range in words. The result then
// also carries `range: { surah, from, to }` and `unitKey`, the permanent key
// range:S:A-B (buildUnitKey.range, I5). A range unit may also be the only one
// passed. Inert for every caller that passes none: no field, no new key.

import { t, num } from "./i18n.js";
import { buildUnitKey } from "./unit-keys.js";
import { trapModal } from "./modal-focus.js";

const isRangeUnit = (u) => u?.kind === "range";
/** A range's own default Name: "Al-Baqarah 255–257" (or "2:255–257" without a surah name). */
function rangeDefaultName(u, from, to) {
  const span = from === to ? num(from) : `${num(from)}–${num(to)}`;
  return u.surahName ? `${u.surahName} ${span}` : `${num(u.surah)}:${span}`;
}
/** null when valid; otherwise the reason, in words. */
export function rangeProblem(u, from, to) {
  const max = Number(u?.ayahCount) || 0;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1 || from > max || to > max) return t("Choose āyāt from 1 to {max}.", { max: num(max) });
  if (from > to) return t("The first āyah must not come after the last.");
  return null;
}

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.id = "bmPopoverStyles";
  style.textContent = `
    .bm-popover-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 9700; padding: 1rem; /* above the writing sheet (9500) and its pop-out (9600): a bookmark can be made there */
    }
    .bm-popover {
      background: white; color: #222; border-radius: 0.6rem; padding: 1rem 1.1rem;
      width: min(24rem, 100%); max-height: 100%; overflow-y: auto; box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      font-family: system-ui, sans-serif;
      box-sizing: border-box; /* audit29: with max-height 100% the dialog's padding stays inside it on a 320x568 phone, so Save is reachable */
    }
    .bm-popover h3 { margin: 0 0 0.7rem; font-size: 1.05rem; }
    .bm-popover-field { display: block; font-size: 0.85rem; margin-bottom: 0.7rem; color: #444; }
    .bm-popover-field input, .bm-popover-field select {
      display: block; width: 100%; margin-top: 0.25rem; font-size: 0.92rem;
      padding: 0.35rem 0.45rem; border: 1px solid #8c8c8c; border-radius: 0.35rem; box-sizing: border-box; /* audit part 37: #ccc was 1.61:1 */
      min-height: 40px; /* audit28: a finger-sized field (they were 29-31px) */
    }
    .bm-popover-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.4rem; }
    .bm-popover-actions button {
      font-size: 0.88rem; padding: 0.35rem 0.8rem; min-height: 40px; min-width: 40px; border-radius: 0.4rem; border: 1px solid #ccc;
      background: #1F3A6E; color: white; cursor: pointer;
    }
    .bm-popover-actions button.secondary { background: white; color: #1F3A6E; }
    .bm-pop-assignees { display: flex; flex-direction: column; gap: 0.3rem; max-height: 8rem; overflow-y: auto; margin-top: 0.25rem; }
    .bm-pop-assignee-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; user-select: none; padding: 0.1rem 0; }
    .bm-pop-assignee-row input[type="checkbox"] { width: 1.05rem; height: 1.05rem; accent-color: #1F3A6E; cursor: pointer; flex-shrink: 0; }
    .bm-pop-assignee-row .who-name { flex: 1; }
    .bm-pop-assignee-row .who-tag { font-size: 0.66rem; color: #777; background: #f6f7fb; border: 1px solid #eee; border-radius: 0.6rem; padding: 0.02rem 0.4rem; }
    .bm-pop-unit-row { font-size: 0.85rem; margin-bottom: 0.7rem; color: #444; }
    .bm-pop-units { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.25rem; }
    .bm-pop-units button {
      flex: 0 1 auto; min-height: 40px; min-width: 0; max-width: 100%; padding: 0.25rem 0.7rem; font-size: 0.82rem; line-height: 1.15;
      border: 1px solid #c9d0e0; border-radius: 0.4rem; background: white; color: #1F3A6E; cursor: pointer;
      white-space: normal; overflow-wrap: anywhere;
    }
    .bm-pop-units button[aria-checked="true"] { background: #1F3A6E; color: white; border-color: #1F3A6E; }
    .bm-pop-range { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.4rem; }
    .bm-pop-range[hidden] { display: none; }
    .bm-pop-range .bm-popover-field { margin-bottom: 0; }
    .bm-pop-range input { min-height: 40px; }
    .bm-pop-range-error { color: #a12; font-size: 0.82rem; margin: 0 0 0.6rem; }
    .bm-pop-range-error[hidden] { display: none; }
    .bm-saved-notice {
      position: fixed; left: 50%; bottom: 1rem; transform: translateX(-50%); z-index: 9800;
      width: max-content; max-width: calc(100vw - 2rem); box-sizing: border-box;
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      background: #1F3A6E; color: white; border-radius: 0.6rem; padding: 0.45rem 0.5rem 0.45rem 0.9rem;
      box-shadow: 0 6px 24px rgba(0,0,0,0.25); font: 0.9rem/1.3 system-ui, sans-serif;
    }
    .bm-saved-notice[hidden] { display: none; }
    .bm-saved-notice .bm-saved-text { flex: 1 1 12rem; min-width: 0; overflow-wrap: anywhere; }
    .bm-saved-notice a { color: #ffe08a; display: inline-flex; align-items: center; min-height: 36px; overflow-wrap: anywhere; }
    .bm-saved-notice button { min-width: 36px; min-height: 36px; border: 0; border-radius: 0.4rem; background: rgba(255,255,255,0.15); color: white; font-size: 1rem; cursor: pointer; }
  `;
  document.head.appendChild(style);
}

function renderPopoverInner(defaultName, folders, people, defaultPersonTagId, roster, selectedPersonId, units) {
  const folderOptions = folders
    .map((f) => `<option value="${f.id}">${"　".repeat(f.depth ?? 0)}${escapeHtml(f.name)}</option>`)
    .join("");
  // The person row is omitted entirely rather than shown empty when the caller
  // has no roster to offer (about.html and taglines.html never load one) --
  // a picker whose only choice is "no one" is worse than no picker.
  const personRow = people.length
    ? `<label class="bm-popover-field" data-bm-pop-person-row>${t("For")}
        <select data-bm-pop-person>
          <option value="">${t("No one in particular")}</option>
          ${people.map((p) => `<option value="${p.id}" ${p.id === defaultPersonTagId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </label>`
    : "";
  // Multi-student round -- "Assign to", the same shape way-modal.js's own
  // Track card already offers for a Claim. Omitted entirely for a roster
  // under 2 (a lone student, or a caller with no roster at all), the same
  // "don't offer a control with one option" rule renderAssignDropdown()
  // itself follows -- assigneeIds then always defaults to [selectedPersonId].
  const assigneeRows = (roster ?? [])
    .map((p) => {
      const checked = p.id === selectedPersonId ? "checked" : "";
      const tag = p.isSelf ? `<span class="who-tag">${t("you")}</span>` : "";
      return `<label class="bm-pop-assignee-row"><input type="checkbox" value="${p.id}" data-name="${escapeHtml(p.name)}" ${checked}><span class="who-name">${escapeHtml(p.name)}</span>${tag}</label>`;
    })
    .join("");
  // PCF MSA J42: a one-tap "Everyone in the family" as the first row (2+ people). It is not an assignee: the
  // ticked people below are still what is read, so each person still gets their own copy.
  const everyoneRow = `<label class="bm-pop-assignee-row"><input type="checkbox" data-bm-pop-everyone ${(roster ?? []).every((p) => p.id === selectedPersonId) ? "checked" : ""}><span class="who-name">${t("Everyone in the family")}</span></label>`;
  const assigneeField = roster && roster.length >= 2
    ? `<div class="bm-popover-field" role="group">${t("Assign to")}
        ${everyoneRow}
        <div class="bm-pop-assignees" data-bm-pop-assignees>${assigneeRows}</div>
      </div>`
    : "";
  // The Owner, 12 Oct 2026 -- "quick unit choice". Two or more units only:
  // one choice is no choice. Not a .bm-popover-field: those are the labelled
  // inputs, and a group of buttons is not one.
  const rangeUnit = (units ?? []).find(isRangeUnit) ?? null;
  // The range's two fields: shown when the range is the first (default) unit, hidden until it is picked otherwise.
  const rangeRow = rangeUnit
    ? `<div class="bm-pop-range" data-bm-pop-range ${isRangeUnit(units[0]) ? "" : "hidden"}>
        <label class="bm-popover-field">${t("From āyah")}
          <input type="number" inputmode="numeric" min="1" max="${Number(rangeUnit.ayahCount) || 1}" step="1" data-bm-pop-range-from value="${Number(rangeUnit.from) || 1}">
        </label>
        <label class="bm-popover-field">${t("To āyah")}
          <input type="number" inputmode="numeric" min="1" max="${Number(rangeUnit.ayahCount) || 1}" step="1" data-bm-pop-range-to value="${Number(rangeUnit.to) || Number(rangeUnit.from) || 1}">
        </label>
      </div>
      <p class="bm-pop-range-error" data-bm-pop-range-error role="alert" hidden></p>`
    : "";
  const unitRow = units && units.length >= 2
    ? `<div class="bm-pop-unit-row" data-bm-pop-unit-row><span id="bmPopUnitLabel">${t("Bookmark")}</span>
        <div class="bm-pop-units" role="radiogroup" aria-labelledby="bmPopUnitLabel">${units.map((u, i) =>
          `<button type="button" role="radio" aria-checked="${i === 0 ? "true" : "false"}" data-bm-pop-unit="${escapeHtml(u.id)}">${escapeHtml(u.label)}</button>`).join("")}</div>
      </div>`
    : "";
  return `<div class="bm-popover" role="dialog" aria-modal="true" aria-label="${t("Bookmark this")}">
    <h3>${t("Bookmark this")}</h3>
    ${unitRow}
    ${rangeRow}
    <label class="bm-popover-field">${t("Name")}
      <input type="text" data-bm-pop-name value="${escapeHtml(defaultName)}">
    </label>
    ${assigneeField}
    ${personRow}
    <label class="bm-popover-field">${t("Folder")}
      <select data-bm-pop-folder>
        <option value="">${t("Unfiled")}</option>
        ${folderOptions}
        <option value="__new__">${t("+ New folder…")}</option>
      </select>
    </label>
    <label class="bm-popover-field" data-bm-pop-newfolder-row style="display:none;">${t("New folder name")}
      <input type="text" data-bm-pop-newfolder>
    </label>
    <div class="bm-popover-actions">
      <button type="button" class="secondary" data-bm-pop-cancel>${t("Cancel")}</button>
      <button type="button" data-bm-pop-save>${t("Save")}</button>
    </div>
  </div>`;
}

/**
 * Opens the popover and resolves once the reader saves or cancels it.
 * `folders` is a flat, pre-indented list (see bookmarks.js's own
 * `flattenFolderTree()`) -- `[{id, name, depth}]`, live folders only.
 * `roster`/`selectedPersonId` are the multi-student round's own "Assign to"
 * inputs -- `roster` shaped like assignableRoster()'s own output
 * (`[{id, name, isSelf}]`); omit (or a roster under 2) to get exactly
 * yesterday's popover, with `assigneeIds` always resolving to
 * `[selectedPersonId]`.
 */
export function openBookmarkNamePopover({ defaultName = "", folders = [], people = [], defaultPersonTagId = null, roster = [], selectedPersonId = null, units = [] } = {}) {
  ensureStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bm-popover-overlay";
    // Two or more units draw the choice; a lone RANGE unit is still offered (its fields are the choice).
    const unitList = units && (units.length >= 2 || (units.length === 1 && isRangeUnit(units[0]))) ? units : [];
    overlay.innerHTML = renderPopoverInner(unitList[0]?.defaultName ?? defaultName, folders, people, defaultPersonTagId, roster, selectedPersonId, unitList);
    document.body.appendChild(overlay);

    function onKeydown(e) {
      if (e.key === "Escape") close(null);
    }
    const releaseFocus = trapModal(overlay);
    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      releaseFocus();
      resolve(result);
    }

    document.addEventListener("keydown", onKeydown);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });

    const nameInput = overlay.querySelector("[data-bm-pop-name]");
    const personRow = overlay.querySelector("[data-bm-pop-person-row]");
    const personSelect = overlay.querySelector("[data-bm-pop-person]"); // absent when the caller had no roster
    const folderSelect = overlay.querySelector("[data-bm-pop-folder]");
    const newFolderRow = overlay.querySelector("[data-bm-pop-newfolder-row]");
    const newFolderInput = overlay.querySelector("[data-bm-pop-newfolder]");
    const assigneesList = overlay.querySelector("[data-bm-pop-assignees]"); // absent when roster < 2

    // The unit choice. The Name follows the picked unit until the reader types
    // a name of their own; after that it is theirs and is never overwritten.
    let nameTyped = false;
    nameInput.addEventListener("input", () => { nameTyped = true; });
    let unitId = unitList[0]?.id ?? null;
    const rangeRow = overlay.querySelector("[data-bm-pop-range]");
    const rangeFrom = overlay.querySelector("[data-bm-pop-range-from]");
    const rangeTo = overlay.querySelector("[data-bm-pop-range-to]");
    const rangeError = overlay.querySelector("[data-bm-pop-range-error]");
    const rangeUnit = unitList.find(isRangeUnit) ?? null;
    const readRange = () => ({ from: Number(rangeFrom?.value), to: Number(rangeTo?.value) });
    function showRangeError(msg) { if (!rangeError) return; rangeError.textContent = msg ?? ""; rangeError.hidden = !msg; }
    function rangeNameNow() {
      const { from, to } = readRange();
      return rangeUnit && !rangeProblem(rangeUnit, from, to) ? rangeDefaultName(rangeUnit, from, to) : null;
    }
    if (rangeUnit && isRangeUnit(unitList[0]) && !nameTyped) nameInput.value = rangeNameNow() ?? nameInput.value;
    [rangeFrom, rangeTo].forEach((el) => el?.addEventListener("input", () => {
      showRangeError(null);
      if (!nameTyped && isRangeUnit(unitList.find((x) => x.id === unitId))) { const n = rangeNameNow(); if (n) nameInput.value = n; }
    }));
    overlay.querySelectorAll("[data-bm-pop-unit]").forEach((btn) => btn.addEventListener("click", () => {
      const u = unitList.find((x) => x.id === btn.dataset.bmPopUnit);
      if (!u) return;
      unitId = u.id;
      overlay.querySelectorAll("[data-bm-pop-unit]").forEach((b) => b.setAttribute("aria-checked", b === btn ? "true" : "false"));
      if (rangeRow) rangeRow.hidden = !isRangeUnit(u);
      showRangeError(null);
      if (!nameTyped) nameInput.value = isRangeUnit(u) ? (rangeNameNow() ?? u.defaultName ?? "") : u.defaultName;
    }));

    // For follows the one ticked person until the reader picks For by hand.
    let personPicked = false;
    personSelect?.addEventListener("change", () => { personPicked = true; });

    folderSelect.addEventListener("change", () => {
      const isNew = folderSelect.value === "__new__";
      newFolderRow.style.display = isNew ? "block" : "none";
      if (isNew) newFolderInput.focus();
    });

    // Multi-student round -- personTagId ("who this ONE copy is for") and an
    // EXISTING named folder (an id only meaningful inside the one document it
    // came from) both stop making sense once several assignees are ticked --
    // see this file's own header comment. Ticking back down to one restores
    // both. A "+ New folder…" choice is left alone either way: it creates a
    // fresh folder by NAME in each assignee's own document, which the caller
    // (toggleAyahBookmark() and its siblings) is what actually loops over.
    const everyoneBox = overlay.querySelector("[data-bm-pop-everyone]");
    function syncEveryone() {
      if (!everyoneBox || !assigneesList) return;
      const boxes = [...assigneesList.querySelectorAll("input")];
      everyoneBox.checked = boxes.length > 0 && boxes.every((b) => b.checked);
    }
    everyoneBox?.addEventListener("change", () => {
      // Ticking ticks every person; unticking leaves only the reader.
      assigneesList.querySelectorAll("input").forEach((b) => { b.checked = everyoneBox.checked || b.value === selectedPersonId; });
      updateForAssigneeCount();
    });
    function updateForAssigneeCount() {
      if (!assigneesList) return;
      syncEveryone();
      const ticked = [...assigneesList.querySelectorAll("input:checked")];
      const n = ticked.length;
      const multi = n > 1;
      if (personRow) personRow.style.display = multi ? "none" : "";
      if (n === 1 && personSelect && !personPicked) {
        const id = ticked[0].value;
        const follow = id === selectedPersonId ? (defaultPersonTagId ?? "") : id;
        if ([...personSelect.options].some((o) => o.value === follow)) personSelect.value = follow;
      }
      // An existing folder stays selectable with several people ticked: the
      // selected person's copy uses its id, every other copy is filed by NAME.
    }
    if (assigneesList) {
      assigneesList.addEventListener("change", updateForAssigneeCount);
      updateForAssigneeCount();
    }

    overlay.querySelector("[data-bm-pop-cancel]").addEventListener("click", () => close(null));
    overlay.querySelector("[data-bm-pop-save]").addEventListener("click", () => {
      // A picked range must be valid before anything else: it is the key the bookmark is saved under.
      const pickedUnit = unitList.find((x) => x.id === unitId) ?? null;
      let rangeOut = {};
      if (isRangeUnit(pickedUnit)) {
        const { from, to } = readRange();
        const problem = rangeProblem(pickedUnit, from, to);
        if (problem) { showRangeError(problem); (from > to ? rangeTo : rangeFrom)?.focus(); return; }
        rangeOut = { range: { surah: pickedUnit.surah, from, to }, unitKey: buildUnitKey.range(pickedUnit.surah, from, to) };
      }
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const assigneeIds = assigneesList
        ? [...assigneesList.querySelectorAll("input:checked")].map((c) => c.value)
        : [];
      const resolvedAssigneeIds = assigneeIds.length ? assigneeIds : [selectedPersonId];
      const personTagId = personSelect && resolvedAssigneeIds.length <= 1 ? personSelect.value || null : null;
      if (folderSelect.value === "__new__") {
        const newFolderName = newFolderInput.value.trim();
        if (!newFolderName) {
          newFolderInput.focus();
          return;
        }
        close({ name, folderId: null, folderName: null, newFolderName, personTagId, assigneeIds: resolvedAssigneeIds, unitId, ...rangeOut });
      } else {
        const folderId = folderSelect.value || null;
        const folderName = folderId ? (folders.find((f) => f.id === folderId)?.name ?? null) : null;
        close({ name, folderId, folderName, newFolderName: null, personTagId, assigneeIds: resolvedAssigneeIds, unitId, ...rangeOut });
      }
    });

    nameInput.focus();
    nameInput.select();
  });
}

/** "Maryam", "Maryam and Ahsan", "Zahra, Maryam and Ahsan" -- in the app language. */
export function formatNameList(names) {
  const list = (names ?? []).filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return t("{a} and {b}", { a: list.slice(0, -1).join(", "), b: list[list.length - 1] });
}

let noticeTimer = null;
/**
 * The Owner, 12 Oct 2026: a bookmark saved for someone else used to close the
 * dialog in silence, and nothing on the Owner's screen changed -- so it looked
 * as if it had not been saved. This says who it was saved for ("Saved for
 * Maryam and Ahsan"), and for anyone whose bookmarks this page does not show,
 * links to their bookmarks on the Bookmarks page (`links`: [{ href, label }];
 * each href carries back=1, the way-back law). One notice at a time; it stays
 * 10 seconds, or until ✕.
 */
export function showBookmarkSavedNotice({ names = [], links = [] } = {}) {
  ensureStyles();
  if (!names.length) return null;
  let el = document.getElementById("bmSavedNotice");
  if (!el) {
    el = document.createElement("div");
    el.id = "bmSavedNotice";
    el.className = "bm-saved-notice";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="bm-saved-text" data-bm-saved-text>${escapeHtml(t("Saved for {names}", { names: formatNameList(names) }))}</span>`
    + links.map((l) => `<a href="${escapeHtml(l.href)}" data-bm-saved-link>${escapeHtml(l.label)}</a>`).join("")
    + `<button type="button" data-bm-saved-close aria-label="${escapeHtml(t("Close"))}">✕</button>`;
  el.hidden = false;
  el.querySelector("[data-bm-saved-close]").addEventListener("click", () => { el.hidden = true; });
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el.hidden = true; }, 10000);
  return el;
}

/**
 * The callers' one line after a save (bookmark-assign.js's `savedFor`): shows
 * the notice above only when the bookmark went to someone OTHER than the
 * selected person -- a bookmark for the selected person alone already shows
 * as its own ★. `nameOf(personId)` is the caller's (it holds the roster).
 */
export function announceBookmarkSaved({ savedFor = [], selectedPersonId = null, nameOf = (id) => id } = {}) {
  if (!savedFor.some((pid) => pid !== selectedPersonId)) return null;
  return showBookmarkSavedNotice({
    names: savedFor.map(nameOf),
    links: savedFor.filter((pid) => pid !== selectedPersonId).map((pid) => ({
      href: `./bookmarks.html?person=${encodeURIComponent(pid)}&back=1`,
      label: t("See {name}'s bookmarks", { name: nameOf(pid) }),
    })),
  });
}

/**
 * The Owner, 12 Oct 2026 (PCF J22): tapping 🔖/★ on a unit whose own bookmark
 * already exists used to remove it at once, so "save for everyone" or "This
 * āyah" inside that unit could never be reached, and a slip deleted a bookmark
 * silently. This asks instead. Resolves "remove", "add", or null (✕ / Escape /
 * a tap outside): null writes nothing.
 */
export function openBookmarkExistsChoice() {
  ensureStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bm-popover-overlay";
    overlay.innerHTML = `
      <div class="bm-popover" role="dialog" aria-modal="true" aria-label="${t("Already bookmarked")}" data-bm-exists-choice>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.7rem">
          <h3 style="margin:0">${t("Already bookmarked")}</h3>
          <button type="button" data-bm-exists-close aria-label="${t("Close")}" style="min-width:40px;min-height:40px;border:1px solid #ccc;border-radius:.4rem;background:white;color:#1F3A6E;font-size:1.1rem;cursor:pointer">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:.5rem">
          <button type="button" data-bm-exists-remove style="min-height:44px;font-size:.92rem;border:1px solid #c9d0e0;border-radius:.4rem;background:white;color:#1F3A6E;cursor:pointer">${t("Remove my bookmark")}</button>
          <button type="button" data-bm-exists-add style="min-height:44px;font-size:.92rem;border:1px solid #1F3A6E;border-radius:.4rem;background:#1F3A6E;color:white;cursor:pointer">${t("Add a bookmark…")}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    function onKeydown(e) { if (e.key === "Escape") close(null); }
    const releaseFocus = trapModal(overlay);
    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      releaseFocus();
      resolve(result);
    }
    document.addEventListener("keydown", onKeydown);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
    overlay.querySelector("[data-bm-exists-close]").addEventListener("click", () => close(null));
    overlay.querySelector("[data-bm-exists-remove]").addEventListener("click", () => close("remove"));
    overlay.querySelector("[data-bm-exists-add]").addEventListener("click", () => close("add"));
    overlay.querySelector("[data-bm-exists-add]").focus();
  });
}
