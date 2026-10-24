# Audit part 82 — regression sweep of word-* and asma-* suites (PCF MSA J29)

Run on `main` (v12.56), one suite at a time, from the repository root. Asma ul Husna is FROZEN in MSA (QR is its home): faults there are reported, not changed.

| Suite | Before | After | Failures and cause | Action |
|---|---|---|---|---|
| word-card-wbw-rebuild-browser | 135 pass / 1 fail | 136 / 0 | `en/1280: meaning bar is one row` [254.48, 254.48, 258.48]: **stale**. The three items are `align-items: baseline` with different font sizes (meaning 1.22rem, transliteration 1.02rem), so their tops differ by 4px on one row; the check compared tops with `< 4`. | Check updated in place: one row = every item's vertical span overlaps the first item's span (a wrapped item sits wholly below). The suite has no `--mutate` flag. |
