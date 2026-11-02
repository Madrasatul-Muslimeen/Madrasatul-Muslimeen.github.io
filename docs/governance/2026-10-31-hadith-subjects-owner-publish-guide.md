# Publishing the Hadith Subjects rule: one paste

PCF MSA J106, question n106f. Your answer A on question 5 (10:20 am 31 Oct 2026): the three Subject lists (Learning
Akhlaq, Knowing Al-Ghayb, Stories from Hadith) are **one shared online list for the madrasah**.

**Do this only after the MSA Architect says "the Hadith Subjects rule is in `firestore.rules`".** Until then the file
below does not have it yet.

## Steps (about 2 minutes, on a computer)

1. Open this page and press **Copy raw file** (the two-squares button at the top right of the file):
   https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/firestore.rules
2. Open https://console.firebase.google.com/ and choose the **study-monitoring** project.
3. On the left, click **Firestore Database**, then the **Rules** tab at the top.
4. Click inside the big rules box. Press **Ctrl+A** (select all), then **Ctrl+V** (paste). This replaces it all.
5. Click **Publish**. Wait for "Rules published".
6. Tell the Architect or me: **"Hadith Subjects rule is live."**

The Architect then releases "Add to subject". Once it is out, you can check it like this:

7. Open Hadith Study → **Hadith Books** → Sahih al-Bukhari → a chapter → a hadith → **Add to subject** → **Learning
   Akhlaq**. It should say "Added to Learning Akhlaq."
8. Open **Subjects** (menu bar) → **Learning Akhlaq**: the hadith is in the list. Tap it: the hadith opens, with
   **← Back to Learning Akhlaq** at the top.

## Why a whole-file paste is safe

The file is today's live rules plus **one new block** for `hadithSubjects`, nothing removed. The Architect's merge is
checked so that it drops no live line.

## What the new block allows, in plain words

- **Everyone in the madrasah can read** its three Subject lists.
- **Only the owner or a prime can add a hadith or take one off.** A teacher, a student or a guardian cannot.
- **Nobody in another madrasah** can read it or write to it.
- **Nothing is ever deleted.** Taking a hadith off a list keeps it in the records, marked as taken off.
- Once the list exists, who made it and when can never be changed.

It was tested in Google's own test copy of the database: 1 suite, every refusal paired with a nearly identical allowed
case, and 14 deliberate breaks of the rule, every one caught (`tools/firestore-emulator/hadith-subjects-v1.rules.test.mjs`).

## If something goes wrong

- **"Error" on Publish:** do not publish anything else. Copy the red message and send it to the Architect.
- **To undo:** in the same Rules tab, the list of earlier versions (on the left) keeps the previous rules. Pick the one
  from before today and choose to bring it back; or just tell the Architect, who will guide you. Publishing or undoing
  rules never changes any data.
