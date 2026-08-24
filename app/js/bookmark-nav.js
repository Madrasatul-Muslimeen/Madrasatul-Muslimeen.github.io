// Fixes round (23 Aug 2026), items 2/3 -- the nav bar's own Bookmark
// category becomes a real, live dropdown of every bookmark, not just a
// single link into bookmarks.html. The owner's own words: "opening as a
// page is needed only when organising/edits... arrangements is required,"
// so the ordinary case -- jumping straight back to a saved spot -- should
// be reachable in the same two clicks that used to only open the category.
//
// I2: nav.js itself stays the pure renderer its own contract requires
// (renderBookmarkCategory() there emits only a skeleton -- a "Loading…"
// placeholder and the one link into the Manager page). This file is the
// Firebase-touching "mount" helper injected into that already-rendered DOM
// afterwards, the exact same seam js/lang-sync.js's own
// mountSyncedAppLangControl() already uses for the language picker.
//
// I9: nothing is fetched until the category is actually opened -- a
// `toggle` listener on the category's own <details>, not a call made at
// mount time.
//
// Two data sources, and the caller picks which one applies to it via the
// optional `getBookmarksDoc` (sync OR async -- awaited either way): every
// study page (topic-study.js/routine-study.js/asma-study.js,
// bookmarks.html) already loads and keeps patching its OWN `bookmarksDoc`
// in memory the moment a star is toggled or the Manager edits something --
// for those, this module reads that live copy straight back, for free (no
// read at all -- I9 in its strongest form) and with zero lag behind
// whatever just happened on the SAME page. quranrevival.html is the one
// exception among those: it loads `bookmarksDoc` LAZILY, only once the
// reading/note screen is actually opened (its own
// ensureAyahNoteDataLoaded(), a deliberate I9 choice of its own) -- so its
// `getBookmarksDoc` is an ASYNC function that ensures that load happens
// first, rather than a plain getter that could return the still-empty
// placeholder to someone who opens the nav dropdown from the wheel/landing
// view without ever having visited the reading screen. A page with no
// local copy at all (an admin screen that never otherwise touches
// bookmarks) omits `getBookmarksDoc` and falls back to a real
// `getBookmarks()` fetch, made fresh on every open -- the only source that
// can ever reflect a bookmark added on a different device or a different
// tab (item 4), since there is no local copy there to have gone stale.
//
// Grouping matches bookmarks.html exactly, because both read it off the
// same shared tree helpers (bookmarks.js's rootFolders/childFolders/
// bookmarksInFolder/unfiledBookmarks) -- unfiled bookmarks (grouped by
// module) are NOT behind a fold, so they stay one click away exactly as the
// owner asked for "when there are only a few bookmarks (before placing them
// [in] organised folders)"; each real folder is its own collapsible
// <details>, closed by default, so a person with many folders doesn't have
// to scroll past all of them to reach an unfiled bookmark either.

import { getBookmarks, rootFolders, childFolders, bookmarksInFolder, unfiledBookmarks } from "./bookmarks.js";
import { MODULE_PAGES } from "./continue-strip.js";
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

function folderNodeHtml(bookmarksDoc, folder, depth) {
  const items = bookmarksInFolder(bookmarksDoc, folder.id, { includeRemoved: false });
  const children = childFolders(bookmarksDoc, folder.id, { includeRemoved: false });
  const childrenHtml = children.map((f) => folderNodeHtml(bookmarksDoc, f, depth + 1)).join("");
  if (items.length === 0 && !childrenHtml) return ""; // nothing live in here -- no empty fold to click through for nothing
  return `<details class="nav-bm-folder" style="margin-left:${depth * 0.6}rem;">
    <summary>📁 ${escapeHtml(folder.name)}</summary>
    ${items.map(bookmarkLinkHtml).join("")}
    ${childrenHtml}
  </details>`;
}

function renderBookmarkList(bookmarksDoc) {
  const unfiled = unfiledBookmarks(bookmarksDoc, { includeRemoved: false });
  const folders = rootFolders(bookmarksDoc, { includeRemoved: false });
  if (unfiled.length === 0 && folders.length === 0) {
    return `<p class="nav-bm-empty">${t("No bookmarks yet.")}</p>`;
  }
  const unfiledHtml = unfiled.map(bookmarkLinkHtml).join("");
  const foldersHtml = folders.map((f) => folderNodeHtml(bookmarksDoc, f, 0)).join("");
  return unfiledHtml + foldersHtml;
}

/**
 * Mounts the live dropdown into nav.js's own skeleton (`#navBookmarkList`
 * inside `.nav-cat-bookmark`). `getPersonId`/`getTenantId` are functions,
 * not plain values -- the active tenant/person can change after mount
 * (switching tenants, switching who's selected), and the next time the
 * category is opened should read whichever is current then, not whatever
 * was current at mount time. `getBookmarksDoc` is optional -- see this
 * file's own header comment for which pages should pass it.
 */
export function mountBookmarkMenu(navBarEl, { db, getTenantId, getPersonId, getBookmarksDoc = null }) {
  const details = navBarEl.querySelector(".nav-cat-bookmark");
  const listEl = navBarEl.querySelector("#navBookmarkList");
  if (!details || !listEl) return;

  let loading = false;

  async function load() {
    const tenantId = getTenantId();
    const personId = getPersonId();
    if (!tenantId || !personId) {
      listEl.innerHTML = `<p class="nav-bm-empty">${t("No bookmarks yet.")}</p>`;
      return;
    }
    loading = true;
    listEl.innerHTML = `<p class="nav-bm-empty">${t("Loading…")}</p>`;
    const liveDoc = getBookmarksDoc ? await getBookmarksDoc() : null;
    if (liveDoc) {
      listEl.innerHTML = renderBookmarkList(liveDoc);
      loading = false;
      return;
    }
    try {
      const bookmarksDoc = await getBookmarks(db, tenantId, personId);
      listEl.innerHTML = renderBookmarkList(bookmarksDoc);
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
