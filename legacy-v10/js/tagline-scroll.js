// Tagline scrolling (2 Oct 2026, issue 479) -- a line too long for the strip
// slides sideways so it can be read whole, instead of being cut with "…".
//
// Shared by the landing strip (quranrevival.html) and the preview strip
// (taglines.html), so the two can never disagree about how a line moves.
// The settings (on/off, speed) come from taglineSettingsFrom() in taglines.js.
//
// How it moves: the start of the line holds still for HOLD_MS, it slides left
// at the chosen px/s until its END is fully in view, holds there for HOLD_MS,
// then snaps back and repeats. A CSS transform on an inner `.tagline-track`
// (Web Animations API), so no layout is touched while it runs.
//
// A line that fits is never touched: it keeps the ellipsis look exactly.

export const TAGLINE_SCROLL_HOLD_MS = 1500;

/** The slider's 1-10 mapped to pixels per second: 27 at 1, 135 at 10. */
export function scrollPixelsPerSecond(speed) {
  return 15 + speed * 12;
}

/** The timing of one pass for a line `overflowPx` wider than its strip. */
export function scrollPlan(overflowPx, speed) {
  const slideMs = Math.round((overflowPx / scrollPixelsPerSecond(speed)) * 1000);
  return { slideMs, totalMs: TAGLINE_SCROLL_HOLD_MS * 2 + slideMs };
}

export function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureTrack(lineEl) {
  let track = lineEl.querySelector(":scope > .tagline-track");
  if (!track) {
    track = document.createElement("span");
    track.className = "tagline-track";
    while (lineEl.firstChild) track.appendChild(lineEl.firstChild);
    lineEl.appendChild(track);
  }
  return track;
}

/**
 * Start (or decline to start) the scroll on one `.tagline-line` element.
 * Returns a controller { scrolling, pause, resume, firstPassRemainingMs, stop }.
 */
export function attachTaglineScroll(lineEl, { enabled = true, speed = 4 } = {}) {
  const none = { scrolling: false, pause() {}, resume() {}, firstPassRemainingMs: () => 0, stop() {} };
  if (!lineEl) return none;
  const track = ensureTrack(lineEl);
  const full = (track.textContent || "").trim();

  lineEl.classList.remove("tagline-scrolling");
  lineEl.removeAttribute("title");

  if (prefersReducedMotion()) {
    // No movement at all: today's look, ellipsis and all, and the whole text
    // available on hover / long-press.
    if (full) lineEl.title = full;
    return none;
  }
  if (!enabled || !lineEl.clientWidth) return none;

  // Measure with the ellipsis off and the track as wide as its text.
  lineEl.classList.add("tagline-scrolling");
  const overflow = Math.ceil(track.offsetWidth - lineEl.clientWidth);
  if (overflow <= 0 || typeof track.animate !== "function") {
    lineEl.classList.remove("tagline-scrolling");
    return none;
  }

  const { slideMs, totalMs } = scrollPlan(overflow, speed);
  const a = TAGLINE_SCROLL_HOLD_MS / totalMs;
  const b = (TAGLINE_SCROLL_HOLD_MS + slideMs) / totalMs;
  const anim = track.animate(
    [
      { transform: "translateX(0)", offset: 0 },
      { transform: "translateX(0)", offset: a },
      { transform: `translateX(${-overflow}px)`, offset: b },
      { transform: `translateX(${-overflow}px)`, offset: 1 },
    ],
    { duration: totalMs, iterations: Infinity, easing: "linear" }
  );
  return {
    scrolling: true,
    totalMs,
    pause() { anim.pause(); },
    resume() { anim.play(); },
    // Zero once the first full pass has been shown.
    firstPassRemainingMs() { return Math.max(0, totalMs - Number(anim.currentTime || 0)); },
    stop() { anim.cancel(); lineEl.classList.remove("tagline-scrolling"); },
  };
}
