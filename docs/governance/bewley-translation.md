# The Bewley translation in Quran Study — decision, source, and the way out

**Owner instruction, 20 Nov 2026 (the QR Lead's chat):** "Keep doing now for every month. until En Shaa Allah I will buy a pdf and upload here later."
It followed the Owner's reading of the Lead's rights note: the text is on aishabewley.org for reading and states no terms for reuse, and the repository is public.
The Owner chose to go ahead; this note is the record of that choice, so a later session does not have to guess.

## What it is
*The Noble Qur'an: A New Rendering of its Meaning in English*, Abdalhaqq and Aisha Bewley (Bookwork, 1999; later printings by Madinah Press / Diwan Press / Ta-Ha).
Set in lines, one per breath, with indents that follow the sense and a blank line between stanzas.

## Where it comes from
`https://aishabewley.org/quran` puts up **one hizb a month and only one at a time** ("There will only be one hizb up at a time"). `tools/quran-data-pull/pull-bewley.mjs`
reads the hizb named there, keeps its layout (verse numbers, indent steps from `margin-left`, stanza breaks) and **adds** it to `tools/quran-data-pull/output/bewley/`
(`index.json` + `surah_NNN.json`, only the sūrahs that have verses). Earlier months stay; a month only adds.
**Who runs it:** a weekly Claude scheduled task (in the Owner's account, NOT a workflow in this repository; the Architect may move it into one) runs the script and opens a pull request only when a new hizb has appeared. Until that task exists (it is created after the first merge), run the script by hand.
Hizb 38 (26:105–27:55) was the first, read on 20 Nov 2026.

## How the app uses it
`app/js/quran-data.js` puts Bewley on a verse only when the reader chooses it (Study options → Reading view → English translation) and the verse is published.
Everything else keeps Saheeh International, which stays the default. **Search** (`searchQuran`, the prebuilt `search-en.json`) still looks through Saheeh's wording only; the picker's note says so. Nothing of Bewley is fetched unless it is chosen. The picker's note credits the translators and names aishabewley.org.

## The way out (what replaces this)
The Owner is buying the licensed edition (PDF). When it is uploaded: convert it to the same `bewley/surah_NNN.json` shape (the layout rule above), set the credit to the licensed
edition, **delete the monthly scheduled task**, and remove this note's "Where it comes from" section. To stop sooner: delete the scheduled task and `tools/quran-data-pull/output/bewley/`;
the picker then says "Nothing published yet" and every verse shows Saheeh.

## What is NOT claimed
The text is not ours and is not rights-cleared by any grant we hold; it is shown credited, from the translators' own public page, on the Owner's instruction.
The file at a third-party site (islamunlocked) is an older printing (1:4 reads "Day of Judgement"; the 2020s book reads "Day of Repayment") and is NOT used.
