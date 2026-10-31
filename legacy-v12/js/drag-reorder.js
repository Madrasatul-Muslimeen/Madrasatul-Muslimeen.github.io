// Generic pointer-based list-reorder -- I2, pure DOM, no Firebase, no app
// data. Built for quranrevival.html's Explore -> Asma ul Husna panel (2 Sep
// 2026, owner's own ask: reposition a Group, or a Name within a Group, by
// dragging it in the list) -- one mechanism, reused for both the Groups
// list and the Names-in-a-group list.
//
// Pointer Events, not native HTML5 drag-and-drop (dragstart/dragover): this
// project's own convention for anything that must work identically on
// mouse, touch and pen (note-popup.js's window drag/resize, wheel-resize.js,
// the QCR/Asma side splitters) -- HTML5 DnD has patchy, inconsistent touch
// support across mobile browsers, which this app's own phone/tablet
// requirement rules out outright.
//
// `container`: the element whose direct children matching `rowSelector` are
// the rows to reorder (they must be siblings of each other -- every caller
// of this file renders a flat list of rows via one innerHTML assignment, so
// that always holds here). `handleSelector`: the small grip element inside
// each row that starts a drag, so tapping the row's own button/select
// controls never also starts reordering it. `getKey(row)`: reads a row's
// own stable identity for the `onReorder` callback. `onReorder(orderedKeys)`
// fires once, on drop, with every row's key in its new order -- the caller
// decides what that means (a collection's own `order`, or one group's own
// `items` order).
//
// Pointer capture is taken on `container`, NOT on the small handle inside
// the row being dragged -- found by testing, not assumed: moving `row`
// itself via insertBefore()/appendChild() during the drag (needed for the
// live reorder preview) reparents the handle along with it, and a captured
// element that gets removed-and-reinserted -- which is what insertBefore
// does internally even when the net position barely changes -- has its
// pointer capture silently released by the browser, so every pointermove
// after the FIRST one stopped reaching a handle-captured listener. `container`
// itself is never moved during a within-list reorder, so capturing there
// keeps every subsequent pointermove/pointerup reaching this code for the
// whole gesture, however many rows get reshuffled along the way.
//
// Deliberately re-wired on every call rather than surviving one -- matching
// the convention every other per-render handler in this file's own callers
// already uses (attach a fresh listener each time innerHTML is replaced). A
// stale closure over now-detached DOM nodes would silently do nothing.
export function wireDragReorder(container, { rowSelector, handleSelector, getKey, onReorder }) {
  if (!container) return;
  const rows = () => Array.from(container.querySelectorAll(rowSelector));

  container.querySelectorAll(handleSelector).forEach((handle) => {
    const row = handle.closest(rowSelector);
    if (!row) return;

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return; // left-click / primary touch only
      e.preventDefault();
      container.setPointerCapture(e.pointerId);
      row.classList.add("drag-reorder-active");

      const move = (ev) => {
        const y = ev.clientY;
        // The classic "sortable list" placement rule: find the first OTHER
        // row (in current DOM order, so this stays correct after every
        // previous move already re-arranged things) whose own vertical
        // midpoint the pointer is still above, and put the dragged row
        // right before it -- or at the very end if the pointer is below
        // every other row's midpoint. Idempotent for a held Y position, so
        // it never oscillates.
        let target = null;
        for (const other of rows()) {
          if (other === row) continue;
          const rect = other.getBoundingClientRect();
          if (y < rect.top + rect.height / 2) { target = other; break; }
        }
        if (target) container.insertBefore(row, target);
        else container.appendChild(row);
      };
      const up = () => {
        container.removeEventListener("pointermove", move);
        container.removeEventListener("pointerup", up);
        container.removeEventListener("pointercancel", up);
        row.classList.remove("drag-reorder-active");
        onReorder(rows().map(getKey));
      };
      container.addEventListener("pointermove", move);
      container.addEventListener("pointerup", up);
      container.addEventListener("pointercancel", up);
    });
  });
}
