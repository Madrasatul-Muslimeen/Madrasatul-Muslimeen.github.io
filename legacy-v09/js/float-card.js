// A card that floats (the Owner, 6 Oct 2026, of Know Your Status: "Enable Know Your Status Card moveable,
// resizeable and the same (resize) for wheel inside it and any other cards popout from there should have the
// same functions"). Built on float-window.js, the drag/resize mechanism the Note pop-up windows already use:
// the card's header moves it, eight edges resize it, its title bar never leaves the screen.
//
//   makeFloatingCard(cardEl, { key, handleEl, minW, minH, when })  -- a card that moves and resizes
//   makeResizableBox(boxEl, { key, min, max, cssVar })             -- one square thing (a wheel) with its own
//                                                                    corner grip; sets cssVar on the box
//
// Where and how big is remembered per device (localStorage, like the reading choices); nothing is written to the
// database. Below `when()` (a phone, where the card is the whole screen) the card is left exactly as it was.
import { HANDLES, handleCss, clampRect, startDrag } from "./float-window.js";

const CSS_ID = "mm-float-card-css";
function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const st = document.createElement("style");
  st.id = CSS_ID;
  st.textContent = `${handleCss("fc-h")}
.fc-floating { position: fixed !important; margin: 0 !important; max-width: none !important; max-height: none !important; }
.fc-floating > header, .fc-floating [data-fc-handle] { cursor: move; touch-action: none; }
.fc-dragging, .fc-dragging * { user-select: none !important; }
.fc-grip { position: absolute; right: 0; bottom: 0; width: 40px; height: 40px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 6px; box-sizing: border-box; cursor: nwse-resize; touch-action: none; color: var(--card-text-muted, #9aa6bd); font-size: 18px; line-height: 1; z-index: 2; background: none; border: 0; }
.fc-grip:focus-visible { outline: 2px solid #c9a24a; border-radius: 6px; }
`;
  document.head.appendChild(st);
}
const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } };
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: not remembered */ } };

/** A card that moves by its header and resizes by its edges, while `when()` is true. Returns { refresh, reset }. */
export function makeFloatingCard(cardEl, { key, handleEl = null, minW = 320, minH = 260, when = () => window.innerWidth >= 700, initial = null, onChange = null } = {}) {
  if (!cardEl) return null;
  ensureCss();
  const handle = handleEl || cardEl.querySelector("header");
  const limits = { minW, minH, bar: 48 };
  let rect = null;
  let handles = [];
  const apply = () => {
    if (!rect) return;
    Object.assign(cardEl.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    onChange?.(rect);
  };
  const on = () => {
    if (cardEl.classList.contains("fc-floating")) { rect = clampRect(rect, limits); apply(); return; }
    // Start where it was left on this device; else at `initial()` (the caller's own default size, which must not
    // depend on content still loading); else where the card already is, so turning it on moves nothing.
    const r = cardEl.getBoundingClientRect();
    const saved = read(key);
    rect = clampRect(saved && saved.w ? saved : (initial?.() ?? { x: r.left, y: r.top, w: r.width, h: r.height }), limits);
    cardEl.classList.add("fc-floating");
    cardEl.dataset.fcFloating = "";
    handles = HANDLES.map((h) => {
      const d = document.createElement("div");
      d.className = "fc-h"; d.dataset.h = h; d.setAttribute("aria-hidden", "true");
      d.addEventListener("pointerdown", (e) => drag(e, h));
      cardEl.appendChild(d);
      return d;
    });
    apply();
  };
  const off = () => {
    if (!cardEl.classList.contains("fc-floating")) return;
    cardEl.classList.remove("fc-floating");
    delete cardEl.dataset.fcFloating;
    handles.forEach((d) => d.remove()); handles = [];
    for (const p of ["left", "top", "width", "height"]) cardEl.style[p] = "";
    onChange?.(null);
  };
  const drag = (e, mode) => startDrag(e, mode, {
    getRect: () => rect, setRect: (r) => { rect = r; apply(); }, locked: () => !cardEl.classList.contains("fc-floating"),
    limits, dragClass: "fc-dragging", onEnd: () => write(key, rect),
  });
  handle?.addEventListener("pointerdown", (e) => {
    // Buttons, selects and links in the header keep working; only the bar itself moves the card.
    if (e.target.closest("button, select, input, a, label")) return;
    drag(e, "move");
  });
  const refresh = () => (when() ? on() : off());
  window.addEventListener("resize", refresh);
  return { refresh, reset: () => { write(key, null); off(); refresh(); }, isFloating: () => cardEl.classList.contains("fc-floating") };
}

/**
 * One square box (a wheel) that the reader can make bigger or smaller with a corner grip (drag, or the arrow keys
 * on the grip). Sets `cssVar` (e.g. --kys-wheel) on the box to the chosen width in px; the caller's CSS uses it.
 */
export function makeResizableBox(boxEl, { key, min = 200, max = 900, cssVar = "--fc-size", label = "Resize", onChange = null } = {}) {
  if (!boxEl) return null;
  ensureCss();
  boxEl.style.position = boxEl.style.position || "relative";
  const set = (px) => {
    const v = Math.round(Math.min(max, Math.max(min, px)));
    boxEl.style.setProperty(cssVar, `${v}px`);
    boxEl.dataset.fcSize = String(v);
    onChange?.(v);
    return v;
  };
  const saved = read(key);
  if (saved && saved.size) set(saved.size);
  const grip = document.createElement("button");
  grip.type = "button"; grip.className = "fc-grip"; grip.dataset.fcGrip = "";
  grip.textContent = "⤡"; grip.title = label; grip.setAttribute("aria-label", label);
  grip.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    const start = boxEl.getBoundingClientRect().width, sx = e.clientX, sy = e.clientY;
    try { grip.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    document.body.classList.add("fc-dragging");
    const move = (ev) => set(start + Math.max(ev.clientX - sx, ev.clientY - sy));
    const up = () => {
      document.body.classList.remove("fc-dragging");
      grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
      write(key, { size: Number(boxEl.dataset.fcSize) || null });
    };
    grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
  });
  grip.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowUp" || e.key === "ArrowRight" ? 20 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -20 : 0;
    if (!step) return;
    e.preventDefault();
    set((Number(boxEl.dataset.fcSize) || boxEl.getBoundingClientRect().width) + step);
    write(key, { size: Number(boxEl.dataset.fcSize) });
  });
  boxEl.appendChild(grip);
  return { set, grip };
}
