# Audit part 83 (PCF MSA J29): the Architect's own slices of the regression sweep

24 Oct 2026, 11:35 pm – 12:20 am Sydney, MSA Architect session `session_0185XGUtQx6FfCbxmUqRkA7t`, on `main` v12.56
(`20d8c77`, then `0b58d5ba` after #1147). Run from the repository root, at most two browser suites at once,
`CHROMIUM_PATH=/opt/pw-browsers/chromium`. Report only: nothing in `app/` changed.

| Suite | Target | Result | Note |
|---|---|---|---|
| `read-window-browser` | MSA source | 65 / 0 | |
| `asma-screensaver-browser` | MSA source | 61 / 0 | |
| `quran-ayah-action-sheet-browser` | MSA source | 143 / 2 | **Finding 1** below; re-run alone, same two |
| `quran-font-bangla-browser` | MSA source | 12 / 0 | |
| `quran-my-status-browser` | MSA source | 248 / 0 | |
| `quran-word-card-achieved-mirror-browser` | MSA source | 73 / 0 | |
| `quran-word-card-fullscreen-browser` | MSA source | 65 / 0 | |
| `quran-word-form-mirror-browser` | MSA source | 91 / 0 | |
| `quran-word-card-form-meaning-browser` | MSA source | 288 / 0 | |
| `qr-lang-switch-cards-browser` | QR build (`build/qr`, port 8083) | 16 / 0 | |
| `qr-lang-switch-in-place-browser` | QR build | 44 / 0 | |
| `qr-mushaf-page-nav-browser` | QR build | 40 / 0 | |
| `qr-stage1-hidden-browser` | QR build | 104 / 6 | **Finding 2** below; MSA source 110 / 0 |
| `qr-student-header-browser` | QR build | 15 / 0 | |
| `qr-surah-offline-browser` | QR build | 28 / 0 | |
| `qr-wheel-tap-size-browser` | QR build | 14 / 0 | |
| `qr-word-card-back-row-browser` | QR build | 42 / 0 | |
| `dua-check-browser` | MSA source | 49 / 0 | Hadith Lead's: report only |
| `dua-note-bookmark-browser` | MSA source | 35 / 0 | |
| `dua-tab-browser` | MSA source | 63 / 0 | |
| `dua-vowels-browser` | MSA source | 33 / 0 | |
| `dua-word-card-browser` | MSA source | 45 / 0 | |
| `dua-word-grammar-browser` | MSA source | 33 / 0 | |
| `dua-word-links-browser` | MSA source | 48 / 0 | |
| `dua-word-progress-browser` | MSA source | 31 / 0 | |
| `dua-words-browser` | MSA source | 37 / 0 | |
| `hadeethenc-browser` | MSA source | 82 / 0 | |
| `hadeethenc-note-back-browser` | MSA source | 12 / 0 | |
| `hadith-search-announcement-browser` | MSA source | 16 / 0 | |
| `hadith-source-navigation-browser` | MSA source | 50 / 0 | |
| `hadith-translations-browser` | MSA source | 33 / 0 | |

## Finding 1: the Āyah card window's "Status of this āyah" heading opens below the fold at 1100x800

`quran-ayah-action-sheet-browser`, en and bn, desktop 1100x800: "...and its heading is in view the moment the card
opens" fails. Measured (probe carrying the suite's own `order` evaluation plus rects): the card is a window at
`[133, 662]` (529px); its right pane `.ayah-sheet-pane-info` is `[339.75, 645]` (clientHeight 305, scrollHeight 908,
scrollTop 0); the Status title is at `[671.25, 687.25]`, 26px under the pane's fold, below Take an Approach.

**Bisected** (`git bisect run`, 7 steps, v12.19 `1b834a5e` good → v12.40 `595aadc4` bad): first bad commit
**`0e4a2a74`, J72 part 2** ("one home window size (the landing window's) for every pop-up on a computer"). Before it
the card opened at 92% of the screen and the heading fitted. The same failure is on v12.55, so v12.56 did not cause it.

Not a coding slip: two Owner decisions meet here (J70's right-half order, Status under Take an Approach; J72's shared
window size). Sent to the QR Lead (the file is theirs) with three options: accept and update the check in place to
"reachable in the right pane", scroll the right pane to Status on opening, or a smaller Take an Approach block.

## Finding 2: `qr-stage1-hidden-browser` on the QR build is out of its scope, not a defect

The 6 failures are all "positive control, the other modules are in the menu" on `/app/about.html` (390/820/1440, en
and bn): QR's own About page (from `apps/qr/site/`) carries no MSA modules menu, so the six MSA module links the
control expects are absent by design. Against the MSA source, the suite's real target, it is 110 / 0. Nothing to fix;
the suite is an MSA suite with a `qr-` name from the v11 era, when MSA itself was branded QuranRevival.

## Also this session

- **QuranRevival rebuilt to v12.56** (`build-from-msa` run 40094264743, dispatched 11:31 pm; `quranrevival.github.io/app/js/version.js`
  read `12.56` at 11:32 pm). v12.44–v12.56 reached QR.
- **#1147 merged** (audit part 81): the six `ayah-*` suites run to the end; its 320x640 number-badge finding is with the QR Lead.
