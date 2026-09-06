# Document 2 — Study Units Architecture

QuranRevival v08.00 · read-only analysis of the live codebase

---

## 0. The one-paragraph summary

A **Study Unit** is a slice of the Quran a claim can be attached to. There are
**twelve unit types** declared in the system; **seven** of them are Quran units.
Every unit is represented as a single **namespaced permanent string** — a
*unit key* — and that string is the entire identity of the unit. There is no
units table, no units collection, and no unit documents. Unit **boundaries** are
not stored with units either: they are derived from per-ayah metadata carried in
the static Quran JSON files, precomputed into small index files at data-pull
time.

---

## 1. The declared unit types

`app/js/unit-keys.js:14`, verbatim:

```js
export const UNIT_TYPES = Object.freeze([
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub", "manzil",
  "hadith", "topic", "name",
]);
```

`app/js/unit-keys.js:20`, the key constructors, verbatim:

```js
export const buildUnitKey = Object.freeze({
  ayah:   (surah, ayah)        => `ayah:${surah}:${ayah}`,
  range:  (surah, from, to)    => `range:${surah}:${from}-${to}`,
  surah:  (surah)              => `surah:${surah}`,
  page:   (edition, pageNum)   => `page:${edition}:${pageNum}`,
  ruku:   (surah, ruku)        => `ruku:${surah}:${ruku}`,
  juz:    (juz)                => `juz:${juz}`,
  hizb:   (hizb)               => `hizb:${hizb}`,
  rub:    (rub)                => `rub:${rub}`,
  manzil: (manzil)             => `manzil:${manzil}`,
  hadith: (collectionName, number) => `hadith:${collectionName}:${number}`,
  topic:  (topicId)            => `topic:${topicId}`,
  name:   (number)             => `name:${number}`, // Asma ul Husna
});
```

**Which of these are actually offered to a user on the Quran screen: seven.**
`ayah`, `range`, `surah`, `ruku`, `juz`, `hizb`, `page`. `rub` and `manzil` have
key constructors but **no picker option and no boundary index** — they are
declared and unreachable. `hadith`, `topic`, `name` belong to other modules.

**There is no `book:` / whole-Quran unit key.** Whole Quran is a computed *view*
in Explore, never a stored claim. (`UNIT_TYPE_LABELS` carries a display label
`book: "Qur'an"` at `unit-keys.js:75`, but nothing constructs such a key.)

---

## 2. Each unit, in detail

### 2.1 Ayah

| | |
|---|---|
| **Identifier** | `ayah:{surah}:{ayah}` — e.g. `ayah:2:255` |
| **Data source** | `tools/quran-data-pull/output/surahs/surah_NNN.json` → `ayahs[].ayah` |
| **Boundary** | The ayah itself. Atomic — this is the floor of the whole system. |
| **Parent** | Surah (by the surah number in the key), and — via the ayah's own metadata fields — ruku, juz, hizb, page, manzil |
| **Ayat in it** | One |
| **Words in it** | `ayahs[].words[]`, an ordered array; each word has a 1-based `position` unique within the ayah (verified: 0 duplicate positions across all 77,429 words) |
| **Records chunk** | `surah_{n}` |

### 2.2 Range of Ayat

| | |
|---|---|
| **Identifier** | `range:{surah}:{from}-{to}` — e.g. `range:2:1-5` |
| **Data source** | User selection. From/To pickers on the study screen |
| **Boundary** | Explicit, and normalised min/max at construction. `quranrevival.html:4755`: `return [Math.min(rangeFrom, rangeTo), Math.max(rangeFrom, rangeTo)]` |
| **Constraint** | **Cannot cross a surah boundary** — one surah number, one from, one to |
| **Parent** | Surah |
| **Words** | Union of the words of every ayah in `[from, to]` |
| **Records chunk** | `surah_{n}` |

### 2.3 Ruku'

| | |
|---|---|
| **Identifier** | `ruku:{surah}:{rukuIndexWithinSurah}` — e.g. `ruku:2:1` |
| **Data source** | Per-ayah `ruku` field in the surah JSON |
| **Boundary** | Derived at read time by grouping ayahs that share a `ruku` value |

**This is the one unit with a real identity trap, and it is documented in the
code.** The pulled data's `ruku` field is a **global sequential index across the
whole Quran** (Surah 1 = ruku 1, Surah 2 starts at ruku 2, …), but the unit key
stores a **per-surah-relative** index. The conversion, `unit-keys.js:53`, verbatim:

```js
export function rukuIndexInSurah(surahAyahs, globalRuku) {
  const firstRuku = surahAyahs[0]?.ruku;
  return firstRuku == null ? globalRuku : globalRuku - firstRuku + 1;
}
```

So **`ruku:2:1` means "the first ruku' of Surah 2", not "global ruku' 1"**.
Any future code that reads a `ruku` field off an ayah and builds a key from it
directly, without this conversion, will silently write a wrong key. Records
chunk: `surah_{n}`.

### 2.4 Juz

| | |
|---|---|
| **Identifier** | `juz:{n}`, n = 1..30 — e.g. `juz:30` |
| **Data source** | `tools/quran-data-pull/output/juz-index.json`, **30 rows** |
| **Boundary** | `{juz, startSurah, startAyah, startPage, endSurah, endAyah, endPage}` |
| **How built** | Computed from the real per-ayah `juz` field across all 114 surah files by `tools/quran-data-pull/build-juz-index.js` — never hand-typed |
| **Parent** | Whole Quran (conceptually; no stored parent) |
| **Crosses surahs** | Yes, routinely |
| **Records chunk** | **`subject_quran`** — a different document from the surah chunks |

### 2.5 Hizb

| | |
|---|---|
| **Identifier** | `hizb:{n}`, n = 1..60 |
| **Data source** | `tools/quran-data-pull/output/hizb-index.json`, **60 rows** |
| **Boundary** | `{hizb, startSurah, startAyah, endSurah, endAyah, juz}` |
| **How built** | `build-hizb-index.js`, from the per-ayah `hizbQuarter` field. **A hizb is four hizbQuarters** — the ayah data carries quarters (1..240), not hizbs |
| **Records chunk** | `subject_quran` |

The quarter→hizb arithmetic appears inline on the study screen
(`quranrevival.html:4768`), verbatim:

```js
const hizbNow = Math.ceil(current.hizbQuarter / 4);
```

### 2.6 Page

| | |
|---|---|
| **Identifier** | `page:{edition}:{n}` — e.g. `page:qpc-hafs:604`. **Three segments, not two** |
| **Data source** | `tools/quran-data-pull/output/page-index.json`, **604 rows** (64 KB) |
| **Boundary** | `{page, startSurah, startAyah, endSurah, endAyah}` |
| **How built** | `build-page-index.js`, from the per-ayah `page` field |
| **Records chunk** | `subject_quran` |

**The `edition` segment is the reason page keys are mushaf-scoped.** Page 604 in
one print edition is not page 604 in another, so the key carries which edition
it means. This is the only unit type whose key includes a non-numeric
discriminator, and code that parses a page key must therefore take `parts[2]`,
not `parts[1]` — as `buildExploreWiderSpans()` does (`quranrevival.html`, region
E of the extract):

```js
if (parts[0] === "page") {
  // page:<edition>:<n>
  const pg = pageIndexData?.find((x) => x.page === Number(parts[2]));
```

The page index **deliberately carries no "which Juz" tag**, because a page can
straddle a Juz boundary — verified against real data by the build script.

### 2.7 Whole Surah

| | |
|---|---|
| **Identifier** | `surah:{n}`, n = 1..114 |
| **Data source** | `tools/quran-data-pull/output/surah-index.json`, **114 rows** (20 KB) — `{surahNumber, ayahCount, names…}` |
| **Boundary** | Ayah 1 to `ayahCount` |
| **Records chunk** | `surah_{n}` |

### 2.8 Whole Quran — **not a unit**

There is no `quran:` or `book:` key constructor and no whole-Quran claim.
Whole-Quran appears **only** as Explore's top navigation level, where its colour
is computed by pooling over the 30 Juz (or 114 Surahs). See Documents 5 and 6.

**This is a structural gap the reviewer should note explicitly:** an "understood
X% of the Quran" figure has, today, no unit to attach itself to. It would have
to be either a computed view (like Explore's whole-Quran level) or a new unit
type.

---

## 3. Parent/child relationships — how they actually work

**There is no stored hierarchy between units.** No unit key contains its parent.
No index maps child→parent. Containment is computed on demand, and there are
exactly two mechanisms:

**(a) Per-ayah metadata — the downward direction.** Every ayah in the JSON
carries its own memberships:

```json
{ "ayah": 1, "juz": 1, "page": 1, "ruku": 1, "manzil": 1, "hizbQuarter": 1, "sajda": false }
```

So "which juz is this ayah in" is a field read. `currentUnitAyahBounds()`
(`quranrevival.html:4752`) uses exactly this to find a unit's extent *within the
currently loaded surah*:

```js
if (currentUnitType === "juz") {
  const inJuz = ayahs.filter((a) => a.juz === current.juz).map((a) => a.ayah);
  return [Math.min(...inJuz), Math.max(...inJuz)];
}
```

**Note the limitation, which is real and load-bearing:** this filters
`currentSurahData.ayahs` — one surah. So this function gives a juz's bounds
*inside the open surah*, not the juz's true global extent.

**(b) The boundary index files — the upward/global direction.** For the true
global extent of a juz/hizb/page, the app uses the index files and expands them
into per-surah ayah ranges with `ayahCoverage()` (`quranrevival.html:6451`),
verbatim:

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

**`ayahCoverage()` is the single containment primitive in the entire
application.** Everything that needs "which ayahs does this unit cover" goes
through it. It is generic over any `{startSurah, startAyah, endSurah, endAyah}`
shape, so a new unit type only needs a boundary table to become poolable.

The effective containment lattice, as computed rather than as stored:

```
                     Whole Quran  (a view, not a unit)
                    /      |      \
              Juz(30)  Hizb(60)  Page(604)         Surah(114)
                    \      |      /                     |
                     ayahCoverage()                  Ruku' (per-surah)
                            \                       /       |
                             \                     /     Range
                              \                   /       /
                               ------- Ayah (6,236) ------
                                         |
                                    Word (77,429)   <-- NOT a unit type
```

---

## 4. How ayat belong to a unit

Summarised, with the mechanism for each:

| Unit | Membership test | Cost |
|---|---|---|
| Ayah | identity | free |
| Range | `from <= a <= to`, same surah | free |
| Surah | `1 <= a <= ayahCount` from surah-index.json | one small index |
| Ruku' | group by ayah's `ruku` field, then `rukuIndexInSurah()` | **requires loading the surah's full text** |
| Juz | `ayahCoverage()` over juz-index.json | one 8 KB index |
| Hizb | `ayahCoverage()` over hizb-index.json | one 8 KB index |
| Page | `ayahCoverage()` over page-index.json | one 64 KB index |

**Ruku' is the expensive one and the codebase says so.** A ruku's ayah range
lives in its surah's *text file* (2 MB for Surah 2), not in an index — there is
no ruku-index.json. Explore therefore loads full surah text **only for surahs
that actually carry a `ruku:` claim** (`buildExploreWiderSpans()`), which is
usually a handful, never all 114.

---

## 5. How words belong to a unit

**There is no word→unit relationship in the tracking system, because a word is
not a trackable unit.** The relationship exists only in the *content* data:

```
surah_NNN.json
  └── ayahs[]                    ← the ayah
        └── words[]              ← ordered, 1-based `position`
              ├── arabic
              ├── transliteration
              ├── translation { en, bn }
              └── morphology { root, lemma, pos, rootCount }
```

So the only path from a unit to its words today is: **unit → ayah range →
load each surah's JSON → walk `ayahs[].words[]`**. A word's full address is
therefore `(surah, ayah, position)` — but **that triple is never materialised as
a string anywhere in the codebase.** There is no word ID. See Document 7 §6–7.

Counts, computed from the real files:

| Unit | Word occurrences |
|---|---|
| Whole Quran | **77,429** |
| One ayah | 1 to **128** (Surah 2:282 is the longest) |
| Surah al-Fatihah (7 ayahs) | 29 |

---

## 6. How progress aggregates upward

**There are two completely separate aggregation mechanisms in this app, and they
disagree with each other on purpose.** This is the single most important thing
in this document for the reviewer.

### 6.1 The landing Mastery Wheel — NO aggregation

`approachStatusesForCurrentUnit()` (`quranrevival.html:5665`) reads **the exact
unit key's own direct claim, and nothing else**:

```js
function approachStatusesForCurrentUnit() {
  const info = currentUnitInfo();
  const entries = chunkForUnitInfo(info)?.entries ?? {};
  return quranTrackables.map((trackable) => ({
    trackable,
    statusId: entries[`${info.unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started",
  }));
}
```

The code comment states the reason explicitly: the card a wheel slice opens
claims *this* unit, so a green slice sitting over "Not claimed yet" would be the
screen contradicting itself. **Consequence: a Juz whose every ayah is mastered
still reads `not_started` on the landing wheel until the Juz itself is claimed.**

### 6.2 Explore — pooling, in two directions

Explore aggregates, and it does so with a **status ramp**, never a percentage:

```js
const RAMP_ORDER = STATUSES.filter((s) => s.onRamp).map((s) => s.id);
// ["not_started", "learning", "practising", "achieved", "mastered"]
```

**Downward (a wide claim is a FLOOR)** — `effectiveAyahStatus()`
(`quranrevival.html:6506`). A claim on a wider unit raises every ayah it covers
to *at least* that status; an ayah claimed higher keeps its own:

```js
function effectiveAyahStatus(surah, ayah, trackableId) {
  const entries = exploreChunksBySurah.get(surah)?.entries ?? {};
  const own = entries[`${buildUnitKey.ayah(surah, ayah)}::${trackableId}`]?.claimedStatus ?? "not_started";
  if (own === "not_applicable") return own;
  let bestIdx = RAMP_ORDER.indexOf(own);
  const apply = (spans) => {
    for (const span of spans ?? []) {
      if (span.surah !== surah || ayah < span.from || ayah > span.to) continue;
      const idx = RAMP_ORDER.indexOf(span.statusId);
      if (idx > bestIdx) bestIdx = idx;
    }
  };
  apply(exploreWiderSpans.get(trackableId));
  return bestIdx < 0 ? own : RAMP_ORDER[bestIdx];
}
```

**Upward (a wide unit's colour is its WEAKEST ayah)** — `poolCoverageStatus()`
(`quranrevival.html:6467`):

```js
function poolCoverageStatus(coverage, trackableId) {
  let worstIdx = null;
  let anyCounted = false;
  for (const { surah, from, to } of coverage) {
    for (let a = from; a <= to; a++) {
      const statusId = effectiveAyahStatus(surah, a, trackableId);
      if (statusId === "not_applicable") continue;   // I7
      anyCounted = true;
      const idx = RAMP_ORDER.indexOf(statusId);
      if (worstIdx === null || idx < worstIdx) worstIdx = idx;
    }
  }
  return anyCounted ? RAMP_ORDER[worstIdx] : null;
}
```

**So the roll-up rule in one line: MAX downward, MIN upward, `not_applicable`
excluded from both (I7).**

Three properties of this the reviewer should weigh:

1. **It is a status, not a number.** Nothing in Explore computes a percentage.
   The only percentages in the app are in the Way modal's Breakdown tab
   (`way-modal.js:99`, a per-status histogram within one surah) and the Monitor
   report. Neither is used for wheel colour.
2. **It is pessimistic.** One unclaimed ayah anywhere in a Juz makes the whole
   Juz read `not_started`. For a 77,429-word coverage metric this is exactly
   the wrong shape — a "weakest link" pool cannot express "62% understood".
3. **Nothing is stored.** `effectiveAyahStatus` and `poolCoverageStatus` run on
   every render, from chunks already in memory. There is no denormalised
   progress document anywhere in this application. See Document 3 §7.

### 6.3 Which document a claim lands in — `chunkKeyFor()`

`app/js/records.js:50`, verbatim, and this is the boundary that decides how many
Firestore reads any aggregation costs:

```js
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

| Unit types | Chunk | Documents |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | up to 114 per person |
| `juz`, `hizb`, `page` (and `rub`, `manzil`) | `subject_quran` | **one** per person |

Full document id: `records/{tenantId}__{personId}__{chunkKey}`, e.g.
`records/t1__p1__surah_2` or `records/t1__p1__subject_quran`.

**Cost consequence, measured by the app itself:** opening Explore loads *every*
surah chunk the 30 juz touch, plus `subject_quran` — `ensureExploreChunksLoaded()`
issues up to **114 + 1 parallel document reads**, once per Explore open. That is
the existing, accepted cost of the whole-Quran wheel. Any new per-word or
per-level progress data that lands in these same chunks inherits that read
pattern for free; anything that needs a *new* collection does not.

---

## 7. `currentUnitInfo()` — the single source of truth on the study screen

`quranrevival.html:4793`. Every consumer (the wheel, the Note view, "Track this
unit", the dock's Tracking line) reads the unit through this one function, which
returns `{ unitType, unitKey, chunkKey, label }` and mirrors `chunkKeyFor()`
exactly so the screen can never disagree with the document a claim will land in.
Reproduced in full in `code/extracts/EXTRACT__quranrevival.html.txt`, region B.

**For the reviewer: this function is the natural integration point for any new
Quran unit type.** Adding one means (a) a `buildUnitKey` constructor, (b) a
branch here, (c) a boundary index, (d) a `spansForKey()` branch in
`buildExploreWiderSpans()` if it should roll up, and (e) a decision on which
chunk it lands in via `SURAH_CHUNKED_TYPES`. Five places, all named.
