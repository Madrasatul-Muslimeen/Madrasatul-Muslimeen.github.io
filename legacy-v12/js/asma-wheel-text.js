// Asma ul Husna wheel text-size round (3 Sep 2026) -- the owner's own ask:
// "Make the Arabic Names on the wheel of 'Asma' 50% bigger... (actually
// enable me to resize the names myself)" plus "enable me to resize and
// wrapping the texts on the wheel for groups as well." Two independent,
// user-adjustable scales for the Explore -> Asma ul Husna wheel's OWN
// in-slice text (mastery-wheel.js's `sliceLines`/`sliceArabicLines` option,
// which no other wheel in the app ever sets) -- the wheel's plain outer
// numbers (.wheel-seg-num) and every other wheel (QCR, the plain Explore
// Quran wheel, the main Approach wheel) are completely untouched.
//
// "ar" is the Arabic Name shown on the Names-level wheel's own first slice
// line -- defaults to 1.5 (the owner's own literal "50% bigger"), since
// that was the actual starting size asked for before "actually enable me to
// resize" turned it into a real, adjustable control rather than a one-off
// hardcode. "label" is the wrapped, non-Arabic text -- a Group's own title
// on the Groups-level wheel, and a Name's own display-language name on the
// Names-level wheel underneath its Arabic -- defaults to 1 (unchanged)
// since only the CONTROL was asked for there, not a bigger starting point.
//
// Applied as CSS custom properties on :root (--asmax-wheel-ar-scale /
// --asmax-wheel-label-scale), the same shape text-size.js already
// established for the Quran reading screens -- localStorage-only, additive:
// no new startup read, no collection, no firestore.rules change (I9
// untouched), since this module only ever does anything once
// quranrevival.html's own Explore -> Asma ul Husna panel is actually open.
//
// Because a bigger LABEL font needs fewer characters per wrapped line to
// keep fitting inside its own slice (quranrevival.html's own
// wheelLabelMaxLen(), which reads getAsmaWheelLabelScale() below), changing
// either slider notifies subscribers via onAsmaWheelTextScaleChange() so the
// CURRENTLY OPEN Asma level can be re-rendered from scratch -- a font-size
// change alone would leave stale, already-wrapped tspans on screen, wrong
// for the new size (the whole point of the second half of the ask: resize
// AND (re-)wrapping, together).
//
// I2-adjacent: this file touches only localStorage and CSS custom
// properties, never Firebase -- the same contract prefs.js/text-size.js
// themselves keep.

import { t, num } from "./i18n.js";

const MIN = 0.6;
const MAX = 2.5;
const STEP = 0.05;
const DEFAULT_AR_SCALE = 1.5;
const DEFAULT_LABEL_SCALE = 1;

const KINDS = {
  ar: { key: "mm_asmax_wheel_ar_scale", cssVar: "--asmax-wheel-ar-scale", def: DEFAULT_AR_SCALE },
  label: { key: "mm_asmax_wheel_label_scale", cssVar: "--asmax-wheel-label-scale", def: DEFAULT_LABEL_SCALE },
};

function readScale(kind) {
  try {
    const raw = localStorage.getItem(KINDS[kind].key);
    if (raw === null) return KINDS[kind].def;
    const n = Number(raw);
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : KINDS[kind].def;
  } catch {
    return KINDS[kind].def;
  }
}

const cached = { ar: readScale("ar"), label: readScale("label") };
const listeners = new Set();

/** Pushes the current in-memory scales onto :root -- called once at module
 *  load (so the very first paint of an opened Asma panel already reflects
 *  the reader's own saved sizes) and again after every change. */
function applyToRoot() {
  try {
    for (const kind of Object.keys(KINDS)) {
      document.documentElement.style.setProperty(KINDS[kind].cssVar, String(cached[kind]));
    }
  } catch {
    // Not a browser (or a truly exotic embed with no documentElement) --
    // the CSS calc()s all carry a plain fallback, so the wheel still renders
    // at its ordinary sizes either way.
  }
}
applyToRoot();

export function getAsmaWheelArScale() {
  return cached.ar;
}
export function getAsmaWheelLabelScale() {
  return cached.label;
}

function setScale(kind, value) {
  if (!KINDS[kind]) return cached;
  const n = Math.max(MIN, Math.min(MAX, Number(value) || KINDS[kind].def));
  cached[kind] = n;
  try { localStorage.setItem(KINDS[kind].key, String(n)); } catch {}
  applyToRoot();
  syncSliders();
  listeners.forEach((fn) => { try { fn(); } catch {} });
  return cached;
}

export function setAsmaWheelArScale(value) {
  return setScale("ar", value);
}
export function setAsmaWheelLabelScale(value) {
  return setScale("label", value);
}

/** The "All" slider's own gesture -- sets both scales to the same value at
 *  once, each still independently adjustable afterward. */
export function setAllAsmaWheelTextScales(value) {
  setScale("ar", value);
  setScale("label", value);
  return cached;
}

export function resetAsmaWheelTextScales() {
  setScale("ar", DEFAULT_AR_SCALE);
  setScale("label", DEFAULT_LABEL_SCALE);
  return cached;
}

/** Fires whenever either scale actually changes (a dragged slider, "All", or
 *  Reset) -- the caller (quranrevival.html) uses this to re-render whichever
 *  Asma level is currently on screen, since the wheel's own wrapping has to
 *  reflow for the new size, not merely repaint at a stale wrap. Returns an
 *  unsubscribe function. */
export function onAsmaWheelTextScaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
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
        data-awtext-slider="${kind}" data-awtext-for="${idPrefix}"
        aria-label="${escapeHtml(label)}">
      <span class="text-size-row-pct" data-awtext-pct="${kind}" data-awtext-for="${idPrefix}">${pctText(value)}</span>
    </div>`;
}

/** JUST the control rows -- the "All" slider, the two per-scale sliders and
 *  Reset -- with no button and no popover of their own around them. Added
 *  4 Sep 2026, when the owner asked for the Asma level bar's buttons to be
 *  "combined in a pallette under in one button": this control folded INTO
 *  that palette rather than keeping a second ⋯-sized button of its own
 *  beside it, so the rows now need to render on their own. Reuses
 *  text-size.js's own `.text-size-*` CSS classes verbatim (the same
 *  white-card look, already styled and already proven to fit a narrow bar)
 *  -- only the data-awtext-* attributes are this module's own, kept
 *  deliberately distinct from text-size.js's data-text-size-* ones so the
 *  two modules' document-level listeners can never cross-fire on each
 *  other's controls. */
export function renderAsmaWheelTextRowsHtml(idPrefix) {
  return `
    ${sliderRowHtml(idPrefix, "all", t("All"), DEFAULT_LABEL_SCALE)}
    <div class="text-size-divider"></div>
    ${sliderRowHtml(idPrefix, "ar", t("Arabic"), getAsmaWheelArScale())}
    ${sliderRowHtml(idPrefix, "label", t("Wheel labels"), getAsmaWheelLabelScale())}
    <button type="button" class="text-size-reset" data-awtext-reset="${escapeHtml(idPrefix)}">${escapeHtml(t("Reset"))}</button>`;
}

/** Every slider and percentage on the page is refreshed after a change --
 *  what "All" and Reset move is the two STORED scales, so the two per-scale
 *  rows have to follow them rather than sit at a stale position.
 *  Deliberately queried across the whole document rather than inside an
 *  open `[data-awtext-popover]`, which is what it used to do: since 4 Sep
 *  2026 these rows live inside the Asma level bar's own palette
 *  (bar-palette.js), a container this module knows nothing about and must
 *  not have to. "All" itself is a GESTURE, not a stored value, so it is
 *  never written back to -- only the KINDS keys are. */
function syncSliders() {
  for (const kind of Object.keys(KINDS)) {
    document.querySelectorAll(`[data-awtext-slider="${kind}"]`).forEach((el) => { el.value = String(cached[kind]); });
    document.querySelectorAll(`[data-awtext-pct="${kind}"]`).forEach((el) => { el.textContent = pctText(cached[kind]); });
  }
}

// Wired ONCE, at module load -- delegation on `document`, the same
// "one listener, no per-render rewiring" shape nav.js's outside-click-closes
// and text-size.js's own listeners already use.
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    // Opening/closing whatever container these rows sit in is that
    // container's own job (bar-palette.js since 4 Sep 2026) -- this module
    // only ever owns the controls themselves.
    if (e.target.closest("[data-awtext-reset]")) resetAsmaWheelTextScales();
  });

  document.addEventListener("input", (e) => {
    const slider = e.target.closest("[data-awtext-slider]");
    if (!slider) return;
    const kind = slider.dataset.awtextSlider;
    const value = Number(slider.value);
    if (kind === "all") {
      setAllAsmaWheelTextScales(value);
    } else {
      setScale(kind, value);
      // The "All" row is a gesture, not a stored value -- moving one
      // scale's own slider must never silently move "All" back onto
      // itself, so it's deliberately left where it was.
    }
  });
}
