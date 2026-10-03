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

**Updated 3 Oct 2026, ~16:40 UTC (v09.58 released: Word card round 7, the PC boxes, so the seven-round rebuild is COMPLETE; the next job is the Needs-a-source lines; no Builder round is running and no check-in is scheduled), by session `session_01BRPbcWQzkbfVcsLgZFpEsJ`** (the Active Architect on #159 since 03:12 UTC). **This session is long: a new session should take over from here.**

- **`main` is at v09.58.** Released today (v09.58 = round 7, the PC boxes: two columns from a 62rem card, the Word card window's first size up to 1120px via `initPopupWindow` `defaultMaxWidth`; suite `word-card-pc-boxes-browser`):
  - **v09.48–v09.54:** Word card rounds 1–6 (data, WbW, Basic, Depth, Verb Conjugation, Search), plus v09.51 Mark words (decision 60).
  - **v09.55:** the Approach list shows each Approach's progress as a dot in its stage colour. It uses `openApproachList()` in `ayah-action-sheet.js`.
  - **v09.56:** the tablet landing (581–720px). The wheel takes the screen's width and its six buttons sit in the corners. It uses `tabletWheelLayout()` in `quranrevival.html`, with the suite `tablet-wheel-browser`.
  - **v09.57:** Practising is the Word card's 4th stage (code `p`, never known), and every pressed stage button takes its `STATUS_COLORS` colour (#520).
- **Word card round 7 (#525) is done: v09.58.** Nothing is in flight.
  - **Review it the same way:** a local branch merging `origin/main`, suites run from the repo root, screenshots beside the demo, one mutation, then allocate the version, merge, reset `claude/adoring-edison-cm28vf`, and run the 3 governance checks.
- **Next job: the "Needs a source" lines (decision 61).**
  - The sources and their licences are in `docs/reports/2026-10-03-needs-a-source-candidates.md`:
    - **the QAC syntax treebank:** GPL, 42% of words; use it for sentence iʿrāb where covered, and keep "needs a source" elsewhere;
    - **OpenITI al-Furūq:** near-synonym distinctions;
    - **OpenITI al-Mufradāt:** classical meanings, with page numbers from the Dāwūdī edition.
  - The OpenITI files are CC BY-NC-SA 4.0: credit Romanov & Seydi, doi:10.5281/zenodo.3082463, and the edition. They are non-commercial and share-alike, which suits this free app.
  - **`irab.tsv`: no named source. Do not use.**
  - **The order of work:** the Architect builds the data files first (a script under `tools/quran-data-pull/`, output loaded on demand), then a Builder round for the UI.
- **Red on `main` before today, to fix separately (one small round):**
  - approach-short-names 69/1 ("My Status's wheel prints the 10 names");
  - `quran-word-card.mjs` (a /سمو/ expectation);
  - ayah-action-sheet-boundary 52/2;
  - the āyah picker's "Bismillah" cut at desktop widths (panel.mjs).
- **Lessons from today:**
  1. **A suite that reads files from the working tree is spoiled by switching branches mid-run.** Do side edits in a `git worktree`.
  2. **`git checkout -B <branch>` resets a branch that has commits on it.** One commit was recovered from `git reflog show <branch>`.
  3. **Adding an attribute to `<option>` broke `withSelectedOption()`**, which matched the option text literally. The existing suites caught it.
  4. **A Builder suite that runs long must be run per language.** The combined run can hit the time limit with no total printed.
  5. **The Builder often cannot open its PR (401).** The Architect opens it from the branch.
- **Sandbox:**
  - `serve.js` dies when the container restarts; check `curl localhost:8080` first.
  - Link Playwright before the browser suites: `mkdir -p /home/user/node_modules && ln -sf /opt/node-tools/node_modules/playwright /home/user/node_modules/ && ln -sf /opt/node-tools/node_modules/playwright-core /home/user/node_modules/`.
  - `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- **Never put the Builder's mention phrase in an issue body.**

## 1. What waits on the Owner (one line per report)

Items 1–3 were answered on 3 Oct (decision 61): the Basic order is kept, the part names and Form sentences are accepted, and the "Needs a source" lines are to be built (see section 0).

4. **The two dictionary permission letters**
   (`docs/reports/2026-10-01-dictionary-permission-letters.md`): **"Later. Keep reminding."** The Bangla dictionary meanings wait with them (there is no digital copy).
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
