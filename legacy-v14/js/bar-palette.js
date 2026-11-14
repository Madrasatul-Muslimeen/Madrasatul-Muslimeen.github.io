// One-bar palette (4 Sep 2026) -- the owner's own ask for the Explore ->
// QCR and Explore -> Asma ul Husna screens: "2 pull-down n one combined
// button for all those button, all In one bar... (Only one stuff drops down
// at a time, they can take entire space, but the button don't need that
// much space)" and, for Asma, "all buttons combined in a pallette under in
// one button. all In one bar."
//
// Both bars used to spend two or three stacked rows on a phone: the
// dropdown(s), then a row of Manage-mode icon buttons, then (QCR) a second
// row for the Approach picker. The dropdowns keep the whole width -- they
// are what carries a long, tenant-authored collection or Approach name --
// and everything that was a BUTTON folds behind one small ⋯ toggle, which
// needs no width at all.
//
// Deliberately NOT a renderer of its own content: the palette's own body is
// static markup in the page, so the buttons inside it keep the ids and the
// once-wired handlers they already had (nothing was re-wired to move them),
// and -- the load-bearing half -- a re-render triggered from INSIDE the
// palette (pressing Manage, which re-runs renderQcrLevelBar()) can never
// blow the open popover away from under the reader's finger, because
// nothing rebuilds it.
//
// I2: pure UI. No Firebase, no DOM knowledge beyond its own wrap/toggle/
// popover attributes -- the same "one delegated document listener wired at
// module load" shape nav.js's outside-click-closes, text-size.js and
// asma-wheel-text.js already use, rather than a listener re-attached on
// every render.

const WRAP = "[data-bar-palette-wrap]";
const TOGGLE = "[data-bar-palette-toggle]";
const POPOVER = "[data-bar-palette]";

/** Closes every open palette except `exceptId` -- this is the "only one
 *  stuff drops down at a time" half of the owner's own instruction. A
 *  native <select> already closes whatever else was open when it opens, so
 *  the two dropdowns need nothing; only these popovers do. */
export function closeAllBarPalettes(exceptId = null) {
  document.querySelectorAll(WRAP).forEach((wrap) => {
    if (wrap.dataset.barPaletteWrap === exceptId) return;
    wrap.querySelector(POPOVER)?.classList.remove("open");
    wrap.querySelector(TOGGLE)?.setAttribute("aria-expanded", "false");
  });
}

export function isBarPaletteOpen(id) {
  const wrap = document.querySelector(`[data-bar-palette-wrap="${id}"]`);
  return !!wrap?.querySelector(POPOVER)?.classList.contains("open");
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest(TOGGLE);
    if (toggle) {
      e.stopPropagation();
      const wrap = toggle.closest(WRAP);
      const popover = wrap?.querySelector(POPOVER);
      if (!popover) return;
      const willOpen = !popover.classList.contains("open");
      closeAllBarPalettes(willOpen ? wrap.dataset.barPaletteWrap : null);
      popover.classList.toggle("open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
      return;
    }
    // A click anywhere inside an open palette is the reader USING it (a
    // Manage toggle, an icon button, a slider) -- it must not close it;
    // anything else outside must.
    if (!e.target.closest(POPOVER)) closeAllBarPalettes(null);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllBarPalettes(null);
  });
}
