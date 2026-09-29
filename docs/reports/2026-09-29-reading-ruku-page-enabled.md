# Mark as read for Ruku' and Page — enabled, 29 Sep 2026

**Decision by:** MMSA Master Architect, on the Owner's confirmation.

**What was deployed.** The Owner published
`docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules` to the
`study-monitoring` Firestore project and said: *"Ruku/Page rule published."*
That file is the previous live rules with one change: `unitIdentityOk()` in the
Activity-evidence block accepts `ruku:S:N` and `page:madani:N` unit keys
alongside `ayah`/`range`/`surah` (ADR-008 Amendment 3, Owner decision 20).
Nothing else changed and nothing was removed (checked by `diff` against the
previous `firestore.rules` before sync: the two conditions and their comments).

**What this enables.** `app/js/study-reading-units-readiness.js` reads
`ready: true` with this decision. The Unit Card's **Mark as read** for a Ruku'
or a Page is live: pressing it records one `reading.completed` evidence row,
the same as a Surah completion. Hizb and Juz stay "later" (decision 20).

**Repository sync.** `firestore.rules` now equals the published file. The
commit carries `[already-deployed-manually]` so the approval-gated deploy
workflow does not ask the Owner to approve what is already live.

**Evidence.** `tools/firestore-emulator/reading-units-real-function.rules.test.mjs`
runs the real chokepoint against the candidate, which is now the live
`firestore.rules`: Ruku' and Page rows written, Juz and mismatched unit types
refused.
