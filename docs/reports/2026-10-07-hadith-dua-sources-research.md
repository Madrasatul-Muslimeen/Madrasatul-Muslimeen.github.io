# Hadith database first, then Dua from its chapters: what is possible (7 Oct 2026)

**The Owner's question (7 Oct 2026, verbatim):** "Dua: it relates to Hadith. I want all Dua chapters from all hadith
books to build Dua data base therefore, have two build Hadith module and its database first. Look at hadithbd.com,
ihadith.com and gtaf.org, hadith encyclopedia etc and tell me what is possible."

**Research only. Nothing was built, committed or fetched into the app.** This builds on
`docs/reports/2026-10-06-dua-module-resources.md` (Dua sources) and
`docs/reports/2026-09-18-hadith-h1-source-rights-and-reference-schema.md` (Hadith rights model), and does not repeat
them. Every page marked UNVERIFIED could not be opened from this sandbox; its row is from search results only.

## 1. In short

- **The Arabic of every major book is already on disk** (OpenITI, accepted by the Owner on 26 Sep, decision 8:
  Arabic only, non-commercial, credit OpenITI). Its Dua chapters were counted below: about **1,000 narrations**.
- **Bangla and English of whole books is the real gap.** Every complete Bangla translation found belongs to a
  Bangladeshi publisher (Tawheed Publications, Islamic Foundation Bangladesh, Hadith Academy, Husain al-Madani,
  Ahsan Publications). No site found holds them under an open licence. **They need permission letters.**
- **ihadith.com does not exist**: it is a parked domain for sale. The site the Owner most likely means is
  **ihadis.com ("Al Hadith", IRD Foundation)**, which was opened and is the best map of who owns which Bangla book.
- **HadeethEnc remains the only Bangla hadith source usable today without a letter**: 143 dua/dhikr hadiths in
  Bangla (208 in Arabic, 149 in English) are already packaged.

## 2. What is already on disk: the Dua chapters in the OpenITI Arabic files

**How chapters were found.** `tools/hadith-data-pull/output/openiti-release/split/<book>/index.json` lists each
book's top-level headings with their passage and hadith counts; each shard file carries the sub-headings (`paths`).

- For **Bukhari, Muslim, Tirmidhi, Nasa'i, Riyad as-Salihin and Malik** the top level is the *kitab*, so the Dua
  kitab was found by its Arabic title (الدعوات، الذكر والدعاء، الاستعاذة، الأذكار) and its *babs* counted from `paths`.
- **Ibn Majah, Abu Dawud and ad-Darimi** carry only *bab* headings, with no kitab heading in the file. Their kitabs
  were rebuilt by finding where the bab number **restarts at 1** (Ibn Majah: 38 kitabs; Abu Dawud: 34; Darimi: 25),
  then the Dua kitab was identified by its first bab (e.g. Ibn Majah "1 باب فضل الدعاء").
- Each boundary was cross-checked against the section ranges of fawazahmed0/hadith-api (`info.min.json`) and
  ihadis.com's chapter pages. Five of eight agree to the number; three do not (see the numbering note).

| Book (OpenITI file) | Dua chapter | Babs | Narrations counted | Numbers in this file | Standard numbers (other sources) |
|---|---|---|---|---|---|
| Sahih al-Bukhari (JK000110) | 80 Kitab ad-Da'awat (heading "83" in this edition) | 69 | 104 hadith + 6 chapter-texts | 5945–6048 | **6304–6411 (108)** |
| Sahih Muslim (Shamela0001727) | 48 Kitab adh-Dhikr wa'd-Du'a wa't-Tawba wa'l-Istighfar | 27 | 292 paragraphs (file has no hadith numbers) | paragraph 12663–12954 | 6805–6936 (fawazahmed0, 132); 6698–6844 (Hadith Academy Bangla, 147) |
| Sunan Abi Dawud (JK000142) | Kitab as-Salat: Witr section, babs 337–368 (includes 359 "al-Du'a", 362 Istighfar, 368 Isti'adha) | 32 | 140 | 1416–1555 | 1416–1555 (same) |
| Jami' at-Tirmidhi (JK000140) | 49 Kitab ad-Da'awat | 133 | 236 | 3370–3604 | 3370–3604 (same) |
| Sunan an-Nasa'i (JK000130) | 50 Kitab al-Isti'adha | 65 | 112 | 5428–5539 | 5428–5539 (same) |
| Sunan Ibn Majah (JK000141) | 34 Kitab ad-Du'a | 22 | 66 | 3827–3892 | 3827–3892 (same) |
| al-Muwatta' (Shamela0028107) | Kitab al-Qur'an: babs "Dhikr Allah", "al-Du'a", "al-'Amal fi'd-Du'a" | 3 | 26 | 711–739 (edition paragraph numbers) | – |
| Riyad as-Salihin (Shamela0012014) | Kitab al-Adhkar + Kitab ad-Da'awat | 6 + 4 | 57 + 46 = 103 | 1408–1464, 1465–1510 | Tawheed Bangla: 1416–1472, 1473–1518 (offset 8) |
| Sunan ad-Darimi (JK000842) | No Dua kitab; 21 babs whose titles mention du'a/dhikr/tasbih/istighfar/witr, scattered | 21 | 39 | various | – |
| Musnad Ahmad (Shamela0025794) | **None**: arranged by Companion, not topic | – | – | – | Found later by matching |
| an-Nawawi's Forty | None | – | – | – | – |

**Total in the Dua chapters already on disk: about 1,000 narrations** (in the standard numbering: Bukhari 108,
Muslim ~132, Abu Dawud 140, Tirmidhi 235, Nasa'i 112, Ibn Majah 66, Malik 26, Riyad 103, Darimi 39 = **961**).

**Three cautions from the count:**

1. **Numbering is not one thing.** The OpenITI Bukhari (JK edition) has 7,129 numbered hadiths against the standard
   7,563, and its Kitab ad-Da'awat is 5945–6048, not 6304–6411. Muslim has three numberings in play. Riyad differs by
   8. A per-book **concordance table** is needed before any number is shown or keyed. This is exactly the H1 rule:
   "never infer cross-edition equivalence from a number alone".
2. **Dua chapters are not all the duas.** Many duas sit elsewhere: Bukhari's Kitab al-Adhan (dua in prayer), Muslim's
   Kitab al-Masajid, Abu Dawud's Kitab al-Adab (morning and evening, sleep: around 5068–5090), Tirmidhi's Witr book.
   A second pass is needed, guided by Hisn al-Muslim's references (asellam, MIT) and HadeethEnc's dua categories.
3. **Abu Dawud's Witr section** includes fiqh of witr (how many rak'as), not only duas; the strictly-dua babs are
   359–368 (about 77 narrations, 1479–1555).

**Further Arabic books OpenITI holds that are not yet pulled** (opened on GitHub): **al-Adab al-Mufrad**
(`0256Bukhari.AdabMufrad`, whose dua chapter is 608–744, 137 hadiths, in ihadis.com's numbering) and **an-Nawawi's
al-Adhkar** (`0676Nawawi.Adhkar`). Both come under the same accepted licence. Nasa'i's *'Amal al-Yawm wa'l-Layla* and
Ibn as-Sunni's book of the same name may also be there (UNVERIFIED).

## 3. The sources asked about

| # | Source | What it holds | Machine-readable? | Rights | Verdict |
|---|---|---|---|---|---|
| 1 | **hadithbd.com** (Bangla Hadith app `com.hadithbd.banglahadith`) UNVERIFIED: 403 from here | Search results: "80,000+ hadith from 25 collections", 150+ books, several books in two Bangla versions, one of them Islamic Foundation's. Bukhari, Muslim, Abu Dawud: IF plus another. Website and app only. | **No API or download found.** | No licence found. The translations belong to their publishers (IF Bangladesh and others), not to hadithbd. Contact email shown in search results only partly (`in…@hadithbd.com`). | **Not usable as a source.** At most a contact who can point to the publishers. |
| 2 | **ihadith.com** | **A parked domain**: "This domain is for sale: $695". | – | – | **Not a source.** |
| 2b | **ihadis.com "Al Hadith"** (IRD Foundation, Bangladesh, non-profit since 2013), the likely intended site | 14 books on its English index, "25+" on the Bangla site, 49,000+ hadiths. Bangla, English, Arabic, Urdu, Indonesian. Chapter pages give the Bangla publisher and the hadith range. | **Website and app only; no API found.** | "© ২০২৬ আল হাদিস। সর্বস্বত্ব সংরক্ষিত" (all rights reserved). Its terms say: cite Al Hadith and the original rights holder when quoting; **"obtain the rights holder's permission before large-scale republication or commercial use of text, translations, images or data"**; third-party content belongs to its owners. | **Needs permission**, and IRD can only grant its own work. For each book's Bangla, the letter goes to that publisher (§4). |
| 2c | **Dua & Ruqyah** (IRD, duaruqyah.com 403 from here; App Store opened) | "1000+ duas" in 41 categories, 15 languages, audio, references to Bukhari/Muslim and Hisn al-Muslim. © 2025 IRD. | App only. | All rights reserved. | **Needs permission.** It is the closest existing thing to what the Owner wants. |
| 3 | **gtaf.org** (Greentech Apps Foundation, UK Charity No. 1178251) | **Hadith Collection (All in One)**: 41,000+ hadiths, 15+ books, grades; English, Bangla, Urdu, "not all books are yet translated into Bangla". **Dua & Zikr (Hisnul Muslim) – Bangla**: 300+ duas, mainly Hisn al-Muslim plus the Qur'an and *Rahe Belayat*, each with references, with audio. | **No API or open data stated.** Apps only. | No licence on the pages; translators not named. Contact is a web form only (categories include "Partnership/Collaboration"). | **Needs permission.** A good partner to ask (a charity that already builds free apps), but its translations are probably licensed from others too. |
| 4 | **HadeethEnc.com** (Encyclopedia of Translated Prophetic Hadiths), already packaged | A curated selection, not whole books. On disk: 3,574 Arabic, 2,328 English, 1,925 Bangla. Dua/dhikr categories (Supplications and Remembrance 115, Reported Supplications 33, Dhikr in Prayer 23, Special Occasions 21, Ruqyah 9 and others): **208 Arabic, 149 English, 143 Bangla**, counted from the package. | JSON API, no key. | Published conditions: no change, addition or deletion; name HadeethEnc. | **Usable now** (already in use under decision 7). |
| 5 | **dorar.net al-Mawsu'ah al-Hadithiyyah** UNVERIFIED: 403 (Cloudflare) | Arabic only. A search engine over hundreds of books, with gradings by many scholars (*muhaddith*), and commentary. | A JSON search endpoint exists and third-party libraries use it (pub.dev `dorar_hadith`); no published terms found. | None found. | **Not for bulk use.** Useful by hand to check a grading; ask the Dorar team before any automated use. |
| 6 | "Hadith Encyclopedia" app (App Store id1006161545) | Indonesian *Ensiklopedi Hadits 9 Imam* by Lidwa Pusaka. No Bangla. | – | Owned by Lidwa Pusaka. | **Not relevant** to Bangla. No Bangla app of that name was found. |
| 7 | **fawazahmed0/hadith-api** (jsDelivr, opened) | Bangla editions of 8 books: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik, Nawawi's Forty. Measured non-empty Bangla: Bukhari 7,529 of 7,589; Muslim 7,360 of 7,563; Abu Dawud 5,270 of 5,274; Nasa'i 5,656 of 5,765; Ibn Majah 4,336 of 4,343; Malik 1,749 of 1,858; Forty 42 of 42. Tirmidhi too big for jsDelivr (403). | JSON over CDN. | The repository is public domain (Unlicense). That covers the code, not the translations. The Bangla Bukhari text carries Tawheed-style cross-references "(আধুনিক প্রকাশনী- …, ইসলামিক ফাউন্ডেশন …)". | **Arabic: usable. Bangla: not usable without the publishers' permission.** Useful as a **map of section boundaries and standard numbers**, which are facts. |
| 8 | **alQuranBD/Bangla-Hadith-api** (GitHub page opened) | Bukhari (IFA), Muslim (IFA and Hadith Academy), Abu Dawud (IFA), Ibn Majah, Tirmidhi, Riyad; Arabic, English, Bangla. Last updated 2021. | JSON API. | No licence stated; the Bangla is Islamic Foundation's. | **Not usable without IF Bangladesh's permission.** |
| 9 | **sunnah.com** UNVERIFIED: 403 | Arabic and English, many books, including al-Adab al-Mufrad, Riyad, Hisn al-Muslim. No Bangla. | API with a key requested through GitHub. | Translations under their publishers' copyright. Third-party dumps (e.g. Hugging Face `freococo/sunnah_dataset`, CC BY-NC-SA) are someone else's licence over scraped data, not a grant. | **Needs a key and permission** (English only). |
| 10 | **Islamic Foundation Bangladesh** (government body) | The oldest complete Bangla translations of the six books. ihadis.com credits it for Nasa'i. | Print; none found online officially. | Copyright held by IF. No public licence. | **Needs a letter.** |
| 11 | **Tawheed Publications** (Dhaka) | ihadis.com credits it for Bukhari, Abu Dawud, Ibn Majah, Riyad as-Salihin. | Print. | Copyright held by Tawheed. No contact found online. | **Needs a letter.** |
| 12 | **Hadith Academy (Dhaka)**, **Husain al-Madani Prakashani**, **Ahsan Publications** | ihadis.com credits them for Muslim, Tirmidhi (with al-Albani's grading), al-Adab al-Mufrad. | Print. | Copyright held by each. | **Needs a letter** each. |

## 4. What is possible

### 4.1 Can be built now, with no letter

1. **The Hadith database in Arabic, whole books**: Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah, Malik,
   ad-Darimi, Ahmad, Riyad as-Salihin, Nawawi's Forty (already pulled, OpenITI, decision 8). Plus, on the same
   licence: al-Adab al-Mufrad and an-Nawawi's al-Adhkar (one more pull). **About 65,000–70,000 Arabic narrations in all**
   (Ahmad alone 26,855).
2. **A numbering concordance** per book, built from facts (section ranges and numbers are not anyone's text):
   OpenITI's edition number ↔ the standard number ↔ each Bangla publisher's number.
3. **The Dua database, first cut, in Arabic**: the ~960 narrations in §2's Dua chapters, plus the duas in other
   chapters located through Hisn al-Muslim's references.
4. **Bangla and English where HadeethEnc has them**: 143 Bangla dua hadiths, each linked to its book:number by
   HadeethEnc's own attribution. Plus Hisn al-Muslim in Arabic (asellam, MIT) and the Qur'anic duas.
5. **Grading**: HadeethEnc gives a grade for its hadiths. For the rest, the Sunan grades shown in fawazahmed0
   (al-Albani and others) are short facts; showing them with the scholar's name needs a rights check (UNVERIFIED).

### 4.2 Needs a letter: ranked by value for a complete Bangla Hadith database

| Rank | To whom | Unlocks | Contact found |
|---|---|---|---|
| 1 | **Tawheed Publications, Dhaka** | Bangla Bukhari, Abu Dawud, Ibn Majah, Riyad as-Salihin (four books, about 19,000 hadiths, with their Dua chapters) | None online; via the publisher's printed address, or ask IRD/ihadis.com to introduce |
| 2 | **Islamic Foundation Bangladesh** | Bangla of all six books (IF's own edition), Nasa'i as used by ihadis | Government body; IF's official website (not opened) |
| 3 | **Hadith Academy, Dhaka** | Bangla Muslim (the Dhikr kitab alone is about 147 hadiths in its numbering) | None found |
| 4 | **IRD Foundation (ihadis.com, Dua & Ruqyah)** | Their own work: the 1,000+ categorised duas with references and audio; an introduction to the publishers; possibly a data feed | `ihadis.com/contact-us` form |
| 5 | **Husain al-Madani Prakashani** (Tirmidhi), **Ahsan Publications** (al-Adab al-Mufrad) | Bangla Tirmidhi with al-Albani's grades (its Kitab ad-Da'awat has 235 hadiths); al-Adab al-Mufrad's 137-hadith Dua chapter | None found |
| 6 | **Greentech Apps Foundation** | Their Bangla Hisnul Muslim app's data and audio, if theirs to give | `gtaf.org/contact/` form ("Partnership/Collaboration") |
| 7 | hisnmuslim.com, IslamHouse / Dr Abu Bakr Zakaria | Already listed in the 6 Oct report (Hisn al-Muslim English/Bangla, audio) | – |

**Asking one well-connected party first may save several letters:** IRD Foundation already holds the Bangla of all
these books, presumably under agreements with each publisher. Ask whether they can share, or whom to ask.

**Not an option:** copying text from hadithbd.com, ihadis.com, sunnah.com or any app. Their terms reserve all rights
or forbid large-scale reuse without permission.

### 4.3 Recommended order

1. **Hadith database, Arabic, whole books first**, the six books and Riyad as-Salihin, then Malik, al-Adab
   al-Mufrad, an-Nawawi's al-Adhkar, ad-Darimi, Ahmad. Each with its concordance table.
2. **HadeethEnc's Bangla and English** attached to those books where HadeethEnc's attribution names one.
3. **Send the letters in §4.2 in parallel** with step 1. Each Bangla book is added when its letter returns, starting
   with Tawheed's four books.
4. **The Dua database, derived from the chapters**: start from the Dua chapters in §2, then add the duas found
   elsewhere through Hisn al-Muslim's and HadeethEnc's references.

### 4.4 How one dua links to every book it appears in

- **A hadith occurrence** stays keyed the way decision 7 set for HadeethEnc: source plus that source's own permanent
  number, e.g. `hadith:openiti-bukhari:<edition no.>`, with the concordance giving the standard number
  `bukhari:6306` for display and for matching other sources.
- **A dua is its own record**, e.g. `dua:<n>` (a new unit-key kind; an Owner decision, already flagged on 6 Oct). It
  holds the dua's Arabic words once, and a **list of occurrences**: `[bukhari:6306, tirmidhi:3393, nasai:5522, …]`.
  The *Sayyid al-Istighfar* would be one dua record with all its narrations listed under it.
- **Occurrences are linked by matching the dua's words, never by number.** A candidate match (same supplication words
  in two narrations) is proposed by the computer and confirmed by a person, then stored. Hisn al-Muslim's references
  and HadeethEnc's attributions give a checked starting set.
- Progress ("Memorised", etc.) is recorded on the dua, not on each narration, so learning a dua once counts once.

### 4.5 Rough sizes

| Book | Whole book (standard numbering) | Dua chapter |
|---|---|---|
| Bukhari | 7,563 | 108 (Kitab ad-Da'awat) |
| Muslim | 7,563 (sequential) / about 3,033 by main number | about 132 |
| Abu Dawud | 5,274 | 140 (Witr section; about 77 strictly dua) |
| Tirmidhi | 3,956 | 235 |
| Nasa'i | 5,758 | 112 |
| Ibn Majah | 4,341 | 66 |
| Malik | 1,858 (fawazahmed0) / 1,985 (ihadis) | 26 |
| Riyad as-Salihin | 1,896 | 103 |
| al-Adab al-Mufrad | 1,326 | 137 |
| ad-Darimi | 3,503 | about 39 (scattered) |
| Ahmad | 26,855 | none as a chapter |
| **Total** | **about 69,900** | **about 1,100 narrations** |

After merging repeats, the 1,100 narrations probably become **a few hundred distinct duas** (an estimate, not a count;
Hisn al-Muslim has 267 to 302 entries for comparison).

## 5. URLs opened in this session

- https://ihadis.com/ , https://ihadis.com/en , https://ihadis.com/terms-and-conditions , https://ihadis.com/bukhari ,
  https://ihadis.com/muslim , https://ihadis.com/tirmidhi , https://ihadis.com/abu-dawud , https://ihadis.com/nasai ,
  https://ihadis.com/ibn-majah , https://ihadis.com/riyadus-salihin , https://ihadis.com/adabul-mufrad
- https://ihadith.com/ (redirects to) https://www.hugedomains.com/domain_profile.cfm?d=ihadith.com
- https://gtaf.org/ , https://gtaf.org/apps/hadith , https://gtaf.org/apps/hisnulbn/ , https://gtaf.org/contact/
- https://apps.apple.com/app/id1568942398 (Dua & Ruqyah, IRD)
- https://hadeethenc.com/en/home , https://hadeethenc.com/api/v1/categories/list/?language=en
- https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json , `…@1/info.min.json` , `…@1/editions/ben-*.min.json` ,
  https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/LICENSE , `…/README.md`
- https://github.com/alQuranBD , https://github.com/alQuranBD/Bangla-Hadith-api
- https://github.com/OpenITI/0275AH/tree/master/data/0256Bukhari , https://github.com/OpenITI/0700AH/tree/master/data/0676Nawawi
- https://pub.dev/packages/dorar_hadith , https://huggingface.co/datasets/freococo/sunnah_dataset/blob/main/README.md
- **Refused (403) or failed, so UNVERIFIED:** https://hadithbd.com/ , https://duaruqyah.com/ , https://dorar.net/hadith ,
  https://dorar.net/dorar_api.json , https://sunnah.com/about , https://portainer.sunnah.com/developers ,
  https://chrome-stats.com/d/com.hadithbd.banglahadith , https://www.muslimbangla.com/blog/1011 (500), web.archive.org.
  hadithbd.com facts come from search-result snippets only.
