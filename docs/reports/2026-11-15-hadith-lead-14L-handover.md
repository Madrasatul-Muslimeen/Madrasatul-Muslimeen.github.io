# Hadith Lead 14L handover (15 Nov 2026)

Written by 14L for its successor. Read CLAUDE.md first, then PCF MSA J106 (its comments `c106s1pr`, `c106s2pr`, `c106ks1`; needs `n106h`, `n106i`, `n106j`), then this file.
Rule carry1115 (the Owner, 15 Nov): every pending job and every Owner decision still waiting is listed below, item by item with its id. Answered items stay, with the Owner's words.

## Where things stand
- **Released on `main`:** v14.38 (S1: the one bar Menu, Books, Subjects, Explore, Search), S2 (four Subjects incl. Loving Rasulullah, Continue chips), v15.01 (S3 part 2: the madrasah's own Bangla names writer and editor, #1726), v15.02 (the `hadithNames` Rules synced into `firestore.rules` and `HADITH_NAMES_PUBLISHED = true`, after the Owner's "Rules done", 14 Nov evening). S3 part 1 (editable Subjects: names, order, add, retire) is also released.
- **In review:** PR #1738, Know Your Status (branch `claude/hadith-status-icons`), with the MSA Architect 111L (`session_01PL2xbMsmFc21Ks4v3nVtYD`; always read PCF `p/mmsa.sessionUrl`). Its check passed. No version allocated yet. Do not merge, do not bump.
- **Architects:** MSA 111L (above); PCA 43L `session_01PL2xbHuZXx3HkGB3MaLhGj`. 109L and 110L are handed over.

## Know Your Status (built, PR #1738)
The Owner's words (14 Nov): "I want it to be a small icon just over each hadith appear only when it is marked", "1.Yes. Icon only.2.y.3.y. I will make more marking levels on the Go. And also this will be displayed in the wheel. By Book, By Chapters. By Topic, By Book", "1. Count % both", "Wheel will be from the Hadith card, from the Status, from the menu", "You are right about %. Build as shown in demo. Also build a menu named 'Know Your Status' place it beside 'Explore'. Remove search from menu, place it on the right corner at the top in the same level of 'Hadith Study'".
- Status lives on the person's own bookmark: `{moduleId:"hadith", subjectId:"openiti", position:"openiti:<versionUri>:<n>", settings:{status}}`. Clear = `status:null`, the bookmark stays (I4). **No Rules change.** I9: one bookmarks read when a reader list is drawn, none at startup.
- Statuses are a list in `app/js/hadith-status-model.js` (`STATUSES`); "Counts as done" defaults to Memorised + Revising and is kept in localStorage (`hadith.status.done`). To add a marking level, add one row; every count, colour and legend reads the list.
- Files: `hadith-status-model.js`, `hadith-status.js`, `hadith-study-actions.js` (`setHadithStatus`), `hadith-browser.js`, `hadith.css`, both Hadith pages (header Search slot `#hadithHeaderSearch`), 40 strings in `bn.js` marked `// ?`.
- Suites: `hadith-status-model` 21/0, `hadith-status-browser` 100/0 (10 mutations), `hadith-menu-bar` 188/0 (8/8), `hadith-study-reader-browser` 116/0, `audit-part40` 3562/0, `audit-part33` 696/10 (= main). Inherited failures identical on clean main: audit-part2 150/6, part16 572/8, part21 516/8, part36 1178/6, `bangla-sweep-newer-screens` crashes the same way.

## OPEN: Owner decisions waiting (PCF J106)
- **`n106j` item 1** (new, 15 Nov): "Counts as done" default Memorised + Revising: keep or change. (Taken as keep, from "You are right about %".)
- **`n106j` item 2:** the 40 new Know Your Status Bangla strings (`// ?` in `bn.js`): the Owner reads them in the app and sends corrections, or asks for a list.
- **`n106j` item 3:** original book pages for ALL Hadith: finish Nasa'i first, the three unmapped books first, or something else.
- **`n106h`** (12 Nov, still unticked): Bukhari My index, what a tap on a book opens: A. a list limited to the book's range; B. keep as built; C. something else.
- **Bangla names, from the PCA's carry list (asked in J106 earlier, not yet answered):** book 46's full name; book 65 (Tafseer) range 4,474 to 4,977; the group names; the Learning Stories from Hadith Bangla line (my proposal, for the Owner to correct); Loving Rasulullah Sallallahu A'laihi Wa Sallam (Bangla wording); the new Subject names the madrasah adds; the other `bn.js` strings marked `// ?`. The editor for names is live (v15.01/v15.02), so the Owner can now type these in the app instead.
- **Two small-phone layout questions** the Architect 109L listed for the Owner on the Hadith bar (see PCF monitor). Check `p/mmsa` before asking again.
- **Owner's later asks, waiting on the Owner's word:** more marking levels ("I will make more marking levels on the Go"); naming of bab sub-chapters.

## OPEN: pending jobs (no Owner input needed unless stated)
1. **Original book pages for all Hadith.** The feature exists: the Hadith "Original book page" button (Hadith Leads 11L-13L: PRs #1647, #1662-#1665, #1667, #1668; registry `tools/hadith-data-pull/sources/book-pages.json`, outputs `tools/hadith-data-pull/output/book-pages/*.json`). Mapped: Bukhari, Muslim, Tirmidhi, Abu Dawud, Ibn Majah, Nasa'i, Muwatta, Ahmad, al-Adab al-Mufrad, Riyad al-Salihin, Darimi, Nawawi's Forty. Gaps: Nasa'i has 1,801 of 5,765 hadith with no page (`book-pages-nasai.py`, design in `docs/reports/2026-11-12-hadith-nasai-bridge-design.md`); NO mapping for Nasa'i's and Ibn al-Sunni's 'Amal al-Yawm wa'l-Layla and Nawawi's al-Adhkar; about 460 Bukhari and about 500 Tirmidhi pages are approximate. Waiting on `n106j` item 3 for the order.
2. **Real-function emulator check of the Know Your Status bookmark payload** against the deployed bookmarks Rules (the stub has no Rules): optional extra before release, offered to the Architect in #1738.
3. **After #1738 merges:** expect the Architect to allocate a version; watch for any review comment on the PR (subscribe: `subscribe_pr_activity`).
4. **Never ask the Owner to publish anything without the guide**; the only Rules ever needed for this job so far (`hadithSubjects`, `hadithNames`) are published and synced.

## Lessons from this session
- **Look at the screenshot.** Looking found invisible text on the dark pane, split words, a wrapped caret, an editor squeezed in a narrow pane, Explore clipped at 320/340 (46px word in a 38px box), and chip glyphs at 1.9 to 2.5:1 on a light card. A palette belongs to a surface: the light card needs the dark four.
- **A mutation harness that serves a CSS file as `text/javascript` unstyles the whole page**: the "mutation" is then caught (or missed) for the wrong reason. `hadith-status-browser.mjs` now serves CSS as CSS. A check that reads a colour must first prove which look it is in (the suites run in the NIGHT look; the light look is the `data-card-look` attribute absent).
- **A flex-wrap button sizes itself from the sum of its items**, so a stacked "Preview" cue made Menu 87px wide; `contain: inline-size` on the cue plus a `min-width` on the Menu button fixed it.
- **Check a suite against clean `main` before calling its failure yours**: a `git worktree` at `/tmp/wt-main3` with a second `node serve.js` on `PORT=8081` and `QR_BASE=http://localhost:8081`. Four failures were inherited; `hadith-menu-bar` and `audit-part40` were mine, and clean main proved it.
- **The container can restart mid-run and kill `serve.js`.** A batch that ends with no summary line did not finish: restart the server and rerun, never read it as a pass.
- `audit-part40`'s check text is silent about the failing element: copy it to a scratch file, add a `console.log` of `m.contrast`, and run with `--only= --width= --lang= --look=`.
- A generated file (`app/offline-files.json`) conflicts on every merge of `main`: merge, then `node tools/offline/build-offline-files.mjs` and `--check`.
- For ESM suites: symlink `node_modules/playwright` to `/opt/node22/lib/node_modules/playwright`; start `node serve.js` first. Long suites go in the background with a Monitor.
