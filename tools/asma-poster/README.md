# Asmaul Husna poster (Owner decision 85)

The poster is a **true copy** of the Owner's template, `docs/reference/2026-10-07-asma-poster-template-al-witr.png`.

- **The frame** (`app/img/asma-poster-frame.webp`) is the template itself, with only the six places that change per
  Name painted over in the template's own cream: the Name and meaning inside the arch, the Arabic inside the cartouche,
  the description, and the text of the two reference boxes. The banner, borders, ornaments, logo boxes and the five
  pills are the template's own pixels. Rebuild it with `make-frame.py` (see its header).
- **The text** is set over the frame by `app/js/asma-poster.js` at the template's measured positions, in the
  template's faces: Tinos (its Times-style serif) and Noto Naskh Arabic Bold. Sizes are in container-width units, so
  the poster is the same picture at every size. Measured on Al-Witr at 1055px: the Name, the description and the
  reference boxes land within 1–5px of the template; the description's first six line breaks are the template's.
- **The data**: `build-poster-data.mjs` writes `app/js/asma-poster-data.js` (descriptions, meanings and vowelled
  Arabic from the Owner's archive posters, `docs/reference/2026-10-01-asma-poster-descriptions.json`; "Lord" →
  "RABB" and "God" → "deity (Ilaha)", as the template writes them; English Surah names).
- **The references** open inside the app: an Ayah in QuranRevival, a Hadith in the Hadith library at that narration.
  `POSTER_HADITH` in `asma-poster.js` records where each cited Hadith sits in the library, found by its own words
  (the library's Bukhari numbers differ from the usual ones). `tools/i18n-verify/asma-poster-browser.mjs` proves each
  one against the library's files.
