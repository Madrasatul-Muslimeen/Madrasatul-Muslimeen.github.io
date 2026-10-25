# Audit part 95 — the way-back law across every link out of the 23 shared pages (PCF MSA J29)

Issue #1188. Suite: `tools/i18n-verify/shared-pages-way-back-audit-browser.mjs`. No app code was changed.

## What the suite does

For each of the 23 pages (the keyboard audit's `PAGES` and `REAL_SEED`, copied), at 1440x900 and 390x844 in English, and in Bangla for the
5 pages with the most links: collect every visible same-origin `<a href>` out of the page, plus every button whose click navigates the
main frame (found by clicking and watching the URL; 60 buttons per page at most). For each, put it mid-screen (opening the `<details>` it is
in), note `scrollY` and the open `<details>`, click it, and on the destination look for a visible ← Back that nothing is painted over
(checked with `elementFromPoint`, after the chip's 1.5 s settle). Pressing it must land on the source path and query (the `navBack=1` /
`back=1` marker itself is ignored), `scrollY` within 80 px, and the same `<details>` open.

Listed, never failed: the main menu's links (`.nav-cat`, `.nav-link`), `mailto:` / other-origin / `target=_blank` links, sign-out. A page's own
"Go back" / "← Back" link is a way back, not a way out, and is not audited.

## Result

| Page | Links out found | OK | NO BACK | WRONG PLACE | Listed (menu / external) |
|---|---|---|---|---|---|
| Classes | 0 | 0 | 0 | 0 | 30 / 0 |
| Course offers | 0 | 0 | 0 | 0 | 30 / 0 |
| Curriculum | 0 | 0 | 0 | 0 | 30 / 1 |
| Backup | 0 | 0 | 0 | 0 | 30 / 0 |
| Import notes | 0 | 0 | 0 | 0 | 30 / 0 |
| Dawah | 0 | 0 | 0 | 0 | 30 / 0 |
| Onboarding | 1 | 0 | **1** | 0 | 1 / 0 |
| Accept invite | 1 | 0 | **1** | 0 | 1 / 0 |
| Monitor | 0 | 0 | 0 | 0 | 30 / 0 |
| Homework | 0 | 0 | 0 | 0 | 30 / 0 |
| People | 0 | 0 | 0 | 0 | 30 / 0 |
| Records | 0 | 0 | 0 | 0 | 30 / 0 |
| Catalogue | 0 | 0 | 0 | 0 | 30 / 0 |
| About | 0 (+2 controls, see below) | 1 | 0 | **1** | 30 / 2 |
| Bookmarks | 2 (the Open link and the Open button inside it) | 0 | **2** | 0 | 30 / 0 |
| Hadith collections | 0 | 0 | 0 | 0 | 4 / 0 |
| Landing (the Quran Study page) | 0 | 0 | 0 | 0 | 29 / 0 |
| Notes | 0 | 0 | 0 | 0 | 30 / 0 |
| Journey map | 0 (its "Go back" link is a back link, not audited) | 0 | 0 | 0 | 30 / 0 |
| Deen study | 0 | 0 | 0 | 0 | 30 / 0 |
| Arabic study | 0 | 0 | 0 | 0 | 30 / 0 |
| Self-check | 0 | 0 | 0 | 0 | 1 / 0 |
| Taglines | 0 | 0 | 0 | 0 | 30 / 0 |

(Per page at 1440; the 390 run is identical except the menu count is one lower. Counts per page are per viewport, so the suite's own totals
are double these.) Bangla passes (Onboarding, Accept invite, Bookmarks, Classes, Course offers — the five with the most links, ties broken
by page order) gave the same results as English.

**Totals (full run, 2 viewports, English + Bangla): 20 checked: 2 OK, 16 NO BACK, 2 WRONG PLACE; 1,314 menu links + 6 external listed.**
Of those, the only OK and WRONG PLACE are the two positive controls on About (below); every page-owned link out failed NO BACK.

The finding that matters: **on these pages in the harness's seeded state there is almost nothing to click except the main menu.** Most
pages have no in-page link to another page, so the sweep's coverage is the menu (listed) plus six real links. A state with more data
(a class with students, a record with a Qur'an reference, a Monitor row) may show more; this suite does not seed that.

## Positive controls (About only) and the mutations

About has no link of its own, so the suite adds two controls: a main-menu link to Catalogue (it carries `navBack=1` and must show ← Back),
clicked once with the source at the top and once with the source scrolled 500 px. They are counted in About's row as OK / WRONG PLACE.

- **Unmutated:** top → **OK**; scrolled 500 px → **WRONG PLACE** (`scrollY 0, was 500`) at both viewports.
  **That is a real finding on the shared ← Back, not a test artefact:** `mountNavBack()` makes ← Back a plain link to the referrer, so
  the source page reloads at the top. The browser does not restore scroll on a link navigation.
- `--mutate=noback` (strip `back=1` / `navBack=1` from every link on about.html before clicking): **4 NO BACK, 0 OK** (baseline 0 NO BACK). **FAILS, as required.**
- `--mutate=lose-scroll` (Back rewritten to `location.href = <source path>`): **2 WRONG PLACE** (scroll 0, was 500), 2 OK. **FAILS** — but note
  it is identical to the unmutated run, because the real ← Back already loses the scroll; this mutation alone cannot separate "broken" from "as built".
- `--mutate=history-back` (added: Back rewritten to `history.back()`, which the browser does restore): at 1440 both controls **OK**
  (scroll restored); at 390 the scrolled control still fails (`scrollY 11, was 500`). So the scroll check can pass and can fail.

`stub-parity.mjs`: 4 passed, 0 failed.

## Failures, smallest fix, owner

| # | Finding | Smallest fix | Whose file |
|---|---|---|---|
| 1 | **The shared ← Back loses the scroll** (and any open pop-up): it is a plain link to the referrer. Affects every menu-opened page and every `back=1` chip. Control: About scrolled 500 → Catalogue → ← Back lands at `scrollY 0`. | `app/js/bookmark-nav.js:186` and `:200` (`mountContinueBack`, `mountNavBack`): when the referrer is the same origin and `history.length > 1`, call `history.back()` instead of following `href` (this restores scroll in a real browser, as `--mutate=history-back` shows at 1440); keep the `href` as the fallback. Pop-up state needs the source page to restore it itself. | Shared (the way-back law; `bookmark-nav.js`) |
| 2 | **Onboarding and Accept invite: "Open the app" has no back marker**, so the destination shows no ← Back that is visible (its Back buttons are 0 px wide). | `app/onboarding.html:86` and `:249`, `app/accept-invite.html:48`: `href="index.html"` → `href="index.html?navBack=1"`; then the destination (`index.html`, the Quran Study page) must answer `navBack=1`, which is the QR Lead's page. | Shared for the links; destination is QR Lead (`app/quranrevival.html`) |
| 3 | **Bookmarks → Open (link and button): the "← Back to Bookmarks" chip is on the page but covered** — at 1440 and 390, the Quran page's open note window (`.rnp-frame`, z-index 960) is what `elementFromPoint` finds at the chip's centre, at (493, 184) on a 1440 screen. `.bm-back-row` itself is `z-index: 12000` (`app/css/shell.css:292`), so the cause is where `lift()` puts it, not stacking order; not fully diagnosed here. | Look at `lift()` in `app/js/bookmark-nav.js:~229-260` (the "chip steps aside for a sheet" branch placed the chip inside the note window, and the settle timer may leave it `visibility:hidden`). | QR Lead for the page / shared for `bookmark-nav.js` |
| 4 | Journey map's own "Go back" link goes to `quranrevival.html` with no marker. Not audited as a way out (it is a back link), listed here so it is not lost. | Add `back=1` / `navBack=1`; the destination must show ← Back. | Shared (`app/journey-map.html`) |

## Not reached / limits

- Pages with no in-page link in the seeded state (20 of 23) were checked only for their menu (listed) and navigating buttons (probed: none left the page).
  A richer seed would find more; that is a follow-up, not done here.
- Buttons are probed by clicking, capped at 60 per page; a page with more (the Quran Study page has about 200) may hide one.
- The Bangla pass uses the five pages with the most links at 1440; ties are broken by page order.
