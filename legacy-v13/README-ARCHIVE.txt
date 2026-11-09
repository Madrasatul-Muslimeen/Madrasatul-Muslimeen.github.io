MMSA v13 — ARCHIVED BUILD
=========================

What this folder is
-------------------
A frozen copy of `app/` exactly as it was RELEASED at **v13.62**, the last
v13 release (9 November 2026, merge commit b00c01b2, "Merge pull request #1574:
v13.62, Install MSA + Get ready for offline (J120 O1+O2)"). It was taken on
9 November 2026, when the Owner opened the v14 line ("the new view QR is
building goes to the new version v14"). It is the last build of the v13 line,
before v14.01 made Quran Study's Read the ONE Ayah View with a "Read on"
switch, plus the Mushaf, in place of the separate Reading View (the Owner,
9 Nov: "Demo 1, build it. Bismillah!").

Reachable at:
  https://madrasatul-muslimeen.github.io/legacy-v13/

`app/` continues from v14.01 onward. This folder does not.

The version history in one line
-------------------------------
  /legacy/index.html   — v06.30, the single-file pre-cutover app
  /legacy-v07/         — v07.139, the multi-page Firebase rebuild
  /legacy-v08/         — v08.103, the Unit Card build
  /legacy-v09/         — v09.151, the last v09 build
  /legacy-v10/         — v10.68, the last v10 build
  /legacy-v11/         — v11.39, the last v11 build
  /legacy-v12/         — v12.139, the last v12 build
  /legacy-v13/         — v13.62, the last v13 build (this folder)
  /app/                — v14.01 onward, the live app

DO NOT EDIT ANYTHING IN THIS FOLDER
-----------------------------------
Reference only, the same rule as the other seven archives. A fix belongs in
`app/`. The value of this copy is that it is unchanged.

The ONE deliberate change, and why
----------------------------------
`js/sw-register.js`: `registerServiceWorker()` returns at once. Nothing else
differs from commit b00c01b2.

The same reason as legacy-v08 to legacy-v12: this code finds the
service worker by ABSOLUTE path. It registers "/app/sw.js" (the LIVE app's
worker) and, when "?nosw" is in the address, unregisters EVERY service worker on
the site, the live app's included. A frozen copy must never be able to reach
into the live app, so here it does nothing. Two consequences: this archive does
NOT work offline, and the Zab bar (mounted from the same function) does not
appear here. `sw.js` is still in the folder, unregistered, so the copy stays
complete.

What it still shares with the live app — know these before using it
--------------------------------------------------------------------
1. **The same Firestore data.** It signs in to the same `study-monitoring`
   project and reads and WRITES the same real records, notes, bookmarks and
   word marks. A mark made here is a real mark. Its Notes are the same Mapping
   My Journey Notes the live app opens. The version badge next to the app
   name reads `v13.62` here; that is how you tell the two apart.

2. **The same Approaches and collections.** They are DATA (the tenant's own),
   not code, so this archive shows whatever the tenant has today.

3. **The same data files.** Every page loads the Qur'an data from
   `/tools/quran-data-pull/output` (an absolute path), the Hadith and Dua data
   from `../tools/hadith-data-pull/output` (from this folder, the same
   `/tools/...` the live app reads), and the Mushaf from `/mushaf/`. Those are
   only ever ADDED to. A future round that RESHAPES them (renames or removes a
   file or field) would break this archive: copy the v13.62-era files in here
   first.

4. **The same browser storage.** Both apps live on one site, so they share
   localStorage: the language, the remembered views and the "View as" preview
   set in one are seen by the other. They also share the browser's caches:
   "Get ready for offline" in My account here fills the same `mm-quran-v1`
   Qur'an cache the live app uses (harmless, the files are the same), but
   with no service worker registered this copy still does NOT open offline.

Everything else is self-contained: every page, script, stylesheet and font in
here is referenced relatively and resolves inside this folder, including its
own `js/version.js`, which keeps the badge at v13.62 while `app/` moves on.
