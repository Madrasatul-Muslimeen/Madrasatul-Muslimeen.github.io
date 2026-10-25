# Audit part 97 (round 1 of 2): the shared pages at tablet widths, pages 1–12 (PCF MSA J29)

Suite: `tools/i18n-verify/shared-pages-tablet-audit-browser.mjs` (`--page=1-12`, `--lang=bn`, `--mutate=wide`, `--list`).
Page list, seeding (real-length tenant, person, class and Approach names) and stub set-up are the Bangla layout audit's.
Widths: 768×1024 and 820×1180 (portrait), 1024×768 (landscape), English, signed in as the owner.
No file under `app/` was changed; nothing was fixed. Round 2 takes pages 13–23.

## What is measured

| Column | Meaning |
|---|---|
| sideways | `documentElement.scrollWidth > innerWidth`; the element that sticks out is named |
| clipped | a visible button / link / select / input / summary whose box leaves the viewport, or is cut by an `overflow:hidden\|clip` ancestor (containment, `w > 0`); inside an `overflow-x:auto` scroller it is reachable and not counted; a fixed control is also checked against the viewport height |
| cut | `white-space:nowrap` + `text-overflow:ellipsis` whose `scrollWidth > clientWidth` |
| overlap | `elementFromPoint` at the control's centre is neither the control nor inside it; the control is scrolled into view first (centre, then top, because the fixed Back pill and Zab bar sit at the edges) and counts only if nothing reaches it |
| small | under 32 px on either side (fails); 32–39 px is "small, not failing" (in brackets) |
| col | the widest visible main column as a share of the viewport (report only) |

Probe corrections made before believing anything (each was a claim about the probe, checked by opening the page): the first run reported 12 overlaps. They were (a) a menu panel measured after `scrollIntoView` had scrolled the page away from the bar, (b) the Home panel's lower items, which sit below the fold of the panel's own vertical scroller, (c) the current page's own link, which takes no pointer (`pointer-events:none`), and (d) the Bookmark category's summary, which the full-width Bookmarks sheet covers by design and which carries its own Close. The first two are scrolling the probe did wrongly; the last two are by design. All four are now excluded in the probe, with the reason in the code.

## Result — one row per page × width (seconds is the page's open + measure time)

`sideways / clipped / cut / overlap / small [32–39]`

| Page | 768 | 820 | 1024 | col @1024 | s |
|---|---|---|---|---|---|
| 1 Classes | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 2 Course offers | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 3 Curriculum | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 4 Backup | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.4 |
| 5 Import notes | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 72% | 2.3 |
| 6 Dawah | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 72% | 2.3 |
| 7 Onboarding | 0/**1**/0/0/0 [0] | 0/**1**/0/0/0 [0] | 0/**1**/0/0/0 [0] | 50% | 2.3 |
| 8 Accept invite | 0/**1**/0/0/0 [0] | 0/**1**/0/0/0 [0] | 0/**1**/0/0/0 [0] | 47% | 2.3 |
| 9 Monitor | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 97% | 2.4 |
| 10 Homework | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 11 People | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 63% | 2.3 |
| 12 Records | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |

**Totals over 36 page×width cells:** sideways 0, cut 0, overlap 0, small (<32) 0, small-not-failing (32–39) 0, clipped 6 (one fault, below). `315 passed, 0 failed` (the 6 clipped cells are listed in the suite as KNOWN, printed and not failed, until fixed). A full run of 12 pages × 3 widths plus the menu takes about 2 minutes.

The two 1024 notes ("main column uses 50% / 47%") are Onboarding and Accept invite: both are deliberately narrow single-column sign-in pages (`max-width: 30rem`), not a fault.

## The shared menu (Home / Modules / Operation / Bookmark), opened once on Classes at each width

All four categories open at 768, 820 and 1024 with controls found (count > 0 each) and 0 clipped, 0 cut, 0 overlap, 0 small. Seen in screenshots: Home's panel is a narrow left-hand column (about 175 px) that scrolls inside itself; Operation's panel lists six links; Bookmark opens a full-width sheet (about 640 px on a 768 screen) with its own Close. No menu defect at tablet widths.

## The one real finding — the Zab button is cut at the bottom on Onboarding and Accept invite

**What I saw** (opened `onboarding.html` and `accept-invite.html`, screenshots in `out/tablet/onboarding-768x1024.png` and `accept-invite-768x1024.png`): the bottom blue bar shows "🧰 Zab" with its lower edge cut off by the screen edge. Measured on onboarding at 768×1024: the bar is 980–1024 (44 px), the button 994–1034, so 10 px of the button is off screen, and the same at every width (and the same on Accept invite). Checked it is stable and not a late-loading bar: re-measured after 3 s, identical. On Classes the same button is 982–1022, centred.

**Cause:** each of the two pages has a bare `button { … margin-top: … }` rule (`app/onboarding.html:22-25`, `margin-top: 1.5rem`; `app/accept-invite.html:19-22`, `margin-top: 1.2rem`) that also hits the shared Zab bar's button, whose bar is `align-items:center` with a fixed 44 px height, so the margin pushes it down.

**Smallest fix (one line per page, both in shared files):** scope the rule so it does not reach the bar, e.g. change `button {` to `#app button, form button {` (or add `#zabBar button { margin: 0; }` after it). `onboarding.html` and `accept-invite.html` are **shared** files (sign-in flow), not a Lead's. After the fix, remove the two `KNOWN` entries in the suite; it prints a NOTE if the finding stops occurring.

I did not check whether other pages carry a bare `button { margin… }` rule with the same effect on the bar; the 10 other pages in this round measure clean. Round 2 will show.

## Bangla at 768 (3 pages with the most controls: Curriculum, People, Course offers)

0 sideways, 0 clipped, 0 cut, 0 overlap, 0 small on all three. `21 passed, 0 failed`.

## Mutation and positive controls

- `--mutate=wide` injects a 1200 px wide element into the first page measured (Backup, with `--page=4`): `sideways (1)` FAILS naming "page scrolls sideways: scrollWidth 1216 > 768; div ends at 1216", exit code 1. (Only the first width is injected; the other two pass, as designed.)
- Positive control: the menu's own category buttons (`.nav-cat > summary`) are found (count > 0) on every page except Onboarding and Accept invite, which have no shared menu by design. For those two the control is that the page's own heading rendered and the menu is truly absent (checked: their screenshots show a heading and a plain "Open the app" link, no bar). Every page also asserts it has controls (count > 0).

## What I looked at, and what I did not

I looked at the screenshots for Classes (menu open, three panels, 768), Onboarding, Accept invite, Curriculum (1024), People (820) and Records (1024), and saw clean, centred single-column layouts with the fixed Back pill and Zab bar at the bottom. The Back pill overlays the lower-left content at the very bottom of the viewport while scrolling (the label "Role" on People is partly under it); it is a floating control over scrolling content, and every control it covers is reachable by scrolling, so it is not counted. I did **not** open every one of the 36 screenshots; the others were measured, not looked at, so "clean" for them is the measurement's word, not mine. Screenshots are in `tools/i18n-verify/out/tablet/` (git-ignored).

Wasted width: nothing under 60% at 1024 except the two sign-in pages above and People at 63% (a form-and-table page; looks tidy). Nothing worth a line elsewhere.

---

# Round 2 (of 2): pages 13–23 — Catalogue, About, Bookmarks, Hadith collections, Landing, Notes, Journey map, Deen study, Arabic study, Self-check, Taglines

Same suite, `--page=13-23` (about 2 minutes for all 33 cells plus the opened states), English at 768×1024, 820×1180 and 1024×768, Bangla at 768 on the 3 pages with the most controls. No file under `app/` was changed. Two things were added to the suite, each after a claim about the probe was checked by looking at the page:

1. **Opened states**, waited for by STATE (never a number of milliseconds), measured as a whole page again: Landing with the Study menu open; Journey map with a seeded note open in the note pane, then with its ⋯ menu open (note seeding is the Notes audits'); Notes with the New Note editor open (the page is opened on a unit, `?unit=ayah:2:255`). Each state asserts it was reached (positive control).
2. **Probe correction, 1 false finding.** The first run reported Landing at 1024 "clipped: the Zab button cut by `<body>` (box 41..983, control 6..79)". I opened `index-1024x768.png` and the button is whole, in the bar, bottom left. The cause was the probe: a `position:fixed` control is placed against the viewport, so an `overflow:hidden` ancestor *above* the fixed element cannot clip it. The walk now stops at the fixed element's parent. Round 1 re-run afterwards: still `315 passed, 0 failed`, and Onboarding / Accept invite still report their real Zab finding (it comes from the viewport-bottom check, which is kept).
3. Self-check has no shared top menu **by design** (heading, two buttons, the Zab bar: seen in `admin-self-check-768x1024.png`), so it joins Onboarding and Accept invite in the "page booted, no menu" positive control.

## Result — one row per page × width

`sideways / clipped / cut / overlap / small [32–39]`; "state" rows are the opened states.

| Page | 768 | 820 | 1024 | col @1024 | s |
|---|---|---|---|---|---|
| 13 Catalogue | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 97% | 2.3 |
| 14 About | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 69% | 2.3 |
| 15 Bookmarks | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 16 Hadith collections | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 81% | 2.3 |
| 17 Landing | 0/0/0/0/1 [0] | 0/0/0/0/1 [0] | 0/0/0/0/2 [0] | 89% | 2.5 |
| 17 Landing, Study menu open (state) | 0/0/0/0/1 [5] | 0/0/0/0/1 [5] | 0/0/0/0/2 [5] | – | – |
| 18 Notes | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 72% | 2.3 |
| 18 Notes, New Note editor open (state) | 0/0/0/0/**9** [0] | 0/0/0/0/**9** [0] | 0/0/0/0/**9** [0] | – | – |
| 19 Journey map | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 72% | 2.3 |
| 19 Journey map, note open in the pane (state) | 0/0/0/0/0 [1] | 0/0/0/0/0 [1] | 0/0/0/0/0 [1] | – | – |
| 19 Journey map, note ⋯ menu open (state) | 0/0/0/0/0 [1] | 0/0/0/0/0 [1] | 0/0/0/0/0 [1] | – | – |
| 20 Deen study | 0/0/0/0/0 [2] | 0/0/0/0/0 [2] | 0/0/0/0/0 [2] | 75% | 2.2 |
| 21 Arabic study | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 75% | 2.2 |
| 22 Self-check | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 0/0/0/0/0 [0] | 63% | 2.2 |
| 23 Taglines | 0/0/0/0/1 [0] | 0/0/0/0/1 [0] | 0/0/0/0/1 [0] | 94% | 2.2 |

**Totals, round 2 (33 page×width cells + 18 opened-state cells):** sideways 0, clipped 0, cut 0, overlap 0 (one by-design cover, below), small (<32 px) 12 cells with findings in 3 places (Notes editor, Taglines slider, and the Landing's two wheel buttons, which are not faults); small-not-failing (32–39 px) in 3 places (Deen study 2, the Study menu's 5 rows at 32 px, the Journey map folder chip). `303 passed, 0 failed` (the findings are listed as KNOWN, printed, not failed, until fixed). **Totals over both rounds (69 page×width cells):** sideways 0, cut 0, overlap 0, clipped 6 (all the one Zab fault of round 1), small < 32 px in 4 real places.

Two 1024 notes ("main column uses 69% / 63%"): About and Self-check are short text pages; nothing under 60%.

## What I saw, and the findings

**Landing, Study menu open (`index-study-menu-open-768x1024.png`).** The menu is a five-row dropdown (Read, Notes, Writing sheet, Vocabulary, Options) above the Study tab, 157–201 px wide, rows 32 px tall. It sits on top of the "Legend" and "Unit" buttons of the wheel's drawer row; the probe called "Unit" covered. That is a dropdown covering what is beneath it while open (it closes on a tap elsewhere), so it is printed as BY DESIGN, not counted. Rows of 32 px are "small, not failing".

1. **Landing: "Take an Approach" (28 px) and "Collapse list" (24 px) — NOT faults.** Both are QR's wheel buttons, drawn small on purpose, each with an invisible 40 px tap area (`app/quranrevival.html:854` `.wheel-cta-btn::before`; `:1485` `.list-collapse-btn::after`, QR Lead audit parts 6 and 44). The probe measures the drawn box, so it names them; they are listed KNOWN with that reason. **Owner of the file: QR Lead** (frozen anyway); nothing to do.
2. **Notes, New Note editor: 9 controls under 32 px — real, small.** Opened at 768 (`notes-new-note-editor-open-768x1024.png`): the toolbar buttons B, I, U, • List, 1. List, Clear are 22–53 × 23 px; Save and Cancel 56–68 × 28 px; the title input is 705 × 27 px. Same at all three widths. The page's own `.note-actions button.tiny { min-height:40px }` (`app/notes.html:35`) shows the intended size for a row of actions; these were missed. **Smallest fix:** `app/notes.html:61` add `min-height: 36px; min-width: 36px` to `.note-editor-toolbar button` and add `.note-actions button { min-height: 40px }` near line 35; `.note-title-input { min-height: 40px }` at line 68. **Shared file** (Notes / Mapping My Journey). The same toolbar is also drawn in the edit form (`:604-605`), so the fix covers both.
3. **Taglines: Scroll speed slider is 16 px tall — real, borderline.** A native `<input type="range">` (`app/taglines.html:124`), full width (169–182 px wide), the track is what you drag, so a 16 px box is easy to hit with a thumb; I count it because the target rule is on the box. **Smallest fix:** `app/taglines.html:124` add `min-height: 32px` to its `style`. **Whose:** Taglines is a **shared** admin page (not a Lead's).
4. **Taglines in Bangla: six "this ayah only" inputs are 31.6 px wide — real, a hair under.** In the 5.5 rem narrow cell (`app/taglines.html:35`, `.cell-narrow`); English measures just over 32. Seen in `taglines-768x1024-bn.png`: the lines table is wider than the page and scrolls sideways inside its own scroller (so nothing is cut off), and the narrow column is the one that shrinks. **Smallest fix:** `app/taglines.html:35` `.cell-narrow { width: 5.5rem; min-width: 5.5rem; }` or `.cell-narrow input { min-width: 2.5rem }`. **Shared.**
5. **Journey map: clean.** Note open in the pane (`journey-map-a-note-open-in-the-note-pane-768x1024.png`) and the ⋯ menu open (`journey-map-the-note-s-menu-open-768x1024.png`): the menu is a dark panel of about 430 px with Read / Mark / Organise / Settings / Change groups, every button inside the screen, 0 clipped, 0 overlap. The only 32–39 px control is the folder chip (32 px). The panel overlaps the note's title behind it by design (it is a pop-over).

**Pages I measured but did not open in a screenshot:** Catalogue, About, Bookmarks, Hadith collections, Deen study, Arabic study (all 0 findings; the measurement's word, not mine).

## Bangla at 768 (Landing, Catalogue, Taglines: the 3 pages with the most controls)

`27 passed, 0 failed` (findings KNOWN): Landing is the same 28 px wheel button (by design), Catalogue is clean, Taglines shows finding 3 and finding 4. Landing's Study menu in Bangla: the "Unit" and "Legend" drawer buttons are under the dropdown (by design). Looked at: `taglines-768x1024-bn.png`.

## Mutation and positive controls

- `--mutate=wide --page=14` (About): `sideways (1)` FAILS naming "page scrolls sideways: scrollWidth 1232 > 768; div ends at 1232", exit 1 (`20 passed, 1 failed (mutation: wide)`).
- Positive controls kept: the shared menu's category buttons (`.nav-cat > summary`) found on every page that has the menu; Self-check, Onboarding and Accept invite assert their heading rendered and the menu is truly absent; each opened state asserts it was reached (a click that opened nothing would FAIL, not pass).

## Does any other page have a bare `button { … margin … }` that moves the Zab button?

Grep over `app/*.html` for a bare `button {` rule (about 35 pages, each rule read with its next four lines): only three carry any margin. Each measured (Zab button box against its 44 px bar, 768×1024 and 1024×768, `navBack=1`, signed in as the owner, after the bar was present):

| Page | The rule | Zab button vs bar | Result |
|---|---|---|---|
| `onboarding.html:22-25` | `margin-top: 1.5rem` | button 994–1034, bar 980–1024 (768); 738–778 vs 724–768 (1024) | **pushed 10 px off screen** (round 1's finding, Architect fixing) |
| `accept-invite.html:19-22` | `margin-top: 1.2rem` | same shape (round 1) | **pushed** (round 1's finding) |
| `admin-self-check.html:10-14` | `margin-right: 0.5rem` (horizontal only) | button 982–1022, bar 980–1024, `margin-top: 0px` | fine (button is centred; the margin only moves it sideways by nothing visible) |

Also measured `migrate.html`, `health-study.html` and `people.html` (bare button rules with no margin): 982–1022 vs 980–1024, centred. No other page is affected; the remaining bare rules have no margin. A page-by-page measurement of the other bare-`button` pages was not done beyond these six; they carry no margin, so by the cause given in round 1 they cannot push the bar.

## What I did not do

- Did not open every one of the 51 cell screenshots; for Catalogue, About, Bookmarks, Hadith collections, Deen study and Arabic study I rely on the measurement.
- Did not seed Hadith collections with real data beyond what the stub gives; it renders 37 controls and measures clean.
- Did not measure the Landing's other opened states (Choose a Unit, the Legend and Unit drawers); the Study menu is the one asked for.
- No fix was made, no `app/` file touched.
