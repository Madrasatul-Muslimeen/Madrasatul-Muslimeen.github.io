# AI_APP_REVIEW_PACKAGE

A read-only architectural audit and handover package for the **QuranRevival**
application, prepared for review by a third-party AI architect.

| | |
|---|---|
| **App version** | v08.00 |
| **Prepared** | 6 September 2026 |
| **Repository** | `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io` |
| **Live app** | `https://madrasatul-muslimeen.github.io/app/` |
| **Nature of this work** | **Analysis and documentation only.** No application code was modified, refactored, deleted or rewritten to produce it. |

---

## Contents

| File | What it answers |
|---|---|
| `PROJECT_OVERVIEW.md` | What the app does, the full stack, state management, backend, APIs, datasets, auth, storage, and how it is structured |
| `PROJECT_FILE_TREE.md` | Complete directory tree with per-folder purpose and every folder/file marked by concern (Quran text, surahs, āyahs, word-by-word, morphology, roots, lemmas, translations, audio, grammar, tafsir, UI, DB, APIs) |
| `QURAN_DATA_ARCHITECTURE.md` | Source → import → storage → model → processing → UI, traced against the real code; where every field comes from; how words are identified internally |
| `WORD_STUDY_SYSTEM_AUDIT.md` | Items **A–N** of the review request, each with an explicit status and its exact location in the code |
| `CURRENT_DATA_MODELS.md` | The **actual** structures, copied from the shipped files and the writing modules — eight of them, nothing idealised |
| `WORD_STUDY_RELATED_SOURCE_FILES.md` | Every file involved, with purpose, key functions, dependencies and a dependency graph |
| `DATA_GAPS_AND_INCONSISTENCIES.md` | 23 numbered findings (`G-01`…`G-23`), each measured, plus a list of what is verifiably *not* wrong |
| `SCREEN_TO_CODE_MAPPING.md` | Screen element → UI component → data field → data source, for every visible element |
| `SAMPLE_REAL_WORDS.md` | 20 real Qur'anic words across every grammatical category, showing stored data vs. corpus source vs. what the UI displays |
| `CLAUDE_CODE_SELF_ASSESSMENT.md` | The eight assessment questions, answered honestly |
| `relevant_source_code/` | Verbatim copies of the source files that matter, plus real data samples |

---

## Read in this order

1. **`CLAUDE_CODE_SELF_ASSESSMENT.md`** — the honest summary; its last
   paragraph is the whole package in one place.
2. **`QURAN_DATA_ARCHITECTURE.md`** §1 and §3 — the pipeline, and how a word
   is (and is not) identified.
3. **`WORD_STUDY_SYSTEM_AUDIT.md`** — the A–N status table.
4. **`DATA_GAPS_AND_INCONSISTENCIES.md`** — the findings.
5. **`SAMPLE_REAL_WORDS.md`** — the findings made concrete on 20 real words.

---

## The three facts that shape everything else

1. **All Qur'an content is static.** It was fetched once (1 Aug 2026), merged
   into 114 JSON files (27 MB), and committed to the repository. The running
   app never calls a Qur'an API and never stores Qur'an text in the database.
2. **The word data is complete; the word *model* is not.** 77,429 words with
   zero gaps in Arabic, transliteration, English gloss or Bangla gloss — but
   the build script reduced a 128,219-row morphology source to four fields per
   word, discarding tense, mood, voice, person, gender, number, case,
   definiteness, prefix/suffix segmentation and derived form.
3. **A word is not an entity in this system.** There is no word ID, no word
   index, no word click handler, and no `word:` unit key. The smallest thing
   the platform can track, note, bookmark or report on is one **āyah**.

---

## How to see the Word Study output for yourself

`relevant_source_code/quranrevival-render-test.html` is a standalone page from
the app that renders all four āyah panels against **āyah 2:255** with **no
Firebase and no sign-in**. Served from the repository root over any static
server, it is the fastest way to see the entire Word Study system on one
screen.

---

## Verification note

Every count in this package was **measured**, not estimated:

- Coverage figures come from parsing all 114 shipped surah files.
- The gap findings (G-01, G-03, G-04, G-05, G-06, G-07, G-09) were verified by
  downloading the upstream Quranic Arabic Corpus file the build script uses
  and re-deriving every one of the 77,429 words at its own
  `(surah:ayah:position)`, then comparing field by field with what ships.
- Line numbers refer to the files as at v08.00.

---

## Security

Deliberately **excluded** from this package: `app/js/firebase-init.js` (it
carries the Firebase web configuration), `.env` files (none exist),
credentials, tokens, signing certificates, and any private user data. **No
Firestore data of any kind is included** — every data sample here is public
Qur'an content. `firestore.rules` is described but not reproduced.
