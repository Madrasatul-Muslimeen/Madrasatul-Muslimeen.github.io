// The Read view's 📝 Notes pane (decision 95, the Owner, 9 Oct 2026: "NotePane: Build the demo"; demo
// docs/reference/2026-10-09-read-note-pane-demo.html). One pane holding Mapping My Journey's own page in its unit
// mode (journey-map.html?embed=1&unit=<key>&unitLabel=<label>): the āyah's Notes, the same Note editor, folders and
// versions as Mapping My Journey, ✚ New note on the āyah, and Open in Mapping My Journey.
//
// Where it sits: beside the reading on a computer (>= SIDE_FROM px); over the whole screen on a tablet and a phone.
// (The tablet dock, about half the height, was retired on the Owner's word, 11 Oct 2026, with a tablet screenshot:
// "Still note is showing half screen." The rnp-dock style is kept, unused, so a later choice can bring it back.) The reading underneath is never moved: closing the pane leaves the reader exactly where they were
// (the way-back law, decision 86). The page inside is loaded on the first open, never at start-up (I9), and kept
// while the pane is closed so it reopens at once; moving to another āyah tells it the new unit instead of reloading.
//
// Owns no data. Its only messages: "mmsa-unit" (the āyah changed) and "mmsa-journey-flush" (save a Note being edited)
// to the page inside; "mmsa-open-journey" and "mmsa-unit-count" from it.
import { t, ensureCatalogueReady } from "./i18n.js";
import { onAppLangChange } from "./prefs.js";
import { HANDLES, handleCss, startDrag } from "./float-window.js";
import { homeRect, setHomeRect, SHARED as HOME_SHARED } from "./home-window.js";
import { restoreWindow } from "./minimise.js";

export const PHONE = 600, SIDE_FROM = 1100;
// PCF MSA J68 part 4: from WINDOW_FROM px the pane is a window (move by its bar, resize from 8 handles), remembered per device.
// It starts where the pane is already the right-hand column (SIDE_FROM): below that a tablet keeps the full-screen pane
// (the Owner, 11 Oct 2026: no more half screen), and the window's first open is exactly today's place at every width.
const WINDOW_FROM = SIDE_FROM, WIN_KEY = "mmsa-read-note-window", LIMITS = { minW: 360, minH: 320, bar: 48 };

const CSS = `
#readNotePane { position: fixed; z-index: 960; display: flex; flex-direction: column; box-sizing: border-box; background: #fff; color: #222;
  border: 1px solid #c9a24b; box-shadow: 0 6px 28px rgba(0,0,0,0.3); overflow: hidden; }
#readNotePane[hidden] { display: none; }
#readNotePane.rnp-side { top: 0; right: 0; bottom: 0; width: var(--rnp-w); border-width: 0 0 0 2px; }
#readNotePane.rnp-dock { left: 0; right: 0; bottom: 0; height: var(--rnp-h); border-width: 2px 0 0; border-radius: 12px 12px 0 0; }
#readNotePane.rnp-phone { inset: 0; border: 0; }
.rnp-bar { flex: 0 0 auto; display: flex; align-items: center; gap: 0.4rem; min-height: 48px; padding: 0 0 0 0.5rem; background: #1F3A6E; color: #fff; }
.rnp-back { flex: 0 1 auto; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; /* audit6 rnpback */ min-height: 40px; padding: 0 0.7rem; border: 1px solid #c9a24b; border-radius: 0.6rem; background: transparent; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
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
#readNotePane.rnp-win { right: auto; bottom: auto; border-width: 1px; border-radius: 10px; }
.rnp-win-h { display: none; }
#readNotePane.rnp-win .rnp-win-h { display: block; }
#readNotePane.rnp-win .rnp-bar { cursor: move; touch-action: none; }
body.rnp-dragging #readNotePane .rnp-frame { pointer-events: none; }
body.rnp-dragging { user-select: none; }
${handleCss("rnp-win-h")}
/* PCF MSA J71: the top bar's search, finding any Note in Mapping My Journey to attach to this āyah. */
.rnp-find { flex: 1 1 22rem; min-width: 0; max-width: 30rem; position: relative; display: flex; align-items: center; }
.rnp-find[hidden] { display: none; }
.rnp-find input { width: 100%; min-height: 40px; /* audit 45: a finger target, was 36px */ box-sizing: border-box; padding: 0 0.8rem 0 2.1rem; border: 1px solid #c9a24b; border-radius: 999px;
  background: rgba(255,255,255,0.12); color: #fff; font: inherit; }
.rnp-find input::placeholder { color: #d9e0ee; }
.rnp-find input:focus { outline: none; background: #fff; color: #1F3A6E; box-shadow: 0 0 0 3px rgba(201,162,75,0.45); }
.rnp-find input:focus::placeholder { color: #6b7590; }
.rnp-find-ic { position: absolute; inset-inline-start: 0.7rem; pointer-events: none; font-size: 0.9rem; }
.rnp-find-btn { flex: 0 0 auto; min-width: 44px; min-height: 40px; border: 1px solid #c9a24b; border-radius: 0.6rem; background: transparent; color: #fff; font: inherit; cursor: pointer; }
.rnp-find-btn[hidden] { display: none; }
.rnp-results { position: absolute; top: calc(100% + 6px); inset-inline: 0; min-width: min(26rem, 92vw); z-index: 5; max-height: min(60vh, 26rem); overflow: auto;
  background: #fff; color: #222; border: 1px solid #c9a24b; border-radius: 12px; box-shadow: 0 12px 32px rgba(15,30,60,0.28); padding: 0.35rem; }
.rnp-results[hidden] { display: none; }
.rnp-res-head { padding: 0.35rem 0.6rem 0.45rem; font-size: 0.8rem; color: #6b5a2e; border-bottom: 1px solid #f0e6cc; margin-bottom: 0.25rem; }
.rnp-res { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.3rem 0.3rem 0.6rem; border-radius: 8px; }
.rnp-res:hover, .rnp-res:focus-within { background: #fbf6ea; }
.rnp-res-open { flex: 1 1 auto; min-width: 0; min-height: 44px; padding: 0.2rem 0; border: 0; background: none; text-align: start; font: inherit; color: inherit; cursor: pointer; }
.rnp-res-t { display: block; font-weight: 600; color: #1F3A6E; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rnp-res-s { display: block; font-size: 0.82rem; color: #5b6170; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rnp-res-add { flex: 0 0 auto; min-height: 40px; padding: 0 0.8rem; border: 1px solid #1F3A6E; border-radius: 999px; background: #1F3A6E; color: #fff; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.rnp-res-add[disabled] { background: #eef2e6; color: #3d6b2a; border-color: #b9cfa6; cursor: default; }
.rnp-res-none { padding: 0.7rem 0.6rem; color: #5b6170; }
/* a narrow pane (a phone): the results take the pane's whole width under its bar */
#readNotePane.rnp-finding .rnp-results { position: fixed; top: 54px; left: 8px; right: 8px; min-width: 0; }
/* PCF MSA J71: wide (from the Āyah card on a computer), the Notes / Track tabs are drawn by the page inside, on the row
   that carries the note's tools; this row only shows while the Track tab is open. */
#readNotePane.rnp-tabs-in-frame .rnp-tabs { display: none; }
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

let rect = null; // the window's place; null until first shown
let fromCard = false; // J71: this opening took the Āyah card's own place (not remembered unless the reader moves it)
const HOST_TABS_FROM = 820; // J71: a pane at least this wide has room for the tabs and the note's tools on one row
let findBox = null, findInput = null, findBtn = null, results = null, searchSeq = 0;
function loadRect() {
  try {
    const r = JSON.parse(localStorage.getItem(WIN_KEY) || "null");
    if (r && [r.x, r.y, r.w, r.h].every(Number.isFinite)) return { x: r.x, y: r.y, w: r.w, h: r.h };
  } catch { /* private mode or bad value */ }
  return null;
}
function saveRect() { try { localStorage.setItem(WIN_KEY, JSON.stringify(rect)); } catch { /* not remembered */ } }
/** Fully inside the screen, never smaller than the minimum. */
function clampWin(r) {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, Math.min(LIMITS.minW, vw)), vw), h = Math.min(Math.max(r.h, Math.min(LIMITS.minH, vh)), vh);
  return { x: Math.round(Math.min(Math.max(r.x, 0), vw - w)), y: Math.round(Math.min(Math.max(r.y, 0), vh - h)), w: Math.round(w), h: Math.round(h) };
}
function defaultRect() { // today's place: the right-hand column
  const w = Math.max(380, Math.round(window.innerWidth * 0.4));
  return { x: window.innerWidth - w, y: 0, w, h: window.innerHeight };
}
const winCtx = {
  getRect: () => rect, setRect: (r) => { rect = clampWin(r); apply(); },
  locked: () => !pane || layout() !== "win", limits: LIMITS, onEnd: () => { fromCard = false; saveRect(); setHomeRect(rect, { from: "popup", user: true }); }, dragClass: "rnp-dragging",
};

function layout() {
  const w = window.innerWidth;
  if (w >= WINDOW_FROM) return "win";
  return w >= SIDE_FROM ? "side" : "phone"; // a tablet too: the Owner, 11 Oct 2026 (no more half screen)
}

function apply() {
  if (!pane) return;
  const mode = layout(), open = !pane.hidden;
  const root = document.documentElement;
  root.style.setProperty("--rnp-w", `${Math.max(380, Math.round(window.innerWidth * 0.4))}px`);
  root.style.setProperty("--rnp-h", `${Math.round(window.innerHeight * 0.55)}px`);
  pane.classList.toggle("rnp-win", mode === "win");
  pane.classList.toggle("rnp-side", mode === "side" || mode === "win"); // a window is the side column, moved and resized
  pane.classList.toggle("rnp-dock", mode === "dock");
  pane.classList.toggle("rnp-phone", mode === "phone");
  document.body.classList.toggle("rnp-open-side", open && mode === "side");
  document.body.classList.toggle("rnp-open-dock", open && mode === "dock");
  if (mode === "win") {
    if (!rect) rect = loadRect() ?? defaultRect();
    rect = clampWin(rect);
    Object.assign(pane.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    // The reading is pushed aside only while the window sits in the right-hand column, as before.
    const docked = open && rect.x + rect.w >= window.innerWidth - 1 && rect.x > window.innerWidth * 0.4;
    document.body.classList.toggle("rnp-open-side", docked);
    root.style.setProperty("--rnp-w", `${window.innerWidth - rect.x}px`);
  } else {
    for (const p of ["left", "top", "width", "height"]) pane.style.removeProperty(p);
  }
  paintFindPlace();
  syncHostedTabs();
}

/** J71: the tabs move onto the page's tools row while the pane is wide and on its Notes tab. */
let hostedSent = null;
function syncHostedTabs() {
  if (!pane || pane.hidden) return;
  const on = layout() === "win" && pane.getBoundingClientRect().width >= HOST_TABS_FROM && !frame.hidden; // a computer's window only: phones and tablets keep today's rows
  pane.classList.toggle("rnp-tabs-in-frame", on);
  if (on === hostedSent) return;
  hostedSent = on;
  toFrame({ type: "mmsa-pane-tabs", on, notes: t("Notes"), track: t("Track this āyah") });
}
/** J71: a wide bar carries the search box itself; a narrow one a 🔍 that opens it in the title's place. */
function paintFindPlace() {
  if (!findBox) return;
  const wide = pane.getBoundingClientRect().width >= 600;
  const open = wide || pane.classList.contains("rnp-finding");
  findBox.hidden = !open;
  findBtn.hidden = wide || open;
  titleEl.hidden = !wide && open;
}

function srcFor(u, { focusNew = false } = {}) {
  const q = new URLSearchParams({ embed: "1", unit: u.unitKey, unitLabel: u.label });
  if (u.noteTitle) q.set("noteTitle", u.noteTitle); // PCF MSA J68: a new Note's first title ("Quran 22:3 - Al-Hajj:")
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
  // PCF MSA J71 (the Owner, 22 Oct 2026: "On the top bar, enable other notes to drop/ attach/ Tag from the Map (may be
  // by enabling search)"): the bar's empty middle is a search over every Note in Mapping My Journey; each result opens
  // here or is attached to this āyah with one press. The page inside does the finding (it already holds the Notes).
  findBox = document.createElement("div");
  findBox.className = "rnp-find";
  findBox.setAttribute("role", "search");
  const ic = document.createElement("span"); ic.className = "rnp-find-ic"; ic.textContent = "🔍"; ic.setAttribute("aria-hidden", "true");
  findInput = document.createElement("input");
  findInput.type = "search";
  findInput.dataset.rnpSearch = "";
  findInput.setAttribute("autocomplete", "off");
  findInput.setAttribute("aria-label", t("Find a note in Mapping My Journey to attach"));
  findInput.addEventListener("input", () => runSearch());
  findInput.addEventListener("focus", () => { if (findInput.value.trim()) runSearch(); });
  findInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); if (!results.hidden) { results.hidden = true; } else { findInput.value = ""; closeFind(); } }
    if (e.key === "ArrowDown") { e.preventDefault(); results.querySelector("button")?.focus(); }
  });
  results = document.createElement("div");
  results.className = "rnp-results";
  results.dataset.rnpResults = "";
  results.hidden = true;
  results.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); results.hidden = true; findInput.focus(); } });
  findBox.append(ic, findInput, results);
  findBtn = document.createElement("button");
  findBtn.type = "button";
  findBtn.className = "rnp-find-btn";
  findBtn.dataset.rnpFindBtn = "";
  findBtn.textContent = "🔍";
  findBtn.setAttribute("aria-label", t("Find a note in Mapping My Journey to attach"));
  findBtn.title = t("Find a note in Mapping My Journey to attach");
  findBtn.addEventListener("click", () => { pane.classList.add("rnp-finding"); paintFindPlace(); findInput.focus(); });
  document.addEventListener("pointerdown", (e) => { if (results && !results.hidden && !findBox.contains(e.target)) results.hidden = true; });
  bar.append(back, titleEl, findBox, findBtn, journey, close);
  bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("button, input, .rnp-results")) startDrag(e, "move", winCtx); });
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
    hostedSent = null; syncHostedTabs(); // J71: a (re)loaded page is told again where its tabs go
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
  for (const h of HANDLES) {
    const d = document.createElement("div");
    d.className = "rnp-win-h";
    d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => startDrag(e, h, winCtx));
    pane.appendChild(d);
  }
  document.body.appendChild(pane);
  onAppLangChange(relabel); // audit 47 langpane
  window.addEventListener("resize", apply);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pane && !pane.hidden && !document.getElementById("journeyTray")?.offsetParent) closeReadNotePane(); });
  window.addEventListener("message", (ev) => {
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow) return;
    if (ev.data?.type === "mmsa-open-journey") {
      import("./journey-tray.js").then((m) => m.openJourneyTray({ noteId: ev.data.noteId || null }))
        .catch(() => { window.location.href = "journey-map.html#folders"; });
    } else if (ev.data?.type === "mmsa-pane-hello") {
      hostedSent = null; syncHostedTabs(); // J71: the page inside is listening now
    } else if (ev.data?.type === "mmsa-pane-tab" && ev.data.tab === "track") {
      showTab("track");
    } else if (ev.data?.type === "mmsa-note-search-results" && ev.data.id === searchSeq) {
      paintResults(ev.data);
    } else if (ev.data?.type === "mmsa-note-attached") {
      const b = results.querySelector(`[data-rnp-attach="${window.CSS.escape(ev.data.noteId)}"]`);
      if (b && ev.data.ok) { b.disabled = true; b.textContent = `✓ ${t("Attached")}`; }
      else if (b) { b.disabled = false; b.textContent = `📎 ${t("Attach to {unit}", { unit: unit?.label ?? "" })}`; }
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
  syncHostedTabs();
}

function closeFind() { pane.classList.remove("rnp-finding"); results.hidden = true; paintFindPlace(); }
function runSearch() {
  const q = findInput.value.trim();
  if (!q) { results.hidden = true; return; }
  toFrame({ type: "mmsa-note-search", q, id: ++searchSeq });
}
function paintResults({ results: list = [], total = 0, loading = false }) {
  results.replaceChildren();
  const head = document.createElement("div");
  head.className = "rnp-res-head";
  head.textContent = loading ? t("Loading your notes…")
    : total === 1 ? t("1 note in Mapping My Journey — attach it to {unit}", { unit: unit?.label ?? "" })
    : total ? t("{n} notes in Mapping My Journey — attach any to {unit}", { n: total, unit: unit?.label ?? "" }) : "";
  if (head.textContent) results.appendChild(head);
  if (!loading && !list.length) {
    const none = document.createElement("div");
    none.className = "rnp-res-none";
    none.textContent = t("No note in Mapping My Journey has these words.");
    results.appendChild(none);
  }
  for (const r of list) {
    const row = document.createElement("div");
    row.className = "rnp-res";
    row.dataset.rnpResult = r.noteId;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "rnp-res-open";
    const tt = document.createElement("span"); tt.className = "rnp-res-t"; tt.textContent = r.title;
    const sn = document.createElement("span"); sn.className = "rnp-res-s"; sn.textContent = r.snippet;
    open.append(tt, sn);
    open.title = t("Open this note");
    open.addEventListener("click", () => { results.hidden = true; showTab("notes"); toFrame({ type: "mmsa-note-open", noteId: r.noteId }); });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "rnp-res-add";
    add.dataset.rnpAttach = r.noteId;
    if (r.here) { add.disabled = true; add.textContent = `✓ ${t("Already here")}`; }
    else add.textContent = `📎 ${t("Attach to {unit}", { unit: unit?.label ?? "" })}`;
    add.addEventListener("click", () => { add.disabled = true; add.textContent = t("Attaching…"); toFrame({ type: "mmsa-note-attach", noteId: r.noteId }); });
    row.append(open, add);
    results.appendChild(row);
  }
  results.hidden = false;
}

function paintTrack() {
  track.replaceChildren();
  const p = document.createElement("p");
  p.textContent = t("Choose an Approach for {unit}, record your progress (for your family too, with 👥), or see your status.", { unit: unit?.label ?? "" });
  track.appendChild(p);
  // R3a: the Approach card itself (Track / Guide / Breakdown / Coverage, the picker, Claim with 👥), drawn and wired by
  // the Read view's page for this unit; the pane only gives it a place.
  if (host.trackCard && unit) {
    const card = document.createElement("div");
    card.className = "rnp-approach-card";
    card.dataset.rnpApproachCard = "";
    track.appendChild(card);
    host.trackCard(unit, card);
  }
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

/** Audit part 47 (PCF MSA J29): quranrevival.html switches language IN PLACE, and this pane is built once, so its bar's words,
    its tabs and the page inside it (a frame, which reads the language only when it loads) kept the old language. */
async function relabel() {
  if (!pane) return;
  await ensureCatalogueReady(); // the listeners fire before a first switch to Bangla has its catalogue
  for (const [el, key] of [[pane.querySelector(".rnp-close"), "Close"], [pane.querySelector("[data-rnp-journey]"), "Open in Mapping My Journey"], [findBtn, "Find a note in Mapping My Journey to attach"]]) { el.setAttribute("aria-label", t(key)); el.title = t(key); }
  findInput.setAttribute("aria-label", t("Find a note in Mapping My Journey to attach"));
  frame.title = t("Notes");
  tabs.querySelector('[data-rnp-tab="notes"]').textContent = `📝 ${t("Notes")}`;
  tabs.querySelector('[data-rnp-tab="track"]').textContent = `✅ ${t("Track this āyah")}`;
  results.hidden = true;
  if (unit) paint();
  // The page inside reads the language when it loads: load it again, on the unit the pane is on now (what is being typed is saved first).
  if (frame.getAttribute("src") && unit) {
    try { frame.contentWindow?.postMessage({ type: "mmsa-journey-flush" }, location.origin); } catch { /* not loaded */ }
    frameReady = false;
    frame.setAttribute("src", srcFor(unit, {}));
  }
}

function paint() {
  const label = unit?.label ?? "";
  titleEl.textContent = t("Notes on {unit}", { unit: label });
  findInput.placeholder = t("Find a note to attach to {unit}", { unit: label });
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
/** The unit the pane is on ({ unitKey, label }), or null before it is first opened. */
export function readNotePaneUnit() { return unit; }

/** Opens the pane on `u` = { unitKey, label }, on its Notes tab or (`tab: "track"`) its Track tab. `whenClosed` runs
    after it closes (the button takes the focus back). `backLabel` names the way back when it is not the āyah. */
export function openReadNotePane(u, whenClosed = null, { tab = "notes", backLabel = null, focusNew = false, rect: cardRect = null } = {}) {
  if (!pane) build();
  restoreWindow(pane); // PCF MSA J81: opening it again brings a minimised pane back
  onClose = whenClosed;
  const first = !frame.getAttribute("src");
  if (first) frame.setAttribute("src", srcFor(u, { focusNew }));
  else {
    if (unit?.unitKey !== u.unitKey) toFrame({ type: "mmsa-unit", unit: u.unitKey, label: u.label, noteTitle: u.noteTitle ?? "" });
    if (focusNew) toFrame({ type: "mmsa-focus-new" });
  }
  unit = u;
  paint();
  if (backLabel) pane.querySelector("[data-rnp-back]").textContent = `← ${backLabel}`;
  // PCF MSA J71 (the Owner: "Note button brings the note, should appear as the same size, same place as the Ayah Card"):
  // opened from the card on a computer, the window takes the card's own rect for this opening. Moving or resizing it
  // makes that the remembered place, as before; the next opening from anywhere else is the remembered one again.
  if (cardRect && layout() === "win" && [cardRect.x, cardRect.y, cardRect.w, cardRect.h].every(Number.isFinite)) { rect = clampWin(cardRect); fromCard = true; }
  else if (layout() === "win" && (HOME_SHARED || !rect) && homeRect()) { rect = clampWin(homeRect()); fromCard = false; } // PCF MSA J72
  else if (fromCard) { rect = loadRect() ?? defaultRect(); fromCard = false; }
  pane.classList.remove("rnp-finding");
  results.hidden = true;
  pane.hidden = false;
  showTab(tab);
  apply();
}

/** The Read view moved to another āyah: an open pane follows it; a closed one waits until it is opened. */
export function setReadNotePaneUnit(u) {
  if (!pane || pane.hidden || !u || u.unitKey === unit?.unitKey) return;
  toFrame({ type: "mmsa-unit", unit: u.unitKey, label: u.label, noteTitle: u.noteTitle ?? "" });
  unit = u;
  paint();
}

export function closeReadNotePane({ quiet = false } = {}) {
  if (!pane || pane.hidden) return;
  // A Note being edited is saved before it goes out of sight (the page inside stays loaded, only hidden).
  try { frame.contentWindow?.postMessage({ type: "mmsa-journey-flush" }, location.origin); } catch { /* not loaded */ }
  pane.hidden = true;
  results.hidden = true;
  apply();
  const fn = onClose; onClose = null;
  if (!quiet) fn?.(); // a Track action goes on to its own card; the ← Back's own job (the focus, a way back) is not run

}
