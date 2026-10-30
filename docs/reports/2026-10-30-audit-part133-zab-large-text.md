# Audit part 133: the 🧰 Zab bar with the phone's text made larger (PCF MSA J29, issue #1328)

Fixes part 131 findings 1, 2, 20, 21 (`docs/reports/2026-10-30-audit-part131-large-text.md`).

## What was wrong

- The bar (44px tall, 14px text), the phone corner button (48px, 22px glyph), the dock button (40px, 19px glyph), the spacer (44px / 68px) and the `scroll-padding-bottom` (76px / 128px) were all fixed px. At 150% / 200% the 🧰 became the smallest thing on the page (finding 2).
- Measured before changing anything (monitor, people, backup, hadith-collections, records, onboarding at 768, 200%): the spacer already kept the page end clear and every control could be scrolled clear of the bar. The "covered" controls of finding 1 are controls sitting at the foot of the screen at scroll 0, which any fixed bar paints over. What a reader needs is that a control can be brought clear of the bar. That needs the spacer and the scroll padding to match the bar's real height at the reader's text size, which fixed px could not do once the bar grows.

## The fix (one file: `app/js/zab-bar.js`, the script QR keeps a byte-for-byte copy of)

Everything is in `rem` (16px = 1rem, so the size at 100% is the same): bar `2.75rem` tall with `.875rem` text and `2.5rem` buttons; corner `3rem`, glyph `1.375rem`, `.75rem` from the edges; dock button `2.5rem`, glyph `1.1875rem`; spacer `2.75rem` (bar) / `4.25rem` (phone); `scroll-padding-bottom` `4.75rem` / `8rem`; the panel, toast and the page's floating items use the same bar height. The bar and its spacer are the same constant, so the spacer is always the bar's real height.

## Before and after at 100%

`rects.mjs` (a throwaway probe): bar, bar button, corner, dock, spacer and document height on about, monitor and index at 360, 390, 768, 1024, 1440, en and bn (30 combinations). **Identical in all 30**, before (main) and after.

## Checks added to `tools/i18n-verify/large-text-shared-pages-browser.mjs`

Per page / width / language / size (100, 150, 200), wherever the bar (768) or corner (phone) shows:
1. its text is `.875rem` (bar) or `1.375rem` (corner) of the root;
2. the bar is `2.75rem` tall / the corner `3rem` wide;
3. every ordinary control, brought into view as Tab does (`scrollIntoView`, which honours scroll-padding), is clear of the bar or corner (closed `<details>`, nested scrollers and fixed controls skipped; the front page is left out, it is Quran Study's, finding 3), and the spacer equals the bar's height;
4. a positive control: the bar or corner was found at each width.
The old "no overlap at 150%" check no longer counts a fixed-bar-over-content pair at scroll 0 (it is what check 3 measures properly); `records` 768 150% had begun to report one only because the bar is taller there now.

## Mutations

- `--mutate=zabold` (old px CSS put back): fails the growth checks, 72 failures on monitor, people, hadith-collections.
- `--mutate=zabnospace` (spacer and scroll padding removed): fails the cover check, 50 failures on the same three pages.
- `--mutate=old` still works: 48 failures on records, people, classes.

## Results

- `large-text-shared-pages-browser.mjs --no-reach`, all 23 pages in two runs: 1176 passed with 2 failures (records 768 150% overlap, since corrected as above) and 950 passed 0 failed; records was rerun green after the correction.
- `behaviour.mjs` alone 972 passed, 0 failed. `stub-parity.mjs` 4/0. `zab-bar-browser.mjs` 370/0. `zab-dock-browser.mjs` 74/0. `floating-overlays-reach-browser.mjs` 360/0. `shared-tools-long-names-browser.mjs` 202/0.
- Screenshots looked at: Monitor 768 en 200% (Download CSV clear above the bar), People 768 bn 200%, hadith-collections 768 en 200%, Monitor 390 and 1440 at 100% (unchanged).

## Files changed (for the QR change notice)

- `app/js/zab-bar.js`
- `tools/i18n-verify/large-text-shared-pages-browser.mjs`
- this report

Not done: the reach pass (`--no-reach` was used for speed), `--mutate=old` over all 11 pages (3 run), no version bump (the Architect's).
