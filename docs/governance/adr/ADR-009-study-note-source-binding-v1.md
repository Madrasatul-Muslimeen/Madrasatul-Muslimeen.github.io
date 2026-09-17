# ADR-009 — Study↔Note Source Binding and Quick-Note Reconciliation v1

- **Status:** ACCEPTED (Master Architect authority, MAP Phase 5 task P5-C)
- **Date:** 2026-09-15
- **Contract identifier:** `study-note-binding:v1`
- **Blast radius:** BR-0 — pure policy plus an uninvoked service module. No
  application behaviour, no schema change, no Rules change, no data change.

## Context

ADR-004 gave a Note permanent identity and made origin/reference a
*relationship*, not part of that identity. `note-foundation.js` already carries
the relationship document — `noteSources` — with four descriptive fields:
`sourceKind`, `sourceKey`, `relationshipKind`, `provenanceKind`.

**Nothing ever decided what those four fields may contain.** The Rules
candidate accepted at P5-A constrains them only to "a non-empty string", and
the repository already carries the drift that produces: two test fixtures
written months apart disagree with each other.

| Fixture | `sourceKind` | `provenanceKind` |
|---|---|---|
| `tools/i18n-verify/note-foundation-data-layer.mjs` | `quran` | `created-in-study` |
| `tools/firestore-emulator/note-foundation-v1.rules.test.mjs` | `quran-ayah` | `reader-created` |

Neither is wrong, because there was no vocabulary to be wrong against. Left
alone, the first real Note surface would mint a third spelling, and a Note's
provenance — which ADR-004 requires migration and import to *preserve* — would
be unqueryable across the very set it exists to describe.

Separately, Phase 5 has to answer a question it has so far only deferred: the
live per-āyah quick note (`ayahNotes`, one entry per person per unit key, no id
of any kind) holds **real Owner data today**, and the Note Foundation holds
none. The two must be reconciled before any editor is built on top of either.

## Decision

### 1. `sourceKey` is the permanent Study Unit key, verbatim (I5)

No re-spelling, no normalisation, no surah/āyah pair stored beside it. The key
`buildUnitKey` produced is the key `noteSources` stores.

### 2. `sourceKind` is DERIVED from that key, never supplied

`sourceKind` names the namespace `sourceKey` lives in, and is computed from the
unit key's own leading segment:

| Unit types | `sourceKind` |
|---|---|
| `ayah`, `range`, `surah`, `ruku`, `juz`, `hizb`, `rub`, `manzil`, `page` | `quran-unit` |
| `hadith` | `hadith-unit` |
| `topic` | `topic-unit` |
| `name` | `name-unit` |

A caller cannot pass `sourceKind` at all. This is the whole fix for the drift
above: a field nobody types is a field nobody can spell two ways. It also
refuses to duplicate a fact the key already carries — storing `quran-ayah`
beside `ayah:2:255` would create two places for one truth, and one of them
would eventually be stale.

### 3. `relationshipKind` is a closed set of exactly two

- `origin` — this Note was composed while studying this unit.
- `reference` — this Note was later linked to this unit.

Anything else is refused at the boundary rather than stored.

### 4. `provenanceKind` is a closed set of exactly two

- `study-note` — composed in a Study/Note surface.
- `promoted-ayah-note` — carried forward from the live per-āyah quick note.

### 5. The quick note is PROMOTED, never migrated (the reconciliation)

**This is an implementation of an already-accepted term, not a new decision.**
The accepted Note Foundation contract
(`tools/i18n-verify/note-foundation-contract.json`) already fixes all four of
the facts this section rests on:

```json
"legacyCompatibility": {
  "ayahNotesUnchanged": true,
  "dualWrite": false,
  "automaticMigration": false,
  "userControlledCopyWithProvenance": true
}
```

"User-controlled copy with provenance" is precisely the promotion below; the
three `false`/`true` terms beside it are precisely the three alternatives
rejected in the table. The same file's `identity.studyUnitKeyUse:
"source-reference-only"` is what §1 and §2 implement. A boundary check reads
those values out of the contract rather than restating them, so if the accepted
terms ever change this ADR stops being an implementation of them and becomes a
decision needing its own authority — loudly, in a failing check.


`ayahNotes` is **not** converted, not dual-written, not read at startup, and
not cleared when a permanent Note is made from it. A promotion copies the
quick note's HTML forward into a new permanent Note carrying
`provenanceKind: "promoted-ayah-note"`, and **leaves the original exactly where
it is**.

Three alternatives were weighed and rejected:

| Alternative | Rejected because |
|---|---|
| Migrate `ayahNotes` into `notes` | Destructive migration of live Owner data, expressly outside current authority, and irreversible the moment a reader edits the new copy. |
| Dual-write both on every save | Two writers for one piece of text, with no defined winner on conflict. A partial failure silently forks the reader's own note. |
| Leave them wholly unrelated | Gives Phase 5 no reconciliation at all, and guarantees two note fields on one screen with nothing to say which is which. |

Promotion is the only one of the four that preserves existing user notes
(the directive's own requirement), performs no destructive migration, and
still produces a Note with the permanent identity ADR-004 requires.

**The promotion path holds no reference to `ayah-notes.js` whatsoever.** The
HTML is handed in by the caller. That is not style: it is what makes
"promotion cannot damage the quick note" provable by reading the imports
rather than by trusting the code.

### 6. Binding breadth is WIDER than evidence breadth, deliberately

A Note may be anchored to **any** permanent Study Unit key, including `juz`,
`page` and `topic`. ADR-008's evidence contract, as implemented at P5-B,
records Journaling Activity for `ayah`, `range` and `surah` only.

These are different questions and are answered separately: *what may a Note be
about* (anything studiable) versus *what counts as Journaling Activity*
(a bounded unit, so the evidence stream stays bounded — ADR-008's own
privacy/load rule). A Note on a juz is a perfectly good Note that records no
Activity, and neither module may quietly widen the other.

### 7. `approachId` on a source link is descriptive only

It records which Approach the Note was written under. It is validated as an
`approach_NN` id or `null`, and it is **never** read to decide status. ADR-003
is untouched: nothing in this contract can grant `achieved` or `mastered`.

## Consequences

- The four `noteSources` fields have one accepted spelling each, enforced in
  code rather than in review.
- Existing `ayahNotes` data and behaviour are untouched and stay untouched.
- The editor surface itself remains deferred (ADR-004 already defers it) and is
  a separately audited task, held behind the Note Foundation Rules deployment.
- The P5-A Rules candidate is **not amended**. Its string constraints are
  deliberately looser than this vocabulary: the server enforces structure, the
  contract enforces meaning. Tightening Rules to a closed word list would make
  every future vocabulary addition a production Rules deployment.

## Rollback

Delete the two modules. Nothing imports them, no document has been written
under this contract, and no existing document changes shape.
