# Audit part 149: the night look on Bookmarks, Records and Mapping My Journey (issue #1398)

Suite: `tools/i18n-verify/night-shared-tools-browser.mjs` (modelled on part 146's `night-hadith-dua-browser.mjs`; same harness, same `mm_card_look` switch, same `window.__A11Y` helper, and the real-length seed read out of `large-text-shared-pages-browser.mjs`: 12 long folder names, 40 long bookmark names, 30 long notes).

Views: bookmarks (opens, home menu, account card, + New bookmark, + New folder); records (opens, home menu, account card); journey-map (opens with folders expanded, home menu, account card, Timeline, Path, a note open in the pane, the ⋯ page menu, Trash, Favourites). Widths 360, 390, 768, 1024, 1440; en and bn; 100% and 200% text.

Checks: contrast (4.5:1, 3:1 large), a real Tab walk (ring >= 3:1), no near-white panel inside a dark box, no show/hide arrow (J109; menus keep ▾, folder trees keep ▸), and the day look unchanged from a baseline recorded on unmodified `main` (`night-shared-tools-day-baseline.json`, `--record-day`).

Note: with no `mm_card_look` key the app wears the NIGHT look (the head script treats anything but "light" as night). So "day look" cannot be compared with "no key"; it is compared with the recorded baseline.

## Positive controls
- Night attribute on; injected grey-on-grey reported; injected white panel reported; injected ▸ summary reported while a ▾ menu button is not; a button with a ring passes and one without is reported.
- Each page's night look differs from its day look (bookmarks, records, journey-map all do; a page with none would be recorded as a finding "no night look").
- Each run prints "view checks run: N". An unknown page/width/view runs 0 and exits 1.

## Findings and decisions
| # | Finding (measured) | Decision |
|---|---|---|
| 1 | Path view `[data-path-branch-toggle]` ▾/▶ and Timeline `[data-note-toggle]` ▾ flagged as arrows | **Stale check.** The first expands a folder branch (a tree, keeps its arrow); the second is a note card's "More" actions button (a menu opener, keeps ▾). Check updated with the reason. |
| 2 | Trash view could not be opened | **Stale check.** Trash/Favourites live in the ⋯ page menu; the views now open it first. |
| 3 | journey-map ⋯ page menu: Favourites, Archived and Trash buttons painted near-white (158x40) on the navy sheet | **Real defect.** Fixed in night-only CSS in `journey-map.html`'s own `<style>`. |
| 4 | journey-map ⋯ page menu: "Import Notes…" link `#0000ee` on `#13192a`, 1.86:1 | **Real defect.** Same fix. |

No other finding: contrast, focus rings, day-panels and arrows are clean on every other page, view, width, language and size. No page has a missing night look. Bookmarks and Records needed no change; no shared CSS file was changed (the fix is page-local, so `card-look.css` pages are unaffected).

## Fix
`app/journey-map.html`, two night-only rules (day look identical, proven by the day baseline):
```
[data-card-look="night"] .page-menu-wrap .bar-palette button.secondary { background: var(--card-bg); border-color: var(--card-line); color: var(--card-text); }
[data-card-look="night"] .page-menu-wrap .bar-palette a.secondary { color: var(--card-text); }
```
Screenshots looked at: `journey-page-menu-360-en-100.png` and `journey-page-menu-768-bn-200.png` (menu entries now navy with light text, legible, nothing cut).

## Results (full sweep, run per page/width)
- records: 243 view checks, 319 passed, 0 failed
- bookmarks: 405 view checks, 521 passed, 0 failed
- journey-map: 360 (144 / 188 passed), 390 (153 / 197), 768, 1024, 1440 (144 / 188 each), all 0 failed

## Mutations (each must FAIL; run at 390 en 100%)
- `--mutate=contrast`: 3 failed
- `--mutate=focus`: 3 failed
- `--mutate=day`: 3 failed (the first version threw on Records, which has no dark box; it now injects its own dark box)
- `--mutate=arrow`: 6 failed
- `--mutate=daylook`: 3 failed
- `--mutate=menu-buttons` (night rule for the menu buttons taken out, one `ctx.route` on `/journey-map.html`): 1 failed (day-panel, the 3 buttons)
- `--mutate=menu-links`: 1 failed (contrast, "Import Notes…" 1.86:1)

## Not done
- Nothing deployed; `version.js`, CLAUDE.md, CHANGELOG, workflows and Rules untouched. The Owner/Architect allocates a version.
