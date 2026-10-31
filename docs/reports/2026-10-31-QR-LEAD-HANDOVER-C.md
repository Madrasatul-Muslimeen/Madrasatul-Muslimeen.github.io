# QR Lead (Quran Study) — session handover C, 31 Oct 2026

Written by the QR Lead session `session_01PL2xbJmkGA8Xw9KyXhrCAb` (hand119), which took over at about 1:15 pm 31 Oct Sydney
from `session_01PL2xbJjpvu9ZBaaRQ9AntC` (its handover: `docs/reports/2026-10-31-QR-LEAD-HANDOVER-B.md`; the older
`2026-10-31-QR-LEAD-HANDOVER.md` still holds the sandbox lessons). `main` is at **v12.139**.

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbJ2ncUt43CiJpHVZJf` |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` (moved there 1:24 pm 31 Oct) |

Hand finished work to the Architect as "QR LEAD ▸ ready for release: …". Never merge, never bump `app/js/version.js`.

## This session

| What | State | Suite (mutation-proven) |
|---|---|---|
| Audit 2, Read view at large text | **Released v12.138** | `qr-read-tall` 160/0 |
| Audit 3, Text size A± (Manual o5a3205): Read view A± sliders and the ⋯ panel itself ran off the screen (360 200%, sideways even at 100%, Reset under the tabs at 1280 200%) | **Released v12.139** | `qr-text-size-reach` 238/0 (unfixed 198/35), 5 mutations |
| Audit 4, Listening (Manual 9m107jl): Read/Play cut, Mode picker past the card / "Ea", cramped drawer head sideways 200%, "(whole surah only)" twice | **Handed in** 3:37 pm, branch `claude/qr-lead-audit4-listening` head 72f8bfa (on v12.139) | `qr-listening-large-text` 176/0 (unfixed 126/50), 6 mutations |

PCF J29 lines `j29qrl3`, `j29qrl4`.

## Open

1. **Audit 4** waits on the Architect's review; answer any change asked on the branch above.
2. **J108 v13.01** (Architect, `claude/j108-v13-note-opener`): keep holding `#tabNoteBtn`, `onTakeNote`/`onNote`,
   `app/js/ayah-action-sheet.js`; review the Quran Study side when asked (re-run `read-note-pane`, `read-window`,
   `qr-read-tall`, and now `qr-text-size-reach`).
3. **j29p127q (PCF J29)** waits on the Owner (A/B/C, Āyah card Status check). Build it the same day it is answered.
4. **The PCA asked (2:29 pm)** for the A± fix to be checked on quranrevival.github.io once QR's `build-from-msa` has run
   (QR served v12.134 at the time), and the result filed in the PCF.

## Possible next (no Owner choice needed)

Continue the audit: **Mushaf view** (d9d78ub), the **Word card** (9a6dqv8), **Explore** (8lle31u) at 150/200% and a phone
turned sideways, en+bn. Same method: probe → fix in `quranrevival.html` → suite with a `PLAIN` table recorded from unfixed
`main` by a `--record` run → mutations (replace EVERY copy of a rule; a mutation that finds its anchor twice must change both)
→ baseline on `main` → neighbours → screenshots → rebase on `main` → hand in.

## Sandbox lessons added this session

- **A `position: fixed` panel hung from a button cannot be scrolled to.** Once the page itself scrolls (read-tall), every
  fixed dropdown needs a "side with more room + max-height + overflow auto" placement; check its own children too.
- **A probe that clicks and measures in one `evaluate` measures before the next frame.** A fix that runs in
  `requestAnimationFrame` looks absent. Click, then wait, then measure.
- **Two copies of one rule (a `@media` and a `@container`) make a one-copy mutation prove nothing** — `no-wrap` passed
  green until the mutation changed both and checked the count.
- **A "reach" check that centres a control in a drawer with a sticky head calls the ends untappable.** Scroll the control
  to just below the head, as a finger would.
- **Layout classes decided in two steps must be cleared together before measuring**, or the first step measures the
  second step's last answer (`fitPanelHead` vs `qr-panel-head-tight`).
- While a baseline run has `main`'s file swapped in, the stop hook asks for a commit: do NOT commit; the script restores it.
