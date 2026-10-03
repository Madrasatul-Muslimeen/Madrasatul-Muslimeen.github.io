# Sources for the three "Needs a source" lines — what is downloadable (3 Oct 2026)

All URLs below returned HTTP 200 from this sandbox unless marked otherwise. Copies of the files are saved in this scratchpad.

## 1. Sentence-level iʿrāb / syntax: Quranic Arabic Corpus

**QuranTree.jl (alstat) does NOT have the treebank.** Its `data/` folder holds only `quran-uthmani-final.txt` and `quranic-corpus-morphology-0.4.txt` (6,309,503 B).

**The treebank is in Kais Dukes's own Corpus 2.0 backend repo, `kaisdukes/quranic-corpus-api`:**

| File | URL | Size |
|---|---|---|
| Dependency graphs | https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/main/src/main/resources/data/syntax.txt | 1,925,133 B |
| Arabic iʿrāb prose | https://raw.githubusercontent.com/kaisdukes/quranic-corpus-api/main/src/main/resources/data/irab.tsv | 12,236,184 B |
| (also) morphology.txt, lemmas.txt, quran-uthmani.xml (Tanzil 1.0.2, CC BY-ND 3.0) | same folder | 2.6 MB / – / 1.5 MB |

Listing: `https://data.jsdelivr.com/v1/package/gh/kaisdukes/quranic-corpus-api@main/flat`. The `/irab` endpoint and `/syntax` controllers in `src/main/java/app/qurancorpus/{irab,syntax}` read these files.

**syntax.txt: format and coverage.** It holds 7,373 graphs, each ending in `go`. Each graph has three blocks:
- `-- words`: `nK = word(s:a:w)`, with one node per morphological segment, e.g. `n1, n2, n3 = word(2:102:1)`. Hidden or elided nodes appear as `V(*)` or `N(*)`, and `reference(...)` is used too.
- `-- phrases`: e.g. `PP(n7 - n8)` or `VS(n5 - n9)`.
- `-- edges`: `rel(dependent - head)`.

The commonest relations are: subj 7694, link 5815, gen 5481, obj 4907, poss 3912, conj 2504, sub 1929, pred 1741, subjx, predx, adj, neg, cond, circ, rslt, emph, pass, app, voc and others (about 45 labels in all).

**Coverage:** surahs **1–8 complete, 9 partial (91 of 129 āyāt), 59–114 complete**. That is 2,436 verses and 32,617 distinct words of 77,429 (about 42%). Surahs 10–58 are absent. **2:102 IS covered.** Its first graph:
```
-- words
n1, n2, n3 = word(2:102:1)      (وَاتَّبَعُوا = wa + verb + pronoun)
n4 = word(2:102:2) ... n9 = word(2:102:7)
-- phrases
n10 = PP(n7 - n8)
n11 = VS(n5 - n9)
-- edges
subj(n3 - n2)
obj(n4 - n2)
subj(n6 - n5)
gen(n8 - n7)
link(n10 - n5)
poss(n9 - n8)
sub(n11 - n4)
```
**irab.tsv: format and coverage.** It has 30,486 lines of the form `tokenCount<TAB>Arabic text`, with newlines written as a literal `\n`. Each line covers the next `tokenCount` Qur'an words in sequence. The counts sum to **77,429, so the WHOLE Qur'an is covered** (see `IrabLoader.java`). Alignment was verified at 2:102 (word index 1716):
```
1  وَاتَّبَعُوا: الواو: عاطفة اتبعوا: فعل ماض مبني على الضم لاتصاله بواو الجماعة. الواو: ضمير متصل في محل رفع فاعل والألف فارقة.
3  ما تَتْلُوا الشَّياطِينُ: ما: اسم موصول مبني على السكون في محل نصب مفعول به. تتلو: فعل مضارع مرفوع ...
3  يُعَلِّمُونَ النَّاسَ السِّحْرَ: ... الناس: مفعول به أول. السحر: مفعول به ثان منصوب بالفتحة.
```

**Licences: read this before using the files.**
- **Morphology** carries the QAC's own block: "Copyright (C) 2011 Kais Dukes / License: GNU General Public License … can be used in any website or application, provided its source (the Quranic Arabic Corpus) is clearly indicated, and a link is made to http://corpus.quran.com". The block also says verbatim copies only ("CHANGING IT IS NOT ALLOWED").
- **corpus.quran.com/license.jsp** serves GPL v3. The frontend repo `kaisdukes/quranic-corpus` has a GPL v3 LICENSE.
- **`quranic-corpus-api` has NO LICENSE file** (`/LICENSE` returns 404) and its README states no licence.
- **syntax.txt** is the QAC treebank itself, which the corpus site places under GPL. That attribution is reasonable, but the file in this repo has no header of its own.
- **irab.tsv is a separate problem.** It names no source anywhere: not in the repo, not in the frontend (`irab-view.tsx` only titles it "Grammar (إعراب)"). Its wording ("تعرب إعراب «اتَّبَعُوا»", "والألف فارقة") reads like a modern printed iʿrāb work, probably Bahjat Ṣāliḥ's *al-Iʿrāb al-Mufaṣṣal*. I have NOT confirmed that. **Treat irab.tsv as rights-unknown or likely copyrighted, and do not ship it without Owner and rights review.** syntax.txt (GPL, with attribution and a link) is the defensible one.

## 2. Near-synonyms: Abū Hilāl al-ʿAskarī, al-Furūq al-Lughawiyya (OpenITI)

**How the files were found.** jsdelivr refuses to list `OpenITI/0400AH` (over 50 MB) and github.com is blocked. The file names came from OpenITI's metadata table https://raw.githubusercontent.com/OpenITI/kitab-metadata-automation/master/output/OpenITI_Github_clone_metadata_light.csv (12.5 MB, 13,365 rows, with a `url` column). There are five versions, all in `OpenITI/0400AH/data/0395AbuHilalCaskari/0395AbuHilalCaskari.FuruqLughawiyya/`:

| Version | Edition | Status | Size |
|---|---|---|---|
| `…FuruqLughawiyya.JK006960-ara1` | (unstated) | **pri** | 711,853 B |
| **`…FuruqLughawiyya.Shamela0010414-ara1`** | محمد إبراهيم سليم، دار العلم والثقافة، القاهرة (the standard Cairo ed.) | sec | 712,577 B |
| `…Shamela0001736-ara1` | Bayt Allāh Bayāt, Muʾassasat al-Nashr al-Islāmī, Qum (the merged Furūq of al-ʿAskarī and al-Jazāʾirī) | sec | 423k chars |
| `…Shia003912-ara1`, `…Masaha004742-ara1` | Qum 1412; Dār al-Āfāq al-Jadīda | sec | |

The recommended file is https://raw.githubusercontent.com/OpenITI/0400AH/master/data/0395AbuHilalCaskari/0395AbuHilalCaskari.FuruqLughawiyya/0395AbuHilalCaskari.FuruqLughawiyya.Shamela0010414-ara1 (200). The file has no extension.

**Structure (OpenITI mARkdown).**
- It opens with a `#META#` header (editor, publisher), then `#META#Header#End#`.
- An entry heading is **`### | الفرق بين X وY`**. There are **844 headings of that form**, out of 941 `### |` headings in all. The rest are chapter (`الباب الأول`…) or sub-section headings such as `ومن قبيل الكلام القسم`.
- A paragraph starts with `# `, and a line that continues it starts with `~~`.
- Page ends are marked **`PageV01P079`**, meaning vol. 1, p. 79 of the Salīm edition (last is P314).
- `ms053` markers are OpenITI's 300-word milestones and must be stripped.
- The text has typos inherited from Shamela, e.g. `### | الفقرق بين الخشية والشفقة` and `أقسمام`. Headings need normalising before matching, and no heading should be trusted verbatim.
- The JK version uses `# | الفرق بين …` (a one-hash heading) and ends at P349, so it follows a different pagination.

**Sample 1, line 1526 (p. 79/80):**
```
### | الفرق بين العلم والمعرفة
# أن المعرفة أخص من العلم لأنها علمت بعين الشيء مفصلا عما سواه والعلم
~~يكون مجملا ومفصلا قال الزهري لا أصف الله بأنه عارف ولا أعنف من يصفه بذلك ...
```
**Sample 2, line 5418 (p. 240):**
```
### | الفرق بين الخوف والخشية
# أن الخوف يتعلق بالمكروه ويترك المكروه تقول خفت زيدا كما قال تعالى
~~(يخافون ربهم من فوقهم) ... والخشية تتعلق بمنزل المكروه ولا يسمى الخوف من نفس المكروه خشية
```

## 3. Classical usage: al-Rāghib al-Iṣfahānī, al-Mufradāt (OpenITI 0525AH)

There are five versions in `OpenITI/0525AH/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/`. The two that matter:

| Version | Edition | Status | Size |
|---|---|---|---|
| **`…Mufradat.Shamela0023636-ara1`** | صفوان عدنان الداودي، دار القلم / الدار الشامية، دمشق–بيروت، ط1 1412هـ (the standard critical ed.) | sec | 2,232,195 B |
| `…Mufradat.JK001150-ara1` | محمد سيد كيلاني، دار المعرفة، بيروت | **pri** | 1,967,892 B |

There are also Masaha003644 (Dāwūdī, 1.1M chars), ShamAY0034092 (Kīlānī) and Shia002552.

The recommended file is https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.Shamela0023636-ara1 (200).

**Structure.**
- It starts with the editor's introduction and biography.
- Letter books are headed `### | كتاب الألف` and `### | كتاب الباء`, and so on.
- A root entry is **usually** a heading `### | أبا` (1,706 headings of the form `### | <2–5 letters>`) followed by `# الأب: …`.
- It is **NOT consistent.** Some roots, **including علم**, appear only as a bare paragraph `# علم` (86 such lines). There is also a spurious `### | علم` inside a verse of poetry a few lines earlier, and 559 `### | 330-` headings that are poem or footnote numbers. A parser must allow for all of this and be checked against an independent list of Mufradāt roots.
- Qur'an citations are inline as `[البقرة/ 187]`, which makes them linkable to āyāt.
- Page ends are `PageV01P579`, which is **the Dāwūdī edition (Dār al-Qalam 1412)**, P001–P901 (881 markers in vol. 1).
- Footnote callers appear as `«1»`.

**Sample, root علم (line 16319, Dāwūdī p. 580):**
```
# علم
# العلم: إدراك الشيء بحقيقته، وذلك ضربان:
# أحدهما: إدراك ذات الشيء.
# والثاني: الحكم على الشيء بوجود شيء هو موجود له، أو نفي شيء هو منفي
~~عنه.
# فالأول: هو المتعدي إلى مفعول واحد نحو:
# لا تعلمونهم الله يعلمهم
# [الأنفال/ 60] .
```

## OpenITI licence

None of `0400AH`, `0525AH` or `RELEASE` has a LICENSE file (all three return 404). The authoritative statement is the Zenodo release record https://zenodo.org/api/records/3082463, which returns `"license": {"id": "cc-by-nc-sa-4.0"}` for the latest release, **2025.1.9 (30 Dec 2025)**. The citation it asks for is: Romanov, Maxim, and Masoumeh Seydi, *OpenITI: A Machine-Readable Corpus of Islamicate Texts*, Zenodo, doi:10.5281/zenodo.3082463.

So the licence is **CC BY-NC-SA 4.0**: attribution, non-commercial only, and share-alike. The underlying medieval works are public domain, but the digitised edition text, apparatus and page mapping come via Shamela or other transcriptions of modern editions (Salīm; Dāwūdī 1412, a copyrighted critical edition). That needs an Owner or rights call before shipping excerpts. Short quoted extracts with citation are the conservative use.

## Other iʿrāb sources (brief)

OpenITI holds classical iʿrāb works, all under the same CC BY-NC-SA terms and found in the metadata CSV:
- al-Naḥḥās, *Iʿrāb al-Qurʾān* (0338): JK001417 pri, Shamela0023587.
- Makkī, *Mushkil Iʿrāb al-Qurʾān* (0437): JK000445, Shamela0005538.
- al-ʿUkbarī, *al-Tibyān fī Iʿrāb al-Qurʾān* (0616): JK001420 pri, al-Bajāwī edition.
- al-Muntajab al-Hamadhānī, *al-Farīd* (0643).
- Ibn Sīda (0458) and al-Anṣārī (0926).

These are commentary prose arranged by āyah, not aligned to words, so linking them to words would need its own alignment work. No modern word-aligned iʿrāb under an open licence turned up apart from the QAC files above. Note that the attributions for irab.tsv are unresolved.
