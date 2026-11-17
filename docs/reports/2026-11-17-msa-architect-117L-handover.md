# MMSA Master Architect 117L → next: handover, 17 Nov 2026

Session `session_01PL2xbKEoxLDyF4V1xZpY2D`. Took over from 116L at 9:01 am Sydney 17 Nov. Read `CLAUDE.md` first, then
this file, then PCF section `p/mmsa` (monitor, What's New `wn-v1521`).

The PCA is now **51L, `session_01PL2xbLPReiQkMi59LFEWdR`** (from 8:41 pm 17 Nov; was 50L) (send "PCA ▸ released vX.YY" and handovers there). The QR Lead
is 47L, `session_01PL2xbNAMQAyiv5S52x8NPv`. From 18 Nov (pro1118) there are no keep-alives; sessions are parked and work when
the Owner writes.

## Released this session
| Version | PR | What |
|---|---|---|
| v15.17 | #1792 | PCA J117 DONE: Hadith, Dua and Health install as their own apps (`hadith/dua/health.webmanifest`, own icons, msa.json `ownInstalls`); ONE shared Install card `app/js/install-card.js` on Hadith, Dua, Health and QR's Asma. QR live 9:58 am. |
| (workflow) | #1793 | free-checks C installs `typescript@6.0.2` so QR's `strip-comments-check` runs on the runner. |
| v15.18 | #1795 (+ #1794) | The MMSA install icon says "MMSA" (was "MSA"; the Owner, 17 Nov, via the QR Lead). Hud once in Already-known Prophets' names (#1794, QR Lead). QR live 5:31 pm. |
| v15.19 | #1800 (#1798) | Learn next shows the words left to learn in the chosen range (QR Lead). QR live 5:58 pm. |
| v15.20 | #1803 | Four QR Lead rounds together: bookmark captions (#1797), Already-known seven categories (#1799), the ⋮ ▸ Play card (#1801, frozen at `eafc430`), whole-Qur'an offline + MP3 download (#1802). QR live 8:27 pm. |
| v15.21 | #1805 (#1804) | The Play card's Whole Unit note: a whole-sūrah-only reciter plays only when no other reciter is ticked (QR Lead, #1801's last Codex note). QR live 8:39 pm. |

New checks: `tools/i18n-verify/install-card-browser.mjs` (73/0, `--prove` 4/4); `apps-build-check` gains the own-install check
(59/0); `qr-verify/install-browser.mjs` gains the "Install Asma" card (24/0).

## Open list (carry1115)
1. **free-checks C (nightly 2:23 am Sydney) DOES fire, but late.** Run #23 (event `schedule`) started 23:46Z 16 Nov, about
   8 hours after its 15:23Z slot, and ran 50 minutes. The 15:23Z 17 Nov slot had not run by 21:10Z. GitHub queues scheduled
   runs behind load; moving the minute does not help. Read its #159 comment when it lands; investigate only if a whole day
   passes with no `schedule` run (`actions_list` with `event: schedule`).
2. The QR Lead's Already-known categories landed in v15.20 (#1799). Any further QR Lead PR: review by measurement, release.
3. J144 E (Builder queue) waits on the Owner's tick.
4. Pass J116 A + one1116 to the QR, Dua and Health Leads with their next work.
5. QR Lead 47L waits on the Owner's meaning of circles 1–5.
6. Owner waits, not re-asked: J02 j2n0201; J05 j05n5; J05 j05n6; J104 n104pubgrp; J104 n104edit27; J104 j104q1; J105 n105d;
   J115 n115d; J115 n115e; J119 n119g; J120 n120r; J48 n48e; J22 wamzwb5; J106 n106h; J106 optional Pending 3.
7. Owner steps given (☐ in the monitor): install Hadith/Dua/Health/Asma from the card; iPhone re-add the MMSA icon.
8. From 18 Nov (pro1118): Hadith/Dua/Health jobs come to the Architect.

## Lessons
- **A hit test at a button's centre misses a partial cover.** The Zab 🧰 corner covered the Install button's right end; the
  centre was clear. Sample five points, and on a pill take the ends half a height in (3px from a corner is outside the pill).
- **`display-mode: standalone` is not emulated by this headless Chromium** (`Emulation.setEmulatedMedia` leaves it
  "browser"): override `matchMedia` in an init script.
- **A check that needs a sandbox-only tool fails silently on the runner** (`strip-comments-check` loads TypeScript from
  `/opt/node22`). Run new nightly jobs by hand once (`workflow_dispatch`) and read every rc.
- **A new file a QR page loads must be in Asma's offline list** (`apps/qr/site/app/sw.js`): `asma-offline-browser` caught it.
- `meta/sessions` writes are refused for an Architect; the PCA sets the row.
- keep1116 script: save on a `main` worktree served on one port, then serve the branch on the SAME port with the same
  persistent profile and compare (the scratchpad script `keep/keep.mjs`; rebuild it if the scratchpad is gone).
- **A background run's limit is its `timeout`.** A 10-minute `timeout` killed a suite list whose `audit-part12` alone runs
  ~12 minutes; give a release sweep an hour.
- **`merge_pull_request`'s `expectedHeadSha` must be the full 40-character sha.**
