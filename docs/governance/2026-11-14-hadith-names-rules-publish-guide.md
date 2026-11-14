# Letting your own Bangla names for the Hadith books be saved: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish as the Dua groups rules on 13 Nov 2026.**
PCF MSA J106, stage 3 part 2 (the Hadith Lead's names editor, v15.01).

## What this does

After this publish, and one small release by the Architect, the app can **save your madrasah's own Bangla names** for
the Hadith books and their chapters (the Bukhari books, `ch-1`, `ch-2` …):

- **Every member of your madrasah sees the names.** Only **owner and prime** can write, change or remove them.
- **Remove keeps the name, marked removed**, so nothing is ever erased; it can be put back.
- Another madrasah cannot read or change yours. The whole list cannot be deleted.

It changes nothing else:

- The file is **today's published rules with one new section added at the end**. Nothing above it moved. A check compares
  the two files on every run.
- Tested on a practice database, both the new section alone and the whole file you paste: a teacher cannot write, another
  madrasah cannot read, a stray extra field is refused, and deliberate breaks of the section are each caught.

Publishing does **not** switch anything on by itself. The editor is built (v15.01) but switched off; the Architect switches it
on in the next release, after you tick Published.

## The file to paste

`docs/proposals/hadith-names.DEPLOYMENT-candidate.rules`

Open it on GitHub (once the Architect has merged it to `main`):
<https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/proposals/hadith-names.DEPLOYMENT-candidate.rules>

Press **Raw**, select all, and copy.

**Never paste** `tests/firestore/hadith-names-v1.proposed.rules` (a test extract covering only the names). Pasting it would
replace all of your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Tick **Published** in the PCF MSA monitor (or tell the Architect **"Hadith names rules are live."**).

No index is needed.

## If something looks wrong

The Rules tab has a **history** list on the left. Choose the previous version and press **Publish**, and everything is
put back exactly as it was.

## For the Architect, after the Owner publishes

- Make `firestore.rules` the deployment file, byte for byte, and set `HADITH_NAMES_PUBLISHED = true` in
  `app/js/hadith-names-switch.js`, in ONE release.
- `rules-authorisation-executable.mjs`'s HADITH NAMES checks keep passing (the deployment check reads firestore.rules once it
  carries the block; PENDING asks nothing then). Add the hadithNames forward/backward checks in the same release, and update
  the other checks that pin `firestore.rules` byte for byte (the DUA GROUPS ones) in place to the new published file.
- Re-run `hadith-names-browser.mjs` with the switch true, and `npm run hadith-names` with `FULL_RULES_FILE=firestore.rules`.
- If `firestore.rules` changes for any other reason before the Owner publishes, rebuild this deployment file (the check fails
  by name until you do) and tell the Owner the link now carries the new file.
