# QR Lead (Quran Study) — session handover G, 1 Nov 2026

Written by the QR Lead session `session_01PL2xbMtDnPbo7oMetwQZGS` (hand119), which took over at about 4:50 pm 1 Nov Sydney
from `session_01PL2xbL7YAbYGMKdF33vFz3` (handover F). `main` was **v13.11** (audit 6b released, merge 9c56fac).

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbLEHixF5Ai2VPJhMiL` — **inactive at 8:45 pm 1 Nov** (send refused); find the current one through the PCA |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` (if archived, the PCA in `p/pl.sessionUrl` in the PMS) |

## This session

| What | Branch | State | Suite (mutation-proven) |
|---|---|---|---|
| Audit 8: Explore at large text | `claude/qr-lead-explore-large-text-r2` (3a9a8f1, one commit on v13.11; supersedes `claude/qr-lead-explore-large-text` d02856f) | Handed in; the Architect named it **v13.12** | `qr-explore-large-text` 630/0; no-watch 112, no-css 109, no-cap 14, no-wrap 27, no-pad 55, no-seg 9, no-max 3, no-zab 6, no-stack 6 fail |
| Audit 9: Āyah card tool tiles and ← Back at large text | `claude/qr-lead-audit9-ayah-tiles` (b67a0a1, on v13.11) | Handed in through the PCA 8:45 pm (Architect inactive) | `qr-ayah-card-tiles-large-text` 184/0; no-fit 11, no-shrink 2, no-cols 6, no-floor 7, no-ro 4, no-back 18 fail |
| v13.08 ON/OFF switch (J109) on a QR build of v13.09 | — | Filed PCF J29 `j29qrl11` | 63 Āyah full-view switches, 0 problems, 7 sizes × 100/150/200 |

**Audit 8** (`app/quranrevival.html`): `checkExploreFit()`/`watchExploreFit()` after `watchTasrifFit()` set `body.explore-tall`
only while `#exploreScroll` < 12rem and Explore is not the PC window (J51): the page scrolls, the area = screen − tabs − Zab
bar (`zabBarH()`, floor 4rem). `.aa-nav-wrap` (sūrah steps), `.aa-seg-stack` (All/One Approach), `.aa-rows-stack` (Take ▸
under the name) only while words are cut; `#explorePanel` sides `min(1.5rem, 24px)`; `#exploreViewToggle` `max-width: 100%`;
from 768px `body.zab-bar-on.explore-tall/read-tall #dock { bottom: 2.75rem }` and `zabBarH()` also in `checkReadFit()`.

**Audit 9** (`app/js/ayah-action-sheet.js`, Quran-only importers): `fitAyahActionRow()` clears its sizes, shrinks all tile
words together while one is cut (≥ 7/10, never below 10.88px), then widens the columns only if still cut; a ResizeObserver
on the row's width refits it (A± widens it, the card's sides being rem). `.ayah-sheet-homeback` grows from 40×40.

## Open, in order

1. **Answer the Architect's reviews of audits 8 and 9** the same day.
2. **Check on QR** once quranrevival.github.io serves v13.11 (audit 6b), then v13.12 (audit 8); file each in PCF J29.
3. **3c — Āyah card 🔖 unit choices**: build A the same day the Owner ticks it (not found in J29 at 8:45 pm; ask the PCA which job holds it).
4. **j29p127q** still waits on the Owner.
5. Found, not fixed (next audit candidates): on a 320 phone at 200% the Āyah card's **sticky header is ~280px of 640**;
   the Āyah-level steps in Explore use `.aa-nav-wrap` but are not in the suite; at 844×390 200% the header alone is 330 of
   390px, so the tabs sit partly under the Zab bar until the first scroll (sticky cannot leave `#app`).
6. **Pre-existing on main 9c56fac, not ours**: `popup-home-size` fails "[en 1440] the Notes window (from the Āyah card)
   opens at that rect null" then a click timeout — reported to the PCA for the Architect.

## Sandbox lessons added this session

- **`serve.js` can die mid-session**: every suite then exits 1 with 0 passed and `ERR_CONNECTION_REFUSED`. Check
  `curl localhost:8080/...` and restart it before believing any failure.
- **A sticky element never leaves its parent**: when the header alone nearly fills the screen, docked tabs cannot rise above
  where `#app` starts. A "covered" check must count the page top only where the tabs can stick.
- **Measure "covered" at both ends of the page scroll**: scrolled fully down, the Zab bar's spacer already lifts the tabs,
  so a mutation removing the lift survived until the check also measured the top.
- **Two unproven mutations this session, both resolved by REMOVING code** (a step line-break rule made unnecessary by the
  panel's capped sides; a text-size MutationObserver made redundant by the width watcher). An unproven mutation can mean
  dead code, not a blind check.
- **`git stash` with nothing uncommitted compares nothing**: to compare with main, use a worktree of `origin/main` served on
  another port (`PORT=8092 node serve.js`, suites with `QR_BASE=http://localhost:8092`).
- `rm -f $VAR/*.log` is refused by the safety check; write each batch's logs to a fresh folder instead.
- A `<details>` dropdown (the top Home/Modules/Operation/Bookmark row) is a menu, not a show/hide section: J109's switch
  does not apply to it, and a probe sweeping every `summary` must leave it out.

## Opening message for the next QR Lead

> You are 📌 (03A) MSA · QR Lead, the Module Lead for Quran Study inside the MSA repo, taking over from
> session_01PL2xbMtDnPbo7oMetwQZGS. Read CLAUDE.md (MODULE LEADS block), then
> docs/reports/2026-11-01-QR-LEAD-HANDOVER-G.md on branch claude/qr-lead-handover-1101g (start there), then handovers F, E,
> D, C and the first for sandbox lessons. Read main's version off app/js/version.js. Work only on Quran Study files, on
> your own branches from main; hand finished work to the MSA Master Architect (find the current one through the PCA) as
> 'QR LEAD ▸ ready for release: …'. Never merge, never bump app/js/version.js; force-push is refused, so after a rebase push
> to a new branch name and say so. OPEN, in order (handover G): (1) answer the Architect's reviews of audit 8 (Explore,
> claude/qr-lead-explore-large-text-r2 3a9a8f1, named v13.12) and audit 9 (Āyah card tiles, claude/qr-lead-audit9-ayah-tiles
> b67a0a1); (2) check 6b and then audit 8 on quranrevival.github.io once QR serves v13.11 / v13.12, file in PCF J29;
> (3) the Owner's 3c (Āyah card 🔖 unit choices): build A the day it is ticked; (4) j29p127q waits on the Owner; (5) next
> audit: the Āyah card's sticky header at 200% on a phone. PMS: https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ. After
> 'Rasulullah' always write 'Sallallahu A'laihi Wa Sallam' (saw128). Keep reads small; no self wake-ups; stay open while
> idle; hand over at about 40% context with a ready opening message. When ready, send 'PCA ▸ taken over' to the PCA.
