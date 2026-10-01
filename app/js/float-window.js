// The drag / resize mechanism of a floating window, shared by the Mapping My
// Journey tray (journey-tray.js) and the Note pop-up windows (journey-map.html,
// Siyagah port round 6a). One implementation: eight resize handles, a title bar
// that moves the window, a minimum size, and a title bar that can never leave
// the screen. Pure UI -- no Firebase, no app state; the caller owns the rect.

export const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/** CSS for the eight handles of elements carrying class `cls` (and data-h). */
export function handleCss(cls) {
  return `
.${cls} { position: absolute; z-index: 3; touch-action: none; }
.${cls}[data-h="n"] { top: -2px; left: 12px; right: 12px; height: 12px; cursor: ns-resize; }
.${cls}[data-h="s"] { bottom: -2px; left: 12px; right: 12px; height: 12px; cursor: ns-resize; }
.${cls}[data-h="e"] { right: -2px; top: 12px; bottom: 12px; width: 12px; cursor: ew-resize; }
.${cls}[data-h="w"] { left: -2px; top: 12px; bottom: 12px; width: 12px; cursor: ew-resize; }
.${cls}[data-h="ne"] { top: -2px; right: -2px; width: 14px; height: 14px; cursor: nesw-resize; }
.${cls}[data-h="nw"] { top: -2px; left: -2px; width: 14px; height: 14px; cursor: nwse-resize; }
.${cls}[data-h="se"] { bottom: -2px; right: -2px; width: 14px; height: 14px; cursor: nwse-resize; }
.${cls}[data-h="sw"] { bottom: -2px; left: -2px; width: 14px; height: 14px; cursor: nesw-resize; }
`;
}

/** Size within the screen, title bar always reachable. */
export function clampRect(r, { minW, minH, bar }) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, minW), vw), h = Math.min(Math.max(r.h, minH), vh);
  const x = Math.min(Math.max(r.x, 0), vw - w);
  const y = Math.min(Math.max(r.y, 0), vh - bar);
  return { x, y, w, h };
}

/**
 * Begin a move (`mode` "move") or a resize (a handle name) from a pointerdown.
 * ctx: { getRect(), setRect(rect), locked(), limits: { minW, minH, bar }, onEnd(), dragClass }
 * `setRect` receives an already-clamped rect.
 */
export function startDrag(e, mode, ctx) {
  if (ctx.locked() || e.button > 0) return;
  e.preventDefault();
  const start = { ...ctx.getRect() }, sx = e.clientX, sy = e.clientY, el = e.currentTarget;
  const { minW, minH } = ctx.limits;
  try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  document.body.classList.add(ctx.dragClass);
  const move = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    let { x, y, w, h } = start;
    if (mode === "move") { x += dx; y += dy; }
    else {
      // Growing east or south stops at the screen edge; it never shoves the window back.
      if (mode.includes("e")) w = Math.min(start.w + dx, window.innerWidth - start.x);
      if (mode.includes("s")) h = Math.min(start.h + dy, window.innerHeight - start.y);
      if (mode.includes("w")) { w = Math.max(minW, start.w - dx); x = start.x + start.w - w; }
      if (mode.includes("n")) { h = Math.max(minH, start.h - dy); y = start.y + start.h - h; }
    }
    ctx.setRect(clampRect({ x, y, w, h }, ctx.limits));
  };
  const up = () => {
    document.body.classList.remove(ctx.dragClass);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    ctx.onEnd();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}
