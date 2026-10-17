// QR J01 R3 (QR-only): the Asma app's screensaver watcher. MMSA's screensaver-idle.js (copied unchanged) keeps the
// settings (localStorage "mm_screensaver", MMSA's defaults: on, after 3 minutes, 15 seconds a poster, both kinds,
// carry on) and decides when a page is "busy" (screensaverHeld). Its own start, which loads MMSA's
// asma-screensaver.js (Firebase through session-context.js), is not used: this file is the same watcher, loading
// QR's asma-screensaver-qr.js instead. Nothing is fetched until the screensaver first starts or its settings open.
//
// Kill switches, as MMSA: localStorage mm_disable_screensaver = "1", or ?noscreensaver in the address. They stop it
// starting by itself; the 🌙 button still opens it.
import { getScreensaverSettings, screensaverHeld } from "./screensaver-idle.js";

let timer = null;
let armed = false;
let running = false;
let provider = null;

function disabled() {
  try { if (localStorage.getItem("mm_disable_screensaver") === "1") return true; } catch { /* storage blocked */ }
  return new URLSearchParams(location.search).has("noscreensaver");
}

function schedule() {
  clearTimeout(timer);
  if (running || disabled()) return;
  const s = getScreensaverSettings();
  if (!s.on) return;
  timer = setTimeout(tryStart, Math.max(10, Number(s.idleMin) * 60) * 1000);
}

function tryStart() {
  if (screensaverHeld()) { schedule(); return; }
  startScreensaver({ auto: true });
}

/** Starts it now (the 🌙 button, the settings' "Start now", or the watcher). */
export async function startScreensaver(opts = {}) {
  if (running) return;
  running = true;
  clearTimeout(timer);
  try {
    const m = await import("./asma-screensaver-qr.js");
    if (provider) m.setScreensaverDataSource(provider);
    await m.runAsmaScreensaver({ ...opts, onClose: () => { running = false; opts.onClose?.(); schedule(); } });
  } catch (err) {
    running = false;
    console.warn("screensaver could not start", err);
    schedule();
  }
}

/** Opens its settings panel. */
export async function openScreensaverSettings() {
  const m = await import("./asma-screensaver-qr.js");
  if (provider) m.setScreensaverDataSource(provider);
  m.openAsmaScreensaverSettings({ start: (o) => startScreensaver(o), onChange: schedule });
}

/** Hands the screensaver the app's Names, groups and Studied ticks (read when it starts, never at page load). */
export function setScreensaverData(fn) { provider = fn; }

/** Once, at page start: watch for the reader leaving the page alone. */
export function armScreensaver() {
  if (armed) return;
  armed = true;
  const touch = () => { if (!running) schedule(); };
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll", "input"]) {
    window.addEventListener(ev, touch, { passive: true, capture: true });
  }
  document.addEventListener("visibilitychange", touch);
  window.addEventListener("storage", (e) => { if (e.key === "mm_screensaver") touch(); });
  schedule();
}
