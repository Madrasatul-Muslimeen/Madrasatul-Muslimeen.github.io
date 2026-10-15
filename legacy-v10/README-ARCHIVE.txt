MMSA v10 — ARCHIVED BUILD
=========================

What this folder is
-------------------
A frozen copy of `app/` exactly as it was RELEASED at **v10.68**
(15 October 2026, merge commit 075bc90c, "v10.68: the Read view's ⋯ tools
panel stays on a small phone's screen", Builder #866). It was taken on
16 October 2026, when the owner posted PCF MMSA J32 "Put QR v10 in Legacy"
(answering PCF J30's second question: keep a v10 copy). It is the last build of
the v10 line, before v11.00 turned the app into QuranRevival and hid General
Study, Nature-Life, Life Skill and Health from the menu.

Reachable at:
  https://madrasatul-muslimeen.github.io/legacy-v10/

`app/` continues from v11.00 onward. This folder does not.

The version history in one line
-------------------------------
  /legacy/index.html   — v06.30, the single-file pre-cutover app
  /legacy-v07/         — v07.139, the multi-page Firebase rebuild
  /legacy-v08/         — v08.103, the Unit Card build
  /legacy-v09/         — v09.151, the last v09 build
  /legacy-v10/         — v10.68, the last v10 build (this folder)
  /app/                — v11.00 onward, the live app

DO NOT EDIT ANYTHING IN THIS FOLDER
-----------------------------------
Reference only, the same rule as the other four archives. A fix belongs in
`app/`. The value of this copy is that it is unchanged.

The ONE deliberate change, and why
----------------------------------
`js/sw-register.js`: `registerServiceWorker()` returns at once. Nothing else
differs from commit 075bc90c.

The same reason as legacy-v08 and legacy-v09: this code finds the service
worker by ABSOLUTE path. It registers "/app/sw.js" (the LIVE app's worker) and,
when "?nosw" is in the address, unregisters EVERY service worker on the site,
the live app's included. A frozen copy must never be able to reach into the
live app, so here it does nothing. The consequence: this archive does NOT work
offline. `sw.js` is still in the folder, unregistered, so the copy stays
complete.

What it still shares with the live app — know these before using it
--------------------------------------------------------------------
1. **The same Firestore data.** It signs in to the same `study-monitoring`
   project and reads and WRITES the same real records, notes, bookmarks and
   Zab items. Claiming a status in here is a real claim; a note written here is
   a real note. The version badge next to the app name reads `v10.68` here;
   that is how you tell the two apart.

2. **The same Approaches and collections.** They are DATA (the tenant's own),
   not code, so this archive shows whatever the tenant has today.

3. **The same data files.** Every page loads the Qur'an data from
   `/tools/quran-data-pull/output` (an absolute path), the Hadith and Dua data
   from `../tools/hadith-data-pull/output` (which, from this folder, is the
   same `/tools/...` the live app reads), and the Mushaf from `/mushaf/` and
   the repository's `main` branch. Those are only ever ADDED to. A future round
   that RESHAPES them (renames or removes a file or field) would break this
   archive: copy the v10.68-era files in here first. The new QuranRevival app
   (its own repository, from 16 Oct 2026) does not change these files here.

4. **The same browser storage.** Both apps live on one site, so they share
   localStorage: the language, the remembered views, the Al-Fātiḥah count and
   the "View as" preview set in one are seen by the other.

Known behaviour of v10.68 itself, kept as it was
-------------------------------------------------
All modules are in the Modules menu here, including General Study,
Nature-Life, Life Skill and Health (hidden in the live app from v11.00). The
fixes of v11.01 onward are NOT here: for example the full-screen Āyah card is
16px taller than a phone's screen, and on a computer the Explore window can
open partly under the bottom bar.

Everything else is self-contained: every page, script, stylesheet and font in
here is referenced relatively and resolves inside this folder, including its
own `js/version.js`, which keeps the badge at v10.68 while `app/` moves on.
