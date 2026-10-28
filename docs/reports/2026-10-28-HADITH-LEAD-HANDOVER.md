# MSA · Hadith Lead: handover, 28 Oct 2026, about 12:10 pm Sydney

Written by Hadith Lead session `01Q2HmCeWjo1vVYV5kgMBvC9` at about 77% context, on the PCA's word (hand119).
The next session is titled **"📌 (03B) MSA - Hadith Lead"**.

## LATEST UPDATE, 2:31 pm 28 Oct (session `01PL2xbJ9t1PMhK5GNBspYu6`, "📌 (03B) MSA - Hadith Lead")

- **J106 round 1 and the Dua split are HANDED IN** to the MSA Architect at `a39d572`, with
  `docs/reports/2026-10-28-hadith-study-round1.md`. Nothing of round 1 is left to build; the Architect releases it.
- Done since the block below was written: the Hadith Books button (shelf from another view, quick list on Books); 18
  suites updated in place; the new `tools/i18n-verify/hadith-study-reader-browser.mjs` (106/0, `--prove` 16 of 16
  mutations caught, served through the browser route so no file is swapped on disk); three reader faults fixed (a
  phone's empty pane after the book-name breadcrumb, "Go to" by the edition's own number, row numbers 3.24:1 in light
  look). Every suite naming the Hadith page is green apart from failures measured identical on `main`.
- **Waiting on the Owner:** J106 question 5 (`n106e`, where the Subject lists are saved: A shared Firestore list with
  Rules the Owner publishes, recommended / B in the app's code / C this device only). Then build round 2, "Add to
  subject". Also still waiting: J97, the My Notes link, J06.
- Sandbox lessons from this session: **never `pkill -f` a pattern that also appears in your own command** (it killed the
  shell twice); stop a process by its pid, picked by `pgrep -f "^node …"` and its cwd. A `main` worktree on
  `PORT=8081` with `QR_BASE=http://localhost:8081` gives a side-by-side "is it red on main too" in one run. Give the
  long audits (part 16, part 40, shared-pages-failed-write) no 25-minute timeout. The clone is shallow, so
  `study-note-boundary` fails one history check here.

The blocks below are kept as history.

## Who you are

You are the **MSA · Hadith Lead** (lead120).
- You work only on Hadith-owned files, on the branch **`claude/hadith-lead-01q2`**.
- You never merge, never set a version and never change shared parts.
- You hand finished parts to the **MSA Architect**, today session `01PL2xbLexYe2DUFQk1jwKoX`.
- The **PCA** is session `01PL2xbMoGds3DRVRoe4TA2j`.
- The Owner reads and answers in the **PCF**: https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ (section `mmsa`).
- Your jobs are J103 and J106; read them first.
- Rules:
  - Write plain words.
  - Ask the Owner only real decisions, with tick boxes.
  - Never spend money and never handle keys.
  - In English, after "Rasulullah" write "Sallallahu A'laihi Wa Sallam" (saw128).
  - Every demo or list for the Owner gets a card in `p/mmsa.databases` (mydb128).

## Done and live

- **J103, hadith references:** released in v12.85, v12.86 and v12.88, and marked done in the PCF.
  - HadeethEnc cards show each proven book, standard number and chapter, with a tap to the passage and ← Back.
  - The library's numbers were re-checked; 27 joined passages are now cited by their first hadith.
  - Report: `docs/reports/2026-10-28-hadith-references-round2.md`.
- **J106 demo:** https://claude.ai/artifact/P1WhyMz7R5bJoPAgcwxBXz.
  - **The Owner answered 1A 2A 3A 4A at 11:53 am, 28 Oct**: build it; one pane at a time on a phone; the Owner fills
    the Subject lists with "Add to subject"; HadeethEnc gets its own "Encyclopedia" button.
  - J106 in the PCF is version 2, with the answers recorded.

## In flight: J106 round 1 (on the branch, NOT handed in)

Commits, all pushed to `claude/hadith-lead-01q2`:

1. **`aa8089c` + `cbc8bc9`: the Dua code split, at the Architect's request.**
   - The Dua tab's code is now in `app/js/dua-browser.js`; the shared helpers are in `app/js/hadith-shared-ui.js`.
   - Proven to behave the same: 24 suites green, and 21 of 22 re-pointed mutations caught.
   - The exception is `dua-note-bookmark "nokeep"`, which is also uncaught on `main` (pre-existing; recorded).
   - The Architect holds this split until the Dua page goes in, or until J106 is handed in.
2. **`f36d22f`: round 1 itself.**
   - `app/hadith-study.html`: the title is "MSA — Hadith Study", the h1 is "Hadith Study" and the description line is
     gone. The corpus section moved above `#app` (it reads without sign-in) and lost its "Hadith Corpus" heading.
   - `app/js/hadith-browser.js`:
     - The menu bar (`controls()`) holds Hadith Books ▾ and Subjects ▾ (`menuButton`, `fillBooksMenu`,
       `fillSubjectsMenu`), then Encyclopedia (= view `collections`), Topics, Search, Explore, Explanations and Dua.
     - The new views are `books` (`renderBooks`, now the default view) and `subjects` (`renderSubjects`, an
       empty-list note only).
     - The library moved out of the Encyclopedia view.
     - `renderOpenitiBody` now renders the three-pane reader. New helpers: `chapterBabs`, `passageSnippet`,
       `renderReaderHadithList`, `renderReaderText` (‹ › step buttons).
     - `renderOpenitiChapterList` marks the open chapter and lists its sub-chapters (`data-openiti-bab`).
     - `openReferenceInBook` now goes to `books`; its Back returns to `collections`.
   - `app/js/hadith-reader.js` (new): the three panes, splitters (widths saved in localStorage), ⤢ expand, and ⧉ pop
     out (float-window.js: drag, and resize from all 8 handles). On a phone the steps show one pane at a time.
   - `app/js/dua-browser.js`: its two jumps into the library now go to view `books`.
   - `app/css/hadith.css`: menu bar, reader and night-look rules, plus a fix for `.openiti-show-more` (white text on
     white).
   - `app/js/i18n/bn.js`: about 30 new Hadith keys, including `"Subjects|Hadith Study menu"` (পাঠ্য বিষয়), kept
     distinct from Topics.
   - Measured by hand: en/bn at 390, 820 and 1280, light and night; no sideways scroll; every reader and menu text
     element is ≥ 4.5:1; a splitter drag works; the corner resize of a pop-out works.

## The next steps, in order

1. **Change the Hadith Books button** (decided, not yet coded):
   - when the view is not `books`, the button goes to the shelf of all books (`state.view = "books"`,
     `oi.bookUri = null`, no list);
   - when already on `books`, it opens the quick book-switcher list.
2. **Update the suites that describe the old layout, in place, with the reason recorded** (CLAUDE.md: never delete).
   The sweep running at handover (`/tmp/claude-0/r1-summary.txt`, lost with the container) had:
   - **red:** `openiti-browser`, `hadeethenc-openiti-links`, `hadith-concordance`, `hadith-translations-browser`;
   - **green:** `hadith-source-navigation` 50/0, `hadeethenc-references-browser` 33/0, `hadeethenc-browser` 82/0,
     `hadeethenc-note-back` 12/0.

   Still to run: `dua-*` (10 suites), `asma-cited-hadith`, `asma-poster`, `ayah-related-hadith`,
   `claim-for-family-word-hadith`, `hadith-search-announcement`, `card-look`, `bangla-sweep-newer-screens`,
   `shared-pages-failed-write-audit`, `audit-part16`, `audit-part40`, `manual-claims-msa`, and the audits naming
   `data-hadith-tab` (parts 21, 31–38). The common cause is that the checks click `[data-hadith-tab="collections"]`
   to reach OpenITI, which now lives in the default `books` view. A check reading all of a chapter's passage cards
   now sees one hadith in the Text pane, with rows `[data-openiti-row]` in the middle pane.
3. Add a J106 browser suite (`tools/i18n-verify/hadith-study-reader-browser.mjs`), mutation-proven, covering:
   - the menu;
   - each pane;
   - the splitter, expand, pop-out and dock-back;
   - phone steps;
   - jumps (J103 references, Asma `?openiti=`, Dua "Also narrated in");
   - ← Back.
4. Run `node tools/apps/build-app.mjs qr` and `tools/apps/apps-build-check.mjs`. No `msa.json` change was needed:
   the title rule is only the "MSA — " prefix. Then hand J106 round 1, together with the Dua split, to the Architect.
   Tell the Architect: two new files (`hadith-reader.js`, `hadith-shared-ui.js`, `dua-browser.js`) may need `sw.js`'s
   shell list.
5. **Round 2, Subjects:** ask the Owner with tick boxes where to save the lists:
   - A. A new shared Firestore list (e.g. `hadithSubjectLists/{tenantId}__{subjectId}`), with candidate Rules the
     Owner publishes, as on 20 Oct (recommended);
   - B. Keep them in the app's code (the Owner names the hadith; the Lead adds them);
   - C. This device only.

   Then build "Add to subject" and the lists (Book · Chapter · Hadith No. · Title, opening the original, ← Back).
6. Still waiting on the Owner: J97 (Bukhari Bangla chapter heading A/B/C), the My Notes link (A keep / B open the
   panel), J06 (permanent key, HadeethEnc permission). An open question for the Owner later: the shared topic list
   ("Adab Al-Mufrad … No resource yet") still sits under the reader; does it fold into Subjects?

## Sandbox notes

- Start the server with `setsid nohup node serve.js > /tmp/claude-0/serve.log 2>&1 < /dev/null &`.
- `node_modules/playwright` is a symlink to the global copy.
- Never commit while a mutation suite is running: it swaps files on disk. That happened once and was repaired.
- The fawazahmed0 editions cache, for re-running the J103 tools, is lost with the container. The tools re-download it
  with `--cache <dir>`.
