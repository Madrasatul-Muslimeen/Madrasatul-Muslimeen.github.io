// The 99 Names in Bangla script (full app translation, phase 6).
//
// Kept as its own file rather than inside bn.js for the same reason
// surah-names-bn.js is: this is DATA, not interface wording. It is indexed
// by the Name's number, it is exactly 99 entries long, and it will never
// gain or lose a row. bn.js stays readable as a list of the app's own words.
//
// WHY THIS FILE EXISTS AT ALL. Before phase 6 a card showed three lines:
// the Arabic (الرحمن), a Latin transliteration (Ar-Rahman) and the English
// meaning. A reader who knows only Bangla can read none of the second line
// -- it is dead space on the screen for exactly the person this whole
// translation is for. So the transliteration is language-keyed too, the
// same call the owner made about Bengali numerals.
//
// The MEANINGS are not here. They live in bn.js keyed by their English
// text, because the English meaning is interface wording written by this
// app, and that is what tools/i18n-coverage.mjs counts. Two files, one
// entry each per Name -- see asma-data.js's own header for the map.
//
// ---------------------------------------------------------------------
// FOR THE OWNER
// ---------------------------------------------------------------------
// Owner's decision, 14 Aug 2026: base these on the standard Bangladeshi
// renderings -- the spellings used in the Islamic Foundation Bangladesh
// Bangla Qur'an and the 99-Names lists that circulate from IFB and
// As-Sunnah Foundation -- rather than transliterating the Latin afresh.
// The owner intends to supply their own prepared list later; replacing
// this table wholesale is a single edit to this one file, with no schema
// change, no Firestore write and nothing to deploy but the static files.
//
// Correct any line freely. Change ONLY the Bangla; the number in front of
// it is the Name's number (unit-keys.js keys records as `name:{number}`)
// and must never change.
//
// Lines marked  // ?  are the ones worth your eye first:
//   55/77  Al-Waliyy and Al-Wali are two distinct Names that most Bangla
//          lists render identically as আল-ওয়ালী. Written apart here so a
//          reader can tell which card they are on -- correct if your own
//          list keeps them the same.
//   91     Ad-Darr. Rendered as an ability held within His wisdom, not as
//          an attribute of doing harm. Theologically the most sensitive
//          line in the file.
//
// The number itself is NOT in this table. It is added at display time and
// converted to Bengali digits by num(), so a card reads "১. আর-রহমান"
// without every row spelling the digit out.

export const ASMA_NAMES_BN = {
  1: "আর-রহমান",
  2: "আর-রহীম",
  3: "আল-মালিক",
  4: "আল-কুদ্দূস",
  5: "আস-সালাম",
  6: "আল-মুমিন",
  7: "আল-মুহাইমিন",
  8: "আল-আযীয",
  9: "আল-জাব্বার",
  10: "আল-মুতাকাব্বির",
  11: "আল-খালিক",
  12: "আল-বারী",
  13: "আল-মুসাউইর",
  14: "আল-গাফ্‌ফার",
  15: "আল-কাহ্‌হার",
  16: "আল-ওয়াহ্‌হাব",
  17: "আর-রাযযাক",
  18: "আল-ফাত্তাহ",
  19: "আল-আলীম",
  20: "আল-কাবিদ",
  21: "আল-বাসিত",
  22: "আল-খাফিদ",
  23: "আর-রাফি",
  24: "আল-মুইয্‌য",
  25: "আল-মুযিল্ল",
  26: "আস-সামী",
  27: "আল-বাসীর",
  28: "আল-হাকাম",
  29: "আল-আদল",
  30: "আল-লাতীফ",
  31: "আল-খাবীর",
  32: "আল-হালীম",
  33: "আল-আযীম",
  34: "আল-গাফূর",
  35: "আশ-শাকূর",
  36: "আল-আলিইয়্যু",
  37: "আল-কাবীর",
  38: "আল-হাফীয",
  39: "আল-মুকীত",
  40: "আল-হাসীব",
  41: "আল-জালীল",
  42: "আল-কারীম",
  43: "আর-রাকীব",
  44: "আল-মুজীব",
  45: "আল-ওয়াসি",
  46: "আল-হাকীম",
  47: "আল-ওয়াদূদ",
  48: "আল-মাজীদ",
  49: "আল-বাইস",
  50: "আশ-শাহীদ",
  51: "আল-হাক্ক",
  52: "আল-ওয়াকীল",
  53: "আল-কাউইয়্যু",
  54: "আল-মাতীন",
  55: "আল-ওয়ালিইয়্যু", // ?  distinct from 77 -- see the note above
  56: "আল-হামীদ",
  57: "আল-মুহসী",
  58: "আল-মুবদি",
  59: "আল-মুঈদ",
  60: "আল-মুহ্‌ইী",
  61: "আল-মুমীত",
  62: "আল-হাইয়্যু",
  63: "আল-কাইয়্যূম",
  64: "আল-ওয়াজিদ",
  65: "আল-মাজিদ",
  66: "আল-ওয়াহিদ",
  67: "আল-আহাদ",
  68: "আস-সামাদ",
  69: "আল-কাদির",
  70: "আল-মুক্তাদির",
  71: "আল-মুকাদ্দিম",
  72: "আল-মুআখখির",
  73: "আল-আউয়াল",
  74: "আল-আখির",
  75: "আয-যাহির",
  76: "আল-বাতিন",
  77: "আল-ওয়ালী", // ?  distinct from 55 -- see the note above
  78: "আল-মুতাআলী",
  79: "আল-বার্‌র",
  80: "আত-তাউওয়াব",
  81: "আল-মুনতাকিম",
  82: "আল-আফুউ",
  83: "আর-রাউফ",
  84: "মালিকুল মুলক",
  85: "যুল-জালালি ওয়াল-ইকরাম",
  86: "আল-মুকসিত",
  87: "আল-জামি",
  88: "আল-গানিইয়্যু",
  89: "আল-মুগনী",
  90: "আল-মানি",
  91: "আদ-দার্‌র", // ?  see the note above
  92: "আন-নাফি",
  93: "আন-নূর",
  94: "আল-হাদী",
  95: "আল-বাদী",
  96: "আল-বাকী",
  97: "আল-ওয়ারিস",
  98: "আর-রাশীদ",
  99: "আস-সাবূর",
};
