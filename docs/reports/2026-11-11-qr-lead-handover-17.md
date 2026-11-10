# MSA-QR Lead handover 17: 46L to 47L (11 Nov 2026, about 10:50 am Sydney)

Written by 46L (session `session_01PL2xbKuYcFzuK32jDvmAXJ`). `main` is **v14.21** (#1633–#1636 released). MSA Architect **97L** `session_01PL2xbMP1cjoPSSKucQC1FD`; PCA **34L** `session_01PL2xbMuD5EbaWRuvuMUick`. Always send by explicit session_id.

## In 97L's review queue (open PRs, in this order; none is mine to merge)
1. **#1637** Read-bar asks (one bookmark tile; Word by Word / Root / Derivatives in Read on's ⋮; quick 🔍; 🔍 steps aside at 320px while the Back chip holds the line). Main was merged into its branch once (offline-files only).
2. **#1638** Ayah stripe round 2 (★ Words marked, QCR, اسم Asma chips). Option (1) agreed with 97L: chips draw only from data already loaded; making them show on a fresh view costs a read per sūrah, which is the Owner's I9 call (offer as a tick-box in J110 after they have seen round 2).
3. **#1640** J129 Word Card "Know Your Status" block behind a switch, ON by default (Owner B1), remembered on the device (my default, told to the Owner). The job shows as dimmed in the PCF (set 20:17 UTC, before the B1 answer).
4. **#1641** Bangla Words stage 1: kinds (names, rituals, bangla) under NEW key `mm_bangla_words.v2`; v1 only read. Carries one docs-only commit (stage 2 report) added after I called it ready.
Each of #1638/#1640/#1641 will need `app/offline-files.json` regenerated (`node tools/offline/build-offline-files.mjs`) when an earlier one lands: it is the only file that conflicts. Do not change a PR's head after telling 97L it is ready; merge main in only when GitHub says CONFLICTING.

## Open list for 47L
1. **Bangla Words (J119)**: stage 2 report is at `docs/reports/2026-11-11-bangla-words-stage2-match-quality.md` (spelling match finds 55 of 4,832). Waiting on 97L's word; then the Owner is asked (tick-box) for a list of Arabic-origin Bangla words. Stage 3: Rules CANDIDATE extension for the three kinds (Owner publishes). UI (word-list picker, kinds chips) is not built.
2. **J137**: B = a reader-facing guide page in the app. **New job, demo first, nothing built until the Owner ticks it.** Not started. Manual rounds 1–8 are written (see handover 16 for how: read `p/mmsa` `manual`, insert, write with `if_version`).
3. **J05 T11 = A and T15 = A** (Ten Steps master file / question cards): demo first.
4. **Ayah Stripe**: add the J110 tick-box offering the Owner option (2) (load marks + QCR + Asma once per session) after they have seen round 2.
5. **Owner-owed, do not re-ask**: phone check of J120 (save Sūrah 1, play with network off); that Very Hard saves after release; n127a; the Verb Form YouTube link (J122); whether my reading of the Bangla answer 1 is right.
6. `send_later` is unavailable (lineage depth); continue within turns.

## Lessons (new)
- **Baseline before blaming**: run a failing suite on clean `origin/main` in a git worktree (`git worktree add --detach /tmp/x origin/main`, symlink `tools/i18n-verify/node_modules`, `PORT=8081 node serve.js` there, `QR_BASE=http://localhost:8081`), while the branch suites keep running on :8080. Known baseline failures on clean main: `audit-part1-fixes` 4, `audit-part6-fixes` 32, `qr-read-tall` (count varies under load, 8–41), `qr-j110-reading-view` 1, `brief-integrity`, `study-*-boundary`, `programme-ledger`, `rules-deployment-candidate*`.
- **A new bar button costs a row at 320px** when the Back chip holds the line: `bookmark-marks-back-browser` catches it. A button added to a bar needs that suite run.
- **A mutation anchor can be overridden by a stronger rule**: the first `smallsw` mutation changed a `min-height` another rule beat, so it stayed green (UNPROVEN). Inject a higher-specificity `!important` rule instead and prove the check goes red.
- In a stripe/Reading-View test, the Reading View shows only the first Mushaf page of the sūrah: pick āyāt on page 1 (Sūrah 1 is safe), and load lazily-read data (marks, QCR, Asma) by opening the Āyah card once.
- `tools/offline/build-offline-files.mjs` must be re-run whenever `app/` files change, and is the usual merge conflict.

## The full opening message for 47L
> Bismillah. You are the MSA-QR Lead 47L, taking over from 46L. Title this session "📌 (04) MSA-QR Lead (47L) - DD.MM.YY - h.mm AM/PM". Read CLAUDE.md, this file (`docs/reports/2026-11-11-qr-lead-handover-17.md`), the PCF (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ, section `mmsa`, jobs J110, J119, J120, J122, J129, J136, J137) and PMS guide G02. Rules: a Lead never merges and never allocates a version or bumps `app/js/version.js`; MSA Architect is 97L, PCA is 34L; pin every PMS write with `if_version`; write "Siyagah" in full; after "Rasulullah" always write "Sallallahu A'laihi Wa Sallam"; every Owner ask starts with 🟨 ⚠️ and gives the whole ask in that line (bold in chat); every round needs its own mutation (an unfailing mutation is UNPROVEN); hand over at about 30% context with this kind of message. Work the open list above in order, asking the Owner only for a real choice or answer, and keep working without waiting.
