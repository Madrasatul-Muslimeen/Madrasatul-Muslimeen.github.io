# Letting Dua groups be saved: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish as the Dua keys rules on 9 Nov 2026.**
PCF MSA J104 line 25, your answer: real delete (B), sub groups up to 3 levels (C), the pop-up (E).

## What this does

After this publish the app can **save Dua groups**:

- **The madrasah's own groups**, which every member of the madrasah sees. Only **owner and prime** can make, rename,
  move or delete them.
- **Each person's own groups**. The person can change their own; so can the people who already record progress for them
  (their guardian, their own teacher, owner and prime). Nobody else can see them.
- Groups can sit inside groups, up to **3 levels**, and can be dragged to any level; up to 200 groups in each list.

**Delete is a real delete, as you chose.** When a group is deleted, it and the groups inside it are **gone for good**;
there is no undo. The duas themselves, and every mark on them, are **not** touched. (Nothing in the database is ever
erased as a whole: the list of groups is simply saved again without that group.)

It changes nothing else:

- The file is **today's published rules with one new section added at the end**. Nothing above it moved. A check compares
  the two files on every run.
- Tested on a practice database: who may read and write each kind of group (for example, another student cannot change a
  student's groups; another madrasah cannot read yours; a teacher who does not teach that student cannot), and 25
  deliberate breaks of the new section, each one caught.

Publishing does **not** switch anything on by itself. After you publish, the Dua Lead builds the saving.

## The file to paste

`docs/proposals/dua-groups.DEPLOYMENT-candidate.rules`

Open it on GitHub (once the Architect has merged it to `main`):
<https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/blob/main/docs/proposals/dua-groups.DEPLOYMENT-candidate.rules>

Press **Raw**, select all, and copy.

**Never paste** `dua-groups.candidate.rules` (a test extract covering only Dua groups). Pasting it would replace all of
your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Tick **Published** in PCF MSA J104 (or tell the Architect **"Dua groups rules are live."**).

No index is needed.

## If something looks wrong

The Rules tab has a **history** list on the left. Choose the previous version and press **Publish**, and everything is
put back exactly as it was.

## For the Architect, after the Owner publishes

- Make `firestore.rules` the deployment file, byte for byte, in its own commit.
- Add the file to `PUBLISHED_DEPLOYMENTS` in `tools/i18n-verify/dawah-boundary.mjs`.
- `rules-authorisation-executable.mjs`'s "DUA GROUPS PENDING" and "DUA GROUPS: the deployment file is firestore.rules
  unchanged…" checks then fail by name, and so do the DUA SAVING / DUA KEYS PUBLISHED byte-for-byte checks (they pin the
  word-effort file). Update each in place to assert what production carries; add the DUA GROUPS forward/backward checks
  when the Dua Lead's writer lands.
- `npm run dua-groups` with `FULL_RULES_FILE=firestore.rules` then proves the live file.
