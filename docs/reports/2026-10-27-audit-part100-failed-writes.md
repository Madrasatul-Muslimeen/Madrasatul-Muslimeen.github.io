# Audit part 100: note pane failed writes (I15, PCF MSA J29)

Suite: `tools/i18n-verify/shared-pages-failed-write-audit-browser.mjs` (`--flow=<name> --bn=all --nomenu`). Refusal flags armed as in part 96; a visible, in-language "not saved" message must show for at least 2 s.

## Changes

- `app/js/note-window.js` (shared in-page note script that QR carries): the catch lines that showed `err?.message || t("That did not save.")` now call `notSavedText(err)` ("Not saved: {why}" / "That did not save."). Lines changed (as numbered on `main` 1727d130): **810** (@-mention link), **1549** (🏷 picker tick), **1563** (🏷 picker New tag), **2129** (Bring this version back; the "Stale Note revision." special case is kept, only the fallback changed), **2160** (staged tags saved on Done), **2209** (📎 dialog tag tick), **2223** (📎 dialog New tag). No other line changed.
- Detector (`REFUSED_BN`): added `রাখা (যায়নি|গেল না)`. bn.js values read: "That did not save." = "এটি সংরক্ষণ হয়নি।", "Not saved: {why}" = "সংরক্ষিত হয়নি: {why}", "That could not be saved to your account: {why}" = "...রাখা গেল না: {why}" (the one the old list missed).
- New flows: `notes-pane-menu`, `notes-pane-attach`, `notes-pane-edit`, `notes-pane-{rename,link,tags,delete,versions,mytools}` (notes.html, a card's "Open in window").

## Results

| Flow / site | File:line | Before | After |
|---|---|---|---|
| notes-pane-menu (Tags, Rename, My Note tools, previews, Delete), en+bn, 1440+390 | note-window.js (⋯ menu) | not run before (no flow) | 16 saves, 16 OK |
| notes-pane-attach on notes.html | — | flow reaches only the ⋯ menu (the 📎 button is not on this pane), same 16 OK | 16 OK; the 📎 dialog is audited on journey-map (below) |
| pane-mytools, bn, 1440, **detector before** | bn "রাখা গেল না" | **15 of 30 MISSING** (Add Tab, Save as template, Add phrase, 12 colours; the page DID show "…রাখা গেল না") — a false MISSING, seen by opening the flow and reading the message | detector after: **30 / 30 OK** |
| pane-tags 🏷 tick / New tag (1549, 1563) | 1549, 1563 | OK (3/3 at 1440, en+bn) — the stub's error text already says why; raw message still shown alone | 6/6 OK at 1440 and 390, en+bn; now prefixed "Not saved:" |
| pane-attach 📎 dialog tag tick / New tag / folders (2209, 2223) | 2209, 2223 | not measured separately | 16/16 OK, en+bn, 1440 |
| pane-versions → Bring this version back (2129) | 2129 | — | **not reachable**: the seeded note has one revision (the current one), so no restore button exists; 0 saves. Code changed by reading, not measured |
| @-mention link (810) | 810 | — | not reachable by a button press (typed @ in the editor); changed by reading, not measured |
| Staged tags on Done (2160) | 2160 | — | not measured (needs a tick while editing, then Done); changed by reading |

Honest limit: the stub's refusal text ("denied by the test") is a short sentence, so the old raw-only code was not seen failing here; the old shape would show a bare Firestore code in real use. These sites are changed for consistency with part 99's fix, not because a MISSING was measured.

## Positive control / mutation

`--flow=pane-tags --mutate=silent --mutate-page=journey-map.html`: 2 saves, 2 MISSING, "caught (the sweep CAN fail)", exit 1.

## behaviour.mjs (run alone, once, at the end)

`==== 971 passed, 0 failed ====`
