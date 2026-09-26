# Publishing the lemma-progress Rules: one paste

Issue #301. This is what makes *"Knowing a word should mark all the same
words, and all its forms as known as well"* possible: when you (or a
teacher/guardian) mark a word's **lemma** — the same dictionary word in any
inflection — as known, and it is confirmed once, every occurrence of that
lemma will count as known.

**What this does NOT do:** publishing this Rules file does not switch
anything on for a reader by itself. The Word Card, "Mark this word known
everywhere" and the new whole-Qur'an numbers (issue #303) are already
built against this candidate — but `app/js/study-lemma-progress-readiness.js`
still reads `ready: false`, so nothing reads or writes any of the three
collections below until BOTH this is published AND a separate governed
decision flips that gate, the same two-step shape every other Firestore
change in this project uses (see the wbw-total-counter enablement for the
precedent).

**26 Sep 2026 — a third collection was added:** `quranLemmaOccurrenceCounters`,
the bounded-cost answer to "how many of this lemma's occurrences are already
known individually", so marking a lemma known does not have to re-walk
every one of its occurrences on every tap. See
`app/js/quran-lemma-progress-data.js`'s own header for the design. The file
below is the whole-file paste, regenerated to include it; if you already
published the 26 Sep version that had only two collections, re-copy and
re-paste this file — it is still purely additive over the live rules.

## Steps

1. Open this file in the repository and copy **all** of it:
   `docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules`
   (on GitHub: open the file, then press the **Copy raw file** button at the
   top right of the file).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Lemma progress rules are live."**

## Why a whole-file paste is safe

That file is today's live rules (the same ones already covering everything
through the WordPress/Evernote importers, v08.79) plus **only additions**:
`quranLemmaProgress` (a learner's own lemma claim) and `quranLemmaApprovals`
(a supervisor's confirmation of it) — the same two-lane split the
already-deployed `quranWordProgress`/`quranWordApprovals` use, for the
identical reason (a Firestore rule cannot cheaply check which key of a map
someone touched, so a learner's claim and a supervisor's decision live in
their own documents) — plus `quranLemmaOccurrenceCounters`, the bounded-cost
counter above. Every line of the live file is still there, unchanged, and
nothing existing was touched.

The emulator suites check that the file is exactly the ruleset they tested:

- `tools/firestore-emulator/lemma-progress-real-function.rules.test.mjs`
  runs the real data-layer functions (claim, confirm) against it.
- `tools/firestore-emulator/lemma-progress-v1.rules.test.mjs` has the
  isolated allow/deny and mutation-paired cases, and can also be pointed at
  this exact assembled file.

## What it authorises, in one paragraph

Only the learner (or whoever may record for them — a guardian, a
co-enrolled teacher, or a tenant admin) may write their own
`quranLemmaProgress` claim. Only a **supervisor** — the same set minus the
learner themself — may write `quranLemmaApprovals`; nobody signs off their
own claim. The learner can always *see* a decision made about their own
work. Nothing may repoint a document at another tenant, person, level or
lemma once created, and nothing is ever deleted — an "un-claim" writes a
real `not_started` state, the same as everywhere else in this app.
