# MMSA session handover, 8 Oct 2026

Written by the MMSA Architect, session `session_018hss8x9uWFDvF1EebJWT2i` (7–8 Oct 2026), at the Owner's
"see you in next session". It supersedes `docs/reports/2026-10-07-MMSA-SESSION-HANDOVER.md` (kept as history).
Start from `docs/governance/NEW-SESSION-PROMPT-2026-10-08.md`.

## 0. The exact pause point: start here

Read the live state yourself (`app/js/version.js` on `origin/main`, open pull requests, the "Active Architect
session" line on #159).

**UPDATE, 9 Oct 2026, session `session_01J6tdKAiaMqQEPd6xFJoZ2J` (took over at v09.135; #159 names it):**
- Builder #665 had already been merged (PR #666, test-only, no version) before takeover.
- **v09.136 (this session): Notes and bookmarks on a dua** (ADR-009 §9: `dua:<n>` → `dua-unit`; `notes.html` ← Back;
  a reopened Dua card now stays on screen). Queue item "Notes and bookmarks on a dua" is DONE.
- **Builder #668 in flight:** remove the 65 shadowed duplicate keys from `bn.js` (34 identical, 31 different; the last
  copy wins and stays). Review per the prompt's Step 5; check that the `BN` object is deep-equal before/after.
- **v09.137 (Builder #668, PR #670):** `bn.js`'s 66 shadowed duplicate lines removed; `BN` deep-equal before/after.
- **v09.138:** the HadeethEnc card's Notes link has ← Back to the same hadith; `study-note-service.mjs` runs again
  (35/0). `study-note-boundary.mjs` was never red on `main`: its failure here was the shallow clone.
- **Builder #672 in flight:** way-back sweep (the Qur'an page's two links into Notes; Import Notes). Review check-in armed.
- **Watch:** `dua-note-bookmark-browser`'s Bangla "Back lands on Dua 20" failed ONCE while behaviour ran beside it
  (card neither focused nor on screen: probably the page restored from the back-forward cache under load); 0 of 9
  runs alone. If it recurs, look at `pageshow` (persisted) in `hadith-browser.js`.
- **Sandbox:** `ln -s "$(npm root -g)/playwright" node_modules/playwright` (and `playwright-core`) before any browser
  suite; `git fetch --unshallow origin main`, `origin claude/pensive-knuth-2pu3jj` and `origin claude/phase4-wiring`
  before `brief-integrity`/`programme-ledger`, or they fail on missing history.
- **The Owner's "MOST IMPORTANT" research (9 Oct):** the article "Quran for Critical Reasoning" (10 steps in 4 levels)
  mapped onto Approaches 14–27, the QCR collections and the year bands:
  `docs/reports/2026-10-09-quran-critical-reasoning-ten-steps-and-qr-levels.html`, published at
  https://claude.ai/artifact/BJUwQ8hfgnu4FJFo7stqY1 . **Four questions wait on the Owner** (the names of their 10 added
  Approaches; whether Discussion and "Understanding of the Scholars" move before Judgement / Authority; Tadabbur Y5 vs
  Tafakkur Y6–12; which of the five proposals first, recommended: the Approach guides, then a question card demo).
- **Still possible next:** the dua review screen (demo first); Hadith Studied/Notes on OpenITI passages (needs the
  Owner's yes to the key).

**LATEST UPDATE, 8 Oct 2026 (late), session `session_0116koLYBSQ7JHAmhYUWAkBX` (took over at v09.121): `main` is at
v09.135.** This block supersedes everything below it in section 0; the older text is kept as history.

**Released by this session** (each fully in `CHANGELOG.md`):

| Version | What changed | Decision |
|---|---|---|
| v09.122 | Mapping My Journey pop-up: three panels fill the window and resize; gold grips on every pop-out. | Owner |
| v09.123 | Asma ul Husna in Explore: ‹ › on a Name; the poster fills its panel. | Owner |
| v09.124 | The way back sits beside ✓ on the Read bar (`back-dock.js`). | 86 |
| v09.125 | Word card: "of the Qur'an" only on the "You know" box's bottom line. | Owner |
| v09.126 | File in folder(s): full screen, ← Back, the keyboard stays, faster (prefetch), folders fold. | Owner |
| v09.127 | Āyah card: ✍ Take Note opens the Note view ready to write; 👥 family recording proven on the card. | Owner |
| v09.128 | File in folder(s): Siyagah's header (📚, ◀ ▶, section picker, 🎨). | Owner |
| v09.129 | Dua cards: the dua's own words (`dua-words.js`), large, in the Quranic font; the narration in a fold. | 89 |
| v09.130 | Hadith in English and Bangla (hadith-api, eight books, by standard number). | 89 |
| v09.131 | Dua words rounds 0–1: narrators' words out; each word opens its Qur'an word and the Word card. | 90 |
| v09.132 | Dua words rounds 2–4: Qur'an spellings and «و»; the Dua word card; Word-by-Word progress via the Word card. | 90 |
| v09.133 | Dua words round 5a: vowels, word for word from Hisn al-Muslim and HadeethEnc; **decision 91 written into CLAUDE.md**. | 90, 91 |
| v09.134 | Dua words round 5b (Builder #663): grammar suggestions (CAMeL Tools) for words the Qur'an lacks. | 90 |
| v09.135 | Dua words round 6: progress on every word, key `duaword:<dua>:<position>`, one records chunk per dua, no Rules change. | 92 |

**In flight when written:** Builder round **#665** (repair the two Word card suites red on `main`:
`word-card-pc-boxes-browser`, `word-progress-practising-browser`). Review it per the prompt's Step 5 when it lands
(its branch is `builder/issue-665*`); this session's review check-in will do nothing once #159 names the new session,
so **arm your own review check-in on takeover**.

**The research report** "Dua words that work like Qur'an words": https://claude.ai/code/artifact/de27ba8c-24df-4661-a366-f1ed31a44db7
(all six rounds now built; the Owner's answers are in it and in decision 90).

**THE QUEUE now (decision 91: keep working, keep the Builder busy, ask only for a real choice):**
1. Review and merge Builder #665; then dispatch the next Builder round.
2. **Possible next, offered to the Owner but not asked for** (start one when the queue is empty, demo first if it is a
   new screen): a review screen where a person confirms or splits dua groups and checks a dua's picked words, vowels
   and grammar suggestions (everything Dua is still "to be checked"); Notes and bookmarks on a dua; Hadith "Studied",
   Notes and bookmarks on OpenITI passages (needs the Owner's yes to the key `hadith:openiti:<versionUri>:<n>`).
3. Tidy-ups recorded, not done: 31 phrases written twice in `bn.js` (only the later shows; removing the earlier,
   shadowed copies changes nothing on screen, a safe Builder round).


**`main` is at v09.113** when this was written. Released in this session, each fully recorded in `CHANGELOG.md`:

| Version | What changed | Decision |
|---|---|---|
| v09.108 | The full-screen writing paper (Builder #627, reviewed and fixed after the unattended merge). | 83 |
| v09.109 | Word card: root and family bigger, Wiktionary first, Lane / Hans Wehr open at the root. | Owner, 7 Oct |
| v09.110 | Explore's Ayah numbers upright, 12 px, never colliding. | 84 (4) |
| v09.111 | 🗑 on every bookmark and folder in the Bookmark menu, with Undo. | Owner, 7 Oct |
| v09.112 | The Asmaul Husna poster: a true copy of the Owner's template, references opening in the app. | 85 |
| v09.113 | Word card clean Arabic, readable places, derived-form pop-ups; Āyah card ‹ › / 📖 / action row; **the way-back law**; poster and writing-paper fixes. | 86 |

No Builder round is running and no pull request is open.

**Update, 8 Oct 2026, session `session_01QFqAPBJsmgyJ3QXw12JM22` (took over at v09.113):** `main` is at **v09.121** (v09.121: one card per dua, progress once under `dua:<n>`, decision 88 done).
**The Hadith database is being built in rounds:**
- **H-DB1 (v09.114, done):** al-Adab al-Mufrad, al-Nasa'i's and Ibn al-Sunni's 'Amal al-Yawm wa'l-Layla, al-Nawawi's
  al-Adhkar pulled and split (15 books).
- **H-DB2 (v09.115, done):** the standard numbers, matched by words (`hadith-concordance.mjs`, numbers only), shown on
  each narration and used by "Go to hadith number"; Muslim can be jumped by Abdul-Baqi's number.
- **H-DB3 (v09.117, done):** HadeethEnc's Bangla/English linked by words to the narrations they translate
  (`hadeethenc-openiti-links.mjs`, 2,163 of 3,574 linked) and shown in a fold under the Arabic.
- **H-DB4 (v09.119, done):** the Dua tab: the Dua chapters of 11 books, "Also narrated in" across books, ways back.
  **Next for Dua (waits on the Owner):** one card per confirmed dua with progress counted once (the demo,
  https://claude.ai/artifact/LxHMM7PhPAKQ1pKbYz5kxT) needs a person to confirm the groups and the Owner's yes to a
  new permanent key `dua:<n>`.
- **Asma descriptions (v09.120, done).**
- **H-DB5 (v09.121, done; decision 88):** the Duas view, one card per dua, progress under `dua:<n>`; permanent
  numbers in `output/dua/registry.json` (never edit by hand; a re-run keeps every number).
- **Possible next (not asked yet, offer to the Owner):** a person to confirm/split dua groups (a review screen);
  clean dua words on a card (the supplication alone, not the chain); Notes and bookmarks on a dua.
- **Still open, Owner decision before Studied / Notes / bookmarks on OpenITI passages:** the permanent key
  (recommended `hadith:openiti:<versionUri>:<n>`, showing the standard number).
- **The Owner's Take Note message (8 Oct): built as v09.116.** The bookmark half is closed: the Owner, "I didn't
  notice the button already exist." Nothing to build.

**THE QUEUE, in order (decision 87):**
1. **The Hadith database, then the Dua database** ("Start Hadith n Dua Database work (NS's job)"). Follow
   `docs/reports/2026-10-07-hadith-dua-sources-research.md` §4.3:
   - the Arabic Hadith database, whole books (the six books and Riyad as-Salihin first, then Malik, al-Adab
     al-Mufrad, an-Nawawi's al-Adhkar, ad-Darimi, Ahmad), each with its numbering concordance (OpenITI's number ↔
     the standard number; the 14 poster Hadith in `app/js/asma-poster.js` are a worked example of why);
   - HadeethEnc's Bangla and English attached where its attribution names the book and number;
   - then the Dua database, derived from the books' Dua chapters (§2 of the report).
   Plan it in rounds; anything that writes Firestore or needs Rules is put to the Owner. **Letters stay later.**
2. **Asma ul Husna descriptions** (Names only, all 132): a toggle between the poster creator's description
   (`POSTER_DESCRIPTIONS`, 89 of them), the Architect's suggested one (written from the Name's occurrences across
   the Quran and Hadith, always labelled as a suggestion), and the Owner's own edit, **saved for the whole
   madrasah**. Demo the toggle and the edit box first. Check with `rules-authorisation-executable.mjs` whether the
   tenant's Asma document may carry the edits; if a Rules change is needed, write a candidate for the Owner.
   Later: link a Name's description to Notes so every reader can write their own.
3. Small follow-up: on a phone the writing paper's two list boxes ("Blank lines", "Light") show only their first
   letters. Consider shorter option labels or an icon.

## 1. What waits on the Owner (remind them in one line per report)

0. **HadeethEnc permission (decision 90, the Owner asked to be reminded):** settle with HadeethEnc that their vowels
   (and translations) may be used on the same dua in other books. Shown at the top of "Waiting on you" on #159.
1. **Pictures** (`docs/reports/2026-10-07-pictures-owner-steps.md`): **steps 1 (Blaze), 2 (Storage on) and 4 (CORS: Cloud Shell printed "Updating gs://study-monitoring.firebasestorage.app/... Completed 1") are done** (8 Oct). **Step 3 is done too: the Owner tested a picture in a Note on 8 Oct, "all good". PICTURES ARE LIVE; nothing waits on the Owner here except the Upgrade before the free trial ends (item 2).** The older text below is kept as it was written:
   Still to do: confirm a **$1 budget alert** (Firebase showed "Go to budgets"), **step 2** turn Storage on, **step 3**
   publish the Storage Rules, **step 4** the CORS line in Cloud Shell (their Cloud Shell had disconnected:
   "Reconnect", then paste). Step 4 needs Storage switched on first.
2. **The Google Cloud free trial** ($427 credit, 90 days, from 8 Oct): nothing to do now. **Before about 6 Jan 2027**,
   click **Upgrade** on Google Cloud's banner (activates the full account; no charge by itself), or the paid plan
   and pictures stop when the trial ends. Remind them in late December.
3. **Al-Munshi'** (an added Name) has no Arabic entered; its poster says "Arabic not entered yet". The Owner adds it.
4. The two dictionary permission letters, and the Hadith publisher letters (research report §4.2): "Later. Keep
   reminding."
5. The family sign-up step (v09.87): is it what they wanted? "What I really wanted" for the Ayah: they will say.

## 2. Lessons from this stretch (keep)

- **The way-back law (decision 86) is a review gate.** Any control that moves the reader needs a visible way back.
  The pieces: "Back to Word Card" (`renderWordCardReturnBar`), the floating pill (`setAppReturn(title, label, back)`
  in `quranrevival.html`), and `back=1` on a link to another page (the Hadith library and `?goto=` honour it).
- **A palette belongs to a surface, again**: Depth's light sections set light text tokens but inherited the Night
  card's `--card-bg` gradient, so its occurrence rows were green on navy. Set the surface token with the text tokens.
- **Lemma strings are keys and carry the source's Latin marks** (^ # @ [ , . and a trailing number). Print them
  with `lemmaText()` (`app/js/lemma-text.js`); never rewrite the data.
- **Expected Arabic typed by hand can differ in Unicode** (precomposed آ vs ا + U+0653). Write such expectations
  with escapes.
- **A Name the Owner adds lives only in their tenant's data**; the sandbox's defaults never show it. When the Owner
  reports a Name the code does not know, it is theirs: read the model's fallbacks, not the defaults.
- **An unattended or Builder round that changes a layout row must be measured at 390 px inside the pop-out window**
  (374 px wide, not the screen), as `writing-sheet-popout-browser.mjs` does.
- **Arabic vowel marks can be stored in two orders** (shadda+fatha or fatha+shadda) that look the same: compare
  vowelled Arabic in NFC (`.normalize("NFC")`), as `dua-vowels.mjs` does.
- **The Builder's runner cannot `pip install`**, so a round needing a Python tool's output (CAMeL Tools) gets its
  data generated by the Architect: a venv in the scratchpad installs it here (`camel_data -i morphology-db-msa-r13`,
  `disambig-mle-calima-msa-r13`, with `CAMELTOOLS_DATA` set to a folder that exists). **Read a tool's output before
  trusting a 100% coverage:** CAMeL's `backoff` is NO_ANALYSIS and `spvar`/NTWS gave nonsense for duas.
- **On a phone the Word card covers the Read bar where the "Back to …" pill docks.** A way back for a Word card
  opened from another page goes INSIDE the card: `setAppReturn(title, label, back, { inWordCard: true })`.
- **A deep link that records progress must not record from the address alone**: round 4 uses a one-use
  sessionStorage token set by the Dua card (`mmsa-dua-word-progress`).
- **Name suites exactly** (most browser suites end `-browser`); a wrong name exits 1 with no summary line.
- **A new unit type joins `UNIT_TYPES`, which `records.html`'s hand-entry picker lists**: leave out types recorded
  only from their own page (`dua`, `duaword`), or behaviour 14a fails.
- Sections 2 of the 7 Oct handover and 2–3 of the 30 Sep handover still hold (sandbox, review, release).

## 3. The handover guard (unchanged)

`allocate-version.py` appends every release to the handover `CLAUDE.md` names, and `brief-integrity.mjs` fails if
that handover does not name the version in `app/js/version.js`.

## Releases recorded since this handover was written

<!-- allocate-version.py appends one line per release below this marker. -->
- **v09.113** (2026-10-07): Word card and Ayah card ways back; the way-back law (the version on `main` when this was written).
- **v09.114** (2026-10-08): four more Arabic Hadith books in the library (round H-DB1).
- **v09.115** (2026-10-08): standard Hadith numbers in the library (round H-DB2).
- **v09.116** (2026-10-08): Take Note in the Ayah card's button row.
- **v09.117** (2026-10-08): HadeethEnc's Bangla and English under the library's Arabic hadith (round H-DB3).
- **v09.118** (2026-10-08): the writing paper's list boxes whole on a phone.
- **v09.119** (2026-10-08): the Dua tab: the Dua chapters of eleven Hadith books (round H-DB4).
- **v09.120** (2026-10-08): a Name's description: the poster's, a suggestion, or the madrasah's own.
- **v09.121** (2026-10-08): one card per dua, progress counted once (round H-DB5).
- **v09.122** (2026-10-08): Mapping My Journey pop-up: three panels fill the window and resize.
- **v09.123** (2026-10-08): Asma ul Husna in Explore: ‹ › on a Name, the poster fills its panel.
- **v09.124** (2026-10-08): the way back sits beside ✓ on the Read bar.
- **v09.125** (2026-10-08): the Word card's You know box says of the Qur'an once.
- **v09.126** (2026-10-08): File in folder(s): full screen, Back, keyboard stays, faster, folders fold.
- **v09.127** (2026-10-08): the Āyah card's Take Note opens the Note view ready to write.
- **v09.128** (2026-10-08): File in folder(s): Siyagah's header.
- **v09.129** (2026-10-08): Dua cards: the dua's own words, in the Quranic font.
- **v09.130** (2026-10-08): Hadith in English and Bangla.
- **v09.131** (2026-10-08): Dua words, rounds 0 and 1.
- **v09.132** (2026-10-08): Dua words, rounds 2–4.
- **v09.133** (2026-10-08): Dua words, round 5a: vowels.
- **v09.134** (2026-10-08): Dua words, round 5b: grammar suggestions.
- **v09.135** (2026-10-08): Dua words, round 6: progress on every word.
- **v09.136** (2026-10-09): Notes and bookmarks on a dua.
- **v09.137** (2026-10-09): the Bangla file's shadowed duplicates removed.
- **v09.138** (2026-10-09): a hadith's Notes have a way back.
- **v09.139** (2026-10-09): Mushaf view follows the chosen unit.
- **v09.140** (2026-10-09): the way back from Notes on the Qur'an page.
- **v09.141** (2026-10-09): the newer screens checked in Bangla.
- **v09.142** (2026-10-09): the most-used screens checked in Bangla.
- **v09.143** (2026-10-09): a Name's cited āyāt written out in Explore.
- **v09.144** (2026-10-09): every remaining page checked in Bangla.
- **v09.145** (2026-10-09): a Name's cited hadith written out in Explore.
- **v09.146** (2026-10-09): the listening bookmark, QCR from the ⋮ menu, the writing sheet 🔖 and the full-screen pop-out.
- **v09.147** (2026-10-09): the About page's feature registry in Bangla (Builder #693).
- **v09.148** (2026-10-09): the end of an āyah stays put; the Note view pop-up's way back on a tablet.
