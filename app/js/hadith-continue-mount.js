// PCF MSA J106 S2 (the Owner, 14 Nov 2026, tick 6A): the Continue chips sit at the TOP of Subjects.
//
// The strip is the shared page's own element (#continueStrip, filled by topic-study.js, renderContinueStrip in
// continue-strip.js): same element, same ids, same module, same behaviour. It is only MOUNTED here, by moving the node,
// exactly as hadith-menu-settings.js mounts the "Previewing as" note. topic-study.js keeps its own reference to the node,
// so every refresh of the strip still lands in it wherever it sits.
//
// The corpus re-renders by clearing its root, which would drop a mounted strip out of the page, so render() parks the strip
// in a hidden holder first and Subjects mounts it again.
let strip = null;
let holder = null;

function ensureHolder() {
  if (holder) return holder;
  holder = document.createElement("div");
  holder.id = "hadithContinueHold";
  holder.hidden = true;
  document.body.appendChild(holder);
  return holder;
}

/** Puts the strip back in a hidden place IN the page (so topic-study.js can still find #continueStrip by id). */
export function parkContinueStrip() {
  if (strip && strip.isConnected) ensureHolder().appendChild(strip);
}

/** Mounts the strip as the first thing inside `target`. Returns false when the page has no strip. */
export function mountContinueStrip(target) {
  strip ??= document.getElementById("continueStrip");
  if (!strip) return false;
  target.prepend(strip);
  return true;
}
