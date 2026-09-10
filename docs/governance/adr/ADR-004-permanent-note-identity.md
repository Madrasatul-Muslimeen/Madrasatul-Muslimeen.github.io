# ADR-004 — Permanent Note Identity and Relational Placement

- **Status:** ACCEPTED
- **Date:** 2026-09-10
- **Context:** Existing Ayah Notes are Study-Unit-keyed, while future Mapping My Journey requires durable Notes that may be organized without changing identity.
- **Decision:** A Note receives permanent identity. Origin/reference and folder placement are relationships and metadata, not Note identity. Moving a Note never changes its identity.
- **Alternatives considered:** make Study Unit key the Note ID; make folder path the Note ID; duplicate a Note when moved.
- **Consequences:** Note Foundation precedes Mapping My Journey. Migration/import must preserve provenance, multiple notes per source, and compatibility.
- **Affected requirements:** MAP §§1,3,20 Phases 5–6,22.
- **Supersession:** none. Exact Note schema/editor remain deferred.
