# Audit part 138: Dua Study (`dua-study.html`) with the phone's text made larger

PCF MSA J29, issue #1345. **Report only: no file under `app/` changed.** Findings go to the Dua Lead (**D**) or the MSA Architect (**A**, shared parts).

## Method

`tools/i18n-verify/large-text-dua-study-browser.mjs`, copied in method from part 136's Hadith suite (and so from part 131's): the root font size is set to 100%, 150% and 200%, and each view is measured for `cut`, `overlap`, `offscreen`, `sideways`, `small`, `fixedpx` and a `reach` pass (every control scrolled into view must be the element under its own centre point). 22 views, 5 widths (360, 390, 768, 1024, 1440), en and bn, with the part-126 real-length seed (a 45-character person name, a long tenant name).

Views: the page as it opens; the Dua groups menu; Occasions with no part (tiles); Occasions with a part (numbered list); the parts menu; Hadith Books with a part; Dua of Prophets; Rasulullah list page 2; the empty Sahaba group; a Dua Card open (‹ › and ← Back); the card menu; pop-ups Meaning, Source, the whole narration, ✓ Check; the ✓ Check panel opened; the 🖼 Poster; Copy / share; a Hisn al-Muslim card; its Source pop-up (holds the "same dua in the Hadith books" tie); the tied Dua card; a Prophets' card.

Positive controls (kept from part 136): an injected over-long ellipsis button reads as cut, two overlapping buttons as overlap, a 20px button as small, a button past the right edge as offscreen, an injected fixed-px text as not growing and an injected rem text as growing; every view must render text and open at every width and language.

Two changes from part 136's functions, both for this page: (1) while a Dua pop-up card (`[data-dua-pop]`, a modal dialog) is open, only the pop-up's own controls are compared for overlap and tested for reach, because the page behind a modal is covered by design; (2) the injected buttons use `1rem` text, because this page's buttons keep the browser's 13.33px (see D6).

At 100% the suite is **green except NAMED findings**, each printed as INFO: **B1** the Person picker (`#personSelect`/`#tenantSelect`, `width:auto`) as wide as the long seed name, so the page scrolls sideways (English only at 360; the Bangla seed name is shorter); **B2** the 👥 `.assign-trigger` (none appeared on this page); **Z** the fixed 🧰 Zab bar over a row at the foot of the screen at scroll 0 (not a defect since v12.125: pages keep room at their end).

## Totals

Run one width at a time (`--width=` and `--lang=`):

| Run | Result |
|---|---|
| 360 en (reach on) | 120 passed, 0 failed |
| 360 bn (reach on, screenshots) | 120 passed, 0 failed |
| 390 en+bn (reach on) | 231 passed, 0 failed |
| 768 en+bn (no reach) | 231 passed, 0 failed |
| 1024 en+bn (no reach) | 231 passed, 0 failed |
| 1440 en+bn (reach on) | 231 passed, 0 failed |
| `stub-parity.mjs` | 4 passed, 0 failed |

Reach was not run at 768 and 1024 (time); it found nothing at 360/390/1440 beyond finding 5 below.

At 100% the only named findings were B1 (360 en, every view: scrollWidth 361 > 360) and Z (768 and 1024: the Zab bar over the list's last row at scroll 0). Nothing else failed at 100%. **Cut: 1 at 200% only. Small: 0. Fixed-px: 0 on every view except the Poster (D6).**

## Findings at 150% / 200% (INFO)

**D1 (D). The Dua words on a Dua Card overlap by 2px at 150% and 200%, at every width and language** (`p.dua-words>span.dua-word "اللهم"` over the word below it, 84 to 107 × 2 to 3 px, 24 to 69 combinations per width, also on the ✓ Check panel and the tied Dua card). The rows of large Arabic words are set with a line height tighter than the word's own box. At 200% on a phone every word is on its own line (see the screenshot). A reader should see each word clear of the next, with a line height in `em` that grows with the text.

**D2 (D). The Occasions part tiles run past the screen at 200% on 360 and 390** (`button.dua-tile "Waking and sleeping 26 duas"` spans 32..448 on a 360px screen; the page scrolls sideways, scrollWidth 448; 15 tiles, 30 at 390). The tile grid has a fixed minimum column width. A reader should see one tile per row at the screen's width.

**D3 (D). The parts menu makes the page scroll sideways at 150% (768, 1024) and 200% (1024)** (`parts-menu`, scrollWidth 918 > 768, 1046 > 1024): the pull-down's long Hadith-book labels, as wide as the longest label, extend the page. A reader should see the menu no wider than the screen, long names wrapping.

**D4 (D). At 200% the framed Dua Card's top banner is cut** in the ✓ Check panel (360 en): `div.dua-card-host` needs 302px, has 284px, no title; and `✂ A different dua` in the verdict row ends at 340 outside the clipping `#duaRoot` (starts at 110). A reader should see the verdict buttons wrap inside the card instead of being clipped.

**D5 (D). Menus that cover the list leave list controls unreachable** (reach, groups-menu at 360 to 1440, 150% and 200%: `‹ Previous`, the first row; parts-menu: row 1 at 360 to 390). With a pull-down open, the controls it covers cannot be reached until it is closed. This is the pull-down's design (it closes on Escape or an outside click), so treat it as low priority, but a reader at 200% cannot see the rest of the page while it is open: the menu should keep to the screen's height and scroll inside itself.

**D6 (D). The Poster's own text does not grow** (`pop-poster`: 1 text element at 360, 2 at 390 and wider did not grow at 150% or 200%). This is likely the poster's drawn preview (a fixed-size picture of the sheet, by design); a reader at 200% sees the poster controls larger but the preview text the same. Confirm it is the picture and not the buttons.

**A1 (A, shared). The Person picker is as wide as its longest name (B1)**: at 360 en the page scrolls sideways at every size (scrollWidth 361 at 100%, 375 at 150%/200%; `select#personSelect` spans 24..375). The same finding as part 136's B1. A reader should see the picker no wider than the screen, its name cut with the full name as a title.

**A2 (A, shared). The 🧰 Zab bar covers list rows and tiles at scroll 0** at 768 to 1440, 150% and 200% (94 × 60 px over the last visible row or tile; at 200% also over Arabic words of a card and the Meaning button). The same class as Z, which is excluded at 100% because pages keep room at their end for the bar; at 150% and 200% the rows can still be scrolled clear, but a reader sees the bar over the first screen of every list and card. Part 133's room at the page's end should be checked at these sizes.

## Screenshots looked at

- **360 bn 200% list ("opens")**: a 29,316 px high strip, the whole 50-row list as one long column; rows are readable and wrap, nothing runs off the right edge, the groups button and the heading are in the first screen. The Zab 🧰 button floats at the bottom right.
- **360 bn 200% open Dua Card**: the page is a 6,397 px column. The "Back to Rasulullah..." line wraps over two lines, the ‹ 1/3126 › step bar is centered, the framed card shows the arch banner, then the Dua's words **one per line** at a very large size (the 2px overlaps of D1 sit between these lines), then the card's menu (Meaning, Source, whole narration, ✓ Check, 🖼 Poster, Copy / share) as a stack of full-width buttons, then progress and note. The Zab button covers the card's right edge.
- **360 bn 200% 🖼 Poster**: the pop-up fits the width with ✕ বন্ধ করুন beside the heading, the four tabs wrapped onto two rows, and the poster preview below at a fixed small size (D6), cut by the screen foot and scrolled inside the pop-up; the Zab button sits over the preview's corner.

## What a reader should see instead

Words clear of each other (D1); tiles and menus no wider than the screen (D2, D3); verdict buttons wrapping inside their card (D4); a pull-down that stays within the screen's height (D5); a Poster preview that grows or scrolls (D6); a picker that never widens the page (A1); and room above the Zab bar on the first screen of lists and cards (A2).
