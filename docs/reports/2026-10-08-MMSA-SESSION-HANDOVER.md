# MMSA session handover, 8 Oct 2026

Written by the MMSA Architect, session `session_018hss8x9uWFDvF1EebJWT2i` (7–8 Oct 2026), at the Owner's
"see you in next session". It supersedes `docs/reports/2026-10-07-MMSA-SESSION-HANDOVER.md` (kept as history).
Start from `docs/governance/NEW-SESSION-PROMPT-2026-10-08.md`.

## 0. The exact pause point: start here

Read the live state yourself (`app/js/version.js` on `origin/main`, open pull requests, the "Active Architect
session" line on #159).

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
