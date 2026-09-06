# SAMPLE_REAL_WORDS.md

Twenty real Qur'anic words across every grammatical category the review asked
for, showing **exactly** what the current application stores and displays for
each — and, for contrast, what the upstream Quranic Arabic Corpus actually
said about that same word before `pull.js` reduced it.

Every "stored" block is copied verbatim from
`tools/quran-data-pull/output/surahs/surah_NNN.json`. Every "corpus" block is
copied verbatim from the upstream `quranic-corpus-morphology-0.4.txt` that
built it.

**How to read the tables.** Each word has four rows:

- **Stored** — the shipped `words[]` entry.
- **Corpus** — the source segments, `FORM · TAG · FEATURES`.
- **UI shows** — what the three panels put on screen.
- **Lost** — source information the app cannot display.

---

## 1 · NOUN (definite, nominative) — **ٱلْكِتَـٰبُ** · 2:2:2

| | |
|---|---|
| **Stored** | `{"position":2,"arabic":"ٱلْكِتَـٰبُ","transliteration":"l-kitābu","translation":{"en":"(is) the book","bn":"মহাগ্রন্থ (আল্লাহর)"},"morphology":{"root":"كتب","lemma":"كِتَٰب","pos":"Determiner + Noun","rootCount":319}}` |
| **Corpus** | `{lo · DET · PREFIX\|Al+`<br>`kita`bu · N · STEM\|POS:N\|LEM:kita`b\|ROOT:ktb\|M\|NOM` |
| **UI shows** | **WbW:** ٱلْكِتَـٰبُ / l-kitābu / (is) the book · **Root:** كتب 319× · **Derivatives:** Determiner + Noun · كِتَٰب |
| **Lost** | that the ٱل is a *prefixed* definite article rather than a separate word; `M` masculine; `NOM` nominative |

Handled well. A clean single-root noun is the case the system is built for.

---

## 2 · VERB, PAST (perfect, 3rd masc. sing.) — **فَعَلَ** · 105:1:4

| | |
|---|---|
| **Stored** | `{"arabic":"فَعَلَ","transliteration":"faʿala","translation":{"en":"dealt","bn":"করেছেন"},"morphology":{"root":"فعل","lemma":"فَعَلَ","pos":"Verb","rootCount":108}}` |
| **Corpus** | `faEala · V · STEM\|POS:V\|**PERF**\|LEM:faEala\|ROOT:fEl\|**3MS**` |
| **UI shows** | **Derivatives:** `Verb` · فَعَلَ |
| **Lost** | **PERF — that it is past tense at all**; 3MS — third person masculine singular |

**The single word "Verb" is the whole grammatical description the app gives.**
It applies identically to a past, a present and an imperative.

---

## 3 · VERB, PRESENT (imperfect, Form IV, 3rd masc. plural + attached pronoun) — **يُؤْمِنُونَ** · 2:3:2

| | |
|---|---|
| **Stored** | `{"arabic":"يُؤْمِنُونَ","transliteration":"yu'minūna","translation":{"en":"believe","bn":"বিশ্বাস করে"},"morphology":{"root":"امن","lemma":"ءَامَنَ","pos":"Verb + Pronoun","rootCount":879}}` |
| **Corpus** | `yu&ominu · V · STEM\|POS:V\|**IMPF**\|**(IV)**\|LEM:'aAmana\|ROOT:Amn\|**3MP**`<br>`wna · PRON · **SUFFIX\|PRON:3MP**` |
| **UI shows** | **Derivatives:** `Verb + Pronoun` · ءَامَنَ |
| **Lost** | IMPF (present); **(IV) — Form IV, the derived form**; 3MP; that the `ونَ` is a *suffix* and that the pronoun is **they** |

This is the canonical illustration of the problem. The word is a Form IV
imperfect with a suffixed 3rd-masculine-plural pronoun. The app says
"Verb + Pronoun".

---

## 4 · IMPERATIVE — **ٱقْرَأْ** · 96:1:1

| | |
|---|---|
| **Stored** | `{"arabic":"ٱقْرَأْ","transliteration":"iq'ra","translation":{"en":"Read","bn":"(হে নবী) পড়"},"morphology":{"root":"قرا","lemma":"قَرَأَ","pos":"Verb","rootCount":88}}` |
| **Corpus** | `{qora>o · V · STEM\|POS:V\|**IMPV**\|LEM:qara>a\|ROOT:qrA\|**2MS**` |
| **UI shows** | **Derivatives:** `Verb` |
| **Lost** | **IMPV — that it is an imperative**; 2MS — addressed to one male |

The first word revealed of the Qur'an, an imperative, is labelled "Verb".
Measured across the whole Qur'an: **1,876 imperatives are labelled "Verb"**;
the label "Imperative Verb" fires for exactly **2** words (G-05).

---

## 5 · IMPERATIVE + ATTACHED PRONOUN — **ٱهْدِنَا** · 1:6:1

| | |
|---|---|
| **Stored** | `{"arabic":"ٱهْدِنَا","transliteration":"ih'dinā","translation":{"en":"Guide us","bn":"আমাদেরকে দেখান"},"morphology":{"root":"هدي","lemma":"هَدَى","pos":"Verb + Pronoun","rootCount":316}}` |
| **Corpus** | `{hodi · V · STEM\|POS:V\|**IMPV**\|LEM:hadaY\|ROOT:hdy\|**2MS**`<br>`naA · PRON · **SUFFIX\|PRON:1P**` |
| **UI shows** | **Derivatives:** `Verb + Pronoun` · هَدَى |
| **Lost** | IMPV; 2MS addressee; **that the pronoun is 1P — "us"**, which the gloss shows but the grammar panel cannot |

---

## 6 · PARTICLE (preposition) — **عَلَىٰ** · 2:7:3

| | |
|---|---|
| **Stored** | `{"arabic":"عَلَىٰ","transliteration":"ʿalā","translation":{"en":"on","bn":"উপর"},"morphology":{"root":"","lemma":"عَلَىٰ","pos":"Preposition","rootCount":0}}` |
| **Corpus** | `EalaY` · P · STEM\|POS:P\|LEM:EalaY`` |
| **UI shows** | **WbW:** عَلَىٰ / ʿalā / on · **Root:** *(absent — filtered out)* · **Derivatives:** Preposition · عَلَىٰ |
| **Lost** | nothing |

Correct. Note the word **disappears entirely from the Root panel** (G-17) —
right, but unexplained on screen.

---

## 7 · PRONOUN (detached) — **هُمُ** · 2:5:7

| | |
|---|---|
| **Stored** | `{"arabic":"هُمُ","transliteration":"humu","translation":{"en":"they","bn":"যারা"},"morphology":{"root":"","lemma":"","pos":"Pronoun","rootCount":0}}` |
| **Corpus** | `humu · PRON · STEM\|POS:PRON\|**3MP**` — note: **no LEM** |
| **UI shows** | **Derivatives:** `Pronoun` (no lemma line — it is empty) |
| **Lost** | 3MP |

One of the 3,307 words with no lemma. The renderer's `${lemma ? … : ""}`
guard handles it correctly and silently.

---

## 8 · PROPER NOUN (with root) — **ٱللَّهُ** · 2:255:1

| | |
|---|---|
| **Stored** | `{"arabic":"ٱللَّهُ","transliteration":"al-lahu","translation":{"en":"Allah ","bn":"আল্লাহ"},"morphology":{"root":"اله","lemma":"ٱللَّه","pos":"Proper Noun","rootCount":2851}}` |
| **Corpus** | `{ll~ahu · PN · STEM\|POS:PN\|LEM:{ll~ah\|ROOT:Alh\|**NOM**` |
| **UI shows** | **Root:** اله 2851× · **Derivatives:** Proper Noun · ٱللَّه |
| **Lost** | NOM |
| **Note** | the English gloss has a **trailing space** — `"Allah "` — carried through from the source |

---

## 9 · PROPER NOUN (no root, feminine) — **مَرْيَمَ** · 19:16:4

| | |
|---|---|
| **Stored** | `{"arabic":"مَرْيَمَ","transliteration":"maryama","translation":{"en":"Maryam","bn":"মারইয়াম (সম্পর্কে)"},"morphology":{"root":"","lemma":"مَرْيَم","pos":"Proper Noun","rootCount":0}}` |
| **Corpus** | `maroyama · PN · STEM\|POS:PN\|LEM:maroyam\|**F**\|**ACC**` |
| **UI shows** | **Root:** *(absent)* · **Derivatives:** Proper Noun · مَرْيَم |
| **Lost** | F, ACC |

One of the **624 rootless proper nouns**. Correct — a non-Arabic name has no
triliteral root — but the reader cannot distinguish "no root exists" from
"no root found".

---

## 10 · BROKEN PLURAL — **ٱلْقَوَاعِدَ** · 2:127:4

| | |
|---|---|
| **Stored** | `{"arabic":"ٱلْقَوَاعِدَ","transliteration":"l-qawāʿida","translation":{"en":"the foundations","bn":"প্রাচীর বা ভিত্তি"},"morphology":{"root":"قعد","lemma":"قَوَاعِد","pos":"Determiner + Noun","rootCount":31}}` |
| **Corpus** | `{lo · DET · PREFIX\|Al+`<br>`qawaAEida · N · STEM\|POS:N\|LEM:qawaAEid\|ROOT:qEd\|**MP**\|**ACC**` |
| **UI shows** | **Root:** قعد 31× · **Derivatives:** Determiner + Noun · قَوَاعِد |
| **Lost** | **MP — that it is plural at all**; ACC; that it is a *broken* plural of قَاعِدَة |

**A student cannot tell from this screen that the word is plural.** The lemma
is the plural form itself, so the singular is not shown either. Broken plurals
are one of the hardest things in Qur'anic Arabic and the app is silent on them.

---

## 11 · SOUND FEMININE PLURAL — **جَنَّـٰتٍۢ** · 2:25:8

| | |
|---|---|
| **Stored** | `{"arabic":"جَنَّـٰتٍۢ","transliteration":"jannātin","translation":{"en":"(will be) Gardens","bn":"জান্নাত"},"morphology":{"root":"جنن","lemma":"جَنَّة","pos":"Noun","rootCount":201}}` |
| **Corpus** | `jan~a`tK · N · STEM\|POS:N\|LEM:jan~ap\|ROOT:jnn\|**FP**\|**INDEF**\|**ACC**` |
| **UI shows** | **Root:** جنن 201× · **Derivatives:** Noun · جَنَّة |
| **Lost** | **FP — feminine plural**; INDEF; ACC |

Here the lemma **is** the singular (جَنَّة "garden") while the surface word is
plural — so the panel shows singular and plural side by side with nothing
saying which is which, and no marker that a plural is involved.

---

## 12 · SOUND MASCULINE PLURAL (and an ACTIVE PARTICIPLE, Form IV) — **ٱلْمُفْلِحُونَ** · 2:5:8

| | |
|---|---|
| **Stored** | `{"arabic":"ٱلْمُفْلِحُونَ","transliteration":"l-mufliḥūna","translation":{"en":"(are) the successful ones","bn":"সফলকাম"},"morphology":{"root":"فلح","lemma":"مُفْلِحُون","pos":"Determiner + Noun","rootCount":40}}` |
| **Corpus** | `{lo · DET · PREFIX\|Al+`<br>`mufoliHuwna · N · STEM\|POS:N\|**ACT\|PCPL**\|**(IV)**\|LEM:mufoliHuwn\|ROOT:flH\|**MP**\|**NOM**` |
| **UI shows** | **Root:** فلح 40× · **Derivatives:** Determiner + Noun · مُفْلِحُون |
| **Lost** | **ACT PCPL — that it is an active participle**; **(IV) — the derived Form**; MP; NOM |

**The richest single word in this sample, reduced to "Determiner + Noun".**
It is simultaneously a sound masculine plural, an active participle, and a
Form IV derivation — three teachable facts, none reaching the screen.

---

## 13 · WORD WITH PREFIX (single) — **بِسْمِ** · 1:1:1

| | |
|---|---|
| **Stored** | `{"arabic":"بِسْمِ","transliteration":"bis'mi","translation":{"en":"In (the) name","bn":"নামে"},"morphology":{"root":"سمو","lemma":"ٱسْم","pos":"Preposition + Noun","rootCount":381}}` |
| **Corpus** | `bi · P · **PREFIX\|bi+**`<br>`somi · N · STEM\|POS:N\|LEM:{som\|ROOT:smw\|**M**\|**GEN**` |
| **UI shows** | **Root:** سمو 381× · **Derivatives:** Preposition + Noun · ٱسْم |
| **Lost** | that the preposition is the attached **بِ**, and where the stem starts; M; GEN |

---

## 14 · WORD WITH THREE PREFIXES — **فَبِأَىِّ** · 55:13:1

| | |
|---|---|
| **Stored** | `{"arabic":"فَبِأَىِّ","transliteration":"fabi-ayyi","translation":{"en":"So which","bn":"অতএব কোন কোন"},"morphology":{"root":"","lemma":"أَىّ","pos":"Resumption Particle + Preposition + Noun","rootCount":0}}` |
| **Corpus** | `fa · REM · **PREFIX\|f:REM+**`<br>`bi · P · **PREFIX\|bi+**`<br>`>aY~i · N · STEM\|POS:N\|LEM:>aY~\|**GEN**` |
| **UI shows** | **Derivatives:** `Resumption Particle + Preposition + Noun` · أَىّ |
| **Lost** | the whole segmentation — which letters are فَ, which بِ, where أَىّ begins; GEN |

The word repeated 31 times in Sūrat ar-Raḥmān. A reader is given a
three-part label and no way to map any part of it onto the three visible
pieces of the word.

---

## 15 · WORD WITH SUFFIX (attached pronoun, 2nd masc. sing.) — **رَبُّكَ** · 2:30:3

| | |
|---|---|
| **Stored** | `{"arabic":"رَبُّكَ","transliteration":"rabbuka","translation":{"en":"your Lord","bn":"তোমার রব"},"morphology":{"root":"ربب","lemma":"رَبّ","pos":"Noun + Pronoun","rootCount":980}}` |
| **Corpus** | `rab~u · N · STEM\|POS:N\|LEM:rab~\|**M**\|**NOM**\|ROOT:rbb`<br>`ka · PRON · **SUFFIX\|PRON:2MS**` |
| **UI shows** | **Root:** ربب 980× · **Derivatives:** Noun + Pronoun · رَبّ |
| **Lost** | **that the pronoun is 2MS — "your (m.sg.)"**; M; NOM |

⚠️ **رَبِّ is also the single most mis-resolved surface form in the whole
dataset — 54 instances carry another word's morphology** (G-04).

---

## 16 · CONJUNCTION PREFIX + VERB + PRONOUN SUFFIX — **وَعَمِلُوا۟** · 2:25:4

| | |
|---|---|
| **Stored** | `{"arabic":"وَعَمِلُوا۟","transliteration":"waʿamilū","translation":{"en":"and do","bn":"ও কাজ করেছে"},"morphology":{"root":"عمل","lemma":"عَمِلَ","pos":"Conjunction + Verb + Pronoun","rootCount":360}}` |
| **Corpus** | `wa · CONJ · **PREFIX\|w:CONJ+**`<br>`Eamilu · V · STEM\|POS:V\|**PERF**\|LEM:Eamila\|ROOT:Eml\|**3MP**`<br>`wA@ · PRON · **SUFFIX\|PRON:3MP**` |
| **UI shows** | **Root:** عمل 360× · **Derivatives:** Conjunction + Verb + Pronoun · عَمِلَ |
| **Lost** | PERF; 3MP twice; the prefix/suffix structure |

A textbook three-segment word — prefix, stem, suffix — shown as a flat
three-term label with no structure.

---

## 17 · FORM II VERB + 2nd FEMININE SINGULAR PRONOUN — **يُبَشِّرُكِ** · 3:45:7

| | |
|---|---|
| **Stored** | `{"arabic":"يُبَشِّرُكِ","transliteration":"yubashiruki","translation":{"en":"gives you glad tidings","bn":"তোমাকে সুসংবাদ দিচ্ছেন"},"morphology":{"root":"بشر","lemma":"بُشِّرَ","pos":"Verb + Pronoun","rootCount":123}}` |
| **Corpus** | `yuba$~iru · V · STEM\|POS:V\|**IMPF**\|**(II)**\|LEM:bu$~ira\|ROOT:b$r\|**3MS**`<br>`ki · PRON · **SUFFIX\|PRON:2FS**` |
| **UI shows** | **Derivatives:** `Verb + Pronoun` · بُشِّرَ |
| **Lost** | IMPF; **(II)**; 3MS subject; **2FS object — the "you" here is feminine singular, addressed to Maryam**, which is the whole point of the āyah |

---

## 18 · HOMOGRAPH MIS-RESOLUTION (a real data defect) — **يَعْلَمُونَ** · 2:102:74

| | |
|---|---|
| **Stored** | `{"arabic":"يَعْلَمُونَ","transliteration":"yaʿlamūna","translation":{"en":"(to) know","bn":"তারা জানতো"},"morphology":{"root":"علم","lemma":"عَلَّمَ","pos":"Verb + Pronoun","rootCount":854}}` |
| **Corpus** | `yaEolamu · V · STEM\|POS:V\|IMPF\|LEM:**Ealima**\|ROOT:Elm\|3MP`<br>`wna · PRON · SUFFIX\|PRON:3MP` |
| **UI shows** | **Derivatives:** Verb + Pronoun · **عَلَّمَ** |
| **Wrong** | the true lemma is **عَلِمَ** ("he knew", Form I). The app shows **عَلَّمَ** ("he taught", Form II) — a different verb with a different meaning |

Cause: `normalizeArabicForMatch()` strips all diacritics, so the resolver
matched the wrong occurrence in the āyah. **710 word instances across 115
distinct surface forms are affected** (G-04). Compare **2:9:6 يَخْدَعُونَ**,
which is given the Form III lemma يُخَٰدِعُ instead of the Form I يَخْدَعُ.

---

## 19 · CORRUPT PART-OF-SPEECH VALUE — **إِلْ يَاسِينَ** · 37:130:3

| | |
|---|---|
| **Stored** | `{"arabic":"إِلْ يَاسِينَ","transliteration":"il yāsīna","translation":{"en":"Elijah","bn":"ইলিয়াসের\""},"morphology":{"root":"","lemma":"إِلْيَاس","pos":"**yaAsiyna**","rootCount":0}}` |
| **Corpus** | `<ilo yaAsiyna · **PN** · STEM\|POS:PN\|LEM:<iloyaAs\|GEN` |
| **UI shows** | **Derivatives:** the literal string `yaAsiyna` where a part of speech belongs |
| **Note** | the corpus says **Proper Noun**. A transliteration fragment leaked into the POS field upstream. `posLabel()` prints unknown atoms unchanged, which is the right fallback — but the screen shows nonsense. **The only such value in the whole dataset** (G-15) |

The Bangla gloss also carries a stray `"` — `ইলিয়াসের\"` — passed through
from the source.

---

## 20 · MERGED "WORD" + MERGED ROOT COUNT — **بَعْدَ مَا** · 2:181:3

| | |
|---|---|
| **Stored** | `{"arabic":"بَعْدَ مَا","transliteration":"baʿdamā","translation":{"en":"after what","bn":"এরপরেও যা"},"morphology":{"root":"بعد","lemma":"بَعْد","pos":"Time Adverb + Subordinating Conj.","rootCount":235}}` |
| **Corpus** | `baEoda · T · STEM\|POS:T\|LEM:baEod\|ROOT:bEd`<br>`maA · SUB · STEM\|POS:SUB\|LEM:maA` |
| **UI shows** | one chip containing **two** orthographic words, one merged transliteration, one merged gloss |
| **Note** | this is one of exactly **3 āyahs** (2:181, 8:6, 13:37) where the source merges two words into one entry — and the 3 places where the mushaf's own word IDs cannot be aligned with `words[].position` (G-10, G-20) |

And a companion, for the merged-root-count problem —
**ٱلصَّلَوٰةَ · 2:3:5**: `{"root":"صلو","lemma":"صَلَوٰة","pos":"Determiner + Noun","rootCount":124}`. The panel shows **صلو 124×**, but صلو itself occurs
**99** times; the 124 counts صلو **and** صلي together, because
`canonicalRootKey()` folds و/ي roots (G-09). **423 word instances display a
count that is not their own root's** — including أَبَىٰ (2:34:9) showing
**130×** where its root occurs **13** times.

---

## What these 20 words prove

| Question | Answer from the sample |
|---|---|
| Does the system work for **simple** words? | **Yes.** #1, #2, #6, #8 are handled correctly and completely. |
| Does it work for **inflected verbs**? | **Partly.** The word, gloss and root are right; tense, mood, voice, Form and person are all absent (#2, #3, #4, #5, #17). |
| Does it work for **plurals**? | **No.** Number is never shown. #10, #11, #12 give a reader no way to know the word is plural. |
| Does it work for **prefixed / suffixed** words — 54 % of all words? | **Only as a flat label.** The word is never segmented (#13, #14, #15, #16). |
| Does it work for **attached pronouns** — 20,146 words? | **No.** Presence is shown, identity never (#5, #15, #16, #17). |
| Does it show **derived forms**? | **No — never, for any word.** The panel named "Derivatives" shows POS + lemma (#3, #12, #17). |
| Is the data **correct**? | **99.1 % yes.** 710 instances across 115 surface forms carry another homograph's morphology (#18); 423 show a merged root count (#20); 1 has a corrupt POS (#19). |
| Does it **scale across the whole Qur'an**? | **The data does** — 77,429 words, zero gaps in Arabic, transliteration, English and Bangla. **The model does not** — every richer question needs a re-pull, because the information was discarded at build time and is not in the shipped files. |
