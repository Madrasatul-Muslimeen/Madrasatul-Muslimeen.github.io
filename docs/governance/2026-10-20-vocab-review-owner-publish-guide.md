# Publishing the Vocabulary review-schedule Rules: one paste

PCF MSA J48, round 2 (20 Oct 2026). You ticked **3A**: the Vocabulary module keeps each student's review schedule
**in the account**, so it follows them to any computer, including a reset office computer. The schedule says, for each
word a student has practised, when it is next due and how well it went last time.

The Rules must learn this one new kind of record before the app can save it.

**What this does NOT do:** publishing changes nothing you see by itself. The schedule is only saved once the
Architect releases round 2 and you have said the Rules are live. Every mark you have (WbW, Root, Family, Taṣrīf, Depth)
stays exactly as it is. Nothing is ever deleted. "Known" is still only the Word card's own marks; the schedule is
practice, never a mark.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-20-vocab-review-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your `study-monitoring` project, then
   **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Vocabulary rules are live."**

No index is needed.

## Why a whole-file paste is safe

That file is today's live Rules (as last published, the Taṣrīf Rules of 19 Oct) with **one block of 31 lines added**:
the rule for `quranVocabReview`. Every other line is unchanged. The Architect's test takes the block out and checks
that what is left is today's live Rules, byte for byte.

What the new block allows:
- One schedule per student. Its name is fixed by who it belongs to, so it cannot be saved under someone else's name.
- It can be read and written by the student, a guardian, and a teacher who teaches them: the same people who can mark
  that student's words today.
- Only the list of words and the time it was last changed may change. Who it belongs to never changes.
- It is never deleted.

## How it was proven

`npm run vocab-review` in `tools/firestore-emulator` runs the file in the Firestore emulator, a private stand-in for
the real database. The test checks that the schedule is:
- allowed for the student, a guardian and their teacher;
- refused for anyone else, and for a visitor who is not signed in.

It also checks that a schedule saved under the wrong name is refused, and so is a wrong record type, an extra field or
a missing "created by". It checks that who a schedule belongs to can never be changed, and that nothing is deleted.

Run against **today's** live Rules, the same test fails, because the record type does not exist there yet. Each of the
block's 11 checks was also removed one at a time. Every removal made the test fail at exactly the line that check
guards (20 Oct 2026).

## The record (for round 2's code)

`quranVocabReview/{tenantId}__{personId}`:

```
contractVersion: "quran-vocab-review:v1"
tenantId, personId
words: { <word key>: { b: box 0-5, due: "YYYY-MM-DD", r: "right" | "wrong", at: ISO time, n: times practised } }
schemaVersion, createdAt, updatedAt, createdBy          (I17)
```

The word key is the same key the Word card's marks use (the dictionary word, or its stand-in for a word with none).
One read loads the whole schedule (about 60 KB at 1,000 words, well under Firestore's 1 MB per document).
