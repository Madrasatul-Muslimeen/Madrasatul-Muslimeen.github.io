# Audit part 108: no raw id or computer word on any shared page in Bangla (I11, PCF MSA J29)

Check: `tools/i18n-verify/audit-part108-raw-id-sweep-browser.mjs`. Bangla, 390 and 1440, the 24 pages of
`shared-pages-failed-write-audit-browser.mjs` `PAGES` (same seeds; `seerah.html` does not exist, so not run), plus
`deen-study.html` a second time with its root subject absent (the case part 106 fixed). Each page is read on load and again
after its first menu, its folds (`<details>` opened) and its first list item / card are opened. Module and subject ids are read
from `app/js/catalogue-data.js`. Ignored: `<code>`, `<pre>`, `[data-i18n-skip]`, Arabic text.

## Result per page (390 / 1440)

| Page | Finding |
|---|---|
| classes, course-offers, curriculum, backup, import-notes, dawah, onboarding, accept-invite, monitor, homework, people | clean / clean |
| **records.html** | **FOUND / FOUND**: `p#chunkLabel` read "খণ্ড: surah_1" (snake_case key) |
| catalogue, about, bookmarks, hadith-collections, hadith-study, index, notes, journey-map | clean / clean |
| deen-study, deen-study (root absent), arabic-study, admin-self-check, taglines | clean / clean |

## Fixed

- **records.html** (shared page): the label showed the stored chunk key. Real, not harness data: the key is built from the
  chosen unit for every reader. The label now reads "Surah N" / "Quran" / the chosen subject's name through `t()` (existing
  strings only, no `bn.js` change). The raw key moves to `data-chunk-key` on the same element; `behaviour.mjs` 14h and
  `audit-part13-recording-browser.mjs`, `audit-part24-records-continue-browser.mjs` read that instead of the text.

## Handed on

Nothing: no finding in a Hadith, Dua, Health, LDOG or QR file.

## Proof the check can fail

- `--mutate=rawid` (the old raw fallback in `topic-study.js`): 2 findings on deen-study.html (root absent), "deen" in
  `span.topic-crumb-current`, at 390 and 1440; exit 1; `topic-study.js` restored afterwards.
- Positive control: about.html comes back clean at both widths.
- Before the fix the full sweep exited 1 with the 2 records findings; after, 0.

## Not covered

English pages; pages past the first card; error codes only appear if a fault happens (the failed-write audit covers refusals).

## Suites run

`audit-part108` records after fix 0 findings; `audit-part13-recording` 494/0; `audit-part24-records-continue` 178/0; `behaviour.mjs` 971 passed, 0 failed;
`bn-duplicate-keys.mjs` 6/0.
