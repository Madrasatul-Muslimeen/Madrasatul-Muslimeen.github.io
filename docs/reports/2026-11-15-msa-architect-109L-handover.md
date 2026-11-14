# MSA Master Architect 109L: handover, 15 Nov 2026 (~10:05 am Sydney)

Session `session_01PL2xbLNpgMc8ChAjXdUosV`, took over from 108L at 10:44 pm 14 Nov. Handing over on the context rule (~39%).
`main` = **v15.02** (024b026). The ledger's next number is **15.03**. QR: the 15.02 rebuild was asked of the PCA at 10:00 am.

**Who:** PCA = **43L** `session_01PL2xbHuZXx3HkGB3MaLhGj` (meta/global.sessionUrl; replaced 42L 15 Nov). Keep-alive
trig_01HQBXsW4X6eqHospY11pfoY fires into this session daily at ~8:07 am Sydney: ask the PCA to move it to you. QR Lead = 47L
`session_01PL2xbNAMQAyiv5S52x8NPv`. Hadith Lead = 14L `session_01PL2xbNbDNZXULwY3eGdqPD`. Dua Lead = 11L `session_01PL2xbHyfbrXS8hET9sKE7P`.

## Done this session: v15.02 (#1731, merged pinned 524605b → 024b026)
1. **Hadith names Rules published.** The Owner told 14L "Rules done" at 8:54 am 15 Nov. That is a real desktop-app message in 14L's
   transcript, checked with list_events, the same precedent as 103L/Dua groups. `firestore.rules` = the deployment file byte for byte;
   `HADITH_NAMES_PUBLISHED = true`. rules-authorisation-executable gains `stripNames()`, plus HADITH NAMES PUBLISHED and create/update
   FORWARD/BACKWARD checks (138/0, 6 mutations). hadith-names-browser now serves the OFF case (30/0, --prove 8/8). Emulator with
   FULL_RULES_FILE=firestore.rules: ok.
2. **Google sign-in asks which account** (the Owner: signed in with another Gmail and could not get back). All 24 pages:
   `new GoogleAuthProvider().setCustomParameters({ prompt: "select_account" })`. The served SDK 10.12.2 returns `this`; I read the
   served file to confirm. The stub gained the method. Guard: `google-account-picker.mjs` (4/0, --prove 2/2).
3. **J120 offline** (the Owner's tablet screenshot: Chrome's dinosaur page although "Ready ✓").
   - (a) `app/sw.js`: a failed PAGE request is answered by the saved copy with ignoreSearch. Addresses with "?" (written by the app)
     used to miss. Suite `offline-query-pages-browser.mjs` 11/0, --prove catches noquery.
   - (b) New `/root-sw.js` (QR's pattern, smaller), registered by `sw-register.js` on MSA's origin and on localhost. It answers ONLY
     `/` and `/index.html`, only on network failure, with a redirect to `/app/quranrevival.html`. msa.json lists it in `site`.
     Suite `offline-front-door-browser.mjs` 13/0, --prove 2/2.
   - (c) QR: counted edit `app/js/sw-register.js#1` in apps/qr/edits.json removes the registration from QR's build (QR's
     one-worker 9 fails and upgrade 5 fails without it); apps-build-check counts 36.
4. Checks: qr-verify all 30 green, and the 8 worker/offline suites re-run on the final build. offline-ready (ONE=1) 50/0,
   app-offline-boot 15/0. The 29 Hadith browser suites, PR vs main by failing-check name: identical. After the merge on main:
   brief-integrity 16/0, programme-ledger 8/0, mutations 49/0.
5. PCF: wn-v1502, monitor v897 (three phone ticks for v15.02), J120 c120o1115 + c120a109.

## NEXT
1. **QR Lead 47L's PR #1732** (the Owner's 15 Nov asks: Read on to the right group, a 📍 button, ◂ ▸ on the bar; Word Card titles,
   six chips in one row, "Learn next Arabic" 20% smaller, the "How hard" line below the Bangla marking; QCR/Asma chips on the āyah
   stripe). 47L compared 49 suites against main. **Two decisions for the Architect are in its PR body**: bookmark-marks-back at 320/360
   (the way-back label takes its own line), and the legacy-mode read-mushaf-button lines. I9 flag: two small tenant-document reads on
   the first use of Read. **Include behaviour.mjs in the release sweep.** I asked 47L to rebase on v15.02. Then v15.03.
2. 14L: the Know Your Status PR (status icons, wheel, header search; no Rules change) is coming from `claude/hadith-status-icons`.
   14L fixed the stale hadith-study-reader "four Subjects" check there.
3. Owner waits (in the monitor; never re-ask): the v15.02 phone ticks (account picker, offline, Edit names); the v15.00 phone check;
   the 320px pill choice; the finger-scroll tick (PCF inbox qr47l1511a); 11L's J104 question; the earlier list in the monitor.

## Suite-setup lessons (this container)
- `serve.js` maps `/` to admin-self-check.html (GitHub Pages serves index.html): test the front door online with `/index.html`.
- **A Playwright route did NOT reach `/root-sw.js`'s own script fetch**, so a route-served mutant proved nothing (the first --prove
  MISSED it). Mutate the worker file ON DISK and restore it on exit.
- qr-verify needs a FULL clone: `git clone https://github.com/QuranRevival/QuranRevival.github.io /tmp/claude-0/qrrepo` then
  `git fetch --unshallow` (upgrade-browser reads commit fe028eb). run-all takes more than 25 min: run it in the background, without a
  short `timeout`.
- `pkill -f "node serve.js"` kills every serve.js; restart the one you need.
- The handover's other notes (worktree node_modules symlink, `git fetch --unshallow origin main`, emulator `npm install`) still hold.

## Lessons
- **"All files downloaded, Ready ✓" proved the cache was full, not that the cache was REACHED.** The worker matched by full URL,
  and the app's own links carry "?". Test the addresses the app really opens, not the bare ones it saved.
- **A shared-file change can break the other app's invariant.** Run QR's worker suites after any sw/sw-register change; a counted
  edit is the fix, never a weaker check.
