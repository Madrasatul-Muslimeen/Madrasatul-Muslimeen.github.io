# Audit part 115: Bookmarks, ← Back keeps the place on a phone in Bangla

PCF MSA J29, the way-back law (decision 86). Builder run 2148, issue #1265.

## Measured cause

Reproduced first: `shared-pages-way-back-audit-browser.mjs --page=bookmarks.html --max=30` failed 4 checks, all at
390px in Bangla (`scrollY 0, was 105` and `was 319`); English at 390 and 1440 and Bangla at 1440 passed.

Probe (scroll Bookmarks to 105, tap Open, `goBack()`, read `[scrollY, scrollHeight]` every 250 ms):

| language | before leaving | first reading after return | 250 ms later |
|---|---|---|---|
| en | 105, 1215 | 105, 1147 (restored, page tall enough) | 105, 1215 |
| bn | 105, 1163 | **0, 844** (page one screen tall) | 0, 1163 (never restored) |

So the hypothesis holds: `bookmarks.html` draws its list after an async read. In Bangla at 390 the browser restores the
scroll while the document is still only 844px tall (one screen), clamps it to 0, and does not try again once the list
arrives. English happens to draw before the restore. `mountBackRow(..., { viaHistory: true })` is correct (it calls
`history.back()`); the loss is in the browser's one-shot restoration.

## Fix (shared)

`app/js/bookmark-nav.js` (loaded by every page with the shared menu): on `pagehide` it keeps
`{ scrollY, open <details> indices }` for the address in `sessionStorage` (`mmsa.wayBackPlace`, newest 20 addresses,
30 minutes). On a `back_forward` arrival it polls every 100 ms for up to 6 s; once the page is tall enough
(`scrollHeight >= y + innerHeight`) it reopens the same pop-ups and scrolls to `y`, and stops after holding the place for a
moment. Any wheel, touch, key or pointer input by the reader stops it, so the reader is never overruled. A page the browser
already restored correctly is left alone (the position matches, nothing moves). No server write, no Rules, no stored field.

## Checks

| check | before | after |
|---|---|---|
| way-back audit, Bookmarks, `--max=30`, with Bangla pass | 12 OK, 4 WRONG PLACE (bn 390) | 16 OK, 0 wrong |
| `--mutate=no-place-restore` (new; disables the restore) | n/a | fails the 4 Bangla 390 Bookmarks cases |

Further suite results are in the pull request description.
