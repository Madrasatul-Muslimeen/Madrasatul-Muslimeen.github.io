# Dua module: rules and build plan (MSA-DUA Lead)

Kept by the MSA-DUA Lead. The PMS job is **PCF MSA J104**. Every session that works on Dua reads this file first.
Opened 30 Oct 2026 (Sydney) on the Owner's word.

## The Owner's rules for the Dua module (30 Oct 2026, about 7 am Sydney)

The Owner, in their own words: "Prepare Demo, give me build plan and get approval before building. Always maintain
gradual version numbers in Demo. Report me each build asked for by number (so checking, tracking and refering becomes
easy). Keep the building plan and the rule in Project memory as well as in PMS for all sessions to follow."

1. **Demo first, then approval, then build.** Nothing is built before the Owner approves the demo and the plan in J104.
2. **Every demo carries a version that only goes up**: Dua Demo v1.01, v1.02, v1.03 … The number is shown on the demo
   page and recorded in J104 and on the PMS MyDatabase card. It is separate from the app's own version (vNN.NN), which
   only the MSA Architect allocates.
3. **Every build has a number, D01, D02 …** The numbers below never change meaning; a new request gets the next free
   number. Every report, commit, hand-in and PMS line names its build number(s).
4. **Every demo opens in a separate window** (the Owner, 30 Oct 2026, 7:38 am Sydney: "Enable the demo to be opened in
   a separate window always. Rule."). Every demo page carries a "↗ Open in its own window" link (a plain link to its own
   address, opening a new tab or window), and every report gives the demo's full link to open on its own, never only
   a panel beside the chat.
5. Lead rules (lead120) still hold: the Lead builds only Dua's own files on its own branch, and hands each finished
   build to the MSA Architect ("MSA-DUA LEAD ▸ ready for release"). Shared parts go to the MSA Architect.

6. **Show/hide sections use the shared ON/OFF switch, never an arrow** (the Owner's PCF MSA J109, released in v13.08,
   1 Nov 2026, 2:41 pm Sydney; passed on by the PCA). Any new show/hide section in Dua uses the shared switch in
   `app/css/shell.css` (the J109 block: a `<details>` summary it already lists, or a `.mm-sw` span, `.on` or the
   parent's `aria-expanded="true"` for on), never a ▸/▾ arrow. Menus and folder trees keep their arrows. Merge `main`
   into the Dua branch before each hand-in.

## Demo versions

| Demo | Date (Sydney) | What it shows | Link |
|---|---|---|---|
| v1.01 | 28 Oct 2026, 8:11 pm | First Dua page: occasions (Hisn al-Muslim), Qur'anic duas, morning and evening adhkār with counts, the full list | https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8 (version 1) |
| v1.02 | 30 Oct 2026, 7:19 am | The seven-group menu bar and the Dua Card: D01–D18 | https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8 (version 2) |
| v1.03 | 30 Oct 2026, 7:38 am | v1.02 plus "↗ Open in its own window" (rule 4) | https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8 (version 3) |
| v1.04 | 30 Oct 2026, 7:47 am | The groups and their parts as pull-down menus (D21); on the Dua Card only progress and listening stay open, everything else opens from the card's menu as a pop-up card (D22) | https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8 (version 4) |

## The build plan (the Owner said "Plan me and start build", 30 Oct 2026, about 7:45 am)

Tags: **Rules** = needs a Firestore Rules change the Owner publishes (an Owner Control Gate); **Architect** = touches
a shared part, done by or with the MSA Architect; **Answer** = waits on an Owner answer in J104 or J105.

| # | Build | Needs |
|---|---|---|
| D01 | Menu bar of the seven groups: Dua by Occasions, by Hadith Books, of Prophets, of Rasulullah Sallallahu A'laihi Wa Sallam, of the Sahaba, of the Salaf, of the Ulama | – |
| D02 | Numbers in every group (1, 2, 3 …), in the group's own order | – |
| D03 | Add a Dua, move it, put it in several groups, delete it. Delete means hide (I4): it is kept and can be brought back | Rules |
| D04 | Every Dua opens in its Dua Card, with ‹ › through its group and ← Back to the group | – |
| D05 | A title for every Dua, English and Bangla (I11) | Rules |
| D06 | 🔖 Bookmark, written to the same Bookmarks as Quran Study (unit key `dua:<n>`, already permanent) | Architect |
| D07 | The Dua Card as an A4 poster to print, with Arabic, English, Bangla and word-by-word switches; the text shrinks to fit one page | – |
| D08 | Words that are also in the Qur'an open Quran Study's Word Card with "From Dua" and ← Back | Architect, Answer (J105) |
| D09 | Other words open the Dua's own word card (the word, its dictionary form, root, kind; meaning when a usable dictionary exists) | Architect, Answer (J105) |
| D10 | Memorising plan marks, each with its own colour: Memorising Today, Next, URGENT, Revising, Memorised, and ★ Important Dua | Rules, Answer |
| D11 | The bottom banner of the Asma ul Husna poster on every Dua Card and poster (cut from the Owner's template) | – |
| D12 | A top banner frame on every Dua Card and poster; the Owner's text later | – |
| D13 | Screensaver: Dua posters alone, or mixed with Asma ul Husna posters | Architect (Asma lives in QR: a PCA change request) |
| D14 | Copy / share menu: Arabic only, chosen languages, word by word, the source; as text or as a poster picture | – |
| D15 | Record each share: where (WhatsApp, Facebook, email, print, masjid board, other), who for (family, students, teachers, masjid community, public, other), occasion, date. Seen by Owner and Prime only | Rules |
| D16 | Dua audio for every Dua: the source is the Owner's choice (see "Audio" below) | Answer |
| D17 | Audio buttons: play, pause, previous, next, speed, repeat ×1/3/7/10/33/∞, play a whole group | – |
| D18 | Choose part of a Dua (first word, last word) and repeat only that part | Answer (needs word timings in the audio) |
| D19 | The Dua page itself (`app/dua-study.html`), mounting `app/js/dua-browser.js`; its menu entry, app settings and offline cache | Architect |
| D20 | Plain words when a Dua save fails (J104 j104q1; `dua-browser.js` and `dua-check.js:331`) | – |
| D21 | The Dua groups, and a group's parts (the 15 occasions, the 11 books), as pull-down menus (the Owner, 30 Oct, about 7:45 am) | – |
| D22 | On the Dua Card only the progress block and the listening buttons stay open; every other block (meaning, source, memorising plan, bookmark, poster, share, screensaver) opens from the card's menu as a pop-up card with ✕ back to the Dua (the Owner, same message) | – |

### Build rounds, in order (each round is handed to the MSA Architect on its own branch)

The Owner's answers still open in J104 (6 Sahaba/Salaf/Ulama sources, 7 audio, 8 memorising marks, 9 the Rules change)
hold back only the builds that need them; everything else goes ahead.

| Round | Builds | Waits on |
|---|---|---|
| R1 | D19 the page `app/dua-study.html` (Dua-owned; its menu entry, apps json and `sw.js` are the MSA Architect's), D01 + D21 the groups as pull-down menus, D02 numbers, D04 each Dua opens in its Dua Card. Groups come from a new data file `tools/hadith-data-pull/output/dua/groups.json` built by a Dua-owned script from data already in the repository plus Hisn al-Muslim (asellam/HisnElMuslim, MIT, credited) | – |
| R2 | D22 the card layout with its menu and pop-up cards, D11 bottom banner (cut from the Owner's Asma ul Husna template), D12 top banner frame, D05 titles shown (written in the data file until D03 can save them) | – |
| R3 | D07 A4 poster with Arabic / English / Bangla / word-by-word switches; D14 copy and share as text or poster picture | – |
| R4 | D20 plain words when a save fails; D06 Bookmark, with the MSA Architect | MSA Architect |
| R5 | D17 audio buttons and D18 repeating a part | Owner tick 7 (audio source) |
| R6 | D03 add/move/delete, D05 saved titles, D10 memorising marks, D15 the share record | Owner tick 9 (Rules), tick 8 |
| R7 | D08 / D09 word links (follows J105), D13 screensaver with Asma ul Husna (PCA change request) | J105, MSA Architect, PCA |
| R8 | The Sahaba, Salaf and Ulama groups filled | Owner tick 6 |


Done before this plan: the offline "could not be loaded" words and Try again (MSA audit part 130 F2, released in v12.120).

## Audio options found (30 Oct 2026)

- **A. The madrasah records its own** (a teacher or the Owner records each dua on a phone). Free, the madrasah owns it.
  Word timings for D18 can be marked once per recording.
- **B. Ask permission** from the publishers of existing recordings: hisnmuslim.com (266 per-dua MP3s, no licence
  stated) and the archive.org "Hisnul Muslim" set (Shaykh Yahya Hawwa, Angelwing, about 120 MP3s by occasion, no
  licence stated). Needs letters; the Owner said on 28 Oct letters are "not required now".
- **C. Qur'anic duas use the recitation the app already plays** (free now, for the Dua of Prophets group).
- **D. The device's own Arabic voice.** Free and instant, but robotic and may mispronounce; not recommended for dua.

## Where things live

- Dua-owned files: `app/js/dua-browser.js`, `app/js/dua-words.js`, `app/js/dua-check.js`, `app/js/dua-check-data.js`,
  the future `app/dua-study.html`, `tools/hadith-data-pull/output/dua/` (paths kept stable: QR reads Hadith data).
- Shared, never changed by the Lead: Word Card (QR), Bookmarks, Records, Notes, sign-in, `sw.js`, `app/apps/*.json`,
  `bn.js` beyond Dua's own strings, `firestore.rules`.
