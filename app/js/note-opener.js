// J108 (v13.01, the Owner, 31 Oct 2026: "Q2:A. Q3. Build it."; demo v3) -- THE shared Note opener. Every Note button
// (Study ▸ Notes, the Āyah card's 📝, a Unit card's 📝, the Hadith card's 📝) calls openNewNote(): a NEW blank Mapping My
// Journey Note -- the real editor (note-window.js), in journey-map.html?embed=1&new=1, embedded as read-note-pane.js and
// journey-tray.js already embed it (an iframe, same-origin messages). From a card the Note starts with that Āyah or Hadith
// inside it (note-ref-block.js, in the Note's own text) and a first title ("Quran 15:32 - Al-Hijr:"), and is started on
// the unit (createStudyNote: the noteSources link the Notes pane makes). Q2 = A: always a new Note, with a small line
// "You have N Notes on this āyah — open" when there are earlier ones; "open" is the caller's (the Notes pane).
//
// The window: the whole screen below 1024px (a phone, a tablet); on a computer a floating window, moved by its bar and
// resized from any side or corner (float-window.js, as journey-tray.js), its place kept per device in localStorage only.
// ← Back (the Note's toolbar) and ✕ save the Note first, then close: the page underneath was never moved, so the reader
// is exactly where they were (the way-back law, decision 86) and `onClosed` reopens what they came from.
//
// Owns no data: every write is the page inside's own (I2). Loaded on the first press, never at start-up (I9).
import { t, num, surahName, ensureCatalogueReady } from "./i18n.js";
import { getAppLang, onAppLangChange } from "./prefs.js";
import { HANDLES, handleCss, clampRect, startDrag } from "./float-window.js";
import { restoreWindow } from "./minimise.js";
import { cleanRefState } from "./note-ref-block.js";

export const WINDOW_FROM = 1024;
const KEY = "mmsa-note-opener", BAR = 48, LIMITS = { minW: 420, minH: 380, bar: BAR };

const CSS = `
#noteOpener { position: fixed; z-index: 975; display: flex; flex-direction: column; box-sizing: border-box; background: #fff; color: #1d2433;
  border: 1px solid #c9a24b; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.3); overflow: hidden; }
#noteOpener[hidden] { display: none; }
#noteOpener.no-full { inset: 0; width: auto; height: auto; border: 0; border-radius: 0; box-shadow: none; padding-top: env(safe-area-inset-top, 0px); }
.no-bar { flex: 0 0 ${BAR}px; display: flex; align-items: center; gap: 0.4rem; padding: 0 0 0 0.8rem; background: #1F3A6E; color: #fff; cursor: move; touch-action: none; user-select: none; -webkit-user-select: none; }
#noteOpener.no-full .no-bar { cursor: default; }
.no-title { flex: 1 1 auto; min-width: 0; font-weight: 600; font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-close { flex: 0 0 auto; min-width: 48px; min-height: 48px; background: none; border: 0; color: #fff; font-size: 1.4rem; line-height: 1; cursor: pointer; }
.no-close:focus-visible, .no-count-open:focus-visible { outline: 3px solid #c9a24b; outline-offset: -3px; }
.no-count { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.35rem 0.8rem; background: #f4efe2; border-bottom: 1px solid #e3d7b8; color: #4a3d1c; font-size: 0.9rem; }
.no-count[hidden] { display: none; }
.no-count-open { min-height: 40px; padding: 0 0.8rem; border: 1px solid #1F3A6E; border-radius: 20px; background: #fff; color: #1F3A6E; font: inherit; font-weight: 600; cursor: pointer; }
.no-msg { flex: 0 0 auto; margin: 0; padding: 0.4rem 0.8rem; background: #fdecea; color: #8a1c13; font-size: 0.9rem; }
.no-msg[hidden] { display: none; }
.no-frame { flex: 1 1 auto; width: 100%; min-height: 0; border: 0; background: #fff; }
${handleCss("no-h")}
#noteOpener.no-full .no-h { display: none; }
body.no-dragging #noteOpener .no-frame { pointer-events: none; }
body.no-dragging { user-select: none; }
.no-attach { position: absolute; inset: 0; z-index: 5; display: flex; align-items: flex-start; justify-content: center; padding: 3.5rem 0.8rem 0.8rem; background: rgba(10,16,28,0.45); box-sizing: border-box; }
.no-attach[hidden] { display: none; }
.no-attach-box { width: min(28rem, 100%); max-height: 100%; overflow: auto; box-sizing: border-box; background: #fff; color: #1d2433; border-radius: 12px; padding: 0.9rem; display: grid; gap: 0.6rem; box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.no-attach-box h2 { margin: 0; font-size: 1.05rem; }
.no-attach-kinds { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.no-attach-kind { min-height: 40px; padding: 0 0.9rem; border: 1px solid #1F3A6E; border-radius: 20px; background: #fff; color: #1F3A6E; font: inherit; font-weight: 600; cursor: pointer; }
.no-attach-kind[aria-pressed="true"] { background: #1F3A6E; color: #fff; }
.no-attach-label { font-weight: 600; margin-bottom: -0.3rem; }
.no-attach-input { min-height: 44px; width: 100%; box-sizing: border-box; padding: 0 0.8rem; border: 1px solid #9aa3b2; border-radius: 10px; font: inherit; }
.no-attach-hint { margin: 0; color: #4f5868; font-size: 0.85rem; }
.no-attach-err { margin: 0; color: #8a1c13; font-size: 0.9rem; }
.no-attach-err:empty { display: none; }
.no-attach-acts { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
.no-attach-acts button { min-height: 44px; padding: 0 1rem; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 1px solid #1F3A6E; background: #fff; color: #1F3A6E; }
.no-attach-acts button[data-no-attach-go] { background: #1F3A6E; color: #fff; }
`;

let win = null, frame = null, titleEl = null, countEl = null, msgEl = null, attachEl = null, rect = null;
let cur = null; // the opening on screen: { refs, unitKey, unitLabel, title, backLabel, onClosed, onOpenExisting, noteId, count }
let closing = null;
let heldInert = []; // audit 143 D1: the page's own elements made inert while the window holds it (only ones that were not already)

/** Audit 143 D1/D2. FULL SCREEN (below WINDOW_FROM) the window covers the whole page, so it is modal: aria-modal="true" and
    every other child of <body> inert, so neither Tab nor a screen reader reaches the page behind (the window's iframe cannot
    pass its Tab keys up, so a key handler alone could not wrap it). FLOATING (from WINDOW_FROM) it is a non-modal window on
    purpose -- the page beside it stays usable (J81, J108) -- and minimised it is only a chip, so neither holds the page.
    The minimised-windows dock (#mmMinDock) is never held: its chips bring other windows back. */
function syncHold() {
  const hold = !!win && !win.hidden && !win.hasAttribute("data-mm-min") && isFull();
  if (hold) win.setAttribute("aria-modal", "true"); else win?.removeAttribute("aria-modal");
  if (!hold) { releasePage(); return; }
  for (const el of document.body.children) {
    if (el === win || el.id === "mmMinDock" || el.inert || el.tagName === "SCRIPT" || el.tagName === "STYLE") continue;
    el.inert = true; heldInert.push(el);
  }
}
function releasePage() { for (const el of heldInert) el.inert = false; heldInert = []; }

const isFull = () => window.innerWidth < WINDOW_FROM;
function loadRect() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && [v.x, v.y, v.w, v.h].every(Number.isFinite)) return v; } catch { /* private mode */ }
  return null;
}
function saveRect() { try { localStorage.setItem(KEY, JSON.stringify(rect)); } catch { /* not remembered */ } }
function defaultRect() {
  const w = Math.min(820, Math.max(LIMITS.minW, Math.round(window.innerWidth * 0.6))), h = Math.max(LIMITS.minH, Math.round(window.innerHeight * 0.86));
  return { x: Math.round((window.innerWidth - w) / 2), y: Math.round((window.innerHeight - h) / 2), w, h };
}
function apply() {
  if (!win) return;
  const full = isFull();
  win.classList.toggle("no-full", full);
  syncHold();
  if (full) { for (const p of ["left", "top", "width", "height"]) win.style.removeProperty(p); return; }
  rect = clampRect(rect ?? loadRect() ?? defaultRect(), LIMITS);
  Object.assign(win.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
}
const dragCtx = { getRect: () => rect, setRect: (r) => { rect = r; apply(); }, locked: isFull, limits: LIMITS, onEnd: () => saveRect(), dragClass: "no-dragging" };

function toFrame(m) { try { frame?.contentWindow?.postMessage(m, location.origin); } catch { /* not loaded */ } }

function build() {
  const style = document.createElement("style");
  style.id = "noteOpenerStyle";
  style.textContent = CSS;
  document.head.appendChild(style);
  win = document.createElement("div");
  win.id = "noteOpener";
  win.hidden = true;
  win.setAttribute("role", "dialog");
  const bar = document.createElement("div");
  bar.className = "no-bar";
  titleEl = document.createElement("span");
  titleEl.className = "no-title";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "no-close";
  close.dataset.noClose = "";
  close.textContent = "✕";
  close.addEventListener("click", () => closeNewNote());
  close.addEventListener("pointerdown", (e) => e.stopPropagation());
  bar.append(titleEl, close);
  bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) startDrag(e, "move", dragCtx); });
  countEl = document.createElement("div");
  countEl.className = "no-count";
  countEl.dataset.noCount = "";
  countEl.setAttribute("role", "status");
  countEl.hidden = true;
  msgEl = document.createElement("p");
  msgEl.className = "no-msg";
  msgEl.dataset.noMsg = "";
  msgEl.setAttribute("role", "alert");
  msgEl.hidden = true;
  frame = document.createElement("iframe");
  frame.className = "no-frame";
  attachEl = document.createElement("div");
  attachEl.className = "no-attach";
  attachEl.dataset.noAttach = "";
  attachEl.hidden = true;
  win.append(bar, countEl, msgEl, frame, attachEl);
  for (const h of HANDLES) {
    const d = document.createElement("div");
    d.className = "no-h";
    d.dataset.h = h;
    d.addEventListener("pointerdown", (e) => startDrag(e, h, dragCtx));
    win.appendChild(d);
  }
  document.body.appendChild(win);
  window.addEventListener("resize", apply);
  new MutationObserver(syncHold).observe(win, { attributes: true, attributeFilter: ["hidden", "data-mm-min"] }); // minimise / bring back
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !win || win.hidden) return;
    if (!attachEl.hidden) { e.preventDefault(); closeAttach({ restore: true }); return; }
    closeNewNote();
  });
  window.addEventListener("message", onMessage);
  onAppLangChange(async () => { await ensureCatalogueReady(); if (cur) paint(); });
}

function paint() {
  const label = cur.unitLabel;
  titleEl.textContent = label ? `📝 ${t("New note on {unit}", { unit: label })}` : `📝 ${t("New note")}`;
  win.setAttribute("aria-label", titleEl.textContent.replace(/^📝 /, ""));
  titleEl.title = titleEl.textContent.replace(/^📝 /, ""); // audit 144 D3: a long title is cut in the bar; its whole text on hover
  frame.title = t("New note");
  const close = win.querySelector(".no-close");
  const name = cur.backLabel || t("Close");
  close.setAttribute("aria-label", name); close.title = name;
  paintCount();
}
function paintCount() {
  const n = cur?.count ?? 0;
  countEl.replaceChildren();
  countEl.hidden = !(n > 0);
  if (!(n > 0)) return;
  const words = document.createElement("span");
  const hadith = cur.unitKey?.startsWith("hadith:");
  words.textContent = n === 1
    ? t(hadith ? "You have 1 other Note on this hadith —" : "You have 1 other Note on this āyah —")
    : t(hadith ? "You have {n} other Notes on this hadith —" : "You have {n} other Notes on this āyah —", { n: num(n) });
  countEl.appendChild(words);
  if (cur.onOpenExisting) {
    const open = document.createElement("button");
    open.type = "button";
    open.className = "no-count-open";
    open.dataset.noCountOpen = "";
    open.textContent = t("open");
    open.setAttribute("aria-label", t(hadith ? "Open your Notes on this hadith" : "Open your Notes on this āyah"));
    open.addEventListener("click", async () => { const go = cur.onOpenExisting; await closeNewNote({ thenRun: go }); });
    countEl.appendChild(open);
  }
}
function say(text) { msgEl.textContent = text || ""; msgEl.hidden = !text; }

function onMessage(ev) {
  if (!frame || ev.origin !== location.origin || ev.source !== frame.contentWindow || !cur) return;
  const m = ev.data || {};
  if (m.type === "mmsa-new-note-hello") {
    toFrame({ type: "mmsa-new-note-refs", refs: cur.refs, noteId: cur.noteId ?? null, backLabel: cur.backLabel || "" });
  } else if (m.type === "mmsa-new-note-ready") {
    if (m.ok) { cur.noteId = m.noteId; say(""); }
    else say(t("A new Note could not be made just now. Please try again."));
  } else if (m.type === "mmsa-new-note-count" && m.unit === cur.unitKey && Number.isFinite(m.count)) {
    cur.count = m.count; paintCount();
  } else if (m.type === "mmsa-new-note-back") {
    finishClose(true);
  } else if (m.type === "mmsa-new-note-attach") {
    openAttach();
  } else if (m.type === "mmsa-new-note-ref-added") {
    if (!m.ok) say(t("Open the Note for editing to attach an Āyah or Hadith."));
  } else if (m.type === "mmsa-new-note-closed") {
    closing?.(!!m.ok);
  }
}

/**
 * Opens a NEW blank Note. `ref` (optional): { kind: "ayah"|"hadith", id, label, text: { ar, en, bn } } -- the Āyah or Hadith
 * the Note starts with; `unitKey` / `unitLabel`: the unit it is started on (an āyah, a wider Qur'an unit, a hadith);
 * `title`: its first title; `backLabel`: the way back's name ("Back to Āyah card"); `onClosed()`: runs after it closes;
 * `onOpenExisting()`: what "open" does on the "You have N Notes" line; `count`: an already known number of earlier Notes.
 */
export async function openNewNote({ ref = null, unitKey = null, unitLabel = "", title = "", backLabel = "", onClosed = null, onOpenExisting = null, count = null } = {}) {
  if (win && !win.hidden) await closeNewNote({ quiet: true }); // one new Note at a time; the one open is saved first
  if (!win) build();
  await ensureCatalogueReady();
  const clean = ref ? cleanRefState(ref) : null;
  cur = { refs: clean ? [clean] : [], unitKey: unitKey || (clean ? clean.id : null), unitLabel, title, backLabel, onClosed, onOpenExisting, noteId: null, count: Number.isFinite(count) ? count : 0 };
  const q = new URLSearchParams({ embed: "1", new: "1" });
  if (cur.unitKey) q.set("unit", cur.unitKey);
  if (unitLabel) q.set("unitLabel", unitLabel);
  if (title) q.set("noteTitle", title);
  q.set("refs", "1"); // wait for the opener's answer (its refs, and the way back's name) before making the Note
  say("");
  closeAttach();
  paint();
  frame.setAttribute("src", `journey-map.html?${q.toString()}`);
  win.hidden = false;
  restoreWindow(win);
  rect = null;
  apply(); // ...which also holds the page when full screen (syncHold)
  win.querySelector(".no-close").focus({ preventScroll: true });
}

export function isNewNoteOpen() { return !!win && !win.hidden; }

/** Saves the Note being written (the page inside answers once its revision has settled), then closes. A failed save keeps the
    window open and says so in words (I15); a second ✕ closes it, the text still kept on this device as a draft. */
export function closeNewNote({ quiet = false, thenRun = null } = {}) {
  if (!win || win.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const end = (ok) => {
      if (done) return; done = true; closing = null;
      if (!ok && !msgEl.dataset.failedOnce) {
        msgEl.dataset.failedOnce = "1";
        say(t("Your Note is not saved yet. It is kept on this device; press ✕ again to close anyway."));
        resolve();
        return;
      }
      delete msgEl.dataset.failedOnce;
      finishClose(!quiet, thenRun);
      resolve();
    };
    closing = end;
    toFrame({ type: "mmsa-new-note-close" });
    setTimeout(() => end(true), 6000); // a page that never answers (not loaded yet) does not hold the window open
  });
}
function finishClose(runOnClosed = true, thenRun = null) {
  if (!win || win.hidden) return;
  // The focus was in the Note (inside the frame): let it go, or the keys (Esc on the card it reopens) keep going to a frame
  // that is no longer on screen. `onClosed` then puts it where the reader came from.
  if (win.contains(document.activeElement)) document.activeElement.blur();
  win.hidden = true;
  releasePage(); // before onClosed, which puts the focus back on the page
  closeAttach();
  frame.removeAttribute("src"); // fresh every time: a new Note each opening
  const fn = cur?.onClosed;
  cur = null;
  if (thenRun) thenRun();
  else if (runOnClosed) fn?.();
}

// ---------------------------------------------------------------------------------------------------------------------
// 📎 Attach: another Āyah (surah:āyah) or Hadith (its HadeethEnc number) into the Note being written.
// ---------------------------------------------------------------------------------------------------------------------
let attachKind = "ayah";
function openAttach() {
  attachEl.hidden = false;
  attachEl.innerHTML = `<div class="no-attach-box" role="dialog" aria-modal="true" aria-labelledby="noAttachTitle">
    <h2 id="noAttachTitle"></h2>
    <div class="no-attach-kinds" role="group"><button type="button" class="no-attach-kind" data-no-attach-kind="ayah"></button><button type="button" class="no-attach-kind" data-no-attach-kind="hadith"></button></div>
    <label class="no-attach-label" for="noAttachInput" data-no-attach-label></label>
    <input type="text" class="no-attach-input" id="noAttachInput" data-no-attach-input inputmode="text" autocomplete="off">
    <p class="no-attach-hint" data-no-attach-hint></p>
    <p class="no-attach-err" data-no-attach-err role="alert"></p>
    <div class="no-attach-acts"><button type="button" data-no-attach-cancel></button><button type="button" data-no-attach-go></button></div>
  </div>`;
  const q = (s) => attachEl.querySelector(s);
  q("#noAttachTitle").textContent = t("Attach to this Note");
  q('[data-no-attach-kind="ayah"]').textContent = `📖 ${t("Āyah")}`;
  q('[data-no-attach-kind="hadith"]').textContent = `📜 ${t("Hadith")}`;
  q("[data-no-attach-cancel]").textContent = t("Cancel");
  q("[data-no-attach-go]").textContent = t("Attach");
  const paintKind = () => {
    for (const b of attachEl.querySelectorAll("[data-no-attach-kind]")) b.setAttribute("aria-pressed", String(b.dataset.noAttachKind === attachKind));
    const input = q("[data-no-attach-input]");
    // v13.10 (audit part 145 D2): the whole wording is a visible label now, which wraps; the box keeps only the short
    // example. As a placeholder it was cut at 150-200% text on a phone ("সূরা:আয়াত, যেমন ২:২" -- a wrong example).
    q("[data-no-attach-label]").textContent = attachKind === "ayah" ? t("Surah:Āyah, e.g. 2:255") : t("The hadith's number, e.g. 3062");
    input.placeholder = attachKind === "ayah" ? `${num(2)}:${num(255)}` : num(3062);
    q("[data-no-attach-hint]").textContent = attachKind === "ayah" ? t("The Arabic, English and Bangla of the āyah are added; you can hide any of them.") : t("A hadith from the HadeethEnc collection, by its number on the Hadith page.");
    q("[data-no-attach-err]").textContent = "";
  };
  attachEl.querySelectorAll("[data-no-attach-kind]").forEach((b) => b.addEventListener("click", () => { attachKind = b.dataset.noAttachKind; paintKind(); q("[data-no-attach-input]").focus(); }));
  q("[data-no-attach-cancel]").addEventListener("click", () => closeAttach({ restore: true }));
  const go = async () => {
    const btn = q("[data-no-attach-go]"), err = q("[data-no-attach-err]");
    btn.disabled = true; err.textContent = "";
    try {
      const ref = await loadRefFor(attachKind, q("[data-no-attach-input]").value);
      toFrame({ type: "mmsa-new-note-add-ref", ref });
      closeAttach({ restore: true });
    } catch (e) {
      err.textContent = e?.userMessage || t("That could not be found. Please check it and try again.");
      btn.disabled = false;
    }
  };
  q("[data-no-attach-go]").addEventListener("click", go);
  q("[data-no-attach-input]").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  attachEl.onclick = (e) => { if (e.target === attachEl) closeAttach({ restore: true }); };
  // audit 143 D3: the sheet is aria-modal, so Tab wraps inside it (the Note behind is inert while it is open)
  attachEl.onkeydown = (e) => {
    if (e.key !== "Tab") return;
    const all = [...attachEl.querySelectorAll("button, input")].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!all.length) return;
    const first = all[0], last = all[all.length - 1], at = document.activeElement;
    if (e.shiftKey ? (at === first || !attachEl.contains(at)) : (at === last || !attachEl.contains(at))) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  };
  frame.inert = true;
  paintKind();
  q("[data-no-attach-input]").focus();
}
/** `restore`: the reader closed it (Escape, Cancel, the backdrop, or a done Attach) -- the focus goes back to the Note's own 📎,
    which opened it (audit 143 D4; it used to drop to <body>, sending a keyboard reader back to the top of the page). */
function closeAttach({ restore = false } = {}) {
  if (!attachEl) return;
  const wasOpen = !attachEl.hidden;
  attachEl.hidden = true; attachEl.replaceChildren();
  if (frame) frame.inert = false;
  if (restore && wasOpen && win && !win.hidden) {
    try { frame.contentWindow?.focus(); } catch { /* not loaded */ }
    toFrame({ type: "mmsa-new-note-focus-tool", tool: "attach" });
  }
}

const westernDigits = (s) => String(s ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const userError = (key, vars) => Object.assign(new Error(key), { userMessage: t(key, vars) });

/** The block for an Āyah ("2:255") or a HadeethEnc hadith ("3062"), its text read from the app's own data files. */
export async function loadRefFor(kind, input) {
  const raw = westernDigits(input).trim();
  if (kind === "ayah") {
    const m = /^(\d{1,3})\s*[:.]\s*(\d{1,3})$/.exec(raw);
    if (!m) throw userError("Write the sūrah and āyah like 2:255.");
    const s = Number(m[1]), a = Number(m[2]);
    if (s < 1 || s > 114) throw userError("There is no sūrah {n}.", { n: num(s) });
    const { getSurah } = await import("./quran-data.js");
    const data = await getSurah(s);
    const ay = data?.ayahs?.find((x) => Number(x.ayah) === a);
    if (!ay) throw userError("Sūrah {s} has no āyah {a}.", { s: num(s), a: num(a) });
    return ayahRef(s, a, data, ay);
  }
  const m = /^(?:h|hadith)?\s*#?\s*(\d{1,6})$/i.exec(raw);
  if (!m) throw userError("Write the hadith's number, like 3062.");
  const { hadeethEncUnitKey } = await import("./hadith-study-actions.js");
  return hadithRefById(m[1], { unitKey: hadeethEncUnitKey(m[1]) });
}

/** An āyah's block from a sūrah file's own record (quran-data.js getSurah()). */
export function ayahRef(s, a, data, ay) {
  const name = surahName(s, data?.surahNameEnglish ?? "");
  return cleanRefState({
    kind: "ayah", id: `ayah:${s}:${a}`,
    label: t("Quran {ref} · {name}", { ref: num(`${s}:${a}`), name }),
    text: { ar: ay.uthmaniText ?? "", en: ay.translations?.en ?? "", bn: ay.translations?.bn ?? "" },
  });
}

/** A HadeethEnc hadith's block: its Arabic, and its English and Bangla where the collection has them. */
/** `unitKey` is the caller's own HadeethEnc key (hadith-study-actions.js hadeethEncUnitKey(), the one place that builds it). */
export async function hadithRefById(id, { title = "", label = "", unitKey } = {}) {
  const { loadHadithRecord, hadithArabicText } = await import("./hadeethenc-corpus.js");
  let en = null, bn = null;
  try { en = await loadHadithRecord(id, "en"); } catch { en = null; }
  if (!en) throw userError("There is no hadith {n} in the collection.", { n: num(id) });
  try { bn = await loadHadithRecord(id, "bn"); } catch { bn = null; }
  const ar = hadithArabicText(en.record, en.lang) ?? "";
  const shownTitle = title || (getAppLang() === "bn" && bn?.lang === "bn" ? bn.record.title : en.record.title) || "";
  return cleanRefState({
    kind: "hadith", id: unitKey,
    label: label || (shownTitle ? t("Hadith {n} · {title}", { n: num(id), title: shownTitle }) : t("Hadith {n}", { n: num(id) })),
    text: { ar, en: en.lang === "en" ? (en.record.hadeeth ?? "") : "", bn: bn?.lang === "bn" ? (bn.record.hadeeth ?? "") : "" },
  });
}
