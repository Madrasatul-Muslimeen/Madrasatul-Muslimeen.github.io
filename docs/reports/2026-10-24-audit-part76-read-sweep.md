# Audit part 76 — regression sweep of 14 read-* suites (PCF MSA J29, issue #1135)

Base: `main` at v12.55. Each suite run alone from the repository root. No suite or app file has been changed so far.

| # | Suite | Pass / fail | Cause of any failure | Action |
|---|---|---|---|---|
| 1 | read-bar-bookmark-layers-browser | 48 / 0 | none | none |
| 2 | read-bar-tools-browser | 67 / 0 | none | none |
| 3 | read-contents-browser | before 247 / 1 (a second run 246 / 2), after 248 / 0 | stale: "⤢ is a 40px square". Below 600px, with ‹ › showing on a Read opened from the contents, the QR Lead's 23 Oct rule (`app/quranrevival.html` ~2775) makes the bare end tiles 36px wide, 40px tall. Whether it applies varied between runs, because it depends on the ‹ › state. | Check updated in place: expected width is read off the page state (36 when that rule applies, else 40), with a comment naming the round. |
