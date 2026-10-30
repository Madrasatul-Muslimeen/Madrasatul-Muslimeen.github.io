# Audit part 139: the Person and Tenant pickers never wider than the screen

PCF MSA J29, issue #1349. Follows part 136 (B1, Hadith Study, v12.130) and part 138 (A1, Dua Study).

## 1. The page list (21 pages)

Every `app/*.html` with `#personSelect` or `#tenantSelect`, minus `hadith-study.html` (done in v12.130), `dua-study.html` (the Dua Lead's) and the frozen `quranrevival.html`, `asma-study.html`, `ldog-study.html`:

arabic-study, bookmarks, catalogue, classes, course-offers, curriculum, dawah, deen-study, general-study, hadith-collections, health-study, homework, import-notes, journey-map, life-skill, migrate, monitor, naturelife-study, notes, people, records.

(Tenant only: catalogue, classes, curriculum, dawah, migrate, people.) No picker is built in JS. `account-card.js`, `topic-study.js` and `routine-study.js` only look the selects up by id (`account-card.js` MOVES the existing label into the My account card, where its own CSS already gives `width:100% !important; max-width:100%`), so no JS file needed a change.

## 2. Before (BEFORE = main at 2bc36a9a, real-length seed, 360 en)

The seed is a 45-character person name and "Madrasatul Muslimeen (Owner, Prime)" for the tenant. Pages with the shared account card were measured with the card open (the pickers live in it). Pages that keep the Person picker on the page (the study pages) ran past the screen.

| page | #personSelect right edge | page scrollWidth (screen 360) |
|---|---|---|
| general-study | 393 | **393** |
| health-study | 393 | **393** |
| life-skill | 393 | **393** |
| naturelife-study | 393 | **393** |
| hadith-collections | 361 | **361** |
| every other page | 344–347 | 360 |

On 14 pages (arabic-study, bookmarks, catalogue, dawah, deen-study, general-study, hadith-collections, health-study, journey-map, life-skill, migrate, monitor, naturelife-study, notes) the select's `title` was empty although the chosen name was longer than 30 characters; the other seven pages' titles were not checked before because their chosen text was short or absent. A full before table at 390, 768, 1024, 1440 and in Bangla was not captured: my attempt to restore main's pages for a second run was refused by the sandbox, so the after table below is the only complete one. The failures above are the 360 en run of the new suite against the unfixed pages.

## 3. Fixes (HTML only; no wording or order changed)

* All 21 pages: both selects now carry `style="width:auto; max-width:100%; min-width:0;"` (the v12.130 rule), and each page loads `keepSelectTitles("#tenantSelect, #personSelect")` from `app/js/select-title.js` in a small module script before `</body>`. `bookmarks.html` already titled its own folder/person selects, so it got the same second call for the two pickers.
* general-study, health-study, life-skill, naturelife-study, hadith-collections: the two `<label>`s holding the selects also get `min-width:0; max-width:100%` (the flex row's `min-width:auto` was what kept the select wide).

## 4. After (new suite, every page, 5 widths, en and bn)

`node tools/i18n-verify/person-picker-fit-browser.mjs`: 360 258/0, 390 258/0, 768 258/0, 1024 258/0, 1440 258/0 (each width: 21 pages x 2 languages; per page the picker's right edge inside the screen, no sideways scroll, the select's title holds the full chosen name, and a positive control that the long name is really the selected option). At 360 every picker ends at 344–347, scrollWidth 360, in both languages.

## 5. The check and its mutation

`--mutate=wide` injects `width:auto!important;max-width:none!important;min-width:auto!important` on both selects. At 360 en it FAILS: 114 passed, 15 failed. The failures are `#personSelect` ending at 393 (361 on hadith-collections) with the page scrolling sideways on the five study/hadith pages plus arabic-study and deen-study, and `migrate.html`'s tenant select ending at 407. Pages whose pickers sit in the account card are protected by that card's own `!important` CSS, so they do not fail under the mutation. That is correct, not a gap.

## 6. Regression suites (after the fix)

* `behaviour.mjs` alone: 972 passed, 0 failed
* `stub-parity.mjs`: 4 passed, 0 failed
* `shared-tools-long-names-browser.mjs`: 202 passed, 0 failed
* `large-text-shared-pages-browser.mjs --no-reach`: 2243 passed, 0 failed
* `shared-pages-bangla-layout-audit-browser.mjs`: 460 passed, 0 failed (it notes one accepted entry that no longer occurs, `hadith-collections.html squeeze|lines|...`; the Architect can remove it from the baseline)

Screenshots looked at after the fix: general-study 360 en and hadith-collections 390 bn (My account card, the tenant select inside the screen). Before screenshots were not taken, for the reason in section 2.

Nothing stored, no Rules changed, no version bump.
