// D23 (the Dua Card like the Āyah card): on a computer the card's ⤢ opens it as a MOVABLE, RESIZABLE window, not a sheet
// over the page. A drag bar moves it, eight handles resize it, its place and size are remembered, and its bar can never
// leave the screen. The drag / resize mechanism is float-window.js (shared, imported read-only, unchanged); this module
// only dresses a Dua Card with it. On a phone or tablet (under 900px) it does nothing and the card keeps its sheet.
import { HANDLES, handleCss, startDrag, clampRect } from "./float-window.js";
import { t } from "./i18n.js";

export const DUA_WINDOW_MIN_WIDTH = 900;          // the screen width from which the card may float
const KEY = "dua.cardWindow.v1";
/** The app's bottom bar (zab-bar.js, 2.75rem) covers the foot of every page that shows it: the window's bar must stay above it. */
const zabHeight = () => (document.body.classList.contains("zab-bar-on") ? 2.75 * parseFloat(getComputedStyle(document.documentElement).fontSize || "16") : 0);
// The bar (44px) and the window border (1px each side) can never pass the screen bottom, nor sink under the Zab bar.
const LIMITS = { minW: 360, minH: 260, get bar() { return 46 + zabHeight(); } };
const BAR_H = 44;

/** True when the screen is wide enough for a floating window. */
export const canFloatDuaCard = () => typeof window !== "undefined" && window.innerWidth >= DUA_WINDOW_MIN_WIDTH;

function readRect() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    if (r && [r.x, r.y, r.w, r.h].every(Number.isFinite)) return r;
  } catch { /* a private window: the card opens at its home place */ }
  return null;
}
function saveRect(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* not remembered, still works */ } }
function homeRect() {
  const w = Math.min(680, window.innerWidth - 80), h = Math.min(Math.round(window.innerHeight * 0.85), 820);
  return { x: Math.round((window.innerWidth - w) / 2), y: Math.round((window.innerHeight - h) / 2), w, h };
}
let cssDone = false;
function ensureCss() {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement("style");
  s.textContent = `${handleCss("dua-win-h")}
.dua-card-window { position: fixed; z-index: 50; box-sizing: border-box; margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.55); }
.dua-win-bar { flex: none; box-sizing: border-box; height: ${BAR_H}px; display: flex; align-items: center; gap: .5rem; padding: 0 .8rem; cursor: move; touch-action: none; user-select: none; background: #0c1329; border-bottom: 1px solid #c9a24b; color: #e0b95c; font-weight: 700; }
.dua-win-bar span { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dua-win-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: .6rem; }
.dua-card-window [data-dua-popout] { display: none; }
body.dua-win-dragging { user-select: none; cursor: grabbing; }
body.dua-win-dragging iframe { pointer-events: none; }`;
  document.head.appendChild(s);
}

/**
 * Float `article`. Returns { close, rect() }. The caller shows its own ✕ (the card's pop-up button); Escape also closes.
 * `title` is the bar's words. Moves the card's own children into a scroll area and back, so nothing is rebuilt.
 */
export function openDuaWindow(article, { title = "", onClose = null } = {}) {
  ensureCss();
  const scroll = document.createElement("div");
  scroll.className = "dua-win-scroll";
  while (article.firstChild) scroll.appendChild(article.firstChild);
  const bar = document.createElement("div");
  bar.className = "dua-win-bar";
  bar.dataset.duaWinBar = "";
  const label = document.createElement("span");
  label.textContent = title || t("Dua Card");
  bar.appendChild(label);
  if (onClose) {
    const x = document.createElement("button");
    x.type = "button"; x.className = "dua-tile dua-win-close"; x.dataset.duaWinClose = "";
    x.textContent = "✕"; x.setAttribute("aria-label", t("Close pop-up"));
    x.addEventListener("click", onClose);
    bar.appendChild(x);
  }
  article.append(bar, scroll);
  // A framed card sits under ancestors that can re-anchor `position: fixed` (a transform, a filter): the window lives on
  // the page itself while it floats, and a marker holds its place in the page.
  const marker = document.createComment("dua-card-window");
  article.replaceWith(marker);
  document.body.appendChild(article);
  article.classList.add("dua-card-window");
  article.dataset.duaWindow = "";
  let rect = clampRect(readRect() || homeRect(), LIMITS);
  const apply = (r) => { rect = r; Object.assign(article.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }); };
  apply(rect);
  const ctx = { getRect: () => rect, setRect: apply, locked: () => false, limits: LIMITS, onEnd: () => saveRect(rect), dragClass: "dua-win-dragging" };
  bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", ctx); });
  const handles = HANDLES.map((h) => {
    const d = document.createElement("div");
    d.className = "dua-win-h"; d.dataset.h = h; d.dataset.duaWinHandle = h;
    d.addEventListener("pointerdown", (e) => startDrag(e, h, ctx));
    article.appendChild(d);
    return d;
  });
  const onResize = () => apply(clampRect(rect, LIMITS)); // a smaller screen pulls the window back in
  window.addEventListener("resize", onResize);
  // Moving the card into the page drops the focus a click had given its button: Escape is heard on the page, and leaves a
  // pop-up that is open on top (Meaning, Poster …) to close first.
  const onEsc = (e) => { if (e.key === "Escape" && onClose && !e.defaultPrevented && !document.querySelector(".dua-pop")) onClose(); };
  document.addEventListener("keydown", onEsc);
  return {
    rect: () => ({ ...rect }),
    close() {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onEsc);
      handles.forEach((d) => d.remove());
      bar.remove();
      while (scroll.firstChild) article.appendChild(scroll.firstChild);
      scroll.remove();
      marker.replaceWith(article);
      article.classList.remove("dua-card-window");
      delete article.dataset.duaWindow;
      for (const k of ["left", "top", "width", "height"]) article.style.removeProperty(k);
    },
  };
}
