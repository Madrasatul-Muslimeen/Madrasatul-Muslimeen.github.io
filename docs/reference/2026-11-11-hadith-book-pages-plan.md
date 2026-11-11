# Hadith card → the original book page (scan first, Shamela for the rest) — BUILD PLAN

Written 11 Nov 2026 by the MSA Hadith Lead, for the Owner's decision. **Nothing is built.** Hadith files only (lead120);
the Architect reviews, versions and releases.

## 1. What the Owner asked (10–11 Nov 2026)
- A Hadith card gets a link that opens **the original printed page** of that hadith, so the reader can see "no error of text".
- **The scanned PDF page is the MAIN source**, read smoothly inside the app, for every book we have a scan of, and we keep
  adding books over time.
- **Shamela is the fallback**: it covers every book, as typed text of a named printed edition.

## 2. What was measured (not guessed)
| Fact | Evidence |
|---|---|
| The archive.org item holds Darussalam scans for Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i (vols 1–5, 6), Ibn Majah, Muwatta, Musnad Ahmad | its file list (metadata API) |
| Tirmidhi: 3,507 PDF pages, searchable text on each; the printed page number is in each page header | its `_djvu.xml` |
| A crude search placed ~3,500 of 3,956 hadith numbers (88%), some wrongly (a table-of-contents hit) | my test; a real builder must do better |
| The PDF server accepts range requests (`206`), so one page can be fetched without the 66 MB | HEAD/GET with `Range` |
| **The final archive.org host did not send `Access-Control-Allow-Origin`** in my test → reading the PDF from our own page with a PDF library may be blocked by CORS | headers; **must be re-tested in a real browser** |
| Shamela: `shamela.ws/book/1727/10` opens Sahih Muslim (ed. Abd al-Baqi), page title "vol 1, p. 9 – chapter"; link number = printed page + 1 (an offset per book) | fetched |
| Our OpenITI Arabic files already carry `PageVnnPnnnn` marks (vol/page), and some file names carry Shamela book ids (Muslim 1727, Muwatta 28107, Ahmad 25794, Riyad al-Salihin 12014, 40 Nawawi 12836) | repo |
| Bukhari, Abu Dawud, Tirmidhi, Ibn Majah, Nasa'i, Darimi, Adab al-Mufrad, Adhkar are numbered in another library (JK): their Shamela ids must be matched by hand | file names |
| No page in the app embeds a PDF today; no Content-Security-Policy blocks outside frames | grep of `app/` |

## 3. Design

### 3.1 One registry, one small map per book (build step, not runtime)
- `tools/hadith-data-pull/sources/book-pages.json` — a row per book: key, title, edition + publisher, scan source (archive.org
  item id + file name), Shamela id (if known), numbering scheme, `offset`, status (`planned / mapped / verified`), rights note.
- `tools/hadith-data-pull/book-pages-build.mjs` — reads each scan's OCR text, finds every hadith number with its page, checks
  order and neighbours, writes `output/book-pages/<book>.json` = `{ hadithNo: [pdfPage, confidence] }`. Only these small maps
  (about 40 KB per book) ship in the app. **No PDF is ever copied into our repo or site.**
- A hand-checked **overrides** file per book for the cases the builder marks "doubtful".
- **Adding a book later = one registry row + run the builder + read its report.** That is how "we keep adding books" stays cheap.

### 3.2 The link on the card, chosen by confidence
1. Scan page mapped with high confidence → **"Original page (Darussalam, p. 60)"**.
2. Else Shamela mapped → **"Printed text (Shamela, ed. Abd al-Baqi, vol 1 p. 9)"**.
3. Else no link (never a guess). The label always says which kind of page it is, so the reader is never misled.
- Shown on the HadeethEnc card (through its book + number reference), on the OpenITI reader passage and the Dua card
  *only if the Dua Lead agrees* (Dua files are theirs).

### 3.3 The page viewer (the "main PDF screen")
A pop-up pane over the card: **×, Escape, tap outside, focus returned, ← Back to the card** (the way-back law), previous/next page,
zoom, "open on archive.org" link. Two ways to draw the page — **a one-day spike picks one**:
- **(a) archive.org embed in a frame** (`archive.org/embed/…` at the page). Least work, no PDF library, but we do not control the look
  and the page jump inside a multi-file item must be proven.
- **(b) our own viewer with PDF.js** reading only the needed page by range request. Best feel and control, but needs the CORS test
  to pass, adds a ~1 MB library (loaded only on first use — **I9: nothing on the startup path**) and a worker file.
- Fallback for both: open archive.org in a new tab at the page.
The service worker never caches PDFs.

### 3.4 Shamela fallback
Page = printed page + per-book offset, taken from our own OpenITI marks, so it is exact for the books whose Shamela id we hold
(Muslim, Muwatta, Ahmad, Riyad al-Salihin, 40 Nawawi). The JK books need a one-time id match and an edition check each.

## 4. Phases and honest estimates
| Phase | What | Rough size | Output |
|---|---|---|---|
| **P0 Spike** | Real-browser test: CORS, range reads, archive.org embed vs PDF.js, phone behaviour | 1 day | A one-page finding; choose (a) or (b) |
| **P1 Pilot: Tirmidhi** | Registry, builder, accuracy sample (50 hand-checked), viewer, card link, suites | 3–4 days | Tirmidhi cards open the original page |
| **P2 Shamela fallback** | Muslim, Muwatta, Ahmad, Nawawi first (ids known) | 2–3 days | Every card in those books has a page link |
| **P3 More scans** | Bukhari, Muslim, Abu Dawud, Nasa'i, Ibn Majah, Muwatta, one book at a time | ~1 day each + Shamela id match for the JK books (~2 days) | |
| **P4 Ongoing** | New books by registry row | hours each | |
Overall about **2½–3 weeks** of my time for P0–P3, spread over several small releases. Musnad Ahmad's scan is image-only: Shamela only.

## 5. Quality gates (nothing ships without them)
- **Accuracy:** per book, 50 random hadith checked by eye against the page; wrong-page ≤ 1%; the builder's "doubtful" ones
  get no scan link. Coverage % printed per book.
- **Numbering:** each book's Darussalam number ↔ our card number checked before any link shows; mismatch = no link.
- **Display:** 360 to 1440 px, English and Bangla, 100/150/200%, night look; screenshots looked at; phone pinch-zoom works;
  focus, Escape and the Back button tested; Bangla strings in `bn.js` (own strings only).
- **Checks** mutation-proven, as in every Hadith round; existing Hadith suites stay green.

## 6. Risks
| Risk | Plan |
|---|---|
| CORS blocks reading the PDF | P0 finds it first; fall back to (a) the embed |
| OCR misreads a number | confidence flags, overrides, no link when unsure |
| Darussalam numbering ≠ our numbering | per-book check; hide the link on mismatch |
| archive.org removes or moves the item | links come from the registry; Shamela fallback; one place to fix |
| Copyright (community upload of Darussalam books) | we only link/stream from archive.org, never copy or store; credit shown |
| Weight on phones | PDF library loads only when the pane opens; range reads only |

## 7. Decisions — ANSWERED by the Owner, 11 Nov 2026
- [x] Rights: **credit line is fine** (shown in the pane: "Scan: Darussalam edition, shared on archive.org"); we only link to the scans.
- [x] **Start with Sahih al-Bukhari.** Book order after it: **Bukhari, Muslim, Tirmidhi, Abu Dawud, Nasa'i, Ibn Majah**, then **all other resources** (Muwatta, Ahmad, the rest), "we will keep adding such books".
- [x] Viewer: **pop-up pane**.
- [x] **Dua cards included** (the Dua card files are the Dua Lead's: one call to `bookPageButton` goes into `dua-browser.js`, asked of the Architect/Dua Lead).
- [x] **Eventually every resource can be downloaded to the device, the user's choice.** See 8: this needs a different route from the embed.

## 8. Spike result and build log (11 Nov 2026)
- **Spike (real Chromium, phone width):** archive.org's embed (`/embed/<item>/<file>#page/n<leaf>/mode/1up`) shows the real scanned page in an
  iframe on our origin: Bukhari hadith 112 on leaf 120 ("Page 120/4292"), Arabic and English on the page. **A direct `fetch` of the PDF from our
  page FAILS (CORS)**, so a PDF library inside our page (PDF.js) cannot read archive.org's file. Decision: **use the embed**.
- **Consequence for "download to the device":** the browser cannot read these PDFs from our page, so the app cannot store them itself.
  Options when we get there: (1) a plain "Download this book" link the reader saves to their device; (2) we host copies or a free relay
  (needs the Owner's approval, and copyright care); (3) only the page maps and text go offline, the scan stays online. The app already has
  a "Use the app without internet" offline pack (`offline-ready.js`); the book scans would be a separate, optional, size-warned download.
- **Bukhari map (built):** 7,100 of 7,563 numbers found directly (93.9%); 463 flagged "approximate" (shown with a note: this page or the next).
  Cross-check on 400 direct hits against our own English text: 395 agree; the 5 others read by hand: 4 are spelling/narrator variants in
  our text with the page right, 1 is a false match. Pages never go backwards. File: `output/book-pages/bukhari.json` (38 KB).
- **Built (branch `claude/hadith-book-pages-bukhari`):** `book-pages-build.py`, `sources/book-pages.json`, `hadith-book-pages.js`,
  `hadith-book-viewer.js`, the button on Text-pane narrations, CSS, Bangla strings, suite `hadith-book-pages-browser.mjs` (70 checks, 7 mutations).

## 9. Hand-offs
- New Hadith files only: `book-pages` data tools, a card button in `hadith-browser.js`, a new viewer module and its suite.
- Shared parts I would **ask the Architect** about, not touch: `sw.js` (leave PDFs uncached), any security headers.

## 10. The Owner's second reply (11 Nov 2026): Dua button, "Download this book", and hosting in the BwN Library
- **"If adding it doesn't cause any conflict, you do it"** (the Dua card button): checked, no other remote branch touches `app/js/dua-browser.js`;
  the change is two lines there (an import and one call after the translation folds). Done; the Dua card button works the same way, finding its
  standard number only when pressed. Suite: 100 checks include Dua 1 (= Bukhari 6311).
- **"Download this book"**: built. The pane footer has "Download this book (PDF, 82 MB)" (a plain link; registry fields `pdfFile`, `pdfBytes`).
  The registry/module also have an optional `mirrorUrl`: when a book has one, the download link prefers it and archive.org stays the fallback.
- **Hosting a copy in the BwN Library (Basheera Wa Nazeera): NOT done by me, it is outside this repository and my session.** What it needs, measured:
  | Book | PDF size | Note |
  |---|---|---|
  | Bukhari (Eng-Arabic) | 82 MB | fits a GitHub Pages repo (limit 100 MB per file) |
  | Muslim (Eng-Arabic) | **153 MB** | **over 100 MB**: must be split in two or compressed first |
  | Tirmidhi (Eng) | 66 MB | fits |
  | Abu Dawud 53 MB, Nasa'i 102 + 16 MB, Ibn Majah 98 MB | | Nasa'i vols 1-5 is just over 100 MB; Ibn Majah is close |
  A Pages repo is also meant to stay under about 1 GB in total.
  **Big benefit if hosted on GitHub Pages:** it sends the header that lets our page read the file (archive.org does not). Then the app could show the
  page itself (PDF.js) and the reader could choose "keep on this device" for offline reading, which archive.org cannot give us.
  **Who:** the BwN session (or the Owner) uploads the files; then a `mirrorUrl` per book in `sources/book-pages.json` and `hadith-book-pages.js`
  switches the download link at once. I can prepare the exact file list and a split/compress script for the BwN session if wanted.
