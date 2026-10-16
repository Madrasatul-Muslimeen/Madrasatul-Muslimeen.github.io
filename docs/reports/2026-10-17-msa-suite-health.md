# MSA suite health sweep, 17 Oct 2026 (PCF MSA J29, issue #912)

Every `tools/i18n-verify` suite whose name names an MSA part (note, journey, bookmark, zab, hadith, dua, records, monitor, dawah, continue, topic, audit parts 16–29): **129 suites**, run by the Architect on `main` (v11.19 → v11.20) from a scratchpad worktree, two or three at a time on a second `serve.js` port. The Builder's own run of this round (run 1414) ran out of turns after one fix.

**Result: 123 green, 6 not, and no application defect.** Every red one is explained below; three were stale or broken checks, repaired in this PR, each shown able to fail.

## The ones that were not green

| Suite | First run | Verdict |
|---|---|---|
| `audit-part16-hadith-dua-browser.mjs` | exit 1: 563 passed, 1 failed | load-sensitive (one Bangla 390px scroll-into-view check while two suites ran together); alone 564/0 |
| `audit-part17-teaching-browser.mjs` | exit 1: 853 passed, 15 failed | test defect: clipboard granted only to :8080 and a Playwright selector passed to querySelector; fixed in this PR (--only=people 112/0). Never seen on the Builder, which uses :8080 |
| `audit-part18-getting-started-browser.mjs` | exit 1: 1004 passed, 16 failed | stale since v11.18 (Continue chips carry back=1); fixed in this PR (--only=continue 64/0; 6/2 with back=1 removed) |
| `dawah-boundary.mjs` | exit 1: Phase 7 Dawah pages boundary: 20 passed, 1 failed | sweep artefact: compares version.js with origin/main, which moved to v11.20 mid-sweep; on main 21/0 |
| `dua-word-links-browser.mjs` | exit 1: Dua words open their Qur'an word, and the Word card, with the way back: 47 passed, 1 failed | load-sensitive (focus after Back, Bangla 390px, two suites together); alone 48/0 |
| `hadith-source-rights.mjs` | exit 0: 18 passed, 0 failed | stale since 8 Oct (five derived output folders); fixed in this PR, each folder's real sources named, hadith-api's grant cited as decision 89 (18/0; 16/2 with the grant removed) |
| `note-foundation-retire-emulator-proof.mjs` | exit 1: (no totals: did not start) | environmental: needs tools/firestore-emulator/node_modules (@firebase/rules-unit-testing) and the emulator, not installed in this sandbox; the suite says so itself |

Also repaired in this PR, red on `main` since 8 Oct but green in the table above because the fix was on this branch first: `hadith-source-rights.mjs`.

## Lessons

- **A suite that hardcodes `localhost:8080` passes on the Builder and fails anywhere else.** Grep for `8080` in `tools/i18n-verify` before trusting a second-port run; `harness.mjs` exports `BASE` for this.
- **A release that changes a URL must run every suite that asserts that URL.** v11.18's review ran audit-part24/25 and missed audit-part18's exact `?resume=` comparison.
- **Two suites at once on one sandbox makes a few focus/scroll checks flaky.** Re-run a red one alone before calling it anything.
- **A container restart stops every background check and the server.** Write each result to a file as it finishes (this sweep's `.done` files) so a restart only costs the unfinished ones; a run that happened while the server was down reads `0 passed` and must be thrown away, not counted.

## All 129

| Suite | Exit | Totals |
|---|---|---|
| `asma-cited-hadith-browser.mjs` | 0 | Asma: a Name's cited hadith: 66 passed, 0 failed |
| `audit-part16-hadith-dua-browser.mjs` | 1 | 563 passed, 1 failed |
| `audit-part17-teaching-browser.mjs` | 1 | 853 passed, 15 failed |
| `audit-part18-getting-started-browser.mjs` | 1 | 1004 passed, 16 failed |
| `audit-part19-notes-browser.mjs` | 0 | audit-part19-notes-browser: 496 passed, 0 failed |
| `audit-part2-fixes-browser.mjs` | 0 | 156 passed, 0 failed |
| `audit-part20-notes-browser.mjs` | 0 | audit part 20: 132 passed, 0 failed |
| `audit-part21-notes-browser.mjs` | 0 | audit part 21: 608 passed, 0 failed |
| `audit-part23-bookmarks-zab-browser.mjs` | 0 | 185 passed, 0 failed |
| `audit-part24-records-continue-browser.mjs` | 0 | audit-part24: 178 passed, 0 failed |
| `audit-part25-continue-back-browser.mjs` | 0 | audit-part25: 112 passed, 0 failed |
| `audit-part26-topic-study-browser.mjs` | 0 | audit-part26: 816 passed, 0 failed |
| `ayah-card-takenote-family-browser.mjs` | 0 | Āyah card: Take Note ready to write, Note as it is, 👥 records for each ticked person: 44 passed, 0 failed |
| `ayah-hadith-index.mjs` | 0 | Āyah–hadith index data: 133 passed, 0 failed (4290 links, 1023 āyāt: 632 by label, 759 by words, 102 surahs) = |
| `ayah-related-hadith-browser.mjs` | 0 | Related hadith (Keys Round 1), browser: 96 passed, 0 failed |
| `ayah-related-hadith-mutations.mjs` | 0 |  |
| `bookmark-assign-unit-browser.mjs` | 0 | 93 passed, 0 failed |
| `bookmark-folder-edit-browser.mjs` | 0 | 68 passed, 0 failed |
| `bookmark-last-place-browser.mjs` | 0 | 68 passed, 0 failed |
| `bookmark-marks-back-browser.mjs` | 0 | 342 passed, 0 failed |
| `bookmark-multi-save-browser.mjs` | 0 | 192 passed, 0 failed |
| `bookmark-open-browser.mjs` | 0 | 77 passed, 0 failed |
| `bookmark-range-popover-browser.mjs` | 0 | Bookmark a range of āyāt (dialog, list, open): 158 passed, 0 failed |
| `bookmark-remove-browser.mjs` | 0 | 60 passed, 0 failed |
| `bookmark-sheet-browser.mjs` | 0 | 176 passed, 0 failed |
| `bookmarks-page-new-assign-browser.mjs` | 0 | 44 passed, 0 failed |
| `claim-for-family-word-hadith-browser.mjs` | 0 | 158 passed, 0 failed |
| `dawah-boundary.mjs` | 1 | Phase 7 Dawah pages boundary: 20 passed, 1 failed |
| `dawah-screen.mjs` | 0 | Dawah screen (P7-B): 23 passed, 0 failed |
| `dua-check-browser.mjs` | 0 | 49 passed, 0 failed |
| `dua-group-fit.mjs` | 0 | 17 passed, 0 failed |
| `dua-note-bookmark-browser.mjs` | 0 | Notes and bookmarks on a dua: 35 passed, 0 failed |
| `dua-tab-browser.mjs` | 0 | Dua tab: 57 passed, 0 failed |
| `dua-vowels-browser.mjs` | 0 | Dua vowels on the cards, with their source and the switch: 33 passed, 0 failed |
| `dua-vowels.mjs` | 0 | Dua vowels, word for word from a vowelled text: 11 passed, 0 failed |
| `dua-word-card-browser.mjs` | 0 | Dua word card: «و» and spellings, dictionaries and places, progress through the Word card: 45 passed, 0 failed = |
| `dua-word-grammar-browser.mjs` | 0 | Dua word grammar card: 33 passed, 0 failed |
| `dua-word-grammar.mjs` | 0 | Dua word grammar data: 17 passed, 0 failed |
| `dua-word-links-browser.mjs` | 1 | Dua words open their Qur'an word, and the Word card, with the way back: 47 passed, 1 failed |
| `dua-word-links.mjs` | 0 | Dua words linked to Qur'an words: 29 passed, 0 failed |
| `dua-word-progress-browser.mjs` | 0 | Dua word progress, every word its own record: 31 passed, 0 failed |
| `dua-words-browser.mjs` | 0 | Dua cards: the dua's own words, Quranic font, narration one tap away: 37 passed, 0 failed |
| `dua-words.mjs` | 0 | Dua words picked out: 16 passed, 0 failed |
| `evernote-import-parser.mjs` | 0 | evernote-import-parser: 41 passed, 0 failed |
| `fatiha-six-seven-records-browser.mjs` | 0 | 84 passed, 0 failed |
| `hadeethenc-note-back-browser.mjs` | 0 | HadeethEnc Notes, the way back: 12 passed, 0 failed |
| `hadith-commentary-binding.mjs` | 0 | 14 passed, 0 failed |
| `hadith-concordance.mjs` | 0 | Hadith concordance: 89 passed, 0 failed |
| `hadith-corpus.mjs` | 0 | 61 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 0 | 12 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 0 | 14 passed, 0 failed |
| `hadith-search-announcement-browser.mjs` | 0 | 16 passed, 0 failed |
| `hadith-source-navigation-browser.mjs` | 0 | 50 passed, 0 failed |
| `hadith-source-rights.mjs` | 0 | 18 passed, 0 failed |
| `hadith-translations-browser.mjs` | 0 | Hadith English and Bangla translations, on Dua cards and library narrations: 33 passed, 0 failed |
| `hadith-translations.mjs` | 0 | Hadith translations (English, Bangla): 17 passed, 0 failed |
| `journey-across-devices-browser.mjs` | 0 | journey-across-devices-browser: 252 passed, 0 failed |
| `journey-annotations-status-browser.mjs` | 0 | 536 passed, 0 failed |
| `journey-editor-browser.mjs` | 0 | 577 passed, 0 failed |
| `journey-editor-input-browser.mjs` | 0 | 112 passed, 0 failed |
| `journey-editor-siyagah-browser.mjs` | 0 | 98 passed, 0 failed |
| `journey-finish-browser.mjs` | 0 | 64 passed, 0 failed |
| `journey-flags-links-browser.mjs` | 0 | 306 passed, 0 failed |
| `journey-folder-menus-browser.mjs` | 0 | journey-folder-menus-browser: 148 passed, 0 failed |
| `journey-folder-picker-browser.mjs` | 0 | journey-folder-picker-browser: 310 passed, 0 failed |
| `journey-folder-window-browser.mjs` | 0 | 144 passed, 0 failed |
| `journey-link-preview-browser.mjs` | 0 | 192 passed, 0 failed |
| `journey-map-back.mjs` | 0 | Mapping My Journey Back button: 38 passed, 0 failed |
| `journey-map-boundary.mjs` | 0 | Mapping My Journey foundation boundary: 19 passed, 0 failed |
| `journey-map-contract.mjs` | 0 | 35 passed |
| `journey-map-counts.mjs` | 0 | Mapping My Journey folder counts (issue #259): 9 passed, 0 failed |
| `journey-map-path.mjs` | 0 | Mapping My Journey Path (branching with links, issue #267): 32 passed, 0 failed |
| `journey-map-screen.mjs` | 0 | Mapping My Journey screen (P6-F): 47 passed, 0 failed |
| `journey-map-service.mjs` | 0 | 34 passed |
| `journey-map-shard.mjs` | 0 | journey-map-shard: 11 passed, 0 failed |
| `journey-map-trash-copy.mjs` | 0 | 29 passed |
| `journey-note-actions-browser.mjs` | 0 | 184 passed, 0 failed |
| `journey-note-edit-browser.mjs` | 0 | 208 passed, 0 failed |
| `journey-note-folds-windows-browser.mjs` | 0 | 82 passed, 0 failed |
| `journey-note-images-browser.mjs` | 0 | 300 passed, 0 failed |
| `journey-note-pane-browser.mjs` | 0 | journey-note-pane-browser: 327 passed, 0 failed |
| `journey-note-windows-browser.mjs` | 0 | journey-note-windows-browser: 254 passed, 0 failed |
| `journey-pane-resize-browser.mjs` | 0 | 40 passed, 0 failed |
| `journey-reading-tools-browser.mjs` | 0 | journey-reading-tools-browser: 488 passed, 0 failed |
| `journey-s9-browser.mjs` | 0 | journey-s9-browser: 288 passed, 0 failed |
| `journey-sections-browser.mjs` | 0 | 349 passed, 0 failed |
| `journey-sheet-browser.mjs` | 0 | 962 passed, 0 failed |
| `journey-tags-browser.mjs` | 0 | 363 passed, 0 failed |
| `journey-three-panel-browser.mjs` | 0 | journey-three-panel-browser: 464 passed, 0 failed |
| `journey-tray-browser.mjs` | 0 | Journey tray: 227 passed, 0 failed |
| `journey-tray-panes-browser.mjs` | 0 | 56 passed, 0 failed |
| `journey-window-tabs-browser.mjs` | 0 | journey-window-tabs-browser: 166 passed, 0 failed |
| `listen-bookmark-qcr-card-browser.mjs` | 0 | Listening bookmark, QCR from the ⋮ menu, the writing sheet 🔖: 48 passed, 0 failed |
| `monitor-study-activity.mjs` | 0 | Monitor Study activity section: 12 passed, 0 failed |
| `mushaf-bookmark-stay-qcr-add-browser.mjs` | 0 | Issue #786: a bookmark save keeps the Read view's place; QCR + Add āyah follows the Al-Fātiḥah count: 152 passe |
| `note-foundation-boundary.mjs` | 0 | 30 passed, 0 failed |
| `note-foundation-data-layer.mjs` | 0 | Note Foundation data layer: 47 + 30 P6-D + 18 P5-F/P6-E + 11 retire-revision + 16 P5-G assertions passed |
| `note-foundation-emulator-scaffold.mjs` | 0 | 31 passed, 0 failed |
| `note-foundation-retire-emulator-proof.mjs` | 1 |  |
| `note-foundation-size-preflight.mjs` | 0 |  |
| `note-foundation-transaction.mjs` | 0 | envelope transaction facade: 16 assertions passed |
| `note-image-sanitize.mjs` | 0 | 33 passed, 0 failed |
| `note-image-storage-rules.mjs` | 0 | 7 passed, 0 failed |
| `note-journal-evidence.mjs` | 0 | Note Journaling evidence bridge (P5-B): 18 passed, 0 failed |
| `note-link-preview.mjs` | 0 | 43 passed, 0 failed |
| `note-menu-groups-browser.mjs` | 0 | 92 passed, 0 failed |
| `note-sanitize-boundary.mjs` | 0 | 13 passed, 0 failed |
| `note-sheet-engine-mutations.mjs` | 0 | 10 mutations failed the suite as they must, 0 did not |
| `note-sheet-engine.mjs` | 0 | 89 passed, 0 failed |
| `note-user-settings.mjs` | 0 | 43 passed, 0 failed |
| `note-view-css-dead-browser.mjs` | 0 | Retired Note view CSS: nothing on the page matches the removed selectors: 16 passed, 0 failed |
| `note-view-decoupled.mjs` | 0 | 28 passed, 0 failed |
| `notes-note-windows-browser.mjs` | 0 | notes-note-windows-browser: 218 passed, 0 failed |
| `notes-pane-has-note-browser.mjs` | 0 | Notes-pane "has a note" and Copy: 36 passed, 0 failed |
| `notes-pane-loading-browser.mjs` | 0 | Notes pane never "Loading…" forever: 26 passed, 0 failed |
| `notes-way-back-browser.mjs` | 0 | 33 passed, 0 failed |
| `quran-word-card-note-origin-return.mjs` | 0 | 14 passed, 0 failed |
| `read-bar-bookmark-layers-browser.mjs` | 0 | Read bar 🔖 and Meaning switches (the Owner, 12 Oct 2026): 48 passed, 0 failed |
| `read-note-menu-browser.mjs` | 0 | Study menu Notes tab, Note view unreachable, Bangla tab names (decision 95, R3c): 24 passed, 0 failed |
| `read-note-pane-browser.mjs` | 0 | Read view Notes pane (decision 95): 210 passed, 0 failed |
| `study-note-binding.mjs` | 0 | 16 passed |
| `study-note-boundary.mjs` | 0 | 18 passed, 0 failed |
| `study-note-service.mjs` | 0 | 35 passed |
| `zab-bar-browser.mjs` | 0 | 370 passed, 0 failed |
| `zab-data.mjs` | 0 | zab-data:46 passed, 0 failed |
| `zab-dock-browser.mjs` | 0 | 74 passed, 0 failed |
| `zab-kinds-browser.mjs` | 0 | Zab kinds: tasks, links, ideas, shopping (Z3-Z4): 324 passed, 0 failed |
| `zab-to-note-browser.mjs` | 0 | 196 passed, 0 failed |
| `zab-tree-browser.mjs` | 0 | 240 passed, 0 failed |
