# QR Lead (Quran Study) — session handover B, 31 Oct 2026

Written by the QR Lead session `session_01PL2xbJjpvu9ZBaaRQ9AntC` (hand119), which took over at 10:35 am 31 Oct Sydney
from `session_01PL2xbLnQWhAjuwTKonE8zo` (its handover: `docs/reports/2026-10-31-QR-LEAD-HANDOVER.md`, still valid for
sandbox lessons and older Owner questions). `main` is at **v12.137**.

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbJ2ncUt43CiJpHVZJf` (📌 03, since 12:27 pm 31 Oct) |
| PCA | `session_01PL2xbNViE9udUe3FUJjKBE` (📌 01) |

Hand finished work to the Architect as "QR LEAD ▸ ready for release: …". Never merge, never bump `app/js/version.js`.

## This session

| What | State | Suite (mutation-proven) |
|---|---|---|
| Audit 1, Search the Qur'an: Study options head above the screen at large text; Save label cut; ✕ fixed 26px | **Released v12.137** | `qr-panel-head-reach` 258/0 (unfixed 194/64) |
| Audit 2, Read view at large text: reading area 0px, read-bar buttons under the tabs; sideways phone Take/Record/Status covered at 100% | **Handed in**, branch `claude/qr-lead-landscape-dock` head 58309da (on v12.137) | `qr-read-tall` 160/0 (unfixed 116/44) |

PCF J29 lines `j29qrl1`, `j29qrl2`. Audited and clean: Search results geometry (all sizes, en/bn); landing at 740x360
200% (tabs reachable by one scroll — landing-tall design, not a defect).

## Open

1. **J108 v13.01 (APPROVED by the Owner)**: the Architect builds the shared Note opener on `claude/j108-v13-note-opener`
   and wires Study ▸ Notes and the Āyah card 📝 itself. **Hold all edits to `#tabNoteBtn`, `onTakeNote`/`onNote` →
   `openNotesPaneFromAyahCard`, and `app/js/ayah-action-sheet.js` until v13.01 lands.** The Architect will ask the QR Lead
   to review the Quran Study side before merge: re-run `read-note-pane`, `read-window`, `qr-read-tall` on that branch.
2. **j29p127q (PCF J29)** still waits on the Owner (A/B/C, Āyah card Status check). Build it the same day it is answered.
3. If the Architect asks for changes to audit 2, the branch is above.

## Sandbox lessons added this session

- **A script scrolls `overflow: hidden`.** `scrollIntoView` moves a page a finger cannot; a reach check must also ask
  whether the page really scrolls for a reader (html/body `overflow-y`). The first `qr-read-tall` missed its `no-css`
  mutation for exactly this reason.
- **A hidden element measures top 0.** `display: none` dock → `getBoundingClientRect().top === 0`, so "X runs under the
  dock" is true for everything. Gate on `getClientRects().length`.
- **`git stash` of a committed change stashes nothing**, so a "main baseline" run silently measured the fix. Baseline
  with `git show origin/main:app/quranrevival.html > app/quranrevival.html`, then `git checkout` — and commit the fix
  first, because that checkout discards uncommitted work.
- `node_modules/playwright` is a symlink to `/opt/node22/lib/node_modules/playwright` (git-ignored); recreate it in a
  fresh container.

## Possible next (no Owner choice needed)

Continue the audit from the PCF User Manual's Qur'an sections not yet covered at large text: Text size (A±, o5a3205),
Listening (9m107jl), Mushaf view (d9d78ub) at 150/200% and sideways, the Word card (9a6dqv8), Explore (8lle31u). Measure on
v12.137 at 360/390/414/768/1280 and 740x360, en+bn, 100/150/200, and look at the screenshots.
