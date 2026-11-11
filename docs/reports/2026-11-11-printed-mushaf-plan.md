# Printed Mushaf view: plan and decisions (QR Lead 46L, 11 Nov 2026)

PCF inbox `qr46lmushafpdf01`. Demo (approved): https://claude.ai/artifact/Ujiw4j4XYYDP5Pem7QPX3m (Owner: "Ma Shaa Allah! Good! Yes, give these 6 options to user what he wants. 1A.").

## Owner's decisions
- A THIRD reading choice beside Āyah view and Mushaf (text). Not a replacement: the Word Card, tajweed colours, notes and the stripe need live text.
- The reader chooses what to keep. Six options: read online only; keep pages in the app (this sūrah / this juz' / the whole Mushaf); download a PDF file (this juz' / the whole Mushaf). Never precached; nothing saved unless the reader presses Save.
- The button lives in the same switch as Āyah view and Mushaf (2A).
- Source (3B, answer 1A): the 604 pictures of the Madinah Mushaf (King Fahd Complex print) from King Saud University's e-Mushaf, `https://quran.ksu.edu.sa/png_big/<page>.png`, with credit to the King Fahd Complex and King Saud University shown on the page. Keep asking the Complex for a sharper set.

## What was measured (11 Nov 2026)
604 of 604 fetched and valid; every file 622 x 917 px; 51 MB in all (about 91 KB a page). Soft when zoomed on a tablet or computer. No written free-use licence was found on the university's or the Complex's pages; the Owner stated the rights are fine.

## Proposed build, in order (each its own PR, demo-approved, mutation-proven)
1. **Data**: copy the 604 files to `tools/quran-data-pull/output/mushaf-printed/ksu-madani/NNN.png` (precedent: the Qur'an data lives under that folder, 71 MB today), with a README naming the source, the credit line and the fetch date. QR reads them by absolute MSA URL like the Hadith data (edit in `apps/qr/edits.json`). NOT in `offline-files.json` (reader's choice). ARCHITECT'S CALL: 51 MB of images in the repo.
2. **View**: "Printed page" in the Read switch, page from the existing page index (the page the reader is reading), ‹ › by page, go to page, pinch/double-tap zoom, the credit line, "Open this page as text" with the way back (way-back law), a clear message when offline and the page is not kept.
3. **Keep pages in the app**: Cache API, one cache, per sūrah / juz' / whole Mushaf, progress, size shown, Remove (precedent: the recitation cache `mm-audio-v1`; a NEW cache name is counted in `app/sw.js`, `msa.json` "caches", `build-app.mjs` CACHES, QR's worker, `qr-verify/naming.mjs`, and a mutation in `apps-build-check.mjs`).
4. **PDF download**: built in the browser from the pictures on the reader's request (juz' or whole Mushaf), a real file in Downloads. A PDF-writing library or a small hand-written writer (pictures only) is needed; choose the smaller, vendor it, no CDN at run time.

## Tests to write with each part
Real page pictures render at 320/360/390/768/1280 en+bn with no sideways overflow; page = the Mushaf view's page for the same āyah; offline with nothing kept shows the message; offline with a sūrah kept opens it; Remove frees it; PDF has the right page count and starts at the right page.
