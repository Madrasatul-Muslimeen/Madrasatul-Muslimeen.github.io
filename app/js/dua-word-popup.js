// The Owner, 7 Nov 2026 (annotated screenshot): "Open this (the entire section) popup on clicking on word." A tapped dua
// word's whole card (meanings, places, progress, and the Dua Word Card's levels) now opens as a pop-up over the page, not
// inline under the dua's words. The panel element and its `hidden` flag are exactly what they were, so every code path that
// opens or closes it (the word, its ×, Escape, tapping the same word again) keeps working: this only watches `hidden` and
// moves the panel into a pop-up on <body> while it is visible, and back to where it was when it is hidden.
// The way back is the same word, pressed and focused again (the pop-up closes with ×, Escape, or a tap outside it).

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function bindDuaWordPopup(panel, dismiss) {
  let pop = null;
  let home = null; // where the panel lives while it is closed: { parent, next }
  const mount = () => {
    if (pop || !panel.parentNode) return;
    home = { parent: panel.parentNode, next: panel.nextSibling };
    pop = document.createElement("div");
    pop.className = "dua-word-pop";
    pop.dataset.duaWordPop = String(panel.dataset.duaWordPanel ?? "");
    pop.addEventListener("click", (e) => { if (e.target === pop) dismiss(); });
    pop.appendChild(panel);
    document.body.appendChild(pop);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.removeAttribute("tabindex");
    (panel.querySelector(".dua-word-panel-close") ?? panel).focus?.({ preventScroll: true });
  };
  const unmount = () => {
    if (!pop) return;
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
    if (home?.parent?.isConnected) home.parent.insertBefore(panel, home.next && home.next.parentNode === home.parent ? home.next : null);
    pop.remove();
    pop = null; home = null;
  };
  new MutationObserver(() => { if (panel.hidden) unmount(); else mount(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  // Keep Tab inside the pop-up while it is open.
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !pop) return;
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((x) => x.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
