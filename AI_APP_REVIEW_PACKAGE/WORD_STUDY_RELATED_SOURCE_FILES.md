# WORD_STUDY_RELATED_SOURCE_FILES.md

Every source file involved in word-by-word display, word interaction, root /
lemma / morphology display, Qur'an data loading and word data processing.
Line counts and dependency lists are read from the files, not estimated.

**No source code is pasted here.** The files themselves are copied into
`relevant_source_code/` alongside this document.

Ordered by how central they are to the Word Study system.

---

## TIER 1 — the Word Study system proper

### 1. `app/js/ayah-renderer.js`

**FILE PATH:** `app/js/ayah-renderer.js` — **230 lines**

**PURPOSE:** The Word Study renderer. This one small file produces every
word-by-word, root and derivatives pixel in the application. It is a **pure
renderer** — data in, HTML string out — and by invariant I2 it never touches
Firestore, never calls another module, and holds no state.

**KEY FUNCTIONS:**

| Export | What it does |
|---|---|
| `renderWordByWordPanel(ayah, {langs})` | The word chips: Arabic, transliteration, en/bn gloss. Emits `data-position` (unused by anything). |
| `renderRootPanel(ayah)` | Root letters + `rootCount×` per word. **Filters out rootless words.** |
| `renderDerivativesPanel(ayah)` | Part of speech (via `posLabel`) + lemma. **Despite the name, shows no derived form.** |
| `renderArabicPanel(ayah, {tajweedOn})` | The āyah's Arabic, plain or tajweed-coloured, with a leading Arabic-Indic number badge. |
| `renderTranslationPanel(ayah, langs)` | One block per translation language, each numbered in its own digit script. |
| `renderLayoutA(ayah, panels, opts)` | Assembles whichever panels the Approach's `panels[]` declares, in `PANEL_ORDER`. |
| `tajweedRawToSafeHtml(raw)` | Escapes everything, then re-expands **only** the exact quran.com tajweed tag whitelist. |
| `stripLeadingBismillah(text)` | Removes the Bismillah that the source embeds as a prefix of āyah 1 in every surah but 9; falls back to the original when nothing would be left (Al-Fātiḥa). |
| `digitsForLang(value, lang)` | Renders a number in Arabic-Indic / Bengali / Latin digits — deliberately **not** the app language, but the block's own script. |

**DEPENDENCIES:** `./i18n.js` (`t`, `num`), `./labels.js` (`posLabel`). Nothing else.

**Notes for the reviewer:** this is the cleanest file in the system and the
right place to build from. Its limitations are all inherited from the data it
is handed, not from its own design. One thing it does *not* do: attach any
behaviour. It emits `data-position` on every chip and nothing anywhere reads it.

---

### 2. `app/js/quran-data.js`

**FILE PATH:** `app/js/quran-data.js` — **170 lines**

**PURPOSE:** The **only** module in the entire application that reads the
packaged Qur'an files. Enforces the architectural rule *"Qur'an content is
served as static files, one per surah, cached permanently by the browser —
never as Firestore reads."*

**KEY FUNCTIONS:** `getSurah(n)` (fetch once, `Map`-cached, failures not
cached), `getAyah(s, a)`, `getAyahRange(s, from, to)`, `getSurahIndex()`,
`getSearchIndex(lang)`, `getJuzIndex()`, `getPageIndex()`, `getHizbIndex()`.

**DEPENDENCIES: none.** No imports at all — not even i18n.

**Notes:** `BASE_URL = "/tools/quran-data-pull/output"` is a single constant,
deliberately, so the whole store can be moved to a CDN by editing one line.
Every index loader follows the same lazy, cache-on-success, clear-on-failure
shape. **This is where a word/root index loader would belong** and would fit
the existing pattern exactly.

---

### 3. `app/js/labels.js`

**FILE PATH:** `app/js/labels.js` — **192 lines**

**PURPOSE:** Turns stored identifiers into words a person reads, in either
language. For Word Study, it owns the **part-of-speech vocabulary**.

**KEY FUNCTIONS:** `posLabel(pos)` — splits a `"A + B + C"` POS string, maps
each atom through the 45-entry `POS_LABELS` table, translates it, rejoins.
Unknown atoms print unchanged. Also `statusLabel`, `statusLabelsById`,
`confirmStateLabel`, `entityStatusLabel`, `roleListLabel`,
`activityActionLabel`.

**DEPENDENCIES:** `./i18n.js` (`t`).

**Notes:** deliberately Firebase-free so pure renderers (and the offline
backup builder) can import it — that constraint is what created this file.
The `POS_LABELS` table is the app's entire grammar vocabulary: **45 entries
covering all 359 POS combinations in the data**, in both languages. Extending
grammar display means extending this table, and that is a cheap, well-shaped
extension point.

---

### 4. `app/quranrevival.html`

**FILE PATH:** `app/quranrevival.html` — **12,027 lines** (markup + one inline
module script). By far the largest file in the project.

**PURPOSE:** The Qur'an study screen. Hosts the Wheel, Read, Note and Explore
views and every Study-option control.

**KEY REGIONS (line numbers as at v08.00):**

| ≈ Line | What |
|---|---|
| 1772–1783 | CSS for `.wbw-strip`, `.wbw-word`, `.wbw-arabic`, `.wbw-translit`, `.wbw-gloss`, `.root-row`, `.root-root`, `.root-pos`, `.root-lemma`, `.root-count` |
| 3425–3450 | the `.reading-ticks` row — `#wbwShowToggle`, `#rootsToggle`, `#derivativesToggle`, `#tajweedToggle`, translation ticks |
| 3461–3466 | `#wbwLangSelect` — auto / English only / বাংলা only / English + বাংলা |
| 4334 | `let wbwLangMode = "auto"` — **session-only, never persisted** |
| 9090–9095 | `wbwLangs()` — resolves the panel's language |
| 9155–9195 | **Read view, flow mode** — every āyah in scope, each wrapped in a `⋮` quick menu, body from `renderLayoutA()` |
| 9505–9575 | `captureQuranBookmarkSettings()` / `applyQuranBookmarkSettings()` — persists `wbwOn`/`rootsOn`/`derivativesOn`, **not** `wbwLangMode` |
| 10231 | `canWbwRoot = noteScopeCanWbwRoot()` |
| 10260–10332 | **Note view** — builds `wbwHtml` / `rootsHtml` / `derivativesHtml` per āyah in scope |
| 11288–11320 | `toggleNoteWbw()` / `toggleNoteRoots()` / `toggleNoteDerivatives()` — flip the same canonical checkboxes |
| 11391–11398 | panel list assembly; all reading ticks disabled while Mushaf view is on |
| 11461–11470 | **Read view, single-āyah mode** — `renderLayoutA()` into `#ayahPanels` |
| 11842–11845 | `#wbwLangSelect` change handler |

**DEPENDENCIES:** 41 local modules plus the Firebase Auth and Firestore SDKs
by URL. The Word-Study-relevant ones are `ayah-renderer.js`,
`ayah-note-renderer.js`, `quran-data.js`, `labels.js`, `hifz-renderer.js`,
`audio-player.js`, `quran-search.js`, `unit-keys.js`, `i18n.js`, `prefs.js`,
`text-size.js`, `bar-palette.js`, `note-popup.js`.

**Notes:** the size is the main structural risk in the project. All three
Word Study call sites live here, ~2,300 lines apart, and each had to be found
and fixed separately in past rounds.

---

### 5. `app/js/ayah-note-renderer.js`

**FILE PATH:** `app/js/ayah-note-renderer.js` — **924 lines**

**PURPOSE:** The Note view and the per-āyah quick menu. Hosts the three Word
Study panels a second time, as collapsible fields, and carries the toggle
menu items that flip the canonical checkboxes.

**KEY FUNCTIONS:** `renderNoteView({…, wbwHtml, rootsHtml, derivativesHtml,
isWbwOn, isRootsOn, isDerivativesOn, canWbwRoot, …})`,
`attachNoteViewHandlers()`, `renderQuickMenu(unitKey, {showTextTools, …})`,
`attachQuickMenuHandlers(container, {onToggleWbw, onToggleRoots,
onToggleDerivatives, …})`, `notesToPlainText()`.

**DEPENDENCIES:** `./i18n.js`, `./text-size.js`.

**Notes:** it **receives** finished HTML strings rather than āyah objects —
`quranrevival.html` calls the renderers and passes the result in. That keeps
this file free of `ayah-renderer.js`, but it also means the Note view's copy
of the panels is assembled by different code from the Read view's, which is
where several past defects lived (the Note view once bypassed
`renderArabicPanel()` entirely and so had no āyah numbers or tajweed).

---

## TIER 2 — data production and adjacent Qur'an surfaces

### 6. `tools/quran-data-pull/pull.js`

**FILE PATH:** `tools/quran-data-pull/pull.js` — **364 lines** (Node, CommonJS)

**PURPOSE:** The one-time build that produced all 27 MB of Qur'an data. **Not
part of the running app.** This is where every gap in the word data was
created, and where every one of them would be fixed.

**KEY FUNCTIONS:**

| Function | What it does |
|---|---|
| `loadMorphology()` | Fetches the 128,219-row Quranic Arabic Corpus file, with a jsDelivr fallback and a sanity gate (≥97 % of expected rows, all 114 chapters). |
| `parseMorphologyText()` | Builds `idx` (word → segments), `rootIdx` (canonical root → occurrences), `ayahWords`. |
| `bwToAr(bw)` | Buckwalter → Arabic, 40-entry table. |
| `canonicalRootKey(rootBW)` | **Folds roots ending in و/ي together** — the source of the 423 merged-family counts. |
| `normalizeArabicForMatch(s)` | Strips diacritics, folds hamza forms, ة→ه, ى→ي. |
| `resolveWordKey(...)` | Matches a quran.com word to a corpus word by normalised form, falling back to position. **The source of 710 mis-resolutions.** |
| `morphDataForWord(...)` | **Reduces a word's segments to `{root, lemma, pos, rootCount}`** — where prefixes, suffixes, pronoun identity, tense, mood, voice, person/gender/number, case, definiteness and verb Form are all discarded. |
| `fetchSurah(surahNum, morph)` | 6 API calls per surah; assembles the final object. |
| `main()` | Loops 1..114, writes files, writes `manifest.json`. |

**DEPENDENCIES:** Node `fs`, `path`, global `fetch`. No packages.

**Notes:** the header states the parsing logic was **ported verbatim from the
legacy v06 single-file app**, which is why it inherits that app's `w/y` root
folding and its normalise-and-match word resolution. Re-running this script is
the *only* way to change what the app knows about a word.

---

### 7. `app/js/hifz-renderer.js`

**FILE PATH:** `app/js/hifz-renderer.js` — **308 lines**

**PURPOSE:** The 604-page Madani Mushaf replica — a true page-for-page
rendering using per-page QCF V2 glyph fonts, line-justified by horizontal
scaling.

**KEY FUNCTIONS:** `ensureMushafData()` (lazy fetch of the ~3 MB layout JSON),
per-page font loading, the āyah→page reverse index, page rendering with
selected āyahs highlighted.

**DEPENDENCIES:** `./i18n.js`. Fetches from `raw.githubusercontent.com`.

**Notes: this is the only place in the app that has a real word identifier**
(`loc: "2:255:1"`). It is also the only Qur'an surface where the word-by-word
panels are **disabled** — all reading ticks are switched off while Mushaf view
is on. So the view with word IDs and the view with word data are mutually
exclusive today.

---

### 8. `app/js/quran-search.js`

**FILE PATH:** `app/js/quran-search.js` — **162 lines**

**PURPOSE:** Whole-Qur'an search across Arabic, English and Bangla. Pure logic
— no DOM, no Firebase.

**KEY FUNCTIONS:** `searchLangFor(query)` (picks the index by the **script the
query is written in**, not by app language), the diacritic-stripping
normaliser, `originalRange()` (maps a match in stripped text back to the
original for highlighting), the search itself.

**DEPENDENCIES:** `./quran-data.js`.

**Notes:** **āyah-text search only.** There is no search by root, lemma or
part of speech, and the normaliser drops the alef deliberately (documented:
the Uthmani script writes some long-A sounds as a superscript alef, so a
reader typing the alef found nothing). The normalisation work here is
directly reusable for any future word-level search.

---

### 9. `app/js/audio-player.js`

**FILE PATH:** `app/js/audio-player.js` — **1,042 lines**

**PURPOSE:** All recitation playback: reciter registry, per-āyah and
whole-surah sources, loop/repeat, seeking by āyah boundary, the "now playing"
highlight.

**KEY FUNCTIONS:** `RECITERS` (each `direct` with a `perAyahUrl`/`surahUrl`,
or `segmented` with a `surahUrl` + `timestampsUrl`), `playAyah`,
`playRange`, `playSurah`, loop control, the timing-map warmer.

**DEPENDENCIES:** `./i18n.js`. Fetches from `archive.org` and per-āyah audio
hosts.

**Notes: āyah-level granularity is the ceiling.** `gtaf_bangla_timestamps.json`
gives `{verse_key, timestamp_from, timestamp_to}` — āyah boundaries only.
No word-level timing exists anywhere in the project.

---

### 10. `app/js/unit-keys.js`

**FILE PATH:** `app/js/unit-keys.js` — **166 lines**

**PURPOSE:** The identifier grammar for everything the platform can track,
plus the six progress statuses.

**KEY FUNCTIONS:** `UNIT_TYPES`, `buildUnitKey.*`, `parseUnitKey`,
`rukuIndexInSurah`, `unitTypeLabel`, `unitKeyLabel`, `surahOf`, `STATUSES`,
`statusLabel`, `summarizeStatuses`.

**DEPENDENCIES:** `./i18n.js`.

**Notes:** **the single most important file for judging whether Word Study can
become trackable.** There is no `word` entry in `UNIT_TYPES` and no
`buildUnitKey.word`. Adding one is a small, additive change here — but it
cascades into `records.js` chunking, `firestore.rules`, the Mastery Wheel, the
Explore roll-up and Monitor.

---

### 11. `app/js/catalogue-data.js`

**FILE PATH:** `app/js/catalogue-data.js` — **373 lines**

**PURPOSE:** The seeded platform content: 10 modules, 41 subject-tree nodes,
and the **30 Approaches** with their `guide` text and their `panels[]` lists.

**KEY EXPORTS:** `MODULE_TEMPLATES`, `SUBJECT_TEMPLATES`,
`APPROACH_TEMPLATES`, `SECTION_NAMES`.

**DEPENDENCIES:** none.

**Notes:** this is the file that decides **which Approach gets which Word
Study panel**. Approach 04 declares `panels: ["text", "wordByWord"]`;
Approach 06 (Basic Grammar) declares only `["text", "notes"]` — a free-text
box where the morphology panels would obviously belong.

---

## TIER 3 — supporting infrastructure the panels rely on

### 12. `app/js/i18n.js` — **256 lines**
Translation runtime: `t(key, params)`, `num(value)` (Bengali digits),
`langText()`, `translateStatic()`, language switching. Imports
`./i18n/bn.js` (195 KB, ~1,531 keys), `./i18n/surah-names-bn.js`,
`./i18n/asma-names-bn.js`, `./prefs.js`. Every Word Study label passes through
`t()`; every number through `num()`.

### 13. `app/js/prefs.js` — **713 lines**
All `localStorage` preferences (`mm_*`), including the Arabic typeface,
translation languages, and `mm_quran_last_session` (which stores
`wbwOn`/`rootsOn`/`derivativesOn`). No imports. **Does not store
`wbwLangMode`.**

### 14. `app/js/text-size.js` — **233 lines**
Reading text-size controls, imported by the Note renderer. Imports `./i18n.js`.

### 15. `app/js/bar-palette.js` — **73 lines**
The shared one-delegated-listener popover used by Explore, QCR, Asma and the
Choose-a-Unit capsule: outside-click, Escape and "only one open at a time"
come free. No imports. **This is the existing, proven mechanism a word-detail
bottom sheet should be built on** — it is not currently wired to anything
word-related.

### 16. `app/js/note-popup.js` — **374 lines**
The rich-text note popup and its formatting palette. No imports. Relevant only
as a second example of this codebase's popup conventions.

### 17. `app/quranrevival-render-test.html` — **242 lines**
A standalone harness page that renders `renderArabicPanel`,
`renderTranslationPanel`, `renderWordByWordPanel`, `renderRootPanel` and
`renderDerivativesPanel` against **āyah 2:255**, with a tajweed toggle and a
language switch, **and no Firebase at all**. Imports `./js/ayah-renderer.js`,
`./js/quran-data.js`, `./js/hifz-renderer.js`, `./js/mastery-wheel.js`,
`./js/i18n.js`, `./js/nav.js`, `./js/session-context.js`, `./js/splash.js`.

**For a reviewer this is the fastest possible entry point** — it shows the
entire Word Study output on one page with no sign-in.

---

## Dependency graph (Word Study only)

```
                       tools/quran-data-pull/pull.js          [build time only]
                                    │  writes
                                    ▼
                 output/surahs/surah_NNN.json   (27 MB, in git)
                                    │  fetch()
                                    ▼
                       app/js/quran-data.js     ← no imports at all
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
   app/js/quran-search.js   app/quranrevival.html   app/quranrevival-render-test.html
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
   app/js/ayah-renderer.js   app/js/ayah-note-        app/js/hifz-renderer.js
              │                 renderer.js                (separate word-id world)
              ▼                     │
     app/js/labels.js               ▼
              │            app/js/text-size.js
              ▼                     │
       app/js/i18n.js ◀─────────────┘
              │
              ▼
       app/js/prefs.js  →  localStorage
```

Every arrow points one way. **No cycles** — invariant I2 holds throughout the
Word Study system.
