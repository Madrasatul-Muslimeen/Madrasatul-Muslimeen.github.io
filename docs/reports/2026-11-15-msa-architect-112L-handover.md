# MSA Master Architect 112L: handover, 15 Nov 2026 (~7:05 pm Sydney)

Session `session_01PL2xbLkKWPjwuh9VyqHQ7C`, took over from 111L at 4:11 pm 15 Nov. Handing over on the context rule (31%).
`main` = **v15.07** (e6c2e51). Ledger next number **15.08**. QR: v15.06 confirmed live by the PCA at 5:00 pm; v15.07 rebuild asked of the PCA at ~7:00 pm (confirm `qr-version.js` = 15.07).

**Who:** PCA = 44L `session_01PL2xbKUD6ZzbktJ97wkLap` (always read meta/global.sessionUrl). Keep-alive `trig_019xxHS36iKaQS84i6hinAV2` (8:07 am) is bound to 112L: ask the PCA to move it.
QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = **15L** `session_01PL2xbLmvkDGvNiNsRWtZkR` (from 14L, nothing in flight). Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Released this session
- **v15.06** (#1748, 3028576): 47L's #1739 (J139: offline reads calm, Taṣrīf Basic-form pill + Form line and Depth Morphology Arabic 80%, Tafsīr era switches) + #1742 (J138 part 2: steps leave out words ticked in Already known). behaviour 970/5, J61 66/0, qr-verify 30/30. QR live 5:00 pm.
- **v15.07** (#1753, e6c2e51): Builder #1751 (J141: tap the title to go home; label "v15.07 - 15.Nov.2026") + 47L's #1752 (J142, filed by me: bookmark names "Al-Hadid - 57:1-6 - 12.Oct.26", landing Read opens the Surah list, Mushaf bar 🏠 📍). behaviour 970/5, qr-verify 30/30. I updated three checks in place on the release branch (behaviour 33a/37a; read-bar-tools' outside tap; qr-verify range-bookmark).
- Also merged by the unattended Architect: 47L's test-only #1750 (word-card-small-arabic-size 150/0).
- After both merges: brief-integrity 16/0, programme-ledger 8/0, mutations 49/0, dawah-boundary 21/0.

## IN FLIGHT (take these first)
1. **J140 pop-ups.** Builder PR **#1747** (branch `builder/issue-1741-run-3294`) is part 1: collapse to the top left, click-elsewhere collapse, ✕ on Learn next. I reviewed it: behaviour 970/5, popup-collapse 88/0, minimise-windows 48/0, note-window-a11y 940/0, hadith-menu-bar 188/0, journey-tray-panes 56/0, read-note-pane-window 112/0. **HELD, not merged**, on purpose.
   - Builder round **#1749** (J140 part 2: ⛶ full screen, drag + 8-side resize via float-window.js, every other pop-up into `WINDOWS`, the audit table) was dispatched at ~6:00 pm to build ON TOP of #1747's branch and push to it. When it lands, review #1747 as a whole (behaviour.mjs, qr-verify, the suites the issue names, elementFromPoint at 1280/768/390/320), then release ONE version.
   - #1751 (title link) merged after #1747 was branched: expect a conflict or a title-tap interaction in popup-collapse; check it.
2. **QR Lead 47L**: re-aiming the two suites that crash on MAIN at the hidden `#readBarBookmarkBtn` (mushaf-page-ref-steady, mushaf-bookmark-stay-qcr-add; confirmed on main), branched from e6c2e51. Test-only, no version.
3. **Builder queue**: only one round runs at a time, and GitHub keeps only ONE pending run: a comment-triggered run (refused later) can push a queued `workflow_dispatch` out (#1743's first run 3299 was cancelled that way). Dispatch the next round only after the running one finishes, and check it actually started.

## The Owner's open list (carry1115, from the PMS)
- Phone checks: **v15.07, v15.06**, v15.05, v15.04, v15.03; v15.02 phone ticks; v15.00 check.
- 320px pill choice; finger-scroll tick (inbox qr47l1511a); the Depth colour on the word-marking demo v1.02 (QR Lead 47L's).
- PMS ticks: J02 j2n0201; J05 j05n5, j05n6; J104 n104pubgrp, n104edit27 (Dua Lead); J105 n105d; J106 n106j (Hadith, three questions); J115 n115d, n115e; J119 n119g; J120 n120r; J48 n48e.
- The Bangla wording of the 40 `// ?` Hadith strings.
- The Owner asked at ~5:00 pm whether any Rules publish waits on them: **none, in any project** (J13 timezone is parked; v15.06/v15.07 changed no Rules).

## Suite-setup notes (still true)
- `ln -sfn /opt/node22/lib/node_modules <worktree>/node_modules` in EVERY worktree, before the first suite (a merge conflict that stops a `&&` chain skips it; every suite then fails with "Cannot find package 'playwright'").
- `app/offline-files.json` conflicts on every merge of two PRs: take either side, re-run `node tools/offline/build-offline-files.mjs`, commit.
- qr-verify needs a FULL QR clone (`QR_REPO=`); ~35 min. A second serve.js: `PORT=8083` + `QR_BASE=http://localhost:8083`.
- **Run behaviour.mjs ALONE.** Next to qr-verify it threw a false "nav still English" (the nav was not built yet under load); alone it was 970/5.
- The main checkout is shallow: `git fetch --unshallow origin main` and `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` before the after-merge guards.
- Release PRs fail `verify` before merge by design (the "main reads the old version" checks). `merge_pull_request` needs the full 40-character `expectedHeadSha`.

## Lessons
- **A new link where a test taps "a neutral spot" breaks the test.** read-bar-tools tapped the page title to close a sheet; J141 made the title a home link, so the tap went home. A green suite on each PR alone said nothing: only the COMBINED branch showed it. Review rounds that land together on one branch.
- **A Lead's "these suites are green" list misses the suites that describe what it moved.** behaviour 33a/37a (the read-bar id list) and qr-verify range-bookmark (the default name) went red on #1752. Always run behaviour.mjs and qr-verify run-all.
