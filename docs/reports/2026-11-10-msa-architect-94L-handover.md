# MSA Master Architect 94L: handover, 10 Nov 2026, ~4:55 pm Sydney

Session `session_01PL2xbHrwY1KXdqtpdN16Nt`, took over from 93L at 3:26 pm. `main` = **v14.09** (merge `321e7a72`, 4:47 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0. Nothing deployed to Firestore.
PMS: `p/mmsa` v803 (monitor, What's New v14.08 + v14.09), J120 v8, J132 v6 (done).

## Released / merged this session
- **v14.08** (#1600, 3:45 pm): MSA J120 2 D. My account → "Get ready for offline" keeps EVERY Hadith and Dua book (17 books,
  216.8 MB with app + Qur'an); tick boxes gone (`offline-ready.js`: `allBookIds(list)`; bn.js 2 strings); `app/offline-files.json`
  regenerated. `offline-ready-browser` updated in place: 170/0, mutations `onlydua` (new) and `nobooks` red. QR v14.08 live (PCA 3:47 pm).
- **#1603** (no version, tools only): J130 follow-up. note-opens-in-journey 44/0 (list → ⋮ Notes tile; search/new retired behind
  `paneRetired()`), note-toolbar-fit 38/0, read-note-pane-window 112/0 and audit-part19-notes 504/0 (assert retirement, then show
  the old 📝 with a style rule, as read-note-pane does), bookmark-multi-save 192/0 (⋮ sheet's whole-unit bookmark tile, DOM click).
- **v14.09** (#1601, 4:47 pm): MSA · QR J132 one Read bar (QR Lead 44L). Release tree: read-one-bar 158/0 (`nostudy` red),
  behaviour 974/1 (14a as main), apps-build-check 53/0, QR builds; screenshots 390 en/bn + 1280 looked at.
  "PCA ▸ released v14.09" sent; QR rebuild pending at handover.

## OPEN LIST
1. **MSA · QR J136 (QR Lead 45L `session_01PL2xbNQXvPVEr281Nr5aMU`): handed in, draft PR #1604** (branch `claude/qr-lead-j136-mark-word`,
   from main v14.08). Five "Mark the Word" marks on the Word card; Already Known / Very Hard need the new `effort` field and say in words
   they cannot save until the Owner publishes `docs/proposals/word-effort.DEPLOYMENT-candidate.rules` (firestore.rules untouched;
   `WORD_EFFORT_RULES_PUBLISHED` guarded in rules-authorisation-executable). Lead's checks: word-effort 46/0, emulator 8/8, browser 42/0.
   I asked 45L to merge main v14.09 into it and to fold in the **Āyah Card marks-row contrast** (global-approach-card-browser, 8 fails,
   4.5:1 target, a mutation restoring old colours). **Review, release, then give the Owner the click-by-click Rules publish step (E1)
   with a 🟨 ⚠️ ask** (rule hl1110).
2. **QR Lead 45L follow-up round (after v14.09, from main):** (a) Whole Sūrah mode: the FIRST āyah's ⋮ sheet opens upward with no room
   (390: elementFromPoint at `[data-qm-unit-bookmark]` = `#readScroll`; 1280: under `#readBarStatusBtn`); fix + reachability check at
   each tile's centre at 390 and 1280; then bookmark-multi-save's DOM click can become a real tap. (b) the Study group's āyah picker cuts
   "Bismillah" to "Bismilla" (390 and 1280).
3. **MSA J120 O3 (mine, next after J136):** a Note written offline is kept on the device and saved when online (plan j120p2). Confirm no
   Rules change before building (the plan says so). Then O4, O5, then O6 (G: recitation per sūrah, reader chooses).
4. **MSA J120 n120q: WAITING ON THE OWNER** ("Phone Check. Update needed."). Never re-ask; read J120 first.
5. **MSA · QR J137 (QR Lead):** Manual rounds; add a line that the Read bar's pill / Study ▾ are now "Study, the first group of the ⋮".
6. **Waiting on the Owner (never re-ask):** J05 T11/T15; opening-recitation demo v4; n127a, n129a; J122 n122a. J123 later option only.
7. **18 Nov (G02, pro1118):** K switches on by itself; the PCA copies B1 into QR. Until then send "PCA ▸ released vX.YY" at each release.

## Lessons from this session
- **Fresh container: `ln -s /opt/node22/lib/node_modules node_modules`** at the repo root (git-ignored) or every browser suite dies on
  `import "playwright"`; and `git fetch --unshallow origin main` plus the branches brief-integrity names, or it reports false failures.
- **`build-offline-files.mjs --check` compares only the Qur'an files**; app sizes drift silently. Regenerate it at every release that
  changes an app file (v14.08 and v14.09 both did).
- **The offline suite takes ~25 min in full** (4 passes × 216.8 MB, plus a release pass); run mutations with `ONE=1 PASS=en:390`.
- **A mutation that a second rule masks proves nothing:** the retired 📝 is hidden by TWO rules (J114's `#readBar #readNotesBtn` and
  "one menu" `#readToolsMenu { display:none !important }`); the guard's mutation must remove both (note-opens-in-journey `--mutate=pane`).
- **`clickReadTool(P, "#readNotesBtn")` now lands on the ⋮ Notes tile** (opens Mapping My Journey), never the pane; a suite that needs
  the pane must show the old button itself and press it directly (open ⋯ first below 900px).
- Keep probe output tight: printing every matching element cost ~10k tokens once.
