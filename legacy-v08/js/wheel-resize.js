// Any-side drag-resize for a wheel -- generalizes the single bottom-right
// corner handle the QCR wheel introduced (28 Aug 2026) to all four corners
// and all four edges, and to every wheel in the app: the Mastery Wheel
// ("Approach"), Explore's own Quran-structure wheel, QCR's, and the Asma ul
// Husna wheel (2 Sep 2026).
//
// Pure DOM (I2): no Firebase, no app-specific data, no Qur'an knowledge --
// this module only knows about pointer events and pixels. quranrevival.html
// wires it to each real wheel's own resize-wrap element and its own
// prefs.js-backed size (getWheelSize/setWheelSize, keyed by a page-local
// id such as "approach"/"exploreQuran"/"qcr"/"asma").
//
// A wheel resize is ONE dimension (a plain pixel width; height follows via
// the wheel's own `height:auto`), not the four independent edges a popup
// WINDOW needs -- so, unlike note-popup.js's own resize handles, every
// direction here just produces a signed delta that grows or shrinks the
// SAME width, anchored on the wheel's own centre: dragging any of the 8
// handles outward (away from centre) grows it, dragging inward shrinks it.
//
// Pointer Events unify mouse/touch/pen in one code path (works on desktop,
// tablet and phone alike, per this project's own standing requirement) --
// setPointerCapture() on the handle itself is what lets pointermove/
// pointerup keep firing on IT even once the finger/cursor has moved off the
// small handle, which a corner-drag always does.

/**
 * Wires every element in `handleEls` (each carrying
 * `data-wheel-resize="n"/"s"/"e"/"w"/"ne"/"nw"/"se"/"sw"`) to grow/shrink a
 * single width value.
 *
 * `getStartWidth()` reads the wheel's own REAL current rendered width at the
 * moment a drag begins (never a guessed default -- the same rule the
 * original QCR handle used, so the very first drag ever never jumps the
 * wheel to an unrelated size). `getMaxWidth()` is re-read on every move, so
 * the wheel can never be dragged wider than whatever pane currently holds
 * it, whatever a stored min/max otherwise allow. `onResize(px)` is called
 * live, on every move; `onResizeEnd(px)` once, when the drag ends, which is
 * the only point a caller should persist the size (this file never touches
 * localStorage itself).
 */
export function wireWheelResize(handleEls, { getStartWidth, getMaxWidth, minWidth = 160, onResize, onResizeEnd }) {
  handleEls.forEach((handle) => {
    const dir = handle.dataset.wheelResize || "se";
    let dragging = false;
    let startX = 0, startY = 0, startWidth = 0;
    handle.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = getStartWidth();
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      // A corner is dragged diagonally -- averaging both axes reads as one
      // natural "make it bigger/smaller" gesture; an edge only ever grows
      // along its own axis. Each direction's sign is which way "outward"
      // (away from the wheel's own centre) points for that handle.
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let delta;
      switch (dir) {
        case "e": delta = dx; break;
        case "w": delta = -dx; break;
        case "s": delta = dy; break;
        case "n": delta = -dy; break;
        case "se": delta = (dx + dy) / 2; break;
        case "sw": delta = (-dx + dy) / 2; break;
        case "ne": delta = (dx - dy) / 2; break;
        case "nw": delta = (-dx - dy) / 2; break;
        default: delta = (dx + dy) / 2;
      }
      const max = Math.max(minWidth, getMaxWidth());
      const next = Math.min(max, Math.max(minWidth, startWidth + delta));
      onResize(next);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      onResizeEnd?.();
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  });
}
