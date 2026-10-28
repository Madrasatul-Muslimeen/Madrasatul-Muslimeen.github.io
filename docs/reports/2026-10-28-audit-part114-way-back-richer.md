# Audit part 114 — the way-back law, richer seed (PCF MSA J29, issue #1263)

Check: `tools/i18n-verify/shared-pages-way-back-audit-browser.mjs` (part 95's check). It now prints, for every page and width, how many
in-page controls it found, and marks a page that found none with `(NO IN-PAGE CONTROLS FOUND)`.

## The seed (in the check only, never in `firebase-stub.mjs`)

Added to `REAL_SEED`: two notes (one filed to `ayah:2:255`, one to a hadith key) in a folder, a Hadith and a Dua bookmark in a bookmark
folder, two `unitKeys` on the Homework assignment, a resource link.

## Result on this branch (`--no-bn --max=30`): 16 OK, 0 NO BACK, 0 WRONG PLACE of 16 checked

| Page | In-page controls found (1440 / 390) | Result |
|---|---|---|
| Bookmarks | 4 / 4 (was 2 / 2): Quran, Hadith and Dua "Open" links + buttons | 4 OK each |
| Onboarding | 1 / 1 ("Open the app") | OK (was NO BACK) |
| Accept invite | 1 / 1 ("Open the app") | OK (was NO BACK) |
| About | 0 (menu control, 2 checks) | 2 OK |
| Classes, Course offers, Curriculum, Backup, Import notes, Dawah, Monitor, Homework, People, Records, Catalogue, Hadith collections, Landing, Notes, Journey map, Deen study, Arabic study, Self-check, Taglines | 0 | nothing to check |

## Why 19 pages still find 0 — read from the code, not guessed

With the richer seed, Records, Monitor, Homework, Classes, Course offers, Catalogue and People still draw **buttons only** (Claim,
Confirm, Enrol, Archive, Create…). A search for `.html` in those pages finds only the main menu, the legacy-app links, and comments.
So these pages have no link that leaves them to a study page: the seed cannot draw one that the page does not have. The Curriculum
resource link is `target=_blank` (listed as external). Notes and Journey map draw their notes through the note pane / `note-window.js`
(buttons that open an in-page pane, not navigations), so the seeded notes are not reached as page links by this method. Hadith collections
(module-owned) draws no link in the seeded state.
Left for the Architect: whether to drive those in-page panes (Notes → "Open the āyah", Journey map nodes) with a purpose-built walk; the
existing `notes-way-back-browser.mjs` already covers the three Quran-side links.

## Fixes

1. `app/onboarding.html` (the `#backLink` and the `appLink()` after-sign-up link) and `app/accept-invite.html` `#backLink`: "Open the app"
   → `index.html?navBack=1` (part 95 finding 2).
2. `app/index.html` (the redirect stub): now forwards `location.search` and `location.hash` to `quranrevival.html`. Without that the marker
   (and any `?bookmark=`/`?word=` link to the stub) was dropped by the redirect.
3. `app/journey-map.html` `#backLink` → `quranrevival.html?navBack=1` (part 95 finding 4). Its click handler still uses `history.back()`
   when it came from our own page.

## Findings left with their owners

- **`app/quranrevival.html` (FROZEN Quran Study)** does not answer `navBack=1` at all (only `back=1`, at ~line 24998 and ~25039). The three
  fixes above therefore send the marker, and the audit now sees a working ← Back on arrival; I did not trace which code draws it on Quran
  Study, so the Architect should confirm it is not an accident of the marker simply being present. Nothing in the frozen file changed.
- Hadith/Dua/Health pages, `note-window.js`, `zab-bar.js`: not touched; no new finding came from this run.
- Bookmarks: the Hadith and Dua "Open" links resolve to `hadith-study.html?resume=…` and are OK; seeded hadith/dua keys are invented
  fixtures.

## Checks run

See the pull request body for the pasted totals (audit, both mutations, behaviour, notes-way-back, bn-duplicate-keys, part 111).

## Added by the Architect at release (28 Oct 2026)

- `journey-map.html` `#backLink`: the round wrote `href="quranrevival.html?navBack=1"title=…` with no space between the attributes (an HTML parse error); the space is restored.
- `.gitignore` now ignores `tools/i18n-verify/out/`; the suites said it was ignored, and it was not.
- **The Bangla pass, which the round skipped for time, was run** (`--max=30`): 24 OK, 0 NO BACK, **4 WRONG PLACE**, all Bookmarks at 390 in Bangla: Open → ← Back lands at the top (scrollY 0) instead of 105 or 319. **The same 4 fail on `main` v12.100** with this check, so they predate this round. Next round: part 115 (diagnose and fix the scroll restore).
- `behaviour.mjs` 971/0 alone; `apps-build-check` 48/0.
