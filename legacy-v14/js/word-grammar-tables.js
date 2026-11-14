// Word card rebuild, round 1 (decision 59; docs/reference/2026-10-03-word-card-build-spec.md §1–§2).
//
// The small fixed tables the rebuilt Word card names things with. Pure data:
// no imports, no fetch, nothing at startup (I9). Every user-visible name is
// language-keyed, English and Bangla (I11). The ids are the ones
// tools/quran-data-pull/build-word-features.mjs writes into
// output/word-features/*.json and output/lemma-forms.json; a check
// (tools/i18n-verify/word-features-data.mjs) asserts every id the build can
// emit has a name here.
//
// The Arabic part names and the one sentence per verb Form are written once
// for the Owner's review (spec §2). Change the wording here and nowhere else.

/** Basic's derived-form cards, in their fixed order (spec §1, "Basic Arabic
 *  tab"). The demo's suggested order, used until the Owner gives theirs: THIS
 *  ARRAY IS THE ONE PLACE THAT ORDER LIVES. Inside a group, most frequent
 *  first; verbs also by Form number. */
export const DERIVED_GROUP_ORDER = Object.freeze(["verb", "masdar", "doer", "done", "intens", "elative", "noun", "other"]);

export const DERIVED_GROUP_LABELS = Object.freeze({
  verb: { en: "Verb", bn: "ক্রিয়া" },
  masdar: { en: "Verbal noun", bn: "ক্রিয়াবাচক বিশেষ্য" },
  doer: { en: "The one who does it", bn: "কর্তাবাচক" },
  done: { en: "The one it is done to", bn: "কর্মবাচক" },
  intens: { en: "Intensive adjectives", bn: "আধিক্যবাচক বিশেষণ" },
  elative: { en: "Comparative", bn: "তুলনাবাচক" },
  noun: { en: "Other nouns", bn: "অন্যান্য বিশেষ্য" },
  other: { en: "Other words", bn: "অন্যান্য শব্দ" },
});

/** Where a line's information comes from (spec §1, "Arabic in Depth"). The
 *  lemma-forms `src` letters map onto these: d and w are From the data
 *  (the Corpus; Wiktionary's verbal-noun list, reviewed), r is Grammar rule. */
export const SOURCE_TAGS = Object.freeze({
  data: { en: "From the data", bn: "তথ্য থেকে" },
  rule: { en: "Grammar rule", bn: "ব্যাকরণের নিয়ম" },
  needs: { en: "Needs a source", bn: "উৎস প্রয়োজন" },
  book: { en: "From a book", bn: "বই থেকে" },
});

/** Decision 61 -- the Bangla name of each Quranic Arabic Corpus relation and
 *  phrase type (the Corpus's own Arabic and English names come in its
 *  manifest; the card always keeps the Arabic beside the translation). */
export const RELATION_BN = Object.freeze({
  adj: "সিফাত (বিশেষণ)", poss: "মুযাফ ইলাইহি (সম্বন্ধপদ)", pred: "মুবতাদা ও খবর", app: "বদল", spec: "তামঈয (নির্দিষ্টকরণ)",
  cpnd: "যৌগিক সংখ্যা", subj: "ফায়েল (ক্রিয়ার কর্তা)", pass: "নায়েবে ফায়েল (কর্মবাচ্যের কর্তা)", obj: "মাফউল বিহি (ক্রিয়ার কর্ম)",
  subjx: "বিশেষ ক্রিয়া বা অব্যয়ের ইসম (কানা, ইন্না, লা প্রভৃতি)", predx: "বিশেষ ক্রিয়া বা অব্যয়ের খবর (কানা, ইন্না, লা প্রভৃতি)", impv: "আদেশ", imrs: "আদেশের জবাব", pro: "নিষেধ",
  gen: "জার ও মাজরুর", link: "মুতাআল্লিক (সংযুক্তি)", conj: "মাতুফ (সংযোজিত)", sub: "সিলা (অধীন বাক্য)", cond: "শর্ত", rslt: "শর্তের জবাব",
  circ: "হাল (অবস্থা)", cog: "মাফউল মুতলাক", prp: "মাফউল লিআজলিহি (উদ্দেশ্য)", com: "মাফউল মাআহু (সহযোগী কর্ম)", emph: "তাকিদ (জোর)",
  intg: "প্রশ্ন", neg: "নেতিবাচক", fut: "ভবিষ্যৎ", voc: "সম্বোধন", exp: "ব্যতিক্রম", res: "সীমাবদ্ধকরণ", avr: "বারণ", cert: "নিশ্চয়তা",
  ret: "প্রত্যাহার", prev: "বাধাদানকারী", ans: "উত্তর", inc: "সূচনা", sur: "আকস্মিকতা", sup: "অতিরিক্ত", exh: "উৎসাহদান", exl: "ব্যাখ্যা",
  eq: "সমতা", caus: "কারণ", amd: "সংশোধন", int: "তাফসীর (ব্যাখ্যা)",
});
export const PHRASE_BN = Object.freeze({
  S: "বাক্য", NS: "নামবাচক বাক্য", VS: "ক্রিয়াবাচক বাক্য", CS: "শর্তযুক্ত বাক্য", PP: "জার-মাজরুর বাক্যাংশ", SC: "মাসদারের সমতুল্য অধীন বাক্য",
});
export const SOURCE_OF_GROUPING = Object.freeze({ d: "data", w: "data", r: "rule" });

/** One name per word-part id. `kind` is the small label over the box. */
const PREFIX = { en: "Prefix", bn: "উপসর্গ" };
const STEM = { en: "Stem", bn: "মূল অংশ" };
const ENDING = { en: "Ending", bn: "শেষাংশ" };
export const PART_KINDS = Object.freeze({ prefix: PREFIX, stem: STEM, ending: ENDING });

export const PART_NAMES = Object.freeze({
  // Attached in front
  "det": { kind: "prefix", ar: "أَدَاةُ التَّعْرِيف", en: "Definite article", bn: "নির্দিষ্টবাচক উপসর্গ", mean: { en: "the", bn: "নির্দিষ্ট" } },
  "conj-w": { kind: "prefix", ar: "حَرْفُ عَطْف", en: "Joining particle", bn: "সংযোজক অব্যয়", mean: { en: "and", bn: "এবং" } },
  "conj-f": { kind: "prefix", ar: "حَرْفُ عَطْف", en: "Joining particle", bn: "সংযোজক অব্যয়", mean: { en: "so, then", bn: "তারপর" } },
  "p-bi": { kind: "prefix", ar: "حَرْفُ جَرّ", en: "Preposition", bn: "পদান্বয়ী অব্যয়", mean: { en: "with, by, in", bn: "দিয়ে, দ্বারা, মধ্যে" } },
  "p-l": { kind: "prefix", ar: "حَرْفُ جَرّ", en: "Preposition", bn: "পদান্বয়ী অব্যয়", mean: { en: "for, to", bn: "জন্য, প্রতি" } },
  "p-ka": { kind: "prefix", ar: "حَرْفُ جَرّ", en: "Preposition", bn: "পদান্বয়ী অব্যয়", mean: { en: "like, as", bn: "মতো" } },
  "p-w": { kind: "prefix", ar: "وَاوُ الْقَسَم", en: "Oath particle", bn: "শপথের অব্যয়", mean: { en: "by", bn: "শপথ" } },
  "p-t": { kind: "prefix", ar: "تَاءُ الْقَسَم", en: "Oath particle", bn: "শপথের অব্যয়", mean: { en: "by", bn: "শপথ" } },
  "rem-f": { kind: "prefix", ar: "حَرْفُ اسْتِئْنَاف", en: "Resumption particle", bn: "পুনরারম্ভ অব্যয়", mean: { en: "but, then", bn: "তবুও, তারপর" } },
  "rem-w": { kind: "prefix", ar: "حَرْفُ اسْتِئْنَاف", en: "Resumption particle", bn: "পুনরারম্ভ অব্যয়", mean: { en: "and", bn: "আর" } },
  "emph-l": { kind: "prefix", ar: "لَامُ التَّوْكِيد", en: "Emphasis particle", bn: "জোরদানকারী অব্যয়", mean: { en: "surely", bn: "অবশ্যই" } },
  "intg-a": { kind: "prefix", ar: "هَمْزَةُ الِاسْتِفْهَام", en: "Question particle", bn: "প্রশ্নবোধক অব্যয়", mean: { en: "is it …?", bn: "কি …?" } },
  "voc-ya": { kind: "prefix", ar: "حَرْفُ نِدَاء", en: "Calling particle", bn: "সম্বোধনসূচক অব্যয়", mean: { en: "O", bn: "হে" } },
  "voc-ha": { kind: "prefix", ar: "هَا التَّنْبِيه", en: "Attention particle", bn: "মনোযোগ আকর্ষক অব্যয়", mean: { en: "here!, behold", bn: "এই যে" } },
  "rslt-f": { kind: "prefix", ar: "الْفَاءُ الْوَاقِعَةُ فِي جَوَابِ الشَّرْط", en: "Result particle", bn: "ফলবাচক অব্যয়", mean: { en: "then", bn: "তবে" } },
  "prp-l": { kind: "prefix", ar: "لَامُ التَّعْلِيل", en: "Purpose particle", bn: "উদ্দেশ্যবাচক অব্যয়", mean: { en: "so that", bn: "যাতে" } },
  "circ-w": { kind: "prefix", ar: "وَاوُ الْحَال", en: "Circumstance particle", bn: "অবস্থাবাচক অব্যয়", mean: { en: "while", bn: "অথচ, এমন অবস্থায়" } },
  "sup-f": { kind: "prefix", ar: "حَرْفٌ زَائِد", en: "Supplemental particle", bn: "অতিরিক্ত অব্যয়", mean: { en: "(adds emphasis)", bn: "(জোর দেয়)" } },
  "sup-w": { kind: "prefix", ar: "حَرْفٌ زَائِد", en: "Supplemental particle", bn: "অতিরিক্ত অব্যয়", mean: { en: "(adds emphasis)", bn: "(জোর দেয়)" } },
  "fut-sa": { kind: "prefix", ar: "حَرْفُ اسْتِقْبَال", en: "Future particle", bn: "ভবিষ্যৎবাচক অব্যয়", mean: { en: "will", bn: "শীঘ্রই করবে" } },
  "caus-f": { kind: "prefix", ar: "فَاءُ السَّبَبِيَّة", en: "Cause particle", bn: "কারণবাচক অব্যয়", mean: { en: "so (as a result)", bn: "ফলে" } },
  "impv-l": { kind: "prefix", ar: "لَامُ الْأَمْر", en: "Command particle", bn: "আদেশসূচক অব্যয়", mean: { en: "let", bn: "যেন … করে" } },
  "eq-a": { kind: "prefix", ar: "هَمْزَةُ التَّسْوِيَة", en: "Equalising particle", bn: "সমতাবাচক অব্যয়", mean: { en: "whether", bn: "চাই … হোক" } },
  "com-w": { kind: "prefix", ar: "وَاوُ الْمَعِيَّة", en: "Accompaniment particle", bn: "সহগামিতাবাচক অব্যয়", mean: { en: "along with", bn: "সাথে" } },
  "impf-prefix": { kind: "prefix", ar: "حَرْفُ الْمُضَارَعَة", en: "Present-tense prefix", bn: "বর্তমান কালের উপসর্গ", mean: null },
  "prefix-other": { kind: "prefix", ar: "سَابِقَة", en: "Prefix", bn: "উপসর্গ", mean: null },

  // Attached behind
  "subj-waw": { kind: "ending", ar: "وَاوُ الْجَمَاعَة", en: "Plural doer ending", bn: "বহুবচন কর্তার শেষাংশ", mean: null },
  "subj-alif": { kind: "ending", ar: "أَلِفُ الِاثْنَيْن", en: "Dual doer ending", bn: "দ্বিবচন কর্তার শেষাংশ", mean: null },
  "subj-nun": { kind: "ending", ar: "نُونُ النِّسْوَة", en: "Feminine plural doer ending", bn: "স্ত্রীবাচক বহুবচন কর্তার শেষাংশ", mean: null },
  "subj-ya": { kind: "ending", ar: "يَاءُ الْمُخَاطَبَة", en: "Doer ending: you (one woman)", bn: "কর্তার শেষাংশ: তুমি (একজন নারী)", mean: null },
  "subj-ta": { kind: "ending", ar: "تَاءُ الْفَاعِل", en: "Doer ending", bn: "কর্তার শেষাংশ", mean: null },
  "subj-na": { kind: "ending", ar: "نَا الْفَاعِلِين", en: "Doer ending: we", bn: "কর্তার শেষাংশ: আমরা", mean: null },
  "pron-obj": { kind: "ending", ar: "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ نَصْب", en: "Object pronoun", bn: "কর্মবাচক সর্বনাম", mean: null },
  "pron-poss": { kind: "ending", ar: "ضَمِيرٌ مُتَّصِلٌ مُضَافٌ إِلَيْه", en: "Possessive pronoun", bn: "সম্বন্ধবাচক সর্বনাম", mean: null },
  "pron-prep": { kind: "ending", ar: "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ جَرّ", en: "Pronoun after a preposition", bn: "পদান্বয়ী অব্যয়ের পরের সর্বনাম", mean: null },
  "pron-acc": { kind: "ending", ar: "ضَمِيرٌ مُتَّصِلٌ فِي مَحَلِّ نَصْب", en: "Pronoun after a particle", bn: "অব্যয়ের পরের সর্বনাম", mean: null },
  "pron-attached": { kind: "ending", ar: "ضَمِيرٌ مُتَّصِل", en: "Attached pronoun", bn: "সংযুক্ত সর্বনাম", mean: null },
  "emph-n": { kind: "ending", ar: "نُونُ التَّوْكِيد", en: "Emphasis nūn", bn: "জোরদানকারী নূন", mean: { en: "surely", bn: "অবশ্যই" } },
  "voc-m": { kind: "ending", ar: "مِيمٌ عِوَضٌ عَنْ حَرْفِ النِّدَاء", en: "Calling mīm (in Allāhumma)", bn: "সম্বোধনের মীম (আল্লাহুম্মা)", mean: { en: "O", bn: "হে" } },
  "suffix-other": { kind: "ending", ar: "لَاحِقَة", en: "Ending", bn: "শেষাংশ", mean: null },
});

/** The stem's own name, by Corpus part-of-speech tag (`stem-<TAG>` ids). For
 *  a verb the card adds the Form (FORM_NAMES[n].ordinalAr), as the demo does:
 *  "فِعْل · الْبَاب الْخَامِس". */
export const STEM_NAMES = Object.freeze({
  V: { ar: "فِعْل", en: "Verb stem", bn: "ক্রিয়ার মূল অংশ" },
  N: { ar: "اسْم", en: "Noun", bn: "বিশেষ্য" },
  PN: { ar: "اسْمُ عَلَم", en: "Proper noun", bn: "নামবাচক বিশেষ্য" },
  ADJ: { ar: "صِفَة", en: "Adjective", bn: "বিশেষণ" },
  P: { ar: "حَرْفُ جَرّ", en: "Preposition", bn: "পদান্বয়ী অব্যয়" },
  REL: { ar: "اسْمٌ مَوْصُول", en: "Relative pronoun", bn: "সম্বন্ধসূচক সর্বনাম" },
  PRON: { ar: "ضَمِيرٌ مُنْفَصِل", en: "Pronoun", bn: "সর্বনাম" },
  DEM: { ar: "اسْمُ إِشَارَة", en: "Pointing word", bn: "নির্দেশক সর্বনাম" },
  NEG: { ar: "حَرْفُ نَفْي", en: "Negative particle", bn: "না-বাচক অব্যয়" },
  ACC: { ar: "حَرْفُ نَصْب", en: "Particle (inna and its sisters)", bn: "অব্যয় (ইন্না ও তার সমগোত্রীয়)" },
  T: { ar: "ظَرْفُ زَمَان", en: "Time word", bn: "কালবাচক শব্দ" },
  LOC: { ar: "ظَرْفُ مَكَان", en: "Place word", bn: "স্থানবাচক শব্দ" },
  COND: { ar: "أَدَاةُ شَرْط", en: "Condition word", bn: "শর্তবাচক শব্দ" },
  CONJ: { ar: "حَرْفُ عَطْف", en: "Joining particle", bn: "সংযোজক অব্যয়" },
  SUB: { ar: "حَرْفٌ مَصْدَرِيّ", en: "Subordinating particle", bn: "অধীনতাসূচক অব্যয়" },
  RES: { ar: "أَدَاةُ حَصْر", en: "Restriction particle", bn: "সীমাবদ্ধকারী অব্যয়" },
  INTG: { ar: "أَدَاةُ اسْتِفْهَام", en: "Question word", bn: "প্রশ্নবোধক শব্দ" },
  CERT: { ar: "حَرْفُ تَحْقِيق", en: "Particle of certainty", bn: "নিশ্চয়তাবাচক অব্যয়" },
  PRO: { ar: "لَا النَّاهِيَة", en: "Prohibition particle", bn: "নিষেধবাচক অব্যয়" },
  PREV: { ar: "مَا الْكَافَّة", en: "Preventive particle", bn: "বাধাদানকারী অব্যয়" },
  RET: { ar: "حَرْفُ إِضْرَاب", en: "Retraction particle", bn: "প্রত্যাহারবাচক অব্যয়" },
  EXP: { ar: "أَدَاةُ اسْتِثْنَاء", en: "Exception particle", bn: "ব্যতিক্রমবাচক অব্যয়" },
  INC: { ar: "حَرْفُ ابْتِدَاء", en: "Beginning particle", bn: "সূচনাবাচক অব্যয়" },
  EXL: { ar: "حَرْفُ تَفْصِيل", en: "Explanation particle", bn: "ব্যাখ্যাবাচক অব্যয়" },
  AMD: { ar: "حَرْفُ اسْتِدْرَاك", en: "Amendment particle", bn: "সংশোধনবাচক অব্যয়" },
  INT: { ar: "حَرْفُ تَفْسِير", en: "Interpretation particle", bn: "ব্যাখ্যাসূচক অব্যয়" },
  FUT: { ar: "حَرْفُ اسْتِقْبَال", en: "Future particle", bn: "ভবিষ্যৎবাচক অব্যয়" },
  EXH: { ar: "حَرْفُ تَحْضِيض", en: "Urging particle", bn: "উৎসাহব্যঞ্জক অব্যয়" },
  ANS: { ar: "حَرْفُ جَوَاب", en: "Answer particle", bn: "উত্তরবাচক অব্যয়" },
  SUR: { ar: "إِذَا الْفُجَائِيَّة", en: "Surprise particle", bn: "আকস্মিকতাবাচক অব্যয়" },
  AVR: { ar: "حَرْفُ رَدْع", en: "Aversion particle", bn: "প্রতিরোধবাচক অব্যয়" },
  INL: { ar: "حُرُوفٌ مُقَطَّعَة", en: "Qur'anic initials", bn: "হুরূফে মুকাত্তাআত" },
  SUP: { ar: "حَرْفٌ زَائِد", en: "Supplemental particle", bn: "অতিরিক্ত অব্যয়" },
  IMPN: { ar: "اسْمُ فِعْلِ أَمْر", en: "Command-like noun", bn: "আদেশবাচক বিশেষ্য" },
});

/** The verb Forms. `ordinalAr` is the demo's label; `babAr` the madrasa
 *  name (by the verbal noun); the past/present/verbal-noun patterns on the
 *  root ف ع ل; one sentence per Form on what it adds, with Qur'anic words
 *  (each the Form's most frequent verb, or close to it). Written for the
 *  Owner's review. */
export const FORM_NAMES = Object.freeze({
  1: {
    roman: "I", ordinalAr: "الْبَاب الْأَوَّل", babAr: "الثُّلَاثِيُّ الْمُجَرَّد", past: "فَعَلَ", present: "يَفْعَلُ", masdar: null,
    en: "The plain verb: the root's own meaning, with nothing added — عَلِمَ he knew.",
    bn: "সাধারণ ক্রিয়া: ধাতুর নিজের অর্থ, কিছুই যোগ হয় না — عَلِمَ সে জানল।",
  },
  2: {
    roman: "II", ordinalAr: "الْبَاب الثَّانِي", babAr: "بَابُ التَّفْعِيل", past: "فَعَّلَ", present: "يُفَعِّلُ", masdar: "تَفْعِيل",
    en: "Doubling the middle letter makes someone else do it, or does it with force — عَلِمَ know → عَلَّمَ teach; نَزَلَ come down → نَزَّلَ send down.",
    bn: "মাঝের অক্ষর দ্বিত্ব হলে কাজটি অন্যকে দিয়ে করানো হয়, বা জোর দিয়ে করা হয় — عَلِمَ জানা → عَلَّمَ শেখানো; نَزَلَ নামা → نَزَّلَ নাজিল করা।",
  },
  3: {
    roman: "III", ordinalAr: "الْبَاب الثَّالِث", babAr: "بَابُ الْمُفَاعَلَة", past: "فَاعَلَ", present: "يُفَاعِلُ", masdar: "مُفَاعَلَة",
    en: "A long ā after the first letter turns the action towards another person, often as an effort or a contest — قَتَلَ kill → قَاتَلَ fight against; جَاهَدَ strive.",
    bn: "প্রথম অক্ষরের পর দীর্ঘ আ কাজটিকে অন্য কারও দিকে ফেরায়, প্রায়ই চেষ্টা বা প্রতিযোগিতা হিসেবে — قَتَلَ হত্যা করা → قَاتَلَ বিরুদ্ধে যুদ্ধ করা; جَاهَدَ প্রাণপণ চেষ্টা করা।",
  },
  4: {
    roman: "IV", ordinalAr: "الْبَاب الرَّابِع", babAr: "بَابُ الْإِفْعَال", past: "أَفْعَلَ", present: "يُفْعِلُ", masdar: "إِفْعَال",
    en: "A hamza in front makes someone do it or become it — نَزَلَ come down → أَنْزَلَ send down; أَمِنَ be safe → آمَنَ believe.",
    bn: "শুরুতে হামযা যোগ হলে কাউকে দিয়ে কাজটি করানো বা কিছুতে পরিণত করা বোঝায় — نَزَلَ নামা → أَنْزَلَ নাজিল করা; أَمِنَ নিরাপদ হওয়া → آمَنَ ঈমান আনা।",
  },
  5: {
    roman: "V", ordinalAr: "الْبَاب الْخَامِس", babAr: "بَابُ التَّفَعُّل", past: "تَفَعَّلَ", present: "يَتَفَعَّلُ", masdar: "تَفَعُّل",
    en: "Ta- in front of Form II turns the action back on the doer: taking it on oneself, often step by step — عَلَّمَ teach → تَعَلَّمَ learn; ذَكَّرَ remind → تَذَكَّرَ take heed.",
    bn: "দ্বিতীয় রূপের আগে তা- যোগ হলে কাজটি কর্তার নিজের দিকে ফেরে: নিজে গ্রহণ করা, প্রায়ই ধাপে ধাপে — عَلَّمَ শেখানো → تَعَلَّمَ শেখা; ذَكَّرَ স্মরণ করানো → تَذَكَّرَ উপদেশ গ্রহণ করা।",
  },
  6: {
    roman: "VI", ordinalAr: "الْبَاب السَّادِس", babAr: "بَابُ التَّفَاعُل", past: "تَفَاعَلَ", present: "يَتَفَاعَلُ", masdar: "تَفَاعُل",
    en: "Ta- in front of Form III makes it mutual, done to one another — تَسَاءَلَ ask one another; تَنَازَعَ dispute with one another.",
    bn: "তৃতীয় রূপের আগে তা- যোগ হলে কাজটি পারস্পরিক হয় — تَسَاءَلَ একে অপরকে জিজ্ঞেস করা; تَنَازَعَ পরস্পর বিবাদ করা।",
  },
  7: {
    roman: "VII", ordinalAr: "الْبَاب السَّابِع", babAr: "بَابُ الِانْفِعَال", past: "انْفَعَلَ", present: "يَنْفَعِلُ", masdar: "انْفِعَال",
    en: "In- in front: the thing undergoes the action, it lets itself be done — قَلَبَ turn over → انْقَلَبَ turn back; انْطَلَقَ set off.",
    bn: "শুরুতে ইন- যোগ হলে বস্তুটি নিজেই কাজটির শিকার হয় — قَلَبَ উল্টানো → انْقَلَبَ ফিরে যাওয়া; انْطَلَقَ রওনা হওয়া।",
  },
  8: {
    roman: "VIII", ordinalAr: "الْبَاب الثَّامِن", babAr: "بَابُ الِافْتِعَال", past: "افْتَعَلَ", present: "يَفْتَعِلُ", masdar: "افْتِعَال",
    en: "A t after the first letter: doing it for oneself, by deliberate choice — تَبِعَ follow → اتَّبَعَ follow closely; اتَّقَى guard oneself (be mindful of Allah).",
    bn: "প্রথম অক্ষরের পর ত যোগ হলে কাজটি নিজের জন্য, সচেতনভাবে করা বোঝায় — تَبِعَ অনুসরণ করা → اتَّبَعَ নিষ্ঠার সাথে অনুসরণ করা; اتَّقَى নিজেকে রক্ষা করা (আল্লাহকে ভয় করা)।",
  },
  9: {
    roman: "IX", ordinalAr: "الْبَاب التَّاسِع", babAr: "بَابُ الِافْعِلَال", past: "افْعَلَّ", present: "يَفْعَلُّ", masdar: "افْعِلَال",
    en: "The last letter doubled: taking on a colour or a bodily state — ابْيَضَّ become white; اسْوَدَّ become black.",
    bn: "শেষ অক্ষর দ্বিত্ব হলে কোনো রং বা শারীরিক অবস্থা ধারণ করা বোঝায় — ابْيَضَّ সাদা হওয়া; اسْوَدَّ কালো হওয়া।",
  },
  10: {
    roman: "X", ordinalAr: "الْبَاب الْعَاشِر", babAr: "بَابُ الِاسْتِفْعَال", past: "اسْتَفْعَلَ", present: "يَسْتَفْعِلُ", masdar: "اسْتِفْعَال",
    en: "Ista- in front: seeking or asking for it, or holding something to be so — غَفَرَ forgive → اسْتَغْفَرَ ask forgiveness; اسْتَكْبَرَ hold oneself great (be arrogant).",
    bn: "শুরুতে ইস্তা- যোগ হলে কিছু চাওয়া বা প্রার্থনা করা, অথবা কিছুকে তেমন মনে করা বোঝায় — غَفَرَ ক্ষমা করা → اسْتَغْفَرَ ক্ষমা প্রার্থনা করা; اسْتَكْبَرَ নিজেকে বড় মনে করা (অহংকার করা)।",
  },
  11: {
    roman: "XI", ordinalAr: "الْبَاب الْحَادِي عَشَر", babAr: "بَابُ الِافْعِيلَال", past: "افْعَالَّ", present: "يَفْعَالُّ", masdar: "افْعِيلَال",
    en: "Like Form IX, but stronger; very rare — مُدْهَامَّتَانِ deep dark green, once in the Qur'an.",
    bn: "নবম রূপের মতো, তবে আরও জোরালো; খুবই বিরল — مُدْهَامَّتَانِ গাঢ় সবুজ, কুরআনে একবার।",
  },
  12: {
    roman: "XII", ordinalAr: "الْبَاب الثَّانِي عَشَر", babAr: "بَابُ الِافْعِيعَال", past: "افْعَوْعَلَ", present: "يَفْعَوْعِلُ", masdar: "افْعِيعَال",
    en: "The Quranic Arabic Corpus files اطْمَأَنَّ (be at rest, at peace) here; it names a settled, lasting state. Grammarians usually count it as a four-letter root's form.",
    bn: "কুরআনিক অ্যারাবিক কর্পাস اطْمَأَنَّ (প্রশান্ত হওয়া) এখানে রাখে; এটি স্থির, স্থায়ী অবস্থা বোঝায়। ব্যাকরণবিদরা সাধারণত একে চার অক্ষরের ধাতুর রূপ ধরেন।",
  },
});

/** The 14 persons, in the conjugation poster's order (spec §1, "Verb
 *  Conjugation"), keyed by the Corpus person-gender-number code. */
export const PERSONS = Object.freeze([
  { pgn: "3MS", ar: "هُوَ", en: "he", bn: "সে", obj: { en: "him", bn: "তাকে" }, poss: { en: "his", bn: "তার" } },
  { pgn: "3MD", ar: "هُمَا", en: "they two", bn: "তারা দুজন", obj: { en: "them two", bn: "তাদের দুজনকে" }, poss: { en: "their (two)", bn: "তাদের দুজনের" } },
  { pgn: "3MP", ar: "هُمْ", en: "they", bn: "তারা", obj: { en: "them", bn: "তাদেরকে" }, poss: { en: "their", bn: "তাদের" } },
  { pgn: "3FS", ar: "هِيَ", en: "she", bn: "সে (নারী)", obj: { en: "her, it", bn: "তাকে" }, poss: { en: "her, its", bn: "তার" } },
  { pgn: "3FD", ar: "هُمَا", en: "they two (f)", bn: "তারা দুজন (নারী)", obj: { en: "them two (f)", bn: "তাদের দুজনকে" }, poss: { en: "their (two, f)", bn: "তাদের দুজনের" } },
  { pgn: "3FP", ar: "هُنَّ", en: "they (f)", bn: "তারা (নারীরা)", obj: { en: "them (f)", bn: "তাদেরকে" }, poss: { en: "their (f)", bn: "তাদের" } },
  { pgn: "2MS", ar: "أَنْتَ", en: "you", bn: "তুমি", obj: { en: "you", bn: "তোমাকে" }, poss: { en: "your", bn: "তোমার" } },
  { pgn: "2MD", ar: "أَنْتُمَا", en: "you two", bn: "তোমরা দুজন", obj: { en: "you two", bn: "তোমাদের দুজনকে" }, poss: { en: "your (two)", bn: "তোমাদের দুজনের" } },
  { pgn: "2MP", ar: "أَنْتُمْ", en: "you all", bn: "তোমরা", obj: { en: "you all", bn: "তোমাদেরকে" }, poss: { en: "your (all)", bn: "তোমাদের" } },
  { pgn: "2FS", ar: "أَنْتِ", en: "you (f)", bn: "তুমি (নারী)", obj: { en: "you (f)", bn: "তোমাকে" }, poss: { en: "your (f)", bn: "তোমার" } },
  { pgn: "2FD", ar: "أَنْتُمَا", en: "you two (f)", bn: "তোমরা দুজন (নারী)", obj: { en: "you two (f)", bn: "তোমাদের দুজনকে" }, poss: { en: "your (two, f)", bn: "তোমাদের দুজনের" } },
  { pgn: "2FP", ar: "أَنْتُنَّ", en: "you all (f)", bn: "তোমরা (নারীরা)", obj: { en: "you all (f)", bn: "তোমাদেরকে" }, poss: { en: "your (all, f)", bn: "তোমাদের" } },
  { pgn: "1S", ar: "أَنَا", en: "I", bn: "আমি", obj: { en: "me", bn: "আমাকে" }, poss: { en: "my", bn: "আমার" } },
  { pgn: "1P", ar: "نَحْنُ", en: "we", bn: "আমরা", obj: { en: "us", bn: "আমাদেরকে" }, poss: { en: "our", bn: "আমাদের" } },
]);
/** What a part box says a person-carrying part means (spec §1, "Word-part
 *  boxes"; the demo's "they (doing it now)", "they (many)"). `{p}` is the
 *  person in the reader's language: the subject form for the present prefix
 *  and doer endings, PERSONS[].obj for an object, PERSONS[].poss for a
 *  possessive, and the object form after a preposition or particle. */
export const PART_MEANING_TEMPLATES = Object.freeze({
  "impf-prefix": { en: "{p} (doing it now)", bn: "{p} (এখন করে)", form: "subject" },
  subj: { en: "{p} (the doer)", bn: "{p} (কর্তা)", form: "subject" },
  "pron-obj": { en: "{p}", bn: "{p}", form: "obj" },
  "pron-poss": { en: "{p}", bn: "{p}", form: "poss" },
  "pron-prep": { en: "{p}", bn: "{p}", form: "obj" },
  "pron-acc": { en: "{p}", bn: "{p}", form: "obj" },
  "pron-attached": { en: "{p}", bn: "{p}", form: "obj" },
});

/** The meaning line for one part box, or null. `pgn` is the part's own
 *  person from the data's `pp`; `lang` is "en" or "bn". */
export function partMeaning(id, pgn, lang) {
  const named = PART_NAMES[id]?.mean;
  if (named) return named[lang] || named.en;
  const t = PART_MEANING_TEMPLATES[id] || (String(id).startsWith("subj-") ? PART_MEANING_TEMPLATES.subj : null);
  const person = pgn ? personFor(pgn) : null;
  if (!t || !person) return null;
  const p = t.form === "subject" ? person[lang] : person[t.form][lang];
  return t[lang].replace("{p}", p);
}

/** The Corpus also writes a dual without gender (3D, 2D); read it as the
 *  masculine dual, which is the form both share. */
export const PGN_ALIASES = Object.freeze({ "3D": "3MD", "2D": "2MD" });
export function personFor(pgn) {
  const key = PGN_ALIASES[pgn] || pgn;
  return PERSONS.find((p) => p.pgn === key) || null;
}

export const TENSE_NAMES = Object.freeze({
  PERF: { ar: "الْمَاضِي", en: "Past", bn: "অতীত" },
  IMPF: { ar: "الْمُضَارِع", en: "Present", bn: "বর্তমান" },
  IMPV: { ar: "الْأَمْر", en: "Command", bn: "আদেশ" },
});

export const MOOD_NAMES = Object.freeze({
  IND: { ar: "مَرْفُوع", en: "Indicative (plain)", bn: "মারফূ (সাধারণ)" },
  SUBJ: { ar: "مَنْصُوب", en: "Subjunctive", bn: "মানসূব" },
  JUS: { ar: "مَجْزُوم", en: "Jussive", bn: "মাজযূম" },
});

export const VOICE_NAMES = Object.freeze({
  active: { ar: "مَبْنِيٌّ لِلْمَعْلُوم", en: "Active", bn: "কর্তৃবাচ্য" },
  passive: { ar: "مَبْنِيٌّ لِلْمَجْهُول", en: "Passive", bn: "কর্মবাচ্য" },
});

export const DERIV_NAMES = Object.freeze({
  AP: { ar: "اسْمُ الْفَاعِل", en: "Active participle", bn: "কর্তাবাচক বিশেষ্য" },
  PP: { ar: "اسْمُ الْمَفْعُول", en: "Passive participle", bn: "কর্মবাচক বিশেষ্য" },
  VN: { ar: "الْمَصْدَر", en: "Verbal noun", bn: "ক্রিয়াবাচক বিশেষ্য" },
});

/** The name of one word part, or null for an id this table does not know. */
export function partName(id) {
  if (PART_NAMES[id]) return PART_NAMES[id];
  if (typeof id === "string" && id.startsWith("stem-")) {
    const s = STEM_NAMES[id.slice(5)];
    return s ? { kind: "stem", ...s, mean: null } : null;
  }
  return null;
}

/** Basic's cards in their fixed order: by DERIVED_GROUP_ORDER, verbs by Form
 *  number, then most frequent first, then by the Arabic (so the order never
 *  depends on the order the data arrived in). Each item is
 *  { lemma, group, form, count }; returns a new array. */
export function orderDerivedForms(items) {
  const rank = (g) => {
    const i = DERIVED_GROUP_ORDER.indexOf(g);
    return i === -1 ? DERIVED_GROUP_ORDER.length : i;
  };
  return [...items].sort((a, b) => rank(a.group) - rank(b.group)
    || (a.group === "verb" ? (a.form || 1) - (b.form || 1) : 0)
    || (b.count || 0) - (a.count || 0)
    || String(a.lemma).localeCompare(String(b.lemma)));
}
