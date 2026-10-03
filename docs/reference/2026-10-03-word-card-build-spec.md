# Word card rebuild: build spec (Owner-approved, 3 Oct 2026)

Written by the MMSA Architect, session `session_01M4Sbc1h94F7SgErzAzxq9n`, at the
Owner's word **"Go, build all three tabs together"** (3 Oct 2026). This file is the
whole brief. The build target is the demo, which the real app must match:

- `docs/reference/2026-10-03-word-card-demo.html`: all three tabs and the PC boxes
  (published as https://claude.ai/artifact/4kUuxWFko5NRBLqu6trzFZ, version 6);
- `docs/reference/2026-10-03-word-card-search-demo.html`: the 🔍 search
  (https://claude.ai/artifact/JLpC4nuj4NRzqK7e63XA7x).

Open either file in a browser. The demo uses the word **فَيَتَعَلَّمُونَ (2:102:35)**
and real data throughout; reuse it as the fixture word in the checks.

The Owner's binding words: *"Make sure your real build is what actually you
demoed."* So every round ends with screenshots of the REAL app at 390px (Bangla)
and 1280px (English), put beside the same view of the demo, and looked at.

## 1. The decisions (decision 59 in `docs/governance/2026-09-27-owner-decisions.md`)

### Header (all three tabs)
- Order, left to right: ‹ · **🔍** · the word and its reference · **ROOT box** · › · ✕.
- **ROOT box** ("ROOT" over the root letters, big, light green card). It stays on
  **every** tab.
- On a phone the header tightens so nothing overlaps: 36px buttons, a compact root
  box, a 1.55rem word. Measured in the demo at 420px; at 390px and 320px measure
  again.

### WbW tab (approved: "Ma Shaa Allah! Excellant!")
Top to bottom, under the tabs:
1. **Facts row**: three boxes **right to left: Root, then Dictionary word, then
   Form** (e.g. ع ل م · يَتَعَلَّمُ · Form V تَفَعَّلَ). The wording is **"Dictionary
   word"; never "lemma"** in any user-visible text. The root shows here AND in the
   header: *"One gives focus on the root and one gives flow of understanding."*
2. **Meaning bar**: the English meaning, the Bangla meaning and the transliteration
   on **one bar**, wrapping only when the screen is too narrow. *"Don't leave this
   space."*
3. **Word-part boxes**, one per segment, **right to left as the word is written**:
   the Arabic piece (coloured as today: particle / person / stem), its Arabic name
   (e.g. حَرْفُ اسْتِئْنَاف), its name in the reader's language, and what it means
   (English or Bangla, following the language). Phone: two boxes per row.

### Basic Arabic tab
1. The **same facts row**, at the top.
2. **Derived forms as cards**, directly under it. Each card shows a group tag, the
   part of speech (with "+1" when more than one is recorded), the Arabic large, the
   meaning, and the count. This word's own form is the gold card. PC: 7 per row.
   Phone: 3 per row.
3. **In a fixed ORDER, always.** The Owner will give the final order. Until then,
   use the demo's suggested order, right to left, most frequent first inside each
   group:
   1. verbs by form (I, II, III … X);
   2. verbal noun;
   3. the one who does it (active participle);
   4. the one it is done to (passive participle);
   5. intensive adjectives;
   6. the comparative;
   7. other nouns.

   Make the order a single table in code, so the Owner's order replaces it in one
   place.
4. Below: this Dictionary word's own occurrences and the record buttons, as today.

### Arabic in Depth tab
Sections that open and close (accordions). Only **Root & Word Family** starts
open, *"like image 2"*. Each line carries a source tag: **From the data**,
**Grammar rule**, or **Needs a source**. Nothing is ever generated or unattributed.
1. **Root & Word Family** (open):
   - the family line ع ل م ← … in the Basic order;
   - the root's meaning (the app's dictionary: Wiktionary, CC BY-SA, with credit);
   - the total uses and number of forms;
   - **the other words from this root in the same āyah**, as chips that open that
     word;
   - the Quranic Corpus and Lane · Hans Wehr links.
2. **Morphology (Ṣarf)**: a table of pieces, Form, tense, person/gender/number,
   voice and mood, plus the verb's family in its form (past, present, verbal noun).
3. **Verb Conjugation · تَصْرِيفُ الْفِعْل** (closed; verbs only). The Owner's
   poster is the model:
   - three tables: Past (الماضي), Present (المضارع), Command (الأمر);
   - all 14 persons, each with its English;
   - endings coloured, and the present-tense prefix in its own colour;
   - ✕ where there is no command;
   - the āyah's own form in gold;
   - **✦ "in the Qur'an: N times"** on every form found in the Qur'an (counted
     from the Corpus);
   - columns run right to left, Past on the right (the Owner may ask for the
     poster's left-to-right order);
   - on a phone the tables stack.
4. **Grammar in This Āyah (Naḥw)**:
   - the particle's role;
   - the verb's mood and its sign;
   - the subject pronoun;
   - a comparison with a differently-marked verb in the same āyah, when there is
     one.

   Sentence-level iʿrāb (the object, what governs what) is **Needs a source**.
5. **Word Choice & Distinctions**:
   - the forms of the same root used in this āyah, side by side (e.g. teach II ·
     learn V · know I);
   - one fixed, Owner-reviewed sentence per verb form on what that form adds.

   Near-synonym distinctions (عِلْم / مَعْرِفَة) are **Needs a source** (e.g.
   al-ʿAskarī, *al-Furūq al-Lughawiyya*; al-Rāghib, *al-Mufradāt*).
6. **Classical Arabic Usage**:
   - the Owner's own wording, kept: "Attested dictionary expressions, early prose
     or poetry will be shown with the Arabic quotation, translation, work, author
     and exact page/reference … No unattributed example or generated quotation
     will be shown.";
   - Qur'anic usage and the Lane's Lexicon link work now;
   - corpus examples and the al-Mufradāt scan are **Needs a source**.

### 🔍 Search (in the header)
It opens a search row inside the card. The reader can type:
- Arabic, with vowel marks optional;
- an English meaning;
- a place such as `2:42:8`.

Results are the exact written forms, each with its Qur'an count. Tap a form to
see its places; tap a place to open that word's card. The word list loads only
when Search is pressed, never at startup (I9).

### PC: two boxes on the right of the card (phone unchanged)
- **Record your Progress**: the stage buttons, moved.
- **Know Your Status**: a **percentage ring** (% of the Qur'an's words known),
  "N of M words known in this āyah", the bold "You know …" box (one pair of lines
  per level, as v09.47), "Appears …" and "If you learn this word …".

On a phone both stay under the card, as now. Choose the PC breakpoint by
measurement.

## 2. Data the build needs (the first round)

**Key finding (3 Oct):** the full Quranic Arabic Corpus morphology file
`quranic-corpus-morphology-0.4.txt` (GPL; `tools/quran-data-pull/pull.js` already
downloads it from raw.githubusercontent.com/alstat/QuranTree.jl) records, per
segment:
- the verb **Form** (`(V)`);
- **tense** (`PERF`/`IMPF`/`IMPV`);
- **person-gender-number** (`3MP`);
- **mood** (`MOOD:JUS`/`MOOD:SUBJ`; none means indicative);
- **voice** (`PASS`);
- participles and verbal nouns (`ACT PCPL`, `PASS PCPL`, `VN`);
- the prefix type (`f:REM+`, `w:CONJ+` …).

**The pull keeps only root, lemma and part of speech.** Round 1 extends it to keep
these features in a new **on-demand** file (never at startup; a size budget like
the word-segments files). The derived-form groups and Form numbers for Basic come
from the same features.

Also needed, written once and reviewed by the Owner:
- a small fixed table of **Arabic part names** (حَرْفُ اسْتِئْنَاف, حَرْفُ
  الْمُضَارَعَة, وَاوُ الْجَمَاعَة …) with English and Bangla;
- one sentence per verb **Form** (I–X) on what it adds.

The licences are already credited (QAC, GPL; Wiktionary, CC BY-SA). Keep that
credit line.

**The conjugation engine** builds the 14 × 3 tables from the root, the Form and
the past/present vowels:
- sound roots are fully regular;
- assimilated (و/ي first, e.g. وَجَدَ → يَجِدُ, جِدْ), hollow, defective,
  hamzated and doubled roots each need their own rules;
- every generated form that occurs in the Qur'an must equal the Corpus spelling,
  as a mechanical check over the whole Qur'an;
- a form the engine cannot produce safely is not shown (a note says why). It is
  never guessed.

## 3. Rounds (suggested; one Builder issue each, dispatched in order)

1. **Data**: Corpus features kept (on-demand file), derived-form groups, Form
   numbers, the Arabic part-name table, the per-Form sentences; a pure-data suite
   with hand-written expectations for 2:102:35 and a few others.
2. **WbW tab + header**: root box on every tab, phone header fit, facts row, meaning
   bar, part boxes.
3. **Basic tab**: facts row, ordered derived-form cards.
4. **Depth tab**: the six sections and source tags; no conjugation yet.
5. **Conjugation**: the engine, the closed section, the whole-Qur'an Corpus check.
6. **Search** 🔍.
7. **PC boxes**: Record your Progress and Know Your Status with the ring.

Every round:
- I11 (Bangla for every new string);
- I9 (nothing new at startup);
- measured at 320/390/768/1280 in English and Bangla, with `phone-width-overflow`
  and `palette-contrast` green;
- screenshots beside the demo;
- one mutation-proven check;
- no Firestore or Rules change. None is needed: all of this is reading and
  display, except Record your Progress, which keeps its existing writes.
