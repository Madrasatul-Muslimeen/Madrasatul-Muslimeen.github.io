# Audit part 121: Mapping My Journey reads 1,184 documents at open (measurement only)

Source: PCF MSA J29, audit part 121, issue #1279. A finding of part 119 (v12.105).
**Status: measured, NOT changed.** No application file was edited. See "Why no change" below.

## The 34 reads at open (heavy account: 600 notes, 40 folders, 540 placements, 450 sources)

Measured with `tools/i18n-verify/heavy-account-speed-browser.mjs --page=journey-map.html --no-qr`, `window.__fsLog`.

| Collection | Reads | Docs | Needed by the first screen? |
|---|---|---|---|
| tenantMemberUids, userIndex, tenants, tenantPeople | 4 | 4 | Yes (identity, roster) |
| noteFolders | 5 | 40 | Yes (the folder tree) |
| noteSections, noteTags, noteTagLinks, noteLinks | 4 | 0 | Only when those features are on |
| notePlacements | 10 | 540 | Only for the folder COUNT badges and a folder's contents |
| notes | 11 | 600 | Only for retired-note exclusion in counts, a folder's note titles, Timeline, search, pinned |
| **Total** | **34** | **1,184** | |

Source: `refreshAll()` in `app/journey-map.html` (about line 1013) starts `loadAllOwnerNotesSharded` and
`loadAllOwnerPlacementsSharded` at once, draws the tree when folders arrive, and finishes `folderCounts` when both land.
Notes and placements load in sharded pages of up to 100 documents, so the read count grows with the notes.

## After numbers (unchanged code, so these are the "before" numbers)

| Profile / lang | FCP ms | ready ms | reads | docs |
|---|---|---|---|---|
| desktop / en | 92 | 1616 | 34 | 1184 |
| phone / bn | 572 | 4734 | 34 | 1184 |

## Why no change

`allNotes` and `allPlacements` are used by about 60 places in `journey-map.html`: folder counts (lines 2115, 2319, 2712,
2938), a folder's contents (1985), Timeline (3874), search (2928, 3741), tags (3407), pinned and flagged lists
(1635, 1716), the Notes pane bridge (4088) and filing (2794-2817). A lazy load needs a decision that is the Owner's:

- **Folder count badges need every active placement, and every note's status** (a retired note is not counted). Reading
  them lazily means the badges show "…" until the reader opens a folder or another view. That is a visible change.
- Keeping the counts right at open without reading them needs a stored count on the folder document: a new stored field
  and likely a Rules change, both forbidden in this round.
- A server-side count query (`getCount`) per folder would be 40 reads of one document each, but cannot exclude retired
  notes, and whether the deployed Rules permit aggregate queries has not been checked: also an Owner gate.

## Options for the Owner

A. Lazy: open the folder tree with "…" badges and load notes and placements when a folder opens, or on Timeline, Path or search.
B. Keep today's behaviour (within limits; grows with every note).
C. Stored folder counts (new field plus Rules): an Owner Control Gate.

## What is left

The suite check ("Journey map reads under N documents at open") and `--mutate=read-all` are not added, because with no
change there is nothing to hold the threshold. A sensible threshold after option A would be about 100 documents
(tree 40, identity 4, plus the open folder).
