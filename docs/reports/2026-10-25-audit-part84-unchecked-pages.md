# Audit part 84 — the 8 pages with no browser check (PCF MSA J29)

Suite: `tools/i18n-verify/unchecked-pages-screen-audit-browser.mjs` (390x844, 820x1180, 1440x900; English and Bangla).
Measured: (a) boots + heading, (b) no sideways scroll + no control cut by an overflow-clipping ancestor, (c) every visible
button >= 40x40, (d) Bangla: no English interface text, (e) a visible Back.

| Page | (a) boot/heading | (b) scroll/clip | (c) 40x40 | (d) Bangla | (e) Back | Done |
|---|---|---|---|---|---|---|
| classes.html | pass | pass | pass | pass | pass | nothing to fix |
| course-offers.html | pass | pass | pass | pass | pass | nothing to fix |
| curriculum.html | pass | pass | pass | pass (seeded data allowed: the week's reference, the resource URL) | pass | check corrected |
| backup.html | pass | pass | pass | pass | pass | nothing to fix |
| import-notes.html | pass | pass | pass | pass (product name, WordPress's own menu path, .xml/.enex allowed) | pass | check corrected |
| dawah.html | pass | pass | pass | pass | pass | nothing to fix |
| onboarding.html | pass | pass | pass | pass | **FAIL** (no Back) | reported, not changed |
| accept-invite.html | pass | pass | pass | pass | **FAIL** (no Back) | reported, not changed |

## Checks that were wrong about the page, corrected

- Checkboxes / radios (13x13) are not buttons; their label is the target. Removed from (c).
- The first Back matcher found "Backup" (the nav link). The app's one Back row is `[data-bm-back]`.
- `?back=1` is the Continue chips' marker and only study pages answer it. The menu opens a page with `navBack=1`
  (`nav.js`, J72; `mountNavBack`), so (e) opens pages with `navBack=1`.

## Reported, not changed (sign-in / tenancy pages)

`onboarding.html` and `accept-invite.html` do not mount the shared menu (`mountBookmarkMenu`), so they show no ← Back
under `navBack=1`. Proposed fix: call `mountNavBack()` (bookmark-nav.js) from each page script. Left red on purpose.

## Positive controls

`wide` (2000px element), `small` (20px button), `clip` (button cut by overflow:hidden) and `noback` mutations each make the
suite fail (6, 6, 9, 6 failures on classes.html). The suite also proves (b) and (c) can fail in-run before measuring.
