# QuranRevival v08.02 — CORE Application Understanding (condensed)

**This is the SHORT version**, for a reviewer with a limited context window.
It contains 6 of the package's 21 documents — the ones that carry the model,
the vocabulary and the constraints. The full package is
`QuranRevival_v08.02_COMPLETE_for_AI_reviewer.md`.

Included here: FINAL Summary · 00 Executive Summary · 01 Concepts ·
04 Educational Architecture · 07 Progress and Tracking · 13 Codebase Map ·
17 Integration Entry Points.

**Omitted here** (in the full file): 02 roles in depth, 03 the 15 user journeys,
05 all 30 Approaches individually, 06 study units in depth, 08 Explore/wheel in
depth, 09 Quran data, 10 word-by-word, 11 database schemas, 12 technical stack,
14 services, 15 feature inventory, 16 risks, 18 dependency map.

---

## To the reviewing AI

Every statement was produced by direct code inspection; file paths and line
numbers were mechanically verified against the real files. Where something could
not be established from the code it says **"Could not confirm from code"** —
please treat those as genuine unknowns.

**This codebase uses ordinary words in specific ways** — "Approach",
"Trackable", "Study Unit", "Derivatives", "Levels". Read the Concepts document
before reasoning about anything technical.

---



═══════════════════════════════════════════════════════════════════════════
FILE: FINAL-ARCHITECTURE-SUMMARY.md
═══════════════════════════════════════════════════════════════════════════

# FINAL — Architecture Summary

**QuranRevival v08.02** · the whole application, condensed
7 September 2026

Written so that a senior architect reading this one document, and selectively
opening the detailed ones, can understand the application accurately without
reading its ~42,000 lines of source.

---

## 1. What QuranRevival is

A **multi-tenant Madrasah platform**: a browser-only application on Firebase
Auth + Firestore, deployed as static files on GitHub Pages. **In production
since 9 August 2026.**

Ten modules — the Quran plus Deen Study, Arabic, Hadith, General Study,
Nature-Life, Health, Life Skill, Learn Deen On-the-Go and Asma ul Husna.

**Its distinguishing idea: studying the Quran is not one activity but thirty.**
Rather than "have you read this ayah", it tracks **30 named Approaches** —
tajweed recitation, memorisation, word-by-word meaning, listening, reflection
(tafakkur), contemplation (tadabbur), teaching others — each claimable
independently against any slice of the Quran.

Three values are enforced as invariants: **nothing is ever deleted** (I4),
**every user-visible name is language-keyed** in English and Bangla (I11), and
**a confirmation once given is frozen** (I6).

## 2. How a student uses it

```
Sign in with Google → land on the Quran Study screen
   → choose a person (a guardian may record for a child)
   → choose Surah + Ayah, and a Study Unit (ayah / range / surah / ruku' / juz / hizb / page)
   → the Mastery Wheel shows all 30 Approaches for THAT unit, coloured by status
   → tap a slice → the Note view opens on that Approach × that unit
   → read / listen / write / reflect, using the panels that Approach declares
   → pick a status, press Claim
   → a records entry is written; activity is logged
   → self-confirmed, or waits pending for a teacher/guardian on records.html
   → Explore colours the whole Quran for one Approach at a time
```

## 3. How educational content is organised

```
MODULE (10)  →  SUBJECT (55 nodes, a tree)  →  TRACKABLE (30 Approaches + 9)
                                    ×
                        STUDY UNIT (7 Quran types, a STRING)
                                    ↓
                      one records entry · one status · one confirmation
```

**A Trackable and a Study Unit are two independent coordinates**, multiplied at
claim time into one map key — a free cross-product created lazily, never a fixed
curriculum lattice.

**The structural asymmetry that explains everything else:**

| | Quran | Every other module |
|---|---|---|
| Subject tree | **one leaf** (`quran`) | real, several levels deep |
| Trackables | **30** Approaches | **1** ("Studied" / "Practised") |
| Depth lives in | the **Approaches** | the **subject tree** |

The Quran module uses none of the tree machinery; the topic modules use almost
nothing else. Everything hard about the Quran exists because its depth is in the
Approaches instead.

## 4. How the 30 Approaches work

**An Approach is a document in the `trackables` collection with
`subjectId: "quran"`.** There is no Approach type. One line defines the concept
at runtime:

```js
quranTrackables = allTrackables.filter((t) => t.subjectId === "quran" && t.status !== "archived");
```

`APPROACH_TEMPLATES` in `app/js/catalogue-data.js` is **only the seed**, copied
into each tenant's Firestore rows by an explicit admin action.

Each carries: `name{en,bn}`, `guide{what,how,measure}`, `panels[]`,
`group`/`groupName` (one of 7 sections), `order`, `status`, `sourceTemplateId`,
`edited`.

**Seven sections encode a real pedagogical arc** — tools → attachment →
observation → reasoning → depth → judgement → action, ending in "Teaching
Others". **But the code enforces none of it**: `group` is display-only, and
there are no prerequisites or gating anywhere. Any Approach is claimable at any
time in any order.

**Nothing assumes 30.** Every consumer iterates an array; the wheel divides the
circle by `items.length`. The only "30" in code is the caption *"Approach the
Quran in 30 ways"*.

**Since v08.01/v08.02 the owner can edit everything a reader sees** — both
language names, the section, the position, all three Guide texts — and can
**Remove** an Approach (which archives it, keeping its claims readable).
**There is still no way to create a 31st**, deliberately left unbuilt.

## 5. How study units work

**A unit is a single namespaced permanent string.** No units table, no
documents — *the string is the unit* (invariant I5).

`ayah:2:255` · `range:2:1-5` · `surah:1` · `ruku:2:1` · `juz:30` · `hizb:60` ·
`page:qpc-hafs:604`

Twelve types are declared; **seven are offered for the Quran**; `rub` and
`manzil` exist as constructors with no picker and no index; **there is no
whole-Quran unit** — "Whole Quran" is a computed view only.

Boundaries come from small generated index files (30 juz, 60 hizb, 604 pages,
114 surahs), all computed from real per-ayah data rather than hand-typed.
**`ayahCoverage()` is the single containment primitive in the whole
application.**

**Chunking decides which document a claim lands in:** `ayah`/`range`/`surah`/
`ruku` → `surah_{n}`; `juz`/`hizb`/`page` → **`subject_quran`**, a different
document, fetched lazily on first use.

## 6. How progress works

**Six statuses**, five on a ramp plus one exclusion:

```
not_applicable (OFF the ramp, I7) · not_started · learning · practising · achieved · mastered
```

Note the **British spelling `practising`** in the stored id, and that
**no semantic criteria for the four active levels exist anywhere** — the
transition is a free choice from a `<select>`.

**A status belongs to a `(person, unit, Approach)` triple** and is stored as one
entry in a map:

```
records/{tenantId}__{personId}__{chunkKey}
  entries { "ayah:2:255::approach_04": { claimedStatus, confirmState, confirmedStatus, … } }
```

**Only claims are stored. Every roll-up is recomputed on every render** — there
is no summary document, no aggregate counter, no cache and no Cloud Function.

**Roll-up rule:**
```
MAX downward  (a wide claim is a FLOOR under every ayah it covers)
MIN upward    (a wide unit takes its WEAKEST ayah)
not_applicable excluded from both (I7)
— and the landing wheel does NEITHER: direct claim only
```

**Percentages barely exist**, and none drives a colour.

## 7. How claims and approval work

**One write path for the entire application:** `claimStatus()` in
`app/js/records.js`, with **nine call sites** and **nine Firestore reads before
each write**.

**Whether approval is needed is computed, never configured per person** —
owner/prime/teacher/guardian self-confirm; students and guardian-managed
children wait. The only knob is a per-**subject** `confirmationRequired`
override.

Three states — `pending`, `confirmed`, `returned` — plus a **frozen**
`confirmedStatus` (I6). `app/records.html` is the **only** confirm/return UI,
with four bulk scopes (chunk, week, person, class).

> **The single most important finding in this package: approval gates nothing
> visual.** Every wheel and every Explore colour reads `claimedStatus`.
> `confirmedStatus` appears only in the Records table. **A *returned* claim
> still shows green on the Mastery Wheel.**

And the security rules **do not distinguish claiming from confirming** —
`canRecordFor()` is the same gate for both. That separation is client-side
JavaScript only.

## 8. How Explore works

A panel inside the Quran screen — **not a separate page or module** — with four
drill levels: **Quran → Juz → Surah → Ruku'**, plus view toggles (Juz↔Surah,
Pages↔Surahs) that remember per level.

Opening it loads **up to 115 Firestore documents in parallel**, once; every
level then renders from memory.

**It already hosts three entirely different content domains** in the same panel —
Quran, Ayah Collections (QCR), Asma ul Husna — which is the existing proof a new
category can be added.

**Explore contains no percentages at all.** Every segment is a status mapped to
one of six colours.

## 9. How the wheel works

**There are two wheels with opposite axes**, drawn by the same function. This is
the easiest mistake to make in this codebase.

| | Landing Mastery Wheel | Explore wheel |
|---|---|---|
| One segment per | **Approach** | **Quran unit** |
| Fixed | the current unit | the selected Approach |
| Aggregation | **none** | pooling, both directions |
| Reads | 1 chunk | ≤115 per open |

`renderScopedWheel()` is a **pure renderer** — it never imports Firebase, takes
an array of `{key, statusId, title, number}`, and divides the circle by
`items.length`. It is already called with 30, 114, 99 and 1–286 items.

Six fills, no seventh. `mastered` is a **different hue** (not a darker blue) so
Achieved and Mastered stay distinguishable on a thin segment;
`not_applicable` is an **SVG hatch pattern**, not a colour.

## 10. How Quran data works

**31 MB of static JSON served over HTTP — never Firestore.** One file per surah,
plus four boundary indexes and three search indexes. `app/js/quran-data.js` is
the only reader, and every loader is promise-cached and lazy except the surah
index.

**Measured totals:** 114 surahs · **6,236 ayahs** · **77,429 word occurrences** ·
21,287 unique surface forms (NFC) · **4,832 lemmas** (95.7% coverage) ·
**1,642 roots** (64.5%).

Sources: alquran.cloud (text, translations, metadata), api.quran.com v4
(word-by-word), **Quranic Arabic Corpus 2011** (root, lemma, POS).

**Four data facts that matter:**
- **There is no word identifier.** `position` is unique within an ayah only.
- **No word-level index exists.** `roots-index.json` is referenced in a comment and **is not in the repository**.
- **The English word gloss is contextual, not lexical** — 73.8% of occurrences have a form glossed more than one way (مِن alone has 72). It cannot serve as identity.
- **Level-3 grammar data was in the source and discarded** — 128,011 corpus rows reduced to root/lemma/POS at pull time.

**The word-by-word system is read-only display.** Three per-ayah panels; **no
word click anywhere in the application**. And the panel called **"Derivatives"
shows no derivatives** — it shows POS and lemma for the same word.

## 11. How user roles work

Six roles — `owner`, `prime`, `teacher`, `guardian`, `student`, `self` — each
held as **the existence of a document** at
`memberships/{tenantId}__{personId}__{role}`, plus `platformAdmin` (not a
membership, cannot be self-granted).

**A person may hold several roles at once**, and permissions are the **union**
across them — with one exception: `computeConfirmationRequired()` is an
**ordered cascade** that stops at the first match, so **any administrative or
teaching role silently exempts a person from needing approval even if they also
hold `student`.**

Three identities must not be conflated: `uid` (a Google login), `personId` (the
subject of records — a child may have **no login at all**), and `tenantId`.

**Authorisation is `firestore.rules` (1,122 lines).** Client-side gating is
presentation only. The rules **cannot run queries**, which is why two
collections — `tenantMemberUids` and `teacherStudentLinks` — exist purely to
serve them.

**Teacher scope is by student, not by subject** — a known, documented gap.

## 12. The most important technical architecture

| | |
|---|---|
| Framework | **none** |
| Build step | **none** — no bundler, no TypeScript, **no `package.json` anywhere** |
| Firebase SDK | modular v10.12.2, **imported straight from the CDN** |
| Backend | **Firestore only. No Cloud Functions, no Storage** |
| Routing | **none** — 28 separate HTML pages, each bootstrapping itself |
| State | `let` + localStorage + Firestore's offline cache. **No store library** |
| Hosting | GitHub Pages |
| Size | ~42,300 lines: 28 pages (22,207) + 60 modules (17,539) + 3 i18n files (2,582) |

**The strongest architectural rule is the pure-renderer boundary (I2):**
`mastery-wheel.js`, `way-modal.js`, `ayah-renderer.js`, `topic-renderer.js`,
`asma-renderer.js` and `nav.js` **never import Firebase**. `labels.js` exists
solely so they can print a label without pulling in Firestore.

**The best structural pattern:** six study pages are ~149-line shells whose
entire logic is `initTopicStudyPage({ moduleId, trackableId, rootSubjectId })`.

**A hard, measured load-speed contract** governs startup — three Firestore reads
after first paint — and several features are lazy specifically to honour it.

## 13. The most important current limitations

1. **`app/quranrevival.html` is 12,051 lines** — the Quran screen, Note view, both wheels and all of Explore in one inline script. 28% of the app. No build step, no module boundaries, most UI work lands there.
2. **Approval affects nothing visual.** A returned claim still shows green.
3. **The rules do not separate claiming from confirming.**
4. **Teacher scope is by student, not by subject.**
5. **Two aggregation rules deliberately disagree** — a Juz whose ayahs are all mastered reads `not_started` on the landing wheel and green in Explore.
6. **Explore costs ≤115 document reads per open**; a claim costs 9 reads, times the number of assignees.
7. **No Cloud Functions** — every calculation is client-side, and there is nowhere to put server-side logic.
8. **Firestore's 1 MiB document limit** — one entry is ~359 bytes, so a chunk saturates near 2,900 entries. Fine today; a hard ceiling for finer-grained progress.
9. **No word identity, no word index, no word click** — the word-by-word data is rich and inert.
10. **Non-Quran subjects have no progress model** — one "Studied" trackable each versus the Quran's 30. **The app's biggest open educational question**, recorded as needing a design conversation.
11. **Misleading names**: "Derivatives" (POS + lemma), `arabic-study.html` (not word study), `SURAH_WHEEL_THRESHOLD = 30` (an ayah count), `rootCount` (a merged count), `ladders`/`levels` (grades, not study levels).
12. **`rub`/`manzil` are declared and unreachable**; `roots-index.json` is referenced and absent; `threads`/`messages` are reserved names with no code at all.

---

## What is unusually good about this codebase

Stated because it is the main reason a new architect can move quickly here:

- **The educational model is data, not code.** A new Approach is a row.
- **One write path for all progress**, with invariants enforced at it.
- **A rigorously kept pure-renderer boundary.**
- **Genuine bilingualism**, down to Bengali digits.
- **Measured, not assumed** — a load-speed harness, a layout harness measuring 8 viewports in 2 languages, and ~800 behaviour checks.
- **Unusually honest self-documentation.** The comments record *why*, including reversed decisions and defects found by looking rather than by testing. For an incoming architect — human or AI — that is worth more than any diagram in this package.



═══════════════════════════════════════════════════════════════════════════
FILE: 00-EXECUTIVE-SUMMARY.md
═══════════════════════════════════════════════════════════════════════════

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



═══════════════════════════════════════════════════════════════════════════
FILE: 01-APP-VISION-AND-CONCEPTS.md
═══════════════════════════════════════════════════════════════════════════

# 01 — Application Vision and Concepts

Every concept below is defined **from the code**, not from the name. Where the
code's meaning differs from the everyday meaning of the word, that is stated.

---

## Concept map

```
        Tenant  ─────────────────────────────────┐
          │                                       │ approachSections (v08.02)
          ├── Person ── Membership(role) ─────────┘
          │      │
          │      └── Records chunk ── entries{ "unitKey::trackableId" → status }
          │                                │              │
          ├── Module (10)                  │              │
          │      └── Subject (55, a tree)  │              │
          │              └── Trackable ────┼──────────────┘
          │                  (30 Approaches + 9 Studied/Practised)
          │                                │
          └── Study Unit (a STRING, no collection) ─┘
```

---

## 1. Quran study

**Definition.** The `quranrevival` module: a dedicated study screen for the
Quran, driven by the 30 Approaches, and the only module with a real
per-unit content renderer.

**Purpose.** To let the same passage be studied thirty different ways, each
tracked separately.

**Where it appears.** `app/quranrevival.html` — the app's landing page and its
largest file (12,051 lines). Nav label "Quran Study" under **Modules**.

**Data structures.** Static Quran JSON (`tools/quran-data-pull/output/`, 31 MB);
`records` for progress; `trackables` for the Approaches.

**Code files.** `app/quranrevival.html`, `app/js/ayah-renderer.js`,
`app/js/quran-data.js`, `app/js/mastery-wheel.js`, `app/js/way-modal.js`,
`app/js/hifz-renderer.js`, `app/js/audio-player.js`,
`app/js/ayah-note-renderer.js`.

**Relationships.** The **Quran** is the *subject*; **QuranRevival** is the
*module*. The project's terminology rules are explicit that these are never
interchanged, and likewise that it is "30 Approaches", never "30 Ways", and
"Deen Study", never "Islamic Studies".

---

## 2. Approach

**Definition.** *In the code, an Approach is a document in the `trackables`
collection whose `subjectId` is `"quran"` and whose `status` is not
`"archived"`.* There is no `Approach` type, class or table.

The single line that defines the concept at runtime
(`app/quranrevival.html:5481`):

```js
quranTrackables = allTrackables.filter((t) => t.subjectId === "quran" && t.status !== "archived");
```

**Purpose.** To name a distinct *way of engaging* with the Quran, so progress
can be recorded per method rather than per passage alone. There are **30**, in
**7 sections**, echoing the 30 Juz — a deliberate conceptual symmetry the
project maintains.

**Where it appears.** The Mastery Wheel (one slice each) and its sidebar; the
Approach picker in Study options; the Note view's Track/Guide/Breakdown/Coverage
card; Explore's Approach list; the Catalogue admin table; Records; Monitor;
Backup.

**Data structure** (`trackables/{tenantId}__{trackableId}`):

```json
{ "tenantId": "t1", "moduleId": "quranrevival", "subjectId": "quran",
  "group": 1, "groupName": { "en": "Building Foundation / Learning Tools", "bn": "…" },
  "name": { "en": "Reading — Word-by-Word Meaning", "bn": "শব্দে শব্দে অর্থসহ পাঠ" },
  "guide": { "what": {"en":"…"}, "how": {"en":"…"}, "measure": {"en":"…"} },
  "panels": ["text", "wordByWord"],
  "order": 4, "status": "active",
  "sourceTemplateId": "approach_04", "edited": false }
```

**Code files.** `app/js/catalogue-data.js` (`APPROACH_TEMPLATES`, the seed),
`app/js/catalogue.js` (`getTrackables`, `reorderTrackables`,
`saveApproachSections`, `setTrackableStatus`), `app/catalogue.html` (the editor).

**Relationships.** An Approach is one half of every records entry key; the Study
Unit is the other. It carries no unit information itself — the pairing is a free
cross-product created lazily at claim time.

**Editability (v08.01/v08.02).** Both names, the section, the position, and all
three Guide texts are editable from `app/catalogue.html`, and an Approach can be
**Removed** — which sets `status: "archived"`, keeping its existing claims
readable. **There is no way to create a 31st Approach from the UI**; that was
deliberately left unbuilt.

---

## 3. Study Unit

**Definition.** The slice of the Quran a claim attaches to, represented as a
**single namespaced permanent string** — a *unit key*. There is no units table
and no unit documents; **the string is the unit**.

`app/js/unit-keys.js:19`:

```js
export const buildUnitKey = Object.freeze({
  ayah:  (surah, ayah)     => `ayah:${surah}:${ayah}`,
  range: (surah, from, to) => `range:${surah}:${from}-${to}`,
  surah: (surah)           => `surah:${surah}`,
  page:  (edition, pageNum)=> `page:${edition}:${pageNum}`,
  ruku:  (surah, ruku)     => `ruku:${surah}:${ruku}`,
  juz:   (juz)             => `juz:${juz}`,
  hizb:  (hizb)            => `hizb:${hizb}`,
  rub, manzil, hadith, topic, name  /* … 12 in total */
});
```

**Purpose.** To let the same Approach be claimed at whatever granularity suits
the learner — one ayah, a range, a whole surah, a ruku', a juz, a hizb, a mushaf
page.

**Twelve types are declared; seven are offered for the Quran.** `rub` and
`manzil` have key constructors but **no picker option and no boundary index** —
declared and unreachable. `hadith`, `topic` and `name` belong to other modules.
**There is no whole-Quran unit key** — "Whole Quran" is a computed view only.

**Code files.** `app/js/unit-keys.js`; `currentUnitInfo()` in
`app/quranrevival.html:4806`; boundary indexes via `app/js/quran-data.js`.

Full detail in **06-STUDY-UNITS.md**.

---

## 4. Explore

**Definition.** A panel inside the Quran study screen that colours the **whole
Quran** for **one Approach at a time**, and lets the reader drill
Quran → Juz → Surah → Ruku'.

**Purpose.** To answer "where am I, across the whole Quran, on this one
Approach?" — the complement of the landing wheel, which answers "where am I on
this one unit, across all 30 Approaches?"

**Where it appears.** `#explorePanel`, opened by the Explore tab.

**Code.** `openExplore()` `:6094`, `renderExplore()` `:6801`, and the four level
renderers `:6813`–`:7063`, all in `app/quranrevival.html`.

**Relationships.** Explore also hosts two other content domains through the same
panel — Ayah Collections (QCR) and Asma ul Husna — via `setExplorePalette()`.

Full detail in **08-EXPLORE-AND-PROGRESS-WHEEL.md**.

---

## 5. Progress tracking

**Definition.** A status held by a **`(person, unit, Approach)` triple** —
nothing else in the app can hold one.

**Storage.** A map entry inside one Firestore document:

```
records/{tenantId}__{personId}__{chunkKey}
  entries { "ayah:2:255::approach_04": { claimedStatus, confirmState, … } }
```

**Key property: only claims are stored.** Every roll-up, pooled colour,
percentage and report is **recalculated on every render** from claims already in
memory. There is no summary document, no aggregate counter and no cache
anywhere.

Full detail in **07-PROGRESS-AND-TRACKING-SYSTEM.md**.

---

## 6–9. Learning · Practising · Achieved · Mastered

**Definition.** Four of the **six** status values. The full list
(`app/js/unit-keys.js:114`):

```js
export const STATUSES = Object.freeze([
  { id: "not_applicable", label: "Not Applicable", onRamp: false },
  { id: "not_started",    label: "Not started",    onRamp: true },
  { id: "learning",       label: "Learning",       onRamp: true },
  { id: "practising",     label: "Practising",     onRamp: true },
  { id: "achieved",       label: "Achieved",       onRamp: true },
  { id: "mastered",       label: "Mastered",       onRamp: true },
]);
```

**Three things the code says that the names do not:**

1. **The stored id is `practising`** — British spelling. Any new code must match
   exactly.
2. **`not_applicable` is off the ramp.** It is an explicit *exclusion*, not a
   sixth step: invariant I7 requires it to be excluded from totals, never
   counted as zero.
3. **The app defines "progress" narrowly.** `summarizeStatuses()`
   (`unit-keys.js:157`) counts only `achieved` **or** `mastered` in its
   numerator. `learning` and `practising` are in the denominator but not the
   numerator.

**Purpose.** An ordinal ramp — `RAMP_ORDER` in `quranrevival.html` — used for
`min`/`max` comparisons when Explore pools statuses.

**No semantic definition of the four levels exists anywhere in the code.** What
distinguishes "Learning" from "Practising" is left to the learner and to each
Approach's own `guide.measure` text. **Could not confirm from code** that any
enforced criteria exist — there are none; the transition is a free choice from a
`<select>`.

---

## 10. Claim

**Definition.** A person asserting a status for a `(unit, Approach)` pair. The
**only** write path in the application is `claimStatus()`
(`app/js/records.js:154`).

**What a claim actually does**, in order: validates the status; computes the
chunk key; reads the subject's `confirmationRequired` override; computes whether
confirmation is needed (6 role gets + 1 `tenantPeople` get); reads the existing
chunk; writes a dot-path update to one entry; and the caller then logs to
`activity`.

**Cost: 9 Firestore reads before the write.**

**Nine call sites**, found by grep:

| File | Line |
|---|---|
| `app/quranrevival.html` | 10967, 11056, 11948 |
| `app/records.html` | 540 |
| `app/js/topic-study.js` | 512 |
| `app/js/routine-study.js` | 510 |
| `app/js/asma-study.js` | 755 |
| `app/js/self-check.js` | 279 |

**Relationships.** `claimedByPersonId` is separate from the document's
`personId` — a guardian claiming for a child writes the child as `personId` and
themselves as `claimedByPersonId`.

---

## 11. Approval (confirmation)

**Definition.** A teacher/guardian/owner marking a claim confirmed, or returning
it. Three states — `pending`, `confirmed`, `returned` — plus the frozen
`confirmedStatus`.

**Whether approval is needed is COMPUTED, never configured per person**
(`records.js:124`): owners, primes, teachers and guardians self-confirm;
students and guardian-managed children need confirmation. The only configuration
knob is the per-subject `subjects.confirmationRequired` override.

**The finding that most changes what "approval" means here:**

> **Approval gates nothing visual.** Every wheel and every Explore colour reads
> `claimedStatus`. `confirmedStatus` appears only in the Records table. A
> *returned* claim still shows green on the wheel.

**Where it appears.** `app/records.html` is the **only** confirm/return UI.

Full detail in **07-PROGRESS-AND-TRACKING-SYSTEM.md**.

---

## 12–15. Students · Guardians · Teachers · Owners

**Definition.** Roles held per tenant, each as the **existence of a document**
at `memberships/{tenantId}__{personId}__{role}`.

```js
// app/js/records.js:90
const MEMBERSHIP_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];
```

**A person may hold several roles at once** — `roles` is an array, and one
membership document exists per role held. Full analysis in
**02-USER-ROLES-AND-PERMISSIONS.md**.

**One distinction that matters:** `personId` (the subject of a record) and `uid`
(a Google login) are different things, bridged by `tenantPeople/{personId}.authUid`.
A child can exist as a person with **no login at all**.

---

## 16. Subject

**Definition.** A node in a **tree** (`subjects` collection), carrying
`parentId` and a denormalised `ancestorIds[]` for roll-ups (invariant I12).
**55 nodes** in the platform template, across 10 modules.

**The asymmetry worth knowing:** the hierarchy machinery is real and used by
every topic module — but **QuranRevival's entire subject tree is the single leaf
`"quran"`**. All 30 Approaches hang off that one node. So the Quran module uses
none of the tree machinery, and the topic modules use nothing but it.

**Code.** `SUBJECT_TEMPLATES` in `app/js/catalogue-data.js`; `getSubjectTree()`,
`computeAncestorIds()`, `reparentSubject()` in `app/js/catalogue.js`.

---

## 17. Trackable

**Definition.** *The* generic progress-carrying entity. **"Approach" is simply
the word the Quran module uses for a trackable whose `subjectId` is `"quran"`.**

Two distinct populations live in the same collection:

| Population | Count | `subjectId` | `moduleId` |
|---|---|---|---|
| The 30 Approaches | 30 | `"quran"` | `"quranrevival"` |
| Topic/routine trackables | 9 | `null` (module-wide) | one each |

The nine are `studied_deen`, `studied_arabic`, `studied_hadith`,
`studied_general`, `studied_naturelife`, `studied_lifeskill`, `studied_asma`,
`practised_health`, `practised_ldog`.

**This shared collection caused a real, measured hazard in v08.01:**
`getTrackables()` returns *all* of them, and the Catalogue table had listed them
under a heading saying "The 30 Approaches" since Phase 2. Harmless beside rename
and archive; **not** harmless beside a position picker, where renumbering one
flat list would have rewritten the `order` of trackables in modules the owner
was not looking at. Ordering is now scoped to the Quran set, with the rest below
a labelled separator.

---

## 18. Module

**Definition.** A platform-wide top-level area of study. **Ten**, each declaring
a **renderer**:

| Module | Renderer | Study page |
|---|---|---|
| `quranrevival` | `ayah` | `quranrevival.html` |
| `deen`, `arabic`, `hadith`, `general`, `naturelife`, `lifeskill` | `topic` | six thin pages |
| `health`, `ldog` | `routine` | two thin pages |
| `asma` | `asma` | `asma-study.html` |

**The renderer field is the app's main polymorphism.** Six of the ten study
pages are near-identical shells differing only in three arguments:

```js
initTopicStudyPage({ moduleId: "deen", trackableId: "studied_deen", rootSubjectId: "deen_study" });
```

`modules` is **platform-wide, not per-tenant**, and writing it requires
`isPlatformAdmin()` in the security rules.

---

## 19. Tenant

**Definition.** One household, school or provider. The isolation boundary —
invariant I13 requires it to be enforced in the security rules, not only in
queries. Every document id begins with the tenant id.

**Since v08.02 the tenant document also owns the 7 Approach section names**, via
an additive `approachSections` field. That location was chosen deliberately over
a new collection: this sandbox has no Firebase CLI, so a collection the deployed
rules have never seen would be a 403 for the owner.

---

## 20. Panels

**Definition.** The list of study tools an Approach declares. Nine recognised
names (`app/js/ayah-renderer.js:206`):

```js
const PANEL_ORDER = ["text", "tajweed", "wordByWord", "root", "derivatives",
                     "notes", "reflection", "writing", "checklist"];
```

Plus transport controls wired separately: `audio`, `loop`, `timer`, `resource`.

**Two facts worth carrying forward:**

- **`root` and `derivatives` are fully built but no Approach declares them.**
  Verified against all 30 templates: only `approach_04` declares `wordByWord`,
  and **nothing** declares `root` or `derivatives`. They are reachable only via
  the reading screen's own toggles.
- **A panel name not in the map renders nothing, silently.**

The file states the design rule in its own words: *"adding approach 31 is a row
of data, not a build — only holds if this switch never grows per-Approach
special cases."*



═══════════════════════════════════════════════════════════════════════════
FILE: 04-EDUCATIONAL-ARCHITECTURE.md
═══════════════════════════════════════════════════════════════════════════

# 04 — Educational Architecture

QuranRevival v08.02 · the educational model **as it exists in the code**

Nothing here is invented. Every structure was read out of
`app/js/catalogue-data.js`, `app/js/catalogue.js`, `app/js/records.js` and
`app/js/unit-keys.js`.

---

## 1. The model in one diagram

```
  MODULE  (10, platform-wide)
     │    id, name{en,bn}, order, renderer: "ayah" | "topic" | "routine" | "asma"
     │
     ├──▶ SUBJECT  (55 template nodes, a TREE: parentId + ancestorIds[])
     │       │
     │       └──▶ TRACKABLE            ← "Approach" is the Quran's word for this
     │              30 with subjectId "quran"  +  9 module-wide with subjectId null
     │                    │
     │                    │        ┌── STUDY UNIT  (a permanent STRING, no collection)
     │                    │        │      ayah | range | surah | ruku' | juz | hizb | page
     │                    ▼        ▼
     │            entryKey = `${unitKey}::${trackableId}`
     │                         │
     └─────────────────────────┼──── PERSON  (personId)
                               ▼
              records/{tenantId}__{personId}__{chunkKey}
                 entries { entryKey → { claimedStatus, confirmState,
                                        confirmedStatus, … } }
                               │
                               ▼
                        STUDENT PROGRESS
```

**Read the join carefully.** A Trackable does **not** contain Study Units, and a
Study Unit does **not** belong to a Trackable. They are two independent
coordinates, multiplied at claim time into one map key. The educational model is
therefore a **free cross-product created lazily** — never a fixed curriculum
lattice.

---

## 2. Modules — 10

From `MODULE_TEMPLATES` (`app/js/catalogue-data.js:49`):

| # | id | Name | Renderer | Study page |
|---|---|---|---|---|
| 1 | `quranrevival` | QuranRevival | **ayah** | `quranrevival.html` (12,051 lines) |
| 2 | `deen` | Deen Study | topic | `deen-study.html` |
| 3 | `arabic` | Arabic | topic | `arabic-study.html` |
| 4 | `general` | General | topic | `general-study.html` |
| 5 | `health` | Health | **routine** | `health-study.html` |
| 6 | `naturelife` | Nature-Life | topic | `naturelife-study.html` |
| 7 | `hadith` | Hadith | topic | `hadith-study.html` |
| 8 | `lifeskill` | Life Skill | topic | `life-skill.html` |
| 9 | `ldog` | Learn Deen On-the-Go | routine | `ldog-study.html` |
| 10 | `asma` | Asma ul Husna | **asma** | `asma-study.html` |

**`renderer` is the app's main polymorphism**, and it is genuinely load-bearing:
six of the ten study pages are ~149-line shells differing only in three
arguments.

```js
// app/deen-study.html:146 — and five siblings identical but for the arguments
initTopicStudyPage({ moduleId: "deen", trackableId: "studied_deen", rootSubjectId: "deen_study" });
```

| Renderer | Pages | Initialiser | Unit type claimed |
|---|---|---|---|
| `ayah` | 1 | inline in `quranrevival.html` | `ayah`/`range`/`surah`/`ruku`/`juz`/`hizb`/`page` |
| `topic` | 6 | `initTopicStudyPage()` — `topic-study.js` | `topic:` |
| `routine` | 2 | `initRoutineStudyPage()` — `routine-study.js` | `topic:` + a day log |
| `asma` | 1 | `initAsmaStudyPage()` — `asma-study.js` | `name:` |

`modules` is **platform-wide, not per-tenant**; writing it requires
`isPlatformAdmin()`.

---

## 3. Subjects — a real tree, unevenly used

`SUBJECT_TEMPLATES` holds **55 nodes**. Each carries `parentId`, `moduleIds[]`,
`order`, and a denormalised `ancestorIds[]` computed by `computeAncestorIds()`
(`catalogue.js:68`) so roll-ups count through it exactly once (invariant I12).

```
quran                      (module quranrevival)   ← A SINGLE LEAF. No children.
hadith                     (module hadith)
  ├── hadith_adab_al_mufrad
  ├── hadith_shamayyl_muhammadiya
  ├── hadith_al_ghayb
  ├── hadith_reading
  └── hadith_stories
arabic_language            (module arabic)
  ├── arabic_advanced_grammar
  ├── arabic_speaking
  └── arabic_daily_uses
deen_study                 (module deen)
  ├── deen_core
  │     ├── ethics          ← Ethics (social) and Akhlaq (personal) are
  │     ├── akhlaq          ←   DISTINCT nodes. Confirmed, non-negotiable.
  │     ├── aqeedah │ ebadah │ sharia │ fiqh │ islamic_history_story
  └── deen_enhancement
        ├── islamic_mindset │ islamic_lifestyle │ islamic_sports_entertainment
general_study              (module general)
  ├── general_core → mathematics │ english │ science │ geography │ world_history
  └── general_enhancement → creativity
nature_life                (module naturelife)  → nature_studies │ agro_farming
health                     (module health)
  ├── health_study │ know_your_body │ know_your_food
  └── physical_activities
        └── lying_movements │ standing_movements │ sitting_movements │ walking
            │ squatting │ hiit │ breathing_exercise │ fasting
life_skill                 (module lifeskill) → life_skill_tech_cognition │ life_skill_trading
ldog                       (module ldog) → daily_deen_habit
asma_ul_husna              (module asma)      ← exists only to give records a subjectId
```

### The structural asymmetry a new architect must notice

| | Quran | Every other module |
|---|---|---|
| Subject tree | **one leaf** (`quran`) | real, several levels deep |
| Trackables | **30** Approaches | **1** module-wide ("Studied"/"Practised") |
| Depth lives in | the **Approaches** | the **subject tree** |
| Unit types | 7 Quran units | `topic:` (or `name:`) |

**The Quran module uses none of the tree machinery, and the topic modules use
almost nothing but it.** They are two different educational shapes sharing one
progress engine. Everything hard about the Quran (units, roll-ups, wheels,
Explore) exists because that depth is in the Approaches instead of the tree.

`asma_ul_husna` is a deliberate special case: it is a subject node that exists
**only** so `records.js` has a `subjectId` to chunk the 99 Names' claims under.
The Names themselves are fixed platform content in `asma-data.js`, not 99
subject nodes.

---

## 4. Trackables — the progress-carrying entity

Two populations in one collection:

| Population | Count | `subjectId` | `moduleId` |
|---|---|---|---|
| The 30 Approaches | 30 | `"quran"` | `"quranrevival"` |
| Topic/routine trackables | 9 | `null` | one per module |

The nine: `studied_deen`, `studied_arabic`, `studied_hadith`, `studied_general`,
`studied_naturelife`, `studied_lifeskill`, `studied_asma`, `practised_health`,
`practised_ldog`.

**Why only one trackable per non-Quran module**, recorded in
`catalogue-data.js`'s own comment: the Quran's 30 Approaches work because "what
we teach, the target, and the resources" were already in hand. No other subject
has that yet, so rather than invent a second 30-item system ahead of the
resources existing, there is **one universal "Studied" trackable per
topic-based module**, applied to whichever topic nodes actually get authored.

**This is the app's biggest open educational question**, and it is recorded as
such: claiming and confirming only work richly for the Quran, because Approaches
only exist for the Quran. Every other subject has no defined "what does progress
look like here" system. The project's brief marks this as needing a long design
conversation and explicitly says **not** to raise it proactively each session.

---

## 5. The 30 Approaches — a real pedagogical progression

Not a flat list. The **7 sections** encode a deliberate arc from mechanics to
application:

| § | Section | # | The educational move |
|---|---|---|---|
| 1 | Building Foundation / Learning Tools | 6 | Acquire the tools: recite, memorise, meaning, word-by-word, writing, grammar |
| 2 | Engagement / Attachment | 7 | Build relationship: listening, dua, journaling, ruqyah, calligraphy, stories |
| 3 | Critical Reasoning: Nazar / 'Aql | 2 | Observe plainly, then reason ordinarily |
| 4 | Critical Reasoning: Applied Threads | 4 | Draw out duas, Names of Allah, the Prophets, the miracles |
| 5 | Critical Reasoning: Tafakkur / Tadabbur | 4 | Reflect → contemplate → understand (fiqh) → remember (dhikr) |
| 6 | Critical Reasoning: Judgement / Authority | 3 | Ruling, judgement (fahm), authority (hukm) |
| 7 | A'mal / Application | 4 | Discuss, live by it, da'wah, teach others |

**The arc is: tools → attachment → observation → reasoning → depth → judgement
→ action.** Section 7 ending in "Teaching Others" is the classical completion of
learning.

**But the code enforces none of this.** `section`/`group` is a **display
grouping only** — verified: it never appears in a unit key or an entry key,
nothing aggregates by it, a section cannot be claimed and cannot hold a status.
`saveApproachSections()`'s own comment states it plainly: *"Renumbering on
reorder is safe: NOTHING keys off `group`."*

**So there are no prerequisites, no gating and no ordering enforcement
anywhere.** A learner may claim "Mastered" on Approach 30 (Teaching Others)
without having touched Approach 1. **Could not confirm from code** any
prerequisite mechanism — there is none.

---

## 6. Study Units — the second coordinate

Twelve declared types (`unit-keys.js:14`); **seven offered for the Quran**;
`rub` and `manzil` declared but unreachable; `hadith`, `topic`, `name` belong to
other modules; **there is no whole-Quran unit key**.

```
                 Whole Quran   ← a computed VIEW, never a claimable unit
                /     |     \
          Juz(30) Hizb(60) Page(604)          Surah(114)
                \     |     /                      │
                 ayahCoverage()                 Ruku' (per-surah)
                        \                      /      │
                         \                    /     Range
                          ──── Ayah (6,236) ────────/
                                   │
                              Word (77,429)   ← NOT a unit type
```

Full detail in **06-STUDY-UNITS.md**.

---

## 7. Learning levels — **there are none**

**Explicitly checked.** Two things look like levels and are not:

**(a) `ladders` / `levels` / `personLevels` exist, but they are a GRADING
system, not a study progression.** They are tenant-authored "grade ladders"
(e.g. a set of attainment levels) created in `app/catalogue.html`
(`createLadder()` / `createLevel()`, `catalogue.js:509`/`:519`), consumed by
`app/curriculum.html:349` to attach a level to a curriculum unit, awarded to a
person by `app/js/grades.js` (which writes `personLevels`), and exported by
`app/js/backup.js:189`.

**They are not consulted anywhere in the study or progress path.** Verified by
grep: no wheel, no Explore renderer, no study page, `claimStatus()` and
`monitor.js` all read them zero times. So a "level" a student is awarded is a
*grade recorded against curriculum*, entirely parallel to the six-status ramp,
and the two systems never meet.

**(b) The Approach names contain level words** — "Beginner's Level",
"Primary Level", "Intermediate Level", "Advanced Level", "Higher Level",
"Upper Higher Level", "Mastery Level". These are **words inside a name string**,
carrying no structure. Approach 21 ("Advanced Level — Tadabbur") is not gated on
Approach 20; nothing parses those words.

**So the only real gradation in the system is the six-value status ramp**, and
it applies identically to every Approach.

---

## 8. Progress states — six, one off-ramp

```js
// app/js/unit-keys.js:114
{ not_applicable, onRamp: false }   ← an EXCLUSION, not a step (I7)
{ not_started    }
{ learning       }
{ practising     }   ← British spelling in the STORED id
{ achieved       }
{ mastered       }
```

`RAMP_ORDER` (the five on-ramp ids, in order) is what Explore's `min`/`max`
pooling walks. `not_applicable` is skipped by every aggregation — never counted
as zero.

**"Progress" is defined narrowly**: `summarizeStatuses()` (`unit-keys.js:157`)
counts only `achieved` **or** `mastered` in its numerator.

**No semantic criteria for the four active levels exist anywhere.** What makes a
claim "Practising" rather than "Learning" is left to the learner and to each
Approach's own `guide.measure` sentence. The transition is a free choice from a
`<select>` — there is no validation, no minimum, no time requirement, and no
ordering constraint. A learner may jump straight to Mastered.

---

## 9. Curriculum relationships

Two things named "curriculum", and they are **separate by invariant I8**
("curriculum content is separate from schedule"):

| Collection | Role | Code |
|---|---|---|
| `curriculumUnits` | the **content**: what is to be taught | `curriculum.js`, `curriculum.html` |
| `curriculumPlan` | the **schedule**: when | same |
| `resources` | links/text attached to subjects and units | `resources.js` |
| `grades` | recorded marks | `grades.js` |
| `classes`, `courseOffers`, `enrollments` | who studies with whom | `classes.js`, `course-offers.js` |

**The important boundary: the curriculum system does not drive the study
screens.** A student's Quran study does not consult `curriculumPlan`, and
`claimStatus()` never reads it. Enrolments feed **two** things only: teacher
scoping in the rules (via `teacherStudentLinks`) and `activity.viaProgramId`
(invariant I3 — the "where did this claim come from" context, which lives on
activity and **never** in a record key).

**So the educational model is learner-driven, not curriculum-driven.** Curriculum
is an organisational overlay, not a gate.

---

## 10. Quran study methodology, as encoded

Five properties, each read from the code:

1. **Method is a first-class axis.** Most apps track *what* was studied. This one
   tracks *how* — 30 named methods, each separately claimable, each with its own
   Guide and its own panel set.
2. **Granularity is the learner's choice.** The same Approach can be claimed on
   one ayah or on a whole juz. Seven granularities, freely mixed.
3. **A wider claim is a promise about its parts.** Explore's
   `effectiveAyahStatus()` treats a claim on a wide unit as a **floor** under
   every ayah it covers — claiming "Surah 1, Mastered" asserts something about
   all seven ayahs.
4. **A wider unit's colour is its weakest part.** `poolCoverageStatus()` takes
   the **minimum**. One unclaimed ayah makes a whole Juz read `not_started`.
5. **Progress is ordinal, never a percentage.** No wheel anywhere shows a number.
   The only percentages in the app are the Way modal's Breakdown histogram and
   the Monitor report; neither drives a colour.

```
   MAX downward  (a wide claim floors its ayahs)
   MIN upward    (a wide unit takes its weakest ayah)
   not_applicable excluded from both      (I7)
```

**And the landing wheel deliberately does neither** — it shows a unit's own
direct claim only. The reason is in the code: the card a slice opens claims
*this* unit, so a green slice over "Not claimed yet" would be the screen
contradicting itself.

---

## 11. What the educational model does NOT have

Stated plainly, because each absence shapes what can be built next:

| Absent | Consequence |
|---|---|
| Prerequisites / gating | any Approach claimable at any time, in any order |
| Sub-levels or tracks within an Approach | `trackables` is flat — no `parentId`, no `levels[]` |
| Enforced status criteria | any status reachable in one click |
| A whole-Quran claimable unit | "how much of the Quran" is a computed view only |
| A word-level unit | word-by-word data is read-only display |
| Approach-level roll-up | no "overall Quran progress" figure exists anywhere |
| A level/ladder system wired to STUDY | `ladders`/`levels`/`personLevels` are real, but they grade CURRICULUM; the study path never reads them |
| A curriculum gate | curriculum never blocks or drives a claim |



═══════════════════════════════════════════════════════════════════════════
FILE: 07-PROGRESS-AND-TRACKING-SYSTEM.md
═══════════════════════════════════════════════════════════════════════════

# 07 — Progress and Tracking System

QuranRevival v08.02 · the deepest system in the application

---

## 1. All progress statuses — **six, not five**

```js
// app/js/unit-keys.js:114
export const STATUSES = Object.freeze([
  { id: "not_applicable", label: "Not Applicable", onRamp: false },
  { id: "not_started",    label: "Not started",    onRamp: true },
  { id: "learning",       label: "Learning",       onRamp: true },
  { id: "practising",     label: "Practising",     onRamp: true },
  { id: "achieved",       label: "Achieved",       onRamp: true },
  { id: "mastered",       label: "Mastered",       onRamp: true },
]);
```

**Three facts the names do not tell you:**

1. **The stored id is `practising`** — British spelling. New code must match exactly.
2. **`not_applicable` is off the ramp.** It is an *exclusion*, not a sixth step — invariant I7 requires it excluded from totals, never counted as zero.
3. The English `label` is the **stored, canonical value and the translation key**. `statusLabel(id)` (`unit-keys.js:139`) is the only place it becomes readable text, translated at call time so a mid-session language change is picked up.

### Meaning of each — what the code does and does not say

| Status | What the code does with it | Defined meaning? |
|---|---|---|
| `not_started` | the default when no entry exists; bottom of `RAMP_ORDER` | implicit |
| **Learning** | position 2 on the ramp | **none in code** |
| **Practising** | position 3 | **none in code** |
| **Achieved** | position 4; **counts toward "progress"** | **none in code** |
| **Mastered** | position 5, the top; a distinct HUE on the wheel | **none in code** |
| `not_applicable` | skipped by every aggregation | an explicit exclusion |

> **There is no semantic definition of Learning / Practising / Achieved /
> Mastered anywhere in the codebase.** No criteria, no minimum time, no required
> evidence, no ordering constraint. A learner may pick `mastered` on the first
> click. The only guidance is each Approach's own `guide.measure` sentence, which
> is **displayed text, never validated**.

**The app defines "progress" narrowly** — `summarizeStatuses()` counts only
`achieved` **or** `mastered` in its numerator:

```js
// app/js/unit-keys.js:157
export function summarizeStatuses(statusIds) {
  const counted = statusIds.filter((s) => s !== "not_applicable");
  const achievedOrBetter = counted.filter((s) => s === "achieved" || s === "mastered").length;
  return { countedTotal: counted.length,
           excludedNotApplicable: statusIds.length - counted.length,
           achievedOrBetter,
           ratio: counted.length === 0 ? null : achievedOrBetter / counted.length };
}
```

`ratio` is **`null`, not `0`**, when nothing is countable — a deliberate
distinction between "no progress" and "nothing to measure".

---

## 2. Status transitions

**There is no state machine.** A claim is a free assignment from a `<select>`:

```
any status  ──────▶  any other status      (no validation beyond isValidStatus)
```

The only guard is membership of the six (`isValidStatus`, which throws on
anything else). **Transitions may go backwards, skip levels, or repeat.**

What a *re-claim* changes, and what it deliberately does not (invariant I6):

```
re-claim  →  claimedStatus := new value
          →  confirmState  := "pending"        (if confirmation is required)
          →  confirmedStatus, confirmedAt, confirmedByPersonId  ← UNCHANGED
```

So an entry legitimately shows `claimedStatus: "mastered"` beside
`confirmedStatus: "achieved"` — the student has moved on and the teacher has not
caught up. **This is correct behaviour, not a bug.**

---

## 3. Who can change status

| Action | Who | Gate |
|---|---|---|
| Claim for self | anyone | `isSelfPerson()` |
| Claim for another | owner, prime, co-enrolled teacher, guardian-of | `canRecordFor()` |
| **Confirm / return** | the same set | **`canRecordFor()` — the identical gate** |

> **The security rules do not distinguish claiming from confirming.** Anyone who
> may write a record at all may set `confirmedStatus`. The separation exists
> **only in client-side JavaScript** — `records.html` is the only screen that
> offers Confirm/Return, and it hides them when `viewAsRole === "student"`.

---

## 4. The claim process

```js
// app/js/records.js:154 — THE single write path for all progress in the app
export async function claimStatus(db, {
  tenantId, personId, subjectId, unitKey, trackableId,
  statusId, notes, domainIds, claimedByPersonId, claimedByUid,
}) { … }
```

Nine steps, and **nine Firestore reads before the write**:

| # | Step | Reads |
|---|---|---|
| 1 | `isValidStatus(statusId)` — throws otherwise | 0 |
| 2 | `chunkKeyFor(unitKey, subjectId)` | 0 |
| 3 | `entryKey = ${unitKey}::${trackableId}` | 0 |
| 4 | `getSubjectConfirmationOverride()` → `subjects/{t}__{subjectId}` | **1** |
| 5 | `computeConfirmationRequired()` → 6 role gets | **6** |
| 6 | …+ `personIsManaged()` → `tenantPeople/{personId}` | **1** |
| 7 | `getDoc(records/{t}__{p}__{chunk})` — the previous entry | **1** |
| 8 | **WRITE** — dot-path update, or create | — |
| 9 | caller then calls `logActivity()` | +1 write |

The I6-critical construction (`records.js:170`):

```js
const entry = {
  unitType, subjectId, trackableId,
  claimedStatus: statusId,
  claimedByPersonId,
  confirmedStatus:     needsConfirmation ? (prevEntry.confirmedStatus ?? null)     : statusId,
  confirmState:        needsConfirmation ? "pending"                               : "confirmed",
  confirmedByPersonId: needsConfirmation ? (prevEntry.confirmedByPersonId ?? null) : claimedByPersonId,
  confirmedAt:         needsConfirmation ? (prevEntry.confirmedAt ?? null)         : nowIso,
  returnNote:          needsConfirmation ? (prevEntry.returnNote ?? null)          : null,
  domainIds: domainIds ?? [], notes: notes ?? "", updatedAt: nowIso,
};
```

**Whether confirmation is required is COMPUTED, never configured per person**
(`records.js:124`) — see 02-USER-ROLES-AND-PERMISSIONS.md §3 for the ordered
cascade and its consequences.

---

## 5. Approval, return, and the two statuses

| Action | Function | Effect |
|---|---|---|
| Confirm | `confirmEntry()` `records.js:201` | `confirmedStatus := claimedStatus` (**frozen**), `confirmState := "confirmed"`, stamps who + when |
| Return | `returnEntry()` `records.js:219` | `confirmState := "returned"` + `returnNote`. **Leaves `confirmedStatus`/`confirmedAt` frozen** |
| Bulk (surah/subject) | `bulkConfirmChunk()` `:262` | every `pending` entry in one chunk |
| Bulk (week) | `bulkConfirmWeek()` `:274` | every entry touched by that week's activity doc, across chunks |
| Bulk (person) | `bulkConfirmAllPendingForPerson()` `:297` | |
| Bulk (class) | `bulkConfirmClass()` `:322` | loops active `student` enrolments |

Bulk confirms skip anything not currently `pending` (`records.js:251`).
A `returned` entry offers "Confirm anyway" (`records.html:483`).

### Claimed vs confirmed — **handled entirely separately**

```
claimedStatus     ← what the student says       →  drives EVERY wheel and colour
confirmedStatus   ← what the teacher froze (I6) →  drives NOTHING visual
confirmState      ← pending | confirmed | returned
```

**They are separate fields, separate columns, and separately maintained.** The
architectural inconsistency is not that they are conflated — it is that only one
of them is ever *used* outside the Records table.

---

## 6. Database structure

**Collection:** `records`
**Document id:** `{tenantId}__{personId}__{chunkKey}`

```json
{
  "tenantId": "t1",
  "personId": "p1",
  "entries": {
    "ayah:2:255::approach_04": {
      "unitType": "ayah",
      "subjectId": "quran",
      "trackableId": "approach_04",
      "claimedStatus": "practising",
      "claimedByPersonId": "p1",
      "confirmedStatus": "learning",
      "confirmState": "pending",
      "confirmedByPersonId": "p2",
      "confirmedAt": "2026-09-01T09:14:02.113Z",
      "returnNote": null,
      "domainIds": [],
      "notes": "",
      "updatedAt": "2026-09-04T18:22:41.008Z"
    }
  },
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

Plus the envelope every document carries (I17): `schemaVersion`, `createdAt`,
`updatedAt`, `createdBy` — `app/js/envelope.js`.

**Writes are dot-path updates**, so a claim touches one entry and never rewrites
the map. **There is no delete path anywhere** (I4/D6).

---

## 7. Is progress stored or calculated? — **both, at two levels**

- **A claim is STORED.** The `(person, unit, Approach)` status is a durable write. **This is the only persisted progress in the system.**
- **Everything above a claim is CALCULATED on every render**, from claims already in memory: roll-ups, pooled statuses, Explore colours, the Breakdown histogram, the Monitor report.

> **There is no denormalised progress document, no summary collection, no
> aggregate counter, and no Cloud Function maintaining one.** Verified across the
> whole collection map (`app/js/collections.js`).

*Good:* nothing can drift, and there is no cache to invalidate.
*Bad:* every calculation is bounded by what is in memory, which is bounded by the
chunk reads — Explore already pays ~115 document reads to compute its
whole-Quran view.

---

## 8. How parent progress aggregates

Fully specified in **06-STUDY-UNITS.md §7**. In one line:

```
MAX downward (a wide claim floors its ayahs) · MIN upward (a wide unit takes its
weakest ayah) · not_applicable excluded from both (I7) · the landing wheel does
NEITHER — direct claim only.
```

---

## 9. How percentages are calculated

**Percentages barely exist, and none drives a colour.**

| # | Percentage | Where |
|---|---|---|
| 1 | `summarizeStatuses().ratio` | `unit-keys.js:157` — two callers only |
| 2 | Breakdown-tab histogram | `way-modal.js:99` — `Math.round((count / summary.countedTotal) * 100)` |
| — | Coverage tab | `way-modal.js:124` — **a count, not a percentage**: "N of M ayahs touched" |

**Not a percentage anywhere:** the Mastery Wheel, the Explore wheel, the sidebar
chips, all four Explore levels. Every one is a status id mapped to a colour.

---

## 10–12. Code that writes, reads and updates progress

### Writes
**One function: `claimStatus()`.** Nine call sites:

| File | Line | Context |
|---|---|---|
| `app/quranrevival.html` | 10967 | Note view → Approach card (the main Quran path) |
| `app/quranrevival.html` | 11056 | Note view → Asma ul Husna card |
| `app/quranrevival.html` | 11948 | the floating "Track this unit" overlay |
| `app/records.html` | 540 | the Records screen's own claim control |
| `app/js/topic-study.js` | 512 | topic renderer (6 modules) |
| `app/js/routine-study.js` | 510 | routine renderer (2 modules) |
| `app/js/asma-study.js` | 755 | Asma ul Husna |
| `app/js/self-check.js` | 279 | admin self-check |

Every one wraps the call in `safeWrite()` (I15 — a failed write must reach the
user, never `console.error` alone) and follows success with `logActivity()`.

### Reads

| Reader | Where | Cost |
|---|---|---|
| `getRecordsChunk()` | `records.js:66` | 1 doc — the primitive |
| `listAllRecordsForPerson()` | `records.js:354` | **1 query**, `tenantId` + `personId` |
| `listPendingForPerson()` | `records.js:372` | the above, filtered to `pending` |
| landing wheel | `refreshChunkAndWheel()` `:5565` | 1 doc |
| `subject_quran` cache | `ensureQuranSubjectChunk()` `:5628` | 1 doc, **first use only** (I9) |
| Explore | `ensureExploreChunksLoaded()` `:6647` | **≤115 docs, parallel, per open** |
| Monitor | `monitor.js` | via `listAllRecordsForPerson()` |
| Records screen | `records.html` | via `getRecordsChunk()` |

The only list query against `records` is deliberately **list-safe** — both filter
fields are exactly what the rule checks:

```js
// app/js/records.js:354
query(collection(db, TENANT.RECORDS),
      where("tenantId", "==", tenantId),
      where("personId", "==", personId));
```

### Updates
`confirmEntry`, `returnEntry`, and the four bulk-confirm functions. **No function
ever lowers a status, deletes an entry, or recalculates a confirmed value.**

---

## 13. Firestore collections and security rules

```
match /records/{recordKey} {
  allow read: if isPlatformAdmin();
  allow read: if signedIn() && !exists(/databases/$(database)/documents/records/$(recordKey));
  allow read: if canRecordFor(resource.data.tenantId, resource.data.personId);
  allow create: if canRecordFor(request.resource.data.tenantId, request.resource.data.personId);
  allow update: if canRecordFor(resource.data.tenantId, resource.data.personId);
  // No delete (I4/D6).
}
```

The second `allow read` is deliberate, not a hole: `claimStatus()` reads a chunk
to see whether it exists before creating it, and for a first-ever claim
`resource` is null. A nonexistent document has no data to expose.

**The rules never inspect `entries`** — only `tenantId` and `personId`. New unit
keys, trackable ids and entry fields therefore need **no rules change**.

---

## 14. The full trace of one status change

```
USER clicks "Mastered" in the Note view's Approach card, then "Claim"
  │
  ▼ COMPONENT   wireApproachEmbed() claim handler        quranrevival.html:10967
  │              assignees = checkedAssignees(...)        ← may be SEVERAL people
  │
  ▼ WRAPPER     safeWrite(...)                            errors.js:107   (I15)
  │
  ▼ SERVICE     claimStatus(db, {...})                    records.js:154
  │               chunkKeyFor()          → "surah_2"      records.js:53
  │               entryKey               → "ayah:2:255::approach_04"
  │               getSubjectConfirmationOverride()        1 read
  │               computeConfirmationRequired()           7 reads
  │               getDoc(existing chunk)                  1 read
  │
  ▼ FIRESTORE   updateDocument(records/t1__p1__surah_2,
  │               { "entries.ayah:2:255::approach_04": {...} })   ← dot-path
  │
  ▼ AUDIT       logActivity() → activity/t1__p1__{weekKey}        (I3)
  │
  ▼ RE-READ     chunkKey === "subject_quran"
  │               ? ensureQuranSubjectChunk({force:true}) + renderWheel()
  │               : refreshChunkAndWheel()                :5565
  │
  ▼ CALCULATION approachStatusesForCurrentUnit()          :5685
  │               reads claimedStatus straight from the fresh chunk
  │               ── NO aggregation on this screen ──
  │
  ▼ WHEEL       renderWheel() → renderScopedWheel()       mastery-wheel.js:300
  │               fill = STATUS_COLORS[statusId]
  │
  ▼ NOTE VIEW   renderNoteViewNow() — rebuilds the card against the fresh chunk
  │
  ▼ EXPLORE     ── NOT UPDATED HERE ──
                Explore recomputes only on its next open (ensureExploreChunksLoaded).
                One exception, added deliberately: refreshChunkAndWheel() patches
                exploreChunksBySurah in place if Explore has been opened this
                session, so a claim shows as a real colour change without
                closing and reopening Explore.
END
```

---

## 15. Architectural inconsistencies — observed, not fixed

**1. Approval gates nothing visual.** Every wheel and every Explore colour reads
`claimedStatus`. `confirmedStatus` appears only in the Records table. **A
*returned* claim still shows green on the wheel.** This is the largest
inconsistency in the system.

**2. The rules do not separate claiming from confirming.** `canRecordFor()` is
the same gate for both; the separation is client-side only.

**3. Two aggregation rules that deliberately disagree.** The landing wheel shows
a direct claim; Explore pools. A Juz whose ayahs are all mastered reads
`not_started` on one screen and green on the other. Both are correct for their
own screen and the difference is invisible.

**4. Privilege is checked before studenthood.** `computeConfirmationRequired()`
returns `false` at the owner/prime/teacher/guardian checks *before* reaching the
student check — so any administrative role silently exempts a person from
approval even if they also hold `student`.

**5. `subjects.confirmationRequired` is the only configuration knob**, and it is
per **subject** — so it cannot be varied per Approach or per unit type.

**6. `not_applicable` is on the same picker as the ramp**, though it is
semantically a different kind of thing.

**7. Nine reads per claim, multiplied by assignees.** A guardian claiming for
three children pays 27 reads for one press.

**8. Activity is written but never queried as a list.** `activity.js` reads by id
only — there is no list query for activity anywhere in the app, so the backup
walks week keys from the tenant's `createdAt` to today rather than listing them.

---

## 16. Can the schema support multiple independent tracks within one Approach?

**Storage: yes, today, unchanged. Presentation: no.**

Because `trackableId` is an opaque string that nothing parses — the only code
that decomposes an entry key splits on `::` and takes both halves whole — these
are already three fully independent entries:

```
ayah:2:255::approach_31_L1
ayah:2:255::approach_31_L2
ayah:2:255::approach_31_L3
```

Each gets its own status, confirmation state, approver and timestamp, with **no
schema change and no rules change**.

**But nothing above storage can show them.** `trackables` is flat (no `parentId`,
no `levels[]`), and every wheel and Explore level composes the entry key from
**one selected `trackable.id`** — so levels hidden in an id suffix are invisible
to every colour. **The single blocking absence is a records-meaningful grouping
field on `trackables`**; the existing `group`/`groupName` is display-only.

*(This question is analysed in full, with the three curriculum options, in the
separate package at `docs/external-architecture-review/`.)*



═══════════════════════════════════════════════════════════════════════════
FILE: 13-CODEBASE-MAP.md
═══════════════════════════════════════════════════════════════════════════

# 13 — Codebase Map

QuranRevival v08.02 · **where to look when changing a feature**

---

## 1. Top-level folders

| Path | Purpose | Edit? |
|---|---|---|
| **`app/`** | **the live application** — 28 pages, 60 modules, 1 stylesheet, fonts | **✔ all work happens here** |
| `tools/` | data pull, verification harnesses, perf, i18n coverage | ✔ |
| `docs/` | this package + the external architecture review | ✔ |
| `legacy/` | **v06.30**, the pre-cutover single-file app (10,146 lines) | **✘ reference only, NEVER edit** |
| `legacy-v07/` | **v07.139**, a frozen `cp -a` of `app/` | **✘ reference only, NEVER edit** |
| `mushaf/` | 604 mushaf page fonts (~98 MB) | rarely |
| `firestore.rules` | 1,122 lines — the only server-side authority | ✔ (deploy separately) |
| `*.md`, `*.html` (root) | the standing brief, changelog, phase status, architecture docs | ✔ |

**Both archives sign in to the same Firebase project and write real data** —
they are runnable history, not screenshots. The version badge is the only thing
on screen that tells them apart.

## 2. Inside `app/`

| Path | Contents |
|---|---|
| `app/*.html` | **28 pages**, 22,207 lines. `quranrevival.html` alone is 12,051 |
| `app/js/*.js` | **60 modules**, 17,539 lines |
| `app/js/i18n/*.js` | 3 files, 2,582 lines — the Bangla catalogues |
| `app/css/shell.css` | the only stylesheet (pages also carry inline `<style>`) |
| `app/fonts/` | bundled Arabic faces |

**Total application: ~42,300 lines.**

## 3. The pages, by size and role

| Page | Lines | Role |
|---|---|---|
| **`quranrevival.html`** | **12,051** | **the Quran screen, Note view, Mastery Wheel and ALL of Explore** |
| `catalogue.html` | 1,546 | catalogue admin — subjects, Approaches (fully editable since v08.01/02), ladders |
| `bookmarks.html` | 1,010 | bookmark management |
| `curriculum.html` | 734 | curriculum units, plan, resources, grades |
| `records.html` | 700 | **the ONLY confirm/return UI** |
| `people.html` | 646 | roster, roles, invites, "View as" |
| `homework.html` | 600 | assign, mark, score |
| `taglines.html` | 524 | tenant taglines |
| `monitor.html` | 486 | reports, CSV export, print |
| `course-offers.html` | 425 | offers + enrolments |
| `migrate.html` | 423 | legacy migration (historical) |
| `classes.html` | 400 | classes + teacher assignment |
| `backup.html` | 298 | export everything to one offline HTML file |
| `asma-study.html` | 289 | Asma ul Husna |
| `quranrevival-render-test.html` | 242 | **a standalone render harness** — the fastest way to see the word panels in isolation |
| `accept-invite.html` | 164 | invite acceptance |
| `about.html` | 158 | feature registry + version |
| **6 topic pages** | ~149 each | `deen-study`, `arabic-study`, `hadith-study`, `general-study`, `naturelife-study`, `life-skill` — **thin shells** |
| **2 routine pages** | ~154 each | `health-study`, `ldog-study` — thin shells |
| `onboarding.html` | 146 | create a tenant |
| `admin-self-check.html` | 133 | F-008 self-verification screen |
| `index.html` | 28 | a redirect stub |

**The nine thin study pages are the codebase's best pattern.** Each is a
~149-line shell whose entire logic is one call:

```js
initTopicStudyPage({ moduleId: "deen", trackableId: "studied_deen", rootSubjectId: "deen_study" });
```

## 4. The modules, grouped by role

### Core services (Firestore-aware)
| File | Lines | Purpose |
|---|---|---|
| `records.js` | 393 | **claims, confirm, return, bulk confirm, chunking** |
| `catalogue.js` | 693 | subjects, trackables, seeding, reorder, sections |
| `activity.js` | 152 | the weekly audit log |
| `bookmarks.js` | 425 | resume + saved |
| `people.js` | 180 | add/edit a person, roles |
| `identity.js` | 173 | tenant + owner bootstrap |
| `invites.js` | 218 | invites with quota |
| `monitor.js` | 225 | report aggregation |
| `homework.js` | 298 | assignments, submissions, teaching notes |
| `course-offers.js` | 336 | offers + enrolments |
| `curriculum.js` | 107 | units + plan |
| `grades.js` | 75 | `personLevels` |
| `resources.js` | — | links/text |
| `domains.js` | 34 | the tag registry |
| `ayah-notes.js` | 127 | per-ayah rich-text notes |
| `qcr.js` | 217 | Ayah Collections |
| `asma-collections.js` | 438 | Names groups + overrides |
| `taglines.js` | 320 | tenant taglines |
| `backup.js` | 310 | reads everything for export |

### Pure renderers (never import Firebase — I2)
| File | Lines | Renders |
|---|---|---|
| `mastery-wheel.js` | 410 | **both wheels**, legend, sidebar, `STATUS_COLORS` |
| `way-modal.js` | 254 | Track / Guide / Breakdown / Coverage |
| `ayah-renderer.js` | 230 | ayah text, translations, **the three word panels** |
| `ayah-note-renderer.js` | 924 | the Note view |
| `topic-renderer.js` | 101 | topic-tree browsing |
| `asma-renderer.js` | 298 | the 99 Names |
| `hifz-renderer.js` | 308 | memorisation view |
| `nav.js` | 329 | the navigation bar |
| `labels.js` | 192 | status / POS / role / confirm-state text |
| `backup-file.js` | 477 | builds the offline HTML backup (no Firebase — testable in plain node) |

### Page controllers
| File | Lines | Drives |
|---|---|---|
| `topic-study.js` | 633 | **6 study pages** |
| `routine-study.js` | 632 | **2 study pages** |
| `asma-study.js` | 985 | `asma-study.html` |
| `self-check.js` | 372 | `admin-self-check.html` |
| `catalogue-repair.js` | 113 | catalogue repair |

### Static data
| File | Lines | Holds |
|---|---|---|
| `catalogue-data.js` | 378 | **the 30 Approaches, 7 sections, 55 subjects, 10 modules** |
| `asma-data.js` | 149 | the 99 Names |
| `asma-collections-data.js` | 156 | ~33 further Names/phrases |
| `quran-data.js` | 170 | **the only reader of the 31 MB static Quran data** |
| `quran-search.js` | 162 | search over the prebuilt indexes |
| `feature-registry.js` | 132 | what is built vs planned |
| `modules.js` | 62 | the platform module registry |

### Infrastructure
| File | Lines | Purpose |
|---|---|---|
| `firebase-init.js` | — | **the only place Firebase is initialised** (carries the client config) |
| `envelope.js` | 99 | I17 envelope on every write |
| `errors.js` | 115 | `safeWrite()` — I15 |
| `collections.js` | 79 | every collection name |
| `session-context.js` | 220 | tenant/role context, "View as", roster scoping |
| `prefs.js` | 713 | all localStorage preferences |
| `i18n.js` | 256 | `t()`, `num()`, `translateStatic()` |
| `lang.js` / `lang-sync.js` | 75 / 139 | `langText()`, language sync |
| `unit-keys.js` | 166 | **unit keys + the six statuses** |
| `study-lock.js` | — | the F-016 handover lock |

### UI utilities
`bar-palette.js` (73) · `drag-reorder.js` (85) · `wheel-resize.js` (85) ·
`text-size.js` (233) · `splash.js` (166) · `note-popup.js` (374) ·
`assign-picker.js` (68) · `bookmark-popover.js` (247) · `bookmark-nav.js` (278) ·
`continue-strip.js` (77) · `audio-player.js` (**1,042**) ·
`asma-wheel-text.js` (213) · `asma-ref-parser.js` (141) · `asma-posters.js` (129)

---

## 5. Feature → File map

**This is the table to use when changing something.**

| FEATURE | MAIN FILES | SUPPORTING FILES |
|---|---|---|
| **Quran Reader** | `app/quranrevival.html` · `js/ayah-renderer.js` | `js/quran-data.js` · `js/hifz-renderer.js` · `js/text-size.js` · `js/audio-player.js` |
| **Approaches** (definition) | `js/catalogue-data.js:222` (`APPROACH_TEMPLATES`) | `js/catalogue.js:152` (seed) · `js/catalogue.js:301` (`getTrackables`) |
| **Approaches** (editing) | `app/catalogue.html` | `js/catalogue.js` — `editCatalogueNode`, `reorderTrackables:561`, `saveApproachSections:641`, `setTrackableStatus:541` |
| **Approach sections** | `js/catalogue.js:602` (`sectionsFromTenantDoc`) · `:641` | `app/catalogue.html:878` (`sectionOf`) · `js/mastery-wheel.js:377` (sidebar headings) |
| **Study Units** | `js/unit-keys.js` | `quranrevival.html:4806` (`currentUnitInfo`) · `js/quran-data.js` (boundary indexes) |
| **Progress Tracking** | **`js/records.js`** | `js/unit-keys.js` (`STATUSES`) · `js/activity.js` · `js/envelope.js` |
| **Claims** | `js/records.js:154` (`claimStatus`) | 9 call sites — see 07 §10 · `js/errors.js` (`safeWrite`) |
| **Approvals** | `js/records.js:201`/`:219` + the 4 bulk fns | **`app/records.html`** — the only UI |
| **Explore** | `app/quranrevival.html:6094`–`:7122` | `js/mastery-wheel.js` · `js/prefs.js` · `js/bar-palette.js` |
| **Wheel** | `js/mastery-wheel.js` | `js/wheel-resize.js` · `js/asma-wheel-text.js` · `quranrevival.html:5701` |
| **Authentication** | `js/firebase-init.js` | each page's own `onAuthStateChanged` |
| **Users / roles / context** | `js/session-context.js` · `js/identity.js` | `js/people.js` · `firestore.rules` · `js/nav.js` |
| **Students / Guardians / Teachers** | `firestore.rules` (`canRecordFor`) | `js/records.js:124` · `js/session-context.js:160` |
| **People admin** | `app/people.html` · `js/people.js` | `js/invites.js` · `app/accept-invite.html` |
| **Word-by-Word** | `js/ayah-renderer.js:113` | `quranrevival.html:3445` (toggles) · `js/ayah-note-renderer.js:802` (⋮ menu) |
| **Roots** | `js/ayah-renderer.js:155` | `tools/quran-data-pull/pull.js` (source) |
| **Lemmas / POS** | `js/ayah-renderer.js:177` | `js/labels.js:182` (`posLabel`) |
| **Translations (Quran)** | `js/ayah-renderer.js` | `tools/quran-data-pull/output/surahs/*.json` |
| **Translations (UI, i18n)** | `js/i18n.js` · `js/i18n/bn.js` | `js/lang.js` · `tools/i18n-coverage.mjs` |
| **Settings / preferences** | `js/prefs.js` | `js/nav.js` (`renderSettings`) · `js/lang-sync.js` |
| **Bookmarks** | `js/bookmarks.js` · `app/bookmarks.html` | `js/bookmark-nav.js` · `js/bookmark-popover.js` · `js/continue-strip.js` |
| **Notes** | `js/ayah-notes.js` · `js/ayah-note-renderer.js` | `js/note-popup.js` |
| **Topic modules (×6)** | `js/topic-study.js` · `js/topic-renderer.js` | the six ~149-line pages |
| **Routine modules (×2)** | `js/routine-study.js` | `health-study.html` · `ldog-study.html` |
| **Asma ul Husna** | `js/asma-study.js` · `js/asma-renderer.js` | `asma-data.js` · `asma-collections.js` · `asma-posters.js` · `asma-ref-parser.js` · `asma-wheel-text.js` |
| **Ayah Collections (QCR)** | `js/qcr.js` · `js/qcr-data.js` | inside `quranrevival.html`'s Explore palette |
| **Monitor / reports** | `js/monitor.js` · `app/monitor.html` | `js/records.js:354` · `js/activity.js` |
| **Homework** | `js/homework.js` · `app/homework.html` | `js/assign-picker.js` |
| **Classes / offers / enrolments** | `js/classes.js` · `js/course-offers.js` | `firestore.rules` (`teacherStudentLinks`) |
| **Curriculum / grades** | `js/curriculum.js` · `js/grades.js` | `app/curriculum.html` · `js/resources.js` |
| **Backup** | `js/backup.js` · `js/backup-file.js` | `app/backup.html` |
| **Search** | `js/quran-search.js` | `search-{en,ar,bn}.json` |
| **Audio** | `js/audio-player.js` | *fetches archive.org — blocked in this sandbox* |
| **Self-check** | `js/self-check.js` | `app/admin-self-check.html` |
| **Quran dataset** | `tools/quran-data-pull/pull.js` | `build-{juz,hizb,page,search}-index.js` |

---

## 6. Where things are NOT

Saves time:

| Looking for | It is **not** where you'd expect |
|---|---|
| Explore | **not** a separate file — inside `quranrevival.html` |
| The Note view's UI | split: rendering in `ayah-note-renderer.js`, wiring in `quranrevival.html` |
| Word-by-word study | **`arabic-study.html` is NOT it** — that is the topic renderer for the Arabic *subject*. Word panels are in `ayah-renderer.js` |
| A router | none — 28 separate pages |
| Cloud Functions | none — everything is client-side |
| A state store | none — `let` + localStorage + Firestore cache |
| A `package.json` | **none anywhere in the repo** |
| Progress roll-ups | not stored — recomputed per render inside `quranrevival.html` |
| The 30 Approaches at runtime | **not** `catalogue-data.js` (that is only the seed) — they are Firestore `trackables` |



═══════════════════════════════════════════════════════════════════════════
FILE: 17-INTEGRATION-ENTRY-POINTS.md
═══════════════════════════════════════════════════════════════════════════

# 17 — Integration Entry Points

QuranRevival v08.02 · **"if we want to add X, which files are involved?"**

Written for AI-assisted development: each section names the files, the
invariants that constrain the work, and the traps with a recorded history.

**Nothing here is a proposal.** These are the seams the code already has.

---

## Rules that apply to every change

| # | Rule | Enforced by |
|---|---|---|
| I2 | A pure renderer must **never** import Firebase | convention; `labels.js` is the escape hatch |
| I4 / D6 | **Nothing is ever deleted** — archive, revoke, return | no delete rule exists in `firestore.rules` |
| I5 | Unit keys are **permanent** | changing `chunkKeyFor()` is a data migration |
| I6 | Confirmation is **frozen** | only `confirmEntry()` touches those four fields |
| I9 | Nothing joins the **startup path** without being flagged | the load-speed contract |
| I11 | Every user-visible name is **language-keyed** | `{en, bn}` + `t()` |
| I15 | A failed write must **reach the user** | wrap in `safeWrite()` |
| I17 | Every document carries the **envelope** | `envelope.js` |
| — | Collection names come from `collections.js` | never a bare string |
| — | Rules can `get()`/`exists()` a fixed path but **never query** | use a denormalised mirror |

---

## 1. A new Approach

**The cheapest change in the codebase.** The code's own words:
*"adding approach 31 is a row of data, not a build."*

| File | Change | Risk |
|---|---|---|
| `app/js/catalogue-data.js:222` | append to `APPROACH_TEMPLATES` — a new permanent `id`, `order`, `section`, `name{en,bn}`, `guide{what,how,measure}`, `panels[]` | **Low** — additive |
| `app/js/i18n/bn.js` | Bangla for any new string | Low (I11) |
| `app/js/ayah-renderer.js:206` | **only** if a new panel type is needed | Medium |
| `app/quranrevival.html` | **only** if new study UI is needed | **High** — 12,051 lines |

**Then:** each tenant must run **catalogue.html → seed**.
`ensureTenantCatalogueSeeded()` diffs by id, so re-running is safe.

**Traps:**
- **There is no "Add Approach" UI** — v08.01 made the 30 fully *editable* and explicitly left *creating* a 31st unbuilt. A new one needs an id scheme, a section and a position decided rather than inferred.
- **`order` must be unique within the Quran set** — duplicates give a non-deterministic wheel order (`?? 0` fallback).
- **A section is a contiguous block of the running order** (a v08.02 invariant) — a new Approach must sit inside its section's block.
- **A panel name not in `PANEL_RENDERERS` renders nothing, silently.**
- **The caption "Approach the Quran in 30 ways"** (`quranrevival.html:2638` + `bn.js`) becomes wrong at 31.
- **Layout must be re-measured** at 8 viewports in both languages.

**Free wins:** `root` and `derivatives` are fully built and declared by **no**
Approach — enabling them is a data edit.

---

## 2. A new Study Unit

**Five places, all named in the code.**

| # | File | Change |
|---|---|---|
| 1 | `app/js/unit-keys.js:14`/`:20` | add to `UNIT_TYPES` + a `buildUnitKey` constructor + a `UNIT_TYPE_LABELS` entry |
| 2 | `app/quranrevival.html:4806` | a branch in `currentUnitInfo()` (and `currentUnitAyahBounds()` at `:4765`) |
| 3 | `tools/quran-data-pull/build-*.js` + `app/js/quran-data.js` | a boundary index + a promise-cached loader |
| 4 | `app/quranrevival.html:6561` | a branch in `spansForKey()` inside `buildExploreWiderSpans()` — **only if it should roll up** |
| 5 | `app/js/records.js:51` | decide whether it joins `SURAH_CHUNKED_TYPES` |

**No Firestore schema change and no rules change** — the rules never inspect
`entries`.

**Traps:**
- **`chunkKeyFor()` and `currentUnitInfo()` must agree**, or the screen shows one document and the claim lands in another.
- **The ruku' precedent**: the pulled `ruku` field is *global*; the key stores a *per-surah* index (`rukuIndexInSurah()`).
- **The page precedent**: `page:{edition}:{n}` has **three** segments — parsers take `parts[2]`.
- **`ayahCoverage()` must be able to express it.** It handles contiguous ayah ranges; a non-contiguous unit does not fit.
- **`rub` and `manzil` already exist as constructors with no index** — the half-done shape to complete or avoid.

---

## 3. A new progress metric

**The hardest of these, because the system is ordinal, not cardinal.**

| Want | Where | Note |
|---|---|---|
| A new **status** | `unit-keys.js:114` + `STATUS_COLORS` | **VERY HIGH risk** — status ids are stored values in live data; and there are exactly six fills, no seventh |
| A new **ratio** over claims | beside `summarizeStatuses()` `:157` | Low — pure, two callers |
| A **percentage on a wheel** | the `items[]` contract, `mastery-wheel.js:300` | **Additive fields are backward-compatible** — `sliceLines` is the precedent. **The cheapest place to surface a number** |
| A different **roll-up rule** | `poolCoverageStatus()` `:6491` / `effectiveAyahStatus()` `:6530` | Medium — but `effectiveAyahStatus` runs up to 6,236 times per render |
| A **stored** aggregate | — | **No precedent exists.** Nothing is denormalised, and there are no Cloud Functions |

**The structural mismatch, stated plainly:** every transformation in the
progress pipeline is **ordinal** — a status moves up or down a five-point ramp,
and the arithmetic is `min` and `max`. Nothing anywhere sums, divides or counts
toward a total. A metric of the form `understood ÷ total × 100` is **cardinal**
and does not compose with `RAMP_ORDER` or `STATUS_COLORS`.

---

## 4. A new word-level feature

**The largest gap in the application.** What is missing, item by item:

| Requirement | Status |
|---|---|
| A word identifier | **absent** — `position` is unique within an ayah only |
| A `word:` unit type | **absent** — 12 types, none is `word` |
| A word click | **absent** — no handler anywhere; `.wbw-word` has no pointer cursor |
| A word-level index | **absent** — `roots-index.json` is referenced at `ayah-renderer.js:152` and **does not exist** |
| A cross-ayah word view | **absent** — every panel is `perAyahPanels()` |
| Storage for word claims | **blocked by size** — per-occurrence would be ~26 MiB against a 1 MiB cap |

**What is NOT missing:**
- The **records schema is entirely key-driven** — a word key would store and read with no schema or rules change.
- **Root and lemma are reliable identities** (0.0% and 0.4% ambiguity), and **lemma → root is a clean function**.
- The **lazy-index pattern** (search indexes) is the proven template for a generated word index.

**Where it would connect:**

| Seam | File |
|---|---|
| The panel that would become interactive | `ayah-renderer.js:113` (already emits `data-position`) |
| The unit key | `unit-keys.js:19` |
| The index loader | `quran-data.js` |
| The index builder | `tools/quran-data-pull/` |
| The discarded grammar data | `pull.js:206–215` — 128,011 corpus rows reduced to root/lemma/POS |

**Traps:** **NFC-normalise before any string match** (8 forms differ only by
combining-mark order); **never use the English gloss as identity** (73.8% of
occurrences are ambiguous); **`rootCount` is a display figure**, not arithmetic;
**a re-pull is a migration event** because I5 requires permanent keys.

---

## 5. A new Explore visualisation

| Work | File | Risk |
|---|---|---|
| A palette mode | `setExplorePalette()` `:7122` | Low |
| A level-router branch | `renderExplore()` `:6801` | Low |
| A renderer producing `items[]` | new function, same file | Medium |
| A data load | a new `ensure…Loaded()` beside `:6647` | Medium |
| Breadcrumb entries | `renderExploreBreadcrumb()` `:6676` | Low |
| A view toggle | `EXPLORE_VIEW_LEVELS` `:6770` + `prefs.js` | Low |
| Bangla strings | `app/js/i18n/bn.js` | Low (I11) |

**`mastery-wheel.js` needs no change** — hand it `items[]`.
**The precedent already exists three times**: Explore hosts Quran, QCR and Asma.

**Traps:** all of it lands in `quranrevival.html`; the Approach list
(`:6729`) is **flat** with a single selected id, so nested tracks are not
expressible; and every existing Explore wheel has segments that are *places in
the Quran*.

---

## 6. New user-role behaviour

| Want | Where | Risk |
|---|---|---|
| A new **role** | `records.js:90`, `people.js:24`, `firestore.rules`, `nav.js`, `labels.js` (`roleListLabel`) | **HIGH** — five places, one of them the security boundary |
| Change **who confirms** | `computeConfirmationRequired()` `records.js:124` | **HIGH** — an ordered cascade; order is significant |
| Change **roster visibility** | `scopedRoster()` `session-context.js:160` + the rules | High — two layers must agree |
| A new **rules-level check** | `firestore.rules` + a **denormalised mirror** | **HIGH** — rules cannot query |
| Nav gating | `nav.js:168` (`renderNavBar`), `:220` (`renderHomeExtras`) | Low — presentation only |

**Traps:**
- **Client gating is not security.** `firestore.rules` is the only authority.
- **The rules `get()` budget** is 20 per batched write, per document.
- **Multiple roles are a union everywhere except confirmation**, which is an ordered cascade that stops at the first match.
- **Subject-level teacher scoping is a known unsolved problem** — the rules cannot safely inspect one key of an arbitrarily-keyed map.

---

## 7. New approval behaviour

| Want | Where | Risk |
|---|---|---|
| A new **confirm state** | `records.js` + `labels.js` (`confirmStateLabel`) + `records.html` | **HIGH** — `confirmState` is a stored value |
| **Make approval affect visuals** | every `?.claimedStatus` read | **HIGH but mechanical** — `renderWheel`, `approachStatusesForCurrentUnit`, `effectiveAyahStatus`, `buildExploreWiderSpans`, `ayahStatusesForCurrentTrackable`. **A decision is needed for `pending` and `returned`** |
| A new **bulk scope** | beside `bulkConfirmChunk` `:262` | Low — the four existing ones are a clear template |
| An approval **queue/inbox** | new — `listPendingForPerson()` `:372` is the data source | Medium |
| **Notify** on approval | — | **No infrastructure exists.** No Cloud Functions, no messaging (`threads`/`messages` are reserved names only) |

**Traps:** **I6 is absolute** — only `confirmEntry()` may write those four fields;
`returnEntry()` deliberately leaves them frozen. And the rules do not
distinguish claiming from confirming, so a stricter separation needs a **rules**
change, not just UI.

---

## 8. A new Quran data field

| Step | File | Risk |
|---|---|---|
| 1. Pull it | `tools/quran-data-pull/pull.js` | **HIGH** — regenerates all 114 files |
| 2. Expose it | `app/js/quran-data.js` | Low |
| 3. Render it | `app/js/ayah-renderer.js` | Low–Medium |
| 4. Declare a panel | `PANEL_ORDER` + `PANEL_RENDERERS` `:206` | Low |
| 5. Turn it on | an Approach's `panels[]` in `catalogue-data.js` | **Low — a data edit** |

**Traps:**
- **A re-pull is a migration event** if tokenisation changes (I5).
- **File size** — the surah files are already 27 MB; a per-word field multiplies by 77,429.
- **The Quran data is outside the tenant model** — public, immutable, no per-tenant override (unlike `asmaCollections` for the Names).
- **Level-3 grammar data is already available upstream** and discarded at `pull.js:206–215`. **Recovering it is a wider extraction, not a new source.**
- **`manifest.json` is the only version stamp** — `schemaVersion: 1` + `generatedAt`.

---

## 9. Risk summary

| Area | Files | Risk | Why |
|---|---|---|---|
| A new Approach | **1–2** | **Lowest** | pure data |
| Turning on an existing panel | **1** | **Lowest** | pure data |
| A new Explore visualisation | 1 (large) | Medium | all in `quranrevival.html` |
| A new Study Unit | 5 | Medium | five places must agree |
| A new Quran data field | 3–5 | Medium–High | a re-pull |
| A new progress metric | 2–4 | High | ordinal↔cardinal mismatch |
| Word-level features | many | **Highest** | identity, index and storage all absent |
| A new role / rules change | 5 | **Highest** | the security boundary; rules cannot query |

---

## 10. Before changing anything — the project's own method

Recorded in its standing lessons, and worth following:

1. **Measure before AND after.** A screenshot is not a measurement.
2. **A new control is a layout change** — measure the row at every viewport in both languages, and *look* at the screenshot.
3. **Seed real-length content.** A fixture with short names hides overflow a real tenant hits.
4. **Assert the RENDERED result** — computed display, a measured rect, real text — never the intent the code just expressed. A passing check can carry the same blind spot as the code it guards.
5. **Check Bangla by opening the page in Bangla.** The coverage number is a to-do list, never evidence.
6. **A failing check is a wrong assertion surprisingly often** — investigate before "fixing" the app.
7. **A check describing what a round deliberately changed gets UPDATED in place, with the reason recorded** — never deleted.
8. **Say what was NOT done, and why.**
