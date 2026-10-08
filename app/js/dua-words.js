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
 * Returns { words, start, end } where start/end index the words inside `duaNarration(text)`, so a caller can mark
 * them in the full narration.
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
  // Any number in the text (a hadith number of the next entry) ends it too.
  const num = from.slice(key.length).search(/\s\d/u);
  if (num >= 0 && key.length + num < cut) cut = key.length + num;
  let words = from.slice(0, cut).trim().replace(/[)"،,.«»(\s]+$/u, "").trim();
  if (words.split(/\s+/u).length < 3) return null;
  const start = offset + at;
  return { words, start, end: start + words.length };
}
