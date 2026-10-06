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
  groupBookmarksByModule, livePresets, renameFolder, saveFolderOrder, lastPlaceOf, lastActOf, markBookmarkUsed,
} from "./bookmarks.js";
import { MODULE_PAGES, MODULE_LABELS } from "./continue-strip.js";
import {
  getBookmarkMenuExpanded, setBookmarkMenuExpanded,
  getBookmarkMenuGroupBy, setBookmarkMenuGroupBy, BOOKMARK_GROUP_BYS, getAppLang,
} from "./prefs.js";
import { langText } from "./lang.js";
import { t, surahName, num } from "./i18n.js";

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

// The Owner, 5 Oct 2026: "Put a distinctive mark on each bookmark. Also put
// the date and time of the last act after each bookmark. Keep an option to
// show/hide timing." Every bookmark row carries 🔖 (folders keep 📁), and after
// its name the time it was last opened, changed or made (lastActOf()). The
// 🕘 Times button above the list shows or hides the times, per device.
const TIMES_KEY = "mmsa.bookmarkMenu.showTimes";
export function getBookmarkTimesShown() { try { return localStorage.getItem(TIMES_KEY) !== "0"; } catch { return true; } }
function setBookmarkTimesShown(on) { try { localStorage.setItem(TIMES_KEY, on ? "1" : "0"); } catch { /* private mode: it just doesn't stick */ } }
/** "5 Oct 2026, 20:40" -- in Bangla with Bangla digits and a 24-hour clock (the Note pane's own rule). */
export function bookmarkTimeText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return getAppLang() === "bn"
    ? new Intl.DateTimeFormat("bn-BD-u-nu-beng", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d)
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
let linkCtx = { doc: null, times: true }; // set by renderBookmarkList() for the rows it renders
function bookmarkLinkHtml(b) {
  const href = bookmarkHref(b);
  if (!href) return "";
  const at = linkCtx.times ? lastActOf(linkCtx.doc, b) : null;
  const when = at ? `<small class="nav-bm-when" data-bm-when>${escapeHtml(bookmarkTimeText(at))}</small>` : "";
  return `<a class="nav-bm-link nav-bm-item" data-bm-open-id="${escapeHtml(b.id)}" href="${href}"><span class="nav-bm-mark" aria-hidden="true">🔖</span><span class="nav-bm-name">${escapeHtml(b.name)}</span>${when}</a>`;
}

// The Owner, 5 Oct 2026: "Place a back button to go where bookmark is clicked
// from." Opening a bookmark (here, or Open on the Manage bookmarks page) keeps
// the page it was opened FROM in this tab's sessionStorage; the page it opens
// shows "← Back to <that page>" once, floating at the bottom-left above every window. Nothing is stored
// anywhere else.
const RETURN_KEY = "mmsa.bookmarkReturn";
const RETURN_MAX_MS = 6 * 60 * 60 * 1000;
function pageLabel() {
  const own = document.querySelector("h1")?.textContent?.trim();
  const title = (own || document.title.replace(/^QuranRevival\s*[—-]\s*/, "") || document.title).trim();
  return title.length > 40 ? `${title.slice(0, 39)}…` : title;
}
/**
 * Everything that happens when a bookmark is opened, before the browser goes
 * there: remember where it was opened from, and stamp its last-used time.
 * The stamp is not waited for beyond a moment -- with the app's offline cache
 * a write that has not reached the server yet is kept and sent on the next
 * page -- but a refusal that comes back in that moment is said in words (I15).
 * Resolves with the error sentence, or null.
 */
export async function noteBookmarkOpened(db, { tenantId, personId, bookmarkId, href }) {
  try {
    const to = new URL(href, location.href);
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ from: location.href, label: pageLabel(), toPath: to.pathname, at: Date.now() }));
  } catch { /* private mode: no Back button, the bookmark still opens */ }
  if (!tenantId || !personId || !bookmarkId) return null;
  let refused = null;
  const write = markBookmarkUsed(db, tenantId, personId, bookmarkId).catch((err) => { refused = err; });
  await Promise.race([write, new Promise((r) => setTimeout(r, 700))]);
  return refused ? t("The time this bookmark was opened was not saved: {error}", { error: refused?.code || refused?.message || String(refused) }) : null;
}
/** On the page a bookmark opened: "← Back to <page>", once, floating bottom-left. */
export function mountBookmarkBack(navBarEl) {
  let r = null;
  try { r = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null"); } catch { r = null; }
  if (!r || typeof r.from !== "string" || r.shown || Date.now() - (r.at || 0) > RETURN_MAX_MS) return null;
  if (r.toPath !== location.pathname || r.from === location.href) return null;
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ ...r, shown: true })); } catch { /* once is best-effort */ }
  return mountBackRow(`← ${t("Back to {page}", { page: r.label || t("the previous page") })}`, { href: r.from });
}

/**
 * The floating "← Back …" chip, shared (6 Oct 2026): a bookmark's return to the page it was opened from (above),
 * and, inside one page, a return to the window something was opened from (e.g. Explore opened from Know Your
 * Status). `href` makes it a link; `onBack` a button that removes the chip and calls back. ✕ only removes it.
 */
export function mountBackRow(text, { href = null, onBack = null, id = null } = {}) {
  if (id) document.getElementById(id)?.remove();
  const row = document.createElement("div");
  row.className = "bm-back-row";
  row.dataset.bmBack = "";
  if (id) row.id = id;
  const back = document.createElement(href ? "a" : "button");
  back.className = "bm-back";
  back.dataset.bmBackLink = "";
  if (href) back.href = href;
  else { back.type = "button"; back.addEventListener("click", () => { row.remove(); onBack?.(); }); }
  back.textContent = text;
  const x = document.createElement("button");
  x.type = "button"; x.className = "bm-back-x"; x.dataset.bmBackClose = "";
  x.textContent = "✕"; x.setAttribute("aria-label", t("Close")); x.title = t("Close");
  x.addEventListener("click", () => row.remove());
  row.append(back, x);
  document.body.appendChild(row);
  // Sit just above a bar fixed to the bottom of the screen (the Qur'an page's Study / Explore tabs), never on it.
  const lift = () => {
    row.style.visibility = "hidden";
    let top = window.innerHeight;
    for (const x of [16, window.innerWidth / 2]) {
      for (let el = document.elementFromPoint(x, window.innerHeight - 6); el && el !== document.body; el = el.parentElement) {
        const pos = getComputedStyle(el).position;
        if (pos === "fixed" || pos === "sticky") { top = Math.min(top, el.getBoundingClientRect().top); break; }
      }
    }
    row.style.bottom = top < window.innerHeight ? `${Math.round(window.innerHeight - top + 8)}px` : "";
    row.style.visibility = "";
  };
  lift();
  window.addEventListener("resize", lift);
  const gone = new MutationObserver(() => { if (!row.isConnected) { window.removeEventListener("resize", lift); gone.disconnect(); } });
  gone.observe(document.body, { childList: true });
  setTimeout(lift, 600); // after the page has laid itself out
  return row;
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
  linkCtx = { doc: bookmarksDoc, times: getBookmarkTimesShown() };
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
  const times = getBookmarkTimesShown();
  return `<div class="nav-bm-controls">
    <button type="button" class="nav-bm-expand-toggle" data-bm-nav-expand-toggle aria-pressed="${expanded ? "true" : "false"}">
      ${expanded ? "▾ " + t("Collapse all") : "▸ " + t("Expand all")}
    </button>
    <button type="button" class="nav-bm-expand-toggle nav-bm-times-toggle" data-bm-nav-times aria-pressed="${times ? "true" : "false"}" title="${escapeHtml(times ? t("Hide the times") : t("Show the times"))}">🕘 ${escapeHtml(times ? t("Hide times") : t("Show times"))}</button>
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
// The Owner, 5 Oct 2026: "Add a last read and last play button in bookmark."
// Two buttons at the top of the menu: 📖 Last read and ▶ Last played, each
// naming the place. On the Qur'an page (which passes onLastPlace) they act in
// place -- Play starts inside this same tap, as a browser requires; on every
// other page they are links into it (?last=read / ?last=play). With nothing
// saved yet, the button is still there and says so (a control that explains
// itself beats a missing one).
function lastPlacesHtml(bookmarksDoc, onLastPlace) {
  const one = (kind, icon, label, none) => {
    const p = lastPlaceOf(bookmarksDoc, kind);
    const where = p ? `${surahName(p.surahNum, p.surahNameEn ?? "")} ${num(p.surahNum)}:${num(p.ayahNum)}` : t(none);
    const inner = `<span class="nav-bm-last-icon" aria-hidden="true">${icon}</span><span class="nav-bm-last-text"><b>${escapeHtml(t(label))}</b><small>${escapeHtml(where)}</small></span>`;
    if (!p) return `<button type="button" class="nav-bm-last" data-bm-last="${kind}" disabled>${inner}</button>`;
    return onLastPlace
      ? `<button type="button" class="nav-bm-last" data-bm-last="${kind}">${inner}</button>`
      : `<a class="nav-bm-last" data-bm-last="${kind}" href="${MODULE_PAGES.quranrevival}?last=${kind}">${inner}</a>`;
  };
  return `<div class="nav-bm-lasts">${one("read", "📖", "Last read", "Nothing read yet")}${one("play", "▶", "Last played", "Nothing played yet")}</div>`;
}

export function mountBookmarkMenu(navBarEl, { db, getTenantId, getPersonId, getBookmarksDoc = null, getRoster = null, onApplyPreset = null, onLastPlace = null }) {
  const details = navBarEl.querySelector(".nav-cat-bookmark");
  const listEl = navBarEl.querySelector("#navBookmarkList");
  if (!details || !listEl) return;
  mountBookmarkBack(navBarEl);

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
      lastPlacesHtml(bookmarksDoc, onLastPlace) +
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
    listEl.querySelectorAll("button[data-bm-last]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        details.open = false;
        onLastPlace?.(btn.dataset.bmLast);
      });
    });
    listEl.querySelector("[data-bm-nav-times]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setBookmarkTimesShown(!getBookmarkTimesShown());
      render(bookmarksDoc, roster);
    });
    listEl.querySelectorAll("a[data-bm-open-id]").forEach((a) => {
      a.addEventListener("click", async (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return; // a new tab: the browser's own way
        e.preventDefault();
        const id = a.dataset.bmOpenId;
        const problem = await noteBookmarkOpened(db, { tenantId: getTenantId(), personId: getPersonId(), bookmarkId: id, href: a.href });
        const at = new Date().toISOString();
        if (!problem && bookmarksDoc) bookmarksDoc.usedAt = { ...(bookmarksDoc.usedAt ?? {}), [id]: at };
        if (problem) {
          const el = listEl.querySelector("[data-bm-nav-error]");
          if (el) { el.textContent = problem; el.hidden = false; }
          await new Promise((r) => setTimeout(r, 1500));
        }
        location.href = a.href;
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
