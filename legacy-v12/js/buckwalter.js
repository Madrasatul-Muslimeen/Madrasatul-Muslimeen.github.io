// Arabic <-> Buckwalter, pure. The table is the one in
// tools/quran-data-pull/pull.js (BW2AR); the inverse is DERIVED from it, never
// retyped, so the two cannot drift. Used to build a Quranic Arabic Corpus
// dictionary link from a word's Arabic root (`word.morphology.root`, plain
// letters such as حمد; a hamza root is written with a bare alef, "امن" -> "Amn").
export const BW2AR = Object.freeze({
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", A: "ا", b: "ب", p: "ة", t: "ت", v: "ث",
  j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر", z: "ز", s: "س", $: "ش", S: "ص", D: "ض",
  T: "ط", Z: "ظ", E: "ع", g: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه",
  w: "و", Y: "ى", y: "ي", F: "ً", N: "ٌ", K: "ٍ", a: "َ", u: "ُ", i: "ِ", "~": "ّ", o: "ْ",
  "`": "ٰ", "{": "ٱ", _: "ـ",
});
export const AR2BW = Object.freeze(Object.fromEntries(Object.entries(BW2AR).map(([bw, ar]) => [ar, bw])));

/** Arabic letters to Buckwalter. A character with no mapping is kept as it is. */
export function arabicToBuckwalter(arabic) {
  if (!arabic) return "";
  return [...String(arabic)].map((c) => (AR2BW[c] !== undefined ? AR2BW[c] : c)).join("");
}

/** Buckwalter to Arabic letters (the same mapping pull.js uses). */
export function buckwalterToArabic(bw) {
  if (!bw) return "";
  return [...String(bw)].map((c) => (BW2AR[c] !== undefined ? BW2AR[c] : c)).join("");
}
