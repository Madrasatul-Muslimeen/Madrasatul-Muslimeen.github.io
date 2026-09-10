# QuranRevival Active Architecture Definition

**Status:** ACTIVE  
**Date:** 2026-09-10

## Product boundary

QuranRevival evolves from the existing v08.02 application inside the live multi-tenant Madrasah platform. It is not rebuilt from zero. The active application is `/app/`; `legacy/` and `legacy-v07/` are protected historical applications/evidence.

## Primary structure

**APPROACH | STUDY | EXPLORE | MAPPING MY JOURNEY**

- The 30 Approaches remain central and independently trackable.
- Approach-first and natural Study-first entry remain possible.
- READ and NOTE evolve into the unified user-facing STUDY concept without crude forced code merging.
- Explore is quantitative; Mapping My Journey is qualitative.
- Mapping My Journey is the Master Notebook, placed after Explore and primarily worked from inside Study.

## Locked distinctions

- Approach ≠ Study ≠ Explore ≠ Mapping My Journey.
- Mapping My Journey ≠ a separate Notebook subsystem.
- Note Origin ≠ Note Destination.
- Reflection Archive ≠ Personal Journey Map.
- Dawah ≠ Share; Share is within Dawah.
- Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family.
- Activity ≠ Mastery.
- WbW Approved/toggle state ≠ a generic Approach claim.

## Protected systems

Authentication, tenancy, membership/roles, Firestore architecture/Rules, production identifiers, permanent Study Unit keys, live records, legacy architecture, claims/approvals, wheels, language-keyed names, shared services, and frozen confirmations are protected. BR-4/BR-5 changes require explicit Owner authority.

## Data safety

Preserve identifiers and records. Prefer additive structures and compatibility. No automatic backfill or destructive migration. Every data change requires compatibility, rollback, affected-user, security, and migration analysis.

## Current hard gate

Firestore production-versus-repository Rules parity is **VERIFIED** (2026-09-10). The authoritative production Rules and repository Rules are content-identical; the repository copy has one additional terminal newline. This verification does not authorise any Rules modification, implementation proposal, or deployment. Each remains an Owner Control Gate requiring explicit authority.
