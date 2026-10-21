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

// PCF MSA J70 (the Owner, 22 Oct 2026): "Enable the card appears like that (in context to the entire screen) on first
// opening" -- a new key, so every device's first open is the new large card, not a place remembered from J67.
const KEY = "mmsa-ayah-window-v2";
const PANES_KEY = "mmsa-ayah-panes"; // { f: the left pane's share 0..1, mode: "split" | "text" | "info" }
const FT_KEY = "mmsa-ayah-ft-open"; // J70: which full-text sections are open { tr, wbw }
const SQUEEZE = 0.12; // dragged nearer an edge than this, a pane squeezes to a bar above the other
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
function loadPanes() {
  try {
    const p = JSON.parse(localStorage.getItem(PANES_KEY) || "null");
    if (p && Number.isFinite(p.f) && ["split", "text", "info"].includes(p.mode)) return { f: Math.min(Math.max(p.f, SQUEEZE), 1 - SQUEEZE), mode: p.mode };
  } catch { /* fall through */ }
  return { f: 0.5, mode: "split" };
}
function savePanes(p) { try { localStorage.setItem(PANES_KEY, JSON.stringify(p)); } catch { /* not remembered */ } }
/** The first-open place: most of the screen, centred, under the page's top bar. */
export function defaultRect() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.round(vw * 0.92), 1600), y = Math.min(72, Math.round(vh * 0.08));
  return { x: Math.round((vw - w) / 2), y, w, h: vh - y - 12 };
}

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
  /* PCF MSA J70 -- the card as a window: bar 1 (the unit pills), bar 2 (the reference, ‹ ›, 📖, ✕), bar 3 (the buttons),
     then two equal panes: the full text on the left, Status / Approach / Progress / Info on the right. */
  .ayah-sheet[data-ayah-win] { display: flex; flex-direction: column; overflow: hidden; }
  .ayah-sheet[data-ayah-win] > * { flex: 0 0 auto; }
  /* bar 2, tidied: the reference, then ‹ › and 📖 Full text, then ✕ -- one line */
  .ayah-sheet[data-ayah-win] .ayah-sheet-header { flex-wrap: nowrap; gap: 0.6rem; padding-bottom: 0.45rem; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-header .ayah-sheet-ref { order: 1; flex: 1 1 auto; font-size: 1rem; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-header .ayah-sheet-head-tools { order: 2; flex: 0 0 auto; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-header .ayah-sheet-close { order: 3; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-tilebar .ayah-sheet-actrow { padding: 0.4rem 0; }
  .ayah-sheet[data-ayah-win] > .ayah-sheet-panes { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, var(--ap-l, 1fr)) 12px minmax(0, var(--ap-r, 1fr)); grid-template-rows: minmax(0, 1fr); }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-text, .ayah-sheet[data-ayah-win] .ayah-sheet-pane-info { overflow-y: auto; min-height: 0; padding: 0.4rem 0.5rem 0.8rem; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-text { display: block; border-right: 1px solid var(--card-line); }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-info { display: flex; flex-direction: column; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-info > .ayah-sheet-body { order: 1; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-info > .ayah-sheet-status[data-ayah-sheet-status] { order: 2; border-top: 1px solid var(--card-line); margin-top: 0.6rem; padding-top: 0.5rem; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-pane-info > .ayah-sheet-info { order: 3; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-splitter { display: block; cursor: col-resize; touch-action: none; position: relative; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-splitter::after { content: ""; position: absolute; left: 4px; top: 50%; width: 4px; height: 44px; margin-top: -22px; border-radius: 3px; background: var(--card-line); }
  .ayah-sheet[data-ayah-win] .ayah-sheet-splitter:hover::after, .ayah-sheet[data-ayah-win] .ayah-sheet-splitter:focus-visible::after { background: #c9a24a; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-tilebar .ayah-sheet-actrow { grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); }
  /* one pane across the whole card: the other is a slim bar above it */
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"], .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"] .ayah-sheet-splitter, .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] .ayah-sheet-splitter { display: none; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"] .ayah-sheet-pane-info { grid-row: 1; padding: 0.3rem 0 0; overflow: visible; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"] .ayah-sheet-pane-info > :not(.ayah-sheet-squeezed) { display: none; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"] .ayah-sheet-pane-text { grid-row: 2; border-right: 0; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] .ayah-sheet-pane-text { grid-row: 1; padding: 0.3rem 0 0; overflow: visible; border-right: 0; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] .ayah-sheet-pane-text > :not(.ayah-sheet-squeezed) { display: none; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] .ayah-sheet-pane-info { grid-row: 2; }
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="text"] .ayah-sheet-pane-info > .ayah-sheet-squeezed,
  .ayah-sheet[data-ayah-win] .ayah-sheet-panes[data-pane-mode="info"] .ayah-sheet-pane-text > .ayah-sheet-squeezed { display: flex; }
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
        sheet.removeAttribute("data-ayah-win");
        sheet.classList.remove("ayah-win-set");
        for (const p of ["left", "top", "width", "height"]) sheet.style.removeProperty(p);
        sheet.removeAttribute("data-wide");
      }
      return;
    }
    if (!rect) rect = defaultRect(); // J70: the first open is the large card, not the old side panel
    sheet.setAttribute("data-ayah-win", "");
    applyPanes(sheet);
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

  let panes = loadPanes();
  let ftOpen = (() => { try { return { tr: true, wbw: false, ...(JSON.parse(localStorage.getItem(FT_KEY) || "null") ?? {}) }; } catch { return { tr: true, wbw: false }; } })();
  function applyPanes(sheet) {
    const box = sheet?.querySelector("[data-ayah-sheet-panes]");
    if (!box) return;
    // the full text's sections open as the reader left them (the card is redrawn as its data arrives)
    box.querySelectorAll("details[data-ayah-ft-sec]").forEach((d) => { const want = !!ftOpen[d.dataset.ayahFtSec]; if (d.open !== want) { d.dataset.ftApplying = "1"; d.open = want; } });
    box.dataset.paneMode = panes.mode;
    box.style.setProperty("--ap-l", `${panes.f}fr`);
    box.style.setProperty("--ap-r", `${1 - panes.f}fr`);
    const sp = box.querySelector("[data-ayah-sheet-splitter]");
    if (sp) sp.setAttribute("aria-valuenow", String(Math.round(panes.f * 100)));
  }
  function setPanes(p, persist = true) {
    panes = p;
    applyPanes(sheetEl());
    if (persist) savePanes(panes);
  }
  // the splitter: drag (pointer) or arrow keys; nearer an edge than SQUEEZE, the smaller pane becomes a bar above
  mountEl.addEventListener("pointerdown", (e) => {
    const sp = active() && e.target instanceof Element ? e.target.closest("[data-ayah-sheet-splitter]") : null;
    if (!sp) return;
    e.preventDefault();
    const box = sp.closest("[data-ayah-sheet-panes]"), r = box.getBoundingClientRect();
    try { sp.setPointerCapture(e.pointerId); } catch { /* */ }
    document.body.classList.add("ayah-win-dragging");
    const move = (ev) => {
      const f = (ev.clientX - r.left) / r.width;
      setPanes(f >= 1 - SQUEEZE ? { f: panes.f, mode: "text" } : f <= SQUEEZE ? { f: panes.f, mode: "info" } : { f, mode: "split" }, false);
    };
    const up = () => { sp.removeEventListener("pointermove", move); sp.removeEventListener("pointerup", up); sp.removeEventListener("pointercancel", up); document.body.classList.remove("ayah-win-dragging"); savePanes(panes); };
    sp.addEventListener("pointermove", move); sp.addEventListener("pointerup", up); sp.addEventListener("pointercancel", up);
  });
  mountEl.addEventListener("keydown", (e) => {
    if (!active() || !(e.target instanceof Element) || !e.target.matches("[data-ayah-sheet-splitter]")) return;
    const d = e.key === "ArrowLeft" ? -0.05 : e.key === "ArrowRight" ? 0.05 : 0;
    if (!d) return;
    e.preventDefault();
    setPanes({ f: Math.min(Math.max(panes.f + d, SQUEEZE), 1 - SQUEEZE), mode: "split" });
  });
  // J70: opening or closing Translations / Word by word is remembered on this device ("toggle" does not bubble: capture)
  mountEl.addEventListener("toggle", (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement) || !d.dataset.ayahFtSec) return;
    if (d.dataset.ftApplying) { delete d.dataset.ftApplying; return; }
    ftOpen = { ...ftOpen, [d.dataset.ayahFtSec]: d.open };
    try { localStorage.setItem(FT_KEY, JSON.stringify(ftOpen)); } catch { /* not remembered */ }
  }, true);
  // ⤢ and 📖 Full text: the full text across the card (again: back to both halves); a squeezed bar: both halves again.
  // Capture phase, so on a PC the header's 📖 widens the left pane instead of opening the separate Note view.
  mountEl.addEventListener("click", (e) => {
    if (!active() || !(e.target instanceof Element)) return;
    const full = e.target.closest("[data-ayah-sheet-textfull], [data-ayah-sheet-noteview]");
    const both = e.target.closest("[data-ayah-sheet-showboth]");
    if (!full && !both) return;
    e.preventDefault(); e.stopPropagation();
    setPanes({ f: panes.f, mode: full && panes.mode !== "text" ? "text" : "split" });
  }, true);

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
