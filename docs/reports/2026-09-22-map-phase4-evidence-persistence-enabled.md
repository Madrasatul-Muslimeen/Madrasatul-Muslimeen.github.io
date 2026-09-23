# MAP Phase 4 — Activity evidence persistence ENABLED (v08.34)

- **Date:** 2026-09-22
- **Authority:** MMSA Architect (this session), the sole closed authority
  `study-evidence-readiness.js` accepts (`READINESS_AUTHORITIES = ["master-architect"]`).
- **Status:** GOVERNED DECISION, executed. This is the record
  `EVIDENCE_PERSISTENCE_DECLARATION.decision.reference` points at.

---

## The decision

`app/js/study-evidence-readiness.js`'s `EVIDENCE_PERSISTENCE_DECLARATION` is
changed from `ready: false, decision: null` to:

```js
ready: true,
decision: {
  by: "master-architect",
  on: "2026-09-22",
  reference: "docs/reports/2026-09-22-map-phase4-evidence-persistence-enabled.md",
},
```

This enables the ✓ on `#readBar` (D1 Reading), the ≥80% Listening gate (D2)
and the Word-by-Word gate (D4) to actually persist Activity evidence for
every reader, effective the moment this change reaches `main`.

## Why now — both preconditions this file's own design requires are met

1. **`deployment.firebaseRulesDeployed.state` is YES.** The Owner published
   the Phase 3-6 Rules candidate directly in the Firebase Console on
   22 Sep 2026 (recorded in `docs/reports/2026-09-22-fix-list-panel-truncations.md`'s
   sibling deployment entries; see CLAUDE.md's dated correction, same day).
   `firestore.rules` now contains `/evidence/` and the accepted
   `study-approach-contract:v1` literal — proven, not asserted, by
   `rules-deployment-candidate-phase3-6.mjs`'s own byte-exact check.
2. **Phase 3 word-by-word progress was verified on the Owner's own real
   phone, the same day**, following the exact steps: open Quran Study → tick
   "Word by Word" in Study options → tap an Arabic word → the "WbW" tab's
   "Learning"/"Achieved" button → close the card, reload the page, re-tap the
   same word → the pressed state survived the reload. The Owner's own words:
   *"It worked, switch on Phase 4."*

Both conditions this module's header names as prerequisites (Rules deployed;
a real save-and-reload proven, not merely Rules existing) are satisfied, and
the second is stronger than the module's own minimum bar — it proves the
*sibling* Firestore write path this Rules publish opened also works for
real, not just that the Rules text parses.

## What this actually changes for a real reader, today

- **D1 Reading**: the ✓ on `#readBar` stops being `aria-disabled`. A real
  tap creates one document at
  `activity/{tenant}__{person}__{week}/evidence/{eventId}` — create-only,
  deduplicated by the database because the identity IS the document id
  (ADR-008).
- **D2 Listening** (≥80% of the selected unit) and **D4 Word-by-Word**
  (āyah + day, on the learner's own state action) start recording
  silently, exactly as v08.30/v08.31 built them — neither ever invited a
  press, and that is unchanged.
- **D3 Journaling remains out of scope** — `note-journal-evidence.js` still
  has no reachable producer (P5-D, the Notes screen, is a separate
  in-progress Builder round, issue #180). Nothing about this decision wires
  it.

## What does NOT change

- The writer's own rethrow (I15) — untouched, still the defence-in-depth
  layer underneath this gate.
- `bulkConfirmWeek()` — still reads only `entries[]`, never the evidence
  subcollection (the Activity-to-Mastery escalation guard, unaffected).
- Nothing about Notes (Phase 5) or Mapping My Journey (Phase 6) — those
  remain separate, in-progress Builder rounds (issues #180, #182).

## Verification

- `app/js/study-evidence-readiness.js`'s own `isStudyEvidencePersistenceReady()`
  returns `true` for the new declaration (closed-authority, real-date,
  non-empty-reference checks all satisfied — the same predicate that has
  refused every prior bare-flip mutation continues to refuse a malformed one;
  it simply now also accepts this well-formed one).
- `programme-ledger.mjs` guard G re-run clean against the updated ledger:
  the code's `ready` literal, the ledger's `evidencePersistenceReadiness`
  block, and `deployment.firebaseRulesDeployed.state` all agree.
- `study-activity-evidence-boundary.mjs`'s own "readiness declaration" check
  updated in place (not deleted) to assert the new state is well-formed,
  since asserting the old "defaults to false" literal would now be asserting
  something no longer true — the same class of fix already applied across
  nine other suites the same day the Rules were confirmed deployed.

## Version

**v08.34**, allocated by the MMSA Architect. This is a real, user-facing
behaviour change (a control moves from non-actionable to actionable and
begins performing real writes) — the same reasoning v08.31 itself used for
why the *gate* needed its own version, applied symmetrically to the gate's
release.
