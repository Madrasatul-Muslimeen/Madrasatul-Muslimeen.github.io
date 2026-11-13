# MSA Master Architect 102L: handover, 13 Nov 2026 (~11:59 pm Sydney)

Session `session_01PL2xbJbb5Ng7i6LXyKdF7R`, took over from 101L at 5:52 pm 13 Nov. Handing over at ~49% context.
`main` = **v14.32** (merge `ad38b5b6`, then #1688 at `930092d3`); QR live **14.32** (PCA, 11:04 pm). The ledger's next number is **14.33**.
On main after v14.32: brief-integrity 15/0, programme-ledger 8/0, programme-ledger-mutations 49/0 (needs `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`), rules-authorisation-executable 117/0. **Nothing deployed to Firestore.**

**Who:** PCA = **39L** `session_01PL2xbLuEmmFuVoY6gQnHuH` (send releases and handovers there). The keep-alive is
`trig_01Bmz43vpvbjUahPgoDoyfXD` (8:07 am daily), pointing at 102L: **ask the PCA to move it to you.** QR Lead = 47L
`session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 13L `session_01PL2xbNYb7NRAgY79MtwAdL`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## FIRST JOB: review QR Lead 47L's PR #1689 (arrived 11:57 pm, not started)
The Owner's 13 Nov asks in one round: account picker into the Word Card ☰ menu; Mark chips reordered; Mustawa Arabic +20%; "Status of
Approach:" / "Status of Hifz:"; WbW chips −30%; the way back from a tapped word inside the Word Card; Forms card shows the Qur'an past for
weak roots (ش ر ي); Page view in Explore; Study Unit picker in the Notes pane tab row. 47L: every item has a mutation that fails by name;
claim-for-family shows the same 6 Hadith contrast failures as clean main (**confirm side by side**). It touches `quranrevival.html` (QR
build edits may need re-anchoring: run `apps-build-check` and `build-app.mjs qr`) and the **Notes pane** (shared tool: QR keeps a pinned
byte-for-byte copy of MMSA's in-page note scripts, so a change there needs a **change notice to the PCA** with its commit). Open Owner
question 47L files in the PCF: "Little Hard"/"Learn Now" vs the kept "Little Difficult"/"Learn". Release as **v14.33**; the CHANGELOG
entry should also mention **#1688** (merged, unwired, no release).

## Released / merged this session
- **v14.31** (#1683): #1678 Word Card grammar name option 3 (47L); #1682 Read on two lines on a phone, option B (47L; review commit
  da10b957: main merged, offline-files, a check name 100→106px); #1680 Dua group tree model (11L, pure); #1676 test-only.
- **v14.32** (#1687): #1684 Dua card Menu five tabs (11L; review commit 0483910e: offline-files did not list the new module, so
  `build-offline-files --check` failed); #1686 Dua groups drag tree + pop-up (11L, unwired; review commit c2929224: main merged,
  dua-study.css kept both appended blocks). Full a11y walk 2623/0, night --page=dua 2716/0, keyboard 1086/0.
- **#1685** (mine, docs/tests only): Dua groups Rules candidate `docs/proposals/dua-groups.candidate.rules` + DEPLOYMENT file +
  `tools/firestore-emulator/dua-groups.*` (25/25 mutations) + three DUA GROUPS checks in `rules-authorisation-executable.mjs` + Owner guide
  `docs/governance/2026-11-13-dua-groups-rules-publish-guide.md`. Shape: `duaGroups/{tenantId}__{ownerKey}`, ownerKey "admin" or a
  personId; the Dua Lead's NESTED nodes `{id, name {en,bn?}, kids, duas (personal only)}`, top level ≤ 200; membership: madrasah via
  `duaEdits.placements[].group`, personal via a capped `duas` list per node; a deleted group's stale placements are ignored on read.
- **#1688** (11L, merged, no release): keyboard Move…, trapModal pop-up, whole-sentence Delete, destroy(); 68/0, 7 mutations counted.

## OWNER WAITS (in the PCF monitor v858; never re-ask)
- **J104 line 26** (`n104pubgrp`): publish the Dua groups rules ☐ Published ☐ Not now. **After the publish:** make `firestore.rules` the
  deployment file byte for byte in its own commit; add it to `PUBLISHED_DEPLOYMENTS` in `dawah-boundary.mjs`; the DUA GROUPS PENDING /
  deployment checks and DUA SAVING / DUA KEYS byte-for-byte checks fail by name: update each in place. Then 11L builds step 6 (writer +
  page); when app code names `duaGroups`, the PENDING check fails: add the forward/backward checks (as DUA SAVING) in that review.
- v14.32 Dua Menu five tabs fine?; v14.31 grammar name / Read on two lines fine?; v14.30 one row + ⋮; J120 n120r; J136; J120 n120q;
  J119 n119g; Hadith J106 n106h, book 46 Bangla name, book 65 range, group names.

## Known red on clean main (confirmed side by side 13 Nov)
- `ayah-step-all-views-browser` [360] Mushaf "a second ▸ moves to a different marker" (31/1).
- `quran-flow-step-nav` precondition "the unit-number picker offers page 2" (29/1).

## Lessons
- **A new `app/js` file must be in `app/offline-files.json`** (`node tools/offline/build-offline-files.mjs --check`); it caught #1684.
  Two parallel PRs adding files conflict on that one-line JSON: take either side and re-run the generator (deterministic).
- **Your own review server can hold a port a qr-verify check needs** (asma-store wants 8096 → EADDRINUSE, no summary line). Stop every
  `node serve.js` before `qr-verify/run-all.sh`; re-run just the one check if it happens.
- **Night/a11y suites over every page take 45+ min**; for a Dua-only change run `night-hadith-dua-browser.mjs --page=dua` (the Lead's
  scope); the a11y full walk takes ~30 min run alone (no outer timeout).
- A mutation flag is `--mutate=<name>` in the Dua suites, `MUT=<name>` in QR suites: read the suite header before concluding "unproven".
- The Codex review bot on every PR says "usage limits reached": not a finding.

## Opening message for the next Architect
"You are the MSA Master Architect (103L), taking over from 102L (session_01PL2xbJbb5Ng7i6LXyKdF7R). Read CLAUDE.md, then
docs/reports/2026-11-13-msa-architect-102L-handover.md, then the PCF https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa.
Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin if_version). main = v14.32 (QR live 14.32); next number 14.33.
PCA = 39L session_01PL2xbLuEmmFuVoY6gQnHuH (or newer in meta/global.sessionUrl); ask it to move the keep-alive trig_01Bmz43vpvbjUahPgoDoyfXD
to you. QR Lead = 47L session_01PL2xbNAMQAyiv5S52x8NPv. Hadith Lead = 13L session_01PL2xbNYb7NRAgY79MtwAdL. Dua Lead = 11L
session_01PL2xbHyfbrXS8hET9sKE7P. Tell the PCA "PCA ▸ taken over", repeating the handover's open items one by one. FIRST JOB: review
QR Lead 47L's PR #1689 (handover section 'FIRST JOB') and release it as v14.33 (CHANGELOG also names #1688). Watch for the Owner's
J104 line 26 publish and do the after-publish steps. Suites need `ln -s /opt/node22/lib/node_modules node_modules`, `node serve.js`, and
for qr-verify QR_REPO=<QuranRevival clone>; stop every serve.js before qr-verify. Merge pinned with the full expectedHeadSha. Release
with allocate-version.py, then PCF What's New + monitor, then "PCA ▸ released vX.YY". No self wake-ups. At about 30% context, hand over."
