// PCF MSA J104 item 25 (the Owner, 13 Nov 2026, demo v1.10, layout B): the Dua Card's Menu shows FIVE TABS in one row, Show
// (the "Your selections" chips), Share, Keep, Listen, Study, and only the chosen tab's buttons are on screen. Every control
// stays exactly where it was in the DOM and is found by the same selectors; a tab only turns the OTHER groups' display off
// with [data-tab-off], never the `hidden` property (Keep sets and clears `hidden` itself while the progress rows load).
// No imports from Firebase and nothing is fetched. `label` is handed in so this module needs no translation import.

const KEYS = ["show", "share", "keep", "listen", "study"];

function groupOf(panel, key) {
  return key === "show" ? panel.querySelector(":scope > .dua-sel") : panel.querySelector(`:scope > [data-dua-menu-group="${key}"]`);
}

/** Dresses `panel` (.dua-menu-panel) with the tab row. `label(key)` gives each tab's words; `initial` is the first tab shown. */
export function installMenuTabs(panel, label, initial = "show") {
  if (!panel || panel.querySelector(":scope > .dua-menu-tabs")) return null;
  const bar = document.createElement("div");
  bar.className = "dua-menu-tabs";
  bar.setAttribute("role", "tablist");
  bar.setAttribute("aria-label", label("tabs"));
  const tabs = new Map();
  for (const key of KEYS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "dua-menu-tab"; b.setAttribute("role", "tab"); b.dataset.duaTab = key;
    b.textContent = label(key);
    b.id = `${panel.id}-tab-${key}`;
    tabs.set(key, b);
    bar.appendChild(b);
  }
  panel.insertBefore(bar, panel.firstChild);
  let current = KEYS.includes(initial) ? initial : "show";
  const apply = () => {
    for (const key of KEYS) {
      const g = groupOf(panel, key), on = key === current;
      if (g) {
        g.toggleAttribute("data-tab-off", !on);
        g.setAttribute("role", "tabpanel"); g.setAttribute("aria-labelledby", tabs.get(key).id);
      }
      const b = tabs.get(key);
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
    }
  };
  const select = (key, focus = false) => { if (!KEYS.includes(key)) return; current = key; apply(); if (focus) tabs.get(key).focus(); };
  for (const [key, b] of tabs) b.addEventListener("click", () => select(key));
  bar.addEventListener("keydown", (ev) => {
    const i = KEYS.indexOf(current);
    const to = ev.key === "ArrowRight" ? KEYS[(i + 1) % 5] : ev.key === "ArrowLeft" ? KEYS[(i + 4) % 5] : ev.key === "Home" ? KEYS[0] : ev.key === "End" ? KEYS[4] : null;
    if (to) { ev.preventDefault(); select(to, true); }
  });
  // The groups are added to the panel in more than one step (Keep arrives with the progress rows): re-apply when they do.
  new MutationObserver(apply).observe(panel, { childList: true });
  apply();
  return { select, current: () => current };
}
