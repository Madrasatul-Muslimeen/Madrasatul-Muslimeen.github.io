# Publishing the WordPress-import Rules: one paste

Issue #265. This lets an imported Note or folder keep its **original
WordPress date** and a record of where it came from. Nothing else changes,
and nothing is imported until you publish this **and** tell the Architect.

**What this does NOT do:** it does not import anything by itself. You can
open the Import page right now, choose your export file and see the preview
(1,464 folders, 1,083 Notes, how many link to an āyah). Only the **Import**
button waits for this.

## Steps

1. Open this file in the repository and copy **all** of it:
   `docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules`
   (on GitHub: open the file, then press the **Copy raw file** button at the
   top right of the file).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"WordPress import rules are live."**

## Why a whole-file paste is safe

That file is today's live rules plus **only additions**: the new optional
date/import fields on `notes` and `noteFolders`, and a guard that freezes them
once written. The live file's lines are all still there, and one line gains
one extra word, `'importSource'`. The emulator suites check that the file is
exactly the ruleset they tested:

- `tools/firestore-emulator/wordpress-import-real-function.rules.test.mjs`
  runs the real importer against it. The Owner's real export gave 1,464
  folders, 1,083 Notes, 550 āyah links and 2,319 filings, with nothing
  refused, and a second run created nothing.
- `tools/firestore-emulator/wordpress-import-v1.rules.test.mjs` has 16
  allow/deny cases.
