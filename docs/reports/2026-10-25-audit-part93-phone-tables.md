# Audit part 93 — tables on a phone (Monitor, Records, About, Catalogue, Taglines, People) — PCF MSA J29

Issue #1182. Follows part 92 (`2026-10-25-audit-part92-bangla-layout.md`, item 4).

## What was found (the headline)

**No table is cut off, and none makes the page scroll sideways. Every table is already case (b): it scrolls inside its own box and every column is reachable.** Part 92's "overflow" findings were the finder reporting any element whose rectangle ends past the screen *even when it sits inside a box that scrolls* (its `thead`/`tbody` ends past 320 px before the box is scrolled). That is a limit of the part-92 finder, not a defect on the pages. The new suite classifies each table properly.

Why they scroll already: `monitor.html:54`, `records.html:48`, `about.html:28`, `catalogue.html:46`, `people.html:40` each carry `@media (max-width: 600|700px) { table { display: block; overflow-x: auto; } }`; Catalogue also has `.table-wrap` (`catalogue.html:77`); Taglines wraps its table in `<div style="overflow-x:auto;">` (`taglines.html:136`).

## Before: what the reader can do today (320 / 390 / 768; class a clipped, b scrolls in its box, c page scrolls)

"inner" is the content width inside the box; box is 288 at 320, 358 at 390, 736 at 768.

| Table | 320 bn | 320 en | 390 bn | 390 en | 768 |
|---|---|---|---|---|---|
| Monitor, 4 tables (`#reportBody`, `#quranBody` …) | b (inner 360 / 406 on the two wide ones) | b (301 / 304 / 444 / 731) | b (360 / 406) | b (444 / 731) | fits |
| Records entries | b (451) | b (642) | b (451) | b (642) | fits, no scroller |
| Records activity | b (305) | b (347) | fits | fits | fits |
| About features | b (341) | b (329) | fits | fits | fits |
| About phases | b (424) | b (499) | b (424) | b (499) | fits |
| Catalogue modules | b (317) | b (347) | fits | fits | fits (`.table-wrap`) |
| Taglines admin | b (786) | b (830) | b (786) | b (830) | b (786 / 830 in 736) |
| People roster | fits | b (394) | fits | b (394) | fits |
| People invites | fits | b (302 in 258) | fits | fits | fits |

Not one (a) or (c). The last header cell is inside the screen once its box is scrolled to the end, for every table, width and language.

## What was changed

One line: `app/taglines.html:32` `th { font-size: 0.74rem }` → `0.82rem`. The Taglines header cells were 11.84 px, under the 13 px floor; they are 13.12 px now. This is the only measured defect. Nothing else was changed in the six pages: with every table already reachable and scrolling in its own box, the "smallest change first" is no change.

**Not done, on purpose:** fitting the tables into 320/390 by wrapping or tighter padding. The nearest candidates (Catalogue modules 317 in 288, People invites en 302 in 258) are 10–15 % too wide, so padding alone cannot fit them, and wrapping the Monitor/Records columns would make rows several lines tall. That is a design choice for the Owner (PCF J29 j29p33), not a repair. No column was hidden.

## 768 and 1440

`app/` CSS was untouched except Taglines' header font size, so the table rects at 768 are identical before and after (table rectangles `[left, right, width]` in `out/phone-tables/rows.json`, e.g. Records `16,752,736`, About `32,736,704`, People roster `64,704,640`, Catalogue `16,752,736`, Monitor `16,752,736`; Taglines `16,802,786` in a `16,752,736` box, as before). 1440 was not changed by any rule (the font-size line applies at every width, heights only).

## The suite

`tools/i18n-verify/shared-tables-phone-fit-browser.mjs` — 6 pages × 320/390/768 × bn/en, every visible table. Per table: not clipped, page does not scroll sideways, last header cell reachable at the end of the scroll, cell font ≥ 13 px; plus a positive control that a table is on screen.

- Before the one-line fix: 318 passed, 6 failed (the six are Taglines header 11.84 px).
- After: **324 passed, 0 failed**.
- `--mutate=clip` (puts `overflow-x: hidden` on the Records table's scroller): **312 passed, 12 failed**. The 12 are Records entries and activity at 320 bn/en and 390 (entries bn/en), each failing "not clipped" and "last header cell reachable".

The mutation targets the Records scroller, which is the table itself (`display: block; overflow-x: auto`), so "wrapper" and table are one element.

## Other checks

- `shared-pages-bangla-layout-audit-browser`: 455 passed / 5 failed before; Taglines after: 20/0 and the same overflow counts (the finder's count is unchanged because those findings are the finder's own limit, see the headline). The 5 failures are the pre-existing part-92 squeeze items (People, Records ×2, Hadith collections ×2), not touched here.
- `stub-parity.mjs`: 4 passed, 0 failed.
- `bangla-sweep-other-pages-browser`: 224 passed, 0 failed.

## Screenshots (320 px, Bangla, scrolled to the end)

`tools/i18n-verify/out/phone-tables/*.png` (11 images). Looked at Records entries and Taglines: the right-hand columns ("Action" buttons; the last Taglines columns with the select, the verse box and the "yes" box) are fully inside the screen, the table is moved sideways inside its own box and the page itself does not move. Only the floating Back pill and toolbox button sit over the lower corners, as on every page.
