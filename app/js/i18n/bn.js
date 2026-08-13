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

  // --- The "Go to" box, including what it says when it cannot read you ---
  "Couldn't read \"{text}\". Try 2:255 for one ayah, or 2:255-260 for a range.":
    "\"{text}\" বোঝা গেল না। একটি আয়াতের জন্য ২:২৫৫, বা পরিসরের জন্য ২:২৫৫-২৬০ লিখুন।",
  "There is no Surah {surah}. Surah numbers run 1–114.":
    "{surah} নম্বর কোনো সূরা নেই। সূরার নম্বর ১ থেকে ১১৪ পর্যন্ত।",
  "Surah {surah} has {count} ayahs.": "সূরা {surah}-এ {count}টি আয়াত আছে।",

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
  "Couldn't find a Mushaf page for this selection.":
    "এই নির্বাচনের জন্য মুসহাফের পৃষ্ঠা পাওয়া যায়নি।",
  "No word-by-word data for this ayah.": "এই আয়াতের জন্য শব্দে-শব্দে তথ্য নেই।",
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

  // --- Claiming, and the Approach modal ----------------------------------
  "Track this unit": "এই এককটি চিহ্নিত করুন",
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
};
