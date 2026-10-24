# Audit part 85 — screen audit of the shared pages (PCF MSA J29, issue #1154)

`tools/i18n-verify/unchecked-pages-screen-audit-browser.mjs` (the part-84 suite) now also covers monitor, homework, people,
records, catalogue, about, bookmarks and hadith-collections, at 390x844 / 820x1180 / 1440x900, English and Bangla.
Totals: before 339/0 (8 part-84 pages), after 675/0 (16 pages).

| Page | Result | What was found / done |
|---|---|---|
| Monitor, Homework, People, Catalogue | 45/0 each | Clean on all five measurements. |
| Records | 45/0 after check fix | Bangla "খণ্ড: surah_1": the storage chunk key is printed on purpose (comment in records.html). Check corrected, not the page. |
| About | 45/0 after check fix | "Quran Foundation" is the font provider's name, credited by name. Added to proper names. |
| Bookmarks | 45/0 after check fix | "Ayat al-Kursi" is the stub's seeded bookmark name (data). Added to data allow-list. |
| Hadith collections | 45/0 after check fix | Answers `back=1`, not the menu's `navBack=1`; the suite now opens it with `back=1`. Page unchanged (Hadith Lead's). |

No application file was changed: no real layout or translation defect was found on these eight pages.

Mutations (each must fail): wide on Monitor 6 fail; small on Homework 6 fail; clip on Catalogue 9 fail (6 clip + 3 leaked "cut");
noback on Bookmarks 6 fail.

Not done: seeding real-length tenant/Approach names (the stub fixtures were used).
