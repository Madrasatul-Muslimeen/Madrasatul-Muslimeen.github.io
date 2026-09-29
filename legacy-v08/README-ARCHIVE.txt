QuranRevival v08 — ARCHIVED BUILD
=================================

What this folder is
-------------------
A frozen copy of `app/` exactly as it was RELEASED at **v08.103**
(28 September 2026, commit 54f93098, "v08.103 the Unit Card"). It was taken on
29 September 2026, when the owner closed the v08 line and opened v09, choosing
v08.103 as the build to keep: the last one before "Add an Approach" (v08.104)
made the 40 Approaches possible.

Reachable at:
  https://madrasatul-muslimeen.github.io/legacy-v08/

`app/` continues from v08.117 and then from v09.01 onward. This folder does not.

The version history in one line
-------------------------------
  /legacy/index.html   — v06.30, the single-file pre-cutover app
  /legacy-v07/         — v07.139, the multi-page Firebase rebuild
  /legacy-v08/         — v08.103, the Unit Card build (this folder)
  /app/                — v08.104 to v08.117, then v09.01 onward, the live app

DO NOT EDIT ANYTHING IN THIS FOLDER
-----------------------------------
Reference only, the same rule as the other two archives. A fix belongs in
`app/`. The value of this copy is that it is unchanged.

The ONE deliberate change, and why
----------------------------------
`js/sw-register.js`: `registerServiceWorker()` returns at once. Nothing else
differs from commit 54f93098.

v08.96 made the app work offline with a service worker, and this code finds
that worker by ABSOLUTE path: it registers "/app/sw.js" (the LIVE app's
worker) and, when "?nosw" is in the address, unregisters EVERY service worker
on the site, the live app's included. A frozen copy must never be able to
reach into the live app, so here it does nothing. The consequence: this
archive does NOT work offline. `sw.js` is still in the folder, unregistered,
so the copy stays complete.

Three things it still shares with the live app — know these before using it
-----------------------------------------------------------------------------
1. **The same Firestore data.** It signs in to the same `study-monitoring`
   project and reads and WRITES the same real records, notes and bookmarks.
   Claiming a status in here is a real claim. The version badge next to the
   app name reads `v08.103` here; that is how you tell the two apart.

2. **The same Approaches.** The 40 Approaches are DATA (the tenant's own
   Approaches, added in the Catalogue), not code. So this archive shows all
   40 of them, with the v08.103 screens and wording. No frozen copy of the
   code can bring back a 30-Approach app.

3. **The same Qur'an data files.** Every page loads the Qur'an text,
   translations, word data and unit tables from `/tools/quran-data-pull/output`
   (an absolute path), and the Mushaf pages from `/mushaf/`. Since v08.103
   those have only been ADDED to (lemma-meaning-index.json, v08.115), which is
   safe. A future round that RESHAPES them (renames or removes a file or field)
   would break this archive: copy the v08.103-era files in here first.

Known behaviour of v08.103 itself, kept as it was
-------------------------------------------------
Study-activity evidence (Mark as read, listening, Word by Word) was not being
saved in v08.103; v08.104 fixed it. Using those actions here saves nothing, as
it did at the time.

Everything else is self-contained: every page, script, stylesheet and font in
here is referenced relatively and resolves inside this folder, including its
own `js/version.js`, which keeps the badge at v08.103 while `app/` moves on.
