# Siyagah's note pane in MMSA: the numbered list

Written 5 Oct 2026 by the MMSA Architect. The Owner asked:
"Make all the panes resizeable and add all functions of the notepane of Siyagah in the notepane",
then "Give me a full list with numbers, so i can tell which one not to do."

**How to use it.** The Owner strikes out by number ("don't do 23, 31"). Everything not struck out is built
in the order below. **Part A is done.** **Part B is built (v09.83–v09.86).** **Part C waits for the Owner's
answer**, because each item needs new stored data, a Firebase change or an outside service. Each Part C
line names that need.

Source: Siyagah `index.html` v04.86 (`Siyagah/siyagah.github.io`, readable from the sandbox by
`git clone --depth 1 https://github.com/Siyagah/siyagah.github.io`), compared with MMSA's
`app/js/note-window.js` (the shared Note pane and windows), `app/journey-map.html` and `app/notes.html`.

## Part A. Done (5 Oct 2026; v09.82)

1. **Resizable panels** in Mapping My Journey: drag the line between tree, list and Note (or list and Note in Timeline/Path); arrow keys; double-click to reset; remembered per device.
2. **Resizable pinned panel** in a Note window.
3. **H4** heading.
4. **¶ Normal text** button.
5. **Raise or lower a heading** (▲H ▼H, and Ctrl+[ / Ctrl+]).
6. **A+ / A−**: selected text bigger or smaller.
7. **✓ Mark done**: a paragraph greyed and struck through.
8. **▢ Box** around a paragraph.
9. **─ Divider line**.
10. **Justify** (both edges straight).
11. **↕ Spacing**: line spacing, and space after a paragraph.
12. **Enter above the first heading or list** (an empty line appears above it).
13. **🔍 Find while editing**.

## Part B. Done (5–6 Oct 2026; v09.83 items 14–20, v09.85 items 21–27, v09.86 items 28–33)

14. **⋯ Rename**: change a Note's title without opening the editor.
15. **⋯ Make a copy**: a duplicate Note, filed in the same folders.
16. **Right-click or long-press the title** to start editing.
17. **📋 Copy section**: right-click or long-press a heading to copy it and what sits under it (with or without the heading).
18. **Tag chips you can tap**: shows every Note with that tag.
19. **Delete asks "Are you sure?"** first in Mapping My Journey (it already goes to Trash, so nothing is lost).
20. **Esc ends editing** (the same as ✓ Done).
21. **⇅ Fold or unfold all sections while editing**.
22. **Preview of folded sections**: a folded heading shows its first line.
23. **A Multi button on the Note's bar**: open this Note in its own window in one tap.
24. **Single ⇄ Multi switch in a window**: put a window back into the pane.
25. **✕ Close all windows** (a chip when two or more are open), plus Ctrl+Shift+X; Ctrl+Shift+P pops the current Note out.
26. **Details line remembered** open or closed, per device.
27. **Contents as a side panel** in a wide window (a Note with three or more headings).
28. **The toolbar in labelled groups on a phone** (Aa Text · H Headings · ≡ Paragraph · + Insert · ↺ Undo) instead of one long sideways row.
29. **A "no colour" swatch** to take a colour or highlight off.
30. **Paste a web address**: choose "link" or "plain text".
31. **Smart paste**: when pasted text carries formatting, choose to keep it or paste plain.
32. **@ to link another Note** while typing (uses the existing Links).
33. **Table sums and sorting**: Σ total of a column; sort by a column.

## Part C. Answered 6 Oct 2026 (decision 72): build 34, 36, 37, 38, 39, 40, 43, 44, 45; not 41, 42; 35 only if free, else the cost first

34. **Tabs in windows**: group Notes as tabs, ＋ Add Tab, a short name and colour per tab, drag a tab out to sit beside. *Needs: where tab groups are kept, on this device only (no Firebase change) or across devices (a Rules change).*
35. **Pictures in Notes**: insert an image. *Needs: Firebase Storage (a storage plan and new Rules).*
36. **Templates**: start a Note from a saved template. *Needs: a new collection (Rules).*
37. **Quick phrases**: insert saved phrases. *Needs: a new collection (Rules), or this device only.*
38. **Annotations**: numbered comments on marked text. *Needs: new stored data in the Note (to be checked against the Rules).*
39. **Heading status badges** (Done / Ongoing / Under process / Next) on each heading. *Needs: stored on the Note (to be checked against the Rules).*
40. **Heading styles**: a border and background colour per heading level. *Needs: per device, or across devices (Rules).*
41. **Note Types** (Idea, Task, Lesson…) as chips on a Note. *Needs: a new field (Rules).*
42. **Draft versions side by side** (Draft 1 / Draft 2 of one Note). *Needs: a new data model. MMSA already keeps every saved version under 🕘 Versions.*
43. **Link preview cards** (a website's title and picture). *Needs: fetching other websites from the app.*
44. **Full spreadsheet** in a table (formulas, filter, merge, number formats). *A large build. Item 33 is the small part.*
45. **Folded sections the same on every device**. *Needs: stored on the Note (Rules). Today it is per device.*

## Siyagah-only, not planned unless the Owner asks

Journal; MyDatabase / structured fields; Calendar; Reminders; Murāja'ah review queue; Practice tracking;
Favourite categories; the Primary inbox; PIN lock; Google Drive sync and backup files.
