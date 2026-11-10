# MSA Master Architect 95L: handover, 10 Nov 2026, ~6:05 pm Sydney

Session `session_01PL2xbLPXbq5cjH6UFKdtf2`, took over from 94L at 4:53 pm. `main` = **v14.12** (merge `dcd3f5ce`, 6:00 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0. Nothing deployed to Firestore.
PMS: `p/mmsa` v807 (monitor, What's New v14.10–v14.12), J136 v5, J120 v9.

## Released this session
- **v14.10** (#1606 carrying #1604, 5:15 pm): MSA · QR J136 Mark the Word (QR Lead 45L). Five marks on the Word card; Already Known /
  Very Hard need `effort` and say in words they cannot save until the Owner publishes
  `docs/proposals/word-effort.DEPLOYMENT-candidate.rules` (J136 n136d has the 5 click steps and the raw link). Review found Night
  "Difficult" 4.15:1 on #2a3a57; 45L fixed it (#f89480, 5.18:1). QR v14.10 live 5:22 pm (PCA).
- **v14.11** (#1608 carrying #1607, ~5:47 pm): Practising words light violet tint (QR Lead 45L, the Owner's ask of 10 Nov). QR live 5:49 pm.
- **v14.12** (#1609, 6:00 pm): MSA J120 O3 Notes offline (`app/js/note-outbox.js`; built by this session's helper, branch
  `claude/j120-o3-notes-offline`). No Rules change: replay calls the same note-foundation functions. Change notice for QR sent
  (note-window.js changed). QR rebuild pending at handover.

## OPEN LIST
1. **MSA J120 O3b (next, yours):** the outbox is NOT wired for `notes.html`'s own editor (it also writes Journaling evidence, which a
   replay would skip: queue the evidence write too, through its own data-layer function), the very first Note before the system folder
   exists (queue the folder create), Copy and version restore, and an `unavailable` failure while `navigator.onLine` reads true. Then
   **O4** (own Notes, folders, Records, Bookmarks kept on the device by Get ready), **O5** (one calm Offline line; "All saved ✓"),
   **O6** (G: recitation per sūrah, reader chooses). Suite: `notes-offline-browser.mjs` (mutations `no-outbox` `no-replay` `no-overlay`
   `no-dedupe` `no-rebase`).
2. **J136 E1:** when the Owner says "J136 published", copy the candidate into `firestore.rules` (byte for byte), set
   `WORD_EFFORT_RULES_PUBLISHED = true` in `app/js/word-effort.js`, re-run word-effort, rules-authorisation-executable, word-effort-browser,
   then one small release.
3. **QR Lead 45L follow-up round (in progress):** Whole Sūrah first-āyah ⋮ sheet clipped (390/1280); "Bismillah" cut in the Study picker.
4. **MSA · QR J137:** manual line for the Read bar change (QR Lead).
5. **Waiting on the Owner (never re-ask; read the job first):** J136 n136d (Rules publish), J120 n120q, J119 n119f (Demo v04, Bangla word
   list, https://claude.ai/artifact/Exo2sr51NcvZJRU7wNzRdt), J05 T11/T15, opening-recitation demo v4, n127a, n129a, J122 n122a. J123 later.
6. **18 Nov (G02, pro1118):** K switches on by itself; the PCA copies B1 into QR. Until then "PCA ▸ released vX.YY" at each release.
   The PCA (32L `session_01PL2xbLrUaZLFHijLyNRW7w`) sends the Library cards and rebuilds QR.

## Lessons from this session
- **Never `git checkout` in the main tree while a suite runs from it** (serve.js serves the working tree). Review a second branch in a
  `git worktree` and serve it with `PORT=8081 node serve.js`; suites take `QR_BASE=http://localhost:8081` (harness.mjs).
- `apps-build-check` lives in `tools/apps/`, not `tools/i18n-verify/`.
- `allocate-version.py VER NEXT SHORT NOTE MILESTONE CHANGELOG`, then `node tools/offline/build-offline-files.mjs` (sizes drift), commit;
  before the merge only the origin/main checks fail; after it all three governance checks must pass.
- A contrast check measures against the CARD's real background (#2a3a57 on Night), not the page token: read the failure text.
- `firestore-index-requirements.mjs` crashes on `siyagah-mmj-data.js` on main too; an equality + `documentId()` range query needs no
  composite index (same shape the Note readers already use live).
