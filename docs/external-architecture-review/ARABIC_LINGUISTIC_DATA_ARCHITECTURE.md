# Document 8 — Arabic Linguistic Data Architecture

QuranRevival v08.00 · read-only analysis of what Arabic linguistic data
actually exists today

Document 7 covers the dataset's identity and counting model. **This document
covers what linguistic data exists, what renders it, and what is missing for
Levels 2 and 3.**

---

## 1. What exists today — the complete inventory

**Everything is inline on the word object. There is no lexicon file, no
dictionary, no morphology database and no Firestore collection for any of it.**

| Data | Field | Present on | % of 77,429 |
|---|---|---|---|
| Surface word | `words[].arabic` | 77,429 | **100%** |
| Transliteration | `words[].transliteration` | 77,429 | **100%** |
| English word meaning | `words[].translation.en` | 77,429 | **100%** |
| Bangla word meaning | `words[].translation.bn` | 77,429 | **100%** |
| Part of speech | `words[].morphology.pos` | 77,429 | **100%** |
| Lemma | `words[].morphology.lemma` | 74,122 | **95.7%** |
| Root | `words[].morphology.root` | 49,971 | **64.5%** |
| Root frequency | `words[].morphology.rootCount` | 77,429 (field) | 100% (but see §9) |
| **Derivatives** | — | — | **absent as data** |
| **Grammar / morphological features** | — | — | **absent** |
| **Contextual meanings** | — | — | **absent as structure** |
| **Dictionary links** | — | — | **absent** |

**Coverage is genuinely high for Level 1 and adequate for Level 2. Level 3 has
almost nothing.** That is the summary of this whole document.

---

## 2. Existing data schema

```
tools/quran-data-pull/output/surahs/surah_NNN.json
  ayahs[].words[] = {
    position:        number,             // 1-based within the ayah; NOT globally unique
    arabic:          string,             // fully vowelled surface form
    transliteration: string,             // Latin script only
    translation:     { en: string, bn: string },
    morphology: {
      root:      string,                 // Arabic letters, "" when none
      lemma:     string,                 // Arabic, vowelled, "" when none
      pos:       string,                 // e.g. "Noun", "Determiner + Adjective"
      rootCount: number                  // whole-Quran count for the root, 0 when none
    }
  }
```

Real word, unedited (`surah_001.json`, 1:1, position 3):

```json
{
  "position": 3,
  "arabic": "ٱلرَّحْمَـٰنِ",
  "transliteration": "l-raḥmāni",
  "translation": { "en": "the Most Gracious", "bn": "পরম করুণাময়" },
  "morphology": { "root": "رحم", "lemma": "رَّحْمَٰن", "pos": "Determiner + Adjective", "rootCount": 339 }
}
```

---

## 3. Source files

| File | Role |
|---|---|
| `tools/quran-data-pull/pull.js` | the merge script — the only place linguistic data enters this project |
| `tools/quran-data-pull/output/surahs/*.json` | 114 files, 27 MB, the data itself |
| `tools/quran-data-pull/output/manifest.json` | provenance + counts |
| `tools/quran-data-pull/pull.log` | the pull's own run log |

`pull.js` carries a Buckwalter→Arabic transliteration table (`BW2AR`,
`pull.js:55`) and a POS-code expansion table (`POS_LABELS`, `pull.js:67`),
because the Quranic Arabic Corpus ships in Buckwalter with coded tags. **The
conversion happens once, at pull time.** The app never sees Buckwalter.

---

## 4. Services and data providers

| Layer | Module | Notes |
|---|---|---|
| Data access | `app/js/quran-data.js` | `getSurah()`, `getAyah()`, `getAyahRange()`, `getSurahIndex()`, `getSearchIndex()`, `getJuzIndex()`, `getPageIndex()`, `getHizbIndex()`. Promise-cached per surah |
| Rendering | `app/js/ayah-renderer.js` | `renderWordByWordPanel()` :113, `renderRootPanel()` :156, `renderDerivativesPanel()` :178 |
| POS display | `app/js/labels.js:182` | `posLabel()` |
| Search | `app/js/quran-search.js` | text search over the prebuilt indexes |

**There is no "word service", no "root service", no "lemma service" and no
"morphology service".** The nearest thing to a service is `getSurah()`, which
returns one surah's whole tree; every consumer walks `ayahs[].words[]` itself.

`posLabel()` (`labels.js:182`) is worth quoting because it is the only piece of
linguistic *processing* in the app:

```js
export function posLabel(pos) {
  if (!pos) return "";
  return String(pos)
    .split("+")
    .map((part) => {
      const atom = part.trim();
      const english = POS_LABELS[atom];
      return english ? t(english) : atom; // unknown atoms print as they are
    })
    .join(" + ");
}
```

It splits a compound POS string on `+` and translates each atom — so the
compound structure **is** understood at display time, even though it is not
represented in the data as anything but a string.

---

## 5. Existing indexes

| Index | Exists? | Rows | Purpose |
|---|---|---|---|
| `surah-index.json` | Yes | 114 | names + ayah counts |
| `juz-index.json` | Yes | 30 | juz boundaries |
| `hizb-index.json` | Yes | 60 | hizb boundaries |
| `page-index.json` | Yes | 604 | mushaf page boundaries |
| `search-{en,ar,bn}.json` | Yes | 6,236 each | ayah-level text search |
| **`roots-index.json`** | **NO** | — | **referenced in a code comment; does not exist** |
| **lemma index** | **NO** | — | — |
| **surface-form index** | **NO** | — | — |
| **word-occurrence index** | **NO** | — | — |

**`roots-index.json` is named in `app/js/ayah-renderer.js:152` as the place a
root's cross-surah occurrence list "would" come from once built.** Searched the
whole repository: **the file does not exist.** The comment describes a planned
artefact. This is the single most significant missing index for Levels 2 and 3.

**Every existing index is ayah-level or coarser. There is no word-level index of
any kind.**

---

## 6. Can repeated words be grouped?

**Yes by computation, no by lookup** — and the reliability differs sharply by key
(measured in Document 7 §8):

| Group by | Distinct | Ambiguity | Verdict |
|---|---|---|---|
| Surface form (NFC) | **21,287** | — | reliable; **must NFC-normalise** first |
| Lemma | **4,832** | 0.4% of forms | **reliable** |
| Root | **1,642** | 0.0% of forms | **reliable** |
| English gloss | — | **73.8% of occurrences** | **unusable as identity** |

**Cost:** grouping requires walking all 114 files (27 MB). Not viable in the
browser under the load-speed contract. **A precomputed index is the missing
piece, not the data.**

---

## 7. Can root families be grouped?

**Yes, and the data is good.** 1,642 distinct roots covering 49,971 occurrences.
A worked example from the real files — the root ربب:

| | |
|---|---|
| Distinct surface forms sharing it | **175** |
| Total occurrences | **980** |
| Commonest forms | رَبِّ (80), رَبِّكَ (70), رَبِّى (61), رَبَّكَ (52), رَبِّهِمْ (47), رَبَّنَا (40), رَبُّكَ (38), رَبِّكُمَا (31) |

**This is exactly the Level 2 "how the root forms other Quranic words" data, and
it is already present.** It is computable today, it is simply not indexed.

Two caveats, both from Document 7 §9:

- **`rootCount` merges weak-final-radical roots** (`canonicalRootKey()`,
  `pull.js:90`): a root ending in و or ي is counted together with its
  counterpart. So صلو displays a count of 124 while occurring 99 times itself.
  **`rootCount` is a display figure, not an arithmetic primitive.**
- **35.5% of words have no root at all** — particles and pronouns genuinely have
  none. **Root-based coverage has a hard ceiling of 64.5%.**

---

## 8. Can lemmas be grouped?

**Yes, and this is the strongest grouping in the dataset.** 4,832 lemmas
covering 74,122 occurrences (95.7%).

Two properties that make it unusually clean, both verified:

1. **Lemma → root is a function.** **Zero** lemmas map to more than one root. So
   `form → lemma → root` is a genuine, non-ambiguous hierarchy.
2. **Lemma is far more efficient than root or form** for coverage: 72 lemmas
   cover 50% of the Quran's words, 625 cover 80% (Document 7 §18a).

Lemmas are stored **fully vowelled** (`ٱسْم`, `رَّحْمَٰن`), so the same NFC
normalisation caution applies to any lemma-keyed lookup.

---

## 9. Existing limitations

**(a) No word identifier.** `position` is unique only within an ayah. There is
no `word:{surah}:{ayah}:{position}` key and no id field. Document 7 §6–7.

**(b) No reverse index.** Nothing maps a form/lemma/root back to where it occurs.
Every such question costs a 27 MB scan.

**(c) `rootCount` is not sound arithmetic.** 19 roots disagree with their own
in-file frequency: 16 explained by the weak-final-radical merge, **3 genuinely
unexplained** (منن 30 vs 27, امم 118 vs 119, علو 71 vs 70).

**(d) Unicode normalisation is not applied anywhere.** 8 surface-form pairs in
this dataset differ only by combining-mark order; raw string equality fails on
them. Nothing in the app normalises.

**(e) The English gloss is contextual, not lexical.** 73.8% of occurrences have
a form glossed more than one way; مِن has 72 distinct glosses. **This is by
design in the upstream source and cannot be used as identity** — though it is
exactly right for its actual job, which is reading along.

**(f) POS is a flat string, not structured features.** 359 distinct strings
built from **46 atoms**, up to 5 atoms deep, and **54.2% of occurrences carry a
compound POS**. The compounding is visible only by splitting on `" + "`. There
is no case, number, gender, person, mood, voice, or verb form — see §10.

**(g) One malformed POS value.** Exactly one word in 77,429 has a POS that is
not a tag at all — Surah 37:130, position 3:

```json
{ "arabic": "إِلْ يَاسِينَ", "transliteration": "il yāsīna",
  "translation": { "en": "Elijah", "bn": "ইলিয়াসের\"" },
  "morphology": { "root": "", "lemma": "إِلْيَاس", "pos": "yaAsiyna", "rootCount": 0 } }
```

The POS field contains a Buckwalter fragment of the word itself rather than a
tag — a merge artefact on a word the corpus tokenises differently from
quran.com. It renders harmlessly (`posLabel()` prints unknown atoms as-is) and
affects 1 word. Noted for completeness; **it also shows the merge is not
perfect at token boundaries.** The Bangla gloss on the same word carries a stray
`"` character.

**(h) The word data is entirely outside the tenant model.** Static public files,
no Firestore, no rules, no per-tenant customisation. A tenant cannot correct a
gloss — unlike Asma ul Husna, where `asmaCollections` explicitly allows a tenant
to override a canonical Name's Bangla wording. **There is no equivalent
mechanism for word data**, and if teachers should be able to correct or add
glosses, that is a new collection.

**(i) The transliteration is Latin-only.** There is no Bangla-script
transliteration, and `renderWordByWordPanel()` therefore hides the
transliteration entirely in Bangla-only mode (`ayah-renderer.js:130`) rather
than show Latin to a Bangla reader.

---

## 10. Missing data required for deeper Arabic study

Mapped against the brief's three levels:

### Level 1 — Word-by-Word Meaning
**Data: complete.** 100% coverage of Arabic + transliteration + English + Bangla.

*Missing:* only a **frequency/occurrence index**, so a "learn the commonest
words" curriculum can be built and a coverage figure computed without loading
27 MB. The counts themselves are derivable from the existing files.

### Level 2 — Roots and Uses
**Data: mostly present, unindexed.**

| Need | Status |
|---|---|
| Root per word | **present**, 64.5% |
| Which forms share a root | **computable**, not indexed |
| How many times each root occurs | **present but unreliable** — `rootCount`, §7 |
| Where each root occurs | **missing** — no `roots-index.json` |
| Derivational relationship between forms | **missing** — no derivation data; only "shares a root" |

**"Derivatives" in the current UI is a misnomer worth flagging.**
`renderDerivativesPanel()` shows **POS + lemma for the same word**, not other
derived words. The panel named "derivatives" does not show derivatives. Real
derivational data — form I/II/III patterns, verbal nouns, participles as a
derivational tree — **does not exist in this dataset at all.**

### Level 3 — Arabic in Depth
**Data: largely absent.** Against the brief's own list:

| Required | Present? |
|---|---|
| Word meaning | **Yes** |
| Root | **Yes**, 64.5% |
| Lemma | **Yes**, 95.7% |
| Derivatives | **No** — root-sharing only, no derivational structure |
| **Grammar** | **No** — no case, number, gender, person, mood, voice, verb form |
| **Morphology (features)** | **No** — POS tags only, no feature bundles |
| **Different contextual meanings** | **Only implicitly** — the per-occurrence gloss varies (73.8%), but nothing labels *why*, and the variation is syntactic framing rather than distinct senses |
| **Dictionary study** | **No** — no lexicon of any kind |
| **Direct dictionary/source links** | **No** — searched: **zero** external links to corpus.quran.com, Lane's Lexicon, Almaany or any other reference anywhere in the codebase |

**The Quranic Arabic Corpus's own 2011 release does carry full morphological
features** — case, mood, voice, verb form, person/number/gender — and
`manifest.json` records that the pull read **128,011 morphology rows** for these
77,429 words. **`pull.js` extracts only root, lemma and POS from those rows and
discards the rest** (`pull.js:206–215`).

**This is the most actionable finding in this document: the Level 3 data was in
the source and was dropped at pull time.** Recovering it is a re-pull plus a
wider extraction in `pull.js`, not a hunt for a new data source. The file size
consequence would need measuring — the surah files are already 27 MB.

---

## 11. Existing word study UI

| Surface | File | What it shows |
|---|---|---|
| Word-by-Word panel | `renderWordByWordPanel()` `ayah-renderer.js:113` | Arabic + transliteration + gloss chips, per ayah |
| Root panel | `renderRootPanel()` `:156` | word + root + `rootCount` badge. **Filters out rootless words** |
| Derivatives panel | `renderDerivativesPanel()` `:178` | word + POS + lemma (§10 — not actually derivatives) |
| Arabic Language page | `app/arabic-study.html` | **not word study** — the generic topic renderer for the "Arabic Language" subject, claiming `topic:` units against `studied_arabic` |

Panels are selected per Approach by the trackable's `panels[]` array, assembled
in a fixed order (`ayah-renderer.js:206`):

```js
const PANEL_ORDER = ["text", "tajweed", "wordByWord", "root", "derivatives",
                     "notes", "reflection", "writing", "checklist"];
```

**Three important observations:**

1. **`root` and `derivatives` are fully built and wired but no Approach template
   declares them.** Grep of `APPROACH_TEMPLATES`: only `approach_04` declares
   `wordByWord`; **nothing declares `root` or `derivatives`**. They are reachable
   only through the reading screen's own panel toggles. A new Approach could
   turn them on by listing them in `panels[]` — no code change at all.

2. **The panel system is the intended extension point**, and the code says so in
   its own words (`ayah-renderer.js:194`): *"adding approach 31 is a row of data,
   not a build — only holds if this switch never grows per-Approach special
   cases."*

3. **Every panel is per-ayah.** Each takes an `ayah` object and renders its
   `words[]`. **There is no cross-ayah or whole-Quran word view anywhere**, which
   is precisely what a root family or a frequency list would need. That is a new
   kind of screen, not a variation of an existing one.

---

## 12. Summary for the reviewer

| Question | Answer |
|---|---|
| Surface word, transliteration, en + bn gloss, POS | **100% coverage, present** |
| Lemma | **95.7%**, clean, lemma→root is a function |
| Root | **64.5%**, clean; hard ceiling for root-based coverage |
| Derivatives | **absent** — root-sharing only; the "Derivatives" panel shows POS+lemma |
| Grammar / morphological features | **absent from the packaged data — but present in the upstream 2011 corpus and discarded by `pull.js`** |
| Contextual meanings | only implicitly, via 73.8%-variable per-occurrence glosses |
| Dictionary links | **none anywhere in the codebase** |
| Word-level indexes | **none** — `roots-index.json` is referenced but does not exist |
| Word study UI | three per-ayah panels; `root` and `derivatives` built but unused by any Approach |
| Tenant-level correction of word data | **not possible** — static public files |
