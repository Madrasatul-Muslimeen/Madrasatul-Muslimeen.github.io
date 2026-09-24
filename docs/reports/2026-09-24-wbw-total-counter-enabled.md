# Word-by-Word percentage counter — switched on (v08.53)

- **Date:** 2026-09-24
- **Authority:** the Owner's explicit instruction; enablement recorded by the MMSA Architect (`master-architect`).
- **Feature:** issue #206, built and gated in v08.42 (PR #209).

## The decision

The counter was built gated behind `app/js/study-wbw-total-readiness.js`
(`ready: false`). Its two preconditions were:

1. **Rules deployed.** The Owner published
   `docs/governance/2026-09-24-wbw-total-counter-DEPLOYMENT-candidate.rules`
   in the Firebase Console and confirmed it ("Rules are published for the word
   counter"). `firestore.rules` was synced to match in `9050c84`; the ledger
   records `deployment.wbwTotalRulesDeployed.state = DONE`.
2. **A governed decision to enable.** The earlier plan was to wait for the Owner
   to confirm "it works". The Owner looked for the feature and correctly saw
   nothing, because it was hidden by this gate. Asked *"shall I switch it on now
   so you can see it and try it?"*, the Owner answered **"Yes, switch it on"**.
   That instruction replaces the earlier sequencing: a feature cannot be tried
   while it is invisible.

## What changes

- `WBW_TOTAL_PERSISTENCE_DECLARATION` reads `ready: true` with
  `decision: { by: "master-architect", on: "2026-09-24", reference: <this file> }`.
- The ledger's `wbwTotalPersistenceReadiness` block carries the identical decision.
- For a reader: the gold ring on the Explore wheel (whole-Qur'an known/total),
  the Approach / Word-by-Word toggle at the Juz level, and the Juz/Quran coverage
  caption now appear. The counter moves only on a genuine `countsAsKnown`
  transition. The Approach wheel's own colouring is unchanged.

## What does not change

No Rules, index or `firebase.json` change. The data layer's own gate checks
(`recordWordTotalDelta()`, `getWordTotals()`) are untouched and now pass.

## Known limit, recorded

The running total starts at zero for every person. Words already marked known
before today are not counted until their state next changes. Backfilling
existing progress into the counter would be a data migration, and nothing here
performs one.

## Switching it off

Restore `ready: false, decision: null` in both the module and the ledger block.
Nothing is deleted either way (I4).

## Checks

`quran-word-total-boundary.mjs` was updated in place, with the reason recorded:
its "standing declaration is NOT ready" check now asserts the enabled state,
that the reference exists, and that the code and the ledger agree. Every
malformed-shape refusal is asserted as strictly as before.
