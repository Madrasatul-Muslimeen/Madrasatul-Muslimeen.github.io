# Publishing the Intermediate word-level Rules: one paste

Decisions 101 and 103 (12 Oct 2026). Your words: *"We will set four levels actually. WbW is exact word everywhere.
Basic is Same root meaning, with different forms … 'INTERMEDIATE' (new level) … and the DEPTH remains as it is"*, and
*"Inter is for different meanings of the same root and of the same word. Depth is for all other things."*

**What this does NOT do:** publishing changes nothing you see by itself. The Intermediate tab on the Word card is
built in its own round (after you have seen its demo) and stays switched off until you tell the Architect the Rules
are live. Your WbW, Basic and Depth progress stay exactly as they are. Nothing is ever deleted.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-12-intermediate-level-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your `study-monitoring` project,
   **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Intermediate rules are live."**

No index is needed.

## Why a whole-file paste is safe

That file is today's live Rules with **three lines widened**, plus a two-line comment. Where a word-progress record,
a whole-word claim or its counter may say WbW, Basic or Depth today, it may now also say **Intermediate**. Any other
level is still refused, and a record's level can never be changed after it is made. Every other line is unchanged:
the Architect's test compares the two files line by line.

## How it was proven

`npm run intermediate-level` in `tools/firestore-emulator` runs the file in the Firestore emulator (a private
stand-in for the real database): Intermediate records allowed for you, a guardian and a teacher who teaches you,
refused for anyone else; a misspelt level refused; level never changed; nothing deleted. Run against **today's** live
Rules, the same test fails, which proves the new lines are what makes it work.
