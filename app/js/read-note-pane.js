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
body.rnp-open-side { padding-right: var(--rnp-w); box-sizing: border-box; }
body.rnp-open-dock { padding-bottom: var(--rnp-h); }
`;

let pane = null, frame = null, titleEl = null, unit = null, onClose = null;
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

function srcFor(u) {
  const q = new URLSearchParams({ embed: "1", unit: u.unitKey, unitLabel: u.label });
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
  journey.addEventListener("click", () => frame.contentWindow?.postMessage({ type: "mmsa-open-journey-request" }, location.origin));
  bar.append(back, titleEl, journey, close);
  frame = document.createElement("iframe");
  frame.className = "rnp-frame";
  frame.title = t("Notes");
  pane.append(bar, frame);
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

function paint() {
  const label = unit?.label ?? "";
  titleEl.textContent = t("Notes on {unit}", { unit: label });
  pane.setAttribute("aria-label", t("Notes on {unit}", { unit: label }));
  pane.querySelector("[data-rnp-back]").textContent = `← ${t("Back to {unit}", { unit: label })}`;
}

let onCount = null;
/** `onCountChange(unitKey, n)` is called when the pane learns how many Notes a unit has (the button's badge). */
export function setReadNotePaneCountListener(fn) { onCount = fn; }
/** The number of Notes on `unitKey` if the pane has read them this session, else null (nothing is read for it). */
export function readNotePaneCount(unitKey) { return counts.has(unitKey) ? counts.get(unitKey) : null; }

export function isReadNotePaneOpen() { return !!pane && !pane.hidden; }

/** Opens the pane on `u` = { unitKey, label }. `whenClosed` runs after it closes (the button takes the focus back). */
export function openReadNotePane(u, whenClosed = null) {
  if (!pane) build();
  onClose = whenClosed;
  const first = !frame.getAttribute("src");
  if (first) frame.setAttribute("src", srcFor(u));
  else if (unit?.unitKey !== u.unitKey) frame.contentWindow?.postMessage({ type: "mmsa-unit", unit: u.unitKey, label: u.label }, location.origin);
  unit = u;
  paint();
  pane.hidden = false;
  apply();
}

/** The Read view moved to another āyah: an open pane follows it; a closed one waits until it is opened. */
export function setReadNotePaneUnit(u) {
  if (!pane || pane.hidden || !u || u.unitKey === unit?.unitKey) return;
  frame.contentWindow?.postMessage({ type: "mmsa-unit", unit: u.unitKey, label: u.label }, location.origin);
  unit = u;
  paint();
}

export function closeReadNotePane() {
  if (!pane || pane.hidden) return;
  // A Note being edited is saved before it goes out of sight (the page inside stays loaded, only hidden).
  try { frame.contentWindow?.postMessage({ type: "mmsa-journey-flush" }, location.origin); } catch { /* not loaded */ }
  pane.hidden = true;
  apply();
  const fn = onClose; onClose = null;
  fn?.();
}
