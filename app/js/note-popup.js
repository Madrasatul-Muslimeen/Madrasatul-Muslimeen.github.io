// Note popup window -- PC-only resizable/draggable chrome for the Ayah Note
// screen (28 Aug 2026, owner's own ask: "make the NOTE VIEW to pop-up in PC
// with all the functions and features it has with it").
//
// Pure DOM (I2): no Firebase, no app-specific data, no Qur'an knowledge --
// this file only knows about pixels and localStorage. quranrevival.html
// wires it to the real #noteView element and real navigation/data.
//
// Geometry, the side-pane width and the list/card choice are all
// localStorage -- a per-viewer convenience (which window size/shape someone
// likes), the same additive shape every reading preference in this app has
// used since shell round 18 (Tajweed/WbW/Root ticks, the Arabic font,
// full-screen-hides...). No new startup read, no collection, no
// firestore.rules change: nothing here is read until the popup is actually
// opened, and even then it's a synchronous localStorage read, never network.

const GEOMETRY_KEY = "mm_note_popup_geometry";
const SIDE_WIDTH_KEY = "mm_note_popup_side_width";
const VIEW_MODE_KEY = "mm_note_popup_side_view"; // "list" | "card"

const MIN_WIDTH = 480;
const MIN_HEIGHT = 360;
const MIN_SIDE_WIDTH = 180;
const MAX_SIDE_WIDTH_RATIO = 0.6; // the side pane can never squeeze the main note area to nothing

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

function loadGeometry() {
  const saved = readJson(GEOMETRY_KEY);
  if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)
      && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
    return clampGeometry(saved);
  }
  return defaultGeometry();
}
function saveGeometry(g) { writeJson(GEOMETRY_KEY, g); }

export function loadSideWidth() {
  const saved = readJson(SIDE_WIDTH_KEY);
  return Number.isFinite(saved) ? Math.max(MIN_SIDE_WIDTH, saved) : 260;
}
export function saveSideWidth(w) { writeJson(SIDE_WIDTH_KEY, w); }

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

/**
 * Wires drag-to-move (via `dragHandleEl`), resize-from-any-edge/corner (via
 * `resizeHandleEls`, each carrying `data-note-resize="n"/"s"/"e"/"w"/"ne"/
 * "nw"/"se"/"sw"`), and maximize/restore (via `maximizeBtn`). Geometry
 * persists on pointerup, not on every move -- the same "don't write on every
 * pixel" restraint the side splitter below uses too.
 */
export function initPopupWindow(el, { dragHandleEl, resizeHandleEls = [], maximizeBtn, onMaximizeChange } = {}) {
  let geometry = loadGeometry();
  applyGeometry(el, geometry);
  let maximized = false;
  let preMaximizeGeometry = null;

  function commit(next, { persist = true } = {}) {
    geometry = next;
    applyGeometry(el, geometry);
    if (persist) saveGeometry(geometry);
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
      saveGeometry(geometry);
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
        saveGeometry(geometry);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  });

  maximizeBtn?.addEventListener("click", () => {
    if (maximized) {
      commit(preMaximizeGeometry ?? loadGeometry());
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
  window.addEventListener("resize", () => {
    if (maximized) { commit({ width: window.innerWidth - 24, height: window.innerHeight - 24, top: 12, left: 12 }, { persist: false }); return; }
    commit(clampGeometry(geometry), { persist: false });
  });
}

/** The side-pane/main splitter -- horizontal drag only, clamped between
 *  MIN_SIDE_WIDTH and a fraction of the popup's own current width so the
 *  main note area can never be squeezed to nothing. */
export function initSideSplitter(splitterEl, sideEl, { getContainerWidth }) {
  let width = loadSideWidth();
  sideEl.style.width = `${width}px`;
  splitterEl.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    splitterEl.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const containerWidth = getContainerWidth();
      const max = Math.max(MIN_SIDE_WIDTH, Math.round(containerWidth * MAX_SIDE_WIDTH_RATIO));
      width = Math.max(MIN_SIDE_WIDTH, Math.min(startWidth + (ev.clientX - startX), max));
      sideEl.style.width = `${width}px`;
    };
    const up = () => {
      splitterEl.removeEventListener("pointermove", move);
      splitterEl.removeEventListener("pointerup", up);
      saveSideWidth(width);
    };
    splitterEl.addEventListener("pointermove", move);
    splitterEl.addEventListener("pointerup", up);
  });
}
