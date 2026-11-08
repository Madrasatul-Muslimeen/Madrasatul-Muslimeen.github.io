# QR Lead handover 5, 8 Nov 2026 (about 12:50 PM Sydney), short

Read `2026-11-08-qr-lead-handover-4.md` for rules and the test setup (it still holds); this adds only what changed.
This session: `session_01PL2xbM4MiKgwuTGUTUTwVo` (03A). MSA Architect `session_01PL2xbJGgHfh7dkdbyoCQjC`; PCA `session_01PL2xbKVuJXGYDw1vo7D1pn`. Send with the claude-code-remote `send_message`.

## Done
- **#1526** (two nits, head 55235c0) was accepted by the Architect at b980272; it rides with the next release.
- **#1527 MERGED** (19ccb054, test-only, no version): emulator suite + mutation proof for `docs/proposals/bangla-words.candidate.rules` (`tools/firestore-emulator/bangla-words.*`; `npm ci` there, then `npm run bangla-words` / `bangla-words-mutate`; 23/23). Two equivalent mutants are stated in the script.
- **#1528 DRAFT** (branch `claude/qr-lead-era-view`, head 1e995cb): `app/js/era-view.js` (pure `buildEraView(data, rows, ref)`), `app/data/era-speakers.json` (the Owner-approved 2:228 demo data, `checked:false`), `tools/i18n-verify/era-view.mjs` (17/0, `--prove` 6/6). NOT wired to any page.
- PCF: J115 comment c115qr34 written (version 13 at that time). Re-read the doc before the next write and pin `if_version`.

## Next, in order (the Architect's answers, 8 Nov 12:44 PM)
1. **Labels, answer (a)** with five conditions: (1) only DISPLAY numbers move: no Approach id, permanent key or APPROACH_TEMPLATES entry; (2) the new Tābiʿūn takes the freed display number straight after Ṣaḥābah (29), so "29 Tābiʿ al-Tābiʿīn" -> 30 and every later label one higher; (3) change `app/data/tafsir-scholars.json` AND its builder `tools/scholars/build-tafsir-scholars.mjs` so a rebuild gives the same file, proved by a check; (4) a check binds each label to its era BY NAME (`findEraApproach`/`eraOfName`), not by number, plus a mutation; (5) Bangla labels shift the same way. Today's tags: `28 Sahaba`(7), `29 Tābiʿīn`(2), `29 Tābiʿ al-Tābiʿīn`(1), `30 Gen1`(23), `31 Gen2`(17), `32 Maliki`, `33 Hanbali`, `34 Hanafi`, `35 Shafiʿi`, `36 Groups (...)`, `Gen3/4/5` unnumbered. Consumers: `app/js/read-next-ui.js`, `read-next.js`, `tools/i18n-verify/read-next*.mjs` (they may bind to the old numbers: read them first). Era view first, labels next, both in one PR from main if easy, otherwise two.
2. **The era view's page hook is STILL UNANSWERED** (I asked: an "Eras" button in the Study Next / Tafsīr panel of `read-next-ui.js`, or a link from the Approach pill). Ask again, recommend the Study Next panel (no new bar), then build the UI over `buildEraView`: tabs per era, two columns by view, "just after this era's line" block, source rows opening the verbatim passage, plain words when `approachFound:false` or `no-reports`, ← Back (`setAppReturn()`), bn strings, 320/390/1280 in en + bn measured, contrast checked on the real background.
3. Slice B: book-by-author-era grouping for any āyah from the tafsir books by death year.
4. J121 only when the Owner ticks n121e (ask the Architect first, everyayah.com has no terms). J119 Monitor figure / Learn next badge segment only if the Architect says so.

PCA correction already applied: nits (a)/(b) were in #1526, not a separate PR.
