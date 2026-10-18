// Audit part 35 (PCF MSA J29 j29p33): on a narrow screen a table scrolls sideways inside its own box
// (`display: block; overflow-x: auto`), and Chrome does not scroll that box when the Tab key focuses a
// button only partly inside it -- the button stays cut at the box's edge. Bring the focused control fully
// into view inside its own scrolling table; nothing happens when the table is not scrolling sideways.
export function keepFocusInTables(root = document) {
  root.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    const box = el.closest("table, .table-wrap");
    if (!box || box.scrollWidth <= box.clientWidth + 1) return;
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.left >= b.left && r.right <= b.right) return;
    box.scrollLeft += r.right > b.right ? Math.min(r.right - b.right, r.left - b.left) : r.left - b.left;
  });
}
