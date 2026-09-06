# Document 10 — Relevant Code Map

QuranRevival v08.00 · every source file relevant to the future Arabic learning
integration

**Modification risk** below means: how likely a change here is to break existing
behaviour, given that this project has **no build step, no type system, and no
automated test coverage for most screens**. Verification is a Playwright harness
(`tools/i18n-verify`) plus hand-written per-round scripts.

Files marked ✅ are included in `code/` in this package.

---

## Tier 1 — Certain to be involved

### `app/js/catalogue-data.js` ✅ · 373 lines
**Purpose:** Platform master data. `APPROACH_TEMPLATES` (the 30 Approaches),
`SECTION_NAMES` (7), `SUBJECT_TEMPLATES` (31 subjects), `TOPIC_TRACKABLE_TEMPLATES` (9).
**Relevance: HIGHEST.** Any new Approach is a row here.
**Dependencies:** none — pure data, no imports beyond its own helpers.
**Modification risk: LOW.** Appending a template is additive and idempotent
(`ensureTenantCatalogueSeeded()` diffs by id). Editing an existing template's
`name` silently re-syncs into every tenant copy where `edited !== true`.

### `app/js/records.js` ✅ · 393 lines
**Purpose:** The whole tracking core — chunking, claim, confirm, return, bulk
confirm, read.
**Relevance: HIGHEST.** Every progress write in the app goes through
`claimStatus()` here.
**Dependencies:** Firestore SDK, `collections.js`, `envelope.js`, `unit-keys.js`,
`i18n.js`, `course-offers.js`.
**Modification risk: VERY HIGH.** Nine call sites across six files; I6 (frozen
confirmation) is enforced entirely by the field-by-field ternaries in
`claimStatus()`. A change to `chunkKeyFor()` is a **data migration**, because
existing claims live in documents named by its current output.
*Good news:* new unit keys and new trackable ids need **no change here at all**.

### `app/js/unit-keys.js` ✅ · 166 lines
**Purpose:** Unit key construction/parsing, the six statuses, `summarizeStatuses()`.
**Relevance: HIGHEST.** A `word:` unit type would be defined here.
**Dependencies:** `i18n.js` only.
**Modification risk: MEDIUM.** Additive changes (a new `UNIT_TYPES` entry, a new
`buildUnitKey` constructor) are safe. **Touching `STATUSES` is very high risk** —
the ids are stored values in live Firestore data.

### `app/quranrevival.html` · 12,027 lines
**Purpose:** The entire Quran study screen, the Mastery Wheel, the Note view and
the whole Explore module, inline in one `<script type="module">`.
**Relevance: HIGHEST.** Every UI change lands here.
**Dependencies:** ~30 modules from `app/js/`.
**Modification risk: VERY HIGH.** Single largest file; no build step; no module
boundaries within the script; layout is measured at 8 viewports × 2 languages
per round by project convention.
**Key regions** (all reproduced in `code/extracts/EXTRACT__quranrevival.html.txt`):

| Lines | Function |
|---|---|
| 4460–4560 | `currentTrackable()`, Approach select options |
| 4752–5060 | unit machinery — `currentUnitInfo()`, pickers, `goToUnitNumber()` |
| 5445–5480 | `loadContextData()` — where `quranTrackables[]` is created |
| 5545–5800 | chunk loading, `subject_quran` cache, `renderWheel()` |
| 6450–6660 | Explore aggregation — `poolCoverageStatus()`, `effectiveAyahStatus()`, `buildExploreWiderSpans()` |
| 6777–7100 | Explore level renderers |
| 10920–10983 | the claim write path |

---

## Tier 2 — Highly likely to be involved

### `app/js/mastery-wheel.js` ✅ · 395 lines
**Purpose:** Pure SVG renderer for both wheels, plus `STATUS_COLORS`, legend, sidebar.
**Relevance: HIGH.**
**Dependencies:** **none** (I2 — never imports records.js or Firebase).
**Modification risk: LOW–MEDIUM.** Segment-count-agnostic and already called with
1…604 items. Adding an optional item field is backward-compatible — `sliceLines` /
`sliceArabicLines` are existing precedent. **Changing `STATUS_COLORS` is high
risk**: Achieved vs Mastered must stay visibly distinct, and `not_applicable` is
an SVG pattern, not a colour.

### `app/js/way-modal.js` ✅ · 254 lines
**Purpose:** Track / Guide / Breakdown / Coverage tabs; the status picker.
**Relevance: HIGH** — where a per-level claim UI would live.
**Dependencies:** `unit-keys.js`, `mastery-wheel.js` (colours), `i18n.js`.
**Modification risk: MEDIUM.** Pure renderer (I2) — the host page wires the
button. Holds the app's only percentage (`renderBreakdownTab`, line 99).

### `app/js/quran-data.js` ✅ · 170 lines
**Purpose:** The only reader of the static Quran files.
**Relevance: HIGH** — a new word/root/lemma index would be loaded here.
**Dependencies:** none (plain `fetch`).
**Modification risk: LOW.** Adding a promise-cached loader alongside the existing
four is a copy of an established pattern. **The constraint is I9, not the code:
nothing may join the startup path.**

### `app/js/ayah-renderer.js` ✅ · 230 lines
**Purpose:** The study panels, including `wordByWord`, `root`, `derivatives`.
**Relevance: HIGH** — the existing word-study UI.
**Dependencies:** `i18n.js`, `labels.js`.
**Modification risk: MEDIUM.** `PANEL_ORDER` + `PANEL_RENDERERS` (line 206/213)
are a clean extension point — and the file's own comment states the design rule:
*"adding approach 31 is a row of data, not a build — only holds if this switch
never grows per-Approach special cases."* **A panel name not in the map renders
nothing, silently.**

### `tools/quran-data-pull/pull.js` ✅
**Purpose:** Builds the 31 MB dataset from three upstream sources.
**Relevance: HIGH for Level 3** — the grammar/morphology features Level 3 needs
were read (128,011 corpus rows) and **discarded** at lines 206–215.
**Dependencies:** network access to alquran.cloud, api.quran.com, a GitHub corpus mirror.
**Modification risk: HIGH.** Re-pulling regenerates all 114 files. **If
tokenisation changes, every stored word-level unit key would be invalidated —
and I5 requires unit keys to be permanent.**

### `firestore.rules` ✅ · 1,122 lines
**Purpose:** All server-side authorisation.
**Relevance: MEDIUM.**
**Modification risk: VERY HIGH** — it is the only real security boundary.
*Good news:* the `records` rules never inspect `entries`, so **new unit keys,
trackable ids and entry fields need no rules change.** A change is needed only
for a **new collection**, and then the mirror pattern (`teacherStudentLinks`)
applies because rules cannot run queries.

---

## Tier 3 — Supporting

| File | Lines | Purpose | Relevance | Risk |
|---|---|---|---|---|
| `app/js/catalogue.js` ✅ | 559 | Seeding, `getTrackables()`, rename/archive | HIGH | **HIGH** — `SEED_CHUNK_SIZE = 5` exists because of the rules `get()` budget |
| `app/js/collections.js` ✅ | 79 | Every collection name as a constant | MEDIUM | LOW — a new collection is one line |
| `app/js/envelope.js` ✅ | 99 | I17 envelope on every write | MEDIUM | HIGH — every write passes through it |
| `app/js/labels.js` ✅ | 192 | `posLabel()`, `confirmStateLabel()`, `activityActionLabel()` | MEDIUM | LOW — pure, Firebase-free by design |
| `app/js/activity.js` ✅ | 152 | The append-only weekly audit log | MEDIUM | MEDIUM |
| `app/js/monitor.js` ✅ | 225 | Reporting; second caller of `summarizeStatuses()` | MEDIUM | LOW — read-only |
| `app/records.html` | 700 | **The only** confirm/return UI | MEDIUM | MEDIUM |
| `app/js/prefs.js` ✅ | 713 | localStorage view/level preferences | LOW–MED | LOW |
| `app/js/quran-search.js` ✅ | 162 | Ayah-level search over prebuilt indexes | LOW–MED | LOW — closest precedent for a new index |
| `app/js/topic-study.js` ✅ | 633 | Topic renderer — a **second complete claim path** worth reading as a model | MEDIUM | MEDIUM |
| `app/js/feature-registry.js` ✅ | 132 | Feature/phase status shown on `about.html` | LOW | LOW |
| `app/js/modules.js` ✅ | 62 | Platform module registry | LOW | MEDIUM (platformAdmin-gated) |
| `app/js/domains.js` ✅ | 34 | `records.entries.domainIds[]` tag registry (D12) | LOW | LOW |
| `app/js/ayah-note-renderer.js` ✅ | 924 | Note view rendering — where the claim card is embedded | MEDIUM | MEDIUM |
| `app/js/hifz-renderer.js` ✅ | 308 | An Approach-specific renderer — precedent for a bespoke study mode | LOW–MED | LOW |
| `app/arabic-study.html` | 149 | **NOT word study** — the generic topic renderer for the "Arabic Language" subject | LOW | LOW |

---

## Deliberately NOT exported, and why

| File | Reason |
|---|---|
| `app/js/firebase-init.js` | **Contains the Firebase web client configuration.** Excluded from this package under the no-credentials rule |
| `app/quranrevival.html` (full) | 12,027 lines, mostly unrelated UI. **Region extract provided instead** |
| `app/records.html` (full) | 700 lines. **Region extract provided instead** |
| `tools/quran-data-pull/output/surahs/*.json` (113 of 114) | 27 MB. **`surah_001.json` in full + a `surah_002` extract provided**; see DATASET_INVENTORY.md |
| `search-{en,ar,bn}.json` | 4.4 MB combined; documented in DATASET_INVENTORY.md |
| `page-index.json` | 64 KB, 604 rows; documented, not copied |
| `legacy/`, `legacy-v07/` | Frozen archives, reference only, never edited |
| `mushaf/` | 98 MB of page fonts, irrelevant here |
| Finance / Operations / messaging / homework / curriculum modules | Out of scope per the brief |

---

## Dependency shape

```
                      ┌──────────────────────┐
                      │  catalogue-data.js   │  pure data, no imports
                      └──────────┬───────────┘
                                 ▼
   collections.js ──▶ catalogue.js ──▶ (Firestore: trackables, subjects)
        │
        ├──▶ envelope.js  ──▶ every write (I17)
        │
        └──▶ records.js ──▶ unit-keys.js ──▶ i18n.js
                  │
                  ▼
        app/quranrevival.html  ◀── quran-data.js ◀── static JSON (31 MB)
                  │
                  ├──▶ mastery-wheel.js     (I2: pure, no Firebase)
                  ├──▶ way-modal.js         (I2: pure, no Firebase)
                  ├──▶ ayah-renderer.js     (I2: pure, no Firebase)
                  └──▶ activity.js ──▶ (Firestore: activity)
```

**I2 — modules never call each other; renderers are shared components.** Every
renderer is Firebase-free and takes data in, returns markup out. `labels.js`
exists precisely so that pure renderers can print a label without importing
`records.js` (which imports Firebase). **Any new renderer must follow the same
split**, and any new label helper belongs in `labels.js`.
