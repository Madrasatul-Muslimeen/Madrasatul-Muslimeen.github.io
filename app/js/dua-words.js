// The Owner, 8 Oct 2026: "Go ahead with clean dua words on each card, demo." and, after the demo, "For Dua, I want
// same Quranic font." A Dua card's Arabic is the whole narration (chain of narrators, then the words). This picks out
// the supplication itself, so the card can show it on its own while the full narration stays one tap away.
//
// Pure (no DOM, no Firebase): the same rule the demo used, measured on the 3,126 cards (1,112 picked out). Where no
// supplication is found, it returns null and the card shows the narration as before. What it picks is a suggestion
// until a person has checked it, and every card says so.

// Where a supplication starts. "رب" alone is left out: it also opens a chain ("رب - واللفظ لقتيبة - ...").
const STARTS = ["اللهم", "ربنا", "رب اغفر", "رب إني", "رب زدني", "رب أعني", "رب أوزعني", "رب هب", "لا إله إلا", "سبحان",
  "بسم الله", "أعوذ", "اعوذ", "الحمد لله", "أستغفر", "استغفر", "يا حي", "حسبي الله", "حسبنا الله", "أصبحنا", "أمسينا",
  "باسمك", "لبيك"];
// Where the narrator's own words begin again after it.
const ENDS = [" ثم دعا", " وروينا", " تابعه", " ورواه", " وقال ", " حدثنا", " أخبرنا", " حدثني", " يعني", " وإذا ", " وزاد",
  " وفي رواية", " قال أبو", " عن النبي", " عن أبي", " فإن ", " فإنه ", " فاجعلهن", " ثم قال", " قال ", " فقال ", " فقلت ",
  " قالت ", " فإذا ", " إلا غفر", " غفر له", " كان له", " كتب له", " حتى ", " ثلاث مرات", " ثلاثا", " مرة"];
// Round 0 (decision 90): where the author or an editor speaks, wherever it falls -- even right after the opening
// words ("الحمد لله رب العالمين قال أبو عيسى ...", "سبحان الملك القدوس ثلاثا خالفه ..."). Measured on the 1,112
// picks of v09.129: 141 carried a narrator's or author's words.
const HARD_ENDS = [" قال أبو", " قال أبان", " رواه", " خالفه", " نوع آخر", " ( نوع", " وفي الباب", " فذكر", " فأتاه", " فاتاه",
  " فلما", " قلت ", " ثم قال", " ثلاثا", " ثلاث مرات", " وروى", " وقال:", "\"", "»", " [", " فرموهم", " وقفه", " رفعه",
  " ذكر الاختلاف", " قال ", " فقال ", " كتب الله له", " كفرت خطاياه", " كن له", " لم يضرك", " عشر مرات", " فرجع", " ثم أصاب",
  " ما زال", " &", " ويستحب", " يستحب", " ويسن", " ويكره", " وكقوله", " فقد روينا", " هذه تلبية", " فأخذ", " واعلم", " وذكر أبو", " ليس في حديث",
  " +", " غفرت ذنوبه", " ثم ليسلم"];
// Editors' marks inside the words: OpenITI's variant-reading brackets "( هذه )", a quote, and a letter standing alone
// (the chain-switch sign "ح", the edition's "ب"/"آ" marks; no Arabic word is one letter on its own).
const EDITOR_MARKS = /[()"«»]/gu;
const LONE_LETTER = /(^|\s)[\u0621-\u064A](?=\s|$)/gu;

/** The picked words as a reader sees them: editors' marks taken out, spacing tidied. */
export function cleanDuaWords(raw) {
  return String(raw ?? "").replace(EDITOR_MARKS, " ").replace(/\s+/gu, " ").replace(LONE_LETTER, "$1").replace(/\s+/gu, " ")
    .replace(/[)"،,.«»:(\s]+$/u, "").replace(/\s+قال$/u, "").replace(/[،,\s]+$/u, "").trim();
}

/** The narration without OpenITI's trailing page/number marks ("\\ 1 \\"). */
export function duaNarration(text) {
  return String(text ?? "").replace(/\s*\\?\s*\d+\s*\\?\s*$/u, "").replace(/[\\\s]+$/u, "").trim();
}

/** The words after the chain: OpenITI marks where the chain ends with " * " (in about a fifth of the books). */
function afterChain(text) {
  const i = text.indexOf(" * ");
  return i >= 0 ? text.slice(i + 3).trim() : text;
}

/**
 * The supplication's own words, or null when none can be picked out with confidence.
 * Returns { words, start, end }: `words` with editors' marks taken out, and start/end indexing the words as they
 * stand inside `duaNarration(text)`, so a caller can mark them in the full narration.
 */
export function duaWords(text) {
  const full = duaNarration(text);
  const body = afterChain(full);
  const offset = full.length - body.length;
  let at = -1, key = "";
  for (const k of STARTS) { const i = body.indexOf(k); if (i >= 0 && (at < 0 || i < at)) { at = i; key = k; } }
  if (at < 0) return null;
  const from = body.slice(at);
  let cut = from.length;
  for (const e of ENDS) { const j = from.indexOf(e, key.length + 15); if (j > 0 && j < cut) cut = j; }
  for (const e of HARD_ENDS) { const j = from.indexOf(e, key.length); if (j > 0 && j < cut) cut = j; }
  // Any number in the text (a hadith number of the next entry) ends it too.
  const num = from.slice(key.length).search(/\s\d/u);
  if (num >= 0 && key.length + num < cut) cut = key.length + num;
  const raw = from.slice(0, cut).trim().replace(/[)"،,.«»:(\s]+$/u, "").trim();
  const words = cleanDuaWords(raw);
  if (words.split(/\s+/u).length < 3) return null;
  const start = offset + at;
  // start/end mark the narration's own text (raw); `words` is what the reader sees (editors' marks out).
  return { words, start, end: start + raw.length };
}

// Round 1 (decision 90): each dua word linked to the Qur'an word spelled the same way. The key is the spelling
// with vowels and Qur'anic marks taken off and alef, ya and ta marbuta shapes unified, the same on both sides
// (tools/hadith-data-pull/dua-word-links.mjs builds the links with it).
const MARKS = /[ؐ-ًؚ-ٟۖ-ۭ]/gu;
/** One word's matching key. `dagger` is what the Qur'an's small alef (U+0670) becomes: "" or "ا" (both are tried). */
export function duaWordKey(word, dagger = "") {
  return String(word ?? "").normalize("NFC").replace(/ٰ/gu, dagger).replace(MARKS, "")
    .replace(/[ٱأإآ]/gu, "ا").replace(/ى/gu, "ي").replace(/ة/gu, "ه")
    .replace(/ـ/gu, "").replace(/[^ء-ي]/gu, "");
}
/** The picked words split the way the links file counts them. */
export function duaWordTokens(words) {
  return String(words ?? "").split(/\s+/u).filter(Boolean);
}
/** A short fingerprint of the picked words, so a links file built from other words is never used against these. */
export function duaWordsFingerprint(words) {
  let h = 0x811c9dc5;
  for (const ch of String(words ?? "")) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

// Round 2 (decision 90): the Qur'an's own spellings, and a leading «و» / «ف» ("and", "so").
// The Qur'an writes these with «و» where the dua's text has «ا» (صلاة -> صلوة); kept to this list because the same
// ending elsewhere is a different word (فجأة "suddenly" is not فجوة "a gap").
export const QURAN_SPELLINGS = Object.freeze({ "صلاه": "صلوه", "الصلاه": "الصلوه", "زكاه": "زكوه", "الزكاه": "الزكوه",
  "حياه": "حيوه", "الحياه": "الحيوه", "نجاه": "نجوه", "النجاه": "النجوه", "مشكاه": "مشكوه", "غداه": "غدوه", "الغداه": "الغدوه" });
// Words that begin with «ف» as part of the word itself, not "so" + a word (measured on the 1,091 duas).
const FA_WORDS = new Set(["فلان", "فلانه", "فاجر", "فاجرا", "فقره", "فقر", "فتق"]);

/**
 * The ways a dua word's key may meet a Qur'an word's key, in order: the word itself, then its Qur'anic spelling,
 * then without a leading «و»/«ف» (and that one's Qur'anic spelling). Each is { key, prefix, spelling }.
 */
export function duaWordCandidates(key) {
  const out = [{ key, prefix: "", spelling: false }];
  if (QURAN_SPELLINGS[key]) out.push({ key: QURAN_SPELLINGS[key], prefix: "", spelling: true });
  const p = key[0];
  const rest = key.slice(1);
  const strip = (p === "\u0648" && rest.length >= 2) || (p === "\u0641" && rest.length >= 3 && !key.startsWith("\u0641\u064A") && !FA_WORDS.has(key));
  if (strip) {
    out.push({ key: rest, prefix: p, spelling: false });
    if (QURAN_SPELLINGS[rest]) out.push({ key: QURAN_SPELLINGS[rest], prefix: p, spelling: true });
  }
  return out;
}
