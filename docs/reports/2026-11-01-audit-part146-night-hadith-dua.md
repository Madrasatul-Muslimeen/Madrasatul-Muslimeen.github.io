# Audit part 146 — the night look on hadith-study, dua-study and hadith-collections

Issue #1388 (PCF MSA J29). **Finished by the MSA Architect** (session `session_01PL2xbMmi7WNLzsPkGM6XVu`): Builder run 2374
pushed the report heading and a first working suite, then stopped after ~5 minutes; run 2375 (told to continue) stopped after
~90 seconds and pushed nothing. The Architect cherry-picked run 2374's three commits, completed the suite, ran it and fixed the
one real defect (so this is no longer report-only: one CSS change, D1 below).

## Method

`tools/i18n-verify/night-hadith-dua-browser.mjs` (Builder run 2374, completed by the Architect). The night look is
`<html data-card-look="night">` from `localStorage mm_card_look="night"`; the suite first proves that each page's day and night
looks really differ. The views are READ from the part-136 large-text suites, so they cannot drift from them. For every view, at
390×844 and 1440×900, English and Bangla, text at 100% and 200%:

- **contrast**: rendered text against the real painted background (part 142's `window.__A11Y`), 4.5:1, or 3:1 for large text;
- **focus**: a real Tab walk; each focused control's ring must reach 3:1;
- **day**: a near-white panel, card, sheet or control (luminance > 0.8) whose nearest painted ancestor is dark;
- **arrow**: a show/hide drawn as an arrow instead of the J109 switch (menus keep ▾, folder trees keep ▸).

Positive controls are built in: a grey-on-grey line, a white panel on navy, a ▸ summary beside a ▾ menu, and a ringed button
beside an unringed one. Each must be reported or passed as expected.

Mutations (each must FAIL; proven 1 Nov):

| Mutation | Result |
|---|---|
| `contrast` (grey-on-grey line injected) | 1 fail |
| `focus` (every ring removed) | 1 fail |
| `arrow` (a ▸ summary injected) | 2 fail |
| `day` (a white panel injected into the first dark card) | 1 fail |
| `d1` (the D1 night rules taken out of hadith.css) | 2 fail |

The `day` mutation was updated by the Architect: as first written it put the panel straight on the page canvas, which is light
in the night look, so it could not fail.

## Findings

**Before the fix**:

| Page | Result |
|---|---|
| dua | 1082 passed / 8 failed |
| collections | 746 / 24 |
| hadith | 554 / 16 |

Contrast, focus and arrows were clean on every page, width, language and size. Every failure was a "day" colour:

| # | Where | What | Verdict |
|---|---|---|---|
| **D1** | Encyclopedia hadith card (hadith-study, hadith-collections), every width and language | The 👥 pill (`.assign-trigger`) and its "Assign to" sheet (`.assign-popover`) were hard `#fff` on the dark card, beside a Studied picker already in night colours (`app/css/hadith.css:268`, `:277`, no night rule). Once darkened, the ▾ caret at opacity .7 measured 4.2:1. | **DEFECT, fixed** |
| — | Dua word card (`span[data-dua-word]`) | The SELECTED word wears a deliberate gold highlight, dark ink on cream (`hadith.css` `.dua-word[aria-pressed="true"]`, `.dua-words-mark`). Readable, and intended. | **Not a defect.** The suite now skips deliberate marks (`[aria-pressed=true]`, `[aria-current]`, `mark`, `.dua-words-mark`); their text is still measured by the contrast check. |

**The fix (D1)**, in `app/css/hadith.css` and only under `[data-card-look="night"]`, so the day look is unchanged:
- the pill takes the card's inset colours (`--card-bg-inset`, `--card-heading`, `--card-line`), with its caret at full strength;
- the sheet takes `--card-bg` and `--card-text`;
- the label, hint and "you" tag take the muted card colours;
- the tick boxes take the gold accent.

## Screenshots looked at

- `tools/i18n-verify/out/night-hadith-dua/hadith-hadeethenc-card-open-390-200.png` (before)
- `FIX-hadith-hadeethenc-card-open-390-en-100.png` and `FIX-…-390-bn-200.png` (after: pill and sheet in night colours,
  every name readable)
- `dua-tab-dua-word-390-200.png` (the selected Dua word's gold mark)

## Totals after the fix

See the PR for the full batch: the night suite on every page, plus `large-text-hadith-study`, `large-text-dua-study`,
`note-window-large-night`, `audit-part16-hadith-dua`, `audit-part36-contrast`, `hadith-study-reader` and `palette-contrast`.

## Not done

Widths 360, 768 and 1024 were not swept: the issue asked for them only for a view with a finding, and D1's rule has no width
condition. Seerah has no page yet.
