# 09 — Quran Data Architecture

QuranRevival v08.02

Every count in this document was computed by walking the **real 114 data files**
in this repository, not quoted from a manifest. Where a manifest figure
disagrees with the files, both are given and the discrepancy explained.

---

## 1. Sources

Three upstream sources, merged at pull time by
`tools/quran-data-pull/pull.js`. From `output/manifest.json`, verbatim:

```json
"sources": [
  "alquran.cloud (Uthmani text, en.sahih, bn.bengali translations, juz/page/ruku/manzil/hizbQuarter/sajda metadata)",
  "api.quran.com v4 (tajweed-tagged text, word-by-word Arabic/transliteration/English/Bangla)",
  "GitHub mirror of the 2011 Quranic Arabic Corpus release (root/lemma/part-of-speech)"
]
```

| Layer | Source | Contributes |
|---|---|---|
| Ayah text + metadata | alquran.cloud | Uthmani text, en.sahih + bn.bengali, juz/page/ruku/manzil/hizbQuarter/sajda |
| Word-by-word | api.quran.com v4 | per-word Arabic, transliteration, English gloss, Bangla gloss |
| Morphology | **Quranic Arabic Corpus, 2011 release** | root, lemma, part of speech |

**The morphology is the 2011 Quranic Arabic Corpus**, and its identity model,
coverage and limits are inherited wholesale. The app adds nothing to it.

## 2. Storage location and format

```
tools/quran-data-pull/output/            31 MB total
├── manifest.json           4 KB    provenance + counts
├── surah-index.json       20 KB    114 rows
├── juz-index.json          8 KB    30 rows
├── hizb-index.json         8 KB    60 rows
├── page-index.json        64 KB    604 rows
├── search-en.json        896 KB    ┐ one row per ayah, 6,236 each
├── search-ar.json        1.4 MB    │ loaded ONLY on first search,
├── search-bn.json        2.1 MB    ┘ and only for the language typed in
└── surahs/surah_001…114.json   27 MB
```

**Served as static files over HTTP, never from Firestore.**
`app/js/quran-data.js` is the only reader, and its base path is one constant:

```js
const BASE_URL = "/tools/quran-data-pull/output";
```

Architecture s5, quoted in that file's own header: *"Quran content is served as
static files, one per surah, cached permanently by the browser — never as
Firestore reads. Load one surah when it is opened. Never load the Quran."*

> **Consequence: the Quran data sits entirely outside the Firestore schema, the
> security rules and the tenant model.** It is public, immutable, cached
> content. Nothing about it is per-person, and **a tenant cannot correct a
> gloss** — unlike Asma ul Husna, where `asmaCollections` explicitly allows a
> tenant to override a canonical Name's Bangla wording.

## 3. Structure

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
        ├── position         1-based within the AYAH ONLY
        ├── arabic
        ├── transliteration
        ├── translation { en, bn }
        └── morphology { root, lemma, pos, rootCount }
```

**The word object has exactly five keys and the morphology object exactly four.**
Verified by enumerating keys across all 77,429 words — every word has all five,
every morphology block all four. **There are no other fields and no id.**

A real, unedited word (`surah_001.json`, 1:1, position 1):

```json
{ "position": 1, "arabic": "بِسْمِ", "transliteration": "bis'mi",
  "translation": { "en": "In (the) name", "bn": "নামে" },
  "morphology": { "root": "سمو", "lemma": "ٱسْم", "pos": "Preposition + Noun", "rootCount": 381 } }
```

## 4. Totals — measured

| Quantity | Value |
|---|---|
| Surahs | **114** |
| Ayahs | **6,236** |
| **Word occurrences** | **77,429** |
| Unique surface forms (raw bytes) | **21,295** |
| Unique surface forms (**NFC-normalised**) | **21,287** |
| Unique forms, diacritics stripped | 16,224 |
| Unique **lemmas** | **4,832** |
| Unique **roots** | **1,642** |
| Unique POS strings | **359**, from **46 atoms**, up to 5 deep |
| Longest ayah by words | **128** (Surah 2:282) |
| Hapax surface forms | **14,109** (66.3% of distinct forms) |
| Morphology rows read at pull time | **128,011** |

`totalWords: 77429` and `wordsWithRoot: 49971` in `manifest.json` were both
independently verified against the files and are exactly correct.

**A caution.** 77,429 is *this dataset's* count under *this dataset's*
tokenisation. Published Quran word counts vary (commonly ~77,400–77,900) because
they split prefixed particles differently. **77,429 is the app's own truth.**

## 5. Field-by-field inventory

| Field | Path | Source | Coverage of 77,429 | Generated? | Hand-maintained? |
|---|---|---|---|---|---|
| Arabic surface word | `words[].arabic` | quran.com v4 | **100%** | generated at pull | no |
| Transliteration | `words[].transliteration` | quran.com v4 | **100%** (Latin only) | generated | no |
| English word meaning | `words[].translation.en` | quran.com v4 | **100%** | generated | no |
| Bangla word meaning | `words[].translation.bn` | quran.com v4 | **100%** | generated | no |
| Part of speech | `words[].morphology.pos` | Corpus 2011 | **100%** | generated | no |
| **Lemma** | `words[].morphology.lemma` | Corpus 2011 | **74,122 — 95.7%** | generated | no |
| **Root** | `words[].morphology.root` | Corpus 2011 | **49,971 — 64.5%** | generated | no |
| Root frequency | `words[].morphology.rootCount` | computed in `pull.js:214` | field on 100% | generated | no |
| **Derivatives** | — | — | **absent** | — | — |
| **Grammar / morphological features** | — | — | **absent** | — | — |
| **Word ID** | — | — | **absent** | — | — |
| Ayah text (Uthmani) | `ayahs[].uthmaniText` | alquran.cloud | 100% | generated | no |
| Tajweed text | `ayahs[].tajweedText` | quran.com v4 | 100% | generated | no |
| Ayah translations | `ayahs[].translations{en,bn}` | alquran.cloud | 100% | generated | no |
| juz/page/ruku/manzil/hizbQuarter/sajda | `ayahs[].*` | alquran.cloud | 100% | generated | no |

**Nothing in this dataset is hand-maintained.** All 31 MB is regenerated by
`pull.js`.

**The root gap is not an error.** 35.5% of words genuinely have no root —
particles, pronouns, prepositions, the disconnected letters. `مِن` (728×) and
`فِى` (1,098×) are rootless by nature. **Root-based coverage can never exceed
64.5% of the Quran's words.**

## 6. Word IDs — **there are none**

**No id, no uuid, no global index on any word.** The only identifier a word
carries is `position`, **1-based and unique within its ayah only** (verified:
zero duplicate positions across all 77,429 words). Position 1 exists 6,236 times.

A word's full address **is** `(surahNumber, ayah, position)` — unique and
complete — but **that triple is never materialised as a string anywhere in the
codebase.** `buildUnitKey` has twelve constructors and none is `word`;
`UNIT_TYPES` has twelve entries and none is `"word"`.

The convention it *would* follow is set by the app's own unit keys
(`ayah:2:255`), so the natural form is `word:{surah}:{ayah}:{position}`. **It
does not exist today.**

## 7. Data-quality findings

**(a) Unicode normalisation is applied nowhere, and the dataset needs it.**
Eight surface-form pairs differ only in **combining-mark order**:

```
dataset:  REH, FATHA, BEH, SHADDA, KASRA
typed:    REH, FATHA, BEH, KASRA,  SHADDA
raw equality: False        NFC equality: True
```

**Any code identifying a word by its string must NFC-normalise first**, or it
will silently miss matches — including matches within this dataset itself.

**(b) `rootCount` is not sound arithmetic.** `canonicalRootKey()` (`pull.js:90`)
replaces a final **و**/**ي** with `#` **for counting only**, so the dataset
carries two root identities at once: the *displayed* root (1,642 distinct) and
the *counting* key (1,634). **19 roots disagree with their own in-file
frequency; 16 are exactly explained by this merge** (e.g. صلو occurs 99 times,
`rootCount` 124 = the merged صل# group). **Three are unexplained**: منن (30 vs
27), امم (118 vs 119), علو (71 vs 70). **It is a display figure — do not sum it.**

**(c) The English word-by-word gloss is contextual, not lexical.** **73.8% of
word occurrences (57,146 of 77,429)** have a surface form glossed more than one
way somewhere in the Quran; مِن alone has **72** distinct glosses (e.g. `"(are)
in"`, `"(is) at"`, `"(These are) among"`). This is by design upstream — the
gloss carries surrounding syntax so the glosses read as English in sequence.
**The gloss cannot serve as word identity.** Root (0.0% ambiguous) and lemma
(0.4%) can, and **lemma → root is a clean function: zero lemmas map to more than
one root.**

**(d) One malformed POS value** — Surah 37:130 position 3 has
`"pos": "yaAsiyna"`, a Buckwalter fragment rather than a tag, on a word
(إِلْ يَاسِينَ, "Elijah") the corpus tokenises differently from quran.com. 1 word in
77,429; renders harmlessly since `posLabel()` prints unknown atoms as-is. The
Bangla gloss on the same word carries a stray `"`.

**(e) No reverse index of any kind exists.** `app/js/ayah-renderer.js:152`
refers to a **`roots-index.json`** — searched the whole repository: **that file
does not exist.** The comment describes a planned artefact.

## 8. How Quran data is loaded

`app/js/quran-data.js` — the only reader. Every loader is **promise-cached at
module level**, so a repeat call is free and the browser's HTTP cache makes
repeat page loads free too.

| Function | Loads | When |
|---|---|---|
| `getSurah(n)` | one surah's full JSON | when that surah is opened |
| `getAyah(s, a)` | one ayah out of its surah | via `getSurah` |
| `getAyahRange(s, from, to)` | a contiguous run | via `getSurah` |
| `getSurahIndex()` | 114 names + ayah counts | **on the startup wave** |
| `getJuzIndex()` | 30 rows | on first Explore open |
| `getPageIndex()` | 604 rows | on first Explore open |
| `getHizbIndex()` | 60 rows | **only if a `hizb:` claim exists** |
| `getSearchIndex(lang)` | 6,236 rows for one language | **on first search only** |

**Every one of these obeys the load-speed contract (invariant I9).** Only
`getSurahIndex()` is on the startup path, and it is a bundled static file, not a
Firestore read. The lazy loaders are deliberate: the code comments name each as
an "on first use" fetch.

```
STARTUP (after first paint) — allowed: 3 Firestore reads
   userIndex · enrolments · bookmarks
The Quran study screen's own wave: tenantPeople, tenants/{id}, trackables,
   getSurahIndex()   ← the last is a static file, not Firestore
```

## 9. How a clicked word is identified and rendered

```
⚠ THERE IS NO WORD CLICK ANYWHERE IN THE APPLICATION.
```

**Verified three ways:**

1. No click handler anywhere references a word, `wbw`, a position, a root or a lemma. The only word-panel handlers are the three **toggles** (`data-qm-wbw`, `data-qm-roots`, `data-qm-derivatives` in `ayah-note-renderer.js:802`), which switch whole panels on and off.
2. `.wbw-word` carries **no pointer cursor** in any stylesheet — it is not presented as clickable.
3. `data-position="${w.position}"` **is** emitted (`ayah-renderer.js:135`) but nothing listens to it.

**How a word is rendered instead** — as a read-only chip inside a per-ayah strip:

```js
// app/js/ayah-renderer.js:135
return `<div class="wbw-word" data-position="${w.position}">
  <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  ${translit}
  ${glosses}
</div>`;
```

**Identification within a render pass** is purely positional: the panel maps over
`ayah.words[]` in array order. There is no lookup, no key, and no way to address
a word from outside its own ayah's render.

Full analysis in **10-WORD-BY-WORD-AND-ARABIC-DATA.md**.

## 10. Re-pull risk

`pull.js` regenerates all 114 files from three live upstream APIs. **If a re-pull
changes tokenisation, any stored word-level key would silently become wrong** —
and invariant I5 requires unit keys to be permanent. The dataset carries **no
per-word version stamp**; `manifest.json`'s `generatedAt` + `schemaVersion: 1`
are the only versioning available.

## 11. Relevant files

| File | Role |
|---|---|
| `tools/quran-data-pull/pull.js` | the merge script — the only place linguistic data enters the project |
| `tools/quran-data-pull/build-{juz,hizb,page}-index.js` | boundary tables, computed from real per-ayah fields |
| `tools/quran-data-pull/build-search-index.js` | the three search indexes |
| `app/js/quran-data.js` | the only reader (170 lines) |
| `app/js/ayah-renderer.js` | renders ayah text, translations and the three word panels |
| `app/js/quran-search.js` | search over the prebuilt indexes |
| `app/js/hifz-renderer.js` | a memorisation-specific renderer |
| `app/js/audio-player.js` | recitation transport (1,042 lines) — fetches archive.org |
