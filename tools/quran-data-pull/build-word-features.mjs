// Word card rebuild, round 1 (decision 59; docs/reference/2026-10-03-word-card-build-spec.md §2).
//
// The pull (`pull.js`) keeps only root, lemma and part of speech from the
// Quranic Arabic Corpus. The rebuilt Word card needs the rest of what the
// Corpus records per segment: the verb Form, tense, person-gender-number,
// mood, voice, participles and verbal nouns, and the kind of each attached
// piece. This script keeps them, in two ON-DEMAND outputs (I9: nothing here
// is read at startup):
//
//   output/word-features/surah_NNN.json   one entry per displayed word
//   output/word-features/manifest.json    coverage and sizes
//   output/lemma-forms.json               the derived-form group and Form of
//                                         every Dictionary word (Basic's cards)
//
// A word is aligned to the Corpus by the SAME exact-skeleton rule as
// `build-word-segments.mjs` (whose functions it imports): a word that does
// not align gets no entry, and the card shows what it shows today. Never a
// guess.
//
// Per word (compact keys, all optional except `parts`):
//   parts  part ids, one per segment, in the SAME order and number as
//          `expandRow()` gives (so they zip with word-segments offsets);
//          names are in app/js/word-grammar-tables.js
//   pos    the stem's Corpus tag (V, N, ADJ, P ...)
//   form   verb Form number 2..12 (absent = Form I, or not a verb/derivative)
//   tense  PERF | IMPF | IMPV
//   pgn    person-gender-number of the stem, e.g. "3MP"
//   mood   IND | SUBJ | JUS (imperfect verbs only; IND when the Corpus marks none)
//   pass   1 when the verb is passive
//   deriv  AP (active participle) | PP (passive participle) | VN (verbal noun)
//
// Run:  node tools/quran-data-pull/build-word-features.mjs [path/to/quranic-corpus-morphology-0.4.txt]
// With no path it downloads the file from the same two mirrors as pull.js.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bwToAr, parseMorphologyText, expandRow, resolveWordKeyExact } from "./build-word-segments.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SURAHS_DIR = path.join(__dirname, "output", "surahs");
const OUT_DIR = path.join(__dirname, "output", "word-features");
const LEMMA_FORMS_PATH = path.join(__dirname, "output", "lemma-forms.json");

const MORPH_URLS = [
  "https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt",
  "https://cdn.jsdelivr.net/gh/alstat/QuranTree.jl@master/data/quranic-corpus-morphology-0.4.txt",
];

export const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

// ---------------------------------------------------------------------------
// Stem features
// ---------------------------------------------------------------------------

/** The grammatical features of one STEM row, read off its `|` features. */
export function stemFeatures(tag, features) {
  const f = features.split("|");
  const out = { pos: tag };
  for (const x of f) {
    const m = x.match(/^\(([IVX]+)\)$/);
    if (m && ROMAN[m[1]] && ROMAN[m[1]] > 1) out.form = ROMAN[m[1]];
    if (x === "PERF" || x === "IMPF" || x === "IMPV") out.tense = x;
    if (/^[123][MF]?[SDP]$/.test(x)) out.pgn = x;
    if (x.startsWith("MOOD:")) out.mood = x.slice(5);
    if (x === "VN") out.deriv = "VN";
  }
  if (f.includes("PCPL")) out.deriv = f.includes("PASS") ? "PP" : "AP";
  else if (tag === "V" && f.includes("PASS")) out.pass = 1;
  if (tag === "V" && out.tense === "IMPF" && !out.mood) out.mood = "IND";
  return out;
}

// ---------------------------------------------------------------------------
// Part ids. One id per expanded segment. The names live in
// app/js/word-grammar-tables.js (PART_NAMES); a check asserts every id this
// script can emit has a name there.
// ---------------------------------------------------------------------------

export const PREFIX_PART = {
  "Al+": "det", "w:CONJ+": "conj-w", "f:CONJ+": "conj-f", "bi+": "p-bi", "l:P+": "p-l", "ka+": "p-ka",
  "w:P+": "p-w", "ta+": "p-t", "f:REM+": "rem-f", "w:REM+": "rem-w", "l:EMPH+": "emph-l",
  "A:INTG+": "intg-a", "ya+": "voc-ya", "ha+": "voc-ha", "f:RSLT+": "rslt-f", "l:PRP+": "prp-l",
  "w:CIRC+": "circ-w", "f:SUP+": "sup-f", "w:SUP+": "sup-w", "sa+": "fut-sa", "f:CAUS+": "caus-f",
  "l:IMPV+": "impv-l", "A:EQ+": "eq-a", "w:COM+": "com-w",
};

// Which person-gender-numbers carry their subject as a SUFFIX, per tense. For
// every other one the subject is hidden (3MS/3FS perfect) or sits in the
// present-tense prefix, so an attached pronoun after the stem is an object.
const SUBJECT_SUFFIX_PGN = {
  PERF: new Set(["1S", "1P", "2MS", "2FS", "2MD", "2FD", "2D", "2MP", "2FP", "3MD", "3FD", "3D", "3MP", "3FP"]),
  IMPF: new Set(["2FS", "2MD", "2FD", "2D", "2MP", "2FP", "3MD", "3FD", "3D", "3MP", "3FP"]),
  IMPV: new Set(["2FS", "2MD", "2FD", "2D", "2MP", "2FP"]),
};

/** The subject marker an attached pronoun names, by person and tense. */
export function subjectPartId(tense, pgn) {
  if (/^[23]M?P$/.test(pgn) || pgn === "2MP" || pgn === "3MP") return "subj-waw";
  if (/D$/.test(pgn)) return "subj-alif";
  if (/FP$/.test(pgn)) return "subj-nun";
  if (pgn === "2FS" && tense !== "PERF") return "subj-ya";
  if (pgn === "1P" && tense === "PERF") return "subj-na";
  if (tense === "PERF") return "subj-ta";
  return null;
}

const NOUN_HOSTS = new Set(["N", "PN", "ADJ", "T", "LOC", "DEM", "REL", "PRON"]);

/**
 * Part ids for one Corpus word (its rows, in order). Returns one id per
 * segment `expandRow` produces, so the ids line up with the word-segments
 * offsets for the same word.
 */
export function partIdsForRows(rows) {
  const stem = rows.find((r) => r.features.split("|")[0] === "STEM");
  const sf = stem ? stemFeatures(stem.tag, stem.features) : {};
  let subjectTaken = false;
  let afterStem = false;
  const ids = [];
  for (const row of rows) {
    const feats = row.features.split("|");
    const kind = feats[0];
    if (kind === "STEM") {
      afterStem = true;
      const expanded = expandRow(row);
      if (expanded.length === 2) ids.push("impf-prefix");
      ids.push(`stem-${row.tag}`);
      continue;
    }
    if (kind === "PREFIX") {
      ids.push(PREFIX_PART[feats[1]] || "prefix-other");
      continue;
    }
    // SUFFIX
    if (row.tag === "PRON") {
      const pgn = (feats.find((x) => x.startsWith("PRON:")) || "").slice(5);
      if (afterStem && sf.pos === "V") {
        if (!subjectTaken && sf.tense && pgn === sf.pgn && SUBJECT_SUFFIX_PGN[sf.tense].has(pgn)) {
          subjectTaken = true;
          ids.push(subjectPartId(sf.tense, pgn) || "pron-attached");
        } else ids.push("pron-obj");
      } else if (NOUN_HOSTS.has(sf.pos)) ids.push("pron-poss");
      else if (sf.pos === "P") ids.push("pron-prep");
      else if (sf.pos === "ACC") ids.push("pron-acc");
      else ids.push("pron-attached");
      continue;
    }
    if (row.tag === "EMPH") { ids.push("emph-n"); continue; }
    if (row.tag === "VOC") { ids.push("voc-m"); continue; }
    if (row.tag === "P") { ids.push("p-l"); continue; }
    ids.push("suffix-other");
  }
  return ids;
}

/** Every part id `partIdsForRows` can produce, for the table-coverage check. */
export function allEmittablePartIds(stemTags) {
  return new Set([
    ...Object.values(PREFIX_PART), "prefix-other", "impf-prefix",
    ...stemTags.map((t) => `stem-${t}`),
    "subj-waw", "subj-alif", "subj-nun", "subj-ya", "subj-na", "subj-ta",
    "pron-obj", "pron-poss", "pron-prep", "pron-acc", "pron-attached",
    "emph-n", "voc-m", "p-l", "suffix-other",
  ]);
}

/** The compact feature entry for one aligned word. */
export function featuresForRows(rows) {
  const stem = rows.find((r) => r.features.split("|")[0] === "STEM");
  const entry = { parts: partIdsForRows(rows) };
  if (stem) Object.assign(entry, stemFeatures(stem.tag, stem.features));
  return entry;
}

// ---------------------------------------------------------------------------
// Derived-form groups (Basic's cards). The group ORDER and the labels live in
// app/js/word-grammar-tables.js (DERIVED_GROUP_ORDER), the single place the
// Owner's final order replaces.
//
// Source of each grouping, kept with it (`src`):
//   "d"  From the data: the Corpus tags it (a verb and its Form, VN, ACT/PASS PCPL).
//   "r"  Grammar rule: the Corpus has no tag for it, and the lemma matches a
//        fixed pattern of its own root letters (مَفْعُول, فَاعِل, فَعِيل/فَعَّال/فَعُول
//        on an adjective, أَفْعَل), minus the reviewed exclusions in
//        derived-forms-reviewed.json (notElative, notIntensive).
//   "w"  Reviewed: a verbal noun the Corpus does not tag, listed in
//        derived-forms-reviewed.json (Wiktionary's verbal-noun list, each entry
//        read for its Qur'anic meaning by a reviewer).
//   "x"  Neither: "Other nouns" (or a particle), the honest default.
// ---------------------------------------------------------------------------

function esc(ch) {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip the Corpus's homograph digit (`<i*aA2`) and its madda mark. */
export function cleanLemmaBw(lem) {
  return lem.replace(/\d+$/, "").replace(/\^/g, "");
}

/** Rule-based group for a lemma the Corpus does not tag, or null. */
export function ruleGroup(lemBw, rootBw, isAdjective) {
  if (!rootBw || rootBw.length !== 3) return null;
  const [a, b, c] = [...rootBw].map(esc);
  const L = cleanLemmaBw(lemBw);
  if (new RegExp(`^m~?a${a}o${b}uw${c}(a\`t)?$`).test(L)) return "done";
  if (new RegExp(`^${a}a\`${b}i${c}$`).test(L)) return "doer";
  if (isAdjective && (new RegExp(`^${a}a${b}iy${c}$`).test(L)
    || new RegExp(`^${a}a${b}~a(\`|A)${c}$`).test(L)
    || new RegExp(`^${a}a${b}uw${c}$`).test(L))) return "intens";
  if (new RegExp(`^>a${a}o${b}a${c}$`).test(L)) return "elative";
  if (rootBw[1] === rootBw[2] && new RegExp(`^>a${a}a${b}~$`).test(L)) return "elative";
  if (/[wy]$/.test(rootBw) && new RegExp(`^>a${a}o${b}aY$`).test(L)) return "elative";
  return null;
}

/**
 * Group every lemma from its stem rows. `stemRowsByLemma` maps the Corpus
 * lemma (Buckwalter) to { root, rows: [{tag, features}] }.
 * Returns { [lemmaArabic]: [group, form, src] }.
 */
export function groupLemmas(stemRowsByLemma, reviewed = {}) {
  const reviewedVerbalNouns = reviewed.values || {};
  // The reviewed lists are matched in NFC (how they were written); the output
  // key is pull.js's own spelling (bwToAr, no normalisation), which is the
  // key every other lemma file in output/ uses.
  const nfc = (s) => s.normalize("NFC");
  const reviewedByNfc = Object.fromEntries(Object.entries(reviewedVerbalNouns).map(([k, v]) => [nfc(k), v]));
  const notRule = new Set([...(reviewed.notElative?.values || []), ...(reviewed.notIntensive?.values || [])].map(nfc));
  const out = {};
  for (const [lem, { root, rows }] of Object.entries(stemRowsByLemma)) {
    const feats = rows.map((r) => stemFeatures(r.tag, r.features));
    const count = (pred) => feats.filter(pred).length;
    const formOf = (list) => {
      const tally = {};
      for (const f of list) tally[f.form || 1] = (tally[f.form || 1] || 0) + 1;
      return Number(Object.entries(tally).sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0]);
    };
    let entry;
    const verbs = feats.filter((f) => f.pos === "V");
    if (verbs.length) entry = ["verb", formOf(verbs), "d"];
    else {
      const vn = feats.filter((f) => f.deriv === "VN");
      const ap = feats.filter((f) => f.deriv === "AP");
      const pp = feats.filter((f) => f.deriv === "PP");
      const best = [["masdar", vn], ["doer", ap], ["done", pp]].sort((x, y) => y[1].length - x[1].length)[0];
      const reviewedVn = reviewedByNfc[nfc(bwToAr(lem))];
      if (best[1].length) entry = [best[0], formOf(best[1]), "d"];
      else if (reviewedVn) entry = ["masdar", reviewedVn.form || 1, "w"];
      else {
        const isAdj = count((f) => f.pos === "ADJ") > 0;
        const ar = nfc(bwToAr(lem));
        const g = feats.some((f) => ["N", "ADJ"].includes(f.pos)) && !notRule.has(ar) ? ruleGroup(lem, root, isAdj) : null;
        entry = g ? [g, 1, "r"] : ["noun", 0, "x"];
      }
    }
    if (entry[0] === "noun" && !feats.some((f) => ["N", "ADJ", "PN"].includes(f.pos))) entry = ["other", 0, "x"];
    out[bwToAr(lem)] = entry;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function loadText(localPath) {
  if (localPath) return fs.readFileSync(localPath, "utf8");
  for (const url of MORPH_URLS) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch { /* try the next mirror */ }
  }
  throw new Error("Could not download the Corpus morphology file from either mirror.");
}

/** All stem rows grouped by lemma (Buckwalter), with the root. */
export function stemRowsByLemmaFrom(text) {
  const out = {};
  for (const line of text.split("\n")) {
    if (line[0] !== "(") continue;
    const cols = line.trim().split(/\s+/);
    if (cols.length < 4) continue;
    const features = cols.slice(3).join("|");
    if (!features.startsWith("STEM")) continue;
    const lem = (features.match(/LEM:([^|]+)/) || [])[1];
    if (!lem) continue;
    const root = (features.match(/ROOT:([^|]+)/) || [])[1] || null;
    (out[lem] ||= { root, rows: [] }).rows.push({ tag: cols[2], features });
  }
  return out;
}

async function main() {
  const text = await loadText(process.argv[2]);
  const morph = parseMorphologyText(text);
  if (morph.chapterCount < 114) throw new Error(`incomplete Corpus file: ${morph.chapterCount}/114 chapters`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const surahFiles = fs.readdirSync(SURAHS_DIR).filter((f) => /^surah_\d{3}\.json$/.test(f)).sort();
  let totalWords = 0, totalAligned = 0, totalBytes = 0, maxBytes = 0;
  const perSurah = [];
  for (const file of surahFiles) {
    const surahNumber = Number(file.match(/\d{3}/)[0]);
    const data = JSON.parse(fs.readFileSync(path.join(SURAHS_DIR, file), "utf8"));
    const words = {};
    let n = 0, aligned = 0;
    for (const a of data.ayahs) {
      const ayahKey = `${surahNumber}:${a.ayah}`;
      const usedWn = new Set();
      for (const w of a.words) {
        n++;
        const key = resolveWordKeyExact(morph, ayahKey, w.arabic, usedWn);
        if (!key) continue;
        words[`${a.ayah}:${w.position}`] = featuresForRows(morph.idx[key]);
        aligned++;
      }
    }
    const json = JSON.stringify({ schemaVersion: 1, surahNumber, words });
    fs.writeFileSync(path.join(OUT_DIR, `surah_${String(surahNumber).padStart(3, "0")}.json`), json);
    const bytes = Buffer.byteLength(json);
    totalBytes += bytes; maxBytes = Math.max(maxBytes, bytes);
    totalWords += n; totalAligned += aligned;
    perSurah.push({ surah: surahNumber, words: n, aligned, bytes });
  }
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    generatedFrom: "quranic-corpus-morphology-0.4.txt (Quranic Arabic Corpus, GPL)",
    loadBoundary: "on-demand-only",
    totalWords, totalAligned,
    coveragePercent: Math.round((10000 * totalAligned) / totalWords) / 100,
    totalBytes, maxBytes, perSurah,
  }, null, 2));

  const reviewed = JSON.parse(fs.readFileSync(path.join(__dirname, "derived-forms-reviewed.json"), "utf8"));
  const lemmaForms = groupLemmas(stemRowsByLemmaFrom(text), reviewed);
  fs.writeFileSync(LEMMA_FORMS_PATH, JSON.stringify({
    contract: "lemma-forms:v1",
    source: "quranic-corpus-morphology-0.4.txt (Quranic Arabic Corpus, GPL); derived-forms-reviewed.json (Wiktionary, CC BY-SA 4.0)",
    loadBoundary: "on-demand-only",
    fields: ["group", "form (0 = none, 1 = Form I)", "src (d = from the data, w = reviewed verbal noun, r = grammar rule, x = default)"],
    entryCount: Object.keys(lemmaForms).length,
    values: lemmaForms,
  }));
  console.log(`word-features: ${totalAligned}/${totalWords} words aligned, ${totalBytes} bytes in all, largest file ${maxBytes}.`);
  console.log(`lemma-forms: ${Object.keys(lemmaForms).length} Dictionary words grouped.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
}
