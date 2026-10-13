# MMSA session handover, 12 Oct 2026

Written by the MMSA Architect, session `session_015GBL8aB9mfR2h1FyDQjoFb` (11–12 Oct 2026, v10.24 → v10.28). It
supersedes `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`, which is kept as history (its release list runs to
v10.28). Read `CLAUDE.md` first. The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-12.md`.

This session was summarised once (its context compacted), which is why it hands over here.

## LATEST UPDATE — 13 Oct 2026, session `session_019dnykSt8zmrCun2mLZKysQ` (v10.28 → v10.39) — READ THIS FIRST

- **`main` is v10.39** (read it off `app/js/version.js`). This session released v10.29–v10.39 and merged PRs #777–#803;
  decisions 107–110 are recorded. The release list is in section 5 below; `CHANGELOG.md` has every account.
- **The PCF's General rule "Programme Lead" binds every MMSA session** (the Owner, 12 Oct): read the PCF first, act on
  any "PL ▸" line before other work and reply under it, clear a 📣 Notify flag. It is also an MMSA project rule.
- **Anything you need from the Owner goes in the job's "What I need from you" list as a tick box, never only in
  Comments** (the Owner could not see a J15 request that sat in Comments).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner (tick boxes in the PCF):**
  - **J15:** "copy the Rules". The Owner published the guardian Rules
    (`docs/governance/2026-10-12-guardian-roster-candidate.rules` = live file + one rule). Copying them into
    `firestore.rules` is a protected step: this session's tooling refused it without the Owner's explicit word. On
    the tick, copy them and update `tools/firestore-emulator/roster-access.rules.test.mjs` to test the live file with
    the guardian rule (plus a mutation that removes it), then run `npm run roster-access`.
  - **J23:** the inherited-Achieved press (A this place only, needs a Rules step for the totals counters; B change the
    other mark; C as now), and the new Word card layout (A/B/C, mock-ups at
    https://claude.ai/artifact/P872EWyvP3z2Btt2q16Gcp, also `docs/reference/2026-10-13-word-card-layout-mockups.html`).
  - **J20:** paste Approach 1's line into the Catalogue (the template carries it since v10.39; the tenant's copy does not).
  - **J22:** Tawakkul's Bismillah row: the Owner removes it with × (choice A). Try saving for everyone (v10.38).
  - Older: J02 (the 2:228 demo, Scholars drafts), J17, J03 Q1, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Architect's own, ready to do:**
  - **Scholars Database v1.4** is built on branch `scholars-v14` (commit 6c0b51b5, not merged): all 68 scholars with
    birth/death AH+CE, political authority, madhab, and a written date for every book (137; 125 estimates, all drafts).
    To ship: merge it, then publish `docs/reference/scholars-database/Scholars Database - v1.4.html` to
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi after reading the WHOLE file (about 60k tokens; read it in
    parts, it is one long data line). Ask the Owner the one open question in `v1.4-changes.md` (al-Arnāʾūṭ's book).
  - The Read bar at 320/360px with a wide phone font is still two rows (v10.37); one row there needs a layout choice.
  - `match_wikt.py` was not re-run (it needs the kaikki download); other "form of" pointers may hide wrong matches.
  - `quran-word-card-integration.mjs` (fixed in #802) still THROWS on a failed binding instead of counting a FAIL.

## 0. Where things stand

**The Owner now reads and answers in the Project Control File (PCF):** https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ,
section **`mmsa`**. It is one live page shared by all the Owner's projects (MMSA, Siyagah, Basheera Wa Nazeera).
`CLAUDE.md`'s PERMANENT RULE says how to use it. **Read it first and update it last, every session.** When this was
written it held 14 jobs (J01–J14), 4 guides (G01–G04) and 17 project rules. Nothing in it was marked New, and the inbox
was empty. The status board (#159) and the handovers carry on as before; the PCF is where the Owner looks.

- **`main` is at v10.28.** Read the live number off `app/js/version.js`.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **This session's releases** (all merged, all served by GitHub Pages):
  - **v10.25:** Al-Fātiḥah's āyah count in the Āyah card's Full text (Bismillah is not āyah 1 there); مَشْهُود joins
    the witness meaning group (Owner's screenshots).
  - **v10.26:** the ⋮ "has a note" mark is kept for every āyah the ⋮ sheet looked up this session.
  - **v10.27:** 🔖 on the Mushaf bar; the Meaning switches moved up onto the Read bar; the Asma Name bar's "◂ Wheel"
    (decision 102, option 2; `asma-quick-class` 5c green).
  - **v10.28:** the Word card's Intermediate tab: four levels, WbW · Basic · Intermediate · Depth (decisions 101, 103).
    **The Owner published the Rules** that let `intermediate` be written.
- **Test-, data- and governance-only merges** (no version):
  - PR #772, #773: the PCF rule in `CLAUDE.md`.
  - PR #774: `npm run lemma-levels` (Firestore emulator) now tests the live Rules. It was stale since its candidate was
    published. Proven: live 1/0; live with basic+depth removed 0/1; the old candidate 1/0.
  - PR #775: the Owner's **Scholars Database**: v1.1 kept as sent; v1.2 with 4 new columns and 48 scholars, drafted by
    Claude for the Owner to check. Folder: `docs/reference/scholars-database/`. Live page:
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi. It saves itself (✎ Edit, ✓ Checked, Save → v1.3 …). **Read it
    before building on it, and take its saved `<script id="data">` JSON back into the repo**; see the folder's
    README.
- **Decisions 104–106** (12 Oct, answered in the PCF) are in `docs/governance/2026-09-27-owner-decisions.md`:
  - 104: one PCF section; the three proposed rules kept; the first PCF deleted.
  - 105: the scholars, T20–T22. Build a database by era on the Owner's own. Claude drafts and the Owner edits. The
    scholars stay locked for an āyah until the reader has written their own understanding. A demo comes first.
  - 106: Asma screensaver defaults confirmed.

## 1. What waits on the Owner (keep reminding, decision 102)

All of these are on the PCF's **Your turn** list, one line each, and must stay in every report until decided:

1. **J02:** check the Scholars Database v1.2 drafts (filter "Drafts to check"; ✓ Checked; Save).
2. **J03:** Keys to Understanding, the 6 questions, now written out in J03 itself.
3. **J05:** the Ten Steps tab's pending items T9–T15 (master file, Ten Steps tab).
4. **J06:** HadeethEnc permission, and yes or no to the permanent key `hadith:openiti:<book>:<n>` (decision 90).
5. **J07:** Google Cloud: click **Upgrade** before about **6 Jan 2027**.
6. **Parked** (J08, J09, J11–J13): QuranRevival standalone store app; the QR ↔ MMSA integration map; Al-Munshiʾ
   Arabic, Letters, the family sign-up step; the Mastery Wheel per Study Unit; D14 timezone.

## 2. The next job (needs nothing from the Owner)

**J02 step 2: the demo** on one āyah of rulings, **2:228**, across the 13 scholar Approaches (28 Sahaba, 29 Tābiʿīn,
30 Gen1 … Gen6, 32–35 the madhabs, 36 groups and sects), by era. Its Scholars panel stays **locked until the reader
has written their own understanding** of the āyah (decision 105). Sources and method are in the master file's
"Connecting an āyah to the Scholars' Approaches" section and its Approach Map "Connect an āyah" column
(https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1). Use the Scholars Database rows for each book's author, era and
madhab. Show the scholars' own words, never an AI summary, and mark every passage with its book and source. **This
sandbox cannot reach `api.quran.com`.** Try the open tafsir data on cdn.jsdelivr.net (`spa5k/tafsir_api`) and
OpenITI, and say plainly which passages could not be fetched. Build nothing in the app until the Owner OKs the demo.

## 3. Sandbox lessons from this session

- **A Firestore emulator run that is killed leaves Java holding the port**, and the next run says "port taken". Stop
  it with `pkill -f cloud-firestore-emulator` before re-running.
- **A release PR's `verify` is red before merge by design**: programme-ledger, -mutations and brief-integrity read
  `origin/main`. Run the other suites locally, then merge with a merge commit and `expectedHeadSha` (the full 40-char
  SHA).
- **The PCF and the Scholars Database are artifacts that save themselves.** Always read before you write. In the PCF,
  pin every write with `if_version` and never write `layout`.
- The 11 Oct handover's sandbox lessons still hold: unshallow `main`; fetch the two held branches; symlink
  `playwright`; restart `node serve.js` after a container restart.

## 4. Routines on this account (leave them alone)

- **"PCF check – all projects"**: every 4 hours, Sydney time. Created by the Owner's other session; it acknowledges
  new PCF items.
- **"Siyagah PCF check"**: Siyagah's own.
- **"Monthly PLANS reminder"**.
- **"MMSA Task Bridge"**.

This session's own MMSA-only PCF check was deleted, with the first PCF, on the Owner's word (J01).
- **v10.29** (2026-10-12): student accounts can open the app (the roster read every page makes).
- **v10.30** (2026-10-12): the Read bar is one line again at 600-679px.
- **v10.31** (2026-10-12): a QCR āyah opens in the Read view, with Back to QCR.
- **v10.32** (2026-10-12): Keys Round 1: related hadith on the Āyah card, and the āyāt a hadith quotes.
- **v10.33** (2026-10-12): bookmarks for children show who they were saved for; a unit choice in Bookmark this.
- **v10.34** (2026-10-12): the Bookmarks page's + New bookmark files an Owner's folder by name for a child (Builder round #789).
- **v10.35** (2026-10-12): a bookmark save keeps the Mushaf page; QCR + Add āyah follows the Al-Fātiḥah count (issue #786).
- **v10.36** (2026-10-12): the Mushaf page reference shows from the first page, so a bookmark save no longer grows the Read bar (Builder round #792).
- **v10.37** (2026-10-12): the Read bar stays one row with the Meaning switches on a phone (Builder round #794).
- **v10.38** (2026-10-12): bookmarks for several people at once keep their folder, and tapping an existing bookmark asks before removing it (Builder round #797, PCF J22).
- **v10.39** (2026-10-12): Word card: the stem box always has a meaning and the wrong dictionary meanings are gone; Approach 1's self-learning line, with links in Approach guides (PCF J23, J20).
- **v10.40** (2026-10-13): a dragged landing wheel no longer hides Wheel / Legend / Unit on a phone (PCF J24).
- **v10.41** (2026-10-13): the Word card's level totals as one sentence each, layout B (PCF J23).
