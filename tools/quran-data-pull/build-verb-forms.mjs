// Word card rebuild, round 5 (decision 59; spec §2 "The conjugation engine").
//
// From the Quranic Arabic Corpus (GPL; the same file pull.js downloads), two
// outputs:
//
//   output/verb-forms.json            ON DEMAND (I9), read by the Depth tab's
//                                     Verb Conjugation section: per Dictionary
//                                     word (verb), its root, Form, Form I
//                                     vowels and how many times each form is
//                                     in the Qur'an ("✦ in the Qur'an: N").
//   output/verb-occurrences-corpus.json   TEST ONLY, never loaded by the app:
//                                     every active verb occurrence with the
//                                     Corpus's own spelling, so
//                                     tools/i18n-verify/verb-conjugation-quran.mjs
//                                     can check the engine against the whole
//                                     Qur'an without a network.
//
// Run: node tools/quran-data-pull/build-verb-forms.mjs [path/to/quranic-corpus-morphology-0.4.txt]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bwToAr } from "./build-word-segments.mjs";
import { stemFeatures, partIdsForRows } from "./build-word-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output");
const MORPH_URLS = [
  "https://raw.githubusercontent.com/alstat/QuranTree.jl/master/data/quranic-corpus-morphology-0.4.txt",
  "https://cdn.jsdelivr.net/gh/alstat/QuranTree.jl@master/data/quranic-corpus-morphology-0.4.txt",
];

async function loadText(p) {
  if (p) return fs.readFileSync(p, "utf8");
  for (const u of MORPH_URLS) {
    try { const r = await fetch(u); if (r.ok) return await r.text(); } catch { /* next */ }
  }
  throw new Error("Could not download the Corpus morphology file.");
}

/** Rows grouped by word, in file order. */
export function wordsFrom(text) {
  const words = new Map();
  for (const line of text.split("\n")) {
    if (line[0] !== "(") continue;
    const close = line.indexOf(")");
    const loc = line.slice(1, close).split(":");
    const cols = line.slice(close + 1).trim().split(/\s+/);
    if (cols.length < 3) continue;
    const key = `${loc[0]}:${loc[1]}:${loc[2]}`;
    if (!words.has(key)) words.set(key, []);
    words.get(key).push({ form: cols[0], tag: cols[1], features: cols.slice(2).join("|") });
  }
  return words;
}

const strip = (bw) => bw.replace(/[o^@\[#_,.\]:;"]/g, "").replace(/`/g, "A");

/** The vowel after the second root letter of a Form I stem, or null. */
export function formOneVowel(stemBw, tense, root) {
  const s = strip(stemBw);
  const [r1, r2] = [...root];
  if (tense === "PERF") return s[0] === r1 && s[1] === "a" && s[2] === r2 && "aiu".includes(s[3]) ? s[3] : null;
  if (tense === "IMPF") return s[2] === r1 && s[3] === r2 && "aiu".includes(s[4]) ? s[4] : null;
  if (tense === "IMPV") return s[0] === "{" && s[1] === r1 && s[2] === r2 && "aiu".includes(s[3]) ? s[3] : null;
  return null;
}

async function main() {
  const text = await loadText(process.argv[2]);
  const words = wordsFrom(text);
  const lemmas = {};
  const occurrences = [];
  let untaggedPassive = 0;
  for (const [key, rows] of words) {
    const stem = rows.find((r) => r.features.startsWith("STEM") && r.tag === "V");
    if (!stem) continue;
    const f = stemFeatures("V", stem.features);
    const lem = (stem.features.match(/LEM:([^|]+)/) || [])[1];
    const root = (stem.features.match(/ROOT:([^|]+)/) || [])[1] || null;
    if (!lem || !f.tense) continue;
    const lemmaAr = bwToAr(lem);
    const entry = (lemmas[lemmaAr] ||= { root, form: f.form || 1, past: {}, present: {}, counts: {} });
    if (f.pass) continue; // the tables are active voice
    // An active Form I present always opens with a fatḥa on its person letter
    // (يَفْعَلُ). One opening with a ḍamma (يُعْرَضُونَ) is a passive the Corpus
    // did not mark; it is left out, so it can neither count as an active form
    // nor give the verb a false second vowel.
    if ((f.form || 1) === 1 && f.tense === "IMPF" && strip(stem.form)[1] === "u") { untaggedPassive++; continue; }
    const hasEnergetic = rows.some((r) => r.tag === "EMPH" && r.features.includes("+n:EMPH"));
    const ids = partIdsForRows(rows);
    // The verb itself: the stem row (which carries the present prefix) plus
    // its doer ending, never an attached particle or an object pronoun.
    let bw = stem.form;
    const stemIdx = rows.indexOf(stem);
    const idsAfterStem = ids.slice(ids.length - (rows.length - stemIdx - 1));
    rows.slice(stemIdx + 1).forEach((r, i) => { if (String(idsAfterStem[i]).startsWith("subj-")) bw += r.form; });
    const mood = f.tense === "IMPF" ? f.mood : "";
    const k = `${f.tense}.${f.pgn}${mood ? "." + mood : ""}`;
    if (!hasEnergetic) entry.counts[k] = (entry.counts[k] || 0) + 1;
    if ((f.form || 1) === 1 && root && root.length === 3) {
      const v = formOneVowel(stem.form, f.tense, root);
      const bucket = f.tense === "PERF" ? entry.past : entry.present;
      if (v) bucket[v] = (bucket[v] || 0) + 1;
    }
    const afterQuestion = rows.some((r) => r.features.includes("A:INTG+") || r.features.includes("A:EQ+"));
    if (!hasEnergetic) occurrences.push([key, lemmaAr, f.tense, f.pgn, mood || null, bw, afterQuestion ? 1 : 0]);
  }
  // A Form I vowel is used only when the Qur'an shows ONE: a Dictionary word
  // seen with two different vowels (حَزَنَ يَحْزُنُ / حَزِنَ يَحْزَنُ share a lemma)
  // gets none, and the card says its vowel is not known from the data.
  const top = (o) => (Object.keys(o).length === 1 ? Object.keys(o)[0] : null);
  const values = {};
  for (const [lemma, e] of Object.entries(lemmas)) {
    values[lemma] = { r: e.root, f: e.form, ...(e.form === 1 ? { pv: top(e.past), sv: top(e.present) } : {}), n: e.counts };
  }
  fs.writeFileSync(path.join(OUT, "verb-forms.json"), JSON.stringify({
    contract: "verb-forms:v1",
    source: "quranic-corpus-morphology-0.4.txt (Quranic Arabic Corpus, GPL)",
    loadBoundary: "on-demand-only",
    fields: { r: "root (Buckwalter)", f: "Form", pv: "Form I past vowel (only when the Qur'an shows exactly one)", sv: "Form I present vowel (only when the Qur'an shows exactly one)", n: "active occurrences per TENSE.PGN[.MOOD], energetic forms excluded" },
    entryCount: Object.keys(values).length,
    values,
  }));
  fs.writeFileSync(path.join(OUT, "verb-occurrences-corpus.json"), JSON.stringify({
    contract: "verb-occurrences-corpus:v1",
    note: "TEST DATA ONLY: never loaded by the app. Every active, non-energetic verb in the Qur'an with the Corpus's own spelling of the verb (present prefix + stem + doer ending).",
    fields: ["corpus word key s:a:w", "Dictionary word", "tense", "pgn", "mood", "spelling (Buckwalter)", "1 when a question or equalising hamza is attached"],
    untaggedPassiveLeftOut: untaggedPassive,
    rows: occurrences,
  }));
  console.log(`verb-forms: ${Object.keys(values).length} verbs; occurrences: ${occurrences.length}; untagged Form I passives left out: ${untaggedPassive}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
