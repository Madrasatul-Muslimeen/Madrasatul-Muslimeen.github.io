// Word-by-word "same word" key for the 3,307 Qur'anic words that have NO
// dictionary word (an empty `morphology.lemma` in the Quranic Arabic Corpus
// data: particle + pronoun words such as فَهُمْ, لَهُمْ, هُمْ, and the opening
// letters). Achieved at WbW mirrors through a word's dictionary word; for these
// words it mirrors through a STAND-IN, `"form:" + the word's letters with every
// vowel / Qur'anic mark and tatweel removed`, so 36:6:6 فَهُمْ and 36:8:9 فَهُم
// are one word.
//
// ONE rule, ONE function, used by the build tool AND the app. Pure: imports
// nothing. The stand-in is used at WbW ONLY -- Basic and Depth stay
// "Not applicable" for a word with no dictionary word (decision 68), and the
// stand-in is never written into lemmas-index.json, so Explore, the dictionary
// and the lemma lists never show it.

export const FORM_KEY_PREFIX = "form:";

// Arabic marks: 0610-061A, 064B-065F, 0670 (dagger alif), 06D6-06ED (Qur'anic
// small signs, incl. small waw/yeh 06E5/06E6), 08D3-08FF, plus tatweel 0640.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ\p{M}]/gu;

/** The letters-only skeleton of an Arabic string (alef wasla ٱ -> ا, whitespace trimmed). */
export function formSkeleton(arabic) {
  return String(arabic ?? "").replace(MARKS, "").replace(/ٱ/g, "ا").trim();
}

/** The stand-in claim key for a word (object with `.arabic`, or the string), or null when it has no letters. */
export function formKey(word) {
  const skeleton = formSkeleton(typeof word === "string" ? word : word?.arabic);
  return skeleton ? FORM_KEY_PREFIX + skeleton : null;
}

/** True for a stand-in key (never a real dictionary word). */
export function isFormKey(key) { return typeof key === "string" && key.startsWith(FORM_KEY_PREFIX); }

/**
 * The WbW claim key of a word: its dictionary word when it has one (unchanged
 * for all 74,122 such words), else its stand-in.
 */
export function wbwClaimKey(word) { return word?.morphology?.lemma || formKey(word); }
