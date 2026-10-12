# J02 demo: the Scholars on 2:228

Live page: https://claude.ai/artifact/RWcuRUJB4b3gao8YmbznkC (12 Oct 2026, decision 105: a demo first, build nothing in the app).

- `sources.json`: 32 classical tafsir passages on 2:228, copied unchanged from the open tafsir data
  (https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/<slug>/2/228.json), each mapped to its author's row in
  `../scholars-database-v1.2.json`. `notFetched` lists the one mislabelled edition (its files hold Ibn ʿĀshūr's
  modern tafsir) and the one 404; `skippedModern` lists the modern works left out and why; three authors with no
  database row (Ibn Abī Zamanīn, al-Samīn al-Ḥalabī, al-Ījī) carry Claude's draft madhab, marked on the page.
- `page.html` + `build.py`: the page template and the script that embeds `sources.json` and the āyah (from
  `tools/quran-data-pull/output/surahs/surah_002.json`) into it: `python3 build.py <out.html>`.
- Two attributions rest on the text, not the label: `ar-tafsir-al-tha-alibi` reads as al-Thaʿlabī (d. 427, s025) and
  `ar-tafsir-al-tha-alibi-527` as al-Thaʿālibī (d. 875, s050). Jalālayn's al-Baqarah is al-Suyūṭī's half (s053).
