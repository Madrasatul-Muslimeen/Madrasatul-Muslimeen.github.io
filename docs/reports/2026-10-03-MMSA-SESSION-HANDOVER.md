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

**When written (3 Oct 2026, ~03:00 UTC):**
- **`main` is at v09.47.** No pull request is open and the Builder is idle.
- **The next job is the Word card rebuild**, all three tabs. The Owner said
  **"Go, build all three tabs together."** The brief is
  `docs/reference/2026-10-03-word-card-build-spec.md`, and the build target the
  real app must match is `docs/reference/2026-10-03-word-card-demo.html` (plus
  `…-word-card-search-demo.html`). The Owner's decision is 59 in
  `docs/governance/2026-09-27-owner-decisions.md`. The spec's section 3 splits
  the work into 7 rounds; write one Builder issue each and dispatch them in order.
  **Round 1 is data**: keep the Quranic Arabic Corpus features that the pull
  currently drops. The Owner's binding words: *"Make sure your real build is what
  actually you demoed."* So screenshot the real build beside the demo every
  round.
- **This session's releases:**
  - **v09.45:** a bookmark on a unit the Note view cannot show (a Page, Juz, Hizb,
    Ruku' or many-page surah) opens the Read view (`bookmarkNeedsReadView()`).
  - **v09.46:** a bookmark records and restores its exact reading settings
    (`settings.reading` from `capturePresetSettings()`, and `settings.readChrome`),
    applied only on a real bookmark open, never at boot.
  - **v09.47:** Basic and Depth word progress **switched on**. The Owner published
    the Rules ("Basic and Depth rules are live"); `firestore.rules` is synced; the
    gate is `ready: true`; the record is
    `docs/reports/2026-10-02-lemma-levels-enabled.md`.
- **Red on `main`, to investigate:** `quran-word-progress-rendered`, "opening a
  word reads both lanes and no more" (en/bn). It was red before v09.47. It sees
  the lanes read twice and the extra totals reads; the two per-level totals reads
  are by design (decision 58).

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
