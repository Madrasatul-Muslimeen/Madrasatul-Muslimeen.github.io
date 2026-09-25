// Issue #286 -- the folder chooser inside "File in folder(s)…". Pure
// renderer (I2): the caller passes in journey-map-contract.js's own
// buildFolderTree() shape ({ roots, orphaned, cyclic, tooDeep }, via
// journey-map-service.js's ownerFolderTreePaged() -- never a fresh walk
// written here), which folders are already ticked, and a search term; this
// file never talks to Firestore and holds no folder-tree walking logic of
// its own (that stays ADR-010's one bounded walk, per its own header
// comment: "leaving each consumer to remember that is how one of them
// eventually hangs the app on a corrupt tree").
//
// Deliberately NOT the Folders view's own Siyagah-style numbering
// ("(01.02)") -- that rendering is page-local inside journey-map.html, and
// extracting it into a shared module is real work this round did not
// spend its budget on. This is a plain indented tree instead: every folder
// still reachable (an `orphaned`/`cyclic`/`tooDeep` folder is simply not
// offered here -- the same three lists the Folders view itself would need
// to explain, and explaining them is that view's job, not a quick sheet's).

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function matchesSearch(folder, term) {
  if (!term) return true;
  return (folder.name ?? "").toLowerCase().includes(term);
}

// A folder matches the search directly, OR has a descendant that does --
// otherwise typing "reflection" would hide its own parent row and orphan
// the indentation the reader is trying to read.
function subtreeMatches(folder, term) {
  if (matchesSearch(folder, term)) return true;
  return (folder.children ?? []).some((child) => subtreeMatches(child, term));
}

function folderRowHtml(folder, checkedIds, term, depth) {
  if (!subtreeMatches(folder, term)) return "";
  const checked = checkedIds.has(folder.folderId);
  const children = folder.children ?? [];
  return `
    <div class="ayah-folder-row" style="padding-inline-start:${depth * 18}px">
      <label class="ayah-folder-row-label">
        <input type="checkbox" data-ayah-folder-toggle="${escapeHtml(folder.folderId)}" ${checked ? "checked" : ""}>
        <span>${escapeHtml(folder.name ?? "")}</span>
      </label>
      <button type="button" class="ayah-folder-new-here" data-ayah-folder-new-under="${escapeHtml(folder.folderId)}" title="${escapeHtml(t("New folder here"))}" aria-label="${escapeHtml(t("New folder under {name}", { name: folder.name ?? "" }))}">+</button>
    </div>
    ${children.map((child) => folderRowHtml(child, checkedIds, term, depth + 1)).join("")}`;
}

/**
 * `tree`: `{ roots: [...] }` from ownerFolderTreePaged()/buildFolderTree().
 * `checkedFolderIds`: folder ids the reader's Note is already filed in.
 * `searchTerm`: free text, matched case-insensitively against a folder's
 * own name or any of its descendants'.
 * `newFolderUnder`: a folder id (or "" for a new root folder) when the "+
 * New folder" row is open and asking for a name, else null/omitted.
 */
export function renderAyahFolderPickerHtml({
  tree, checkedFolderIds = [], searchTerm = "", newFolderUnder = null,
} = {}) {
  const checked = new Set(checkedFolderIds);
  const term = searchTerm.trim().toLowerCase();
  const roots = tree?.roots ?? [];
  const rowsHtml = roots.map((folder) => folderRowHtml(folder, checked, term, 0)).join("");
  const newFolderRow = newFolderUnder === null ? "" : `
        <div class="ayah-folder-new-form">
          <input type="text" class="ayah-folder-new-name" data-ayah-folder-new-name placeholder="${escapeHtml(t("Folder name"))}" autofocus>
          <button type="button" data-ayah-folder-new-confirm>${escapeHtml(t("Create"))}</button>
          <button type="button" data-ayah-folder-new-cancel>${escapeHtml(t("Cancel"))}</button>
        </div>`;
  return `
    <div class="ayah-folder-picker" data-ayah-folder-picker>
      <input type="search" class="ayah-folder-search" data-ayah-folder-search placeholder="${escapeHtml(t("Search folders…"))}" value="${escapeHtml(searchTerm)}" aria-label="${escapeHtml(t("Search folders…"))}">
      <div class="ayah-folder-tree">${roots.length
        ? (rowsHtml || `<p class="ayah-folder-empty">${escapeHtml(t("No folders match your search."))}</p>`)
        : `<p class="ayah-folder-empty">${escapeHtml(t("No folders yet."))}</p>`}</div>
      <button type="button" class="ayah-folder-new-root" data-ayah-folder-new-under="">${escapeHtml(t("+ New folder"))}</button>
      ${newFolderRow}
      <div class="ayah-folder-actions">
        <button type="button" data-ayah-folder-cancel>${escapeHtml(t("Cancel"))}</button>
        <button type="button" class="ayah-folder-save" data-ayah-folder-save>${escapeHtml(t("Save"))}</button>
      </div>
    </div>`;
}

/**
 * `callbacks`: onSearch(term), onToggle(folderId, checked),
 * onNewFolderRequest(parentFolderId | ""), onNewFolderConfirm(name),
 * onNewFolderCancel(), onCancel(), onSave(checkedFolderIds).
 * Re-call after every re-render (the search box and the "+ New folder"
 * form both trigger one), the same convention attachQuickMenuHandlers/
 * attachNoteViewHandlers already use.
 */
export function attachAyahFolderPickerHandlers(container, callbacks = {}) {
  const picker = container.querySelector("[data-ayah-folder-picker]");
  if (!picker) return;
  picker.querySelector("[data-ayah-folder-search]")?.addEventListener("input", (e) => {
    callbacks.onSearch?.(e.target.value);
  });
  picker.querySelectorAll("[data-ayah-folder-toggle]").forEach((cb) => {
    cb.addEventListener("change", () => callbacks.onToggle?.(cb.dataset.ayahFolderToggle, cb.checked));
  });
  picker.querySelectorAll("[data-ayah-folder-new-under]").forEach((btn) => {
    btn.addEventListener("click", () => callbacks.onNewFolderRequest?.(btn.dataset.ayahFolderNewUnder));
  });
  picker.querySelector("[data-ayah-folder-new-confirm]")?.addEventListener("click", () => {
    const input = picker.querySelector("[data-ayah-folder-new-name]");
    callbacks.onNewFolderConfirm?.(input?.value ?? "");
  });
  picker.querySelector("[data-ayah-folder-new-cancel]")?.addEventListener("click", () => callbacks.onNewFolderCancel?.());
  picker.querySelector("[data-ayah-folder-cancel]")?.addEventListener("click", () => callbacks.onCancel?.());
  picker.querySelector("[data-ayah-folder-save]")?.addEventListener("click", () => {
    const checked = [...picker.querySelectorAll("[data-ayah-folder-toggle]:checked")].map((cb) => cb.dataset.ayahFolderToggle);
    callbacks.onSave?.(checked);
  });
}
