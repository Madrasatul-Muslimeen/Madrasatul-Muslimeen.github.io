# Audit part 87b — the User Manual's "Notes and Mapping My Journey" section checked claim by claim (PCF MSA J29, issue #1160)

Suite: `tools/i18n-verify/manual-claims-msa-browser.mjs --section=notes` (390x844 and 1440x900, English; the same suite as part 87).
Run: `node tools/i18n-verify/manual-claims-msa-browser.mjs --section=notes [--mutate=notes]`.
No app file was changed. Notes pinned by QuranRevival (`note-window.js`, the note pane, the Zab bar, "file this note") are reported, never changed.

| Entry | Claim | Result | Measured |
|---|---|---|---|
| Notes pane in the Read view | 📝 on the Read bar (phone: ⋯ More tools → 📝) opens the pane on the āyah | PASS | phone: 📝 hidden until ⋯ is pressed; opens `journey-map.html?embed=1&unit=ayah:2:256` |
| Notes pane in the Read view | Lists every Note linked to the āyah and has ✚ New note | PASS | 3 seeded Notes listed, button reads "✚ New note on 2:256" |
| Notes pane in the Read view | Full screen on a phone | PASS | pane box = viewport at 390 |
| **Notes pane in the Read view** | **"beside the reading on a computer"** | **Manual is wrong (PCF MSA J72)** | At 1440 the pane is a pop-up WINDOW at the home window's size (1384×651, 29px from the left), over the reading, not a column beside it. Check corrected to the app. Suggested sentence: *…as a pop-up window over the reading on a computer (move and resize it like any pop-up) and full screen on a phone or tablet.* |
| Notes pane in the Read view | Study ▾ → Notes opens it | PASS | check corrected: it first failed because the Āyah card left open by the Track steps covered the Study button (harness state, not a defect) |
| Notes pane in the Read view | ← Back to … closes it; ↗ Open in Mapping My Journey opens the full tray | PASS | bar reads "← Back to 2:256"; tray iframe shown |
| Notes pane in the Read view | 📝 Note on the Āyah card | covered elsewhere | `read-note-pane-browser.mjs` section 9 drives it |
| Track this āyah (Notes pane tab) | Tab holds Take an Approach, Record Your Progress, Know Your Status | PASS | three `[data-rnp-track]` buttons |
| Track this āyah (Notes pane tab) | An action opens it and "Back to Notes on …" brings you back | PASS | Record Your Progress closes the pane, pill reads "Back to Notes on 2:256", pressing it reopens the pane |

| Mapping My Journey | Three panels: side by side on a wide screen, one at a time on a phone | PASS | 1440: tree, list, Note left to right; 390: only the open Note shows |
| Mapping My Journey | Views Folders / Timeline / Path; Path shows every Note as a stop | PASS | all three views display; Path lists the 3 Notes |
| Mapping My Journey | The tab at the bottom of Quran Study opens it as a pop-up window | PASS | tray iframe holds `journey-map.html` |
| Mapping My Journey | Home ▾ → Mapping My Journey opens the full page | PASS on a page without the tray (About) | **Manual is imprecise (found in part 87):** on a page that mounts the tray (People, Quran Study…) it opens the pop-up window. Suggested: *Home ▾ → Mapping My Journey opens it (as a pop-up window on pages that have the Journey tab, as the full page elsewhere).* |
| Folders and sections | ⋯ on a folder offers all 12 listed actions; right-click opens the menu; "+ New section" is in the New folder box; New folder adds one | PASS | every action label present |
| Folders and sections | Drag a Note onto a folder files it there too (wide screen) | PASS at 1440 | placement to Beta written |
| Folders and sections | Long-press opens the menu | SKIP | touch long-press is not driven by this harness |
| The Note's ⋯ menu | Six groups in order, Mark = Pin/Favourite/Archive/Finalise, Delete last; phone: from the bottom, × or outside closes | PASS | |
| Writing and editing a Note | ✏️ Edit opens the editor; toolbar has the 17 named tools; ✓ Done saves a revision; a failed save says "Not saved yet — will try again" | PASS | revision written once; message text exact |

| Reading tools in a Note | 🔍 Find (box, match count), ⇅ open/close all headings, ☰ Contents, 🕘 Versions (list, open one to read), "Linked from" | PASS | on a phone the tool buttons sit behind ⋯, as the Manual says; Find counted "1" for a unique phrase; ⇅ flipped both heading sections; Contents listed both headings; a Note linked from another listed it under "Linked from". Check corrected twice: wrong selectors (`[data-find-input]`, `.note-sec.collapsed`). "Bring one back" restore is covered by `journey-s9-browser`, not repeated here. |
| Tags on Notes | ⋯ → 🏷 Tags…, create/tick, Tags list shows the count, tap a tag to see its Notes | PASS | count "1"; the tag's Note list = Note One |
| Pop-up Note windows | ⋯ → ⧉ Pop out; ▾ → ⧉ Open in window; several at once; tab strip (wide) / bottom switcher (phone); move and resize (wide); ✕ Close all; Pinned Notes in a side panel | PASS | title-bar drag moved the window >20px; the SE corner changed its size; "📌 Pinned (1)" opened a panel listing Note Three. Ctrl/⌘-click on a title not driven (SKIP-equivalent, not a separate check). |

| Pictures, tables and link previews | Editing toolbar has 🖼 picture, ▦ table, ⊞ spreadsheet; ⋯ → Show link previews turns link cards on | PASS (with one extra step) | **Manual imprecise:** the switch first asks in words (each link's address goes to Microlink) and cards come on only after **Turn on**. Suggested: *⋯ → Show link previews → Turn on.* Picture upload, spreadsheet formulas, annotations and status badges are not driven here (covered by `journey-note-images-browser`, `note-sheet-engine`, `journey-annotations-status-browser`). |
| My Note tools | Save as a template, phrases; stored with the person (follow them to every device) | PASS | write goes to `userPrefs` only |
| **My Note tools** | "Use **New from template** when creating a Note" | **Manual is wrong (wording)** | The button in ⋯ → 🧰 My Note tools… → Templates reads **"New note from this"**. Suggested: *Use New note from this next to a template.* Check corrected. |
| Favourites, Archived and Trash | ⋯ beside the views → ⭐ Favourites, 📦 Archived, 🗑 Trash; lists show the marked Note; a deleted Note is only marked and sits in Trash; Restore brings it back | PASS | Trash holds sections/folders/tags too; only Notes driven here |

Totals so far: 137 pass, 0 fail, 3 skip.
