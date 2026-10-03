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

**Updated 3 Oct 2026, ~08:20 UTC, by session `session_01BRPbcWQzkbfVcsLgZFpEsJ`** (the Active Architect on #159 since 03:12 UTC):

- **`main` is at v09.52.** The Word card rebuild (7 rounds, spec §3) has 4 rounds done.
  - **v09.48:** round 1, data (#501). Built by the Architect.
    - `build-word-features.mjs` writes `output/word-features/` and `output/lemma-forms.json`.
    - `derived-forms-reviewed.json` holds the reviewed lists.
    - `word-grammar-tables.js` holds the names and Form sentences.
    - `quran-word-features.js` is the loader.
  - **v09.49:** round 2, the WbW tab and header (#504). Review restyled it to the demo's light cards.
  - **v09.50:** round 3, the Basic tab (#508).
  - **v09.51:** decision 60, the **Mark words** switch (Fewer (auto) / Known / Unknown).
    - The code is `getMarkWordsMode()` / `setMarkWordsMode()` / `markWordsShows()` in `prefs.js`.
    - The suite is `mark-words-mode-browser`.
  - **v09.52:** round 4, the Depth tab (#511, PR #513). It lives in `app/js/word-card-depth.js`.
    - Review corrected four Naḥw lines:
      - built on sukūn with نون النسوة;
      - built on fatḥa with نون التوكيد;
      - نائب فاعل for a passive verb;
      - اسمها on كان and its sisters (`isKanaFamily`).
    - It added the pure suite `word-card-depth-grammar.mjs` (8/0), with the Arabic written by hand. Run it from the repo root.
- **Round 5 (verb conjugation):**
  - **The engine is merged** (PR #512), built by the Architect:
    - `app/js/verb-conjugation.js` (sound roots, Forms I–X, active voice).
    - `tools/quran-data-pull/build-verb-forms.mjs` writes `output/verb-forms.json` (on demand) and `output/verb-occurrences-corpus.json` (test only).
    - `verb-conjugation-quran.mjs` (12/0) checks the engine against every active verb in the Qur'an. The exceptions are pinned by name.
  - **The section is with the Builder: issue #515**, dispatched about 08:15 UTC. The review check-in fires at 09:16 UTC.
- **Next:**
  - round 6, Search 🔍 (`docs/reference/2026-10-03-word-card-search-demo.html`);
  - round 7, the PC boxes with the ring;
  - fix separately: the āyah picker's "Bismillah" option, which is cut at desktop widths (panel.mjs 32 problems, the same on `main` since v09.40).
- **How a review is done here:**
  1. Merge `origin/main` into a local branch.
  2. Run the suites into a log with their exit codes.
  3. Screenshot the real card **beside the demo**. Shoot section by section, because the card's scroll container clips a whole-card shot (`scratchpad/_shot-*.mjs`; copy into `tools/i18n-verify/` to run, then remove).
  4. Check the Arabic by hand.
  5. Mutation-prove one check.
  6. Push to the Builder branch.
  7. Run `allocate-version.py` from a scratchpad script.
  8. Merge with `expectedHeadSha`.
  9. Reset `claude/adoring-edison-cm28vf`.
  10. Run the three governance checks. **Before** the merge, brief-integrity and ledger-mutations fail by design: the brief names a version that is not yet on `main`.
- **Sandbox:**
  - `serve.js` dies when the container restarts. A suite run against a dead server exits 1 with no output, so check `curl localhost:8080` first.
  - The browser suites need Playwright linked first:
    `mkdir -p /home/user/node_modules && ln -sf /opt/node-tools/node_modules/playwright /home/user/node_modules/ && ln -sf /opt/node-tools/node_modules/playwright-core /home/user/node_modules/`
- **Never put the Builder's mention phrase in an issue body.** An issue opened by `AAAsapp` that contains it starts a run.

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
