QuranRevival v07 — ARCHIVED BUILD
=================================

What this folder is
-------------------
A frozen, byte-for-byte copy of `app/` as it stood at the end of the v07
line: **v07.139** (6 September 2026). It was taken at the moment the owner
closed v07 and opened v08, so that the v07 app stays reachable and runnable
exactly as it was, the same way the v06 app does at `/legacy/index.html`.

Reachable at:
  https://madrasatul-muslimeen.github.io/legacy-v07/

`app/` continues from here as v08.00 onward. This folder does not.

The version history in one line
-------------------------------
  /legacy/index.html   — v06.30, the single-file pre-cutover app (10,146 lines)
  /legacy-v07/         — v07.139, the multi-page Firebase rebuild (this folder)
  /app/                — v08.00 onward, the live app

DO NOT EDIT ANYTHING IN THIS FOLDER
-----------------------------------
Same rule `/legacy/index.html` has always carried: reference only. A fix
belongs in `app/`. The whole value of this copy is that it is unchanged —
if it drifts, it stops being the answer to "what did v07 actually do?".
This file is the only thing here that is not a copy of `app/`.

Two things it still shares with the live app — know these before using it
------------------------------------------------------------------------
1. **The same Firestore data.** This is not a museum piece behind glass: it
   signs in to the same `study-monitoring` Firebase project and reads and
   WRITES the same real records, notes and bookmarks the live app does.
   Claiming a status in here is a real claim. The version badge next to the
   app name (it will read `v07.139` here) is how you tell the two apart.

2. **The same Qur'an data files.** Every page here loads the Qur'an text,
   translations, word-by-word data and the juz/hizb/page tables from
   `/tools/quran-data-pull/output` (an absolute path — see
   `js/quran-data.js`), and the Mushaf's 604 pages from the repo's own
   `/mushaf/` folder via raw.githubusercontent.com. Both are SHARED with
   the live app rather than copied in here, which is what keeps this
   archive to 2.6MB instead of 130MB.

   The consequence, stated plainly: a future round that RESHAPES those data
   files (rather than adding to them) would break this archive. Adding a
   field, a translation or a new index file is safe. Renaming or removing
   one is not. If v08 ever re-pulls the Qur'an data in a different shape,
   copy the v07-era `output/` folder in here first.

Everything else is self-contained — every page, script, stylesheet and font
in here is referenced relatively and resolves inside this folder, including
its own `js/version.js`, which is what keeps the badge frozen at v07.139
while `app/` moves on.
