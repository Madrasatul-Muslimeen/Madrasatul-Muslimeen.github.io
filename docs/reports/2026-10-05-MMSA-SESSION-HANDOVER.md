# MMSA session handover: 5 Oct 2026

Written by the MMSA Architect, session `session_012katd3VGiJEprbqxSEUTbf` (3–5 Oct 2026), at the Owner's
request: *"Assess session change and include everything so that NS doesn't require any prompt from me for
non-stop continueing it's job and the builder's job."*

**This supersedes `2026-10-03-MMSA-SESSION-HANDOVER.md`.** That file is kept as history; its section 0
records v09.60–v09.81 paragraph by paragraph. Sections 2 (how a round is started and reviewed) and 3 (the
sandbox lessons) of `2026-09-30-MMSA-SESSION-HANDOVER.md` still hold. Where two handovers disagree, this one
wins.

The prompt that starts the next session is `docs/governance/NEW-SESSION-PROMPT-2026-10-05.md`.

## 0. The exact pause point: start here

Read the live state yourself, because it moves on after this was written:
- `app/js/version.js` on `origin/main`;
- open pull requests;
- `claude.yml` runs;
- the "Active Architect session" line on #159.

**`main` is at v09.82** (PR #587).
- **v09.82**: two things.
  - **Resizable panels** in Mapping My Journey (the Owner: "Make all the panes resizeable"), and a resizable pinned panel in Note windows.
  - **Round 1 of the Siyagah note-pane port**: the editor tools, items 3–13 of the list below.
- **v09.81**: the stem marked on the Word card, a folder in its own window, the pinned Notes panel, and the Ayah window (decision 69).
- **v09.80** and before: see the 3 Oct handover's section 0.

**THE JOB NOW: the Siyagah note-pane port, round by round.**
- The full numbered list is `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`.
- The Owner was asked to strike out by number the items they do not want. **Until they do, build Part B (items 14–33) in order, without asking.** If a struck number arrives, drop it from the queue and record it as decision 70.
- **Part C (items 34–45) waits for the Owner**: each needs new stored data, a Firebase change or an outside service. Ask in ONE message, numbered, after Part B's first round ships. Never build a Part C item on a guess.
- Group Part B into rounds of 4–6 items that touch the same code:
  - **Round 2, the Note's actions**: 14 Rename, 15 Make a copy, 16 title right-click to edit, 17 Copy section, 18 tag chips tap to filter, 19 delete confirm, 20 Esc ends editing.
  - **Round 3, folds and windows**: 21 fold all while editing, 22 folded preview, 23 Multi button, 24 Single⇄Multi, 25 Close all + shortcuts, 26 Details remembered, 27 Contents side panel.
  - **Round 4, editor input**: 28 toolbar groups on phones, 29 no-colour swatch, 30 URL paste choice, 31 smart paste, 32 @ link a Note, 33 table Σ and sort.
- Each round needs:
  - a new browser suite with mutation flags, each mutation caught;
  - the neighbouring suites (listed under "Regression set" below);
  - screenshots looked at, in English at 1280 and in Bangla at 390;
  - every new label in `bn.js`;
  - then a version allocation and a merge.
- **Where things live:**
  - `app/js/note-window.js`: the shared Note pane and windows: `TOOLS`, `runEditCommand`, `renderPaneBar`, `onViewClick`, `openWindow`, `openFolderWindow`, `paintPinned`.
  - `app/journey-map.html`: the host hooks (`createNoteViews({...})`, about line 1255) and the panel splitter (`layoutPaneSplits`).
  - `app/notes.html`: the other host (no folders, no flags).
  - `app/js/note-sanitize.js`: the cleaner. DOMPurify keeps every `data-*` attribute by default, so a new data mark must be NORMALISED in `narrowOutput()`. Removing it from `NOTE_ALLOWED_ATTR` does nothing (learned 5 Oct).
  - `app/css/note-window.css`.
- **The Siyagah source** for exact behaviour: `git clone --depth 1 https://github.com/Siyagah/siyagah.github.io /home/user/siyagah/siyagah.github.io` (public, read-only). Search by the function names in the list doc.

**Regression set for note-pane rounds** (all green on 5 Oct before v09.82):
- journey-editor-siyagah-browser 98/0, journey-editor-browser, journey-note-edit-browser, journey-note-pane-browser
- notes-note-windows-browser, journey-note-windows-browser, journey-reading-tools-browser, journey-finish-browser
- journey-flags-links-browser 306/0, journey-folder-window-browser 144/0, journey-pane-resize-browser 40/0, journey-three-panel-browser 368/0
- journey-window-tabs-browser, journey-s9-browser, journey-tray-browser, palette-contrast-browser, phone-width-overflow, note-sanitize-boundary 12/0

**The Builder queue is empty.** Nothing is dispatched. The Architect may build the rounds itself, which has been faster this week. It may also write an issue per round and dispatch the Builder by `workflow_dispatch` (Step 5 of the prompt).

## 1. What waits on the Owner (one line per report)

1. **Strike out note-pane items by number** (the list doc), and answer the Part C questions when asked.
2. **"What I really wanted" for the Ayah**: the Owner will say. The Ayah window (🗗, decision 69) was built from a demo they took as something else but liked.
3. **The two dictionary permission letters**: "Later. Keep reminding."
4. **The Asmaul Husna poster**: on hold (decision 50).
5. Only when they want them: the stored-total recount (A or B); the Wheel drawer standby; the tenant-name picker cut at narrow widths; D14 timezone.

## 2. Things this session learned (keep)

- **A surface keeps its palette when it moves.** The Ayah window first took the dark card surface in the Night look, and the Read view's text, picked for the white page, went unreadable. `read-window-browser` now measures contrast in both looks, and a mutation proves the check can fail.
- **A narrowed panel must still hold its content.** At its minimum width the note list's Compact/Preview switch spilled out. `journey-pane-resize-browser` asserts that nothing spills at the minimum widths.
- **DOMPurify keeps `data-*` by default.** A mutation that removed `data-done` from the allow-list passed, which is how this was found. The normalising step is the real guard, so test there.
- **A probe that clicks a hidden button proves nothing about the code.** ▸ (next āyah) is hidden for a one-āyah unit; ⏭ is the control that works there.
- **The container restarts and loses background test runs.** Write their output to a scratchpad file, and re-run on restart. Start `node serve.js` again after a restart.
- **A version PR's `verify` is red before the merge by design.** brief-integrity, programme-ledger and the ledger mutations compare the brief with `main`. Merge, then run the 8 governance suites on `main`; they must all pass.
- **Opt-in beats a default change on the busiest screen.** The Ayah window shipped behind 🗗, so every Read-view suite stayed as it was. Making it the default is one line (`let on = stored.on === true` in `app/js/read-window.js`), if the Owner asks.
