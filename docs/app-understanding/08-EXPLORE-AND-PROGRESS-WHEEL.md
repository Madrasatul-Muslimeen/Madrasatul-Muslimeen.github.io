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
