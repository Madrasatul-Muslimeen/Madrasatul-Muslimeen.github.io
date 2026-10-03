# MMSA session handover: 3 Oct 2026

Written by the MMSA Architect, session `session_01M4Sbc1h94F7SgErzAzxq9n`
(1–3 Oct 2026), at the Owner's request to change sessions before the Word card
build. **This supersedes `2026-10-01-MMSA-SESSION-HANDOVER.md`**, which is kept
as history (its section 0 has the v09.29–v09.47 detail).

Sections 2 (how a round is started and reviewed) and 3 (the sandbox lessons) of
`2026-09-30-MMSA-SESSION-HANDOVER.md` still hold. Where any two handovers
disagree, this one wins.

The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-03.md`.

## 0. The exact pause point: start here

Read the live state yourself, because it moves on after this was written:
- `app/js/version.js` on `origin/main`;
- open PRs;
- `claude.yml` runs;
- the "Active Architect session" line on #159.

**Updated 3 Oct 2026, ~13:00 UTC, by session `session_01BRPbcWQzkbfVcsLgZFpEsJ`** (the Active Architect on #159 since 03:12 UTC):

- **`main` is at v09.54.**
  - The Word card rebuild has 6 of 7 rounds done:
    - **v09.48:** data;
    - **v09.49:** WbW and header;
    - **v09.50:** Basic;
    - **v09.52:** Depth, with Naḥw corrected in review;
    - **v09.53:** Verb Conjugation (#515), on the engine `app/js/verb-conjugation.js`;
    - **v09.54:** Search 🔍 (#518), using `word-card-search.js` and `word-forms-index.json`.
  - **v09.51:** Mark words (decision 60).
- **In flight:**
  - **#520, with the Builder (dispatched ~12:10 UTC):** Practising as a 4th Word card stage at all levels (stored code `p`, never counted as known). It also covers every pressed stage button across the app, coloured by `stageColourStyle()` (`ayah-action-sheet.js`, `STATUS_COLORS`). These are the Owner's two messages of 3 Oct. No Rules change is needed: `quranWordProgress` checks no state values. A review check-in fires ~13:30 UTC.
  - **Branch `approach-list-dots`, built by the Architect, awaiting release as the next version:** the Approach pull-down on the Ayah card and the This page card opens the app's own list. Each Approach with progress gets a solid dot in its stage colour (`openApproachList()` in `ayah-action-sheet.js`; suite `approach-list-dots-browser` 66/0). The demo was https://claude.ai/artifact/5EebZvH59XThuJjuqYxALJ. The colours were changed to `STATUS_COLORS` so they match the stage buttons.
    - **Lesson:** `withSelectedOption()` matched `<option value="id">` literally, so adding an attribute broke the chosen Approach. It now matches any attributes.
    - **Lesson:** switching branches while a suite runs spoils the run. Use a `git worktree` for side edits.
  - **Round 7 (PC boxes):** the issue is drafted in the scratchpad (`issue-r7.md`). Update it for 4 stage buttons and their colours, then dispatch after #520.
  - **Tablet wheel demo**, for the Owner (https://claude.ai/artifact/EMZKfW6LKkxhFyoLpgE8Dh): at about 600px wide, the three gold buttons go to the corners, Wheel / Legend / Unit to the top-left, and one resize grip. The wheel grows from 533 to 587px. **Waits on the Owner's "go".**
- **Decision 61:** the part names and Form sentences are accepted, the Basic order is kept, the "Needs a source" lines are to be built, and the letters come later (keep reminding).
  - The candidate sources for those lines are in `docs/reports/2026-10-03-needs-a-source-candidates.md`:
    - **the QAC syntax treebank:** GPL, 42% of words, surahs 1–9 (part) and 59–114;
    - **OpenITI al-Furūq and al-Mufradāt:** CC BY-NC-SA 4.0 transcriptions of modern editions, credited, non-commercial, share-alike;
    - **`irab.tsv`:** no named source, so **do not use**.
  - **Not built yet.** Data first, by the Architect, then a Builder round for the UI.
- **Pre-existing, to fix separately:**
  - the āyah picker's "Bismillah" cut at desktop (panel.mjs);
  - `ayah-action-sheet-boundary` 52/2, the same on `main`.
- **How a review is done here:**
  1. Merge `origin/main` into a local branch.
  2. Run the suites into a log with their exit codes, from the repo root; check `curl localhost:8080` first.
  3. Screenshot section by section beside the demo, and LOOK.
  4. Check Arabic by hand.
  5. Mutation-prove one check.
  6. Push to the Builder branch, and open the PR if the Builder could not (401).
  7. Run `allocate-version.py` from a scratchpad script.
  8. Merge with `expectedHeadSha`.
  9. Reset `claude/adoring-edison-cm28vf`.
  10. Run the three governance checks. Before a merge, brief-integrity and ledger-mutations fail by design.
- **Sandbox:**
  - `serve.js` dies on container restart.
  - Link Playwright first: `mkdir -p /home/user/node_modules && ln -sf /opt/node-tools/node_modules/playwright /home/user/node_modules/ && ln -sf /opt/node-tools/node_modules/playwright-core /home/user/node_modules/`.
- **Never put the Builder's mention phrase in an issue body.**

## 1. What waits on the Owner (one line per report)

1. **The order of Basic's derived forms.** The Owner will give it. Until then use
   the demo's suggested order (spec §1).
2. **One sentence per verb Form (I–X) and the Arabic part-name table.** Write them
   in round 1 and show the Owner once for review.
3. **Sources** for the Depth lines marked "Needs a source": an iʿrāb book,
   near-synonym distinctions, classical quotations, the al-Mufradāt page index.
   Only when the Owner wants them.
4. **The two dictionary permission letters**
   (`docs/reports/2026-10-01-dictionary-permission-letters.md`).
5. **The Asmaul Husna poster**: on hold until the Owner sends their fixes
   (decision 50).
6. Only when they want them:
   - the stored-total recount question (A or B);
   - the Wheel drawer standby;
   - the tenant-name picker cut off at narrow widths;
   - the Mastery Wheel centre answers;
   - D14 timezone.

## 2. Things this session learned (keep)

- **The full Corpus file is in reach.** `curl` can fetch
  `https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt`
  from the sandbox (6.3 MB, GPL). `grep "^(2:102:35:"` shows the features the
  build needs.
- **A permission check refused syncing `firestore.rules` on the one-word message
  "published".** It allowed the sync once the Owner wrote "Basic and Depth rules
  are live". Ask for that explicit sentence before any switch-on.
- **When a gate opens, checks written while it was shut go red for the right
  reason.** Update each in place, with the reason recorded (v09.47 did three). The
  gate-off case must then route a CLOSED copy of the readiness module, as
  `journey-tags-browser` and `lemma-levels-browser` do.
- **An emulator loader that inlines modules must be told about every new import.**
  `lemma-progress-real-function` had silently stopped loading from #492 until
  v09.47.
- **Screenshots of the demo caught four real defects before publishing:**
  - invisible table text;
  - the word under the 🔍 button at phone width;
  - a class name (`.s`) colliding with another rule;
  - a label printed backwards in a right-to-left cell.

  Look at every screenshot.
