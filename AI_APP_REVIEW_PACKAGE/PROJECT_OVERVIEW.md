# PROJECT_OVERVIEW.md

**Package:** third-party technical review of the QuranRevival application
**Prepared:** 6 September 2026 · app version **v08.00**
**Scope of this package:** read-only architectural audit. No application code
was modified, refactored or deleted to produce it.

---

## 1. What the app does

QuranRevival is the Qur'an-study module of a **multi-tenant Madrasah study-
tracking platform**. It is live and in real daily use (it stopped being a beta
at the 9 August 2026 cutover), primarily by its owner and their family.

The platform's core idea is **not** "read the Qur'an in an app". It is
**progress tracking against a defined pedagogy**:

- A **subject tree** (Qur'an, Hadith, Arabic, Deen Study, General Study,
  Nature-Life, Health, Life Skill, Asma ul Husna — 31 studiable subjects).
- For the Qur'an subject specifically, **30 "Approaches"** in 7 sections —
  distinct ways of engaging a passage (Reading with Tajweed, Hifz,
  Word-by-Word Meaning, Tadabbur, Deriving Dua, and so on).
- A **study unit** (an āyah, a range, a whole surah, a rukūʿ, a juz, a hizb,
  or a mushaf page) is **claimed** at one of six progress statuses
  (Not started → Learning → Practising → Achieved → Mastered, plus
  Not Applicable which is excluded from totals), **per Approach**.
- A teacher/guardian then **confirms**, **returns**, or leaves the claim
  pending.
- A **Mastery Wheel** visualises, for the current unit, where the student
  stands across all 30 Approaches; an **Explore** navigator rolls those
  claims up across Quran → Juz/Surah → Page/Ruku' → Āyah.

Reading, audio, word-by-word and morphology panels exist **in service of that
tracking model** — they are what a student looks at while working an Approach.
This matters for the review: the Word Study system is currently a *reading
aid attached to an āyah*, not a first-class studied object of its own.

### Main purpose

One sentence: **make "how far has this student actually got, in which way of
studying, on which portion of the Qur'an" answerable and confirmable.**

---

## 2. Technology stack

| Layer | What is actually used |
|---|---|
| Language | **Plain modern JavaScript (ES2020+), ES modules.** No TypeScript anywhere. |
| Framework | **None.** No React/Vue/Svelte/Angular. No JSX. Hand-written DOM + template literals. |
| Build step | **None.** There is no `package.json`, no bundler, no transpiler, no `dist/`. Every `.js` file is served to the browser exactly as it sits in git. |
| Markup | ~28 static, multi-page HTML files under `app/`, one per screen. Each page carries its own `<style>` block plus a shared `app/css/shell.css`. |
| CSS | Plain CSS, one shared stylesheet + per-page `<style>`. Exactly one media query on the main study page (`max-width: 720px`). |
| Backend | **Firebase / Google Cloud only.** No custom server, no serverless functions, no API of our own. |
| Database | **Cloud Firestore** (project `study-monitoring`), modular/ESM SDK **v10.12.2**, loaded from `gstatic.com` by URL — not npm-installed. |
| Offline | Firestore `persistentLocalCache` with multi-tab support (approved decision D5). |
| Auth | **Firebase Authentication** (Google sign-in + email). Roles/permissions are enforced in **`firestore.rules`** (1,122 lines), not only in queries. |
| Storage | No Firebase Storage. Binary assets (fonts, mushaf glyph fonts, audio) are served as **static files** from the GitHub Pages site or fetched from third parties. |
| Hosting | **GitHub Pages** — the repository *is* the deployment. `https://madrasatul-muslimeen.github.io/app/`. |
| Local dev | `serve.js` (~a plain static file server, no dependencies) + `Start Local Test Server.bat`. |
| Tests | Custom **Playwright** harness in `tools/i18n-verify/` (`behaviour.mjs` ~800 checks, `layout.mjs`, `panel.mjs`, `reading.mjs`, `navcheck.mjs`), plus `tools/perf/` round-trip counters and `tools/i18n-coverage.mjs`. Playwright is installed ad hoc, never vendored. |

### State management

There is no state library. State lives in three places, deliberately:

1. **Module-scope `let` variables** inside each page's own `<script type="module">`
   — e.g. `currentSurahNum`, `currentAyahNum`, `currentUnitType`,
   `currentTrackableId`, `wbwLangMode`. These reset on every page load unless
   explicitly persisted.
2. **`localStorage`**, wrapped by `app/js/prefs.js` — every key is `mm_*`
   (`mm_app_lang`, `mm_quran_font`, `mm_quran_translation_lang`,
   `mm_quran_last_session`, `mm_explore_quran_view`, …). This is where
   reading preferences and "where you left off" live.
3. **Firestore**, for anything that is *data* rather than *preference* —
   records, activity, notes, bookmarks, collections, catalogue, classes.

A deliberate consequence worth flagging to the reviewer: **a preference that
was never added to `prefs.js` or to the saved session object silently resets
on every load.** `wbwLangMode` (the Word-by-Word language override) is exactly
such a case — see `DATA_GAPS_AND_INCONSISTENCIES.md`.

### Backend services

- **Firebase Auth** — identity.
- **Cloud Firestore** — all user/tenant data. ~40 top-level collections; the
  ones relevant to study progress are `records`, `activity`, `ayahNotes`,
  `bookmarks`, `subjects`, `trackables`, `ayahCollections`.
- Nothing else. There is no application server to review.

### APIs used

**At runtime, in the browser:**

| Endpoint | Used for | When |
|---|---|---|
| `firestore.googleapis.com` (via SDK) | all app data | throughout |
| `raw.githubusercontent.com/…/mushaf/mushaf-madani-v2.json` | 604-page mushaf layout | on first use of Mushaf view |
| `raw.githubusercontent.com/…/mushaf/fonts/pN.woff2` | one QCF V2 glyph font per mushaf page | per page rendered |
| `raw.githubusercontent.com/…/gtaf_bangla_timestamps.json` | āyah-boundary timings for one Bangla reciter | on first use of that reciter |
| `archive.org/download/…` | recitation audio (several reciters) | on play |
| `everyayah.com` / equivalent per-āyah audio hosts | per-āyah recitation | on play |

**At data-build time only** (`tools/quran-data-pull/pull.js`, run once, offline):

| Source | What was taken |
|---|---|
| `api.alquran.cloud` | Uthmani text, `en.sahih` translation, `bn.bengali` translation, and per-āyah juz / page / rukūʿ / manzil / hizbQuarter / sajda metadata |
| `api.quran.com` v4 | tajweed-tagged text; **word-by-word** Arabic, transliteration, English gloss, Bangla gloss |
| GitHub mirror of the **Quranic Arabic Corpus** (2011 release 0.4) | **root, lemma, part-of-speech** |

**The runtime app never calls a Qur'an API.** All Qur'an content is baked into
static JSON at build time — that is an explicit architectural rule
(*"Qur'an content is served as static files, one per surah, cached permanently
by the browser — never as Firestore reads"*).

### External datasets used

| Dataset | Location in repo | Size | Licence note |
|---|---|---|---|
| Per-surah Qur'an package (text + tajweed + 2 translations + word-by-word + morphology) | `tools/quran-data-pull/output/surahs/surah_001..114.json` | **27 MB** | derived from Tanzil / quran.com / Quranic Arabic Corpus |
| Search indexes (one per language) | `output/search-{ar,en,bn}.json` | 1.4 / 0.9 / 2.1 MB | derived from the above |
| Juz / Hizb / Page / Surah boundary indexes | `output/{juz,hizb,page,surah}-index.json` | 4–64 KB | **computed** from the pulled per-āyah fields, not hand-typed |
| Madani Mushaf page layout | `mushaf/mushaf-madani-v2.json` | ~3 MB | QUL (qul.tarteel.ai) |
| Madani Mushaf glyph fonts | `mushaf/fonts/p1..p604.woff2` | **98 MB** | QCF V2 |
| Arabic reading fonts | `app/fonts/{amiriquran,notonaskh,scheherazade}.woff2` | 21–39 KB | subset by `tools/fonts/build-fonts.mjs` |
| Bangla āyah timings for one reciter | `gtaf_bangla_timestamps.json` | ~460 KB | — |

### Authentication system

Firebase Authentication. Authorisation is a **tenant + role** model:

- `tenants/{tenantId}`, `tenantPeople/{tenantId__personId}`,
  `memberships/{…}`, `tenantMemberUids/{tenantId__uid}` (a uid→role mirror so
  security rules can answer "does this login hold role X in tenant Y" without
  a query), `userIndex/{uid}`.
- Roles: `owner`, `prime`, `teacher`, `guardian`, `self`, plus a
  platform-wide `platformAdmin` flag that **cannot be self-granted** (invariant
  I10; the single real grant was a one-time console write, recorded as D14).
- Teacher scoping is enforced through `enrollments` + a denormalised
  `teacherStudentLinks` mirror, because Firestore rules cannot safely inspect
  one key of an arbitrarily-keyed map.
- Invites use opaque tokens (`inviteTokens/{token}`) so an invite URL never
  carries an email address.

**Tenant isolation is enforced in `firestore.rules`, not only in queries**
(invariant I13).

### Storage system

Three distinct stores, and the distinction is important for anyone proposing
changes:

1. **Git / GitHub Pages** — all code *and* all Qur'an content. Versioned,
   trivially revertible, free to serve, cached hard by the browser.
2. **Firestore** — everything a *person* creates: claims, confirmations,
   activity, notes, bookmarks, collections, catalogue edits, classes.
3. **`localStorage`** — per-device preferences only.

There is **no server-side file storage and no user upload path** anywhere in
the app.

---

## 3. High-level structure

```
madrasatul-muslimeen.github.io/          ← the repo IS the deployment
├── index.html                           redirect stub → /app/index.html
├── app/                                 ★ THE LIVE APP (v08.00)
│   ├── *.html                           ~28 pages, one per screen
│   ├── css/shell.css                    shared chrome
│   ├── js/                              ~70 ES modules, no build step
│   └── fonts/                           3 subset Arabic faces
├── legacy/index.html                    v06.30, single-file app — read-only archive
├── legacy-v07/                          v07.139, frozen copy of app/ — read-only archive
├── mushaf/                              604-page glyph layout + fonts (98 MB)
├── tools/
│   ├── quran-data-pull/                 ★ the one-time data build + its output
│   ├── i18n-verify/                     Playwright harness
│   ├── i18n-coverage.mjs                translation coverage counter
│   ├── perf/                            round-trip / read counters
│   └── fonts/                           font subsetting
├── firestore.rules                      1,122 lines — the real permission model
└── *.md                                 the standing brief, changelog, phase logs
```

### Page-level structure

Each screen is its own HTML page with its own inline module script. The
Qur'an study screen, **`app/quranrevival.html`, is 12,027 lines** and is by a
wide margin the largest file in the project. It hosts:

- the **Wheel** view (Mastery Wheel + 30-Approach sidebar),
- the **Read** view (āyah flow, single-āyah panels, or the Mushaf replica),
- the **Note** view (per-unit notes + the Track/Guide/Breakdown/Coverage card),
- the **Explore** navigator,
- all the Study-options controls, including the Word-by-Word / Root /
  Derivatives toggles.

### Module conventions (these are enforced rules, not style)

- **Invariant I2 — "Modules never call each other. Renderers are shared
  components."** A file named `*-renderer.js` takes data in and returns HTML
  out. It never touches Firestore. `ayah-renderer.js` is the Word Study
  renderer and obeys this strictly.
- **Invariant I5 — units are keyed by permanent ID, never by name.**
  `app/js/unit-keys.js` owns the key grammar.
- **Invariant I11 — every user-visible name is language-keyed from day one.**
  The app is fully bilingual (English / বাংলা), with 1,713 catalogue strings.
- **Invariant I4 / decision D6 — nothing is ever deleted client-side.**
  Archive, revoke, return, mark consumed. There is no delete path anywhere.
- **Invariant I9 + a written load-speed contract** — nothing joins the startup
  path without being flagged. The Qur'an study screen is held to
  **6 sequential round trips / 9 Firestore calls**, re-measured every round.

### Where the Word Study system sits in all this

```
tools/quran-data-pull/pull.js          (build time, run once)
        │  merges 3 external sources into one JSON per surah
        ▼
tools/quran-data-pull/output/surahs/surah_NNN.json      ← the ONLY Qur'an store
        │  fetched over HTTP, one surah at a time
        ▼
app/js/quran-data.js                   (the only module that reads those files)
        │  getSurah() / getAyah() / getAyahRange()
        ▼
app/js/ayah-renderer.js                (pure renderer, HTML out)
        │  renderWordByWordPanel() / renderRootPanel() / renderDerivativesPanel()
        ▼
app/quranrevival.html                  Read view (flow + single āyah)
app/js/ayah-note-renderer.js           Note view (same three panels, collapsible)
```

That is the whole of it. **Five files.** There is no word database, no word
index, no per-word route, no word-detail component, and no word-level record.
The rest of this package documents that in detail.
