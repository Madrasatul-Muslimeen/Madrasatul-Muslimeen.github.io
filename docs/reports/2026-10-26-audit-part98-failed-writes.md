# Audit part 98: refused saves on Notes, Journey map, Dawah, Import notes and the capped pages (I15, PCF MSA J29)

Follows `2026-10-25-audit-part96-failed-writes.md`. Suite: `tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs` (detector unchanged;
new: Notes / Journey map / Dawah seeds, an Import-notes fixture file, `--from`, `--vp`, `--depth`, `--nomenu`, and the Person picker on
Import notes is left on "yourself"). No file under `app/` changed. All runs 1440 px, English; Bangla on Notes (the page with the most saves).

| Page | saves found | OK | MISSING | MISLEADING | STUCK | seconds |
|---|---|---|---|---|---|---|
| Notes (`?unit=ayah:2:255`) en | 6 | 6 | 0 | 0 | 0 | 269 |
| Notes bn | 6 | 6 | 0 | 0 | 0 | (en+bn run 540) |
| Journey map | 3 | 3 | 0 | 0 | 0 | 254 |
| Dawah | 5 | 5 | 0 | 0 | 0 | 52 |
| Import notes | 1 | 0 | 0 | 1 | 0 | 8 |
| Catalogue (cap 80) | 11 | 11 | 0 | 0 | 0 | 130 |
| Hadith collections (cap 80 of 277) | 0 | 0 | 0 | 0 | 0 | 431 |
| Landing (cap 80 of 111) | 0 | 0 | 0 | 0 | 0 | 448 |

Notes saves: New note Save, Save revision (Edit), Remove (x2 notes), Make a printable page (x2). Journey map: New tag, New folder, New section.
Dawah: Share, Remove (x2), Approve, Return.

## What was NOT reached (said plainly)
- **Journey map note pane's ⋯ actions (Mark, Organise, Settings)**: with a seeded note listed, the pane's More / "Folders and tags" buttons were
  listed but no further saves appeared within depth 2 and the 10 minute limit; they remain unaudited. Not called MISSING.
- Notes: 37 controls beyond the cap of 40 were not pressed; file-into / move was not reached. Phone width (390) not re-run this round.
- Hadith collections / Landing: only the first 80 controls pressed. **Look at the code instead:** `app/hadith-collections.html` and `app/index.html`
  contain no `setDoc`/`addDoc`/`updateDoc`/`writeBatch`/`runTransaction`/`saveDoc`/`createDocument`/`updateDocument` call (grep, no matches), so
  these two pages have no save of their own.

## Real failure: Import notes (shared file) — MISLEADING
Opened the page, chose a small WordPress export (1 note), pressed Import with the refusal flags armed. What I saw
(`/tmp` probe, same state): the result line reads **"Done. Folders: 0 created, 0 already there. Notes: 0 created, 0 already there."** and, below it,
a list item `One — transaction denied by the test` (the raw error text). So the reader is told "Done" and only the per-item line says why nothing
was created; no sentence says the import was not saved.
Smallest fix: `app/import-notes.html:456`; when `result.*.refusals` is non-empty (computed at line 460, just after), show "Not saved: N Note(s) were
refused" instead of "Done." Owner of the file: shared (Notes / Mapping My Journey tools). Not fixed here (no `app/` change in this round).

## Dawah
Page saves for the owner: Share, Remove, Approve, Return (all refused-visible, OK).

## Positive controls and mutation
- bookmarks.html Rename: 1 found, 1 OK. Shared Bookmark menu 🗑 (classes.html): 1 found, 1 OK.
- `--mutate=silent --mutate-page=notes.html`: 6 saves, 6 counted MISSING; the suite exited 1 ("caught (the sweep CAN fail)").
