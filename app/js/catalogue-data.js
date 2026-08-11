// Phase 2 — Catalogue, platform master data.
//
// Source: QuranRevival_Subject_Catalogue_v3.md, approved as-is (CLAUDE.md D11).
// This is the ONE place the 6-module / 31-subject / 30-Approach content is
// written down. subjectTemplates and each tenant's own subjects/trackables
// copies are seeded FROM this file (see catalogue.js) -- nothing here is a
// live Firestore read itself.
//
// Node ids are permanent (I5) -- slugs, not the catalogue doc's display
// numbers, which the doc itself says were "discarded as instructed."
//
// moduleIds resolution note (also recorded as D11 in CLAUDE.md): the source
// doc tags the Hadith node "[QuranRevival / Deen]", but its own Part 5 also
// states no node uses moduleIds[] for more than one module, and the
// Architecture doc's Phase 12 list names Hadith as its own fifth remaining
// module (alongside Arabic, General Study, Health, Nature-Life). Built here
// as its own module ("hadith"); flagged for the owner to correct if a
// genuine dual-module node was intended instead.
//
// Guide tab text (what/how/measure) for the 30 Approaches is a first-draft,
// written during this build to unblock the module -- per the Architecture
// doc, "measure" has a generic fallback and must not block the module.
// Everything here is editable tenant data (catalogue doc, Part 5 note 4);
// none of it is a decision that needs re-approval to change later.

/** name/gloss are English-only for now (I11: language-keyed from day one, bn filled later). */
function en(text) {
  return { en: text };
}

/**
 * Bangla is filled for the 30 Approach names + their 7 section names (owner
 * request, 5 Aug 2026: whatever language is chosen should show these too,
 * not just the translation panel). Guide text (what/how/measure) and
 * subject-tree names stay English-only for now -- out of scope for this
 * pass, same "first-draft, correctable later" status as the Guide text
 * itself already carries (see file header). Standard Bangla Islamic
 * terminology; Arabic technical terms (tajweed, hifz, tafakkur, tadabbur,
 * fiqh, da'wah...) are transliterated rather than translated, matching how
 * the English names already keep them untranslated.
 */
function nameLang(text, bn) {
  return { en: text, bn };
}

// ---------------------------------------------------------------------------
// Modules registry (platform-wide, not tenant-scoped).
// ---------------------------------------------------------------------------
export const MODULE_TEMPLATES = [
  { id: "quranrevival", name: en("QuranRevival"), icon: "📖", renderer: "ayah", order: 1 },
  { id: "deen", name: en("Deen Study"), icon: "🕌", renderer: "topic", order: 2 },
  { id: "arabic", name: en("Arabic"), icon: "📝", renderer: "topic", order: 3 },
  { id: "general", name: en("General"), icon: "🎓", renderer: "topic", order: 4 },
  { id: "health", name: en("Health"), icon: "🩺", renderer: "routine", order: 5 },
  { id: "naturelife", name: en("Nature-Life"), icon: "🌱", renderer: "topic", order: 6 },
  { id: "hadith", name: en("Hadith"), icon: "📜", renderer: "topic", order: 7 },
  // Owner, this round: "Life Skill is not a subject under General. It's
  // totally independent." Same treatment Health just got -- own module,
  // own top-level subject root, not nested inside another module's tree.
  { id: "lifeskill", name: en("Life Skill"), icon: "🛠️", renderer: "topic", order: 8 },
  // Phase 7 (Bookmarks, programs, routines): Learn Deen On-the-Go was a
  // plain topic under Deen Study ▸ Enhancement ("Daily Deen Learning Habit
  // for Life"). Architecture s5's renderer table names it alongside Health
  // as a "routine" module in its own right (a scheduled habit, not a
  // topic+resource) -- owner confirmed this round: pull it out, same
  // treatment Health and Life Skill already got.
  { id: "ldog", name: en("Learn Deen On-the-Go"), icon: "🚶", renderer: "routine", order: 9 },
  // Phase 13 round 1: Asma ul Husna. Its own renderer ("asma"), not "topic"
  // -- unlike every topic-renderer module, its content isn't tenant-authored
  // (no per-name resource to add from Catalogue); the 99 Names are fixed
  // platform data (asma-data.js), same "static content + claim/confirm"
  // shape QuranRevival's own ayahs already use, just far simpler (no
  // audio/tajweed/word-by-word panels). unit-keys.js already reserved
  // `name:${number}` for exactly this back in Phase 3 (F-033).
  { id: "asma", name: en("Asma ul Husna"), icon: "📿", renderer: "asma", order: 10 },
];

// ---------------------------------------------------------------------------
// Subject tree (Part 1). 6 top-level nodes, 10 grouping nodes, 31 studiable
// subjects -- 41 total, matching the catalogue doc's own Part 2 totals.
// ---------------------------------------------------------------------------
export const SUBJECT_TEMPLATES = [
  // 1. Quran [QuranRevival]
  { id: "quran", name: en("Quran"), parentId: null, order: 1, moduleIds: ["quranrevival"] },

  // 2. Hadith [own module -- see moduleIds note above]
  { id: "hadith", name: en("Hadith"), parentId: null, order: 2, moduleIds: ["hadith"] },
  { id: "hadith_adab_al_mufrad", name: en("Adab Al-Mufrad"), gloss: en("Learning Akhlaq before knowledge"), parentId: "hadith", order: 1, moduleIds: ["hadith"] },
  { id: "hadith_shamayyl_muhammadiya", name: en("Shamayyl Muhammadiya"), gloss: en("Learning to love Rasulullah △"), parentId: "hadith", order: 2, moduleIds: ["hadith"] },
  { id: "hadith_al_ghayb", name: en("Hadith — Al-Ghayb"), gloss: en("Knowledge of Allah, Malaikah, Jannah, Jahannam, Qiyamah, Qabr, Shaitan — awareness of the unseen, for mindfulness and focus on Akhirah"), parentId: "hadith", order: 3, moduleIds: ["hadith"] },
  { id: "hadith_reading", name: en("Hadith Reading"), gloss: en("Reading in Arabic"), parentId: "hadith", order: 4, moduleIds: ["hadith"] },
  { id: "hadith_stories", name: en("Hadith — Stories"), parentId: "hadith", order: 5, moduleIds: ["hadith"] },

  // 3. Arabic Language [Arabic]
  { id: "arabic_language", name: en("Arabic Language"), parentId: null, order: 3, moduleIds: ["arabic"] },
  { id: "arabic_advanced_grammar", name: en("Language Learning (Advanced)"), gloss: en("Detailed Arabic language study. Basic Grammar is NOT here -- it lives in QuranRevival as Approach #6."), parentId: "arabic_language", order: 1, moduleIds: ["arabic"] },
  { id: "arabic_speaking", name: en("Arabic Speaking"), parentId: "arabic_language", order: 2, moduleIds: ["arabic"] },
  { id: "arabic_daily_uses", name: en("Arabic Daily Uses"), gloss: en("Names of things, numbers, etc."), parentId: "arabic_language", order: 3, moduleIds: ["arabic"] },

  // 4. Deen Study [Deen]
  { id: "deen_study", name: en("Deen Study"), parentId: null, order: 4, moduleIds: ["deen"] },
  { id: "deen_core", name: en("Core"), parentId: "deen_study", order: 1, moduleIds: ["deen"] },
  { id: "ethics", name: en("Ethics"), gloss: en("Social conduct"), parentId: "deen_core", order: 1, moduleIds: ["deen"] },
  { id: "akhlaq", name: en("Akhlaq"), gloss: en("Behaviour — personal character"), parentId: "deen_core", order: 2, moduleIds: ["deen"] },
  { id: "aqeedah", name: en("Aqeedah"), parentId: "deen_core", order: 3, moduleIds: ["deen"] },
  { id: "ebadah", name: en("Ebadah"), parentId: "deen_core", order: 4, moduleIds: ["deen"] },
  { id: "sharia", name: en("Sharia"), parentId: "deen_core", order: 5, moduleIds: ["deen"] },
  { id: "fiqh", name: en("Fiqh"), parentId: "deen_core", order: 6, moduleIds: ["deen"] },
  { id: "islamic_history_story", name: en("Islamic History & Story"), parentId: "deen_core", order: 7, moduleIds: ["deen"] },
  { id: "deen_enhancement", name: en("Enhancement"), parentId: "deen_study", order: 2, moduleIds: ["deen"] },
  { id: "islamic_mindset", name: en("Islamic Mindset"), parentId: "deen_enhancement", order: 1, moduleIds: ["deen"] },
  { id: "islamic_lifestyle", name: en("Islamic Lifestyle"), parentId: "deen_enhancement", order: 2, moduleIds: ["deen"] },
  // daily_deen_habit used to live here (parentId: deen_enhancement,
  // moduleIds: ["deen"]) -- pulled out to its own top-level root under
  // module 9 (ldog) below, Phase 7, same shape as the health_study/
  // life_skill moves above. Existing tenants get repaired via
  // catalogue.js's ensureLdogReparented.
  { id: "islamic_sports_entertainment", name: en("Islamic Sports & Entertainment"), parentId: "deen_enhancement", order: 3, moduleIds: ["deen"] },

  // 5. General Study [General]
  { id: "general_study", name: en("General Study"), parentId: null, order: 5, moduleIds: ["general"] },
  { id: "general_core", name: en("Core"), parentId: "general_study", order: 1, moduleIds: ["general"] },
  { id: "mathematics", name: en("Mathematics"), parentId: "general_core", order: 1, moduleIds: ["general"] },
  { id: "english", name: en("English"), parentId: "general_core", order: 2, moduleIds: ["general"] },
  { id: "science", name: en("Science"), parentId: "general_core", order: 3, moduleIds: ["general"] },
  { id: "geography", name: en("Geography"), parentId: "general_core", order: 4, moduleIds: ["general"] },
  { id: "world_history", name: en("World History"), parentId: "general_core", order: 5, moduleIds: ["general"] },
  { id: "general_enhancement", name: en("Enhancement"), parentId: "general_study", order: 2, moduleIds: ["general"] },
  // health_study used to live here (parentId: general_enhancement) as a
  // single stub leaf, from before Health had its own module root -- moved
  // under the new "health" root below (owner, this round). Existing
  // tenants that already seeded the old placement get repaired in place
  // (catalogue.js's ensureHealthStudyReparented, I4: archive/move, never
  // delete) rather than losing that row's history.
  //
  // life_skill used to live here too (parentId: general_enhancement,
  // moduleIds: ["general"]) -- owner, this round: "Life Skill is not a
  // subject under General. It's totally independent. Should come out from
  // General." Moved to its own top-level root under module 8 below, same
  // shape as the health_study move above. Existing tenants get repaired
  // via catalogue.js's ensureLifeSkillReparented.
  { id: "creativity", name: en("Creativity"), parentId: "general_enhancement", order: 3, moduleIds: ["general"] },

  // 6. Nature-Life [Nature-Life]
  { id: "nature_life", name: en("Nature-Life"), parentId: null, order: 6, moduleIds: ["naturelife"] },
  { id: "nature_studies", name: en("Nature Studies"), gloss: en("moved up from General Study ▸ Enhancement"), parentId: "nature_life", order: 1, moduleIds: ["naturelife"] },
  { id: "agro_farming", name: en("Agro-Farming"), gloss: en("moved from General Study ▸ Enhancement"), parentId: "nature_life", order: 2, moduleIds: ["naturelife"] },

  // 7. Health [Health] -- not one of D11's 6 top-level catalogue nodes;
  // added as its own module root per the owner's explicit instruction
  // this round ("a HUGE module in my Madrasah Study Curriculum... build it
  // as a module now"). Health was always one of the Architecture doc's own
  // module ids (s1's module list), just not previously given a real
  // subject tree of its own. Uses the "routine" renderer (a scheduled
  // habit, not a topic+resource) -- the actual study screen is Phase 7
  // scope; this round is structure only, as asked. Subjects/counts are the
  // owner's own list, not derived from the catalogue doc.
  { id: "health", name: en("Health"), parentId: null, order: 7, moduleIds: ["health"] },
  { id: "health_study", name: en("Health Study"), parentId: "health", order: 1, moduleIds: ["health"] },
  { id: "know_your_body", name: en("Know Your Body"), parentId: "health", order: 2, moduleIds: ["health"] },
  { id: "know_your_food", name: en("Know Your Food"), parentId: "health", order: 3, moduleIds: ["health"] },
  { id: "physical_activities", name: en("Physical Activities"), parentId: "health", order: 4, moduleIds: ["health"] },
  { id: "lying_movements", name: en("Lying Movements"), parentId: "physical_activities", order: 1, moduleIds: ["health"] },
  { id: "standing_movements", name: en("Standing Movements"), parentId: "physical_activities", order: 2, moduleIds: ["health"] },
  { id: "sitting_movements", name: en("Sitting Movements"), parentId: "physical_activities", order: 3, moduleIds: ["health"] },
  { id: "walking", name: en("Walking"), parentId: "physical_activities", order: 4, moduleIds: ["health"] },
  { id: "squatting", name: en("Squatting"), parentId: "physical_activities", order: 5, moduleIds: ["health"] },
  { id: "hiit", name: en("HIIT"), parentId: "physical_activities", order: 6, moduleIds: ["health"] },
  { id: "breathing_exercise", name: en("Breathing Exercise"), parentId: "physical_activities", order: 7, moduleIds: ["health"] },
  { id: "fasting", name: en("Fasting"), parentId: "physical_activities", order: 8, moduleIds: ["health"] },

  // 8. Life Skill [lifeskill] -- also not one of D11's 6 top-level nodes;
  // pulled out of General Study's Enhancement branch this round (owner:
  // "totally independent... should come out from General"). Same
  // structural shape as Health above -- own module, own top-level root.
  { id: "life_skill", name: en("Life Skill"), parentId: null, order: 8, moduleIds: ["lifeskill"] },
  { id: "life_skill_tech_cognition", name: en("Technology & Cognition"), parentId: "life_skill", order: 1, moduleIds: ["lifeskill"] },
  { id: "life_skill_trading", name: en("Trading"), parentId: "life_skill", order: 2, moduleIds: ["lifeskill"] },

  // 9. Learn Deen On-the-Go [ldog] -- Phase 7: pulled out of Deen Study ▸
  // Enhancement (owner confirmed, same treatment as Health/Life Skill).
  // Given its own root+child shape, matching Health (root "ldog" + first
  // child "daily_deen_habit") rather than Life Skill's root-is-a-real-node
  // shape -- this leaves room for more LDOG subjects to sit as siblings of
  // daily_deen_habit later without a second restructure.
  { id: "ldog", name: en("Learn Deen On-the-Go"), parentId: null, order: 9, moduleIds: ["ldog"] },
  { id: "daily_deen_habit", name: en("Daily Deen Learning Habit for Life"), parentId: "ldog", order: 1, moduleIds: ["ldog"] },

  // Phase 13 round 1: Asma ul Husna -- a single anchor node, not a branch
  // tree. Not isTrackable itself; it exists only so records.js has a
  // subjectId to chunk the 99 names' claims under (chunkKeyFor falls back
  // to `subject_${subjectId}` for any unit type outside the surah-chunked
  // set, and "name" is one of those -- see records.js). The 99 names
  // themselves live in asma-data.js as fixed platform content, not as 99
  // separate subject nodes.
  { id: "asma_ul_husna", name: en("Asma ul Husna"), parentId: null, order: 10, moduleIds: ["asma"] },
];

// ---------------------------------------------------------------------------
// The 30 Approaches (Part 3) -- trackables, not subjects. All belong to
// QuranRevival / the "quran" subject node. 7 sections, matching the doc.
// ---------------------------------------------------------------------------
const SECTION_NAMES = {
  1: nameLang("Building Foundation / Learning Tools", "ভিত্তি নির্মাণ / শেখার হাতিয়ার"),
  2: nameLang("Engagement / Attachment", "সম্পৃক্ততা / সংযুক্তি"),
  3: nameLang("Critical Reasoning: Nazar / 'Aql", "যৌক্তিক চিন্তা: নজর / আকল"),
  4: nameLang("Critical Reasoning: Applied Threads", "যৌক্তিক চিন্তা: প্রায়োগিক সূত্র"),
  5: nameLang("Critical Reasoning: Tafakkur / Tadabbur", "যৌক্তিক চিন্তা: তাফাক্কুর / তাদাব্বুর"),
  6: nameLang("Critical Reasoning: Judgement / Authority", "যৌক্তিক চিন্তা: বিচার / কর্তৃত্ব"),
  7: nameLang("A'mal / Application", "আমল / প্রয়োগ"),
};

const GENERIC_MEASURE = en(
  "This approach is about the practice itself -- a specific measure is not required to make progress here."
);

export const APPROACH_TEMPLATES = [
  { id: "approach_01", order: 1, section: 1, name: nameLang("Reading (with Tajweed)", "তাজবিদসহ তিলাওয়াত"),
    guide: { what: en("Reciting the Arabic text accurately, applying the rules of tajweed."), how: en("Read aloud from the mushaf, applying each tajweed rule as it appears; use the audio and repeat/loop tools to match a reciter."), measure: en("How much of the assigned portion you can read correctly, with tajweed rules applied, without correction.") },
    panels: ["text", "audio", "loop", "tajweed"] },
  { id: "approach_02", order: 2, section: 1, name: nameLang("Hifz / Memorising", "হিফজ / মুখস্থকরণ"),
    guide: { what: en("Committing ayahs to memory so they can be recited without looking at the text."), how: en("Repeat a short portion aloud in a loop until it is secure, then recite it from memory and check against the text."), measure: en("How much can be recited from memory, start to finish, without a mistake.") },
    panels: ["text", "audio", "loop", "timer", "checklist"] },
  { id: "approach_03", order: 3, section: 1, name: nameLang("Reading (with Meaning)", "অর্থসহ পাঠ"),
    guide: { what: en("Reading the Arabic text alongside its translation to understand what is being read."), how: en("Read a passage, then read its meaning; go back and forth until the meaning is clear."), measure: en("Whether you can explain in your own words what the passage you read means.") },
    panels: ["text", "audio", "notes"] },
  { id: "approach_04", order: 4, section: 1, name: nameLang("Reading — Word-by-Word Meaning", "শব্দে শব্দে অর্থসহ পাঠ"),
    guide: { what: en("Learning the meaning of each individual Arabic word in a passage."), how: en("Use the word-by-word panel to see each word's meaning underneath it while reading."), measure: en("How many of the words in the assigned portion you can translate without the panel.") },
    panels: ["text", "wordByWord"] },
  { id: "approach_05", order: 5, section: 1, name: nameLang("Arabic Writing", "আরবি লিখন অনুশীলন"),
    guide: { what: en("Practising writing the Arabic letters and words of the text by hand."), how: en("Copy the assigned text by hand, letter by letter, checking each word against the original."), measure: en("Whether the written copy matches the original accurately.") },
    panels: ["writing"] },
  { id: "approach_06", order: 6, section: 1, name: nameLang("Language Learning (Basic Grammar)", "ভাষা শিক্ষা (মৌলিক ব্যাকরণ)"),
    guide: { what: en("Learning the basic Arabic grammar needed to read and understand Quranic text."), how: en("Study one grammar point at a time and find examples of it in the text being studied."), measure: en("Whether you can identify the grammar point being studied in a new, unseen ayah.") },
    panels: ["text", "notes"] },

  { id: "approach_07", order: 7, section: 2, name: nameLang("Listening Attentively (Arabic only)", "মনোযোগ সহকারে শ্রবণ (শুধু আরবি)"),
    guide: { what: en("Listening to the Arabic recitation with full attention, without reading along."), how: en("Play the audio and listen without looking at the text; use loop for a shorter passage."), measure: en("Whether you can follow along and recognise where you are in the recitation.") },
    panels: ["audio", "loop"] },
  { id: "approach_08", order: 8, section: 2, name: nameLang("Listening Attentively (Arabic with meaning)", "মনোযোগ সহকারে শ্রবণ (অর্থসহ আরবি)"),
    guide: { what: en("Listening to the recitation while also taking in its meaning."), how: en("Listen to the audio with the translation visible or read alongside it."), measure: en("Whether you can explain the meaning of what was just heard.") },
    panels: ["audio", "loop", "notes"] },
  { id: "approach_09", order: 9, section: 2, name: nameLang("Dua Memorising", "দোয়া মুখস্থকরণ"),
    guide: { what: en("Memorising a specific dua, in Arabic, with its meaning."), how: en("Repeat the dua aloud in short phrases, building up to the whole dua, checking the meaning as you go."), measure: en("Whether the dua can be recited from memory, correctly, with its meaning known.") },
    panels: ["text", "audio", "loop", "checklist"] },
  { id: "approach_10", order: 10, section: 2, name: nameLang("Journaling", "দিনলিপি লেখা"),
    guide: { what: en("Writing personal notes and reflections about what has been studied."), how: en("After a study session, write a few lines about what stood out and why."), measure: en("Whether a journal entry has been written for the session.") },
    panels: ["writing", "notes"] },
  { id: "approach_11", order: 11, section: 2, name: nameLang("Ruqyah Listening", "রুকইয়াহ শ্রবণ"),
    guide: { what: en("Listening to ruqyah recitation for protection and comfort."), how: en("Play the ruqyah audio in a quiet setting and listen attentively, using loop as needed."), measure: GENERIC_MEASURE },
    panels: ["audio", "loop"] },
  { id: "approach_12", order: 12, section: 2, name: nameLang("Calligraphy", "ক্যালিগ্রাফি (হস্তলিপি শিল্প)"),
    guide: { what: en("Practising the artistic writing of Arabic script."), how: en("Copy a short phrase or ayah using calligraphy strokes, following a model."), measure: en("Whether the calligraphy piece is complete and legible.") },
    panels: ["writing"] },
  { id: "approach_13", order: 13, section: 2, name: nameLang("Story Learning", "কাহিনি থেকে শিক্ষা"),
    guide: { what: en("Learning the stories connected to the ayah or surah being studied."), how: en("Read or listen to the story, then retell it in your own words."), measure: en("Whether the story can be retold accurately, in the right order.") },
    panels: ["text", "notes"] },

  { id: "approach_14", order: 14, section: 3, name: nameLang("Beginner's Level — Observation (Nazar)", "প্রাথমিক স্তর — পর্যবেক্ষণ (নজর)"),
    guide: { what: en("Noticing what the text actually says, plainly, before interpreting it."), how: en("Read the ayah slowly and list what it literally describes or states."), measure: en("Whether the plain content of the ayah can be described accurately.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_15", order: 15, section: 3, name: nameLang("Primary Level — Common Sense ('Aql / Ta'aqqul)", "প্রাথমিক স্তর — সাধারণ বিবেচনা (আকল / তা'আক্কুল)"),
    guide: { what: en("Applying ordinary reasoning to what has been observed in the text."), how: en("Ask what the observation means in plain, common-sense terms."), measure: en("Whether a sensible, reasoned point can be drawn from the observation.") },
    panels: ["text", "reflection", "notes"] },

  { id: "approach_16", order: 16, section: 4, name: nameLang("Deriving Dua", "দোয়া উদ্ভাবন"),
    guide: { what: en("Finding duas embedded in or suggested by the ayah."), how: en("Look for language of asking, praising, or turning to Allah, and draw out the dua in it."), measure: en("Whether a dua has been correctly identified and articulated from the text.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_17", order: 17, section: 4, name: nameLang("Deriving Names & Attributes of Allah", "আল্লাহর নাম ও গুণাবলি উদ্ভাবন"),
    guide: { what: en("Identifying the Names and Attributes of Allah mentioned or implied in the ayah."), how: en("Look for a Name or Attribute in the text, and explain what it means here."), measure: en("Whether the Name or Attribute has been correctly identified and explained.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_18", order: 18, section: 4, name: nameLang("Deriving Understanding of the Prophets", "নবীগণ সম্পর্কে উপলব্ধি অর্জন"),
    guide: { what: en("Learning about the Prophets (peace be upon them) through what the ayah says about them."), how: en("Identify what the ayah teaches about a Prophet's character, trial, or example."), measure: en("Whether a clear lesson about a Prophet has been drawn from the text.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_19", order: 19, section: 4, name: nameLang("Reflecting on the Miracles", "মু'জিযা নিয়ে চিন্তা-ভাবনা"),
    guide: { what: en("Reflecting on the miracles mentioned in the Quran and what they point to."), how: en("Identify the miracle in the text and consider what it demonstrates about Allah's power."), measure: en("Whether the miracle and its significance have been clearly identified.") },
    panels: ["text", "reflection", "notes"] },

  { id: "approach_20", order: 20, section: 5, name: nameLang("Intermediate Level — Reflecting / Pondering (Tafakkur)", "মধ্যম স্তর — চিন্তা-ভাবনা (তাফাক্কুর)"),
    guide: { what: en("Pondering the meaning of the ayah beyond its surface reading."), how: en("Sit with the ayah and ask what it means for life, without rushing to an answer."), measure: en("Whether a genuine reflection has been recorded, not just a restatement.") },
    panels: ["text", "reflection", "notes", "timer"] },
  { id: "approach_21", order: 21, section: 5, name: nameLang("Advanced Level — Deep Contemplation (Tadabbur)", "উচ্চতর স্তর — গভীর অনুধ্যান (তাদাব্বুর)"),
    guide: { what: en("Going deeper than reflection — contemplating connections, causes, and implications."), how: en("Consider how the ayah connects to other ayahs, to life, and to one's own state."), measure: en("Whether the contemplation shows a connection made, not only an observation.") },
    panels: ["text", "reflection", "notes", "timer"] },
  { id: "approach_22", order: 22, section: 5, name: nameLang("Higher Level — Understanding / Fiqh (Tafaqquh)", "উচ্চ স্তর — বোঝাপড়া / ফিকহ (তাফাক্কুহ)"),
    guide: { what: en("Building a structured understanding of what the ayah requires or teaches."), how: en("Work out the practical understanding the ayah leads to, referring to established knowledge where needed."), measure: en("Whether a sound, structured understanding has been reached.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_23", order: 23, section: 5, name: nameLang("Upper Higher Level — Dhikr / Tadhakkur", "অতি উচ্চ স্তর — যিকর / তাযাক্কুর"),
    guide: { what: en("Letting the understanding turn into active remembrance of Allah."), how: en("Return to the ayah's meaning in moments of daily life, as a reminder."), measure: GENERIC_MEASURE },
    panels: ["text", "reflection"] },

  { id: "approach_24", order: 24, section: 6, name: nameLang("Mastery Level — Where Fiqh turns to Ruling (9:122 pivot)", "দক্ষতা স্তর — ফিকহ থেকে বিধানে রূপান্তর (৯:১২২)"),
    guide: { what: en("Reaching the point where understanding becomes a basis for a considered ruling."), how: en("Work from the understanding gathered so far toward a reasoned conclusion, under guidance."), measure: en("Whether a reasoned, sound conclusion has been reached and can be explained.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_25", order: 25, section: 6, name: nameLang("Judgment (Fahm)", "বিচার-বুদ্ধি (ফাহম)"),
    guide: { what: en("Exercising sound judgement in applying what has been understood."), how: en("Apply the understanding to a real situation and judge what it calls for."), measure: en("Whether the judgement made is sound and well-explained.") },
    panels: ["text", "reflection", "notes"] },
  { id: "approach_26", order: 26, section: 6, name: nameLang("Authority — Hukm / Tahakum", "কর্তৃত্ব — হুকুম / তাহাক্কুম"),
    guide: { what: en("Recognising the authority of a ruling once soundly reached."), how: en("Identify what ruling or authority the understanding leads to, and why it holds."), measure: GENERIC_MEASURE },
    panels: ["text", "reflection"] },

  { id: "approach_27", order: 27, section: 7, name: nameLang("Group / Class Discussion", "দলীয় / ক্লাস আলোচনা"),
    guide: { what: en("Discussing what has been learned with others."), how: en("Share what you learned in a group or class setting and listen to others' points."), measure: en("Whether you took part in a discussion about the material.") },
    panels: ["notes", "checklist"] },
  { id: "approach_28", order: 28, section: 7, name: nameLang("Living by it (Self-Assessment)", "বাস্তবায়ন (আত্ম-মূল্যায়ন)"),
    guide: { what: en("Honestly assessing whether you are living by what you have learned."), how: en("Reflect on a recent situation and ask whether it matched what was learned."), measure: en("Whether an honest self-assessment has been recorded.") },
    panels: ["reflection", "checklist"] },
  { id: "approach_29", order: 29, section: 7, name: nameLang("Da'wah — Sharing Knowledge / Calling Others", "দাওয়াহ — জ্ঞান বিতরণ / অপরকে আহ্বান"),
    guide: { what: en("Sharing what has been learned with someone else, inviting them toward it."), how: en("Explain a point you have learned to someone else, in your own words."), measure: en("Whether the knowledge was shared with at least one other person.") },
    panels: ["notes", "checklist"] },
  { id: "approach_30", order: 30, section: 7, name: nameLang("Teaching Others", "অপরকে শিক্ষাদান"),
    guide: { what: en("Teaching what has been learned to someone else in a structured way."), how: en("Prepare a short explanation of the topic and teach it to another person."), measure: en("Whether the topic was taught, and whether the learner understood it.") },
    panels: ["notes", "checklist", "timer"] },
].map((t) => ({ ...t, sectionName: SECTION_NAMES[t.section] }));

// ---------------------------------------------------------------------------
// Topic-renderer trackables (Phase 6+). Quran's 30 Approaches work because
// "what we teach, the target, and the resources" were already in hand
// (owner, Phase 6 planning). Every other subject doesn't have that yet --
// so instead of a second 30-item system invented ahead of the resources
// existing, one universal "Studied" trackable per topic-based module,
// applied to whichever topic nodes actually get authored (subject by
// subject, as their own resources are set up -- see subjects.resourceIds[]
// and catalogue.html's "Add topic" action). Module-wide (subjectId: null),
// which the Architecture doc's own trackables schema already allows.
// ---------------------------------------------------------------------------
function studiedTemplate(id, moduleId) {
  return {
    id, moduleId, subjectId: null, group: null, groupName: null,
    name: nameLang("Studied", "অধ্যয়ন করা হয়েছে"),
    guide: {
      what: en("Whether this topic has been studied, at a level worth recording."),
      how: en("Go through the topic's resource, then claim a status once it has actually been covered."),
      measure: en("Whether you can explain the topic's content back, in your own words."),
    },
    panels: ["resource", "notes"], order: 1,
  };
}

/** Phase 7 — the routine renderer's own module-wide trackable. Same claim/confirm ramp as "Studied" (the routine renderer still uses Track/Guide/Breakdown for overall status), plus a separate per-occurrence activity log (routine-study.js) the way modal's Streak tab reads for a streak count -- that log isn't a trackable/status at all, so it doesn't belong in this template. */
function practisedTemplate(id, moduleId) {
  return {
    id, moduleId, subjectId: null, group: null, groupName: null,
    name: nameLang("Practised", "অনুশীলন করা হয়েছে"),
    guide: {
      what: en("Whether this routine has become a habit worth recording, on top of logging it day to day."),
      how: en("Log it from the routine's page each time it's done, then claim an overall status once it's genuinely a habit."),
      measure: en("Whether it happens without being reminded, most of the time."),
    },
    panels: ["resource", "notes"], order: 1,
  };
}

// One per topic-renderer module (Architecture s5: Arabic, Hadith, Deen
// Study, General Study, Nature-Life) -- trackables.moduleId is required, so
// a single "Studied" trackable can't literally be shared across modules;
// this is that same design, replicated once per module as each one gets
// its real study screen built. Health and LDOG use practisedTemplate
// instead -- same shape, "routine" renderer wording (Phase 7).
export const TOPIC_TRACKABLE_TEMPLATES = [
  studiedTemplate("studied_deen", "deen"),
  studiedTemplate("studied_arabic", "arabic"),
  studiedTemplate("studied_hadith", "hadith"),
  studiedTemplate("studied_general", "general"),
  studiedTemplate("studied_naturelife", "naturelife"),
  studiedTemplate("studied_lifeskill", "lifeskill"),
  practisedTemplate("practised_health", "health"),
  practisedTemplate("practised_ldog", "ldog"),
  // Asma ul Husna reuses "Studied" wording (studiedTemplate is already
  // generic, parameterized by moduleId) rather than inventing a fourth
  // trackable-name convention for one module.
  studiedTemplate("studied_asma", "asma"),
];
