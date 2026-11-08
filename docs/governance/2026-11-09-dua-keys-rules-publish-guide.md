# Letting Hisn al-Muslim and Qur'anic duas be edited and shared: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish as the Dua saving rules on 8 Nov 2026.**
PCF MSA J104 line 23, your answer: Part 1 = A, Part 2 = D, and option B.

## What this does

Today the madrasah can change and share only the numbered duas and the duas it adds itself.
After this publish it can also **change** (title, groups, hide) and **record a share of**:

- a **Hisn al-Muslim** dua, saved as `hisn-<chapter>-<entry>` (for example `hisn-27-5`);
- a **Qur'anic** dua, saved as `quran-<surah>-<ayah>` or `quran-<surah>-<ayah>-<ayah>` (for example `quran-7-23`, `quran-2-285-286`).

It changes nothing else:

- The file is **today's published rules with two lines changed** (and one comment line added to explain them).
- The two lines are the "which dua names are allowed" line in the Dua changes section and the same line in the share section.
  Nothing else in the file moved. A check compares the two files on every run.
- Who may do what is unchanged: owner and prime change duas; anyone in the madrasah records a share; owner and prime see
  the share records; nothing is ever deleted.
- A Hisn or Qur'anic dua is **not** an "added" dua, so it cannot carry its own Arabic text in your changes. Its text stays
  the book's.
- Tested on a practice database: every allowed and refused name (for example `hisn-27`, `HISN-27-5` and
  `quran-2-285-286-287` are refused), and deliberate breaks of the new line, each one caught.

Publishing does **not** switch anything on by itself. After you publish, tell the Architect "Dua keys rules are live".

## The file to paste

`docs/proposals/dua-keys-hisn-quran.DEPLOYMENT-candidate.rules`

Open it on GitHub (once the Architect has merged it to `main`):
<https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/proposals/dua-keys-hisn-quran.DEPLOYMENT-candidate.rules>

Press **Raw**, select all, and copy.

**Never paste** `dua-saving.candidate.rules` (a test extract covering only Dua). Pasting it would replace all of your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Take a screenshot of the Rules tab after publishing. Send it to the Architect with the words **"Dua keys rules are live."**
   Or tick the box in PCF MSA J104.

No index is needed.

## If something looks wrong

The Rules tab has a **history** list on the left. Choose the previous version (the Dua saving rules of 8 Nov) and press
**Publish**, and everything is put back exactly as it was.

## For the Architect, after the Owner publishes

- Make `firestore.rules` the deployment file, byte for byte, in its own commit (as for the Dua saving rules on 8 Nov).
- Add the file to `PUBLISHED_DEPLOYMENTS` in `tools/i18n-verify/dawah-boundary.mjs`.
- `rules-authorisation-executable.mjs`'s "DUA KEYS PENDING" check and the "DUA SAVING: firestore.rules IS the published
  deployment file" check then fail by name. Update both in place to assert what production carries.
- Then `npm run dua-saving` with `FULL_RULES_FILE=firestore.rules` and `npm run dua-keys` (which then also passes with
  `FULL_RULES_FILE=firestore.rules`) prove the live file.
