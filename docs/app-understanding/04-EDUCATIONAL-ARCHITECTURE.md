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
