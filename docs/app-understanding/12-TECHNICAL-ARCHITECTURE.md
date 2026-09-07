# 12 — Technical Architecture

QuranRevival v08.02

---

## 1. The stack, in one table

| Layer | What it actually is |
|---|---|
| **Framework** | **None.** No React, Vue, Svelte, Angular or any other |
| **Language** | Plain **ES2020+ JavaScript**, native ES modules. No TypeScript |
| **Build system** | **None.** No bundler, no transpiler, no `package.json` in the app, no `node_modules` |
| **Markup** | 28 hand-written `.html` pages, each self-contained |
| **Styling** | Plain CSS — `app/css/shell.css` plus large inline `<style>` blocks |
| **Backend** | **Firebase only.** Auth + Firestore. **No Cloud Functions, no server code** |
| **Firebase SDK** | Modular (ESM) **v10.12.2**, imported **straight from `gstatic.com`** |
| **Hosting** | **GitHub Pages**, from this repository's `app/` folder |
| **Local dev** | `node serve.js` — a small static file server on :8080 |
| **Testing** | Playwright harnesses in `tools/i18n-verify` and `tools/perf` (~800 checks) |

**This is a deliberate, documented choice** (decision D4), not an accident. The
whole application is static files a browser fetches and runs.

```js
// app/js/firebase-init.js — every import is a URL, not a package
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager }
                         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
```

**Consequences a new architect must internalise:**

- **Every file is shipped as written.** A syntax error is a runtime error in production; there is no compile step to catch it.
- **There is no dependency graph tool, no tree-shaking, and no minification.**
- **`import` paths are relative and real.** Renaming a file breaks every importer at runtime.
- **The only "dependencies" are three CDN URLs**, pinned to an exact version.

---

## 2. Major dependencies — the complete list

| Dependency | Version | How | Used for |
|---|---|---|---|
| `firebase-app` | 10.12.2 | CDN | init |
| `firebase-auth` | 10.12.2 | CDN | Google sign-in |
| `firebase-firestore` | 10.12.2 | CDN | all data |
| Playwright | dev only | `tools/i18n-verify`, `tools/perf` | **not shipped** |

**That is the entire runtime dependency list.** No date library, no state
library, no UI library, no chart library. The Mastery Wheel's SVG is generated
by hand-written trigonometry in `mastery-wheel.js` (`polarToCartesian`,
`segmentPath`).

---

## 3. Routing — **there is none**

**Multi-page, not a SPA.** Navigation is ordinary `<a href="…">` between 28
static pages. There is no router, no history manipulation and no client-side
route table.

`app/js/nav.js` (329 lines) is a **pure renderer** that emits the nav markup;
each page injects it. The four categories:

| Category | Links |
|---|---|
| **Modules** | the 10 study pages |
| **Operation** | Classes*, Curriculum*, Course Offers, Homework, Records, Monitor |
| **Bookmark** | a live bookmark list + Manage |
| **Home** | sign-in status, legacy links, Admin* (People, Catalogue), About, Settings (Taglines*, Backup, Language) |

`*` = owner/prime only.

**A consequence worth knowing:** because there is no shared shell, **every page
bootstraps itself** — `onAuthStateChanged` → `bootstrapContext()` → render. There
is no app-level state that survives a navigation except what is in localStorage
or Firestore's own cache.

Nav markup is **static pre-JS markup in each page** for the Home category (an
anti-flash fix), which is why the two legacy links live 22 times in the HTML
rather than once in `nav.js`.

---

## 4. State management — **three tiers, no library**

| Tier | Mechanism | Lives in | Survives |
|---|---|---|---|
| **Page state** | plain `let` variables inside each page's module scope | the page | nothing |
| **Session/user preference** | `localStorage` via `app/js/prefs.js` (713 lines) and `session-context.js` | the browser | reloads, devices separately |
| **Durable data** | Firestore, with `persistentLocalCache` + `persistentMultipleTabManager` (D5) | the server + an offline cache | everything |

**What lives in `localStorage`** (via `prefs.js` and `session-context.js`): the
active tenant/role context, the "View as" preview, the selected person, the app
language, Explore's per-level view choices, wheel size, text size, and the
reading toggles.

**Two consequences:**

- **A stale "View as" preview survives reloads and can sit forgotten on a device for weeks** — a recorded trap that makes admin controls look missing.
- **The language preference is per device**, not per account. (A Firestore sync was designed and deferred; `lang-sync.js` exists.)

**There is no observable/store/reactive layer.** Re-rendering is explicit: a
function rebuilds a container's `innerHTML`. The project's own standing lesson
records the hazard — *"Re-render wipes UI state"* — so anything a reader opened
by hand must be threaded back in, or better, read live off the DOM one line
before it is replaced.

---

## 5. UI component architecture — the **pure renderer** boundary

This is the codebase's strongest architectural rule, invariant **I2**: *modules
never call each other; renderers are shared components.*

```
┌─────────────────────────────────────────────────────────────┐
│  PURE RENDERERS — HTML in, HTML out. NEVER import Firebase. │
├─────────────────────────────────────────────────────────────┤
│  mastery-wheel.js      both wheels, legend, sidebar          │
│  way-modal.js          Track / Guide / Breakdown / Coverage  │
│  ayah-renderer.js      ayah text, translations, word panels  │
│  topic-renderer.js     topic tree browsing                   │
│  asma-renderer.js      the 99 Names                          │
│  hifz-renderer.js      memorisation view                     │
│  ayah-note-renderer.js the Note view                         │
│  nav.js                the navigation bar                    │
│  labels.js             status / POS / role label text        │
└─────────────────────────────────────────────────────────────┘
                    ▲  data passed IN, callbacks passed IN
                    │
┌─────────────────────────────────────────────────────────────┐
│  HOST PAGES — own the data, wire the handlers                │
│  quranrevival.html · records.html · catalogue.html · …       │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICES — Firestore-aware                                  │
│  records.js · catalogue.js · activity.js · bookmarks.js · …  │
└─────────────────────────────────────────────────────────────┘
```

**`labels.js` exists solely to serve this boundary.** A pure renderer must be
able to print "Confirmed" or "Noun + Pronoun" without importing `records.js`
(which imports Firebase). Two functions — `confirmStateLabel` and
`activityActionLabel` — were **moved** there and **re-exported** from their
original modules, so existing call sites needed no change.

**Renderers never attach their own business handlers.** `way-modal.js` emits a
`.way-claim-btn`; the host page attaches the click. `mastery-wheel.js` provides
`attachScopedWheelClickHandler()` but the *callback* is the host's.

---

## 6. Service architecture

| Kind | Modules |
|---|---|
| **Data services** (Firestore-aware) | `records.js`, `catalogue.js`, `activity.js`, `bookmarks.js`, `people.js`, `invites.js`, `identity.js`, `homework.js`, `course-offers.js`, `classes.js`, `curriculum.js`, `grades.js`, `resources.js`, `domains.js`, `ayah-notes.js`, `qcr.js`, `asma-collections.js`, `taglines.js`, `monitor.js`, `backup.js` |
| **Static-data services** | `quran-data.js`, `quran-search.js`, `asma-data.js`, `asma-posters.js`, `catalogue-data.js`, `asma-collections-data.js` |
| **Infrastructure** | `firebase-init.js`, `envelope.js`, `errors.js`, `collections.js`, `session-context.js`, `prefs.js`, `i18n.js`, `lang.js`, `lang-sync.js`, `study-lock.js`, `feature-registry.js`, `modules.js` |
| **Page controllers** | `topic-study.js`, `routine-study.js`, `asma-study.js`, `self-check.js`, `catalogue-repair.js` |
| **UI utilities** | `bar-palette.js`, `drag-reorder.js`, `wheel-resize.js`, `text-size.js`, `splash.js`, `note-popup.js`, `assign-picker.js`, `bookmark-popover.js`, `bookmark-nav.js`, `continue-strip.js`, `audio-player.js`, `asma-wheel-text.js`, `asma-ref-parser.js` |

**Three cross-cutting services every write passes through:**

- **`envelope.js` (99 lines)** — stamps I17's `schemaVersion`, `createdAt`, `updatedAt`, `createdBy` on every document, and **refuses to run without a uid**. Also provides `commitEnvelopeBatch()`.
- **`errors.js` (115 lines)** — `safeWrite()` wraps every write so a failure reaches the user (invariant I15: never `console.error` alone). Keeps a session error buffer.
- **`collections.js` (79 lines)** — every collection name as a constant.

---

## 7. Firebase usage

| Service | Used | How |
|---|---|---|
| **Auth** | ✔ | Google provider only, `signInWithPopup` |
| **Firestore** | ✔ | the entire data layer |
| **Offline persistence** | ✔ | `persistentLocalCache` + `persistentMultipleTabManager` (D5) |
| **Cloud Functions** | **✘** | none exist — no `functions/` directory |
| **Cloud Storage** | **✘** | **not used at all.** No file upload anywhere |
| **Hosting** | **✘** | `firebase.json` configures rules; hosting is **GitHub Pages** |
| **Analytics / Messaging / Remote Config** | ✘ | not imported |

> **The absence of Cloud Functions is architecturally load-bearing.** Every
> calculation — every roll-up, every report, every aggregation — runs in the
> browser. There is nowhere to put server-side logic, and no scheduled job.

**Storage is unused**, which is why the Backup feature exports a **self-contained
HTML file to the user's own device** rather than uploading anything.

---

## 8. The load-speed contract

Non-negotiable, and measured rather than asserted (`tools/perf/`):

| Moment | Allowed | Never |
|---|---|---|
| Startup, before first paint | local cache only — paint immediately | any network wait |
| Startup, after first paint | **3 reads**: `userIndex`, `enrolments`, `bookmarks` | any module's study data |
| Landing page | card information only | records, curriculum, sessions |
| Records | one chunk per surah/subject | all records for a person |
| Activity | one document per week | a year at once |
| Screensaver, About, resources | on first use | at startup |

**Invariant I9: nothing joins the startup path without being flagged.** Several
features are lazy specifically to honour this — the `subject_quran` chunk, the
hizb table, the search indexes, the reciter timing map.

**Note for this session:** `tools/perf/measure.mjs` and the i18n harness **could
not be run here** — Playwright is not installed in this container and the task
brief forbids installing packages. The contract above is read from the code and
the project's own documentation, not re-measured today.

---

## 9. Internationalisation

Genuinely first-class, not a bolt-on — invariant **I11**: *every user-visible
name is language-keyed from day one.*

| Piece | File |
|---|---|
| `t()` translation + `num()` digit conversion | `app/js/i18n.js` (256 lines) |
| Bangla catalogue | `app/js/i18n/bn.js` (**2,293 lines**) |
| Bangla surah names | `app/js/i18n/surah-names-bn.js` |
| Bangla Names of Allah | `app/js/i18n/asma-names-bn.js` |
| `langText(obj, lang, fallback)` | `app/js/lang.js` |
| Coverage tool | `tools/i18n-coverage.mjs` |

**Two data shapes.** Content names are `{ en, bn }` objects read through
`langText()`; UI chrome goes through `t("English string")` with `bn.js` as the
catalogue.

**`num()` matters more than it looks** — a Bangla reader sees Bengali digits
(জুয ১, not জুয 1). Several rounds' worth of recorded defects were Latin digits
inside otherwise-Bangla text.

**A recorded trap:** the coverage number has been wrong about what it counts
**nine separate times**. The project's own rule is that it is *a to-do list,
never evidence* — only opening a rendered page in Bangla proves a screen is
translated.

---

## 10. Architecture diagram — the real one

```
                          ┌──────────────────────┐
                          │  Browser (no build)  │
                          └──────────┬───────────┘
                                     │
   ┌─────────────────────────────────▼──────────────────────────────────┐
   │  28 HTML PAGES — each self-contained, each bootstraps itself       │
   │  quranrevival.html (12,051) · records.html · catalogue.html · …    │
   └──────┬───────────────────────────────────────────────┬─────────────┘
          │                                               │
          ▼ (I2: data in, markup out)                     ▼
   ┌──────────────────────┐                    ┌──────────────────────────┐
   │  PURE RENDERERS      │                    │  SERVICES                │
   │  mastery-wheel       │                    │  records.js  catalogue.js│
   │  way-modal           │                    │  activity.js bookmarks.js│
   │  ayah-renderer       │                    │  people.js   monitor.js  │
   │  topic/asma/hifz     │                    │  …                       │
   │  nav · labels        │                    └──────┬──────────┬────────┘
   └──────────────────────┘                           │          │
                                                      ▼          ▼
                                     ┌────────────────────┐  ┌───────────────┐
                                     │  envelope.js (I17) │  │ errors.js(I15)│
                                     │  collections.js    │  │  safeWrite()  │
                                     └─────────┬──────────┘  └───────────────┘
                                               ▼
                                     ┌────────────────────────┐
                                     │  firebase-init.js      │
                                     │  Auth + Firestore      │
                                     │  persistentLocalCache  │
                                     └─────────┬──────────────┘
                                               ▼
                                     ┌────────────────────────┐
                                     │  FIRESTORE             │
                                     │  study-monitoring      │
                                     │  firestore.rules (1122)│
                                     │  ── NO Cloud Functions │
                                     └────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │  STATIC QURAN DATA — 31 MB, HTTP, browser-cached, NOT Firestore  │
   │  tools/quran-data-pull/output/   ← read only by quran-data.js    │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 11. Deployment

| | |
|---|---|
| **Production** | `https://madrasatul-muslimeen.github.io/app/` |
| **Hosting** | GitHub Pages, served from this repo's `app/` |
| **Deploy** | a push to `main` |
| **Rules deploy** | separately, via Firebase CLI or the Console |
| **Root redirect** | `index.html` at the repo root redirects into `/app/index.html` |
| **Frozen archives** | `/legacy/index.html` (v06.30) · `/legacy-v07/` (v07.139) — **reference only, never edited**, but they sign in to the same project and write real data |
| **Version badge** | `app/js/version.js` → `APP_VERSION` — the single source of truth; four surfaces import it, nothing retypes it |

**One repository, one deploy target.** A dev-repo/mirror split existed until
25 Aug 2026 and was folded into this repo as a real git merge.

---

## 12. Testing and verification

| Harness | What |
|---|---|
| `tools/i18n-verify/behaviour.mjs` | ~800 passing checks; **3 known environmental failures** (this sandbox cannot reach archive.org) and one pre-existing crash in section 42 carried since v07.69 |
| `tools/i18n-verify/layout.mjs` | landing-page metrics at 8 viewports × 2 banner states — the "measure before and after" tool |
| `tools/i18n-verify/reading.mjs`, `panel.mjs`, `navcheck.mjs` | focused screens |
| `tools/i18n-coverage.mjs` | untranslated-string list |
| `tools/perf/measure.mjs` | Firestore round trips per page, with an instrumented stub |
| `tools/perf/new-tenant.mjs` | seeding still works |

**A Firebase stub replaces the SDK** so a page's real script runs without a
network. Two recorded traps: **the stub never mutates its own `DATA`** (a
handler that writes then re-fetches sees stale data), and **it answers
instantly**, so any timing measurement needs an injected `latencyMs` or the
numbers are "a comforting lie".

**None of these could be executed in this session** — Playwright is not
installed here.
