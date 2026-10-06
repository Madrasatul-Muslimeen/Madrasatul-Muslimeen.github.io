# Part C3: where the "across devices" note settings are kept (6 Oct 2026)

**The Owner's answers (decision 72):**
- "34. across devices"
- "36. yes" (templates)
- "37. across" (quick phrases)
- "40. across" (heading styles)
- "45. yes" (folds the same on every device)

Each of these needs something stored somewhere other than one device. **The Owner chose Option A on 6 Oct 2026 (decision 80).**

## What was found

The deployed Rules already have a place for exactly this kind of data:

```
match /userPrefs/{uid} {
  allow read, write: if signedIn() && myUid() == uid;
}
```

- **One document per signed-in person**, readable and writable **only by that person**, from any device.
- It is in the published Rules today. Production and repository parity was verified on 10 Sep 2026.
- The old app (`legacy/index.html`) keeps only `themeColors` in it, written with `merge`.
- MMSA reads it only in the self-check screen.
- So MMSA can keep its note settings under one field of its own, `mmsaNotes`, written with `merge`. This touches nothing else in the document.

## The proposal (Option A, recommended): no Firebase step

| Item | What is kept | Where |
|---|---|---|
| 34 Tab groups | Each window's tab list: Note ids, a short name, a colour | `userPrefs/{uid}.mmsaNotes.tabs` |
| 36 Templates | Up to 50 templates: a title and the Note body. The body is cleaned by the same sanitiser as a Note. | `userPrefs/{uid}.mmsaNotes.templates` |
| 37 Quick phrases | Up to 100 short phrases | `userPrefs/{uid}.mmsaNotes.phrases` |
| 40 Heading styles | The border and background colour per heading level (H1–H4), from the palette only | `userPrefs/{uid}.mmsaNotes.headingStyles` |
| 45 Folds | Which headings are folded, per Note | `userPrefs/{uid}.mmsaNotes.folds[noteId]` |

**Why per person and not on the Note.**
- Folds and tabs are how *you* look at a Note, not part of what it says.
- Saving a fold into the Note itself would add a new version to 🕘 Versions on every tap.
- It would also fold the Note for everyone who reads it.

**Limits.**
- A Firestore document holds at most 1 MB.
- Templates are the only large part, so each template is capped at 20 KB and there are at most 50. That is about 1 MB at the very worst; in practice it is far less.
- If templates ever need more room, they move to their own collection. That would need a Rules change.

**What it does not do.** Nothing here is shared with family or teachers. Each person has their own tabs, templates, phrases, styles and folds.

**Safety.**
- The Rules already stop anyone writing another person's document.
- The app cleans template bodies with the Note sanitiser, and cleans every other field to a closed shape: ids, short text and palette colours.
- A failed save says so in words (I15).

## Option B: a new collection of its own (needs you to publish a Rules change)

A `noteUserSettings/{tenantId}__{personId}` collection, with the usual `schemaVersion`/`createdAt` fields (I17) and tenant isolation (I13).
- It is cleaner for the long term, and it would let a guardian see a child's templates later if that were ever wanted.
- **But** you would publish a Rules change before any of the five works.

## Recommendation

**Option A.** It works the moment it is built, crosses no Firebase step, and stays private to each person.

It could move to Option B later, by copying the data across without deleting anything, if sharing settings ever becomes a need.
