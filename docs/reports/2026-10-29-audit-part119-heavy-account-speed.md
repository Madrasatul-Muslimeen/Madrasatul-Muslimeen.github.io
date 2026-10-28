# Audit part 119: loading speed with a heavy account (PCF MSA J29, issue #1274)

Builder run 2163 built the suite and the fix (PR #1275) but wrote no report. This report was
written by the Architect from the suite's own output, run on the branch merged with v12.104.

## The seed (`tools/i18n-verify/heavy-account-speed-browser.mjs`)

For the signed-in person p1: 600 notes (bodies of 300–1,500 characters, a third in Bangla, some with Arabic; 450
linked to an āyah or a hadith), 40 note folders (8 nested), 200 bookmarks in 15 bookmark folders, and 150 Continue
entries. Stub latency 150 ms. Phone: 390×844 on part 91's slowed line. Desktop: 1440×900 unthrottled. English and
Bangla. Per page: FCP, ready, Firestore reads and documents read, long tasks over 50 ms, scroll-to-frame over 20 steps,
and DOM nodes.

## Before → after (only Bookmarks changed)

| page / profile / lang | ready ms | reads / docs | longest task ms | nodes |
|---|---|---|---|---|
| Bookmarks phone en | 1978 → 1952 | 5 / 5 | 196 → 64 | 6,767 → 3,333 |
| Bookmarks phone bn | 2793 → 2824 | 5 / 5 | **269 → 138** | 6,767 → 3,333 |
| Bookmarks desktop en | 601 → 598 | 5 / 5 | 194 → 83 | 6,767 → 3,333 |
| Bookmarks desktop bn | 627 → 615 | 5 / 5 | **327 → 117** | 6,767 → 3,333 |
| Notes phone en / bn | 2992 / 3744 | 37 / 65 | 0 | 570 |
| Notes desktop en / bn | 778 / 825 | 37 / 65 | 0 | 570 |
| Journey map phone en / bn | 3994 / 4770 | 34 / **1,184** | 0 | 888 |
| Journey map desktop en / bn | 1537 / 1630 | 34 / 1,184 | 0 | 888 |
| quranrevival.html Notes pane (measure only) | opens in 63 ms | 0 note reads | | |

Scroll stays at 32–37 ms per step everywhere.

## The fix

`app/bookmarks.html`: every bookmark row and folder header carried a full "For" list (every person) and "Move" list
(every folder), which came to about 6,700 elements and a main-thread task of up to 327 ms each time the list was
drawn, in Bangla. Each list now holds only its current choice until the reader reaches for it (`pointerdown`,
`focusin`, `keydown`), when the full list is filled in, keeping the value, just before the picker opens.
`--mutate=eager-selects` restores the old way: 6 failed (the node count at all four cells, and the long task in Bangla).

## Checks the Architect updated in place

behaviour 44c and 50h, and audit-part40's bookmarks flow, read a row's options from script without reaching for the
list, so they saw one option. They now focus the list first, as a tap or Tab does. The reader's path is unchanged:
Playwright's own `selectOption` (which focuses) passed throughout (50i).

## Finding left for the next round

**Mapping My Journey reads 1,184 documents at open** for this account (every note, placement and source), in 34
reads. It is within the limits (ready 4.8 s on a slow phone in Bangla) but grows with every note. Candidate for
audit part 121: read the map one folder or one time slice at a time.

## Results (Architect, merged with v12.104)

heavy-account-speed 78/0 (`--mutate=eager-selects` 24/6); audit-part32 896/0; audit-part36 1184/0; audit-part38 503/0;
audit-part40 3562/0 (16 failed before the in-place update); journey-map-screen 47/0; bookmark-folder-edit 68/0;
bookmarks-page-new-assign 44/0; bookmark-remove 60/0; way-back on Bookmarks 16/0; keyboard on Bookmarks 22/0;
`behaviour.mjs` alone 971/0.
