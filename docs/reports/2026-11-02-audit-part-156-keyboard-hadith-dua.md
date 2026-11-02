# Audit part 156: a keyboard walk of Hadith Study, Hadith Collections and Dua Study (report only)

Issue #1422. Nothing under `app/` was changed. New suite: `tools/i18n-verify/hadith-dua-keyboard-browser.mjs`
(run from the repository root with `node serve.js` on 8080:
`node tools/i18n-verify/hadith-dua-keyboard-browser.mjs --page=dua|hcol|hstudy [--only=id] [--width=] [--lang=] [--scale=200] [--mutate=name] [--brief]`).

## What was walked

Run at 390 and 1024 (en and bn) and at 390 with 200% text: six runs per control.

| Page | Controls |
|---|---|
| `dua-study.html` | Dua groups pull-down; the six Dua card menu pop-ups (Meaning, Source, The whole narration, ✓ Check, Poster, Copy / share); the 🔖 button; an expander inside the narration pop-up; the Zab panel |
| `hadith-collections.html`, `hadith-study.html` (same browser, same results) | Hadith Books menu; Subjects menu; on the Dua tab the 🔖 button and an expander; the Zab panel |

Checks per control: (1) Tab reaches it; (2) Enter and Space open it, `aria-expanded` follows where it has one; (3) focus goes in;
(4) Tab walks every visible item in order and never a hidden one (first 10 items); (5) focus ring ≥ 3:1, day and night;
(6) Escape closes it and focus returns to the control; (7) Tab past the last item is not stuck and not on a hidden element;
(8) a whole-page Tab walk, each stop on screen and not covered.

Not present on these pages, so not walked: a bookmark **dialog** (the Dua 🔖 saves at once and shows a notice, so it is walked as a one-tap action);
a note **pane** (📝 My Notes is a link to `notes.html`); the 👥 assign picker and the "Subject" `<select>` pickers do not exist on the seeded Dua cards.
The Tenant / Person `<select>`s are native and were not walked. Encyclopedia / Topics / Search / Explore tabs were not walked (plain tab buttons).

## Counts (full runs, all six runs per page)

| Page | passed | failed | controls walked |
|---|---|---|---|
| dua | 490 | 68 | 60 |
| hcol | 234 | 30 | 30 |
| hstudy | 234 | 30 | 30 |

Per check (pass / fail): dua 1: 60/0, 2: 126/0, 3: 42/6, 4: 40/8, 5: 54/54, 6: 96/0, 7: 60/0, 8: 6/0.
hcol and hstudy each: 1: 30/0, 2: 72/0, 3: 12/6, 4: 18/0, 5: 24/24, 6: 36/0, 7: 30/0, 8: 6/0.
Pages raised no page errors in any run (9: all passing).

## Mutations (390, en, 100%; each fails the check it names)

| Mutation | Run on | Fails |
|---|---|---|
| no-reach (toggle tabindex -1) | hcol books-menu | (1) Tab reaches: 1 fail |
| no-open (Enter/Space swallowed) | hcol books-menu | (2) ×3, plus (3), (4), (6) as consequences: 8 fails |
| no-aria (`aria-expanded` forced false) | hcol books-menu | (2) aria-expanded: 1 fail |
| no-focus-in (focus blurred after open) | hcol books-menu | (3): 1 fail |
| no-walk (2nd item tabindex -1) | hcol books-menu | (4): 1 fail |
| hidden-item (zero-size focusable link added) | hcol books-menu | (4): 1 fail |
| no-ring (outlines removed) | hcol books-menu | (5) day and night: 2 fails |
| no-esc (Escape swallowed) | hcol books-menu | (6) ×2 |
| no-esc-return (focus dropped after Escape) | hcol books-menu | (6) return: 1 fail |
| trap (Tab held on the last item) | hcol books-menu | (7): 1 fail |
| offscreen (focusable button at top -300px) | hcol page walk | (8): 1 fail |
| covered (full-screen overlay) | hcol page walk | (8): 1 fail |

(The baseline's own night-ring fail on the same control appears in each of these runs and is not counted above.)

## Defects found

The Dua card pop-ups, both Hadith menus, the Dua groups pull-down, Enter/Space, Escape, Escape's focus return, reachability and the page-level walk are
all **good**. The defects:

1. **Night look: focus ring too faint everywhere on these pages (check 5).** Where: every ⋯/pull-down item, every pop-up item and ✕ Close, the 🔖
   button and the expanders, in the night look (the default). Now: no page style sets a focus ring, so the browser default dark ring
   (`rgb(16,16,16)`) is drawn on navy (`rgb(19,25,42)`): 1.09:1 (1.05:1 on the narration summary). Needed: a cream or gold 3px ring in the night look, as
   part 154 did for the Notes menus (`palette-keys.js`). Day look passes. Seen on: dua groups-pull not flagged (its items have a hover/focus tint) but
   card-meaning, card-check, card-narration, card-poster, card-share, card-source, bookmark, expander; Hadith Books menu, Subjects menu, Dua-tab 🔖 and
   expander on both Hadith pages. Fix touches: `app/css/card-look.css` (shared night look) or `app/css/hadith.css` (`.hadith-menu-btn`, `.hadith-row`,
   `.dua-ref`, `.hadith-card summary`), and `app/css/dua-study.css`. **Owner of the file: shared (`card-look.css`); Hadith Lead (`hadith.css`); Dua Lead (`dua-study.css`).**
2. **Zab panel: focus does not move into it when it opens (check 3), on all three pages, every width.** Now: Enter/Space on 🧰 / "Zab" opens the panel but focus
   stays on the button, so a keyboard reader must Tab through the rest of the page to reach it (it sits at the end of the page). Escape does close it and
   focus does return. Needed: focus moves to the panel's first control on open. Fix touches: `app/js/zab-bar.js` (`openPanel`). **Shared.**
3. **Dua card "Source" pop-up: Tab walks out of the dialog and the walk misses its own items (check 4, with ring failures in check 5).** Now: the pop-up is
   `aria-modal="true"` but has no focus containment; after the 8th item Tab continues to the 🧰 corner and the Home menu instead of the pop-up's remaining
   items (the "+17 more" expander and the rows after it). The 🧰 and Home then show no ring on navy (1.71:1 / none). Needed: Tab and Shift+Tab wrap inside the
   open pop-up, or the rest of the page is made `inert` while it is open. Same applies to every Dua pop-up (the others have fewer items and happen to fit
   at 100%). Fix touches: `app/js/dua-study.js` (`openPop`). **Dua Lead.**
4. **Dua card "Copy / share" pop-up at 200% text (check 4).** Now: the pop-up's 7th item (Copy) is not reached; Tab leaves the dialog after the poster
   picture (same cause as 3, here it surfaces at 200% because the Copy button then sits below the fold of the pop-up's own scroll). Fix as 3. **Dua Lead.**

Nothing else failed: no control is unreachable, no focus lands on a hidden element, no Tab stop is off screen or under the Zab bar (check 8: 6/6 per page).

## Fix order suggested

Defect 1 first (one night-look rule covers about 55 of the 68 Dua fails and all 24 Hadith ones), then 2 (shared, three pages), then 3 and 4 together.
