# MSA Master Architect 100L: handover, 13 Nov 2026 (~4:45 am Sydney)

Session `session_01PL2xbJsssXSmqL5LNVNDPX`, took over from 99L at 10:14 pm 12 Nov. `main` = **v14.29**; the ledger's next number is **14.30**.
On main after the release: brief-integrity 15/0, programme-ledger 8/0, programme-ledger-mutations 49/0 (needs `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`), qr-verify 30/30, offline-ready 186/0. Nothing deployed to Firestore.

**Who:** PCA = 38L `session_01PL2xbMzGvDMNZRkoQFTebu` (meta/global.sessionUrl). QR Lead = 47L `session_01PL2xbNAMQAyiv5S52x8NPv`.
Hadith Lead = 13L `session_01PL2xbNYb7NRAgY79MtwAdL`. The PCA's daily keep-alive (trig_01AEJ4FNunpcrjusTotKps1E, 8:07 am) points at 100L:
the next Architect asks the PCA to move it.

## Released this session
- **v14.28** (#1669): #1659 gold title lines (47L); Hadith printed pages #1662 Darimi, #1663 Forty Nawawi, #1665 Musnad Ahmad, #1668 Nasa'i
  (two-file scan); #1664 Bukhari "My index" (12L/13L). QR live 14.28 at 12:47 am 13 Nov (PCA).
- **v14.29** (#1672): #1670 the Owner's 12 Nov asks (Little Difficult, bigger ring, Read on cross-sūrah word tap, all bookmark units),
  #1657 printed pages as a PDF, #1671 Arabic twice its size (all 47L). **QR rebuild asked of the PCA 38L.**
- Review commits I made: #1659 (title-lines `wrap` mutation pinned the type so it can bite; QR lang-switch exempts `.title-line .tl-tr`),
  #1663 (hadith-book-pages' "no page" book moved from Darimi to Ibn al-Sunni after #1662 turned main red; Darimi `usesnumber` re-anchored),
  #1664 (`firstHeldN()`: books 39, 54, 97 were dead taps), every branch: main merged in and `offline-files.json` regenerated.

## IN REVIEW / NEXT
- Nothing open from the Leads at handover. Expected: 47L's **phone layout part 2** (one row, Location button, one ⋮; ~40 older suites
  being triaged), 13L's **My index per-book list** if the Owner answers MSA J106 n106h with A.
- #1454 (draft, K2 marks) is old; leave it to 47L.

## OWNER WAITS (in the PCF monitor; never re-ask)
NEW: the Word Card's head word vs the doubled Arabic (fine / head word twice too / grammar line smaller). Read on bar on a phone
(A / B / C / B+C); J120 n120r; J136; J120 n120q; J119 n119g; Hadith: J106 n106h, book 46 Bangla name, book 65 range, group names.

## Lessons
- **A probe that finds nothing is a claim about the probe.** My first Word Card overflow probe never left the landing page and reported
  "0 overflow" on every tab; the tell was the same element count on all five tabs. Open Read first (`#tabStudyBtn`, `#tabReadBtn`).
- **When a book gets pages, grep `tools/i18n-verify` for its versionUri**: a suite may use it as the example of a book WITHOUT pages.
- **Mutations served by `ctx.route` leave the tree clean; mutations that edit files in place do not.** Never commit while the in-place kind
  runs (the stop hook will ask; say why and wait).
- **Port 8082** is held by qr-verify AND by `printed-offline-browser`'s QR half: never run the two together.
- **offline-ready flakes under load** (184/2, Bangla 390, "Loading your study…") when qr-verify runs beside it: re-run it alone before
  believing it.
- `upgrade-browser` (qr-verify) needs `QR_REPO=<clone of QuranRevival/QuranRevival.github.io>`; clone it into /home/user.
- `merge_pull_request`'s `expectedHeadSha` must be the full 40 characters.

## Opening message for the next Architect
"You are the MSA Master Architect (101L), taking over from 100L (session_01PL2xbJsssXSmqL5LNVNDPX). Read CLAUDE.md, then
docs/reports/2026-11-13-msa-architect-100L-handover.md, then the PCF https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ section p/mmsa.
Set p/mmsa sessionUrl to your session and stamp claudeSeenAt (pin if_version). main = v14.29; next number 14.30. PCA = 38L
session_01PL2xbMzGvDMNZRkoQFTebu (or newer in meta/global.sessionUrl); ask it to move the keep-alive to you. QR Lead = 47L
session_01PL2xbNAMQAyiv5S52x8NPv. Hadith Lead = 13L session_01PL2xbNYb7NRAgY79MtwAdL. Tell the PCA "taken over". Review the Leads' PRs as
they come (47L phone layout part 2 next). Suites need `ln -s /opt/node22/lib/node_modules node_modules`, `node serve.js`, and for qr-verify
QR_REPO=<QuranRevival clone>. Never hold port 8082 during qr-verify or printed-offline. Merge pinned with the full expectedHeadSha. Release with
allocate-version.py, then PCF What's New + monitor, then "PCA ▸ released vX.YY". No self wake-ups. At about 30% context, hand over."
