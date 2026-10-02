# MMSA session handover — 1 Oct 2026

Written by the MMSA Architect (session `session_01TditAxqj6JWtXDC3YVgvjQ`,
active since 30 Sep 2026 06:20 UTC). **This supersedes
`2026-09-30-MMSA-SESSION-HANDOVER.md`**, which stopped at v09.06. That file is
kept as history. Its sections 2 (how to start and review a round) and 3 (the
sandbox lessons) still hold word for word, so they are not repeated here. Read
them there. Where the two disagree, this one wins.

The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-01.md`.

## 0. The exact pause point — start here

Read the live state yourself, because it moves on after this was written:
- the version from `app/js/version.js` on `origin/main`;
- open PRs from `list_pull_requests`;
- the Builder from `list_workflow_runs` on `claude.yml`;
- the "Active Architect session" line on #159.

**Updated 2 Oct 2026, ~08:40 UTC, by session `session_01M4Sbc1h94F7SgErzAzxq9n`:**
- **`main` is at v09.39**: long taglines scroll sideways, with on/off and a 1–10 speed on taglines.html (#479, PR #480). In progress: PR #486 (#482 the optional Al-Fātiḥah count, decision 55) in Architect review; #484 same-meaning known words (decision 56; Builder, re-dispatched after a pending run was replaced in the one-round queue). v09.38: the Word card's "You know X of Y words of the Qur'an" in a bold box (decision 57); the Āyah card opens on Status of this āyah; the same-meaning root groups data. v09.37: on a PC the capsule bar clears the wheel's bottom numbers at any wheel size. v09.36: a ☰ Surah list button in the Read view. v09.35: stage buttons in the wheel-legend colours; the Approach pull-down drops "· Not started"; the Read quick-row Track button reads Record. v09.34: a 📖 Dictionary box on the Word card's Arabic in Depth tab (decision 54, #476 → PR #477; data PR #475). v09.33: known words lightly marked on the Mushaf page and in WbW (decision 52, #472 → PR #473). v09.32: a more elegant landing page on a phone (Owner demo approved): bold Approach title, more room around the wheel, edge drawer buttons, first screen ends at the dock (`fitLandingFirstScreen()`). v09.31: Record Your Progress gains N/A for everyone and Mastered for anyone not a student account (the teacher note shows only to students); the landing capsule bar clears the wheel's bottom numbers (~12px) and the Wheel · Legend · Unit buttons sit at the edges. v09.30: bookmarks open straight where they were made (#468 → PR #470; cover from first paint, `settings.view` honoured). v09.29: landing drawers Wheel · Legend · Unit (decision 51, #465 → PR #467), plus an Architect fix so the phone wheel's top numbers clear the dark card (the real 40-number wheel overhung it 2–6px; the Builder's check used the 10-Approach fixture). v09.28: the write-failure banner can be closed and names the failed save (Owner's refused-save report not reproduced; see CHANGELOG). v09.27: sections, folder colour/bold and Tags are **switched on** — the Owner published the round 7 Rules; `firestore.rules` is synced and the gate is open (`docs/reports/2026-10-01-siyagah-round7-enabled.md`). v09.26 was Siyagah round 7b (#461 → PR #462), Tags on Notes (`noteTags`/`noteTagLinks`; chips + ⋯ → 🏷 Tags… in `note-window.js` on both pages; a Tags block in the tray), **built and switched off** behind the same `siyagah-sections-readiness.js` gate. **The Siyagah seven-round port is complete in code.** v09.25 was Siyagah round 7a (#458 → PR #460), sections and folder colour/bold, **built and switched off** behind `app/js/siyagah-sections-readiness.js` (`ready: false`) until the Owner publishes the round 7 Rules; review made Bold visible (plain names weight 500) and added `npm run siyagah-sections-real-function`. v09.24 was Siyagah round 6b (#454 → PR #456), the same Note windows on the Notes page through ONE shared module `app/js/note-window.js` (revisions there go through `reviseStudyNote`, so Journaling evidence is recorded). v09.23 was Siyagah round 6a (#452 → PR #453), Single and Multi Note windows in Mapping My Journey. v09.22 was Explore's Approach list readable in the Night card look (Owner report; new `palette-contrast-browser` suite). v09.21 was Siyagah round 5 (#450 → PR #451), edit a Note with autosave; the toolbar and Done pinned while editing (Architect review). v09.20 was Siyagah round 4 (#446 → PR #448), a Note opening in read mode in the pane; dates in the reader's language. v09.19 before it was built by the Architect:
  - decision 46 (option C): the two Mastery Wheel titles on the heading line, and Read / Choose a Unit / Know Your Status as one row under the wheel;
  - decision 47: Record Your Progress always on the Āyah card.
- v09.18 before it was Siyagah round 3 plus the five-suite cleanup.
- **Round 7's Rules package is on `main` (PR #457), NOT published.** `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules` adds folder `color`/`bold`/`sectionId` and new `noteSections`, `noteTags`, `noteTagLinks`; ADR-010 Amendment 1; the Owner's guide `docs/governance/2026-10-01-siyagah-round7-owner-publish-guide.md`. Proof: `npm run siyagah-round7` (75 cases; 8 mutations each caught by its own case; run mutants with `MUTANT=1 RULES_FILE=...`); the real-function suites are green against it. **The Owner publishes; when they say "Round 7 rules are live":** sync `firestore.rules` to the candidate (commit tag `[already-deployed-manually]`), flip the readiness gate(s) with a dated reference, re-run `rules-authorisation-executable`.
- **Landing drawers (decision 51, #465) are RELEASED as v09.29** (PR #467).
- **Bookmarks (#468) RELEASED as v09.30** (PR #470).
- **Owner 1 Oct late: N/A + Mastered, and the wheel's bottom numbers — RELEASED as v09.31.**
- **#472 known-word marks RELEASED as v09.33** (PR #473). Pre-existing on `main`, not fixed: `quran-word-progress-rendered` "opening a word reads both lanes and no more" (en/bn) sees an extra quranWordTotals read and the lanes twice.
- **Dictionary RELEASED as v09.34.** Bangla dictionary meanings stay off until AQS gives permission and a digital copy (letters: `docs/reports/2026-10-01-dictionary-permission-letters.md`). The Builder queue is empty.
- **Dictionary decisions answered by the Owner (1 Oct, late):** English = Quranic Arabic Corpus + Wiktionary (CC BY-SA, WbW fallback); Bangla = ask for written permission (option 1; the Owner said "draft me a letter"); Lane AND Hans Wehr (page-number link only); yes to drafting a Quran Foundation permission request. Letters drafted in `docs/reports/2026-10-01-dictionary-permission-letters.md`.
- **The Wheel drawer is ON STANDBY (Owner: "Standby for Landing page decision")**. Demo (https://claude.ai/artifact/EQAEavsgP1TFprRf8ZKQs4): the legend / Appearance / Units rows under one ⚙ Wheel button with three chips, and Read · Choose a Unit · Know Your Status above the bottom bar. Build it on their "go".
- **The Asmaul Husna poster template is being built** from the Owner's design and spec (1 Oct):
  - banner الأَسْمَاءُ الْحُسْنَى, Amiri;
  - a Classification box: Group · Dual · Act or Essence · Unique or Shared, filled only from the Name's own lists;
  - references from project data only (Al-Witr: Bukhari 6410, not the image's 7392).
  - **ON HOLD (decision 50): the Owner is not happy with the design; it must follow their image EXACTLY plus their modifications. Wait for their next fix before resuming.** Decisions 48 (Bukhari 6410 is fine for now) and 49 (Lord/God → Rabb/Allah always) apply when it resumes.
  - Its files (`app/js/asma-poster-template.js`, `tools/i18n-verify/asma-poster-template.mjs` 23/0) are built but untracked (listed in `.git/info/exclude` locally). Demo with the Owner: https://claude.ai/artifact/ToBqsf4h2f7ssYVgs5qzte. Open questions put to them: Bukhari 6410 vs 7392; "Lord/God" in descriptions vs spec 10.9; 33 canonical Names without a description; Arabic size vs the Classification box.
- **Pre-existing on `main`**: approach-short-names "My Status's wheel prints the 10 names" (69/1), not yet investigated.
- **Sandbox note:** a fresh container needs Playwright where the harness can find it: `mkdir -p /home/user/node_modules && ln -sf /opt/node-tools/node_modules/playwright /home/user/node_modules/ && ln -sf /opt/node-tools/node_modules/playwright-core /home/user/node_modules/`.

**A new session at this point:**
1. Writes its id into #159's Active line.
2. Reviews #465's PR when it opens (open it from `builder/issue-465-run-*` if the Builder did not).

## 1. What this session released (v09.07 → v09.17)

Each version's full account is in `CHANGELOG.md`.

| Version | What |
|---|---|
| v09.07 | Phone heading line *Mastery Wheel · Read \| Know Your Status*; a wheel slice opens its Track card |
| v09.08 | Read page from the Read list: **Note View · Track · Approach** buttons (Builder #419) |
| v09.09 | The Mushaf page number in Bangla |
| v09.10–11 | **Writing sheet** (Arabic writing practice on the real Mushaf page; decision 30); its toolbar can be hidden, and it stays usable when zoomed |
| v09.12 | Know Your Status in every unit (Builder #425 → PR #426) |
| v09.13 | Read list tab counts; ⤢ 36px and gold everywhere; Writing-sheet Hide on the top line; heading separators a line or a dot at random |
| v09.14 | **Take an Approach \| Record Your Progress \| Know Your Status** bar in the Read and Note views (Builder #428 → #430); **🔍 Search** in the banner; ✅ *Record Your Progress* title over the stage buttons (decisions 37–39) |
| v09.15 | **👤 My account** card + Back as "←" (Builder #432 → #433, Mapping My Journey and Import Notes); **Siyagah round 1, data layer** (Builder #434 → #435); **folder checks read past 100**, a live bug found by the Architect's first emulator run; Asma Explore: Names after Group, and the Name's poster in the wheel's space (decision 43) |
| v09.16 | **👤 My account on every page** (Builder #437 → #439); Study options: Save on the title line, Search first (decision 44); Writing sheet on a phone: title line + two rows, letter style a pick-list, pans left-right when zoomed (decision 45) |
| v09.17 | **Mapping My Journey opens as a pop-up folder tray**: draggable, 8 resize handles, full screen on a phone, Folders/Timeline/Path tabs (Siyagah round 2, Builder #440 → #442) |

**The emulator works in this sandbox now.** Run `cd tools/firestore-emulator &&
npm ci` once, then `npm run journey-map-real-function` etc. Java is present.
It ran against the real deployed Rules and found the 100-folder bug that no
stub suite could see. **Use it for every round that writes Firestore.**

## 2. The planned work, in order

### 2a. Siyagah folder and note pane: seven rounds (decisions 41, 42.1–42.7)
The Owner's handover is stored word for word at
`docs/reference/2026-09-30-siyagah-folder-and-note-pane-handover-v2.md`. The
Owner's answers are in the owner-decisions file, items 42.1–42.7:
- Trash/Restore only, never an erase (told honestly that trash takes a little
  storage).
- Folder numbers derived from position.
- Autosave: a local draft, then a revision after about 30 seconds idle and on
  every exit.
- Pop-ups only for the permanent Notes.
- **Tags only, no Note Types.**
- No inbox.
- The tray pops up over the current screen, with Timeline and Path as tabs.

The rounds:
1. ✅ **Data layer** (v09.15): `trashFolder`, `restoreFolder`, `restoreNote`,
   `loadOwnerTrash`, `copyNoteToFolder`, `moveNote`, `copyFolder`,
   `commitFolderBatch`.
2. ✅ **Folder tray pop-up** (v09.17, #442). The Mapping My Journey button opens
   the existing screen in a pop-up over the current page (`journey-map.html?embed=1`
   in a window): draggable, eight resize handles, a full-screen sheet below 600px, and
   Folders, Timeline and Path as tabs.
3. ✅ **Folder menus with round 1's functions** (v09.18, #443 → PR #447). Copy to… and Move to… for folders and
   notes; Delete goes to Trash, with the refusal message when the folder holds notes;
   a Trash view with Restore. Drag and drop per handover §2.2 if it fits.
4. **Note read mode**: a click on a note opens it with all its functions.
5. **Edit mode with autosave** (42.3).
6. **Single and Multi pop-ups** (42.4).
7. **Sections, folder colour/bold, and Tags.** These need a **Rules change**:
   `noteFolders`' `hasOnly` allows no `color`, `sectionId` or `bold`. That is an
   Owner Control Gate. Build the Rules package, prove it in the emulator, and
   write the Owner a click-by-click Firebase Console guide. **The Owner
   publishes it; never deploy.**

Facts that bind every round:
- List reads are capped at 100 by the Rules, so code must page (see
  `listAllActiveFoldersForOwner`).
- A status may change from retired back to active.
- `parentOneHopOk` uses `get()`.

### 2b. Asma ul Husna Name poster: waiting on the Owner's answer
- **The demo:** https://claude.ai/artifact/1ozA3sdfGYdgB3zUZCdihK (version 2,
  1 Oct). Its source is in the old session's scratchpad. To change it, read it
  back with the Artifact tool's `read`.
  - It follows the Owner's emerald-and-gold design.
  - It has a **Classification box** (Group · Dual · Act or Essence · Unique or
    Shared), three different logos, and every word is editable.
  - It has switches for the banner Arabic (الْأَسْمَاءُ الْحُسْنَى or
    أَسْمَاءُ اللَّهِ الْحُسْنَى) and the Arabic font (Amiri, Noto Naskh or
    Scheherazade).
- **Asked of the Owner, not yet answered:**
  1. Which banner wording and which font.
  2. Any changes to colours, sizes or wording.
  3. Keep the creative-motivations.com credit line?
  4. Keep the printed typos, or correct them?
- **After approval, the build:**
  - The poster becomes the default view in Explore → Asma ul Husna → one Name.
    Today `renderAsmaPosterHtml` draws it into `#asmaXPosterPanel`.
  - It is pre-filled from `docs/reference/2026-10-01-asma-poster-descriptions.json`:
    93 entries, 7 marked uncertain (Akram, Muqeet, Waahid, Haseeb, Naseer, Ilaah,
    Qawiyy).
  - The Classification values come from the Name's own lists.
  - Each Name's edits are saved. **Check what the Rules allow on the Asma Name
    documents before choosing the field.** A new field may be a Rules gate.
  - Newly entered Names get the same template.

### 2c. Cleanup (the Architect's own; no permission needed)
Four suites were already red on `main` before v09.15:
- `note-foundation-boundary` (the #286 import list);
- `dawah-boundary`, plus the wordpress and evernote emulator suites (the
  deployment candidate file comparison);
- `study-note-service` (its loader rewrite).

Read each one's failure text, fix the stale part in place, and record why.

## 3. Waiting on the Owner
1. The Asma poster demo answers (2b).
2. **The 29 proposed Approach short names** (from 28 Sep). Still unanswered.
3. Standing, only when they want them:
   - the `tenantSelect` truncation;
   - the six per-unit answers for the Mastery Wheel centre;
   - E1 (Firebase access for Rules deployment);
   - D14 timezone.

## 4. Things to tell the Owner to check, if they have not
- v09.14: the gold three-button bar under the Read view and the Note view's
  bar; 🔍 at the top right of the banner opens Study options with the cursor in
  the search box.
- v09.15: Home → 👤 My account on Mapping My Journey; the "←" on the
  Folders | Timeline | Path row; Explore → Asma ul Husna → pick one Name → its
  poster appears where the wheel was.
