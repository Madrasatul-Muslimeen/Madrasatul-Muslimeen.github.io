// Audit part 35 (PCF MSA J29 j29p33): on a narrow screen a table scrolls sideways inside its own box
// (`display: block; overflow-x: auto`, or a wrapper div with `overflow-x: auto`), and Chrome does not
// scroll that box when the Tab key focuses a control only partly inside it -- the control stays cut at the
// box's edge. Bring the focused control fully into view inside its own scrolling box; nothing happens when
// the box is not scrolling sideways. Audit part 116: the box is found by its computed overflow, not by a
// class name, so a plain wrapper div (Taglines) is covered too. Works in RTL: scrollLeft is relative.
export function keepFocusInTables(root = document) {
  root.addEventListener("focusin", (e) => {
    const el = e.target;
    if (!(el instanceof Element) || !el.closest("table")) return;
    let box = el.parentElement;
    for (; box && box !== document.body; box = box.parentElement) {
      const ox = getComputedStyle(box).overflowX;
      if ((ox === "auto" || ox === "scroll") && box.scrollWidth > box.clientWidth + 1) break;
    }
    if (!box || box === document.body) return;
    const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.left >= b.left && r.right <= b.right) return;
    box.scrollLeft += r.right > b.right ? Math.min(r.right - b.right, r.left - b.left) : r.left - b.left;
  });
}
