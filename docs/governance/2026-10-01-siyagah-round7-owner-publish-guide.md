# Publishing the Sections, Folder colours and Tags Rules: one paste

Siyagah round 7. Your decisions (rows M2, M3 and 42.5 of
`docs/governance/2026-09-27-owner-decisions.md`): *sections sit above
folders*; *folder colours are required*; *"we need Tag only, not 'type'"*.

**What this does NOT do:** publishing this does not change anything you see
by itself. The screens for sections, colours and tags are built in the next
Builder round, and they stay switched off until you tell the Architect the
Rules are live. Nothing you already have (folders, Notes, placements,
Mapping My Journey) changes. Nothing is ever deleted.

## Steps (about two minutes)

1. Open this file on GitHub and copy **all** of it:
   `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules`
   (open the file, then press the **Copy raw file** button at the top right).
2. Open the [Firebase Console](https://console.firebase.google.com/), your
   `study-monitoring` project, **Firestore Database → Rules**.
3. Click inside the rules box, select everything (Ctrl+A), and paste
   (Ctrl+V), replacing it all.
4. Click **Publish**.
5. Tell the Architect: **"Round 7 rules are live."**

No index is needed; there is nothing to do under **Indexes**.

## Why a whole-file paste is safe

That file is today's live Rules with **additions only**:

- **Folders** may now carry a **colour**, **bold**, and a **section**. All
  three are optional, so every folder you already have stays valid untouched.
  Only a top-level folder of your own sits in a section; folders inside it
  follow it, and *My Journey* and the *Reflections* archive are never filed
  under a section.
- **Sections** (new): a named, ordered group of top-level folders, with an
  optional colour and bold.
- **Tags** (new): a name and an optional colour.
- **Tag links** (new): one Note carrying one tag. A Note itself is not
  changed by tagging it, so tagging never creates a new revision.

Every other line of the live file is unchanged — a check in the Architect's
test compares the two files line by line.

## What it authorises, in one paragraph

Only **you** can create, rename, recolour, reorder, retire or restore **your
own** sections, tags and tag links, and colour or file **your own** folders —
the same rule your folders and Notes already follow. A guardian, a teacher
or a Madrasah owner may **read** them (as they can already read your Notes)
but never change them. Nothing can be deleted: removing a section, a tag or
a tag from a Note moves it to Trash (retired), and it can be restored. There
are no Note Types.
