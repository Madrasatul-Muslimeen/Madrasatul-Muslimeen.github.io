# 06 — Study Units

QuranRevival v08.02 · from `app/js/unit-keys.js`, `app/js/records.js`,
`app/js/quran-data.js` and `app/quranrevival.html`

---

## 0. The core idea

**A Study Unit is a single namespaced permanent string.** There is no units
table, no units collection, and no unit documents. *The string is the unit.*
Boundaries are not stored with units either — they are derived from per-ayah
metadata in the static Quran JSON, precomputed into small index files at
data-pull time.

This follows invariant **I5**: units are keyed by permanent ID, never by name.
Renaming anything never orphans a record, because the key never contains a name.

```js
// app/js/unit-keys.js:14 — twelve declared types
export const UNIT_TYPES = Object.freeze([
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub", "manzil",
  "hadith", "topic", "name",
]);
```

| Type | Offered for the Quran? | Notes |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku`, `juz`, `hizb`, `page` | **Yes — all seven** | |
| `rub`, `manzil` | **No** | key constructors exist; **no picker option, no boundary index** — declared and unreachable |
| `hadith`, `topic`, `name` | n/a | other modules |
| *whole Quran* | **Does not exist** | no `quran:` or `book:` constructor. `UNIT_TYPE_LABELS` carries a display label `book: "Qur'an"` (`unit-keys.js:75`) but nothing constructs such a key |

---

## 1. Each unit in detail

### 1.1 Ayah

| | |
|---|---|
| **Represents** | one verse |
| **Identifier** | `ayah:{surah}:{ayah}` — e.g. `ayah:2:255` |
| **Data source** | `surahs/surah_NNN.json` → `ayahs[].ayah` |
| **Boundary** | itself — atomic, the floor of the whole system |
| **Navigation** | Ayah picker in Study options; ▲▼ ayah-nav; a wheel click in Explore's ruku' level |
| **Records chunk** | `surah_{n}` |
| **Words** | `ayahs[].words[]`, 1-based `position`, unique within the ayah only |

### 1.2 Range of Ayat

| | |
|---|---|
| **Represents** | a contiguous run within **one** surah |
| **Identifier** | `range:{surah}:{from}-{to}` — e.g. `range:2:1-5` |
| **Data source** | user selection (From/To pickers) |
| **Boundary** | explicit, normalised at construction: `[Math.min(rangeFrom, rangeTo), Math.max(rangeFrom, rangeTo)]` (`quranrevival.html:4768`) |
| **Constraint** | **cannot cross a surah boundary** |
| **Records chunk** | `surah_{n}` |

### 1.3 Ruku'

| | |
|---|---|
| **Represents** | a thematic section within a surah |
| **Identifier** | `ruku:{surah}:{rukuIndexWithinSurah}` — e.g. `ruku:2:1` |
| **Data source** | the per-ayah `ruku` field |
| **Boundary** | derived at read time by grouping ayahs sharing a `ruku` value |
| **Records chunk** | `surah_{n}` |

**The one real identity trap in the unit system, and it is documented in the
code.** The pulled data's `ruku` field is a **global sequential index across the
whole Quran** (Surah 1 = ruku 1, Surah 2 starts at ruku 2, …), but the unit key
stores a **per-surah-relative** index:

```js
// app/js/unit-keys.js:53
export function rukuIndexInSurah(surahAyahs, globalRuku) {
  const firstRuku = surahAyahs[0]?.ruku;
  return firstRuku == null ? globalRuku : globalRuku - firstRuku + 1;
}
```

**So `ruku:2:1` means "the first ruku' of Surah 2", not "global ruku' 1".** Any
future code that reads an ayah's `ruku` field and builds a key from it directly
will silently write a wrong key.

**Ruku' is also the only unit with no index file.** A ruku's range lives in its
surah's *text* (2 MB for Surah 2), so Explore loads full surah text **only for
surahs that actually carry a `ruku:` claim** — usually a handful, never all 114.

### 1.4 Juz

| | |
|---|---|
| **Represents** | one of the Quran's 30 parts |
| **Identifier** | `juz:{n}`, 1–30 |
| **Data source** | `juz-index.json` — **30 rows**, `{juz, startSurah, startAyah, startPage, endSurah, endAyah, endPage}` |
| **How built** | `build-juz-index.js`, computed from the real per-ayah `juz` field across all 114 files — never hand-typed |
| **Crosses surahs** | yes, routinely |
| **Records chunk** | **`subject_quran`** — a *different document* from the surah chunks |

### 1.5 Hizb

| | |
|---|---|
| **Identifier** | `hizb:{n}`, 1–60 |
| **Data source** | `hizb-index.json` — **60 rows** |
| **How built** | from the per-ayah `hizbQuarter` field — **a hizb is four quarters** (the data carries quarters 1–240, not hizbs) |
| **Records chunk** | `subject_quran` |
| **Loading** | fetched **only** when a `hizb:` claim actually exists |

```js
// app/quranrevival.html:4782 — the quarter→hizb arithmetic, inline
const hizbNow = Math.ceil(current.hizbQuarter / 4);
```

### 1.6 Page

| | |
|---|---|
| **Identifier** | `page:{edition}:{n}` — e.g. `page:qpc-hafs:604`. **Three segments, not two** |
| **Data source** | `page-index.json` — **604 rows** (64 KB) |
| **Records chunk** | `subject_quran` |

**The `edition` segment is why page keys are mushaf-scoped** — page 604 in one
print edition is not page 604 in another. It is the only unit key with a
non-numeric discriminator, so parsers must take `parts[2]`, not `parts[1]`:

```js
if (parts[0] === "page") {
  // page:<edition>:<n>
  const pg = pageIndexData?.find((x) => x.page === Number(parts[2]));
```

The page index **deliberately carries no "which Juz" tag** — a page can straddle
a Juz boundary, verified against real data by its build script.

### 1.7 Whole Surah

| | |
|---|---|
| **Identifier** | `surah:{n}`, 1–114 |
| **Data source** | `surah-index.json` — **114 rows**, incl. `ayahCount` |
| **Boundary** | ayah 1 to `ayahCount` |
| **Records chunk** | `surah_{n}` |

### 1.8 Whole Quran — **not a unit**

No constructor, no key, no claim. It exists **only** as Explore's top navigation
level, where its colour is computed by pooling over the 30 Juz (or 114 Surahs).

**This is a real structural gap worth naming:** there is no place to attach an
"overall Quran progress" figure, because there is no unit for the Quran itself.

---

## 2. `currentUnitInfo()` — the single source of truth

`app/quranrevival.html:4806` returns `{ unitType, unitKey, chunkKey, label }`
for whatever is currently selected, and **mirrors `chunkKeyFor()` exactly** so
the screen can never disagree with the document a claim will land in. Every
consumer — the wheel, the Note view, "Track this unit", the dock's Tracking
line — reads the unit through this one function.

---

## 3. Parent/child relationships — computed, never stored

**No unit key contains its parent. No index maps child→parent.** Containment is
computed on demand by exactly two mechanisms.

**(a) Per-ayah metadata — the downward direction.** Every ayah carries its own
memberships:

```json
{ "ayah": 1, "juz": 1, "page": 1, "ruku": 1, "manzil": 1, "hizbQuarter": 1, "sajda": false }
```

Used by `currentUnitAyahBounds()` (`:4765`) to find a unit's extent **within the
currently loaded surah**. Note the limitation: it filters `currentSurahData.ayahs`
— one surah — so it gives a juz's bounds *inside the open surah*, not the juz's
true global extent.

**(b) `ayahCoverage()` — the global direction, and the single containment
primitive in the whole application** (`quranrevival.html:6475`):

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

Everything that needs "which ayahs does this unit cover" goes through it. It is
generic over any `{startSurah, startAyah, endSurah, endAyah}` shape, so **a new
unit type only needs a boundary table to become poolable.**

```
                 Whole Quran   ← a computed VIEW, not a unit
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

---

## 4. How ayat belong to a unit

| Unit | Membership test | Cost |
|---|---|---|
| Ayah | identity | free |
| Range | `from ≤ a ≤ to`, same surah | free |
| Surah | `1 ≤ a ≤ ayahCount` from `surah-index.json` | one small index |
| Ruku' | group by the ayah's `ruku`, then `rukuIndexInSurah()` | **needs the surah's full text** |
| Juz | `ayahCoverage()` over `juz-index.json` | one 8 KB index |
| Hizb | `ayahCoverage()` over `hizb-index.json` | one 8 KB index |
| Page | `ayahCoverage()` over `page-index.json` | one 64 KB index |

## 5. How words belong to a unit

**There is no word→unit relationship in the tracking system, because a word is
not a trackable unit.** The relationship exists only in the content data:

```
surah_NNN.json → ayahs[] → words[] → { position, arabic, transliteration,
                                        translation{en,bn},
                                        morphology{root, lemma, pos, rootCount} }
```

The only path from a unit to its words is: **unit → ayah range → load each
surah's JSON → walk `ayahs[].words[]`**. A word's full address is therefore
`(surah, ayah, position)` — **and that triple is never materialised as a string
anywhere in the codebase.** There is no word ID.

| Unit | Word occurrences |
|---|---|
| Whole Quran | **77,429** |
| One ayah | 1 to **128** (Surah 2:282 is the longest) |
| Surah al-Fatihah (7 ayahs) | 29 |

---

## 6. Chunking — which document a claim lands in

```js
// app/js/records.js:51
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

| Unit types | Chunk | Documents per person |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | up to 114 |
| `juz`, `hizb`, `page` (and `rub`, `manzil`) | **`subject_quran`** | **one** |

Full document id: `records/{tenantId}__{personId}__{chunkKey}`.

**This split is the reason the landing wheel has a lazy second fetch.** Picking a
Juz/Hizb/Page unit needs a *different document*, so `ensureQuranSubjectChunk()`
(`:5628`) fetches it **on first use** and caches it per person — someone who
never picks those three never downloads it (invariant I9, the load-speed
contract).

---

## 7. Does progress roll upward or downward? — **Both, and it depends which screen**

**This is the most important behavioural fact about units, and the two screens
deliberately disagree.**

### On the landing Mastery Wheel: **neither**

```js
// app/quranrevival.html:5685
function approachStatusesForCurrentUnit() {
  const info = currentUnitInfo();
  const entries = chunkForUnitInfo(info)?.entries ?? {};
  return quranTrackables.map((trackable) => ({
    trackable,
    statusId: entries[`${info.unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started",
  }));
}
```

**The exact unit key's own direct claim, and nothing else.** The code states the
reason: the card a slice opens claims *this* unit, so a green slice over "Not
claimed yet" would be the screen contradicting itself.

> **Consequence: a Juz whose every ayah is Mastered still reads `not_started` on
> the landing wheel until the Juz itself is claimed.**

### In Explore: **both directions**

**Downward — a wide claim is a FLOOR** (`effectiveAyahStatus()`, `:6530`):

```js
const own = entries[`${buildUnitKey.ayah(surah, ayah)}::${trackableId}`]?.claimedStatus ?? "not_started";
if (own === "not_applicable") return own;          // I7 wins outright
let bestIdx = RAMP_ORDER.indexOf(own);
// then MAX against every wider-unit span covering this ayah
```

Claiming "Surah 1, Mastered" makes all seven ayahs read **at least** Mastered; an
ayah claimed higher keeps its own higher status.

**Upward — a wide unit takes its WEAKEST ayah** (`poolCoverageStatus()`, `:6491`):

```js
// MIN over every ayah in coverage, skipping not_applicable entirely (I7)
if (worstIdx === null || idx < worstIdx) worstIdx = idx;
```

One unclaimed ayah anywhere in a Juz makes the whole Juz read `not_started`.

### The rule in one line

```
   MAX downward   (a wide claim floors its ayahs)
   MIN upward     (a wide unit takes its weakest ayah)
   not_applicable excluded from both     (I7)
   the landing wheel does NEITHER — direct claim only
```

### Which claims roll up

`buildExploreWiderSpans()` (`:6561`) flattens every **non-`ayah`** claim into the
ayah ranges it covers:

| Claim | Resolved by |
|---|---|
| `surah:{n}` | `ayahCount` from `surah-index.json` |
| `range:{n}:{a}-{b}` | the range itself |
| `juz:{j}` | `ayahCoverage()` over the juz index |
| `page:{ed}:{p}` | `ayahCoverage()` over the page index — **`parts[2]`** |
| `ruku:{n}:{i}` | the ruku's range, from that surah's **text** |
| `hizb:{h}` | `ayahCoverage()` over the hizb index |

**Lazy by design and deterministic**: the hizb table is fetched only if a `hizb:`
claim exists, and full surah text is loaded only for surahs carrying a `ruku:`
claim. Which surahs load is decided by the **claims**, not by where the reader
has browsed — which is what makes a Juz's colour identical however you arrive at
it.

**A historical note that explains the current design.** Until 5 Sep 2026 this
wheel read only `ayah:` keys. Each level *did* carry a direct-claim fallback,
but it was written `pooled ?? direct`, and `pooled` is null only when every ayah
in range is Not Applicable — so in any real tenant the fallback was dead code
and a Whole Surah / Range / Ruku' / Juz / Hizb / Page claim was **invisible
everywhere in Explore.** The floor rule replaced it.

---

## 8. Relationship with Approaches

**None at definition time.** An Approach declares no units and a unit belongs to
no Approach. They are two independent coordinates multiplied at claim time:

```js
const entryKey = `${unitKey}::${trackableId}`;   // records.js:164
```

Every one of the 30 Approaches supports all seven Quran units, with no
restriction anywhere.

## 9. Relationship with Explore

Explore's **wheel segments are units**; the Approach is a *selector* beside it.
Four drill levels — `quran` → `juz` → `surah` → `ruku'` — with two readings at
the top two levels (Juz/Surah, and Pages/Surahs). There is no ayah level;
clicking a ruku' segment leaves Explore for the reading screen.

`SURAH_WHEEL_THRESHOLD = 30` (`:4378`) decides whether a surah draws one segment
per **ayah** (≤30) or per **ruku'**. **This 30 is an ayah count and has nothing
to do with the 30 Approaches** — a trap worth flagging.

---

## 10. Adding a new Quran unit type — the five places

Named because the code makes them explicit, **not** as a proposal:

1. `buildUnitKey` + `UNIT_TYPES` — `app/js/unit-keys.js:14`/`:20`
2. A branch in `currentUnitInfo()` — `app/quranrevival.html:4806`
3. A boundary index (built like `build-juz-index.js`) + a loader in `quran-data.js`
4. A branch in `spansForKey()` inside `buildExploreWiderSpans()` — if it should roll up
5. A decision on `SURAH_CHUNKED_TYPES` — `app/js/records.js:51`

**No Firestore schema change and no security-rules change is needed** — the rules
never inspect `entries`.
