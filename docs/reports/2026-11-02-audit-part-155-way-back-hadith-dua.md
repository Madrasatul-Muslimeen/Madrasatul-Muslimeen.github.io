# Audit part 155: the way-back law on Hadith Study, Hadith Collections and Dua Study (report only)

Issue #1418. Main was v13.21. **Nothing under `app/` was changed.** The only new file besides this report is the suite
`tools/i18n-verify/way-back-hadith-dua-browser.mjs`. The defects below are for the Hadith and Dua Leads (and, for defect 1,
the Architect and the PCA, because the file is Quran Study's).

The law (decision 86): anything that takes the reader to another page or view leaves a visible way back to the same page and
view, the same place (the hadith or dua that was in view, within one screen height) and the same card or window.

## What was measured

Run: `node tools/i18n-verify/way-back-hadith-dua-browser.mjs [--lang=en|bn] [--width=390|1024]`, from the repository root with
`serve.js` on :8080. Four runs (en 390, en 1024, bn 390, bn 1024) gave identical counts.

**Part 1, controls that leave** (8 controls per run):

| id | page | control | goes to |
|---|---|---|---|
| hc-note | hadith-collections | HadeethEnc hadith 4563, 📝 My Notes | notes.html |
| hs-note | hadith-study | the same | notes.html |
| hc-ayat | hadith-collections | OpenITI passage 611, quoted āyah link 36:38 | Read view |
| hc-duaword | hadith-collections | Dua 1 word, Open in the Word card | Word card |
| hc-duapage | hadith-collections | Dua tab, "Dua Study ↗" | dua-study.html |
| ds-quran | dua-study | a prophet's dua, Open in Quran Study ↗ | Read view |
| ds-note | dua-study | a Hadith-books dua, 📝 My Notes | notes.html |
| ds-ref | dua-study | narration reference "Bukhari 6311" | hadith-collections.html |

Counts per run, identical at all four settings: links found **8**/8 (positive control: >0), back present **8**/8, back
tappable **5**/8, back works **8**/8, place restored **7**/8, card restored **7**/8.

**Part 2, arrivals** (3 per run): the bookmark Open on bookmarks.html for a hadith bookmark, a dua bookmark and, as the
positive control for the pill, a Quran bookmark. Counts per run: Open links found **3**/3, back present **2**/3, back tappable
2/2 of those present, back works **2**/3, place restored **2**/3, card restored **2**/3.
Scan of notes.html, journey-map.html and records.html: 65 in-app links read (positive control), and **6** of them lead into
the Hadith/Dua pages. All six are the top menu's entries (`hadith-study.html?navBack=1`, `dua-study.html?navBack=1`) and carry
the menu's own `navBack=1`. None of the three pages links to a hadith, a dua or a record in these pages in any other way.
There is no per-record link on records.html.

**Mutations** (each strips ONE way-back mechanism through ONE `ctx.route` matching the pathname; every one makes the checks fail):

| mutation | file stripped | what it removes | result |
|---|---|---|---|
| note | js/hadith-study-actions.js | `params.set("back","1")` (both occurrences) | 4 passed, 4 failed (back present, back works, place, card) |
| ayat | js/hadith-browser.js | `&back=1&backTo=hadith` | 4 passed, 4 failed |
| duaword | js/dua-browser.js | `&back=1` on the Word card link | 4 passed, 4 failed |
| duapage | js/dua-browser.js | `?back=1` on the Dua Study link | 4 passed, 4 failed |
| duaquran | js/dua-study.js | `&back=1` on Open in Quran Study | 4 passed, 4 failed |
| duaref | js/dua-study.js | `&back=1` on the narration reference | 4 passed, 4 failed |
| bmreturn | js/bookmark-nav.js | the sessionStorage return a bookmark's Open writes | 11 passed, 12 failed (all three arrivals lose their back) |

The clean runs: en 390, en 1024, bn 390, bn 1024 each 80 passed, 9 failed, and the 9 are the defects below.
Things that already satisfy the law and are now pinned by the suite: both 📝 My Notes links (hadith pages and Dua Study), the
Dua word → Word card round trip, the Dua Study → Quran Study / Hadith Collections round trips (they come back to the same dua
card), and the hadith bookmark's Open (it returns to bookmarks.html, same row).

## Defects

### 1. The Notes pane covers the floating "← Back" pill on arrival in the Read view (2 of the 3 not-tappable backs; the third is defect 4)
- **Page and control:** hadith-collections.html "Āyāt this hadith quotes" (36:38) and dua-study.html "Open in Quran Study ↗"
  both land on `quranrevival.html` whose pill `#ayahCardBackPill` carries "← Back to the hadith" / "← Back".
- **Now:** at 390 and 1024, en and bn, the pill is present and visible, but `elementFromPoint` at its centre returns
  `.rnp-frame` (the Read view's Notes pane, `#readNotePane`, `position: fixed`, open on arrival). A real tap lands in the Notes
  pane, not on the pill. A scripted click on the pill does work (back works 8/8), so the pill logic is right and it is the
  stacking that fails. Playwright's own click times out on it for the same reason.
- **Needed:** the pill must be above the pane or the pane must leave room for it.
- **File a fix would touch:** `app/quranrevival.html` (the pill's z-index/dock, `placeInDock`) or the Notes pane's CSS. This is
  Quran Study's file, FROZEN for the Hadith/Dua Leads: send it to the PCA as "PCA ▸ change request". Same defect is behind both
  the Hadith and the Dua links, so one fix covers them.
- **Caveat:** measured in the harness's default state (a fresh browser). I did not establish whether a real reader's saved
  Notes-pane setting would have it closed.

### 2. "Dua Study ↗" on the Dua tab: coming back loses the Dua tab and the card
- **Page and control:** hadith-collections.html, Dua tab, `a.dua-study-link` (`app/js/dua-browser.js:34`).
- **Now:** dua-study.html shows "← Back" and it returns to hadith-collections.html, but the page opens on its default view:
  `[data-dua-card="1"]` is not there, so neither the place nor the card is restored (place 0, card 0 at all four settings).
  The Dua word link next to it does it properly (it writes `?view=dua&duaPage=&dua=` into the page address before leaving, see
  `dua-browser.js:456`).
- **Needed:** before leaving, write the Dua tab (and the card in view) into the page address, as the Dua word link does, so
  that Back reopens the Dua tab on that card.
- **File:** `app/js/dua-browser.js` (the link's click), and the readers in `app/hadith-collections.html` / `app/hadith-study.html`
  already understand `?view=dua&duaPage=&dua=`.

### 3. A Dua bookmark's Open on bookmarks.html leaves no way back on dua-study.html
- **Page and control:** bookmarks.html, Open on a bookmark with moduleId hadith, position `dua:20`; it opens
  `dua-study.html?resume=dua:20`, which settles at `dua-study.html?g=rasul&open=20`.
- **Now:** no way-back control at all, in any language or width. The Hadith bookmark (to hadith-study.html) and the Quran
  bookmark show the "← Back to Bookmarks" link (`[data-bm-back-link]`) and return correctly; dua-study.html never mounts
  it (the page has only its top "← Back", which is shown for `back=1` and a bookmark's Open does not carry `back=1`). With the
  `bmreturn` mutation the other two lose theirs too, which proves the probe sees it.
- **Needed:** dua-study.html mounts the bookmark back link (`mountBookmarkBack`) as hadith-study.html does through `nav.js`,
  or the Open link carries `back=1`.
- **File:** `app/dua-study.html` (and `app/js/dua-study.js` if the mount belongs there); `app/js/bookmark-nav.js` is shared and
  needs no change.

### 4. Narration reference on a Dua card: the destination's "← Back" is above the screen
- **Page and control:** dua-study.html, a Hadith-books dua card, Source, a reference such as "Bukhari 6311"; goes to
  `hadith-collections.html?openiti=…&passage=6583&back=1`.
- **Now:** the page scrolls to the passage and its `#hadithBackBtn` ("← Back", at the top of the page) is off screen
  (`elementFromPoint` returns nothing at its position). It works when the reader scrolls up, and Back returns to the same
  dua card, so back works, place and card are restored, but the way back is not visible where the reader is.
- **Needed:** a way back that stays on screen (the floating pill shape the law names), or no scroll past it.
- **File:** `app/hadith-collections.html` (`#hadithBackBtn` CSS/placement); the same button is used for every `back=1` arrival
  on this page, so the hadith āyah arrival would benefit.

## Not defects, recorded so they are not rediscovered
- The Hadith 🔖 bookmark does not leave the page (it saves), and the Zab bar's Note/Open actions go through the shared Note
  opener and the existing bookmark/notes routes, which are covered by parts 153 and 123 and the suites named there; no
  separate Hadith/Dua Zab link exists to follow.
- Notes, Mapping My Journey and Records have no source or record link into these pages (only the top menu's `navBack=1` entries).
- hadith-study.html has no `#hadithBackBtn`; a plain `?back=1` arrival there is served by the shared nav, and the bookmark
  arrival is measured above (it passes).

## Counts for the PR (all four settings identical)
Part 1: found 8, back present 8, back tappable 5, back works 8, place 7, card 7.
Part 2: Open links 3, back present 2, back tappable 2, back works 2, place 2, card 2; scan 65 links read, 6 into Hadith/Dua pages (menu entries only).
Totals per run: 80 passed, 9 failed. Seven mutations: every one fails its checks.
