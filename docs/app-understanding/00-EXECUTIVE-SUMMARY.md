# 00 — Executive Summary

**QuranRevival v08.02** · read-only architectural analysis · 7 September 2026
Repository: `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`, folder `app/`

> **Version note.** This package documents **v08.02**, the version on `main`
> today (`app/js/version.js` → `APP_VERSION = "08.02"`). The task brief said
> "v08.00 codebase"; `main` had moved two feature rounds ahead (v08.01 and
> v08.02, both 7 Sep 2026, both about making the Approaches editable). Those
> rounds are included here, and they change one significant conclusion — see
> §"What changed in v08.01/v08.02" below.

---

## What QuranRevival is

A **multi-tenant Madrasah (Islamic school) platform**, built as a browser-only
web application. It is not a single-subject app: the Quran is one of **ten
modules**, alongside Deen Study, Arabic, Hadith, General Study, Nature-Life,
Health, Life Skill, Learn Deen On-the-Go and Asma ul Husna.

Its distinguishing idea is that **studying the Quran is not one activity but
thirty**. Rather than tracking "have you read this ayah", the app tracks
**30 named Approaches** — reciting with tajweed, memorising, word-by-word
meaning, listening, reflection (tafakkur), deep contemplation (tadabbur),
teaching others, and so on — each of which can be claimed independently
against any slice of the Quran.

**It is live and in real use**, not a prototype. It has been in production
since the 9 August 2026 cutover, is deployed at
`madrasatul-muslimeen.github.io/app/`, and writes to a real Firestore
database. Two earlier versions are frozen and still reachable
(`/legacy/index.html` = v06.30, `/legacy-v07/` = v07.139).

## Main purpose

To let a household or school **record, confirm and see** progress across every
subject a student studies — with the Quran modelled in far more depth than
anything else — while keeping every claim attributable, reviewable and
permanent.

Three values are visible throughout the code and are enforced as **invariants**:

- **Nothing is ever deleted.** Archive, revoke, return, mark consumed — never
  destroy (invariant I4; there is no delete rule in the security rules at all).
- **Every user-visible name is language-keyed** from the first document written
  (I11). English and Bangla are both first-class, including Bengali digits.
- **A confirmation, once given, is frozen** and never silently recalculated (I6).

## Who the users are

Six roles, held per tenant, and **a person may hold several at once**:

| Role | In one line |
|---|---|
| `owner` | Runs the tenant. Configures everything. Self-confirmed |
| `prime` | Second administrator. Can confirm anyone |
| `teacher` | Confirms progress for students they are actually enrolled to teach |
| `guardian` | Confirms progress for their own children |
| `student` | Studies; their claims need confirmation |
| `self` | An independent adult learner; self-confirmed |

The **owner is a non-coder** and is currently the primary real user. The
project's own standing brief makes this an explicit constraint on how work is
done, and the documented rollout order is: the owner's own use first, then
family, then external students.

## The major educational concepts

```
Module  (10)  ──▶  Subject  (55 nodes, a tree)  ──▶  Trackable  (30 Approaches
                                                       + 9 "Studied"/"Practised")
                                        ×
                            Study Unit  (7 Quran unit types)
                                        ↓
                       one records entry, one status, one confirmation
```

- **Approach** — one of 30 named ways to engage with the Quran, in 7 sections.
  Technically a row in the `trackables` collection with `subjectId: "quran"`.
- **Study Unit** — the slice of the Quran a claim attaches to: Ayah, Range,
  Surah, Ruku', Juz, Hizb or Page. Represented as a single permanent string.
- **Claim** — a student says "I am at status X on this unit, for this Approach".
- **Confirmation** — a teacher/guardian/owner approves, returns, or the claim is
  self-confirmed.
- **Status** — six values: Not Applicable, Not started, Learning, Practising,
  Achieved, Mastered.

## The major functional systems

| System | Where | State |
|---|---|---|
| Identity, tenants, roles, invites | `identity.js`, `people.js`, `invites.js`, `session-context.js` | Built |
| Catalogue (modules, subjects, Approaches) | `catalogue.js`, `catalogue-data.js`, `catalogue.html` | Built; Approaches fully editable since v08.01/02 |
| Tracking core (claims, confirm, return) | `records.js`, `activity.js` | Built |
| Quran study screen | `quranrevival.html` (12,051 lines) | Built — the largest system by far |
| Explore + Mastery Wheel | inside `quranrevival.html`, `mastery-wheel.js` | Built |
| Topic modules (×6) | `topic-study.js` + `topic-renderer.js` | Built |
| Routine modules (×2) | `routine-study.js` | Built |
| Asma ul Husna | `asma-study.js` + 5 supporting modules | Built |
| Bookmarks, Continue strip | `bookmarks.js`, `continue-strip.js` | Built |
| Monitor & reports | `monitor.js`, `monitor.html` | Built, not owner-verified |
| Homework | `homework.js` | Built, not owner-verified |
| Classes, course offers, enrolments | `classes.js`, `course-offers.js` | Built, partly verified |
| Curriculum, grades, resources | `curriculum.js`, `grades.js`, `resources.js` | Built |
| Backup (export to a self-contained HTML file) | `backup.js`, `backup-file.js` | Built |
| Messaging / threads | — | **Deliberately not built** |
| Finance, Operations, medical | — | **Deliberately not built** |

## The overall learning journey

```
Sign in with Google
   ↓
Land on the Quran Study screen (quranrevival.html)
   ↓
Choose a person (a guardian may record for a child)
   ↓
Choose Surah + Ayah, and a Study Unit (ayah / range / surah / ruku' / juz / hizb / page)
   ↓
Mastery Wheel shows all 30 Approaches for THAT unit, coloured by status
   ↓
Tap a wheel slice → the Note view opens on that Approach + unit
   ↓
Read / listen / write / reflect, using whichever panels the Approach declares
   ↓
Claim a status  →  records entry written  →  activity logged
   ↓
Self-confirmed, or waits pending for a teacher/guardian on records.html
   ↓
Explore shows the whole Quran coloured for one Approach at a time
```

## Current maturity

**Production, in real-use iteration.** Phases 0–13 of a 15-phase plan are
built. Roughly **42,000 lines** across 28 HTML pages and 60 ES modules, plus a
31 MB static Quran dataset. There is a **Playwright verification harness**
(`tools/i18n-verify`, ~800 passing checks) and a **load-speed measurement
harness** (`tools/perf`).

Maturity is uneven and honestly recorded in the project's own status files:
identity, catalogue, tracking and the Quran module are heavily exercised;
Monitor, Homework and parts of Classes are built but **not yet owner-verified**.

## The most important architectural strengths

1. **The educational model is data, not code.** The 30 Approaches are Firestore
   rows. Adding, renaming, re-sectioning or reordering one touches no logic —
   and since v08.01/02 the owner can do all of that from the UI.
2. **Nothing anywhere assumes there are 30 Approaches.** Every consumer
   iterates an array; the wheel divides the circle by `items.length`.
3. **A rigorously enforced pure-renderer boundary (I2).** `mastery-wheel.js`,
   `way-modal.js`, `ayah-renderer.js`, `topic-renderer.js` and `asma-renderer.js`
   never import Firebase. `labels.js` exists solely so a pure renderer can print
   a label without pulling in Firestore.
4. **One write path for progress.** Every claim in the entire application goes
   through `claimStatus()` in `records.js`. Nine call sites, one function.
5. **No delete path anywhere**, enforced in both the client and the rules.
6. **A hard load-speed contract**, measured rather than asserted — three
   Firestore reads after first paint, and lazy-loading used deliberately
   throughout to honour it.
7. **Genuine bilingualism.** Not a bolt-on: language-keyed names from the first
   document, Bengali digits, and a coverage tool that lists untranslated strings.
8. **Unusually honest self-documentation.** The code comments record *why*
   decisions were made, including reversed ones. This is the single biggest
   accelerator for a new architect.

## The most important architectural risks and limitations

1. **`app/quranrevival.html` is 12,051 lines** — the Quran screen, the Note
   view, the Mastery Wheel and the whole of Explore in one inline
   `<script type="module">`. No build step, no module boundaries within it, and
   most UI work must land there.
2. **Teacher approval gates nothing visual.** Every wheel and every Explore
   colour reads `claimedStatus`, the student's own unverified claim.
   `confirmedStatus` appears only in the Records table. A *returned* claim still
   shows green on the wheel.
3. **The security rules do not distinguish claiming from confirming.**
   `canRecordFor()` is the same gate for both; the separation is client-side
   JavaScript only.
4. **Teacher scope is by student, not by subject.** A co-enrolled teacher gets
   authority over that student across every subject. This is a known, documented
   open gap.
5. **Two aggregation rules that deliberately disagree.** The landing wheel shows
   a unit's own direct claim with no roll-up; Explore pools (floor downward,
   weakest-link upward). Both are correct for their own screen, and the
   difference surprises people.
6. **Explore costs up to 115 Firestore document reads per open.**
7. **No Cloud Functions at all.** Every calculation runs in the browser. There
   is nowhere to put a server-side aggregation.
8. **Firestore's 1 MiB document limit is a live constraint** for any future
   fine-grained progress: one records entry is ~359 bytes, so a chunk saturates
   around 2,900 entries.
9. **"Derivatives" is a misleading name.** The panel shows part-of-speech and
   lemma for the *same* word. It does not show derivatives.
10. **Words are not clickable.** The word-by-word data is rendered as read-only
    strips; there is no word-level interaction or word identifier anywhere.

## What changed in v08.01 / v08.02 (and what it overturns)

Two rounds landed on 7 September 2026, both about the Approaches:

- **v08.01 — the 30 Approaches made fully editable.** The owner can now edit
  both language names, the section, the position, and the Guide's
  What/How/Measure, and can **Remove** an Approach (which archives it, keeping
  its claims readable). Position ordering is scoped to the Quran set only.
- **v08.02 — the 7 sections made the tenant's own.** Section names are now
  editable and stored as an additive `approachSections` field on the tenant
  document. The Catalogue table is grouped by section, and the Mastery Wheel's
  sidebar names its sections.

**This overturns a finding in the architecture review package produced
yesterday** (`docs/external-architecture-review/`), which stated there was no
Approach-editing UI beyond a rename prompt. That was true at v08.00 and is no
longer true. **What is still true: there is no "Add a 31st Approach" button** —
v08.01 explicitly left that unbuilt.
