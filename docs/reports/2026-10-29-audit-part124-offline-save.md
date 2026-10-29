# Audit part 124 — a save made with no internet on the shared tools (PCF MSA J29), round 3

Supersedes PR #1294 (round 2) and #1290 (round 1).

## What the harness models

With offline persistence (D5) the real Firestore SDK writes the device copy at once but resolves a `setDoc` /
`updateDoc` / `batch.commit()` promise only when the **server** acknowledges: offline it stays **pending**. A
**transaction** (`runTransaction`, every Note create / revise / retire) needs the server and **rejects** `unavailable`.
`firebase-stub.mjs` models both, opt-in (`window.__stubHoldWritesWhileOffline`, default off; no other suite changes).

## The round-2 defect, and the fix

Round 2's `settleWrite` returned `{ ok: true, result: undefined, savedOnDevice: true }` to EVERY caller. Measured:
Bookmarks **New folder** offline threw `Cannot read properties of undefined (reading 'removed')` and the folder never
appeared (`outcome.result` pushed as `undefined`). Round 3 makes the early return **opt-in**:

* `settleWrite(writeFn, context)` (`app/js/errors.js`): offline and unsettled after 1.5 s it ALWAYS shows the calm
  "Saved on this device — it will be sent when you are online." notice (the device does hold the change; en + bn in
  `bn.js`). Then, **only if `context.deviceCopyOk === true`**, it returns `{ ok: true, savedOnDevice: true }`
  (result `undefined`) and the real promise's later failure still reaches `reportWriteFailure` (I15). **Otherwise it
  keeps awaiting the real promise and returns the real `{ ok, result }`** — never `undefined`.
* `context.noDeviceCopy` (notes.html create / revise / retire): a transaction — no notice, no early return, and the
  unavailable message says "Nothing was saved — your text is still here, so press Save again…".
* `note-window.js`, `version.js`, `sw.js`, `CLAUDE.md` are untouched.

### Call sites

| Site | Reads `.result` after? | Decision |
|---|---|---|
| journey-map.html New folder form (`safeWrite` → `createNoteFolder`, line ~3881) | no | `deviceCopyOk: true` — unhangs: status "Folder … created" and refresh follow at once |
| bookmarks.html New folder (`createFolder`) | **yes** (`outcome.result` pushed into `folders`) | no flag: waits for the real answer; notice shown; folder listed when the line returns |
| Bookmarks add (`saveBookmarkForAssignees`, `bookmark-assign.js:60-61, 83`) | **yes** (`made.result.id`, `saved.result`) | no flag (I did not flag it as the Architect's note suggested: it reads results). Notice shown, no page error, completes when the line returns |
| `runFolderWrite` callers in journey-map.html (`ensureRealFolder`, `copyFolderTo`, …) | several read `.result` | no flag |
| quranrevival.html, catalogue, onboarding, classes, records, accept-invite, zab-to-note | read `.result` | no flag, **not edited** (QR file is off limits; the others read results). With the opt-in they get the real result, so none can receive `undefined` |

Bookmarks rename / move / toggle (`safeWrite`, results unused) were left unflagged too: they patch local state after
the await, so unflagged they simply finish when the line returns — a safe default; flagging them is a later,
per-site decision.

## Suite: `tools/i18n-verify/offline-save-shared-tools-browser.mjs` (119 checks)

* **Static:** every source `deviceCopyOk: true` site must not read its outcome's `.result` in the following lines
  (positive control: finds the Journey new-folder site; the Bookmarks New folder site must NOT carry the flag).
  The Architect named Bookmarks add as the positive control; it reads results, so the Journey site is used instead.
* **Browser (390 and 1280, en and bn):** Bookmarks add and Journey new folder (notice, no page error, writes reach the
  device copy; Journey also *carries on past the held write*); **Bookmarks New folder offline** (no page error, notice,
  folder listed when the line returns); notes.html new note and Notes pane edit (transactions: no false "saved").
* **Mutations (all fail):** `no-notice` 20, `no-unhang` 4, `flag-on-reader` 14 (static + browser), `no-optin` 20.
* I did not take a fresh screenshot at 390 in Bangla this round (`--shots=` writes them); the notice code is unchanged
  from round 2, whose Bangla 390 notice wrapped to two lines with a 44px close button inside the screen.

## Not measured

The real SDK's offline reload behaviour cannot be reproduced in the stub. `PLAIN_MESSAGES.unavailable` still says
"This will save automatically…" for non-transaction callers (true for queued writes).
