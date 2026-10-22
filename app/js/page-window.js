// A menu page as a window over the landing screen (PCF MSA J74, the Owner's tick n72b B, 22 Oct 2026: "Also show each
// page as a window at the home size over the landing screen"). On a computer, a link in the Qur'an page's menus
// (Home, Modules, Operation, Bookmark) opens its page inside a window at the home size and place (home-window.js),
// moved by its bar and resized from 8 handles like every other pop-up. The page inside is loaded with ?inWindow=1:
// it drops its own menu row and Zab bar (nav.js, sw-register.js), and a link back to the Qur'an page leaves the window.
// ← Back and ✕ close it, leaving the landing screen exactly as it was (the way-back law, decision 86); ↗ opens the
// page itself, full size, as before. Phones and tablets keep today's plain links.
//
// Pure UI: no Firebase; one shared rect (home-window.js).
import { t } from "./i18n.js";
import { HANDLES, handleCss, startDrag } from "./float-window.js";
import { homeRect, setHomeRect, HOME_FROM } from "./home-window.js";

const LIMITS = { minW: 420, minH: 320, bar: 48 };
const CSS = `
#pageWindow { position: fixed; z-index: 965; display: flex; flex-direction: column; box-sizing: border-box; background: #fff;
  border: 1px solid #c9a24b; border-radius: 10px; box-shadow: 0 12px 40px rgba(10, 20, 45, 0.35); overflow: hidden; }
#pageWindow[hidden] { display: none; }
.pgw-bar { flex: 0 0 auto; display: flex; align-items: center; gap: 0.5rem; min-height: 48px; padding: 0 0.4rem 0 0.5rem; background: #1F3A6E; color: #fff; cursor: move; touch-action: none; }
.pgw-btn { flex: 0 0 auto; min-width: 44px; min-height: 40px; padding: 0 0.75rem; border: 1px solid #c9a24b; border-radius: 0.6rem; background: transparent; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.pgw-btn:focus-visible { outline: 3px solid #c9a24b; outline-offset: 1px; }
.pgw-title { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pgw-close { flex: 0 0 auto; min-width: 48px; min-height: 48px; background: none; border: 0; color: #fff; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.pgw-frame { flex: 1 1 auto; width: 100%; min-height: 0; border: 0; background: #fff; }
body.pgw-dragging #pageWindow .pgw-frame { pointer-events: none; }
body.pgw-dragging { user-select: none; }
${handleCss("pgw-h")}
`;

let win = null, frame = null, titleEl = null, rect = null, href = "";
const winCtx = {
  getRect: () => rect, setRect: (r) => { rect = r; place(); },
  locked: () => !win || win.hidden, limits: LIMITS, onEnd: () => setHomeRect(rect, { from: "popup", user: true }), dragClass: "pgw-dragging",
};
function place() { if (win && rect) Object.assign(win.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }); }

function build() {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  win = document.createElement("div");
  win.id = "pageWindow";
  win.hidden = true;
  win.setAttribute("role", "dialog");
  const bar = document.createElement("div");
  bar.className = "pgw-bar";
  const back = document.createElement("button");
  back.type = "button"; back.className = "pgw-btn"; back.dataset.pgwBack = "";
  back.textContent = `← ${t("Back")}`;
  back.addEventListener("click", closePageWindow);
  titleEl = document.createElement("span");
  titleEl.className = "pgw-title";
  const full = document.createElement("button");
  full.type = "button"; full.className = "pgw-btn"; full.dataset.pgwFull = "";
  full.textContent = "↗";
  full.title = t("Open as a full page"); full.setAttribute("aria-label", t("Open as a full page"));
  full.addEventListener("click", () => { if (href) location.href = href; });
  const close = document.createElement("button");
  close.type = "button"; close.className = "pgw-close"; close.dataset.pgwClose = "";
  close.textContent = "✕";
  close.title = t("Close"); close.setAttribute("aria-label", t("Close"));
  close.addEventListener("click", closePageWindow);
  bar.append(back, titleEl, full, close);
  bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", winCtx); });
  frame = document.createElement("iframe");
  frame.className = "pgw-frame";
  win.append(bar, frame);
  for (const h of HANDLES) {
    const d = document.createElement("div");
    d.className = "pgw-h"; d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => startDrag(e, h, winCtx));
    win.appendChild(d);
  }
  document.body.appendChild(win);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && win && !win.hidden) closePageWindow(); });
  window.addEventListener("resize", () => { if (!win.hidden) { if (window.innerWidth < HOME_FROM) closePageWindow(); else { rect = homeRect() ?? rect; place(); } } });
}

/** Opens `url` (a page of this app) in the window, titled `title`. Returns false where a window is not used. */
export function openPageWindow(url, title) {
  const r = homeRect();
  if (window.innerWidth < HOME_FROM || !r) return false;
  if (!win) build();
  const u = new URL(url, location.href);
  u.searchParams.delete("navBack"); // the window has its own ← Back
  href = u.href;
  u.searchParams.set("inWindow", "1");
  frame.src = u.href;
  titleEl.textContent = title || "";
  frame.title = title || "";
  win.setAttribute("aria-label", title || "");
  rect = r;
  place();
  win.hidden = false;
  win.querySelector("[data-pgw-back]").focus({ preventScroll: true });
  return true;
}

export function closePageWindow() {
  if (!win || win.hidden) return;
  win.hidden = true;
  frame.src = "about:blank"; // the page inside stops (its reads, its timers)
}
export function isPageWindowOpen() { return !!win && !win.hidden; }

/** The Qur'an page's menus: a page link opens as a window on a computer. `navEl` holds the menus. */
export function wirePageWindowLinks(navEl) {
  navEl.addEventListener("click", (e) => {
    const a = e.target.closest("a.nav-link[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    const u = new URL(a.getAttribute("href"), location.href);
    if (u.origin !== location.origin || !/\.html$/.test(u.pathname) || /\/(quranrevival|index|journey-map)\.html$/.test(u.pathname)) return; // Mapping My Journey keeps its own tray (journey-tray.js)
    if (!openPageWindow(u.href, a.textContent.trim())) return;
    e.preventDefault();
    a.closest("details")?.removeAttribute("open"); // the menu folds away, as it does after a tap
  });
}
