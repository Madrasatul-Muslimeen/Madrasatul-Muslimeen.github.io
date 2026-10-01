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

**When this was written (1 Oct 2026, 01:10 UTC):**
- **`main` is at v09.15.**
- **The Builder is running #437**: run 692, dispatched 00:58 UTC on v09.15.
  The job is 👤 My account on the other 23 pages (Owner decision 40, round 2 of 2):
  - **Tenant** moves into the account card on every page.
  - **Person** moves only on notes, records, monitor, bookmarks, homework and
    course-offers.
  - The **Student/Person pickers on the study pages and in Quran Study
    options stay where they are.** That is D10's fast "log for each child in
    turn" control. Only Quran's tenant ("User Role") picker moves.
- **A review check-in is armed** (`trig_01BieAzafAe8SX1rQgJwdvtA`, 02:04 UTC). It
  fires into the old session only, and does nothing unless #159's Active line
  still names that session.

**Recommended change-over point:** right after #437 is merged as v09.16 and
Siyagah round 2 has been dispatched. The old session will say so to the Owner
when it gets there. A new session starting then has one Builder round to
review and nothing half-done of its own.

**What the new session does first, by case:**
- **#437 still open** (you started early): write your id into #159's Active line
  first. That disarms the old check-in. Then do the review it describes:
  1. Merge `origin/main` into `builder/issue-437-run-*` locally and check for
     deletions (especially `bn.js` and `CHANGELOG.md`).
  2. Run `account-card-browser`, `phone-width-overflow`, `journey-map-screen`,
     `head-search-browser`, `behaviour` and the 8 governance suites.
  3. Look at notes and quranrevival (Study options open) at 390px in Bangla and
     1280px in English.
  4. Mutation-prove one check.
  5. Allocate **v09.16**, merge, update #159 and report.
  6. Then dispatch Siyagah round 2.
- **#437 merged and Siyagah round 2 running:** take over #159 and schedule its
  review about 70 minutes after its dispatch time.

## 1. What this session released (v09.07 → v09.15)

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

**The emulator works in this sandbox now.** Run `cd tools/firestore-emulator &&
npm ci` once, then `npm run journey-map-real-function` etc. Java is present.
It ran against the real deployed Rules and found the 100-folder bug that no
stub suite could see. **Use it for every round that writes Firestore.**

## 2. The planned work, in order

### 2a. Siyagah folder and note pane: six rounds (decisions 41, 42.1–42.7)
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
2. **Folder tray pop-up.** The Mapping My Journey button opens it over the
   current screen:
   - draggable, and resizable from every side and corner;
   - a full-screen sheet on a phone;
   - Folders, Timeline and Path as tabs;
   - every folder function from the handover, using round 1's functions.
   Write the issue from the handover's folder section and dispatch it after #437.
3. **Note read mode**: a click on a note opens it with all its functions.
4. **Edit mode with autosave** (42.3).
5. **Single and Multi pop-ups** (42.4).
6. **Sections, folder colour/bold, and Tags.** These need a **Rules change**:
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
