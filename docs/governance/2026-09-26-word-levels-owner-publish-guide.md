# Publishing the word-levels Rules: one paste

Issue #320. Your decision (row 4 of
`docs/governance/2026-09-26-owner-decisions.md`): *"Claiming for basic n
Depth is per word. (Because It's in WbW)"* — Basic Arabic and Arabic in
Depth are claimed and confirmed exactly the way Word by Word already is, on
the same word.

**What this does NOT do:** publishing this Rules file does not switch
anything on for a reader by itself. The Word Card's Basic and Arabic in
Depth tabs are already built against this candidate — but
`app/js/study-word-levels-readiness.js` still reads `ready: false`, so
neither level is read or written until BOTH this is published AND a
separate governed decision flips that gate, the same two-step shape every
other Firestore change in this project uses (see the lemma-progress and
wbw-total-counter enablements for the precedent).

**Word by Word itself needs nothing from you here.** It has been live since
MAP Phase 3 (13 Sep 2026) and is completely unaffected by this gate.

## Steps

1. Open this file in the repository and copy **all** of it:
   `docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules`
   (on GitHub: open the file, then press the **Copy raw file** button at the
   top right of the file).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Word levels rules are live."**

## Why a whole-file paste is safe

That file is today's live rules plus **one small change**, nothing removed:
the existing `quranWordProgress`/`quranWordApprovals` collections (a
learner's own claim, and a supervisor's confirmation of it) already accept a
Word by Word claim on any word; this change lets the SAME two collections
also accept a claim at the `basic` or `depth` level, on that same word.
Every other line of the live file is unchanged.

The emulator suite checks that the file is exactly the ruleset it tested:
`tools/firestore-emulator/word-levels-real-function.rules.test.mjs` runs the
real `setWordState()`/`decideWordApproval()` functions, at both new levels,
against this exact candidate.

## What it authorises, in one paragraph

Nothing new. The learner (or whoever may record for them — a guardian, a
co-enrolled teacher, or a tenant admin) may write their own claim at any of
the three levels; only a supervisor — the same set minus the learner
themself — may confirm or send one back; nobody signs off their own claim.
Nothing may repoint a document at another tenant, person, level, surah or
ayah once created, and nothing is ever deleted.
