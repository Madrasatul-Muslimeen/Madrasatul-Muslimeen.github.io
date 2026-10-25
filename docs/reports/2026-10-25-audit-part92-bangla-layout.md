# Audit part 92 — Bangla layout pass of the 23 shared pages (PCF MSA J29, issue #1178)

Suite: `tools/i18n-verify/shared-pages-bangla-layout-audit-browser.mjs`. No app code was changed.
Each page opens in Bangla (the app's own language setting) and again in English at 320x640, 390x844, 768x1024 and 1440x900, with the real-length seed names from the keyboard audit. A finding **fails** only when it is **new in Bangla** (same kind, same element path absent in English at that width). Counts below are `Bangla (English)`.

## Result

`455 passed, 5 failed` (92 page/width rows x 4 kinds + 92 Bangla-rendered positive controls). **Cut text: 0 in both languages. Bangla font: 0.** Sideways overflow: 27 in Bangla vs 37 in English, **none new in Bangla**. Squeezed buttons: 38 vs 34, **5 new in Bangla** (the 5 failures, 3 real defects below).

Checks of the checks: the suite shows `Bangla rendered (positive control)` on every page, and the four mutations below each make it fail.

## Per page and width

| Page | Width | Overflow | Cut | Squeezed | Font | New in Bangla (o/c/s/f) |
|---|---|---|---|---|---|---|
| Classes, Course offers, Curriculum, Backup, Import notes, Dawah, Onboarding, Accept invite, Homework, Bookmarks, Notes, Journey map, Arabic study, Self-check | all four | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Monitor | 320 | 4 (4) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Monitor | 390 | 2 (4) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Monitor | 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| People | 320 | 0 (4) | 0 (0) | 1 (0) | 0 (0) | 0/0/**1**/0 |
| People | 390 | 0 (2) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| People | 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Records | 320 | 4 (4) | 0 (0) | 1 (0) | 0 (0) | 0/0/**1**/0 |
| Records | 390 | 2 (2) | 0 (0) | 1 (0) | 0 (0) | 0/0/**1**/0 |
| Records | 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Catalogue | 320 | 2 (2) | 0 (0) | 0 (1) | 0 (0) | 0/0/0/0 |
| Catalogue | 390, 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| About | 320 | 4 (4) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| About | 390 | 2 (2) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| About | 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Hadith collections | 320 | 0 (2) | 0 (0) | 10 (7) | 0 (0) | 0/0/**1**/0 |
| Hadith collections | 390 | 0 (0) | 0 (0) | 3 (5) | 0 (0) | 0/0/**1**/0 |
| Hadith collections | 768 | 0 (0) | 0 (0) | 7 (3) | 0 (0) | 0/0/0/0 |
| Hadith collections | 1440 | 0 (0) | 0 (0) | 8 (4) | 0 (0) | 0/0/0/0 |
| Landing | 320 | 0 (0) | 0 (0) | 1 (5) | 0 (0) | 0/0/0/0 |
| Landing | 390 | 1 (1) | 0 (0) | 1 (4) | 0 (0) | 0/0/0/0 |
| Landing | 768 | 0 (0) | 0 (0) | 4 (3) | 0 (0) | 0/0/0/0 |
| Landing | 1440 | 3 (3) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Deen study | 320 | 0 (0) | 0 (0) | 1 (1) | 0 (0) | 0/0/0/0 |
| Deen study | 390 | 0 (0) | 0 (0) | 0 (1) | 0 (0) | 0/0/0/0 |
| Deen study | 768, 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Taglines | 320, 390, 768 | 1 (1) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| Taglines | 1440 | 0 (0) | 0 (0) | 0 (0) | 0 (0) | 0/0/0/0 |
| **Totals (92 rows)** | | **27 (37)** | **0 (0)** | **38 (34)** | **0 (0)** | **0/0/5/0** |

(The full one-row-per-width table, with every finding's text, is `tools/i18n-verify/out/bn-layout/rows.json`, written by each unmutated full run.)

## Mutations (each run once on `--page=index.html`; each must FAIL)

| `--mutate=` | Injected | Result |
|---|---|---|
| `wide` | 900px `nowrap` Bangla span | 16 passed, **4 failed** (overflow, every width) |
| `cut` | Nav label `max-width:30px; ellipsis; nowrap` | 16 passed, **4 failed** (cut: "পরিচালনা" needs 40px, has 30px) |
| `squeeze` | A button's height 20px | 16 passed, **4 failed** (squeeze: "খুঁজুন" 20px tall) |
| `font` | `font-family: monospace` on body text | 15 passed, **5 failed** (font 32–36 findings per width; plus a side-effect squeeze at 1440) |

Unmutated Landing: 20 passed, 0 failed. Two things were learned writing them: `document.fonts.check()` returns true for any installed face (so it cannot fail for `monospace`), so the font check also refuses a stack pinned to monospace/Courier with no Bengali family named; and the Bangla nav label "হোম" is only 3 characters, so the `cut` mutation targets the longest visible nav summary.

## What I saw in the 320px screenshots (`tools/i18n-verify/out/bn-layout/`)

Looked at hadith-collections, records, index (landing), monitor and classes. Bangla glyphs render properly everywhere (Bengali font present, conjuncts intact). Landing: the bottom dock's "আমার যাত্রার মানচিত্র" wraps to two lines inside its tab, still fully readable; the nav row fits. Records and Classes: the four nav buttons and forms fit, nothing cut. Monitor: the Bangla report table is wider than the 320px screen and is clipped at the right edge ("সক্রিয় দিন" column) — the English table is wider still (460px vs 376px), so Bangla is better, but it is a real clip. Hadith collections: the filter chips wrap tidily; hadith row titles are long Bangla headings on two to three lines.

## For the Architect — real defects, smallest fix

1. **Records, "তবুও নিশ্চিত করুন" (Confirm anyway) wraps to 3 lines at 320 and 390** (new in Bangla). `app/records.html:543`, the `.small.confirmBtn` in a narrow table cell. Smallest fix: `white-space: nowrap` on `.confirmBtn` is wrong (it would widen the table); better a shorter Bangla string for "Confirm anyway" in `app/js/i18n/bn.js:1331` (e.g. "তবুও নিশ্চিত"). **Shared** (Records page, bn.js beyond a module's strings is the Architect's).
2. **People, "লিংক কপি করুন" (Copy link) wraps to 3 lines at 320** (new in Bangla). `app/people.html:510`, `.getLinkBtn` in the invite table. Smallest fix: shorten the Bangla for "Copy link" in `bn.js` (e.g. "লিংক কপি"), or `min-width` on the cell. **Shared**.
3. **Hadith collections, a `.hadith-row` button with a long Bangla heading ("দা‘ওয়াহ্ (আল্লাহর পথে আহ্বান) ও হিসবাহ …") wraps to 3 lines at 320 and 390.** `app/css/hadith.css:41` (`.hadith-row`). This is a list row holding a long title, not a squeezed label, so it is likely acceptable; if not, no fix is needed beyond allowing the row to grow (it already does). **Hadith Lead**, low severity.
4. **Not new in Bangla, but real:** Monitor's report tables (`app/monitor.html`, `#reportBody table`, `#quranBody table`) and Records' two tables, About, Catalogue at 320 run past the screen edge in both languages (sideways clip). Wrap the tables in `overflow-x:auto` containers. **Shared**.

No Bangla font defect, no cut text, no sideways overflow that Bangla causes.

## Not reached

Nothing skipped: all 23 pages x 4 widths x 2 languages ran. Limits: the sandbox has no installed Bengali webfont check beyond the browser's own fallback, so the fallback-glyph width comparison can only flag a clear mismatch (none found); Bangla pages that show only a sign-in gate (Classes, Course offers, etc., all zero findings) were measured as rendered.
