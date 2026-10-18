// Word card rebuild, round 5 (decision 59; docs/reference/2026-10-03-word-card-build-spec.md
// §1 "Verb Conjugation · تَصْرِيفُ الْفِعْل" and §2 "The conjugation engine").
//
// Builds the Past, Present and Command tables (14 persons each) for one verb
// from its root, its Form and, for Form I, its two vowels. Pure: no imports,
// no fetch, nothing at startup (I9).
//
// THE RULE, and why it is safe to show: the engine only conjugates what it
// can do by regular rule, and tools/i18n-verify/verb-conjugation-quran.mjs
// checks EVERY active verb in the Qur'an that the engine claims to support
// against the Quranic Arabic Corpus's own spelling. A form that cannot be
// produced safely is never guessed: `conjugate()` returns `supported: false`
// and a reason, and the card says why in words.
//
// Supported now: sound three-letter roots (no و, ي or hamza among the root
// letters, last two letters different), Forms I–X, active voice. Assimilated,
// hollow, defective, hamzated and doubled roots are reported as unsupported
// until their own rules are written and pass the same whole-Qur'an check.
//
// Everything is built in Buckwalter (the Corpus's own transliteration) so the
// check can compare like with like; `toArabic()` converts for display.

const BW2AR = {
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", A: "ا", b: "ب", p: "ة", t: "ت", v: "ث",
  j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر", z: "ز", s: "س", $: "ش", S: "ص", D: "ض",
  T: "ط", Z: "ظ", E: "ع", g: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه",
  w: "و", Y: "ى", y: "ي", F: "ً", N: "ٌ", K: "ٍ", a: "َ", u: "ُ", i: "ِ", "~": "ّ", o: "ْ",
  "`": "ٰ", "{": "ٱ", _: "ـ",
};
const AR2BW = Object.fromEntries(Object.entries(BW2AR).map(([b, a]) => [a, b]));

export function toArabic(bw) {
  return [...String(bw ?? "")].map((c) => BW2AR[c] ?? c).join("");
}
export function toBuckwalter(ar) {
  return [...String(ar ?? "")].map((c) => AR2BW[c] ?? c).join("");
}

/** The 14 persons, in the poster's order (word-grammar-tables.js PERSONS). */
export const PGN_ORDER = Object.freeze(["3MS", "3MD", "3MP", "3FS", "3FD", "3FP", "2MS", "2MD", "2MP", "2FS", "2FD", "2FP", "1S", "1P"]);

const WEAK = new Set(["w", "y", "A", "'", ">", "<", "&", "}", "Y", "|"]);

/** Why a root cannot be conjugated by the sound-root rules, or null. */
export function unsupportedReason(rootBw) {
  const r = [...String(rootBw ?? "")];
  if (r.length !== 3) return "not-triliteral";
  if (r.some((c) => WEAK.has(c))) return "weak-or-hamzated";
  if (r[1] === r[2]) return "doubled";
  return null;
}

// ---------------------------------------------------------------------------
// Stems. Each returns the stem WITHOUT its final vowel; the endings below add
// it. `c` = the stem before the last root letter's vowel, so a consonant
// ending puts a sukūn on the last root letter.
// ---------------------------------------------------------------------------

/** Form VIII's infixed t after the first root letter, with the regular
 *  assimilations (اتَّبَعَ, اصْطَبَرَ, ازْدَجَرَ, ادَّكَرَ). */
function form8Head(r1) {
  switch (r1) {
    case "t": return "t~";
    case "v": return "v~";
    case "d": return "d~";
    case "*": return "d~";
    case "T": return "T~";
    case "Z": return "Z~";
    case "z": return "zod";
    case "S": return "SoT";
    case "D": return "DoT";
    default: return `${r1}ot`;
  }
}

const PRESENT_PREFIX_U = new Set([2, 3, 4]);

function pastStem(form, [r1, r2, r3], pastVowel) {
  switch (form) {
    case 1: return `${r1}a${r2}${pastVowel}${r3}`;
    case 2: return `${r1}a${r2}~a${r3}`;
    case 3: return `${r1}aA${r2}a${r3}`;
    case 4: return `>a${r1}o${r2}a${r3}`;
    case 5: return `ta${r1}a${r2}~a${r3}`;
    case 6: return `ta${r1}aA${r2}a${r3}`;
    case 7: return `{no${r1}a${r2}a${r3}`;
    case 8: return `{${form8Head(r1)}a${r2}a${r3}`;
    case 10: return `{sota${r1}o${r2}a${r3}`;
    default: return null;
  }
}

function presentStem(form, [r1, r2, r3], presentVowel) {
  switch (form) {
    case 1: return presentVowel ? `${r1}o${r2}${presentVowel}${r3}` : null;
    case 2: return `${r1}a${r2}~i${r3}`;
    case 3: return `${r1}aA${r2}i${r3}`;
    case 4: return `${r1}o${r2}i${r3}`;
    case 5: return `ta${r1}a${r2}~a${r3}`;
    case 6: return `ta${r1}aA${r2}a${r3}`;
    case 7: return `no${r1}a${r2}i${r3}`;
    case 8: return `${form8Head(r1)}a${r2}i${r3}`;
    case 10: return `sota${r1}o${r2}i${r3}`;
    default: return null;
  }
}

/** The command's stem and its front: Forms II, III, V, VI start with a
 *  vowelled letter and need nothing; IV takes a hamza with fatḥa; the rest a
 *  joining alif (ٱ). */
function commandHead(form) {
  if ([2, 3, 5, 6].includes(form)) return "";
  if (form === 4) return ">a";
  return "{";
}

// ---------------------------------------------------------------------------
// Endings, per person. Past endings attach to the past stem; a consonant
// ending puts a sukūn on the last root letter.
// ---------------------------------------------------------------------------

const PAST_ENDING = {
  "3MS": "a", "3MD": "aA", "3MP": "uwA", "3FS": "ato", "3FD": "ataA", "3FP": "ona",
  "2MS": "ota", "2MD": "otumaA", "2MP": "otumo", "2FS": "oti", "2FD": "otumaA", "2FP": "otun~a",
  "1S": "otu", "1P": "onaA",
};

const PRESENT_PERSON_LETTER = {
  "3MS": "y", "3MD": "y", "3MP": "y", "3FS": "t", "3FD": "t", "3FP": "y",
  "2MS": "t", "2MD": "t", "2MP": "t", "2FS": "t", "2FD": "t", "2FP": "t",
  "1S": ">", "1P": "n",
};

const PRESENT_ENDING = {
  IND: { "3MS": "u", "3MD": "aAni", "3MP": "uwna", "3FS": "u", "3FD": "aAni", "3FP": "ona", "2MS": "u", "2MD": "aAni", "2MP": "uwna", "2FS": "iyna", "2FD": "aAni", "2FP": "ona", "1S": "u", "1P": "u" },
  SUBJ: { "3MS": "a", "3MD": "aA", "3MP": "uwA", "3FS": "a", "3FD": "aA", "3FP": "ona", "2MS": "a", "2MD": "aA", "2MP": "uwA", "2FS": "iy", "2FD": "aA", "2FP": "ona", "1S": "a", "1P": "a" },
  JUS: { "3MS": "o", "3MD": "aA", "3MP": "uwA", "3FS": "o", "3FD": "aA", "3FP": "ona", "2MS": "o", "2MD": "aA", "2MP": "uwA", "2FS": "iy", "2FD": "aA", "2FP": "ona", "1S": "o", "1P": "o" },
};

const COMMAND_PGN = new Set(["2MS", "2MD", "2MP", "2FS", "2FD", "2FP"]);

/** Join a stem and an ending. A consonant ending that begins with the same
 *  letter as the last root letter merges into one doubled letter, as Arabic
 *  is always written: لَعَنَّا (not لَعَنْنَا), سَكَتُّ (not سَكَتْتُ). */
function join(stem, ending) {
  const last = stem.slice(-1);
  if (ending[0] === "o" && ending[1] === last) return stem + "~" + ending.slice(2);
  return stem + ending;
}

export const PGN_ALIASES = Object.freeze({ "3D": "3MD", "2D": "2MD" });

/**
 * One form, as { prefix, stem, ending, bw } (Buckwalter), or null when the
 * engine does not produce it (unsupported root, a Form-I vowel it does not
 * know, or no command for this person).
 *   tense: "PERF" | "IMPF" | "IMPV";  mood (IMPF only): "IND" | "SUBJ" | "JUS"
 */
export function conjugateOne({ root, form = 1, pastVowel = null, presentVowel = null }, tense, pgnIn, mood = "IND") {
  const pgn = PGN_ALIASES[pgnIn] || pgnIn;
  if (unsupportedReason(root)) return null;
  const r = [...root];
  if (tense === "PERF") {
    if (form === 1 && !pastVowel) return null;
    const stem = pastStem(form, r, pastVowel);
    if (!stem || !PAST_ENDING[pgn]) return null;
    return { prefix: "", stem, ending: PAST_ENDING[pgn], bw: join(stem, PAST_ENDING[pgn]) };
  }
  if (tense === "IMPF") {
    const stem = presentStem(form, r, presentVowel);
    const ending = PRESENT_ENDING[mood]?.[pgn];
    if (!stem || !ending) return null;
    const prefix = PRESENT_PERSON_LETTER[pgn] + (PRESENT_PREFIX_U.has(form) ? "u" : "a");
    return { prefix, stem, ending, bw: prefix + join(stem, ending) };
  }
  if (tense === "IMPV") {
    if (!COMMAND_PGN.has(pgn)) return null;
    const stem = presentStem(form, r, presentVowel);
    if (!stem) return null;
    const head = commandHead(form);
    const ending = PRESENT_ENDING.JUS[pgn];
    return { prefix: head, stem, ending, bw: head + join(stem, ending) };
  }
  return null;
}

/**
 * The three tables for one verb. Each is an array of 14 entries in PGN_ORDER:
 * { pgn, prefix, stem, ending, ar } or null (✕ on the card: no command for
 * that person, or a form the engine does not produce).
 */
export function conjugate(verb) {
  const reason = unsupportedReason(verb?.root);
  if (reason) return { supported: false, reason };
  const make = (tense, mood) => PGN_ORDER.map((pgn) => {
    const f = conjugateOne(verb, tense, pgn, mood);
    return f ? { pgn, prefix: toArabic(f.prefix), stem: toArabic(f.stem), ending: toArabic(f.ending), ar: toArabic(f.bw) } : null;
  });
  return {
    supported: true,
    reason: null,
    past: make("PERF"),
    present: make("IMPF", "IND"),
    command: make("IMPV"),
    presentKnown: !(verb.form === 1 && !verb.presentVowel),
    pastKnown: !(verb.form === 1 && !verb.pastVowel),
  };
}

/**
 * How the Qur'an's own spelling is compared with the engine's. Each rule is
 * a fixed fact of Uthmani spelling or of joining words, never a guess about
 * the verb, and each is applied to BOTH sides:
 *  1. reading marks the plain rules do not make (madda, small signs) and
 *     unwritten sukūns are removed, and a long ā written as a small alif is
 *     read as an alif;
 *  2. a shadda on the FIRST letter comes from the word before it (a nūn
 *     merging into it: مَن نَّشَاءُ), not from the verb;
 *  3. the alif after a plural wāw (ـُوا) is dropped when an object pronoun
 *     follows (أَخْرِجُوهُمْ), so a final ـُوا and ـُو are the same verb;
 *  4. ـتُمْ becomes ـتُمُو before an object pronoun (طَلَّقْتُمُوهُنَّ);
 *  5. a small sīn/ṣād reading mark (يَبْصُطُ read يَبْسُطُ) is read as the letter
 *     it marks, and a final ـِى as ـِي;
 *  6. a final sukūn becomes a kasra or ḍamma when the next word begins with a
 *     joining alif (بَشِّرِ الَّذِينَ), so a final vowel after the last root
 *     letter of a jussive or command is not compared.
 * Every letter and every other vowel, shadda and tanwīn still has to match.
 */
export function normaliseForCompare(bw, { finalSukunMayJoin = false } = {}) {
  let s = String(bw ?? "")
    .replace(/S:/g, "s")
    .replace(/[o^@\[#_,.\]:;"]/g, "")
    .replace(/`/g, "A");
  s = s.replace(/^(.)~/, "$1");
  s = s.replace(/uwA$/, "uw");
  s = s.replace(/tumuw?$/, "tum");
  s = s.replace(/iY$/, "iy");
  if (finalSukunMayJoin) s = s.replace(/[aiu]$/, "");
  return s;
}
