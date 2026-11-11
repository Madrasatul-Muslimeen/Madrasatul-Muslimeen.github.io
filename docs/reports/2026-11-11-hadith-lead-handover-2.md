# MSA · Hadith Lead — handover 2, 11 Nov 2026 (about 2:30 pm Sydney)

Written by Hadith Lead 11L (session_01PL2xbHqJJsStj3UPMW1vnL), which took over from the 11 Nov Hadith Lead
(session_01PL2xbKxFpDksN5nWdoR3TF). Supersedes `2026-11-11-hadith-lead-handover.md` for the Shamela work; its contacts and rules still hold.
Contacts: PCA 35L `session_01PL2xbJG7YpMtgc2Z4so2y7` · MSA Architect 98L `session_01PL2xbKJpJBPFyWmKuCNia6`.

## State
- **PR #1647** (branch `claude/hadith-book-pages-more`, **ready for review**, not merged, no version): the Shamela printed-page fallback.
  Built on the Architect's `claude/hadith-book-pages-bukhari` (v14.24), already merged into this branch. Do not move that branch's head.
- **Muwatta** (Shamela 28107, ed. al-A'zami): 3670 of 3670 numbers, 2918 of 2920 reader hadith; sample 392 of 399 on the mapped page (control 8).
- **al-Adab al-Mufrad** (Shamela 12991, ed. Abd al-Baqi, one volume): 1321 of 1322; sample 371 of 400 (control 6); the misses read by hand are right pages with
  different narrator wording. A one-volume book's credit names the page and no volume.
- New suite `tools/i18n-verify/hadith-shamela-pages-browser.mjs`: 148 pass, 10 of 10 mutations caught; anchors in `hadith-shamela-anchors.json` (read by hand on live Shamela).
  Existing `hadith-book-pages-browser.mjs`: 109 pass (run before the Adab commit); I changed its Muwatta line (now Darimi) and its `nobutton` mutation anchor.
- The unattended Architect bot would not touch the draft; the Codex reviewer failed only for usage limits (not a finding).

## How the Shamela route works (so a new book is hours, not days)
1. Registry row in `sources/book-pages.json` with `kind: "shamela"`, `shamela: {id, edition, lastIndex}`, `lastNumber`, `versionUri`. Find `lastIndex` by bisection on HTTP 200 vs 404 of `https://shamela.ws/book/<id>/<i>`.
2. `python3 -I tools/hadith-data-pull/shamela-pages-build.py <key> --cache <dir outside the repo>`: reads each page's `<title>` (`ج<vol> - ص<page>`, volume optional), the paragraph-start number (`N -`, or `N / M -` where our number is the first), writes `output/book-pages/<key>.json` = `{i, v, g}`. Cache pages OUTSIDE the repo; about 1.3 pages a second; the second run is from the cache and quick.
3. Prove the map: opening-words of 400 random hadith on the mapped page, with a CONTROL page 50 away that must fail; read 3 anchors by hand on live Shamela and put them in `hadith-shamela-anchors.json`.
4. App: one entry in `BOOK_PAGE_BOOKS` (`hadith-book-pages.js`), Bangla strings if the edition name is new. The card button keys on the book's OWN hadith number (`h.number`), not the concordance's standard number.
- **Lessons:** (a) the first number reader missed two layouts (a two-part number "396 / 120", a number followed straight by a tag): always count what a first run misses before believing a coverage figure; (b) OpenITI `PageV` marks can be too sparse (Ahmad: mark-based map failed its own sample check, 0 of 534): `shamela-pages-from-marks.py` stays only as a documented dead end for books with dense marks; (c) a stale partly-built map in the working tree is not committed.

## Open items
1. **Musnad Ahmad** (Shamela 25794, 23,340 pages): needs a page-by-page crawl, about 5 hours. **Do not start it**: the PCA put it to the Owner as a tick box (PCF PCA J86, `hd1111n`). Registry row exists (`status: planned`); no app entry.
2. **Nasa'i** content-aligned bridge (Darussalam numbering differs from our English text): same Owner tick box. Registry row `status: blocked`.
3. **Darimi**: our text has 3503 hadith, the same count as Shamela 21795 (ed. Husayn Asad), probably the match (36114, ed. al-Zahrani, is the other). A large crawl: ask the PCA first.
4. **Riyad al-Salihin** (Shamela 12014, Risala, 810 pages, no volume): our OpenITI `number` repeats per chapter ("in-chapter / global" printed as `٧/١٢٣-`). It cannot be keyed by number: align by record order (our `n`) with Shamela's global number, verify by text, key the map by `n`, and let the card pass `h.n` for that book (a registry flag such as `keyBy: "n"`). Not built.
5. **Forty Nawawi** (12836, 81 pages): our passages carry no numbers; skipped unless the Owner wants chapter-title matching.
6. The PCF (`p/mmsa`) update for this session was NOT written by me; the PCA relays. "Download this book" stays archive.org only; BwN hosting on hold; `mirrorUrl` empty.
7. Tirmidhi hadith 1 maps to a chapter heading (known, small).

## Rules to keep
lead120 (Hadith files only, own branch, no merge, no version) · the Owner's word overrides the PCA · saw128 and `terms1108` · review rule (360 to 1440, en/bn, 100/150/200%, screenshots looked at, every check proven by a mutation, an uncaught throw is not a caught mutation) · hand over at about 30% context used.
Write "Siyagah" in full; after "Rasulullah" always write "Sallallahu A'laihi Wa Sallam".

## Sandbox lessons added
- Shamela: `shamela.ws/search` is JavaScript-driven (empty by GET); find a book id from the category pages (`/category/6` lists the Sunnah books; the `?page=` parameter was ignored).
- A long run that must outlive a command: start it with `nohup … &` and watch its log with Monitor; do not edit the script it is running while it works.
- `node serve.js` must be running on :8080 for the browser suites; `ln -s /opt/node-tools/node_modules node_modules` at the repo root.
