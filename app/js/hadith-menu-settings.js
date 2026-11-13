// The Settings block inside Hadith Study's Menu (PCF MSA J106, the Owner, 14 Nov 2026, ticks 1B and 4A).
//
// Three loose things sat at the top of the Hadith page: the "Previewing as: Prime" note, the Tenant/Person pickers and the
// text language / card colours. The Owner wants them all under Menu > Settings. The first two belong to SHARED code
// (nav.js renders the note into #navBar; topic-study.js owns #contextBar and its two <select>s), and the Architect's rule is
// that shared parts are MOUNTED, never changed. So this module only RE-PARENTS the very same elements (the Quran page already
// does this with the same note, quranrevival.html relocatePreviewNotice()): same element, same text, same ids, same handlers.
//
// A "View as" preview lives in localStorage and can sit forgotten for weeks (CLAUDE.md: admin controls look "missing"), so
// while one is ON the Menu button itself shows a small cue ("Menu · Preview"); it is gone when the preview is off.
import { el } from "./hadith-shared-ui.js";
import { t } from "./i18n.js";

let host = null;
let previewSlot = null;
let personSlot = null;
const cues = new Set();

function cueText() { return t("· Preview"); }

function adopt() {
  if (!host) return;
  // The note: nav.js re-renders #navBar on a role / language / preview change, so a new copy can appear at any time.
  const fresh = [...document.querySelectorAll(".nav-preview-notice")].filter((n) => !previewSlot.contains(n));
  if (fresh.length) {
    previewSlot.textContent = "";
    previewSlot.appendChild(fresh[fresh.length - 1]);
    for (const extra of fresh.slice(0, -1)) extra.remove();
  } else if (previewSlot.firstChild && !document.querySelector("#navBar")) {
    // no nav on this page at all: nothing to keep
  }
  // The pickers: the page's own #contextBar (Tenant, Person). Moved once; its ids and handlers are untouched.
  const cb = document.getElementById("contextBar");
  if (cb && !personSlot.contains(cb)) personSlot.appendChild(cb);
  const on = !!previewSlot.querySelector(".nav-preview-notice");
  for (const c of cues) { // write only on a CHANGE: a write is a DOM mutation and the observer below would fire again, forever
    if (c.hidden === on) c.hidden = !on;
    const txt = cueText();
    if (c.textContent !== txt) c.textContent = txt;
  }
}

/** The one persistent host for the note and the pickers. The Menu panel appends it every time it opens. */
export function settingsHost() {
  if (host) return host;
  host = el("div", "hadith-menu-settings");
  host.id = "hadithSettingsHost";
  previewSlot = el("div", "hadith-menu-preview");
  previewSlot.dataset.hadithPreviewSlot = "true";
  personSlot = el("div", "hadith-menu-person");
  personSlot.dataset.hadithPersonSlot = "true";
  host.append(previewSlot, personSlot);
  adopt();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; for (const c of [...cues]) if (!c.isConnected) cues.delete(c); /* the bar is rebuilt on every render: forget old buttons (only here, once the new bar is in the page) */ adopt(); });
  }).observe(document.body, { childList: true, subtree: true });
  return host;
}

/** Puts the "Preview" cue on a Menu button. It shows only while a preview is on. */
export function addPreviewCue(button) {
  const c = el("span", "hadith-menu-cue", cueText());
  c.dataset.hadithMenuCue = "true";
  c.hidden = true;
  button.appendChild(c);
  cues.add(c);
  settingsHost();
  adopt();
  return c;
}
