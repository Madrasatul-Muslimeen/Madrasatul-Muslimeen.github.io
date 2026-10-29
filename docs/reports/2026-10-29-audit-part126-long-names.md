# Audit part 126 — real-length names on the shared tools (PCF MSA J29, issue #1300)

Suite: `tools/i18n-verify/shared-tools-long-names-browser.mjs` (202 pass / 0 fail). Data is seeded in the suite only
(`extraSeedJs`): tenant "Madrasatul Muslimeen (Owner, Prime)"; three people (English ~46, Bangla ~35, mixed); 12 bookmark
folders (3 nested) and 40 bookmarks with 60–70-character names; 30 notes with ~75-character titles placed in 4 nested
folders with ~80-character names. Pages: bookmarks, records, notes (opened on a unit with the 30 notes), journey-map (every
nested folder expanded), monitor — at 360, 390, 768, 1280, English and Bangla. Checks per page/width/language: sideways
overflow, cut text with no `title`, chosen `<select>` option cut (probe with the select's computed font, w > 0), overlap
between interactive siblings; controls under 40px are reported.

## Measurement (before any change)

| Page | 360 | 390 | 768 | 1280 |
|---|---|---|---|---|
| bookmarks | **13 selects cut** (en and bn) | **13 selects cut** | clean | clean |
| records | clean | clean | clean | clean |
| notes | clean | clean | clean | clean |
| journey-map | clean | clean | clean | clean |
| monitor | clean | clean | clean | clean |

The cut selects are the per-bookmark "move to folder" and per-folder "parent folder" selects: the chosen folder name
("Tafsir notes from Shaykh's Ramadan halaqah 2026 — Surah Al-Baqarah 1") needs 448–500px and the select has 220–294px, so
the chosen name is cut and nothing else shows it. No page scrolled sideways, no control was under 40px, no neighbours overlapped
on any page. 360px Bangla screenshots (`--shots`, in `out/long-names/`, not committed) were looked at: Notes and
Mapping My Journey wrap the long titles over 3–4 lines, nested folder rows stay inside the screen.

## Change

`app/bookmarks.html`: `syncMoveSelectTitles()` gives each `select[data-bm-move]` / `select[data-folder-move]` the chosen
option's full text as its `title`, on every render (start of `wireRowHandlers`) and on `change`. Additive; no CSS, no data.

## After

All five pages: 0 overflow, 0 cut, 0 select cut, 0 overlap at all widths in both languages. Mutations (old behaviour back):
`notitle` 4 fail, `overflow` 8 fail, `cut` 8 fail, `select` 8 fail. Positive control (the fixture's short names) passes.

## Not done / for the Owner

A `title` is only a hover/long-press hint; on a phone the full chosen name of a folder select is still not visible inline.
Showing it (a wrapped label under the select, or a custom picker) is a layout choice between materially different options,
so it is recorded as a question and not built. No shared note script (`note-window.js`, `zab-bar.js`) was touched.

## Totals

behaviour.mjs 972/0; bookmarks-page-new-assign 44/0; bookmark-folder-edit 68/0; bookmark-remove 60/0; bookmark-sheet 176/0;
audit-part23-bookmarks-zab 185/0; bookmark-assign-unit 93/0; bookmark-family-unit 46/0; journey-map-screen 47/0;
notes-way-back 33/0; audit-part57-records-monitor 468/0; shared-pages-bangla-layout-audit 460/0.
