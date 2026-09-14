# MAP Phase 5 — P5-C: Study↔Note Source Binding and Quick-Note Reconciliation

- **Date:** 2026-09-15
- **Task:** MAP Phase 5, task P5-C, executed under the Continuous MAP Execution Directive
- **Method:** PRESERVE → RECONCILE → EXTEND; IMPLEMENT → TEST → AUDIT → CORRECT
- **Blast radius:** **BR-0.** No application behaviour changed. No tracked file under `app/` was modified; two new files were added and nothing imports them.
- **Application version:** **08.25, deliberately unchanged.** Nothing a reader can reach behaves differently, and a version bump for an unreachable module would make the badge lie about what shipped.
- **Result:** ACCEPT — 8 of 8 mutations proven to fail the suites; 0 failures across 13 suites.

---

## 1. What this task had to answer, and what it found first

P5-A produced the Note Foundation Rules candidate; P5-B produced the permanent
Journaling identity that closes the deferred P4-D3 dependency. Neither answered
the two questions that stand between the Note Foundation and any editor built on
it:

1. **What does a Note's link to a Study Unit actually contain?**
2. **What is the relationship between the Note Foundation and the per-āyah
   quick note that holds real Owner data today?**

### The drift found while answering the first

`note-foundation.js` has always written a `noteSources` document with four
descriptive fields — `sourceKind`, `sourceKey`, `relationshipKind`,
`provenanceKind`. **Nothing ever decided what they may contain.** The P5-A Rules
candidate constrains them only to "a non-empty string", and the repository
already carries the consequence: two fixtures, written months apart, disagree
with each other about two of the four.

| Fixture | `sourceKind` | `provenanceKind` |
|---|---|---|
| `tools/i18n-verify/note-foundation-data-layer.mjs` | `quran` | `created-in-study` |
| `tools/firestore-emulator/note-foundation-v1.rules.test.mjs` | `quran-ayah` | `reader-created` |

Neither was wrong, because there was nothing to be wrong against. Left alone,
the first real Note surface would have minted a third spelling — and a Note's
provenance, which ADR-004 requires migration and import to *preserve*, would
have been unqueryable across the very set it exists to describe.

---

## 2. ADR-009 — the decision, and why most of it is not a new one

`docs/governance/adr/ADR-009-study-note-source-binding-v1.md`, contract
identifier `study-note-binding:v1`.

| § | Decision |
|---|---|
| 1 | `sourceKey` is the permanent Study Unit key, stored verbatim (I5) |
| 2 | `sourceKind` is **derived** from that key and cannot be supplied at all |
| 3 | `relationshipKind` is a closed set of exactly two: `origin`, `reference` |
| 4 | `provenanceKind` is a closed set of exactly two: `study-note`, `promoted-ayah-note` |
| 5 | The quick note is **promoted, never migrated** |
| 6 | Binding breadth is wider than evidence breadth, deliberately |
| 7 | `approachId` on a source link is descriptive only — ADR-003 untouched |

**§2 is the whole fix for the drift.** A field nobody types is a field nobody
can spell two ways. Nine Quran unit types share one `quran-unit` kind on
purpose: the unit type is already the key's own leading segment, so storing it
again would create two places for one truth and one of them would go stale.

**§5 turned out to be an implementation of an already-accepted term, not a new
decision.** The accepted Note Foundation contract
(`tools/i18n-verify/note-foundation-contract.json`) already fixes all four facts
it rests on:

```
"legacyCompatibility": {
  "ayahNotesUnchanged": true,
  "dualWrite": false,
  "automaticMigration": false,
  "userControlledCopyWithProvenance": true
}
```

"User-controlled copy with provenance" *is* the promotion; the three terms
beside it are the three alternatives ADR-009 rejects. The same file's
`identity.studyUnitKeyUse: "source-reference-only"` is what §1 and §2 implement.
A boundary check now reads those values out of the contract rather than
restating them, so if the accepted terms ever change, §5 stops being an
implementation of them **in a failing check** rather than silently.

### The three rejected alternatives, with their costs

| Alternative | Rejected because |
|---|---|
| Migrate `ayahNotes` into `notes` | Destructive migration of live Owner data, outside current authority, irreversible the moment a reader edits the new copy |
| Dual-write both on every save | Two writers for one piece of text with no defined winner; a partial failure silently forks the reader's own note |
| Leave them wholly unrelated | No reconciliation at all, and two note fields on one screen with nothing to say which is which |

---

## 3. What was built

Both modules are **uninvoked**. Nothing under `app/` imports either, and no page
can reach either by any chain of any length.

### `app/js/study-note-binding.js` — pure policy

No Firebase, no DOM, no mutable state, no I/O. Derives `sourceKind`, validates
the unit key against the exact shapes `buildUnitKey` produces, enforces both
closed vocabularies, and returns a **frozen** payload so a caller cannot
re-spell a field afterwards. A unit key that is not a permanent unit key
*throws* rather than returning null — a Note bound to a non-unit is a caller
defect with no correct silent handling.

### `app/js/study-note-service.js` — the orchestration

Three things it deliberately **cannot** do:

1. **It cannot touch the quick note.** The promotion takes the HTML as an
   *argument*; the module holds no reference to `ayah-notes.js` of any kind.
   That is what makes "promotion cannot damage the quick note" provable by
   reading the imports rather than by trusting the code.
2. **It cannot grant status.** Nothing names `records`, `claimStatus`,
   `confirmEntry`, `achieved` or `mastered` (ADR-003).
3. **It cannot write Activity evidence as a side effect of saving a Note.**
   Every function returns the evidence *arguments* and stops. Recording them is
   a separate call the surface makes, so a failed evidence write is surfaced by
   the caller (I15) instead of being buried inside a save that already
   succeeded. This is the same split P4-D uses.

Which Journaling event is recorded comes from the **revision chain**
(`previousRevisionId == null` ⇒ created), never from a flag a caller could set
wrongly. Retirement records nothing, and returns `evidence: null` explicitly so
a caller cannot read an absent field as "not yet computed".

---

## 4. Tests

| Suite | Cases | Result |
|---|---|---|
| `tools/i18n-verify/study-note-binding.mjs` | 16 | 16 passed |
| `tools/i18n-verify/study-note-service.mjs` | 19 | 19 passed |
| `tools/i18n-verify/study-note-boundary.mjs` | 16 | 16 passed, 0 failed |

The service suite runs the **real shipping source** with its database imports
rewritten to injected globals — the technique
`study-activity-evidence-store.mjs` already uses — so the file under test is the
file that would ship, not a copy of it.

Two checks are worth naming because they pin a claim no functional test can see:

- **A10** asserts that the repository's own two drifting fixture spellings
  (`created-in-study`, `reader-created`, `quran`, `quran-ayah`) are now each
  refused or overridden. The drift is tested against by name.
- **S4** strips *both* comment forms from the service source before searching
  for `ayah-notes`. Its first version stripped only whole-line `//` comments and
  failed against the module's own doc comment — which names `ayah-notes.js` in
  order to say it is never reached. A line filter alone would have made the
  check unmaintainable rather than wrong, and it was the failure that showed it.

### Mutation testing — 8 of 8 proven able to fail

| # | Mutation | Caught by |
|---|---|---|
| M1 | `provenanceKind` vocabulary re-opened to `reader-created` | A9 (first failure after A8) |
| M2 | A supplied `sourceKind` is honoured | A1 — "the derived value wins over a supplied one" |
| M3 | Unit-key validation relaxed to a bare split | A6 — "Missing expected exception: `ayah:2`" |
| M4 | Saving a Note records evidence as a side effect | S1 — "a save must not record Activity as a side effect" |
| M5 | Promotion lets a caller override its provenance | S7 (first failure after S6) |
| M6 | A failed Note write is swallowed (I15 broken) | S16 — "Missing expected rejection" |
| M7 | An app file imports the service (`.js` and `.html` forms) | boundary — names the offending file |
| M8 | `ayah-notes.js` edited | boundary — "NOT byte-identical to `origin/main`" |

All restored; suites returned to 16 / 19 / 16 with a clean tree.

---

## 5. A correction made to Phase 4's own boundary suite

`study-activity-evidence-boundary.mjs` went **red** the moment P5-C landed: two
of its cases asserted that *nothing* under `app/` imports the evidence writer,
and `study-note-service.js` imports it.

**The claim those cases stand for was still true** — no Study surface records
evidence — but their mechanism had stopped being able to express it. The cheap
answer would have been an exception for that one filename, which is exactly the
"worked around" this project forbids: the next importer would need another
exception and the tenth would be a live wiring nobody noticed.

So the mechanism was made **stricter, not looser**, and updated in place with
the reason recorded. It now walks the import graph from every page in `app/` and
asserts the writer is unreachable from all of them by any chain of any length —
which catches a wiring wherever in that chain it happens, not only at the first
hop. The set of direct importers is additionally **pinned** to
`["study-note-service.js"]`, so a new importer is a fact a later session must
audit deliberately even while it is still unreachable.

**The walker carries a positive control**, because without one a broken regex
would make every chain come back empty and all three cases would pass vacuously
— a check that cannot fail, which this project has shipped before. It first
asks for a module that *is* unmistakably wired (`records.js`) and asserts a
chain comes back naming `quranrevival.html`.

Proven both ways: with a single `import "./study-note-service.js";` added to
`records.js`, the suite fails and prints the reachability chain from **16 pages**
(`app/quranrevival.html -> records.js -> study-note-service.js -> study-activity-evidence-store.js`,
and fifteen more). Restored: 15 passed, 0 failed.

---

## 6. Preservation — verified, not asserted

| Claim | Evidence |
|---|---|
| Existing user notes preserved | `app/js/ayah-notes.js` **byte-identical** to `origin/main` |
| Note Foundation not activated or reshaped | `app/js/note-foundation.js` **byte-identical** |
| Activity and Records untouched | `app/js/activity.js`, `app/js/records.js` **byte-identical** |
| Nothing deployed, nothing proposed in place | `firestore.rules` **byte-identical** |
| No destructive migration | Neither module names `migrat`, `backfill`, `deleteDoc` or `writeBatch`; the promotion path names no `delete`, `clear(` or `remove(` — a copy must not remove anything |
| No historical isolated work activated | The gated keyed-Activity material is still absent (P4 boundary case, still passing) |
| No layout or behaviour change | `git status --porcelain app/` lists **only the two new untracked files**; no tracked file under `app/` is modified, so every page's byte content and its entire import closure are unchanged |

`layout.mjs` was **not** re-run, and that is a deliberate, stated choice rather
than an omission: it compares a rendered page against a previous build, and no
page — nor any module any page can reach — differs from `origin/main` by a
single byte. The git evidence above is the stronger proof of the same claim.

### Full regression sweep

| Suite | Result |
|---|---|
| `stub-parity` | 3 passed, 0 failed |
| `study-approach-contract` | 13 passed, 0 failed |
| `study-approach-contract-boundary` | 16 passed, 0 failed |
| `study-activity-evidence` | 11 passed, 0 failed |
| `study-activity-evidence-id` | 29 passed, 0 failed |
| `study-activity-evidence-store` | 19 passed, 0 failed |
| `study-activity-evidence-boundary` | **15 passed, 0 failed** (updated, §5) |
| `note-journal-evidence` | 18 passed, 0 failed |
| `note-foundation-boundary` | 30 passed, 0 failed |
| `note-foundation-data-layer` | 15 assertions passed |
| `note-foundation-transaction` | 16 assertions passed |
| `note-foundation-size-preflight` | 5 synthetic fixtures measured |
| `quran-word-identity-contract` | 6 passed, 0 failed |

No new user-visible string was added — neither module carries any UI text — so
translation coverage is unchanged by construction.

---

## 7. What was deliberately NOT done

- **No Note editor surface.** Building one is a real behaviour change: a version
  bump, a full layout measurement at 8 viewports × 2 languages × 2 banner
  states, and — because the Note Foundation collections have no deployed Rule —
  a surface every write of which would be denied in production, with I15
  requiring that denial to reach the reader. It is the next task (P5-D), held
  behind the same dependency as the Phase 4 wiring, not collapsed into this one.
- **No `noteFolders` / `notePlacements` activation.** Phase 6 material.
- **No amendment to the P5-A Rules candidate.** Its string constraints are
  deliberately looser than this vocabulary: the server enforces structure, the
  contract enforces meaning. Tightening Rules to a closed word list would make
  every future vocabulary addition a production Rules deployment.
- **No change to the two drifting fixtures.** They are test data for suites this
  task did not own; correcting them is a separate, visible change and they are
  now tested *against* by name (A10) rather than quietly rewritten.

---

## 8. Phase 4 state — preserved exactly, as directed

| Item | State |
|---|---|
| `main` | `08.25`, safe, no wiring |
| Wiring candidate | `claude/phase4-wiring` at `c4fca4a` (v08.26) — **not merged** |
| Rules amendment | 208-line addition-only block, tested, **not deployed** |
| Blocker | Firebase Console access, external to this session |

Unchanged by this task in every respect.

---

## 9. Standing dependencies

1. **Phase 4 production deployment** — the 208-line Rules block, then the merge
   of `claude/phase4-wiring`.
2. **Phase 5 Note Foundation Rules deployment** — the P5-A candidate. Until it
   is deployed, `notes` / `noteRevisions` / `noteSources` have no server-side
   rule, so P5-C's service and the P5-D editor stay unwired.

Neither blocks further Phase 5 design or implementation work that does not write
to production.
