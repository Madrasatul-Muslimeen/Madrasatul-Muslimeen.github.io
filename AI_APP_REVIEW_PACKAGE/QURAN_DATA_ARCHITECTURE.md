# QURAN_DATA_ARCHITECTURE.md

How Qur'an data actually enters and moves through this application, traced
against the real code and the real files. Every number below was measured
from the shipped data, not estimated.

---

## 0. The one-line summary

**All Qur'an content was fetched once, on 1 August 2026, merged into 114
static JSON files, and committed to the repository. The running app never
calls a Qur'an API. It fetches one surah file at a time over plain HTTP.**

`tools/quran-data-pull/output/manifest.json` is the provenance record:

```json
{
  "generatedAt": "2026-08-01T02:04:14.922Z",
  "schemaVersion": 1,
  "range": { "start": 1, "end": 114 },
  "surahCount": 114,
  "totalAyahs": 6236,
  "totalWords": 77429,
  "wordsWithRoot": 49971,
  "morphology": { "chapterCount": 114, "rowCount": 128011 },
  "sources": [
    "alquran.cloud (Uthmani text, en.sahih, bn.bengali translations, juz/page/ruku/manzil/hizbQuarter/sajda metadata)",
    "api.quran.com v4 (tajweed-tagged text, word-by-word Arabic/transliteration/English/Bangla)",
    "GitHub mirror of the 2011 Quranic Arabic Corpus release (root/lemma/part-of-speech)"
  ],
  "failures": []
}
```

---

## 1. The pipeline

```
  DATA SOURCE                    IMPORT / API                     STORAGE
  ───────────                    ────────────                     ───────

  api.alquran.cloud          ┐
    /surah/N/quran-uthmani   │
    /surah/N/en.sahih        │
    /surah/N/bn.bengali      │
                             │
  api.quran.com/api/v4       │   tools/quran-data-pull/pull.js    tools/quran-data-pull/
    /quran/verses/           ├──▶  (Node, run ONCE, 1 Aug 2026) ─▶  output/surahs/
       uthmani_tajweed       │     · fetchSurah(n, morph)             surah_001.json
    /verses/by_chapter/N     │     · Buckwalter → Arabic              …
       ?words=true           │     · resolveWordKey()                 surah_114.json
       &language=en          │     · morphDataForWord()             (27 MB, in git)
       &language=bn          │     · JSON.stringify → disk
                             │
  raw.githubusercontent.com  │                                    + surah-index.json
    /alstat/QuranTree.jl     │                                    + juz/hizb/page-index.json
    quranic-corpus-          ┘                                    + search-{ar,en,bn}.json
    morphology-0.4.txt                                            + manifest.json
    (128,219 segment rows)

                                     ▲
                     ═══════════════ │ ═══════════════  BUILD TIME ENDS HERE
                                     │                  RUNTIME BEGINS
                                     ▼

  STORAGE                     DATA MODEL                  PROCESSING
  ───────                     ──────────                  ──────────

  GET /tools/quran-data-      the surah object is       app/js/ayah-renderer.js
    pull/output/surahs/       used AS-IS. There is        · renderArabicPanel()
    surah_002.json      ──▶   no ORM, no class,     ──▶   · renderTranslationPanel()
       (one whole surah,      no normalisation,           · renderWordByWordPanel()
        ~250 KB avg)          no re-indexing.             · renderRootPanel()
                              The parsed JSON             · renderDerivativesPanel()
  app/js/quran-data.js        IS the data model.          · renderLayoutA()
    getSurah(n)                                          app/js/labels.js
      → in-memory Map cache   surah                       · posLabel()  (code → word)
      → browser HTTP cache      .ayahs[]                 app/js/i18n.js
    getAyah(s, a)                .words[]                  · t(), num()
      = getSurah().find()          .morphology
                                                                    │
                                                                    ▼
                                                            UI DISPLAY
                                                            ──────────
                                            app/quranrevival.html
                                              · Read view — flow (all āyahs)
                                              · Read view — single āyah panels
                                              · Read view — Mushaf replica (different path)
                                            app/js/ayah-note-renderer.js
                                              · Note view — three collapsible fields
```

**Key architectural facts a reviewer should hold onto:**

1. **`app/js/quran-data.js` is the only module in the entire app that reads
   the Qur'an files.** Everything else receives already-parsed objects. This
   is clean and is worth preserving.
2. **The unit of transfer is one whole surah.** There is no per-āyah fetch and
   no per-word fetch. Opening 2:255 downloads all 286 āyahs of Al-Baqarah
   (~1.6 MB) — once, then cached in a `Map` for the session and by the
   browser for far longer.
3. **There is no client-side database of any kind for Qur'an content.**
   No IndexedDB, no SQLite/WASM, no search structure over words. Firestore
   holds *progress*, never Qur'an text — this is an explicit architectural
   rule.
4. **The parsed JSON is the data model.** No interface, no schema class, no
   validation on read.

---

## 2. Where each thing comes from

### 2.1 Arabic text — `api.alquran.cloud`, `/surah/{n}/quran-uthmani`

Stored verbatim at `ayahs[].uthmaniText`. Tanzil Uthmani script.

```jsonc
"uthmaniText": "﻿بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
```

Two real quirks the code has had to handle, both documented in
`app/js/ayah-renderer.js`:

- A **BOM (`﻿`)** leads some āyah-1 texts.
- **Āyah 1 of every surah except 9 carries the Bismillah as a literal
  prefix** of its own text, so drawing a decorative Bismillah heading above
  it printed the phrase twice. `stripLeadingBismillah()` removes it, and
  falls back to the original when nothing would be left (Sūrat al-Fātiḥa,
  whose āyah 1 *is* the Bismillah).

A **second, independent Arabic text** exists: the tajweed-tagged form from
quran.com, at `ayahs[].tajweedText`, using `<tajweed class=…>` markup.
`tajweedRawToSafeHtml()` escapes everything and then re-expands **only** that
exact tag whitelist — it never trusts raw HTML.

A **third** Arabic representation exists for the Mushaf view:
`mushaf/mushaf-madani-v2.json`, where each word is a private-use **glyph
character** bound to a per-page font. That path shares nothing with the
word-by-word path — see §6.

### 2.2 Translations — `api.alquran.cloud`

- English: `en.sahih` → `ayahs[].translations.en`
- Bangla: `bn.bengali` → `ayahs[].translations.bn`

**Exactly one translation per language.** Changing or adding a translator
means re-running `pull.js` and re-shipping 27 MB — there is no translator
selector, and the Reading view carries a deliberately **disabled**
`#translationChoiceSelect` marking where one would go.

### 2.3 Word-by-word — `api.quran.com/api/v4/verses/by_chapter`

Fetched **twice per surah**, once with `language=en` and once with
`language=bn`, then joined on `position`:

```js
const words = (wbwEnVerse ? wbwEnVerse.words : [])
  .filter((w) => w.char_type_name === "word")     // drops the āyah-end marker
  .map((w, i) => {
    const arabic  = w.text_uthmani || w.text || "";
    const bnWord  = bnWords.find((bw) => bw.position === w.position) || null;
    const wordKey = resolveWordKey(morph, verseKey, arabic, w.position);
    const morphData = morphDataForWord(morph, wordKey);
    return { position: w.position, arabic,
             transliteration: w.transliteration?.text ?? "",
             translation: { en: …, bn: … },
             morphology: morphData };
  });
```

Measured result: **77,429 words. Zero missing transliterations. Zero missing
English glosses. Zero missing Bangla glosses.** Word-level coverage is
complete.

### 2.4 Roots — the Quranic Arabic Corpus (2011, release 0.4)

Fetched as one 128,219-row tab-separated text file:

```
LOCATION      FORM        TAG   FEATURES
(1:1:1:1)     bi          P     PREFIX|bi+
(1:1:1:2)     somi        N     STEM|POS:N|LEM:{som|ROOT:smw|M|GEN
(1:1:2:1)     {ll~ahi     PN    STEM|POS:PN|LEM:{ll~ah|ROOT:Alh|GEN
```

Note the **four-part location** `(surah:ayah:word:segment)` — one word can be
several segments. `pull.js` groups by the first three parts, reads the
**first** `ROOT:` it finds among that word's segments, and converts
Buckwalter → Arabic through a 40-entry `BW2AR` table.

Measured: **49,971 of 77,429 words carry a root (64.5 %).** The 27,458 without
one are overwhelmingly legitimate — prepositions (4,987), preposition+pronoun
(3,847), relative pronouns (2,177), negative particles (1,251) and similar
function words genuinely have no triliteral root in this corpus.

**`rootCount`** is pre-computed at build time so the corpus never has to load
in the browser. It counts occurrences under a *canonicalised* key:

```js
function canonicalRootKey(rootBW) {
  const last = rootBW.slice(-1);
  if (last === "w" || last === "y") return rootBW.slice(0, -1) + "#";
  return rootBW;
}
```

This deliberately merges roots ending in **و** and **ي**. Measured effect:
**423 word instances (0.5 %) display a count for a merged root family rather
than for their own root.** Example — 2:3:5 ٱلصَّلَوٰةَ shows `صلو 124×`, but
صلو itself occurs 99 times; the 124 is صلو + صلي together.

### 2.5 Derivatives — **NOT SOURCED, NOT STORED, NOT DISPLAYED**

This is the single most important finding in this package.

The corpus **does** carry derived-form information — the Arabic verb Forms
II–XII, written as `(II)`, `(IV)`, `(VIII)` … inside the FEATURES column.
Measured in the source file: **8,977 words carry a verb Form**
— (IV) 4,585, (II) 1,615, (VIII) 1,161, (III) 497, (V) 466, (X) 459,
(VI) 106, (VII) 63, (XII) 13, (IX) 11, (XI) 1.

**`pull.js` discards every one of them.** `morphDataForWord()` keeps only
four fields:

```js
function morphDataForWord(morph, wordKey) {
  const segs = morph.idx[wordKey];
  if (!segs || !segs.length) return null;
  const tags = segs.map((s) => posLabel(s.tag)).join(" + ");
  let root = "", lemma = "", rootBW = "";
  segs.forEach((s) => {
    const feats = (s.features || "").split("|");
    const rf = feats.find((f) => f.startsWith("ROOT:"));
    const lf = feats.find((f) => f.startsWith("LEM:"));
    if (rf && !root)  { rootBW = rf.slice(5); root = bwToAr(rootBW); }
    if (lf && !lemma) { lemma = bwToAr(lf.slice(4)); }
  });
  const rootCount = rootBW && morph.rootIdx[canonicalRootKey(rootBW)]
    ? morph.rootIdx[canonicalRootKey(rootBW)].length : 0;
  return { root, lemma, pos: tags, rootCount };
}
```

The UI panel the app calls **"Derivatives"** therefore renders
**part-of-speech + lemma**, not a derived form:

```js
export function renderDerivativesPanel(ayah) {
  …
  <div class="root-word">{word.arabic}</div>
  <div class="root-pos">{posLabel(w.morphology.pos)}</div>
  {w.morphology.lemma && <div class="root-lemma">{w.morphology.lemma}</div>}
}
```

Its own doc-comment describes the intent honestly — *"its part of speech and
lemma"* — but the **user-facing label does not match what is shown**, in
either language (Bangla: `"Derivatives": "উদ্ভূত শব্দ"`, literally "derived
word", carrying a `// ?` uncertainty marker in the catalogue).

### 2.6 Lemmas — **yes, they exist**

`words[].morphology.lemma`, Buckwalter-converted from the corpus `LEM:` field.
Measured: **74,122 of 77,429 words (95.7 %)**; **4,832 distinct lemmas**.

Consistency is good: **no lemma maps to more than one root** across the whole
corpus as stored.

Lemmas are **displayed only inside the "Derivatives" panel** and are used for
nothing else — no lemma index, no lemma search, no "other words from this
lemma".

### 2.7 Morphology / grammar — reduced to one flat string

`words[].morphology.pos` is the corpus tags of every segment, joined with
`" + "`:

- `"Preposition + Noun"` (بِسْمِ)
- `"Verb + Pronoun"` (يَعْلَمُونَ)
- `"Resumption Particle + Preposition + Noun"` (فَبِأَىِّ)

Measured: **359 distinct POS strings, built from 46 distinct atoms.**
`app/js/labels.js` holds a **45-entry** `POS_LABELS` table (its own comment
says 46 — a one-off drift) and `posLabel()` splits on `+`, translates each
atom, and rejoins. That is what lets 45 entries express all 359 combinations,
in both languages. It is a genuinely good design.

**What the corpus has and the app does not keep** — measured from the source:

| Feature | In corpus | In app |
|---|---|---|
| Verb Form II–XII | 8,977 words | ❌ discarded |
| Aspect: PERF | 9,150 words | ❌ discarded |
| Aspect: IMPF | 8,330 words | ❌ discarded |
| Mood: IMPV (imperative) | 1,876 words | ❌ discarded |
| Voice: ACT / PASS | 2,974 / 1,691 segments | ❌ discarded |
| Attached pronoun identity (`PRON:1P`, `PRON:3MP`, …) | 20,146 words | ❌ only "+ Pronoun" survives |
| Person/gender/number (3MS, 2MP, 1P, …) | throughout | ❌ discarded |
| Case (NOM/ACC/GEN) | 31,914 segments | ❌ discarded |
| Definiteness (`Al+`, INDEF) | 17,049 segments | ❌ discarded |
| Prefix segments | 26,001 words | ❌ collapsed into the POS string |
| Suffix segments | 20,295 words | ❌ collapsed into the POS string |
| Mood marking (`MOOD:…`) | 2,748 segments | ❌ discarded |

**A concrete consequence:** the app can label a word "Imperative Verb" only
when the corpus TAG itself is `IMPN`, which happens for **exactly 2 words in
the entire Qur'an**. The 1,876 genuine imperatives carry TAG `V` with `IMPV`
in the *features*, so ٱقْرَأْ (96:1) and ٱهْدِنَا (1:6) both display as plain
**"Verb"** and **"Verb + Pronoun"**.

The reduction is **lossy and irreversible in the shipped data** — the app
cannot recover any of this without re-running `pull.js`. The corpus file is
128,219 rows for 77,429 words; roughly **50,000 segment rows are thrown away**.

---

## 3. How words are identified internally

### The answer: `Surah : Ayah : Word-position` — but only implicitly.

**There is no word ID field anywhere in the app's own data.** A word is
located by its **array position inside its āyah's `words[]` array**, plus a
`position` integer that mirrors that index (1-based, contiguous, matching
quran.com's own numbering with the āyah-end marker filtered out).

```jsonc
// tools/quran-data-pull/output/surahs/surah_001.json
{ "surahNumber": 1,
  "ayahs": [
    { "ayah": 1,
      "words": [
        { "position": 1, "arabic": "بِسْمِ", … },   // ← this word is 1:1:1
        { "position": 2, "arabic": "ٱللَّهِ", … }   // ← this word is 1:1:2
      ] } ] }
```

So the *effective* identifier is the tuple **`(surahNumber, ayah, position)`**,
never materialised as a string, never stored, never used as a key.

The only place `position` reaches the DOM is a data attribute nothing reads:

```js
// app/js/ayah-renderer.js
`<div class="wbw-word" data-position="${w.position}">…`
`<div class="root-row"  data-position="${w.position}">…`
```

A repo-wide search for consumers of `data-position` or `.wbw-word` finds
**only the two CSS rules that style them**. There is no click handler, no
selection, no lookup.

### Three ID systems exist in the project, and only one is the app's own

| System | Written as | Where | Used by |
|---|---|---|---|
| **quran.com word position** | `words[].position`, an int | `output/surahs/*.json` | the app's word-by-word / root / derivatives panels |
| **Quranic Arabic Corpus location** | `"(2:255:1:2)"` — surah:ayah:**word:segment** | `pull.js` at build time only | discarded after the merge |
| **QUL mushaf glyph location** | `"2:255:1"` — surah:ayah:word | `mushaf/mushaf-madani-v2.json` | the Mushaf page renderer only |

**These are never joined.** See §6.

### The app's *own* identifier grammar — and what it lacks

`app/js/unit-keys.js` defines every addressable unit in the tracking model:

```js
export const UNIT_TYPES = Object.freeze([
  "ayah", "range", "surah", "page", "ruku", "juz", "hizb", "rub", "manzil",
  "hadith", "topic", "name",
]);

export const buildUnitKey = Object.freeze({
  ayah:  (surah, ayah)          => `ayah:${surah}:${ayah}`,
  range: (surah, from, to)      => `range:${surah}:${from}-${to}`,
  surah: (surah)                => `surah:${surah}`,
  page:  (edition, pageNum)     => `page:${edition}:${pageNum}`,
  ruku:  (surah, ruku)          => `ruku:${surah}:${ruku}`,
  juz:   (juz)                  => `juz:${juz}`,
  hizb:  (hizb)                 => `hizb:${hizb}`,
  …
});
```

**There is no `word:` unit type.** The smallest thing this application can
track, claim, confirm, bookmark, note, or report on is one **āyah**.
A word is not an entity in this system — it is a cell in a rendered strip.

That is the structural fact behind most of the findings in
`WORD_STUDY_SYSTEM_AUDIT.md`.

---

## 4. Runtime processing, step by step

`getSurah()` — `app/js/quran-data.js`, the only file that touches the store:

```js
const BASE_URL = "/tools/quran-data-pull/output";
const surahCache = new Map();          // surahNumber -> Promise<surah data>

export async function getSurah(surahNumber) {
  if (!surahCache.has(surahNumber)) {
    surahCache.set(surahNumber,
      fetch(`${BASE_URL}/surahs/surah_${String(surahNumber).padStart(3,"0")}.json`)
        .then((res) => { if (!res.ok) throw new Error(…); return res.json(); })
        .catch((err) => { surahCache.delete(surahNumber); throw err; }));
  }
  return surahCache.get(surahNumber);
}
```

Two cache layers (in-memory `Map` for the session, the browser's HTTP cache
across sessions) and a **failed load is never cached**, so a retry can
succeed. `getAyah()` is `getSurah().ayahs.find(…)` — a linear scan, but over
at most 286 entries.

Then, in `app/quranrevival.html`, whichever panels the chosen Approach
declares are assembled:

```js
const PANEL_ORDER = ["text","tajweed","wordByWord","root","derivatives",
                     "notes","reflection","writing","checklist"];

export function renderLayoutA(ayah, panels, opts = {}) {
  return PANEL_ORDER.filter((p) => panels.includes(p))
    .map((p) => PANEL_RENDERERS[p]?.(ayah, opts) ?? "")
    .filter(Boolean).join("\n");
}
```

`panels[]` comes from the Approach's own row in `app/js/catalogue-data.js` —
e.g. Approach 04 "Reading — Word-by-Word Meaning" declares
`panels: ["text", "wordByWord"]`. Three checkboxes in Study options
(`#wbwShowToggle`, `#rootsToggle`, `#derivativesToggle`) **add** panels on top
of whatever the Approach asks for, so an Approach still means what it always
meant.

**No processing happens between the JSON and the HTML.** No normalisation, no
enrichment, no derivation, no caching of computed values. `posLabel()` — a
string split, a table lookup, a rejoin — is the only transformation applied to
morphology at render time.

---

## 5. Load-speed contract (why the architecture is shaped this way)

From the Architecture document, binding:

| Moment | Allowed | Never |
|---|---|---|
| Startup, before first paint | local cache only | any network wait |
| Startup, after first paint | 3 reads: `userIndex`, `enrolments`, `bookmarks` | any module's study data |
| Landing page | card information only | records, curriculum, sessions |
| Records | one chunk per surah or subject | all records for a person |
| Screensaver, About, resources | on first use | at startup |

The Qur'an study screen is held at **6 sequential round trips / 9 Firestore
calls** and re-measured with `tools/perf/measure.mjs` every round. **Nothing
joins the startup path without being flagged to the owner first**
(invariant I9).

Any proposal that adds a client-side word index, a root index, or a
morphology database has to answer this contract explicitly. The existing
pattern for that answer is well established and worth copying: the search
indexes, the boundary tables, the mushaf layout and the reciter timing map are
**all fetched on first use, never at startup, and cached**.

---

## 6. The two word-ID systems, and why they do not meet

`mushaf/mushaf-madani-v2.json` addresses words as `"surah:ayah:word"`:

```jsonc
{ "line": 2, "type": "ayah", "centered": true,
  "words": [ { "loc": "1:1:1", "g": "ﱁ" }, { "loc": "1:1:2", "g": "ﱂ" },
             { "loc": "1:1:3", "g": "ﱃ" }, { "loc": "1:1:4", "g": "ﱄ" },
             { "loc": "1:1:5", "g": "ﱅ" } ] }
```

That is an explicit word ID — the thing the word-by-word data lacks. But the
two numbering schemes do not line up, measured across all 6,236 āyahs:

- In **6,233 āyahs** the mushaf has exactly **one more** word than `words[]`
  — the āyah-end marker, which the mushaf treats as a word and `pull.js`
  filters out. Positions 1…n align perfectly.
- In **3 āyahs** they differ by **two**: **2:181, 8:6, 13:37**. In each,
  quran.com (and the corpus) treat **بَعْدَ مَا** as a single word while the
  printed mushaf sets it as two. Every position after that point is shifted.

So a join is *nearly* free and **not quite** free. A reviewer proposing
"tap a word in the Mushaf view to open Word Study" should know that those
three āyahs need an explicit exception — and that nothing in the app attempts
the join today.

---

## 7. Worked example — the complete path for one word

**بِسْمِ, the first word of the Qur'an.**

**(1) Source, alquran.cloud** → `uthmaniText` for 1:1.

**(2) Source, quran.com** `verses/by_chapter/1?words=true&language=en` →
`{position: 1, text_uthmani: "بِسْمِ", transliteration: {text: "bis'mi"},
translation: {text: "In (the) name"}}`, and the same call with `language=bn`
→ `"নামে"`.

**(3) Source, Quranic Arabic Corpus** — two rows, because it is two segments:

```
(1:1:1:1)   bi     P   PREFIX|bi+
(1:1:1:2)   somi   N   STEM|POS:N|LEM:{som|ROOT:smw|M|GEN
```

**(4) `pull.js` merges them.** `posLabel("P") + " + " + posLabel("N")` →
`"Preposition + Noun"`. First `ROOT:` is `smw` → `bwToAr` → `سمو`. First
`LEM:` is `{som` → `ٱسْم`. `canonicalRootKey("smw")` → `"sm#"`, whose bucket
holds 381 occurrences. **Dropped on the floor:** `PREFIX|bi+` as a
*structure*, `M` (masculine), `GEN` (genitive).

**(5) Stored** in `surah_001.json`:

```json
{ "position": 1,
  "arabic": "بِسْمِ",
  "transliteration": "bis'mi",
  "translation": { "en": "In (the) name", "bn": "নামে" },
  "morphology": { "root": "سمو", "lemma": "ٱسْم",
                  "pos": "Preposition + Noun", "rootCount": 381 } }
```

**(6) Fetched** by `getSurah(1)`, cached, `getAyah(1,1)` finds the āyah.

**(7) Rendered**, if the reader has ticked all three panels:

| Panel | Output |
|---|---|
| Word by Word | `بِسْمِ` / `bis'mi` / `In (the) name` (+ `নামে` if Bangla is on) |
| Root | `بِسْمِ` and `سمو 381×` |
| Derivatives | `بِسْمِ`, `Preposition + Noun`, `ٱسْم` |

**(8) Recorded:** nothing. There is no way to claim, note, bookmark, collect,
or report on this word. The smallest trackable unit is `ayah:1:1`.
