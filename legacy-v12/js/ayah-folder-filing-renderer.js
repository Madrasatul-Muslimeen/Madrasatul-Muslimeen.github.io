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
import { isSystemFolderRole } from "./journey-map-contract.js";

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
export function renderAyahFolderTreeHtml({ tree, checkedFolderIds = [], searchTerm = "", expandedFolderIds = [], scope = "all" } = {}) {
  const checked = new Set(checkedFolderIds);
  const term = searchTerm.trim().toLowerCase();
  const roots = tree?.roots ?? [];
  const expanded = new Set(expandedFolderIds);
  if (!roots.length) return `<p class="ayah-folder-empty">${escapeHtml(t("No folders yet."))}</p>`;
  const groups = folderSectionGroups(tree);
  let rowsHtml;
  if (!groups) {
    rowsHtml = roots.map((folder) => folderRowHtml(folder, checked, term, 0, expanded)).join("");
  } else {
    // A search looks through every section (a match is never hidden in another one); otherwise the chosen scope.
    const shown = term || scope === "all" ? groups : groups.filter((g) => g.id === scope);
    const headed = term || scope === "all";
    rowsHtml = shown.map((g) => {
      const rows = g.roots.map((folder) => folderRowHtml(folder, checked, term, 0, expanded)).join("");
      return rows ? `${headed ? `<div class="ayah-folder-sechead" data-ayah-folder-sechead="${escapeHtml(g.id)}">${escapeHtml(g.id === "none" ? t("Not in a section") : g.name)}</div>` : ""}${rows}` : "";
    }).join("");
  }
  return rowsHtml || `<p class="ayah-folder-empty">${escapeHtml(t("No folders match your search."))}</p>`;
}

/**
 * The Owner, 8 Oct 2026 ("Here is Siyagah's MidPane Folder's few functions, add the marked ones"; "Go ahead with the
 * Siyagah header"). The top-level folders grouped by their section (`tree.sections`, active, by `order`; a root's own
 * `sectionId`), plus "Not in a section" for the rest (the system folders among them). null when there are no
 * sections at all, so the chooser stays as it was.
 */
export function folderSectionGroups(tree) {
  const sections = [...(tree?.sections ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (!sections.length) return null;
  const ids = new Set(sections.map((sec) => sec.sectionId));
  const groups = sections.map((sec) => ({ id: sec.sectionId, name: sec.name ?? "", roots: [] }));
  const none = { id: "none", name: "", roots: [] };
  for (const root of tree?.roots ?? []) {
    const sid = (root.parentFolderId ?? null) === null && ids.has(root.sectionId) && !isSystemFolderRole(root.semanticRole) ? root.sectionId : null;
    (sid ? groups.find((g) => g.id === sid) : none).roots.push(root);
  }
  return none.roots.length ? [none, ...groups] : groups;
}

/** The scopes ◀ ▶ step through, in order: each group's id. */
export function folderScopeOrder(tree) { return (folderSectionGroups(tree) ?? []).map((g) => g.id); }

const FONT_SWATCHES = [["Default", ""], ["Gold", "#e2c06b"], ["Sky", "#8ec5ff"], ["Mint", "#7fd1a7"], ["Rose", "#f4a3b5"], ["White", "#ffffff"]];

/** Siyagah's header: the scope's name, then 📚 (every section), ◀ ▶ (previous / next section), the section picker and
 *  🎨 (folder text size, colour, bold -- kept on this device). Nothing when there are no sections. */
export function renderAyahFolderNavHtml({ tree, scope = "all", fontOpen = false, font = { size: 15, color: "", bold: false } } = {}) {
  const groups = folderSectionGroups(tree);
  if (!groups) return "";
  const cur = groups.find((g) => g.id === scope);
  const title = scope === "all" || !cur ? `📚 ${escapeHtml(t("All sections"))}` : `📂 ${escapeHtml(cur.id === "none" ? t("Not in a section") : cur.name)}`;
  const opts = groups.map((g) => `<option value="${escapeHtml(g.id)}"${g.id === scope ? " selected" : ""}>${escapeHtml(g.id === "none" ? t("Not in a section") : g.name)}</option>`).join("")
    + `<option value="all"${scope === "all" || !cur ? " selected" : ""}>📚 ${escapeHtml(t("All sections"))}</option>`;
  const pop = !fontOpen ? "" : `
      <div class="ayah-folder-font-pop" data-ayah-folder-font-pop role="dialog" aria-label="${escapeHtml(t("Folder text"))}">
        <div class="ayah-folder-font-hd"><span>🎨 ${escapeHtml(t("Folder text"))}</span><button type="button" class="ayah-folder-font-btn" data-ayah-folder-font-close aria-label="${escapeHtml(t("Close"))}">✕</button></div>
        <div class="ayah-folder-font-lbl">${escapeHtml(t("Size"))}: <b data-ayah-folder-font-size-now>${font.size}px</b></div>
        <div class="ayah-folder-font-row">
          <button type="button" class="ayah-folder-font-btn" data-ayah-folder-font-step="-1">A−</button>
          <button type="button" class="ayah-folder-font-btn" data-ayah-folder-font-step="1">A+</button>
          ${[13, 15, 18, 22].map((n) => `<button type="button" class="ayah-folder-font-btn${n === font.size ? " on" : ""}" data-ayah-folder-font-size="${n}">${n}</button>`).join("")}
        </div>
        <div class="ayah-folder-font-lbl">${escapeHtml(t("Colour"))}</div>
        <div class="ayah-folder-font-row">${FONT_SWATCHES.map(([n, c]) => `<button type="button" class="ayah-folder-font-sw${c === (font.color || "") ? " on" : ""}" data-ayah-folder-font-colour="${c}" aria-label="${escapeHtml(t(n))}" title="${escapeHtml(t(n))}" style="background:${c || "linear-gradient(135deg,#eef1f7 50%,#131a2e 50%)"}"></button>`).join("")}</div>
        <div class="ayah-folder-font-row">
          <button type="button" class="ayah-folder-font-btn${font.bold ? " on" : ""}" data-ayah-folder-font-bold aria-pressed="${font.bold ? "true" : "false"}"><b>B</b> ${escapeHtml(t("Bold"))}</button>
          <button type="button" class="ayah-folder-font-btn" data-ayah-folder-font-reset>↺ ${escapeHtml(t("Reset"))}</button>
        </div>
        <p class="ayah-folder-font-note">${escapeHtml(t("Kept on this device only."))}</p>
      </div>`;
  return `
      <div class="ayah-folder-sec-title" data-ayah-folder-sec-title>${title}</div>
      <div class="ayah-folder-sec-nav">
        <button type="button" class="ayah-folder-nb${scope === "all" || !cur ? " on" : ""}" data-ayah-folder-scope="all" aria-label="${escapeHtml(t("Every section at once"))}" title="${escapeHtml(t("Every section at once"))}">📚</button>
        <button type="button" class="ayah-folder-nb" data-ayah-folder-step="-1" aria-label="${escapeHtml(t("Previous section"))}" title="${escapeHtml(t("Previous section"))}">◀</button>
        <button type="button" class="ayah-folder-nb" data-ayah-folder-step="1" aria-label="${escapeHtml(t("Next section"))}" title="${escapeHtml(t("Next section"))}">▶</button>
        <select class="ayah-folder-sec-sel" data-ayah-folder-scope-select aria-label="${escapeHtml(t("Jump to a section"))}">${opts}</select>
        <button type="button" class="ayah-folder-nb${fontOpen ? " on" : ""}" data-ayah-folder-font aria-expanded="${fontOpen ? "true" : "false"}" aria-label="${escapeHtml(t("Folder text: size, colour, bold"))}" title="${escapeHtml(t("Folder text: size, colour, bold"))}">🎨</button>
      </div>${pop}`;
}

export function renderAyahFolderPickerHtml({
  tree, checkedFolderIds = [], searchTerm = "", newFolderUnder = null, expandedFolderIds = [], scope = "all", fontOpen = false, font,
} = {}) {
  const newFolderRow = newFolderUnder === null ? "" : `
        <div class="ayah-folder-new-form">
          <input type="text" class="ayah-folder-new-name" data-ayah-folder-new-name placeholder="${escapeHtml(t("Folder name"))}" autofocus>
          <button type="button" data-ayah-folder-new-confirm>${escapeHtml(t("Create"))}</button>
          <button type="button" data-ayah-folder-new-cancel>${escapeHtml(t("Cancel"))}</button>
        </div>`;
  return `
    <div class="ayah-folder-picker" data-ayah-folder-picker>
      <div class="ayah-folder-nav" data-ayah-folder-nav>${renderAyahFolderNavHtml({ tree, scope, fontOpen, font })}</div>
      <input type="search" class="ayah-folder-search" data-ayah-folder-search placeholder="${escapeHtml(t("Search folders…"))}" value="${escapeHtml(searchTerm)}" aria-label="${escapeHtml(t("Search folders…"))}">
      <div class="ayah-folder-tree" data-ayah-folder-tree>${renderAyahFolderTreeHtml({ tree, checkedFolderIds, searchTerm, expandedFolderIds, scope })}</div>
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
  picker.addEventListener("change", (e) => {
    const sel = e.target.closest?.("[data-ayah-folder-scope-select]");
    if (sel) callbacks.onScope?.(sel.value);
  });
  picker.addEventListener("click", (e) => {
    const q = (sel) => e.target.closest?.(sel);
    const scope = q("[data-ayah-folder-scope]"); if (scope) { callbacks.onScope?.(scope.dataset.ayahFolderScope); return; }
    const step = q("[data-ayah-folder-step]"); if (step) { callbacks.onStep?.(Number(step.dataset.ayahFolderStep)); return; }
    if (q("[data-ayah-folder-font]") || q("[data-ayah-folder-font-close]")) { callbacks.onFontToggle?.(); return; }
    const fs = q("[data-ayah-folder-font-step]"); if (fs) { callbacks.onFont?.({ step: Number(fs.dataset.ayahFolderFontStep) }); return; }
    const fz = q("[data-ayah-folder-font-size]"); if (fz) { callbacks.onFont?.({ size: Number(fz.dataset.ayahFolderFontSize) }); return; }
    const fc = q("[data-ayah-folder-font-colour]"); if (fc) { callbacks.onFont?.({ color: fc.dataset.ayahFolderFontColour }); return; }
    if (q("[data-ayah-folder-font-bold]")) { callbacks.onFont?.({ toggleBold: true }); return; }
    if (q("[data-ayah-folder-font-reset]")) { callbacks.onFont?.({ reset: true }); return; }
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
