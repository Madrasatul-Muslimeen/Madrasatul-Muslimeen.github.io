# Publishing the WordPress-import Rules amendment — one paste

Issue #265. This lets an imported Note/folder carry its **real WordPress
date** and where it came from. Nothing else changes, and nothing is imported
until you do this **and** tell the Architect it is done.

**What this does NOT do:** it does not import anything by itself, and it does
not touch anything about how the app works today. The Import page already
works without this — you can open it, choose your export file, and see the
preview (how many folders, how many Notes, how many will link to an āyah)
right now. Only the last step — actually pressing "Import" — is switched off
until you do this.

## Steps

1. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
2. You will see the CURRENT rules — do not delete or replace them.
3. Open this file in the repository:
   `docs/governance/2026-09-25-wordpress-import-rules-candidate.rules`
4. That file has **two blocks**, `match /notes/{noteKey} { ... }` and
   `match /noteFolders/{folderKey} { ... }`. In the Console, find the two
   blocks with those same names inside your current rules, and **replace
   each one** with the matching block from the file (keep everything else in
   the Console exactly as it is — the helper functions just above those two
   blocks in the candidate file are already in your rules unchanged, they are
   only shown so a reader can compare).
5. Click **Publish**.
6. Reply to the Architect: **"WordPress import rules are live."** (The exact
   words the previous two publishes used — "Rules are live" / "Yes, switch it
   on" — are what the Architect looks for before switching the Import button
   on.)

That's it — one paste, one publish, one message back. The Import button then
switches itself on within the next round.
