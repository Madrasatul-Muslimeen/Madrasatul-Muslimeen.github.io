# The "Needs a source" lines: the data (3 Oct 2026)

Decision 61 (the Owner, 3 Oct 2026): *"No issue with permission, you can build."*
Build the Word card's three "Needs a source" lines from recognised sources, each
credited; the Architect checks each source's licence and says what it is before
release. This is the data half, built by the Architect from the sources in
`2026-10-03-needs-a-source-candidates.md`. The screen half is one Builder round.

## What was built

| Line on the Depth tab | Source | Licence | Files (all loaded on demand, never at startup) | Coverage |
|---|---|---|---|---|
| **Grammar in This Āyah**: what the word does in the whole sentence (iʿrāb) | Quranic Arabic Corpus, Syntactic Treebank (Kais Dukes, Leeds; quran.com team) | **GPL v3**, with the Corpus's condition that its source is named and linked (corpus.quran.com) | `output/word-syntax/surah_NNN.json` (65 files, 2.9 MB; one surah per tap) | Surahs 1–8, part of 9, 59–114: **32,617 of 77,429 words (42%)**. Elsewhere the line stays "needs a source". |
| **Word Choice & Distinctions**: near-synonyms | Abū Hilāl al-ʿAskarī, *al-Furūq al-Lughawiyya*, ed. Salīm (Cairo), OpenITI transcription | **CC BY-NC-SA 4.0** (OpenITI, Romanov & Seydi, doi:10.5281/zenodo.3082463) | `output/furuq-index.json` (488 KB, 129 KB compressed) | 908 entries in the book; **617 linked to 538 Qur'an Dictionary words** |
| **Classical Arabic Usage**: the classical dictionary entry | al-Rāghib al-Iṣfahānī, *al-Mufradāt fī Gharīb al-Qurʾān*, ed. al-Dāwūdī (Dār al-Qalam 1412), OpenITI transcription | **CC BY-NC-SA 4.0** (as above) | `output/mufradat/<1–28>.json` (one per letter, largest 152 KB) | **1,472 of the Qur'an's 1,642 roots (90%)** |

`irab.tsv` (a whole-Qur'an iʿrāb with no named source anywhere) is **not used**; a
check fails if any build script reads it.

## The licences, in plain words

- **GPL v3 (the Corpus).** Free to use in a website or app, provided the source
  is named and linked. The app already uses the Corpus's morphology on the same
  terms. The card must show "Quranic Arabic Corpus" with a link to
  corpus.quran.com wherever a treebank line appears.
- **CC BY-NC-SA 4.0 (OpenITI).** Attribution: name the work, author, edition and
  page, OpenITI and its DOI, and the licence. Non-commercial: MMSA is free, so
  this fits; it would stop fitting if the app were ever sold. Share-alike: the
  two derived files carry the same licence, and say so in their `source` block.
  The medieval texts are public domain; the edition's page numbers and the
  transcription are what OpenITI licenses.
- **Translation.** None is shown. A machine translation of a classical quotation
  would be a generated quotation, which the Owner's own wording rules out ("No
  unattributed example or generated quotation will be shown"). The Arabic is
  shown as the book has it, with its page.

## How each set is kept honest

- **Treebank.** Aligned to the app's words by the same exact-skeleton rule as
  the Word card's other Corpus data. The relation and phrase names are the
  Corpus's own (corpus.quran.com/documentation/syntaxrelation.jsp), copied into
  the manifest.
- **al-Furūq.** An entry links to a Dictionary word only when its term names
  exactly one. One grammar rule narrows the field: a term written with ال is a
  noun, so a verb is never meant. Every term that still named two or more (79
  of them, e.g. ذِكْر "remembrance" against ذَكَر "male") was **read and decided
  by hand**, per term or per entry, in `tools/quran-data-pull/furuq-reviewed.json`
  with its reasons. The transcription's own slips (headings run into their first
  sentence, entries started as plain paragraphs, chapter titles) are handled by
  written rules, not by editing the text.
- **al-Mufradāt.** The transcription's headings are unreliable (page breaks make
  false headings mid-word). A heading starts an entry only when it spells a
  Qur'an root, sits in that root's letter-book, and the entry **quotes an āyah
  that contains that root**, re-checked on the final text. Page-break fragments
  are glued back into the entry they came from. 40 real-looking entries that
  quote no āyah of their root are left out rather than guessed.

## Checks

`tools/i18n-verify/needs-a-source-data.mjs`: **35 passed, 0 failed**. Every
expected value is written by hand (treebank lines, the Corpus's documentation,
the books' text). Mutation: removing the "ال means a noun" rule turns it 26/2.
It found one real defect while being written (an al-Mufradāt entry accepted on
text that then went to its neighbour), fixed in the build.

## Review of PR #532 (six findings, all real, all fixed the same day)

A review bot read the merged data and found six defects; each was checked against the data before fixing:
1. `gen`'s direction label followed the Corpus's documentation page, which contradicts the treebank's own edges; it now follows the data.
2. Some al-Mufradāt citations point past a sūra's end ([الأنعام/ 194]); they stay in the text but not in the āyah list.
3. Two-word al-Furūq terms («العالم بالشيء والمحيط به») were cut as run-on text; a heading is now cut only at «أن» or after more than three words, and a phrase links through its head noun.
4. A heading repeated at a page break («الأعلى وفوق», pp. 184–185) made a false entry; dropped.
5. Page-break word fragments passed the quote test (حسب from يحسبون); a heading whose next line starts mid-word is now glued back, never a root.
6. Treebank pieces now carry their place in the app's own segment list (`seg`), since that list splits off ال and the present-tense prefix.

Seven new checks cover them; each fails on the data as first merged.

## Rebuilding

```
node tools/quran-data-pull/build-word-syntax.mjs [syntax.txt] [quranic-corpus-morphology-0.4.txt]
node tools/quran-data-pull/build-furuq.mjs [the OpenITI al-Furūq file]
node tools/quran-data-pull/build-mufradat.mjs [the OpenITI al-Mufradāt file]
```
With no paths each script downloads its source from the URL in its header.
