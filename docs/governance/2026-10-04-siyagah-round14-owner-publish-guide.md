# Publishing the Pin, Favourite, Archive, Finalise and Note-links Rules: one paste

Siyagah round 14, the last round of the folder plan (decision 66).

**What this does NOT do:** publishing this does not change anything you see
by itself. The buttons for Pin, Favourite, Archive, Finalise and *Link to a
Note…* stay switched off until you tell the Architect the Rules are live.
Nothing you already have (Notes, folders, sections, tags, Mapping My Journey)
changes. Nothing is ever deleted.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Round 14 rules are live."**

No index is needed; there is nothing to do under **Indexes**.

## Why a whole-file paste is safe

That file is today's live Rules with **additions only**. Every line of the
live file is still in it, in the same order — a check in the Architect's test
compares the two files line by line.

- **Notes** may now carry four marks: **pinned**, **favourite**, **archived**
  and **finalised**. All four are optional, so every Note you already have
  stays valid untouched. Changing a mark does not make a new version of the
  Note.
- **Finalised** locks a Note: while it is finalised, its title and text
  cannot be changed and it cannot be moved to Trash. Un-finalise it first.
- **Archived** only hides a Note from folder lists. It is not Trash.
- **Note links** (new): one of your Notes pointing to another of your Notes.
  A Note cannot link to itself. Removing a link moves it to Trash (retired),
  and it can be restored.

## What it authorises, in one paragraph

Only **you** can mark **your own** Notes, and link **your own** Notes to each
other — the same rule your Notes already follow. A guardian, a teacher or a
Madrasah owner may **read** your links (as they can already read your Notes)
but never change them. Nothing can be deleted.
