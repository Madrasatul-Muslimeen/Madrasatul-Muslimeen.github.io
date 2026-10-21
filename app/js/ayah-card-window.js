// The Āyah card as a window (PCF MSA J67, the Owner, 21 Oct 2026): on a PC (900px and up) the card can be moved by
// its header bar and resized from all four corners and all four sides. It is the SAME `.ayah-sheet` element the
// renderer already makes -- this module only places it. The drag / resize mechanism is float-window.js, the one the
// Read window and the Note windows use.
//
// Until the reader moves or resizes it the card is exactly where it has always been (right side, 22rem wide); the
// first move turns that place into a remembered rect (localStorage `mmsa-ayah-window`, per device). Below 900px
// nothing here does anything: the card stays the phone / tablet sheet. The mount's markup is replaced on every
// render, so a MutationObserver puts the rect back on the new element each time.
//
// Pure UI: no Firebase, no app state beyond that one localStorage key.
import { HANDLES, startDrag, handleCss } from "./float-window.js";

const KEY = "mmsa-ayah-window";
const WINDOW_FROM = 900;
const WIDE_FROM = 560; // card width from which the contents sit in two columns
const LIMITS = { minW: 320, minH: 360, bar: 44 };
const MARGIN = 6;

function load() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    return r && [r.x, r.y, r.w, r.h].every(Number.isFinite) ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
  } catch { return null; }
}
function save(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* private mode: not remembered */ } }

/** A rect fully inside the screen -- the same rule as read-window.js's clampInside, with this card's minimum size. */
export function clampInside(r) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, Math.min(LIMITS.minW, vw - 2 * MARGIN)), vw - 2 * MARGIN);
  const h = Math.min(Math.max(r.h, Math.min(LIMITS.minH, vh - 2 * MARGIN)), vh - 2 * MARGIN);
  const x = Math.min(Math.max(r.x, MARGIN), vw - MARGIN - w);
  const y = Math.min(Math.max(r.y, MARGIN), vh - MARGIN - h);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

const CSS = `${handleCss("ayah-win-h")}
.ayah-win-frame { position: fixed; pointer-events: none; display: none; }
.ayah-win-frame.on { display: block; }
.ayah-win-frame .ayah-win-h { pointer-events: auto; }
.ayah-win-frame .ayah-win-h[data-h="e"] { right: -4px; width: 8px; }
.ayah-win-frame .ayah-win-h[data-h="s"] { bottom: -4px; }
.ayah-win-frame .ayah-win-h[data-h="n"] { top: -4px; }
.ayah-win-frame .ayah-win-h[data-h="w"] { left: -4px; width: 8px; }
body.ayah-win-dragging { user-select: none; }
@media (min-width: ${WINDOW_FROM}px) {
  .ayah-sheet[data-ayah-sheet] .ayah-sheet-header, .ayah-sheet[data-ayah-sheet] .ayah-sheet-handle { cursor: move; touch-action: none; }
  .ayah-sheet.ayah-win-set { box-sizing: border-box; right: auto; bottom: auto; max-height: none; }
}
`;

/** mountEl: #ayahActionSheetMount. Returns { sync, isWindowed }. */
export function initAyahCardWindow(mountEl) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  let rect = load();
  const frame = document.createElement("div");
  frame.className = "ayah-win-frame";
  frame.setAttribute("data-ayah-win-frame", "");
  HANDLES.forEach((h) => {
    const d = document.createElement("div");
    d.className = "ayah-win-h";
    d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => startDrag(e, h, ctx));
    frame.appendChild(d);
  });
  mountEl.after(frame);

  const sheetEl = () => mountEl.querySelector("[data-ayah-sheet]");
  const active = () => window.innerWidth >= WINDOW_FROM && !!sheetEl();

  function apply() {
    const sheet = sheetEl();
    const act = active();
    if (!act) {
      frame.classList.remove("on");
      if (sheet) {
        sheet.classList.remove("ayah-win-set");
        for (const p of ["left", "top", "width", "height"]) sheet.style.removeProperty(p);
        sheet.removeAttribute("data-wide");
      }
      return;
    }
    sheet.classList.toggle("ayah-win-set", !!rect);
    if (rect) {
      rect = clampInside(rect);
      Object.assign(sheet.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    }
    const b = sheet.getBoundingClientRect();
    Object.assign(frame.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    frame.classList.add("on");
    sheet.toggleAttribute("data-wide", b.width >= WIDE_FROM);
  }

  const ctx = {
    // Before the first move the card is wherever the page's CSS put it; that place becomes the rect.
    getRect: () => {
      if (rect) return rect;
      const b = sheetEl().getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    },
    setRect: (r) => { rect = clampInside(r); apply(); },
    locked: () => !active(),
    limits: LIMITS,
    onEnd: () => { if (rect) save(rect); },
    dragClass: "ayah-win-dragging",
  };

  // The header is re-rendered with the card, so the drag listens on the mount. A press on a button, select or link
  // never moves the card.
  mountEl.addEventListener("pointerdown", (e) => {
    if (!active() || !(e.target instanceof Element)) return;
    const bar = e.target.closest(".ayah-sheet-header, .ayah-sheet-handle");
    if (!bar || !bar.closest("[data-ayah-sheet]") || e.target.closest("button, select, a, input, label")) return;
    startDrag(e, "move", ctx);
  });

  new MutationObserver(apply).observe(mountEl, { childList: true });
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(apply) : null;
  const watch = () => { const s = sheetEl(); if (ro && s) { ro.disconnect(); ro.observe(s); } };
  new MutationObserver(watch).observe(mountEl, { childList: true });
  window.addEventListener("resize", apply);
  watch();
  apply();
  return { sync: apply, isWindowed: active };
}
