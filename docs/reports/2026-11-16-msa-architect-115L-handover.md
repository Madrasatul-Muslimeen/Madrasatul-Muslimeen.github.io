# MSA Master Architect 115L → 116L: handover, 16 Nov 2026

Session `session_01PL2xbKKXThqa2wyneBPgXF`. Took over from 114L at 3:43 pm Sydney. Handing over at ~42% context
(past the 30% point) after v15.15.

Read `CLAUDE.md` first, then this file, then PCF section `p/mmsa`.

**The PCA is now 49L, `session_01PL2xbJFRNxJ9PdyeCo1CAg`** (checked against `meta/global.sessionUrl`). Send
"PCA ▸ released vX.YY" and handovers there.

## Releases and merges this session
| Version | PR / merge | What |
|---|---|---|
| v15.14 | #1784 / f0f89b5 | Hadith 16L: Know Your Status Bangla words editable by owner/prime (#1777) + Shamela printed pages for 'Amal al-Yawm and al-Adhkar (#1778). J106 Done lines written. |
| — | #1785 / 8ca681e | `free-checks.yml` (J144 A, B, C, D, F, decided by the Architect under the Owner's rule **free1116**). J144 Done line written. |
| v15.15 | #1789 / 24bddbd | Builder #1786 (J140 part 5: – ⛶ ✕ on the remaining pop-ups) + J117 QR install (`claude/qr-install`). |

## New General rule from the Owner (via PCA, 16 Nov): free1116
- Free GitHub workflows that use **no Claude** (checks, guards, release cards, publishing, lists) are the Architect's own
  decision. No tick boxes. Report each in its Done line.
- Still ask the Owner first for anything that costs money, uses Claude or AI, touches saved data (keep1116), or changes
  what users see.
- J144 E (a Builder queue) starts Claude runs, so it **still waits on the Owner's tick**.

## free-checks.yml (live on `main`)
| Job | When | Notes |
|---|---|---|
| A | every push to `main` | Rebuilds `app/offline-files.json`; opens a PR from `auto/offline-files-<sha>` if it changed. Not yet seen opening one: it may hit the repository setting "Allow GitHub Actions to create pull requests". If so it warns and leaves the branch pushed. |
| B | every push to `main` | Runs the after-merge guards and edits ONE comment on #159 (marker `free1116:after-merge`). First run: all green. |
| C | nightly, 2:23 am Sydney | Runs `behaviour.mjs` alone and QR's checks, then edits one comment on #159. **First run tonight: look at it.** It is the first ever measurement of `behaviour.mjs` in Actions. `upgrade-browser` there clones QR's public repo. |
| D | after any Builder run | Marks open `builder/*` draft PRs ready. |
| F | Mondays, 9:41 am Sydney | Lists branches whose PR is merged or closed. Nothing is deleted. |

Board comments are **edited in place, never re-posted**. Why: `claude.yml` fires on every comment *created*, and its
runs share the `mmsa-builder` concurrency group, where a new pending run cancels an older pending one (possibly a
dispatched Builder round).

## Open jobs for 116L (all from the Owner via the PCA, 16 Nov; the Owner's words are the yes)

### 1. PCA J117 (rest): Install buttons and more installable apps
QR's install is in v15.15:
- `qr.webmanifest`, icons in `apps/qr/site/app/img/icons/`, drawn by `node tools/offline/make-icons.mjs --app=qr`.
- Checked by `tools/apps/qr-verify/install-browser.mjs`, plus full Chromium's verdict in `asma-store-browser.mjs` section 3.

Still to do:
- **Asma** (`quranrevival.github.io/app/asma.html`, QR's own overlay file `apps/qr/site/app/asma.html`):
  - add a visible **"Install Asma"** button;
  - check its manifest and icons, and its offline worker (the PCA says "no offline worker"; `asma-offline-browser`
    passes 58/0, so measure before believing it);
  - keep it separate from QR's icon. It already is: id `./asma.html` against QR's `/app/`.
- **Hadith, Dua, Health**: each separately installable, like Asma:
  - its own manifest, icon, name and start page (`hadith-study.html`, `dua-study.html`, `health-study.html`);
  - a distinct `id` and the same scope `/app/`;
  - its page links its own manifest instead of MSA's install line. `tools/offline/install-links.mjs` puts MSA's line on
    every reader page and `msa.json` `manifest.pages` lists them, so take those three pages out of both, in the same
    commit;
  - the same Install button.
  - Health may have little content; an installable start page is fine.
- **One shared install-button module** for all of them, so they behave alike:
  - Android: keep the `beforeinstallprompt` event and show OUR button. **Never call `preventDefault()` without a visible
    button** (Siyagah's finding: it hides Chrome's own install bar).
  - iPhone: a short "Share ▸ Add to Home Screen" note, because an iPhone never prompts.
  - Hide the button when already installed (`display-mode: standalone`).
- Measure with **full Chromium** (`channel: "chromium"`, a persistent profile), as `asma-store-browser.mjs` section 3
  does. The default headless shell's `Page.getInstallabilityErrors` says "no errors" even with no manifest (measured
  twice today).
- One PMS write when done, and a release note to the PCA.

### 2. PCA J118: rename MSA → MMSA. **IN FLIGHT: Builder issue #1787, dispatched ~5:28 pm 16 Nov**
- Full name "Madrasatul Muslimeen's Study App". The Owner confirmed the spelling at 5:25 pm (n118a = A).
- Review #1787's PR against the issue. Check:
  - `grep -rl MMSA build/qr` prints nothing;
  - the header width in English and Bangla at 390 and 1280 (the name is longer);
  - keep1116: no key or cache name changed;
  - `behaviour.mjs` ALONE, `apps-build-check`, and qr-verify.
- It branched from main BEFORE v15.15, so merge main into it first.
- Change every place a user sees it:
  - title, header and `msa.json` name / titlePrefix;
  - manifest `name` and `short_name` (the home-screen label becomes "MMSA");
  - About, What's New, guides, the version text ("MMSA v15.xx") and `bn.js`.
- **Labels only (keep1116)**: no storage key, no cache name in `sw.js`, no `/app/` address change.
- `apps-build-check` fails when the source stops saying what `msa.json` says, so change both in one commit.
- QR's build rewrites MSA's names: check the build rules in `build-app.mjs` and `apps/qr/edits.json` still anchor.
- Ships as the next version. A good Builder issue (many files, mechanical) once the spelling is confirmed.

### 3. Carried
- PCA J116 A + one1116 still to pass to the QR, Dua and Health Leads with their next work.
- QR Lead 47L waits on the Owner's meaning of circles 1–5.
- Owner waits (carry1115), not re-asked:
  - J02 j2n0201; J05 j05n5, j05n6; J104 n104pubgrp, n104edit27; J105 n105d; J115 n115d, n115e; J119 n119g;
    J120 n120r; J48 n48e;
  - J106 n106h, Bangla names, small-phone bar, marking levels, bab names, KYS phone check;
  - J144 E.
- Hadith Lead 16L is PARKED and there is no 17L. From 18 Nov the Pro plan moves Hadith jobs to the Architect.
  J106 optional Pending 3 (an emulator check of the KYS bookmark payload) is still open.
- Keep-alive trigger `trig_01YM2pdt9oZhRrhofgQhAtLd` (8:07 am). The PCA moves it to 116L. It is deleted on 18 Nov (G02).

## Lessons from this session
- **Headless Chromium's installability check cannot fail.** `Page.getInstallabilityErrors` in the default headless
  shell returns `[]` with the manifest 404'd. Use full Chromium with a persistent profile and a no-manifest control page.
- **Playwright's `page.request` bypasses `context.route()`.** A mutation that 404s a file through a route is invisible
  to `page.request.get()`. Fetch inside the page (`page.evaluate(fetch)`). Found because the `noicon` mutation went
  uncaught on the first run.
- **The QR overlay can silently replace a page the build edited.** QR's front page (`index.html`) is QR's own file, so
  a manifest link the build injected into the source's `index.html` was lost. `build-app.mjs` now stops the build when
  a manifest page is overlaid.
- **The ESM suites need `node_modules/playwright` in the repository.** In a fresh container, run
  `mkdir -p node_modules && ln -s /opt/node22/lib/node_modules/playwright node_modules/playwright`. node_modules is
  git-ignored.
- **The container clone is shallow.** `brief-integrity` and `programme-ledger` report false failures until
  `git fetch --unshallow origin main` and the branches the brief names are fetched.
- **Run long suites from a worktree when the main tree is serving tests.** The QR install was built in
  `git worktree add` while `behaviour.mjs` ran against the release tree.
- **`upgrade-browser` needs `QR_REPO`**: a read-only clone of `QuranRevival/quranrevival.github.io` with full history
  (`git clone --filter=blob:none --no-checkout`), for its fe028eb comparison.
