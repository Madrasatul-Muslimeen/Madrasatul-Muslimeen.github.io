# QR Lead (Quran Study) — session handover I, 2 Nov 2026

Written by the QR Lead session `session_01PL2xbMyR5g8rRKQnA2JdLW` (hand119), which took over at 9:48 pm 1 Nov Sydney from
`session_01PL2xbLtoyJgnXiwd3bh5Ua` (handover H). `main` was **v13.21** when written; read it off `app/js/version.js`.

## Who to talk to

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbM4mkq6p3GRNgbb19G` (from 8:33 am 2 Nov) |
| PCA | `session_01PL2xbMi4bJQNaakJbg7GtF` (if archived, the PCA in `p/pl.sessionUrl` in the PMS) |

## Done this session (released)

| What | Release |
|---|---|
| Audit 10, the Āyah card header at large text | v13.13 |
| Audit 11, the 🧰 corner off the Word card's end (CSS: scroll room under the corner, corner down while the card is open, card above the Zab bar at 768–899px; a header dock was measured and NOT used, +101px) | v13.14 |
| 3c, the Āyah card's 🔖 offers every unit for the card's āyah (the Owner's tick A, J29 j29qrl16q) | v13.15 |
| QR-only top-bar finding (the name past 320px at 200%; 72px title line) — fixed by the Architect | v13.15 |
| Checked on QuranRevival: 6b, audits 8, 9, 10, 11, 3c, title fit, v13.18 note window, v13.19 Details switch — all fine (J29 j29qrl15/18/19/20) | — |

## Handed in, waiting for release (all from main v13.21, independent, merge in any order)

| Branch | Head | What | Suite |
|---|---|---|---|
| `claude/qr-lead-way-back-pill-over-notes` | 51fefbc | audit 155 d1: "← Back to the hadith/Dua" above the Read view's Notes pane on arrival (z 961 while the pane is open); + audit-part12's 820px check updated for audit 11 | qr-way-back-over-notes 72/0 (no-raise, always) |
| `claude/qr-lead-tajweed-tap-unit-card-close` | 9072775 | the Owner's screenshot: Mushaf "Tajweed colours" tap opened the Whole Surah card (banner glyph overflow; `clip-path: inset(-4px)`), and the Unit card's × never closed it (`unit-card.js` wired only the first close) | qr-mushaf-tajweed-tap-unit-close 144/0 (no-clip, first-only) |
| `claude/qr-lead-page-way-back-survives-card` | 69272ef | decision 86: a way back to another page (`setAppReturn(..., { page: true })`) outlives the Āyah card; an in-page way back stands in front and the page's comes back | qr-page-way-back-survives-card 48/0 (card-clears, no-restore, no-page) |

The Architect was reviewing the first for v13.22. Check each was released; check them on QuranRevival when it serves them.

## Open, in order

1. **The Owner's Read-view demo (J29 j29qrl23q)**: four changes shown as before/after screenshots (nothing built): Aʿūdhu billāh as its
   own line like the Bismillah (the "Before Al-Fātiḥah" box goes); ⋮ before the āyah on the Arabic line; ⋮ then number then Arabic;
   one word block (Root panel's letters + count moved under the Derivatives panel's part of speech/lemma). Ticks A/B/C/change.
   **It overlaps J110** (the Owner's binding decision of 2 Nov: the ONE Ayah View and the Reading View stay distinct; build nothing of
   J110 until n110a is ticked). When the Owner answers, check with the Architect first. The demo script: re-create it from the
   description; the transform ran on the real page via Playwright (moved `.ayah-quick-wrap` and the first `.ayah-num-badge` into a
   flex row with `.ayah-arabic`, replaced the visible `.opening-band`, appended each `.root-panel .root-root` to the matching
   `.derivatives-panel .root-row[data-position]`).
2. **j29p127q** still waits on the Owner.
3. Check the three hand-ins above on QuranRevival once QR serves them.

## Sandbox lessons added this session

- **`pkill -f "<name>"` with the name in your own command line kills your own shell** (exit 144). Twice. Start servers in a separate
  call; never pkill by a pattern your command contains.
- **The container restarts between turns sometimes**: `serve.js` (8080) and any worktree server are gone (curl 000). Restart before a
  suite, or every suite fails to load.
- **QuranRevival differs from MSA**: QR opens Al-Fātiḥa at 1:2 (QR J09), so suites using word 1:1:1 find nothing there (use 1:2:1);
  QR has no `notes.html` (the note window is on `journey-map.html`); `note-window-large-text` has no 320px width (a scratch copy adds it).
- **Check a QR build**: worktree at the released commit, `node tools/apps/build-app.mjs qr`, `PORT=8082 node tools/apps/serve-app.mjs
  build/qr`, suites with `QR_BASE=http://localhost:8082`.
- **A suite that prints only failures**: count its total against the last version's total to prove new checks ran.
- **A tap that lands on the wrong element**: log `pointerdown` targets and `elementFromPoint` at that moment; an invisible line box
  (a big glyph with `overflow: visible`) can own points well outside its element's rect.

## Opening message for the next QR Lead

> You are 📌 (03A) MSA · QR Lead, the Module Lead for Quran Study inside the MSA repo, taking over from
> session_01PL2xbMyR5g8rRKQnA2JdLW. Read CLAUDE.md (MODULE LEADS block and the J110 decision), then
> docs/reports/2026-11-02-QR-LEAD-HANDOVER-I.md on branch claude/qr-lead-handover-1102i (start there), then handover H for
> sandbox lessons. Read main's version off app/js/version.js. Work only on Quran Study files, on your own branches from main;
> hand finished work to the MSA Master Architect (session_01PL2xbM4mkq6p3GRNgbb19G; if it changes, the PCA tells you) as
> 'QR LEAD ▸ ready for release: …'. Never merge, never bump app/js/version.js; force-push is refused. OPEN (handover I):
> (1) three hand-ins waiting for release (pill over Notes pane 51fefbc, Tajweed tap / Unit card × 9072775, page way back
> 69272ef) — confirm each is released, then check on quranrevival.github.io; (2) the Owner's Read-view demo, J29 j29qrl23q,
> overlaps J110: build nothing until the Owner ticks, then check with the Architect; (3) j29p127q waits on the Owner.
> PMS: https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ. After 'Rasulullah' always write 'Sallallahu A'laihi Wa Sallam'
> (saw128). Keep reads small; no self wake-ups; stay open while idle; hand over at about 40% context with a ready opening
> message. When ready, send 'PCA ▸ taken over' to the PCA (session_01PL2xbMi4bJQNaakJbg7GtF; if archived, the PCA named in
> p/pl.sessionUrl).
