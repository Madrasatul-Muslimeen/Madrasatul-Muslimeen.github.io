# Switching on Dawah pages: one publish in Firebase

**For the Owner. About 3 minutes. The same kind of publish you did on 22 Sep 2026.**

## What this does

It lets the app **store** Dawah printable pages. It changes nothing that
already works:

- The file is today's live rules **plus** a new Dawah section at the end.
- **Nothing above that section was changed** (checked: 0 lines removed,
  256 added).
- It was tested against the same checks as today's rules:
  - Dawah: 65 checks
  - Notes: 5 checks
  - Mapping My Journey: 26 checks

  All pass.

Publishing does **not** switch the Dawah screens on by itself. After you
publish, tell the Architect "Dawah rules are live". The Architect then
switches the screens on.

## The file to paste

`docs/governance/phase7-dawah-DEPLOYMENT-candidate-2026-09-24.rules`

Open it on GitHub, press **Raw**, select all, and copy.

**Never paste** `phase7-dawah-pages-rules-candidate-2026-09-24.rules`, the file
with *pages-rules-candidate* in its name. That one is a test extract covering
only Dawah. Pasting it would replace all of your live rules.

## Steps

1. Open <https://console.firebase.google.com/> and choose **study-monitoring**.
2. Left menu: **Firestore Database**, then the **Rules** tab.
3. Click inside the rules editor, select everything (Ctrl+A), and delete it.
4. Paste the file you copied (Ctrl+V).
5. Press **Publish**.
6. Take a screenshot showing the Rules tab after publishing, and send it to
   the Architect with the words **"Dawah rules are live."**

No index is needed. The Dawah lists only use simple filters, which Firestore
serves without one.

## If something looks wrong

The Rules tab has a **history** list on the left. Choosing the previous
version and pressing **Publish** puts everything back exactly as it was.
