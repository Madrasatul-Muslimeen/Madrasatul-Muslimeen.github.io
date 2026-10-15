# MMSA session handover, 12 Oct 2026

Written by the MMSA Architect, session `session_015GBL8aB9mfR2h1FyDQjoFb` (11–12 Oct 2026, v10.24 → v10.28). It
supersedes `docs/reports/2026-10-11-MMSA-SESSION-HANDOVER.md`, which is kept as history (its release list runs to
v10.28). Read `CLAUDE.md` first. The prompt that starts the next session is
`docs/governance/NEW-SESSION-PROMPT-2026-10-12.md`.

This session was summarised once (its context compacted), which is why it hands over here.

## LATEST UPDATE — 15 Oct 2026, evening, session `session_011ZoZQoxPx6xnm1mzR5hSYn` (v10.56 → v10.63) — READ THIS FIRST

The 12:22 pm block below is kept as history.

**Released in this stretch** (each has its Try line in its PCF job, and its line in the User Manual's "🆕 What's New"):
- **v10.57:** audit part 3 (J29, round #844). `app/css/admin-touch.css` gives 40px controls on Asma, Records, Monitor, People, Classes, Homework, Curriculum, Catalogue and Hadith.
- **v10.58:** audit part 4 (J29, round #847). A 68px Zab spacer on phones, 40px nav-menu controls, and menus that scroll inside themselves.
- **v10.59:** the Owner's photo (J25): **the 🧰 docks in the Wheel / Legend / Unit row on a phone** (`[data-zab-dock]`).
  - The floating corner hides while the dock is on screen.
  - Elsewhere the corner sits above pinned bottom bars (`[data-zab-lift]`: `#tabRow`, `#readQuickRow`).
  - Built by the Architect; suite `zab-dock-browser`.
  - The Owner also confirmed **Zab works on the live Rules** ("Working", J25).
- **v10.60:** audit part 5 (J29, round #850). admin-touch on six more pages, plus the study modules' person picker.
  - Two stale Dawah checks were repaired: the Zab Rules file was missing from `dawah-boundary`'s published list, and `dawah-screen` now accepts `?back=1`.
- **v10.61:** the Owner's J26 choice **A**. Know Your Status shows "Before Al-Fātiḥah: Aʿūdhu billāh ● · Bismillah ●" under each Approach, and the band is capped on wide screens. Built by the Architect; suite `kys-opening-line-browser`. **J26 is done.**
- **v10.62:** audit part 6 (J29, round #853). 40px buttons on the Qur'an page's wheel pill, Read bar and Explore, and "+ New Note".
  - The Notes window's ✕ was off a 320px screen and is back.
  - The review added a 320px case so the `rnpback` mutation can fail.
- **v10.63:** audit part 7, item 1 (J29 item 12, round #856). The "← Back to Know Your Status" pill no longer covers the Approach tab (`bookmark-nav.js` respects `[data-zab-lift]`). `quran-my-status-browser` runs to the end again.

**New PCF General rules, both in `CLAUDE.md`:**
- **Time on every update (PCA J45):** a full UTC `at`, read off the clock. **Read the clock every time** — this session twice wrote a guessed time and had to correct it.
- **🆕 What's New (PCA J46):** one line per release at the top of `p/mmsa.manual`, written in the same step as the release.

**In flight:**
- ~~Builder round #858~~ **released as v10.64** (6:20 pm, 15 Oct, session `session_01VugmUfoMMcfxmnW99UmXgm`): QCR collection controls and the Trash Back button at 40px. Left in J29: the verb table (not audited), the Mushaf view's rendered pages (not measurable here), and the 22px QCR āyah-number badge (older, found in review). The PCA then lifted the hold for audit fixes in QR modules: round #860 (PR #861) released as **v10.65** (the badge fixed; verb table and Mushaf clean). **Found in that review:** `wheel-centre-browser` fails 14 since v10.62 (the 40px Take an Approach button pokes out of the hub at 320/360px): **fixed in v10.66** (drawn size again, 40px tap area via `::before`). **Lesson: a round that resizes a control must run the suites that own that control's geometry (here `wheel-centre-browser`), not only its own.** Then round #863 (wheel labels cut at the wheel's edge) released as **v10.67**; its run opened no PR, so the Architect did. **Open in J29:** one Asma slice caption cut at 1440 en (wording); `tablet-wheel-browser` fails 2 on main (landing wheel 638–644px at 700, wants 650), traced to v10.53's 40px tabs (by design) and the check updated (PR #865). Round #866 (audit part 11: the manual's reading features each checked WORKING) released as **v10.68**. **QR Stage 1 (PCF J30, from the PCA's J50 hand-over):** hide General Study, Nature-Life, Life Skill and Health from every entry point, nothing deleted; Builder round #868 dispatched 11:04 pm; the Owner wants it released as **v11.00** (two tick questions in J30: v11.00 vs v11.01, and a legacy-v10/ copy). **New PCA hold:** no new work in General Study, Nature-Life, Life Skill or Health.

**THE QR SPLIT (PCA J50, the Owner, 15 Oct ~5:30 pm):** QuranRevival becomes its own separate site and app (Qur'an, Hadith, Dua, Asma and "LDOG"); MMSA stays for Madrasah use. The PCA recommends the same Firebase, a start at madrasatul-muslimeen.github.io/quranrevival/, and a new QR Master Architect from 16 Oct; MMSA removes those parts only after QR is live and redirects work. **Until the PCA sends the hand-over list: start NO new work inside the QR modules beyond fixes already in flight** (round #858 is the last such).

**Waiting on the Owner** (tick lists in every report):
- **J03 Q1:** which keys to add.
- **J50 (PCA-led):** split QuranRevival from MMSA.
  - The facts were sent to the PCA, and the PCA now recommends QR 1 (its own home and menu on the same site, one Firebase).
  - **No split work until the Owner ticks.**

**Lessons from this stretch:**
- **A pinned bar stays on screen while the page scrolls.** v10.58 measured only at the page's end and missed the 🧰 over the tabs; the Owner's photo found it. Measure covering part-way down the page too.
- **Measure at 320px.** v10.62's Notes-window defect existed only there, so its mutation could not fail at 390.
- **An unproven mutation is a finding:** chase it until it fails for the right reason.
- **Never `pkill -f` a name that appears in your own command line;** it killed the shell and both servers.
- **A container restart loses background checks.** Write each check's result to a file in the scratchpad as it finishes, so a restart only costs the unfinished ones.
- **A PCA relay can say a job is filed before it is.** Confirm the write succeeded before replying "filed".
- **The issue body must not contain `@claude`.** It starts a second, duplicate run (#1290 did). Start rounds only with `workflow_dispatch`.
- **Old stale checks found on `main`:** `dawah-*` (fixed in v10.60) and `quran-my-status-browser` (fixed in v10.63). Run the suites of the area a round touches, not only the round's own.

## LATEST UPDATE — 15 Oct 2026, 12:22 pm Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.50 → v10.56) — READ THIS FIRST

**Released in this stretch** (each has its Try line in its PCF job):
- **v10.51 and v10.53**: audit part 1 (J29). The Qur'an face in Bangla, 40px targets, the Unit pill grid, popups below the nav, the Āyah card heading and ladder, and Bangla digits.
- **v10.52**: Keys to Understanding K2 (J03). The saving layer and a Rules candidate (`docs/governance/2026-10-15-ayah-keys-candidate.rules`). This is **not** published.
- **v10.54**: audit part 2 (J29). 40px targets on Mapping My Journey, Bookmarks and the Hadith pickers.
- **v10.55**: **Zab switched on** (J25).
  - The Owner published the Zab Rules ("Published") and said in the chat "Yes, switch Zab on".
  - `firestore.rules` now equals `docs/governance/2026-10-14-zab-candidate.rules`, and `zab-readiness.js` is `ready: true`. See `docs/reports/2026-10-15-zab-enabled.md`.
  - Not yet proved live: the Owner's first Try will show whether the live Rules accept Zab's writes (add an item in 🧰, reload, and it is still there).
- **v10.56**: Arabic word boxes in the Word card's Intermediate "Meanings of this word" rows (J23). Also the Owner's **W-T-P-E-O** rule in `CLAUDE.md`.

**In flight:**
- **Builder round #844**: audit part 3, covering Asma ul Husna, the Writing sheet, Dua cards, Records, Monitor, People, Classes, Homework, Curriculum and Catalogue.
- Its branch is `builder/issue-844-run-1286`. It was dispatched at 11:25 am, 15 Oct, and had opened no PR at 12:08 pm.
- **Next:** review it by measurement and run every mutation it lists. Run `behaviour.mjs` and `phone-width-overflow.mjs`. Note that the Zab bar is now on every page, so check it covers no page's bottom controls. Then open the PR yourself if the Builder did not, release it as the next version, and dispatch the next round.

**Waiting on the Owner** (keep these in every report, as tick lists):
- **J25:** try Zab once, to prove the published Rules work.
- **J26:** one tick for Know Your Status: A, one small line under each Approach (recommended), or B, leave it.
- **J03 Q1:** which keys to add.

**The PCF routines now in force:**
- **PCA J37:** rewrite `p/mmsa.monitor` at every step, and stamp `act {at, by:"MMSA", what}` on every job you write.
- **PCA J39:** every finished job ends its Done line with a one-line W-T-P-E-O check.
- **"Important" marks:** check for `important: true` and `imp: true`, and do those first.
- **PCA J43:** when the session gets long, write this block and send the PCA "PCA ▸ handover ready".

**Lessons from this stretch:**
- Changing `firestore.rules` or a readiness gate needs the Owner's own word in this chat. The session's safety check refused it on a PCF relay alone.
- Run browser suites for a second branch on `PORT=8081 node serve.js` with `QR_BASE=http://localhost:8081`, from a `git worktree`. That way the suites running on :8080 are not disturbed.
- The phone-width suite is `phone-width-overflow.mjs`, not `...-browser.mjs`.

## LATEST UPDATE — 15 Oct 2026, 1:45 am Sydney, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.44 → v10.50) — READ THIS FIRST

The 14 Oct block below is kept as history.

- **`main` is v10.50.** **The Zab plan (PCF J25, the Owner's answers 1 B, 2 A, 3 B, 4 B) is complete**, rounds Z1–Z6:
  - v10.45: saving layer and Rules candidate;
  - v10.46: the bar on every page;
  - v10.47: tasks and links;
  - v10.48: ideas and shopping;
  - v10.49: → Note into Mapping My Journey, plus a visible ← Back on `journey-map.html` for `back=1`;
  - v10.50: pockets inside pockets and the phone Drawer.
- **Zab is behind `app/js/zab-readiness.js` (`ready: false`).** Nothing of it shows or reads until two things happen:
  - the Owner publishes `docs/governance/2026-10-14-zab-candidate.rules`. It is final: today's live Rules plus 143 Zab lines, nothing removed. J25 "ready to publish".
  - the Architect then enables the gate with a recorded decision, copying `siyagah-flags-readiness.js`, AND syncs `firestore.rules` to the published file in the same change.

  Then post a Try (phone) line in J25.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner:**
  - J25: publish the Zab Rules.
  - J23: the two questions from the Owner's deleted J27:
    - restore the Arabic word boxes as on Basic, and on which tab;
    - which "Attach" button. The Note editor's 🖼 picker opens the file chooser on a real tap (new check in `journey-note-images-browser`). If the Owner means the PCF's own attach, that goes to the PCA, who alone changes the PCF page code.
  - J26: Know Your Status, A or B.
  - J22: the Owner's tries only.
- **Possible next, with nothing needed from the Owner:**
  - The Owner's standing rule says audit the app feature by feature (the PCF User Manual, J19, is the checklist; it is current to v10.44). Add Zab to the manual first.
  - The J26 polish (cap the band's width on wide screens) is noted in J26's plan.
- **Lessons from this stretch:**
  - Builder rounds often stop early (Z3 pushed no browser checks and no PR); write the missing suite yourself.
  - Look at every screenshot: Z2's item text was squeezed to a few letters wide with every check green.
  - A mutation that crashes with a timeout is detected but uncounted; wrap each width's flow so it fails by name.
  - Read every time off the clock (`TZ=Australia/Sydney date`) and keep the PCF monitor line under an hour old.
  - Cross-check PCA relays against the PCF itself: the Owner had answered 4 Zab choices, not 2.

## LATEST UPDATE — 14 Oct 2026, session `session_01EU951Kr2tQxWqNbKLvZjPn` (v10.39 → v10.44) — READ THIS FIRST

The 13 Oct block below is superseded by this one and kept as history.

- **`main` is v10.44** (read it off `app/js/version.js`). This session released:
  - v10.40 (J24, the dragged wheel no longer hides Wheel / Legend / Unit);
  - v10.41–v10.43 (J23: level sentences, the top of the card in layout B, the mark choice B question);
  - v10.44 (J26: the "Before Al-Fātiḥah" band; new permanent key `opening:taawwudh`, stored in chunk `surah_1`).

  It also copied the Owner's published guardian Rules into `firestore.rules` (J15, PRs #808/#810; the Owner confirmed a
  student works) and published Scholars Database v1.5 (J17, PR #817).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **New General rules in the PCF, binding on every session:**
  - "Keep working, never idle" (also in `CLAUDE.md`).
  - URGENT/NOW first, dimmed is not ignored.
  - An hourly status (monitor) line with Sydney time.
  - The work-design rule "space and elegance" (14 Oct): calm and tidy, nothing crowded, nothing wasted, lines aligned,
    extra detail one tap away. Look at the screenshots in review.
- **The Project Chief Architect (PCA) session** coordinates through `PCA ▸` lines in the PCF and cross-session
  messages. Act on them within the brief; verify the Owner's own words in the PCF (comments by "You").
- **Waiting on the Owner (tick boxes in the PCF):**
  - J26 Q5: should Know Your Status list the two new items (A, one calm line under each Approach's tiles) or not (B)?
  - J22: remove Tawakkul's Bismillah row with ×, and try saving for everyone.
  - J24: add the Bangla Approach-list heading in the Catalogue.
  - J03 Q1: which keys to add.
  - J20: paste Approach 1's line into the Catalogue.
  - Older: J02, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Next for the Architect:**
  - J25, Zab inside QuranRevival: write the plan once the SIY Architect's "how Zab is built" guide (SIY J02) exists;
    the PCA was asked for it.
  - Otherwise the standing rule applies: audit the app feature by feature (the PCF User Manual is the checklist, J19;
    it is current to v10.44) on phone, tablet and desktop, and file each defect as a PCF job.
- **Review lessons from this session:**
  - Builder rounds #812–#814 each needed one stale check updated in place. The one in `ayah-action-sheet-boundary`
    sat red on `main` from v10.42 until v10.44: run the `ayah-*` suites too when the Word Card's header changes.
  - Re-run the touched suites after merging `main` into a round that touches `quranrevival.html`.

## LATEST UPDATE — 13 Oct 2026, session `session_019dnykSt8zmrCun2mLZKysQ` (v10.28 → v10.39) — READ THIS FIRST

- **`main` is v10.39** (read it off `app/js/version.js`). This session released v10.29–v10.39 and merged PRs #777–#803;
  decisions 107–110 are recorded. The release list is in section 5 below; `CHANGELOG.md` has every account.
- **The PCF's General rule "Programme Lead" binds every MMSA session** (the Owner, 12 Oct): read the PCF first, act on
  any "PL ▸" line before other work and reply under it, clear a 📣 Notify flag. It is also an MMSA project rule.
- **Anything you need from the Owner goes in the job's "What I need from you" list as a tick box, never only in
  Comments** (the Owner could not see a J15 request that sat in Comments).
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **Waiting on the Owner (tick boxes in the PCF):**
  - **J15:** "copy the Rules". The Owner published the guardian Rules
    (`docs/governance/2026-10-12-guardian-roster-candidate.rules` = live file + one rule). Copying them into
    `firestore.rules` is a protected step: this session's tooling refused it without the Owner's explicit word. On
    the tick, copy them and update `tools/firestore-emulator/roster-access.rules.test.mjs` to test the live file with
    the guardian rule (plus a mutation that removes it), then run `npm run roster-access`.
  - **J23:** the inherited-Achieved press (A this place only, needs a Rules step for the totals counters; B change the
    other mark; C as now), and the new Word card layout (A/B/C, mock-ups at
    https://claude.ai/artifact/P872EWyvP3z2Btt2q16Gcp, also `docs/reference/2026-10-13-word-card-layout-mockups.html`).
  - **J20:** paste Approach 1's line into the Catalogue (the template carries it since v10.39; the tenant's copy does not).
  - **J22:** Tawakkul's Bismillah row: the Owner removes it with × (choice A). Try saving for everyone (v10.38).
  - Older: J02 (the 2:228 demo, Scholars drafts), J17, J03 Q1, J05, J06, J07 (Upgrade by about 6 Jan 2027).
- **Architect's own, ready to do:**
  - **Scholars Database v1.4** is built on branch `scholars-v14` (commit 6c0b51b5, not merged): all 68 scholars with
    birth/death AH+CE, political authority, madhab, and a written date for every book (137; 125 estimates, all drafts).
    To ship: merge it, then publish `docs/reference/scholars-database/Scholars Database - v1.4.html` to
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi after reading the WHOLE file (about 60k tokens; read it in
    parts, it is one long data line). Ask the Owner the one open question in `v1.4-changes.md` (al-Arnāʾūṭ's book).
  - The Read bar at 320/360px with a wide phone font is still two rows (v10.37); one row there needs a layout choice.
  - `match_wikt.py` was not re-run (it needs the kaikki download); other "form of" pointers may hide wrong matches.
  - `quran-word-card-integration.mjs` (fixed in #802) still THROWS on a failed binding instead of counting a FAIL.

## 0. Where things stand

**The Owner now reads and answers in the Project Control File (PCF):** https://claude.ai/artifact/PhW1KKX28qrqj9dE7Ha8dZ,
section **`mmsa`**. It is one live page shared by all the Owner's projects (MMSA, Siyagah, Basheera Wa Nazeera).
`CLAUDE.md`'s PERMANENT RULE says how to use it. **Read it first and update it last, every session.** When this was
written it held 14 jobs (J01–J14), 4 guides (G01–G04) and 17 project rules. Nothing in it was marked New, and the inbox
was empty. The status board (#159) and the handovers carry on as before; the PCF is where the Owner looks.

- **`main` is at v10.28.** Read the live number off `app/js/version.js`.
- **Nothing is in flight.** No Builder round is running and no PR is open.
- **This session's releases** (all merged, all served by GitHub Pages):
  - **v10.25:** Al-Fātiḥah's āyah count in the Āyah card's Full text (Bismillah is not āyah 1 there); مَشْهُود joins
    the witness meaning group (Owner's screenshots).
  - **v10.26:** the ⋮ "has a note" mark is kept for every āyah the ⋮ sheet looked up this session.
  - **v10.27:** 🔖 on the Mushaf bar; the Meaning switches moved up onto the Read bar; the Asma Name bar's "◂ Wheel"
    (decision 102, option 2; `asma-quick-class` 5c green).
  - **v10.28:** the Word card's Intermediate tab: four levels, WbW · Basic · Intermediate · Depth (decisions 101, 103).
    **The Owner published the Rules** that let `intermediate` be written.
- **Test-, data- and governance-only merges** (no version):
  - PR #772, #773: the PCF rule in `CLAUDE.md`.
  - PR #774: `npm run lemma-levels` (Firestore emulator) now tests the live Rules. It was stale since its candidate was
    published. Proven: live 1/0; live with basic+depth removed 0/1; the old candidate 1/0.
  - PR #775: the Owner's **Scholars Database**: v1.1 kept as sent; v1.2 with 4 new columns and 48 scholars, drafted by
    Claude for the Owner to check. Folder: `docs/reference/scholars-database/`. Live page:
    https://claude.ai/artifact/51ACYVU6hBKs7jx32rpAUi. It saves itself (✎ Edit, ✓ Checked, Save → v1.3 …). **Read it
    before building on it, and take its saved `<script id="data">` JSON back into the repo**; see the folder's
    README.
- **Decisions 104–106** (12 Oct, answered in the PCF) are in `docs/governance/2026-09-27-owner-decisions.md`:
  - 104: one PCF section; the three proposed rules kept; the first PCF deleted.
  - 105: the scholars, T20–T22. Build a database by era on the Owner's own. Claude drafts and the Owner edits. The
    scholars stay locked for an āyah until the reader has written their own understanding. A demo comes first.
  - 106: Asma screensaver defaults confirmed.

## 1. What waits on the Owner (keep reminding, decision 102)

All of these are on the PCF's **Your turn** list, one line each, and must stay in every report until decided:

1. **J02:** check the Scholars Database v1.2 drafts (filter "Drafts to check"; ✓ Checked; Save).
2. **J03:** Keys to Understanding, the 6 questions, now written out in J03 itself.
3. **J05:** the Ten Steps tab's pending items T9–T15 (master file, Ten Steps tab).
4. **J06:** HadeethEnc permission, and yes or no to the permanent key `hadith:openiti:<book>:<n>` (decision 90).
5. **J07:** Google Cloud: click **Upgrade** before about **6 Jan 2027**.
6. **Parked** (J08, J09, J11–J13): QuranRevival standalone store app; the QR ↔ MMSA integration map; Al-Munshiʾ
   Arabic, Letters, the family sign-up step; the Mastery Wheel per Study Unit; D14 timezone.

## 2. The next job (needs nothing from the Owner)

**J02 step 2: the demo** on one āyah of rulings, **2:228**, across the 13 scholar Approaches (28 Sahaba, 29 Tābiʿīn,
30 Gen1 … Gen6, 32–35 the madhabs, 36 groups and sects), by era. Its Scholars panel stays **locked until the reader
has written their own understanding** of the āyah (decision 105). Sources and method are in the master file's
"Connecting an āyah to the Scholars' Approaches" section and its Approach Map "Connect an āyah" column
(https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1). Use the Scholars Database rows for each book's author, era and
madhab. Show the scholars' own words, never an AI summary, and mark every passage with its book and source. **This
sandbox cannot reach `api.quran.com`.** Try the open tafsir data on cdn.jsdelivr.net (`spa5k/tafsir_api`) and
OpenITI, and say plainly which passages could not be fetched. Build nothing in the app until the Owner OKs the demo.

## 3. Sandbox lessons from this session

- **A Firestore emulator run that is killed leaves Java holding the port**, and the next run says "port taken". Stop
  it with `pkill -f cloud-firestore-emulator` before re-running.
- **A release PR's `verify` is red before merge by design**: programme-ledger, -mutations and brief-integrity read
  `origin/main`. Run the other suites locally, then merge with a merge commit and `expectedHeadSha` (the full 40-char
  SHA).
- **The PCF and the Scholars Database are artifacts that save themselves.** Always read before you write. In the PCF,
  pin every write with `if_version` and never write `layout`.
- The 11 Oct handover's sandbox lessons still hold: unshallow `main`; fetch the two held branches; symlink
  `playwright`; restart `node serve.js` after a container restart.

## 4. Routines on this account (leave them alone)

- **"PCF check – all projects"**: every 4 hours, Sydney time. Created by the Owner's other session; it acknowledges
  new PCF items.
- **"Siyagah PCF check"**: Siyagah's own.
- **"Monthly PLANS reminder"**.
- **"MMSA Task Bridge"**.

This session's own MMSA-only PCF check was deleted, with the first PCF, on the Owner's word (J01).
- **v10.29** (2026-10-12): student accounts can open the app (the roster read every page makes).
- **v10.30** (2026-10-12): the Read bar is one line again at 600-679px.
- **v10.31** (2026-10-12): a QCR āyah opens in the Read view, with Back to QCR.
- **v10.32** (2026-10-12): Keys Round 1: related hadith on the Āyah card, and the āyāt a hadith quotes.
- **v10.33** (2026-10-12): bookmarks for children show who they were saved for; a unit choice in Bookmark this.
- **v10.34** (2026-10-12): the Bookmarks page's + New bookmark files an Owner's folder by name for a child (Builder round #789).
- **v10.35** (2026-10-12): a bookmark save keeps the Mushaf page; QCR + Add āyah follows the Al-Fātiḥah count (issue #786).
- **v10.36** (2026-10-12): the Mushaf page reference shows from the first page, so a bookmark save no longer grows the Read bar (Builder round #792).
- **v10.37** (2026-10-12): the Read bar stays one row with the Meaning switches on a phone (Builder round #794).
- **v10.38** (2026-10-12): bookmarks for several people at once keep their folder, and tapping an existing bookmark asks before removing it (Builder round #797, PCF J22).
- **v10.39** (2026-10-12): Word card: the stem box always has a meaning and the wrong dictionary meanings are gone; Approach 1's self-learning line, with links in Approach guides (PCF J23, J20).
- **v10.40** (2026-10-13): a dragged landing wheel no longer hides Wheel / Legend / Unit on a phone (PCF J24).
- **v10.41** (2026-10-13): the Word card's level totals as one sentence each, layout B (PCF J23).
- **v10.42** (2026-10-14): the top of the Word card in layout B (PCF J23).
- **v10.43** (2026-10-14): J23 mark choice B: ask before changing the other mark.
- **v10.44** (2026-10-14): J26 Before Al-Fatihah band.
- **v10.45** (2026-10-14): Zab Z1: saving layer and Rules candidate.
- **v10.46** (2026-10-14): Zab Z2: the bar and plain pockets (gated).
- **v10.47** (2026-10-14): Zab Z3: tasks and links (gated).
- **v10.48** (2026-10-14): Zab Z4: ideas and shopping (gated).
- **v10.49** (2026-10-14): Zab Z5: to Note (gated).
- **v10.50** (2026-10-14): Zab Z6: pockets inside pockets (gated).
- **v10.51** (2026-10-14): Audit: Qur'an face in Bangla and on word chips.
- **v10.52** (2026-10-14): Keys K2: saving layer and Rules candidate.
- **v10.53** (2026-10-14): Audit part 1, fixes 3-9 (J29).
- **v10.54** (2026-10-14): Audit part 2 (J29).
- **v10.55** (2026-10-14): Zab switched on (J25).
- **v10.56** (2026-10-15): Arabic boxes in Meanings of this word (J23).
- **v10.57** (2026-10-15): audit part 3, 40px touch targets on the admin and study pages (PCF J29).
- **v10.58** (2026-10-15): audit part 4, room for the Zab button on phones, 40px menu links (PCF J29).
- **v10.59** (2026-10-15): the Zab button moves into the Wheel / Legend / Unit row on a phone (PCF J25).
- **v10.60** (2026-10-15): audit part 5, finger-sized controls on the remaining pages (PCF J29).
- **v10.61** (2026-10-15): Know Your Status shows Before Al-Fatihah under each Approach (PCF J26).
- **v10.62** (2026-10-15): audit part 6, finger-sized buttons on the Quran page (PCF J29).
- **v10.63** (2026-10-15): the Back to Know Your Status pill no longer covers the Approach tab (PCF J29).
- **v10.64** (2026-10-15): finger-sized controls in QCR collections and on the Trash page (J29 audit part 8, PR #859).
- **v10.65** (2026-10-15): the QCR āyah-number badge shows the whole reference (J29 audit part 9, PR #861).
- **v10.66** (2026-10-15): the wheel pill sits inside the centre circle again on a small phone (J29 item 16).
- **v10.67** (2026-10-15): wheel labels no longer cut at the wheel's edge (J29 audit part 10, round #863).
- **v10.68** (2026-10-15): the Read view's ⋯ tools panel stays on a small phone's screen (J29 audit part 11, PR #867).
