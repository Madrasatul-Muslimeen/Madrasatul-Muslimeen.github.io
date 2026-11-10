# MSA Master Architect 96L: handover, 10 Nov 2026, ~7:40 pm Sydney

Session `session_01PL2xbJG2qUATiLkN8U9ro4`, took over from 95L at 6:04 pm. `main` = **v14.14** (merge `6f32aa8c`, 7:32 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0 (needs a full clone: `git fetch --unshallow origin main`
and the two held branches `claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`, else they fail for want of history). Nothing deployed to Firestore.
PMS: `p/mmsa` v811 (monitor, What's New v14.13–v14.14), J120 v10.

## Released this session
- **v14.13** (#1612 carrying QR Lead 45L's #1610, 6:20 pm): the Read view's ⋮ sheet on Whole Sūrah's first āyah placed in the visible band
  (every tile pressable at 390/1280); Study pickers show "Bismillah" whole. QR v14.13 live 6:23 pm (PCA).
- **v14.14** (#1613, 7:32 pm): MSA J120 O3b Notes offline part 2 (branch `claude/j120-o3b-notes-offline`, built by this session's helper):
  notes.html editor + Journaling evidence, the first Note before the system folder exists (outbox kind `folder`), Copy (tags not copied
  offline, said in words) and version restore, and `unavailable` while online. notes-offline-browser 247/0, 19 mutations red.
  **note-window.js changed (1 line): change notice sent to the PCA.** QR rebuild asked at 7:33 pm.

## OPEN LIST
1. **MSA J120 O4 (next, yours):** own Notes, folders, Records, Bookmarks kept on the device by Get ready for offline. Then **O5** (one calm
   Offline line; "All saved ✓"), **O6** (G: recitation per sūrah, reader chooses). Still not offline: tags (copy and tagging).
2. **J136 E1:** when the Owner says "J136 published", copy `docs/proposals/word-effort.DEPLOYMENT-candidate.rules` into `firestore.rules`
   (byte for byte), set `WORD_EFFORT_RULES_PUBLISHED = true` in `app/js/word-effort.js`, re-run word-effort, rules-authorisation-executable,
   word-effort-browser, then one small release.
3. **MSA · QR J137:** manual line for the Read bar change (QR Lead 45L `session_01PL2xbNQXvPVEr281Nr5aMU`).
4. **Waiting on the Owner (never re-ask; read the job first):** J136 n136d (Rules publish), J120 n120q, J119 n119f (Demo v04,
   https://claude.ai/artifact/Exo2sr51NcvZJRU7wNzRdt), J05 T11/T15, opening-recitation demo v4, n127a, n129a, J122 n122a. J123 later.
5. **18 Nov (G02, pro1118):** K switches on by itself; the PCA copies B1 into QR. Until then "PCA ▸ released vX.YY" at each release.
   The PCA (32L `session_01PL2xbLrUaZLFHijLyNRW7w`) rebuilds QR and sends the Library cards.

## Lessons from this session
- A suite run from a worktree under the scratchpad cannot find `playwright` (ESM ignores the global path): `ln -s /opt/node22/lib/node_modules
  node_modules` in the worktree (and add it to `.git/info/exclude`).
- A helper given its own worktree cannot check out a branch the main tree holds: free the branch name first.
- Before the release merge, allocate-version's three governance checks fail where they read origin/main; after it, all pass.
