# ADR-007 — Quran Word Identity Methodology v1

- **Status:** ACCEPTED
- **Date:** 2026-09-11
- **Authority:** Owner approval of the Task 33 P2 decision package, amended by Master Architect review
- **Context:** ADR-002 preserves Surface Token, Lemma, Root and Grammatical Family as distinct concepts. The packaged Quran dataset contains 77,429 uniquely addressable word occurrences, while root and lemma coverage are incomplete.
- **Decision:** Adopt `quran-word-occurrence:v1:{surah}:{ayah}:{position}` as the permanent identifier for one occurrence under segmentation contract v1. `v1` identifies the immutable occurrence-segmentation contract, not a mutable build date. The dataset build/source fingerprint is stored separately as provenance.
- **Identity layers:** Occurrence, raw surface token, normalized search form, lemma, root and grammatical family remain separately represented. None may substitute for another.
- **Missing morphology:** An unavailable root or lemma is stored/read as `null`/unknown. It must never be guessed from the surface token or silently inherited from another occurrence.
- **Normalization:** Normalized Arabic is an additive search/index value only. It never participates in occurrence identity and never replaces the source form.
- **Version evolution:** A changed tokenization/segmentation contract requires a new identity-contract version. Existing v1 identifiers and progress remain readable. Cross-version continuity requires an explicit, auditable mapping table; no automatic reinterpretation or backfill is permitted.
- **Dataset authority:** The current v1 data package is authoritative only for the bounded v1 implementation and retains its manifest/source provenance. Rebuilding or replacing it requires deterministic integrity comparison and independent audit before adoption.
- **Consequences:** A pure identity module, deterministic indexes and a persistent word card may now be implemented additively. Phase 3 progress may reference v1 occurrence IDs only after its own bounded storage task is authorised and tested.
- **Rollback:** UI/index modules may be removed without touching existing records. Permanent v1 IDs already written must remain readable and must not be recycled.
- **Supersession:** Supersedes only ADR-002's deferred exact-method prerequisite; ADR-002's identity separation remains fully active.
