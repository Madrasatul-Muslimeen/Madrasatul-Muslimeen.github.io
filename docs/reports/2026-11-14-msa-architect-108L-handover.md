# MSA Master Architect 108L: handover, 14 Nov 2026 (~10:40 pm Sydney)

Session `session_01PL2xbMAL8Z7bNz2GwnRdrP`, took over from 107L at 7:54 pm 14 Nov. Handing over on the context rule (~28%).
`main` = **v15.01** (ad1ce0c), then #1729 (f07c465, docs/tests only). The ledger's next number is **15.02**.
QR live **15.00** (PCA, 9:58 pm); 15.01 rebuild asked of the PCA at ~10:35 pm.

**Who:** PCA = **42L** `session_01PL2xbNFxjso7Hon7Z35pEL` (keep-alive trig_01SagnUCYMRouTXK8HERcRGC points at 108L: ask the PCA
to move it). QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`.
Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- **v15.00** (release #1727, merged pinned 9f907b0 → 8553ad8): #1724 (47L's one wheel bar) + `legacy-v14/` (107L's branch) + one
  check fix: `behaviour.mjs` 43a/43b still required the retired `#wheelIntroSettled` row; updated in place to assert `#wheelBar`
  (mutation: bar `hidden` → exactly 43a/43b fail). Checks: wheel-bar 152/0, both mutations fail by name; the 44-suite sweep
  PR vs main by failing-check NAME: only the 7 known (wheel-centre 320 en ×6, large-text 1024 ×1); behaviour main 968/7 = release
  968/7; qr-verify 30/30. QR live 15.00.
- **v15.01** (release #1728, merged pinned 6d63b99 → ad1ce0c): #1726 (14L, hadithNames writer + UI, **switched OFF**,
  `HADITH_NAMES_PUBLISHED = false`), `offline-files.json` regenerated (the PR missed it). Checks: hadith-names 30/0, `--prove` 8/8,
  emulator ok + my 3 write-plan mutations caught, Hadith suites green, qr-verify 30/30.
- **#1729** (f07c465): `docs/proposals/hadith-names.DEPLOYMENT-candidate.rules` (= firestore.rules + exactly 14L's block), the
  Owner's guide `docs/governance/2026-11-14-hadith-names-rules-publish-guide.md`, `FULL_RULES_FILE` mode in
  `hadith-names-v1.rules.test.mjs` (`npm run hadith-names-full`), 5 HADITH NAMES checks in rules-authorisation-executable (133/0,
  each mutation-proven). **firestore.rules unchanged.** The Owner's ☐ Published tick is in the PCF monitor.
- PCF: wn-v1500, wn-v1501, monitor v892 (ticks: v15.00 phone check, 320px pill choice, Hadith names publish).

## NEXT
1. **When the Owner ticks "Published" (Hadith names):** one release (v15.02): `firestore.rules` = the deployment file byte for byte;
   `HADITH_NAMES_PUBLISHED = true`; add hadithNames forward/backward checks; update in place the DUA GROUPS checks that pin
   firestore.rules byte for byte (they will fail by name: expected); re-run hadith-names-browser and
   `FULL_RULES_FILE=firestore.rules npm run hadith-names`. If firestore.rules changes before then, REBUILD the deployment file
   (the HADITH NAMES deployment check fails until you do).
2. **47L's 320px pill finding (a):** when the Owner ticks "hide 40 Ways below 360px", ask 47L for the round.
3. **14L:** demo of a per-hadith study-status stripe (https://claude.ai/artifact/2hBQqjhRkj6pXmy9TFZcd9) waits on 3 Owner answers;
   nothing built. 14L writes its own handover before its context runs out.
4. **11L:** the J104 question (Hisn "Dua by Occasions" to Resources?); build nothing until ticked.
5. Nothing else in flight. With no job, audit per the PCF rule (User Manual as the checklist, phone/tablet/desktop).

## OWNER WAITS (in the PCF monitor; never re-ask)
NEW: v15.00 phone check (the wheel bar); the 320px pill choice; Hadith names Rules publish. Earlier: phone checks v14.42 … v14.30;
J120 n120r; J136; J120 n120q; J119 n119g; J104 line 26; Hadith Bangla names; 47L's Wheel-switch tick; Bangla for "Loving
Rasulullah"; 11L's J104 question.

## Suite setup (this container's lessons)
- Worktrees need `ln -sfn /opt/node-tools/node_modules node_modules` (ESM import of playwright otherwise fails).
- Several serve.js at once: `PORT=808x node serve.js` + `QR_BASE=http://localhost:808x` (harness reads it). behaviour.mjs takes
  ~15–20 min here, not hours. Four browser runs on 4 CPUs caused one timeout (wheel-centre on main): re-run alone before believing.
- wheel-centre-browser stops at the page-number picker (network) on main AND PR after the same 590 checks: pre-existing.
- programme-ledger fails 4 ancestor checks in a SHALLOW clone; `git fetch --unshallow origin main` and it is 0 fail.
- brief-integrity needs `git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring` for 16/0.
- Emulator: `npm install` in tools/firestore-emulator (java present). qr-verify: `QR_REPO=/tmp/claude-0/qrrepo bash
  tools/apps/qr-verify/run-all.sh` after `build-app.mjs qr`; logs in build/qr-logs. student-browser hit one CORS fetch to the
  live site once (503/0 on rerun).

## Lessons
- **A mutation caught by the SDK is not caught by the check**: a retire mutation writing `undefined` was refused by updateDoc
  itself; read the failure text, then write the mutant so only the check under test can refuse it.
- **A suite that asserts "this file governs only X" needs a full-file mode** before it can prove a deployment file.
