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
