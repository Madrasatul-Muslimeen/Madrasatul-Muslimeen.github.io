// The Asma ul Husna screensaver's watcher (Owner, 10 Oct 2026: "Enable Asma poster as a screen saver to appear with
// options of timing how long each will display, poster choices, etc ... in all platforms"; master file tab 3).
//
// This is the ONLY part on every page's startup path, and it is deliberately small: it reads this device's settings
// (localStorage, no network), listens for the reader touching the page, and when the page has been left alone for the
// chosen time it loads asma-screensaver.js, which does everything else. Load-speed contract: "Screensaver -- on
// first use, never at startup": nothing is fetched until the screensaver starts. (I9: flagged to the Owner in the
// master file, tab 3 section 2.)
//
// It never starts while a recitation or any other sound or video plays, while the reader is typing, while the
// Writing sheet is open, while the page is in the background, or on the sign-in pages.
//
// I2: a leaf. Each page's bootstrap calls armScreensaver() next to registerServiceWorker().

const KEY = "mm_screensaver";
const KILL_SWITCH_KEY = "mm_disable_screensaver"; // set by the test harness, like mm_disable_service_worker

/** Every setting, with the defaults the Owner was offered (master file tab 3, questions 1-4). Posters: both kinds,
    the Owner's own earlier "Both" answer for the Asma page's screensaver (Phase 13 round 3). */
export const SCREENSAVER_DEFAULTS = Object.freeze({
  on: true, idleMin: 3, eachSec: 15, kind: "both", which: "all", fav: [], order: "carry", move: "fade",
  clock: true, night: "dim", wake: true, where: "any", pos: 0,
});

export function getScreensaverSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch {}
  return { ...SCREENSAVER_DEFAULTS, ...saved };
}

export function setScreensaverSettings(patch) {
  const next = { ...getScreensaverSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

const NEVER_ON = new Set(["accept-invite.html", "onboarding.html", "admin-self-check.html", "migrate.html"]);
const HOME = new Set(["quranrevival.html", ""]);

function pageName() { return location.pathname.split("/").pop(); }

function disabled() {
  try { if (localStorage.getItem(KILL_SWITCH_KEY) === "1") return true; } catch {}
  return new URLSearchParams(location.search).has("noscreensaver");
}

/** True while something the reader is doing must not be covered. Exported for its own checks. */
export function screensaverHeld(doc = document) {
  if (doc.visibilityState === "hidden") return true;
  if ([...doc.querySelectorAll("audio,video")].some((m) => !m.paused && !m.ended)) return true;
  const a = doc.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return true;
  const ws = doc.getElementById("writingSheet");
  if (ws && !ws.hidden && ws.getClientRects().length) return true;
  if (doc.querySelector("[data-screensaver-hold]")) return true;
  return false;
}

let timer = null;
let armed = false;
let running = false;

function schedule() {
  clearTimeout(timer);
  if (running) return;
  const s = getScreensaverSettings();
  if (!s.on) return;
  if (s.where === "home" && !HOME.has(pageName())) return;
  const ms = Math.max(10, Number(s.idleMin) * 60) * 1000;
  timer = setTimeout(tryStart, ms);
}

function tryStart() {
  if (screensaverHeld()) { schedule(); return; }
  startScreensaver({ auto: true });
}

/** Starts the screensaver now (the Asma page's button, the settings' Preview, or the watcher). */
export async function startScreensaver(opts = {}) {
  if (running) return;
  running = true;
  clearTimeout(timer);
  try {
    const m = await import("./asma-screensaver.js");
    await m.runAsmaScreensaver({ ...opts, onClose: () => { running = false; schedule(); } });
  } catch (err) {
    running = false;
    console.warn("screensaver could not start", err);
    schedule();
  }
}

/** Opens the settings panel (Home menu ▸ 🌙 Screensaver). */
export async function openScreensaverSettings({ entries = null } = {}) {
  const m = await import("./asma-screensaver.js");
  m.openAsmaScreensaverSettings({ entries, start: (o) => startScreensaver({ entries, ...o }), onChange: schedule });
}

/** Called once by every page. Safe to call again. */
export function armScreensaver() {
  if (armed) return;
  armed = true;
  // The Home menu's 🌙 Screensaver button works on every page, even where starting by itself is off.
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-screensaver-settings]");
    if (!b) return;
    e.preventDefault();
    b.closest("details")?.removeAttribute("open");
    openScreensaverSettings();
  });
  if (disabled() || NEVER_ON.has(pageName())) return;
  const touch = () => { if (!running) schedule(); };
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll", "input"]) {
    window.addEventListener(ev, touch, { passive: true, capture: true });
  }
  document.addEventListener("visibilitychange", touch);
  window.addEventListener("storage", (e) => { if (e.key === KEY) touch(); });
  schedule();
}
