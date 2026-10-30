# Audit part 136 — Hadith Study with larger text (150% and 200%)

Issue #1337 (PCF MSA J29). **Report only: no file under `app/` changed.** The Builder (run 2277) wrote the suite
`tools/i18n-verify/large-text-hadith-study-browser.mjs` and pushed it, then its run ended with only this report's heading
and no results. The Architect (session `session_01PL2xbMR1BT69RwFBnBc2w9`, 30 Oct 2026) ran it, corrected its 100% checks
(below), and wrote this report.

## Method

Same as part 131 (`large-text-shared-pages-browser.mjs`, whose MEASURE / REACH / INJECT functions are copied): the root
`font-size` is set to 150% and 200% and `app/hadith-study.html` is measured in **19 views** (Hadith Books shelf, its menu
open, a book's chapters, a narration, its translation open; Subjects menu, a subject, a topic; Encyclopedia, a card, a card
with 👥 and the explanation open; Search; Explore; Commentary; Dua cards, a Dua word, a Dua card's ✓ Check, the Dua chapters
and a chapter's list), at 360, 390, 768, 1024 and 1440, English and Bangla, with the part-126 real-length seed (a ~40-character
person name). Kinds: cut, overlap, offscreen, sideways, small, reach (a control that can never be brought into view uncovered),
fixedpx. Positive controls inject an over-long ellipsis button, two overlapping buttons, a 20px button and a button past the
edge, and each must be reported.

## The Architect's corrections to the suite

The Builder's 100% checks failed at every width (3 / 3 / 21 / 2 / 2 failures). Read one by one, none was a new defect class:

1. **The 🧰 Zab bar over a row at the foot of the screen at scroll 0** (all 21 at 768 and those at 1024/1440). Not a defect:
   since v12.125 (part 133) every page keeps room at its end for the bar, so any row can be scrolled clear of it. The 100%
   overlap check now names this **Z** and leaves it out, the same exclusion `large-text-shared-pages-browser.mjs` makes.
2. **Real findings at ordinary text size**, now named so the suite is green while they stand (each is INFO, printed under its
   name, and any OTHER 100% finding still fails): **B1** (the Builder's), **B2** and **B3** below. A page widened by B1/B2 can
   open scrolled sideways, so its left-hand controls sit at a negative x: counted under the same name.

After the corrections: **201 passed, 0 failed at each of the five widths** (360, 390, 768, 1024, 1440), positive controls
included.

## Findings

**H** = the Hadith Lead's (`hadith-study.html`, the Hadith tabs); **D** = the Dua Lead's (the Dua tab); **A** = the Architect's.

### At ordinary text size (100%) — the important ones

- **B1 (H). The Person picker is as wide as the longest person's name** (`#personSelect`, `width: auto`): with a 40-character
  name it spans 16..393 on a 360px phone, so the whole page scrolls sideways on every view (en and bn). At 200% it spans
  24..578 and on a phone is never brought fully into view. *Should:* the picker fits the screen (`max-width: 100%`,
  `min-width: 0`) and shows the full name as its title, as the shared pages do since v12.124 (`app/js/select-title.js`).
- **B2 (H). The 👥 "who is this for" button on an Encyclopedia card carries the same long name** (`.assign-trigger`) and runs
  to x 435 on a 360px phone (650 at 200%); opening the card then leaves the page scrolled sideways, with Home, the tabs and the
  "HadeethEnc" crumb at negative x. *Should:* the name is cut with an ellipsis inside the screen and shows in full as the
  button's title.
- **B3 (D). A Dua word's Word card panel makes the page 3px wider than a 390px phone** (scrollWidth 393). *Should:* the panel
  fits (`max-width: 100%`, its links wrap).
- **Small (H).** The 👥 list's check boxes are 25px tall (`label.assign-row > input`), at every size. *Should:* the row's label
  is the 40px tap target (part 137 does this on the shared pages).

### Only with larger text (150% / 200%)

- **A1 (A — mine, from v12.126). "Dua Study ↗" in the Dua tab runs off a 360px phone** (spans 265..404 at 150% and 200%,
  en and bn): the Duas / Dua chapters row (`.dua-modes`, `inline-flex`) does not wrap. **Fixed by the Architect in v12.128**
  (`flex-wrap: wrap` on `.dua-modes` in `app/css/hadith.css`; at 100% the row fits and nothing moves).
- **H1 (H). The content-language picker is cut** (`#hadithContentLang`, "English" needs 97px, has 70px) at 200% on a 360px
  phone, on every view.
- **H2 (H). The book reader's pane heading "Chapters" is cut** (needs 106px, has 64px at 768; 142/87 at 1024; 142/132 at 360)
  at 150%/200%, with no title.
- **H3 (H). The "Go to" mode picker is cut** ("Standard number" needs 173px, has 126px at 768; 230/176 at 1024) at 150%/200%.
- **H4 (H). A narration's snippet in the reader list is cut** at 200% (Arabic, ellipsis, no title).
- **Not defects, recorded so nobody chases them:** (a) the Hadith Books / Subjects menus, while OPEN, cover the "Hadith Books"
  crumb and the first book row — the reach pass calls them never reachable in those two views only; they are reachable once
  the menu closes. (b) The Dua views' thousands of "overlaps" (e.g. 6,311 at 150%) are neighbouring Arabic words' line boxes
  touching by 2px between lines (`span.dua-word` over `span.dua-word`), not one control over another. (c) The Zab bar over a
  row at scroll 0 (Z above).

## Screens looked at

`tools/i18n-verify/out/large-text-hadith/` (not committed; `--shots`). Hadith Books shelf 360 bn 200%: the menu tiles, the
book list and the topic list wrap and read cleanly, and the 🧰 corner sits over the menu's last tile at that scroll position.
The Dua cards' full-page shot is 177,000px tall (every card of the fixture on one page), too long to read as a picture; its
measurements stand on their own.

## Hand-offs

- Hadith Lead: B1, B2, Small, H1–H4.
- Dua Lead: B3.
- The Architect: A1 (fixed in v12.128).

## Run it

`node tools/i18n-verify/large-text-hadith-study-browser.mjs --width=360 --list` (one width at a time: each run takes about
10 minutes). `--shots` saves the 200% screens. Also run: `stub-parity.mjs` 4/0.
