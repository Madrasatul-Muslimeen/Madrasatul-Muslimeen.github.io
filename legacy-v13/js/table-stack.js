// Audit part 132: a table that does not fit its box at the reader's text size is shown as stacked, labelled rows, with its last
// cell (the actions) on a line of its own, so a button never sits behind a sideways scroll. Nothing changes while the table fits.
// Each cell carries its column's name from the table's own heading (data-label); the text is the page's, nothing is added.
// keepTablesFitting(selector) — `selector` picks the tables; default is every table in the page.
const CSS = `
table.stacked { display: block; overflow: visible; width: 100%; }
table.stacked thead { display: none; }
table.stacked tbody { display: block; }
table.stacked tr { display: flex; flex-wrap: wrap; gap: 0.1rem 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #ddd; }
table.stacked td { display: block; border: 0; padding: 0.1rem 0.3rem; flex: 1 1 40%; min-width: 0; overflow-wrap: anywhere; }
table.stacked td[data-label]::before { content: attr(data-label) ": "; font-weight: 600; }
table.stacked td:last-child { flex-basis: 100%; }
table.stacked td:last-child:empty { display: none; }
`;

export function keepTablesFitting(selector = "table") {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  const tables = () => [...document.querySelectorAll(selector)];
  function fit(table) {
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((tr) => {
      if (tr.querySelector("td[colspan]")) return;
      [...tr.children].forEach((td, i) => { if (heads[i] && td.getAttribute("data-label") !== heads[i]) td.setAttribute("data-label", heads[i]); });
    });
    table.classList.remove("stacked");
    const box = table.parentElement.clientWidth;
    if (box > 0 && Math.max(table.offsetWidth, table.scrollWidth) > box + 1) table.classList.add("stacked");
  }
  const all = () => tables().forEach(fit);
  window.addEventListener("resize", all);
  const start = () => {
    all();
    new MutationObserver(all).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "lang", "class"] });
    for (const t of tables()) {
      const body = t.querySelector("tbody");
      if (body) new MutationObserver(() => fit(t)).observe(body, { childList: true });
      // a table inside something that is shown later (a hidden app root) is re-fitted when that is shown
      for (let a = t.parentElement; a && a !== document.body; a = a.parentElement) new MutationObserver(all).observe(a, { attributes: true, attributeFilter: ["style", "hidden", "open"] });
    }
  };
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  return all;
}
