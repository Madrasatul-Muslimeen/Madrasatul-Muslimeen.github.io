# Audit part 125 — a READ that is slow or fails on the shared tools (PCF MSA J29, issue #1297)

Parts 96/101/105/124 covered writes. This part covers the first READ of Records, Bookmarks, Notes, Mapping My Journey and Monitor, signed in with the stub's fixture, at 390 px.

## Measured first (before any change)

Failure modelled by a new OPT-IN stub switch, `window.__stubFailReads = ["bookmarks", …]` (`"*"` = every collection): `getDoc`/`getDocs` of a named collection reject with `{ code: "unavailable" }`. Default off. `stub-parity.mjs` stays green.

| Page | Slow line (stub latency 4000 ms) | First read FAILING | Way to try again |
|---|---|---|---|
| records | "Signed in as …" only; no "Loading…" word (page area blank/unfilled until data) | one raw line appended to the sign-in line: `failed at "load context data": unavailable Failed to get document because the client is offline.` (English only, raw code) | none but reload |
| bookmarks | same, no "Loading…" | `— Failed to get document because the client is offline.` appended to the sign-in line; empty page | none |
| notes | same | same raw line; page body empty | none |
| journey-map | same | same raw line; only the tab strip shows | none |
| monitor | its own sections say "Loading…" | raw line as for records, and the report area **stays "Loading…" for ever** | none |

The bn page showed the same raw English text in all failure cases (the sentence is not a translated string).

## Change (shared files only)

* New `app/js/read-failure.js` (additive): `showReadLoading()` ("Loading…", translated), `showReadFailure(err, retry)` and `clearReadStatus()`. The failure block, placed just above `#app`, says "This page could not load its data. Please check your connection and try again.", has a **Try again** button (44 px) that re-runs the page's `loadContextData()` (or reloads the page if the failure came before the app was shown), and a small "Ref: <code>" line.
* The five pages call it from their existing sign-in handler (`showReadLoading()` after sign-in, `clearReadStatus()` after success, `showReadFailure()` in the existing `catch`, replacing the raw `whoEl.textContent += …`). Mapping My Journey's embedded unit pane keeps its own `unitCannotLoad`.
* `app/js/i18n/bn.js`: two new strings (the sentence, and "Ref: {code}"); "Loading…" and "Try again" already existed.
* No Rules change, no stored field, no change to what is read at startup. `note-window.js`, `zab-bar.js` and the in-page note scripts are untouched.

## After

Slow line: "Loading…" / "লোড হচ্ছে…" shows while waiting and is gone once the page is filled. Failed read: the sentence in en and bn, the Try again button, the code only in the small Ref line; after the line returns, pressing Try again clears the block and the page fills in. A first-read (sign-in stage, `"*"`) failure shows the same block.

## Checks

`node tools/i18n-verify/shared-tools-read-failure-browser.mjs` — 185 passed, 0 failed (5 pages × en/bn × 390/1280; positive control; slow line; message; button height; Ref line; no sideways scroll; retry works). `--mutate=no-retry`: 120 passed, 45 failed. `--mutate=no-message`: 160 passed, 25 failed.

Known limit: the Try again for a failure before the app is shown is a page reload. The in-page Notes/Journey secondary reads (e.g. Trash, Timeline) keep their existing messages; not changed here.
