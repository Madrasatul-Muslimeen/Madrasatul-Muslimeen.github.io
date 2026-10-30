# Audit part 140 — the 🧰 Zab bar at 150% and 200% text (report only)

PCF MSA J29, issue #1354. Follows part 138 A2 (`2026-10-30-audit-part138-dua-study-large-text.md`) and part 133 (the bar, corner and spacer sized in rem).
No file under `app/` was changed. The measurement is the new suite `tools/i18n-verify/zab-large-text-browser.mjs`.

## What was measured

Pages: the 23 pages of `large-text-shared-pages-browser.mjs` plus `taglines`, `hadith-study`, `dua-study` (and `notes`, `journey-map`, already among the 23): 25 pages in all. Widths 360, 390, 768, 1024, 1440 (`index.html` is measured at 360–1024 only where a bar or corner is shown, 6 of its 10 combinations); en and bn; root font 100%, 150%, 200%; the part-126 real-length seed (read out of the sibling suite's source so the two cannot drift).

Per combination the suite records:

- (a) the bar's / corner's size and whether it grew with the text (rem ratio);
- (b) every visible control or text block it overlaps at scroll 0 (INFO, cosmetic);
- (c) at the page's END, any control still under the bar / corner, which is the same as asking whether `#zabSpacer` is at least as tall as the bar (FAIL);
- (d) the reach pass, any control `elementFromPoint` never returns at any scroll stop (FAIL).

## Results

Every run was in the foreground, in five chunks of pages (output rows are in `tools/i18n-verify/out/zab-large-text/rows-*.json`, not committed).

**(a) The bar and corner grow with the text everywhere.** On every page and combination the bar is 2.75 rem tall (44 / 66 / 88 px at 100 / 150 / 200%) and the corner is 3 rem square (48 / 72 / 96 px). The spacer is 2.75 rem at ≥ 768 and 4.25 rem on a phone (68 / 102 / 136 px). Nothing is left at fixed px.

**(c) No defect.** At the end of every page, in every combination (about 700 page/width/language/size combinations that show a bar or corner), no control is under the bar or corner. The spacer is never shorter than the bar (largest shortfall measured: 0 px). `#zabSpacer` and `scroll-padding-bottom: 4.75rem` do their job at 150% and 200%.

**(d) No defect, once the check was corrected.** The first sweep reported `catalogue.html`'s right-hand `▼` buttons (`button.small`) as never reachable at 200% on 360 and 390 phones (3 combinations). It was the check, not the page: the buttons sit at the right edge, exactly where the 96 px corner is, and the half-screen scroll stops only ever caught them under it. Brought to the middle of the screen (what a finger scroll or Tab does) the corner is not over them and `elementFromPoint` returns each one. The reach pass now gives a control the coarse stops missed one more try at centre / start / end; a control under the bar at every position still fails (proved by the mutation below). After that: 0 unreachable controls on all 25 pages.

(An earlier version also flagged wrapped inline links in `about.html` because the centre of a wrapped link's bounding box lies on another line; the pass now tests the centre of each line box. The sibling suite `large-text-shared-pages-browser.mjs` uses the bounding-box centre and was not changed.)

**(b) Cosmetic only: the bar or corner does cover things on the first screen, and it grows with the text.** Covered items at scroll 0, summed over the 10 width/language combinations of a page (a text block counts once):

| page | 100% | 150% | 200% | note |
|---|---|---|---|---|
| accept-invite | 0 | 0 | 0 | |
| import-notes, dawah, deen-study, arabic-study, admin-self-check, index | 0 | 0–11 | 0–31 | nothing at 100%; at 200% the bar / corner sits over a text line or control on 4–10 combinations |
| onboarding | 0 | 11 | 12 | 8 of 10 combinations at 150 and 200% |
| classes, course-offers, curriculum, backup | 0–25 | small | 5–6 per bar width | |
| monitor | 31 | 54 | 30 | covers something on 10 of 10 |
| homework | 25 | 19 | 32 | 10 of 10 |
| people | 15 | 20 | 42 | 10 of 10 |
| records | 60 | 18 | 28 | 10 of 10 |
| catalogue | 37 | 60 | 47 | the most |
| about, bookmarks, hadith-collections, notes, journey-map, taglines | 18–60 | 20–33 | 13–38 | |
| hadith-study | 32 | 33 | 26 | 10 of 10 |
| dua-study | 37 | 31 | 29 | 10 of 10 |

Most of these are text blocks (a heading or paragraph that is half under the bar at the screen's foot), which is what part 138's A2 saw on Dua Study. At ≥ 768 the cover is a bar of 88 px at 200%, 8.6% of a 1024 px-tall screen and 9.8% of a 900 px one; on a phone the corner is 96 × 96 px and covers a corner of the first screen. At 100% the same happens (about 40 items on several pages), so 200% is not worse in kind. All of it clears by scrolling a little.

## Per page: defect or cosmetic

No page has a (c) or (d) defect. Every page that shows a bar or corner has (b) cosmetic findings at some size except `accept-invite` (none at any size), and `import-notes`, `deen-study`, `arabic-study`, `admin-self-check`, `index`, `dawah` and `onboarding`, which have none at 100% and a few at 150/200%.

## Proposed fix

None needed for (c)/(d): nothing can be left unreachable, and `zab-bar.js` need not change. If the Owner wants (b) reduced, the smallest word-only idea is for `zab-bar.js` (QR-pinned, the Architect's change with a change notice) to hide the bar at the foot of the first screen while the page has not been scrolled (a quiet slide-up on first scroll) or to let the bar's button alone stay (not the full-width strip) at ≥ 150% text; neither is recommended without a look, because the fixed bar is the same by design at 100%.

## The suite

`node tools/i18n-verify/zab-large-text-browser.mjs [--pages= --widths= --langs= --sizes= --list --shots --mutate=nospace]`.

- Prints (a)/(b) as INFO (one line per page; `--list` prints every combination) and FAILS on (c) and (d).
- Positive control (3 checks): the bar is on screen at 768; a button pinned to the document's last 44 px is found under the bar at 200%; the same page without it is clean.
- `--mutate=nospace` (spacer `display:none`, no scroll-padding, no page bottom padding, and a last-in-flow control): FAILS (10 passed, 5 failed on people and dua-study at 360 and 768, 200%; the failure text names the last control under the bar/corner and the unreachable `‹ Previous` / `Next ›`). Run on the real pages alone (spacer hidden only) the mutation did not fail, because most pages keep room of their own below the last control; that is why the mutation adds a last control: it is the case the spacer exists for.
- Results (unmutated): chunk a 353/0, b 423/0, c 466/3 (the three `catalogue` (d) findings above, before the reach correction), d 493/0, catalogue re-run 73/0 after the correction. `stub-parity.mjs`: 4/0.

## Screenshots at 200% (looked at)

- **Dua Study, 768, en:** the top of the page is large and calm: Home pill, title, the signed-in line, the Person select, the dark "Dua groups" card, the heading, the note, Previous / Next, and the first dua's Arabic card. The navy 88 px bar with "🧰 Zab" cuts across the first dua card at the screen's foot: the Arabic line is cut in half under it. Nothing needed is hidden; scrolling clears it.
- **Notes, 390, bn:** the 96 px round 🧰 corner sits at the bottom right over the lower right of the cream "which topic the notes are about" card, hiding the end of the title "(morning)" (the title is half under it) and part of the card's border. The page is not wider than the screen.
- **People, 1440, en:** the top of the page is clear; the 88 px bar covers the foot of the screen at the second table row, where "Archive" under the second person's Edit is cut by it. Zab button stays small at the bar's left. The table is not wider than the screen.
- **Hadith Study, 1024, bn:** the top of the page shows the dark Hadith menu card (book list, topics, encyclopedia, search and the language select), then the page heading and an italic note; the bar, with "জ়াব", covers the last line of the note. Nothing is unreachable.

## Not done

- Landscape phones (a short viewport, e.g. 740 × 360) and a bar-plus-open-panel state were not measured: the issue asked for the five widths with normal heights.
- The sibling suite `large-text-shared-pages-browser.mjs` was not changed (its reach pass has the same wrapped-link and stop-grid weakness; the Architect may want to port the correction).
