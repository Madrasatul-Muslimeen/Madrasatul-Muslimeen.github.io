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

  // --- About page, the long blurb ---------------------------------------
  "What's actually built versus only planned — read directly from this\n     app's own feature registry, never restated by hand, so this page can't\n     drift out of sync with the real code.":
    "কী কী সত্যিই তৈরি হয়েছে আর কী কেবল পরিকল্পনায় আছে — সরাসরি অ্যাপের নিজস্ব বৈশিষ্ট্য-নথি থেকে পড়া, হাতে লেখা নয়, তাই এই পাতাটি কখনো প্রকৃত কোড থেকে আলাদা হয়ে যেতে পারে না।",
  "Phase 0 &amp; 1 — individually tracked features":
    "পর্যায় ০ ও ১ — আলাদাভাবে চিহ্নিত বৈশিষ্ট্যসমূহ",
};
