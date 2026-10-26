# Audit part 99: refused saves in the note pane's ⋯ actions (I15, PCF MSA J29)

Follows `2026-10-26-audit-part98-failed-writes.md`. Issue #1207, Builder run 2046.

**This report is the Architect's.** The Builder's run reached its findings, but GitHub refused its last push and its
pull request with 401 "Bad credentials" after three commits. Its report and last test edits were lost with the
workspace. What survives: the three commits on `builder/issue-1207-run-2046`, merged here, and its stopping comment on
#1207. The comment's findings are recorded below as the Builder's. The measurements are re-run here.

## What the saved commits add to `shared-pages-failed-write-audit-browser.mjs`

- `--flow=<name>` opens one place directly instead of sweeping: `pane-menu`, `pane-attach`, `pane-attach-hl`,
  `pane-edit`, and one flow per ⋯ action: `pane-rename`, `pane-link`, `pane-tags`, `pane-delete`, `pane-versions`,
  `pane-mytools`.
- Seeds: two user folders, the first note filed in the first, one tag, an empty folder, and two placements so unticking
  writes.
- A phone-menu fallback.

## Findings (the Builder's, from its stopping comment)

- **One real failure: ⋯ → Rename → Save** (`app/js/note-window.js`, the rename dialog's `catch`). A refused save
  showed only the raw error text. Nothing said the change was not saved. Same code on Journey map and Notes.
- **A twin, latent:** the "Link to another Note" picker's `catch` had the same shape.
- Everything else pressed was OK.
- Notes has no file-into / move of its own (part 98 had listed these as not reached).
- Bangla "My Note tools" rows are a **false MISSING** from the detector: the message "রাখা গেল না" is visible.
- `--mutate=silent` caught 10 of 10.

## Fix (Architect, shared in-page script)

`app/js/note-window.js`: a helper `notSavedText(err)` returns "Not saved: {why}" when the error has a message, else
"That did not save.". Both strings are already in `bn.js`. Rename's `catch` and the link picker's `catch` use it.
The "changed on another device" message for a stale revision is unchanged.

## Measured (Architect, worktree on :8087)

| Flow | Old code | Fixed |
|---|---|---|
| `--flow=pane-rename --bn=all` | 0 of 2 OK (2 MISSING) | 2 of 2 OK |
| `--flow=pane-link --bn=all` | 1 of 1 OK (latent: the stub's message already read as refused) | 1 of 1 OK |

## Not done, said plainly

- The detector's Bangla false MISSING on "My Note tools" ("রাখা গেল না" is not in its Bangla list) is not fixed here.
  It is a one-line suite change for the next audit round.
- The Builder's last suite edits were lost: the `notes-all` / `notes-window` flows, and filling the Rename box for
  Bangla. The flows above cover Journey map, which shares the code with Notes.
