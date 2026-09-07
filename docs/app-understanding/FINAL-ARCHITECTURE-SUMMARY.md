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
