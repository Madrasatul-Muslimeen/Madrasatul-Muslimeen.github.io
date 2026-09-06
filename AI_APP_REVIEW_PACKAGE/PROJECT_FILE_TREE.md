# PROJECT_FILE_TREE.md

Complete directory tree of the project as at **v08.00 (6 September 2026)**.

**Excluded:** `.git/`, `node_modules/` (none exists — the project has no
`package.json`), build/`dist` folders (none exist — there is no build step),
generated caches. Two directories are **collapsed** rather than excluded,
because listing them adds 700 lines of near-identical filenames:
`mushaf/fonts/` (604 files) and `tools/quran-data-pull/output/surahs/`
(114 files). Nothing else is hidden.

## Legend

| Mark | Meaning |
|---|---|
| **[QURAN-TEXT]** | Arabic Qur'anic text lives here |
| **[SURAH]** | surah-level structure / index |
| **[AYAH]** | āyah-level structure / rendering |
| **[WBW]** | word-by-word system |
| **[MORPH]** | Arabic morphology (root / lemma / part-of-speech) |
| **[ROOT]** | root letters |
| **[LEMMA]** | lemma / dictionary form |
| **[DERIV]** | derived-form display (see the audit — it is not what the name implies) |
| **[TRANS-EN]** / **[TRANS-BN]** | English / Bangla translation |
| **[AUDIO]** | recitation audio |
| **[GRAMMAR]** | part-of-speech / grammar labelling |
| **[TAFSIR]** | tafsir — **NOT PRESENT ANYWHERE IN THIS PROJECT** |
| **[UI]** | UI component / renderer |
| **[DB]** | database access layer |
| **[API]** | external API call site |
| **[i18n]** | translation catalogue |

---

## Tree

```
.
|-- .claude/
|   |-- launch.json  (189 B)
|   `-- settings.json  (486 B)
|-- app/
|   |-- css/
|   |   `-- shell.css  (11 KB)
|   |-- fonts/
|   |   |-- README.md  (779 B)
|   |   |-- amiriquran.woff2  (39 KB)
|   |   |-- notonaskh.woff2  (21 KB)
|   |   `-- scheherazade.woff2  (23 KB)
|   |-- js/
|   |   |-- i18n/
|   |   |   |-- asma-names-bn.js  (6 KB)
|   |   |   |-- bn.js  (195 KB)
|   |   |   `-- surah-names-bn.js  (4 KB)
|   |   |-- activity.js  (6 KB)
|   |   |-- asma-collections-data.js  (23 KB)
|   |   |-- asma-collections.js  (20 KB)
|   |   |-- asma-data.js  (13 KB)
|   |   |-- asma-posters.js  (12 KB)
|   |   |-- asma-ref-parser.js  (6 KB)
|   |   |-- asma-renderer.js  (17 KB)
|   |   |-- asma-study.js  (49 KB)
|   |   |-- asma-wheel-text.js  (9 KB)
|   |   |-- assign-picker.js  (3 KB)
|   |   |-- audio-player.js  (50 KB)
|   |   |-- ayah-note-renderer.js  (52 KB)
|   |   |-- ayah-notes.js  (6 KB)
|   |   |-- ayah-renderer.js  (12 KB)
|   |   |-- backup-file.js  (29 KB)
|   |   |-- backup.js  (15 KB)
|   |   |-- bar-palette.js  (3 KB)
|   |   |-- bookmark-nav.js  (13 KB)
|   |   |-- bookmark-popover.js  (12 KB)
|   |   |-- bookmarks.js  (22 KB)
|   |   |-- catalogue-data.js  (33 KB)
|   |   |-- catalogue-repair.js  (5 KB)
|   |   |-- catalogue.js  (22 KB)
|   |   |-- classes.js  (1 KB)
|   |   |-- collections.js  (4 KB)
|   |   |-- continue-strip.js  (3 KB)
|   |   |-- course-offers.js  (17 KB)
|   |   |-- curriculum.js  (4 KB)
|   |   |-- domains.js  (1 KB)
|   |   |-- drag-reorder.js  (4 KB)
|   |   |-- envelope.js  (3 KB)
|   |   |-- errors.js  (5 KB)
|   |   |-- feature-registry.js  (11 KB)
|   |   |-- firebase-init.js  (1 KB)
|   |   |-- grades.js  (3 KB)
|   |   |-- hifz-renderer.js  (14 KB)
|   |   |-- homework.js  (13 KB)
|   |   |-- i18n.js  (11 KB)
|   |   |-- identity.js  (6 KB)
|   |   |-- invites.js  (7 KB)
|   |   |-- labels.js  (7 KB)
|   |   |-- lang-sync.js  (6 KB)
|   |   |-- lang.js  (3 KB)
|   |   |-- mastery-wheel.js  (20 KB)
|   |   |-- modules.js  (2 KB)
|   |   |-- monitor.js  (11 KB)
|   |   |-- nav.js  (19 KB)
|   |   |-- note-popup.js  (16 KB)
|   |   |-- people.js  (7 KB)
|   |   |-- prefs.js  (31 KB)
|   |   |-- qcr-data.js  (10 KB)
|   |   |-- qcr.js  (10 KB)
|   |   |-- quran-data.js  (7 KB)
|   |   |-- quran-search.js  (6 KB)
|   |   |-- records.js  (18 KB)
|   |   |-- resources.js  (2 KB)
|   |   |-- routine-study.js  (31 KB)
|   |   |-- self-check.js  (17 KB)
|   |   |-- session-context.js  (9 KB)
|   |   |-- splash.js  (7 KB)
|   |   |-- study-lock.js  (2 KB)
|   |   |-- taglines.js  (15 KB)
|   |   |-- text-size.js  (10 KB)
|   |   |-- topic-renderer.js  (5 KB)
|   |   |-- topic-study.js  (32 KB)
|   |   |-- unit-keys.js  (7 KB)
|   |   |-- version.js  (502 B)
|   |   |-- way-modal.js  (12 KB)
|   |   `-- wheel-resize.js  (3 KB)
|   |-- about.html  (7 KB)
|   |-- accept-invite.html  (6 KB)
|   |-- admin-self-check.html  (5 KB)
|   |-- arabic-study.html  (7 KB)
|   |-- asma-study.html  (17 KB)
|   |-- backup.html  (15 KB)
|   |-- bookmarks.html  (54 KB)
|   |-- catalogue.html  (49 KB)
|   |-- classes.html  (19 KB)
|   |-- course-offers.html  (21 KB)
|   |-- curriculum.html  (36 KB)
|   |-- deen-study.html  (7 KB)
|   |-- general-study.html  (8 KB)
|   |-- hadith-study.html  (7 KB)
|   |-- health-study.html  (8 KB)
|   |-- homework.html  (31 KB)
|   |-- index.html  (1 KB)
|   |-- ldog-study.html  (8 KB)
|   |-- life-skill.html  (7 KB)
|   |-- migrate.html  (21 KB)
|   |-- monitor.html  (24 KB)
|   |-- naturelife-study.html  (7 KB)
|   |-- onboarding.html  (6 KB)
|   |-- people.html  (29 KB)
|   |-- quranrevival-render-test.html  (15 KB)
|   |-- quranrevival.html  (726 KB)
|   |-- records.html  (33 KB)
|   `-- taglines.html  (23 KB)
|-- legacy/
|   `-- index.html  (996 KB)
|-- legacy-v07/
|       [ FROZEN ARCHIVE - a byte-for-byte cp -a of app/ at v07.139 (105 files, 2.6 MB). Reference only, never edited. Same structure as app/ below. ]
|-- mushaf/
|   |-- fonts/
|   |       [ 604 per-page QCF V2 glyph fonts, p1.woff2 .. p604.woff2 (98 MB total) ]
|   |-- QCF_SurahHeader_COLOR-Regular.woff2  (115 KB)
|   `-- mushaf-madani-v2.json  (2.7 MB)
|-- tools/
|   |-- fonts/
|   |   `-- build-fonts.mjs  (3 KB)
|   |-- i18n-verify/
|   |   |-- fixtures/
|   |   |   |-- README.md  (932 B)
|   |   |   `-- mushaf-pages.json  (8 KB)
|   |   |-- README.md  (11 KB)
|   |   |-- behaviour.mjs  (305 KB)
|   |   |-- firebase-stub.mjs  (23 KB)
|   |   |-- harness.mjs  (2 KB)
|   |   |-- layout.mjs  (5 KB)
|   |   |-- navcheck.mjs  (2 KB)
|   |   |-- panel.mjs  (9 KB)
|   |   |-- probe.mjs  (1 KB)
|   |   |-- reading.mjs  (7 KB)
|   |   `-- tagline-cost.mjs  (3 KB)
|   |-- perf/
|   |   |-- README.md  (4 KB)
|   |   |-- measure.mjs  (9 KB)
|   |   `-- new-tenant.mjs  (3 KB)
|   |-- quran-data-pull/
|   |   |-- output/
|   |   |   |-- surahs/
|   |   |   |       [ 114 files, surah_001.json .. surah_114.json (27 MB total) ]
|   |   |   |-- hizb-index.json  (7 KB)
|   |   |   |-- juz-index.json  (4 KB)
|   |   |   |-- manifest.json  (627 B)
|   |   |   |-- page-index.json  (62 KB)
|   |   |   |-- search-ar.json  (1.3 MB)
|   |   |   |-- search-bn.json  (2.1 MB)
|   |   |   |-- search-en.json  (892 KB)
|   |   |   `-- surah-index.json  (18 KB)
|   |   |-- build-hizb-index.js  (3 KB)
|   |   |-- build-juz-index.js  (3 KB)
|   |   |-- build-page-index.js  (2 KB)
|   |   |-- build-search-index.js  (3 KB)
|   |   |-- pull.js  (14 KB)
|   |   `-- pull.log  (3 KB)
|   `-- i18n-coverage.mjs  (15 KB)
|-- .firebaserc  (58 B)
|-- CHANGELOG.md  (767 KB)
|-- CLAUDE.md  (83 KB)
|-- LAYOUT-BACKLOG.md  (45 KB)
|-- LOAD-SPEED-STATUS.md  (12 KB)
|-- OFFLINE-PLAN.md  (12 KB)
|-- PHASE-0-STATUS.md  (9 KB)
|-- PHASE-1-STATUS.md  (3 KB)
|-- PHASE-10-STATUS.md  (17 KB)
|-- PHASE-11-STATUS.md  (10 KB)
|-- PHASE-13-STATUS.md  (11 KB)
|-- PHASE-2-STATUS.md  (8 KB)
|-- PHASE-3-STATUS.md  (12 KB)
|-- PHASE-4-STATUS.md  (20 KB)
|-- PHASE-5-PARITY-CHECKLIST.md  (8 KB)
|-- PHASE-5-STATUS.md  (90 KB)
|-- PHASE-6-STATUS.md  (12 KB)
|-- PHASE-7-STATUS.md  (20 KB)
|-- PHASE-8-STATUS.md  (7 KB)
|-- PHASE-9-STATUS.md  (16 KB)
|-- QuranRevival_Complete_Architecture.html  (43 KB)
|-- QuranRevival_Parked_Items_Register.html  (24 KB)
|-- QuranRevival_Subject_Catalogue_v3.md  (7 KB)
|-- Start Local Test Server.bat  (101 B)
|-- TRANSLATION-PLAN.md  (28 KB)
|-- firebase.json  (56 B)
|-- firestore.rules  (63 KB)
|-- gtaf_bangla_timestamps.json  (449 KB)
|-- index.html  (510 B)
`-- serve.js  (1 KB)
```

---

## Folder-by-folder purpose

### `app/` — the live application (v08.00). **All work happens here.**

Every screen is a standalone HTML page with its own inline ES module script.
There is no router and no shell page.

| Path | Purpose | Marks |
|---|---|---|
| `app/index.html` | sign-in / landing gate | |
| `app/quranrevival.html` | **12,027 lines.** The Qur'an study screen: Mastery Wheel, Read view (āyah flow / single āyah / Mushaf replica), Note view, Explore navigator, and every Study-option control including the Word by Word / Root / Derivatives toggles | **[AYAH] [WBW] [ROOT] [DERIV] [UI]** |
| `app/records.html` | per-person claim/confirm records table | **[DB] [UI]** |
| `app/monitor.html` | weekly/monthly reports, CSV export, print | **[DB]** |
| `app/catalogue.html` | subject tree + 30 Approaches authoring | |
| `app/backup.html` | one-button export of everything the account can read, as one offline HTML file | **[DB]** |
| `app/{deen,arabic,hadith,general,naturelife,health,ldog,life-skill,asma}-study.html` | the other modules' study screens (topic / routine / asma renderers) | **[UI]** |
| `app/{people,classes,course-offers,curriculum,homework,bookmarks,taglines,about,onboarding,accept-invite,migrate,admin-self-check}.html` | platform screens | |
| `app/quranrevival-render-test.html` | **a standalone harness page that renders all four āyah panels against āyah 2:255 with no Firebase at all** — the fastest way for a reviewer to see the Word Study output | **[WBW] [ROOT] [DERIV] [UI]** |
| `app/css/shell.css` | shared nav/chrome styling | **[UI]** |
| `app/fonts/` | three subset Arabic reading faces (Amiri Quran, Noto Naskh, Scheherazade) | **[QURAN-TEXT]** |

### `app/js/` — ~70 ES modules, served unbundled

**Qur'an data and Word Study (the files this review is about):**

| File | Purpose | Marks |
|---|---|---|
| `quran-data.js` | **The only module that reads the packaged Qur'an files.** `getSurah`, `getAyah`, `getAyahRange`, `getSurahIndex`, `getSearchIndex`, `getJuzIndex`, `getPageIndex`, `getHizbIndex`. Never touches Firestore | **[QURAN-TEXT] [SURAH] [AYAH] [WBW] [MORPH] [DB]** |
| `ayah-renderer.js` | **The Word Study renderer.** `renderWordByWordPanel`, `renderRootPanel`, `renderDerivativesPanel`, plus `renderArabicPanel`, `renderTranslationPanel`, `renderLayoutA`, `tajweedRawToSafeHtml`, `stripLeadingBismillah`, `digitsForLang` | **[WBW] [ROOT] [LEMMA] [DERIV] [GRAMMAR] [AYAH] [UI]** |
| `ayah-note-renderer.js` | The Note view — hosts the same three panels as collapsible fields, plus notes/bookmark/quick menus | **[WBW] [ROOT] [DERIV] [UI]** |
| `labels.js` | `posLabel()` — the 45-entry part-of-speech atom table that turns corpus codes into readable, translatable words. Also `statusLabel`, `confirmStateLabel`, `activityActionLabel`, `roleListLabel` | **[GRAMMAR] [MORPH] [i18n]** |
| `quran-search.js` | whole-Qur'an **āyah-text** search across ar/en/bn. Pure logic, no DOM | **[QURAN-TEXT] [TRANS-EN] [TRANS-BN]** |
| `hifz-renderer.js` | 604-page Madani Mushaf replica from QCF V2 glyph fonts. **Carries a second, independent word ID system (`"1:1:1"`)** | **[QURAN-TEXT] [SURAH] [AYAH] [UI]** |
| `audio-player.js` | 50 KB. Reciters, per-āyah and whole-surah playback, loop, āyah-boundary seeking. **Āyah-level only — no word-level audio** | **[AUDIO] [API]** |
| `text-size.js`, `wheel-resize.js` | reading size controls | **[UI]** |
| `prefs.js` | every `localStorage` preference (`mm_*`), including the Arabic font and translation-language choices | |
| `unit-keys.js` | the unit-key grammar (`ayah:2:255`, `juz:3`, …), the six statuses, `summarizeStatuses`. **There is no `word:` unit type** | **[DB]** |

**Tracking core:**
`records.js` **[DB]**, `activity.js` **[DB]**, `ayah-notes.js` **[DB]**,
`bookmarks.js` / `bookmark-nav.js` / `bookmark-popover.js`,
`mastery-wheel.js` **[UI]**, `catalogue.js` / `catalogue-data.js` (the 30
Approaches and their `panels[]` lists), `collections.js`, `envelope.js`
(the `schemaVersion`/`createdAt`/`updatedAt`/`createdBy` envelope required by
invariant I17), `domains.js`, `resources.js`, `grades.js`, `homework.js`,
`curriculum.js`, `monitor.js`, `feature-registry.js`.

**Identity / access:** `firebase-init.js` **[API]**, `identity.js`,
`invites.js`, `people.js`, `classes.js`, `course-offers.js`,
`session-context.js`, `study-lock.js`, `self-check.js`.

**Other renderers:** `topic-renderer.js`, `routine-study.js`,
`topic-study.js`, `asma-*.js` (9 files — the 99 Names module),
`qcr.js` / `qcr-data.js` (āyah collections).

**Shell:** `nav.js`, `splash.js`, `errors.js`, `note-popup.js`,
`bar-palette.js`, `way-modal.js`, `assign-picker.js`, `continue-strip.js`,
`drag-reorder.js`, `lang.js`, `lang-sync.js`, `i18n.js` **[i18n]**.

**`app/js/i18n/`** **[i18n]** — `bn.js` (195 KB, ~1,531 keyed strings),
`surah-names-bn.js`, `asma-names-bn.js`.

### `tools/quran-data-pull/` — ★ the Qur'an data pipeline

| Path | Purpose | Marks |
|---|---|---|
| `pull.js` | **The single build script for all Qur'an content.** Fetches from alquran.cloud + quran.com v4 + the Quranic Arabic Corpus mirror, merges them per word, writes one JSON per surah. Run once (1 Aug 2026); not part of the app | **[QURAN-TEXT] [WBW] [MORPH] [ROOT] [LEMMA] [GRAMMAR] [TRANS-EN] [TRANS-BN] [API]** |
| `output/surahs/surah_001..114.json` | **27 MB. The entire Qur'an store.** Per āyah: Uthmani text, tajweed text, en+bn translation, juz/page/ruku/manzil/hizbQuarter/sajda, and a `words[]` array with Arabic, transliteration, en+bn gloss and `{root, lemma, pos, rootCount}` | **[QURAN-TEXT] [SURAH] [AYAH] [WBW] [MORPH] [ROOT] [LEMMA] [GRAMMAR] [TRANS-EN] [TRANS-BN]** |
| `output/surah-index.json` | 114 names + āyah counts, for pickers | **[SURAH]** |
| `output/{juz,hizb,page}-index.json` | boundary tables, **computed** from the real per-āyah fields by `build-*-index.js`, never hand-typed | |
| `output/search-{ar,en,bn}.json` | one flat array of 6,236 āyah texts + packed refs, per language | **[QURAN-TEXT] [TRANS-EN] [TRANS-BN]** |
| `output/manifest.json` | provenance: sources, counts, `totalWords: 77429`, `wordsWithRoot: 49971` | |
| `build-{juz,hizb,page,search}-index.js` | the index builders | |
| `pull.log` | the real log of the one pull that produced the data | |

### `mushaf/` — printed-page replica assets

`mushaf-madani-v2.json` (604 pages → lines → words, each word carrying
`loc: "surah:ayah:word"` and a private-use glyph character) plus 604 per-page
`.woff2` fonts and one colour surah-header font. **98 MB, deliberately not
bundled** — fetched over `raw.githubusercontent.com` on first use.
**[QURAN-TEXT] [SURAH] [AYAH]**

### `tools/i18n-verify/` — the test harness

`harness.mjs` stubs Firebase **at the network layer** so the page's own module
script really runs. `behaviour.mjs` (~800 checks), `layout.mjs` (landing-page
regression at 8 viewports × 2 banner states), `panel.mjs`, `reading.mjs`,
`navcheck.mjs`, `probe.mjs`, `tagline-cost.mjs`, plus `fixtures/`.

### `tools/perf/` — `measure.mjs` (round-trip / Firestore-call counter, held at
6 sequential round trips / 9 calls for the Qur'an screen), `new-tenant.mjs`.

### `tools/fonts/` — `build-fonts.mjs`, the Arabic font subsetter.

### `legacy/` — v06.30, the 10,146-line single-file pre-cutover app.
**Reference only — never edited.** Still runnable, still writes real data.

### `legacy-v07/` — v07.139, a byte-for-byte copy of `app/` frozen 6 Sep 2026.
**Reference only — never edited.** Shares the same `/tools/quran-data-pull/output`
Qur'an data and the same Firestore as the live app.

### Repository root — documentation and config

`CLAUDE.md` (the standing brief), `CHANGELOG.md` (round-by-round build log,
v07.01 → v08.00), `QuranRevival_Complete_Architecture.html` (**the source of
truth**: schema, 17 invariants, roles, renderers, unit keys, 15 build phases,
load-speed budget), `QuranRevival_Subject_Catalogue_v3.md` (31 subjects,
30 Approaches), `QuranRevival_Parked_Items_Register.html` (36 deferred items),
`PHASE-*-STATUS.md` (per-phase build logs), `LAYOUT-BACKLOG.md`,
`TRANSLATION-PLAN.md`, `LOAD-SPEED-STATUS.md`, `OFFLINE-PLAN.md`,
`firestore.rules`, `firebase.json`, `serve.js`, `gtaf_bangla_timestamps.json`.

---

## Explicit answers to the requested markings

| Asked for | Where it is | Present? |
|---|---|---|
| **Quran text** | `tools/quran-data-pull/output/surahs/*.json` → `ayahs[].uthmaniText` / `.tajweedText`; `mushaf/mushaf-madani-v2.json` (glyph form) | ✅ |
| **Surahs** | `output/surah-index.json`; one file per surah; `surahNameArabic/English/Translation`, `revelationType`, `ayahCount` | ✅ |
| **Ayahs** | `ayahs[]` inside each surah file; `app/js/ayah-renderer.js`; unit key `ayah:S:A` | ✅ |
| **Word-by-word system** | `ayahs[].words[]` (77,429 entries) → `renderWordByWordPanel()` in `app/js/ayah-renderer.js` | ✅ |
| **Arabic morphology** | `ayahs[].words[].morphology` `{root, lemma, pos, rootCount}` — **a 4-field reduction** of a much richer source | ⚠️ partial |
| **Roots** | `words[].morphology.root` (49,971 of 77,429 words); `renderRootPanel()` | ✅ display only |
| **Derivatives** | **No derived-form (Form I–X) data is stored anywhere.** The panel named "Derivatives" shows part-of-speech + lemma | ❌ |
| **Lemmas** | `words[].morphology.lemma` (74,122 of 77,429); shown inside the Derivatives panel | ✅ |
| **Translations** | `ayahs[].translations.{en,bn}` (āyah level) and `words[].translation.{en,bn}` (word level) | ✅ |
| **Bangla** | `bn.bengali` āyah translation; quran.com `language=bn` word glosses; UI catalogue `app/js/i18n/bn.js` | ✅ |
| **English** | `en.sahih` āyah translation; quran.com `language=en` word glosses; Latin transliteration | ✅ |
| **Audio** | `app/js/audio-player.js` + `gtaf_bangla_timestamps.json`. **Āyah- and surah-level only** | ⚠️ no word audio |
| **Grammar** | `words[].morphology.pos` + `posLabel()` in `app/js/labels.js` | ⚠️ surface only |
| **Tafsir** | — | ❌ **not present anywhere in this project** |
| **UI components** | `app/js/*-renderer.js`, `app/*.html`, `app/css/shell.css` | ✅ |
| **Database** | Firestore via `app/js/{records,activity,ayah-notes,bookmarks,catalogue,collections,envelope}.js`; rules in `firestore.rules` | ✅ |
| **APIs** | build-time: `tools/quran-data-pull/pull.js`. runtime: `app/js/firebase-init.js`, `audio-player.js`, `hifz-renderer.js` | ✅ |
