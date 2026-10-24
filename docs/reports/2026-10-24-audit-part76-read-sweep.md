# Audit part 76 — regression sweep of 14 read-* suites (PCF MSA J29, issue #1135)

Base: `main` at v12.55. Each suite run alone from the repository root. Changed: three test files (stale checks updated in place) and this report; no app file.

| # | Suite | Pass / fail | Cause of any failure | Action |
|---|---|---|---|---|
| 1 | read-bar-bookmark-layers-browser | 48 / 0 | none | none |
| 2 | read-bar-tools-browser | 67 / 0 | none | none |
| 3 | read-contents-browser | before 247 / 1 (a second run 246 / 2), after 248 / 0 | stale: "⤢ is a 40px square". Below 600px, with ‹ › showing on a Read opened from the contents, the QR Lead's 23 Oct rule (`app/quranrevival.html` ~2775) makes the bare end tiles 36px wide, 40px tall. Whether it applies varied between runs, because it depends on the ‹ › state. | Check updated in place: expected width is read off the page state (36 when that rule applies, else 40), with a comment naming the round. |
| 4 | read-list-button-browser | before 66 / 6 (a second run 5 failed), after 72 / 0 | stale, all of them, from the QR Lead's 23 Oct "both reads the same" round: (a) at 390px with ‹ › showing ☰ is the icon alone (CSS ~2771), the check wanted "☰ Surah"; (b) below 360px in the bare full screen ☰ moves to a fixed bottom-row spot, left 8, 40x36 (CSS ~2784, confirmed with a screenshot at 320x844), so "sits top left" and "40px tall" failed. | Checks updated in place: state-dependent expectations (probe now reads ‹ › visibility and viewport height), comments name the round. The app is unchanged. |
| 5 | read-list-home-browser | 30 / 0 | none | none |
| 6 | read-meaning-browser | 39 / 0 | none | none |
| 7 | read-meaning-one-row-browser | 56 / 0 | none | none |
| 8 | read-mushaf-button-browser | 184 / 2, after: 184 / 2 (left red) | **Defect in the QR Lead's file, check is right.** `[en 320]` Ayah view and `[en 820]` Mushaf view: the Read bar is one whole line taller *because of* 📜 (144 vs 98 at 320; 146 vs 100 at 820). Measured with a probe (`tools/i18n-verify/out/probe-mushaf.mjs`): the back slot is empty (not the ← Back chip); `#readBarEnd` (holding 📜) drops to its own line (top 270 at 320, 230 at 820, against 177 / 184 for the first line); hiding 📜 lets it stay on the first line. At 820 the first line is ☰ Surah list 114px + page reference 389px + ‹ › + 4 tools, so ☰'s word (the 23 Oct "both reads the same" change) is what leaves no room. 320 is the same family as the known phone Read bar problem (📜 + ★). | Left red, reported. Proposed fix for 820: extend the icon-only ☰ rule (`app/quranrevival.html` ~2847, now `min-width: 600px; max-width: 679px`) to `max-width: 899px` when ‹ › show (frees 74px, 📜 needs 46px). 320: the Owner's A/B/C choice. |
| 9 | read-note-menu-browser | 24 / 0 | none | none |
| 10 | read-note-pane-browser | 204 / 0 | none | none |
| 11 | read-note-pane-window-browser | 94 / 0 | none | none |
| 12 | read-pane-routes-browser | 30 / 0 | none | none |
| 13 | read-quick-buttons-browser | 254 / 0 | none | none |
| 14 | read-scroll-end-stays-browser | before 9 / 1, after 10 / 0 | stale: the wheel loop sent a fixed 40 events (4,800px) but 2:282 at 390px now scrolls 4,911px, so the end was never reached (ayah stayed 282, top 4800). Not a defect. | Loop count now follows the measured length (+10). `--mutate=burst` still fails (6 / 4). |

Closing totals: `stub-parity` 4 / 0; `bangla-sweep-other-pages-browser` 224 / 0.
