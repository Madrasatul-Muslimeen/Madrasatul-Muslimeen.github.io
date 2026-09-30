# MMSA session handover — 30 Sep 2026

Written by the MMSA Architect at the end of the session that ran from 28 Sep
to 30 Sep 2026. **This supersedes `2026-09-28-MMSA-SESSION-HANDOVER.md`**, whose
Builder queue (#342 → #348 → #349 → #352 → #354) was finished long ago. That
file is kept as history. Where the two disagree, this one wins.

The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-09-30.md`.

## 0. The exact pause point — start here

- **`main` is at v09.05** (read it off `app/js/version.js` on `origin/main`;
  do not trust this line if they differ).
- **The Builder queue is EMPTY.** The last round, #410 (named presets, PR #413),
  was reviewed and merged as v09.05.
- **The Owner has one live demo to answer**:
  **Simple Mushaf Reader**, <https://claude.ai/artifact/V85N34YWdBJUk9M1StyaCf>.
  Their request (30 Sep): *"How about making it simple for a regular user? …
  see the regular Mushaf structure contents in columns like: Surah Number,
  Surah Name in English with meaning, Verse Numbers, and Surah Name in Arabic
  … they can choose a Surah, page, Juzz, Hijb, Ruku, it brings the Mushaf view.
  They just read it as traditional reading. Nothing fancy. In there we place the
  option to open it in Note View / Track and Approach. Show me demo what you
  understood."*
  The demo embeds the real Qur'an text and all five lists. Three questions were
  put to them and are **unanswered**:
  1. Is this the idea?
  2. Where does it live: the first screen of Quran Study, or a *Read* button
     beside the Mastery Wheel?
  3. Should the list carry Bangla surah meanings? The app's data has only
     English (`nameTranslation` in `surah-index.json`), so Bangla means adding
     data.
  **When they answer, write it up as one Builder issue and dispatch it.** Do not
  build it before they answer: placement is a product choice (Owner Control
  Gate).
- **No check-ins are scheduled.** Nothing is running.

## 1. Where `main` is, and how it got there this session

| Version | What | Who |
|---|---|---|
| v08.115–v08.117 | Word Card derived-form meanings; Catalogue sections collapsible and draggable; landing sections collapsed with a count | Builder + Architect |
| v09.00 | **Deliberately unused** (Owner decision 26) | — |
| v09.01 | The v09 line opens; `legacy-v08/` archive (app as released at v08.103, commit 54f93098); Home menu links *Legacy App - v08* on 26 pages | Architect |
| v09.02 | Landing section headings: S1… badge, count in a square box at the end, gold name (#407, PR #408); Architect fixed the Light-look *Open all* button (1.45:1) | Builder + Architect |
| v09.03 | Hollow S ring vs filled Approach disc; **"My Status" renamed "Know Your Status"** everywhere (Bangla আপনার অবস্থা জানুন) and styled as heading text on phones; Word Card Basic Arabic shows *Derived forms* above the counts; `explore-hizb-view-browser` fixed (stale since v08.105's rings) | Architect |
| v09.04 | Study options: **Play opens the chosen view; new Read button** (#409, PR #411) | Builder |
| v09.05 | Study options: **named presets** (#410, PR #413) | Builder |

`firestore.rules` is unchanged this session. Nothing was deployed to Firestore.

## 2. The Builder: how to start and review a round

Everything in the 28 Sep handover's section 3 still holds. The short version,
plus what changed:

- **Start a round with `workflow_dispatch` only**: `actions_run_trigger`,
  `run_workflow`, workflow `claude.yml`, ref `main`, inputs
  `{ issue_number, note }`. Never by comment: `claude.yml` refuses a comment
  carrying the Claude Code footer, and those runs show as *skipped*.
- **One round at a time** (concurrency group `mmsa-builder`). A second dispatch
  queues.
- **The Builder now opens a PR reliably** (#408, #411, #413 all did). Find it
  with `list_pull_requests`; its branch is `builder/issue-<N>-run-<run>`. If
  there is no PR, `git ls-remote origin 'refs/heads/builder/issue-<N>*'`.
- Put in the dispatch `note`: the current `main` version, anything the issue
  text gets wrong (e.g. #410's body said #408 where it meant #409), and "push
  early, open the PR ready for review, paste every check total, never bump
  `version.js`".
- **Review on a local branch that merges `origin/main` into the Builder's
  branch.** Run its new suite, the neighbouring suites, `phone-width-overflow`,
  `behaviour.mjs`, and for a Study-options change `panel.mjs` and `navcheck.mjs`.
  **Look at screenshots yourself**, at 320px in Bangla and 390/1280px in
  English, with real-length content. This session's reviews found real defects
  only by looking (the Light *Open all* button at 1.45:1).
- **Allocate** with `tools/governance/allocate-version.py VER NEXT SHORT NOTE
  MILESTONE CHANGELOG`, called from a python script file in the scratchpad
  (the milestone and changelog texts are too long for a shell line). Commit,
  push to the Builder's branch, merge the PR with `expectedHeadSha`, then
  `git checkout -B claude/<session-branch> origin/main`, force-push, and run
  `brief-integrity`, `programme-ledger`, `programme-ledger-mutations` on `main`.
  **Before the merge those three fail by design** (they read `origin/main`).

## 3. Running the checks in this sandbox — lessons from this session

- **A fresh container has no test server.** Start `node serve.js` (port 8080)
  from the repository root before any browser suite; a suite run without it
  dies with a bare `page.waitForFunction` timeout that looks like an app fault.
- `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- **Never write a wait loop as `while pgrep -f "<suite name>"`.** The loop's
  own shell command line contains that name, so it matches itself and never
  ends. This cost two stuck background jobs on 30 Sep. Wait on a PID, or on
  the output file.
- `quran-word-card-form-meaning-browser` takes 15–20 minutes (6 widths × 2
  languages × every word). Give it `timeout 1500` in the background; a shorter
  timeout reads as "Target page closed" and is not a failure.
- A suite that dies on unchanged `main` is not yours: run it on `git stash`
  before believing it. `explore-hizb-view-browser` had died since v08.105
  (it counted 30 slices where the rings draw 144); fixed in v09.03.
- `card-look-browser` once gave 94/2 and then 96/0 on three reruns of the same
  code. Cause not found. If it recurs, read the two failing names.
- Baselines: `behaviour.mjs` 1003/4 (22g×3 archive.org, intermittent; 31e TLS),
  `phone-width-overflow` 217/0, `quran-word-card-rendered` 134/2 (TLS).
  `behaviour.mjs` sometimes shows 1006/1 or 1007/0 when 22g passes.
- Mutation-prove every new check by putting the old code back
  (`git show origin/main:<file> > <file>`), running, and restoring. Read the
  exit code and the failure text, never a grep: `quran-word-card.mjs` stops at
  its first failure with exit 1 and prints no summary line.

## 4. Waiting on the Owner

1. **The Simple Mushaf Reader demo** (section 0): three questions.
2. **The 29 proposed Approach short names**, carried from the 28 Sep session.
   Still unanswered.
3. From earlier, still standing: `tenantSelect` truncation (an Owner UI
   decision), the six per-unit answers for the Mastery Wheel centre, E1
   (Firebase access) for Rules deployment.

## 5. Things to tell the Owner to check, if they have not

- v09.03: hollow S rings; *Know Your Status* on the heading line on a phone;
  Word Card → Basic Arabic shows Derived forms first.
- v09.04: Study → Options → choose a unit → **Read** opens it; **Play** opens it
  and plays.
- v09.05: Study → Options → **☆ Save these settings**, name it, then change
  something and tap the chip to get it back; the same presets appear in the
  Bookmark menu under *Saved settings*.
