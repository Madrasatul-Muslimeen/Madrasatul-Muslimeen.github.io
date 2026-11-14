# MSA Master Architect 106L: handover, 14 Nov 2026 (~6:50 pm Sydney)

Session `session_01PL2xbJ1D7BJkUxgXiqH21F`, took over from 105L at 4:36 pm 14 Nov. Handing over on the context rule (36%).
`main` = **v14.41** (release #1719 merged 6:39 pm, c395a54a; qr-verify on the 14.41 build: exit 0, all 30 rc=0; brief-integrity
15/0 on main; PCF wn-v1441 + monitor written, v881; "PCA ▸ released v14.41" sent to PCA 42L). The ledger's next number is **14.42**.

**Who:** PCA = **42L** `session_01PL2xbNFxjso7Hon7Z35pEL` (took over from 41L at 5:48 pm; check meta/global.sessionUrl). Keep-alive
`trig_01CgZ6UFuceaSXipSBMzotcq` points at 106L: ask the PCA to move it. QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`.
Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD` (writing its own handover). Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- **v14.40** (#1717, 5:41 pm): #1713 (14L, J106 S2): four Subjects (Loving Rasulullah Sallallahu A'laihi Wa Sallam added, the
  Shamayyl card), Continue chips at the top of Subjects, the old card list hidden on the Hadith page (`?resume=` topics still open).
  QR live 14.40 at 5:44 pm (PCA). Also on main before it: #1716 (14L, tests only: shared-pages dua flows repointed to dua-study.html).
- **v14.41** (#1719, 6:39 pm): #1718 (11L, J104): Qur'anic duas get the Keep-tab group editor (`quran-<s>-<a>` key), Hisn stays
  resources only, drag order (grip + ↑ ↓) in groups the reader may change. The Owner's words were found in 11L's own record at
  2026-11-14T06:14:17Z (desktop app; three pages back past tool output; 11L's summaries only quoted it). Also on main: **#1721**
  (14L, hadithNames Rules CANDIDATE, test files only), merged by the unattended Architect (no protected path); 106L re-checked it
  after the fact: nothing in app/ names hadithNames, firestore.rules unchanged, its emulator suite 1/0.
- Told 47L: the Owner's new wheel bar ships as **v15.00**, and that release also archives the last v14 release as `legacy-v14/`
  (same as every line; brief-integrity file-by-file check, README-ARCHIVE.txt, sw-register change, CLAUDE.md table row).

## NEXT
1. **#1720 (14L, J106 S3 part 1: editable Subject names / order / add / retire, `subjectMeta` map on the existing hadithSubjects
   doc, no Rules change).** Static review done: pure module `hadith-subject-meta.js` deletes nothing (retire = status), writes are
   per Subject (`subjectMeta.<id>` dot paths, so two edits to different Subjects do not collide), names are {en, bn} (I11).
   106L ran: rules-authorisation-executable **128/0**; emulator `hadith-subjects-v1.rules.test.mjs` on the extract AND on
   firestore.rules: both ok. Browser suites were running at handover (see "RESULTS" below if filled in; otherwise run them):
   hadith-subjects-s3 (+ its mutations), hadith-subjects, hadith-subjects-s2, hadith-menu-bar, hadith-topic-surface,
   popup-home-sweep, audit-part26, bn-duplicate-keys, stub-parity; then look at the editor at 360 en / 390 bn / 1280, merge pinned,
   release v14.42. New Bangla strings are `// ?` for the Owner.
2. **47L's wheel bar (v15.00)** when its PR lands: the ~47 suites compared by failing-check NAME against main, mutations,
   screenshots; release v15.00 with `legacy-v14/` in the same release.
3. 11L: an open Owner question in J104 (move Hisn "Dua by Occasions" out of the Dua groups menu to a Resources place?). Build
   nothing until the Owner ticks (dua130).
4. The hadithNames candidate (#1721) waits for the Owner to publish (an Owner Control Gate); put it in the monitor's "What I need
   from you" with a tick box when 14L's S3 part 2 UI is ready to use it.

## OWNER WAITS (in the PCF monitor; never re-ask)
- Phone checks v14.41, v14.40, v14.39 … v14.30 as listed; J120 n120r; J136; J120 n120q; J119 n119g; J104 line 26 (Dua groups Rules
  box); Hadith book 46 Bangla, book 65 range, group Bangla names; 47L's Wheel-switch tick; Bangla for "Loving Rasulullah".

## Known red on clean main
- As in 105L's handover (audit-part16/21/33/36, dua-check 47/2, manual-claims 487/9, bangla-sweep-newer-screens, 104L's list).
- Release PRs are ALWAYS red before merge on exactly three checks that read origin/main (programme-ledger 1, its mutations 1,
  brief-integrity 1); say so once on the PR; they pass after the merge. Locally, programme-ledger's "not an ancestor" fails are the
  shallow clone.

## Lessons
- **Give a background batch a long timeout** (`timeout: 3600000`): a 10-minute one was killed mid-run and three suites had to be
  re-run.
- **A container restart loses running work** (qr-verify was lost once): re-run it; the QR clone and node_modules survive.
- **The unattended Architect can merge a PR that touches no protected path while you are busy** (it merged #1721): before a
  release, `git log release..origin/main`, merge main into the release branch and add a CHANGELOG line for anything new.
- **The emulator** needs `cd tools/firestore-emulator && npm ci` once; pass `RULES_FILE` as an ABSOLUTE path.
- **Finding an Owner's answer in a Lead's record**: `list_events kinds=["user"]` pages are mostly tool results; page back with
  `before_id` until a `client_platform` user message with the words appears. A summary quoting it is not the record.
- **Test a Lead PR in a worktree** (`git worktree add /tmp/claude-0/wtNNNN pr<N>`, merge origin/main, symlink node_modules, run
  serve.js there) so the main checkout can stay on a release branch.

## RESULTS (filled at handover if the run finished)
