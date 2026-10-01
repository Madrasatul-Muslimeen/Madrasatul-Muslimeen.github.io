// Mapping My Journey as a pop-up folder tray (Siyagah port round 2, Owner
// decisions 41 and 42.7). Every "Mapping My Journey" control opens
// journey-map.html?embed=1#folders inside a floating, draggable, resizable
// window instead of navigating away. The iframe keeps every existing function,
// listener and test of that screen. Position and size are UI state: kept per
// device in localStorage, never in Firestore (handover §1.5).
//
// The plain link keeps working: with this module absent, or in a new tab, the
// href opens journey-map.html as a full page as it always did.
import { t } from "./i18n.js";

const KEY = "mmsa-journey-tray";
const MIN_W = 320, MIN_H = 360, PHONE = 600, BAR = 44;
const SRC = "journey-map.html?embed=1#folders";

const CSS = `
#journeyTray { position: fixed; z-index: 970; display: flex; flex-direction: column; box-sizing: border-box;
  background: #fff; color: #222; border: 1px solid #999; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.35); overflow: hidden; }
#journeyTray[hidden] { display: none; }
#journeyTray.phone { inset: 0; width: auto; height: auto; border: 0; border-radius: 0; }
.jt-bar { flex: 0 0 ${BAR}px; display: flex; align-items: center; justify-content: space-between; background: #1f3a6e; color: #fff;
  padding: 0 0 0 0.8rem; cursor: move; touch-action: none; user-select: none; -webkit-user-select: none; }
#journeyTray.phone .jt-bar { cursor: default; }
.jt-title { font-weight: 600; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jt-close { flex: 0 0 auto; min-width: 44px; min-height: 44px; background: none; border: 0; color: #fff; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.jt-frame { flex: 1 1 auto; width: 100%; min-height: 0; border: 0; background: #fff; }
.jt-h { position: absolute; z-index: 3; touch-action: none; }
#journeyTray.phone .jt-h { display: none; }
.jt-h[data-h="n"] { top: -2px; left: 12px; right: 12px; height: 12px; cursor: ns-resize; }
.jt-h[data-h="s"] { bottom: -2px; left: 12px; right: 12px; height: 12px; cursor: ns-resize; }
.jt-h[data-h="e"] { right: -2px; top: 12px; bottom: 12px; width: 12px; cursor: ew-resize; }
.jt-h[data-h="w"] { left: -2px; top: 12px; bottom: 12px; width: 12px; cursor: ew-resize; }
.jt-h[data-h="ne"] { top: -2px; right: -2px; width: 14px; height: 14px; cursor: nesw-resize; }
.jt-h[data-h="nw"] { top: -2px; left: -2px; width: 14px; height: 14px; cursor: nwse-resize; }
.jt-h[data-h="se"] { bottom: -2px; right: -2px; width: 14px; height: 14px; cursor: nwse-resize; }
.jt-h[data-h="sw"] { bottom: -2px; left: -2px; width: 14px; height: 14px; cursor: nesw-resize; }
body.jt-dragging .jt-frame { pointer-events: none; }
`;

const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
let tray = null, frame = null, rect = null;

const isPhone = () => window.innerWidth < PHONE;

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && [v.x, v.y, v.w, v.h].every(Number.isFinite)) return v;
  } catch { /* unreadable: use the default */ }
  return null;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(rect)); } catch { /* private mode: nothing to keep */ }
}

/** Size within the screen, title bar always reachable. */
function clamp(r) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, MIN_W), vw), h = Math.min(Math.max(r.h, MIN_H), vh);
  const x = Math.min(Math.max(r.x, 0), vw - w);
  const y = Math.min(Math.max(r.y, 0), vh - BAR);
  return { x, y, w, h };
}
function defaultRect() {
  const w = Math.round(window.innerWidth * 0.7), h = Math.round(window.innerHeight * 0.8);
  return { x: Math.round((window.innerWidth - w) / 2), y: Math.round((window.innerHeight - h) / 2), w, h };
}
function apply() {
  if (!tray) return;
  const phone = isPhone();
  tray.classList.toggle("phone", phone);
  if (phone) { ["left", "top", "width", "height"].forEach((p) => tray.style.removeProperty(p)); return; }
  rect = clamp(rect);
  Object.assign(tray.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
}

function drag(e, mode) {
  if (isPhone() || e.button > 0) return;
  e.preventDefault();
  const start = { ...rect }, sx = e.clientX, sy = e.clientY, el = e.currentTarget;
  try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  document.body.classList.add("jt-dragging");
  const move = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    let { x, y, w, h } = start;
    if (mode === "move") { x += dx; y += dy; }
    else {
      // Growing east or south stops at the screen edge; it never shoves the window back.
      if (mode.includes("e")) w = Math.min(start.w + dx, window.innerWidth - start.x);
      if (mode.includes("s")) h = Math.min(start.h + dy, window.innerHeight - start.y);
      if (mode.includes("w")) { w = Math.max(MIN_W, start.w - dx); x = start.x + start.w - w; }
      if (mode.includes("n")) { h = Math.max(MIN_H, start.h - dy); y = start.y + start.h - h; }
    }
    rect = clamp({ x, y, w, h });
    apply();
  };
  const up = () => {
    document.body.classList.remove("jt-dragging");
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    save();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
}

function build() {
  const style = document.createElement("style");
  style.id = "journeyTrayStyle";
  style.textContent = CSS;
  document.head.appendChild(style);
  tray = document.createElement("div");
  tray.id = "journeyTray";
  tray.hidden = true;
  tray.setAttribute("role", "dialog");
  tray.setAttribute("aria-label", t("Mapping My Journey"));
  const bar = document.createElement("div");
  bar.className = "jt-bar";
  bar.innerHTML = `<span class="jt-title"></span><button type="button" class="jt-close"></button>`;
  bar.querySelector(".jt-title").textContent = t("Mapping My Journey");
  const close = bar.querySelector(".jt-close");
  close.textContent = "✕";
  close.setAttribute("aria-label", t("Close"));
  close.setAttribute("title", t("Close"));
  close.addEventListener("click", closeJourneyTray);
  close.addEventListener("pointerdown", (e) => e.stopPropagation());
  bar.addEventListener("pointerdown", (e) => drag(e, "move"));
  frame = document.createElement("iframe");
  frame.className = "jt-frame";
  frame.title = t("Mapping My Journey");
  tray.append(bar, frame);
  for (const h of HANDLES) {
    const d = document.createElement("div");
    d.className = "jt-h";
    d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => drag(e, h));
    tray.appendChild(d);
  }
  document.body.appendChild(tray);
  window.addEventListener("resize", apply);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !tray.hidden) closeJourneyTray(); });
}

export function openJourneyTray() {
  if (!tray) build();
  rect = load() || defaultRect();
  if (!frame.getAttribute("src")) frame.setAttribute("src", SRC);
  tray.hidden = false;
  apply();
}

export function closeJourneyTray() {
  if (!tray || tray.hidden) return;
  tray.hidden = true;
  // Fresh each time it opens, so the screen is never stale; the page underneath was never touched.
  frame.removeAttribute("src");
}

function isJourneyLink(a) {
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
  try {
    const u = new URL(a.getAttribute("href"), location.href);
    return u.origin === location.origin && /\/journey-map\.html$/.test(u.pathname);
  } catch { return false; }
}

// One delegated listener for every plain link to Mapping My Journey (the nav,
// the Note view's menu). Modified clicks and middle clicks keep the link's own
// behaviour (new tab). Not installed inside the tray's own iframe.
let embedded = false;
try { embedded = new URLSearchParams(location.search).get("embed") === "1"; } catch { /* none */ }
// (nor on journey-map.html itself, where the link would open the screen over itself).
if (!embedded && !/\/journey-map\.html$/.test(location.pathname)) {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!isJourneyLink(a)) return;
    e.preventDefault();
    openJourneyTray();
  });
}
