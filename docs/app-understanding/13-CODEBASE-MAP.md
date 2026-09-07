# 13 — Codebase Map

QuranRevival v08.02 · **where to look when changing a feature**

---

## 1. Top-level folders

| Path | Purpose | Edit? |
|---|---|---|
| **`app/`** | **the live application** — 28 pages, 60 modules, 1 stylesheet, fonts | **✔ all work happens here** |
| `tools/` | data pull, verification harnesses, perf, i18n coverage | ✔ |
| `docs/` | this package + the external architecture review | ✔ |
| `legacy/` | **v06.30**, the pre-cutover single-file app (10,146 lines) | **✘ reference only, NEVER edit** |
| `legacy-v07/` | **v07.139**, a frozen `cp -a` of `app/` | **✘ reference only, NEVER edit** |
| `mushaf/` | 604 mushaf page fonts (~98 MB) | rarely |
| `firestore.rules` | 1,122 lines — the only server-side authority | ✔ (deploy separately) |
| `*.md`, `*.html` (root) | the standing brief, changelog, phase status, architecture docs | ✔ |

**Both archives sign in to the same Firebase project and write real data** —
they are runnable history, not screenshots. The version badge is the only thing
on screen that tells them apart.

## 2. Inside `app/`

| Path | Contents |
|---|---|
| `app/*.html` | **28 pages**, 22,207 lines. `quranrevival.html` alone is 12,051 |
| `app/js/*.js` | **60 modules**, 17,539 lines |
| `app/js/i18n/*.js` | 3 files, 2,582 lines — the Bangla catalogues |
| `app/css/shell.css` | the only stylesheet (pages also carry inline `<style>`) |
| `app/fonts/` | bundled Arabic faces |

**Total application: ~42,300 lines.**

## 3. The pages, by size and role

| Page | Lines | Role |
|---|---|---|
| **`quranrevival.html`** | **12,051** | **the Quran screen, Note view, Mastery Wheel and ALL of Explore** |
| `catalogue.html` | 1,546 | catalogue admin — subjects, Approaches (fully editable since v08.01/02), ladders |
| `bookmarks.html` | 1,010 | bookmark management |
| `curriculum.html` | 734 | curriculum units, plan, resources, grades |
| `records.html` | 700 | **the ONLY confirm/return UI** |
| `people.html` | 646 | roster, roles, invites, "View as" |
| `homework.html` | 600 | assign, mark, score |
| `taglines.html` | 524 | tenant taglines |
| `monitor.html` | 486 | reports, CSV export, print |
| `course-offers.html` | 425 | offers + enrolments |
| `migrate.html` | 423 | legacy migration (historical) |
| `classes.html` | 400 | classes + teacher assignment |
| `backup.html` | 298 | export everything to one offline HTML file |
| `asma-study.html` | 289 | Asma ul Husna |
| `quranrevival-render-test.html` | 242 | **a standalone render harness** — the fastest way to see the word panels in isolation |
| `accept-invite.html` | 164 | invite acceptance |
| `about.html` | 158 | feature registry + version |
| **6 topic pages** | ~149 each | `deen-study`, `arabic-study`, `hadith-study`, `general-study`, `naturelife-study`, `life-skill` — **thin shells** |
| **2 routine pages** | ~154 each | `health-study`, `ldog-study` — thin shells |
| `onboarding.html` | 146 | create a tenant |
| `admin-self-check.html` | 133 | F-008 self-verification screen |
| `index.html` | 28 | a redirect stub |

**The nine thin study pages are the codebase's best pattern.** Each is a
~149-line shell whose entire logic is one call:

```js
initTopicStudyPage({ moduleId: "deen", trackableId: "studied_deen", rootSubjectId: "deen_study" });
```

## 4. The modules, grouped by role

### Core services (Firestore-aware)
| File | Lines | Purpose |
|---|---|---|
| `records.js` | 393 | **claims, confirm, return, bulk confirm, chunking** |
| `catalogue.js` | 693 | subjects, trackables, seeding, reorder, sections |
| `activity.js` | 152 | the weekly audit log |
| `bookmarks.js` | 425 | resume + saved |
| `people.js` | 180 | add/edit a person, roles |
| `identity.js` | 173 | tenant + owner bootstrap |
| `invites.js` | 218 | invites with quota |
| `monitor.js` | 225 | report aggregation |
| `homework.js` | 298 | assignments, submissions, teaching notes |
| `course-offers.js` | 336 | offers + enrolments |
| `curriculum.js` | 107 | units + plan |
| `grades.js` | 75 | `personLevels` |
| `resources.js` | — | links/text |
| `domains.js` | 34 | the tag registry |
| `ayah-notes.js` | 127 | per-ayah rich-text notes |
| `qcr.js` | 217 | Ayah Collections |
| `asma-collections.js` | 438 | Names groups + overrides |
| `taglines.js` | 320 | tenant taglines |
| `backup.js` | 310 | reads everything for export |

### Pure renderers (never import Firebase — I2)
| File | Lines | Renders |
|---|---|---|
| `mastery-wheel.js` | 410 | **both wheels**, legend, sidebar, `STATUS_COLORS` |
| `way-modal.js` | 254 | Track / Guide / Breakdown / Coverage |
| `ayah-renderer.js` | 230 | ayah text, translations, **the three word panels** |
| `ayah-note-renderer.js` | 924 | the Note view |
| `topic-renderer.js` | 101 | topic-tree browsing |
| `asma-renderer.js` | 298 | the 99 Names |
| `hifz-renderer.js` | 308 | memorisation view |
| `nav.js` | 329 | the navigation bar |
| `labels.js` | 192 | status / POS / role / confirm-state text |
| `backup-file.js` | 477 | builds the offline HTML backup (no Firebase — testable in plain node) |

### Page controllers
| File | Lines | Drives |
|---|---|---|
| `topic-study.js` | 633 | **6 study pages** |
| `routine-study.js` | 632 | **2 study pages** |
| `asma-study.js` | 985 | `asma-study.html` |
| `self-check.js` | 372 | `admin-self-check.html` |
| `catalogue-repair.js` | 113 | catalogue repair |

### Static data
| File | Lines | Holds |
|---|---|---|
| `catalogue-data.js` | 378 | **the 30 Approaches, 7 sections, 55 subjects, 10 modules** |
| `asma-data.js` | 149 | the 99 Names |
| `asma-collections-data.js` | 156 | ~33 further Names/phrases |
| `quran-data.js` | 170 | **the only reader of the 31 MB static Quran data** |
| `quran-search.js` | 162 | search over the prebuilt indexes |
| `feature-registry.js` | 132 | what is built vs planned |
| `modules.js` | 62 | the platform module registry |

### Infrastructure
| File | Lines | Purpose |
|---|---|---|
| `firebase-init.js` | — | **the only place Firebase is initialised** (carries the client config) |
| `envelope.js` | 99 | I17 envelope on every write |
| `errors.js` | 115 | `safeWrite()` — I15 |
| `collections.js` | 79 | every collection name |
| `session-context.js` | 220 | tenant/role context, "View as", roster scoping |
| `prefs.js` | 713 | all localStorage preferences |
| `i18n.js` | 256 | `t()`, `num()`, `translateStatic()` |
| `lang.js` / `lang-sync.js` | 75 / 139 | `langText()`, language sync |
| `unit-keys.js` | 166 | **unit keys + the six statuses** |
| `study-lock.js` | — | the F-016 handover lock |

### UI utilities
`bar-palette.js` (73) · `drag-reorder.js` (85) · `wheel-resize.js` (85) ·
`text-size.js` (233) · `splash.js` (166) · `note-popup.js` (374) ·
`assign-picker.js` (68) · `bookmark-popover.js` (247) · `bookmark-nav.js` (278) ·
`continue-strip.js` (77) · `audio-player.js` (**1,042**) ·
`asma-wheel-text.js` (213) · `asma-ref-parser.js` (141) · `asma-posters.js` (129)

---

## 5. Feature → File map

**This is the table to use when changing something.**

| FEATURE | MAIN FILES | SUPPORTING FILES |
|---|---|---|
| **Quran Reader** | `app/quranrevival.html` · `js/ayah-renderer.js` | `js/quran-data.js` · `js/hifz-renderer.js` · `js/text-size.js` · `js/audio-player.js` |
| **Approaches** (definition) | `js/catalogue-data.js:222` (`APPROACH_TEMPLATES`) | `js/catalogue.js:152` (seed) · `js/catalogue.js:301` (`getTrackables`) |
| **Approaches** (editing) | `app/catalogue.html` | `js/catalogue.js` — `editCatalogueNode`, `reorderTrackables:561`, `saveApproachSections:641`, `setTrackableStatus:541` |
| **Approach sections** | `js/catalogue.js:602` (`sectionsFromTenantDoc`) · `:641` | `app/catalogue.html:878` (`sectionOf`) · `js/mastery-wheel.js:377` (sidebar headings) |
| **Study Units** | `js/unit-keys.js` | `quranrevival.html:4806` (`currentUnitInfo`) · `js/quran-data.js` (boundary indexes) |
| **Progress Tracking** | **`js/records.js`** | `js/unit-keys.js` (`STATUSES`) · `js/activity.js` · `js/envelope.js` |
| **Claims** | `js/records.js:154` (`claimStatus`) | 9 call sites — see 07 §10 · `js/errors.js` (`safeWrite`) |
| **Approvals** | `js/records.js:201`/`:219` + the 4 bulk fns | **`app/records.html`** — the only UI |
| **Explore** | `app/quranrevival.html:6094`–`:7122` | `js/mastery-wheel.js` · `js/prefs.js` · `js/bar-palette.js` |
| **Wheel** | `js/mastery-wheel.js` | `js/wheel-resize.js` · `js/asma-wheel-text.js` · `quranrevival.html:5701` |
| **Authentication** | `js/firebase-init.js` | each page's own `onAuthStateChanged` |
| **Users / roles / context** | `js/session-context.js` · `js/identity.js` | `js/people.js` · `firestore.rules` · `js/nav.js` |
| **Students / Guardians / Teachers** | `firestore.rules` (`canRecordFor`) | `js/records.js:124` · `js/session-context.js:160` |
| **People admin** | `app/people.html` · `js/people.js` | `js/invites.js` · `app/accept-invite.html` |
| **Word-by-Word** | `js/ayah-renderer.js:113` | `quranrevival.html:3445` (toggles) · `js/ayah-note-renderer.js:802` (⋮ menu) |
| **Roots** | `js/ayah-renderer.js:155` | `tools/quran-data-pull/pull.js` (source) |
| **Lemmas / POS** | `js/ayah-renderer.js:177` | `js/labels.js:182` (`posLabel`) |
| **Translations (Quran)** | `js/ayah-renderer.js` | `tools/quran-data-pull/output/surahs/*.json` |
| **Translations (UI, i18n)** | `js/i18n.js` · `js/i18n/bn.js` | `js/lang.js` · `tools/i18n-coverage.mjs` |
| **Settings / preferences** | `js/prefs.js` | `js/nav.js` (`renderSettings`) · `js/lang-sync.js` |
| **Bookmarks** | `js/bookmarks.js` · `app/bookmarks.html` | `js/bookmark-nav.js` · `js/bookmark-popover.js` · `js/continue-strip.js` |
| **Notes** | `js/ayah-notes.js` · `js/ayah-note-renderer.js` | `js/note-popup.js` |
| **Topic modules (×6)** | `js/topic-study.js` · `js/topic-renderer.js` | the six ~149-line pages |
| **Routine modules (×2)** | `js/routine-study.js` | `health-study.html` · `ldog-study.html` |
| **Asma ul Husna** | `js/asma-study.js` · `js/asma-renderer.js` | `asma-data.js` · `asma-collections.js` · `asma-posters.js` · `asma-ref-parser.js` · `asma-wheel-text.js` |
| **Ayah Collections (QCR)** | `js/qcr.js` · `js/qcr-data.js` | inside `quranrevival.html`'s Explore palette |
| **Monitor / reports** | `js/monitor.js` · `app/monitor.html` | `js/records.js:354` · `js/activity.js` |
| **Homework** | `js/homework.js` · `app/homework.html` | `js/assign-picker.js` |
| **Classes / offers / enrolments** | `js/classes.js` · `js/course-offers.js` | `firestore.rules` (`teacherStudentLinks`) |
| **Curriculum / grades** | `js/curriculum.js` · `js/grades.js` | `app/curriculum.html` · `js/resources.js` |
| **Backup** | `js/backup.js` · `js/backup-file.js` | `app/backup.html` |
| **Search** | `js/quran-search.js` | `search-{en,ar,bn}.json` |
| **Audio** | `js/audio-player.js` | *fetches archive.org — blocked in this sandbox* |
| **Self-check** | `js/self-check.js` | `app/admin-self-check.html` |
| **Quran dataset** | `tools/quran-data-pull/pull.js` | `build-{juz,hizb,page,search}-index.js` |

---

## 6. Where things are NOT

Saves time:

| Looking for | It is **not** where you'd expect |
|---|---|
| Explore | **not** a separate file — inside `quranrevival.html` |
| The Note view's UI | split: rendering in `ayah-note-renderer.js`, wiring in `quranrevival.html` |
| Word-by-word study | **`arabic-study.html` is NOT it** — that is the topic renderer for the Arabic *subject*. Word panels are in `ayah-renderer.js` |
| A router | none — 28 separate pages |
| Cloud Functions | none — everything is client-side |
| A state store | none — `let` + localStorage + Firestore cache |
| A `package.json` | **none anywhere in the repo** |
| Progress roll-ups | not stored — recomputed per render inside `quranrevival.html` |
| The 30 Approaches at runtime | **not** `catalogue-data.js` (that is only the seed) — they are Firestore `trackables` |
