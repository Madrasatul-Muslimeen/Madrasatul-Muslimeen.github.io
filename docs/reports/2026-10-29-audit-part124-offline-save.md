# Audit part 124 — a save made with no internet on the shared tools (PCF MSA J29)

## What the harness can and cannot model

The Firebase stub (`tools/i18n-verify/firebase-stub.mjs`) answers every write instantly and never queues one;
`waitForPendingWrites()` is an empty function. So `context.setOffline(true)` changes **only** `navigator.onLine` and
network fetches: the stub's write log still receives every write. "Does it reach the write log when the line returns"
therefore cannot be measured here; what is measured is **what the app shows**. With real Firestore, a `setDoc/updateDoc`
promise stays pending offline (the device copy is written at once and the server confirms later), and `runTransaction`
(the Note editor's revise) **rejects** offline, which the note editor already reports as "Not saved yet — will try
again" with the text kept in a device draft. The gap is the first case: a write that finishes against the device copy.

## Before / change / after

| Save | Before (offline) | Change | After (offline) |
|---|---|---|---|
| Bookmarks: add (`bookmarks.html`, `safeWrite`) | Page carried on as if saved; no word that nothing had left the device | `errors.js` `noteIfSavedOffline()` after a successful `safeWrite` | Notice "Saved on this device — it will be sent when you are online." / "এই ডিভাইসে সংরক্ষিত হয়েছে — ইন্টারনেট এলে পাঠানো হবে।" |
| Bookmarks: move / folder edits (`safeWrite`) | Same | Same shared hook | Same notice |
| Mapping My Journey: new folder, rename, file a note (`safeWrite` / `runFolderWrite`) | "Folder … created." only | Hook added to `safeWrite` and to `runFolderWrite` | Same notice beside the page's own status |
| Notes page (`notes.html`, `safeWrite`) | "Saved, and recorded…" | Same shared hook | Same notice |
| Note editor status line (Notes pane, journey, notes.html; `note-window.js`) | "Saved" | `setEditStatus` says "Saved on this device — will be sent when you are online" / "এই ডিভাইসে সংরক্ষিত — ইন্টারনেট এলে পাঠানো হবে" while `navigator.onLine` is false | The honest line |

The notice is calm (amber, not the red failure banner), dismissible (44px close), does not block further writing, and
disappears when the line returns (`online` event). Online, nothing is shown.

Not measured and why: whether a reload while offline still shows the change (the stub's data does not survive a
reload except through its own session storage, which is not Firestore's cache), and the stub write log after
`setOffline(false)` (see the first section). No Rules change, no new stored field, no change to what is written.

## Files

`app/js/errors.js` (additive), `app/js/note-window.js` (**one line**: the "saved" status text; QR copies this file
byte for byte), `app/journey-map.html` (import + one call), `app/js/i18n/bn.js` (two new strings),
`tools/i18n-verify/offline-save-shared-tools-browser.mjs` (new; 48 checks, `--mutate=no-notice` fails 16).
