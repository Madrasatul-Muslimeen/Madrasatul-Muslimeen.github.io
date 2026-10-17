# MMSA session handover, 12 Oct 2026

Written by the MMSA Architect, session `session_015GBL8aB9mfR2h1FyDQjoFb` (11–12 Oct 2026, v10.24 → v10.28). It
supersedes `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`, which is kept as history (its release list runs to
v10.28). Read `CLAUDE.md` first. The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-12.md`.

This session was summarised once (its context compacted), which is why it hands over here.

## LATEST UPDATE — 18 Oct 2026, 12:40 am Sydney, session `session_01VLTMxUCwUemDmx8ydcpZnq` (v11.30 → v11.34) — READ THIS FIRST

The MSA Master Architect took over at 5:04 pm on 17 Oct and hands over at the context limit (cost86). **The PCA is now
`session_01N6xeVcU5K2Heo5VSSgfKh4`** (since 8:29 pm; `session_015vTqvkMg3piq1bTzKMxrUU` is retired). Read
`meta/global.sessionUrl` before messaging.

**Released in this stretch.** Each has its PCF Done line with W-T-P-E-O and its What's New line. Each shared-file change
was sent to the PCA with exact lines.
- **Test-only #940:** `head-search-browser.mjs` expected the 40px Search button (was 36px), now 94/0. This clears the
  old backlog item.
- **v11.31 (#941, round #938, J34):** in Blank lines the model above the paper looks like Trace over. A new box chooses
  "As traced" or "Dark ink" (`writingModelStyle`). Corrected in review: the labels were cut at 390px.
- **v11.32 (#944, J36, URGENT Owner answer "1. Yes. 2. Keep it now"):** every page's tab reads "MSA — …" (31 pages,
  26 bn keys). `bookmark-nav.js` strips both prefixes. J36 is done; the tagline is kept.
- **v11.33 (#943, round #942, J29 audit part 36):** text and box colour contrast on MSA pages. #999/#888/#777 →
  #666, field borders → #8c8c8c, and the new token `--hadith-field`.
- **v11.34 (#947, round #945, audit part 37):** contrast inside opened windows. The round left 72 failures; they
  were fixed in review. The Light-look phone ⋯ sheet title "This note" was white on white. Also fixed: note dates,
  the Night sheet labels, the bookmark and Zab field borders, and the suite's missing Zab seed.

**In flight: Builder round #946 = MSA J37** (= QR J16; the Owner chose A at 11:11 pm): a 📜 Mushaf button on the
reading bar beside 📖 Meaning, in full screen too. It is the same switch as `#mushafToggle`. The issue holds the full
spec: layout at five widths in en/bn, four mutations, and the screenshot. Run 1474 started at 11:14 pm and has pushed
to `builder/issue-946-run-1474`. **At your first wake:**
1. Open its PR if the Builder did not (it often does not).
2. Review it by measurement. LOOK at the 390px screenshot in en and bn, normal and full screen.
3. Release it as **v11.35** (read the number off the ledger).
4. Send the PCA the QR notice: the exact lines in `quranrevival.html` and `bn.js`.
5. Reply in J37 and close it; QR's J16 waits on it.

**Next after that:** the J29 audit continues (Hadith, Dua and the shared tools; Seerah has no module yet). Ideas not
yet covered: phone landscape (844×390), 200% zoom, reduced motion. Keep a Builder round running.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24; J35's Bangla letter names.

**Lessons from this stretch:**
- **The local `serve.js` can die between wakes** (the container restarts). Every suite then fails "flow ran /
  ERR_CONNECTION_REFUSED", which reads like a broken round. Curl `localhost:8080` before believing a mass failure.
- **Never put a `//` comment in the middle of a JS line.** The v11.32 edit commented out the rest of an expression
  and stopped every page's scripts. The Bangla sweeps caught it. Run `node --check` on every changed `.js`.
- **A Builder that "finished" may have left its own suite red.** #945 pushed with 72 failing assertions and no PR
  or comment. Always run the round's suite yourself before reading its claims.
- **`load-speed-check` is timing-noisy here.** A different page goes over its 20% "second visit" limit on each run, on
  unmodified `main` too. Compare against `main` before blaming a round.
- **A hidden box escapes a fit check.** `writing-sheet-popout`'s fit check skips hidden selects, so a box shown
  only in one mode was never measured. Measure in the mode that shows it.

## LATEST UPDATE — 17 Oct 2026, 5:05 pm Sydney, session `session_01EXxaMgDxPuADkuAus61QVX` (v11.26 → v11.30) — superseded by the 12:40 am block above, kept as history

The MSA Master Architect took over from `session_018mWoDVsH9ncJs1X1xg2PUD` at 2:22 pm and hands over at about 40% context
(Owner rule cost86). **The PCA is now `session_015vTqvkMg3piq1bTzKMxrUU`** (read `meta/global.sessionUrl` before
messaging: `session_01F4rELd6jNvVx14F99bVM4j` and `session_017W7wuohe8qk4GK6qLE8wNN` are older PCA sessions, and the
second is inactive).

**Released in this stretch** (each has its PCF Done line with W-T-P-E-O and its What's New line):
- **v11.27 (#932, round #931, J29 audit part 34):** keyboard leftovers checked clean; text-spacing overflow at 320px fixed
  (topic chip, Import file box, revision id); Hadith Arabic marked `lang="ar"`. **The round's `shell.css` nav change was
  dropped**: its defect did not reproduce and its mutation could not fail the suite.
- **v11.28 (#936, J36):** the Owner's urgent rename. The main page's tab and heading read "Madrasah Study App (MSA)".
  Below 700px the heading shows "MSA", drawn by CSS, so the "← Back to …" pill keeps the full name. **J36 waits on two
  optional Owner ticks:** rename the other pages' "QuranRevival — …" tab titles to "MSA — …"; keep or change the tagline
  "Reviving the Quran, abandoned.".
- **v11.29 (#937, J29 j29p33):** new `app/js/table-focus.js` brings a focused button fully into a sideways-scrolling table
  (People, Catalogue). `audit-part33` now includes 320px.
- **v11.30 (#935, round #934, J35 = QR J12):** Letters mode in the writing window: 28 letters, four forms each, Trace over
  and Blank lines. Three example words were corrected in review, and the data check now asserts the letter's position.
  **QR was sent the change notice** (via the PCA session above).

**In flight: Builder round #938 = MSA J34** (= QR J11; the Owner chose "keep both", 2:43 pm). In Blank lines, the
example above the paper is drawn like Trace over, with a choice of A light (follows the Letter style) or B dark.
Dispatched about 5:01 pm. **At your first wake:** if it has finished, open its PR if the Builder did not; merge `main`
in; review it by measurement (its suite in en and bn at five widths, every mutation, the writing-sheet*/writing-letters
suites, behaviour once, load-speed-check); release it as **v11.31** (read the number off the ledger); then send QR the
change notice for `writing-popout.js` (exact lines and checks) through the PCA.

**Next after that:** the rest of J29's audit (Hadith, Dua, Seerah and the shared tools; the PCF User Manual is the
checklist), then the Architect's backlog. **New backlog item:** `head-search-browser.mjs` fails 18 checks on `main`. It
still expects a 36px Search button, and the button is 40px. It is a stale test: update it in place.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24, and J36's two optional ticks. Also ask them to
read J35's Bangla letter names.

**Lessons from this stretch (each cost a re-run):**
- **`ayah-related-hadith-mutations.mjs` edits `app/js/hadith-browser.js` ON DISK while it runs.** Run beside other suites,
  it fed them mutated code, and a commit picked up the mutated line. Run it alone, and read every commit's diff.
- **Never `git checkout` while browser suites run**: they read the working tree through `serve.js`. Wait, or use a
  worktree.
- **A waiter must never `pgrep -f` a name in its own command line** (`until ! pgrep -f "runall.sh"` matched itself and hung).
  Wait on a file the job writes.
- **A data check that asks "does the word contain the letter" is not the check that was meant.** The spec said "in that
  place". Read what an assertion really asserts, and add a positive control for the case the spec names.
- `writing-letters-browser.mjs` re-saves its picture only with `--shot`. Regenerate it after a data change.

## UPDATE — 17 Oct 2026, 1:05 pm Sydney, refreshed 2:25 pm, session `session_018mWoDVsH9ncJs1X1xg2PUD` (v11.23 → v11.26) — superseded by the 5:05 pm block above, kept as history

**REFRESHED 2:25 pm — this paragraph supersedes "Where things stand" below.** `main` is at **v11.26**: audit part 33
(#929, round #928). `zab-bar.js` adds `html { scroll-padding-bottom }`, so Tab stops above the Zab bar and corner. It is a
shared script; the PCA was sent the exact lines and the checks. Keyboard focus was already visible on every MSA page.
Found in that review and filed as J29 **j29p33**: at 320px a button at the clipped edge of the People and Catalogue tables,
which scroll sideways, is only partly in view when focused (on `main` too). Part 33's suite leaves 320 out on purpose and
says why.

**In flight: PR #932** (round #931, audit part 34: Notes pane and Bookmark menu by keyboard, row order, and wider text
spacing). The Builder again opened no PR, so the Architect opened it. **It is not yet reviewed: that is your first job.**
Its PR body lists three points to watch:
- `shell.css` is on every page: run a side-effect probe, plus `navcheck`, `phone-width-overflow` and `qr-stage1-hidden`.
- `import-notes.html` changed again: run `wordpress-import-screen`.
- `hadith-browser.js` changed: keep `/tools/hadith-data-pull/output/…` paths stable.
Widen its suite to 320/390/820/1280/1440, and release it as **v11.27**.

**New MSA jobs from QR, via the PCA (17 Oct 1:08 pm):**
- **J34** = QR J11: in Blank lines, the word above the paper looks like Trace over. It is **Parked** until the Owner ticks
  A or B in QR J11; read the tick there, never ask again. Then build it in `writing-popout.js`.
- **J35** = QR J12: letter writing practice, each of the 28 letters alone and in its beginning, middle and end forms, as
  Trace over and Blank lines. It is planned and needs nothing from the Owner. **Dispatch it as the next Builder round**
  (`writing-sheet.js`, `writing-popout.js`; the letter list goes in one data file with a completeness check). Promised to the
  Owner: a picture of one letter's sheet before the build is finished.
Both files are shared with QR, so each release sends QR the exact lines and checks.

**One more lesson:** write every PCF time from `date -u`, never by hand. One status line this session carried a typed time
4 minutes in the future; it was corrected at the next write.


The MSA Master Architect, taking over from `session_01M6JYqY9wiowXWGQix9WYAC` at 10:52 am on 17 Oct. This session hands over
early on the Owner's **new rule cost86** (17 Oct 12:44 pm, PCA J86, in the PCF General rules). **Read it; it binds you:**
(A) hand over at about **40%** context, not 75%; (C) **no self wake-ups**: set no `send_later` or check-in of your own. You wake
on the 6-hourly PCA keep-alive, a 📣, an Owner comment or a PCA message, and check Builder results at those wakes;
(D) a shared-script change notice to QR gives **the exact lines and the names of the checks that cover them**.
The 9:00 am block below is kept as history.

**Released in this stretch** (each has its J29 Done line with W-T-P-E-O and its What's New line):
- **v11.24 (#923, round #922, audit part 31):** screen-reader names on MSA's pages, English and Bangla. Monitor's ◀ ▶ and its
  date and month fields, and the Import file field, had no name. The Dua cards on tablets were clean. **Fixed in review:**
  `wordpress-import-screen` pinned the file input's exact markup and broke on the new `aria-label`; it now checks for one
  `.xml` picker, never `multiple`.
- **Test-only (#926):** `bangla-sweep-lib.mjs` accepts the proper names MSA and "Open Islamicate Texts Initiative". It had
  been 222/2 on `main` since v11.15 and is now 224/0. Removing the About line's Bangla still fails it (J29 j29p31, answered).
- **v11.25 (#927, round #925, audit part 32):** new `app/js/modal-focus.js` (`trapModal`). Tab stays inside the bookmark
  dialogs, the folder pickers and the Note-window dialogs. Closing a dialog, Note window or folder window returns focus to
  its opener. **Shared note scripts changed** (`note-window.js`, `bookmark-popover.js`, plus the new file they import).
  The PCA was sent the exact lines and the checks.

**Where things stand (1:05 pm Sydney, 17 Oct):** `main` is at **v11.25**. **In flight: Builder round #928** (issue #928,
run 1441, dispatched 11:54 am): audit part 33, a visible keyboard focus on every MSA control and a Tab order that follows
the screen. At your first wake:
1. If it has finished, open its PR if the Builder did not (#925's run opened none).
2. Merge `main` in.
3. **Widen its suite's `WIDTHS` to 320/390/820/1280/1440.** Both #922 and #925 shipped suites covering only 390/1280.
4. Run every mutation, the suites of each file it touches (a CSS focus rule touches many pages, so include
   `phone-width-overflow`, `audit-part28/29/30` and `qr-stage1-hidden`), `behaviour` once and `load-speed-check`.
5. Release it as **v11.26** (read the number off the ledger) and update the PCF.
Next after that: the rest of J29's audit, in the order of the PCF User Manual (keyboard and screen-reader passes are new
dimensions; Hadith, Dua, Seerah and the shared tools only, per PCA J71). Then the Architect's backlog in `ARCHITECT.md`.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24.

**Lessons from this stretch:**
- **A fresh container cannot import `playwright`**: it is installed globally, and ES modules ignore global packages. Run
  `mkdir -p node_modules && ln -sfn /opt/node-tools/node_modules/playwright node_modules/playwright && ln -sfn
  /opt/node-tools/node_modules/playwright-core node_modules/playwright-core`. `node_modules` is ignored by git. Without it,
  every browser suite "fails" in a second with `ERR_MODULE_NOT_FOUND`; read the log, not the count.
- **The clone is shallow**: `programme-ledger` reports a baseline "not an ancestor of origin/main" until
  `git fetch --unshallow origin` and a fetch of all branches. Unshallow before believing it.
- **An accessibility attribute breaks any check that pins exact markup.** Run every suite that greps the changed HTML file
  (`grep -l <file> tools/i18n-verify/*.mjs`), not only the browser ones. That is how #923's regression was found.
- **Prove a "red on `main` too" claim** by checking out `origin/main`'s `app/` into the working tree, running the suite, and
  restoring with `git checkout HEAD -- app/`. Then file it, or fix it if it is test-only and small (#926).

## LATEST UPDATE — 17 Oct 2026, 9:00 am Sydney, session `session_01M6JYqY9wiowXWGQix9WYAC` (v11.17 → v11.23), refreshed 10:50 am — READ THIS FIRST

The MSA Master Architect, taking over from `session_01QrqatzKibuMLUrZsW4AgCr` at 9:55 pm on 16 Oct. The 8:35 pm block below
is kept as history.

**Released in this stretch** (each has its Done line in PCF MSA J29 and its line in the User Manual's What's New; the
release lines are appended below by `allocate-version.py`):
- **Audit part 24 (test-only, #906):** Records page and Continue strip checked working; `zab-data` and `zab-bar-browser`
  repaired.
- **v11.18 (#908):** Continue chips carry `back=1` and the topic-study pages show ← Back; hidden modules no longer use up
  the strip's five places. **Fixed in review:** the first build mounted the Back from the shared Bookmark menu and drew a
  SECOND ← Back on `quranrevival.html`, `bookmarks.html` and `asma-study.html`.
- **v11.19 (#911):** Topic study (Deen, Arabic, Hadith) checked; 40px tabs; Breakdown note in Bangla (`way-modal.js`, shared
  with the Qur'an page). `arabic-study` is deliberately not in `load-speed.mjs`.
- **Round #910:** nothing to fix (j29p3 was already fixed in v11.13).
- **Suite health sweep (#917, test-only):** all 129 MSA suites on `main`, **no app defect**; repaired
  `hadith-source-rights` (decision 89's hadith-api grant now cited), `audit-part18` (Continue `back=1`) and `audit-part17`
  (clipboard origin hardcoded to :8080). Report: `docs/reports/2026-10-17-msa-suite-health.md`.
- **v11.20 (#914):** the smallest phone with real-length names (Notes, Mapping My Journey, Bookmarks, Zab).
- **v11.21 (#916 + MSA J33):** Note windows, Bookmark menu and dialog, Zab → Note at 320px; **J33 = the Owner's QR J04**
  (bigger Word card percentage circle), copied byte for byte into the frozen `quranrevival.html` on the PCA's request.
- **v11.22 (#919):** audit part 29: the window ⋯ menu sheet clears the switcher bar; the bookmark dialog's unit buttons 40px and it fits a 320×568 phone.
- **v11.23 (#921):** audit part 30, the third pass at tablet width (768–820px) with real-length content: a Note window's
  title wraps instead of being cut, in every window (`note-window.css`, a shared note script; the PCA was sent the change
  notice and relayed it to QR).

**Where things stand (10:50 am Sydney, 17 Oct):** `main` is at **v11.23**. **In flight: Builder round #922** (issue #922,
audit part 31: Bangla accessible names on the MSA pages, and the Dua cards at tablet width). When its run ends, open its
PR if the Builder did not, merge `main` in if its base is older than v11.23, review by measurement (its suite at
320/390/820/1440 in en and bn, every mutation, the suites of each file it touches, `behaviour` once, `load-speed-check`),
release it as the next free version (v11.24 unless something else took it; read it off `main`), send the PCA a change
notice if a shared note script changed, and update the PCF (J29 Done line with W-T-P-E-O, What's New, `p/mmsa.monitor`).

**Every MSA section of the User Manual has now had a first pass (parts 11–26) and a 320px real-length second pass
(parts 27–29).** The tablet third pass began in v11.23. Next, in this order: the Owner's new words in the PCF; any `PCA ▸` change
request; the rest of the tablet pass (#922 and whatever its review finds); then the Architect's backlog in `ARCHITECT.md`.
**Waiting on the Owner only:** MSA J02, J05, J06, J07, J20, J22, J24.

**PCF rule changes today:** J82 (17 Oct): a job that only reports is status `report` ("Reporting"), never "Needs you"
(J15 and J33 moved). Keep-alives are now every 6 hours.

**Lessons from this stretch:**
- **Dispatch a Builder round only when no `claude.yml` run is in progress.** A queued dispatch is displaced by bot
  comments on an open PR (`issue_comment` runs in the same concurrency group): #910's first start was cancelled that way
  and lost 1 h 50 min.
- **A round dispatched before the previous release merges branches from the older `main` and can redo its fixes**
  (#918 redid two of #916's); merge `main` in and keep the released version where they overlap.
- **The Builder often ends without a PR** (#909, #912, #915), and **runs out of turns on compound shell commands** (#912
  spent 105 turns, mostly refused `;`/`&&` chains). Every issue now says: one command per call.
- **Pass `allocate-version.py`'s MILESTONE and CHANGELOG from files** (`"$(cat file)"`): an apostrophe ("Qur'an") in a
  shell-quoted argument silently emptied both once.
- **A suite that hardcodes `localhost:8080` passes on the Builder and fails on any other port**; use the harness `BASE`.
- **A review must run every suite that asserts a URL the round changes** (v11.18 missed `audit-part18`).
- **Shared-code changes need a side-effect probe**: compare the pages that use the shared file on `main` and on the branch
  (v11.18's duplicate Back was found that way, not by the round's own suite).
- **Container restarts are frequent here** (four in this stretch): they kill servers and background runs. Run long jobs as
  tracked background tasks, write each result to a file as it finishes (`.done` files), and throw away results recorded
  while the server was down (`0 passed`).
- **Never `pkill -f` a name in your own command line** (it killed the shell once again); kill by PID.

## LATEST UPDATE — 16 Oct 2026, 8:35 pm Sydney, session `session_01QrqatzKibuMLUrZsW4AgCr` (v11.02 → v11.16) — READ THIS FIRST

The MSA Master Architect (MMSA was renamed **MSA, Madrasah Study App**, by the Owner at 5:36 pm; the project id,
repository and database paths stay `mmsa`). This session was summarised once and has run long; a fresh session
should take over from here.

**Where things stand.** `main` is at **v11.16** (read it off `app/js/version.js`). The release lines v11.02–v11.16 are
appended below this block by `allocate-version.py`. **In flight: Builder round #902** (issue #902, dispatched 09:16 UTC):
the User Manual's Bookmarks and Zab features checked end to end, plus their loading speed. When its run completes, open
its PR if the Builder did not, review by measurement (its suite at 320/390/820/1440 in en and bn, each mutation, the
`bookmark*`/`zab*` suites, `load-speed-check.mjs`, `phone-width-overflow`, `qr-stage1-hidden`, `behaviour` once),
allocate the next version, merge, and update the PCF (J29 Done line with W-T-P-E-O, What's New, `p/mmsa.monitor`).

**New rules from the Owner and the PCA today — all binding:**
- **One home for every app part (PCA J71)**, recorded in `CLAUDE.md`: Asma, LDOG and Quran Study live in QuranRevival
  (its own repository and Architect); MSA keeps Hadith, Dua, Seerah and the shared tools (Notes / Mapping My Journey,
  sign-in, Records, Bookmarks, Zab). **MSA's Quran Study, Asma and LDOG are frozen** (safety fixes only; the PCA has
  made two one-line exceptions, v11.13 and v11.15). Every change to a shared in-page note script (`note-window.js`,
  the Notes pane, the Zab bar, "file this note") gets a change notice to the PCA with its commit; if the PCA session is
  inactive, write the notice into the PCF (as done in J29 for v11.15). Keep `/tools/hadith-data-pull/output/…` paths
  stable: QR reads them.
- **Ask only what changes what you do (PCA J70).** MSA has no open Owner questions now: J30 Q1 closed, J03 Q1 and
  J29 17(b) passed to QR.
- **No stale "working" labels (PCA J74):** a job may show "working" only with a line or act stamp from the last 3 hours.
  J17, J19, J23, J25, J30 were marked Done and J03 Parked today.
- **Work cost-effectively (cost76):** run only the tests that cover a change, the full behaviour suite once before a
  release; no padding rounds; short messages.
- **Loading speed in every audit (J29, the Owner's idea):** `tools/i18n-verify/load-speed.mjs` (v11.16) measures a page
  on a slowed phone connection, first and return visit, 390 and 1400px; `load-speed-check.mjs` fails a page more than
  20% slower than `docs/reports/2026-10-16-load-speed-after.json`. Each audit round measures its pages and fixes the
  slowest first.

**Parked, unpublished:** QR's Asma wheel-label fix (QR commit 67bb95b) is in this container's `git stash` only; the
PCA said park it (Asma moves to QR). A safety check blocks committing code copied from another repository: do not
work around it.

**Next rounds, after #902:** the remaining shared-tool sections of the manual not yet audited (Records page, the
Continue strip if not covered), each with its speed check; then Hadith/Dua again only when something changed.
Seerah has no module yet.

**Routines:** the PCA keep-alive (every 3 hours) and the shared 4-hourly check stay. This session's one-shot
wake-ups have all fired.

## LATEST UPDATE — 16 Oct 2026, 1:45 am Sydney, session `session_01VugmUfoMMcfxmnW99UmXgm` (v10.63 → v11.01) — READ THIS FIRST

The 15 Oct evening block below is kept as history.

**Released in this stretch** (each has its Try line in its PCF job, and its line in the User Manual's "🆕 What's New"):
- **v10.64:** audit part 8 (round #858). QCR collection controls and the Trash ← Back are 40px.
- **v10.65:** audit part 9 (round #860). The QCR āyah-number badge is a pill; the verb table and the Mushaf view were audited clean.
- **v10.66:** built by the Architect. The wheel's "Take an Approach" pill is its drawn size again, with an invisible 40px tap area. v10.62 had pushed it out of the hub on 320–360px phones (`wheel-centre-browser` failed 14 checks that v10.62's review never ran).
- **v10.67:** audit part 10 (round #863; the run opened no PR). The QCR and Asma wheels' outer labels are whole (`roomForNumbers`).
- **Test-only, PR #865:** `tablet-wheel-browser`'s 700px floor went from 650 to 635, updated in place. v10.53's 40px tabs took 6px by design (bisected to 04878941).
- **v10.68:** audit part 11 (round #866). The first round to check that each User Manual feature WORKS ("Qur'an: reading"). One fix: the ⋯ tools panel ran off a 320–390px screen.
- **v11.00: QR Stage 1 (PCF J30; the PCA's J50 hand-over; the Owner's three answers, A/A/later).**
  - The app is now QuranRevival. General Study, Nature-Life, Life Skill and Health are hidden by one list, `HIDDEN_FROM_QR` in `app/js/hidden-modules.js`, read by `nav.js` and `continue-strip.js`. Nothing is deleted, and each page still opens at its own address.
  - About says so in English and Bangla, and the User Manual is updated.
  - The Owner asked for the next whole version.
  - The first allocation sat on a stale base (v10.67); it was reverted and re-done on v10.68.
- **v11.01:** audit part 12 (round #870; no PR). The full-screen Āyah card was 16px too tall; the floating Word card opened over the nav row.

**In flight:**
- **Builder round #872**, audit part 13: the manual's "Qur'an: recording progress and status" section, each feature checked working. Dispatched about 1:44 am, 16 Oct. Review it by measurement and release it as **v11.02**.
- The next manual sections after that: Explore; Asma ul Husna; Notes and Mapping My Journey; Zab; Bookmarks; Writing; Hadith and Dua; teaching pages.
- **Skip** "Other study modules" except Deen Study, Arabic and LDOG: General Study, Nature-Life, Life Skill and Health are hidden and on hold (PCA).

**Waiting on the Owner** (tick lists in every report):
- **J30:** v11.00 vs v11.01 for the Stage 1 release (default A, v11.00, as done).
- **J30:** keep a `legacy-v10/` copy like v07–v09 (default A, yes; **not made yet**. When the Owner ticks, copy `app/` as released at v10.68, merge commit 075bc90c, with `js/sw-register.js` registering no service worker, and add it to `brief-integrity.mjs`'s archive checks, as for legacy-v09).
- **J03 Q1:** which keys to add.
- **J29 17b (optional):** a shorter name for the Asma group "All Knowledgeable, All Encompassing, Watches, Hears everything", which is cut on a 1440px wheel in English.

**Holds (PCA J50):**
- No new work in General Study, Nature-Life, Life Skill or Health; fixes that keep them from breaking are fine.
- Nothing for Stage 2 (QR on its own site) until the PCA says.

**Lessons from this stretch:**
- **A round that resizes a control must run the suites that own that control's geometry,** not only its own. v10.62 broke `wheel-centre` silently for four releases.
- **Read the PR's base before allocating.** A Builder dispatched before the previous release merged branches from the older `main`; `git merge-base --is-ancestor origin/main HEAD` must say yes first.
- **The Builder often ends without a PR** (#863, #870), and #866 opened one late. Wait until the branch is quiet for about 15 minutes, check the run, and open the PR yourself.
- **Read a suite's exclusions and its positive-control numbers.** #863 left slice captions out; measuring them found one more cut label.
- **A screenshot that is not the app is not an app task.** The Owner's "make these bigger" picture was the PCF page, so it went to the PCA (J59).
- Run browser suites for a branch from a `git worktree` on `PORT=8082` with `QR_BASE`, with `node_modules` symlinked to `/opt/node22/lib/node_modules`. The repository root needs the same symlink; it is gitignored.

## LATEST UPDATE — 15 Oct 2026, evening, session `session_011ZoZQoxPx6xnm1mzR5hSYn` (v10.56 → v10.63) — READ THIS FIRST

The 12:22 pm block below is kept as history.

**Released in this stretch** (each has its Try line in its PCF job, and its line in the User Manual's "🆕 What's New"):
- **v10.57:** audit part 3 (J29, round #844). `app/css/admin-touch.css` gives 40px controls on Asma, Records, Monitor, People, Classes, Homework, Curriculum, Catalogue and Hadith.
- **v10.58:** audit part 4 (J29, round #847). A 68px Zab spacer on phones, 40px nav-menu controls, and menus that scroll inside themselves.
- **v10.59:** the Owner's photo (J25): **the 🧰 docks in the Wheel / Legend / Unit row on a phone** (`[data-zab-dock]`).
  - The floating corner hides while the dock is on screen.
  - Elsewhere the corner sits above pinned bottom bars (`[data-zab-lift]`: `#tabRow`, `#readQuickRow`).
  - Built by the Architect; suite `zab-dock-browser`.
  - The Owner also confirmed **Zab works on the live Rules** ("Working", J25).
- **v10.60:** audit part 5 (J29, round #850). admin-touch on six more pages, plus the study modules' person picker.
  - Two stale Dawah checks were repaired: the Zab Rules file was missing from `dawah-boundary`'s published list, and `dawah-screen` now accepts `?back=1`.
- **v10.61:** the Owner's J26 choice **A**. Know Your Status shows "Before Al-Fātiḥah: Aʿūdhu billāh ● · Bismillah ●" under each Approach, and the band is capped on wide screens. Built by the Architect; suite `kys-opening-line-browser`. **J26 is done.**
- **v10.62:** audit part 6 (J29, round #853). 40px buttons on the Qur'an page's wheel pill, Read bar and Explore, and "+ New Note".
  - The Notes window's ✕ was off a 320px screen and is back.
  - The review added a 320px case so the `rnpback` mutation can fail.
- **v10.63:** audit part 7, item 1 (J29 item 12, round #856). The "← Back to Know Your Status" pill no longer covers the Approach tab (`bookmark-nav.js` respects `[data-zab-lift]`). `quran-my-status-browser` runs to the end again.

**New PCF General rules, both in `CLAUDE.md`:**
- **Time on every update (PCA J45):** a full UTC `at`, read off the clock. **Read the clock every time** — this session twice wrote a guessed time and had to correct it.
- **🆕 What's New (PCA J46):** one line per release at the top of `p/mmsa.manual`, written in the same step as the release.

**In flight:**
- ~~Builder round #858~~ **released as v10.64** (6:20 pm, 15 Oct, session `session_01VugmUfoMMcfxmnW99UmXgm`): QCR collection controls and the Trash Back button at 40px. Left in J29: the verb table (not audited), the Mushaf view's rendered pages (not measurable here), and the 22px QCR āyah-number badge (older, found in review). The PCA then lifted the hold for audit fixes in QR modules: round #860 (PR #861) released as **v10.65** (the badge fixed; verb table and Mushaf clean). **Found in that review:** `wheel-centre-browser` fails 14 since v10.62 (the 40px Take an Approach button pokes out of the hub at 320/360px): **fixed in v10.66** (drawn size again, 40px tap area via `::before`). **Lesson: a round that resizes a control must run the suites that own that control's geometry (here `wheel-centre-browser`), not only its own.** Then round #863 (wheel labels cut at the wheel's edge) released as **v10.67**; its run opened no PR, so the Architect did. **Open in J29:** one Asma slice caption cut at 1440 en (wording); `tablet-wheel-browser` fails 2 on main (landing wheel 638–644px at 700, wants 650), traced to v10.53's 40px tabs (by design) and the check updated (PR #865). Round #866 (audit part 11: the manual's reading features each checked WORKING) released as **v10.68**. **QR Stage 1 (PCF J30, from the PCA's J50 hand-over):** hide General Study, Nature-Life, Life Skill and Health from every entry point, nothing deleted; Builder round #868 dispatched 11:04 pm; the Owner wants it released as **v11.00** (two tick questions in J30: v11.00 vs v11.01, and a legacy-v10/ copy). **Released as v11.00** (PR #869; About says the app is now QuranRevival). **New PCA hold:** no new work in General Study, Nature-Life, Life Skill or Health.

**THE QR SPLIT (PCA J50, the Owner, 15 Oct ~5:30 pm):** QuranRevival becomes its own separate site and app (Qur'an, Hadith, Dua, Asma and "LDOG"); MMSA stays for Madrasah use. The PCA recommends the same Firebase, a start at madrasatul-muslimeen.github.io/quranrevival/, and a new QR Master Architect from 16 Oct; MMSA removes those parts only after QR is live and redirects work. **Until the PCA sends the hand-over list: start NO new work inside the QR modules beyond fixes already in flight** (round #858 is the last such).

**Waiting on the Owner** (tick lists in every report):
- **J03 Q1:** which keys to add.
- **J50 (PCA-led):** split QuranRevival from MMSA.
  - The facts were sent to the PCA, and the PCA now recommends QR 1 (its own home and menu on the same site, one Firebase).
  - **No split work until the Owner ticks.**

**Lessons from this stretch:**
- **A pinned bar stays on screen while the page scrolls.** v10.58 measured only at the page's end and missed the 🧰 over the tabs; the Owner's photo found it. Measure covering part-way down the page too.
- **Measure at 320px.** v10.62's Notes-window defect existed only there, so its mutation could not fail at 390.
- **An unproven mutation is a finding:** chase it until it fails for the right reason.
- **Never `pkill -f` a name that appears in your own command line;** it killed the shell and both servers.
- **A container restart loses background checks.** Write each check's result to a file in the scratchpad as it finishes, so a restart only costs the unfinished ones.
- **A PCA relay can say a job is filed before it is.** Confirm the write succeeded before replying "filed".
- **The issue body must not contain `@claude`.** It starts a second, duplicate run (#1290 did). Start rounds only with `workflow_dispatch`.
- **Old stale checks found on `main`:** `dawah-*` (fixed in v10.60) and `quran-my-status-browser` (fixed in v10.63). Run the suites of the area a round touches, not only the round's own.

## LATEST UPDATE — 15 Oct 2026, 12:22 pm Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.50 → v10.56) — READ THIS FIRST

**Released in this stretch** (each has its Try line in its PCF job):
- **v10.51 and v10.53**: audit part 1 (J29). The Qur'an face in Bangla, 40px targets, the Unit pill grid, popups below the nav, the Āyah card heading and ladder, and Bangla digits.
- **v10.52**: Keys to Understanding K2 (J03). The saving layer and a Rules candidate (`docs/governance/2026-10-15-ayah-keys-candidate.rules`). This is **not** published.
- **v10.54**: audit part 2 (J29). 40px targets on Mapping My Journey, Bookmarks and the Hadith pickers.
- **v10.55**: **Zab switched on** (J25).
  - The Owner published the Zab Rules ("Published") and said in the chat "Yes, switch Zab on".
  - `firestore.rules` now equals `docs/governance/2026-10-14-zab-candidate.rules`, and `zab-readiness.js` is `ready: true`. See `docs/reports/2026-10-15-zab-enabled.md`.
  - Not yet proved live: the Owner's first Try will show whether the live Rules accept Zab's writes (add an item in 🧰, reload, and it is still there).
- **v10.56**: Arabic word boxes in the Word card's Intermediate "Meanings of this word" rows (J23). Also the Owner's **W-T-P-E-O** rule in `CLAUDE.md`.

**In flight:**
- **Builder round #844**: audit part 3, covering Asma ul Husna, the Writing sheet, Dua cards, Records, Monitor, People, Classes, Homework, Curriculum and Catalogue.
- Its branch is `builder/issue-844-run-1286`. It was dispatched at 11:25 am, 15 Oct, and had opened no PR at 12:08 pm.
- **Next:** review it by measurement and run every mutation it lists. Run `behaviour.mjs` and `phone-width-overflow.mjs`. Note that the Zab bar is now on every page, so check it covers no page's bottom controls. Then open the PR yourself if the Builder did not, release it as the next version, and dispatch the next round.

**Waiting on the Owner** (keep these in every report, as tick lists):
- **J25:** try Zab once, to prove the published Rules work.
- **J26:** one tick for Know Your Status: A, one small line under each Approach (recommended), or B, leave it.
- **J03 Q1:** which keys to add.

**The PCF routines now in force:**
- **PCA J37:** rewrite `p/mmsa.monitor` at every step, and stamp `act {at, by:"MMSA", what}` on every job you write.
- **PCA J39:** every finished job ends its Done line with a one-line W-T-P-E-O check.
- **"Important" marks:** check for `important: true` and `imp: true`, and do those first.
- **PCA J43:** when the session gets long, write this block and send the PCA "PCA ▸ handover ready".

**Lessons from this stretch:**
- Changing `firestore.rules` or a readiness gate needs the Owner's own word in this chat. The session's safety check refused it on a PCF relay alone.
- Run browser suites for a second branch on `PORT=8081 node serve.js` with `QR_BASE=http://localhost:8081`, from a `git worktree`. That way the suites running on :8080 are not disturbed.
- The phone-width suite is `phone-width-overflow.mjs`, not `...-browser.mjs`.

## LATEST UPDATE — 15 Oct 2026, 1:45 am Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.44 → v10.50) — READ THIS FIRST

The 14 Oct block below is kept as history.

- **`main` is v10.50.** **The Zab plan (PCF J25, the Owner's answers 1 B, 2 A, 3 B, 4 B) is complete**, rounds Z1–Z6:
  - v10.45: saving layer and Rules candidate;
  - v10.46: the bar on every page;
  - v10.47: tasks and links;
  - v10.48: ideas and shopping;
  - v10.49: → Note into Mapping My Journey, plus a visible ← Back on `journey-map.html` for `back=1`;
  - v10.50: pockets inside pockets and the phone Drawer.
- **Zab is behind `app/js/zab-readiness.js` (`ready: false`).** Nothing of it shows or reads until two things happen:
  - the Owner publishes `docs/governance/2026-10-14-zab-candidate.rules`. It is final: today's live Rules plus 143 Zab lines, nothing removed. J25 "ready to publish".
  - the Architect then enables the gate with a recorded decision, copying `siyagah-flags-readiness.js`, AND syncs `firestore.rules` to the published file in the same change.

  Then post a Try (phone) line in J25.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner:**
  - J25: publish the Zab Rules.
  - J23: the two questions from the Owner's deleted J27:
    - restore the Arabic word boxes as on Basic, and on which tab;
    - which "Attach" button. The Note editor's 🖼 picker opens the file chooser on a real tap (new check in `journey-note-images-browser`). If the Owner means the PCF's own attach, that goes to the PCA, who alone changes the PCF page code.
  - J26: Know Your Status, A or B.
  - J22: the Owner's tries only.
- **Possible next, with nothing needed from the Owner:**
  - The Owner's standing rule says audit the app feature by feature (the PCF User Manual, J19, is the checklist; it is current to v10.44). Add Zab to the manual first.
  - The J26 polish (cap the band's width on wide screens) is noted in J26's plan.
- **Lessons from this stretch:**
  - Builder rounds often stop early (Z3 pushed no browser checks and no PR); write the missing suite yourself.
  - Look at every screenshot: Z2's item text was squeezed to a few letters wide with every check green.
  - A mutation that crashes with a timeout is detected but uncounted; wrap each width's flow so it fails by name.
  - Read every time off the clock (`TZ=Australia/Sydney date`) and keep the PCF monitor line under an hour old.
  - Cross-check PCA relays against the PCF itself: the Owner had answered 4 Zab choices, not 2.

## LATEST UPDATE — 14 Oct 2026, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.39 → v10.44) — READ THIS FIRST

The 13 Oct block below is superseded by this one and kept as history.

- **`main` is v10.44** (read it off `app/js/version.js`). This session released:
  - v10.40 (J24, the dragged wheel no longer hides Wheel / Legend / Unit);
  - v10.41–v10.43 (J23: level sentences, the top of the card in layout B, the mark choice B question);
  - v10.44 (J26: the "Before Al-Fātiḥah" band; new permanent key `opening:taawwudh`, stored in chunk `surah_1`).

  It also copied the Owner's published guardian Rules into `firestore.rules` (J15, PRs #808/#810; the Owner confirmed a
  student works) and published Scholars Database v1.5 (J17, PR #817).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **New General rules in the PCF, binding on every session:**
  - "Keep working, never idle" (also in `CLAUDE.md`).
  - URGENT/NOW first, dimmed is not ignored.
  - An hourly status (monitor) line with Sydney time.
  - The work-design rule "space and elegance" (14 Oct): calm and tidy, nothing crowded, nothing wasted, lines aligned,
    extra detail one tap away. Look at the screenshots in review.
- **The Project Chief Architect (PCA) session** coordinates through `PCA ▸` lines in the PCF and cross-session
  messages. Act on them within the brief; verify the Owner's own words in the PCF (comments by "You").
- **Waiting on the Owner (tick boxes in the PCF):**
  - J26 Q5: should Know Your Status list the two new items (A, one calm line under each Approach's tiles) or not (B)?
  - J22: remove Tawakkul's Bismillah row with ×, and try saving for everyone.
  - J24: add the Bangla Approach-list heading in the Catalogue.
  - J03 Q1: which keys to add.
  - J20: paste Approach 1's line into the Catalogue.
  - Older: J02, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Next for the Architect:**
  - J25, Zab inside QuranRevival: write the plan once the SIY Architect's "how Zab is built" guide (SIY J02) exists;
    the PCA was asked for it.
  - Otherwise the standing rule applies: audit the app feature by feature (the PCF User Manual is the checklist, J19;
    it is current to v10.44) on phone, tablet and desktop, and file each defect as a PCF job.
- **Review lessons from this session:**
  - Builder rounds #812–#814 each needed one stale check updated in place. The one in `ayah-action-sheet-boundary`
    sat red on `main` from v10.42 until v10.44: run the `ayah-*` suites too when the Word Card's header changes.
  - Re-run the touched suites after merging `main` into a round that touches `quranrevival.html`.

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
- **v10.42** (2026-10-14): the top of the Word card in layout B (PCF J23).
- **v10.43** (2026-10-14): J23 mark choice B: ask before changing the other mark.
- **v10.44** (2026-10-14): J26 Before Al-Fatihah band.
- **v10.45** (2026-10-14): Zab Z1: saving layer and Rules candidate.
- **v10.46** (2026-10-14): Zab Z2: the bar and plain pockets (gated).
- **v10.47** (2026-10-14): Zab Z3: tasks and links (gated).
- **v10.48** (2026-10-14): Zab Z4: ideas and shopping (gated).
- **v10.49** (2026-10-14): Zab Z5: to Note (gated).
- **v10.50** (2026-10-14): Zab Z6: pockets inside pockets (gated).
- **v10.51** (2026-10-14): Audit: Qur'an face in Bangla and on word chips.
- **v10.52** (2026-10-14): Keys K2: saving layer and Rules candidate.
- **v10.53** (2026-10-14): Audit part 1, fixes 3-9 (J29).
- **v10.54** (2026-10-14): Audit part 2 (J29).
- **v10.55** (2026-10-14): Zab switched on (J25).
- **v10.56** (2026-10-15): Arabic boxes in Meanings of this word (J23).
- **v10.57** (2026-10-15): audit part 3, 40px touch targets on the admin and study pages (PCF J29).
- **v10.58** (2026-10-15): audit part 4, room for the Zab button on phones, 40px menu links (PCF J29).
- **v10.59** (2026-10-15): the Zab button moves into the Wheel / Legend / Unit row on a phone (PCF J25).
- **v10.60** (2026-10-15): audit part 5, finger-sized controls on the remaining pages (PCF J29).
- **v10.61** (2026-10-15): Know Your Status shows Before Al-Fatihah under each Approach (PCF J26).
- **v10.62** (2026-10-15): audit part 6, finger-sized buttons on the Quran page (PCF J29).
- **v10.63** (2026-10-15): the Back to Know Your Status pill no longer covers the Approach tab (PCF J29).
- **v10.64** (2026-10-15): finger-sized controls in QCR collections and on the Trash page (J29 audit part 8, PR #859).
- **v10.65** (2026-10-15): the QCR āyah-number badge shows the whole reference (J29 audit part 9, PR #861).
- **v10.66** (2026-10-15): the wheel pill sits inside the centre circle again on a small phone (J29 item 16).
- **v10.67** (2026-10-15): wheel labels no longer cut at the wheel's edge (J29 audit part 10, round #863).
- **v10.68** (2026-10-15): the Read view's ⋯ tools panel stays on a small phone's screen (J29 audit part 11, PR #867).
- **v11.00** (2026-10-15): the app is now QuranRevival: General Study, Nature-Life, Life Skill and Health hidden, not deleted (J30, QR Stage 1; opens the v11 line).
- **v11.01** (2026-10-15): the Āyah card fits a phone's screen; the Word card opens below the nav row (J29 audit part 12, round #870).
- **v11.02** (2026-10-15): audit part 13: the 👥 list and the Approach card's tabs stay on a phone's screen (PCF J29, round #872).
- **v11.03** (2026-10-15): the Monitor's week label names its days plainly, on the right day everywhere (Architect, from audit part 13).
- **v11.04** (2026-10-15): audit part 14: Explore works end to end; its window clears the bottom bar (PCF J29, round #875).
- **v11.05** (2026-10-15): Legacy App - v10: the v10.68 release archived at /legacy-v10/ (PCF MMSA J32).
- **v11.06** (2026-10-15): audit part 16: Hadith and Dua work end to end; a long narration opens at its top; Back to Dua stays on screen (PCF J29, round #881).
- **v11.07** (2026-10-16): Explore Word by Word scrolls itself, so Study this Surah is never under the bottom bar (QR J02 S1).
- **v11.08** (2026-10-16): audit part 18: getting started, Deen Study and Arabic work end to end; finger-sized controls; topic status in Bangla (PCF J29, round #886).
- **v11.09** (2026-10-16): audit part 19: Notes and Mapping My Journey (first half) work end to end; a folder's menu clears the Zab bar (PCF J29, round #888).
- **v11.10** (2026-10-16): OpenITI credited on the About page and under the Ayah card's related hadith (PCA, QR J02 S1c).
- **v11.11** (2026-10-16): Asma: Name 112 Al-Maalik shows its own Arabic, not Al-Maleek's (PCA must-fix).
- **v11.12** (2026-10-16): the Read bar's way back shares a line on a small phone; journey-s9 and journey-folder-menus green (round #891).
- **v11.13** (2026-10-16): audit part 20: Favourites, Archived, Trash and the Evernote import work; no dead ⋯ on the Read bar (round #894).
- **v11.14** (2026-10-16): the bookmark dialog can bookmark a range of ayat (PCA J76, for QR J03).
- **v11.15** (2026-10-16): audit part 21: every Notes feature checked; pop-up windows clear the nav row and bottom bars; My Notes history; the MSA name (round #897).
- **v11.16** (2026-10-16): audit part 22: loading speed measured; Hadith collections draws without waiting for sign-in code (round #900).
- **v11.17** (2026-10-16): audit part 23: Bookmarks and Zab work end to end; New bookmark's Unit picker no longer throws (round #902).
- **v11.18** (2026-10-16): audit part 25: the Continue strip keeps the way back; hidden modules no longer use up its five places (round #907).
- **v11.19** (2026-10-16): audit part 26: Topic study works end to end; 40px sheet tabs; Breakdown note in Bangla (round #909).
- **v11.20** (2026-10-16): audit part 27: the smallest phone with real-length names (Notes, Journey, Bookmarks, Zab) (round #913).
- **v11.21** (2026-10-16): audit part 28: Note windows, Bookmark menu and dialog, Zab → Note on the smallest phone; J33 bigger Word card percentage (QR J04) (round #915).
- **v11.22** (2026-10-16): audit part 29: small-phone pass finished (Note window menu, bookmark dialog on a short phone, menus part-way down) (round #918).
- **v11.23** (2026-10-16): audit part 30: tablets with real-length content; Note window titles wrap in every window (round #920).
- **v11.24** (2026-10-17): audit part 31: screen-reader names in Bangla and English; Dua cards on tablets (round #922).
- **v11.25** (2026-10-17): audit part 32: Tab stays inside dialogs; focus returns on close (round #925).
- **v11.26** (2026-10-17): audit part 33: Tab clears the Zab bar and corner; keyboard focus checked (round #928).
- **v11.27** (2026-10-17): audit part 34: wider text spacing fits a 320px screen; Hadith Arabic marked lang=ar (PCF MSA J29).
- **v11.28** (2026-10-17): the main page renamed Madrasah Study App (MSA) (PCF MSA J36).
- **v11.29** (2026-10-17): a focused button at the edge of the People and Catalogue tables comes fully into view at 320px (PCF MSA J29 j29p33).
- **v11.30** (2026-10-17): letter writing practice in the writing window (PCF MSA J35 = QR J12).
- **v11.31** (2026-10-17): Blank lines example like Trace over, light or dark (J34).
- **v11.32** (2026-10-17): every page tab reads MSA (J36).
- **v11.33** (2026-10-17): audit part 36 colour contrast (J29).
- **v11.34** (2026-10-17): audit part 37 contrast in opened windows (J29).
- **v11.35** (2026-10-17): the 📜 Mushaf button on the Read bar (J37).
