# Audit part 78 — word-* suites 1-14 regression sweep (PCF MSA J29, issue #1138)

Run on `main` (v12.55), one suite at a time from the repository root.

| # | Suite | Result (before) | After | Cause / action |
|---|---|---|---|---|
| 1 | word-card-ayah-card-ways-back-browser | 80 pass / 0 fail | unchanged | green |
| 2 | word-card-bangla-dictionary-browser | 200 pass / 0 fail | unchanged | green |
| 3 | word-card-basic-rebuild-browser | 144 pass / 0 fail | unchanged | green |
| 4 | word-card-change-other-mark-browser | 120 pass / 0 fail | unchanged | green |
| 5 | word-card-conjugation-browser | 213 pass / 0 fail | unchanged | green |
| 6 | word-card-depth-rebuild-browser | 249 pass / 0 fail | unchanged | green |
| 7 | word-card-dictionary-browser | 290 pass / 0 fail | unchanged | green |
| 8 | word-card-family-combined-browser | 97 pass / 0 fail | unchanged | green |
| 9 | word-card-family-rows-browser | 144 pass / **4 fail** | unchanged (left red) | **real defect in the QR Lead's file**, see below |

## Suite 9 — word-card-family-rows-browser (4 failures, all en/320)

Failing: "the 'this word' meaning shows ONE line of places", "every meaning with a button shows one line only", "a second tap closes it to one line again", "re-measured at a new width (1280 → 320): still one line".
All four are one cause. Measured at en/320 on 6:3:4 (probe `tools/i18n-verify/out/probe78.mjs`): the first meaning row ("the heavens") has a 232px content width; its first chip `2:29:12` is 68px, the gold `6:3:4` chip 58px and the "+240 more" button 101px, so chip + chip + button + gaps ≈ 237px > 232px and the button drops to a second line. `fitWordCardFamilyRows` (`app/js/quran-word-card.js:1543`) stops hiding places at `i > 0`, so the first place is never given up even when it is not the gold one. Not stale: the check describes the Owner's J60 request (one row + "+N more"). Not environmental (pure layout, measured). Bangla and every width ≥ 390 pass.

**Proposed fix (QR Lead's file, not changed here):** in the loop at line 1543 change `i > 0` to `i >= 0` (the existing `chips[i] === current` guard still keeps the gold place), so that when the first place and the button cannot share a line, the first place is hidden too. Expected result: row shows `6:3:4` + "+241 more" on one line. The suite's own `nomore` mutation already covers this loop.
