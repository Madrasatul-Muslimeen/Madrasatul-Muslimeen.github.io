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
import { renderTextSizeButtonHtml } from "./text-size.js";

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
 *
 * Multi-student round -- `showBookmark` (default true) drops the Bookmark
 * item entirely when the caller already offers a direct bar-level button
 * for it (quranrevival.html's single-ayah #readBookmarkBtn) -- one mechanism,
 * not two ways to do the same thing on the same screen. The flow view's own
 * call site (several āyahs on screen at once, no single bar-level button
 * can say which one) leaves this at its default and keeps the item.
 *
 * Text-tools round -- `showTextTools` adds the same Word by Word / Root /
 * Derivatives / Collapse group the Note view's own ⋮ menu carries ("also
 * place these options at the appropriate READ view too" -- the owner's own
 * words), so the reading choices are reachable from the text itself rather
 * than only from Study options. The three toggles flip the SAME canonical
 * Study-options checkboxes the Note view's own copies do (the caller wires
 * them), so a choice made in either place shows in both. Collapse is
 * per-āyah and needs no state here: the caller marks whichever element
 * holds that āyah's own text with data-ayah-collapsible-for="<unitKey>",
 * and the handler below toggles it -- the same "the caller owns the DOM,
 * this file only asks for it by key" split every other callback here uses.
 */
export function renderQuickMenu(unitKey, {
  hasNote = false, isBookmarked = false, showBookmark = true,
  showTextTools = false, isWbwOn = false, isRootsOn = false, isDerivativesOn = false,
} = {}) {
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
        ${showBookmark ? `<button type="button" class="qm-item" data-qm-bookmark>${isBookmarked ? "★" : "🔖"} ${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}</button>` : ""}
        <button type="button" class="qm-item" data-qm-note>📝 ${t("Note & more…")}</button>
        ${showTextTools ? `
        <div class="qm-divider"></div>
        <button type="button" class="qm-item${isWbwOn ? " is-on" : ""}" data-qm-wbw aria-pressed="${isWbwOn ? "true" : "false"}">${t("Word by Word")} <span class="qm-caret">${isWbwOn ? "✓" : ""}</span></button>
        <button type="button" class="qm-item${isRootsOn ? " is-on" : ""}" data-qm-roots aria-pressed="${isRootsOn ? "true" : "false"}">${t("Root")} <span class="qm-caret">${isRootsOn ? "✓" : ""}</span></button>
        <button type="button" class="qm-item${isDerivativesOn ? " is-on" : ""}" data-qm-derivatives aria-pressed="${isDerivativesOn ? "true" : "false"}">${t("Derivatives")} <span class="qm-caret">${isDerivativesOn ? "✓" : ""}</span></button>
        <button type="button" class="qm-item" data-qm-collapse>${t("Collapse āyah text")}</button>` : ""}
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
 *   onToggleWbw() / onToggleRoots() / onToggleDerivatives()  -- text-tools round; only wired to anything when showTextTools rendered the rows at all. Take no unitKey: they flip a canonical, screen-wide reading choice (the same Study-options checkbox the Note view's own copies flip), not per-āyah state
 * Re-call after every re-render (innerHTML replace) -- the per-instance
 * listeners below are cheap to re-attach to fresh nodes; only the outside-
 * click listener is guarded against being bound twice on the same container.
 */
export function attachQuickMenuHandlers(container, { buildText, onPlay, onOpenNote, onToggleBookmark, onToggleWbw, onToggleRoots, onToggleDerivatives }) {
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

    // Text-tools round -- the same three reading choices the Note view's own
    // ⋮ menu offers, on the Read screen's own badge. They flip a canonical
    // Study-options checkbox (the caller's job), which re-renders whichever
    // screen is showing -- so the menu is closed first, since the node it
    // lives in is about to be replaced underneath it.
    wrap.querySelector("[data-qm-wbw]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onToggleWbw?.();
    });
    wrap.querySelector("[data-qm-roots]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onToggleRoots?.();
    });
    wrap.querySelector("[data-qm-derivatives]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onToggleDerivatives?.();
    });

    // Collapse is a plain DOM toggle on whichever element the caller marked
    // as holding THIS āyah's own text -- looked up document-wide by unit key
    // rather than by DOM position, because the two call sites sit in
    // completely different places relative to their own text (the flow
    // view's badge is inside the āyah's own block; the single-āyah view's
    // badge lives up in #readBar, nowhere near #ayahPanels). Same
    // toggle-the-label-in-place mechanism the Note view's own master
    // toggle uses, and like it, a full re-render resets it to expanded.
    const collapseBtn = wrap.querySelector("[data-qm-collapse]");
    collapseBtn?.addEventListener("click", () => {
      // Prefer a target that is actually on screen: a hidden container can
      // legitimately still carry the same key (the single-āyah #ayahPanels
      // while a flow shows the same āyah), and folding away something
      // invisible would look like the button doing nothing at all.
      const candidates = [...document.querySelectorAll(`[data-ayah-collapsible-for="${unitKey.replace(/"/g, "")}"]`)];
      const body = candidates.find((el) => el.offsetParent !== null || el.classList.contains("collapsed")) ?? candidates[0];
      if (body) {
        const collapsed = body.classList.toggle("collapsed");
        collapseBtn.textContent = collapsed ? t("Expand āyah text") : t("Collapse āyah text");
      }
      closeAllQuickMenus(container);
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
 * everything else (Share, Notes formatting, Word by Word, Root,
 * Derivatives, Collapse) folds into ⋮, and Approach / Mapping My Journey
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
  unitKey,
  pickerBarHtml, navHtml,
  showAyatText, arabicText, arabicHtml = "", bismillahHtml = "", englishText, banglaText, readViewLinkHtml,
  // Fix round -- "an option to choose one from both, in both READ and NOTE
  // view": ayahDisplayMode "byLanguage" (default) keeps the three separate
  // Arabic/English/Bangla fields below, each pre-built per ayah (englishHtml/
  // banglaHtml, the same leading-badge shape arabicHtml already uses);
  // "byAyah" instead shows ayahByAyahHtml -- one combined field bunching each
  // ayah's own Arabic + English + Bangla together, ayah after ayah, matching
  // what the Read screen's own flow view has always done. Falls back to the
  // old plain-text englishText/banglaText when the caller hasn't passed the
  // new HTML (same "graceful fallback" shape arabicHtml already established).
  ayahDisplayMode = "byLanguage", ayahByAyahHtml = "", englishHtml = "", banglaHtml = "",
  notesHtml, wbwHtml, rootsHtml, derivativesHtml,
  isBookmarked = false, isFullscreen = false,
  isWbwOn = false, isRootsOn = false, isDerivativesOn = false, hasNote = false, approachHtml = "", isNotesOpen = false,
  // Note view enhancement round -- the Track/Guide/Breakdown/Coverage card
  // collapses like Arabic/English/Bangla/Notes do (the owner's own "like
  // the languages"), default CLOSED. approachOptionsHtml/showApproach are
  // gone from here: the Approach picker itself now lives INSIDE approachHtml
  // (way-modal.js's own renderWayEmbed), built by the caller, since it
  // changes what the Track card shows rather than being a separate control.
  isApproachOpen = false, wideNoteHtml = "",
  // Bookmark creation/update round -- true only once a bookmark made
  // elsewhere (the Manager's own "+ New bookmark", or an earlier ☆ tap) is
  // the one currently open here (quranrevival.html tracks which). Omitted
  // entirely rather than shown disabled when nothing is open -- there is
  // nothing to explain, unlike Approach/Mapping My Journey, which are real
  // capabilities that are sometimes unavailable.
  canUpdateBookmark = false,
  // Word by Word / Root / Derivatives read ONE āyah (ayah-renderer.js's
  // panels take a single āyah object) -- so unlike showAyatText (which also
  // covers a Range or a short surah), these three and the Collapse toggle
  // only make sense for a genuine single-āyah scope.
  canWbwRoot = false,
  // Ayah Collections (QCR) round 2 -- the owner's own ask: a way back to
  // whichever collection's list+wheel this āyah was opened from ("There
  // should be a button on the note bar in note view, to come back to the
  // list and the wheel view"), and a way to change which collection(s)
  // this exact āyah belongs to, from ANY Note view regardless of how it
  // was reached ("interconnection is very important" -- confirmed with the
  // owner as every āyah everywhere, not only when arrived via a
  // collection). backToCollectionLabel is null/omitted when this Note view
  // wasn't reached via a collection -- the button is left out entirely
  // rather than shown disabled, matching canUpdateBookmark's own "nothing
  // to explain" rule. collectionsPopoverHtml is pre-built by the caller
  // (quranrevival.html owns the list of collections and their names -- I2,
  // this file never reads that data itself) and is always offered.
  // TOPIC bar round -- collectionsPopoverHtml is now a real bar of
  // dropdowns (TOPIC, then Group/Attach/Yr Level), not a flat list: Group
  // is what onSwitchCollection still wires (see attachNoteViewHandlers),
  // Attach is the unchanged per-āyah membership toggle, and Yr Level is a
  // new per-GROUP field (onToggleGroupYrLevel). This file still only
  // places the HTML the caller built -- I2 holds.
  backToCollectionLabel = null,
  collectionsPopoverHtml = "",
  // 30 Aug 2026 round -- "enable adding/attaching an Ayah... to an existing
  // GROUP, LIST, DUAL AH... may be placing it with the copy/share button."
  // Folded into the SAME ⋯ menu Update bookmark already uses (not a new
  // bar-2 icon -- the mobile-overflow round already moved things OFF this
  // bar for exactly the reason a 7th permanent icon would reintroduce).
  // Owner/prime only, since it writes to asmaCollections/{tenantId} -- the
  // caller (quranrevival.html) decides visibility, this file only places it.
  canAttachAsma = false,
  // Sizing-fix round -- this screen rebuilds .note-body from scratch on a
  // claim, a bookmark toggle, Prev/Next AND now a Group switch too, none of
  // which should slam the 🗂 drawer shut mid-selection (the owner's own
  // report). The caller reads this popover's own "open" class from the live
  // DOM right before the rebuild and hands it straight back here -- same
  // "patch it back in" shape isNotesOpen/isApproachOpen already use for
  // their own fields, just for a dismissible sub-popover instead of a
  // plain collapsible one.
  isCollectionsOpen = false,
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

      <!-- Bar 2 -- every button, one row. The nav cluster (pre-built by the
           caller, which decides which pair(s) are enabled/hidden -- "one is
           for moving the whole unit of choice, another for moving only a
           single Ayah", both together, the owner's own words) comes first,
           then the four that must always stay visible (Play/Bookmark/Full
           screen/Collections) plus Aa (Notes formatting), then ⋮ (Copy/
           Share/WbW/Root/Collapse/Text size) sitting right beside ⋯
           (Approach/Journey/whole-Qur'an note). Mobile-overflow round --
           Copy and Text size (round 3's own resizer) moved OFF the bar and
           INTO ⋮ (the owner's own instruction): this bar was overflowing to
           a visual "3rd bar" on a phone with all of Play/Bookmark/Full
           screen/Copy/Collections/Aa/Text size/⋮/⋯ plus the nav cluster on
           one row -- fewer permanently-visible icons is the fix, not a
           smaller font or a new breakpoint. -->
      <div class="note-bar2">
        <!-- Ayah Collections round 2 -- the way back to wherever this āyah's
             Note view was opened FROM (a collection's own list+wheel), only
             when that's how it was reached. First in the row, matching the
             owner's own picture: the wheel/list view is "analyses and
             organising", Note view is "work/edit tasks" -- this is the
             bridge back. -->
        ${backToCollectionLabel ? `<button type="button" class="note-icon-btn note-back-btn" data-note-back-to-collection title="${t("Back to {name}", { name: backToCollectionLabel })}">◂ ${t("List & wheel")}</button>` : ""}
        <span class="note-nav-cluster">${navHtml}</span>
        <button type="button" class="note-icon-btn" data-note-play title="${t("Play")}">▶</button>
        <button type="button" class="note-icon-btn${isBookmarked ? " active" : ""}" data-note-bookmark title="${isBookmarked ? t("Remove bookmark") : t("Bookmark this āyah")}">${isBookmarked ? "★" : "☆"}</button>
        <button type="button" class="note-icon-btn${isFullscreen ? " active" : ""}" data-note-fullscreen title="${t("Full screen")}" aria-pressed="${isFullscreen ? "true" : "false"}">⤢</button>
        <!-- TOPIC bar round -- the 🗂 drawer is a real bar of dropdowns now:
             TOPIC (which classification system -- QCR today), then that
             topic's own row, Group/Attach/Yr Level, all pre-built by the
             caller (quranrevival.html owns collections/labels data -- I2,
             this file never reads it). -->
        <div class="note-sub-wrap" data-note-sub-wrap="collections">
          <button type="button" class="note-icon-btn${isCollectionsOpen ? " active" : ""}" data-note-sub-toggle="collections" title="${t("Collections")}">🗂</button>
          <div class="note-sub-popover${isCollectionsOpen ? " open" : ""}" data-note-sub="collections">${collectionsPopoverHtml}</div>
        </div>
        <button type="button" class="note-icon-btn" data-note-palette-toggle title="${t("Notes formatting")}">Aa</button>

        <!-- ⋮ -- everything else that is a CHOICE about how to read/edit,
             not a thing you tap every time: Copy and Share (the same
             expand-in-place language picker), Word by Word/Root/
             Derivatives/Collapse when there is āyah text on screen at all,
             and Text size (round 3's own resizer, moved in here from its
             own bar-2 icon in the same mobile-overflow round that moved
             Copy). -->
        <div class="note-dot-wrap">
          <button type="button" class="note-icon-btn" data-note-menu-toggle="tools" aria-haspopup="true" aria-expanded="false" title="${t("More")}">⋮</button>
          <div class="quick-menu" data-note-menu="tools">
            ${copySharePopover("copy", "data-note-copy-go")}
            ${copySharePopover("share", "data-note-share-go")}
            ${canWbwRoot ? `
            <div class="qm-divider"></div>
            <button type="button" class="qm-item${isWbwOn ? " is-on" : ""}" data-note-wbw-toggle aria-pressed="${isWbwOn ? "true" : "false"}">${t("Word by Word")} <span class="qm-caret">${isWbwOn ? "✓" : ""}</span></button>
            <button type="button" class="qm-item${isRootsOn ? " is-on" : ""}" data-note-roots-toggle aria-pressed="${isRootsOn ? "true" : "false"}">${t("Root")} <span class="qm-caret">${isRootsOn ? "✓" : ""}</span></button>
            <button type="button" class="qm-item${isDerivativesOn ? " is-on" : ""}" data-note-derivatives-toggle aria-pressed="${isDerivativesOn ? "true" : "false"}">${t("Derivatives")} <span class="qm-caret">${isDerivativesOn ? "✓" : ""}</span></button>
            <div class="qm-divider"></div>
            <button type="button" class="qm-item" data-note-master-toggle title="${t("Notes always stays open")}">${t("Collapse āyah text")}</button>` : ""}
            ${showAyatText ? `
            <button type="button" class="qm-item${ayahDisplayMode === "byAyah" ? " is-on" : ""}" data-note-ayahmode-toggle aria-pressed="${ayahDisplayMode === "byAyah" ? "true" : "false"}">${t("Show ayah by ayah")} <span class="qm-caret">${ayahDisplayMode === "byAyah" ? "✓" : ""}</span></button>` : ""}
            <div class="qm-divider"></div>
            ${renderTextSizeButtonHtml("noteview", { showLabel: true })}
          </div>
        </div>

        <!-- ⋯ -- Mapping My Journey (still the disabled placeholder) and
             Update bookmark. Approach USED to live here too, disabled with
             "Single āyah only" when the scope wasn't a single āyah -- it
             moved into the Track card's own header (round after: "change
             the approach from inside the card straight away"), and since
             that card only ever shows for a single āyah anyway (unchanged),
             there is nothing left here to explain either way, so the row
             is gone rather than kept as a second, now-pointless copy. -->
        <div class="note-dot-wrap">
          <button type="button" class="note-icon-btn" data-note-menu-toggle="more" aria-haspopup="true" aria-expanded="false" title="${t("Mapping My Journey")}">⋯</button>
          <div class="quick-menu" data-note-menu="more">
            <button type="button" class="qm-item" disabled style="color:#aaa;cursor:default;">${t("Mapping My Journey")} <span class="qm-caret">${t("Coming later")}</span></button>
            ${canUpdateBookmark ? `
            <div class="qm-divider"></div>
            <button type="button" class="qm-item" data-note-update-bookmark>${t("Update bookmark")}</button>` : ""}
            ${canAttachAsma ? `
            <div class="qm-divider"></div>
            <button type="button" class="qm-item" data-note-attach-asma>🔗 ${t("Attach to Asma ul Husna")}</button>` : ""}
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
        ${bismillahHtml}
        <div data-note-collapsible>
          ${ayahDisplayMode === "byAyah" ? `
          <div class="note-field" data-note-field="ayahbyayah">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("Arabic")} · ${t("English")} · ${t("Bangla")}</span>
            </div>
            <div class="note-field-body">${ayahByAyahHtml || `<div class="note-arabic" dir="rtl" lang="ar">${escapeHtml(arabicText)}</div>`}</div>
          </div>` : `
          <div class="note-field" data-note-field="arabic">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("Arabic")}</span>
            </div>
            <!-- Fix round -- arabicHtml is already-safe, pre-built per-ayah
                 markup (an ayah-number badge before each āyah, tajweed
                 colouring when that Study-options tick is on) -- the same
                 leading-number treatment ayah-renderer.js's own
                 renderArabicPanel() gives the Read screen, so the number
                 (and Tajweed, if chosen) shows here without a second
                 switch. Falls back to the old plain-escaped arabicText for
                 any caller that hasn't been updated to pass it. -->
            <div class="note-field-body">${arabicHtml || `<div class="note-arabic" dir="rtl" lang="ar">${escapeHtml(arabicText)}</div>`}</div>
          </div>
          <div class="note-field" data-note-field="english">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("English")}</span>
            </div>
            <!-- Same fallback shape as arabicHtml above -- englishHtml is
                 pre-built per-ayah, ayah-numbered markup; falls back to
                 the old plain-escaped englishText for any caller that
                 hasn't been updated to pass it. -->
            <div class="note-field-body">${englishHtml || `<div class="note-english">${escapeHtml(englishText)}</div>`}</div>
          </div>
          <div class="note-field" data-note-field="bangla">
            <div class="note-field-label-row">
              <button type="button" class="note-field-toggle" data-note-field-toggle>▾</button>
              <span class="note-field-label">${t("Bangla")}</span>
            </div>
            <div class="note-field-body">${banglaHtml || `<div class="note-bangla" lang="bn">${escapeHtml(banglaText)}</div>`}</div>
          </div>`}
          ${isWbwOn ? `
          <div class="note-field" data-note-field="wbw">
            <div class="note-field-label-row">
              <span class="note-field-label">${t("Word by Word")}</span>
            </div>
            <div class="note-field-body">${wbwHtml ?? ""}</div>
          </div>` : ""}
          ${isRootsOn ? `
          <div class="note-field" data-note-field="root">
            <div class="note-field-label-row">
              <span class="note-field-label">${t("Root")}</span>
            </div>
            <div class="note-field-body">${rootsHtml ?? ""}</div>
          </div>` : ""}
          ${isDerivativesOn ? `
          <div class="note-field" data-note-field="derivatives">
            <div class="note-field-label-row">
              <span class="note-field-label">${t("Derivatives")}</span>
            </div>
            <div class="note-field-body">${derivativesHtml ?? ""}</div>
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
             (way-modal.js's renderWayEmbed) and passes it in already-built.
             Collapsible like Arabic/English/Bangla/Notes above -- same
             .note-field/.note-field-toggle markup and the SAME generic
             click handler below already wires for those, so no new JS
             plumbing is needed for the toggle itself to work; only
             REMEMBERING which way it's left (isApproachOpen) needs its own
             listener, the same "survive a rebuild" fix Notes already got. -->
        ${approachHtml ? `
        <div class="note-field" data-note-field="approach">
          <div class="note-field-label-row">
            <button type="button" class="note-field-toggle" data-note-field-toggle>${isApproachOpen ? "▾" : "▸"}</button>
            <span class="note-field-label">${t("Track this āyah")}</span>
          </div>
          <div class="note-field-body" style="${isApproachOpen ? "" : "display:none"}">
            <div class="note-approach">${approachHtml}</div>
          </div>
        </div>` : ""}
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
 *   onToggleWbw() / onToggleRoots() / onToggleDerivatives()
 *   onToggleAyahDisplayMode()  -- Fix round; flips the shared byAyah/byLanguage preference (js/prefs.js) and re-renders
 *   onApproachChange(id)
 *   onOpenInReadView()        -- the "read it in the Read view" link, only present when the scope wasn't shown as text
 *   onPickerChange            -- delegated: the caller wires its own picker bar's <select> elements directly (they're pre-built HTML it owns), so this file never needs to know their ids
 *   onUpdateBookmark()        -- bookmark creation/update round; only wired to anything when canUpdateBookmark rendered the row at all
 *   onAttachAsma()            -- 30 Aug 2026 round; only wired to anything when canAttachAsma rendered the row at all
 *   onBackToCollection()      -- Ayah Collections round 2; only wired to anything when backToCollectionLabel rendered the button at all
 *   onToggleCollectionMembership(collectionId, checked)  -- Ayah Collections round 2; fires once per checkbox in the always-present Collections popover
 *   onSwitchCollection(collectionId | null)  -- TOPIC bar round; fires on the drawer's own Group radio list (alignment-fix round; null for "— none —"). Triggers a full renderNoteViewNow() on the caller's side, but the 🗂 drawer itself survives it (isCollectionsOpen, read live from the DOM right before the rebuild -- see renderQcrDrawerHtml's own header comment); Group's own panel is deliberately NOT kept open across it (a Group pick closes its own panel first, unlike Attach/Yr Level's own openDdKey, which does survive)
 *   onToggleGroupYrLevel(yrLevelId, checked)  -- TOPIC bar round; fires once per checkbox in the Yr Level panel, for whichever collection Group currently points at. On success the caller patches the Attach/Yr Level summary badges directly (see quranrevival.html's refreshQcrDrawerSummaries()) rather than re-rendering, so neither panel -- nor the outer 🗂 popover itself -- closes mid-tick
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
    // A real, standalone selection like every other item in this menu (Share,
    // Word by Word, Root) -- it must close the ⋮ dropdown behind it too,
    // which this one alone was missing (the owner's own report: "the 3
    // vertical dots button's card stays on even after the selection is done").
    closeAllDotMenus(null);
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
  view.querySelector("[data-note-update-bookmark]")?.addEventListener("click", () => {
    closeAllDotMenus(null);
    callbacks.onUpdateBookmark?.();
  });
  view.querySelector("[data-note-attach-asma]")?.addEventListener("click", () => {
    closeAllDotMenus(null);
    callbacks.onAttachAsma?.();
  });

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
    menu.addEventListener("click", (e) => {
      // Mobile-overflow round -- text-size.js's own toggle relies on a
      // document-level delegated click listener to open its popover (one
      // listener, works wherever its markup ends up, per its own header
      // comment); blanket-stopping propagation here would silently swallow
      // that click before it ever reaches document. The stop itself exists
      // so a click on non-button dropdown content (padding, a label, a
      // divider) never bubbles up to #noteView's own tap-toggles-full-screen
      // listener -- keep that for everything else, just not text-size's
      // own controls.
      if (e.target.closest("[data-text-size-wrap]")) return;
      e.stopPropagation();
    });
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
    // Copy now lives inside ⋮ (mobile-overflow round) -- closing just its
    // own sub-popover would leave the outer dropdown sitting open, the same
    // fix Share's own click handler already needed once it moved in here.
    closeAllDotMenus(null);
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
  view.querySelector("[data-note-derivatives-toggle]")?.addEventListener("click", () => { callbacks.onToggleDerivatives?.(); closeAllDotMenus(null); });
  view.querySelector("[data-note-ayahmode-toggle]")?.addEventListener("click", () => { callbacks.onToggleAyahDisplayMode?.(); closeAllDotMenus(null); });
  view.querySelectorAll("[data-note-approach-select]").forEach((sel) => {
    sel.addEventListener("change", () => { callbacks.onApproachChange?.(sel.value); closeAllDotMenus(null); });
  });
  view.querySelector("[data-note-back-to-collection]")?.addEventListener("click", () => callbacks.onBackToCollection?.());
  view.querySelectorAll("[data-note-collection-toggle]").forEach((cb) => {
    cb.addEventListener("change", () => callbacks.onToggleCollectionMembership?.(cb.dataset.noteCollectionToggle, cb.checked));
  });
  // TOPIC bar round -- the 🗂 drawer's own retired-Category-picker section
  // is a real bar of dropdowns: Group/Attach/Yr Level, each opening its
  // own panel. Only one stays open at a time -- closeQcrDropdowns mirrors
  // closeSubPopovers/closeAllDotMenus above for the same reason.
  // Alignment-fix round -- Group moved off a native <select> onto the same
  // dropdown-styled shape as Attach/Yr Level (a full-screen OS picker
  // sheet on a phone was never "like the others"), so it's wired the same
  // generic [data-note-qcr-dd-toggle] way those two already are, below.
  // Its own panel is a radio list rather than checkboxes (one Group at a
  // time, not several tags), and picking one closes the panel immediately
  // -- a Group is a one-shot choice, unlike Attach's own several-ticks-in-
  // a-row use, and closing it here is what makes the very next
  // renderNoteViewNow() (fired by onSwitchCollection, which always
  // rebuilds) read "nothing open" for this one key rather than reopening
  // it with the new pick already showing.
  view.querySelectorAll("[data-note-qcr-group-radio]").forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      closeQcrDropdowns(null);
      callbacks.onSwitchCollection?.(radio.value || null);
    });
  });
  // Sizing-fix round -- the toggle button and its own checklist panel are
  // no longer nested inside a shared wrap (that wrap's own position:relative
  // was only ever there to anchor a position:absolute overlay, which is
  // exactly what made the list read as "trapped inside the card" -- see the
  // .note-qcr-dd-pop CSS comment). The two are matched by the same key
  // string now ("group"/"attach"/"yrlevel") instead of by DOM nesting.
  function closeQcrDropdowns(exceptKey) {
    view.querySelectorAll("[data-note-qcr-dd-pop]").forEach((pop) => {
      if (pop.dataset.noteQcrDdPop === exceptKey) return;
      pop.classList.remove("on");
    });
    view.querySelectorAll("[data-note-qcr-dd-toggle]").forEach((btn) => {
      if (btn.dataset.noteQcrDdToggle === exceptKey) return;
      btn.classList.remove("active");
    });
  }
  view.querySelectorAll("[data-note-qcr-dd-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.dataset.noteQcrDdToggle;
      const pop = view.querySelector(`[data-note-qcr-dd-pop="${key}"]`);
      if (!pop) return;
      const willOpen = !pop.classList.contains("on");
      closeQcrDropdowns(null);
      if (willOpen) { pop.classList.add("on"); btn.classList.add("active"); }
    });
  });
  view.querySelectorAll("[data-note-qcr-yrlevel-toggle]").forEach((cb) => {
    cb.addEventListener("change", () => callbacks.onToggleGroupYrLevel?.(cb.dataset.noteQcrYrlevelToggle, cb.checked));
  });
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
      // Sizing-fix round -- pop and toggle are matched by key now, not by a
      // shared wrap (see closeQcrDropdowns' own comment above).
      v.querySelectorAll("[data-note-qcr-dd-pop]").forEach((pop) => {
        const key = pop.dataset.noteQcrDdPop;
        const btn = v.querySelector(`[data-note-qcr-dd-toggle="${key}"]`);
        if (pop.classList.contains("on") && !pop.contains(e.target) && e.target !== btn) {
          pop.classList.remove("on");
          btn?.classList.remove("active");
        }
      });
    });
  }
}
