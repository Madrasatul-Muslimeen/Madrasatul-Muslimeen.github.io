# CURRENT_DATA_MODELS.md

**Every structure below is copied from the running application or from the
shipped data files.** Nothing is idealised, normalised, tidied or invented.
Where a structure is implicit (this codebase has no TypeScript and no schema
classes), it is stated as implicit and shown with real values.

> **There is no TypeScript in this project.** No `.d.ts`, no interfaces, no
> Zod/Yup/JSON-Schema validation, no ORM, no `package.json`. Every "model"
> below is either (a) the literal shape of a JSON file on disk, or (b) the
> shape a Firestore document is written with, described in the writing
> module's own header comment.

Six distinct structures exist for Qur'an words and their containers. All six
are documented.

---

## MODEL 1 — the surah file (the primary Qur'an model)

**File:** `tools/quran-data-pull/output/surahs/surah_NNN.json`
**Count:** 114 files, 27 MB total, `schemaVersion: 1`
**Written by:** `tools/quran-data-pull/pull.js` → `fetchSurah()`
**Read by:** `app/js/quran-data.js` → `getSurah()`

### Implicit shape

```jsonc
{
  "surahNumber":       Number,   // 1..114
  "surahNameArabic":   String,   // "سُورَةُ ٱلْفَاتِحَةِ"
  "surahNameEnglish":  String,   // "Al-Faatiha"
  "surahNameTranslation": String,// "The Opening"
  "revelationType":    String,   // "Meccan" | "Medinan"
  "ayahCount":         Number,
  "ayahs": [ /* Ayah */ ]
}
```

### Real example — `surah_001.json`, truncated to āyah 1

```json
{
  "surahNumber": 1,
  "surahNameArabic": "سُورَةُ ٱلْفَاتِحَةِ",
  "surahNameEnglish": "Al-Faatiha",
  "surahNameTranslation": "The Opening",
  "revelationType": "Meccan",
  "ayahCount": 7,
  "ayahs": [
    {
      "ayah": 1,
      "uthmaniText": "﻿بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      "tajweedText": "بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّح<tajweed class=madda_permissible>ِي</tajweed>مِ <span class=end>١</span>",
      "translations": {
        "en": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        "bn": "শুরু করছি আল্লাহর নামে যিনি পরম করুণাময়, অতি দয়ালু।"
      },
      "juz": 1,
      "page": 1,
      "ruku": 1,
      "manzil": 1,
      "hizbQuarter": 1,
      "sajda": false,
      "words": [
        {
          "position": 1,
          "arabic": "بِسْمِ",
          "transliteration": "bis'mi",
          "translation": { "en": "In (the) name", "bn": "নামে" },
          "morphology": {
            "root": "سمو",
            "lemma": "ٱسْم",
            "pos": "Preposition + Noun",
            "rootCount": 381
          }
        },
        {
          "position": 2,
          "arabic": "ٱللَّهِ",
          "transliteration": "l-lahi",
          "translation": { "en": "(of) Allah", "bn": "আল্লাহ (র)" },
          "morphology": {
            "root": "اله",
            "lemma": "ٱللَّه",
            "pos": "Proper Noun",
            "rootCount": 2851
          }
        }
      ]
    }
  ]
}
```

### Field notes, measured

**Ayah**

| Field | Type | Notes |
|---|---|---|
| `ayah` | Number | 1-based within the surah. **Not a global āyah number** — there is none anywhere in this app. |
| `uthmaniText` | String | Tanzil Uthmani. May carry a leading BOM. **Carries the Bismillah as a literal prefix on āyah 1 of every surah except 9.** |
| `tajweedText` | String \| null | quran.com markup, `<tajweed class=…>` + `<span class=end>`. Never carries the Bismillah prefix. |
| `translations.en` | String | `en.sahih`. One translation only. |
| `translations.bn` | String | `bn.bengali`. One translation only. |
| `juz` `page` `ruku` `manzil` `hizbQuarter` | Number | Straight from alquran.cloud. **`ruku` is a GLOBAL index across the whole Qur'an**, not per surah — `rukuIndexInSurah()` in `unit-keys.js` converts it. `hizbQuarter` is 1..240; a hizb is `Math.ceil(q/4)`. |
| `sajda` | Boolean | |
| `words` | Word[] | Never empty — measured: 0 of 6,236 āyahs lack words. |

**Word** — the structure this review is about

| Field | Type | Coverage (of 77,429) |
|---|---|---|
| `position` | Number | 100 % — 1-based, contiguous, āyah-end marker excluded |
| `arabic` | String | 100 % |
| `transliteration` | String | 100 % — Latin only |
| `translation.en` | String | 100 % |
| `translation.bn` | String | 100 % |
| `morphology` | Object \| null | 100 % non-null (the `null` branch exists in `pull.js` but never fired) |
| `morphology.root` | String | **64.5 %** (49,971) — `""` when the corpus has none |
| `morphology.lemma` | String | **95.7 %** (74,122) |
| `morphology.pos` | String | 100 % — 359 distinct values from 46 atoms |
| `morphology.rootCount` | Number | 100 % — `0` when there is no root |

**There is no `id` field on a word.** Identity is `(surahNumber, ayah,
position)`, never materialised.

---

## MODEL 2 — the surah index

**File:** `output/surah-index.json` · 114 entries, 20 KB
**Read by:** `getSurahIndex()` — for pickers, so opening a picker never loads
text.

```json
[
  { "surahNumber": 1, "nameArabic": "سُورَةُ ٱلْفَاتِحَةِ", "nameEnglish": "Al-Faatiha",
    "nameTranslation": "The Opening", "revelationType": "Meccan", "ayahCount": 7 },
  { "surahNumber": 2, "nameArabic": "سُورَةُ البَقَرَةِ", "nameEnglish": "Al-Baqara",
    "nameTranslation": "The Cow", "revelationType": "Medinan", "ayahCount": 286 }
]
```

Note the field names differ from Model 1 (`nameArabic` here vs
`surahNameArabic` there) — a small inconsistency, recorded in
`DATA_GAPS_AND_INCONSISTENCIES.md`.

---

## MODEL 3 — the boundary indexes

All three are **computed** from the real per-āyah fields by
`build-{juz,hizb,page}-index.js`, never hand-typed.

```json
// juz-index.json — 30 entries
{ "juz": 1, "startSurah": 1, "startAyah": 1, "startPage": 1,
  "endSurah": 2, "endAyah": 141, "endPage": 21 }

// hizb-index.json — 60 entries
{ "hizb": 1, "startSurah": 1, "startAyah": 1, "endSurah": 2, "endAyah": 74, "juz": 1 }

// page-index.json — 604 entries
{ "page": 1, "startSurah": 1, "startAyah": 1, "endSurah": 1, "endAyah": 7 }
```

`page-index.json` deliberately carries **no** "which juz" tag, because a page
can straddle a juz boundary — verified against the real data by the builder.

---

## MODEL 4 — the search index (one per language)

**Files:** `search-ar.json` (1.4 MB), `search-en.json` (0.9 MB),
`search-bn.json` (2.1 MB)
**Read by:** `getSearchIndex(lang)` — **only on first use of Search**, and
only for the language the query was typed in.

```jsonc
{
  "lang":  "en",
  "count": 6236,
  "refs":  [1001, 1002, …],   // packed surah*1000 + ayah — 1001 = surah 1, āyah 1
  "texts": ["In the name of Allah, the Entirely Merciful, the Especially Merciful.", …]
}
```

Two parallel arrays, index-aligned. **This index is āyah-level. There is no
word, root or lemma index anywhere in this project.**

---

## MODEL 5 — the mushaf page layout (a SECOND word model)

**File:** `mushaf/mushaf-madani-v2.json` (~3 MB, fetched from
`raw.githubusercontent.com` on first use of Mushaf view)
**Read by:** `app/js/hifz-renderer.js`

```jsonc
{
  "1": [                                    // page number as a STRING key
    { "line": 1, "type": "surah_name", "centered": true, "surah": 1 },
    { "line": 2, "type": "ayah", "centered": true,
      "words": [
        { "loc": "1:1:1", "g": "ﱁ" },       // ← surah:ayah:word — a REAL word id
        { "loc": "1:1:2", "g": "ﱂ" },
        { "loc": "1:1:3", "g": "ﱃ" },
        { "loc": "1:1:4", "g": "ﱄ" },
        { "loc": "1:1:5", "g": "ﱅ" }        // ← the āyah-end marker, counted as a word
      ] }
  ]
}
```

`g` is a **private-use glyph character** meaningful only in that page's own
`pN.woff2` font. It is not Arabic text and cannot be searched, copied or
matched.

**This is a completely separate word identification system from Model 1, and
the two are never joined.** Measured alignment across all 6,236 āyahs:
6,233 differ by exactly +1 (the end marker), and **3 differ by +2** —
2:181, 8:6, 13:37, where quran.com merges **بَعْدَ مَا** into one entry and
the printed mushaf sets it as two.

---

## MODEL 6 — Firestore documents (progress, not content)

No Qur'an text is ever stored in Firestore. These are the shapes that
*reference* Qur'an positions.

### `records/{tenantId}__{personId}__{chunkKey}`

The core tracking document. From `app/js/records.js`'s own header:

```jsonc
{
  "entries": {
    "<unitKey>::<trackableId>": {
      "unitType":           "ayah",          // "ayah"|"range"|"surah"|"ruku"|"juz"|"hizb"|"page"|…
      "subjectId":          "quran",
      "trackableId":        "approach_04",
      "claimedStatus":      "practising",    // one of six
      "claimedByPersonId":  "p1",
      "confirmedStatus":    "learning",      // FROZEN when marked (invariant I6)
      "confirmState":       "pending",       // "pending"|"confirmed"|"returned"
      "confirmedByPersonId": "p2",
      "confirmedAt":        Timestamp,
      "returnNote":         "…",
      "domainIds":          ["dom_x"],
      "notes":              "…",
      "updatedAt":          Timestamp
    }
  },
  "schemaVersion": 1, "createdAt": …, "updatedAt": …, "createdBy": …   // invariant I17
}
```

`chunkKey` is `surah_${n}` for unit types that carry a surah (`ayah`, `range`,
`surah`, `ruku`) and `subject_${subjectId}` for everything else
(`juz`/`hizb`/`rub`/`manzil`/`page`/`hadith`/`topic`/`name`).

**A key point for this review:** the map key is
`"<unitKey>::<trackableId>"`, and `unitKey` comes from `buildUnitKey`, which
**has no `word` variant**. A word cannot appear here.

### `ayahNotes/{tenantId}__{personId}`

```jsonc
{ "notes": { "<unitKey>": { "html": "<p>…</p>", "updatedAt": Timestamp } } }
```

One document per person. Rich-text HTML, keyed by unit key — so again,
**āyah-level at finest**.

### `bookmarks/{tenantId}__{personId}`

```jsonc
{
  "resume": { "<moduleId>::<programId>::<subjectId>": { "position": "ayah:2:255",
                                                        "settings": {…}, "updatedAt": … } },
  "saved":  [ { "id": …, "programId": "none", "moduleId": "quranrevival",
                "subjectId": "quran", "name": "…", "position": "ayah:2:255",
                "settings": {…}, "folderId": null, "personTagId": …, "removed": false } ],
  "folders":[ { "id": …, "name": "…", "parentId": null, "removed": false, "createdAt": … } ]
}
```

`settings` for a Qur'an bookmark is free-form and, in this module, is:

```js
// app/quranrevival.html — captureQuranBookmarkSettings()
{ unitType, surahNum, ayahNum, rangeFrom, rangeTo, trackableId,
  tajweedOn, wbwOn, rootsOn, derivativesOn, mushafOn }
```

Note what is **absent**: `wbwLangMode`. The Word-by-Word language choice is
not captured here and not in `localStorage` — see the gaps document.

### `ayahCollections/{tenantId}`

18 seeded thematic collections, 379 āyah references, plain unit keys only —
never a second copy of the text.

---

## MODEL 7 — the Approach ("trackable") definition

**File:** `app/js/catalogue-data.js` → `APPROACH_TEMPLATES`
**This is what decides which Word Study panels appear.**

```js
{ id: "approach_04", order: 4, section: 1,
  name: nameLang("Reading — Word-by-Word Meaning", "শব্দে শব্দে অর্থসহ পাঠ"),
  guide: {
    what: en("Learning the meaning of each individual Arabic word in a passage."),
    how:  en("Use the word-by-word panel to see each word's meaning underneath it while reading."),
    measure: en("How many of the words in the assigned portion you can translate without the panel.")
  },
  panels: ["text", "wordByWord"] }
```

`panels[]` is consumed by `renderLayoutA()`:

```js
const PANEL_ORDER = ["text","tajweed","wordByWord","root","derivatives",
                     "notes","reflection","writing","checklist"];
```

**Worth the reviewer's attention:** Approach 04's own stated `measure` is
*"how many of the words … you can translate without the panel"* — a
**word-level** measure. The system can only record an āyah-level claim, so
that measure is never captured as data. The pedagogy already asks for
something the data model cannot express.

---

## MODEL 8 — in-memory runtime state (not persisted unless listed)

`app/quranrevival.html`, module scope:

```js
let currentSurahNum, currentAyahNum, currentUnitType, currentTrackableId;
let currentSurahData;                 // the whole parsed surah object, Model 1
let rangeFrom, rangeTo;
let wbwLangMode = "auto";             // "auto" | "en" | "bn" | "both"  ← NOT PERSISTED
let noteScope = { unitType, ayahNum, rangeFrom, rangeTo };
```

Persisted preferences live in `app/js/prefs.js` under `mm_*` keys:
`mm_app_lang`, `mm_quran_font`, `mm_quran_translation_lang`,
`mm_quran_translation_set`, `mm_quran_last_session`, `mm_ayah_display_mode`,
`mm_reading_sideways`, `mm_reading_fullscreen_hides`, `mm_explore_quran_view`,
`mm_explore_juz_view`, `mm_qcr_wheel_size`, `mm_wheel_size_*`,
`mm_bookmark_menu_*`.

`wbwLangMode` appears in **none** of them.

---

## What no model contains

For the reviewer's convenience, the fields a Word Study system would normally
have and this one does not, anywhere:

| Missing | Consequence |
|---|---|
| a word **id** | words cannot be referenced, stored or linked |
| **derived form** (Form I–X) | present in the source corpus, discarded at build |
| **tense / aspect / mood / voice** | present in the source, discarded |
| **person / gender / number** | present in the source, discarded |
| **case / definiteness** | present in the source, discarded |
| **prefix / suffix segmentation** | present in the source, collapsed into one string |
| **attached-pronoun identity** | present in the source, reduced to the word "Pronoun" |
| **root → word list** | never built (`roots-index.json` is referenced in a comment and does not exist) |
| **lemma → word list** | never built |
| **word audio / timing** | never sourced |
| **Bangla-script transliteration** | never sourced |
| **tafsir at any level** | never sourced |
| **a `word:` unit key** | words are outside the tracking model entirely |
