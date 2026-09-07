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
