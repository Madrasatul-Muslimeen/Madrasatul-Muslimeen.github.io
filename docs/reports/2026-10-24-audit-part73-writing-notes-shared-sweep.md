# Audit part 73 — regression sweep of the writing-paper, Notes and shared-screen suites (PCF MSA J29)

24 Oct 2026, run by the MSA Architect (session_01B9Hi1rr2d2qrrWup4feqnB) on `main` v12.54, port 8080, one suite at a time. Report and one test detail line: **no app file changed**, so no version.

## Writing paper

| Suite | Result | Note |
|---|---|---|
| writing-blank-model-browser | 171/0 | green |
| writing-letters-browser | 266/0 | green |
| writing-sheet-browser | 214/0 | green |
| writing-sheet-fatiha-count-browser | 30/0 | green |
| writing-sheet-popout-browser | 342/0 | green |
| writing-sheet-record-browser | 28/0 | green |
| writing-sheet-unit-toolbar-browser | 54/0 | green |

**Writing paper: 1105 passed, 0 failed.**

## Notes

| Suite | Result | Note |
|---|---|---|
| note-menu-groups-browser | 92/0 | green |
| note-opens-in-journey-browser | 60/0 | green |
| note-toolbar-fit-browser | 32/0 | green |
| note-view-css-dead-browser | 16/0 | green |
| notes-note-windows-browser | 218/0 | green |
| notes-pane-has-note-browser | 36/0 | green |
| notes-pane-loading-browser | 26/0 | green |
| notes-way-back-browser | 33/0 | green |
| note-sheet-engine | 89/0 | green |
| note-view-decoupled | 28/0 | green |
| note-user-settings | 43/0 | green |
| note-link-preview | 43/0 | green |
| note-image-sanitize | 33/0 | green |
| note-sanitize-boundary | 13/0 | green |

**Notes: 762 passed, 0 failed.**

## Shared screens

| Suite | Result | Note |
|---|---|---|
| account-card-browser | 1235/0 | green |
| app-offline-boot-browser | 15/0 | green |
| boot-status-browser | 24/0 | green |
| card-look-browser | 96/0 | green |
| family-signup-browser | 68/0 | green |
| head-search-browser | 94/0 | green |
| learn-next-browser | 204/0 | green |
| legacy-links-browser | 169/0 | green |
| minimise-windows-browser | 48/0 | green |
| page-window-browser | 29/0 | green |
| palette-contrast-browser | 20/0 | green |
| popup-home-size-browser | 54/3 | **real, QR Lead's file**: only [bn 1440], the landing window's bottom handles s / se / sw are not under their own point (`self:false` at y 823-840); en 1440 passes. Something covers the bottom edge in Bangla. Sent to the QR Lead. |
| popup-home-sweep-browser | 44/0 | green |
| shared-load-speed-browser | 176/0 | green |
| startup-paint-browser | 58/2 | **real defect, QR Lead's file** (`app/quranrevival.html`): en/bn 1280 "nothing jumps". Probed the second open (1280x900, 400 ms per trip): copy 485px @x617 at 379 ms, real wheel replaces it at 485 @617 at 1622 ms, then 32 ms later the real wheel shrinks to 442 @x638 and stays (the first visit is 442 throughout, sampled to 6 s). The wheel visibly shrinks 43px and moves 21px after the reveal (decision 81). 390px fine. Sent to the QR Lead. Test-only change here: the check's detail line now also prints the first visit's box. |
| student-roster-access-browser | 30/0 | green |

**Shared screens: 2364 passed, 5 failed.**

