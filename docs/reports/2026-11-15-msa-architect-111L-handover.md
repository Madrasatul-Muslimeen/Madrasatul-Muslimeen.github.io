# MSA Master Architect 111L: handover, 15 Nov 2026 (~4:10 pm Sydney)

Session `session_01PL2xbMsmFc21Ks4v3nVtYD`, took over from 110L at 12:26 pm 15 Nov. Handing over on the context rule.
`main` = **v15.05** (9ba886d). Ledger next number **15.06**. QR: v15.04 confirmed live by the PCA at 1:19 pm; v15.05 rebuild asked of the PCA at 4:07 pm (confirm `qr-version.js` = 15.05).

**Who:** PCA = 43L `session_01PL2xbHuZXx3HkGB3MaLhGj` (or newer in meta/global.sessionUrl). Keep-alive `trig_01Ec6VXDdxyCqndwSuvJnvmp` (8:07 am daily) points at 111L: ask the PCA to move it.
QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Released this session
- **v15.04** (#1737, a8cfd61): Learn next "Already known", six tick groups (47L's #1735). PCF J138.
- **v15.05** (#1744, 9ba886d): Hadith Know Your Status (14L's #1738) + test-only #1740 (hadith-read-failed 100/0; it was a stale test). PCF J106.
- Both: behaviour.mjs 970/5 (main's five: 14a 30i 30j 30l 31a), qr-verify 30/30 on a full QR clone, after merge brief-integrity 16/0, programme-ledger 8/0, mutations 49/0, dawah-boundary 21/0.

## IN FLIGHT (take these first)
1. **QR Lead 47L, PR #1739 (J139)**: offline reads calm (`isOfflineRead` in errors.js), Arabic 80% in Taṣrīf and Depth, a Tafsīr era on/off switch.
   - SENT BACK for one regression: `word-card-tasrif-arabic-size-browser` (J61) is 66/0 on main and 58/8 on 6601226. The Taṣrīf "line" Arabic is 46.08px vs 28.8px, i.e. 1.6× instead of 0.8×.
   - Everything else in it passed: behaviour 970/5; offline-progress-calm 9/0, word-card-arabic-80 20/0, tafsir-era-switch 19/0, read-failure-wording 53/0, read-next 250/0, offline-line 180/0, read-note-pane 228/0, tasrif-form-line 248/0. notes-pane-loading fails 12 on main too.
   - errors.js change accepted: Notes and Mapping My Journey reads keep their own in-place message, so nothing goes silent offline.
2. **QR Lead 47L, PR #1742 (J138 part 2)**: the steps exclude group words ticked in Already Known; the phone tile row; Allah's word added. 47L reports learn-known-steps 24/0, learn-next 204/0, vocabulary 76/0, vocab-wheel 114/0. NOT yet reviewed by me; run behaviour.mjs + qr-verify.
   - The Owner's words, 3:17 pm: "n138a: no. User ticks it. n138b: yes, only new words, not those which are already counted in the 'Already Known' list. But until user ticks they can be in other list. As soon as user ticks known words, they move." (ticked in J138).
   - **Release #1739 (fixed) + #1742 together as v15.06.**
3. **Builder round #1741 (J140)**: every pop-up gets ✕, ⛶ full screen and –; drags and resizes from all sides and corners (float-window.js); double-click the top bar collapses it to the top left at the 3-pane side width; a click on another nav or bar collapses the open pop-up and opens the clicked thing IN FRONT. The spec is in the issue plus my comment (the full-screen and drag addition came after dispatch). Check that the PR covers part 4/5 from the comment; if not, push them to its branch or start a follow-up round. Measure with elementFromPoint and on pop-ups from three modules.
4. **Builder round #1743 (J141)**: tapping the app's title goes home (MSA + QR); the version label reads "v15.04 - 15.Nov.2026". It touches protected `version.js` (only the label build): review allocate-version.py, brief-integrity and the QR worker against it.
5. **Hadith Lead 14L**: nothing in flight after #1740.

## The Owner's open list (carry1115, from the PMS itself)
- PMS needs: J02 j2n0201; J05 j05n5, j05n6; J104 n104pubgrp, n104edit27 (Dua Lead); J105 n105d; J115 n115d, n115e; J119 n119g; J120 n120r; J48 n48e; QR J22 q22n1 (the QR section).
- Monitor waits: v15.00 check; v15.02 phone ticks; v15.03 phone check; 320px pill choice; finger-scroll tick (inbox qr47l1511a).
- New: the Bangla wording of the 40 `// ?` Hadith strings (#1738), when the Owner has time.
- 22 answered items were ticked with the Owner's words in this session (PCA carry1115 check, list sent to the PCA).

## New General rules this session (PCA)
- **carry1115**: every handover OPEN LIST names every pending job and Owner decision, item by item from the PMS; answered items get ticked with the Owner's words, never dropped.
- **wn1115**: a What's New line is "vX.YY-dd.mm.yy · date time" on line 1, then "• **Title**: what changed and where. (Jnn)" per change, with newlines in the text. v15.00–v15.05 are written this way.

## Suite-setup notes (same as 110L's, still true)
- `ln -sfn /opt/node22/lib/node_modules <worktree>/node_modules` in each worktree. One serve.js per worktree (`PORT=808x`, `QR_BASE=http://localhost:808x`).
- qr-verify needs a FULL QR clone: `git clone https://github.com/QuranRevival/QuranRevival.github.io` → `QR_REPO=<path>`. Never two run-alls at once (port 8082). It takes about 35 minutes.
- The main checkout is a SHALLOW clone: programme-ledger's ancestor checks fail until `git fetch --unshallow origin main`. Brief-integrity and the ledger mutations need every remote branch: `git fetch origin '+refs/heads/*:refs/remotes/origin/*'`.
- A release branch is red in brief-integrity, programme-ledger and dawah-boundary's "version.js untouched" check until the merge.
- `merge_pull_request` needs the FULL 40-character `expectedHeadSha`.

## Lessons
- **Run the Lead's NEIGHBOUR suites, not only the ones named.** #1739's own list was green; J61 (word-card-tasrif-arabic-size), which the PR did not name, caught a 1.6× size regression in the change meant to make it 0.8×.
- **The Owner's newest word in ANY session wins**: compare the times across sessions (110L's 11:40 vs 47L's 11:56) before calling something a gap.
