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
// Resolves with:
//   null  -- cancelled, no write to make
//   { name, folderId, newFolderName, personTagId }
// where folderId is an existing folder (or null for Unfiled), newFolderName is
// set only when a brand-new folder was typed (the caller creates it first, then
// files the bookmark into it), and personTagId is the tagged person (or null).

import { t } from "./i18n.js";

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
      z-index: 80; padding: 1rem;
    }
    .bm-popover {
      background: white; color: #222; border-radius: 0.6rem; padding: 1rem 1.1rem;
      width: min(24rem, 100%); box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      font-family: system-ui, sans-serif;
    }
    .bm-popover h3 { margin: 0 0 0.7rem; font-size: 1.05rem; }
    .bm-popover-field { display: block; font-size: 0.85rem; margin-bottom: 0.7rem; color: #444; }
    .bm-popover-field input, .bm-popover-field select {
      display: block; width: 100%; margin-top: 0.25rem; font-size: 0.92rem;
      padding: 0.35rem 0.45rem; border: 1px solid #ccc; border-radius: 0.35rem; box-sizing: border-box;
    }
    .bm-popover-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.4rem; }
    .bm-popover-actions button {
      font-size: 0.88rem; padding: 0.35rem 0.8rem; border-radius: 0.4rem; border: 1px solid #ccc;
      background: #1F3A6E; color: white; cursor: pointer;
    }
    .bm-popover-actions button.secondary { background: white; color: #1F3A6E; }
  `;
  document.head.appendChild(style);
}

function renderPopoverInner(defaultName, folders, people, defaultPersonTagId) {
  const folderOptions = folders
    .map((f) => `<option value="${f.id}">${"　".repeat(f.depth ?? 0)}${escapeHtml(f.name)}</option>`)
    .join("");
  // The person row is omitted entirely rather than shown empty when the caller
  // has no roster to offer (about.html and taglines.html never load one) --
  // a picker whose only choice is "no one" is worse than no picker.
  const personRow = people.length
    ? `<label class="bm-popover-field">${t("For")}
        <select data-bm-pop-person>
          <option value="">${t("No one in particular")}</option>
          ${people.map((p) => `<option value="${p.id}" ${p.id === defaultPersonTagId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
        </select>
      </label>`
    : "";
  return `<div class="bm-popover" role="dialog" aria-modal="true" aria-label="${t("Bookmark this")}">
    <h3>${t("Bookmark this")}</h3>
    <label class="bm-popover-field">${t("Name")}
      <input type="text" data-bm-pop-name value="${escapeHtml(defaultName)}">
    </label>
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
 */
export function openBookmarkNamePopover({ defaultName = "", folders = [], people = [], defaultPersonTagId = null } = {}) {
  ensureStyles();
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "bm-popover-overlay";
    overlay.innerHTML = renderPopoverInner(defaultName, folders, people, defaultPersonTagId);
    document.body.appendChild(overlay);

    function onKeydown(e) {
      if (e.key === "Escape") close(null);
    }
    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }

    document.addEventListener("keydown", onKeydown);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });

    const nameInput = overlay.querySelector("[data-bm-pop-name]");
    const personSelect = overlay.querySelector("[data-bm-pop-person]"); // absent when the caller had no roster
    const folderSelect = overlay.querySelector("[data-bm-pop-folder]");
    const newFolderRow = overlay.querySelector("[data-bm-pop-newfolder-row]");
    const newFolderInput = overlay.querySelector("[data-bm-pop-newfolder]");

    folderSelect.addEventListener("change", () => {
      const isNew = folderSelect.value === "__new__";
      newFolderRow.style.display = isNew ? "block" : "none";
      if (isNew) newFolderInput.focus();
    });

    overlay.querySelector("[data-bm-pop-cancel]").addEventListener("click", () => close(null));
    overlay.querySelector("[data-bm-pop-save]").addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const personTagId = personSelect ? personSelect.value || null : null;
      if (folderSelect.value === "__new__") {
        const newFolderName = newFolderInput.value.trim();
        if (!newFolderName) {
          newFolderInput.focus();
          return;
        }
        close({ name, folderId: null, newFolderName, personTagId });
      } else {
        close({ name, folderId: folderSelect.value || null, newFolderName: null, personTagId });
      }
    });

    nameInput.focus();
    nameInput.select();
  });
}
