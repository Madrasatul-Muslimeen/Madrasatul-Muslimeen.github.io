# Bangla Words, Stage 2: how good is an automatic match? (46L, 11 Nov 2026)

For MSA J119. The Owner said: let the app suggest words but keep the suggestions hidden, and let the reader mark their own words. Before any screen is built, this measures the only matcher the repository can support today.

## Method
Each of the 4,832 word rows in `tools/quran-data-pull/output/learn-next.json` has an Arabic lemma (`l`) and a Bangla gloss from the Quraniyo Obhidhan (`b`). I compared the gloss with the Bangla transliteration of the lemma (`banglaTranslit()`), after folding spelling variants (ী/ি, ূ/ু, শ/ষ/স, জ/য, ণ/ন, ত/ট/থ, দ/ড, hasanta, spaces). Script: `/tmp/claude-0/bw2.mjs` (not committed; it is 25 lines).

## Result
| Match | Words | Of 4,832 |
|---|---|---|
| Same after folding | 12 | 0.2% |
| One letter apart (length 3 or more) | 43 | 0.9% |

Same: নূহ, মুসলিম, মিসকীন, ইয়াতিম, ইবলীস, মাসিহ and similar. One apart: আল্লাহ (2,699 uses), ইলাহ, মূসা, যালিম, শহীদ, রিযিক, ঈমান, সালাম, শরীক, হিসাব, ফিতনা, হারাম.

## What it means
- The matcher is **precise** (every sample is a genuine Bangla-used word) but **tiny**: about 55 words, and it misses the very common ones the Owner meant. Many shared words differ in spelling by more than a letter (সালাত, যাকাত, কিতাব, নবী, রাসূল, দুনিয়া…), and a spelling match cannot tell a shared meaning from a lookalike (the rule in the file header: khalā "passed away" is not the Bangla "খালি").
- The transliteration is made by rules and is still "being checked" (`BANGLA_TRANSLIT_NOTE`), so a match can also fail through a transliteration slip (e.g. "মূসা-" with a stray hyphen).
- **There is no list in the repository of Bangla words that come from Arabic.** Without a ground-truth list, recall and wrong matches cannot be measured; only the precision of the 55 above can be read by eye.

## Recommendation (for 97L, then the Owner)
1. Use the 55 as a **hidden seed**, never shown as fact and never counted as known without the reader marking them.
2. For the hundreds the Owner expects, the source has to be a **list the Owner or a scholar supplies** (even a plain list of Bangla words, which I then match to lemmas for the reader to confirm one by one). That is an Owner ask, not a coding task.
3. Stage 3 (the Rules candidate extension for the three kinds) is unaffected and can follow once the reader's own list is wired to the picker.

No code in this PR set depends on this report.
