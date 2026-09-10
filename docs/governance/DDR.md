# QuranRevival Deferred Decision Register

**Status:** ACTIVE REGISTER — ALL ENTRIES INACTIVE/DEFERRED  
**Date:** 2026-09-10

Recording an item does not reactivate it. Deferred means STOP/ASK.

## DDR-001 — Progress Model for Non-Quran Subjects

- **Status:** INACTIVE / DEFERRED
- **Why deferred:** no accepted universal definition of progress/mastery exists for Deen Study, Arabic, General Study, Hadith, Nature-Life, and Health.
- **When needed:** before implementation that requires non-Quran claims/mastery semantics.
- **Phases affected:** later non-Quran module sequencing; not Quran-only work that does not depend on it.
- **Decision owner:** Owner/Master Architect.
- **Temporary boundary:** do not infer a model from Quran Approaches; preserve existing activity behavior.

## DDR-002 — Subject-Scoped Teacher Authority

- **Status:** INACTIVE / DEFERRED
- **Why deferred:** current authority is student-scoped but complete subject-scoped recording/confirmation behavior is unresolved.
- **When needed:** before changing teacher permissions or claiming subject-level enforcement.
- **Phases affected:** role/security work involving teacher recording.
- **Decision owner:** Owner/Master Architect.
- **Temporary boundary:** preserve current behavior; do not broaden or narrow authority. BR-4 and Firestore hard-lock rules apply.

## DDR-003 — Translator Selection and Packaged Datasets

- **Status:** INACTIVE / DEFERRED
- **Why deferred:** the product choice and authoritative packaged translation datasets are not approved.
- **When needed:** before enabling translator selection or repackaging Quran translation data.
- **Phases affected:** Study translation-selection feature.
- **Decision owner:** Owner/Master Architect.
- **Temporary boundary:** keep current packaged translations and disabled selector behavior; do not infer preferred translators.

## DDR-004 — Any Change to the Locked 30 Approaches

- **Status:** INACTIVE / DEFERRED
- **Why deferred:** MAP v4 locks 30 Approaches; a possible 31st was considered but never approved or built.
- **When needed:** only if the Owner explicitly reopens the Approach count.
- **Phases affected:** Approach catalogue, progress, wheel, Explore, and migration planning.
- **Decision owner:** Owner.
- **Temporary boundary:** retain exactly 30 Approaches; do not add, remove, or reinterpret one.

## Corrected non-DDR items

- Mastery Wheel selected-unit support is implemented and is not deferred.
- Remaining interface localization is supporting backlog/partial implementation, not a deferred architecture decision by itself.
