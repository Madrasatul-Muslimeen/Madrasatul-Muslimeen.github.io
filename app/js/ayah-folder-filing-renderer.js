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

function tickedInside(folder, checkedIds) {
  return (folder.children ?? []).reduce((n, c) => n + (checkedIds.has(c.folderId) ? 1 : 0) + tickedInside(c, checkedIds), 0);
}

// The Owner, 8 Oct 2026: "Enable all folder Collapse/ expandable (use one button, not two. Same button collapse, next
// click expands). Default open collapsed." `expanded` holds the open folders; none is open at first. While a search is
// typed, every folder on a matching path is shown open, so a match is never hidden inside a closed folder.
function folderRowHtml(folder, checkedIds, term, depth, expanded) {
  if (!subtreeMatches(folder, term)) return "";
  const checked = checkedIds.has(folder.folderId);
  const children = folder.children ?? [];
  const open = !!term || expanded.has(folder.folderId);
  const inside = children.length && !open ? tickedInside(folder, checkedIds) : 0;
  const fold = children.length
    ? `<button type="button" class="ayah-folder-fold" data-ayah-folder-fold="${escapeHtml(folder.folderId)}" aria-expanded="${open ? "true" : "false"}" aria-label="${escapeHtml(open ? t("Collapse {name}", { name: folder.name ?? "" }) : t("Expand {name}", { name: folder.name ?? "" }))}" title="${escapeHtml(open ? t("Collapse") : t("Expand"))}">${open ? "▾" : "▸"}</button>`
    : `<span class="ayah-folder-fold-space" aria-hidden="true"></span>`;
  return `
    <div class="ayah-folder-row" style="padding-inline-start:${depth * 18}px">
      ${fold}
      <label class="ayah-folder-row-label">
        <input type="checkbox" data-ayah-folder-toggle="${escapeHtml(folder.folderId)}" ${checked ? "checked" : ""}>
        <span>${escapeHtml(folder.name ?? "")}${inside ? ` <small class="ayah-folder-inside">${escapeHtml(t("({count} ticked inside)", { count: inside }))}</small>` : ""}</span>
      </label>
      <button type="button" class="ayah-folder-new-here" data-ayah-folder-new-under="${escapeHtml(folder.folderId)}" title="${escapeHtml(t("New folder here"))}" aria-label="${escapeHtml(t("New folder under {name}", { name: folder.name ?? "" }))}">+</button>
    </div>
    ${open ? children.map((child) => folderRowHtml(child, checkedIds, term, depth + 1, expanded)).join("") : ""}`;
}

/**
 * `tree`: `{ roots: [...] }` from ownerFolderTreePaged()/buildFolderTree().
 * `checkedFolderIds`: folder ids the reader's Note is already filed in.
 * `searchTerm`: free text, matched case-insensitively against a folder's
 * own name or any of its descendants'.
 * `newFolderUnder`: a folder id (or "" for a new root folder) when the "+
 * New folder" row is open and asking for a name, else null/omitted.
 */
/** The folder list alone. The Owner, 8 Oct 2026: "On every letter typing, the keyboard goes down." Typing in the
 *  search box now redraws only this list, never the box itself, so the box keeps its focus and the keyboard stays. */
export function renderAyahFolderTreeHtml({ tree, checkedFolderIds = [], searchTerm = "", expandedFolderIds = [] } = {}) {
  const checked = new Set(checkedFolderIds);
  const term = searchTerm.trim().toLowerCase();
  const roots = tree?.roots ?? [];
  const expanded = new Set(expandedFolderIds);
  const rowsHtml = roots.map((folder) => folderRowHtml(folder, checked, term, 0, expanded)).join("");
  return roots.length
    ? (rowsHtml || `<p class="ayah-folder-empty">${escapeHtml(t("No folders match your search."))}</p>`)
    : `<p class="ayah-folder-empty">${escapeHtml(t("No folders yet."))}</p>`;
}

export function renderAyahFolderPickerHtml({
  tree, checkedFolderIds = [], searchTerm = "", newFolderUnder = null, expandedFolderIds = [],
} = {}) {
  const newFolderRow = newFolderUnder === null ? "" : `
        <div class="ayah-folder-new-form">
          <input type="text" class="ayah-folder-new-name" data-ayah-folder-new-name placeholder="${escapeHtml(t("Folder name"))}" autofocus>
          <button type="button" data-ayah-folder-new-confirm>${escapeHtml(t("Create"))}</button>
          <button type="button" data-ayah-folder-new-cancel>${escapeHtml(t("Cancel"))}</button>
        </div>`;
  return `
    <div class="ayah-folder-picker" data-ayah-folder-picker>
      <input type="search" class="ayah-folder-search" data-ayah-folder-search placeholder="${escapeHtml(t("Search folders…"))}" value="${escapeHtml(searchTerm)}" aria-label="${escapeHtml(t("Search folders…"))}">
      <div class="ayah-folder-tree" data-ayah-folder-tree>${renderAyahFolderTreeHtml({ tree, checkedFolderIds, searchTerm, expandedFolderIds })}</div>
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
  // Delegated, so the folder list can be redrawn on its own (search) without losing its handlers.
  picker.addEventListener("change", (e) => {
    const cb = e.target.closest?.("[data-ayah-folder-toggle]");
    if (cb) callbacks.onToggle?.(cb.dataset.ayahFolderToggle, cb.checked);
  });
  picker.addEventListener("click", (e) => {
    const fold = e.target.closest?.("[data-ayah-folder-fold]");
    if (fold) { callbacks.onFold?.(fold.dataset.ayahFolderFold); return; }
    const btn = e.target.closest?.("[data-ayah-folder-new-under]");
    if (btn) callbacks.onNewFolderRequest?.(btn.dataset.ayahFolderNewUnder);
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
