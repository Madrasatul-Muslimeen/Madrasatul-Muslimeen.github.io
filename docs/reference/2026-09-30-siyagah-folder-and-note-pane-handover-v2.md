# Prompt for the MMSA/QR Architect: build Siyagah's folder system and note pane

**You are the MMSA/QR Architect.** The owner wants MMSA/QR to have the same folder system and note pane as their other app, Siyagah, including its pop-up windows. This prompt is the Siyagah Architect's full handover, version 2, corrected by the owner on 30 Sep 2026. Build from it. Do not redo the research it records. Where it says "the owner decided", that is settled; do not ask again.

**From:** the Siyagah Architect, 30 Sep 2026 (version 2, with the owner's corrections).
**Source:** `Siyagah/siyagah.github.io`, `index.html` at commit `56249ce` (v04.76). Line numbers (`L…`) refer to that file at that commit; they drift a little with every round, so search by function name.
**Why this exists:** the owner wants MMSA/QR to have "the same folder system and note pane feature of Siyagah". This file is everything the Siyagah side already knows, so you do not repeat the research or the bugs.

**The owner's own words, verbatim (30 Sep 2026):**
> I want to build the same folder system and note pane feature of SIyagah inside my MMSA/QR app. Can you give me all detail for the MMSA/ QR architect so that the Architect do not has to do the double work.

and their corrections to version 1:
> Don't make popup windows as optional. It is must where it is applicable.
> It's not a mistake that deleting a folder once also deleted its notes on your other devices after syncing, (a folder should not be deleted with notes in it) but empty folders deleted should be synced.
> Moving a folder should sync as well.
> 1. several folders. 2. Good idea, section as well. Folders auto numbering, colors, pop up all. 3. Have both options in the context menu for both notes and folders.

### The owner's decisions for MMSA (settled; build them)
| # | Decision |
|---|---|
| M1 | **A note can live in several folders** (many-to-many, `folderIds[]`), as in Siyagah. |
| M2 | **Sections** sit above folders, as in Siyagah. |
| M3 | **Folder auto-numbering, folder colours and the pop-up windows (Single and Multi) are all required.** Pop-ups are a must wherever a note is opened, not an optional extra. |
| M4 | **A folder that holds notes cannot be deleted.** That includes notes in any of its subfolders. The app refuses and says why and how many notes (for example: "This folder still holds 12 notes. Move or delete them first."). **Deleting an EMPTY folder** (with any empty subfolders) goes to Trash and **must sync**: it disappears on every device, and Restore brings it back on every device. |
| M5 | **Moving a folder must sync.** So must every reorder, re-parent, move to another section and renumber. |
| M6 | **The context menu offers BOTH Copy and Move, for notes and for folders** (definitions in section 2.3). |

What this prompt does NOT know: MMSA's own code. Section 0 lists what you must check on your side first.

---

## 0. Before you plan: questions only your repo can answer

1. **What is MMSA's data store?** Siyagah is one global `DB` object, saved to IndexedDB + localStorage and synced as ONE Firestore document (chunked). If MMSA stores records differently (per-document Firestore, a server), the *rules* in section 5 still apply. The *mechanisms* will differ.
2. **Does MMSA already have notes/items and folders of some kind?** If yes, this is a migration. Siyagah's rule I8 applies: additive, runs once, back up the old shape (Siyagah's pattern: keep the old field as `DB._somethingV1`), and never discard.
3. **Is MMSA also a single self-contained HTML file with no framework?** Siyagah is. Everything below is plain JS + `innerHTML` template strings + inline `onclick`. If MMSA uses a framework, port the behaviour and data rules, not the code.
4. **Same owner, same Google account?** Siyagah is one user, keyed by Google UID, with no sharing (D1). If MMSA is multi-user, the merge rules below are NOT sufficient on their own.

**Recommended build order** (each line is one round that ships on phone, tablet and desktop together, per D5; all of it is required):
1. Data model + helpers + storage + sync rules (sections 1, 5), including M4's delete rule and Trash. No UI beyond a debug list. Build the sync-audit test (section 6) in the same round, with every folder operation in it: create, rename, move, reorder, move to section, copy, delete-empty, restore, renumber.
2. Sidebar folder tree with sections, colours and auto-numbering (section 2), plus the folder list pane (Pane 2, section 3).
3. Context menus with Copy and Move for notes and folders (M6, section 2.3), plus drag and drop.
4. Note pane read mode (section 4.1–4.3).
5. Note pane edit mode with autosave and the staged-field baseline (section 4.4).
6. Folder dialog: assign mode, direct picker and browse pop-out (section 2.5).
7. Pop-ups, Single and Multi (section 4.6). **Required (M3).** This is the most expensive part, so it may take two rounds (for example Single first, then Multi), but both ship on all three screen sizes.

---

## 1. Data model

### 1.1 Sections: top-level groups of folders
```js
{ id:"mq1abc", name:"Work", order:2, color:"#2E86C1", bold:true, updatedAt:"2026-09-25T…Z" }
```
- `mkSection` (L19424) makes `{id:uid(), name, order:max+1}`. Boot creates `{id:'sec-1',name:'My Notebooks',order:0}` if none exist (L3383). Any root folder with no `sectionId` is given the first section at boot (L3387).
- System sections have reserved id prefixes (`db-`, `kb-`) and are drawn separately (L4247).
- Deleting a section (`delSection`, L19434) moves its root folders to the first remaining section. Folders are never deleted along with it.

### 1.2 Folders: nest without limit
```js
{ id:"f2a", name:"(010) Taqwa", parentId:"f2", order:1, updatedAt:"…", color:"#C0392B" }
// root folder:
{ id:"f2", name:"(01) Iman", parentId:null, sectionId:"mq1abc", order:1, updatedAt:"…" }
```
- `parentId: null` means a root folder. **Only root folders carry `sectionId`**; nested folders inherit it through `pathOf(fid)[0].sectionId`.
- `order` is 1-based among siblings (for roots: among roots of the same section).
- **Required in MMSA (M3):** `color` (and `bold`, which rides the same menu item). Siyagah-only extras MMSA does not need: `journalMode`, `structured`+`fields[]`, `purpose`/`report`, `pinHash` (PIN lock), `groupId`.
- There is **no** icon, `collapsed` or numbering field. Expand state is UI state (section 1.5). Numbering like `(01.02)` lives inside the NAME text.

### 1.3 Notes: many-to-many with folders
```js
{ id:"a1", title:"Plan", content:"<h2>Goals</h2><p>…</p>",
  folderIds:["f1","f2a"], tags:["work"], kind:"idea", kinds:["idea"],
  pinned:true, favourite:false, archived:false, finalised:false,
  sectionState:{"0":true},              // which headings are collapsed in read view
  createdAt:"2026-09-01T…Z", updatedAt:"2026-09-02T…Z" }
```
- **`folderIds` is an array: a note can live in several folders at once.** Pane 2 shows it in each of them, and the note card says "in N folders".
- Siyagah has a special root folder named `Primary`, used as a quick-capture inbox. `_autoLeavePrimary(arr)` (L4166) removes Primary from `folderIds` once any other folder is added, but never leaves the array empty. Copy this only if MMSA has quick capture.
- `content` is raw HTML with **no sanitiser**. That is safe only because it is one user's own data. Do not copy that choice into anything shared.

### 1.4 Trash and tombstones: how deletion survives sync
```js
// DB.trash entry for a folder (trashFolder, L19699):
{ id:uid(), type:'folder', item:{…root folder…},
  subtree:{ folders:[…descendants…], articles:[…copies of notes filed in the subtree…] },
  deletedAt:"…" }
// DB.tombstones, a permanent log that survives Empty Trash:
[ { id:"f2", deletedAt:"…" }, … ]
```
- **Siyagah today** lets you delete a folder that holds notes: it **unfiles** them (removes the folder id from their `folderIds`) and keeps them. **MMSA does NOT do this (M4):** a folder with notes anywhere in its subtree cannot be deleted. Check with `cntOf(fid) > 0`, which counts notes in the folder and all its subfolders, before anything else runs, and refuse with a message. So an MMSA folder Trash entry never needs `subtree.articles`.
- **Deleting an empty folder must sync (M4).** Put a Trash entry in and write a tombstone `{id, deletedAt}` for the folder and every empty subfolder. The merge then removes them on every device. Restore (Siyagah: `restoreItem`, L19794) re-adds the folders with a fresh `updatedAt` and clears their tombstones, so the restore also reaches every device.
- Test both directions (section 6): delete an empty folder on device A, merge into a stale device B and back, and the folder is gone on both. Restore it on A, merge, and it is back on both. Try to delete a folder with one note: it is refused, and nothing changes on either device.

### 1.5 UI state is NOT data
Expand/collapse of folders (`ST.exp`), sections (`ST.secOpen`), picker rows (`ST.pickExp`), and the selected folder/note (`ST.folder`, `ST.article`) live in an in-memory `ST` object. They are never saved or synced. Anything per-device but persistent goes in `localStorage` under its own key, e.g. `siyagah-pop-details` and `siyagah-mb-popout-scope`. Keep this split. Syncing UI state across devices causes one device to fight the other.

### 1.6 Helpers you will want on day one (L4152–4156)
| Function | Returns |
|---|---|
| `chOf(pid)` | children of `pid`, sorted by `order`; `chOf(null)` = all roots |
| `descOf(fid)` | `[fid, …all descendants]` |
| `pathOf(fid)` | ancestor chain, root first, ending at `fid` |
| `cntOf(fid)` | notes in the folder **and all its descendants** (used for badges) |
| `artsIn(fid)` | notes filed **directly** in the folder (what Pane 2 lists) |
| `mkFolder(pid,name)` (L17154) | creates; root → section from context; child → `order=len+1`, parent expanded |
| `trashFolder(id)` (L19699) | Trash entry + tombstones for **folders only** + unfile notes |
| `doMoveFolder(fid,target,pos)` (L14894) | `pos` = `inside`/`before`/`after`; root move adopts target's section; renumbers sibling `order` 1..n |

---

## 2. The folder system in the UI

### 2.1 Sidebar tree (`renderTree`, L4208)
Order top to bottom: Smart Views → system sections → one block per user section (root folders by `order`, recursively) → Tags → Note Types.
- Row (`trNode`, L4251): indent `13px + 13px × depth`, ▸/▾ only when the folder has children, 📁/📂, colour dot, name, and the `cntOf` count badge.
- Tap a folder (`selFolder`, L5052): selects it, toggles expand, clears other filters, and below 1200px slides Pane 2 in.
- Collapsing a folder collapses its whole subtree (`collapseFolder`, L5047).
- Section headers expand/collapse (optionally accordion: one open at a time).
- A non-empty search box replaces the tree with flat grouped results: Folders (with breadcrumb), Tags, Types, Notes.

### 2.2 Drag and drop
- **Folder onto folder:** drop zone by pointer position in the row: top 28% = before, bottom 28% = after, middle = inside. Dropping onto its own descendant is refused (`dStart` L14783, `dOver` L14822, `dDrop` L14858).
- In Siyagah, **dropping a note (from Pane 2) onto a sidebar folder is COPY/LINK**: it adds the folder and keeps the old ones. **Dragging a note inside the folder dialog is MOVE**: it removes the old folder and adds the new one (`pkMoveNote`, L18522). Keep these drag behaviours in MMSA. Because of M6, the context menu always offers both choices explicitly, so the owner never has to remember which drag does which.
- Touch: a 600ms long-press opens the same context menu as right-click.

### 2.3 Context menus: Copy and Move for notes and folders (M6)
Siyagah's folder menu (right-click / 600ms long-press; `showCtx` L17222): Add subfolder · Add note here · Rename · Pop out into window · Move to top level (nested only) · Auto-number all · Renumber siblings · Colour + Bold · Move to section ▶ (roots only) · Convert to section · Delete (with confirm). The rest are Siyagah-specific.

**MMSA adds Copy and Move to both menus.** Each opens the folder dialog (section 2.5) to pick the destination. Behaviour:

| Menu item | On a note | On a folder |
|---|---|---|
| **Copy to…** | Adds the chosen folder to the note's `folderIds` and keeps the existing ones. It is ONE note shown in both folders (M1), not a second note. | Creates a new folder (and new copies of all its subfolders) under the chosen destination, with new ids. The notes inside are **linked**: each gets the new folder ids added to `folderIds`. Note content is **not** duplicated, because two copies of a note would drift apart. |
| **Move to…** | Removes the folder it was opened from and adds the chosen one. If opened from somewhere with no "current" folder, it replaces all of the note's folders with the chosen one. | Re-parents the folder (and its subtree) under the chosen folder or section (Siyagah: `doMoveFolder` / `moveFolderToSec`). |

Every one of these must sync (M5) and be in the sync-audit test. Refuse a folder move or copy into its own subtree. After a copy or move into a numbered branch, auto-numbering runs as it does for a new folder.

The phone gets the same menu through a 600ms long-press and the ⋯ row buttons, and the menu must sit above any dialog it opens from (section 5.3).

### 2.4 Auto-numbering (REQUIRED, M3)
Names like `(01.02) Name`. `autoNumberAll` (L17291) renames every folder from its position. `doRenumber` (L14981) does siblings only, with start/step. **Trap:** `mkFolder` calls `autoNumberAll` whenever any folder is already numbered, so *creating one folder renames many*. Every one of those renames must sync (section 5.3).

### 2.5 The folder dialog: three modes
1. **Assign mode**, from the note editor (`openPicker`, L17637). Tick boxes toggle a **staged** list `ST.efolders`. Nothing reaches the note until the edit is committed (section 4.4). Has search, ＋ New folder, a 📍 "new folders go here" target, inline rename, delete, and drag to move folders.
2. **Direct picker**, from read mode (`showArtFolderPicker`, L20082; `toggleArtFolder`, L20191). Ticks write `a.folderIds` immediately and stamp `updatedAt`. Refreshes ticks in place so scroll and search survive (v04.76). Refuses to remove a note's last folder.
3. **Browse pop-out** (`openSectionPopout` L17759 / `openFolderPopout` L17768). A tree window for navigating. Remembers scope, expanded rows, search text and scroll per device (localStorage `siyagah-mb-popout-scope`). Full-screen on phones.

Row layout by size: at 1200px+ each row shows 📍 ✏️ 🗑; below 1200px they fold into one ⋯ that opens the shared context menu. **That menu must sit ABOVE the dialog's overlay.** In Siyagah the dialog overlay is z-index 10000 and the menu was 9999 until v04.70, so on phones the menu opened invisibly behind the dialog (section 5.3).

All edits inside the dialog rebuild only the list (`_pkRebuildList`, L18139), never the whole dialog, so the scroll position and focus stay put.

---

## 3. Pane 2: the note list for a folder

**Header (`renderP2H`, L4379):** ≡ (below 1200px, back to sidebar) · folder name · 📚 browse · ✚ new note · Compact/Preview toggle (`DB.theme.listView`) · ◀.
Second row (`_folderPathRowHTML`, L16972): 🌳 Full tree · 🗂 Card view · ⬆ parent · child-folder chips with counts · ➕ New folder.

**Body (`renderP2C`, L4497):** sub-folder cards (only in Card view) → "Articles (n)" = `artsIn(fid)` (**direct notes only**, in stored order) → a quick-title bar to create a note in place → note cards (`artCard`, L20801) with "in N folders".

---

## 4. Pane 3: the note pane

### 4.1 Layout tiers (the owner's rule D5: every feature on all three, same round)
| Tier | Width | Shape |
|---|---|---|
| Phone | < 640px | one pane at a time, full-width sliding panels; ONE toolbar row; menus hold the rest |
| Tablet | 640–1199px | still sliding panes; toolbar row + tag bar + type row |
| Desktop | ≥ 1200px | three columns side by side (sidebar · list · note); one unified toolbar |

`showPane(name)` (L21034) is a no-op at 1200px+. Below that it closes all panes and slides in the one asked for. `selFolder` → Pane 2, `selArt` → Pane 3. **Keep the tier decision in ONE function** (Siyagah: `_p3OneBar()` at 640, `_popTier()` at 640, the 1200 pane rule). An `innerWidth<900` gate copied into eight places once left the tablet without a whole feature (section 5.4).

### 4.2 Read mode header (`renderP3H`, L4671; read branch L4856–4919)
One row: 🏠 (not on phones) · Note Type chips + 📎 Attach + 📦 Archive · 🏷▾ group · ⇅ section tools (only if the note has headings) · spacer · ‹ › · 🔍 · ✚ · Multi · Single · ⋯ · ⋯▾ group · ✏️ Edit.

**Measure-then-fold, never wrap** (`_p3FitToolbar`, L13359). After rendering, while `scrollWidth > clientWidth+1`, add the next class:
1. `nolbl`: drop words on Multi/Single;
2. `tight`: Attach + status fold into the 🏷 palette;
3. `tighter`: ‹ › 🔍 ✚ Multi Single ⋯ fold into the ⋯ palette;
4. `tightest`: the type chip itself goes.

Run it twice (now and in `requestAnimationFrame`), because the pane is still settling its width on the first pass. Palettes (`_p3ActPalette` L13453, `_p3NtiPalette` L13504) list the folded controls **with words**. A menu is read by someone who did not write it, so no bare glyphs.

### 4.3 Read mode body (`renderP3C`, L4936; read branch L4993)
Title → meta row (version strip, dates) → folder chips (tap = go to folder) → tag chips → body → annotations/backlinks.
Headings H1–H4 become collapsible sections (`_initCollapsible`, L13257): `.col-sec > .col-hd(arrow + heading) + .col-body`, nested by level. Collapsed state is saved on the note as `sectionState`. A ☰ Contents button appears on narrow screens when the note has 3+ headings.

### 4.4 Edit mode (the part that has lost data before; read all of it)
- **`startEdit()` (L5141):** stage `ST.etitle`, `ST.efolders=[...a.folderIds]`, `ST.etags=[...a.tags]`. Then **snapshot a baseline** (`_seedEditBaseline`, L5115) of what the note had when editing began.
- The editor is a `contenteditable` div (`#ed`). Script-made changes fire no `input` event, so call `_edTouched(el)` (L5489) to nudge autosave. `insertAtCaret` (L5521) has an iOS fallback.
- **Commit (`_commitEditedFields`, L5131):** write tags/folders to the note ONLY if they differ from the baseline. Without the baseline, a merged remote change that nobody touched here would be overwritten by the stale staged copy.
- **`_flushEd()` (L22729):** strip editor chrome, then write content + title + staged fields. **Stamp `updatedAt` only if something actually changed.** A no-op flush that re-stamps makes an open-but-idle device win merges against a device that really edited.
- **Autosave:** debounce 1200ms, maximum wait 2500ms (L3570) → flush → local save → cloud push.
- **Every exit path commits every staged field:** autosave tick, Save, Cancel (Cancel keeps typed text; it does not discard), switching note/folder, and **`pagehide` + `visibilitychange:hidden`** (`_flushEverythingOut`, L25478). A phone that is backgrounded or killed never runs a debounced save.
- **Heading chrome in the editor:** a ⠿ drag grip and a ▼ fold arrow are injected at the front of each H1–H4 (`_edColInit`, L14102). They are stripped before every save (`_edColClean`, L14062). Anything asking "is the caret at the start of this heading" must skip them (`_edPrefixText`, L14392).
- **The edit toolbar exists in two places** (Pane 3's `_p3EditIconsHTML` L10295 and each pop-up's `_fwEditIconsHTML` L11405). A button added to one must be added to the other.

### 4.5 📎 Attach menu (`openAttachMenu`, L7547)
Rows: 🏷 Note Type · 📁 Folder · (Siyagah-specific: Journal, MyDatabase). Folder opens the **staged** picker while editing this note, and the **direct** picker otherwise (v04.76). Phones get the same rows spread open in a card (`_ebAttachHTML`, L10427), no menu-inside-a-menu.

### 4.6 Pop-ups (REQUIRED, M3; biggest cost)
Two ways to open a note on top of everything:
- **Single** (`openNoteModal`, L9852): Pane 3 itself becomes the pop-up.
- **Multi** (`popOutNote`, L10911): one floating window per note (`#fw-<aid>`), several at once. A note is never live in two editors: popping out flushes and closes Pane 3's editor for that note first.

Shape by tier (`_popTier`, L10759): below 640px a near-full-screen **sheet** (no drag, no side panels, a bottom switcher when several are open); at 640px and up a **draggable, resizable window**, with geometry remembered per device.

Header, top to bottom (v04.74): (1) window bar with the one title (the title is the input while editing); (2) tab bar, always drawn; (3) one Details line (type · last folder · version · tags · date · Attach · 📦 · ▾ Details), closed by default, device-remembered; (4) formatting row + Save. Side panels, part of the pop-ups at 640px and up: Contents (when the note has 3+ headings) and a pinned-notes Sidepane.

---

## 5. Rules paid for in Siyagah: do not relearn them

Each one cost a shipped defect or a wasted round. Build them in from the start.

### 5.1 Storage
- **Guard writes until the real data has loaded.** Siyagah's async boot left an empty placeholder `DB` in place while IndexedDB loaded. A `pagehide` in that window saved the **empty notebook over the real one**. Guard: `_dbLoaded` (L3293); `_save`/`persist` refuse before it is true. Any change that moves work later in boot must list every listener registered at parse time and ask what it does if it fires first.
- Migrating to a new store: write, read back, compare the id sets, and only then trust it (`_idbMigrateFrom`, L3335).

### 5.2 Merge (`mergeDB`, L21554)
- **Union by id; newest `updatedAt` wins; a tie keeps local.** Never "pick a winning device" or "keep whichever side has more records".
- **Close the merge with a rule that names nothing:** copy any top-level key that remote has and local lacks (L21685). An allow-list of keys was missing `theme` for months, with no error, because a key silently kept from local looks exactly like normal behaviour.
- **Flush open editors BEFORE merging, never after** (L22192). Otherwise a stale editor writes over the merged result.
- **Push back what the cloud lacks.** After a pull, compare an order-independent digest of ids+stamps (`_syncDigest`, L22110). If local ≠ remote, push. Equal digests mean nobody pushes, so there is no ping-pong.
- **A push version must be unique by construction:** `Date.now()` + a random fraction (`_newPushVer`, L21087). With plain `Date.now()`, two devices saving in the same millisecond each ignored the other's write as "my own echo", and an edit vanished.
- **Classify a failed read before alarming** (v04.72): network → show "Offline" quietly and retry on `online`; permission denied → say so; genuinely broken data → alarm. A retry must re-read the thing that may have moved (the main document), not repeat the same stale request.

### 5.3 Folder-specific (found in Siyagah's folder code)
- **Deletion and sync (M4).** In MMSA a folder with notes is never deleted, so its notes can never be caught up in a folder deletion. Siyagah learned the underlying rule the hard way, and it still applies to every delete path: **a deletion mark (tombstone) may only name what that same operation removed.** In v04.65 Siyagah's delete-folder unfiled the notes but also wrote tombstones for them, and the next sync removed those notes on every device. The merge in Siyagah now also has a guard: a side's tombstone never deletes a record that same side still holds alive. Build that guard into MMSA's merge too. **Every delete path needs a test that deletes, merges both directions, and counts what is left.**
- **Deleting an empty folder must sync (M4):** tombstone the folder and its empty subfolders, so the other devices drop them at the next merge instead of keeping their stale copies.
- **Moving a folder must sync (M5): a change that does not move `updatedAt` does not exist for sync** (v04.68). In Siyagah, folder move, reorder, move to section, move to top, auto-number, renumber, and even *create* (because create renumbers) all changed records in place without re-stamping. 51 kinds of change silently never synced. MMSA's Copy/Move (M6) adds more operations of the same kind. Fix: not "remember to stamp" at each call site, but **one sweep at save time** (`_stampRecordTouches`, L3706). It compares each record's JSON (minus `updatedAt`) against the last save's snapshot, and stamps anything that changed without its stamp moving forward. When unfiling notes as a side effect of deleting a folder, mark them "untouched" so the sweep does not stamp them (`_recUntouched`, L3738). Otherwise an unfile can beat a real edit on another device.
- In the merge, a note pointing at a folder that is deleted on both sides is unfiled **without re-stamping**, so every device computes the same answer.
- **Menus opened from inside a dialog must be above the dialog** (v04.70). Test "is the menu the topmost element at its own centre, reached by a real tap", not "is it displayed".
- **Found while writing this handover, not yet measured or fixed in Siyagah:** "Convert folder to section" (`_doFolderToSection`, L19515) removes the folder without a tombstone, and folders are not in the sweep's tombstone list. A device still holding the old copy can bring the folder back as an empty duplicate. It is the same fault M4 forbids: an empty folder's removal not syncing. **Give every path that removes a folder a tombstone** in MMSA (delete, convert to section, merge of duplicates).

### 5.4 UI (the ones that cost the most rounds)
- **A platform is not a scope decision.** Build phone, tablet and desktop in the same round (the owner's decision D5). Put the tier logic in one function.
- **A check that opens a surface by calling its function proves nothing about whether the owner can reach it.** Siyagah shipped a whole restore feature with no button pointing to it; the test called the function directly and passed for five rounds. Tests must click the real control.
- **Never synthesise an event** (`{clientX, stopPropagation(){}}`) for a handler that calls `stopPropagation`. The real click then reaches the global "close menus" listener, which shuts the menu in the same tick. Pass the real `event`.
- **Inside a render function, interpolate every id into the handler string** (`onclick="f('${a.id}')"`). Never reference a local variable (`onclick="f(curA.id)"`), which throws on every click.
- **A menu is anchored to its button; the button is not in the middle of the screen.** Open it invisible, measure it, place it against the button, clamp it to the viewport. Never position with a constant.
- **Measure-then-fold, not wrap, for toolbars.** And a flex item with `min-width:0` does not overflow, it disappears. Make rows rigid, let them overflow honestly, and fold on the overflow.
- **A control that moves must leave its old home in the same edit**, and a surface that only appears with content (a bar with tabs, a picker with results) must be measured with that content seeded.
- **One glyph, one job per screen; anything in a menu carries a word.**
- **No `<!-- -->` inside an inline `<script>`.** It stops the app booting. Use `/* */`.

---

## 6. How Siyagah proves it: copy the approach

All in `tools/` of the Siyagah repo, Node + Playwright + Chromium, no framework:
- **`harness.mjs`**: `openApp({viewport, db, hasTouch})` boots the real app on a local server, blocks Google/Firebase hosts, injects a seeded notebook into localStorage, collects page errors, and waits for `window.__appBooted===true` (set by the app after load + first render). `seedDB()` gives 1 section, 3 folders (one nested), 3 notes.
- **`app-check.mjs`**: every check lives in a named `r.block('id', fn)`; a throw fails only that block; `--only 30,6h` runs a subset by prefix. The three sizes used everywhere: **390×844 (touch), 820×1180 (touch), 1440×900**. Every new check is shown **failing on the old code** before it counts. A check that cannot fail proves nothing.
- **`sync-audit.mjs`** (build this FIRST for MMSA). Boot once, and treat two copies of the data as devices A and B. For each of **114 operations** (F01–F18 are folder operations): A performs it through the same function the UI calls, and B stays stale or makes its own concurrent change. Assert `merge(B,A)` and `merge(A,B)` both equal A's intent, and re-merging is stable. An operation that changed nothing counts as "not run", not "pass". Siyagah went from 59 pass / 51 fail to 110 pass / 0 fail with it.
- **`sync-e2e.mjs`**: three real browser contexts (phone, tablet, laptop) against one **fake Firestore held in Node**, served in place of the Google SDK scripts. It enforces the real limits (1 MiB per document, 10 MiB per commit, offline queueing). 12 scenarios: edits, new folder + filed note, delete, two devices at once, the same millisecond, offline and rejoin, backgrounded typing, a large note, 20s idle with zero writes, and no page errors.

If MMSA's Architect wants any of these files, the repo is `Siyagah/siyagah.github.io`, folder `tools/`. Ask the owner to attach it to your session, or read it on GitHub.

---

## 7. Settled, and what is left to ask
The four questions from version 1 are answered (M1–M6 above). The one open item: the **Primary quick-capture inbox** (section 1.3) was not asked about. Leave it out unless MMSA already has quick capture, and if it does, ask the owner in one line.

Everything else in this prompt is settled. Build it as described, one round at a time, on phone, tablet and desktop together. Measure each round at 390, 820 and 1440 with real taps, and show every new check failing on the old code.
