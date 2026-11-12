# MSA Master Architect 99L: handover, 12 Nov 2026 (~10:15 pm Sydney)

Session `session_01PL2xbM7bfaUNz1CzB9Qqtv`, took over from 98L at 4:51 pm 11 Nov. `main` = **v14.27**; the ledger's next number is **14.28**.
On main after the release: brief-integrity 15/0, programme-ledger 8/0, programme-ledger-mutations 49/0 (needs `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`). Nothing deployed to Firestore.

**Who:** PCA = 36L `session_01PL2xbL7NFyX5FvTKfU6Qsz` (meta/global.sessionUrl). QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`.
Hadith Lead = 12L `session_01PL2xbMcdvCAqCs3zLe4vBV`.

## Released this session
- **v14.26** (#1658): #1653 Printed page view (📖: ONE Ayah → Mushaf → Printed page), #1649 QR debt round (Show ▾ at 768px; Escape closes
  the ⋮ sheet), #1650 Riyad al-Salihin printed page on Shamela. QR live 14.26 at 7:14 pm 11 Nov (PCA).
- **v14.27** (#1660): #1656 keep printed Mushaf pages in the app (own cache mm-printed-v1 / qr-printed-v1). **QR rebuild asked of the PCA.**
- Review commits I made: 5f4a8f48 (#1649 read-bar-tools crashes), d6769493 (#1653 data checks + strict way-back check), cfbbc5e7 (#1650
  offline list), 17dd7b74 (#1656 noremove crash).

## IN REVIEW (next, in order)
1. **#1657** PDF download (47L), head c2f24f7e, **retargeted to main by me**; it carries #1656 merged in, so ask 47L to merge main
   (offline-files.json will conflict: regenerate) and send the new head. Then: printed-pdf-browser 49/0 + its 8 mutations, printed-offline,
   data, apps-build-check, QR build + qr-verify. Check every mutation ENDS with a summary line (four crashes found this session).
2. **#1659** Āyah card phone layout part 1 (47L), head 4c292501, off main. **Owner's authority VERIFIED** in 46L's own transcript:
   "yes build now" at 2026-11-11T06:20:49Z (after two demo revisions). title-lines suite 100/0, 6 mutations. Part 2 (Location button + one
   ⋮ menu) is coming as its own PR.
3. **Hadith Lead 12L**: the Owner said "All yes" to hd1111n; four small PRs from main are coming (Musnad Ahmad, Darimi, Nasa'i bridge,
   Forty Nawawi). Regenerate-offline-list check on each (#1650 had it stale).

## OWNER WAITS (in the PCF monitor; never re-ask)
Read on bar on a phone (A / B / C / B+C); J120 n120r; J136; J120 n120q; J119 n119g. inbox qr47lphonelayout01 still reads "nothing built"
and asks two questions the Owner answered in 46L's chat (spelling correct; "yes build now"): 47L should update it.

## Loose ends
- Stray branch `claude/qr-lead-46l-bw`: deleting it is refused from a session (auto-mode classifier). The Owner deletes it on GitHub.

## Lessons
- **`pkill -f "^node serve.js$"` stops EVERY server**, all worktrees and ports. Stop one by its pid (`/proc/<pid>/environ` shows PORT).
- **qr-verify's own server uses port 8082.** Never hold 8082 with a second `serve.js` while it runs (my first #1653 run was invalid).
- Build QR (`build-app.mjs qr`) BEFORE `mushaf-printed-worker-exclusion-browser`, or its QR half is SKIPPED (5 checks, not 10).
- When editing a test line with sed, put an appended comment at the END of the line: a `//` inserted mid-line swallowed the
  `waitForTimeout` after it and made a clean run fail 6 checks.
- A mutation that removes a control must not hang the next `page.click`: `.catch(() => {})` keeps Playwright's normal wait and lets the
  following check count it. A 5-second `timeout:` cap is too short for some real clicks here.

## Opening message for the next Architect
"You are the MSA Master Architect (100L), taking over from 99L (session_01PL2xbM7bfaUNz1CzB9Qqtv). Read CLAUDE.md, then
docs/reports/2026-11-12-msa-architect-99L-handover.md (IN REVIEW list first), then the PCF https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ
section p/mmsa. Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin if_version). main = v14.27; next number 14.28.
PCA = 36L session_01PL2xbL7NFyX5FvTKfU6Qsz (or newer in meta/global.sessionUrl). QR Lead = 47L session_01PL2xbNAMQAyiv5S52x8NPv.
Hadith Lead = 12L session_01PL2xbMcdvCAqCs3zLe4vBV. Tell the PCA "taken over" with your open list. FIRST JOB: #1657 (ask 47L to merge
main into it first), then #1659, then the Hadith Lead's PRs as they come. Suites need `ln -s /opt/node22/lib/node_modules node_modules`.
Never hold port 8082 during qr-verify. Merge pinned with expectedHeadSha. Release with allocate-version.py, then PCF What's New + monitor,
then "PCA ▸ released vX.YY". No self wake-ups. At about 30% context, hand over."
