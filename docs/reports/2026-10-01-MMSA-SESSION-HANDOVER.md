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

**Updated 1 Oct 2026, ~07:50 UTC, by session `session_01M4Sbc1h94F7SgErzAzxq9n`:**
- **`main` is at v09.19**, built by the Architect:
  - decision 46 (option C): the two Mastery Wheel titles on the heading line, and Read / Choose a Unit / Know Your Status as one row under the wheel;
  - decision 47: Record Your Progress always on the Āyah card.
- v09.18 before it was Siyagah round 3 plus the five-suite cleanup.
- **PR #448 (Siyagah round 4, note read pane) is open and being reviewed**; it becomes v09.20.
- **The Asmaul Husna poster template is being built** from the Owner's design and spec (1 Oct):
  - banner الأَسْمَاءُ الْحُسْنَى, Amiri;
  - a Classification box: Group · Dual · Act or Essence · Unique or Shared, filled only from the Name's own lists;
  - references from project data only (Al-Witr: Bukhari 6410, not the image's 7392).
  - Its files (`app/js/asma-poster-template.js` and its suite) are untracked work in progress; a demo goes to the Owner before it is wired into Explore.
- **Pre-existing on `main`**: approach-short-names "My Status's wheel prints the 10 names" (69/1), not yet investigated.
- **Sandbox note:** a fresh container needs Playwright where the harness can find it: `mkdir -p /home/user/node_modules && ln -sf /opt/node-tools/node_modules/playwright /home/user/node_modules/ && ln -sf /opt/node-tools/node_modules/playwright-core /home/user/node_modules/`.

**A new session at this point:**
1. Writes its id into #159's Active line.
2. Reviews PR #448 (round 4) if still open. The review:
   - run `journey-note-pane-browser`, `journey-folder-menus-browser` and the neighbours, plus the emulator suites;
   - look at the pane at 390px Bangla, 820px and 1280px English;
   - mutation-prove one check;
   - allocate **v09.20**.
3. Writes and dispatches round 5 (edit mode with autosave, decision 42.3, handover §4.4).

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
