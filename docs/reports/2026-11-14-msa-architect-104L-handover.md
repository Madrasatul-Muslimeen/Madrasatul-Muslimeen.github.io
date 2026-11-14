# MSA Master Architect 104L: handover, 14 Nov 2026 (~10:15 am Sydney)

Session `session_01PL2xbNKSqgPsaDCu5JU81N`, took over from 103L at 8:20 am 14 Nov. Handing over on the 30%-context rule.
`main` = **v14.37** (release `9f154a65`, 10:48 am: Dua chapters on the Dua page, #1705); QR picks it up on its hourly look (the
PCA confirms). qr-verify on the 14.37 build: all 31 checks rc=0. PCF What's New wn-v1437 + monitor written; "PCA ▸ released v14.37"
sent. The ledger's next number is **14.38**. Also merged (unattended, docs only): #1708, the Dua edit demo v1.11 (Owner tick J104
n104edit27 pending).

**Who:** PCA = **40L** `session_01PL2xbLp4Ei1eEqRAVoFcZj` (or newer in meta/global.sessionUrl); keep-alive
`trig_01RiTunwv6BjuFJNLSjBKPiu` points at 104L: ask the PCA to move it. QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`.
Hadith Lead = **14L** `session_01PL2xbNbDNZXULwY3eGdqPD` (13L is closed). Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- **v14.35** (#1700): #1695 + #1696 + #1698 (Dua groups pop-up) with my way-back commit 9057d753 (`?dgp=admin|mine[~id]`).
- **v14.36** (#1704): #1699, #1701 (47L: chip words, Bangla kind row, Learn the Next Word, Difficulty Level), #1702, #1703 (13L:
  Topics tab off, Learning Stories), and my in-place fix of `word-effort.mjs`'s deployment-file check (red on main since #1696).
- **v14.37** (#1706): #1705 (11L, Dua chapters on the Dua page, the Owner's tick 7A).
- **Hadith menu redesign (PCF J106 n106i)**: demo first, the Owner ticked 1B 2B 3A 4A 5B 6A 7A. Agreed with the Leads:
  S1 (14L, branch `claude/hadith-menu-s1`, PR not yet open): bar + Menu + Settings + removals + Dua ↗ link with 11L's redirects;
  the Prime preview banner and Person picker MOUNTED unchanged; while a "View as" preview is on, the Menu button shows a visible
  cue (rendered check). S1 may remove the Hadith Dua tab now (#1705 is on main). S2 Subjects. S3 editable subject list ONLY after
  a Rules candidate 14L writes, I review (emulator + rules-authorisation-executable both ways), and the Owner publishes.
- Dua Lead 11L next: the dua edit screen (place a dua in an Admin group; wire dropStalePlacements): demo first, Owner tick in J104.

## OWNER WAITS (in the PCF monitor; never re-ask)
- Phone checks v14.36, v14.35, v14.34, v14.33, v14.32, v14.31, v14.30; J120 n120r; J136; J120 n120q; J119 n119g; J104 line 26
  (Dua groups Rules tick box, the Owner's own); Hadith book 46 Bangla name, book 65 range, group Bangla names; 47L's PCF tick on
  showing the Wheel switch outside the Wheel drawer on phone/tablet. One note for the Owner: the preview cue on the Hadith Menu.

## Known red on clean main
- `ayah-step-all-views-browser` [360] Mushaf (31/1); `quran-flow-step-nav` precondition (29/1); per 47L: vocab-wheel 110/4,
  wbw-rebuild 132/4, stem-mark 136/8, word-card-small-arabic-size-browser (62, stale 90% sizes; 47L queued its own round).

## Lessons
- **Way-back law on pop-ups**: a link inside a pop-up to another view must bring the pop-up back on Back; keep its state in the
  address (`history.replaceState`), reopen once from the address, wait for sign-in.
- **A Lead's merge of main does not change its diff**: when a PR's head moves after testing, `git log old..new` + `git diff
  old new` on its own files before merging pinned to the new head.
- **Sibling PRs conflicting only on `app/offline-files.json`**: bring them into the release branch, regenerate with
  `node tools/offline/build-offline-files.mjs`; GitHub marks them merged when their commits land.
- **A stale "byte-identical to the deployment file" check after a later Rules sync**: once a candidate is published, the check
  should require the live file to only GAIN lines (subsequence), not stay identical.
- This sandbox clone is shallow: programme-ledger's "not an ancestor" failures locally are the clone, not the ledger (CI notes them).
- qr-verify takes ~45–55 min; stop every serve.js first, run it in the background, review other PRs statically meanwhile.

## Opening message for the next Architect
"You are the MSA Master Architect (105L), taking over from 104L (session_01PL2xbNKSqgPsaDCu5JU81N). Read CLAUDE.md, then
docs/reports/2026-11-14-msa-architect-104L-handover.md (merge its PR first if open, pinned with the full head SHA), then the PCF
https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa. Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin
if_version). main = v14.37 (QR 14.37 once its hourly build runs; check qr-version.js). PCA = 40L
session_01PL2xbLp4Ei1eEqRAVoFcZj (or newer in meta/global.sessionUrl); ask it to move the keep-alive trig_01RiTunwv6BjuFJNLSjBKPiu to
you. QR Lead = 47L session_01PL2xbNAMQAyiv5S52x8NPv. Hadith Lead = 14L session_01PL2xbNbDNZXULwY3eGdqPD. Dua Lead = 11L
session_01PL2xbHyfbrXS8hET9sKE7P. NEXT: review Hadith Lead 14L's S1 PR (Hadith menu redesign, J106 n106i) against the agreements in
this handover. Tell the PCA "PCA ▸ taken over", repeating the handover's open items one by one. Suites need `ln -s
/opt/node22/lib/node_modules node_modules`, `node serve.js`, and for qr-verify QR_REPO=<QuranRevival full clone>; stop every serve.js
before qr-verify; give it 60 minutes. Merge pinned with the full expectedHeadSha. Release with allocate-version.py, then PCF What's
New + monitor, then "PCA ▸ released vX.YY". No self wake-ups. At about 30% context, hand over."
