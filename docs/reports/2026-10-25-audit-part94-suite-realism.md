# Audit part 94 — two suites measure what a reader really gets (PCF MSA J29)

Test code only. Changed: `tools/i18n-verify/shared-pages-load-speed-audit-browser.mjs` and
`tools/i18n-verify/shared-pages-bangla-layout-audit-browser.mjs`. No app code, `serve.js` or `harness.mjs`.

## 1. Load speed: files served gzip, like GitHub Pages

`serve.js` sends no compression; Pages sends gzip. Playwright's `route.fulfill` cannot do this (Chromium does not decode a
fulfilled body, and a fulfilled body skips the line throttle). So the suite starts its **own small static server** on an
ephemeral port (text types gzip + `Content-Encoding: gzip`, other files as they are) and its `ctx.route` handler for
`${BASE}/app/**` hands each request to it with `route.continue({ url })`. The browser decodes the gzip itself, the phone
throttle (1.6 Mbit/s, 150 ms RTT) and the byte counts apply as before; `firebase-init.js` still falls through to the harness
stub. Limits unchanged (3 s FCP, 6 s ready). `--raw` turns it off (the old behaviour).

Phone profile (390x844, slowed line). KB = JS+CSS+JSON+font bytes on the wire before ready.

| Page | FCP raw | FCP gzip | ready raw | ready gzip | KB raw | KB gzip |
|---|---|---|---|---|---|---|
| Classes | 616 | 440 | 3232 | 1896 | 452 | 165 |
| Course offers | 608 | 428 | 3046 | 1754 | 420 | 153 |
| Curriculum | 656 | 428 | 3130 | 1990 | 412 | 167 |
| Backup | 604 | 428 | 4099 | 2390 | 608 | 235 |
| Import notes | 608 | 424 | 3137 | 1912 | 430 | 170 |
| Dawah | 624 | 424 | 2827 | 1876 | 361 | 155 |
| Onboarding | 604 | 424 | 604 | 424 | 52 | 17 |
| Accept invite | 588 | 416 | 1587 | 1130 | 177 | 67 |
| Monitor | 632 | 428 | 4382 | 2772 | 629 | 261 |
| Homework | 636 | 428 | 3248 | 1952 | 437 | 159 |
| People | 620 | 428 | 2971 | 1935 | 352 | 150 |
| Records | 644 | 424 | 3459 | 2061 | 459 | 184 |
| Catalogue | 740 | 428 | 5862 | 3672 | 624 | 214 |
| About | 592 | 420 | 2300 | 1423 | 298 | 111 |
| Bookmarks | 724 | 420 | 3021 | 1902 | 382 | 142 |
| Hadith collections | 732 | 452 | 2141 | 1250 | 221 | 109 |
| **Landing** | 2740 | 884 | **20642** | **8664** | 1993 | 730 |
| Notes | 884 | 472 | 5416 | 2618 | 841 | 303 |
| Journey map | 1116 | 544 | 7070 | 3035 | 869 | 322 |
| Deen study | 604 | 424 | 6208 | 3828 | 796 | 275 |
| Arabic study | 604 | 424 | 6203 | 3827 | 796 | 275 |
| Self-check | 192 | 180 | 192 | 180 | 0 | 0 |
| Taglines | 604 | 424 | 2494 | 1601 | 307 | 131 |

(The raw Landing 20.6 s matches the QR Lead's 20.7 s.)

Totals: `--raw` **268 passed, 8 failed**; gzip **271 passed, 5 failed**.
Failures gone once compressed: Journey map ready (7.1 s → 3.0 s), Deen study ready, Arabic study ready.

### Still failing once compressed

1. **Landing (`index.html`) phone ready 8664 ms > 6000.** 730 KB on the wire before ready. Smallest fix: load the
   wheel/Approach and note-foundation modules after first paint (dynamic `import()` on first use) — `app/index.html`
   and the scripts it imports, the shared landing, so the MSA Architect's file (QR builds from it).
2. **Landing, phone and desktop: "no read breaks the contract"** — `getDocs trackables` and `getDoc records` at startup.
   Pre-existing (same in `--raw`); not a speed matter. Same file, same owner.
3. **Deen study / Arabic study, phone: `batchCommit` at startup** (seeding subjects/topics; Arabic also reads
   `subjectTemplates`). Pre-existing (same in `--raw`). Smallest fix: seed only when the reader acts, or once per tenant
   behind a stored flag — the Deen/Arabic study pages' own scripts (Architect's; not a Lead's module).

## 2. Bangla layout: a box inside a scroller is not overflow

Before, an element ending past the screen was counted as soon as it was past the screen, even inside an ancestor with
`overflow-x: auto|scroll`. Now the finder walks up to the nearest scroller or clipper first:
* inside a **scroller** → not overflow (the scroller is itself an element in the sweep, so its own box and whatever clips
  above it are checked in their turn);
* past a **clipper** (`hidden|clip`) → overflow, as before;
* neither between it and the viewport and past the screen → overflow, as before; the page scrolling sideways still counts.

Overflow findings, all 23 pages x 4 widths x 2 languages:

| | Bangla | English |
|---|---|---|
| before | 27 | 37 |
| after | 4 | 6 |

The remaining ones: Landing 390 (wheel SVG text "3", 4 px past), Landing 1440 (wheel pop-up frame and Zab bar, clipped at
1360), and in English Hadith collections 320 (context bar label, page scrolls sideways). All also present in English
(none is new in Bangla). Totals: **460 passed, 0 failed** before and after; the other kinds (cut, squeeze, font) unchanged.

## 3. Mutations (each must FAIL)

| Suite | Mutation | Result |
|---|---|---|
| load-speed | `--mutate=big` (about.html, ~3 MB random bytes as a module script, gzip leaves ~2.3 MB) | FAIL: `About / phone: ready <= 6000 ms 13295 ms` (1 failed) |
| load-speed | `--mutate=extra-read` | FAIL (3): reads on index.html, now also listing `getDocs records`, and Landing ready |
| load-speed | `--mutate=slow` | FAIL (3): blocking script (phone and desktop) and FCP 4056 ms |
| bangla-layout | `--mutate=clipscroll` (`--page=records.html`) | FAIL (2 at 320, 2 at 390): thead and tbody "past div#app>table (clips at 304 / 374)" |
| bangla-layout | `--mutate=wide` (index.html) | FAIL (7 findings, 4 checks) |
| bangla-layout | `--mutate=cut` | FAIL (4 checks) |
| bangla-layout | `--mutate=squeeze` | FAIL (4 checks) |
| bangla-layout | `--mutate=font` | FAIL (5 checks) |

`stub-parity.mjs`: 4 passed, 0 failed.

Not done: the bangla `cut`/`squeeze`/`font`/`wide` mutations were run on `--page=index.html` only (the mutation
is injected on every page; one page is enough to show it fails).
