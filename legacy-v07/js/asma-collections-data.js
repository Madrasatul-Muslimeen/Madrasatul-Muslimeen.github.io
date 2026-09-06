// Asma Collections — seed data, imported from the owner's own uploaded
// "Asmaul Husna v01.20" board (a6e4e1c2-Asmaul_Husna__v01.20__16.08.26.html),
// 29 Aug 2026.
//
// That file is the owner's own hand-organised list: 19 themed groups, each
// holding Names or short honorific phrases about Allah, most carrying a
// Qur'an or hadith reference, some marked (by the owner, in their own tool)
// as resting on a weak or disputed hadith. 128 distinct items total — the
// owner asked to write "129" as a placeholder count in the UI for now,
// correctable once the grouping itself is finalised; this file's own real,
// counted total is 128, and every count-driving screen should read
// `DEFAULT_ASMA_COLLECTIONS`/`DEFAULT_EXTRA_ASMA_NAMES` directly rather than
// a hardcoded number, so the on-screen count is never more than one
// placeholder string away from correct.
//
// THE SPLIT, mirroring js/qcr-data.js's own reasoning: 95 of the 128 items
// are already one of the 99 canonical Names in asma-data.js (I5's own
// permanent numbering, 1..99, unchanged here) — those are referenced by
// their existing `name:N` unit key, exactly like an existing āyah is in
// qcr-data.js. The other 33 are NOT in the canonical 99 (extra Names from
// weaker hadith, or short honorific phrases like "Subhanahu"/"Azza wa
// Jalla") — asma-data.js is fixed platform content with no room to grow, so
// these get their own permanent numbers continuing from 100, carried here
// as full records (DEFAULT_EXTRA_ASMA_NAMES) rather than folded into that
// file. A number, once assigned here, never changes (I5) — moving an item
// between groups later only ever changes which collection's `items[]`
// array lists its `name:N` key, never the number itself, so any progress
// recorded against it is never at risk of silently pointing at a different
// Name.
//
// bn is filled DIRECTLY on every extra (not left null for a bn.js
// catalogue lookup, unlike asma-data.js's own 99 canonical entries) —
// there is no pre-existing English original to key a translation off for
// content the owner wrote in Bangla first. bnName is the Name's own Bangla
// script rendering (e.g. "আল-ইলাহ"), read straight off the owner's file;
// transliteration is a Latin rendering written for this round, checked
// name by name against standard convention (not present in the owner's
// own file, which only ever gave Bangla).
//
// Both arrays are seed DEFAULTS, exactly like qcr-data.js's own
// DEFAULT_QCR_COLLECTIONS -- a brand-new tenant sees these until the first
// Manage-mode edit persists its own copy to asmaCollections/{tenantId}
// (js/asma-collections.js's collectionsFrom()/extraNamesFrom(), the same
// "first save seeds it" shape taglines.js/qcr.js already use).

// The owner's file also flagged 14 of the CANONICAL 99 (not only the 33
// extras) as resting on a weak/disputed hadith -- a real fact worth
// keeping, not something to silently drop just because the canonical
// Name's own record lives in asma-data.js rather than here. Checked
// directly against the source file's own per-item flag, not guessed:
// Al-'Adl (29), Al-Khafid (22), Ar-Rafi' (23), Al-Jalil (41), Al-Ba'ith
// (49), Al-Muhsi (57), Al-Wajid (64), Al-Muqsit (86), Al-Mughni (89),
// Ad-Darr (91), An-Nafi' (92), Al-Baqi (96), Ar-Rashid (98), As-Sabur (99).
export const DEFAULT_WEAK_CANONICAL_NUMBERS = Object.freeze([22, 23, 29, 41, 49, 57, 64, 86, 89, 91, 92, 96, 98, 99]);

// Round 2 -- the owner's file gave a reference for 95 of the 99 canonical
// Names too (not only the 33 extras, which already carry their own `ref`
// field below); this is that mapping, extracted the same way. Parsed by
// js/asma-ref-parser.js into individual Qur'an/Hadith citations for the
// detail screen's own reference chips -- see that file's own header for
// exactly which formats it handles, verified against every one of these
// strings before anything was wired to a screen. Four canonical numbers
// (36, 65, 69, 77) simply had no reference in the owner's own file and
// are absent here rather than guessed at.
export const DEFAULT_CANONICAL_REFS = Object.freeze({
  1: "কুরআন ১:১; ৫৫:১", 2: "কুরআন ১:১; ২:১৬৩", 3: "কুরআন ৫৯:২৩; ২০:১১৪",
  4: "কুরআন ৫৯:২৩; ৬২:১", 5: "কুরআন ৫৯:২৩", 6: "কুরআন ৫৯:২৩", 7: "কুরআন ৫৯:২৩",
  8: "কুরআন ৫৯:২৩; ৩:৬", 9: "কুরআন ৫৯:২৩", 10: "কুরআন ৫৯:২৩",
  11: "কুরআন ৫৯:২৪; ১৩:১৬", 12: "কুরআন ৫৯:২৪", 13: "কুরআন ৫৯:২৪",
  14: "কুরআন ২০:৮২; ৩৮:৬৬", 15: "কুরআন ১৩:১৬; ৪০:১৬", 16: "কুরআন ৩:৮; ৩৮:৯",
  17: "কুরআন ৫১:৫৮", 18: "কুরআন ৩৪:২৬", 19: "কুরআন ২:১৫৮; ৬:১০১",
  20: "কুরআন ২:২৪৫; তিরমিযী ১৩১৪", 21: "কুরআন ২:২৪৫; তিরমিযী ১৩১৪ — হাসান সহীহ",
  22: "তিরমিযী ৩৫০৭ — দ্বঈফ", 23: "কুরআন ৬:৮৩; তিরমিযী ৩৫০৭ — দ্বঈফ",
  24: "কুরআন ৩:২৬", 25: "কুরআন ৩:২৬", 26: "কুরআন ১৭:১; ২:১২৭",
  27: "কুরআন ১৭:১; ৪:৫৮", 28: "সুনানে নাসাঈ ৫৩৮৭ — সহীহ", 29: "তিরমিযী ৩৫০৭ — দ্বঈফ",
  30: "কুরআন ৬:১০৩; ৬৭:১৪", 31: "কুরআন ৬:১০৩; ২২:৬৩", 32: "কুরআন ২:২২৫; ১৭:৪৪",
  33: "কুরআন ২:২৫৫; ৪২:৪", 34: "কুরআন ২:১৭৩; ৩:১৫৫", 35: "কুরআন ৩৫:৩০; ৬৪:১৭",
  37: "কুরআন ১৩:৯; ২২:৬২", 38: "কুরআন ১১:৫৭; ৪২:৬", 39: "কুরআন ৪:৮৫",
  40: "কুরআন ৪:৬; ৪:৮৬", 41: "তিরমিযী ৩৫০৭ — দ্বঈফ", 42: "কুরআন ২৭:৪০; ৮২:৬",
  43: "কুরআন ৪:১; ৩৩:৫২", 44: "কুরআন ১১:৬১", 45: "কুরআন ২:১১৫; ৩:৭৩",
  46: "কুরআন ২:৩২; ২:১২৯", 47: "কুরআন ১১:৯০; ৮৫:১৪", 48: "কুরআন ১১:৭৩; ৮৫:১৫",
  49: "তিরমিযী ৩৫০৭ — দ্বঈফ", 50: "কুরআন ৪:৭৯; ৫:১১৭", 51: "কুরআন ২০:১১৪; ২৩:১১৬",
  52: "কুরআন ৩:১৭৩; ৩৩:৩", 53: "কুরআন ২২:৪০; ৫৭:২৫", 54: "কুরআন ৫১:৫৮",
  55: "কুরআন ৪:৪৫; ৪২:২৮", 56: "কুরআন ১৪:১; ৩৪:৬", 57: "তিরমিযী ৩৫০৭ — দ্বঈফ",
  58: "কুরআন ২৯:১৯; ৮৫:১৩", 59: "কুরআন ২৯:১৯; ৩০:১১", 60: "কুরআন ৩০:৫০; ৪১:৩৯",
  61: "কুরআন ১৫:২৩; ৩:১৫৬", 62: "কুরআন ২:২৫৫; ৪০:৬৫", 63: "কুরআন ২:২৫৫; ৩:২",
  64: "তিরমিযী ৩৫০৭ — দ্বঈফ (বিতর্কিত)", 66: "কুরআন ১৩:১৬; ৩৯:৪", 67: "কুরআন ১১২:১",
  68: "কুরআন ১১২:২", 70: "কুরআন ১৮:৪৫; ৫৪:৫৫", 71: "সহীহ মুসলিম ৭৭১ — সহীহ",
  72: "সহীহ মুসলিম ৭৭১ — সহীহ", 73: "কুরআন ৫৭:৩", 74: "কুরআন ৫৭:৩",
  75: "কুরআন ৫৭:৩", 76: "কুরআন ৫৭:৩", 78: "কুরআন ১৩:৯", 79: "কুরআন ৫২:২৮",
  80: "কুরআন ২:৩৭; ৪৯:১২", 81: "কুরআন ৩:৪; ৩২:২২", 82: "কুরআন ৪:৪৩; ৫৮:২",
  83: "কুরআন ২:১৪৩; ৯:১১৭", 84: "কুরআন ৩:২৬", 85: "কুরআন ৫৫:২৭; ৫৫:৭৮",
  86: "তিরমিযী ৩৫০৭ — দ্বঈফ", 87: "কুরআন ৩:৯", 88: "কুরআন ২:২৬৩; ৩৫:১৫",
  89: "তিরমিযী ৩৫০৭ — দ্বঈফ", 90: "সহীহ বুখারী ৮৪৪ — সহীহ", 91: "তিরমিযী ৩৫০৭ — দ্বঈফ",
  92: "তিরমিযী ৩৫০৭ — দ্বঈফ", 93: "কুরআন ২৪:৩৫", 94: "কুরআন ২২:৫৪; ২৫:৩১",
  95: "কুরআন ২:১১৭; ৬:১০১", 96: "তিরমিযী ৩৫০৭ — দ্বঈফ", 97: "কুরআন ১৫:২৩; ২৮:৫৮",
  98: "তিরমিযী ৩৫০৭ — দ্বঈফ (বহুল বিতর্কিত)", 99: "তিরমিযী ৩৫০৭ — দ্বঈফ (বিতর্কিত)",
});

export const DEFAULT_EXTRA_ASMA_NAMES = Object.freeze([
  { number: 100, arabic: "الإله", transliteration: "Al-Ilah", bnName: "আল-ইলাহ", bn: "একমাত্র উপাস্য", ref: "কুরআন ২:১৬৩", weak: false, isPhrase: false, status: "active" },
  { number: 101, arabic: "الرب", transliteration: "Ar-Rabb", bnName: "আর-রব্ব", bn: "প্রতিপালক, প্রভু", ref: "কুরআন ১:২ (বহু স্থানে)", weak: false, isPhrase: false, status: "active" },
  { number: 102, arabic: "الوتر", transliteration: "Al-Witr", bnName: "আল-বিতর", bn: "বেজোড়প্রিয় একক সত্তা", ref: "সহীহ বুখারী ৬৪১০ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 103, arabic: "سبحانه", transliteration: "Subhanahu", bnName: "সুবহানাহু", bn: "তিনি পরম পবিত্র", ref: "কুরআন ১৭:১", weak: false, isPhrase: true, status: "active" },
  { number: 104, arabic: "السبوح", transliteration: "As-Subbuh", bnName: "আস্-সুব্বুহ", bn: "পরম পবিত্র সত্তা", ref: "সহীহ মুসলিম ৪৮৭ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 105, arabic: "الأعلى", transliteration: "Al-A'la", bnName: "আল-আ'লা", bn: "সর্বোচ্চ", ref: "কুরআন ৮৭:১", weak: false, isPhrase: false, status: "active" },
  { number: 106, arabic: "عز وجل", transliteration: "Azza wa Jalla", bnName: "আয্যা ওয়া জাল্লা", bn: "তিনি পরাক্রমশালী ও মহিমান্বিত", ref: "ঐতিহ্যবাহী সম্মানসূচক বাক্যাংশ (নির্দিষ্ট আয়াত নেই)", weak: true, isPhrase: true, status: "active" },
  { number: 107, arabic: "المولى", transliteration: "Al-Mawla", bnName: "আল-মাওলা", bn: "অভিভাবক, মনিব", ref: "কুরআন ৮:৪০; ২২:৭৮", weak: false, isPhrase: false, status: "active" },
  { number: 108, arabic: "السيد", transliteration: "As-Sayyid", bnName: "আস-সাইয়্যিদ", bn: "প্রভু, মনিব", ref: "আবু দাউদ ৪৮০৬ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 109, arabic: "المحيط", transliteration: "Al-Muhit", bnName: "আল-মুহীত", bn: "পরিবেষ্টনকারী", ref: "কুরআন ৪:১২৬; ৪১:৫৪", weak: false, isPhrase: false, status: "active" },
  { number: 110, arabic: "القدير", transliteration: "Al-Qadeer", bnName: "আল-ক্বদির", bn: "সর্বশক্তিমান", ref: "কুরআন ৬:৬৫; ৪৬:৩৩", weak: false, isPhrase: false, status: "active" },
  { number: 111, arabic: "القاهر", transliteration: "Al-Qahir", bnName: "আল-ক্বাহির", bn: "পরাভূতকারী", ref: "কুরআন ৬:১৮; ৬:৬১", weak: false, isPhrase: false, status: "active" },
  { number: 112, arabic: "المالك", transliteration: "Al-Maalik", bnName: "আল-মালিক", bn: "অধিপতি", ref: "কুরআন ৩:২৬", weak: false, isPhrase: false, status: "active" },
  { number: 113, arabic: "المليك", transliteration: "Al-Maleek", bnName: "আল-মালীক", bn: "সর্বময় ক্ষমতার বাদশাহ", ref: "কুরআন ৫৪:৫৫", weak: false, isPhrase: false, status: "active" },
  { number: 114, arabic: "الخلاق", transliteration: "Al-Khallaq", bnName: "আল-খাল্লাক্ব", bn: "বার বার সৃষ্টিকারী", ref: "কুরআন ১৫:৮৬; ৩৬:৮১", weak: false, isPhrase: false, status: "active" },
  { number: 115, arabic: "الحفي", transliteration: "Al-Hafiyy", bnName: "আল-হাফিয়্যু", bn: "পরম স্নেহশীল, যত্নবান", ref: "কুরআন ১৯:৪৭ (দ্বঈফ সনদে সংযোজিত)", weak: true, isPhrase: false, status: "active" },
  { number: 116, arabic: "المبين", transliteration: "Al-Mubeen", bnName: "আল-মুবীন", bn: "সুস্পষ্টকারী", ref: "কুরআন ২৪:২৫", weak: false, isPhrase: false, status: "active" },
  { number: 117, arabic: "المعطي", transliteration: "Al-Mu'ti", bnName: "আল-মু'ত্বী", bn: "দানকারী", ref: "সহীহ বুখারী ৩১১৬ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 118, arabic: "الجواد", transliteration: "Al-Jawad", bnName: "আল-জাওয়াদ", bn: "অতি উদার, দানশীল", ref: "ইবনে মাজাহ (হাদিস) — সনদ দুর্বল", weak: true, isPhrase: false, status: "active" },
  { number: 119, arabic: "المنان", transliteration: "Al-Mannan", bnName: "আল-মান্নান", bn: "পরম অনুগ্রহকারী", ref: "ইবনে মাজাহ ৩৮৫৮ — হাসান", weak: false, isPhrase: false, status: "active" },
  { number: 120, arabic: "المحسن", transliteration: "Al-Muhsin", bnName: "আল-মুহসিন", bn: "পরম কল্যাণকারী", ref: "সহীহুল জামি' ১৮২৪ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 121, arabic: "الرفيق", transliteration: "Ar-Rafiq", bnName: "আর-রফীক্ব", bn: "কোমল সঙ্গীস্বরূপ", ref: "সহীহ বুখারী ৬৯২৭ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 122, arabic: "الجميل", transliteration: "Al-Jameel", bnName: "আল-জামীল", bn: "পরম সুন্দর", ref: "সহীহ মুসলিম ৯১ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 123, arabic: "العزيز الغفار", transliteration: "Al-'Azizul Ghafur", bnName: "আল-আ'জীজুল গফুর", bn: "পরাক্রমশালী ও পরম ক্ষমাশীল", ref: "কুরআন ৩৮:৬৬ (যৌগিক আয়াতাংশ)", weak: false, isPhrase: true, status: "active" },
  { number: 124, arabic: "العالم", transliteration: "Al-'Aalim", bnName: "আল-আ'আলিম", bn: "মহাজ্ঞানী, সব কিছুর জ্ঞানী", ref: "কুরআন ৬৪:১৮", weak: false, isPhrase: false, status: "active" },
  { number: 125, arabic: "علام الغيوب", transliteration: "'Allamul Ghuyub", bnName: "আল্লামুল গুয়ূব", bn: "অদৃশ্য সকল বিষয়ে মহাজ্ঞানী", ref: "কুরআন ৫:১০৯; ৫:১১৬; ৯:৭৮; সহীহ বুখারী ৬৩৮২ (দু'আয়ে ইস্তিখারা) — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 126, arabic: "عالم الغيب", transliteration: "'Aalimul Ghayb", bnName: "আলিমুল গায়েব", bn: "অদৃশ্য ও প্রকাশ্য উভয়ের জ্ঞানী", ref: "কুরআন ৬:৭৩; ১৩:৯; ২৩:৯২; ৩৪:৩; ৫৯:২২; ৭২:২৬", weak: false, isPhrase: false, status: "active" },
  { number: 127, arabic: "الطيب", transliteration: "At-Tayyib", bnName: "আত্-ত্বাইয়্যিব", bn: "পবিত্র, উত্তম", ref: "সহীহ মুসলিম ১০১৫ — সহীহ", weak: false, isPhrase: false, status: "active" },
  { number: 128, arabic: "النصير", transliteration: "An-Nasir", bnName: "আন-নাসীর", bn: "সাহায্যকারী", ref: "কুরআন ৮:৪০", weak: false, isPhrase: false, status: "active" },
  { number: 129, arabic: "الأمين", transliteration: "Al-Amin", bnName: "আল-আমীন", bn: "বিশ্বস্ত, আমানতদার", ref: "কুরআন/সহীহ হাদিসে সরাসরি প্রতিষ্ঠিত নয় (কোর্স-নির্দিষ্ট)", weak: true, isPhrase: false, status: "active" },
  { number: 130, arabic: "شديد العقاب", transliteration: "Shadidul 'Iqab", bnName: "শাদীদুল ই'কাব", bn: "কঠোর শাস্তিদাতা", ref: "কুরআন ২:১৯৬; ৫:২; ১৩:৬", weak: false, isPhrase: true, status: "active" },
  { number: 131, arabic: "عزيز ذو انتقام", transliteration: "'Azizun Dhuntiqam", bnName: "আজীজুন যুন্তিক্বাম", bn: "পরাক্রমশালী প্রতিশোধ গ্রহণকারী", ref: "কুরআন ১৪:৪৭", weak: false, isPhrase: true, status: "active" },
  { number: 132, arabic: "الله", transliteration: "Allah", bnName: "আল্লাহ", bn: "আল্লাহ", ref: "কুরআন ১:১ (সর্বত্র)", weak: false, isPhrase: false, status: "active" },
]);

export const DEFAULT_ASMA_COLLECTIONS = Object.freeze([
  { id: "asmacat_01", title: { en: "The Only One to worship, The Carer, The Nourisher and Provider", bn: "একত্ব ও উপাস্য" }, badge: "", order: 10, status: "active", items: ["name:100", "name:101", "name:67", "name:102"] },
  { id: "asmacat_02", title: { en: "The Most Glorious, Most High, Exalted, Uppermost", bn: "মহিমা ও সর্বোচ্চতা" }, badge: "", order: 20, status: "active", items: ["name:103", "name:104", "name:105", "name:106", "name:78", "name:37", "name:75", "name:10"] },
  { id: "asmacat_03", title: { en: "He is the One, Ever-Living, Eternal, Absolute", bn: "চিরন্তনতা" }, badge: "", order: 30, status: "active", items: ["name:68", "name:62", "name:73", "name:74"] },
  { id: "asmacat_04", title: { en: "About His Acts, Ways, Operations, Management", bn: "তাঁর কার্যক্রম ও পরিচালনা" }, badge: "", order: 40, status: "active", items: ["name:107", "name:55", "name:52", "name:108", "name:63", "name:39", "name:7"] },
  { id: "asmacat_05", title: { en: "All Encompassing, Most Inner, Closer, Subtle", bn: "সর্বব্যাপ্তি ও নৈকট্য" }, badge: "", order: 50, status: "active", items: ["name:109", "name:45", "name:76", "name:30"] },
  { id: "asmacat_06", title: { en: "The Mighty, All-Powerful, Magnificent, Glorious", bn: "পরাক্রম ও ক্ষমতা" }, badge: "", order: 60, status: "active", items: ["name:33", "name:8", "name:48", "name:110", "name:70", "name:9", "name:15", "name:111", "name:53", "name:54"] },
  { id: "asmacat_07", title: { en: "The Sovereign, The Authority, The Owner", bn: "সার্বভৌমত্ব" }, badge: "", order: 70, status: "active", items: ["name:112", "name:3", "name:113", "name:97"] },
  { id: "asmacat_08", title: { en: "Creator, Originator, Inventor, Innovator, Fashioner", bn: "সৃষ্টি ও উদ্ভাবন" }, badge: "", order: 80, status: "active", items: ["name:11", "name:114", "name:13", "name:95", "name:12"] },
  { id: "asmacat_09", title: { en: "His Guidance, Dawah — Gentle, Amiable, Calling to Believe", bn: "দাওয়াহ ও পথপ্রদর্শন" }, badge: "", order: 90, status: "active", items: ["name:51", "name:94", "name:44", "name:115", "name:116"] },
  { id: "asmacat_10", title: { en: "The Provider, The Carer, The Nourisher, The Sustainer", bn: "রিযিক ও দান" }, badge: "", order: 100, status: "active", items: ["name:17", "name:16", "name:117", "name:88", "name:21", "name:118"] },
  { id: "asmacat_11", title: { en: "Know Allah's Rahmah, the Mercy of Allah", bn: "রহমত" }, badge: "", order: 110, status: "active", items: ["name:2", "name:1"] },
  { id: "asmacat_12", title: { en: "Gentle, Kind, Noble, Tender, His Loving Personality", bn: "কোমলতা ও প্রেমময় ব্যক্তিত্ব" }, badge: "", order: 120, status: "active", items: ["name:42", "name:79", "name:119", "name:120", "name:83", "name:47", "name:121", "name:122"] },
  { id: "asmacat_13", title: { en: "Ever Forgiving, Repeatedly Forgiving", bn: "ক্ষমা" }, badge: "", order: 130, status: "active", items: ["name:34", "name:14", "name:123", "name:80", "name:82"] },
  { id: "asmacat_14", title: { en: "All Knowledgeable, All Encompassing, Watches, Hears everything", bn: "জ্ঞান ও পর্যবেক্ষণ" }, badge: "", order: 140, status: "active", items: ["name:19", "name:124", "name:27", "name:26", "name:43", "name:31", "name:125", "name:126"] },
  { id: "asmacat_15", title: { en: "The Judge, The Reckoner, The Just, The Witness", bn: "ন্যায়বিচার" }, badge: "", order: 150, status: "active", items: ["name:46", "name:28", "name:40", "name:29", "name:50"] },
  { id: "asmacat_16", title: { en: "The Most Patient, Appreciative, Forbearing, Pure", bn: "ধৈর্য ও কৃতজ্ঞতা" }, badge: "", order: 160, status: "active", items: ["name:99", "name:35", "name:32", "name:56", "name:127"] },
  { id: "asmacat_17", title: { en: "The Opener, The Helper, The Giver of Peace and Security", bn: "নিরাপত্তা ও সাহায্য" }, badge: "", order: 170, status: "active", items: ["name:18", "name:128", "name:38", "name:129", "name:5"] },
  { id: "asmacat_18", title: { en: "His Warning, Punishment, Retribution", bn: "শাস্তি ও প্রতিশোধ" }, badge: "", order: 180, status: "active", items: ["name:130", "name:131"] },
  { id: "asmacat_19", title: { en: "Not yet placed — organize these yourself", bn: "সংগঠিত করা বাকি — অন্যান্য নাম" }, badge: "", order: 190, status: "active", items: ["name:132", "name:66", "name:4", "name:6", "name:20", "name:22", "name:23", "name:24", "name:25", "name:41", "name:49", "name:57", "name:58", "name:59", "name:60", "name:61", "name:64", "name:71", "name:72", "name:86", "name:87", "name:89", "name:90", "name:91", "name:92", "name:93", "name:96", "name:98", "name:84", "name:85", "name:81"] },
]);
