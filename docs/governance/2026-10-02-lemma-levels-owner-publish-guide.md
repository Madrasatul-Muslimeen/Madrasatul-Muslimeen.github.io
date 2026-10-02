# Publishing the Basic and Depth word-progress Rules: one paste

Decision 58 (2 Oct 2026). Your words: *"Level 1, WbW … count only similar
words/ form in the entire Quran. Level 2, Basic's progress will count for all
words from the same root with same meaning. Level 3, Depth … all words
originated from that root irrespective of its meaning."* You chose **one
"You know" line per level**, and said **"Yes, prepare them"** for these Rules.

**What this does NOT do:** publishing changes nothing you see by itself. The
Basic and Depth counting is built in its own Builder round (#490) and stays
switched off until you tell the Architect the Rules are live. Your WbW
progress, your totals and everything else stay exactly as they are. Nothing
is ever deleted.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Basic and Depth rules are live."**

No index is needed; there is nothing to do under **Indexes**.

## Why a whole-file paste is safe

That file is today's live Rules with **two lines widened**, plus a comment:

- A word-progress record that covers many words (today: WbW only) may now
  also be a **Basic** or a **Depth** record.
- Its occurrence counter may likewise be Basic or Depth.

Any other level is still refused, and a record's level can never be changed
after it is made. Every other line is unchanged — the Architect's test
compares the two files line by line.

## What it authorises, in one paragraph

Exactly what WbW already allows, now at Basic and Depth too: **you** (or a
guardian, or a teacher who teaches you) may record your Basic or Depth
progress; a teacher may confirm it; nobody else may read or write it, and
nothing can be deleted. The per-level "You know" totals need no change at all.

## How it was proven

`npm run lemma-levels` in `tools/firestore-emulator` runs the file in the
Firestore emulator (a private stand-in for the real database):

- every refusal is paired with an allow that differs in one fact;
- run against today's live Rules, the Basic/Depth records are refused;
- a broken copy that accepts any level fails the test.
