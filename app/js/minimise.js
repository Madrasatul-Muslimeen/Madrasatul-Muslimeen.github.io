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

// { root: the window on screen; hide: what minimising hides (an overlay around the window, or the window itself);
//   close: its ✕; title: its name. } The root must be visible for the – to be added.
const WINDOWS = [
  { id: "journey", root: "#journeyTray", close: ".jt-close", title: ".jt-title" },
  { id: "page", root: "#pageWindow", close: ".pgw-close", title: ".pgw-title" },
  { id: "notes", root: "#readNotePane", close: ".rnp-close", title: ".rnp-title" },
  { id: "note", root: ".note-win", close: "[data-win-close]", title: ".nw-title" },
  { id: "ayah", root: "#ayahActionSheetOverlay.open [data-ayah-sheet], #ayahActionSheetOverlay.open [data-unit-card]", hide: "#ayahActionSheetOverlay", close: ".ayah-sheet-close", title: ".ayah-sheet-ref" },
  { id: "track", root: "#wayModalMount .way-modal", hide: "#wayModalMount", close: ".way-close-btn", title: ".way-modal-header h2, .way-modal-header h3, .way-modal-title" },
  { id: "read", root: "body.read-windowed #readView", close: "#readWinCloseBtn", title: "#readRef" },
  { id: "card", root: ".fc-floating", close: "[data-close], .close-btn, button[aria-label='Close'], button[title='Close']", title: "h2, h3, header" },
];
const ATTR = "data-mm-min";
const CSS = `
[${ATTR}] { display: none !important; }
.mm-min-btn { flex: 0 0 auto; margin-inline-start: auto; min-width: 40px; min-height: 40px; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: 1.5rem; font-weight: 700; line-height: 1; cursor: pointer; border-radius: 0.5rem; }
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
  chip.innerHTML = `<span aria-hidden="true">▢</span><span></span>`;
  chip.lastChild.textContent = name;
  chip.addEventListener("click", () => restoreWindow(target));
  dock.appendChild(chip);
  // Window frames that live beside the window (the Āyah card's resize frame) hide with it.
  target.setAttribute(ATTR, "");
  document.querySelectorAll(".ayah-win-frame.on").forEach((f) => { if (spec.id === "ayah") f.setAttribute(ATTR, ""); });
  minimised.set(target, { chip, spec, root });
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
    chip.lastChild.textContent = name;
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

function addButtons() {
  for (const spec of WINDOWS) {
    document.querySelectorAll(spec.root).forEach((root) => {
      if (!shown(root)) return;
      const close = [...root.querySelectorAll(spec.close)].find(shown);
      if (!close || close.previousElementSibling?.matches?.(".mm-min-btn")) return;
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
    const b = e.target instanceof Element ? e.target.closest("#tabRow button, #tabRow a") : null;
    if (!b) return;
    // The window a button itself opens is kept (and brought back if minimised); every other one steps aside.
    const keep = b.matches("a[href*='journey-map.html']") || b.id === "tabJourneyBtn" ? "journey"
      : b.id === "tabReadBtn" ? "read" : b.id === "tabNoteBtn" ? "notes" : null;
    minimiseAll({ except: keep });
    if (keep) for (const [target, { spec }] of [...minimised]) if (spec.id === keep) restoreWindow(target);
  }, true);
}

if (typeof document !== "undefined" && !window.__mmMinimise) {
  window.__mmMinimise = true;
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
}
