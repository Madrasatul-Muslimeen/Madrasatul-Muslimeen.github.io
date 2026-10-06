# Dua module: what resources exist (6 Oct 2026)

**The job (the Owner, 6 Oct 2026, decision 72):** "We want to build another module for DUA. Eventually it will be a
separate app but will work integrated with MMSA always too. So, find what resources are avialable first and then I
will give you more to add later."

**Nothing was built.** This is research only. Every source below was opened from this session (a page, a raw file
or the source's own API) unless it is marked UNVERIFIED. sunnah.com, hadithbd.com and myislam.org refused this
sandbox (403), so those rows are from search results only.

## 1. In short

- **Arabic is not a problem.** The Arabic text of the Qur'an and of hadith is free to use. There is an open (MIT)
  copy of the whole of Hisn al-Muslim in Arabic, with al-Qahtani's references.
- **Ready to use with no permission letter: three sources.**
  - **HadeethEnc.com**: about 200 dua and dhikr hadiths in Arabic, English and Bangla, with grading and
    explanation. MMSA already uses it, on its published conditions: no changes to the text, and name the source.
  - **QuranEnc.com**: Bangla and English meanings of the Qur'anic duas, on the same conditions.
  - **asellam/HisnElMuslim (MIT)**: the full Hisn al-Muslim in Arabic, with references.
- **The gap is Hisn al-Muslim in Bangla, and the audio.**
  - The only complete Bangla Hisnul Muslim found is the IslamHouse PDF, translated by Dr Abu Bakr Muhammad
    Zakaria. Its terms could not be found, and its text layer comes out garbled.
  - Every per-dua recitation found comes back to hisnmuslim.com, which states no licence.
  - Both need a permission letter.
- **The Qur'anic duas need nothing new.** MMSA already has every ayah in Arabic, English and Bangla, with recitation.
  A Dua module needs only its own list of references (for example 2:201, 2:286, 3:8, 25:74).

## 2. The sources

| # | Source | Covers | Languages | Format | References / grading | Licence or terms | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **hisnmuslim.com API**: `hisnmuslim.com/api/husn.json`, `/api/en/husn_en.json`, `/api/ar/husn_ar.json` | Hisn al-Muslim: 132 chapters, 266 duas. Each has Arabic, a translation, a repeat count and audio. | Arabic and English in the API. The website shows 15 languages, including Bangla, but the Bangla API path returns 404. | JSON, MP3 | No reference or grading field | **None stated**, so all rights are reserved | **Needs permission** |
| 2 | hisnmuslim.com audio, e.g. `hisnmuslim.com/audio/ar/75.mp3` | Arabic recitation, per dua and per chapter | Arabic | MP3 | – | None stated | **Needs permission** |
| 3 | **asellam/HisnElMuslim** (GitHub, `hisn.json`) | 133 chapters, 302 adhkar. Each has the text, a repeat count and al-Qahtani's reference (e.g. "البخاري مع الفتح 11/113 ومسلم 4/2083"). | Arabic | JSON | References yes | **MIT**, © 2021 Abdellah Sellam | **Usable with credit.** Its audio links (islamway.net) had an expired certificate. |
| 4 | rn0x/hisn_almuslim_json | 134 sections, 298 items, with footnotes. Archived in 2023. | Arabic | JSON | Footnotes | No licence file | Unclear |
| 5 | sheikhhanif/Hisnul_Muslim_Database | 267 duas: Arabic, English, an English reference for each, and 233 MP3s. It has a Bangla column, but it is empty. | Arabic, English | CSV, MP3 | References yes | No licence file | Unclear. The English and audio are of unstated origin. |
| 6 | **Seen-Arabic/Morning-And-Evening-Adhkar-DB** | 34 morning and evening adhkar: count, virtue, source with grading | Arabic, English (with transliteration) | JSON, CSV, SQL | Yes, in prose | **MIT**, © 2024 Seen Arabic | **Usable for the text.** Its audio links point to hisnmuslim.com, which the MIT licence does not cover. |
| 7 | fitrahive/dua-dhikr (and its API at dua-dhikr.vercel.app) | 97 items: morning, evening, daily, after salah | Indonesian, English | JSON, REST | Source yes, grade no | **MIT**, © 2023 Fitrahive | Usable with credit. A small set. |
| 8 | osamayy/azkar-db | Duas, adhkar and ruqyah, with references still being added | Arabic | SQLite, JSON, CSV | Partial | No licence file | Unclear |
| 9 | wafaaelmaandy/Hisn-Muslim-Json | Looks like a copy of the hisnmuslim.com API | Arabic, English | JSON | – | No licence file | Unclear |
| 10 | **HadeethEnc.com API** (already in MMSA) | Dua and dhikr categories: Supplications and Remembrance (115), Reported Supplications (33), Dhikr during Prayer (23), Dhikr on Special Occasions (21), Ruqyah (9), Morning and Evening (7), and others | **Arabic, English, Bangla**, and many more | JSON REST, no key | **Yes**: attribution, grade, explanation, word meanings | Published conditions: no modification, addition or deletion; name the publisher and source; give the version number; keep the transcript information; report any note on the translation to them; keep up to date; no inappropriate advertisements | **Usable without asking, on these conditions** |
| 11 | fawazahmed0/hadith-api (jsDelivr) | The six books, Malik and Nawawi's 40. Bukhari book 80 "Invocations" (6304–6411), Tirmidhi book 48 "Supplication" (3370–3604). | **Arabic, English, Bangla** | JSON over CDN | Grades for the Sunan books | The repository is public domain (Unlicense). That covers the repository, not the translations it carries. | **Arabic: usable. English and Bangla: ask first.** The Bangla Bukhari cites Islamic Foundation and Adhunik Prokashoni, and the English is Muhsin Khan's. |
| 12 | AhmedBaset/hadith-json | 17 books, including **Riyad as-Salihin** and **al-Adab al-Mufrad** | Arabic, English | JSON | No grades | ISC for the code. The data is "scraped from Sunnah.com". | Unclear: the rights follow sunnah.com |
| 13 | sunnah.com and its API (UNVERIFIED: 403 from here) | Hosts Hisn al-Muslim (`sunnah.com/hisn`), al-Adab al-Mufrad and Riyad as-Salihin | Arabic, English | REST, key needed | Yes | A key is requested by a GitHub issue | **Needs permission (a key)** |
| 14 | hadithapi.com | Books, chapters, hadiths | Arabic, Urdu, English | REST, free key | No | "Free for everyone"; no licence | Unclear. No Bangla. |
| 15 | **QuranEnc.com API** | Ayah-by-ayah Qur'an meanings, including Bangla (Abu Bakr Zakaria) | many, including Bangla | JSON | – | The same conditions as HadeethEnc | **Usable on those conditions** |
| 16 | **IslamHouse: Bangla Hisnul Muslim** (`d1.islamhouse.com/data/bn/ih_books/single2/bn_Hisnul_Elmuslim.pdf`) | The complete Hisn al-Muslim in Bangla, 307 pages, translated and edited by Dr Abu Bakr Muhammad Zakaria | Bangla, Arabic | PDF (a DOC is listed, UNVERIFIED) | The book's own references | No copyright line in the PDF, and no IslamHouse terms page found | **Needs permission.** Its Bangla comes out garbled when copied, so it needs a clean source. |
| 17 | hadithbd.com Hisnul Muslim (UNVERIFIED: 403 from here) | "267 duas across 133 chapters" in Bangla | Bangla, Arabic | Website only | UNVERIFIED | UNVERIFIED | Needs permission |
| 18 | Qur'anic "Rabbana" duas | No clean, licensed, ayah-keyed dataset exists | – | – | – | – | **Not needed.** MMSA compiles its own list of references. |
| 19 | OpenITI: an-Nawawi's al-Adhkar, Ibn Taymiyyah's al-Kalim al-Tayyib (classical Arabic) | Classical Arabic texts | Arabic | mARkdown | – | MMSA's own OpenITI copy is marked CC BY-NC-SA 4.0 | Usable for non-commercial use, with credit |

## 3. What MMSA already has that a Dua module can reuse

Under I2, modules never call each other. Each of these is a shared data file, component or collection, not
another module's screen.

- **The Qur'an data** (`tools/quran-data-pull/output`): every ayah in Arabic (Uthmani and tajweed), English (Sahih
  International) and Bangla, with word-by-word meanings. The Qur'anic duas can point at these by
  surah:ayah.
- **Recitation audio**, already wired into QuranRevival: Basfar (Arabic), English, and Bangla.
- **HadeethEnc, already packaged** (`tools/hadith-data-pull/output/hadeethenc`, pulled 26 Sep 2026): 3,574
  hadiths in Arabic, English and Bangla, with the dua and dhikr categories above. A Dua module can list those
  categories without a new pull.
- **OpenITI Arabic collections**, already packaged (`tools/hadith-data-pull/output/openiti-release`): Bukhari,
  Muslim, the four Sunan, Malik, Ahmad, ad-Darimi, Nawawi's Forty and **Riyad as-Salihin**, in Arabic. Their chapters
  on supplication and remembrance are already on hand, in Arabic only.
- **Two Qur'an Approaches about dua** already in the catalogue: **"Dua Memorising"** (approach 9) and
  **"Deriving Dua"** (approach 16), in English and Bangla.
- **Asma ul Husna**: the 99 Names, with their posters and references. Duas that call on Allah by a Name can link to
  it.
- **Records and the six progress statuses**, and the **👥 picker** to record for family members.
  - A dua would need its own permanent unit key. Today there are 12 kinds; a `dua:` kind would be new.
  - The Hadith module made the same choice for HadeethEnc (`hadith:hadeethenc:<id>`, decision 7 of 26 Sep).
- **Bookmarks**, with the 🔖 menu and ← Back, and the **Continue** strip.
- **Notes** (Mapping My Journey): a Note can be written on any dua, as on an ayah or a hadith.
- **The routine renderer** (Health, Learn Deen On-the-Go): it suits a daily habit such as morning and evening
  adhkar.
- **Monitor**: the weekly and monthly reports read every module's records, so a Dua module would appear there
  without new reporting work.

## 4. What the Owner may want to decide later (not asked now)

1. **Whether to write two permission letters**:
   - to hisnmuslim.com, for the Arabic and English text and the per-dua audio;
   - to IslamHouse or Dr Zakaria, for the Bangla Hisnul Muslim, asking for a clean copy.

   These would join the two dictionary letters already waiting (decision 62).
2. **Where the Dua module's first content comes from**, until any permission arrives. The safe start is:
   - HadeethEnc's dua hadiths (Arabic, English, Bangla);
   - the Qur'anic duas, from MMSA's own Qur'an data;
   - Hisn al-Muslim in Arabic only (asellam, MIT), with its references.
3. **The permanent unit key for a dua** (e.g. `dua:hisn:<n>`), decided once, before the first progress is recorded.

**Waiting for the Owner to add more** (their words: "then I will give you more to add later").
