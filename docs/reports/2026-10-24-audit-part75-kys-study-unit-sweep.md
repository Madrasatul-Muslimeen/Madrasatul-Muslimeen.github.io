# Audit part 75 — kys-, study-, unit- and single suites regression sweep (PCF MSA J29)

Issue #1132. Each suite run alone on `main`, from the repository root.

| # | Suite | Before | After | Failures: cause / action |
|---|---|---|---|---|
| 1 | kys-approach-pick-browser | 66 pass / 0 fail | unchanged | none |
| 2 | kys-opening-line-browser | 47 pass / 0 fail | unchanged | none |
| 3 | kys-window-browser | 50 pass / 0 fail | unchanged | none |
| 4 | study-options-go-track-browser | 104 pass / 0 fail | unchanged | none |
| 5 | study-options-play-read-browser | 73 pass / 0 fail | unchanged | none |
| 6 | study-presets-browser | 84 pass / 0 fail | unchanged | none |
| 7 | unit-card-browser | 116 pass / 0 fail | unchanged | none |
| 8 | unit-card-window-browser | 132 pass / 0 fail | unchanged | none |
| 9 | unit-rings-browser | all en/bn scenarios and both 768px checks pass; run killed by a 30 s timeout at the 1100px step (`:317`), so no closing total printed | unchanged (check left red) | **real defect in the QR Lead's file** — see below |
| 10 | bismillah-label-browser | 36 pass / 0 fail | unchanged | none |
| 11 | global-approach-card-browser | 109 pass / 0 fail | unchanged | none |
| 12 | pane-approach-card-browser | 29 pass / 0 fail | unchanged | none |
| 13 | tagline-scroll-browser | 67 pass / 0 fail | unchanged | none |
| 14 | j82-learn-next-bookmark-pages-browser | 144 pass / 0 fail | unchanged | none |

## Closing totals

- `stub-parity.mjs`: 4 passed, 0 failed.
- `bangla-sweep-other-pages-browser`: 224 passed, 0 failed.

## Summary

13 of 14 suites are fully green on `main`. One is red for a real defect in the QR Lead's file
(`unit-rings-browser`, below). No application file and no existing check was changed in this round; the
only additions are this report and the probe script. Nothing stale and nothing environmental was found.

## unit-rings-browser — the Unit drawer button is under the dock at 1100×800

**What the suite did.** All en and bn scenarios passed, and both 768px checks passed.
The run then died at `unit-rings-browser.mjs:317`, `page.click('[data-wheel-drawer="unit"]')` in the
1100×800 pass: Playwright reported `<div id="dock"> intercepts pointer events` on every retry for 30 s.
The 1100px checks after it never ran.

**Why (measured, not guessed).** I probed the suite's own context (harness `newContext` plus the suite's
seed claims) and asked `elementFromPoint` at the button's centre:

| viewport | Unit button (top–bottom) | `#dock` (top–bottom) | what is at the button's centre |
|---|---|---|---|
| 768×1024 | 740–780 | 922–980 | the button |
| 1100×800 | 678–718 | 698–756 | **`#dock`** |

At 1100×800 the button overlaps the dock by 20 px and its centre is inside the dock. Page `scrollY` is 0 and
Playwright's own "done scrolling" did not help, so the page cannot scroll it clear. The dock is
`position: sticky; bottom: 0` (`app/quranrevival.html:244`) and ends at y 756, not 800, so its container is
shorter than the window, and the wheel card's drawer row (`app/quranrevival.html:5908–5910`, the Wheel /
Legend / Unit buttons) spills under the dock. This is not the test: a pointer or finger on the Unit button
at this size lands on the dock. Not environmental: nothing here touches the network.

**Student-blocking?** Possibly, at this window size. The Unit drawer is how a reader reaches the "Show
all units" choice, and its centre is under the dock at ~1100×800 with this seed. I measured only the Unit
button's centre; I did not measure whether a click on its top half (y 678–698) lands on the button, and
I did not measure the Wheel and Legend buttons in the same row.

**Not changed.** `app/quranrevival.html` is the QR Lead's file, so the check stays red.

**Fix proposed for the QR Lead.** Make the wheel card reserve the space the drawer row needs above the
dock rather than letting it spill: give `#wheelPopupView` (`flex: 1 1 auto; min-height: 0`, line 241) and
the wheel's own height budget (the "about two-thirds of the window" sizing) a `max-height` that subtracts the
drawer row's height (about 40 px plus its margin), or, simplest, add `padding-bottom` equal to the dock's
height to the scrolling card so the row can scroll clear of the sticky dock. After the fix the suite's
1100×800 step goes green with no change to the test. Probe used: `tools/i18n-verify/out/probe-rings-dock.mjs`.
