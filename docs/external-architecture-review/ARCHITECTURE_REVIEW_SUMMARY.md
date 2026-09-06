# Architecture Review Summary

**QuranRevival v08.00** · prepared for an external architecture reviewer
· 6 September 2026

Plain-English summary of what the code actually does. Every number here was
computed from the real files and code in this repository. Details and code
excerpts are in Documents 1–11.

**No curriculum recommendation is made anywhere in this package.**

---

## 1. The architecture in one page

QuranRevival is a **multi-tenant Madrasah platform**: a browser-only application
(plain ES modules, **no build step, no framework, no TypeScript**) on Firebase
Auth + Firestore, deployed as static files on GitHub Pages.

Two things matter most about its shape:

- **There are no Cloud Functions.** All logic — including every progress
  calculation — runs in the browser. Firestore security rules are the only
  server-side authority.
- **The Quran content is not in the database.** It is 31 MB of static JSON
  served over HTTP and cached by the browser. Only *progress* is in Firestore.

A strict **load-speed contract** governs startup: after first paint, exactly
three Firestore reads are allowed, and *"nothing joins the startup path without
being flagged."* Several features in the app are lazy-loaded specifically to
honour this.

---

## 2. How the Approaches system works

An "Approach" is not a type in the code. **It is a row in a generic `trackables`
collection whose `subjectId` is `"quran"`.** One line defines the whole concept:

```js
quranTrackables = allTrackables.filter((t) => t.subjectId === "quran" && t.status !== "archived");
```

The 30 Approaches are written once as a hard-coded array in
`app/js/catalogue-data.js`, then **copied into each tenant's own Firestore rows**
by an explicit admin action. A tenant can rename and archive its copies; an
edited copy is frozen against future platform updates.

**Three findings:**

- **Nothing in the code assumes there are 30.** Every consumer iterates the
  array; the wheel divides the circle by `items.length`. The only "30" is the
  on-screen caption *"Approach the Quran in 30 ways"*, which is copy.
- **`trackables` is completely flat** — no parent, no children, no levels. The
  only grouping it has (7 sections) is display-only and carries no progress
  meaning.
- **There is no "Add Approach" button.** Adding one is a code change plus a
  per-tenant re-seed — but it touches **one file**, and the code says so in its
  own words: *"adding approach 31 is a row of data, not a build."*

---

## 3. How study units work

A **unit** is a slice of the Quran a claim attaches to, represented as one
permanent string — a *unit key*: `ayah:2:255`, `surah:1`, `juz:30`,
`page:qpc-hafs:604`.

Twelve unit types are declared; **seven are Quran units** (ayah, range, surah,
ruku', juz, hizb, page). There is **no units table** — the string *is* the unit.
Boundaries come from small generated index files (30 juz, 60 hizb, 604 pages,
114 surahs), all computed from the real per-ayah data rather than hand-typed.

**"Whole Quran" is not a unit.** It is a computed view; you cannot claim it.

---

## 4. How progress tracking works

A status belongs to a **`(person, unit, Approach)` triple** and nothing else. It
is stored in a map inside one document:

```
records/{tenantId}__{personId}__{chunkKey}
  entries { "ayah:2:255::approach_04": { claimedStatus, confirmState, … } }
```

Six statuses: `not_applicable` (excluded from all totals), `not_started`,
`learning`, `practising`, `achieved`, `mastered`.

**The two most important properties:**

- **Only claims are stored. Everything above a claim is recalculated on every
  render.** There is no summary document, no aggregate counter and no cache
  anywhere in the application. Nothing can drift — but nothing is precomputed
  either.
- **Both halves of the entry key are opaque strings that nothing parses.** No
  code validates a trackable id or a unit key against anything.

---

## 5. How teacher approval works

A student's claim is written with `confirmState: "pending"`; a teacher, guardian
or owner confirms or returns it on the Records screen. The confirmed value is
then **frozen** — a later claim never rewrites it.

Whether approval is needed is **computed, not configured**: "does this person
have someone standing over them?" Owners, primes, teachers and guardians
self-confirm; students and guardian-managed children need confirmation.

**The finding that most changes how "approval" should be understood here:**

> **Teacher approval does not gate any visual progress.** Every wheel, every
> Explore colour and every roll-up reads `claimedStatus` — the student's own
> unverified claim. `confirmedStatus` is written, frozen and displayed in the
> Records table, but it drives **no colour anywhere.** A returned claim still
> shows green on the wheel.

Also worth knowing: the security rules do **not** distinguish claiming from
confirming — that separation exists only in client-side JavaScript.

---

## 6. How Explore works

Explore is a panel inside the main Quran page, with four drill levels:
**Quran → Juz → Surah → Ruku'**. The wheel's segments are **Quran units**; the
Approach is a selector beside it.

Opening Explore loads **up to 115 Firestore documents in parallel** (every surah
chunk the 30 juz touch, plus the Quran-wide chunk), then every level renders
from memory with no further reads.

Explore already switches between **three entirely different content domains** in
the same panel — Quran, Ayah Collections, Asma ul Husna — which is the existing
proof that a new top-level category can be added.

**Explore contains no percentages at all.** Every segment is a status mapped to
one of six colours.

---

## 7. How the wheel works

`renderScopedWheel()` is a **pure renderer**: it takes an array of
`{ key, statusId, title, number }`, divides the circle by `items.length`, and
returns SVG. It never reads Firestore.

**It assumes no fixed segment count** — it is already called with 30, 114, 99
and 1–286 items in the shipped app. The practical limit is legibility, not code:
the project's own measurements record that 30 Approaches already scroll inside
their card at phone width.

**There are two different wheels, with opposite axes**, and confusing them is the
easiest mistake to make:

| | Landing Mastery Wheel | Explore wheel |
|---|---|---|
| One segment per | **Approach** | **Quran unit** |
| Aggregation | **none** — direct claim only | pooling |
| Firestore reads | 1 chunk | up to 115 per open |

---

## 8. How Quran progress aggregates

Two rules, both computed live, both **ordinal — never arithmetic**:

- **Downward (a wide claim is a floor):** claiming "Surah 1, Mastered" makes all
  seven of its ayahs read *at least* Mastered.
- **Upward (a wide unit takes its weakest ayah):** a Juz's colour is the lowest
  status among its ayahs. One unclaimed ayah makes the whole Juz read
  "not started".

`not_applicable` is excluded from both, never counted as zero.

The **landing wheel deliberately does not aggregate at all** — it shows only the
selected unit's own direct claim, because the card a segment opens claims that
exact unit.

---

## 9. How Quran word data works

**77,429 word occurrences** across 6,236 ayahs, stored inline in the per-surah
JSON. Each word has: Arabic, transliteration, English gloss, Bangla gloss, root,
lemma and part of speech.

| | Coverage |
|---|---|
| Arabic, transliteration, English, Bangla, POS | **100%** |
| Lemma | **95.7%** (4,832 distinct) |
| Root | **64.5%** (1,642 distinct) |

**The dataset counts orthographic words, not morphological segments.** بِسْمِ is
**one** word, though it is grammatically preposition + noun. Repeated words are
**not** grouped — each occurrence is its own entry. The forms named in the brief
(رَبِّ, رَبُّكَ, رَبِّهِمْ, رَبَّنَا) are kept separate, exactly as required: they are
4 of **175 distinct forms** sharing the root ربب, which occurs **980 times**.

**Four findings that will shape any coverage feature:**

1. **There is no word ID.** A word's address is `(surah, ayah, position)`, but
   that triple is never turned into a key anywhere. `position` is unique only
   within its ayah.
2. **There is no word-level index of any kind.** Answering "where else does this
   word occur" requires reading all 114 files (27 MB) — which the load-speed
   contract forbids. A file named `roots-index.json` is referenced in a code
   comment but **does not exist**.
3. **The English word-by-word gloss cannot be used as word identity.** It is a
   *contextual* translation fragment: **73.8% of word occurrences** have a form
   glossed more than one way, and مِن alone has **72** distinct glosses. Root
   (0.0% ambiguous) and lemma (0.4%) are reliable; the gloss is not.
4. **`rootCount` is not sound arithmetic.** It merges roots ending in و/ي into a
   single counting bucket, so 19 roots disagree with their own real frequency.
   It is a display figure — do not sum it.

**Measured coverage curves**, which make a metric designable:

| Items learned | By surface form | By lemma | By root |
|---|---|---|---|
| top 100 | 29.1% | **54.8%** | 39.0% |
| top 500 | 47.6% | **77.3%** | 59.2% |
| to reach 50% | 618 forms | **72 lemmas** | 219 roots |
| **maximum reachable** | 100% | **95.7%** | **64.5%** |

---

## 10. How Arabic linguistic data works

Everything is inline on the word; there is **no lexicon, dictionary or
morphology database**, and **no external dictionary links anywhere** in the
codebase.

Three per-ayah study panels exist: **Word-by-Word**, **Root** (word + root +
count) and **Derivatives** (word + POS + lemma). **`root` and `derivatives` are
fully built but no Approach currently uses them** — enabling them for a new
Approach is a data row, not code.

Against the brief's three levels:

- **Level 1 (word meanings): data complete.** Only an index is missing.
- **Level 2 (roots and uses): data mostly present but unindexed.** Note that the
  panel called "Derivatives" shows POS and lemma for the *same* word — it does
  not show derivatives. Real derivational data does not exist.
- **Level 3 (grammar, morphology, dictionary): largely absent** — **but the
  upstream source had it.** The 2011 Quranic Arabic Corpus supplied **128,011
  morphology rows** for these words, and `pull.js` keeps only root, lemma and
  POS, discarding case, mood, voice, verb form and person/number/gender.
  **Recovering Level 3 data is a re-pull with a wider extraction, not a hunt for
  a new source.**

---

## 11. Main architectural constraints for the new Arabic system

1. **No word identity and no word index** (§9). The largest single gap.
2. **Firestore's 1 MiB document limit.** One records entry is ~359 bytes, so a
   chunk holds ~2,900 entries. **Root-level claims fit (~0.56 MiB). Lemma
   (~1.65 MiB), surface-form (~7.3 MiB) and per-occurrence (~26.5 MiB) claims do
   not.** This is arithmetic, not opinion.
3. **The system is ordinal, not cardinal.** Nothing anywhere sums or divides
   toward a total; no percentage drives any colour. A coverage figure is a new
   kind of quantity requiring a new display concept.
4. **No Cloud Functions.** Anything computed must be computed in the browser
   from documents already read.
5. **The load-speed contract.** Nothing may join the startup path. Any new index
   must be lazily loaded — the existing search index is the precedent.
6. **Denominator ambiguity.** Root coverage caps at 64.5% of all words. Whether
   the denominator is 77,429 or 49,971 changes a student's number by half again,
   and the dataset does not decide it.
7. **Unicode normalisation is applied nowhere**, yet 8 forms in this dataset
   differ only by combining-mark order. Any word matching must NFC-normalise.
8. **A re-pull is a migration event.** Changed tokenisation would silently
   invalidate every stored word key, and unit keys are required to be permanent.
9. **Teacher scope is by student, not by subject** — a known open gap. An
   outside Arabic teacher cannot today be confined to Arabic.
10. **`app/quranrevival.html` is 12,027 lines** with no build step and no
    automated coverage for most of it. Nearly all UI work lands there.

---

## 12. Does the existing architecture support independently tracked levels?

**At the storage layer: yes, today, with no change at all.**

Because `trackableId` is an opaque string that nothing parses, these are already
three fully independent records entries:

```
ayah:2:255::approach_31_L1
ayah:2:255::approach_31_L2
ayah:2:255::approach_31_L3
```

Each gets its **own** status, confirmation state, approving person, timestamp
and notes. **No schema change, no security-rules change, no migration.** The
brief's requirement that each level have independent progress and independent
teacher approval is met by the data layer as it stands.

**At every layer above storage: no.**

Everything above assumes *one trackable = one Approach = one wheel segment = one
list row*. There is no field on `trackables` that says two rows belong together
for progress purposes, and there is **no rule anywhere for what a parent's
status is when its children disagree.** The app's two aggregation rules are
about *units*, not *trackables*, and the brief explicitly rules out the obvious
defaults.

**So the single blocking absence is one field** — a records-meaningful grouping
field on `trackables` — **plus one genuinely undecided rule**, which is a
curriculum decision rather than a technical one.

---

## 13. Technical implications of Options A, B and C

| | **A** — 3 Approaches | **B** — 2 Approaches, one w/ 2 levels | **C** — 1 Approach, 3 levels |
|---|---|---|---|
| Works with code as-is | **Yes, fully** | Storage only | Storage only |
| Schema change | **None** | None, or 1 additive field | None, or 1 additive field |
| Security-rules change | **None** | **None** | **None** |
| Migration | **None** | **None** | **None** |
| Independent progress + approval | **Yes** | Yes | Yes |
| Levels visible in Explore | Yes, as 3 peers | needs new nesting UI | needs new nesting UI |
| Landing wheel segments | 33 | 32 | **31** |
| Parent roll-up rule needed | **No** | **Yes — undefined** | **Yes — undefined, hardest** |
| Approach slots used | 3 | 2 | **1** |
| Files likely affected | **2 (+1)** | 2–3, or 5–7 | 2–3, or 5–7 |
| Technical risk | **Lowest** | Medium | Medium–High |

**Two traps worth naming:**

- **Storing levels as id suffixes works and cannot be displayed.** Explore and
  both wheels compose the entry key from **one selected trackable id**, so levels
  hidden in a suffix are invisible to every colour and every drill level. This
  would only be discovered after the storage layer looked finished.
- **The parent roll-up rule is a curriculum decision in technical clothing.**
  Deferring it will block the build exactly when the UI is otherwise ready.

**Crucially: the A/B/C choice affects roughly 2–7 files. The word-data work in
§11 affects the dataset pipeline, a new index, a new unit type, a new storage
strategy and a new display concept — and it is identical for all three options.**
The curriculum-shape question is the smaller half of this project, and choosing
any option forecloses nothing on the data side.

---

## 14. Recommended technical integration points

Named because the code makes them natural, **not** as a proposed design:

| # | Seam | Why | Cost |
|---|---|---|---|
| 1 | `APPROACH_TEMPLATES` — `catalogue-data.js:217` | Any new Approach is a row here | Very low |
| 2 | `panels[]` + `PANEL_ORDER` — `ayah-renderer.js:206` | The intended extension point for study UI. `root`/`derivatives` are **already built and unused** | Low |
| 3 | The wheel `items[]` contract | Adding a field is backward-compatible; `sliceLines` is existing precedent. **The cheapest place to surface a number** | Low |
| 4 | `quran-data.js` | Where a new lazily-loaded index would be fetched, beside the existing four | Low |
| 5 | `pull.js` lines 206–215 | Where Level 3's grammar data was read and discarded | High — re-pull |
| 6 | `spansForKey()` — `quranrevival.html:6570` | Where a new *unit* type joins every roll-up. **Works for units; cannot express scattered linguistic items** | Low |
| 7 | `trackables` schema | Where a parent/child field would go for Options B/C. Additive; existing rows read as top-level | Medium |
| 8 | `renderExploreApproachList()` — `:6705` | Where a level selector would live. Flat list today | Medium |

**The cheapest genuinely useful first step**, if one is wanted, is **a generated
word-frequency index** (form / lemma / root → count, and optionally →
locations). It is a build-time artefact beside the existing boundary tables, it
is loaded lazily like the search index, it changes no application code, it
breaks nothing — and **it unblocks every version of the coverage calculation
regardless of which curriculum option is chosen.**

---

## Documents in this package

| # | Document |
|---|---|
| 1 | `APPROACHES_ARCHITECTURE.md` |
| 2 | `STUDY_UNITS_ARCHITECTURE.md` |
| 3 | `PROGRESS_TRACKING_ARCHITECTURE.md` |
| 4 | `TEACHER_APPROVAL_ARCHITECTURE.md` |
| 5 | `EXPLORE_ARCHITECTURE.md` |
| 6 | `EXPLORE_WHEEL_DATA_FLOW.md` |
| 7 | `QURAN_WORD_DATA_ARCHITECTURE.md` |
| 8 | `ARABIC_LINGUISTIC_DATA_ARCHITECTURE.md` |
| 9 | `FIRESTORE_RELEVANT_SCHEMA.md` |
| 10 | `RELEVANT_CODE_MAP.md` |
| 11 | `FUTURE_ARABIC_INTEGRATION_OPTIONS.md` |
| — | `DATASET_INVENTORY.md` |
| — | `README.md` |
| — | `code/` — exported source, extracts and dataset samples |
