// "My index" for Bukhari: the Owner's own division of Sahih al-Bukhari into 97 books in 8 groups (the Bukhari MyIndex sheet), shown
// as an alternate to the original index in the Chapters pane (PCF MSA, the Owner's "Index: All A", 12 Nov 2026).
// It is built on the STANDARD hadith numbers (the numbers people cite), so a book opens by standard number through the concordance;
// bookmarks, progress and notes keep their present keys. The file is read only when "My index" is first shown (I9: nothing at startup).
import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";

export const MYINDEX_BOOKS = { "0256Bukhari.Sahih.JK000110-ara1": "bukhari" };
const BASE_URL = "../tools/hadith-data-pull/output/myindex/";
const cache = new Map();

export const hasMyIndex = (versionUri) => Object.prototype.hasOwnProperty.call(MYINDEX_BOOKS, versionUri);

export function loadMyIndex(versionUri, { fetchImpl = fetch, baseUrl = BASE_URL } = {}) {
  const key = MYINDEX_BOOKS[versionUri];
  if (!key) return Promise.reject(new Error("No alternate index for this book."));
  if (!cache.has(key)) {
    cache.set(key, fetchImpl(`${baseUrl}${key}.json`).then((res) => {
      if (!res.ok) throw new Error(`Could not load the index (${res.status}).`);
      return res.json();
    }).catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
// A name shown in the reader's language; the sheet's Bangla name for Book 46 is cut short ("…"), so that one falls back to English.
const nameIn = (o, lang) => (lang === "ar" ? o.ar : lang === "bn" && o.bn && !/[…]$/.test(o.bn) ? o.bn : o.en) || o.en;

/** The two buttons "Original index" / "My index" (shown only for a book that has one). */
export function renderIndexSwitch(oi, localRefresh) {
  const bar = el("div", "myindex-switch");
  bar.dataset.myindexSwitch = "true";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", t("Which index"));
  for (const [mode, label] of [["original", t("Original index")], ["my", t("My index")]]) {
    const b = el("button", `myindex-switch-btn${(oi.indexMode || "original") === mode ? " on" : ""}`, label);
    b.type = "button"; b.dataset.myindexMode = mode;
    b.setAttribute("aria-pressed", String((oi.indexMode || "original") === mode));
    b.addEventListener("click", () => { oi.indexMode = mode; localRefresh(); });
    bar.appendChild(b);
  }
  return bar;
}

/** The record n a book opens: its first standard number the app holds. Books 39, 54 and 97 start on a number with no record
 *  (2290, 2711, 7371), so the first one held within the book's range is used (100L review: those taps did nothing). */
export function firstHeldN(b, conc) {
  for (let k = b.first; k <= b.last; k++) { const n = conc?.firstNByCite?.get(k); if (n != null) return n; }
  return null;
}

/** My index: 8 groups of books; a book opens its first hadith by standard number. `conc.firstNByCite` maps standard number -> record n. */
export function renderMyIndex(body, versionUri, oi, localRefresh, conc) {
  const wrap = el("div", "myindex");
  wrap.dataset.myindex = "true";
  body.appendChild(wrap);
  const wait = el("p", "hadith-note", t("Loading…"));
  wrap.appendChild(wait);
  loadMyIndex(versionUri).then((data) => {
    wait.remove();
    const lang = getAppLang();
    const sw = el("label", "myindex-held-switch");
    const cb = el("input"); cb.type = "checkbox"; cb.dataset.myindexHeld = "true"; cb.checked = !!oi.myIndexHeld;
    cb.addEventListener("change", () => { oi.myIndexHeld = cb.checked; localRefresh(); });
    sw.appendChild(cb); sw.appendChild(el("span", null, t("Show what the app holds")));
    wrap.appendChild(sw);
    for (const g of data.groups) {
      const box = el("details", "myindex-group"); box.open = !!(oi.myIndexOpen?.[g.en]);
      box.dataset.myindexGroup = g.en;
      box.addEventListener("toggle", () => { oi.myIndexOpen = { ...(oi.myIndexOpen || {}), [g.en]: box.open }; });
      const sum = el("summary", "myindex-group-head");
      const nm = el("span", "myindex-group-name", nameIn(g, lang));
      if (lang === "bn" && g.bnProposed) nm.title = t("Proposed Bangla name");
      if (lang === "ar") { nm.lang = "ar"; nm.dir = "rtl"; }
      sum.appendChild(nm);
      const hadith = g.books.reduce((s, no) => s + (data.books[no].last - data.books[no].first + 1), 0);
      sum.appendChild(el("span", "hadith-row-meta", t("{b} books · {h} hadith", { b: num(g.books.length), h: num(hadith) })));
      box.appendChild(sum);
      for (const no of g.books) {
        const b = data.books[no];
        const row = el("button", "hadith-row myindex-book");
        row.type = "button"; row.dataset.myindexBook = String(no);
        const left = el("span", "hadith-row-name");
        left.appendChild(el("span", "myindex-book-name", `${num(no)}. ${nameIn(b, lang)}`));
        if (lang !== "ar") { const sub = el("span", "myindex-book-ar", b.ar); sub.lang = "ar"; sub.dir = "rtl"; left.appendChild(sub); }
        else { left.appendChild(el("span", "myindex-book-ar", b.en)); }
        row.appendChild(left);
        row.appendChild(el("span", "hadith-row-meta", `${num(b.first)}–${num(b.last)} · ${num(b.last - b.first + 1)}`));
        if (oi.myIndexHeld) {
          const h = b.held;
          row.appendChild(el("span", "hadith-note myindex-held", t("Arabic {a} · English {e} · Bangla {b}", { a: num(h.ar), e: num(h.en), b: num(h.bn) })));
        }
        row.addEventListener("click", () => {
          const n = firstHeldN(b, conc);
          if (n == null) return;
          oi.chapterId = null; oi.focusPassage = n; localRefresh();
        });
        box.appendChild(row);
      }
      wrap.appendChild(box);
    }
  }).catch((err) => { wait.textContent = t("Could not load this index. {msg}", { msg: err.message }); });
  return wrap;
}
