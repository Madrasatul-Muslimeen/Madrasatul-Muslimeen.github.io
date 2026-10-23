// Service worker registration (load speed, issue #272, 25 Sep 2026).
//
// app/sw.js is what actually caches the app on the phone; this file is the
// small, page-side half -- deciding WHETHER to register at all, and telling
// the reader when a new version has been cached rather than silently
// swapping code out from under them mid-session.
//
// I2: this file talks to no module in this app except i18n.js's t() (I11:
// every user-visible string is language-keyed, this one included, and every
// page here already has i18n.js loaded -- reusing it costs nothing new) --
// it is a leaf, called from each page's own bootstrap the same way
// mountSyncedAppLangControl() already is, never imported the other way
// around.
//
// ---------------------------------------------------------------------
// TWO KILL SWITCHES, CHECKED BEFORE register() IS EVER CALLED
// ---------------------------------------------------------------------
//   1. A `?nosw` query on the page -- a person (or a future round chasing a
//      caching bug) can always ask for the network directly.
//   2. `localStorage.mm_disable_service_worker === "1"` -- set
//      unconditionally by the test harness (tools/i18n-verify/harness.mjs's
//      newContext()), so no suite's run ever installs a real worker. Every
//      existing suite fakes Firebase via Playwright's own request routing;
//      a service worker intercepting fetches on top of that is a real
//      interaction this round has no need to take on to ship caching for an
//      actual reader.
//
// Either switch also UNREGISTERS any worker this origin already installed
// on an earlier visit -- otherwise turning the switch on would still leave
// a stale worker serving a stale cache forever.
import { t } from "./i18n.js";
import { isZabReady } from "./zab-readiness.js";

const KILL_SWITCH_KEY = "mm_disable_service_worker";

function isDisabled() {
  if (new URLSearchParams(location.search).has("nosw")) return true;
  try {
    return localStorage.getItem(KILL_SWITCH_KEY) === "1";
  } catch {
    return false;
  }
}

/** https or localhost only -- the platform itself refuses a worker on a bare
 *  http:// origin, but stating it here means a read of this file explains
 *  why, rather than only a browser console error nobody sees. */
function isSecureEnough() {
  return location.protocol === "https:" || location.hostname === "localhost";
}

function unregisterAny() {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

/**
 * A small, fixed notice telling the reader a new version has been cached
 * and is one tap away -- never a silent reload out from under them. Its own
 * inline styles rather than a shell.css class: it is one tiny, self-
 * contained element that every one of ~35 pages can pull in unchanged,
 * and it must render correctly even on a page whose own stylesheet failed
 * to load (the exact moment a caching bug would otherwise leave a reader
 * stuck on old code with no way to know).
 */
let reloadOnTakeover = false;

/** Same-origin files this page has already loaded, for the worker to keep. */
function loadedAppFiles() {
  const urls = new Set([location.href.split("#")[0]]);
  for (const entry of performance.getEntriesByType("resource")) {
    if (entry.name.startsWith(location.origin)) urls.add(entry.name.split("#")[0]);
  }
  return [...urls];
}

/**
 * Audit part 41 review: the "warm" list above is sent once, after load, so a module the page imports LATER (a
 * lazy import such as note-foundation.js) was never kept on a first visit, and the first open after an update
 * fetched it from the network (service-worker.mjs, red on main 3 of 3). Send each later file too, in batches.
 */
function warmLaterFiles(reg) {
  if (!reg?.active || typeof PerformanceObserver !== "function") return;
  let batch = new Set(), timer = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name.startsWith(location.origin)) batch.add(entry.name.split("#")[0]);
      if (!batch.size || timer) return;
      timer = setTimeout(() => { const urls = [...batch]; batch = new Set(); timer = 0; reg.active?.postMessage({ type: "warm", urls }); }, 500);
    }).observe({ type: "resource" });
  } catch { /* best effort, like the first warm */ }
}

function announceUpdate() {
  if (document.getElementById("swUpdateNotice")) return; // already showing
  const notice = document.createElement("button");
  notice.id = "swUpdateNotice";
  notice.type = "button";
  notice.textContent = t("Updated — tap to reload");
  Object.assign(notice.style, {
    position: "fixed",
    left: "50%",
    bottom: "1rem",
    transform: "translateX(-50%)",
    zIndex: "99999",
    // Audit part 46 (J29): a finger control is 40px or more (it was 35px at 768 and up) and one line (left: 50% had
    // squeezed it to half the screen, so on a phone the words wrapped into a two-line pill).
    minHeight: "44px",
    width: "max-content",
    maxWidth: "calc(100vw - 2rem)",
    boxSizing: "border-box",
    background: "#1F3A6E",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "0.6rem 1.1rem",
    font: "600 0.9rem system-ui, sans-serif",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
    cursor: "pointer",
  });
  notice.addEventListener("click", () => {
    // Let the waiting new version take over; the page reloads once it has
    // (controllerchange below), so it never runs on a mix of two versions.
    reloadOnTakeover = true;
    navigator.serviceWorker.getRegistration("/app/").then((reg) => {
      if (reg?.waiting) reg.waiting.postMessage({ type: "skipWaiting" });
      else location.reload();
    }).catch(() => location.reload());
  });
  document.body.appendChild(notice);
}

/**
 * Call once from each page's own bootstrap, the same way
 * mountSyncedAppLangControl() is called on every page individually rather
 * than hidden inside a shared renderer (nav.js stays pure -- I2). Deferred
 * to the window `load` event on purpose: registering (and the worker's own
 * first cache-fill fetches) must never compete with, or delay, the page's
 * own first paint or its startup reads (I9) -- only after the page the
 * person actually asked for is already usable.
 */
export function registerServiceWorker() {
  // Zab round Z2 (PCF J25): this is the one function every page already calls, so it carries the Zab bar's
  // mount -- ONE place, not pasted into each page. zab-readiness.js is pure and tiny; the bar's own code is
  // fetched ONLY when the gate is open, so a shut gate costs a page nothing and shows nothing (I9).
  const inWindow = new URLSearchParams(location.search).get("inWindow") === "1" && window.parent !== window; // J74: inside a page window
  const embedded = new URLSearchParams(location.search).get("embed") === "1" && window.parent !== window; // J29 part 41: inside the tray / the Notes window: the page around it has its own Zab
  // Audit part 48 (J29): the bar's code (~26 KB gzipped) was fetched at once, in the middle of the page's own startup
  // imports; it now waits for the window `load` event and an idle moment (2 s at most), so the page is usable first.
  if (isZabReady() && !inWindow && !embedded) {
    const mountZab = () => import("./zab-bar.js").then((m) => m.mountZabBar()).catch((err) => console.warn("Zab bar not mounted:", err.message));
    const whenIdle = () => (window.requestIdleCallback ? window.requestIdleCallback(mountZab, { timeout: 2000 }) : setTimeout(mountZab, 500));
    if (document.readyState === "complete") whenIdle(); else window.addEventListener("load", whenIdle, { once: true });
  }
  if (!("serviceWorker" in navigator)) return;
  if (!isSecureEnough() || isDisabled()) {
    if ("serviceWorker" in navigator) unregisterAny();
    return;
  }

  const start = () => {
    // { type: "module" } -- sw.js imports APP_VERSION directly (see its own
    // header) rather than duplicating the version string a second time.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadOnTakeover) location.reload();
    });
    navigator.serviceWorker.register("/app/sw.js", { type: "module" }).then((reg) => {
      // A new version already downloaded on an earlier open and still
      // waiting: say so again, every open, until the reader takes it.
      if (reg.waiting && navigator.serviceWorker.controller) announceUpdate();
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // "installed" + an EXISTING controller means this is an UPDATE
          // (a fresh install on a first-ever visit has no controller yet,
          // and there is nothing to tell a first-time reader about).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate();
          }
        });
      });
      return navigator.serviceWorker.ready;
    }).then((reg) => {
      reg?.active?.postMessage({ type: "warm", urls: loadedAppFiles() });
      warmLaterFiles(reg);
    }).catch((err) => {
      // Best-effort, like every other progressive-enhancement feature in
      // this app: a registration failure must never block the page the
      // person actually came to use.
      console.warn("Service worker registration failed:", err.message);
    });
  };
  // Deferred until the page has finished loading (see above). A page that
  // calls this after its own load event has already fired would otherwise
  // never register at all.
  // Audit part 48 (J29): `load` fires when the page's imports are in, but its own data (the surah index, the first surah)
  // is fetched just after; the worker's install (~6 MB) then shared the same slow link with it. So the install waits
  // until the page has made no new request for 1 s (10 s at most). A PerformanceObserver sees every new request; counting
  // performance.getEntriesByType("resource") would stop seeing them once the browser's 250-entry buffer is full.
  const startWhenQuiet = () => {
    const t0 = Date.now();
    let since = Date.now(), obs = null;
    try { obs = new PerformanceObserver(() => { since = Date.now(); }); obs.observe({ type: "resource" }); } catch { /* no observer: the 10 s cap still starts it */ }
    const poll = () => {
      if (Date.now() - since >= 1000 || Date.now() - t0 >= 10000) { if (obs) obs.disconnect(); start(); } else setTimeout(poll, 250);
    };
    poll();
  };
  if (document.readyState === "complete") startWhenQuiet();
  else window.addEventListener("load", startWhenQuiet, { once: true });
}
