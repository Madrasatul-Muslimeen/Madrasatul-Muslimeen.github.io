# DATA_GAPS_AND_INCONSISTENCIES.md

**Findings only. Nothing was fixed.** Every count in this document was
measured against the shipped data (and, where stated, against a freshly
downloaded copy of the upstream Quranic Arabic Corpus file used to build it),
not estimated.

Findings are numbered `G-nn` so a reviewer can reference them.

---

## Summary

| # | Finding | Severity |
|---|---|---|
| G-01 | Derived-form (verb Form II–XII) data discarded at build — 8,977 words | **High** |
| G-02 | The panel labelled "Derivatives" does not show derivatives | **High** |
| G-03 | ~50,000 corpus segment rows discarded: tense, mood, voice, person, gender, number, case, definiteness | **High** |
| G-04 | 710 word instances carry morphology resolved from the wrong homograph | **High** |
| G-05 | "Imperative Verb" fires for 2 words in the Qur'an; 1,876 real imperatives print as "Verb" | **High** |
| G-06 | Attached-pronoun identity discarded — 20,146 words | **High** |
| G-07 | Prefix/suffix structure collapsed into one string — 26,001 / 20,295 words | Medium |
| G-08 | `roots-index.json` is referenced in a code comment and does not exist | Medium |
| G-09 | `rootCount` is a merged-root-family count for 423 word instances | Medium |
| G-10 | Two unjoined word-ID systems; 3 āyahs where they cannot be aligned | Medium |
| G-11 | `data-position` is emitted on every word chip and read by nothing | Medium |
| G-12 | `wbwLangMode` is session-only and silently resets on every load | Medium |
| G-13 | No Bangla-script transliteration; the Latin line is hidden in Bangla-only mode | Medium |
| G-14 | No word-level audio or timing anywhere | Medium |
| G-15 | One corrupt POS value in the data (37:130) | Low |
| G-16 | `POS_LABELS` has 45 entries; its own comment says 46 | Low |
| G-17 | Rootless words silently vanish from the Root panel | Low |
| G-18 | Field naming differs between the surah file and the surah index | Low |
| G-19 | A dead Bangla translation key kept deliberately, and one flagged `// ?` | Low |
| G-20 | 3 āyahs where one "word" is two orthographic words | Low |
| G-21 | Approach 04's own stated measure is word-level; the data model is āyah-level | **High** (design) |
| G-22 | The word-by-word panels are switched off entirely in Mushaf view | Medium |
| G-23 | 27 MB of Qur'an data is committed to git and served from GitHub Pages | Low (noted, not a defect) |

---

## Missing Qur'an words

**None. This is a genuine strength.** Measured across all 114 files:

| | |
|---|---|
| Āyahs | **6,236** — matches the canonical count |
| Āyahs with an empty `words[]` | **0** |
| Words | **77,429** — matches the Quranic Arabic Corpus word count exactly |
| Words missing `arabic` | **0** |
| Words missing `transliteration` | **0** |
| Words missing an English gloss | **0** |
| Words missing a **Bangla** gloss | **0** |
| Words missing a `morphology` object | **0** |

Word coverage is complete. Every gap below is about **what is known about a
word**, never about a missing word.

---

## Missing roots

**49,971 of 77,429 words (64.5 %) carry a root; 27,458 do not.**

This is **almost entirely correct, not a gap**. The words without a root are
function words that genuinely have no triliteral root in this corpus:

| POS of rootless word | Count |
|---|---|
| Preposition | 4,987 |
| Preposition + Pronoun | 3,847 |
| Relative Pronoun | 2,177 |
| Negative Particle | 1,251 |
| Conjunction + Negative Particle | 867 |
| Accusative Particle + Pronoun | 863 |
| Pronoun | 840 |
| Demonstrative Pronoun | 773 |
| Conjunction | 742 |
| Preposition + Relative Pronoun | 739 |
| Accusative Particle | 710 |
| **Proper Noun** | **624** |

The last row is the only one worth a second look: 624 proper nouns have no
root. Many are genuinely foreign names (Ibrāhīm, Isrā'īl), so the corpus is
right; but the app gives the reader no way to tell "no root exists" from
"no root was found". The chip is simply absent (see **G-17**).

**Verified against the upstream corpus:** the app's stored roots agree with a
fresh re-derivation from the source file in **77,423 of 77,429** cases. The
6 disagreements are covered by **G-04**.

---

## Missing lemmas

**74,122 of 77,429 words (95.7 %) carry a lemma; 3,307 do not.**

Cross-checked against the upstream corpus: **the app is missing zero lemmas
that the corpus supplies, and invents zero that it does not.** The 3,307
absences are absences in the source.

Internal consistency is good: across the whole Qur'an, **no lemma maps to more
than one root** — 4,832 distinct lemmas, all cleanly rooted.

**But 352 words carry the wrong lemma** — see G-04.

---

## G-01 · Derived-form data discarded at build time — **High**

The Quranic Arabic Corpus marks Arabic verb Forms II–XII. Measured in the
upstream file:

| Form | Words |
|---|---|
| (IV) | 4,585 |
| (II) | 1,615 |
| (VIII) | 1,161 |
| (III) | 497 |
| (V) | 466 |
| (X) | 459 |
| (VI) | 106 |
| (VII) | 63 |
| (XII) | 13 |
| (IX) | 11 |
| (XI) | 1 |
| **Total** | **8,977 words** |

`morphDataForWord()` in `tools/quran-data-pull/pull.js` never reads the Form.
It is absent from the shipped data and unrecoverable without re-running the
pull.

---

## G-02 · The "Derivatives" panel does not show derivatives — **High**

`renderDerivativesPanel()` renders **part of speech + lemma**. The user-facing
label is "Derivatives" / "উদ্ভূত শব্দ" ("derived word"). Those are different
linguistic objects. The Bangla catalogue entry even carries an uncertainty
marker:

```js
"Derivatives": "উদ্ভূত শব্দ", // ?
```

This is a **linguistically inaccurate UI label**, in both languages, on a
teaching application — which makes it more consequential than a cosmetic
naming issue.

---

## G-03 · ~50,000 corpus segment rows discarded — **High**

The corpus is **128,219 segment rows** describing **77,429 words**. The app
keeps four fields per word. Measured, what is thrown away:

| Feature | Present in source | In app |
|---|---|---|
| Verb Form (II–XII) | 8,977 words | ❌ |
| Aspect PERF (past) | 9,150 words | ❌ |
| Aspect IMPF (present) | 8,330 words | ❌ |
| Mood IMPV (imperative) | 1,876 words | ❌ |
| Voice ACT / PASS | 2,974 / 1,691 segments | ❌ |
| Attached-pronoun identity | 20,146 words | ❌ |
| Person·gender·number | throughout | ❌ |
| Case NOM/ACC/GEN | 31,914 segments | ❌ |
| Definiteness (`Al+`, INDEF) | 17,049 segments | ❌ |
| `MOOD:` marking | 2,748 segments | ❌ |
| PREFIX segments | 26,001 words | ❌ (collapsed) |
| SUFFIX segments | 20,295 words | ❌ (collapsed) |

**Every one of these is available from the same file the app already
downloads at build time.** No new source is needed to recover them.

---

## G-04 · 710 word instances carry morphology from the wrong homograph — **High**

`pull.js` matches a quran.com word to a corpus word by **normalised form**:

```js
function normalizeArabicForMatch(s) {
  return (s || "")
    .replace(/[ً-ْٰۖ-ۭ]/g, "")     // strip ALL diacritics
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "").trim();
}
```

Stripping every diacritic makes **مَن** ("who") and **مِن** ("from")
identical, and **أَن** and **إِنّ** identical. `resolveWordKey()` then scans
the āyah's words in order and takes the **first** normalised match — which is
frequently the wrong one.

**Measured by re-deriving every word from the upstream corpus at its own
`(surah:ayah:position)` and comparing:**

| | |
|---|---|
| Words whose stored POS differs from the true one | **689** |
| Words whose stored lemma differs | **352** |
| Words whose stored root differs | **6** |
| **Distinct word instances wrong in at least one field** | **710 (0.92 %)** |
| Distinct surface forms affected | **115** |

Most-affected surface forms: **رَبِّ** (54), **مَن** (51), **إِنَّ** (49),
**أَن** (44), **يَـٰقَوْمِ** (38), **إِن** (29), **مَا** (28), **وَلَا** (25),
**وَمَا** (23), **إِلَىَّ** (22), **إِلَّا** (16), **مِن** (16).

Most-common wrong-POS pairs (stored → true):

| Stored | True | Count |
|---|---|---|
| Noun | Noun + Pronoun | 87 |
| Preposition | Relative Pronoun | 77 |
| Relative Pronoun | Preposition | 65 |
| Vocative Particle + Noun | Vocative Particle + Noun + Pronoun | 60 |
| Preposition | Preposition + Pronoun | 40 |
| Subordinating Conj. | Accusative Particle | 32 |

**Three concrete, teaching-relevant errors:**

- **2:9:6 يَخْدَعُونَ** — stored lemma **يُخَٰدِعُ** (Form III, "to try to
  deceive"); the true lemma is **يَخْدَعُ** (Form I). Two different verbs.
- **2:102:74 يَعْلَمُونَ** — stored lemma **عَلَّمَ** (Form II, "he taught");
  the true lemma is **عَلِمَ** ("he knew"). A meaning error a student would
  learn wrong.
- **2:34:9 أَبَىٰ** — stored root **ابي**, corpus root **Aby**→**ابي** is in
  fact correct here, but its `rootCount` reads **130** where the exact root
  occurs **13** times (a G-09 case compounding a G-04 neighbourhood).

**Note the irony:** the positional fallback `resolveWordKey()` treats as a
last resort is, measured, **exactly right in 100 % of cases** — 0 of 77,429
positions failed to find a corpus word. The clever normalise-and-match step
is the *only* source of these errors. Removing it would remove all 710.

---

## G-05 · "Imperative Verb" is effectively never shown — **High**

The corpus marks imperatives two ways: TAG `IMPN` (imperative **noun**), and
TAG `V` with `IMPV` in the *features*. `pull.js` only reads the TAG.

| | Words |
|---|---|
| Tagged `IMPN` → labelled "Imperative Verb" | **2** |
| TAG `V` + feature `IMPV` → labelled "Verb" | **1,876** |

So **ٱقْرَأْ** (96:1:1, "Read!") displays as **"Verb"** and **ٱهْدِنَا**
(1:6:1, "Guide us!") as **"Verb + Pronoun"**. The imperative — arguably the
single most pedagogically important verb mood in the Qur'an — is invisible
for 1,876 of 1,878 cases.

Likewise **all 19,356 verbs** show no tense: 9,150 perfects and 8,330
imperfects are all simply "Verb".

---

## G-06 · Attached-pronoun identity discarded — **High**

**20,146 words carry an attached pronoun.** The corpus records exactly which
(`PRON:1P`, `PRON:3MP`, `PRON:2MS`, `PRON:3FS`…). The app keeps only the word
"Pronoun" inside the POS string.

| Word | Real attached pronoun | App shows |
|---|---|---|
| يَعْلَمُونَ | 3MP — *they* | Verb + Pronoun |
| ٱهْدِنَا | 1P — *us* | Verb + Pronoun |
| بَدَّلَهُۥ | 3MS — *it/him* | Verb + Pronoun |
| سَمِعَهُۥ | 3MS — *it/him* | Verb + Pronoun |

Four different meanings, one identical label. For Approach 04
("Word-by-Word Meaning") this is close to the centre of the point.

---

## G-07 · Prefix / suffix structure collapsed — Medium

**26,001 words carry a prefix segment; 20,295 carry a suffix.** The corpus
marks them explicitly (`PREFIX|bi+`, `PREFIX|Al+`, `PREFIX|w:P+`,
`PREFIX|f:REM+`, `SUFFIX|PRON:1P`). `pull.js` joins the segment *tags* into
one string and drops the segmentation.

Worst measured case — **55:13:1 فَبِأَىِّ**, three segments
(`fa` REM + `bi` P + `>aY~i` N), displayed as the single string
`"Resumption Particle + Preposition + Noun"`. Nothing tells the reader which
letters of the visible Arabic are the fa-, which the bi-, and where the stem
begins. **The word is never segmented on screen anywhere in the app.**

---

## G-08 · `roots-index.json` does not exist — Medium

`renderRootPanel()`'s own doc-comment promises it:

> *"Per-word occurrence lists across surahs aren't loaded here (would mean
> loading more than the one open surah) — see roots-index.json (a bounded,
> separate static file) for that lookup once built."*

There is **no such file** in `tools/quran-data-pull/output/`, and **no builder
for it** in `tools/quran-data-pull/`. The design exists only as a comment. The
consequence is that `rootCount` shows "381×" with no way to see those 381
places — a number that invites a tap and does nothing.

---

## G-09 · `rootCount` counts a merged root family — Medium

```js
function canonicalRootKey(rootBW) {
  const last = rootBW.slice(-1);
  if (last === "w" || last === "y") return rootBW.slice(0, -1) + "#";
  return rootBW;
}
```

Roots ending in **و** and **ي** are counted together. Measured: **423 word
instances (0.5 %) display a count that is not their own root's count.**

| Location | Word | Root shown | Count shown | True count for that root |
|---|---|---|---|---|
| 2:3:5 | ٱلصَّلَوٰةَ | صلو | **124×** | 99 |
| 2:34:9 | أَبَىٰ | ابي | **130×** | 13 |
| 2:44:4 | وَتَنسَوْنَ | نسي | **104×** | 45 |
| 2:45:3 | وَٱلصَّلَوٰةِ | صلو | **124×** | 99 |

The behaviour was inherited verbatim from the legacy v06 app. It may even be
*desirable* for teaching (weak-root families are related), but the UI presents
it as the count of the root it displays, which is not what it is. It is
undocumented in the UI either way.

Everything else about `rootCount` is consistent: **no root anywhere carries
two different counts.**

---

## G-10 · Two unjoined word-ID systems — Medium

| System | Form | Where | Consumers |
|---|---|---|---|
| quran.com position | `words[].position` (int) | `output/surahs/*.json` | the word-by-word / root / derivatives panels |
| Corpus location | `"(2:255:1:2)"` surah:ayah:word:segment | `pull.js` only | discarded after merge |
| QUL mushaf loc | `"2:255:1"` surah:ayah:word | `mushaf/mushaf-madani-v2.json` | the Mushaf page renderer only |

The mushaf system is the only one that is an actual identifier — and it is the
one the Word Study code never sees.

Alignment, measured across all 6,236 āyahs:

- **6,233 āyahs**: mushaf has exactly one more word (the āyah-end marker).
  Positions 1…n align exactly.
- **3 āyahs — 2:181, 8:6, 13:37**: mushaf has **two** more. In each,
  quran.com and the corpus treat **بَعْدَ مَا** as one word while the printed
  mushaf sets it as two. Every position after that point is shifted by one.

So "tap a word in the Mushaf to open its Word Study" is *nearly* free and
needs a documented exception for exactly three āyahs.

---

## G-11 · `data-position` is emitted and read by nothing — Medium

```js
`<div class="wbw-word" data-position="${w.position}">…`
`<div class="root-row"  data-position="${w.position}">…`
```

A repo-wide search for `data-position`, `.wbw-word` and `.root-row` outside
`ayah-renderer.js` finds **only the two CSS rules that style them**. No click
handler, no selection, no lookup, no popup.

**This is "data that exists but is not connected to the UI" in the most literal
sense:** the hook for word interaction was built and never used. Whether it was
intended for a future feature or is a leftover, nothing in the codebase says.

---

## G-12 · `wbwLangMode` is session-only and silently resets — Medium

```js
// app/quranrevival.html L4334
let wbwLangMode = "auto";   // "auto" | "en" | "bn" | "both"
```

The `#wbwLangSelect` control offers *Follow translation language / English
only / বাংলা only / English + বাংলা*. The choice is:

- **not** in `app/js/prefs.js` — there is no `mm_*` key for it;
- **not** in `captureQuranBookmarkSettings()` / `captureNoteBookmarkSettings()`,
  which do save `wbwOn`, `rootsOn`, `derivativesOn`, `tajweedOn`, `mushafOn`.

So it resets to `"auto"` on every page load, while every control beside it
persists. This is the exact shape of a defect this project has already
recorded once before (a session-only `let` gating a control the user had to
re-set every time).

---

## G-13 · No Bangla-script transliteration — Medium

The pulled data has only the Latin transliteration. `renderWordByWordPanel()`
therefore suppresses the whole line in Bangla-only mode:

```js
const translit = langs.includes("en")
  ? `<div class="wbw-translit">${escapeHtml(w.transliteration)}</div>`
  : "";
```

The reasoning is recorded and sound — a Latin pronunciation aid is unreadable
to precisely the reader "বাংলা only" is for. The effect is that a Bangla-only
reader has **no pronunciation aid at all**, on an app whose primary audience is
Bangla-speaking.

---

## G-14 · No word-level audio — Medium

`gtaf_bangla_timestamps.json` provides `{verse_key, timestamp_from,
timestamp_to}` — **āyah boundaries only**. No per-word timing, no per-word
audio file, no word highlight during recitation, and no word chip is clickable
or playable. quran.com's v4 API can return per-word `audio_url` and segments;
that field is not requested by `pull.js`.

---

## G-15 · One corrupt POS value in the shipped data — Low

**37:130, word 3 — إِلْ يَاسِينَ** has `"pos": "yaAsiyna"`. A transliteration
fragment has leaked into the part-of-speech field upstream. It is the **only**
one of the 46 POS atoms that is not a real tag.

`posLabel()` handles it gracefully (unknown atoms print unchanged), so the
screen shows the literal string `yaAsiyna` where a part of speech should be.
`labels.js` even documents its existence: *"the data has one such glitch
entry, and printing it beats inventing a meaning for it."* Correct handling,
uncorrected data.

---

## G-16 · `POS_LABELS` count drift — Low

The table's own comment says *"The 46 atoms every part-of-speech string in the
pulled data is built from"*. The table has **45** entries. Measured, the data
contains **46** distinct atoms — the 46th being the `yaAsiyna` glitch of G-15.
So the comment is arguably counting the glitch. Harmless, but confusing to the
next reader.

---

## G-17 · Rootless words vanish from the Root panel — Low

```js
const rows = ayah.words.filter((w) => w.morphology?.root).map(…)
```

For an āyah where a third of the words are particles, the Root strip has a
third fewer chips than the Word-by-Word strip and they no longer line up. The
reader is given no indication that words were removed, nor why. If **every**
word in an āyah is rootless the panel falls back to *"No morphology data for
this ayah"* — which is inaccurate: there is morphology, just no roots.

---

## G-18 · Field naming differs between two files describing the same thing — Low

| `surah_NNN.json` | `surah-index.json` |
|---|---|
| `surahNameArabic` | `nameArabic` |
| `surahNameEnglish` | `nameEnglish` |
| `surahNameTranslation` | `nameTranslation` |

Same data, two names, produced by the same build. Any code reading both has to
know which is which.

---

## G-19 · Translation-catalogue debris — Low

In `app/js/i18n/bn.js`:

- A key kept deliberately after the tick that used it was renamed —
  documented as *"Kept, unused: … same 'never delete a translation' rule"*.
  Defensible, but it means the catalogue does not describe the current UI.
- `"Derivatives": "উদ্ভূত শব্দ", // ?` — a translation the author was not
  confident in, still shipping. See G-02.

The project also records **15 pre-existing duplicate keys** in `bn.js`. In a
JavaScript object literal the later key silently wins, so a duplicate is a
translation that looks present and may not be the one displayed.

---

## G-20 · Three āyahs where one "word" is two words — Low

**2:181, 8:6, 13:37** each contain a `words[]` entry whose `arabic` is
**"بَعْدَ مَا"** — two orthographic words in one chip, with one merged
transliteration (`baʿdamā`), one merged gloss ("after what") and a POS string
of `"Time Adverb + Subordinating Conj."` covering both.

This comes from the upstream source (quran.com and the corpus agree with each
other and differ from the printed mushaf), so it is not an error introduced
here — but it is the reason the mushaf alignment of G-10 breaks in exactly
these three places.

---

## G-21 · The pedagogy already asks for word-level data the model cannot hold — **High (design)**

Approach 04, in `app/js/catalogue-data.js`, states its own success measure:

> *"How many of the words in the assigned portion you can translate without
> the panel."*

That is a **word-level** measure. `unit-keys.js` has no `word:` unit type, so
`records.entries` cannot key one, and the Mastery Wheel, Explore roll-up and
Monitor have no way to express it. The claim that gets recorded is a single
status against the whole āyah.

Similarly, Approach 06 "Language Learning (Basic Grammar)" declares
`panels: ["text", "notes"]` — a free-text box — while a fully-populated
morphology panel already exists in the same renderer and is simply not offered
to it.

**This is the most consequential finding for anyone planning a real Word Study
feature:** the gap is not that the UI is thin, it is that a word is not an
entity in this system.

---

## G-22 · Word-by-word is disabled in Mushaf view — Medium

```js
[tajweedToggle, wbwShowToggle, rootsToggle, derivativesToggle,
 trEnToggle, trBnToggle].forEach((el) => { el.disabled = isMushaf; });
```

With a note on screen: *"Mushaf view shows the printed page, so the other
reading choices do not apply while it is on."* Technically necessary today
(the mushaf renders glyphs, not text), but it means the only view with real
word IDs (G-10) is the only view with no word data.

---

## G-23 · 27 MB of Qur'an data in git, served from GitHub Pages — Low (noted)

`tools/quran-data-pull/output/` is committed, and the app fetches from
`/tools/quran-data-pull/output` at runtime — an app fetching from a path named
`tools/`. It works, it is cached hard, and `BASE_URL` is a single constant
designed to be repointed. Recorded here so a reviewer proposing a larger word
dataset knows the current delivery mechanism and its one-line escape hatch.

---

## Duplicate data structures

Three, all real:

1. **Two Arabic texts per āyah** — `uthmaniText` and `tajweedText`. Necessary
   (different markup), but they must be kept in step by hand; the Bismillah
   prefix appears in one and not the other, which caused a real double-render
   bug.
2. **Two word models** — `words[].position` and the mushaf's `loc` (G-10).
3. **Two renderings of the same three panels** — the Read view calls
   `renderLayoutA()`; the Note view builds `wbwHtml`/`rootsHtml`/
   `derivativesHtml` separately in `quranrevival.html` and passes strings to
   `ayah-note-renderer.js`. They call the same three functions but through
   different paths, ~1,100 lines apart. Past defects have been fixed in one
   and not the other.

---

## Incorrect relationships between root / lemma / derivative

**Root ↔ lemma: correct.** No lemma maps to more than one root anywhere.

**Root ↔ count: partly wrong.** 423 instances (G-09).

**Root/lemma ↔ word: wrong for 710 instances** (G-04).

**Lemma ↔ derivative: the relationship does not exist**, because derivatives
do not exist (G-01/G-02). The app presents lemma *as* the derivative, which
conflates two distinct concepts. In correct Arabic morphology:

```
root (ك ت ب)  →  Form (I, II, IV…)  →  lemma (كَتَبَ, كَاتِب, مَكْتُوب)  →  surface word (كَتَبْنَا)
                      ↑ missing entirely
```

The app models the first, third and fourth and calls the third one the second.

---

## Features that appear incomplete

| Feature | Evidence |
|---|---|
| Root occurrence lookup | designed in a comment, `roots-index.json` never built (G-08) |
| Word interaction | `data-position` emitted, never read (G-11) |
| Word-by-word language choice | control exists, choice does not persist (G-12) |
| Translation-by-translator choice | `#translationChoiceSelect` exists **and is deliberately disabled**, with an on-screen note — an honest placeholder |
| Grammar teaching | Approach 06 has a notes box where the morphology panels obviously belong |
| Word-level measurement | Approach 04 states a word-level measure the model cannot record (G-21) |
| Mushaf ↔ word data | two systems, no join, nothing attempted (G-10, G-22) |

---

## What is NOT wrong (verified, so a reviewer does not re-investigate)

- Word coverage is **complete** — 77,429 words, no gaps in Arabic,
  transliteration, English gloss or Bangla gloss.
- Lemma coverage matches the source **exactly** — nothing dropped, nothing
  invented.
- `rootCount` is **internally consistent** — no root ever carries two
  different counts.
- The lemma→root relation is **clean** — 1:1 across 4,832 lemmas.
- Word positions align with the corpus **perfectly** — 0 of 77,429 failed to
  resolve to a corpus word by position.
- `posLabel()` covers **all 359** POS combinations from **45** table entries,
  in both languages, and degrades gracefully on the one bad atom.
- The `tajweedRawToSafeHtml()` whitelist is a genuine sanitiser, not a
  pass-through.
- The renderer layer is **acyclic** and free of Firebase, exactly as invariant
  I2 requires.
