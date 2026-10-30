# Audit part 137: shared pages, every control a finger presses is at least 36px

Issue #1340 (PCF MSA J29), following part 131's "small" debt.

## Before (measured first, at 100%, 360/390/768, en and bn; identical in all six combinations)

| Page | Control | Cause | Height |
|---|---|---|---|
| classes | `#subjectChecks` checkboxes (3) | bare checkbox | 13px |
| course-offers | `#subjectChecks`, `#dayChecks` checkboxes | bare checkbox | 13px |
| curriculum | `#unitSubjectChecks` checkboxes | bare checkbox | 13px |
| onboarding | `.radio-row` radios | bare radio | 13px |
| monitor | `#wholeRoster` | bare checkbox | 13px |
| homework | `#assignToChecks` | bare checkbox | 13px |
| people | `#showArchivedPeople`, `#isMinor`, `.role-row` | bare checkbox | 13px |
| records | `#domainChips`, `#pendingOnly` | bare checkbox | 13px |
| bookmarks | `#showRetiredCk` | bare checkbox | 13px |
| journey-map | `#folderShowNumbers` | bare checkbox | 13px |
| taglines | `#pauseOnHoldToggle`, `#scrollToggle` | checkbox beside a `for` label | 13px |
| index | `#wheelCtaBtn` | button (28px) | excluded, Quran Study's page |

All but index and the buttons are the one cause: the box itself measured as the control. No button, link-button or icon button was under 36px.

## Fixes

1. `app/css/card-look.css` (linked by every one of these pages): a `label` that wraps a checkbox or radio is `inline-flex`, centred, `min-height: 2.5rem` (40px, grows with text size). The box stays small. No text, wording or order changed.
2. `app/taglines.html`: its two toggles sit beside a `for` label, so those two labels get the same 2.5rem rule in the page's own CSS.

## After

Every combination above measures `small 0` at 100/150/200%, 360/390/768, en and bn (summary table of the sweep). Overlap/cut/offscreen counts in the sweep summary are unchanged INFO lines; every already-checked kind still passes.

## The check, and its mutation

`large-text-shared-pages-browser.mjs` now FAILS when a visible, enabled control is under 36px, measured by its tap target (a checkbox/radio is measured through its wrapping or `for` label). It runs for 22 pages at 100/150/200%, en and bn. Excluded: `index.html` (Quran Study's page, frozen: its `#wheelCtaBtn` 28px is reported as INFO only), hidden controls and `disabled` controls (not pressable).

`--mutate=small` puts the old label CSS back. Run on classes, people and taglines at 100%: 12 FAIL (classes 6, people 6). Taglines does not fail under it, because its fix is page-specific and the mutation targets wrapping labels only; that is a gap in the mutation, not in the fix (taglines failed 18 times before its fix, see the first full run). The previous injected-button `small` mutation is kept as `--mutate=smallbtn`.

## Not done

- Widths 1024 and 1440 were not added to this suite (it measures 360, 390, 768 only); the fix is width-independent CSS.
- The four before/after screenshots (Classes 390 bn, Course offers 360 en, Bookmarks 768 bn, Records 1440 en) were NOT looked at in this run. Please look at them.
- "Other rects moved" was not measured as a before/after table. The labels grew from about 20px to 40px, so rows with checkboxes are taller; the layout suites below show no new overflow.

## Suites (after the fix)

| Suite | Result |
|---|---|
| large-text-shared-pages-browser (full, `--no-reach`) | 2411 passed, 0 failed |
| behaviour.mjs (alone) | 972 passed, 0 failed |
| stub-parity.mjs | 4 passed, 0 failed |
| shared-pages-bangla-layout-audit-browser | 460 passed, 0 failed |
| shared-tables-phone-fit-browser | 300 passed, 0 failed |
| floating-overlays-reach-browser | 360 passed, 0 failed |
| shared-pages-keyboard-audit-browser | 506 passed, 0 failed |
