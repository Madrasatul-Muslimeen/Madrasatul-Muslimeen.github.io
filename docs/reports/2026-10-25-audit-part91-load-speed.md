# Audit part 91: loading speed and startup reads on the 23 shared pages (PCF MSA J29)

Suite: `tools/i18n-verify/shared-pages-load-speed-audit-browser.mjs` (issue #1176). No app code was changed.

**Method.** Each page is opened at 390x844 on a slowed phone line (CDP: 1.6 Mbit/s down, 750 kbit/s up, 150 ms latency, cache off) and at 1440x900 unthrottled, the Firebase stub answering after 150 ms. Reads come from `window.__fsLog`. "Ready" = the later of the last largest-contentful-paint candidate and the end of the last startup Firestore read. Bytes are JS/CSS/JSON/font finished before ready, served by serve.js; the Firebase SDK is the stub here and is not counted (the real SDK adds to every page). Reads are OK (userIndex, enrollments, bookmarks, plus tenant/identity resolution: `tenantMemberUids`, `tenants`, `tenantPeople`, `subjects`, `modules`, noted in item 5), OWN JOB (a per-page map in the suite), or BREAKS CONTRACT. Every read on every page began after first paint, and none finished before it.

## Results (reads are phone-run counts)

| Page | Reads OK / own job / BREAKS | Phone FCP | Phone ready | Desktop FCP / ready | Phone JS / CSS / JSON / font before ready | Biggest file | Verdict |
|---|---|---|---|---|---|---|---|
| classes.html | 5 / 2 / 0 | 624 ms | 3248 ms | 52 / 394 ms | 400K / 52K / 0 / 0 | prefs.js 46K | OK |
| course-offers.html | 5 / 2 / 0 | 608 ms | 3023 ms | 36 / 382 ms | 368K / 52K / 0 / 0 | prefs.js 46K | OK |
| curriculum.html | 4 / 9 / 0 | 656 ms | 3139 ms | 36 / 554 ms | 360K / 52K / 0 / 0 | prefs.js 46K | OK |
| backup.html | 1 / 2 / 0 | 608 ms | 4124 ms | 28 / 406 ms | 556K / 52K / 0 / 0 | prefs.js 46K | OK |
| import-notes.html | 4 / 0 / 0 | 608 ms | 3138 ms | 32 / 386 ms | 378K / 52K / 0 / 0 | note-foundation.js 79K | OK |
| dawah.html | 5 / 3 / 0 | 764 ms | 2896 ms | 48 / 528 ms | 309K / 52K / 0 / 0 | prefs.js 46K | blocking head script purify.min.js |
| onboarding.html | 0 / 0 / 0 | 608 ms | 608 ms | 28 / 28 ms | 0 / 52K / 0 / 0 | card-look.css 25K | OK |
| accept-invite.html | 0 / 1 / 0 | 588 ms | 1587 ms | 28 / 202 ms | 127K / 50K / 0 / 0 | prefs.js 46K | OK |
| monitor.html | 3 / 6 / 0 | 632 ms | 4414 ms | 56 / 577 ms | 635K / 52K / 0 / 0 | zab-bar.js 58K | OK |
| homework.html | 4 / 6 / 0 | 640 ms | 3236 ms | 36 / 540 ms | 385K / 52K / 0 / 0 | prefs.js 46K | OK |
| people.html | 2 / 15 / 0 | 620 ms | 2979 ms | 52 / 520 ms | 300K / 52K / 0 / 0 | prefs.js 46K | OK |
| records.html | 3 / 6 / 0 | 644 ms | 3460 ms | 32 / 539 ms | 465K / 52K / 0 / 0 | zab-bar.js 58K | OK |
| catalogue.html | 3 / 22 / 0 | 740 ms | 5864 ms | 52 / 1142 ms | 572K / 52K / 0 / 0 | note-foundation.js 79K | OK (near the 6 s limit) |
| about.html | 2 / 0 / 0 | 604 ms | 2308 ms | 36 / 218 ms | 248K / 50K / 0 / 0 | prefs.js 46K | OK |
| bookmarks.html | 5 / 0 / 0 | 724 ms | 3019 ms | 28 / 526 ms | 332K / 50K / 0 / 0 | prefs.js 46K | OK |
| hadith-collections.html | 3 / 0 / 0 | 736 ms | 2143 ms | 32 / 496 ms | 142K / 79K / 0 / 0 | prefs.js 46K | OK |
| index.html (quranrevival.html) | 5 / 0 / 2 | 2740 ms | 20589 ms | 104 / 801 ms | 1906K / 50K / 37K / 0 | quran-word-card.js 107K | BREAKS: trackables, records; ready 20.6 s |
| notes.html | 4 / 0 / 0 | 1036 ms | 5523 ms | 60 / 408 ms | 751K / 90K / 0 / 0 | note-window.js 206K | blocking head script purify.min.js |
| journey-map.html | 4 / 19 / 0 | 1200 ms | 7057 ms | 48 / 574 ms | 779K / 90K / 0 / 0 | note-window.js 206K | ready over 6 s; blocking head script |
| deen-study.html | 13 / 5 / 6 | 604 ms | 6209 ms | 32 / 1158 ms | 744K / 52K / 0 / 0 | note-foundation.js 79K | BREAKS: 6 startup batch writes; ready over 6 s |
| arabic-study.html | 11 / 4 / 7 | 604 ms | 6204 ms | 28 / 1146 ms | 744K / 52K / 0 / 0 | note-foundation.js 79K | BREAKS: subjectTemplates read + 6 batch writes; ready over 6 s |
| admin-self-check.html | 0 / 0 / 0 | 180 ms | 180 ms | 28 / 28 ms | 0 / 0 / 0 / 0 | - | OK |
| taglines.html | 3 / 0 / 0 | 608 ms | 2501 ms | 48 / 365 ms | 255K / 52K / 0 / 0 | prefs.js 46K | OK |

Fonts: none fetched on any page. JSON: only index.html (37K).

**Totals:** 276 checks, 262 pass, 14 fail (the 14 are findings, not suite faults): contract breaks on index (2 viewports), deen-study and arabic-study (phone only; the desktop run did not repeat the seed writes); blocking head script on dawah, notes, journey-map (6); ready over 6 s on index, journey-map, deen-study, arabic-study (4). No page is over 3 s FCP (landing is 2740 ms, close). No fetch or read finished before first paint anywhere.

**Mutations** (each must FAIL, and does):
- `--page=about.html --mutate=extra-read` (a `getDocs` of `records` at startup): 10 pass, 2 fail (the clean run is 12 pass, 0 fail). On index.html it adds the `getDocs records` read to the failing message (9 pass, 3 fail).
- `--page=about.html --mutate=slow` (4 s blocking `<script src>` in `<head>`): 9 pass, 3 fail (blocking script on both viewports, FCP 4068 ms on the phone).

Also: `stub-parity.mjs` 4 pass, 0 fail; `bangla-sweep-other-pages-browser` 224 pass, 0 fail (no app code changed, so before = after).

## For the Architect: what breaks the contract, smallest fix

1. **Landing.** `app/index.html` is a 28-line redirect stub to `quranrevival.html`, so what was measured is Quran Study (the QR Lead's file, frozen here). It reads `trackables` and `records/t1__p1__surah_1` at startup (`refreshChunkAndWheel`, `app/quranrevival.html:10188`, called near 10183) and fetches 1.9 MB of JS before ready: phone ready 20.6 s. Smallest fix: defer the chunk/wheel read until Study opens; lazy-import the Word Card and note modules (`quran-word-card.js` 107K, `note-foundation.js` 79K, `word-card-depth.js` 76K). Send to the PCA as a change request.
2. **Blocking head script:** `app/dawah.html:14`, `app/notes.html:18`, `app/journey-map.html:13`, each `<script src="vendor/purify.min.js"></script>` with no `defer`. Smallest fix: add `defer` (check nothing runs it before DOMContentLoaded). notes/journey-map belong to the shared note tools.
3. **journey-map.html ready 7.1 s on the phone:** 779K JS (`note-window.js` 206K) and 19 reads. Smallest fix: load `note-window.js` on first note open.
4. **deen-study / arabic-study ready 6.2 s, with startup writes:** `repairCatalogueInBackground` (`app/js/topic-study.js:652` and `:669`) commits batches (one of 55 documents) and Arabic also reads all of `subjectTemplates`. The stub's catalogue is unseeded for these subjects, so an already-seeded real tenant may skip this: confirm on the live tenant before changing. If it does run for real readers, gate it on `catalogueNeedsSeeding` behind an explicit action.
5. **Observation:** every page reads `tenantMemberUids`, `tenants` and `tenantPeople` (often `subjects`) for identity and tenant resolution. They are outside the contract's three, so either the contract list should say so or the reads should be trimmed. Also `backup.html` (4.1 s) and `catalogue.html` (5.9 s) are close to the limit.
6. Clean pages (nothing beyond the three plus identity): classes, course-offers, import-notes, about, bookmarks, hadith-collections, taglines, onboarding, accept-invite, admin-self-check.

Limits: the stub does not model the real SDK's size or its cache; the throttle slows files served by serve.js, not the stubbed gstatic responses. "Own job" is a hand-kept map in the suite (`OWN_JOB`).
