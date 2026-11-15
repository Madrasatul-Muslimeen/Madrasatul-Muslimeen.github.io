# MSA Master Architect 113L: handover, 16 Nov 2026 (~8:30 am Sydney)

Session `session_01PL2xbKqW1kNw8QhF1Nu7Ja`, took over from 112L at 7:02 pm 15 Nov. Handing over on the context rule (37%).
Read this with `docs/reports/2026-11-15-msa-architect-112L-handover.md` (its suite-setup notes and lessons still hold).

**Who:** PCA = **45L** `session_01PL2xbJGFykiaDoc3Vi5pUK` (from 44L, 8:41 pm 15 Nov; always read meta/global.sessionUrl).
Keep-alive `trig_01UtWb4UAo48CE8UWTgZApHJ` (8:07 am daily) is bound to 113L: ask the PCA to move it.
QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 15L `session_01PL2xbLmvkDGvNiNsRWtZkR`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Released this session
- **v15.08** (#1758, e4a70ad): J140 pop-ups parts 1+2 (Builder #1747 + round #1749): fold to the top left, click-elsewhere fold, ⛶ on every `WINDOWS` entry, ✕ on Learn next, drag + 8-side resize (Learn next, Track). behaviour 970/5, popup-collapse 156/0 (nodrag 4, noresize 36 run by me), qr-verify 30/30. QR live 8:18 pm.
- **v15.09** (#1759, 4564b02): QR Lead's #1757: the Monitor says its counts leave out the device-local own-language list. behaviour 970/5, vocab-wheel 118/0 (nonote 4). QR live 8:38 pm.
- Also merged by the unattended Architect, test-only: #1755 (47L, Mushaf suites re-aimed), #1760 (47L, read-surah-list widths).

## IN FLIGHT (take these first)
1. **v15.10 release branch `claude/release-v15.10`** (pushed): Builder #1761 (J140 part 3: Hadith Word Card ✕ + `.hwc-scroll`, book page, Hadith reader pane, Dua pop-up + group window, word pop-out, Vocabulary sheet ✕, word-form pop-up into `WINDOWS`) + Dua Lead #1764 (one CSS rule: the Dua groups menu "No groups yet" note contrast). Measured on the combined branch: behaviour ALONE 970/5 (the same five as main: 14a 30i 30j 30l 31a), qr-verify run-all 30/30, popup-windows-all 268/0, popup-collapse 156/0, minimise-windows 48/0, note-window-a11y 940/0, hadith-menu-bar 188/0, journey-tray-panes 56/0, read-note-pane-window 112/0, learn-next 204/0, read-bar-tools 90/0, hadith-word-card 158/0, dua-card-r2 168/0, hadith-book-pages 109/0, hadith-key-marks 52/0, dua-groups-menu 52/0. See the status line in the PCF monitor for whether `hadith-dua-a11y --page=dua` finished and whether v15.10 was allocated/merged; if not: run it, then `allocate-version.py 15.10 15.11 …`, PR, merge (full 40-char sha), after-merge guards, PCF wn-v1510 + J140 Done line, "PCA ▸ released v15.10" to 45L, tell the QR Lead (Vocabulary sheet ✕ and word-form entry are in frozen Quran Study; no note script changed).
   - `hadith-dua-a11y --page=hadith` fails on MAIN at its first click (stale: views moved behind the Menu). Hadith Lead's test-only **#1763** fixes it (846/0); merge it (or let the unattended Architect).
2. **Builder: dispatch #1762 (J140 part 4, the last pop-ups) straight after v15.10 merges.** Nothing is running now. Check the run really starts.
3. **J143 = B (the Owner ticked B, 6:31 am 16 Nov):** QR Lead's **#1765** is ready for review as **v15.11**: banglaWords per student behind a readiness gate (OFF; firestore.rules untouched). Review: behaviour alone, the new data suite 27/0 + browser suite 16/0 and their mutations, the emulator block + 28 mutations, rules-authorisation-executable 138/0, qr-verify (47L saw one environmental CORS failure in student-browser: confirm it on main). Shared files it touches: monitor.html, collections.js, bn.js (2 `// ?`). Permanent key `banglaWords/{tenantId}__{personId}` and `{tenantId}__madrasah`. After release: assemble the `match /banglaWords/{listKey}` block of `docs/proposals/bangla-words.candidate.rules` into firestore.rules (Architect round), then send the Owner ONE short click-by-click publishing guide (tick box) in J143; then flip `bangla-words-readiness.js` ready: true in a release.
4. **Hadith Lead 15L**: fixing two Know Your Status a11y findings (wheel segments' focus ring; the four status checkboxes' 1.63:1 reading, measure first) + adding a "status" view to hadith-dua-a11y, one PR from main after v15.10: needs a version.
5. **QR Lead 47L** asked the Owner what the circles 1–5 mean on the word-marking demo picture ("Word Color: See image"); waiting.

## The Owner's open list (carry1115)
Phone checks v15.03–v15.10 (J140's check steps are in its comment c140c); v15.02 phone ticks; v15.00 check; 320px pill choice; finger-scroll tick (qr47l1511a); Depth colour / word-colour picture (47L); J02 j2n0201; J05 j05n5, j05n6; J104 n104pubgrp, n104edit27 (Dua Lead); J105 n105d; J106 n106j; J115 n115d, n115e; J119 n119g; J120 n120r; J48 n48e; the Bangla wording of the `// ?` strings (40 Hadith + #1757's + #1765's two). Later: J143's one Rules publish.

## Lessons (new)
- **A merge refused by a dirty tree prints one line and the chain carries on.** `git merge` stopped on an uncommitted `offline-files.json`, and the Dua suites then ran WITHOUT #1764 and passed. Check `git log -1` after every merge before believing the next result.
- **A suite that fails at its positive control on every view is usually stale, not broken:** run it on main before blaming the round (hadith-dua-a11y, #1763).
- **Context: 37% when the keep-alive fired.** Long qr-verify waits are cheap; reading big diffs is not. Read files lists first.
