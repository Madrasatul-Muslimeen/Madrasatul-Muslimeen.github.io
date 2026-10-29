# Audit part 124 — a save made with no internet on the shared tools (PCF MSA J29)

## What the harness can model now (round 2)

Round 1 used a stub that answers every write instantly, so it hid the real behaviour. With offline persistence (D5)
the real Firestore SDK writes the device copy at once but resolves a `setDoc` / `updateDoc` / `batch.commit()` promise
only when the **server** acknowledges: offline it stays **pending** (it does not reject). `envelope.js` does
`await setDoc(...)`, so `safeWrite`'s `await writeFn()` never returned, the notice was never reached and the caller
waited for ever. A **transaction** (`runTransaction`, used by every Note create / revise / retire) needs the server and
**rejects** offline (`unavailable`); it is never queued.

`firebase-stub.mjs` now models both, **opt-in** (`window.__stubHoldWritesWhileOffline = true`, default off, no other
suite changes): while `navigator.onLine` is false a write's local effects still happen (and are readable in
`__fsLog`) but its promise resolves only after the page's `online` event, and `runTransaction` rejects with
`code: "unavailable"`.

## Measured with the hold switch (before the fix, from the architect's description; after, measured here)

| Save | Before (offline, real SDK) | After |
|---|---|---|
| Bookmarks add (`safeWrite`, setDoc/updateDoc) | pending for ever, nothing said | after 1.5 s: "Saved on this device — it will be sent when you are online." / "এই ডিভাইসে সংরক্ষিত হয়েছে — ইন্টারনেট এলে পাঠানো হবে।"; page carries on; a further save goes ahead; notice goes away on `online` |
| Mapping My Journey new folder (`runFolderWrite`, batch) | pending for ever | same notice and behaviour |
| `notes.html` new note (transaction) | rejects → banner "…This will save automatically once the connection is back." — **false**: nothing is kept | banner now: "Could not reach the server. Nothing was saved — your text is still here, so press Save again when you are online." / "সার্ভারে পৌঁছানো যায়নি। কিছুই সংরক্ষিত হয়নি — আপনার লেখা এখানেই আছে, ইন্টারনেট এলে আবার সংরক্ষণ চাপুন।"; form stays open, Save enabled |
| Notes pane edit (transaction, autosave) | "Not saved yet — will try again", text kept in the device draft | unchanged (already honest) — measured: that line in en and bn, draft kept |

## The change

* `app/js/errors.js`: `settleWrite(writeFn, context)` — races the real promise against 1.5 s. Settled in time: as
  before (and, offline, the notice). Not settled while `navigator.onLine` is false: shows the notice and returns
  `{ ok: true, result: undefined, savedOnDevice: true }`; the real promise keeps running and a later failure goes to
  `reportWriteFailure` (I15). Slow but **online**: keeps waiting, as before. `safeWrite` now calls it.
* **How a caller tells "saved on device" from "saved":** `res.savedOnDevice === true` (absent when saved). Such a
  result has no `result` value (the server has not answered), so a caller that reads `result` must guard for it. No
  current caller of the two shared writers (Bookmarks, Journey folders) reads `result` after those saves.
* `context.noDeviceCopy: true` (set on notes.html's create / revise / retire) opts a **transaction** out: it never
  claims "saved on this device", and its unavailable message no longer promises an automatic save.
* `app/journey-map.html`: `runFolderWrite` calls `settleWrite` (import + one line).
* `app/js/i18n/bn.js`: two new strings (real characters).
* **`app/js/note-window.js` is NOT changed** (round 1's one-line edit is dropped: the Notes pane's "saved" can only
  follow a transaction that the server acknowledged, so "Saved on this device" would have been wrong). QR's
  byte-for-byte copy is therefore unaffected.
* No Rules change, no new stored field, no change to what is written.

## Suite

`tools/i18n-verify/offline-save-shared-tools-browser.mjs`: 84 checks, 390 and 1280, en and bn, all four saves with the
hold switch on. `--mutate=no-notice` fails 16; `--mutate=no-unhang` (the old `await writeFn()` back) fails 16.
The Bangla 390 notice was looked at (wraps to two lines, close button 44px, inside the screen).

## Not measured / findings for the architect

* The real SDK's own offline reload behaviour is not reproducible in the stub; the device copy is the SDK's job.
* `PLAIN_MESSAGES.unavailable` still says "This will save automatically once the connection is back." for every
  other (non-transaction) caller; true for queued set/update writes, so left alone.
