# Printed Mushaf page pictures: ksu-madani

The 604 pages of the Madinah Mushaf (Madani script, the print of the King Fahd Complex for the Printing of the Holy Qur'an), as page pictures, for Quran Study's "Printed page" view.

- **Files:** `001.png` to `604.png`, one per Mushaf page, exactly as fetched. Each is a 622 by 917 pixel PNG. 51 MB in all.
- **Source:** King Saud University's e-Mushaf project, `https://quran.ksu.edu.sa/png_big/<page>.png` (for page 602: `https://quran.ksu.edu.sa/png_big/602.png`).
- **Fetched:** 11 Nov 2026. All 604 were fetched and each is a valid PNG.
- **Credit line (shown on the page that displays them):** King Fahd Complex for the Printing of the Holy Qur'an, Madinah; pictures from King Saud University's e-Mushaf.
- **Rights:** no written free-use licence was found on the university's or the Complex's pages. The Owner stated the rights are fine (PCF inbox `qr46lmushafpdf01`, 11 Nov 2026). Keep asking the Complex for permission and for a sharper set.

## Rules for this folder
1. **Never re-encode or replace a file here.** A replaced binary stays in git history forever. A sharper set goes under a NEW folder name, for example `ksu-madani-v2/`.
2. **Never list these files in `app/offline-files.json` or any service worker precache.** Keeping pages on the device is the reader's choice (the Printed page view's own save options). `tools/offline/build-offline-files.mjs` skips this folder, and `tools/i18n-verify/mushaf-printed-data.mjs` checks it.
3. Marked `binary` in `.gitattributes`.
