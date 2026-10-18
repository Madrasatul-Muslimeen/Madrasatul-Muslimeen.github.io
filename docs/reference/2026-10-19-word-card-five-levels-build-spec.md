# Word card: five levels — build spec (PCF MSA J38 + J39)

The Owner's decisions, 19 Oct 2026, in the MSA Architect session. The meeting card is `meet/mmsa-wc-levels` in the PCF;
the jobs are `p/mmsa/jobs/J38` and `J39`.
- J38: 1A 2A 3A 4A 5A 6A. 7A is queued as J40.
- J39: 1A 2A **3B** 4A 5A 6A 7A. Morphology STAYS in Depth. Taṣrīf for non-verbs is queued as J41.

**Build exactly as the demos show** (the Owner: "Make sure you build exactly as you built the demo. Color choice,
purple"). Demo3 is the target; where it and this file differ, this file wins, because it carries 3B.
- demo3, the target: https://claude.ai/artifact/9VTQVtmKnvw7e4j59Wn11R
- demo 2, each tick step by step: https://claude.ai/artifact/UFCz6XNErBppp8G89vG9QJ
- demo 1, the four-level card: https://claude.ai/artifact/2AakF2Q2cxz6gpCCyuXRT6

The example word everywhere is وَعَدَكُمْ, Ibrāhīm 14:22 word 8, root و ع د.

## 1. The five tabs, in this order

| # | Tab (en / bn) | Small line under it, from 600px (en / bn) | Stored level id (UNCHANGED) | Claim key |
|---|---|---|---|---|
| 1 | WbW / শব্দে শব্দে (keep today's bn) | the word here / এখানে শব্দটি | `wbw` | the dictionary word |
| 2 | Root / মূল | where it comes from / কোথা থেকে এসেছে | `intermediate` | the root |
| 3 | Family / পরিবার | its words / এর শব্দগুলো | `basic` | one meaning group |
| 4 | Taṣrīf / তাসরীফ | how it changes / কীভাবে বদলায় | `tasrif` (NEW) | the root |
| 5 | Depth / গভীরে (keep today's bn) | in this āyah / এই আয়াতে | `depth` | the root |

- **Stored level ids do not change.** Root reads and writes `intermediate`, and Family reads and writes `basic`.
  Every saved mark stays valid and is read under its new name (J39 tick 6A). No document is renamed, migrated or
  deleted.
- `WORD_CARD_LEVELS` becomes `["wbw", "intermediate", "basic", "tasrif", "depth"]` in tab order, with display names
  from a map. Keep the old `basic`/`intermediate` names nowhere on screen.
- **Five tabs must fit at 320px** in English and Bangla. Measure the tab row with the real fonts. Below 600px the
  small line is hidden.

## 2. What each tab holds

Purple is the colour of every NEW part (the "Achieved here means" box, the order note, the "what it does" line on
cards, the "who and when" line). Define the purple as tokens for the light look, the dark look and the Night look.
Contrast must be at least 4.5:1 on each look's real background. Measure it.

### 1. WbW: unchanged, plus one line
- At the top, the can-do box: **"Achieved here means: I know what this word means here, and what its attached
  pieces add."**
- Everything else is as today.

### 2. Root: new tab
- Order note: "Usually studied after WbW. You can open it any time."
- Can-do: **"Achieved here means: I know this root's core meaning, and I can spot its words."**
- **Depth's "Root & Word Family" section moves here** (`rootSection()` in `word-card-depth.js`): the root meaning
  (Wiktionary credit kept), "used N times in F forms", and the words in this āyah from this root, as tappable links.
- Below it, "How the root grows: its N meanings". This is one chip per meaning group of the root: the group's
  meaning and its count. The data is the same as Intermediate's root-meanings today, without the word cards.
- The progress block writes level `intermediate`, keyed by the root.
- Reach line: **"Achieved here adds Roots studied +1. It does not add to Words known."**
- Depth no longer has the Root section.

### 3. Family: today's Basic and Intermediate together
- Order note: "Usually studied after Root. You can open it any time."
- Can-do: **"Achieved here means: I know this meaning in its other forms, and the root's other meanings."**
- "Meanings of وَعَدَ itself": today's Intermediate senses list, with the current sense marked.
- One card per meaning group of the root, the current word's group first and in gold. Each group has its word cards
  in today's Basic card form (the derived-form card and its pop-up).
- **3A:** each card carries a purple "what it does" line from its shape group:
  - verb → "the action itself"
  - masdar → "the doing of it"
  - doer → "the one who does it"
  - done → "the one it is done to"

  Other groups get no line; it is never guessed. Where the group label already shows the same words, do not print
  them twice.
- **J39 5A: one mark per meaning group.** Each group card has its own Learning / Practising / Achieved control. It
  writes level `basic`, keyed by THAT group's id, and its reach reads "→ Words known +N" (N = that group's
  occurrences).
- Today's Basic occurrence counts and occurrence list stay, below the groups. They are not removed.
- Today's "Record your progress" block on this tab is the current word's own group.

### 4. Taṣrīf: new tab
- Order note: "Usually studied after Family. You can open it any time."
- Can-do: **"Achieved here means: I can tell who does it and when, and how the word changes for other people and
  times."**
- **4A "who and when" line** at the top, verbs only, read from `word-features`:
  - **Who:** from `pgn`, e.g. 3MS "he", 3FS "she", 3MP "they (men)", 3FP "they (women)", 3MD/3FD "they two",
    2MS "you (one man)", 2FS "you (one woman)", 2MP "you all (men)", 2FP "you all (women)", 2MD/2FD "you two",
    1S "I", 1P "we".
  - **When:** from `tense`: PERF "past (it is done)", IMPF "present (it is happening)", IMPV "a command".
  - **To whom:** from the `pron-obj` part's `pp`, the same person table with the pronoun piece in Arabic.
  - Example: "Who: he · When: past (it is done) · To whom: you all (كُمْ)".
  - Bangla for every phrase.
- **Depth's "Verb Conjugation" section moves here**, unchanged, including its weak-root and doubled-root messages.
  A form is never guessed.
- **Morphology does NOT move: it stays in Depth (J39 3B).**
- A word that is not a verb has no Taṣrīf content yet (J41 is queued). The tab says so in words, and its progress
  block shows "Not applicable", leaving the word out of this level's total (I7).
- The progress block writes level `tasrif`, keyed by the root. **It is gated** (section 5) until the Owner publishes
  the Rules.
- Reach line: "Achieved here is a study mark on the root. It does not add to Words known."

### 5. Depth: the rest
- Order note: "Usually studied after Taṣrīf. You can open it any time."
- Can-do: **"Achieved here means: I can explain this word's form and its grammar in this āyah, and why this word was
  chosen."**
- Sections, in order: Morphology (stays), Grammar in This Āyah, Word Choice & Distinctions, Classical Arabic Usage,
  and the dictionary and forms as today. Root & Word Family and Verb Conjugation are no longer here.
- The progress block writes level `depth`, keyed by the root.
- Reach line: the same as Taṣrīf's.

## 3. Counting (J38 1A)

- **Words known** grows only from WbW (`wbw`) and Family (`basic`).
- Root (`intermediate`), Taṣrīf (`tasrif`) and Depth (`depth`) are study marks on a ROOT.
  - **They no longer make a word count as known**: remove the `intermediate`/`depth` branches from
    `lemmaViewWithGroup()`, and their entries from the reading view's coloured known-marks (around
    `quranrevival.html` 17262).
  - **They no longer move a word total**: `levelTotalLive()` is false for them, so no word-total document is written
    for them.
- Their line in the totals box reads **"Root: studied N of 1,642 roots"** (and likewise for Taṣrīf and Depth). N is
  the count of this person's claims at that level that count as known, read from what `primeAllLemmaProgress()`
  already loads. That costs no extra read.
- **Saved data is never changed.** The old `intermediate`/`depth` word-total documents stay where they are, unread.
  Say so in the PR.
- "Known through its root" lines no longer appear. Basic-group "known through" stays, now worded as Family.

## 4. Order between levels (J38 6A)

- Each tab is free to open.
- Root, Family, Taṣrīf and Depth each carry the gentle order note above, in purple, at the top. There is no lock.

## 5. Taṣrīf's new level id needs one Rules step (the Architect's part, not the Builder's)

- The deployed Rules accept `level in ['wbw', 'basic', 'intermediate', 'depth']` in three places.
- The Architect prepares `docs/governance/2026-10-19-tasrif-level-DEPLOYMENT-candidate.rules`, adding `'tasrif'`,
  and a publish guide for the Owner.
- Until the Owner says it is published, a declaration (the same shape as `study-lemma-levels-readiness.js`) keeps
  Taṣrīf's progress block closed. The block shows: "Saving Taṣrīf marks waits for one settings step by the Owner."
  Nothing is ever written for `tasrif` while the gate is closed.

## 6. Language, way back, checks

- Every new string goes in Bangla too (I11). No HTML entities in translation values.
- Every link out of a tab keeps the way back (decision 86).
- Update every existing suite that described the four tabs **in place**, with the reason recorded. Never delete a
  check.
- A new suite proves the following, and each check is proven by its own mutation:
  - five tabs in this order, fitting at 320 / 390 / 768 / 1280px in English and Bangla;
  - each tab's sections, as listed above;
  - the purple parts present, with their contrast measured on all three looks;
  - Root, Taṣrīf and Depth marks never moving Words known, and never marking a word known;
  - a Family mark per group, writing only that group's key;
  - Taṣrīf writing nothing while gated.
- Build QR too (`node tools/apps/build-app.mjs qr`, then `bash tools/apps/qr-verify/run-all.sh`). Re-anchor an
  `apps/qr/edits.json` edit if one no longer matches; never delete one.

## 7. Release (the Architect's part)

- **MSA v12.01**; v12.00 is unused.
- v11, as released at v11.39 (merge `2bfad05`), is archived as `legacy-v11/`. This is the same pattern as
  `legacy-v10/`: its `js/sw-register.js` registers no worker, `brief-integrity.mjs` checks it file by file, and it
  has a `README-ARCHIVE.txt`.
- The What's New line, and the PCA change notice for QR (QR is built from MSA, so it moves to v12.01 too).
