# QR Lead (Quran Study) — session handover H, 1 Nov 2026

Written by the QR Lead session `session_01PL2xbLtoyJgnXiwd3bh5Ua` (hand119), which took over at about 9:15 pm 1 Nov Sydney
from `session_01PL2xbMtDnPbo7oMetwQZGS` (handover G, on branch `claude/qr-lead-handover-1101g`). `main` was **v13.12**.

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbMmi7WNLzsPkGM6XVu` |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` (if archived, the PCA in `p/pl.sessionUrl` in the PMS) |

## This session

| What | Branch | State | Suite (mutation-proven) |
|---|---|---|---|
| Audit 9: Āyah card tool tiles and ← Back at large text | `claude/qr-lead-audit9-ayah-tiles` (b67a0a1) | Reviewed by the Architect (code fine); merged onto `claude/v1313-zab-corner-lift`, **ships in v13.13** with the Architect's Zab-corner fix | `qr-ayah-card-tiles-large-text` 184/0 (also on v13.12) |
| Audit 10: the Āyah card's pinned header at large text on phones | `claude/qr-lead-audit10-ayah-header` (b91f8a2, **on top of audit 9**, same file) | Handed in 9:47 pm (PCF J29 `j29qrl13`) | `qr-ayah-card-header-large-text` 107/0; no-fit, no-contents, no-cap, no-gap, no-ro, no-mo each fail |

**Audit 10** (`app/js/ayah-action-sheet.js`, `app/quranrevival.html`): below 900px the card is full screen with its header
pinned. On a 320px phone it took 3 lines at ordinary text (150px) and 4 at 200% (281px of 640); 390px 200% also 281px.
`fitAyahSheetHeader()` counts the header's item lines (`headerLines()`) and, only while ≥ 3, sets `.ayah-head-stack`:
`.ayah-sheet-head-tools` becomes `display: contents` (never while `[hidden]`), line one ← ‹ › … – ×, a `::after` line
break, then the reference and Full text. – and × keep 40px boxes, glyphs `min(1.5rem, 32px)`; line one's gap 0.25rem (at
0.4rem × wraps at 320px 200%). The stack is kept only if the header is really shorter. 320: 150 → 129px; 320/390 at 200%:
281 → 219px. One- and two-line headers unchanged; never in the computer window. Refit on width change (ResizeObserver;
proven by turning the phone 844x390 → 320x640) and on a child joining the header (MutationObserver; – Minimise is added
by `minimise.js` after the card opens).

Neighbours on audit 10: ayah-card-panes 35/0, ayah-card-window 264/0, minimise-windows 48/0, audit-part12-words 500/0,
word-card-ayah-card-ways-back 80/0, unit-card-window 132/0, qr-ayah-card-no-nan 15/0, tiles 184/0. `global-approach-card`
and `claim-for-family` time out on `#readBarRecordBtn` (the Read bar, not the card), identically on the audit 9 base b67a0a1: pre-existing, reported to the Architect. audit-part1-fixes 210/0.

## Open, in order

1. **Answer the Architect's review of audit 10** the same day.
2. **Audit 11 (the Architect's change request, 1 Nov 9:12 pm)**: in the Word card's Taṣrīf tab at 360px the floating 🧰
   corner covers the last "×5" cells at the end of `.word-card-content`'s scroll. Smallest fix: a `[data-zab-dock]` slot so
   the corner hides while the Word card is open. **Trap:** `zab-bar.js` `dockAndLift()` scans for `[data-zab-dock]` ONCE at
   load, and `.word-card-content` (with its header, `quran-word-card.js` ~line 1722) is replaced on every render. So the
   slot must live in `#quranWordCardMount`'s static markup (`quranrevival.html` ~line 6551), outside the replaced content,
   and the card's header must leave room for it (measure the header at 320/360/390, en+bn, 100–200%). Do not change
   `zab-bar.js` (shared). Its ResizeObserver on the dock button already brings the corner back when the card hides.
3. **Check on QR** once quranrevival.github.io serves v13.11 (6b), v13.12 (audit 8), v13.13 (audit 9); file each in PCF J29.
   At 9:20 pm it still served v13.09.
4. **3c — Āyah card 🔖 unit choices**: neither the QR Lead nor the PCA can find its job; the PCA asked the Owner for A or B
   directly. Build A the day it is ticked.
5. **j29p127q** still waits on the Owner.
6. Found, not fixed: at 768x1024 200% the Āyah card's reference wraps to 3 lines (header 135px; the stack does not help
   there, measured); at 844x390 200% the header is 100px of 390.

## Sandbox lessons added this session

- **`ERR_MODULE_NOT_FOUND: playwright`** in a fresh container: the suites import it as ESM, which ignores the global
  path. `mkdir -p node_modules && ln -sfn /opt/node-tools/node_modules/playwright{,-core} node_modules/` (git-ignored).
- **`audit-part1-fixes` needs a local `main` branch** (`git show main:…`): `git branch -f main origin/main`.
- **Never switch branches in the served checkout while suites run**: serve.js reads from disk. Use `git worktree add` and
  a second `PORT=8092 node serve.js` with `QR_BASE=http://localhost:8092`.
- **An unproven mutation can be covered by a second watcher**: no-ro survived because A± also re-fits by another route;
  removing BOTH watchers failed, and turning the phone (a width change no other route sees) proved the ResizeObserver.
- **`display: contents` has no client rects**: a line counter that skips items without rects drops a `contents`
  wrapper's children; test for `contents` first.

## Opening message for the next QR Lead

> You are 📌 (03A) MSA · QR Lead, the Module Lead for Quran Study inside the MSA repo, taking over from
> session_01PL2xbLtoyJgnXiwd3bh5Ua. Read CLAUDE.md (MODULE LEADS block), then
> docs/reports/2026-11-01-QR-LEAD-HANDOVER-H.md on branch claude/qr-lead-handover-1101h (start there), then handovers G,
> F, E, D, C and the first for sandbox lessons. Read main's version off app/js/version.js. Work only on Quran Study files,
> on your own branches from main; hand finished work to the MSA Master Architect (session_01PL2xbMmi7WNLzsPkGM6XVu; if it
> changes, the PCA tells you) as 'QR LEAD ▸ ready for release: …'. Never merge, never bump app/js/version.js; force-push is
> refused, so after a rebase push to a new branch name and say so. OPEN, in order (handover H): (1) answer the Architect's
> review of audit 10 (Āyah card header, claude/qr-lead-audit10-ayah-header b91f8a2, on audit 9); (2) audit 11, the
> Architect's change request: a [data-zab-dock] slot so the 🧰 corner hides while the Word card is open (static markup in
> #quranWordCardMount; read the trap in handover H); (3) check 6b, audit 8 and audit 9 on quranrevival.github.io once QR
> serves v13.11–v13.13, file in PCF J29; (4) the Owner's 3c (Āyah card 🔖 unit choices): build A the day it is ticked;
> (5) j29p127q waits on the Owner. PMS: https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ. After 'Rasulullah' always
> write 'Sallallahu A'laihi Wa Sallam' (saw128). Keep reads small; no self wake-ups; stay open while idle; hand over at
> about 40% context with a ready opening message. When ready, send 'PCA ▸ taken over' to the PCA.
