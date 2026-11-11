# MSA Master Architect 98L: handover, 11 Nov 2026 (~3:00 pm Sydney)

Session `session_01PL2xbKJpJBPFyWmKuCNia6`, took over from 97L at ~12:20 pm. `main` = **v14.25** (this release); the ledger's next number is **14.26**.
On main: brief-integrity 15/0, programme-ledger 8/0, programme-ledger-mutations 49/0 (needs `git fetch --unshallow origin main` plus
`claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`). Nothing deployed to Firestore.

**Who:** PCA = 35L `session_01PL2xbJG7YpMtgc2Z4so2y7` (meta/global.sessionUrl names it). QR Lead = 46L `session_01PL2xbKuYcFzuK32jDvmAXJ`.
Hadith Lead = 12L `session_01PL2xbMcdvCAqCs3zLe4vBV`. Dua Lead = `session_01PL2xbHyfbrXS8hET9sKE7P` (idle since 9 Nov; send only what concerns it).

## Released this session
- **v14.23** (#1646): #1638 āyah stripe round 2 (★/QCR/اسم from loaded data only), #1640 J129 Know Your Status switch, #1641 J119 Bangla Words
  kinds under `mm_bangla_words.v2`. Review fix: the OLD pure suite `bangla-words.mjs` (26/1 on the branch) had a stale "bad storage" case and a
  mutation anchored on removed code; updated in place (27/0, `--prove` all red). QR rebuilt to v14.23 by the PCA (1:21 pm).
- **v14.24** (#1651 for #1648): Hadith/Dua "Original book page" (archive.org Darussalam scan pop-up) for Bukhari, Muslim, Tirmidhi, Abu Dawud,
  Ibn Majah; Nasa'i held back. Review commit removed a committed `.pyc` (`.gitignore` now ignores `__pycache__/`). QR rebuild asked of the PCA.
- Also merged: **#1644** (Bangla Words Rules CANDIDATE; merged by the unattended Architect; checked after: emulator pass, mutate 28/28,
  rules-authorisation-executable 114/0, firestore.rules unchanged), **#1645** (604 Printed Mushaf PNGs, 51 MB, one commit, README, check 9/0, 11 mutations red).

## IN REVIEW (updated ~3:55 pm Sydney, 98L stopping)
**#1647 is DONE: released as v14.25** (Shamela printed page: Muwatta, al-Adab al-Mufrad; my review re-anchored the `nocredit` mutation, 8/9 -> 9/9).
1. **#1649** QR Lead debt round. Its head has MOVED since my run: now also a rewritten `read-bar-tools` (84/0, mutations notextsize,
   nocomplete, nonote, nowriting, noasma, noescape, nofold) and a SECOND real fix, Escape closes the ⋮ sheet and gives the ⋮ its focus back
   (`app/js/ayah-note-renderer.js`). My run on the OLD head 2d45ab5b (main merged): qr-j110 78/0, audit-part1 214/0, audit-part6 204/0,
   qr-read-tall 160/0, read-one-bar 158/0, read-on-switch 160/0, read-bar-bookmark-layers 41/3 (the 3 are the deliberate RED BY NAME for the
   three-line phone bar, waiting on the Owner's choice). Mutations: twobm 11 fails, notiles 4, jtclose 8, minbtn 8 (all red).
   **FINDINGS to send back before merging:** (a) audit-part6 `--mutate=panebtn` stays GREEN (204/0): it proves nothing, so the QR Lead must
   fix or replace it; (b) read-bar-bookmark-layers `--mutate=nounit` and `--mutate=inflow` crashed (TimeoutError, no summary line): make each
   end with a counted FAIL rather than a crash. Re-run everything on the NEW head with main merged.
   Later news (5:35 pm): 46L resolved #1649's offline-files conflict, head now **e4534d34**; my two findings were sent, so check they are answered.
2. **#1653** Printed page VIEW (stage 2, QR Lead 46L; 47L takes over the next two PRs): both MUST-DOs claimed in it (both workers refuse
   `/mushaf-printed/`, proven by `mushaf-printed-worker-exclusion-browser.mjs` with MUT=msa/MUT=qr; `qr.json` gains `siteSkip`, honoured by
   `build-app.mjs`, plus ONE counted edit, edits.json 34->35; apps-build-check 57/0). The view: 📖 gets a third stop, Āyah -> Mushaf -> Printed page.
   `mushaf-printed-view-browser.mjs` 182/0, 8 mutations. It touches SHARED files (app/sw.js, apps/qr worker, qr.json, build-app.mjs), so review it
   closely: build QR and confirm no PNG lands in build/qr; run qr-verify; check that the four older suites updated in place keep only reds
   identical to clean main.
3. **#1650** Riyad al-Salihin (Hadith Lead 12L): retarget to main now that #1647 is in. 12L knows its branch still has the old `nocredit` anchor
   and will pick up the fix and re-run `--prove` on all three suites.

## OWNER CHOICE ASKED (in the PCF monitor, tick boxes; never re-ask)
Read on, PHONE, range unit: the bar is THREE lines (151px). Short of two lines by 126px at 360, 66 at 390, 22 at 412. A keep three lines;
B move ◂ ▸ into ⋮ for a range (saves 86px: fixes 390/412); C 🔍 back into ⋮ on a phone (saves 46px); B+C (132px, fixes all three).

## Told to the QR Lead (check they are done)
- Printed page VIEW PR MUST: exclude `/mushaf-printed/` from BOTH workers' run-time caches (`app/sw.js` and `apps/qr/site/app/sw.js`
  `CACHEABLE_PATH_PREFIXES` store any fetched file under `/tools/quran-data-pull/output/`), with a browser check + mutation per worker; and
  propose excluding `mushaf-printed` from `app/apps/qr.json` "site" (QR's build copies all 51 MB today, although QR reads MSA's address).
- `read-bar-tools` is to be REWRITTEN to the ⋮ sheet (not retired), one mutation per tool.

## Waiting on the Owner (never re-ask)
J120 n120r (phone recitation save + airplane mode), J136 (tap Very Hard), J120 n120q (A/B), J119 n119g (A/B/C), the Read-bar choice above;
J110 round-2 look, J05 T11/T15, J122 n122a, J123 later. 18 Nov G02/pro1118. BwN hosting of the Hadith PDFs: held on copyright (Owner A/B/C).

## Loose ends
- A stray branch `claude/qr-lead-46l-bw` (same commit as bw1, my mis-push; delete was refused with 403 here). Delete it from GitHub.
- Codex PR reviews hit their usage limit (no findings, nothing to act on).

## Lessons
- Before a check-suite loop in a shell function, include the `.mjs` (I lost one run to that).
- `harness.mjs` honours `QR_BASE=http://localhost:8081`, so two worktrees can run suites at once (`PORT=8081 node serve.js` in the second).
- The unattended Architect merges ready PRs that touch no protected path; review a docs/tools-only PR quickly or it lands first (#1644), and check it after.
- `hadith-dua-a11y` and `night-hadith-dua` print only at the end (~15 min each); run them in the background with output to a file.

## Opening message for the next Architect
"You are the MSA Master Architect (99L), taking over from 98L (session_01PL2xbKJpJBPFyWmKuCNia6). Read CLAUDE.md, then
docs/reports/2026-11-11-msa-architect-98L-handover.md, then the PCF https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa. Set p/mmsa
sessionUrl to your session and stamp claudeSeenAt (pin if_version). main = v14.25; next number 14.26. PCA = 35L session_01PL2xbJG7YpMtgc2Z4so2y7.
FIRST JOB: #1649 (send back the two findings in the handover's IN REVIEW list first), then #1650. Suites need
`ln -s /opt/node22/lib/node_modules node_modules`. Stop serve.js before qr-verify. Merge pinned with expectedHeadSha."
