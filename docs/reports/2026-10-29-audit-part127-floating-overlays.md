# Audit part 127: do the floating things leave a control a finger cannot reach? (PCF MSA J29, issue #1304)

Re-run (builder run 2220) of run 2217, which measured the same thing but could not push. **No app file changed.**

## Method

`tools/i18n-verify/floating-overlays-reach-browser.mjs`. Pages `bookmarks`, `records`, `notes`, `journey-map`, `monitor`, `people` (checked) and the Quran Study landing `index.html` (measured and printed only; it is frozen, so it goes to the QR Lead). Widths 360, 390, 768; English and Bangla; with the ← ✕ way-back pill (`?navBack=1`) and without. For every visible, non-fixed interactive control the page is scrolled through top, every half-screen and the very bottom; at each stop `document.elementFromPoint` at the control's centre must return the control or a descendant. A control inside a sideways-scrolling box (the Records table) has that box scrolled to it first. **Unreachable** = no stop works. **Covered at the bottom** = reachable somewhere but covered at the last stop.

Positive control (Architect review, 30 Oct): a button in the page's last pixels under a fixed cover flush with the screen's bottom-right must be reported unreachable. The first version put it "under the pill", but a pill floating above the bottom edge leaves room to scroll a control out from under it, so that control flickered (Monitor 390 bn, Monitor 360 en); this one is unreachable by construction. End-of-flow probe: a button that is the last child of `<body>` must be reachable.

## Result (before = after, nothing was changed)

| Page | 360 / 390 / 768, en + bn, pill and no pill |
|---|---|
| bookmarks, records, notes, journey-map, monitor, people | **No unreachable control, none covered at the bottom.** The end-of-flow probe is reachable everywhere, because the body already ends with 64px padding plus a 32px margin, which lets the last control scroll clear of the pill and the 🧰 button. |
| index.html (Quran Study landing) | **"Approach" tab (`#tabApproachBtn`) covered at the bottom position** with the pill, at 360 and 390 (en and bn). At 768 run 2217 also saw "Wheel▴" (sometimes Legend▴, Unit▴, Read) unreachable; this run's 768 pass did not repeat it, so it varies with load timing. |

Run 1 of the suite flagged Records' Confirm / Return / Confirm anyway buttons; they sit in a wide table that scrolls sideways, and are reachable once that box is scrolled, so the suite now does that (a suite fix, not an app defect).

## Change

None to the app. The clearance on the shared pages is already sufficient. The landing finding is for the PCA / QR Lead: the Study / Explore bottom tabs need the same page-end clearance when the pill shows. Not touched here (`app/index.html` is frozen Quran Study).

## Checks

- `node tools/i18n-verify/floating-overlays-reach-browser.mjs`: 360 passed, 0 failed.
- Architect re-run with the corrected control: 360/0 twice; `--mutate=no-page-end-clearance` 332 passed, 28 failed.
- `--mutate=no-page-end-clearance` (removes the body's end padding and margin, Builder's run): 331 passed, 29 failed, all "a button at the very end of the page can be reached". One extra failure (people.html 360px bn, positive control) appears only under the mutation, where the layout shifts.
- Run 2217 regression suites (no app change): zab-bar 370/0, journey-map-back 38/0, notes-way-back 33/0, offline-save-shared-tools 119/0, shared-tools-read-failure 225/0.

W-T-P-E-O: measured with `elementFromPoint` on phone and tablet widths; nothing stored; no Rules change.
