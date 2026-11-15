# Saving Bangla word lists in each student's account: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish as the Dua groups rules on 13 Nov 2026.**
PCF MSA J143, your answer: B (keep each student's own-language list in their account).

## What this does

After this publish, and the release that follows it, the app can **save each student's Bangla (own-language) word list in
their account**, so the Monitor and every device of that student show the same list.

- **A student's own list:** the student can change it, and so can the people who already record progress for them (their
  guardian, their own teacher, owner and prime). Nobody else can see it.
- **The madrasah's list:** every member of the madrasah sees it. Owner, prime and teachers can change it.
- Nothing is ever deleted: removing a word saves the list again without it.
- **Your saved words stay.** The list already on your device is copied into your account once, and the device copy is kept.

It changes nothing else:

- The file is **today's published rules with one new section added at the end**. Nothing above it moved. A check compares
  the two files on every run.
- Tested on a practice database: who may read and change each list (for example, another student cannot see a student's
  list; a teacher who does not teach that student cannot; another madrasah cannot read yours), and 28 deliberate breaks of
  the new section, each one caught. The same tests also passed against the whole file you will paste.

Publishing does **not** switch anything on by itself. After you publish, the Architect switches the saving on in the next release.

## The file to paste

`docs/proposals/bangla-words.DEPLOYMENT-candidate.rules`

Open it on GitHub (once the Architect has merged it to `main`):
<https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/proposals/bangla-words.DEPLOYMENT-candidate.rules>

Press **Raw**, select all, and copy.

**Never paste** `bangla-words.candidate.rules` (a test extract covering only the word lists). Pasting it would replace all
of your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Tick **Published** in PCF MSA J143 (or tell the Architect **"Bangla words rules are live."**).

No index is needed.

## If something looks wrong

The Rules tab has a **history** list on the left. Choose the previous version and press **Publish**, and everything is
put back exactly as it was.

## For the Architect, after the Owner publishes

- Make `firestore.rules` the deployment file, byte for byte, in its own commit.
- Add the file to `PUBLISHED_DEPLOYMENTS` in `tools/i18n-verify/dawah-boundary.mjs`.
- `rules-authorisation-executable.mjs`'s "BANGLA WORDS PENDING" check and the HADITH NAMES byte-for-byte check (line ~768,
  which pins the hadith-names file) then fail by name. Update each in place to assert what production carries.
- In the same release, open the gate: `ready: true` and `decision { by: 'master-architect', on, reference }` in
  `app/js/bangla-words-readiness.js`, the reference naming the commit that records the publish.
- `npm run bangla-words` with `FULL_RULES_FILE=firestore.rules` then proves the live file.
- keep1116: test save → update → reopen across that release (a device list must be copied up once and kept on the device).
