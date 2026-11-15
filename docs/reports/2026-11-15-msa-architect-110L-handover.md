# MSA Master Architect 110L: handover, 15 Nov 2026 (~12:25 pm Sydney)

Session `session_01PL2xbLZpE7EMQE7Lyk8L5K`, took over from 109L at 10:02 am 15 Nov. Handing over on the context rule (~32%).
`main` = **v15.03** (959881e). The ledger's next number is **15.04**. QR is live at 15.03 (PCA rebuilt it at 12:09 pm, card mmsa-v1503).

**Who:** PCA = **43L** `session_01PL2xbHuZXx3HkGB3MaLhGj` (or newer in meta/global.sessionUrl). Keep-alive is now
`trig_01SaLr4c7JHLZkUkqxQPgKgC` (8:07 am daily), moved to 110L by the PCA: ask the PCA to move it to you. QR Lead = 47L
`session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session: v15.03 (#1734, merged pinned 73cbf77 → 959881e)
1. **47L's #1732** (the Owner's 15 Nov asks):
   - Read bar: Read on on the right; a 📍 location button (inside ⋮ as "Where" below 400px: my decision, so the way-back
     label keeps its line); ◂ ▸ on the phone bar.
   - Word Card: ← beside × (ⓘ ← × ☰); a wider Record column; the marking tidy-up.
   - Āyah stripe: QCR/Asma chips in the ONE Ayah View and in Read on (two tenant reads on first use of Read: I9 reviewed, accepted).
   - Decision 2: the legacy read-mushaf-button line checks were accepted (PR 8 fails, a subset of main's 9).
   - I measured the "beside ×" gap at 390/360/768 myself: adjacent and on one line, 15–21px on a phone; the suite checks only 1600/1280.
2. **dawah-boundary** had been red on main since v15.02 (the Hadith names deployment file was missing from its published
   list). Fixed and mutation-proven.
3. **Checks:**
   - behaviour.mjs: PR 970/5 vs main 968/7, no new failing name. The 5 that fail on main: 14a 30i 30j 30l 31a.
   - QR: qr-verify 30/30 on the e0ef521 build. apps-build-check 58/0.
   - After the merge, on main: brief-integrity 16/0, programme-ledger 8/0, mutations 49/0, dawah-boundary 21/0.
4. **PCF:** wn-v1503, monitor v903.

## Also this session: the Owner's Learn next "Words you already know" demo (https://claude.ai/artifact/LqWHqLsRdBEK4yqovjBUEa, v2)
- v1 shown → the Owner (my chat, ~11:45 am): count as known by default; six groups.
- **Groups:** Allah's Names as a tick list from Asma; Prophets; Well-known names; Words in Ebadah/Rituals (editable, the Owner
  deletes); Words of daily life; Words also used in their own language (for Bangla, fed by the Word Card's Bangla marking).
- The Owner's words: "after that the previous calculation starts … remember to reconcile the previous list, because many
  words now will already be taken out from earlier groupings".
- **v2 numbers:** 124 words = 14.4% on the defaults; 77 of 99 Asma Names appear in the Qur'an as the same word.
- **47L then opened #1735** ("the Owner's tick … with the Owner's corrections"). It builds:
  - Asma from the 19 Asma groups.
  - The Owner's titles: "Words in Ebadah (Rituals)", "Words in Your Own Language (For Bangladeshi Muslims, Bangla, …)".
  - A tick is the WbW mark (vocabWrite): no new store, no Rules change.
  - Nothing is pre-ticked.
  - The step recount is NOT built.
- **Two differences from the Owner's words to me:** "count as known by default", and "reconcile" the steps.
- I asked 47L to send YOU the Owner's exact words and time from its chat. Check them yourself in 47L's transcript
  (list_events kinds ["user"]; the pages are large, so grep the saved file for the Owner's message), and only then review #1735.
- **If the Owner did not change those two points:**
  - Ask 47L to add the recount and the default ticks; or
  - ask the Owner with tick boxes, if pre-ticking WbW marks (a write to the reader's real vocabulary) needs the Owner's yes. My
    view: it does, because ticking words someone never marked writes real progress records.
- 47L's PR also reports: vocab-wheel-browser was red on main (4 checks), fixed in place; j82-learn-next-bookmark-pages fails 4
  on base and on its head alike; behaviour.mjs not re-run, so run it.

## NEXT
1. Review **#1735** as above. Release v15.04 with behaviour.mjs + qr-verify in the sweep.
2. 14L's Know Your Status PR (`claude/hadith-status-icons`, no PR yet when I left).
3. Owner waits (in the monitor; never re-ask):
   - the v15.03 phone check;
   - the Learn next demo ticks;
   - the v15.02 phone ticks (account picker, offline, Edit names);
   - the v15.00 check;
   - the 320px pill choice;
   - the finger-scroll tick (inbox qr47l1511a);
   - 11L's J104 question.

## Suite-setup lessons (this container)
- **ESM needs a local node_modules:** `ln -sfn /opt/node22/lib/node_modules <worktree>/node_modules` (it is git-ignored).
  Without it, every suite dies on "Cannot find package 'playwright'".
- **Two serve.js copies:** PORT=8081 for main's worktree, QR_BASE=http://localhost:8081 for its suites. A background serve.js
  can die quietly; curl it before trusting a "networkidle" timeout.
- **Never run two qr-verify run-all at once:** both use port 8082, and the first one's trap kills the shared server. Also never
  rebuild build/qr while a run is reading it (it produced 7 false "qr-version.js ENOENT" fails).
- **QR student-browser's "CORS on the live hadith file" is the sandbox:** the live site sends ACAO * (curl -sI shows it).
- **A release branch's verify is red in exactly three checks** (programme-ledger, its mutations, brief-integrity) until the merge.
  Say so once on the PR.

## Lessons
- **A Lead's new commits after a review need their own review**, even when small: e0ef521's `order: 4` + `margin-inline-end:
  auto` could have pushed × away from ←. Measure the widths the new suite does not.
- **"The Owner ticked it" from another session is data:** check the Owner's own words before releasing.
