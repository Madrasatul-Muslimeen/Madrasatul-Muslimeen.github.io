# MSA · Hadith Lead: handover, 28 Oct 2026, about 12:10 pm Sydney

Written by Hadith Lead session `01Q2HmCeWjo1vVYV5kgMBvC9` at about 77% context, on the PCA's word (hand119).
The next session is titled **"📌 (03B) MSA - Hadith Lead"**.

## UPDATE, 6:30 pm 30 Oct (this "📌 (03B) MSA - Hadith Lead" session)

- **Audit part 136 is DONE and LIVE as v12.130** (merge `99bba01b`, PR #1347; Hadith work `877099a`). B1 the Tenant/Person
  pickers fit the screen (full name as title); B2 the 👥 button cuts a long name with "…" (full names as title), the 👥
  rows are 40px; H1 the text-language picker wraps; H2–H4 pane headings, the Go-to mode picker and reader snippets carry
  their full text as title. The suite's B1/B2 baselines are gone (B3 withdrawn by the Architect: it was B1). Measured
  201/0 at 360, 390, 768, 1024, 1440; old code with the new suite 163/38 FAIL; reader 116/0.
- **Nothing is in flight.** Next Hadith work: J106 round 2 (Subjects) after the Owner's tick on question 5 (`n106e`).
  The MSA Architect who released v12.130 handed over; send hand-ins to the next MSA Architect (ask the PCA).

## HANDOVER, 3:41 pm 30 Oct (session `01PL2xbM3qDHBrLKbW6yzZKe` → a fresh "📌 (03B) MSA - Hadith Lead")

Handed over at 40% context (cost86). **Nothing is half-built.** The branch `claude/hadith-lead-01q2` is at `main`
(v12.127, merge `ac8ccea`) plus this file only.

- **Done and live since 28 Oct:** **v12.121** (audit part 130 F1/F3/F5: `readFailedNote(err, retry)` in
  `app/js/hadith-shared-ui.js` shows `plainMessageFor(err, { read: true })` + a 44px Try again on Hadith Books and the
  Encyclopedia; the synthetic samples hide while the library fails; `resolveCategoryTitle` labels the 24 Bangla
  category titles that HadeethEnc left as English copies). Suite `tools/i18n-verify/hadith-read-failed-browser.mjs`
  100/0, `--prove` 6 of 6. Part 131 finding 20 (crumb under the Zab bar at 768, 200%): measured, no Hadith change, left
  to the Architect's Zab-bar round.
- **THE JOB IN HAND, NOT STARTED: audit part 136** (the Architect's message, 3:41 pm 30 Oct; report
  `docs/reports/2026-10-30-audit-part136-hadith-study-large-text.md`, suite
  `tools/i18n-verify/large-text-hadith-study-browser.mjs`, 201/0 per width, run ONE width at a time). Fix on
  `hadith-study.html`, most important first:
  - **B1** (ordinary text size, a 40-character person name): `#personSelect` (`width:auto`) is as wide as the longest
    name and pushes the page sideways on a 360px phone. Fix as the shared pages do: `max-width:100%`, `min-width:0`,
    and `keepSelectTitles` from `app/js/select-title.js` for the full name.
  - **B2:** the 👥 `.assign-trigger` on an Encyclopedia card carries the same long name and runs to x 435; ellipsis
    inside the screen, full name as `title`. **Small:** the 👥 list's checkboxes are 25px; make `label.assign-row` the
    40px target. (`assign-picker.js` may be SHARED; check its owner before editing; if shared, ask the Architect.)
  - Larger text only: **H1** `#hadithContentLang` cut at 200% on 360; **H2** the reader's "Chapters" pane title cut at
    150/200 (no title); **H3** the Go-to mode select cut ("Standard number"); **H4** a narration snippet cut at 200% with
    no title.
  - When B1/B2 are fixed, the suite's named baselines B1/B2 stop occurring: **remove them in the same round**. Then hand
    the branch to the Architect for release.
- **Sessions now:** the MSA Architect is `session_01PL2xbMR1BT69RwFBnBc2w9`; the PCA is
  `session_01PL2xbLtbpz1UznbKURDuvi`.
- **Still with the Owner:** J106 question 5 (`n106e`, where the Subject lists are saved: A shared Firestore list,
  recommended / B in the app's code / C this device only; unticked at 3:41 pm 30 Oct; then build round 2, "Add to
  subject"), J97, the My Notes link, J06. The merged branch `claude/hadith-lead-01q2-next` stays until the Owner says.
- **New General rule win130** (30 Oct): every demo opens in its own window ("↗ Open in its own window", `target=_blank`,
  `rel=noopener`) and every mention of a demo gives its full https:// link.
- **Sandbox:** the container restarts often: re-start `node serve.js` and check with `curl`; `node_modules` is a
  git-ignored symlink to `/opt/node22/lib/node_modules` (Playwright), so re-create it if missing. Never commit while a
  `--prove` run is going. `behaviour.mjs` 8e (Quran Go-to, Bengali digits) can fail once on timing and pass on a re-run.

## HANDOVER, 3:56 pm 28 Oct (session `01PL2xbJ9t1PMhK5GNBspYu6` → a fresh "📌 (03B) MSA - Hadith Lead")

**Nothing is in flight.** Everything this session built is merged and live; the branch `claude/hadith-lead-01q2` is at
`main` (v12.92) plus nothing of its own.

- **Live:** v12.89 (J106 round 1: Hadith Study, the menu bar, Hadith Books in three panes, and the Dua code split),
  v12.90 ("The book's opening" for a book's untitled first chapter), v12.92 (the opening's text readable in night look,
  2.95:1 → 9.77:1). Round report: `docs/reports/2026-10-28-hadith-study-round1.md`.
- **The reader suite** `tools/i18n-verify/hadith-study-reader-browser.mjs`: 116/0; `--prove` runs 18 mutations served
  through the browser route (no file swapped on disk; `--only=a,b` runs some). Keep it green with every Hadith change.
- **Next, J106 round 2 (Subjects): waits on the Owner's tick on J106 question 5 (`n106e`)**, where the lists are saved:
  A a shared Firestore list (candidate Rules the Owner publishes; recommended) / B in the app's code / C this device
  only. Then build "Add to subject" on every hadith and the three lists (Book · Chapter · Hadith No. · Title, opening the
  original, ← Back). `HADITH_SUBJECTS` in `app/js/hadith-browser.js` holds the three, and `renderSubjects` the empty
  view. For A, the Rules are an Owner Control Gate: write a candidate, test it in the emulator, and guide the Owner.
- **Still with the Owner:** J97 (Bukhari Bangla chapter heading A/B/C), the My Notes link (A keep / B open the panel),
  J06 (permanent key, HadeethEnc permission). A later question: does the shared topic list under the reader fold into
  Subjects?
- **The Architect** is session `01PL2xbMHduuqAb3piTztCJ4`; the PCA `01PL2xbMoGds3DRVRoe4TA2j`. A leftover branch
  `claude/hadith-lead-01q2-next` (fully merged) stays until the Owner says to delete it; this sandbox cannot delete
  branches (HTTP 403).
- **Sandbox:** start `node serve.js` yourself in a fresh container and check it with `curl` (a `pgrep -f "node serve.js"`
  matches its own command line and lies); never `pkill -f` a pattern that is in your own command.

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

- **3:00 pm:** round 1 is LIVE as **v12.89** (merged 88e9d9e, PR #1235). The Architect is now session
  **`01PL2xbMHduuqAb3piTztCJ4`** ("📌 (03) MSA Master Architect"). Handed in since, for its next release: `0381ddb`, the
  book's opening (no heading in the source, 11 of 15 books) reads "The book's opening", not "(untitled)".

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
