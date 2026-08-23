// Bangla catalogue — the app's own words (বাংলা).
//
// Read js/i18n.js first for how this is used. In short: the KEY is the
// English text exactly as it appears on screen, and anything not listed
// here simply stays English. There is no such thing as a broken key.
//
// ---------------------------------------------------------------------
// FOR THE OWNER — how to correct a translation
// ---------------------------------------------------------------------
// Every line below reads:      "English text": "বাংলা লেখা",
// To fix one, change ONLY the Bangla on the right of the colon. Never
// change the English on the left — that is the app's own wiring, and
// editing it would silently switch that string back to English.
//
// Lines marked  // ?  are ones Claude was least sure of — religious,
// technical or Madrasah-specific wording where a wrong Bangla word is
// worse than English. Those are the ones worth your eye first.
//
// ---------------------------------------------------------------------
// Phase 1 of 6 — THE SHELL (13 Aug 2026)
// ---------------------------------------------------------------------
// Everything a person meets before they study anything: the navigation
// menu, the Home/sign-in strip, Settings, the About page, the opener
// splashes, and the six progress statuses that every module shares.
// Later phases add the Quran screen, the other nine modules, records and
// reports, the admin screens, and the 99 Names.
//
// Conventions used throughout, so later phases stay consistent:
//   - Arabic religious terms are transliterated into Bangla script the way
//     they are actually said in a Bangladeshi Madrasah (কুরআন, হাদীস,
//     তাজবীদ, হিফয), not translated into Sanskritised Bangla.
//   - Interface verbs are the plain forms people see in Bangla apps
//     (সংরক্ষণ করুন, বাতিল), not literary forms.

export const BN = {
  // --- Navigation: the four main buttons and what is inside them -------
  "Home": "হোম",
  "Modules": "মডিউল",
  "Operation": "পরিচালনা",
  "Bookmark": "বুকমার্ক",
  "Settings": "সেটিংস",
  "Admin": "প্রশাসন",
  "About": "পরিচিতি",
  "Language": "ভাষা",
  "Appearance": "চেহারা",
  "(coming soon)": "(শীঘ্রই আসছে)",

  // --- The ten study modules -------------------------------------------
  "Quran Study": "কুরআন অধ্যয়ন",
  "Deen Study": "দ্বীন শিক্ষা", // ?
  "Arabic": "আরবি",
  "Hadith": "হাদীস",
  "General Study": "সাধারণ শিক্ষা",
  "Nature-Life": "প্রকৃতি ও জীবন", // ?
  "Life Skill": "জীবন দক্ষতা",
  "Health": "স্বাস্থ্য",
  "Learn Deen On-the-Go": "চলার পথে দ্বীন শিক্ষা", // ?
  "Asma ul Husna": "আসমাউল হুসনা",

  // --- Operation and Admin destinations --------------------------------
  "Classes": "ক্লাস",
  "Curriculum": "পাঠ্যক্রম",
  "Course Offers": "কোর্স অফার",
  "Homework": "বাড়ির কাজ",
  "Records": "রেকর্ড",
  "Monitor": "পর্যবেক্ষণ",
  "People": "ব্যক্তিবর্গ",
  "Catalogue": "তালিকা", // ?

  // --- Home: sign-in strip ---------------------------------------------
  "Checking sign-in…": "সাইন-ইন যাচাই করা হচ্ছে…",
  "Sign in with Google": "গুগল দিয়ে সাইন ইন করুন",
  "Sign out": "সাইন আউট",
  "Not signed in.": "সাইন ইন করা হয়নি।",
  "Signed in as {email}": "{email} হিসেবে সাইন ইন করা আছে",
  "Sign-in failed: {message}": "সাইন ইন ব্যর্থ হয়েছে: {message}",
  "Legacy App - v06 ↗": "পুরাতন অ্যাপ - v06 ↗",
  "Previewing as: {role}": "যেভাবে দেখছেন: {role}",
  "Previewing as: {role} — change this on the People page":
    "যেভাবে দেখছেন: {role} — এটি ব্যক্তিবর্গ পাতা থেকে পরিবর্তন করুন",

  // --- The six progress statuses, shared by every module ----------------
  // These are the on-ramp every renderer uses (unit-keys.js STATUSES).
  "Not Applicable": "প্রযোজ্য নয়",
  "Not started": "শুরু হয়নি",
  "Learning": "শিখছি",
  "Practising": "অনুশীলন করছি",
  "Achieved": "অর্জিত হয়েছে",
  "Mastered": "পূর্ণ দক্ষতা", // ?

  // --- The opener splashes ---------------------------------------------
  "Opener settings": "সূচনা পর্দার সেটিংস",
  "Every time": "প্রতিবার",
  "Once a day": "দিনে একবার",
  "Once a week": "সপ্তাহে একবার",
  "Show this opener": "এই সূচনা পর্দা দেখান",

  // --- About page -------------------------------------------------------
  "QuranRevival — About": "কুরআনরিভাইভাল — পরিচিতি",
  "About QuranRevival": "কুরআনরিভাইভাল সম্পর্কে",
  "Phase 0 & 1 — individually tracked features":
    "পর্যায় ০ ও ১ — আলাদাভাবে চিহ্নিত বৈশিষ্ট্যসমূহ",
  "Every build phase": "সবগুলো নির্মাণ পর্যায়",
  "ID": "আইডি",
  "Feature": "বৈশিষ্ট্য",
  "Status": "অবস্থা",
  "Phase": "পর্যায়",
  "Name": "নাম",
  "Delivers": "যা দেয়",

  // --- Words that recur on many screens ---------------------------------
  // Translated once here in Phase 1 so later phases inherit them rather
  // than each inventing their own wording for the same button.
  "Save": "সংরক্ষণ করুন",
  "Cancel": "বাতিল",
  "Close": "বন্ধ করুন",
  "Add": "যোগ করুন",
  "Edit": "সম্পাদনা",
  "Archive": "সংরক্ষণাগারে রাখুন", // ?
  "Loading…": "লোড হচ্ছে…",
  "Person": "ব্যক্তি",
  "Tenant": "প্রতিষ্ঠান", // ?
  // The owner's own word for the tenant picker on the Quran screen, where its
  // options read "Madrasatul Muslimeen (Owner, Prime)" -- what they see there
  // is the role they hold, not an abstract "tenant". "Tenant" above is kept:
  // other screens still use it, and this is a second label, not a rename.
  "User Role": "ব্যবহারকারীর ভূমিকা", // ?
  "Subject": "বিষয়",
  "Approach": "পদ্ধতি", // ?
  "Notes": "নোট",
  "Date": "তারিখ",
  "Previous": "পূর্ববর্তী",
  "Next": "পরবর্তী",

  // --- Onboarding: creating an account ---------------------------------
  "QuranRevival — Create your account (F-011)": "কুরআনরিভাইভাল — আপনার অ্যাকাউন্ট তৈরি করুন",
  "Create your account (F-011)": "আপনার অ্যাকাউন্ট তৈরি করুন",
  "Sets up a brand-new account: your account, your own person record, and\n     your owner role, all created together. Nothing existing is touched.":
    "একদম নতুন অ্যাকাউন্ট তৈরি করে: আপনার অ্যাকাউন্ট, আপনার নিজের ব্যক্তি-রেকর্ড এবং আপনার মালিকানার ভূমিকা — সবই একসাথে। বিদ্যমান কিছুই পরিবর্তন করা হয় না।",
  "What is this account for?": "এই অ্যাকাউন্টটি কীসের জন্য?",
  "My own learning": "আমার নিজের শেখার জন্য",
  "My family": "আমার পরিবারের জন্য",
  "A madrasah / tuition group": "একটি মাদরাসা / টিউশন গ্রুপ",
  "Your name": "আপনার নাম",
  "How many people can you invite?": "আপনি কতজনকে আমন্ত্রণ জানাতে পারবেন?",
  "Week starts on": "সপ্তাহ শুরু হয়",
  "Saturday": "শনিবার",
  "Sunday": "রবিবার",
  "Monday": "সোমবার",
  "Create": "তৈরি করুন",
  "Creating…": "তৈরি করা হচ্ছে…",
  "Account created.": "অ্যাকাউন্ট তৈরি হয়েছে।",
  "Account ID:": "অ্যাকাউন্ট আইডি:",
  "Your person ID:": "আপনার ব্যক্তি আইডি:",
  "Write these down.": "এগুলো লিখে রাখুন।",

  // --- Accepting an invite ----------------------------------------------
  // Often the FIRST screen a new person ever sees, and the one place a
  // Bangla-only reader is most likely to give up if it is in English.
  "QuranRevival — Accept invite (F-014)": "কুরআনরিভাইভাল — আমন্ত্রণ গ্রহণ",
  "Accept invite": "আমন্ত্রণ গ্রহণ করুন",
  "Accept": "গ্রহণ করুন",
  "Checking your invite link…": "আপনার আমন্ত্রণ লিংক যাচাই করা হচ্ছে…",
  "This link is missing its invite code. Ask whoever invited you to send it again.":
    "এই লিংকে আমন্ত্রণ কোড নেই। যিনি আপনাকে আমন্ত্রণ জানিয়েছেন, তাঁকে আবার পাঠাতে বলুন।",
  "This invite link is no longer valid — it may have already been used.":
    "এই আমন্ত্রণ লিংকটি আর কার্যকর নয় — সম্ভবত এটি ইতিমধ্যে ব্যবহার করা হয়েছে।",
  "This invite is no longer valid — it may have already been used.":
    "এই আমন্ত্রণটি আর কার্যকর নয় — সম্ভবত এটি ইতিমধ্যে ব্যবহার করা হয়েছে।",
  "This invite is for {email}. Please sign in with that account to continue.":
    "এই আমন্ত্রণটি {email}-এর জন্য। চালিয়ে যেতে ঐ অ্যাকাউন্ট দিয়ে সাইন ইন করুন।",
  "This invite was sent to {invited}, but you are signed in as {current}. Sign out below and sign in with the invited email instead.":
    "আমন্ত্রণটি পাঠানো হয়েছিল {invited}-এ, কিন্তু আপনি সাইন ইন করেছেন {current} হিসেবে। নিচে সাইন আউট করে আমন্ত্রিত ইমেইল দিয়ে সাইন ইন করুন।",
  "Welcome! You have joined as {role}. Your person ID: {personId}.":
    "স্বাগতম! আপনি {role} হিসেবে যুক্ত হয়েছেন। আপনার ব্যক্তি আইডি: {personId}।",
  "You are invited to join {tenant} as {role}.": "আপনাকে {tenant}-এ {role} হিসেবে যোগ দিতে আমন্ত্রণ জানানো হয়েছে।",
  "Continue to QuranRevival": "কুরআনরিভাইভালে যান",
  "JavaScript is required.": "জাভাস্ক্রিপ্ট চালু থাকা আবশ্যক।",

  // --- The opening splash ------------------------------------------------
  // The Arabic itself is never translated. What follows below is the
  // MEANING line the old app already showed underneath it in English.
  "I seek refuge with Allah from shaitwan, the rejected, accursed.":
    "আমি বিতাড়িত শয়তান থেকে আল্লাহর আশ্রয় প্রার্থনা করছি।", // ?
  "In the name of Allah, the Most Gracious, the Most Merciful.":
    "পরম করুণাময় ও অসীম দয়ালু আল্লাহর নামে।", // ?
  "Reviving the Quran, abandoned.": "পরিত্যক্ত কুরআনকে পুনর্জীবিত করা।", // ?
  "Building Muslim-Mindset, reviving the Quran, reviving the Ummah!":
    "মুসলিম-মানসিকতা গঠন, কুরআনের পুনর্জাগরণ, উম্মাহর পুনর্জাগরণ!", // ?

  // --- Deliberately NOT translated --------------------------------------
  // Listed here on purpose, each mapped to itself, so the coverage report
  // counts them as decided rather than forgotten -- and so nobody in a
  // later phase "fixes" them by translating them.
  //   - QuranRevival is the app's name. A name is not translated.
  //   - The Ta'awwudh/Basmala transliteration is Arabic, not English.
  //   - Madrasatul Muslimeen is the organisation's own name.
  //   - The five-word motto is Arabic terminology already.
  "QuranRevival": "QuranRevival",
  "Quran Revival": "QuranRevival",
  "A'udhu billahi min ash-shaytwaner Rajeem": "A'udhu billahi min ash-shaytwaner Rajeem",
  "A project of Madrasatul Muslimeen": "মাদরাসাতুল মুসলিমীন-এর একটি প্রকল্প",
  "Akhlaq &bull; Ilm &bull; Tawheed &bull; Dawah &bull; Hukm": "Akhlaq &bull; Ilm &bull; Tawheed &bull; Dawah &bull; Hukm",

  // =====================================================================
  // Phase 2 of 6 — THE QURAN MODULE (13 Aug 2026)
  // =====================================================================
  // The module the app is named after. Surah NAMES are not here -- all 114
  // live in their own file, js/i18n/surah-names-bn.js, because they are
  // data, not interface wording.

  // --- The landing screen and its two dock tabs -------------------------
  "QuranRevival — Phase 4/5": "কুরআনরিভাইভাল",
  "Mastery Wheel": "দক্ষতার চাকা", // ?
  "Study options": "অধ্যয়নের সেটিংস",
  "Explore": "অন্বেষণ",
  "Study": "অধ্যয়ন",
    "Loading this surah…": "এই সূরা লোড হচ্ছে…",
  "No Approaches yet.": "এখনো কোনো পদ্ধতি নেই।",
  "Pick an Approach first.": "প্রথমে একটি পদ্ধতি বেছে নিন।",
  "Click a segment to drill in — Quran → Juz → Surah → Ruku' → an ayah in Study. Colours pool this Approach's real ayah-by-ayah progress across whatever's inside each segment — it only turns fully green once every ayah inside it is Mastered.":
    "ভেতরে যেতে যেকোনো অংশে চাপ দিন &mdash; কুরআন &rarr; জুয &rarr; সূরা &rarr; রুকু' &rarr; অধ্যয়নে একটি আয়াত। রঙগুলো এই পদ্ধতিতে আয়াতভিত্তিক প্রকৃত অগ্রগতি একত্র করে দেখায় &mdash; ভেতরের প্রতিটি আয়াতে পূর্ণ দক্ষতা অর্জিত হলেই কেবল এটি সম্পূর্ণ সবুজ হয়।",

  // --- Choosing what to study -------------------------------------------
  "Study Unit": "অধ্যয়নের একক",
  "Single Ayah": "একটি আয়াত",
  "Range of Ayahs": "আয়াতের পরিসর",
  "Whole Surah": "সম্পূর্ণ সূরা",
  "Ruku'": "রুকু'",
  "Ruku": "রুকু",
  "Juz": "জুয",
  "Page": "পৃষ্ঠা",
  "Surah": "সূরা",
  "Ayah": "আয়াত",
  "Go to": "যেখানে যাবেন",
  "Go": "যান",
  "From ayah": "যে আয়াত থেকে",
  "To ayah": "যে আয়াত পর্যন্ত",
  // Shortened in shell round 14 so both range fields fit on one line beside
  // Study Unit and Surah. The two above are kept: they are still correct
  // wording, and nothing in this file is deleted just because one screen
  // stopped asking for it.
  "From": "থেকে",
  "To": "পর্যন্ত",
  "Whole Quran": "সম্পূর্ণ কুরআন",

  // --- What is being tracked, and where you are -------------------------
  "Tracking: {unit}": "চিহ্নিত করা হচ্ছে: {unit}",
  "Surah {surah}, Ayah {ayah}": "সূরা {surah}, আয়াত {ayah}",
  "Surah {surah}": "সূরা {surah}",
  "Surah {surah} — Ayah {ayah} of {total}": "সূরা {surah} — আয়াত {ayah} / {total}",
  "SURAH {surah} · AYAH {ayah}": "সূরা {surah} · আয়াত {ayah}",
  "Ayahs {from}–{to} of Surah {surah}": "সূরা {surah}-এর {from}–{to} নং আয়াত",
  "Whole Surah {surah}": "সম্পূর্ণ সূরা {surah}",
  "Ruku' {ruku} of Surah {surah} (ayahs {from}–{to})":
    "সূরা {surah}-এর {ruku} নং রুকু' ({from}–{to} নং আয়াত)",
  "Juz {juz}": "জুয {juz}",
  "Page {page}": "পৃষ্ঠা {page}",
  "◂ Previous": "◂ পূর্ববর্তী",
  "Next ▸": "পরবর্তী ▸",

  // --- The Approach picker (Study options bar 4), and the Ayah Note
  //     screen's own Approach toggle sharing the same options (round 32) ---
  "(no Quran Approaches yet)": "(এখনো কোনো কুরআন পদ্ধতি নেই)",
  "Choose an Approach": "একটি পদ্ধতি বেছে নিন",

  // --- The Study Unit number pickers and the reading transport (round 18) ---
  "Hizb": "হিযব",
  "Number": "নম্বর",
  "Hizb {hizb}": "হিযব {hizb}",
  "Ruku' №": "রুকু' নং",
  "Juz №": "জুয নং",
  "Hizb №": "হিযব নং",
  "Page №": "পৃষ্ঠা নং",
  "Surah {n} {name}": "সূরা {n} {name}",
  "{surah} · Ayahs {from}–{to}": "{surah} · আয়াত {from}–{to}",
  "{fromSurah} {fromAyah} → {toSurah} {toAyah}": "{fromSurah} {fromAyah} → {toSurah} {toAyah}",
  "▶ Play": "▶ চালান",
  "⏸ Pause": "⏸ থামান",
  "■ Stop": "■ বন্ধ",
  "▶ Whole surah": "▶ পুরো সূরা",
  "{reciter} only has whole-surah audio — use Whole surah instead.":
    "{reciter}-এর কেবল পুরো সূরার অডিও আছে — এর বদলে 'পুরো সূরা' ব্যবহার করুন।",
  "Reciters": "ক্বারীগণ",
  "Listening": "শ্রবণ",
  "Loop": "পুনরাবৃত্তি চক্র",
  "Play": "চালান",
  "Mushaf view": "মুসহাফ দৃশ্য",
  "(whole surah only)": "(কেবল পুরো সূরা)",
  "Mushaf view shows the printed page, so the other reading choices do not apply while it is on.":
    "মুসহাফ দৃশ্যে ছাপা পৃষ্ঠাই দেখানো হয়, তাই এটি চালু থাকলে পাঠের অন্য পছন্দগুলো প্রযোজ্য নয়।",
  "Reading view": "পাঠের ধরন",
  "Word by Word language": "শব্দে শব্দে ভাষা",
  "English translation": "ইংরেজি অনুবাদ",
  "বাংলা translation": "বাংলা অনুবাদ",
  "Translator": "অনুবাদক",
  "Two translations are packaged with the app, one English and one Bangla, and both can be shown at once. Choosing BETWEEN translators by name needs their texts packaged first — it is on the list.":
    "অ্যাপের সাথে দুটি অনুবাদ দেওয়া আছে — একটি ইংরেজি, একটি বাংলা — এবং দুটিই একসাথে দেখানো যায়। অনুবাদকের নাম ধরে বেছে নিতে হলে আগে সেই অনুবাদগুলো যুক্ত করতে হবে — সেটি তালিকায় আছে।",

  // --- The reading screen (shell round 17) ---
  "Read": "পড়ুন",
  "◂ Mastery Wheel": "◂ দক্ষতার চাকা",
  "⤢ Full screen": "⤢ পূর্ণ স্ক্রিন",
  "Tap the text to bring the menus back.": "মেনু ফিরিয়ে আনতে লেখায় স্পর্শ করুন।",

  // --- Shell round 21: Prev/Next move the whole unit, and Full screen is a
  //     set of choices rather than one fixed behaviour. "◂ Mastery Wheel"
  //     above is kept although nothing renders it any more (I4): the button
  //     left the read bar, the words are not deleted.
  "◂ Prev": "◂ আগের",
  "Next ▸": "পরের ▸",
  "⤢ Exit full screen": "⤢ পূর্ণ স্ক্রিন বন্ধ",
  "Full screen hides": "পূর্ণ স্ক্রিনে লুকাবে",
  "Banner": "ব্যানার",
  "Top menu": "উপরের মেনু",
  "Bottom menu": "নিচের মেনু",
  "Prev and Next": "আগের ও পরের",
  "Play controls": "বাজানোর বোতাম",
  "Nothing is ticked, so Full screen will leave the screen as it is.":
    "কিছুই চিহ্নিত নেই, তাই পূর্ণ স্ক্রিন পর্দাটি যেমন আছে তেমনই রাখবে।",

  // --- Shell round 22: three full-screen states, and the pickers moved onto
  //     the reading screen. "Prev and Next" above became "Pickers, Prev and
  //     Next" when the two control rows merged; the old key stays (I4).
  "Pickers, Prev and Next": "পিকার, আগের ও পরের",
  "Tap again to hide more.": "আরও লুকাতে আবার স্পর্শ করুন।",
  "Show the menus": "মেনু দেখান",
  "Full screen": "পূর্ণ স্ক্রিন",
  "Hide everything": "সব লুকান",
  "Previous": "আগের",
  "Next": "পরের",
  "Play": "চালান",
  "Stop": "বন্ধ",
  "Study Unit": "অধ্যয়নের একক",
  "Number": "সংখ্যা",

  // --- Shell round 23: the Qur'an's own typeface, bundled and choosable.
  //     The face NAMES are proper nouns and are not translated, exactly like
  //     the reciters' names -- only "your device's own" is wording.
  // --- Shell round 25: the grammar terms in the root & derivatives panel.
  //     The owner: "in Bangla means everything should be Bangla." These are
  //     the 46 ATOMS every one of the data's 359 part-of-speech strings is
  //     built from -- posLabel() in labels.js splits on " + " and rejoins, so
  //     translating the atoms covers every combination. Standard Bangla
  //     grammatical vocabulary (ব্যাকরণ) throughout.
  "Noun": "বিশেষ্য",
  "Pronoun": "সর্বনাম",
  "Verb": "ক্রিয়া",
  "Preposition": "অব্যয়",
  "Conjunction": "সংযোজক অব্যয়",
  "Determiner": "নির্ধারক",
  "Proper Noun": "নামবাচক বিশেষ্য",
  "Relative Pronoun": "সম্বন্ধবাচক সর্বনাম",
  "Resumption Particle": "পুনরারম্ভসূচক অব্যয়", // ?
  "Negative Particle": "নেতিবাচক অব্যয়",
  "Accusative Particle": "কর্মকারকসূচক অব্যয়", // ?
  "Adjective": "বিশেষণ",
  "Emphatic Particle": "জোরবাচক অব্যয়",
  "Time Adverb": "কালবাচক ক্রিয়াবিশেষণ",
  "Conditional": "শর্তবাচক",
  "Demonstrative Pronoun": "নির্দেশক সর্বনাম",
  "Interrogative Particle": "প্রশ্নবাচক অব্যয়",
  "Subordinating Conjunction": "অধীনতাসূচক সংযোজক", // ?
  "Location Adverb": "স্থানবাচক ক্রিয়াবিশেষণ",
  "Particle of Certainty": "নিশ্চয়তাসূচক অব্যয়",
  "Vocative Particle": "সম্বোধনসূচক অব্যয়",
  "Result Particle": "ফলবাচক অব্যয়",
  "Purpose Particle": "উদ্দেশ্যবাচক অব্যয়",
  "Circumstantial": "অবস্থাবাচক",
  "Supplemental": "সম্পূরক",
  "Future Particle": "ভবিষ্যৎসূচক অব্যয়",
  "Retraction Particle": "প্রত্যাহারসূচক অব্যয়", // ?
  "Exceptive Particle": "ব্যতিক্রমসূচক অব্যয়",
  "Inceptive Particle": "সূচনাসূচক অব্যয়", // ?
  "Causative Particle": "কারণবাচক অব্যয়",
  "Amendment Particle": "সংশোধনসূচক অব্যয়", // ?
  "Answer Particle": "উত্তরসূচক অব্যয়",
  "Quranic Initials": "হুরুফুল মুকাত্তাআত",
  "Imperative Verb": "আদেশসূচক ক্রিয়া",
  "Restriction Particle": "সীমাবদ্ধতাসূচক অব্যয়", // ?
  "Prohibition Particle": "নিষেধসূচক অব্যয়",
  "Preventive Particle": "প্রতিরোধসূচক অব্যয়", // ?
  "Explanation Particle": "ব্যাখ্যাসূচক অব্যয়",
  "Interpretation Particle": "তাৎপর্যসূচক অব্যয়", // ?
  "Exhortation Particle": "উৎসাহসূচক অব্যয়", // ?
  "Surprise Particle": "বিস্ময়সূচক অব্যয়",
  "Aversion Particle": "প্রত্যাখ্যানসূচক অব্যয়", // ?
  "Equalization Particle": "সমতাসূচক অব্যয়", // ?
  "Comitative Particle": "সঙ্গবাচক অব্যয়", // ?

  "Arabic font": "আরবি ফন্ট",
  // Typeface names are proper nouns, like the reciters' names -- mapped to
  // themselves on purpose so the coverage report counts them as DECIDED
  // rather than forgotten (the convention phase 6 set).
  "Scheherazade": "Scheherazade",
  "Noto Naskh": "Noto Naskh",
  "Amiri Quran": "Amiri Quran",
  "Your device's own": "আপনার ডিভাইসের নিজস্ব",
  "Indo-Pak script is not here yet: it is written differently, not only drawn differently, so it needs its own copy of the Qur'an text.":
    "ইন্দো-পাক লিপি এখনও যুক্ত হয়নি: এটি কেবল আলাদা করে আঁকা নয়, আলাদা করে লেখাও — তাই এর জন্য কুরআনের পাঠের আলাদা একটি অনুলিপি প্রয়োজন।",

  // --- The "Go to" box, including what it says when it cannot read you ---
  "Couldn't read \"{text}\". Try 2:255 for one ayah, or 2:255-260 for a range.":
    "\"{text}\" বোঝা গেল না। একটি আয়াতের জন্য ২:২৫৫, বা পরিসরের জন্য ২:২৫৫-২৬০ লিখুন।",
  "There is no Surah {surah}. Surah numbers run 1–114.":
    "{surah} নম্বর কোনো সূরা নেই। সূরার নম্বর ১ থেকে ১১৪ পর্যন্ত।",
  "Surah {surah} has {count} ayahs.": "সূরা {surah}-এ {count}টি আয়াত আছে।",
  "2:255 or a word": "২:২৫৫ বা একটি শব্দ",

  // --- Search (shell round 14) -------------------------------------------
  // The box now takes words as well as references, so its own wording has to
  // teach that in Bangla too -- a Bangla-only reader who is only ever told
  // "২:২৫৫" will never discover that a word works.
  "Search": "খুঁজুন",
  "Search the Qur'an": "কুরআনে খুঁজুন",
  "Type a word or phrase in the box above, then press Search.":
    "উপরের ঘরে একটি শব্দ বা বাক্যাংশ লিখুন, তারপর খুঁজুন চাপুন।",
  "Searching for \"{query}\"…": "\"{query}\" খোঁজা হচ্ছে…",
  "Nothing found for \"{query}\".": "\"{query}\"-এর কিছু পাওয়া যায়নি।",
  "1 ayah found.": "১টি আয়াত পাওয়া গেছে।",
  "{total} ayahs found.": "{total}টি আয়াত পাওয়া গেছে।",
  "{total} ayahs found — showing the first {shown}.":
    "{total}টি আয়াত পাওয়া গেছে — প্রথম {shown}টি দেখানো হচ্ছে।",
  "Couldn't load the search index. Check your connection and try again.":
    "খোঁজার তালিকা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",

  // --- Reading view ------------------------------------------------------
  "Reading view": "পড়ার ধরন",
  "Page display (Whole Surah / Range)": "পৃষ্ঠা প্রদর্শন (সম্পূর্ণ সূরা / পরিসর)",
  "Mushaf (real page)": "মুসহাফ (প্রকৃত পৃষ্ঠা)",
  "Tajweed": "তাজবীদ",
  "Tajweed colours": "তাজবীদের রঙ",
  "Word by Word": "শব্দে শব্দে",
  "Translation": "অনুবাদ",
  "Translation language": "অনুবাদের ভাষা",
  "Default translation": "সাধারণ অনুবাদ",
  "Follow translation language": "অনুবাদের ভাষা অনুসরণ করুন",
  "English": "ইংরেজি",
  "English only": "শুধু ইংরেজি",
  // These three already contain Bangla, because they NAME Bangla -- they are
  // how a Bangla reader spots the option. Only the English half is
  // translated; "বাংলা" stays exactly as it is.
  "English + বাংলা (Bangla)": "ইংরেজি + বাংলা",
  "English + বাংলা": "ইংরেজি + বাংলা",
  "বাংলা only": "শুধু বাংলা",
  "Choosing a translation by translator's name is not built yet — it is on the list.":
    "অনুবাদকের নাম দেখে অনুবাদ বেছে নেওয়ার সুবিধা এখনো তৈরি হয়নি — এটি তালিকায় আছে।",
  "Loading Mushaf page…": "মুসহাফের পৃষ্ঠা লোড হচ্ছে…",
  // Failure messages matter as much as anything else here (I15): an error a
  // Bangla-only reader cannot read is nearly as useless as no error at all.
  // The {reason} inside is the browser's own technical detail and stays as
  // it comes -- it is for whoever is helping them, not for them.
  "Couldn't load Mushaf page data ({reason}).": "মুসহাফের পৃষ্ঠার তথ্য লোড করা যায়নি ({reason})।",
  "Couldn't load this page's data.": "এই পৃষ্ঠার তথ্য লোড করা যায়নি।",
  "Couldn't play this audio: {reason}.": "এই অডিওটি বাজানো যায়নি: {reason}।",
  // Shell round 26 -- a failure now NAMES what failed (which reciter, which
  // ayah), so "it didn't play" becomes something that can be acted on rather
  // than looking like the whole app is broken. The reciter's own name inside
  // is a person's name and stays exactly as it is.
  "Couldn't play {what}: {reason}.": "{what} বাজানো যায়নি: {reason}।",
  "{reciter}, Surah {surah}, Ayah {ayah}": "{reciter}, সূরা {surah}, আয়াত {ayah}",
  "{reciter}, Surah {surah}": "{reciter}, সূরা {surah}",
  // The reasons themselves. Until this round they were English literals dropped
  // into a translated sentence, so a Bangla reader got half a message (I15).
  "playback was aborted": "বাজানো বন্ধ করে দেওয়া হয়েছে",
  "a network error interrupted the download": "নেটওয়ার্কের সমস্যায় ডাউনলোড থেমে গেছে",
  "the file could not be decoded — it may be corrupt or an unsupported format":
    "ফাইলটি পড়া যায়নি — এটি নষ্ট হতে পারে, বা এই ধরনের ফাইল সমর্থিত নয়",
  "the audio source isn't available — the file may not exist at that address":
    "অডিও ফাইলটি পাওয়া যায়নি — ওই ঠিকানায় ফাইলটি না-ও থাকতে পারে",
  "an unknown playback error occurred": "অজানা একটি সমস্যায় বাজানো যায়নি",
  "the browser blocked playback until you press play again":
    "ব্রাউজার বাজানো আটকে দিয়েছে — আবার play চাপুন", // ?
  "Couldn't find a Mushaf page for this selection.":
    "এই নির্বাচনের জন্য মুসহাফের পৃষ্ঠা পাওয়া যায়নি।",
  "No word-by-word data for this ayah.": "এই আয়াতের জন্য শব্দে-শব্দে তথ্য নেই।",
  // Round 27 -- its own reading choice now, split out of Word by Word. The key
  // is the DECODED text (&amp; -> &), because translateStatic() reads text
  // nodes from the live DOM, not the HTML source (phase 3's own lesson).
  "Roots & derivatives": "শব্দমূল ও গঠন", // ?
  // Round 28 -- the reading moves sideways, one page at a time.
  "Page by page": "পাতায় পাতায়", // ?
  "No morphology data for this ayah.": "এই আয়াতের জন্য শব্দগঠনের তথ্য নেই।",
  "Reflection": "চিন্তা-ভাবনা", // ?
  "Write it out here": "এখানে লিখুন",

  // --- Listening ---------------------------------------------------------
  "Listening settings": "শোনার সেটিংস",
  "Recitation": "তিলাওয়াত",
  "This Approach has no listening panel, so there is nothing to set here.":
    "এই পদ্ধতিতে শোনার কোনো অংশ নেই, তাই এখানে সেট করার কিছু নেই।",
  "Drill reciters": "অনুশীলনের ক্বারী",
  "Repeat": "পুনরাবৃত্তি",
  "Mode": "ধরন",
  "Each Ayah": "প্রতিটি আয়াত",
  "Whole Unit": "সম্পূর্ণ একক",
  "Pick at least one reciter to drill.": "অনুশীলনের জন্য অন্তত একজন ক্বারী বেছে নিন।",
  // Reciters are PEOPLE. A person's name is not translated -- only the
  // language note in brackets, which is what actually helps someone choose.
  "Abdullah Basfar (Arabic)": "Abdullah Basfar (আরবি)",
  "Ibraheem Walk (English)": "Ibraheem Walk (ইংরেজি)",
  "Kevan Brighting (English, whole surah only)": "Kevan Brighting (ইংরেজি, শুধু সম্পূর্ণ সূরা)",
  "Shareef Bayezid Mahmud (Bangla)": "শরীফ বায়েজিদ মাহমুদ (বাংলা)",

  // --- The wheel's own one-time intro button + settled caption -----------
  "Study Quran": "কুরআন অধ্যয়ন করুন", // ?
  "ONE Ayah a Day": "প্রতিদিন একটি আয়াত", // ?
  "Approach an Ayah in 30 ways": "একটি আয়াতকে ৩০ উপায়ে অধ্যয়ন করুন", // ?

  // --- Claiming, and the Approach modal ----------------------------------
  "Track this unit": "এই এককটি চিহ্নিত করুন",
  // Shortened to one word in shell round 14, so the Approach name beside it
  // gets the room instead. The longer wording above is kept, unused here.
  "Track": "চিহ্নিত করুন",
  "Claim": "দাবি করুন", // ?
  "Claim a status": "একটি অবস্থা দাবি করুন", // ?
  "Confirmed:": "নিশ্চিত করা হয়েছে:",
  "Not claimed yet.": "এখনো দাবি করা হয়নি।",
  "Nothing claimed yet for this Approach here.": "এখানে এই পদ্ধতিতে এখনো কিছু দাবি করা হয়নি।",
  "What": "কী",
  "How": "কীভাবে",
  "How to measure your progress": "আপনার অগ্রগতি কীভাবে মাপবেন",
  // The confirm-state pills (records.js writes these values).
  "pending": "অপেক্ষমাণ",
  "confirmed": "নিশ্চিত",
  "rejected": "প্রত্যাখ্যাত",

  // --- The routine renderer's streak line (shared with Health/LDOG) ------
  "Logged today ✓": "আজ লিপিবদ্ধ হয়েছে ✓",
  "Not logged today yet.": "আজ এখনো লিপিবদ্ধ হয়নি।",
  "No streak yet — log it to start one.": "এখনো কোনো ধারা নেই — শুরু করতে লিপিবদ্ধ করুন।",

  // --- Signed out / no account (shown by every study page) --------------
  "Starting fresh instead?": "নতুন করে শুরু করতে চান?",
  "Create a new account\n      on the onboarding page": "নতুন অ্যাকাউন্ট তৈরি করুন",

  // --- The Ayah Note panel: the ⋮ quick menu and "Note & more" view ------
  "Quick actions": "দ্রুত কাজ",
  "Copy": "কপি করুন",
  "Share": "শেয়ার করুন",
  "Play this āyah": "এই আয়াতটি চালান",
  "Note & more…": "নোট ও আরও…",
  "Copy failed": "কপি ব্যর্থ হয়েছে",
  "✓ Copied": "✓ কপি হয়েছে",
  "My note": "আমার নোট",
  "My note (none saved)": "আমার নোট (এখনো সংরক্ষিত নেই)",
  "Notes:": "নোট:",
  "Pick a reciter in Listening settings first.": "প্রথমে শোনার সেটিংসে একজন ক্বারী বেছে নিন।",
  "Quran {surah}:{ayah} — Surah {name}": "কুরআন {surah}:{ayah} — সূরা {name}",
  // The Note view's own top bar and body.
  "Notes formatting": "নোট ফরম্যাটিং",
  "Coming later": "শীঘ্রই আসছে",
  // Round 31 -- bar 2's Word-by-word toggle. Deliberately NOT translated,
  // mapped to itself so the report counts it as decided rather than
  // forgotten (same treatment "বাংলা (Bangla)" gets above): "WbW" is a
  // Latin-abbreviation icon, the same convention "Aa" already uses on bar
  // 1, and translating an abbreviation into a different alphabet defeats
  // the point of it being a compact glyph. The real, translated name lives
  // in the title/aria-pressed pair, via "Word by Word" below.
  "WbW": "WbW",
  // Enhancement round -- bar 2's Root (Roots & derivatives) toggle. Unlike
  // "WbW" this is a real word, not an abbreviation-as-icon, so it gets a
  // real Bangla word rather than being mapped to itself.
  "Root": "মূল",
  "Mapping My Journey": "আমার যাত্রার মানচিত্র", // ? -- placeholder feature name, not yet designed
  "Previous āyah": "পূর্ববর্তী আয়াত",
  "Next āyah": "পরবর্তী আয়াত",
  "Bookmark this āyah": "এই আয়াতটি বুকমার্ক করুন",
  "Remove bookmark": "বুকমার্ক সরান",
  // Round 30 moved Copy/Share to the Ayah bar itself; round 31 moved them
  // again, to their own bar-2 popovers with their own language checkboxes
  // -- so the 🔖 toggle now holds only Bookmark and Play. Both earlier keys
  // are kept, unused, rather than deleted -- same rule this project has
  // followed every time a string stopped being called.
  "Bookmark & play": "বুকমার্ক ও চালান",
  "Bookmark, play & language options": "বুকমার্ক, চালান ও ভাষা অপশন",
  "Bookmark, copy & share": "বুকমার্ক, কপি ও শেয়ার",
  "Collapse āyah text": "আয়াতের লেখা সংক্ষিপ্ত করুন",
  "Expand āyah text": "আয়াতের লেখা বড় করুন",
  "Notes always stays open": "নোট সবসময় খোলা থাকে",
  "Bangla": "বাংলা",
  "Type notes here…": "এখানে নোট লিখুন…",
  "Couldn't save — will try again.": "সংরক্ষণ করা যায়নি — আবার চেষ্টা করা হবে।",
  "Changes aren't reaching the server right now — notes will save once the connection is back.":
    "এখন পরিবর্তনগুলো সার্ভারে পৌঁছাচ্ছে না — সংযোগ ফিরে এলে নোট সংরক্ষিত হবে।",
  // The Notes formatting toolbar (execCommand's own vocabulary).
  "Edit palette — formats the Notes field only": "সম্পাদনা প্যালেট — শুধু নোট ঘরটি ফরম্যাট করে",
  "Bold": "গাঢ়",
  "Italic": "তির্যক",
  "Underline": "আন্ডারলাইন",
  "Strikethrough": "কাটাকাটি রেখা", // ?
  "Heading style": "শিরোনামের ধরন",
  "Normal": "স্বাভাবিক",
  "Heading 1": "শিরোনাম ১",
  "Heading 2": "শিরোনাম ২",
  "Heading 3": "শিরোনাম ৩",
  "Bullet list": "বুলেট তালিকা",
  "Numbered list": "নম্বরযুক্ত তালিকা",
  "List": "তালিকা",
  "Clear": "মুছুন",
  "Clear formatting": "ফরম্যাটিং মুছুন",

  // =====================================================================
  // Phase 3 of 6 — THE NINE OTHER MODULES (13 Aug 2026)
  // =====================================================================
  // Two different kinds of text live here:
  //   1. The nine module pages' own words (headings, buttons, empty states).
  //   2. PLATFORM DATA -- the subject-tree names, their glosses, and the 30
  //      Approach Guide paragraphs. Those are seeded into each tenant's
  //      Firestore documents in English, and langText() now falls back
  //      through this catalogue for them (see js/lang.js). That is what
  //      makes them translate for the owner's EXISTING tenant without any
  //      data migration.
  //
  // The Guide paragraphs are the heaviest religious/technical writing in the
  // app. Almost every line below is worth the owner's eye; the `// ?` marks
  // are where a wrong word would do the most damage.

  // --- The nine module pages ---------------------------------------------
  "QuranRevival — Deen Study": "কুরআনরিভাইভাল — দ্বীন শিক্ষা",
  "QuranRevival — Arabic Language": "কুরআনরিভাইভাল — আরবি ভাষা",
  "QuranRevival — Hadith": "কুরআনরিভাইভাল — হাদীস",
  "QuranRevival — General Study": "কুরআনরিভাইভাল — সাধারণ শিক্ষা",
  "QuranRevival — Nature-Life": "কুরআনরিভাইভাল — প্রকৃতি ও জীবন",
  "QuranRevival — Life Skill": "কুরআনরিভাইভাল — জীবন দক্ষতা",
  "QuranRevival — Health": "কুরআনরিভাইভাল — স্বাস্থ্য",
  "QuranRevival — Learn Deen On-the-Go": "কুরআনরিভাইভাল — চলার পথে দ্বীন শিক্ষা",
  "QuranRevival — Asma ul Husna": "কুরআনরিভাইভাল — আসমাউল হুসনা",

  // --- Shared module-page furniture --------------------------------------
  "No resource yet": "এখনো কোনো উপকরণ নেই",
  "Nothing under here yet.": "এখানে এখনো কিছু নেই।",
  "Track my progress": "আমার অগ্রগতি চিহ্নিত করুন",
  // Enhancement round -- the Bookmark Manager's own star, now on every
  // topic/routine/Asma detail screen as well as the Quran Note view.
  "Bookmark this": "এটি বুকমার্ক করুন",
  "Name this bookmark:": "এই বুকমার্কের নাম দিন:",
  "Studied": "অধ্যয়ন করা হয়েছে",
  "Practised": "অনুশীলন করা হয়েছে",
  "Logged today": "আজ লিপিবদ্ধ",
  "Due today": "আজ করণীয়",
  "Screensaver": "স্ক্রিনসেভার",
  "Close screensaver": "স্ক্রিনসেভার বন্ধ করুন",
  "Create a new account\n    on the onboarding page": "নতুন অ্যাকাউন্ট তৈরি করুন",
  "You're not assigned to teach this subject for this student.":
    "এই শিক্ষার্থীর এই বিষয়টি পড়ানোর দায়িত্ব আপনাকে দেওয়া হয়নি।",
  "You're not assigned to teach this routine for this student.":
    "এই শিক্ষার্থীর এই রুটিনটি পড়ানোর দায়িত্ব আপনাকে দেওয়া হয়নি।",

  // --- Each module page's own introduction --------------------------------
  "Ethics, Akhlaq, Aqeedah, Ebadah, Sharia, Fiqh, Islamic History & Story,\n     and Enhancement topics — each topic only appears here once it has a real\n     resource attached, added subject by subject from the Catalogue page.":
    "নৈতিকতা, আখলাক, আকীদা, ইবাদাত, শরীয়াহ, ফিকহ, ইসলামের ইতিহাস ও কাহিনী এবং উন্নয়নমূলক বিষয় — প্রতিটি বিষয় কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে।",
  "Advanced grammar, speaking, and daily-use Arabic — each topic only\n     appears here once it has a real resource attached, added subject by\n     subject from the Catalogue page.":
    "উচ্চতর ব্যাকরণ, কথা বলা এবং দৈনন্দিন আরবি — প্রতিটি বিষয় কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে।",
  "Adab Al-Mufrad, Shamayyl Muhammadiya, Al-Ghayb, Hadith Reading, and\n     Stories — each topic only appears here once it has a real resource\n     attached, added subject by subject from the Catalogue page.":
    "আদাবুল মুফরাদ, শামায়িলে মুহাম্মাদিয়া, আল-গায়ব, হাদীস পাঠ এবং কাহিনী — প্রতিটি বিষয় কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে।",
  "Mathematics, English, Science, Geography, World History, Life Skill and\n     Creativity — each topic only appears here once it has a real resource\n     attached, added subject by subject from the Catalogue page. (Health\n     Study lives on its own separate Health page — a scheduled-habit screen,\n     not a topic-and-resource one.)":
    "গণিত, ইংরেজি, বিজ্ঞান, ভূগোল, বিশ্ব ইতিহাস, জীবন দক্ষতা এবং সৃজনশীলতা — প্রতিটি বিষয় কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে। (স্বাস্থ্য শিক্ষা তার নিজস্ব আলাদা স্বাস্থ্য পাতায় আছে — সেটি অভ্যাস-ভিত্তিক পর্দা, বিষয়-ও-উপকরণের নয়।)",
  "Nature Studies and Agro-Farming — each topic only appears here once it\n     has a real resource attached, added subject by subject from the\n     Catalogue page.":
    "প্রকৃতি অধ্যয়ন এবং কৃষি-খামার — প্রতিটি বিষয় কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে।",
  "Technology & Cognition and Trading — its own module now, independent\n     of General Study, same as Health. Add topics from the Catalogue page,\n     each with its own resource, and they'll show up here.":
    "প্রযুক্তি ও চিন্তাশক্তি এবং ব্যবসা — এখন এটি সাধারণ শিক্ষা থেকে স্বাধীন নিজস্ব মডিউল, স্বাস্থ্যের মতোই। তালিকা পাতা থেকে বিষয় যোগ করুন, প্রতিটির নিজস্ব উপকরণসহ, তাহলে সেগুলো এখানে দেখা যাবে।",
  "Know Your Body, Know Your Food, and Physical Activities — each routine only\n     appears here once it has a real resource attached, added subject by subject\n     from the Catalogue page. Log a routine each time it's done to build a streak;\n     claim an overall status once it's genuinely become a habit.":
    "নিজের শরীর জানুন, নিজের খাবার জানুন এবং শারীরিক কার্যক্রম — প্রতিটি রুটিন কেবল তখনই এখানে দেখা যাবে যখন তালিকা পাতা থেকে তাতে প্রকৃত উপকরণ যুক্ত করা হবে। ধারা গড়তে প্রতিবার করার পর রুটিনটি লিপিবদ্ধ করুন; সত্যিই অভ্যাসে পরিণত হলে সামগ্রিক অবস্থা দাবি করুন।",
  "A daily Deen learning habit for life — log it each time it's done to build a\n     streak; claim an overall status once it's genuinely become a habit. Only\n     appears here once it has a real resource attached, added from the Catalogue\n     page.":
    "সারাজীবনের জন্য প্রতিদিনের দ্বীন শেখার অভ্যাস — ধারা গড়তে প্রতিবার করার পর লিপিবদ্ধ করুন; সত্যিই অভ্যাসে পরিণত হলে সামগ্রিক অবস্থা দাবি করুন। তালিকা পাতা থেকে প্রকৃত উপকরণ যুক্ত করা হলেই কেবল এটি এখানে দেখা যাবে।",
  "The 99 Names of Allah — read the meaning of each, then track your own\n     progress through them. Open the screensaver to slowly cycle through the\n     Names for reflection.":
    "আল্লাহর ৯৯টি নাম — প্রতিটির অর্থ পড়ুন, তারপর নিজের অগ্রগতি চিহ্নিত করুন। চিন্তা-ভাবনার জন্য নামগুলো ধীরে ধীরে দেখতে স্ক্রিনসেভার খুলুন।",

  // --- The subject tree: top-level and module roots -----------------------
  "Quran": "কুরআন",
  "Arabic Language": "আরবি ভাষা",
  "General": "সাধারণ",
  "Health Study": "স্বাস্থ্য শিক্ষা",
  "Daily Deen Learning Habit for Life": "সারাজীবনের দৈনন্দিন দ্বীন শেখার অভ্যাস",

  // --- Deen Study subjects -------------------------------------------------
  "Ethics": "নৈতিকতা",
  "Social conduct": "সামাজিক আচরণ",
  "Akhlaq": "আখলাক",
  "Behaviour — personal character": "আচরণ — ব্যক্তিগত চরিত্র",
  "Aqeedah": "আকীদা",
  "Ebadah": "ইবাদাত",
  "Sharia": "শরীয়াহ",
  "Fiqh": "ফিকহ",
  "Islamic History & Story": "ইসলামের ইতিহাস ও কাহিনী",
  "Enhancement": "উন্নয়ন", // ?
  "Islamic Lifestyle": "ইসলামী জীবনধারা",
  "Islamic Mindset": "ইসলামী মানসিকতা",
  "Islamic Sports & Entertainment": "ইসলামী খেলাধুলা ও বিনোদন",

  // --- Hadith subjects -----------------------------------------------------
  "Adab Al-Mufrad": "আদাবুল মুফরাদ",
  "Learning Akhlaq before knowledge": "জ্ঞানের আগে আখলাক শেখা",
  "Shamayyl Muhammadiya": "শামায়িলে মুহাম্মাদিয়া",
  "Learning to love Rasulullah △": "রাসূলুল্লাহ ﷺ-কে ভালোবাসতে শেখা",
  "Hadith — Al-Ghayb": "হাদীস — আল-গায়ব",
  "Knowledge of Allah, Malaikah, Jannah, Jahannam, Qiyamah, Qabr, Shaitan — awareness of the unseen, for mindfulness and focus on Akhirah":
    "আল্লাহ, মালাইকা, জান্নাত, জাহান্নাম, কিয়ামত, কবর, শয়তান সম্পর্কে জ্ঞান — অদৃশ্য সম্পর্কে সচেতনতা, মনোযোগ ও আখিরাতমুখিতার জন্য", // ?
  "Hadith Reading": "হাদীস পাঠ",
  "Hadith — Stories": "হাদীস — কাহিনী",

  // --- Arabic subjects -----------------------------------------------------
  "Detailed Arabic language study. Basic Grammar is NOT here -- it lives in QuranRevival as Approach #6.":
    "বিস্তারিত আরবি ভাষা অধ্যয়ন। মৌলিক ব্যাকরণ এখানে নেই — সেটি কুরআনরিভাইভালে ৬ নং পদ্ধতি হিসেবে আছে।",
  "Arabic Speaking": "আরবি বলা",
  "Arabic Writing": "আরবি লেখা",
  "Arabic Daily Uses": "দৈনন্দিন আরবি ব্যবহার",
  "Names of things, numbers, etc.": "জিনিসের নাম, সংখ্যা ইত্যাদি",
  "Calligraphy": "ক্যালিগ্রাফি",

  // --- General Study subjects ----------------------------------------------
  "Mathematics": "গণিত",
  "Science": "বিজ্ঞান",
  "Geography": "ভূগোল",
  "World History": "বিশ্ব ইতিহাস",
  "Creativity": "সৃজনশীলতা",
  "Technology & Cognition": "প্রযুক্তি ও চিন্তাশক্তি",
  "Trading": "ব্যবসা",
  "moved from General Study ▸ Enhancement": "সাধারণ শিক্ষা ▸ উন্নয়ন থেকে সরানো হয়েছে",
  "moved up from General Study ▸ Enhancement": "সাধারণ শিক্ষা ▸ উন্নয়ন থেকে উপরে আনা হয়েছে",

  // --- Nature-Life subjects -------------------------------------------------
  "Nature Studies": "প্রকৃতি অধ্যয়ন",
  "Agro-Farming": "কৃষি-খামার",

  // --- Health subjects and routines ------------------------------------------
  "Know Your Body": "নিজের শরীর জানুন",
  "Know Your Food": "নিজের খাবার জানুন",
  "Physical Activities": "শারীরিক কার্যক্রম",
  "Breathing Exercise": "শ্বাস-প্রশ্বাসের ব্যায়াম",
  "Standing Movements": "দাঁড়ানো অবস্থার ব্যায়াম",
  "Sitting Movements": "বসা অবস্থার ব্যায়াম",
  "Lying Movements": "শোয়া অবস্থার ব্যায়াম",
  "Walking": "হাঁটা",
  "Squatting": "স্কোয়াট",
  "HIIT": "HIIT",
  "Fasting": "রোযা",

  // --- The 30 Approaches: their seven section names --------------------------
  "Core": "মূল",
  "Building Foundation / Learning Tools": "ভিত্তি গঠন / শেখার উপকরণ",
  "Engagement / Attachment": "সম্পৃক্ততা / সংযোগ",
  "Critical Reasoning: Nazar / 'Aql": "সূক্ষ্ম চিন্তা: নাযার / আকল", // ?
  "Critical Reasoning: Tafakkur / Tadabbur": "সূক্ষ্ম চিন্তা: তাফাক্কুর / তাদাব্বুর", // ?
  "Critical Reasoning: Judgement / Authority": "সূক্ষ্ম চিন্তা: বিচার / কর্তৃত্ব", // ?
  "Critical Reasoning: Applied Threads": "সূক্ষ্ম চিন্তা: প্রয়োগমূলক ধারা", // ?
  "A'mal / Application": "আমল / প্রয়োগ",

  // --- Approach names not already carrying their own Bangla ------------------
  "Hifz / Memorising": "হিফয / মুখস্থকরণ",
  "Reading (with Tajweed)": "পাঠ (তাজবীদসহ)",
  "Reading (with Meaning)": "পাঠ (অর্থসহ)",
  "Reading — Word-by-Word Meaning": "পাঠ — শব্দে শব্দে অর্থ",
  "Reading in Arabic": "আরবিতে পাঠ",
  "Listening Attentively (Arabic only)": "মনোযোগ দিয়ে শোনা (শুধু আরবি)",
  "Listening Attentively (Arabic with meaning)": "মনোযোগ দিয়ে শোনা (আরবি ও অর্থসহ)",
  "Ruqyah Listening": "রুকইয়াহ শ্রবণ",
  "Language Learning (Basic Grammar)": "ভাষা শিক্ষা (মৌলিক ব্যাকরণ)",
  "Language Learning (Advanced)": "ভাষা শিক্ষা (উচ্চতর)",
  "Dua Memorising": "দুআ মুখস্থকরণ",
  "Deriving Dua": "দুআ উদ্ঘাটন", // ?
  "Deriving Names & Attributes of Allah": "আল্লাহর নাম ও গুণাবলি উদ্ঘাটন", // ?
  "Deriving Understanding of the Prophets": "নবীগণ সম্পর্কে উপলব্ধি অর্জন", // ?
  "Reflecting on the Miracles": "মুজিযা নিয়ে চিন্তা",
  "Story Learning": "কাহিনী শিক্ষা",
  "Journaling": "নিজের ভাবনা লেখা",
  "Group / Class Discussion": "দলগত / শ্রেণি আলোচনা",
  "Teaching Others": "অন্যকে শেখানো",
  "Living by it (Self-Assessment)": "সে অনুযায়ী জীবনযাপন (আত্মমূল্যায়ন)",
  "Judgment (Fahm)": "বিচারবুদ্ধি (ফাহম)", // ?
  "Beginner's Level — Observation (Nazar)": "প্রাথমিক স্তর — পর্যবেক্ষণ (নাযার)", // ?
  "Primary Level — Common Sense ('Aql / Ta'aqqul)": "প্রথম স্তর — সাধারণ বিবেচনা (আকল / তাআক্কুল)", // ?
  "Intermediate Level — Reflecting / Pondering (Tafakkur)": "মধ্যম স্তর — চিন্তা / অনুধাবন (তাফাক্কুর)", // ?
  "Advanced Level — Deep Contemplation (Tadabbur)": "উন্নত স্তর — গভীর অনুধাবন (তাদাব্বুর)", // ?
  "Higher Level — Understanding / Fiqh (Tafaqquh)": "উচ্চতর স্তর — উপলব্ধি / ফিকহ (তাফাক্কুহ)", // ?
  "Upper Higher Level — Dhikr / Tadhakkur": "সর্বোচ্চ স্তর — যিকর / তাযাক্কুর", // ?
  "Authority — Hukm / Tahakum": "কর্তৃত্ব — হুকম / তাহাকুম", // ?
  "Mastery Level — Where Fiqh turns to Ruling (9:122 pivot)":
    "পূর্ণতার স্তর — যেখানে ফিকহ হুকমে পরিণত হয় (৯:১২২ কেন্দ্রবিন্দু)", // ?
  "Da'wah — Sharing Knowledge / Calling Others": "দাওয়াহ — জ্ঞান ভাগ করা / অন্যকে আহ্বান",

  // --- Approach Guide: "What it is" -------------------------------------------
  "Committing ayahs to memory so they can be recited without looking at the text.":
    "আয়াতগুলো মুখস্থ করা, যাতে লেখার দিকে না তাকিয়েই তিলাওয়াত করা যায়।",
  "Reciting the Arabic text accurately, applying the rules of tajweed.":
    "তাজবীদের নিয়ম প্রয়োগ করে আরবি পাঠ সঠিকভাবে তিলাওয়াত করা।",
  "Reading the Arabic text alongside its translation to understand what is being read.":
    "যা পড়া হচ্ছে তা বোঝার জন্য আরবি পাঠের পাশাপাশি তার অনুবাদ পড়া।",
  "Learning the meaning of each individual Arabic word in a passage.":
    "একটি অংশের প্রতিটি আরবি শব্দের অর্থ আলাদাভাবে শেখা।",
  "Listening to the Arabic recitation with full attention, without reading along.":
    "সাথে না পড়ে, পূর্ণ মনোযোগ দিয়ে আরবি তিলাওয়াত শোনা।",
  "Listening to the recitation while also taking in its meaning.":
    "তিলাওয়াত শোনার সাথে সাথে তার অর্থও গ্রহণ করা।",
  "Listening to ruqyah recitation for protection and comfort.":
    "সুরক্ষা ও প্রশান্তির জন্য রুকইয়াহ তিলাওয়াত শোনা।",
  "Learning the basic Arabic grammar needed to read and understand Quranic text.":
    "কুরআনের পাঠ পড়তে ও বুঝতে প্রয়োজনীয় মৌলিক আরবি ব্যাকরণ শেখা।",
  "Practising writing the Arabic letters and words of the text by hand.":
    "পাঠের আরবি অক্ষর ও শব্দ হাতে লেখার অনুশীলন করা।",
  "Practising the artistic writing of Arabic script.": "আরবি লিপির শৈল্পিক লেখার অনুশীলন করা।",
  "Memorising a specific dua, in Arabic, with its meaning.":
    "একটি নির্দিষ্ট দুআ আরবিতে, তার অর্থসহ মুখস্থ করা।",
  "Finding duas embedded in or suggested by the ayah.":
    "আয়াতের ভেতরে থাকা বা আয়াত থেকে বোঝা যায় এমন দুআ খুঁজে বের করা।",
  "Identifying the Names and Attributes of Allah mentioned or implied in the ayah.":
    "আয়াতে উল্লিখিত বা ইঙ্গিতে থাকা আল্লাহর নাম ও গুণাবলি চিহ্নিত করা।",
  "Learning about the Prophets (peace be upon them) through what the ayah says about them.":
    "আয়াত নবীগণ (আলাইহিমুস সালাম) সম্পর্কে যা বলে, তার মাধ্যমে তাঁদের সম্পর্কে জানা।",
  "Reflecting on the miracles mentioned in the Quran and what they point to.":
    "কুরআনে উল্লিখিত মুজিযা এবং সেগুলো কীসের দিকে ইঙ্গিত করে, তা নিয়ে চিন্তা করা।",
  "Learning the stories connected to the ayah or surah being studied.":
    "যে আয়াত বা সূরা পড়া হচ্ছে তার সাথে সম্পৃক্ত কাহিনীগুলো শেখা।",
  "Writing personal notes and reflections about what has been studied.":
    "যা অধ্যয়ন করা হয়েছে সে সম্পর্কে ব্যক্তিগত নোট ও ভাবনা লেখা।",
  "Discussing what has been learned with others.": "যা শেখা হয়েছে তা অন্যদের সাথে আলোচনা করা।",
  "Teaching what has been learned to someone else in a structured way.":
    "যা শেখা হয়েছে তা সুবিন্যস্তভাবে অন্য কাউকে শেখানো।",
  "Honestly assessing whether you are living by what you have learned.":
    "আপনি যা শিখেছেন সে অনুযায়ী চলছেন কি না, তা সততার সাথে মূল্যায়ন করা।",
  "Noticing what the text actually says, plainly, before interpreting it.":
    "ব্যাখ্যা করার আগে পাঠটি প্রকৃতপক্ষে কী বলছে, তা স্পষ্টভাবে লক্ষ করা।",
  "Applying ordinary reasoning to what has been observed in the text.":
    "পাঠে যা পর্যবেক্ষণ করা হয়েছে তাতে সাধারণ যুক্তি প্রয়োগ করা।",
  "Pondering the meaning of the ayah beyond its surface reading.":
    "আয়াতের বাহ্যিক পাঠের বাইরে গিয়ে তার অর্থ নিয়ে চিন্তা করা।",
  "Going deeper than reflection — contemplating connections, causes, and implications.":
    "চিন্তার চেয়েও গভীরে যাওয়া — সংযোগ, কারণ ও ফলাফল নিয়ে অনুধাবন করা।",
  "Building a structured understanding of what the ayah requires or teaches.":
    "আয়াত কী দাবি করে বা কী শেখায়, সে সম্পর্কে সুবিন্যস্ত উপলব্ধি গড়ে তোলা।",
  "Letting the understanding turn into active remembrance of Allah.":
    "উপলব্ধিকে আল্লাহর সক্রিয় স্মরণে রূপান্তরিত হতে দেওয়া।",
  "Exercising sound judgement in applying what has been understood.":
    "যা বোঝা হয়েছে তা প্রয়োগে সুষ্ঠু বিচারবুদ্ধি কাজে লাগানো।",
  "Recognising the authority of a ruling once soundly reached.":
    "সঠিকভাবে পৌঁছানো একটি হুকমের কর্তৃত্ব স্বীকার করা।",
  "Reaching the point where understanding becomes a basis for a considered ruling.":
    "সেই পর্যায়ে পৌঁছানো যেখানে উপলব্ধি একটি বিবেচিত হুকমের ভিত্তি হয়ে ওঠে।",
  "Sharing what has been learned with someone else, inviting them toward it.":
    "যা শেখা হয়েছে তা অন্য কারো সাথে ভাগ করা এবং তার দিকে আহ্বান করা।",

  // --- Approach Guide: "How to do it" ------------------------------------------
  "Repeat a short portion aloud in a loop until it is secure, then recite it from memory and check against the text.":
    "একটি ছোট অংশ বারবার শব্দ করে পড়ুন যতক্ষণ না তা পাকা হয়, তারপর মুখস্থ থেকে তিলাওয়াত করে পাঠের সাথে মিলিয়ে দেখুন।",
  "Read aloud from the mushaf, applying each tajweed rule as it appears; use the audio and repeat/loop tools to match a reciter.":
    "মুসহাফ থেকে শব্দ করে পড়ুন, প্রতিটি তাজবীদের নিয়ম যেখানে আসে সেখানে প্রয়োগ করুন; ক্বারীর সাথে মেলাতে অডিও ও পুনরাবৃত্তির সুবিধা ব্যবহার করুন।",
  "Read a passage, then read its meaning; go back and forth until the meaning is clear.":
    "একটি অংশ পড়ুন, তারপর তার অর্থ পড়ুন; অর্থ স্পষ্ট না হওয়া পর্যন্ত দুয়ের মধ্যে যাওয়া-আসা করুন।",
  "Use the word-by-word panel to see each word's meaning underneath it while reading.":
    "পড়ার সময় প্রতিটি শব্দের নিচে তার অর্থ দেখতে শব্দে-শব্দে অংশটি ব্যবহার করুন।",
  "Play the audio and listen without looking at the text; use loop for a shorter passage.":
    "অডিও চালিয়ে পাঠের দিকে না তাকিয়ে শুনুন; ছোট অংশের জন্য পুনরাবৃত্তি ব্যবহার করুন।",
  "Listen to the audio with the translation visible or read alongside it.":
    "অনুবাদ সামনে রেখে, বা পাশাপাশি পড়তে পড়তে অডিও শুনুন।",
  "Play the ruqyah audio in a quiet setting and listen attentively, using loop as needed.":
    "নিরিবিলি পরিবেশে রুকইয়াহর অডিও চালিয়ে মনোযোগ দিয়ে শুনুন, প্রয়োজনে পুনরাবৃত্তি ব্যবহার করুন।",
  "Study one grammar point at a time and find examples of it in the text being studied.":
    "একবারে একটি ব্যাকরণের বিষয় পড়ুন এবং যে পাঠ পড়ছেন তাতে তার উদাহরণ খুঁজুন।",
  "Copy the assigned text by hand, letter by letter, checking each word against the original.":
    "নির্ধারিত পাঠটি হাতে অক্ষরে অক্ষরে লিখুন, প্রতিটি শব্দ মূলের সাথে মিলিয়ে দেখুন।",
  "Copy a short phrase or ayah using calligraphy strokes, following a model.":
    "একটি নমুনা অনুসরণ করে ক্যালিগ্রাফির টানে একটি ছোট বাক্য বা আয়াত লিখুন।",
  "Repeat the dua aloud in short phrases, building up to the whole dua, checking the meaning as you go.":
    "দুআটি ছোট ছোট অংশে শব্দ করে বারবার পড়ুন, ধীরে ধীরে পুরো দুআ পর্যন্ত যান, সাথে সাথে অর্থ মিলিয়ে নিন।",
  "Look for language of asking, praising, or turning to Allah, and draw out the dua in it.":
    "চাওয়া, প্রশংসা বা আল্লাহর দিকে ফেরার ভাষা খুঁজুন, এবং তার ভেতর থেকে দুআটি বের করুন।",
  "Look for a Name or Attribute in the text, and explain what it means here.":
    "পাঠে একটি নাম বা গুণ খুঁজুন, এবং এখানে তার অর্থ কী তা ব্যাখ্যা করুন।",
  "Identify what the ayah teaches about a Prophet's character, trial, or example.":
    "আয়াতটি কোনো নবীর চরিত্র, পরীক্ষা বা আদর্শ সম্পর্কে কী শেখায় তা চিহ্নিত করুন।",
  "Identify the miracle in the text and consider what it demonstrates about Allah's power.":
    "পাঠে মুজিযাটি চিহ্নিত করুন এবং তা আল্লাহর কুদরত সম্পর্কে কী প্রমাণ করে তা ভাবুন।",
  "Read or listen to the story, then retell it in your own words.":
    "কাহিনীটি পড়ুন বা শুনুন, তারপর নিজের ভাষায় তা বলুন।",
  "After a study session, write a few lines about what stood out and why.":
    "অধ্যয়নের পর কী বিশেষভাবে মনে ধরল এবং কেন, তা নিয়ে কয়েক লাইন লিখুন।",
  "Share what you learned in a group or class setting and listen to others' points.":
    "যা শিখেছেন তা দলে বা শ্রেণিতে ভাগ করুন এবং অন্যদের কথা শুনুন।",
  "Prepare a short explanation of the topic and teach it to another person.":
    "বিষয়টির একটি সংক্ষিপ্ত ব্যাখ্যা তৈরি করুন এবং অন্য একজনকে শেখান।",
  "Reflect on a recent situation and ask whether it matched what was learned.":
    "সাম্প্রতিক কোনো ঘটনা নিয়ে ভাবুন এবং দেখুন তা শেখা বিষয়ের সাথে মিলেছিল কি না।",
  "Read the ayah slowly and list what it literally describes or states.":
    "আয়াতটি ধীরে পড়ুন এবং তা আক্ষরিকভাবে কী বর্ণনা করে বা বলে তার তালিকা করুন।",
  "Ask what the observation means in plain, common-sense terms.":
    "পর্যবেক্ষণটির অর্থ সহজ, সাধারণ বিবেচনায় কী দাঁড়ায় তা জিজ্ঞেস করুন।",
  "Sit with the ayah and ask what it means for life, without rushing to an answer.":
    "আয়াতটি নিয়ে স্থির হয়ে বসুন এবং তাড়াহুড়ো না করে ভাবুন জীবনের জন্য এর অর্থ কী।",
  "Consider how the ayah connects to other ayahs, to life, and to one's own state.":
    "আয়াতটি অন্য আয়াতের সাথে, জীবনের সাথে এবং নিজের অবস্থার সাথে কীভাবে যুক্ত তা বিবেচনা করুন।",
  "Work out the practical understanding the ayah leads to, referring to established knowledge where needed.":
    "আয়াতটি যে ব্যবহারিক উপলব্ধির দিকে নিয়ে যায় তা বের করুন, প্রয়োজনে স্বীকৃত জ্ঞানের সাহায্য নিন।",
  "Return to the ayah's meaning in moments of daily life, as a reminder.":
    "দৈনন্দিন জীবনের নানা মুহূর্তে স্মারক হিসেবে আয়াতটির অর্থে ফিরে আসুন।",
  "Apply the understanding to a real situation and judge what it calls for.":
    "উপলব্ধিটি একটি বাস্তব পরিস্থিতিতে প্রয়োগ করুন এবং তা কী দাবি করে তা বিচার করুন।",
  "Identify what ruling or authority the understanding leads to, and why it holds.":
    "উপলব্ধিটি কোন হুকম বা কর্তৃত্বের দিকে নিয়ে যায় এবং কেন তা টিকে থাকে, তা চিহ্নিত করুন।",
  "Work from the understanding gathered so far toward a reasoned conclusion, under guidance.":
    "এ পর্যন্ত অর্জিত উপলব্ধি থেকে, পথনির্দেশনার অধীনে, একটি যুক্তিসঙ্গত সিদ্ধান্তের দিকে এগোন।",
  "Explain a point you have learned to someone else, in your own words.":
    "আপনি শিখেছেন এমন একটি বিষয় নিজের ভাষায় অন্য কাউকে ব্যাখ্যা করুন।",
  "Go through the topic's resource, then claim a status once it has actually been covered.":
    "বিষয়টির উপকরণটি সম্পূর্ণ দেখুন, তারপর সত্যিই শেষ হলে একটি অবস্থা দাবি করুন।",
  "Log it from the routine's page each time it's done, then claim an overall status once it's genuinely a habit.":
    "প্রতিবার করার পর রুটিনের পাতা থেকে লিপিবদ্ধ করুন, তারপর সত্যিই অভ্যাসে পরিণত হলে সামগ্রিক অবস্থা দাবি করুন।",

  // --- Approach Guide: "How to measure your progress" ---------------------------
  "How much can be recited from memory, start to finish, without a mistake.":
    "শুরু থেকে শেষ পর্যন্ত কতটুকু ভুল ছাড়া মুখস্থ থেকে তিলাওয়াত করা যায়।",
  "How much of the assigned portion you can read correctly, with tajweed rules applied, without correction.":
    "নির্ধারিত অংশের কতটুকু তাজবীদের নিয়মসহ, সংশোধন ছাড়া সঠিকভাবে পড়া যায়।",
  "Whether you can explain in your own words what the passage you read means.":
    "আপনি যে অংশটি পড়েছেন তার অর্থ নিজের ভাষায় ব্যাখ্যা করতে পারেন কি না।",
  "How many of the words in the assigned portion you can translate without the panel.":
    "নির্ধারিত অংশের কতগুলো শব্দ সাহায্য ছাড়াই অনুবাদ করতে পারেন।",
  "Whether you can follow along and recognise where you are in the recitation.":
    "তিলাওয়াতের সাথে চলতে এবং কোথায় আছেন তা বুঝতে পারেন কি না।",
  "Whether you can explain the meaning of what was just heard.":
    "এইমাত্র যা শুনলেন তার অর্থ ব্যাখ্যা করতে পারেন কি না।",
  "Whether you can identify the grammar point being studied in a new, unseen ayah.":
    "যে ব্যাকরণের বিষয়টি পড়ছেন তা নতুন, অদেখা কোনো আয়াতে চিহ্নিত করতে পারেন কি না।",
  "Whether the written copy matches the original accurately.":
    "হাতে লেখা অনুলিপিটি মূলের সাথে হুবহু মেলে কি না।",
  "Whether the calligraphy piece is complete and legible.":
    "ক্যালিগ্রাফির কাজটি সম্পূর্ণ ও পাঠযোগ্য কি না।",
  "Whether the dua can be recited from memory, correctly, with its meaning known.":
    "দুআটি অর্থ জেনে, সঠিকভাবে, মুখস্থ থেকে পড়া যায় কি না।",
  "Whether a dua has been correctly identified and articulated from the text.":
    "পাঠ থেকে একটি দুআ সঠিকভাবে চিহ্নিত ও প্রকাশ করা হয়েছে কি না।",
  "Whether the Name or Attribute has been correctly identified and explained.":
    "নাম বা গুণটি সঠিকভাবে চিহ্নিত ও ব্যাখ্যা করা হয়েছে কি না।",
  "Whether a clear lesson about a Prophet has been drawn from the text.":
    "পাঠ থেকে কোনো নবী সম্পর্কে স্পষ্ট শিক্ষা নেওয়া হয়েছে কি না।",
  "Whether the miracle and its significance have been clearly identified.":
    "মুজিযা এবং তার তাৎপর্য স্পষ্টভাবে চিহ্নিত হয়েছে কি না।",
  "Whether the story can be retold accurately, in the right order.":
    "কাহিনীটি সঠিক ক্রমে, নির্ভুলভাবে আবার বলা যায় কি না।",
  "Whether a journal entry has been written for the session.":
    "এই অধ্যয়নের জন্য নিজের ভাবনা লেখা হয়েছে কি না।",
  "Whether you took part in a discussion about the material.":
    "বিষয়টি নিয়ে আলোচনায় অংশ নিয়েছেন কি না।",
  "Whether the topic was taught, and whether the learner understood it.":
    "বিষয়টি শেখানো হয়েছে কি না, এবং শিক্ষার্থী তা বুঝেছে কি না।",
  "Whether an honest self-assessment has been recorded.":
    "একটি সৎ আত্মমূল্যায়ন লিপিবদ্ধ হয়েছে কি না।",
  "Whether the plain content of the ayah can be described accurately.":
    "আয়াতের সরল বক্তব্য নির্ভুলভাবে বর্ণনা করা যায় কি না।",
  "Whether a sensible, reasoned point can be drawn from the observation.":
    "পর্যবেক্ষণ থেকে একটি যুক্তিসঙ্গত, বিবেচিত কথা বের করা যায় কি না।",
  "Whether a genuine reflection has been recorded, not just a restatement.":
    "কেবল পুনরাবৃত্তি নয়, প্রকৃত চিন্তা লিপিবদ্ধ হয়েছে কি না।",
  "Whether the contemplation shows a connection made, not only an observation.":
    "অনুধাবনে কেবল পর্যবেক্ষণ নয়, একটি সংযোগ ধরা পড়েছে কি না।",
  "Whether a sound, structured understanding has been reached.":
    "একটি সুষ্ঠু, সুবিন্যস্ত উপলব্ধিতে পৌঁছানো গেছে কি না।",
  "Whether it happens without being reminded, most of the time.":
    "মনে করিয়ে না দিলেও অধিকাংশ সময় তা হয় কি না।",
  "Whether the judgement made is sound and well-explained.":
    "যে বিচার করা হয়েছে তা সুষ্ঠু ও সুব্যাখ্যাত কি না।",
  "Whether a reasoned, sound conclusion has been reached and can be explained.":
    "একটি যুক্তিসঙ্গত, সুষ্ঠু সিদ্ধান্তে পৌঁছানো গেছে এবং তা ব্যাখ্যা করা যায় কি না।",
  "Whether the knowledge was shared with at least one other person.":
    "জ্ঞানটি অন্তত একজনের সাথে ভাগ করা হয়েছে কি না।",
  "Whether this topic has been studied, at a level worth recording.":
    "বিষয়টি লিপিবদ্ধ করার মতো পর্যায়ে অধ্যয়ন করা হয়েছে কি না।",
  "Whether this routine has become a habit worth recording, on top of logging it day to day.":
    "দৈনন্দিন লিপিবদ্ধ করার পাশাপাশি রুটিনটি লিপিবদ্ধ করার মতো অভ্যাসে পরিণত হয়েছে কি না।",
  "Whether you can explain the topic's content back, in your own words.":
    "বিষয়টির বক্তব্য নিজের ভাষায় ফিরে বলতে পারেন কি না।",
  "This approach is about the practice itself -- a specific measure is not required to make progress here.":
    "এই পদ্ধতিটি অনুশীলনের নিজেরই বিষয় — এখানে অগ্রগতির জন্য নির্দিষ্ট কোনো মাপকাঠি প্রয়োজন নেই।",

  // --- About page, the long blurb ---------------------------------------
  "What's actually built versus only planned — read directly from this\n     app's own feature registry, never restated by hand, so this page can't\n     drift out of sync with the real code.":
    "কী কী সত্যিই তৈরি হয়েছে আর কী কেবল পরিকল্পনায় আছে — সরাসরি অ্যাপের নিজস্ব বৈশিষ্ট্য-নথি থেকে পড়া, হাতে লেখা নয়, তাই এই পাতাটি কখনো প্রকৃত কোড থেকে আলাদা হয়ে যেতে পারে না।",
  "Phase 0 & 1 — individually tracked features":
    "পর্যায় ০ ও ১ — আলাদাভাবে চিহ্নিত বৈশিষ্ট্যসমূহ",

  // =====================================================================
  // PHASE 4 — TRACKING & FEEDBACK
  // Records, Monitor, Homework, Course Offers, the Continue strip, and the
  // shared write-failure sentences every screen in the app can show.
  // =====================================================================

  // --- Shell strings phases 1-3 missed, found by reading a real page -----
  // The "no account yet" dead end (12 pages carried their own English copy)
  // and errors.js's eight plain-language write-failure sentences, which no
  // area of the coverage report counted at all.
  "no account found yet.": "এখনো কোনো অ্যাকাউন্ট পাওয়া যায়নি।",
  "If someone invited you to join an existing madrasah, use the invite link they sent you (check your email) — don't create a new one here.":
    "কেউ যদি আপনাকে বিদ্যমান কোনো মাদরাসায় যোগ দিতে আমন্ত্রণ জানিয়ে থাকেন, তবে তাঁদের পাঠানো আমন্ত্রণ-লিংকটি ব্যবহার করুন (আপনার ইমেইল দেখুন) — এখানে নতুন করে অ্যাকাউন্ট তৈরি করবেন না।",
  "Create a new account on the onboarding page": "সূচনা পাতায় নতুন অ্যাকাউন্ট তৈরি করুন",

  "That save was blocked by a permissions rule. Nothing was lost, but it did not save — please tell the admin.":
    "অনুমতির নিয়মে সংরক্ষণটি আটকে গেছে। কিছুই হারায়নি, তবে সংরক্ষণ হয়নি — অনুগ্রহ করে প্রশাসককে জানান।",
  "Could not reach the server. This will save automatically once the connection is back.":
    "সার্ভারে পৌঁছানো যায়নি। সংযোগ ফিরে এলে এটি নিজে থেকেই সংরক্ষিত হবে।",
  "You're signed out, so that could not be saved. Please sign in again.":
    "আপনি সাইন আউট অবস্থায় আছেন, তাই এটি সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার সাইন ইন করুন।",
  "That record could not be found to update. Please refresh and try again.":
    "হালনাগাদ করার মতো রেকর্ডটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে পাতাটি রিফ্রেশ করে আবার চেষ্টা করুন।",
  "That save took too long and was stopped. Please try again.":
    "সংরক্ষণে অনেক বেশি সময় লাগায় তা থামিয়ে দেওয়া হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "That save was interrupted before it finished. Please try again.":
    "সংরক্ষণটি শেষ হওয়ার আগেই বাধাগ্রস্ত হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
  "The server is too busy right now. Please try again in a moment.":
    "সার্ভার এই মুহূর্তে অত্যন্ত ব্যস্ত। অনুগ্রহ করে একটু পরে আবার চেষ্টা করুন।",
  "You've used all the invites allowed for this account. Ask the admin to raise the limit if you need more.":
    "এই অ্যাকাউন্টের জন্য অনুমোদিত সব আমন্ত্রণ ব্যবহার হয়ে গেছে। আরও প্রয়োজন হলে প্রশাসককে সীমা বাড়াতে বলুন।",
  "That save did not go through ({code}). Please try again, and tell the admin if it keeps happening.":
    "সংরক্ষণটি সম্পন্ন হয়নি ({code})। অনুগ্রহ করে আবার চেষ্টা করুন, এবং বারবার হতে থাকলে প্রশাসককে জানান।",

  // --- Role names (js/labels.js) -----------------------------------------
  // Shown in every page's tenant picker -- "Madrasatul Muslimeen (Owner,
  // Prime)" -- and in the nav's "Previewing as" notice.
  "Owner": "মালিক", // ?
  "Prime": "প্রাইম", // ? no settled Bangla term; kept as the app's own coined role name
  "Guardian": "অভিভাবক",
  "Platform admin": "প্ল্যাটফর্ম প্রশাসক",

  // --- Unit types (unit-keys.js) ----------------------------------------
  // Ayah / Surah / Juz / Page / Ruku already have their Bangla from phase 2.
  "Range": "পরিসর",
  "Hizb": "হিযব",
  "Rub": "রুব",
  "Manzil": "মানযিল",
  "Topic": "বিষয়বস্তু", // ? distinct from "Subject" (বিষয়) on purpose

  // --- Page titles and headings -----------------------------------------
  "QuranRevival — Records": "কুরআনরিভাইভাল — রেকর্ড",
  "QuranRevival — Monitor": "কুরআনরিভাইভাল — পর্যবেক্ষণ",
  "QuranRevival — Homework": "কুরআনরিভাইভাল — বাড়ির কাজ",
  "QuranRevival — Course Offers": "কুরআনরিভাইভাল — কোর্স অফার",
  "Claim a status against a unit of study, see it confirmed or returned, and\n     confirm a whole surah, subject or week in one go.":
    "অধ্যয়নের কোনো একটি এককের বিপরীতে একটি অবস্থা দাবি করুন, তা নিশ্চিত হলো নাকি ফেরত এলো দেখুন, এবং একটি পূর্ণ সূরা, বিষয় বা সপ্তাহ একসাথে নিশ্চিত করুন।",
  "One report covering every module — whatever has actually been claimed or\n     logged. Quran gets an extra Approach-status section below, since it is\n     the only subject with structured progress data today.":
    "সব মডিউল মিলিয়ে একটি প্রতিবেদন — যা কিছু সত্যিই দাবি করা বা লিপিবদ্ধ হয়েছে। নিচে কুরআনের জন্য পদ্ধতি-ভিত্তিক একটি বাড়তি অংশ আছে, কারণ আজ কেবল এই বিষয়টিরই সুবিন্যস্ত অগ্রগতির তথ্য আছে।",
  "Assign to a person, mark with a score and comment, and keep a private\n     note about a student for yourself. A teacher must assign through a\n     class or course offer they actively teach.":
    "একজন ব্যক্তিকে কাজ দিন, নম্বর ও মন্তব্যসহ মূল্যায়ন করুন, এবং কোনো শিক্ষার্থী সম্পর্কে নিজের জন্য ব্যক্তিগত নোট রাখুন। একজন শিক্ষককে অবশ্যই তিনি সক্রিয়ভাবে পড়ান এমন কোনো ক্লাস বা কোর্স অফারের মাধ্যমে কাজ দিতে হবে।",
  "A shared schedule several people follow together: create an offer, enrol\n     people, and see who is in it.":
    "একটি যৌথ সময়সূচি যা কয়েকজন একসাথে অনুসরণ করেন: একটি অফার তৈরি করুন, লোক ভর্তি করুন, এবং কারা আছেন দেখুন।",

  // --- Records: the claim form ------------------------------------------
  "Unit type": "এককের ধরন", // ?
  "Unit": "একক", // ?
  "Reference": "সূত্র", // ?
  "Domain tags": "ক্ষেত্রের ট্যাগ", // ?
  "Domains": "ক্ষেত্রসমূহ", // ?
  "New domain tag": "নতুন ক্ষেত্রের ট্যাগ", // ?
  "+ Add": "+ যোগ করুন",
  "Notes (optional)": "নোট (ঐচ্ছিক)",
  "No domain tags yet.": "এখনো কোনো ক্ষেত্রের ট্যাগ নেই।",
  "(no Approaches for this subject yet)": "(এই বিষয়ের জন্য এখনো কোনো পদ্ধতি নেই)",
  "Add a person first.": "আগে একজন ব্যক্তি যোগ করুন।",
  "Enter a reference first.": "আগে একটি সূত্র লিখুন।",
  "Couldn't read that reference: {message}": "সূত্রটি পড়া যায়নি: {message}",
  "No Approach selected — pick a subject that has Approaches (Quran, for now).":
    "কোনো পদ্ধতি নির্বাচন করা হয়নি — এমন একটি বিষয় বেছে নিন যাতে পদ্ধতি আছে (আপাতত কুরআন)।",
  "Claimed — waiting for confirmation.": "দাবি করা হয়েছে — নিশ্চিতকরণের অপেক্ষায়।",
  "Claimed and confirmed (self-confirmed).": "দাবি করা হয়েছে এবং নিশ্চিত হয়েছে (নিজেই নিশ্চিত করেছেন)।",

  // The reference hints. The example itself is filled in by num(), so a
  // Bangla reader is shown Bengali digits -- which the box accepts back.
  "surah:ayah — e.g. {example}": "সূরা:আয়াত — যেমন {example}",
  "surah:from-to — e.g. {example}": "সূরা:শুরু-শেষ — যেমন {example}",
  "surah — e.g. {example}": "সূরা — যেমন {example}",
  "edition:page — e.g. {example}": "সংস্করণ:পৃষ্ঠা — যেমন {example}",
  "surah:ruku — e.g. {example}": "সূরা:রুকু — যেমন {example}",
  "juz — e.g. {example}": "জুয — যেমন {example}",
  "hizb — e.g. {example}": "হিযব — যেমন {example}",
  "rub — e.g. {example}": "রুব — যেমন {example}",
  "manzil — e.g. {example}": "মানযিল — যেমন {example}",
  "collection:number — e.g. {example}": "সংকলন:নম্বর — যেমন {example}",
  "topicId — e.g. {example}": "বিষয়বস্তুর আইডি — যেমন {example}",
  "number — e.g. {example}": "নম্বর — যেমন {example}",

  // --- Records: the two tables ------------------------------------------
  "Entries in this chunk": "এই খণ্ডের এন্ট্রিসমূহ", // ?
  "Chunk: {chunkKey}": "খণ্ড: {chunkKey}", // ?
  "Pending only": "শুধু অপেক্ষমাণ",
  "Bulk confirm all pending here": "এখানকার সব অপেক্ষমাণ একসাথে নিশ্চিত করুন",
  "Bulk confirm all pending this week": "এই সপ্তাহের সব অপেক্ষমাণ একসাথে নিশ্চিত করুন",
  "This week's activity": "এই সপ্তাহের কার্যকলাপ",
  "Week starting: {weekKey}": "সপ্তাহ শুরু: {weekKey}",
  "Claimed": "দাবি করা হয়েছে",
  "Practised": "অনুশীলন করা হয়েছে",
  "Confirmed": "নিশ্চিত",
  "Awaiting confirmation": "নিশ্চিতকরণের অপেক্ষায়",
  "Returned": "ফেরত পাঠানো হয়েছে",
  "State": "নিশ্চিতকরণ", // ? the column showing pending/confirmed/returned
  "Action": "কার্যক্রম", // ?
  "Actions": "কার্যক্রম", // ?
  "Confirm": "নিশ্চিত করুন",
  "Return": "ফেরত পাঠান",
  "Confirm anyway": "তবুও নিশ্চিত করুন",
  "Note for the return (optional):": "ফেরত পাঠানোর কারণ (ঐচ্ছিক):",
  "Nothing here yet.": "এখানে এখনো কিছু নেই।",
  "Nothing logged this week yet.": "এই সপ্তাহে এখনো কিছু লিপিবদ্ধ হয়নি।",
  "Confirmed {count} entry in this chunk.": "এই খণ্ডের {count}টি এন্ট্রি নিশ্চিত করা হয়েছে।",
  "Confirmed {count} entries in this chunk.": "এই খণ্ডের {count}টি এন্ট্রি নিশ্চিত করা হয়েছে।",
  "Confirmed {count} entry touched this week.": "এই সপ্তাহে ছোঁয়া {count}টি এন্ট্রি নিশ্চিত করা হয়েছে।",
  "Confirmed {count} entries touched this week.": "এই সপ্তাহে ছোঁয়া {count}টি এন্ট্রি নিশ্চিত করা হয়েছে।",

  // --- Monitor -----------------------------------------------------------
  "Student": "শিক্ষার্থী",
  "Students": "শিক্ষার্থী",
  "Whole roster (weekly/monthly report only)": "সম্পূর্ণ তালিকা (কেবল সাপ্তাহিক/মাসিক প্রতিবেদনে)",
  "Weekly / monthly report": "সাপ্তাহিক / মাসিক প্রতিবেদন",
  "Week": "সপ্তাহ",
  "Month": "মাস",
  "Week of {weekKey} — {start} to {end}": "{weekKey} তারিখের সপ্তাহ — {start} থেকে {end}",
  "📥 Download CSV": "📥 CSV ডাউনলোড করুন",
  "🖨 Print report": "🖨 প্রতিবেদন প্রিন্ট করুন",
  "Monitor report": "পর্যবেক্ষণ প্রতিবেদন",
  "Per student": "শিক্ষার্থীভিত্তিক",
  "Per subject": "বিষয়ভিত্তিক",
  "Raw entries": "মূল এন্ট্রিসমূহ",
  "Entries": "এন্ট্রি", // ?
  "Days active": "সক্রিয় দিন",
  "By subject": "বিষয় অনুযায়ী",
  "Distinct units": "স্বতন্ত্র একক",
  "No students in scope.": "পরিধির মধ্যে কোনো শিক্ষার্থী নেই।",
  "Nothing logged in this range.": "এই সময়সীমায় কিছু লিপিবদ্ধ হয়নি।",
  "Pick a student first.": "আগে একজন শিক্ষার্থী বেছে নিন।",
  "Couldn't load the report:": "প্রতিবেদন লোড করা যায়নি:",
  "Couldn't load the breakdown:": "বিশ্লেষণ লোড করা যায়নি:",
  "Quran Approach breakdown —": "কুরআন পদ্ধতির বিশ্লেষণ —",
  "Current claimed status per Approach, across every ayah/juz/page this student has ever touched — not scoped to the week/month above (this is a status snapshot, not an activity log).":
    "এই শিক্ষার্থী আজ পর্যন্ত যত আয়াত/জুয/পৃষ্ঠা ছুঁয়েছেন, তার সবটিতে প্রতিটি পদ্ধতির বর্তমান দাবিকৃত অবস্থা — উপরের সপ্তাহ/মাসের সীমায় আবদ্ধ নয় (এটি অবস্থার একটি চিত্র, কার্যকলাপের তালিকা নয়)।",
  "Section": "বিভাগ",
  "Achieved+": "অর্জিত+",
  "{count} ({percent}%) of {total}": "{total}-এর মধ্যে {count} ({percent}%)",
  "{count} of {total}": "{total}-এর মধ্যে {count}",
  "No Quran Approaches set up for this tenant yet.": "এই প্রতিষ্ঠানের জন্য এখনো কোনো কুরআন পদ্ধতি নির্ধারণ করা হয়নি।",
  "Print pop-up blocked. Allow pop-ups for this site, then try again.":
    "প্রিন্ট পপ-আপ আটকে দেওয়া হয়েছে। এই সাইটের জন্য পপ-আপ চালু করে আবার চেষ্টা করুন।",

  // --- Homework ----------------------------------------------------------
  "New assignment": "নতুন নির্ধারিত কাজ", // ?
  "Create assignment": "কাজ তৈরি করুন",
  "Assignments for {name}": "{name}-এর কাজসমূহ",
  "Assignments": "কাজসমূহ",
  "Class / Course Offer": "ক্লাস / কোর্স অফার",
  "Class": "ক্লাস",
  "Course Offer": "কোর্স অফার",
  "Assign to": "যাকে দেওয়া হবে",
  "Subject (optional)": "বিষয় (ঐচ্ছিক)",
  "(none)": "(কিছু নয়)",
  "(none — any visible person)": "(কিছু নয় — দৃশ্যমান যেকোনো ব্যক্তি)",
  "Due date (optional)": "জমা দেওয়ার তারিখ (ঐচ্ছিক)",
  "Max score (optional)": "সর্বোচ্চ নম্বর (ঐচ্ছিক)",
  "Instructions": "নির্দেশনা",
  "(no instructions)": "(কোনো নির্দেশনা নেই)",
  "Subject:": "বিষয়:",
  "Due:": "জমার তারিখ:",
  "Max score:": "সর্বোচ্চ নম্বর:",
  "Score": "নম্বর",
  "Score:": "নম্বর:",
  "Save score": "নম্বর সংরক্ষণ করুন",
  "Comment (optional)": "মন্তব্য (ঐচ্ছিক)",
  "Optional note": "ঐচ্ছিক নোট",
  "Mark as submitted": "জমা দেওয়া হয়েছে চিহ্নিত করুন",
  "Not submitted": "জমা দেওয়া হয়নি",
  "Submitted": "জমা দেওয়া হয়েছে",
  "Marked": "মূল্যায়ন করা হয়েছে",
  "No assignments yet.": "এখনো কোনো কাজ নেই।",
  "Couldn't load assignments:": "কাজগুলো লোড করা যায়নি:",
  "No students in this context yet.": "এই প্রসঙ্গে এখনো কোনো শিক্ষার্থী নেই।",
  "Pick at least one student.": "অন্তত একজন শিক্ষার্থী বেছে নিন।",
  "Enter instructions first.": "আগে নির্দেশনা লিখুন।",
  "Pick a class or course offer first — required for a teacher-created assignment.":
    "আগে একটি ক্লাস বা কোর্স অফার বেছে নিন — শিক্ষকের দেওয়া কাজের জন্য এটি আবশ্যক।",
  "Required — pick the class/course offer you're assigning this through.":
    "আবশ্যক — যে ক্লাস/কোর্স অফারের মাধ্যমে এটি দিচ্ছেন তা বেছে নিন।",
  "You have no active class/course offer to assign homework through yet — ask an admin to enrol you as a teacher first.":
    "বাড়ির কাজ দেওয়ার মতো সক্রিয় কোনো ক্লাস/কোর্স অফার এখনো আপনার নেই — প্রশাসককে বলুন আগে আপনাকে শিক্ষক হিসেবে যুক্ত করতে।",
  "Assigned to {count} student.": "{count} জন শিক্ষার্থীকে দেওয়া হয়েছে।",
  "Assigned to {count} students.": "{count} জন শিক্ষার্থীকে দেওয়া হয়েছে।",
  "My private teaching notes": "আমার ব্যক্তিগত শিক্ষণ-নোট",
  "Only you can ever see these — never shown to the student, guardian, or anyone else.":
    "এগুলো কেবল আপনিই দেখতে পাবেন — শিক্ষার্থী, অভিভাবক বা অন্য কাউকে কখনোই দেখানো হয় না।",
  "New note": "নতুন নোট",
  // "About" alone is the nav's own About PAGE (পরিচিতি). Here it labels
  // "about WHICH student", so it carries a context suffix -- the first real
  // use of the mechanism i18n.js reserved for exactly this collision.
  "About|person": "কার সম্পর্কে",
  "Note": "নোট",
  "Save note": "নোট সংরক্ষণ করুন",
  "No notes yet.": "এখনো কোনো নোট নেই।",
  "Couldn't load notes:": "নোটগুলো লোড করা যায়নি:",
  "Write a note first.": "আগে একটি নোট লিখুন।",

  // --- Course offers -----------------------------------------------------
  "New course offer": "নতুন কোর্স অফার",
  "Subjects (optional)": "বিষয়সমূহ (ঐচ্ছিক)",
  "Runs on": "যেসব দিনে চলে",
  "Start date (optional)": "শুরুর তারিখ (ঐচ্ছিক)",
  "End date (optional)": "শেষের তারিখ (ঐচ্ছিক)",
  "Create offer": "অফার তৈরি করুন",
  "Course offers": "কোর্স অফারসমূহ",
  "Enrolments": "ভর্তিসমূহ",
  "{name}'s enrolments": "{name}-এর ভর্তিসমূহ",
  "Enrol {name}": "{name}-কে ভর্তি করুন",
  "End": "শেষ করুন",
  "Active": "সক্রিয়",
  "Ended": "শেষ হয়েছে",
  "Archived": "সংরক্ষণাগারে",
  "Teacher": "শিক্ষক",
  "No schedule set": "কোনো সময়সূচি নির্ধারিত নেই",
  "(no subjects set)": "(কোনো বিষয় নির্ধারিত নেই)",
  "No one enrolled yet.": "এখনো কেউ ভর্তি হয়নি।",
  "No course offers yet.": "এখনো কোনো কোর্স অফার নেই।",
  "Not enrolled in anything yet.": "এখনো কোথাও ভর্তি হননি।",
  "No subjects yet.": "এখনো কোনো বিষয় নেই।",
  "Enter a name first.": "আগে একটি নাম লিখুন।",
  "Course offer created.": "কোর্স অফার তৈরি হয়েছে।",
  "Pick a person first.": "আগে একজন ব্যক্তি বেছে নিন।",
  "Couldn't load course offers:": "কোর্স অফারগুলো লোড করা যায়নি:",
  "Couldn't load enrolments:": "ভর্তির তথ্য লোড করা যায়নি:",

  // Short day names, as a weekday checkbox row shows them.
  "Sun": "রবি",
  "Mon": "সোম",
  "Tue": "মঙ্গল",
  "Wed": "বুধ",
  "Thu": "বৃহঃ",
  "Fri": "শুক্র",
  "Sat": "শনি",

  // --- Continue strip (every study page) ---------------------------------
  "Continue: {what}": "চালিয়ে যান: {what}",

  // --- Deliberately NOT translated, mapped to itself so the report counts
  //     it as decided rather than forgotten (same treatment phase 1 gave
  //     the app's own name and the Ta'awwudh transliteration).
  //     Every language picker names Bangla in Bangla, in every language --
  //     it is how a Bangla-only reader finds the setting at all.
  "বাংলা (Bangla)": "বাংলা (Bangla)",

  // =====================================================================
  // PHASE 5 — ADMIN
  // People, Catalogue, Curriculum, Classes: the screens that let someone
  // RUN a madrasah in Bangla, not only study in one.
  // =====================================================================

  // --- Entity status (js/labels.js), shared by everything archivable ----
  // Active / Archived / Ended already have their Bangla from phase 4.
  "Pending": "অপেক্ষমাণ",
  "Planned": "পরিকল্পিত",
  "Accepted": "গৃহীত",
  "Revoked": "বাতিল করা হয়েছে",
  "Draft": "খসড়া",

  // --- Page titles, headings and intros ---------------------------------
  "QuranRevival — People": "কুরআনরিভাইভাল — ব্যক্তিবর্গ",
  "QuranRevival — Catalogue": "কুরআনরিভাইভাল — তালিকা",
  "QuranRevival — Curriculum": "কুরআনরিভাইভাল — পাঠ্যক্রম",
  "QuranRevival — Classes": "কুরআনরিভাইভাল — ক্লাস",
  "Everyone in this madrasah: add a person, invite someone who signs in\n     themselves, and see who looks after whom.":
    "এই মাদরাসার সবাই: একজন ব্যক্তি যোগ করুন, কাউকে আমন্ত্রণ জানান যিনি নিজেই সাইন ইন করবেন, এবং কে কার দেখাশোনা করেন তা দেখুন।",
  "Modules, the subject tree, the 30 Approaches, and ladders and levels —\n     the data every study screen reads from. Anyone in the madrasah can look;\n     only the owner and a prime can edit.":
    "মডিউল, বিষয়ের তালিকা, ৩০টি পদ্ধতি এবং ধাপ ও স্তর — প্রতিটি অধ্যয়ন পর্দা যে তথ্য থেকে পড়ে। মাদরাসার যে কেউ দেখতে পারেন; কেবল মালিক ও প্রাইম সম্পাদনা করতে পারেন।",
  "A curriculum unit is WHAT to study, and it can span several subjects.\n     The plan below is WHEN — which term and week it falls in, for a class or\n     for one person. The two are kept apart, so moving a unit to a different\n     week never changes the unit itself. Resources and grades are managed\n     here too.":
    "পাঠ্যক্রমের একক হলো কী পড়তে হবে, এবং তা একাধিক বিষয়জুড়ে হতে পারে। নিচের পরিকল্পনা হলো কখন — কোন টার্ম ও সপ্তাহে, কোনো ক্লাসের বা একজন ব্যক্তির জন্য। দুটি আলাদা রাখা হয়েছে, তাই কোনো একককে অন্য সপ্তাহে সরালে এককটি নিজে বদলায় না। উপকরণ ও গ্রেডও এখান থেকেই পরিচালিত হয়।",
  "Create a class, then enrol students and teachers into it. A teacher\n     enrolled here can record and confirm progress for this class's students\n     — and only them. Class-wide bulk confirm clears every pending entry for\n     every actively-enrolled student in one go.":
    "একটি ক্লাস তৈরি করুন, তারপর তাতে শিক্ষার্থী ও শিক্ষক ভর্তি করুন। এখানে ভর্তি হওয়া একজন শিক্ষক এই ক্লাসের শিক্ষার্থীদের — এবং কেবল তাদেরই — অগ্রগতি লিপিবদ্ধ ও নিশ্চিত করতে পারেন। ক্লাস-ব্যাপী একসাথে নিশ্চিতকরণ সক্রিয়ভাবে ভর্তি থাকা প্রতিটি শিক্ষার্থীর সব অপেক্ষমাণ এন্ট্রি একবারে সম্পন্ন করে।",

  // --- People ------------------------------------------------------------
  "Roles": "ভূমিকা",
  "Role": "ভূমিকা",
  "Managed by": "যিনি দেখাশোনা করেন",
  "View as": "যেভাবে দেখছেন",
  "(your real role)": "(আপনার প্রকৃত ভূমিকা)",
  "Add a person": "একজন ব্যক্তি যোগ করুন",
  "Add person": "ব্যক্তি যোগ করুন",
  "This is a child (no login of their own)": "ইনি একজন শিশু (নিজের কোনো লগইন নেই)",
  "Added. Person ID: {personId}": "যোগ করা হয়েছে। ব্যক্তি আইডি: {personId}",
  "Invite someone (they sign in themselves)": "কাউকে আমন্ত্রণ জানান (তিনি নিজেই সাইন ইন করবেন)",
  "Their email": "তাঁর ইমেইল",
  "Email": "ইমেইল",
  "Invite": "আমন্ত্রণ জানান",
  "Invite created — use \"Copy link\" below to get the link.":
    "আমন্ত্রণ তৈরি হয়েছে — নিচের \"লিংক কপি করুন\" থেকে লিংকটি নিন।",
  "Link": "লিংক",
  "Copy link": "লিংক কপি করুন",
  "Copied!": "কপি হয়েছে!",
  "Link not found": "লিংক পাওয়া যায়নি",
  "Hand the device to a child": "ডিভাইসটি কোনো শিশুর হাতে দিন",
  "For leaving a child to study on their own on a shared device: pick\n        the child, and the device stays theirs until you end the session.\n        Recording progress for several people yourself, one after another,\n        is not affected — that never needs a session at all.":
    "একটি ভাগ করা ডিভাইসে কোনো শিশুকে একা পড়তে দেওয়ার জন্য: শিশুটিকে বেছে নিন, আপনি সেশন শেষ না করা পর্যন্ত ডিভাইসটি তারই থাকবে। আপনি নিজে একের পর এক কয়েকজনের অগ্রগতি লিপিবদ্ধ করলে তাতে কোনো প্রভাব পড়ে না — তার জন্য কখনোই কোনো সেশন লাগে না।",
  "Child": "শিশু",
  "Start studying": "পড়া শুরু করুন",
  "End session": "সেশন শেষ করুন",
  "This device is studying as {name}. It stays with them until you end the session.":
    "এই ডিভাইসটি এখন {name}-এর জন্য ব্যবহৃত হচ্ছে। আপনি সেশন শেষ না করা পর্যন্ত এটি তারই থাকবে।",
  "No child in the roster yet — add one above first.":
    "তালিকায় এখনো কোনো শিশু নেই — আগে উপরে একজন যোগ করুন।",
  "A study session is in progress for another person. End that session first before switching.":
    "অন্য একজনের জন্য একটি অধ্যয়ন সেশন চলছে। বদলানোর আগে সেই সেশনটি শেষ করুন।",

  // --- Catalogue: modules, subject tree, Approaches ---------------------
  "Module": "মডিউল",
  "Renderer": "যেভাবে দেখানো হয়", // ?
  "Move": "সরান",
  "Move up": "উপরে সরান",
  "Move down": "নিচে সরান",
  "Move to…": "যেখানে সরাবেন…",
  "Move to a different parent": "অন্য কোনো মূল বিষয়ের নিচে সরান",
  "Move here": "এখানে সরান",
  "Expand": "খুলুন",
  "Collapse": "গুটিয়ে নিন",
  "Click to jump to this module's subjects below": "নিচে এই মডিউলের বিষয়গুলোতে যেতে ক্লিক করুন",
  // The four study-screen renderers a module can use.
  "Ayah by ayah": "আয়াতভিত্তিক",
  "Routine": "রুটিন",
  "Subject tree": "বিষয়ের তালিকা",
  "Show archived subjects": "সংরক্ষণাগারে রাখা বিষয় দেখান",
  "Show archived Approaches": "সংরক্ষণাগারে রাখা পদ্ধতি দেখান",
  "Show archived ladders/levels": "সংরক্ষণাগারে রাখা ধাপ/স্তর দেখান",
  "Gloss": "সংক্ষিপ্ত পরিচয়", // ?
  "Gloss (optional)": "সংক্ষিপ্ত পরিচয় (ঐচ্ছিক)", // ?
  "Level (parent)": "স্তর (মূল বিষয়)",
  "Parent": "মূল বিষয়",
  "(top level)": "(সর্বোচ্চ স্তর)",
  "no module": "কোনো মডিউল নেই",
  "Confirmation": "নিশ্চিতকরণ",
  "Always required": "সর্বদা আবশ্যক",
  "Never required": "কখনো আবশ্যক নয়",
  "Auto (computed)": "স্বয়ংক্রিয় (নিজে থেকে নির্ধারিত)",
  "Resource": "উপকরণ",
  "Resources": "উপকরণসমূহ",
  "Yes": "হ্যাঁ",
  "archived": "সংরক্ষণাগারে",
  "Restore": "ফিরিয়ে আনুন",
  "Archive \"{name}\"?": "\"{name}\" সংরক্ষণাগারে রাখবেন?",
  "Restore \"{name}\"?": "\"{name}\" ফিরিয়ে আনবেন?",
  "It has {count} item(s) underneath it — they stay active, just nested under an archived subject.":
    "এর নিচে {count}টি বিষয় আছে — সেগুলো সক্রিয়ই থাকবে, কেবল একটি সংরক্ষণাগারে রাখা বিষয়ের নিচে থাকবে।",
  "Name can't be empty.": "নাম খালি রাখা যাবে না।",
  "Add a tenant-specific subject": "এই প্রতিষ্ঠানের নিজস্ব একটি বিষয় যোগ করুন",
  "Add subject": "বিষয় যোগ করুন",
  "Resource (optional — leave blank to add later, once you have the content ready)":
    "উপকরণ (ঐচ্ছিক — পরে যোগ করতে চাইলে খালি রাখুন, যখন বিষয়বস্তু প্রস্তুত হবে)",
  "No resource yet": "এখনো কোনো উপকরণ নেই",
  "Link (URL)": "লিংক (ইউআরএল)",
  "Text (typed in directly)": "লেখা (সরাসরি টাইপ করা)",
  "What this topic actually covers…": "এই বিষয়ে আসলে কী কী আছে…",
  "The 30 Approaches": "৩০টি পদ্ধতি",
  "Guide": "নির্দেশিকা",
  "What:": "কী:",
  "How:": "কীভাবে:",
  "Measure:": "মাপকাঠি:",
  "Section {n}": "বিভাগ {n}",
  "New name for this Approach:": "এই পদ্ধতির নতুন নাম:",
  "Checking catalogue…": "তালিকা যাচাই করা হচ্ছে…",
  "Catalogue set up: {subjects} subjects and {approaches} Approaches.":
    "তালিকা তৈরি হয়েছে: {subjects}টি বিষয় ও {approaches}টি পদ্ধতি।",
  "Catalogue is already set up.": "তালিকা আগে থেকেই তৈরি আছে।",
  "Could not set up the catalogue:": "তালিকা তৈরি করা যায়নি:",
  "You're viewing as a role that cannot edit the catalogue (owner/prime\n      only). Everything above is read-only for you.":
    "আপনি এমন একটি ভূমিকায় দেখছেন যা তালিকা সম্পাদনা করতে পারে না (কেবল মালিক/প্রাইম পারেন)। উপরের সবকিছু আপনার জন্য কেবল পড়ার যোগ্য।",

  // --- Catalogue: ladders and levels ------------------------------------
  "Ladders & levels": "ধাপ ও স্তর", // ?
  "Ladder": "ধাপ", // ?
  "Ladder (optional)": "ধাপ (ঐচ্ছিক)", // ?
  "Level": "স্তর",
  "Levels": "স্তরসমূহ",
  "Level (optional)": "স্তর (ঐচ্ছিক)",
  "Level name": "স্তরের নাম",
  "Add a ladder": "একটি ধাপ যোগ করুন",
  "Add ladder": "ধাপ যোগ করুন",
  "Add a level to": "যেখানে স্তর যোগ করবেন",
  "Add level": "স্তর যোগ করুন",
  "Ladder added.": "ধাপ যোগ করা হয়েছে।",
  "Level added.": "স্তর যোগ করা হয়েছে।",
  "Add a ladder first, then name the level.": "আগে একটি ধাপ যোগ করুন, তারপর স্তরের নাম দিন।",
  "Archive this ladder?": "এই ধাপটি সংরক্ষণাগারে রাখবেন?",
  "Restore this ladder?": "এই ধাপটি ফিরিয়ে আনবেন?",
  "Archive this level?": "এই স্তরটি সংরক্ষণাগারে রাখবেন?",
  "Restore this level?": "এই স্তরটি ফিরিয়ে আনবেন?",
  "No ladders yet.": "এখনো কোনো ধাপ নেই।",
  "(no levels yet)": "(এখনো কোনো স্তর নেই)",
  "e.g. General Grades": "যেমন সাধারণ গ্রেড",
  "e.g. Year 1": "যেমন ১ম বর্ষ",

  // --- Classes -----------------------------------------------------------
  "New class": "নতুন ক্লাস",
  "Enrol": "ভর্তি করুন",
  "Create class": "ক্লাস তৈরি করুন",
  "Class created.": "ক্লাস তৈরি হয়েছে।",
  "Couldn't load classes:": "ক্লাসগুলো লোড করা যায়নি:",
  "No classes yet.": "এখনো কোনো ক্লাস নেই।",
  "No classes yet": "এখনো কোনো ক্লাস নেই",
  "Bulk confirm all pending for this class": "এই ক্লাসের সব অপেক্ষমাণ একসাথে নিশ্চিত করুন",
  "Confirmed {count} pending entry across {students} students.":
    "{students} জন শিক্ষার্থীর {count}টি অপেক্ষমাণ এন্ট্রি নিশ্চিত করা হয়েছে।",
  "Confirmed {count} pending entries across {students} students.":
    "{students} জন শিক্ষার্থীর {count}টি অপেক্ষমাণ এন্ট্রি নিশ্চিত করা হয়েছে।",

  // --- Curriculum: units, plan, resources, grades -----------------------
  "Curriculum units": "পাঠ্যক্রমের এককসমূহ",
  "Curriculum unit": "পাঠ্যক্রমের একক",
  "Curriculum plan": "পাঠ্যক্রমের পরিকল্পনা",
  "New unit": "নতুন একক",
  "Create unit": "একক তৈরি করুন",
  "Unit created.": "একক তৈরি হয়েছে।",
  "Archive unit": "একক সংরক্ষণাগারে রাখুন",
  "Order": "ক্রম",
  "Subjects (cross-subject — pick as many as apply)":
    "বিষয়সমূহ (একাধিক বিষয়জুড়ে — যতগুলো প্রযোজ্য বেছে নিন)",
  "(no subjects)": "(কোনো বিষয় নেই)",
  "No curriculum units yet.": "এখনো কোনো পাঠ্যক্রমের একক নেই।",
  "Couldn't load curriculum units:": "পাঠ্যক্রমের এককগুলো লোড করা যায়নি:",
  "No units yet": "এখনো কোনো একক নেই",
  "Attach existing resource": "বিদ্যমান উপকরণ যুক্ত করুন",
  "4 terms × 10 weeks. Pick who the plan is for — a\n         class, or one person on their own — then place a unit into a term\n         and week.":
    "৪টি টার্ম × ১০টি সপ্তাহ। পরিকল্পনাটি কার জন্য তা বেছে নিন — একটি ক্লাস, নাকি একা একজন ব্যক্তি — তারপর একটি একককে কোনো টার্ম ও সপ্তাহে বসান।",
  "Context": "যার জন্য", // ?
  "Which one": "কোনটি",
  "Term": "টার্ম", // ?
  "Term {n}": "টার্ম {n}", // ?
  "Week {n}": "সপ্তাহ {n}",
  "Add unit to plan": "পরিকল্পনায় একক যোগ করুন",
  "Pick a context and a unit first.": "আগে কার জন্য এবং কোন একক তা বেছে নিন।",
  "Pick a context above.": "উপরে কার জন্য তা বেছে নিন।",
  "No context to plan for yet.": "পরিকল্পনা করার মতো এখনো কিছু নেই।",
  "Nothing planned yet.": "এখনো কিছু পরিকল্পনা করা হয়নি।",
  "Couldn't load the plan:": "পরিকল্পনা লোড করা যায়নি:",
  "Remove": "সরিয়ে ফেলুন",
  "Added.": "যোগ করা হয়েছে।",
  "New resource": "নতুন উপকরণ",
  "Create resource": "উপকরণ তৈরি করুন",
  "Resource created.": "উপকরণ তৈরি হয়েছে।",
  "Type": "ধরন",
  "Text": "লেখা",
  "URL": "ইউআরএল",
  "Enter a URL first.": "আগে একটি ইউআরএল লিখুন।",
  "Enter some text first.": "আগে কিছু লেখা লিখুন।",
  "No resources yet.": "এখনো কোনো উপকরণ নেই।",
  "Couldn't load resources:": "উপকরণগুলো লোড করা যায়নি:",
  "added by {name}": "যোগ করেছেন {name}",
  "Links and text, written ahead of time and attached to\n         a curriculum unit above, or to a subject from the Catalogue page.":
    "লিংক ও লেখা, আগেভাগে তৈরি করে উপরের কোনো পাঠ্যক্রমের এককের সাথে, অথবা তালিকা পাতা থেকে কোনো বিষয়ের সাথে যুক্ত করা।",
  "Grades": "গ্রেড",
  "A person's level on a ladder, over time. Correcting a\n         mistake never edits an old entry — it adds a new dated one, the same\n         way every other confirmed record in this app works.":
    "সময়ের সাথে কোনো ধাপে একজন ব্যক্তির স্তর। ভুল সংশোধন করতে পুরোনো কোনো এন্ট্রি বদলানো হয় না — নতুন তারিখসহ একটি এন্ট্রি যোগ হয়, এই অ্যাপের অন্য প্রতিটি নিশ্চিত রেকর্ড যেভাবে কাজ করে ঠিক সেভাবেই।",
  "Assign a level": "একটি স্তর নির্ধারণ করুন",
  "Assign": "নির্ধারণ করুন",
  "Assigned.": "নির্ধারণ করা হয়েছে।",
  "From date": "যে তারিখ থেকে",
  "Current": "বর্তমান",
  "History": "ইতিহাস",
  "not assigned": "নির্ধারণ করা হয়নি",
  "from {from} to {to}": "{from} থেকে {to} পর্যন্ত",
  "from {from} (current)": "{from} থেকে (বর্তমান)",
  "No level history yet.": "স্তরের এখনো কোনো ইতিহাস নেই।",
  "No levels yet": "এখনো কোনো স্তর নেই",
  "No ladders yet — create one on the Catalogue page":
    "এখনো কোনো ধাপ নেই — তালিকা পাতা থেকে একটি তৈরি করুন",
  "Pick a person above.": "উপরে একজন ব্যক্তি বেছে নিন।",
  "Pick a person, ladder and level first.": "আগে একজন ব্যক্তি, একটি ধাপ ও একটি স্তর বেছে নিন।",
  "Couldn't load grades:": "গ্রেড লোড করা যায়নি:",
  "Curriculum, resources and grades are written by the owner or a prime — you can browse ladders and levels on the Catalogue page, but this page has nothing to show you yet.":
    "পাঠ্যক্রম, উপকরণ ও গ্রেড লেখেন মালিক বা প্রাইম — আপনি তালিকা পাতায় ধাপ ও স্তর দেখতে পারেন, তবে এই পাতায় আপনার জন্য এখনো কিছু নেই।",

  // -------------------------------------------------------------------
  // Phase 6 of 6 — ASMA UL HUSNA (14 Aug 2026). The last phase.
  // -------------------------------------------------------------------
  // Three groups below: the 99 MEANINGS, the screensaver's POSTER
  // CAPTIONS, and the handful of words the Asma screens say themselves.
  //
  // The Names in Bangla script (আর-রহমান) are NOT here -- they are data
  // indexed by number, so they live in js/i18n/asma-names-bn.js, the same
  // way the 114 surah names do. Read that file's header first; it carries
  // the owner's decision about which Bangla renderings these follow.
  //
  // Owner's decision, 14 Aug 2026: base the meanings on the standard
  // Bangladeshi wording -- the Islamic Foundation Bangladesh Bangla
  // Qur'an and the 99-Names lists that circulate from IFB and As-Sunnah
  // Foundation -- rather than translating this app's own English glosses
  // afresh. The owner intends to supply their own prepared list later.
  // Replacing these is a single edit here, one line per Name.

  // --- The 99 meanings (js/asma-data.js) ---
  "The Most Merciful": "পরম করুণাময়",
  "The Most Compassionate": "অতি দয়ালু",
  "The King, The Sovereign": "বাদশাহ, সর্বময় অধিপতি",
  "The Holy, The Pure": "মহাপবিত্র, নিষ্কলুষ",
  "The Source of Peace": "শান্তির উৎস",
  "The Granter of Security": "নিরাপত্তাদানকারী",
  "The Controller, The Guardian": "নিয়ন্ত্রক, রক্ষণাবেক্ষণকারী",
  "The Almighty, The Exalted in Might": "মহাপরাক্রমশালী, ক্ষমতায় সুউচ্চ",
  "The Compeller, The Omnipotent": "দুর্দমনীয়, প্রবল প্রতাপশালী",
  "The Supreme, The Majestic": "সর্বশ্রেষ্ঠ, মহিমান্বিত",
  "The Creator": "স্রষ্টা",
  "The Evolver, The Originator": "সৃজনকর্তা, উদ্ভাবক",
  "The Fashioner, The Designer": "রূপদাতা, আকৃতিদানকারী",
  "The Repeatedly Forgiving": "বারবার ক্ষমাকারী",
  "The Subduer, The Dominant": "দমনকারী, প্রবল আধিপত্যশীল",
  "The Bestower": "মহাদাতা",
  "The Provider": "রিযিকদাতা",
  "The Opener, The Judge": "উন্মুক্তকারী, ফয়সালাকারী",
  "The All-Knowing": "সর্বজ্ঞ",
  "The Restrainer, The Constrictor": "সংকোচনকারী, সংযমকারী",
  "The Extender, The Expander": "সম্প্রসারণকারী, প্রাচুর্যদানকারী",
  "The Abaser": "অবনতকারী",
  "The Exalter": "উন্নতকারী",
  "The Giver of Honour": "সম্মানদাতা",
  "The Giver of Dishonour": "লাঞ্ছনাদাতা",
  "The All-Hearing": "সর্বশ্রোতা",
  "The All-Seeing": "সর্বদ্রষ্টা",
  "The Judge, The Arbitrator": "বিচারক, মীমাংসাকারী",
  "The Just": "ন্যায়পরায়ণ",
  "The Subtle, The Gentle": "সূক্ষ্মদর্শী, কোমল",
  "The All-Aware": "সর্ববিষয়ে অবহিত",
  "The Forbearing": "অত্যন্ত সহনশীল",
  "The Magnificent, The Great": "মহিমাময়, মহান",
  "The All-Forgiving": "পরম ক্ষমাশীল",
  "The Grateful, The Appreciative": "গুণগ্রাহী, কৃতজ্ঞতার প্রতিদানদাতা",
  "The Most High": "সমুন্নত",
  "The Greatest": "সর্বাপেক্ষা মহান",
  "The Preserver, The Guardian": "সংরক্ষণকারী, হেফাযতকারী",
  "The Sustainer, The Nourisher": "শক্তি ও আহার দানকারী",
  "The Reckoner": "হিসাবগ্রহণকারী",
  "The Majestic": "মহামহিম",
  "The Generous, The Noble": "অতিদানশীল, মহানুভব",
  "The Watchful": "সতর্ক পর্যবেক্ষক",
  "The Responsive": "দোয়া কবুলকারী",
  "The All-Encompassing": "সর্বব্যাপী",
  "The Wise": "প্রজ্ঞাময়",
  "The Loving": "প্রেমময়",
  "The All-Glorious": "মহাগৌরবময়",
  "The Resurrector": "পুনরুত্থানকারী",
  "The Witness": "সর্বদর্শী সাক্ষী",
  "The Truth": "পরম সত্য",
  "The Trustee": "কর্মবিধায়ক",
  "The Strong": "মহাশক্তিধর",
  "The Firm, The Steadfast": "সুদৃঢ়, অটল",
  "The Protecting Friend": "অভিভাবক ও বন্ধু",
  "The Praiseworthy": "প্রশংসিত",
  "The Reckoner, The Accounter": "সবকিছুর গণনাকারী",
  "The Originator": "সূচনাকারী",
  "The Restorer": "পুনঃসৃষ্টিকারী",
  "The Giver of Life": "জীবনদাতা",
  "The Bringer of Death": "মৃত্যুদাতা",
  "The Ever-Living": "চিরঞ্জীব",
  "The Self-Subsisting": "স্বনির্ভর, সর্বসত্তার ধারক",
  "The Perceiver, The Finder": "অভাবমুক্ত, সবকিছুর সন্ধানদাতা",
  "The Illustrious, The Noble": "গৌরবময়, সম্মানিত",
  "The One, The Unique": "এক, অদ্বিতীয়",
  "The One, The Indivisible": "একক, অবিভাজ্য",
  "The Eternal, The Self-Sufficient": "চিরন্তন, অমুখাপেক্ষী",
  "The All-Powerful, The Able": "সর্বশক্তিমান, সক্ষম",
  "The Powerful, The Dominant": "পরাক্রমশালী নিয়ন্তা",
  "The Expediter": "অগ্রবর্তীকারী",
  "The Delayer": "পশ্চাদবর্তীকারী",
  "The First": "অনাদি, সর্বপ্রথম",
  "The Last": "অনন্ত, সর্বশেষ",
  "The Manifest, The Evident": "প্রকাশ্য, সুস্পষ্ট",
  "The Hidden": "অন্তর্নিহিত",
  "The Governor, The Patron": "কার্যনির্বাহক অভিভাবক",
  "The Most Exalted": "সর্বোচ্চ মহান",
  "The Source of Goodness": "কল্যাণের উৎস",
  "The Ever-Relenting, Acceptor of Repentance": "বারবার ক্ষমাশীল, তওবা কবুলকারী",
  "The Avenger": "প্রতিশোধ গ্রহণকারী",
  "The Pardoner": "মার্জনাকারী",
  "The Compassionate": "পরম স্নেহশীল",
  "The Owner of All Sovereignty": "সমস্ত রাজত্বের মালিক",
  "Lord of Majesty and Generosity": "মহিমা ও অনুগ্রহের অধিকারী",
  "The Equitable": "ইনসাফকারী",
  "The Gatherer": "একত্রকারী",
  "The Self-Sufficient, The Rich": "অমুখাপেক্ষী, স্বয়ংসম্পূর্ণ",
  "The Enricher": "অভাবমোচনকারী",
  "The Preventer": "প্রতিরোধকারী",
  // ?  The single most sensitive line in this file. Written as an ability
  //    held within His wisdom, never as an attribute of doing harm.
  "The One who allows harm, within His wisdom": "যিনি তাঁর প্রজ্ঞা অনুযায়ী ক্ষতি হতে দেন",
  "The Benefactor": "কল্যাণদাতা",
  "The Light": "জ্যোতি",
  "The Guide": "পথপ্রদর্শক",
  "The Incomparable, The Originator": "অতুলনীয় স্রষ্টা",
  "The Everlasting": "চিরস্থায়ী",
  "The Inheritor": "সর্বস্বের উত্তরাধিকারী",
  "The Guide to the Right Path": "সঠিক পথের দিশারী",
  "The Patient, The Timeless": "অত্যন্ত ধৈর্যশীল",

  // --- The screensaver's poster captions (js/asma-posters.js) ---
  // A WIDER, older list than the 99 above, and on a different
  // transliteration convention -- these captions come from the poster
  // filenames, so "Al-Aleem", "Al-Aalim" and "Al-Aliyyu" are three
  // separate posters where asma-data.js has two Names. Owner's decision,
  // 14 Aug 2026: caption them in Bangla where the Name is recognisable.
  // Several here (Ar-Rabb, Al-Ilaah, As-Sayyid, Al-Witr, Al-Khallaq) are
  // NOT in the 99 at all -- that is deliberate, see asma-posters.js.
  "Al-A'laa": "আল-আ'লা",
  "Al-Aleem": "আল-আলীম",
  "Al-Aalim": "আল-আলিম",
  "Al-Afuww": "আল-আফুউ",
  "Al-Ahad": "আল-আহাদ",
  "Al-Akheer": "আল-আখির",
  "Al-Akram": "আল-আকরাম",
  "Al-Aliyyu": "আল-আলিইয়্যু",
  "Allah-The Proper Name": "আল্লাহ — মহান সত্তার নাম",
  "Al-Awwal": "আল-আউয়াল",
  "Al-Azeem": "আল-আযীম",
  "Al-Azeez": "আল-আযীয",
  "Al-Baari": "আল-বারী",
  "Al-Baasit": "আল-বাসিত",
  "Al-Baatin": "আল-বাতিন",
  "Al-Barr": "আল-বার্‌র",
  "Al-Baseer": "আল-বাসীর",
  "Adh-Dhaahir": "আয-যাহির",
  "Al-Fattah": "আল-ফাত্তাহ",
  "Al-Ganiyyu": "আল-গানিইয়্যু",
  "Al-Ghaffaar": "আল-গাফ্‌ফার",
  "Al-Ghafoor": "আল-গাফূর",
  "Al-Hafeedh": "আল-হাফীয",
  "Al-Hafiyy": "আল-হাফিইয়্যু",
  "Al-Hakam": "আল-হাকাম",
  "Al-Hakeem": "আল-হাকীম",
  "Al-Hameed": "আল-হামীদ",
  "Al-Haqq": "আল-হাক্ক",
  "Al-Haseeb": "আল-হাসীব",
  "Al-Hayy": "আল-হাইয়্যু",
  "Al-Ilaah": "আল-ইলাহ",
  "Al-Jabbaar": "আল-জাব্বার",
  "Al-Jameel": "আল-জামীল",
  "Al-Jawwaad": "আল-জাউওয়াদ",
  "Al-Kabeer Al-Mutawaal": "আল-কাবীর আল-মুতাআল",
  "Al-Kabeer": "আল-কাবীর",
  "Al-Kareem": "আল-কারীম",
  "Al-Khaaliq": "আল-খালিক",
  "Al-Khabeer": "আল-খাবীর",
  "Al-Khallaq": "আল-খাল্লাক",
  "Al-Lateef": "আল-লাতীফ",
  "Al-Maaleek": "আল-মালীক",
  "Al-Maalik": "আল-মালিক",
  "Al-Mannan": "আল-মান্নান",
  "Al-Mateen": "আল-মাতীন",
  "Al-Mu'mim": "আল-মুমিন",
  "Al-Mu'tee": "আল-মু'তী",
  "Al-Muakkhir": "আল-মুআখখির",
  "Al-Mubeen": "আল-মুবীন",
  "Al-Muhayimin": "আল-মুহাইমিন",
  "Al-MuHeet": "আল-মুহীত",
  "Al-Muhsin": "আল-মুহসিন",
  "Al-Mujeeb": "আল-মুজীব",
  "Al-Muqaddimu": "আল-মুকাদ্দিম",
  "Al-Muqeet": "আল-মুকীত",
  "Al-Muqtadir": "আল-মুক্তাদির",
  "Al-Musawwir": "আল-মুসাউইর",
  "Al-Muta'aalee": "আল-মুতাআলী",
  "Al-Mutakabbir": "আল-মুতাকাব্বির",
  "An-Naseer": "আন-নাসীর",
  "Al-Qaabid": "আল-কাবিদ",
  "Al-Qaadir": "আল-কাদির",
  "Al-Qaahir": "আল-কাহির",
  "Al-Qadeer": "আল-কাদীর",
  "Al-Qahhaar": "আল-কাহ্‌হার",
  "Al-Qawiyy": "আল-কাউইয়্যু",
  "Al-Qayyuum": "আল-কাইয়্যূম",
  "Al-Quddoos": "আল-কুদ্দূস",
  "Ar-Ra'oof": "আর-রাউফ",
  "Ar-Rabb": "আর-রব",
  "Ar-Rafeeq": "আর-রাফীক",
  "Ar-Raheem": "আর-রহীম",
  "Ar-Rahman": "আর-রহমান",
  "Ar-Raqeeb": "আর-রাকীব",
  "Ar-Razzaq": "আর-রাযযাক",
  "As-Salaam": "আস-সালাম",
  "As-Samee": "আস-সামী",
  "As-Sayyid": "আস-সাইয়্যিদ",
  "Ash-Shaafee": "আশ-শাফী",
  "Ash-Shaakir": "আশ-শাকির",
  "Ash-Shaheed": "আশ-শাহীদ",
  "Ash-Shakoor": "আশ-শাকূর",
  "Al-Subbuhu": "আস-সুব্বূহ",
  "At-Tawwab": "আত-তাউওয়াব",
  "At-Tayyib": "আত-তাইয়্যিব",
  "Al-Waahid": "আল-ওয়াহিদ",
  "Al-Waarith": "আল-ওয়ারিস",
  "Al-Waasi": "আল-ওয়াসি",
  "Al-Wadud": "আল-ওয়াদূদ",
  "Al-Wahhab": "আল-ওয়াহ্‌হাব",
  "Al-Wakeel": "আল-ওয়াকীল",
  "Al-Witr": "আল-উইতর",

  // --- What the Asma screens say themselves (js/asma-renderer.js) ---
  // "{n} of {total}" reverses in Bangla: English counts up from the item,
  // Bangla counts down from the total. Same rule phase 4 set for
  // possessives -- the whole line has to be one translatable sentence,
  // never a number concatenated onto a word.
  "{n} of {total}": "{total}টির মধ্যে {n}",
  "Status: {status} · {confirm}": "অবস্থা: {status} · {confirm}",
  "Not started yet.": "এখনো শুরু করা হয়নি।",
  // Shown after a successful claim on EVERY study screen -- the Quran
  // module, all nine other modules and this one. It reached phase 6 in
  // English because none of the five call sites ever wrapped it in t().
  "Claimed and confirmed.": "দাবি করা হয়েছে এবং নিশ্চিত হয়েছে।",

  // =====================================================================
  // Shell round 20 (17 Aug 2026) -- the moving tagline strip and its own
  // editing screen (taglines.html, js/taglines.js).
  // =====================================================================

  // --- The six lines the app ships with. These reach the screen through
  // langText() -> t(value.en), the same read-time path phase 3 built for
  // seeded subject names, so a tenant that has never opened the editor
  // still sees them in Bangla. The owner is expected to rewrite these in
  // their own words -- and once they save their own list, these keys stop
  // being used at all.
  "30 Approaches — one Ayah, thirty ways": "৩০টি পদ্ধতি — এক আয়াত, ত্রিশ উপায়", // ?
  "The 99 Names of Allah": "আল্লাহর ৯৯টি নাম",
  "Names & Attributes posters on archive.org": "archive.org-এ নাম ও গুণাবলির পোস্টার", // ?
  "Today's Hadith": "আজকের হাদীস",
  "Quran (calls) for Critical Reasoning": "কুরআন গভীর চিন্তার আহ্বান জানায়", // ?

  // --- How it moves (js/taglines.js) ------------------------------------
  "Flip": "উল্টে যাওয়া", // ?
  "Fade": "মিলিয়ে যাওয়া", // ?
  "Slide up": "উপরে সরে যাওয়া", // ?
  "Every visit": "প্রতিবার খোলার সময়",
  "One day": "এক দিন",
  "Three days": "তিন দিন",
  "One week": "এক সপ্তাহ",
  "One month": "এক মাস",

  // --- The strip itself (quranrevival.html) -----------------------------
  // The whole sentence, not "opens in a new tab" glued onto a name -- the
  // same rule phases 4 and 5 set for possessives and confirm() dialogs.
  "{text} — opens in a new tab": "{text} — নতুন ট্যাবে খোলে",

  // --- The editing screen (taglines.html) -------------------------------
  "Taglines": "ট্যাগলাইন",
  "QuranRevival — Taglines": "কুরআনরিভাইভাল — ট্যাগলাইন",
  "The moving line under the app's name on the Quran Study page. Write the lines, say where each one links, choose the order and how long each one holds the strip. Only you can change these.":
    "কুরআন অধ্যয়ন পাতায় অ্যাপের নামের নিচের চলমান লাইন। লাইনগুলো লিখুন, কোনটি কোথায় নিয়ে যাবে তা বলুন, ক্রম ঠিক করুন এবং প্রতিটি কত সময় থাকবে তা বেছে নিন। কেবল আপনিই এগুলো বদলাতে পারেন।",
  "Only the account owner can change the taglines.": "কেবল অ্যাকাউন্টের মালিকই ট্যাগলাইন বদলাতে পারেন।",
  "These are the lines the app ships with. Change anything and save, and they become yours — after that you can retire any of them.":
    "এগুলো অ্যাপের সঙ্গে আসা লাইন। যেকোনো কিছু বদলে সংরক্ষণ করলেই এগুলো আপনার হয়ে যাবে — এরপর যেকোনোটিকে অবসরে পাঠাতে পারবেন।",
  "How it moves": "কীভাবে চলবে",
  "Movement": "চলন",
  "Change after (seconds)": "কত সেকেন্ড পরে বদলাবে",
  "Pause while held": "চেপে ধরে রাখলে থেমে থাকবে",
  "The line changes at most once each time the app is opened — it is not a carousel. \"Change after\" is how long the line already on screen stays before the next one takes over.":
    "অ্যাপ একবার খোলার সময় লাইনটি সর্বোচ্চ একবার বদলায় — এটি ঘুরতে থাকা তালিকা নয়। “কত সেকেন্ড পরে বদলাবে” মানে পর্দায় থাকা লাইনটি পরেরটির আগে কতক্ষণ থাকবে।",
  "Show the movement": "চলন দেখুন",
  "Preview only — it does not change what anyone sees.": "কেবল দেখানোর জন্য — এতে কারও পর্দা বদলায় না।",
  "The lines": "লাইনগুলো",
  "Links to": "যেখানে নিয়ে যাবে",
  "Opens": "যেভাবে খুলবে",
  "Holds for": "কত সময় থাকবে",
  "Only on ayah": "কেবল এই আয়াতে",
  "Showing": "দেখানো হচ্ছে",
  "Line": "লাইন",
  "Leave \"Links to\" empty for a line that is only words. An address starting with http opens in a new tab; anything else is treated as a page inside the app. \"Only on ayah\" (written like 2:255) shows that line only while that ayah is open — for an article about that ayah.":
    "কেবল কথার লাইনের জন্য “যেখানে নিয়ে যাবে” ফাঁকা রাখুন। http দিয়ে শুরু হওয়া ঠিকানা নতুন ট্যাবে খোলে; অন্য যেকোনো কিছুকে অ্যাপের ভেতরের পাতা ধরা হয়। “কেবল এই আয়াতে” (২:২৫৫ এভাবে লেখা) সেই লাইনটি কেবল ওই আয়াত খোলা থাকা অবস্থায় দেখায় — ওই আয়াত নিয়ে লেখা প্রবন্ধের জন্য।",
  "Add a line": "নতুন লাইন যোগ করুন",
  "Add line": "লাইন যোগ করুন",
  "What it says": "কী লেখা থাকবে",
  "Leave empty for none": "না থাকলে ফাঁকা রাখুন",
  "Inside the app": "অ্যাপের ভেতরে",
  "New tab": "নতুন ট্যাবে",
  "Retired": "অবসরে",
  "No changes yet.": "এখনো কিছু বদলানো হয়নি।",
  "Not saved yet.": "এখনো সংরক্ষণ করা হয়নি।",
  "Saving…": "সংরক্ষণ করা হচ্ছে…",
  "Saved. The Quran Study page will show this next time it loads.": "সংরক্ষণ হয়েছে। কুরআন অধ্যয়ন পাতা পরের বার খুললেই এটি দেখাবে।",
  "Not saved — see the message above.": "সংরক্ষণ হয়নি — উপরের বার্তাটি দেখুন।",
  "Could not load the taglines.": "ট্যাগলাইনগুলো আনা যায়নি।",
  "Write an ayah like 2:255.": "২:২৫৫ এভাবে একটি আয়াত লিখুন।",
  "Write the line first.": "আগে লাইনটি লিখুন।",

  // =====================================================================
  // Enhancement round -- the Bookmark Manager (bookmarks.html), the real
  // screen behind nav.js's own long-standing "Bookmark (coming soon)"
  // placeholder.
  // =====================================================================
  "Top level": "সর্বোচ্চ স্তর",
  "Unfiled": "কোনো ফোল্ডারে নেই",
  "Open": "খুলুন",
  "Rename": "নাম বদলান",
  "Retire": "অবসরে পাঠান",
  "Rename this bookmark:": "এই বুকমার্কের নাম বদলান:",
  "Rename this folder:": "এই ফোল্ডারের নাম বদলান:",
  "Name this folder:": "ফোল্ডারের নাম দিন:",
  "Bookmarks": "বুকমার্ক",
  "Every bookmark you have saved, from any module, in one place. Open one to jump straight back to where it was made. Group them into folders however you like.":
    "আপনার সংরক্ষণ করা প্রতিটি বুকমার্ক, যেকোনো মডিউল থেকে, একই জায়গায়। একটি খুললেই সরাসরি যেখানে তৈরি হয়েছিল সেখানে চলে যাবেন। ইচ্ছেমতো ফোল্ডারে ভাগ করে রাখুন।",
  "+ New folder": "+ নতুন ফোল্ডার",
  "No bookmarks saved yet. Look for the ☆/🔖 button on a study screen.": "এখনো কোনো বুকমার্ক সংরক্ষণ করা হয়নি। অধ্যয়ন পাতায় ☆/🔖 বোতামটি খুঁজুন।",
  "QuranRevival — Bookmarks": "কুরআনরিভাইভাল — বুকমার্ক",
};
