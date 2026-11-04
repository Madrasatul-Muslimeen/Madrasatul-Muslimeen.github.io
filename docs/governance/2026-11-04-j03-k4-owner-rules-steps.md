# Keys to Understanding: the one Rules step for the teacher's view (PCF MSA J03, round K4)

Written 4 Nov 2026 for the Owner. **Nothing here has been published.** This is an Owner Control Gate: only you
publish Rules.

## What this step does, in plain words

Your students mark āyāt, words and hadith as **Difficult**, **Need practice** or **Done**. On the **Monitor** page a
new section, **"Keys to Understanding — your students' marks"**, shows each student's marks to their teacher.

Firebase keeps those marks behind its security Rules (the "who may read what" list). Today's Rules do not mention
the marks at all, so Firebase refuses every read, and the section says:
*"Your students' marks can be read once the Owner publishes the Keys Rules step."*

This step adds the marks to the Rules:
- a student reads and writes **their own** marks;
- their **guardian**, a **teacher who teaches them** (shares a class or course with them), and the **owner/prime**
  can read and write them too (the same people who can already record a student's progress);
- an unrelated teacher **cannot** see them;
- nothing can ever be deleted (a removed mark writes a shorter list).

The file to paste is `docs/governance/2026-10-15-ayah-keys-candidate.rules`. It is **today's Rules
(`firestore.rules`, last changed 2 Nov 2026 for hadithSubjects) with one block added at the end and nothing
removed.** It was tested on the Firestore emulator: 25 of 25 checks for the āyah marks and 25 of 25 for the hadith
marks, each check also proven to fail when the Rules are broken on purpose.

> **Before you start:** if any other Rules step was published after 4 Nov 2026, stop and ask the Architect for a
> fresh copy of this file. Pasting an older copy would undo the newer step.

## The steps (about 5 minutes)

1. Open the file on GitHub:
   https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/governance/2026-10-15-ayah-keys-candidate.rules
   (once this round is merged; the Architect gives you the link if it has moved).
2. Above the file, on the right, press the **Copy raw file** button (two overlapping squares). The whole file is now
   copied.
3. In a new tab open **https://console.firebase.google.com** and sign in with the account that owns the app.
4. Choose the project **study-monitoring**.
5. In the left menu choose **Build → Firestore Database**, then the **Rules** tab at the top.
6. Click inside the big text box. Select everything in it (**Ctrl+A**, or **⌘+A** on a Mac) and delete it.
7. Paste (**Ctrl+V**, or **⌘+V**). The first line must read `rules_version = '2';` and the last lines end with `}`.
8. Press **Publish** (blue, top right). Wait for "Rules published" (a few seconds).
   If it shows a red error instead, do not change anything: press **Discard**, take a photo of the message, and send
   it in J03.

## How to check it worked (2 minutes)

1. Sign in to the app as a **teacher** who teaches at least one student who has marked something (or as yourself:
   the owner can read every student's marks).
2. Open **Monitor** (Operation menu → Monitor).
3. Scroll down and press **"Keys to Understanding — your students' marks"**.
4. You should see one box per student with counts such as *Difficult 2 · Need practice 1 · Done 4*, a
   **Show on wheel** button, and a list **"Marked by most students"**.
   The yellow message about the Rules step should be **gone**.
5. Press **Open the āyah** on one item: it opens that āyah, with **← Back** to return to Monitor.

Until students start marking (the marks on the Āyah card come with the QR Lead's and Hadith Lead's rounds), every
count shows 0. That still proves the step worked: before it, the yellow message shows instead of the counts.

## The way back (if anything looks wrong)

Firebase keeps every Rules version you publish.

1. Firebase Console → **Firestore Database → Rules**.
2. On the left of the text box is the **history** list of earlier versions (dated). Click the version from just
   before today's publish.
3. Press **Revert** (or copy that version's text into the box) and **Publish**.

The app then behaves exactly as before: the Monitor section shows its yellow message again, and nothing else
changes. No mark is lost by going back; the marks simply cannot be read until the step is published again.
