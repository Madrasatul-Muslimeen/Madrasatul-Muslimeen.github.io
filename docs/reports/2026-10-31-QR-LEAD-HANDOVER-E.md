# QR Lead (Quran Study) — session handover E, 31 Oct 2026

Written by the QR Lead session `session_01PL2xbHxdLPRKi4KNVXpGHX` (hand119), which took over at about 5:40 pm 31 Oct Sydney
from `session_01PL2xbLGPyYo53GXRKWojym` (its handover: `2026-10-31-QR-LEAD-HANDOVER-D.md`; `-C.md` and the older
`-HANDOVER.md` still hold the sandbox lessons). `main` is at **v13.06** (6:50 pm: the Word card tabs released; v13.05 6:28 pm the A± ceiling; v13.04 6:08 pm audits 6 + 7). **Everything this session built is released; audit 6b is the next job.**: audits 6 + 7 RELEASED (#1372). The A± fix was handed in at ~6:10 pm (neighbours: read-quick-buttons 254/0, qr-panel-head-reach 258/0, read-note-pane 204/0, qr-read-tall 160/0).

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbLYSNq3VaA8Hi5jFfq` |
| PCA | `session_01PL2xbN7ENRBkhtTNxJAt2L` |

## This session

| What | Branch | State | Suite (mutation-proven) |
|---|---|---|---|
| Audit 6, Word card Taṣrīf table (from D) | `claude/qr-lead-audit6-v1302` (on v13.03) | Handed in by D at 5:36 pm; in the Architect's v13.04 review. This session re-ran it: `qr-word-card-tasrif-fit` 68/0, `word-card-tasrif-noun` 236/0, `apps-build-check` 48/0; the other neighbours were still running at handover (see below) | — |
| Audit 7, part 142 D4–D6 contrast | `claude/qr-lead-audit7-contrast` (dfe6c66) | **Handed in** ~6:20 pm. Night heading on the white page #C9A24B 2.40 → #7a5410 6.77; "Choose a Unit" caret opacity 0.75 (4.49) → 0.9; Light `.ways-caret` 1.45 → #7a5410 | `qr-wheel-contrast` 87/0; heading 16, caret 10, ways 10 fail |
| QR-only A± cover at 1280x800 200% | `claude/qr-lead-as-ceiling` (756ee1d) | **Built, told to the PCA, filed PCF J29 (j29qrl8); NOT yet handed to the Architect** — hand it in once its neighbours are read (`/tmp/claude-0/n8-*.log` if the container survived; otherwise re-run `read-quick-buttons`, `qr-panel-head-reach`, `read-note-pane`, `qr-read-tall`). Cause: `nav#topNav` (z 61) over the fixed sliders, which opened up to 8px from the top; `fitReadTextSize()` now has a ceiling under the nav | `qr-text-size-reach` MSA 238/0; QR build 236/2 (the two 100% positions recorded on MSA, expected); `no-ceil` fails both 1280 200% (unreachable: en) |
| Word card level tabs at large text (D item 2a) | `claude/qr-lead-wordcard-200` | **Built, CSS only; suite written; its runs were in progress at handover** (`/tmp/claude-0/tabs-*.log`). Below 600px a tab is never narrower than its longest word (`min-width: min-content; overflow-wrap: normal`) and the row may wrap; under an 11.5rem card the rows are 3 + 2 (`flex-basis: 28%`); the sub-line may wrap from 600px. Probe: 100% identical everywhere; 150% one row; 200% phones 3 + 2; no word broken, no sub cut, en + bn | `qr-word-card-tabs-large-text` (mutations no-minw, no-sub, no-three) |

## Open, in order

1. **DONE (7:35 pm): the tabs fix was handed in as `claude/qr-lead-wordcard-200-v1304` (on v13.04): 188/0, mutations 2/4/3, neighbours 0 failed.** Formerly: read the tabs suite (fixed must be 0 failed; each mutation must fail), look at a screenshot at 320x640 200% en and bn,
   commit the suite with the CSS on `claude/qr-lead-wordcard-200` (the suite file is written but NOT committed), run the
   Word card neighbours (`word-card-five-levels`, `word-card-basic-rebuild`, `text-size-wbw`, `quran-word-card-fullscreen`,
   `apps-build-check`) and hand in.
2. **DONE: A± ceiling released as v13.05.** The PCA asks: once quranrevival.github.io serves v13.05 (its build-from-msa self-run ~8:17 pm, or the Owner's tap), re-check the A± sliders there at 1280x800 200% en+bn and file the result in PCF J29.
3. **AUDIT 6b, asked by the Architect after v13.04 (7:09 pm): a Qur'an word must never split in the stacked Taṣrīf table (ٱلْأَسْ / مَآءُ, بِأَسْمَ / آئِهِم: `.word-card-ncell` has overflow-wrap:anywhere), with a check. = D item 2b, measured, not built.** On audit 6's layout (port 8080 = that branch) Arabic words
   break inside the word in `.word-card-ncell-ar` (e.g. "بِأَسْمَآئِهِمْ" even at 320 100%; at 320 200% it needs ~120px of a
   65px cell at 37px type) and in the case heads `.word-card-ntable-ar` ("مَرْفُوع / مَنْصُوب / مَجْرُور" at 150/200%).
   **A floor of 0.8 of the CURRENT size cannot fit them** (320 200% needs about 0.54). Recommended reading of the rule:
   the Arabic never wraps (`white-space: nowrap`), and only a word that does not fit is shrunk, by measurement, to exactly
   its cell, **never below 0.8 of the size it would have at ordinary text** (current size × 16 / root px × 0.8): at 320
   200% that is 20px, still larger than ordinary. Refit on a MutationObserver (childList, subtree) of
   `#quranWordCardMount` plus a ResizeObserver, in `requestAnimationFrame`. Check verb words too (`.word-card-cj-vb`
   sits in an auto table: nowrap there widens the td, so measure the table against its box, not the td). Build it on
   `main` (v13.04 carries audit 6). **The Architect (7:29 pm): if the floor cannot reach a word, nowrap overflows the cell instead of splitting it. Let a too-long word take the whole row of the grid before shrinking, and the check must assert the word lies inside its box at 320 200%, not only that it is unbroken.** Probe: the scratchpad's `probeAr.mjs` pattern (a word is broken when its own Range has
   line boxes at two heights).
3a. **PCA change notice (7:30 pm): v13.07 (PR #1376) makes the full-screen Note window (<1024px) aria-modal with the rest of
   `<body>` inert (minimise frees it); floating (>=1024) stays non-modal.** Once it is on `main`, re-run the Quran Study
   suites where a control opens or sits behind the Note window (`read-note-pane`, `read-note-pane-window`, `note-opener`,
   `read-quick-buttons`) at 390 and 768; report to the PCA only if one fails.
4. j29p127q (PCF J29) still waits on the Owner; build the same day it is answered.
5. Then Explore (Manual 8lle31u) at 150/200% and sideways, en + bn.

## Sandbox lessons added this session

- **A fresh container has no `node_modules/playwright`**: every suite exits 1 with `ERR_MODULE_NOT_FOUND` and 0/0. Link it:
  `mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright` (and symlink that
  `node_modules` into each worktree).
- **A background Bash run stops at its `timeout`** (the 10-minute default kills a neighbour batch mid-suite); give batches
  `timeout: 7200000`.
- **Work in worktrees, one `serve.js` per worktree** (`PORT=809x`, suites take `QR_BASE`), so suites on one branch never
  read files changed for another. A QR build is `node tools/apps/build-app.mjs qr`, `cp serve.js build/qr/`, serve there.
- **The Builder's audit line numbers drift**: part 142 named lines 565/676/1135; the rules were at 574/685/1154 on v13.03.
  Measure the rendered colour; the mutations then reproduced the Builder's ratios exactly (2.40, 4.49, 1.45).
- **A gradient behind text defeats a background walk** (the probe reads white): measure against each colour stop of the
  gradient and keep the worst.
