# QR Lead (Quran Study) — session handover, 31 Oct 2026

Written 2026-10-30T23:35Z (10:35 am 31 Oct, Sydney) by the QR Lead session `session_01PL2xbLnQWhAjuwTKonE8zo`,
on the MSA Architect's word (hand119). `main` is at **v12.135**. **Nothing of mine is in flight or waiting for review.**

## Who to talk to (all changed during this session)

| Role | Session |
|---|---|
| MSA Master Architect | `session_01PL2xbNKZ2gQsFCCR3KyyeV` (📌 03, since 10:20 pm 30 Oct) |
| PCA | `session_01PL2xbNViE9udUe3FUJjKBE` (📌 01, since 6:45 pm 30 Oct) |

Hand finished work to the Architect as "QR LEAD ▸ ready for release: …" (branch, head, before/after numbers,
mutations, screenshots looked at). Never merge, never bump `app/js/version.js`, never dispatch the Builder.

## Released from this session (all live on MSA and on QR, which serves v12.132+)

| Version | What | Suites (all mutation-proven) |
|---|---|---|
| v12.104–v12.113 | Read-bar back fits; Play run gap; Mushaf page stays at its end; ‹ page jump; wheel tap no blue block | see CHANGELOG |
| v12.117 | Āyah card never "Ayah NaN"; poster ‹ › and Back to the Āyah card | `qr-ayah-card-no-nan`, `qr-ayah-poster-nav-back` |
| v12.122 | Landing way back docks in `#landingBackSlot` (covers no tab); 3 load failures `read: true` | `qr-landing-back-reach` 114/0 |
| v12.123 | Landing with large text (150/200%): tabs and drawer row wrap; `body.landing-tall` 721–899px; phone wheel floor only with big text | `qr-landing-large-text` 116/0 |
| v12.127 | v12.125's rem Zab bar followed: three 44px reserves → 2.75rem; wheel/Explore windows refit on `#zabBar` resize; `note-popup.js` fillGeometry fills the room (≥200px) when short of the minimum | same suites + `qr-ayah-poster-nav-back` |

## Open, waiting on the Owner (build nothing until answered)

1. **j29p127q (PCF MSA J29)** — `quran-ayah-action-sheet-browser.mjs` fails 2 checks on `main` (en+bn 1100×800,
   "Status of this āyah heading in view the moment the card opens"). **Not a regression**: the card window takes the
   Read window's size (J72; 529px tall in the suite) and the Owner's J70 order puts Take an Approach + Record Your
   Progress (~300px) first in the right pane, so Status is one scroll down. Full height (default rect) it is in view at
   1024–1440. Options filed: **A** keep J70, rewrite that check as "reachable in the right pane" (recommended; no
   visible change); **B** A + six stage buttons in 3 columns (~46px); **C** Status above Take an Approach (reverses
   J70). The Architect agreed (31 Oct) and will not touch the check. **On the answer, build it the same day.**
2. **MSA J108 (v13.01, name v13.01-31.10.26)** — every Note button opens one real Mapping My Journey Note. The MSA
   Architect builds the shared Note opener; the QR Lead wires the Āyah card's 📝 Note button to it **in the same
   release**. Owner's additions (10:30 am 31 Oct): each Āyah/Hadith on the Note gets show/hide, عربي/EN/বাং buttons,
   delete, and one switch for all. Demo v2: https://claude.ai/artifact/EpdQd5aX2yoUpWenVceTan.
   **Do NOT build a Note window of our own. Nothing until the Owner ticks J108 Q3.**

## Older Owner questions still unanswered (relay only if asked; do not chase)

- Mushaf page-end pull: A (built: a long pull turns the page) / B (no scroll turn) / C (A + a hint).
- What the Owner tapped before the "Ayah NaN" card (the guard now logs `window.__badAyahCardKeys` with a stack).
- J95 tick j95n2, J89, J91, J94; BWN J27 FYI.

## Branches

All of mine are merged or superseded; none needs review. `claude/qr-lead-load91` is parked (an older idea, not
handed in). `claude/qr-lead-status-in-view` is a local scratch branch with no commits (j29p127q waits on the Owner).

## Sandbox lessons from this session

- **The container recycles; `serve.js` dies with it.** A suite that exits 1 with no totals is usually
  `ERR_CONNECTION_REFUSED`: `nohup node serve.js &` and re-run. Playwright: `node_modules/playwright` →
  `/opt/node22/lib/node_modules/playwright`; `CHROMIUM_PATH=/opt/pw-browsers/chromium`.
- **Never merge or stash while browser suites are running** — they read the served files live; the run is void.
- **A fixed px value next to the Zab bar is a bug now**: the bar is 2.75rem (v12.125). Use rem for anything that
  makes room for it, and refit on `#zabBar` resize (it lifts `#dock` without resizing it).
- **QR's own deploy can stall** (30 Oct: three scheduled runs deployed nothing). Check
  `curl https://quranrevival.github.io/app/js/qr-version.js` (its first line may be blank). No session has QR repo
  access; the Owner presses Run workflow at https://github.com/QuranRevival/QuranRevival.github.io/actions.
- **The landing measures to keep**: `qr-landing-back-reach`, `qr-landing-large-text`, `landing-drawers` (its
  "squeeze 390x700" needs the wheel at ~57% of its column at ordinary text — any floor must respect it).

## Possible next (no Owner choice needed)

Per the "never idle" rule: audit Quran Study feature by feature (the PCF User Manual is the checklist) on phone,
tablet and desktop, en and bn, at 100/150/200% text; record each defect as a PCF job and fix it with the usual checks.
