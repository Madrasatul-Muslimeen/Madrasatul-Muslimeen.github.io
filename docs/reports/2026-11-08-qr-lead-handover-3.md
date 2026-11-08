# QR Lead handover 3, 8 Nov 2026 (about 11:45 AM Sydney) — short

Read `2026-11-08-qr-lead-handover.md` and `-handover-2.md` first (rules, gotchas, test setup); this adds only what changed.
New QR Lead session: `session_01PL2xbKyCdK1gybgu11rFUj` (03A). Architect `session_01PL2xbJJrkv8JuD1FEhog98`; PCA `session_01PL2xbNATLmmCFj3TFkvWfR`.

## J114 (#1516): finished, with the Architect for release. Untouched.

## J121 (audio from a YouTube video): reciter list DONE, posted to the Owner
Posted as a "Claude ↳" comment in PMS J121 (11:10 AM): five reciters on everyayah.com, sample links, first āyah and 2:286, 18:110, 114:6 of each checked reachable (HTTP 206): Minshawy_Mujawwad_192kbps, Minshawy_Murattal_128kbps, Abdul_Basit_Mujawwad_128kbps, Yasser_Ad-Dussary_128kbps, Nasser_Alqatami_128kbps (+ Husary_128kbps as the plain reference). **Not checked: everyayah.com's terms of use.** Check them BEFORE building. When the Owner ticks n121e = P and names one: add a `direct` entry to `RECITERS` in `app/js/audio-player.js` (same shape as `ar`: `perAyahUrl: (s, a) => https://everyayah.com/data/<folder>/SSSAAA.mp3`), plus a check and a bn label. Nothing built.

## J115 (Tābiʿūn Approach + eras): WAITING ON THE ARCHITECT, nothing edited
Findings sent to the Architect (11:15 AM): the repo has NO era Approaches (templates stop at approach_30: Living by it / Da'wah / Teaching); the Owner's 28–37 exist only in his Firestore tenant catalogue, named only in label strings in `app/data/tafsir-scholars.json` ("28 Sahaba", "29 Tābiʿ al-Tābiʿīn", already "29 Tābiʿīn"). So the permanent id cannot be read from the repo. My proposal: build the era view (demo https://claude.ai/artifact/F3Z23ZiCgjGWGt84QDfzoW) and bind to the three era Approaches **by name at runtime**, with no hardcoded ids; create the Tābiʿūn Approach through the existing Add Approach path (owner-only); renumber the scholars labels (additive). **Next step: read the Architect's answer; if it is (ii) "by name, no ids", build it on a branch from current origin/main.** No branch exists for J115 yet (`claude/qr-lead-tabiun` is local only, empty).

## J119 (Bangla shared words): STAGE 1 BUILT, branch `claude/qr-lead-bangla-words`, draft PR
Built and pushed (commits 41c1400, then the Word Card commit):
- `app/js/bangla-words.js` (pure model: admin list + own list, whole-list on/off, figures where a word already known is never counted twice, device storage `mm_bangla_words.v1`). `tools/i18n-verify/bangla-words.mjs` 21/0, `--prove` 5 of 5 red.
- `app/js/bangla-words-ui.js` (pure HTML + CSS) and its wiring in `app/quranrevival.html` (import, `banglaHtmlFor()`, `wireBanglaFor()`, the card context's `banglaHtml`) and one line in `app/js/quran-word-card.js` (renders `context.banglaHtml` under the marks). `learnNextIsKnown()` now also counts a marked word as known (n119b = E). bn.js: 11 new names only (after "Marks for this word").
- `tools/i18n-verify/bangla-words-browser.mjs` 39/0 at 1280 en, 390 en, 390 bn; `--mutate=nosave` and `--mutate=nocount` both red. Screenshot looked at (390 en): fits, no overflow.
- `docs/proposals/bangla-words.candidate.rules`: CANDIDATE Rules (`banglaWords/{tenantId}__madrasah` and `{tenantId}__{personId}`, the ayahKeyMarks shape). `firestore.rules` NOT touched. The Architect checks it; the Owner publishes.
- Regression, run on this branch: qr-word-card-back-row 54/0, vocab-wheel 114/0, apps-build-check 48/0; brief-integrity shows 2 failures that are this clone lacking remote branches (`origin/claude/phase4-wiring` etc.), not this change. learn-next, vocabulary, zab-dock, tabs-large-text were still running when I wrote this: re-run them and read the exit codes. **behaviour.mjs was NOT run** (it takes ~15 min; main is 974/1, 14a).

**Still to do for J119 (in this order):**
1. Wheel (Vocabulary view, `renderVocabWheel()` in quranrevival.html ~line 11352): the Owner chose all three displays, each on or off: **A** a thin outer ring (renderScopedWheel already takes `ring: { ratio }`, opt-in, gold, shrinks the wedges 14px: so measure), **B** a centre line "Bangla x.xx%" (`centerSub`), **C** a tenth part (changes the Wheel's shape: tell the Architect, since the Wheel Vocabulary view is shared). Add the three switches (state is already in `banglaState.wheel`) in the legend row; measure at 320/360/390/768/1280, en and bn.
2. The known figure in the badge/Monitor: `vocab-known.js` (Monitor) does not see the lists yet; the admin list would have to be read there too: ask the Architect before touching it.
3. Own segment of the figure ("its own segment"): `banglaFigures()` already returns `words/occurrences/share` and `addedWords`; show them in the Learn next badge line.
4. Run behaviour.mjs against main by failure name, then hand in with "QR LEAD ▸ ready for release". No version bump. State in the PR: touches the Word Card file `quran-word-card.js` (1 line), the shared Wheel (not yet), bn.js (new names only).
5. Saving online waits for the Owner's Rules step; until then the card says "Saved on this device only for now."

## Test setup (this container)
`mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright` (git-ignored), `PORT=8080 node serve.js &`. Pure suites need no server.
