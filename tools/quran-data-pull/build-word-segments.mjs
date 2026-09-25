// Issue #263 -- per-segment colouring data for the Word Card.
//
// The Owner asked for a Qur'an app's segment-colouring effect: each part of
// an Arabic word (an attached particle, a person marker, the determiner,
// the stem) coloured on its own, with the matching part of the English
// meaning coloured to match.
//
// This script reads the SAME Quranic Arabic Corpus morphology file
// `pull.js` already downloads -- one row per word SEGMENT, in Buckwalter --
// and, for every word whose segments can be aligned EXACTLY to the already
// -packaged Uthmani text (`output/surahs/surah_NNN.json`, untouched by this
// script), writes character offsets into that word's own `arabic` string
// plus a role (particle/person/determiner/stem) and an English cue per
// segment. A word that cannot be aligned exactly gets NO entry -- the Word
// Card then shows it uncoloured, exactly as it does today. Never a guess.
//
// Output: output/word-segments/surah_NNN.json (one per surah) plus
// output/word-segments/manifest.json recording alignment coverage.
//
// Network: only the morphology file itself (the two GitHub mirrors `pull.js`
// already uses). No quran.com call, no change to any `output/surahs/*.json`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURAHS_DIR = path.join(__dirname, "output", "surahs");
const OUT_DIR = path.join(__dirname, "output", "word-segments");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

// ---------------------------------------------------------------------------
// Buckwalter -> Arabic, and morphology-line parsing. Ported verbatim from
// `pull.js`'s own copy (itself ported from the legacy app), so the segment
// forms convert exactly the way this project's existing `morphology.root`/
// `lemma` fields already do. `pull.js` itself is not imported (CommonJS) or
// touched.
// ---------------------------------------------------------------------------

const BW2AR = {
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", A: "ا", b: "ب", p: "ة", t: "ت", v: "ث",
  j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر", z: "ز", s: "س", $: "ش", S: "ص", D: "ض",
  T: "ط", Z: "ظ", E: "ع", g: "غ", f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه",
  w: "و", Y: "ى", y: "ي", F: "ً", N: "ٌ", K: "ٍ", a: "َ", u: "ُ", i: "ِ", "~": "ّ", o: "ْ",
  "`": "ٰ", "{": "ٱ", _: "ـ",
};
export function bwToAr(bw) {
  if (!bw) return "";
  return bw.split("").map((c) => (BW2AR[c] !== undefined ? BW2AR[c] : c)).join("");
}

const MORPH_URLS = [
  "https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt",
  "https://cdn.jsdelivr.net/gh/alstat/QuranTree.jl@master/data/quranic-corpus-morphology-0.4.txt",
];
const MORPH_EXPECTED_ROWS = 128219;

function parseMorphologyLine(line) {
  if (!line || line[0] !== "(") return null;
  const closeIdx = line.indexOf(")");
  if (closeIdx === -1) return null;
  const loc = line.slice(1, closeIdx);
  const rest = line.slice(closeIdx + 1).trim();
  if (!rest) return null;
  const tokens = rest.split(/\s+/);
  if (tokens.length < 3) return null;
  const form = tokens[0], tag = tokens[1], features = tokens.slice(2).join("|");
  return { loc, form, tag, features };
}

export function parseMorphologyText(text) {
  const idx = {};
  const ayahWordSets = {};
  const chapters = new Set();
  let rowCount = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseMorphologyLine(lines[i]);
    if (!parsed) continue;
    const parts = parsed.loc.split(":");
    if (parts.length < 3) continue;
    const sura = parts[0], ayah = parts[1], word = parts[2];
    chapters.add(sura);
    rowCount++;
    const wordKey = `${sura}:${ayah}:${word}`;
    if (!idx[wordKey]) idx[wordKey] = [];
    idx[wordKey].push({ tag: parsed.tag, features: parsed.features, form: parsed.form });
    const ayahKey = `${sura}:${ayah}`;
    if (!ayahWordSets[ayahKey]) ayahWordSets[ayahKey] = new Set();
    ayahWordSets[ayahKey].add(parseInt(word, 10));
  }
  const ayahWords = {};
  Object.keys(ayahWordSets).forEach((k) => { ayahWords[k] = [...ayahWordSets[k]].sort((a, b) => a - b); });
  return { idx, ayahWords, chapterCount: chapters.size, rowCount };
}

async function loadMorphology() {
  let lastErr = null;
  for (const url of MORPH_URLS) {
    try {
      console.log(`Fetching morphology corpus from ${url} ...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const text = await res.text();
      const parsed = parseMorphologyText(text);
      console.log(`  ${parsed.rowCount} rows (expected ~${MORPH_EXPECTED_ROWS}), ${parsed.chapterCount}/114 chapters.`);
      if (parsed.chapterCount < 114 || parsed.rowCount < MORPH_EXPECTED_ROWS * 0.97) {
        throw new Error(`incomplete data -- ${parsed.rowCount}/${MORPH_EXPECTED_ROWS} rows, ${parsed.chapterCount}/114 chapters`);
      }
      return parsed;
    } catch (err) {
      console.warn(`  morphology source failed, trying next: ${err.message}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error("all morphology sources failed");
}

// ---------------------------------------------------------------------------
// Letter-skeleton alignment. A "skeleton" keeps only the Arabic LETTERS of a
// string (a positive whitelist: the base alphabet, the hamza-bearing forms,
// and alif wasla U+0671), in order, each carrying its own character offset
// into the original string. Every harakah, tanwin, shadda, sukun, dagger
// alif, madda/hamza-above combining mark, Qur'anic small-letter/pause
// annotation, tatweel and stray space -- none of them in the whitelist --
// is treated as trailing decoration of the letter before it, which is what
// keeps a segment's offsets carrying its own diacritics (and, for the very
// last segment of a word, any trailing pause mark quran.com appends to a
// word's own `arabic` string) without a separate strip step.
//
// A small canonicalisation (hamza-on-alif forms and alif wasla -> bare alif;
// ta marbuta -> ha; alif maksura -> ya) maps QAC's own spelling of these to
// however the packaged Uthmani text spells them, so alignment does not fail
// over a legitimate orthographic variant -- this is deliberately the SAME
// mapping `pull.js`'s own `normalizeArabicForMatch` already uses and has
// already proven itself against this exact corpus.
// ---------------------------------------------------------------------------

const AR_LETTER_RE = /[ء-غف-يٱ]/;

export function letterCanon(ch) {
  if (ch === "إ" || ch === "أ" || ch === "آ" || ch === "ٱ") return "ا";
  if (ch === "ة") return "ه";
  if (ch === "ى") return "ي";
  return ch;
}

export function skeletonWithIndex(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (AR_LETTER_RE.test(ch)) out.push({ ch: letterCanon(ch), idx: i });
  }
  return out;
}

export function skeletonString(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (AR_LETTER_RE.test(ch)) out += letterCanon(ch);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Role + cue classification. `kind` is PREFIX / STEM / SUFFIX, read off the
// first `|`-separated feature -- QAC's own top-level grouping for a segment.
// ---------------------------------------------------------------------------

export const KNOWN_IMPF_PREFIXES = new Set(["ya", "yu", "ta", "tu", "na", "nu", ">a", ">u"]);

function featureKind(features) {
  return features.split("|")[0];
}

export function personCodeFromFeatures(features) {
  const feats = features.split("|");
  const bareRe = /^([123])([MF]?)(S|D|P)$/;
  const prefRe = /^PRON:([123])([MF]?)(S|D|P)$/;
  for (const f of feats) {
    const m = f.match(prefRe) || f.match(bareRe);
    if (m) return `${m[1]}${m[2] || ""}${m[3]}`;
  }
  return null;
}

// Single canonical subject-form pronoun per person/number -- deliberately
// not a pipe-separated "they|them|their" list (unlike the particle cues
// below): the Word Card's gloss-colouring only ever needs ONE word to look
// for, and a single, well-known word is safer than guessing which of an
// object/possessive/subject form a given gloss happens to use.
const PERSON_CUE = {
  "1S": "I", "1D": "we", "1P": "we",
  "2MS": "you", "2FS": "you", "2MD": "you", "2FD": "you", "2D": "you", "2MP": "you", "2FP": "you",
  "3MS": "he", "3FS": "she", "3MD": "they", "3FD": "they", "3D": "they", "3MP": "they", "3FP": "they",
};

export function personCue(code) {
  return (code && PERSON_CUE[code]) || null;
}

function normForm(form) {
  return form.replace(/[+~`^]/g, "");
}

// Only the well-known, fixed-meaning attached particles get a cue. Anything
// whose translation genuinely varies by context (resumption, circumstantial,
// supplemental, result, causative, equalising and interrogative particles;
// the energetic/vocative suffixes) stays `null` rather than guessed.
function particleCue(tag, form) {
  const norm = normForm(form);
  const c0 = norm[0];
  switch (tag) {
    case "CONJ": return c0 === "w" ? "and" : c0 === "f" ? "so|then" : null;
    case "P":
      if (norm.startsWith("bi")) return "with|by|in";
      if (norm.startsWith("l")) return "for|to";
      if (norm.startsWith("ka")) return "like|as";
      if (norm.startsWith("wa") || norm.startsWith("ta")) return "by";
      return null;
    case "FUT": return "will";
    case "EMPH": return c0 === "l" ? "indeed" : null;
    case "VOC": return c0 === "y" || c0 === "h" ? "O" : null;
    case "PRP": return "so that";
    case "IMPV": return "let";
    default: return null;
  }
}

export function classifyRow(tag, features, form) {
  const kind = featureKind(features);
  if (tag === "DET") return { role: "determiner", cue: "the" };
  if (tag === "PRON") return { role: "person", cue: personCue(personCodeFromFeatures(features)) };
  if (kind === "PREFIX" || kind === "SUFFIX") return { role: "particle", cue: particleCue(tag, form) };
  return { role: "stem", cue: null };
}

/**
 * QAC keeps the imperfect verb's person prefix (ya-/ta-/na-/hamza-) INSIDE
 * the stem's own form -- "yaSud~u" is the whole "STEM|POS:V|IMPF|...|3MP"
 * row. Split its first letter and vowel off as its own "person" segment
 * (cue: the subject pronoun the row's own person/number/gender feature
 * names) so the Word Card can colour it the way the Owner's screenshot
 * does. Only the imperfect is split -- the perfect's person marking is a
 * bound SUFFIX and already its own segment via `classifyRow` above; the
 * imperative's prefix set is a different, unrelated family of forms and is
 * deliberately left unsplit.
 */
export function expandRow(row) {
  const feats = row.features.split("|");
  if (feats[0] === "STEM" && row.tag === "V" && feats.includes("IMPF")) {
    const prefix2 = row.form.slice(0, 2);
    const stemForm = row.form.slice(2);
    if (KNOWN_IMPF_PREFIXES.has(prefix2) && stemForm) {
      const cue = personCue(personCodeFromFeatures(row.features));
      return [
        { form: prefix2, role: "person", cue },
        { form: stemForm, role: "stem", cue: null },
      ];
    }
  }
  const { role, cue } = classifyRow(row.tag, row.features, row.form);
  return [{ form: row.form, role, cue }];
}

/**
 * Resolves the morphology word-index for one displayed word by EXACT
 * skeleton match against every still-unclaimed word number recorded for
 * that āyah -- never the position alone (an off-by-one basmalah, or a
 * missing/extra row, would silently misattribute an entire āyah's worth of
 * words if position were trusted). A word number already claimed by an
 * earlier position in the same āyah is not reused, so two textually
 * identical words in one āyah cannot both be pinned to the same morphology
 * entry.
 */
export function resolveWordKeyExact(morph, ayahKey, targetArabic, usedWn) {
  const wordNums = morph.ayahWords[ayahKey];
  if (!wordNums) return null;
  const targetSkel = skeletonString(targetArabic);
  for (const wn of wordNums) {
    if (usedWn.has(wn)) continue;
    const key = `${ayahKey}:${wn}`;
    const rows = morph.idx[key];
    if (!rows) continue;
    const skel = rows.map((r) => skeletonString(bwToAr(r.form).normalize("NFC"))).join("");
    if (skel === targetSkel) { usedWn.add(wn); return key; }
  }
  return null;
}

export function segmentsForWord(morph, ayahKey, position, targetArabic, usedWn) {
  const wordKey = resolveWordKeyExact(morph, ayahKey, targetArabic, usedWn);
  if (!wordKey) return null;
  const rows = morph.idx[wordKey];
  const expanded = rows.flatMap(expandRow);
  const segSkeletons = expanded.map((s) => skeletonString(bwToAr(s.form).normalize("NFC")));
  if (segSkeletons.some((s) => s.length === 0)) return null;
  const targetSkelIdx = skeletonWithIndex(targetArabic);
  const n = expanded.length;
  const cum = [0];
  for (let i = 0; i < n; i++) cum.push(cum[i] + segSkeletons[i].length);
  if (cum[n] !== targetSkelIdx.length) return null; // paranoia: proven equal above, but never trust silently
  const out = [];
  for (let i = 0; i < n; i++) {
    const from = i === 0 ? 0 : targetSkelIdx[cum[i]].idx;
    const to = i === n - 1 ? targetArabic.length : targetSkelIdx[cum[i + 1]].idx;
    if (from > to) return null;
    out.push({ from, to, role: expanded[i].role, cue: expanded[i].cue });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const morph = await loadMorphology();

  const surahFiles = fs.readdirSync(SURAHS_DIR).filter((f) => /^surah_\d{3}\.json$/.test(f)).sort();
  let totalWords = 0;
  let totalAligned = 0;
  const perSurah = [];

  for (const file of surahFiles) {
    const surahNumber = Number(file.match(/\d{3}/)[0]);
    const data = JSON.parse(fs.readFileSync(path.join(SURAHS_DIR, file), "utf8"));
    const words = {};
    let surahWords = 0;
    let surahAligned = 0;
    for (const a of data.ayahs) {
      const ayahKey = `${surahNumber}:${a.ayah}`;
      const usedWn = new Set();
      for (const w of a.words) {
        surahWords++;
        const segs = segmentsForWord(morph, ayahKey, w.position, w.arabic, usedWn);
        if (segs) { words[`${a.ayah}:${w.position}`] = segs; surahAligned++; }
      }
    }
    totalWords += surahWords;
    totalAligned += surahAligned;
    perSurah.push({ surah: surahNumber, words: surahWords, aligned: surahAligned });
    const outPath = path.join(OUT_DIR, `surah_${String(surahNumber).padStart(3, "0")}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ schemaVersion: 1, surahNumber, words }));
    console.log(`Surah ${surahNumber}: ${surahAligned}/${surahWords} words aligned.`);
  }

  const manifest = {
    schemaVersion: 1,
    generatedFrom: "quranic-corpus-morphology-0.4.txt",
    totalWords,
    totalAligned,
    coveragePercent: Math.round((10000 * totalAligned) / totalWords) / 100,
    perSurah,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nDone. ${totalAligned}/${totalWords} words aligned (${manifest.coveragePercent}%).`);
}

// Guarded so the pure functions above can be imported by a test suite (see
// tools/i18n-verify/word-segments-data.mjs) without triggering the full
// network fetch + rewrite of output/word-segments/*.json on every import.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
