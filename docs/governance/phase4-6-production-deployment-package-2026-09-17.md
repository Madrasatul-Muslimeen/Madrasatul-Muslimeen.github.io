# Firestore deployment package — MAP Phases 4, 5 and 6

- **Date:** 2026-09-17
- **For:** the Owner, working in the Firebase Console. No coding, no command line.
- **Project:** `study-monitoring` (D1 — there is only one)
- **Status:** nothing here has been deployed. This document is the instructions and the exact text.

---

## 1. Read this first — the two things that would go wrong

**Do NOT paste any file whose name contains `candidate-2026-09-15`.** Those two
files (`phase5-note-foundation-rules-candidate…` and
`phase6-journey-map-rules-candidate…`) are **test extracts**. Each one is a
complete little rules file covering three collections and nothing else, built so
the automated tests can run it on its own. Pasting one into the Console would
**replace your entire live ruleset** with it, and every other part of the app
would stop working immediately.

**There is exactly one file to paste, and it is:**

```
docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules
```

That file is your current live rules **plus** the three phases' additions —
625 added lines, **0 removed**, verified by an automated check.

**Indexes go BEFORE rules.** An index is a lookup table Firestore needs before it
will answer certain queries. If you publish the rules first, the new Note screens
would be *allowed* to ask questions the database then *refuses to answer*. Doing
indexes first is harmless in the meantime, because the collections stay locked
until the rules are published.

---

## 2. Step one — create three indexes

**Firebase Console → Firestore Database → Indexes tab → Composite → Create index.**

Do this three times. For each one: type the Collection ID, add the fields **in
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

Each index says **Building** for a few minutes and then **Enabled**. Wait for all
three to read Enabled before step two. (The same three are recorded in machine
form at `docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json`.)

---

## 3. Step two — publish the rules

**Firebase Console → Firestore Database → Rules tab.**

1. **Copy your current rules out first.** Select everything in the editor, copy,
   and paste it into a plain text file on your machine named
   `rules-backup-before-phase-4-6.txt`. This is your undo button.
2. Open `docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` on
   GitHub, click **Raw**, select all, copy.
3. Back in the Console Rules editor: select everything, delete it, paste the new
   text.
4. Press **Publish**.

If the Console shows a red error and refuses to publish, **stop and say so** —
do not edit the text to make the error go away.

---

## 4. Step three — check it worked (about two minutes)

These are all things you can see without opening any code.

| # | Do this | Expect |
|---|---|---|
| 1 | Open the app, go to **Quran Study**, open a surah | The page loads normally, Arabic renders |
| 2 | Open the **Note & more** view on any āyah, type something, save | It saves, exactly as before. **This is the important one** — it proves your existing notes are unaffected |
| 3 | Reload the page and reopen that note | Your text is still there |
| 4 | Open **Records** and **Monitor** | Both load and show data as before |
| 5 | Firestore Console → Indexes | All three new indexes read **Enabled** |
| 6 | Firestore Console → Rules | Shows a new version, published today |

**Nothing new appears on screen, and that is correct.** This deployment opens the
door; the screens that walk through it (the Note editor, Mapping My Journey) are
not built yet and are held deliberately. If something that used to work stops
working, restore `rules-backup-before-phase-4-6.txt` and say so.

---

## 5. What this actually switches on

| Phase | Collections | What becomes possible |
|---|---|---|
| 4 | `activity/{…}/evidence` | Study events may record Activity evidence — never Mastery (ADR-003) |
| 5 | `notes`, `noteRevisions`, `noteSources` | Permanent Notes with revision history, bound to Study units |
| 6 | `noteFolders`, `notePlacements` | Filing those Notes into Mapping My Journey |

Only the **owner of a Note** may ever write one. A guardian, a teacher and an
administrator may read, and may never author or alter. That is stricter than the
rest of the app on purpose: a Note is a person's own private writing, not a
record kept about them.

---

## 6. Evidence this text is safe to paste

| Claim | How it was checked |
|---|---|
| Adds to your rules, removes nothing | 625 lines added, **0 removed**, asserted automatically |
| Does not quietly change an existing rule | Every helper shared with production is byte-identical to production's |
| Would actually compile | Loaded into the Firestore emulator and run |
| Phase 4 still behaves | 53 assertions against **this file** |
| Phase 5 still behaves | 60 assertions against **this file** |
| Phase 6 still behaves | 50 assertions against **this file** |
| Your existing quick notes still work | Asserted against this file: the owner's `ayahNotes` write still succeeds |

`tools/i18n-verify/rules-deployment-candidate.mjs` re-checks all of that on
demand.

---

## 7. Still waiting on you, separately

Deploying this does not decide either of these:

1. **The Note editor** — accepted decision ADR-004 says "exact Note schema and
   editor remain deferred", so it is not built. Un-defer it when you want it.
2. **Folder moves** — Firestore rules cannot prevent a circular folder tree
   (A inside B inside A). Today that is prevented in the app only. Closing it in
   the database would mean folders can never be moved after creation. Your call.
