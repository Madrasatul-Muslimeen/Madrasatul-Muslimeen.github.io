// Phase 13 round 1 — Asma ul Husna, the 99 Names of Allah (F-141 area).
//
// Fixed platform content, same treatment Quran's own ayah text gets
// (quran-data.js) -- not tenant-authored, so it lives here as static data
// rather than as 99 separate Catalogue subject nodes. unit-keys.js already
// reserved `name:${number}` for this back in Phase 3 (F-033); number here
// is that same 1..99 index, in the standard order (the list narrated in
// Jami' at-Tirmidhi, the enumeration essentially every Islamic reference
// uses -- cross-checked against a sourced reference table before writing
// this out, not reconstructed from memory alone, given how much accuracy
// matters for content like this).
//
// meaning is language-keyed per I11 (English filled now, Bangla later, same
// "first draft, correctable" status catalogue-data.js's own Guide text
// already carries).
//
// This is deliberately separate from the screensaver's poster set
// (asma-posters.js) -- that's a different, wider collection of Names beyond
// just these 99 (91+ traditional Names, not the specific Tirmidhi
// enumeration), meant to be looked at, not claimed/tracked against. Keeping
// them apart means the 99-item study list stays exactly the well-known "99
// Names" everyone expects, while the screensaver isn't artificially
// trimmed down to only the ones that happen to overlap.

function m(en) {
  return { en, bn: null };
}

export const ASMA_NAMES = [
  { number: 1, arabic: "الرَّحْمَٰن", transliteration: "Ar-Rahman", meaning: m("The Most Merciful") },
  { number: 2, arabic: "الرَّحِيم", transliteration: "Ar-Rahim", meaning: m("The Most Compassionate") },
  { number: 3, arabic: "الْمَلِك", transliteration: "Al-Malik", meaning: m("The King, The Sovereign") },
  { number: 4, arabic: "الْقُدُّوس", transliteration: "Al-Quddus", meaning: m("The Holy, The Pure") },
  { number: 5, arabic: "السَّلَام", transliteration: "As-Salam", meaning: m("The Source of Peace") },
  { number: 6, arabic: "الْمُؤْمِن", transliteration: "Al-Mu'min", meaning: m("The Granter of Security") },
  { number: 7, arabic: "الْمُهَيْمِن", transliteration: "Al-Muhaymin", meaning: m("The Controller, The Guardian") },
  { number: 8, arabic: "الْعَزِيز", transliteration: "Al-Aziz", meaning: m("The Almighty, The Exalted in Might") },
  { number: 9, arabic: "الْجَبَّار", transliteration: "Al-Jabbar", meaning: m("The Compeller, The Omnipotent") },
  { number: 10, arabic: "الْمُتَكَبِّر", transliteration: "Al-Mutakabbir", meaning: m("The Supreme, The Majestic") },
  { number: 11, arabic: "الْخَالِق", transliteration: "Al-Khaliq", meaning: m("The Creator") },
  { number: 12, arabic: "الْبَارِئ", transliteration: "Al-Bari'", meaning: m("The Evolver, The Originator") },
  { number: 13, arabic: "الْمُصَوِّر", transliteration: "Al-Musawwir", meaning: m("The Fashioner, The Designer") },
  { number: 14, arabic: "الْغَفَّار", transliteration: "Al-Ghaffar", meaning: m("The Repeatedly Forgiving") },
  { number: 15, arabic: "الْقَهَّار", transliteration: "Al-Qahhar", meaning: m("The Subduer, The Dominant") },
  { number: 16, arabic: "الْوَهَّاب", transliteration: "Al-Wahhab", meaning: m("The Bestower") },
  { number: 17, arabic: "الرَّزَّاق", transliteration: "Ar-Razzaq", meaning: m("The Provider") },
  { number: 18, arabic: "الْفَتَّاح", transliteration: "Al-Fattah", meaning: m("The Opener, The Judge") },
  { number: 19, arabic: "الْعَلِيم", transliteration: "Al-Alim", meaning: m("The All-Knowing") },
  { number: 20, arabic: "الْقَابِض", transliteration: "Al-Qabid", meaning: m("The Restrainer, The Constrictor") },
  { number: 21, arabic: "الْبَاسِط", transliteration: "Al-Basit", meaning: m("The Extender, The Expander") },
  { number: 22, arabic: "الْخَافِض", transliteration: "Al-Khafid", meaning: m("The Abaser") },
  { number: 23, arabic: "الرَّافِع", transliteration: "Ar-Rafi'", meaning: m("The Exalter") },
  { number: 24, arabic: "الْمُعِزّ", transliteration: "Al-Mu'izz", meaning: m("The Giver of Honour") },
  { number: 25, arabic: "الْمُذِلّ", transliteration: "Al-Mudhill", meaning: m("The Giver of Dishonour") },
  { number: 26, arabic: "السَّمِيع", transliteration: "As-Sami'", meaning: m("The All-Hearing") },
  { number: 27, arabic: "الْبَصِير", transliteration: "Al-Basir", meaning: m("The All-Seeing") },
  { number: 28, arabic: "الْحَكَم", transliteration: "Al-Hakam", meaning: m("The Judge, The Arbitrator") },
  { number: 29, arabic: "الْعَدْل", transliteration: "Al-Adl", meaning: m("The Just") },
  { number: 30, arabic: "اللَّطِيف", transliteration: "Al-Latif", meaning: m("The Subtle, The Gentle") },
  { number: 31, arabic: "الْخَبِير", transliteration: "Al-Khabir", meaning: m("The All-Aware") },
  { number: 32, arabic: "الْحَلِيم", transliteration: "Al-Halim", meaning: m("The Forbearing") },
  { number: 33, arabic: "الْعَظِيم", transliteration: "Al-Azim", meaning: m("The Magnificent, The Great") },
  { number: 34, arabic: "الْغَفُور", transliteration: "Al-Ghafur", meaning: m("The All-Forgiving") },
  { number: 35, arabic: "الشَّكُور", transliteration: "Ash-Shakur", meaning: m("The Grateful, The Appreciative") },
  { number: 36, arabic: "الْعَلِيّ", transliteration: "Al-Ali", meaning: m("The Most High") },
  { number: 37, arabic: "الْكَبِير", transliteration: "Al-Kabir", meaning: m("The Greatest") },
  { number: 38, arabic: "الْحَفِيظ", transliteration: "Al-Hafiz", meaning: m("The Preserver, The Guardian") },
  { number: 39, arabic: "الْمُقِيت", transliteration: "Al-Muqit", meaning: m("The Sustainer, The Nourisher") },
  { number: 40, arabic: "الْحَسِيب", transliteration: "Al-Hasib", meaning: m("The Reckoner") },
  { number: 41, arabic: "الْجَلِيل", transliteration: "Al-Jalil", meaning: m("The Majestic") },
  { number: 42, arabic: "الْكَرِيم", transliteration: "Al-Karim", meaning: m("The Generous, The Noble") },
  { number: 43, arabic: "الرَّقِيب", transliteration: "Ar-Raqib", meaning: m("The Watchful") },
  { number: 44, arabic: "الْمُجِيب", transliteration: "Al-Mujib", meaning: m("The Responsive") },
  { number: 45, arabic: "الْوَاسِع", transliteration: "Al-Wasi'", meaning: m("The All-Encompassing") },
  { number: 46, arabic: "الْحَكِيم", transliteration: "Al-Hakim", meaning: m("The Wise") },
  { number: 47, arabic: "الْوَدُود", transliteration: "Al-Wadud", meaning: m("The Loving") },
  { number: 48, arabic: "الْمَجِيد", transliteration: "Al-Majeed", meaning: m("The All-Glorious") },
  { number: 49, arabic: "الْبَاعِث", transliteration: "Al-Ba'ith", meaning: m("The Resurrector") },
  { number: 50, arabic: "الشَّهِيد", transliteration: "Ash-Shahid", meaning: m("The Witness") },
  { number: 51, arabic: "الْحَقّ", transliteration: "Al-Haqq", meaning: m("The Truth") },
  { number: 52, arabic: "الْوَكِيل", transliteration: "Al-Wakil", meaning: m("The Trustee") },
  { number: 53, arabic: "الْقَوِيّ", transliteration: "Al-Qawiyy", meaning: m("The Strong") },
  { number: 54, arabic: "الْمَتِين", transliteration: "Al-Matin", meaning: m("The Firm, The Steadfast") },
  { number: 55, arabic: "الْوَلِيّ", transliteration: "Al-Waliyy", meaning: m("The Protecting Friend") },
  { number: 56, arabic: "الْحَمِيد", transliteration: "Al-Hamid", meaning: m("The Praiseworthy") },
  { number: 57, arabic: "الْمُحْصِي", transliteration: "Al-Muhsi", meaning: m("The Reckoner, The Accounter") },
  { number: 58, arabic: "الْمُبْدِئ", transliteration: "Al-Mubdi'", meaning: m("The Originator") },
  { number: 59, arabic: "الْمُعِيد", transliteration: "Al-Mu'id", meaning: m("The Restorer") },
  { number: 60, arabic: "الْمُحْيِي", transliteration: "Al-Muhyi", meaning: m("The Giver of Life") },
  { number: 61, arabic: "الْمُمِيت", transliteration: "Al-Mumit", meaning: m("The Bringer of Death") },
  { number: 62, arabic: "الْحَيّ", transliteration: "Al-Hayy", meaning: m("The Ever-Living") },
  { number: 63, arabic: "الْقَيُّوم", transliteration: "Al-Qayyum", meaning: m("The Self-Subsisting") },
  { number: 64, arabic: "الْوَاجِد", transliteration: "Al-Wajid", meaning: m("The Perceiver, The Finder") },
  { number: 65, arabic: "الْمَاجِد", transliteration: "Al-Maajid", meaning: m("The Illustrious, The Noble") },
  { number: 66, arabic: "الْوَاحِد", transliteration: "Al-Wahid", meaning: m("The One, The Unique") },
  { number: 67, arabic: "الْأَحَد", transliteration: "Al-Ahad", meaning: m("The One, The Indivisible") },
  { number: 68, arabic: "الصَّمَد", transliteration: "As-Samad", meaning: m("The Eternal, The Self-Sufficient") },
  { number: 69, arabic: "الْقَادِر", transliteration: "Al-Qadir", meaning: m("The All-Powerful, The Able") },
  { number: 70, arabic: "الْمُقْتَدِر", transliteration: "Al-Muqtadir", meaning: m("The Powerful, The Dominant") },
  { number: 71, arabic: "الْمُقَدِّم", transliteration: "Al-Muqaddim", meaning: m("The Expediter") },
  { number: 72, arabic: "الْمُؤَخِّر", transliteration: "Al-Mu'akhkhir", meaning: m("The Delayer") },
  { number: 73, arabic: "الْأَوَّل", transliteration: "Al-Awwal", meaning: m("The First") },
  { number: 74, arabic: "الْآخِر", transliteration: "Al-Akhir", meaning: m("The Last") },
  { number: 75, arabic: "الظَّاهِر", transliteration: "Az-Zahir", meaning: m("The Manifest, The Evident") },
  { number: 76, arabic: "الْبَاطِن", transliteration: "Al-Batin", meaning: m("The Hidden") },
  { number: 77, arabic: "الْوَالِي", transliteration: "Al-Wali", meaning: m("The Governor, The Patron") },
  { number: 78, arabic: "الْمُتَعَالِي", transliteration: "Al-Muta'ali", meaning: m("The Most Exalted") },
  { number: 79, arabic: "الْبَرّ", transliteration: "Al-Barr", meaning: m("The Source of Goodness") },
  { number: 80, arabic: "التَّوَّاب", transliteration: "At-Tawwab", meaning: m("The Ever-Relenting, Acceptor of Repentance") },
  { number: 81, arabic: "الْمُنْتَقِم", transliteration: "Al-Muntaqim", meaning: m("The Avenger") },
  { number: 82, arabic: "الْعَفُوّ", transliteration: "Al-Afuww", meaning: m("The Pardoner") },
  { number: 83, arabic: "الرَّؤُوف", transliteration: "Ar-Ra'uf", meaning: m("The Compassionate") },
  { number: 84, arabic: "مَالِكُ الْمُلْك", transliteration: "Malik-ul-Mulk", meaning: m("The Owner of All Sovereignty") },
  { number: 85, arabic: "ذُو الْجَلَالِ وَالْإِكْرَام", transliteration: "Dhul-Jalali wal-Ikram", meaning: m("Lord of Majesty and Generosity") },
  { number: 86, arabic: "الْمُقْسِط", transliteration: "Al-Muqsit", meaning: m("The Equitable") },
  { number: 87, arabic: "الْجَامِع", transliteration: "Al-Jami'", meaning: m("The Gatherer") },
  { number: 88, arabic: "الْغَنِيّ", transliteration: "Al-Ghani", meaning: m("The Self-Sufficient, The Rich") },
  { number: 89, arabic: "الْمُغْنِي", transliteration: "Al-Mughni", meaning: m("The Enricher") },
  { number: 90, arabic: "الْمَانِع", transliteration: "Al-Mani'", meaning: m("The Preventer") },
  { number: 91, arabic: "الضَّار", transliteration: "Ad-Darr", meaning: m("The One who allows harm, within His wisdom") },
  { number: 92, arabic: "النَّافِع", transliteration: "An-Nafi'", meaning: m("The Benefactor") },
  { number: 93, arabic: "النُّور", transliteration: "An-Nur", meaning: m("The Light") },
  { number: 94, arabic: "الْهَادِي", transliteration: "Al-Hadi", meaning: m("The Guide") },
  { number: 95, arabic: "الْبَدِيع", transliteration: "Al-Badi'", meaning: m("The Incomparable, The Originator") },
  { number: 96, arabic: "الْبَاقِي", transliteration: "Al-Baqi", meaning: m("The Everlasting") },
  { number: 97, arabic: "الْوَارِث", transliteration: "Al-Warith", meaning: m("The Inheritor") },
  { number: 98, arabic: "الرَّشِيد", transliteration: "Ar-Rashid", meaning: m("The Guide to the Right Path") },
  { number: 99, arabic: "الصَّبُور", transliteration: "As-Sabur", meaning: m("The Patient, The Timeless") },
];

export function getAsmaName(number) {
  return ASMA_NAMES.find((n) => n.number === number) ?? null;
}
