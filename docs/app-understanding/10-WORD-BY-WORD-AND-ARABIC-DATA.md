# 10 — Word-by-Word and Arabic Data

QuranRevival v08.02 · **what exists versus what is only named**

---

## 0. The headline, up front

```
The Word-by-Word system is READ-ONLY DISPLAY.

There is no word click, no word selection, no word identifier, no word-level
progress, and no cross-ayah word view. Three per-ayah panels render strips of
chips from data already in memory. That is the entire system.
```

---

## 1. The three components — all of them

All three live in `app/js/ayah-renderer.js` (230 lines), are **pure renderers**
(invariant I2 — HTML in, HTML out, never touching Firebase), and each takes a
single `ayah` object and maps over its `words[]`.

| # | Component | Line | Renders | Filters |
|---|---|---|---|---|
| 1 | `renderWordByWordPanel(ayah, {langs})` | 113 | Arabic + transliteration + gloss chips | none |
| 2 | `renderRootPanel(ayah)` | 155 | word + root + `rootCount` badge | **`.filter(w => w.morphology?.root)`** — rootless words are dropped |
| 3 | `renderDerivativesPanel(ayah)` | 177 | word + part-of-speech + lemma | `.filter(w => w.morphology)` |

Each returns an empty-state string when there is nothing to show
(`"No word-by-word data for this ayah."` / `"No morphology data for this ayah."`).

### The emitted markup

```js
// renderWordByWordPanel — app/js/ayah-renderer.js:135
return `<div class="wbw-word" data-position="${w.position}">
  <div class="wbw-arabic" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  ${translit}
  ${glosses}
</div>`;
```

```js
// renderRootPanel — :160
`<div class="root-row" data-position="${w.position}">
  <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  <div class="root-root" dir="rtl" lang="ar">${escapeHtml(w.morphology.root)}<span class="root-count">${num(w.morphology.rootCount)}×</span></div>
</div>`
```

```js
// renderDerivativesPanel — :182
`<div class="root-row" data-position="${w.position}">
  <div class="root-word" dir="rtl" lang="ar">${escapeHtml(w.arabic)}</div>
  <div class="root-pos">${escapeHtml(posLabel(w.morphology.pos))}</div>
  ${w.morphology.lemma ? `<div class="root-lemma" dir="rtl" lang="ar">${escapeHtml(w.morphology.lemma)}</div>` : ""}
</div>`
```

---

## 2. Word click behaviour — **there is none**

**Verified three independent ways:**

1. **No click handler anywhere in the application references a word.** A grep for click listeners mentioning word/wbw/position/root/lemma returns only the three *panel toggles* in `ayah-note-renderer.js:802–804` (`data-qm-wbw`, `data-qm-roots`, `data-qm-derivatives`), which switch whole panels on and off.
2. **`.wbw-word` carries no pointer cursor** in any stylesheet. Its only rule is a border/padding declaration at `quranrevival.html:1789`. It is not presented as clickable.
3. **`data-position` is emitted but nothing listens to it.** All three panels stamp it; no selector anywhere reads it back.

**So a word cannot be selected, tapped, looked up, bookmarked, claimed, or
navigated to.** The smallest interactive object in the application is the
**ayah**.

---

## 3. What is displayed per word

| Datum | Panel | Source field | Coverage |
|---|---|---|---|
| Arabic surface form | WbW, Root, Derivatives | `words[].arabic` | 100% |
| Transliteration | WbW | `words[].transliteration` | 100% (Latin only) |
| English gloss | WbW | `words[].translation.en` | 100% |
| Bangla gloss | WbW | `words[].translation.bn` | 100% |
| **Root** | Root | `words[].morphology.root` | **64.5%** |
| **Root frequency** | Root | `words[].morphology.rootCount` | field on 100% |
| **Part of speech** | Derivatives | `words[].morphology.pos` | 100% |
| **Lemma** | Derivatives | `words[].morphology.lemma` | **95.7%** |

**Nothing else is displayed.** No grammatical features, no derived forms, no
senses, no dictionary link, no occurrence list.

### The transliteration is deliberately hidden in Bangla-only mode

```js
// app/js/ayah-renderer.js:132 — with the reason in the code's own comment
const translit = langs.includes("en")
  ? `<div class="wbw-translit">${escapeHtml(w.transliteration)}</div>`
  : "";
```

The recorded reason: *"the transliteration is a LATIN-script pronunciation aid,
so it belongs with the English side… 'বাংলা only' has to mean only Bangla, and a
Latin line is unreadable to exactly the person this app's Bangla is for."*
**There is no Bangla-script transliteration in the data** — only the Latin one.

---

## 4. "Derivatives" — **a misleading name, documented plainly**

```
The panel called "Derivatives" does not show derivatives.

It shows the PART OF SPEECH and the LEMMA of the SAME word. It never shows
another word, never shows a derived form, and never leaves the current ayah.
```

The file's own comment describes it accurately — *"the word's own DERIVED form:
its part of speech and lemma"* — so the *code* is honest; it is the **label a
user reads** that misleads.

**Real derivational data does not exist in this dataset at all.** The only
relationship available is "shares a root", and even that is not indexed
(see §6). There is no form I/II/III pattern data, no verbal-noun/participle
tree, and no derivation links.

---

## 5. POS display

`posLabel()` (`app/js/labels.js:182`) is the **only piece of linguistic
processing in the entire application**:

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

**Measured facts about POS in this dataset:**

| | |
|---|---|
| Distinct POS strings | **359** |
| Distinct POS **atoms** | **46** |
| Maximum atoms in one string | **5** |
| Occurrences with a **compound** POS | **41,972 — 54.2%** |
| `POS_LABELS` keys defined | **45** |
| Occurrences hitting an unmapped atom | **1** (the Surah 37:130 artefact, doc 09 §7d) |

So the POS mapping is essentially complete, and **compound structure is
understood at display time** (split on `+`, each atom translated) even though it
is stored only as a flat string. Examples: `"Preposition + Noun"` (بِسْمِ),
`"Verb + Pronoun"` (7,440×), `"Determiner + Adjective"`.

---

## 6. Panels, navigation and gating

**The three panels are toggled, never clicked into.** Two surfaces flip the
**same three canonical checkboxes**:

| Surface | Control | Code |
|---|---|---|
| Study options | `#wbwShowToggle`, `#rootsToggle`, `#derivativesToggle` | `quranrevival.html:3445`, `:3449`, `:3457` |
| The reading badge's ⋮ menu | `data-qm-wbw` / `-roots` / `-derivatives` | `ayah-note-renderer.js:802–804` |

The ⋮ menu deliberately flips the canonical checkbox rather than holding its own
state, so a choice made in either place is the same choice.

**Gating**: `canWbwRoot = noteScopeCanWbwRoot()` (`quranrevival.html:9801`),
which is simply `noteScopeShowAyatText()` — the panels appear wherever ayah text
is shown.

```js
// app/quranrevival.html:10352 — how the strips are built
if (canWbwRoot && wbwShowToggle.checked)      wbwHtml = perAyahPanels((a) => renderWordByWordPanel(a, { langs: wbwLangs() }));
if (canWbwRoot && rootsToggle.checked)        rootsHtml = perAyahPanels((a) => renderRootPanel(a));
if (canWbwRoot && derivativesToggle.checked)  derivativesHtml = perAyahPanels((a) => renderDerivativesPanel(a));
```

**`perAyahPanels(...)` is the whole navigation model**: one strip per ayah in the
current view. **There is no cross-ayah or whole-Quran word view anywhere.**

### How the three panels came to be three

Recorded in `ayah-renderer.js:198`: they were originally **one** panel. Shell
round 27 split `rootDerivatives` out of `wordByWord` (the owner's report:
*"should show only WbW, not with the entire derivatives"*), and a later round
split `root` from `derivatives` for the same reason. **An Approach declaring
`wordByWord` now means the words alone**, which is what that name says.

---

## 7. Data sources

All three panels read **the same in-memory object** — the surah JSON already
loaded by `getSurah()` (`app/js/quran-data.js`). **No panel fetches anything, and
no panel touches Firestore.** Full dataset detail in
**09-QURAN-DATA-ARCHITECTURE.md**.

---

## 8. Exists vs. named-but-not-implemented

### Fully implemented and working

| Feature | Evidence |
|---|---|
| Word-by-word Arabic + transliteration + en/bn gloss | `renderWordByWordPanel()`, 100% data coverage |
| Root display with whole-Quran frequency | `renderRootPanel()`, 64.5% coverage |
| POS display with compound-atom translation | `renderDerivativesPanel()` + `posLabel()` |
| Lemma display | in the Derivatives panel, 95.7% coverage |
| Independent toggling from two surfaces | three canonical checkboxes |
| Bilingual glosses with the Latin transliteration correctly suppressed in Bangla | `:132` |

### Named but NOT what the name suggests

| Name | What it actually is |
|---|---|
| **"Derivatives" panel** | POS + lemma **of the same word**. No derivatives anywhere |
| **`rootCount`** | A count over a **merged** root key (final و/ي collapsed), so 19 roots disagree with their own frequency. A display figure, not arithmetic |

### Referenced in code but does NOT exist

| Thing | Evidence |
|---|---|
| **`roots-index.json`** | Named at `ayah-renderer.js:152` as where a root's cross-surah occurrence list "would" come from. **Searched the whole repository — the file does not exist.** The comment describes a planned artefact |

### Built but unused

| Thing | Evidence |
|---|---|
| **The `root` panel** | Declared by **zero** of the 30 Approaches |
| **The `derivatives` panel** | Declared by **zero** of the 30 Approaches |

Verified by importing `APPROACH_TEMPLATES` and counting: only `approach_04`
declares `wordByWord`; nothing declares `root` or `derivatives`. Both are
reachable **only** through the reading screen's own toggles. **Enabling them for
an Approach is a data edit, not code.**

### Absent entirely

| Missing | Consequence |
|---|---|
| A word identifier | no word can be addressed from outside its own render |
| Any word-level index (form / lemma / root → occurrences) | "where else does this word occur" needs all 114 files (27 MB), which the load-speed contract forbids |
| Word click / selection | the ayah is the smallest interactive object |
| Word-level progress | no `word:` unit type; `UNIT_TYPES` has twelve entries and none is `word` |
| Grammatical features (case, mood, voice, verb form, person/number/gender) | **were present in the 2011 corpus and discarded at pull time** — `pull.js:206–215` keeps only root, lemma and POS from 128,011 morphology rows |
| Derivational data | no form patterns, no derivation tree |
| Dictionary / lexicon links | **zero** external references anywhere in the codebase (searched for corpus.quran.com, Lane's Lexicon, Almaany) |
| Bangla-script transliteration | only Latin exists in the data |
| Tenant correction of word data | static public files; no override mechanism, unlike `asmaCollections` for the Names |

---

## 9. Relevant files

| File | Lines | Role |
|---|---|---|
| `app/js/ayah-renderer.js` | 230 | **all three panels** + `PANEL_ORDER`/`PANEL_RENDERERS` |
| `app/js/labels.js` | 192 | `posLabel()` — the only linguistic processing |
| `app/js/quran-data.js` | 170 | the only reader of the static data |
| `app/quranrevival.html` | 12,051 | the three toggles, `perAyahPanels()`, the gate |
| `app/js/ayah-note-renderer.js` | 924 | the ⋮ menu that flips the same toggles |
| `app/quranrevival-render-test.html` | 242 | a standalone harness that renders all three panels for Ayah 2:255 — useful for seeing them in isolation |
| `tools/quran-data-pull/pull.js` | — | where the morphology is merged, and where Level-3 data was dropped |

**`app/arabic-study.html` is NOT word study.** Despite the name, it is the
generic topic renderer for the "Arabic Language" *subject*, claiming `topic:`
units against `studied_arabic`. It contains no word data at all.
