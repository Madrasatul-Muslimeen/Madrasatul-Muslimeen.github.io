# J106 round 1: Hadith Study — the menu bar and Hadith Books in three panes

PCF MSA J106. Built by the MSA · Hadith Lead on `claude/hadith-lead-01q2`, 28 Oct 2026, for the MSA Architect to review,
merge and release. The Owner approved the demo (https://claude.ai/artifact/P1WhyMz7R5bJoPAgcwxBXz) at 11:53 am on 28 Oct:
1A build it · 2A one pane at a time on a phone · 3A the Owner fills the Subjects with "Add to subject" · 4A HadeethEnc
gets its own "Encyclopedia" button.

**No version was set.** `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `sw.js`, `firestore.rules` and `app/apps/*.json`
are untouched. Nothing is stored and no Rules changed.

## What the reader sees

- The page is **Hadith Study** (`MSA — Hadith Study`); the tags under the name are gone.
- **One menu bar**: Hadith Books ▾ · Subjects ▾ | Encyclopedia (the HadeethEnc cards, formerly Collections) · Topics ·
  Search · Explore · Explanations · Dua, and the Text language last.
  - **Hadith Books** is the default view, the shelf of every book. From any other view the button goes straight to the
    shelf; on Books it opens a quick list for switching book.
  - **Subjects** lists Learning Akhlaq, Knowing Al-Ghayb, Stories from Hadith; each opens an empty list for now
    (round 2 fills them).
- **A book opens in three panes**: Chapters (with each chapter's sub-chapters) | the sub-chapter's hadith (number and first
  words) | the hadith's text with ‹ › to step through.
  - Each divider drags (and takes the arrow keys); the widths are remembered on the device.
  - ⤢ expands a pane over the reader, ⤡ brings the three back.
  - ⧉ pops a pane out as a window that moves by its title bar and resizes from every side and corner (the app's own
    float-window.js); ✕ or "Put it back here" docks it.
  - On a phone one pane shows at a time, with Chapters · Hadith · Text buttons.
- Every jump into the library opens the reader on that hadith, highlighted, with its way back (decision 86): Go to hadith
  number (standard and the edition's own), a passage link (`?openiti=`, the Asma posters), a HadeethEnc card's proven
  reference (J103) with ← Back to the hadith card, a Dua chapter and "Also narrated in" with ← Back to Dua / to the
  narration.

## Files

| File | Change |
|---|---|
| `app/hadith-study.html` | title, h1, no description line; the corpus above `#app` (it reads without sign-in) |
| `app/js/hadith-browser.js` | the menu bar, the `books` and `subjects` views, the reader's three panes' contents |
| `app/js/hadith-reader.js` | **new**: the three panes, dividers, expand, pop-out, phone steps |
| `app/js/hadith-shared-ui.js`, `app/js/dua-browser.js` | **new** (aa8089c, cbc8bc9): the Dua tab's code split out, at the Architect's request |
| `app/css/hadith.css` | menu bar, reader and night-look rules |
| `app/js/i18n/bn.js` | **shared file, Hadith strings only**: about 30 new keys (`"Subjects|Hadith Study menu"` = পাঠ্য বিষয়, kept apart from Topics) |
| `tools/i18n-verify/hadith-study-reader-browser.mjs` | **new suite** |
| 18 suites | updated in place for the new layout, each with its reason written beside it |

`sw.js` needs **no** change: MSA's worker caches everything under `/app/` by prefix, and QR's shell list is made by its
build (156 files with the new ones).

## Found and fixed while checking

1. **A phone showed an empty "Choose a chapter." pane** after the book's name in the breadcrumbs. With no chapter open, a
   phone now always shows Chapters.
2. **Go to this edition's number (e.g. 5000) landed on the chapter's first hadith**, not on 5000 (before round 1 the whole
   chapter showed, so 5000 was on screen). It now opens that hadith.
3. **The hadith numbers in the middle pane were 3.24:1 in light look** (gold on white), below 4.5:1. Now a darker gold,
   6.36:1 (5.94:1 on the row's hover). Found by `audit-part40`.
4. In the new suite itself (each found by its own mutations or a positive control, never by reading it): a returned
   reason string counted as a pass, so a third of its checks could not fail; it measured only the first row; it read a
   row's 8% hover tint as solid; and its "light" runs were really night, because the app undoes a look set by hand.

## Measured

- `hadith-study-reader-browser` **106 passed, 0 failed**; `--prove` **16 of 16 mutations caught** (each served through the
  browser, so no file on disk is swapped): booksmenu, nostep, rowpick, phonecrumb, editionnum, nojump, notrail, nosave,
  nokeys, nomax, nofloat, nohandles, nomove, nodock, nophonesteps, faintno.
- The 40 browser suites naming the Hadith page, on the final code: every one green except as listed below. Updated in place
  and green: `openiti-browser` 76/0 (en) and 76/0 (bn), `hadeethenc-openiti-links` 34/0, `hadith-concordance` 91/0,
  `hadith-translations-browser` 33/0, `audit-part16-hadith-dua` 276/0 (en) and 288/0 (bn), `card-look` 96/0,
  `dua-tab` 63/0, `audit-part40` openiti 700/0, hadeethenc 728/0, openiti-hs 300/0, hadeethenc-hs 312/0,
  `manual-claims-msa --section=hadith` 85/0.
- `node tools/apps/build-app.mjs qr` builds; `apps-build-check` 48/0.

## Not this round's, reported rather than fixed

- `manual-claims-msa` keeps **3 failures that are red on `main` too** (measured side by side in a `main` worktree): the
  People page way back at 390px, and "Hand the device to a child" at 390 and 1440px. Not Hadith files.
- `study-note-boundary` 17/1: it reads commit `35f9228` from history, which this sandbox's **shallow clone** does not hold.
  Environmental.
- The PCF User Manual still names "Collections" and "Hadith Corpus"; its Hadith lines and the What's New line are the
  Architect's to write at release.

## For the Architect

- Hand-in: this branch from `1a2f65f` (v12.88), which it already contains. One release covers round 1 and the Dua split.
- QR: a change notice for the in-page note scripts is **not** needed (none changed); QR reads no moved path.
- Next on this job: round 2, Subjects, waits on the Owner's tick (PCF J106 question 5: where the lists are saved).
