// The Read view's 📝 Notes pane (decision 95, the Owner, 9 Oct 2026: "NotePane: Build the demo"; demo
// docs/reference/2026-10-09-read-note-pane-demo.html). One pane holding Mapping My Journey's own page in its unit
// mode (journey-map.html?embed=1&unit=<key>&unitLabel=<label>): the āyah's Notes, the same Note editor, folders and
// versions as Mapping My Journey, ✚ New note on the āyah, and Open in Mapping My Journey.
//
// Where it sits: beside the reading on a computer (>= SIDE_FROM px), docked under it on a tablet, over it on a phone
// (< PHONE px). The reading underneath is never moved: closing the pane leaves the reader exactly where they were
// (the way-back law, decision 86). The page inside is loaded on the first open, never at start-up (I9), and kept
// while the pane is closed so it reopens at once; moving to another āyah tells it the new unit instead of reloading.
//
// Owns no data. Its only messages: "mmsa-unit" (the āyah changed) and "mmsa-journey-flush" (save a Note being edited)
// to the page inside; "mmsa-open-journey" and "mmsa-unit-count" from it.
import { t } from "./i18n.js";

export const PHONE = 600, SIDE_FROM = 1100;

const CSS = `
#readNotePane { position: fixed; z-index: 960; display: flex; flex-direction: column; box-sizing: border-box; background: #fff; color: #222;
  border: 1px solid #c9a24b; box-shadow: 0 6px 28px rgba(0,0,0,0.3); overflow: hidden; }
#readNotePane[hidden] { display: none; }
#readNotePane.rnp-side { top: 0; right: 0; bottom: 0; width: var(--rnp-w); border-width: 0 0 0 2px; }
#readNotePane.rnp-dock { left: 0; right: 0; bottom: 0; height: var(--rnp-h); border-width: 2px 0 0; border-radius: 12px 12px 0 0; }
#readNotePane.rnp-phone { inset: 0; border: 0; }
.rnp-bar { flex: 0 0 auto; display: flex; align-items: center; gap: 0.4rem; min-height: 48px; padding: 0 0 0 0.5rem; background: #1F3A6E; color: #fff; }
.rnp-back { flex: 0 0 auto; min-height: 40px; padding: 0 0.7rem; border: 1px solid #c9a24b; border-radius: 0.6rem; background: transparent; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.rnp-title { flex: 1 1 auto; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rnp-journey { flex: 0 0 auto; min-width: 44px; min-height: 40px; padding: 0 0.6rem; border: 1px solid #c9a24b; border-radius: 0.6rem; background: transparent; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.rnp-close { flex: 0 0 auto; min-width: 48px; min-height: 48px; background: none; border: 0; color: #fff; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.rnp-frame { flex: 1 1 auto; width: 100%; min-height: 0; border: 0; background: #fff; }
.rnp-frame[hidden], .rnp-track[hidden] { display: none; }
.rnp-tabs { flex: 0 0 auto; display: flex; gap: 0.4rem; padding: 0.4rem 0.5rem; background: #f4efe2; border-bottom: 1px solid #e3d7b8; }
.rnp-tab { min-height: 40px; padding: 0 0.9rem; border: 1px solid #1F3A6E; border-radius: 20px; background: #fff; color: #1F3A6E; font: inherit; font-weight: 600; cursor: pointer; }
.rnp-tab[aria-selected="true"] { background: #1F3A6E; color: #fff; }
.rnp-track { flex: 1 1 auto; overflow: auto; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; }
.rnp-track p { margin: 0; color: #444; line-height: 1.5; }
.rnp-track-btn { min-height: 48px; padding: 0 1rem; border: 1px solid #c9a24b; border-radius: 0.7rem; background: #fdf6ea; color: #1F3A6E; font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
body.rnp-open-side { padding-right: var(--rnp-w); box-sizing: border-box; }
body.rnp-open-dock { padding-bottom: var(--rnp-h); }
`;

let frameReady = false, waiting = []; // messages for the page inside, held until it has loaded (the first opening)
function toFrame(msg) {
  if (frameReady) frame.contentWindow?.postMessage(msg, location.origin);
  else waiting.push(msg);
}
let pane = null, frame = null, titleEl = null, unit = null, onClose = null, track = null, tabs = null, host = {};
const TRACK_ACTIONS = [["take", "🧭", "Take an Approach"], ["record", "✅", "Record Your Progress"], ["status", "📊", "Know Your Status"]];
const counts = new Map(); // unitKey -> number of Notes, for the āyāt whose Notes the pane has read this session

function layout() {
  const w = window.innerWidth;
  return w < PHONE ? "phone" : w >= SIDE_FROM ? "side" : "dock";
}

function apply() {
  if (!pane) return;
  const mode = layout(), open = !pane.hidden;
  const root = document.documentElement;
  root.style.setProperty("--rnp-w", `${Math.max(380, Math.round(window.innerWidth * 0.4))}px`);
  root.style.setProperty("--rnp-h", `${Math.round(window.innerHeight * 0.55)}px`);
  pane.classList.toggle("rnp-side", mode === "side");
  pane.classList.toggle("rnp-dock", mode === "dock");
  pane.classList.toggle("rnp-phone", mode === "phone");
  document.body.classList.toggle("rnp-open-side", open && mode === "side");
  document.body.classList.toggle("rnp-open-dock", open && mode === "dock");
}

function srcFor(u, { focusNew = false } = {}) {
  const q = new URLSearchParams({ embed: "1", unit: u.unitKey, unitLabel: u.label });
  // In the address, not a message: the page may reload itself once (adopting the reader's language) and a message
  // sent before that is lost; the address is read again.
  if (focusNew) q.set("focusNew", "1");
  return `journey-map.html?${q.toString()}`;
}

function build() {
  const style = document.createElement("style");
  style.id = "readNotePaneStyle";
  style.textContent = CSS;
  document.head.appendChild(style);
  pane = document.createElement("aside");
  pane.id = "readNotePane";
  pane.hidden = true;
  pane.setAttribute("role", "dialog");
  const bar = document.createElement("div");
  bar.className = "rnp-bar";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "rnp-back";
  back.dataset.rnpBack = "";
  back.addEventListener("click", closeReadNotePane);
  titleEl = document.createElement("span");
  titleEl.className = "rnp-title";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "rnp-close";
  close.textContent = "✕";
  close.setAttribute("aria-label", t("Close"));
  close.title = t("Close");
  close.addEventListener("click", closeReadNotePane);
  // Open in Mapping My Journey, always on the bar: on a phone the Note fills the pane and the list's own button is out
  // of sight. The page inside answers with the Note it has open (mmsa-open-journey).
  const journey = document.createElement("button");
  journey.type = "button";
  journey.className = "rnp-journey";
  journey.dataset.rnpJourney = "";
  journey.textContent = "↗";
  journey.setAttribute("aria-label", t("Open in Mapping My Journey"));
  journey.title = t("Open in Mapping My Journey");
  journey.addEventListener("click", () => toFrame({ type: "mmsa-open-journey-request" }));
  bar.append(back, titleEl, journey, close);
  frame = document.createElement("iframe");
  frame.className = "rnp-frame";
  frame.addEventListener("load", () => {
    // An empty frame fires "load" for about:blank first; only the Journey page itself is ready to be told anything.
    let href = "";
    try { href = frame.contentWindow?.location?.href ?? ""; } catch { /* not ours */ }
    if (!/\/journey-map\.html/.test(href)) return;
    frameReady = true;
    const w = waiting; waiting = [];
    for (const m of w) frame.contentWindow?.postMessage(m, location.origin);
  });
  frame.title = t("Notes");
  // Decision 95: "Track this āyah becomes a tab of the pane". The tab offers the Read view's own three Approach
  // actions for this āyah (the same cards and the same records, 👥 included); each closes the pane and leaves a
  // "Back to Notes on …" way back to it (decision 86). Nothing here records anything itself.
  tabs = document.createElement("div");
  tabs.className = "rnp-tabs";
  tabs.setAttribute("role", "tablist");
  for (const [key, label] of [["notes", `📝 ${t("Notes")}`], ["track", `✅ ${t("Track this āyah")}`]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rnp-tab";
    b.setAttribute("role", "tab");
    b.dataset.rnpTab = key;
    b.textContent = label;
    b.addEventListener("click", () => showTab(key));
    tabs.appendChild(b);
  }
  track = document.createElement("div");
  track.className = "rnp-track";
  track.setAttribute("role", "tabpanel");
  track.hidden = true;
  pane.append(bar, tabs, frame, track);
  document.body.appendChild(pane);
  window.addEventListener("resize", apply);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pane && !pane.hidden && !document.getElementById("journeyTray")?.offsetParent) closeReadNotePane(); });
  window.addEventListener("message", (ev) => {
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow) return;
    if (ev.data?.type === "mmsa-open-journey") {
      import("./journey-tray.js").then((m) => m.openJourneyTray({ noteId: ev.data.noteId || null }))
        .catch(() => { window.location.href = "journey-map.html#folders"; });
    } else if (ev.data?.type === "mmsa-unit-count" && typeof ev.data.unit === "string" && Number.isFinite(ev.data.count)) {
      counts.set(ev.data.unit, ev.data.count);
      onCount?.(ev.data.unit, ev.data.count);
    }
  });
}

function showTab(key) {
  frame.hidden = key !== "notes";
  track.hidden = key !== "track";
  tabs.querySelectorAll("[data-rnp-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.rnpTab === key)));
  if (key === "track") paintTrack();
}

function paintTrack() {
  track.replaceChildren();
  const p = document.createElement("p");
  p.textContent = t("Choose an Approach for {unit}, record your progress (for your family too, with 👥), or see your status.", { unit: unit?.label ?? "" });
  track.appendChild(p);
  for (const [key, icon, label] of TRACK_ACTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rnp-track-btn";
    b.dataset.rnpTrack = key;
    b.textContent = `${icon} ${t(label)}`;
    b.addEventListener("click", () => { const u = unit; closeReadNotePane({ quiet: true }); host[key]?.(u); });
    track.appendChild(b);
  }
}

/** The Track tab's three actions, given by the Read view: { take(u), record(u), status(u) }. */
export function setReadNotePaneHost(h) { host = h || {}; }

/** Ask the page inside to make a new Note on the āyah ready to write (the Āyah card's 📝 Note with no Note yet). */
export function readNotePaneFocusNew() { if (frame) toFrame({ type: "mmsa-focus-new" }); } // an already loaded page; a first opening passes focusNew

function paint() {
  const label = unit?.label ?? "";
  titleEl.textContent = t("Notes on {unit}", { unit: label });
  pane.setAttribute("aria-label", t("Notes on {unit}", { unit: label }));
  pane.querySelector("[data-rnp-back]").textContent = `← ${t("Back to {unit}", { unit: label })}`;
  if (!track.hidden) paintTrack();
}

let onCount = null;
/** `onCountChange(unitKey, n)` is called when the pane learns how many Notes a unit has (the button's badge). */
export function setReadNotePaneCountListener(fn) { onCount = fn; }
/** The number of Notes on `unitKey` if the pane has read them this session, else null (nothing is read for it). */
export function readNotePaneCount(unitKey) { return counts.has(unitKey) ? counts.get(unitKey) : null; }

export function isReadNotePaneOpen() { return !!pane && !pane.hidden; }

/** Opens the pane on `u` = { unitKey, label }, on its Notes tab or (`tab: "track"`) its Track tab. `whenClosed` runs
    after it closes (the button takes the focus back). `backLabel` names the way back when it is not the āyah. */
export function openReadNotePane(u, whenClosed = null, { tab = "notes", backLabel = null, focusNew = false } = {}) {
  if (!pane) build();
  onClose = whenClosed;
  const first = !frame.getAttribute("src");
  if (first) frame.setAttribute("src", srcFor(u, { focusNew }));
  else {
    if (unit?.unitKey !== u.unitKey) toFrame({ type: "mmsa-unit", unit: u.unitKey, label: u.label });
    if (focusNew) toFrame({ type: "mmsa-focus-new" });
  }
  unit = u;
  paint();
  if (backLabel) pane.querySelector("[data-rnp-back]").textContent = `← ${backLabel}`;
  showTab(tab);
  pane.hidden = false;
  apply();
}

/** The Read view moved to another āyah: an open pane follows it; a closed one waits until it is opened. */
export function setReadNotePaneUnit(u) {
  if (!pane || pane.hidden || !u || u.unitKey === unit?.unitKey) return;
  toFrame({ type: "mmsa-unit", unit: u.unitKey, label: u.label });
  unit = u;
  paint();
}

export function closeReadNotePane({ quiet = false } = {}) {
  if (!pane || pane.hidden) return;
  // A Note being edited is saved before it goes out of sight (the page inside stays loaded, only hidden).
  try { frame.contentWindow?.postMessage({ type: "mmsa-journey-flush" }, location.origin); } catch { /* not loaded */ }
  pane.hidden = true;
  apply();
  const fn = onClose; onClose = null;
  if (!quiet) fn?.(); // a Track action goes on to its own card; the ← Back's own job (the focus, a way back) is not run

}
