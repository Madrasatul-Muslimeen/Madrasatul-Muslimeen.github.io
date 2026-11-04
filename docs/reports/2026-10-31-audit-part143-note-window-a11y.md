# Audit part 143 — keyboard, names, opened surfaces and contrast on the v13 Note (issue #1370)

REPORT ONLY. No application file changed. Suite: `tools/i18n-verify/note-window-a11y-browser.mjs` (uses part 142's in-page measuring block, read from `shared-tools-a11y-browser.mjs`).

Measured at 360, 390, 768, 820, 1024, 1180, 1440 px, English and Bangla (`node serve.js` on 8080, Firebase stub data):

* `qr-note` — the shared Note window on `quranrevival.html`, opened two ways: Study ▸ Notes, and the Āyah-card call (Āyah 2:255 block, long title and long unit label, "You have 3 other Notes" line). The window's own chrome and the Note page inside its iframe are audited separately.
* `notes` — `notes.html`; `journey` — `journey-map.html`; `journey-new` — `journey-map.html?embed=1&new=1`.
* Surfaces inside the window: 📎 Attach, 🗂 Folders, ⋯ menu (Enter, Space, Escape, focus return).

## Results

| Run | Passed | Failed |
|---|---|---|
| `--page=qr-note --lang=en` (all widths) | 287 | 28 |
| `--page=qr-note --lang=bn` (all widths, after the harness fix below) | 315 | 28 (all are D1, D3, D4 at each width) |
| `--page=notes` (all widths, en+bn) | 98 | 0 |
| `--page=journey` (all widths, en+bn) | 98 | 0 |
| `--page=journey-new` (all widths, en+bn) | 98 | 0 (one MINOR) |
| mutation `--mutate=noring` (qr-note 390 en) | 43 | 8 (fails, as it must) |
| mutation `--mutate=trapfix` (qr-note 390 en) | 44 | 7 (fails, as it must) |

Positive controls (injected unnamed button, `tabindex=-1` button, grey-on-grey text, all focus outlines removed) each fire.

## DEFECTS

**D1. The Note window does not hold Tab.** `app/js/note-opener.js:94` — the window is `role="dialog"` with no focus trap; from the ✕ button, Tab walks on to the page behind (`headSearchBtn`) at every width and both languages. Smallest fix: keep a `keydown` Tab handler on the window that wraps focus between the first control (✕) and the last control of the iframe (or, simpler, set `inert` on the page siblings of `#noteOpener` while it is open and clear it on close, which also hides the page from screen readers).

**D2. The full-screen Note window (below 1024px) is not `aria-modal`.** `note-opener.js:94` — it covers the whole page but is announced as a plain dialog, so a screen reader can still read the page behind. Smallest fix: `win.setAttribute("aria-modal", "true")` (set only while `no-full`, or always together with D1's trap).

**D3. The 📎 Attach sheet claims `aria-modal="true"` but does not hold Tab.** `note-opener.js:271` — Tab from the last button leaves the sheet and reaches the page behind (`headSearchBtn`). Smallest fix: the same wrap-around handler on `[data-no-attach]` (Tab on the last control → first, Shift+Tab on the first → last).

**D4. Closing Attach (Escape or Cancel) drops focus to `body`.** `note-opener.js:313` (`closeAttach`) — focus was inside the sheet, which is then emptied, so the keyboard reader starts again from the top of the page. Smallest fix: remember the opener in `openAttach()` (the toolbar 📎 in the iframe is reached by `frame.contentWindow.focus()` + a `mmsa-new-note-focus-attach` message, or simply focus the iframe and let the Note page focus its own 📎) and restore it in `closeAttach()`.

**D5. (Bangla only) the way-back name stays English when the caller passes English.** Not a defect in the opener itself: `openNewNote` shows exactly the `backLabel` it is given. All real callers pass `t(...)`, which is translated; the suite's own first run flagged the name because the test passed an English one, and it now passes a Bangla one. Recorded so nobody chases it.

## MINOR

* **M1. Focus ring on the pressed ✏️/✓ toolbar button is weak (1.74:1).** `app/journey-map.html:467` — `html.new-mode .nn-tb:focus-visible { outline: 3px solid #2a5bb8 }` on the pressed state `#1F3A6E` (line 466). Smallest fix: `html.new-mode .nn-tb[aria-pressed="true"]:focus-visible { outline-color: #c9a24b; }`.
* **M2. Focus returns to the Study button, not the Notes button, after the window closes** when opened from Study ▸ Notes — the Notes item sits in a menu that has closed, so this is the correct part-142 D1 behaviour; the suite accepts it.

## Not a defect (measured and cleared)

* `▾ hide` text next to the Āyah/Hadith block switch (`note-ref-ui.js:26`) is `aria-hidden`, `tabindex=-1`; the real control is the switch just before it, which has a name (`Show <ref>`) and a ring.
* Parent-page text behind the full-screen window (Mastery Wheel title 2.4:1 etc.) is covered by the window and is not read by the reader; the suite measures only the window's own text. Those contrast findings belong to Quran Study (QR Lead), already reported in part 142.
* All controls on `notes.html`, `journey-map.html` and the Note page inside the window have a name (English and Bangla), are reachable by Tab, show a ring (one weak, M1), and meet 4.5:1 / 3:1 in the default look. 🗂 Folders and the ⋯ menu open with Enter and Space, close with Escape and return focus to their button.

## What was NOT measured

* The night look: the stub has no night look switch on these pages in this run, so contrast is the default look only.
* A real 6-deep folder path and a real long Hadith (stub data has neither); the long title/unit label and the Āyah 2:255 block were used.
* The Hadith-page 📝 route (`hadith-browser.js:742`) was not driven separately; it uses the same `openNewNote`, so D1–D4 apply to it.
* Screen-reader speech itself; names are computed from the DOM.

Screenshots (looked at): `tools/i18n-verify/out/note-window-a11y/` (git-ignored; e.g. `qr-note-api-390-bn.png` shows the full-screen Note window in Bangla with the long title, toolbar ← 🗂 📎 🔍 ✓ ⋯, and the Āyah block, all text legible).
