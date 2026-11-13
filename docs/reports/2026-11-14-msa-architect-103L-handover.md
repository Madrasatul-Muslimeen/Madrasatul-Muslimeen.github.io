# MSA Master Architect 103L: handover, 14 Nov 2026 (~1:30 am Sydney)

Session `session_01PL2xbL7q374cFSFsMKNCRJ`, took over from 102L at 12:05 am 14 Nov.
`main` = **v14.33** (release merge `348fecad`); QR: the PCA was asked to rebuild to 14.33. The ledger's next number is **14.34**.
On main after v14.33: brief-integrity and programme-ledger pass every check that does not need the unshallowed history
(`git fetch --unshallow origin main` plus `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring` for the rest). **Nothing deployed to Firestore.**

**Who:** PCA = **39L** `session_01PL2xbLuEmmFuVoY6gQnHuH`. Keep-alive `trig_019AWoZUSGccYGfwPbx4NB3x` (8:07 am Sydney) points at 103L:
ask the PCA to move it. QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 13L `session_01PL2xbNYb7NRAgY79MtwAdL`.
Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session
- Merged 102L's handover (#1690).
- **#1689** (47L, the Owner's 13 Nov Quran Study asks) reviewed and merged at `e4ef0e1a`. Two Architect review commits:
  `325256b1` (Notes pane picker squeezed both tabs onto two lines and cut "Single Ayah" at 320/360px: row wraps, tabs nowrap, basis
  9.5rem; `--mutate=squeeze`) and `a49fa163` (47L's non-āyah Record rule also caught `opening:taawwudh`, so Record on Aʿūdhu opened
  nothing: rule is `ayah|opening`; `--mutate=openingunit`). Notes pane change notice sent to the PCA.
- **v14.33** released (#1691): #1689 and #1688. PCF What's New `wn-v1433` and monitor written (p/mmsa v861).

## OWNER WAITS (in the PCF monitor; never re-ask)
- **J104 line 26**: publish the Dua groups rules. After the publish, the steps in the 102L handover (firestore.rules = the deployment
  file byte for byte; `PUBLISHED_DEPLOYMENTS`; update the DUA GROUPS / DUA SAVING / DUA KEYS checks in place); then 11L builds step 6.
- v14.33 on the phone (☰ 👥, chip order, Explore Page, Notes unit picker); v14.32 Dua Menu five tabs; v14.31; v14.30; J120 n120r;
  J136; J120 n120q; J119 n119g; Hadith J106 n106h, book 46 Bangla name, book 65 range, group names. 47L's PCF question
  "Little Hard" / "Learn Now" versus the kept labels.

## Known red on clean main (unchanged)
- `ayah-step-all-views-browser` [360] Mushaf (31/1); `quran-flow-step-nav` precondition (29/1).
- `claim-for-family-word-hadith-browser`: 6 Hadith 👥-list contrast failures (152/6), identical on main and #1689. **A real defect
  worth a round** (Hadith Lead's area): the open 👥 list's names read under 4.5:1 on the Hadith page.

## Lessons
- **The release PR's CI is red by design** before its merge (brief-integrity version claim, programme-ledger main-version, its
  mutation twin all read `origin/main`); #1687 was the same. Read the log, confirm it is only those, then merge.
- **A "not an āyah" rule must name `opening:`**: parseAyahUnitKey reads it as 1:0 on purpose and resolveUnitInfo cannot resolve it.
- A suite measuring only 390 and 1280 cannot see a phone squeeze: measure 320 for any new control in a row.
- qr-verify needs a FULL QuranRevival clone (old commit fe028eb): `git clone https://github.com/QuranRevival/quranrevival.github.io`
  (anonymous read works); it uses ports 8000/8082/8090-8099, so a review server on 8081 can run beside it.

## Possible next (no Owner input needed)
- A Hadith Lead round for the 👥-list contrast (above).
- The feature audit the PCF rule asks for when the queue is empty (PCF User Manual as the checklist), phone/tablet/desktop.
