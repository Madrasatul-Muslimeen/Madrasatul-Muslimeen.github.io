# MSA Master Architect 97L: handover, 10 Nov 2026, ~8:35 pm Sydney

Session `session_01PL2xbMP1cjoPSSKucQC1FD`, took over from 96L at 7:35 pm. `main` = **v14.16** (merge `65d9f223`, 8:28 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0 (full clone needed: `git fetch --unshallow origin main`
plus `claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`). Nothing deployed to Firestore. QR v14.15 and v14.16 live (PCA).

**PCA is now 33L `session_01PL2xbJwqVTMZPjUinGStBV`. Send every "PCA ▸" line to that id EXPLICITLY, never "@parent"
(our parent is the stopped 32L).** QR Lead 45L: `session_01PL2xbNQXvPVEr281Nr5aMU`.

## Released this session
- **v14.15** (#1615, 7:56 pm): J120 O4. `app/js/offline-own-data.js` (new): Get ready for offline also reads the reader's own Notes
  (active + Trash), folders, filings, links, sections, tags, Note links, Records and Bookmarks once, so Firestore's on-device copy holds
  them; My account shows the counts. `firebase-init.js` cacheSizeBytes 200 MB. Proof: `cd tools/firestore-emulator && npm ci && npm run
  offline-own-data-real-function` (real deployed Rules, network off, positive control, 4 mutations). offline-ready-browser 186/0.
- **v14.16** (#1616, 8:28 pm): J120 O5. `app/js/offline-line.js` (new), mounted from `sw-register.js` only when offline and warmed into
  the worker: "Offline: working from this device", back online "All saved ✓" (outbox replay + waitForPendingWrites), Sign in and outside
  links stopped with words. offline-line-browser 180/0, 6 mutations red.
- Offline audit after Get ready: all 34 pages open offline with the line, no page errors (stub data; real data proven by the emulator suite).

## OPEN LIST
1. **J120 O5 audio/posters words + O6 (recitation per sūrah, answer G):** QuranRevival's frozen parts; QR Lead 45L builds in MSA source,
   plan accepted (two PRs: recitation first, then posters). Review by measurement and release one version each.
2. **J136 E1:** only when the Owner says "J136 published": copy `docs/proposals/word-effort.DEPLOYMENT-candidate.rules` into
   `firestore.rules` byte for byte, set `WORD_EFFORT_RULES_PUBLISHED = true` in `app/js/word-effort.js`, re-run word-effort,
   rules-authorisation-executable, word-effort-browser, one small release.
3. **MSA · QR J137:** manual line for the Read bar change (with 45L).
4. **Waiting on the Owner (never re-ask; read the job first):** J136 n136d, J120 n120q, J119 n119f (Demo v04), J05 T11/T15,
   opening-recitation demo v4, n127a, n129a, J122 n122a. J123 later.
5. **18 Nov (G02, pro1118):** K switches on by itself; the PCA copies B1 into QR. Until then "PCA ▸ released vX.YY" at each release.

## Lessons
- `page.waitForFunction(async () => …)` resolves at once (the promise is truthy): poll a cache check from Node instead.
- A module imported only when offline must be warmed into the worker, or the page cannot fetch it offline; test with the worker on.
- A getDoc offline of a document never read is refused (`unavailable`), not answered empty; a query offline answers from what is kept.
- Suites need `ln -s /opt/node22/lib/node_modules node_modules` (add to `.git/info/exclude`).
