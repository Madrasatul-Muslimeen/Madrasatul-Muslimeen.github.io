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
//   - attachQcrDrawerHandlers() (the QCR pop-up's drawer; the full-stage Note view was retired in v10, step b)
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
        <button type="button" class="qm-item" data-qm-qcr>📚 ${t("QCR collection(s)…")}</button>
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
export function attachQuickMenuHandlers(container, { buildText, onPlay, onOpenNote, onToggleBookmark, onToggleWbw, onToggleRoots, onToggleDerivatives, onQcr }) {
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
    wrap.querySelector("[data-qm-qcr]")?.addEventListener("click", () => {
      closeAllQuickMenus(container);
      onQcr?.(unitKey);
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

/** The QCR drawer's own handlers -- Attach ticks, the Group radios, the
 *  Group/Attach/Yr Level dropdown toggles and the Yr Level ticks -- bound
 *  under `view`. The QCR pop-up binds it (the Note view that
 *  used to share it is gone).
 *  Callbacks used: onToggleCollectionMembership, onSwitchCollection,
 *  onToggleGroupYrLevel. */
export function attachQcrDrawerHandlers(view, callbacks) {
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
}
