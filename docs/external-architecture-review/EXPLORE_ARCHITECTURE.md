# Document 5 — Explore Architecture

QuranRevival v08.00 · read-only analysis of the live codebase

---

## 1. Exact Explore entry component

**Explore is not a separate component, page or module.** It is a panel inside
`app/quranrevival.html`, opened by a tab button, with all its logic in the same
inline `<script type="module">` block as the rest of the Quran screen.

| Thing | Location |
|---|---|
| Entry point | `app/quranrevival.html:6402` — `tabExploreBtn` click handler |
| Opener | `app/quranrevival.html:6070` — `async function openExplore()` |
| Router | `app/quranrevival.html:6777` — `async function renderExplore()` |
| Panel container | `#explorePanel` in the same file |

The router, verbatim (`quranrevival.html:6777`):

```js
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

**Four drill levels: `quran` → `juz` → `surah` → `ruku`.** Explore has no ayah
level; clicking a ruku' segment leaves Explore and navigates the reading screen.

---

## 2. All major related components

| Component | File / line | Kind |
|---|---|---|
| `renderScopedWheel()` | `app/js/mastery-wheel.js:300` | **pure renderer (I2)** — SVG string out |
| `attachScopedWheelClickHandler()` | `app/js/mastery-wheel.js:346` | click wiring |
| `renderWheelSidebar()` | `app/js/mastery-wheel.js:377` | the list beside the wheel |
| `attachWheelSidebarClickHandler()` | `app/js/mastery-wheel.js:391` | click wiring |
| `renderWheelLegend()` | `app/js/mastery-wheel.js:353` | the six-status key |
| `STATUS_COLORS` | `app/js/mastery-wheel.js:38` | status id → colour |
| `getJuzIndex/getPageIndex/getHizbIndex/getSurahIndex` | `app/js/quran-data.js` | static boundary tables |
| `getRecordsChunk()` | `app/js/records.js:66` | the only Firestore read Explore makes |
| `bar-palette.js` | `app/js/bar-palette.js` | shared popover for the level/view pickers |

`mastery-wheel.js` **never reads records.js** — I2, modules never call each
other; renderers are shared components. All data is passed in.

---

## 3. How Explore receives progress data

**One bulk load per Explore "open", then everything is computed in memory.**
`ensureExploreChunksLoaded()` (`quranrevival.html:6623`), verbatim:

```js
async function ensureExploreChunksLoaded() {
  if (!juzIndexData)  juzIndexData  = await getJuzIndex();
  if (!pageIndexData) pageIndexData = await getPageIndex();
  const neededSurahs = new Set();
  for (const j of juzIndexData)
    for (const c of ayahCoverage(j.startSurah, j.startAyah, j.endSurah, j.endAyah))
      neededSurahs.add(c.surah);
  exploreChunksBySurah = new Map();
  await Promise.all(
    [...neededSurahs].map(async (surahNum) => {
      if (surahNum === currentSurahNum && currentChunk) { exploreChunksBySurah.set(surahNum, currentChunk); return; }
      const chunk = await getRecordsChunk(db, activeTenantId, selectedPersonId, `surah_${surahNum}`);
      if (chunk) exploreChunksBySurah.set(surahNum, chunk);
    })
  );
  exploreSubjectChunk = await ensureQuranSubjectChunk({ force: true });
  await buildExploreWiderSpans();
}
```

**Cost: up to 114 `surah_N` documents + 1 `subject_quran` document, read in
parallel, once per open.** This is the accepted price of the whole-Quran wheel
and is deliberately *not* on the startup path (I9). Drilling deeper never
re-reads Firestore — every level renders from `exploreChunksBySurah`.

Three in-memory structures hold everything:

| Variable | Shape | Built by |
|---|---|---|
| `exploreChunksBySurah` | `Map<surahNumber, recordsChunk>` | `ensureExploreChunksLoaded()` |
| `exploreSubjectChunk` | one records chunk (`subject_quran`) | same |
| `exploreWiderSpans` | `Map<trackableId, [{surah, from, to, statusId}]>` | `buildExploreWiderSpans()` |

---

## 4. How Whole Quran mode works

Level `quran`, two readings — **Juz (30 segments) or Surah (114 segments)**.
Since v07.137 the **Surah reading is the default** (`app/js/prefs.js`), though a
stored user choice always wins.

`renderExploreQuranLevel()` (`quranrevival.html:6789`), the Juz reading:

```js
const items = juzIndexData.map((j) => {
  const coverage = ayahCoverage(j.startSurah, j.startAyah, j.endSurah, j.endAyah);
  const pooled = poolCoverageStatus(coverage, trackable.id);
  ...
});
```

So each Juz segment's colour is the **weakest-link pool over every ayah in that
Juz**, for the one currently selected Approach. Full mechanics in Document 2 §6
and Document 6.

**Whole Quran is a computed view, not a claimable unit.** There is no
`quran:` unit key and no whole-Quran claim (Document 2 §2.8).

---

## 5. How Juz mode works

Level `juz` — reached by clicking a Juz segment. Also two readings:

| Reading | Renderer | Segments |
|---|---|---|
| Pages | `renderExploreJuzPagesView()` `:6880` | the pages between the Juz's own `startPage`/`endPage` |
| Surahs | `renderExploreJuzSurahsView()` `:6933` | the surahs the Juz spans |

Which pages belong to a Juz is computed from the **Juz's own `startPage`/
`endPage`**, not by filtering the page index — because a page can straddle a Juz
boundary (verified against real data by `build-page-index.js`, which is why
`page-index.json` deliberately carries no "which Juz" tag).

---

## 6. How Surah mode works

Level `surah` — `renderExploreSurahLevel()` (`quranrevival.html:6982`). Segments
are either the surah's **ayahs** or its **ruku's**, switching on a threshold:

```js
// app/quranrevival.html:4365
const SURAH_WHEEL_THRESHOLD = 30; // matches index.html's own confirmed threshold
```

A surah of ≤ 30 ayahs draws one segment per ayah; a longer one draws one segment
per ruku' to keep the wheel legible. **This 30 is an ayah count and has nothing
to do with the 30 Approaches** — a trap worth flagging explicitly.

Level `ruku` — `renderExploreRukuLevel()` (`:7039`) — one segment per ayah in
that ruku'. Clicking one leaves Explore via `goToAyahFromExplore()` (`:6679`).

---

## 7. How the Surah list works

`renderExploreQuranSurahsView()` (`quranrevival.html:6838`) — all **114** surahs
as wheel segments, each pooled over its own `1..ayahCount` range from
`surah-index.json`. Names come from the surah index and are rendered through the
i18n layer, so a Bangla reader sees Bangla surah names with Bengali digits.

---

## 8. How the wheel is populated

`renderScopedWheel(items, opts)` takes a plain array. Its item contract:

```js
items: [{ key, statusId, title, number, sliceLines?, sliceArabicLines? }]
```

| Field | Meaning |
|---|---|
| `key` | the segment's identity — written to `data-key`, handed back on click |
| `statusId` | one of the six status ids → looked up in `STATUS_COLORS` |
| `title` | the `<title>` tooltip, built by `segTitle()` |
| `number` | the small number printed outside the ring (defaults to `key`) |
| `sliceLines` | optional, opt-in: pre-wrapped lines drawn **inside** the slice |
| `sliceArabicLines` | optional count of leading lines to style as Arabic |

Geometry, `mastery-wheel.js:305`:

```js
const n = items.length || 1;
const anglePer = 360 / n;
```

Fill, `mastery-wheel.js:314`:

```js
const fill = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started;
```

The centre disc is drawn by `centerLabelMarkup()` in one of two modes:
`centerArabic` + `centerRef` (real ayah text), or `centerLabel` + `centerSub`
(a plain title, canvas-measured and wrapped to fit the circle).

---

## 9. How clicking a wheel segment works

`attachScopedWheelClickHandler()` (`mastery-wheel.js:346`), verbatim:

```js
export function attachScopedWheelClickHandler(containerEl, onSegmentClick) {
  containerEl.querySelectorAll(".wheel-seg").forEach((seg) => {
    seg.addEventListener("click", () => onSegmentClick(seg.dataset.key));
  });
}
```

The handler receives **the raw string key** — the renderer does not assume it is
a number. Each level's caller interprets it: a Juz key drills to the juz level,
a surah key to the surah level, an ayah key calls `goToAyahFromExplore()` and
leaves Explore. The sidebar's `attachWheelSidebarClickHandler()` uses the
identical key contract, so the wheel and the list stay interchangeable.

---

## 10. How colours and statuses are determined

`STATUS_COLORS`, `app/js/mastery-wheel.js:38`, verbatim:

```js
export const STATUS_COLORS = Object.freeze({
  not_applicable: "url(#naHatch)",   // an SVG diagonal-hatch pattern, not a colour
  not_started:    "#333f5c",         // dim slate — recedes into the dark navy card
  learning:       "#8a6a35",
  practising:     "#C9A24B",
  achieved:       "#5b84c4",
  mastered:       "#3fae74",         // emerald — a different HUE, deliberately
});
```

Two deliberate design constraints recorded in the code, both relevant to adding
new segments:

- **`mastered` is a different hue, not a darker blue**, because the Architecture
  doc requires Achieved and Mastered to be *visibly distinct* — adjacent colours
  are indistinguishable on a small wheel segment.
- **`not_applicable` is a hatch pattern**, not a colour (I7 — it is an
  exclusion, not a point on the ramp). The legend re-creates it as a CSS
  gradient because a plain HTML container cannot resolve an SVG pattern id.

**There are six colours and no seventh.** Any new track/level must map onto one
of these six statuses; there is no room in this palette for a new state.

---

## 11. How percentages are calculated in Explore

**They are not. Explore contains no percentage at all.** Every segment is a
status id mapped to a colour. Confirmed by reading every level renderer: none of
them calls `summarizeStatuses()`, computes a ratio, or prints a `%`.

The pooling rule is `poolCoverageStatus()` — **weakest link** — reproduced in
full in Document 2 §6 and traced in Document 6.

**This is the central architectural gap for the planned coverage feature.**
"62% of Quran words understood" is a *quantity*; Explore's entire vocabulary is
*ordinal statuses*. There is no existing surface in Explore that displays a
number, so a percentage is a new presentation concept here, not a variation of
one.

---

## 12. Does the wheel assume a fixed number of segments?

**No.** `const n = items.length || 1; const anglePer = 360 / n;` — it divides the
circle by whatever it is handed. In practice it is already called with **30**
(Juz), **114** (Surahs), **604-ish** subsets (Juz pages), **1–286** (ayahs),
**7–40** (ruku's) and **99+** (Asma ul Husna) — a range spanning two orders of
magnitude in the shipped app.

Two practical (not structural) limits, both recorded in the code:

- Labels use `wrapWheelLabel()` and a canvas-measured centre fit, so long names
  degrade by shrinking rather than overflowing.
- `SURAH_WHEEL_THRESHOLD = 30` exists precisely because the project judged
  per-ayah segments unreadable beyond 30 for a surah wheel.

---

## 13. Does the wheel assume a fixed number of Approaches?

**No — and Explore's wheel is not per-Approach at all.** In Explore the wheel's
axis is **units**, and the Approach is a *selector* beside it:
`renderExploreApproachList()` (`:6705`) renders one selectable row per element of
`quranTrackables`, and the chosen one is passed into every level renderer as
`trackable`. So the number of Approaches determines the length of a **list**,
not the number of **segments**.

(The *landing* Mastery Wheel is the opposite: one segment per Approach for one
unit. That is Document 6.)

Nothing anywhere asserts 30. The only "30" is the caption
`"Approach the Quran in 30 ways"` (`quranrevival.html:2625`) and its Bangla
counterpart in `app/js/i18n/bn.js:543` — copy, not logic.

---

## 14. Does Explore currently support categories or toggles?

**Yes — three distinct switching mechanisms already exist, and they are the
closest existing precedent for anything new.**

**(a) Mode palette — `setExplorePalette(mode)`, `quranrevival.html:7098`.**
Explore already switches between **entirely different content domains** in the
same panel: `quran`, QCR (Ayah Collections), and Asma ul Husna. Each has its own
wheel, its own data source and its own trackable. **This is the existing proof
that Explore can host a new top-level category.**

**(b) View toggles within a level** — `syncExploreViewToggle()` (`:6751`) plus
`exploreViewPrimaryBtn` / `exploreViewSurahsBtn`. Quran level toggles Juz↔Surah;
Juz level toggles Pages↔Surahs. Choices persist per level via `app/js/prefs.js`,
and **the two levels remember separately**.

**(c) Approach selector** — `renderExploreApproachList()` (`:6705`), one row per
trackable, driving which claims are read.

All popovers go through `app/js/bar-palette.js`, one delegated listener, so
outside-click / Escape / "only one open at a time" come free (I2).

---

## 15. Could a new category such as "Understanding Quranic Arabic" be added?

**Yes.** Mechanism (a) above is exactly that, and it is already used three times.
A fourth palette mode would need:

| Work | Where | Risk |
|---|---|---|
| A palette button + mode | `setExplorePalette()`, `quranrevival.html:7098` | Low |
| A level router branch | `renderExplore()`, `:6777` | Low |
| A renderer producing `items[]` | new function in the same file | Medium |
| A data load | new `ensure…Loaded()` alongside the existing ones | Medium |
| Breadcrumb entries | `renderExploreBreadcrumb()`, `:6652` | Low |
| Bangla strings | `app/js/i18n/bn.js` | Low (I11 — mandatory) |

**All of it lands in `app/quranrevival.html`** — a 12,027-line file with no build
step and no automated test coverage for this panel. `mastery-wheel.js` itself
needs no change: hand it `items[]` and it draws them.

**The unanswered question is not "can a category be added" but "what are the
segments?"** Every existing Explore wheel has segments that are *places in the
Quran*. A word/root/lemma wheel's segments would be *linguistic items*, which
has no precedent here — and at 1,642 roots or 4,832 lemmas, a single wheel is
not a viable presentation. That is a design question for the reviewer.

---

## 16. Could multiple independent tracks under one Approach be displayed separately?

**Not today — Explore has no concept of a track, and the specific blocking line
is this** (`renderExploreApproachList()`, `quranrevival.html:6705`): it renders a
flat list, one row per element of `quranTrackables`, with a single selected id.
There is no nesting, no expand/collapse, and no notion of a parent row.

For the future example:

```
Understanding Quranic Arabic
  ├── Level 1 — Word-by-Word Meaning
  ├── Level 2 — Roots and Uses
  └── Level 3 — Arabic in Depth
```

what the current code would actually produce, and why:

| Structure chosen | What Explore shows today |
|---|---|
| Three separate trackables (`subjectId: "quran"`) | **three flat, unrelated Approach rows.** Works immediately, no code change — but the grouping is invisible |
| One trackable + three compound entry keys (`…::approach_31_L1`) | **one Approach row.** The three levels are stored and independently confirmable but **Explore cannot select or colour them separately** — `effectiveAyahStatus()` and `buildExploreWiderSpans()` both key on the single selected `trackable.id` |
| One parent + three child trackables | **not expressible** — `trackables` has no parent field (Document 1 §11) |

Two levers already exist that a nested display could be built on, and they are
worth naming because they mean this is not a from-scratch job:

- **`group` / `groupName`** already groups trackables into the 7 sections. It is
  display-only today (it carries no records meaning), but it is an existing
  grouping field that a sectioned Approach list could render from.
- **The view-toggle pattern** (mechanism (b)) already switches one level between
  two readings while remembering the choice per level — the same shape a
  level-selector would need.

**What does not exist and cannot be inferred from the code: a rule for what a
parent Approach's own colour is when its three children disagree.** The brief
explicitly rules out the obvious defaults ("do not assume Level 1 automatically
completes Level 2"), and the app's two existing aggregation rules — weakest-link
pooling and floor-propagation — are both about *units*, not *trackables*.
**That is a curriculum decision, not a technical one, and this review does not
make it.**
