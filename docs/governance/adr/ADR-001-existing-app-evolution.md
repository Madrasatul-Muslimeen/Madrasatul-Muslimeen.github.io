# ADR-001 — Evolve the Existing Application

- **Status:** ACCEPTED
- **Date:** 2026-09-10
- **Context:** QuranRevival v08.02 is a substantial live application with protected data, behavior, identifiers, and legacy compatibility.
- **Decision:** Extend the existing application through **PRESERVE → RECONCILE → EXTEND**. Do not rebuild from zero or replace working architecture without explicit Owner authority.
- **Alternatives considered:** clean rebuild; framework replacement; broad restructure.
- **Consequences:** every feature begins with current-state inspection and compatibility analysis; existing reality is preserved even when documentation drifts.
- **Affected requirements:** MAP §§1,4,5,10,20,26; Baseline §§3–4,10–14.
- **Supersession:** none. Owner decision may supersede.
