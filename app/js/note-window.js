// The Note VIEW and its pop-up WINDOWS, shared by Mapping My Journey
// (journey-map.html) and the Notes page (notes.html) -- Siyagah port round 6b
// (Owner decisions 42.4, M3). ONE editor implementation, ONE window
// implementation: round 6a wrote them inside journey-map.html; this round moved
// them here, unchanged in behaviour, so the Notes page does not get a copy.
//
// A "view" is one surface showing one Note -- the inline pane (journey-map
// only) or a pop-up window. It owns its element, the Note it shows, its ‹ ›
// order and its own edit session. A Note is never live in two views (§4.6).
//
// Edit with autosave (handover §4.4): typing is kept on the device every ~1 s
// (a local draft, per Note); a REVISION is written after ~30 s with no typing
// and on every way out. A revision is stamped only when title or body really
// changed.
//
// WHAT THE PAGE SUPPLIES (`host`): how a revision is WRITTEN (`revise` --
// Mapping My Journey uses updatePermanentNoteContent, the Notes page uses
// reviseStudyNote so Journaling evidence is still recorded), the Note list,
// the ⋯ menu's extra items and what they do, folder chips, and layout hooks
// for the inline pane. This module imports NO Firebase and no data layer, so
// it can never write around the page's own write path (I2: pure UI).

import { t } from "./i18n.js";
import { sanitizeNoteHtml, isSafeNoteHref } from "./note-sanitize.js";
import { closeAllBarPalettes } from "./bar-palette.js";
import { HANDLES, handleCss, clampRect, startDrag } from "./float-window.js";

const escapeHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The view's markup: the inline pane's content and the body of every window. */
export const NOTE_VIEW_HTML = `
      <div class="note-pane-bar" data-pane-bar>
        <button type="button" class="secondary pane-btn" data-pane-back>← <span data-pane-back-label>Back</span></button>
        <button type="button" class="secondary pane-btn pane-nav" data-pane-prev>‹</button>
        <button type="button" class="secondary pane-btn pane-nav" data-pane-next>›</button>
        <span class="bar-palette-wrap pane-menu-wrap" data-bar-palette-wrap="paneContents" data-pane-contents-wrap hidden>
          <button type="button" class="secondary pane-btn bar-palette-toggle" data-bar-palette-toggle="paneContents" aria-haspopup="true" aria-expanded="false" data-pane-contents-btn>☰ <span data-pane-contents-label>Contents</span></button>
          <div class="bar-palette pane-contents-menu" data-bar-palette="paneContents" data-pane-contents-list></div>
        </span>
        <span class="pane-spacer"></span>
        <button type="button" class="secondary pane-btn pane-tool" data-pane-find-toggle>🔍</button>
        <button type="button" class="secondary pane-btn pane-tool" data-pane-foldall hidden>⇅</button>
        <button type="button" class="secondary pane-btn pane-attach" data-pane-attach hidden>📎</button>
        <button type="button" class="secondary pane-btn" data-pane-new hidden>✚</button>
        <button type="button" class="secondary pane-btn" data-pane-edit-toggle hidden></button>
        <span class="bar-palette-wrap folder-menu-wrap" data-bar-palette-wrap="paneMenu" data-pane-menu-wrap>
          <button type="button" class="folder-menu-btn bar-palette-toggle" data-bar-palette-toggle="paneMenu" aria-haspopup="true" aria-expanded="false" data-pane-menu-btn>⋯</button>
          <div class="bar-palette" data-bar-palette="paneMenu" data-pane-menu></div>
        </span>
      </div>
      <div class="note-find-bar" data-find-bar role="search" hidden>
        <input type="search" class="note-find-input" data-find-input>
        <span class="note-find-count" data-find-count role="status" aria-live="polite"></span>
        <button type="button" class="secondary pane-btn" data-find-prev>▲</button>
        <button type="button" class="secondary pane-btn" data-find-next>▼</button>
        <button type="button" class="secondary pane-btn" data-find-close>✕</button>
      </div>
      <h2 class="note-pane-title" data-pane-title></h2>
      <input type="text" class="pane-edit-title" data-edit-title hidden>
      <p class="note-pane-meta" data-pane-meta></p>
      <div class="note-pane-chips" data-pane-chips></div>
      <div class="pane-draft-offer" data-draft-offer hidden></div>
      <div class="pane-edit-toolbar" data-edit-toolbar hidden></div>
      <div class="pane-edit-panel" data-edit-panel hidden></div>
      <p class="pane-edit-status" data-edit-status role="status" aria-live="polite" hidden></p>
      <div class="note-pane-body" data-pane-body></div>
    `;

const NOTE_DRAFT_MS = 1000, NOTE_IDLE_MS = 30000, NOTE_RETRY_MS = 10000;
const DRAFT_KEY = (noteId) => `qr.journeyNoteDraft.${noteId}`;
const COLLAPSE_KEY = (noteId) => `qr.journeyNoteCollapsed.${noteId}`;
const WIN_LIMITS = { minW: 320, minH: 360, bar: 44 };
const WIN_SHEET_BELOW = 640, WIN_OFFSET = 28, WIN_Z = 1000, WIN_SWITCH_H = 56;

function loadCollapsed(noteId) {
  try { const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY(noteId)) || "[]"); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
}
function saveCollapsed(noteId, set) {
  try { localStorage.setItem(COLLAPSE_KEY(noteId), JSON.stringify([...set])); } catch { /* private browsing -- the choice just doesn't stick */ }
}
function loadDraft(noteId) {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY(noteId)) || "null");
    return d && typeof d.title === "string" && typeof d.bodyHtml === "string" ? d : null;
  } catch { return null; }
}
function saveDraft(noteId, draft) { try { localStorage.setItem(DRAFT_KEY(noteId), JSON.stringify(draft)); } catch { /* storage full or private -- the draft just isn't kept */ } }
function clearDraft(noteId) { try { localStorage.removeItem(DRAFT_KEY(noteId)); } catch { /* nothing to clear */ } }
/** Sanitise, let the browser re-serialise, sanitise again: the SAME text always compares equal however the editor reformatted it. */
function normBody(html) {
  const d = document.createElement("div");
  d.innerHTML = sanitizeNoteHtml(html || "");
  return sanitizeNoteHtml(d.innerHTML);
}
/** S12: in Bangla the time is Bangla digits and a 24-hour clock -- the locale's own "AM"/"PM" was printed in English. Other languages keep the browser's own format. */
export function formatNoteTime(ms, locale) {
  const d = new Date(ms);
  if (locale && /^bn/i.test(locale)) return new Intl.DateTimeFormat("bn-BD-u-nu-beng", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return d.toLocaleString(locale || undefined, { dateStyle: "medium", timeStyle: "short" });
}
const noteTitleOf = (note) => note.title?.trim() || t("(untitled)");

/**
 * host = {
 *   paneEl?            the inline pane's <section> (Mapping My Journey only)
 *   winKey             localStorage key for the windows' geometry (per page)
 *   notes()            every Note the page can show (live objects)
 *   ready()            false until the Notes have loaded -- nothing is written before (§5.1)
 *   canEdit()          may this reader edit these Notes (their own)
 *   isRetired(note)
 *   when(ts), dateLocale()
 *   revise({ note, expectedRevisionId, title, bodyHtml })  -> the new revisionId; throws Error("Stale Note revision.") when stale
 *   afterRevise(note)  the page re-renders its own list
 *   status(msg)        a page-level sentence
 *   refresh()          reload the page's data (after a conflict)
 *   chips(note)        [{ id, label }] folder chips ([] when the page has none)
 *   onChip(v, id)
 *   tagging?           Siyagah round 7b (Tags; never Note Types). Absent = no Tags control.
 *                      { ready()  true once the round 7 Rules are published (until then the picker
 *                                 shows, says so, and writes nothing),
 *                        tags()   [{ id, name, color }] the owner's active tags,
 *                        noteTagIds(note)  the tag ids on a Note,
 *                        tag(note, tagId) / untag(note, tagId)  -> Promise; the page writes,
 *                        create(name) -> Promise<tagId>; throws Error(sentence) on a duplicate }
 *                      Tagging is not a revision: nothing here touches the Note or Journaling.
 *   menuMid(v, note)   extra ⋯ items for the Note's owner, HTML
 *   menuEnd(v, note)   extra ⋯ items at the end, HTML
 *   onMenu(v, note, on)  handle a click on one of those items; true when handled
 *   onEditStart?(v, note) / onEditDone?(v, note)  S10: an edit opens / Done was pressed (the page writes what it staged)
 *   attach?(v, note)   S11: when given (the owner only), the bar shows a 📎 that opens the page's folders-and-tags sheet
 *   versions?          S11 (never a new field): { list(note) -> Promise<[{ id, title, bodyHtml, createdAt, reason }]> newest first,
 *                        restore(note, rev) -> Promise  (saves rev as a NEW revision through the page's own save path) }
 *   newNote?()         S8: when given, the pane bar shows a ✚ (the owner only) that calls it
 *   orderFrom(el), folderFrom(el)   the ‹ › order / folder of the row a Note was opened from
 *   paneTier(), paneApply(), scroller()   the inline pane's layout (pane only)
 * }
 */
export function createNoteViews(host) {
  const getNote = (id) => host.notes().find((n) => n.noteId === id);
  const notePane = host.paneEl ?? null;
  const proto = document.createElement("section");
  proto.innerHTML = NOTE_VIEW_HTML;
  if (notePane) notePane.innerHTML = NOTE_VIEW_HTML;
  let viewSeq = 0;
  let paneListScroll = 0;

  function makeView(el, kind) {
    const v = { el, kind, win: null, uid: kind === "pane" ? "" : `w${++viewSeq}`, noteId: null, order: [], folderId: null, ed: null };
    v.barEl = el.querySelector("[data-pane-bar]");
    v.editTitleEl = el.querySelector("[data-edit-title]");
    v.editToolbarEl = el.querySelector("[data-edit-toolbar]");
    v.editStatusEl = el.querySelector("[data-edit-status]");
    v.draftOfferEl = el.querySelector("[data-draft-offer]");
    v.bodyEl = el.querySelector("[data-pane-body]");
    v.scrollEl = el.querySelector("[data-win-scroll]") || el;
    if (v.uid) { // palette ids must be unique per surface (bar-palette.js closes "all but this id")
      for (const w of el.querySelectorAll("[data-bar-palette-wrap]")) w.dataset.barPaletteWrap += v.uid;
      for (const b of el.querySelectorAll("[data-bar-palette-toggle]")) b.dataset.barPaletteToggle += v.uid;
      for (const p of el.querySelectorAll("[data-bar-palette]")) p.dataset.barPalette += v.uid;
    }
    el.addEventListener("input", (ev) => {
      if (!ev.target.closest("[data-edit-title], [data-edit-body]")) return;
      if (v.win && ev.target.matches("[data-edit-title]")) v.win.querySelector(".nw-title").textContent = ev.target.value.trim() || t("(untitled)");
      onEditInput(v);
    });
    el.addEventListener("mousedown", (ev) => { if (ev.target.closest("[data-edit-toolbar] button, [data-edit-panel] button")) ev.preventDefault(); });
    v.editPanelEl = el.querySelector("[data-edit-panel]");
    // S12: a checklist box is ticked by pressing its box (the left edge of the item, the right edge in right-to-left text); pressing the grip / fold arrow is handled separately.
    el.addEventListener("click", (ev) => tickCheckbox(v, ev));
    el.addEventListener("keydown", (ev) => {
      if (ev.target.closest("[data-sec-grip]")) gripKey(v, ev);
      else if (ev.target.matches?.("[data-panel-url]") && ev.key === "Enter") { ev.preventDefault(); applyLink(v); }
      else if (ev.target.closest?.("[data-edit-panel]") && ev.key === "Escape") { ev.stopPropagation(); closePanel(v); editBodyEl(v)?.focus(); }
    });
    el.addEventListener("pointerdown", (ev) => { const g = ev.target.closest("[data-sec-grip]"); if (g && v.ed) startGripDrag(v, g, ev); });
    el.addEventListener("click", (ev) => onViewClick(v, ev));
    // S11: Find -- typing re-marks the body; Enter / Shift+Enter step; Esc closes the find bar (and only it).
    v.find = { marks: [], idx: -1 };
    const findInput = el.querySelector("[data-find-input]");
    findInput.addEventListener("input", () => runFind(v));
    findInput.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); stepFind(v, v.find.idx + (ev.shiftKey ? -1 : 1)); } });
    el.querySelector("[data-find-bar]").addEventListener("keydown", (ev) => { if (ev.key === "Escape") { ev.stopPropagation(); closeFind(v); } });
    return v;
  }
  const paneView = notePane ? makeView(notePane, "pane") : { kind: "pane", noteId: null, ed: null };
  if (notePane) notePane.tabIndex = -1; // focusView() lands here when a Note already open in the pane is asked for again
  const windowViews = []; // pop-up windows
  const allViews = () => (notePane ? [paneView, ...windowViews] : [...windowViews]);
  const viewShowing = (noteId) => allViews().find((x) => x.noteId === noteId);

  const editBodyEl = (v) => v.bodyEl.querySelector("[data-edit-body]");
  function readEditor(v) {
    const body = editBodyEl(v);
    return { title: v.editTitleEl.value.trim(), bodyHtml: body ? normBody(body.innerHTML) : "" };
  }
  function setEditStatus(v, kind) {
    const text = {
      device: t("Saved on this device"),
      saved: t("Saved"),
      unsaved: t("Not saved yet — will try again"),
      conflict: t("This Note changed on another device. Your text is kept on this device — copy it before reloading."),
    }[kind] || "";
    v.editStatusEl.textContent = text;
    v.editStatusEl.hidden = !text || !v.ed;
    v.editStatusEl.classList.toggle("problem", kind === "unsaved" || kind === "conflict");
  }
  function writeEditDraft(e, cur) {
    const v = e.view;
    if (cur.title === e.baseTitle && cur.bodyHtml === e.baseBody) { clearDraft(e.noteId); return; }
    saveDraft(e.noteId, { title: cur.title, bodyHtml: cur.bodyHtml, baseRevisionId: e.baseRevisionId, at: Date.now() });
    if (v.ed === e && !e.conflict && !e.failed) setEditStatus(v, "device");
  }
  function onEditInput(v) {
    const e = v.ed;
    if (!e) return;
    scheduleGutter(v);
    if (!e.draftTimer) e.draftTimer = setTimeout(() => { e.draftTimer = null; if (v.ed === e) writeEditDraft(e, readEditor(v)); }, NOTE_DRAFT_MS);
    clearTimeout(e.idleTimer);
    e.idleTimer = setTimeout(() => flushEdit(e), NOTE_IDLE_MS);
  }

  /** Writes ONE revision when -- and only when -- something really changed since the baseline. `cur` is passed by a caller that has already torn the editor down. */
  async function flushEdit(e, cur) {
    if (!e) return;
    const v = e.view;
    clearTimeout(e.idleTimer); e.idleTimer = null;
    clearTimeout(e.retryTimer); e.retryTimer = null;
    cur = cur ?? (v.ed === e ? readEditor(v) : e.lastContent);
    if (!cur) return;
    e.lastContent = cur;
    if (cur.title === e.baseTitle && cur.bodyHtml === e.baseBody) { clearDraft(e.noteId); return; }
    writeEditDraft(e, cur); // the device copy first, always
    if (!host.ready()) return; // §5.1: never before the data has loaded
    if (e.conflict) return;
    if (e.saving) { e.again = true; return; }
    e.saving = true;
    let newRevisionId;
    try {
      newRevisionId = await host.revise({
        note: getNote(e.noteId) ?? { noteId: e.noteId }, expectedRevisionId: e.baseRevisionId, title: cur.title, bodyHtml: cur.bodyHtml,
      });
    } catch (err) {
      e.saving = false;
      if (err?.message === "Stale Note revision.") {
        e.conflict = true;
        host.status(t("This Note changed on another device. Your text is kept on this device — copy it before reloading."));
        if (v.ed === e) setEditStatus(v, "conflict");
      } else {
        console.error("[note autosave]", err);
        e.failed = true;
        host.status(t("Not saved yet — will try again"));
        if (v.ed === e) { setEditStatus(v, "unsaved"); e.retryTimer = setTimeout(() => flushEdit(e), NOTE_RETRY_MS); }
      }
      return;
    }
    e.saving = false; e.failed = false;
    e.baseRevisionId = newRevisionId; e.baseTitle = cur.title; e.baseBody = cur.bodyHtml;
    const note = getNote(e.noteId);
    if (note) {
      Object.assign(note, { title: cur.title, bodyHtml: cur.bodyHtml, currentRevisionId: newRevisionId, updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() } });
    }
    const latest = v.ed === e ? readEditor(v) : cur;
    if (latest.title === cur.title && latest.bodyHtml === cur.bodyHtml) clearDraft(e.noteId);
    else { writeEditDraft(e, latest); e.idleTimer = setTimeout(() => flushEdit(e), NOTE_IDLE_MS); }
    if (v.ed === e) {
      setEditStatus(v, "saved");
      if (note) v.el.querySelector("[data-pane-meta]").textContent = paneMetaText(note);
    }
    host.afterRevise(note);
    if (e.again) { e.again = false; flushEdit(e); }
  }
  /** Every way out of the editor: detach the session, then flush it. Resolves with the session once the write has settled. */
  async function endEdit(v) {
    const e = v.ed;
    if (!e) return null;
    const cur = readEditor(v);
    v.ed = null;
    e.ro?.disconnect();
    closePanel(v);
    clearTimeout(e.draftTimer); e.draftTimer = null;
    await flushEdit(e, cur);
    return e;
  }
  function flushActiveEdit() { for (const v of allViews()) if (v.ed) flushEdit(v.ed); }
  // A phone that is backgrounded never runs a timer, so the way out is the event.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushActiveEdit(); });
  window.addEventListener("pagehide", flushActiveEdit);
  // The tray (journey-tray.js) hides this document without unloading it.
  window.addEventListener("message", (ev) => { if (ev.origin === location.origin && ev.data?.type === "mmsa-journey-flush") flushActiveEdit(); });

  // =====================================================================
  // THE EDITOR'S TOOLBAR, PANEL AND HEADING CONTROLS (S12, #562).
  // Everything here changes only the editor's own DOM and goes out through the
  // existing autosave (onEditInput -> flushEdit -> host.revise). The grip and the
  // fold arrow live in a layer BESIDE the editable body, never inside it, so they
  // can never be saved; a fold is a CSS class the sanitiser strips, so it writes
  // nothing. Failures are said in words in the panel (I15).
  // =====================================================================
  const TOOLS = [
    ["bold", "Bold", "<b>B</b>"], ["italic", "Italic", "<i>I</i>"], ["underline", "Underline", "<u>U</u>"], ["strike", "Strikethrough", "<s>S</s>"],
    ["h1", "Heading 1", "H1"], ["h2", "Heading 2", "H2"], ["h3", "Heading 3", "H3"],
    ["ul", "Bullet list", "•"], ["ol", "Numbered list", "1."], ["check", "Checklist", "☑"], ["quote", "Quote", "❝"],
    ["link", "Link", "🔗"], ["table", "Table", "▦"],
    ["color", "Text colour", "<span class=\"tb-swatch-a\">A</span>"], ["highlight", "Highlight", "<span class=\"tb-swatch-hl\">A</span>"],
    ["left", "Align left", "⇤"], ["center", "Align centre", "↔"], ["right", "Align right", "⇥"],
    ["undo", "Undo", "↶"], ["redo", "Redo", "↷"], ["clear", "Clear formatting", "⌫"],
  ];
  // Fixed palettes: dark text colours and pale highlights, all readable on the white Note page (palette-contrast checks them).
  const TEXT_COLOURS = [["#B3261E", "Red"], ["#1F3A6E", "Navy"], ["#1B6E3C", "Green"], ["#6A3FA0", "Purple"], ["#7A4B00", "Brown"], ["#006A6A", "Teal"]];
  const HIGHLIGHTS = [["#FFF59D", "Yellow"], ["#C8E6C9", "Light green"], ["#BBDEFB", "Light blue"], ["#F8BBD0", "Pink"], ["#E1BEE7", "Lavender"], ["#FFE0B2", "Orange"]];
  const isHeadingEl = (n) => n?.nodeType === 1 && /^H[1-4]$/.test(n.tagName);

  function renderEditToolbar(v) {
    const label = (k) => escapeHtml(t(k));
    v.editToolbarEl.innerHTML = TOOLS.map(([c, name, glyph]) => `<button type="button" class="secondary tb-btn" data-cmd="${c}" aria-label="${label(name)}" title="${label(name)}">${glyph}</button>`).join("");
    v.editToolbarEl.setAttribute("role", "toolbar");
    v.editToolbarEl.setAttribute("aria-label", t("Formatting"));
  }
  const closestIn = (v, selector) => {
    const body = editBodyEl(v), sel = window.getSelection();
    let n = sel?.rangeCount ? sel.anchorNode : null;
    // a click in an empty table cell can anchor the caret on the row / body itself: step to the cell it points at
    if (n && n.nodeType === 1 && /^(TR|TBODY|THEAD|TABLE)$/.test(n.tagName)) { const k = n.childNodes[Math.min(sel.anchorOffset, n.childNodes.length - 1)]; if (k) n = k; }
    if (n && n.nodeType === 3) n = n.parentElement;
    if (n && n.tagName === "TR") n = n.firstElementChild ?? n;
    const el = n?.closest?.(selector);
    return el && body.contains(el) ? el : null;
  };
  function saveRange(v) {
    const body = editBodyEl(v), sel = window.getSelection();
    if (v.ed && body && sel?.rangeCount && body.contains(sel.anchorNode)) v.ed.range = sel.getRangeAt(0).cloneRange();
  }
  function restoreRange(v) {
    const body = editBodyEl(v);
    body.focus();
    if (v.ed?.range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(v.ed.range); }
  }
  const panelMsg = (v, text) => { const m = v.editPanelEl.querySelector("[data-panel-msg]"); if (m) { m.textContent = text || ""; m.hidden = !text; } };
  function closePanel(v) { v.editPanelEl.hidden = true; v.editPanelEl.replaceChildren(); v.editPanelEl.dataset.mode = ""; }
  function openPanel(v, mode) {
    saveRange(v);
    const P = v.editPanelEl, label = (k) => escapeHtml(t(k));
    const close = `<button type="button" class="secondary tb-btn tb-text" data-panel-close>${label("Close")}</button>`;
    const msg = `<p class="pane-panel-msg" data-panel-msg role="alert" hidden></p>`;
    if (mode === "link") {
      const cur = closestIn(v, "a");
      P.innerHTML = `<div class="pane-panel-row"><label class="pane-panel-field">${label("Web address")}<input type="text" inputmode="url" autocomplete="off" data-panel-url value="${escapeHtml(cur?.getAttribute("href") || "")}" placeholder="https://"></label>
        <button type="button" class="tb-btn tb-text" data-panel-apply>${label("Apply")}</button>
        <button type="button" class="secondary tb-btn tb-text" data-panel-unlink>${label("Remove link")}</button>${close}</div>${msg}`;
    } else if (mode === "table") {
      P.innerHTML = `<div class="pane-panel-row">
        <label class="pane-panel-field narrow">${label("Rows")}<input type="number" min="1" max="20" value="3" data-table-rows></label>
        <label class="pane-panel-field narrow">${label("Columns")}<input type="number" min="1" max="8" value="3" data-table-cols></label>
        <button type="button" class="tb-btn tb-text" data-table-insert>${label("Insert table")}</button></div>
        <div class="pane-panel-row">
        <button type="button" class="secondary tb-btn tb-text" data-table-op="addRow">${label("Add row")}</button>
        <button type="button" class="secondary tb-btn tb-text" data-table-op="delRow">${label("Remove row")}</button>
        <button type="button" class="secondary tb-btn tb-text" data-table-op="addCol">${label("Add column")}</button>
        <button type="button" class="secondary tb-btn tb-text" data-table-op="delCol">${label("Remove column")}</button>${close}</div>${msg}`;
    } else {
      const list = mode === "color" ? TEXT_COLOURS : HIGHLIGHTS;
      P.innerHTML = `<div class="pane-panel-row" role="group" aria-label="${label(mode === "color" ? "Text colour" : "Highlight")}">${list.map(([hex, name]) =>
        `<button type="button" class="tb-btn tb-chip" data-swatch="${hex}" data-swatch-mode="${mode}" aria-label="${label(name)}" title="${label(name)}" style="background:${hex}"><span aria-hidden="true" style="color:${mode === "color" ? hex : "#222"}">${mode === "color" ? "■" : "A"}</span></button>`).join("")}${close}</div>${msg}`;
    }
    P.dataset.mode = mode;
    P.hidden = false;
    P.querySelector("input")?.focus();
  }
  function applyLink(v) {
    const url = (v.editPanelEl.querySelector("[data-panel-url]").value || "").trim();
    if (!isSafeNoteHref(url)) { panelMsg(v, t("Use a web address that starts with http://, https:// or mailto:")); return; }
    restoreRange(v);
    const cur = closestIn(v, "a"), sel = window.getSelection();
    if (cur) cur.setAttribute("href", url);
    else if (!sel.rangeCount || sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    else document.execCommand("createLink", false, url);
    closePanel(v); onEditInput(v);
  }
  function removeLink(v) {
    restoreRange(v);
    const cur = closestIn(v, "a");
    if (!cur) { panelMsg(v, t("Put the cursor inside a link first.")); return; }
    cur.replaceWith(...cur.childNodes);
    closePanel(v); onEditInput(v);
  }
  function insertTable(v) {
    const rows = Number(v.editPanelEl.querySelector("[data-table-rows]").value), cols = Number(v.editPanelEl.querySelector("[data-table-cols]").value);
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || rows > 20 || cols < 1 || cols > 8) { panelMsg(v, t("Choose 1 to 20 rows and 1 to 8 columns.")); return; }
    restoreRange(v);
    const body = editBodyEl(v), before = new Set(body.querySelectorAll("table"));
    const row = `<tr>${"<td><br></td>".repeat(cols)}</tr>`;
    document.execCommand("insertHTML", false, `<table><tbody>${row.repeat(rows)}</tbody></table><p><br></p>`);
    const made = [...body.querySelectorAll("table")].find((x) => !before.has(x));
    if (made) { const r = document.createRange(); r.setStart(made.querySelector("td"), 0); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    closePanel(v); onEditInput(v);
  }
  function tableOp(v, op) {
    restoreRange(v);
    const cell = closestIn(v, "td, th");
    if (!cell) { panelMsg(v, t("Click inside a table cell first.")); return; }
    const tr = cell.parentElement, table = cell.closest("table"), idx = [...tr.children].indexOf(cell);
    const mk = () => { const td = document.createElement("td"); td.appendChild(document.createElement("br")); return td; };
    if (op === "addRow") { const n = document.createElement("tr"); for (let i = 0; i < tr.children.length; i++) n.appendChild(mk()); tr.after(n); }
    else if (op === "delRow") { tr.remove(); if (!table.querySelector("tr")) table.remove(); }
    else if (op === "addCol") { for (const r of table.querySelectorAll("tr")) r.children[Math.min(idx, r.children.length - 1)]?.after(mk()); }
    else if (op === "delCol") { for (const r of table.querySelectorAll("tr")) r.children[idx]?.remove(); if (![...table.querySelectorAll("tr")].some((r) => r.children.length)) table.remove(); }
    panelMsg(v, ""); onEditInput(v);
  }
  function applySwatch(v, hex, mode) {
    restoreRange(v);
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(mode === "color" ? "foreColor" : "hiliteColor", false, hex);
    document.execCommand("styleWithCSS", false, false);
    onEditInput(v);
  }
  function clearFormatting(v) {
    const body = editBodyEl(v), sel = window.getSelection();
    document.execCommand("removeFormat", false, null);
    document.execCommand("unlink", false, null);
    if (sel.rangeCount) for (const el of body.querySelectorAll("[style]")) if (sel.containsNode(el, true)) el.removeAttribute("style");
    const blk = closestIn(v, "h1, h2, h3, blockquote");
    if (blk) document.execCommand("formatBlock", false, "p");
  }
  function runEditCommand(v, cmd) {
    const body = editBodyEl(v);
    if (!body) return;
    if (["link", "table", "color", "highlight"].includes(cmd)) {
      if (!v.editPanelEl.hidden && v.editPanelEl.dataset.mode === cmd) closePanel(v); else openPanel(v, cmd);
      return;
    }
    closePanel(v);
    body.focus();
    document.execCommand("styleWithCSS", false, false);
    if (/^h[123]$/.test(cmd)) {
      const now = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
      document.execCommand("formatBlock", false, now === cmd ? "p" : cmd);
    } else if (cmd === "quote") {
      document.execCommand("formatBlock", false, closestIn(v, "blockquote") ? "p" : "blockquote");
    } else if (cmd === "check") {
      const ul = closestIn(v, "ul");
      if (ul?.hasAttribute("data-check")) { ul.removeAttribute("data-check"); for (const li of ul.children) { li.removeAttribute("data-checked"); li.removeAttribute("dir"); } }
      else {
        if (!ul) document.execCommand("insertUnorderedList", false, null);
        const made = closestIn(v, "ul");
        if (made) { made.setAttribute("data-check", "1"); for (const li of made.children) li.setAttribute("dir", "auto"); }
      }
    } else if (["left", "center", "right"].includes(cmd)) {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand({ left: "justifyLeft", center: "justifyCenter", right: "justifyRight" }[cmd], false, null);
      document.execCommand("styleWithCSS", false, false);
    } else if (cmd === "clear") {
      clearFormatting(v);
    } else {
      document.execCommand({ bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough", ul: "insertUnorderedList", ol: "insertOrderedList", undo: "undo", redo: "redo" }[cmd], false, null);
    }
    onEditInput(v);
  }

  /** Ticking a checklist item while editing: press its box (left edge; right edge in right-to-left text). */
  function tickCheckbox(v, ev) {
    if (!v.ed) return;
    const li = ev.target.closest?.("ul[data-check] > li");
    if (!li || !editBodyEl(v)?.contains(li)) return;
    const r = li.getBoundingClientRect(), rtl = getComputedStyle(li).direction === "rtl";
    const inBox = rtl ? ev.clientX >= r.right - 36 : ev.clientX <= r.left + 36;
    if (!inBox) return;
    if (li.getAttribute("data-checked") === "true") li.removeAttribute("data-checked"); else li.setAttribute("data-checked", "true");
    onEditInput(v);
  }

  // ---- Heading controls while editing: a fold arrow and a drag grip per heading ----
  const sectionNodes = (h) => {
    const level = Number(h.tagName[1]), out = [h];
    for (let n = h.nextSibling; n; n = n.nextSibling) {
      if (isHeadingEl(n) && Number(n.tagName[1]) <= level) break;
      out.push(n);
    }
    return out;
  };
  let gutterRaf = 0;
  function scheduleGutter(v) { cancelAnimationFrame(gutterRaf); gutterRaf = requestAnimationFrame(() => layoutGutter(v)); }
  function layoutGutter(v) {
    const e = v.ed, body = editBodyEl(v);
    if (!e || !body || !e.gutterEl) return;
    for (const el of body.querySelectorAll(".ed-folded")) el.classList.remove("ed-folded");
    const heads = [...body.children].filter(isHeadingEl);
    for (const h of [...e.folded]) if (!h.isConnected) e.folded.delete(h);
    for (const h of heads) {
      if (!e.folded.has(h)) continue;
      for (const n of sectionNodes(h).slice(1)) if (n.nodeType === 1) n.classList.add("ed-folded");
    }
    e.gutterEl.replaceChildren();
    const wr = e.wrapEl.getBoundingClientRect();
    for (const h of heads) {
      if (h.classList.contains("ed-folded")) continue;
      const hr = h.getBoundingClientRect(), folded = e.folded.has(h);
      const ctl = document.createElement("div");
      ctl.className = "ed-heading-ctl";
      ctl.style.top = `${hr.top - wr.top}px`;
      ctl.style.height = `${Math.max(hr.height, 40)}px`;
      const fold = document.createElement("button");
      fold.type = "button"; fold.className = "secondary ed-ctl-btn"; fold.dataset.secFold = "";
      fold.setAttribute("aria-expanded", String(!folded));
      fold.setAttribute("aria-label", t(folded ? "Open this section" : "Fold this section"));
      fold.title = t(folded ? "Open this section" : "Fold this section");
      fold.textContent = folded ? "▶" : "▾";
      fold.__h = h;
      const grip = document.createElement("button");
      grip.type = "button"; grip.className = "secondary ed-ctl-btn ed-grip"; grip.dataset.secGrip = "";
      grip.setAttribute("aria-label", t("Move this section (drag, or use the up and down arrow keys)"));
      grip.title = t("Move this section (drag, or use the up and down arrow keys)");
      grip.textContent = "⠿";
      grip.__h = h;
      ctl.append(fold, grip);
      e.gutterEl.appendChild(ctl);
    }
  }
  function toggleFold(v, h) {
    const e = v.ed;
    if (!e || !h?.isConnected) return;
    if (e.folded.has(h)) e.folded.delete(h); else e.folded.add(h);
    layoutGutter(v); // a view-only change: no onEditInput, so nothing is drafted or saved
  }
  /** Move the whole section of heading `h` (it and everything up to the next heading of the same or higher level) before `ref` (null = the end). */
  function moveSection(v, h, ref) {
    const body = editBodyEl(v), nodes = sectionNodes(h);
    if (!body || nodes.includes(ref)) return false;
    if ((ref ?? null) === (nodes[nodes.length - 1].nextSibling ?? null)) return false; // already there
    for (const n of nodes) body.insertBefore(n, ref);
    onEditInput(v); layoutGutter(v);
    return true;
  }
  function gripKey(v, ev) {
    if (!v.ed || (ev.key !== "ArrowUp" && ev.key !== "ArrowDown")) return;
    const h = ev.target.closest("[data-sec-grip]").__h, body = editBodyEl(v);
    if (!h?.isConnected) return;
    ev.preventDefault();
    const heads = [...body.children].filter(isHeadingEl);
    let moved = false;
    if (ev.key === "ArrowUp") { const prev = heads[heads.indexOf(h) - 1]; if (prev) moved = moveSection(v, h, prev); }
    else { const own = sectionNodes(h), nxt = heads.slice(heads.indexOf(h) + 1).find((x) => !own.includes(x));
      if (nxt) { const after = sectionNodes(nxt); moved = moveSection(v, h, after[after.length - 1].nextSibling); } }
    if (moved) v.el.querySelectorAll("[data-sec-grip]").forEach((g) => { if (g.__h === h) g.focus(); });
  }
  function startGripDrag(v, grip, ev) {
    const e = v.ed, h = grip.__h, body = editBodyEl(v);
    if (!e || !h?.isConnected || ev.button > 0) return;
    ev.preventDefault();
    const line = document.createElement("div");
    line.className = "ed-drop-line"; line.hidden = true;
    e.gutterEl.appendChild(line);
    grip.classList.add("dragging");
    let ref = undefined;
    const refAt = (y) => {
      const own = sectionNodes(h);
      for (const x of [...body.children].filter(isHeadingEl)) {
        if (x.classList.contains("ed-folded")) continue;
        const r = x.getBoundingClientRect();
        if (y < r.top + r.height / 2) return own.includes(x) ? undefined : x;
      }
      return null;
    };
    const move = (m) => {
      ref = refAt(m.clientY);
      const wr = e.wrapEl.getBoundingClientRect();
      if (ref === undefined) { line.hidden = true; return; }
      line.hidden = false;
      line.style.top = `${(ref ? ref.getBoundingClientRect().top : body.getBoundingClientRect().bottom) - wr.top}px`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      grip.classList.remove("dragging"); line.remove();
      if (ref !== undefined && v.ed === e) moveSection(v, h, ref);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }
  /** Paste goes through the Note's own cleaner BEFORE it touches the editor, so a hostile paste never lives in the DOM. */
  function onEditPaste(v, ev) {
    if (!v.ed || !ev.target.closest?.("[data-edit-body]")) return;
    ev.preventDefault();
    const html = ev.clipboardData?.getData("text/html"), text = ev.clipboardData?.getData("text/plain") || "";
    if (html) document.execCommand("insertHTML", false, sanitizeNoteHtml(html));
    else if (text) document.execCommand("insertText", false, text);
    onEditInput(v);
  }



  /** Begin editing `note`; `draft` (a restored local draft) replaces the stored text in the editor but never the baseline it is compared with. */
  function startEdit(v, note, draft = null) {
    if (v.ed || !host.ready()) return;
    v.ed = { view: v, noteId: note.noteId, baseRevisionId: note.currentRevisionId, baseTitle: (note.title ?? "").trim(), baseBody: normBody(note.bodyHtml) };
    v.editTitleEl.value = draft ? draft.title : (note.title ?? "");
    v.editTitleEl.hidden = false;
    v.el.querySelector("[data-pane-title]").hidden = true;
    v.draftOfferEl.hidden = true;
    closeFind(v, { focus: false });
    v.bodyEl.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "ed-wrap";
    const gutter = document.createElement("div");
    gutter.className = "ed-gutter";
    const body = document.createElement("div");
    body.className = "pane-edit-body";
    body.contentEditable = "true";
    body.dataset.editBody = "";
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-multiline", "true");
    body.setAttribute("aria-label", t("Note text"));
    body.innerHTML = sanitizeNoteHtml(draft ? draft.bodyHtml : note.bodyHtml);
    wrap.append(body, gutter);
    v.bodyEl.appendChild(wrap);
    Object.assign(v.ed, { wrapEl: wrap, gutterEl: gutter, folded: new Set(), range: null });
    body.addEventListener("paste", (ev) => onEditPaste(v, ev));
    body.addEventListener("keyup", () => saveRange(v));
    body.addEventListener("mouseup", () => saveRange(v));
    v.ed.ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => scheduleGutter(v)) : null;
    v.ed.ro?.observe(wrap);
    scheduleGutter(v);
    v.editTitleEl.setAttribute("aria-label", t("Note title"));
    renderEditToolbar(v);
    v.editToolbarEl.hidden = false;
    v.el.classList.add("pane-editing");
    setEditStatus(v, "");
    renderPaneBar(v);
    fitPaneBarTwice(v);
    if (draft) { writeEditDraft(v.ed, readEditor(v)); onEditInput(v); }
    body.focus();
  }
  /** Put the title / toolbar / status back to read mode (renderView calls this whenever no edit is open). */
  function showReadChrome(v, note) {
    v.editTitleEl.hidden = true;
    v.el.querySelector("[data-pane-title]").hidden = false;
    v.editToolbarEl.hidden = true;
    v.editStatusEl.hidden = true;
    v.el.classList.remove("pane-editing");
    const draft = host.canEdit() ? loadDraft(note.noteId) : null;
    if (draft && draft.title.trim() === (note.title ?? "").trim() && draft.bodyHtml === normBody(note.bodyHtml)) { clearDraft(note.noteId); v.draftOfferEl.hidden = true; return; }
    if (!draft) { v.draftOfferEl.hidden = true; return; }
    const at = draft.at ? new Date(draft.at).toLocaleString(host.dateLocale()) : "";
    v.draftOfferEl.innerHTML = `<div>${escapeHtml(t("You have unsaved text on this device, from {date}.", { date: at }))}</div>
      <div class="note-actions"><button type="button" class="tiny" data-draft-restore>${escapeHtml(t("Restore my unsaved text"))}</button>
      <button type="button" class="secondary tiny" data-draft-discard>${escapeHtml(t("Discard it"))}</button></div>`;
    v.draftOfferEl.hidden = false;
  }
  const timeLine = (ts) => { const loc = host.dateLocale?.(); const ms = tsMillis(ts); return loc && /^bn/i.test(loc) ? (ms ? formatNoteTime(ms, loc) : "") : host.when(ts); };
  function paneMetaText(note) {
    const created = timeLine(note.originalCreatedAt ?? note.createdAt), changed = timeLine(note.updatedAt);
    return [
      created ? t("Created {date}", { date: created }) : "",
      changed ? t("Last changed {date}", { date: changed }) : "",
    ].filter(Boolean).join(" · ");
  }

  function openPane(noteId, fromEl) {
    if (!notePane || !getNote(noteId)) return;
    const v = paneView;
    const elsewhere = windowViews.find((w) => w.noteId === noteId); // never live in two views (§4.6)
    if (elsewhere) { focusView(elsewhere); return; }
    if (v.ed && v.ed.noteId !== noteId) endEdit(v);
    if (v.noteId === null) paneListScroll = host.scroller().scrollTop;
    v.order = fromEl ? host.orderFrom(fromEl) : [noteId];
    v.folderId = fromEl ? host.folderFrom(fromEl) : null;
    v.noteId = noteId;
    host.paneApply();
    renderView(v);
    if (host.paneTier() === "narrow") host.scroller().scrollTop = 0;
  }

  /** Close the inline pane. `flush: false` is for a caller that has already flushed (pop-out). */
  function closePane({ restoreScroll = true, flush = true } = {}) {
    const v = paneView;
    if (v.noteId === null) return;
    if (flush && v.ed) endEdit(v); // Back, a folder chip, Trash...: a pending change is flushed on the way out
    v.noteId = null;
    closeAllBarPalettes(null);
    host.paneApply();
    if (restoreScroll) {
      host.scroller().scrollTop = paneListScroll;
      requestAnimationFrame(() => { host.scroller().scrollTop = paneListScroll; });
    }
  }
  /** Close whichever surface `v` is. */
  function closeView(v, opts) { if (v.kind === "pane") closePane(opts); else closeNoteWindow(v); }

  /** The one-line header: measure, then fold -- never wrap, never cut (§4.2). ‹ › fold into the ⋯ menu first; if the Contents label is still too wide it shortens to ☰. Run twice by the caller (now, and in requestAnimationFrame). */
  function fitPaneBar(v) {
    if (v.noteId === null) return;
    v.barEl.classList.remove("folded", "tight", "tools-folded", "attach-folded", "edit-folded");
    const over = () => v.barEl.scrollWidth > v.barEl.clientWidth + 1;
    // S11: the new tools fold first (🔍 ⇅ into ⋯, the Contents word to ☰, then 📎), so the existing ‹ › and Edit keep their place as long as they can.
    if (over()) v.barEl.classList.add("tools-folded");
    if (over()) v.barEl.classList.add("tight");
    if (over()) v.barEl.classList.add("attach-folded");
    if (over()) v.barEl.classList.add("folded");
    // Round 5: ✏️ Edit / ✓ Done is the LAST thing to fold, into ⋯ with its word.
    if (over()) v.barEl.classList.add("edit-folded");
  }
  function fitPaneBarTwice(v) { fitPaneBar(v); requestAnimationFrame(() => fitPaneBar(v)); }
  window.addEventListener("resize", () => {
    if (notePane) host.paneApply();
    for (const v of allViews()) if (v.noteId !== null) { if (v.kind === "window") applyWindowGeometry(v); renderPaneBar(v); fitPaneBarTwice(v); }
    updateWindowSwitcher();
  });

  function neighbours(v) {
    const others = new Set(allViews().filter((x) => x !== v && x.noteId).map((x) => x.noteId)); // a Note open in another view is not a step target
    const live = v.order.filter((id) => { const n = getNote(id); return n && !host.isRetired(n) && !others.has(id); });
    const i = live.indexOf(v.noteId);
    return { prev: i > 0 ? live[i - 1] : null, next: i >= 0 && i < live.length - 1 ? live[i + 1] : null };
  }

  /** The bar's own labels, the ⋯ menu and the Contents button -- everything on the header row. Re-run on a resize because the Contents button depends on the tier. */
  function renderPaneBar(v) {
    const note = getNote(v.noteId);
    if (!note) return;
    const { prev, next } = neighbours(v);
    const own = host.canEdit();
    const set = (sel, text) => { v.el.querySelector(sel).textContent = text; };
    set("[data-pane-back-label]", t("Back"));
    set("[data-pane-contents-label]", t("Contents"));
    const prevBtn = v.el.querySelector("[data-pane-prev]"), nextBtn = v.el.querySelector("[data-pane-next]");
    prevBtn.disabled = !prev; nextBtn.disabled = !next;
    prevBtn.setAttribute("aria-label", t("Previous note")); prevBtn.title = t("Previous note");
    nextBtn.setAttribute("aria-label", t("Next note")); nextBtn.title = t("Next note");
    const editLabel = v.ed ? `✓ ${t("Done")}` : `✏️ ${t("Edit")}`;
    const editToggle = v.el.querySelector("[data-pane-edit-toggle]");
    editToggle.hidden = !own;
    editToggle.textContent = editLabel;
    // S8: a page that supplies `newNote` gets a ✚ on the pane's own bar (icon only, so the one-line bar never grows).
    const newBtn = v.el.querySelector("[data-pane-new]");
    if (newBtn) {
      newBtn.hidden = !(own && host.newNote && v.kind === "pane");
      newBtn.setAttribute("aria-label", t("New note")); newBtn.title = t("New note");
    }
    const headings = [...v.el.querySelectorAll(".note-sec")];
    const foldBtn = v.el.querySelector("[data-pane-foldall]");
    foldBtn.hidden = !headings.length;
    const allCollapsed = headings.length > 0 && headings.every((sec) => sec.classList.contains("collapsed"));
    const foldLabel = allCollapsed ? t("Open all headings") : t("Close all headings");
    foldBtn.setAttribute("aria-label", foldLabel); foldBtn.title = foldLabel;
    const findBtn = v.el.querySelector("[data-pane-find-toggle]");
    findBtn.setAttribute("aria-label", t("Find in this Note")); findBtn.title = t("Find in this Note");
    findBtn.hidden = !!v.ed;
    const attachBtn = v.el.querySelector("[data-pane-attach]");
    const canAttach = !!(own && host.attach);
    attachBtn.hidden = !canAttach;
    attachBtn.setAttribute("aria-label", t("Folders and tags")); attachBtn.title = t("Folders and tags");
    const findBar = v.el.querySelector("[data-find-bar]");
    const fi = findBar.querySelector("[data-find-input]");
    fi.placeholder = t("Find in this Note"); fi.setAttribute("aria-label", t("Find in this Note"));
    for (const [sel, text] of [["[data-find-prev]", t("Previous match")], ["[data-find-next]", t("Next match")], ["[data-find-close]", t("Close")]]) {
      const b = findBar.querySelector(sel); b.setAttribute("aria-label", text); b.title = text;
    }
    let menu = `<button type="button" class="secondary tiny pane-fold-item" data-pane-prev ${prev ? "" : "disabled"}>‹ ${escapeHtml(t("Previous note"))}</button>
      <button type="button" class="secondary tiny pane-fold-item" data-pane-next ${next ? "" : "disabled"}>${escapeHtml(t("Next note"))} ›</button>`;
    if (!v.ed) menu += `<button type="button" class="secondary tiny pane-toolfold-item" data-pane-find-toggle>🔍 ${escapeHtml(t("Find in this Note"))}</button>`;
    if (headings.length) menu += `<button type="button" class="secondary tiny pane-toolfold-item" data-pane-foldall>⇅ ${escapeHtml(foldLabel)}</button>`;
    if (canAttach) menu += `<button type="button" class="secondary tiny pane-attachfold-item" data-pane-attach>📎 ${escapeHtml(t("Folders and tags"))}</button>`;
    if (host.versions) menu += `<button type="button" class="secondary tiny" data-pane-versions>🕘 ${escapeHtml(t("Versions…"))}</button>`;
    if (own) {
      menu = `<button type="button" class="secondary tiny pane-editfold-item" data-pane-edit-toggle>${escapeHtml(editLabel)}</button>` + menu;
      menu += host.menuMid?.(v, note) ?? "";
      if (host.tagging) menu += `<button type="button" class="secondary tiny" data-pane-tags>🏷 ${escapeHtml(t("Tags…"))}</button>`;
    }
    if (v.kind === "pane") menu += `<button type="button" class="secondary tiny" data-pane-popout>⧉ ${escapeHtml(t("Pop out"))}</button>`;
    menu += host.menuEnd?.(v, note) ?? "";
    const menuWrap = v.el.querySelector("[data-pane-menu-wrap]");
    menuWrap.hidden = !menu.trim();
    v.el.querySelector("[data-pane-menu]").innerHTML = menu;
    v.el.querySelector("[data-pane-menu-btn]").setAttribute("aria-label", t("More"));
    const showContents = headings.length >= 1; // S11: on every width, in the tray and in a window
    v.el.querySelector("[data-pane-contents-wrap]").hidden = !showContents;
    v.el.querySelector("[data-pane-contents-list]").innerHTML = headings.map((sec) =>
      `<button type="button" class="secondary tiny" data-pane-jump="${sec.dataset.secIndex}" style="padding-left:${(0.6 + (Number(sec.dataset.level) - 1) * 0.8).toFixed(1)}rem">${escapeHtml(sec.dataset.headingText)}</button>`).join("");
  }

  // =====================================================================
  // TAGS (Siyagah round 7b, Owner decision 42.5). The chips ride in the same
  // Details container as the folder chips, so a closed Details line hides them
  // as it hides those (no half-visible pill). The picker is ONE small dialog on
  // the page, above every window: tick boxes, a search box, ＋ New tag. Ticking
  // calls the page's tag/untag hook and nothing else.
  // =====================================================================
  function tagChipsHtml(note) {
    if (!host.tagging) return "";
    const ids = new Set(host.tagging.noteTagIds(note));
    return host.tagging.tags().filter((g) => ids.has(g.id)).map((g) =>
      `<span class="tag-chip" data-tag-chip="${escapeHtml(g.id)}"><span class="tag-dot" aria-hidden="true"${g.color ? ` style="background:${escapeHtml(g.color)}"` : ""}></span>🏷 ${escapeHtml(g.name)}</span>`).join("");
  }
  function rerenderNoteEverywhere(noteId) {
    for (const x of allViews()) if (x.noteId === noteId) renderView(x, { keepScroll: true });
  }
  let tagPicker = null;
  function closeTagPicker() { if (tagPicker) { tagPicker.el.remove(); tagPicker = null; } }
  function openTagPicker(note) {
    closeTagPicker();
    const tg = host.tagging;
    const el = document.createElement("div");
    el.className = "tag-picker";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", t("Tags"));
    el.innerHTML = `<div class="tag-picker-card">
        <div class="tag-picker-head"><strong>🏷 ${escapeHtml(t("Tags"))}</strong><button type="button" class="secondary tag-picker-close" data-tag-close aria-label="${escapeHtml(t("Close"))}">✕</button></div>
        <p class="note gate-note" data-tag-gate role="status" hidden>${escapeHtml(t("Tags switch on once the new Firebase Rules are published."))}</p>
        <p class="tag-picker-msg" data-tag-msg role="status" hidden></p>
        <input type="search" class="tag-picker-search" data-tag-search placeholder="${escapeHtml(t("Search tags"))}" aria-label="${escapeHtml(t("Search tags"))}">
        <div class="tag-picker-list" data-tag-list></div>
        <div class="tag-picker-new"><input type="text" maxlength="100" data-tag-new-name placeholder="${escapeHtml(t("New tag name"))}" aria-label="${escapeHtml(t("New tag name"))}"><button type="button" class="secondary" data-tag-new>＋ ${escapeHtml(t("New tag"))}</button></div>
      </div>`;
    document.body.appendChild(el);
    tagPicker = { el, noteId: note.noteId };
    const q = (sel) => el.querySelector(sel);
    const msg = (text) => { const m = q("[data-tag-msg]"); m.textContent = text || ""; m.hidden = !text; };
    const live = () => getNote(tagPicker?.noteId) ?? note;
    const paint = () => {
      const on = tg.ready();
      q("[data-tag-gate]").hidden = on;
      const needle = q("[data-tag-search]").value.trim().toLocaleLowerCase();
      const ids = new Set(tg.noteTagIds(live()));
      const rows = tg.tags().filter((g) => !needle || g.name.toLocaleLowerCase().includes(needle));
      q("[data-tag-list]").innerHTML = rows.length
        ? rows.map((g) => `<label class="tag-pick-row"><input type="checkbox" data-tag-pick="${escapeHtml(g.id)}" ${ids.has(g.id) ? "checked" : ""} ${on ? "" : "disabled"}><span class="tag-dot" aria-hidden="true"${g.color ? ` style="background:${escapeHtml(g.color)}"` : ""}></span><span class="tag-pick-name">${escapeHtml(g.name)}</span></label>`).join("")
        : `<p class="note">${escapeHtml(needle ? t("No tag matches that search.") : t("You have no tags yet. Type a name below to make one."))}</p>`;
      q("[data-tag-new-name]").disabled = !on;
      q("[data-tag-new]").disabled = !on;
    };
    tagPicker.paint = paint;
    const close = () => { closeTagPicker(); };
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-tag-close]")) close(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    q("[data-tag-search]").addEventListener("input", paint);
    q("[data-tag-list]").addEventListener("change", async (e) => {
      const box = e.target.closest("[data-tag-pick]");
      if (!box || !tg.ready()) return;
      msg("");
      box.disabled = true;
      try {
        if (box.checked) await tg.tag(live(), box.dataset.tagPick); else await tg.untag(live(), box.dataset.tagPick);
      } catch (err) { msg(err?.message || t("That did not save.")); }
      rerenderNoteEverywhere(tagPicker?.noteId ?? note.noteId);
      if (tagPicker) paint();
    });
    const create = async () => {
      if (!tg.ready()) return;
      const input = q("[data-tag-new-name]");
      const name = input.value.trim();
      if (!name) { msg(t("Type a name for the tag first.")); return; }
      msg("");
      try {
        const id = await tg.create(name);
        input.value = "";
        if (id) await tg.tag(live(), id);
      } catch (err) { msg(err?.message || t("That did not save.")); }
      rerenderNoteEverywhere(tagPicker?.noteId ?? note.noteId);
      if (tagPicker) paint();
    };
    q("[data-tag-new]").addEventListener("click", create);
    q("[data-tag-new-name]").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); create(); } });
    paint();
    q(tg.ready() ? "[data-tag-search]" : "[data-tag-close]").focus();
  }

  /** The sanitised body, with every H1-H4 turned into a collapsible section nested by level. Collapsed indexes come from (and go back to) localStorage, per Note. */
  function buildBody(v, note) {
    const host_ = v.el.querySelector("[data-pane-body]");
    const tmp = document.createElement("div");
    tmp.innerHTML = sanitizeNoteHtml(note.bodyHtml || "");
    host_.replaceChildren();
    const collapsed = loadCollapsed(note.noteId);
    const stack = [{ level: 0, el: host_ }];
    let index = 0;
    for (const node of [...tmp.childNodes]) {
      if (node.nodeType === 1 && /^H[1-4]$/.test(node.tagName)) {
        const level = Number(node.tagName[1]);
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const sec = document.createElement("section");
        sec.className = "note-sec";
        sec.dataset.secIndex = String(index);
        sec.dataset.level = String(level);
        sec.dataset.headingText = node.textContent.trim() || t("(untitled section)");
        const isCollapsed = collapsed.has(index);
        if (isCollapsed) sec.classList.add("collapsed");
        const h = document.createElement(node.tagName.toLowerCase());
        h.className = "note-sec-h";
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "note-sec-toggle"; btn.dataset.secToggle = String(index);
        btn.setAttribute("aria-expanded", String(!isCollapsed));
        const arrow = document.createElement("span"); arrow.className = "note-sec-arrow"; arrow.setAttribute("aria-hidden", "true"); arrow.textContent = isCollapsed ? "▶" : "▾";
        const text = document.createElement("span"); text.className = "note-sec-text";
        while (node.firstChild) text.appendChild(node.firstChild);
        if (!text.textContent.trim()) text.textContent = sec.dataset.headingText;
        btn.append(arrow, text);
        h.appendChild(btn);
        const body = document.createElement("div"); body.className = "note-sec-body";
        sec.append(h, body);
        stack[stack.length - 1].el.appendChild(sec);
        stack.push({ level, el: body });
        index++;
      } else {
        stack[stack.length - 1].el.appendChild(node);
      }
    }
  }

  // =====================================================================
  // READING TOOLS (S11): Find in this Note, open/close all headings, Versions,
  // and the tags half of 📎. Find marks and the fold state are device-side
  // display only; nothing here writes to the data layer except "Bring this
  // version back", which goes through the page's own save path.
  // =====================================================================
  const findBarOf = (v) => v.el.querySelector("[data-find-bar]");
  function clearFindMarks(v) {
    for (const m of v.bodyEl.querySelectorAll("mark.note-find-hit")) { const p = m.parentNode; m.replaceWith(document.createTextNode(m.textContent)); p.normalize(); }
    v.find = { marks: [], idx: -1 };
  }
  function paintFindCount(v) {
    const input = findBarOf(v).querySelector("[data-find-input]");
    const out = findBarOf(v).querySelector("[data-find-count]");
    const n = v.find?.marks.length ?? 0;
    out.textContent = !input.value.trim() ? "" : n ? t("{n} of {m}", { n: v.find.idx + 1, m: n }) : t("No matches");
    for (const sel of ["[data-find-prev]", "[data-find-next]"]) findBarOf(v).querySelector(sel).disabled = n < 1;
  }
  function stepFind(v, to, scroll = true) {
    const marks = v.find?.marks ?? [];
    if (!marks.length) { paintFindCount(v); return; }
    marks[v.find.idx]?.classList.remove("current");
    v.find.idx = ((to % marks.length) + marks.length) % marks.length;
    const m = marks[v.find.idx];
    m.classList.add("current");
    for (let sec = m.closest(".note-sec"); sec; sec = sec.parentElement?.closest(".note-sec")) { // show a hit that sits inside a folded heading, without saving the fold
      if (sec.classList.contains("collapsed")) {
        sec.classList.remove("collapsed");
        const tg = sec.querySelector(":scope > .note-sec-h [data-sec-toggle]");
        tg?.setAttribute("aria-expanded", "true");
        const ar = tg?.querySelector(".note-sec-arrow"); if (ar) ar.textContent = "▾";
      }
    }
    if (scroll) m.scrollIntoView({ block: "center" });
    paintFindCount(v);
  }
  function runFind(v, { keep = false } = {}) {
    const keepIdx = keep ? (v.find?.idx ?? 0) : 0;
    clearFindMarks(v);
    const q = findBarOf(v).querySelector("[data-find-input]").value.trim();
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
      const walker = document.createTreeWalker(v.bodyEl, NodeFilter.SHOW_TEXT);
      const nodes = [];
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.data.trim()) nodes.push(n);
      for (const node of nodes) {
        const text = node.data;
        const hits = [...text.matchAll(re)].filter((h) => h[0].length);
        if (!hits.length) continue;
        const frag = document.createDocumentFragment();
        let at = 0;
        for (const h of hits) {
          if (h.index > at) frag.appendChild(document.createTextNode(text.slice(at, h.index)));
          const mark = document.createElement("mark");
          mark.className = "note-find-hit"; mark.textContent = h[0];
          frag.appendChild(mark); v.find.marks.push(mark);
          at = h.index + h[0].length;
        }
        if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
        node.replaceWith(frag);
      }
    }
    if (v.find.marks.length) stepFind(v, Math.min(keepIdx, v.find.marks.length - 1), !keep); else paintFindCount(v);
  }
  function openFind(v) {
    if (v.ed) return;
    const bar = findBarOf(v);
    bar.hidden = false;
    const input = bar.querySelector("[data-find-input]");
    input.focus(); input.select();
    runFind(v);
  }
  function closeFind(v, { focus = true } = {}) {
    const bar = findBarOf(v);
    if (bar.hidden) return;
    clearFindMarks(v);
    bar.hidden = true;
    if (focus) v.el.querySelector("[data-pane-find-toggle]")?.focus();
  }
  /** One tap folds every heading section; when they are all folded already it opens them all. Stored the way a single fold is (per device). */
  function foldAll(v, note) {
    const secs = [...v.bodyEl.querySelectorAll(".note-sec")];
    if (!secs.length) return;
    const collapse = !secs.every((s) => s.classList.contains("collapsed"));
    const set = new Set();
    for (const sec of secs) {
      sec.classList.toggle("collapsed", collapse);
      const tg = sec.querySelector(":scope > .note-sec-h [data-sec-toggle]");
      tg?.setAttribute("aria-expanded", String(!collapse));
      const ar = tg?.querySelector(".note-sec-arrow"); if (ar) ar.textContent = collapse ? "▶" : "▾";
      if (collapse) set.add(Number(sec.dataset.secIndex));
    }
    saveCollapsed(note.noteId, set);
    renderPaneBar(v); fitPaneBarTwice(v);
  }

  const tsMillis = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.toDate ? ts.toDate().getTime() : ts instanceof Date ? ts.getTime() : Number(ts) || 0);
  const whenText = (ts) => { const ms = tsMillis(ts); return ms ? formatNoteTime(ms, host.dateLocale?.()) : t("(unknown time)"); };
  let versionsDlg = null;
  function closeVersions() { if (versionsDlg) { versionsDlg.remove(); versionsDlg = null; } }
  async function openVersions(v, note) {
    closeVersions();
    const el = document.createElement("div");
    el.className = "tag-picker note-versions";
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", t("Versions"));
    el.innerHTML = `<div class="tag-picker-card">
        <div class="tag-picker-head"><strong>🕘 ${escapeHtml(t("Versions"))}</strong><button type="button" class="secondary tag-picker-close" data-ver-close aria-label="${escapeHtml(t("Close"))}">✕</button></div>
        <p class="tag-picker-msg" data-ver-msg role="alert" hidden></p>
        <div class="note-ver-body" data-ver-body></div>
      </div>`;
    document.body.appendChild(el);
    versionsDlg = el;
    const q = (sel) => el.querySelector(sel);
    const msg = (text) => { const m = q("[data-ver-msg]"); m.textContent = text || ""; m.hidden = !text; };
    const close = () => { closeVersions(); };
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    let rows = [];
    const live = () => getNote(note.noteId) ?? note;
    const showList = () => {
      msg("");
      const cur = live().currentRevisionId;
      q("[data-ver-body]").innerHTML = rows.length
        ? `<ul class="note-ver-list">${rows.map((r, i) => `<li><button type="button" class="secondary note-ver-row" data-ver-open="${i}"><span class="note-ver-when">${escapeHtml(whenText(r.createdAt))}</span>${(r.revisionId ?? r.id) === cur ? `<span class="note-ver-cur">${escapeHtml(t("Current"))}</span>` : ""}<span class="note-ver-title">${escapeHtml(r.title?.trim() || t("(untitled)"))}</span></button></li>`).join("")}</ul>`
        : `<p class="note">${escapeHtml(t("This Note has no earlier versions to show."))}</p>`;
      q("[data-ver-body] button")?.focus();
    };
    q("[data-ver-close]").addEventListener("click", close);
    el.addEventListener("click", async (e) => {
      if (e.target === el) { close(); return; }
      const openBtn = e.target.closest("[data-ver-open]");
      if (openBtn) {
        const r = rows[Number(openBtn.dataset.verOpen)];
        const isCur = (r.revisionId ?? r.id) === live().currentRevisionId;
        const canBack = host.canEdit() && !v.ed && !isCur && !!host.versions.restore;
        q("[data-ver-body]").innerHTML = `<div class="note-ver-detail">
            <p class="note-pane-meta">${escapeHtml(whenText(r.createdAt))}${isCur ? ` · ${escapeHtml(t("Current"))}` : ""}</p>
            <h3 class="note-ver-h" data-ver-title>${escapeHtml(r.title?.trim() || t("(untitled)"))}</h3>
            <div class="note-ver-text" data-ver-text></div>
            <div class="note-ver-actions"><button type="button" class="secondary" data-ver-list>← ${escapeHtml(t("All versions"))}</button>${canBack ? `<button type="button" data-ver-restore="${Number(openBtn.dataset.verOpen)}">${escapeHtml(t("Bring this version back"))}</button>` : ""}</div>
            ${host.canEdit() && v.ed && !isCur ? `<p class="note">${escapeHtml(t("Press Done on the Note first, then bring a version back."))}</p>` : ""}
          </div>`;
        q("[data-ver-text]").innerHTML = sanitizeNoteHtml(r.bodyHtml || "");
        q("[data-ver-list]").focus();
        return;
      }
      if (e.target.closest("[data-ver-list]")) { showList(); return; }
      const back = e.target.closest("[data-ver-restore]");
      if (back) {
        const r = rows[Number(back.dataset.verRestore)];
        const n = live();
        back.disabled = true; msg("");
        try {
          const newId = await host.versions.restore(n, r);
          Object.assign(n, { title: r.title, bodyHtml: r.bodyHtml, currentRevisionId: newId, updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() } });
          host.afterRevise(n);
          rerenderNoteEverywhere(n.noteId);
          close();
          host.status(t("That version was brought back as a new version. The earlier ones are all still in the list."));
        } catch (err) {
          back.disabled = false;
          msg(err?.message === "Stale Note revision." ? t("This Note changed on another device. Reload it, then try again.") : (err?.message || t("That did not save.")));
        }
      }
    });
    q("[data-ver-body]").innerHTML = `<p class="note" role="status">${escapeHtml(t("Loading versions…"))}</p>`;
    try {
      rows = (await host.versions.list(note)).slice().sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    } catch (err) {
      console.error("[note versions]", err);
      q("[data-ver-body]").innerHTML = "";
      msg(t("Could not load the versions. Try again in a moment."));
      return;
    }
    if (versionsDlg === el) showList();
  }

  /** The tags half of 📎 (S11): tick/untick the owner's tags and add a new one, inside `container`. Same host.tagging calls as the 🏷 picker. */
  function mountTags(container, noteId) {
    const tg = host.tagging;
    if (!tg) return null;
    container.innerHTML = `<h3 class="at-head">🏷 ${escapeHtml(t("Tags"))}</h3>
      <p class="note gate-note" data-at-gate role="status" hidden>${escapeHtml(t("Tags switch on once the new Firebase Rules are published."))}</p>
      <p class="tag-picker-msg" data-at-msg role="alert" hidden></p>
      <div class="at-list" data-at-list></div>
      <div class="tag-picker-new"><input type="text" maxlength="100" data-at-new-name placeholder="${escapeHtml(t("New tag name"))}" aria-label="${escapeHtml(t("New tag name"))}"><button type="button" class="secondary" data-at-new>＋ ${escapeHtml(t("New tag"))}</button></div>`;
    const q = (sel) => container.querySelector(sel);
    const live = () => getNote(noteId);
    const msg = (text) => { const m = q("[data-at-msg]"); m.textContent = text || ""; m.hidden = !text; };
    const paint = () => {
      const on = tg.ready();
      q("[data-at-gate]").hidden = on;
      const ids = new Set(tg.noteTagIds(live()));
      const all = tg.tags();
      q("[data-at-list]").innerHTML = all.length
        ? all.map((g) => `<label class="tag-pick-row"><input type="checkbox" data-at-pick="${escapeHtml(g.id)}" ${ids.has(g.id) ? "checked" : ""} ${on ? "" : "disabled"}><span class="tag-dot" aria-hidden="true"${g.color ? ` style="background:${escapeHtml(g.color)}"` : ""}></span><span class="tag-pick-name">${escapeHtml(g.name)}</span></label>`).join("")
        : `<p class="note">${escapeHtml(t("You have no tags yet. Type a name below to make one."))}</p>`;
      q("[data-at-new-name]").disabled = !on; q("[data-at-new]").disabled = !on;
    };
    q("[data-at-list]").addEventListener("change", async (e) => {
      const box = e.target.closest("[data-at-pick]");
      if (!box || !tg.ready()) return;
      msg(""); box.disabled = true;
      try { if (box.checked) await tg.tag(live(), box.dataset.atPick); else await tg.untag(live(), box.dataset.atPick); }
      catch (err) { msg(err?.message || t("That did not save.")); }
      rerenderNoteEverywhere(noteId);
      paint();
    });
    const create = async () => {
      if (!tg.ready()) return;
      const input = q("[data-at-new-name]");
      const name = input.value.trim();
      if (!name) { msg(t("Type a name for the tag first.")); return; }
      msg("");
      try { const id = await tg.create(name); input.value = ""; if (id) await tg.tag(live(), id); }
      catch (err) { msg(err?.message || t("That did not save.")); }
      rerenderNoteEverywhere(noteId);
      paint();
    };
    q("[data-at-new]").addEventListener("click", create);
    q("[data-at-new-name]").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); create(); } });
    paint();
    return { paint };
  }

  function renderView(v, { keepScroll = false } = {}) {
    const note = getNote(v.noteId);
    if (!note) return;
    const before = v.scrollEl.scrollTop;
    v.el.querySelector("[data-pane-title]").textContent = noteTitleOf(note);
    v.el.querySelector("[data-pane-meta]").textContent = paneMetaText(note);
    v.el.querySelector("[data-pane-chips]").innerHTML = (host.chips?.(note) ?? []).map((f) =>
      `<button type="button" class="folder-chip" data-pane-chip="${escapeHtml(f.id)}">📁 ${escapeHtml(f.label)}</button>`).join("") + tagChipsHtml(note);
    // While an edit is open the editor IS the body: a re-render must never wipe the reader's typing.
    if (!(v.ed && v.ed.noteId === note.noteId)) { showReadChrome(v, note); buildBody(v, note); if (!findBarOf(v).hidden) runFind(v, { keep: true }); }
    if (v.kind === "window") { v.win.querySelector(".nw-title").textContent = noteTitleOf(note); v.win.dataset.noteId = note.noteId; updateWindowSwitcher(); }
    renderPaneBar(v);
    fitPaneBarTwice(v);
    if (keepScroll) v.scrollEl.scrollTop = before;
  }

  function step(v, direction) {
    const { prev, next } = neighbours(v);
    const target = direction < 0 ? prev : next;
    if (!target) return;
    if (v.ed) endEdit(v);
    v.noteId = target;
    renderView(v);
    if (v.kind === "pane" && host.paneTier() === "narrow") host.scroller().scrollTop = 0; else v.scrollEl.scrollTop = 0;
  }

  async function onViewClick(v, e) {
    const on = (sel) => e.target.closest(sel);
    const note = getNote(v.noteId);
    if (!note) return;
    if (on("[data-pane-edit-toggle]")) {
      closeAllBarPalettes(null);
      if (!v.ed) { if (host.canEdit()) { host.onEditStart?.(v, note); startEdit(v, note); } return; }
      const done = await endEdit(v);
      await host.onEditDone?.(v, note); // S10: ticks staged in the folder picker are written now, with the edit
      renderView(v, { keepScroll: true });
      if (done?.conflict) await host.refresh(); // show what the other device wrote; the draft is offered back
      return;
    }
    const cmdBtn = on("[data-edit-toolbar] [data-cmd]");
    if (cmdBtn) { closeAllBarPalettes(null); runEditCommand(v, cmdBtn.dataset.cmd); return; }
    if (v.ed) { // S12: the editor's panel and heading controls
      if (on("[data-panel-close]")) { closePanel(v); editBodyEl(v)?.focus(); return; }
      if (on("[data-panel-apply]")) { applyLink(v); return; }
      if (on("[data-panel-unlink]")) { removeLink(v); return; }
      if (on("[data-table-insert]")) { insertTable(v); return; }
      const top = on("[data-table-op]"); if (top) { tableOp(v, top.dataset.tableOp); return; }
      const sw = on("[data-swatch]"); if (sw) { applySwatch(v, sw.dataset.swatch, sw.dataset.swatchMode); return; }
      const fb = on("[data-sec-fold]"); if (fb) { toggleFold(v, fb.__h); return; }
    }
    if (on("[data-draft-restore]")) { const d = loadDraft(note.noteId); if (d && host.canEdit()) startEdit(v, note, d); return; }
    if (on("[data-draft-discard]")) { clearDraft(note.noteId); v.draftOfferEl.hidden = true; return; }
    if (on("[data-pane-back]")) { closePane(); return; }
    if (on("[data-pane-new]")) { host.newNote?.(); return; }
    if (on("[data-pane-prev]")) { closeAllBarPalettes(null); step(v, -1); return; }
    if (on("[data-pane-next]")) { closeAllBarPalettes(null); step(v, 1); return; }
    if (on("[data-win-details]")) { const d = v.win.querySelector(".nw-details"); const open = d.classList.toggle("open"); on("[data-win-details]").setAttribute("aria-expanded", String(open)); return; }
    if (on("[data-pane-popout]")) { closeAllBarPalettes(null); popOutPane(note); return; }
    if (on("[data-pane-find-toggle]")) { closeAllBarPalettes(null); if (findBarOf(v).hidden) openFind(v); else closeFind(v); return; }
    if (on("[data-find-prev]")) { stepFind(v, v.find.idx - 1); return; }
    if (on("[data-find-next]")) { stepFind(v, v.find.idx + 1); return; }
    if (on("[data-find-close]")) { closeFind(v); return; }
    if (on("[data-pane-foldall]")) { closeAllBarPalettes(null); foldAll(v, note); return; }
    if (on("[data-pane-attach]")) { closeAllBarPalettes(null); host.attach?.(v, note); return; }
    if (on("[data-pane-versions]")) { closeAllBarPalettes(null); openVersions(v, note); return; }
    if (on("[data-pane-tags]")) { closeAllBarPalettes(null); openTagPicker(note); return; }
    const chip = on("[data-pane-chip]");
    if (chip) { host.onChip?.(v, chip.dataset.paneChip); return; }
    const toggle = on("[data-sec-toggle]");
    if (toggle) {
      const sec = toggle.closest(".note-sec");
      const nowCollapsed = !sec.classList.contains("collapsed");
      sec.classList.toggle("collapsed", nowCollapsed);
      toggle.setAttribute("aria-expanded", String(!nowCollapsed));
      toggle.querySelector(".note-sec-arrow").textContent = nowCollapsed ? "▶" : "▾";
      const set = loadCollapsed(note.noteId);
      if (nowCollapsed) set.add(Number(sec.dataset.secIndex)); else set.delete(Number(sec.dataset.secIndex));
      saveCollapsed(note.noteId, set);
      return;
    }
    const jump = on("[data-pane-jump]");
    if (jump) {
      closeAllBarPalettes(null);
      const sec = v.el.querySelector(`.note-sec[data-sec-index="${CSS.escape(jump.dataset.paneJump)}"]`);
      for (let up = sec?.parentElement?.closest(".note-sec"); up; up = up.parentElement?.closest(".note-sec")) {
        if (up.classList.contains("collapsed")) up.querySelector(":scope > .note-sec-h [data-sec-toggle]")?.click();
      }
      if (sec?.classList.contains("collapsed")) sec.querySelector(":scope > .note-sec-h [data-sec-toggle]")?.click();
      sec?.scrollIntoView({ block: "start" });
      return;
    }
    if (host.onMenu?.(v, note, on)) closeAllBarPalettes(null);
  }

  /** After every full load: close any view whose Note left (Trash, or gone) and keep the rest honest (chips, ⋯ items). */
  function sync() {
    if (tagPicker && (!getNote(tagPicker.noteId) || host.isRetired(getNote(tagPicker.noteId)))) closeTagPicker();
    else tagPicker?.paint?.();
    for (const v of allViews()) {
      if (v.noteId === null) continue;
      const note = getNote(v.noteId);
      if (!note || host.isRetired(note)) { closeView(v); continue; }
      renderView(v, { keepScroll: true });
    }
  }

  // =====================================================================
  // Note POP-UP WINDOWS. Single: the pane's ⋯ → Pop out. Multi: a Note row's
  // Open in window, or Ctrl/⌘-click on a title. The window holds the SAME view
  // (makeView) as the pane. Shape by the DOCUMENT's width (one function,
  // windowTier): below 640px a near-full-screen sheet (no drag; a bottom
  // switcher when several are open), 640px and up a draggable, resizable
  // window. Geometry is per device (and per page), in localStorage.
  // =====================================================================
  const windowTier = () => (document.documentElement.clientWidth < WIN_SHEET_BELOW ? "sheet" : "float");
  { const st = document.createElement("style"); st.textContent = handleCss("nw-h"); document.head.appendChild(st); }
  let winOrder = []; // back to front
  function loadWinRect() {
    try { const r = JSON.parse(localStorage.getItem(host.winKey) || "null"); if (r && [r.x, r.y, r.w, r.h].every(Number.isFinite)) return r; } catch { /* unreadable: default */ }
    return null;
  }
  function saveWinRect(r) { try { localStorage.setItem(host.winKey, JSON.stringify(r)); } catch { /* private mode */ } }
  function defaultWinRect() {
    const w = Math.min(520, window.innerWidth - 40), h = Math.min(620, window.innerHeight - 60);
    return { x: Math.round((window.innerWidth - w) / 2), y: Math.round((window.innerHeight - h) / 2), w, h };
  }
  function applyWindowGeometry(v) {
    const sheet = windowTier() === "sheet";
    const top = winOrder[winOrder.length - 1] === v;
    v.win.classList.toggle("sheet", sheet);
    v.win.classList.toggle("sheet-hidden", sheet && !top);
    v.win.style.zIndex = String(WIN_Z + winOrder.indexOf(v));
    if (sheet) { for (const p of ["left", "top", "width", "height"]) v.win.style.removeProperty(p); return; }
    v.rect = clampRect(v.rect, WIN_LIMITS);
    Object.assign(v.win.style, { left: `${v.rect.x}px`, top: `${v.rect.y}px`, width: `${v.rect.w}px`, height: `${v.rect.h}px` });
  }
  function layoutWindows() {
    for (const v of windowViews) applyWindowGeometry(v);
    updateWindowSwitcher();
  }
  function bringToFront(v) {
    if (winOrder[winOrder.length - 1] !== v) { winOrder = winOrder.filter((x) => x !== v); winOrder.push(v); layoutWindows(); }
  }
  function focusView(v) {
    if (v.kind === "window") { bringToFront(v); v.win.focus({ preventScroll: true }); }
    else { v.el.scrollIntoView?.({ block: "nearest" }); v.el.focus?.({ preventScroll: true }); }
  }
  /** The bottom switcher: only on a sheet, only with more than one window open. */
  function updateWindowSwitcher() {
    let nav = document.getElementById("noteWinSwitch");
    const show = windowTier() === "sheet" && windowViews.length > 1;
    document.documentElement.style.setProperty("--nw-switch", show ? `${WIN_SWITCH_H}px` : "0px");
    if (!show) { nav?.remove(); return; }
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "noteWinSwitch";
      nav.className = "nw-switch";
      nav.addEventListener("click", (e) => {
        const b = e.target.closest("[data-win-switch]");
        const v = b && windowViews.find((x) => x.uid === b.dataset.winSwitch);
        if (v) focusView(v);
      });
      document.body.appendChild(nav);
    }
    nav.setAttribute("aria-label", t("Open notes"));
    const top = winOrder[winOrder.length - 1];
    nav.innerHTML = windowViews.map((v) => {
      const note = getNote(v.noteId);
      return `<button type="button" class="secondary nw-switch-btn${v === top ? " active" : ""}" data-win-switch="${escapeHtml(v.uid)}" aria-pressed="${v === top}">${escapeHtml(note ? noteTitleOf(note) : "")}</button>`;
    }).join("");
  }

  /** Open `noteId` in its own window -- or, if that Note is already open anywhere, focus THAT one: a Note is never live in two editors (§4.6). */
  function openWindow(noteId, from = {}) {
    const note = getNote(noteId);
    if (!note || host.isRetired(note)) return null;
    const existing = viewShowing(noteId);
    if (existing) { focusView(existing); return existing; }
    const win = document.createElement("div");
    win.className = "note-win";
    win.tabIndex = -1;
    win.setAttribute("role", "dialog");
    win.innerHTML = `<div class="nw-bar"><span class="nw-title"></span><button type="button" class="nw-close" data-win-close></button></div>`;
    const closeBtn = win.querySelector("[data-win-close]");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", t("Close"));
    closeBtn.title = t("Close");
    const section = proto.cloneNode(true);
    section.removeAttribute("id");
    section.hidden = false;
    section.className = "nw-view";
    const q = (sel) => section.querySelector(sel);
    const detailsRow = document.createElement("div");
    detailsRow.className = "nw-details-row";
    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "secondary nw-details-btn";
    detailsBtn.dataset.winDetails = "";
    detailsBtn.setAttribute("aria-expanded", "false");
    detailsBtn.textContent = `${t("Details")} ▾`;
    const details = document.createElement("div");
    details.className = "nw-details";
    details.append(q("[data-pane-meta]"), q("[data-pane-chips]"));
    detailsRow.append(detailsBtn, details);
    const scroll = document.createElement("div");
    scroll.className = "nw-scroll";
    scroll.dataset.winScroll = "";
    scroll.append(q("[data-pane-title]"), q("[data-edit-title]"), q("[data-draft-offer]"), q("[data-pane-body]"));
    section.append(detailsRow, q("[data-edit-toolbar]"), q("[data-edit-status]"), scroll);
    win.appendChild(section);
    const v = makeView(section, "window");
    v.win = win;
    v.noteId = noteId;
    v.order = from.order ?? (from.fromEl ? host.orderFrom(from.fromEl) : [noteId]);
    v.folderId = from.folderId ?? (from.fromEl ? host.folderFrom(from.fromEl) : null);
    const base = loadWinRect() ?? defaultWinRect();
    const n = windowViews.length;
    v.rect = clampRect({ ...base, x: base.x + WIN_OFFSET * n, y: base.y + WIN_OFFSET * n }, WIN_LIMITS);
    const ctx = {
      getRect: () => v.rect, setRect: (r) => { v.rect = r; applyWindowGeometry(v); }, locked: () => windowTier() === "sheet",
      limits: WIN_LIMITS, onEnd: () => saveWinRect(v.rect), dragClass: "jt-dragging",
    };
    const bar = win.querySelector(".nw-bar");
    bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-win-close]")) startDrag(e, "move", ctx); });
    for (const h of HANDLES) {
      const d = document.createElement("div");
      d.className = "nw-h";
      d.dataset.h = h;
      d.addEventListener("pointerdown", (e) => startDrag(e, h, ctx));
      win.appendChild(d);
    }
    win.addEventListener("pointerdown", () => bringToFront(v), true);
    closeBtn.addEventListener("click", () => closeNoteWindow(v));
    win.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || win.querySelector(".bar-palette.open")) return;
      closeNoteWindow(v);
    });
    document.body.appendChild(win);
    windowViews.push(v);
    winOrder.push(v);
    layoutWindows();
    renderView(v);
    win.focus({ preventScroll: true });
    return v;
  }
  /** Closing a window flushes its edit like every other way out. */
  function closeNoteWindow(v) {
    if (!windowViews.includes(v)) return;
    if (v.ed) endEdit(v);
    closeAllBarPalettes(null);
    v.win.remove();
    windowViews.splice(windowViews.indexOf(v), 1);
    winOrder = winOrder.filter((x) => x !== v);
    layoutWindows();
  }
  /** Single: the pane becomes a window. A pending edit is flushed FIRST (one revision, if changed), then the window opens. */
  async function popOutPane(note) {
    const v = paneView;
    const order = v.order.slice(), folderId = v.folderId;
    await endEdit(v);
    closePane({ flush: false });
    openWindow(note.noteId, { order, folderId });
  }

  return { paneView, windowViews, allViews, viewShowing, openPane, closePane, closeView, openWindow, endEdit, flushActiveEdit, sync, renderView, focusView, windowTier, mountTags };
}
