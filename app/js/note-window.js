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

import { t, num } from "./i18n.js";
import { sanitizeNoteHtml, isSafeNoteHref, NOTE_STATUS_COLOURS, NOTE_ANN_TEXT_MAX, NOTE_STATUS_LABEL_MAX } from "./note-sanitize.js";
import { isOn as previewsOn, setOn as setPreviewsOn, pickLinks, loadPreview, hostOf } from "./note-link-preview.js";
import { closeAllBarPalettes } from "./bar-palette.js";
import { sheetInsertHtml, mountSheets } from "./note-sheet-ui.js";
import { headingStyleCss, PALETTE, LIMITS as SETTING_LIMITS, cleanText as cleanSettingText } from "./note-user-settings.js";
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
        <button type="button" class="secondary pane-btn pane-multi" data-pane-popout data-pane-multi hidden>⧉</button>
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
      <button type="button" class="secondary tiny nw-ver-btn" data-win-ver hidden></button>
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
const WIN_PANEL_SIDE_MIN = 560; // narrower than this, the pinned panel slides over the Note instead of sitting beside it
const LONG_PRESS_MS = 550;

function loadCollapsedLocal(noteId) {
  try { const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY(noteId)) || "[]"); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
}
function saveCollapsedLocal(noteId, set) {
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
 *   flags?             Siyagah round 14 (decision 66): Pin / Favourite / Archive / Finalise and links between Notes. Absent = none of it.
 *                      { ready()  true once the round 14 Rules are published (until then the controls show, say so, and write nothing),
 *                        on(note, key)  is `pinned|favourite|archived|finalised` true on this Note,
 *                        set(note, key, value) -> Promise  (the page writes ONLY the flag; shut, it says so and resolves false),
 *                        linksOut(note) / linksIn(note)  [{ linkId, noteId, title }] active links from / to the Note (a Note not in Trash),
 *                        candidates(note, needle)  [{ noteId, title }] Notes that can be linked to,
 *                        link(note, toNoteId) / unlink(note, linkId) -> Promise,
 *                        open(noteId)  show that Note, pinned() [{ noteId, title }] the pinned Notes }
 *   menuMid(v, note)   extra ⋯ items for the Note's owner, HTML
 *   menuEnd(v, note)   extra ⋯ items at the end, HTML
 *   onMenu(v, note, on)  handle a click on one of those items; true when handled
 *   onEditStart?(v, note) / onEditDone?(v, note)  S10: an edit opens / Done was pressed (the page writes what it staged)
 *   attach?(v, note)   S11: when given (the owner only), the bar shows a 📎 that opens the page's folders-and-tags sheet
 *   versions?          S11 (never a new field): { list(note) -> Promise<[{ id, title, bodyHtml, createdAt, reason }]> newest first,
 *                        restore(note, rev) -> Promise  (saves rev as a NEW revision through the page's own save path) }
 *   newNote?(v)        S8: when given, the bar shows a ✚ (the owner only; pane and windows) that calls it with its view
 *   copyNote?(note)    note-pane round 2 (item 15): when given, ⋯ shows Make a copy. The page writes a NEW Note with the
 *                      same text, filed where the original is filed, and resolves with its noteId (null when refused).
 *   orderFrom(el), folderFrom(el)   the ‹ › order / folder of the row a Note was opened from
 *   paneTier(), paneApply(), scroller()   the inline pane's layout (pane only)
 * }
 */
export function createNoteViews(host) {
  const getNote = (id) => host.notes().find((n) => n.noteId === id);
  // Part C3 (decisions 72, 80): the folds, heading styles, phrases, templates and tab groups follow the person across devices.
  // `host.settings()` is the page's store (userPrefs/{uid}.mmsaNotes) or null; it is read ONCE, when a Note first shows -- never at startup (I9).
  const S = () => host.settings?.() ?? null;
  const loadCollapsed = (noteId) => (S() ? S().foldsFor(noteId) : loadCollapsedLocal(noteId));
  const saveCollapsed = (noteId, set) => {
    const store = S();
    if (!store) { saveCollapsedLocal(noteId, set); return; }
    store.setFold(noteId, [...set]).catch((err) => host.status(t("Your folded sections could not be saved to your account: {why}", { why: err?.message || String(err) })));
  };
  let settingsOpened = false, headingStyleEl = null;
  function paintHeadingStyles() {
    const store = S();
    if (!store) return;
    if (!headingStyleEl) { headingStyleEl = document.createElement("style"); headingStyleEl.dataset.mmsaHeadingStyles = ""; document.head.appendChild(headingStyleEl); }
    headingStyleEl.textContent = headingStyleCss(store.get().headingStyles);
  }
  function ensureSettings() {
    const store = S();
    if (!store) return;
    paintHeadingStyles();
    if (settingsOpened) return;
    settingsOpened = true;
    store.open().then(() => {
      paintHeadingStyles();
      for (const x of allViews()) if (x.noteId !== null && !x.ed && getNote(x.noteId)) renderView(x, { keepScroll: true });
    }).catch(() => {});
  }
  const notePane = host.paneEl ?? null;
  const proto = document.createElement("section");
  proto.innerHTML = NOTE_VIEW_HTML;
  if (notePane) notePane.innerHTML = NOTE_VIEW_HTML;
  let viewSeq = 0;
  let paneListScroll = 0;

  /** Note-pane round 2 (items 16, 17): right-click, or a long press on a touch screen, on the title starts editing;
   *  on a heading in the read view it offers 📋 Copy section. `el` is the pane, or a window's whole frame. */
  function wirePress(v, el) {
    el.addEventListener("contextmenu", (ev) => { if (pressAction(v, ev.target, ev.clientX, ev.clientY)) ev.preventDefault(); });
    el.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "touch" || !pressTarget(v, ev.target)) return;
      clearTimeout(v.press?.timer);
      const press = { x: ev.clientX, y: ev.clientY, target: ev.target };
      press.timer = setTimeout(() => { if (pressAction(v, press.target, press.x, press.y)) v.swallowClickUntil = Date.now() + 800; }, LONG_PRESS_MS);
      v.press = press;
    });
    const cancelPress = (ev) => { if (v.press && (ev.type !== "pointermove" || Math.hypot(ev.clientX - v.press.x, ev.clientY - v.press.y) > 10)) { clearTimeout(v.press.timer); v.press = null; } };
    for (const type of ["pointerup", "pointercancel", "pointermove"]) el.addEventListener(type, cancelPress);
    el.addEventListener("click", (ev) => { if (v.swallowClickUntil && Date.now() < v.swallowClickUntil) { v.swallowClickUntil = 0; ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  }
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
      else if (ev.target.matches?.("[data-panel-ann-text]") && ev.key === "Enter") { ev.preventDefault(); applyAnnotation(v); }
      else if (ev.target.closest?.("[data-edit-panel]") && ev.key === "Escape") { ev.stopPropagation(); closePanel(v); editBodyEl(v)?.focus(); }
      // Note-pane round 2 (item 20): Esc in the text, the title or the toolbar ends editing, the same as ✓ Done.
      else if (ev.key === "Escape" && v.ed && ev.target.closest?.("[data-edit-body], [data-edit-title], [data-edit-toolbar]")) { ev.preventDefault(); ev.stopPropagation(); finishEdit(v); }
    });
    if (kind === "pane") wirePress(v, el); // a window wires its whole frame instead (its title is on the bar)
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
  const folderWins = []; // the Owner, 5 Oct 2026: a folder in its own window (host.folders)
  const allWins = () => [...windowViews, ...folderWins];
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
      if (note) { v.el.querySelector("[data-pane-meta]").textContent = paneMetaText(note); paintVersionLine(v, note); }
    }
    host.afterRevise(note);
    if (e.again) { e.again = false; flushEdit(e); }
  }
  /** Every way out of the editor: detach the session, then flush it. Resolves with the session once the write has settled. */
  async function endEdit(v) {
    const e = v.ed;
    if (!e) return null;
    closeMention(v);
    hideAnnBubble(v);
    const cur = readEditor(v);
    v.ed = null;
    e.ro?.disconnect();
    e.sheetObs?.disconnect();
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
  // The Owner, 5 Oct 2026 ("add all functions of the notepane of Siyagah"): H4, ¶ Normal, raise / lower a
  // heading, text size, spacing, mark done, a box, a divider and Justify joined the row. "|" draws a thin
  // line between groups (text · headings · paragraph · insert · undo), as Siyagah's palettes group them.
  const TOOLS = [
    ["bold", "Bold", "<b>B</b>"], ["italic", "Italic", "<i>I</i>"], ["underline", "Underline", "<u>U</u>"], ["strike", "Strikethrough", "<s>S</s>"],
    ["color", "Text colour", "<span class=\"tb-swatch-a\">A</span>"], ["highlight", "Highlight", "<span class=\"tb-swatch-hl\">A</span>"],
    ["bigger", "Bigger text", "A+"], ["smaller", "Smaller text", "A−"], ["done", "Mark done", "✓"], ["clear", "Clear formatting", "⌫"], "|",
    ["h1", "Heading 1", "H1"], ["h2", "Heading 2", "H2"], ["h3", "Heading 3", "H3"], ["h4", "Heading 4", "H4"], ["para", "Normal text", "¶"],
    ["hup", "Raise the heading (Ctrl+[)", "▲H"], ["hdown", "Lower the heading (Ctrl+])", "▼H"], "|",
    ["ul", "Bullet list", "•"], ["ol", "Numbered list", "1."], ["check", "Checklist", "☑"], ["quote", "Quote", "❝"],
    ["left", "Align left", "⇤"], ["center", "Align centre", "↔"], ["right", "Align right", "⇥"], ["justify", "Justify", "☰"], ["spacing", "Spacing", "↕"], "|",
    ["link", "Link", "🔗"], ["table", "Table", "▦"], ["sheet", "Insert a spreadsheet", "⊞"], ["divider", "Divider line", "─"], ["box", "Box around the paragraph", "▢"], ["annotate", "Comment on the selected text", "💬"], ["phrases", "Quick phrases", "📝"], "|",
    ["undo", "Undo", "↶"], ["redo", "Redo", "↷"],
  ];
  /** Text sizes the A+ / A− steps walk through (em); 1 is normal. The sanitiser allows exactly these. */
  const TEXT_SIZES = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.8];
  const LINE_HEIGHTS = [["", "Normal"], ["1.2", "Tight"], ["1.5", "Roomy"], ["2", "Double"]];
  const PARA_SPACES = [["", "Normal"], ["0", "None"], ["0.5em", "Small"], ["1em", "Medium"], ["1.5em", "Large"]];
  // Fixed palettes: dark text colours and pale highlights, all readable on the white Note page (palette-contrast checks them).
  const TEXT_COLOURS = [["#B3261E", "Red"], ["#1F3A6E", "Navy"], ["#1B6E3C", "Green"], ["#6A3FA0", "Purple"], ["#7A4B00", "Brown"], ["#006A6A", "Teal"]];
  const HIGHLIGHTS = [["#FFF59D", "Yellow"], ["#C8E6C9", "Light green"], ["#BBDEFB", "Light blue"], ["#F8BBD0", "Pink"], ["#E1BEE7", "Lavender"], ["#FFE0B2", "Orange"]];
  const isHeadingEl = (n) => n?.nodeType === 1 && /^H[1-4]$/.test(n.tagName);

  // Note-pane round 4 (item 28): on a narrow Note the toolbar shows five labelled groups (Siyagah's palettes); the
  // chosen group's tools sit under them, so nothing scrolls sideways. A wide Note keeps the one row.
  const TOOL_GROUPS = [["Aa", "Text"], ["H", "Headings"], ["≡", "Paragraph"], ["+", "Insert"], ["↺", "Undo"]];
  const TOOLBAR_GROUPED_BELOW = 600;
  function renderEditToolbar(v) {
    const label = (k) => escapeHtml(t(k));
    let g = 0;
    v.tbOpen = v.tbOpen ?? 0;
    v.editToolbarEl.innerHTML = `<div class="tb-tabs" data-tb-tabs role="tablist" aria-label="${label("Formatting")}">${TOOL_GROUPS.map(([icon, name], k) =>
      `<button type="button" class="secondary tb-tab" role="tab" data-tb-tab="${k}" aria-selected="${k === v.tbOpen}">${icon} ${label(name)}</button>`).join("")}</div>`
      + TOOLS.filter((x) => x[0] !== "phrases" || S()).map((x) => x === "|" ? (g++, `<span class="tb-sep" aria-hidden="true"></span>`)
      : `<button type="button" class="secondary tb-btn" data-cmd="${x[0]}" data-tb-g="${g}" aria-label="${label(x[1])}" title="${label(x[1])}">${x[2]}</button>`).join("");
    v.editToolbarEl.setAttribute("role", "toolbar");
    v.editToolbarEl.setAttribute("aria-label", t("Formatting"));
    fitToolbar(v);
  }
  function fitToolbar(v) {
    const tb = v.editToolbarEl;
    if (!tb || tb.hidden || !v.ed) return;
    const width = (v.bodyEl.clientWidth || v.el.clientWidth);
    const grouped = width > 0 && width < TOOLBAR_GROUPED_BELOW;
    tb.classList.toggle("tb-grouped", grouped);
    for (const b of tb.querySelectorAll("[data-tb-g]")) b.classList.toggle("tb-on", Number(b.dataset.tbG) === v.tbOpen);
    for (const b of tb.querySelectorAll("[data-tb-tab]")) b.setAttribute("aria-selected", String(Number(b.dataset.tbTab) === v.tbOpen));
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
  function closePanel(v) { v.editPanelEl.hidden = true; v.editPanelEl.replaceChildren(); v.editPanelEl.dataset.mode = ""; if (v.ed) v.ed.pendingPaste = null; }
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
        <button type="button" class="secondary tb-btn tb-text" data-table-op="delCol">${label("Remove column")}</button></div>
        <div class="pane-panel-row">
        <button type="button" class="secondary tb-btn tb-text" data-table-op="sum">Σ ${label("Total of this column")}</button>
        <button type="button" class="secondary tb-btn tb-text" data-table-op="sortAsc">${label("Sort by this column")} ↑</button>
        <button type="button" class="secondary tb-btn tb-text" data-table-op="sortDesc">${label("Sort by this column")} ↓</button>${close}</div>${msg}`;
    } else if (mode === "paste") {
      const p = v.ed?.pendingPaste;
      P.innerHTML = `<div class="pane-panel-row" role="group" aria-label="${label("Paste as")}"><span class="pane-panel-label">${label(p?.kind === "url" ? "Paste the web address as" : "The pasted text has formatting")}</span>
        ${p?.kind === "url" ? `<button type="button" class="tb-btn tb-text" data-paste-choice="link">🔗 ${label("A link")}</button>` : `<button type="button" class="tb-btn tb-text" data-paste-choice="rich">${label("Keep the formatting")}</button>`}
        <button type="button" class="secondary tb-btn tb-text" data-paste-choice="plain">${label("Plain text")}</button>${close}</div>${msg}`;
    } else if (mode === "annotate") {
      P.innerHTML = `<div class="pane-panel-row"><label class="pane-panel-field">${label("Comment on the selected text")}<input type="text" autocomplete="off" maxlength="${NOTE_ANN_TEXT_MAX}" data-panel-ann-text></label>
        <button type="button" class="tb-btn tb-text" data-panel-ann-apply>${label("Add comment")}</button>${close}</div>${msg}`;
    } else if (mode === "phrases") {
      const list = S()?.get().phrases ?? [];
      P.innerHTML = `<div class="pane-panel-row" role="group" aria-label="${label("Quick phrases")}">${list.length ? list.map((p, i) => `<button type="button" class="secondary tb-btn tb-text mt-phrase" data-phrase-insert="${i}">${escapeHtml(p)}</button>`).join("") : `<span class="pane-panel-label">${label("No phrases yet.")}</span>`}
        <button type="button" class="secondary tb-btn tb-text" data-phrase-manage>✎ ${label("Edit phrases")}</button>${close}</div>${msg}`;
    } else if (mode === "spacing") {
      P.innerHTML = `<div class="pane-panel-row" role="group" aria-label="${label("Line spacing")}"><span class="pane-panel-label">${label("Line spacing")}</span>${LINE_HEIGHTS.map(([val, name]) =>
        `<button type="button" class="secondary tb-btn tb-text" data-spacing-line="${val}">${label(name)}</button>`).join("")}</div>
        <div class="pane-panel-row" role="group" aria-label="${label("Space after a paragraph")}"><span class="pane-panel-label">${label("Space after a paragraph")}</span>${PARA_SPACES.map(([val, name]) =>
        `<button type="button" class="secondary tb-btn tb-text" data-spacing-after="${val}">${label(name)}</button>`).join("")}${close}</div>${msg}`;
    } else {
      const list = mode === "color" ? TEXT_COLOURS : HIGHLIGHTS;
      // Item 29: ⊘ takes the colour or the highlight off again.
      const none = mode === "color" ? "No colour" : "No highlight";
      P.innerHTML = `<div class="pane-panel-row" role="group" aria-label="${label(mode === "color" ? "Text colour" : "Highlight")}">${list.map(([hex, name]) =>
        `<button type="button" class="tb-btn tb-chip" data-swatch="${hex}" data-swatch-mode="${mode}" aria-label="${label(name)}" title="${label(name)}" style="background:${hex}"><span aria-hidden="true" style="color:${mode === "color" ? hex : "#222"}">${mode === "color" ? "■" : "A"}</span></button>`).join("")}<button type="button" class="tb-btn tb-chip tb-none" data-swatch="" data-swatch-mode="${mode}" aria-label="${label(none)}" title="${label(none)}">⊘</button>${close}</div>${msg}`;
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
    else if (op === "sum" || op === "sortAsc" || op === "sortDesc") { tableMath(v, table, idx, op); return; }
    panelMsg(v, ""); onEditInput(v);
  }
  // Note-pane round 4 (item 33): Σ adds (or updates) a last row "Σ" with the column's total; ↑ / ↓ sort the rows by the
  // column (numbers by value, words alphabetically). A first row of <th> headings and the Σ row stay where they are.
  const bnToAscii = (s) => String(s).replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  const cellNumber = (td) => { const m = bnToAscii(td?.textContent ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
  const isSumRow = (tr) => /^Σ/.test((tr.children[0]?.textContent ?? "").trim());
  function tableMath(v, table, idx, op) {
    const rows = [...table.querySelectorAll("tr")];
    const head = rows[0] && rows[0].querySelector("th") && !rows[0].querySelector("td") ? rows[0] : null;
    const body = rows.filter((r) => r !== head && !isSumRow(r));
    if (op === "sum") {
      const nums = body.map((r) => cellNumber(r.children[idx])).filter((n) => n !== null);
      if (!nums.length) { panelMsg(v, t("This column has no numbers to add up.")); return; }
      const total = Math.round(nums.reduce((a, b) => a + b, 0) * 1000) / 1000;
      let sumRow = rows.find(isSumRow);
      if (!sumRow) {
        sumRow = document.createElement("tr");
        const n = Math.max(...rows.map((r) => r.children.length));
        for (let i = 0; i < n; i++) { const td = document.createElement("td"); td.appendChild(document.createElement("br")); sumRow.appendChild(td); }
        (body[body.length - 1] ?? head)?.after(sumRow);
        sumRow.children[0].textContent = "Σ";
      }
      const cell = sumRow.children[idx];
      if (cell) cell.textContent = idx === 0 ? `Σ ${total}` : String(total);
    } else {
      const dir = op === "sortAsc" ? 1 : -1;
      const key = (r) => { const n = cellNumber(r.children[idx]); return n; };
      const allNumbers = body.every((r) => key(r) !== null);
      body.sort((a, b) => dir * (allNumbers ? key(a) - key(b) : (a.children[idx]?.textContent ?? "").trim().localeCompare((b.children[idx]?.textContent ?? "").trim(), undefined, { numeric: true, sensitivity: "base" })));
      const parent = body[0]?.parentElement;
      const sumRows = rows.filter(isSumRow);
      for (const r of body) parent.appendChild(r);
      for (const r of sumRows) r.parentElement.appendChild(r);
    }
    panelMsg(v, ""); onEditInput(v);
  }
  function applySwatch(v, hex, mode) {
    if (!hex) { // ⊘ acts on what is selected NOW when the selection is in the text (the saved one can be stale after a colour)
      const sel = window.getSelection(), body = editBodyEl(v);
      if (!(sel?.rangeCount && body?.contains(sel.anchorNode))) restoreRange(v);
      removeSwatch(v, mode);
      return;
    }
    restoreRange(v);
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(mode === "color" ? "foreColor" : "hiliteColor", false, hex);
    document.execCommand("styleWithCSS", false, false);
    onEditInput(v);
  }
  /** ⊘: the text colour (or highlight) off every piece of the selection, and off the styled element the caret sits in. */
  function removeSwatch(v, mode) {
    const body = editBodyEl(v), sel = window.getSelection();
    if (!body || !sel?.rangeCount) return;
    const range = sel.getRangeAt(0), prop = mode === "color" ? "color" : "background-color";
    const touched = (el) => range.intersectsNode(el) || el.contains(range.startContainer);
    for (const el of body.querySelectorAll("[style]")) {
      if (!touched(el)) continue;
      el.style.removeProperty(prop);
      if (prop === "background-color") el.style.removeProperty("background");
      if (!el.getAttribute("style")) el.removeAttribute("style");
      if (el.tagName === "SPAN" && !el.attributes.length) el.replaceWith(...el.childNodes);
    }
    if (mode === "color") for (const f of body.querySelectorAll("font[color]")) if (touched(f)) f.removeAttribute("color");
    onEditInput(v);
  }
  function clearFormatting(v) {
    const body = editBodyEl(v), sel = window.getSelection();
    document.execCommand("removeFormat", false, null);
    document.execCommand("unlink", false, null);
    if (sel.rangeCount) for (const el of body.querySelectorAll("[style]")) if (sel.containsNode(el, true)) el.removeAttribute("style");
    for (const b of selectedBlocks(v)) { b.removeAttribute("data-done"); b.removeAttribute("data-box"); }
    const blk = closestIn(v, "h1, h2, h3, h4, blockquote");
    if (blk) document.execCommand("formatBlock", false, "p");
  }
  /** A short message in the edit status line, gone after a few seconds (I15: a refused button says why). */
  function flashStatus(v, text) {
    const el = v.editStatusEl;
    el.textContent = text; el.hidden = false; el.classList.add("problem");
    clearTimeout(el.__t); el.__t = setTimeout(() => { if (el.textContent === text) { el.hidden = true; el.classList.remove("problem"); } }, 3500);
  }
  /** The top-level blocks (paragraphs, headings, quotes, lists…) the selection touches, inside the editor. */
  function selectedBlocks(v) {
    const body = editBodyEl(v), sel = window.getSelection();
    if (!body || !sel?.rangeCount || !body.contains(sel.anchorNode)) return [];
    const top = (n) => { while (n && n.parentNode !== body) n = n.parentNode; return n?.nodeType === 1 ? n : null; };
    const range = sel.getRangeAt(0);
    const out = [...body.children].filter((c) => range.intersectsNode(c));
    if (!out.length) { const one = top(sel.anchorNode); if (one) out.push(one); }
    return out;
  }
  /** ▲H / ▼H and Ctrl+[ / Ctrl+]: the heading the caret is in moves one level up (H2 -> H1) or down (H2 -> H3; H4 -> normal text). */
  function shiftHeading(v, dir) {
    const h = closestIn(v, "h1, h2, h3, h4");
    if (!h) return false;
    const n = Number(h.tagName[1]) + dir;
    if (n < 1) return true; // already the top level
    document.execCommand("formatBlock", false, n > 4 ? "p" : `h${n}`);
    return true;
  }
  /** A+ / A−: the selected text one step bigger or smaller, as a span with a font-size the sanitiser allows. */
  function stepTextSize(v, dir) {
    const body = editBodyEl(v), sel = window.getSelection();
    if (!body || !sel?.rangeCount || sel.isCollapsed || !body.contains(sel.anchorNode)) return false;
    const startEl = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    const cur = parseFloat(getComputedStyle(startEl).fontSize) / parseFloat(getComputedStyle(body).fontSize) || 1;
    let i = TEXT_SIZES.reduce((best, x, k) => (Math.abs(x - cur) < Math.abs(TEXT_SIZES[best] - cur) ? k : best), 2);
    i = Math.min(Math.max(i + dir, 0), TEXT_SIZES.length - 1);
    // execCommand fontSize marks the selection with <font size="7">; each mark becomes a span with the chosen size.
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("fontSize", false, "7");
    for (const f of body.querySelectorAll('font[size="7"]')) {
      const span = document.createElement("span");
      if (TEXT_SIZES[i] !== 1) span.style.fontSize = `${TEXT_SIZES[i]}em`;
      // a size set inside the new span would fight it: drop inner sizes
      for (const inner of f.querySelectorAll("[style]")) inner.style.removeProperty("font-size");
      span.append(...f.childNodes);
      f.replaceWith(span);
      if (!span.getAttribute("style")) span.replaceWith(...span.childNodes);
    }
    return true;
  }
  function applySpacing(v, kind, val) {
    restoreRange(v);
    const blocks = selectedBlocks(v);
    if (!blocks.length) { panelMsg(v, t("Put the cursor in a paragraph first.")); return; }
    for (const b of blocks) {
      if (kind === "line") { if (val) b.style.lineHeight = val; else b.style.removeProperty("line-height"); }
      else { if (val) b.style.marginBottom = val; else b.style.removeProperty("margin-bottom"); }
      if (!b.getAttribute("style")) b.removeAttribute("style");
    }
    panelMsg(v, ""); onEditInput(v);
  }
  /** Enter at the very start of the Note's first heading or first list adds an empty line ABOVE it (there is no other way to get above it). */
  function onEditKeydown(v, ev) {
    if (!v.ed) return;
    if (v.ed.mention && mentionKey(v, ev)) return;
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === "[" || ev.key === "]")) {
      ev.preventDefault();
      if (shiftHeading(v, ev.key === "[" ? -1 : 1)) onEditInput(v);
      return;
    }
    if (ev.key !== "Enter" || ev.shiftKey) return;
    const body = editBodyEl(v), sel = window.getSelection();
    if (!body || !sel?.isCollapsed || !sel.rangeCount) return;
    const first = body.firstElementChild;
    if (!first || !(/^(H[1-4]|UL|OL|BLOCKQUOTE|TABLE)$/.test(first.tagName))) return;
    const startBlock = first.tagName === "UL" || first.tagName === "OL" ? first.firstElementChild : first;
    if (!startBlock || !startBlock.contains(sel.anchorNode)) return;
    const r = document.createRange();
    r.setStart(startBlock, 0); r.setEnd(sel.anchorNode, sel.anchorOffset);
    if (r.toString().length) return; // not at the very start
    ev.preventDefault();
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    body.insertBefore(p, first);
    const c = document.createRange(); c.setStart(p, 0); c.collapse(true);
    sel.removeAllRanges(); sel.addRange(c);
    onEditInput(v);
  }
  // Note-pane round 4 (item 32): typing @ opens a list of your Notes; typing more narrows it; Enter (or a tap) puts
  // "@Title" in the text and adds a Link from this Note to that one (the same Links as ⋯ → 🔗 Link to a Note).
  // Esc, a space, or moving away closes the list and leaves the @ as typed.
  function onMentionInput(v, ev) {
    const e = v.ed;
    if (!e || !host.flags) return;
    const sel = window.getSelection();
    if (ev.inputType === "insertText" && ev.data === "@" && sel?.rangeCount) {
      const r = sel.getRangeAt(0);
      if (r.startContainer.nodeType !== 3 || r.startOffset < 1) return;
      const start = document.createRange(); start.setStart(r.startContainer, r.startOffset - 1); start.collapse(true);
      e.mention = { start, idx: 0 };
      paintMention(v);
      return;
    }
    if (e.mention) paintMention(v);
  }
  function mentionQuery(v) {
    const m = v.ed?.mention, sel = window.getSelection();
    if (!m || !sel?.rangeCount) return null;
    const r = document.createRange();
    try { r.setStart(m.start.startContainer, m.start.startOffset); r.setEnd(sel.anchorNode, sel.anchorOffset); } catch { return null; }
    const text = r.toString();
    if (!text.startsWith("@") || /\s/.test(text) || text.length > 60) return null;
    return text.slice(1);
  }
  function closeMention(v) { if (v.ed) v.ed.mention = null; v.mentionEl?.remove(); v.mentionEl = null; }
  function paintMention(v) {
    const q = mentionQuery(v);
    if (q === null) { closeMention(v); return; }
    const note = getNote(v.noteId);
    const rows = host.flags.candidates(note, q).slice(0, 8);
    v.ed.mention.rows = rows;
    v.ed.mention.idx = Math.min(v.ed.mention.idx, Math.max(rows.length - 1, 0));
    if (!v.mentionEl) {
      v.mentionEl = document.createElement("div");
      v.mentionEl.className = "note-mention";
      v.mentionEl.dataset.mention = "";
      v.mentionEl.setAttribute("role", "listbox");
      v.mentionEl.setAttribute("aria-label", t("Link to a Note"));
      v.mentionEl.addEventListener("mousedown", (e) => e.preventDefault()); // keep the caret in the text
      v.mentionEl.addEventListener("click", (e) => { const b = e.target.closest("[data-mention-pick]"); if (b) pickMention(v, Number(b.dataset.mentionPick)); });
      document.body.appendChild(v.mentionEl);
    }
    v.mentionEl.innerHTML = rows.length
      ? rows.map((r, i) => `<button type="button" role="option" class="note-mention-row" data-mention-pick="${i}" aria-selected="${i === v.ed.mention.idx}">📄 ${escapeHtml(r.title?.trim() || t("(untitled)"))}</button>`).join("")
      : `<p class="note-mention-empty">${escapeHtml(t("No Note matches that search."))}</p>`;
    const sel = window.getSelection();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    const box = v.mentionEl.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const x = rect && rect.width + rect.height > 0 ? rect.left : editBodyEl(v).getBoundingClientRect().left;
    const y = rect && rect.width + rect.height > 0 ? rect.bottom + 4 : editBodyEl(v).getBoundingClientRect().top;
    v.mentionEl.style.left = `${Math.max(8, Math.min(x, vw - box.width - 8))}px`;
    v.mentionEl.style.top = `${y + box.height > vh - 8 ? Math.max(8, (rect?.top ?? y) - box.height - 4) : y}px`;
  }
  function mentionKey(v, ev) {
    const m = v.ed.mention;
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); closeMention(v); return true; }
    if (!m.rows?.length) return false;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") { ev.preventDefault(); m.idx = (m.idx + (ev.key === "ArrowDown" ? 1 : -1) + m.rows.length) % m.rows.length; paintMention(v); return true; }
    if (ev.key === "Enter" || ev.key === "Tab") { ev.preventDefault(); pickMention(v, m.idx); return true; }
    return false;
  }
  async function pickMention(v, i) {
    const m = v.ed?.mention, row = m?.rows?.[i], sel = window.getSelection();
    if (!row || !sel?.rangeCount) { closeMention(v); return; }
    const r = document.createRange();
    r.setStart(m.start.startContainer, m.start.startOffset); r.setEnd(sel.anchorNode, sel.anchorOffset);
    sel.removeAllRanges(); sel.addRange(r);
    document.execCommand("insertText", false, `@${row.title?.trim() || t("(untitled)")} `);
    closeMention(v);
    onEditInput(v);
    const note = getNote(v.noteId);
    try { await host.flags.link(note, row.noteId); flashStatus(v, t('Linked to "{title}".', { title: row.title?.trim() || t("(untitled)") })); }
    catch (err) { flashStatus(v, err?.message || t("That did not save.")); } // I15: the text stays; the link says why it did not save
  }
  function runEditCommand(v, cmd) {
    const body = editBodyEl(v);
    if (!body) return;
    if (cmd === "sheet") { insertSheet(v); return; }
    if (["link", "table", "color", "highlight", "spacing", "annotate", "phrases"].includes(cmd)) {
      if (!v.editPanelEl.hidden && v.editPanelEl.dataset.mode === cmd) closePanel(v); else openPanel(v, cmd);
      return;
    }
    closePanel(v);
    body.focus();
    document.execCommand("styleWithCSS", false, false);
    if (/^h[1-4]$/.test(cmd)) {
      const now = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
      document.execCommand("formatBlock", false, now === cmd ? "p" : cmd);
    } else if (cmd === "para") {
      document.execCommand("formatBlock", false, "p");
    } else if (cmd === "hup" || cmd === "hdown") {
      if (!shiftHeading(v, cmd === "hup" ? -1 : 1)) { flashStatus(v, t("Put the cursor in a heading first.")); return; }
    } else if (cmd === "bigger" || cmd === "smaller") {
      if (!stepTextSize(v, cmd === "bigger" ? 1 : -1)) { flashStatus(v, t("Select some text first.")); return; }
    } else if (cmd === "done" || cmd === "box") {
      const attr = cmd === "done" ? "data-done" : "data-box";
      const blocks = selectedBlocks(v);
      if (!blocks.length) { flashStatus(v, t("Put the cursor in a paragraph first.")); return; }
      const on = !blocks.every((b) => b.hasAttribute(attr));
      for (const b of blocks) if (on) b.setAttribute(attr, "1"); else b.removeAttribute(attr);
    } else if (cmd === "divider") {
      document.execCommand("insertHorizontalRule", false, null);
    } else if (cmd === "justify") {
      document.execCommand("styleWithCSS", false, true);
      document.execCommand("justifyFull", false, null);
      document.execCommand("styleWithCSS", false, false);
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
  function scheduleGutter(v) { cancelAnimationFrame(gutterRaf); gutterRaf = requestAnimationFrame(() => { layoutGutter(v); fitToolbar(v); }); }
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
  /** Item 21: ⇅ while editing -- every heading folded, or (when they all are) every one opened. A view-only change. */
  function foldAllEditing(v) {
    const body = editBodyEl(v);
    if (!v.ed || !body) return;
    const heads = [...body.children].filter(isHeadingEl);
    if (!heads.length) { flashStatus(v, t("This Note has no headings yet.")); return; }
    const all = heads.every((h) => v.ed.folded.has(h));
    v.ed.folded.clear();
    if (!all) for (const h of heads) v.ed.folded.add(h);
    layoutGutter(v);
    renderPaneBar(v); fitPaneBarTwice(v);
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
  // Note-pane round 4 (items 30, 31): a pasted web address asks "a link, or plain text?"; pasted text that carries
  // formatting asks "keep the formatting, or plain text?". The choice is a small row in the editor's panel; until it
  // is made, nothing is pasted (Esc or Close: nothing).
  const FORMATTED_PASTE = /<(b|strong|i|em|u|s|strike|h[1-6]|ul|ol|li|table|a|blockquote|font|mark|hr)\b|<\w+[^>]*\sstyle="[^"]*\S/i;
  function onEditPaste(v, ev) {
    if (!v.ed || !ev.target.closest?.("[data-edit-body]")) return;
    ev.preventDefault();
    const html = ev.clipboardData?.getData("text/html") || "", text = ev.clipboardData?.getData("text/plain") || "";
    const one = text.trim();
    const clean = html ? sanitizeNoteHtml(html) : "";
    if (one && !/\s/.test(one) && /^(https?:\/\/|mailto:)/i.test(one) && isSafeNoteHref(one)) {
      v.ed.pendingPaste = { kind: "url", url: one, text };
      openPanel(v, "paste");
      return;
    }
    if (clean && FORMATTED_PASTE.test(clean)) {
      v.ed.pendingPaste = { kind: "rich", html: clean, text };
      openPanel(v, "paste");
      return;
    }
    if (clean && !text) document.execCommand("insertHTML", false, clean);
    else if (text) document.execCommand("insertText", false, text);
    onEditInput(v);
  }
  function finishPaste(v, how) {
    const p = v.ed?.pendingPaste;
    if (!p) { closePanel(v); return; }
    v.ed.pendingPaste = null;
    restoreRange(v);
    if (how === "link") document.execCommand("insertHTML", false, `<a href="${escapeHtml(p.url)}">${escapeHtml(p.url)}</a>`);
    else if (how === "rich") document.execCommand("insertHTML", false, p.html);
    else document.execCommand("insertText", false, p.text);
    closePanel(v); onEditInput(v);
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
    // Item 44: a spreadsheet in the text gets its live grid; one that appears later (undo, paste) is mounted by the observer.
    mountEditSheets(v, body);
    v.ed.sheetObs = typeof MutationObserver === "function" ? new MutationObserver(() => { if (v.ed) mountEditSheets(v); }) : null;
    v.ed.sheetObs?.observe(body, { childList: true, subtree: true });
    v.bodyEl.appendChild(wrap);
    Object.assign(v.ed, { wrapEl: wrap, gutterEl: gutter, folded: new Set(), range: null });
    body.addEventListener("paste", (ev) => onEditPaste(v, ev));
    body.addEventListener("keydown", (ev) => onEditKeydown(v, ev));
    body.addEventListener("input", (ev) => onMentionInput(v, ev));
    body.addEventListener("keyup", () => { saveRange(v); paintAnnBubble(v); });
    body.addEventListener("mouseup", () => { saveRange(v); setTimeout(() => paintAnnBubble(v), 0); });
    body.addEventListener("blur", () => setTimeout(() => { if (!document.activeElement?.closest?.("[data-ann-bubble]")) hideAnnBubble(v); }, 150));
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
    v.barEl.classList.remove("multi-folded", "folded", "tight", "tools-folded", "attach-folded", "edit-folded");
    const over = () => v.barEl.scrollWidth > v.barEl.clientWidth + 1;
    // Note-pane round 3: ⧉ is the first to go (⋯ always has ⧉ Pop out), so it never costs 🔍 or ⇅ their place.
    if (over()) v.barEl.classList.add("multi-folded");
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
      // The Owner, 5 Oct 2026: in pop-up windows too (was the pane only).
      newBtn.hidden = !(own && host.newNote);
      newBtn.setAttribute("aria-label", t("New note")); newBtn.title = t("New note");
    }
    const headings = [...v.el.querySelectorAll(".note-sec")];
    const foldBtn = v.el.querySelector("[data-pane-foldall]");
    // Note-pane round 3 (item 21): ⇅ folds or opens every section while editing too (the editor's own folds, never saved).
    const edHeads = v.ed ? [...(editBodyEl(v)?.children ?? [])].filter(isHeadingEl) : [];
    foldBtn.hidden = v.ed ? false : !headings.length;
    const allCollapsed = v.ed ? edHeads.length > 0 && edHeads.every((h) => v.ed.folded.has(h)) : headings.length > 0 && headings.every((sec) => sec.classList.contains("collapsed"));
    // Item 23: ⧉ on the pane's own bar -- this Note in its own window in one tap (it folds into ⋯ with 🔍 and ⇅).
    const multiBtn = v.el.querySelector("[data-pane-multi]");
    if (multiBtn) { multiBtn.hidden = v.kind !== "pane"; multiBtn.setAttribute("aria-label", t("Open in its own window")); multiBtn.title = t("Open in its own window (Ctrl+Shift+P)"); }
    const foldLabel = allCollapsed ? t("Open all headings") : t("Close all headings");
    foldBtn.setAttribute("aria-label", foldLabel); foldBtn.title = foldLabel;
    const findBtn = v.el.querySelector("[data-pane-find-toggle]");
    findBtn.setAttribute("aria-label", t("Find in this Note")); findBtn.title = t("Find in this Note");
    findBtn.hidden = false; // the Owner, 5 Oct 2026 (Siyagah's note pane): Find works while editing too
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
    if (headings.length || v.ed) menu += `<button type="button" class="secondary tiny pane-toolfold-item" data-pane-foldall>⇅ ${escapeHtml(foldLabel)}</button>`;
    if (canAttach) menu += `<button type="button" class="secondary tiny pane-attachfold-item" data-pane-attach>📎 ${escapeHtml(t("Folders and tags"))}</button>`;
    if (host.versions) menu += `<button type="button" class="secondary tiny" data-pane-versions>🕘 ${escapeHtml(t("Versions…"))}</button>`;
    if (own) {
      menu = `<button type="button" class="secondary tiny pane-editfold-item" data-pane-edit-toggle>${escapeHtml(editLabel)}</button>` + menu;
      // Note-pane round 2 (items 14, 15).
      menu += `<button type="button" class="secondary tiny" data-pane-rename>✏️ ${escapeHtml(t("Rename"))}</button>`;
      if (host.copyNote) menu += `<button type="button" class="secondary tiny" data-pane-duplicate>🗐 ${escapeHtml(t("Make a copy"))}</button>`;
      menu += host.menuMid?.(v, note) ?? "";
      if (host.tagging) menu += `<button type="button" class="secondary tiny" data-pane-tags>🏷 ${escapeHtml(t("Tags…"))}</button>`;
      if (host.flags) {
        const f = host.flags;
        const item = (key, icon, onLabel, offLabel) => `<button type="button" class="secondary tiny" data-pane-flag="${key}" aria-pressed="${f.on(note, key)}">${icon} ${escapeHtml(f.on(note, key) ? offLabel : onLabel)}</button>`;
        menu += item("pinned", "📌", t("Pin"), t("Unpin"));
        menu += item("favourite", "⭐", t("Favourite"), t("Remove from Favourites"));
        menu += item("archived", "📦", t("Archive"), t("Bring back from Archive"));
        menu += item("finalised", "🔒", t("Finalise"), t("Un-finalise"));
        menu += `<button type="button" class="secondary tiny" data-pane-link>🔗 ${escapeHtml(t("Link to a Note…"))}</button>`;
      }
    }
    if (S()) menu += `<button type="button" class="secondary tiny" data-pane-mytools>🧰 ${escapeHtml(t("My Note tools…"))}</button>`;
    if (v.kind === "pane") menu += `<button type="button" class="secondary tiny" data-pane-popout>⧉ ${escapeHtml(t("Pop out"))}</button>`;
    menu += `<button type="button" class="secondary tiny" data-pane-previews aria-pressed="${previewsOn(localStorage)}">🖼 ${escapeHtml(t("Show link previews"))}: ${escapeHtml(previewsOn(localStorage) ? t("On") : t("Off"))}</button>`;
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
  function flagChipsHtml(note) {
    if (!host.flags) return "";
    return [["pinned", "📌", t("Pinned")], ["favourite", "⭐", t("Favourite")], ["archived", "📦", t("Archived")], ["finalised", "🔒", t("Finalised")]]
      .filter(([key]) => host.flags.on(note, key))
      .map(([key, icon, label]) => `<span class="tag-chip" data-flag-chip="${key}">${icon} ${escapeHtml(label)}</span>`).join("");
  }
  /** Round 14: the Note's own links and its "Linked from" list, at the end of the body (read view only). */
  function paintLinks(v, note) {
    v.bodyEl.querySelector("[data-note-links]")?.remove();
    const f = host.flags;
    if (!f || !f.ready() || (v.ed && v.ed.noteId === note.noteId)) return;
    const out = f.linksOut(note), back = f.linksIn(note);
    if (!out.length && !back.length) return;
    const own = host.canEdit();
    const row = (l, removable) => `<li><button type="button" class="secondary" data-link-open="${escapeHtml(l.noteId)}" style="min-height:44px">${escapeHtml(l.title || t("(untitled)"))}</button>${removable && own ? `<button type="button" class="secondary" data-link-remove="${escapeHtml(l.linkId)}" aria-label="${escapeHtml(t("Remove this link"))}" title="${escapeHtml(t("Remove this link"))}" style="min-height:44px;min-width:44px">✕</button>` : ""}</li>`;
    const sec = document.createElement("section");
    sec.dataset.noteLinks = "";
    sec.innerHTML = (out.length ? `<h3 data-links-out-head>🔗 ${escapeHtml(t("Links"))}</h3><ul data-links-out style="list-style:none;padding:0;margin:0 0 0.6rem">${out.map((l) => row(l, true)).join("")}</ul>` : "")
      + (back.length ? `<h3 data-links-in-head>↩ ${escapeHtml(t("Linked from"))}</h3><ul data-links-in style="list-style:none;padding:0;margin:0">${back.map((l) => row(l, false)).join("")}</ul>` : "");
    v.bodyEl.appendChild(sec);
  }
  // ---------------------------------------------------------------------------------------------------------------
  // LINK PREVIEW CARDS (Part C, item 43; decisions 72, 81). Read view only, per device, OFF by default, shown and never
  // stored: no write of any kind. Each https link's address goes to Microlink only after the reader says yes in words.
  // The answer is cleaned in note-link-preview.js and set here with textContent; the picture is an https <img> that is
  // dropped if it fails; the site name is the link's own host.
  // ---------------------------------------------------------------------------------------------------------------
  function paintPreviews(v) {
    v.bodyEl.querySelectorAll("[data-link-preview]").forEach((c) => c.remove());
    if (!previewsOn(localStorage) || (v.ed && v.ed.noteId === v.noteId)) return;
    const anchors = [...v.bodyEl.querySelectorAll("a[href]")].filter((a) => !a.closest("[data-note-links]"));
    for (const url of pickLinks(anchors.map((a) => a.getAttribute("href")))) {
      const a = anchors.find((x) => x.getAttribute("href").trim() === url);
      let blk = a;
      while (blk.parentElement && blk.parentElement !== v.bodyEl && !blk.parentElement.matches(".note-sec, [data-pane-body]")) blk = blk.parentElement;
      const card = document.createElement("a");
      card.dataset.linkPreview = url;
      card.href = url; card.target = "_blank"; card.rel = "noopener noreferrer";
      card.style.cssText = "display:flex;gap:0.6rem;align-items:center;box-sizing:border-box;max-width:100%;min-height:44px;margin:0.4rem 0 0.8rem;padding:0.5rem;border:1px solid rgba(128,128,128,0.5);border-radius:10px;text-decoration:none;color:inherit;overflow:hidden";
      const text = document.createElement("span");
      text.style.cssText = "display:block;min-width:0;flex:1 1 auto;overflow-wrap:anywhere";
      const hostEl = document.createElement("small");
      hostEl.dataset.previewHost = ""; hostEl.style.display = "block"; hostEl.textContent = hostOf(url);
      const status = document.createElement("span");
      status.dataset.previewStatus = ""; status.style.display = "block"; status.textContent = t("Loading the preview…");
      text.append(status, hostEl);
      card.append(text);
      blk.after(card);
      loadPreview(url, { storage: localStorage }).then((r) => {
        if (!card.isConnected) return;
        if (r.error || r.empty) {
          status.textContent = r.empty ? t("This link has no preview.") : r.error === "refused" ? t("The preview could not be fetched: the preview service said no (it allows only a few a day).") : t("The preview could not be fetched: no connection.");
          card.dataset.previewFailed = r.error ?? "empty";
          return;
        }
        const p = r.preview;
        text.replaceChildren();
        if (p.title) { const el = document.createElement("strong"); el.dataset.previewTitle = ""; el.style.display = "block"; el.textContent = p.title; text.append(el); }
        if (p.description) { const el = document.createElement("span"); el.dataset.previewDesc = ""; el.style.display = "block"; el.textContent = p.description; text.append(el); }
        text.append(hostEl);
        if (p.image) {
          const img = document.createElement("img");
          img.referrerPolicy = "no-referrer"; img.loading = "lazy"; img.alt = "";
          img.style.cssText = "width:72px;height:72px;object-fit:cover;border-radius:6px;flex:0 0 auto";
          img.addEventListener("error", () => img.remove());
          img.src = p.image;
          card.prepend(img);
        }
        card.dataset.previewReady = "";
      });
    }
  }
  /** ⋯ → Show link previews. Turning it ON asks first, in words; turning it off is immediate. */
  function togglePreviews(v) {
    const rerender = () => { for (const x of allViews()) if (x.noteId && getNote(x.noteId)) renderView(x, { keepScroll: true }); };
    if (previewsOn(localStorage)) { setPreviewsOn(localStorage, false); rerender(); return; }
    const d = smallDialog("previews", `🖼 ${t("Show link previews")}`, `<p>${escapeHtml(t("Each link's address is sent to Microlink (microlink.io) to fetch its title, description and picture. Nothing else from your Note is sent."))}</p>
      <p><small>${escapeHtml(t("This is only on this device. Nothing is saved into your Note."))}</small></p>
      <div><button type="button" class="secondary" data-preview-yes style="min-height:44px">${escapeHtml(t("Turn on"))}</button> <button type="button" class="secondary" data-preview-no style="min-height:44px">${escapeHtml(t("Cancel"))}</button></div>`);
    d.q("[data-preview-yes]").addEventListener("click", () => { setPreviewsOn(localStorage, true); d.close(); rerender(); });
    d.q("[data-preview-no]").addEventListener("click", () => d.close());
    d.q("[data-preview-no]").focus();
  }
  /** Round 14, made a side panel (the Owner, 5 Oct 2026; demo
   *  docs/reference/2026-10-05-folder-window-and-pinned-demo.html): a window's
   *  📌 Pinned button opens the pinned Notes beside the Note (over it in a
   *  narrow window or on a phone). Tapping one shows it in the SAME window. */
  const PINS_KEY = () => `${host.winKey}.pins`;
  const PIN_W_MIN = 160, PIN_W_MAX = 480, PIN_W_DEFAULT = 220;
  let pinW = null;
  /** The pinned panel's width on this device; with `w`, sets it (and stores it when `save`). */
  function pinPanelWidth(w, save) {
    if (w === undefined) {
      if (pinW === null) { try { const v = Number(localStorage.getItem(`${host.winKey}.pinsW`)); pinW = Number.isFinite(v) && v >= PIN_W_MIN && v <= PIN_W_MAX ? v : PIN_W_DEFAULT; } catch { pinW = PIN_W_DEFAULT; } }
      return pinW;
    }
    pinW = w;
    if (save) { try { localStorage.setItem(`${host.winKey}.pinsW`, String(w)); } catch { /* private mode */ } }
    for (const x of windowViews) { const pp = x.win?.querySelector("[data-win-pinned]"); if (pp) pp.style.flexBasis = `${w}px`; }
    return w;
  }
  function pinsOpenPref() { try { return localStorage.getItem(PINS_KEY()) === "1"; } catch { return false; } }
  function savePinsOpen(open) { try { localStorage.setItem(PINS_KEY(), open ? "1" : "0"); } catch { /* private mode */ } }
  function paintPinned(v, note) {
    const panel = v.win?.querySelector("[data-win-pinned]");
    const tog = v.win?.querySelector("[data-win-pins-toggle]");
    if (!panel || !tog) return;
    if (!host.flags) { tog.hidden = true; panel.hidden = true; return; }
    const pins = host.flags.ready() ? host.flags.pinned() : [];
    tog.hidden = false;
    tog.textContent = `📌 ${t("Pinned")}${pins.length ? ` (${bnDigits(pins.length)})` : ""}`;
    tog.setAttribute("aria-pressed", String(!!v.pinsOpen));
    panel.hidden = !v.pinsOpen;
    v.win.classList.toggle("pins-open", !!v.pinsOpen);
    panel.innerHTML = `<div class="nw-pin-head"><span>📌 ${escapeHtml(t("Pinned"))}</span><button type="button" class="secondary nw-pin-close" data-win-pins-close aria-label="${escapeHtml(t("Close the pinned Notes"))}" title="${escapeHtml(t("Close"))}">✕</button></div>
      <div class="nw-pin-list">${pins.length
        ? pins.map((p) => `<button type="button" class="nw-pin-item" data-win-pin-open="${escapeHtml(p.noteId)}" aria-current="${p.noteId === note.noteId}">${escapeHtml(p.title || t("(untitled)"))}</button>`).join("")
        : `<p class="note" data-win-pins-empty>${escapeHtml(t("Nothing pinned yet. Pin a Note from its ⋯ menu."))}</p>`}</div>`;
  }
  function setPinsOpen(v, open) {
    v.pinsOpen = open;
    savePinsOpen(open);
    const note = getNote(v.noteId);
    if (note) paintPinned(v, note);
  }
  /** A pinned Note shown in the window the reader tapped it in -- unless it is already open somewhere, which is then focused (§4.6). */
  async function showPinnedIn(v, noteId) {
    const narrow = v.win.classList.contains("nw-narrow");
    if (noteId === v.noteId) { if (narrow) setPinsOpen(v, false); return; }
    if (narrow && !viewShowing(noteId)) { v.pinsOpen = false; savePinsOpen(false); }
    await showNoteIn(v, noteId, [noteId]);
  }
  /** Show `noteId` in view `v` (the pane or a window), with ‹ › walking `order` -- or focus the view it is already open in (§4.6). */
  async function showNoteIn(v, noteId, order) {
    if (noteId === v.noteId) return;
    const other = viewShowing(noteId);
    if (other) { focusView(other); return; }
    const target = getNote(noteId);
    if (!target || host.isRetired(target)) return;
    if (v.ed) await endEdit(v);
    v.noteId = noteId;
    v.order = order;
    v.folderId = null;
    renderView(v);
    if (v.kind === "pane" && host.paneTier() === "narrow") host.scroller().scrollTop = 0; else v.scrollEl.scrollTop = 0;
  }
  let linkPicker = null;
  function closeLinkPicker() { if (linkPicker) { linkPicker.remove(); linkPicker = null; } }
  function openLinkPicker(note) {
    closeLinkPicker();
    const f = host.flags;
    const el = document.createElement("div");
    el.className = "tag-picker";
    el.dataset.linkPicker = "";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", t("Link to a Note"));
    el.innerHTML = `<div class="tag-picker-card">
        <div class="tag-picker-head"><strong>🔗 ${escapeHtml(t("Link to a Note"))}</strong><button type="button" class="secondary tag-picker-close" data-link-close aria-label="${escapeHtml(t("Close"))}">✕</button></div>
        <p class="note gate-note" data-link-gate role="status" hidden>${escapeHtml(t("Links switch on once the new Firebase Rules are published."))}</p>
        <p class="tag-picker-msg" data-link-msg role="status" hidden></p>
        <input type="search" class="tag-picker-search" data-link-search placeholder="${escapeHtml(t("Search your Notes"))}" aria-label="${escapeHtml(t("Search your Notes"))}">
        <div class="tag-picker-list" data-link-list></div>
      </div>`;
    document.body.appendChild(el);
    linkPicker = el;
    const q = (sel) => el.querySelector(sel);
    const paint = () => {
      const on = f.ready();
      q("[data-link-gate]").hidden = on;
      const rows = f.candidates(note, q("[data-link-search]").value.trim()).slice(0, 50);
      q("[data-link-list]").innerHTML = rows.length
        ? rows.map((r) => `<button type="button" class="secondary" data-link-pick="${escapeHtml(r.noteId)}" ${on ? "" : "disabled"} style="min-height:44px;width:100%;text-align:left">${escapeHtml(r.title || t("(untitled)"))}</button>`).join("")
        : `<p class="note">${escapeHtml(t("No Note matches that search."))}</p>`;
    };
    el.addEventListener("click", async (e) => {
      if (e.target === el || e.target.closest("[data-link-close]")) { closeLinkPicker(); return; }
      const pick = e.target.closest("[data-link-pick]");
      if (!pick) return;
      try {
        await f.link(note, pick.dataset.linkPick);
        closeLinkPicker();
        rerenderNoteEverywhere(note.noteId);
        rerenderNoteEverywhere(pick.dataset.linkPick);
      } catch (err) {
        const m = q("[data-link-msg]"); m.textContent = err?.message || t("That did not save."); m.hidden = false;
      }
    });
    q("[data-link-search]").addEventListener("input", paint);
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeLinkPicker(); } });
    paint();
    q("[data-link-search]").focus();
  }
  function tagChipsHtml(note) {
    if (!host.tagging) return flagChipsHtml(note);
    const ids = new Set(host.tagging.noteTagIds(note));
    return flagChipsHtml(note) + host.tagging.tags().filter((g) => ids.has(g.id)).map((g) =>
      `<button type="button" class="tag-chip tag-chip-btn" data-tag-chip="${escapeHtml(g.id)}" title="${escapeHtml(t("Show every Note with this tag"))}"><span class="tag-dot" aria-hidden="true"${g.color ? ` style="background:${escapeHtml(g.color)}"` : ""}></span>🏷 ${escapeHtml(g.name)}</button>`).join("");
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
        <p class="note" data-tag-staged hidden>${escapeHtml(t("You are editing this Note: tag changes are saved when you press Done."))}</p>
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
      q("[data-tag-staged]").hidden = !isEditingNote(live().noteId);
      const ids = shownTagIds(live().noteId);
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
      if (holdTagTick(live().noteId, box.dataset.tagPick, box.checked)) { paint(); return; } // held until Done
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
        if (id && !holdTagTick(live().noteId, id, true)) await tg.tag(live(), id);
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
  // =====================================================================
  // NOTE-PANE PART C1 (the Owner, 6 Oct 2026, decision 72: "38. yes, 39. yes"):
  // ANNOTATIONS (item 38) and HEADING STATUS BADGES (item 39). Both live INSIDE
  // the Note's own bodyHtml -- <mark data-ann data-ann-text> + <sup data-ann-ref>,
  // and data-status on the heading -- so they travel with the Note, are kept in
  // Versions, and need no new field and no Rules change. Adding one while editing
  // goes out through the ordinary autosave; changing one in the read view is a
  // revision through host.revise, exactly like Rename. A finalised Note refuses
  // both in words. The status BADGE is drawn at view time and never saved.
  // =====================================================================
  const STATUS_META = { done: ["Done", "#1b6e3c"], ongoing: ["Ongoing", "#1f3a6e"], process: ["Under process", "#7a4b00"], next: ["Next", "#6a3fa0"] };
  const STATUS_CUSTOM_DEFAULT = "#374151";
  const ANN_BLOCKS = "p,li,h1,h2,h3,h4,blockquote,td,th";
  const FINALISED_SAY = () => t("This Note is finalised, so it can't be changed. Un-finalise it from the ⋯ menu first.");
  const annNumbers = (root) => [...root.querySelectorAll("[data-ann],[data-ann-ref]")].map((el) => Number(el.getAttribute("data-ann") || el.getAttribute("data-ann-ref"))).filter((n) => n > 0);
  const annHigh = new Map(); // noteId -> the highest number used in this session, so a removed number is not handed out again
  /** What the status of a heading looks like: [label, colour] (null when it has none). */
  function statusLook(st, label, colour) {
    if (st === "custom") return [label || t("Custom"), NOTE_STATUS_COLOURS.includes(colour) ? colour : STATUS_CUSTOM_DEFAULT];
    return STATUS_META[st] ? [t(STATUS_META[st][0]), STATUS_META[st][1]] : null;
  }
  function hideAnnBubble(v) { v.annBubble?.remove(); v.annBubble = null; }
  /** A small 💬 near the selection on a wide screen (the toolbar's 💬 does the same on any screen). */
  function paintAnnBubble(v) {
    const body = editBodyEl(v), sel = window.getSelection();
    const wide = (v.bodyEl.clientWidth || v.el.clientWidth) >= 600;
    if (!v.ed || !body || !wide || !sel?.rangeCount || sel.isCollapsed || !body.contains(sel.anchorNode) || !body.contains(sel.focusNode)) { hideAnnBubble(v); return; }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) { hideAnnBubble(v); return; }
    if (!v.annBubble) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ann-bubble"; b.dataset.annBubble = ""; b.textContent = "💬";
      b.setAttribute("aria-label", t("Comment on the selected text")); b.title = t("Comment on the selected text");
      b.addEventListener("mousedown", (ev) => ev.preventDefault());
      b.addEventListener("click", () => { hideAnnBubble(v); runEditCommand(v, "annotate"); });
      document.body.appendChild(b);
      v.annBubble = b;
    }
    v.annBubble.style.left = `${Math.max(4, Math.min(window.innerWidth - 48, r.right + 4))}px`;
    v.annBubble.style.top = `${Math.max(4, r.top - 46)}px`;
  }
  /** The text nodes a range really covers, with the part of each that is selected. */
  function rangeTextNodes(range) {
    const root = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
    const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!range.intersectsNode(n)) continue;
      const from = n === range.startContainer ? range.startOffset : 0, to = n === range.endContainer ? range.endOffset : n.data.length;
      if (to > from && n.data.slice(from, to).trim()) out.push({ n, from, to });
    }
    return out;
  }
  function blockOfNode(body, n) {
    const el = n.nodeType === 1 ? n : n.parentElement;
    const own = el?.closest(ANN_BLOCKS);
    if (own && body.contains(own)) return own;
    let top = el;
    while (top && top.parentElement && top.parentElement !== body) top = top.parentElement;
    return top ?? body;
  }
  /** 38: wrap the selected text in <mark data-ann> and put its [N] after it. One paragraph only; a refusal is said in the panel (I15). */
  function applyAnnotation(v) {
    const e = v.ed, body = editBodyEl(v);
    if (!e || !body) return;
    const text = (v.editPanelEl.querySelector("[data-panel-ann-text]")?.value || "").replace(/\s+/g, " ").trim().slice(0, NOTE_ANN_TEXT_MAX);
    const range = e.range;
    if (!range || range.collapsed || !body.contains(range.commonAncestorContainer)) { panelMsg(v, t("Select some text first.")); return; }
    const parts = rangeTextNodes(range);
    if (!parts.length) { panelMsg(v, t("Select some text first.")); return; }
    if (new Set(parts.map((p) => blockOfNode(body, p.n))).size > 1) { panelMsg(v, t("Select text within one paragraph.")); return; }
    if (parts.some((p) => p.n.parentElement?.closest("mark[data-ann]"))) { panelMsg(v, t("That text already has a comment.")); return; }
    if (!text) { panelMsg(v, t("Type the comment first.")); return; }
    const first = parts[0], last = parts[parts.length - 1];
    const r = document.createRange();
    r.setStart(first.n, first.from); r.setEnd(last.n, last.to);
    const high = Math.max(annHigh.get(e.noteId) ?? 0, ...annNumbers(body));
    const N = high + 1;
    annHigh.set(e.noteId, N);
    const mark = document.createElement("mark");
    mark.setAttribute("data-ann", String(N)); mark.setAttribute("data-ann-text", text);
    mark.appendChild(r.extractContents());
    r.insertNode(mark);
    const sup = document.createElement("sup");
    sup.setAttribute("data-ann-ref", String(N)); sup.textContent = `[${N}]`;
    mark.after(sup);
    body.normalize();
    closePanel(v);
    body.focus();
    const sel = window.getSelection(); sel.removeAllRanges();
    const caret = document.createRange(); caret.setStartAfter(sup); caret.collapse(true); sel.addRange(caret);
    flashStatus(v, t("Comment [{n}] added.", { n: num(N) }));
    onEditInput(v);
  }

  /** The way a change made in the READ view is saved: a revision through the page's own save (like Rename). `change(div)` edits a parsed copy of the body and returns false when there is nothing to do. */
  async function reviseReadBody(v, note, change) {
    const live = getNote(note.noteId) ?? note;
    if (host.flags?.on(live, "finalised")) { host.status(FINALISED_SAY()); return false; }
    if (!host.canEdit() || !host.ready()) return false;
    if (allViews().some((x) => x.ed && x.noteId === live.noteId)) { host.status(t("Finish editing this Note first.")); return false; }
    const div = document.createElement("div");
    div.innerHTML = sanitizeNoteHtml(live.bodyHtml || "");
    if (change(div) === false) return false;
    const bodyHtml = normBody(div.innerHTML);
    try {
      const newId = await host.revise({ note: live, expectedRevisionId: live.currentRevisionId, title: live.title ?? "", bodyHtml });
      Object.assign(live, { bodyHtml, currentRevisionId: newId, updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() } });
      host.afterRevise(live);
      rerenderNoteEverywhere(live.noteId);
      return true;
    } catch (err) {
      console.error("[note change]", err);
      host.status(err?.message === "Stale Note revision." ? t("This Note changed on another device. Reload it, then try again.") : t("That did not save."));
      return false;
    }
  }
  /** Scroll to an element in the read view, opening any folded heading around it. */
  function revealIn(v, el) {
    if (!el) return;
    for (let up = el.closest(".note-sec.collapsed"); up; up = up.parentElement?.closest(".note-sec.collapsed")) up.querySelector(":scope > .note-sec-h [data-sec-toggle]")?.click();
    el.scrollIntoView({ block: "center" });
    el.classList.add("ann-flash");
    setTimeout(() => el.classList.remove("ann-flash"), 1600);
  }
  /** The Annotations list at the end of the read view (before the links). */
  function paintAnnotations(v) {
    v.bodyEl.querySelector("[data-annotations]")?.remove();
    const marks = new Map();
    for (const m of v.bodyEl.querySelectorAll("mark[data-ann]")) if (!marks.has(m.dataset.ann)) marks.set(m.dataset.ann, m);
    for (const s of v.bodyEl.querySelectorAll("sup[data-ann-ref]")) { s.textContent = `[${num(s.dataset.annRef)}]`; s.tabIndex = 0; s.setAttribute("role", "button"); }
    for (const m of marks.values()) { m.tabIndex = 0; m.setAttribute("role", "button"); }
    if (!marks.size) return;
    const own = host.canEdit();
    const list = [...marks.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    const sec = document.createElement("section");
    sec.className = "note-annotations"; sec.dataset.annotations = "";
    sec.innerHTML = `<h3>💬 ${escapeHtml(t("Annotations"))}</h3>` + list.map(([n, m]) =>
      `<div class="ann-item" data-ann-item="${n}" tabindex="0"><span class="ann-num">[${escapeHtml(num(n))}]</span>
        <div class="ann-main"><q class="ann-quote">${escapeHtml((m.textContent || "").trim())}</q><p class="ann-comment">${escapeHtml(m.getAttribute("data-ann-text") || "")}</p></div>
        ${own ? `<div class="ann-btns"><button type="button" class="secondary" data-ann-edit="${n}" aria-label="${escapeHtml(t("Edit this comment"))}" title="${escapeHtml(t("Edit this comment"))}">✏</button><button type="button" class="secondary" data-ann-del="${n}" aria-label="${escapeHtml(t("Remove this comment"))}" title="${escapeHtml(t("Remove this comment"))}">✕</button></div>` : ""}</div>`).join("");
    v.bodyEl.appendChild(sec);
  }
  function editAnnotation(v, note, n) {
    const m = [...(getNote(note.noteId) ? v.bodyEl.querySelectorAll("mark[data-ann]") : [])].find((x) => x.dataset.ann === String(n));
    if (host.flags?.on(getNote(note.noteId) ?? note, "finalised")) { host.status(FINALISED_SAY()); return; }
    if (!host.canEdit() || !host.ready()) return;
    const d = smallDialog("ann-edit", `✏ ${t("Edit this comment")} [${num(n)}]`, `
        <form data-ann-form class="tag-picker-new">
          <input type="text" maxlength="${NOTE_ANN_TEXT_MAX}" data-ann-input value="${escapeHtml(m?.getAttribute("data-ann-text") || "")}" aria-label="${escapeHtml(t("Comment"))}">
          <button type="submit" data-ann-save>${escapeHtml(t("Save"))}</button>
        </form>`);
    const input = d.q("[data-ann-input]");
    d.q("[data-ann-form]").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const text = input.value.replace(/\s+/g, " ").trim().slice(0, NOTE_ANN_TEXT_MAX);
      if (!text) { d.msg(t("Type the comment first.")); return; }
      const save = d.q("[data-ann-save]"); save.disabled = true;
      const ok = await reviseReadBody(v, note, (div) => {
        const mk = div.querySelector(`mark[data-ann="${n}"]`);
        if (!mk) return false;
        mk.setAttribute("data-ann-text", text);
      });
      if (ok) d.close(); else { save.disabled = false; d.msg(t("That did not save.")); }
    });
    input.focus(); input.select();
  }
  function removeAnnotation(v, note, n) {
    if (host.flags?.on(getNote(note.noteId) ?? note, "finalised")) { host.status(FINALISED_SAY()); return; }
    if (!host.canEdit() || !host.ready()) return;
    const d = smallDialog("ann-del", `✕ ${t("Remove this comment")} [${num(n)}]`, `
        <p>${escapeHtml(t("Remove this comment? The text stays."))}</p>
        <div class="note-actions"><button type="button" data-ann-confirm>${escapeHtml(t("Remove"))}</button><button type="button" class="secondary" data-dlg-close>${escapeHtml(t("Cancel"))}</button></div>`);
    d.q("[data-ann-confirm]").addEventListener("click", async () => {
      const ok = await reviseReadBody(v, note, (div) => {
        const mk = div.querySelector(`mark[data-ann="${n}"]`);
        if (!mk) return false;
        mk.replaceWith(...mk.childNodes);
        for (const s of div.querySelectorAll(`sup[data-ann-ref="${n}"]`)) s.remove();
        div.normalize();
      });
      if (ok) d.close(); else d.msg(t("That did not save."));
    });
  }

  // =====================================================================
  // A SPREADSHEET INSIDE A NOTE (item 44; Part C2). Stored in the Note's own bodyHtml as
  // div.mm-sheet[data-sheet] + a static snapshot table (note-sheet-engine.js / note-sheet-ui.js), so it needs no
  // new field and no Rules change, travels with the Note and is kept in Versions. In the editor the grid is live and
  // every change goes out through the ordinary autosave; the sanitiser rebuilds the sheet from its state on the
  // one save path, so the live grid itself is never saved. In the read view it is read-only.
  // =====================================================================
  function askConfirm(title, text, okLabel) {
    return new Promise((resolve) => {
      const d = smallDialog("sheet-ask", title, `<p>${escapeHtml(text)}</p>
        <div class="note-actions"><button type="button" data-ask-ok>${escapeHtml(okLabel)}</button><button type="button" class="secondary" data-dlg-close>${escapeHtml(t("Cancel"))}</button></div>`);
      d.q("[data-ask-ok]").addEventListener("click", () => { resolve(true); d.close(); });
      const watch = new MutationObserver(() => { if (!d.el.isConnected) { watch.disconnect(); resolve(false); } });
      watch.observe(document.body, { childList: true });
    });
  }
  const readSheetOpts = (note) => ({
    editable: false,
    refuse: () => (host.flags?.on(getNote(note.noteId) ?? note, "finalised") ? FINALISED_SAY() : t("Open the Note for editing to change the spreadsheet.")),
    status: (s) => host.status(s),
  });
  function mountEditSheets(v, body = editBodyEl(v)) {
    if (!body) return;
    mountSheets(body, {
      editable: true,
      onChange: () => { if (v.ed) onEditInput(v); },
      ask: askConfirm,
      refuse: () => (host.flags?.on(getNote(v.noteId), "finalised") ? FINALISED_SAY() : ""),
      status: (s) => host.status(s),
    });
  }
  /** ＋ Insert -> ⊞ Spreadsheet: a 5 by 4 grid at the caret (never inside another spreadsheet), with an empty line after it to type in. */
  function insertSheet(v) {
    const body = editBodyEl(v);
    if (!body) return;
    if (host.flags?.on(getNote(v.noteId), "finalised")) { host.status(FINALISED_SAY()); return; }
    closePanel(v);
    restoreRange(v);
    const sel = window.getSelection();
    const tpl = document.createElement("template");
    tpl.innerHTML = `${sheetInsertHtml()}<p><br></p>`;
    const nodes = [...tpl.content.childNodes];
    let range = sel.rangeCount && body.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
    const inside = range && (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement)?.closest(".mm-sheet");
    if (!range || inside) { range = document.createRange(); if (inside) range.setStartAfter(inside); else { range.selectNodeContents(body); range.collapse(false); } }
    range.collapse(true);
    // a caret in the middle of a paragraph: the sheet goes after that paragraph, never inside it
    const block = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement)?.closest("p,h1,h2,h3,h4,li,blockquote");
    if (block && body.contains(block) && block.parentElement === body) range.setStartAfter(block);
    range.collapse(true);
    for (const n of nodes.reverse()) range.insertNode(n);
    mountEditSheets(v, body);
    const p = nodes[nodes.length - 1];
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r);
    onEditInput(v);
  }

  /** 39: the status menu a heading's badge opens. */
  function openStatusMenu(v, note, idx) {
    const live = getNote(note.noteId) ?? note;
    if (host.flags?.on(live, "finalised")) { host.status(FINALISED_SAY()); return; }
    if (!host.canEdit() || !host.ready()) return;
    const sec = v.bodyEl.querySelector(`.note-sec[data-sec-index="${CSS.escape(String(idx))}"]`);
    const d = smallDialog("status", `${t("Status of this heading")}: ${sec?.dataset.headingText ?? ""}`, `
        <div class="status-presets">${Object.entries(STATUS_META).map(([k, [name, col]]) => `<button type="button" class="secondary status-opt" data-status-set="${k}"><span class="status-dot" style="background:${col}"></span>${escapeHtml(t(name))}</button>`).join("")}
          <button type="button" class="secondary status-opt" data-status-custom>${escapeHtml(t("Custom…"))}</button>
          <button type="button" class="secondary status-opt" data-status-clear>${escapeHtml(t("Clear"))}</button></div>
        <form data-status-form class="status-custom" hidden>
          <input type="text" maxlength="${NOTE_STATUS_LABEL_MAX}" data-status-label-input aria-label="${escapeHtml(t("Status label"))}" placeholder="${escapeHtml(t("Status label"))}">
          <div class="status-swatches" role="group" aria-label="${escapeHtml(t("Badge colour"))}">${NOTE_STATUS_COLOURS.map((c, i) => `<button type="button" class="status-swatch" data-status-colour-pick="${c}" aria-pressed="${i === 0}" aria-label="${c}" style="background:${c}"></button>`).join("")}</div>
          <button type="submit" data-status-save>${escapeHtml(t("Save"))}</button>
        </form>`);
    const apply = async (st, label, colour) => {
      const ok = await reviseReadBody(v, note, (div) => {
        const h = [...div.childNodes].filter((n) => n.nodeType === 1 && /^H[1-4]$/.test(n.tagName))[Number(idx)];
        if (!h) return false;
        for (const k of ["data-status", "data-status-label", "data-status-colour"]) h.removeAttribute(k);
        if (st) h.setAttribute("data-status", st);
        if (st === "custom") { h.setAttribute("data-status-label", label); h.setAttribute("data-status-colour", colour); }
      });
      if (ok) d.close(); else d.msg(t("That did not save."));
    };
    let colour = NOTE_STATUS_COLOURS[0];
    d.el.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.statusSet) apply(b.dataset.statusSet);
      else if ("statusClear" in b.dataset) apply(null);
      else if ("statusCustom" in b.dataset) { d.q("[data-status-form]").hidden = false; d.q("[data-status-label-input]").focus(); }
      else if (b.dataset.statusColourPick) {
        colour = b.dataset.statusColourPick;
        for (const s of d.el.querySelectorAll("[data-status-colour-pick]")) s.setAttribute("aria-pressed", String(s === b));
      }
    });
    d.q("[data-status-form]").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const label = d.q("[data-status-label-input]").value.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, NOTE_STATUS_LABEL_MAX);
      if (!label) { d.msg(t("Type a short label first.")); return; }
      apply("custom", label, colour);
    });
  }

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
        // Item 39: the status badge is drawn here, at view time, from the heading's own attributes -- it is never part of the saved body.
        const st = node.getAttribute("data-status");
        const look = st ? statusLook(st, node.getAttribute("data-status-label"), node.getAttribute("data-status-colour")) : null;
        if (look) { sec.dataset.status = st; sec.dataset.statusLabel = look[0]; sec.dataset.statusColour = look[1]; }
        if (look || host.canEdit()) {
          const badge = document.createElement(host.canEdit() ? "button" : "span");
          badge.className = look ? "note-status" : "note-status note-status-none";
          badge.dataset.statusBadge = String(index);
          badge.textContent = look ? look[0] : t("Set status");
          if (look) { badge.dataset.statusIs = st; badge.style.background = look[1]; }
          if (host.canEdit()) { badge.type = "button"; badge.setAttribute("aria-label", `${t("Status of this heading")}: ${badge.textContent}`); }
          h.appendChild(badge);
        }
        const body = document.createElement("div"); body.className = "note-sec-body";
        sec.append(h, body);
        stack[stack.length - 1].el.appendChild(sec);
        stack.push({ level, el: body });
        index++;
      } else {
        stack[stack.length - 1].el.appendChild(node);
      }
    }
    // Note-pane round 3 (item 22): a folded heading shows the start of what it hides, greyed, on one line.
    for (const sec of host_.querySelectorAll(".note-sec")) {
      const text = (sec.querySelector(":scope > .note-sec-body")?.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const peek = document.createElement("p");
      peek.className = "note-sec-peek";
      peek.dataset.secPeek = "";
      peek.textContent = text.length > 120 ? `${text.slice(0, 119)}…` : text;
      sec.querySelector(":scope > .note-sec-h").after(peek);
    }
    mountSheets(host_, readSheetOpts(note)); // item 44: read-only grids
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
      // while editing, only the text itself (never the heading controls beside it)
      // (a folded heading's grey preview line repeats its section's text: never a hit of its own)
      const walker = document.createTreeWalker(v.ed ? (editBodyEl(v) ?? v.bodyEl) : v.bodyEl, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest(".note-sec-peek, .mm-sheet") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
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

  // Tag ticks made while the Note is being EDITED: noteId -> the wanted Set of
  // tag ids, written when the edit's Done is pressed -- the same rule S10 gave
  // folder ticks (the Owner, 5 Oct 2026: finish what the Siyagah plan left
  // partly built; tags used to save at once even mid-edit).
  const stagedTags = new Map();
  const isEditingNote = (noteId) => allViews().some((x) => x.ed && x.ed.noteId === noteId);
  async function applyStagedTags(noteId) {
    const staged = stagedTags.get(noteId);
    stagedTags.delete(noteId);
    const tg = host.tagging;
    if (!staged || !tg?.ready()) return;
    const have = new Set(tg.noteTagIds(getNote(noteId)));
    try {
      for (const id of staged) if (!have.has(id)) await tg.tag(getNote(noteId), id);
      for (const id of have) if (!staged.has(id)) await tg.untag(getNote(noteId), id);
    } catch (err) { host.status(err?.message || t("That did not save.")); } // I15
    rerenderNoteEverywhere(noteId);
  }
  /** The tag ids a picker should show ticked: the held set while editing, else what is stored. */
  function shownTagIds(noteId) {
    const tg = host.tagging;
    return isEditingNote(noteId) && stagedTags.has(noteId) ? stagedTags.get(noteId) : new Set(tg.noteTagIds(getNote(noteId)));
  }
  /** While editing, a tick is only held (returns true); otherwise the caller writes it at once (returns false). */
  function holdTagTick(noteId, tagId, on) {
    if (!isEditingNote(noteId)) return false;
    const want = new Set(shownTagIds(noteId));
    if (on) want.add(tagId); else want.delete(tagId);
    stagedTags.set(noteId, want);
    return true;
  }

  /** The tags half of 📎 (S11): tick/untick the owner's tags and add a new one, inside `container`. Same host.tagging calls as the 🏷 picker. While the Note is being edited, ticks are held and saved with the edit's Done. */
  function mountTags(container, noteId) {
    const tg = host.tagging;
    if (!tg) return null;
    container.innerHTML = `<h3 class="at-head">🏷 ${escapeHtml(t("Tags"))}</h3>
      <p class="note gate-note" data-at-gate role="status" hidden>${escapeHtml(t("Tags switch on once the new Firebase Rules are published."))}</p>
      <p class="tag-picker-msg" data-at-msg role="alert" hidden></p>
      <p class="note" data-at-staged hidden>${escapeHtml(t("You are editing this Note: tag changes are saved when you press Done."))}</p>
      <div class="at-list" data-at-list></div>
      <div class="tag-picker-new"><input type="text" maxlength="100" data-at-new-name placeholder="${escapeHtml(t("New tag name"))}" aria-label="${escapeHtml(t("New tag name"))}"><button type="button" class="secondary" data-at-new>＋ ${escapeHtml(t("New tag"))}</button></div>`;
    const q = (sel) => container.querySelector(sel);
    const live = () => getNote(noteId);
    const msg = (text) => { const m = q("[data-at-msg]"); m.textContent = text || ""; m.hidden = !text; };
    const paint = () => {
      const on = tg.ready();
      q("[data-at-gate]").hidden = on;
      const editing = isEditingNote(noteId);
      q("[data-at-staged]").hidden = !editing;
      const ids = shownTagIds(noteId);
      const all = tg.tags();
      q("[data-at-list]").innerHTML = all.length
        ? all.map((g) => `<label class="tag-pick-row"><input type="checkbox" data-at-pick="${escapeHtml(g.id)}" ${ids.has(g.id) ? "checked" : ""} ${on ? "" : "disabled"}><span class="tag-dot" aria-hidden="true"${g.color ? ` style="background:${escapeHtml(g.color)}"` : ""}></span><span class="tag-pick-name">${escapeHtml(g.name)}</span></label>`).join("")
        : `<p class="note">${escapeHtml(t("You have no tags yet. Type a name below to make one."))}</p>`;
      q("[data-at-new-name]").disabled = !on; q("[data-at-new]").disabled = !on;
    };
    q("[data-at-list]").addEventListener("change", async (e) => {
      const box = e.target.closest("[data-at-pick]");
      if (!box || !tg.ready()) return;
      msg("");
      if (holdTagTick(noteId, box.dataset.atPick, box.checked)) { paint(); return; } // held until Done
      box.disabled = true;
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
      try {
        const id = await tg.create(name); input.value = "";
        if (id && !holdTagTick(noteId, id, true)) await tg.tag(live(), id);
      }
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
    ensureSettings();
    const before = v.scrollEl.scrollTop;
    v.el.querySelector("[data-pane-title]").textContent = noteTitleOf(note);
    v.el.querySelector("[data-pane-meta]").textContent = paneMetaText(note);
    v.el.querySelector("[data-pane-chips]").innerHTML = (host.chips?.(note) ?? []).map((f) =>
      `<button type="button" class="folder-chip" data-pane-chip="${escapeHtml(f.id)}">📁 ${escapeHtml(f.label)}</button>`).join("") + tagChipsHtml(note);
    // While an edit is open the editor IS the body: a re-render must never wipe the reader's typing.
    if (!(v.ed && v.ed.noteId === note.noteId)) { showReadChrome(v, note); buildBody(v, note); paintAnnotations(v); paintLinks(v, note); paintPreviews(v); if (!findBarOf(v).hidden) runFind(v, { keep: true }); }
    if (v.kind === "window") { paintPinned(v, note); paintToc(v); v.win.querySelector(".nw-title").textContent = noteTitleOf(note); v.win.dataset.noteId = note.noteId; updateWindowSwitcher(); }
    paintVersionLine(v, note);
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

  /** ✏️ Edit, a long press / right-click on the title: begin editing (the owner only; never a finalised Note). */
  function beginEdit(v, note) {
    if (v.ed) return false;
    if (host.flags?.on(note, "finalised")) { host.status(t("This Note is finalised, so it can't be edited. Un-finalise it from the ⋯ menu first.")); return false; }
    if (!host.canEdit()) return false;
    stagedTags.delete(note.noteId); host.onEditStart?.(v, note); startEdit(v, note);
    return !!v.ed;
  }
  /** ✓ Done, and Esc while editing (item 20): the edit is written, then what was staged with it. */
  async function finishEdit(v) {
    const note = getNote(v.noteId);
    if (!v.ed || !note) return;
    const done = await endEdit(v);
    await host.onEditDone?.(v, note); // S10: ticks staged in the folder picker are written now, with the edit
    await applyStagedTags(note.noteId); // ...and so are the tag ticks
    renderView(v, { keepScroll: true });
    if (done?.conflict) await host.refresh(); // show what the other device wrote; the draft is offered back
    v.el.querySelector("[data-pane-bar] > [data-pane-edit-toggle]:not([hidden])")?.focus({ preventScroll: true });
  }

  // =====================================================================
  // NOTE-PANE ROUND 2 (the Owner, 5 Oct 2026: "add all functions of the
  // notepane of Siyagah"; items 14-18 of
  // docs/reference/2026-10-05-siyagah-note-pane-port-list.md). Rename is a
  // revision through the page's own save (host.revise), the same as typing a
  // new title; Make a copy is the page's (host.copyNote); Copy section and the
  // tag list read only what is on screen and write nothing.
  // =====================================================================
  /** What a long press / right-click at `target` would do: "title", "section", or null. */
  function pressTarget(v, target) {
    const note = getNote(v.noteId);
    if (!note || v.ed) return null;
    if ((target.closest?.("[data-pane-title]") || (v.win && target.closest?.(".nw-bar .nw-title"))) && host.canEdit()) return "title";
    if (target.closest?.(".note-sec-h") && v.bodyEl.contains(target)) return "section";
    return null;
  }
  function pressAction(v, target, x, y) {
    const kind = pressTarget(v, target);
    if (kind === "title") { if (beginEdit(v, getNote(v.noteId))) { v.editTitleEl.focus(); v.editTitleEl.setSelectionRange(v.editTitleEl.value.length, v.editTitleEl.value.length); } return true; }
    if (kind === "section") { openSectionMenu(v, target.closest(".note-sec"), x, y); return true; }
    return false;
  }

  /** A small dialog on the page (above every window), shaped like the tag picker. Returns { el, q, msg, close }. */
  function smallDialog(kind, title, inner) {
    document.querySelector(`[data-note-dialog="${kind}"]`)?.remove();
    const el = document.createElement("div");
    el.className = "tag-picker";
    el.dataset.noteDialog = kind;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = `<div class="tag-picker-card">
        <div class="tag-picker-head"><strong>${escapeHtml(title)}</strong><button type="button" class="secondary tag-picker-close" data-dlg-close aria-label="${escapeHtml(t("Close"))}">✕</button></div>
        <p class="tag-picker-msg" data-dlg-msg role="alert" hidden></p>${inner}</div>`;
    document.body.appendChild(el);
    const back = document.activeElement;
    const close = () => { el.remove(); if (back?.isConnected) back.focus?.({ preventScroll: true }); };
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-dlg-close]")) close(); });
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } });
    const q = (sel) => el.querySelector(sel);
    const msg = (text) => { const m = q("[data-dlg-msg]"); m.textContent = text || ""; m.hidden = !text; };
    return { el, q, msg, close };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Part C3 (decisions 72, 80) -- 🧰 My Note tools: tab groups (34), templates (36), quick phrases (37), heading styles (40).
  // Everything here is the PERSON's own, kept in userPrefs/{uid}.mmsaNotes (js/note-user-settings.js) and so the same on
  // every device. None of it is saved into a Note, and nothing here ever deletes a Note.
  // ---------------------------------------------------------------------------------------------------------------
  const TOOL_SECTIONS = [["tabs", "Tabs"], ["templates", "Templates"], ["phrases", "Phrases"], ["headings", "Headings"]];
  const colourName = (hex) => PALETTE.find((p) => p[0] === hex)?.[1] ?? "";
  const newTemplateId = () => `tpl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  /** One save of one part, with its failure said in words (I15). Resolves true when it saved. */
  async function saveSetting(d, part, value) {
    try { await S().set(part, value); d.msg(""); return true; }
    catch (err) { d.msg(t("That could not be saved to your account: {why}", { why: err?.message || String(err) })); return false; }
  }
  function swatchRow(attr, level, current) {
    const chips = PALETTE.map(([hex, name]) => `<button type="button" class="secondary mt-chip" ${attr}="${level}" data-mt-hex="${hex}" aria-pressed="${current === hex}" aria-label="${escapeHtml(t(name))}" title="${escapeHtml(t(name))}" style="background:${hex}"></button>`).join("");
    return `${chips}<button type="button" class="secondary mt-chip mt-none" ${attr}="${level}" data-mt-hex="" aria-pressed="${!current}" aria-label="${escapeHtml(t("No colour"))}" title="${escapeHtml(t("No colour"))}">⊘</button>`;
  }
  function toolsSectionHtml(v, sec, state, confirmId) {
    const e = (s) => escapeHtml(s);
    if (sec === "tabs") {
      const rows = state.tabs.map((tab, i) => {
        const n = getNote(tab.noteId);
        const gone = !n || host.isRetired(n);
        return `<div class="mt-row" data-mt-tab="${i}"><button type="button" class="secondary mt-open" data-mt-open="${e(tab.noteId)}" ${gone ? "disabled" : ""} style="border-inline-start:8px solid ${tab.colour || "transparent"}">${e(tab.name || (n ? noteTitleOf(n) : t("(untitled)")))}</button>
          <input type="text" maxlength="${SETTING_LIMITS.tabName}" data-mt-tabname="${i}" value="${e(tab.name)}" aria-label="${e(t("Tab name"))}" placeholder="${e(t("Tab name"))}">
          <select data-mt-tabcolour="${i}" aria-label="${e(t("Tab colour"))}"><option value="">${e(t("No colour"))}</option>${PALETTE.map(([hex, name]) => `<option value="${hex}" ${tab.colour === hex ? "selected" : ""}>${e(t(name))}</option>`).join("")}</select>
          <button type="button" class="secondary mt-del" data-mt-tabdel="${i}" aria-label="${e(t("Remove this tab"))}" title="${e(t("Remove this tab"))}">✕</button></div>`;
      }).join("");
      const here = getNote(v.noteId);
      const already = here && state.tabs.some((x) => x.noteId === here.noteId);
      return `<p class="note">${e(t("Your tabs are the same on every device you sign in on. Removing a tab never removes the Note."))}</p>${rows || `<p class="note">${e(t("No tabs yet."))}</p>`}
        <button type="button" data-mt-tabadd ${here && !already && state.tabs.length < SETTING_LIMITS.tabs ? "" : "disabled"}>＋ ${e(t("Add Tab"))}</button>`;
    }
    if (sec === "templates") {
      const rows = state.templates.map((tpl, i) => `<div class="mt-row" data-mt-tpl="${i}">
          <input type="text" maxlength="${SETTING_LIMITS.templateTitle}" data-mt-tplname="${i}" value="${e(tpl.title)}" aria-label="${e(t("Template name"))}">
          ${host.newNote && host.canEdit() ? `<button type="button" class="secondary" data-mt-tplnew="${i}">${e(t("New note from this"))}</button>` : ""}
          ${confirmId === tpl.id
            ? `<button type="button" data-mt-tpldel="${i}" data-mt-yes>${e(t("Yes, remove this template"))}</button><button type="button" class="secondary" data-mt-tplcancel>${e(t("Keep it"))}</button>`
            : `<button type="button" class="secondary mt-del" data-mt-tplask="${i}" aria-label="${e(t("Remove this template"))}" title="${e(t("Remove this template"))}">✕</button>`}</div>`).join("");
      const here = getNote(v.noteId);
      return `<p class="note">${e(t("A template is a copy of a Note's text to start new Notes from. Removing one never removes a Note."))}</p>${rows || `<p class="note">${e(t("No templates yet."))}</p>`}
        <button type="button" data-mt-tplsave ${here && state.templates.length < SETTING_LIMITS.templates ? "" : "disabled"}>💾 ${e(t("Save this Note as a template"))}</button>`;
    }
    if (sec === "phrases") {
      const rows = state.phrases.map((p, i) => `<div class="mt-row" data-mt-phrase="${i}"><input type="text" maxlength="${SETTING_LIMITS.phrase}" data-mt-phrasetext="${i}" value="${e(p)}" aria-label="${e(t("Phrase"))}">
          <button type="button" class="secondary mt-del" data-mt-phrasedel="${i}" aria-label="${e(t("Remove this phrase"))}" title="${e(t("Remove this phrase"))}">✕</button></div>`).join("");
      return `<p class="note">${e(t("Tap 📝 in the editing toolbar to put one of these into a Note."))}</p>${rows || `<p class="note">${e(t("No phrases yet."))}</p>`}
        <form class="mt-row" data-mt-phraseform><input type="text" maxlength="${SETTING_LIMITS.phrase}" data-mt-phrasenew aria-label="${e(t("New phrase"))}" placeholder="${e(t("New phrase"))}" ${state.phrases.length >= SETTING_LIMITS.phrases ? "disabled" : ""}><button type="submit" ${state.phrases.length >= SETTING_LIMITS.phrases ? "disabled" : ""}>${e(t("Add phrase"))}</button></form>`;
    }
    const lv = [1, 2, 3, 4].map((n) => {
      const s = state.headingStyles[`h${n}`] ?? { border: "", bg: "" };
      return `<div class="mt-head" data-mt-level="${n}"><strong>H${n}</strong>
        <div class="mt-swatches" role="group" aria-label="${e(t("Border colour"))} H${n}"><span class="mt-lab">${e(t("Border"))}</span>${swatchRow("data-mt-border", n, s.border)}</div>
        <div class="mt-swatches" role="group" aria-label="${e(t("Background colour"))} H${n}"><span class="mt-lab">${e(t("Background"))}</span>${swatchRow("data-mt-bg", n, s.bg)}</div></div>`;
    }).join("");
    return `<p class="note">${e(t("These show on every Note you read, on every device. They are not saved into any Note."))}</p>${lv}`;
  }
  function openTools(v, note, section = "tabs") {
    if (!S()) return;
    const d = smallDialog("mytools", `🧰 ${t("My Note tools")}`, `<div class="mt-nav" role="tablist" aria-label="${escapeHtml(t("My Note tools"))}">${TOOL_SECTIONS.map(([k, name]) => `<button type="button" class="secondary mt-sec" role="tab" data-mt-sec="${k}" aria-selected="false">${escapeHtml(t(name))}</button>`).join("")}</div><div class="mt-body" data-mt-body></div>`);
    let sec = section, confirmId = null;
    const draw = () => {
      for (const b of d.el.querySelectorAll("[data-mt-sec]")) b.setAttribute("aria-selected", String(b.dataset.mtSec === sec));
      d.q("[data-mt-body]").innerHTML = toolsSectionHtml(v, sec, S().get(), confirmId);
    };
    draw();
    d.el.classList.add("mt-dialog");
    const st = () => S().get();
    d.el.addEventListener("click", async (ev) => {
      const on = (sel) => ev.target.closest(sel);
      const s = on("[data-mt-sec]"); if (s) { sec = s.dataset.mtSec; confirmId = null; d.msg(""); draw(); return; }
      const open = on("[data-mt-open]");
      if (open) { const n = getNote(open.dataset.mtOpen); if (n && !host.isRetired(n)) { d.close(); openWindow(n.noteId); } else d.msg(t("That Note is not available.")); return; }
      if (on("[data-mt-tabadd]")) {
        const here = getNote(v.noteId); if (!here) return;
        if (await saveSetting(d, "tabs", [...st().tabs, { noteId: here.noteId, name: cleanSettingText(noteTitleOf(here), SETTING_LIMITS.tabName), colour: "" }])) draw();
        return;
      }
      const tdel = on("[data-mt-tabdel]"); if (tdel) { const i = Number(tdel.dataset.mtTabdel); if (await saveSetting(d, "tabs", st().tabs.filter((_, k) => k !== i))) draw(); return; }
      if (on("[data-mt-tplsave]")) {
        const here = getNote(v.noteId); if (!here) return;
        const title = cleanSettingText(here.title?.trim() || t("(untitled)"), SETTING_LIMITS.templateTitle);
        const list = [...st().templates, { id: newTemplateId(), title, bodyHtml: here.bodyHtml ?? "" }];
        const before = st().templates.length;
        const ok = await saveSetting(d, "templates", list);
        if (ok && st().templates.length === before) d.msg(t("That Note is too long to keep as a template (20 KB at most)."));
        else if (ok) { d.msg(""); host.status(t('Saved "{title}" as a template.', { title })); }
        draw(); return;
      }
      const ask = on("[data-mt-tplask]"); if (ask) { confirmId = st().templates[Number(ask.dataset.mtTplask)]?.id ?? null; draw(); d.q("[data-mt-yes]")?.focus(); return; }
      if (on("[data-mt-tplcancel]")) { confirmId = null; draw(); return; }
      const tdl = on("[data-mt-tpldel]"); if (tdl) { const i = Number(tdl.dataset.mtTpldel); confirmId = null; if (await saveSetting(d, "templates", st().templates.filter((_, k) => k !== i))) draw(); return; }
      const tn = on("[data-mt-tplnew]"); if (tn) { const tpl = st().templates[Number(tn.dataset.mtTplnew)]; if (tpl) { d.close(); host.newNote(v, tpl); } return; }
      const pdel = on("[data-mt-phrasedel]"); if (pdel) { const i = Number(pdel.dataset.mtPhrasedel); if (await saveSetting(d, "phrases", st().phrases.filter((_, k) => k !== i))) draw(); return; }
      const hex = on("[data-mt-hex]");
      if (hex) {
        const isBorder = hex.hasAttribute("data-mt-border"), level = Number(hex.getAttribute(isBorder ? "data-mt-border" : "data-mt-bg"));
        const cur = st().headingStyles[`h${level}`] ?? { border: "", bg: "" };
        const next = { ...st().headingStyles, [`h${level}`]: { ...cur, [isBorder ? "border" : "bg"]: hex.dataset.mtHex } };
        if (await saveSetting(d, "headingStyles", next)) { paintHeadingStyles(); draw(); }
      }
    });
    d.el.addEventListener("change", async (ev) => {
      const el = ev.target;
      if (el.matches("[data-mt-tabname]")) { const i = Number(el.dataset.mtTabname); if (await saveSetting(d, "tabs", st().tabs.map((x, k) => (k === i ? { ...x, name: el.value } : x)))) draw(); }
      else if (el.matches("[data-mt-tabcolour]")) { const i = Number(el.dataset.mtTabcolour); if (await saveSetting(d, "tabs", st().tabs.map((x, k) => (k === i ? { ...x, colour: el.value } : x)))) draw(); }
      else if (el.matches("[data-mt-tplname]")) { const i = Number(el.dataset.mtTplname); if (await saveSetting(d, "templates", st().templates.map((x, k) => (k === i ? { ...x, title: el.value } : x)))) draw(); }
      else if (el.matches("[data-mt-phrasetext]")) { const i = Number(el.dataset.mtPhrasetext); if (await saveSetting(d, "phrases", st().phrases.map((x, k) => (k === i ? el.value : x)))) draw(); }
    });
    d.el.addEventListener("submit", async (ev) => {
      if (!ev.target.matches("[data-mt-phraseform]")) return;
      ev.preventDefault();
      const input = ev.target.querySelector("[data-mt-phrasenew]");
      if (!cleanSettingText(input.value, SETTING_LIMITS.phrase)) { d.msg(t("Type a phrase first.")); return; }
      if (await saveSetting(d, "phrases", [...st().phrases, input.value])) { draw(); d.q("[data-mt-phrasenew]")?.focus(); }
    });
    d.q("[data-mt-sec][aria-selected=true]")?.focus();
  }
  /** ✚ with templates: a blank Note, or one started from a template. Without templates ✚ makes a blank Note at once, as before. */
  function openNewMenu(v) {
    const list = S().get().templates;
    const d = smallDialog("newtpl", `✚ ${t("New note")}`, `<div class="mt-body">
        <button type="button" data-nt-blank>${escapeHtml(t("A blank Note"))}</button>
        ${list.map((tpl, i) => `<button type="button" class="secondary" data-nt-tpl="${i}">📄 ${escapeHtml(tpl.title || t("(untitled)"))}</button>`).join("")}
        <button type="button" class="secondary" data-nt-manage>🧰 ${escapeHtml(t("Manage templates…"))}</button></div>`);
    d.el.classList.add("mt-dialog");
    d.el.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-nt-blank]")) { d.close(); host.newNote?.(v); return; }
      const b = ev.target.closest("[data-nt-tpl]"); if (b) { const tpl = S().get().templates[Number(b.dataset.ntTpl)]; d.close(); host.newNote?.(v, tpl); return; }
      if (ev.target.closest("[data-nt-manage]")) { d.close(); openTools(v, getNote(v.noteId), "templates"); }
    });
    d.q("[data-nt-blank]")?.focus();
  }
  function insertPhrase(v, i) {
    const p = S()?.get().phrases[i];
    if (p === undefined) return;
    restoreRange(v);
    document.execCommand("insertText", false, p);
    closePanel(v); onEditInput(v);
  }

  /** Item 14 -- ⋯ Rename: a new title without opening the editor. While editing, the title box is the place. */
  function renameNote(v, note) {
    if (v.ed) { v.editTitleEl.focus(); v.editTitleEl.select(); return; }
    if (host.flags?.on(note, "finalised")) { host.status(t("This Note is finalised, so it can't be edited. Un-finalise it from the ⋯ menu first.")); return; }
    if (!host.ready()) return;
    const d = smallDialog("rename", `✏️ ${t("Rename")}`, `
        <form data-rename-form class="tag-picker-new">
          <input type="text" maxlength="300" data-rename-input value="${escapeHtml(note.title ?? "")}" aria-label="${escapeHtml(t("Note title"))}">
          <button type="submit" data-rename-save>${escapeHtml(t("Save"))}</button>
        </form>`);
    const input = d.q("[data-rename-input]");
    d.q("[data-rename-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const live = getNote(note.noteId) ?? note;
      const title = input.value.trim();
      if (title === (live.title ?? "").trim()) { d.close(); return; }
      const save = d.q("[data-rename-save]");
      save.disabled = true; d.msg("");
      const bodyHtml = live.bodyHtml ?? "";
      try {
        const newId = await host.revise({ note: live, expectedRevisionId: live.currentRevisionId, title, bodyHtml });
        Object.assign(live, { title, currentRevisionId: newId, updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() } });
        host.afterRevise(live);
        rerenderNoteEverywhere(live.noteId);
        d.close();
        host.status(t('Renamed to "{title}".', { title: title || t("(untitled)") }));
      } catch (err) {
        save.disabled = false;
        console.error("[note rename]", err);
        d.msg(err?.message === "Stale Note revision." ? t("This Note changed on another device. Reload it, then try again.") : (err?.message || t("That did not save.")));
      }
    });
    input.focus(); input.select();
  }

  /** Item 15 -- ⋯ Make a copy: what is typed is saved first, then the page makes the copy; it opens where the original was. */
  async function duplicateNote(v, note) {
    if (!host.copyNote || !host.ready()) return;
    if (v.ed) await flushEdit(v.ed);
    const live = getNote(note.noteId) ?? note;
    const newId = await host.copyNote(live);
    if (!newId || !getNote(newId)) return;
    if (v.kind === "pane") openPane(newId); else openWindow(newId, { folderId: v.folderId });
  }

  /** Item 17 -- the section under a read-view heading, as clean HTML (with or without the heading) and as plain text. */
  function sectionContent(sec, withHeading) {
    const out = document.createElement("div");
    const walk = (s, withH) => {
      if (withH) {
        const h = document.createElement(`h${s.dataset.level}`);
        h.innerHTML = s.querySelector(":scope > .note-sec-h .note-sec-text")?.innerHTML ?? "";
        out.appendChild(h);
      }
      for (const n of s.querySelector(":scope > .note-sec-body")?.childNodes ?? []) {
        if (n.nodeType === 1 && n.classList.contains("note-sec")) walk(n, true); else out.appendChild(n.cloneNode(true));
      }
    };
    walk(sec, withHeading);
    for (const m of out.querySelectorAll("mark.note-find-hit")) m.replaceWith(...m.childNodes);
    const html = sanitizeNoteHtml(out.innerHTML);
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:600px;opacity:0;white-space:normal";
    probe.innerHTML = html;
    document.body.appendChild(probe);
    const text = (probe.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
    probe.remove();
    return { html, text };
  }
  async function copySection(v, sec, withHeading) {
    const { html, text } = sectionContent(sec, withHeading);
    let ok = false;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
        ok = true;
      }
    } catch { /* not allowed here: try the older way */ }
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
    }
    host.status(ok ? t("Section copied.") : t("Could not copy. Select the text and copy it yourself.")); // I15
    return ok;
  }
  let secMenu = null;
  function closeSectionMenu() { if (secMenu) { document.removeEventListener("pointerdown", secMenu.__away, true); secMenu.remove(); secMenu = null; } }
  function openSectionMenu(v, sec, x, y) {
    closeSectionMenu();
    if (!sec) return;
    const el = document.createElement("div");
    el.className = "note-sec-menu";
    el.dataset.secMenu = "";
    el.setAttribute("role", "menu");
    el.setAttribute("aria-label", t("Copy section"));
    el.innerHTML = `<button type="button" role="menuitem" class="secondary" data-sec-copy="with">📋 ${escapeHtml(t("Copy section with heading"))}</button>
      <button type="button" role="menuitem" class="secondary" data-sec-copy="without">📋 ${escapeHtml(t("Copy section"))}</button>`;
    document.body.appendChild(el);
    secMenu = el;
    const r = el.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
    el.style.left = `${Math.max(8, Math.min(x, vw - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(y, vh - r.height - 8))}px`;
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sec-copy]");
      if (!b) return;
      closeSectionMenu();
      copySection(v, sec, b.dataset.secCopy === "with");
    });
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeSectionMenu(); } });
    el.__away = (e) => { if (!el.contains(e.target)) closeSectionMenu(); };
    document.addEventListener("pointerdown", el.__away, true);
    el.querySelector("button").focus();
  }

  /** Item 18 -- a tag chip: every Note with that tag (in Trash excepted); tapping one shows it in this view. */
  function openTagNotes(v, tagId) {
    const tg = host.tagging;
    const tag = tg.tags().find((g) => g.id === tagId);
    if (!tag) return;
    const rows = host.notes().filter((n) => !host.isRetired(n) && tg.noteTagIds(n).includes(tagId))
      .sort((a, b) => noteTitleOf(a).localeCompare(noteTitleOf(b)));
    const order = rows.map((n) => n.noteId);
    const d = smallDialog("tag-notes", `🏷 ${tag.name}`, `
        <div class="tag-picker-list" data-tag-notes-list>${rows.map((n) => `<button type="button" class="secondary" data-tag-notes-open="${escapeHtml(n.noteId)}" aria-current="${n.noteId === v.noteId}" style="min-height:44px;width:100%;text-align:start">${escapeHtml(noteTitleOf(n))}</button>`).join("")}</div>`);
    d.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tag-notes-open]");
      if (!b) return;
      d.close();
      showNoteIn(v, b.dataset.tagNotesOpen, order);
    });
    d.q("[data-tag-notes-open]")?.focus();
  }

  async function onViewClick(v, e) {
    const on = (sel) => e.target.closest(sel);
    const note = getNote(v.noteId);
    if (!note) return;
    if (on("[data-pane-edit-toggle]")) {
      closeAllBarPalettes(null);
      if (!v.ed) beginEdit(v, note); else await finishEdit(v);
      return;
    }
    if (on("[data-pane-rename]")) { closeAllBarPalettes(null); renameNote(v, note); return; }
    if (on("[data-pane-duplicate]")) { closeAllBarPalettes(null); duplicateNote(v, note); return; }
    const tagChip = on("[data-tag-chip]");
    if (tagChip && host.tagging) { openTagNotes(v, tagChip.dataset.tagChip); return; }
    const tbTab = on("[data-edit-toolbar] [data-tb-tab]");
    if (tbTab && v.ed) { v.tbOpen = Number(tbTab.dataset.tbTab); fitToolbar(v); return; }
    const cmdBtn = on("[data-edit-toolbar] [data-cmd]");
    if (cmdBtn) { closeAllBarPalettes(null); runEditCommand(v, cmdBtn.dataset.cmd); return; }
    if (v.ed) { // S12: the editor's panel and heading controls
      if (on("[data-panel-close]")) { closePanel(v); editBodyEl(v)?.focus(); return; }
      if (on("[data-panel-apply]")) { applyLink(v); return; }
      if (on("[data-panel-ann-apply]")) { applyAnnotation(v); return; }
      if (on("[data-panel-unlink]")) { removeLink(v); return; }
      if (on("[data-table-insert]")) { insertTable(v); return; }
      const top = on("[data-table-op]"); if (top) { tableOp(v, top.dataset.tableOp); return; }
      const pin = on("[data-phrase-insert]"); if (pin) { insertPhrase(v, Number(pin.dataset.phraseInsert)); return; }
      if (on("[data-phrase-manage]")) { openTools(v, note, "phrases"); return; }
      const sw = on("[data-swatch]"); if (sw) { applySwatch(v, sw.dataset.swatch, sw.dataset.swatchMode); return; }
      const sl = on("[data-spacing-line]"); if (sl) { applySpacing(v, "line", sl.dataset.spacingLine); return; }
      const sa = on("[data-spacing-after]"); if (sa) { applySpacing(v, "after", sa.dataset.spacingAfter); return; }
      const pc = on("[data-paste-choice]"); if (pc) { finishPaste(v, pc.dataset.pasteChoice); return; }
      const fb = on("[data-sec-fold]"); if (fb) { toggleFold(v, fb.__h); return; }
    }
    if (on("[data-draft-restore]")) { const d = loadDraft(note.noteId); if (d && host.canEdit()) startEdit(v, note, d); return; }
    if (on("[data-draft-discard]")) { clearDraft(note.noteId); v.draftOfferEl.hidden = true; return; }
    if (on("[data-pane-back]")) { closePane(); return; }
    if (on("[data-pane-previews]")) { closeAllBarPalettes(null); togglePreviews(v); return; }
    if (on("[data-pane-mytools]")) { closeAllBarPalettes(null); openTools(v, note); return; }
    if (on("[data-pane-new]")) { if (S() && S().get().templates.length) openNewMenu(v); else host.newNote?.(v); return; }
    if (on("[data-pane-prev]")) { closeAllBarPalettes(null); step(v, -1); return; }
    if (on("[data-pane-next]")) { closeAllBarPalettes(null); step(v, 1); return; }
    if (on("[data-win-ver]")) { if (note && host.versions) openVersions(v, note); return; }
    if (on("[data-win-pins-toggle]")) { setPinsOpen(v, !v.pinsOpen); return; }
    if (on("[data-win-details]")) { const d = v.win.querySelector(".nw-details"); const open = d.classList.toggle("open"); on("[data-win-details]").setAttribute("aria-expanded", String(open)); saveDetailsOpen(open); return; }
    if (on("[data-pane-popout]")) { closeAllBarPalettes(null); popOutPane(note); return; }
    if (on("[data-pane-find-toggle]")) { closeAllBarPalettes(null); if (findBarOf(v).hidden) openFind(v); else closeFind(v); return; }
    if (on("[data-find-prev]")) { stepFind(v, v.find.idx - 1); return; }
    if (on("[data-find-next]")) { stepFind(v, v.find.idx + 1); return; }
    if (on("[data-find-close]")) { closeFind(v); return; }
    if (on("[data-pane-foldall]")) { closeAllBarPalettes(null); if (v.ed) foldAllEditing(v); else foldAll(v, note); return; }
    if (on("[data-pane-attach]")) { closeAllBarPalettes(null); host.attach?.(v, note); return; }
    if (on("[data-pane-versions]")) { closeAllBarPalettes(null); openVersions(v, note); return; }
    if (on("[data-pane-tags]")) { closeAllBarPalettes(null); openTagPicker(note); return; }
    const flagBtn = on("[data-pane-flag]");
    if (flagBtn && host.flags) {
      closeAllBarPalettes(null);
      const key = flagBtn.dataset.paneFlag;
      if (key === "finalised" && !host.flags.on(note, key) && v.ed) await endEdit(v); // a pending edit becomes a revision BEFORE the Note closes
      const done = await host.flags.set(note, key, !host.flags.on(note, key));
      if (done) rerenderNoteEverywhere(note.noteId);
      return;
    }
    if (on("[data-pane-link]") && host.flags) { closeAllBarPalettes(null); openLinkPicker(note); return; }
    const linkOpen = on("[data-link-open]");
    if (linkOpen && host.flags) { host.flags.open(linkOpen.dataset.linkOpen); return; }
    const linkRemove = on("[data-link-remove]");
    if (linkRemove && host.flags) {
      const done = await host.flags.unlink(note, linkRemove.dataset.linkRemove);
      if (done) for (const x of allViews()) if (x.noteId) renderView(x, { keepScroll: true });
      return;
    }
    const chip = on("[data-pane-chip]");
    if (chip) { host.onChip?.(v, chip.dataset.paneChip); return; }
    if (!v.ed) { // Part C1: annotations (38) and heading status (39), read view only
      const ref = on("mark[data-ann], sup[data-ann-ref]");
      if (ref && v.bodyEl.contains(ref)) { revealIn(v, v.bodyEl.querySelector(`[data-ann-item="${CSS.escape(ref.dataset.ann || ref.dataset.annRef)}"]`)); return; }
      const annEdit = on("[data-ann-edit]"); if (annEdit) { editAnnotation(v, note, annEdit.dataset.annEdit); return; }
      const annDel = on("[data-ann-del]"); if (annDel) { removeAnnotation(v, note, annDel.dataset.annDel); return; }
      const annItem = on("[data-ann-item]");
      if (annItem && v.bodyEl.contains(annItem)) { revealIn(v, v.bodyEl.querySelector(`mark[data-ann="${CSS.escape(annItem.dataset.annItem)}"]`)); return; }
      const badge = on("button[data-status-badge]"); if (badge) { openStatusMenu(v, note, badge.dataset.statusBadge); return; }
    }
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
    if (jump) { closeAllBarPalettes(null); jumpToSection(v, jump.dataset.paneJump); return; }
    if (host.onMenu?.(v, note, on)) closeAllBarPalettes(null);
  }

  /** Contents (the bar's ☰ and the window's side panel): open the section and every folded one around it, then go there. */
  function jumpToSection(v, idx) {
    const sec = v.el.querySelector(`.note-sec[data-sec-index="${CSS.escape(String(idx))}"]`);
    for (let up = sec?.parentElement?.closest(".note-sec"); up; up = up.parentElement?.closest(".note-sec")) {
      if (up.classList.contains("collapsed")) up.querySelector(":scope > .note-sec-h [data-sec-toggle]")?.click();
    }
    if (sec?.classList.contains("collapsed")) sec.querySelector(":scope > .note-sec-h [data-sec-toggle]")?.click();
    sec?.scrollIntoView({ block: "start" });
  }
  const TOC_MIN_W = 760, TOC_MIN_HEADINGS = 3;
  /** Item 27: the side Contents of a window, shown only when the window is wide, not a sheet, and the Note has 3+ headings (read view). */
  function paintToc(v) {
    const toc = v.win?.querySelector("[data-win-toc]");
    if (!toc) return;
    const secs = v.ed ? [] : [...v.el.querySelectorAll(".note-sec")];
    const wide = windowTier() !== "sheet" && (v.rect?.w ?? 0) >= TOC_MIN_W;
    const show = wide && secs.length >= TOC_MIN_HEADINGS;
    toc.hidden = !show;
    v.win.classList.toggle("toc-open", show);
    if (!show) { toc.replaceChildren(); return; }
    toc.innerHTML = `<p class="nw-toc-head">☰ ${escapeHtml(t("Contents"))}</p>` + secs.map((sec) =>
      `<button type="button" class="nw-toc-item" data-toc-jump="${sec.dataset.secIndex}" style="padding-inline-start:${(0.5 + (Number(sec.dataset.level) - 1) * 0.7).toFixed(1)}rem">${sec.dataset.status ? `<span class="status-dot" data-toc-dot="${escapeHtml(sec.dataset.status)}" title="${escapeHtml(sec.dataset.statusLabel)}" style="background:${escapeHtml(sec.dataset.statusColour)}"></span>` : ""}${escapeHtml(sec.dataset.headingText)}</button>`).join("");
  }
  const DETAILS_KEY = () => `${host.winKey}.details`;
  function detailsOpenPref() { try { return localStorage.getItem(DETAILS_KEY()) === "1"; } catch { return false; } }
  function saveDetailsOpen(open) { try { localStorage.setItem(DETAILS_KEY(), open ? "1" : "0"); } catch { /* private mode */ } }
  /** Item 24: a window's Note back into the pane (the pane's own Note, if any, is flushed and replaced). */
  async function dockWindow(v) {
    if (!notePane || !windowViews.includes(v)) return;
    const { noteId, order, folderId } = v;
    if (v.ed) await endEdit(v);
    closeNoteWindow(v);
    openPane(noteId);
    if (paneView.noteId === noteId) { paneView.order = order?.length ? order : [noteId]; paneView.folderId = folderId; renderPaneBar(paneView); fitPaneBarTwice(paneView); }
    notePane.focus?.({ preventScroll: true });
  }
  /** Item 25: ✕ Close all windows (every edit flushed, as closing one does). */
  function closeAllWindows() {
    for (const v of [...windowViews]) closeNoteWindow(v);
    for (const fw of [...folderWins]) closeFolderWindow(fw);
  }
  document.addEventListener("keydown", (ev) => {
    if (!(ev.ctrlKey || ev.metaKey) || !ev.shiftKey) return;
    if (ev.code === "KeyX" && allWins().length) { ev.preventDefault(); closeAllWindows(); }
    else if (ev.code === "KeyP" && notePane && paneView.noteId !== null) { ev.preventDefault(); const n = getNote(paneView.noteId); if (n) popOutPane(n); }
  });

  /** After every full load: close any view whose Note left (Trash, or gone) and keep the rest honest (chips, ⋯ items). */
  function sync() {
    for (const fw of [...folderWins]) { if (host.folders?.node(fw.folderId)) paintFolderWindow(fw); else closeFolderWindow(fw); }
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
    if (sheet) { for (const p of ["left", "top", "width", "height"]) v.win.style.removeProperty(p); v.win.classList.add("nw-narrow"); if (v.kind === "window" && v.noteId) paintToc(v); return; }
    v.rect = clampRect(v.rect, WIN_LIMITS);
    Object.assign(v.win.style, { left: `${v.rect.x}px`, top: `${v.rect.y}px`, width: `${v.rect.w}px`, height: `${v.rect.h}px` });
    v.win.classList.toggle("nw-narrow", v.rect.w < WIN_PANEL_SIDE_MIN);
    if (v.kind === "window" && v.noteId) paintToc(v);
  }
  function layoutWindows() {
    for (const v of allWins()) applyWindowGeometry(v);
    updateWindowSwitcher();
  }
  function bringToFront(v) {
    if (winOrder[winOrder.length - 1] !== v) { winOrder = winOrder.filter((x) => x !== v); winOrder.push(v); layoutWindows(); }
  }
  function focusView(v) {
    if (v.win) { bringToFront(v); v.win.focus({ preventScroll: true }); }
    else { v.el.scrollIntoView?.({ block: "nearest" }); v.el.focus?.({ preventScroll: true }); }
  }
  /** The bottom switcher: only on a sheet, only with more than one window open. */
  function updateWindowSwitcher() {
    let nav = document.getElementById("noteWinSwitch");
    const sheet = windowTier() === "sheet";
    const show = allWins().length > 1;
    document.documentElement.style.setProperty("--nw-switch", show && sheet ? `${WIN_SWITCH_H}px` : "0px");
    if (!show) { nav?.remove(); return; }
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "noteWinSwitch";
      nav.addEventListener("click", (e) => {
        if (e.target.closest("[data-win-closeall]")) { closeAllWindows(); return; }
        const x = e.target.closest("[data-win-tabclose]");
        if (x) { const v = allWins().find((w) => w.uid === x.dataset.winTabclose); if (v) (v.kind === "folder" ? closeFolderWindow(v) : closeNoteWindow(v)); return; }
        const b = e.target.closest("[data-win-switch]");
        const v = b && allWins().find((w) => w.uid === b.dataset.winSwitch);
        if (v) focusView(v);
      });
      document.body.appendChild(nav);
    }
    // S13: below 640px the bottom switcher; 640px and up a strip of tabs. One element, one set of buttons, so the tap and ✕ behave the same.
    nav.className = sheet ? "nw-switch" : "nw-switch nw-tabs";
    nav.setAttribute("aria-label", t("Open notes"));
    const top = winOrder[winOrder.length - 1];
    // Item 25: two or more open -> one ✕ to close them all (Ctrl+Shift+X), FIRST so a phone's scrolling strip never hides it.
    nav.innerHTML = `<button type="button" class="secondary nw-closeall" data-win-closeall title="${escapeHtml(t("Close all windows (Ctrl+Shift+X)"))}">✕ ${escapeHtml(t("Close all ({n})", { n: bnDigits(allWins().length) }))}</button>` + allWins().map((v) => {
      const note = v.kind === "folder" ? null : getNote(v.noteId);
      const title = v.kind === "folder" ? `📁 ${host.folders?.node(v.folderId)?.name ?? ""}` : (note ? noteTitleOf(note) : "");
      const uid = escapeHtml(v.uid);
      return `<div class="nw-tab${v === top ? " active" : ""}"><button type="button" class="secondary nw-switch-btn${v === top ? " active" : ""}" data-win-switch="${uid}" aria-pressed="${v === top}" title="${escapeHtml(title)}">${escapeHtml(title)}</button><button type="button" class="secondary nw-tab-x" data-win-tabclose="${uid}" aria-label="${escapeHtml(t("Close {title}", { title }))}" title="${escapeHtml(t("Close"))}">✕</button></div>`;
    }).join("");
  }

  // S13: "Version n of m" on the Details line. Read from noteRevisions (oldest = 1); cached per Note + current revision, so a save or a restore (a new current revision) re-reads and nothing else does.
  const verCache = new Map();
  const bnDigits = (n) => { const loc = host.dateLocale?.(); return loc && /^bn/i.test(loc) ? new Intl.NumberFormat("bn-BD-u-nu-beng").format(n) : String(n); };
  async function paintVersionLine(v, note) {
    // The Owner, 5 Oct 2026: the line was in pop-up windows only; the inline
    // pane shows it too now (the Siyagah plan's S13 "Details line with the version").
    const btn = (v.win ?? v.el)?.querySelector("[data-win-ver]");
    if (!btn || !host.versions) return;
    const key = `${note.noteId}|${note.currentRevisionId}`;
    let info = verCache.get(key);
    if (!info) {
      try {
        const rows = (await host.versions.list(note)).slice().sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
        const i = rows.findIndex((r) => (r.revisionId ?? r.id) === note.currentRevisionId);
        info = i < 0 ? { none: true } : { n: i + 1, m: rows.length, at: rows[i].createdAt };
        verCache.set(key, info);
      } catch (err) {
        console.error("[note version line]", err);
        btn.hidden = false; btn.textContent = t("Could not load the versions. Try again in a moment.");
        return;
      }
    }
    if (!allViews().includes(v) || v.noteId !== note.noteId || getNote(v.noteId)?.currentRevisionId !== note.currentRevisionId) return; // moved on while reading
    if (info.none) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.textContent = `🕘 ${t("Version {n} of {m}", { n: bnDigits(info.n), m: bnDigits(info.m) })} · ${t("saved {date}", { date: whenText(info.at) })}`;
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
    win.innerHTML = `<div class="nw-bar"><span class="nw-title"></span>${notePane ? `<button type="button" class="nw-close nw-dock" data-win-dock></button>` : ""}<button type="button" class="nw-close" data-win-close></button></div>`;
    const closeBtn = win.querySelector("[data-win-close]");
    // Note-pane round 3 (item 24): Single ⇄ Multi -- ⇲ puts this window's Note back into the page's pane.
    const dockBtn = win.querySelector("[data-win-dock]");
    if (dockBtn) { dockBtn.textContent = "⇲"; dockBtn.setAttribute("aria-label", t("Put back in the pane")); dockBtn.title = t("Put back in the pane"); }
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
    // Item 26: open or closed as it was last left, on this device.
    const detailsOpen = detailsOpenPref();
    detailsBtn.setAttribute("aria-expanded", String(detailsOpen));
    detailsBtn.textContent = `${t("Details")} ▾`;
    const details = document.createElement("div");
    details.className = detailsOpen ? "nw-details open" : "nw-details";
    // The version line lives in the shared template now (the inline pane shows
    // it too); a window moves it into its Details row.
    const verBtn = q("[data-win-ver]");
    verBtn.title = t("Versions");
    details.append(q("[data-pane-meta]"), verBtn, q("[data-pane-chips]"));
    const pinsBtn = document.createElement("button");
    pinsBtn.type = "button";
    pinsBtn.className = "secondary nw-pins-btn";
    pinsBtn.dataset.winPinsToggle = "";
    pinsBtn.hidden = true;
    detailsRow.append(detailsBtn, details, pinsBtn);
    const scroll = document.createElement("div");
    scroll.className = "nw-scroll";
    scroll.dataset.winScroll = "";
    scroll.append(q("[data-pane-title]"), q("[data-edit-title]"), q("[data-draft-offer]"), q("[data-pane-body]"));
    const pinPanel = document.createElement("aside");
    pinPanel.className = "nw-pin-panel";
    pinPanel.dataset.winPinned = "";
    pinPanel.setAttribute("aria-label", t("Pinned Notes"));
    pinPanel.hidden = true;
    section.append(detailsRow, q("[data-edit-toolbar]"), q("[data-edit-status]"), scroll);
    // The Owner, 5 Oct 2026 ("Make all the panes resizeable"): the pinned panel's
    // width is dragged from the line between it and the Note (beside only).
    const pinSplit = document.createElement("div");
    pinSplit.className = "nw-pin-split";
    pinSplit.dataset.winPinSplit = "";
    pinSplit.tabIndex = 0;
    pinSplit.setAttribute("role", "separator");
    pinSplit.setAttribute("aria-orientation", "vertical");
    pinSplit.setAttribute("aria-label", t("Drag to resize the panels"));
    pinSplit.title = t("Drag to resize the panels");
    const main = document.createElement("div");
    main.className = "nw-main";
    // Item 27: in a wide window, a Note with three or more headings lists them beside the text.
    const toc = document.createElement("nav");
    toc.className = "nw-toc";
    toc.dataset.winToc = "";
    toc.setAttribute("aria-label", t("Contents"));
    toc.hidden = true;
    main.append(pinPanel, pinSplit, toc, section);
    const applyPinW = () => { const w = pinPanelWidth(); pinPanel.style.flexBasis = `${w}px`; pinSplit.setAttribute("aria-valuenow", String(w)); };
    applyPinW();
    const setPinW = (w, save) => {
      const max = Math.max(PIN_W_MIN, Math.min(PIN_W_MAX, main.clientWidth - 260));
      pinPanelWidth(Math.round(Math.min(Math.max(w, PIN_W_MIN), max)), save);
      applyPinW();
    };
    pinSplit.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      try { pinSplit.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      const left = pinPanel.getBoundingClientRect().left;
      const move = (ev) => setPinW(ev.clientX - left, false);
      const up = () => { pinSplit.removeEventListener("pointermove", move); pinSplit.removeEventListener("pointerup", up); pinSplit.removeEventListener("pointercancel", up); pinPanelWidth(pinPanelWidth(), true); };
      pinSplit.addEventListener("pointermove", move); pinSplit.addEventListener("pointerup", up); pinSplit.addEventListener("pointercancel", up);
    });
    pinSplit.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowLeft" ? -20 : e.key === "ArrowRight" ? 20 : 0;
      if (d) { e.preventDefault(); setPinW(pinPanelWidth() + d, true); }
    });
    pinSplit.addEventListener("dblclick", () => setPinW(PIN_W_DEFAULT, true));
    win.appendChild(main);
    const v = makeView(section, "window");
    v.win = win;
    wirePress(v, win);
    v.noteId = noteId;
    v.pinsOpen = pinsOpenPref();
    toc.addEventListener("click", (e) => { const b = e.target.closest("[data-toc-jump]"); if (b) jumpToSection(v, b.dataset.tocJump); });
    dockBtn?.addEventListener("click", () => dockWindow(v));
    pinPanel.addEventListener("click", (e) => {
      if (e.target.closest("[data-win-pins-close]")) { setPinsOpen(v, false); return; }
      const b = e.target.closest("[data-win-pin-open]");
      if (b) showPinnedIn(v, b.dataset.winPinOpen);
    });
    v.order = from.order ?? (from.fromEl ? host.orderFrom(from.fromEl) : [noteId]);
    v.folderId = from.folderId ?? (from.fromEl ? host.folderFrom(from.fromEl) : null);
    const base = loadWinRect() ?? defaultWinRect();
    const n = allWins().length;
    v.rect = clampRect({ ...base, x: base.x + WIN_OFFSET * n, y: base.y + WIN_OFFSET * n }, WIN_LIMITS);
    const ctx = {
      getRect: () => v.rect, setRect: (r) => { v.rect = r; applyWindowGeometry(v); }, locked: () => windowTier() === "sheet",
      limits: WIN_LIMITS, onEnd: () => saveWinRect(v.rect), dragClass: "jt-dragging",
    };
    const bar = win.querySelector(".nw-bar");
    bar.addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-win-close], [data-win-dock]")) startDrag(e, "move", ctx); });
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
  // =====================================================================
  // A FOLDER IN ITS OWN WINDOW (the Owner, 5 Oct 2026; demo
  // docs/reference/2026-10-05-folder-window-and-pinned-demo.html). Same frame
  // as a Note window: drag the bar, eight resize handles, a sheet on a phone,
  // in the switcher. Inside: the folder's path with ⬆, its subfolders (tap to
  // go in), its Notes (tap to open a Note window), ✚ New note, a quick title
  // and ➕ Folder. Every write goes through the page (host.folders), which
  // uses the same functions as the folder list -- nothing new is written.
  // =====================================================================
  function folderWindowFor(folderId) { return folderWins.find((f) => f.folderId === folderId); }
  function openFolderWindow(folderId) {
    const F = host.folders;
    if (!F || !F.node(folderId)) return null;
    const existing = folderWindowFor(folderId);
    if (existing) { focusView(existing); return existing; }
    const win = document.createElement("div");
    win.className = "note-win folder-win";
    win.tabIndex = -1;
    win.setAttribute("role", "dialog");
    win.innerHTML = `<div class="nw-bar"><span class="nw-title"></span><button type="button" class="nw-close" data-win-close></button></div><div class="fw-body" data-folder-win-body></div>`;
    const closeBtn = win.querySelector("[data-win-close]");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", t("Close"));
    closeBtn.title = t("Close");
    const fw = { kind: "folder", uid: `f${++viewSeq}`, win, folderId, newFolderOpen: false };
    const base = loadWinRect() ?? defaultWinRect();
    const n = allWins().length;
    fw.rect = clampRect({ ...base, x: base.x + WIN_OFFSET * n, y: base.y + WIN_OFFSET * n }, WIN_LIMITS);
    const ctx = {
      getRect: () => fw.rect, setRect: (r) => { fw.rect = r; applyWindowGeometry(fw); }, locked: () => windowTier() === "sheet",
      limits: WIN_LIMITS, onEnd: () => saveWinRect(fw.rect), dragClass: "jt-dragging",
    };
    win.querySelector(".nw-bar").addEventListener("pointerdown", (e) => { if (!e.target.closest("[data-win-close]")) startDrag(e, "move", ctx); });
    for (const h of HANDLES) {
      const d = document.createElement("div");
      d.className = "nw-h";
      d.dataset.h = h;
      d.addEventListener("pointerdown", (e) => startDrag(e, h, ctx));
      win.appendChild(d);
    }
    win.addEventListener("pointerdown", () => bringToFront(fw), true);
    closeBtn.addEventListener("click", () => closeFolderWindow(fw));
    win.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !e.target.closest("input")) closeFolderWindow(fw);
    });
    const body = win.querySelector("[data-folder-win-body]");
    body.addEventListener("click", async (e) => {
      const on = (sel) => e.target.closest(sel);
      const go = on("[data-fw-go]");
      if (go) { fw.folderId = go.dataset.fwGo; fw.newFolderOpen = false; paintFolderWindow(fw); return; }
      if (on("[data-fw-up]")) { const up = F.node(fw.folderId)?.parentId; if (up) { fw.folderId = up; paintFolderWindow(fw); } return; }
      const open = on("[data-fw-note]");
      if (open) { openWindow(open.dataset.fwNote, { folderId: fw.folderId }); return; }
      if (on("[data-fw-new]")) {
        const id = await F.newNote(fw.folderId, "");
        if (id) openWindow(id, { folderId: fw.folderId });
        return;
      }
      if (on("[data-fw-newfolder]")) { fw.newFolderOpen = !fw.newFolderOpen; paintFolderWindow(fw); body.querySelector("[data-fw-newfolder-name]")?.focus(); return; }
    });
    body.addEventListener("submit", async (e) => {
      e.preventDefault();
      const quick = e.target.closest("[data-fw-quick]");
      if (quick) {
        const input = quick.querySelector("input");
        const title = input.value.trim();
        if (!title) { host.status(t("Type a title first.")); return; }
        input.disabled = true;
        const id = await F.newNote(fw.folderId, title);
        const again = body.querySelector("[data-fw-quick] input"); // the folder repainted underneath
        if (again) { again.value = id ? "" : title; again.disabled = false; again.focus(); }
        return;
      }
      const nf = e.target.closest("[data-fw-newfolder-form]");
      if (nf) {
        const name = nf.querySelector("input").value.trim();
        if (!name) { host.status(t("Type a name for the folder first.")); return; }
        fw.newFolderOpen = false;
        await F.newFolder(fw.folderId, name);
        paintFolderWindow(fw);
      }
    });
    body.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-fw-go], [data-fw-note]") && e.target.tagName !== "BUTTON") { e.preventDefault(); e.target.click(); }
    });
    document.body.appendChild(win);
    folderWins.push(fw);
    winOrder.push(fw);
    layoutWindows();
    paintFolderWindow(fw);
    win.focus({ preventScroll: true });
    return fw;
  }
  function paintFolderWindow(fw) {
    const F = host.folders;
    const node = F.node(fw.folderId);
    if (!node) return;
    const body = fw.win.querySelector("[data-folder-win-body]");
    const quickValue = body.querySelector("[data-fw-quick] input")?.value ?? "";
    const scrollTop = body.querySelector("[data-fw-list]")?.scrollTop ?? 0;
    fw.win.querySelector(".nw-title").textContent = `📁 ${node.name}`;
    fw.win.setAttribute("aria-label", node.name);
    fw.win.dataset.folderId = fw.folderId;
    const path = F.path(fw.folderId);
    const crumbs = path.map((p, i) => i < path.length - 1
      ? `<button type="button" class="fw-crumb" data-fw-go="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button><span aria-hidden="true">›</span>`
      : `<b class="fw-crumb-here">${escapeHtml(p.name)}</b>`).join(" ");
    const own = F.canEdit(fw.folderId);
    const kids = F.children(fw.folderId);
    const notes = F.notes(fw.folderId);
    const count = (n) => bnDigits(n);
    body.innerHTML = `<div class="fw-path">
        <button type="button" class="secondary fw-btn" data-fw-up ${node.parentId ? "" : "disabled"} aria-label="${escapeHtml(t("Up to the parent folder"))}" title="${escapeHtml(t("Up to the parent folder"))}">⬆</button>
        <span class="fw-crumbs" data-fw-crumbs>${crumbs}</span>
        ${own ? `<button type="button" class="fw-btn" data-fw-new>✚ ${escapeHtml(t("New note"))}</button>` : ""}
      </div>
      ${own ? `<div class="fw-quick-row"><form class="fw-quick" data-fw-quick><input type="text" placeholder="${escapeHtml(t("Quick title — press Enter to add a Note"))}" aria-label="${escapeHtml(t("Quick title — press Enter to add a Note"))}"><button type="submit" aria-label="${escapeHtml(t("Add note"))}" title="${escapeHtml(t("Add note"))}">✚</button></form><button type="button" class="secondary fw-btn" data-fw-newfolder aria-expanded="${fw.newFolderOpen}">➕ ${escapeHtml(t("New folder"))}</button></div>` : ""}
      ${own && fw.newFolderOpen ? `<form class="fw-quick" data-fw-newfolder-form><input type="text" data-fw-newfolder-name placeholder="${escapeHtml(t("Folder name"))}" aria-label="${escapeHtml(t("Folder name"))}"><button type="submit">${escapeHtml(t("Create"))}</button></form>` : ""}
      <div class="fw-list" data-fw-list>
        ${kids.map((k) => `<button type="button" class="fw-sub" data-fw-go="${escapeHtml(k.id)}">📁 <span class="fw-sub-name">${escapeHtml(k.name)}</span><span class="fw-count">${k.count === null ? "…" : count(k.count)}</span></button>`).join("")}
        ${notes.map((n) => `<button type="button" class="fw-note" data-fw-note="${escapeHtml(n.noteId)}"><b>${n.pinned ? "📌 " : ""}${escapeHtml(n.title?.trim() || t("(untitled)"))}</b><small>${escapeHtml(n.when ?? "")}</small></button>`).join("")}
        ${!kids.length && !notes.length ? `<p class="note" data-fw-empty>${escapeHtml(F.loaded() ? t("No Notes here yet.") : t("Counting the Notes filed in each folder…"))}</p>` : ""}
      </div>`;
    const q = body.querySelector("[data-fw-quick] input");
    if (q && quickValue) q.value = quickValue;
    const list = body.querySelector("[data-fw-list]");
    if (list) list.scrollTop = scrollTop;
    updateWindowSwitcher();
  }
  function closeFolderWindow(fw) {
    if (!folderWins.includes(fw)) return;
    fw.win.remove();
    folderWins.splice(folderWins.indexOf(fw), 1);
    winOrder = winOrder.filter((x) => x !== fw);
    layoutWindows();
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

  return { paneView, windowViews, allViews, viewShowing, openPane, closePane, closeView, openWindow, openFolderWindow, endEdit, flushActiveEdit, sync, renderView, focusView, windowTier, mountTags };
}
