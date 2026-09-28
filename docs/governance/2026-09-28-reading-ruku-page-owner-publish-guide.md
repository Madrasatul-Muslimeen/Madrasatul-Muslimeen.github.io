# Publishing the Ruku'/Page reading Rules: one paste

Issue #349. Your decision (row 20 of
`docs/governance/2026-09-27-owner-decisions.md`): *"'Mark as read' for
Ruku', Page, Hizb and Juz? -- Ruku' and Page: yes. Hizb and Juz: later."*
Marking a Ruku' or a Page "read" from the Unit Card (issue #348) now counts
as real study, the same as marking an Āyah, a Range or a Surah does — once
this is published and switched on.

**What this does NOT do:** publishing this Rules file does not switch
anything on for a reader by itself. The Unit Card's "Mark as read" for
Ruku'/Page is already built against this candidate — but
`app/js/study-reading-units-readiness.js` still reads `ready: false`, so no
Ruku'/Page completion is read or written until BOTH this is published AND a
separate governed decision flips that gate, the same two-step shape every
other Firestore change in this project uses (see the word-levels, lemma-
progress and wbw-total-counter enablements for the precedent).

**Āyah/Range/Surah "Mark as read" need nothing from you here.** They have
recorded real study since 22 Sep 2026 and are completely unaffected by this
gate.

**Hizb and Juz stay off**, per your own "later" — this candidate adds
nothing for them, and nothing in the app offers to record either.

## Steps

1. Open this file in the repository and copy **all** of it:
   `docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules`
   (on GitHub: open the file, then press the **Copy raw file** button at the
   top right of the file).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Ruku'/Page reading rules are live."**

## Why a whole-file paste is safe

That file is today's live rules plus **one small change**, nothing removed:
the existing `activity/.../evidence` subcollection already accepts a
`reading.completed` event for an Āyah, a Range or a whole Surah; this
change lets the SAME collection also accept one for a Ruku' or a Page. No
new event type, no new Approach, no new field — a Ruku'/Page completion is
still exactly a `reading.completed` event crediting Reading with Tajweed
(`approach_01`) or Reading with Meaning (`approach_03`), the same pair a
Surah completion already credits. Every other line of the live file is
unchanged.

## What it authorises, in one paragraph

Nothing new in kind. Whoever may already record Study evidence for a
person (that person themself, a guardian, a co-enrolled teacher, or a
tenant admin — `canRecordFor()`, unchanged) may create one immutable
`reading.completed` event when they mark a Ruku' or a Page as read, exactly
as they already could for an Āyah, a Range or a Surah. It never grants
`achieved` or `mastered` status (Activity ≠ Mastery, ADR-003, unaffected);
nothing may repoint a document at another tenant, person, unit or day once
created; and nothing is ever deleted.
