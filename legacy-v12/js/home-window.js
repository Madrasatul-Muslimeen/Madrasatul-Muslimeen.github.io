// The home window's size and place, shared by every pop-up on a computer (PCF MSA J72, the Owner, 22 Oct 2026:
// "Enable this size globally for all pop-ups" and "all screen that opens from a click should appear in the same size
// of the home screen it was click from").
//
// The home window is the landing screen's own window (the Mastery Wheel, initPopupWindow id "wheel"). Whenever it is
// placed on a computer it records its rect here; every other pop-up (Explore, the Āyah card, the Notes window, the
// Read window, the Word card, Know Your Status) opens at this rect. With SHARED on (the Owner's choice n72a, A), a
// pop-up the reader moves or resizes records ITS rect here too, so the next pop-up opens the same; with it off (B) a
// pop-up keeps its own remembered place after the first change and only its first opening is the home rect.
//
// Pure UI: one localStorage key, nothing else. A rect is { x, y, w, h } in CSS pixels.
const KEY = "mmsa-home-window-v1";
export const SHARED = true;
export const HOME_FROM = 900; // the width from which the app's views are pop-up windows

let current = null;
function valid(r) { return !!r && [r.x, r.y, r.w, r.h].every(Number.isFinite) && r.w > 0 && r.h > 0; }

/** The home rect, clamped inside today's screen; null on a narrow screen or before the home window was first placed. */
export function homeRect() {
  if (window.innerWidth < HOME_FROM) return null;
  if (!current) { try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); if (valid(r)) current = r; } catch { /* private mode */ } }
  if (!current) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(current.w, vw), h = Math.min(current.h, vh);
  return { x: Math.round(Math.min(Math.max(current.x, 0), vw - w)), y: Math.round(Math.min(Math.max(current.y, 0), vh - h)), w: Math.round(w), h: Math.round(h) };
}

/** Places a dialog box at the home rect on a computer (inline position, so it beats the box's own CSS size); on a
    narrow screen, or before the home window was placed, it clears that and the box keeps its own layout. */
export function placeAtHome(el, r = homeRect()) {
  if (!el) return false;
  const props = { position: "fixed", left: `${r?.x}px`, top: `${r?.y}px`, width: `${r?.w}px`, height: `${r?.h}px`, maxHeight: "none", maxWidth: "none", margin: "0", boxSizing: "border-box" };
  for (const [k, v] of Object.entries(props)) el.style[k] = r ? v : "";
  return !!r;
}

/** True when the home rect is one the reader chose (moved or resized), not the home window's own first fill. */
export function homeRectChosen() { homeRect(); return !!current?.user; }

/** Records `r` as the home rect. `from` is "home" (the home window itself) or "popup" (honoured only when SHARED);
    `user` marks a rect the reader chose by moving or resizing (a re-fit of an untouched window never replaces one). */
export function setHomeRect(r, { from = "home", user = false } = {}) {
  if (window.innerWidth < HOME_FROM || !valid(r)) return;
  if (from !== "home" && !SHARED) return;
  homeRect();
  if (!user && current?.user) return;
  const next = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h), user: !!user };
  if (current && current.x === next.x && current.y === next.y && current.w === next.w && current.h === next.h && current.user === next.user) return;
  current = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* not remembered */ }
}

/** True inside a page window (PCF MSA J74: a menu page in a frame over the landing screen): there the frame IS the home
    window, and the home rect (in the landing screen's pixels) means nothing. */
export function inPageWindow() { try { return window.self !== window.top; } catch { return true; } }

/** Places a pop-up a page opens (the Track window, an Asma poster) at the home size on a computer (PCF MSA J72, the
    sweep's second part): the home rect on a page of its own, the whole frame inside a page window. Sets --hw / --hh
    (the box's width and height) for content sized to the screen; on a phone, or before the home window was placed, it
    clears all of that and the pop-up keeps its own layout. Returns true when placed. */
export function placeDialogAtHome(el) {
  if (!el) return false;
  const r = inPageWindow() ? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight } : homeRect();
  const placed = placeAtHome(el, r);
  el.style.setProperty("--hw", placed ? `${r.w}px` : "");
  el.style.setProperty("--hh", placed ? `${r.h}px` : "");
  el.classList.toggle("at-home", placed);
  return placed;
}
