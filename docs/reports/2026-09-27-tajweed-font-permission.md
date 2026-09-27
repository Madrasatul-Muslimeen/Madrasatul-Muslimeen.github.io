# Tajweed Mushaf fonts — permission check (27 Sep 2026)

Owner decision 9 (`docs/governance/2026-09-27-owner-decisions.md`): keep the
plain Mushaf and add a per-page Tajweed toggle, **built only after the font
licence is confirmed**. This is that check.

## The font
QPC V4 Tajweed ("QCF4", COLRv1 colour fonts, one per Mushaf page, 604 files).
It uses the same per-page glyph codes as the QCF V2 fonts and layout already in
`mushaf/`, which was proven by the Architect's demo.

The font's own name table, read from `p1.woff2`:
- Copyright: "King Fahad Complex, All rights reserved."
- Description: "Quran Tajweed Color Font features developed and added by Ayman,
  Rania, Amena, Naveed, Zahid, Tooba and Anza for Sadaqa-e-Jaria Only. NOT FOR
  SALE, ONLY CHARITIABLE (SADAQA) PURPOSE ONLY. PRINTING AND PUBLISHING NOT
  PERMITTED WITHOUT PRIOR PERMISSION FROM KING FAHAD GLORIOUS QURAN PRINTING
  COMPLEX AND DAR ALMARIFA EASY QURAN."

## The permitted route: Quran Foundation's documented CDN
Quran Foundation (quran.com) serves these exact files at
`https://verses.quran.foundation/fonts/quran/hafs/v4/colrv1/woff2/p{PAGE}.woff2`.
- Page 1 was checked and is byte-identical to the file tested in the demo.
- The server returns `access-control-allow-origin: *`.

Its font guide (api-docs.quran.foundation, "Integrating Quran Font Rendering")
says:
- loading from the CDN at runtime is the simplest way and needs no authentication;
- caching or bundling is allowed only with an active Developer Console account
  **and** a credit to Quran Foundation;
- the files may never be offered separately.

The Developer Terms (api-docs.quran.foundation/legal/developer-terms/) say the
same.

## What this means for the build
1. **Load the Tajweed fonts at runtime from that CDN, one page at a time, only
   when the toggle is on.** Do not copy the 604 files into this repository, and
   do not offer them for download.
2. **Credit** "Quran fonts provided by Quran Foundation" in a reasonably
   accessible place: the About page, plus a small line near the toggle.
3. **The app's own service worker (`app/sw.js`) must not store these files.**
   Storing them for offline use counts as "caching", which needs a Quran
   Foundation developer account. The browser's ordinary HTTP cache is the CDN's
   own behaviour and is not ours.
   - If the Owner later creates a free developer account, offline caching may be
     added with the credit kept.
4. **Charitable use only.** MMSA is free and not for sale, which fits. The
   Tajweed view must not feed a print or publishing feature (such as "Make a
   poster") without separate permission from KFGQPC and Dar AlMarifa.
5. Plain Mushaf stays the default, exactly as today.

## Flagged, not changed
The QCF V2 fonts already in `mushaf/fonts/` (added 22 Jul 2026) name themselves
"Test Font, KFGQPC" / "KFGQPC TEST" in their own metadata. They may be a
pre-release build. The same V2 files are served by Quran Foundation's CDN
(`.../hafs/v2/woff2/p{PAGE}.woff2`). Whether to switch to that source and add
the credit is a separate question for a later round.
