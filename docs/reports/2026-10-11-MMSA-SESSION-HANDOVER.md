# MMSA session handover, 11 Oct 2026

Written by the MMSA Architect, session `session_018zBksiX4zzcrLCxBRGwU8y` (took over at v09.150 on 9 Oct 2026 from
`session_01J6tdKAiaMqQEPd6xFJoZ2J`). It supersedes `docs/reports/2026-10-09-MMSA-SESSION-HANDOVER.md`, which is kept
as history. Read `CLAUDE.md` first. The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-11.md`.

This session was summarised (its context compacted) before it was handed over, which is why it ends here.

## 0. Where things stand

**`main` is at v10.16** when written. Read the live number off `app/js/version.js`.

**Decision 95 (Read + Note as one) is complete.** The Read view's 📝 Notes pane is THE note for an āyah. It holds
Mapping My Journey's page in unit mode (`journey-map.html?embed=1&unit=<key>`) and has a ✅ Track this āyah tab. The
QCR / Asma attach is its own pop-up (`#qcrPopup`), and nothing in the app opens the old Note view any more.

**The last two releases came from the Owner's own phone/tablet screenshots (D13: the Owner's real use first):**
- **v10.15:** the Notes pane said "Loading…" forever, with no ✚ New note.
  - The page inside the pane had no person when its people list came back empty, and returned silently.
  - It also waited on the whole folder tree before reading the āyah's notes.
  - Fixed, with a new suite: `notes-pane-loading-browser`, 26 checks and 4 mutations.
- **v10.16 (decision 99):** on a tablet the Notes pane now fills the screen, as on a phone. The Owner: "Still note
  is showing half screen." A computer (1100px and wider) keeps it beside the reading. The `rnp-dock` style is kept
  but unused.

### In flight: Note view retirement, step (b) — Builder #742, UNFINISHED, not merged

- **Step (a) is merged as v10.14** (PR #741). The four shared helpers no longer default to the Note view, and the
  guard `note-view-decoupled.mjs` checks that.
- **Step (b) is the deletion.**
  - It is on branch `builder/issue-742-run-1136`: three commits deleting about 1,900 lines from
    `app/quranrevival.html` and `app/js/ayah-note-renderer.js`, and updating suites.
  - **No PR was opened.** Both Builder runs pushed and stopped; the second ended in `failure`.
  - The deletion commit looked right in shape when read. **It has not been run by the Architect.**
- **What remains before it can merge** (the Architect's comment on #742 has the first list):
  1. `quran-word-card-note-origin-return.mjs` still calls `window.__dormantOpenNoteView()` (line ~119) and reads
     `#noteView .note-body`. It tests "a word opened from inside the Note view returns there". Update it in place
     to the Read view / Notes pane, or make it an absence check where only the Note view was described.
  2. `bookmark-open-browser.mjs` lines ~66 and ~107 read `#noteView`. Make sure `vis(null)` cannot throw, and that
     the checks still assert something true.
  3. **Mutation anchors that name deleted code:** `qcr-popup-browser` (`routenote`, `noteonly`) and
     `pane-approach-card-browser` (`noroot`). A mutation whose anchor is gone throws "anchor missing", so the suite
     has lost a proof. Re-anchor each on the code that does the job now.
  4. **`wheel-centre-browser`**: on the first run its "a slice tap still opens its slice" became
     `!!document.getElementById("noteView")`, which can never pass. Check what the branch has now: it must assert
     that the Notes pane's Track tab opens.
  5. **`behaviour.mjs`**: the Builder turned 8 blocks of old Note-view checks into "#noteView, .note-view and the seam
     are absent" checks. Read each block. Where the old check described a job the app still does elsewhere (the
     Notes pane, the Track tab, the QCR pop-up), it must test that surface instead, not only the absence.
  6. Then run everything that names the Note view: `git grep -l -E '__dormantOpenNoteView|noteView' -- tools/`.
     Also run `note-view-decoupled` with a mutation restoring one deleted name, `phone-width-overflow` and
     `behaviour`. Allocate a version and merge.
- If finishing it takes more than a round, do it yourself on that branch rather than dispatching a third Builder run.
  Both runs stopped part-way.

### Recorded, not yet fixed

- **`journey-map-screen.mjs` fails 2 checks on `main`** ("an unknown or absent hash falls back…", "the hash wins over
  the remembered view…").
  - Its static check looks for `currentView`'s initial value starting from `viewFromHash()`. Since decision 95 it is
    `unitMode ? "unit" : viewFromHash()`.
  - This is a stale assertion, not an app defect. Update it in place to allow the unit-mode branch, and
    mutation-prove it.
- **The Builder twice pushed a branch and opened no PR** (#740, #742). After every run, look for
  `builder/issue-<N>-*` even when no PR exists.

### The master feature-discussions file

- **Link:** https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1, at **v13**.
- **It is the Owner's master for every feature discussion,** one tab each: Ten Steps & QR Levels · 🔑 Keys to
  Understanding · 🌙 Asma Screensaver.
- **Every tab starts with a 📋 Issues table:** Raised · Decision taken · Decided on · Pending / for later · Status,
  with a "served its purpose" fade.
- **The page saves itself.** Before republishing, read it (Artifact `read`) and compare its version id with the last
  one published from here (`1791632568-7bd6`, v13). If they differ, the Owner has saved edits: merge them, never
  overwrite.
- **The build scripts are not in the repository** (they were in the old session's scratchpad). To change the file,
  read the live artifact, edit the JSON state in `<script id="state">`, bump `version` and `savedAt`, and publish to
  the same URL.
- **v12 added the Owner's last request:** how to connect an āyah to the 13 "Understanding of the Scholars"
  Approaches. It has:
  - a new Approach Map column, "Connect an āyah: sources & method", filled for 28, 29, 34, 32, 35, 33, 36, 30, 31 and
    Gen3–Gen6;
  - a section after the Map: the āyah as the one key, per-āyah tafsir sets (quran.com / QUL via
    `spa5k/tafsir_api`), OpenITI full texts matched to āyāt, the Owner's Scholars Database read against it (strong on
    imams and collectors; centuries 5–9 and 12–13 empty), maani.tech compared with ours, and a 5-step research plan.
- **Three questions wait on the Owner (T20–T22).** Build nothing for them yet.

### Possible next, once #742 is merged (none needs the Owner)

1. The `journey-map-screen` stale assertion (above).
2. Research plan step 1 for the scholars (a sources list in `docs/reference/`, nothing in the app) — only after the
   Owner answers T20.
3. Anything new the Owner sends.

## 1. What waits on the Owner

1. **Scholars (master file, Ten Steps tab, T20–T22):**
   - the method;
   - whether the Architect should fill the Scholars Database's empty centuries and add four columns;
   - whether the scholars show only after the reader writes their own understanding.
2. **Keys to Understanding (tab 2): 6 questions.** Each reader's own marks would need a Firebase Rules step.
3. **Asma screensaver (tab 3):** confirm the defaults (per device, any page, 3 min / 15 s).
4. **The Ten Steps tab:** its other pending items (T9–T15).
5. **HadeethEnc permission** (decision 90). Yes or no to `hadith:openiti:<book>:<n>`.
6. **Google Cloud Upgrade before about 6 Jan 2027.** Al-Munshi' Arabic. Letters, later. The family sign-up step
   (v09.87).

## 2. What this session learned (beyond `CLAUDE.md`'s standing lessons)

- **A pane that embeds a page must never inherit that page's silent early returns.** `renderUnitView()` drew its
  header, then `if (!person) return;` left "Loading…" forever, and the start-up error went to a header line the
  embed hides.
  - Reproduce the exact picture the Owner sends: "title + Open in MMJ + Loading…, no ✚ New note" pinned it to the
    no-person path.
  - A failing folder tree gives a blank pane instead. Those are two different causes.
  - Force each cause in a test by routing the served file (`ctx.route` with a string swap), not by guessing.
- **A stash-based control must stash only the app code.** Stashing the test as well runs the old test on the old
  code, which passes and proves nothing. Use `git stash push <app file>`.
- **A Builder "update in place" can quietly make a check impossible**, e.g. asserting `!!#noteView` in the round that
  deletes `#noteView`. Read every changed check, not just the totals.
- **The `[hidden]` trap struck again in new code** (the screensaver settings' tick list, v10.13): a class rule setting
  `display:flex` beat `hidden`. Any new panel with toggled children gets an explicit `[hidden]{display:none!important}`
  scoped to it, and a check that reads rendered boxes.
- **The unattended Architect merged a docs-only Builder PR (#739) within two minutes.** That is expected; read
  `origin/main` before assuming anything is pending.
- **Owner messages may arrive many hours apart, with the container restarted in between.** Restart `node serve.js`
  (`ERR_CONNECTION_REFUSED` is the sign) before any browser check.

Carried from the 9 Oct handover, still true:
- `git fetch origin <branch>` does not update `refs/remotes/origin/<branch>`; use an explicit refspec.
- Never put sandbox instructions in a Builder note. Use plain `node tools/i18n-verify/<name>.mjs`.
- A kill pattern must never match your own command line. Kill by PID.
- Send a demo only after opening it in a browser yourself.

## 3. The handover guard

`allocate-version.py` appends every release to the handover that `CLAUDE.md`'s "READ THIS SECOND" block names, and
`brief-integrity.mjs` fails when that handover does not name the version in `app/js/version.js`.

## Releases by this session

| Version | What changed |
|---|---|
| v09.151 | Dua words link only to a Qur'an word that agrees with their vowels (Builder #712) |
| v10.01 | The Read view's 📝 Notes pane (decision 95, round 1; opens the v10 line, decision 97) |
| v10.02 | Check a dua (decision 96, Builder #716) |
| v10.03 | The Notes pane's Track this āyah tab; the Āyah card's 📝 Note opens the pane |
| v10.04 | The writing sheet's ✅ Record, for every family member (Builder #719) |
| v10.05 | The Note view's notes doors open the pane |
| v10.06 | QCR / Asma attach as its own pop-up (Builder #722) |
| v10.07 | Legacy App - v09 archived (decision 98) |
| v10.08 | The Asma ul Husna screensaver on every page |
| v10.09 | The Approach card in the Notes pane's Track tab (R3a) |
| v10.10 | Asma: Essence \| Act and Unique \| Shared on the Name bar |
| v10.11 | QCR, Asma and jump links open the Read view with the Notes pane (R3b) |
| v10.12 | The Study menu's Notes opens the Notes pane; the Note view retires (R3c) |
| v10.13 | Asma screensaver round 2: studying, groups, Open this Name (Builder #736) |
| v10.14 | Note view retirement (a): the shared helpers no longer depend on the Note view (Builder #740) |
| v10.15 | Notes pane: never "Loading…" forever (the Owner's screenshot) |
- **v10.16** (2026-10-10): Notes pane fills the screen on a tablet (decision 99).
- **v10.17** (2026-10-10): Note view retirement (b): the dead Note view code deleted (Builder #742, finished by the Architect).
