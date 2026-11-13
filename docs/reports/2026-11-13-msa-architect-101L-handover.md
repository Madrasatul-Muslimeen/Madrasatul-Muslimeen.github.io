# MSA Master Architect 101L: handover, 13 Nov 2026 (~5:45 pm Sydney)

Session `session_01PL2xbJBkNAsfBhjfJdSte9`, took over from 100L at 4:40 am 13 Nov. `main` = **v14.30**; the ledger's next number is **14.31**.
On main after the release: brief-integrity 15/0, programme-ledger 8/0, programme-ledger-mutations 49/0 (needs `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`). Nothing deployed to Firestore.

**Who:** PCA = **39L** `session_01PL2xbLuEmmFuVoY6gQnHuH` (took over from 38L at 1:36 pm 13 Nov; send releases and handovers there). QR Lead = 47L
`session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 13L `session_01PL2xbNYb7NRAgY79MtwAdL`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.
The keep-alive `trig_01FqrPfAEv5iXrZ3PBKKDzky` (8:07 am daily) points at 101L: ask the PCA to move it.

## Released / merged this session
- **v14.30** (#1675): #1674, the QR Lead 47L's Āyah card phone layout part 2 (one row [Location][Ayah][‹ ▶ ›][⋮], one ⋮ menu of nine tiles).
  Review commit ee6e4606: the new Writing sheet tile had no way back; `onWriting` now calls `rememberAyahCardReturn()`, and
  `ayah-card-row-browser` checks it after the sheet's ✕ (elementFromPoint), with `MUT=noback`. QR live 14.30 at 5:51 am (PCA).
- **#1676** (test-only, no release; put it in the next CHANGELOG entry): arabic-twice measures a REAL Word Card on 1:5:1, `MUT=partname`; 64/0.
- PCF: three relayed QR Quick tasks and the options demo filed to J110; the monitor's Read on bar question corrected from 47L's measurement.

## FIRST JOB: the Dua groups Rules candidate (Owner Control Gate to PUBLISH; preparing it needs no Owner)
The Owner ticked J104 line 25 on 13 Nov: real delete (B), sub groups 3 levels (C), pop-up (E); Dua Lead demo v1.10 (#1679, docs only). My reply to
the Dua Lead (13 Nov, ~5:44 pm) fixed the shape:
- `duaGroups/{tenantId}__{ownerKey}`, ownerKey `"admin"` or a personId (no personId format can be "admin"; a person doc requires `personInTenant`).
- Fields exactly `tenantId, ownerKey, nodes, schemaVersion, createdAt, updatedAt, createdBy`; `nodes` a FLAT list of `{ id, parent, name {en?,bn?}, order }`,
  `nodes.size() <= 500`; depth/ids/name length checked by the client (as `dua-saving-data.js` does for placements). Node ids permanent (I5).
- Admin doc: any tenant member reads, owner/prime writes (`canAdminCatalogue()`, as `duaEdits`). Person doc: `planMay()` as `duaPlans`. Get by id only,
  no index; tenantId/ownerKey/createdBy pinned; `createdBy == myUid()` on create; `allow delete: if false`; the read-before-create probe.
- **Open question to the Dua Lead (WAIT for it before writing node fields):** where group MEMBERSHIP lives: admin groups via the published
  `duaEdits.placements[].group` (= node id), personal groups via a capped `duas` list on each node? One home per kind, never two.
- "Real delete" = an update writing `nodes` without the node; Rules keep D6, but tell the Owner plainly the group is gone for good (I4); duas and marks stay.
- Deliver: `docs/proposals/dua-groups.candidate.rules`, `dua-groups.DEPLOYMENT-candidate.rules` (live file + block appended), an emulator suite in
  `tools/firestore-emulator/` in the `dua-saving.rules.test.mjs` / `.mutate.mjs` pattern (each check mutation-proven, every denial paired with an allow
  differing in ONE fact: another tenant's member reading the admin doc; a person writing another person's doc in the same tenant; a non-co-enrolled
  teacher), `rules-authorisation-executable.mjs` green, and a publish guide like `docs/governance/2026-11-09-dua-keys-rules-publish-guide.md`.
  Then a J104 line for the Owner to publish (☐ Published ☐ Not now).

## IN REVIEW / NEXT
- Nothing open. #1454 (draft, K2 marks) is 47L's; it waits on K4 Rules.
- 47L builds whichever option the Owner ticks (below). 13L: My index per-book list if J106 n106h = A.

## OWNER WAITS (in the PCF monitor; never re-ask)
v14.30 one row + ⋮ fine?; Word Card head word (fine / head word twice / grammar line smaller); Read on bar on a phone (A keep three lines / B ⏮ ◂ ▸ ⏭
into ⋮), pictures https://claude.ai/artifact/8VZLc9TDHC2m3taRFd2gWw; J120 n120r; J136; J120 n120q; J119 n119g; Hadith J106 n106h, book 46 Bangla
name, book 65 range, group names.

## Lessons
- **An outer `timeout` around `qr-verify/run-all.sh` kills the script but not its node children**: a later run then dies on EADDRINUSE (port 8108).
  Give it no outer timeout (each check has its own), or `pkill -f "^node tools/apps/qr-verify"` before re-running.
- **Run "red on main" claims side by side**: a `git worktree` of origin/main served with `PORT=8081 node serve.js`, suites with `QR_BASE=http://localhost:8081`
  from the worktree's own cwd. Compare FAIL lines with ports stripped; a shifted line number is the PR's edit, not a new failure.
- **A full-screen overlay hides the Back pill** (#writingSheet z-index 9500 vs the pill's 955): check the way back where it becomes reachable (after the
  overlay's own ✕), with elementFromPoint, not just that the pill exists.
- The PCF `monitor` is an object: `str_replace` cannot edit it; write the whole object with `update` and `if_version`.

## Opening message for the next Architect
"You are the MSA Master Architect (102L), taking over from 101L (session_01PL2xbJBkNAsfBhjfJdSte9). Read CLAUDE.md, then
docs/reports/2026-11-13-msa-architect-101L-handover.md, then the PCF https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa. Set p/mmsa
sessionUrl to your session and stamp claudeSeenAt (pin if_version). main = v14.30 (QR live 14.30); next number 14.31. PCA = 39L
session_01PL2xbLuEmmFuVoY6gQnHuH (or newer in meta/global.sessionUrl); ask it to move the keep-alive to you. QR Lead = 47L session_01PL2xbNAMQAyiv5S52x8NPv.
Hadith Lead = 13L session_01PL2xbNYb7NRAgY79MtwAdL. Dua Lead = 11L session_01PL2xbHyfbrXS8hET9sKE7P. Tell the PCA "PCA ▸ taken over", repeating the
handover's open items one by one. FIRST JOB: the Dua groups Rules candidate + emulator suite (handover section 'FIRST JOB'); tell the Dua Lead you
have it and wait for its answer on where group membership lives before writing node fields. Review the Leads' PRs as they come. Suites need
`ln -s /opt/node22/lib/node_modules node_modules`, `node serve.js`, and for qr-verify QR_REPO=<QuranRevival clone>. Never hold port 8082 during qr-verify
or printed-offline. Merge pinned with the full expectedHeadSha. Release with allocate-version.py, then PCF What's New + monitor, then "PCA ▸ released
vX.YY". No self wake-ups. At about 30% context, hand over."
