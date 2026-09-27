# Basic Arabic and Arabic in Depth word progress — enabled, 27 Sep 2026

**Decision by:** MMSA Master Architect, on the Owner's confirmation.

**What was deployed.** The Owner published
`docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules` to the
`study-monitoring` Firestore project and said: *"Word levels rules are live."*
That file is the previous live rules with one check widened: the existing
`quranWordProgress` / `quranWordApprovals` lanes accept `level` in
`['wbw', 'basic', 'depth']` instead of `'wbw'` only. Nothing else changed and
nothing was removed (checked by `diff` against the previous `firestore.rules`
before sync: the one condition and its comment).

**What this enables.** `app/js/study-word-levels-readiness.js` reads
`ready: true` with this decision. The Word Card's **Basic** and **Arabic in
Depth** tabs now show Not started / Learning / Achieved for the word, saved
per word in its own lane, with the same supervisor confirm as Word by Word
(Owner decision of 26 Sep 2026, row 4: *"Claiming for basic n Depth is per
word. (Because It's in WbW)"*). Word by Word itself is unchanged. The two new
levels have no coverage line, no whole-Qur'an counter and no Activity
evidence, as built in v08.88.

**Repository sync.** `firestore.rules` now equals the published file. The
commit carries `[already-deployed-manually]` so the approval-gated deploy
workflow does not ask the Owner to approve what is already live.

**Evidence.** `tools/firestore-emulator/word-levels-real-function.rules.test.mjs`
runs the real data-layer functions against the candidate, which is now the
live `firestore.rules`; `tools/i18n-verify/quran-word-levels-rendered.mjs`
covers the rendered tabs.
