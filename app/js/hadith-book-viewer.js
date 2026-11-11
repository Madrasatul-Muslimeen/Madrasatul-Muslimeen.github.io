// The "Original book page" button and its pop-up pane (the Owner, 11 Nov 2026: "popup pane yes").
// The pane shows archive.org's own reader on the right page of the scan, with a credit line, an "Open on archive.org"
// link as the way out, and ×, Escape or a tap outside to come back to the card (the way-back law: focus returns to the
// button that opened it).
import { el } from "./hadith-shared-ui.js";
import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { hasBookPages, loadBookPage, BOOK_PAGE_BOOKS, BOOK_PAGE_CREDIT_URL } from "./hadith-book-pages.js";

let openPane = null;

function closePane() {
  if (!openPane) return;
  const { overlay, opener, onKey } = openPane;
  document.removeEventListener("keydown", onKey, true);
  overlay.remove();
  document.body.classList.remove("book-page-open");
  openPane = null;
  if (opener && document.contains(opener)) opener.focus();
}

function showPane(info, number, opener) {
  closePane();
  const book = info.book;
  const bookName = getAppLang() === "bn" ? book.title.bn : book.title.en;
  const overlay = el("div", "book-page-overlay");
  overlay.dataset.bookPagePane = "true";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  const title = t("{book}, hadith {n}", { book: bookName, n: num(String(number)) });
  overlay.setAttribute("aria-label", t("Original book page") + ": " + title);

  const pane = el("div", "book-page-pane");
  const head = el("div", "book-page-head");
  head.appendChild(el("span", "book-page-title", title));
  const close = el("button", "book-page-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", t("Close"));
  close.dataset.bookPageClose = "true";
  head.appendChild(close);
  pane.appendChild(head);

  if (info.approximate) pane.appendChild(el("p", "book-page-note", t("This hadith is on this page or the one just after it.")));

  const body = el("div", "book-page-body");
  const wait = el("p", "book-page-wait", navigator.onLine === false ? t("The book page needs an internet connection.") : t("Loading the book page…"));
  body.appendChild(wait);
  const frame = document.createElement("iframe");
  frame.className = "book-page-frame";
  frame.title = t("Original book page");
  frame.referrerPolicy = "no-referrer";
  frame.dataset.bookPageFrame = "true";
  frame.addEventListener("load", () => wait.remove());
  frame.src = info.embedUrl;
  body.appendChild(frame);
  pane.appendChild(body);

  const foot = el("div", "book-page-foot");
  const credit = document.createElement("a");
  credit.className = "book-page-credit";
  credit.href = BOOK_PAGE_CREDIT_URL;
  credit.target = "_blank"; credit.rel = "noopener noreferrer";
  credit.textContent = t("Scan: Darussalam edition, shared on archive.org");
  foot.appendChild(credit);
  const out = document.createElement("a");
  out.className = "book-page-open-link";
  out.dataset.bookPageOpenLink = "true";
  out.href = info.openUrl;
  out.target = "_blank"; out.rel = "noopener noreferrer";
  out.textContent = t("Open on archive.org");
  foot.appendChild(out);
  pane.appendChild(foot);
  overlay.appendChild(pane);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closePane(); });
  close.addEventListener("click", closePane);
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePane(); return; }
    if (e.key === "Tab") { // keep Tab inside the pane: × -> link -> credit -> ×
      const ring = [close, credit, out];
      const i = ring.indexOf(document.activeElement);
      e.preventDefault();
      ring[(i + (e.shiftKey ? ring.length - 1 : 1)) % ring.length].focus();
    }
  };
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  document.body.classList.add("book-page-open");
  openPane = { overlay, opener, onKey };
  close.focus();
}

/**
 * The button for one hadith, or null when its book has no scan (so a book without one shows nothing, never a dead button).
 * `number` is the STANDARD number the card already shows; it is opened by `loadBookPage`, which reads the book's page map
 * on first use only.
 */
export function bookPageButton(versionUri, number) {
  if (!hasBookPages(versionUri) || !(Math.trunc(Number(number)) > 0)) return null;
  const wrap = el("div", "book-page-row");
  const btn = el("button", "hadith-view-source book-page-button", t("Original book page"));
  btn.type = "button";
  btn.dataset.bookPageButton = String(number);
  const note = el("span", "book-page-error");
  note.setAttribute("role", "status");
  btn.addEventListener("click", async () => {
    note.textContent = "";
    btn.disabled = true;
    try {
      const info = await loadBookPage(versionUri, number);
      if (!info) note.textContent = t("No book page is listed for this hadith.");
      else showPane(info, number, btn);
    } catch (err) {
      note.textContent = t("The book page could not be loaded. Check your connection and try again.");
    } finally { btn.disabled = false; }
  });
  wrap.append(btn, note);
  return wrap;
}

export { BOOK_PAGE_BOOKS };
