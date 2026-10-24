# Audit part 71 — bookmark-* suites regression sweep (main, v12.54)

Issue #1126 (PCF MSA J29). One suite at a time, from the repository root.

| Suite | Before | After | Failures and cause |
|---|---|---|---|
| bookmark-assign-unit-browser | 93 pass / 0 fail | no change | none |
| bookmark-family-unit-browser | 46 pass / 0 fail | no change | none |
| bookmark-folder-edit-browser | 68 pass / 0 fail | no change | none |
| bookmark-last-place-browser | 68 pass / 0 fail | no change | none |
| bookmark-multi-save-browser | 192 / 0 | no change | none |
| bookmark-open-browser | 77 / 0 | no change | none |
| bookmark-range-popover-browser | 158 / 0 | no change | none |
| bookmark-remove-browser | 60 / 0 | no change | none |
| bookmark-sheet-browser | 176 / 0 | no change | none |
| bookmarks-page-new-assign-browser | 44 / 0 | no change | none |
| stub-parity | 4 / 0 | no change | none |
| bangla-sweep-other-pages-browser | 224 / 0 | no change | none |
| bookmark-marks-back-browser | 330 pass / 12 fail | unchanged (left red) | 12 fails, all phone widths (en/bn 320 and 390): (a) "when the card closes the Back chip is in the Read bar ... adding no line" (sameLine false, noExtraLine false) x4; (b) "page's own label / long label: shares a line the bar already has" (sharesLine false: chip centre y 244-290, ▶ y 197, 📖 ⤢ ⋯ y 290-336, bar 5 lines) x8. Tablet/desktop all pass. Cause NOT established: the phone Read bar now stacks the chip on a line of its own. Candidates, all in `app/quranrevival.html` (QR Lead's, not changed here): a38c3754 (J75, phone Read bar tools one row) or a later QR Lead round. Not environmental (pure layout). Proposed: QR Lead measures which line the chip lands on at 390px (`#readBackSlot` vs the ▶ ■ group) and either restores the shared line or, if the new stacked layout is deliberate, updates this suite's line-sharing checks (suite lines for `sharesLine`/`noExtraLine`) in place with a comment naming the round. |
