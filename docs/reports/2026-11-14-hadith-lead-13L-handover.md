# Hadith Lead 13L handover (14 Nov 2026)

Written by 13L for its successor. Read CLAUDE.md first, then PCF MSA J106 (needs `n106h`, `n106i`; its comments), then this file.

## Where things stand
- **Merged and released:** #1662 Darimi, #1663 Nawawi, #1665 Ahmad printed pages; #1664 Bukhari My index; #1667 and #1668 Nasa'i bridge (3,964 of 5,672 standard numbers, 69.9%, `tools/hadith-data-pull/book-pages-nasai.py`); #1693 night 👥 box; #1702 Topics tab off and #1703 "Learning Stories from Hadith" (accepted by 104L, in release #1704 = v14.36).
- **In flight: S1 of the Hadith menu redesign**, branch `claude/hadith-menu-s1` (pushed, NO pull request yet, WIP, untested). Do not merge, no version bump.
- **Architects:** MSA Architect 104L `session_01PL2xbNKSqgPsaDCu5JU81N`; PCA 40L `session_01PL2xbLp4Ei1eEqRAVoFcZj`; Dua Lead 11L (ask via 104L).

## The Owner's decisions (PCF J106 `n106i`, answered 14 Nov, ticks 1B 2B 3A 4A 5B 6A 7A)
Demo (v4): https://claude.ai/artifact/MR5Fd4b3EEPbudYaTG7sM1. One bar: **Menu, Books, Subjects, Explore, Search** (Search at the right edge of the top row, all five on ONE row on a phone). Menu = Encyclopedia, Classical Explanations, a **Dua ↗** link, **Settings** (Text language, Card colours, Person, and the "Previewing as: Prime" note). The "Hadith Books" heading and the grey "not enabled here yet" note are gone. Subjects = Learning Akhlaq, Loving Rasulullah, Knowing Al-Ghayb, Learning Stories from Hadith (Hadith Reading card REMOVED, 5B), with the Continue chips at the top of Subjects (6A). Editable by the Owner in the app: names plus add, remove and reorder subjects (2B), saved in one shared online list (3A, needs a Rules candidate the Owner publishes). Dua chapters move to the Dua page (7A, Dua Lead builds). My index: keep as built (n106h = B). The Owner also wants the Bukhari book 46 / 65 and group Bangla names editable in the app (same storage question as S3).

## 104L's rules (24 Nov message, binding)
- Shared parts are MOUNTED, never changed: the "Previewing as" note, the Continue strip, the Person/Tenant picker. If one needs a code change, ask 104L (name file and line).
- While a "View as" preview is ON, the **Menu button shows a visible cue** ("Menu · Preview"), gone when off; a rendered check proves both.
- Menu panel starts hidden: check COMPUTED display; keep an explicit `[hidden]` rule. Update moved-control suites in place, never delete.
- Measure the bar at 320/360/390/820/1280, en and bn, with real-length labels.
- S3 Rules candidate: you write it, 104L reviews (as #1430): `docs/proposals/<name>.candidate.rules` + a DEPLOYMENT-candidate file, an emulator test (FULL_RULES_FILE run), `rules-authorisation-executable` rows both ways, each denial paired with an allow differing in one fact, mutations check by check, a PUBLISHED flag; nothing writes the new fields until the Owner publishes.

## S1: what is done on the branch (commit 5a1f0f46)
- `app/js/hadith-browser.js`: `controls()` now builds Menu, Books, Subjects, Explore, Search (Topics, Dua, Encyclopedia, Commentary tabs and the loose language/colours selects are off the bar); new `fillMenuMenu()` (Encyclopedia and Classical Explanations rows keep `data-hadith-tab`, a `Dua ↗` link to `dua-study.html?back=1`, Settings with `#hadithContentLang` and `#hadithColours`); the "Hadith Books" heading and the grey note are removed from `renderOpenitiSource`.
- NEW `app/js/hadith-menu-settings.js`: a persistent Settings host that RE-PARENTS the shared `.nav-preview-notice` (via a MutationObserver, precedent: `quranrevival.html relocatePreviewNotice()`) and `#contextBar` (Tenant, Person), plus `addPreviewCue()` for the Menu button.
- `app/css/hadith.css`: Search `margin-left:auto`, one row on a phone, the cue, Settings spacing.

## S1: still to do (nothing below is tested yet)
1. **Update the suites in place** (the hidden-control trap: a panel starts hidden, so every direct click on a moved control hangs ~30 s). Counts today: `[data-hadith-tab="collections"]` 17 suites, `"dua"` 28, `"search"`/`"explore"` a few; `#hadithContentLang` / `#hadithColours`: `behaviour.mjs`, `audit-part16-hadith-dua-browser.mjs`, `hadith-colours-browser.mjs`, `manual-claims-msa-browser.mjs`. Pattern used for Topics (PR #1702): reach a view through `window.__hadithCorpus.state.view = "<view>"; window.__hadithCorpus.render()` (both Hadith pages expose it now); for the language and colour selects, open the Menu first (`[data-hadith-menu="menu"]` panel via its button) then use the select. `hadith-study-reader-browser.mjs` hung for 10+ minutes on the first run (that is this trap).
2. **Dua redirects** (Dua Lead 11L's list, via 104L): on `hadith-collections.html` and `hadith-study.html`, `?view=dua&duaPage=p&dua=n[&dword=n:pos]` -> `dua-study.html?back=1&view=dua&dua=n[&dword=n:pos]`; `?view=dua&duaPage=p` (no dua) -> `dua-study.html?back=1`; `?resume=dua:n` -> `dua-study.html?resume=dua:n`; the Dua tab chip and `rememberDuaView`'s address -> `dua-study.html?back=1`. A rendered check per redirect. TRACE before merging where `note-opener.js` (kind "dua", id `dua:<n>`) and `notes.html` source links send the reader. The Dua view code stays in `hadith-browser.js` (additive); the 28 Dua suites reach it through `__hadithCorpus.state`, not the tab.
3. **Rendered checks:** the cue shows with a preview on and is gone with it off; the Menu panel's computed display is `none` when closed; the bar is one row at 320/360/390/820/1280 in en and bn; the note and Person picker appear inside Menu > Settings and NOT at the page top; a screenshot LOOKED at on a phone width and a desktop width.
4. Regenerate `app/offline-files.json` (`node tools/offline/build-offline-files.mjs`), then open the PR for 104L; no version, no merge.

## S2 and S3
- **S2 Subjects:** add "Loving Rasulullah" (the Shamayyl card; new subject id, the `hadithSubjects` Rules accept any subject id so no Rules change), remove the Hadith Study card list and the Hadith Reading card from the module page, mount the Continue strip at the top of Subjects UNCHANGED (ask 104L if it needs a change), keep "Learning Stories from Hadith".
- **S3 editable list/names:** only after the Rules candidate is written (see above) and the Owner publishes it; guide the Owner click by click.

## Open with the Owner
- Bangla names: book 46's full name, book 65 (Tafseer) range 4,474 to 4,977, the group names, and the new "Learning Stories from Hadith" Bangla line (proposed). The Owner wants these editable in the app (S3).
- Optional, no Owner input needed: raise Nasa'i coverage above 69.9% (hadith starts found by text; many numbers have no numbered scan line).

## Lessons from this session
- The Owner's demo "Hadith Layout Design Demo" WAS this job's J106 round-1 demo (title "Hadith Study Demo", ticked 28 Oct). 13L searched PCF text for the name the Owner typed, found nothing, and wrongly called it someone else's. Search by CONTENT (the four questions), and ask for the job number or link when a name does not match.
- Create a branch with `git fetch origin main && git checkout -B <b> origin/main`; a branch made from a stale `origin/main` shared no history (PR #1666 had to be closed).
- Suites over ~10 min: run in the background with a Monitor; `night-hadith-dua-browser.mjs` timed out at 15 min with no result (unproven, not failing).
- Playwright for ESM suites: symlink the global one into the gitignored `node_modules` (`ln -s /opt/node22/lib/node_modules/playwright node_modules/playwright`). Start `node serve.js` first (port 8080).
- A shared element can be mounted elsewhere by re-parenting it from the page's own script; never edit `nav.js` or `topic-study.js` from a Lead branch.
