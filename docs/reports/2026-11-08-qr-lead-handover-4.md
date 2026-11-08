# QR Lead handover 4, 8 Nov 2026 (updated about 12:40 PM Sydney), short

## UPDATE 12:40 PM — READ THIS FIRST (supersedes the older lines below where they differ)
- **IDs now:** MSA Architect `session_01PL2xbJGgHfh7dkdbyoCQjC`; PCA `session_01PL2xbKVuJXGYDw1vo7D1pn`; this QR Lead (34) hands over from `session_01PL2xbNSZE2rQMWXva3FeCZ`. Send with the claude-code-remote `send_message`, never `SendMessage`.
- **#1521 (J119) and #1523 (J115 r1) are RELEASED in v13.53** (PR #1525, merge 18804d07). Nothing of them is in flight.
- **Small PR #1526** (branch `claude/qr-lead-nits`, head b980272 + this doc) = two Architect nits: the stray Odia regex in `era-approaches.js` removed; `bangla-words-browser.mjs` `state()` never null so `--mutate=nosave` fails cleanly. With the Architect.
- **Nit (c)** for J115's PCF text (the Architect writes it): the one-tap Tābiʿūn button is gated owner OR prime (the Add Approach gate), accepted as "the catalogue manager".
- **Next, in this order:** (1) the EMULATOR SUITE for `docs/proposals/bangla-words.candidate.rules` (follow-up PR from main; member reads madrasah doc, non-member denied; teacher/owner write madrasah, student denied; a reader writes own list not another's, isolating case = pX for themselves under ANOTHER tenant's path denied by `personInTenant` alone; words > 5000 denied; delete denied; createdBy/tenantId/scope immutable; mutation-prove each helper). (2) J115 round 2: era view per āyah + Scholars labels (below). (3) J121 when the Owner ticks n121e. (4) J119 later round (Architect's call): Monitor `vocab-known.js` and the Learn next badge segment.
- **PCF:** J119/J115 PCF jobs were stamped at hand-in (11:50 AM); not updated for the v13.53 release (the Architect writes the release lines). The session title form is "📌 (03A) MSA - QR Lead (34) - DD.MM.YY - h.mm AM/PM".

# (older text, 11:55 AM)

Read `2026-11-08-qr-lead-handover.md`, `-handover-2.md`, `-handover-3.md` first (rules, gotchas, test setup); this adds only what changed.
This session: `session_01PL2xbNSZE2rQMWXva3FeCZ` (03A, took over 11:22 AM). Architect `session_01PL2xbJJrkv8JuD1FEhog98`; PCA `session_01PL2xbNATLmmCFj3TFkvWfR`. Send with the claude-code-remote `send_message` (session_id), NOT `SendMessage`.

## J114 (#1516): merged and released (v13.52, main a2b9e0f). Nothing to do.

## J119 (Bangla words): HANDED IN, draft PR #1521 (branch `claude/qr-lead-bangla-words`, head 47e62a6, origin/main v13.52 merged)
Done this session: the three Wheel displays (outer ring = Bangla share, centre line "Bangla x.xx%", tenth part), each on/off. Switches in the Legend drawer on a phone, above the step list at 900px+ (the drawer is under the bottom bar there). Pure helpers in `bangla-words.js` (`setBanglaWheel`, `banglaWheelPlan`), UI in `bangla-words-ui.js`. Checks: bangla-words 27/0 (--prove 8/8), bangla-wheel-browser 78/0 (3 mutations red), bangla-words-browser 39/0, vocab-wheel 114/0; behaviour.mjs 974/1 (14a only, same as main).
**Waiting on the Architect:** (a) `vocab-known.js` (Monitor) does not see the Bangla lists; (b) the Bangla words' own segment in the Learn next badge line. Do not touch until answered. Saving online waits for the Owner's Rules step (candidate: `docs/proposals/bangla-words.candidate.rules`).

## J115 (eras): ROUND 1 HANDED IN, draft PR #1523 (branch `claude/qr-lead-tabiun`, from main a2b9e0f, head c7a9f56)
Done: `app/js/era-approaches.js` (name matcher, no ids; `planAddTabiun`), the owner-only one-tap button in `app/catalogue.html`, bn strings, `tools/i18n-verify/era-approaches.mjs` (41/0, --prove 6/6) and `catalogue-add-tabiun-browser.mjs` (26/0; `--mutate=noguard|noafter` red). Bangla name used: "তাবেয়ী" (asked the Architect).
**Next rounds (same job, after the Architect answers / merges #1523; branch from CURRENT origin/main):**
1. The era view per āyah (read-only, over data already in the repo; the demo https://claude.ai/artifact/F3Z23ZiCgjGWGt84QDfzoW; eras ~100 / 180 / ~220 AH, narrators count within an era; say in plain words when an era Approach is not found; ← Back). Resolve eras with `findEraApproach` at runtime.
2. `app/data/tafsir-scholars.json` labels ("28 Sahaba", "29 Tābiʿīn", "29 Tābiʿ al-Tābiʿīn", "30 Gen1" …) and their builder `tools/scholars/build-tafsir-scholars.mjs`: renumber the display labels one higher from Tābiʿ al-Tābiʿīn on (the Scholars Database is the Architect's: agree the exact label rule first).
Do NOT touch `catalogue-data.js` APPROACH_TEMPLATES numbering.

## J121 (reciter from everyayah.com): waiting for the Owner's tick n121e = P and a reciter
everyayah.com publishes NO terms of use (home, recitation lists, file list, old home; support link unreachable) — recorded in the J121 comments at 11:34 AM. Before building, ask the Architect to confirm; then add a `direct` entry to `RECITERS` in `app/js/audio-player.js` (same shape as `ar`), a check and a bn label. Nothing built.

## Test setup (this container)
`mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright` (git-ignored), `PORT=8080 node serve.js &`. Pure suites need no server. PCF writes: `ArtifactData` get with `out_dir`, edit the JSON in python, `update` with `file_path` and `if_version` (an update REPLACES the `comments` array, so send the whole array).
