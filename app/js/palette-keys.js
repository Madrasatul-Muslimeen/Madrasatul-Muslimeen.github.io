// Audit part 154 (issue #1415): the keyboard half of the ⋯ menus (js/bar-palette.js owns open / close / outside click / Escape).
// Imported only by notes.html and journey-map.html, so the shared bar-palette.js and note-window.js (pinned by QR) stay byte for byte.
//  1. Opening a menu from the keyboard (Enter / Space: a click with detail 0) moves focus to its first visible, enabled item.
//  2. Escape on an open menu puts focus back on that menu's ⋯ button (bar-palette.js closes it).
//  3. Tab out of an open menu (focus leaves its wrap) closes it, so focus is never left on a hidden item.
const WRAP = "[data-bar-palette-wrap]";
const TOGGLE = "[data-bar-palette-toggle]";
const POPOVER = "[data-bar-palette]";
const ITEMS = "button, a[href], input, select, textarea, [tabindex]";

function items(pop) {
  return [...pop.querySelectorAll(ITEMS)].filter((e) => !e.disabled && e.getAttribute("tabindex") !== "-1" && !e.closest("[hidden]") && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
}

if (typeof document !== "undefined" && !globalThis.__palette54Bound) {
  globalThis.__palette54Bound = true;
  // 4. A focus ring that shows on the navy sheet: the browser's default ring is a near-black line (1.09:1 on the sheet's #13192a).
  const ringStyle = document.createElement("style");
  ringStyle.dataset.palette54Ring = "";
  ringStyle.textContent = "[data-bar-palette] :is(button, a[href], input, select):focus-visible, [data-pane-menu] :is(button, a[href], input, select):focus-visible { outline: 3px solid #f2e8d5; outline-offset: -3px; }";
  document.head.appendChild(ringStyle);
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest?.(TOGGLE);
    if (!toggle || e.detail !== 0) return;
    requestAnimationFrame(() => {
      const pop = toggle.closest(WRAP)?.querySelector(POPOVER);
      if (!pop || !pop.classList.contains("open")) return;
      const first = items(pop).find((x) => x !== toggle);
      if (first) first.focus();
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const pop = document.querySelector(POPOVER + ".open");
    const toggle = pop?.closest(WRAP)?.querySelector(TOGGLE);
    if (!toggle) return;
    const inside = pop.contains(document.activeElement) || toggle === document.activeElement;
    setTimeout(() => { if (inside && !pop.classList.contains("open")) toggle.focus(); }, 0);
  }, true);
  document.addEventListener("focusin", (e) => {
    document.querySelectorAll(POPOVER + ".open").forEach((pop) => {
      const wrap = pop.closest(WRAP);
      if (wrap && !wrap.contains(e.target)) {
        pop.classList.remove("open");
        wrap.querySelector(TOGGLE)?.setAttribute("aria-expanded", "false");
      }
    });
  });
}
