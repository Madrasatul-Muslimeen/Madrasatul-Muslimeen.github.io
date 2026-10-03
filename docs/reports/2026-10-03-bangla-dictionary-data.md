# Bangla dictionary meanings: the data (3 Oct 2026)

Decision 62 (the Owner, 3 Oct 2026): *"Can you Build it without permission for
now? Usually all Quranic contents are always free for use in non-commercial
purposes."* The Owner then supplied the source: the AQS **Quraniyo Obhidhan**
(কুরআনীয় অভিধান), Muhammad Abu Hena, ed. Muhammad Yahya, Al Quran Academy
London Bangladesh, 2nd ed. December 2015
(https://archive.org/download/mujammufahras/qab.pdf, 223 pages).

This is the data half, built by the Architect. The screen half (showing the
meaning in the Word card's Dictionary box) is one Builder round.

## What was built

| | |
|---|---|
| File | `tools/quran-data-pull/output/lemma-dictionary-bn.json`, 532 KB (109 KB compressed). Nothing in the app reads it yet. When the Word card does, it loads on first use like the English one (`lemma-dictionary.js`), never at startup. |
| Shape | `entries[lemma] = { m: [Bangla meaning, ...], p: [PDF page of each], t: match tier }`. Keys are the app's own lemmas (`lemmas-index.json`). |
| Coverage | **2,761 of the Qur'an's 4,832 dictionary words (57%)**, which is **57.4% of all word occurrences**. Of the 100 most frequent words, 65 have a meaning; of the 1,000 most frequent, 666. |
| What is missing | Mostly particles and pronouns (مِن, لَا, إِنّ, عَلَىٰ, ذَٰلِك ...), which the book treats as long grammar notes, not glosses. ٱللَّه has no plain headword in the book; it is deliberately left empty rather than taking a meaning from a phrase such as الله أكبر. A few frequent words (ءَامَنَ, ءَايَة, جَنَّة, رَحْمَة) are in the book but their entry could not be matched safely (an alternative-spelling note in the way, or two readings left open), so they are left out. |
| Build | `tools/dictionary-pull/bangla/`: five steps from the PDF, about 30 seconds. The build is **deterministic**: the same PDF gives the same file, byte for byte (checked twice by rebuilding after a deliberate break). |
| Checks | `tools/i18n-verify/bangla-dictionary-data.mjs`: **35 checks, 35 pass**. Every expectation is written by hand from the book. Mutation-proven four times (see below). |

## How a meaning is matched, and what it refuses to guess

The book's headwords carry few or no vowel marks, so an entry is matched to a
lemma by its bare letters. It then has to agree with the lemma on everything the
book does print, or it is left out:

- **Verb or noun.** A Bangla verbal noun (করা, হওয়া, ...) or a present/past pair
  marks a verb, which meets only a verb lemma.
- **Root.** A pair's bracketed root must be the lemma's root. يزود (زود) زاد
  "to provision" is not زَادَ "to increase" (root زيد); يقيل (قيل) قال "to take a
  midday nap" is not قَالَ "to say".
- **Shadda.** The book's shadda must be in the lemma: كتَّاب "scribes" is not
  كِتَٰب "book", and برج is not تَبَرَّجَ.
- **Hamza and madda are letters.** سأل is not سلَّ; آمن is not أمن.
- **A phrase is not a word.** الله أكبر gives nothing to ٱللَّه or أَكْبَر.
- **Still two candidates: left out**, unless they are one word (an assimilated
  al-'s shadda, رَّحِيم / رَحِيم) or one is at least 20 times more frequent.
- **Weaker tiers.** Some corpus lemmas are inflected forms (يُضَٰعِفُ,
  ٱشْتَمَلَتْ); these are reached through their stem. A noun can also be reached
  through its spelling in the Qur'an when that spelling belongs to one lemma
  only. A lemma that has a direct match keeps only those meanings, because the
  weaker tiers are where look-alikes got in (رَجّ once took أرجاء "sides").

**Measured accuracy.** I hand-checked samples against the English dictionary and
the Arabic:
- In a final random sample of 50 words, **every first meaning was right**.
- About one extra meaning in five belongs to a look-alike entry printed with the
  same unvowelled spelling. For example, كَشْف also shows the book's next
  entry, "one who uncovers" (كاشف, whose alif the PDF loses).

So the screen should label extra meanings honestly: "other entries under this
spelling".

## The Bangla text

The book is set in SutonnyMJ, a legacy "Bijoy" font whose bytes are not
Unicode. Three faults were found and fixed at the source:

1. **The ref and ল্ল.** The first converter (`bijoy2unicode`) wrote আলস্নাহ for
   আল্লাহ 180 times, ধমর্ for ধর্ম, and পযর্ন্ত for পর্যন্ত. The build uses
   `bijoy-unicode-converter` 0.1.2 (MIT), which gets them right. The PDF also
   stores a zero-width ref or vowel mark a glyph or two late. Each one is now put
   back after the letter whose edge it sits on, read from its position on the
   page.
2. **Glyphs neither converter knows.** This font has 18 such glyphs, such as
   "যতœবান" for যত্নবান, "আহŸান" for আহ্বান and "ভ‚মি" for ভূমি. Each mapping was
   read from every place that byte occurs in the book; 11 stray characters
   remain in the whole book, none in a matched meaning.
3. **Doubled vowel signs** ("বৃৃদ্ধি") are collapsed.

## Mutation proof

| Break | Checks that failed |
|---|---|
| Drop the root agreement | قَالَ takes "nap"; زَادَ takes "provision"; زَادَ's first meaning changes (3) |
| Use the old converter | no আলস্নাহ/ধমর্ anywhere; আল্লাহ spelled right (2) |
| Drop the glyph repair | no Bijoy byte left; زَوْج holds পত্নী (2) |
| Let "বা" match inside বান্দা | عَبْد starts with বান্দা; the whole-word check (3) |

## Licence, in plain words

The Owner decided (62) to use the book for non-commercial study now, without
waiting for the publisher's reply. Every place that shows a meaning must name
the book, its author and editor, the publisher and the edition. The permission
letter to the publisher stays on the reminder list as a courtesy and a
safeguard. The file's own `source` and `licence` fields say this. The converter
is fetched at build time, not copied into the repository.

## Next

One Builder round: the Word card's Dictionary box shows the Bangla meaning (the
first one prominent; any others under "other entries under this spelling"),
with the book's credit and a link to the PDF page, loaded on first use. In
Bangla the Bangla meaning leads; in English it sits under the English one.
