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

- See the commit that carries this report for the suite totals. The emulator suite `npm run lemma-levels` was run against the synced `firestore.rules`.
- `lemma-levels-browser`: the gate-off case now routes a CLOSED copy of the readiness module, so "closed means exactly v09.42" stays tested.

## Not done

- No index was needed: every query is equality-only.
- No existing document was changed or recounted.
