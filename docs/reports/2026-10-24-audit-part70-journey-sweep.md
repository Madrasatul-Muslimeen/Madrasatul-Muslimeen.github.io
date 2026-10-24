# Audit part 70 — regression sweep of the remaining 13 journey-* suites (PCF MSA J29, issue #1123)

Each suite run alone, from the repository root, against `main` (v12.54).

| Suite | Before (pass/fail) | After | Cause / action |
|---|---|---|---|
| journey-note-images-browser | 300 / 0 | 300 / 0 | green, nothing to change |
| journey-note-pane-browser | 327 / 0 | 327 / 0 | green |
| journey-note-windows-browser | 250 / 4 | 254 / 0 | **stale check** (4 failures: "...nothing about it is sent to Firestore", en 820/1280, bn 820/1280). Measured: the stub's `__fsLog` entries carry a JS `stack` string whose frames include `note-window.js`, so `JSON.stringify(entry).includes("note-window")` matched every entry (the logged entries were only `userPrefs` reads, `noteRevisions` reads and note-edit transactions, nothing about window geometry). Check now matches the entry without its `stack`; comment in place. No app file touched. |
| journey-pane-resize-browser | 40 / 0 | 40 / 0 | green |
| journey-reading-tools-browser | 488 / 0 | 488 / 0 | green |
| journey-s9-browser | 288 / 0 | 288 / 0 | green |
| journey-sections-browser | 349 / 0 | 349 / 0 | green |
| journey-sheet-browser | 962 / 0 | 962 / 0 | green |
