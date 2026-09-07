# QuranRevival v08.02 — Complete Application Understanding Package

**This single file contains all 21 documents of the package, concatenated.**
Compiled 7 September 2026 from the live codebase at
`Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`, branch
`claude/quranrevival-architecture-review-prhiyr`.

---

## To the reviewing AI — how to use this file

You are being given a complete architectural description of a production web
application so that you can reason about it **without reading its ~42,000 lines
of source code**.

**Provenance and reliability.** Every statement here was produced by direct code
inspection. File paths and line numbers are given throughout and were
mechanically verified against the real files: all 67 cited repository paths were
confirmed to exist, and 55 cited line numbers were spot-checked against their
actual content (5 were wrong and were corrected). Counts over the Quran dataset
were computed by walking all 114 real data files, not quoted from a manifest.

**Where something could not be established from the code, it says so
explicitly** — search for the phrase **"Could not confirm from code"**. Please
treat those as genuine unknowns rather than filling them in.

**Two things to hold in mind while reading:**

1. **This codebase uses ordinary words in specific ways.** "Approach",
   "Trackable", "Study Unit", "Claim", "Derivatives", "Levels" — several do not
   mean what they appear to. **Read Document 01 before reasoning about anything
   technical.**
2. **Several findings are counter-intuitive and are load-bearing.** In
   particular: teacher approval changes no colour anywhere; there are two wheels
   with opposite axes sharing one renderer; only claims are stored and every
   roll-up is recomputed per render; and there are no Cloud Functions at all.

**If you are asked to design a change**, Document 17
(Integration Entry Points) names the files involved for each kind of change, and
Document 16 lists the risks and the reusable infrastructure. Document 13 is the
feature-to-file map.

---

## Contents

| # | Document | Answers |
|---|---|---|
| — | README | what this package is, reading order |
| 00 | Executive Summary | what it is, who uses it, maturity, risks |
| 01 | App Vision and Concepts | **what every term means in the code** — read first |
| 02 | User Roles and Permissions | 6 roles, auth, multiple roles per person |
| 03 | User Journeys | 15 journeys traced START → END |
| 04 | Educational Architecture | Module → Subject → Trackable → Unit → Progress |
| 05 | All Approaches | **all 30**, individually, with guide text and panels |
| 06 | Study Units | all 7 Quran units; which way progress rolls |
| 07 | Progress and Tracking | statuses, claims, approval, the full trace |
| 08 | Explore and the Wheel | both wheels, colour logic, data flow |
| 09 | Quran Data Architecture | the 31 MB dataset, measured totals |
| 10 | Word-by-Word and Arabic Data | **what exists vs what is a name only** |
| 11 | Database and Data Models | every collection, schemas, scaling limits |
| 12 | Technical Architecture | stack, state, routing, deployment |
| 13 | Codebase Map | **feature → file map** |
| 14 | Services and Core Logic | every important function |
| 15 | Feature Inventory | built / partial / placeholder / not connected |
| 16 | Risks and Opportunities | 49 risks + reusable infrastructure |
| 17 | Integration Entry Points | **"to add X, touch these files"** |
| 18 | Dependency and Feature Map | dependency graph and blast radius |
| — | FINAL Architecture Summary | the whole application, condensed |

---



═══════════════════════════════════════════════════════════════════════════
FILE: README.md
═══════════════════════════════════════════════════════════════════════════

# QuranRevival — Application Understanding Package

**Version documented: v08.02** · compiled 7 September 2026
Repository: `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`

---

## 1. What this package is

A complete architectural description of QuranRevival, written so that **a senior
architect can understand the whole application without reading its ~42,000 lines
of source**.

It is **documentation only**. No application code, database schema, UI or data
was modified in producing it.

Every important statement is based on **actual code inspection** — file paths and
line numbers are given throughout, counts were computed by running over the real
data files, and where something could not be established from the code it says
so explicitly (**"Could not confirm from code"**).

> **Version note.** The task brief referred to a "v08.00 codebase"; `main` was
> already at **v08.02**, two feature rounds ahead (v08.01 made the 30 Approaches
> fully editable; v08.02 made the 7 sections editable). **This package documents
> v08.02**, and those rounds change one conclusion carried in the earlier
> external-review package — see `00-EXECUTIVE-SUMMARY.md`.

---

## 2. Recommended reading order

### If you have 15 minutes
1. **`00-EXECUTIVE-SUMMARY.md`**
2. **`FINAL-ARCHITECTURE-SUMMARY.md`**

### If you have an hour
1. `00-EXECUTIVE-SUMMARY.md` — what and why
2. `01-APP-VISION-AND-CONCEPTS.md` — the vocabulary (read before anything else technical)
3. `04-EDUCATIONAL-ARCHITECTURE.md` — the model the whole app exists to serve
4. `07-PROGRESS-AND-TRACKING-SYSTEM.md` — the heart of the system
5. `13-CODEBASE-MAP.md` — where everything lives
6. `FINAL-ARCHITECTURE-SUMMARY.md`

### Full sequence
`00` → `01` → `02` → `03` → `04` → `05` → `06` → `07` → `08` → `09` → `10` →
`11` → `12` → `13` → `14` → `15` → `16` → `17` → `18` → `FINAL`

**Read `01` early whichever path you take.** This codebase uses ordinary words
in specific ways — "Approach", "Trackable", "Study Unit", "Claim", "Derivatives"
— and several of them do not mean what they appear to.

---

## 3. The documents

| # | Document | Answers |
|---|---|---|
| 00 | `00-EXECUTIVE-SUMMARY.md` | What is this, who uses it, is it mature, what are the risks |
| 01 | `01-APP-VISION-AND-CONCEPTS.md` | What every concept means **in the code** |
| 02 | `02-USER-ROLES-AND-PERMISSIONS.md` | The 6 roles, auth/authorisation, **multiple roles per person** |
| 03 | `03-USER-JOURNEYS.md` | 15 journeys traced START → END, and which are confusing |
| 04 | `04-EDUCATIONAL-ARCHITECTURE.md` | Module → Subject → Trackable → Unit → Progress |
| 05 | `05-ALL-APPROACHES.md` | **All 30 Approaches**, individually, with Guide text and panels |
| 06 | `06-STUDY-UNITS.md` | All 7 Quran units; **which way progress rolls** |
| 07 | `07-PROGRESS-AND-TRACKING-SYSTEM.md` | Statuses, claims, approval, the full trace |
| 08 | `08-EXPLORE-AND-PROGRESS-WHEEL.md` | Explore, both wheels, colour logic, data flow |
| 09 | `09-QURAN-DATA-ARCHITECTURE.md` | The 31 MB dataset, all fields, measured totals |
| 10 | `10-WORD-BY-WORD-AND-ARABIC-DATA.md` | **What exists vs what is a name only** |
| 11 | `11-DATABASE-AND-DATA-MODELS.md` | Every collection, schemas, scaling limits |
| 12 | `12-TECHNICAL-ARCHITECTURE.md` | The stack, state, routing, deployment |
| 13 | `13-CODEBASE-MAP.md` | **Feature → file map.** The one to keep open |
| 14 | `14-SERVICES-AND-CORE-LOGIC.md` | Every important function, in/out/DB/depends-on |
| 15 | `15-CURRENT-FEATURE-INVENTORY.md` | Built / partial / placeholder / not connected |
| 16 | `16-ARCHITECTURAL-RISKS-AND-OPPORTUNITIES.md` | 49 risks, plus reusable infrastructure |
| 17 | `17-INTEGRATION-ENTRY-POINTS.md` | **"To add X, touch these files"** |
| 18 | `18-DEPENDENCY-AND-FEATURE-MAP.md` | The dependency graph and blast radius |
| — | `FINAL-ARCHITECTURE-SUMMARY.md` | The whole application, condensed |

---

## 4. Which documents matter for which purpose

| Purpose | Read |
|---|---|
| **Product understanding** | `00`, `01`, `03`, `15` |
| **Educational understanding** | `04`, `05`, `06`, `01` |
| **Technical understanding** | `12`, `13`, `14`, `18` |
| **Database understanding** | `11`, `07` §6, `09` |
| **Future development** | **`17`**, then `16`, `13`, `14` |
| **Explore / wheel work** | `08`, `06` §7, `18` |
| **Arabic / word-level work** | `09`, `10`, plus `docs/external-architecture-review/` |
| **Roles, safeguarding, access** | `02`, `11` §5, `07` §13 |

---

## 5. Related package

`docs/external-architecture-review/` (built 6 Sep 2026, at **v08.00**) is a
narrower, deeper study aimed at integrating a three-level Quranic Arabic
learning system. It covers Approaches, units, progress, approval, Explore, the
wheel and the word dataset in more forensic detail, with exported source and a
dataset inventory.

**Where the two disagree, this package is newer.** Specifically, that package
states there is no Approach-editing UI beyond a rename prompt — true at v08.00,
**no longer true at v08.02**.

---

## 6. Ten things to know before reading anything else

1. **"Approach" is not a type.** It is a row in the `trackables` collection with `subjectId: "quran"`. One filter line defines the concept.
2. **Nothing in the code assumes there are 30 Approaches.** The only "30" is a caption.
3. **There are two wheels with opposite axes**, drawn by the same function.
4. **Teacher approval changes no colour anywhere.** Every wheel reads `claimedStatus`.
5. **Only claims are stored.** Every roll-up is recomputed on every render.
6. **There are no Cloud Functions.** All computation is in the browser.
7. **There is no build step, no framework, and no `package.json`.**
8. **`app/quranrevival.html` is 12,051 lines** and contains all of Explore.
9. **Words are not clickable.** The word-by-word system is read-only display.
10. **Nothing is ever deleted** — there is no delete rule in the security rules at all.

---

## 7. How to verify anything here

Every claim carries a file path, and usually a line number. To check one:

```bash
sed -n '154,200p' app/js/records.js          # a function
grep -c 'id: "approach_' app/js/catalogue-data.js   # → 30
grep -rn "claimStatus(db, {" app/            # → the 9 call sites
```

**Counts over the Quran dataset** were computed by walking all 114 files in
`tools/quran-data-pull/output/surahs/`. The method is described in
`09-QURAN-DATA-ARCHITECTURE.md`.

**Not run in this session:** the Playwright harnesses (`tools/i18n-verify`,
`tools/perf`) — Playwright is not installed in this container and the brief
forbids installing packages. Statements about load speed and test results are
read from the code and the project's own records, not re-measured today.



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
FILE: 02-USER-ROLES-AND-PERMISSIONS.md
═══════════════════════════════════════════════════════════════════════════

# 02 — User Roles and Permissions

QuranRevival v08.02 · from `firestore.rules`, `session-context.js`,
`records.js`, `people.js`, `nav.js`

---

## 0. The identity model in one picture

```
Google account (uid)
      │
      │  tenantPeople/{personId}.authUid
      ▼
Person (personId)  ──────────── may have NO login at all (a managed child)
      │
      │  one document per role held
      ▼
memberships/{tenantId}__{personId}__{role}      ← existence IS the assertion
      │
      │  denormalised for the security rules (rules cannot run queries)
      ▼
tenantMemberUids/{…}  { tenantId, uid, personId, roles: [...] }
```

**Three identities that must not be conflated:**

| Identity | What it is | Where |
|---|---|---|
| `uid` | a Google login | Firebase Auth; `createdBy` on every document |
| `personId` | the *subject* of records — who the progress belongs to | document ids, `records.personId` |
| `tenantId` | the isolation boundary | prefix of every document id |

One login may act for several people (a guardian recording for children), which
is why `claimedByPersonId` is a **separate field** from the record's own
`personId`.

---

## 1. The six roles

```js
// app/js/records.js:90 — and mirrored in app/js/people.js:24
const MEMBERSHIP_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];
```

Plus one that is **not** a membership: **`platformAdmin`**, a flag on the user
document spanning every tenant (invariant I10: it cannot be self-granted).

### owner
- **Purpose.** Runs the tenant. Created by `createTenantWithOwner()` (`identity.js:47`).
- **Permissions.** Everything within the tenant: `canAdminIdentity()`, `canAdminCatalogue()`, `canRecordFor()` for anyone.
- **Screens.** All, including the owner/prime-only ones: Classes, Curriculum, Taglines, and the Admin group (People, Catalogue).
- **Creates.** People, invites, classes, course offers, curriculum, resources, homework, catalogue content, Approach edits.
- **Approves.** Anyone's claims, tenant-wide.
- **Own study.** **Self-confirmed** — nothing stands over them (`records.js:124`).
- **Note.** `owner` is **never offered as a checkbox** on either the Add-person or Edit-person form (`people.js:20`, `EDITABLE_ROLES`).

### prime
- **Purpose.** A second administrator; "confirm anyone".
- **Permissions.** Effectively identical to owner in the rules — every helper tests `isOwnerIn(t) || isPrimeIn(t)`. **Could not confirm from code** any rules-level power an owner has that a prime does not; the difference appears to be intent and provenance, not enforcement.
- **Own study.** Self-confirmed.

### teacher
- **Purpose.** Teaches specific students and confirms their progress.
- **Permissions.** `canRecordFor()` succeeds **only** via `isCoEnrolledTeacherOf(tenantId, personId)` — a flat `exists()` on the denormalised `teacherStudentLinks` mirror, proving a shared class or course offer.
- **Screens.** Modules, Records, Monitor, Homework, Course Offers. **Not** Classes/Curriculum/Taglines/Admin.
- **Approves.** Claims of co-enrolled students only.
- **Own study.** Self-confirmed.
- **Documented gap.** Scope is **by student, not by subject**. A co-enrolled teacher has authority over that student across *every* subject, not only those on the enrolment's `subjectIds[]`. Recorded in the project's brief as an open question.
- **Second documented gap.** Homework/assignments is still tenant-wide-ish for teachers, narrowed by `isActiveTeacherInContext()` rather than per-student — see `isAssignmentCreator()`'s own comment in `firestore.rules`.

### guardian
- **Purpose.** A parent. Manages and confirms for their own children.
- **Permissions.** `isGuardianOf(tenantId, childPersonId)`; roster scoped to `p.id === myPersonId || p.managedByPersonId === myPersonId` (`session-context.js:160`).
- **Approves.** Their own children's claims.
- **Own study.** **Self-confirmed** — "a guardian studying, not as someone else's declared student, stands at the same level" (`records.js` comment).

### student
- **Purpose.** Learns; claims progress.
- **Permissions.** `isSelfPerson(personId)` only. Roster scoped to themselves alone.
- **Own study.** **Needs confirmation** — the only role that always does.
- **UI.** While a "View as Student" preview is active, confirm/return controls are not rendered at all (`app/records.html:332`, `canConfirm = viewAsRole !== "student"`). That is presentation; the rules are the enforcement.

### self
- **Purpose.** An independent adult learner with no guardian.
- **Own study.** Self-confirmed — *unless* `tenantPeople.managedByPersonId` is set, which forces confirmation regardless of role.

### platformAdmin (not a membership)
- Spans every tenant; required to write `modules/{moduleId}` (Layer 1 is platform-wide).
- Granted once by hand to the owner's own account (decision D14), deliberately outside any app flow, because I10 forbids self-granting.

---

## 2. Permission matrix

| Capability | owner | prime | teacher | guardian | student | self |
|---|---|---|---|---|---|---|
| Read own records | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Read others' records | all | all | co-enrolled only | own children | ✘ | ✘ |
| Claim for self | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Claim for another | all | all | co-enrolled | own children | ✘ | ✘ |
| **Confirm / return** | all | all | co-enrolled | own children | ✘ | ✘ |
| Own claims need approval | ✘ | ✘ | ✘ | ✘ | **✔** | ✘* |
| Add/edit people, invites | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Edit catalogue / Approaches | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Classes, Curriculum, Taglines | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Course Offers, Homework, Records, Monitor | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Backup | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| "View as" preview | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Write `modules` | platformAdmin only | | | | | |

\* unless `managedByPersonId` is set.

**Backup is deliberately not owner-only**, unlike Taglines beside it: it exports
exactly what the signed-in account may already read, so a guardian backing up
their children's notes reads nothing new.

---

## 3. Can one person hold multiple roles? — **Yes**

**Structurally supported and actively used.** Three independent confirmations
from the code:

**(a) One document per role.** `memberships/{tenantId}__{personId}__{role}` —
a person holding both `owner` and `guardian` simply has two documents. There is
no uniqueness constraint and no "primary role" field.

**(b) `roles` is an array**, carried on the `tenantMemberUids` mirror and read
straight into the session context:

```js
// app/js/session-context.js — getMyMemberships()
const memberships = snap.docs.map((d) => d.data()); // { tenantId, uid, personId, roles }
```

**(c) Every consumer tests membership, never equality.** Throughout the app the
pattern is `roles.includes("owner") || roles.includes("prime")` — never
`role === "owner"`. `getRosterRoles()` (`people.js:41`) fires one `getDoc()` per
possible role per person and returns **an array of every active role**.

### How the three named combinations behave

| Combination | Behaviour in the current code |
|---|---|
| **Owner + Student** | Works. But **owner wins for confirmation**: `computeConfirmationRequired()` returns `false` at the owner check *before* it ever reaches the student check. So an owner who is also a student is **self-confirmed** — their claims never wait for review. |
| **Owner + Guardian** | Works cleanly, and is the expected real-world shape for this project's actual owner. Owner grants tenant-wide admin; guardian grants `isGuardianOf()` for their own children. The two are additive with no conflict. |
| **Guardian + Teacher** | Works. `canRecordFor()` is a disjunction, so authority is the **union**: their own children *plus* co-enrolled students. |

**The general rule, stated exactly:** permissions are a **union** across roles
(every rules helper is `||`-joined), **except** for
`computeConfirmationRequired()`, which is an **ordered cascade** and stops at the
first match:

```js
// app/js/records.js:124 — order is significant
if (subjectOverride === true)  return true;
if (subjectOverride === false) return false;
if (roles.includes("owner") || roles.includes("prime")) return false;
if (roles.includes("teacher") || roles.includes("guardian")) return false;
if (await personIsManaged(db, personId)) return true;
if (roles.includes("student")) return true;
return false;
```

**Consequence worth flagging:** privilege is checked before studenthood, so
**any administrative or teaching role silently exempts a person from needing
approval**, even if they also hold `student`. That is a deliberate reading of
"a teacher's own study is self-confirmed" — but it means "Owner + Student"
cannot be used to make an owner's own claims reviewable.

**`managedByPersonId` is the one signal that overrides a role**, and it sits on
`tenantPeople`, not on memberships. A managed person needs confirmation whatever
roles they hold — except owner/prime/teacher/guardian, which return earlier.

---

## 4. "View as" — role preview

- **Who.** `CAN_VIEW_AS = new Set(["owner", "prime", "platformAdmin"])` (`session-context.js:123`).
- **What.** `effectiveRoles(realRoles, viewAsRole)` returns **`[viewAsRole]` alone** — a *collapse*, never a union: "View as only ever narrows what a screen displays, on top of permissions the viewer already, genuinely has."
- **Where stored.** In the active context, persisted in **localStorage**, so it survives reloads and can sit forgotten on a device for weeks.
- **Known trap** (recorded in the project's own standing lessons): `canAdminCatalogueClientSide()` is false while a preview is on, so a stale preview makes admin controls appear "missing". Check for one before hunting a layout bug.
- **Honest limitation, recorded in `nav.js`:** a teacher preview runs on top of the owner's own real access, so it **cannot prove** the teacher restriction actually holds.

---

## 5. Authentication architecture

- **Provider.** Google sign-in only — `GoogleAuthProvider` + `signInWithPopup` (`app/quranrevival.html:3691`). **No email/password, no anonymous auth.**
- **SDK.** Firebase **modular (ESM) v10.12.2**, loaded straight from Google's CDN — no npm, no bundler (decision D4).
- **Session.** Firebase's own persistence, plus `persistentLocalCache` with `persistentMultipleTabManager` (decision D5) so the app paints from local data with no network wait.
- **Per page.** Each page runs `onAuthStateChanged` → `bootstrapContext(db, uid, defaultTenantId)` → picks a tenant/role context → renders. There is **no router and no shared shell**: every page bootstraps itself.
- **Invites.** `invites.js` + `accept-invite.html`; links carry an opaque token from `inviteTokens` (decision D9) so an email address is never in a URL.

---

## 6. Authorisation architecture

**Two layers, and only one of them is real security.**

**(a) Firestore security rules — `firestore.rules`, 1,122 lines.** The only
server-side authority. The central gate:

```
function canRecordFor(tenantId, personId) {
  return canAdminIdentity(tenantId)
      || (isTeacherIn(tenantId) && isCoEnrolledTeacherOf(tenantId, personId))
      || isGuardianOf(tenantId, personId) || isSelfPerson(personId);
}
```

**(b) Client-side gating** — `renderNavBar()`, `canConfirm`, `scopedRoster()`.
This is presentation only.

### Four properties a new architect must know

1. **The rules do not distinguish claiming from confirming.** `canRecordFor()`
   is the same gate for both, so anyone who may write a record at all may set
   `confirmedStatus`. **The claim/confirm separation is client-side JavaScript
   only.**
2. **The rules never inspect `entries`.** They check only `tenantId` and
   `personId`. New unit keys, trackable ids and entry fields therefore need
   **no rules change**.
3. **Firestore rules can `get()`/`exists()` a fixed path but can NEVER run a
   query.** This single constraint explains two collections that exist purely to
   serve the rules — `tenantMemberUids` (uid→role) and `teacherStudentLinks`
   (teacher↔student). Any new rules-level check needs the same denormalised
   mirror.
4. **There is no delete rule anywhere** (I4 / D6).

### Two operational limits worth carrying forward

- **Rules `get()` budget.** Firestore allows 20 `get()`/`exists()` calls while evaluating rules for a batched write (10 for a single-document request), **per document in the batch**. Seeding all 71 catalogue rows in one batch was denied with a bare `permission-denied`; the fix in the code is `SEED_CHUNK_SIZE = 5` (`catalogue.js:127`).
- **Deterministic gets, never queries.** `getPersonRoles()` fires six parallel `getDoc()`s rather than one `where()` query, precisely because a rule cannot prove a list request safe.

---

## 7. The Study Mode handover lock (F-016)

`app/js/study-lock.js` — `acquireStudyLock()`, `releaseStudyLock()`,
`canSwitchTo()`.

Decision **D10** is explicit and binding: the lock engages **only** for an
explicit "hand this device to a child to study independently" action. A signed-in
owner or teacher picking people from a dropdown to log progress in turn is the
normal fast workflow and **must never** touch the lock, however many people are
recorded in sequence.



═══════════════════════════════════════════════════════════════════════════
FILE: 03-USER-JOURNEYS.md
═══════════════════════════════════════════════════════════════════════════

# 03 — User Journeys

QuranRevival v08.02 · every journey traced against the real code

Notation used throughout:

```
START → Screen/component → User action → Data change → Next screen → END
```

---

## Journey 1 — New user

```
START
  │
  ▼  app/index.html  (28 lines — a redirect stub only)
  │   redirects into the app
  ▼  app/quranrevival.html  — the landing page for everyone
  │
  │  ACTION: "Sign in with Google"
  │  CODE:   signInWithPopup(auth, new GoogleAuthProvider())   :4233
  ▼
  │  onAuthStateChanged fires                                   :11984
  │  CODE:   bootstrapContext(db, uid, defaultTenantId)
  │          → getMyMemberships()  = query tenantMemberUids by uid
  ▼
  ├── memberships.length === 0 ──▶ app/onboarding.html
  │                                 ACTION: create a tenant
  │                                 CODE:   createTenantWithOwner()  identity.js:47
  │                                 WRITES: tenants, tenantPeople, memberships,
  │                                         tenantMemberUids, userIndex
  │                                 THEN:   app/catalogue.html → seed the catalogue
  │                                 CODE:   ensureTenantCatalogueSeeded()  catalogue.js:152
  │                                 WRITES: 55 subjects + 39 trackables, in chunks of 5
  │                                 END (tenant ready)
  │
  └── has memberships ──▶ pickContext() chooses tenant + roles
                          ▼  loadContextData()                   :5458
                          END (study screen ready)
```

**Two things worth knowing.** The catalogue seed is an **explicit admin action
on `catalogue.html`**, not part of startup — a new tenant has no Approaches
until someone runs it. And it commits in **chunks of 5** because of the
Firestore rules `get()` budget (`SEED_CHUNK_SIZE`, `catalogue.js:127`).

**An alternative entry** exists via invitation: `app/accept-invite.html`
consumes an opaque token from `inviteTokens` and links a Google account to an
already-created `personId`.

---

## Journey 2 — Student Quran study (the spine of the app)

```
START  app/quranrevival.html
  │
  ▼  loadContextData()                                          :5458
  │    ONE parallel wave, deliberately (load-speed round):
  │      • tenantPeople  (roster, by tenantId)
  │      • tenants/{id}  (tenant doc — also carries approachSections)
  │      • getTrackables(db, tenantId)      ← THE 30 APPROACHES
  │      • getSurahIndex()                  ← static JSON, not Firestore
  ▼
  │  quranTrackables = allTrackables.filter(subjectId === "quran"
  │                                         && status !== "archived")   :5481
  ▼
  │  await Promise.all([ refreshProgramMap(), loadSurah() ])     :5518
  ▼
  │  refreshChunkAndWheel()                                      :5565
  │    reads records/{tenant}__{person}__surah_{n}   ← ONE document
  ▼
  │  renderWheel()                                               :5701
  │    approachStatusesForCurrentUnit()                          :5685
  │      → one segment per Approach, coloured by ITS OWN claim on THIS unit
  ▼
  SCREEN: Mastery Wheel + sidebar (Approach names, grouped by section since v08.02)
END
```

---

## Journey 3 — Selecting a Surah

```
START  Study options → Surah <select>
  │  ACTION: choose a surah
  │  CODE:   surahSelect change handler → loadSurah()
  │  DATA:   getSurah(n)  →  fetch /tools/quran-data-pull/output/surahs/surah_NNN.json
  │          (promise-cached per surah; the browser's HTTP cache makes repeats free)
  │  NOTE:   NO Firestore read for the text itself
  ▼
  │  refreshChunkAndWheel()  → reads records chunk `surah_{n}`   ← ONE Firestore read
  ▼
  │  renderWheel() + the reading screen re-render
END
```

Surah names come from `surah-index.json` (114 rows) and render through the i18n
layer, so a Bangla reader sees Bangla names with Bengali digits.

---

## Journey 4 — Selecting an Ayah

```
START  Study options → Ayah picker, OR the ▲▼ ayah-nav buttons, OR a wheel click
  │  ACTION: choose/step an ayah
  │  CODE:   currentAyahNum = n  →  renderWheel() + reading re-render
  │  DATA:   NO new fetch — the whole surah is already in memory
  ▼
  │  If the Study Unit is "ayah", the unit key changes with it:
  │     buildUnitKey.ayah(currentSurahNum, currentAyahNum)  →  "ayah:2:255"
  │  If the unit is wider (surah/juz/…), the ayah moves but the UNIT does not.
END
```

**A real subtlety.** `unitRendersWhole()` (`:4800`) decides whether an Ayah
picker is even offered: when the reading draws the *whole* chosen unit at once
and that unit spans more than one ayah, nothing on screen depends on which ayah
is "current", so the picker would move nothing. Mushaf-over-single-ayah is the
one whole-unit view that still needs it.

---

## Journey 5 — Studying an Approach

```
START  Mastery Wheel
  │  ACTION: tap a wheel slice (or its sidebar row)
  │  CODE:   attachScopedWheelClickHandler → cb(seg.dataset.key)   mastery-wheel.js:346
  │          the key is the trackableId
  ▼
  │  changeCurrentTrackable(id)                                   :5793
  │  → opens the NOTE VIEW, scoped to (this Approach × the current unit)
  ▼
  SCREEN: Note view
  │   • the Approach's Guide (What / How / Measure) — renderGuideTab()
  │   • the panels the Approach's own `panels[]` declares
  │   • the Track card, with a status picker and a Claim button
  ▼
  │  PANELS resolved by ayah-renderer.js:206
  │     PANEL_ORDER = ["text","tajweed","wordByWord","root","derivatives",
  │                    "notes","reflection","writing","checklist"]
  │     plus transport controls: audio, loop, timer, resource
END
```

**A panel name not in the map renders nothing, silently.** And `root` /
`derivatives` are built but declared by **no** Approach — see document 10.

---

## Journey 6 — Updating learning status  ·  Journey 7 — Claiming progress

These are one journey in the code — **the single most important trace in the
application.**

```
START  Note view → Approach card → status <select> → "Claim"
  │
  ▼  wireApproachEmbed()'s claim handler          app/quranrevival.html:10967
  │    assignees = checkedAssignees(...)          ← may be SEVERAL people at once
  │
  ▼  safeWrite(() => claimStatus(db, {...}))      errors.js:107   (I15)
  │
  ▼  claimStatus()                                app/js/records.js:154
  │    1. isValidStatus(statusId)                 ← throws on an unknown status
  │    2. chunkKeyFor(unitKey, subjectId)         records.js:53
  │         ayah|range|surah|ruku  → "surah_{n}"
  │         juz|hizb|page|…        → "subject_quran"
  │    3. entryKey = `${unitKey}::${trackableId}`
  │    4. getSubjectConfirmationOverride()        ← READ subjects/{t}__quran
  │    5. computeConfirmationRequired()           ← 6 role gets + 1 tenantPeople get
  │    6. getDoc(records/{t}__{p}__{chunk})       ← previous entry
  │                                                 ── 9 reads in total ──
  ▼  WRITE — a dot-path update on ONE entry, never the whole map
  │    updateDocument(..., { [`entries.${entryKey}`]: entry })   records.js:189
  │
  │    self-confirmed →  confirmState "confirmed", confirmedStatus := statusId
  │    needs approval →  confirmState "pending",   confirmedStatus UNCHANGED (I6)
  │
  ▼  logActivity(db, {...})                       activity.js
  │    appends to activity/{t}__{p}__{weekKey}    ← audit log, one doc per week
  │
  ▼  RE-READ the document the claim landed in
  │    chunkKey === "subject_quran" → ensureQuranSubjectChunk({force:true}); renderWheel()
  │    otherwise                    → refreshChunkAndWheel()
  ▼  renderNoteViewNow()  — rebuilds the card against the fresh chunk
  ▼  WHEEL RECOLOURS
END
```

**Note the multi-assignee shape.** One press can claim for several people
(`Promise.all(assignees.map(...))`), which is decision D10's "teach several
children, then log each in turn" workflow made real.

---

## Journey 8 — Teacher approval

```
START  app/records.html   ← the ONLY confirm/return UI in the application
  │
  ▼  loadContextData()                             records.html:316
  │    parallel: roster, tenant doc, subject tree, trackables, domains
  │    canConfirm = viewAsRole !== "student"        :332
  ▼  choose a person → choose a chunk → optional "Pending only" filter
  │    getRecordsChunk()  /  listPendingForPerson()
  ▼  renderEntries()                                :428
  │
  ├── ACTION "Confirm" ──▶ confirmEntry()           records.js:201
  │      WRITES: confirmedStatus := claimedStatus  ← FROZEN (I6)
  │              confirmState := "confirmed"
  │              confirmedByPersonId, confirmedAt stamped
  │
  ├── ACTION "Return"  ──▶ returnEntry()            records.js:219
  │      WRITES: confirmState := "returned", returnNote
  │      LEAVES: confirmedStatus / confirmedAt UNTOUCHED
  │
  └── ACTION bulk ──▶ bulkConfirmChunk (a surah) | bulkConfirmWeek (a week)
                      | bulkConfirmAllPendingForPerson | bulkConfirmClass
  ▼  refreshChunk() → table re-renders
END
```

```
⚠ THE JOURNEY STOPS HERE.

No wheel changes. No Explore colour changes. Nothing else in the application
reads confirmedStatus — every visual surface reads claimedStatus. A RETURNED
claim still shows green on the Mastery Wheel.
```

---

## Journey 9 — Guardian interaction

```
START  any page
  ▼  bootstrapContext → roles include "guardian"
  ▼  scopedRoster(roster, effRoles, myPersonId)     session-context.js:160
  │    → roster.filter(p => p.id === myPersonId || p.managedByPersonId === myPersonId)
  ▼  the Person <select> shows only themselves + their own children
  │
  ├── study/claim FOR a child:
  │     personId = child, claimedByPersonId = guardian
  │     computeConfirmationRequired(child) → child is managed → TRUE → pending
  │
  ├── confirm the child's claims: records.html, via isGuardianOf()
  │
  └── their OWN study: self-confirmed (guardian returns false at the role check)
END
```

---

## Journey 10 — Viewing Explore

```
START  Quran study screen → Explore tab                          :6426
  ▼  openExplore()                                                :6094
  ▼  ensureExploreChunksLoaded()                                  :6647
  │    getJuzIndex(), getPageIndex()                    ← static JSON
  │    expand all 30 juz through ayahCoverage() → the set of surahs touched
  │    Promise.all → getRecordsChunk("surah_N") for EACH        ≤114 reads
  │    + ensureQuranSubjectChunk({force:true})                    +1 read
  │    + buildExploreWiderSpans()                                 :6561
  ▼  ── UP TO 115 FIRESTORE DOCUMENT READS, ONCE PER OPEN ──
  ▼  renderExplore()  → router on exploreLevel                    :6801
  │     quran → juz → surah → ruku'
  ▼  every level renders FROM MEMORY — drilling deeper costs no further reads
END
```

---

## Journey 11 — Viewing the progress wheel

**There are two wheels with opposite axes. Confusing them is the easiest
mistake to make in this codebase.**

```
LANDING MASTERY WHEEL                        EXPLORE WHEEL
one segment per APPROACH                     one segment per QURAN UNIT
fixed: the current unit                      fixed: the selected Approach
NO aggregation — direct claim only           pooling (floor down, weakest-link up)
1 Firestore read                             up to 115 per open
        └──────── both rendered by renderScopedWheel() ────────┘
                       mastery-wheel.js:300
```

```
START (landing)
  ▼ currentUnitInfo()                                             :4806
  ▼ chunkForUnitInfo() / ensureUnitChunkThen()                    :5655 / :5665
  ▼ approachStatusesForCurrentUnit()                              :5685
  │    statusId = entries[`${unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started"
  ▼ renderScopedWheel(items, { centerArabic, centerRef })
  ▼ + renderWheelSidebar() + renderWheelLegend()
END
```

**Why the landing wheel does not aggregate**, in the code's own words: the card a
slice opens claims *this* unit, so a green slice over "Not claimed yet" would be
the screen contradicting itself. **Consequence: a Juz whose every ayah is
mastered still reads `not_started` here until the Juz itself is claimed.**

---

## Journey 12 — Switching study units

```
START  the "Choose a Unit" gold capsule above the wheel (v07.139)
  ▼  a bar-palette popover opens                      bar-palette.js
  │    Study Unit · the unit's own number · From/To for a Range
  │    EVERY control is a MIRROR of the canonical one in Study options
  ▼  goToUnitNumber()                                             :4986
  ▼  currentUnitInfo() now returns a different unitKey + chunkKey  :4806
  │
  ├── ayah / range / surah / ruku'  → chunkKey "surah_{n}"    ALREADY IN MEMORY
  │
  └── juz / hizb / page             → chunkKey "subject_quran"  ← A DIFFERENT DOCUMENT
        ensureQuranSubjectChunk()                               :5628
        fetched ON FIRST USE, cached per person, then renderWheel() re-runs
        → someone who never picks these three NEVER fetches it (invariant I9)
  ▼  renderWheel() recolours: same 30 Approaches, now against the new unit key
END
```

---

## Journey 13 — Word-by-word study

```
START  Study options (or the reading badge's ⋮ menu)
  ▼  tick "Word by Word" / "Root" / "Derivatives"
  │    canonical checkboxes: wbwShowToggle / rootsToggle / derivativesToggle   :3445–3457
  │    the ⋮ menu flips the SAME checkboxes                ayah-note-renderer.js:802
  ▼  gate: canWbwRoot = noteScopeCanWbwRoot()                     :9801
  ▼  per-ayah strips rendered by ayah-renderer.js
  │    renderWordByWordPanel()  :113   Arabic + transliteration + gloss
  │    renderRootPanel()        :155   word + root + rootCount badge
  │    renderDerivativesPanel() :177   word + POS + lemma
  ▼  DATA: already in memory — the words come from the loaded surah JSON
END
```

```
⚠ THERE IS NO WORD CLICK.

Verified across the whole application: no click handler anywhere references a
word, and `.wbw-word` carries no pointer cursor. `data-position` is emitted but
nothing listens to it. The word-by-word system is READ-ONLY DISPLAY.
```

---

## Journey 14 — Topic-module study (six modules share one journey)

```
START  Modules → Deen Study / Arabic / Hadith / General / Nature-Life / Life Skill
  ▼  a ~149-line shell page calls:
  │    initTopicStudyPage({ moduleId, trackableId, rootSubjectId })   topic-study.js
  ▼  browse the SUBJECT TREE (branch → branch → leaf)
  │    the tree IS the topic hierarchy — Phase 2's isTrackable/ancestorIds,
  │    not a second parallel structure
  ▼  a leaf topic → open its resource → Way modal → Claim
  │    unitKey = buildUnitKey.topic(topicId)     → "topic:xyz"
  │    chunkKey = `subject_{subjectId}`
  ▼  claimStatus()  — the SAME single write path
END
```

**Health and Learn Deen On-the-Go** use `initRoutineStudyPage()` instead — same
shape, plus a per-occurrence day log and a streak count. **Asma ul Husna** uses
`initAsmaStudyPage()` with `buildUnitKey.name(number)`.

---

## Journey 15 — Other real journeys, in brief

| Journey | Entry | Code |
|---|---|---|
| **Bookmark / resume** | the bookmark badge; Continue strip | `bookmarks.js`, `continue-strip.js`, `bookmark-nav.js`, `bookmark-popover.js` |
| **Ayah notes** | Note view → Notes | `ayah-notes.js`, `note-popup.js` — rich text, one doc per person keyed by unitKey |
| **Audio recitation** | the transport bar | `audio-player.js` (1,042 lines) — *fetches archive.org, blocked in this sandbox* |
| **Search** | the Search control | `quran-search.js` + `search-{en,ar,bn}.json`, fetched on first use only |
| **Monitor / reports** | Operation → Monitor | `monitor.js` — weekly/monthly, CSV export, print |
| **Homework** | Operation → Homework | `homework.js` — assign, mark, score |
| **Backup** | Home → Settings → Backup | `backup.js` + `backup-file.js` — one self-contained offline HTML file |
| **Ayah Collections (QCR)** | Explore palette | `qcr.js`, `qcr-data.js` — tenant-authored cross-surah collections |

---

## Confusing or complex journeys — observations only

**1. The two wheels have opposite axes.** Landing = Approaches for one unit;
Explore = units for one Approach. Both use the same renderer and look alike.
This is the single most likely misreading of the codebase.

**2. Approval is a dead end visually.** A teacher confirms, and *nothing on any
wheel changes* — because everything reads `claimedStatus`. A returned claim
still shows green. This is a real architectural inconsistency, documented here
and not fixed.

**3. The landing wheel and Explore disagree on purpose.** A Juz whose ayahs are
all mastered reads `not_started` on the landing wheel and green in Explore. Both
are correct for their own screen; the difference is invisible on screen.

**4. The claim journey costs 9 reads before its write** — and multiplies by the
number of assignees.

**5. Explore's 115-read open** is by far the heaviest operation in the app.

**6. Study Unit vs. current ayah** — with a wide unit selected, moving the ayah
changes the reading screen but *not* the unit being claimed. `unitRendersWhole()`
hides the Ayah picker where it would move nothing, which helps, but the mental
model still takes a moment.

**7. `subject_quran` is fetched lazily and can briefly read `not_started`.**
The first time a Juz/Hizb/Page unit is picked, the wheel honestly shows
"unfetched" until `ensureUnitChunkThen()` lands and redraws.

**8. A stale "View as" preview survives in localStorage** across reloads and
devices, and makes admin controls look missing — a recorded trap.



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
FILE: 05-ALL-APPROACHES.md
═══════════════════════════════════════════════════════════════════════════

# 05 — All Approaches (complete)

QuranRevival v08.02 · **all 30 Approaches, individually documented**

Generated by importing `app/js/catalogue-data.js` directly and printing every
field, so nothing here is transcribed by hand.

---

## How to read this document

**Every Approach shares the same technical profile**, because an Approach
carries no per-item logic at all. Rather than repeat identical rows 30 times,
the shared profile is stated once here and only the **differing** fields appear
in each entry below.

### Shared by all 30

| Property | Value for every Approach |
|---|---|
| **Subject** | `quran` (the single leaf of the QuranRevival subject tree) |
| **Module** | `quranrevival` |
| **Firestore document** | `trackables/{tenantId}__{approach_NN}` |
| **Supported study units** | **All seven** — `ayah`, `range`, `surah`, `ruku`, `juz`, `hizb`, `page`. An Approach declares **no** unit restriction anywhere; the pairing is a free cross-product formed at claim time |
| **Tracking behaviour** | Identical. One records entry keyed `${unitKey}::${trackableId}`, carrying the six-value status ramp, `confirmState`, and a frozen `confirmedStatus` |
| **Explore behaviour** | Identical. Selectable one at a time in Explore's Approach list; its claims are pooled by `poolCoverageStatus()` (weakest-link up) and floored by `effectiveAyahStatus()` (max down) |
| **Data sources** | The static Quran JSON for content; `records` for progress. No Approach has a data source of its own |
| **Status** | `active` (a removed one becomes `archived` and leaves the wheel, keeping its claims) |
| **Editable since** | v08.01 — both names, section, position, and all three Guide texts; plus **Remove** |

### Relevant files — the same set for all 30

| File | Role |
|---|---|
| `app/js/catalogue-data.js:222` | `APPROACH_TEMPLATES` — the seed (the only place the 30 are written down) |
| `app/js/catalogue.js:152` | `ensureTenantCatalogueSeeded()` — copies the seed into a tenant |
| `app/js/catalogue.js:301` | `getTrackables()` — the read every consumer uses |
| `app/js/catalogue.js:561` | `reorderTrackables()` — position |
| `app/js/catalogue.js:641` | `saveApproachSections()` — sections (v08.02) |
| `app/js/catalogue.js:541` | `setTrackableStatus()` — Remove/Restore |
| `app/catalogue.html` | the editor UI |
| `app/quranrevival.html:5481` | the filter that makes a trackable "an Approach" |
| `app/quranrevival.html:5701` | `renderWheel()` — one slice each |
| `app/js/way-modal.js` | Track / Guide / Breakdown / Coverage card |
| `app/js/ayah-renderer.js:206` | resolves `panels[]` into real UI |

### What "Panels" means

The `panels[]` array is what the learner actually gets on screen. Nine names are
resolved by `ayah-renderer.js`; four more are transport controls wired
separately by `audio-player.js`.

| Panel | Rendered by | What the learner sees |
|---|---|---|
| `text` | `renderArabicPanel()` + `renderTranslationPanel()` | Arabic + translation |
| `tajweed` | a toggle on the text panel | tajweed-coloured text |
| `wordByWord` | `renderWordByWordPanel()` :113 | per-word Arabic + transliteration + gloss |
| `root` | `renderRootPanel()` :155 | word + root + whole-Quran root count |
| `derivatives` | `renderDerivativesPanel()` :177 | word + part-of-speech + lemma |
| `notes` | a textarea | free notes |
| `reflection` | a textarea | a reflection box |
| `writing` | a textarea | a place to write the text out |
| `checklist` | a checkbox | a "done" tick |
| `audio`, `loop`, `timer` | `audio-player.js` | recitation transport |
| `resource` | topic/routine renderers | an attached resource (non-Quran modules) |

**A panel name not in the map renders nothing, silently.**

### Panel usage across all 30 — measured

| Panel | Declared by | Approaches (by order) |
|---|---|---|
| `text` | **20** | 1, 2, 3, 4, 6, 9, 13, 14–26 |
| `notes` | 19 | 3, 6, 8, 10, 13, 14–22, 24, 25, 27, 29, 30 |
| `reflection` | 14 | 14–26, 28 |
| `audio` | 7 | 1, 2, 3, 7, 8, 9, 11 |
| `checklist` | 6 | 2, 9, 27, 28, 29, 30 |
| `loop` | 6 | 1, 2, 7, 8, 9, 11 |
| `timer` | 4 | 2, 20, 21, 30 |
| `writing` | 3 | 5, 10, 12 |
| `wordByWord` | **1** | **only Approach 4** |
| `tajweed` | **1** | only Approach 1 |
| **`root`** | **0** | **none — built but unused** |
| **`derivatives`** | **0** | **none — built but unused** |

Counted by importing the templates, not by eye. Note that **Approach 5 (Arabic
Writing) and Approach 12 (Calligraphy) declare `writing` alone** — they are the
only Approaches with no `text` and no `notes`.

> **Two panels are fully implemented and declared by no Approach.** `root` and
> `derivatives` render real root/lemma/POS data but are reachable only through
> the reading screen's own toggles. Enabling them for an Approach is a data
> edit, not code.

---

## Section summary

| § | Section | Approaches | Count |
|---|---|---|---|
| 1 | Building Foundation / Learning Tools | 1–6 | 6 |
| 2 | Engagement / Attachment | 7–13 | 7 |
| 3 | Critical Reasoning: Nazar / 'Aql | 14–15 | 2 |
| 4 | Critical Reasoning: Applied Threads | 16–19 | 4 |
| 5 | Critical Reasoning: Tafakkur / Tadabbur | 20–23 | 4 |
| 6 | Critical Reasoning: Judgement / Authority | 24–26 | 3 |
| 7 | A'mal / Application | 27–30 | 4 |
| | | **Total** | **30** |

Since **v08.02** these seven are the tenant's own: editable, reorderable, and
stored as an additive `approachSections` field on `tenants/{tenantId}`. A
section is a **contiguous block of the running order** — an invariant introduced
by the grouped table.

---

## The complete list

Below, for each Approach: its id, order, section, Bangla name, panels, and the
three Guide texts (**What / How / Measure**) that the Note view's Guide tab
prints live. **The "Measure" line is the closest thing to "what the learner
actually does to progress"** — it is the app's own answer, shown to the learner.

Three Approaches carry the shared generic measure ("This approach is about the
practice itself — a specific measure is not required to make progress here"),
which the seed calls `GENERIC_MEASURE`. Verified: exactly three carry it —
**Approach 11 (Ruqyah Listening), 23 (Dhikr / Tadhakkur) and 26 (Authority —
Hukm / Tahakum)**.


### Section 1 — Building Foundation / Learning Tools  (6 Approaches)

#### 1. Reading (with Tajweed)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_01` |
| **Order** | 1 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | তাজবিদসহ তিলাওয়াত |
| **Panels** | `text`, `audio`, `loop`, `tajweed` |
| **What** | Reciting the Arabic text accurately, applying the rules of tajweed. |
| **How** | Read aloud from the mushaf, applying each tajweed rule as it appears; use the audio and repeat/loop tools to match a reciter. |
| **Measure** | How much of the assigned portion you can read correctly, with tajweed rules applied, without correction. |

#### 2. Hifz / Memorising

| Field | Value |
|---|---|
| **Trackable ID** | `approach_02` |
| **Order** | 2 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | হিফজ / মুখস্থকরণ |
| **Panels** | `text`, `audio`, `loop`, `timer`, `checklist` |
| **What** | Committing ayahs to memory so they can be recited without looking at the text. |
| **How** | Repeat a short portion aloud in a loop until it is secure, then recite it from memory and check against the text. |
| **Measure** | How much can be recited from memory, start to finish, without a mistake. |

#### 3. Reading (with Meaning)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_03` |
| **Order** | 3 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | অর্থসহ পাঠ |
| **Panels** | `text`, `audio`, `notes` |
| **What** | Reading the Arabic text alongside its translation to understand what is being read. |
| **How** | Read a passage, then read its meaning; go back and forth until the meaning is clear. |
| **Measure** | Whether you can explain in your own words what the passage you read means. |

#### 4. Reading — Word-by-Word Meaning

| Field | Value |
|---|---|
| **Trackable ID** | `approach_04` |
| **Order** | 4 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | শব্দে শব্দে অর্থসহ পাঠ |
| **Panels** | `text`, `wordByWord` |
| **What** | Learning the meaning of each individual Arabic word in a passage. |
| **How** | Use the word-by-word panel to see each word's meaning underneath it while reading. |
| **Measure** | How many of the words in the assigned portion you can translate without the panel. |

#### 5. Arabic Writing

| Field | Value |
|---|---|
| **Trackable ID** | `approach_05` |
| **Order** | 5 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | আরবি লিখন অনুশীলন |
| **Panels** | `writing` |
| **What** | Practising writing the Arabic letters and words of the text by hand. |
| **How** | Copy the assigned text by hand, letter by letter, checking each word against the original. |
| **Measure** | Whether the written copy matches the original accurately. |

#### 6. Language Learning (Basic Grammar)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_06` |
| **Order** | 6 |
| **Section** | 1 — Building Foundation / Learning Tools |
| **Name (bn)** | ভাষা শিক্ষা (মৌলিক ব্যাকরণ) |
| **Panels** | `text`, `notes` |
| **What** | Learning the basic Arabic grammar needed to read and understand Quranic text. |
| **How** | Study one grammar point at a time and find examples of it in the text being studied. |
| **Measure** | Whether you can identify the grammar point being studied in a new, unseen ayah. |


### Section 2 — Engagement / Attachment  (7 Approaches)

#### 7. Listening Attentively (Arabic only)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_07` |
| **Order** | 7 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | মনোযোগ সহকারে শ্রবণ (শুধু আরবি) |
| **Panels** | `audio`, `loop` |
| **What** | Listening to the Arabic recitation with full attention, without reading along. |
| **How** | Play the audio and listen without looking at the text; use loop for a shorter passage. |
| **Measure** | Whether you can follow along and recognise where you are in the recitation. |

#### 8. Listening Attentively (Arabic with meaning)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_08` |
| **Order** | 8 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | মনোযোগ সহকারে শ্রবণ (অর্থসহ আরবি) |
| **Panels** | `audio`, `loop`, `notes` |
| **What** | Listening to the recitation while also taking in its meaning. |
| **How** | Listen to the audio with the translation visible or read alongside it. |
| **Measure** | Whether you can explain the meaning of what was just heard. |

#### 9. Dua Memorising

| Field | Value |
|---|---|
| **Trackable ID** | `approach_09` |
| **Order** | 9 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | দোয়া মুখস্থকরণ |
| **Panels** | `text`, `audio`, `loop`, `checklist` |
| **What** | Memorising a specific dua, in Arabic, with its meaning. |
| **How** | Repeat the dua aloud in short phrases, building up to the whole dua, checking the meaning as you go. |
| **Measure** | Whether the dua can be recited from memory, correctly, with its meaning known. |

#### 10. Journaling

| Field | Value |
|---|---|
| **Trackable ID** | `approach_10` |
| **Order** | 10 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | দিনলিপি লেখা |
| **Panels** | `writing`, `notes` |
| **What** | Writing personal notes and reflections about what has been studied. |
| **How** | After a study session, write a few lines about what stood out and why. |
| **Measure** | Whether a journal entry has been written for the session. |

#### 11. Ruqyah Listening

| Field | Value |
|---|---|
| **Trackable ID** | `approach_11` |
| **Order** | 11 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | রুকইয়াহ শ্রবণ |
| **Panels** | `audio`, `loop` |
| **What** | Listening to ruqyah recitation for protection and comfort. |
| **How** | Play the ruqyah audio in a quiet setting and listen attentively, using loop as needed. |
| **Measure** | This approach is about the practice itself -- a specific measure is not required to make progress here. |

#### 12. Calligraphy

| Field | Value |
|---|---|
| **Trackable ID** | `approach_12` |
| **Order** | 12 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | ক্যালিগ্রাফি (হস্তলিপি শিল্প) |
| **Panels** | `writing` |
| **What** | Practising the artistic writing of Arabic script. |
| **How** | Copy a short phrase or ayah using calligraphy strokes, following a model. |
| **Measure** | Whether the calligraphy piece is complete and legible. |

#### 13. Story Learning

| Field | Value |
|---|---|
| **Trackable ID** | `approach_13` |
| **Order** | 13 |
| **Section** | 2 — Engagement / Attachment |
| **Name (bn)** | কাহিনি থেকে শিক্ষা |
| **Panels** | `text`, `notes` |
| **What** | Learning the stories connected to the ayah or surah being studied. |
| **How** | Read or listen to the story, then retell it in your own words. |
| **Measure** | Whether the story can be retold accurately, in the right order. |


### Section 3 — Critical Reasoning: Nazar / 'Aql  (2 Approaches)

#### 14. Beginner's Level — Observation (Nazar)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_14` |
| **Order** | 14 |
| **Section** | 3 — Critical Reasoning: Nazar / 'Aql |
| **Name (bn)** | প্রাথমিক স্তর — পর্যবেক্ষণ (নজর) |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Noticing what the text actually says, plainly, before interpreting it. |
| **How** | Read the ayah slowly and list what it literally describes or states. |
| **Measure** | Whether the plain content of the ayah can be described accurately. |

#### 15. Primary Level — Common Sense ('Aql / Ta'aqqul)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_15` |
| **Order** | 15 |
| **Section** | 3 — Critical Reasoning: Nazar / 'Aql |
| **Name (bn)** | প্রাথমিক স্তর — সাধারণ বিবেচনা (আকল / তা'আক্কুল) |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Applying ordinary reasoning to what has been observed in the text. |
| **How** | Ask what the observation means in plain, common-sense terms. |
| **Measure** | Whether a sensible, reasoned point can be drawn from the observation. |


### Section 4 — Critical Reasoning: Applied Threads  (4 Approaches)

#### 16. Deriving Dua

| Field | Value |
|---|---|
| **Trackable ID** | `approach_16` |
| **Order** | 16 |
| **Section** | 4 — Critical Reasoning: Applied Threads |
| **Name (bn)** | দোয়া উদ্ভাবন |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Finding duas embedded in or suggested by the ayah. |
| **How** | Look for language of asking, praising, or turning to Allah, and draw out the dua in it. |
| **Measure** | Whether a dua has been correctly identified and articulated from the text. |

#### 17. Deriving Names & Attributes of Allah

| Field | Value |
|---|---|
| **Trackable ID** | `approach_17` |
| **Order** | 17 |
| **Section** | 4 — Critical Reasoning: Applied Threads |
| **Name (bn)** | আল্লাহর নাম ও গুণাবলি উদ্ভাবন |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Identifying the Names and Attributes of Allah mentioned or implied in the ayah. |
| **How** | Look for a Name or Attribute in the text, and explain what it means here. |
| **Measure** | Whether the Name or Attribute has been correctly identified and explained. |

#### 18. Deriving Understanding of the Prophets

| Field | Value |
|---|---|
| **Trackable ID** | `approach_18` |
| **Order** | 18 |
| **Section** | 4 — Critical Reasoning: Applied Threads |
| **Name (bn)** | নবীগণ সম্পর্কে উপলব্ধি অর্জন |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Learning about the Prophets (peace be upon them) through what the ayah says about them. |
| **How** | Identify what the ayah teaches about a Prophet's character, trial, or example. |
| **Measure** | Whether a clear lesson about a Prophet has been drawn from the text. |

#### 19. Reflecting on the Miracles

| Field | Value |
|---|---|
| **Trackable ID** | `approach_19` |
| **Order** | 19 |
| **Section** | 4 — Critical Reasoning: Applied Threads |
| **Name (bn)** | মু'জিযা নিয়ে চিন্তা-ভাবনা |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Reflecting on the miracles mentioned in the Quran and what they point to. |
| **How** | Identify the miracle in the text and consider what it demonstrates about Allah's power. |
| **Measure** | Whether the miracle and its significance have been clearly identified. |


### Section 5 — Critical Reasoning: Tafakkur / Tadabbur  (4 Approaches)

#### 20. Intermediate Level — Reflecting / Pondering (Tafakkur)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_20` |
| **Order** | 20 |
| **Section** | 5 — Critical Reasoning: Tafakkur / Tadabbur |
| **Name (bn)** | মধ্যম স্তর — চিন্তা-ভাবনা (তাফাক্কুর) |
| **Panels** | `text`, `reflection`, `notes`, `timer` |
| **What** | Pondering the meaning of the ayah beyond its surface reading. |
| **How** | Sit with the ayah and ask what it means for life, without rushing to an answer. |
| **Measure** | Whether a genuine reflection has been recorded, not just a restatement. |

#### 21. Advanced Level — Deep Contemplation (Tadabbur)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_21` |
| **Order** | 21 |
| **Section** | 5 — Critical Reasoning: Tafakkur / Tadabbur |
| **Name (bn)** | উচ্চতর স্তর — গভীর অনুধ্যান (তাদাব্বুর) |
| **Panels** | `text`, `reflection`, `notes`, `timer` |
| **What** | Going deeper than reflection — contemplating connections, causes, and implications. |
| **How** | Consider how the ayah connects to other ayahs, to life, and to one's own state. |
| **Measure** | Whether the contemplation shows a connection made, not only an observation. |

#### 22. Higher Level — Understanding / Fiqh (Tafaqquh)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_22` |
| **Order** | 22 |
| **Section** | 5 — Critical Reasoning: Tafakkur / Tadabbur |
| **Name (bn)** | উচ্চ স্তর — বোঝাপড়া / ফিকহ (তাফাক্কুহ) |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Building a structured understanding of what the ayah requires or teaches. |
| **How** | Work out the practical understanding the ayah leads to, referring to established knowledge where needed. |
| **Measure** | Whether a sound, structured understanding has been reached. |

#### 23. Upper Higher Level — Dhikr / Tadhakkur

| Field | Value |
|---|---|
| **Trackable ID** | `approach_23` |
| **Order** | 23 |
| **Section** | 5 — Critical Reasoning: Tafakkur / Tadabbur |
| **Name (bn)** | অতি উচ্চ স্তর — যিকর / তাযাক্কুর |
| **Panels** | `text`, `reflection` |
| **What** | Letting the understanding turn into active remembrance of Allah. |
| **How** | Return to the ayah's meaning in moments of daily life, as a reminder. |
| **Measure** | This approach is about the practice itself -- a specific measure is not required to make progress here. |


### Section 6 — Critical Reasoning: Judgement / Authority  (3 Approaches)

#### 24. Mastery Level — Where Fiqh turns to Ruling (9:122 pivot)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_24` |
| **Order** | 24 |
| **Section** | 6 — Critical Reasoning: Judgement / Authority |
| **Name (bn)** | দক্ষতা স্তর — ফিকহ থেকে বিধানে রূপান্তর (৯:১২২) |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Reaching the point where understanding becomes a basis for a considered ruling. |
| **How** | Work from the understanding gathered so far toward a reasoned conclusion, under guidance. |
| **Measure** | Whether a reasoned, sound conclusion has been reached and can be explained. |

#### 25. Judgment (Fahm)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_25` |
| **Order** | 25 |
| **Section** | 6 — Critical Reasoning: Judgement / Authority |
| **Name (bn)** | বিচার-বুদ্ধি (ফাহম) |
| **Panels** | `text`, `reflection`, `notes` |
| **What** | Exercising sound judgement in applying what has been understood. |
| **How** | Apply the understanding to a real situation and judge what it calls for. |
| **Measure** | Whether the judgement made is sound and well-explained. |

#### 26. Authority — Hukm / Tahakum

| Field | Value |
|---|---|
| **Trackable ID** | `approach_26` |
| **Order** | 26 |
| **Section** | 6 — Critical Reasoning: Judgement / Authority |
| **Name (bn)** | কর্তৃত্ব — হুকুম / তাহাক্কুম |
| **Panels** | `text`, `reflection` |
| **What** | Recognising the authority of a ruling once soundly reached. |
| **How** | Identify what ruling or authority the understanding leads to, and why it holds. |
| **Measure** | This approach is about the practice itself -- a specific measure is not required to make progress here. |


### Section 7 — A'mal / Application  (4 Approaches)

#### 27. Group / Class Discussion

| Field | Value |
|---|---|
| **Trackable ID** | `approach_27` |
| **Order** | 27 |
| **Section** | 7 — A'mal / Application |
| **Name (bn)** | দলীয় / ক্লাস আলোচনা |
| **Panels** | `notes`, `checklist` |
| **What** | Discussing what has been learned with others. |
| **How** | Share what you learned in a group or class setting and listen to others' points. |
| **Measure** | Whether you took part in a discussion about the material. |

#### 28. Living by it (Self-Assessment)

| Field | Value |
|---|---|
| **Trackable ID** | `approach_28` |
| **Order** | 28 |
| **Section** | 7 — A'mal / Application |
| **Name (bn)** | বাস্তবায়ন (আত্ম-মূল্যায়ন) |
| **Panels** | `reflection`, `checklist` |
| **What** | Honestly assessing whether you are living by what you have learned. |
| **How** | Reflect on a recent situation and ask whether it matched what was learned. |
| **Measure** | Whether an honest self-assessment has been recorded. |

#### 29. Da'wah — Sharing Knowledge / Calling Others

| Field | Value |
|---|---|
| **Trackable ID** | `approach_29` |
| **Order** | 29 |
| **Section** | 7 — A'mal / Application |
| **Name (bn)** | দাওয়াহ — জ্ঞান বিতরণ / অপরকে আহ্বান |
| **Panels** | `notes`, `checklist` |
| **What** | Sharing what has been learned with someone else, inviting them toward it. |
| **How** | Explain a point you have learned to someone else, in your own words. |
| **Measure** | Whether the knowledge was shared with at least one other person. |

#### 30. Teaching Others

| Field | Value |
|---|---|
| **Trackable ID** | `approach_30` |
| **Order** | 30 |
| **Section** | 7 — A'mal / Application |
| **Name (bn)** | অপরকে শিক্ষাদান |
| **Panels** | `notes`, `checklist`, `timer` |
| **What** | Teaching what has been learned to someone else in a structured way. |
| **How** | Prepare a short explanation of the topic and teach it to another person. |
| **Measure** | Whether the topic was taught, and whether the learner understood it. |


---

## What a learner actually does — grouped

Rather than restate each Guide (printed in full above), here is the **shape of
the activity** by section:

- **§1 Foundation (1–6).** Mechanical skill-building on the text itself: recite
  with tajweed, memorise, read with meaning, learn each word, write the Arabic,
  learn the grammar. These are the only Approaches with `tajweed` and
  `wordByWord` panels.
- **§2 Engagement (7–13).** Building relationship rather than skill: listen
  (with and without meaning), memorise duas, journal, ruqyah, calligraphy,
  stories. Audio-heavy; two are `writing`-only.
- **§3 Observation (14–15).** Say plainly what the ayah states, then reason
  ordinarily about it. The first `reflection` panels appear here.
- **§4 Applied threads (16–19).** Pull four specific threads out of the text:
  duas, Names and Attributes of Allah, the Prophets, the miracles.
- **§5 Depth (20–23).** Tafakkur → tadabbur → tafaqquh → tadhakkur. Two carry a
  `timer`, which is the app's only nod to "sit with this for a while".
- **§6 Judgement (24–26).** Where understanding becomes a considered ruling,
  then judgement, then recognised authority. The most advanced, and two of the
  three carry the generic measure.
- **§7 Application (27–30).** Take it outward: discuss, live by it, share it,
  teach it. All four carry `checklist`; none carries `text`.

---

## Completeness check

- **30 of 30 Approaches documented** — verified by `grep -c 'id: "approach_'` on `app/js/catalogue-data.js` (result: 30) and by the generated list above.
- **7 of 7 sections documented.**
- **The 9 non-Approach trackables are documented separately** in `04-EDUCATIONAL-ARCHITECTURE.md` §4 — they live in the same `trackables` collection but are not Approaches (`subjectId: null`).



═══════════════════════════════════════════════════════════════════════════
FILE: 06-STUDY-UNITS.md
═══════════════════════════════════════════════════════════════════════════

# 06 — Study Units

QuranRevival v08.02 · from `app/js/unit-keys.js`, `app/js/records.js`,
`app/js/quran-data.js` and `app/quranrevival.html`

---

## 0. The core idea

**A Study Unit is a single namespaced permanent string.** There is no units
table, no units collection, and no unit documents. *The string is the unit.*
Boundaries are not stored with units either — they are derived from per-ayah
metadata in the static Quran JSON, precomputed into small index files at
data-pull time.

This follows invariant **I5**: units are keyed by permanent ID, never by name.
Renaming anything never orphans a record, because the key never contains a name.

```js
// app/js/unit-keys.js:14 — twelve declared types
export const UNIT_TYPES = Object.freeze([
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub", "manzil",
  "hadith", "topic", "name",
]);
```

| Type | Offered for the Quran? | Notes |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku`, `juz`, `hizb`, `page` | **Yes — all seven** | |
| `rub`, `manzil` | **No** | key constructors exist; **no picker option, no boundary index** — declared and unreachable |
| `hadith`, `topic`, `name` | n/a | other modules |
| *whole Quran* | **Does not exist** | no `quran:` or `book:` constructor. `UNIT_TYPE_LABELS` carries a display label `book: "Qur'an"` (`unit-keys.js:75`) but nothing constructs such a key |

---

## 1. Each unit in detail

### 1.1 Ayah

| | |
|---|---|
| **Represents** | one verse |
| **Identifier** | `ayah:{surah}:{ayah}` — e.g. `ayah:2:255` |
| **Data source** | `surahs/surah_NNN.json` → `ayahs[].ayah` |
| **Boundary** | itself — atomic, the floor of the whole system |
| **Navigation** | Ayah picker in Study options; ▲▼ ayah-nav; a wheel click in Explore's ruku' level |
| **Records chunk** | `surah_{n}` |
| **Words** | `ayahs[].words[]`, 1-based `position`, unique within the ayah only |

### 1.2 Range of Ayat

| | |
|---|---|
| **Represents** | a contiguous run within **one** surah |
| **Identifier** | `range:{surah}:{from}-{to}` — e.g. `range:2:1-5` |
| **Data source** | user selection (From/To pickers) |
| **Boundary** | explicit, normalised at construction: `[Math.min(rangeFrom, rangeTo), Math.max(rangeFrom, rangeTo)]` (`quranrevival.html:4768`) |
| **Constraint** | **cannot cross a surah boundary** |
| **Records chunk** | `surah_{n}` |

### 1.3 Ruku'

| | |
|---|---|
| **Represents** | a thematic section within a surah |
| **Identifier** | `ruku:{surah}:{rukuIndexWithinSurah}` — e.g. `ruku:2:1` |
| **Data source** | the per-ayah `ruku` field |
| **Boundary** | derived at read time by grouping ayahs sharing a `ruku` value |
| **Records chunk** | `surah_{n}` |

**The one real identity trap in the unit system, and it is documented in the
code.** The pulled data's `ruku` field is a **global sequential index across the
whole Quran** (Surah 1 = ruku 1, Surah 2 starts at ruku 2, …), but the unit key
stores a **per-surah-relative** index:

```js
// app/js/unit-keys.js:53
export function rukuIndexInSurah(surahAyahs, globalRuku) {
  const firstRuku = surahAyahs[0]?.ruku;
  return firstRuku == null ? globalRuku : globalRuku - firstRuku + 1;
}
```

**So `ruku:2:1` means "the first ruku' of Surah 2", not "global ruku' 1".** Any
future code that reads an ayah's `ruku` field and builds a key from it directly
will silently write a wrong key.

**Ruku' is also the only unit with no index file.** A ruku's range lives in its
surah's *text* (2 MB for Surah 2), so Explore loads full surah text **only for
surahs that actually carry a `ruku:` claim** — usually a handful, never all 114.

### 1.4 Juz

| | |
|---|---|
| **Represents** | one of the Quran's 30 parts |
| **Identifier** | `juz:{n}`, 1–30 |
| **Data source** | `juz-index.json` — **30 rows**, `{juz, startSurah, startAyah, startPage, endSurah, endAyah, endPage}` |
| **How built** | `build-juz-index.js`, computed from the real per-ayah `juz` field across all 114 files — never hand-typed |
| **Crosses surahs** | yes, routinely |
| **Records chunk** | **`subject_quran`** — a *different document* from the surah chunks |

### 1.5 Hizb

| | |
|---|---|
| **Identifier** | `hizb:{n}`, 1–60 |
| **Data source** | `hizb-index.json` — **60 rows** |
| **How built** | from the per-ayah `hizbQuarter` field — **a hizb is four quarters** (the data carries quarters 1–240, not hizbs) |
| **Records chunk** | `subject_quran` |
| **Loading** | fetched **only** when a `hizb:` claim actually exists |

```js
// app/quranrevival.html:4782 — the quarter→hizb arithmetic, inline
const hizbNow = Math.ceil(current.hizbQuarter / 4);
```

### 1.6 Page

| | |
|---|---|
| **Identifier** | `page:{edition}:{n}` — e.g. `page:qpc-hafs:604`. **Three segments, not two** |
| **Data source** | `page-index.json` — **604 rows** (64 KB) |
| **Records chunk** | `subject_quran` |

**The `edition` segment is why page keys are mushaf-scoped** — page 604 in one
print edition is not page 604 in another. It is the only unit key with a
non-numeric discriminator, so parsers must take `parts[2]`, not `parts[1]`:

```js
if (parts[0] === "page") {
  // page:<edition>:<n>
  const pg = pageIndexData?.find((x) => x.page === Number(parts[2]));
```

The page index **deliberately carries no "which Juz" tag** — a page can straddle
a Juz boundary, verified against real data by its build script.

### 1.7 Whole Surah

| | |
|---|---|
| **Identifier** | `surah:{n}`, 1–114 |
| **Data source** | `surah-index.json` — **114 rows**, incl. `ayahCount` |
| **Boundary** | ayah 1 to `ayahCount` |
| **Records chunk** | `surah_{n}` |

### 1.8 Whole Quran — **not a unit**

No constructor, no key, no claim. It exists **only** as Explore's top navigation
level, where its colour is computed by pooling over the 30 Juz (or 114 Surahs).

**This is a real structural gap worth naming:** there is no place to attach an
"overall Quran progress" figure, because there is no unit for the Quran itself.

---

## 2. `currentUnitInfo()` — the single source of truth

`app/quranrevival.html:4806` returns `{ unitType, unitKey, chunkKey, label }`
for whatever is currently selected, and **mirrors `chunkKeyFor()` exactly** so
the screen can never disagree with the document a claim will land in. Every
consumer — the wheel, the Note view, "Track this unit", the dock's Tracking
line — reads the unit through this one function.

---

## 3. Parent/child relationships — computed, never stored

**No unit key contains its parent. No index maps child→parent.** Containment is
computed on demand by exactly two mechanisms.

**(a) Per-ayah metadata — the downward direction.** Every ayah carries its own
memberships:

```json
{ "ayah": 1, "juz": 1, "page": 1, "ruku": 1, "manzil": 1, "hizbQuarter": 1, "sajda": false }
```

Used by `currentUnitAyahBounds()` (`:4765`) to find a unit's extent **within the
currently loaded surah**. Note the limitation: it filters `currentSurahData.ayahs`
— one surah — so it gives a juz's bounds *inside the open surah*, not the juz's
true global extent.

**(b) `ayahCoverage()` — the global direction, and the single containment
primitive in the whole application** (`quranrevival.html:6475`):

```js
function ayahCoverage(startSurah, startAyah, endSurah, endAyah) {
  if (startSurah === endSurah) return [{ surah: startSurah, from: startAyah, to: endAyah }];
  const ranges = [];
  const startCount = surahIndex.find((s) => s.surahNumber === startSurah)?.ayahCount ?? startAyah;
  ranges.push({ surah: startSurah, from: startAyah, to: startCount });
  for (let s = startSurah + 1; s < endSurah; s++) {
    const count = surahIndex.find((x) => x.surahNumber === s)?.ayahCount ?? 0;
    if (count) ranges.push({ surah: s, from: 1, to: count });
  }
  ranges.push({ surah: endSurah, from: 1, to: endAyah });
  return ranges;
}
```

Everything that needs "which ayahs does this unit cover" goes through it. It is
generic over any `{startSurah, startAyah, endSurah, endAyah}` shape, so **a new
unit type only needs a boundary table to become poolable.**

```
                 Whole Quran   ← a computed VIEW, not a unit
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

---

## 4. How ayat belong to a unit

| Unit | Membership test | Cost |
|---|---|---|
| Ayah | identity | free |
| Range | `from ≤ a ≤ to`, same surah | free |
| Surah | `1 ≤ a ≤ ayahCount` from `surah-index.json` | one small index |
| Ruku' | group by the ayah's `ruku`, then `rukuIndexInSurah()` | **needs the surah's full text** |
| Juz | `ayahCoverage()` over `juz-index.json` | one 8 KB index |
| Hizb | `ayahCoverage()` over `hizb-index.json` | one 8 KB index |
| Page | `ayahCoverage()` over `page-index.json` | one 64 KB index |

## 5. How words belong to a unit

**There is no word→unit relationship in the tracking system, because a word is
not a trackable unit.** The relationship exists only in the content data:

```
surah_NNN.json → ayahs[] → words[] → { position, arabic, transliteration,
                                        translation{en,bn},
                                        morphology{root, lemma, pos, rootCount} }
```

The only path from a unit to its words is: **unit → ayah range → load each
surah's JSON → walk `ayahs[].words[]`**. A word's full address is therefore
`(surah, ayah, position)` — **and that triple is never materialised as a string
anywhere in the codebase.** There is no word ID.

| Unit | Word occurrences |
|---|---|
| Whole Quran | **77,429** |
| One ayah | 1 to **128** (Surah 2:282 is the longest) |
| Surah al-Fatihah (7 ayahs) | 29 |

---

## 6. Chunking — which document a claim lands in

```js
// app/js/records.js:51
const SURAH_CHUNKED_TYPES = new Set(["ayah", "range", "surah", "ruku"]);

export function chunkKeyFor(unitKey, subjectId) {
  const { unitType, parts } = parseUnitKey(unitKey);
  if (SURAH_CHUNKED_TYPES.has(unitType)) {
    const surahNum = Number(parts[0]);
    if (Number.isFinite(surahNum)) return `surah_${surahNum}`;
  }
  return `subject_${subjectId}`;
}
```

| Unit types | Chunk | Documents per person |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | up to 114 |
| `juz`, `hizb`, `page` (and `rub`, `manzil`) | **`subject_quran`** | **one** |

Full document id: `records/{tenantId}__{personId}__{chunkKey}`.

**This split is the reason the landing wheel has a lazy second fetch.** Picking a
Juz/Hizb/Page unit needs a *different document*, so `ensureQuranSubjectChunk()`
(`:5628`) fetches it **on first use** and caches it per person — someone who
never picks those three never downloads it (invariant I9, the load-speed
contract).

---

## 7. Does progress roll upward or downward? — **Both, and it depends which screen**

**This is the most important behavioural fact about units, and the two screens
deliberately disagree.**

### On the landing Mastery Wheel: **neither**

```js
// app/quranrevival.html:5685
function approachStatusesForCurrentUnit() {
  const info = currentUnitInfo();
  const entries = chunkForUnitInfo(info)?.entries ?? {};
  return quranTrackables.map((trackable) => ({
    trackable,
    statusId: entries[`${info.unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started",
  }));
}
```

**The exact unit key's own direct claim, and nothing else.** The code states the
reason: the card a slice opens claims *this* unit, so a green slice over "Not
claimed yet" would be the screen contradicting itself.

> **Consequence: a Juz whose every ayah is Mastered still reads `not_started` on
> the landing wheel until the Juz itself is claimed.**

### In Explore: **both directions**

**Downward — a wide claim is a FLOOR** (`effectiveAyahStatus()`, `:6530`):

```js
const own = entries[`${buildUnitKey.ayah(surah, ayah)}::${trackableId}`]?.claimedStatus ?? "not_started";
if (own === "not_applicable") return own;          // I7 wins outright
let bestIdx = RAMP_ORDER.indexOf(own);
// then MAX against every wider-unit span covering this ayah
```

Claiming "Surah 1, Mastered" makes all seven ayahs read **at least** Mastered; an
ayah claimed higher keeps its own higher status.

**Upward — a wide unit takes its WEAKEST ayah** (`poolCoverageStatus()`, `:6491`):

```js
// MIN over every ayah in coverage, skipping not_applicable entirely (I7)
if (worstIdx === null || idx < worstIdx) worstIdx = idx;
```

One unclaimed ayah anywhere in a Juz makes the whole Juz read `not_started`.

### The rule in one line

```
   MAX downward   (a wide claim floors its ayahs)
   MIN upward     (a wide unit takes its weakest ayah)
   not_applicable excluded from both     (I7)
   the landing wheel does NEITHER — direct claim only
```

### Which claims roll up

`buildExploreWiderSpans()` (`:6561`) flattens every **non-`ayah`** claim into the
ayah ranges it covers:

| Claim | Resolved by |
|---|---|
| `surah:{n}` | `ayahCount` from `surah-index.json` |
| `range:{n}:{a}-{b}` | the range itself |
| `juz:{j}` | `ayahCoverage()` over the juz index |
| `page:{ed}:{p}` | `ayahCoverage()` over the page index — **`parts[2]`** |
| `ruku:{n}:{i}` | the ruku's range, from that surah's **text** |
| `hizb:{h}` | `ayahCoverage()` over the hizb index |

**Lazy by design and deterministic**: the hizb table is fetched only if a `hizb:`
claim exists, and full surah text is loaded only for surahs carrying a `ruku:`
claim. Which surahs load is decided by the **claims**, not by where the reader
has browsed — which is what makes a Juz's colour identical however you arrive at
it.

**A historical note that explains the current design.** Until 5 Sep 2026 this
wheel read only `ayah:` keys. Each level *did* carry a direct-claim fallback,
but it was written `pooled ?? direct`, and `pooled` is null only when every ayah
in range is Not Applicable — so in any real tenant the fallback was dead code
and a Whole Surah / Range / Ruku' / Juz / Hizb / Page claim was **invisible
everywhere in Explore.** The floor rule replaced it.

---

## 8. Relationship with Approaches

**None at definition time.** An Approach declares no units and a unit belongs to
no Approach. They are two independent coordinates multiplied at claim time:

```js
const entryKey = `${unitKey}::${trackableId}`;   // records.js:164
```

Every one of the 30 Approaches supports all seven Quran units, with no
restriction anywhere.

## 9. Relationship with Explore

Explore's **wheel segments are units**; the Approach is a *selector* beside it.
Four drill levels — `quran` → `juz` → `surah` → `ruku'` — with two readings at
the top two levels (Juz/Surah, and Pages/Surahs). There is no ayah level;
clicking a ruku' segment leaves Explore for the reading screen.

`SURAH_WHEEL_THRESHOLD = 30` (`:4378`) decides whether a surah draws one segment
per **ayah** (≤30) or per **ruku'**. **This 30 is an ayah count and has nothing
to do with the 30 Approaches** — a trap worth flagging.

---

## 10. Adding a new Quran unit type — the five places

Named because the code makes them explicit, **not** as a proposal:

1. `buildUnitKey` + `UNIT_TYPES` — `app/js/unit-keys.js:14`/`:20`
2. A branch in `currentUnitInfo()` — `app/quranrevival.html:4806`
3. A boundary index (built like `build-juz-index.js`) + a loader in `quran-data.js`
4. A branch in `spansForKey()` inside `buildExploreWiderSpans()` — if it should roll up
5. A decision on `SURAH_CHUNKED_TYPES` — `app/js/records.js:51`

**No Firestore schema change and no security-rules change is needed** — the rules
never inspect `entries`.



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
FILE: 08-EXPLORE-AND-PROGRESS-WHEEL.md
═══════════════════════════════════════════════════════════════════════════

# 08 — Explore and the Progress Wheel

QuranRevival v08.02

---

## 0. First: there are TWO wheels, with opposite axes

**This is the single most likely misreading of the codebase.** Both are drawn by
the same function and look alike.

| | **Landing Mastery Wheel** | **Explore wheel** |
|---|---|---|
| One segment per | **APPROACH** | **QURAN UNIT** |
| Held fixed | the current Study Unit | the selected Approach |
| Aggregation | **none** — direct claim only | pooling, both directions |
| Firestore reads | 1 chunk (+1 lazily) | **up to 115 per open** |
| Centre disc | the ayah's Arabic text | a plain label |
| Renderer | `renderScopedWheel()` | `renderScopedWheel()` — **the same function** |

---

## 1. Purpose

**Explore** answers *"where am I, across the whole Quran, on this one
Approach?"* The **landing wheel** answers *"where am I on this one unit, across
all 30 Approaches?"* They are complements.

## 2. Entry points

| Entry | Code |
|---|---|
| Explore tab on the Quran study screen | `tabExploreBtn` handler, `quranrevival.html:6426` |
| Opener | `openExplore()` `:6094` |
| Router | `renderExplore()` `:6801` |
| Container | `#explorePanel` |

**Explore is not a separate page, component or module.** It is a panel inside
`app/quranrevival.html`, with all its logic in the same inline
`<script type="module">` as the rest of the Quran screen.

## 3. UI structure

```
#explorePanel
 ├── breadcrumb            renderExploreBreadcrumb()   :6676
 ├── palette (3 modes)     setExplorePalette()         :7122
 │      Quran  |  Ayah Collections (QCR)  |  Asma ul Husna
 ├── view toggle           syncExploreViewToggle()     :6775
 │      Quran level: Juz ↔ Surah      Juz level: Pages ↔ Surahs
 ├── Approach list         renderExploreApproachList() :6729
 │      one selectable row per element of quranTrackables
 ├── the wheel             renderScopedWheel()         mastery-wheel.js:300
 ├── legend                renderWheelLegend()         mastery-wheel.js:353
 └── sidebar               renderWheelSidebar()        mastery-wheel.js:377
```

All popovers go through `app/js/bar-palette.js` — one delegated listener, so
outside-click, Escape and "only one open at a time" come free (invariant I2).

## 4. Filters, toggles and selection

**Three distinct switching mechanisms already exist**, and they are the closest
precedent for anything new:

**(a) Mode palette — `setExplorePalette(mode)` `:7122`.** Explore already hosts
**three entirely different content domains** in the same panel: `quran`, Ayah
Collections (QCR), and Asma ul Husna — each with its own wheel, data source and
trackable. **This is the existing proof that a new top-level category can be
added.**

**(b) View toggles within a level** — `EXPLORE_VIEW_LEVELS` (`:6770`) +
`syncExploreViewToggle()`. Choices persist per level via `app/js/prefs.js`, and
**the two levels remember separately**. Since v07.137 the **Surah** reading is
the default at the Quran level, though a stored choice always wins.

**(c) Approach selection** — `renderExploreApproachList()` `:6729`: a **flat**
list, one row per trackable, with a single selected id. There is no nesting and
no multi-select.

**Subject selection does not exist in Explore.** Explore is Quran-only (plus QCR
and Asma); the other eight modules have no Explore surface at all.

## 5. The four levels

```js
// app/quranrevival.html:6801
async function renderExplore() {
  renderExploreBreadcrumb();
  renderExploreApproachList();
  syncExploreViewToggle();
  if (exploreLevel === "quran") return renderExploreQuranLevel();
  if (exploreLevel === "juz")   return renderExploreJuzLevel();
  if (exploreLevel === "surah") return renderExploreSurahLevel();
  if (exploreLevel === "ruku")  return renderExploreRukuLevel();
}
```

| Level | Renderer | Segments | Reading toggle |
|---|---|---|---|
| `quran` | `:6813` | **30 Juz** or **114 Surahs** | Juz ↔ Surah (Surah is the default) |
| `juz` | `:6895` | that Juz's **pages**, or its **surahs** | Pages ↔ Surahs |
| `surah` | `:7006` | its **ayahs** (≤30) or its **ruku's** | threshold-driven |
| `ruku` | `:7063` | the **ayahs** in that ruku' | — |

**There is no ayah level.** Clicking a ruku'-level segment leaves Explore via
`goToAyahFromExplore()` (`:6703`).

```js
// app/quranrevival.html:4378
const SURAH_WHEEL_THRESHOLD = 30; // matches index.html's own confirmed threshold
```

**This 30 is an AYAH COUNT and has nothing to do with the 30 Approaches** — a
trap worth flagging explicitly.

Which pages belong to a Juz is computed from the **Juz's own `startPage`/
`endPage`**, not by filtering the page index — because a page can straddle a Juz
boundary (which is why `page-index.json` deliberately carries no Juz tag).

---

## 6. How the wheel is populated

```js
items: [{ key, statusId, title, number, sliceLines?, sliceArabicLines? }]
```

| Field | Meaning |
|---|---|
| `key` | segment identity → `data-key` → the click payload |
| `statusId` | one of the six ids → `STATUS_COLORS` lookup |
| `title` | the `<title>` tooltip, built by `segTitle()` `:6671` |
| `number` | the small number printed outside the ring (defaults to `key`) |
| `sliceLines` | **opt-in**: pre-wrapped, pre-escaped lines drawn *inside* the slice |
| `sliceArabicLines` | **opt-in**: how many leading lines are Arabic |

Geometry (`mastery-wheel.js:305`):

```js
const n = items.length || 1;
const anglePer = 360 / n;
```

Fill (`:314`):

```js
const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
```

Ring proportions: `rOuter = size/2 - 4`, `rInner = rOuter * 0.5` (a thin ring),
with an inter-segment gap of `min(1.2, anglePer * 0.08)` degrees. The centre disc
is drawn by `centerLabelMarkup()` in one of two modes — `centerArabic` +
`centerRef` (real ayah text) or `centerLabel` + `centerSub` (a canvas-measured,
wrapped plain title).

**`mastery-wheel.js` never imports Firebase or `records.js`** (invariant I2). It
takes an array and returns an SVG string.

## 7. Clicking a segment

```js
// app/js/mastery-wheel.js:346
export function attachScopedWheelClickHandler(containerEl, onSegmentClick) {
  containerEl.querySelectorAll(".wheel-seg").forEach((seg) => {
    seg.addEventListener("click", () => onSegmentClick(seg.dataset.key));
  });
}
```

The handler receives **the raw string key** — the renderer assumes nothing about
it. Each level's caller interprets it: a Juz key drills down, an ayah key leaves
Explore. The sidebar's `attachWheelSidebarClickHandler()` (`:406`) uses the
identical key contract, so wheel and list are interchangeable.

**On the landing wheel the key is a `trackableId`**, and clicking opens the Note
view scoped to that Approach.

## 8. Colour logic

```js
// app/js/mastery-wheel.js:38
export const STATUS_COLORS = Object.freeze({
  not_applicable: "url(#naHatch)",   // an SVG diagonal-hatch PATTERN, not a colour
  not_started:    "#333f5c",         // dim slate — recedes into the dark navy card
  learning:       "#8a6a35",
  practising:     "#C9A24B",
  achieved:       "#5b84c4",
  mastered:       "#3fae74",         // emerald — a different HUE, deliberately
});
```

Two deliberate constraints, both recorded in the code:

- **`mastered` is a different hue, not a darker blue**, because Achieved and Mastered must be *visibly distinct* — adjacent colours are indistinguishable on a small wheel segment.
- **`not_applicable` is a hatch pattern**, not a colour (I7 — an exclusion, not a point on the ramp). The legend re-creates it as a CSS gradient because a plain HTML container cannot resolve an SVG pattern id.

**There are six fills and no seventh.** Any new state must map onto one of them.

## 9. How progress becomes a colour — the full data flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. DATA SOURCE — static JSON, never Firestore                        │
│    juz-index.json (30) · page-index.json (604) · hizb-index.json (60)│
│    surah-index.json (114) · surahs/*.json (loaded only for ruku:)    │
│    via app/js/quran-data.js — promise-cached, BASE_URL is one const  │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. FIRESTORE — the ONLY read Explore makes                           │
│    getRecordsChunk()  records.js:66                                  │
│    → records/{tenantId}__{personId}__{chunkKey}                      │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. LOAD  ensureExploreChunksLoaded()            :6647                │
│    a. getJuzIndex(), getPageIndex()                                  │
│    b. expand all 30 juz via ayahCoverage() → surahs touched          │
│    c. Promise.all → getRecordsChunk("surah_N")        ≤114 reads     │
│    d. + ensureQuranSubjectChunk({force:true})           +1 read      │
│    e. + buildExploreWiderSpans()                        :6561        │
│    OUTPUT (in memory, never persisted):                              │
│      exploreChunksBySurah : Map<surahNumber, chunk>                  │
│      exploreSubjectChunk  : chunk (juz/hizb/page claims)             │
│      exploreWiderSpans    : Map<trackableId, Span[]>                 │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. AGGREGATION                                                       │
│    buildExploreWiderSpans()  :6561   every NON-ayah claim → ayah      │
│                                      ranges, keyed by trackable      │
│    effectiveAyahStatus()     :6530   MAX — a wide claim is a FLOOR    │
│    poolCoverageStatus()      :6491   MIN — weakest link, I7 skipped   │
│    RAMP_ORDER = [not_started, learning, practising, achieved, mastered]│
│    ⚠ reads claimedStatus, NEVER confirmedStatus                      │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. COMPONENT — one renderer per level (§5)                           │
│    each maps units → poolCoverageStatus() → an item object           │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. WHEEL DATA MODEL   items[] (§6)                                   │
└──────────────────────────────────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. VISUAL SEGMENT   renderScopedWheel()   mastery-wheel.js:300       │
│    <path class="wheel-seg" data-key="…" fill="…"><title>…</title>    │
└──────────────────────────────────────────────────────────────────────┘
```

### The landing wheel's much shorter pipeline

```
currentUnitInfo()                    :4806   { unitType, unitKey, chunkKey, label }
   ▼
chunkForUnitInfo(info)               :5655   pick the in-memory chunk
ensureUnitChunkThen(info, redraw)    :5665   first-use fetch of subject_quran
   ▼
approachStatusesForCurrentUnit()     :5685   ← NO aggregation
   statusId = entries[`${unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started"
   ▼
renderWheel()                        :5701
   + renderWheelSidebar()  ← names its SECTIONS since v08.02
   + renderWheelLegend()
```

## 10. How percentages are calculated in Explore

**They are not. Explore contains no percentage at all.** Confirmed by reading
every level renderer: none calls `summarizeStatuses()`, computes a ratio, or
prints a `%`. Every segment is a status id mapped to a colour.

The app's only percentages are the Way modal's Breakdown histogram
(`way-modal.js:99`) and the Monitor report — **neither drives a colour**.

## 11. Does the wheel assume a fixed number of segments? — **No**

`const n = items.length || 1; const anglePer = 360 / n;` It is already called in
the shipped app with **30** (Juz), **114** (Surahs), **99+** (Asma), **1–286**
(ayahs) and **~7–40** (ruku's) — a range spanning two orders of magnitude.

Two practical (not structural) limits, both recorded in the code:

- Labels use `wrapWheelLabel()` (`:242`) and a canvas-measured centre fit, so long names degrade by shrinking rather than overflowing.
- `SURAH_WHEEL_THRESHOLD = 30` exists precisely because per-ayah segments were judged unreadable beyond 30 for a surah wheel.

## 12. Does the wheel assume a fixed number of Approaches? — **No**

**In Explore the wheel is not per-Approach at all** — the Approach is a
*selector*, so the Approach count sets the length of a **list**, not the number
of **segments**.

**On the landing wheel** there is one segment per Approach, and it is still
`360 / n`. Nothing anywhere asserts 30 — no constant, no assertion, no slice, no
`length === 30` check.

**The only "30" in code is copy:** the caption `"Approach the Quran in 30 ways"`
(`quranrevival.html:2638`) and its Bangla counterpart in `app/js/i18n/bn.js`.

**A measured layout caveat**, recorded by the project itself
(`quranrevival.html:575`): with a real 30-Approach tenant the Approaches list
already **scrolls inside its card**, and 30 is at the edge of legibility at phone
width. More segments will not break; they may not read. The project's own
standing rule is to re-measure at 8 viewports in both languages.

## 13. Does Explore support categories or toggles? — **Yes, three kinds**

See §4. The mode palette is a genuine category mechanism, already used three
times.

## 14. Could a new category be added? — **Yes, and here is the cost**

| Work | Where | Risk |
|---|---|---|
| a palette button + mode | `setExplorePalette()` `:7122` | Low |
| a level-router branch | `renderExplore()` `:6801` | Low |
| a renderer producing `items[]` | new function, same file | Medium |
| a data load | a new `ensure…Loaded()` | Medium |
| breadcrumb entries | `renderExploreBreadcrumb()` `:6676` | Low |
| Bangla strings | `app/js/i18n/bn.js` | Low (I11 — mandatory) |

**All of it lands in `app/quranrevival.html`** — 12,051 lines, no build step.
`mastery-wheel.js` itself needs no change: hand it `items[]` and it draws them.

**The unanswered question is not "can a category be added" but "what are the
segments?"** Every existing Explore wheel has segments that are *places in the
Quran*.

## 15. Could multiple independent tracks under one Approach be displayed? — **Not today**

The blocking line is `renderExploreApproachList()` (`:6729`): a **flat** list,
one row per trackable, single selected id. No nesting, no expand/collapse, no
parent row.

| Structure chosen | What Explore shows today |
|---|---|
| Three separate trackables | **three flat, unrelated rows.** Works immediately, no code change — the grouping is invisible |
| One trackable + compound entry keys (`…::approach_31_L1`) | **one row.** The levels are stored and independently confirmable but **cannot be selected or coloured separately** — every renderer composes the key from one `trackable.id` |
| A parent + child trackables | **not expressible** — `trackables` has no parent field |

**Two levers already exist** that a nested display could build on: the
`group`/`groupName` sectioning (which v08.02 made real, editable, and now
*rendered as headings in the wheel sidebar*), and the per-level view-toggle
pattern that already remembers a choice per level.

**What does not exist and cannot be inferred: a rule for a parent Approach's own
colour when its children disagree.** The app's two aggregation rules are about
*units*, not *trackables*. That is a design decision, not a technical one.

---

## 16. Relevant files

| File | Role |
|---|---|
| `app/quranrevival.html` | Explore in full — panel, levels, aggregation, palette |
| `app/js/mastery-wheel.js` | both wheels, `STATUS_COLORS`, legend, sidebar — **pure, no Firebase** |
| `app/js/quran-data.js` | the boundary index loaders |
| `app/js/records.js` | `getRecordsChunk()` — Explore's only Firestore read |
| `app/js/unit-keys.js` | `STATUSES`, `buildUnitKey`, `statusLabelsById()` |
| `app/js/prefs.js` | per-level view choices, in localStorage |
| `app/js/bar-palette.js` | the shared popover |
| `app/js/wheel-resize.js` | user-resizable wheel |
| `app/js/asma-wheel-text.js` | Asma-mode slice text sizing |
| `app/js/qcr.js`, `qcr-data.js` | the Ayah Collections palette mode |



═══════════════════════════════════════════════════════════════════════════
FILE: 09-QURAN-DATA-ARCHITECTURE.md
═══════════════════════════════════════════════════════════════════════════

# 09 — Quran Data Architecture

QuranRevival v08.02

Every count in this document was computed by walking the **real 114 data files**
in this repository, not quoted from a manifest. Where a manifest figure
disagrees with the files, both are given and the discrepancy explained.

---

## 1. Sources

Three upstream sources, merged at pull time by
`tools/quran-data-pull/pull.js`. From `output/manifest.json`, verbatim:

```json
"sources": [
  "alquran.cloud (Uthmani text, en.sahih, bn.bengali translations, juz/page/ruku/manzil/hizbQuarter/sajda metadata)",
  "api.quran.com v4 (tajweed-tagged text, word-by-word Arabic/transliteration/English/Bangla)",
  "GitHub mirror of the 2011 Quranic Arabic Corpus release (root/lemma/part-of-speech)"
]
```

| Layer | Source | Contributes |
|---|---|---|
| Ayah text + metadata | alquran.cloud | Uthmani text, en.sahih + bn.bengali, juz/page/ruku/manzil/hizbQuarter/sajda |
| Word-by-word | api.quran.com v4 | per-word Arabic, transliteration, English gloss, Bangla gloss |
| Morphology | **Quranic Arabic Corpus, 2011 release** | root, lemma, part of speech |

**The morphology is the 2011 Quranic Arabic Corpus**, and its identity model,
coverage and limits are inherited wholesale. The app adds nothing to it.

## 2. Storage location and format

```
tools/quran-data-pull/output/            31 MB total
├── manifest.json           4 KB    provenance + counts
├── surah-index.json       20 KB    114 rows
├── juz-index.json          8 KB    30 rows
├── hizb-index.json         8 KB    60 rows
├── page-index.json        64 KB    604 rows
├── search-en.json        896 KB    ┐ one row per ayah, 6,236 each
├── search-ar.json        1.4 MB    │ loaded ONLY on first search,
├── search-bn.json        2.1 MB    ┘ and only for the language typed in
└── surahs/surah_001…114.json   27 MB
```

**Served as static files over HTTP, never from Firestore.**
`app/js/quran-data.js` is the only reader, and its base path is one constant:

```js
const BASE_URL = "/tools/quran-data-pull/output";
```

Architecture s5, quoted in that file's own header: *"Quran content is served as
static files, one per surah, cached permanently by the browser — never as
Firestore reads. Load one surah when it is opened. Never load the Quran."*

> **Consequence: the Quran data sits entirely outside the Firestore schema, the
> security rules and the tenant model.** It is public, immutable, cached
> content. Nothing about it is per-person, and **a tenant cannot correct a
> gloss** — unlike Asma ul Husna, where `asmaCollections` explicitly allows a
> tenant to override a canonical Name's Bangla wording.

## 3. Structure

```
surah_NNN.json
├── surahNumber, surahNameArabic, surahNameEnglish, surahNameTranslation
├── revelationType, ayahCount
└── ayahs[]
    ├── ayah                 1-based within the surah
    ├── uthmaniText          plain Arabic
    ├── tajweedText          Arabic with <tajweed class=…> spans
    ├── translations { en, bn }
    ├── juz, page, ruku, manzil, hizbQuarter, sajda
    └── words[]
        ├── position         1-based within the AYAH ONLY
        ├── arabic
        ├── transliteration
        ├── translation { en, bn }
        └── morphology { root, lemma, pos, rootCount }
```

**The word object has exactly five keys and the morphology object exactly four.**
Verified by enumerating keys across all 77,429 words — every word has all five,
every morphology block all four. **There are no other fields and no id.**

A real, unedited word (`surah_001.json`, 1:1, position 1):

```json
{ "position": 1, "arabic": "بِسْمِ", "transliteration": "bis'mi",
  "translation": { "en": "In (the) name", "bn": "নামে" },
  "morphology": { "root": "سمو", "lemma": "ٱسْم", "pos": "Preposition + Noun", "rootCount": 381 } }
```

## 4. Totals — measured

| Quantity | Value |
|---|---|
| Surahs | **114** |
| Ayahs | **6,236** |
| **Word occurrences** | **77,429** |
| Unique surface forms (raw bytes) | **21,295** |
| Unique surface forms (**NFC-normalised**) | **21,287** |
| Unique forms, diacritics stripped | 16,224 |
| Unique **lemmas** | **4,832** |
| Unique **roots** | **1,642** |
| Unique POS strings | **359**, from **46 atoms**, up to 5 deep |
| Longest ayah by words | **128** (Surah 2:282) |
| Hapax surface forms | **14,109** (66.3% of distinct forms) |
| Morphology rows read at pull time | **128,011** |

`totalWords: 77429` and `wordsWithRoot: 49971` in `manifest.json` were both
independently verified against the files and are exactly correct.

**A caution.** 77,429 is *this dataset's* count under *this dataset's*
tokenisation. Published Quran word counts vary (commonly ~77,400–77,900) because
they split prefixed particles differently. **77,429 is the app's own truth.**

## 5. Field-by-field inventory

| Field | Path | Source | Coverage of 77,429 | Generated? | Hand-maintained? |
|---|---|---|---|---|---|
| Arabic surface word | `words[].arabic` | quran.com v4 | **100%** | generated at pull | no |
| Transliteration | `words[].transliteration` | quran.com v4 | **100%** (Latin only) | generated | no |
| English word meaning | `words[].translation.en` | quran.com v4 | **100%** | generated | no |
| Bangla word meaning | `words[].translation.bn` | quran.com v4 | **100%** | generated | no |
| Part of speech | `words[].morphology.pos` | Corpus 2011 | **100%** | generated | no |
| **Lemma** | `words[].morphology.lemma` | Corpus 2011 | **74,122 — 95.7%** | generated | no |
| **Root** | `words[].morphology.root` | Corpus 2011 | **49,971 — 64.5%** | generated | no |
| Root frequency | `words[].morphology.rootCount` | computed in `pull.js:214` | field on 100% | generated | no |
| **Derivatives** | — | — | **absent** | — | — |
| **Grammar / morphological features** | — | — | **absent** | — | — |
| **Word ID** | — | — | **absent** | — | — |
| Ayah text (Uthmani) | `ayahs[].uthmaniText` | alquran.cloud | 100% | generated | no |
| Tajweed text | `ayahs[].tajweedText` | quran.com v4 | 100% | generated | no |
| Ayah translations | `ayahs[].translations{en,bn}` | alquran.cloud | 100% | generated | no |
| juz/page/ruku/manzil/hizbQuarter/sajda | `ayahs[].*` | alquran.cloud | 100% | generated | no |

**Nothing in this dataset is hand-maintained.** All 31 MB is regenerated by
`pull.js`.

**The root gap is not an error.** 35.5% of words genuinely have no root —
particles, pronouns, prepositions, the disconnected letters. `مِن` (728×) and
`فِى` (1,098×) are rootless by nature. **Root-based coverage can never exceed
64.5% of the Quran's words.**

## 6. Word IDs — **there are none**

**No id, no uuid, no global index on any word.** The only identifier a word
carries is `position`, **1-based and unique within its ayah only** (verified:
zero duplicate positions across all 77,429 words). Position 1 exists 6,236 times.

A word's full address **is** `(surahNumber, ayah, position)` — unique and
complete — but **that triple is never materialised as a string anywhere in the
codebase.** `buildUnitKey` has twelve constructors and none is `word`;
`UNIT_TYPES` has twelve entries and none is `"word"`.

The convention it *would* follow is set by the app's own unit keys
(`ayah:2:255`), so the natural form is `word:{surah}:{ayah}:{position}`. **It
does not exist today.**

## 7. Data-quality findings

**(a) Unicode normalisation is applied nowhere, and the dataset needs it.**
Eight surface-form pairs differ only in **combining-mark order**:

```
dataset:  REH, FATHA, BEH, SHADDA, KASRA
typed:    REH, FATHA, BEH, KASRA,  SHADDA
raw equality: False        NFC equality: True
```

**Any code identifying a word by its string must NFC-normalise first**, or it
will silently miss matches — including matches within this dataset itself.

**(b) `rootCount` is not sound arithmetic.** `canonicalRootKey()` (`pull.js:90`)
replaces a final **و**/**ي** with `#` **for counting only**, so the dataset
carries two root identities at once: the *displayed* root (1,642 distinct) and
the *counting* key (1,634). **19 roots disagree with their own in-file
frequency; 16 are exactly explained by this merge** (e.g. صلو occurs 99 times,
`rootCount` 124 = the merged صل# group). **Three are unexplained**: منن (30 vs
27), امم (118 vs 119), علو (71 vs 70). **It is a display figure — do not sum it.**

**(c) The English word-by-word gloss is contextual, not lexical.** **73.8% of
word occurrences (57,146 of 77,429)** have a surface form glossed more than one
way somewhere in the Quran; مِن alone has **72** distinct glosses (e.g. `"(are)
in"`, `"(is) at"`, `"(These are) among"`). This is by design upstream — the
gloss carries surrounding syntax so the glosses read as English in sequence.
**The gloss cannot serve as word identity.** Root (0.0% ambiguous) and lemma
(0.4%) can, and **lemma → root is a clean function: zero lemmas map to more than
one root.**

**(d) One malformed POS value** — Surah 37:130 position 3 has
`"pos": "yaAsiyna"`, a Buckwalter fragment rather than a tag, on a word
(إِلْ يَاسِينَ, "Elijah") the corpus tokenises differently from quran.com. 1 word in
77,429; renders harmlessly since `posLabel()` prints unknown atoms as-is. The
Bangla gloss on the same word carries a stray `"`.

**(e) No reverse index of any kind exists.** `app/js/ayah-renderer.js:152`
refers to a **`roots-index.json`** — searched the whole repository: **that file
does not exist.** The comment describes a planned artefact.

## 8. How Quran data is loaded

`app/js/quran-data.js` — the only reader. Every loader is **promise-cached at
module level**, so a repeat call is free and the browser's HTTP cache makes
repeat page loads free too.

| Function | Loads | When |
|---|---|---|
| `getSurah(n)` | one surah's full JSON | when that surah is opened |
| `getAyah(s, a)` | one ayah out of its surah | via `getSurah` |
| `getAyahRange(s, from, to)` | a contiguous run | via `getSurah` |
| `getSurahIndex()` | 114 names + ayah counts | **on the startup wave** |
| `getJuzIndex()` | 30 rows | on first Explore open |
| `getPageIndex()` | 604 rows | on first Explore open |
| `getHizbIndex()` | 60 rows | **only if a `hizb:` claim exists** |
| `getSearchIndex(lang)` | 6,236 rows for one language | **on first search only** |

**Every one of these obeys the load-speed contract (invariant I9).** Only
`getSurahIndex()` is on the startup path, and it is a bundled static file, not a
Firestore read. The lazy loaders are deliberate: the code comments name each as
an "on first use" fetch.

```
STARTUP (after first paint) — allowed: 3 Firestore reads
   userIndex · enrolments · bookmarks
The Quran study screen's own wave: tenantPeople, tenants/{id}, trackables,
   getSurahIndex()   ← the last is a static file, not Firestore
```

## 9. How a clicked word is identified and rendered

```
⚠ THERE IS NO WORD CLICK ANYWHERE IN THE APPLICATION.
```

**Verified three ways:**

1. No click handler anywhere references a word, `wbw`, a position, a root or a lemma. The only word-panel handlers are the three **toggles** (`data-qm-wbw`, `data-qm-roots`, `data-qm-derivatives` in `ayah-note-renderer.js:802`), which switch whole panels on and off.
2. `.wbw-word` carries **no pointer cursor** in any stylesheet — it is not presented as clickable.
3. `data-position="${w.position}"` **is** emitted (`ayah-renderer.js:135`) but nothing listens to it.

**How a word is rendered instead** — as a read-only chip inside a per-ayah strip:

```js
// app/js/ayah-renderer.js:135
return `<div class="wbw-word" data-position="${w.position}">
  <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  ${translit}
  ${glosses}
</div>`;
```

**Identification within a render pass** is purely positional: the panel maps over
`ayah.words[]` in array order. There is no lookup, no key, and no way to address
a word from outside its own ayah's render.

Full analysis in **10-WORD-BY-WORD-AND-ARABIC-DATA.md**.

## 10. Re-pull risk

`pull.js` regenerates all 114 files from three live upstream APIs. **If a re-pull
changes tokenisation, any stored word-level key would silently become wrong** —
and invariant I5 requires unit keys to be permanent. The dataset carries **no
per-word version stamp**; `manifest.json`'s `generatedAt` + `schemaVersion: 1`
are the only versioning available.

## 11. Relevant files

| File | Role |
|---|---|
| `tools/quran-data-pull/pull.js` | the merge script — the only place linguistic data enters the project |
| `tools/quran-data-pull/build-{juz,hizb,page}-index.js` | boundary tables, computed from real per-ayah fields |
| `tools/quran-data-pull/build-search-index.js` | the three search indexes |
| `app/js/quran-data.js` | the only reader (170 lines) |
| `app/js/ayah-renderer.js` | renders ayah text, translations and the three word panels |
| `app/js/quran-search.js` | search over the prebuilt indexes |
| `app/js/hifz-renderer.js` | a memorisation-specific renderer |
| `app/js/audio-player.js` | recitation transport (1,042 lines) — fetches archive.org |



═══════════════════════════════════════════════════════════════════════════
FILE: 10-WORD-BY-WORD-AND-ARABIC-DATA.md
═══════════════════════════════════════════════════════════════════════════

# 10 — Word-by-Word and Arabic Data

QuranRevival v08.02 · **what exists versus what is only named**

---

## 0. The headline, up front

```
The Word-by-Word system is READ-ONLY DISPLAY.

There is no word click, no word selection, no word identifier, no word-level
progress, and no cross-ayah word view. Three per-ayah panels render strips of
chips from data already in memory. That is the entire system.
```

---

## 1. The three components — all of them

All three live in `app/js/ayah-renderer.js` (230 lines), are **pure renderers**
(invariant I2 — HTML in, HTML out, never touching Firebase), and each takes a
single `ayah` object and maps over its `words[]`.

| # | Component | Line | Renders | Filters |
|---|---|---|---|---|
| 1 | `renderWordByWordPanel(ayah, {langs})` | 113 | Arabic + transliteration + gloss chips | none |
| 2 | `renderRootPanel(ayah)` | 155 | word + root + `rootCount` badge | **`.filter(w => w.morphology?.root)`** — rootless words are dropped |
| 3 | `renderDerivativesPanel(ayah)` | 177 | word + part-of-speech + lemma | `.filter(w => w.morphology)` |

Each returns an empty-state string when there is nothing to show
(`"No word-by-word data for this ayah."` / `"No morphology data for this ayah."`).

### The emitted markup

```js
// renderWordByWordPanel — app/js/ayah-renderer.js:135
return `<div class="wbw-word" data-position="${w.position}">
  <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  ${translit}
  ${glosses}
</div>`;
```

```js
// renderRootPanel — :160
`<div class="root-row" data-position="${w.position}">
  <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  <div class="root-root" dir="rtl" lang="ar">${escapeHtml(w.morphology.root)}<span class="root-count">${num(w.morphology.rootCount)}×</span></div>
</div>`
```

```js
// renderDerivativesPanel — :182
`<div class="root-row" data-position="${w.position}">
  <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  <div class="root-pos">${escapeHtml(posLabel(w.morphology.pos))}</div>
  ${w.morphology.lemma ? `<div class="root-lemma" dir="rtl" lang="ar">${escapeHtml(w.morphology.lemma)}</div>` : ""}
</div>`
```

---

## 2. Word click behaviour — **there is none**

**Verified three independent ways:**

1. **No click handler anywhere in the application references a word.** A grep for click listeners mentioning word/wbw/position/root/lemma returns only the three *panel toggles* in `ayah-note-renderer.js:802–804` (`data-qm-wbw`, `data-qm-roots`, `data-qm-derivatives`), which switch whole panels on and off.
2. **`.wbw-word` carries no pointer cursor** in any stylesheet. Its only rule is a border/padding declaration at `quranrevival.html:1789`. It is not presented as clickable.
3. **`data-position` is emitted but nothing listens to it.** All three panels stamp it; no selector anywhere reads it back.

**So a word cannot be selected, tapped, looked up, bookmarked, claimed, or
navigated to.** The smallest interactive object in the application is the
**ayah**.

---

## 3. What is displayed per word

| Datum | Panel | Source field | Coverage |
|---|---|---|---|
| Arabic surface form | WbW, Root, Derivatives | `words[].arabic` | 100% |
| Transliteration | WbW | `words[].transliteration` | 100% (Latin only) |
| English gloss | WbW | `words[].translation.en` | 100% |
| Bangla gloss | WbW | `words[].translation.bn` | 100% |
| **Root** | Root | `words[].morphology.root` | **64.5%** |
| **Root frequency** | Root | `words[].morphology.rootCount` | field on 100% |
| **Part of speech** | Derivatives | `words[].morphology.pos` | 100% |
| **Lemma** | Derivatives | `words[].morphology.lemma` | **95.7%** |

**Nothing else is displayed.** No grammatical features, no derived forms, no
senses, no dictionary link, no occurrence list.

### The transliteration is deliberately hidden in Bangla-only mode

```js
// app/js/ayah-renderer.js:132 — with the reason in the code's own comment
const translit = langs.includes("en")
  ? `<div class="wbw-translit">${escapeHtml(w.transliteration)}</div>`
  : "";
```

The recorded reason: *"the transliteration is a LATIN-script pronunciation aid,
so it belongs with the English side… 'বাংলা only' has to mean only Bangla, and a
Latin line is unreadable to exactly the person this app's Bangla is for."*
**There is no Bangla-script transliteration in the data** — only the Latin one.

---

## 4. "Derivatives" — **a misleading name, documented plainly**

```
The panel called "Derivatives" does not show derivatives.

It shows the PART OF SPEECH and the LEMMA of the SAME word. It never shows
another word, never shows a derived form, and never leaves the current ayah.
```

The file's own comment describes it accurately — *"the word's own DERIVED form:
its part of speech and lemma"* — so the *code* is honest; it is the **label a
user reads** that misleads.

**Real derivational data does not exist in this dataset at all.** The only
relationship available is "shares a root", and even that is not indexed
(see §6). There is no form I/II/III pattern data, no verbal-noun/participle
tree, and no derivation links.

---

## 5. POS display

`posLabel()` (`app/js/labels.js:182`) is the **only piece of linguistic
processing in the entire application**:

```js
export function posLabel(pos) {
  if (!pos) return "";
  return String(pos)
    .split("+")
    .map((part) => {
      const atom = part.trim();
      const english = POS_LABELS[atom];
      return english ? t(english) : atom; // unknown atoms print as they are
    })
    .join(" + ");
}
```

**Measured facts about POS in this dataset:**

| | |
|---|---|
| Distinct POS strings | **359** |
| Distinct POS **atoms** | **46** |
| Maximum atoms in one string | **5** |
| Occurrences with a **compound** POS | **41,972 — 54.2%** |
| `POS_LABELS` keys defined | **45** |
| Occurrences hitting an unmapped atom | **1** (the Surah 37:130 artefact, doc 09 §7d) |

So the POS mapping is essentially complete, and **compound structure is
understood at display time** (split on `+`, each atom translated) even though it
is stored only as a flat string. Examples: `"Preposition + Noun"` (بِسْمِ),
`"Verb + Pronoun"` (7,440×), `"Determiner + Adjective"`.

---

## 6. Panels, navigation and gating

**The three panels are toggled, never clicked into.** Two surfaces flip the
**same three canonical checkboxes**:

| Surface | Control | Code |
|---|---|---|
| Study options | `#wbwShowToggle`, `#rootsToggle`, `#derivativesToggle` | `quranrevival.html:3445`, `:3449`, `:3457` |
| The reading badge's ⋮ menu | `data-qm-wbw` / `-roots` / `-derivatives` | `ayah-note-renderer.js:802–804` |

The ⋮ menu deliberately flips the canonical checkbox rather than holding its own
state, so a choice made in either place is the same choice.

**Gating**: `canWbwRoot = noteScopeCanWbwRoot()` (`quranrevival.html:9801`),
which is simply `noteScopeShowAyatText()` — the panels appear wherever ayah text
is shown.

```js
// app/quranrevival.html:10352 — how the strips are built
if (canWbwRoot && wbwShowToggle.checked)      wbwHtml = perAyahPanels((a) => renderWordByWordPanel(a, { langs: wbwLangs() }));
if (canWbwRoot && rootsToggle.checked)        rootsHtml = perAyahPanels((a) => renderRootPanel(a));
if (canWbwRoot && derivativesToggle.checked)  derivativesHtml = perAyahPanels((a) => renderDerivativesPanel(a));
```

**`perAyahPanels(...)` is the whole navigation model**: one strip per ayah in the
current view. **There is no cross-ayah or whole-Quran word view anywhere.**

### How the three panels came to be three

Recorded in `ayah-renderer.js:198`: they were originally **one** panel. Shell
round 27 split `rootDerivatives` out of `wordByWord` (the owner's report:
*"should show only WbW, not with the entire derivatives"*), and a later round
split `root` from `derivatives` for the same reason. **An Approach declaring
`wordByWord` now means the words alone**, which is what that name says.

---

## 7. Data sources

All three panels read **the same in-memory object** — the surah JSON already
loaded by `getSurah()` (`app/js/quran-data.js`). **No panel fetches anything, and
no panel touches Firestore.** Full dataset detail in
**09-QURAN-DATA-ARCHITECTURE.md**.

---

## 8. Exists vs. named-but-not-implemented

### Fully implemented and working

| Feature | Evidence |
|---|---|
| Word-by-word Arabic + transliteration + en/bn gloss | `renderWordByWordPanel()`, 100% data coverage |
| Root display with whole-Quran frequency | `renderRootPanel()`, 64.5% coverage |
| POS display with compound-atom translation | `renderDerivativesPanel()` + `posLabel()` |
| Lemma display | in the Derivatives panel, 95.7% coverage |
| Independent toggling from two surfaces | three canonical checkboxes |
| Bilingual glosses with the Latin transliteration correctly suppressed in Bangla | `:132` |

### Named but NOT what the name suggests

| Name | What it actually is |
|---|---|
| **"Derivatives" panel** | POS + lemma **of the same word**. No derivatives anywhere |
| **`rootCount`** | A count over a **merged** root key (final و/ي collapsed), so 19 roots disagree with their own frequency. A display figure, not arithmetic |

### Referenced in code but does NOT exist

| Thing | Evidence |
|---|---|
| **`roots-index.json`** | Named at `ayah-renderer.js:152` as where a root's cross-surah occurrence list "would" come from. **Searched the whole repository — the file does not exist.** The comment describes a planned artefact |

### Built but unused

| Thing | Evidence |
|---|---|
| **The `root` panel** | Declared by **zero** of the 30 Approaches |
| **The `derivatives` panel** | Declared by **zero** of the 30 Approaches |

Verified by importing `APPROACH_TEMPLATES` and counting: only `approach_04`
declares `wordByWord`; nothing declares `root` or `derivatives`. Both are
reachable **only** through the reading screen's own toggles. **Enabling them for
an Approach is a data edit, not code.**

### Absent entirely

| Missing | Consequence |
|---|---|
| A word identifier | no word can be addressed from outside its own render |
| Any word-level index (form / lemma / root → occurrences) | "where else does this word occur" needs all 114 files (27 MB), which the load-speed contract forbids |
| Word click / selection | the ayah is the smallest interactive object |
| Word-level progress | no `word:` unit type; `UNIT_TYPES` has twelve entries and none is `word` |
| Grammatical features (case, mood, voice, verb form, person/number/gender) | **were present in the 2011 corpus and discarded at pull time** — `pull.js:206–215` keeps only root, lemma and POS from 128,011 morphology rows |
| Derivational data | no form patterns, no derivation tree |
| Dictionary / lexicon links | **zero** external references anywhere in the codebase (searched for corpus.quran.com, Lane's Lexicon, Almaany) |
| Bangla-script transliteration | only Latin exists in the data |
| Tenant correction of word data | static public files; no override mechanism, unlike `asmaCollections` for the Names |

---

## 9. Relevant files

| File | Lines | Role |
|---|---|---|
| `app/js/ayah-renderer.js` | 230 | **all three panels** + `PANEL_ORDER`/`PANEL_RENDERERS` |
| `app/js/labels.js` | 192 | `posLabel()` — the only linguistic processing |
| `app/js/quran-data.js` | 170 | the only reader of the static data |
| `app/quranrevival.html` | 12,051 | the three toggles, `perAyahPanels()`, the gate |
| `app/js/ayah-note-renderer.js` | 924 | the ⋮ menu that flips the same toggles |
| `app/quranrevival-render-test.html` | 242 | a standalone harness that renders all three panels for Ayah 2:255 — useful for seeing them in isolation |
| `tools/quran-data-pull/pull.js` | — | where the morphology is merged, and where Level-3 data was dropped |

**`app/arabic-study.html` is NOT word study.** Despite the name, it is the
generic topic renderer for the "Arabic Language" *subject*, claiming `topic:`
units against `studied_arabic`. It contains no word data at all.



═══════════════════════════════════════════════════════════════════════════
FILE: 11-DATABASE-AND-DATA-MODELS.md
═══════════════════════════════════════════════════════════════════════════

# 11 — Database and Data Models

QuranRevival v08.02 · **Firestore only** — there is no other database

All examples are anonymised (tenant `t1`, people `p1`/`p2`). No credentials
appear anywhere in this package.

---

## 0. Two generations coexist, on purpose

`app/js/collections.js` (79 lines) is the single source of every collection
name. **Nothing in this codebase types a collection name as a bare string** —
that is the whole point of the file.

| Map | What | Rule |
|---|---|---|
| `LEGACY` | what the pre-cutover single-file app reads and writes | untouched |
| `TENANT` | the current schema | everything below |

Both live in **one Firebase project** (`study-monitoring`, decision D1) so users
and history are shared, never orphaned. The current collections are named
`tenantPeople` / `tenantInvites` rather than `people` / `invites` precisely so
the two generations can never collide (decision D2).

**There are no subcollections in active use.** One is declared —
`threads/{threadId}/messages/{messageId}` — and messaging is not built.

---

## 1. Complete collection map

### Layer 0 — identity

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| `tenants` | `{tenantId}` | the household/school; **also owns `approachSections` since v08.02** | ✔ |
| `tenantPeople` | `{personId}` | a person: name, `authUid`, `managedByPersonId`, status | ✔ |
| `memberships` | `{tenantId}__{personId}__{role}` | **existence IS the role assertion** | ✔ |
| `userIndex` | `{uid}` | uid → tenants + default tenant | ✔ |
| `tenantInvites` | `{tenantId}__{inviteId}` | invitations with quota | ✔ |
| `tenantMemberUids` | uid-keyed | **rules-support mirror** (D9) — never in any UI | ✔ |
| `inviteTokens` | opaque token | so an invite link never carries an email (D9) | ✔ |

### Layer 1 — catalogue and organisation

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| `modules` | `{moduleId}` | **platform-wide**, 10 modules; `isPlatformAdmin()` to write | ✔ |
| `subjectTemplates` | `{subjectId}` | platform master subject list | ✔ |
| `subjects` | `{tenantId}__{subjectId}` | the tenant's tree; `parentId`, `ancestorIds[]`, `confirmationRequired` | ✔ |
| `trackables` | `{tenantId}__{trackableId}` | **the 30 Approaches + 9 module trackables** | ✔ |
| `ladders` / `levels` | `{tenantId}__{id}` | **grade** ladders (curriculum), not study levels | ✔ |
| `personLevels` | `{tenantId}__{…}` | an awarded grade | ✔ (`grades.js`) |
| `classes` | `{tenantId}__{classId}` | a class | ✔ |
| `courseOffers` | `{tenantId}__{offerId}` | a lighter enrolment vehicle | ✔ |
| `enrollments` | `{tenantId}__{…}` | who studies with whom | ✔ |
| `teacherStudentLinks` | flat, deterministic | **rules-support mirror** — never in any UI | ✔ |
| `curriculumUnits` / `curriculumPlan` | `{tenantId}__{id}` | content and schedule, **separate** (I8) | ✔ |
| `resources` | `{tenantId}__{resourceId}` | link/text attached to subjects and units | ✔ |
| `ayahCollections` | `{tenantId}` | **one doc per tenant** — QCR named cross-surah collections | ✔ |
| `asmaCollections` | `{tenantId}` | **one doc per tenant** — Names groups + tenant overrides | ✔ |

### Layer 2 — tracking core

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| **`records`** | `{tenantId}__{personId}__{chunkKey}` | **all progress** | ✔ |
| `activity` | `{tenantId}__{personId}__{weekKey}` | append-only audit, **one doc per week** | ✔ |
| `bookmarks` | `{tenantId}__{personId}` | `resume{}` + `saved[]` | ✔ |
| `ayahNotes` | `{tenantId}__{personId}` | rich-text notes keyed by unitKey | ✔ |
| `domains` | `{tenantId}__{domainId}` | tag registry behind `entries.domainIds[]` (D12) | ✔ |

### Layer 2.5 — communication

| Collection | Used? |
|---|---|
| `threads` | **✘ reserved name only** — no reader, no writer |
| `messages` (subcollection) | **✘ reserved name only** |
| `teachingNotes` | ✔ — written and read by `app/js/homework.js:251` |

**Verified by grep:** `THREADS` and `MESSAGES` appear **only** in
`collections.js`. Messaging is deliberately deferred, pending a real second
teacher-only account to verify its safeguarding rules against.

### Layer 3 — homework

| Collection | Document ID | Used? |
|---|---|---|
| `assignments` | `{tenantId}__{assignmentId}` | ✔ |
| `submissions` | `{tenantId}__{…}` | ✔ |

**Not present at all**, deliberately: Finance, Operations, medical records,
facilities. The collections file says so explicitly — there are no names to
reserve for them yet.

---

## 2. Major document schemas

### `records` — the central collection

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
    },
    "surah:2::approach_02":  { "…": "…" },
    "juz:30::approach_07":   { "…": "…" }
  },
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

**Chunking** (`records.js:53`):

| Unit types | `chunkKey` | Documents per person |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | up to **114** |
| `juz`, `hizb`, `page`, `rub`, `manzil` | `subject_quran` | **1** |
| non-Quran (`topic`, `name`, `hadith`) | `subject_{subjectId}` | 1 each |

### `trackables` — an Approach

```json
{
  "tenantId": "t1", "moduleId": "quranrevival", "subjectId": "quran",
  "group": 1,
  "groupName": { "en": "Building Foundation / Learning Tools", "bn": "…" },
  "name": { "en": "Reading — Word-by-Word Meaning", "bn": "শব্দে শব্দে অর্থসহ পাঠ" },
  "guide": { "what": {"en":"…"}, "how": {"en":"…"}, "measure": {"en":"…"} },
  "panels": ["text", "wordByWord"],
  "order": 4, "status": "active",
  "sourceTemplateId": "approach_04", "edited": false
}
```

`edited: true` freezes a tenant's copy against future platform name changes
(`syncUnneditedTrackableNames()`). **`reorderTrackables()` and
`saveApproachSections()` deliberately do NOT set it** — reordering or renaming a
section is not the tenant claiming authorship of an Approach's wording, and
stamping the flag would cut that tenant off from future translation fixes.

### `tenants` — including the v08.02 addition

```json
{
  "name": { "en": "…", "bn": "…" },
  "weekStartsOn": 6,
  "approachSections": [
    { "n": 1, "name": { "en": "Building Foundation / Learning Tools", "bn": "…" } },
    { "n": 2, "name": { "en": "Engagement / Attachment", "bn": "…" } }
  ],
  "taglines": [ "…" ]
}
```

`approachSections` is **additive** — absent on a tenant that has never edited
sections, in which case `sectionsFromTenantDoc()` falls back to the platform
defaults. It was put here rather than in a new collection because a collection
the deployed rules have never seen would be a 403 for the owner (this sandbox
has no Firebase CLI).

### `tenantPeople`, `memberships`, `activity`, `bookmarks`

```json
// tenantPeople/{personId}
{ "tenantId": "t1", "name": { "en": "…", "bn": "…" },
  "authUid": "«uid»",          // null for a managed child with no login
  "managedByPersonId": "p2",   // set ⇒ claims need confirmation
  "isMinor": true, "timezone": "…", "status": "active" }

// memberships/{tenantId}__{personId}__{role}   — existence IS the assertion
{ "tenantId": "t1", "personId": "p1", "role": "student", "status": "active" }

// activity/{tenantId}__{personId}__{weekKey}   — APPEND-ONLY (arrayUnion)
{ "tenantId": "t1", "personId": "p1", "weekKey": "2026-W36",
  "entries": [ { "date": "…", "subjectId": "quran", "unitKey": "ayah:2:255",
                 "unitType": "ayah", "trackableId": "approach_04",
                 "action": "claimed", "viaProgramId": null, "viaSessionId": null } ] }

// bookmarks/{tenantId}__{personId}
{ "resume": { "quranrevival::__none__::quran": { "position": {...}, "settings": {...} } },
  "saved":  [ { "id": "…", "name": "…", "position": {...}, "removed": false } ] }
```

**`activity` carries `viaProgramId`/`viaSessionId` — invariant I3 says these
live on activity and NEVER in a record key.**

---

## 3. Relationships

```
   userIndex/{uid} ──▶ tenantPeople/{personId} ──▶ memberships/{t}__{p}__{role}
                              │                          │
                              │                          ├─▶ tenantMemberUids     (rules mirror)
                              │                          └─▶ teacherStudentLinks  (rules mirror)
                              ▼
                    records/{t}__{p}__{chunkKey}
                              │
                        entries{ "<unitKey>::<trackableId>" }
                              │                     │
              ┌───────────────┘                     └──────────────┐
              ▼                                                    ▼
   unit key — a STRING                              trackables/{t}__{trackableId}
   NO collection; boundaries                          subjectId ──▶ subjects/{t}__{subjectId}
   are static JSON files                                              confirmationRequired
                              │
                              ▼
                    activity/{t}__{p}__{weekKey}   (audit; I3)
```

> **Neither half of the entry key is a foreign key.** Nothing validates a
> `trackableId` against `trackables`, and nothing validates a `unitKey` against
> anything. This is deliberate (I4/I5: an archived Approach's records survive
> intact) and it is why new key shapes are storable with no schema change.

---

## 4. Indexes

**No `firestore.indexes.json` exists in this repository.** Every query in the
tracking path is a single-field or two-field equality, which Firestore serves
from automatic indexes.

**List-safety matters more than indexing here.** A rule can permit a query only
if it can prove from the query's own filters that every possible result
satisfies the rule:

```js
// app/js/records.js:354 — the only list query against records
query(collection(db, TENANT.RECORDS),
      where("tenantId", "==", tenantId),
      where("personId", "==", personId));
```

Both filter fields are exactly what `canRecordFor()` checks — that is why it is
allowed. **A new query shape on `records` that does not fix both fields will be
denied however the indexes are configured.**

---

## 5. Read and write patterns

### Reads

| Pattern | Where | Cost |
|---|---|---|
| One chunk by id | `getRecordsChunk()` | 1 doc |
| All chunks for a person | `listAllRecordsForPerson()` | **1 query** |
| Startup wave (Quran screen) | `loadContextData()` `:5458` | 4 in parallel (3 Firestore + 1 static) |
| Landing wheel | `refreshChunkAndWheel()` | 1 doc |
| Lazy Quran-wide chunk | `ensureQuranSubjectChunk()` | 1 doc, **first use only** |
| **Explore open** | `ensureExploreChunksLoaded()` | **≤115 docs in parallel** |
| Roles for one person | `getPersonRoles()` | **6 parallel `getDoc()`s, never a query** |
| Roles for a roster | `getRosterRoles()` | **6 × N people** |

### Writes

| Pattern | Where |
|---|---|
| Dot-path update on one entry | `claimStatus()` — never rewrites the map |
| `arrayUnion` append | `activity.js:70` |
| Batched envelope writes | `commitEnvelopeBatch()`, **chunked to 5** |
| Order-only writes | `reorderTrackables()` — writes only documents whose number changed |
| **Delete** | **none, anywhere** (I4/D6) |

**Every document carries the I17 envelope** — `schemaVersion`, `createdAt`,
`updatedAt`, `createdBy` — applied by `app/js/envelope.js`, which refuses to run
without a uid.

---

## 6. Scaling limitations — observations

**1. Firestore's 1 MiB document limit, on `records`.** One entry with its key
serialises to roughly **359 bytes**, so a chunk saturates around **2,900
entries**. Bounded today (a surah chunk holds at most `ayahCount × 30`
Approaches), but it is a hard ceiling for any finer-grained progress: per-word
claims would be ~26 MiB.

**2. `entries` is a map that only grows.** No delete path (I4), so a chunk
accumulates for the life of a person.

**3. Explore's ~115 reads per open** is by far the heaviest operation in the app.
Bounded by "surahs the 30 juz touch", i.e. all 114 — it does not grow with usage,
but it does not shrink either.

**4. `activity` uses `arrayUnion` on an array in one document per week.** A very
heavy week could approach the document limit, and **the array is rewritten in
full by Firestore on each append**. Bounded by one week's activity.

**5. `getRosterRoles()` is 6 × N reads.** For a 40-person roster that is 240
document reads to render a roles column.

**6. Nine reads per claim**, multiplied by the number of assignees.

**7. `ayahCollections` and `asmaCollections` are ONE document per tenant.** Both
grow with tenant-authored content and share the same 1 MiB ceiling.

**8. The rules `get()` budget** — 20 per batched write, per document — already
forced `SEED_CHUNK_SIZE = 5`. Any new bulk write inherits it.

**9. `listAllRecordsForPerson()` reads every chunk for a person.** Bounded by
"surahs touched + subjects touched", not by raw entry count — but it is the
basis of Monitor and of every pending-review scan.

**10. The Quran data (31 MB) is outside all of this** — static files, browser
cached, never a Firestore read.



═══════════════════════════════════════════════════════════════════════════
FILE: 12-TECHNICAL-ARCHITECTURE.md
═══════════════════════════════════════════════════════════════════════════

# 12 — Technical Architecture

QuranRevival v08.02

---

## 1. The stack, in one table

| Layer | What it actually is |
|---|---|
| **Framework** | **None.** No React, Vue, Svelte, Angular or any other |
| **Language** | Plain **ES2020+ JavaScript**, native ES modules. No TypeScript |
| **Build system** | **None.** No bundler, no transpiler, no `package.json` in the app, no `node_modules` |
| **Markup** | 28 hand-written `.html` pages, each self-contained |
| **Styling** | Plain CSS — `app/css/shell.css` plus large inline `<style>` blocks |
| **Backend** | **Firebase only.** Auth + Firestore. **No Cloud Functions, no server code** |
| **Firebase SDK** | Modular (ESM) **v10.12.2**, imported **straight from `gstatic.com`** |
| **Hosting** | **GitHub Pages**, from this repository's `app/` folder |
| **Local dev** | `node serve.js` — a small static file server on :8080 |
| **Testing** | Playwright harnesses in `tools/i18n-verify` and `tools/perf` (~800 checks) |

**This is a deliberate, documented choice** (decision D4), not an accident. The
whole application is static files a browser fetches and runs.

```js
// app/js/firebase-init.js — every import is a URL, not a package
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager }
                         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
```

**Consequences a new architect must internalise:**

- **Every file is shipped as written.** A syntax error is a runtime error in production; there is no compile step to catch it.
- **There is no dependency graph tool, no tree-shaking, and no minification.**
- **`import` paths are relative and real.** Renaming a file breaks every importer at runtime.
- **The only "dependencies" are three CDN URLs**, pinned to an exact version.

---

## 2. Major dependencies — the complete list

| Dependency | Version | How | Used for |
|---|---|---|---|
| `firebase-app` | 10.12.2 | CDN | init |
| `firebase-auth` | 10.12.2 | CDN | Google sign-in |
| `firebase-firestore` | 10.12.2 | CDN | all data |
| Playwright | dev only | `tools/i18n-verify`, `tools/perf` | **not shipped** |

**That is the entire runtime dependency list.** No date library, no state
library, no UI library, no chart library. The Mastery Wheel's SVG is generated
by hand-written trigonometry in `mastery-wheel.js` (`polarToCartesian`,
`segmentPath`).

---

## 3. Routing — **there is none**

**Multi-page, not a SPA.** Navigation is ordinary `<a href="…">` between 28
static pages. There is no router, no history manipulation and no client-side
route table.

`app/js/nav.js` (329 lines) is a **pure renderer** that emits the nav markup;
each page injects it. The four categories:

| Category | Links |
|---|---|
| **Modules** | the 10 study pages |
| **Operation** | Classes*, Curriculum*, Course Offers, Homework, Records, Monitor |
| **Bookmark** | a live bookmark list + Manage |
| **Home** | sign-in status, legacy links, Admin* (People, Catalogue), About, Settings (Taglines*, Backup, Language) |

`*` = owner/prime only.

**A consequence worth knowing:** because there is no shared shell, **every page
bootstraps itself** — `onAuthStateChanged` → `bootstrapContext()` → render. There
is no app-level state that survives a navigation except what is in localStorage
or Firestore's own cache.

Nav markup is **static pre-JS markup in each page** for the Home category (an
anti-flash fix), which is why the two legacy links live 22 times in the HTML
rather than once in `nav.js`.

---

## 4. State management — **three tiers, no library**

| Tier | Mechanism | Lives in | Survives |
|---|---|---|---|
| **Page state** | plain `let` variables inside each page's module scope | the page | nothing |
| **Session/user preference** | `localStorage` via `app/js/prefs.js` (713 lines) and `session-context.js` | the browser | reloads, devices separately |
| **Durable data** | Firestore, with `persistentLocalCache` + `persistentMultipleTabManager` (D5) | the server + an offline cache | everything |

**What lives in `localStorage`** (via `prefs.js` and `session-context.js`): the
active tenant/role context, the "View as" preview, the selected person, the app
language, Explore's per-level view choices, wheel size, text size, and the
reading toggles.

**Two consequences:**

- **A stale "View as" preview survives reloads and can sit forgotten on a device for weeks** — a recorded trap that makes admin controls look missing.
- **The language preference is per device**, not per account. (A Firestore sync was designed and deferred; `lang-sync.js` exists.)

**There is no observable/store/reactive layer.** Re-rendering is explicit: a
function rebuilds a container's `innerHTML`. The project's own standing lesson
records the hazard — *"Re-render wipes UI state"* — so anything a reader opened
by hand must be threaded back in, or better, read live off the DOM one line
before it is replaced.

---

## 5. UI component architecture — the **pure renderer** boundary

This is the codebase's strongest architectural rule, invariant **I2**: *modules
never call each other; renderers are shared components.*

```
┌─────────────────────────────────────────────────────────────┐
│  PURE RENDERERS — HTML in, HTML out. NEVER import Firebase. │
├─────────────────────────────────────────────────────────────┤
│  mastery-wheel.js      both wheels, legend, sidebar          │
│  way-modal.js          Track / Guide / Breakdown / Coverage  │
│  ayah-renderer.js      ayah text, translations, word panels  │
│  topic-renderer.js     topic tree browsing                   │
│  asma-renderer.js      the 99 Names                          │
│  hifz-renderer.js      memorisation view                     │
│  ayah-note-renderer.js the Note view                         │
│  nav.js                the navigation bar                    │
│  labels.js             status / POS / role label text        │
└─────────────────────────────────────────────────────────────┘
                    ▲  data passed IN, callbacks passed IN
                    │
┌─────────────────────────────────────────────────────────────┐
│  HOST PAGES — own the data, wire the handlers                │
│  quranrevival.html · records.html · catalogue.html · …       │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICES — Firestore-aware                                  │
│  records.js · catalogue.js · activity.js · bookmarks.js · …  │
└─────────────────────────────────────────────────────────────┘
```

**`labels.js` exists solely to serve this boundary.** A pure renderer must be
able to print "Confirmed" or "Noun + Pronoun" without importing `records.js`
(which imports Firebase). Two functions — `confirmStateLabel` and
`activityActionLabel` — were **moved** there and **re-exported** from their
original modules, so existing call sites needed no change.

**Renderers never attach their own business handlers.** `way-modal.js` emits a
`.way-claim-btn`; the host page attaches the click. `mastery-wheel.js` provides
`attachScopedWheelClickHandler()` but the *callback* is the host's.

---

## 6. Service architecture

| Kind | Modules |
|---|---|
| **Data services** (Firestore-aware) | `records.js`, `catalogue.js`, `activity.js`, `bookmarks.js`, `people.js`, `invites.js`, `identity.js`, `homework.js`, `course-offers.js`, `classes.js`, `curriculum.js`, `grades.js`, `resources.js`, `domains.js`, `ayah-notes.js`, `qcr.js`, `asma-collections.js`, `taglines.js`, `monitor.js`, `backup.js` |
| **Static-data services** | `quran-data.js`, `quran-search.js`, `asma-data.js`, `asma-posters.js`, `catalogue-data.js`, `asma-collections-data.js` |
| **Infrastructure** | `firebase-init.js`, `envelope.js`, `errors.js`, `collections.js`, `session-context.js`, `prefs.js`, `i18n.js`, `lang.js`, `lang-sync.js`, `study-lock.js`, `feature-registry.js`, `modules.js` |
| **Page controllers** | `topic-study.js`, `routine-study.js`, `asma-study.js`, `self-check.js`, `catalogue-repair.js` |
| **UI utilities** | `bar-palette.js`, `drag-reorder.js`, `wheel-resize.js`, `text-size.js`, `splash.js`, `note-popup.js`, `assign-picker.js`, `bookmark-popover.js`, `bookmark-nav.js`, `continue-strip.js`, `audio-player.js`, `asma-wheel-text.js`, `asma-ref-parser.js` |

**Three cross-cutting services every write passes through:**

- **`envelope.js` (99 lines)** — stamps I17's `schemaVersion`, `createdAt`, `updatedAt`, `createdBy` on every document, and **refuses to run without a uid**. Also provides `commitEnvelopeBatch()`.
- **`errors.js` (115 lines)** — `safeWrite()` wraps every write so a failure reaches the user (invariant I15: never `console.error` alone). Keeps a session error buffer.
- **`collections.js` (79 lines)** — every collection name as a constant.

---

## 7. Firebase usage

| Service | Used | How |
|---|---|---|
| **Auth** | ✔ | Google provider only, `signInWithPopup` |
| **Firestore** | ✔ | the entire data layer |
| **Offline persistence** | ✔ | `persistentLocalCache` + `persistentMultipleTabManager` (D5) |
| **Cloud Functions** | **✘** | none exist — no `functions/` directory |
| **Cloud Storage** | **✘** | **not used at all.** No file upload anywhere |
| **Hosting** | **✘** | `firebase.json` configures rules; hosting is **GitHub Pages** |
| **Analytics / Messaging / Remote Config** | ✘ | not imported |

> **The absence of Cloud Functions is architecturally load-bearing.** Every
> calculation — every roll-up, every report, every aggregation — runs in the
> browser. There is nowhere to put server-side logic, and no scheduled job.

**Storage is unused**, which is why the Backup feature exports a **self-contained
HTML file to the user's own device** rather than uploading anything.

---

## 8. The load-speed contract

Non-negotiable, and measured rather than asserted (`tools/perf/`):

| Moment | Allowed | Never |
|---|---|---|
| Startup, before first paint | local cache only — paint immediately | any network wait |
| Startup, after first paint | **3 reads**: `userIndex`, `enrolments`, `bookmarks` | any module's study data |
| Landing page | card information only | records, curriculum, sessions |
| Records | one chunk per surah/subject | all records for a person |
| Activity | one document per week | a year at once |
| Screensaver, About, resources | on first use | at startup |

**Invariant I9: nothing joins the startup path without being flagged.** Several
features are lazy specifically to honour this — the `subject_quran` chunk, the
hizb table, the search indexes, the reciter timing map.

**Note for this session:** `tools/perf/measure.mjs` and the i18n harness **could
not be run here** — Playwright is not installed in this container and the task
brief forbids installing packages. The contract above is read from the code and
the project's own documentation, not re-measured today.

---

## 9. Internationalisation

Genuinely first-class, not a bolt-on — invariant **I11**: *every user-visible
name is language-keyed from day one.*

| Piece | File |
|---|---|
| `t()` translation + `num()` digit conversion | `app/js/i18n.js` (256 lines) |
| Bangla catalogue | `app/js/i18n/bn.js` (**2,293 lines**) |
| Bangla surah names | `app/js/i18n/surah-names-bn.js` |
| Bangla Names of Allah | `app/js/i18n/asma-names-bn.js` |
| `langText(obj, lang, fallback)` | `app/js/lang.js` |
| Coverage tool | `tools/i18n-coverage.mjs` |

**Two data shapes.** Content names are `{ en, bn }` objects read through
`langText()`; UI chrome goes through `t("English string")` with `bn.js` as the
catalogue.

**`num()` matters more than it looks** — a Bangla reader sees Bengali digits
(জুয ১, not জুয 1). Several rounds' worth of recorded defects were Latin digits
inside otherwise-Bangla text.

**A recorded trap:** the coverage number has been wrong about what it counts
**nine separate times**. The project's own rule is that it is *a to-do list,
never evidence* — only opening a rendered page in Bangla proves a screen is
translated.

---

## 10. Architecture diagram — the real one

```
                          ┌──────────────────────┐
                          │  Browser (no build)  │
                          └──────────┬───────────┘
                                     │
   ┌─────────────────────────────────▼──────────────────────────────────┐
   │  28 HTML PAGES — each self-contained, each bootstraps itself       │
   │  quranrevival.html (12,051) · records.html · catalogue.html · …    │
   └──────┬───────────────────────────────────────────────┬─────────────┘
          │                                               │
          ▼ (I2: data in, markup out)                     ▼
   ┌──────────────────────┐                    ┌──────────────────────────┐
   │  PURE RENDERERS      │                    │  SERVICES                │
   │  mastery-wheel       │                    │  records.js  catalogue.js│
   │  way-modal           │                    │  activity.js bookmarks.js│
   │  ayah-renderer       │                    │  people.js   monitor.js  │
   │  topic/asma/hifz     │                    │  …                       │
   │  nav · labels        │                    └──────┬──────────┬────────┘
   └──────────────────────┘                           │          │
                                                      ▼          ▼
                                     ┌────────────────────┐  ┌───────────────┐
                                     │  envelope.js (I17) │  │ errors.js(I15)│
                                     │  collections.js    │  │  safeWrite()  │
                                     └─────────┬──────────┘  └───────────────┘
                                               ▼
                                     ┌────────────────────────┐
                                     │  firebase-init.js      │
                                     │  Auth + Firestore      │
                                     │  persistentLocalCache  │
                                     └─────────┬──────────────┘
                                               ▼
                                     ┌────────────────────────┐
                                     │  FIRESTORE             │
                                     │  study-monitoring      │
                                     │  firestore.rules (1122)│
                                     │  ── NO Cloud Functions │
                                     └────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │  STATIC QURAN DATA — 31 MB, HTTP, browser-cached, NOT Firestore  │
   │  tools/quran-data-pull/output/   ← read only by quran-data.js    │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 11. Deployment

| | |
|---|---|
| **Production** | `https://madrasatul-muslimeen.github.io/app/` |
| **Hosting** | GitHub Pages, served from this repo's `app/` |
| **Deploy** | a push to `main` |
| **Rules deploy** | separately, via Firebase CLI or the Console |
| **Root redirect** | `index.html` at the repo root redirects into `/app/index.html` |
| **Frozen archives** | `/legacy/index.html` (v06.30) · `/legacy-v07/` (v07.139) — **reference only, never edited**, but they sign in to the same project and write real data |
| **Version badge** | `app/js/version.js` → `APP_VERSION` — the single source of truth; four surfaces import it, nothing retypes it |

**One repository, one deploy target.** A dev-repo/mirror split existed until
25 Aug 2026 and was folded into this repo as a real git merge.

---

## 12. Testing and verification

| Harness | What |
|---|---|
| `tools/i18n-verify/behaviour.mjs` | ~800 passing checks; **3 known environmental failures** (this sandbox cannot reach archive.org) and one pre-existing crash in section 42 carried since v07.69 |
| `tools/i18n-verify/layout.mjs` | landing-page metrics at 8 viewports × 2 banner states — the "measure before and after" tool |
| `tools/i18n-verify/reading.mjs`, `panel.mjs`, `navcheck.mjs` | focused screens |
| `tools/i18n-coverage.mjs` | untranslated-string list |
| `tools/perf/measure.mjs` | Firestore round trips per page, with an instrumented stub |
| `tools/perf/new-tenant.mjs` | seeding still works |

**A Firebase stub replaces the SDK** so a page's real script runs without a
network. Two recorded traps: **the stub never mutates its own `DATA`** (a
handler that writes then re-fetches sees stale data), and **it answers
instantly**, so any timing measurement needs an injected `latencyMs` or the
numbers are "a comforting lie".

**None of these could be executed in this session** — Playwright is not
installed here.



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
FILE: 14-SERVICES-AND-CORE-LOGIC.md
═══════════════════════════════════════════════════════════════════════════

# 14 — Services and Core Logic

QuranRevival v08.02 · the functions that carry the business rules

Format for each: **Name · File · Purpose · Inputs · Outputs · Database ·
Depends on**.

---

## 1. Progress — `app/js/records.js` (393 lines)

**The most important module in the application.** Every claim, confirmation and
return in every module passes through it.

### `claimStatus(db, {...})` — line 154
> **THE single write path for all progress in the application.**

| | |
|---|---|
| **Purpose** | record (or update) a claimed status for one `(person, unit, Approach)` |
| **Inputs** | `tenantId`, `personId`, `subjectId`, `unitKey`, `trackableId`, `statusId`, `notes`, `domainIds`, `claimedByPersonId`, `claimedByUid` |
| **Outputs** | `{ chunkKey, entryKey, needsConfirmation }` |
| **Reads** | **9** — 1 subject + 6 roles + 1 tenantPeople + 1 chunk |
| **Writes** | 1 dot-path update (or a create) |
| **Throws** | on a status outside the six |
| **Depends on** | `chunkKeyFor`, `isValidStatus`, `parseUnitKey`, `getSubjectConfirmationOverride`, `computeConfirmationRequired`, `envelope.js` |
| **Called by** | 9 sites (see 07 §10), all wrapped in `safeWrite()` |

### `chunkKeyFor(unitKey, subjectId)` — line 52
Pure. Decides which document a claim lands in — `surah_{n}` for
`ayah`/`range`/`surah`/`ruku`, `subject_{subjectId}` otherwise. **No database.**
Mirrored exactly by `currentUnitInfo()` so the screen can never disagree with the
document.

### `computeConfirmationRequired(db, tenantId, personId, subjectOverride)` — line 124
Decides whether a claim waits for review. **An ordered cascade, not a union** —
see 02 §3 for the consequence (any admin/teaching role exempts a person even if
they also hold `student`). Reads 7 documents, all deterministic `getDoc()`s,
never a query.

### `confirmEntry` (201) · `returnEntry` (219)
Approve / send back. Both enforce **I6** — `returnEntry` leaves
`confirmedStatus` and `confirmedAt` frozen.

### `bulkConfirmChunk` (262) · `bulkConfirmWeek` (274) · `bulkConfirmAllPendingForPerson` (297) · `bulkConfirmClass` (322)
Four scopes. `bulkConfirmWeek` reads the **activity** document to find which
entries a week touched, then confirms across however many chunks they live in.
`bulkConfirmClass` loops active `student` enrolments. All skip anything not
currently `pending`.

### `getRecordsChunk` (66) · `listAllRecordsForPerson` (354) · `listPendingForPerson` (372)
The read side. `listAllRecordsForPerson` is **the only list query against
`records`**, and it is deliberately list-safe (both filter fields are exactly
what the rule checks).

---

## 2. Catalogue — `app/js/catalogue.js` (693 lines)

### `getTrackables(db, tenantId)` — line 301
> **The read that defines "the 30 Approaches" at runtime.**

One query on `tenantId`, sorted by `order`. **Returns all 39 trackables** — the
30 Approaches *and* the 9 module-wide ones. Callers filter. Nine consumers
across the app read through this one function.

### `ensureTenantCatalogueSeeded(db, tenantId, uid)` — line 152
Copies `SUBJECT_TEMPLATES` + `APPROACH_TEMPLATES` + `TOPIC_TRACKABLE_TEMPLATES`
into a tenant. **Diffs by id**, so a partial run repairs itself. Commits in
**chunks of 5** (`SEED_CHUNK_SIZE`) because of the Firestore rules `get()`
budget. Explicit admin action, never on startup.

### `syncUnneditedTrackableNames(db, tenantId, uid, { keepSectionNames })` — line 319
Refreshes `name`/`groupName` from the platform templates for copies with
`edited !== true`. **The `keepSectionNames` guard is new in v08.02** and fixes a
trap that would otherwise have shipped silently: renaming a *section* is
deliberately not an edit to an Approach, so without the guard this function
reverted every section rename on the next landing-page load — and, because the
sync is fire-and-forget off the blocking path, **the damage only showed the time
after**.

### `reorderTrackables(db, tenantId, orderedIds, current, uid)` — line 561
Writes `order` for **only the documents whose number actually changed** — a
one-place nudge writes exactly 2. **Deliberately does not go through
`editCatalogueNode()`**, which would stamp `edited: true`: reordering is not the
tenant claiming authorship of an Approach's wording, and freezing all 30 names
would cut the tenant off from future platform translation fixes.

### `saveApproachSections(db, tenantId, sections, trackables, uid)` — line 641 *(v08.02)*
Writes the section list to `tenants/{tenantId}.approachSections` **and carries
every affected Approach with it**, so `group`, `groupName` and the tenant's list
can never disagree. Entries carry `from` (the section number an entry used to
be, or null if new), which is what lets a reorder move each Approach to its
section's new number in the same pass. Order-only writes, no `edited: true`.

### `sectionsFromTenantDoc(tenantData)` (602) · `tenantOwnsSections(tenantData)` (617)
Pure. Return the tenant's own sections or the platform default; and the flag
`syncUnneditedTrackableNames()` reads.

### `computeAncestorIds(nodes)` (68) · `getSubjectTree` (294) · `reparentSubject` (447) · `setTrackableStatus` (541)
Tree machinery and archive/restore. `setTrackableStatus` is what the **Remove**
button calls — it writes `status: "archived"`, never a delete.

---

## 3. Explore aggregation — inside `app/quranrevival.html`

Not a module — these live inline. **The whole aggregation layer of the app.**

| Function | Line | Purpose |
|---|---|---|
| `ayahCoverage(startSurah, startAyah, endSurah, endAyah)` | 6475 | **the single containment primitive in the application** — expands any boundary into per-surah ayah ranges |
| `poolCoverageStatus(coverage, trackableId)` | 6491 | **MIN** — weakest-link pooled status; skips `not_applicable` (I7); returns `null` if nothing is countable |
| `effectiveAyahStatus(surah, ayah, trackableId)` | 6530 | **MAX** — a wider claim is a floor under every ayah it covers |
| `buildExploreWiderSpans()` | 6561 | flattens every non-`ayah` claim into `Map<trackableId, Span[]>`; lazily loads the hizb table and ruku'-bearing surahs |
| `ensureExploreChunksLoaded()` | 6647 | the ≤115-document load, once per Explore open |
| `segTitle(label, statusId, labelsById)` | 6671 | tooltip text, routed through `statusLabelsById()` so no raw id ever prints |

**All read `claimedStatus`, never `confirmedStatus`.**

## 4. Landing-wheel logic — also inline

| Function | Line | Purpose |
|---|---|---|
| `currentUnitInfo()` | 4806 | **the single source of truth** for the selected unit — `{unitType, unitKey, chunkKey, label}` |
| `currentUnitAyahBounds()` | 4765 | a unit's extent **within the open surah** |
| `unitRendersWhole()` | 4800 | whether an Ayah picker would move anything |
| `refreshChunkAndWheel()` | 5565 | re-read the surah chunk, patch Explore's cache, redraw |
| `ensureQuranSubjectChunk({force})` | 5628 | **lazy** fetch of the Quran-wide chunk, cached per person (I9) |
| `chunkForUnitInfo(info)` | 5655 | pick the in-memory chunk, or null |
| `ensureUnitChunkThen(info, redraw)` | 5665 | fetch-once-then-redraw; **cannot loop** |
| `approachStatusesForCurrentUnit()` | 5685 | one status per Approach — **no aggregation** |
| `renderWheel()` | 5701 | builds `items[]` and calls the renderer |
| `loadContextData()` | 5458 | the startup wave — 4 parallel loads |

---

## 5. Rendering — `app/js/mastery-wheel.js` (410 lines)

**Pure (I2).** Never imports Firebase or `records.js`.

| Export | Line | Purpose |
|---|---|---|
| `STATUS_COLORS` | 38 | the six fills; `not_applicable` is an SVG **pattern** |
| `renderScopedWheel(items, opts)` | 300 | **both wheels.** `360 / items.length` — no fixed segment count |
| `renderMasteryWheel(ayahStatuses, opts)` | — | the older per-ayah shape, still exercised by the render-test page |
| `attachScopedWheelClickHandler` | 346 | hands back the **raw string key** |
| `renderWheelLegend(labelsById)` | 353 | six swatches |
| `renderWheelSidebar(items, labelsById)` | 377 | the list beside the wheel — **names its sections since v08.02** |
| `attachWheelSidebarClickHandler` | 406 | same key contract as the wheel |
| `wrapWheelLabel(text, maxLen)` | 242 | two-line wrapping, never truncating |
| `polarToCartesian` / `segmentPath` | — | the geometry, hand-written |

## 6. `app/js/way-modal.js` (254 lines) — pure

`renderTrackTab` (81) · `renderGuideTab` · `renderBreakdownTab` (99) ·
`renderCoverageTab` (124) · `renderStreakTab`.

**Holds the app's only real percentage** — the Breakdown histogram. The Coverage
tab is a **count**, not a percentage. The claim button is emitted here and wired
by the host page.

## 7. `app/js/unit-keys.js` (166 lines) — pure, no database

`UNIT_TYPES` (14) · `buildUnitKey` (20) · `parseUnitKey` (35) ·
`rukuIndexInSurah` (53) · `unitTypeLabel` / `unitKeyLabel` · `surahOf` ·
**`STATUSES` (110)** · `statusLabel` (139) · `statusLabelsById` ·
`isValidStatus` · **`summarizeStatuses` (157)**.

`summarizeStatuses` is the app's only ratio primitive, with just two callers
(`way-modal.js:100`, `monitor.js:158`). Returns `ratio: null` — not `0` — when
nothing is countable.

## 8. Quran data — `app/js/quran-data.js` (170 lines)

`getSurah` · `getAyah` · `getAyahRange` · `getSurahIndex` · `getJuzIndex` ·
`getPageIndex` · `getHizbIndex` · `getSearchIndex(lang)`.

**Every loader is promise-cached at module level.** Only `getSurahIndex()` is on
the startup wave, and it is a static file, not Firestore. **This module never
touches Firestore.**

## 9. Cross-cutting infrastructure

### `app/js/envelope.js` (99) — I17
`createDocument` · `updateDocument` · `commitEnvelopeBatch`. Stamps
`schemaVersion`, `createdAt`, `updatedAt`, `createdBy` on every write, and
**refuses to run without a uid**. Every service write goes through it.

### `app/js/errors.js` (115) — I15
`safeWrite(writeFn, context)` returns `{ ok, result }` or `{ ok: false, entry }`
with a plain-language message, and buffers failures for the session.
**Every claim call site wraps its write in this.**

### `app/js/session-context.js` (220)
`getMyMemberships` (87) · `canUseViewAs` (123) · `effectiveRoles` (138) ·
`scopedRoster` (160) · `bootstrapContext` (217). `effectiveRoles` **collapses**
to the previewed role alone — never a union.

### `app/js/activity.js` (152) — I3
`logActivity` — `arrayUnion`-appends to one document per week. Carries
`viaProgramId`/`viaSessionId`, which live here and **never** in a record key.
**Read by id only — there is no list query for activity anywhere.**

### `app/js/labels.js` (192)
`statusLabel` re-exports · `confirmStateLabel` · `activityActionLabel` ·
`roleListLabel` · `entityStatusLabel` · **`posLabel` (182)**. Exists so pure
renderers can print text without importing Firebase.

## 10. Page controllers

| Function | File | Drives |
|---|---|---|
| `initTopicStudyPage({moduleId, trackableId, rootSubjectId})` | `topic-study.js` | **6 study pages** |
| `initRoutineStudyPage({...})` | `routine-study.js` | **2 study pages** |
| `initAsmaStudyPage()` | `asma-study.js` | 1 study page |

Each does the same shape: bootstrap context → load roster/trackables → browse →
claim via `claimStatus()` → log activity.

## 11. Reporting and export

| Function | File | Purpose |
|---|---|---|
| `monitor.js` aggregation | `monitor.js:123`, `:158` | per-status counts + `summarizeStatuses` roll-up; weekly/monthly, CSV, print |
| `backup.js` | 310 lines | reads **everything the signed-in account may read**, through the app's own existing helpers, and **records refusals rather than throwing** |
| `backup-file.js` | 477 lines | builds one self-contained offline HTML file. **Imports nothing that touches Firebase**, so it is testable in plain node. Sanitises notes — the only HTML in the app — dropping every attribute |

---

## 12. Dependency rules a change must respect

1. **A pure renderer must never import Firebase** (I2). If it needs a label, the label goes in `labels.js`.
2. **Every write goes through `envelope.js`** (I17) and is wrapped in `safeWrite()` (I15).
3. **Collection names come from `collections.js`** — never a bare string.
4. **There is no delete** (I4/D6) — archive, revoke, return, mark consumed.
5. **Nothing joins the startup path without being flagged** (I9).
6. **Unit keys are permanent** (I5) — changing `chunkKeyFor()` is a data migration.
7. **Confirmation is frozen** (I6) — only `confirmEntry()` may touch those four fields.
8. **Every user-visible name is language-keyed** (I11).



═══════════════════════════════════════════════════════════════════════════
FILE: 15-CURRENT-FEATURE-INVENTORY.md
═══════════════════════════════════════════════════════════════════════════

# 15 — Current Feature Inventory

QuranRevival v08.02 · **what is real, what is partial, what is a name only**

Categorisation is based on **code inspection**, cross-checked against
`app/js/feature-registry.js` (the app's own list: 47 `built`, 7 `planned`) and
the project's `PHASE-*-STATUS.md` files. Where the registry and the code
disagree, the code wins and the disagreement is noted.

---

## A. FULLY IMPLEMENTED

Working end to end: a UI, a service, a Firestore write, and a read-back.

| Feature | Why it belongs here |
|---|---|
| **Google authentication** | `signInWithPopup`, `onAuthStateChanged` on every page; offline persistence on |
| **Multi-tenancy** | every document id is tenant-prefixed; enforced in `firestore.rules` (I13) |
| **Roles + memberships** | 6 roles, one document each, mirrored to `tenantMemberUids` for the rules |
| **"View as" role preview** | `effectiveRoles()` collapses; `scopedRoster()` narrows; `nav.js` shows the notice |
| **Tenant + owner bootstrap** | `createTenantWithOwner()`, `onboarding.html` |
| **People admin** | add/edit person, roles, managed children, archive |
| **Invites with quota** | `invites.js` + `inviteTokens` + `accept-invite.html` |
| **Catalogue seeding** | `ensureTenantCatalogueSeeded()`, diffing, chunked to 5 |
| **The 30 Approaches** | seeded, read by 9 consumers, rendered on the wheel |
| **Approach editing (v08.01)** | both names, section, position, all three Guide texts; **Remove** (archives) |
| **Approach sections (v08.02)** | editable, reorderable, stored on the tenant doc, grouped table, sidebar headings |
| **Subject tree** | 55 nodes, `parentId` + `ancestorIds[]`, re-parenting, archive |
| **Claims** | `claimStatus()` — one path, 9 call sites, all wrapped in `safeWrite()` |
| **Confirm / return** | `records.html` + 4 bulk scopes; I6 freezing verified in code |
| **Activity audit log** | one document per week, `arrayUnion`-append |
| **Quran study screen** | surah/ayah selection, 7 unit types, panels, Note view |
| **Study Unit switching** | the "Choose a Unit" palette; lazy `subject_quran` fetch |
| **Mastery Wheel** | 30 Approach segments for the current unit, sidebar, legend |
| **Explore** | 4 levels, 2 view toggles, 3 content palettes, floor/pool aggregation |
| **Word-by-Word / Root / Derivatives panels** | render real data; **display only** (see §B) |
| **Quran content pipeline** | 31 MB static JSON, 114 surahs, boundary indexes, promise-cached |
| **Search** | three prebuilt indexes, lazily fetched per language |
| **Bookmarks + Continue strip** | `resume{}` + `saved[]`, soft-remove only |
| **Ayah notes** | rich text per unitKey, sanitised on export |
| **Topic modules (×6)** | one shared controller, real claims |
| **Routine modules (×2)** | plus a day log and streak count |
| **Asma ul Husna** | 99 Names + ~33 more, collections, posters, Explore mode |
| **Ayah Collections (QCR)** | tenant-authored cross-surah collections |
| **Bilingual UI (en/bn)** | `t()`, `num()` Bengali digits, `langText()`, 2,293-line catalogue |
| **Backup** | one self-contained offline HTML file; sanitised; records refusals |
| **Admin self-check** | F-008, the screen that makes phases self-verifying |
| **Error surfacing** | `safeWrite()` everywhere (I15) |
| **Document envelope** | `envelope.js` on every write (I17) |
| **Taglines** | tenant-authored, owner/prime only |
| **Version badge** | single source of truth, 4 importing surfaces |

---

## B. PARTIALLY IMPLEMENTED

Real and working, but narrower than the name suggests.

| Feature | What works | What does not |
|---|---|---|
| **Word-by-Word system** | three panels render real data for 100% of words | **no word click, no word id, no word-level progress, no cross-ayah view.** Read-only display |
| **"Derivatives" panel** | shows POS + lemma correctly | **shows no derivatives.** No derivational data exists in the dataset |
| **Root panel** | root + a frequency badge | `rootCount` merges weak-final-radical roots, so 19 roots disagree with their own frequency; **no `roots-index.json` exists**, so "where else does this root occur" is unanswerable |
| **Teacher approval** | confirm/return/bulk all work and are stored | **gates nothing visual** — every wheel reads `claimedStatus`. A *returned* claim still shows green |
| **Teacher scoping** | per-**student**, enforced in the rules via `teacherStudentLinks` | **not per-subject** — a co-enrolled teacher has authority across every subject. A documented open gap |
| **Homework** | assign, mark, score, teaching notes | teacher scoping is per-**context**, not per-student (`isAssignmentCreator`); **not owner-verified** |
| **Monitor / reports** | aggregation, weekly/monthly, CSV, print | **not owner-verified**; Quran-rich, thin for other subjects |
| **Classes** | classes, teacher assignment, enrolment | *"the actual teacher-scoping enforcement still needs a second real teacher-only account to prove"* — the owner's own login bypasses it |
| **Curriculum, grades, resources** | units, plan, ladders/levels, `personLevels` | **entirely parallel to study progress** — the study path never reads them |
| **Approach creation** | edit, reorder, re-section, remove all work | **there is no "Add a 31st Approach"** — deliberately left unbuilt in v08.01 |
| **Non-Quran progress model** | one "Studied"/"Practised" trackable per module | no Approach-equivalent depth. **The app's biggest open educational question**, recorded as needing a design conversation |
| **Audio recitation** | a 1,042-line player with loop/timer | fetches **archive.org**, which this sandbox blocks — works for the owner, untestable here |
| **Language preference** | a real global setting | **per device** (localStorage). A Firestore sync was designed and deferred; `lang-sync.js` exists |

---

## C. PLACEHOLDER / EARLY IMPLEMENTATION

| Feature | State |
|---|---|
| **`rub` and `manzil` unit types** | `buildUnitKey.rub` and `.manzil` exist and `UNIT_TYPES` lists them, but there is **no picker option and no boundary index**. Declared and unreachable |
| **Translation-by-translator choice** | **Could not confirm from code.** The project's brief records a disabled `#translationChoiceSelect` placeholder, but no such element or identifier exists in the v08.02 source — it appears to have been removed since. The underlying limit is real and unchanged: `pull.js` packages exactly **one English and one Bangla** translation per ayah, so choosing a translator needs a re-pull, not just a picker |
| **`domains`** | the collection and `domainIds[]` are real and written, but the tagging UI is minimal |
| **`quranrevival-render-test.html`** | a genuine standalone render harness, not a user feature |
| **`migrate.html`** | historical migration tooling; migration was closed when the owner decided the old data was demo data |

---

## D. NOT CONNECTED

Present in the codebase but with no live consumer.

| Thing | Evidence |
|---|---|
| **`threads` / `messages` collections** | **Verified by grep: they appear ONLY in `collections.js`.** No reader, no writer, no UI. Messaging is deliberately deferred pending a real second teacher-only account |
| **`root` and `derivatives` panels** | fully built; **declared by zero of the 30 Approaches**. Reachable only via reading-screen toggles |
| **`renderMasteryWheel()`** | the older per-ayah wheel shape. Still exercised by `quranrevival-render-test.html`; the code calls it *"earmarked, not dead code"* |
| **`memberships.guardianOf[]`** | written on **every** membership creation (`identity.js:121`, `invites.js:198`, `people.js:90`/`:147`, `migrate.html:344`) — but **always as `[]`, and never populated afterwards.** Verified: no code path adds an element. `records.js:102` says so explicitly and uses `tenantPeople.managedByPersonId` instead, because checking `guardianOf[]` "would silently never fire". `firestore.rules`' own `isGuardianOf()` also reads `managedByPersonId`, not this field |
| **`enrolPerson()`'s `subjectIds[]` parameter** | recorded in the project's own notes as a dead parameter — subject-level scoping was never enforced |
| **`ladders` / `levels` / `personLevels`** | real and used by curriculum/grades, but **the study path never reads them** — parallel, not connected |
| **Firebase Cloud Storage** | not imported anywhere. No upload feature exists |

---

## E. EXPERIMENTAL / TRANSITIONAL

| Thing | Note |
|---|---|
| **`legacy/index.html` (v06.30)** | the pre-cutover single-file app, 10,146 lines. Reference only — **but it signs in to the same project and writes REAL data** |
| **`legacy-v07/` (v07.139)** | a frozen `cp -a` of `app/`, same caveat. Shares the 31 MB Quran data with the live app to stay at 2.6 MB, at the stated cost that reshaping that data would break it |
| **`catalogue-repair.js`** | a repair path for partial seeds |
| **`admin-self-check.html`** | deliberately built first (D8) so later phases are self-verifying |
| **`app/js/i18n` coverage tool** | the project's own rule: *"a to-do list, never evidence"* — it has been wrong about what it counts nine separate times |

---

## F. DELIBERATELY NOT BUILT

Not gaps — decisions, recorded in the standing brief.

| Not built | Why |
|---|---|
| Finance, Operations, medical records, facilities | *"Do not build unless explicitly asked"* |
| Messaging (threads, per-person inbox) | deferred pending a real second teacher account to verify safeguarding rules |
| Client-side delete | **D6/I4** — no delete rule exists anywhere |
| A 31st Approach | raised before v08.01; the owner did not ask for it |
| A build step / framework | **D4** — modular SDK from the CDN, no npm |

---

## G. Where the feature registry disagrees with the code

`app/js/feature-registry.js` is the app's own honest list and drives
`about.html`. Two mismatches worth knowing:

1. **Phases 5–9 and 13–14 are still listed as `planned` at the ID-range level**, but Phases 5, 6, 7, 8, 9 and 13 are substantially **built** (per the phase status files and the code). The registry reserves ID ranges rather than enumerating those phases' features. **The registry understates what exists.**
2. **Phase 12 (Remaining modules)** was found to be already delivered inside Phases 6 and 7; only its registry flag was stale, and it was corrected.

**Treat `feature-registry.js` as a floor, not a census.**

---

## H. Maturity summary

| Area | Maturity |
|---|---|
| Identity, roles, tenancy | **High** — heavily exercised, rules-enforced |
| Catalogue + Approaches | **High** — and newly extended (v08.01/02) |
| Tracking core (claims) | **High** — one path, invariant-guarded |
| Quran study screen | **High** — the most-built surface |
| Explore + wheels | **High** |
| Word-by-word | **Medium** — displays everything, does nothing |
| Approval | **Medium** — works, but affects no visual |
| Topic/routine modules | **Medium** — one trackable each |
| Monitor, Homework | **Medium** — built, not owner-verified |
| Classes, Curriculum | **Medium** — built, partly verified |
| Messaging | **Absent by decision** |



═══════════════════════════════════════════════════════════════════════════
FILE: 16-ARCHITECTURAL-RISKS-AND-OPPORTUNITIES.md
═══════════════════════════════════════════════════════════════════════════

# 16 — Architectural Risks and Opportunities

QuranRevival v08.02 · **observations only.** Nothing here is a proposal, and
nothing was fixed.

---

# PART 1 — RISKS

## 1.1 Technical risks

### R1. `app/quranrevival.html` is 12,051 lines — **the dominant risk**
The Quran screen, the Note view, the Mastery Wheel, **all of Explore**, the QCR
palette and the Asma palette live in one inline `<script type="module">`. There
is no build step, no module boundary within it, and no automated coverage for
most of it. It is 28% of the entire application by line count, and nearly every
UI change lands there.

### R2. No build step means no compile-time safety
No bundler, no TypeScript, no linter in CI. **A typo ships.** The mitigations
are real but manual: a Playwright harness (~800 checks) and per-round scripts.

### R3. Renaming a file or an export breaks importers at runtime
Import paths are relative and real. The project has hit this twice, recorded in
its own lessons (the `_prev-quranrevival.html` shim traps).

### R4. Six CSS/DOM traps with a recorded history of recurrence
The project's standing lessons name these because each cost a shipped defect:
- **`[hidden]` is beaten by any class or ID rule setting `display`** — bitten at least six times.
- **Two rules of equal specificity: source order wins.**
- **A `nowrap` + `text-overflow: ellipsis` label fails silently.**
- **`.reading-ticks` / `.fs-ticks` are names with MEANING** — checks count them.
- **Re-render wipes UI state.**
- **`surahName()` needs the English name handed to it** — one argument renders blank.

### R5. The Firebase client config lives in `app/js/firebase-init.js`
Normal for a Firebase web app (security is in the rules, not the key), but worth
knowing before sharing source publicly.

### R6. The test harness's own blind spots
The Firebase stub **never mutates its own `DATA`** (a handler that writes then
re-fetches sees stale data even when correct), and **it answers instantly**, so
any timing measurement without an injected `latencyMs` is "a comforting lie".
`behaviour.mjs` also carries a **pre-existing crash in section 42** since v07.69,
plus **3 environmental failures** where the sandbox blocks archive.org.

---

## 1.2 Scaling risks

### R7. Firestore's 1 MiB document limit on `records`
One entry with its key is roughly **359 bytes**, so a chunk saturates around
**2,900 entries**. Fine today (a surah chunk holds at most `ayahCount × 30`), but
a hard ceiling for anything finer-grained — per-word claims would be ~26 MiB.

### R8. `entries` is a map that only grows
No delete path (I4), so a chunk accumulates for the life of a person.

### R9. Explore's ≤115 document reads per open
By far the heaviest operation. It does not grow with usage, but it does not
shrink either, and it is paid on **every** open.

### R10. `getRosterRoles()` is 6 × N reads
A 40-person roster costs 240 document reads to render a roles column — a
consequence of the "rules cannot run queries" constraint.

### R11. Nine reads per claim, multiplied by assignees
A guardian claiming for three children pays 27 reads for one button press.

### R12. `activity` uses `arrayUnion` on one document per week
Firestore rewrites the whole array on each append. Bounded by one week, but the
cost is per-append, not per-element.

### R13. Two "one document per tenant" collections
`ayahCollections` and `asmaCollections` both grow with tenant-authored content
under the same 1 MiB ceiling.

### R14. The rules `get()` budget already forced a workaround
20 calls per batched write, per document — which is why `SEED_CHUNK_SIZE = 5`
exists. Any new bulk write inherits it.

---

## 1.3 Duplicated logic

### R15. Chunk-key logic exists twice, deliberately
`chunkKeyFor()` (`records.js:53`) and `currentUnitInfo()`
(`quranrevival.html:4806`) both compute it. The duplication is *intentional* and
documented — the screen must know where a claim will land before making it — but
**they must be changed together or they silently diverge.**

### R16. Role lists are declared in two places
`records.js:90` (`MEMBERSHIP_ROLES`) and `people.js:24` (`ALL_ROLES`) hold the
same six values. `people.js` acknowledges it "mirrors records.js's own private
MEMBERSHIP_ROLES".

### R17. Two wheel renderers coexist
`renderScopedWheel()` (used everywhere) and `renderMasteryWheel()` (the older
per-ayah shape, still exercised only by `quranrevival-render-test.html`). The
code calls the latter *"earmarked, not dead code"*.

### R18. Roster scoping happens in two layers
`scopedRoster()` client-side **and** the security rules server-side. Correct
defence in depth — but `scopedRoster()` returns `teacher` rosters *unchanged*,
relying entirely on Firestore having already filtered them. That is documented
and correct, and it is **not obvious from reading the function alone**.

---

## 1.4 Incomplete systems

### R19. Non-Quran subjects have no progress model
One "Studied"/"Practised" trackable per module versus the Quran's 30 Approaches.
**The app's biggest open educational question**, recorded as needing a long
design conversation, with an explicit instruction not to raise it each session.

### R20. Approval affects nothing visual
Confirm/return work and are stored, but **every wheel and every Explore colour
reads `claimedStatus`**. A *returned* claim still shows green.

### R21. Teacher scope is by student, not by subject
A co-enrolled teacher has record/confirm authority over that student across
**every** subject. A known, documented gap — and directly relevant if an outside
specialist teacher is ever brought in.

### R22. Homework's teacher scoping is a different shape again
`isAssignmentCreator()` uses `isActiveTeacherInContext()` — per context, not per
student — with the client trusted to offer only that context's roster.

### R23. `rub` and `manzil` are declared and unreachable
Key constructors exist; no picker, no boundary index.

### R24. `roots-index.json` is referenced but does not exist
Named at `ayah-renderer.js:152`. Searched the whole repository — absent.

---

## 1.5 Misleading names

### R25. **"Derivatives" shows no derivatives** — POS + lemma of the *same* word.
### R26. **`arabic-study.html` is not word study** — the topic renderer for the Arabic *subject*.
### R27. **`SURAH_WHEEL_THRESHOLD = 30` is an ayah count**, unrelated to the 30 Approaches.
### R28. **`rootCount` is not a plain count** — it merges weak-final-radical roots, so 19 roots disagree with their own frequency.
### R29. **"Approach" is not a type** — it is a `trackables` row with `subjectId: "quran"`.
### R30. **`ladders`/`levels` are grades, not study levels** — the study path never reads them.
### R31. **`group` looks structural and is display-only** — nothing keys off it.

---

## 1.6 Architectural inconsistencies

### R32. The two wheels have opposite axes
Landing = Approaches for one unit; Explore = units for one Approach. Same
renderer, similar appearance. **The single most likely misreading of this
codebase.**

### R33. The two aggregation rules deliberately disagree
A Juz whose ayahs are all mastered reads `not_started` on the landing wheel and
green in Explore. Both correct for their own screen; the difference is invisible.

### R34. The rules do not separate claiming from confirming
`canRecordFor()` is the same gate for both. The separation is client-side only.

### R35. Privilege is checked before studenthood
`computeConfirmationRequired()` returns `false` at the owner/prime/teacher/
guardian checks **before** reaching the student check — so any administrative
role silently exempts a person from approval even if they also hold `student`.

### R36. `confirmationRequired` is per **subject** only
It cannot be varied per Approach or per unit type.

### R37. `not_applicable` sits on the same picker as the ramp
Semantically a different kind of thing, presented identically.

---

## 1.7 Data limitations

### R38. No word identifier and no word-level index
`position` is unique within an ayah only. "Where else does this word occur"
needs all 114 files (27 MB), which the load-speed contract forbids.

### R39. Unicode normalisation is applied nowhere
**Eight surface-form pairs in this dataset differ only in combining-mark order.**
Raw string equality fails on them; NFC succeeds.

### R40. The word-by-word gloss is contextual, not lexical
**73.8% of word occurrences** have a form glossed more than one way; مِن alone
has **72** glosses. It cannot serve as word identity.

### R41. Root data covers only 64.5% of words
Particles and pronouns genuinely have no root. A hard ceiling on root-based
coverage.

### R42. Level-3 grammar data was in the source and discarded
The 2011 corpus supplied **128,011 morphology rows**; `pull.js:206–215` keeps
only root, lemma and POS.

### R43. A re-pull is a migration event
Changed tokenisation would silently invalidate any stored word key, and I5
requires unit keys to be permanent. There is **no per-word version stamp**.

### R44. One malformed POS value
Surah 37:130 position 3 carries `"pos": "yaAsiyna"` — a Buckwalter fragment.
1 word in 77,429; renders harmlessly.

### R45. Tenant correction of Quran data is impossible
Static public files. Contrast `asmaCollections`, which *does* let a tenant
override a canonical Name's Bangla wording.

---

## 1.8 Performance concerns

### R46. All computation is client-side — there are no Cloud Functions
Every roll-up, report and aggregation runs in the browser. There is nowhere to
put server-side logic and no scheduled job.

### R47. `effectiveAyahStatus()` runs per ayah per render
Up to 6,236 calls for the whole-Quran wheel, each scanning that trackable's
span list.

### R48. Adding wheel segments is a measured layout risk
The project's own note (`quranrevival.html:575`) records that with a real
30-Approach tenant the list already scrolls at phone width. More segments will
not break; they may not read. The standing rule is to re-measure at 8 viewports
in both languages.

### R49. `app/js/i18n/bn.js` is 2,293 lines, loaded per page
Static and cacheable, but it is a real per-page parse cost.

---

# PART 2 — OPPORTUNITIES

*Observations about what already exists, not recommendations.*

## 2.1 Reusable infrastructure

| Asset | Why it is valuable |
|---|---|
| **`claimStatus()` — one write path** | Any new claimable thing gets confirmation, freezing, activity logging and error surfacing **for free** |
| **`renderScopedWheel()` — segment-count-agnostic** | Already called with 30, 114, 99 and 1–286 items. Hand it an array and it draws |
| **The `items[]` contract** | `sliceLines` / `sliceArabicLines` are existing precedent for **backward-compatible opt-in extension** |
| **`ayahCoverage()`** | the single containment primitive — a new unit type needs only a boundary table to become poolable |
| **The panel system** | `PANEL_ORDER` + `PANEL_RENDERERS`; the file's own rule is *"adding approach 31 is a row of data, not a build"* |
| **`initTopicStudyPage()`** | a whole study module is a ~149-line shell and three arguments |
| **`bar-palette.js`** | one delegated listener gives outside-click, Escape and "only one open" free |
| **`envelope.js` + `errors.js`** | I17 and I15 satisfied by construction |
| **`labels.js`** | the escape hatch that keeps renderers Firebase-free |
| **The rules-mirror pattern** | `tenantMemberUids`, `teacherStudentLinks` — the established answer to "rules cannot query" |
| **The verification harness** | ~800 checks, plus a load-speed harness with an instrumented stub |
| **The lazy-index pattern** | search indexes, hizb table, `subject_quran` — a proven template for anything new that must stay off the startup path |

## 2.2 Hidden capabilities

| Capability | Where |
|---|---|
| **Explore already hosts three content domains** | `setExplorePalette()` — Quran, QCR, Asma. Proof a new category can be added |
| **`root` and `derivatives` panels are built and unused** | Enabling them for an Approach is a **data edit, not code** |
| **Compound trackable ids already store correctly** | `trackableId` is opaque; nothing parses it. Independent sub-tracks are storable today with no schema or rules change |
| **`renderWheelSidebar()` gained section headings in v08.02** | Opt-in per item — the first grouping ever rendered on a wheel |
| **Multi-assignee claiming** | One press already claims for several people |
| **Bulk confirm has four scopes** | chunk, week, person, class |
| **The backup file is a complete data export** | Every collection the account may read, plus raw JSON in a `<script type="application/json">` block — a **restore already has everything it needs** |
| **`quranrevival-render-test.html`** | a standalone harness for seeing renderers in isolation |
| **Offline persistence is already on** | `persistentLocalCache` + multi-tab |
| **`domains[]` is a free-form tag axis on every entry** | Written, stored, barely surfaced |

## 2.3 Existing data that is underused

| Data | Coverage | Currently used for |
|---|---|---|
| **Lemma** | 95.7% (4,832 distinct) | one line in the Derivatives panel |
| **Root** | 64.5% (1,642 distinct) | one badge in the Root panel |
| **POS** | 100% (359 strings, 46 atoms) | one line in Derivatives |
| **Transliteration** | 100% | one line, English mode only |
| **`tajweedText`** | 100% | one Approach declares `tajweed` |
| **`sajda`, `manzil`, `hizbQuarter`** | 100% | `manzil` unreachable; `sajda` surfaced nowhere found |
| **`activity` entries** | every claim | streaks and week-scope bulk confirm |
| **`ancestorIds[]`** | every subject | roll-ups in topic modules; **unused by the Quran** (single leaf) |
| **`confirmedStatus`** | every confirmed entry | **the Records table only** |
| **`domainIds[]`** | every entry | minimal UI |
| **`guide.measure`** | all 30 Approaches | displayed, never validated against |

## 2.4 Components that could support future features

| Component | Already supports |
|---|---|
| `renderScopedWheel()` | any segment count; opt-in in-slice text |
| `way-modal.js` | tabbed per-item cards, host-wired actions |
| `topic-renderer.js` | arbitrary-depth tree browsing with status chips |
| `bar-palette.js` | any popover |
| `drag-reorder.js` | drag ordering (used by the catalogue) |
| `assign-picker.js` | multi-person selection |
| `wheel-resize.js` / `text-size.js` | user-controlled sizing, persisted |
| `backup-file.js` | Firebase-free document generation, node-testable |
| `quran-search.js` + prebuilt indexes | the model for any new generated index |
| `feature-registry.js` | a built-vs-planned surface already wired to `about.html` |

---

## Part 3 — The five facts most likely to cause a mistake

1. **Approval changes no colour.** Every wheel reads `claimedStatus`.
2. **The two wheels have opposite axes**, and share a renderer.
3. **The landing wheel does not aggregate; Explore does.** They disagree by design.
4. **"Approach" is a Firestore row**, not a type — `catalogue-data.js` is only the seed.
5. **`app/quranrevival.html` is 12,051 lines** and contains Explore.



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



═══════════════════════════════════════════════════════════════════════════
FILE: 18-DEPENDENCY-AND-FEATURE-MAP.md
═══════════════════════════════════════════════════════════════════════════

# 18 — Dependency and Feature Map

QuranRevival v08.02 · the real, discovered dependency graph

---

## 1. The whole application

```
                        ┌───────────────────────────┐
                        │  firebase-init.js         │
                        │  Auth + Firestore + cache │
                        └─────────────┬─────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     ┌────────────────┐      ┌────────────────┐     ┌──────────────────┐
     │ session-context│      │ collections.js │     │  envelope.js     │
     │ tenant/role    │      │ every name     │     │  I17 on writes   │
     └───────┬────────┘      └───────┬────────┘     └────────┬─────────┘
             │                       │                       │
             └───────────────┬───────┴───────────────────────┘
                             ▼
                  ┌──────────────────────┐        ┌──────────────┐
                  │   SERVICES           │───────▶│  errors.js   │
                  │   records · catalogue│        │  safeWrite   │
                  │   activity · bookmarks│       │  (I15)       │
                  └──────────┬───────────┘        └──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   28 HTML PAGES      │
                  └──────────┬───────────┘
                             │  (I2: data in, markup out)
                             ▼
                  ┌──────────────────────┐
                  │   PURE RENDERERS     │───▶ labels.js ───▶ i18n.js
                  │   never touch Firebase│                    lang.js
                  └──────────────────────┘
```

## 2. Quran Reader — the requested shape, filled in

```
Quran Reader  (app/quranrevival.html — 12,051 lines)
│
├── Quran Data ─────────── js/quran-data.js
│                            └── static JSON, 31 MB, HTTP only
│                                surahs/*.json · surah-index · juz-index
│                                hizb-index · page-index · search-{en,ar,bn}
│
├── Word-by-Word ───────── js/ayah-renderer.js
│      ├── renderWordByWordPanel()  :113
│      ├── renderRootPanel()        :155
│      └── renderDerivativesPanel() :177 ──▶ js/labels.js posLabel()
│           (read-only — NO word click anywhere)
│
├── Approaches ─────────── js/catalogue.js getTrackables()
│                            └── Firestore `trackables`
│                                 seeded from js/catalogue-data.js
│
├── Study Units ────────── js/unit-keys.js buildUnitKey
│                            └── currentUnitInfo()  :4806
│
├── Reading tools ──────── js/audio-player.js · js/hifz-renderer.js
│                          js/text-size.js · js/splash.js
│
└── Note view ──────────── js/ayah-note-renderer.js
                             ├── js/ayah-notes.js  (Firestore `ayahNotes`)
                             ├── js/note-popup.js
                             └── js/way-modal.js  (Track/Guide/Breakdown/Coverage)

Progress
│
├── Claims ─────────────── js/records.js claimStatus()  ← THE single write path
│                            ├── chunkKeyFor()             :52
│                            ├── computeConfirmationRequired() :124
│                            ├── js/envelope.js  (I17)
│                            └── js/errors.js safeWrite()  (I15)
│                                  └── js/activity.js logActivity()  (I3)
│
├── Approval ───────────── js/records.js confirmEntry / returnEntry / 4 bulk fns
│                            └── app/records.html   ← the ONLY UI
│                                 ⚠ affects NO wheel and NO Explore colour
│
├── Explore ────────────── inside app/quranrevival.html  :6094–:7122
│                            ├── ensureExploreChunksLoaded()  ≤115 reads
│                            ├── buildExploreWiderSpans()
│                            ├── effectiveAyahStatus()   MAX ↓
│                            ├── poolCoverageStatus()    MIN ↑
│                            └── ayahCoverage()  ← the containment primitive
│
└── Wheel ──────────────── js/mastery-wheel.js  (PURE — no Firebase)
                             ├── renderScopedWheel()   360 / items.length
                             ├── STATUS_COLORS         six fills
                             ├── renderWheelSidebar()  ← section headings (v08.02)
                             └── renderWheelLegend()
```

## 3. Who depends on `records.js`

```
                        js/records.js  (claimStatus)
                               ▲
     ┌──────────┬──────────┬───┴────┬──────────┬──────────┬──────────┐
     │          │          │        │          │          │          │
quranrevival  records   topic-   routine-   asma-     self-      monitor.js
  .html×3     .html     study.js  study.js   study.js  check.js   (reads only)
```

**Nine write call sites, one function.** Any change to `claimStatus()`'s
signature or behaviour reaches every module in the application.

## 4. Who depends on `catalogue.js` / `getTrackables()`

```
                     js/catalogue.js  getTrackables()
                               ▲
   ┌────────────┬──────────────┼──────────────┬────────────┬──────────┐
quranrevival  records      catalogue      monitor.js    backup.js   topic-/
  .html       .html         .html                                   routine-/
 (the wheel) (the table)  (the editor)                              asma-study.js
```

**Returns all 39 trackables** — the 30 Approaches *and* the 9 module-wide ones.
Callers filter. **This shared return caused a real v08.01 hazard**: a flat
position picker would have renumbered trackables in modules the owner was not
looking at. Ordering is now scoped to the Quran set.

## 5. The four renderer families

```
  MODULE                       RENDERER      CONTROLLER              PAGES
  ────────────────────────────────────────────────────────────────────────
  quranrevival                 "ayah"        inline (12,051 lines)   1
  deen · arabic · hadith
  general · naturelife
  lifeskill                    "topic"       topic-study.js          6
                                              └─ topic-renderer.js
  health · ldog                "routine"     routine-study.js        2
  asma                         "asma"        asma-study.js           1
                                              └─ asma-renderer.js
```

```
    deen-study.html ─┐
   arabic-study.html ├─▶ initTopicStudyPage({moduleId, trackableId, rootSubjectId})
   hadith-study.html ├─▶       │
  general-study.html ├─▶       ├─▶ topic-renderer.js   (pure)
naturelife-study.html├─▶       ├─▶ catalogue.js        (subject tree)
     life-skill.html ─┘        ├─▶ records.js          (claims)
                               └─▶ way-modal.js        (pure)
```

**Six pages, one controller, ~149 lines each.** The best structural pattern in
the codebase.

## 6. The pure-renderer boundary (I2)

```
   ┌──── NEVER import Firebase ────┐        ┌──── DO import Firebase ────┐
   │  mastery-wheel.js             │        │  records.js                │
   │  way-modal.js                 │        │  catalogue.js              │
   │  ayah-renderer.js             │        │  activity.js               │
   │  ayah-note-renderer.js        │        │  bookmarks.js              │
   │  topic-renderer.js            │        │  people.js · invites.js    │
   │  asma-renderer.js             │        │  monitor.js · homework.js  │
   │  hifz-renderer.js             │        │  qcr.js · asma-collections │
   │  nav.js                       │        │  backup.js · taglines.js   │
   │  labels.js                    │        │  identity.js · grades.js   │
   │  backup-file.js               │        │  curriculum.js · domains.js│
   └───────────────┬───────────────┘        └─────────────┬──────────────┘
                   │                                      │
                   └────────── HOST PAGE owns both ───────┘
```

**`labels.js` is what makes the boundary hold.** `confirmStateLabel` and
`activityActionLabel` were **moved** there and re-exported, so a pure renderer
can print them without pulling in Firebase.

## 7. Static-data dependency chain

```
tools/quran-data-pull/pull.js
   ├── alquran.cloud        → ayah text, translations, juz/page/ruku/manzil/hizbQuarter
   ├── api.quran.com v4     → tajweed text, per-word Arabic/translit/en/bn
   └── Quranic Arabic Corpus 2011 → root, lemma, POS
                    │   (128,011 rows in; root/lemma/POS out — the rest DISCARDED)
                    ▼
        output/surahs/*.json  (27 MB, 114 files)
                    │
        ┌───────────┼──────────────┬────────────────┐
        ▼           ▼              ▼                ▼
  build-juz-   build-hizb-   build-page-    build-search-
   index.js     index.js      index.js        index.js
   (30 rows)    (60 rows)     (604 rows)    (3 × 6,236)
        └───────────┴──────────────┴────────────────┘
                    ▼
            app/js/quran-data.js   ← the ONLY reader
                    ▼
     ayah-renderer · quran-search · Explore · the unit pickers
```

## 8. The rules-support mirrors

```
  Firestore rules CANNOT run a query — only get()/exists() on a fixed path.
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      tenantMemberUids                teacherStudentLinks
      uid → { tenantId,               {t}__{teacher}__{student}
              personId, roles }        = "actively co-enrolled"
              │                               │
              ▼                               ▼
      hasRoleIn() · isOwnerIn()        isCoEnrolledTeacherOf()
      canAdminIdentity()                        │
              └──────────────┬───────────────────┘
                             ▼
                      canRecordFor(tenantId, personId)
                             │
        ┌────────────┬───────┴────────┬──────────────┐
        ▼            ▼                ▼              ▼
     records     activity        bookmarks       ayahNotes
```

**Neither mirror appears in any UI.** Both exist solely so the rules can answer
a question they could otherwise only answer with a query.

## 9. Cross-cutting concerns

```
  EVERY WRITE                          EVERY USER-VISIBLE NAME
  ───────────                          ───────────────────────
  service fn                           {en, bn} object
     ▼                                        ▼
  envelope.js   (I17)                   lang.js langText()
     ▼                                        ▼
  safeWrite()   (I15)                   i18n.js t() + num()
     ▼                                        ▼
  Firestore                             i18n/bn.js (2,293 lines)
     │                                        ▲
     ▼                                  tools/i18n-coverage.mjs
  firestore.rules   (I13)                 (a to-do list, never evidence)
```

## 10. Feature → dependency matrix

| Feature | records.js | catalogue.js | quran-data.js | mastery-wheel.js | firestore.rules | i18n |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Quran Reader | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Approaches | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ |
| Study Units | ✔ | ✘ | ✔ | ✔ | ✘ | ✔ |
| Claims | ✔ | ✘ | ✘ | ✘ | ✔ | ✔ |
| Approval | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Explore | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Wheel | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ |
| Word-by-Word | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ |
| Topic modules | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Monitor | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Backup | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| People / roles | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ |

**`mastery-wheel.js` depends on nothing** — which is exactly why it is reusable.

## 11. The blast radius, ranked

| Change here | Reaches |
|---|---|
| **`records.js` `claimStatus()`** | **every module** — 9 call sites |
| **`unit-keys.js` `STATUSES`** | **every stored record** — ids are live data |
| **`envelope.js`** | **every write** |
| **`firestore.rules`** | **every read and write** |
| **`collections.js`** | every service |
| **`catalogue.js` `getTrackables()`** | 9 consumers |
| **`quranrevival.html`** | the Quran screen, Note view, both wheels, Explore |
| `mastery-wheel.js` | every wheel — but **it depends on nothing** |
| `catalogue-data.js` | only **new** tenants (existing ones already seeded) |
| `ayah-renderer.js` | the reading panels |
| `i18n/bn.js` | every Bangla surface |
| `topic-study.js` | 6 pages at once |
| `nav.js` | every page's navigation |



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
