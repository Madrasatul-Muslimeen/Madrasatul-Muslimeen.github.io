# Dictionary sources: coverage of the Qur'an's Dictionary Words

2 Oct 2026. Architect research (a measured coverage check). **Nothing was changed in the app.**

Read this with the earlier research, summarised to the Owner on 1 Oct, and with `docs/reports/2026-10-01-dictionary-permission-letters.md`.

## The Owner's decisions so far (1 Oct 2026)

1. English meanings: the Quranic Arabic Corpus (verbs) and Wiktionary.
2. Bangla: ask the publisher for permission, then build it; the Owner writes before publishing. Because the site is already public, the Bangla meanings stay **switched off** until written permission and a digital copy of the text arrive (see the letters file).
3. Lane's Lexicon and Hans Wehr (Hans Wehr as a link only).
4. Ask the Quran Foundation for a licence for the stored quran.com data. That letter is drafted; the address is `developers@quran.com`.

## The lemmas

- **4,832 distinct lemmas** across 74,122 word occurrences (`tools/quran-data-pull/output/lemmas-index.json`).
- 4,657 lemmas have a root; there are 1,642 distinct roots. The 175 lemmas without a root (mostly particles) account for 24,151 occurrences.
- The lemmas are in Arabic script, converted from QAC 0.4 Buckwalter by `BW2AR` in `pull.js`. **The converter is incomplete**:
  - 210 lemmas keep `^` (maddah), 43 keep `#` (hamza above), and a few keep `[` or `@`;
  - some carry a disambiguation digit (`عَاد2`);
  - some verb lemmas are inflected forms (`يَحْزُن`, `مَلَكَتْ`), and some nouns are plurals (`كَٰفِرُون`).
  - Any matching must normalise all of this first. A later round may also want to fix the converter at its source.

## Wiktionary (via kaikki.org; CC BY-SA 4.0)

Matched by headword after normalising, in tiers:

| Confidence | Lemmas | By occurrence |
|---|---|---|
| High: same vowelled headword, an inflection page, or a sound plural reduced to its singular | 2,911 (60.2%) | 79.2% |
| High + medium: medium means the same consonants and a part of speech that fits | 3,519 (72.8%) | 95.6% |
| Any match | 3,722 (77.0%) | 96.5% |

- **Verbs are the weakest group:** 978 of 1,463 at high + medium.
- **The first gloss is often not the Qur'anic sense:**
  - `مَا` gives "what?";
  - `أَقْرَرْ` was matched to قَرَّ, "to be cold";
  - verbal nouns sometimes get the verb's gloss.
  - So a Wiktionary meaning must sit **beside** the word's own meaning in the āyah, never replace it.
- **Notable misses:** `رَءَا` (271 occurrences; Wiktionary spells it رَأَى), `ءَالَا^ء`, `ثَمُود`.
- **Licence:** CC BY-SA 4.0. Any screen that shows a Wiktionary meaning must credit Wiktionary and name the licence.

## Quranic Arabic Corpus (corpus.quran.com)

- **Verbs:** one gloss per verb form (e.g. "Verb (form IV) – to believe").
- **Nouns and participles:** no lemma gloss, only the word-by-word glosses beside each verse.
- **Coverage is inferred, not measured:** every rooted lemma should have a root page (`qurandictionary.jsp?q=<Buckwalter root>`).
- **Terms:**
  - The data is GPL, with extra terms for the download: verbatim copies only, with attribution and a link.
  - Nothing separate is stated for the website's glosses, so **copying them is uncertain**.
  - **Recommended:** a link to the root page instead of copied text.

## Lane's Lexicon and Hans Wehr (ejtaal.net, the Arabic Almanac)

- **The index:** `https://ejtaal.net/aa/mawrid-indexes.js` lists the first root on each scanned page:
  - Hans Wehr: 1,318 pages;
  - Lane's Lexicon: 3,078 pages;
  - Lane supplement: 86 pages.
- **Coverage:** a binary search places all 1,642 roots on a page.
- **Links:**
  - Open the site at a root: `https://ejtaal.net/aa/#q=<root>`.
  - Open it at given pages: `#hw4=<i>,ll=<i>`.
- **Licence:**
  - None is stated for the index.
  - Lane (1863–93) is public domain.
  - Hans Wehr's 4th edition is still in copyright, and the site hosts scans of it.
  - **Recommended:** one link that opens the site at the root, copying no index and storing no page numbers.

## Waiting on the Owner

1. **Wiktionary meanings:** show the sure matches only, or the likely ones too, with the āyah's own meaning always underneath? The Architect recommends both.
2. **Quranic Arabic Corpus:** a link to its page rather than copied verb meanings? Recommended.
3. **Lane / Hans Wehr:** one link that opens ejtaal.net at the root? Recommended.

Then a demo on the Word card (Depth) before any building.

## The working files

These are in the Architect's scratch area, outside the repository. A build round re-creates them from these scripts:

- `build_lemmas.py`, `norm.py`, `match_wikt.py`, `ejtaal.py`;
- the outputs `lemmas.json` and `coverage-{wiktionary,qac,ejtaal}.json`;
- a 22 MB slim copy of the kaikki download.

Before the build round, the scripts should be committed under `tools/dictionary-pull/`.
