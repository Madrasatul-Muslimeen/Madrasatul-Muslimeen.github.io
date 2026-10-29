# Audit part 123: the way-back audit on Mapping My Journey

PCF MSA J29, issue #1286. Found in the Architect's review of part 122 (PR #1284).

## Why the audit found nothing

`--page=journey-map.html` printed `0 links, 0 navigating buttons (NO IN-PAGE CONTROLS FOUND)`. Read with `--list` and a DOM probe
at 1440 and 390 (before, with a folder open, with a Note open, with each ⋯ menu open):

- **The controls are behind things a reader opens, and the audit opened nothing.** On load the page shows the folder tree only.
- Mapping My Journey has **exactly one control that leaves the page: ⋯ (page menu) → "Import Notes…"** (`import-notes.html?back=1`).
  That menu is closed on load, so the probe (which skips hidden controls) never saw it.
- The ideas in the issue do not apply, and this is recorded so nobody looks for them again: the Note pane has **no source
  reference link** (a Note's āyah/hadith source is stored, not drawn as a link); links inside a Note body are sanitised to
  `https:`/`mailto:` and open in a **new tab** (they do not leave the page); Timeline and Path items, "Open in window", "Pop out"
  and "Full page" open Notes **in the same page**; the folder ⋯ menu and Note ⋯ menu hold only in-page actions. So the real
  list is one link, not many. No Note seeding was needed (the audit seed already files two Notes with āyah/hadith sources in a folder).
- The page's own `← ` back link to Quran Study is the page's way back, deliberately not audited as a way out.
- At 390px the tree, the list and the Note are three separate screens, and the ⋯ menu lives on the first.

## What the audit does now (inside the audit suite only)

For `journey-map.html` it opens, with real clicks and after every reload: folder "Reflections" → the first Note → the ⋯ menu
(at 390 it steps back out of the Note and the list first, since the menu is on the tree screen). It records the selected
folder and the Note open in the pane (title) before the click and requires both after ← Back (new `jm` field in `STATE_NOW`).
The click-and-watch probe over ~50 buttons is skipped on this page (all act in the page; clicking them in sequence on a held-open
page changes the state under the next index). The Bangla back label ("Mapping My Journey-তে ফিরে যান", verb last) is now
recognised by `FIND_BACK`, which was a probe miss, not an app defect.

**Positive control:** each viewport/language must report at least 1 in-page control (N = 1, the real count).

## Result for each control

| Control | 1440 en | 390 en | 1440 bn | 390 bn |
|---|---|---|---|---|
| ⋯ → Import Notes… | before fix: WRONG PLACE (Note closed); after: OK | OK | OK | OK |

**The one real defect, fixed:** at 1440, leaving with a Note open and pressing ← Back returned to the right page, folder and
scroll but the **Note was closed** (`pane: closed`, was the Note). Fix in `app/journey-map.html`: on `pagehide` the open Note id
is kept per address in `sessionStorage` (`mmsa.wayBackJmNote`, session only, nothing on a server); on a back/forward arrival
(never a fresh visit) within 30 minutes it feeds the existing `pendingOpenNoteId` path. `bookmark-nav.js` and `note-window.js` untouched.

## Mutations (all fail as required)

- `--mutate=no-reach`: positive control fails at both widths (`found 0`).
- `--mutate=lose-note`: 1440 en fails WRONG PLACE (`pane closed, was the Note`).

## Checks run

See the pull request for the pasted totals.
