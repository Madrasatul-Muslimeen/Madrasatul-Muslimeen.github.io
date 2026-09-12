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
| One document per occurrence | 77,429 documents | One read and one write per changed token; direct ownership Rules, but whole-surah coverage needs many reads and indexes; confirmation history needs bounded companion records. |
| One document per surah | 114 documents | One write per changed word, potentially one read per surah; large surahs can exceed the document limit, concurrent edits contend, and a whole-document update grows with coverage. Reject. |
| One document per ayah, keyed by permanent position | Up to number of ayahs with progress (6,236) | One bounded ayah read/write for a changed word; whole-surah coverage reads its ayah documents, optionally batched. A single ayah can still have many tokens, so measured encoded-size and contention tests are required. |
| Fixed occurrence chunks (e.g. 64 positions in canonical dataset order) | Up to 1,210 documents | Bounded read/write per chunk and predictable size; harder Rules validation of encoded membership and versioned mapping, plus cross-ayah coverage fanout. |

**Proposed bounded choice:** per-ayah documents for current state, with append-only bounded confirmation evidence in a separate collection. The immutable document key includes tenant/person/v1/surah/ayah; position maps contain only validated positions from that ayah. A transaction reads the one ayah document and writes the changed position with a precondition; it must enforce an encoded-size ceiling and reject overflow. Confirmations require teacher-role, child-to-teacher relationship and tenant checks in Rules, and a unique confirmation event key. No authority can be inferred from client fields alone.

## Gate before implementation

Measure the largest actual ayah payload with the proposed state schema, estimate full-coverage reads and writes under self and teacher workloads, and test concurrent updates, rollback, invalid coordinates, cross-tenant/role denial and size ceiling in the exact emulator. If the measured ayah record is too large or Rules cannot validate position membership, switch to bounded chunks and repeat the comparison before activating any writer. Review required composite indexes and backup/restore format. Owner approval of this storage architecture is required by MAP v4 §22 before Phase 3 progress UI coding; this proposal does not claim that approval.
