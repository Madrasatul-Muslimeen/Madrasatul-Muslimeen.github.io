# Audit part 88 — keyboard, focus ring and Esc on the 23 shared pages (PCF MSA J29, issue #1166)

Suite: `tools/i18n-verify/shared-pages-keyboard-audit-browser.mjs` (real `page.keyboard` presses; 1440x900 and 390x844; English only; the `PAGES` list and `REAL_SEED` copied from the part 84–86 suite, which is untouched). No app code changed.

**Totals: 230 checks, 226 pass, 4 fail** (23 pages x 2 widths x 5 claims). Both widths give the same result on every page.

## Per page

Tab = Tab reaches every control and focus is never lost (Shift+Tab returns). Ring = visible focus ring, 3:1. Esc = every pop-up closes on Esc and focus returns. Activation = Enter/Space on `role=button` non-buttons.

| Page | Tab | Ring | Esc | Activation | Found |
|---|---|---|---|---|---|
| Classes | pass | pass | pass (4 menus) | n/a (none on page) | |
| Course offers | pass | pass | pass | n/a | |
| Curriculum | pass | pass | pass | n/a | |
| Backup | pass | pass | pass | n/a | |
| Import notes | pass | pass | pass | n/a | |
| Dawah | pass | pass | pass | n/a | |
| Onboarding | pass | pass | pass | n/a | |
| Accept invite | pass | pass | pass | n/a | |
| Monitor | pass | pass | pass | n/a | |
| Homework | pass | pass | pass | n/a | |
| People | pass | pass | pass | n/a | |
| Records | pass | pass | pass | n/a | |
| Catalogue | pass | pass | pass | n/a | |
| About | pass | pass | pass | n/a | |
| Bookmarks | pass | pass | pass | n/a | |
| Hadith collections | pass | pass | **FAIL** (both widths) | n/a | Home menu does not close on Esc |
| Landing (`index.html`) | pass | pass | **FAIL** (both widths) | n/a | Study menu stays open on Esc; Read dialog closes but focus is not returned |
| Notes | pass | pass | pass | n/a | |
| Journey map | pass | pass | pass | n/a | |
| Deen study | pass | pass | pass | n/a | |
| Arabic study | pass | pass | pass | n/a | |
| Self-check | pass | pass | pass | n/a | |
| Taglines | pass | pass | pass | n/a | |

No page has a real-world `role="button"` that is not a `<button>`, so claim 5 passes vacuously on all 23; its only proof is the mutation below (a probe `div[role=button]` with no key handler).

## Findings for the Architect (app wrong, left red)

1. **Hadith collections — Home menu ignores Esc.** `app/hadith-collections.html` does not load `app/js/nav.js`, whose document-level handler (`nav.js:404`, `if (e.key === "Escape") … .nav-cat[open] … open = false`) closes the menus on every other page. Smallest fix: give the page the same Escape handler (one `keydown` listener, or import the shared one). File belongs to the Hadith Lead.
2. **Landing — Study menu stays open on Esc.** `app/quranrevival.html:11669` toggles `#tabStudyBtn` / `#studyPillarMenu` on click; no Escape handler closes it (`aria-expanded` stays `true`). Smallest fix: on `keydown` Escape while open, run the same close as line 11676 and `tabStudyBtn.focus()`.
3. **Landing — Read dialog (`#readContentsBtn`, `aria-haspopup="dialog"`, line 5836 / handler 13186) closes on Esc but focus does not return to the button.** Smallest fix: remember the opener in `openReadContents` and `.focus()` it on close.
   (2 and 3 are in the QR Lead's frozen file, so they go to the PCA as change requests.)

## Notes on what was checked and decided

- Focus ring: an app that leaves the browser default (`outline-style: auto`) draws a two-tone ring (dark outer, white inner) in Chromium. The check therefore accepts the ring when either tone has 3:1 against the background behind the control (the parent's, since an outline with offset >= 0 is drawn outside the box). A first version measured only the dark tone against the navy Zab bar and reported 1.71:1 — **check wrong, corrected**.
- A date input has inner stops (month / day / year); repeated stops on one element are not counted as a trap, and Shift+Tab steps through them.
- Esc is owed only to pop-ups: `<summary>` menus, `aria-haspopup` controls, and a control that brings up something floating (fixed/absolute or dialog/menu role). Inline `aria-expanded` accordions are disclosures, not pop-ups (first version flagged them — **check wrong, corrected**).
- Focus-visible styling in the app is almost entirely the browser default; only `.dua-word` and `.sheet-scroll` set their own ring.

## Mutations (each must FAIL)

| `--mutate=` | What it does | Result |
|---|---|---|
| `outline` | `outline:none; box-shadow:none` on everything | full run: 180 pass, **50 fail** (46 ring checks, plus the 4 standing Esc failures) |
| `tabindex` | `tabindex=-1` on the first visible button (Classes) | **4 fail** (Tab reaches every control, no focus lost; both widths) |
| `trap` | the third Tab stop is collapsed to 0x0 | **2 fail** (no focus trap; both widths) |
| `esc` | every Escape keydown stopped in the capture phase | **2 fail** (Esc closes every pop-up; both widths; 4 menus still open) |
| `role` | a `div[role=button]` with a click handler and no key handler | **2 fail** (Enter and Space do nothing; both widths) |

tabindex / trap / esc / role were run on `--page=classes.html`.

## Other checks

- `stub-parity.mjs`: 4 passed, 0 failed (unchanged; no app or harness file touched).
- `bangla-sweep-other-pages-browser.mjs`: 224 passed, 0 failed (unchanged).
