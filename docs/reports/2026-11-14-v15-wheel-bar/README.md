# v15.00 layout — the one wheel bar (QR Lead 47L, 14 Nov 2026)

The Owner (14 Nov 2026, QR Lead chat): one bar above the wheel, below the "40 Ways" heading — gold group **Read | Take an Approach |
Choose a Unit**, navy group **Know Your Status | ⓘ Legend** — "We will call this v15.00 (since new layout)". The Architect allocates the version.

Screenshots (this folder): `360-en`, `390-bn`, `820-en`, `1280-en`, each closed / Know Your Status open / Choose a Unit open.

## What changed (app/quranrevival.html, app/js/i18n/bn.js)
- New `#wheelBar`. Read goes straight to the Mushaf; Take an Approach lifts the wheel's veil (and returns to the Approaches wheel);
  Choose a Unit opens a panel (what the wheel shows + the unit pickers + Read/Play); Know Your Status opens a panel (Approaches |
  Vocabulary | Difficulty Level, Dark/Light/Colour/Names, "Open my full status"); ⓘ is icon-only and opens the legend.
- The original controls are MOVED into the panels (never copied), so ids, listeners and saved choices are unchanged.
- "Choose a Unit" is offered once, in the bar only. The old bottom row (`#wheelIntroSettled`, hidden but wired) and the Wheel/Legend/Unit
  drawer buttons are gone; the 🧰 dock stays at the row's right end. The tablet corner buttons are retired.
- An open panel never shrinks the wheel (phones: judged like the old drawers; computer window: the panel floats over the wheel).

## Not in this PR
- The fourth status wheel "Arabic Words in Bangla": no such wheel exists today (Bangla is only ring/centre/tenth on the Vocabulary wheel). Its own round.

## Real findings while testing (read these)
1. 320px phone WITH the top banner: the wheel is 175px (was 209px) because the bar shares the first screen; the wheel-centre pill then
   cannot hold "Take an Approach" + a unit name (`wheel-centre-browser` "first screen 320 en · line 2 … inside the button", 6 checks, en only).
   Not fixed: widening the pill or shrinking the type breaks the suite's own rules (85% pill, 8px floor, corners inside the ring). Options: accept, or hide
   the "40 Ways" heading below 360px to give the wheel its room back.
2. 200% text on a 1024x768 computer window: the Approach list rows are covered (`qr-landing-large-text-browser`, 1 check). The window has only ~300px at that size.
3. Fixed on the way: panels collapsing the wheel to 0px; light-card-look panel contrast 1.1:1; Bangla/320 "Approac|h" mid-word break.

## Checks
See the PR body (47 older suites compared with `main` by failing-check name, new `wheel-bar-browser.mjs` with two mutations).
