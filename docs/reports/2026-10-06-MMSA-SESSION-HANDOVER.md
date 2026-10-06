# MMSA session handover: 6 Oct 2026

Written by the MMSA Architect, session `session_01E2WuXkwwjnGv5Ztb3qvxgd` (5–6 Oct 2026). It supersedes
`2026-10-05-MMSA-SESSION-HANDOVER.md`, which is kept as history. Sections 2 (how a round is started and reviewed)
and 3 (the sandbox lessons) of `2026-09-30-MMSA-SESSION-HANDOVER.md` still hold. Where two handovers disagree,
this one wins.

The prompt that starts the next session is `docs/governance/NEW-SESSION-PROMPT-2026-10-06.md`.

## 0. The exact pause point: start here

Read the live state yourself, because it moves on after this was written:
- `app/js/version.js` on `origin/main`;
- open pull requests;
- the "Active Architect session" line on #159.

**This session released v09.83 to v09.87** (PRs #588–#592):
- **v09.83**: note-pane port, round 2 (items 14–20):
  - Rename and Make a copy;
  - right-click or long-press the title to edit;
  - Copy section;
  - tag chips list their Notes;
  - Delete asks first;
  - Esc ends editing.
- **v09.84**, four of the Owner's messages (decision 71):
  - Bookmarks: 🔖 on each, the last-act time with a 🕘 show/hide switch, and ← Back.
  - The Bismillah is never named "Ayah".
  - 👥 family members on the Ayah, This page and Unit cards and the end-of-unit prompt.
- **v09.85**: note-pane round 3 (items 21–27):
  - fold all while editing;
  - folded previews;
  - ⧉ Multi, and ⇲ back into the pane;
  - Close all, Ctrl+Shift+X and Ctrl+Shift+P;
  - Details remembered;
  - side Contents in a wide window.
- **v09.86**: note-pane round 4 (items 28–33). **Part B is finished.**
  - toolbar groups on a narrow Note;
  - ⊘ no colour;
  - paste choices;
  - @ to link a Note;
  - table Σ and sort.
- **v09.87**: sign-up step 2 for "My family" (members with a year of birth), and an Age column on People. It was built to the demo `docs/reference/2026-10-05-family-members-signup-demo.html`, which the Owner had not answered. Decision 71's standing rule is "demo first, then my recommendation unless the Owner says otherwise".

**THE QUEUE NOW, in order** (decision 72 answered Part C and added the Dua job, 6 Oct):
1. **Dua module: resources first, build nothing.**
   - The Owner: "We want to build another module for DUA. Eventually it will be a separate app but will work integrated with MMSA always too. So, find what resources are avialable first and then I will give you more to add later."
   - Find the Dua collections and data sources there are: Hisn al-Muslim, the Qur'anic duas, the duas in the hadith collections, open datasets and APIs, audio. For each, write down what it covers, its languages (Arabic, English, Bangla), its format, and its **licence or permission**.
   - Also list what MMSA already has that a Dua module could reuse: the Qur'an data, the Hadith module, Asma ul Husna, bookmarks, records and the 👥 picker.
   - Report in a short page for the Owner and a file in `docs/reports/`. **Build nothing until the Owner adds more.** It is a module of MMSA (I2: modules never call each other) and may later become its own app.
2. **👥 where it is still missing.** The 5 Oct audit found two progress writes that still record only for the page's Student:
   - **Word Card levels**: WbW / Basic / Depth, and approve / return. See `runWordProgressAction` in `quranrevival.html` and `quran-word-progress-data.js`.
   - **Hadith "Studied"**: `hadith-study-actions.js`.
   - The Owner said "wherever progress is recorded". The Approach cards are done (v09.84); these two are the rest.
   - The Word Card also keeps word totals (`recordWordTotalDelta`) per person, so every ticked person needs their own total. Plan it before building.
3. **Part C, as answered (decision 72):**
   - **Build, without asking again:** 38 annotations, 39 heading status badges, 36 templates, 44 a full spreadsheet in tables, and 34, 37, 40, 45 (the "across devices" items).
   - **Not:** 41 and 42.
   - **Rules:** the items that store new data across devices (34, 36, 37, 40, 45, and 38/39 if they are stored outside the Note's own text) need Rules. Write ONE Rules candidate for all of them, give it to the Owner to publish (an Owner Control Gate), and build behind a readiness gate that says in words what is off until then. That is the pattern of `siyagah-flags-readiness.js`.
   - **35 pictures:** Firebase Storage now needs the paid (Blaze) plan. It has a no-cost allowance; the 6 Oct report gave approximate prices, and the current ones are to be read off firebase.google.com/pricing. Wait for the Owner's go before building it.
   - **43 link previews:** a static GitHub Pages app cannot fetch other websites' titles and pictures by itself. It needs a small server function (a Cloud Function, which also needs the Blaze plan) or a third-party preview service. Put the choice and its cost to the Owner before building.
4. Anything new the Owner sends joins the queue where it fits.

**Where things live** (this session's additions):
- `app/js/note-window.js`, the shared Note pane and windows:
  - round 2: `beginEdit`/`finishEdit`, `wirePress`, `renameNote`, `duplicateNote` (`host.copyNote`), `copySection`, `openTagNotes`, `showNoteIn`;
  - round 3: `foldAllEditing`, `.note-sec-peek`, `dockWindow`, `closeAllWindows`, `paintToc`, `jumpToSection`;
  - round 4: `TOOL_GROUPS`/`fitToolbar`, `removeSwatch`, `onEditPaste`/`finishPaste`, the @ list (`paintMention`), `tableMath`.
- `app/journey-map.html`: `copyWholeNote` and the Delete confirm (`deleteNoteFromPane` → `retireNoteFromPane`).
- `app/js/bookmark-nav.js`:
  - the 🔖 rows and times, the 🕘 toggle (`mmsa.bookmarkMenu.showTimes`);
  - `noteBookmarkOpened`, which stamps `usedAt.<id>` through `markBookmarkUsed` in `bookmarks.js`;
  - `mountBookmarkBack` (sessionStorage `mmsa.bookmarkReturn`).
- `app/quranrevival.html`:
  - Bismillah naming: `isUnnumberedBismillah`, `ayahNameFor`, `ayahShortRefFor`;
  - the 👥 picker: `claimForIds`, `claimTargetIds`, `mountClaimForPicker`, `claimApproachStatusFor`.
- `app/onboarding.html` (`openFamilyStep`) and `app/js/people.js` (`birthYear`, `validBirthYear`, `ageFromBirthYear`).

**New suites this session**, each with mutation flags and each mutation caught:
- note-pane rounds: journey-note-actions-browser, journey-note-folds-windows-browser, journey-editor-input-browser;
- v09.84: bookmark-marks-back-browser, bismillah-label-browser, claim-for-family-browser;
- v09.87: family-signup-browser.

**Regression set for note-pane rounds**: the 5 Oct list, plus the three note-pane suites above.

## 1. What waits on the Owner (one line per report)

1. **Part C**: answered 6 Oct (decision 72). Waiting: 35 (pictures) on the cost, 43 (link previews) on the way to fetch, and publishing the Part C Rules candidate when it is written.
2. **The family demo**: built as v09.87. Ask whether it is what they wanted.
3. **"What I really wanted" for the Ayah**: the Owner will say.
4. **The two dictionary permission letters**: "Later. Keep reminding."
5. **The Asmaul Husna poster**: on hold (decision 50).

## 2. Things this session learned (keep)

- **Never `pkill -f` or `pgrep -f` a name that is in your own command line.** A `pgrep -f "mut3.sh"` matched the shell running it and killed the turn (exit 144). Stop processes by PID. Anchor the pattern on the process's own start (`^node tools/i18n-verify`, `^/bin/sh /tmp/...`), or read `/proc/<pid>/cmdline`.
- **Editing a served file while a suite runs makes that run's results worthless.** Either wait, or build in a `git worktree` served by a second `serve.js` on port 8081:
  - `sed` the port in its `serve.js` and `BASE` in its `tools/i18n-verify/harness.mjs`;
  - never commit those two edits;
  - bring the work back with `git diff | git apply -3`.
- **The local `main` branch in this clone is stale** (it was cloned shallow). A suite that compares geometry against `main` (wheel-centre-browser) must run with `BASELINE_REF=origin/main`. If brief-integrity or the ledger report "not an ancestor of origin/main" on `main`, run `git fetch --unshallow origin` first.
- **A check that ends `|| true` is not a check.** Made real, the "⧉ on the bar" check found that the new button pushed 🔍 off the bar. ⧉ now folds first.
- **A new line under a section duplicates its text for Find.** The folded-section preview made Find count every hit twice. Find skips `.note-sec-peek`.
- **A floating button covers what is at the bottom of the screen.** ← Back first sat over the Qur'an page's tab bar. It now lifts itself above any fixed bar it finds at the bottom.
- **A control inserted between a title and its buttons breaks a spacing rule tied to "title + buttons".** The 👥 picker shares the title's line, and `.claim-for-line + .approach-stage-row` keeps the 0.1rem gap that `.gac-record-title + .approach-stage-row` had.
- **Bangla digits**: any count put into a sentence goes through `num()`. The family step first said "2 জন".
