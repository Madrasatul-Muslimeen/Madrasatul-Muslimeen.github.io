# MMSA session handover, 9 Oct 2026

Written by the MMSA Architect, session `session_01J6tdKAiaMqQEPd6xFJoZ2J` (took over at v09.135 from
`session_0116koLYBSQ7JHAmhYUWAkBX`). It supersedes `docs/reports/2026-10-08-MMSA-SESSION-HANDOVER.md`, which is kept as
history. Read `CLAUDE.md` first; the prompt that starts the next session is `docs/governance/NEW-SESSION-PROMPT-2026-10-09.md`.

## 0. Where things stand

**`main` is at v09.150** when written. Read the live number off `app/js/version.js`.

**When written, nothing was in flight** (see the update below: Builder #709 was dispatched later). The last three rounds
(#697, #701 and #705) are merged.

**THE OPEN QUESTION (the Owner's, asked 9 Oct; nothing built):** make the Read view and the Note view one, with the
Mapping My Journey note pane as THE note.
- Demo: https://claude.ai/artifact/PyZqqoKMVRBWnc6icgbrfR (copy: `docs/reference/2026-10-09-read-note-pane-demo.html`;
  one page, switch Tablet / Phone / Computer). It replaced the first demo (a design canvas), which the Owner reported
  did not work; the new one was checked in a browser at three widths, 126 checks, before it was sent.
- The finding that drives it: **two note stores.** The Note view's notes box saves to `ayahNotes` (one overwritten
  HTML entry per unit: `app/js/ayah-notes.js`, `saveAyahNote`). The Journey pane (`app/js/note-window.js` on
  `journey-map.html` and `notes.html`) uses the Foundation `notes` (with revisions, `noteSources`, `noteFolders`,
  `notePlacements`). So a Note-view note never appears in Mapping My Journey.
- `promoteQuickNoteToStudyNote` (`study-note-service.js:91`) exists but nothing calls it.
- The Āyah card's 📝 Note (decision 94) decides "no note yet" from the Foundation store (`notesForStudyUnit`), but
  opens the `ayahNotes` editor. That mismatch was inherited from the old ✍ Take Note, and the plan dissolves it.
- The Note view also moves the Read view's place in four spots, against its own comment (`quranrevival.html`
  ~20900, ~22325, ~21599, ~21584).
- **The plan, if the Owner says yes:**
  1. the Read view gains 📝 Notes, opening the Journey pane on the āyah, with notes started on or mentioning it,
     "+ New note on 6:99" and "Open in Mapping My Journey";
  2. Track this āyah becomes a tab of the pane;
  3. QCR stays on the Āyah card and ⋮;
  4. the Note tab retires, and old `view:"note"` bookmarks open Read with the pane;
  5. existing `ayahNotes` entries are **copied** (never deleted, I4) into Foundation notes. That touches live records,
     so it is an **Owner Control Gate needing its own yes**.
- **Do not build any of it until the Owner answers.**

**Update, 9 Oct 2026 late, session `session_018zBksiX4zzcrLCxBRGwU8y` (took over at v09.150):**
- **The dua review screen demo is with the Owner:** https://claude.ai/artifact/PdHH7pVfLuKKiKmB3Uq9pW (copy:
  `docs/reference/2026-10-09-dua-check-demo.html`), built from the real Dua 2 and checked in a browser (36/0 at 390px
  and 1280px, light and dark; it flags the same five narrations as #710's tool). It asks three questions, each with a recommendation: who may check (Owner and Prime);
  where a check is kept (the madrasah's own document, like the Asma descriptions, no Firebase step); when a narration
  moved out gets its own number (at the next data rebuild, by `dua-index.mjs`; numbers are never reused).
- **What the demo found in the real data:** Dua 2 (Sayyid al-Istighfar, 23 narrations) holds **five narrations of a
  different dua**, "رب اغفر لي وتب علي إنك أنت التواب الرحيم" said 100 times (Tirmidhi 3434, Abu Dawud 1516, al-Nasa'i's
  'Amal al-Yawm 458, Ibn al-Sunni 370 and 448): the 3-gram grouping chains. (The Architect first said six, counting
  al-Adhkar 1222; wrong: that OpenITI passage holds 1222, Sayyid al-Istighfar, and then 1223, the other dua. The
  Builder's tool scored it right.) `وَأَنَا` ("and I") is linked to the Qur'an's `وَإِنَّآ` ("and indeed we"), a wrong
  link: `duaWordKey` merges hamza seats and the links were never re-checked against round 5a's vowels.
- **Builder #709 → PR #710, merged (no version, data and suite only):** `dua-group-fit.mjs` writes
  `output/dua/fit-<page>.json`, each member's share of the dua's own words, `low` below 0.5, `short` under 5 words:
  105 duas have a `low` member (183 members), 148 a `short` one. 17/0; Architect mutation caught.
- **Builder #712 in flight** (dispatched ~21:00 UTC): dua words with vowels link only to a Qur'an word that agrees
  with them (hamza seat, shadda); else unlinked. Changes what the cards show, so it needs a version at merge.

**Possible next, if the Owner sends nothing else:**
- the dua review screen, once the Owner answers the demo's three questions (it then reads the fit files from #710);
- Hadith "Studied"/Notes on OpenITI passages (needs the Owner's yes to the key `hadith:openiti:<book>:<n>`).

**Update, 10 Oct 2026, later (`main` at v10.07 when written):**
- **The Owner's master file for every feature discussion** is the Ten Steps artifact https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1 (the Owner, 10 Oct: "let's use this file as a master to preserve all feature related discussions always"). From **v07** it has one tab per feature: *Ten Steps & QR Levels* and *🔑 Keys to Understanding*. A new feature discussion is a new tab in it, keeping the one version line; its export name is `<date>-mmsa-feature-discussions-vNN.html`. Copy at `docs/reference/2026-10-10-mmsa-feature-discussions-v07.html`; the Keys wheel demo at `docs/reference/2026-10-10-keys-wheel-demo.html`.
- **Keys to Understanding: build nothing yet.** The tab answers the Owner's four points (Status wheel views; related hadith fetched automatically, measured at 1,107 of 6,236 āyāt quoted in our 15 books; the Hadith approach; scholars by era from the open tafsir set, mapped to Gen1–Gen6 and the madhabs) and asks 6 questions. Each reader's own marks need a Rules step (Owner gate).
- **v10.07: Legacy App - v09** (decision 98), the v09.151 release archived at `legacy-v09/`.

**Update, 10 Oct 2026, session `session_018zBksiX4zzcrLCxBRGwU8y` (`main` at v10.06 when written):**
- Released v09.151, v10.01 to v10.06 (each in `CHANGELOG.md`). Decisions 95, 96 and 97 are recorded.
- **Decision 95 (Read + Note as one) so far:**
  - **v10.01:** the 📝 Notes pane.
  - **v10.03:** the Track tab; the Āyah card's 📝 Note and the quick Notes open the pane.
  - **v10.05:** ⋮ Note & more, the Unit card's 📝 Note, Make a poster (no Note) and Note-view bookmarks open the pane.
  - **v10.06:** QCR/Asma in a pop-up of its own (Builder #722).
- **Still on the Note view, on purpose:**
  - the Study-menu Note tab;
  - the Approach Track/Guide card (landing wheel slice, ring Take, Explore 🧭 Guide);
  - QCR collection / Asma reference navigation;
  - `?goto=` / `qpView=note` links.
  - About ten suites test the Note view's own features through its tab.
- **In flight:** Builder **#725 (R3a)**, the Approach card in the pane's Track tab, with those three Approach routes moved to it.
- **Then R3b (Architect):**
  - move the QCR/Asma navigation and jump links to the Read view;
  - retire the Study-menu Note tab and the Note view itself;
  - update the Note-view suites in place.
- **With the Owner:** the "Keys to understanding" demo (https://claude.ai/artifact/XeV3WUjEEg4PbGJsafz9Pj, copy `docs/reference/2026-10-10-keys-to-understanding-demo.html`). It marks on the Word and Āyah cards what a text needs (Gharīb, Hadith, scholars, other āyāt, Siyāq, Asbāb an-Nuzūl), with four questions. Build nothing until the Owner answers; each reader's own marks need a Rules change.
- **Also with the Owner:** whether to freeze `legacy-v09/` (recommended: at v09.151). The Owner said another separate issue is coming.

## 1. What waits on the Owner

1. **Read + Note as one** (above): yes or no, and separately whether to copy old Note-view notes.
1a. **Checking a dua** (demo https://claude.ai/artifact/PdHH7pVfLuKKiKmB3Uq9pW): its three questions.
2. **The Ten Steps file v06** (https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1, copy in
   `docs/reports/2026-10-09-quran-critical-reasoning-ten-steps-and-qr-levels.html`):
   - the references for the three "basis" points;
   - the section 9 questions.
   - Nothing in the app changes until the file is final (Owner, 9 Oct).
   - A monthly routine (`trig_01FyKvK48rrBqL8JoonizNcH`, 1st of each month) reads its PLANS section back.
3. HadeethEnc permission (decision 90).
4. Yes or no to `hadith:openiti:<book>:<n>`.
5. Google Cloud **Upgrade** before about 6 Jan 2027. Al-Munshi' Arabic. Letters, later. The family sign-up step (v09.87).
6. Listening bookmarks saved before v09.146 must be saved once more, while playing, to carry `listening: true`.

## 2. What this session learned (beyond `CLAUDE.md`'s standing lessons)

- **The unattended Architect merges test-only and docs-only Builder PRs within minutes** (#698, #703 and #706 were
  all merged before the session's check-in). "No open PR" does not mean "the round did nothing". Always list PRs with
  `state=all` and read `origin/main`'s first-parent log.
- **`git fetch origin <branch>` does not update `refs/remotes/origin/<branch>`.** A later
  `git log origin/main..origin/<branch>` reads a stale or missing ref and shows nothing. Use an explicit refspec
  (`git fetch origin 'refs/heads/X:refs/remotes/origin/X'`). This produced a false "the round pushed nothing" report
  this session, which was corrected.
- **Every Arabic word in the Read view is a button**, and a gesture that starts on a button is ignored (correctly).
  A gesture test aimed at the Arabic never reaches the scroll code, so its "stays put" checks pass for nothing.
  Start gestures over plain text, and prove the suite with a mutation restoring the old behaviour.
- **A pop-up sized `100vh` and centred hides its own top on a phone or tablet while the address bar shows.** Hang it
  from the top and size it to `100%` of a fixed, inset-0 overlay (v09.148).
- **The harness stub never adds a write to its own data**, so "after writing a Note the card shows it" cannot be
  proven on the note just typed. Seed a note instead (v09.149's suite seeds one on 2:256).
- A capture check that matched a seeded bookmark's flag was passing for the wrong reason (v09.146). Read only the
  NEW entry.

- **Send a demo only after opening it in a browser yourself.** The first Read+Note demo was not tested and did not
  work for the Owner; the rebuilt one had two real faults the test found at once (a pane that would not close because
  a class rule beat `[hidden]`, and a writing area squashed to nothing on a tablet).
- **A new session starts from one line the Owner types:** "Read docs/governance/NEW-SESSION-PROMPT-<date>.md in the
  repository and follow it." Never ask the Owner to paste or attach the prompt.

**Learned by session `session_018zBksiX4zzcrLCxBRGwU8y` (10 Oct 2026):**
- **Never put sandbox instructions in a Builder note.** The Builder's allowlist (`claude.yml`) admits `node …`,
  `npx playwright …` and a few `git` forms; its workflow already installs Playwright and starts `serve.js`. Notes
  telling it to `ln -s` playwright or prefix `CHROMIUM_PATH=…` made it try refused forms, and two rounds (#716, #719)
  ran no check at all. The note now says: plain `node tools/i18n-verify/<name>.mjs`, nothing in front of it.
- **When the Builder ran nothing, the Architect runs everything** before merging, and finds real faults (#717: the
  panel's edition numbers; #720: a 27px unit label at 320px).
- **An empty iframe fires `load` for about:blank first.** Messages held "until the frame loads" must wait for the
  real page's load (check its location), and a request that must survive a reload (a Bangla page reloads once to adopt
  the language) goes in the page address, not a message (`read-note-pane.js`, `focusNew=1`).
- **Opening the Āyah card clears any way back** (`clearAyahCardReturn()` in `openAyahActionSheet`): set a
  `setAppReturn()` AFTER opening the card. And while a card is open its backdrop covers the docked pill: a test must
  close the card, then tap the pill, and check with `elementFromPoint` that nothing is over it.
- **A kill pattern must never match your own command line**: `pgrep -f "r720/run.sh"` in a command containing that
  text killed the shell running it. Find PIDs with `ps -eo pid,args | grep …` first, then kill by number.
- **The Note view is two things**: the place for an āyah's notes (retired by decision 95, rounds 1–2b) and the āyah
  study screen behind the Approach Track/Guide card (landing wheel, Explore → Guide), QCR/Asma references and `?goto=`
  links. The second still opens it; moving those needs the Guide and QCR's group navigation to live elsewhere first.

## 3. The handover guard

`allocate-version.py` appends every release to the handover that `CLAUDE.md`'s "READ THIS SECOND" block names, and
`brief-integrity.mjs` fails when that handover does not name the version in `app/js/version.js`.

## Releases by this session

| Version | What changed |
|---|---|
| v09.136 | Notes and bookmarks on a dua |
| v09.137 | `bn.js` hidden duplicates removed (Builder #668) |
| v09.138 | A hadith card's 📝 My Notes has ← Back |
| v09.139 | Mushaf view follows the chosen unit (decision 93) |
| v09.140 | ← Back from Notes on the Qur'an page and Import Notes (Builder #672) |
| v09.141 | Newer screens checked in Bangla; Dawah ← Back (Builder #677) |
| v09.142 | Most-used screens checked in Bangla (Builder #680) |
| v09.143 | A Name's cited āyāt in Explore → Asma |
| v09.144 | Every remaining page checked in Bangla (Builder #684) |
| v09.145 | A Name's cited hadith in Explore (Builder #690) |
| v09.146 | Listening bookmark, ⋮ → QCR, 🔖 on the writing sheet, full-screen pop-out, Word from an end mark |
| v09.147 | About page's feature registry in Bangla (Builder #693) |
| v09.148 | The end of an āyah stays put; a new āyah opens at its top; the Note view pop-up keeps its way back |
| v09.149 | One 📝 Note on the Āyah card; 📖 is Full text (decision 94) |
| v09.150 | The Journey tray at desktop width (Builder #701) |

Test-only, no version: Builder #697 (PRs #698 and #703), a Bangla sweep of the v09.143–v09.149 surfaces, 82/0, no
English found. Builder #705 (PR #706), `bn-duplicate-keys` made meaningful again, 6/0.
- **v09.151** (2026-10-09): dua words link only to a Qur'an word that agrees with their vowels (Builder #712).
- **v10.01** (2026-10-09): the Read view's 📝 Notes pane (decision 95, round 1; opens the v10 line, decision 97).
- **v10.02** (2026-10-09): Check a dua, the review screen on the Dua card (decision 96, Builder #716).
- **v10.03** (2026-10-10): the Notes pane's Track this āyah tab; the Āyah card's 📝 Note opens the pane (decision 95, round 2a).
- **v10.04** (2026-10-10): the writing sheet's ✅ Record, for every family member (Builder #719).
- **v10.05** (2026-10-10): the Notes pane round 2b: the Note view's notes doors open the pane (decision 95).
- **v10.06** (2026-10-10): QCR / Asma attach as its own pop-up, without the Note view (Builder #722).
- **v10.07** (2026-10-10): Legacy App - v09: v09.151 archived (decision 98).
- **v10.08** (2026-10-10): the Asma ul Husna screensaver on every page.
