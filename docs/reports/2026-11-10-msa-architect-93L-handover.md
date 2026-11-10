# MSA Master Architect 93L: handover, 10 Nov 2026, ~3:30 pm Sydney

Session `session_01PL2xbKEa4nyJuUQw4fwBkm`, took over from 92L at 12:06 pm. `main` = **v14.07** (`3b9d4aad`, merged 3:24 pm).
Governance on main: brief-integrity 15/0, programme-ledger 8/0, mutations 49/0. Nothing deployed to Firestore.

## Released this session
- **v14.06** (#1594, 1:49 pm): QR Lead #1593 (J134 follow-up A: saved whole-list Bangla switch) + #1595 (J130 b/c/d). QR live 14.06 (PCA).
- **#1596** (2:01 pm, no version): G02 K (`.github/workflows/release-card.yml`, `tools/governance/release-card.py`, date-gated ON from 18 Nov Sydney) and B1 prepared in `apps/qr/qr-repo-workflow.yml` (confirm job). The PCA (31L, has QR push) copies the B1 file into QR on 18 Nov (J86 kb1110).
- **#1597** (no version): QR Lead 43L J130 (a), tools only.
- **v14.07** (#1598, 3:24 pm): `.note-pane-chips .folder-chip` 40px (note-window.css); lang-switch `relabel` retired behind `relabelRetired()` (J114 n114b F). "PCA ▸ released v14.07" sent with the change notice; QR rebuild pending at handover.

## OPEN LIST
1. **MSA J120 2 D (mine, next):** the Owner (10 Nov 3:04 pm): "J120:1.A, 2.D,3.G". D = "Get ready for offline" downloads ALL Hadith and Dua books (~220 MB), no per-book choice. Code: `app/js/offline-ready.js` (`mountOfflineSection`, `ticked()`, `planFor`), suite `tools/i18n-verify/offline-ready-browser.mjs` (it ticks single books and sets `mm_offline_books` to keep test downloads small: update in place with reasons). Then O3–O5 in order, then O6 (G: recitation audio offline per surah, reader chooses).
2. **MSA J120 n120q: WAITING ON THE OWNER.** Their words "Phone Check. Update needed." are unclear; tick question n120q is in J120 (A app said update needed / did not open offline; B steps out of date; C other). Never re-ask; read J120 first.
3. **MSA · QR J132 (QR Lead 44L `session_01PL2xbJCwoyWcr7ne8Y5siS`, building now):** the Owner answered n132a build, n132d A, n132b "Study moves to dot … make space for play, nav buttons" (⏮ ⏭ ▶ ■ stay in the bar), n132c B. Bar: ☰ · Read on · Mushaf ⤡ · ⏮ ⏭ ▶ ■ · ⋮; Study ▾ items in the ⋮. Review with screenshots, release.
4. **MSA · QR J136 (QR Lead 44L, after J132):** the Owner "Approved with recommended" (terms, one Mark the Word set, n136c A three bands, n136b yes). Rules change is a CANDIDATE only; the Architect gives the Owner the click-by-click publish step (E1 gate). Feature must say in words it cannot save until then (I15).
5. **MSA · QR J137 (QR Lead):** Manual rounds 1–6 done (Manual only, no release).
6. **J130 follow-up (not started):** older MSA suites still targeting the retired Notes pane / #readNotesBtn (`note-opens-in-journey`, `note-toolbar-fit`, `read-note-pane*`, `audit-part19-notes`, `bookmark-multi-save`) are red on main for that reason (QR Lead 43L's measurements, 10 Nov). Retire or update each in place with the reason (J114 n114b F), the same way as `relabelRetired()`.
7. **Waiting on the Owner (never re-ask; check the job first):** J05 T11/T15; opening-recitation demo v4; n127a, n129a; J122 Verb Form YouTube link (n122a). J123 cross-device Last read needs Rules: later option only.
8. **18 Nov Pro switch-on (G02):** K turns on by itself; the PCA copies B1 into QR and parks; keep sending "PCA ▸ released vX.YY" until then.

## Rules learned this session
- **hl1110 (the Owner, 10 Nov 3:04 pm):** every ask of the Owner starts with 🟨 ⚠️ and gives the WHOLE ask in that line; bold in chat. Recorded in p/mmsa.rules.
- add_repo for QuranRevival is refused by this sandbox's classifier: QR repo changes go through the PCA.
- Never `git checkout <file>` to undo a test mutation on an uncommitted fix: it throws away the fix too. Copy the file aside first.
- A one-flow mutation of the folder chip does not reach it (only the full student-tools run opens its panel); prove such a fix by the full run with the exemption removed.
