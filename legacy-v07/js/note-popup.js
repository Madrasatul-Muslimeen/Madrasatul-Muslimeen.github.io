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

function defaultGeometry() {
  const width = Math.max(MIN_WIDTH, Math.min(920, Math.round(window.innerWidth * 0.86)));
  const height = Math.max(MIN_HEIGHT, Math.min(720, Math.round(window.innerHeight * 0.82)));
  return {
    width, height,
    top: Math.max(0, Math.round((window.innerHeight - height) / 2)),
    left: Math.max(0, Math.round((window.innerWidth - width) / 2)),
  };
}

function clampGeometry(g) {
  const width = Math.max(MIN_WIDTH, Math.min(g.width, window.innerWidth));
  const height = Math.max(MIN_HEIGHT, Math.min(g.height, window.innerHeight));
  // A window can never be dragged fully off-screen -- at least a corner
  // (120x60) always stays reachable to drag it back.
  const left = Math.max(0, Math.min(g.left, window.innerWidth - Math.min(width, 120)));
  const top = Math.max(0, Math.min(g.top, window.innerHeight - Math.min(height, 60)));
  return { width, height, top, left };
}

function loadGeometry(id) {
  const saved = readJson(geometryKeyFor(id));
  if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)
      && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
    return clampGeometry(saved);
  }
  return defaultGeometry();
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
 */
export function initPopupWindow(el, { id = "note", dragHandleEl, resizeHandleEls = [], maximizeBtn, onMaximizeChange } = {}) {
  let geometry = loadGeometry(id);
  let wasPopupViewport = isPopupViewport();
  if (wasPopupViewport) applyGeometry(el, geometry); else clearGeometry(el);
  let maximized = false;
  let preMaximizeGeometry = null;

  function commit(next, { persist = true } = {}) {
    geometry = next;
    applyGeometry(el, geometry);
    if (persist) saveGeometry(geometry, id);
  }

  dragHandleEl?.addEventListener("pointerdown", (e) => {
    if (maximized) return;
    if (e.target.closest("button, select, input, a")) return; // the title bar's own buttons stay clickable
    if (e.button !== undefined && e.button !== 0) return; // left-click/primary touch only
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, startGeom = { ...geometry };
    dragHandleEl.setPointerCapture(e.pointerId);
    const move = (ev) => {
      commit(clampGeometry({ ...startGeom, left: startGeom.left + (ev.clientX - startX), top: startGeom.top + (ev.clientY - startY) }), { persist: false });
    };
    const up = () => {
      dragHandleEl.removeEventListener("pointermove", move);
      dragHandleEl.removeEventListener("pointerup", up);
      saveGeometry(geometry, id);
    };
    dragHandleEl.addEventListener("pointermove", move);
    dragHandleEl.addEventListener("pointerup", up);
  });

  resizeHandleEls.forEach((handle) => {
    const dir = handle.dataset.noteResize ?? "";
    handle.addEventListener("pointerdown", (e) => {
      if (maximized) return;
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY, startGeom = { ...geometry };
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        let { width, height, top, left } = startGeom;
        if (dir.includes("e")) width = startGeom.width + dx;
        if (dir.includes("s")) height = startGeom.height + dy;
        if (dir.includes("w")) { width = startGeom.width - dx; left = startGeom.left + dx; }
        if (dir.includes("n")) { height = startGeom.height - dy; top = startGeom.top + dy; }
        commit(clampGeometry({ width, height, top, left }), { persist: false });
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        saveGeometry(geometry, id);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  });

  maximizeBtn?.addEventListener("click", () => {
    if (maximized) {
      commit(preMaximizeGeometry ?? loadGeometry(id));
      maximized = false;
    } else {
      preMaximizeGeometry = { ...geometry };
      commit({ width: window.innerWidth - 24, height: window.innerHeight - 24, top: 12, left: 12 }, { persist: false });
      maximized = true;
    }
    maximizeBtn.setAttribute("aria-pressed", maximized ? "true" : "false");
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
      if (!nowPopupViewport) { clearGeometry(el); return; }
      applyGeometry(el, clampGeometry(geometry));
      return;
    }
    if (!nowPopupViewport) return; // nothing to re-clamp -- no inline geometry to have drifted
    if (maximized) { commit({ width: window.innerWidth - 24, height: window.innerHeight - 24, top: 12, left: 12 }, { persist: false }); return; }
    commit(clampGeometry(geometry), { persist: false });
  });
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
