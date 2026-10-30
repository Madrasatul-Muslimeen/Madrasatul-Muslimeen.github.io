# Audit part 135 — ← Back on About (from People's Home menu) at 390px

Issue #1335 (PCF MSA J29).

## Cause: the CHECK was wrong, the app is right

`manual-claims-msa-browser.mjs` pressed `[data-bm-back]`. That attribute is on the **row** (`div.bm-back-row`, built by
`mountBackRow` in `app/js/bookmark-nav.js`), which holds the ← button (`[data-bm-back-link]`) and the ✕ button. Below 600px
shell.css hides the button's words, so the row is ~104px wide with the two small buttons at its ends. Playwright clicks the
centre of the row, which falls in the gap between ← and ✕.

Evidence at 390x844 (`document.elementFromPoint` at the centre of the row's rect, rect 12,778 · 104x54): the element there
is `DIV.bm-back-row` itself — not the button, not covered by the 🧰 corner, a pill or a toast. The click reaches nothing
that has a handler, so the URL stays `about.html?navBack=1`. At 768px and up the words show, the row's centre is on the
button, so the check passed. Pressing `[data-bm-back-link]` returns to `people.html` at every width, in en and bn.

## Fix

Check corrected in place: `manual-claims-msa-browser.mjs` now presses `[data-bm-back-link]`. No app file changed.

## Checks

- New `tools/i18n-verify/people-about-back-browser.mjs` (360, 390, 768, 1024, 1440 × en, bn): About opened from People's
  Home menu shows ← Back on screen, the button is the element at its own centre, pressing it lands on `people.html`.
  Result: 30 passed, 0 failed.
- Mutations (all must fail): `--mutate=row` (tap the row's centre, the old check's cause) 26/4 — fails at 360 and 390 in both
  languages; `--mutate=dead` (click swallowed) 20/10; `--mutate=cover` (invisible layer over the button) 10/20.
- `manual-claims-msa-browser.mjs --section=start`: 72 passed, 0 failed, 1 skipped (the way-back claims pass at 390px). The
  full run reached "Other study modules" with 502 passed and only the two known "Hand the device to a child" failures
  (PCF J92); I stopped it before it finished because of the 600s tool limit, so the last section was not completed.
- `stub-parity.mjs`: 4 passed, 0 failed.
- Not completed: `shared-pages-way-back-audit-browser.mjs` (stopped at the time limit after the Bangla pass began; every
  page printed had `no back 0, wrong place 0`), `floating-overlays-reach-browser.mjs` and `behaviour.mjs` were not run.
  No app code changed, so none of them can be affected by this round.
