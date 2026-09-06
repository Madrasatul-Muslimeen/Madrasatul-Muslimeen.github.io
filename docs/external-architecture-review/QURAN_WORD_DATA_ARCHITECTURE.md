# Document 7 — Quran Word Data Architecture

QuranRevival v08.00 · read-only analysis of the live dataset

**Every number in this document was computed by walking all 114 real data files
in this repository.** None is quoted from a manifest without being checked, and
where a manifest figure disagrees with the files, both are given and the
discrepancy is explained.

---

## 1. Exact Quran data source

Three upstream sources, merged at pull time by
`tools/quran-data-pull/pull.js`. From `output/manifest.json`, verbatim:

```json
"sources": [
  "alquran.cloud (Uthmani text, en.sahih, bn.bengali translations, juz/page/ruku/manzil/hizbQuarter/sajda metadata)",
  "api.quran.com v4 (tajweed-tagged text, word-by-word Arabic/transliteration/English/Bangla)",
  "GitHub mirror of the 2011 Quranic Arabic Corpus release (root/lemma/part-of-speech)"
]
```

| Layer | Source | What it contributes |
|---|---|---|
| Ayah text + metadata | alquran.cloud | Uthmani text, en.sahih + bn.bengali translations, juz / page / ruku / manzil / hizbQuarter / sajda |
| Word-by-word | api.quran.com v4 | per-word Arabic, transliteration, English gloss, Bangla gloss |
| Morphology | **Quranic Arabic Corpus, 2011 release** (GitHub mirror) | root, lemma, part of speech |

**The morphology is the 2011 Quranic Arabic Corpus.** That single fact governs
most of Documents 7 and 8: its identity model, its coverage and its limits are
inherited wholesale, and the app adds nothing to it.

The merge is by location key — `resolveWordKey()` / `parseMorphologyLine()` in
`pull.js`, ported from the legacy app so that morphology merges the same way it
always did.

---

## 2. Exact file/database location

```
tools/quran-data-pull/output/
├── manifest.json                4 KB    provenance + counts
├── surah-index.json            20 KB    114 rows
├── juz-index.json               8 KB    30 rows
├── hizb-index.json              8 KB    60 rows
├── page-index.json             64 KB    604 rows
├── search-en.json             896 KB    on-demand search index
├── search-ar.json             1.4 MB
├── search-bn.json             2.1 MB
└── surahs/
    └── surah_001.json … surah_114.json     27 MB total
```

**Total: 31 MB.** Served as **static files over HTTP, never from Firestore.**
`app/js/quran-data.js` is the only reader, and its base path is one constant:

```js
const BASE_URL = "/tools/quran-data-pull/output";
```

Architecture s5, quoted in that file's own header: *"Quran content is served as
static files, one per surah, cached permanently by the browser — never as
Firestore reads. Load one surah when it is opened. Never load the Quran."*

**Consequence: the word data is completely outside the Firestore schema, the
security rules and the tenant model.** It is public, immutable, cached content.
Nothing about it is per-person.

---

## 3. Dataset format

JSON, one file per surah. Full structure:

```
surah_NNN.json
├── surahNumber, surahNameArabic, surahNameEnglish, surahNameTranslation
├── revelationType, ayahCount
└── ayahs[]
    ├── ayah                 1-based within the surah
    ├── uthmaniText          plain Arabic
    ├── tajweedText          Arabic with <tajweed class=…> spans
    ├── translations { en, bn }
    ├── juz, page, ruku, manzil, hizbQuarter, sajda
    └── words[]
        ├── position         1-based within the ayah
        ├── arabic
        ├── transliteration
        ├── translation { en, bn }
        └── morphology { root, lemma, pos, rootCount }
```

**The word object has exactly five keys and the morphology object exactly four.**
Verified by enumerating keys across all 77,429 words — every word has all five,
and every morphology block has all four. There are no other fields, no optional
extras, and no id.

A real, unedited word (`surah_001.json`, ayah 1, position 1):

```json
{
  "position": 1,
  "arabic": "بِسْمِ",
  "transliteration": "bis'mi",
  "translation": { "en": "In (the) name", "bn": "নামে" },
  "morphology": { "root": "سمو", "lemma": "ٱسْم", "pos": "Preposition + Noun", "rootCount": 381 }
}
```

---

## 4. Total number of Quran word occurrences

# **77,429**

Counted directly by summing `len(ayah.words)` across all 114 files. This agrees
exactly with `manifest.json`'s `totalWords`.

Supporting counts, all verified:

| Quantity | Value |
|---|---|
| Surahs | 114 |
| Ayahs | 6,236 |
| **Word occurrences** | **77,429** |
| Longest ayah, by words | **128** (Surah 2:282) |
| Surah al-Fatihah | 29 words |
| Mean words per ayah | 12.4 |

**A caution the reviewer should carry forward:** 77,429 is *this dataset's*
count under *this dataset's* tokenisation. Published Quran word counts vary
(commonly quoted figures range from about 77,400 to 77,900) because they split
prefixed particles and pronouns differently. The brief's own rule — follow the
underlying dataset — resolves this: **77,429 is the denominator, because it is
what the app's own data actually contains.** See §19.

---

## 5. Number of unique surface forms

| Measure | Count |
|---|---|
| Unique surface forms, **raw bytes** | **21,295** |
| Unique surface forms, **NFC-normalised** | **21,287** |
| Unique forms, diacritics stripped | 16,224 |
| Forms occurring exactly once (hapax) | **14,109** of 21,287 (66.3%) |

**The 21,295 vs 21,287 gap is a real and important defect-shaped finding, not
rounding.** Eight pairs of forms in this dataset are the same word that differ
only in the **order of their combining marks**. Demonstrated concretely — the
word رَبِّ as the dataset stores it, versus the same word typed with shadda and
kasra in the other order:

```
dataset:  U+0631 REH, U+064E FATHA, U+0628 BEH, U+0651 SHADDA, U+0650 KASRA
typed:    U+0631 REH, U+064E FATHA, U+0628 BEH, U+0650 KASRA,  U+0651 SHADDA

raw string equality : False
NFC equality        : True
```

**Any future code that identifies a word by its surface string must normalise
(NFC) before comparing, or it will silently miss matches — including matches
within this dataset itself.** This was found by searching for the exact forms
named in the project brief and getting zero hits for words that occur hundreds
of times.

---

## 6. Does every word occurrence have an ID?

# **No.**

There is no id, no uuid, and no global index on any word. The only identifier a
word carries is `position` — **1-based and unique within its ayah only**
(verified: zero duplicate positions across all 77,429 words). Position 1 exists
6,236 times over.

---

## 7. Do canonical occurrence IDs exist? (e.g. `surah:ayah:word`)

**No — and this is the single most consequential gap in the dataset for the
planned feature.**

A word's full address **is** `(surahNumber, ayah, position)`, and that triple is
unique and complete. But it is **never materialised as a string anywhere in the
codebase**. Verified: `buildUnitKey` (`app/js/unit-keys.js:20`) has twelve
constructors and none is `word`; `UNIT_TYPES` has twelve entries and none is
`"word"`; nothing anywhere concatenates surah, ayah and position into a key.

The convention it *would* follow is already established by the app's own unit
keys — `ayah:2:255` — so the natural form is `word:{surah}:{ayah}:{position}`,
e.g. `word:1:1:1`. **It does not exist today; it would be a new construct.**

Two properties worth noting for whoever defines it:

- It would be **stable** as long as the dataset is not re-pulled with different
  tokenisation. A re-pull that splits words differently would silently
  invalidate every stored key — a real migration risk, since I5 requires unit
  keys to be permanent.
- The dataset itself carries **no version stamp per word**. `manifest.json` has
  `schemaVersion: 1` and a `generatedAt` timestamp for the whole pull; that is
  the only versioning available.

---

## 8. Can identical / repeated words currently be identified?

**Yes by computation, no by lookup.** There is no reverse index, no
`occurrences[]` array, and no "same word elsewhere" link in the data. Finding
every occurrence of a form means walking all 114 files — which is exactly what
this analysis did.

Cost, measured: the full 31 MB scan takes a few seconds in Python. **In the
browser it would mean fetching all 114 surah files (27 MB), which flatly
violates the load-speed contract's "Never load the Quran".** So identification
is possible in principle and not viable at runtime without a precomputed index
that does not currently exist.

**Which identity you group by matters enormously**, and the data gives a clear
answer on reliability:

| Grouping key | Distinct values | Stable per surface form? |
|---|---|---|
| Surface form (NFC) | 21,287 | — (it *is* the form) |
| Lemma | 4,832 | **Yes — only 75 forms (0.4%) map to more than one lemma** |
| Root | 1,642 | **Yes — only 10 forms (0.0%) map to more than one root** |
| POS string | 359 | No — 743 forms (3.5%) carry more than one |
| **English gloss** | — | **NO — 5,232 forms (24.6%) carry more than one** |

**And the gloss result is far worse than that percentage suggests once weighted
by frequency: 57,146 of the 77,429 word occurrences — 73.8% — have a surface
form that is glossed more than one way somewhere in the Quran.** The worst
offenders are the commonest words:

| Form | Occurrences | Distinct English glosses |
|---|---|---|
| مِن | 728 | **72** |
| ٱلَّذِينَ | 810 | 55 |
| مَا | 710 | 65 |
| فِى | 1,098 | 43 |
| ٱللَّهِ | 665 | 60 |

Sample glosses for فِى: `"(are) in"`, `"(is) at"`, `"(is) in"`, `"(is) on"`,
`"(lay) in"`, `"(that is) in"`, `"(These are) among"`, `"(those) in"` …

**The reason is structural, not a data error: the word-by-word gloss from
quran.com is a CONTEXTUAL translation fragment, not a lexical definition.** It
carries the surrounding syntax in parentheses so that reading the glosses in
sequence produces readable English.

**Direct consequence for the coverage feature, and it is a hard one: the
English gloss cannot be used as word identity.** A "learn this word's meaning"
item keyed on the gloss would fragment مِن into 72 separate items. Identity must
come from the surface form, the lemma, or the root — all three of which are
stable — and the gloss must be treated as **per-occurrence display text**.

**Lemma → root is a clean function**: zero lemmas map to more than one root. So
the hierarchy `surface form → lemma → root` is effectively deterministic in this
dataset, which is a genuinely good foundation for Levels 1 and 2.

---

## 9. Do frequency indexes exist?

**One, partial, and it has known defects.**

`morphology.rootCount` is stamped on **every** word (all 77,429 carry the field)
and is a **pre-computed count of that root's occurrences across the whole
Quran** — the only cross-Quran aggregate anywhere in the dataset. It is what
`renderRootPanel()` prints as "381×".

`pull.js:214`, verbatim:

```js
const rootCount = rootBW && morph.rootIdx[canonicalRootKey(rootBW)]
  ? morph.rootIdx[canonicalRootKey(rootBW)].length : 0;
```

**There is no `formCount`, no `lemmaCount`, and no reverse index of any kind.**
`ayah-renderer.js:152` refers to a `roots-index.json` — **that file does not
exist in this repository** (searched; no match). The comment describes something
planned, not something present.

### 9a. `rootCount` merges weak-final-radical roots — verified

`canonicalRootKey()`, `pull.js:90`, verbatim:

```js
function canonicalRootKey(rootBW) {
  if (!rootBW) return rootBW;
  const last = rootBW.slice(-1);
  if (last === "w" || last === "y") return rootBW.slice(0, -1) + "#";
  return rootBW;
}
```

A root ending in **و** or **ي** has that final radical replaced by `#` **for
counting purposes only**. The `root` field on the word keeps the unmerged form.

**So the dataset carries two different root identities at once:** the
*displayed* root (1,642 distinct) and the *counting* key (1,634 distinct).

Verified against the real files: **19 roots have a `rootCount` that disagrees
with their own in-file frequency. 16 of the 19 are exactly explained by this
merge.** Examples:

| Root | Own occurrences | Stored `rootCount` | Merged group |
|---|---|---|---|
| صلو | 99 | **124** | صل# = 124 |
| عصو | 12 | **44** | عص# = 44 |
| عصي | 32 | **44** | عص# = 44 |
| نسي | 45 | **104** | نس# = 104 |
| نسو | 59 | **104** | نس# = 104 |
| ابي | 13 | **130** | اب# = 130 |

**The remaining 3 are unexplained and are small discrepancies in the source
merge**, reported honestly rather than smoothed over:

| Root | Own occurrences | Stored `rootCount` | Difference |
|---|---|---|---|
| منن | 30 | 27 | −3 |
| امم | 118 | 119 | +1 |
| علو | 71 | 70 | −1 |

**Practical guidance: `rootCount` is a display figure, not an arithmetic
primitive.** Summing it will not give 49,971, and it double-counts across merged
pairs. **Any coverage calculation should count occurrences from the files
themselves, not from `rootCount`.** This is a real, verifiable defect that would
otherwise be discovered late.

---

## 10. Can the same written word occurring elsewhere be linked?

**Not by any stored link.** No word points to another. Linking is computable
(§8) but requires either a full 27 MB scan or a precomputed index that does not
exist. **Building such an index is straightforward and is the single highest-
leverage missing artefact** for this feature — see DATASET_INVENTORY.md.

---

## 11–17. Where each field lives

**All seven live in the same place: inline on the word object in
`surahs/surah_NNN.json`.** There is no separate dictionary, lexicon, morphology
or gloss file — and no Firestore collection for any of it.

| # | Field | Path | Coverage (of 77,429) |
|---|---|---|---|
| 11 | English word meaning | `words[].translation.en` | **77,429 — 100%** |
| 12 | Bangla word meaning | `words[].translation.bn` | **77,429 — 100%** |
| 13 | Transliteration | `words[].transliteration` | **77,429 — 100%** |
| 14 | Root | `words[].morphology.root` | **49,971 — 64.5%** (27,458 empty) |
| 15 | Lemma | `words[].morphology.lemma` | **74,122 — 95.7%** (3,307 empty) |
| 16 | Part of speech | `words[].morphology.pos` | **77,429 — 100%** |
| 17 | Morphology (beyond root/lemma/POS) | — | **absent** — see Document 8 |

**The `root` gap is not a data error and must not be treated as one.** 35.5% of
words have no root because they genuinely have none: particles, pronouns,
prepositions, and the disconnected letters. `مِن` (728×) and `فِى` (1,098×) are
rootless by nature. **Root-based coverage can therefore never exceed 64.5% of
the Quran's words**, which is a hard ceiling on any Level 2 metric and should be
designed for, not discovered.

Rendering of these fields today (`app/js/ayah-renderer.js`):

| Panel | Renderer | Shows |
|---|---|---|
| `wordByWord` | `renderWordByWordPanel()` line 114 | Arabic + transliteration + gloss chips |
| `root` | `renderRootPanel()` line 156 | word + root + `rootCount` badge. **Filters out rootless words** |
| `derivatives` | `renderDerivativesPanel()` line 178 | word + POS + lemma |

---

## 18. Does current data support occurrence-frequency calculations?

**Yes — fully, for every grouping, by computation from the files.** All of the
following were computed for this review, so their feasibility is demonstrated
rather than asserted:

| Question | Answerable? | Value |
|---|---|---|
| Total occurrences | Yes | 77,429 |
| Occurrences of one surface form | Yes | e.g. فِى = 1,098 |
| Occurrences of one lemma | Yes | e.g. مِن = 3,229 |
| Occurrences of one root | Yes | e.g. اله = 2,851 |
| Distinct forms sharing a root | Yes | e.g. ربب → 175 forms, 980 occurrences |
| Frequency rank / cumulative coverage | Yes | §18a |
| **At runtime, in the browser, without a new index** | **No** | requires 27 MB |

### 18a. Cumulative coverage curves — measured

This is the table that makes a coverage metric designable. **How much of the
Quran's 77,429 word occurrences you cover by learning the top N items:**

| Items learned | By surface form | By lemma | By root |
|---|---|---|---|
| top 100 | 29.1% | **54.8%** | 39.0% |
| top 500 | 47.6% | **77.3%** | 59.2% |
| top 1,000 | 55.7% | **85.1%** | 63.3% |
| top 2,000 | 64.2% | **90.9%** | — (only 1,642 exist) |
| **to reach 50%** | 618 forms | **72 lemmas** | 219 roots |
| **to reach 80%** | 6,490 forms | **625 lemmas** | not reachable |
| **to reach 90%** | 13,545 forms | 1,777 lemmas | not reachable |
| **Maximum reachable** | 100% | **95.7%** | **64.5%** |

Three things fall straight out of this and are worth stating plainly:

1. **Lemma is by far the most efficient grouping.** 72 lemmas cover half the
   Quran; 625 cover 80%. This maps naturally onto a Level 1 "learn the
   commonest words" curriculum.
2. **Root grouping saturates at 64.5%** and cannot express the other third of
   the Quran at all. A Level 2 root metric needs an explicit denominator
   decision: 49,971 (root-bearing words) or 77,429 (all words)?
3. **Surface-form grouping has a long tail that makes 100% impractical** —
   14,109 forms (66% of all distinct forms) occur exactly once. Reaching 90%
   means learning 13,545 distinct forms.

---

## 19. Word counting methodology — what the dataset actually does

The brief's rule is that QuranRevival must follow the dataset rather than invent
its own definition. Here is what the dataset's definition actually is:

**A "word" is one entry in an ayah's `words[]` array**, as tokenised by
**quran.com's v4 word-by-word API**. Nothing in QuranRevival re-tokenises,
splits, merges, or second-guesses that.

| Question | Answer as implemented |
|---|---|
| Does every written occurrence count separately? | **Yes.** 77,429 array entries, each independent |
| Are repeated surface forms grouped? | **No.** Each occurrence is its own entry; a repeat is a separate entry with its own gloss |
| Are grammatical variants grouped? | **No** at the word level. Yes *implicitly*, via the shared `lemma`/`root` fields |
| Does lemma grouping exist? | **Yes, as data** — a `lemma` field on 95.7% of words. **Not as a structure**: no lemma index, no lemma document, no grouping code |
| Does root grouping exist? | **Yes, as data** — a `root` field on 64.5%, plus the merged `rootCount`. **Not as a structure** |

**A tokenisation detail that decides the word count**, visible in the very first
word of the Quran:

```
بِسْمِ   pos: "Preposition + Noun"      root: سمو   lemma: ٱسْم
```

**بِسْمِ is ONE word here, not two**, even though it is grammatically the
preposition *bi* + the noun *ism*. The compound is visible in the POS string
(`"Preposition + Noun"`) but **not** in the token count. This is pervasive:
`"Verb + Pronoun"` occurs 7,440 times, `"Preposition + Pronoun"` 3,847 times,
`"Determiner + Noun"` 5,847 times.

**So the dataset counts orthographic words, not morphological segments.** The
Quranic Arabic Corpus's own native unit is the *segment* (its 2011 release has
**128,011 morphology rows** for these 77,429 words — see `manifest.json`), and
the pull deliberately collapses those onto quran.com's word tokens.

**This is exactly the "do not invent your own definition" boundary the brief
draws.** Following the dataset means:

- **77,429 is the denominator**, not 128,011 and not any published figure.
- A word like رَبُّكَ ("your Lord") is **one** occurrence, not two.
- The forms named in the brief — رَبِّ, رَبُّكَ, رَبِّهِمْ, رَبَّنَا — are **kept
  separate**, exactly as the brief requires. Verified in the real data: they are
  4 of **175 distinct surface forms** sharing the root ربب, which together occur
  **980 times**:

  | Form | Occurrences |
  |---|---|
  | رَبِّ | 80 |
  | رَبِّكَ | 70 |
  | رَبِّى | 61 |
  | رَبَّكَ | 52 |
  | رَبِّهِمْ | 47 |
  | رَبَّنَا | 40 |
  | رَبُّكَ | 38 |
  | … 168 more | … |

- **The dataset DOES provide legitimate shared identities** — `lemma` and
  `root` — which the brief permits using. It provides no others. Any grouping
  beyond form, lemma or root would be QuranRevival inventing linguistics, which
  the brief forbids.

---

## 20. Could "mastering a learning item gives coverage for all occurrences mapped to it" work?

**Yes — the mapping exists, is computable, and is reliable for two of the three
candidate identities. Analysis only; nothing is implemented.**

What would be required, and what each requirement costs:

| Requirement | Status today |
|---|---|
| A stable identity per learning item | **Available** for lemma (95.7%, 0.4% ambiguity) and root (64.5%, 0.0% ambiguity). **Not usable** for the English gloss (73.8% of occurrences ambiguous — §8) |
| Item → occurrence-count mapping | **Computable**, not stored. No index file exists |
| A total to divide by | **77,429**, per §19 |
| Somewhere to store the claim | `records` works unchanged for **root-level** claims (~0.56 MiB). Lemma, form and per-occurrence claims **exceed Firestore's 1 MiB document limit** — Document 3 §13 |
| A place to compute it | **Browser only.** There are no Cloud Functions in this project (Document 4 §5) |
| A place to display it | **None.** Explore is entirely ordinal — no percentage exists anywhere in it (Documents 5 §11, 6) |

**The two genuine blockers, stated as findings rather than solutions:**

1. **No precomputed index.** Mapping an item to its occurrence count at runtime
   would require loading all 114 surah files (27 MB), which the load-speed
   contract explicitly forbids. A small generated index — a lemma/root/form →
   count (and optionally → locations) table — would remove this entirely. It is
   a build-time artefact, sits beside the existing `juz-index.json` /
   `hizb-index.json` / `page-index.json`, and would be **tens to hundreds of KB**
   rather than megabytes for counts alone.
2. **Denominator ambiguity per level.** Level 2's root-based coverage cannot
   exceed 64.5% of all words. Whether the denominator is 77,429 (all words) or
   49,971 (root-bearing words) changes the number a student sees by half again,
   and the dataset does not decide it.

**Both are design decisions for the external reviewer. This document deliberately
does not choose either.**
