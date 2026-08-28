// Note-view enhancement round 3 (28 Aug 2026) -- "enable all the languages
// resizeable individually and collectively at the note-view, note-pane view
// ... also same resizing at the READ view too" (the owner's own words).
//
// Scope, deliberately: the three RUNNING TEXT blocks this app already shows
// full ayah content in -- Arabic (.ayah-arabic/.note-arabic/
// .note-popup-row-arabic), English and Bangla translation
// (.ayah-translation/.note-english/.note-bangla). NOT the wheel's own hub
// Arabic (sized by layoutWheelHub()'s own circle-fitting math -- an
// independent multiplier would fight that, not cooperate with it) and NOT
// Mushaf/page view (justifyPageLines() fits real printed-page line widths;
// scaling it needs that function's own math touched, a bigger, separate
// job). Word-by-Word/Root/Derivatives keep their own existing sizing too --
// "the languages" reads as the three running-text blocks the owner named,
// not every Arabic-adjacent panel on the screen.
//
// ONE shared, global preference -- not per-screen -- matching every other
// Quran reading preference already in this app (font, translation
// languages, sideways reading): "how big do I want Arabic/English/Bangla"
// is a personal reading trait, not something that should differ between the
// Read screen and the Note screen for no reason. localStorage, the same
// additive shape every reading preference since round 18 has used: no new
// startup read (applied once at module import, which only happens on a page
// that actually imports this file -- currently only quranrevival.html), no
// collection, no firestore.rules change.
//
// Applied as CSS custom properties on :root (--qr-ar-scale/--qr-en-scale/
// --qr-bn-scale), multiplying each base font-size via calc() in the
// page's own CSS -- see quranrevival.html's own rules for
// .ayah-arabic/.ayah-translation/.ayah-translation-bn/.note-arabic/
// .note-english/.note-bangla/.note-popup-row-arabic. Untouched (scale 1,
// i.e. exactly today's byte-for-byte sizes) until the reader actually
// drags a slider.
//
// I2-adjacent: this file touches only localStorage and CSS custom
// properties, never Firebase -- the same contract prefs.js itself keeps,
// so ayah-note-renderer.js (a pure renderer) can import it freely, same as
// it already imports nothing from Firebase-touching modules.

import { t, num } from "./i18n.js";

const LANGS = ["ar", "en", "bn"];
const MIN = 0.8;
const MAX = 1.6;
const STEP = 0.05;
const DEFAULT_SCALE = 1;

function keyFor(lang) {
  return `mm_text_size_${lang}`;
}

function readScale(lang) {
  try {
    const raw = localStorage.getItem(keyFor(lang));
    if (raw === null) return DEFAULT_SCALE;
    const n = Number(raw);
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

const cached = { ar: readScale("ar"), en: readScale("en"), bn: readScale("bn") };

function cssVarName(lang) {
  return `--qr-${lang}-scale`;
}

/** Pushes the current in-memory scales onto :root -- called once at module
 *  load (so the very first paint already has the reader's own saved sizes)
 *  and again after every change. */
function applyToRoot() {
  try {
    for (const lang of LANGS) {
      document.documentElement.style.setProperty(cssVarName(lang), String(cached[lang]));
    }
  } catch {
    // Not a browser (or a truly exotic embed with no documentElement) --
    // the CSS calc()s all carry a plain "1" fallback, so text still renders
    // at its ordinary size either way.
  }
}
applyToRoot();

export function getTextSizeScale(lang) {
  return cached[lang] ?? DEFAULT_SCALE;
}

export function setTextSizeScale(lang, value) {
  if (!LANGS.includes(lang)) return cached;
  const n = Math.max(MIN, Math.min(MAX, Number(value) || DEFAULT_SCALE));
  cached[lang] = n;
  try { localStorage.setItem(keyFor(lang), String(n)); } catch {}
  applyToRoot();
  syncOpenPopovers();
  return cached;
}

/** The "All" slider's own gesture -- sets every language to the same value
 *  at once ("collectively"), each still independently adjustable afterward
 *  ("individually") since they're just three ordinary stored values. */
export function setAllTextSizeScales(value) {
  for (const lang of LANGS) setTextSizeScale(lang, value);
  return cached;
}

export function resetTextSizeScales() {
  for (const lang of LANGS) setTextSizeScale(lang, DEFAULT_SCALE);
  return cached;
}

function escapeHtml(s) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pctText(value) {
  return `${num(Math.round(value * 100))}%`;
}

function sliderRowHtml(idPrefix, kind, label, value) {
  return `
    <div class="text-size-row" data-text-size-row="${kind}">
      <span class="text-size-row-label">${escapeHtml(label)}</span>
      <input type="range" min="${MIN}" max="${MAX}" step="${STEP}" value="${value}"
        data-text-size-slider="${kind}" data-text-size-for="${idPrefix}"
        aria-label="${escapeHtml(label)}">
      <span class="text-size-row-pct" data-text-size-pct="${kind}" data-text-size-for="${idPrefix}">${pctText(value)}</span>
    </div>`;
}

/**
 * `idPrefix` distinguishes this instance's own DOM nodes from the other two
 * (needed because the flow view/Note view rebuild their own copy on every
 * render, so several instances of this button can legitimately exist in the
 * DOM -- one per stage -- at once). `btnClass` lets each of the three call
 * sites match its own surrounding bar's own button styling (the Note
 * view's dark `.note-icon-btn`, the Read bar's light `secondary qr-ico`,
 * or the PC popup title bar's own unclassed `button` selector) rather than
 * this one shared file guessing at a look that fits nowhere.
 */
export function renderTextSizeButtonHtml(idPrefix, { showAr = true, showEn = true, showBn = true, btnClass = "note-icon-btn" } = {}) {
  const rows = [
    showAr ? sliderRowHtml(idPrefix, "ar", t("Arabic"), getTextSizeScale("ar")) : "",
    showEn ? sliderRowHtml(idPrefix, "en", t("English"), getTextSizeScale("en")) : "",
    showBn ? sliderRowHtml(idPrefix, "bn", t("Bangla"), getTextSizeScale("bn")) : "",
  ].join("");
  // "All" starts at a neutral 100% every time the popover opens -- it is a
  // GESTURE ("set every language to here"), not a fourth stored value, so
  // it never has its own "current" position to remember between opens.
  const allRow = sliderRowHtml(idPrefix, "all", t("All"), DEFAULT_SCALE);
  return `
    <div class="text-size-wrap" data-text-size-wrap="${idPrefix}">
      <button type="button" class="${escapeHtml(btnClass)} text-size-toggle" data-text-size-toggle="${idPrefix}" title="${t("Text size")}" aria-haspopup="true" aria-expanded="false">A±</button>
      <div class="text-size-popover" data-text-size-popover="${idPrefix}">
        ${allRow}
        <div class="text-size-divider"></div>
        ${rows}
        <button type="button" class="text-size-reset" data-text-size-reset="${idPrefix}">${t("Reset")}</button>
      </div>
    </div>`;
}

function closeAllTextSizePopovers(exceptId) {
  document.querySelectorAll("[data-text-size-wrap]").forEach((wrap) => {
    if (wrap.dataset.textSizeWrap === exceptId) return;
    wrap.querySelector(".text-size-popover")?.classList.remove("open");
    wrap.querySelector("[data-text-size-toggle]")?.setAttribute("aria-expanded", "false");
  });
}

/** Every OTHER open popover's own sliders/percentages are refreshed after a
 *  change -- cheap (there are at most three of these on screen at once) and
 *  it means the rare case of two being open together never shows one stale. */
function syncOpenPopovers() {
  document.querySelectorAll(".text-size-popover.open").forEach((pop) => {
    for (const lang of LANGS) {
      const slider = pop.querySelector(`[data-text-size-slider="${lang}"]`);
      const pct = pop.querySelector(`[data-text-size-pct="${lang}"]`);
      if (slider) slider.value = String(getTextSizeScale(lang));
      if (pct) pct.textContent = pctText(getTextSizeScale(lang));
    }
  });
}

// Wired ONCE, at module load -- delegation on `document` means every
// instance this function renders (however many times, wherever placed, even
// ones rebuilt from scratch by a later render) is covered automatically,
// the same "one listener, no per-render rewiring" shape nav.js's own
// outside-click-closes and way-modal.js's own Assign-to popover already use.
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-text-size-toggle]");
    if (toggle) {
      e.stopPropagation();
      const wrap = toggle.closest("[data-text-size-wrap]");
      const popover = wrap?.querySelector(".text-size-popover");
      if (popover) {
        const willOpen = !popover.classList.contains("open");
        closeAllTextSizePopovers(willOpen ? wrap.dataset.textSizeWrap : null);
        popover.classList.toggle("open", willOpen);
        toggle.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) syncOpenPopovers();
      }
      return;
    }
    const resetBtn = e.target.closest("[data-text-size-reset]");
    if (resetBtn) {
      resetTextSizeScales();
      return;
    }
    if (!e.target.closest(".text-size-popover")) closeAllTextSizePopovers(null);
  });

  document.addEventListener("input", (e) => {
    const slider = e.target.closest("[data-text-size-slider]");
    if (!slider) return;
    const kind = slider.dataset.textSizeSlider;
    const value = Number(slider.value);
    if (kind === "all") {
      setAllTextSizeScales(value);
    } else {
      setTextSizeScale(kind, value);
      // The "All" row is a gesture, not a stored value -- moving one
      // language's own slider must never silently move "All" back onto
      // itself, so it's deliberately left where it was.
    }
  });
}
