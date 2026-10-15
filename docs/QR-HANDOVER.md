# QuranRevival (QR) handover pack, from the MMSA Architect

Written 16 Oct 2026 (Sydney) by the MMSA Master Architect, on the Owner's decision PCA J61 (Q6 = A, Q7 = A).
A new QR Architect builds **QR = Quran Study + Asma ul Husna + Learn Deen On-the-Go (LDOG)**, Asma first,
in its own repository `QuranRevival/QuranRevival.github.io` (site `quranrevival.github.io`).
The MMSA Architect keeps MMSA, and keeps Hadith, Dua and Seerah until the Deen Study step.

**Read this with:**
- `CLAUDE.md`, the standing brief. Its *Standing lessons* apply to QR unchanged.
- `ARCHITECT.md`, the loop: plan, assign, review by measurement, allocate, merge.
- The PCF (https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ): MMSA J31 (the Asma app plan, now yours) and PCA J61.

**State when written:**
- `main` here is **v11.04** (`d2c823c`).
- Builder round #878 (audit part 15: the User Manual's Asma ul Husna features, checked working) is running in
  THIS repository, so its fixes land here first.
- Copy from `main` after #878 merges, or ask the MMSA Architect (through the PCA) which commit to take.

Nothing here was copied or moved to the new repository by the MMSA Architect, on the PCA's instruction.

---

## 1. What makes up QR, and what must NOT move yet

### Must NOT move yet

These are shared with MMSA. Moving or renaming any of them breaks every student.

- **The sign-in and the database.**
  - One Firebase project, `study-monitoring` (decision D1: separate projects give users different uids and
    orphan all history). QR must use the SAME project and the SAME Google sign-in, or every student's
    progress is lost to them.
  - The auth domain is `study-monitoring.firebaseapp.com`; the web config is in `app/js/firebase-init.js`.
    Copy the file; never paste its key into a document or an issue.
  - **Before sign-in works on the new site, `quranrevival.github.io` must be added under Firebase Console →
    Authentication → Settings → Authorised domains.** That is an Owner step in the Console.
- **Firestore Rules** (`firestore.rules` here) and their deployment. Rules are an Owner Control Gate; QR must
  not change or deploy them. Today's Rules already cover every collection QR writes.
- **Student progress paths and permanent unit keys** (I5; an Owner Control Gate). These never change:
  - **Records:** `records/<tenantId>__<personId>__<chunkKey>`, with entries keyed `<unitKey>::<trackableId>`.
    The chunk is `surah_<n>` for ayah, range, surah and ruku units, and `subject_<id>` for juz, hizb, page,
    name and topic (`chunkKeyFor` in `app/js/records.js`).
  - **Unit keys** (`buildUnitKey` in `app/js/unit-keys.js`): `ayah:S:A`, `range:S:A-B`, `surah:S`, `ruku:S:R`,
    `juz:J`, `hizb:H`, `page:<edition>:P`, `name:N` (Asma), `topic:<id>` (LDOG routines), `opening:<id>`.
  - **Activity:** `activity/<tenantId>__<personId>__<weekKey>`, one document per week.
  - **Everything else keeps its documents and ids:** word progress; bookmarks; notes (`notes`, `noteFolders`,
    `notePlacements`, `noteSources`, `ayahNotes`); Zab (`zabItems`, `zabPockets`); `asmaCollections`.
- **The four legacy person-id shapes** (CLAUDE.md, *Legacy personId formats*): all must keep working.
- **`legacy/`, `legacy-v07/`, `legacy-v08/`, `legacy-v09/`**: frozen archives here, with nothing to copy.

### The QR pages (in `app/`)

| Page | What it is |
|---|---|
| `quranrevival.html` | Quran Study: the wheel, Read view, Āyah and Word cards, Explore, QCR, Asma in Explore, the Notes pane, Zab (23,829 lines; most of the interface lives here) |
| `asma-study.html` | The Asma ul Husna study page (Browse by Category, posters, Studied, Print) |
| `ldog-study.html` | Learn Deen On-the-Go (routines, through `routine-study.js`) |
| `sw.js` | The offline worker (section 4) |
| `index.html` | The landing / module page (the shared MMSA shell) |

QR links to these pages too, and will either want them or need to replace them:
- `journey-map.html` (Mapping My Journey)
- `notes.html`, `bookmarks.html`, `import-notes.html`
- `records.html`, `monitor.html`
- `about.html`, `onboarding.html`, `accept-invite.html`, `taglines.html`, `dawah.html`

The teaching pages (`people`, `classes`, `course-offers`, `homework`, `curriculum`, `catalogue`, `backup`,
`migrate`, `admin-self-check`) are MMSA's.

### The scripts

Measured on 16 Oct 2026 by walking the import graph from the three QR pages.

**140 scripts** are reachable from `quranrevival.html` (134), `asma-study.html` (55) and `ldog-study.html` (56).

**40 are used ONLY by QR**, so they are safe to take as QR's own:

`approach-sections.js` `asma-cited-ayat.js` `asma-cited-hadith.js` `asma-descriptions.js` `asma-study.js`
`asma-wheel-text.js` `audio-player.js` `ayah-folder-filing-plan.js` `ayah-folder-filing-renderer.js`
`ayah-note-renderer.js` `ayah-related.js` `drag-reorder.js` `end-of-unit-prompt.js` `explore-all-approaches.js`
`float-card.js` `lemma-dictionary.js` `lemma-meaning-groups.js` `lemma-senses.js` `note-popup.js`
`page-approach-card.js` `quran-lemma-levels.js` `quran-search.js` `quran-word-coverage.js`
`quran-word-features.js` `quran-word-progress-data.js` `quran-word-segments.js` `quran-word-total-data.js`
`read-note-pane.js` `read-window.js` `study-wbw-total-readiness.js` `study-word-levels-readiness.js`
`text-size.js` `unit-card.js` `unit-markers.js` `unit-resolve.js` `unit-rings.js` `wheel-resize.js`
`word-card-search.js` `writing-popout.js` `writing-sheet.js` (all in `app/js/`)

**100 are SHARED with other MMSA pages.** QR needs them and MMSA keeps using them, so after copying, both
copies will need the same fixes until MMSA catches up. Grouped:

- *Sign-in, data, records:* `firebase-init.js`, `collections.js`, `records.js`, `activity.js`, `unit-keys.js`,
  `unit-ladder.js`, `catalogue.js`, `catalogue-data.js`, `catalogue-repair.js`, `roster-access.js`,
  `session-context.js`, `errors.js`, `envelope.js`, `modules.js`, `hidden-modules.js`, `resources.js`
- *Shell and language:* `nav.js`, `account-card.js`, `prefs.js`, `lang.js`, `lang-sync.js`, `labels.js`,
  `i18n.js`, `i18n/bn.js`, `i18n/surah-names-bn.js`, `i18n/asma-names-bn.js`, `splash.js`, `taglines.js`,
  `tagline-scroll.js`, `continue-strip.js`, `back-dock.js`, `bar-palette.js`, `version.js`, `sw-register.js`,
  `screensaver-idle.js`, `float-window.js`, `way-modal.js`
- *Asma:* `asma-data.js`, `asma-poster.js`, `asma-poster-data.js`, `asma-posters.js`, `asma-renderer.js`,
  `asma-screensaver.js`, `asma-collections.js`, `asma-collections-data.js`, `asma-ref-parser.js`
- *Quran data and words:* `quran-data.js`, `quran-word-card.js`, `quran-word-identity.js`, `quran-word-index.js`,
  `quran-word-form-key.js`, `quran-word-progress.js`, `quran-word-total.js`, `quran-lemma-progress.js`,
  `quran-lemma-progress-data.js`, `lemma-text.js`, `buckwalter.js`, `verb-conjugation.js`, `word-card-depth.js`,
  `word-grammar-tables.js`, `fatiha-count.js`, `mastery-wheel.js`, `approach-coverage.js`,
  `approach-short-name.js`, `ayah-renderer.js`, `ayah-action-sheet.js`, `ayah-notes.js`, `hifz-renderer.js`,
  `qcr.js`, `qcr-data.js`
- *Hadith used inside QR* (Hadith stays MMSA's; QR only reads it): `ayah-hadith.js`, `hadith-translations.js`,
  `openiti-corpus.js`
- *Notes, bookmarks, Zab:* `bookmarks.js`, `bookmark-nav.js`, `bookmark-popover.js`, `bookmark-assign.js`,
  `note-foundation.js`, `note-journal-evidence.js`, `journey-map-contract.js`, `journey-map-service.js`,
  `journey-map-shard.js`, `journey-tray.js`, `study-note-binding.js`, `study-note-service.js`, `zab-bar.js`,
  `zab-data.js`, `zab-readiness.js`, `zab-to-note.js`
- *Study evidence (the Phase 4 readiness modules):* `study-activity-evidence-id.js`,
  `study-activity-evidence-store.js`, `study-event-wiring.js`, `study-evidence-readiness.js`,
  `study-lemma-levels-readiness.js`, `study-lemma-progress-readiness.js`, `study-reading-units-readiness.js`
- *LDOG and topics:* `routine-study.js`, `topic-renderer.js`
- *Teaching (pulled in by shared code; MMSA's):* `classes.js`, `course-offers.js`

The list moves with every round, so re-run the walk (section 6) on the commit you copy.

---

## 2. The data files

The data is served as static files from this site and the scripts fetch it by path. So the same paths must
exist on the QR site, or each `BASE_URL` constant changed (one place each).

| Path | Size | Used by | Notes |
|---|---|---|---|
| `tools/quran-data-pull/output/` | 56 MB (32 entries) | `quran-data.js`, and the word, lemma and search scripts | `BASE_URL = "/tools/quran-data-pull/output"` is an ABSOLUTE path. Contents: `surahs/` 27 MB (one file per surah: Uthmani text, one English and one Bangla translation); `word-segments/` 6.9 MB; `word-features/` 5.0 MB; `word-syntax/` 2.9 MB; `word-forms-index.json` 2.5 MB; `mufradat/` 2.2 MB; the surah, juz, hizb, ruku and page indexes; `search-en.json` and `search-bn.json`; the lemma dictionaries |
| `tools/hadith-data-pull/output/ayah-hadith/` | 1.5 MB | `ayah-hadith.js` (related hadith on the Āyah card) | relative path `../tools/...` |
| `tools/hadith-data-pull/output/translations/` | 64 MB | `hadith-translations.js` | QR needs only the parts the Āyah card and Asma cite |
| `tools/hadith-data-pull/output/openiti-release/` | 114 MB | `openiti-corpus.js` (Asma's cited hadith, "Open in Hadith") | Hadith is MMSA's; QR links to it |
| `tools/hadith-data-pull/output/hadeethenc/`, `concordance/`, `hadeethenc-links/`, `dua/` | 31 MB, 0.7 MB, 0.1 MB, 5.3 MB | The Hadith and Dua pages (MMSA's) | The HadeethEnc permission is still open (PCF MMSA J06) |
| Asma posters | 93 images | `asma-posters.js` | **These live on archive.org** (`archive.org/download/NamesAndAttributesOfAllah/...`), not in this repository |
| The Mushaf view's page layout and fonts | external | cached by `sw.js` | `raw.githubusercontent.com` and `verses.quran.foundation` |
| Recitation audio | external | `audio-player.js` | archive.org and `api.quran.com` |

GitHub Pages refuses any file over 100 MB and limits a site to about 1 GB; today's QR data fits.

---

## 3. Firebase and sign-in (names only)

- **Project and sign-in:** project `study-monitoring`, auth domain `study-monitoring.firebaseapp.com`.
  Sign-in is Google with a popup (`signInWithPopup` + `GoogleAuthProvider`), in `asma-study.js`,
  `routine-study.js` and `topic-study.js`, and inline in each page's own script, `quranrevival.html` included
  (21 pages carry their own sign-in call).
- **SDK:** the modular Firebase SDK 10.12.2 from `www.gstatic.com` (decision D4), with offline persistence
  on (D5).
- **Tenancy:** every document sits under a tenant id (`tenants`, `tenantPeople`, `tenantMemberUids`,
  `userIndex`).
- **Progress owner:** progress belongs to a `personId`, not a uid. Recording for family members (👥) writes
  another person's records without a device handover (decision D10).
- **Writes:** there is no client-side delete anywhere (D6, I4). Every write carries `schemaVersion`,
  `createdAt`, `updatedAt` and `createdBy` (I17), and a failed write must reach the user (I15).

---

## 4. The offline worker (`app/sw.js`)

- **Registration:** a MODULE worker registered from `app/js/sw-register.js`, with scope `/app/`.
- **Caches:**
  - `mm-app-<APP_VERSION>`: every same-origin file under `/app/`, plus the Qur'an data. A new version copies
    the old cache's files across, then deletes the old cache.
  - `mm-qf-fonts-v1`: the Mushaf glyph fonts.
  - `mm-ext-v1`: the Firebase SDK.
  - `mm-mushaf-v1`: the Mushaf page layout and the surah-header font.
- **On the new site, pick new cache names** (for example `qr-app-...`). A different site already has its own
  caches, but distinct names keep shared tools and checks unambiguous.
- **Archives:** `legacy-v08/` and `legacy-v09/` carry a `sw-register.js` that registers NO worker, because the
  live worker is reached by an absolute path. Remember this if QR ever keeps an archive of itself.

---

## 5. Open bugs and decisions waiting on the Owner (QR-related)

- **PCF MMSA J31, now yours:** the Asma app plan. It is built inside QR first, as an installable Asma front
  door (a start page and a manifest), with no sign-in (J61 Q5 = A), posters saved for offline use, in four
  rounds. The plan's full text is in the PCF.
- **PCF MMSA J29 17b (optional):** a shorter name for the Asma group "All Knowledgeable, All Encompassing,
  Watches, Hears everything", which is cut on a 1440px wheel in English.
- **PCF MMSA J30:** v11.00 vs v11.01 for the Stage 1 release, and whether to keep a `legacy-v10/` copy.
- **PCF MMSA J03 Q1:** which keys to add (Keys to Understanding).
- **PCF MMSA J12 (parked):** the Mastery Wheel showing the chosen Study Unit; it needs the Owner's six answers.
- **PCF MMSA J13 (parked):** the timezone choice (D14) needs a Rules change.
- **Known gaps:**
  - The `tenantSelect` picker cuts a long tenant name (an Owner UI decision).
  - Choosing a translation by the translator's name is parked; one English and one Bangla translation are
    packaged today.
- **The User Manual audit** (PCF J29, the Owner's rule "Keep working, never idle"):
  - checked working so far: reading (v10.68), words and āyāt (v11.01), recording progress and status
    (v11.02), Explore (v11.04);
  - running now: Asma ul Husna (round #878);
  - not yet audited: Notes and Mapping My Journey, Zab, Bookmarks, Writing, LDOG.

---

## 6. How to test (always from the repository ROOT)

- **Serving:** `node serve.js` serves on port 8080; `PORT=8082` runs a second copy, and browser suites take
  `QR_BASE` to point at it. Chromium for Playwright is pre-installed in the Claude Code sandbox; link
  `node_modules -> /opt/node22/lib/node_modules`.
- **The suites:** there are 353 in `tools/i18n-verify/`, and every `check()` refuses a promise. The ones QR
  must keep green:

  | Suite | Today |
  |---|---|
  | `behaviour.mjs` | 971/0 |
  | `phone-width-overflow.mjs` | 217/0 |
  | `audit-part11-reading-browser.mjs` | green |
  | `audit-part12-words-browser.mjs` | 500/0 |
  | `audit-part13-recording-browser.mjs` | 494/0 |
  | `audit-part14-explore-browser.mjs` | 650/0 |
  | `qr-stage1-hidden-browser.mjs` | 110/0 |
  | `quran-my-status-browser.mjs` | 248/0 |
  | the `explore-*`, `qcr-*`, `wheel-*` and `tablet-wheel` browser suites | green |
  | the 12 `asma-*` suites | green |

- **Audit suite flags:** each audit suite takes `--only=`, `--width=`, `--lang=` and `--mutate=<name>`.
  A mutation restores a fixed defect and must make the suite fail.
- **Governance suites:** the eight (`programme-ledger`, `programme-ledger-mutations`, `brief-integrity`,
  `study-activity-evidence-boundary` and its mutations, `study-event-wiring`, `rules-authorisation-executable`,
  `workflow-expressions`) are MMSA's governance. QR needs its own equivalents for its own ledger.
- **Sandbox limits:** the sandbox cannot reach archive.org or api.quran.com, so posters and recitation fail
  there and work for readers. Its TLS interception trips "no page errors" checks on HTTPS fetches; never
  switch certificate checking off.
- **The import-graph walk used for section 1.** Save it as a `.mjs` file and run it from the root with the
  page names:

```js
import fs from "node:fs"; import path from "node:path";
const re = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)["'](\.{1,2}\/[^"']+\.js)["']/g;
function walk(file, seen) {
  if (seen.has(file)) return; seen.add(file);
  for (const m of fs.readFileSync(file, "utf8").matchAll(re)) {
    const p = path.normalize(path.join(path.dirname(file), m[1])); if (fs.existsSync(p)) walk(p, seen);
  }
}
for (const page of process.argv.slice(2)) { const s = new Set(); walk(`app/${page}`, s); console.log(page, [...s].sort().join("\n")); }
```

---

## 7. The working rules that came with this project (all still bind)

- **The way-back law** (decision 86): anything that leaves a view leaves a visible way back to exactly
  where the reader was.
- **Finger-sized controls:** 40px for anything a finger presses.
- **Measuring:** measure at 320/390/820/1440px in English and Bangla.
- **Proving fixes:** mutation-prove every fix.
- **Bangla text:** never put an HTML entity in a Bangla translation value.
- **Versions:** written `vNN.NN`, and allocated only by the Architect. The Builder never merges.
- **The PCF:** read it first and update it last, with real UTC times and a What's New line for every release.

The MMSA Architect answers questions through the PCA.
