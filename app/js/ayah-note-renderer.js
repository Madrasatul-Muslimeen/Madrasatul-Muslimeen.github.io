// Ayah Note panel -- pure renderer (I2): HTML in, HTML out, callback hooks
// for the caller to wire. Never touches Firebase, records, bookmarks or
// audio-player.js directly -- quranrevival.html owns every db/records/audio
// call this triggers, same split way-modal.js already uses for its own
// Track tab.
//
// Behaviour ported from a QCR prototype's own popup-note feature (logic and
// interaction design only, not its code, styling or data model -- see
// CLAUDE.md's "The Āyah Note panel" for the settled shape), then reworked
// twice on the owner's own feedback: (1) a ⋮ quick-actions menu on every
// āyah for Copy/Share/Play without opening anything deeper, and (2) the
// deeper "Note & more" view as a full stage view closed via the dock,
// never a floating modal with its own × button.
//
// Two render targets, both keyed by unitKey ("ayah:16:36" -- I5):
//   - renderQuickMenu() / attachQuickMenuHandlers()
//   - renderNoteView()  / attachNoteViewHandlers()
// Plus small shared helpers (copyToClipboard, shareText, notesToPlainText)
// that both use, matching QCR's own getLangSel/buildAyahShareText/
// notesToPlainText/copyAyahText/shareAyahText grouping.

import { t } from "./i18n.js";

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rich-text Notes -> plain text, for Copy/Share (QCR's own notesToPlainText, ported as-is: strip formatting, keep the words). */
export function notesToPlainText(notesHtml) {
  if (!notesHtml) return "";
  const div = document.createElement("div");
  div.innerHTML = notesHtml;
  return (div.textContent ?? div.innerText ?? "").trim();
}

/** Clipboard API first, document.execCommand fallback for older/embedded webviews (spec item 4). Returns true/false rather than throwing -- both call sites just want to know what to flash. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** navigator.share when available; falls back to copying instead (spec item 4). */
export async function shareText(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      return false; // cancelled from the share sheet -- not a failure worth reporting
    }
  }
  return copyToClipboard(text);
}

function flashBtn(btn, msg, ms = 700) {
  return new Promise((resolve) => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<span class="ayah-note-flash">${escapeHtml(msg)}</span>`;
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled = false;
      resolve();
    }, ms);
  });
}

// ===================== ⋮ quick-actions menu =====================

const QM_LANGS = [
  ["ar", () => t("Arabic")],
  ["en", () => t("English")],
  ["bn", () => t("Bangla")],
];

/**
 * The ⋮ badge + its popover: Copy and Share each expand in place to their
 * own Arabic/English/Bangla/Notes checkboxes, then Play and Note & more as
 * plain one-tap items. `hasNote` greys the "My note" checkbox out when
 * nothing's saved yet, so ticking it can't silently copy an empty line.
 */
export function renderQuickMenu(unitKey, { hasNote = false } = {}) {
  const noteLabel = hasNote ? t("My note") : t("My note (none saved)");
  const langRow = (cls) => `
        ${QM_LANGS.map(([lang, label]) => `<label><input type="checkbox" class="${cls}" data-lang="${lang}" checked> <span>${label()}</span></label>`).join("\n        ")}
        <label><input type="checkbox" class="${cls}" data-lang="notes" ${hasNote ? "" : "disabled"}> <span>${escapeHtml(noteLabel)}</span></label>`;
  return `
    <div class="ayah-quick-wrap" data-unit-key="${escapeHtml(unitKey)}">
      <button type="button" class="ayah-quick-btn${hasNote ? " has-note" : ""}" data-qm-toggle title="${t("Quick actions")}">⋮</button>
      <div class="quick-menu">
        <button type="button" class="qm-item" data-qm-sub-toggle="copy">📋 ${t("Copy")} <span class="qm-caret">▸</span></button>
        <div class="qm-sub" data-qm-sub="copy">${langRow("qm-lang-copy")}
          <button type="button" class="qm-go-btn" data-qm-copy-go>${t("Copy")}</button>
        </div>
        <button type="button" class="qm-item" data-qm-sub-toggle="share">📤 ${t("Share")} <span class="qm-caret">▸</span></button>
        <div class="qm-sub" data-qm-sub="share">${langRow("qm-lang-share")}
          <button type="button" class="qm-go-btn" data-qm-share-go>${t("Share")}</button>
        </div>
        <div class="qm-divider"></div>
        <button type="button" class="qm-item" data-qm-play>▶ ${t("Play this āyah")}</button>
        <button type="button" class="qm-item" data-qm-note>📝 ${t("Note & more…")}</button>
      </div>
    </div>`;
}

function closeAllQuickMenus(container) {
  container.querySelectorAll(".ayah-quick-wrap").forEach((wrap) => {
    wrap.querySelector(".quick-menu")?.classList.remove("open");
    wrap.querySelector(".ayah-quick-btn")?.classList.remove("active");
    wrap.querySelectorAll(".qm-sub").forEach((s) => s.classList.remove("open"));
  });
}

/**
 * Wires every `.ayah-quick-wrap` currently inside `container` (there can be
 * many at once -- the flow view renders one per āyah). `callbacks`:
 *   buildText(unitKey, langs)  -> string, for Copy/Share
 *   onPlay(unitKey)
 *   onOpenNote(unitKey)
 * Re-call after every re-render (innerHTML replace) -- the per-instance
 * listeners below are cheap to re-attach to fresh nodes; only the outside-
 * click listener is guarded against being bound twice on the same container.
 */
export function attachQuickMenuHandlers(container, { buildText, onPlay, onOpenNote }) {
  container.querySelectorAll(".ayah-quick-wrap").forEach((wrap) => {
    const unitKey = wrap.dataset.unitKey;
    const btn = wrap.querySelector("[data-qm-toggle]");
    const menu = wrap.querySelector(".quick-menu");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains("open");
      closeAllQuickMenus(container);
      if (willOpen) {
        menu.classList.add("open");
        btn.classList.add("active");
      }
    });

    wrap.querySelectorAll("[data-qm-sub-toggle]").forEach((subBtn) => {
      subBtn.addEventListener("click", () => {
        const key = subBtn.dataset.qmSubToggle;
        wrap.querySelectorAll(".qm-sub").forEach((s) => {
          s.classList.toggle("open", s.dataset.qmSub === key && !s.classList.contains("open"));
        });
      });
    });

    const copyGo = wrap.querySelector("[data-qm-copy-go]");
    copyGo?.addEventListener("click", async () => {
      const langs = [...wrap.querySelectorAll(".qm-lang-copy")].filter((cb) => cb.checked).map((cb) => cb.dataset.lang);
      const ok = await copyToClipboard(buildText(unitKey, langs));
      await flashBtn(copyGo, ok ? t("✓ Copied") : t("Copy failed"));
      closeAllQuickMenus(container);
    });

    const shareGo = wrap.querySelector("[data-qm-share-go]");
    shareGo?.addEventListener("click", async () => {
      const langs = [...wrap.querySelectorAll(".qm-lang-share")].filter((cb) => cb.checked).map((cb) => cb.dataset.lang);
      await shareText(buildText(unitKey, langs), unitKey);
      closeAllQuickMenus(container);
    });

    wrap.querySelector("[data-qm-play]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onPlay?.(unitKey);
    });
    wrap.querySelector("[data-qm-note]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onOpenNote?.(unitKey);
    });
  });

  if (!container._qmOutsideBound) {
    container._qmOutsideBound = true;
    document.addEventListener("click", (e) => {
      if (e.target.closest(".ayah-quick-wrap")) return;
      closeAllQuickMenus(container);
    });
  }
}

// ===================== "Note & more" full-stage view =====================

/**
 * The deeper view: Arabic/English/Bangla read-only (this is platform text,
 * never user-editable -- unlike QCR's own prototype, which let you edit the
 * scripture text itself) plus a rich-text Notes field, all independently
 * collapsible, a master toggle over the first three (never Notes), and the
 * same Copy/Share/Play/bookmark row as the quick menu underneath its own
 * 🔖 icon toggle. No × button (spec, settled with the owner): this view
 * fills the stage and is left the same way any other stage view is left --
 * tapping a different dock tab.
 */
export function renderNoteView({
  unitKey, ref, arabicText, englishText, banglaText, notesHtml,
  isBookmarked = false, hasPrev = false, hasNext = false,
}) {
  return `
    <div class="note-view" data-unit-key="${escapeHtml(unitKey)}">
      <div class="note-topbar">
        <span class="note-ref">${escapeHtml(ref)}</span>
        <div class="note-nav">
          <button type="button" class="note-icon-btn" data-note-palette-toggle title="${t("Notes formatting")}">Aa</button>
          <button type="button" class="note-icon-btn note-journey-btn" disabled title="${t("Coming later")}">${t("Mapping My Journey")}</button>
          <button type="button" class="note-icon-btn" data-note-prev ${hasPrev ? "" : "disabled"} title="${t("Previous āyah")}">←</button>
          <button type="button" class="note-icon-btn" data-note-next ${hasNext ? "" : "disabled"} title="${t("Next āyah")}">→</button>
        </div>
      </div>

      <div class="note-palette" data-note-palette>
        <span class="note-palette-label">${t("Edit palette — formats the Notes field only")}</span>
        <button type="button" data-cmd="bold" title="${t("Bold")}"><b>B</b></button>
        <button type="button" data-cmd="italic" title="${t("Italic")}"><i>I</i></button>
        <button type="button" data-cmd="underline" title="${t("Underline")}"><u>U</u></button>
        <button type="button" data-cmd="strikeThrough" title="${t("Strikethrough")}"><s>S</s></button>
        <select data-note-heading title="${t("Heading style")}">
          <option value="p">${t("Normal")}</option>
          <option value="h1">${t("Heading 1")}</option>
          <option value="h2">${t("Heading 2")}</option>
          <option value="h3">${t("Heading 3")}</option>
        </select>
        <button type="button" data-cmd="insertUnorderedList" title="${t("Bullet list")}">• ${t("List")}</button>
        <button type="button" data-cmd="insertOrderedList" title="${t("Numbered list")}">1. ${t("List")}</button>
        <button type="button" data-cmd="removeFormat" title="${t("Clear formatting")}">${t("Clear")}</button>
      </div>

      <div class="note-body">
        <div class="note-actionsbar" data-note-actionsbar>
          <button type="button" class="note-bookmark-btn${isBookmarked ? " active" : ""}" data-note-bookmark title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}">${isBookmarked ? "★" : "☆"}</button>
          <span class="note-lang-group">
            <label><input type="checkbox" class="note-lang" data-lang="ar" checked> AR</label>
            <label><input type="checkbox" class="note-lang" data-lang="en" checked> EN</label>
            <label><input type="checkbox" class="note-lang" data-lang="bn" checked> BN</label>
            <label><input type="checkbox" class="note-lang" data-lang="notes"> ${t("Notes")}</label>
          </span>
          <button type="button" class="note-copy-btn" data-note-copy>📋 ${t("Copy")}</button>
          <button type="button" class="note-share-btn" data-note-share>📤 ${t("Share")}</button>
          <button type="button" class="note-play-btn" data-note-play>▶ ${t("Play")}</button>
        </div>

        <div class="note-master-row">
          <button type="button" class="note-actions-toggle" data-note-actions-toggle title="${t("Bookmark, copy & share")}">🔖</button>
          <button type="button" class="note-master-toggle" data-note-master-toggle>▾ ${t("Collapse āyah text")}</button>
          <span class="note-master-hint">(${t("Notes always stays open")})</span>
        </div>

        <div data-note-collapsible>
          <div class="note-field" data-note-field="arabic">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("Arabic")}</span>
            </div>
            <div class="note-field-body"><div class="note-arabic" dir="rtl" lang="ar">${escapeHtml(arabicText)}</div></div>
          </div>
          <div class="note-field" data-note-field="english">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("English")}</span>
            </div>
            <div class="note-field-body"><div class="note-english">${escapeHtml(englishText)}</div></div>
          </div>
          <div class="note-field" data-note-field="bangla">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("Bangla")}</span>
            </div>
            <div class="note-field-body"><div class="note-bangla" lang="bn">${escapeHtml(banglaText)}</div></div>
          </div>
        </div>

        <div class="note-field" data-note-field="notes">
          <div class="note-field-label-row">
            <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
            <span class="note-field-label">${t("Notes")}</span>
          </div>
          <div class="note-field-body">
            <div class="note-notes-editor" contenteditable="true" spellcheck="false" data-note-editor data-placeholder="${escapeHtml(t("Type notes here…"))}">${notesHtml ?? ""}</div>
            <p class="note-save-status" data-note-save-status hidden></p>
          </div>
        </div>
      </div>
    </div>`;
}

let activeNotesEditorEl = null; // module-level, matching QCR's own trick: palette commands always target whichever Notes editor was last focused, never whatever else happens to be focused when a toolbar button is clicked

/**
 * `callbacks`:
 *   buildText(langs)     -> string, for the actions row's Copy/Share
 *   onSaveNote(html)     -> Promise<{ok:boolean, message?:string}>, called on Notes blur
 *   onToggleBookmark()
 *   onPlay()
 *   onPrev() / onNext()  -- omit/leave the button disabled when there's nowhere to go
 */
export function attachNoteViewHandlers(container, callbacks) {
  const view = container.querySelector(".note-view");
  if (!view) return;

  const paletteToggle = view.querySelector("[data-note-palette-toggle]");
  const palette = view.querySelector("[data-note-palette]");
  paletteToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = palette.classList.toggle("open");
    paletteToggle.classList.toggle("active", open);
  });

  const actionsToggle = view.querySelector("[data-note-actions-toggle]");
  const actionsBar = view.querySelector("[data-note-actionsbar]");
  actionsToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = actionsBar.classList.toggle("open");
    actionsToggle.classList.toggle("active", open);
  });

  // Field toggles -- each field (arabic/english/bangla/notes) collapses on
  // its own; the master toggle below only ever wraps the first three.
  view.querySelectorAll("[data-note-field-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const body = btn.closest(".note-field").querySelector(".note-field-body");
      const collapsed = body.style.display === "none";
      body.style.display = collapsed ? "" : "none";
      btn.textContent = collapsed ? "▾" : "▸";
    });
  });

  const masterToggle = view.querySelector("[data-note-master-toggle]");
  const collapsibleWrap = view.querySelector("[data-note-collapsible]");
  masterToggle?.addEventListener("click", () => {
    const collapsed = collapsibleWrap.style.display === "none";
    collapsibleWrap.style.display = collapsed ? "" : "none";
    masterToggle.textContent = collapsed ? `▾ ${t("Collapse āyah text")}` : `▸ ${t("Expand āyah text")}`;
  });

  // Notes: rich-text editing + save-on-blur.
  const notesEditor = view.querySelector("[data-note-editor]");
  const saveStatus = view.querySelector("[data-note-save-status]");
  if (notesEditor) {
    notesEditor.addEventListener("focus", () => { activeNotesEditorEl = notesEditor; });
    notesEditor.addEventListener("blur", async () => {
      if (!callbacks.onSaveNote) return;
      const outcome = await callbacks.onSaveNote(notesEditor.innerHTML);
      if (outcome && outcome.ok === false) {
        saveStatus.textContent = outcome.message || t("Couldn't save — will try again.");
        saveStatus.hidden = false;
      } else {
        saveStatus.hidden = true;
      }
    });
  }
  // mousedown + preventDefault (QCR's own trick, ported as-is): clicking a
  // palette button must not lose the Notes field's current text selection.
  view.querySelectorAll("[data-note-palette] button[data-cmd]").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      if (!activeNotesEditorEl) return;
      activeNotesEditorEl.focus();
      document.execCommand(btn.dataset.cmd, false, null);
    });
  });
  view.querySelector("[data-note-heading]")?.addEventListener("change", (e) => {
    if (!activeNotesEditorEl) return;
    activeNotesEditorEl.focus();
    document.execCommand("formatBlock", false, e.target.value);
  });

  view.querySelector("[data-note-bookmark]")?.addEventListener("click", () => callbacks.onToggleBookmark?.());

  function checkedLangs() {
    return [...view.querySelectorAll(".note-lang")].filter((cb) => cb.checked).map((cb) => cb.dataset.lang);
  }
  const copyBtn = view.querySelector("[data-note-copy]");
  copyBtn?.addEventListener("click", async () => {
    const ok = await copyToClipboard(callbacks.buildText(checkedLangs()));
    await flashBtn(copyBtn, ok ? t("✓ Copied") : t("Copy failed"));
  });
  view.querySelector("[data-note-share]")?.addEventListener("click", () => {
    shareText(callbacks.buildText(checkedLangs()), view.dataset.unitKey);
  });
  view.querySelector("[data-note-play]")?.addEventListener("click", () => callbacks.onPlay?.());
  view.querySelector("[data-note-prev]")?.addEventListener("click", () => callbacks.onPrev?.());
  view.querySelector("[data-note-next]")?.addEventListener("click", () => callbacks.onNext?.());

  if (!container._noteOutsideBound) {
    container._noteOutsideBound = true;
    document.addEventListener("click", (e) => {
      const v = container.querySelector(".note-view");
      if (!v) return;
      const p = v.querySelector("[data-note-palette]");
      const pBtn = v.querySelector("[data-note-palette-toggle]");
      if (p?.classList.contains("open") && !p.contains(e.target) && e.target !== pBtn) {
        p.classList.remove("open");
        pBtn?.classList.remove("active");
      }
      const bar = v.querySelector("[data-note-actionsbar]");
      const barBtn = v.querySelector("[data-note-actions-toggle]");
      if (bar?.classList.contains("open") && !bar.contains(e.target) && e.target !== barBtn) {
        bar.classList.remove("open");
        barBtn?.classList.remove("active");
      }
    });
  }
}
