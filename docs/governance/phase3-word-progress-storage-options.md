# Phase 3 — word-progress storage decision package (proposal)

**Date:** 2026-09-12. **Status:** Gate A/B proposal; no progress writer, Rules, index, migration, or live data change is authorised by this document.

## Invariants

- Key progress by tenant, person and permanent `quran-word-occurrence:v1:{surah}:{ayah}:{position}` identity. Preserve dataset provenance separately. A v2 segmentation cannot reinterpret a v1 record.
- Keep self learning, managed-student claim and teacher confirmation separate; a click or Activity event never implies Mastery or teacher approval. Retain confirmation history rather than overwriting it.
- Derive coverage from explicitly defined denominators and stored states; do not persist an unchecked percentage. A source dataset mismatch is unknown, not zero progress.
- Keep all new data additive and feature gated. Existing Approach claims, weekly Activity, Study Units and Note documents retain their contracts.

## Storage comparison

| Option | Upper bound for 77,429 occurrence states/person | Typical operation and tradeoff |
|---|---:|---|
| One document per occurrence | 77,429 documents | One read and one write per changed token; direct ownership and field-diff Rules, but full coverage needs many reads and indexes; confirmation history needs bounded companion records. Sparse progress avoids creating untouched documents. |
| One document per surah | 114 documents | One write per changed word, potentially one read per surah; large surahs can exceed the document limit, concurrent edits contend, and a whole-document update grows with coverage. Reject. |
| One document per ayah, keyed by permanent position | Up to number of ayahs with progress (6,236) | One bounded ayah read/write for a changed word; whole-surah coverage reads its ayah documents, optionally batched. A single ayah can still have many tokens, so measured encoded-size and contention tests are required. |
| Fixed occurrence chunks (e.g. 64 positions in canonical dataset order) | Up to 1,210 documents | Bounded read/write per chunk and predictable size; harder Rules validation of encoded membership and versioned mapping, plus cross-ayah coverage fanout. |

**Proposed bounded choice:** one sparse document per progressed occurrence, with append-only confirmation evidence in a separate collection. Its path and immutable fields bind tenant, person and v1 coordinate; Rules can restrict changed fields and actor roles on one occurrence. Query the changed records for a bounded ayah or surah when rendering coverage, never all 77,429 at startup. Confirmation requires teacher-role, actual teacher-to-student relationship and tenant checks in Rules, and a unique event key. The write path must remain compatible with a later read-model optimization without changing permanent occurrence identity. No authority can be inferred from client fields alone.

**Measured dataset, 2026-09-12:** the package manifest and a full traversal agree on 114 surahs, 6,236 ayahs and 77,429 occurrences. The largest ayah is 2:282 with 128 words. A hypothetical fully populated per-ayah state map for it serializes to 14,338 JSON bytes with 64-character tenant/person identifiers and four simple state fields; this is **not** Firestore encoded size, a billing measurement, or a Rules proof. Sixty-four-occurrence chunks would need at most 1,210 populated documents. The current Rules already use fixed-path membership and `teacherStudentLinks`; they do not contain a word-progress permission boundary. A mutable positions map would require proving every changed nested entry is authorised, so the smaller ayah document count alone does not justify choosing it.

## Gate before implementation

Specify and verify exact Rules for self and managed-student mutations, teacher confirmation and immutable identity; model query fanout for full surah/Explore coverage and measured Firestore encoded sizes rather than the JSON proxy. Test concurrent updates, rollback, invalid coordinates, cross-tenant/role denial and size ceiling in the exact emulator. Document composite indexes and backup/restore format. If Rules cannot distinguish self-state from teacher-state writes, separate them into role-specific documents before enabling a writer. Owner approval of this storage architecture is required by MAP v4 §22 before Phase 3 progress UI coding; this proposal does not claim that approval.
