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
import { HANDLES, handleCss, clampRect, startDrag } from "./float-window.js";

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
${handleCss("jt-h")}
#journeyTray.phone .jt-h { display: none; }
body.jt-dragging .jt-frame { pointer-events: none; }
`;

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

const LIMITS = { minW: MIN_W, minH: MIN_H, bar: BAR };
const clamp = (r) => clampRect(r, LIMITS);
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

const dragCtx = { getRect: () => rect, setRect: (r) => { rect = r; apply(); }, locked: isPhone, limits: LIMITS, onEnd: () => save(), dragClass: "jt-dragging" };
const drag = (e, mode) => startDrag(e, mode, dragCtx);

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

/** `noteId` (decision 95: "Open in Mapping My Journey" from the Read view's Notes pane) opens that Note in the tray. */
export function openJourneyTray({ noteId = null } = {}) {
  if (!tray) build();
  rect = load() || defaultRect();
  if (noteId) frame.setAttribute("src", `journey-map.html?embed=1&note=${encodeURIComponent(noteId)}#folders`);
  else if (!frame.getAttribute("src")) frame.setAttribute("src", SRC);
  tray.hidden = false;
  apply();
}

export function closeJourneyTray() {
  if (!tray || tray.hidden) return;
  // Siyagah round 5: the page inside is only hidden, never unloaded, so tell it to
  // flush a pending Note edit (a revision) before it goes out of sight.
  try { frame.contentWindow?.postMessage({ type: "mmsa-journey-flush" }, location.origin); } catch { /* not loaded */ }
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
