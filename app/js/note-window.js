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
import { sanitizeNoteHtml } from "./note-sanitize.js";
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
        <button type="button" class="secondary pane-btn" data-pane-edit-toggle hidden></button>
        <span class="bar-palette-wrap folder-menu-wrap" data-bar-palette-wrap="paneMenu" data-pane-menu-wrap>
          <button type="button" class="folder-menu-btn bar-palette-toggle" data-bar-palette-toggle="paneMenu" aria-haspopup="true" aria-expanded="false" data-pane-menu-btn>⋯</button>
          <div class="bar-palette" data-bar-palette="paneMenu" data-pane-menu></div>
        </span>
      </div>
      <h2 class="note-pane-title" data-pane-title></h2>
      <input type="text" class="pane-edit-title" data-edit-title hidden>
      <p class="note-pane-meta" data-pane-meta></p>
      <div class="note-pane-chips" data-pane-chips></div>
      <div class="pane-draft-offer" data-draft-offer hidden></div>
      <div class="pane-edit-toolbar" data-edit-toolbar hidden></div>
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
 *   menuMid(v, note)   extra ⋯ items for the Note's owner, HTML
 *   menuEnd(v, note)   extra ⋯ items at the end, HTML
 *   onMenu(v, note, on)  handle a click on one of those items; true when handled
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
    el.addEventListener("mousedown", (ev) => { if (ev.target.closest("[data-edit-toolbar] button")) ev.preventDefault(); });
    el.addEventListener("click", (ev) => onViewClick(v, ev));
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

  function renderEditToolbar(v) {
    const label = (k) => escapeHtml(t(k));
    const cmds = [["h1", "Heading 1", "H1"], ["h2", "Heading 2", "H2"], ["h3", "Heading 3", "H3"], ["ul", "Bullet list", "•"], ["ol", "Numbered list", "1."], ["undo", "Undo", "↶"]];
    v.editToolbarEl.innerHTML = `
      <button type="button" class="secondary tb-btn" data-cmd="bold" aria-label="${label("Bold")}" title="${label("Bold")}"><b>B</b></button>
      <button type="button" class="secondary tb-btn" data-cmd="italic" aria-label="${label("Italic")}" title="${label("Italic")}"><i>I</i></button>
      ${cmds.map(([c, name, glyph]) => `<button type="button" class="secondary tb-btn tb-fold" data-cmd="${c}" aria-label="${label(name)}" title="${label(name)}">${glyph}</button>`).join("")}
      <span class="bar-palette-wrap folder-menu-wrap" data-bar-palette-wrap="editTools${v.uid}" data-tb-menu-wrap>
        <button type="button" class="folder-menu-btn bar-palette-toggle" data-bar-palette-toggle="editTools${v.uid}" aria-haspopup="true" aria-expanded="false" aria-label="${label("More")}">⋯</button>
        <div class="bar-palette" data-bar-palette="editTools${v.uid}">${cmds.map(([c, name]) => `<button type="button" class="secondary tiny" data-cmd="${c}">${label(name)}</button>`).join("")}</div>
      </span>`;
  }
  function fitEditToolbar(v) {
    if (v.editToolbarEl.hidden) return;
    v.editToolbarEl.classList.remove("folded");
    if (v.editToolbarEl.scrollWidth > v.editToolbarEl.clientWidth + 1) v.editToolbarEl.classList.add("folded");
  }
  function runEditCommand(v, cmd) {
    const body = editBodyEl(v);
    if (!body) return;
    body.focus();
    if (/^h[123]$/.test(cmd)) {
      const now = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
      document.execCommand("formatBlock", false, now === cmd ? "p" : cmd);
    } else {
      document.execCommand({ bold: "bold", italic: "italic", ul: "insertUnorderedList", ol: "insertOrderedList", undo: "undo" }[cmd], false, null);
    }
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
    v.bodyEl.replaceChildren();
    const body = document.createElement("div");
    body.className = "pane-edit-body";
    body.contentEditable = "true";
    body.dataset.editBody = "";
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-multiline", "true");
    body.setAttribute("aria-label", t("Note text"));
    body.innerHTML = sanitizeNoteHtml(draft ? draft.bodyHtml : note.bodyHtml);
    v.bodyEl.appendChild(body);
    v.editTitleEl.setAttribute("aria-label", t("Note title"));
    renderEditToolbar(v);
    v.editToolbarEl.hidden = false;
    v.el.classList.add("pane-editing");
    setEditStatus(v, "");
    renderPaneBar(v);
    fitPaneBarTwice(v);
    fitEditToolbar(v); requestAnimationFrame(() => fitEditToolbar(v));
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
  function paneMetaText(note) {
    const created = host.when(note.originalCreatedAt ?? note.createdAt), changed = host.when(note.updatedAt);
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
    v.barEl.classList.remove("folded", "tight", "edit-folded");
    if (v.barEl.scrollWidth > v.barEl.clientWidth + 1) v.barEl.classList.add("folded");
    if (v.barEl.scrollWidth > v.barEl.clientWidth + 1) v.barEl.classList.add("tight");
    // Round 5: ✏️ Edit / ✓ Done is the LAST thing to fold, into ⋯ with its word.
    if (v.barEl.scrollWidth > v.barEl.clientWidth + 1) v.barEl.classList.add("edit-folded");
  }
  function fitPaneBarTwice(v) { fitPaneBar(v); requestAnimationFrame(() => fitPaneBar(v)); }
  window.addEventListener("resize", () => {
    if (notePane) host.paneApply();
    for (const v of allViews()) if (v.noteId !== null) { if (v.kind === "window") applyWindowGeometry(v); renderPaneBar(v); fitPaneBarTwice(v); fitEditToolbar(v); }
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
    let menu = `<button type="button" class="secondary tiny pane-fold-item" data-pane-prev ${prev ? "" : "disabled"}>‹ ${escapeHtml(t("Previous note"))}</button>
      <button type="button" class="secondary tiny pane-fold-item" data-pane-next ${next ? "" : "disabled"}>${escapeHtml(t("Next note"))} ›</button>`;
    if (own) {
      menu = `<button type="button" class="secondary tiny pane-editfold-item" data-pane-edit-toggle>${escapeHtml(editLabel)}</button>` + menu;
      menu += host.menuMid?.(v, note) ?? "";
    }
    if (v.kind === "pane") menu += `<button type="button" class="secondary tiny" data-pane-popout>⧉ ${escapeHtml(t("Pop out"))}</button>`;
    menu += host.menuEnd?.(v, note) ?? "";
    const menuWrap = v.el.querySelector("[data-pane-menu-wrap]");
    menuWrap.hidden = !menu.trim();
    v.el.querySelector("[data-pane-menu]").innerHTML = menu;
    v.el.querySelector("[data-pane-menu-btn]").setAttribute("aria-label", t("More"));
    const headings = [...v.el.querySelectorAll(".note-sec")];
    const showContents = headings.length >= 3 && (v.kind === "window" || host.paneTier() === "narrow");
    v.el.querySelector("[data-pane-contents-wrap]").hidden = !showContents;
    v.el.querySelector("[data-pane-contents-list]").innerHTML = headings.map((sec) =>
      `<button type="button" class="secondary tiny" data-pane-jump="${sec.dataset.secIndex}" style="padding-left:${(0.6 + (Number(sec.dataset.level) - 1) * 0.8).toFixed(1)}rem">${escapeHtml(sec.dataset.headingText)}</button>`).join("");
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

  function renderView(v, { keepScroll = false } = {}) {
    const note = getNote(v.noteId);
    if (!note) return;
    const before = v.scrollEl.scrollTop;
    v.el.querySelector("[data-pane-title]").textContent = noteTitleOf(note);
    v.el.querySelector("[data-pane-meta]").textContent = paneMetaText(note);
    v.el.querySelector("[data-pane-chips]").innerHTML = (host.chips?.(note) ?? []).map((f) =>
      `<button type="button" class="folder-chip" data-pane-chip="${escapeHtml(f.id)}">📁 ${escapeHtml(f.label)}</button>`).join("");
    // While an edit is open the editor IS the body: a re-render must never wipe the reader's typing.
    if (!(v.ed && v.ed.noteId === note.noteId)) { showReadChrome(v, note); buildBody(v, note); }
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
      if (!v.ed) { if (host.canEdit()) startEdit(v, note); return; }
      const done = await endEdit(v);
      renderView(v, { keepScroll: true });
      if (done?.conflict) await host.refresh(); // show what the other device wrote; the draft is offered back
      return;
    }
    const cmdBtn = on("[data-edit-toolbar] [data-cmd]");
    if (cmdBtn) { closeAllBarPalettes(null); runEditCommand(v, cmdBtn.dataset.cmd); return; }
    if (on("[data-draft-restore]")) { const d = loadDraft(note.noteId); if (d && host.canEdit()) startEdit(v, note, d); return; }
    if (on("[data-draft-discard]")) { clearDraft(note.noteId); v.draftOfferEl.hidden = true; return; }
    if (on("[data-pane-back]")) { closePane(); return; }
    if (on("[data-pane-prev]")) { closeAllBarPalettes(null); step(v, -1); return; }
    if (on("[data-pane-next]")) { closeAllBarPalettes(null); step(v, 1); return; }
    if (on("[data-win-details]")) { const d = v.win.querySelector(".nw-details"); const open = d.classList.toggle("open"); on("[data-win-details]").setAttribute("aria-expanded", String(open)); return; }
    if (on("[data-pane-popout]")) { closeAllBarPalettes(null); popOutPane(note); return; }
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

  return { paneView, windowViews, allViews, viewShowing, openPane, closePane, closeView, openWindow, endEdit, flushActiveEdit, sync, renderView, focusView, windowTier };
}
