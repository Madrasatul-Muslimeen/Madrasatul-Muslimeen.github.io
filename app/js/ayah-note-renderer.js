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
 * Arabic/English/Bangla/My-note checkboxes, one per row -- shared by the ⋮
 * quick menu's own Copy/Share submenus AND the Note view's bar-2 Copy/Share
 * popovers (round 31), so "what to copy/share" is asked the same way and
 * looks the same wherever it's asked. `hasNote` greys "My note" out when
 * nothing's saved yet, so ticking it can't silently copy an empty line.
 */
function langCheckboxRows(cls, hasNote) {
  const noteLabel = hasNote ? t("My note") : t("My note (none saved)");
  return `
        ${QM_LANGS.map(([lang, label]) => `<label><input type="checkbox" class="${cls}" data-lang="${lang}" checked> <span>${label()}</span></label>`).join("\n        ")}
        <label><input type="checkbox" class="${cls}" data-lang="notes" ${hasNote ? "" : "disabled"}> <span>${escapeHtml(noteLabel)}</span></label>`;
}

/**
 * The ⋮ badge + its popover: Copy and Share each expand in place to their
 * own Arabic/English/Bangla/Notes checkboxes, then Play and Note & more as
 * plain one-tap items. `hasNote` greys the "My note" checkbox out when
 * nothing's saved yet, so ticking it can't silently copy an empty line.
 */
export function renderQuickMenu(unitKey, { hasNote = false, isBookmarked = false } = {}) {
  return `
    <div class="ayah-quick-wrap" data-unit-key="${escapeHtml(unitKey)}">
      <button type="button" class="ayah-quick-btn${hasNote ? " has-note" : ""}" data-qm-toggle title="${t("Quick actions")}">⋮</button>
      <div class="quick-menu">
        <button type="button" class="qm-item" data-qm-sub-toggle="copy">📋 ${t("Copy")} <span class="qm-caret">▸</span></button>
        <div class="qm-sub" data-qm-sub="copy">${langCheckboxRows("qm-lang-copy", hasNote)}
          <button type="button" class="qm-go-btn" data-qm-copy-go>${t("Copy")}</button>
        </div>
        <button type="button" class="qm-item" data-qm-sub-toggle="share">📤 ${t("Share")} <span class="qm-caret">▸</span></button>
        <div class="qm-sub" data-qm-sub="share">${langCheckboxRows("qm-lang-share", hasNote)}
          <button type="button" class="qm-go-btn" data-qm-share-go>${t("Share")}</button>
        </div>
        <div class="qm-divider"></div>
        <button type="button" class="qm-item" data-qm-play>▶ ${t("Play this āyah")}</button>
        <!-- Enhancement round -- item 3's own "enable bookmark on the READ
             screen as well": this menu already reaches every āyah on the
             read screen, single or flow view, so one item here covers both
             rather than a second, screen-specific control. -->
        <button type="button" class="qm-item" data-qm-bookmark>${isBookmarked ? "★" : "🔖"} ${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}</button>
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
 *   onToggleBookmark(unitKey)  -- enhancement round, the READ screen's own Bookmark item
 * Re-call after every re-render (innerHTML replace) -- the per-instance
 * listeners below are cheap to re-attach to fresh nodes; only the outside-
 * click listener is guarded against being bound twice on the same container.
 */
export function attachQuickMenuHandlers(container, { buildText, onPlay, onOpenNote, onToggleBookmark }) {
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
    wrap.querySelector("[data-qm-bookmark]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onToggleBookmark?.(unitKey);
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
 * The deeper view: bar 1 is the reading-unit picker only (mirrors the Read
 * screen's #readPickers shape, mirrors -- unchanged behaviour, moved
 * screen); bar 2 holds every button, one row, on every platform. Four stay
 * open always (the nav cluster, Play, Bookmark, Full screen) plus Copy;
 * everything else (Share, Notes formatting, Word by Word, Root, Collapse)
 * folds into ⋮, and Approach / Mapping My Journey / the whole-Qur'an note
 * fold into ⋯ at the far right -- so nothing here ever needs a second bar,
 * even with the picker row and four ways to move added since round 31.
 *
 * Arabic/English/Bangla are read-only platform text (never user-editable),
 * shown only when `showAyatText` is true (Single Ayah / Range / a Surah
 * that fits on one real Mushaf page -- the caller decides, this renderer
 * just draws whichever it's told); anything bigger shows `readViewLinkHtml`
 * instead and leaves reading it to the Read screen. Notes is the one field
 * that's always there, whatever the scope -- from one āyah up to the whole
 * Qur'an.
 */
export function renderNoteView({
  unitKey, ref,
  pickerBarHtml, navHtml,
  showAyatText, arabicText, englishText, banglaText, readViewLinkHtml,
  notesHtml, wbwHtml, rootsHtml,
  isBookmarked = false, isFullscreen = false,
  isWbwOn = false, isRootsOn = false, hasNote = false, approachHtml = "", isNotesOpen = false,
  approachOptionsHtml = "", showApproach = false, wideNoteHtml = "",
  // Word by Word / Root read ONE āyah (ayah-renderer.js's panels take a
  // single āyah object) -- so unlike showAyatText (which also covers a
  // Range or a short surah), these two and the Collapse toggle only make
  // sense for a genuine single-āyah scope.
  canWbwRoot = false,
}) {
  const copySharePopover = (kind, goAttr) => `
        <div class="note-sub-wrap" data-note-sub-wrap="${kind}">
          <button type="button" class="note-icon-btn" data-note-sub-toggle="${kind}" title="${kind === "copy" ? t("Copy") : t("Share")}">${kind === "copy" ? "📋" : "📤"}</button>
          <div class="note-sub-popover" data-note-sub="${kind}">${langCheckboxRows(`note-lang-${kind}`, hasNote)}
            <button type="button" class="qm-go-btn" ${goAttr}>${kind === "copy" ? t("Copy") : t("Share")}</button>
          </div>
        </div>`;
  return `
    <div class="note-view" data-unit-key="${escapeHtml(unitKey)}">
      <!-- Enhancement round -- bar 1 stops being a button rack and becomes
           the reading-unit picker, same shape as #readPickers on the Read
           screen ("place all types of reading views to enable here too" --
           the owner's own words). Entirely pre-built by the caller
           (quranrevival.html owns the Study Unit/Surah/Ayah option lists --
           I2, this file never reads surah data), this renderer just places
           it. -->
      <div class="note-pickerbar">${pickerBarHtml}</div>
      ${wideNoteHtml}

      <div class="note-ayahbar">
        <span class="note-ref">${escapeHtml(ref)}</span>
      </div>

      <!-- Bar 2 -- every button, one row. The nav cluster (pre-built by the
           caller, which decides which pair(s) are enabled/hidden -- "one is
           for moving the whole unit of choice, another for moving only a
           single Ayah", both together, the owner's own words) comes first,
           then the four that must always stay visible (Play/Bookmark/Full
           screen), then Copy (kept open -- "keep as much button as possible
           to remain open"), then ⋮ (Share/Aa/WbW/Root/Collapse) and, far
           right, ⋯ (Approach/Journey/whole-Qur'an note). -->
      <div class="note-bar2">
        <span class="note-nav-cluster">${navHtml}</span>
        <button type="button" class="note-icon-btn" data-note-play title="${t("Play")}">▶</button>
        <button type="button" class="note-icon-btn${isBookmarked ? " active" : ""}" data-note-bookmark title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}">${isBookmarked ? "★" : "☆"}</button>
        <button type="button" class="note-icon-btn${isFullscreen ? " active" : ""}" data-note-fullscreen title="${t("Full screen")}" aria-pressed="${isFullscreen ? "true" : "false"}">⤢</button>
        ${copySharePopover("copy", "data-note-copy-go")}

        <!-- ⋮ -- everything that is a CHOICE about how to read/edit, not a
             thing you tap every time: Share (the same expand-in-place
             language picker Copy already uses), Notes formatting (Aa),
             then -- only when there is āyah text on screen at all -- Word by
             Word, Root, and Collapse āyah text. -->
        <div class="note-dot-wrap">
          <button type="button" class="note-icon-btn" data-note-menu-toggle="tools" aria-haspopup="true" aria-expanded="false" title="${t("More")}">⋮</button>
          <div class="quick-menu" data-note-menu="tools">
            ${copySharePopover("share", "data-note-share-go")}
            <button type="button" class="qm-item" data-note-palette-toggle>Aa ${t("Notes formatting")}</button>
            ${canWbwRoot ? `
            <div class="qm-divider"></div>
            <button type="button" class="qm-item${isWbwOn ? " is-on" : ""}" data-note-wbw-toggle aria-pressed="${isWbwOn ? "true" : "false"}">${t("Word by Word")} <span class="qm-caret">${isWbwOn ? "✓" : ""}</span></button>
            <button type="button" class="qm-item${isRootsOn ? " is-on" : ""}" data-note-roots-toggle aria-pressed="${isRootsOn ? "true" : "false"}">${t("Root")} <span class="qm-caret">${isRootsOn ? "✓" : ""}</span></button>
            <div class="qm-divider"></div>
            <button type="button" class="qm-item" data-note-master-toggle title="${t("Notes always stays open")}">${t("Collapse āyah text")}</button>` : ""}
          </div>
        </div>

        <span class="note-bar2-spacer"></span>

        <!-- ⋯ -- Approach (only meaningful for a single āyah -- claiming/
             tracking is per-āyah, same as before this round) and Mapping My
             Journey (still the disabled placeholder), plus the enhancement
             round's own new item: one fixed entry into a running note about
             the whole Qur'an. -->
        <div class="note-dot-wrap">
          <button type="button" class="note-icon-btn" data-note-menu-toggle="more" aria-haspopup="true" aria-expanded="false" title="${t("Approach & Journey")}">⋯</button>
          <div class="quick-menu" data-note-menu="more">
            ${showApproach ? `
            <div class="note-approach-wrap">
              <select class="note-approach-select" data-note-approach-select title="${t("Choose an Approach")}" aria-label="${t("Choose an Approach")}">${approachOptionsHtml}</select>
            </div>
            <div class="qm-divider"></div>` : ""}
            <button type="button" class="qm-item" disabled style="color:#aaa;cursor:default;">${t("Mapping My Journey")} <span class="qm-caret">${t("Coming later")}</span></button>
            <div class="qm-divider"></div>
            <button type="button" class="qm-item" data-note-whole-quran>📖 ${t("Note about the whole Qur'an")}</button>
          </div>
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
        ${showAyatText ? `
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
          ${isWbwOn ? `
          <div class="note-field" data-note-field="wbw">
            <div class="note-field-label-row">
              <span class="note-field-label">${t("Word by Word")}</span>
            </div>
            <div class="note-field-body">${wbwHtml ?? ""}</div>
          </div>` : ""}
          ${isRootsOn ? `
          <div class="note-field" data-note-field="rootDerivatives">
            <div class="note-field-label-row">
              <span class="note-field-label">${t("Roots & derivatives")}</span>
            </div>
            <div class="note-field-body">${rootsHtml ?? ""}</div>
          </div>` : ""}
        </div>` : `
        <!-- Enhancement round -- "anything above [single/range/a short
             surah] a user can read from the READ view" (the owner's own
             words): rather than a wall of scripture this screen was never
             meant to carry, a plain line back to where it reads properly,
             and the Notes field becomes the main thing on the page. -->
        <div class="note-readlink">${readViewLinkHtml ?? ""}</div>`}

        <div class="note-field" data-note-field="notes">
          <div class="note-field-label-row">
            <button type="button" class="note-field-toggle" data-note-field-toggle>${isNotesOpen ? "▾" : "▸"}</button>
            <span class="note-field-label">${t("Notes")}</span>
          </div>
          <div class="note-field-body" style="${isNotesOpen ? "" : "display:none"}">
            <div class="note-notes-editor" contenteditable="true" spellcheck="false" data-note-editor data-placeholder="${escapeHtml(t("Type notes here…"))}">${notesHtml ?? ""}</div>
            <p class="note-save-status" data-note-save-status hidden></p>
          </div>
        </div>

        <!-- The Approach card (Track/Guide/Breakdown/Coverage + Claim), only
             for a single-āyah scope (unchanged from before this round) --
             claiming/tracking a wider unit already has its own path ("Track
             this unit" in Study options), so this card doesn't try to cover
             both. Still I2-pure: quranrevival.html builds this HTML
             (way-modal.js's renderWayEmbed) and passes it in already-built. -->
        ${approachHtml ? `<div class="note-approach">${approachHtml}</div>` : ""}
      </div>
    </div>`;
}

let activeNotesEditorEl = null; // module-level, matching QCR's own trick: palette commands always target whichever Notes editor was last focused, never whatever else happens to be focused when a toolbar button is clicked

/**
 * `callbacks`:
 *   buildText(langs)         -> string, for bar 2's Copy/Share popovers
 *   onSaveNote(html)         -> Promise<{ok:boolean, message?:string}>, called on Notes blur
 *   onToggleBookmark()
 *   onPlay()
 *   onPrevUnit() / onNextUnit()   -- the nav cluster's OUTER pair (moves the whole chosen unit)
 *   onPrevAyah() / onNextAyah()   -- the nav cluster's INNER pair (moves one āyah); omitted/absent when the caller didn't render that pair (Single Ayah scope, or no āyah to step through)
 *   onToggleFullscreen()
 *   onToggleWbw() / onToggleRoots()
 *   onApproachChange(id)
 *   onOpenWholeQuranNote()    -- ⋯ menu's new item
 *   onOpenInReadView()        -- the "read it in the Read view" link, only present when the scope wasn't shown as text
 *   onPickerChange            -- delegated: the caller wires its own picker bar's <select> elements directly (they're pre-built HTML it owns), so this file never needs to know their ids
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
    if (!collapsibleWrap) return;
    const collapsed = collapsibleWrap.style.display === "none";
    collapsibleWrap.style.display = collapsed ? "" : "none";
    masterToggle.textContent = collapsed ? t("Collapse āyah text") : t("Expand āyah text");
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

  // ⋮ and ⋯ -- one open at a time, each closes on an outside click, and
  // (round 31's own rule, carried forward) a menu closes itself the moment
  // something inside it is actually picked, so nothing sits open "taking
  // the space" once it's done its job.
  function closeAllDotMenus(exceptToggle) {
    view.querySelectorAll("[data-note-menu-toggle]").forEach((btn) => {
      if (btn === exceptToggle) return;
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("active");
      view.querySelector(`[data-note-menu="${btn.dataset.noteMenuToggle}"]`)?.classList.remove("open");
    });
  }
  view.querySelectorAll("[data-note-menu-toggle]").forEach((btn) => {
    const menu = view.querySelector(`[data-note-menu="${btn.dataset.noteMenuToggle}"]`);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains("open");
      closeAllDotMenus(null);
      menu.classList.toggle("open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      btn.classList.toggle("active", willOpen);
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
  });

  // Copy and Share (each its own popover of language checkboxes, opened by
  // its own icon) -- unchanged mechanism from before this round, just
  // reachable from inside ⋮ for Share now instead of its own bar-2 icon.
  function closeSubPopovers(exceptWrap) {
    view.querySelectorAll("[data-note-sub-wrap]").forEach((wrap) => {
      if (wrap === exceptWrap) return;
      wrap.querySelector(".note-sub-popover")?.classList.remove("open");
      wrap.querySelector("[data-note-sub-toggle]")?.classList.remove("active");
    });
  }
  view.querySelectorAll("[data-note-sub-wrap]").forEach((wrap) => {
    const toggleBtn = wrap.querySelector("[data-note-sub-toggle]");
    const popover = wrap.querySelector(".note-sub-popover");
    toggleBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !popover.classList.contains("open");
      closeSubPopovers(null);
      if (willOpen) {
        popover.classList.add("open");
        toggleBtn.classList.add("active");
      }
    });
  });
  const copyWrap = view.querySelector('[data-note-sub-wrap="copy"]');
  const copyGoBtn = view.querySelector("[data-note-copy-go]");
  copyGoBtn?.addEventListener("click", async () => {
    const langs = [...copyWrap.querySelectorAll("input[type=checkbox]")].filter((cb) => cb.checked).map((cb) => cb.dataset.lang);
    const ok = await copyToClipboard(callbacks.buildText(langs));
    await flashBtn(copyGoBtn, ok ? t("✓ Copied") : t("Copy failed"));
    closeSubPopovers(null);
  });
  const shareWrap = view.querySelector('[data-note-sub-wrap="share"]');
  view.querySelector("[data-note-share-go]")?.addEventListener("click", () => {
    const langs = [...shareWrap.querySelectorAll("input[type=checkbox]")].filter((cb) => cb.checked).map((cb) => cb.dataset.lang);
    shareText(callbacks.buildText(langs), view.dataset.unitKey);
    closeSubPopovers(null);
    // Share now lives inside ⋮ (moved there this round) -- closing just its
    // own sub-popover would leave the outer dropdown sitting open.
    closeAllDotMenus(null);
  });

  view.querySelector("[data-note-wbw-toggle]")?.addEventListener("click", () => { callbacks.onToggleWbw?.(); closeAllDotMenus(null); });
  view.querySelector("[data-note-roots-toggle]")?.addEventListener("click", () => { callbacks.onToggleRoots?.(); closeAllDotMenus(null); });
  view.querySelectorAll("[data-note-approach-select]").forEach((sel) => {
    sel.addEventListener("change", () => { callbacks.onApproachChange?.(sel.value); closeAllDotMenus(null); });
  });
  view.querySelector("[data-note-whole-quran]")?.addEventListener("click", () => { closeAllDotMenus(null); callbacks.onOpenWholeQuranNote?.(); });
  view.querySelector("[data-note-play]")?.addEventListener("click", () => callbacks.onPlay?.());
  view.querySelector("[data-note-prev-unit]")?.addEventListener("click", () => callbacks.onPrevUnit?.());
  view.querySelector("[data-note-next-unit]")?.addEventListener("click", () => callbacks.onNextUnit?.());
  view.querySelector("[data-note-prev-ayah]")?.addEventListener("click", () => callbacks.onPrevAyah?.());
  view.querySelector("[data-note-next-ayah]")?.addEventListener("click", () => callbacks.onNextAyah?.());
  view.querySelector("[data-note-fullscreen]")?.addEventListener("click", () => callbacks.onToggleFullscreen?.());
  view.querySelector("[data-note-open-read]")?.addEventListener("click", () => callbacks.onOpenInReadView?.());
  view.querySelectorAll("[data-note-wide-open]").forEach((btn) => {
    btn.addEventListener("click", () => callbacks.onOpenWideNote?.(btn.dataset.noteWideOpen));
  });

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
      v.querySelectorAll("[data-note-sub-wrap]").forEach((wrap) => {
        const sub = wrap.querySelector(".note-sub-popover");
        const subBtn = wrap.querySelector("[data-note-sub-toggle]");
        if (sub?.classList.contains("open") && !wrap.contains(e.target)) {
          sub.classList.remove("open");
          subBtn?.classList.remove("active");
        }
      });
      v.querySelectorAll("[data-note-menu-toggle]").forEach((btn) => {
        const menu = v.querySelector(`[data-note-menu="${btn.dataset.noteMenuToggle}"]`);
        if (menu?.classList.contains("open") && !menu.contains(e.target) && e.target !== btn) {
          menu.classList.remove("open");
          btn.classList.remove("active");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }
}
