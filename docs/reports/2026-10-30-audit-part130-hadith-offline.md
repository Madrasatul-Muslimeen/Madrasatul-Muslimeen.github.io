# Audit part 130 — Hadith Study, Hadith collections, Dua and Seerah with no internet after one visit

Report only; **no `app/` file changed** (PCF MSA J29, issue #1313). Measured with `tools/i18n-verify/hadith-offline-audit-browser.mjs`
(28 checks pass, 0 fail, 26 INFO lines; re-run it to reprint every finding).

## What was measured

- Pages: `app/hadith-study.html` and `app/hadith-collections.html`. **Both mount the same `hadith-browser.js`**, so they show identical
  content and identical defects; findings below apply to both unless stated. Tabs: Hadith Books ▾, Subjects ▾, Encyclopedia, Topics,
  Search, Explore, Classical Explanations, **Dua**. **Seerah has no page and no tab in `app/`** (the only Seerah in the library is an
  Encyclopedia category, "Seerah and History"); there is nothing to measure for a separate Seerah module.
- Width 390, `en` and `bn`, the real service worker on (`allowServiceWorker`). Online: Hadith Books shelf → open the first book
  (al-Muwatta') → Dua → Encyclopedia → open a category. Then `context.setOffline(true)`, reload, and the same opens again.
- Sandbox note: the Firebase SDK and DOMPurify are stubbed by the harness as in every suite; all hadith data is same-origin, so the
  sandbox could load every file. Outside hosts were not needed.

## What works (guarded by the suite)

| Step | Online | Offline after one visit |
|---|---|---|
| Page reloads | yes | **yes** — the shell (HTML/JS under `/app/`) is served by `sw.js`; menu bar present, no uncaught page error |
| Hadith Books shelf (15 books, en/bn counts) | yes | no (F1) |
| Open a book → chapters | yes | no (F1) |
| Dua list | yes (79 pages of 40) | no (F2) |
| Encyclopedia categories / category | yes | no (F3) |

Nothing was stuck on "Loading…" offline, and no page error was thrown; the failures are drawn on the page, which is why they are findings
and not crashes.

## Data files fetched online under `/tools/hadith-data-pull/output/`

`openiti-release/split/books-summary.json`, `…/split/<book>/index.json`, `concordance/summary.json` + `concordance/<book>.json`,
`hadeethenc-links/summary.json` + `<book>.json`, `dua/index.json`, `dua/cards.json`, `dua/cards-1.json`, `dua/words-1.json`,
`dua/vowels-1.json`, `dua/grammar-1.json`, `hadeethenc/{ar,en,bn}/categories.json`, `hadeethenc/{ar,en,bn}/cat-1.json`.

**None of them is served offline.** `app/sw.js` `CACHEABLE_PATH_PREFIXES` is `"/app/"` and `"/tools/quran-data-pull/output/"` only; the
Quran data was given its place there, the Hadith tree never was. (The browser's own HTTP cache does not rescue it: with the network off
every fetch fails.)

## Findings (numbered; owner = who gets it)

**F1 — Hadith Books: after one visit, offline, the shelf is replaced by a raw browser message.** *(Hadith Lead, plus the Architect for the
`sw.js` part, which is a shared file.)* `hadith-study.html` and `hadith-collections.html`, step "Hadith Books" and "open a book", 390,
en and bn. Seen: the intro note then the single word **`Failed to fetch`** (English, in the Bangla page too; the shelf and the book
list are gone, 0 rows). A book the student read a minute ago does not open. Should see: the books they already opened, from the
device; or, where a book was never opened, a sentence in the page's language such as the one the Books menu already has ("The list of
books could not be loaded. Check the connection and try again." / its Bangla), not the browser's error string.

**F2 — Dua: offline, "Failed to fetch" under the heading.** *(Dua Lead / Hadith Lead.)* Dua tab, 390, en and bn. Seen: "Duas / Dua
chapters / `Failed to fetch`" ("দুআসমূহ / দুআর অধ্যায় / `Failed to fetch`"); no dua opens. Should see: the dua list and any dua already
read, or a translated "could not be loaded" line.

**F3 — Encyclopedia offline: an English-only error and then a SYNTHETIC collection offered as if it were the library.** *(Hadith Lead.)*
Encyclopedia tab, 390, en and bn. Seen: "HadeethEnc structure (Arabic) could not be loaded." in **English even on the Bangla page**
(no `bn` text for it), followed by the always-present "Synthetic pilot collections" (Sample Collection Alpha / Beta). Tapping the first
row opens **Sample Collection Alpha → Book of the Beginning → Chapter on Intention**: invented development data, the only thing that
opens, so a student offline lands on fake narrations while the real ones (online) are unreachable. The text is labelled Synthetic in
three languages, so it is honest, but it reads as the content of the tab. Should see: the real categories from the device, or a
translated could-not-load line and the synthetic block hidden or clearly secondary.

**F4 — The service worker never keeps the Hadith/Dua data (root cause of F1–F3).** *(Architect: `app/sw.js` is shared; the Hadith and
Dua Leads decide what to keep.)* `CACHEABLE_PATH_PREFIXES` omits `/tools/hadith-data-pull/output/`. The data is large (the openiti books
are many MB; Musnad Ahmad alone is 26,855 hadith), so keeping it should be kept-on-first-use per file as the Quran data is, not
pre-downloaded (I9), and probably in its own cache with a size note for the student. A decision for the Leads and Architect, not made here.

**F5 — Raw English error text is the shared pattern.** *(Hadith Lead.)* "Failed to fetch" is the JS `TypeError` message, drawn straight
into the page (F1, F2). Audit part 128 gave `errors.js` a plain read-failure sentence for the shared tools; these Hadith renderers do
not use it. They should call the same plain-message path so the words are the same everywhere and translated.

Not found: stuck "Loading…", a blank pane, or a page error. The `console` shows `net::ERR_INTERNET_DISCONNECTED` lines for the failed
fetches (expected offline).

## Checks run

- `node tools/i18n-verify/hadith-offline-audit-browser.mjs` — 28 passed, 0 failed, 26 INFO.
- `node tools/i18n-verify/behaviour.mjs` (alone) — **972 passed, 0 failed**.
- `node tools/i18n-verify/stub-parity.mjs` — **4 passed, 0 failed**.

## Not done

No fix (report only). Width 390 only; the other tabs (Topics, Search, Explore, Classical Explanations, Subjects) and a single hadith
page inside a book were not walked, because every book fetch already fails offline (F1), so they cannot open either. The suite has no
mutation run because it guards no new app behaviour.
