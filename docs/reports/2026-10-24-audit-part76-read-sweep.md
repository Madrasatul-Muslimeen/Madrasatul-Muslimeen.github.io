# Audit part 76 — regression sweep of 14 read-* suites (PCF MSA J29, issue #1135)

Base: `main` at v12.55. Each suite run alone from the repository root. No suite or app file has been changed so far.

| # | Suite | Pass / fail | Cause of any failure | Action |
|---|---|---|---|---|
| 1 | read-bar-bookmark-layers-browser | 48 / 0 | none | none |
| 2 | read-bar-tools-browser | 67 / 0 | none | none |
| 3 | read-contents-browser | before 247 / 1 (a second run 246 / 2), after 248 / 0 | stale: "⤢ is a 40px square". Below 600px, with ‹ › showing on a Read opened from the contents, the QR Lead's 23 Oct rule (`app/quranrevival.html` ~2775) makes the bare end tiles 36px wide, 40px tall. Whether it applies varied between runs, because it depends on the ‹ › state. | Check updated in place: expected width is read off the page state (36 when that rule applies, else 40), with a comment naming the round. |
| 4 | read-list-button-browser | before 66 / 6 (a second run 5 failed), after 72 / 0 | stale, all of them, from the QR Lead's 23 Oct "both reads the same" round: (a) at 390px with ‹ › showing ☰ is the icon alone (CSS ~2771), the check wanted "☰ Surah"; (b) below 360px in the bare full screen ☰ moves to a fixed bottom-row spot, left 8, 40x36 (CSS ~2784, confirmed with a screenshot at 320x844), so "sits top left" and "40px tall" failed. | Checks updated in place: state-dependent expectations (probe now reads ‹ › visibility and viewport height), comments name the round. The app is unchanged. |
