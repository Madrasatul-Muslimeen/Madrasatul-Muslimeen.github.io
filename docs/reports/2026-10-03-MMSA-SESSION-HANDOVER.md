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

**Updated 3 Oct 2026, ~04:00 UTC, by session `session_01BRPbcWQzkbfVcsLgZFpEsJ`** (the Active Architect on #159 since 03:12 UTC):
- **`main` is at v09.48.** The Word card rebuild is under way, 7 rounds (spec §3).
- **Round 1 (data), done: v09.48 (#501, PR #502), plus PR #503 (each part's person, `pp`, and `partMeaning()`).** It was built by the Architect, because it needed the Corpus file and Wiktionary.
  - `tools/quran-data-pull/build-word-features.mjs` writes:
    - `output/word-features/` (on demand);
    - `output/lemma-forms.json` (Basic's groups).
  - `tools/quran-data-pull/derived-forms-reviewed.json` holds the 135 reviewed verbal nouns and the not-comparative / not-intensive exclusions.
  - `app/js/word-grammar-tables.js` holds the names, the Form sentences and `DERIVED_GROUP_ORDER`.
  - `app/js/quran-word-features.js` is the loader.
  - The suite is `word-features-data` (27/0).
  - To re-run: fetch the Corpus file (handover §2), then `node tools/quran-data-pull/build-word-features.mjs <file>`.
- **The review page for the Owner** (part names and Form sentences): https://claude.ai/artifact/N4Caa9YnBPqqWGFr3R89oS. It is generated from the tables file, so it shows what the app will print.
- **Round 2 (WbW tab and header): issue #504**, dispatched to the Builder about 03:29 UTC. A review check-in is set for 04:30 UTC.
  - The 🔍 button is left out until round 6.
- **The red suite is fixed** (PR #505): `quran-word-progress-rendered` was stale. The extra reads were:
  - the Read chunk (#472);
  - one total per level (decision 58);
  - the If-you-learn walk (#303).

  It is now 80/3 (the 3 are sandbox TLS).
- **Sandbox:** the browser suites need Playwright linked first:
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
