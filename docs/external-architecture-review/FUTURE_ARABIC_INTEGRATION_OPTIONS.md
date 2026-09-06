# Document 11 — Future Arabic Integration Options

QuranRevival v08.00 · technical comparison of Options A, B and C against the
**actual** codebase

**This document does not choose a curriculum option.** It reports what each
option costs technically, given what the code really does. Every claim traces to
a finding in Documents 1–10.

---

## 0. The five findings all three options run into

Established in Documents 1–10, restated here because everything below depends on
them:

1. **An Approach is just a row in `trackables` with `subjectId: "quran"`.** One
   filter line (`quranrevival.html:5468`) is the whole definition. Nothing
   anywhere assumes 30. *(Doc 1 §7, §13)*
2. **`trackables` is flat.** No `parentId`, no `levels[]`, no `trackIds[]`. The
   only grouping field, `group`/`groupName` (the 7 sections), is **display-only**
   and carries no records meaning. *(Doc 1 §11)*
3. **`trackableId` is an opaque string that nothing parses.** Compound ids are
   storable today with **no schema and no rules change**, and each gets its own
   fully independent status, confirmation state and approval. *(Doc 3 §14.1)*
4. **There is no `word:` unit key, no word id, and no word-level index.** And
   per-word-occurrence claims exceed Firestore's 1 MiB document limit by ~26×.
   Root-level claims fit; lemma, surface-form and per-occurrence claims do not.
   *(Doc 3 §13, Doc 7 §6–7)*
5. **The whole progress system is ordinal, never cardinal.** No percentage drives
   any colour anywhere; Explore contains no percentage at all. A coverage metric
   is a new *kind* of quantity, not an extension of an existing one. *(Doc 5 §11,
   Doc 6)*

**Findings 4 and 5 are identical for all three options.** They are about *word
data and coverage*, not about how Approaches are arranged. **No option is
cheaper or more expensive because of them** — which means the A/B/C choice can
be made on curriculum grounds without foreclosing anything on the data side.

---

## OPTION A — Three separate Approaches

> `Word-by-Word Meaning` · `Roots and Uses` · `Arabic in Depth`
> — three peer trackables, `subjectId: "quran"`.

### Compatibility with current code
**Complete. This is the only option the code already supports end to end**, with
no structural change of any kind. Three new rows in `APPROACH_TEMPLATES` and a
re-seed; everything downstream works because everything downstream iterates
`quranTrackables`.

### Database implications
**None.** Three new `trackables` documents per tenant. Records entries
(`ayah:2:255::approach_31`) are the shape `claimStatus()` already writes. No new
collection, no new field, no migration.

### Progress implications
**Fully independent by construction** — three trackable ids, three separate
entries, three separate statuses. The brief's requirement that no level implies
another is satisfied automatically, because **nothing links them**.

### Teacher approval implications
**Works unchanged.** Each of the three entries carries its own `confirmState`,
`confirmedStatus`, `confirmedByPersonId`, `confirmedAt`. They appear as three
independent rows in `app/records.html` and are independently confirmable and
returnable. Bulk confirm handles them like any other entries.

### Explore implications
**Works unchanged** — three additional rows in `renderExploreApproachList()`.
Each pools, colours and drills exactly like the existing 30.
*Cost:* they appear as three flat, unrelated rows. **The fact that they are a
progression is invisible to the software** — though `group`/`groupName` could
place them in a shared section, which is display-only but is exactly what
sections are for.

### Wheel implications
**Landing wheel: 30 → 33 segments.** No code change (`360 / n`). **But this is a
measured layout risk, not a theoretical one:** the project's own note at
`quranrevival.html:575` records that with a real 30-Approach tenant the
Approaches list already scrolls inside its card, and 30 is already at the edge of
legibility for a phone-width wheel. **33 segments must be measured at 8
viewports in both languages before shipping.** It will not break; it may not
read.
*Explore wheel: unaffected* — its axis is units, not Approaches.

### UI implications
- The caption **"Approach the Quran in 30 ways"** (`quranrevival.html:2625`) and
  its Bangla counterpart (`bn.js:543`) become **factually wrong**. Copy + one
  translation key.
- The 30-Juz symmetry the project values is broken at 33.
- Three sibling rows with no visible relationship.

### Risk
**LOWEST.** No new concepts. The failure mode is cosmetic and measurable.

### Files likely affected
**2 certain, 1 conditional:**
`catalogue-data.js`, `i18n/bn.js`; plus `quranrevival.html` **only** if the
caption is reworded or the layout needs adjusting at 33 segments.

### Long-term maintainability
**Good, with one reservation.** Each Approach is an ordinary Approach forever —
no special-case code, and the file's own design rule ("adding approach 31 is a
row of data, not a build") holds exactly. The reservation is conceptual: the
30-Approach ceiling is a stated project principle, and Option A spends three of
its slots. If more Arabic levels are ever added, this scales linearly into that
ceiling.

---

## OPTION B — Two Approaches, one containing two levels

> `Understanding Quranic Arabic` { Level 1, Level 2 } · `Arabic in Depth` { Level 3 }

### Compatibility with current code
**Partial.** The *storage* works today; the *presentation* does not exist.
Two sub-options, and they differ enormously:

**B1 — compound trackable ids, one trackable row.** Store
`…::approach_31_L1` and `…::approach_31_L2` against a single
`approach_31` trackable.
*Works at storage:* yes, today, unchanged (finding 3).
*Breaks at selection:* **Explore and the wheel key on a single selected
`trackable.id`.** `effectiveAyahStatus()`, `buildExploreWiderSpans()` and
`approachStatusesForCurrentUnit()` all compose `${unitKey}::${trackable.id}` —
so **the two levels are stored independently but cannot be selected, coloured or
displayed apart.** *(Doc 5 §16)*

**B2 — a parent trackable plus two child trackables.** Requires the new field
described in Doc 3 §14.3.
*Works at storage:* yes.
*Requires:* a parent/child field, a change to the `quranTrackables` filter, and
**a roll-up rule that does not exist anywhere in this app.**

### Database implications
**B1:** none. **B2:** one additive field on `trackables` (e.g.
`parentTrackableId` or `kind`). Additive — existing rows read as top-level by
absence. No migration.

### Progress implications
**Independent per level in both sub-options** — different entry keys, different
entries. **But a parent Approach's own status is undefined.** The app has two
aggregation rules and **neither applies**: weakest-link pooling and
floor-propagation are both about *units*, not *trackables*. **The brief
explicitly forbids the obvious defaults** ("do not assume Level 1 automatically
completes Level 2"). **This is a design decision the code cannot supply.**

### Teacher approval implications
**Works per level, unchanged.** Each level's entry has its own approval state.
*New question:* does confirming Level 2 imply anything about Level 1? **Today,
no — and there is no mechanism that could make it so.** That is probably the
desired answer given the brief, but it should be stated deliberately.

### Explore implications
**B1: the two levels are invisible to Explore.** One Approach row, one selected
id; no way to see Level 1 and Level 2 apart.
**B2: needs a nested or sectioned Approach list.** `renderExploreApproachList()`
(`:6705`) is a flat list with one selected id. Two existing levers help — the
`group`/`groupName` sectioning, and the per-level view-toggle pattern that
already remembers a choice per level — but the nesting itself is new work.

### Wheel implications
**Landing wheel: 30 → 32 segments** (better than A's 33). Same measurement
requirement.
**But B2 raises a question with no answer in the code: what colour is a parent
segment when its children disagree?** A parent must show *something*, and there
is no rule to derive it from.

### UI implications
- A level selector must be designed — it does not exist.
- The "30 ways" caption is still wrong at 32.
- Two Approaches with different internal shapes (one has levels, one has one) is
  an inconsistency a user will notice.

### Risk
**MEDIUM.** B1 risks building something that stores correctly and cannot be
displayed. B2 is honest work but introduces the app's first parent/child
trackable concept, and its central rule is undecided.

### Files likely affected
**B1: 2–3.** `catalogue-data.js`, `i18n/bn.js`, plus `quranrevival.html` for any
level picker.
**B2: 5–7.** Add `catalogue.js` (seed shape), the `quranTrackables` filter,
`renderExploreApproachList()`, `renderWheel()`, and possibly `way-modal.js`.

### Long-term maintainability
**B1: poor** — a naming convention doing a schema's job. The relationship lives
only in a string prefix that nothing validates; a typo produces a silent orphan
entry that no code will ever notice.
**B2: good** — a real, additive, general parent/child concept that later
Approaches could also use. Its cost is honest and one-time.

---

## OPTION C — One umbrella Approach containing three levels

> `Understanding Quranic Arabic` { Level 1, Level 2, Level 3 }

### Compatibility with current code
**Same as Option B structurally, with three children instead of two.** Every B
finding applies unchanged. The differences are all in the trade-offs.

### Database implications
Identical to B. **C1** (compound ids): none. **C2** (parent + 3 children): one
additive field.

### Progress implications
Identical to B, **with the roll-up problem made harder**: a parent must
reconcile three children rather than two, and the brief states the three are
genuinely independent paths — a student may do Level 1 and never attempt Levels
2 or 3. **A parent status over three deliberately-unrelated children is close to
meaningless**, which is worth weighing.

### Teacher approval implications
Identical to B, per level.

### Explore implications
Identical to B2 — needs nesting. Slightly better: **one** Approach with a
consistent internal shape, rather than B's two Approaches shaped differently.

### Wheel implications
**Landing wheel: 30 → 31 segments.** **The best of the three options**, and the
only one that essentially preserves the 30-Juz symmetry and needs no layout
rework. The parent-colour question is the same as B2's, and harder with three
children.

### UI implications
- A three-way level selector — new, and the most complex of the three options.
- **The "30 ways" caption survives closest to true** at 31.
- Conceptually the cleanest: one Arabic Approach, three depths.

### Risk
**MEDIUM–HIGH.** Most new UI, hardest roll-up question, and — if C1 is chosen —
the same "stores fine, cannot be displayed" trap as B1, tripled.

### Files likely affected
**C1: 2–3.** **C2: 5–7.** Same list as B.

### Long-term maintainability
**Best of the three, if C2 is built properly.** One Approach slot spent instead
of three; a general parent/child mechanism available to future Approaches; the
30-Approach principle intact. **Worst of the three if C1 is chosen**, because
three levels hidden in id suffixes are three chances for a silent orphan.

---

## Side-by-side

| | **A** — 3 Approaches | **B** — 2 Approaches, one w/ 2 levels | **C** — 1 Approach, 3 levels |
|---|---|---|---|
| Works with code as-is | **Yes, fully** | Storage only | Storage only |
| Schema change | **None** | None (B1) / 1 additive field (B2) | None (C1) / 1 additive field (C2) |
| Rules change | **None** | **None** | **None** |
| Migration | **None** | **None** | **None** |
| Independent progress | **Yes** | Yes | Yes |
| Independent approval | **Yes** | Yes | Yes |
| Levels visible in Explore | Yes (as 3 peers) | **No (B1)** / needs nesting (B2) | **No (C1)** / needs nesting (C2) |
| Landing wheel segments | **33** | 32 | **31** |
| Parent roll-up rule needed | **No** | **Yes — undefined** | **Yes — undefined, hardest** |
| Approach slots used (of ~30) | **3** | 2 | **1** |
| "30 ways" caption | wrong | wrong | **closest to true** |
| Files likely affected | **2 (+1)** | 2–3 / 5–7 | 2–3 / 5–7 |
| Technical risk | **Lowest** | Medium | Medium–High |
| Long-term maintainability | Good | Poor (B1) / Good (B2) | Worst (C1) / **Best (C2)** |

---

## What every option needs equally — and it is the larger job

**These are identical across A, B and C**, and together they are substantially
more work than the A/B/C choice itself:

| Need | Status | Reference |
|---|---|---|
| A word-level identity (`word:{s}:{a}:{p}` or similar) | **does not exist** | Doc 7 §6–7 |
| A frequency/occurrence index | **does not exist** — `roots-index.json` is referenced in a comment but is **not** in the repo | Doc 8 §5 |
| A storable claim granularity | **only root-level fits** one Firestore document (~0.56 MiB); lemma ~1.65 MiB, forms ~7.3 MiB, per-occurrence ~26.5 MiB — all over the 1 MiB cap | Doc 3 §13 |
| Somewhere to compute coverage | **browser only** — there are no Cloud Functions in this project | Doc 4 §5 |
| Somewhere to display a percentage | **nowhere** — Explore is entirely ordinal | Doc 5 §11 |
| Level 3 grammar/morphology data | **discarded at pull time** — the 2011 corpus's 128,011 morphology rows were read and only root/lemma/POS kept | Doc 8 §10 |
| A "not-understood" denominator decision | root coverage **caps at 64.5%** of all words | Doc 7 §17, §18a |
| NFC normalisation before any word matching | **not applied anywhere**; 8 forms in this dataset differ only by combining-mark order | Doc 7 §5 |

**The A/B/C decision affects roughly 2–7 files. The word-data work above affects
the dataset pipeline, a new index, a new unit type, a new storage strategy and a
new display concept.** The reviewer may reasonably treat the curriculum-shape
question as the smaller half of this project.

---

## Two traps worth naming explicitly

**Trap 1 — B1/C1 store correctly and cannot be displayed.** Compound trackable
ids work perfectly at the records layer, which makes them look free. But
`effectiveAyahStatus()`, `buildExploreWiderSpans()` and
`approachStatusesForCurrentUnit()` all compose the entry key from **one selected
`trackable.id`**. Levels stored as id suffixes are invisible to every wheel and
every Explore level. This would be discovered only after the storage layer looked
finished.

**Trap 2 — the parent roll-up rule is a curriculum decision wearing technical
clothes.** Both B2 and C2 need an answer to "what is the parent's status when its
children disagree", and **the codebase cannot supply one**: its two aggregation
rules are about units, not trackables, and the brief rules out the obvious
defaults. Deferring this decision will block the build at the point where the UI
is otherwise ready.

---

**No curriculum recommendation is made here.** The technical findings are:
Option A is free today and costs three Approach slots and a caption; Options B
and C cost one additive field, a nesting UI and one genuinely undecided rule,
and buy back Approach slots and conceptual coherence. **All three are blocked
equally, and much more substantially, by the word-data work in the table above.**
