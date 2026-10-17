# QR's checks run against the built QR app (PCA J110 step 4)

Source of the checks: the frozen QR repository, `tools/qr-verify/` (v11.38, `30338ea`). Built app: `node tools/apps/build-app.mjs qr` → `build/qr/`.
Counts are exactly what each check printed. No assertion was weakened, skipped or deleted. `app/`, `apps/` and `app/apps/` were not touched.

## How to run

```
node tools/apps/build-app.mjs qr
node tools/apps/serve-app.mjs build/qr &        # PORT=8082 by default; kill the PID when done
node tools/apps/qr-verify/<check>.mjs           # from the MSA repository root
```
- `_root.mjs` (imported first by every check) makes `build/qr` (or `QR_BUILD`) the working directory, so every `app/...` a check reads is the built file, and sets `QR_BASE` (default `http://localhost:8082`). `REPO` is the MSA root; `importBuilt()` imports a file of the built app.
- Checks that start a server of their own (asma-offline, asma-store, explore-asma-wheel, links, one-worker, qr-offline, upgrade) serve `build/qr` on their own port, as in QR. The others use `QR_BASE`.
- MMSA's hadith data (`mmsa-hadith-route.mjs`) is this repository's `tools/hadith-data-pull/output` (`QR_MMSA_DIR` still overrides).
- `upgrade-browser.mjs` needs QR's old commit `fe028eb` for the "old site": it runs `git -C $QR_REPO archive fe028eb`. The QR checkout here holds one commit only, so run it with `QR_REPO=<a full clone of QuranRevival/QuranRevival.github.io>` (that is how the result below was made). `QR_OLD_TREE` also works.
- `serve-app.mjs` = QR's `serve.js` (same MIME types, same `404.html` with status 404, same path check) for any directory.

## Per check

Classes: (a) STEP 3, needs the one offline worker; (b) INTENDED; (c) PORT; (d) REAL.

| # | QR file | Port | Result against built QR |
|---|---|---|---|
| 1 | naming.mjs | kept (reads `build/qr/app/sw.js`) | 7 passed, 3 failed, exit 1 |
| 2 | asma-poster-data-check.mjs | adapted (data imports from the built app; the generator read from the MSA source `tools/asma-poster/`) | 7 passed, 2 failed, exit 1 |
| 3 | pages-browser.mjs | adapted | 80 passed, 0 failed, exit 0 |
| 4 | front-browser.mjs | adapted | 65 passed, 0 failed, exit 0 |
| 5 | asma-browser.mjs | adapted | 274 passed, 0 failed, exit 0 |
| 6 | asma-offline-browser.mjs | adapted | 19 passed, 13 failed, exit 1 |
| 7 | asma-screensaver-browser.mjs | adapted | 74 passed, 0 failed, exit 0 |
| 8 | asma-store-browser.mjs | adapted | 83 passed, 1 failed, exit 1 |
| 9 | one-worker-browser.mjs | adapted | 42 passed, 0 failed, exit 0 |
| 10 | quran-ldog-browser.mjs | adapted | 38 passed, 0 failed, exit 0 |
| 11 | qr-offline-browser.mjs | adapted | 22 passed, 11 failed, exit 1 |
| 12 | upgrade-browser.mjs | adapted (old tree from `QR_REPO`) | 55 passed, 30 failed, exit 1 |
| 13 | links-browser.mjs | adapted | 9 passed, 19 failed, exit 1 |
| 14 | explore-asma-wheel-browser.mjs | adapted | 28 passed, 8 failed, exit 1 |
| 15 | range-bookmark-browser.mjs | adapted | 40 passed, 0 failed, exit 0 |
| 16 | fatiha-opening-browser.mjs | adapted | 36 passed, 0 failed, exit 0 |
| 17 | approach-window-browser.mjs | adapted | 49 passed, 0 failed, exit 0 |
| 18 | asma-local-sync.mjs | adapted: kept, because the QR-only `asma-local.js` (overlay) must still equal the functions of MSA's `app/js/asma-collections.js`; default MMSA checkout = this repository, "ours" = the built file | 12 passed, 0 failed, exit 0 |
| 19 | mmsa-hadith-route.mjs | adapted (helper; no assertions): default dir = this repository | n/a |
| 20 | import-walk.mjs | kept (helper, no assertions; runs on the built app) | n/a, runs (`asma.html` → script list) |
| 21 | mmsa-drift.mjs | **RETIRED, not copied**: it compares the files QR copied from MMSA against an MMSA checkout and against QR-PLAN's "Pinned files" table. In one source there are no two copies to drift; the build rules count their own edits (`apps-build-check.mjs`, and each edit's `exact` count). QR-PLAN.md is not in MSA. | not run |

Not copied (QR tools its `npm test` calls first), for step 3 / later:
- `tools/qr-asma/extract-cited-hadith.mjs --check` (checks `asma-cited-hadith.json`; the file is in the overlay, its generator is not in MSA yet);
- `tools/qr-sw/make-precache.mjs --check` (checks the worker's install list; belongs with QR's `sw.js`, step 3);
- `tools/qr-icons/make-asma-icons.mjs`, imported only by `asma-store-browser.mjs --mutate=maskable` (a mutation run, not the plain run). The import path is left pointing at `tools/qr-icons/` and will fail until it is brought over.
- QR's variant of `tools/asma-poster/build-poster-data.mjs` (typo fixes, `MEANING_132`, `--check`). MSA's is older and has no `--check`; see check 2.

## Every failing assertion

Cause of (a), checked in the build: `build/qr/app/sw.js` is MSA's worker. It has no `qr-quran-v1`/`qr-hadith-v1`, no qr-copied-page injection, and an install list that does not hold the Asma files; `qr-copied-page.js`, `qr-links.js`, `qr-away-note.js` and `qr-explore-asma-fit.js` are built but no page and no worker loads them.

**1 naming (3)**
- (a) `app/sw.js uses qr-quran-v1`; (a) `app/sw.js uses qr-hadith-v1`; (a) `the clean-up keeps the current app cache and deletes only other qr-app- ones` (the regex for QR's clean-up line is not in MSA's worker).

**2 asma-poster-data-check (2)** (tooling not ported: step 3 / later; the data itself passes all its other 7 assertions)
- (a-later) `app/js/asma-poster-data.js is what tools/asma-poster/build-poster-data.mjs writes`: MSA's generator has no `--check` and is the older version, so the check cannot confirm the QR data file; it is not run (it would write into `app/js`).
- (a-later) `132 Allah's meaning line is the one chosen in the generator ("undefined")`: `MEANING_132` exists only in QR's generator. The built data's meaning line is "The Grand Name".

**6 asma-offline (13)**, all (a):
- `static: the worker saves all 51 files the page uses` (missing: app/asma.html, asma js, i18n, ...: the install list is MSA's);
- `@390`/`@1400 the worker saved all 0 of Asma's files in qr-app-11.38 (undefined files in it)` ×2;
- `@390`/`@1400 the worker is app/sw.js, version null` ×2;
- `@390`/`@1400 stopped early: page.reload: net::ERR_FAILED` ×2 (offline reload, nothing cached);
- `update: before, qr-app-11.38 and qr-quran-v1 (...)`; `update: "A new version is ready · Reload" shows`; `update: the page keeps running null until Reload`; `update: Reload is finger-sized (0px)`; `update: the new version saved qr-app-11.39 while the old one still serves`; `version bump stopped early: locator.click: Timeout` (the update notice never appears).

**8 asma-store (1)**
- (a) `about offline: the page opens from the saved copy, with its credits` (`asma-about.html` is not in the install list). Manifest, icons, screenshots, installability, 83 others pass.

**11 qr-offline (11)**, all (a):
- `@390`/`@1400 all 0 shell files saved at install` ×2; `the hadith files the card opened ... are kept in qr-hadith-v1 (0)` ×2; `offline: its related hadith name their books (0 rows)` ×2;
- `update: before, qr-app-11.38 holds data opened on use`; `update: Quran Study shows MMSA's "Updated — tap to reload"`; `update: the new version saved qr-app-11.39 while qr-app-11.38 still serves`; `update: qr-app-11.39 already holds the data the reader had opened`; `version bump stopped early: page.click: Timeout`.

**12 upgrade (30)**, all (a) (old site 00.04 is never taken over; one registration with `/app/sw.js?v=00.04` stays active):
- ×2 (@390, @1400) each, for `asma`, `quran` and `later`: `new site: the reader sees "A new version is ready · Reload"`; `one registration, QR's worker active, nothing waiting`; `the page runs version null (expected 11.38)`; `qr-app-00.04 deleted, qr-app-11.38 in use`; (`quran` and `later` also) `at most one update notice in all (2: mmsa@quranrevival.html ...)`. Per width: `asma` 4, `quran` 5, `later` 5 = 14, so 28 in total;
- `no-module browser: Asma's worker runs as a classic one ([], version null)`; `no-module browser: offline, the 99 Names`.

**13 links (19)**
- (d) `qr-links.js QR_PAGES is exactly the pages in app/ (36)`: the built `build/qr/app/` holds 36 pages, QR holds 6. `apps/qr.json` `site` lists `"app"` whole, so QR gets 30 MSA pages it does not hold today: about, accept-invite, admin-self-check, arabic-study, asma-study, backup, bookmarks, catalogue, classes, course-offers, curriculum, dawah, deen-study, general-study, hadith-collections, hadith-study, health-study, homework, import-notes, life-skill, migrate, monitor, naturelife-study, note-editor-prototype-demo, notes, onboarding, people, quranrevival-render-test, records, taglines (also `app/health/` ×13 files and 40 more `app/js` files, plus `mushaf/` 606 files that QR's repository does not hold). Evidence: `diff` of the page lists; `QR_PAGES` in `build/qr/app/js/qr-links.js` = 6 pages.
- (d) `mmsa: 404.html opens a page QR does not hold in the full Madrasah` and `hide: 404.html shows its note for a page QR does not hold` (`/app/deen-study.html?resume=x` loads MSA's page instead of the 404.html); `mmsa:`/`hide: 404.html opens QR's own Asma for MMSA's asma-study.html` (`/app/asma-study.html#v=names` loads MSA's asma-study.html). Same cause: the pages exist.
- (a) the other 14: `mmsa:` and `hide:` `links to pages QR does not hold ...` (0 links), `links to the pages whose home is MMSA ... ↗` (0 links), `the menu's "Asma ul Husna" opens QR's own Asma app` (0), `Quran Study's Modules menu` (hrefs left as `/app/...`), `a Continue strip drawn later ...` (not rewritten/hidden), and `away note @390/@1400 en/bn stopped early: waitForSelector` ×4. All need `qr-links.js`/`qr-away-note.js`, which only `qr-copied-page.js` injected through QR's `sw.js`.

**14 explore-asma-wheel (8)**
- (a) `@390`/`@1440 en Groups wheel` and `Groups wheel drawn again`: `no two of its 38 labels and numbers overlap (17)` and `every slice label stays inside its own slice (19 outside)`, ×4 each: `qr-explore-asma-fit.js` is not started (it is loaded by `qr-copied-page.js`). The `bn` runs and the other assertions pass.

## Other results worth a line
- No failure is (b) or (c): the version number (`qr-version.js` 11.38), `theme-color`, the Legacy link and MSA's later changes did not trip any assertion. The six site files that differ from frozen QR (README) are not asserted on by these checks.
- `one-worker-browser.mjs` passes 42/0 against MSA's own worker; it did not need QR's worker.
- Checks 3, 4, 5, 7, 9, 10, 15, 16, 17 and 18 pass with no failure (the remaining failures are all (a), except check 13's (d) pages finding and check 2's tooling gap).

## (d) summary (REAL)
One: the built QR holds 30 MSA pages (and extra `app/js`, `app/health`, `mushaf/`) that today's QR does not. Fix is in `apps/qr.json` `site` (list QR's 6 pages, scripts and data instead of all of `app`); not changed here, `apps/` is out of this round.

## Re-run on the current build (Architect, 18 Oct 10:40 am Sydney)

This run uses the build with QR's own worker (step 3a), the `pages` setting (only QR's 6 pages) and QR's poster-data
generator in `apps/qr/tools/`. Command: `bash tools/apps/qr-verify/run-all.sh` with `QR_REPO` set.
**Every check passes:**
naming 10/0 · asma-poster-data-check 9/0 · asma-local-sync 12/0 · pages 80/0 · front 65/0 · asma 274/0 ·
asma-offline 58/0 · asma-screensaver 74/0 · asma-store 84/0 · one-worker 42/0 · quran-ldog 38/0 · qr-offline 36/0 ·
upgrade 85/0 · links 52/0 · explore-asma-wheel 36/0 · range-bookmark 40/0 · fatiha-opening 36/0 · approach-window 49/0 ·
mmsa-hadith-route exit 0 · import-walk exit 0.
Every class (a) failure above was the missing worker, and every class (d) failure was the missing `pages`
setting. None remains.
