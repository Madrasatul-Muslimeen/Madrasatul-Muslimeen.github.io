// A – (minimise) button beside ✕ on every pop-up window (the Owner, 23 Oct 2026, PCF MSA J81: "add a minimise button
// on the top bar (beside cross) in all pop-up window globally"). A minimised window is only hidden -- nothing in it is
// closed, saved or reloaded -- and waits as a chip at the bottom-left of the screen; one tap on the chip brings it back
// exactly as it was. Also J81: "While I am on this view I click the bottom buttons, Study, Explore, no button displays
// what i clicked for" -- a press on the page's bottom buttons (#tabRow) first steps every open window aside (minimised),
// so what was pressed is seen; the Mapping My Journey button brings its own window back instead.
//
// ONE list of windows (WINDOWS below). The module watches the page and puts the button into each listed window
// whenever it is on screen, so a window that redraws its bar keeps its –. A window's own "open" code calls
// restoreWindow() so a minimised window that is opened again is shown, not left hidden.
//
// Pure UI: no Firebase, no storage.
import { t, ensureCatalogueReady } from "./i18n.js";
import { onAppLangChange } from "./prefs.js";
import { HANDLES, handleCss, startDrag } from "./float-window.js";

// { root: the window on screen; hide: what minimising hides (an overlay around the window, or the window itself);
//   close: its ✕; title: its name. } The root must be visible for the – to be added.
const WINDOWS = [
  // own: true = the window already drags and resizes by float-window.js itself (only ⛶ is added); the others get the
  // shared drag and eight handles from enhance() below.
  { id: "journey", own: true, root: "#journeyTray", close: ".jt-close", title: ".jt-title" },
  { id: "page", own: true, root: "#pageWindow", close: ".pgw-close", title: ".pgw-title" },
  { id: "notes", own: true, root: "#readNotePane", close: ".rnp-close", title: ".rnp-title" },
  { id: "newnote", own: true, root: "#noteOpener", close: ".no-close", title: ".no-title" }, // J108: the shared Note opener (note-opener.js)
  { id: "note", own: true, root: ".note-win", close: "[data-win-close]", title: ".nw-title" },
  { id: "ayah", noButton: true, root: "#ayahActionSheetOverlay.open [data-ayah-sheet], #ayahActionSheetOverlay.open [data-unit-card]", hide: "#ayahActionSheetOverlay", close: ".ayah-sheet-close", title: ".ayah-sheet-ref" },
  { id: "track", root: "#wayModalMount .way-modal", hide: "#wayModalMount", close: ".way-close-btn", title: ".way-modal-header h2, .way-modal-header h3, .way-modal-title" },
  { id: "read", own: true, noFull: true, root: "body.read-windowed #readView", close: "#readWinCloseBtn", title: "#readRef" },
  { id: "card", own: true, root: ".fc-floating", close: "[data-close], .close-btn, button[aria-label='Close'], button[title='Close']", title: "h2, h3, header" },
  // J140: Learn next (quranrevival.html) -- its header carries "← Back" and a ✕ (.ln-close) that closes it the same way.
  { id: "learnnext", root: "#learnNextSheet:not([hidden])", close: ".ln-close", title: ".ln-title", bar: ".ln-head" },
];
// J140: a collapsed pop-up is a bar at the top left, as wide as the left pane of Mapping My Journey's three-pane layout
// (journey-map.html SPLIT_DEFAULT.three[0] = 4/13 of the width); on a phone (<= 640px) the full width.
export const COLLAPSED_PANE_FRACTION = 4 / 13;
const CONTROLS = "#topNav summary, #topNav a, #topNav button, #tabRow button, #tabRow a, #hadithCorpusRoot [role='tablist'] button, #hadithCorpusRoot nav button, #wheelBar button, #duaRoot [role='tablist'] button, #duaRoot nav button, [data-collapse-popups]";
const ATTR = "data-mm-min";
const CSS = `
[${ATTR}] { display: none !important; }
.mm-min-btn { flex: 0 0 auto; margin-inline-start: auto; min-width: 40px; min-height: 40px; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: 1.5rem; font-weight: 700; line-height: 1; cursor: pointer; border-radius: 0.5rem; }
${handleCss("mm-h")}
body.jt-dragging { user-select: none; }
[data-mm-full] > .mm-h { display: none; }
.mm-min-btn:hover { background: rgba(255, 255, 255, 0.12); }
.mm-min-btn:focus-visible { outline: 3px solid #c9a24b; outline-offset: 1px; }
/* The chips wait at the bottom right: inside the Zab bar's strip when it is on (its pockets are on the left), else
   just above the bottom edge, clear of the 🧰 corner. */
#mmMinDock { position: fixed; right: 72px; bottom: 12px; z-index: 995; display: flex; flex-wrap: wrap-reverse; justify-content: flex-end; gap: 0.4rem; max-width: calc(100vw - 96px); pointer-events: none; }
body.zab-bar-on #mmMinDock { right: 12px; bottom: 4px; }
#mmMinDock:empty { display: none; }
.mm-min-chip { pointer-events: auto; display: inline-flex; align-items: center; gap: 0.45rem; min-height: 40px; max-width: 18rem; padding: 0 0.8rem; border: 1px solid #c9a24b; border-radius: 999px; background: #1F3A6E; color: #fff; font: inherit; font-size: 0.9rem; font-weight: 600; box-shadow: 0 4px 14px rgba(10, 20, 45, 0.35); cursor: pointer; }
.mm-min-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-min-chip:focus-visible { outline: 3px solid #c9a24b; outline-offset: 2px; }
/* J140: collapsed pop-ups -- bars stacked down from the top left, as wide as the 3-pane layout's left pane. Above the page,
   below an open pop-up (1400) or menu (1450). */
#mmColStack { position: fixed; top: 0; left: 0; z-index: 900; display: flex; flex-direction: column; gap: 2px; width: calc(100vw * ${COLLAPSED_PANE_FRACTION}); pointer-events: none; }
@media (max-width: 640px) { #mmColStack { width: 100vw; } }
#mmColStack:empty { display: none; }
.mm-col-bar { pointer-events: auto; display: flex; align-items: center; gap: 0.3rem; min-height: 44px; box-sizing: border-box; padding: 0 0.3rem 0 0.7rem; background: #1F3A6E; color: #fff; border: 1px solid #c9a24b; box-shadow: 0 4px 14px rgba(10, 20, 45, 0.35); font-size: 0.9rem; font-weight: 600; }
.mm-col-bar [data-mm-title] { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-col-bar button { flex: 0 0 auto; min-width: 40px; min-height: 40px; border: 0; background: none; color: inherit; font: inherit; font-size: 1.2rem; cursor: pointer; border-radius: 0.5rem; }
.mm-col-bar button:hover { background: rgba(255, 255, 255, 0.12); }
.mm-ln-close { flex: 0 0 auto; min-width: 44px; min-height: 44px; margin-inline-start: auto; border: 1px solid #a98bdc; border-radius: 0.5rem; background: #f1e9fb; color: #4b2a85; font: inherit; font-size: 1.3rem; font-weight: 700; cursor: pointer; }
`;

const minimised = new Map(); // hidden element -> { chip, spec }
let dock = null;

const shown = (el) => !!el && el.getClientRects().length > 0 && !el.hidden;
function hideTarget(spec, root) {
  return spec.hide ? root.closest(spec.hide) ?? document.querySelector(spec.hide) ?? root : root;
}
function titleOf(spec, root) {
  const el = spec.title ? root.querySelector(spec.title) : null;
  return (el?.textContent || root.getAttribute("aria-label") || t("Window")).trim().slice(0, 80);
}

/** Minimise one window: hide it and leave a chip that brings it back. */
export function minimiseWindow(root, spec = WINDOWS.find((s) => root.matches(s.root))) {
  if (!root || !spec) return;
  const target = hideTarget(spec, root);
  if (minimised.has(target)) return;
  const name = titleOf(spec, root);
  ensureDock();
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "mm-min-chip";
  chip.dataset.mmMinChip = spec.id;
  chip.setAttribute("aria-label", t("Bring back {name}", { name }));
  chip.title = t("Bring back {name}", { name });
  chip.innerHTML = `<span aria-hidden="true">▢</span><span data-mm-title></span>`;
  chip.querySelector("[data-mm-title]").textContent = name;
  chip.addEventListener("click", () => restoreWindow(target));
  dock.appendChild(chip);
  // Window frames that live beside the window (the Āyah card's resize frame) hide with it.
  target.setAttribute(ATTR, "");
  document.querySelectorAll(".ayah-win-frame.on").forEach((f) => { if (spec.id === "ayah") f.setAttribute(ATTR, ""); });
  minimised.set(target, { chip, spec, root });
}

/** J140: collapse one window to a bar at the top left (hidden, not closed: size, position, scroll and content stay). The
    bar's ⤢ (or a double-click on it) restores it; its ✕ closes the window by the window's own ✕. */
export function collapseWindow(root, spec = WINDOWS.find((s) => root.matches(s.root))) {
  if (!root || !spec) return;
  const target = hideTarget(spec, root);
  if (minimised.has(target)) return;
  const name = titleOf(spec, root);
  if (!colStack) { colStack = document.createElement("div"); colStack.id = "mmColStack"; document.body.appendChild(colStack); }
  const bar = document.createElement("div");
  bar.className = "mm-col-bar";
  bar.dataset.mmColBar = spec.id;
  bar.innerHTML = `<span data-mm-title></span><button type="button" data-mm-open>⤢</button><button type="button" data-mm-close>✕</button>`;
  bar.querySelector("[data-mm-title]").textContent = name;
  bar.querySelector("[data-mm-open]").setAttribute("aria-label", t("Open"));
  bar.querySelector("[data-mm-close]").setAttribute("aria-label", t("Close"));
  bar.title = name;
  bar.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) restoreWindow(target); });
  bar.querySelector("[data-mm-open]").addEventListener("click", () => restoreWindow(target));
  bar.querySelector("[data-mm-close]").addEventListener("click", () => {
    const close = [...root.querySelectorAll(spec.close)].find((b) => !b.classList.contains("mm-min-btn"));
    restoreWindow(target);
    close?.click();
  });
  colStack.appendChild(bar);
  target.setAttribute(ATTR, "");
  if (spec.id === "ayah") document.querySelectorAll(".ayah-win-frame.on").forEach((f) => f.setAttribute(ATTR, ""));
  minimised.set(target, { chip: bar, spec, root });
}
let colStack = null;

/** Collapse every open window except the one (by id) kept. */
export function collapseAll({ except = null, inside = null } = {}) {
  for (const spec of WINDOWS) {
    if (spec.id === except) continue;
    document.querySelectorAll(spec.root).forEach((root) => { if (shown(root) && root !== inside && !root.contains(inside)) collapseWindow(root, spec); });
  }
}

/** Audit part 47 (PCF MSA J29): quranrevival.html switches language IN PLACE, and the – buttons, the dock and the chips are
    written once. Written again in the new language, after the windows have repainted their own titles (the chip is named
    from its window's title). */
async function relabel() {
  await ensureCatalogueReady(); // the listeners fire before a first switch to Bangla has its catalogue
  await new Promise((r) => requestAnimationFrame(r)); // ...and the windows repaint their titles first
  if (dock) dock.setAttribute("aria-label", t("Minimised windows"));
  document.querySelectorAll(".mm-min-btn").forEach((b) => { b.setAttribute("aria-label", t("Minimise")); b.title = t("Minimise"); });
  for (const { chip, spec, root } of minimised.values()) {
    const name = titleOf(spec, root);
    chip.setAttribute("aria-label", t("Bring back {name}", { name }));
    chip.title = t("Bring back {name}", { name });
    chip.querySelector("[data-mm-title]").textContent = name;
    chip.querySelector("[data-mm-open]")?.setAttribute("aria-label", t("Open"));
    chip.querySelector("[data-mm-close]")?.setAttribute("aria-label", t("Close"));
  }
}
onAppLangChange(relabel); // audit 47 langmin

/** Bring a minimised window back (also called by a window's own "open" code, so opening it again shows it). */
export function restoreWindow(el) {
  if (!el) return;
  const target = [...minimised.keys()].find((k) => k === el || k.contains(el) || el.contains?.(k)) ?? null;
  if (!target) return;
  const { chip, spec } = minimised.get(target);
  minimised.delete(target);
  chip.remove();
  target.removeAttribute(ATTR);
  if (spec.id === "ayah") document.querySelectorAll(`.ayah-win-frame[${ATTR}]`).forEach((f) => f.removeAttribute(ATTR));
}

/** Every open window steps aside (the page's bottom buttons). */
export function minimiseAll({ except = null } = {}) {
  for (const spec of WINDOWS) {
    if (spec.id === except) continue;
    document.querySelectorAll(spec.root).forEach((root) => { if (shown(root)) minimiseWindow(root, spec); });
  }
}

function ensureDock() {
  if (dock) return;
  dock = document.createElement("div");
  dock.id = "mmMinDock";
  dock.setAttribute("role", "group");
  dock.setAttribute("aria-label", t("Minimised windows"));
  document.body.appendChild(dock);
}

// J140 part 2: every pop-up gets a ⛶ (full screen / restore) beside – and ✕; the windows without their own drag and
// resize (spec.own is not set) also get the ONE shared mechanism of float-window.js: a drag by the top bar, eight handles.
const FULL_ATTR = "data-mm-full";
const fstate = new WeakMap(); // root -> { full, saved, rect }
const LIMITS = { minW: 260, minH: 160, bar: 44 };
function floatRoot(root) {
  const r = root.getBoundingClientRect();
  Object.assign(root.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", right: "auto", bottom: "auto", margin: "0", transform: "none", maxWidth: "none", maxHeight: "none" });
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function applyRect(root, r) {
  Object.assign(root.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
}
function toggleFull(root) {
  let st = fstate.get(root);
  if (!st) { st = { full: false, saved: null }; fstate.set(root, st); }
  if (!st.full) {
    st.saved = root.hasAttribute("style") ? root.getAttribute("style") : null;
    st.rect = st.rect ?? null;
    Object.assign(root.style, { position: "fixed", left: "0px", top: "0px", width: "100vw", height: "100vh", right: "auto", bottom: "auto", margin: "0", transform: "none", maxWidth: "none", maxHeight: "none" });
    st.full = true;
    root.setAttribute(FULL_ATTR, "");
  } else {
    if (st.saved === null) root.removeAttribute("style"); else root.setAttribute("style", st.saved);
    st.full = false; st.saved = null;
    root.removeAttribute(FULL_ATTR);
  }
  root.querySelectorAll(".mm-full-btn").forEach((b) => b.setAttribute("aria-pressed", String(st.full)));
}
function enhance(root, spec, close) {
  if (!spec.noFull && !root.querySelector(".mm-full-btn")) { // read-window.js has its own full-screen button
    const f = document.createElement("button");
    f.type = "button";
    f.className = "mm-min-btn mm-full-btn";
    f.dataset.mmFullBtn = spec.id;
    f.textContent = "⛶";
    f.setAttribute("aria-label", t("Full screen"));
    f.title = t("Full screen");
    f.setAttribute("aria-pressed", String(!!fstate.get(root)?.full));
    f.addEventListener("pointerdown", (e) => e.stopPropagation());
    f.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); toggleFull(root); });
    f.style.order = getComputedStyle(close).order;
    (close.previousElementSibling?.matches?.(".mm-min-btn") ? close.previousElementSibling : close).before(f);
  }
  if (spec.own || root.querySelector(":scope > .mm-h")) return;
  // The shared drag / resize (float-window.js): eight handles with their gold brackets, the top bar moves the window.
  if (!fstate.has(root)) fstate.set(root, { full: false, saved: null });
  const st = fstate.get(root);
  if (!root.dataset.mmFloat) {
    root.dataset.mmFloat = "1";
    st.rect = floatRoot(root);
    root.addEventListener("pointerdown", (e) => {
      const bar = spec.bar ? root.querySelector(spec.bar) : [...root.querySelectorAll(spec.close)].find(shown)?.parentElement;
      if (!bar || !bar.contains(e.target) || e.target.closest("button, a, input, select, textarea")) return;
      startDrag(e, "move", ctx());
    });
  }
  const ctx = () => ({ getRect: () => { const r = root.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, setRect: (r) => { st.rect = r; applyRect(root, r); }, locked: () => st.full, limits: LIMITS, onEnd() {}, dragClass: "jt-dragging" });
  for (const h of HANDLES) {
    const d = document.createElement("div");
    d.className = "mm-h"; d.dataset.h = h; d.setAttribute("aria-hidden", "true");
    d.addEventListener("pointerdown", (e) => { e.stopPropagation(); startDrag(e, h, ctx()); });
    root.appendChild(d);
  }
}

function addButtons() {
  for (const spec of WINDOWS) {
    document.querySelectorAll(spec.root).forEach((root) => {
      if (!shown(root) || spec.noButton) return;
      const close = [...root.querySelectorAll(spec.close)].find(shown);
      if (!close) return;
      if (close.previousElementSibling?.matches?.(".mm-min-btn")) { enhance(root, spec, close); return; }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mm-min-btn";
      btn.dataset.mmMinBtn = spec.id;
      btn.textContent = "–";
      btn.setAttribute("aria-label", t("Minimise"));
      btn.title = t("Minimise");
      btn.addEventListener("pointerdown", (e) => e.stopPropagation()); // never starts a drag of the bar
      btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); minimiseWindow(root, spec); });
      btn.style.order = getComputedStyle(close).order; // beside ✕ even in a bar that orders its items
      close.before(btn);
      enhance(root, spec, close);
    });
  }
  // A window closed by its own code while minimised: its chip goes, and it opens normally next time.
  for (const [target, { chip, spec }] of minimised) {
    const closed = !target.isConnected || target.hidden || (spec.id === "ayah" && !target.classList.contains("open"))
      || (spec.id === "track" && !target.querySelector(".way-modal"));
    if (closed) { minimised.delete(target); chip.remove(); target.removeAttribute(ATTR); }
  }
}

let queued = false;
function queue() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; addButtons(); }); }

function start() {
  const style = document.createElement("style");
  style.id = "mmMinimiseStyle";
  style.textContent = CSS;
  document.head.appendChild(style);
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  queue();
  // J81: the page's bottom buttons show what was pressed -- open windows step aside first; Mapping My Journey brings
  // its own window back (journey-tray.js reopens it and calls restoreWindow()).
  document.addEventListener("click", (e) => {
    const b = e.target instanceof Element ? e.target.closest(CONTROLS) : null;
    if (!b) return; // a click on a page area that is not a control never collapses anything
    // J140: a click inside an open pop-up never collapses it (collapseAll skips the window holding the control).
    // The window a button itself opens is kept (and brought back if collapsed); every other one collapses to the top left.
    const keep = b.matches("a[href*='journey-map.html']") || b.id === "tabJourneyBtn" ? "journey"
      : b.id === "tabReadBtn" ? "read" : b.id === "tabNoteBtn" ? "notes" : null;
    collapseAll({ except: keep, inside: b });
    if (keep) for (const [target, { spec }] of [...minimised]) if (spec.id === keep) restoreWindow(target);
  }, true);
  // J140: a double-click on a pop-up's top bar (outside its buttons) collapses it to the top left.
  document.addEventListener("dblclick", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el || el.closest("button, a, input, select, textarea, summary, label")) return;
    for (const spec of WINDOWS) {
      for (const root of document.querySelectorAll(spec.root)) {
        if (!shown(root) || !root.contains(el)) continue;
        const bar = spec.bar ? root.querySelector(spec.bar) : [...root.querySelectorAll(spec.close)].find(shown)?.parentElement;
        if (bar && bar.contains(el)) { e.preventDefault(); collapseWindow(root, spec); return; }
      }
    }
  });
}

if (typeof document !== "undefined" && !window.__mmMinimise) {
  window.__mmMinimise = true;
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
}
