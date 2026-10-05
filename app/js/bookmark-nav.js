// Fixes round (23 Aug 2026), items 2/3 -- the nav bar's own Bookmark
// category becomes a real, live dropdown of every bookmark, not just a
// single link into bookmarks.html. The owner's own words: "opening as a
// page is needed only when organising/edits... arrangements is required,"
// so the ordinary case -- jumping straight back to a saved spot -- should
// be reachable in the same two clicks that used to only open the category.
//
// Fixes round 2 (24 Aug 2026) adds the two things that round got wrong or
// did not cover:
//   * The EXPANDED/COLLAPSED OPTION the owner actually asked for. The first
//     attempt read "enable the option for [the] Bookmark menu opening the
//     bookmark list as expanded/collapsed" as per-folder collapsing, which
//     is a different thing and was already there. It is a real setting now
//     (prefs.js's getBookmarkMenuExpanded()), deciding whether every group
//     is already open when the dropdown appears. Per-folder tapping still
//     works; the option only decides the STARTING state.
//   * GROUP BY PERSON. A bookmark can be tagged with a person now
//     (bookmarks.js's setBookmarkPersonTag()), and this dropdown can group
//     by that tag instead of by folder.
//
// Bookmark-issues round adds a third mode, GROUP BY MODULE (bookmarks.js's
// groupBookmarksByModule()) -- "everything from Deen Study," ignoring
// folders/tags entirely.
//
// I2: nav.js itself stays the pure renderer its own contract requires
// (renderBookmarkCategory() there emits only a skeleton -- a "Loading..."
// placeholder and the one link into the Manager page). This file is the
// Firebase-touching "mount" helper injected into that already-rendered DOM
// afterwards, the exact same seam js/lang-sync.js's own
// mountSyncedAppLangControl() already uses for the language picker.
//
// I9: nothing is fetched until the category is actually opened -- a
// toggle listener on the category's own <details>, not a call made at
// mount time.
//
// Two data sources, and the caller picks which one applies to it via the
// optional getBookmarksDoc (sync OR async -- awaited either way): every
// study page (topic-study.js/routine-study.js/asma-study.js,
// bookmarks.html) already loads and keeps patching its OWN bookmarksDoc
// in memory the moment a star is toggled or the Manager edits something --
// for those, this module reads that live copy straight back, for free (no
// read at all -- I9 in its strongest form) and with zero lag behind
// whatever just happened on the SAME page. quranrevival.html is the one
// exception among those: it loads bookmarksDoc LAZILY, only once the
// reading/note screen is actually opened (its own
// ensureAyahNoteDataLoaded(), a deliberate I9 choice of its own) -- so its
// getBookmarksDoc is an ASYNC function that ensures that load happens
// first, rather than a plain getter that could return the still-empty
// placeholder to someone who opens the nav dropdown from the wheel/landing
// view without ever having visited the reading screen. A page with no
// local copy at all (an admin screen that never otherwise touches
// bookmarks) omits getBookmarksDoc and falls back to a real
// getBookmarks() fetch, made fresh on every open -- the only source that
// can ever reflect a bookmark added on a different device or a different
// tab (item 4), since there is no local copy there to have gone stale.
//
// Grouping matches bookmarks.html exactly, because both read it off the
// same shared tree helpers (bookmarks.js's rootFolders/childFolders/
// bookmarksInFolder/unfiledBookmarks/groupBookmarksByPerson) -- and in
// BOTH modes the ungrouped remainder (unfiled in folder mode, untagged in
// person mode) is rendered as direct links rather than inside a fold, so it
// stays one click away exactly as the owner asked for "when there are only
// a few bookmarks (before placing them [in] organised folders)".

import {
  getBookmarks, rootFolders, childFolders, bookmarksInFolder, unfiledBookmarks, groupBookmarksByPerson,
  groupBookmarksByModule, livePresets, renameFolder, saveFolderOrder,
} from "./bookmarks.js";
import { MODULE_PAGES, MODULE_LABELS } from "./continue-strip.js";
import {
  getBookmarkMenuExpanded, setBookmarkMenuExpanded,
  getBookmarkMenuGroupBy, setBookmarkMenuGroupBy, BOOKMARK_GROUP_BYS, getAppLang,
} from "./prefs.js";
import { langText } from "./lang.js";
import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bookmarkHref(b) {
  const page = MODULE_PAGES[b.moduleId];
  if (!page) return null;
  // Same split quranrevival.html's own bookmarkHref()/bookmarks.html use:
  // Quran carries a full settings snapshot worth restoring by id, every
  // other module reuses the Continue strip's own ?resume=<position>.
  return b.moduleId === "quranrevival"
    ? `${page}?bookmark=${encodeURIComponent(b.id)}`
    : `${page}?resume=${encodeURIComponent(b.position ?? "")}`;
}

function bookmarkLinkHtml(b) {
  const href = bookmarkHref(b);
  return href ? `<a class="nav-bm-link" href="${href}">${escapeHtml(b.name)}</a>` : "";
}

/** One collapsible group. `expanded` is the option's own value -- it decides the STARTING state only; tapping the summary still opens/shuts this one group afterwards. */
function groupHtml(icon, label, innerHtml, expanded, depth = 0) {
  if (!innerHtml) return ""; // nothing live in here -- no empty fold to click through for nothing
  return `<details class="nav-bm-folder"${expanded ? " open" : ""} style="margin-left:${depth * 0.6}rem;">
    <summary>${icon} ${escapeHtml(label)}</summary>
    ${innerHtml}
  </details>`;
}

// The Owner, 5 Oct 2026: "Enable a quick folder edit n handler to move
// folders here." Every folder row carries a drag handle (⠿, also moved by the
// arrow keys) and a rename pencil (✎), always on: being able to edit IS the
// condition, with no Edit mode to switch on first (this codebase's own "a mode
// toggle in front of a menu is one tap too many"). The handle reorders a
// folder among the folders sharing its parent; nesting a folder inside
// another stays on the Manage bookmarks page. Unlike groupHtml(), an EMPTY
// folder still gets a row here, so it can be renamed or moved too.
function folderNodeHtml(bookmarksDoc, folder, depth, expanded) {
  const items = bookmarksInFolder(bookmarksDoc, folder.id, { includeRemoved: false });
  const children = childFolders(bookmarksDoc, folder.id, { includeRemoved: false });
  const inner =
    items.map(bookmarkLinkHtml).join("") +
    children.map((f) => folderNodeHtml(bookmarksDoc, f, depth + 1, expanded)).join("");
  const name = escapeHtml(folder.name);
  return `<details class="nav-bm-folder" data-bm-folder-id="${escapeHtml(folder.id)}" data-bm-parent-id="${escapeHtml(folder.parentId ?? "")}"${expanded ? " open" : ""} style="margin-left:${depth * 0.6}rem;">
    <summary><span class="nav-bm-folder-head"><button type="button" class="nav-bm-handle" data-bm-folder-handle aria-label="${escapeHtml(t("Move folder"))}: ${name}" title="${escapeHtml(t("Move folder"))}">⠿</button><span class="nav-bm-folder-name">\u{1F4C1} <span data-bm-folder-label>${name}</span></span><button type="button" class="nav-bm-rename" data-bm-folder-rename aria-label="${escapeHtml(t("Rename folder"))}: ${name}" title="${escapeHtml(t("Rename folder"))}">✎</button></span></summary>
    ${inner}
  </details>`;
}

function personName(roster, personTagId) {
  const p = roster.find((r) => r.id === personTagId);
  // A tag whose person is no longer on the roster still renders -- with the
  // id itself rather than a blank heading, so the bookmarks under it are
  // never orphaned into an unlabelled group (I4).
  return p ? langText(p.name, getAppLang(), p.id) : personTagId;
}

function renderBookmarkList(bookmarksDoc, { expanded, groupBy, roster }) {
  if ((bookmarksDoc?.saved ?? []).filter((b) => !b.removed).length === 0) {
    return `<p class="nav-bm-empty">${t("No bookmarks yet.")}</p>`;
  }
  if (groupBy === "person") {
    const { untagged, groups } = groupBookmarksByPerson(bookmarksDoc, roster.map((p) => p.id));
    return (
      untagged.map(bookmarkLinkHtml).join("") +
      groups
        .map((g) => groupHtml("\u{1F464}", personName(roster, g.personTagId), g.bookmarks.map(bookmarkLinkHtml).join(""), expanded))
        .join("")
    );
  }
  // Bookmark-issues round -- "everything from one module," ignoring the
  // folder tree entirely. Headings come off MODULE_LABELS, translated at
  // render time the same way every other module chip in this app already
  // is (continue-strip.js's own renderContinueStrip()).
  if (groupBy === "module") {
    return groupBookmarksByModule(bookmarksDoc, Object.keys(MODULE_PAGES))
      .map((g) => groupHtml("\u{1F4D6}", MODULE_LABELS[g.moduleId] ? t(MODULE_LABELS[g.moduleId]) : g.moduleId, g.bookmarks.map(bookmarkLinkHtml).join(""), expanded))
      .join("");
  }
  return (
    unfiledBookmarks(bookmarksDoc, { includeRemoved: false }).map(bookmarkLinkHtml).join("") +
    rootFolders(bookmarksDoc, { includeRemoved: false })
      .map((f) => folderNodeHtml(bookmarksDoc, f, 0, expanded))
      .join("")
  );
}

/** The controls above the list. Rendered with the list (not once at mount) so they always show the current stored value even after another tab changed it.
    Fix round -- the owner's own report: choosing Expanded/Collapsed from a
    native <select> is genuinely TWO taps on a touchscreen (open the picker,
    then tap the option), which is exactly the "double tap" they meant by
    "we don't need double tap to change from collapse to expand and vice
    versa." Replaced with a single real toggle BUTTON, which needs only one
    tap and reads its own current/next state in its own label -- "if it is
    on collapse [i.e. currently showing Collapse-all, meaning it's expanded],
    one tap should enable it to expand [collapse everything] and vice versa."
    Same underlying getBookmarkMenuExpanded()/setBookmarkMenuExpanded()
    storage as before -- only the control shape changed, not the mechanism. */
function controlsHtml() {
  const expanded = getBookmarkMenuExpanded();
  const groupBy = getBookmarkMenuGroupBy();
  return `<div class="nav-bm-controls">
    <button type="button" class="nav-bm-expand-toggle" data-bm-nav-expand-toggle aria-pressed="${expanded ? "true" : "false"}">
      ${expanded ? "▾ " + t("Collapse all") : "▸ " + t("Expand all")}
    </button>
    <label class="nav-bm-control"><span>${t("Group by")}</span>
      <select data-bm-nav-groupby>
        ${BOOKMARK_GROUP_BYS.map((g) => `<option value="${g.id}" ${g.id === groupBy ? "selected" : ""}>${t(g.label)}</option>`).join("")}
      </select>
    </label>
  </div>`;
}

/**
 * Mounts the live dropdown into nav.js's own skeleton (`#navBookmarkList`
 * inside `.nav-cat-bookmark`). `getPersonId`/`getTenantId` are functions,
 * not plain values -- the active tenant/person can change after mount
 * (switching tenants, switching who's selected), and the next time the
 * category is opened should read whichever is current then, not whatever
 * was current at mount time. `getBookmarksDoc` is optional -- see this
 * file's own header comment for which pages should pass it. `getRoster` is
 * optional too: pages that already hold the tenant roster pass it so the
 * person-tag headings can be real names; the two that never load one
 * (about.html, taglines.html) leave it out and this file falls back to
 * fetching it, once, and only if someone actually selects person grouping.
 */
export function mountBookmarkMenu(navBarEl, { db, getTenantId, getPersonId, getBookmarksDoc = null, getRoster = null, onApplyPreset = null }) {
  const details = navBarEl.querySelector(".nav-cat-bookmark");
  const listEl = navBarEl.querySelector("#navBookmarkList");
  if (!details || !listEl) return;

  let loading = false;
  let fetchedRoster = null; // only ever populated on the fallback path below

  async function rosterNow(tenantId) {
    if (getRoster) return getRoster() ?? [];
    if (getBookmarkMenuGroupBy() !== "person") return []; // folder mode never needs names -- don't spend a read on it
    if (fetchedRoster) return fetchedRoster;
    try {
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const { TENANT } = await import("./collections.js");
      const snap = await getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", tenantId)));
      fetchedRoster = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return fetchedRoster;
    } catch {
      return []; // a heading falls back to the id -- see personName()
    }
  }

  // Issue #410 -- a page that can APPLY a saved Study-options preset (only
  // the Quran page today) passes onApplyPreset; every other page omits it and
  // sees no such group. Rows are buttons, not links: applying a preset changes
  // settings on the page the reader is already on.
  function presetsHtml(bookmarksDoc, expanded) {
    if (!onApplyPreset) return "";
    const rows = livePresets(bookmarksDoc)
      .map((p) => `<button type="button" class="nav-bm-link nav-bm-preset" data-bm-nav-preset="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>`)
      .join("");
    return groupHtml("☆", t("Saved settings"), rows, expanded);
  }

  function render(bookmarksDoc, roster) {
    listEl.innerHTML =
      controlsHtml() +
      `<p class="nav-bm-error" data-bm-nav-error role="alert" hidden></p>` +
      presetsHtml(bookmarksDoc, getBookmarkMenuExpanded()) +
      renderBookmarkList(bookmarksDoc, {
        expanded: getBookmarkMenuExpanded(),
        groupBy: getBookmarkMenuGroupBy(),
        roster,
      });
    wireControls(bookmarksDoc, roster);
  }

  // Changing either option re-renders from the SAME document already in
  // hand -- these are display choices, so there is nothing to re-fetch.
  //
  // Fix round -- the real cause behind the owner's own "double tap" report:
  // render() replaces listEl.innerHTML SYNCHRONOUSLY, inside the very click
  // handler that's still mid-dispatch -- which destroys the button/select
  // that was actually clicked. The click event then keeps bubbling (its own
  // default behaviour) up to nav.js's own outside-click-closes listener on
  // `document`, which checks `cat.contains(e.target)` -- but `e.target` is
  // now a DETACHED node from the old render, so `contains()` reads false and
  // the whole Bookmark dropdown closes on what looked like its own first
  // tap. e.stopPropagation() here is what actually fixes "one tap should
  // enable it to expand and vice versa" -- confirmed by reproducing the
  // dropdown genuinely closing without this, not assumed.
  function wireControls(bookmarksDoc, roster) {
    listEl.querySelectorAll("[data-bm-nav-preset]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        details.open = false;
        onApplyPreset?.(btn.dataset.bmNavPreset);
      });
    });
    listEl.querySelector("[data-bm-nav-expand-toggle]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setBookmarkMenuExpanded(!getBookmarkMenuExpanded());
      render(bookmarksDoc, roster);
    });
    wireFolderEdits(bookmarksDoc);
    listEl.querySelector("[data-bm-nav-groupby]")?.addEventListener("change", async (e) => {
      e.stopPropagation();
      setBookmarkMenuGroupBy(e.target.value);
      // Person mode may need names this page never loaded -- resolve them
      // before re-rendering, or the first switch would show bare ids once.
      render(bookmarksDoc, await rosterNow(getTenantId()));
    });
  }

  // I15 -- a failed write must reach the reader, in words, where they are.
  function showError(err) {
    const el = listEl.querySelector("[data-bm-nav-error]");
    if (!el) return;
    el.textContent = t("Couldn't save the folder change: {error}", { error: err?.code || err?.message || String(err) });
    el.hidden = false;
  }

  // The folder handle (drag, or ArrowUp/ArrowDown) and the rename pencil.
  // Both act on the DOM in place rather than re-rendering, so the control
  // under the finger is never detached mid-gesture (see the stopPropagation
  // note above).
  function wireFolderEdits(bookmarksDoc) {
    const siblingsOf = (row) => [...row.parentElement.children].filter((x) => x.matches?.("details[data-bm-folder-id]"));
    const save = async (row, before) => {
      const parentId = row.dataset.bmParentId || null;
      const order = siblingsOf(row).map((x) => x.dataset.bmFolderId);
      try {
        const folders = await saveFolderOrder(db, getTenantId(), getPersonId(), parentId, order);
        // The page's own copy (and the stub, which never mutates its data)
        // must show the new order the next time this menu opens.
        if (folders && bookmarksDoc) bookmarksDoc.folders = folders;
      } catch (err) {
        // Not saved: put the rows back, so the screen never shows an order
        // that is not the stored one, and say why.
        const parent = row.parentElement;
        const anchor = siblingsOf(row).at(-1)?.nextSibling ?? null;
        for (const el of before) parent.insertBefore(el, anchor);
        showError(err);
      }
    };
    listEl.querySelectorAll("[data-bm-folder-handle]").forEach((handle) => {
      const row = handle.closest("details[data-bm-folder-id]");
      // A handle inside a <summary> must not open/shut its folder.
      handle.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
      handle.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault(); e.stopPropagation();
        const sibs = siblingsOf(row); const i = sibs.indexOf(row);
        const j = e.key === "ArrowUp" ? i - 1 : i + 1;
        if (j < 0 || j >= sibs.length) return;
        const before = [...sibs];
        if (e.key === "ArrowUp") row.parentElement.insertBefore(row, sibs[j]); else sibs[j].after(row);
        handle.focus();
        save(row, before);
      });
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        // Followed on the DOCUMENT, not by pointer capture on the handle:
        // moving the row in the DOM (which is the whole point) drops a
        // capture, and the drag would stop after its first step.
        row.classList.add("nav-bm-dragging");
        const before = siblingsOf(row);
        let moved = false;
        const onMove = (ev) => {
          const sibs = siblingsOf(row).filter((x) => x !== row);
          const before = sibs.find((x) => { const r = x.querySelector("summary").getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          const target = before ?? null;
          if (target ? row.nextElementSibling !== target : sibs.at(-1)?.nextElementSibling !== row) {
            if (target) row.parentElement.insertBefore(row, target); else sibs.at(-1)?.after(row);
            moved = true;
          }
        };
        const onUp = (ev) => {
          ev?.preventDefault?.(); ev?.stopPropagation?.();
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp, true);
          document.removeEventListener("pointercancel", onUp, true);
          row.classList.remove("nav-bm-dragging");
          if (moved) save(row, before);
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, true);
        document.addEventListener("pointercancel", onUp, true);
      });
    });
    listEl.querySelectorAll("[data-bm-folder-rename]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const row = btn.closest("details[data-bm-folder-id]");
        const label = row.querySelector("[data-bm-folder-label]");
        if (row.querySelector("[data-bm-folder-input]")) return;
        const old = label.textContent;
        const input = document.createElement("input");
        input.type = "text"; input.value = old; input.className = "nav-bm-rename-input";
        input.setAttribute("data-bm-folder-input", ""); input.setAttribute("aria-label", t("Folder name"));
        label.hidden = true; label.after(input); input.focus(); input.select();
        let done = false;
        const finish = async (keep) => {
          if (done) return; done = true;
          const name = input.value.trim();
          input.remove(); label.hidden = false;
          if (!keep || !name || name === old) return;
          label.textContent = name;
          try {
            await renameFolder(db, getTenantId(), getPersonId(), row.dataset.bmFolderId, name);
            const f = bookmarksDoc?.folders?.find((x) => x.id === row.dataset.bmFolderId);
            if (f) f.name = name;
          } catch (err) { label.textContent = old; showError(err); }
        };
        // Typing in a <summary> must not toggle the folder, and Escape here
        // cancels the rename rather than closing the whole sheet (nav.js).
        input.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); });
        input.addEventListener("keydown", (ev) => {
          ev.stopPropagation();
          if (ev.key === " ") return; // a space is a character here, not a summary toggle
          if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
          if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
        });
        input.addEventListener("keyup", (ev) => { if (ev.key === " ") ev.preventDefault(); });
        input.addEventListener("blur", () => finish(true));
      });
    });
  }

  async function load() {
    const tenantId = getTenantId();
    const personId = getPersonId();
    if (!tenantId || !personId) {
      listEl.innerHTML = `<p class="nav-bm-empty">${t("No bookmarks yet.")}</p>`;
      return;
    }
    loading = true;
    listEl.innerHTML = `<p class="nav-bm-empty">${t("Loading…")}</p>`;
    try {
      const liveDoc = getBookmarksDoc ? await getBookmarksDoc() : null;
      const bookmarksDoc = liveDoc ?? (await getBookmarks(db, tenantId, personId));
      render(bookmarksDoc, await rosterNow(tenantId));
    } catch (err) {
      listEl.innerHTML = `<p class="nav-bm-empty">${t("No bookmarks yet.")}</p>`;
    } finally {
      loading = false;
    }
  }

  details.addEventListener("toggle", () => {
    if (details.open && !loading) load();
  });
}
