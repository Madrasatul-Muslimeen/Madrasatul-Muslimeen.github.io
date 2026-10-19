// The Ayah window (the Owner, 5 Oct 2026; demo
// docs/reference/2026-10-05-ayah-window-demo.html): on a PC the whole Read
// view can float as its own window -- move it by its title bar, resize it from
// any edge or the gold corner, ⛶ fill the screen (or double-click the title),
// ⧉ make it smaller, ⊡ put it back in the page, ✕ close. It always stays
// inside the screen, also when the browser window changes size.
//
// OPT-IN, per device: until the reader presses 🗗 in the read bar the Read
// view is exactly what it was. Below 900px (phones, small tablets) it is never
// a window -- the Read view already fills the screen there. Every control
// inside keeps working because it is the SAME #readView, only placed
// differently: nothing is copied or re-rendered.
//
// Pure UI: no Firebase, no app state beyond localStorage geometry.
import { HANDLES, startDrag } from "./float-window.js";

const KEY = "mmsa-read-window";
const WINDOW_FROM = 900;
const LIMITS = { minW: 480, minH: 360, bar: 44 };
const MARGIN = 6;

function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); return r && typeof r === "object" ? r : {}; } catch { return {}; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: not remembered */ } }

/** A rect fully inside the screen (the demo's rule, stricter than the Note windows': the bottom edge stays on screen too). */
export function clampInside(r) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, Math.min(LIMITS.minW, vw - 2 * MARGIN)), vw - 2 * MARGIN);
  const h = Math.min(Math.max(r.h, Math.min(LIMITS.minH, vh - 2 * MARGIN)), vh - 2 * MARGIN);
  const x = Math.min(Math.max(r.x, MARGIN), vw - MARGIN - w);
  const y = Math.min(Math.max(r.y, MARGIN), vh - MARGIN - h);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}
function smallerRect() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(760, Math.round(vw * 0.6)), h = Math.min(vh - 2 * MARGIN, 640);
  return clampInside({ x: (vw - w) / 2, y: (vh - h) / 2, w, h });
}

/**
 * viewEl     #readView
 * titleBarEl the window's title bar (inside viewEl; shown only as a window)
 * titleEl    its text
 * buttons    { pop, smaller, full, dock, close } -- pop is the read bar's 🗗
 * isOpen()   true while the Read view is the stage view
 * getTitle() the current reading, for the title bar
 * onClose()  closes the Read view (the app's own route)
 */
export function initReadWindow({ viewEl, titleBarEl, titleEl, buttons, isOpen, getTitle, onClose }) {
  const stored = load();
  let on = stored.on === true;
  let full = false;
  let rect = stored.rect && [stored.rect.x, stored.rect.y, stored.rect.w, stored.rect.h].every(Number.isFinite) ? stored.rect : null;
  const persist = () => save({ on, rect });
  const active = () => on && isOpen() && window.innerWidth >= WINDOW_FROM;

  // eight resize handles; the south-east one is the big gold corner
  const handles = HANDLES.map((h) => {
    const d = document.createElement("div");
    d.className = "read-win-h";
    d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => { if (!full) startDrag(e, h, ctx); });
    viewEl.appendChild(d);
    return d;
  });
  if (handles.length !== 8) throw new Error("read window: expected eight handles");

  function apply() {
    const act = active();
    document.body.classList.toggle("read-windowed", act);
    document.body.classList.toggle("read-window-full", act && full);
    buttons.pop?.setAttribute("aria-pressed", String(on));
    buttons.full?.setAttribute("aria-pressed", String(full));
    if (!act) { for (const p of ["left", "top", "width", "height"]) viewEl.style.removeProperty(p); return; }
    if (!rect) rect = smallerRect();
    rect = clampInside(rect);
    const r = full ? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight } : rect;
    Object.assign(viewEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    if (titleEl) titleEl.textContent = getTitle?.() ?? "";
  }
  const ctx = {
    getRect: () => rect, setRect: (r) => { rect = clampInside(r); apply(); },
    locked: () => full || !active(), limits: LIMITS, onEnd: persist, dragClass: "jt-dragging",
  };
  titleBarEl.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", ctx); });
  titleBarEl.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) { full = !full; apply(); } });
  buttons.pop?.addEventListener("click", () => { on = !on; full = false; persist(); apply(); });
  buttons.smaller?.addEventListener("click", () => { full = false; rect = smallerRect(); persist(); apply(); });
  buttons.full?.addEventListener("click", () => { full = !full; apply(); });
  buttons.dock?.addEventListener("click", () => { on = false; full = false; persist(); apply(); });
  buttons.close?.addEventListener("click", () => { full = false; onClose?.(); apply(); });
  window.addEventListener("resize", apply);
  apply();
  return { sync: apply, isWindowed: () => active() };
}
