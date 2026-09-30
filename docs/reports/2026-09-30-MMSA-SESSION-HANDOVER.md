# MMSA session handover — 30 Sep 2026

Written by the MMSA Architect at the end of the session that ran from 28 Sep
to 30 Sep 2026. **This supersedes `2026-09-28-MMSA-SESSION-HANDOVER.md`**, whose
Builder queue (#342 → #348 → #349 → #352 → #354) was finished long ago. That
file is kept as history. Where the two disagree, this one wins.

The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-09-30.md`.

## 0. The exact pause point — start here

- **`main` is at v09.06** (read it off `app/js/version.js` on `origin/main`;
  do not trust this line if they differ).
- **The Builder queue is EMPTY.** The last round, #415 (the landing Read button
  and contents list, PR #416), was reviewed, reworked by the Architect as
  below, and merged as v09.06.
- **Nothing is running and no check-ins are scheduled.**
- **THE NEXT JOB — START IT WITHOUT WAITING.** The Owner, 30 Sep 2026:
  *"don't make it wait for me to ask, whatever you supposed to do, make it
  continue."* So the next session starts the work below itself and tells the
  Owner what it is doing; it does not ask first.
  **The job: a few simple buttons in the Read view for a reader who came in
  through the new Read contents list.** The Owner, 30 Sep: *"we will later
  make a few simple buttons for these readers to read view (like your demo)"*
  and *"reader will eventually come to original read and we want them to move
  from there to other choices through other buttons."* The demo's row is
  **Note View · Track · Approach**
  (<https://claude.ai/artifact/V85N34YWdBJUk9M1StyaCf>).
  **The order of work:**
  1. Read how the Read view already reaches Note View, Track and Approach
     (its bars, `setImmersive`, `openReadingScreen()`), and measure the
     immersive Mushaf screen on a phone.
  2. Build a demo artifact of the proposal with the app's real look, and send
     the Owner the link: a plain row of those three buttons, shown when the Read
     view was opened from the contents list. Choose the placement you
     recommend, and say why in one line.
  3. **Without waiting for an answer**, write one Builder issue with that
     placement and dispatch it. The buttons must reuse the existing routes
     (never a second Note View, tracker or Approach picker), start no audio,
     and write nothing on their own.
  4. If the Owner answers the demo while the round runs, adjust in review.
  Placement is still the Owner's to change: say plainly in the report what
  was chosen, so they can.

### How #415 ended up (so nobody undoes it)
- **Decision A (Owner):** the contents list opens the EXISTING Read view as a
  full-screen Mushaf page (unit pickers + Mushaf tick + `openReadingScreen()`).
  There is no second reader. The Study menu's own **Read** stays: *"Keep it
  read in both places"*.
- **Placement (Owner: "put Read beside Know Your Status on mobile", then "fix
  the tablet wrap too"), all measured:**
  - below **520px**: heading line reads *Mastery Wheel … Read  Know Your
    Status*, both links in the heading's own face (`#readHeadBtn`,
    `#myStatusBtn`); capsule row = 2;
  - **520–899px**: heading line has *Read* at the right edge; capsule row = the
    3 the Owner approved (Approach, Choose a Unit, Know Your Status);
  - **900px and up**: the wheel is a window whose title bar replaces the
    heading, so Read is the 4th capsule (`#readContentsBtn`); band text 0.7rem
    at 900–999px so all four keep one 36px line.
  - Why: four capsules do not fit in English until ~1000px, and three do not
    fit below 510px. `read-contents-browser.mjs` checks every band at 17
    widths in both languages, including "the capsule row is one 36px line".
- **Bangla surah meanings** came from api.quran.com via
  `tools/quran-data-pull/build-surah-names-bn.js` (additive
  `nameTranslationBn` in `surah-index.json`; every existing field identical).
  The Builder's run could not reach the API; the Architect's sandbox could.
  **Never hand-write them.**

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
| v09.06 | **Read button + contents list** (Surah/Juz/Hizb/Page/Ruku') opening the existing Read view as a Mushaf page; Bangla surah meanings; Read beside Know Your Status on phones; tablet capsule wrap fixed (#415, PR #416) | Builder + Architect |

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
- **To stop test runs, match only real test processes**: `pgrep -f "^node
  tools/i18n-verify"`. A pattern without `^` also matches the `bash -c` line of
  your own command and kills your shell (exit 144). A `for` loop of suites
  keeps going after its child is killed; stop the loop's `bash` parent
  (`ps -o ppid= -p <pid>`).
- **The Builder often cannot reach outside websites** (its `curl` needs an
  approval nobody gives). If a round needs external data, the Architect can
  usually fetch it from this sandbox, from a checked-in, re-runnable script.
- **Show the Owner a demo before building anything new.** An HTML artifact with
  the app's real data (e.g. the whole Qur'an text, ~1.4 MB) answered "is this
  what you mean" in one step; `[hidden]` still needs its `display:none
  !important` override inside the demo.
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

1. **The simple Read-view buttons** (section 0): being built without waiting, per the Owner; they may still change the placement from the demo.
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
- v09.06: on a phone the heading line shows *Read* beside *Know Your Status*;
  tap **Read**, pick a surah, page, Juz, Hizb or Ruku' and the Mushaf opens
  there; in Bangla the list shows Bangla meanings.
- v09.05: Study → Options → **☆ Save these settings**, name it, then change
  something and tap the chip to get it back; the same presets appear in the
  Bookmark menu under *Saved settings*.
