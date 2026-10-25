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
