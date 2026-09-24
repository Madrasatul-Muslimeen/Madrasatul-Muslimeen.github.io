# Firestore deployment guide — the whole-Qur'an/Juz word counter (issue #206)

- **Date:** 2026-09-24
- **For:** the Owner, working in the Firebase Console. No coding, no command
  line — only pasting.
- **Project:** `study-monitoring` (D1 — there is only one)
- **Status:** nothing here has been deployed. This document is the
  instructions and the exact text.
- **This round is SIMPLER than the last one you did (Phase 4-6, 17 Sep).**
  That one needed four indexes published BEFORE the rules. **This one needs
  no index at all** — see "Why no index" below. It is one paste, one click.

---

## 1. Read this first — the one thing that would go wrong

**Do NOT paste `docs/governance/2026-09-23-wbw-total-counter-rules-candidate.rules`.**
That file's own header says so in words: it is a **self-contained test
extract**, built so an automated test can run it on its own. It covers only
the one new collection this round adds and would **replace your entire live
ruleset** with a file that only understands that one collection — every
other part of the app (sign-in, Records, Monitor, Notes, everything) would
stop working immediately.

**There is exactly one file to paste, and it is:**

```
docs/governance/2026-09-24-wbw-total-counter-DEPLOYMENT-candidate.rules
```

That file is your current live rules, **byte-for-byte, plus one small
addition** — one new block governing the new collection (`quranWordTotals`)
and two small helper functions it needs. Nothing existing was changed, and
nothing existing was removed — checked automatically, not assumed (see
section 5).

**Since you can't open a repository file yourself, I will hand you the exact
text to paste when I give you this guide** — either pasted directly into our
conversation, ready to select-all and copy, or as a plain-text file you can
open. Don't retype anything by hand; a single mistyped character in a Rules
file can lock out real data.

---

## 2. Why no index this time

The Phase 4-6 round needed four indexes published first, because those
screens **ask questions** of the database — "give me this person's Notes,
newest first" — and a question like that needs a lookup table (an index)
built in advance or Firestore refuses to answer it in production.

This round's new collection, `quranWordTotals`, is never asked a question
like that. The app only ever looks up **one exact document by its own id**
(`tenantId__personId`) — it never asks "list everyone's totals" or "give me
the totals sorted by anything." A lookup by exact id needs no index, on any
collection, ever. So there is nothing to build in the Indexes tab for this
round — go straight to Rules.

---

## 3. Step one — publish the rules (there is no step two)

**Firebase Console → Firestore Database → Rules tab.**

1. **Copy your current rules out first**, as your undo button. Select
   everything in the editor, copy, and paste it into a plain text file on
   your machine — call it `rules-backup-before-wbw-total-counter.txt`.
2. Take the text I hand you for
   `docs/governance/2026-09-24-wbw-total-counter-DEPLOYMENT-candidate.rules`
   and select all of it, copy it.
3. Back in the Console Rules editor: click inside the editor, select
   **everything** (Ctrl+A or Cmd+A), delete it, and paste in the new text.
4. Click **Publish**.

If the Console shows a red error and refuses to publish, **stop and say
so** — do not edit the text yourself to make the error go away.

---

## 4. Step two — check it worked (about one minute)

These are things you can see without opening any code.

| # | Do this | Expect |
|---|---|---|
| 1 | Open the app, go to **Quran Study**, open a surah | The page loads normally, Arabic renders, exactly as before |
| 2 | Try Word-by-Word study as you normally would | Works exactly as it did before this publish |
| 3 | Firestore Console → Rules tab | Shows a **new version, published today** — this is your main confirmation, the same "Rules are live" screenshot shape as 22 Sep |

**Nothing new appears on screen anywhere in the app, and that is
correct.** This publish only opens a door in the database — nothing yet
walks through it. The gold ring, the Approach/Word-by-Word toggle and the
percentage counters all stay completely invisible until a second, separate
step (section 6 below).

---

## 5. Evidence this text is safe to paste

| Claim | How it was checked |
|---|---|
| Adds to your rules, removes nothing | Every line of your current live rules is confirmed present, unchanged, in the file to paste — 0 lines removed, checked automatically |
| Does not quietly change an existing rule | Every helper function the new block relies on (who's signed in, who can act for whom, etc.) is the SAME function already in your live rules — nothing was redefined a second time |
| Would actually compile | Loaded into the Firestore emulator (a local practice copy of Firestore) and it started up cleanly |
| The new collection behaves correctly | 27 separate allow/deny checks run against the file to paste — a person can see and edit their own counter; a guardian can do it for their child; a teacher only for a student they actively teach; a stranger is refused; nobody can invent their own total; nobody can delete it |
| One check was deliberately broken to prove it isn't a rubber stamp | With the protection removed, the same 27 checks correctly caught it and failed — then it was put back and re-confirmed clean |

`tools/firestore-emulator/wbw-total-counter-v1.rules.test.mjs` re-runs all
of this on demand (`npm run wbw-total-counter` from
`tools/firestore-emulator/`).

---

## 6. This is a TWO-STEP gate — publishing is step one only

**This is the same two-step ceremony this project always uses for turning a
built-but-gated feature on** — the same shape Phase 4's Activity evidence
went through (v08.34, 22 Sep 2026: *"It worked, switch on Phase 4."*).

**Step one (this document): publish the Rules.** That alone changes
**nothing you can see.** The app-side gate,
`app/js/study-wbw-total-readiness.js`, still reads `ready: false` as a
literal, and it imports nothing at all — it cannot even look at whether the
Rules were published — so the ring, the toggle and the percentage counters
stay off regardless.

**Step two: a separate, explicit decision from you, after you've actually
seen it work.** Not before. The shape that decision needs, exactly like
Phase 4's:

1. You (or someone testing on your behalf) actually uses Word-by-Word study
   for a while, on a real phone, after this Rules publish.
2. You confirm it worked — the same kind of plain message Phase 4 got
   (*"It worked, switch on Phase 4"*).
3. Only then does the gate get flipped — recorded as a real governed
   decision (who decided, the real date, a reference to what proved it
   worked), never a bare code change.

**So after you publish and confirm the Rules tab shows today's date, tell
me:** *"Rules are published for the word counter."* That's all step one
needs from you. I will not turn the feature on until you've separately told
me it's working and you want it switched on — the same two messages Phase 4
needed, not one.
