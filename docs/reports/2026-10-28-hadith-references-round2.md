# Hadith references, Rounds 1–2: a book and a number for each HadeethEnc hadith (PCF MSA J103)

**Hadith Lead, 28 Oct 2026.** The Owner asked, on 28 Oct: "have all Hadith books reference to original book's Hadith
numbers … re-checked by yourself". They chose 1A (the standard number, as on sunnah.com) and 2A (the Arabic chapter
name, with the English one where the translation gives it). This report covers the data and its proof. Nothing is on
screen yet; Round 3 is the display.

## The gap

The 15 Arabic books in the library already carry their numbers and chapters. The gap is the HadeethEnc cards
(3,574 Arabic hadith, 2,328 of them in English). Each card names only the books, for example "رواه مسلم" or
"متفق عليه". It never gives a number or a chapter.

## Round 1: find (`tools/hadith-data-pull/hadeethenc-references.mjs`)

- The script reads each attribution line and searches **only the books the line names**:
  - "متفق عليه" counts as both al-Bukhari and Muslim.
  - Longer names are read first, so al-Adab al-Mufrad is never taken for the Sahih, and al-Nasa'i's Kubra is never
    taken for the Sunan.
  - Books the library does not hold (Ibn Hibban, al-Hakim, the Kubra …) are listed as "outside".
- The matching is the same word 3-gram search the concordance uses. It keeps the best passage and the second best.
- Result: 3,574 hadith and 6,058 (hadith, book) pairs. 77 hadith name no book that the library holds.

## Round 2: prove (`tools/hadith-data-pull/hadeethenc-references-check.mjs`)

A reference counts as **proven** only when independent methods agree:

- **Books with a standard number** (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik). All of these
  must hold:
  - Round 1 scores at least 60%.
  - A second search over the standard edition itself (fawazahmed0, downloaded to a scratch folder and not committed)
    puts the **same standard number** at the top, or tied within 2 points, with a score of at least 60%.
  - Where both sides have English, the translations are not against it (similarity of at least 0.2).

  When Round 1 missed but the standard edition's own top match scores at least 75% and the English agrees at 0.3 or
  more, that top match is taken. These are the "recovered" rows. Their library passage is found by reading the
  concordance backwards.
- **Other books** (Ahmad, Darimi, al-Adab al-Mufrad …). All of these must hold:
  - Round 1 scores at least 60%.
  - A second method (the longest common run of words) covers at least 70% of the hadith.
  - The best passage leads the second best by at least 10 points.
- **Muslim** is cited by Abdul-Baqi's number, as sunnah.com does.

| Book | pairs | proven | of which recovered |
|---|---|---|---|
| al-Bukhari | 1,799 | 1,259 | 12 |
| Muslim | 2,080 | 1,072 | 17 |
| Abu Dawud | 565 | 394 | 0 |
| Ahmad | 501 | 167 | 0 |
| al-Tirmidhi | 477 | 242 | 1 |
| al-Nasa'i | 213 | 72 | 0 |
| Ibn Majah | 352 | 99 | 0 |
| Malik | 18 | 6 | 0 |
| al-Darimi | 50 | 5 | 0 |
| al-Adab al-Mufrad | 3 | 0 | 0 |

- **2,887 of 3,574** hadith have at least one proven reference.
- **1,598** have every book they name proven.
- Of the 2,328 English hadith, **1,730** have a proven reference, and 53 name only books outside the library.
- **7 proven rows** have a number but no library passage, so they can show the number but cannot open it.

## The re-check (by the Hadith Lead, by reading)

I picked 100 proven rows at random (seed 103). For each one I read the HadeethEnc Arabic beside the matched text.
**All 100 were the same hadith.**

## The automatic check (`tools/i18n-verify/hadeethenc-references.mjs`, 9 checks, about 2 s)

Its expected values do not come from the matcher:

1. **Abu Dawud, Tirmidhi, Nasa'i and Ibn Majah print their own numbers** in the OpenITI editions. All 807 proven
   rows in those four books agree with the edition's printed number.
2. A hand-known pair: "إنما الأعمال بالنيات" (HadeethEnc 4560) is Muslim 1907.
3. **The words themselves:** 3,295 of 3,309 proven passages hold more of the hadith's words than the passages just
   before and after them. A positive control moves every reference by one passage, and only 3 of 3,309 still pass.

It also checks that every proven row meets the rule that proved it.

Each guard was mutation-proven, and each run exited 1:
- an "unproven:english" row relabelled proven;
- an Abu Dawud number moved by one;
- Muslim 1907 changed to 1908.

**The first of those mutations initially went unnoticed.** The file did not record whether the two searches agreed.
The check script now stores `agree` on each row, and the check requires it.

## What is not yet found, and why it is shown as such

- About 1 in 4 named-book pairs stay unproven. Most are "not found": the HadeethEnc text is a short extract and the
  book's wording differs.
- **One known example:** "إنما الأعمال بالنيات" in al-Bukhari. That hadith is in al-Bukhari seven times, so no
  single passage leads, and the rule refuses to guess.
- Round 3 shows such a reference as "number not yet found", never as a guessed number.
- Round 4 is planned to raise this count: the Bukhari repeats, and the Bukhari and Malik standard-number gaps.

## Paths

- QR reads Hadith data from `/tools/hadith-data-pull/output/…`. This round only **adds** a folder,
  `output/hadeethenc-references/` (`candidates.json`, `references.json`, `summary.json`), and moves nothing.
- The fawazahmed0 editions are never committed.

## Round 3: on the card (`app/js/hadith-browser.js`, `app/js/openiti-corpus.js`)

- **The data.** `tools/hadith-data-pull/hadeethenc-references-display.mjs` writes `output/hadeethenc-references/display/`:
  46 shards, one per 200 ids, each 40 KB at most.
  - Each shard holds the proven references: book, cited number, library passage, the English book name from the
    standard edition's sections, and the Arabic kitab and bab from the OpenITI chapter headings.
  - It also lists the named books whose number is not yet found.
  - A card loads only its own shard, and only when the card is opened (I9).
- **The card.** Under the "Narrated by" line, the card shows each reference, e.g. "Muslim 1907 · The Book on
  Government". Under it is the Arabic chapter, "33 - كتاب الإمارة · 45 - باب قوله …".
  - Tapping the reference opens that passage in the OpenITI library below and highlights it. A sticky
    "← Back to the hadith card" button returns to the card (decision 86).
  - A named book without a proven number reads "Bukhārī: number not yet found". No number is guessed.
  - Books with no standard numbering (Ahmad, Darimi …) are marked "(this edition's number)".
- **The check.** `tools/i18n-verify/hadeethenc-references-browser.mjs` has 28 checks. It covers
  hadith-collections.html in en at 390 and bn at 820, and hadith-study.html in en at 1280. It checks that:
  - 4560 shows Muslim 1907, at least 40 px tall, with its Arabic chapter and "not yet found" for Bukhārī, and the
    page has no sideways scroll;
  - the tap opens a passage that the **library itself numbers** 1907 (from the concordance, a different file);
  - ← Back lands on the card, on screen;
  - the first proven reference of each of seven more books opens the passage numbered the same.

  Each guard was mutation-proven, and each run exited 1:
  - opening the next passage: 9 checks fail;
  - no way back: 6 fail;
  - not-yet-found hidden: 3 fail.
- **Screenshots looked at:** en at 390 and bn at 820.
