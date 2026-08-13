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
  "Loading&hellip;": "লোড হচ্ছে…",
  "Loading this surah…": "এই সূরা লোড হচ্ছে…",
  "No Approaches yet.": "এখনো কোনো পদ্ধতি নেই।",
  "Pick an Approach first.": "প্রথমে একটি পদ্ধতি বেছে নিন।",
  "Click a segment to drill in &mdash; Quran &rarr; Juz &rarr; Surah &rarr; Ruku' &rarr; an ayah in Study. Colours pool this Approach's real ayah-by-ayah progress across whatever's inside each segment &mdash; it only turns fully green once every ayah inside it is Mastered.":
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

  // --- About page, the long blurb ---------------------------------------
  "What's actually built versus only planned — read directly from this\n     app's own feature registry, never restated by hand, so this page can't\n     drift out of sync with the real code.":
    "কী কী সত্যিই তৈরি হয়েছে আর কী কেবল পরিকল্পনায় আছে — সরাসরি অ্যাপের নিজস্ব বৈশিষ্ট্য-নথি থেকে পড়া, হাতে লেখা নয়, তাই এই পাতাটি কখনো প্রকৃত কোড থেকে আলাদা হয়ে যেতে পারে না।",
  "Phase 0 &amp; 1 — individually tracked features":
    "পর্যায় ০ ও ১ — আলাদাভাবে চিহ্নিত বৈশিষ্ট্যসমূহ",
};
