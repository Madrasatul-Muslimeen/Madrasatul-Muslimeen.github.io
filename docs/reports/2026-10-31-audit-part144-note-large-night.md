# Audit part 144: the v13 Note at large text and in the night look

Report only (issue 1377). No application file is changed. Suite: `tools/i18n-verify/note-window-large-night-browser.mjs`.

## Method
- Pages: shared Note window on `quranrevival.html` (window chrome and the Note page inside its iframe), `notes.html`, `journey-map.html`, `journey-map.html?embed=1&new=1`.
- Widths 360, 390, 768, 820, 1024, 1180, 1440; English and Bangla; text size 100/150/200%. The app has no text-size setting, so the browser setting is modelled by `html{font-size:N%}`.
- Night look: `<html data-card-look="night">` (the default); the suite seeds `mm_card_look=night` and asserts the attribute on every view (positive control).
- Fit: sideways scroll of the document; every visible control checked against every clipping ancestor and the viewport; `nowrap`+`ellipsis` labels whose text does not fit. Controls inside a closed `<details>` are skipped (the first draft counted the closed nav dropdown: a probe bug, fixed).
- Contrast: part 142's `window.__A11Y.contrast()` against the real background.
- Positive controls (clean fixture reports nothing; cut label, clipped control and grey-on-grey are reported). Mutations: `--mutate=fit` (3000px element) fails with "sideways scroll"; `--mutate=night` (grey on grey) fails at 1.23:1. Both proven.

## Totals
- New suite, full matrix: **759 passed, 43 failed** (the failures are the defects below).
- `note-window-a11y-browser.mjs` unchanged on v13.07: **940 passed, 0 failed**.

## Night look: no defect
Zero contrast failures across all pages, widths, languages and sizes (window chrome and Note page). Focus-ring contrast was not re-measured here (part 143 and v13.07 M1 cover it).

## Defects (large text)
1. **Note-page toolbar overflows sideways at 150–200% text, from 768px.** `.nn-tb` is `flex: 0 0 auto` at `min-width: 640px` and does not shrink: the document is 934px in a 768/820px viewport (en, 200%), 758 vs 706 at 1180/150%. The last tools are cut by `body` and unreachable without sideways scroll (the page clips). Seen in qr-note [Note page] and `journey-new`. `app/journey-map.html:473`. Smallest fix: add `flex-wrap: wrap` to `[data-pane-bar]` in that media block, or keep `flex: 1 1 0; min-width: 0` (line 462) and only restore labels.
2. **🗂 Folder-menu button leaves the viewport** at 200% (768 en/bn, 820 en, 1180 bn…): `.folder-menu-btn` `app/journey-map.html:191` is a fixed 40px `flex: 0 0 auto` wrapper (line 190) in a row that does not wrap. Same fix family: let the row wrap (`flex-wrap: wrap`) or allow the title to shrink (`min-width: 0`).
3. **Window title is cut by ellipsis for a long note title** (qr-note window chrome, every width, en and bn, e.g. 674 > 276 at 390/100%). `app/js/note-opener.js:31` (`.no-title`, `nowrap`+`ellipsis`). The full title is visible in the Note page below, so this is by design, but the reader cannot read it in the bar at any size. Smallest fix: `title` attribute on the span, or `-webkit-line-clamp: 2`.

## Not measured (stated plainly)
- The Hadith page's 📝 route (`app/js/hadith-browser.js`) was not driven.
- The 6-deep folder path and long Hadith seed data were not seeded; only the 120+ character title (en and bn) was.
- 🗂 Folders and 📎 Attach sheets were not opened at large text.
- Focus-ring contrast in the night look.
These are the next audit's gaps.

## Screenshots
Looked at: `qr-note-390-en-200.png` (window bar title cut to "New n…", toolbar fits, title wraps in the field). The others in `tools/i18n-verify/out/note-window-large-night/` (generated with `--shots`) were not looked at.
