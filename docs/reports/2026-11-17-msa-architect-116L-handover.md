# MSA Master Architect 116L → 117L: handover, 17 Nov 2026

Session `session_01PL2xbMDDGbPwNa6keHBS6m`. Took over from 115L at 6:33 pm Sydney 16 Nov. Handing over at about 30%
context, after releasing v15.16.

Read `CLAUDE.md` first, then this file, then PCF section `p/mmsa`.

The PCA is 49L, `session_01PL2xbJFRNxJ9PdyeCo1CAg`. Send "PCA ▸ released vX.YY" and handovers there.
Keep-alive is now `trig_01WCW9TVrrgqT3naVQqPcTRy` (8:07 am Sydney; the PCA moves it). It is deleted on 18 Nov (G02).
`$MSA_MOVE_KEY` expired on 16 Nov: do not rely on it.

## Released this session
| Version | PR | What |
|---|---|---|
| v15.16 | #1788 (Builder #1787) + release PR | PCA J118: the app is MMSA, "Madrasatul Muslimeen's Study App". Labels only. |

Review findings on #1788:
- The QR build's literal `grep -rl MMSA build/qr` is NOT empty and never was: main's QR build already held 11 files with
  "MMSA" in QR's own code comments and identifiers (`qr-links.js` `MMSA_ORIGIN`, `qr-front.css`, `404.html`…). The
  rename adds two: a regex in `bookmark-nav.js` and a `bn.js` string for `about.html`, which QR does not ship. QR's
  titles, heading and manifests all say QuranRevival. The real test is "no MMSA a reader sees", and it holds.
- The English full name is 484px (was 304px). At 700–760px Search broke onto a second line (heading 85px). The
  switch to the full name moved from 700px to 800px (`app/quranrevival.html`, one media query; the small-phone rules
  at 699px were left alone). Measured 40px tall at 320/390/700/760/799/800/1024/1280 in English and Bangla.
- The boot splash covers the heading in a headless browser here; hide the fixed overlay before a screenshot.
- keep1116 needs the version bumped before testing: with the same version, the offline worker serves the cached old
  page, so a "new" build is not really loaded.

## Open list for 117L (carry1115; the Owner's words are the yes)
1. **PCA J117 (rest): installs for Asma, Hadith, Dua, Health with ONE shared Install button.** Nothing built yet.
   - Hadith, Dua, Health: each its own manifest, icon, name and start page (`hadith-study.html`, `dua-study.html`,
     `health-study.html`), a distinct `id`, scope `/app/`. Take the three pages out of MSA's install line in the
     same commit: `tools/offline/install-links.mjs` checks that `msa.json` `manifest.pages` is EVERY `app/*.html` page
     minus its `SKIP` list, so add an "own install" list there (not SKIP, which means "no install at all").
   - Asma (QR's `apps/qr/site/app/asma.html`, manifest `asma.webmanifest`, id `./asma.html`): add the visible
     button. Measure its offline worker before believing "no offline worker": `asma-offline-browser` passes 58/0.
   - The shared button module: Android keeps `beforeinstallprompt` and shows OUR button (never `preventDefault()`
     without a visible button: Siyagah's finding, it hides Chrome's own bar); iPhone shows "Share ▸ Add to Home
     Screen"; hidden when `display-mode: standalone`.
   - Measure with full Chromium (`channel: "chromium"`, persistent profile) as `asma-store-browser.mjs` section 3 does;
     headless `getInstallabilityErrors` cannot fail. Give the Owner Android steps first.
2. free-checks C (nightly 2:23 am Sydney): read its comment on #159 (the first measurement of `behaviour.mjs` in Actions).
3. J144 E (Builder queue) waits on the Owner's tick.
4. Pass J116 A + one1116 to the QR, Dua and Health Leads with their next work.
5. QR Lead 47L waits on the Owner's meaning of circles 1–5.
6. Owner waits, not re-asked: J02 j2n0201; J05 j05n5; J05 j05n6; J104 n104pubgrp; J104 n104edit27; J104 j104q1;
   J105 n105d; J115 n115d; J115 n115e; J119 n119g; J120 n120r; J48 n48e; J22 wamzwb5; J106 n106h (Bangla names,
   small-phone bar, marking levels, bab names, KYS phone check); J106 optional Pending 3 (KYS bookmark emulator check).
7. From 18 Nov (pro1118): Sonnet, sessions parked, no keep-alives; Hadith/Dua/Health jobs come to the Architect.

## Lessons
- Auto mode's classifier can go without a verdict for many calls in a row; after 10 the turn stops. Stop early, report,
  and pick up on the next wake.
- `meta/sessions` is written by the PCA at a session change; a write there from an Architect was refused here, and it
  was already right.
