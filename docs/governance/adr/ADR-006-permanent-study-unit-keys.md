# ADR-006 — Preserve Permanent Study Unit Keys

- **Status:** ACCEPTED
- **Date:** 2026-09-10
- **Context:** Claims, Notes, progress, activity, Explore, and future imports depend on stable Study Unit identity.
- **Decision:** Existing permanent Study Unit keys and production identifiers remain unchanged. Labels, placement, and presentation must not be used as identity.
- **Alternatives considered:** rename keys for clarity; generate new keys during feature work; use translated names as keys.
- **Consequences:** any proposed key change is BR-5 and requires explicit Owner authority, migration analysis, compatibility, rollback, and audit.
- **Affected requirements:** MAP §§1,4,5; Baseline §4.
- **Supersession:** none.
