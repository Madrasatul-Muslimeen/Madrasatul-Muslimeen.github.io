// PCF MSA J120 step O5 -- one calm Offline line. The Owner's plan (J120 j120p2): "One calm 'Offline: working from this
// device' line at the top ... back online, everything waiting is sent by itself and the line says 'All saved ✓'."
//
// Loaded by sw-register.js (the one function every page calls) ONLY when the device is offline -- at load, or on the
// browser's `offline` event -- so a page that stays online never fetches this file (I9). sw-register asks the worker
// to keep it, so it opens offline even before "Get ready for offline".
//
// THE LINE: a thin strip, the first thing in the page (in the flow, not floating over anything: no page here has a
// fixed header at the top, measured 10 Nov 2026), calm colours (not the red failure banner), role="status".
//   offline                    -> "Offline: working from this device"
//   back online, still sending -> "Back online — saving your changes…"
//   nothing left waiting       -> "All saved ✓", then the strip goes away after a few seconds
//   still waiting after a while -> says how many Notes still wait, and where they will be saved
// "WAITING" means: (1) Firestore's own queue of writes kept on the device (Records, Bookmarks, progress marks; the SDK
// sends them by itself) -- asked with waitForPendingWrites() only when this page already loaded Firebase, never
// loading it for this; and (2) Notes kept in the outbox (note-outbox.js), which this line also sends, through the
// outbox's own replay, when this page already loaded Firebase and someone is signed in.
//
// WHAT NEEDS THE INTERNET SAYS SO IN WORDS (the plan's O5): while offline, a tap on Sign in (#signInBtn, on 30 pages,
// and the start-up screen's #bootStatusSignIn) or on a link to an outside website is stopped before it fails, and the
// line says in words that it needs the internet. (Recitation audio and the Asma posters live in Quran Study and Asma,
// QuranRevival's parts: asked of the PCA as a change request, not changed here.)
import { t, num } from "./i18n.js";

const LINE_ID = "mmOfflineLine";
const STYLE_ID = "mmOfflineLineStyle";
const OUTBOX_KEY = "mmsa.noteOutbox.v1"; // note-outbox.js OUTBOX_KEY (read here directly, so the outbox's code is not loaded for a count)
const SAVED_SHOW_MS = 4000;
const WAIT_LIMIT_MS = 60000;
const CSS = `
#${LINE_ID} { display: flex; align-items: center; justify-content: center; gap: 0.4rem; box-sizing: border-box; width: 100%;
  min-height: 32px; padding: 0.3rem 0.8rem; margin: 0; font: 600 0.85rem/1.3 system-ui, sans-serif; text-align: center;
  overflow-wrap: anywhere; background: #eef1f6; color: #1f3a6e; border-bottom: 1px solid #c9d3e3; }
#${LINE_ID}[hidden] { display: none; }
#${LINE_ID}[data-state="saved"] { background: #e8f4ec; color: #1d5b33; border-bottom-color: #b9dcc4; }
`;

let line = null, hideTimer = 0, checking = 0;

function outboxCount() {
  try { const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]"); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
}
/** Did this page already load Firebase? (Never loaded here only to ask.) */
function firebaseLoaded() {
  try { return performance.getEntriesByType("resource").some((e) => /\/js\/firebase-init\.js(\?|$)/.test(e.name)); } catch { return false; }
}

function show(state, text) {
  clearTimeout(hideTimer);
  line.dataset.state = state;
  line.textContent = text;
  line.hidden = false;
}

function offlineNow() { return typeof navigator !== "undefined" && navigator.onLine === false; }

/** Back online: send what waits, then say "All saved ✓" -- or, after a minute, what is still waiting. */
async function whenBackOnline() {
  const run = ++checking;
  show("saving", t("Back online — saving your changes…"));
  const t0 = Date.now();
  let fb = null;
  if (firebaseLoaded()) { try { fb = await import("./firebase-init.js"); } catch { fb = null; } }
  // Notes kept on the device: sent through the outbox's own replay (the same one the Notes pages run).
  if (fb && outboxCount() && fb.auth && fb.auth.currentUser) {
    try {
      const outbox = await import("./note-outbox.js");
      await outbox.replayOutbox(fb.db, { actorUid: fb.auth.currentUser.uid });
    } catch { /* a refused save is reported by the outbox's own listeners on the Notes pages (I15); counted below */ }
  }
  // Records, Bookmarks and progress marks: Firestore sends its own queue; wait for it (bounded).
  if (fb) {
    try {
      const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      await Promise.race([fs.waitForPendingWrites(fb.db), new Promise((r) => setTimeout(r, WAIT_LIMIT_MS))]);
    } catch { /* nothing more to wait for */ }
  }
  if (run !== checking || offlineNow()) return; // the line dropped again, or a newer check took over
  const notes = outboxCount();
  if (notes) {
    show("waiting", t("Back online. {n} Note(s) written offline will be saved when you open Notes or Mapping My Journey.", { n: num(notes) }));
    return;
  }
  // A short pause so "saving…" is readable even when nothing waited.
  const wait = Math.max(0, 600 - (Date.now() - t0));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  if (run !== checking || offlineNow()) return;
  show("saved", t("All saved ✓"));
  hideTimer = setTimeout(() => { if (line.dataset.state === "saved") line.hidden = true; }, SAVED_SHOW_MS);
}

/** While offline: Sign in and outside links say they need the internet instead of failing. Capturing, so it runs
 *  before the page's own handler, and only while navigator.onLine is false. */
function guardInternetOnly(e) {
  if (!offlineNow()) return;
  const target = e.target && e.target.closest ? e.target : null;
  if (!target) return;
  let why = "";
  if (target.closest("#signInBtn, #bootStatusSignIn")) why = t("Signing in needs the internet. Connect, then tap Sign in again.");
  else {
    const a = target.closest("a[href]");
    if (a) {
      let url = null;
      try { url = new URL(a.getAttribute("href"), location.href); } catch { url = null; }
      if (url && /^https?:$/.test(url.protocol) && url.origin !== location.origin) why = t("Outside websites need the internet. This link will open when you are online.");
    }
  }
  if (!why) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  show("offline", why);
}

function whenOffline() {
  checking++;
  show("offline", t("Offline: working from this device"));
}

/** Mounts the line once per page and follows the connection from then on. */
export function mountOfflineLine() {
  if (document.getElementById(LINE_ID)) return;
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  line = document.createElement("div");
  line.id = LINE_ID;
  line.setAttribute("role", "status");
  line.setAttribute("aria-live", "polite");
  line.hidden = true;
  document.body.insertBefore(line, document.body.firstChild);
  window.addEventListener("click", guardInternetOnly, true);
  window.addEventListener("offline", whenOffline);
  window.addEventListener("online", () => { whenBackOnline(); });
  if (offlineNow()) whenOffline();
}
