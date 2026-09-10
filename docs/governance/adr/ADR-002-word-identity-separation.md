# ADR-002 — Preserve Quran Word Identity Layers

- **Status:** ACCEPTED
- **Date:** 2026-09-10
- **Context:** Word Study, occurrence search, derivatives, progress, and dictionary links require identities that must not be collapsed.
- **Decision:** **Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family.** Implementations must model and link these as distinct concepts.
- **Alternatives considered:** root-only identity; displayed-token-only identity; one generic “word” identifier.
- **Consequences:** an authoritative linguistic dataset and identity methodology must be approved before permanent implementation. Existing progress/data must not be reinterpreted silently.
- **Affected requirements:** MAP §§1,3,20 Phase 2,22.
- **Supersession:** none. Exact dataset/method remains deferred until its prerequisite decision.
