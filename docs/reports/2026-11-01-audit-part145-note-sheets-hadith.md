# Audit part 145 — the v13 Note's sheets and the Hadith route at large text (issue #1382)

**Written by the MSA Architect** (session `session_01PL2xbLEHixF5Ai2VPJhMiL`), 1 Nov 2026. Base: `main` v13.09.
Builder runs 2361 and 2364 each stopped after pushing only a report heading and a first suite
(`builder/issue-1382-run-2361`, `-2364`), so the Architect finished the audit from that suite's own measurements and
fixed what it found as **v13.10**.

## Method

The Builder's first suite (`note-sheets-hadith-large-browser.mjs`, branch `builder/issue-1382-run-2361`, not merged)
was run in full on `main`: 3 surfaces × 360/390/768/820/1024/1180/1440 × English/Bangla × text 100/150/200%
(`html{font-size:N%}`), with a 6-deep path of long English/Bangla folder names and a long Arabic + English + Bangla
hadith attached. **1278 passed, 324 failed.** Each failure family was read and checked on a screenshot before being
called a defect, and the folder list's own height was measured, which that suite did not do.

## Defects (fixed in v13.10)

| # | Where | What was measured | Fix |
|---|---|---|---|
| **D1** | `app/journey-map.html` `.folder-picker-list` (the 🗂 Folders sheet) | At 150–200% text the folder list was **0 px tall** at 360, 390, 1024, 1180 and 1440 (1–8 px elsewhere): no folder could be seen or ticked; the rest of the sheet (up to 411 px at 360/200%) was cut off below a sheet that did not scroll. | The list keeps `min-height: min(9em, 40vh)` (about three rows, growing with the text) and `.folder-picker` scrolls (`overflow-y: auto`). After: 216–288 px at 150/200%; **at 100% every width identical** (165–691 px, all already above 9em). |
| **D2** | `app/js/note-opener.js` 📎 Attach | Its placeholder "Surah:Āyah, e.g. 2:255" was cut at 360/390 at 150–200%; in Bangla it read "সূরা:আয়াত, যেমন ২:২" — a wrong example. | The wording is a visible `<label for>` (it wraps); the field keeps only "2:255" / "3062" in the reader's digits. |
| **D3** | `app/css/note-window.css` `.tag-picker-new` (🗂 Folders → Tags) | "New tag name" cut at 360/390 at 150–200% (en and bn). | The row wraps; the field is `flex: 1 1 10em`, so at large text "＋ New tag" goes under it. |
| **D4** | `app/journey-map.html` `.folder-picker .folder-search-input` | "Search folders and Notes…" cut at 360/390 at 200%. | `text-overflow: ellipsis`: the cut now ends in "…" (its meaning survives; the placeholder itself is unchanged). |
| **J109** | `app/js/note-ref-ui.js:26` | The Āyah/Hadith block in a Note showed "▾ hide" / "▸ show" — an arrow, against PCF MSA J109. | "hide" / "show" beside the block's existing ON/OFF switch. |

## Not defects (read, measured, recorded)

- **The `journey-new` surface's Zab-bar findings** (#5–#12, #22–#23, #39–#42: `#zabCorner` "outside body", buttons
  overlapping it): that surface opens `journey-map.html?embed=1&new=1` as a top-level page, where the Zab bar shows. A
  reader only ever sees that page inside the Note window's frame. Probe artefact.
- **"Controls overlap" in 🗂 Folders** (#14, #36, #37, #43–#46): rows scrolled out of sight inside the list (or under the
  sheet's Done row) counted as overlapping. Screenshots at 768/200% and 1024/100% show nothing overlapping.
- **Focus rings in the night look and the Tab trap in Attach**: no failure anywhere in the matrix.
- **The Hadith page's way back**: ✕ closes the Note window and hadith 4563's card is still on screen, every run.

## Checks

- NEW `tools/i18n-verify/note-sheets-large-browser.mjs`: **337 passed, 0 failed** (7 widths × en/bn × 100/150/200%,
  plus a positive control). Mutations, each failing its own check: `listzero` (D1, 6 fail), `attachlong` (D2, 8),
  `notagwrap` (D3, 2), `noellipsis` (D4, 1), `arrow` (J109, 6).
- `word-card-ayah-card-ways-back-browser.mjs`: **80 passed, 0 failed** (was 71/6 on `main` since v13.01: a stale test,
  not a way-back gap — "Note & more…" opens the shared Note opener now, whose ← carries "Back to Āyah card"; the stub
  write failure was harness-only). New mutations `nonoteback`, `nonotereopen` each fail.
- Screenshots looked at: Folders 390 en 200% and 768 en 200% and 1024 en 100% (before); Folders 390 bn 200% and
  360 bn 200%, Attach 390 bn 200% (before) and 360 bn 200% (after).
