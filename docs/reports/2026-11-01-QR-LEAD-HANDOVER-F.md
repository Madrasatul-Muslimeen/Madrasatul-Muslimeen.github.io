# QR Lead (Quran Study) — session handover F, 1 Nov 2026

Written by the QR Lead session `session_01PL2xbL7YAbYGMKdF33vFz3` (hand119), which took over at about 3:30 pm 1 Nov Sydney
from `session_01PL2xbHxdLPRKi4KNVXpGHX` (its handover: `2026-10-31-QR-LEAD-HANDOVER-E.md`; `-D.md`, `-C.md` and the older
`-HANDOVER.md` still hold the sandbox lessons). `main` was **v13.09** (the Architect was finishing v13.10, audit part 145).

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbLEHixF5Ai2VPJhMiL` |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` |

## This session

| What | Branch | State | Suite (mutation-proven) |
|---|---|---|---|
| Audit 6b: a Qur'an word never splits in Taṣrīf (nouns AND verbs) | `claude/qr-lead-audit6b-tasrif` (4eaf7c2, on v13.09) | **Handed in 4:24 pm**; the Architect (5:29 pm) reviews it after v13.10 and releases it as v13.11 or folds it into v13.10 | `qr-word-card-tasrif-whole-words` 225/0; mutations no-nowrap 15, no-verb-wrap 4, no-fit 13, no-wide 4, low-floor 4, px-stack 2 fail. Neighbours: tasrif-fit 68/0 (three 100% widths updated in place, with reason), tasrif-noun 236/0, tasrif-arabic-size 66/0, tasrif-verb-arabic-size 144/0, tasrif-blocks-basic 100/0, five-levels 290/0, word-card-fullscreen 65/0, apps-build-check 48/0, QR build OK |
| QR re-check (item 2/3a of E) on a QR build of main v13.09 | — | Filed PCF J29 `j29qrl9` | `qr-text-size-reach` 236/2 (the two are the 100% positions recorded on MSA, expected on QR); read-note-pane 204/0, read-note-pane-window 94/0, note-opener 290/0, read-quick-buttons 254/0 |

What 6b does: `white-space: nowrap` on `.word-card-ncell-ar`, `.word-card-ntable-ar`, `.word-card-cj-pr .word-card-ar` and
`td.word-card-cj-vb` (its count/mood lines wrap again); `fitTasrifArabic()` (after `watchReadFit()`) shrinks a word wider
than its box, floor 0.8 × size × 16 / root px; a word too wide at the floor gives its td `.word-card-ntd-wide`
(`grid-column: 1 / -1`) and is fitted again; verb tables are measured against their box; the verb tables stack under
**40rem** (was 640px). **The verb tables were the worse half and were not in the audit**: at 768x1024 200% three tables sat
side by side and هُمْ broke as هُ / مْ.

## Open, in order

1. **Watch for the Architect's 6b review**; fix anything it finds the same day.
2. **Explore at large text — measured, NOT built** (the E list's item 5). Probe: `/tmp/claude-0/sp/explore-probe.mjs`
   pattern (open `#tabExploreBtn`, measure `#exploreView`, then tap sūrah 2). Findings on v13.09:
   - **Phones at 200% (320x640 en) and phones turned sideways (640x360 150%, 740x360 bn 200%, 844x390 200%): `#exploreView`
     is 0px tall** — the header, the menu rows and the dock take the whole screen, so Explore shows nothing. 390x844 bn 200%:
     a ~90px sliver (Back reads "ফিরে…", the sūrah steps "‹…" / "আ…").
   - **1280x800 200%**: the window is 381px tall, the wheel only 160px, and `#exploreListCollapseBtn` and the "Take ▸"
     buttons lie outside the window's visible box.
   - The sūrah step buttons ("‹ Al-Faatiha", "Aal-i-Imraan ›") are cut with an ellipsis at 320/390 and 844x390 200%.
   - Likely shape of the fix: the Read view's `body.read-tall` (`checkReadFit()`): when the Explore panel is shorter than
     ~12rem, give it a height of the screen minus the dock and let the page scroll to it; a desktop minimum for the window.
     Measure first; one round; mutation-proven suite; en + bn; screenshots looked at. File each defect in PCF J29.
3. **3c — Āyah card 🔖 unit choices**: build A the same day the Owner ticks it (nothing in the PCF at 4:40 pm 1 Nov).
4. **j29p127q** (J29) still waits on the Owner.
5. **v13.08 shared ON/OFF switch on QR**: quranrevival.github.io served **v13.07** at 4:20 pm 1 Nov; once it serves v13.08,
   check the Quran Study screens at 100/150/200% (en+bn, phone/tablet/desktop).

## Sandbox lessons added this session

- **Chromium ignores `letter-spacing` on joined Arabic**: a test that "forces a word too long" by spacing letters does
  nothing. Lengthen the real text instead (`w.textContent = w.textContent.repeat(3)`); the card's MutationObserver refits.
- **Arabic diacritics give a Range client rects at different heights**: "two line boxes = broken" misfires on every word.
  Count lines per element instead: an inline element's `getClientRects().length`, a block's height / its `line-height`.
- **A mutation the suite survives is a finding about the suite** (px-stack: the shrink rescued the side-by-side tables, so
  nothing noticed); add the check that names the behaviour (here: from 600px no verb word needs shrinking).
- **A background batch writing `>>` to a file**: a waiting loop that reads it with `wc -l < file` errors until the first
  line lands; read the per-suite logs instead.
- A QR build to test against: a worktree of `origin/main`, `node tools/apps/build-app.mjs qr`, `cp serve.js build/qr/`,
  `PORT=8091 node serve.js` inside `build/qr`, suites run from the worktree root with `QR_BASE=http://localhost:8091`.
