# Switching on Dua saving: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish as the Keys rules on 5 Nov 2026.**
PCF MSA J104, your ticks 8 = A and 9 = A.

## What this does

It gives the Dua module three places to save:

- **memorising-plan marks** for each person. The person, their guardian, their teacher, owner and prime can mark them.
- **the madrasah's Dua changes**: added duas, moves, groups, titles, and "delete" (which only hides a dua, so it can come back).
- **the share record**. Anyone in the madrasah can record a share; only owner and prime can see the records.

It changes nothing that already works:

- The file is today's live rules **plus** a new Dua section at the end.
- **Nothing above that section was changed.** A check compares the two files on every run: 0 lines removed, 177 added.
- The new section was tested on a practice database: every allowed and refused case, and 63 deliberate breaks, each one caught.
  It was tested again inside this whole file.

Publishing does **not** switch any Dua screen on by itself. After you publish, tell the Architect "Dua rules are live".
The Dua Lead then builds the saving (round R6), and the Architect checks and releases it.

## The file to paste

`docs/proposals/dua-saving.DEPLOYMENT-candidate.rules`

Open it on GitHub:
<https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/proposals/dua-saving.DEPLOYMENT-candidate.rules>

Press **Raw**, select all, and copy.

**Never paste** `dua-saving.candidate.rules` (the file WITHOUT "DEPLOYMENT" in its name). That one is a test extract covering
only Dua. Pasting it would replace all of your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Take a screenshot of the Rules tab after publishing. Send it to the Architect with the words **"Dua rules are live."**
   Or tick the box in PCF MSA J104.

No index is needed. The Dua lists use only simple filters, which Firestore serves without one.

## If something looks wrong

The Rules tab has a **history** list on the left. Choose the previous version and press **Publish**, and everything is put
back exactly as it was.

## For the Architect, after the Owner publishes

- Make `firestore.rules` the deployment file, byte for byte, in its own commit, as for the Keys rules on 5 Nov
  (commit 25b30cdc).
- `rules-authorisation-executable.mjs`'s "DUA SAVING PENDING" check then fails by name. Replace it with:
  - a check that `firestore.rules` carries the published blocks;
  - the Dua Lead's forward and backward writer checks (R6).
