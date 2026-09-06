# SCREEN_TO_CODE_MAPPING.md

The request asks: *"Document how the current Word Study popup/bottom sheet is
generated."*

## There is no Word Study popup or bottom sheet.

This has to be stated first, because the rest of the mapping only makes sense
once it is clear. Verified by repo-wide search:

- **No click handler exists on any word.** `.wbw-word` and `.root-row` are
  matched **only** by the two CSS rules that style them. The `data-position`
  attribute the renderer emits on every chip is read by **nothing**.
- **No word-detail component exists.** There is no `WordDetailSheet`, no word
  modal, no word route, no word state.
- The app *does* have three popup mechanisms — `bar-palette.js` (the shared
  popover used by Explore, QCR, Asma and the Choose-a-Unit capsule),
  `note-popup.js` (rich-text notes) and `bookmark-popover.js`. **None of them
  is wired to a word.**

**What actually exists are three inline, always-visible panels**, drawn under
the āyah, toggled by three checkboxes. Everything below maps those.

---

## The three panels

| Panel | Checkbox | Panel key | Renderer |
|---|---|---|---|
| Word by Word | `#wbwShowToggle` | `wordByWord` | `renderWordByWordPanel()` |
| Root | `#rootsToggle` | `root` | `renderRootPanel()` |
| Derivatives | `#derivativesToggle` | `derivatives` | `renderDerivativesPanel()` |

They appear in **two places**, assembled by **two different code paths**:

```
READ VIEW                                   NOTE VIEW
app/quranrevival.html                       app/quranrevival.html (L10328-10330)
  ├ flow mode      L9155-9195                 builds wbwHtml / rootsHtml / derivativesHtml
  └ single-āyah    L11461-11470               as STRINGS, then hands them to
        │                                            │
        └─ renderLayoutA(ayah, panels, opts)         └─ renderNoteView({ wbwHtml, … })
               │  app/js/ayah-renderer.js                  app/js/ayah-note-renderer.js
               ▼                                                  │  L554-574
       PANEL_RENDERERS[key](ayah, opts)  ◀─────────────────────────┘
               │
               ├── renderWordByWordPanel()
               ├── renderRootPanel()
               └── renderDerivativesPanel()
```

Both paths end in the same three functions, so the markup is identical; only
the surrounding chrome differs (the Note view wraps each panel in a labelled,
collapsible `.note-field`).

---

## MAPPING 1 — the Word by Word panel

Rendered as an RTL flex strip of LTR chips.

```html
<div class="wbw-strip">
  <div class="wbw-word" data-position="1">
    <div class="wbw-arabic" dir="rtl" lang="ar">بِسْمِ</div>
    <div class="wbw-translit">bis'mi</div>
    <div class="wbw-gloss">In (the) name</div>
    <div class="wbw-gloss wbw-gloss-bn" lang="bn">নামে</div>
  </div>
  …
</div>
```

| SCREEN ELEMENT | UI COMPONENT | DATA FIELD | DATA SOURCE |
|---|---|---|---|
| The strip itself | `renderWordByWordPanel()` · `.wbw-strip` | `ayah.words[]` | `output/surahs/surah_NNN.json` → `ayahs[].words` |
| One word chip | `.wbw-word` | — | array element |
| Arabic word | `.wbw-arabic` | `word.arabic` | quran.com v4 `text_uthmani` |
| Transliteration | `.wbw-translit` | `word.transliteration` | quran.com v4 `transliteration.text` — **suppressed unless the resolved languages include `en`** |
| English gloss | `.wbw-gloss` | `word.translation.en` | quran.com v4 `?language=en` |
| Bangla gloss | `.wbw-gloss.wbw-gloss-bn` | `word.translation.bn` | quran.com v4 `?language=bn` |
| (invisible) position hook | `data-position` attribute | `word.position` | quran.com word position — **read by nothing** |
| Empty state | `.wbw-empty` | — | `t("No word-by-word data for this ayah.")` — never fires; all 6,236 āyahs have words |

**Which language(s) appear** is decided by `wbwLangs()` in
`app/quranrevival.html` L9090:

```js
function wbwLangs() {
  if (wbwLangMode === "en")   return ["en"];
  if (wbwLangMode === "bn")   return ["bn"];
  if (wbwLangMode === "both") return ["en", "bn"];
  return translationLangs();          // "auto" — follows the āyah translation choice
}
```

`wbwLangMode` comes from `#wbwLangSelect` (L3461) and is **not persisted**
(see G-12).

**Styling** — `app/quranrevival.html` L1772-1783. Note the deliberate
direction handling: the *strip* is `direction: rtl` so chips read
right-to-left; each *chip* is `direction: ltr` so its transliteration and
gloss lines read correctly; the Arabic lines carry their own `dir="rtl"` from
the renderer.

---

## MAPPING 2 — the Root panel

```html
<div class="root-deriv-strip root-panel">
  <div class="root-row" data-position="1">
    <div class="root-word" dir="rtl" lang="ar">بِسْمِ</div>
    <div class="root-root" dir="rtl" lang="ar">سمو<span class="root-count">381×</span></div>
  </div>
  …
</div>
```

| SCREEN ELEMENT | UI COMPONENT | DATA FIELD | DATA SOURCE |
|---|---|---|---|
| The strip | `renderRootPanel()` · `.root-deriv-strip.root-panel` | `ayah.words[]`, **filtered to `w.morphology?.root`** | surah JSON |
| One row | `.root-row` | — | array element |
| The word | `.root-word` | `word.arabic` | quran.com v4 |
| Root letters | `.root-root` | `word.morphology.root` | Quranic Arabic Corpus `ROOT:` (Buckwalter → Arabic) |
| Occurrence count | `.root-count` | `word.morphology.rootCount` | computed at build time over the **canonicalised** root key — merges و/ي families (G-09) |
| Count digits | — | `num(rootCount)` | `app/js/i18n.js` — Bengali digits in Bangla |
| Empty state | `.wbw-empty` | — | `t("No morphology data for this ayah.")` |

**Note:** words without a root are dropped from this strip entirely, so its
chip count does not match the Word-by-Word strip's (G-17). The root is plain
text — not a link, not a button, not clickable.

---

## MAPPING 3 — the Derivatives panel

```html
<div class="root-deriv-strip derivatives-panel">
  <div class="root-row" data-position="1">
    <div class="root-word" dir="rtl" lang="ar">بِسْمِ</div>
    <div class="root-pos">Preposition + Noun</div>
    <div class="root-lemma" dir="rtl" lang="ar">ٱسْم</div>
  </div>
  …
</div>
```

| SCREEN ELEMENT | UI COMPONENT | DATA FIELD | DATA SOURCE |
|---|---|---|---|
| The strip | `renderDerivativesPanel()` · `.root-deriv-strip.derivatives-panel` | `ayah.words[]`, filtered to `w.morphology` | surah JSON |
| The word | `.root-word` | `word.arabic` | quran.com v4 |
| Part of speech | `.root-pos` | `posLabel(word.morphology.pos)` | corpus TAG per segment, joined `" + "`, then atom-by-atom through `POS_LABELS` in `app/js/labels.js` and `t()` |
| Lemma | `.root-lemma` | `word.morphology.lemma` | corpus `LEM:` (Buckwalter → Arabic). **Rendered with no label of any kind** |
| *(derived form)* | — | — | **does not exist** (G-01/G-02) |

**The panel's title says "Derivatives"; the data shown is part of speech and
lemma.** See G-02.

---

## MAPPING 4 — the controls that switch the panels on

All three toggles are **screen-wide reading choices**, mirrored in three
places. A change made anywhere takes effect everywhere.

| SCREEN ELEMENT | UI COMPONENT | STATE | PERSISTED? |
|---|---|---|---|
| "Word by Word" tick, Study options | `#wbwShowToggle` (`app/quranrevival.html` L3432) | `.checked` | ✅ via `mm_quran_last_session.settings.wbwOn` |
| "Root" tick | `#rootsToggle` (L3436) | `.checked` | ✅ `…rootsOn` |
| "Derivatives" tick | `#derivativesToggle` (L3444) | `.checked` | ✅ `…derivativesOn` |
| "Word by Word language" select | `#wbwLangSelect` (L3461) | `let wbwLangMode` (L4334) | ❌ **session only** (G-12) |
| Read view `⋮` badge → Word by Word / Root / Derivatives | `renderQuickMenu()` in `ayah-note-renderer.js` L154-156 | flips the same checkboxes | via the checkbox |
| Note view `⋯` menu → same three | `renderNoteView()` L456-458 | flips the same checkboxes | via the checkbox |

The mirroring is implemented in `app/quranrevival.html` L11288-11320:

```js
// ... the SAME canonical wbwShowToggle checkbox Study options uses, rather
// than a second piece of state.
wbwShowToggle.checked = !wbwShowToggle.checked;
```

**All six are disabled while Mushaf view is on** (L11398), with an on-screen
note explaining why (G-22).

---

## MAPPING 5 — the Read view container

```html
<div class="page-flow-ayah" data-ayah="255">
  <div class="ayah-quick-header">…⋮ menu…</div>
  <div class="ayah-flow-body" data-ayah-collapsible-for="ayah:2:255">
    <!-- bismillah heading, if āyah 1 -->
    <!-- renderLayoutA(...) output: text, tajweed, wordByWord, root, derivatives, … -->
  </div>
</div>
```

| SCREEN ELEMENT | UI COMPONENT | DATA FIELD | DATA SOURCE |
|---|---|---|---|
| One āyah block | `app/quranrevival.html` flow renderer L9155 | one element of `ayahs` | surah JSON |
| `⋮` quick menu | `renderQuickMenu(unitKey, …)` | `unitKey`, `hasNote`, `isBookmarked` | `buildUnitKey.ayah()`; `ayahNotes` / `bookmarks` Firestore docs |
| Āyah body | `renderLayoutA(ayah, panels, opts)` | `panels[]` | the Approach's row in `app/js/catalogue-data.js` **plus** the three ticks |
| Bismillah heading | `bismillahHtmlFor(surah, ayah)` | — | a literal; suppressed for surah 1 and surah 9 |
| Arabic + number badge | `renderArabicPanel()` | `ayah.uthmaniText` / `ayah.tajweedText` | surah JSON; number via `digitsForLang(n, "ar")` |
| Translations | `renderTranslationPanel()` | `ayah.translations.{en,bn}` | surah JSON; number via `digitsForLang(n, lang)` |
| Word by Word / Root / Derivatives | as mappings 1–3 | | |

---

## MAPPING 6 — the Note view container

The same three panels, wrapped as labelled collapsible fields
(`app/js/ayah-note-renderer.js` L554-574):

```html
<div class="note-field" data-note-field="wbw">
  <div class="note-field-label-row"><span class="note-field-label">Word by Word</span></div>
  <div class="note-field-body"><!-- wbwHtml --></div>
</div>
```

| SCREEN ELEMENT | UI COMPONENT | DATA FIELD | DATA SOURCE |
|---|---|---|---|
| "Word by Word" field | `.note-field[data-note-field="wbw"]` | `wbwHtml` (a **string**, built by the caller) | `renderWordByWordPanel()` called at `quranrevival.html` L10328 |
| "Root" field | `[data-note-field="root"]` | `rootsHtml` | `renderRootPanel()`, L10329 |
| "Derivatives" field | `[data-note-field="derivatives"]` | `derivativesHtml` | `renderDerivativesPanel()`, L10330 |
| Field labels | `.note-field-label` | `t("Word by Word")` / `t("Root")` / `t("Derivatives")` | `app/js/i18n/bn.js` |
| Per-āyah number badge (multi-āyah scope) | `perAyahPanels()` L10324 | `num(a.ayah)` | prepended only when the scope covers more than one āyah |
| Whether the fields render at all | `canWbwRoot` (L10231) | `noteScopeShowAyatText()` | false for wide scopes (juz/hizb/page), where showing a wall of text was rejected |

Note the shape: **`ayah-note-renderer.js` never sees an āyah object.** It
receives finished HTML strings. That keeps it decoupled, and it is why the
two views' panel assembly has drifted apart in the past.

---

## MAPPING 7 — where a word chip's journey ends

| Interaction | What happens |
|---|---|
| Tap an Arabic word | **nothing** |
| Tap a root | **nothing** |
| Tap `381×` | **nothing** |
| Tap a lemma | **nothing** |
| Tap a part of speech | **nothing** |
| Long-press a word | **nothing** |
| Select/copy a word | browser default only |
| Play a word | **not possible** — audio is āyah-level |
| Note a word | **not possible** — notes are keyed by unit key, smallest `ayah:S:A` |
| Bookmark a word | **not possible** — same reason |
| Claim/track a word | **not possible** — `unit-keys.js` has no `word:` type |
| Search a root or lemma | **not possible** — search is āyah-text only |

**Every arrow in the Word Study system points one way: data → HTML.** Nothing
points back.

---

## The fastest way for a reviewer to see all of this

Open **`app/quranrevival-render-test.html`** on a local static server. It is a
standalone page — no Firebase, no sign-in — that renders
`renderArabicPanel`, `renderTranslationPanel`, `renderWordByWordPanel`,
`renderRootPanel` and `renderDerivativesPanel` against **āyah 2:255**, with a
tajweed toggle and a language switch. It is included in this package's
`relevant_source_code/`.
