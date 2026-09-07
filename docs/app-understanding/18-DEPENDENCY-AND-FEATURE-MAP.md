# 18 — Dependency and Feature Map

QuranRevival v08.02 · the real, discovered dependency graph

---

## 1. The whole application

```
                        ┌───────────────────────────┐
                        │  firebase-init.js         │
                        │  Auth + Firestore + cache │
                        └─────────────┬─────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     ┌────────────────┐      ┌────────────────┐     ┌──────────────────┐
     │ session-context│      │ collections.js │     │  envelope.js     │
     │ tenant/role    │      │ every name     │     │  I17 on writes   │
     └───────┬────────┘      └───────┬────────┘     └────────┬─────────┘
             │                       │                       │
             └───────────────┬───────┴───────────────────────┘
                             ▼
                  ┌──────────────────────┐        ┌──────────────┐
                  │   SERVICES           │───────▶│  errors.js   │
                  │   records · catalogue│        │  safeWrite   │
                  │   activity · bookmarks│       │  (I15)       │
                  └──────────┬───────────┘        └──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   28 HTML PAGES      │
                  └──────────┬───────────┘
                             │  (I2: data in, markup out)
                             ▼
                  ┌──────────────────────┐
                  │   PURE RENDERERS     │───▶ labels.js ───▶ i18n.js
                  │   never touch Firebase│                    lang.js
                  └──────────────────────┘
```

## 2. Quran Reader — the requested shape, filled in

```
Quran Reader  (app/quranrevival.html — 12,051 lines)
│
├── Quran Data ─────────── js/quran-data.js
│                            └── static JSON, 31 MB, HTTP only
│                                surahs/*.json · surah-index · juz-index
│                                hizb-index · page-index · search-{en,ar,bn}
│
├── Word-by-Word ───────── js/ayah-renderer.js
│      ├── renderWordByWordPanel()  :113
│      ├── renderRootPanel()        :155
│      └── renderDerivativesPanel() :177 ──▶ js/labels.js posLabel()
│           (read-only — NO word click anywhere)
│
├── Approaches ─────────── js/catalogue.js getTrackables()
│                            └── Firestore `trackables`
│                                 seeded from js/catalogue-data.js
│
├── Study Units ────────── js/unit-keys.js buildUnitKey
│                            └── currentUnitInfo()  :4806
│
├── Reading tools ──────── js/audio-player.js · js/hifz-renderer.js
│                          js/text-size.js · js/splash.js
│
└── Note view ──────────── js/ayah-note-renderer.js
                             ├── js/ayah-notes.js  (Firestore `ayahNotes`)
                             ├── js/note-popup.js
                             └── js/way-modal.js  (Track/Guide/Breakdown/Coverage)

Progress
│
├── Claims ─────────────── js/records.js claimStatus()  ← THE single write path
│                            ├── chunkKeyFor()             :52
│                            ├── computeConfirmationRequired() :124
│                            ├── js/envelope.js  (I17)
│                            └── js/errors.js safeWrite()  (I15)
│                                  └── js/activity.js logActivity()  (I3)
│
├── Approval ───────────── js/records.js confirmEntry / returnEntry / 4 bulk fns
│                            └── app/records.html   ← the ONLY UI
│                                 ⚠ affects NO wheel and NO Explore colour
│
├── Explore ────────────── inside app/quranrevival.html  :6094–:7122
│                            ├── ensureExploreChunksLoaded()  ≤115 reads
│                            ├── buildExploreWiderSpans()
│                            ├── effectiveAyahStatus()   MAX ↓
│                            ├── poolCoverageStatus()    MIN ↑
│                            └── ayahCoverage()  ← the containment primitive
│
└── Wheel ──────────────── js/mastery-wheel.js  (PURE — no Firebase)
                             ├── renderScopedWheel()   360 / items.length
                             ├── STATUS_COLORS         six fills
                             ├── renderWheelSidebar()  ← section headings (v08.02)
                             └── renderWheelLegend()
```

## 3. Who depends on `records.js`

```
                        js/records.js  (claimStatus)
                               ▲
     ┌──────────┬──────────┬───┴────┬──────────┬──────────┬──────────┐
     │          │          │        │          │          │          │
quranrevival  records   topic-   routine-   asma-     self-      monitor.js
  .html×3     .html     study.js  study.js   study.js  check.js   (reads only)
```

**Nine write call sites, one function.** Any change to `claimStatus()`'s
signature or behaviour reaches every module in the application.

## 4. Who depends on `catalogue.js` / `getTrackables()`

```
                     js/catalogue.js  getTrackables()
                               ▲
   ┌────────────┬──────────────┼──────────────┬────────────┬──────────┐
quranrevival  records      catalogue      monitor.js    backup.js   topic-/
  .html       .html         .html                                   routine-/
 (the wheel) (the table)  (the editor)                              asma-study.js
```

**Returns all 39 trackables** — the 30 Approaches *and* the 9 module-wide ones.
Callers filter. **This shared return caused a real v08.01 hazard**: a flat
position picker would have renumbered trackables in modules the owner was not
looking at. Ordering is now scoped to the Quran set.

## 5. The four renderer families

```
  MODULE                       RENDERER      CONTROLLER              PAGES
  ────────────────────────────────────────────────────────────────────────
  quranrevival                 "ayah"        inline (12,051 lines)   1
  deen · arabic · hadith
  general · naturelife
  lifeskill                    "topic"       topic-study.js          6
                                              └─ topic-renderer.js
  health · ldog                "routine"     routine-study.js        2
  asma                         "asma"        asma-study.js           1
                                              └─ asma-renderer.js
```

```
    deen-study.html ─┐
   arabic-study.html ├─▶ initTopicStudyPage({moduleId, trackableId, rootSubjectId})
   hadith-study.html ├─▶       │
  general-study.html ├─▶       ├─▶ topic-renderer.js   (pure)
naturelife-study.html├─▶       ├─▶ catalogue.js        (subject tree)
     life-skill.html ─┘        ├─▶ records.js          (claims)
                               └─▶ way-modal.js        (pure)
```

**Six pages, one controller, ~149 lines each.** The best structural pattern in
the codebase.

## 6. The pure-renderer boundary (I2)

```
   ┌──── NEVER import Firebase ────┐        ┌──── DO import Firebase ────┐
   │  mastery-wheel.js             │        │  records.js                │
   │  way-modal.js                 │        │  catalogue.js              │
   │  ayah-renderer.js             │        │  activity.js               │
   │  ayah-note-renderer.js        │        │  bookmarks.js              │
   │  topic-renderer.js            │        │  people.js · invites.js    │
   │  asma-renderer.js             │        │  monitor.js · homework.js  │
   │  hifz-renderer.js             │        │  qcr.js · asma-collections │
   │  nav.js                       │        │  backup.js · taglines.js   │
   │  labels.js                    │        │  identity.js · grades.js   │
   │  backup-file.js               │        │  curriculum.js · domains.js│
   └───────────────┬───────────────┘        └─────────────┬──────────────┘
                   │                                      │
                   └────────── HOST PAGE owns both ───────┘
```

**`labels.js` is what makes the boundary hold.** `confirmStateLabel` and
`activityActionLabel` were **moved** there and re-exported, so a pure renderer
can print them without pulling in Firebase.

## 7. Static-data dependency chain

```
tools/quran-data-pull/pull.js
   ├── alquran.cloud        → ayah text, translations, juz/page/ruku/manzil/hizbQuarter
   ├── api.quran.com v4     → tajweed text, per-word Arabic/translit/en/bn
   └── Quranic Arabic Corpus 2011 → root, lemma, POS
                    │   (128,011 rows in; root/lemma/POS out — the rest DISCARDED)
                    ▼
        output/surahs/*.json  (27 MB, 114 files)
                    │
        ┌───────────┼──────────────┬────────────────┐
        ▼           ▼              ▼                ▼
  build-juz-   build-hizb-   build-page-    build-search-
   index.js     index.js      index.js        index.js
   (30 rows)    (60 rows)     (604 rows)    (3 × 6,236)
        └───────────┴──────────────┴────────────────┘
                    ▼
            app/js/quran-data.js   ← the ONLY reader
                    ▼
     ayah-renderer · quran-search · Explore · the unit pickers
```

## 8. The rules-support mirrors

```
  Firestore rules CANNOT run a query — only get()/exists() on a fixed path.
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      tenantMemberUids                teacherStudentLinks
      uid → { tenantId,               {t}__{teacher}__{student}
              personId, roles }        = "actively co-enrolled"
              │                               │
              ▼                               ▼
      hasRoleIn() · isOwnerIn()        isCoEnrolledTeacherOf()
      canAdminIdentity()                        │
              └──────────────┬───────────────────┘
                             ▼
                      canRecordFor(tenantId, personId)
                             │
        ┌────────────┬───────┴────────┬──────────────┐
        ▼            ▼                ▼              ▼
     records     activity        bookmarks       ayahNotes
```

**Neither mirror appears in any UI.** Both exist solely so the rules can answer
a question they could otherwise only answer with a query.

## 9. Cross-cutting concerns

```
  EVERY WRITE                          EVERY USER-VISIBLE NAME
  ───────────                          ───────────────────────
  service fn                           {en, bn} object
     ▼                                        ▼
  envelope.js   (I17)                   lang.js langText()
     ▼                                        ▼
  safeWrite()   (I15)                   i18n.js t() + num()
     ▼                                        ▼
  Firestore                             i18n/bn.js (2,293 lines)
     │                                        ▲
     ▼                                  tools/i18n-coverage.mjs
  firestore.rules   (I13)                 (a to-do list, never evidence)
```

## 10. Feature → dependency matrix

| Feature | records.js | catalogue.js | quran-data.js | mastery-wheel.js | firestore.rules | i18n |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Quran Reader | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Approaches | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ |
| Study Units | ✔ | ✘ | ✔ | ✔ | ✘ | ✔ |
| Claims | ✔ | ✘ | ✘ | ✘ | ✔ | ✔ |
| Approval | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Explore | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Wheel | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ |
| Word-by-Word | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ |
| Topic modules | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Monitor | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| Backup | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ |
| People / roles | ✘ | ✘ | ✘ | ✘ | ✔ | ✔ |

**`mastery-wheel.js` depends on nothing** — which is exactly why it is reusable.

## 11. The blast radius, ranked

| Change here | Reaches |
|---|---|
| **`records.js` `claimStatus()`** | **every module** — 9 call sites |
| **`unit-keys.js` `STATUSES`** | **every stored record** — ids are live data |
| **`envelope.js`** | **every write** |
| **`firestore.rules`** | **every read and write** |
| **`collections.js`** | every service |
| **`catalogue.js` `getTrackables()`** | 9 consumers |
| **`quranrevival.html`** | the Quran screen, Note view, both wheels, Explore |
| `mastery-wheel.js` | every wheel — but **it depends on nothing** |
| `catalogue-data.js` | only **new** tenants (existing ones already seeded) |
| `ayah-renderer.js` | the reading panels |
| `i18n/bn.js` | every Bangla surface |
| `topic-study.js` | 6 pages at once |
| `nav.js` | every page's navigation |
