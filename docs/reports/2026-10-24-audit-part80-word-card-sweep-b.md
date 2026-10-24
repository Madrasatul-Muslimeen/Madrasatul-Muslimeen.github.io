# Audit part 80 (PCF MSA J29): Word card regression sweep B, suites 15-28

Run on `main` at v12.56, one suite at a time, from the repository root. Issue #1142.

| # | Suite | Result | Failures / cause / action |
|---|---|---|---|
| 1 | word-card-meaning-marking-browser | 91 pass, 0 fail | none |
| 2 | word-card-needs-source-browser | 93 pass, 0 fail | none |
| 3 | word-card-own-surah-browser | 16 pass, 0 fail | none |
| 4 | word-card-pc-boxes-browser | 296 pass, 0 fail | none |
| 5 | word-card-search-browser | 252 pass, 0 fail | none |
| 6 | word-card-segments-browser | 40 pass, 0 fail | none |
| 7 | word-card-sense-arabic-browser | 62 pass, 0 fail | none |
| 8 | word-card-small-arabic-size-browser | 150 pass, 0 fail | none |
| 9 | word-card-stem-mark-browser | 144 pass, 0 fail | none |
| 10 | word-card-tasrif-arabic-size-browser | 48 pass, **1 fail** (en/320 "every column head's case name is whole"; same on a second run, so not flaky) | **Not stale; not changed, left red** (the CSS is `app/quranrevival.html`, the QR Lead's). Measured at en/320, Taṣrīf 12:1:5: the card is exactly 320px (20rem), so the J61 rule `@container wordcard (max-width: 20rem) { .word-card-ntable thead th { font-size: 0.64rem } }` does apply (computed 10.24px). Each head cell is 65.36px wide, 62.16px after its 0.1rem padding. In this sandbox's `system-ui, sans-serif` fallback font the unbroken names measure Nominative 65.98px, Accusative 62.36px, Genitive 48.16px, so Nominative and Accusative do not fit and `overflow-wrap: anywhere` wraps them onto 2 lines (Genitive fits). The check passed when J61 landed, so the likely cause is the width of the fallback font here (environmental), but the margin is under 4px, so a wide system font on a real 320px phone could do the same. **Proposed fix for the QR Lead:** take the heads to 0.6rem at ≤20rem (Nominative then needs about 61.9px of 62.16px, only just), or cut `.word-card-ntable th` padding to 0 and `border-spacing` to 2px at ≤20rem, which gives about 3px more per cell. Not verified on a real phone. |
| 11 | word-card-tasrif-blocks-basic-browser | 100 pass, 0 fail | none |
