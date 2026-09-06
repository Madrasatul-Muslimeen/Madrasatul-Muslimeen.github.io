# WORD_STUDY_SYSTEM_AUDIT.md

An audit of **only** the existing Word Study / Word-by-Word system, item by
item, as the review request specified. Nothing here is a proposal; every
status is what the shipped v08.00 code actually does.

---

## Where the whole system lives

| | |
|---|---|
| **Data** | `tools/quran-data-pull/output/surahs/surah_NNN.json` → `ayahs[].words[]` |
| **Data loader** | `app/js/quran-data.js` — `getSurah()`, `getAyah()`, `getAyahRange()` |
| **Renderer** | `app/js/ayah-renderer.js` — `renderWordByWordPanel()`, `renderRootPanel()`, `renderDerivativesPanel()` |
| **Grammar labels** | `app/js/labels.js` — `posLabel()` + `POS_LABELS` |
| **Read-view host** | `app/quranrevival.html` — flow view ≈ L9155, single-āyah view ≈ L11461, toggles ≈ L3432 |
| **Note-view host** | `app/js/ayah-note-renderer.js` — the three collapsible fields ≈ L554–574 |
| **Standalone demo** | `app/quranrevival-render-test.html` — all four panels on āyah 2:255, no Firebase |

Three user-visible panels, three independent checkboxes:

| Checkbox | Element id | Panel key | Renderer |
|---|---|---|---|
| **Word by Word** | `#wbwShowToggle` | `wordByWord` | `renderWordByWordPanel()` |
| **Root** | `#rootsToggle` | `root` | `renderRootPanel()` |
| **Derivatives** | `#derivativesToggle` | `derivatives` | `renderDerivativesPanel()` |

They were split apart over three separate rounds, each on the owner's own
report that the previous grouping showed too much at once. All three are
**screen-wide reading choices**, mirrored between Study options, the Read
view's `⋮` badge menu and the Note view's `⋯` menu — a choice made anywhere
takes effect everywhere.

---

## Summary table

| | Item | Status |
|---|---|---|
| **A** | Quranic surface word | ✅ **Fully implemented** |
| **B** | English word meaning | ✅ **Fully implemented** |
| **C** | Bangla word meaning | ✅ **Fully implemented** |
| **D** | Transliteration | ⚠️ **Partially implemented** (Latin only; hidden in Bangla-only mode, by design) |
| **E** | Root | ⚠️ **Partially implemented** (letters + a count; no root family, and the count is a merged-family count for 0.5 % of words) |
| **F** | Lemma | ⚠️ **Data exists, displayed but unlabelled and unused** |
| **G** | Derived form | ❌ **Not implemented** — data discarded at build time; the panel named "Derivatives" shows something else |
| **H** | Root family | ❌ **Not implemented** — a count exists, the member list does not |
| **I** | Part of Speech | ✅ **Fully implemented** (and well done) |
| **J** | Grammar / morphology | ⚠️ **Data existed at source, ~50,000 segment rows discarded** |
| **K** | Prefixes | ❌ **Not implemented as structure** — collapsed into the POS string |
| **L** | Suffixes | ❌ **Not implemented as structure** — collapsed into the POS string |
| **M** | Attached pronouns | ⚠️ **Presence shown, identity discarded** |
| **N** | Audio (word level) | ❌ **Not implemented** — audio is āyah- and surah-level only |

---

## A. Quranic surface word

**STATUS: Fully implemented.**

Stored as `words[].arabic`, taken from quran.com's `text_uthmani` (falling
back to `text`). All **77,429** words present; **zero** empty values measured.

```js
// app/js/ayah-renderer.js — renderWordByWordPanel()
`<div class="wbw-word" data-position="${w.position}">
   <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
   …`
```

Rendered right-to-left in the reader's chosen Arabic face
(`--quran-font`, one of three subset `.woff2` files, chosen in Study options),
inside a wrapping flex strip whose *chips* are LTR while the strip itself is
RTL — so the words read in the correct order and each chip's own contents
(Arabic over transliteration over gloss) stack correctly.

**Location:** data `output/surahs/*.json`; render `app/js/ayah-renderer.js`
`renderWordByWordPanel()`; CSS `.wbw-strip` / `.wbw-word` / `.wbw-arabic`
in `app/quranrevival.html` ≈ L1772–1783.

**One caveat, measured:** in **3 āyahs (2:181, 8:6, 13:37)** the source treats
**بَعْدَ مَا** as a single "word", so one chip contains two orthographic words.

---

## B. English word meaning

**STATUS: Fully implemented.**

`words[].translation.en`, from quran.com `language=en`. **77,429 of 77,429
present** — zero gaps measured. HTML tags are stripped at build time
(`.replace(/<[^>]*>/g, "")`).

```js
const cls = lang === "bn" ? "wbw-gloss wbw-gloss-bn" : "wbw-gloss";
return `<div class="${cls}">${escapeHtml(text)}</div>`;
```

Shown when the word-by-word language resolves to `en` or `both`.

---

## C. Bangla word meaning

**STATUS: Fully implemented.**

`words[].translation.bn`, from a **second** quran.com call with `language=bn`,
joined on `position`. **77,429 of 77,429 present** — zero gaps measured.
Rendered with `lang="bn"` so the correct font and shaping apply.

This is a genuine strength: full Bangla word-level glossing across the entire
Qur'an is not common, and it is complete here.

---

## D. Transliteration

**STATUS: Partially implemented.**

`words[].transliteration` — **Latin script only**, quran.com's scholarly
romanisation (`bis'mi`, `l-raḥmāni`, `yakhdaʿūna`). 77,429 of 77,429 present.

Two deliberate limitations:

1. **There is no Bangla-script transliteration.** The pulled data has no such
   field.
2. Because of that, the Latin line is **suppressed entirely in Bangla-only
   mode**:

```js
// A Bangla-script transliteration would be a different thing entirely
// -- the pulled data has no such field, only the Latin one.
const translit = langs.includes("en")
  ? `<div class="wbw-translit">${escapeHtml(w.transliteration)}</div>`
  : "";
```

The reasoning is recorded and sound — a Latin pronunciation line is unreadable
to exactly the reader that "বাংলা only" is for. But the *effect* is that a
Bangla-only reader gets **no pronunciation aid at all**, which is a real
functional gap for the app's primary audience.

**Location:** `app/js/ayah-renderer.js`, `renderWordByWordPanel()`.

---

## E. Root

**STATUS: Partially implemented.**

Present for **49,971 of 77,429 words (64.5 %)**; **1,642 distinct roots**.
The 27,458 without a root are overwhelmingly function words that genuinely
have none (4,987 prepositions, 3,847 preposition+pronoun, 2,177 relative
pronouns, 1,251 negative particles, …).

The panel shows the root letters and an occurrence count:

```js
export function renderRootPanel(ayah) {
  if (!ayah.words?.length) return `<div class="wbw-empty">${t("No morphology data for this ayah.")}</div>`;
  const rows = ayah.words
    .filter((w) => w.morphology?.root)
    .map((w) => `<div class="root-row" data-position="${w.position}">
        <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
        <div class="root-root" dir="rtl" lang="ar">${escapeHtml(w.morphology.root)}<span class="root-count">${num(w.morphology.rootCount)}×</span></div>
      </div>`).join("");
  …
}
```

**Three limitations:**

1. **The root is not clickable and leads nowhere.** `rootCount` says
   "381×" and there is no way to see those 381 places.
2. **The count is for a merged root family in 423 word instances (0.5 %)**,
   because `canonicalRootKey()` folds roots ending in **و/ي** together.
   Worked example: 2:3:5 ٱلصَّلَوٰةَ displays `صلو 124×`; صلو alone occurs
   99 times, and the 124 is صلو + صلي.
3. **Rootless words are silently dropped from the panel** (`.filter(…)`), so
   the Root strip has fewer chips than the āyah has words and the reader is
   given no signal why. This is a design choice, not a bug, but it is
   invisible.

`renderRootPanel()`'s own doc-comment names the missing piece explicitly:

> *"Per-word occurrence lists across surahs aren't loaded here … see
> roots-index.json (a bounded, separate static file) for that lookup once
> built."*

**`roots-index.json` does not exist.** There is no builder for it in
`tools/quran-data-pull/`. The design was thought through and never built.

---

## F. Lemma

**STATUS: Data exists, is displayed, but is unlabelled and unused.**

Present for **74,122 of 77,429 words (95.7 %)**; **4,832 distinct lemmas**.
Data quality is good — measured across the whole corpus, **no lemma maps to
more than one root**.

It is rendered as the third line of the **Derivatives** panel:

```js
${w.morphology.lemma ? `<div class="root-lemma" dir="rtl" lang="ar">${escapeHtml(w.morphology.lemma)}</div>` : ""}
```

Problems:

- **Nothing on screen says the word "Lemma".** It appears as an unlabelled
  Arabic string under the part of speech, inside a panel whose title says
  "Derivatives". A reader who does not already know what a lemma is cannot
  learn it from this screen.
- **No lemma index, no lemma search, no "other forms of this lemma".**
- It is not exported, not searchable, and not part of any record.

---

## G. Derived form

**STATUS: Not implemented. The data was available at source and is discarded.**

This is the headline finding.

- The Quranic Arabic Corpus marks Arabic verb **Forms II–XII** in its FEATURES
  column. Measured in the source file: **8,977 words carry a Form** —
  (IV) 4,585 · (II) 1,615 · (VIII) 1,161 · (III) 497 · (V) 466 · (X) 459 ·
  (VI) 106 · (VII) 63 · (XII) 13 · (IX) 11 · (XI) 1.
- `morphDataForWord()` in `tools/quran-data-pull/pull.js` keeps only
  `{root, lemma, pos, rootCount}` — the Form is never read.
- The panel labelled **"Derivatives"** therefore shows **part of speech +
  lemma**.

The code comment is honest about it:

> *"Panel: Derivatives — the fourth panel, the word's own DERIVED form: its
> part of speech and lemma (the dictionary/inflected form this particular
> word takes, derived from the root Root shows separately)."*

…but "the dictionary form" and "the derived form" are different linguistic
objects, and the label the user reads is the second one. The Bangla catalogue
even carries an uncertainty marker on it:

```js
"Derivatives": "উদ্ভূত শব্দ", // ?
```

**Recovering this requires re-running `pull.js` against the same corpus file.**
No new source is needed.

---

## H. Root family

**STATUS: Not implemented.**

A *count* exists (`rootCount`) and is displayed. The **membership list does
not exist anywhere** — not in the data, not in an index, not in the UI.

There is no way to answer any of:

- "Which other words in this āyah share this root?" (the data is right there
  in `ayah.words[]` and is never compared)
- "Which other words in this surah share this root?"
- "Where else in the Qur'an does this root appear?"

The intended solution is named in the code (`roots-index.json`) and was never
built. **A per-āyah root grouping would need no new data at all** — everything
required is already in the loaded `ayah.words[]` array.

---

## I. Part of Speech

**STATUS: Fully implemented — and this is the best-engineered part of the
system.**

`words[].morphology.pos` is present for **77,429 of 77,429 words (100 %)**:
**359 distinct strings** built from **46 distinct atoms**, joined with `" + "`.

`app/js/labels.js` translates them atom by atom:

```js
export function posLabel(pos) {
  if (!pos) return "";
  return String(pos)
    .split("+")
    .map((part) => {
      const atom = part.trim();
      const english = POS_LABELS[atom];
      return english ? t(english) : atom;   // unknown atoms print as they are
    })
    .join(" + ");
}
```

Three things done right:

1. **45 table entries express all 359 combinations**, in both languages.
   Translating whole strings would have needed 359 Bangla entries.
2. **Raw corpus codes are expanded to real words** — `RES`, `PRO`, `PREV`,
   `IMPV`, `EXL`, `INT`, `EXH`, `SUR`, `AVR`, `EQ`, `COM` all become readable
   phrases. English gains from this as much as Bangla does.
3. **An unknown atom prints unchanged rather than blank** — no invented
   meaning, no crash.

Two small blemishes: the table has **45** entries while its own comment says
46; and **one atom in the data is a glitch** — 37:130 word 3 (إِلْ يَاسِينَ)
has `pos: "yaAsiyna"`, a transliteration that leaked into the POS field
upstream. The fallback handles it gracefully, printing it verbatim.

---

## J. Grammar / morphology (beyond part of speech)

**STATUS: Data existed at source; roughly 50,000 segment rows were discarded.**

The corpus is 128,219 segment rows for 77,429 words. The app keeps one flat
POS string and two lexical fields per word. Measured, what was dropped:

| Feature | Words/segments affected | Kept? |
|---|---|---|
| Aspect PERF (past) | 9,150 words | ❌ |
| Aspect IMPF (present) | 8,330 words | ❌ |
| Mood IMPV (imperative) | 1,876 words | ❌ |
| Verb Form II–XII | 8,977 words | ❌ |
| Voice ACT / PASS | 2,974 / 1,691 segments | ❌ |
| Person·gender·number (3MS, 2MP, 1P…) | throughout | ❌ |
| Case NOM / ACC / GEN | 31,914 segments | ❌ |
| Definiteness (`Al+` / INDEF) | 17,049 segments | ❌ |
| `MOOD:` marking | 2,748 segments | ❌ |

**The most visible consequence:** the app can print "Imperative Verb" only for
words whose corpus TAG is `IMPN` — **2 words in the entire Qur'an**. The
**1,876 real imperatives** carry TAG `V` with `IMPV` in the features, so
ٱقْرَأْ (96:1:1) shows as **"Verb"** and ٱهْدِنَا (1:6:1) as
**"Verb + Pronoun"**. Tense, mood and voice are invisible for all 19,356 verbs
in the Qur'an.

---

## K. Prefixes

**STATUS: Not implemented as structure.**

**26,001 words carry a prefix segment** in the source. The corpus marks them
explicitly (`PREFIX|bi+`, `PREFIX|Al+`, `PREFIX|w:P+`, `PREFIX|f:REM+`,
`PREFIX|l:P+`, `PREFIX|ya+`), and `pull.js` collapses them into the POS
string:

```
1:1:1  بِسْمِ   segments: (bi, P, PREFIX|bi+) + (somi, N, STEM|…)
                stored:  pos: "Preposition + Noun"
```

So the reader is told *that* there is a preposition, but not that it is the
attached **بِ**, not which letters carry it, and not where the stem begins.
The word is never segmented on screen.

Worst case measured — 55:13:1 **فَبِأَىِّ** is three segments
(`fa` REM + `bi` P + `>aY~i` N) and displays as the single string
`"Resumption Particle + Preposition + Noun"`, with no indication of which part
of the visible Arabic is which.

---

## L. Suffixes

**STATUS: Not implemented as structure.** Same mechanism as prefixes.

**20,295 words carry a suffix segment.** Example: 1:6:1 **ٱهْدِنَا** is
`{hodi` (V, IMPV, 2MS) + `naA` (PRON, SUFFIX|PRON:1P) and stores
`pos: "Verb + Pronoun"` — losing the imperative, the 2nd-person-masculine-
singular addressee, and the fact that the suffix means **"us"**.

---

## M. Attached pronouns

**STATUS: Presence is shown; identity is discarded.**

**20,146 words carry an attached pronoun.** The corpus records exactly which
one — `PRON:1P`, `PRON:3MP`, `PRON:2MS`, `PRON:3FS` and so on. The app keeps
only the word `Pronoun` inside the POS string.

So يَعْلَمُونَ, ٱهْدِنَا, بَدَّلَهُۥ and سَمِعَهُۥ all render as
**"Verb + Pronoun"**, though their pronouns are *they*, *us*, *it/him* and
*it/him* respectively, in different grammatical persons.

This is one of the more damaging losses for the app's actual purpose: for
Approach 04, "Reading — Word-by-Word Meaning", knowing *which* pronoun is
attached is much of the point.

---

## N. Audio

**STATUS: Not implemented at word level.**

`app/js/audio-player.js` (50 KB) is a substantial and well-built module, but
its finest granularity is **one āyah**:

- Whole-surah files (`archive.org`) plus a JSON timing map
  (`gtaf_bangla_timestamps.json`) giving `{verse_key, timestamp_from,
  timestamp_to}` — **āyah boundaries only**.
- Per-āyah files for reciters that have them (`perAyahUrl(surah, ayah)`).
- Loop and repeat operate over āyah ranges.

**There is no word-level timing data anywhere in the project**, no per-word
audio file, no word highlight-during-recitation, and nothing in the
word-by-word chip is clickable or playable.

Two upstream sources for this exist and are unused: quran.com's v4 API can
return per-word `audio_url` and segment timings, and the QUL mushaf data has
word-level layout that could anchor a highlight.

---

## What has no UI at all

For completeness, these have neither data nor UI in the current build:

| Feature | State |
|---|---|
| Word click / tap → detail | **Nothing.** No handler anywhere on `.wbw-word`. |
| Word detail popup / bottom sheet | **Does not exist.** (The app has three popover mechanisms — `bar-palette.js`, `note-popup.js`, `bookmark-popover.js` — none is wired to a word.) |
| Word search (by root, lemma, or POS) | **Does not exist.** `quran-search.js` searches **āyah text** only. |
| Word bookmark / note / claim | **Impossible by design** — `unit-keys.js` has no `word:` unit type. |
| Word vocabulary list / flashcards | Does not exist. |
| Tafsir at any level | Does not exist anywhere in the project. |
| Grammar explanations / lessons | Does not exist. Approach 06 "Language Learning (Basic Grammar)" declares `panels: ["text", "notes"]` — a free-text notes box. |

---

## The structural conclusion

Everything above resolves to one sentence:

> **The word-by-word system is a read-only decoration of an āyah, not a model
> of a word.** The data is loaded per surah, rendered per āyah, and thrown
> away on the next render. No word is addressable, storable, countable,
> searchable, or claimable — and the four morphology fields that do exist are
> a lossy 4-field reduction of a source that carried an order of magnitude
> more.

What that means for the reviewer's likely question — "can this scale to a real
Word Study feature?" — is set out in `CLAUDE_CODE_SELF_ASSESSMENT.md`.
