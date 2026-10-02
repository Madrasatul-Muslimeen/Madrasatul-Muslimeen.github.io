# Dictionary and Qur'an data — permission letters (drafts for the Owner)

1 Oct 2026. Drafted by the Architect at the Owner's request. **These are drafts: the Owner reviews, edits and sends them.** Nothing has been sent, and nothing in the app has been changed.

## The Owner's decisions (1 Oct 2026), recorded

1. **English dictionary meanings.** Use the **Quranic Arabic Corpus** for verbs and **Wiktionary** for the rest. Credit and share-alike are accepted. Today's word-by-word meaning stays as the fallback.
2. **Bangla dictionary meanings.** Ask for written permission (option 1); the letter is below. Until permission arrives, today's Bangla word-by-word meaning stays, labelled as such.
3. **Printed dictionary links.** Use both:
   - **Lane's Lexicon**, which is out of copyright: link to its online text and to free scans.
   - **Hans Wehr**, by page number only. Its page images are never shown.
   - Still open: whether to link to the one website that shows Hans Wehr's pages without stating it has permission. Until the Owner says otherwise, the default is the page number only.
4. **quran.com data.** Ask the Quran Foundation for permission; the letter is below. The app's verse word-by-word data (English and Bangla) and tajweed text were pulled from `api.quran.com` v4 by `tools/quran-data-pull/pull.js` and are stored in the app.

Fill in everything in `[square brackets]` before sending.

## Where to send them (looked up 1 Oct 2026; check before sending)

**Letter 2, Quran Foundation: `developers@quran.com`** (high confidence).
- It is the address the Developer Terms give for licensing questions (https://api-docs.quran.foundation/legal/developer-terms/).
- The developer FAQ gives it for storing content and for partnerships (https://api-docs.quran.foundation/docs/tutorials/faq/).
- The terms forbid storing their content for more than a week without express permission. That is exactly what this letter asks for.
- General fallback: the Quran Foundation, 2918 Avenue I – Unit #5345, Brooklyn, NY 11210. `info@quran.foundation` appeared only in a search snippet and was not confirmed on their site.

**Letter 1, Bangla dictionary.**
- The book is *কুরআনীয় অভিধান* (Quraniyo Obhidhan) by Muhammad Abu Hena and Muhammad Yahya. It is published by the **Academy of Quran Studies (AQS)**, Dhaka (3rd edition, 2018).
- **Best first step: message AQS on Facebook** (https://www.facebook.com/myaqs) and ask it to confirm its email address and who holds the rights. The rights may be the authors' (or their heirs'), not the publisher's.
- Phone, from a directory copy of that page: +880 1711-262923 or +880 1974-403592.
- `info.aqsbd@gmail.com` appeared only in a search summary and is **unverified**.
- Their website `aqsbd.org` did not load.
- Postal: 149 East Raja Bazar, Dhaka 1215.

---

## Letter 1 — Bangla Qur'an dictionary (Abu Hena & Mohammad Yeahia, or their publisher)

**Subject:** Permission request: short Bangla word meanings for a free, non-commercial Qur'an study app

Assalamu alaikum wa rahmatullah,

My name is [your name]. I run **Madrasatul Muslimeen**, a small family and community madrasah. We are building a free Qur'an study app, *MMSA — Madrasatul Muslimeen's Study App*, used by our own students and families at https://madrasatul-muslimeen.github.io/. It has no advertising and no charge.

When a student taps a word of the Qur'an, the app shows that word's dictionary form and a short meaning. We have English meanings from openly licensed sources. **We have no Bangla source we are allowed to use.** Your Bangla Qur'an dictionary is the most trusted one we know of.

We would like to ask your permission to:

- show a **short Bangla meaning** (one line) for each Qur'anic dictionary word (about 4,800 words), taken from your dictionary;
- store those meanings inside the app, so it works without an internet connection;
- show, beside every meaning, a credit to you and your dictionary, worded however you prefer, with a link to where it can be bought.

We would not reproduce the full entries, the introduction or the layout of the book, and we would not sell or pass on the data. If you would prefer limits, for example verbs only or a trial period, we will follow them. If there is a fee or a licence form, please tell us.

JazakAllahu khairan for considering this.

[your name]
[role], Madrasatul Muslimeen
[email] · [phone, optional]

---

## Letter 2 — Quran Foundation (quran.com)

**Subject:** Licence request: stored copy of quran.com API v4 word-by-word and tajweed data in a free madrasah study app

Assalamu alaikum wa rahmatullah,

My name is [your name], of **Madrasatul Muslimeen**, a small family and community madrasah. We build a free, non-commercial Qur'an study app for our students and families (https://madrasatul-muslimeen.github.io/). It has no advertising and no charge, and the code is public on GitHub.

Some time ago we used the public **quran.com API v4** to download, one time, for all 114 surahs:

- the **word-by-word** Arabic, transliteration, English and **Bangla** meanings;
- the **tajweed-tagged** Uthmani text;
- the Bangla surah names.

These are stored inside the app, so that it works offline and loads quickly. We credit quran.com as the source.

We have since read your current developer terms. They say a stored copy of this kind needs a signed licence from the Quran Foundation. We are not sure whether those terms cover the older service we used, so we would like to put this right:

1. Could you grant us a licence for this stored copy, for free non-commercial educational use, with whatever credit wording you prefer?
2. If a stored copy is not allowed, how would you like us to use the data instead? We will follow your guidance.

We are grateful for everything the Quran Foundation has made available to the ummah. JazakAllahu khairan.

[your name]
[role], Madrasatul Muslimeen
[email]

---

## Not done here

- No source has been downloaded or added to the app. Building the dictionary step is a separate round, after the coverage check named in the research.
- Wiktionary meanings are share-alike, so the app must show their credit and licence wherever they appear. That is to be designed in the build round.
