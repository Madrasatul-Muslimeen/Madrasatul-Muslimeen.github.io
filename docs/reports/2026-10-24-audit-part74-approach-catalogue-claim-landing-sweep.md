# Audit part 74 — approach-, catalogue-, claim-, landing- suites sweep (PCF MSA J29)

Regression sweep on `main` (cb87e36a), issue #1129. Each suite run alone from the repository root.

| # | Suite | Before | After | Cause / action |
|---|---|---|---|---|
| 1 | approach-guide-links-browser | 27/0 | 27/0 | green |
| 2 | approach-list-dots-browser | 66/0 | 66/0 | green |
| 3 | approach-record-status-bar-browser | 304/0 | 304/0 | green |
| 4 | approach-sections-browser | 59/0 | 59/0 | green |
| 5 | approach-short-names-browser | 70/0 | 70/0 | green |
| 6 | catalogue-add-approach-browser | 30/0 | 30/0 | green |
| 7 | catalogue-sections-browser | 126/0 | 126/0 | green |
| 8 | catalogue-tabs-browser | 56/0 | 56/0 | green |
| 9 | claim-for-family-browser | 56/0 | 56/0 | green |
| 10 | claim-for-family-word-hadith-browser | 158/0 | 158/0 | green (Hadith file untouched) |
| 11 | landing-drawer-row-resized-wheel-browser | 14/1 | 15/0 | **stale-timing check**, fixed (below) |
| 12 | landing-drawers-browser | crash at `[en 1280]` | 293/1 | **real defect in QR-Lead file**, left red (below) |
| 13 | landing-sections-collapse-browser | 152/0 | 152/0 | green |

Closing totals: `stub-parity` 4/0; `bangla-sweep-other-pages-browser` 224/0.

## 11. landing-drawer-row-resized-wheel-browser — stale timing, fixed

Failure: "PC (1280px), J44: an earlier visit's saved size changes nothing" — saved 420 gave 387, none gave 346.
Measured, not assumed: a probe (3 s, 6 s, 10 s after load, two runs each, saved and not saved) showed **both settle at 387**.
The app obeys J44; the check read the no-saved-size page 3 s after load, mid-way through the J44 fit.
Fix: the case now waits until the wheel width is unchanged over three reads 500 ms apart before measuring. It still fails if a stored size changed the opening size (the assertion is unchanged). Passes 15/0.

## 12. landing-drawers-browser — real defect, not mine to fix

Before: the run died with a Playwright 30 s timeout at `[en 1280]`: `<div id="dock"> intercepts pointer events` on the **Wheel** drawer button, so every check after it (bn 320–1280, night/light, squeeze) never ran.
Cause measured (probe, 8 reads over 12 s, stable): on a PC window 1280×1000, `#wheelDrawerRow` is at y 878–918 and the sticky `#dock` starts at y 898. The centre of every drawer button (898) is exactly on the dock's top edge, so a tap on the lower half of Wheel / Legend / Unit lands on the dock. At 1280×900 the same: row 778–818, dock 798. It was seen with the default fixture and with the 40-Approach fixture (first load, before any drawer is opened).
The row is "fixed" later in the same run (rowBottom 874 after interaction), so it is a first-load layout, and it varies a little run to run (the second full run showed the same at en 1280 and a 917/942 near-miss at bn 1280).
Probable cause: `fitApproachWheelToWindow()` (`app/quranrevival.html` ~14737) fits `wheelColEl`'s buttons and the wheel against `wheelSection.bottom - 8`, but `#wheelDrawerRow` is outside that set, so the fit leaves the row 20 px under the dock.
**Not fixed: `app/quranrevival.html` is the QR Lead's.** Proposed fix: in `fits()` also require `#wheelDrawerRow`'s `bottom <= dock.top - 4` (or take `limit = Math.min(limit, dockTop - 8)`). Passed to the QR Lead / Architect. A student on a PC (≥900 px) can still tap the top ~20 px of each button; phones are unaffected (all phone widths pass the new check).

Test changes (tools only, nothing weakened):
- the drawer click is dispatched on the button, so a covered drawer is **one red line**, not a run-killing timeout;
- new check per width: `reachable: each drawer button is the element at its own centre (not covered by the dock)` — red at `[en 1280]` now, and it is the line that goes green when the app is fixed;
- the failures are repeated as `FAILED:` lines at the end of the run (the middle of a long run's output is truncated).

Result: 293 pass, 1 fail (`[en 1280] reachable`). The previously never-reached cases (bn all widths, night/light, squeeze, PC maximised wheel sizes) now run and pass.

## Not reached
Nothing: all 13 suites and the two closing checks were run.
