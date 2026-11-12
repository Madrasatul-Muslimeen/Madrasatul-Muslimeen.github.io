# Nasa'i printed page: content-aligned bridge, design (Hadith Lead 13L, 12 Nov 2026)

Owner ticked hd1111n C/D (11 Nov). Registry row `nasai` in `tools/hadith-data-pull/sources/book-pages.json` is `status: blocked`.

## How `cite` is derived (checked)
- `cite` is the **standard number** (sunnah.com / hadith-api `ara-nasai`, 5,765 entries). `hadith-concordance.mjs` maps each of our records `n` to it by Arabic word 3-gram overlap (>= 0.5; 5,681 of 5,769 passages matched, 5,671 standard numbers covered), stored in `output/concordance/0303Nasai...json` (`entries: [n, standardNumber, score, pass]`).
- The reader's page button uses `cite` for scan books (`hadith-browser.js`, `pageNo = cite`). The English files in `output/translations/nasai/en` are keyed by the **same standard number**.
- The Darussalam scan prints its own numbering (1-5758). It drifts from the standard one by -1 to -6 and runs, with short jumps (e.g. -30), so mapping by number gives wrong pages (11 Nov: 67% cross-check).

## What was measured today (pilot, throwaway script, not committed)
- archive.org is reachable from the sandbox: `..._djvu.xml` of Vol 1-5 (34 MB, 2,717 leaves) and Vol 6 (8.8 MB, 491 leaves) downloaded; `book-pages-build.py` parse finds 5,289 numbered lines.
- Sampled 600: only 42 agree by number; 132 agree at offset -1, 85 at -2, 44 at -3, 33 at -4, 27 at -5; 200 agree with no hadith within +/-40 (OCR noise, text not on the number's line).
- A first crude forward aligner (window = scan number + running offset, difflib >= 0.6 on 30 words) maps **3,062 of 5,672** standard numbers. Not tuned; not the target.

## Design
1. Reuse the builder's leaf parse. For each numbered line take the next ~4 lines as the scan hadith text (English).
2. Align **scan hadith -> standard number by content**, monotone: for scan candidate with number `s`, test standard numbers in `[prev+1, s+k+6]` where `k` is the running offset (drifts slowly), score = difflib on the first 30 normalised words; accept at >= 0.6; update `k`. Add a second pass for the misses: a candidate with no match is retried with the 8-word exact-phrase test used in `shamela-pages-text.py`, and with the Arabic-facing neighbours (the scan is English only, so no Arabic).
3. A standard number with no accepted match gets **no page** (no button), as for Darimi (92 dropped) and Ahmad (494). No interpolation unless flagged approximate in the existing `a` list (the builder already supports it).
4. Output stays in the existing shape: `output/book-pages/nasai.json` (`p`: index `cite-1` -> leaf across the two parts; `a`: approximate numbers). **No app change is needed**: the button, credit and Back already work for scan books keyed by `cite`. Two-file books are already supported by the builder.
5. Registry: `status: mapped`, note describing the bridge; add `crossCheck` to compare mapped pages with an independent sample.

## Checks planned
- Independent sample of 3 x 400 mapped numbers: 6 consecutive exact words of our English text on the mapped leaf (as for Ahmad); control: a leaf 50 away.
- New suite `hadith-nasai-pages-browser.mjs` with `--prove` mutations (shift page, wrong part boundary at 4,990/4,991, off-by-one number), hand-read anchors in `hadith-shamela-anchors.json` style (3 numbers read on the live archive.org leaf).
- `hadith-book-pages-browser.mjs` (109) and neighbours stay green; `offline-files.json` regenerated.

## Risks
- OCR errors on numbers and on opening words: the aligner needs more than one anchor per leaf; expect coverage well below 100%, report the exact figure.
- Hadith that the scan prints without the number at line start (multi-part, "Chapter" headings): dropped, never guessed.
- Standard numbering has 5,765 vs 5,758 in print, so up to ~7 numbers have no print counterpart by design.

## Next step
Build the aligner (`tools/hadith-data-pull/book-pages-nasai.py`), measure coverage, report. No version bump, no merge by the Lead; the PR goes to the MSA Architect (100L).

## Pilot 2 (12 Nov, later; throwaway script, still not committed)
Two passes, monotone by construction:
1. Anchors: each numbered scan line vs standard numbers in [s-14, s+5], difflib >= 0.6 on 30 words, then the longest increasing chain by (cite, page order): 3,148 candidates, **3,028 anchors**.
2. Gap fill: between two neighbouring anchors, scan lines in order may take only the standard numbers strictly between them (within 6 of the expected shift), threshold 0.42 (the OCR garbles names): **+784**.

Result: **3,812 of 5,672 standard numbers (67.2%), 0 pages going backwards.**

Failures read by eye: (a) OCR-garbled names ("ju y j f y a yn muhammad") which pass 2 recovers; (b) numbered **footnotes and commentary** ("1 we learn that for men the use of gold...") that are false candidates and are rejected by the chain; (c) the 5,289 numbered lines are fewer than the 5,758 printed hadith, so about 1,860 standard numbers have **no scan line to match**. Closing that needs the aligner to find hadith starts by text (the "It was narrated that..." opening after a chapter heading), not only by a leading number. That is the next step, then the independent sample check.

## Lesson from 100L's review of #1663 (applied)
`tools/i18n-verify` was grepped for the versionUri this book would give pages to (`0303Nasai.SunanSughra.JK000130-ara1`): no suite names it. The two suites that name a Nasa'i book (`openiti-browser.mjs`, `dua-check-browser.mjs`) use a different one (`0303Nasai.CamalYawmWaLayla.JK000735-ara1`, 'Amal al-Yawm), so the "a book with no scan and no Shamela page" check is unaffected. Re-grep when the data PR is built, since main moves.
