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
    background: "#1F3A6E",
    color: "#fff",
    border: "none",
    borderRadius: "999px",
    padding: "0.6rem 1.1rem",
    font: "600 0.9rem system-ui, sans-serif",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
    cursor: "pointer",
  });
  notice.addEventListener("click", () => location.reload());
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
  if (!("serviceWorker" in navigator)) return;
  if (!isSecureEnough() || isDisabled()) {
    if ("serviceWorker" in navigator) unregisterAny();
    return;
  }

  window.addEventListener("load", () => {
    // { type: "module" } -- sw.js imports APP_VERSION directly (see its own
    // header) rather than duplicating the version string a second time.
    navigator.serviceWorker.register("/app/sw.js", { type: "module" }).then((reg) => {
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
    }).catch((err) => {
      // Best-effort, like every other progressive-enhancement feature in
      // this app: a registration failure must never block the page the
      // person actually came to use.
      console.warn("Service worker registration failed:", err.message);
    });
  });
}
