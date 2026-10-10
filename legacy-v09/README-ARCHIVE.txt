MMSA v09 — ARCHIVED BUILD
=========================

What this folder is
-------------------
A frozen copy of `app/` exactly as it was RELEASED at **v09.151**
(9 October 2026, merge commit f027a24e, "v09.151: dua words link only to a
Qur'an word that agrees with their vowels", Builder #712). It was taken on
10 October 2026, when the owner said "yes, freeze Legacy v09.151" (decision 98):
the last build of the v09 line, before v10.01 joined the Read view and the
Note view (decision 95).

Reachable at:
  https://madrasatul-muslimeen.github.io/legacy-v09/

`app/` continues from v10.01 onward. This folder does not.

The version history in one line
-------------------------------
  /legacy/index.html   — v06.30, the single-file pre-cutover app
  /legacy-v07/         — v07.139, the multi-page Firebase rebuild
  /legacy-v08/         — v08.103, the Unit Card build
  /legacy-v09/         — v09.151, the last v09 build (this folder)
  /app/                — v10.01 onward, the live app

DO NOT EDIT ANYTHING IN THIS FOLDER
-----------------------------------
Reference only, the same rule as the other three archives. A fix belongs in
`app/`. The value of this copy is that it is unchanged.

The ONE deliberate change, and why
----------------------------------
`js/sw-register.js`: `registerServiceWorker()` returns at once. Nothing else
differs from commit f027a24e.

The same reason as legacy-v08: this code finds the service worker by ABSOLUTE
path. It registers "/app/sw.js" (the LIVE app's worker) and, when "?nosw" is in
the address, unregisters EVERY service worker on the site, the live app's
included. A frozen copy must never be able to reach into the live app, so here
it does nothing. The consequence: this archive does NOT work offline. `sw.js`
is still in the folder, unregistered, so the copy stays complete.

What it still shares with the live app — know these before using it
--------------------------------------------------------------------
1. **The same Firestore data.** It signs in to the same `study-monitoring`
   project and reads and WRITES the same real records, notes and bookmarks.
   Claiming a status in here is a real claim; a note
   written here is a real note. The version badge next to the app name reads
   `v09.151` here; that is how you tell the two apart.

2. **The same Approaches.** They are DATA (the tenant's own Approaches), not
   code, so this archive shows whatever Approaches the tenant has today.

3. **The same data files.** Every page loads the Qur'an data from
   `/tools/quran-data-pull/output` (an absolute path), the Hadith and Dua data
   from `../tools/hadith-data-pull/output` (which, from this folder, is the
   same `/tools/...` the live app reads), and the Mushaf from `/mushaf/` and
   the repository's `main` branch. Those are only ever ADDED to. A future round
   that RESHAPES them (renames or removes a file or field) would break this
   archive: copy the v09.151-era files in here first.

4. **The same browser storage.** Both apps live on one site, so they share
   localStorage: the language, the remembered views and the "View as" preview
   set in one are seen by the other.

Known behaviour of v09.151 itself, kept as it was
-------------------------------------------------
The Read view and the Note view are two separate views here; the Read view's
📝 Notes pane (v10.01) does not exist. Notes written in the Note view's own box
(`ayahNotes`) are the same records the live app shows read-only in its pane.

Everything else is self-contained: every page, script, stylesheet and font in
here is referenced relatively and resolves inside this folder, including its
own `js/version.js`, which keeps the badge at v09.151 while `app/` moves on.
