# Basic and Depth word progress switched on

2 Oct 2026, MMSA Architect, session `session_01M4Sbc1h94F7SgErzAzxq9n`.

## What happened

- The Owner published `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules` to the `study-monitoring` project through the Firebase Console. They confirmed it in their own words: **"Basic and Depth rules are live."**
- `firestore.rules` was synced to that exact file in the same change, so the repository copy matches what is published.
- `app/js/study-lemma-levels-readiness.js` now declares `ready: true`, by `master-architect` on 2026-10-02, with this report as its reference.

## What the Rules authorise (decision 58)

- `quranLemmaProgress` and `quranLemmaApprovals` documents may now carry `level` of `basic` or `depth` as well as `wbw`. Any other level is still refused.
- Nothing else changed. The per-level `quranWordTotals` documents were already allowed.

## What it switches on

- **WbW Achieved** marks the same word.
- **Basic Achieved** marks every word of the same root with the same meaning (one claim keyed by the meaning-group id, e.g. `رحم:2`, or the lemma when ungrouped).
- **Depth Achieved** marks every word of the root (one claim keyed by the root).
- The Word card shows one "You know" line per level.

## Evidence

- **Emulator, against the synced `firestore.rules`:** `lemma-levels` passes; `lemma-progress-real-function` passes again (its loader had not been told about the #492 gate import and had stopped loading; fixed in the same change).
- **Browser, with the shipped gate (nothing forced):** Basic Achieved on ٱلرَّحْمَٰن (1:1:3) shows "You know (Basic) 327 of 77,429 words", the hand-written figure.
- **Suites:** rules-authorisation-executable 56/0, lemma-levels 240/0, known-meaning-groups 66/0, known-word-marks 122/0, quran-lemma-progress-rendered 76/0, quran-word-levels-rendered 41/0, quran-lemma-progress-boundary 8/0, -model 34/0, -numbers 24/0, quran-word-total-boundary 31/0, quran-ayah-action-sheet 144/0, phone-width-overflow 217/0, quran-word-card-rendered 134/2 (TLS), behaviour 1004/4 (22g×3, 31e: sandbox).
- **Three checks updated in place**, each written while this gate was shut: `known-meaning-groups` (the groups file is now fetched once, on first Read use, never on the landing page), `quran-lemma-progress-rendered` (the bold box carries 3 numbers per level, 9 in all), `quran-word-levels-rendered` (the Basic tab shows the per-level box).
- **Still red, and red on `main` before this change:** `quran-word-progress-rendered` "opening a word reads both lanes and no more" (en/bn). It saw the lanes twice and an extra totals read before; it now also sees the two new per-level totals reads, which decision 58 designed. To investigate.
- `lemma-levels-browser`: the gate-off case now routes a CLOSED copy of the readiness module, so "closed means exactly v09.42" stays tested.

## Not done

- No index was needed: every query is equality-only.
- No existing document was changed or recounted.
