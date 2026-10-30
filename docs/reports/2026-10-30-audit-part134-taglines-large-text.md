# Audit part 134: the Taglines admin page with the phone's text made larger

Issue #1331 (PCF MSA J29), audit part 131 finding 19. Page: `app/taglines.html` (its own CSS and script only). Nothing stored, no Rules changed, version not bumped.

## Why it broke

1. **Save overlapped fields.** `.saveBar` was `position: sticky; bottom: 0`, so it lay over whatever was at the foot of the screen, and at larger text over the last fields (360 bn 150%: motion select under Save 103x46).
2. **Fields behind a sideways scroll.** The "lines" table is 940px wide at 100% inside an `overflow-x:auto` box, so its inputs, selects and "Yes" buttons sat past the box edge (the reach pass never finds them).
3. **Grid wider than its card.** `.grid` used `minmax(9rem,1fr)` and the "Line" cell `span 2`: in a one-column card the span made a second, squeezed column ("Opens" select 29px wide at 150%, 4px in Bangla) and, at 200%, offscreen controls and a sideways page scroll.
4. **Cut at 100%.** The row "Opens" selects (`Inside the app`, needs 90px, has 79px, five rows) and the preview line cut by its ellipsis had no full-text title.

## Fixes (all in `app/taglines.html`)

- `.saveBar` now sits in the flow at the end of the form (`flex-wrap: wrap`); the body's existing bottom padding leaves room for the Zab bar.
- `.grid`: `minmax(min(9rem,100%),1fr)`, `min-width:0` on its cells, `container-type:inline-size`, and the "Line" cell is `.span2` that falls back to one column in a container narrower than 18.5rem.
- `js/table-stack.js` (part 132) `keepTablesFitting()`: a table wider than its box is shown as labelled stacked rows; extra rules make each cell's field fit its share of the line.
- `js/select-title.js` `keepSelectTitles()`: a select's chosen value is its title (reused from part 132).
- The preview line gets its whole text as its title after `attachTaglineScroll` (which clears it).

## Measurements: 100% rects, before / after

Real-length text seeded (a 120-character English and a 130-character Bangla line, a linked line, a retired line); every element of the admin area compared at 360, 390, 768, 1024, 1440, en and bn.

- **1024 and 1440 (en, bn): identical** except the Save bar, its button and its text move (from the foot of the screen to the end of the form). That is finding 19 itself.
- **360, 390, 768:** the lines table (940px wide before) now stacks and fits the screen (328 / 358 / 736px). At 768 the table did not fit at 100% either (940 > 736), so it stacked there too. Changed controls: the lines table's cells and the five "Opens" selects (no longer cut); two visually hidden helper spans moved about 1px. Nothing else in the page moved at 100% except the Save bar.

## Suite: `tools/i18n-verify/large-text-shared-pages-browser.mjs`

Taglines now runs at 360, 390, 768, 1024, 1440, en and bn, at 100/150/200%, with the real-length seed, and has four new absolute checks per case: Save overlaps no field; no cut control or line; nothing past the screen edge; every control reachable with the way-back pill showing (`?navBack=1`). `taglines` joined `FIXED_KINDS` (cut, offscreen, sideways) and `OLD_CSS`.

Results on the fixed page: **238 passed, 0 failed.**

`--mutate=old` puts the old CSS back (sticky bar, old grid, no stacking, no select titles): **61 failures** on taglines, every one of the four new checks failing at several widths (Save overlap, cut, past the edge, reach), plus the FIXED_KINDS checks. The mutation also still fails about.html (5) and records.html (11), so `--mutate=old` works for the other pages.

The Zab bar's own overlaps (finding 1) still show as INFO at 768 and are excluded from these checks.

## Other suites

- `behaviour.mjs` alone: 972 passed, 0 failed
- `stub-parity.mjs`: 4 passed, 0 failed
- `floating-overlays-reach-browser.mjs`: 360 passed, 0 failed
- `shared-pages-bangla-layout-audit-browser.mjs`: 460 passed, 0 failed (taglines 0 at all widths)

## Screenshots looked at

360 bn 150%, 768 bn 200%, 1440 en 100%, before and after: before, the Save bar covered the motion select and the number field; after, the lines are labelled stacked rows, every field is on screen, and Save comes after "Add a line".

## Not done

The "small" INFO (two 13px checkboxes) and the Zab bar overlaps (finding 1) are not this round's.
