# Audit part 77 — regression sweep of the Explore, known-word, wheel, Al-Fatiha, QCR, tajweed and vocabulary suites (PCF MSA J29)

24 Oct 2026, run by the MSA Architect (session_01B9Hi1rr2d2qrrWup4feqnB) on `main` v12.55, port 8080, one suite at a time. Two stale checks updated in place (hand-mutation proven); **no app file changed**, so no version. Most of these screens are the QR Lead's (`app/quranrevival.html`).

## Explore, known words and singles

| Suite | Before | After | Note |
|---|---|---|---|
| explore-all-approaches-browser | 280/0 | — | green |
| explore-ayah-numbers-browser | 294/0 | — | green |
| explore-coverage-browser | 36/0 | — | green |
| explore-hizb-view-browser | 80/0 | — | green |
| explore-one-bar-browser | 34/0 | — | green |
| explore-phone-card-browser | 146/0 | — | green |
| known-meaning-groups-browser | 66/0 | — | green |
| known-meaning-groups-burooj-browser | 30/0 | — | green |
| known-word-marks-browser | 122/0 | — | green |
| lemma-levels-browser | 240/0 | — | green |
| listen-bookmark-qcr-card-browser | 48/0 | — | green |
| mark-words-mode-browser | 48/0 | — | green |
| openiti-browser | 76/0 | — | green |
| tablet-wheel-browser | 74/0 | — | green |
| text-size-wbw-browser | 88/0 | — | green |

**Before: 1662 passed, 0 failed.**

## Wheel, Al-Fatiha, QCR, tajweed, vocabulary

| Suite | Before | After | Note |
|---|---|---|---|
| fatiha-count-browser | 132/4 | 136/0 | **stale**: bn 390/1280 "word card for … reads 1:7:1 / 1:6:1". "Audit J29 fix 9" (part 1) shows the Word card's reference in Bangla digits in Bangla (stored keys stay Latin); the check compared the visible text with Latin digits. Updated in place: the text is read back to Latin digits. Hand mutation: `wordRefFor` without the Al-Fatiha mapping fails 8 (bn and en). |
| fatiha-opening-band-browser | 132/0 | — | green |
| fatiha-six-seven-records-browser | 84/0 | — | green |
| hadeethenc-note-back-browser | 12/0 | — | green |
| qcr-bismillah-explore-slide-browser | 64/0 | — | green |
| qcr-level-browser | 16/0 | — | green |
| qcr-popup-browser | 34/0 | — | green |
| tajweed-word-tap-browser | 62/2 | 64/0 | **stale, and blind in English**: the check read `dataset.occurrence`, which the card does not carry (it is `data-occurrence-id`), so it always fell back to a text match `/لِّلْمُتَّقِينَ|2:2/`, which Bangla digits broke and which in English matched a NEIGHBOUR too (2:2:6 contains "2:2"). Now reads `data-occurrence-id`. Hand mutation: tapping word 6 fails "not a neighbour" 4 (en and bn). |
| vocab-buttons-open-browser | 49/0 | — | green |
| vocab-review-browser | 68/0 | — | green |
| vocab-wheel-browser | 114/0 | — | green |
| wheel-centre-browser | 645/0 | — | green |
| wheel-fill-browser | 43/3 | 43/3 (left red) | **real, QR Lead's file**: at 1600x1240, 1280x800 and 900x700 the landing window's bottom is 30px below the dock's top. Same cause the QR Lead found for parts 73–75: the Zab bar's 44px spacer moves `#dock` up after the page is fitted (fix on `claude/qr-lead-round12`). Sent to the QR Lead. |
| wheel-slice-opens-track-browser | 96/0 | — | green |
| wheel-unit-go-browser | 254/0 | — | green |
| wheel-writing-slice-browser | 25/0 | — | green |

**Before: 1830 passed, 9 failed.**

After the two updates: everything green except `wheel-fill-browser` (3, the QR Lead's Zab-spacer fix).
