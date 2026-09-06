# Document 6 — Explore Wheel Data Flow

QuranRevival v08.00 · complete end-to-end trace, read out of the live codebase

There are **two different wheels** in this application and they are populated by
two different pipelines with opposite axes. Both are traced here, because
confusing them is the easiest mistake to make.

| | Landing Mastery Wheel | Explore wheel |
|---|---|---|
| Segment axis | **one segment per Approach** | **one segment per Quran unit** |
| Fixed thing | one unit (whatever is selected) | one Approach (whichever is selected) |
| Aggregation | **none** — direct claim only | weakest-link pooling + floor propagation |
| Firestore reads | 1 chunk (+1 on first Juz/Hizb/Page use) | up to 115 chunks per open |
| Renderer | `renderScopedWheel()` | `renderScopedWheel()` — the same function |

---

# PIPELINE A — The Explore wheel

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. DATA SOURCE — static JSON, served as files, never Firestore           │
└──────────────────────────────────────────────────────────────────────────┘
   tools/quran-data-pull/output/
     juz-index.json      30 rows   {juz, startSurah, startAyah, startPage,
                                    endSurah, endAyah, endPage}
     page-index.json    604 rows   {page, startSurah, startAyah, endSurah, endAyah}
     hizb-index.json     60 rows   {hizb, …, juz}       (loaded ONLY if a hizb: claim exists)
     surah-index.json   114 rows   {surahNumber, nameArabic, nameEnglish,
                                    nameTranslation, revelationType, ayahCount}
     surahs/surah_NNN.json         full text — loaded ONLY for surahs carrying a ruku: claim
                             │
                             ▼
   app/js/quran-data.js — getJuzIndex() / getPageIndex() / getHizbIndex() /
                          getSurahIndex() / getSurah()
   Module-level promise caches; BASE_URL = "/tools/quran-data-pull/output"
   Architecture s5: "served as static files … never as Firestore reads"

┌──────────────────────────────────────────────────────────────────────────┐
│ 2. FIRESTORE / DATA LAYER                                                │
└──────────────────────────────────────────────────────────────────────────┘
   app/js/records.js:66   getRecordsChunk(db, tenantId, personId, chunkKey)
       → getDoc(records/{tenantId}__{personId}__{chunkKey})
       → { id, tenantId, personId, entries{ "<unitKey>::<trackableId>": {...} } }

   This is the ONLY Firestore read Explore performs. There is no progress
   service, no aggregate collection, and no Cloud Function.

┌──────────────────────────────────────────────────────────────────────────┐
│ 3. LOAD / "PROGRESS SERVICE" LAYER                                       │
│    app/quranrevival.html:6623  ensureExploreChunksLoaded()               │
└──────────────────────────────────────────────────────────────────────────┘
   a. getJuzIndex(), getPageIndex()
   b. expand all 30 juz through ayahCoverage() → the set of surahs touched
   c. Promise.all → getRecordsChunk("surah_N") for each        ≤114 reads
        (reuses currentChunk for the open surah — no double read)
   d. exploreSubjectChunk = ensureQuranSubjectChunk({force:true})  +1 read
        (shared cache, so the landing wheel and Explore can never disagree)
   e. buildExploreWiderSpans()

   OUTPUT — three in-memory structures, no persistence:
     exploreChunksBySurah : Map<surahNumber, recordsChunk>
     exploreSubjectChunk  : recordsChunk            (juz/hizb/page claims)
     exploreWiderSpans    : Map<trackableId, Span[]>

┌──────────────────────────────────────────────────────────────────────────┐
│ 4. AGGREGATION LOGIC                                                     │
└──────────────────────────────────────────────────────────────────────────┘

   4a. buildExploreWiderSpans()   quranrevival.html:6537
       Flattens every NON-ayah claim into the ayah ranges it covers.

       for each entry in every loaded chunk:
           const [unitKey, trackableId] = key.split("::");
           skip if unitKey starts with "ayah:"        ← ayahs are the base layer
           skip if status is falsy / "not_started" / off-ramp
           spansForKey(unitKey) → Span[]
             surah:{n}          → [{surah:n, from:1, to:ayahCount}]
             range:{n}:{a}-{b}  → [{surah:n, from:a, to:b}]
             juz:{j}            → ayahCoverage(juzIndex row)
             page:{ed}:{p}      → ayahCoverage(pageIndex row)   ← parts[2], not parts[1]
             ruku:{n}:{i}       → the ruku's own range, from that surah's TEXT
             hizb:{h}           → ayahCoverage(hizbIndex row)
           push { ...span, statusId } under trackableId

       Type:  Map<trackableId, { surah:number, from:number, to:number,
                                 statusId:string }[]>

       Lazy by design: the hizb table is fetched only if a hizb: claim exists;
       full surah text is loaded only for surahs carrying a ruku: claim. Which
       surahs load is decided by the CLAIMS, not by where the reader browsed —
       which is what makes a Juz's colour identical however you arrived at it.

   4b. effectiveAyahStatus(surah, ayah, trackableId)   quranrevival.html:6506
       ── MAX / floor propagation ──
       own = entries["ayah:{s}:{a}::{trackableId}"].claimedStatus ?? "not_started"
       if own === "not_applicable" → return it            (I7 wins outright)
       bestIdx = RAMP_ORDER.indexOf(own)
       for every span in exploreWiderSpans[trackableId] covering (surah, ayah):
           bestIdx = max(bestIdx, RAMP_ORDER.indexOf(span.statusId))
       return RAMP_ORDER[bestIdx]

       Rule: a claim on a wider unit is a FLOOR under every ayah it covers.
       "Surah 1, Mastered" makes all 7 ayahs read at least Mastered; an ayah
       claimed higher on its own keeps its own higher status.

   4c. poolCoverageStatus(coverage, trackableId)   quranrevival.html:6467
       ── MIN / weakest link ──
       worstIdx = min over every ayah in coverage of
                    RAMP_ORDER.indexOf(effectiveAyahStatus(...))
       skipping "not_applicable" entirely                 (I7)
       returns null if nothing is countable at all

       RAMP_ORDER = ["not_started","learning","practising","achieved","mastered"]

       NOTE: this reads claimedStatus, never confirmedStatus. Teacher approval
       does not gate any colour — see Document 4.

┌──────────────────────────────────────────────────────────────────────────┐
│ 5. EXPLORE COMPONENT — one renderer per level                            │
└──────────────────────────────────────────────────────────────────────────┘
   renderExplore()                     :6777  router on exploreLevel
     renderExploreQuranLevel()         :6789  30 juz  OR → QuranSurahsView (114)
     renderExploreJuzLevel()           :6871  pages   OR → JuzSurahsView
     renderExploreSurahLevel()         :6982  ayahs (≤30) OR ruku's
     renderExploreRukuLevel()          :7039  ayahs in the ruku'
   Each maps its units → poolCoverageStatus() → an item object.

┌──────────────────────────────────────────────────────────────────────────┐
│ 6. WHEEL DATA MODEL — the interface between logic and pixels             │
└──────────────────────────────────────────────────────────────────────────┘
   items: Array<{
     key:      string          // segment identity → data-key → click payload
     statusId: string          // one of the six ids → STATUS_COLORS lookup
     title:    string          // <title> tooltip, built by segTitle()
     number:   string|number   // printed outside the ring; defaults to key
     sliceLines?:       string[]   // opt-in, pre-wrapped, pre-escaped
     sliceArabicLines?: number     // opt-in, how many leading lines are Arabic
   }>

   segTitle(label, statusId, labelsById)   quranrevival.html:6647
     → `${label} — ${labelsById[statusId] ?? statusId}`
     Routes through statusLabelsById() so a tooltip never prints a raw stored
     id like "not_started".

┌──────────────────────────────────────────────────────────────────────────┐
│ 7. VISUAL WHEEL SEGMENT                                                  │
│    app/js/mastery-wheel.js:300  renderScopedWheel(items, opts)           │
└──────────────────────────────────────────────────────────────────────────┘
   const n = items.length || 1;             ← NO fixed segment count
   const anglePer = 360 / n;
   per item:
     start = i * anglePer
     end   = start + anglePer - min(1.2, anglePer * 0.08)     ← inter-segment gap
     fill  = STATUS_COLORS[entry.statusId] ?? STATUS_COLORS.not_started
     <path class="wheel-seg" data-key="{key}" d="{segmentPath(...)}" fill="{fill}">
       <title>{title}</title>
     </path>
   rInner = rOuter * 0.5   (thin ring); centre disc via centerLabelMarkup()

   I2: pure renderer. Takes an array, returns an SVG string. It never imports
   records.js and never reads Firestore.

┌──────────────────────────────────────────────────────────────────────────┐
│ 8. CLICK — back out of the pixels                                        │
└──────────────────────────────────────────────────────────────────────────┘
   attachScopedWheelClickHandler(containerEl, cb)   mastery-wheel.js:346
     cb(seg.dataset.key)      ← the RAW STRING key; the renderer assumes nothing
   Each level's caller decides what the key means: drill deeper, or leave
   Explore via goToAyahFromExplore() (:6679).
```

---

# PIPELINE B — The landing Mastery Wheel

Shorter, and structurally different because it does **not** aggregate.

```
 currentUnitInfo()                    quranrevival.html:4793
   → { unitType, unitKey, chunkKey, label }
   chunkKey mirrors records.js chunkKeyFor() exactly:
     ayah/range/surah/ruku → "surah_{n}"      juz/hizb/page → "subject_quran"
                             │
                             ▼
 chunkForUnitInfo(info)               :5635    picks the in-memory chunk
 ensureUnitChunkThen(info, redraw)    :5645    first-use fetch of subject_quran,
                                               then one redraw; cannot loop
                             │
                             ▼
 approachStatusesForCurrentUnit()     :5665
   return quranTrackables.map((trackable) => ({
     trackable,
     statusId: entries[`${info.unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started",
   }));
                             │
                             ▼
 renderWheel()                        :5681
   items = one per Approach → renderScopedWheel(items, { centerArabic, centerRef })
   plus renderWheelSidebar(items, labels) and renderWheelLegend(labels)
```

**No pooling, deliberately.** The code states why: a wheel slice opens a Track
card that claims *this exact unit*, so a green slice over "Not claimed yet"
would be the screen contradicting itself. Consequence: a Juz whose every ayah is
mastered still reads `not_started` here until the Juz itself is claimed. Explore
is where pooling lives.

**Firestore cost:** the landing wheel reads **one** chunk. `subject_quran` is
fetched only on first use of a Juz/Hizb/Page unit and cached per person — the
load-speed contract is untouched (I9), and the project re-measured it: Quran
Study remains **6 sequential round trips / 9 Firestore calls**.

---

# Where future Arabic understanding percentages would connect

Six candidate insertion points, each with what it costs and what it breaks.
**These are observations about the code, not recommendations.**

### (1) `spansForKey()` — inside `buildExploreWiderSpans()`, `:6570`

**The natural seam for any new Quran unit type.** It is a plain switch on the
unit key's first segment returning `Span[]`. A new poolable unit needs one
branch here plus a boundary table, and it then rolls up through every Explore
level automatically.

*Cost:* one branch. *Limit:* it must produce **ayah ranges**. A word/root/lemma
item does not map to a contiguous ayah range — a root's occurrences are
scattered across the whole Quran. So this seam works for units, and **does not
work for linguistic items**, which is the crux.

### (2) `poolCoverageStatus()` — `:6467`

Where a **status** becomes a **colour**. A percentage-based variant would live
beside it, not inside it: this function returns a status id, and every caller
expects one.

*Cost:* a parallel function plus a new item field. *Breaks nothing* if additive.

### (3) `effectiveAyahStatus()` — `:6506`

Where per-ayah truth is computed. **If "understanding" is to be derived from
word knowledge, this is the place it would enter**: an ayah whose words are all
known could contribute a derived status. That is a genuinely new concept —
today this function reads only stored claims for one trackable.

*Cost:* high. It is called once per ayah per render — up to 6,236 times for the
whole-Quran wheel — so anything expensive here is felt immediately.

### (4) The `items[]` contract — §6 above

Adding a field (e.g. `percent`) is **backward-compatible**: `renderScopedWheel()`
reads only the fields it knows, and `sliceLines` / `sliceArabicLines` are
existing precedent for exactly this kind of opt-in extension.

*Cost:* low. This is the cheapest place to surface a number.

### (5) `ensureExploreChunksLoaded()` — `:6623`

Where the read budget is set. Any new per-word or per-level progress data must
either ride in the **existing** `records` chunks (free — they are already read)
or add a new read here (not free, and it lands on Explore's open path).

**Riding in the existing chunks is strongly preferable** and is already possible
with no schema or rules change (Document 3 §14.1) — subject to the document-size
arithmetic in Document 3 §13.

### (6) `renderExploreApproachList()` — `:6705`

Where an Approach is selected. Any level/track selector would live here or
beside it. Today it is a flat list with one selected id (Document 5 §16).

---

## The one structural mismatch, stated plainly

Every transformation in Pipeline A is **ordinal**: a status id moves up or down
a five-point ramp, and the arithmetic is `min` and `max`. Nothing anywhere sums,
divides, or counts toward a total.

A coverage metric of the form

```
        words understood
        ────────────────  × 100
         77,429 total
```

is **cardinal**: it sums and divides. It does not compose with `RAMP_ORDER`,
`poolCoverageStatus()` or `STATUS_COLORS` — there is no lossless way to turn a
percentage into one of six colours, or a weakest-link pool into a count.

So the connection point is not a modification of this pipeline but **a parallel
one**, most cheaply joined at seam (4), where a number can ride alongside a
status into the same wheel item without disturbing anything that already works.
How that number is defined — what counts as "understood" for each of Levels 1,
2 and 3, and whether teacher confirmation gates it — is the reviewer's design
work, and this document deliberately does not propose it.
