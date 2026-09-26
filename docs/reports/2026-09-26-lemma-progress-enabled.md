# Lemma ("Dictionary Word") progress — enabled, 26 Sep 2026

**Decision by:** MMSA Master Architect, on the Owner's confirmation.

**What was deployed.** The Owner published
`docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules` to the
`study-monitoring` Firestore project and said: *"Lemma progress rules are
live."* That file is the live rules plus three additive collections —
`quranLemmaProgress`, `quranLemmaApprovals`, `quranLemmaOccurrenceCounters`
— and removes nothing (a line-by-line diff against the previous
`firestore.rules` shows additions only).

**What this enables.** `app/js/study-lemma-progress-readiness.js` reads
`ready: true` with this decision. The Word Card's "Mark this word known
everywhere" is offered; marking a Dictionary Word (lemma) known and having it
confirmed once counts every occurrence of every form of that word as known
(the Owner's rule, issue #301/#303).

**Repository sync.** `firestore.rules` now equals the published file. The
commit carries `[already-deployed-manually]` so the approval-gated deploy
workflow does not ask the Owner to approve what is already live.

**Evidence.** The real-function emulator suite
(`tools/firestore-emulator/lemma-progress-real-function.rules.test.mjs`) runs
the real data-layer functions against the live `firestore.rules`.

**Naming.** On the Owner's instruction the reader-facing word for a lemma is
**"Dictionary Word"** — the form a reader looks up in a dictionary. Code
identifiers keep `lemma`.
