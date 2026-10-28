# Audit part 116: Tab focus inside sideways-scrolling tables stays in view

PCF MSA J29, issue #1267. Suite: `tools/i18n-verify/table-focus-in-view-browser.mjs`.

## Method

For Monitor, Records, About, Catalogue, Taglines and People, at 320, 360 and 390 wide, in English and Bangla, with the real-length
`REAL_SEED`, the suite presses the real Tab key 120 times and, for each focused control inside a table whose scroller scrolls sideways,
measures the share of its rect inside both the scroller's box and the screen. OK is >= 95%. (The 120 presses wrap round the page, so a
control is measured several times; that is harmless.)

## Before (fix removed with `--mutate=nofix`, which stubs `js/table-focus.js` on every page)

| Page | Width / lang | Control | % visible |
|---|---|---|---|
| People | 320 en | Copy link | 44 |
| People | 360 en | Edit / Archive | 10 / 6 |
| People | 390 en | Edit / Archive | 84 / 55 |
| Catalogue | 320 bn | ▼ | 39 |
| Catalogue | 360 en | ▼ | 64 |
| Taglines | 320 en and bn | "Inside the app" select | 44 |
| Taglines | 360 en and bn | "Every visit" select | 83 |
| Taglines | 390 en and bn | Yes button | 16 |

Monitor, Records and About measured 100% (Monitor and About have no focusable table control; Records' buttons fit). Bangla People at
320/360/390 has no sideways scrolling with this seed (the table is 288px in a 288px box), so nothing is measured there: that is a real
absence, not a blind probe (an English positive control at 320 is asserted for Records, Catalogue, Taglines and People).

## Finding

`app/js/table-focus.js` (audit part 35) already fixed this for People and Catalogue, which load it. Taglines did not load it, and
it only recognised `table` and `.table-wrap` as the box, while Taglines' scroller is a plain `<div style="overflow-x:auto">`.
So the "People and Catalogue" part of the issue was already fixed; the live defect was Taglines (a select 44% in view, the Yes button 16%).

## Fix (one shared place)

`app/js/table-focus.js` now finds the box by its **computed** `overflow-x` (auto/scroll and really overflowing), for any focus inside a
`<table>`. The four pages that lacked it (Taglines, Monitor, Records, About) now load it with the same one-line module script People and
Catalogue use. No table content, column order or width above 768px changed. RTL works because the move is a relative `scrollLeft` change.

## After

`node tools/i18n-verify/table-focus-in-view-browser.mjs`: 40 passed, 0 failed (36 page/width/language cases plus 4 positive controls).
`--mutate=nofix`: 29 passed, 11 failed (exit 1), as required.

## Screenshots looked at (320px, Bangla, Tab on the last button of a row)

- People: the focus ring on "সংরক্ষণাগারে রাখুন" (Archive) is fully drawn inside the table box, none of it cut.
- Catalogue: the focus ring on the last ▲ button is fully inside the box, with the table scrolled just enough.

## Other checks

- `shared-tables-phone-fit-browser.mjs`: 324 passed, 0 failed; `--mutate=clip`: 14 failed (exit 1), as required.
- `shared-pages-keyboard-audit-browser.mjs`: 230 passed, 0 failed.
- `behaviour.mjs` alone: 971 passed, 0 failed.
- `bn-duplicate-keys.mjs`: 6 passed, 0 failed.
