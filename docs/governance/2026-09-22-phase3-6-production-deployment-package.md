# Firestore deployment package — MAP Phases 3, 4, 5 and 6

- **Date:** 2026-09-22
- **For:** the Owner, working in the Firebase Console. No coding, no command
  line.
- **Project:** `study-monitoring` (there is only one)
- **Status:** nothing here has been deployed yet. This document is the
  instructions and the exact text.
- **Supersedes:** `phase4-6-production-deployment-package-2026-09-17.md`,
  which covered three phases. This one covers a fourth, Arabic word-by-word
  progress, added on your own instruction. The old file is kept, not deleted
  — it is the record of what that earlier round did.

---

## 1. Read this first — the two things that would go wrong

**Do NOT paste any file whose name contains `candidate-2026-09-13`,
`candidate-2026-09-14` or `candidate-2026-09-15`.** Those are test extracts —
small files built so the automated checks can run one phase on its own.
Pasting one into the Console would **replace your entire live ruleset** with
it, and every other part of the app would stop working immediately.

**There is exactly one file to paste, and it is:**

```
docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules
```

That file is your current live rules **plus all four phases' additions** —
731 lines added, **0 removed**, checked automatically and checked by hand.

**Indexes go BEFORE rules.** An index is a lookup table Firestore needs
before it will answer certain questions. If you publish the rules first, the
new screens would be *allowed* to ask questions the database then *refuses to
answer*. Doing indexes first is harmless in the meantime, because the
collections stay locked until the rules are published.

---

## 2. Step one — create four indexes

**Nothing changed here from before.** The word-progress feature (Phase 3)
does not need a new index — its one query only ever asks equality questions
("this tenant, this person, this level, this surah"), which Firestore
answers without one. So the four indexes below are the complete list, exactly
as they were on 17 September.

**Firebase Console → Firestore Database → Indexes tab → Composite → Create
index.**

Do this four times. For each one: type the Collection ID, add the fields **in
the order listed**, set Query scope to **Collection**, then Create.

### Index 1

| | |
|---|---|
| Collection ID | `notes` |
| Field 1 | `tenantId` — Ascending |
| Field 2 | `ownerPersonId` — Ascending |
| Field 3 | `status` — Ascending |
| Field 4 | `updatedAt` — **Descending** |

### Index 2

| | |
|---|---|
| Collection ID | `noteRevisions` |
| Field 1 | `tenantId` — Ascending |
| Field 2 | `ownerPersonId` — Ascending |
| Field 3 | `noteId` — Ascending |
| Field 4 | `createdAt` — **Descending** |

### Index 3

| | |
|---|---|
| Collection ID | `noteSources` |
| Field 1 | `tenantId` — Ascending |
| Field 2 | `ownerPersonId` — Ascending |
| Field 3 | `sourceKey` — Ascending |
| Field 4 | `status` — Ascending |
| Field 5 | `createdAt` — **Descending** |

### Index 4

| | |
|---|---|
| Collection ID | `notePlacements` |
| Field 1 | `tenantId` — Ascending |
| Field 2 | `ownerPersonId` — Ascending |
| Field 3 | `folderId` — Ascending |
| Field 4 | `status` — Ascending |
| Field 5 | `order` — Ascending |

Each index says **Building** for a few minutes and then **Enabled**. Wait for
all four to read **Enabled** before step two.

**Already done this before?** If you deployed these four indexes as part of
the 17 September package, you do not need to repeat this step — check the
Indexes tab first; if all four already read Enabled, skip to step two.

---

## 3. Step two — publish the rules

**Firebase Console → Firestore Database → Rules tab.**

1. **Copy your current rules out first.** Select everything in the editor,
   copy, and paste it into a plain text file on your machine named
   `rules-backup-before-phase-3-6.txt`. This is your undo button.
2. Open `docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules` on
   GitHub, click **Raw**, select all, copy.
3. Back in the Console Rules editor: select everything, delete it, paste the
   new text.
4. Press **Publish**.

If the Console shows a red error and refuses to publish, **stop and say
so** — do not edit the text to make the error go away.

---

## 4. Step three — check it worked (about three minutes)

These are all things you can see without opening any code.

| # | Do this | Expect |
|---|---|---|
| 1 | Open the app, go to **Quran Study**, open a surah | The page loads normally, Arabic renders |
| 2 | Open the **Note & more** view on any āyah, type something, save | It saves, exactly as before. **This is the important one** — it proves your existing notes are unaffected |
| 3 | Reload the page and reopen that note | Your text is still there |
| 4 | Open **Records** and **Monitor** | Both load and show data as before |
| 5 | Firestore Console → Indexes | All four indexes read **Enabled** |
| 6 | Firestore Console → Rules | Shows a new version, published today |

**Nothing new appears on screen yet, and that is correct.** This deployment
opens the door; the screens that walk through it are either not built yet
(Notes, Mapping My Journey) or are held switched off on purpose until you've
confirmed they work cleanly (Phase 3 word tracking, Phase 4 activity
tracking). If something that used to work stops working, restore
`rules-backup-before-phase-3-6.txt` and say so.

---

## 5. What this actually switches on

| Phase | Collections | What becomes possible |
|---|---|---|
| **3 (new)** | `quranWordProgress`, `quranWordApprovals` | A learner's own word-by-word progress can be saved and reloaded, and a supervisor's review of it recorded |
| 4 | `activity/{…}/evidence` | Study events may record Activity evidence — never Mastery |
| 5 | `notes`, `noteRevisions`, `noteSources` | Permanent Notes with revision history, bound to Study units |
| 6 | `noteFolders`, `notePlacements` | Filing those Notes into Mapping My Journey |

**Who can touch what, in plain words:** a person, whoever guards them,
whoever actually teaches them, and whoever administers your account — the
same circle that can already see and log that person's other study progress
today. Nobody outside that circle, ever. A Note is stricter still: only the
person who wrote it may ever change it — everyone else in that circle may
only read it.

---

## 6. Evidence this text is safe to paste

| Claim | How it was checked |
|---|---|
| Adds to your rules, removes nothing | 731 lines added, **0 removed**, checked automatically |
| Does not quietly change an existing rule | Every helper shared with your live rules is byte-identical to what's already live |
| Would actually compile and run | Loaded into a real local copy of Firestore and executed |
| Word progress (Phase 3) still behaves, standing beside everything else | 42 checks, run against **this exact file** |
| Activity evidence (Phase 4) still behaves | 53 checks, run against **this exact file** |
| Notes (Phase 5) still behave | 60 checks, run against **this exact file** |
| Mapping My Journey (Phase 6) still behaves | 50 checks, run against **this exact file** |
| Your existing quick notes still work | Checked against this exact file: the current note-saving write still succeeds |
| No new lookup table is silently required | Checked against every question the app actually asks the database |

`tools/i18n-verify/rules-deployment-candidate-phase3-6.mjs` re-checks all of
the structural claims on demand — anyone auditing this, including ChatGPT
reading the repository, can run it themselves.

---

## 7. One thing worth reading before you publish

You asked for rules that only let a signed-in person touch their **own**
data. Taken completely literally, that would stop a parent logging progress
for their child, or a teacher recording for their own student — which this
app is built around allowing. What is actually in this file matches the
same rule every other part of your app already uses: a person, or someone
the app already recognises as responsible for them. Nobody outside that.

**If you meant something stricter than that — nobody else, ever, no
exceptions — say so and this gets rebuilt before you publish anything.**

---

## 8. Still waiting on you, separately

Publishing this does not decide any of these:

1. **The Note editor screen** — not built yet. Next on the list once this is
   live (see the status board).
2. **Mapping My Journey's screen** — not built yet, and what it should even
   look like is still your decision. Options are being prepared separately.
3. **Folder moves** — Firestore cannot prevent a folder being filed inside
   itself two steps removed. Today that is prevented only by the app itself,
   not the database. Closing it in the database would mean a folder could
   never be moved once created. Your call, only if you want it.

---

## 9. When you're ready

Say **"rules are live"** once you've published and the six checks in
section 4 all look right. That is what starts the next step: confirming word
progress genuinely saves and reloads on a real phone, and telling you exactly
what to tap.
