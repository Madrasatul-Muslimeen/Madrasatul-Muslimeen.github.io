# MSA Master Architect 107L: handover, 14 Nov 2026 (~7:55 pm Sydney)

Session `session_01PL2xbKzARJDhKxLQ4xvkuN`, took over from 106L at 6:55 pm 14 Nov. Handing over on the context rule.
`main` = **v14.42** (release #1723 merged 7:06 pm, bdd96952; qr-verify on the 14.42 build exit 0, all 30 rc=0; QR live 14.42 at
7:48 pm (PCA); PCF wn-v1442 + monitor written, v886; "PCA ▸ released v14.42" sent). The ledger's next number is **15.00**
(allocate-version.py 15.00 15.01 …; the ledger said 14.43 as nextUnallocated, so pass 15.00 explicitly, as the Owner named it).

**Who:** PCA = **42L** `session_01PL2xbNFxjso7Hon7Z35pEL` (keep-alive trig_01BmfCQCxEkpWobWqe2R1gBi points at 107L: ask the PCA to
move it). QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`.
Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- **#1720** (14L, J106 S3 part 1, editable Hadith Subjects) merged pinned at 7bbba554 after: hadith-subjects-s3 `--prove` 9/9
  (each a real FAIL line, each anchor once), rules `hadith-subjects-v1.mutate.sh` 14/14 (every mutant file written), editor looked at
  and measured at 360 en / 390 bn / 1280.
- **Review fix in v14.42**: `overrideName` in hadith-subject-meta.js. An English-only rename of a shipped Subject showed English to
  Bangla readers (measured). New check `tools/i18n-verify/hadith-subject-names.mjs` 7/0, `--prove` caught. 14L agreed.
- **14L's next round (agreed):** the hadithNames writer + UI against the #1721 candidate, kept off/unreachable until the Owner
  publishes; then the Architect adds the candidate block to firestore.rules and puts a publish tick box in the monitor.
- **legacy-v14/ is BUILT and PUSHED on branch `claude/legacy-v14`** (7c9edee, from main bdd96952, no PR yet): app/ at v14.42
  (git archive bdd96952), the one sw-register.js change, README-ARCHIVE.txt, brief-integrity LEGACY_ARCHIVES entry (PASS locally),
  the v14 link beside v13 on all 26 pages, sw.js skips /legacy-v14/, offline-files.json regenerated, CLAUDE.md table row.
  apps-build-check 58/0. **Not yet run: legacy-links-browser** (needs serve.js).

## NEXT: v15.00 = #1724 (47L's wheel bar) + legacy-v14/
1. **#1724** head **b4d68354** (rebased on v14.42). 107L ran wheel-bar-browser **152/0**; looked at 47L's screenshots (fine).
   Still to do: its two mutations (`--mutate=twice`, `--mutate=readlist`, fail by name); the sweep below; behaviour.mjs in full
   (47L made only selector swaps and did NOT run it; it takes hours: background, timeout 7200000).
2. **The sweep** (lost with 107L's container after 2 suites, both 0 fails on the PR): every `tools/i18n-verify/*.mjs` the PR touches
   (44 without behaviour.mjs), on a #1724 worktree and then on clean main, failing checks compared by NAME. ~2 min a suite. Script:
```bash
#!/usr/bin/env bash
# run each suite in $1 (repo dir), tag $2; record exit + FAIL names
D=$1; T=$2; OUT=/tmp/claude-0/sweep-$T; mkdir -p $OUT
pkill -f "node serve.js"; sleep 1; cd $D && (node serve.js >/dev/null 2>&1 &); sleep 3
while read s; do
  n=$(basename $s .mjs); [ -f "$D/$s" ] || { echo "$n MISSING" >> $OUT/summary; continue; }
  timeout 1500 node $s > $OUT/$n.log 2>&1; rc=$?
  grep -E '^\s*FAIL\b' $OUT/$n.log | sed -E 's/^\s*FAIL\s+//' | cut -c1-140 | sort -u > $OUT/$n.fails
  echo "$n rc=$rc fails=$(wc -l < $OUT/$n.fails) $(grep -E '====' $OUT/$n.log | tail -1)" >> $OUT/summary
done < /tmp/claude-0/s1724.txt
pkill -f "node serve.js"
```
   List: `git diff --name-only origin/main...pr1724 | grep -E '^tools/i18n-verify/.*\.mjs$' | grep -v -e harness -e behaviour.mjs > /tmp/claude-0/s1724.txt`.
   Then `comm -13 main/X.fails pr/X.fails` per suite = new failures. 47L reports two real ones (below); anything else is a finding.
3. **47L's two findings:** (a) 320px phone with the banner: the wheel-centre pill cannot hold "Take an Approach" + unit name
   (wheel-centre-browser, 6 en checks). An Owner choice: put a tick box in the monitor (☐ accept ☐ hide the "40 Ways" heading below
   360px); do not hold v15.00 for it. (b) 200% text on 1024x768: one row covered (qr-landing-large-text-browser, 1 check): record as known.
4. Release: merge #1724 pinned; branch from main, merge `claude/legacy-v14` into it (or rebase the legacy commit), run
   legacy-links-browser + brief-integrity + apps-build-check + `node tools/apps/build-app.mjs qr`; allocate-version.py 15.00 15.01;
   CHANGELOG names both; merge pinned; qr-verify on the 15.00 build (stop every serve.js first; QR_REPO clone with fe028eb:
   `git clone --depth 1 https://github.com/QuranRevival/quranrevival.github.io` then `git fetch --depth=2000 origin`); PCF What's
   New + monitor; "PCA ▸ released v15.00".

## OWNER WAITS (in the PCF monitor; never re-ask)
- NEW: phone check v14.42 (Edit Subjects). Earlier: phone checks v14.41 … v14.30; J120 n120r; J136; J120 n120q; J119 n119g; J104 line
  26; Hadith Bangla names; 47L's Wheel-switch tick; Bangla for "Loving Rasulullah". 11L's J104 question (Hisn "Dua by Occasions" to
  Resources?): build nothing until ticked. hadithNames publish: only once 14L's writer lands.

## Lessons
- **Copy a session id from the system reminder, never retype it**: 107L wrote J for K in p/mmsa.sessionUrl and the release commit's
  Claude-Session line; the PCA corrected the PCF.
- **Estimate a sweep's speed from timestamps, not from how long you have been waiting**: 107L misread 2 suites in 4 minutes as a hang.
- A mutation script that writes each mutant file only when its anchor occurs once is proven by counting the mutant FILES as well as
  the "caught" lines (a missing file would also make the suite fail and read as "caught").
