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
 * The deeper view: Arabic/English/Bangla read-only (this is platform text,
 * never user-editable -- unlike QCR's own prototype, which let you edit the
 * scripture text itself) plus a rich-text Notes field, all independently
 * collapsible, a master toggle over the first three (never Notes), and the
 * same Copy/Share/Play/bookmark actions the quick menu offers, reached from
 * two bars rather than one (round 31, the owner's own correction of round
 * 30 -- see the .note-bar2 CSS comment for why). No × button (spec, settled
 * with the owner): this view fills the stage and is left the same way any
 * other stage view is left -- tapping a different dock tab.
 */
export function renderNoteView({
  unitKey, ref, arabicText, englishText, banglaText, notesHtml, wbwHtml, rootsHtml,
  isBookmarked = false, hasPrev = false, hasNext = false, isFullscreen = false,
  isWbwOn = false, isRootsOn = false, hasNote = false, approachHtml = "", isNotesOpen = false,
  approachOptionsHtml = "",
}) {
  // Bar 1, the Ayah bar: JUST the reference and the controls that change
  // what's being read (Prev/Next), how Notes is formatted (Aa), and how
  // much of the screen this view takes (Collapse, Full screen). Nothing
  // else competes with the reference for room here, which is the whole
  // point -- round 30 shipped a cut-off reference because Copy/Share/
  // Journey were still crowding this same row.
  const copySharePopover = (kind, goAttr) => `
        <div class="note-sub-wrap" data-note-sub-wrap="${kind}">
          <button type="button" class="note-icon-btn" data-note-sub-toggle="${kind}" title="${kind === "copy" ? t("Copy") : t("Share")}">${kind === "copy" ? "📋" : "📤"}</button>
          <div class="note-sub-popover" data-note-sub="${kind}">${langCheckboxRows(`note-lang-${kind}`, hasNote)}
            <button type="button" class="qm-go-btn" ${goAttr}>${kind === "copy" ? t("Copy") : t("Share")}</button>
          </div>
        </div>`;
  return `
    <div class="note-view" data-unit-key="${escapeHtml(unitKey)}">
      <div class="note-ayahbar">
        <span class="note-ref">${escapeHtml(ref)}</span>
        <button type="button" class="note-icon-btn" data-note-prev ${hasPrev ? "" : "disabled"} title="${t("Previous āyah")}">←</button>
        <button type="button" class="note-icon-btn" data-note-next ${hasNext ? "" : "disabled"} title="${t("Next āyah")}">→</button>
        <button type="button" class="note-icon-btn" data-note-palette-toggle title="${t("Notes formatting")}">Aa</button>
        <button type="button" class="note-icon-btn" data-note-master-toggle title="${t("Collapse āyah text")} (${t("Notes always stays open")})">▾</button>
        <button type="button" class="note-icon-btn${isFullscreen ? " active" : ""}" data-note-fullscreen title="${t("Full screen")}" aria-pressed="${isFullscreen ? "true" : "false"}">⤢</button>
      </div>

      <!-- Bar 2, permanent on every platform, not a mobile-only wrap of
           bar 1 (the owner's own correction to round 30's shape): the
           actions that need a CHOICE made first before they do anything --
           Copy and Share each open the same picker the ⋮ quick menu
           already uses rather than firing on whatever was left ticked.
           Round 32 (the owner's own ask): Bookmark and Play moved in here
           too, between Share and Word by word, so they're always visible
           rather than hidden behind the old 🔖 toggle -- and the Approach
           toggle (data-note-approach-select) sits right after Word by
           word, wired to change currentTrackableId (quranrevival.html's
           changeCurrentTrackable()) and re-render the Track/Guide/
           Breakdown/Coverage card below. On a PC/tablet this bar carries
           Mapping My Journey too, straight after Approach; on a phone
           (CSS, .note-approach-desktop/.note-journey-desktop hidden below
           720px) Approach and Journey move to their OWN bar underneath
           instead, .note-approach-bar-mobile -- see that class's own CSS
           comment for why a phone needed a second row and a desktop
           didn't. -->
      <div class="note-bar2">
        ${copySharePopover("copy", "data-note-copy-go")}
        ${copySharePopover("share", "data-note-share-go")}
        <button type="button" class="note-icon-btn${isBookmarked ? " active" : ""}" data-note-bookmark title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}">${isBookmarked ? "★" : "☆"}</button>
        <button type="button" class="note-icon-btn" data-note-play title="${t("Play")}">▶ ${t("Play")}</button>
        <!-- "WbW" stays a literal Latin abbreviation rather than a
             translated word, the same convention "Aa" already uses on bar
             1 (the palette toggle) -- it's a glyph-like icon, not a
             sentence; the real, translated name lives in the title/
             aria-pressed pair like every other icon on these two bars. -->
        <button type="button" class="note-icon-btn${isWbwOn ? " active" : ""}" data-note-wbw-toggle title="${t("Word by Word")}" aria-pressed="${isWbwOn ? "true" : "false"}">WbW</button>
        <!-- Enhancement round -- "Root" (Roots & derivatives), always right
             after Word by word on every platform, no phone/desktop split
             the way Approach/Journey get: clicking it opens the derivatives
             table below Word by word in the collapsible fields, re-clicking
             closes it. Reuses renderRootDerivativePanel(), the same helper
             Study options' own "Roots & derivatives" tick already calls. -->
        <button type="button" class="note-icon-btn${isRootsOn ? " active" : ""}" data-note-roots-toggle title="${t("Roots & derivatives")}" aria-pressed="${isRootsOn ? "true" : "false"}">${t("Root")}</button>
        <div class="note-approach-wrap note-approach-desktop">
          <select class="note-approach-select" data-note-approach-select title="${t("Choose an Approach")}" aria-label="${t("Choose an Approach")}">${approachOptionsHtml}</select>
        </div>
        <button type="button" class="note-icon-btn note-journey-btn note-journey-desktop" disabled title="${t("Coming later")}">${t("Mapping My Journey")}</button>
      </div>

      <!-- Phone only (CSS) -- Approach and Mapping My Journey, together, in
           their own bar below bar 2 rather than crowding bar 2's single
           line on a narrow screen. See .note-approach-bar-mobile's own CSS
           comment. -->
      <div class="note-approach-bar-mobile">
        <div class="note-approach-wrap note-approach-mobile">
          <select class="note-approach-select" data-note-approach-select title="${t("Choose an Approach")}" aria-label="${t("Choose an Approach")}">${approachOptionsHtml}</select>
        </div>
        <button type="button" class="note-icon-btn note-journey-btn note-journey-mobile" disabled title="${t("Coming later")}">${t("Mapping My Journey")}</button>
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
        <!-- Bookmark, Play, Copy and Share all live on bar 2 now (round 32
             moved Bookmark/Play up beside them) -- nothing left here needs
             its own reveal toggle, so the old 🔖 icon (note-actions-toggle)
             is retired outright rather than kept as dead markup. -->
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
        </div>

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

        <!-- The Approach card (Track/Guide/Breakdown/Coverage + Claim),
             moved in from what used to be a floating pop-up over the wheel.
             Housed HERE, after Notes, and still INSIDE .note-body so it
             scrolls with the rest of the screen rather than sitting pinned
             below it -- the owner's own framing: everything above is for
             STUDY (reading, word-by-word, notes), this card is for
             ASSESSMENT (what status has been claimed for this āyah). It does
             NOT live-update the way the fields above do: it only changes
             when the reader actually taps Claim inside it, same as it always
             has. quranrevival.html builds this HTML (way-modal.js's
             renderWayEmbed) and passes it in already-built -- this file
             stays I2-pure, it never imports way-modal.js or knows what a
             "trackable" is. -->
        ${approachHtml ? `<div class="note-approach">${approachHtml}</div>` : ""}
      </div>
    </div>`;
}

let activeNotesEditorEl = null; // module-level, matching QCR's own trick: palette commands always target whichever Notes editor was last focused, never whatever else happens to be focused when a toolbar button is clicked

/**
 * `callbacks`:
 *   buildText(langs)       -> string, for bar 2's Copy/Share popovers
 *   onSaveNote(html)       -> Promise<{ok:boolean, message?:string}>, called on Notes blur
 *   onToggleBookmark()
 *   onPlay()
 *   onPrev() / onNext()    -- omit/leave the button disabled when there's nowhere to go
 *   onToggleFullscreen()   -- the view's own 2-state full screen (banner/nav/dock hidden, Ayah bar always on)
 *   onToggleWbw()          -- bar 2's Word-by-word toggle (round 31)
 *   onToggleRoots()        -- bar 2's Root (Roots & derivatives) toggle (enhancement round)
 *   onApproachChange(id)   -- bar 2's / the mobile bar's Approach toggle (round 32), called with the newly-picked trackable id
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

  // Icon-only (the owner's ask) -- the label lives in the title/aria-label
  // instead of visible text, same as every other Ayah-bar icon.
  const masterToggle = view.querySelector("[data-note-master-toggle]");
  const collapsibleWrap = view.querySelector("[data-note-collapsible]");
  masterToggle?.addEventListener("click", () => {
    const collapsed = collapsibleWrap.style.display === "none";
    collapsibleWrap.style.display = collapsed ? "" : "none";
    const label = collapsed ? t("Collapse āyah text") : t("Expand āyah text");
    masterToggle.textContent = collapsed ? "▾" : "▸";
    masterToggle.title = collapsed ? `${label} (${t("Notes always stays open")})` : label;
    masterToggle.setAttribute("aria-label", label);
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

  // Bar 2 -- Copy and Share (round 31): each is its own popover of language
  // checkboxes, the same picker the ⋮ quick menu already uses, opened by
  // its OWN icon rather than acting on whatever a shared checkbox group
  // happened to have ticked. Scoped to `wrap` (not the whole view), so
  // Copy's and Share's checkboxes -- both `.note-lang-copy`/`.note-lang-
  // share` classes, chosen only so the two popovers' checked-state can
  // never be confused with each other -- never read across.
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
  });

  view.querySelector("[data-note-wbw-toggle]")?.addEventListener("click", () => callbacks.onToggleWbw?.());
  view.querySelector("[data-note-roots-toggle]")?.addEventListener("click", () => callbacks.onToggleRoots?.());
  // Two instances (desktop bar 2 / phone's own bar below it, CSS picks
  // which one shows) share the same options string and the same callback --
  // whichever one the reader actually sees is the one that fires.
  view.querySelectorAll("[data-note-approach-select]").forEach((sel) => {
    sel.addEventListener("change", () => callbacks.onApproachChange?.(sel.value));
  });
  view.querySelector("[data-note-play]")?.addEventListener("click", () => callbacks.onPlay?.());
  view.querySelector("[data-note-prev]")?.addEventListener("click", () => callbacks.onPrev?.());
  view.querySelector("[data-note-next]")?.addEventListener("click", () => callbacks.onNext?.());
  view.querySelector("[data-note-fullscreen]")?.addEventListener("click", () => callbacks.onToggleFullscreen?.());

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
    });
  }
}
