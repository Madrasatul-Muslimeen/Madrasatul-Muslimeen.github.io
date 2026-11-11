# MSA Master Architect 97L: handover, 10–11 Nov 2026 (LATEST UPDATE 11 Nov ~11:05 am Sydney, at the top)

Session `session_01PL2xbMP1cjoPSSKucQC1FD`, took over from 96L at 7:35 pm. `main` = **v14.19** (merge `419a36d5`, 10:52 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0 (full clone needed: `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`). Nothing deployed to Firestore. QR v14.15 and v14.16 live (PCA).

**PCA is now 34L `session_01PL2xbMuD5EbaWRuvuMUick` (since 10:58 pm; 32L and 33L have stopped). Send every "PCA ▸" line
to that id EXPLICITLY, never "@parent".** QR Lead is now 46L: `session_01PL2xbKuYcFzuK32jDvmAXJ` (45L stopped; its handover
`docs/reports/2026-11-10-qr-lead-handover-16.md`).


## ⇢ LATEST UPDATE, 11 Nov 2026 ~11:05 am Sydney (read this first)

`main` = **v14.22** (this release). PCA = 34L `session_01PL2xbMuD5EbaWRuvuMUick`; QR Lead = 46L `session_01PL2xbKuYcFzuK32jDvmAXJ`
(46L opened its own docs-only handover PR #1642, so a new QR Lead may follow: check with the PCA).

**Released since the block below:** v14.20 (#1630 āyah status stripe round 1; #1631 J136 effort Rules adopted after the Owner's
"Rules Published", 10 Nov 20:25 UTC, checked in 46L's own session record; I fixed the emulator suite's published-Rules case in place),
v14.21 (#1633 J127 ‹ › together; #1634 J122 Verb Form on Taṣrīf; #1635 a real ~18 s Word Card freeze fixed; #1636 stale check),
v14.22 (#1637, the Owner's three Read-bar asks: one bookmark tile, WbW/Root/Derivatives in Read on's ⋮, a quick 🔍; qr-read-tall
41 → 8 fails). QR rebuilt to v14.21 by the PCA at 10:41 am; v14.22 asked.

**REVIEW QUEUE (46L, in this order; each needs offline-files.json regenerated after the previous merge: merge main into the branch,
`node tools/offline/build-offline-files.mjs`, push, then merge pinned):**
1. **#1638** Āyah stripe round 2 (★ Words marked, QCR, اسم Asma chips, all from data already in memory; both round-1 nits done).
   Agreed with 46L: chips only from loaded data, NO extra read (option 1). Option 2 (load per sūrah) is the Owner's I9 call, offered in J110 later.
2. **#1640** J129 "Know Your Status" block with an on/off switch, ON by default (Owner B1), remembered on this device.
3. **#1641** Bangla Words stage 1 (kinds under NEW key mm_bangla_words.v2; v1 only read, never written) + the stage 2 report
   `docs/reports/2026-11-11-bangla-words-stage2-match-quality.md` (docs commit on the same branch; accepted: the 55 matches are a hidden seed).
4. **#1642** 46L's docs-only handover.
5. Stage 3 Rules CANDIDATE (`kinds` map) waits on branch `claude/qr-lead-46l-bw3`, no PR: say "go" to the QR Lead. It is a candidate only;
   the Owner publishes; the flag flips only on the Owner's own word (check it in the session record, as for J136).
**How I reviewed each** (keep doing it): fetch `pull/N/head`, read the diff, check every function/string it names exists (`bn.js`),
run its own suite + every mutation + the neighbouring suites on the branch, and any failing neighbour on clean `origin/main` too
(same line + same pass count = pre-existing). Then QR build + `bash tools/apps/qr-verify/run-all.sh` with serve.js STOPPED
(24/25 is normal here: `upgrade-browser` needs a QR clone at /home/user/quranrevival, absent). Merge with `expectedHeadSha`.

**Pre-existing reds on main (not any PR's):** read-bar-bookmark-layers (3, line 61, [en 400]), read-bar-tools (1, line 108, [en 360]
timeout), qr-j110-reading-view 77/1 ([en 768]), qr-read-tall 8, audit-part1 4, audit-part6 32. Give them to the QR Lead as a debt round,
like the three it already fixed (#1635/#1636 found a real defect that way).

**Waiting on the Owner (never re-ask):** J120 n120r (phone save + airplane mode), J120 n120q (A/B), J136 check (tap Very Hard; it saves),
J119 n119g (A/B/C, a word list for suggestions), J110 round-2 look, J05 T11/T15, J122 n122a, J123 later. 18 Nov G02/pro1118.

## Released this session
- **v14.15** (#1615, 7:56 pm): J120 O4. `app/js/offline-own-data.js` (new): Get ready for offline also reads the reader's own Notes
  (active + Trash), folders, filings, links, sections, tags, Note links, Records and Bookmarks once, so Firestore's on-device copy holds
  them; My account shows the counts. `firebase-init.js` cacheSizeBytes 200 MB. Proof: `cd tools/firestore-emulator && npm ci && npm run
  offline-own-data-real-function` (real deployed Rules, network off, positive control, 4 mutations). offline-ready-browser 186/0.
- **v14.16** (#1616, 8:28 pm): J120 O5. `app/js/offline-line.js` (new), mounted from `sw-register.js` only when offline and warmed into
  the worker: "Offline: working from this device", back online "All saved ✓" (outbox replay + waitForPendingWrites), Sign in and outside
  links stopped with words. offline-line-browser 180/0, 6 mutations red.
- **v14.17** (#1618 + #1619, 8:45 pm): offline, a recitation Play says "Recitation needs the internet." (QR Lead). Its notes first
  also claimed the poster note: wrong, see v14.18.
- **v14.18** (#1620 + #1621, 8:52 pm): the Asma poster says "Posters need the internet" when offline and its web fonts are not loaded
  (QR Lead); corrects v14.17's notes in CHANGELOG, PCF and the PCA's card.
- **v14.19** (#1623 carrying #1622, 10:52 pm): J120 O6, recitation saved for offline per sūrah (Quran Study → Study options →
  Listening; caches mm-audio-v1 / qr-audio-v1, Range served by the worker). Review addition: both workers step in ONLY for saved files
  (`savedAudio` set + `audio-saved-changed` message). recitation-offline-browser 61/0, 7 mutations red. **The J120 offline plan O1–O6
  is complete.** Owner check n120r (one real save on a phone; archive.org CORS cannot be measured here).
- Offline audit after Get ready: all 34 pages open offline with the line, no page errors (stub data; real data proven by the emulator suite).

## OPEN LIST
1. **J120 is done (O1–O6).** Waits on the Owner: n120r (phone save), n120q, n120p. QR Lead 45L was asked to look at qr-verify checks red
   on a QR build of plain main v14.18 in this sandbox (pages 32 with asma.html 404, fatiha-opening 18, title-fit 6, approach-window 6,
   quran-ldog 6, asma-screensaver 4, student 4, front, asma): identical with and without O6, so not O6's; their answer may show a real defect.
   **Settled 11:05 pm:** those reds were my own sandbox (see Lessons). qr-verify run-all on a QR build of main v14.19 with the port free:
   all green except upgrade-browser (needs a QR clone) and student-browser 481/4 (old, identical on clean main; 46L to look).
   QR's worker keeps offline-line.js (install list and warm), proven by 46L's qr-offline-line-browser (#1626): 10/0, noshell 10/0, none 6/4.
   Optional: a pointer in Get ready for offline, "Recitation: choose sūrahs in Quran Study".
2. **J136 E1:** only when the Owner says "J136 published": copy `docs/proposals/word-effort.DEPLOYMENT-candidate.rules` into
   `firestore.rules` byte for byte, set `WORD_EFFORT_RULES_PUBLISHED = true` in `app/js/word-effort.js`, re-run word-effort,
   rules-authorisation-executable, word-effort-browser, one small release.
3. **MSA · QR J137:** manual line for the Read bar change (with 45L).
4. **Waiting on the Owner (never re-ask; read the job first):** J136 n136d, J120 n120q, J119 n119f (Demo v04), J05 T11/T15,
   opening-recitation demo v4, n127a, n129a, J122 n122a. J123 later.
5. **18 Nov (G02, pro1118):** K switches on by itself; the PCA copies B1 into QR. Until then "PCA ▸ released vX.YY" at each release.

## Lessons
- **Stop `node serve.js` (port 8082) before `qr-verify/run-all.sh`**: serve-app.mjs uses 8082 too, dies with EADDRINUSE, and every QR
  check then measures MSA's source (asma.html 404, dozens of false reds). Read `build/qr-logs/serve.log` first.
- **Merge pinned to the commit you tested** (`expectedHeadSha`, full 40 characters). #1618's head changed between review and merge;
  the unpinned merge shipped a version I had not tested and my notes described the one I had.
- Re-run a Lead's suites yourself on main + the branch; a "green" report from another sandbox can hide environment-red checks.
- `page.waitForFunction(async () => …)` resolves at once (the promise is truthy): poll a cache check from Node instead.
- A module imported only when offline must be warmed into the worker, or the page cannot fetch it offline; test with the worker on.
- A getDoc offline of a document never read is refused (`unavailable`), not answered empty; a query offline answers from what is kept.
- Suites need `ln -s /opt/node22/lib/node_modules node_modules` (add to `.git/info/exclude`).
