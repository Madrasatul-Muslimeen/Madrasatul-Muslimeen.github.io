# CLAUDE_CODE_SELF_ASSESSMENT.md

An honest technical assessment of the existing Qur'an Word Study system,
written by the assistant that has built most of this codebase over ~140
rounds. It is deliberately blunt where being blunt is useful. **Nothing was
changed to produce it.**

The eight questions asked, answered in order.

---

## 1. What is already well built?

**a) The data acquisition is complete and honest.** 6,236 āyahs, 77,429
words, and **zero missing values** in Arabic, transliteration, English gloss
or Bangla gloss. `manifest.json` records provenance, counts and failures
(`"failures": []`). The build script validates the corpus before using it —
it refuses a download with fewer than 97 % of expected rows or fewer than 114
chapters. That is more rigour than most hobby Qur'an projects show.

**b) Full Bangla word-level glossing across the entire Qur'an.** This is
genuinely uncommon and it is complete. For the app's actual audience it may
be the single most valuable asset in the project.

**c) `app/js/quran-data.js` is a model data layer.** One file, no imports,
one `BASE_URL` constant, per-surah lazy loading, two cache layers, and a
failed fetch is never cached so a retry can succeed. It is the only module
that touches the Qur'an store, and that boundary has held across a hundred
rounds.

**d) `posLabel()` is the best-designed piece of the Word Study system.**
45 table entries express all 359 part-of-speech combinations present in the
data, in both languages, by splitting on `+` and translating atom by atom.
Raw corpus codes (`RES`, `PREV`, `IMPV`, `AVR`…) are expanded into real
words, so English readers gain as much as Bangla ones. Unknown atoms print
unchanged rather than blank — which is why the one corrupt value in the data
degrades gracefully instead of crashing. **This is the right shape and should
be the template for every extension.**

**e) The renderer layer obeys its own rules.** `ayah-renderer.js` is 230
lines, imports only `i18n.js` and `labels.js`, holds no state, touches no
Firestore, and returns strings. The dependency graph is acyclic. `renderLayoutA`
+ `PANEL_ORDER` + the Approach's `panels[]` means "adding Approach 31 is a row
of data, not a build" — and that claim is true.

**f) Bilingual correctness is taken seriously in places most projects miss.**
`digitsForLang()` renders a block's number in **that block's own script** —
Arabic-Indic beside the Arabic, Bengali beside the Bangla — regardless of the
app's current language. The word-by-word strip is `direction: rtl` while each
chip is `direction: ltr`, so word order and chip internals are both right.
The Latin transliteration is deliberately suppressed in Bangla-only mode
because it is unreadable to that reader.

**g) Security hygiene in the one place it matters.** `tajweedRawToSafeHtml()`
escapes everything and then re-expands **only** the exact quran.com tag
whitelist; every other string goes through `escapeHtml()`. The backup exporter
sanitises stored note HTML down to a tag list with **all attributes dropped**.

**h) The load-speed contract is real and enforced.** 6 sequential round trips
/ 9 Firestore calls on the Qur'an screen, re-measured with a checked-in tool
every round. The search indexes, boundary tables, mushaf layout and reciter
timing maps are all fetched **on first use** and cached — an established,
proven pattern that any new word data should follow.

---

## 2. What is incomplete?

Ranked by how much it costs the app's stated purpose.

**a) The word is not an entity.** `unit-keys.js` has twelve unit types and no
`word`. A word cannot be claimed, confirmed, noted, bookmarked, collected,
searched, counted or reported on. Everything else follows from this.

**b) Derived forms do not exist.** 8,977 words carry a verb Form (II–XII) in
the source; `pull.js` never reads it. The panel labelled **"Derivatives"**
shows part of speech and lemma. **The label is wrong in both languages, on a
teaching app.** That is the finding I would put first in front of the owner.

**c) Roughly 50,000 corpus segment rows were discarded** — tense, mood, voice,
person, gender, number, case, definiteness, prefix/suffix segmentation, and
attached-pronoun identity. Most visibly: **1,876 imperatives display as
"Verb"**, and all 19,356 verbs are tenseless on screen.

**d) 710 word instances (0.92 %) carry another homograph's morphology**,
because the build matches words by diacritic-stripped form — so مَن ("who")
can be given the data of مِن ("from"), and يَعْلَمُونَ ("they know") is given
the lemma of عَلَّمَ ("he taught"). The positional fallback the code treats as
a last resort is, measured, **correct in 100 % of cases**; the clever matching
step is the only source of the errors.

**e) The root leads nowhere.** `rootCount` says "381×" and there is no way to
see those 381 places. `renderRootPanel()`'s own comment names the intended
solution — `roots-index.json` — which was never built and has no builder.

**f) Nothing is clickable.** `data-position` is emitted on every chip and read
by nothing. The hook for word interaction exists and was never used.

**g) One preference silently resets.** `wbwLangMode` is a module-scope `let`,
absent from `prefs.js` and from the saved session object, while every control
beside it persists.

**h) No word-level audio, no Bangla-script transliteration, no tafsir at any
level, no grammar teaching content.** Approach 06 "Language Learning (Basic
Grammar)" is a free-text notes box.

---

## 3. What data architecture problems exist?

**Problem 1 — the reduction is lossy, irreversible in the shipped data, and
happens in the wrong place.** `morphDataForWord()` throws away everything but
four fields. The remedy is a re-run of `pull.js`, not an app change. **A
build step that discards more than it keeps is the central architectural
problem here.** The fix is small: keep the segments.

**Problem 2 — there is no word identity.** `(surah, ayah, position)` is
implicit, never materialised, never keyed. Nothing can reference a word.

**Problem 3 — two unjoined word-ID systems.** The mushaf layout has real word
IDs (`"2:255:1"`); the word data has positions. They align in 6,233 of 6,236
āyahs and differ by two in 2:181, 8:6 and 13:37, where the source merges
**بَعْدَ مَا** into one entry. Worse: the mushaf view is the one view where the
word panels are **switched off entirely**. The view with IDs and the view with
data never meet.

**Problem 4 — the unit of transfer is a whole surah.** Fine for reading
(open Al-Baqarah, get all 286 āyahs, cached). Wrong for anything word-shaped:
"show every occurrence of root ك-ت-ب" would need all 114 files, 27 MB.
**There is no index over words, roots or lemmas anywhere.**

**Problem 5 — `rootCount` measures something other than what it displays.**
`canonicalRootKey()` folds و/ي roots together. 423 instances show a
merged-family count under a single root's letters. Defensible pedagogy,
undocumented UI.

**Problem 6 — three renderers, two assembly paths, one 12,027-line file.**
The Read view calls `renderLayoutA()`; the Note view builds the same three
panels separately ~1,100 lines away and passes HTML strings. Real defects have
been fixed in one path and not the other.

**Problem 7 — flattening loses structure that a UI would need.**
`pos: "Resumption Particle + Preposition + Noun"` cannot be mapped back onto
the letters of فَبِأَىِّ. Segmentation was available and was thrown away.

---

## 4. What would become difficult to scale to the entire Qur'an?

**The honest headline: the DATA already scales; the MODEL does not.**

Everything currently displayed works identically for all 6,236 āyahs today.
There is no "works for Al-Fātiḥa, breaks elsewhere" problem. What breaks is
anything that needs to look **across** āyahs.

| Feature | Why it does not scale as things stand |
|---|---|
| "All occurrences of this root" | needs all 114 files (27 MB) or an index that does not exist |
| "All words from this lemma" | same |
| Search by root / lemma / POS | the search index is āyah-text only |
| Vocabulary lists / flashcards | no word identity to store |
| Per-word progress tracking | no `word:` unit key; and 77,429 words × 30 Approaches is 2.3 M possible entries — the current per-surah chunking would not survive it |
| Word-level roll-up into the Mastery Wheel | the wheel reads one unit key; nothing aggregates below āyah |
| Word audio | no timing data at any granularity below an āyah |
| Mushaf word interaction | two ID systems, unjoined, and the panels are disabled there |
| Any richer morphology | **not in the shipped data at all** — requires a re-pull |

**Two things that would scale fine and are worth knowing:**

1. **A root/lemma index is small.** 1,642 distinct roots and 4,832 distinct
   lemmas over 77,429 words. A `roots-index.json` mapping root → occurrence
   list is on the order of 1–3 MB — comparable to the search indexes already
   shipped, and it fits the "fetched on first use, never at startup" pattern
   exactly.
2. **Per-āyah root grouping needs no new data at all.** "Which other words in
   this āyah share this root?" is answerable from the `ayah.words[]` array
   already in memory. It is the cheapest real Word Study feature available.

---

## 5. Are root, lemma and derivatives correctly separated?

**Root and lemma: yes, and cleanly.** They are separate fields, from separate
corpus features, in separate panels, and the relation is consistent —
measured across the whole Qur'an, **no lemma maps to more than one root**.

**Derivatives: no — the concept is conflated with lemma.**

Correct Arabic morphology is four levels:

```
ROOT  ك-ت-ب
   ↓  FORM (I, II, III, IV …)        ← the derivation
LEMMA كَتَبَ / كَاتِب / مَكْتُوب / كِتَاب
   ↓  inflection (person, number, case, mood, attached pronouns)
SURFACE WORD  كَتَبْنَا / ٱلْكِتَـٰبُ
```

The app models level 1 (root), level 3 (lemma) and level 4 (surface), calls
level 3 "Derivatives", and has no representation of level 2 at all.

The consequence is visible in the samples. **ٱلْمُفْلِحُونَ** (2:5) is an
active participle of a Form IV verb, sound masculine plural — the app renders
"Determiner + Noun" and the lemma مُفْلِحُون. **يُؤْمِنُونَ** (2:3) is a Form
IV imperfect with a 3MP suffix — "Verb + Pronoun". In both cases the derived
form, which is exactly what a Word Study feature is *for*, is missing while a
panel bearing its name is on screen.

**This is the naming problem I would fix first**, because it is currently
teaching a wrong equivalence to the students the app exists for.

---

## 6. Can the current system support all Quranic words?

**For what it does today: yes, completely and uniformly.**

- All 77,429 words render.
- No word is missing Arabic, transliteration, English or Bangla.
- All 359 POS combinations are covered by 45 label entries, in both languages.
- The one corrupt value degrades gracefully.
- The renderers have no per-word special cases and no per-surah branches.

**For a real Word Study feature: no**, for four specific reasons:

1. **35.5 % of words have no root** — correctly, but the Root panel silently
   drops them rather than saying so, so a root-centred feature would appear
   broken on every particle.
2. **54.4 % of words are multi-segment**, and the app has no representation of
   a segment. Any feature that highlights a prefix, explains a suffix, or names
   an attached pronoun needs data that is not there.
3. **0.92 % of words carry the wrong morphology**, concentrated on the most
   frequent function words in the Qur'an (رَبِّ, مَن, إِنَّ, أَن, مَا).
   Tolerable as a decoration; not tolerable as the basis of a memorisation or
   testing feature, because the errors cluster exactly where a beginner looks
   most often.
4. **No word can be stored, referenced or tracked.**

---

## 7. What should be preserved?

If someone rebuilds parts of this, these are the pieces that are right and
that later work should be built **on**, not over:

| Preserve | Why |
|---|---|
| **`app/js/quran-data.js` and its per-surah, cache-on-success, single-`BASE_URL` shape** | proven over a hundred rounds; the right seam for adding a lazily-fetched index |
| **The `posLabel()` / `POS_LABELS` atom-table pattern** | 45 entries covering 359 combinations, bilingual, graceful on unknown input. Extend this table; do not replace it |
| **`ayah-renderer.js` as a pure, Firebase-free renderer (invariant I2)** | it is small, acyclic and correct; every limitation it has is inherited from its input |
| **The panel-key system** (`PANEL_ORDER` + `renderLayoutA` + `panels[]`) | new panels are additive by construction |
| **`digitsForLang()` and the RTL-strip/LTR-chip direction handling** | subtle, hard-won bilingual correctness that is easy to break by accident |
| **`tajweedRawToSafeHtml()`'s whitelist** | a real sanitiser; do not relax it |
| **The unit-key grammar in `unit-keys.js`** (invariant I5) | a new `word:` type should be **added** to it, never a parallel scheme |
| **`manifest.json` provenance** | keep recording sources and counts on any re-pull |
| **The complete Bangla word glossing** | the most valuable single asset here |
| **The load-speed contract and `tools/perf/measure.mjs`** | it is the reason the app is fast; any word index must be measured against it |
| **The "fetched on first use" pattern** (search, juz/hizb/page, mushaf, timings) | the ready-made answer to "where does a root index go" |

---

## 8. What should NOT be rewritten unnecessarily?

**Do not rewrite the renderers.** `ayah-renderer.js` is 230 lines and correct.
Adding a derived form, an attached-pronoun name or a tense is **one more line
per panel**, once the data exists. Rewriting it would risk the direction
handling, the digit handling and the sanitiser for no gain.

**Do not re-pull the āyah text or the translations.** They are correct,
complete and cached everywhere. Only the **morphology** merge needs redoing —
and only the last ~40 lines of `pull.js` (`morphDataForWord`,
`resolveWordKey`, `canonicalRootKey`).

**Do not replace the word-by-word source.** quran.com's Arabic,
transliteration and both glosses are 100 % complete. The problem is what
`pull.js` did with the *morphology*, not what quran.com supplied.

**Do not introduce a framework.** No build step is a real asset for a
non-coder owner on a GitHub Pages site: every file is inspectable, revertible
and deployable as-is. A framework would add a build to break and would not fix
a single finding in this package.

**Do not move Qur'an content into Firestore.** It would violate the
architecture's explicit rule, cost money per read, and be slower than a
browser-cached static file.

**Do not build a general-purpose Arabic morphology engine.** The Quranic
Arabic Corpus already contains, for every one of the 77,429 words, everything
the samples in this package showed as missing. The work is a **parsing** job
in a script that already downloads the file, not a linguistics project.

**Do not split `quranrevival.html` as a prerequisite.** It is 12,027 lines and
that is a genuine risk — but it is a separate, large, testable refactor. Making
it a precondition for Word Study work would stall the work that matters. (It
is worth doing on its own terms, later.)

---

## The one-paragraph summary I would give the owner

> The Qur'an data is complete and the code that displays it is clean and
> small. What is thin is the **middle**: the build script threw away about
> four-fifths of what the morphology source actually said — every verb's
> tense, every imperative, every derived form, and which pronoun is attached
> to which word — and kept four fields. On top of that, one shortcut in the
> matching step gives about 710 words (0.9 %) another word's grammar,
> concentrated on the commonest words in the Qur'an. And because a word has
> no identity in the system, nothing can be tapped, searched, saved or
> tracked below the level of an āyah. **None of this needs a rewrite.** The
> renderers are right, the data layer is right, and the missing information
> is already inside a file the build script downloads. The three highest-value
> pieces of work, in order, are: (1) stop discarding the morphology and fix
> the homograph matching — one script, re-run once; (2) rename "Derivatives"
> to what it actually shows, or make it show what its name claims; (3) decide
> whether a **word** should become a trackable unit, because that single
> architectural question decides whether Word Study stays a reading aid or
> becomes a studied subject in its own right — and Approach 04's own written
> measure ("how many of the words you can translate without the panel")
> already assumes the answer is yes.
