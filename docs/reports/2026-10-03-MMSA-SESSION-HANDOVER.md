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

**Updated 4 Oct 2026, ~10:20 UTC, by session `session_012katd3VGiJEprbqxSEUTbf` (Active Architect on #159). Supersedes the ~05:30 paragraph below.**

- **`main` is at v09.68.** Since v09.64:
  - **v09.65:** S8, Mapping My Journey in three panels (PR #554).
  - **v09.66:** first screen B and the light from the Qur'an (decisions 65, 67; PR #550). Review fixes: beams start on the pages (`--mutate-sunrise`); the pill's name wraps, the pill is 80% wide below a 140px hub, and the unit alone shows when the full name would crowd out the Qur'an.
  - **v09.67:** S9, menus by right-click / long-press, drag a Note onto a folder (desktop width only), recursive collapse, tag search, depth guard 64 (ADR-010 updated) (PR #556). **Not built:** a folder's own window (a new kind of window; needs a demo).
  - **v09.68:** S10, the folder picker with tick boxes (PR #558).
- **In flight:** **#559, S11 (reading tools)**, Builder dispatched ~10:20 UTC. Then S12 (editor), S13 (pop-up windows), S14 (flags and Note links, needs Rules the Owner publishes).
- **Lessons:**
  - **Read the Builder's PR body before writing the release notes.** S9's said "Open in its own window — NOT built"; the first draft of v09.67's notes claimed it, and was corrected before the merge.
  - **Never `pkill -f`**, even for `serve.js`: it was done once today (harmless, but against the rule). Stop servers by PID.
  - The Builder often opens no PR (S10); open it from the branch.

**Updated 4 Oct 2026, ~05:30 UTC, by session `session_012katd3VGiJEprbqxSEUTbf` (Active Architect on #159). Supersedes the ~02:45 paragraph below.**

- **`main` is at v09.64** (PR #552): **Choose a Unit** ends with **Read** and **Play** and stays open while choosing (decision 64, #547). Suite `wheel-unit-go-browser` 254/0.
- **In flight:**
  - **#549, first screen B and the Qur'an's light** (decision 65). Built on `builder/issue-549-run-844` (commit 5265ebdb); no PR yet. Review: merge `origin/main` in, check seven stars, Bright, first screen B, no overlap with the Study Quran button.
  - **The light, waiting on the Owner:** they asked that the light come **from the Qur'an, not a sun**. Demo v14 (artifact WxBk4PJ2vRNawVmyBgmaN7; scratchpad source made by `genpage.mjs`) adds design **6 · Light from the Qur'an**: beams rising along both pages' top edges, the pages glowing, the seven stars kept. If chosen, apply it in #549's review and copy the demo to `docs/reference/`.
  - **#551, S8** (decision 66): Mapping My Journey in three panels. Builder dispatched 4 Oct ~04:30 UTC. S9–S14 follow (the plan is in the folder demo, artifact JsJ4kHTXLUcmS4DVY9GbRw).
- **Lesson:** a local `main` ref goes stale; `wheel-centre-browser` compares against `BASELINE_REF` (default `main`), so run it with `BASELINE_REF=origin/main` after a fetch, or it reports a false wheel-size change.

**Updated 4 Oct 2026, ~02:45 UTC, by session `session_012katd3VGiJEprbqxSEUTbf` (Active Architect on #159). Supersedes the ~21:15 paragraph below.**

- **`main` is at v09.63.** Nothing is in flight: no Builder round is running and no PR is open.
  - **v09.61:** the Word card's three Needs-a-source lines (#533, PR #537).
  - **v09.62:** the Word card's Dictionary box leads with the **Bangla meaning** in Bangla (decision 62, #539, PR #540, version PR #545). The unattended Architect merged #540 before its version commit landed; the version went through #545.
  - **v09.63:** the **wheel's centre** is the Owner's own gold calligraphy, `app/img/wheel-hub-calligraphy.webp`, with the chosen unit under it and the open Qur'an at the bottom. **Choose a Unit** holds the full unit choice: Study Unit, then the number, then Surah, then Āyah or From–To (decision 63, #542, PR #543). The approved demo is `docs/reference/2026-10-04-wheel-centre-demo.html`, and decision 63 is in the decisions file.
- **The Bangla dictionary data** is `tools/quran-data-pull/output/lemma-dictionary-bn.json`. Source: the AQS *Quraniyo Obhidhan*, the Owner's PDF (archive.org `mujammufahras/qab.pdf`). It is built by `tools/dictionary-pull/bangla/` in five deterministic steps (README there) and checked by `bangla-dictionary-data.mjs` (35 checks). Report: `docs/reports/2026-10-03-bangla-dictionary-data.md`. Coverage is 2,761 of 4,832 lemmas (57.4% of occurrences). The rest is mostly particles; ٱللَّه is deliberately empty.
- **Open items:**
  - The Owner checks v09.62 and v09.63 on their device.
  - The Asmaul Husna poster stays on hold (decision 50).
  - A courtesy permission letter to the dictionary's publisher, reminded later (no longer a blocker, decision 62).
  - Possible later data rounds: more Bangla matches for the frequent words left out (ءَامَنَ, ءَايَة, جَنَّة, رَحْمَة: their entries are in the book but could not be matched safely).
  - `layout.mjs` reports a "dangling id" `bmNotFound` that is set by `note.id = …`, a pattern its static scan misses. It is on `main` too. Teach the scan that pattern; do not baseline it.
- **Lessons, again:**
  - **Never switch branches in the folder a long suite is reading.** I did it once more today and had to throw away a behaviour run. Review a second PR in a `git worktree`.
  - A worktree outside `/home/user` needs `node_modules` linked (`ln -s /home/user/node_modules <wt>/node_modules`). A second server can run from the worktree on another port: a copy of `serve.js` with `PORT` changed, plus `harness.mjs`'s `BASE` changed locally. Never commit either.
  - The unattended Architect can merge a green Builder PR while you are still reviewing it. Put review fixes and the version on the branch quickly, or expect to send the version through its own PR.
  - Review bots on the Architect's own PRs (Codex on #541) found four real faults in a demo. Answer each thread and resolve it.

**Updated 3 Oct 2026, ~21:15 UTC, by session `session_012katd3VGiJEprbqxSEUTbf` (Active Architect on #159 since 20:08 UTC). Supersedes the ~18:00 paragraph below.**

- **`main` is at v09.60** (PR #534): Know Your Status's All-units wheel prints the Approach names; the āyah picker fits "Bismillah" for Al-Fātiḥah (`#ayahSelectControl.opt-cell-word`); `quran-word-card.mjs` 37/0, `approach-short-names-browser` 70/0, `ayah-action-sheet-boundary` 54/0. **Queue items 2 and 3 are done.**
- **Needs-a-source data is on `main`, no version** (PRs #532, #535): `output/word-syntax/` (Corpus treebank, GPL v3), `output/furuq-index.json` and `output/mufradat/` (OpenITI, CC BY-NC-SA 4.0). Report: `docs/reports/2026-10-03-needs-a-source-data.md`. Suite `needs-a-source-data` 35/0. A review bot's six findings on #532 were all real and are fixed in #535 (threads answered and resolved).
- **Builder round #533 (the screen for those lines) is running** (run 790, branch `builder/issue-533-run-790`); a review check-in is set for 21:40 UTC. The issue carries a note that `main` moved (node `seg` at index 4).
- A stray branch `data-review-532` (same commit as #535) could not be deleted from here (403); harmless.

 (v09.59 released: the tablet wheel's corner buttons on the screen's edges, the Owner's "Place them on edges"; before it v09.58, Word card round 7, the PC boxes, so the seven-round rebuild is COMPLETE; the next job is the Needs-a-source lines; no Builder round is running and no check-in is scheduled), by session `session_01BRPbcWQzkbfVcsLgZFpEsJ`** (the Active Architect on #159 since 03:12 UTC). **This session is long: a new session should take over from here.**

- **`main` is at v09.59.** v09.59 (PR #529): on a tablet the corner buttons stand 4px from the SCREEN's edges, measured by `tabletWheelLayout()` into `--tw-l`/`--tw-r` (suite `tablet-wheel-browser` 74/0, with a pushed-in case). Before it (v09.58 = round 7, the PC boxes: two columns from a 62rem card, the Word card window's first size up to 1120px via `initPopupWindow` `defaultMaxWidth`; suite `word-card-pc-boxes-browser`):
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
