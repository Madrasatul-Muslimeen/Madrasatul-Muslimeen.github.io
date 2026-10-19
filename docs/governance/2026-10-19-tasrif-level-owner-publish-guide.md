# Publishing the Taṣrīf word-level Rules: one paste

PCF MSA J39 (19 Oct 2026). Your five Word card levels are WbW · Root · Family · Taṣrīf · Depth. Four of them reuse
levels the Rules already accept:
- Root saves as `intermediate`;
- Family saves as `basic`;
- WbW and Depth are unchanged.

**Taṣrīf is the one new level name**, so the Rules must learn it before a Taṣrīf mark can be saved.

**What this does NOT do:** publishing changes nothing you see by itself. Until you tell the Architect the Rules are
live, the Taṣrīf tab shows its content but keeps its "Achieved" buttons closed, with a note saying so. Your WbW,
Basic, Intermediate and Depth progress stays exactly as it is. Nothing is ever deleted.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-19-tasrif-level-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your `study-monitoring` project, then
   **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Taṣrīf rules are live."**

No index is needed.

## Why a whole-file paste is safe

That file is today's live Rules (as last published on 14 Oct, the Zab Rules) with **three lines widened**, plus a
two-line comment. A word-progress record, a whole-word claim or its counter that may say WbW, Basic, Intermediate or
Depth today may now also say **Taṣrīf**. Any other level is still refused, and a record's level can never be changed
after it is made. Every other line is unchanged: the Architect's test compares the two files line by line.

## How it was proven

`npm run tasrif-level` in `tools/firestore-emulator` runs the file in the Firestore emulator, a private stand-in for
the real database. The test checks that Taṣrīf records are:
- allowed for you, for a guardian, and for a teacher who teaches you;
- refused for anyone else.

It also checks that a misspelt level is refused, that a level is never changed, and that nothing is deleted.

Run against **today's** live Rules, the same test fails. That proves the new lines are what make it work (19 Oct:
1 pass on the candidate, 1 fail on today's Rules).
