// A native <select> cuts a long chosen value when the text is enlarged (audit parts 126 and 132). The full chosen value stays
// readable as the select's title, the way Bookmarks' folder selects have carried it since part 126. No text, no stored data.
// keepSelectTitles(selector) titles every matching select now, again on a change, and again when the page adds or rebuilds selects.
// withLabel: a select that already has a title (its label, e.g. "For") keeps it and the chosen value follows it: "For: No one in particular".
export function keepSelectTitles(selector = "select", root = document, { withLabel = false } = {}) {
  const apply = () => {
    root.querySelectorAll(selector).forEach((sel) => {
      const o = sel.options[sel.selectedIndex];
      const text = o ? o.textContent.trim() : "";
      // A title that is just the chosen value in the page's language is the translator rewriting our own title, not a label (part 141 sweep: "শিক্ষক: শিক্ষক").
      if (sel.dataset.titleBase === undefined) sel.dataset.titleBase = withLabel ? sel.title : "";
      else if (sel.dataset.autoTitle !== undefined && sel.title !== sel.dataset.autoTitle && sel.title.trim() !== text) sel.dataset.titleBase = sel.title; // the page retitled it
      if (!withLabel && sel.title && sel.dataset.autoTitle === undefined) return; // someone gave it a title of their own: leave it
      const base = sel.dataset.titleBase;
      const next = text ? (base ? base + ": " + text : text) : base;
      if (next !== sel.title) sel.title = next;
      sel.dataset.autoTitle = next;
    });
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
  root.addEventListener("change", later, true);
  new MutationObserver(later).observe(root.body || root, { childList: true, subtree: true });
  apply();
  return apply;
}
