# MSA Master Architect 103L: handover, 14 Nov 2026 (~8:20 am Sydney)

Session `session_01PL2xbL7q374cFSFsMKNCRJ`, took over from 102L at 12:05 am 14 Nov. Handing over on the PCA keep-alive's
30%-context rule.
`main` = **v14.34** (release `2fbb6f8c`); QR live **14.34** (PCA, 2:36 am). The ledger's next number is **14.35**.
**Merged after v14.34, not yet released:** #1695 (Dua groups step 6a, the writer, unwired) and, when its CI is green, #1696
(firestore.rules sync). The next release CHANGELOG names both, ideally together with the Dua Lead's step 6b.

**Who:** PCA = **39L** `session_01PL2xbLuEmmFuVoY6gQnHuH`. Keep-alive `trig_019AWoZUSGccYGfwPbx4NB3x` (8:07 am Sydney) points at
103L: ask the PCA to move it. QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 13L
`session_01PL2xbNYb7NRAgY79MtwAdL`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## FIRST JOB
1. **PR #1696** (mine): `firestore.rules` = `docs/proposals/dua-groups.DEPLOYMENT-candidate.rules` byte for byte (its own first
   commit) + checks updated in place (`rules-authorisation-executable` 124/0 with `stripGroups()`; `dawah-boundary`
   PUBLISHED_DEPLOYMENTS 21/0; three mutations fail by name; emulator `dua-groups.rules.test.mjs` with
   `FULL_RULES_FILE=firestore.rules` passes). If it is not merged when you read this: check CI on its head and merge pinned.
2. **Dua Lead 11L step 6b** (the page that mounts the group tree): review when it arrives, then release v14.35 with #1695, #1696
   and 6b. Run `tools/firestore-emulator` (`npm ci` there first) for anything touching Rules.

## Done this session
- **v14.33** (#1691): #1689 (47L, the Owner's 13 Nov Word Card asks) with two Architect review commits: 325256b1 (Notes pane
  picker squeezed both tabs at 320/360px) and a49fa163 (Record on `opening:taawwudh` opened nothing). Notes pane change notice sent.
- **v14.34** (#1694): #1693 (13L): the Hadith night look's 👥 list gets a solid box colour; claim-for-family 152/6 → 158/0.
- **#1695** merged (11L, Dua groups writer: saveDuaGroups/loadDuaGroups/dropStalePlacements, cleanTree(opts)).
- **The Owner published the Dua groups Rules**: "Rules published", 21:00:45Z 13 Nov, desktop app, in 11L's own record. The J104
  line 26 tick box is still the Owner's (unticked; never tick it for them).

## OWNER WAITS (in the PCF monitor; never re-ask)
- v14.33 / v14.34 on the phone (☰ 👥 first, chip order, Explore Page, Notes unit picker, Hadith night 👥 list); v14.32 Dua Menu
  five tabs; v14.31; v14.30; J120 n120r; J136; J120 n120q; J119 n119g; Hadith J106 n106h, book 46 Bangla name, book 65 range,
  group names; 47L's question "Little Hard"/"Learn Now".

## Known red on clean main (unchanged)
- `ayah-step-all-views-browser` [360] Mushaf (31/1); `quran-flow-step-nav` precondition (29/1).

## Lessons
- **A release PR's CI is red by design** before the merge (brief-integrity version claim, programme-ledger main-version, its
  mutation twin). Read the log; merge only when those three are the only failures.
- **qr-verify can exceed a 40-minute outer limit**: give it 60, or run the last check alone with `node tools/apps/serve-app.mjs
  build/qr &` first (title-fit needs that server on 8082).
- **"Owner published" relayed by a Lead: read the Lead's own transcript** (list_events kinds user; the human message has
  `client_platform`, no tool_use_id) before syncing firestore.rules.
- A "not an āyah" rule must name `opening:`. A suite that measures only 390 and 1280 cannot see a phone squeeze: measure 320.
- qr-verify needs a FULL QuranRevival clone (`git clone https://github.com/QuranRevival/quranrevival.github.io`, anonymous read).

## Opening message for the next Architect
"You are the MSA Master Architect (104L), taking over from 103L (session_01PL2xbL7q374cFSFsMKNCRJ). Read CLAUDE.md, then
docs/reports/2026-11-14-msa-architect-103L-handover.md (merge its PR first if open, pinned with the full head SHA), then the PCF
https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa. Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin
if_version). main = v14.34 (QR live 14.34); next number 14.35; #1695 and #1696 are merged with no release, so the next CHANGELOG names
them. PCA = 39L session_01PL2xbLuEmmFuVoY6gQnHuH (or newer in meta/global.sessionUrl); ask it to move the keep-alive
trig_019AWoZUSGccYGfwPbx4NB3x to you. QR Lead = 47L session_01PL2xbNAMQAyiv5S52x8NPv. Hadith Lead = 13L
session_01PL2xbNYb7NRAgY79MtwAdL. Dua Lead = 11L session_01PL2xbHyfbrXS8hET9sKE7P. FIRST JOB: if PR #1696 (firestore.rules sync) is
still open, check CI and merge it pinned; then review Dua Lead 11L's step 6b when it arrives and release v14.35 with #1695, #1696 and 6b.
Tell the PCA "PCA ▸ taken over", repeating the handover's open items one by one. Suites need `ln -s /opt/node22/lib/node_modules
node_modules`, `node serve.js`, and for qr-verify QR_REPO=<QuranRevival full clone>; stop every serve.js before qr-verify. Merge
pinned with the full expectedHeadSha. Release with allocate-version.py, then PCF What's New + monitor, then "PCA ▸ released vX.YY".
No self wake-ups. At about 30% context, hand over."
