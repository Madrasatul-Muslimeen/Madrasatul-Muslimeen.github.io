// A native <select> cuts a long chosen value when the text is enlarged (audit parts 126 and 132). The full chosen value stays
// readable as the select's title, the way Bookmarks' folder selects have carried it since part 126. No text, no stored data.
// keepSelectTitles(selector) titles every matching select now, again on a change, and again when the page adds or rebuilds selects.
export function keepSelectTitles(selector = "select", root = document) {
  const apply = () => {
    root.querySelectorAll(selector).forEach((sel) => {
      if (sel.title && sel.dataset.autoTitle !== sel.title) return; // someone gave it a title of their own: leave it
      const o = sel.options[sel.selectedIndex];
      const text = o ? o.textContent.trim() : "";
      if (text) { sel.title = text; sel.dataset.autoTitle = text; } else if (sel.dataset.autoTitle) { sel.removeAttribute("title"); delete sel.dataset.autoTitle; }
    });
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
  root.addEventListener("change", later, true);
  new MutationObserver(later).observe(root.body || root, { childList: true, subtree: true });
  apply();
  return apply;
}
