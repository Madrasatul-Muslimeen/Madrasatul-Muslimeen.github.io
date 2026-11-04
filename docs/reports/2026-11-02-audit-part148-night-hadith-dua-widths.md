# Audit part 148: night look on Hadith, Dua and Collections at 360, 768 and 1024

Issue 1396. Audit part 146 ran `tools/i18n-verify/night-hadith-dua-browser.mjs` at 390 and 1440 only.

## What changed
Only the suite: `WIDTHS` now lists 360, 390, 768, 1024 and 1440 (`[360,740]`, `[768,1024]`, `[1024,768]` added). No app file changed, so the day look is untouched.

## Trap found first
`--width=360` before the change matched no width and printed "8 passed, 0 failed" (positive controls only). After the change the count is 1214.

## Results (en + bn, 100% + 200%, every view of hadith, dua, collections)
| Width | Result |
|---|---|
| 360 | 1214 passed, 0 failed |
| 768 | 1214 passed, 0 failed |
| 1024 | 1214 passed, 0 failed |

Findings: none. No real defect and no stale check, so no CSS fix and no new `--mutate=` entry was needed.

## Mutations at the new widths (each must fail)
- `--width=768 --mutate=contrast`: FAILS (injected grey line 1.23:1 on every view).
- `--width=360 --mutate=arrow`: FAILS (contrast and arrow checks on every view).

## Not done
No screenshots were taken, because nothing visual changed. `--mutate=focus|day|d1` were not re-run at the new widths. They were proven at 390/1440 in part 146.
