// Popup window chrome -- PC-only resizable/draggable window shell, built for
// the Ayah Note screen (28 Aug 2026, owner's own ask: "make the NOTE VIEW to
// pop-up in PC with all the functions and features it has with it") and,
// since 2 Sep 2026, reused verbatim for the Mastery Wheel ("Approach") and
// Explore stage views too -- same window mechanics, same drag/resize/
// maximize behaviour, just a different element and a different remembered
// geometry per view. Nothing about the mechanism itself is Note-specific;
// only the side-pane/splitter helpers at the bottom of this file are.
//
// Pure DOM (I2): no Firebase, no app-specific data, no Qur'an knowledge --
// this file only knows about pixels and localStorage. quranrevival.html
// wires it to the real popup elements and real navigation/data.
//
// Geometry, the side-pane width and the list/card choice are all
// localStorage -- a per-viewer convenience (which window size/shape someone
// likes), the same additive shape every reading preference in this app has
// used since shell round 18 (Tajweed/WbW/Root ticks, the Arabic font,
// full-screen-hides...). No new startup read, no collection, no
// firestore.rules change: nothing here is read until a popup is actually
// opened, and even then it's a synchronous localStorage read, never network.
//
// Each popup gets its own remembered geometry, keyed by the `id` passed to
// initPopupWindow() -- "note" (the default, preserving the exact storage
// key this file has always used, so nobody's already-saved Note window
// shape is lost) plus "wheel" and "explore" for the two views added
// 2 Sep 2026. Never share one key across views: a person may reasonably
// want the wheel popup small and the Note popup large.
//
// Same `id` pattern extended (2 Sep 2026, list resize/collapse round) to the
// SIDE LIST PANE every one of the four wheel/list contexts (Approach, QCR,
// Asma ul Husna, Explore's own Quran-structure drill) carries beside its own
// wheel -- initSideSplitter()/initListCollapse() below, keyed by "note"
// (the original, unchanged), "approach", "exploreQuran", "qcr", "asma".

import { homeRect, homeRectChosen, setHomeRect, SHARED as HOME_SHARED } from "./home-window.js";

const GEOMETRY_KEY = "mm_note_popup_geometry";
const SIDE_WIDTH_KEY = "mm_note_popup_side_width";
const VIEW_MODE_KEY = "mm_note_popup_side_view"; // "list" | "card"

function geometryKeyFor(id) {
  return id === "note" ? GEOMETRY_KEY : `mm_${id}_popup_geometry`;
}
function sideWidthKeyFor(id) {
  return id === "note" ? SIDE_WIDTH_KEY : `mm_${id}_side_width`;
}
function listCollapsedKeyFor(id) {
  return `mm_${id}_list_collapsed`;
}

const MIN_WIDTH = 480;
const MIN_HEIGHT = 360;
const MIN_SIDE_WIDTH = 180;
const MAX_SIDE_WIDTH_RATIO = 0.6; // the side pane can never squeeze the main note area to nothing

// Same breakpoint as quranrevival.html's own `@media (min-width: 900px)`
// block, which is the ONLY place #noteView actually becomes a floating,
// position:fixed popup window -- below it, #noteView is an ordinary flex
// item in the page's own column layout and must never carry inline
// width/height/top/left at all (28 Aug 2026 fix: the popup's own MIN_WIDTH
// of 480px was being applied as an inline style unconditionally, on every
// viewport, which forced #noteView to 480px wide on a phone regardless of
// the CSS breakpoint -- a real horizontal-overflow bug, not cosmetic).
const POPUP_QUERY = "(min-width: 900px)";
function isPopupViewport() {
  return typeof window.matchMedia === "function" ? window.matchMedia(POPUP_QUERY).matches : window.innerWidth >= 900;
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing / storage disabled -- the window still works for this
    // load, it just won't remember its shape next time. Not fatal.
  }
}

// Audit part 1 (PCF J29, fix 5): `topInset` is the y a window may not OPEN above -- the Mastery Wheel and Explore
// windows opened at y 90 on a 900px-tall screen, over the lower third of the Home / Modules / Operation / Bookmark row
// (y 71-99). Only the OPENING position honours it (default or remembered); a reader who drags a window up there on
// purpose keeps what they did.
function insetOf(topInset) {
  const n = typeof topInset === "function" ? topInset() : topInset;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function defaultGeometry(minW = MIN_WIDTH, minH = MIN_HEIGHT, maxW = 920, topInset = 0, bottomInset = 0) {
  const inset = insetOf(topInset);
  // The window also opens clear of the bottom dock (its z-index is below #dock's, so a window dropped lower than the
  // dock's top edge would be cut by it) -- moving the top down by the nav row's growth must not push the bottom under it.
  const floor = inset ? window.innerHeight - insetOf(bottomInset) - 8 : window.innerHeight;
  const width = Math.max(minW, Math.min(maxW, Math.round(window.innerWidth * 0.86)));
  const height = Math.max(minH, Math.min(720, Math.round(window.innerHeight * 0.82), floor - inset));
  return {
    width, height,
    top: Math.max(inset, Math.min(Math.round((window.innerHeight - height) / 2), floor - height)),
    left: Math.max(0, Math.round((window.innerWidth - width) / 2)),
  };
}

function clampGeometry(g, minW = MIN_WIDTH, minH = MIN_HEIGHT) {
  const width = Math.max(minW, Math.min(g.width, window.innerWidth));
  const height = Math.max(minH, Math.min(g.height, window.innerHeight));
  // A window can never be dragged fully off-screen -- at least a corner
  // (120x60) always stays reachable to drag it back.
  const left = Math.max(0, Math.min(g.left, window.innerWidth - Math.min(width, 120)));
  const top = Math.max(0, Math.min(g.top, window.innerHeight - Math.min(height, 60)));
  return { width, height, top, left };
}

// PCF MSA J44 (the Owner, 20 Oct 2026: "I want always the app starts with this page setting (mostly size of the pop
// up and the wheel) in PC even after a new version"): a window opened with `fill` takes the whole space between the
// top inset (the menu row) and the bottom inset (the dock), with a small side margin, and opens that way at EVERY
// start -- never from a size stored by an earlier visit, because browser storage is exactly what a new browser, a
// cleared profile or a reset office computer loses. A resize still lasts for the rest of the visit.
function fillGeometry(minW = MIN_WIDTH, minH = MIN_HEIGHT, topInset = 0, bottomInset = 0) {
  const inset = insetOf(topInset);
  const floor = window.innerHeight - insetOf(bottomInset) - 8;
  const side = Math.max(16, Math.round(window.innerWidth * 0.02));
  const width = Math.max(minW, window.innerWidth - 2 * side);
  const height = Math.max(minH, floor - inset);
  return { width, height, top: inset, left: Math.max(0, Math.round((window.innerWidth - width) / 2)) };
}

function loadGeometry(id, minW = MIN_WIDTH, minH = MIN_HEIGHT, maxW = 920, topInset = 0, bottomInset = 0) {
  const saved = readJson(geometryKeyFor(id));
  if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)
      && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
    const g = clampGeometry(saved, minW, minH);
    const inset = insetOf(topInset);
    return inset && g.top < inset ? clampGeometry({ ...g, top: inset }, minW, minH) : g;
  }
  return defaultGeometry(minW, minH, maxW, topInset, bottomInset);
}
function saveGeometry(g, id) { writeJson(geometryKeyFor(id), g); }

// `null` means "nothing stored yet" -- distinct from a genuine 260, which
// matters below: initSideSplitter() must never apply an inline width to a
// pane that has never been dragged, or a context whose own CSS default is
// something OTHER than 260 (QCR/Asma's 44%, the Mastery Wheel/Explore
// sidebar's own 260-460px range) would silently jump to 260px the instant
// this module loads, on every device, before anyone ever touched a handle.
function readStoredSideWidth(id) {
  const saved = readJson(sideWidthKeyFor(id));
  return Number.isFinite(saved) ? Math.max(MIN_SIDE_WIDTH, saved) : null;
}
export function loadSideWidth(id = "note") {
  // Kept for the one existing "note" caller's own historical shape (a
  // default of 260 either way, which is also literally what .note-popup-side
  // itself already defaults to in CSS, so applying it inline changes
  // nothing) -- new callers should read initSideSplitter()'s own behaviour
  // instead of calling this directly.
  return readStoredSideWidth(id) ?? 260;
}
export function saveSideWidth(w, id = "note") { writeJson(sideWidthKeyFor(id), w); }

function applySideWidth(sideEl, width) {
  // flex-basis (not `width` alone) is what actually governs a flex child's
  // main-axis size once its own CSS sets `flex` to anything other than
  // `0 0 auto` -- QCR/Asma's own list pane is `flex: 0 0 44%` at >=900px, so
  // a plain `style.width` there would be silently overruled by that 44%
  // flex-basis. `flex: 0 0 <px>` pins it outright; max-width is set
  // alongside it because a stray `max-width: 44%` CSS rule (again QCR/Asma)
  // would otherwise still clamp the box even once flex-basis says otherwise.
  sideEl.style.flex = "0 0 auto";
  sideEl.style.width = `${width}px`;
  sideEl.style.maxWidth = `${width}px`;
}

export function loadListCollapsed(id) {
  try {
    return localStorage.getItem(listCollapsedKeyFor(id)) === "1";
  } catch {
    return false;
  }
}
export function saveListCollapsed(id, collapsed) {
  try {
    localStorage.setItem(listCollapsedKeyFor(id), collapsed ? "1" : "0");
  } catch {
    // Same tolerance as writeJson above.
  }
}

/**
 * Wires a persistent collapse/expand toggle for a side list pane. `btn` is
 * expected to live OUTSIDE `sideEl` (on the splitter, so it stays reachable
 * even while the pane it controls is hidden) -- collapsing just sets
 * `sideEl.style.display = "none"`, which is what a flex sibling (the wheel
 * pane) already needs to naturally grow into the freed space with zero
 * extra CSS, the same way any flex item does once a sibling drops out of
 * flow. An inline style, not the `hidden` attribute/property, on purpose:
 * several of these panes already carry an ID-scoped `display:flex` rule of
 * their own (e.g. `#wheelSection .wheel-sidebar`) that outranks the UA's
 * plain `[hidden]` rule by specificity -- the exact trap this codebase has
 * hit and fixed repeatedly elsewhere (v07.55, v07.61...) -- an inline style
 * always wins regardless, so there is no trap to fall into here.
 * `onChange(collapsed)` is where the caller updates its own translated
 * title/aria-label text (this file stays translation-free, per its own
 * "no app-specific data" contract).
 */
export function initListCollapse(btn, sideEl, id, { onChange } = {}) {
  function apply(collapsed) {
    sideEl.style.display = collapsed ? "none" : "";
    btn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    btn.classList.toggle("collapsed", collapsed);
    onChange?.(collapsed);
  }
  apply(loadListCollapsed(id));
  btn.addEventListener("click", () => {
    const next = sideEl.style.display !== "none";
    saveListCollapsed(id, next);
    apply(next);
  });
}

export function loadSideViewMode() {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "card" ? "card" : "list";
  } catch {
    return "list";
  }
}
export function saveSideViewMode(mode) {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode === "card" ? "card" : "list");
  } catch {
    // Same tolerance as writeJson above.
  }
}

function applyGeometry(el, g) {
  el.style.width = `${g.width}px`;
  el.style.height = `${g.height}px`;
  el.style.top = `${g.top}px`;
  el.style.left = `${g.left}px`;
}
// The phone/tablet layout owns these four properties entirely (plain flex
// flow) -- clearing them, not merely leaving them unset, is what lets a
// browser resized from wide to narrow (or a phone that loaded once with a
// stale inline style) fall back to it.
function clearGeometry(el) {
  el.style.width = "";
  el.style.height = "";
  el.style.top = "";
  el.style.left = "";
}

/**
 * Wires drag-to-move (via `dragHandleEl`), resize-from-any-edge/corner (via
 * `resizeHandleEls`, each carrying `data-note-resize="n"/"s"/"e"/"w"/"ne"/
 * "nw"/"se"/"sw"`), and maximize/restore (via `maximizeBtn`). Geometry
 * persists on pointerup, not on every move -- the same "don't write on every
 * pixel" restraint the side splitter below uses too.
 *
 * `id` picks which remembered geometry this window uses -- defaults to
 * "note" so every existing call site (just the Ayah Note screen, until
 * 2 Sep 2026) keeps reading/writing the exact key it always has. Pass
 * "wheel" or "explore" to give the Mastery Wheel / Explore popups their own,
 * independent remembered shape.
 *
 * `minWidth`/`minHeight` (v08.20) let ONE caller float smaller than the
 * 480x360 every stage view uses. The Word Card is a card, not a stage view,
 * and 480x360 is most of a laptop's height for three lines of Arabic. Both
 * default to the shared constants, so every existing call site keeps the
 * exact floor it has always had.
 *
 * `dragFromSelector` (v08.20) restricts which part of `dragHandleEl` starts a
 * drag. The Word Card's own header is rewritten on every tab switch, so it
 * cannot BE the handle (the listener would die with it) -- the static mount
 * is the handle, and this selector is what keeps a drag to the header the
 * owner actually asked to drag by. Omitted, the whole handle drags, exactly
 * as the four stage views already do.
 */
export function initPopupWindow(el, { id = "note", dragHandleEl, resizeHandleEls = [], maximizeBtn, onMaximizeChange, minWidth = MIN_WIDTH, minHeight = MIN_HEIGHT, dragFromSelector = null, defaultMaxWidth = 920, topInset = 0, bottomInset = 0, fill = false, home = null } = {}) {
  // J44: with `fill`, the opening size is fillGeometry() at every start; `touched` is this visit's own drag/resize.
  // PCF MSA J72 `home`: "self" -- this IS the home window (the landing screen's), whose rect every pop-up shares
  // (home-window.js); "follow" -- this window opens at the home rect. A rect the reader chose is the home window's
  // opening place too (J44's fill stays the first-ever opening).
  // The shared rect is the window's OUTSIDE edge (what the eye compares): geometry is the CSS width/height, so a
  // window with padding or a border (content-box) adds them, measured, never assumed.
  const extra = () => {
    const cs = getComputedStyle(el);
    if (cs.boxSizing === "border-box") return { w: 0, h: 0 };
    const n = (v) => parseFloat(v) || 0;
    return { w: n(cs.paddingLeft) + n(cs.paddingRight) + n(cs.borderLeftWidth) + n(cs.borderRightWidth), h: n(cs.paddingTop) + n(cs.paddingBottom) + n(cs.borderTopWidth) + n(cs.borderBottomWidth) };
  };
  const toRect = (g) => { const x = extra(); return { x: g.left, y: g.top, w: g.width + x.w, h: g.height + x.h }; };
  const fromHome = () => { const r = homeRect(); if (!r) return null; const x = extra(); return clampGeometry({ left: r.x, top: r.y, width: Math.round(r.w - x.w), height: Math.round(r.h - x.h) }, minWidth, minHeight); };
  let touched = home === "self" && homeRectChosen();
  const openingGeometry = () => ((home === "follow" || (home === "self" && homeRectChosen())) && fromHome()) || (fill
    ? fillGeometry(minWidth, minHeight, topInset, bottomInset)
    : loadGeometry(id, minWidth, minHeight, defaultMaxWidth, topInset, bottomInset));
  let geometry = openingGeometry();
  let wasPopupViewport = isPopupViewport();
  if (wasPopupViewport) applyGeometry(el, geometry); else clearGeometry(el);
  let maximized = false;
  let preMaximizeGeometry = null;

  // PCF MSA J72 (the Owner, 22 Oct 2026: "Enable it resizeable from all side and all corners"): measured, the bottom and
  // right edges of the Mastery Wheel window did nothing -- the handles were children of a window that scrolls, so the
  // bottom one scrolled away with the contents and the scrollbar sat over the right one. The handles now live in a
  // frame of their own laid exactly over the window's edge (position: fixed, one step above it, transparent to every
  // click except on the handles), so no content of the window can cover them.
  const frame = document.createElement("div");
  frame.className = "popup-win-frame";
  frame.dataset.popupWinFrame = id;
  resizeHandleEls.forEach((h) => frame.appendChild(h));
  if (resizeHandleEls.length) document.body.appendChild(frame);
  let shownBefore = false;
  function syncFrame() {
    const r = el.getBoundingClientRect();
    const shown = r.width > 0 && r.height > 0;
    if (shown && !shownBefore) { shownBefore = true; onShown(); } // a follower just came into sight
    shownBefore = shown;
    if (!resizeHandleEls.length) return;
    const on = isPopupViewport() && !maximized && shown && getComputedStyle(el).visibility !== "hidden";
    if (!on) { frame.style.display = "none"; return; }
    const z = parseInt(getComputedStyle(el).zIndex, 10);
    Object.assign(frame.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, zIndex: String((Number.isFinite(z) ? z : 0) + 1) });
  }
  {
    new ResizeObserver(syncFrame).observe(el); // shown, hidden (a size of 0) or resized by its own contents
    new MutationObserver(syncFrame).observe(el, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
    // shown or hidden by an ancestor (a stage view switched) without the window's own attributes changing
    new MutationObserver(syncFrame).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["hidden", "class"] });
    requestAnimationFrame(syncFrame);
  }

  function commit(next, { persist = true } = {}) {
    geometry = next;
    applyGeometry(el, geometry);
    syncFrame();
    if (persist) saveGeometry(geometry, id);
    if (home === "self" && !maximized && isPopupViewport()) setHomeRect(toRect(geometry), { from: "home", user: touched });
  }
  function remember() {
    touched = true; saveGeometry(geometry, id);
    if (home) setHomeRect(toRect(geometry), { from: home === "self" ? "home" : "popup", user: true });
  }
  // J72: a follower shown again takes the home rect again (with SHARED, whatever it was itself last given).
  function onShown() {
    if (!home || maximized || !isPopupViewport() || (touched && !HOME_SHARED)) return;
    if (home === "self" && !(HOME_SHARED && homeRectChosen())) return; // the home window follows only a rect the reader chose
    const g = fromHome();
    if (g && (g.left !== geometry.left || g.top !== geometry.top || g.width !== geometry.width || g.height !== geometry.height)) commit(g, { persist: false });
  }
  if (home === "self" && isPopupViewport()) setHomeRect(toRect(geometry), { from: "home", user: touched });

  dragHandleEl?.addEventListener("pointerdown", (e) => {
    if (maximized) return;
    if (e.target.closest("button, select, input, a")) return; // the title bar's own buttons stay clickable
    if (dragFromSelector && !e.target.closest(dragFromSelector)) return; // v08.20: only the named part of the handle drags
    if (e.button !== undefined && e.button !== 0) return; // left-click/primary touch only
    e.preventDefault();
    touched = true; // J44: the reader's own drag from its first move, so a re-fit never fights it
    const startX = e.clientX, startY = e.clientY, startGeom = { ...geometry };
    dragHandleEl.setPointerCapture(e.pointerId);
    const move = (ev) => {
      commit(clampGeometry({ ...startGeom, left: startGeom.left + (ev.clientX - startX), top: startGeom.top + (ev.clientY - startY) }, minWidth, minHeight), { persist: false });
    };
    const up = () => {
      dragHandleEl.removeEventListener("pointermove", move);
      dragHandleEl.removeEventListener("pointerup", up);
      remember();
    };
    dragHandleEl.addEventListener("pointermove", move);
    dragHandleEl.addEventListener("pointerup", up);
  });

  resizeHandleEls.forEach((handle) => {
    const dir = handle.dataset.noteResize ?? "";
    handle.addEventListener("pointerdown", (e) => {
      if (maximized) return;
      e.preventDefault();
      touched = true; // J44: as above
      const startX = e.clientX, startY = e.clientY, startGeom = { ...geometry };
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        let { width, height, top, left } = startGeom;
        if (dir.includes("e")) width = startGeom.width + dx;
        if (dir.includes("s")) height = startGeom.height + dy;
        if (dir.includes("w")) { width = startGeom.width - dx; left = startGeom.left + dx; }
        if (dir.includes("n")) { height = startGeom.height - dy; top = startGeom.top + dy; }
        commit(clampGeometry({ width, height, top, left }, minWidth, minHeight), { persist: false });
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        remember();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  });

  maximizeBtn?.addEventListener("click", () => {
    if (maximized) {
      commit(preMaximizeGeometry ?? openingGeometry(), { persist: !fill });
      maximized = false;
    } else {
      preMaximizeGeometry = { ...geometry };
      commit({ width: window.innerWidth - 24, height: window.innerHeight - 24, top: 12, left: 12 }, { persist: false });
      maximized = true;
    }
    maximizeBtn.setAttribute("aria-pressed", maximized ? "true" : "false");
    syncFrame();
    onMaximizeChange?.(maximized);
  });

  // A window resize (not a drag/resize gesture, the BROWSER window itself)
  // must never leave the popup partly off-screen or bigger than the
  // viewport -- re-clamp, but don't treat this as a new "remembered" size.
  // Crossing the popup breakpoint itself (a tablet rotated, a desktop
  // window dragged narrow) has to be handled first: below it, #noteView
  // must carry no inline geometry at all (mobile/tablet own the layout via
  // plain CSS); at or above it, the popup's own remembered geometry applies.
  window.addEventListener("resize", () => {
    const nowPopupViewport = isPopupViewport();
    if (nowPopupViewport !== wasPopupViewport) {
      wasPopupViewport = nowPopupViewport;
      if (!nowPopupViewport) { clearGeometry(el); syncFrame(); return; }
      applyGeometry(el, clampGeometry(geometry, minWidth, minHeight));
      syncFrame();
      return;
    }
    if (!nowPopupViewport) return; // nothing to re-clamp -- no inline geometry to have drifted
    if (maximized) { commit({ width: window.innerWidth - 24, height: window.innerHeight - 24, top: 12, left: 12 }, { persist: false }); return; }
    if (fill && !touched) { commit(fillGeometry(minWidth, minHeight, topInset, bottomInset), { persist: false }); return; }
    commit(clampGeometry(geometry, minWidth, minHeight), { persist: false });
  });

  // audit14: the insets can be unmeasurable when the window is first sized (the dock has no height yet), so a window
  // that has never been moved is sized again, once its insets can be read, each time it is shown. A remembered
  // (dragged or resized) geometry is the reader's own and is never touched.
  return {
    refit() {
      if (maximized || !isPopupViewport()) return;
      if (home === "follow" || (home === "self" && homeRectChosen())) { onShown(); return; }
      if (fill) { if (!touched) commit(fillGeometry(minWidth, minHeight, topInset, bottomInset), { persist: false }); return; }
      if (readJson(geometryKeyFor(id))) return;
      commit(defaultGeometry(minWidth, minHeight, defaultMaxWidth, topInset, bottomInset), { persist: false });
    },
  };
}

/** The side-pane/main splitter -- horizontal drag only, clamped between
 *  MIN_SIDE_WIDTH and a fraction of the popup's own current width so the
 *  main note area can never be squeezed to nothing.
 *
 *  `id` (2 Sep 2026) picks which remembered width this splitter uses --
 *  defaults to "note", the one original caller, so its own key is
 *  untouched. Nothing is applied at init unless a width is genuinely
 *  stored for this id (see readStoredSideWidth's own comment) -- a fresh
 *  QCR/Asma/Approach/Explore pane keeps its own CSS default exactly as it
 *  always has, until the reader drags it at least once. `sideEl` may
 *  legitimately be collapsed (display:none, via initListCollapse above) --
 *  the splitter still renders and its own embedded toggle button stays
 *  live, but a drag on the bar itself is a no-op while there is nothing
 *  visible to resize. */
export function initSideSplitter(splitterEl, sideEl, { getContainerWidth, id = "note" }) {
  let width = readStoredSideWidth(id);
  if (width != null) applySideWidth(sideEl, width);
  splitterEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return; // the embedded collapse toggle stays clickable
    if (sideEl.style.display === "none") return; // collapsed -- nothing to resize
    e.preventDefault();
    const startX = e.clientX;
    // The very first-ever drag reads the pane's own REAL current rendered
    // width as its starting point (never a guessed 260) -- the same rule
    // wheel-resize.js's own getStartWidth() already follows, so dragging
    // never jumps a QCR/Asma/Approach/Explore pane to an unrelated size on
    // its first touch.
    const startWidth = width ?? sideEl.getBoundingClientRect().width;
    splitterEl.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const containerWidth = getContainerWidth();
      const max = Math.max(MIN_SIDE_WIDTH, Math.round(containerWidth * MAX_SIDE_WIDTH_RATIO));
      width = Math.max(MIN_SIDE_WIDTH, Math.min(startWidth + (ev.clientX - startX), max));
      applySideWidth(sideEl, width);
    };
    const up = () => {
      splitterEl.removeEventListener("pointermove", move);
      splitterEl.removeEventListener("pointerup", up);
      saveSideWidth(width, id);
    };
    splitterEl.addEventListener("pointermove", move);
    splitterEl.addEventListener("pointerup", up);
  });
}
