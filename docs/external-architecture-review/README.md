# QuranRevival v08.00 — External Architecture Review Package

Prepared 6 September 2026 for an external architecture reviewer, ahead of
integrating a new Quranic Arabic learning system.

**This package is analysis only. No application code, database structure, UI or
data was modified in producing it.**

---

## Start here

1. **`ARCHITECTURE_REVIEW_SUMMARY.md`** — the whole picture in plain English.
2. Then whichever of Documents 1–11 your question falls under.
3. `code/` holds the real source files, so any claim can be checked directly.

---

## Contents

| Document | Covers |
|---|---|
| `ARCHITECTURE_REVIEW_SUMMARY.md` | **Read first.** Everything, condensed |
| `APPROACHES_ARCHITECTURE.md` | Where the 30 Approaches live, their shape, how one is added, whether 30 is assumed anywhere |
| `STUDY_UNITS_ARCHITECTURE.md` | Ayah / Range / Ruku' / Hizb / Juz / Surah / Whole Quran — identity, boundaries, containment, roll-up |
| `PROGRESS_TRACKING_ARCHITECTURE.md` | The status model, storage, reads and writes, and whether independent tracks are possible |
| `TEACHER_APPROVAL_ARCHITECTURE.md` | The full claim → review → approve/return trace, roles and security rules |
| `EXPLORE_ARCHITECTURE.md` | The Explore module, its levels, toggles and what a new category would cost |
| `EXPLORE_WHEEL_DATA_FLOW.md` | Both wheels traced end to end, and where a coverage figure could connect |
| `QURAN_WORD_DATA_ARCHITECTURE.md` | The word dataset: counts, identity, word-counting methodology, frequency |
| `ARABIC_LINGUISTIC_DATA_ARCHITECTURE.md` | Root, lemma, POS, morphology — what exists and what is missing per level |
| `FIRESTORE_RELEVANT_SCHEMA.md` | Collections, document shapes, relationships, read/write patterns, rules |
| `RELEVANT_CODE_MAP.md` | Every relevant file: purpose, relevance, dependencies, modification risk |
| `FUTURE_ARABIC_INTEGRATION_OPTIONS.md` | Options A, B and C compared **technically only** |
| `DATASET_INVENTORY.md` | Every dataset: path, size, schema, record counts, real samples |

---

## `code/`

Original relative paths are preserved.

```
code/
├── app/js/                    21 ES modules (see below)
├── firestore.rules            all 1,122 lines
├── tools/quran-data-pull/
│   ├── pull.js                the dataset build script
│   ├── build-{juz,hizb,page,search}-index.js
│   └── output/
│       ├── manifest.json      provenance + verified counts
│       ├── surah-index.json   114 rows
│       ├── juz-index.json     30 rows
│       ├── hizb-index.json    60 rows
│       └── surahs/
│           ├── surah_001.json          COMPLETE, unedited (12 KB)
│           └── surah_002_EXTRACT.json  ayahs 1-3 and 255 (real records)
└── extracts/
    ├── EXTRACT__quranrevival.html.txt  7 regions, verbatim, with line numbers
    └── EXTRACT__records.html.txt       4 regions, verbatim, with line numbers
```

**Two HTML files are provided as extracts rather than in full**, because they are
12,027 and 700 lines and mostly contain unrelated UI. **Nothing in an extract is
edited, reordered or summarised** — the original line numbers are printed
against every line so any excerpt can be located in the real file.

---

## Deliberately excluded

| Excluded | Reason |
|---|---|
| `app/js/firebase-init.js` | **Contains the Firebase web client configuration.** Excluded under the no-credentials rule |
| 113 of 114 surah JSON files | 27 MB. Documented in `DATASET_INVENTORY.md`; one full file + one extract provided |
| `search-{en,ar,bn}.json` | 4.4 MB, ayah-level search, unrelated to word learning. Schema + sample documented |
| `page-index.json` | 64 KB; schema + two real rows documented |
| `legacy/`, `legacy-v07/` | Frozen archives of v06.30 and v07.139 — reference only, never edited |
| `mushaf/` | 98 MB of page fonts |
| Finance, Operations, messaging, homework, curriculum modules | Out of scope per the brief |
| `node_modules`, build output, `.env`, keys, tokens | None present, none included |

**No credentials, API keys, tokens, secrets or private configuration appear
anywhere in this package.** Firestore examples are anonymised throughout
(tenant `t1`, people `p1`/`p2`).

---

## How to read the numbers

**Every count, size and percentage in these documents was computed by reading
the real files in the repository**, not quoted from a manifest or remembered.
Where a manifest figure disagrees with the files, both are given and the
discrepancy is explained — see `DATASET_INVENTORY.md` §9 and
`QURAN_WORD_DATA_ARCHITECTURE.md` §9.

Verified headline figures:

| | |
|---|---|
| Approaches | **30** |
| Quran unit types offered | **7** (of 12 declared) |
| Progress statuses | **6** (5 on-ramp + `not_applicable`) |
| Ayahs | **6,236** |
| **Word occurrences** | **77,429** |
| Unique surface forms (NFC) | **21,287** |
| Unique lemmas | **4,832** (95.7% coverage) |
| Unique roots | **1,642** (64.5% coverage) |
| `app/quranrevival.html` | **12,027 lines** |
| `firestore.rules` | **1,122 lines** |
| Cloud Functions | **none** |

---

## Scope note

This package documents **what exists**. It deliberately does not design the new
Arabic learning system, does not choose between curriculum Options A, B and C,
and does not propose a coverage formula. Where a decision is required, the
document says so and states what the code cannot supply.
