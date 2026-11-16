# MSA Master Architect 114L → 115L: handover, 16 Nov 2026 (~3:55 pm Sydney, 04:55Z)

Session `session_01PL2xbM9Zjm9C1HJL8HQXH4`. It took over from 113L at 8:24 am and is handing over at 31% context.
Read `CLAUDE.md` first, then this file, then PCF section `p/mmsa`. Rule **one1116**: write to the PMS once per finished job.

## Releases this session (all on `main`, QR built by the PCA)
| Version | PR / merge | What |
|---|---|---|
| v15.11 | #1771 / 98fdda7 | J143 B app half (OFF) + Soft Meadow Word Card level colours (#1765, #1766) |
| v15.12 | #1773 / a968022 | J140 pop-ups part 4 (#1770) + Know Your Status keyboard ring (#1769) |
| v15.13 | #1780 / b2cec50 | **J143 ON**: the Owner published the banglaWords Rules; `firestore.rules` = `docs/proposals/bangla-words.DEPLOYMENT-candidate.rules`; the gate is open; plus #1775 (Nasa'i pages tier C) |

The rest merged without a version:
- #1772: the J143 deployment file and guide.
- #1776: the 15L handover.
- #1781: the J116 B workflows.

## In flight
1. **Builder #1774 (J140 part 5)**. Run 3377 timed out with 2 commits on `builder/issue-1774-run-3377` and no PR. Re-dispatched at about 04:50Z with a FINISH note:
   - copy the three files over;
   - set the filing ✕'s aria-label and title from `t("Close")`;
   - run the suites;
   - open the PR ready.

   **This is the first run on Sonnet with 80 turns (#1781).** If it fails in under a second with `modelUsage: {}`, the subscription cannot address `claude-sonnet-5-5`. In that case remove the `--model` line in `claude.yml` (keep `--max-turns 80`) and tell the PCA.
   - Review it like #1770: behaviour ALONE 970/5, popup-windows-all plus every mutation, elementFromPoint at 1280/768/390/320, qr-verify.
   - It touches `quranrevival.html` (frozen Quran Study: entries and ✕ only), so send the PCA a safety note with the release.
   - `zab-bar.js` must stay unchanged; check `git diff` on it.
2. **Hadith Lead 16L (session_01PL2xbN1dGxFAD18ytZHjGu)** has three PRs ready and is handing over at 34%:
   - **#1777**: Know Your Status Bangla words editable by owner and prime (J106 n106j 2.A). No Rules change; stored in `hadithNames` under `kys__` keys. I9 is fine: the names read happens when the view opens, not at start-up. Adds 11 bn strings (module strings, allowed).
   - **#1778**: printed Shamela pages for 'Amal al-Yawm (an-Nasa'i, Ibn al-Sunni) and al-Adhkar.
   - The 16L handover PR: `docs/reports/2026-11-16-hadith-lead-16l-handover.md`. It holds the PMS Done lines to write once you merge.
   - Release #1777 and #1778 together as **v15.14**: behaviour ALONE, their suites and mutations, hadith-status 100/0, keep1116 save → update → reopen, What's New line. Then ask the PCA to close 16L and open 17L.

## Waiting on the Owner
- **PCF MSA J144**: six tick boxes, the repeat jobs a no-Claude workflow could do (PCA J116 C). Build only what is ticked, one small workflow round each.
- QR Lead 47L is still waiting on the meaning of circles 1 to 5.
- J106 n106h (the Bangla names), and the phone and computer check of Know Your Status.
- The Owner's open list (carry1115) is unchanged.

## Standing items from the PCA this session
- **PCA is 48L, `session_01PL2xbJY7yNVd7R9twmh1su`.** Send "PCA ▸ released vX.YY" there, or to whatever `meta/global.sessionUrl` names.
- **PCA J116 A** (from 18 Nov): every BUILD job goes to the Builder as one small issue with exact files and the check to pass. Chat sessions plan and answer the Owner. Pass A and **one1116** to the QR, Dua and Health Leads in your next work message to each (I have not yet).
- **keep1116**: every release tests save → update → reopen (probe: serve the old and new trees on one persistent profile, seed localStorage, and compare every key). Say so in the Done line.
- The release-card job was withdrawn. `release-card.yml` already sends the BwN card.

## Lessons from this session
- **Opening a gate turns the "as shipped" checks upside down.** These suites assumed the gate was OFF:
  - `bangla-words-data`;
  - `bangla-words-account-browser`;
  - `bangla-marks-browser`;
  - `bangla-words-browser`;
  - the PENDING checks in `rules-authorisation-executable`.

  Each was updated IN PLACE. The device-path suites now close the gate in memory (a route that throws if it cannot), so the way back stays tested. `stripBangla()` keeps "only this block was added" checked for every earlier published file.
- **A signed-out reader cannot mark a word**: `appEl` is hidden while signed out. So the account path never drops a mark for want of a session. I checked this before suspecting a defect.
- **The unattended Architect can merge a data-only Lead PR (#1775) before you see it.** It is still unreleased, so carry it into the next version and run its suites.
- qr-verify takes over 40 minutes when browser suites run beside it. Give it its own background run with `timeout` ≥ 6000 s, or run the remaining suites with a copy of `run-all.sh`.
